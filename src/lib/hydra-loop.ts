import type { PropAccount } from "@/lib/types";
import { fuzzNotional } from "@/lib/firms";

export const ACCOUNT_SIZES = [5_000, 10_000, 25_000, 50_000, 100_000] as const;
export type AccountSize = (typeof ACCOUNT_SIZES)[number];

export const EVAL_PRICES: Record<AccountSize, number> = {
  5000: 20,
  10000: 40,
  25000: 95,
  50000: 180,
  100000: 330,
};

export const FIRM_PLATFORMS = ["DXtrade", "Match-Trader", "cTrader", "TradeLocker", "Eigenes System"] as const;
export type FirmPlatform = (typeof FIRM_PLATFORMS)[number];

export type FirmPreset = {
  id: string;
  name: string;
  /** Entry fee when the order is a maker, in percent. 0.01 means 0.01%. */
  makerPct: number;
  /** Entry or exit fee when the order is a taker, in percent. */
  takerPct: number;
  /** Market round trip (2× taker). Kept so older screens still read a single rate. */
  rtPct: number;
  split: number;
  maxDdPct: number;
  targetPct: number;
  platform: FirmPlatform;
  /** Wallet and anti-detect profile, shown on the order ticket. */
  wallet: string;
  /** False for the built-in presets. Only custom firms can be deleted. */
  custom: boolean;
};

export const DEFAULT_PRESETS: FirmPreset[] = [
  { id: "breakout", name: "Breakout", makerPct: 0.035, takerPct: 0.035, rtPct: 0.07, split: 80, maxDdPct: 3, targetPct: 9, platform: "Eigenes System", wallet: "OneKey #1 · Dolphin Profil 1", custom: false },
  { id: "hypernova", name: "Hypernova", makerPct: 0.01, takerPct: 0.04, rtPct: 0.08, split: 80, maxDdPct: 3, targetPct: 9, platform: "Eigenes System", wallet: "OneKey #2 · Dolphin Profil 2", custom: false },
  { id: "cashed", name: "cashed.fun", makerPct: 0.02, takerPct: 0.05, rtPct: 0.1, split: 80, maxDdPct: 3, targetPct: 9, platform: "Eigenes System", wallet: "OneKey #3 · Dolphin Profil 3", custom: false },
  { id: "iceberg", name: "iceberg.cash", makerPct: 0.02, takerPct: 0.05, rtPct: 0.1, split: 80, maxDdPct: 3, targetPct: 9, platform: "Eigenes System", wallet: "OneKey #4 · Dolphin Profil 4", custom: false },
  { id: "propr", name: "propr", makerPct: 0.02, takerPct: 0.05, rtPct: 0.1, split: 80, maxDdPct: 3, targetPct: 9, platform: "Eigenes System", wallet: "OneKey #5 · Dolphin Profil 5", custom: false },
  { id: "bungee", name: "bungee", makerPct: 0.02, takerPct: 0.05, rtPct: 0.1, split: 80, maxDdPct: 3, targetPct: 9, platform: "Eigenes System", wallet: "OneKey #6 · Dolphin Profil 6", custom: false },
];

const PRESET_KEY = "position-builder.presets.v2";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isPlatform(value: unknown): value is FirmPlatform {
  return typeof value === "string" && (FIRM_PLATFORMS as readonly string[]).includes(value);
}

function readPreset(raw: unknown): FirmPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<FirmPreset>;
  if (typeof row.id !== "string" || !row.id.trim()) return null;
  const base = DEFAULT_PRESETS.find((item) => item.id === row.id);
  const makerPct = typeof row.makerPct === "number" && Number.isFinite(row.makerPct) ? clamp(row.makerPct, 0, 5) : (base?.makerPct ?? 0);
  const takerPct = typeof row.takerPct === "number" && Number.isFinite(row.takerPct) ? clamp(row.takerPct, 0, 5) : (base?.takerPct ?? 0);
  const name = typeof row.name === "string" && row.name.trim() ? row.name.trim().slice(0, 48) : (base?.name ?? "Prop-Firm");
  return {
    id: base ? base.id : row.id.slice(0, 64),
    name,
    makerPct,
    takerPct,
    rtPct: takerPct * 2,
    split: base?.split ?? 80,
    maxDdPct: base?.maxDdPct ?? 3,
    targetPct: base?.targetPct ?? 9,
    platform: isPlatform(row.platform) ? row.platform : (base?.platform ?? "Eigenes System"),
    wallet: typeof row.wallet === "string" && row.wallet.trim() ? row.wallet.trim().slice(0, 80) : (base?.wallet ?? ""),
    custom: !base,
  };
}

export function loadPresets(): FirmPreset[] {
  const fresh = () => DEFAULT_PRESETS.map((row) => ({ ...row }));
  if (typeof window === "undefined") return fresh();
  try {
    const raw = window.localStorage.getItem(PRESET_KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fresh();
    const saved = parsed.map(readPreset).filter((row): row is FirmPreset => row != null);
    const defaults = DEFAULT_PRESETS.map((base) => saved.find((row) => row.id === base.id) ?? { ...base });
    const custom = saved.filter((row) => row.custom && !DEFAULT_PRESETS.some((base) => base.id === row.id));
    return [...defaults, ...custom];
  } catch {
    return fresh();
  }
}

export function savePresets(presets: FirmPreset[]): void {
  window.localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}

export function priceOf(size: number): number {
  const hit = ACCOUNT_SIZES.find((item) => item === size);
  return hit != null ? EVAL_PRICES[hit] : 0;
}

/** Round-trip trading fee in USD. A normal close pays this. */
export function feeUsd(account: PropAccount): number {
  return Math.abs(account.positionUsd) * (account.rtFeePct / 100);
}

/** Opening fee only. An eval liquidation charges the entry fee and not the close. */
export function openFeeUsd(account: PropAccount): number {
  const pct = account.openFeePct == null ? account.rtFeePct / 2 : account.openFeePct;
  return Math.abs(account.positionUsd) * (pct / 100);
}

export function maxDdUsd(account: PropAccount): number {
  return Math.max(0, account.balance - account.ddLimit);
}

export function targetGap(account: PropAccount): number {
  if (account.phase !== "challenge") return 0;
  return Math.max(0, account.profitTarget - account.balance);
}

/**
 * Adverse move where equity hits max DD.
 * An eval is liquidated, so only the opening fee is in the room. A funded account
 * is closed by order and owes the full round trip.
 */
export function breachMove(account: PropAccount): number | null {
  if (!(Math.abs(account.positionUsd) > 0)) return null;
  const fee = account.phase === "challenge" ? openFeeUsd(account) : feeUsd(account);
  const room = maxDdUsd(account) - fee;
  if (room <= 0) return 0;
  return -room / account.positionUsd;
}

/** Signed move at which a challenge has earned the target plus the full round-trip fee. */
export function passMove(account: PropAccount): number | null {
  if (account.phase !== "challenge") return null;
  const need = targetGap(account) + feeUsd(account);
  if (!(Math.abs(account.positionUsd) > 0) || !(need > 0)) return null;
  return need / account.positionUsd;
}

export function withEntry(account: PropAccount, entry: number): PropAccount {
  if (!(entry > 0)) return account;
  return { ...account, entry };
}

function moveAt(account: PropAccount, price: number): number | null {
  if (!(account.entry > 0) || !(price > 0)) return null;
  return price / account.entry - 1;
}

export function isBlown(account: PropAccount, price: number): boolean {
  const move = moveAt(account, price);
  const breach = breachMove(account);
  if (move == null || breach == null) return false;
  return account.positionUsd < 0 ? move >= breach - 1e-8 : move <= breach + 1e-8;
}

export function isPassed(account: PropAccount, price: number): boolean {
  if (account.phase !== "challenge") return false;
  const move = moveAt(account, price);
  const pass = passMove(account);
  if (move == null || pass == null) return false;
  return account.positionUsd < 0 ? move <= pass + 1e-8 : move >= pass - 1e-8;
}

/**
 * Cash the trader actually books.
 * A dead eval is −cost. A passed eval pays nothing — it becomes a funded account.
 * A funded account pays the split of profit after the round-trip fee, and nothing on a loss.
 */
export function accountCash(account: PropAccount, price: number): number {
  if (!account.enabled || !(account.entry > 0) || !(price > 0)) return 0;
  if (account.phase === "challenge") {
    if (isBlown(account, price)) return -Math.max(account.cost, 0);
    return 0;
  }
  const open = account.positionUsd * (price / account.entry - 1);
  const net = open - feeUsd(account);
  if (net <= 0 || isBlown(account, price)) return 0;
  return (net * account.split) / 100;
}

/** Unrealized eval P&L while the challenge is still alive, including the fee it still has to earn. */
export function challengeOpen(account: PropAccount, price: number): number | null {
  if (!account.enabled || account.phase !== "challenge") return null;
  if (!(account.entry > 0) || !(price > 0) || !(Math.abs(account.positionUsd) > 0)) return null;
  const move = price / account.entry - 1;
  const breach = breachMove(account);
  const pass = passMove(account);
  const short = account.positionUsd < 0;
  if (breach != null && (short ? move > breach + 1e-8 : move < breach - 1e-8)) return null;
  if (pass != null && (short ? move < pass - 1e-8 : move > pass + 1e-8)) return null;
  return account.positionUsd * move;
}

export function bufferLeft(account: PropAccount, price: number): number {
  if (account.phase !== "funded" || !(account.entry > 0) || !(price > 0)) return maxDdUsd(account);
  const open = account.positionUsd * (price / account.entry - 1);
  const consumed = feeUsd(account) + Math.max(0, -open);
  return maxDdUsd(account) - consumed;
}

export type LoopPoint = {
  move: number;
  price: number;
  cash: number;
  progress: number | null;
  buffer: number;
  passed: boolean;
};

export function buildLoopCurve(accounts: PropAccount[], entry: number, span = 0.08): LoopPoint[] {
  if (!(entry > 0)) return [];
  const live = accounts.filter((account) => account.enabled);
  const marks = live.flatMap((account) => [breachMove(account), passMove(account)]).filter((row): row is number => row != null);
  let lo = -span;
  let hi = span;
  for (const mark of marks) {
    lo = Math.min(lo, mark - 0.005);
    hi = Math.max(hi, mark + 0.005);
  }
  const moves = new Set<number>([0]);
  const n = 121;
  for (let i = 0; i < n; i += 1) moves.add(lo + ((hi - lo) * i) / (n - 1));
  for (const mark of marks) moves.add(mark);
  return [...moves].sort((a, b) => a - b).map((move) => {
    const price = entry * (1 + move);
    const progressParts = live.map((account) => challengeOpen(account, price));
    const anyAlive = progressParts.some((part) => part != null);
    return {
      move: move * 100,
      price,
      cash: live.reduce((sum, account) => sum + accountCash(account, price), 0),
      progress: anyAlive ? progressParts.reduce<number>((sum, part) => sum + (part ?? 0), 0) : null,
      buffer: live.filter((account) => account.phase === "funded").reduce((sum, account) => sum + bufferLeft(account, price), 0),
      passed: live.some((account) => isPassed(account, price)),
    };
  });
}

const FUNDED_COLORS = ["#22d3ee", "#38bdf8", "#6366f1"];
const EVAL_COLORS = ["#fb923c", "#c084fc", "#f472b6", "#fbbf24"];

export type DualSeries = {
  id: string;
  name: string;
  kind: "funded" | "challenge";
  color: string;
  solidKey: string;
  dashKey: string;
  dotKey: string;
  floor: number;
};

export type DualPoint = {
  move: number;
  price: number;
  cash: number;
  cashUp: number;
  cashDn: number;
  cushion: number;
  passed: boolean;
} & Record<string, number | boolean | null>;

export type DualBook = {
  points: DualPoint[];
  series: DualSeries[];
  failPct: number;
  passPct: number | null;
};

function legAt(account: PropAccount, move: number): { solid: number | null; dash: number | null; dot: number | null } {
  const empty = { solid: null, dash: null, dot: null };
  if (!account.enabled || !(Math.abs(account.positionUsd) > 0)) return empty;
  const breach = breachMove(account);
  const pass = passMove(account);
  const short = account.positionUsd < 0;
  const dead = breach != null && (short ? move >= breach - 1e-8 : move <= breach + 1e-8);
  const won = account.phase === "challenge" && pass != null && (short ? move <= pass + 1e-8 : move >= pass - 1e-8);
  if (account.phase === "funded") {
    const dd = maxDdUsd(account);
    if (dead) return { solid: -dd, dash: null, dot: null };
    const net = account.positionUsd * move - feeUsd(account);
    return { solid: net >= 0 ? (net * account.split) / 100 : Math.max(net, -dd), dash: null, dot: null };
  }
  if (dead) return { solid: -Math.max(account.cost, 0), dash: null, dot: null };
  if (won && pass != null) {
    const at = Math.abs(move - pass) <= 1e-6;
    const y = account.positionUsd * pass;
    return { solid: null, dash: at ? y : null, dot: at ? y : null };
  }
  const adverse = short ? move >= -1e-9 : move <= 1e-9;
  if (adverse) return { solid: account.positionUsd * move, dash: null, dot: null };
  return { solid: null, dash: account.positionUsd * move, dot: null };
}

function cushionAt(accounts: PropAccount[], price: number): number {
  return accounts.reduce((sum, account) => {
    if (!account.enabled) return sum;
    if (account.phase === "funded") return sum + Math.max(0, bufferLeft(account, price));
    return sum + (isPassed(account, price) ? maxDdUsd(account) : 0);
  }, 0);
}

/** Individual legs plus the net cash and unlocked-buffer step. Window is −4.5% to +2.5%, widened only if a stop or pass sits outside. */
export function buildDualBook(accounts: PropAccount[], entry: number, slPct: number, side: SideMode): DualBook {
  const live = accounts.filter((account) => account.enabled && Math.abs(account.positionUsd) > 0);
  let fundedColor = 0;
  let evalColor = 0;
  const series: DualSeries[] = live.map((account) => {
    const funded = account.phase === "funded";
    const color = funded ? FUNDED_COLORS[fundedColor++ % FUNDED_COLORS.length] : EVAL_COLORS[evalColor++ % EVAL_COLORS.length];
    return {
      id: account.id,
      name: account.name,
      kind: funded ? "funded" : "challenge",
      color,
      solidKey: `s${account.id}`,
      dashKey: `d${account.id}`,
      dotKey: `p${account.id}`,
      floor: funded ? -maxDdUsd(account) : -Math.max(account.cost, 0),
    };
  });
  const marks = live.flatMap((account) => [breachMove(account), passMove(account)]).filter((row): row is number => row != null);
  const fail = failFraction(side, slPct);
  const pass = collectivePassMove(live, side);
  let lo = -0.045;
  let hi = 0.025;
  for (const mark of [...marks, fail, pass].filter((row): row is number => row != null)) {
    lo = Math.min(lo, mark - 0.004);
    hi = Math.max(hi, mark + 0.004);
  }
  const moves = new Set<number>([0, fail]);
  if (pass != null) moves.add(pass);
  const steps = 161;
  for (let i = 0; i < steps; i += 1) moves.add(lo + ((hi - lo) * i) / (steps - 1));
  for (const account of live) {
    const breach = breachMove(account);
    if (breach == null) continue;
    moves.add(breach);
    moves.add(account.positionUsd < 0 ? breach - 1e-4 : breach + 1e-4);
  }
  const points = [...moves].sort((a, b) => a - b).map((move) => {
    const price = entry * (1 + move);
    const point: DualPoint = {
      move: move * 100,
      price,
      cash: 0,
      cashUp: 0,
      cashDn: 0,
      cushion: entry > 0 ? cushionAt(live, price) : 0,
      passed: live.some((account) => isPassed(account, price)),
    };
    for (const account of live) {
      const leg = legAt(account, move);
      point[`s${account.id}`] = leg.solid;
      point[`d${account.id}`] = leg.dash;
      point[`p${account.id}`] = leg.dot;
    }
    const cash = entry > 0 ? live.reduce((sum, account) => sum + accountCash(account, price), 0) : 0;
    point.cash = cash;
    point.cashUp = cash > 0 ? cash : 0;
    point.cashDn = cash < 0 ? cash : 0;
    return point;
  });
  return { points, series, failPct: fail * 100, passPct: pass == null ? null : pass * 100 };
}

export type LoopKpis = {
  costs: number;
  netAtFail: number;
  failMove: number;
  bufferAtPass: number;
  passMove: number;
  alive: boolean;
  evalLeverage: [number, number] | null;
  fundedLeverage: [number, number] | null;
  wonCount: number;
  wonBuffer: number;
};

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function leverageSpan(rows: PropAccount[]): [number, number] | null {
  const values = rows
    .filter((account) => account.account > 0 && Math.abs(account.positionUsd) > 0)
    .map((account) => Math.abs(account.positionUsd) / account.account);
  if (!values.length) return null;
  return [Math.min(...values), Math.max(...values)];
}

export function discountedCost(size: number, discountPct: number): number {
  return Math.round(priceOf(size) * (1 - clamp(discountPct, 0, 25) / 100) * 100) / 100;
}

export function applyDiscount(accounts: PropAccount[], discountPct: number): PropAccount[] {
  return accounts.map((account) =>
    account.phase === "challenge" ? { ...account, cost: discountedCost(account.account, discountPct) } : account,
  );
}

export function loopKpis(accounts: PropAccount[], entry: number, slPct: number, side: SideMode = "evals-short"): LoopKpis {
  const on = accounts.filter((account) => account.enabled).map((account) => withEntry(account, entry));
  const evals = on.filter((account) => account.phase === "challenge");
  const funds = on.filter((account) => account.phase === "funded");
  const costs = evals.reduce((sum, account) => sum + account.cost, 0);
  const failMove = failFraction(side, slPct);
  const failPrice = entry > 0 ? entry * (1 + failMove) : 0;
  const netAtFail = failPrice > 0 ? roundCents(on.reduce((sum, account) => sum + accountCash(account, failPrice), 0)) : 0;
  const pass = collectivePassMove(evals, side) ?? (side === "evals-short" ? -0.03 : 0.03);
  const passPrice = entry > 0 ? entry * (1 + pass) : 0;
  const bufferAtPass = passPrice > 0 ? roundCents(funds.reduce((sum, account) => sum + bufferLeft(account, passPrice), 0)) : 0;
  const wonBuffer = evals.reduce((sum, account) => sum + maxDdUsd(account), 0);
  return {
    costs,
    netAtFail,
    failMove: failMove * 100,
    bufferAtPass,
    passMove: pass * 100,
    alive: funds.length === 0 || bufferAtPass >= -0.005,
    evalLeverage: leverageSpan(evals),
    fundedLeverage: leverageSpan(funds),
    wonCount: evals.length,
    wonBuffer,
  };
}

export type HedgeMode = "safe" | "balanced" | "max" | "manual" | "auto";

/** Auto keeps 10% of max DD when the evals pass. Balanced is the older 20% mode. */
export function hedgeReserve(mode: HedgeMode): number | null {
  if (mode === "auto" || mode === "max") return 0.1;
  if (mode === "balanced") return 0.2;
  return null;
}

/**
 * Sizes evals from their own max DD, then sizes the funded book.
 * Safe and manual keep the break-even hedge (manual adds a typed extra).
 * Balanced and max grow the funded position until the pass-move loss
 * leaves exactly the reserve, but never below the size that covers the eval fees.
 */
export function sizeForHedge(
  accounts: PropAccount[],
  slPct: number,
  extra: number,
  side: SideMode,
  hedge: HedgeMode,
): { accounts: PropAccount[]; tight: boolean } {
  const typed = hedge === "manual" ? extra : 0;
  const base = autoSync(accounts, slPct, typed, side).accounts;
  const reserve = hedgeReserve(hedge);
  if (reserve == null) return { accounts: base, tight: false };
  const evals = base.filter((account) => account.enabled && account.phase === "challenge");
  const funds = base.filter((account) => account.enabled && account.phase === "funded");
  const pass = collectivePassMove(evals, side);
  const passAbs = pass == null ? 0 : Math.abs(pass);
  if (!(passAbs > 0) || funds.length === 0) return { accounts: base, tight: true };
  let minSum = 0;
  let maxSum = 0;
  const maxSafe = new Map<string, number>();
  for (const account of funds) {
    const min = Math.abs(account.positionUsd);
    const rt = account.rtFeePct / 100;
    const room = maxDdUsd(account) * (1 - reserve);
    const max = room > 0 ? room / (passAbs + rt) : 0;
    minSum += min;
    maxSum += max;
    maxSafe.set(account.id, max);
  }
  if (!(maxSum > minSum + 0.005)) return { accounts: base, tight: true };
  return {
    tight: false,
    accounts: base.map((account) => {
      const max = maxSafe.get(account.id);
      if (max == null) return account;
      return { ...account, positionUsd: positionSign(account.phase, side) * max };
    }),
  };
}

export function autoSync(
  accounts: PropAccount[],
  slPct: number,
  extra: number,
  side: SideMode = "evals-short",
): { accounts: PropAccount[]; warning: string } {
  const sl = slPct / 100;
  const evals = accounts.filter((account) => account.enabled && account.phase === "challenge");
  const funds = accounts.filter((account) => account.enabled && account.phase === "funded");
  const neededNet = evals.reduce((sum, account) => sum + account.cost, 0) + extra;
  const totalDd = funds.reduce((sum, account) => sum + maxDdUsd(account), 0);
  let warning = "";
  const next = accounts.map((account) => {
    if (!account.enabled) return account;
    if (account.phase === "challenge") {
      const openFee = (account.openFeePct == null ? account.rtFeePct / 2 : account.openFeePct) / 100;
      const denom = sl + openFee;
      const mag = denom > 0 ? maxDdUsd(account) / denom : 0;
      return { ...account, positionUsd: positionSign(account.phase, side) * mag };
    }
    const share = totalDd > 0 ? maxDdUsd(account) / totalDd : funds.length > 0 ? 1 / funds.length : 0;
    const split = account.split / 100;
    const gross = split > 0 ? (neededNet * share) / split : 0;
    const rt = account.rtFeePct / 100;
    const denom = sl - rt;
    if (!(denom > 1e-8)) {
      warning = "Funded-Fee ist höher als der SL-Move. Die Größe bleibt 0.";
      return { ...account, positionUsd: 0 };
    }
    return { ...account, positionUsd: positionSign(account.phase, side) * (gross / denom) };
  });
  return { accounts: next, warning };
}

export function fuzzBook(accounts: PropAccount[]): PropAccount[] {
  return accounts.map((account) => {
    if (!account.enabled || account.positionUsd === 0) return account;
    const sign = Math.sign(account.positionUsd);
    const positionUsd = sign * fuzzNotional(Math.abs(account.positionUsd), Math.random());
    return { ...account, positionUsd };
  });
}

/** Crooked size change. Default is the wide ±0.8–1.5% smear. Pass 0.009 for the ±0.9% camo. */
export function fuzzWide(accounts: PropAccount[], entry: number, slPct: number, side: SideMode, span?: number): PropAccount[] {
  const next = accounts.map((account) => {
    if (!account.enabled || account.positionUsd === 0) return account;
    const width = span == null ? 0.008 + Math.random() * 0.007 : Math.random() * span;
    const way = Math.random() < 0.5 ? -1 : 1;
    let mag = Math.abs(account.positionUsd) * (1 + way * width);
    mag = Math.round(mag * 100) / 100;
    if (span == null && Math.round(mag) % 50 === 0) mag += 7.4 + Math.floor(Math.random() * 9);
    return { ...account, positionUsd: Math.sign(account.positionUsd) * Math.round(mag * 100) / 100 };
  });
  const priced = next.map((account) => withEntry(account, entry));
  const net = loopKpis(priced, entry, slPct, side).netAtFail;
  if (net >= 0) return next;
  const funds = next.filter((account) => account.enabled && account.phase === "funded" && account.positionUsd !== 0);
  const book = funds.reduce((sum, account) => sum + Math.abs(account.positionUsd), 0);
  const perDollar = Math.abs(failFraction(side, slPct)) * ((funds[0]?.split ?? 80) / 100);
  if (!(book > 0) || !(perDollar > 0)) return next;
  const add = (-net + 1) / perDollar;
  return next.map((account) => {
    if (!account.enabled || account.phase !== "funded" || account.positionUsd === 0) return account;
    const share = Math.abs(account.positionUsd) / book;
    const mag = Math.round((Math.abs(account.positionUsd) + add * share) * 100) / 100;
    return { ...account, positionUsd: Math.sign(account.positionUsd) * mag };
  });
}

/** Price where the funded loss equals 95% of max DD, so a tick of slippage still survives. */
export function safetyStop(account: PropAccount, entry: number): number | null {
  if (!(entry > 0) || !(Math.abs(account.positionUsd) > 0)) return null;
  const room = maxDdUsd(account) * 0.95 - feeUsd(account);
  if (!(room > 0)) return null;
  const move = -Math.sign(account.positionUsd) * (room / Math.abs(account.positionUsd));
  const price = entry * (1 + move);
  return price > 0 ? price : null;
}

export function rotateBook(accounts: PropAccount[], split: number): PropAccount[] {
  const funded = accounts.find((account) => account.enabled && account.phase === "funded" && account.tag !== "trader");
  const evals = accounts.filter((account) => account.enabled && account.phase === "challenge");
  const first = evals[0];
  const second = evals[1];
  return accounts.map((account) => {
    if (funded && account.id === funded.id) {
      return { ...account, phase: "funded", tag: "cooldown", enabled: false, positionUsd: 0, size: 0 };
    }
    if (first && account.id === first.id) {
      const dd = account.account * 0.03;
      return {
        ...account,
        phase: "funded",
        tag: "active",
        enabled: true,
        positionUsd: 0,
        size: 0,
        cost: 0,
        profitTarget: 0,
        split,
        balance: account.account,
        ddLimit: Math.round((account.account - dd) * 100) / 100,
        dailyLimit: 0,
      };
    }
    if (second && account.id === second.id) {
      return { ...account, phase: "funded", tag: "trader", enabled: false, positionUsd: 0, size: 0, cost: 0, profitTarget: 0, split };
    }
    return account;
  });
}

export function applyPreset(account: PropAccount, preset: FirmPreset, size = account.account): PropAccount {
  const dd = size * (preset.maxDdPct / 100);
  const challenge = account.phase === "challenge";
  return {
    ...account,
    account: size,
    balance: size,
    ddLimit: Math.round((size - dd) * 100) / 100,
    dailyLimit: 0,
    profitTarget: challenge ? Math.round(size * (1 + preset.targetPct / 100) * 100) / 100 : 0,
    cost: challenge ? priceOf(size) : 0,
    split: preset.split,
    rtFeePct: preset.takerPct * 2,
    openFeePct: preset.takerPct,
    presetId: preset.id,
  };
}

export function makeAccount(phase: PropAccount["phase"], size: AccountSize, preset: FirmPreset): PropAccount {
  const base: PropAccount = {
    id: crypto.randomUUID(),
    name: `Prop`,
    enabled: true,
    phase,
    size: 0,
    entry: 0,
    account: size,
    balance: size,
    ddLimit: 0,
    dailyLimit: 0,
    profitTarget: 0,
    cost: 0,
    split: preset.split,
    positionUsd: 0,
    rtFeePct: preset.takerPct * 2,
    openFeePct: preset.takerPct,
    presetId: preset.id,
    tag: "",
  };
  return applyPreset(base, preset, size);
}

export const TEMPLATES: { id: string; label: string; rows: { phase: PropAccount["phase"]; size: AccountSize }[] }[] = [
  {
    id: "10k-safe",
    label: "10k Safe-Start",
    rows: [
      { phase: "funded", size: 10_000 },
      { phase: "challenge", size: 10_000 },
      { phase: "challenge", size: 5_000 },
    ],
  },
  {
    id: "25k",
    label: "25k Loop",
    rows: [
      { phase: "funded", size: 25_000 },
      { phase: "challenge", size: 25_000 },
      { phase: "challenge", size: 25_000 },
    ],
  },
  {
    id: "50k",
    label: "50k Upgrade",
    rows: [
      { phase: "funded", size: 25_000 },
      { phase: "funded", size: 25_000 },
      { phase: "challenge", size: 50_000 },
      { phase: "challenge", size: 50_000 },
    ],
  },
  {
    id: "100k-up",
    label: "100k Upgrade",
    rows: [
      { phase: "funded", size: 50_000 },
      { phase: "funded", size: 50_000 },
      { phase: "challenge", size: 100_000 },
      { phase: "challenge", size: 100_000 },
    ],
  },
  {
    id: "100k-end",
    label: "100k Endgame",
    rows: [
      { phase: "funded", size: 100_000 },
      { phase: "challenge", size: 100_000 },
      { phase: "challenge", size: 100_000 },
    ],
  },
];

export function accountsFromTemplate(
  rows: { phase: PropAccount["phase"]; size: AccountSize }[],
  preset: FirmPreset,
): PropAccount[] {
  return rows.map((row) => makeAccount(row.phase, row.size, preset));
}

export function formatLeverage(span: [number, number] | null): string {
  if (!span) return "—";
  const [lo, hi] = span;
  if (Math.abs(lo - hi) < 0.005) return `${lo.toFixed(2)}×`;
  return `${lo.toFixed(2)}–${hi.toFixed(2)}×`;
}

export type SideMode = "evals-short" | "evals-long";

export type LoopSettings = {
  sl: number;
  extra: number;
  side: SideMode;
  /** Manual entry in dollars. Null keeps the live index, or 100 in percent mode. */
  entry: number | null;
  /** Percent off the catalog eval price, 0–25. */
  discount: number;
  /** Trader share written onto funded rows, 50–100. */
  split: number;
};

/** Evals-short dies on a rise. Evals-long dies on a drop. */
export function failFraction(side: SideMode, slPct: number): number {
  const mag = slPct / 100;
  return side === "evals-short" ? mag : -mag;
}

export function positionSign(phase: PropAccount["phase"], side: SideMode): number {
  if (phase === "challenge") return side === "evals-short" ? -1 : 1;
  return side === "evals-short" ? 1 : -1;
}

export function applySide(accounts: PropAccount[], side: SideMode): PropAccount[] {
  return accounts.map((account) => {
    const mag = Math.abs(account.positionUsd);
    if (!(mag > 0)) return account;
    return { ...account, positionUsd: positionSign(account.phase, side) * mag };
  });
}

/** Move where every eval has reached its own fee-inclusive target. */
export function collectivePassMove(accounts: PropAccount[], side: SideMode): number | null {
  const passes = accounts
    .filter((account) => account.enabled && account.phase === "challenge")
    .map(passMove)
    .filter((move): move is number => move != null);
  if (!passes.length) return null;
  return side === "evals-short" ? Math.min(...passes) : Math.max(...passes);
}

export function referenceEntry(percentMode: boolean, index: number, override: number | null): number {
  if (override != null && override > 0) return override;
  if (percentMode) return 100;
  return index > 0 ? index : 100;
}

/**
 * Broker prices for one row.
 * An eval stops at the shared SL move and takes profit at its own fee-inclusive target.
 * The funded stop is 95% of its max DD, past the eval take-profit, so the spread
 * cannot fill the funded stop before the evals close.
 */
export function orderPrices(
  account: PropAccount,
  entry: number,
  slPct: number,
  side: SideMode,
  _fundedStopMove: number | null,
): { sl: number | null; tp: number | null } {
  if (!(entry > 0)) return { sl: null, tp: null };
  const fail = entry * (1 + failFraction(side, slPct));
  if (account.phase === "challenge") {
    const pass = passMove(account);
    return { sl: fail, tp: pass == null ? null : entry * (1 + pass) };
  }
  return { sl: safetyStop(account, entry), tp: fail };
}

const LOOP_KEY = "position-builder.loop.v1";
export const LOOP_FALLBACK: LoopSettings = { sl: 1, extra: 0, side: "evals-short", entry: null, discount: 0, split: 80 };
let loopSettings: LoopSettings = { ...LOOP_FALLBACK };
let loopBooted = false;
const loopListeners = new Set<() => void>();

function bootLoop(): void {
  if (loopBooted || typeof window === "undefined") return;
  loopBooted = true;
  try {
    const raw = window.localStorage.getItem(LOOP_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<LoopSettings>;
    if (typeof parsed.sl === "number" && Number.isFinite(parsed.sl)) loopSettings.sl = clamp(parsed.sl, 0.2, 3);
    if (typeof parsed.extra === "number" && Number.isFinite(parsed.extra)) loopSettings.extra = clamp(parsed.extra, 0, 200);
    if (parsed.side === "evals-long" || parsed.side === "evals-short") loopSettings.side = parsed.side;
    if (typeof parsed.entry === "number" && Number.isFinite(parsed.entry) && parsed.entry > 0) loopSettings.entry = parsed.entry;
    if (typeof parsed.discount === "number" && Number.isFinite(parsed.discount)) loopSettings.discount = clamp(parsed.discount, 0, 25);
    if (typeof parsed.split === "number" && Number.isFinite(parsed.split)) loopSettings.split = clamp(parsed.split, 50, 100);
  } catch {
    /* keep defaults */
  }
}

export function getLoopSettings(): LoopSettings {
  bootLoop();
  return loopSettings;
}

export function setLoopSettings(partial: Partial<LoopSettings>): void {
  bootLoop();
  const entry = partial.entry === undefined ? loopSettings.entry : partial.entry != null && partial.entry > 0 ? partial.entry : null;
  loopSettings = {
    sl: partial.sl != null ? clamp(partial.sl, 0.2, 3) : loopSettings.sl,
    extra: partial.extra != null ? clamp(partial.extra, 0, 200) : loopSettings.extra,
    side: partial.side === "evals-long" || partial.side === "evals-short" ? partial.side : loopSettings.side,
    entry,
    discount: partial.discount != null ? clamp(partial.discount, 0, 25) : loopSettings.discount,
    split: partial.split != null ? clamp(partial.split, 50, 100) : loopSettings.split,
  };
  window.localStorage.setItem(LOOP_KEY, JSON.stringify(loopSettings));
  for (const listener of loopListeners) listener();
}

export function subscribeLoop(listener: () => void): () => void {
  loopListeners.add(listener);
  return () => loopListeners.delete(listener);
}
