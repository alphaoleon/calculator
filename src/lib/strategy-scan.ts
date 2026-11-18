import { bookGreeks, optionsPnlUsd, type Asset, type OptLeg, type OptSide } from "@/lib/options-sim";
import { payoutTarget, type LiveOption, type OptimizerInput } from "@/lib/phase-optimizer";

export type SetupKind = "tight" | "classic" | "blitz" | "put-debit" | "call-mirror" | "condor" | "blitz75";

export type ScannedSetup = {
  id: string;
  kind: SetupKind;
  title: string;
  expiry: string;
  dte: number;
  legs: OptLeg[];
  summary: string;
  entry: number;
  maxReturn: number;
  maxRisk: number;
  ror: number;
  breakevens: number[];
  breachNow: number;
  breachD1: number;
  breachD2: number;
  breachExp: number;
  netExp: number;
  tpNow: number;
  tpD1: number;
  netPass: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  monkey: string;
  down: number;
  up: number;
  spot: number;
  fee: number;
  failSurplus: number;
  fundedPayout: number;
  budget: number;
  propEth: number;
  shift: number;
  soldStrike: number;
  baseStrike: number;
  shiftUnitNow: number;
  shiftUnitD1: number;
};

export type FillMode = "mark" | "book";
export type ExitMode = "now" | "d1";
export type BreachHorizon = "now" | "1d" | "exp";

export type Combo = {
  evalLegs: OptLeg[];
  fundedLegs: OptLeg[];
  evalQty: number;
  fundedQty: number;
  evalLabel: string;
  fundedLabel: string;
  fee: number;
  passLoss: number;
  sunk: number;
  cashLeft: number;
  budget: number;
  failNet: number;
  fundedPayout: number;
  fundedBreach: number;
  fundedTp: number;
  fundedD1: number;
  fundedExp: number;
  failD1: number;
  failExp: number;
  evalNow: number;
  evalD1: number;
  evalExp: number;
  passNow: number;
  passD1: number;
  passAt: number;
  failTotal: number;
  passTotal: number;
  target: number;
  margin: number;
  evalMargin: number;
  evalTheta: number;
  fundedTheta: number;
  covered: boolean;
};

const KIND_TITLE: Record<SetupKind, string> = {
  tight: "ATM-Start Call",
  classic: "Breach-Call-Spread",
  blitz: "1–2d Blitz-Call",
  "put-debit": "ITM Bear Put",
  "call-mirror": "Enger ITM Bear Call",
  condor: "Zelt-Condor",
  blitz75: "7.5 ETH Blitz-Hedge",
};

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

function qtyFor(per: number, target: number): number {
  if (!(per > 0.01) || !(target > 0)) return 0.1;
  return Math.min(5_000, Math.max(0.1, Math.ceil((target / per) * 10 - 1e-8) / 10));
}

function expiryMs(code: string): number {
  const match = code.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
  if (!match || MONTHS[match[2]] == null) return Date.now();
  return Date.UTC(2000 + Number(match[3]), MONTHS[match[2]], Number(match[1]), 8, 0, 0);
}

function ymd(ms: number): string {
  const date = new Date(ms);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}${month}${day}`;
}

function num(value: number, digits = 6): string {
  return Number.isFinite(value) ? Number(value.toFixed(digits)).toString() : "0";
}

export function monkeyUrl(asset: Asset, legs: OptLeg[]): string {
  const tokens = legs.filter((leg) => leg.on && leg.name !== "UNDERLYING").map((leg) => {
    const side = leg.side === "buy" ? "L" : "S";
    const right = leg.right === "put" ? "P" : "C";
    const iv = leg.iv > 3 ? leg.iv / 100 : leg.iv;
    return [side, right, num(leg.strike), ymd(expiryMs(leg.expiry)), num(leg.premium ?? 0), num(leg.qty), num(iv, 4)].join(":");
  });
  const query = new URLSearchParams({ strategy: "custom", legs: tokens.join(";") });
  return `https://www.derivativesmonkey.com/${asset.toLowerCase()}/calculator?${query.toString()}`;
}

function fillPx(opt: LiveOption, side: OptSide, mode: FillMode): number {
  const raw = mode === "book"
    ? side === "sell"
      ? (opt.bidUsd && opt.bidUsd > 0 ? opt.bidUsd : opt.markUsd)
      : (opt.askUsd && opt.askUsd > 0 ? opt.askUsd : opt.markUsd)
    : opt.markUsd;
  if (mode !== "book") return raw;
  const spot = opt.underlying > 0 ? opt.underlying : 0;
  const fee = Math.min(spot * 0.0003, Math.max(0, raw) * 0.125);
  return side === "sell" ? Math.max(0, raw - fee) : raw + fee;
}

function leg(opt: LiveOption, side: OptSide, qty: number, mode: FillMode = "mark"): OptLeg {
  return {
    id: `${side}-${opt.name}-${qty.toFixed(1)}`,
    on: true,
    right: opt.right,
    side,
    qty,
    strike: opt.strike,
    dte: opt.dte,
    iv: opt.iv > 1 ? opt.iv : 55,
    premium: fillPx(opt, side, mode),
    mark: opt.markUsd,
    bid: opt.bidUsd ?? null,
    ask: opt.askUsd ?? null,
    name: opt.name,
    expiry: opt.expiry,
    priceMode: mode === "book" ? (side === "sell" ? "bid" : "ask") : "mark",
  };
}

function nearest(rows: LiveOption[], price: number, accept: (row: LiveOption) => boolean): LiveOption | null {
  let best: LiveOption | null = null;
  let gap = Infinity;
  for (const row of rows) {
    if (!accept(row)) continue;
    const next = Math.abs(row.strike - price);
    if (next < gap) {
      best = row;
      gap = next;
    }
  }
  return best;
}

function groupsOf(options: LiveOption[]): LiveOption[][] {
  const map = new Map<string, LiveOption[]>();
  for (const row of options) {
    if (!(row.markUsd > 0) || row.dte < 0.9 || row.dte > 7.6 || !row.name || row.name.startsWith("SYN-")) continue;
    const list = map.get(row.expiry);
    if (list) list.push(row);
    else map.set(row.expiry, [row]);
  }
  return [...map.values()].sort((a, b) => (a[0]?.dte ?? 0) - (b[0]?.dte ?? 0));
}

function entryOf(legs: OptLeg[]): number {
  return legs.reduce((sum, leg) => {
    if (!leg.on || !(leg.qty > 0)) return sum;
    const sign = leg.side === "buy" ? 1 : -1;
    return sum + sign * (leg.premium ?? 0) * leg.qty;
  }, 0);
}

function curveStats(legs: OptLeg[], spot: number, down: number, up: number, goal: number, payout: number) {
  const at = (price: number, elapsed: number) => optionsPnlUsd(legs, price, elapsed, 0, 0, spot);
  const lo = Math.min(down, spot) * 0.82;
  const hi = Math.max(up, spot) * 1.18;
  const prices: number[] = [];
  for (let i = 0; i <= 72; i += 1) prices.push(lo + ((hi - lo) * i) / 72);
  for (const leg of legs) prices.push(leg.strike);
  prices.push(down, up, spot);
  const unique = [...new Set(prices.filter((price) => price > 0))].sort((a, b) => a - b);
  const expiry = unique.map((price) => ({ price, pnl: at(price, 10_000) }));
  let maxReturn = -Infinity;
  let worst = Infinity;
  for (const row of expiry) {
    if (row.pnl > maxReturn) maxReturn = row.pnl;
    if (row.pnl < worst) worst = row.pnl;
  }
  const breakevens: number[] = [];
  for (let i = 1; i < expiry.length; i += 1) {
    const left = expiry[i - 1];
    const right = expiry[i];
    if (left.pnl === 0) breakevens.push(left.price);
    else if (left.pnl * right.pnl < 0) {
      const t = left.pnl / (left.pnl - right.pnl);
      breakevens.push(left.price + t * (right.price - left.price));
    }
  }
  const greeks = bookGreeks(legs, spot, 0, 0, 0);
  const breachExp = at(down, 10_000);
  const tpNow = at(up, 0);
  const tpD1 = at(up, 1);
  return {
    entry: entryOf(legs),
    maxReturn,
    maxRisk: Math.max(0, -worst),
    breakevens: breakevens.slice(0, 3),
    breachNow: at(down, 0),
    breachD1: at(down, 1),
    breachD2: at(down, 2),
    breachExp,
    netExp: breachExp - goal,
    tpNow,
    tpD1,
    netPass: tpD1 - goal + payout,
    delta: greeks.delta,
    gamma: greeks.gamma,
    theta: greeks.theta,
    vega: greeks.vega,
  };
}

function summarize(expiry: string, dte: number, legs: OptLeg[]): string {
  const body = legs.map((leg) => {
    const verb = leg.side === "sell" ? "SELL" : "BUY";
    const right = leg.right === "put" ? "Put" : "Call";
    return `${verb} ${leg.qty.toFixed(1)}x ${leg.strike} ${right} ($${(leg.premium ?? 0).toFixed(2)})`;
  }).join(" / ");
  return `${expiry} (${dte.toFixed(1)}d) · ${body}`;
}

function finish(
  kind: SetupKind,
  rows: LiveOption[],
  built: OptLeg[],
  input: OptimizerInput,
  down: number,
  up: number,
  goal: number,
  payout: number,
  propEth: number,
): ScannedSetup | null {
  if (built.length < 2) return null;
  const head = rows[0];
  const lead = Math.max(...built.map((leg) => leg.qty), 0.1);
  const sized = built.map((leg) => ({ ...leg, on: true, qty: Math.max(0.1, Math.round((leg.qty / lead) * 10) / 10) }));
  const stats = curveStats(sized, input.spot, down, up, goal, payout);
  if (!Number.isFinite(stats.maxReturn) || stats.breachExp <= 0.2) return null;
  const risk = stats.maxRisk;
  return {
    id: `${kind}-${propEth.toFixed(1)}-${head.expiry}-${sized.map((leg) => `${leg.side[0]}${leg.strike}${leg.right[0]}`).join("-")}`,
    kind,
    title: kind === "blitz75" ? `${propEth.toFixed(1)} ${input.asset} Blitz-Hedge` : KIND_TITLE[kind],
    expiry: head.expiry,
    dte: head.dte,
    legs: sized,
    summary: summarize(head.expiry, head.dte, sized),
    ror: risk > 1 ? (stats.maxReturn / risk) * 100 : 0,
    monkey: monkeyUrl(input.asset, sized),
    ...stats,
    down,
    up,
    spot: input.spot,
    fee: input.challengeFee,
    failSurplus: input.targetFailNetProfit,
    fundedPayout: input.accountSize * input.fundedTpPercent / 100 * (input.split > 0 ? input.split : 0.8),
    budget: input.budget,
    propEth,
    shift: 0,
    soldStrike: 0,
    baseStrike: 0,
    shiftUnitNow: 0,
    shiftUnitD1: 0,
  };
}

function grid(spot: number, listed: LiveOption[] = []) {
  const strikes = [...new Set(listed.map((row) => row.strike))].sort((a, b) => a - b);
  const near = strikes.filter((strike) => spot <= 0 || Math.abs(strike - spot) / spot < 0.35);
  const diffs: number[] = [];
  for (let index = 1; index < near.length; index += 1) {
    const gap = near[index] - near[index - 1];
    if (gap > 0) diffs.push(gap);
  }
  diffs.sort((a, b) => a - b);
  const fallback = spot >= 20_000 ? 500 : spot >= 1_000 ? 10 : spot >= 40 ? 1 : 0.5;
  const step = diffs.length ? diffs[Math.floor(diffs.length / 2)] : fallback;
  const round = (price: number) => {
    if (!strikes.length) return Math.round(price / step) * step;
    return strikes.reduce((best, strike) => (Math.abs(strike - price) < Math.abs(best - price) ? strike : best));
  };
  const d = (n: number) => Math.max(step, Math.abs(n) * (spot > 0 ? spot / 2050 : 1));
  return { step, d, round };
}

function pickBand(rows: LiveOption[], low: number, high: number, prefer: number, slack = 30): LiveOption | null {
  const lo = Math.min(low, high);
  const hi = Math.max(low, high);
  const live = rows.filter((row) => row.markUsd > 0);
  const inside = live.filter((row) => row.strike >= lo - slack * 0.05 && row.strike <= hi + slack * 0.05);
  const pool = inside.length ? inside : live.filter((row) => Math.abs(row.strike - prefer) <= slack);
  if (!pool.length) return null;
  return [...pool].sort((a, b) => Math.abs(a.strike - prefer) - Math.abs(b.strike - prefer) || a.strike - b.strike)[0] ?? null;
}

function spreadAt(calls: LiveOption[], sellPrefer: number, buyPrefer: number, mode: FillMode, g: ReturnType<typeof grid>) {
  const short = pickBand(calls, g.round(sellPrefer - g.d(10)), g.round(sellPrefer + g.d(10)), sellPrefer, g.d(30));
  const long = pickBand(calls, g.round(buyPrefer - g.d(10)), g.round(buyPrefer + g.d(20)), buyPrefer, g.d(40));
  if (!short || !long || long.strike <= short.strike + g.step * 0.5) return null;
  if (Math.abs(long.strike - buyPrefer) > g.d(40)) return null;
  const credit = fillPx(short, "sell", mode) - fillPx(long, "buy", mode);
  if (!(credit > (calls[0] && short.strike > 500 ? 0.15 : 0.02))) return null;
  return { short, long, credit };
}

function levels(input: OptimizerInput, eth: number, spot: number, hedgeUsd = input.maxDrawdownUsd) {
  const risk = hedgeUsd > 0 ? hedgeUsd : input.maxDrawdownUsd;
  const down = spot - risk / eth;
  const upEval = spot + input.evalTargetUsd / eth;
  const upFunded = spot + (input.accountSize * input.fundedTpPercent / 100) / eth;
  return { down, upEval, up: Math.max(upEval, upFunded) };
}

function ceilQty(unit: number, target: number): number {
  return qtyFor(unit, target);
}

function structures(rows: LiveOption[], input: OptimizerInput, eth: number, mode: FillMode, payout: number, alt: boolean, shift: number, hedgeUsd: number): ScannedSetup[] {
  const spot = input.spot;
  const { down, up } = levels(input, eth, spot, hedgeUsd);
  if (!(down > 0) || !(up > down)) return [];
  const dte = rows[0]?.dte ?? 0;
  const calls = rows.filter((row) => row.right === "call");
  const puts = rows.filter((row) => row.right === "put");
  const out: ScannedSetup[] = [];
  const g = grid(spot, rows);
  const sellAt = down + shift;
  const push = (kind: SetupKind, built: OptLeg[]) => {
    const card = finish(kind, rows, built, input, down, up, input.challengeFee, payout, eth);
    if (!card) return;
    stampShift(card, rows, down, shift, mode, spot);
    out.push(card);
  };
  const classic = spreadAt(calls, sellAt, up, mode, g);
  const tightPair = spreadAt(calls, g.round(spot - 10), up, mode, g);
  const blitzPair = spreadAt(calls, g.round(spot - g.d(30)), up, mode, g);
  const blitzDistinct = blitzPair && tightPair && blitzPair.short.strike === tightPair.short.strike
    ? spreadAt(calls, g.round(spot), up, mode, g)
    : blitzPair;
  if (alt) {
    const hedge = blitzDistinct ?? tightPair ?? classic;
    if (hedge && dte <= 2.4) push("blitz75", [leg(hedge.short, "sell", 1, mode), leg(hedge.long, "buy", 1, mode)]);
    return out;
  }
  if (classic) push("classic", [leg(classic.short, "sell", 1, mode), leg(classic.long, "buy", 1, mode)]);
  if (tightPair && (!classic || tightPair.short.strike !== classic.short.strike)) push("tight", [leg(tightPair.short, "sell", 1, mode), leg(tightPair.long, "buy", 1, mode)]);
  if (dte <= 2.2 && blitzDistinct && (!tightPair || blitzDistinct.short.strike !== tightPair.short.strike || blitzDistinct.long.strike !== tightPair.long.strike)) {
    push("blitz", [leg(blitzDistinct.short, "sell", 1, mode), leg(blitzDistinct.long, "buy", 1, mode)]);
  }
  if (classic) {
    const sellPut = pickBand(puts, g.round(sellAt - g.d(10)), g.round(sellAt + g.d(10)), sellAt, g.d(30));
    const buyPut = sellPut ? pickBand(puts, sellPut.strike - g.d(100), sellPut.strike - g.d(50), sellPut.strike - g.d(80), g.d(40)) : null;
    if (sellPut && buyPut && sellPut.strike > buyPut.strike + g.d(40) && fillPx(sellPut, "sell", mode) > fillPx(buyPut, "buy", mode)) {
      push("condor", [
        leg(classic.short, "sell", 1, mode),
        leg(classic.long, "buy", 1, mode),
        leg(sellPut, "sell", 0.3, mode),
        leg(buyPut, "buy", 0.3, mode),
      ]);
    }
  }
  const longPut = pickBand(puts, g.round(spot + g.d(10) + shift), g.round(spot + g.d(20) + shift), spot + g.d(15) + shift, g.d(20));
  const shortPut = pickBand(puts, g.round(sellAt), g.round(sellAt + g.d(20)), sellAt, g.d(30));
  if (longPut && shortPut && longPut.strike > shortPut.strike + g.step * 0.5) {
    const debit = fillPx(longPut, "buy", mode) - fillPx(shortPut, "sell", mode);
    if (debit > 0 && longPut.strike - shortPut.strike - debit > 0.4) push("put-debit", [leg(longPut, "buy", 1, mode), leg(shortPut, "sell", 1, mode)]);
    const lowCall = calls.find((row) => row.strike === shortPut.strike);
    const highCall = calls.find((row) => row.strike === longPut.strike);
    if (lowCall && highCall && highCall.strike > lowCall.strike) push("call-mirror", [leg(lowCall, "sell", 1, mode), leg(highCall, "buy", 1, mode)]);
  }
  return out;
}

function stampShift(card: ScannedSetup, rows: LiveOption[], down: number, shift: number, mode: FillMode, spot: number) {
  const sells = card.legs.filter((leg) => leg.side === "sell");
  const prefer = card.kind === "put-debit" ? "put" : "call";
  const pool = sells.filter((leg) => leg.right === prefer);
  const sold = [...(pool.length ? pool : sells)].sort((a, b) => Math.abs(a.strike - (down + shift)) - Math.abs(b.strike - (down + shift)))[0];
  if (!sold) return;
  const g = grid(spot);
  const same = rows.filter((row) => row.right === sold.right && row.expiry === card.expiry);
  const base = pickBand(same, g.round(down - g.d(10)), g.round(down + g.d(15)), down, g.d(40));
  card.shift = shift;
  card.soldStrike = sold.strike;
  card.baseStrike = base?.strike ?? g.round(down);
  if (!base || Math.abs(base.strike - sold.strike) < 0.01) return;
  const swapped = card.legs.map((item) => item.side === sold.side && item.right === sold.right && item.strike === sold.strike ? leg(base, "sell", item.qty, mode) : item);
  card.shiftUnitNow = optionsPnlUsd(card.legs, down, 0, 0, 0, spot) - optionsPnlUsd(swapped, down, 0, 0, 0, spot);
  card.shiftUnitD1 = optionsPnlUsd(card.legs, down, 1, 0, 0, spot) - optionsPnlUsd(swapped, down, 1, 0, 0, spot);
}

export function pickAutoShift(input: OptimizerInput, options: LiveOption[], mode: FillMode, hedgeUsd: number): number {
  const groups = groupsOf(options);
  const group = groups.find((rows) => {
    const dte = rows[0]?.dte ?? 99;
    return dte >= 1 && dte <= 3;
  }) ?? groups[0];
  if (!group || !(input.spot > 0)) return 20;
  const eth = input.propEth > 0 ? input.propEth : 5;
  const { down, up } = levels(input, eth, input.spot, hedgeUsd);
  const g = grid(input.spot);
  const calls = group.filter((row) => row.right === "call");
  let best = 20;
  let score = -Infinity;
  for (const shift of [0, 10, 20, 30]) {
    const pair = spreadAt(calls, down + shift, up, mode, g);
    if (!pair) continue;
    const book = [leg(pair.short, "sell", 1, mode), leg(pair.long, "buy", 1, mode)];
    const value = optionsPnlUsd(book, down, 0, 0, 0, input.spot) + optionsPnlUsd(book, down, 1, 0, 0, input.spot);
    if (value > score) {
      score = value;
      best = shift;
    }
  }
  return best;
}

export function scanSetups(input: OptimizerInput, options: LiveOption[], payout = 0, mode: FillMode = "mark", shift = 0, hedgeUsd = input.maxDrawdownUsd, horizon: BreachHorizon = "1d"): { rows: ScannedSetup[]; sunk: number; goal: number } {
  const spot = input.spot;
  const empty = { rows: [] as ScannedSetup[], sunk: Math.max(0, input.challengeFee), goal: Math.max(0, input.challengeFee) };
  if (!(spot > 0)) return empty;
  const scale = Math.max(0.2, input.accountSize / 5000);
  const mainEth = input.propEth > 0 ? input.propEth : Math.round(5 * scale * 10) / 10;
  const blitzEth = Math.round(7.5 * scale * 10) / 10;
  const main = levels(input, mainEth, spot, hedgeUsd);
  const groups = groupsOf(options);
  if (!groups.length || !(main.down > 0)) return empty;

  let sunk = Math.max(0, input.challengeFee);
  const seed = horizon === "1d"
    ? groups.find((rows) => { const dte = rows[0]?.dte ?? 99; return dte >= 1 && dte <= 1.6; }) ?? groups.find((rows) => (rows[0]?.dte ?? 99) <= 2.2)
    : groups.find((rows) => (rows[0]?.dte ?? 0) >= 1.6);
  if (seed) {
    const pair = spreadAt(seed.filter((row) => row.right === "call"), main.down + shift, main.up, mode, grid(spot));
    if (pair) {
      const unit = [leg(pair.short, "sell", 1, mode), leg(pair.long, "buy", 1, mode)];
      const per = optionsPnlUsd(unit, main.down, 1, 0, 0, spot);
      const q1 = ceilQty(per, input.challengeFee);
      const phase1 = [leg(pair.short, "sell", q1, mode), leg(pair.long, "buy", q1, mode)];
      const loss = optionsPnlUsd(phase1, main.upEval, 1, 0, 0, spot);
      sunk = Math.max(0, input.challengeFee) + Math.abs(Math.min(0, loss));
    }
  }
  const goal = payoutTarget({ ...input, sunkOverride: input.sunkOverride }, sunk);
  const found: ScannedSetup[] = [];
  for (const rows of groups) found.push(...structures(rows, input, mainEth, mode, payout, false, shift, hedgeUsd));
  if (Math.abs(blitzEth - mainEth) > 0.25) {
    for (const rows of groups) {
      if ((rows[0]?.dte ?? 99) > 2.4) continue;
      found.push(...structures(rows, input, blitzEth, mode, payout, true, shift, hedgeUsd));
    }
  }

  const unique = new Map<string, ScannedSetup>();
  for (const row of found) if (!unique.has(row.id)) unique.set(row.id, row);
  const pool = [...unique.values()];
  const band = (row: ScannedSetup) => horizon === "1d" ? (row.dte >= 1 && row.dte <= 1.6 ? 0 : row.dte < 1 ? 1 : row.dte <= 2.2 ? 2 : 3) : 0;
  const byFit = (a: ScannedSetup, b: ScannedSetup) => band(a) - band(b) || earlyScore(b, horizon) - earlyScore(a, horizon);
  const kinds: SetupKind[] = ["blitz", "blitz75", "tight", "put-debit", "call-mirror", "classic", "condor"];
  const picked: ScannedSetup[] = [];
  for (const kind of kinds) {
    const best = pool.filter((row) => row.kind === kind).sort(byFit)[0];
    if (best) picked.push(best);
  }
  const rest = pool.filter((row) => !picked.includes(row)).sort(byFit);
  for (const row of rest) {
    if (picked.length >= 14) break;
    picked.push(row);
  }
  picked.sort(byFit);
  return { rows: picked.slice(0, 14), sunk, goal };
}

function labelOf(legs: OptLeg[], qty: number): string {
  const bits = legs.map((row) => `${row.side === "sell" ? "SELL" : "BUY"} ${row.strike} ${row.right === "put" ? "Put" : "Call"}`);
  return `${qty.toFixed(1)}x ${bits.join(" / ")}`;
}

function elapsedOf(horizon: BreachHorizon): number {
  return horizon === "now" ? 0 : horizon === "1d" ? 1 : 10_000;
}

function scaleLead(legs: OptLeg[], leadQty: number): OptLeg[] {
  const lead = Math.max(...legs.map((leg) => leg.qty), 0.1);
  return legs.map((leg) => ({
    ...leg,
    on: true,
    id: `${leg.id}-q${leadQty.toFixed(1)}`,
    qty: Math.max(0.1, Math.round((leg.qty / lead) * leadQty * 10) / 10),
  }));
}

function at(legs: OptLeg[], price: number, horizon: BreachHorizon, spot: number): number {
  return optionsPnlUsd(legs, price, elapsedOf(horizon), 0, 0, spot);
}

export function comboFor(row: ScannedSetup, horizon: BreachHorizon, cycle2: boolean, feeRefund = false): Combo {
  const unitLegs = scaleLead(row.legs, 1);
  const unitNow = at(unitLegs, row.down, "now", row.spot);
  const unitD1 = at(unitLegs, row.down, "1d", row.spot);
  const unitExp = at(unitLegs, row.down, "exp", row.spot);
  const unitAt = horizon === "now" ? unitNow : horizon === "1d" ? unitD1 : unitExp;
  const evalQty = unitAt > 0.01 ? qtyFor(unitAt, row.fee) : 0;
  const evalLegs = scaleLead(row.legs, evalQty > 0 ? evalQty : 1);
  const passNow = at(evalLegs, row.up, "now", row.spot);
  const passD1 = at(evalLegs, row.up, "1d", row.spot);
  const passAt = at(evalLegs, row.up, horizon, row.spot);
  const passLoss = Math.abs(Math.min(0, passAt));
  const sunk = cycle2 ? 0 : row.fee + passLoss;
  const target = cycle2 ? Math.max(1, row.failSurplus) : sunk + Math.max(0, row.failSurplus);
  let fundedQty = ceilQty(unitAt, target);
  if (cycle2) fundedQty = Math.min(1, Math.max(0.8, fundedQty));
  const fundedLegs = scaleLead(row.legs, fundedQty);
  const evalNow = at(evalLegs, row.down, "now", row.spot);
  const evalD1 = at(evalLegs, row.down, "1d", row.spot);
  const evalExp = at(evalLegs, row.down, "exp", row.spot);
  const fundedD1 = at(fundedLegs, row.down, "1d", row.spot);
  const fundedExp = at(fundedLegs, row.down, "exp", row.spot);
  const fundedTp = at(fundedLegs, row.up, horizon === "exp" ? "now" : horizon, row.spot);
  const chosen = horizon === "now" ? evalNow : horizon === "1d" ? evalD1 : evalExp;
  const floor = optionsPnlUsd(fundedLegs, row.spot * 0.82, 10_000, 0, 0, row.spot);
  const evalMargin = Math.max(0, -at(evalLegs, row.up, "exp", row.spot), -optionsPnlUsd(evalLegs, row.spot * 1.15, 10_000, 0, 0, row.spot));
  return {
    evalLegs,
    fundedLegs,
    evalQty,
    fundedQty,
    evalLabel: labelOf(evalLegs, evalQty),
    fundedLabel: labelOf(fundedLegs, fundedQty),
    fee: row.fee,
    passLoss,
    sunk,
    cashLeft: row.budget - sunk,
    budget: row.budget,
    failNet: chosen - row.fee,
    fundedPayout: row.fundedPayout,
    fundedBreach: fundedExp,
    fundedTp,
    fundedD1,
    fundedExp,
    failD1: fundedD1 - sunk,
    failExp: fundedExp - sunk,
    evalNow,
    evalD1,
    evalExp,
    passNow,
    passD1,
    passAt,
    failTotal: (horizon === "now" ? at(fundedLegs, row.down, "now", row.spot) : horizon === "1d" ? fundedD1 : fundedExp) - sunk,
    passTotal: row.fundedPayout + fundedTp - sunk + (feeRefund && !cycle2 ? row.fee : 0),
    target,
    margin: Math.max(0, -Math.min(floor, fundedTp, 0)),
    evalMargin,
    evalTheta: bookGreeks(evalLegs, row.spot, 0, 0, 0).theta,
    fundedTheta: bookGreeks(fundedLegs, row.spot, 0, 0, 0).theta,
    covered: evalQty > 0 && chosen + 0.5 >= row.fee,
  };
}

export function dualRank(stop: number, tp: number): number {
  return (stop > 0 && tp > 0 ? 1_000_000 : 0) + stop + tp;
}

export function earlyScore(row: ScannedSetup, horizon: BreachHorizon): number {
  const unitLegs = scaleLead(row.legs, 1);
  const breach = at(unitLegs, row.down, horizon, row.spot);
  const pass = Math.abs(Math.min(0, at(unitLegs, row.up, horizon, row.spot)));
  if (!(breach > 0.2)) return -1;
  const boost = horizon === "exp"
    ? (row.dte <= 2.2 ? 1.15 : 1)
    : (row.dte >= 1 && row.dte <= 1.6 ? 2.8 : row.dte <= 2.2 ? 0.9 : 0.35);
  return (breach / Math.max(1, pass)) * boost;
}

export function evalHorizonEnds(row: ScannedSetup, horizon: BreachHorizon, cycle2: boolean): { stop: number; tp: number } {
  const combo = comboFor(row, horizon, cycle2);
  const days = elapsedOf(horizon);
  return {
    stop: optionsPnlUsd(combo.evalLegs, row.down, days, 0, 0, row.spot) - combo.fee,
    tp: optionsPnlUsd(combo.evalLegs, row.up, days, 0, 0, row.spot),
  };
}

export function fundedHorizonEnds(row: ScannedSetup, legs: OptLeg[], horizon: BreachHorizon, sunk: number, feeRefund = false): { stop: number; tp: number } {
  const days = elapsedOf(horizon);
  const optTp = optionsPnlUsd(legs, row.up, days, 0, 0, row.spot);
  return {
    stop: optionsPnlUsd(legs, row.down, days, 0, 0, row.spot) - sunk,
    tp: row.fundedPayout + optTp - sunk + (feeRefund ? row.fee : 0),
  };
}

export function bestSetup(rows: ScannedSetup[], horizon: BreachHorizon = "1d", eth = 0, cycle2 = false): ScannedSetup | null {
  const pool = eth > 0 ? rows.filter((row) => Math.abs(row.propEth - eth) <= Math.max(0.35, eth * 0.03)) : rows;
  const use = pool.length ? pool : rows;
  return [...use].sort((a, b) => {
    const left = evalHorizonEnds(a, horizon, cycle2);
    const right = evalHorizonEnds(b, horizon, cycle2);
    return dualRank(right.stop, right.tp) - dualRank(left.stop, left.tp);
  })[0] ?? null;
}

export type FundedFit = {
  legs: OptLeg[];
  qty: number;
  breach: number;
  d1: number;
  exp: number;
  tp: number;
  failD1: number;
  failExp: number;
  passTotal: number;
  margin: number;
  covered: boolean;
};

export function fitFunded(row: ScannedSetup, horizon: BreachHorizon, sunk: number, cycle2: boolean, feeRefund = false): FundedFit | null {
  const unitLegs = scaleLead(row.legs, 1);
  const unitAt = at(unitLegs, row.down, horizon, row.spot);
  if (!(unitAt > 0.01)) return null;
  const surplus = Math.max(0, row.failSurplus);
  const target = cycle2 ? Math.max(1, surplus) : Math.max(0, sunk) + surplus;
  let qty = ceilQty(unitAt, target);
  if (cycle2) qty = Math.min(1, Math.max(0.8, qty));
  const legs = scaleLead(row.legs, qty);
  const breach = at(legs, row.down, horizon, row.spot);
  const d1 = at(legs, row.down, "1d", row.spot);
  const exp = at(legs, row.down, "exp", row.spot);
  const tp = at(legs, row.up, horizon === "exp" ? "now" : horizon, row.spot);
  const floor = optionsPnlUsd(legs, row.spot * 0.82, 10_000, 0, 0, row.spot);
  return {
    legs,
    qty,
    breach,
    d1,
    exp,
    tp,
    failD1: d1 - sunk,
    failExp: exp - sunk,
    passTotal: row.fundedPayout + tp - sunk + (feeRefund && !cycle2 ? row.fee : 0),
    margin: Math.max(0, -Math.min(floor, tp, 0)),
    covered: cycle2 || breach + 0.5 >= target,
  };
}

export function bestFunded(rows: ScannedSetup[], horizon: BreachHorizon, sunk: number, cycle2: boolean, eth = 0, feeRefund = false): ScannedSetup | null {
  const ranked = rows
    .map((row) => ({ row, fit: fitFunded(row, horizon, sunk, cycle2, feeRefund) }))
    .filter((item): item is { row: ScannedSetup; fit: FundedFit } => Boolean(item.fit))
    .sort((a, b) => {
      const left = fundedHorizonEnds(a.row, a.fit.legs, horizon, sunk, feeRefund && !cycle2);
      const right = fundedHorizonEnds(b.row, b.fit.legs, horizon, sunk, feeRefund && !cycle2);
      return dualRank(right.stop, right.tp) - dualRank(left.stop, left.tp);
    });
  const green = ranked.filter((item) => {
    const ends = fundedHorizonEnds(item.row, item.fit.legs, horizon, sunk, feeRefund && !cycle2);
    return ends.stop > 0 && ends.tp > 0;
  });
  const pick = (list: typeof ranked) => {
    if (!list.length) return null;
    if (!(eth > 0)) return list[0]?.row ?? null;
    return list.find((item) => Math.abs(item.row.propEth - eth) <= Math.max(0.35, eth * 0.03))?.row ?? list[0]?.row ?? null;
  };
  return pick(green) ?? pick(ranked);
}

export function pairCombo(evalRow: ScannedSetup, fundedRow: ScannedSetup, horizon: BreachHorizon, cycle2: boolean, feeRefund = false): Combo {
  const base = comboFor(evalRow, horizon, cycle2, feeRefund);
  if (fundedRow.id === evalRow.id) return base;
  const fit = fitFunded(fundedRow, horizon, base.sunk, cycle2, feeRefund);
  if (!fit) return base;
  return {
    ...base,
    fundedLegs: fit.legs,
    fundedQty: fit.qty,
    fundedLabel: labelOf(fit.legs, fit.qty),
    fundedBreach: fit.exp,
    fundedTp: fit.tp,
    fundedD1: fit.d1,
    fundedExp: fit.exp,
    failD1: fit.failD1,
    failExp: fit.failExp,
    failTotal: fit.breach - base.sunk,
    passTotal: fit.passTotal,
    margin: fit.margin,
    fundedTheta: bookGreeks(fit.legs, fundedRow.spot, 0, 0, 0).theta,
    cashLeft: base.budget - base.sunk,
  };
}

export type TradePlan = {
  key: string;
  evalRow: ScannedSetup;
  fundedRow: ScannedSetup;
  combo: Combo;
  fundedGross: number;
  fundedNet: number;
  tpPrice: number;
  green: boolean;
  score: number;
};

function grossSteps(account: number, baseGross: number): number[] {
  const scale = Math.max(account, 500) / 5000;
  const steps = [450, 500, 525, 550].map((value) => Math.round(value * scale));
  return [...new Set([Math.round(baseGross), ...steps])].sort((a, b) => a - b);
}

function priceForGross(row: ScannedSetup, gross: number, side: "long" | "short"): number {
  const dist = gross / Math.max(row.propEth, 0.01);
  return side === "short" ? row.spot - dist : row.spot + dist;
}

export type SkewView = {
  low: number;
  high: number;
  width: number;
  expiry: string;
  putDebit: number;
  putMax: number;
  putIv: number;
  putSlip: number;
  callCredit: number;
  callRisk: number;
  callIv: number;
  callSlip: number;
  callBetter: boolean;
  advantage: number;
};

export function skewView(rows: ScannedSetup[]): SkewView | null {
  const put = rows.find((row) => row.kind === "put-debit");
  if (!put) return null;
  const low = Math.min(...put.legs.map((leg) => leg.strike));
  const high = Math.max(...put.legs.map((leg) => leg.strike));
  const call = rows.find((row) => row.kind === "call-mirror" && row.expiry === put.expiry && Math.abs(Math.min(...row.legs.map((leg) => leg.strike)) - low) < 0.01 && Math.abs(Math.max(...row.legs.map((leg) => leg.strike)) - high) < 0.01);
  if (!call) return null;
  const buy = put.legs.find((leg) => leg.side === "buy");
  const sell = put.legs.find((leg) => leg.side === "sell");
  const callSell = call.legs.find((leg) => leg.side === "sell");
  const callBuy = call.legs.find((leg) => leg.side === "buy");
  if (!buy || !sell || !callSell || !callBuy) return null;
  const mark = (leg: OptLeg) => leg.mark ?? leg.premium ?? 0;
  const putDebit = mark(buy) - mark(sell);
  const callCredit = mark(callSell) - mark(callBuy);
  const width = high - low;
  const slip = (legs: OptLeg[]) => legs.reduce((sum, leg) => sum + (leg.ask != null && leg.bid != null && leg.ask > leg.bid ? leg.ask - leg.bid : 0), 0);
  const iv = (legs: OptLeg[]) => {
    const used = legs.filter((leg) => leg.iv > 0);
    return used.length ? used.reduce((sum, leg) => sum + leg.iv, 0) / used.length : 0;
  };
  return {
    low,
    high,
    width,
    expiry: put.expiry,
    putDebit,
    putMax: width - putDebit,
    putIv: iv(put.legs),
    putSlip: slip(put.legs),
    callCredit,
    callRisk: width - callCredit,
    callIv: iv(call.legs),
    callSlip: slip(call.legs),
    callBetter: callCredit > width - putDebit,
    advantage: Math.abs(callCredit - (width - putDebit)),
  };
}

function strikeKey(legs: OptLeg[]): string {
  return [...legs].sort((a, b) => a.strike - b.strike).map((leg) => `${leg.side[0]}${Math.round(leg.strike)}${leg.right[0]}`).join("/");
}

export function buildPlans(
  rows: ScannedSetup[],
  horizon: BreachHorizon,
  cycle2: boolean,
  feeRefund: boolean,
  account: number,
  split: number,
  baseGross: number,
  eth: number,
  side: "long" | "short",
): TradePlan[] {
  const scale = Math.max(account, 500) / 5000;
  const minGreen = 20 * scale;
  const tol = Math.max(0.35, eth * 0.03);
  const same = eth > 0 ? rows.filter((row) => Math.abs(row.propEth - eth) <= tol) : rows;
  const pool = same.length ? same : rows;
  const short = pool.filter((row) => row.dte >= 0.8 && row.dte <= 2.4);
  const use = horizon === "1d" && short.length ? short : pool;
  const plans: TradePlan[] = [];
  const bestPartner = (evalRow: ScannedSetup, base: Combo, sameKind: boolean, strict: boolean) => {
    let winner: TradePlan | null = null;
    for (const fundedRow of use) {
      if ((fundedRow.kind === evalRow.kind) !== sameKind) continue;
      const plan = balancePair(evalRow, fundedRow, base, horizon, cycle2, feeRefund, account, split, baseGross, side, minGreen, strict);
      if (!plan) continue;
      const sameStrikes = strikeKey(plan.combo.evalLegs) === strikeKey(plan.combo.fundedLegs) && plan.evalRow.expiry === plan.fundedRow.expiry;
      const pureBonus = sameKind ? 40_000 + (sameStrikes ? 5_000 : 0) : 0;
      plan.score += pureBonus;
      if (!winner || plan.score > winner.score) winner = plan;
    }
    return winner;
  };
  const consider = (strict: boolean) => {
    for (const evalRow of use) {
      const base = comboFor(evalRow, horizon, cycle2, feeRefund);
      if (!(base.evalQty > 0) || base.failNet < -0.5) continue;
      const pure = bestPartner(evalRow, base, true, strict);
      const hybrid = bestPartner(evalRow, base, false, strict);
      if (pure) plans.push(pure);
      if (hybrid && (!pure || strikeKey(hybrid.combo.fundedLegs) !== strikeKey(pure.combo.fundedLegs))) plans.push(hybrid);
    }
  };
  consider(true);
  if (!plans.some((plan) => plan.green)) consider(false);
  const ranked = plans.sort((a, b) => Number(b.green) - Number(a.green) || b.score - a.score);
  const picked: TradePlan[] = [];
  const seen = new Set<string>();
  const take = (plan: TradePlan) => {
    const evalKey = `${strikeKey(plan.combo.evalLegs)}@${plan.evalRow.expiry}`;
    const key = `${evalKey}>${strikeKey(plan.combo.fundedLegs)}@${plan.fundedRow.expiry}`;
    const twin = picked.some((have) => strikeKey(have.combo.evalLegs) === strikeKey(plan.combo.evalLegs) && have.evalRow.expiry === plan.evalRow.expiry && have.evalRow.kind !== plan.evalRow.kind);
    if (seen.has(key) || twin || picked.length >= 5) return;
    seen.add(key);
    picked.push(plan);
  };
  for (const plan of ranked) if (plan.evalRow.kind === plan.fundedRow.kind) take(plan);
  for (const plan of ranked) take(plan);
  const mirror = ranked.find((plan) => plan.evalRow.kind === "call-mirror" && plan.fundedRow.kind === "call-mirror");
  if (mirror) {
    const rest = picked.filter((plan) => plan.key !== mirror.key);
    rest.splice(Math.min(1, rest.length), 0, mirror);
    return rest.slice(0, 5);
  }
  return picked;
}

function balancePair(
  evalRow: ScannedSetup,
  fundedRow: ScannedSetup,
  base: Combo,
  horizon: BreachHorizon,
  cycle2: boolean,
  feeRefund: boolean,
  account: number,
  split: number,
  baseGross: number,
  side: "long" | "short",
  minGreen: number,
  strict: boolean,
): TradePlan | null {
  const unitLegs = scaleLead(fundedRow.legs, 1);
  const unitAt = at(unitLegs, fundedRow.down, horizon, fundedRow.spot);
  if (!(unitAt > 0.01)) return null;
  let qty = cycle2 ? Math.min(1, Math.max(0.8, ceilQty(unitAt, Math.max(1, fundedRow.failSurplus)))) : ceilQty(unitAt, base.sunk + minGreen);
  const quote = (q: number, gross: number) => {
    const legs = scaleLead(fundedRow.legs, q);
    const fail = at(legs, fundedRow.down, horizon, fundedRow.spot) - base.sunk;
    const failExp = at(legs, fundedRow.down, "exp", fundedRow.spot) - base.sunk;
    const price = priceForGross(fundedRow, gross, side);
    const optTp = at(legs, price, horizon === "exp" ? "now" : horizon, fundedRow.spot);
    const net = gross * Math.max(split, 0);
    const refund = feeRefund && !cycle2 ? base.fee : 0;
    const pass = net + optTp - base.sunk + refund;
    return { legs, fail, failExp, optTp, net, pass, price, gross };
  };
  let chosen = quote(qty, baseGross);
  for (let step = 0; step < 12 && chosen.pass < minGreen && chosen.fail > minGreen + 8; step += 1) {
    const nextQty = Math.round((chosen.legs[0] ? qty - 0.2 : qty) * 10) / 10;
    if (nextQty < 0.4) break;
    const next = quote(nextQty, baseGross);
    if (next.fail < minGreen) break;
    qty = nextQty;
    chosen = next;
  }
  if (chosen.pass < minGreen) {
    for (const gross of grossSteps(account, baseGross)) {
      if (gross <= chosen.gross + 0.5 && gross !== baseGross) continue;
      const next = quote(qty, gross);
      if (next.pass > chosen.pass) chosen = next;
      if (next.pass >= minGreen && next.fail >= minGreen) break;
    }
  }
  const evalNet = (horizon === "now" ? base.evalNow : horizon === "1d" ? base.evalD1 : base.evalExp) - base.fee;
  const stopGain = evalNet + base.fee;
  const ratio = base.passLoss / Math.max(stopGain, 1);
  const green = evalNet >= -0.5 && chosen.fail >= minGreen && chosen.pass >= minGreen;
  if (strict && !green) return null;
  if (base.failNet < -0.5) return null;
  const combo: Combo = {
    ...base,
    fundedLegs: chosen.legs,
    fundedQty: qty,
    fundedLabel: labelOf(chosen.legs, qty),
    fundedPayout: chosen.net,
    fundedTp: chosen.optTp,
    fundedD1: at(chosen.legs, fundedRow.down, "1d", fundedRow.spot),
    fundedExp: at(chosen.legs, fundedRow.down, "exp", fundedRow.spot),
    failD1: at(chosen.legs, fundedRow.down, "1d", fundedRow.spot) - base.sunk,
    failExp: chosen.failExp,
    failTotal: chosen.fail,
    passTotal: chosen.pass,
    margin: Math.max(0, -Math.min(chosen.optTp, 0)),
  };
  return {
    key: `${evalRow.id}__${fundedRow.id}__${chosen.gross}`,
    evalRow,
    fundedRow,
    combo,
    fundedGross: chosen.gross,
    fundedNet: chosen.net,
    tpPrice: chosen.price,
    green,
    score: (green ? 1_000_000 : 0) - ratio * 10_000 + chosen.fail + chosen.pass,
  };
}
