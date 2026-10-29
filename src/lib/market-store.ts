import { create } from "zustand";
import { fetchDeribit } from "@/lib/deribit-public";
import { DeriveBackup, type DeriveUpdate } from "@/lib/derive-feed";
import {
  DVOL_INDEX,
  INDEX_NAME,
  bookParts,
  type BookId,
  type Instrument,
  type Quote,
  type Right,
} from "@/lib/types";

export type Transport = "ws" | "poll" | null;
export type FeedSource = "deribit" | "derive" | null;
export type FeedStatus = "connecting" | "live" | "reconnecting" | "offline";

type MarketState = {
  book: BookId;
  status: FeedStatus;
  transport: Transport;
  source: FeedSource;
  error: string | null;
  index: number;
  prevIndex: number;
  dvol: number | null;
  instruments: Instrument[];
  quotes: Record<string, Quote>;
  updatedAt: number;
  now: number;
  setBook: (book: BookId) => void;
};

type RawInst = {
  instrument_name?: string;
  kind?: string;
  is_active?: boolean;
  option_type?: Right;
  strike?: number;
  expiration_timestamp?: number;
  contract_size?: number;
  tick_size?: number;
  settlement_period?: string;
  instrument_type?: string;
  base_currency?: string;
};

type RawBook = {
  instrument_name?: string;
  mark_price?: number;
  mark_iv?: number;
  bid_price?: number | null;
  ask_price?: number | null;
  underlying_price?: number | null;
  open_interest?: number;
  funding_8h?: number;
  base_currency?: string;
};

type RpcError = { message?: string };
type Rpc = {
  id?: number;
  method?: string;
  result?: unknown;
  error?: RpcError;
  params?: {
    channel?: string;
    type?: string;
    data?: unknown;
  };
};

const WS_URL = "wss://www.deribit.com/ws/api/v2";
const API = "https://www.deribit.com/api/v2";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function keepBookRow(row: { instrument_name?: string; base_currency?: string }, book: BookId): boolean {
  if (!row.instrument_name) return false;
  const { currency, settle } = bookParts(book);
  if (settle !== "linear") return true;
  const base = row.base_currency ?? row.instrument_name.split("_")[0];
  return base === currency && row.instrument_name.includes("_USDC");
}

function parseInstruments(rows: RawInst[], book: BookId): Instrument[] {
  const { currency, settle } = bookParts(book);
  const out: Instrument[] = [];
  for (const row of rows) {
    if (!row.instrument_name || row.is_active === false) continue;
    if (row.kind !== "option" && row.kind !== "future") continue;
    const linear = row.instrument_type === "linear" || row.instrument_name.includes("_USDC");
    if (settle === "linear") {
      if (!linear) continue;
      const base = row.base_currency ?? row.instrument_name.split("_")[0];
      if (base !== currency) continue;
    } else if (linear) {
      continue;
    }
    const perpetual = row.settlement_period === "perpetual";
    if (row.kind === "option" && row.option_type !== "call" && row.option_type !== "put") continue;
    const listed = row.contract_size && row.contract_size > 0 ? row.contract_size : 1;
    out.push({
      name: row.instrument_name,
      kind: row.kind,
      right: row.option_type,
      strike: row.strike,
      expiry: perpetual ? null : row.expiration_timestamp ?? null,
      perpetual,
      contractSize: linear && row.kind === "future" ? 1 : listed,
      tickSize: row.tick_size && row.tick_size > 0 ? row.tick_size : 0.0001,
      settlement: row.settlement_period ?? "",
      linear,
    });
  }
  out.sort((a, b) => {
    if (a.perpetual !== b.perpetual) return a.perpetual ? -1 : 1;
    const ea = a.expiry ?? Number.MAX_SAFE_INTEGER;
    const eb = b.expiry ?? Number.MAX_SAFE_INTEGER;
    if (ea !== eb) return ea - eb;
    return (a.strike ?? 0) - (b.strike ?? 0);
  });
  return out;
}

function quoteFromBook(row: RawBook, prev?: Quote): Quote | null {
  if (!row.instrument_name || !(row.mark_price && row.mark_price > 0)) return null;
  return {
    mark: row.mark_price,
    iv: typeof row.mark_iv === "number" ? row.mark_iv : prev?.iv ?? 0,
    underlying:
      row.underlying_price && row.underlying_price > 0
        ? row.underlying_price
        : prev?.underlying ?? 0,
    bid: row.bid_price ?? prev?.bid ?? null,
    ask: row.ask_price ?? prev?.ask ?? null,
    oi: typeof row.open_interest === "number" ? row.open_interest : prev?.oi ?? 0,
    funding8h: typeof row.funding_8h === "number" ? row.funding_8h : prev?.funding8h,
  };
}

function patchSide(quote: Quote | undefined, mark: number, extra: Partial<Quote> = {}): Quote {
  return {
    mark,
    iv: extra.iv ?? quote?.iv ?? 0,
    underlying: extra.underlying ?? quote?.underlying ?? 0,
    bid: extra.bid !== undefined ? extra.bid : quote?.bid ?? null,
    ask: extra.ask !== undefined ? extra.ask : quote?.ask ?? null,
    oi: extra.oi ?? quote?.oi ?? 0,
    funding8h: extra.funding8h ?? quote?.funding8h,
  };
}

export const useMarket = create<MarketState>(() => ({
  book: "ETH",
  status: "connecting",
  transport: null,
  source: null,
  error: null,
  index: 0,
  prevIndex: 0,
  dvol: null,
  instruments: [],
  quotes: {},
  updatedAt: 0,
  now: Date.now(),
  setBook: (book) => feed.setBook(book),
}));

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

class Feed {
  private ws: WebSocket | null = null;
  private pending = new Map<number, Pending>();
  private id = 1;
  private channels: string[] = [];
  private book: BookId = "ETH";
  private alive = false;
  private retryMs = 1000;
  private failures = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private bookTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private nowTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private buffer = new Map<string, Partial<Quote> & { mark: number }>();
  private generation = 0;
  private deriveOn = false;
  private deriveWatch: ReturnType<typeof setTimeout> | null = null;
  private derive = new DeriveBackup(
    (update) => this.onDerive(update),
    (price) => this.onDeriveIndex(price),
    (error) => this.onDeriveError(error),
  );

  start(book: BookId) {
    this.alive = true;
    this.book = book;
    useMarket.setState({ book, now: Date.now() });
    if (!this.nowTimer) {
      this.nowTimer = setInterval(() => {
        useMarket.setState({ now: Date.now() });
      }, 15_000);
    }
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) this.connect();
    this.startPoll();
    this.armDeriveWatch();
  }

  setBook(book: BookId) {
    if (this.book === book) return;
    this.book = book;
    this.generation += 1;
    this.buffer.clear();
    useMarket.setState({
      book,
      instruments: [],
      quotes: {},
      index: 0,
      prevIndex: 0,
      dvol: null,
      error: null,
      status: this.ws?.readyState === WebSocket.OPEN ? "live" : "connecting",
    });
    if (this.deriveOn) this.derive.setBook(book);
    else this.armDeriveWatch();
    if (this.ws?.readyState === WebSocket.OPEN) {
      void this.load(this.generation);
    } else if (useMarket.getState().transport === "poll") {
      void this.pollOnce();
    } else {
      this.connect();
    }
  }

  private connect() {
    if (!this.alive || typeof WebSocket === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    useMarket.setState({
      status: this.failures > 0 ? "reconnecting" : "connecting",
      error: null,
    });
    const ws = new WebSocket(WS_URL);
    this.ws = ws;
    const openTimer = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) ws.close();
    }, 6_000);
    ws.onopen = () => {
      clearTimeout(openTimer);
      this.retryMs = 1000;
      void this.call("public/set_heartbeat", { interval: 20 }).catch(() => undefined);
      void this.load(this.generation);
    };
    ws.onmessage = (event) => {
      this.onMessage(String(event.data));
    };
    ws.onerror = () => {
      useMarket.setState({ error: "Deribit socket error" });
    };
    ws.onclose = () => {
      clearTimeout(openTimer);
      if (this.ws === ws) this.ws = null;
      this.rejectAll(new Error("socket closed"));
      this.channels = [];
      if (!this.alive) return;
      this.failures += 1;
      this.startPoll();
      this.armDeriveWatch();
      useMarket.setState({
        status: useMarket.getState().index > 0 ? "live" : "reconnecting",
        error: null,
      });
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const wait = this.retryMs;
    this.retryMs = Math.min(this.retryMs * 2, 15_000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, wait);
  }

  private startPoll() {
    if (this.pollTimer) return;
    void this.pollOnce();
    this.pollTimer = setInterval(() => void this.pollOnce(), 8_000);
  }

  private stopPoll() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private async pollOnce() {
    const book = this.book;
    const spec = bookParts(book);
    const gen = this.generation;
    const api = spec.settle === "linear" ? "USDC" : spec.currency;
    try {
      const [idx, inst, opt, fut] = await Promise.all([
        fetchPublic("public/get_index_price", { index_name: INDEX_NAME[book] }),
        fetchPublic("public/get_instruments", { currency: api, expired: "false" }),
        fetchPublic("public/get_book_summary_by_currency", { currency: api, kind: "option" }),
        fetchPublic("public/get_book_summary_by_currency", { currency: api, kind: "future" }),
      ]);
      if (gen !== this.generation || book !== this.book) return;
      if (this.ws?.readyState === WebSocket.OPEN && useMarket.getState().transport === "ws") return;
      const instruments = parseInstruments(asArray<RawInst>(resultOf(inst)), book);
      const rows = asArray<RawBook>(resultOf(opt))
        .concat(asArray<RawBook>(resultOf(fut)))
        .filter((row) => keepBookRow(row, book));
      const quotes = booksToQuotes(rows);
      const index = numberAt(idx, "index_price");
      if (!(instruments.length > 0) || !(index > 0)) {
        this.startDerive();
        return;
      }
      this.noteDeribitUp();
      useMarket.setState((state) => ({
        status: "live",
        transport: "poll",
        source: "deribit",
        error: null,
        instruments,
        quotes,
        index: index || state.index,
        prevIndex: state.index || index,
        updatedAt: Date.now(),
        now: Date.now(),
      }));
    } catch (error) {
      if (gen !== this.generation) return;
      this.startDerive();
      const state = useMarket.getState();
      if (state.source === "derive" && state.index > 0) return;
      useMarket.setState({
        status: state.index > 0 ? "live" : "offline",
        transport: "poll",
        error: error instanceof Error ? error.message : "Market data unavailable",
      });
    }
  }

  private call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error("socket closed"));
    const id = this.id++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 20_000);
      this.pending.set(id, { resolve, reject, timer });
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
      if (msg.error) pending.reject(new Error(msg.error.message || "Deribit error"));
      else pending.resolve(msg.result);
      return;
    }
    if (msg.method === "heartbeat" && msg.params?.type === "test_request") {
      void this.call("public/test").catch(() => undefined);
      return;
    }
    if (msg.method === "subscription" && msg.params?.channel) {
      this.onSubscription(msg.params.channel, msg.params.data);
    }
  }

  private async load(gen: number) {
    const book = this.book;
    const spec = bookParts(book);
    const api = spec.settle === "linear" ? "USDC" : spec.currency;
    try {
      if (this.channels.length) {
        const old = this.channels;
        this.channels = [];
        await this.call("public/unsubscribe", { channels: old }).catch(() => undefined);
      }
      const [instRes, optRes, futRes, idxRes] = await Promise.all([
        this.call("public/get_instruments", { currency: api, expired: false }),
        this.call("public/get_book_summary_by_currency", { currency: api, kind: "option" }),
        this.call("public/get_book_summary_by_currency", { currency: api, kind: "future" }),
        this.call("public/get_index_price", { index_name: INDEX_NAME[book] }),
      ]);
      if (gen !== this.generation || book !== this.book) return;
      const instruments = parseInstruments(asArray<RawInst>(instRes), book);
      const rows = asArray<RawBook>(optRes)
        .concat(asArray<RawBook>(futRes))
        .filter((row) => keepBookRow(row, book));
      const quotes = booksToQuotes(rows);
      const index = numberAt(idxRes, "index_price");
      if (!(instruments.length > 0) || !(index > 0)) {
        this.startDerive();
        return;
      }
      this.noteDeribitUp();
      useMarket.setState((state) => ({
        instruments,
        quotes,
        index: index || state.index,
        prevIndex: state.index || index,
        status: "live",
        transport: "ws",
        source: "deribit",
        error: null,
        updatedAt: Date.now(),
        now: Date.now(),
      }));
      this.failures = 0;
      this.stopPoll();
      const dvol = DVOL_INDEX[spec.currency];
      const channels = [
        `deribit_price_index.${INDEX_NAME[book]}`,
        `markprice.options.${INDEX_NAME[book]}`,
        ...(dvol ? [`deribit_volatility_index.${dvol}`] : []),
        ...instruments.filter((item) => item.kind === "future").map((item) => `ticker.${item.name}.100ms`),
      ];
      const subscribed = await this.call("public/subscribe", { channels });
      if (gen !== this.generation) {
        await this.call("public/unsubscribe", { channels }).catch(() => undefined);
        return;
      }
      this.channels = Array.isArray(subscribed) ? subscribed.filter((item) => typeof item === "string") : channels;
      this.armBookRefresh();
    } catch (error) {
      if (gen !== this.generation) return;
      this.startPoll();
      this.startDerive();
      useMarket.setState((state) => ({
        status: state.index > 0 ? "live" : "reconnecting",
        error: state.index > 0 ? null : error instanceof Error ? error.message : "Could not load the book",
      }));
    }
  }

  private armBookRefresh() {
    if (this.bookTimer) clearInterval(this.bookTimer);
    this.bookTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      void this.refreshBooks();
    }, 20_000);
  }

  private async refreshBooks() {
    const book = this.book;
    const spec = bookParts(book);
    const api = spec.settle === "linear" ? "USDC" : spec.currency;
    const gen = this.generation;
    try {
      const [optRes, futRes] = await Promise.all([
        this.call("public/get_book_summary_by_currency", { currency: api, kind: "option" }),
        this.call("public/get_book_summary_by_currency", { currency: api, kind: "future" }),
      ]);
      if (gen !== this.generation || book !== this.book) return;
      const rows = asArray<RawBook>(optRes)
        .concat(asArray<RawBook>(futRes))
        .filter((row) => keepBookRow(row, book));
      useMarket.setState((state) => {
        const quotes = { ...state.quotes };
        for (const row of rows) {
          if (!row.instrument_name) continue;
          const prev = quotes[row.instrument_name];
          const next = quoteFromBook(row, prev);
          if (!next) continue;
          const option = /-[CP]$/.test(row.instrument_name);
          if (prev && option) {
            quotes[row.instrument_name] = {
              ...prev,
              bid: next.bid,
              ask: next.ask,
              oi: next.oi,
              underlying: next.underlying || prev.underlying,
              funding8h: next.funding8h ?? prev.funding8h,
            };
          } else {
            quotes[row.instrument_name] = prev
              ? { ...next, iv: prev.iv || next.iv }
              : next;
          }
        }
        return { quotes, updatedAt: Date.now() };
      });
    } catch {
      /* next tick */
    }
  }

  private onSubscription(channel: string, data: unknown) {
    const indexName = INDEX_NAME[this.book];
    if (channel.startsWith("deribit_price_index.")) {
      if (channel !== `deribit_price_index.${indexName}`) return;
      const price = numberAt(data, "price");
      if (!(price > 0)) return;
      useMarket.setState((state) => ({
        prevIndex: state.index || price,
        index: price,
        now: Date.now(),
      }));
      return;
    }
    if (channel.startsWith("deribit_volatility_index.")) {
      const dvolName = DVOL_INDEX[bookParts(this.book).currency];
      if (!dvolName || channel !== `deribit_volatility_index.${dvolName}`) return;
      const vol = numberAt(data, "volatility");
      if (!(vol > 0)) return;
      useMarket.setState({ dvol: vol > 3 ? vol : vol * 100 });
      return;
    }
    if (channel.startsWith("markprice.options.")) {
      if (channel !== `markprice.options.${indexName}`) return;
      for (const row of asArray<{ instrument_name?: string; mark_price?: number; iv?: number }>(data)) {
        if (!row.instrument_name || !(row.mark_price && row.mark_price > 0)) continue;
        const iv = typeof row.iv === "number" ? row.iv * 100 : undefined;
        this.buffer.set(row.instrument_name, {
          mark: row.mark_price,
          ...(iv != null ? { iv } : {}),
        });
      }
      this.scheduleFlush();
      return;
    }
    if (channel.startsWith("ticker.")) {
      const row = data as {
        instrument_name?: string;
        mark_price?: number;
        best_bid_price?: number;
        best_ask_price?: number;
        open_interest?: number;
        funding_8h?: number;
      };
      if (!row.instrument_name || !(row.mark_price && row.mark_price > 0)) return;
      this.buffer.set(row.instrument_name, {
        mark: row.mark_price,
        bid: row.best_bid_price ?? null,
        ask: row.best_ask_price ?? null,
        oi: row.open_interest,
        funding8h: row.funding_8h,
      });
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      if (this.buffer.size === 0) return;
      const batch = this.buffer;
      this.buffer = new Map();
      useMarket.setState((state) => {
        const quotes = { ...state.quotes };
        for (const [name, patch] of batch) {
          quotes[name] = patchSide(quotes[name], patch.mark, patch);
        }
        return { quotes, updatedAt: Date.now() };
      });
    }, 350);
  }

  private armDeriveWatch() {
    if (this.deriveWatch || this.deriveOn) return;
    this.deriveWatch = setTimeout(() => {
      this.deriveWatch = null;
      const state = useMarket.getState();
      if (state.source === "deribit" && state.index > 0 && state.instruments.length > 0) return;
      this.startDerive();
    }, 7_000);
  }

  private startDerive() {
    if (this.deriveOn) return;
    const state = useMarket.getState();
    if (state.source === "deribit" && state.index > 0 && state.instruments.length > 0) return;
    this.deriveOn = true;
    if (this.deriveWatch) {
      clearTimeout(this.deriveWatch);
      this.deriveWatch = null;
    }
    this.derive.start(this.book);
  }

  private noteDeribitUp() {
    if (this.deriveWatch) {
      clearTimeout(this.deriveWatch);
      this.deriveWatch = null;
    }
    if (!this.deriveOn) return;
    this.deriveOn = false;
    this.derive.stop();
  }

  private onDerive(update: DeriveUpdate) {
    if (!this.deriveOn) return;
    const state = useMarket.getState();
    if (state.source === "deribit" && state.index > 0 && state.instruments.length > 0) {
      this.noteDeribitUp();
      return;
    }
    useMarket.setState((current) => ({
      status: "live",
      transport: update.transport,
      source: "derive",
      error: null,
      index: update.index || current.index,
      prevIndex: current.index || update.index || current.prevIndex,
      instruments: update.instruments.length > 0 ? update.instruments : current.instruments,
      quotes: update.instruments.length > 0 ? update.quotes : { ...current.quotes, ...update.quotes },
      updatedAt: Date.now(),
      now: Date.now(),
    }));
  }

  private onDeriveIndex(price: number) {
    if (!this.deriveOn || useMarket.getState().source !== "derive") return;
    useMarket.setState((state) => ({
      prevIndex: state.index || price,
      index: price,
      now: Date.now(),
    }));
  }

  private onDeriveError(error: Error) {
    if (!this.deriveOn) return;
    const state = useMarket.getState();
    if (state.source === "deribit" && state.index > 0) return;
    useMarket.setState({
      status: state.index > 0 ? "live" : "offline",
      source: state.index > 0 ? "derive" : state.source,
      error: state.index > 0 ? null : error.message,
    });
  }
}

function booksToQuotes(rows: RawBook[]): Record<string, Quote> {
  const quotes: Record<string, Quote> = {};
  for (const row of rows) {
    if (!row.instrument_name) continue;
    const quote = quoteFromBook(row);
    if (quote) quotes[row.instrument_name] = quote;
  }
  return quotes;
}

function resultOf(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "result" in payload) {
    return (payload as { result: unknown }).result;
  }
  return payload;
}

function numberAt(payload: unknown, key: string): number {
  const source = resultOf(payload);
  if (!source || typeof source !== "object") return 0;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Market request failed (${response.status})`);
  return response.json() as Promise<unknown>;
}

async function fetchPublic(method: string, query: Record<string, string>): Promise<unknown> {
  try {
    return await fetchDeribit({ data: { method, query } });
  } catch {
    const url = new URL(`${API}/${method}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return resultOf(await fetchJson(url.toString()));
  }
}

const feed = new Feed();

export function ensureFeed(book: BookId) {
  feed.start(book);
}
