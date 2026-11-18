import { optionsPnlUsd, type Asset, type OptLeg, type OptRight, type OptSide } from "@/lib/options-sim";

export type PhaseId = "eval" | "funded";
export type CardId = "allround" | "blitz" | "theta";

export type LiveOption = {
  name: string;
  expiry: string;
  dte: number;
  strike: number;
  right: OptRight;
  iv: number;
  markUsd: number;
  bidUsd?: number | null;
  askUsd?: number | null;
  underlying: number;
};

export type OptimizerInput = {
  phase: PhaseId;
  spot: number;
  asset: Asset;
  accountSize: number;
  challengeFee: number;
  maxDrawdownUsd: number;
  evalTargetUsd: number;
  fundedTpPercent: number;
  targetFailNetProfit: number;
  split: number;
  sunkOverride: number | null;
  budget: number;
  propEth: number;
};

export type ScanCard = {
  id: CardId;
  title: string;
  blurb: string;
  dte: number;
  expiry: string;
  propEth: number;
  qtyCall: number;
  qtyPut: number;
  legs: OptLeg[];
  down: number;
  up: number;
  downMove: number;
  upMove: number;
  phase1Qty: number;
  phase1PassLoss: number;
  sunk: number;
  breachNow: number;
  breachD1: number;
  breachD2: number;
  breachExp: number;
  thetaBonus: number;
  tpNow: number;
  tpD1: number;
  tpExp: number;
  fundedGross: number;
  fundedNet: number;
  netAtFail: number;
  netAtTp: number;
  margin: number;
  floor: number;
  floorOk: boolean;
  thetaDay: number;
  credit: number;
};

const SPLIT = 0.8;

export function fundedGross(accountSize: number, percent: number): number {
  return Math.max(0, accountSize) * Math.max(0, percent) / 100;
}

export function payoutTarget(input: OptimizerInput, sunk: number): number {
  if (input.phase === "eval") return Math.max(0, input.challengeFee);
  const base = input.sunkOverride != null && input.sunkOverride >= 0 ? input.sunkOverride : sunk;
  return base + Math.max(0, input.targetFailNetProfit);
}

function qtyFor(credit: number, target: number): number {
  if (!(credit > 0.05) || !(target > 0)) return 0.1;
  return Math.min(80, Math.max(0.1, Math.ceil((target / credit) * 10 - 1e-8) / 10));
}

function legOf(opt: LiveOption, side: OptSide, qty: number): OptLeg {
  return {
    id: `${side}-${opt.name}`,
    on: true,
    right: opt.right,
    side,
    qty,
    strike: opt.strike,
    dte: opt.dte,
    iv: opt.iv > 1 ? opt.iv : 55,
    premium: opt.markUsd,
    name: opt.name,
    expiry: opt.expiry,
    priceMode: "mark",
  };
}

function pnl(legs: OptLeg[], price: number, elapsed: number, spot: number): number {
  return optionsPnlUsd(legs, price, elapsed, 0, 0, spot);
}

function byExpiry(options: LiveOption[]): Map<string, LiveOption[]> {
  const map = new Map<string, LiveOption[]>();
  for (const row of options) {
    if (!(row.markUsd > 0) || !(row.dte > 0) || !row.name || row.name.startsWith("SYN-")) continue;
    const list = map.get(row.expiry);
    if (list) list.push(row);
    else map.set(row.expiry, [row]);
  }
  return map;
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

function metrics(
  input: OptimizerInput,
  shape: { id: CardId; title: string; blurb: string; propEth: number; down: number; up: number; evalUp: number },
  shortCall: LiveOption,
  longCall: LiveOption,
  sellPut: LiveOption | null,
  buyPut: LiveOption | null,
  qtyCall: number,
  qtyPut: number,
): ScanCard {
  const spot = input.spot;
  const credit = shortCall.markUsd - longCall.markUsd;
  const q1 = qtyFor(credit, input.challengeFee);
  const phase1 = [legOf(shortCall, "sell", q1), legOf(longCall, "buy", q1)];
  const hold = Math.min(1, Math.max(0, shortCall.dte - 0.02));
  const phase1PassLoss = pnl(phase1, shape.evalUp, hold, spot);
  const sunk = Math.max(0, input.challengeFee) + Math.abs(Math.min(0, phase1PassLoss));
  const legs = [
    legOf(shortCall, "sell", qtyCall),
    legOf(longCall, "buy", qtyCall),
  ];
  if (sellPut && buyPut && qtyPut > 0) {
    legs.push(legOf(sellPut, "sell", qtyPut), legOf(buyPut, "buy", qtyPut));
  }
  const breachNow = pnl(legs, shape.down, 0, spot);
  const breachD1 = pnl(legs, shape.down, Math.min(1, shortCall.dte), spot);
  const breachD2 = pnl(legs, shape.down, Math.min(2, shortCall.dte), spot);
  const breachExp = pnl(legs, shape.down, shortCall.dte + 1, spot);
  const tpNow = pnl(legs, shape.up, 0, spot);
  const tpD1 = pnl(legs, shape.up, hold, spot);
  const tpExp = pnl(legs, shape.up, shortCall.dte + 1, spot);
  const gross = fundedGross(input.accountSize, input.fundedTpPercent);
  const fundedNet = gross * (input.split > 0 ? input.split : SPLIT);
  const width = sellPut && buyPut ? sellPut.strike - buyPut.strike : 0;
  const putCredit = sellPut && buyPut ? (sellPut.markUsd - buyPut.markUsd) * qtyPut : 0;
  const floor = credit * qtyCall + putCredit - width * qtyPut;
  return {
    id: shape.id,
    title: shape.title,
    blurb: shape.blurb,
    dte: shortCall.dte,
    expiry: shortCall.expiry,
    propEth: shape.propEth,
    qtyCall,
    qtyPut,
    legs,
    down: shape.down,
    up: shape.up,
    downMove: Math.abs(spot - shape.down),
    upMove: Math.abs(shape.up - spot),
    phase1Qty: q1,
    phase1PassLoss,
    sunk,
    breachNow,
    breachD1,
    breachD2,
    breachExp,
    thetaBonus: breachExp - breachNow,
    tpNow,
    tpD1,
    tpExp,
    fundedGross: gross,
    fundedNet,
    netAtFail: breachExp - (input.phase === "eval" ? input.challengeFee : (input.sunkOverride ?? sunk)),
    netAtTp: input.phase === "funded" ? fundedNet + tpD1 - (input.sunkOverride ?? sunk) : tpD1,
    margin: Math.max(0, (longCall.strike - shortCall.strike - credit) * qtyCall, width * qtyPut - putCredit),
    floor,
    floorOk: !sellPut || floor >= (input.phase === "eval" ? input.challengeFee : (input.sunkOverride ?? sunk) + Math.max(0, input.targetFailNetProfit)) - 0.5,
    thetaDay: 0,
    credit,
  };
}

function callPair(rows: LiveOption[], down: number, up: number): { short: LiveOption; long: LiveOption; credit: number } | null {
  const calls = rows.filter((row) => row.right === "call");
  const short = calls.filter((row) => row.strike >= down - 0.01).sort((a, b) => a.strike - b.strike)[0]
    ?? nearest(calls, down, () => true);
  if (!short) return null;
  const long = nearest(calls, up, (row) => row.strike > short.strike + 0.01);
  if (!long) return null;
  const credit = short.markUsd - long.markUsd;
  if (!(credit > 0.2)) return null;
  return { short, long, credit };
}

function solvePuts(rows: LiveOption[], down: number, callCredit: number, target: number): { sell: LiveOption; buy: LiveOption; qtyCall: number; qtyPut: number } | null {
  const puts = rows.filter((row) => row.right === "put");
  const sell = nearest(puts, down, (row) => row.strike <= down + 15);
  if (!sell) return null;
  const band = puts.filter((row) => row.strike <= sell.strike - 60 && row.strike >= sell.strike - 100);
  const buy = (band.length ? band : puts.filter((row) => row.strike <= sell.strike - 60))
    .sort((a, b) => Math.abs(sell.strike - 80 - a.strike) - Math.abs(sell.strike - 80 - b.strike))[0];
  if (!buy || !(sell.markUsd > buy.markUsd)) return null;
  const putCredit = sell.markUsd - buy.markUsd;
  const width = sell.strike - buy.strike;
  for (const ratio of [0.3, 0.25, 0.2]) {
    const unit = callCredit + ratio * putCredit - ratio * width;
    if (!(unit > 0.5)) continue;
    let qtyCall = Math.max(qtyFor(callCredit, target), qtyFor(unit, target));
    let qtyPut = Math.max(0.1, Math.round(qtyCall * ratio * 10) / 10);
    for (let guard = 0; guard < 12; guard += 1) {
      const floor = callCredit * qtyCall + putCredit * qtyPut - width * qtyPut;
      if (floor >= target - 0.5) return { sell, buy, qtyCall, qtyPut };
      qtyCall = Math.round((qtyCall + 0.1) * 10) / 10;
      qtyPut = Math.max(0.1, Math.round(qtyCall * ratio * 10) / 10);
    }
  }
  return null;
}

export function scanCards(input: OptimizerInput, options: LiveOption[]): ScanCard[] {
  const spot = input.spot > 0 ? input.spot : 0;
  if (!(spot > 0)) return [];
  const groups = [...byExpiry(options).values()].filter((rows) => {
    const dte = rows[0]?.dte ?? 0;
    return dte >= 0.95 && dte <= 5.2;
  });
  if (!groups.length) return [];
  const eth = input.propEth > 0 ? input.propEth : 5 * Math.max(0.2, input.accountSize / 5000);
  const scale = Math.max(0.2, input.accountSize / 5000);
  const ethBlitz = 7.5 * scale;
  const down = spot - input.maxDrawdownUsd / eth;
  const upEval = spot + input.evalTargetUsd / eth;
  const upFunded = spot + fundedGross(input.accountSize, input.fundedTpPercent) / eth;
  const up = input.phase === "funded" ? upFunded : upEval;
  const downBlitz = spot - 40;
  const upBlitz = input.phase === "funded" ? spot + fundedGross(input.accountSize, input.fundedTpPercent) / ethBlitz : spot + 60;

  const allround = best(groups.filter((rows) => (rows[0]?.dte ?? 0) >= 1.7 && (rows[0]?.dte ?? 0) <= 4.6), (rows) => {
    const pair = callPair(rows, down, up);
    if (!pair) return null;
    const sunkGuess = input.challengeFee;
    const target = input.phase === "eval" ? input.challengeFee : (input.sunkOverride ?? sunkGuess) + input.targetFailNetProfit;
    const draft = metrics(input, cardShape("allround", eth, down, up, upEval), pair.short, pair.long, null, null, qtyFor(pair.credit, input.challengeFee), 0);
    const aimed = payoutTarget(input, draft.sunk);
    const qty = qtyFor(pair.credit, Math.max(target, aimed));
    return metrics(input, cardShape("allround", eth, down, up, upEval), pair.short, pair.long, null, null, qty, 0);
  }, (card) => Math.abs(card.phase1PassLoss + 60));

  const blitz = best(groups.filter((rows) => (rows[0]?.dte ?? 0) <= 2.25), (rows) => {
    const pair = callPair(rows, downBlitz, upBlitz);
    if (!pair) return null;
    const draft = metrics(input, cardShape("blitz", ethBlitz, downBlitz, upBlitz, spot + 60), pair.short, pair.long, null, null, qtyFor(pair.credit, input.challengeFee), 0);
    const qty = qtyFor(pair.credit, payoutTarget(input, draft.sunk));
    return metrics(input, cardShape("blitz", ethBlitz, downBlitz, upBlitz, spot + 60), pair.short, pair.long, null, null, qty, 0);
  }, (card) => -(card.breachNow + card.breachD1));

  const theta = best(groups.filter((rows) => (rows[0]?.dte ?? 0) >= 1.7 && (rows[0]?.dte ?? 0) <= 4.6), (rows) => {
    const pair = callPair(rows, down, up);
    if (!pair) return null;
    const draft = metrics(input, cardShape("theta", eth, down, up, upEval), pair.short, pair.long, null, null, qtyFor(pair.credit, input.challengeFee), 0);
    const target = payoutTarget(input, draft.sunk);
    const solved = solvePuts(rows, down, pair.credit, target);
    if (!solved) return null;
    return metrics(input, cardShape("theta", eth, down, up, upEval), pair.short, pair.long, solved.sell, solved.buy, solved.qtyCall, solved.qtyPut);
  }, (card) => (card.floorOk ? 0 : 500) - card.floor);

  return [allround, blitz, theta].filter((card): card is ScanCard => card != null);
}

function cardShape(id: CardId, propEth: number, down: number, up: number, evalUp: number) {
  const copy = {
    allround: ["Beste Allround-Kombi", "Echter 2-Bein-Call-Spread aus der Deribit-Kette, 2–4 Tage."],
    blitz: ["Bester Tag-1-Blitzschutz", "Kürzeste 1–2-Tage-Laufzeit, 7,5 ETH, höchster Sofortwert am Breach."],
    theta: ["Bester Theta-Farmer", "Call-Spread plus Put-Credit. Crash-Plateau liegt auf oder über dem Ziel."],
  } as const;
  return { id, title: copy[id][0], blurb: copy[id][1], propEth, down, up, evalUp };
}

function best(groups: LiveOption[][], build: (rows: LiveOption[]) => ScanCard | null, score: (card: ScanCard) => number): ScanCard | null {
  let winner: ScanCard | null = null;
  let bestScore = Infinity;
  for (const rows of groups) {
    const card = build(rows);
    if (!card) continue;
    const next = score(card);
    if (next < bestScore) {
      winner = card;
      bestScore = next;
    }
  }
  return winner;
}

export const PHASE_DEFAULTS: OptimizerInput = {
  phase: "eval",
  spot: 2100,
  asset: "ETH",
  accountSize: 5000,
  challengeFee: 75,
  maxDrawdownUsd: 300,
  evalTargetUsd: 450,
  fundedTpPercent: 10.5,
  targetFailNetProfit: 45,
  split: SPLIT,
  sunkOverride: null,
  budget: 540,
  propEth: 5,
};
