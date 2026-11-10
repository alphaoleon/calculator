import {
  ACCOUNT_SIZES,
  DEFAULT_PRESETS,
  priceOf,
  sizeForHedge,
  withEntry,
  type AccountSize,
  type FirmPreset,
  type HedgeMode,
  type SideMode,
} from "@/lib/hydra-loop";
import type { PropAccount } from "@/lib/types";

export type FillStyle = "market" | "limit";

export type CycleSlot = {
  id: string;
  enabled: boolean;
  presetId: string;
  size: AccountSize;
  fill: FillStyle;
  split: number;
  /** null uses the catalog price for this size. */
  cost: number | null;
  /** Funded room in dollars. null means 3% of the account size. */
  buffer: number | null;
  /** Eval max drawdown in percent. null means the firm preset, usually 3. */
  maxDdPct: number | null;
  /** Eval profit target in percent. null means the firm preset, usually 9. */
  targetPct: number | null;
};

export type CyclePlan = {
  entry: number;
  side: SideMode;
  sl: number;
  discount: number;
  extra: number;
  /** Smart sizing. Balanced (20% reserve) is the default. */
  hedge: HedgeMode;
  funded: CycleSlot[];
  eval1: CycleSlot;
  eval2: CycleSlot;
  /** Signed notionals, same order as the enabled book. Null means pure auto-sync. */
  fuzz: number[] | null;
  /** Camouflage target in percent, e.g. 9.22. Null keeps the real target. */
  dirtyTarget: number | null;
  /** Share of size that goes into layer 1. Null means 55/45. */
  layerShare: number | null;
  /** Round displayed coin sizes to 2 decimals. */
  humanRound: boolean;
  /** EURUSD monthly rate. EUR = USD / fx. */
  fx: number;
  note: string;
};

export const CYCLE_TEMPLATES: { id: string; label: string; funded: AccountSize[]; evals: AccountSize[] }[] = [
  { id: "10k", label: "10k Safe-Start (10k Funded vs. 10k + 5k Eval)", funded: [10_000], evals: [10_000, 5_000] },
  { id: "25k", label: "25k Loop (25k Funded vs. 2× 25k Eval)", funded: [25_000], evals: [25_000, 25_000] },
  { id: "50k", label: "50k Upgrade (2× 25k Funded vs. 2× 50k Eval)", funded: [25_000, 25_000], evals: [50_000, 50_000] },
  { id: "100k", label: "100k Endgame (100k Funded vs. 2× 100k Eval)", funded: [100_000], evals: [100_000, 100_000] },
];

function slot(id: string, size: AccountSize, presetId: string, enabled = true): CycleSlot {
  return { id, enabled, presetId, size, fill: "market", split: 80, cost: null, buffer: null, maxDdPct: null, targetPct: null };
}

export function defaultPlan(): CyclePlan {
  return {
    entry: 2500,
    side: "evals-short",
    sl: 1,
    discount: 0,
    extra: 0,
    hedge: "manual",
    funded: [slot("funded-1", 10_000, "breakout")],
    eval1: slot("eval-1", 10_000, "hypernova"),
    eval2: slot("eval-2", 5_000, "cashed"),
    fuzz: null,
    dirtyTarget: null,
    layerShare: null,
    humanRound: true,
    fx: 1.09,
    note: "",
  };
}

export function applyTemplate(plan: CyclePlan, funded: AccountSize[], evals: AccountSize[]): CyclePlan {
  const fundedPresets = ["breakout", "hypernova"];
  const evalPresets = ["cashed", "iceberg"];
  return {
    ...plan,
    fuzz: null,
    dirtyTarget: null,
    layerShare: null,
    note: "",
    funded: funded.map((size, index) => slot(`funded-${index + 1}`, size, fundedPresets[index] ?? "hypernova")),
    eval1: slot("eval-1", evals[0] ?? 10_000, evalPresets[0] ?? "cashed"),
    eval2: slot("eval-2", evals[1] ?? evals[0] ?? 10_000, evalPresets[1] ?? "iceberg", evals.length > 1),
  };
}

export function feePair(preset: FirmPreset, fill: FillStyle): { openPct: number; rtPct: number } {
  if (fill === "market") return { openPct: preset.takerPct, rtPct: preset.takerPct * 2 };
  return { openPct: preset.makerPct, rtPct: preset.makerPct + preset.takerPct };
}

export function firmLabel(preset: FirmPreset): string {
  const fee = `${preset.name} (${trimPct(preset.makerPct)}% / ${trimPct(preset.takerPct)}%)`;
  return preset.platform ? `${fee} · ${preset.platform}` : fee;
}

function trimPct(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function availableBuffer(row: CycleSlot, preset: FirmPreset): number {
  if (row.buffer != null && row.buffer >= 0) return row.buffer;
  const pct = row.maxDdPct != null ? row.maxDdPct : preset.maxDdPct;
  return row.size * (pct / 100);
}

function targetPercent(row: CycleSlot, preset: FirmPreset): number {
  return row.targetPct != null ? row.targetPct : preset.targetPct;
}

/** First word of the firm name. "Hypernova Crypto" and "Hypernova Gold" are the same firm. */
export function firmFamily(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name.trim();
}

export function clashingFirms(names: string[]): string[] {
  const counts = new Map<string, { label: string; n: number }>();
  for (const name of names) {
    const label = firmFamily(name);
    const key = label.toLowerCase();
    const row = counts.get(key);
    if (row) row.n += 1;
    else counts.set(key, { label, n: 1 });
  }
  return [...counts.values()].filter((row) => row.n > 1).map((row) => row.label);
}

function asSize(value: number): AccountSize {
  return ACCOUNT_SIZES.find((size) => size === value) ?? 10_000;
}

export function materialize(plan: CyclePlan, presets: FirmPreset[]): PropAccount[] {
  const book = presets.length ? presets : DEFAULT_PRESETS;
  const funded = plan.funded.filter((row) => row.enabled);
  const evals = [plan.eval1, ...(plan.eval2.enabled ? [plan.eval2] : [])];
  const accounts = [
    ...funded.map((row) => slotAccount(row, "funded", book, plan)),
    ...evals.map((row) => slotAccount(row, "challenge", book, plan)),
  ];
  const priced = accounts.map((account) => withEntry(account, plan.entry));
  const hedge = plan.hedge ?? "balanced";
  const synced = sizeForHedge(priced, plan.sl, plan.extra, plan.side, hedge).accounts.map((account) => ({
    ...account,
    size: plan.entry > 0 ? account.positionUsd / plan.entry : 0,
  }));
  if (!plan.fuzz || plan.fuzz.length !== synced.length) return synced;
  return synced.map((account, index) => {
    const positionUsd = plan.fuzz?.[index] ?? account.positionUsd;
    return { ...account, positionUsd, size: plan.entry > 0 ? positionUsd / plan.entry : 0 };
  });
}

function slotAccount(row: CycleSlot, phase: PropAccount["phase"], presets: FirmPreset[], plan: CyclePlan): PropAccount {
  const preset = presets.find((item) => item.id === row.presetId) ?? presets[0] ?? DEFAULT_PRESETS[0];
  const fees = feePair(preset, row.fill);
  const list = row.cost == null ? priceOf(row.size) : row.cost;
  const discount = phase === "challenge" && row.cost == null ? Math.min(25, Math.max(0, plan.discount)) / 100 : 0;
  const dd = availableBuffer(row, preset);
  return {
    id: row.id,
    name: phase === "funded" ? (row.id.endsWith("2") ? "Funded 2" : "Funded") : row.id === "eval-2" ? "Eval #2" : "Eval #1",
    enabled: row.enabled,
    phase,
    size: 0,
    entry: plan.entry,
    account: row.size,
    balance: row.size,
    ddLimit: Math.round((row.size - dd) * 100) / 100,
    dailyLimit: 0,
    profitTarget: phase === "challenge"
      ? Math.round(row.size * (1 + targetPercent(row, preset) / 100) * 100) / 100
      : 0,
    cost: phase === "challenge" ? Math.round(list * (1 - discount) * 100) / 100 : 0,
    split: row.split,
    positionUsd: 0,
    rtFeePct: fees.rtPct,
    openFeePct: fees.openPct,
    presetId: preset.id,
    tag: "",
  };
}

const CYCLE_KEY = "position-builder.cycle.v1";

export function loadPlan(): CyclePlan {
  const base = defaultPlan();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(CYCLE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<CyclePlan>;
    return {
      ...base,
      entry: num(parsed.entry, base.entry, 0.01, 10_000_000),
      side: parsed.side === "evals-long" ? "evals-long" : "evals-short",
      sl: num(parsed.sl, base.sl, 0.2, 3),
      discount: num(parsed.discount, 0, 0, 25),
      extra: num(parsed.extra, 0, 0, 5000),
      hedge: hedgeOf(parsed.hedge, num(parsed.extra, 0, 0, 5000)),
      funded: Array.isArray(parsed.funded) && parsed.funded.length ? parsed.funded.map((row, index) => cleanSlot(row, `funded-${index + 1}`)) : base.funded,
      eval1: cleanSlot(parsed.eval1, "eval-1"),
      eval2: cleanSlot(parsed.eval2, "eval-2"),
      fuzz: Array.isArray(parsed.fuzz) ? parsed.fuzz.filter((row) => typeof row === "number") : null,
      dirtyTarget: typeof parsed.dirtyTarget === "number" && parsed.dirtyTarget >= 8 && parsed.dirtyTarget <= 12 ? parsed.dirtyTarget : null,
      layerShare: typeof parsed.layerShare === "number" && parsed.layerShare >= 0.5 && parsed.layerShare <= 0.7 ? parsed.layerShare : null,
      humanRound: parsed.humanRound !== false,
      fx: num(parsed.fx, 1.09, 0.5, 2),
      note: typeof parsed.note === "string" ? parsed.note : "",
    };
  } catch {
    return base;
  }
}

export function savePlan(plan: CyclePlan): void {
  window.localStorage.setItem(CYCLE_KEY, JSON.stringify(plan));
}

function presetIdOf(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "breakout";
  if (value.startsWith("firm-")) return value.slice(0, 64);
  const known = ["breakout", "hypernova", "cashed", "iceberg", "propr", "bungee"];
  return known.includes(value) ? value : "breakout";
}

function cleanSlot(raw: unknown, id: string): CycleSlot {
  const row = raw && typeof raw === "object" ? (raw as Partial<CycleSlot>) : {};
  return {
    id,
    enabled: row.enabled !== false,
    presetId: presetIdOf(row.presetId),
    size: asSize(typeof row.size === "number" ? row.size : 10_000),
    fill: row.fill === "limit" ? "limit" : "market",
    split: num(row.split, 80, 50, 100),
    cost: typeof row.cost === "number" && Number.isFinite(row.cost) ? row.cost : null,
    buffer: typeof row.buffer === "number" && Number.isFinite(row.buffer) ? Math.max(0, row.buffer) : null,
    maxDdPct: optionalPct(row.maxDdPct, 0.1, 20),
    targetPct: optionalPct(row.targetPct, 0.1, 30),
  };
}

function hedgeOf(value: unknown, _extra: number): HedgeMode {
  if (value === "manual" || value === "safe" || value === "balanced") return "manual";
  if (value === "auto" || value === "max") return "auto";
  return "manual";
}

function optionalPct(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, value));
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  const next = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, next));
}
