import { create } from "zustand";
import { PHASE_DEFAULTS, type OptimizerInput, type PhaseId } from "@/lib/phase-optimizer";

const KEY = "phase-optimizer.v1";

type PhaseState = OptimizerInput & {
  ready: boolean;
  hydrate: () => void;
  setPhase: (phase: PhaseId) => void;
  patch: (next: Partial<OptimizerInput>) => void;
};

function read(): Partial<OptimizerInput> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OptimizerInput>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export const usePhasePlan = create<PhaseState>((set, get) => ({
  ...PHASE_DEFAULTS,
  ready: false,
  hydrate: () => {
    const saved = read();
    set({ ...PHASE_DEFAULTS, ...clean(saved), ready: true });
  },
  setPhase: (phase) => get().patch({ phase }),
  patch: (next) => {
    set(next);
    if (!get().ready || typeof window === "undefined") return;
    const { ready: _ready, hydrate: _hydrate, setPhase: _setPhase, patch: _patch, ...input } = get();
    window.localStorage.setItem(KEY, JSON.stringify(input));
  },
}));

function clean(raw: Partial<OptimizerInput> | null): Partial<OptimizerInput> {
  if (!raw) return {};
  const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
  return {
    phase: raw.phase === "funded" ? "funded" : "eval",
    accountSize: Math.max(500, num(raw.accountSize, PHASE_DEFAULTS.accountSize)),
    challengeFee: Math.max(0, num(raw.challengeFee, PHASE_DEFAULTS.challengeFee)),
    maxDrawdownUsd: Math.max(1, num(raw.maxDrawdownUsd, PHASE_DEFAULTS.maxDrawdownUsd)),
    evalTargetUsd: Math.max(1, num(raw.evalTargetUsd, PHASE_DEFAULTS.evalTargetUsd)),
    fundedTpPercent: Math.min(20, Math.max(3, (num(raw.fundedTpPercent, PHASE_DEFAULTS.fundedTpPercent) === 9.5 ? 10.5 : num(raw.fundedTpPercent, PHASE_DEFAULTS.fundedTpPercent)))),
    targetFailNetProfit: Math.max(0, num(raw.targetFailNetProfit, PHASE_DEFAULTS.targetFailNetProfit)),
    split: raw.split === 0.9 ? 0.9 : 0.8,
    sunkOverride: raw.sunkOverride == null ? null : Math.max(0, num(raw.sunkOverride, 0)),
    budget: Math.max(0, num(raw.budget, PHASE_DEFAULTS.budget)),
  };
}
