import { normCdf, normPdf, priceOption } from "@/lib/pricing";
import type { Right } from "@/lib/types";

export type OptRight = Right;
export type OptSide = "buy" | "sell";
export type MoneyUnit = "usd" | "coin";
export type Asset = "ETH" | "BTC" | "SOL" | "HYPE";
export type PropSide = "long" | "short";

export type PriceMode = "mark" | "bid" | "ask" | "custom";

export type OptLeg = {
  id: string;
  on: boolean;
  right: OptRight;
  side: OptSide;
  qty: number;
  strike: number;
  dte: number;
  /** Implied vol in percent, e.g. 55. */
  iv: number;
  /** Frozen USD premium. Null reprices from Black-Scholes at entry. */
  premium: number | null;
  /** Deribit mid, bid and ask per contract. Optional on handmade legs. */
  mark?: number | null;
  bid?: number | null;
  ask?: number | null;
  /** Deribit instrument name. Empty while the leg is still synthetic. */
  name: string;
  /** Expiry code such as 27NOV26. */
  expiry: string;
  priceMode: PriceMode;
};

export type PropSetup = {
  unit: MoneyUnit;
  asset: Asset;
  index: number;
  fee: number;
  maxDd: number;
  target: number;
  side: PropSide;
  coins: number;
  payout: number;
};

export type Barriers = { dd: number | null; pass: number | null };

export type Greeks = { delta: number; gamma: number; vega: number; theta: number };

export function defaultSetup(): PropSetup {
  return {
    unit: "usd",
    asset: "ETH",
    index: 2298,
    fee: 75,
    maxDd: 300,
    target: 450,
    side: "long",
    coins: 5,
    payout: 380,
  };
}

export function barriers(setup: PropSetup): Barriers {
  if (!(setup.index > 0) || !(setup.coins > 0)) return { dd: null, pass: null };
  const ddMove = Math.max(0, setup.maxDd) / setup.coins;
  const passMove = Math.max(0, setup.target) / setup.coins;
  if (setup.side === "long") {
    return { dd: setup.index - ddMove, pass: setup.index + passMove };
  }
  return { dd: setup.index + ddMove, pass: setup.index - passMove };
}

export function passed(setup: PropSetup, price: number, bars: Barriers = barriers(setup)): boolean {
  if (bars.pass == null || !(price > 0)) return false;
  return setup.side === "long" ? price >= bars.pass - 1e-8 : price <= bars.pass + 1e-8;
}

/** Flat challenge cost, or the funded-account value once price is through Pass and payout is on. */
export function propCashUsd(setup: PropSetup, price: number, payoutOn: boolean): number {
  if (payoutOn && passed(setup, price)) return setup.payout;
  return -Math.max(0, setup.fee);
}

/** Futures equity of the prop, floored at the drawdown because the account is dead past the barrier. */
export function propEquityUsd(setup: PropSetup, price: number): number {
  if (!(setup.index > 0) || !(setup.coins > 0) || !(price > 0)) return 0;
  const dir = setup.side === "long" ? 1 : -1;
  const pnl = dir * (price - setup.index) * setup.coins;
  return Math.max(pnl, -Math.max(0, setup.maxDd));
}

export function toUnit(usd: number, setup: PropSetup): number {
  if (setup.unit === "usd" || !(setup.index > 0)) return usd;
  return usd / setup.index;
}

type QuoteArgs = {
  spot: number;
  strike: number;
  dte: number;
  ivPct: number;
  ratePct: number;
  right: OptRight;
};

/** Black-Scholes with q = 0. Rate 0 matches the Deribit forward pricer. Vega per 1 vol point, theta per day. */
export function quoteOption(args: QuoteArgs): Greeks & { usd: number } {
  const { spot: S, strike: K, right } = args;
  const call = right === "call";
  const zero = { usd: 0, delta: 0, gamma: 0, vega: 0, theta: 0 };
  if (!(S > 0) || !(K > 0)) return zero;
  const T = Math.max(0, args.dte) / 365;
  const sigma = Math.max(0.01, args.ivPct / 100);
  const r = args.ratePct / 100;
  if (!(T > 1e-8)) {
    const usd = call ? Math.max(S - K, 0) : Math.max(K - S, 0);
    const atm = Math.abs(S - K) / S < 1e-6;
    const delta = atm ? (call ? 0.5 : -0.5) : usd === 0 ? 0 : call ? 1 : -1;
    return { usd, delta, gamma: 0, vega: 0, theta: 0 };
  }
  if (Math.abs(r) < 1e-8) {
    const bare = priceOption({ forward: S, strike: K, tYears: T, sigma, right });
    return { usd: bare.usd, delta: bare.delta, gamma: bare.gamma, vega: bare.vega, theta: bare.theta };
  }
  const vol = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / vol;
  const d2 = d1 - vol;
  const nd1 = normCdf(d1);
  const pdf = normPdf(d1);
  const disc = Math.exp(-r * T);
  const usd = call ? S * nd1 - K * disc * normCdf(d2) : K * disc * normCdf(-d2) - S * normCdf(-d1);
  const delta = call ? nd1 : nd1 - 1;
  const gamma = pdf / (S * sigma * Math.sqrt(T));
  const vega = S * pdf * Math.sqrt(T) * 0.01;
  const thetaYear = call
    ? (-S * pdf * sigma) / (2 * Math.sqrt(T)) - r * K * disc * normCdf(d2)
    : (-S * pdf * sigma) / (2 * Math.sqrt(T)) + r * K * disc * normCdf(-d2);
  return { usd, delta, gamma, vega, theta: thetaYear / 365 };
}

export function strikeForDelta(spot: number, dte: number, ivPct: number, right: OptRight, delta: number): number {
  if (!(spot > 0) || !(dte > 0) || !(ivPct > 0)) return spot;
  let lo = spot * 0.05;
  let hi = spot * 5;
  for (let i = 0; i < 56; i += 1) {
    const mid = (lo + hi) / 2;
    const got = quoteOption({ spot, strike: mid, dte, ivPct, ratePct: 0, right }).delta;
    if (got > delta) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function niceStrike(asset: Asset, strike: number): number {
  const step = asset === "BTC" ? 500 : 10;
  if (!(strike > 0)) return step;
  return Math.max(step, Math.round(strike / step) * step);
}

function leg(id: string, partial: Omit<OptLeg, "id" | "on" | "premium" | "name" | "expiry" | "priceMode">): OptLeg {
  return { id, on: true, premium: null, name: "", expiry: "", priceMode: "mark", ...partial };
}

export function presetLegs(kind: 1 | 2 | 3, setup: PropSetup): OptLeg[] {
  const spot = setup.index > 0 ? setup.index : 2298;
  const qty = setup.coins > 0 ? setup.coins : 1;
  const step = setup.asset === "BTC" ? 500 : 10;
  if (kind === 1) {
    const raw = strikeForDelta(spot, 7, 55, "call", 0.7);
    return [leg("p1-call", { right: "call", side: "sell", qty, strike: niceStrike(setup.asset, raw), dte: 7, iv: 55 })];
  }
  if (kind === 2) {
    const shortK = niceStrike(setup.asset, strikeForDelta(spot, 14, 55, "call", 0.7));
    let longK = niceStrike(setup.asset, strikeForDelta(spot, 14, 55, "call", 0.2));
    if (longK <= shortK) longK = shortK + step;
    return [
      leg("p2-short", { right: "call", side: "sell", qty, strike: shortK, dte: 14, iv: 55 }),
      leg("p2-long", { right: "call", side: "buy", qty, strike: longK, dte: 14, iv: 55 }),
    ];
  }
  const longK = niceStrike(setup.asset, strikeForDelta(spot, 30, 50, "put", -0.6));
  const bars = barriers(setup);
  const barrier = bars.dd != null && bars.dd > 0 ? bars.dd : spot * 0.97;
  let shortK = niceStrike(setup.asset, barrier);
  if (shortK === longK) shortK = Math.max(step, longK - step);
  return [
    leg("p3-long", { right: "put", side: "buy", qty, strike: longK, dte: 30, iv: 50 }),
    leg("p3-short", { right: "put", side: "sell", qty, strike: shortK, dte: 7, iv: 62 }),
  ];
}

export function blankLeg(setup: PropSetup): OptLeg {
  return leg(`leg-${Date.now().toString(36)}`, {
    right: "call",
    side: "buy",
    qty: 1,
    strike: niceStrike(setup.asset, setup.index > 0 ? setup.index : 2298),
    dte: 7,
    iv: 55,
  });
}

function shiftedIv(iv: number, volShift: number): number {
  return Math.max(1, iv * (1 + volShift / 100));
}

export function entryPremium(legRow: OptLeg, index: number): number {
  if (legRow.premium != null && Number.isFinite(legRow.premium)) return Math.max(0, legRow.premium);
  if (!(index > 0)) return 0;
  return quoteOption({
    spot: index,
    strike: legRow.strike,
    dte: legRow.dte,
    ivPct: legRow.iv,
    ratePct: 0,
    right: legRow.right,
  }).usd;
}

export function optionsPnlUsd(
  legs: OptLeg[],
  spot: number,
  elapsed: number,
  volShift: number,
  rateShift: number,
  index: number,
): number {
  let sum = 0;
  for (const row of legs) {
    if (!row.on || !(row.qty > 0) || !(row.strike > 0)) continue;
    const mark = quoteOption({
      spot,
      strike: row.strike,
      dte: Math.max(0, row.dte - elapsed),
      ivPct: shiftedIv(row.iv, volShift),
      ratePct: rateShift,
      right: row.right,
    }).usd;
    const entry = entryPremium(row, index);
    const sign = row.side === "buy" ? 1 : -1;
    sum += (mark - entry) * sign * row.qty;
  }
  return sum;
}

export function bookGreeks(legs: OptLeg[], index: number, elapsed: number, volShift: number, rateShift: number): Greeks {
  const out = { delta: 0, gamma: 0, vega: 0, theta: 0 };
  if (!(index > 0)) return out;
  for (const row of legs) {
    if (!row.on || !(row.qty > 0) || !(row.strike > 0)) continue;
    const q = quoteOption({
      spot: index,
      strike: row.strike,
      dte: Math.max(0, row.dte - elapsed),
      ivPct: shiftedIv(row.iv, volShift),
      ratePct: rateShift,
      right: row.right,
    });
    const mult = (row.side === "buy" ? 1 : -1) * row.qty;
    out.delta += q.delta * mult;
    out.gamma += q.gamma * mult;
    out.vega += q.vega * mult;
    out.theta += q.theta * mult;
  }
  return out;
}

export function smileIv(spot: number, strike: number, right: OptRight): number {
  if (!(spot > 0) || !(strike > 0)) return 55;
  const m = (strike - spot) / spot;
  const smile = 55 * (1 + 1.35 * m * m);
  const skew = right === "put" ? Math.max(0, -m) * 18 : Math.max(0, m) * 8;
  return Math.round((smile + skew) * 10) / 10;
}

/** Price where 55% of the path from entry to the DD barrier is done. */
export function rollLevel(setup: PropSetup): number | null {
  const bars = barriers(setup);
  if (bars.dd == null || !(setup.index > 0)) return null;
  return setup.index - 0.55 * (setup.index - bars.dd);
}

const ROLL_SHARE = 0.55;
const REST_SHARE = 0.45;

function roundQty(qty: number): number {
  return Math.min(1_000_000, Math.max(0.01, Math.ceil(qty * 100 - 1e-8) / 100));
}

/** Size each short call so the book earns 55% of the challenge fee at the roll. The other 45% is the planned next strike. */
export function scaleShortCallsToFee(legs: OptLeg[], setup: PropSetup): { legs: OptLeg[]; note: string } {
  const fee = Math.max(0, setup.fee);
  const roll = rollLevel(setup);
  if (roll == null || !(fee > 0)) return { legs, note: "Keine Challenge-Gebühr oder keine DD-Barrier." };
  const shorts = legs.filter((row) => row.on && row.side === "sell" && row.right === "call");
  if (!shorts.length) return { legs, note: "Kein Short-Call in der Tabelle." };
  const priced = shorts.map((row) => ({
    row,
    unit: optionsPnlUsd([{ ...row, qty: 1 }], roll, 0, 0, 0, setup.index),
  }));
  const useful = priced.filter((item) => item.unit > 0.01);
  if (!useful.length) return { legs, note: "Der Short-Call verdient am 55%-Roll-Punkt nichts. Strike näher an den Entry legen." };
  const target = fee * ROLL_SHARE;
  const weight = useful.reduce((sum, item) => sum + Math.max(item.row.qty, 0.01), 0);
  const qtyById = new Map<string, number>();
  for (const item of useful) {
    const share = (Math.max(item.row.qty, 0.01) / weight) * target;
    qtyById.set(item.row.id, roundQty(share / item.unit));
  }
  return {
    legs: legs.map((row) => (qtyById.has(row.id) ? { ...row, qty: qtyById.get(row.id) ?? row.qty } : row)),
    note: "",
  };
}

export type FeeRoll = {
  roll: number;
  dd: number;
  fee: number;
  realized: number;
  share: number;
  nextStrike: number | null;
  nextQty: number;
  nextProfit: number;
  protection: number;
  capped: number;
  unrolled: number;
  shortfall: number;
};

function nearestNumber(values: number[], target: number): number | null {
  if (!values.length) return null;
  let best = values[0];
  let gap = Math.abs(best - target);
  for (const value of values) {
    const next = Math.abs(value - target);
    if (next < gap) {
      gap = next;
      best = value;
    }
  }
  return best;
}

/** 55% roll versus holding the starter short call all the way to the DD barrier. */
export function feeRoll(
  legs: OptLeg[],
  setup: PropSetup,
  strikes: number[],
  elapsed = 0,
  volShift = 0,
  rateShift = 0,
): FeeRoll | null {
  const bars = barriers(setup);
  const roll = rollLevel(setup);
  if (bars.dd == null || roll == null) return null;
  const fee = Math.max(0, setup.fee);
  const realized = optionsPnlUsd(legs, roll, elapsed, volShift, rateShift, setup.index);
  const unrolled = optionsPnlUsd(legs, bars.dd, elapsed, volShift, rateShift, setup.index);
  const capped = legs.reduce((sum, row) => {
    if (!row.on || row.side !== "sell" || !(row.qty > 0)) return sum;
    return sum + entryPremium(row, setup.index) * row.qty;
  }, 0);
  const down = bars.dd < setup.index;
  const raw = strikeForDelta(roll, 7, 55, "call", down ? 0.7 : -0.7);
  const deeper = strikes.filter((strike) => (down ? strike < roll - 0.5 : strike > roll + 0.5));
  const nextStrike = nearestNumber(deeper.length ? deeper : strikes, down ? raw : strikeForDelta(roll, 7, 55, "put", -0.7));
  let nextQty = 0;
  let nextProfit = 0;
  if (nextStrike != null && fee > 0 && realized > 0.5) {
    const right: OptRight = down ? "call" : "put";
    const iv = smileIv(roll, nextStrike, right);
    const sold = quoteOption({ spot: roll, strike: nextStrike, dte: 7, ivPct: iv, ratePct: 0, right }).usd;
    const held = quoteOption({ spot: bars.dd, strike: nextStrike, dte: 7, ivPct: iv, ratePct: 0, right }).usd;
    const per = sold - held;
    if (per > 0.01) {
      nextQty = roundQty((fee * REST_SHARE) / per);
      nextProfit = per * nextQty;
    }
  }
  const protection = Math.max(0, realized) + nextProfit;
  return {
    roll,
    dd: bars.dd,
    fee,
    realized,
    share: fee > 0 ? realized / fee : 0,
    nextStrike,
    nextQty,
    nextProfit,
    protection,
    capped,
    unrolled,
    shortfall: Math.max(0, fee - unrolled),
  };
}

/** Short call near the DD barrier, long call near Pass, same qty, sized so options PnL at the barrier equals the challenge fee. */
export function cappedCallSpread(setup: PropSetup): OptLeg[] {
  const spot = setup.index > 0 ? setup.index : setup.asset === "BTC" ? 80_000 : 2298;
  const step = setup.asset === "BTC" ? 500 : 25;
  const snap = (price: number) => Math.max(step, Math.round(price / step) * step);
  const bars = barriers({ ...setup, index: spot });
  const down = bars.dd == null || bars.dd <= spot;
  const shortRaw = bars.dd != null && bars.dd > 0 ? bars.dd : spot * (down ? 0.97 : 1.03);
  const longRaw = bars.pass != null && bars.pass > 0 ? bars.pass : spot * (down ? 1.04 : 0.96);
  let shortK = snap(shortRaw);
  let longK = snap(longRaw);
  if (longK === shortK) longK = down ? shortK + step : Math.max(step, shortK - step);
  const make = (id: string, side: OptSide, strike: number): OptLeg => {
    const usd = quoteOption({ spot, strike, dte: 7, ivPct: 55, ratePct: 0, right: "call" }).usd;
    return {
      id,
      on: true,
      right: "call",
      side,
      qty: 1,
      strike,
      dte: 7,
      iv: 55,
      premium: usd,
      name: `SYN-${setup.asset}-7d-${strike}-C`,
      expiry: "7d (Woche)",
      priceMode: "mark",
    };
  };
  const short = make("spread-short", "sell", shortK);
  const wing = make("spread-long", "buy", longK);
  const hedgeAt = bars.dd != null && bars.dd > 0 ? bars.dd : shortK;
  const per = optionsPnlUsd([{ ...short, qty: 1 }, { ...wing, qty: 1 }], hedgeAt, 0, 0, 0, spot);
  const fee = Math.max(0, setup.fee);
  const qty = per > 0.5 ? Math.min(1_000_000, Math.max(0.01, Math.ceil((fee / per) * 100 - 1e-8) / 100)) : 1;
  return [{ ...short, qty }, { ...wing, qty }];
}

/** Ceil every active qty so the expiry PnL at the DD barrier is at least `target`. */
export function scaleBookToTarget(legs: OptLeg[], setup: PropSetup, target: number): { legs: OptLeg[]; note: string } {
  const bars = barriers(setup);
  if (bars.dd == null || !(target > 0) || !(setup.index > 0)) return { legs, note: "Keine DD-Barrier oder kein Ziel." };
  const at = (rows: OptLeg[]) => optionsPnlUsd(rows, bars.dd as number, 10_000, 0, 0, setup.index);
  const pnl = at(legs);
  if (!(pnl > 0.05)) return { legs, note: "Am Breach bei Verfall kein positiver Options-Gewinn." };
  const factor = target / pnl;
  let next = legs.map((row) => row.on && row.qty > 0 ? { ...row, qty: Math.min(1_000_000, Math.ceil(row.qty * factor * 10 - 1e-8) / 10) } : row);
  let guard = 0;
  while (at(next) < target - 0.01 && guard < 30) {
    next = next.map((row) => row.on && row.qty > 0 ? { ...row, qty: Math.round((row.qty + 0.1) * 10) / 10 } : row);
    guard += 1;
  }
  return { legs: next, note: "" };
}
export function sizeSpreadToFee(legs: OptLeg[], setup: PropSetup): OptLeg[] {
  const calls = legs.filter((row) => row.on && row.right === "call" && (row.side === "sell" || row.side === "buy"));
  if (calls.length < 2) return legs;
  const bars = barriers(setup);
  if (bars.dd == null || !(setup.fee > 0) || !(setup.index > 0)) return legs;
  const per = optionsPnlUsd(legs.map((row) => ({ ...row, qty: row.on && row.right === "call" ? 1 : row.qty })), bars.dd, 0, 0, 0, setup.index);
  if (!(per > 0.5)) return legs;
  const qty = Math.min(1_000_000, Math.max(0.01, Math.ceil((setup.fee / per) * 100 - 1e-8) / 100));
  const ids = new Set(calls.map((row) => row.id));
  return legs.map((row) => (ids.has(row.id) ? { ...row, qty } : row));
}

export function horizonDays(legs: OptLeg[]): number {
  const live = legs.filter((row) => row.on && row.dte > 0);
  if (!live.length) return 1;
  return Math.max(...live.map((row) => row.dte));
}

export type Sample = { price: number; now: number; expiry: number };

export function sampleOptions(
  legs: OptLeg[],
  index: number,
  elapsed: number,
  volShift: number,
  rateShift: number,
  min: number,
  max: number,
  count: number,
  marks: number[] = [],
): Sample[] {
  const n = Math.max(2, count);
  const prices = new Set<number>();
  for (let i = 0; i < n; i += 1) prices.add(min + ((max - min) * i) / (n - 1));
  for (const mark of marks) {
    if (mark > min && mark < max) prices.add(mark);
  }
  return [...prices].sort((a, b) => a - b).map((price) => ({
    price,
    now: optionsPnlUsd(legs, price, elapsed, volShift, rateShift, index),
    expiry: optionsPnlUsd(legs, price, 10_000, 0, 0, index),
  }));
}
