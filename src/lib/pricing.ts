import type { Leg, Metric, PropAccount, Quote, Right, Unit } from "@/lib/types";
import { accountCash, breachMove, isBlown, isPassed, passMove } from "@/lib/hydra-loop";

const YEAR_MS = 365 * 86_400_000;

export type Bs = {
  coin: number;
  usd: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
};

export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/** Abramowitz-Stegun tail approximation. Matches Deribit greeks to ~1e-5. */
export function normCdf(x: number): number {
  const a1 = 0.31938153;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  const k = 1 / (1 + 0.2316419 * Math.abs(x));
  const tail = normPdf(x) * (((((a5 * k + a4) * k + a3) * k + a2) * k + a1) * k);
  return x >= 0 ? 1 - tail : tail;
}

/**
 * Inverse option on the Deribit forward.
 * Coin premium = Black-76(F) / F, r = 0. Vega is USD per 1 vol point,
 * theta is USD per day, gamma is per $1, delta is dimensionless.
 */
export function priceOption(args: {
  forward: number;
  strike: number;
  tYears: number;
  sigma: number;
  right: Right;
}): Bs {
  const { forward: F, strike: K, tYears: T, sigma, right } = args;
  const call = right === "call";
  const zero: Bs = { coin: 0, usd: 0, delta: 0, gamma: 0, vega: 0, theta: 0 };
  if (!(F > 0) || !(K > 0)) return zero;

  if (!(T > 1e-8) || !(sigma > 1e-6)) {
    const usd = call ? Math.max(F - K, 0) : Math.max(K - F, 0);
    const atm = Math.abs(F - K) / F < 1e-6;
    const delta = atm ? (call ? 0.5 : -0.5) : usd === 0 ? 0 : call ? 1 : -1;
    return { coin: usd / F, usd, delta, gamma: 0, vega: 0, theta: 0 };
  }

  const vol = sigma * Math.sqrt(T);
  const d1 = (Math.log(F / K) + 0.5 * sigma * sigma * T) / vol;
  const d2 = d1 - vol;
  const nd1 = normCdf(d1);
  const pdf = normPdf(d1);
  const usd = call ? F * nd1 - K * normCdf(d2) : K * normCdf(-d2) - F * normCdf(-d1);
  const delta = call ? nd1 : nd1 - 1;
  const gamma = pdf / (F * sigma * Math.sqrt(T));
  const vega = F * pdf * Math.sqrt(T) * 0.01;
  const theta = (-F * pdf * sigma) / (2 * Math.sqrt(T)) / 365;
  return { coin: usd / F, usd, delta, gamma, vega, theta };
}

/** Black-76 delta for one strike, matching the Deribit greek (calls 0…1, puts −1…0). */
export function optionDelta(args: {
  forward: number;
  strike: number;
  expiry: number;
  now: number;
  ivPct: number;
  right: Right;
}): number | null {
  if (!(args.forward > 0) || !(args.strike > 0) || !(args.ivPct > 0)) return null;
  const tYears = Math.max(0, args.expiry - args.now) / YEAR_MS;
  return priceOption({
    forward: args.forward,
    strike: args.strike,
    tYears,
    sigma: args.ivPct / 100,
    right: args.right,
  }).delta;
}

export function futurePnlCoin(notionalUsd: number, entry: number, mark: number): number {
  if (!(entry > 0) || !(mark > 0) || !Number.isFinite(notionalUsd)) return 0;
  return notionalUsd * (1 / entry - 1 / mark);
}

export type Scenario = {
  indexNow: number;
  indexSim: number;
  now: number;
  daysForward: number;
  ivShift: number;
  quotes: Record<string, Quote>;
  atExpiry: boolean;
};

export type LegValue = {
  instrument: string;
  mark: number;
  iv: number | null;
  pnlCoin: number;
  pnlUsd: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  im: number;
  mm: number;
};

export type Totals = {
  pnlCoin: number;
  pnlUsd: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  im: number;
  mm: number;
};

function scaledForward(base: number, indexNow: number, indexSim: number): number {
  if (!(base > 0)) return indexSim;
  if (!(indexNow > 0)) return base;
  return base * (indexSim / indexNow);
}

/** Flat standard-margin sketch. Not Deribit portfolio margin. */
export function estimateMargin(
  leg: Leg,
  markCoinOrUsd: number,
  forward: number,
  expiredFutureMark?: number,
): { im: number; mm: number } {
  if (leg.kind === "option" && leg.right && leg.strike && forward > 0) {
    if (leg.size >= 0) return { im: 0, mm: 0 };
    const otm =
      leg.right === "call"
        ? Math.max(leg.strike - forward, 0)
        : Math.max(forward - leg.strike, 0);
    const frac = otm / forward;
    const abs = Math.abs(leg.size);
    return {
      im: (Math.max(0.15 - frac, 0.1) + Math.max(markCoinOrUsd, 0)) * abs,
      mm: (Math.max(0.075 - frac, 0.05) + Math.max(markCoinOrUsd, 0)) * abs,
    };
  }
  const mark = expiredFutureMark && expiredFutureMark > 0 ? expiredFutureMark : markCoinOrUsd;
  if (!(mark > 0)) return { im: 0, mm: 0 };
  const coin = Math.abs(leg.size * leg.contractSize) / mark;
  return { im: coin * 0.02, mm: coin * 0.01 };
}

export function valueLeg(leg: Leg, sc: Scenario): LegValue {
  const quote = sc.quotes[leg.instrument];
  const empty: LegValue = {
    instrument: leg.instrument,
    mark: leg.entry,
    iv: null,
    pnlCoin: 0,
    pnlUsd: 0,
    delta: 0,
    gamma: 0,
    vega: 0,
    theta: 0,
    im: 0,
    mm: 0,
  };
  if (!(sc.indexSim > 0)) return empty;

  if (leg.kind === "future") {
    const live = quote?.mark && quote.mark > 0 ? quote.mark : leg.entry;
    const elapsed = sc.now + sc.daysForward * 86_400_000;
    const expired = sc.atExpiry || (!leg.perpetual && leg.expiry != null && leg.expiry <= elapsed);
    const mark = expired ? sc.indexSim : scaledForward(live, sc.indexNow, sc.indexSim);
    if (leg.linear) {
      const coins = leg.size;
      const pnlUsd = coins * (mark - leg.entry);
      const pnlCoin = pnlUsd / sc.indexSim;
      const abs = Math.abs(coins);
      return {
        instrument: leg.instrument,
        mark,
        iv: null,
        pnlCoin,
        pnlUsd,
        delta: coins,
        gamma: 0,
        vega: 0,
        theta: 0,
        im: abs * 0.02,
        mm: abs * 0.01,
      };
    }
    const notional = leg.size * leg.contractSize;
    const pnlCoin = futurePnlCoin(notional, leg.entry, mark);
    const delta = mark > 0 ? notional / mark : 0;
    const gamma = mark > 0 ? -notional / (mark * mark) : 0;
    const margin = estimateMargin(leg, mark, mark, mark);
    return {
      instrument: leg.instrument,
      mark,
      iv: null,
      pnlCoin,
      pnlUsd: pnlCoin * sc.indexSim,
      delta,
      gamma,
      vega: 0,
      theta: 0,
      im: margin.im,
      mm: margin.mm,
    };
  }

  if (!leg.right || !(leg.strike && leg.strike > 0) || leg.expiry == null) return empty;
  const ivPct = (quote?.iv ?? leg.iv) + (sc.atExpiry ? 0 : sc.ivShift);
  const sigma = Math.max(ivPct, 0) / 100;
  const baseF = quote?.underlying && quote.underlying > 0 ? quote.underlying : leg.forward || sc.indexNow;
  const elapsed = sc.now + (sc.atExpiry ? 0 : sc.daysForward * 86_400_000);
  const remain = sc.atExpiry ? 0 : leg.expiry - elapsed;
  const expired = remain <= 0;
  const F = expired ? sc.indexSim : scaledForward(baseF, sc.indexNow, sc.indexSim);
  const T = expired ? 0 : remain / YEAR_MS;
  const priced = priceOption({
    forward: F,
    strike: leg.strike,
    tYears: T,
    sigma: expired ? 0 : sigma,
    right: leg.right,
  });
  if (leg.linear) {
    const coins = leg.size * (leg.contractSize > 0 ? leg.contractSize : 1);
    const pnlUsd = coins * (priced.usd - leg.entry);
    const margin = estimateMargin(
      { ...leg, size: coins, contractSize: 1 },
      priced.coin,
      F,
    );
    return {
      instrument: leg.instrument,
      mark: priced.usd,
      iv: expired ? 0 : Math.max(ivPct, 0),
      pnlCoin: pnlUsd / sc.indexSim,
      pnlUsd,
      delta: priced.delta * coins,
      gamma: priced.gamma * coins,
      vega: priced.vega * coins,
      theta: priced.theta * coins,
      im: margin.im,
      mm: margin.mm,
    };
  }
  const pnlCoin = leg.size * (priced.coin - leg.entry);
  const margin = estimateMargin(leg, priced.coin, F);
  return {
    instrument: leg.instrument,
    mark: priced.coin,
    iv: expired ? 0 : Math.max(ivPct, 0),
    pnlCoin,
    pnlUsd: pnlCoin * sc.indexSim,
    delta: priced.delta * leg.size,
    gamma: priced.gamma * leg.size,
    vega: priced.vega * leg.size,
    theta: priced.theta * leg.size,
    im: margin.im,
    mm: margin.mm,
  };
}

export function valueBook(legs: Leg[], sc: Scenario): { rows: LegValue[]; totals: Totals } {
  const rows = legs.map((leg) => valueLeg(leg, sc));
  const totals: Totals = {
    pnlCoin: 0,
    pnlUsd: 0,
    delta: 0,
    gamma: 0,
    vega: 0,
    theta: 0,
    im: 0,
    mm: 0,
  };
  for (const row of rows) {
    totals.pnlCoin += row.pnlCoin;
    totals.pnlUsd += row.pnlUsd;
    totals.delta += row.delta;
    totals.gamma += row.gamma;
    totals.vega += row.vega;
    totals.theta += row.theta;
    totals.im += row.im;
    totals.mm += row.mm;
  }
  return { rows, totals };
}

export type CurvePoint = {
  price: number;
  sim: number;
  expiry: number;
  prop: number | null;
  /** Expiry payoff of the strike currently selected in the ticket, if bought. */
  preview: number | null;
  /** Same metric, one third of the way to the longest expiry. */
  early: number | null;
  /** Same metric, two thirds of the way to the longest expiry. */
  late: number | null;
  /** Option expiry plus checked prop accounts, same unit. Null off the P&L chart. */
  net: number | null;
};

export type PropLevels = {
  /** Price where today's daily floor is touched. */
  daily: number | null;
  /** Price where the static max-drawdown floor is touched. */
  maxDd: number | null;
  /** The floor you hit first. P&L becomes the fee from here. */
  breach: number | null;
  /** Challenge pass price. Null on funded accounts. */
  pass: number | null;
};

function barrierPrice(entry: number, floor: number, balance: number, size: number): number | null {
  if (!(floor > 0) || size === 0 || !(entry > 0)) return null;
  const price = entry + (floor - balance) / size;
  return price > 0 ? price : null;
}

export function propLevels(account: PropAccount): PropLevels {
  const empty: PropLevels = { daily: null, maxDd: null, breach: null, pass: null };
  if (!(account.entry > 0)) return empty;
  const daily = account.size !== 0
    ? barrierPrice(account.entry, account.dailyLimit, account.balance, account.size)
    : null;
  const breachMoveValue = breachMove(account);
  const maxDd = breachMoveValue == null ? null : account.entry * (1 + breachMoveValue);
  const maxDdPrice = maxDd != null && maxDd > 0 ? maxDd : null;
  const long = account.positionUsd !== 0 ? account.positionUsd > 0 : account.size > 0;
  const floors = [daily, maxDdPrice].filter((price): price is number => price != null);
  const breach = floors.length === 0 ? null : long ? Math.max(...floors) : Math.min(...floors);
  const passMoveValue = passMove(account);
  const passRaw = passMoveValue == null ? null : account.entry * (1 + passMoveValue);
  const pass = passRaw != null && passRaw > 0 ? passRaw : null;
  return { daily, maxDd: maxDdPrice, breach, pass };
}

/**
 * Trader cash in USD.
 * A challenge that hits daily or max DD is worth the fee only (−cost).
 * Reaching the profit target pays no split — the eval becomes a funded account.
 * A funded account pays the split of profit after the round-trip fee.
 */
export function propPnlAt(account: PropAccount, price: number): number {
  return accountCash(account, price);
}

export function propOutcome(
  account: PropAccount,
  price: number,
): "blown" | "passed" | "challenge" | "funded" {
  if (isBlown(account, price)) return "blown";
  if (isPassed(account, price)) return "passed";
  return account.phase;
}

export function metricValue(totals: Totals, metric: Metric, unit: Unit): number {
  if (metric === "pnl") return unit === "usd" ? totals.pnlUsd : totals.pnlCoin;
  if (metric === "delta") return totals.delta;
  if (metric === "gamma") return totals.gamma;
  if (metric === "vega") return totals.vega;
  return totals.theta;
}

export function buildCurve(args: {
  legs: Leg[];
  quotes: Record<string, Quote>;
  indexNow: number;
  now: number;
  daysForward: number;
  ivShift: number;
  metric: Metric;
  unit: Unit;
  span: number;
  points?: number;
  anchors?: number[];
  props?: PropAccount[];
  preview?: Leg | null;
  /** Days forward for the faint time slices. 0 skips that line. */
  earlyDays?: number;
  lateDays?: number;
  /** Extra prices to sample, such as solved breakevens. Kept inside the window. */
  samples?: number[];
}): CurvePoint[] {
  const { legs, quotes, indexNow, now, daysForward, ivShift, metric, unit, span } = args;
  if (!(indexNow > 0)) return [];
  const n = args.points ?? 97;
  let lo = indexNow * (1 - span);
  let hi = indexNow * (1 + span);
  const ranged = args.preview ? [...legs, args.preview] : legs;
  for (const leg of ranged) {
    if (leg.strike && leg.strike > 0) {
      lo = Math.min(lo, leg.strike * 0.94);
      hi = Math.max(hi, leg.strike * 1.06);
    }
  }
  lo = Math.max(1, Math.min(lo, indexNow * 0.98));
  hi = Math.max(hi, indexNow * 1.02);
  const strikes: number[] = [];
  for (const leg of ranged) {
    if (leg.strike && leg.strike > 0) strikes.push(leg.strike);
  }
  const pins: number[] = [];
  for (const price of args.anchors ?? []) {
    if (!(price > 0)) continue;
    if (price < indexNow * 0.45 || price > indexNow * 2.2) continue;
    lo = Math.min(lo, price * 0.992);
    hi = Math.max(hi, price * 1.008);
    pins.push(price);
  }
  const active = (args.props ?? []).filter((account) => account.enabled && account.size !== 0);
  const showProp = metric === "pnl" && active.length > 0;
  const earlyDays = args.earlyDays && args.earlyDays > 0 ? args.earlyDays : 0;
  const lateDays = args.lateDays && args.lateDays > 0 ? args.lateDays : 0;
  for (const price of args.samples ?? []) {
    if (!(price > 0)) continue;
    if (price < indexNow * 0.25 || price > indexNow * 3) continue;
    lo = Math.min(lo, price * 0.985);
    hi = Math.max(hi, price * 1.015);
  }
  const prices = new Set<number>();
  for (let i = 0; i < n; i++) prices.add(lo + ((hi - lo) * i) / (n - 1));
  for (const strike of strikes) {
    if (strike > lo && strike < hi) prices.add(strike);
  }
  const eps = Math.max((hi - lo) * 0.00035, 0.01);
  for (const price of pins) {
    if (!(price > lo && price < hi)) continue;
    prices.add(price);
    if (price - eps > lo) prices.add(price - eps);
    if (price + eps < hi) prices.add(price + eps);
  }
  for (const price of args.samples ?? []) {
    if (price > lo && price < hi) prices.add(price);
  }
  const out: CurvePoint[] = [];
  for (const price of [...prices].sort((a, b) => a - b)) {
    const base = {
      indexNow,
      indexSim: price,
      now,
      quotes,
      daysForward: 0,
      ivShift: 0,
    };
    const sim = valueBook(legs, {
      ...base,
      daysForward,
      ivShift,
      atExpiry: false,
    }).totals;
    const expiry = valueBook(legs, { ...base, atExpiry: true }).totals;
    const early = earlyDays
      ? valueBook(legs, { ...base, daysForward: earlyDays, ivShift, atExpiry: false }).totals
      : null;
    const late = lateDays
      ? valueBook(legs, { ...base, daysForward: lateDays, ivShift, atExpiry: false }).totals
      : null;
    const previewBook = args.preview ? valueBook([args.preview], { ...base, atExpiry: true }).totals : null;
    const usd = showProp
      ? active.reduce((sum, account) => sum + propPnlAt(account, price), 0)
      : 0;
    const prop = showProp ? (unit === "usd" ? usd : usd / price) : null;
    const expiryValue = metricValue(expiry, metric, unit);
    out.push({
      price,
      sim: metricValue(sim, metric, unit),
      expiry: expiryValue,
      prop,
      net: metric === "pnl" ? expiryValue + (prop ?? 0) : null,
      preview: previewBook ? metricValue(previewBook, metric, unit) : null,
      early: early ? metricValue(early, metric, unit) : null,
      late: late ? metricValue(late, metric, unit) : null,
    });
  }
  return out;
}

export function breakevens(points: CurvePoint[]): number[] {
  const found: number[] = [];
  const push = (price: number) => {
    if (found.some((kept) => Math.abs(kept - price) <= Math.max(price, 1) * 0.0015)) return;
    found.push(price);
  };
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point || !Number.isFinite(point.expiry)) continue;
    if (point.expiry === 0) push(point.price);
  }
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    if (!Number.isFinite(a.expiry) || !Number.isFinite(b.expiry)) continue;
    if (a.expiry === 0 || b.expiry === 0) continue;
    if ((a.expiry > 0 && b.expiry < 0) || (a.expiry < 0 && b.expiry > 0)) {
      const t = a.expiry / (a.expiry - b.expiry);
      push(a.price + t * (b.price - a.price));
    }
  }
  return found.slice(0, 6);
}

/**
 * Prices where valueAt crosses zero. Smooth brackets are bisected.
 * A cliff (prop breach) uses the straight segment the chart actually draws.
 */
export function solveCrossings(
  lo: number,
  hi: number,
  valueAt: (price: number) => number,
  pins: number[] = [],
): number[] {
  if (!(hi > lo) || !(lo > 0)) return [];
  const raw: number[] = [];
  const steps = 96;
  for (let i = 0; i <= steps; i++) raw.push(lo + ((hi - lo) * i) / steps);
  for (const pin of pins) {
    if (pin > lo && pin < hi) raw.push(pin);
  }
  raw.sort((a, b) => a - b);
  const grid: number[] = [];
  for (const price of raw) {
    if (!grid.length || price - grid[grid.length - 1]! > (hi - lo) * 1e-6) grid.push(price);
  }
  const ys = grid.map((price) => valueAt(price));
  let scale = 0;
  for (const y of ys) {
    if (Number.isFinite(y)) scale = Math.max(scale, Math.abs(y));
  }
  if (!(scale > 1e-8)) return [];
  const tol = Math.max(scale * 1e-5, 1e-6);
  const found: number[] = [];
  const push = (price: number) => {
    if (!Number.isFinite(price) || !(price > 0)) return;
    if (found.some((kept) => Math.abs(kept - price) <= Math.max(price, 1) * 0.0015)) return;
    found.push(price);
  };
  for (let i = 0; i < grid.length; i++) {
    const y = ys[i];
    const price = grid[i];
    if (y == null || price == null || !Number.isFinite(y)) continue;
    if (Math.abs(y) <= tol) push(price);
  }
  for (let i = 1; i < grid.length; i++) {
    const y0 = ys[i - 1];
    const y1 = ys[i];
    const x0 = grid[i - 1];
    const x1 = grid[i];
    if (y0 == null || y1 == null || x0 == null || x1 == null) continue;
    if (!Number.isFinite(y0) || !Number.isFinite(y1)) continue;
    if (Math.abs(y0) <= tol || Math.abs(y1) <= tol) continue;
    if (!((y0 > 0 && y1 < 0) || (y0 < 0 && y1 > 0))) continue;
    const width = x1 - x0;
    const cliff = width / x1 < 0.004 && Math.abs(y0 - y1) > scale * 0.25;
    if (cliff) {
      const t = y0 / (y0 - y1);
      push(x0 + t * width);
      continue;
    }
    let a = x0;
    let b = x1;
    let fa = y0;
    let mid = (a + b) / 2;
    for (let k = 0; k < 28; k++) {
      mid = (a + b) / 2;
      const fm = valueAt(mid);
      if (!Number.isFinite(fm) || Math.abs(fm) <= tol) {
        a = b = mid;
        break;
      }
      if ((fa > 0 && fm > 0) || (fa < 0 && fm < 0)) {
        a = mid;
        fa = fm;
      } else {
        b = mid;
      }
    }
    push((a + b) / 2);
  }
  return found.slice(0, 6);
}

export function maxForwardDays(legs: Leg[], now: number): number {
  let max = 0;
  for (const leg of legs) {
    if (leg.perpetual || leg.expiry == null) continue;
    max = Math.max(max, (leg.expiry - now) / 86_400_000);
  }
  return max > 0 ? max : 0;
}
