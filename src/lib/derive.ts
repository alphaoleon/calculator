import { fetchDerive } from "@/lib/derive-public";
import { bookParts, type BookId, type Instrument, type Quote, type Right } from "@/lib/types";

export type DeriveCall = (method: string, params: Record<string, string | number | boolean>) => Promise<unknown>;

export type DeriveBook = {
  index: number;
  instruments: Instrument[];
  quotes: Record<string, Quote>;
  /** Unix seconds, one per live option expiry. */
  expiries: number[];
};

type RawInstrument = {
  instrument_name?: string;
  instrument_type?: string;
  is_active?: boolean;
  tick_size?: string | number;
  base_currency?: string;
  option_details?: {
    expiry?: number;
    strike?: string | number;
    option_type?: string;
  } | null;
  perp_details?: { index?: string } | null;
};

type RawTicker = {
  M?: string | number;
  I?: string | number;
  a?: string | number;
  b?: string | number;
  f?: string | number | null;
  option_pricing?: { i?: string | number; f?: string | number } | null;
  stats?: { oi?: string | number };
};

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function rightOf(value: unknown): Right | null {
  const text = String(value ?? "").toLowerCase();
  if (text === "c" || text === "call") return "call";
  if (text === "p" || text === "put") return "put";
  return null;
}

/** Derive publishes vol as a decimal. Deribit marks in this app are percent. */
function ivPercent(value: unknown): number {
  const raw = num(value);
  if (!(raw > 0)) return 0;
  return raw > 3 ? raw : raw * 100;
}

function ymd(expirySec: number): number {
  const date = new Date(expirySec * 1000);
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function instrumentRows(payload: unknown): RawInstrument[] {
  const result = asRecord(payload);
  const rows = result.instruments;
  return Array.isArray(rows) ? (rows as RawInstrument[]) : [];
}

function tickerMap(payload: unknown): Record<string, RawTicker> {
  const tickers = asRecord(payload).tickers;
  if (!tickers || typeof tickers !== "object" || Array.isArray(tickers)) return {};
  return tickers as Record<string, RawTicker>;
}

export async function deriveCallHttp(
  method: string,
  params: Record<string, string | number | boolean>,
): Promise<unknown> {
  return fetchDerive({ data: { method, params } });
}

export async function loadDeriveBook(book: BookId, call: DeriveCall, now = Date.now()): Promise<DeriveBook> {
  const { currency, settle } = bookParts(book);
  const linear = settle === "linear";
  const [currencyRow, optionRow, perpRow] = await Promise.all([
    call("public/get_currency", { currency }),
    call("public/get_all_instruments", {
      currency,
      instrument_type: "option",
      expired: false,
      page: 1,
      page_size: 1000,
    }),
    call("public/get_all_instruments", {
      currency,
      instrument_type: "perp",
      expired: false,
      page: 1,
      page_size: 20,
    }),
  ]);
  const spot = num(asRecord(currencyRow).spot_price);
  const instruments: Instrument[] = [];
  const expiries = new Set<number>();
  for (const row of instrumentRows(optionRow)) {
    const parsed = parseOption(row, linear, now);
    if (!parsed) continue;
    instruments.push(parsed.instrument);
    expiries.add(parsed.expirySec);
  }
  for (const row of instrumentRows(perpRow)) {
    const parsed = parsePerp(row, linear);
    if (parsed) instruments.push(parsed);
  }
  instruments.sort((a, b) => {
    if (a.perpetual !== b.perpetual) return a.perpetual ? -1 : 1;
    const ea = a.expiry ?? Number.MAX_SAFE_INTEGER;
    const eb = b.expiry ?? Number.MAX_SAFE_INTEGER;
    if (ea !== eb) return ea - eb;
    return (a.strike ?? 0) - (b.strike ?? 0);
  });
  const quotes = await loadDeriveQuotes(currency, linear, [...expiries], spot, call);
  let index = spot;
  if (!(index > 0)) {
    for (const quote of Object.values(quotes)) {
      if (quote.underlying > 0) {
        index = quote.underlying;
        break;
      }
    }
  }
  return { index, instruments, quotes, expiries: [...expiries] };
}

export async function loadDeriveQuotes(
  currency: string,
  linear: boolean,
  expiries: number[],
  spot: number,
  call: DeriveCall,
): Promise<Record<string, Quote>> {
  const quotes: Record<string, Quote> = {};
  const expiryDates = [...new Set(expiries)].sort((a, b) => a - b);
  for (let i = 0; i < expiryDates.length; i += 4) {
    const chunk = expiryDates.slice(i, i + 4);
    const pages = await Promise.all(
      chunk.map((expiry) =>
        call("public/get_tickers", {
          currency,
          instrument_type: "option",
          expiry_date: ymd(expiry),
        }).catch(() => null),
      ),
    );
    for (const page of pages) {
      if (!page) continue;
      for (const [name, row] of Object.entries(tickerMap(page))) {
        const quote = quoteFromTicker(row, linear, spot, true);
        if (quote) quotes[name] = quote;
      }
    }
  }
  const perp = await call("public/get_tickers", { currency, instrument_type: "perp" }).catch(() => null);
  if (perp) {
    for (const [name, row] of Object.entries(tickerMap(perp))) {
      const quote = quoteFromTicker(row, linear, spot, false);
      if (quote) quotes[name] = quote;
    }
  }
  return quotes;
}

function parseOption(
  row: RawInstrument,
  linear: boolean,
  now: number,
): { instrument: Instrument; expirySec: number } | null {
  if (!row.instrument_name || row.is_active === false || row.instrument_type !== "option") return null;
  const details = row.option_details;
  const right = rightOf(details?.option_type);
  const strike = num(details?.strike);
  const expirySec = num(details?.expiry);
  if (!right || !(strike > 0) || !(expirySec > 0)) return null;
  if (expirySec * 1000 < now - 60_000) return null;
  const tick = num(row.tick_size);
  return {
    expirySec,
    instrument: {
      name: row.instrument_name,
      kind: "option",
      right,
      strike,
      expiry: expirySec * 1000,
      perpetual: false,
      contractSize: 1,
      tickSize: tick > 0 ? tick : 0.1,
      settlement: "Derive",
      linear,
    },
  };
}

function parsePerp(row: RawInstrument, linear: boolean): Instrument | null {
  if (!row.instrument_name || row.is_active === false || row.instrument_type !== "perp") return null;
  const tick = num(row.tick_size);
  return {
    name: row.instrument_name,
    kind: "future",
    expiry: null,
    perpetual: true,
    contractSize: 1,
    tickSize: tick > 0 ? tick : 0.01,
    settlement: linear ? "USDC" : "inverse",
    linear,
  };
}

function quoteFromTicker(row: RawTicker, linear: boolean, spot: number, option: boolean): Quote | null {
  const markUsd = num(row.M);
  if (!(markUsd > 0)) return null;
  const index = num(row.I) || spot;
  const forward = num(row.option_pricing?.f) || index || spot;
  const px = index > 0 ? index : forward;
  const mark = option && !linear && px > 0 ? markUsd / px : markUsd;
  if (!(mark > 0)) return null;
  const bid = positive(row.b);
  const ask = positive(row.a);
  const hourly = num(row.f);
  return {
    mark,
    iv: ivPercent(row.option_pricing?.i),
    underlying: forward > 0 ? forward : px,
    bid: option && !linear && bid != null && px > 0 ? bid / px : bid,
    ask: option && !linear && ask != null && px > 0 ? ask / px : ask,
    oi: num(row.stats?.oi),
    funding8h: option ? undefined : hourly * 8,
  };
}

function positive(value: unknown): number | null {
  const parsed = num(value);
  return parsed > 0 ? parsed : null;
}
