import { useEffect, useState } from "react";
import { fetchDeribit } from "@/lib/deribit-public";
import { barriers, quoteOption, smileIv, type OptLeg, type OptSide, type PropSetup } from "@/lib/options-sim";

export type Currency = "ETH" | "BTC" | "SOL" | "HYPE";
export type WsStatus = "connecting" | "live" | "reconnecting";

export type ChainContract = {
  name: string;
  currency: Currency;
  expiry: string;
  expiryMs: number;
  dte: number;
  strike: number;
  right: "call" | "put";
  linear: boolean;
  markCoin: number;
  bidCoin: number | null;
  askCoin: number | null;
  iv: number;
  underlying: number;
};

export type LiveTicker = {
  name: string;
  markCoin: number;
  bidCoin: number | null;
  askCoin: number | null;
  iv: number;
  underlying: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
};

export type LiveSnap = {
  status: WsStatus;
  latencyMs: number | null;
  index: number;
  chain: ChainContract[];
  tickers: Record<string, LiveTicker>;
  error: string | null;
};

const EMPTY: LiveSnap = {
  status: "connecting",
  latencyMs: null,
  index: 0,
  chain: [],
  tickers: {},
  error: null,
};

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

const NAME_RE = /^(ETH|BTC|SOL_USDC|HYPE_USDC)-(\d{1,2})([A-Z]{3})(\d{2})-(\d+(?:\.\d+)?)-([CP])$/;

function baseCurrency(token: string): Currency {
  if (token.startsWith("SOL")) return "SOL";
  if (token.startsWith("HYPE")) return "HYPE";
  return token as Currency;
}

function isLinear(currency: Currency): boolean {
  return currency === "SOL" || currency === "HYPE";
}

function apiCurrency(currency: Currency): string {
  return isLinear(currency) ? "USDC" : currency;
}

function indexChannelName(currency: Currency): string {
  return `deribit_price_index.${isLinear(currency) ? `${currency.toLowerCase()}_usdc` : `${currency.toLowerCase()}_usd`}`;
}

type Rpc = {
  id?: number;
  method?: string;
  result?: unknown;
  error?: { message?: string };
  params?: { channel?: string; type?: string; data?: unknown };
};

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function pos(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function parseInstrument(name: string): Omit<ChainContract, "markCoin" | "bidCoin" | "askCoin" | "iv" | "underlying"> | null {
  const match = NAME_RE.exec(name);
  if (!match) return null;
  const month = MONTHS[match[3]];
  if (month == null) return null;
  const expiryMs = Date.UTC(2000 + Number(match[4]), month, Number(match[2]), 8, 0, 0);
  return {
    name,
    currency: baseCurrency(match[1]),
    expiry: `${match[2]}${match[3]}${match[4]}`,
    expiryMs,
    dte: Math.max(0, (expiryMs - Date.now()) / 86_400_000),
    strike: Number(match[5]),
    right: match[6] === "C" ? "call" : "put",
    linear: match[1].includes("_USDC"),
  };
}

function parseBook(result: unknown, currency: Currency): ChainContract[] {
  if (!Array.isArray(result)) return [];
  const out: ChainContract[] = [];
  for (const row of result) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const name = typeof record.instrument_name === "string" ? record.instrument_name : "";
    const parsed = parseInstrument(name);
    if (!parsed || parsed.currency !== currency || !(parsed.dte > 0) || !(parsed.strike > 0)) continue;
    out.push({
      ...parsed,
      markCoin: num(record.mark_price),
      bidCoin: pos(record.bid_price),
      askCoin: pos(record.ask_price),
      iv: num(record.mark_iv),
      underlying: num(record.underlying_price),
    });
  }
  out.sort((a, b) => a.expiryMs - b.expiryMs || a.strike - b.strike || (a.right === b.right ? 0 : a.right === "call" ? -1 : 1));
  return out;
}

function ingestTicker(data: unknown): LiveTicker | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const name = typeof row.instrument_name === "string" ? row.instrument_name : "";
  if (!parseInstrument(name)) return null;
  const greeks = row.greeks && typeof row.greeks === "object" ? row.greeks as Record<string, unknown> : {};
  return {
    name,
    markCoin: num(row.mark_price),
    bidCoin: pos(row.best_bid_price),
    askCoin: pos(row.best_ask_price),
    iv: num(row.mark_iv),
    underlying: num(row.underlying_price),
    delta: num(greeks.delta),
    gamma: num(greeks.gamma),
    vega: num(greeks.vega),
    theta: num(greeks.theta),
  };
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  sent: number;
};

class DeribitLive {
  private ws: WebSocket | null = null;
  private retainers = 0;
  private currency: Currency = "ETH";
  private names = new Set<string>();
  private nameKey = "";
  private tickerChannels = new Set<string>();
  private indexChannel = "";
  private id = 1;
  private pending = new Map<number, Pending>();
  private retry = 800;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private bookTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(snap: LiveSnap) => void>();
  private snap: LiveSnap = EMPTY;
  private bufIndex: number | null = null;
  private bufTickers = new Map<string, LiveTicker>();
  private raf = 0;
  private generation = 0;
  private job: Promise<void> = Promise.resolve();
  private bootFails = 0;
  private chainFromWs = false;
  private restFlight = 0;

  listen(fn: (snap: LiveSnap) => void) {
    this.listeners.add(fn);
    fn(this.snap);
    return () => this.listeners.delete(fn);
  }

  retain() {
    this.retainers += 1;
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
    this.ensure();
    void this.loadRest(this.generation);
  }

  release() {
    this.retainers = Math.max(0, this.retainers - 1);
    if (this.retainers > 0) return;
    this.releaseTimer = setTimeout(() => {
      if (this.retainers === 0) this.shutdown();
    }, 400);
  }

  setCurrency(next: Currency) {
    if (next === this.currency) return;
    this.currency = next;
    this.generation += 1;
    this.bootFails = 0;
    this.chainFromWs = false;
    this.bufTickers.clear();
    this.bufIndex = null;
    this.snap = { ...this.snap, chain: [], tickers: {}, index: 0, error: null };
    this.emit();
    void this.loadRest(this.generation);
    if (this.ws?.readyState === WebSocket.OPEN) this.enqueue(() => this.bootstrap(this.generation));
  }

  setNames(list: string[]) {
    const key = [...new Set(list.filter(Boolean))].sort().join("|");
    if (key === this.nameKey) return;
    this.nameKey = key;
    this.names = new Set(key ? key.split("|") : []);
    this.enqueue(() => this.syncTickers(this.generation));
  }

  private emit() {
    for (const fn of this.listeners) fn(this.snap);
  }

  private ensure() {
    if (this.retainers <= 0 || typeof WebSocket === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.connect();
  }

  private connect() {
    if (this.retainers <= 0 || typeof WebSocket === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    const ws = new WebSocket("wss://www.deribit.com/ws/api/v2");
    this.ws = ws;
    const openTimer = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) ws.close();
    }, 8_000);
    ws.onopen = () => {
      clearTimeout(openTimer);
      this.retry = 800;
      this.bootFails = 0;
      this.snap = { ...this.snap, status: "live", error: null };
      this.emit();
      this.enqueue(async () => {
        await this.call("public/set_heartbeat", { interval: 30 }).catch(() => undefined);
        await this.bootstrap(this.generation);
      });
      this.armPing();
    };
    ws.onmessage = (event) => {
      this.onMessage(String(event.data));
    };
    ws.onerror = () => {
      this.snap = { ...this.snap, error: "Deribit-Socket gestört" };
      this.emit();
    };
    ws.onclose = () => {
      clearTimeout(openTimer);
      if (this.ws === ws) this.ws = null;
      this.rejectAll(new Error("socket closed"));
      this.tickerChannels.clear();
      this.indexChannel = "";
      this.stopTimers();
      if (this.retainers <= 0) return;
      this.snap = { ...this.snap, status: "reconnecting" };
      this.emit();
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.retainers <= 0) return;
    const wait = this.retry;
    this.retry = Math.min(this.retry * 2, 15_000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, wait);
  }

  private shutdown() {
    this.stopTimers();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();
    this.rejectAll(new Error("closed"));
    this.tickerChannels.clear();
    this.indexChannel = "";
    this.snap = { ...EMPTY, status: "connecting" };
    this.emit();
  }

  private stopTimers() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.bookTimer) clearInterval(this.bookTimer);
    this.pingTimer = null;
    this.bookTimer = null;
  }

  private armPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      const sent = Date.now();
      void this.call("public/get_time")
        .then(() => {
          this.snap = { ...this.snap, latencyMs: Math.max(1, Date.now() - sent) };
          this.emit();
        })
        .catch(() => undefined);
    }, 5_000);
  }

  private enqueue(task: () => Promise<void>) {
    this.job = this.job.then(task).catch(() => undefined);
  }

  private call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error("socket closed"));
    const id = this.id++;
    const sent = Date.now();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} Zeitüberschreitung`));
      }, 20_000);
      this.pending.set(id, {
        timer,
        sent,
        resolve: (value) => {
          const ms = Date.now() - sent;
          if (ms > 0 && ms < 10_000) this.snap = { ...this.snap, latencyMs: ms };
          resolve(value);
        },
        reject,
      });
      ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }

  private rejectAll(error: Error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private onMessage(raw: string) {
    let msg: Rpc;
    try {
      msg = JSON.parse(raw) as Rpc;
    } catch {
      return;
    }
    if (msg.id && this.pending.has(msg.id)) {
      const pending = this.pending.get(msg.id)!;
      clearTimeout(pending.timer);
      this.pending.delete(msg.id);
      if (msg.error) pending.reject(new Error(msg.error.message || "Deribit-Fehler"));
      else pending.resolve(msg.result);
      return;
    }
    if (msg.method === "heartbeat" && msg.params?.type === "test_request") {
      const ws = this.ws;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ jsonrpc: "2.0", id: this.id++, method: "public/test", params: {} }));
      }
      return;
    }
    if (msg.method !== "subscription" || !msg.params?.channel) return;
    const channel = msg.params.channel;
    if (channel.startsWith("deribit_price_index.")) {
      const data = msg.params.data as { price?: unknown } | undefined;
      const price = num(data?.price);
      if (price > 0) {
        this.bufIndex = price;
        this.scheduleFlush();
      }
      return;
    }
    if (channel.startsWith("ticker.")) {
      const ticker = ingestTicker(msg.params.data);
      if (!ticker) return;
      this.bufTickers.set(ticker.name, ticker);
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.raf || typeof requestAnimationFrame === "undefined") return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      let next = this.snap;
      let dirty = false;
      if (this.bufIndex != null && Math.abs(this.bufIndex - next.index) >= 0.005) {
        next = { ...next, index: this.bufIndex };
        dirty = true;
      }
      this.bufIndex = null;
      if (this.bufTickers.size) {
        const tickers = { ...next.tickers };
        for (const [name, ticker] of this.bufTickers) tickers[name] = ticker;
        this.bufTickers.clear();
        next = { ...next, tickers };
        dirty = true;
      }
      if (!dirty) return;
      this.snap = next;
      this.emit();
    });
  }

  private async bootstrap(gen: number) {
    const currency = this.currency;
    const indexChannel = indexChannelName(currency);
    try {
      const stale = [...this.tickerChannels];
      if (this.indexChannel && this.indexChannel !== indexChannel) stale.push(this.indexChannel);
      if (stale.length) {
        this.tickerChannels.clear();
        this.indexChannel = "";
        await this.call("public/unsubscribe", { channels: stale }).catch(() => undefined);
      }
      if (gen !== this.generation) return;
      const book = await this.call("public/get_book_summary_by_currency", { currency: apiCurrency(currency), kind: "option" });
      if (gen !== this.generation) return;
      const chain = parseBook(book, currency);
      this.snap = {
        ...this.snap,
        chain,
        status: "live",
        error: chain.length ? null : "Keine Optionen in der Kette",
      };
      if (chain.length) this.chainFromWs = true;
      this.emit();
      await this.call("public/subscribe", { channels: [indexChannel] });
      if (gen !== this.generation) {
        await this.call("public/unsubscribe", { channels: [indexChannel] }).catch(() => undefined);
        return;
      }
      this.indexChannel = indexChannel;
      this.bootFails = 0;
      await this.syncTickers(gen);
      this.armBook();
    } catch (error) {
      if (gen !== this.generation || this.retainers <= 0) return;
      this.bootFails += 1;
      this.snap = {
        ...this.snap,
        error: error instanceof Error ? error.message : "Deribit-Kette nicht geladen",
      };
      this.emit();
      if (this.bootFails <= 3) {
        await new Promise((resolve) => setTimeout(resolve, 1_500));
        if (gen === this.generation && this.ws?.readyState === WebSocket.OPEN) await this.bootstrap(gen);
      }
    }
  }

  private armBook() {
    if (this.bookTimer) clearInterval(this.bookTimer);
    this.bookTimer = setInterval(() => {
      void this.refreshBook();
    }, 20_000);
  }

  private async refreshBook() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const gen = this.generation;
    const currency = this.currency;
    try {
      const book = await this.call("public/get_book_summary_by_currency", { currency: apiCurrency(currency), kind: "option" });
      if (gen !== this.generation) return;
      const chain = parseBook(book, currency);
      if (!chain.length) return;
      this.chainFromWs = true;
      this.snap = { ...this.snap, chain, error: null };
      this.emit();
    } catch {
      /* the live tickers keep the legs warm */
    }
  }

  private async syncTickers(gen: number) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const want = new Set([...this.names].map((name) => `ticker.${name}.100ms`));
    const del = [...this.tickerChannels].filter((channel) => !want.has(channel));
    const add = [...want].filter((channel) => !this.tickerChannels.has(channel));
    if (del.length) {
      await this.call("public/unsubscribe", { channels: del }).catch(() => undefined);
      if (gen !== this.generation) return;
      for (const channel of del) this.tickerChannels.delete(channel);
    }
    if (!add.length) return;
    await this.call("public/subscribe", { channels: add });
    if (gen !== this.generation) {
      await this.call("public/unsubscribe", { channels: add }).catch(() => undefined);
      return;
    }
    for (const channel of add) this.tickerChannels.add(channel);
  }

  private async loadRest(gen: number) {
    const flight = ++this.restFlight;
    const currency = this.currency;
    try {
      const loaded = await pullPublic(currency);
      if (flight !== this.restFlight || gen !== this.generation || this.retainers <= 0) return;
      if (this.chainFromWs && this.snap.chain.length) {
        if (!(this.snap.index > 0) && loaded.index > 0) {
          this.snap = { ...this.snap, index: loaded.index };
          this.emit();
        }
        return;
      }
      if (!loaded.chain.length && !(loaded.index > 0)) return;
      this.snap = {
        ...this.snap,
        chain: loaded.chain.length ? loaded.chain : this.snap.chain,
        index: this.snap.index > 0 ? this.snap.index : loaded.index,
        error: loaded.chain.length ? null : this.snap.error,
      };
      this.emit();
    } catch (error) {
      if (flight !== this.restFlight || gen !== this.generation || this.snap.chain.length) return;
      this.snap = {
        ...this.snap,
        error: error instanceof Error ? error.message : "Deribit-REST nicht erreichbar",
      };
      this.emit();
    }
  }
}

let singleton: DeribitLive | null = null;

function client(): DeribitLive {
  if (!singleton) singleton = new DeribitLive();
  return singleton;
}

export function useDeribitLive(currency: Currency, names: string[]): LiveSnap {
  const [snap, setSnap] = useState<LiveSnap>(EMPTY);
  const key = names.filter(Boolean).join("|");
  useEffect(() => {
    const live = client();
    live.setCurrency(currency);
    const stop = live.listen(setSnap);
    live.retain();
    return () => {
      stop();
      live.release();
    };
  }, [currency]);
  useEffect(() => {
    client().setNames(key ? key.split("|") : []);
  }, [key]);
  return snap;
}

export function coinToUsd(coin: number | null | undefined, underlying: number, linear = false): number | null {
  if (coin == null || !Number.isFinite(coin) || coin < 0) return null;
  if (linear) return coin;
  if (!(underlying > 0)) return null;
  return coin * underlying;
}

type Priced = {
  markCoin: number;
  bidCoin: number | null;
  askCoin: number | null;
  iv: number;
  underlying: number;
};

export function coinForMode(row: Priced | undefined, mode: OptLeg["priceMode"]): number | null {
  if (!row || mode === "custom") return null;
  if (mode === "bid") return row.bidCoin;
  if (mode === "ask") return row.askCoin;
  return row.markCoin > 0 ? row.markCoin : null;
}

export function legFromContract(contract: ChainContract, side: OptSide, qty: number): OptLeg {
  const premium = coinToUsd(contract.markCoin > 0 ? contract.markCoin : null, contract.underlying, contract.linear);
  return {
    id: `live-${contract.name}-${Math.random().toString(36).slice(2, 7)}`,
    on: true,
    right: contract.right,
    side,
    qty: qty > 0 ? qty : 1,
    strike: contract.strike,
    dte: contract.dte,
    iv: contract.iv > 0 ? contract.iv : 50,
    premium,
    name: contract.name,
    expiry: contract.expiry,
    priceMode: "mark",
  };
}

function modelDelta(contract: ChainContract, spot: number): number {
  const s = contract.underlying > 0 ? contract.underlying : spot;
  const iv = contract.iv > 1 ? contract.iv : 50;
  if (!(s > 0) || !(contract.strike > 0)) return contract.right === "call" ? 0.5 : -0.5;
  return quoteOption({
    spot: s,
    strike: contract.strike,
    dte: Math.max(contract.dte, 1 / 24),
    ivPct: iv,
    ratePct: 0,
    right: contract.right,
  }).delta;
}

/** Black-Scholes-Delta am Index, oder das Deribit-Ticker-Delta wenn der Kontrakt abonniert ist. */
export function liveDelta(contract: ChainContract, index: number, ticker?: LiveTicker): number {
  if (ticker && Number.isFinite(ticker.delta) && (ticker.iv > 0 || ticker.markCoin > 0)) return ticker.delta;
  const spot = index > 0 ? index : contract.underlying;
  const iv = contract.iv > 1 ? contract.iv : 50;
  if (!(spot > 0) || !(contract.strike > 0)) return contract.right === "call" ? 0.5 : -0.5;
  return quoteOption({
    spot,
    strike: contract.strike,
    dte: Math.max(contract.dte, 1 / 24),
    ivPct: iv,
    ratePct: 0,
    right: contract.right,
  }).delta;
}

async function pullPublic(currency: Currency): Promise<{ chain: ChainContract[]; index: number }> {
  const indexName = isLinear(currency) ? `${currency.toLowerCase()}_usdc` : `${currency.toLowerCase()}_usd`;
  const api = apiCurrency(currency);
  try {
    const [bookRes, indexRes] = await Promise.all([
      fetch(`https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${api}&kind=option`),
      fetch(`https://www.deribit.com/api/v2/public/get_index_price?index_name=${indexName}`),
    ]);
    if (!bookRes.ok || !indexRes.ok) throw new Error(`Deribit REST ${bookRes.status}`);
    const bookJson = (await bookRes.json()) as { result?: unknown };
    const indexJson = (await indexRes.json()) as { result?: { index_price?: unknown } };
    const chain = parseBook(bookJson.result, currency);
    const index = num(indexJson.result?.index_price);
    if (!chain.length) throw new Error("leere Kette");
    return { chain, index };
  } catch {
    const [book, idx] = await Promise.all([
      fetchDeribit({ data: { method: "public/get_book_summary_by_currency", query: { currency: api, kind: "option" } } }),
      fetchDeribit({ data: { method: "public/get_index_price", query: { index_name: indexName } } }),
    ]);
    const index = idx && typeof idx === "object" ? num((idx as { index_price?: unknown }).index_price) : 0;
    return { chain: parseBook(book, currency), index };
  }
}

function nearestExpiry(chain: ChainContract[], targetDte: number): string | null {
  let best: string | null = null;
  let gap = Infinity;
  const seen = new Set<string>();
  for (const row of chain) {
    if (seen.has(row.expiry) || row.dte < 0.15) continue;
    seen.add(row.expiry);
    const next = Math.abs(row.dte - targetDte);
    if (next < gap) {
      gap = next;
      best = row.expiry;
    }
  }
  return best;
}

function closestDelta(rows: ChainContract[], target: number, spot: number): ChainContract | null {
  let best: ChainContract | null = null;
  let gap = Infinity;
  for (const row of rows) {
    if (!(row.iv > 0) && !(row.markCoin > 0)) continue;
    const next = Math.abs(modelDelta(row, spot) - target);
    if (next < gap) {
      gap = next;
      best = row;
    }
  }
  return best;
}

function closestStrike(rows: ChainContract[], target: number): ChainContract | null {
  let best: ChainContract | null = null;
  let gap = Infinity;
  for (const row of rows) {
    const next = Math.abs(row.strike - target);
    if (next < gap) {
      gap = next;
      best = row;
    }
  }
  return best;
}

export function syntheticChain(asset: Currency, spot: number): ChainContract[] {
  const anchor = spot > 0 ? spot : asset === "BTC" ? 80_000 : asset === "SOL" ? 80 : asset === "HYPE" ? 40 : 2_300;
  const step = asset === "BTC" ? 500 : asset === "ETH" ? 25 : asset === "HYPE" ? 1 : 1;
  const linear = isLinear(asset);
  const expiries = [
    { dte: 3, label: "3d (Fr)" },
    { dte: 7, label: "7d (Woche)" },
    { dte: 14, label: "14d (2 Wochen)" },
    { dte: 30, label: "30d (Monat)" },
  ];
  const first = Math.ceil((anchor * 0.91) / step) * step;
  const last = Math.floor((anchor * 1.09) / step) * step;
  const now = Date.now();
  const out: ChainContract[] = [];
  for (const expiry of expiries) {
    const expiryMs = now + expiry.dte * 86_400_000;
    for (let strike = first; strike <= last + 1e-6; strike += step) {
      const k = Math.round(strike);
      for (const right of ["call", "put"] as const) {
        const iv = smileIv(anchor, k, right);
        const quote = quoteOption({ spot: anchor, strike: k, dte: expiry.dte, ivPct: iv, ratePct: 0, right });
        const markCoin = linear ? Math.max(0, quote.usd) : anchor > 0 ? Math.max(0, quote.usd / anchor) : 0;
        const spread = Math.max(markCoin * 0.01, asset === "BTC" ? 0.00002 : linear ? 0.05 : 0.00008);
        out.push({
          name: `SYN-${asset}-${expiry.dte}d-${k}-${right === "call" ? "C" : "P"}`,
          currency: asset,
          expiry: expiry.label,
          expiryMs,
          dte: expiry.dte,
          strike: k,
          right,
          linear,
          markCoin,
          bidCoin: markCoin > spread ? markCoin - spread : null,
          askCoin: markCoin + spread,
          iv,
          underlying: anchor,
        });
      }
    }
  }
  return out;
}

export function buildLivePreset(kind: 1 | 2 | 3, chain: ChainContract[], setup: PropSetup): OptLeg[] {
  if (!chain.length || !(setup.index > 0)) return [];
  const qty = setup.coins > 0 ? setup.coins : 1;
  const bars = barriers(setup);
  if (kind === 1) {
    const expiry = nearestExpiry(chain, 7);
    if (!expiry) return [];
    const call = closestDelta(chain.filter((row) => row.expiry === expiry && row.right === "call"), 0.7, setup.index);
    return call ? [legFromContract(call, "sell", qty)] : [];
  }
  if (kind === 2) {
    const expiry = nearestExpiry(chain, 14);
    if (!expiry) return [];
    const calls = chain.filter((row) => row.expiry === expiry && row.right === "call");
    const short = closestDelta(calls, 0.7, setup.index);
    if (!short) return [];
    const pool = calls.filter((row) => row.name !== short.name);
    const pass = bars.pass != null && bars.pass > 0 ? bars.pass : short.strike;
    let long = closestStrike(pool, pass);
    if (long && long.strike === short.strike) long = closestStrike(pool.filter((row) => row.strike > short.strike), pass);
    return long ? [legFromContract(short, "sell", qty), legFromContract(long, "buy", qty)] : [legFromContract(short, "sell", qty)];
  }
  const far = nearestExpiry(chain, 30);
  const near = nearestExpiry(chain, 7);
  if (!far || !near) return [];
  const long = closestDelta(chain.filter((row) => row.expiry === far && row.right === "put"), -0.6, setup.index);
  const dd = bars.dd != null && bars.dd > 0 ? bars.dd : setup.index * 0.97;
  const short = closestStrike(chain.filter((row) => row.expiry === near && row.right === "put"), dd);
  if (!long || !short) return [];
  return [legFromContract(long, "buy", qty), legFromContract(short, "sell", qty)];
}
