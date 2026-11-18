import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { legFromContract, type ChainContract } from "@/lib/deribit-live";
import { bookGreeks, optionsPnlUsd, type OptLeg, type OptRight, type OptSide, type PropSetup } from "@/lib/options-sim";

const COUNTS = [1, 2, 3, 4, 5, 6];

export function MonkeyBook({
  legs,
  setup,
  goal,
  payout,
  expiries,
  byExpiry,
  spot,
  onChange,
  onScale,
}: {
  legs: OptLeg[];
  setup: PropSetup;
  goal: number;
  payout: number;
  expiries: string[];
  byExpiry: Map<string, ChainContract[]>;
  spot: number;
  onChange: (legs: OptLeg[]) => void;
  onScale: () => void;
}) {
  const [link, setLink] = useState(true);
  const stats = estimate(legs, setup, goal, payout);
  const setCount = (count: number) => {
    if (count < legs.length) onChange(legs.slice(0, count));
    else if (count > legs.length) onChange([...legs, ...Array.from({ length: count - legs.length }, () => freshLeg(byExpiry, expiries, spot))]);
  };
  const patch = (id: string, next: Partial<OptLeg>) => onChange(legs.map((row) => (row.id === id ? { ...row, ...next } : row)));
  const bump = (id: string, delta: number) => {
    const row = legs.find((item) => item.id === id);
    if (!row || !(row.qty > 0)) return;
    const qty = Math.max(0.1, Math.round((row.qty + delta) * 10) / 10);
    if (!link) {
      onChange(legs.map((item) => item.id === id ? { ...item, qty } : item));
      return;
    }
    const factor = qty / row.qty;
    onChange(legs.map((item) => item.id === id ? { ...item, qty } : { ...item, qty: Math.max(0.1, Math.round(item.qty * factor * 10) / 10) }));
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted">Number of legs</span>
        {COUNTS.map((count) => (
          <button key={count} type="button" className={cn("grid h-8 w-8 place-items-center rounded-lg text-xs font-semibold", legs.length === count ? "bg-fg text-bg" : "bg-bg text-muted")} onClick={() => setCount(count)}>
            {count}
          </button>
        ))}
        <Button className="h-8 px-2 text-[11px]" onClick={() => onChange([...legs, freshLeg(byExpiry, expiries, spot)])}>+ Add leg</Button>
        <Button tone="accent" className="h-8 px-2 text-[11px]" onClick={onScale}>Menge Q auf Ziel-Payout skalieren</Button>
        <label className="inline-flex items-center gap-1 text-[11px] text-muted">
          <input type="checkbox" className="h-3.5 w-3.5" checked={link} onChange={(event) => setLink(event.target.checked)} />
          alle Beine proportional
        </label>
      </div>
      <div className="mt-3 space-y-2">
        {legs.map((row) => {
          const underlying = row.name === "UNDERLYING";
          const pool = (byExpiry.get(row.expiry) ?? []).filter((contract) => contract.right === row.right);
          const windowed = pool.filter((contract) => Math.abs(contract.strike - spot) <= (setup.asset === "BTC" ? spot * 0.12 : 280));
          const choices = windowed.length ? windowed : pool;
          return (
            <div key={row.id} className="rounded-xl border border-line bg-bg px-2 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <input type="checkbox" className="h-4 w-4" checked={row.on} onChange={(event) => patch(row.id, { on: event.target.checked })} aria-label="Bein aktiv" />
                <Toggle on={row.side === "buy"} label="BUY" tone="long" onClick={() => patch(row.id, { side: "buy" })} />
                <Toggle on={row.side === "sell"} label="SELL" tone="short" onClick={() => patch(row.id, { side: "sell" })} />
                <Toggle on={!underlying && row.right === "call"} label="CALL" tone="long" onClick={() => retarget(row, "call", byExpiry, spot, patch)} />
                <Toggle on={!underlying && row.right === "put"} label="PUT" tone="short" onClick={() => retarget(row, "put", byExpiry, spot, patch)} />
                <Toggle on={underlying} label="UNDERLYING" tone="muted" onClick={() => patch(row.id, { name: "UNDERLYING", expiry: "SPOT", strike: spot, premium: spot, right: "call" })} />
                {underlying ? (
                  <span className="font-mono text-xs text-fg">Spot {px(spot)}</span>
                ) : (
                  <>
                    <select className={selectClass} value={row.expiry} onChange={(event) => {
                      const expiry = event.target.value;
                      const nextPool = (byExpiry.get(expiry) ?? []).filter((contract) => contract.right === row.right);
                      const next = closest(nextPool, row.strike);
                      if (next) patch(row.id, fromContract(row, next));
                      else patch(row.id, { expiry });
                    }}>
                      {row.expiry && !byExpiry.has(row.expiry) ? <option value={row.expiry}>{pretty(row.expiry)}</option> : null}
                      {expiries.map((expiry) => <option key={expiry} value={expiry}>{pretty(expiry)}</option>)}
                    </select>
                    <select className={selectClass} value={row.name} onChange={(event) => {
                      const contract = choices.find((item) => item.name === event.target.value) ?? pool.find((item) => item.name === event.target.value);
                      if (contract) patch(row.id, fromContract(row, contract));
                    }}>
                      {row.name && !choices.some((item) => item.name === row.name) ? <option value={row.name}>{row.strike.toLocaleString("en-US")}</option> : null}
                      {choices.map((contract) => <option key={contract.name} value={contract.name}>{contract.strike.toLocaleString("en-US")}</option>)}
                    </select>
                  </>
                )}
                <div className="ml-auto inline-flex items-center gap-1">
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-lg bg-raised text-sm" onClick={() => bump(row.id, -0.1)} aria-label="Menge minus">−</button>
                  <span className="w-10 text-center font-mono text-xs">{row.qty.toFixed(1)}</span>
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-lg bg-raised text-sm" onClick={() => bump(row.id, 0.1)} aria-label="Menge plus">+</button>
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-short" aria-label="Bein löschen" onClick={() => onChange(legs.filter((item) => item.id !== row.id))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {!underlying ? (
                <p className="mt-1 font-mono text-[10px] text-faint">
                  Mark {row.premium == null ? "—" : px(row.premium)} · IV {row.iv > 0 ? `${row.iv.toFixed(1)}%` : "—"} · Δ {deltaOf(row, spot).toFixed(2)} · Θ {thetaOf(row, spot).toFixed(2)}/d
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <dl className="mt-3 space-y-1 border-t border-line pt-3 text-xs">
        <Stat k="Entry cost" v={stats.entry < -0.005 ? `${usd(stats.entry)} (credit)` : stats.entry > 0.005 ? `${usd(stats.entry)} (debit)` : usd(0)} tone={stats.entry < -0.005 ? "long" : "fg"} />
        <Stat k="Max risk" v={`$${stats.maxRisk.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} tone="short" />
        <Stat k="Max return" v={usd(stats.maxReturn)} tone="long" />
        <Stat k="Max return on risk" v={`${stats.ror.toFixed(1)}%`} />
        <Stat k="Breakeven" v={stats.breakevens.map((price) => px(price)).join(" · ") || "—"} />
        <Stat k="Netto-Greeks" v={`Δ ${stats.delta.toFixed(2)} · Θ ${usd(stats.theta)}/Tag · Γ ${stats.gamma.toFixed(4)} · ν ${stats.vega.toFixed(1)}`} />
        <div className="pt-1 text-[11px] leading-5 text-muted">
          <p className="font-semibold text-fg">Prop + Hedge Kombi-Bilanz</p>
          <p>Netto bei Breach: Now {usd(stats.breachNow)} · +1d {usd(stats.breachD1)} · Exp {usd(stats.breachExp)} · nach Ziel {usd(stats.netExp)}</p>
          <p>Extrinsic Theta Bonus bis Expiry: {usd(stats.breachExp - stats.breachNow)}</p>
          <p>Netto bei Pass: Now {usd(stats.tpNow)} · +1d {usd(stats.tpD1)} · inkl. Payout {usd(stats.netPass)}</p>
        </div>
      </dl>
    </div>
  );
}

function estimate(legs: OptLeg[], setup: PropSetup, goal: number, payout: number) {
  const live = legs.filter((row) => row.on && row.name !== "UNDERLYING");
  const spot = setup.index > 0 ? setup.index : 1;
  const at = (price: number, elapsed: number) => price > 0 ? optionsPnlUsd(live, price, elapsed, 0, 0, spot) : 0;
  const down = spot - (setup.side === "short" ? -1 : 1) * (setup.coins > 0 ? setup.maxDd / setup.coins : 0);
  const up = spot + (setup.side === "short" ? -1 : 1) * (setup.coins > 0 ? setup.target / setup.coins : 0);
  const lo = Math.min(down, spot) * 0.85;
  const hi = Math.max(up, spot) * 1.15;
  let maxReturn = -Infinity;
  let worst = Infinity;
  const samples: { price: number; pnl: number }[] = [];
  for (let i = 0; i <= 60; i += 1) {
    const price = lo + ((hi - lo) * i) / 60;
    const pnl = at(price, 10_000);
    samples.push({ price, pnl });
    if (pnl > maxReturn) maxReturn = pnl;
    if (pnl < worst) worst = pnl;
  }
  const breakevens: number[] = [];
  for (let i = 1; i < samples.length; i += 1) {
    const left = samples[i - 1];
    const right = samples[i];
    if (left.pnl * right.pnl < 0) {
      const t = left.pnl / (left.pnl - right.pnl);
      breakevens.push(left.price + t * (right.price - left.price));
    }
  }
  const entry = live.reduce((sum, row) => sum + (row.side === "buy" ? 1 : -1) * (row.premium ?? 0) * row.qty, 0);
  const greeks = bookGreeks(live, spot, 0, 0, 0);
  const breachNow = at(down, 0);
  const breachExp = at(down, 10_000);
  const tpD1 = at(up, 1);
  const maxRisk = Math.max(0, -worst);
  return {
    entry,
    maxRisk,
    maxReturn: Number.isFinite(maxReturn) ? maxReturn : 0,
    ror: maxRisk > 1 && Number.isFinite(maxReturn) ? (maxReturn / maxRisk) * 100 : 0,
    breakevens: breakevens.slice(0, 3),
    delta: greeks.delta,
    gamma: greeks.gamma,
    theta: greeks.theta,
    vega: greeks.vega,
    breachNow,
    breachD1: at(down, 1),
    breachExp,
    netExp: breachExp - goal,
    tpNow: at(up, 0),
    tpD1,
    netPass: tpD1 - goal + payout,
  };
}

function freshLeg(byExpiry: Map<string, ChainContract[]>, expiries: string[], spot: number): OptLeg {
  const expiry = expiries.find((item) => {
    const dte = byExpiry.get(item)?.[0]?.dte ?? 99;
    return dte >= 1.5 && dte <= 4;
  }) ?? expiries[0] ?? "";
  const pool = (byExpiry.get(expiry) ?? []).filter((contract) => contract.right === "call");
  const next = closest(pool, spot);
  if (next) return legFromContract(next, "buy", 1);
  return {
    id: `blank-${Math.random().toString(36).slice(2, 7)}`,
    on: true,
    right: "call",
    side: "buy",
    qty: 1,
    strike: spot,
    dte: 2,
    iv: 55,
    premium: 0,
    name: "",
    expiry,
    priceMode: "mark",
  };
}

function fromContract(row: OptLeg, contract: ChainContract): Partial<OptLeg> {
  const spot = contract.underlying > 0 ? contract.underlying : 1;
  return {
    name: contract.name,
    expiry: contract.expiry,
    strike: contract.strike,
    right: contract.right,
    dte: contract.dte,
    iv: contract.iv > 0 ? contract.iv : row.iv,
    premium: contract.markCoin > 0 ? contract.markCoin * spot : row.premium,
  };
}

function retarget(row: OptLeg, right: OptRight, byExpiry: Map<string, ChainContract[]>, spot: number, patch: (id: string, next: Partial<OptLeg>) => void) {
  const pool = (byExpiry.get(row.expiry) ?? []).filter((contract) => contract.right === right);
  const next = closest(pool, row.strike || spot);
  if (next) patch(row.id, { ...fromContract(row, next), side: row.side });
  else patch(row.id, { right, name: row.name === "UNDERLYING" ? "" : row.name });
}

function closest(rows: ChainContract[], price: number): ChainContract | null {
  let best: ChainContract | null = null;
  let gap = Infinity;
  for (const row of rows) {
    const next = Math.abs(row.strike - price);
    if (next < gap) {
      best = row;
      gap = next;
    }
  }
  return best;
}

function deltaOf(row: OptLeg, spot: number): number {
  return bookGreeks([{ ...row, side: "buy", qty: 1 }], spot, 0, 0, 0).delta;
}

function thetaOf(row: OptLeg, spot: number): number {
  return bookGreeks([{ ...row, side: "buy", qty: 1 }], spot, 0, 0, 0).theta;
}

function Toggle({ on, label, tone, onClick }: { on: boolean; label: string; tone: "long" | "short" | "muted"; onClick: () => void }) {
  const active = tone === "long" ? "bg-long text-bg" : tone === "short" ? "bg-short text-bg" : "bg-fg text-bg";
  return (
    <button type="button" className={cn("h-7 rounded-md px-2 text-[10px] font-semibold", on ? active : "bg-raised text-muted")} onClick={onClick}>
      {label}
    </button>
  );
}

function Stat({ k, v, tone = "fg" }: { k: string; v: string; tone?: "long" | "short" | "fg" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className={cn("font-mono", tone === "long" ? "text-long" : tone === "short" ? "text-short" : "text-fg")}>{v}</dd>
    </div>
  );
}

function usd(value: number): string {
  const sign = value > 0.005 ? "+" : value < -0.005 ? "−" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function px(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function pretty(expiry: string): string {
  const match = expiry.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
  if (!match) return expiry;
  const month = match[2][0] + match[2].slice(1).toLowerCase();
  return `${Number(match[1])} ${month}`;
}

const selectClass = "h-8 rounded-lg border border-line bg-surface px-2 font-mono text-xs text-fg";
