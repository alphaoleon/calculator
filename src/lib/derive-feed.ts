import {
  deriveCallHttp,
  loadDeriveBook,
  loadDeriveQuotes,
  type DeriveBook,
} from "@/lib/derive";
import { bookParts, type BookId } from "@/lib/types";

const WS_URL = "wss://api.derive.xyz/v3/ws";

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type DeriveUpdate = DeriveBook & { transport: "ws" | "poll" };

/**
 * Public Derive socket. Used only when Deribit has not delivered a book.
 * Index streams on spot_feed; the chain is refreshed with public/get_tickers.
 */
export class DeriveBackup {
  private book: BookId = "ETH";
  private alive = false;
  private ws: WebSocket | null = null;
  private pending = new Map<number, Pending>();
  private id = 1;
  private generation = 0;
  private channel: string | null = null;
  private mode: "ws" | "poll" | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private retryMs = 1500;
  private cached: { book: BookId; expiries: number[]; spot: number; at: number } | null = null;

  constructor(
    private readonly onUpdate: (update: DeriveUpdate) => void,
    private readonly onIndex: (price: number) => void,
    private readonly onError: (error: Error) => void,
  ) {}

  start(book: BookId) {
    this.alive = true;
    this.book = book;
    this.generation += 1;
    this.connect();
  }

  stop() {
    this.alive = false;
    this.generation += 1;
    this.teardown();
  }

  setBook(book: BookId) {
    if (!this.alive) return;
    this.book = book;
    this.cached = null;
    this.generation += 1;
    if (this.ws?.readyState === WebSocket.OPEN) void this.bootstrap(this.generation);
    else if (this.mode === "poll") void this.poll(this.generation);
    else this.connect();
  }

  private connect() {
    if (!this.alive || typeof WebSocket === "undefined") {
      this.startPoll();
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.stopPoll();
    const ws = new WebSocket(WS_URL);
    this.ws = ws;
    const openTimer = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) ws.close();
    }, 6_000);
    ws.onopen = () => {
      clearTimeout(openTimer);
      this.retryMs = 1500;
      this.mode = "ws";
      void this.bootstrap(this.generation);
    };
    ws.onmessage = (event) => this.onMessage(String(event.data));
    ws.onerror = () => {
      /* close follows */
    };
    ws.onclose = () => {
      clearTimeout(openTimer);
      if (this.ws === ws) this.ws = null;
      this.rejectAll(new Error("Derive socket closed"));
      this.channel = null;
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      if (!this.alive) return;
      this.startPoll();
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.alive) return;
    const wait = this.retryMs;
    this.retryMs = Math.min(this.retryMs * 2, 20_000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, wait);
  }

  private teardown() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopPoll();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    this.channel = null;
    this.cached = null;
    this.mode = null;
    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    this.rejectAll(new Error("Derive stopped"));
  }

  private startPoll() {
    if (this.pollTimer || !this.alive) return;
    this.mode = "poll";
    const gen = this.generation;
    void this.poll(gen);
    this.pollTimer = setInterval(() => void this.poll(this.generation), 12_000);
  }

  private stopPoll() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private async poll(gen: number) {
    try {
      const snap = await loadDeriveBook(this.book, deriveCallHttp);
      if (!this.alive || gen !== this.generation) return;
      if (this.ws?.readyState === WebSocket.OPEN && this.mode === "ws") return;
      this.cached = { book: this.book, expiries: snap.expiries, spot: snap.index, at: Date.now() };
      this.onUpdate({ ...snap, transport: "poll" });
    } catch (error) {
      if (!this.alive || gen !== this.generation) return;
      this.onError(error instanceof Error ? error : new Error("Derive unavailable"));
    }
  }

  private async bootstrap(gen: number) {
    const book = this.book;
    try {
      if (this.channel) {
        const old = this.channel;
        this.channel = null;
        await this.call("unsubscribe", { channels: [old] }).catch(() => undefined);
      }
      const snap = await loadDeriveBook(book, (method, params) => this.call(method, params));
      if (!this.alive || gen !== this.generation || book !== this.book) return;
      this.cached = { book, expiries: snap.expiries, spot: snap.index, at: Date.now() };
      this.onUpdate({ ...snap, transport: "ws" });
      const currency = bookParts(book).currency;
      const channel = `spot_feed.${currency}`;
      const subscribed = await this.call("subscribe", { channels: [channel] });
      if (!this.alive || gen !== this.generation) {
        await this.call("unsubscribe", { channels: [channel] }).catch(() => undefined);
        return;
      }
      const status = (subscribed as { status?: Record<string, string> } | null)?.status;
      if (status && status[channel] && status[channel] !== "ok") {
        throw new Error(`Derive ${channel} ${status[channel]}`);
      }
      this.channel = channel;
      this.armRefresh();
    } catch (error) {
      if (!this.alive || gen !== this.generation) return;
      this.onError(error instanceof Error ? error : new Error("Derive unavailable"));
      this.startPoll();
    }
  }

  private armRefresh() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => {
      void this.refreshQuotes();
    }, 12_000);
  }

  private async refreshQuotes() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const book = this.book;
    const gen = this.generation;
    const cached = this.cached;
    if (!cached || cached.book !== book) {
      void this.bootstrap(gen);
      return;
    }
    try {
      const { currency, settle } = bookParts(book);
      const quotes = await loadDeriveQuotes(
        currency,
        settle === "linear",
        cached.expiries,
        cached.spot,
        (method, params) => this.call(method, params),
      );
      if (!this.alive || gen !== this.generation || book !== this.book) return;
      if (Object.keys(quotes).length === 0) return;
      this.onUpdate({
        index: cached.spot,
        instruments: [],
        quotes,
        expiries: cached.expiries,
        transport: "ws",
      });
    } catch {
      /* next tick */
    }
  }

  private call(method: string, params: Record<string, unknown>): Promise<unknown> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error("Derive socket closed"));
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
    let msg: {
      id?: number;
      result?: unknown;
      error?: { message?: string };
      method?: string;
      params?: { channel?: string; data?: unknown };
    };
    try {
      msg = JSON.parse(raw) as typeof msg;
    } catch {
      return;
    }
    if (msg.id && this.pending.has(msg.id)) {
      const pending = this.pending.get(msg.id)!;
      clearTimeout(pending.timer);
      this.pending.delete(msg.id);
      if (msg.error) pending.reject(new Error(msg.error.message || "Derive error"));
      else pending.resolve(msg.result);
      return;
    }
    if (msg.method === "subscription" && msg.params?.channel?.startsWith("spot_feed.")) {
      const data = msg.params.data as { feeds?: Record<string, { price?: string | number }> } | undefined;
      const feeds = data?.feeds;
      if (!feeds) return;
      const currency = bookParts(this.book).currency;
      const price = num(feeds[currency]?.price);
      if (price > 0) {
        if (this.cached && this.cached.book === this.book) this.cached.spot = price;
        this.onIndex(price);
      }
    }
  }
}
