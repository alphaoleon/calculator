export type Currency = "BTC" | "ETH" | "SOL" | "HYPE";

export type Settle = "inverse" | "linear";

export type BookId =
  | "BTC"
  | "ETH"
  | "BTC-USDC"
  | "ETH-USDC"
  | "SOL-USDC"
  | "HYPE-USDC";

export type Right = "call" | "put";

export type Metric = "pnl" | "delta" | "gamma" | "vega" | "theta";

export type Unit = "coin" | "usd";

export type Instrument = {
  name: string;
  kind: "option" | "future";
  right?: Right;
  strike?: number;
  expiry: number | null;
  perpetual: boolean;
  contractSize: number;
  tickSize: number;
  settlement: string;
  /** USDC-settled linear contract. Premium and future P&L are in USDC. */
  linear: boolean;
};

export type Quote = {
  mark: number;
  iv: number;
  underlying: number;
  bid: number | null;
  ask: number | null;
  oi: number;
  funding8h?: number;
};

export type Leg = {
  instrument: string;
  kind: "option" | "future";
  right?: Right;
  strike?: number;
  expiry: number | null;
  perpetual: boolean;
  contractSize: number;
  size: number;
  entry: number;
  iv: number;
  forward: number;
  linear: boolean;
};

/** A prop account modelled as coin exposure plus the firm's rules. */
export type PropAccount = {
  id: string;
  name: string;
  enabled: boolean;
  phase: "challenge" | "funded";
  /** Signed coin size. Positive is long the index. */
  size: number;
  entry: number;
  account: number;
  balance: number;
  /**
   * Static max-drawdown equity floor. Set from the starting balance and never trailed.
   * A touch breaches the account.
   */
  ddLimit: number;
  /**
   * Today's daily-loss equity floor. 0 disables it.
   * A touch breaches the account, same as the max floor.
   */
  dailyLimit: number;
  /** Challenge only: equity that passes. Funded accounts ignore this. 0 = none. */
  profitTarget: number;
  cost: number;
  /** Trader share of open P&L, 0–100. */
  split: number;
  /** Signed USD notional. Positive is long the index, negative is short. */
  positionUsd: number;
  /** Round-trip fee in percent of notional. 0.08 means 0.08%. */
  rtFeePct: number;
  /** Opening fee in percent. Missing means half the round trip (older books). */
  openFeePct?: number;
  /** Prop-firm preset id. Empty when the fee was typed in by hand. */
  presetId: string;
  /** Rotation desk. Empty while the row is a normal eval or funded hedge. */
  tag: "" | "cooldown" | "active" | "trader";
};

export const CURRENCIES: Currency[] = ["BTC", "ETH", "SOL", "HYPE"];

/** Coin-margined books. SOL and HYPE list on Deribit as USDC only. */
export const INVERSE_CURRENCIES: Currency[] = ["BTC", "ETH"];

export function hasInverse(currency: Currency): boolean {
  return currency === "BTC" || currency === "ETH";
}

export const BOOK_IDS: BookId[] = [
  "BTC",
  "ETH",
  "BTC-USDC",
  "ETH-USDC",
  "SOL-USDC",
  "HYPE-USDC",
];

export function bookId(currency: Currency, settle: Settle): BookId {
  if (settle === "linear" || !hasInverse(currency)) return `${currency}-USDC` as BookId;
  return currency as BookId;
}

export function bookParts(id: BookId): { currency: Currency; settle: Settle } {
  if (id === "BTC" || id === "ETH") return { currency: id, settle: "inverse" };
  return { currency: id.slice(0, -"-USDC".length) as Currency, settle: "linear" };
}

export const INDEX_NAME: Record<BookId, string> = {
  BTC: "btc_usd",
  ETH: "eth_usd",
  "BTC-USDC": "btc_usdc",
  "ETH-USDC": "eth_usdc",
  "SOL-USDC": "sol_usdc",
  "HYPE-USDC": "hype_usdc",
};

export const DVOL_INDEX: Partial<Record<Currency, string>> = {
  BTC: "btc_usd",
  ETH: "eth_usd",
};

export const COIN: Record<Currency, string> = {
  BTC: "BTC",
  ETH: "ETH",
  SOL: "SOL",
  HYPE: "HYPE",
};
