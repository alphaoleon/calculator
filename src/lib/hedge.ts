export const HEDGE_STORAGE_KEY = "position-builder.hedge.v2";

export type HedgeMode = "optimal" | "manual";

export type HedgeInputs = {
  evalSize: number;
  evalPrice: number;
  numEvals: number;
  evalLeverage: number;
  fundedSize: number;
  numFunded: number;
  mode: HedgeMode;
  manualNotional: number;
  targetPct: number;
  ddPct: number;
  splitPct: number;
};

export const HEDGE_DEFAULTS: HedgeInputs = {
  evalSize: 25000,
  evalPrice: 95,
  numEvals: 2,
  evalLeverage: 3,
  fundedSize: 25000,
  numFunded: 1,
  mode: "optimal",
  manualNotional: 23750,
  targetPct: 9,
  ddPct: 3,
  splitPct: 80,
};

const NUMBER_KEYS = [
  "evalSize",
  "evalPrice",
  "numEvals",
  "evalLeverage",
  "fundedSize",
  "numFunded",
  "manualNotional",
  "targetPct",
  "ddPct",
  "splitPct",
] as const;

export function sanitizeHedge(raw: unknown): HedgeInputs {
  if (!raw || typeof raw !== "object") return { ...HEDGE_DEFAULTS };
  const src = raw as Partial<HedgeInputs>;
  const next = { ...HEDGE_DEFAULTS };
  for (const key of NUMBER_KEYS) {
    const value = src[key];
    if (typeof value === "number" && Number.isFinite(value)) next[key] = value;
  }
  if (src.mode === "manual" || src.mode === "optimal") next.mode = src.mode;
  return next;
}

export type HedgeWarning = "funded-dies" | "dd-tight" | "tiny-move" | "fail-short";

export type HedgePlan = {
  mode: HedgeMode;
  numEvals: number;
  numFunded: number;
  evalSize: number;
  fundedSize: number;
  evalNotional: number;
  cNotional: number;
  evalLeverage: number;
  /** Price rise, in percent, that spends the eval drawdown. */
  adverseMovePct: number;
  /** Price drop, in percent, that hits the eval profit target. */
  favorableMovePct: number;
  fundedNotionalPer: number;
  fNotional: number;
  fundedLeverage: number;
  totalCost: number;
  fundedGrossAtFail: number;
  payoutAtFail: number;
  netFail: number;
  fundedLossAtPass: number;
  totalDDRoom: number;
  /** Pass-loss as percent of funded equity, same definition as the clone calculator. */
  ddUsagePct: number;
  ddLimitPct: number;
  fundedSurvives: boolean;
  pPass: number;
  pFail: number;
  split: number;
  targetPct: number;
  warnings: HedgeWarning[];
};

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Eval accounts are short, funded accounts are long.
 * Fail move = drawdown / eval leverage. Pass move = target / eval leverage.
 * Optimal funded notional makes the fail payout equal the eval fees.
 */
export function optimizeHedge(raw: HedgeInputs): HedgePlan {
  const numEvals = Math.max(1, Math.round(finite(raw.numEvals, 1)));
  const evalSize = Math.max(0, finite(raw.evalSize, 0));
  const evalPrice = Math.max(0, finite(raw.evalPrice, 0));
  const evalLeverage = Math.max(0.1, finite(raw.evalLeverage, 1));
  const fundedSize = Math.max(0, finite(raw.fundedSize, 0));
  const numFunded = Math.max(1, Math.round(finite(raw.numFunded, 1)));
  const targetPct = Math.max(0, finite(raw.targetPct, 0));
  const ddPct = Math.max(0, finite(raw.ddPct, 0));
  const split = Math.min(1, Math.max(0.01, finite(raw.splitPct, 80) / 100));
  const mode: HedgeMode = raw.mode === "manual" ? "manual" : "optimal";

  const totalCost = numEvals * evalPrice;
  const evalNotional = evalSize * evalLeverage;
  const cNotional = evalNotional * numEvals;
  const adverse = ddPct / 100 / evalLeverage;
  const favorable = targetPct / 100 / evalLeverage;

  let fNotional: number;
  if (mode === "optimal") {
    const denom = adverse * split;
    fNotional = denom > 0 ? totalCost / denom : 0;
  } else {
    fNotional = Math.max(0, finite(raw.manualNotional, 0)) * numFunded;
  }
  const fundedNotionalPer = fNotional / numFunded;
  const fundedLeverage = fundedSize > 0 ? fundedNotionalPer / fundedSize : 0;

  const fundedGrossAtFail = fNotional * adverse;
  const payoutAtFail = fundedGrossAtFail * split;
  const netFail = payoutAtFail - totalCost;
  const fundedLossAtPass = fNotional * favorable;
  const totalDDRoom = numFunded * fundedSize * (ddPct / 100);
  const equity = numFunded * fundedSize;
  const ddUsagePct = equity > 0 ? (fundedLossAtPass / equity) * 100 : 0;
  const fundedSurvives = ddUsagePct < ddPct;

  const span = favorable + adverse;
  const pPass = span > 0 ? adverse / span : 0;

  const warnings: HedgeWarning[] = [];
  if (!fundedSurvives) warnings.push("funded-dies");
  else if (ddPct > 0 && ddUsagePct > ddPct * 0.8) warnings.push("dd-tight");
  if (adverse * 100 < 0.4) warnings.push("tiny-move");
  if (mode === "manual" && netFail < -1) warnings.push("fail-short");

  return {
    mode,
    numEvals,
    numFunded,
    evalSize,
    fundedSize,
    evalNotional,
    cNotional,
    evalLeverage,
    adverseMovePct: adverse * 100,
    favorableMovePct: favorable * 100,
    fundedNotionalPer,
    fNotional,
    fundedLeverage,
    totalCost,
    fundedGrossAtFail,
    payoutAtFail,
    netFail,
    fundedLossAtPass,
    totalDDRoom,
    ddUsagePct,
    ddLimitPct: ddPct,
    fundedSurvives,
    pPass,
    pFail: 1 - pPass,
    split,
    targetPct,
    warnings,
  };
}

export type HedgeCurvePoint = {
  /** Signed percent. Positive is the market up — evals are short, so that is the fail side. */
  move: number;
  challenge: number;
  funded: number;
  net: number;
  trader: number;
};

/** Account P&L across the move. Trader cash on the way up is the funded split minus the eval fees. */
export function hedgeCurve(plan: HedgePlan): HedgeCurvePoint[] {
  const span = Math.min(12, Math.max(plan.adverseMovePct, plan.favorableMovePct, 0.8) * 2.2);
  const n = 81;
  const moves = new Set<number>();
  for (let i = 0; i < n; i++) {
    moves.add(Math.round((-span + (2 * span * i) / (n - 1)) * 1000) / 1000);
  }
  for (const anchor of [-plan.favorableMovePct, 0, plan.adverseMovePct]) {
    if (Math.abs(anchor) <= span + 0.05) moves.add(Math.round(anchor * 1000) / 1000);
  }
  return [...moves].sort((a, b) => a - b).map((move) => {
    const x = move / 100;
    const challenge = -plan.cNotional * x;
    const funded = plan.fNotional * x;
    const trader = move >= 0 ? funded * plan.split - plan.totalCost : challenge + funded;
    return { move, challenge, funded, net: challenge + funded, trader };
  });
}
