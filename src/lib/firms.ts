export const PLATFORMS = [
  "Eigenes System",
  "DXtrade",
  "Match-Trader",
  "cTrader",
  "TradeLocker",
  "Bybit/Binance WL",
] as const;

export const FIRM_STATUSES = [
  "Frei",
  "Aktiver Kloner (Funded)",
  "Im Eval-Lauf",
  "Cash-Kuh (Trader)",
  "Cooldown / Wartet auf Payout",
] as const;

export const ACCOUNT_SIZES = [5_000, 10_000, 25_000, 50_000, 100_000] as const;

export type Platform = (typeof PLATFORMS)[number];
export type FirmStatus = (typeof FIRM_STATUSES)[number];
export type AccountSize = (typeof ACCOUNT_SIZES)[number];
export type FillStyle = "market" | "limit";

export type PriceBook = Record<AccountSize, number>;

export type PropFirm = {
  id: string;
  name: string;
  platform: Platform;
  /** Percent per fill, so 0.04 means 0.04%. */
  makerFee: number;
  takerFee: number;
  profitSplit: number;
  maxDrawdownPct: number;
  profitTargetPct: number;
  prices: PriceBook;
  status: FirmStatus;
};

export type SlotSide = {
  firmId: string;
  size: AccountSize;
  style: FillStyle;
  discountPct: number;
  /** Funded only. Remaining drawdown room in USD. */
  buffer: number;
  enabled: boolean;
};

export type Cycle = {
  slMovePct: number;
  extraProfit: number;
  funded: SlotSide;
  eval1: SlotSide;
  eval2: SlotSide;
};

export type HistoryRow = {
  id: string;
  at: string;
  kind: "fail" | "pass";
  text: string;
  cashDelta: number;
};

export type FirmStore = {
  firms: PropFirm[];
  cash: number;
  history: HistoryRow[];
  cycle: Cycle;
};

export const DEFAULT_PRICES: PriceBook = {
  5000: 20,
  10000: 40,
  25000: 95,
  50000: 180,
  100000: 330,
};

const STORAGE_KEY = "position-builder.firms.v1";

export function firmsStorageKey(): string {
  return STORAGE_KEY;
}

function firm(
  id: string,
  name: string,
  platform: Platform,
  makerFee: number,
  takerFee: number,
  status: FirmStatus = "Frei",
): PropFirm {
  return {
    id,
    name,
    platform,
    makerFee,
    takerFee,
    profitSplit: 80,
    maxDrawdownPct: 3,
    profitTargetPct: 9,
    prices: { ...DEFAULT_PRICES },
    status,
  };
}

export function defaultFirms(): PropFirm[] {
  return [
    firm("firm-a", "Prop A (Zero-Fee)", "Match-Trader", 0, 0),
    firm("firm-b", "Prop B (Low-Fee Crypto)", "Bybit/Binance WL", 0, 0.015),
    firm("hn-crypto", "Hypernova (Crypto)", "Eigenes System", 0.01, 0.04),
    firm("hn-fx", "Hypernova (FX / Indices / Gold)", "Eigenes System", 0, 0.005),
    firm("hn-eq", "Hypernova (Equities)", "Eigenes System", 0, 0.03),
    firm("firm-f", "Prop F (Reserve-Firma)", "DXtrade", 0.01, 0.02),
  ];
}

export function defaultStore(): FirmStore {
  return {
    firms: defaultFirms(),
    cash: 500,
    history: [],
    cycle: {
      slMovePct: 1,
      extraProfit: 0,
      funded: { firmId: "hn-crypto", size: 10_000, style: "market", discountPct: 0, buffer: 300, enabled: true },
      eval1: { firmId: "firm-b", size: 10_000, style: "market", discountPct: 0, buffer: 0, enabled: true },
      eval2: { firmId: "firm-f", size: 10_000, style: "market", discountPct: 0, buffer: 0, enabled: true },
    },
  };
}

function num(value: unknown, fallback: number, min = 0, max = 1_000_000): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function pricesOf(raw: unknown): PriceBook {
  const next = { ...DEFAULT_PRICES };
  if (!raw || typeof raw !== "object") return next;
  const src = raw as Record<string, unknown>;
  for (const size of ACCOUNT_SIZES) {
    const value = src[String(size)];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) next[size] = value;
  }
  return next;
}

function sizeOf(value: unknown, fallback: AccountSize): AccountSize {
  return ACCOUNT_SIZES.includes(value as AccountSize) ? (value as AccountSize) : fallback;
}

function firmOf(raw: unknown): PropFirm | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Partial<PropFirm>;
  if (typeof src.id !== "string" || typeof src.name !== "string" || !src.name.trim()) return null;
  const platform = PLATFORMS.includes(src.platform as Platform) ? (src.platform as Platform) : "Eigenes System";
  const status = FIRM_STATUSES.includes(src.status as FirmStatus) ? (src.status as FirmStatus) : "Frei";
  return {
    id: src.id,
    name: src.name.trim(),
    platform,
    makerFee: num(src.makerFee, 0, 0, 5),
    takerFee: num(src.takerFee, 0, 0, 5),
    profitSplit: num(src.profitSplit, 80, 1, 100),
    maxDrawdownPct: num(src.maxDrawdownPct, 3, 0.1, 50),
    profitTargetPct: num(src.profitTargetPct, 9, 0.1, 100),
    prices: pricesOf(src.prices),
    status,
  };
}

function slotOf(raw: unknown, fallback: SlotSide, ids: Set<string>): SlotSide {
  const src = raw && typeof raw === "object" ? (raw as Partial<SlotSide>) : {};
  const firmId = typeof src.firmId === "string" && ids.has(src.firmId) ? src.firmId : fallback.firmId;
  return {
    firmId: ids.has(firmId) ? firmId : [...ids][0] ?? "",
    size: sizeOf(src.size, fallback.size),
    style: src.style === "limit" ? "limit" : "market",
    discountPct: num(src.discountPct, fallback.discountPct, 0, 100),
    buffer: num(src.buffer, fallback.buffer, 0, 1_000_000),
    enabled: typeof src.enabled === "boolean" ? src.enabled : fallback.enabled,
  };
}

export function sanitizeStore(raw: unknown): FirmStore {
  const fallback = defaultStore();
  if (!raw || typeof raw !== "object") return fallback;
  const src = raw as Partial<FirmStore>;
  const firms = Array.isArray(src.firms) ? src.firms.map(firmOf).filter((row): row is PropFirm => row != null) : [];
  if (!firms.length) return fallback;
  const ids = new Set(firms.map((row) => row.id));
  const cycleRaw = src.cycle && typeof src.cycle === "object" ? (src.cycle as Partial<Cycle>) : {};
  const history = Array.isArray(src.history)
    ? src.history
        .filter((row): row is HistoryRow => !!row && typeof row === "object" && typeof (row as HistoryRow).text === "string")
        .slice(0, 40)
    : [];
  return {
    firms,
    cash: num(src.cash, fallback.cash, 0, 10_000_000),
    history,
    cycle: {
      slMovePct: num(cycleRaw.slMovePct, 1, 0.1, 5),
      extraProfit: num(cycleRaw.extraProfit, 0, 0, 300),
      funded: slotOf(cycleRaw.funded, fallback.cycle.funded, ids),
      eval1: { ...slotOf(cycleRaw.eval1, fallback.cycle.eval1, ids), enabled: true },
      eval2: slotOf(cycleRaw.eval2, fallback.cycle.eval2, ids),
    },
  };
}

export function loadStore(): FirmStore {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    return sanitizeStore(JSON.parse(raw));
  } catch {
    return defaultStore();
  }
}

export function saveStore(store: FirmStore): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Round-trip fee as a fraction of notional. Market is two taker fills, limit is maker then taker. */
export function roundTripFraction(row: PropFirm, style: FillStyle): number {
  const pct = style === "market" ? 2 * row.takerFee : row.makerFee + row.takerFee;
  return pct / 100;
}

export type LegQuote = {
  firmId: string;
  name: string;
  platform: Platform;
  size: number;
  pos: number;
  leverage: number;
  feeUsd: number;
  rtPct: number;
  tpMovePct: number;
  cost: number;
  ddUsd: number;
  targetUsd: number;
  feasible: boolean;
  style: FillStyle;
};

export type CycleQuote = {
  evals: LegQuote[];
  funded: LegQuote & { neededNet: number; neededGross: number; loss: number; remaining: number; buffer: number };
  maxTpMovePct: number;
  totalCost: number;
  warnings: { tone: "red" | "yellow"; text: string }[];
};

function blankLeg(name: string): LegQuote {
  return {
    firmId: "",
    name,
    platform: "Eigenes System",
    size: 0,
    pos: 0,
    leverage: 0,
    feeUsd: 0,
    rtPct: 0,
    tpMovePct: 0,
    cost: 0,
    ddUsd: 0,
    targetUsd: 0,
    feasible: false,
    style: "market",
  };
}

function quoteEval(row: PropFirm, slot: SlotSide, slPct: number): LegQuote {
  const rt = roundTripFraction(row, slot.style);
  const openFee = rt / 2;
  const sl = slPct / 100;
  const ddUsd = slot.size * (row.maxDrawdownPct / 100);
  const targetUsd = slot.size * (row.profitTargetPct / 100);
  const denom = sl + openFee;
  const feasible = denom > 1e-8 && ddUsd > 0;
  const pos = feasible ? ddUsd / denom : 0;
  const feeUsd = pos * rt;
  const tpMovePct = pos > 0 ? ((targetUsd + feeUsd) / pos) * 100 : 0;
  const list = row.prices[slot.size] ?? 0;
  const cost = list * (1 - Math.min(100, Math.max(0, slot.discountPct)) / 100);
  return {
    firmId: row.id,
    name: row.name,
    platform: row.platform,
    size: slot.size,
    pos,
    leverage: slot.size > 0 ? pos / slot.size : 0,
    feeUsd,
    rtPct: rt * 100,
    tpMovePct,
    cost,
    ddUsd,
    targetUsd,
    feasible,
    style: slot.style,
  };
}

export function quoteCycle(store: FirmStore): CycleQuote {
  const byId = new Map(store.firms.map((row) => [row.id, row]));
  const sl = store.cycle.slMovePct;
  const sides = [store.cycle.eval1, store.cycle.eval2.enabled ? store.cycle.eval2 : null];
  const evals = sides.map((slot, index) => {
    if (!slot) return null;
    const row = byId.get(slot.firmId);
    if (!row) return { ...blankLeg(`Eval ${index + 1}`), name: "Firma fehlt" };
    return quoteEval(row, slot, sl);
  }).filter((row): row is LegQuote => row != null);

  const totalCost = evals.reduce((sum, row) => sum + row.cost, 0);
  const maxTpMovePct = evals.reduce((max, row) => Math.max(max, row.feasible ? row.tpMovePct : 0), 0);
  const fundedFirm = byId.get(store.cycle.funded.firmId);
  const fundedSlot = store.cycle.funded;
  const neededNet = totalCost + store.cycle.extraProfit;
  let funded = { ...blankLeg(fundedFirm?.name ?? "Funded"), neededNet, neededGross: 0, loss: 0, remaining: 0, buffer: fundedSlot.buffer };
  if (fundedFirm) {
    const rt = roundTripFraction(fundedFirm, fundedSlot.style);
    const slFrac = sl / 100;
    const split = fundedFirm.profitSplit / 100;
    const neededGross = split > 0 ? neededNet / split : 0;
    const denom = slFrac - rt;
    const feasible = denom > 1e-8 && neededGross >= 0;
    const pos = feasible ? neededGross / denom : 0;
    const feeUsd = pos * rt;
    const loss = pos * (maxTpMovePct / 100 + rt);
    const buffer = fundedSlot.buffer;
    funded = {
      firmId: fundedFirm.id,
      name: fundedFirm.name,
      platform: fundedFirm.platform,
      size: fundedSlot.size,
      pos,
      leverage: fundedSlot.size > 0 ? pos / fundedSlot.size : 0,
      feeUsd,
      rtPct: rt * 100,
      tpMovePct: maxTpMovePct,
      cost: 0,
      ddUsd: fundedSlot.size * (fundedFirm.maxDrawdownPct / 100),
      targetUsd: 0,
      feasible,
      style: fundedSlot.style,
      neededNet,
      neededGross,
      loss,
      remaining: buffer - loss,
      buffer,
    };
  }

  return {
    evals,
    funded,
    maxTpMovePct,
    totalCost,
    warnings: collisions(store),
  };
}

function collisions(store: FirmStore): { tone: "red" | "yellow"; text: string }[] {
  const byId = new Map(store.firms.map((row) => [row.id, row]));
  const slots = [
    { label: "Funded", slot: store.cycle.funded },
    { label: "Eval 1", slot: store.cycle.eval1 },
    store.cycle.eval2.enabled ? { label: "Eval 2", slot: store.cycle.eval2 } : null,
  ].filter((row): row is { label: string; slot: SlotSide } => row != null);
  const out: { tone: "red" | "yellow"; text: string }[] = [];
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const a = slots[i];
      const b = slots[j];
      if (!a || !b) continue;
      if (a.slot.firmId && a.slot.firmId === b.slot.firmId) {
        const name = byId.get(a.slot.firmId)?.name ?? "dieselbe Firma";
        out.push({
          tone: "red",
          text: `Achtung: ${a.label} und ${b.label} sind beide ${name}. Niemals zwei Konten desselben Hedges bei derselben Prop-Firm eröffnen.`,
        });
      }
    }
  }
  const seen = new Map<string, string[]>();
  for (const row of slots) {
    const firmRow = byId.get(row.slot.firmId);
    if (!firmRow) continue;
    const names = seen.get(firmRow.platform) ?? [];
    if (!names.includes(firmRow.name)) names.push(firmRow.name);
    seen.set(firmRow.platform, names);
  }
  for (const [platform, names] of seen) {
    if (names.length < 2) continue;
    const distinctFirms = slots.filter((row) => byId.get(row.slot.firmId)?.platform === platform);
    const ids = new Set(distinctFirms.map((row) => row.slot.firmId));
    if (ids.size < 2) continue;
    out.push({
      tone: "yellow",
      text: `${names.join(" und ")} nutzen ${platform}. Zwingend getrennte Geräte und IPs (PC-WLAN gegen Smartphone-5G) und 45 Sekunden Zeitversatz.`,
    });
  }
  return out;
}

/** ±1% and then off any round hundred, so the order book does not show a copier size. */
export function fuzzNotional(notional: number, salt: number): number {
  if (!(notional > 0)) return 0;
  const factor = 0.99 + (((salt % 1) + 1) % 1) * 0.02;
  let next = Math.round(notional * factor * 100) / 100;
  if (Math.round(next) % 50 === 0) next += 7.37 + (Math.round(salt * 17) % 9);
  return Math.round(next * 100) / 100;
}

export function blankFirm(): PropFirm {
  return firm(`firm-${Date.now()}`, "Neue Firma", "Eigenes System", 0, 0);
}

export function freshBuffer(row: PropFirm, size: AccountSize): number {
  return Math.round(size * (row.maxDrawdownPct / 100) * 100) / 100;
}
