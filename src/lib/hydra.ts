/** 3x eval leverage: 3% static DD is a 1% move, 9% target is a 3% move. */
export const EVAL_LEV = 3;
export const FAIL_MOVE = 0.01;
export const PASS_MOVE = 0.03;
export const SPLIT = 0.8;
/** Taker round-trip on the funded position. */
export const FEE_RATE = 0.0008;
/** Card B leaves this much price-buffer untouched. */
export const SAFETY_REST = 150;
export const FRESH_DD = 0.03;

/**
 * Payout covers the eval cost and the trading fee after the 80% split.
 * Fee is cash, so it is not added to the drawdown a second time.
 * N = cost / (0.01 * 0.80 - 0.0008)
 */
const ZERO_DENOM = FAIL_MOVE * SPLIT - FEE_RATE;

export const EVAL_PRODUCTS: { size: number; price: number }[] = [
  { size: 5_000, price: 20 },
  { size: 10_000, price: 40 },
  { size: 25_000, price: 95 },
  { size: 50_000, price: 180 },
  { size: 100_000, price: 330 },
];

export type ComboLeg = { size: number; count: number };

export const COMBOS: { id: string; legs: ComboLeg[] }[] = [
  { id: "1x5", legs: [{ size: 5_000, count: 1 }] },
  { id: "2x5", legs: [{ size: 5_000, count: 2 }] },
  { id: "1x10", legs: [{ size: 10_000, count: 1 }] },
  { id: "10+5", legs: [{ size: 10_000, count: 1 }, { size: 5_000, count: 1 }] },
  { id: "2x10", legs: [{ size: 10_000, count: 2 }] },
  { id: "1x25", legs: [{ size: 25_000, count: 1 }] },
  { id: "25+10", legs: [{ size: 25_000, count: 1 }, { size: 10_000, count: 1 }] },
  { id: "2x25", legs: [{ size: 25_000, count: 2 }] },
  { id: "1x50", legs: [{ size: 50_000, count: 1 }] },
  { id: "2x50", legs: [{ size: 50_000, count: 2 }] },
  { id: "1x100", legs: [{ size: 100_000, count: 1 }] },
  { id: "2x100", legs: [{ size: 100_000, count: 2 }] },
];

export type FundedSlot = {
  id: string;
  size: number;
  buffer: number;
};

export type Inventory = {
  cash: number;
  discountPct: number;
  accounts: FundedSlot[];
};

export type Allocation = {
  id: string;
  size: number;
  buffer: number;
  notional: number;
  leverage: number;
  passLoss: number;
  bufferAfter: number;
};

export type ComboPlan = {
  id: string;
  legs: ComboLeg[];
  label: string;
  listCost: number;
  cost: number;
  evalNotional: number;
  fundedNotional: number;
  fees: number;
  gross: number;
  payout: number;
  net: number;
  passLoss: number;
  rest: number;
  feeSafe: boolean;
  affordable: boolean;
  allocations: Allocation[];
  shorts: { size: number; count: number; notional: number }[];
};

export type Attack = {
  plan: ComboPlan;
  classic: ComboPlan;
  fits: boolean;
  discountNeededPct: number | null;
  stopMovePct: number | null;
  stopLossUsd: number | null;
  evalGainPct: number | null;
  unusedBeforeFee: number;
};

export type RoadStep = {
  index: number;
  plan: ComboPlan;
  cashAfter: number;
  spawned: { size: number; buffer: number }[];
  survivors: { size: number; buffer: number }[];
  reachesEnd: boolean;
};

export type Advice = {
  buffer: number;
  plans: ComboPlan[];
  safe: ComboPlan | null;
  printer: { base: ComboPlan; scaled: ComboPlan; unused: number; cashBeforeFee: number } | null;
  bridge: ComboPlan | null;
  bridgeReason: string;
  attack: Attack | null;
  steps: RoadStep[];
  roadmapNote: string;
};

const LADDER = [5_000, 10_000, 25_000, 50_000, 100_000];

export function productPrice(size: number): number {
  const row = EVAL_PRODUCTS.find((item) => item.size === size);
  return row ? row.price : 0;
}

export function comboLabel(legs: ComboLeg[]): string {
  return legs.map((leg) => `${leg.count}× ${formatK(leg.size)}`).join(" + ");
}

export function formatK(size: number): string {
  if (size >= 1000 && size % 1000 === 0) return `${size / 1000}k`;
  return String(size);
}

function listCost(legs: ComboLeg[]): number {
  return legs.reduce((sum, leg) => sum + productPrice(leg.size) * leg.count, 0);
}

function evalNotional(legs: ComboLeg[]): number {
  return legs.reduce((sum, leg) => sum + leg.size * leg.count * EVAL_LEV, 0);
}

/** Fee-ignorant hedge: payout equals the eval cost, fee is not in the size. */
function classicNotional(cost: number): number {
  if (!(cost > 0)) return 0;
  return cost / SPLIT / FAIL_MOVE;
}

function finish(
  id: string,
  legs: ComboLeg[],
  notional: number,
  accounts: FundedSlot[],
  cash: number,
  discountPct: number,
): ComboPlan {
  const grossList = listCost(legs);
  const discount = Math.min(0.2, Math.max(0, discountPct / 100));
  const cost = grossList * (1 - discount);
  const fees = notional * FEE_RATE;
  const gross = notional * FAIL_MOVE;
  const payout = gross * SPLIT;
  const net = payout - cost - fees;
  const passLoss = notional * PASS_MOVE;
  const buffer = accounts.reduce((sum, account) => sum + Math.max(0, account.buffer), 0);
  const rest = buffer - passLoss;
  const allocations = allocate(accounts, notional);
  return {
    id,
    legs,
    label: comboLabel(legs),
    listCost: grossList,
    cost,
    evalNotional: evalNotional(legs),
    fundedNotional: notional,
    fees,
    gross,
    payout,
    net,
    passLoss,
    rest,
    feeSafe: rest >= -0.05 && notional > 0 && cost > 0,
    affordable: cost <= cash + 0.05,
    allocations,
    shorts: legs.map((leg) => ({
      size: leg.size,
      count: leg.count,
      notional: leg.size * leg.count * EVAL_LEV,
    })),
  };
}

export function allocate(accounts: FundedSlot[], notional: number): Allocation[] {
  const live = accounts.filter((account) => account.buffer > 0 && account.size > 0);
  const buffer = live.reduce((sum, account) => sum + account.buffer, 0);
  return live.map((account) => {
    const share = buffer > 0 ? account.buffer / buffer : 0;
    const leg = notional * share;
    const passLoss = leg * PASS_MOVE;
    return {
      id: account.id,
      size: account.size,
      buffer: account.buffer,
      notional: leg,
      leverage: account.size > 0 ? leg / account.size : 0,
      passLoss,
      bufferAfter: account.buffer - passLoss,
    };
  });
}

/** Zero-loss size: payout − cost − fee = 0, drawdown is the price move only. */
export function quote(legs: ComboLeg[], accounts: FundedSlot[], cash: number, discountPct: number, id = "q"): ComboPlan {
  const cost = listCost(legs) * (1 - Math.min(0.2, Math.max(0, discountPct / 100)));
  const notional = ZERO_DENOM > 0 ? cost / ZERO_DENOM : 0;
  return finish(id, legs, notional, accounts, cash, discountPct);
}

function quoteClassic(legs: ComboLeg[], accounts: FundedSlot[], cash: number, discountPct: number, id: string): ComboPlan {
  const cost = listCost(legs) * (1 - Math.min(0.2, Math.max(0, discountPct / 100)));
  return finish(id, legs, classicNotional(cost), accounts, cash, discountPct);
}

function bySize(a: ComboPlan, b: ComboPlan): number {
  return b.evalNotional - a.evalNotional || a.cost - b.cost;
}

function largestSafe(plans: ComboPlan[]): ComboPlan | null {
  return plans.filter((plan) => plan.feeSafe && plan.affordable).sort(bySize)[0] ?? null;
}

function attackLegs(accounts: FundedSlot[]): ComboLeg[] | null {
  const biggest = accounts.reduce((max, account) => Math.max(max, account.size), 0);
  if (!productPrice(biggest)) return null;
  return [{ size: biggest, count: 2 }];
}

function discountThatFits(legs: ComboLeg[], accounts: FundedSlot[], cash: number): number | null {
  for (let pct = 0; pct <= 20; pct += 1) {
    const plan = quote(legs, accounts, Math.max(cash, listCost(legs)), pct, "disc");
    if (plan.feeSafe) return pct;
  }
  return null;
}

function buildAttack(accounts: FundedSlot[], cash: number, discountPct: number): Attack | null {
  const legs = attackLegs(accounts);
  if (!legs) return null;
  const plan = quote(legs, accounts, cash, discountPct, "attack");
  const classic = quoteClassic(legs, accounts, cash, discountPct, "attack-classic");
  const buffer = accounts.reduce((sum, account) => sum + Math.max(0, account.buffer), 0);
  const unusedBeforeFee = buffer - classic.passLoss;
  let stopMovePct: number | null = null;
  let stopLossUsd: number | null = null;
  let evalGainPct: number | null = null;
  if (!plan.feeSafe && classic.fundedNotional > 0) {
    const room = buffer - classic.fees;
    if (room > 0) {
      const move = Math.min(PASS_MOVE, room / classic.fundedNotional);
      stopMovePct = move * 100;
      stopLossUsd = classic.fundedNotional * move;
      evalGainPct = move * EVAL_LEV * 100;
    }
  }
  const needed = plan.feeSafe ? null : discountThatFits(legs, accounts, cash);
  return {
    plan,
    classic,
    fits: plan.feeSafe && plan.affordable,
    discountNeededPct: needed,
    stopMovePct,
    stopLossUsd,
    evalGainPct,
    unusedBeforeFee,
  };
}

function buildPrinter(
  plans: ComboPlan[],
  accounts: FundedSlot[],
  cash: number,
  discountPct: number,
  floorNotional: number,
) {
  const buffer = accounts.reduce((sum, account) => sum + Math.max(0, account.buffer), 0);
  if (buffer <= SAFETY_REST || floorNotional <= 0) return null;
  const candidates = plans
    .map((plan) => {
      const classic = quoteClassic(plan.legs, accounts, cash, discountPct, plan.id);
      return { plan, classic, unused: buffer - classic.passLoss };
    })
    .filter((row) => row.plan.evalNotional >= floorNotional && row.classic.affordable && row.unused > SAFETY_REST)
    .sort((a, b) => b.plan.evalNotional - a.plan.evalNotional);
  const pick = candidates[0];
  if (!pick) return null;
  const scaledNotional = (buffer - SAFETY_REST) / PASS_MOVE;
  const scaled = finish(pick.plan.id, pick.plan.legs, scaledNotional, accounts, cash, discountPct);
  const cashBeforeFee = scaled.payout - scaled.cost;
  if (!(cashBeforeFee > 1)) return null;
  return { base: pick.classic, scaled, unused: pick.unused, cashBeforeFee };
}

function buildBridge(plans: ComboPlan[], accounts: FundedSlot[]): { plan: ComboPlan | null; reason: string } {
  if (accounts.length < 2) {
    return {
      plan: null,
      reason: "Zum Bündeln brauchst du mindestens zwei Funded-Konten. Mit einem Konto ist das der normale Safe-Play.",
    };
  }
  const biggest = accounts.reduce((max, account) => Math.max(max, account.size), 0);
  const next = LADDER.find((size) => size > biggest);
  if (!next) {
    return { plan: null, reason: "Du sitzt schon auf der größten Stufe. Der nächste Schritt ist auscashen, nicht mehr bündeln." };
  }
  const exact = plans.find((plan) => plan.legs.length === 1 && plan.legs[0]?.size === next && plan.legs[0]?.count === 1);
  if (exact?.feeSafe && exact.affordable) {
    return { plan: exact, reason: `Beide Konten zusammen hebeln die nächste Stufe, 1× ${formatK(next)}.` };
  }
  const fallback = plans
    .filter((plan) => plan.feeSafe && plan.affordable && plan.legs.some((leg) => leg.size >= next))
    .sort(bySize)[0];
  if (fallback) return { plan: fallback, reason: `1× ${formatK(next)} passt nicht in den Puffer. Das hier ist die größte Stufe, die beide Konten noch tragen.` };
  return {
    plan: null,
    reason: `1× ${formatK(next)} frisst mehr Drawdown, als beide Konten zusammen noch haben.`,
  };
}

export function advise(inventory: Inventory): Advice {
  const accounts = inventory.accounts.filter((account) => account.size > 0);
  const cash = Math.max(0, inventory.cash);
  const discountPct = Math.min(20, Math.max(0, inventory.discountPct));
  const buffer = accounts.reduce((sum, account) => sum + Math.max(0, account.buffer), 0);
  const plans = COMBOS.map((combo) => quote(combo.legs, accounts, cash, discountPct, combo.id));
  const safe = largestSafe(plans);
  const printer = accounts.length ? buildPrinter(plans, accounts, cash, discountPct, safe?.evalNotional ?? 0) : null;
  const bridge = buildBridge(plans, accounts);
  const attack = accounts.length ? buildAttack(accounts, cash, discountPct) : null;
  const road = roadmap(accounts, cash, discountPct);
  return {
    buffer,
    plans,
    safe,
    printer,
    bridge: bridge.plan,
    bridgeReason: bridge.reason,
    attack,
    steps: road.steps,
    roadmapNote: road.note,
  };
}

function pickRoad(plans: ComboPlan[], accounts: FundedSlot[]): { plan: ComboPlan | null; blocked: ComboPlan | null } {
  const maxSize = accounts.reduce((max, account) => Math.max(max, account.size), 0);
  const equity = accounts.reduce((sum, account) => sum + account.size, 0);
  const safe = plans.filter((plan) => plan.feeSafe && plan.affordable);
  if (maxSize >= 100_000) {
    const have = accounts.filter((account) => account.size >= 100_000 && account.buffer > 50).length;
    if (have < 2) {
      const more = safe.filter((plan) => plan.legs.some((leg) => leg.size >= 100_000)).sort(bySize);
      if (more[0]) return { plan: more[0], blocked: null };
      const blocked = plans.filter((plan) => plan.legs.some((leg) => leg.size >= 100_000)).sort((a, b) => a.cost - b.cost)[0] ?? null;
      return { plan: null, blocked };
    }
  }
  const upgrade = safe.filter((plan) => plan.legs.some((leg) => leg.size > maxSize)).sort(bySize);
  if (upgrade[0]) return { plan: upgrade[0], blocked: null };
  const scale = safe
    .filter((plan) => plan.legs.reduce((sum, leg) => sum + leg.size * leg.count, 0) > equity)
    .sort(bySize);
  if (scale[0]) return { plan: scale[0], blocked: null };
  const blocked = plans.filter((plan) => plan.legs.some((leg) => leg.size > maxSize)).sort((a, b) => a.cost - b.cost)[0] ?? null;
  return { plan: null, blocked };
}

function roadmap(start: FundedSlot[], cash: number, discountPct: number): { steps: RoadStep[]; note: string } {
  let accounts = start.map((account) => ({ ...account }));
  let wallet = cash;
  const steps: RoadStep[] = [];
  const seen = new Set<string>();
  if (!accounts.length) {
    return { steps, note: "Ohne Funded-Konto gibt es keine Stufe. Zuerst ein Konto eintragen." };
  }
  for (let index = 1; index <= 8; index += 1) {
    const big = accounts.filter((account) => account.size >= 100_000 && account.buffer > 50).length;
    if (big >= 2) {
      return {
        steps,
        note: "Endstufe: 2× 100k Funded. Konto 1 klont weiter, Konto 2 bleibt flach und casht aus.",
      };
    }
    const plans = COMBOS.map((combo) => quote(combo.legs, accounts, wallet, discountPct, combo.id));
    const picked = pickRoad(plans, accounts);
    if (!picked.plan) {
      const blocked = picked.blocked;
      if (!blocked) return { steps, note: "Keine größere Stufe ist definiert." };
      const shortCash = Math.max(0, blocked.cost - wallet);
      const again = accounts.some((account) => account.size >= 100_000);
      const name = again ? `ein weiteres ${blocked.label}` : blocked.label;
      const why = [
        shortCash > 0.5
          ? `Für ${name} fehlen ${Math.ceil(shortCash)} USD Cash (Kauf ${Math.ceil(blocked.cost)}, Wallet ${Math.floor(wallet)}). Ein Fail zahlt die Eval-Kosten zurück.`
          : null,
        !blocked.feeSafe ? `${name} passt nicht in den Restpuffer (${Math.round(blocked.rest)} USD).` : null,
      ].filter(Boolean);
      return { steps, note: why.join(" ") || "Hier endet der Baum." };
    }
    const next = picked.plan;
    const key = `${next.id}:${accounts.map((account) => `${account.size}@${Math.round(account.buffer)}`).join(",")}`;
    if (seen.has(key)) return { steps, note: "Dieselbe Stufe würde sich wiederholen. Hier ist Schluss, sonst dreht sich der Baum im Kreis." };
    seen.add(key);
    const survivors = next.allocations
      .map((leg) => ({ size: leg.size, buffer: leg.bufferAfter }))
      .filter((leg) => leg.buffer > 1);
    const spawned = next.legs.flatMap((leg) =>
      Array.from({ length: leg.count }, () => ({ size: leg.size, buffer: leg.size * FRESH_DD })),
    );
    wallet -= next.cost;
    const merged = [
      ...survivors.map((leg, i) => ({ id: `s-${index}-${i}`, size: leg.size, buffer: leg.buffer })),
      ...spawned.map((leg, i) => ({ id: `n-${index}-${i}`, size: leg.size, buffer: leg.buffer })),
    ];
    const reachesEnd = merged.filter((account) => account.size >= 100_000 && account.buffer > 50).length >= 2;
    steps.push({ index, plan: next, cashAfter: wallet, spawned, survivors, reachesEnd });
    accounts = merged;
    if (reachesEnd) {
      return {
        steps,
        note: "Endstufe erreicht: 2× 100k Funded. Konto 1 klont weiter, Konto 2 bleibt flach und casht aus.",
      };
    }
  }
  return { steps, note: "Nach 8 Stufen ist die 100k-Endstufe noch nicht da. Puffer oder Cash limitieren den Baum." };
}

export function toHedgeInputs(plan: ComboPlan) {
  const evalSize = plan.legs.reduce((sum, leg) => sum + leg.size * leg.count, 0);
  const same = plan.allocations.length > 0 && plan.allocations.every((leg) => leg.size === plan.allocations[0]?.size);
  const numFunded = same ? plan.allocations.length : 1;
  const fundedSize = same
    ? plan.allocations[0]?.size ?? 0
    : plan.allocations.reduce((sum, leg) => sum + leg.size, 0);
  const manual = numFunded > 1 ? plan.fundedNotional / numFunded : plan.fundedNotional;
  return {
    evalSize,
    evalPrice: Math.round(plan.cost * 100) / 100,
    numEvals: 1,
    evalLeverage: EVAL_LEV,
    fundedSize,
    numFunded: Math.max(1, numFunded),
    mode: "manual" as const,
    manualNotional: Math.round(manual),
    targetPct: 9,
    ddPct: 3,
    splitPct: 80,
  };
}

export const ADVISOR_QUESTIONS = [
  { id: "lev", label: "Warum 3× statt 10×?" },
  { id: "fees", label: "Wie überlebe ich den 10k-Start?" },
  { id: "cash", label: "Wie cashe ich Konto 2 aus?" },
  { id: "firm", label: "Wie stoppt eine Prop Firm den Loop?" },
] as const;

export function offlineAnswer(id: string, inventory: Inventory, advice: Advice): string {
  if (id === "lev") {
    return [
      "Der Dollar-Drawdown im Pass hängt nicht am Hebel. Target und DD stehen 9 zu 3, also frisst der Pass immer das Dreifache dessen, was der Fail an Brutto bringt. Egal ob 3× oder 10×.",
      "Was sich ändert, ist der Weg. Bei 3× ist der Fail ein 1%-Move und der Pass ein 3%-Move. Bei 10× sind es 0,3% und 0,9%. Die 0,08% Round-Trip-Fee ist dann schon ein Viertel des Fail-Moves, und das Funded-Konto muss für denselben Dollar ein Vielfaches an Notional halten. Das läuft ins Hebel-Limit und in den Spread.",
      "3× hält die Funded-Seite nahe 1×, oft darunter. Das ist die 0,9×-Seite der Hydra: kurz die Evals mit 3×, lang das Funded knapp unter 1×.",
    ].join("\n\n");
  }
  if (id === "fees") {
    const attack = advice.attack;
    const safe = advice.safe;
    const lines = [
      "Ein 10k-Funded hat 300 USD Puffer. 2× 10k-Eval kosten 80 USD. Die Position, die im Fail genau 0 macht und die Fee aus dem Payout zahlt, ist 11.111 USD long. Der Pass frisst davon 333 USD. Der Puffer hat nur 300. Die Verdopplung ist ohne Trick tot.",
    ];
    if (safe) {
      lines.push(
        `Stattdessen ${safe.label} für ${safe.cost.toFixed(0)} USD. Long ${safe.fundedNotional.toFixed(0)} USD, aufgeteilt nach Puffer. Fail-Netto ${safe.net.toFixed(2)} USD. Im Pass bleiben ${safe.rest.toFixed(0)} USD Puffer.`,
      );
    }
    if (attack && !attack.fits && attack.discountNeededPct != null) {
      lines.push(
        `Oder die Verdopplung mit ${attack.discountNeededPct}% Rabatt. Dann kostet sie ${attack.plan.listCost * (1 - attack.discountNeededPct / 100)} USD und der Pass landet auf dem Puffer, nicht darunter.`,
      );
    }
    if (attack?.stopMovePct != null && attack.stopLossUsd != null && attack.evalGainPct != null) {
      lines.push(
        `Dritter Weg: die 10.000-Long trotzdem aufmachen und im Funded bei −${attack.stopMovePct.toFixed(2)}% hart raus (${attack.stopLossUsd.toFixed(0)} USD). Die Evals stehen dann bei +${attack.evalGainPct.toFixed(2)}% und bekommen einen Trailing-Stop. Das Funded überlebt, die Evals sind fast am Target.`,
      );
    }
    return lines.join("\n\n");
  }
  if (id === "cash") {
    return [
      "Sobald zwei 100k-Funded stehen, hören sie auf, dieselbe Arbeit zu machen.",
      "Konto 1 bleibt der Kloner. Es hält die Longs gegen die nächsten Evals. Sein Puffer ist das Werkzeug, nicht das Einkommen.",
      "Konto 2 wird flach. Keine Position, kein Hedge, kein zweites Los in denselben Move. Auszahlung über den normalen Payout, 80% Split. Was auf Konto 2 offen ist, kann derselbe Move töten, der Konto 1 braucht.",
      "Nicht beide Konten in denselben Over-Hedge legen. Der Drucker-Play ist für die Phase, in der du noch skalierst. An der Endstufe wird ein Konto zur Kasse und das andere zur Maschine.",
    ].join("\n\n");
  }
  return [
    "Der Loop ist aus Firm-Sicht ein Inventar-Angriff: viele billige Evals, ein Funded als Versicherung, korrelierte Gegenseite.",
    "Was ihn bricht, ist nicht eine weitere Regelzeile, sondern der Abgleich. Gleiche Person, gleiches Gerät, gleiche IP, Positionen die in derselben Sekunde gegeneinander aufgehen, ein Funded das immer genau dann long ist, wenn die eigenen Evals short sind.",
    "Payouts verzögern, bis der Stil über mehrere Tage nicht wie ein Hedge aussieht. Bei Treffer den Gegen-Account mit einziehen, nicht nur das eine Konto schließen. Der 80%-Split ist egal, wenn die Auszahlung nie ausgelöst wird.",
    "Eine Firma, die nur den einzelnen Drawdown prüft und nicht das Netz der Konten, bezahlt diesen Baum.",
  ].join("\n\n");
}

export function adviceContext(inventory: Inventory, advice: Advice): string {
  const accounts = inventory.accounts
    .map((account) => `${formatK(account.size)} Puffer ${Math.round(account.buffer)}`)
    .join(", ");
  const card = (plan: ComboPlan | null) =>
    plan
      ? `${plan.label}: Kosten ${plan.cost.toFixed(0)}, Long ${plan.fundedNotional.toFixed(0)}, Fail-Netto ${plan.net.toFixed(2)}, Rest ${plan.rest.toFixed(0)}`
      : "keine";
  return [
    `Cash ${inventory.cash.toFixed(0)} USD, Rabatt ${inventory.discountPct}%.`,
    `Funded: ${accounts || "keine"}. Puffer gesamt ${advice.buffer.toFixed(0)} USD.`,
    `Preise: 5k 20, 10k 40, 25k 95, 50k 180, 100k 330.`,
    `Regeln: Eval 3×, Fail +1%, Pass −3%, Split 80%, Fee 0.08% round-trip auf die Funded-Position.`,
    `Zero-Loss-Notional = Kosten / (0.01 * 0.80 - 0.0008). Drawdown im Pass = Notional * 0.03.`,
    `Karte A: ${card(advice.safe)}.`,
    advice.printer
      ? `Karte B: ${advice.printer.scaled.label}, Long ${advice.printer.scaled.fundedNotional.toFixed(0)}, Überschuss vor Fee ${advice.printer.cashBeforeFee.toFixed(0)}, ungenutzter Puffer vorher ${advice.printer.unused.toFixed(0)}.`
      : "Karte B: keine.",
    `Karte C: ${card(advice.bridge)}. ${advice.bridgeReason}`,
    advice.attack
      ? `Karte D: ${advice.attack.plan.label}, passt ${advice.attack.fits}, Rabatt nötig ${advice.attack.discountNeededPct ?? "nein"}, Stop ${advice.attack.stopMovePct?.toFixed(2) ?? "nein"}%.`
      : "Karte D: keine.",
  ].join("\n");
}
