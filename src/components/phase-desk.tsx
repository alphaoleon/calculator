import { useEffect, useState } from "react";
import { Layers, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { CardId, OptimizerInput, ScanCard } from "@/lib/phase-optimizer";
import { usePhasePlan } from "@/lib/phase-store";

const ICONS = { allround: Shield, blitz: Zap, theta: Layers } as const;

export function PhaseDesk({
  cards,
  margin,
  onLoad,
}: {
  cards: ScanCard[];
  margin: number;
  onLoad: (card: ScanCard, input: OptimizerInput) => void;
}) {
  const plan = usePhasePlan();
  const [picked, setPicked] = useState<CardId>("allround");
  useEffect(() => {
    if (!plan.ready) plan.hydrate();
  }, [plan.ready, plan]);
  const active = cards.find((card) => card.id === picked) ?? cards[0] ?? null;
  const spent = plan.sunkOverride ?? active?.sunk ?? 0;
  const left = plan.budget - spent;
  const covered = margin <= Math.max(0, left) + 0.5;
  const input: OptimizerInput = {
    phase: plan.phase,
    spot: plan.spot,
    asset: plan.asset,
    accountSize: plan.accountSize,
    challengeFee: plan.challengeFee,
    maxDrawdownUsd: plan.maxDrawdownUsd,
    evalTargetUsd: plan.evalTargetUsd,
    fundedTpPercent: plan.fundedTpPercent,
    targetFailNetProfit: plan.targetFailNetProfit,
    split: plan.split,
    sunkOverride: plan.sunkOverride,
    budget: plan.budget,
    propEth: plan.propEth,
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold">Live-Empfehlungen aus der Deribit-Kette</h2>
      <div className={cn("mt-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs", covered ? "border-long text-long" : "border-short text-short")}>
        <span>Start-Budget {usd(plan.budget)}</span>
        <span className="text-faint">→</span>
        <span>Abfluss Phase 1 {usd(-spent)}</span>
        <span className="text-faint">→</span>
        <span>Verbleibendes Cash {usd(left)}</span>
        <span className="text-faint">vs.</span>
        <span>Margin Phase 2 {usd(margin)}</span>
        <span className="font-semibold">{covered ? "Cash reicht" : "Cash reicht nicht"}</span>
      </div>
      {cards.length === 0 ? <p className="mt-3 text-xs text-muted">Warte auf echte Deribit-Kontrakte zwischen 1 und 5 Tagen.</p> : null}
      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = ICONS[card.id];
          return (
            <article key={card.id} className={cn("rounded-xl border p-3", active?.id === card.id ? "border-accent bg-bg" : "border-line bg-bg")}>
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 size-4 shrink-0 text-accent" />
                <div>
                  <h3 className="text-xs font-semibold">{card.title}</h3>
                  <p className="mt-1 text-[11px] leading-4 text-faint">{card.blurb}</p>
                </div>
              </div>
              <dl className="mt-2 space-y-1 font-mono text-[11px] text-muted">
                <Row k="Kontrakt" v={`${card.expiry} · ${card.dte.toFixed(1)}d · ${card.propEth.toFixed(1)} ETH`} />
                <Row k="Menge" v={card.qtyPut > 0 ? `${trim(card.qtyCall)}x Calls + ${trim(card.qtyPut)}x Puts` : `${trim(card.qtyCall)}x Calls`} />
                <Row k="Credit / Kontrakt" v={usd(card.credit)} />
                <Row k="Breach → Ziel" v={`${px(card.down)} → ${px(card.up)}`} />
                <Row k="Hold-to-Expiry" v={usd(card.breachExp)} />
                <Row k="Sunk Cost" v={usd(card.sunk)} />
                {plan.phase === "funded" ? <Row k="Netto bei Tod / TP" v={`${usd(card.netAtFail)} / ${usd(card.netAtTp)}`} /> : <Row k="Netto bei Fail" v={usd(card.netAtFail)} />}
                {card.qtyPut > 0 ? <Row k={card.floorOk ? "Crash-Plateau" : "Crash-Plateau zu tief"} v={usd(card.floor)} /> : null}
              </dl>
              <Button tone="accent" className="mt-3 h-9 w-full text-xs" onClick={() => { setPicked(card.id); onLoad(card, input); }}>
                In Chart & Rechner laden
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2"><dt>{k}</dt><dd className="text-fg">{v}</dd></div>;
}

function usd(n: number): string {
  const sign = n > 0.05 ? "+" : n < -0.05 ? "−" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 2 })}`;
}

function px(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function trim(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}
