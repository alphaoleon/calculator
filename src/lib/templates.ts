import type { Currency, Instrument, Leg, Quote, Right } from "@/lib/types";

export type TemplateId =
  | "straddle"
  | "short-straddle"
  | "strangle"
  | "call-spread"
  | "put-spread"
  | "risk-reversal"
  | "call-fly"
  | "covered";

export const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: "straddle", label: "Straddle" },
  { id: "short-straddle", label: "Short straddle" },
  { id: "strangle", label: "Strangle" },
  { id: "call-spread", label: "Call spread" },
  { id: "put-spread", label: "Put spread" },
  { id: "risk-reversal", label: "Risk reversal" },
  { id: "call-fly", label: "Call fly" },
  { id: "covered", label: "Covered call" },
];

function nearest(strikes: number[], target: number): number {
  return strikes.reduce((best, strike) =>
    Math.abs(strike - target) < Math.abs(best - target) ? strike : best,
  );
}

function nearestAbove(strikes: number[], target: number, floor: number): number | null {
  const pool = strikes.filter((strike) => strike > floor + 1e-8);
  if (!pool.length) return null;
  return nearest(pool, Math.max(target, floor));
}

function nearestBelow(strikes: number[], target: number, cap: number): number | null {
  const pool = strikes.filter((strike) => strike < cap - 1e-8);
  if (!pool.length) return null;
  return nearest(pool, Math.min(target, cap));
}

function findOption(
  instruments: Instrument[],
  expiry: number,
  strike: number,
  right: Right,
): Instrument | undefined {
  return instruments.find(
    (item) =>
      item.kind === "option" &&
      item.expiry === expiry &&
      item.strike === strike &&
      item.right === right,
  );
}

function fromInstrument(
  instrument: Instrument,
  size: number,
  quotes: Record<string, Quote>,
): Leg | string {
  const quote = quotes[instrument.name];
  if (!quote || !(quote.mark > 0)) return `No live mark for ${instrument.name}`;
  return {
    instrument: instrument.name,
    kind: instrument.kind,
    right: instrument.right,
    strike: instrument.strike,
    expiry: instrument.expiry,
    perpetual: instrument.perpetual,
    contractSize: instrument.contractSize,
    size,
    entry: quote.mark,
    iv: quote.iv,
    forward: quote.underlying > 0 ? quote.underlying : quote.mark,
    linear: instrument.linear,
  };
}

export function buildTemplate(args: {
  id: TemplateId;
  currency: Currency;
  expiry: number | null;
  instruments: Instrument[];
  quotes: Record<string, Quote>;
  index: number;
  amount: number;
}): Leg[] | string {
  const { id, expiry, instruments, quotes, index, amount } = args;
  if (!(amount > 0)) return "Set a size above zero";
  if (!(index > 0)) return "Waiting for the index";
  if (expiry == null) return "Pick an expiry";

  const strikes = [
    ...new Set(
      instruments
        .filter((item) => item.kind === "option" && item.expiry === expiry && item.strike)
        .map((item) => item.strike as number),
    ),
  ].sort((a, b) => a - b);
  if (!strikes.length) return "No strikes on this expiry";
  const atm = nearest(strikes, index);

  const opt = (strike: number, right: Right, size: number): Leg | string => {
    const instrument = findOption(instruments, expiry, strike, right);
    if (!instrument) return `Missing ${right} ${strike}`;
    return fromInstrument(instrument, size, quotes);
  };

  const collect = (parts: Array<Leg | string>): Leg[] | string => {
    const legs: Leg[] = [];
    for (const part of parts) {
      if (typeof part === "string") return part;
      legs.push(part);
    }
    return legs;
  };

  if (id === "straddle" || id === "short-straddle") {
    const sign = id === "straddle" ? 1 : -1;
    return collect([opt(atm, "call", sign * amount), opt(atm, "put", sign * amount)]);
  }

  if (id === "strangle" || id === "risk-reversal") {
    const putStrike = nearestBelow(strikes, index * 0.92, atm);
    const callStrike = nearestAbove(strikes, index * 1.08, atm);
    if (putStrike == null || callStrike == null) return "This expiry needs wider strikes";
    if (id === "strangle") {
      return collect([opt(putStrike, "put", amount), opt(callStrike, "call", amount)]);
    }
    return collect([opt(putStrike, "put", -amount), opt(callStrike, "call", amount)]);
  }

  if (id === "call-spread") {
    const high = nearestAbove(strikes, index * 1.08, atm);
    if (high == null) return "No higher strike for the short call";
    return collect([opt(atm, "call", amount), opt(high, "call", -amount)]);
  }

  if (id === "put-spread") {
    const low = nearestBelow(strikes, index * 0.92, atm);
    if (low == null) return "No lower strike for the short put";
    return collect([opt(atm, "put", amount), opt(low, "put", -amount)]);
  }

  if (id === "call-fly") {
    const low = nearestBelow(strikes, index * 0.92, atm);
    const high = nearestAbove(strikes, index * 1.08, atm);
    if (low == null || high == null) return "Need strikes on both sides of spot";
    return collect([
      opt(low, "call", amount),
      opt(atm, "call", -2 * amount),
      opt(high, "call", amount),
    ]);
  }

  const perp = instruments.find((item) => item.kind === "future" && item.perpetual);
  if (!perp) return "Perpetual is not in the book yet";
  const call = findOption(instruments, expiry, atm, "call");
  const hedgeSize = perp.linear
    ? amount * (call?.contractSize && call.contractSize > 0 ? call.contractSize : 1)
    : Math.max(1, Math.round((amount * index) / perp.contractSize));
  const hedge = fromInstrument(perp, hedgeSize, quotes);
  return collect([hedge, opt(atm, "call", -amount)]);
}
