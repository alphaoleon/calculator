import type { Leg, Quote } from "@/lib/types";
import { solveCrossings, valueBook } from "@/lib/pricing";

const DAY_MS = 86_400_000;

export const IV_ROWS = [-20, -10, 0, 10, 20] as const;
export const SPOT_K = [-2, -1, -0.5, 0, 0.5, 1, 2] as const;

export type MatrixCell = {
  pnl: number;
  /** P&L / max risk, in percent. Null when risk is unbounded or ~0. */
  pct: number | null;
};

export type GreekPoint = {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
};

export type PositionAnalytics = {
  index: number;
  ivPct: number;
  /** Days used for σ. At least 1. */
  days: number;
  sigmaPct: number;
  sigmaUsd: number;
  /** Positive = premium paid, negative = premium received. */
  entryDebit: number;
  /** Positive loss. Null when the upside wing is still open. */
  maxRisk: number | null;
  /** Positive gain. Null when the upside wing is still open. */
  maxReturn: number | null;
  /** maxReturn / maxRisk. Null when either side is unbounded or there is no risk. */
  returnOnRisk: number | null;
  breakevens: number[];
  spotPrices: number[];
  matrixNow: MatrixCell[][];
  matrixExpiry: MatrixCell[][];
  greeks: GreekPoint[];
  spot: { delta: number; gamma: number; theta: number; vega: number };
};

export function subjectLegs(legs: Leg[], preview: Leg | null): Leg[] {
  if (legs.length > 0) return legs;
  return preview ? [preview] : [];
}

function legIv(leg: Leg, quotes: Record<string, Quote>): number {
  if (leg.kind !== "option") return 0;
  const quoted = quotes[leg.instrument]?.iv;
  if (quoted != null && quoted > 0) return quoted;
  return leg.iv > 0 ? leg.iv : 0;
}

function bookIv(legs: Leg[], quotes: Record<string, Quote>, dvol: number | null): number {
  let weight = 0;
  let sum = 0;
  for (const leg of legs) {
    const iv = legIv(leg, quotes);
    if (!(iv > 0)) continue;
    const w = Math.abs(leg.size) * (leg.contractSize > 0 ? leg.contractSize : 1);
    sum += iv * w;
    weight += w;
  }
  if (weight > 0) return sum / weight;
  if (dvol != null && dvol > 0) return dvol;
  return 50;
}

function horizonDays(legs: Leg[], now: number): number {
  let nearest = Infinity;
  for (const leg of legs) {
    if (leg.kind !== "option" || leg.expiry == null) continue;
    const days = (leg.expiry - now) / DAY_MS;
    if (days > 0) nearest = Math.min(nearest, days);
  }
  return Number.isFinite(nearest) ? nearest : 1;
}

function premiumUsd(leg: Leg, index: number): number {
  if (leg.kind !== "option") return 0;
  if (leg.linear) {
    const coins = leg.size * (leg.contractSize > 0 ? leg.contractSize : 1);
    return coins * leg.entry;
  }
  if (!(index > 0)) return 0;
  return leg.size * leg.entry * index;
}

function expiryPnl(
  legs: Leg[],
  quotes: Record<string, Quote>,
  index: number,
  now: number,
  price: number,
): number {
  return valueBook(legs, {
    indexNow: index,
    indexSim: price,
    now,
    quotes,
    daysForward: 0,
    ivShift: 0,
    atExpiry: true,
  }).totals.pnlUsd;
}

function scanExpiry(
  legs: Leg[],
  quotes: Record<string, Quote>,
  index: number,
  now: number,
): { points: { price: number; pnl: number }[]; maxRisk: number | null; maxReturn: number | null; breakevens: number[] } {
  const prices = new Set<number>();
  const floor = Math.max(index * 0.002, 0.01);
  const ceil = index * 2.5;
  const steps = 96;
  for (let i = 0; i <= steps; i++) prices.add(floor + ((ceil - floor) * i) / steps);
  prices.add(index);
  for (const leg of legs) {
    if (leg.strike && leg.strike > 0) prices.add(leg.strike);
  }
  const points = [...prices]
    .filter((price) => price > 0)
    .sort((a, b) => a - b)
    .map((price) => ({ price, pnl: expiryPnl(legs, quotes, index, now, price) }));

  let min = 0;
  let max = 0;
  for (const point of points) {
    if (!Number.isFinite(point.pnl)) continue;
    min = Math.min(min, point.pnl);
    max = Math.max(max, point.pnl);
  }

  const last = points[points.length - 1];
  const prev = [...points].reverse().find((point) => last && last.price - point.price > index * 0.02);
  let maxRisk: number | null = Math.max(0, -min);
  let maxReturn: number | null = Math.max(0, max);
  if (last && prev && last.price > prev.price) {
    const slope = (last.pnl - prev.pnl) / (last.price - prev.price);
    const projected = slope * index;
    const scale = Math.max(1, Math.abs(max), Math.abs(min));
    if (projected > scale * 0.01) maxReturn = null;
    if (projected < -scale * 0.01) maxRisk = null;
  }

  const strikes = legs.flatMap((leg) => (leg.strike && leg.strike > 0 ? [leg.strike] : []));
  const breakevens = solveCrossings(
    floor,
    ceil,
    (price) => expiryPnl(legs, quotes, index, now, price),
    strikes,
  ).slice(0, 4);

  return { points, maxRisk, maxReturn, breakevens };
}

function scenarioPnl(
  legs: Leg[],
  quotes: Record<string, Quote>,
  index: number,
  now: number,
  price: number,
  ivShift: number,
  atExpiry: boolean,
): number {
  return valueBook(legs, {
    indexNow: index,
    indexSim: Math.max(price, 0.01),
    now,
    quotes,
    daysForward: 0,
    ivShift: atExpiry ? 0 : ivShift,
    atExpiry,
  }).totals.pnlUsd;
}

function buildMatrix(
  legs: Leg[],
  quotes: Record<string, Quote>,
  index: number,
  now: number,
  spotPrices: number[],
  atExpiry: boolean,
  maxRisk: number | null,
): MatrixCell[][] {
  const risk = maxRisk != null && maxRisk >= 0.5 ? maxRisk : null;
  return IV_ROWS.map((shift) =>
    spotPrices.map((price) => {
      const pnl = scenarioPnl(legs, quotes, index, now, price, shift, atExpiry);
      return { pnl, pct: risk ? (pnl / risk) * 100 : null };
    }),
  );
}

export function analyzePosition(args: {
  legs: Leg[];
  preview: Leg | null;
  quotes: Record<string, Quote>;
  index: number;
  now: number;
  dvol: number | null;
}): PositionAnalytics | null {
  const legs = subjectLegs(args.legs, args.preview);
  const { index, quotes, now } = args;
  if (!(index > 0) || legs.length === 0) return null;

  const ivPct = bookIv(legs, quotes, args.dvol);
  const rawDays = horizonDays(legs, now);
  const days = Math.max(rawDays, 1);
  const sigmaPct = ivPct * Math.sqrt(days / 365);
  const sigmaUsd = index * (sigmaPct / 100);
  const entryDebit = legs.reduce((sum, leg) => sum + premiumUsd(leg, index), 0);
  const scan = scanExpiry(legs, quotes, index, now);
  const returnOnRisk =
    scan.maxReturn == null
      ? null
      : scan.maxRisk != null && scan.maxRisk > 0.5
        ? scan.maxReturn / scan.maxRisk
        : null;

  const spotPrices = SPOT_K.map((k) => Math.max(index * 0.05, index + k * sigmaUsd));
  const matrixNow = buildMatrix(legs, quotes, index, now, spotPrices, false, scan.maxRisk);
  const matrixExpiry = buildMatrix(legs, quotes, index, now, spotPrices, true, scan.maxRisk);

  const greeks: GreekPoint[] = [];
  const span = 0.16;
  const n = 41;
  for (let i = 0; i < n; i++) {
    const price = i === (n - 1) / 2 ? index : index * (1 - span + (2 * span * i) / (n - 1));
    const totals = valueBook(legs, {
      indexNow: index,
      indexSim: price,
      now,
      quotes,
      daysForward: 0,
      ivShift: 0,
      atExpiry: false,
    }).totals;
    greeks.push({
      price,
      delta: totals.delta,
      gamma: totals.gamma,
      theta: totals.theta,
      vega: totals.vega,
    });
  }

  const live = valueBook(legs, {
    indexNow: index,
    indexSim: index,
    now,
    quotes,
    daysForward: 0,
    ivShift: 0,
    atExpiry: false,
  }).totals;

  return {
    index,
    ivPct,
    days,
    sigmaPct,
    sigmaUsd,
    entryDebit,
    maxRisk: scan.maxRisk,
    maxReturn: scan.maxReturn,
    returnOnRisk,
    breakevens: scan.breakevens,
    spotPrices,
    matrixNow,
    matrixExpiry,
    greeks,
    spot: { delta: live.delta, gamma: live.gamma, theta: live.theta, vega: live.vega },
  };
}

export function contractBlurb(legs: Leg[], linear: boolean, currency: string): string {
  const options = legs.filter((leg) => leg.kind === "option");
  const sample = options[0];
  const same =
    sample != null &&
    options.every((leg) => leg.contractSize === sample.contractSize && leg.linear === sample.linear);
  const unit = linear ? "USDC" : "USD";
  if (same && sample) {
    const each = sample.contractSize > 0 ? sample.contractSize : 1;
    return `1 contract = ${each} ${currency} · P&L in ${unit}`;
  }
  return `P&L in ${unit}`;
}
