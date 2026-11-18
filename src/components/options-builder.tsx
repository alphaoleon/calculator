import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { StrategyMatrix } from "@/components/strategy-matrix";
import { cn } from "@/lib/cn";
import { syntheticChain, useDeribitLive, type ChainContract } from "@/lib/deribit-live";
import { barriers, defaultSetup, type Asset, type OptLeg, type PropSetup, type PropSide } from "@/lib/options-sim";
import { type LiveOption } from "@/lib/phase-optimizer";
import { usePhasePlan } from "@/lib/phase-store";
import { bestSetup, comboFor, pickAutoShift, scanSetups, type BreachHorizon, type FillMode } from "@/lib/strategy-scan";

const ACCOUNTS = [5_000, 10_000, 25_000, 50_000, 100_000] as const;

export function OptionsBuilder({ live: _chartLive = true }: { live?: boolean }) {
  const plan = usePhasePlan();
  const [setup, setSetup] = useState<PropSetup>(() => defaultSetup());
  const [legs, setLegs] = useState<OptLeg[]>([]);
  const [syncEntry, setSyncEntry] = useState(true);
  const [fill, setFill] = useState<FillMode>("mark");
  const [horizon, setHorizon] = useState<BreachHorizon>("1d");
  const [cycle2, setCycle2] = useState(false);
  const [shiftChoice, setShiftChoice] = useState<0 | 10 | 20 | 30 | "auto">("auto");
  const [feeRefund, setFeeRefund] = useState(false);
  const [dailyText, setDailyText] = useState("0");
  const [dailyMode, setDailyMode] = useState<"off" | "hedge" | "resize">("off");
  const [dailyMove, setDailyMove] = useState(60);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const rawDaily = Math.max(0, Number(dailyText) || 0);
  const dailyAsPercent = rawDaily > 0 && rawDaily <= 15;
  const dailyLoss = dailyAsPercent ? Math.round(plan.accountSize * (rawDaily / 100)) : rawDaily;
  const userEdited = useRef(false);
  const loadedKey = useRef("");
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    if (!plan.ready) plan.hydrate();
  }, [plan]);

  useEffect(() => {
    setDailyText("0");
    setDailyMode("off");
    setSetup((prev) => (prev.asset === "ETH" ? prev : { ...defaultSetup(), index: prev.index || defaultSetup().index }));
  }, []);

  const names = useMemo(() => legs.map((row) => row.name).filter(Boolean), [legs]);
  const live = useDeribitLive(setup.asset, names);
  const pxIndex = live.index > 0 ? live.index : setup.index;

  useEffect(() => {
    if (!syncEntry || !(live.index > 0) || dailyMode === "resize") return;
    setSetup((prev) => {
      const coins = fitCoins(prev, live.index);
      if (Math.abs(prev.index - live.index) < 0.005 && coins === prev.coins) return prev;
      return { ...prev, index: live.index, coins };
    });
  }, [syncEntry, live.index, dailyMode]);

  const optInput = useMemo(() => ({
    phase: plan.phase,
    spot: pxIndex,
    asset: setup.asset,
    accountSize: plan.accountSize,
    challengeFee: setup.fee,
    maxDrawdownUsd: setup.maxDd,
    evalTargetUsd: plan.phase === "eval" ? setup.target : plan.evalTargetUsd,
    fundedTpPercent: plan.fundedTpPercent,
    targetFailNetProfit: plan.targetFailNetProfit,
    split: plan.split,
    sunkOverride: plan.sunkOverride,
    budget: plan.budget,
    propEth: setup.coins,
  }), [plan, setup, pxIndex]);

  const liveOptions = useMemo<LiveOption[]>(() => {
    const chain = live.chain.length ? live.chain : live.error ? syntheticChain(setup.asset, pxIndex) : [];
    return chain.map((contract) => toLive(contract, pxIndex));
  }, [live.chain, live.error, setup.asset, pxIndex]);

  const safeDaily = dailyLoss > 0 ? dailyLoss * 0.9 : 0;
  const minStopMove = pxIndex * 0.012;
  const dailyMovePx = setup.coins > 0 ? safeDaily / setup.coins : 0;
  const dailyTooTight = dailyLoss > 0 && dailyMode !== "off" && dailyMovePx < minStopMove;
  const hedgeUsd = dailyLoss > 0 && dailyMode !== "off" && !dailyTooTight ? safeDaily : setup.maxDd;
  const resolvedShift = useMemo(
    () => (shiftChoice === "auto" ? pickAutoShift(optInput, liveOptions, fill, hedgeUsd) : shiftChoice),
    [shiftChoice, optInput, liveOptions, fill, hedgeUsd],
  );

  const scanned = useMemo(
    () => scanSetups(optInput, liveOptions, plan.phase === "funded" ? plan.accountSize * plan.fundedTpPercent / 100 * plan.split : setup.payout, fill, resolvedShift, hedgeUsd, horizon),
    [optInput, liveOptions, plan.phase, plan.accountSize, plan.fundedTpPercent, plan.split, setup.payout, fill, resolvedShift, hedgeUsd, horizon],
  );

  useEffect(() => {
    if (dailyMode !== "resize" || !(dailyLoss > 0)) return;
    const distance = Math.max(20, dailyMove * (plan.accountSize / 5000));
    const coins = Math.max(0.1, Math.round(((dailyLoss * 0.9) / distance) * 10) / 10);
    setSetup((prev) => (Math.abs(prev.coins - coins) < 0.05 ? prev : { ...prev, coins }));
  }, [dailyMode, dailyLoss, dailyMove, plan.accountSize]);

  useEffect(() => {
    if (userEdited.current) return;
    const best = bestSetup(scanned.rows, horizon, setupRef.current.coins);
    if (!best) return;
    const sized = comboFor(best, horizon, cycle2);
    const key = `${fill}:${horizon}:${cycle2}:${best.id}:${sized.evalQty.toFixed(1)}`;
    if (loadedKey.current === key) return;
    loadedKey.current = key;
    setLegs(sized.evalLegs.map((leg) => ({ ...leg, on: true })));
  }, [scanned.rows, fill, horizon, cycle2]);

  const applyAccount = (account: number) => {
    const scale = account / 5000;
    const fee = Math.round(75 * scale);
    const maxDd = Math.round(account * 0.06);
    const evalTarget = Math.round(account * 0.09);
    const spot = pxIndex > 0 ? pxIndex : setup.index;
    plan.patch({
      accountSize: account,
      challengeFee: fee,
      maxDrawdownUsd: maxDd,
      evalTargetUsd: evalTarget,
      budget: Math.round(540 * scale),
      propEth: Math.max(0.01, Math.round((maxDd / (spot * 0.029)) * 100) / 100),
    });
    setSetup((prev) => ({
      ...prev,
      fee,
      maxDd,
      target: plan.phase === "funded" ? account * plan.fundedTpPercent / 100 : evalTarget,
      coins: Math.max(0.01, Math.round((maxDd / (spot * 0.029)) * 100) / 100),
      payout: Math.round(account * plan.fundedTpPercent / 100 * plan.split),
    }));
  };

  const setAsset = (asset: Asset) => {
    userEdited.current = false;
    loadedKey.current = "";
    setSetup((prev) => ({ ...prev, asset }));
    setLegs((rows) => rows.filter((row) => !row.name || row.name.startsWith(`${asset}-`) || row.name.startsWith(`${asset}_USDC-`) || row.name.startsWith(`SYN-${asset}-`)));
  };

  const bars = barriers({ ...setup, index: pxIndex });
  const patch = (next: Partial<PropSetup>) => setSetup((prev) => ({ ...prev, ...next }));

  return (
    <div className="prop-desk mx-auto w-full max-w-[1440px] space-y-4 px-3 py-4 sm:px-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="prop-kicker">Options + Prop</p>
          <h2>Live-Hedge für {setup.asset}</h2>
        </div>
        <p className={cn("rounded-full px-3 py-1 text-xs", live.status === "live" ? "bg-long/15 text-long" : "bg-raised text-muted")}>
          {bookLabel(setup.asset, live.chain.length > 0, live.status === "live")}
        </p>
      </header>
      {live.error ? <p className="text-xs text-short">{live.error}</p> : null}

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap gap-1">
          {(["ETH", "BTC", "SOL", "HYPE"] as const).map((asset) => (
            <button key={asset} type="button" className={cn("h-8 rounded-full px-3 text-xs font-semibold", setup.asset === asset ? "bg-fg text-bg" : "bg-bg text-muted")} onClick={() => setAsset(asset)}>{asset === "SOL" ? "Solana" : asset}</button>
          ))}
          {ACCOUNTS.map((account) => (
            <button key={account} type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", plan.accountSize === account ? "bg-long text-bg" : "bg-bg text-muted")} onClick={() => applyAccount(account)}>
              {account === 5000 ? "$5,000" : `$${account.toLocaleString("en-US")}`}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {sizeChoices(setup.asset, plan.accountSize, pxIndex).map((choice) => {
            const stop = setup.maxDd / Math.max(choice.coins, 0.01);
            const on = Math.abs(setup.coins - choice.coins) < Math.max(choice.coins >= 1 ? 0.05 : 0.005, choice.coins * 0.04);
            return (
              <button key={choice.lev} type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", on ? "bg-long text-bg" : "bg-bg text-muted")} onClick={() => patch({ coins: choice.coins })}>
                {choice.coins >= 10 ? choice.coins.toFixed(0) : choice.coins.toFixed(choice.coins >= 1 ? 1 : 2)} {setup.asset} (−${stop.toFixed(0)} Stop{choice.optimal ? " — Optimal" : ""})
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1">
          {([
            ["now", "Sofort (Tag 0)"],
            ["1d", "Nach 1 Tag (Standard)"],
            ["exp", "Bei Verfall"],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", horizon === id ? "bg-long text-bg" : "bg-bg text-muted")} onClick={() => setHorizon(id)}>{label}</button>
          ))}
          <button type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", feeRefund ? "bg-long text-bg" : "bg-bg text-muted")} onClick={() => setFeeRefund((on) => !on)}>
            Gebühren-Refund beim 1. Payout: {feeRefund ? `AN (+$${Math.round(setup.fee)})` : "AUS"}
          </button>
        </div>
      </section>
      <details className="rounded-2xl border border-line bg-surface p-4 [&:not([open])>*:not(summary)]:hidden" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
        <summary className="cursor-pointer text-sm font-semibold text-fg">Erweiterte Parameter anpassen</summary>
        <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>Konto</h2>
          <div className="flex flex-wrap gap-1 rounded-xl bg-bg p-1">
            {([["eval", "Phase 1 · Eval"], ["funded", "Phase 2 · Funded"]] as const).map(([id, label]) => (
              <button key={id} type="button" className={cn("h-8 rounded-lg px-3 text-xs font-semibold", plan.phase === id ? "bg-accent text-on-accent" : "text-muted")} onClick={() => { plan.setPhase(id); patch({ target: id === "funded" ? plan.accountSize * plan.fundedTpPercent / 100 : plan.evalTargetUsd }); }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={cn("h-8 rounded-full px-3 text-xs font-semibold", syncEntry ? "bg-long text-bg" : "bg-bg text-muted")} onClick={() => { const next = !syncEntry; setSyncEntry(next); if (next && live.index > 0) patch({ index: live.index }); }}>
            Index {syncEntry ? "live" : "fest"} · {px(pxIndex)}
          </button>
          <button type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", !cycle2 ? "bg-long text-bg" : "bg-bg text-muted")} onClick={() => setCycle2(false)}>Normal: Eval, dann Funded</button>
          <button type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", cycle2 ? "bg-accent text-on-accent" : "bg-bg text-muted")} onClick={() => setCycle2(true)}>Ab Payout #2</button>
          <button type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", fill === "mark" ? "bg-fg text-bg" : "bg-bg text-muted")} onClick={() => setFill("mark")}>Limit-Mid (Empfohlen)</button>
          <button type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", fill === "book" ? "bg-fg text-bg" : "bg-bg text-muted")} onClick={() => setFill("book")}>Bid/Ask-Fill</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Account ($)"><input className={fieldClass} inputMode="decimal" value={num(plan.accountSize)} onChange={(event) => applyAccount(clamp(event.target.value, 500, 5_000_000, plan.accountSize))} /></Field>
          <Field label="Challenge-Gebühr ($)"><input className={fieldClass} inputMode="decimal" value={num(setup.fee)} onChange={(event) => { const fee = clamp(event.target.value, 0, 1_000_000, setup.fee); patch({ fee }); plan.patch({ challengeFee: fee }); }} /></Field>
          <Field label="Max Drawdown ($)"><input className={fieldClass} inputMode="decimal" value={num(setup.maxDd)} onChange={(event) => { const maxDd = clamp(event.target.value, 0, 5_000_000, setup.maxDd); patch({ maxDd }); plan.patch({ maxDrawdownUsd: maxDd }); }} /></Field>
          <Field label="Profit Target ($)"><input className={fieldClass} inputMode="decimal" value={num(setup.target)} onChange={(event) => { const target = clamp(event.target.value, 0, 5_000_000, setup.target); patch({ target }); if (plan.phase === "eval") plan.patch({ evalTargetUsd: target }); else if (plan.accountSize > 0) plan.patch({ fundedTpPercent: Math.min(10, Math.max(3, (target / plan.accountSize) * 100)) }); }} /></Field>
          <Field label="Richtung">
            <div className="mt-1 grid grid-cols-2 gap-1">
              {(["long", "short"] as const).map((side) => (
                <button key={side} type="button" className={cn("h-8 rounded-lg text-xs font-semibold", setup.side === side ? (side === "long" ? "bg-long text-bg" : "bg-short text-bg") : "bg-bg text-muted")} onClick={() => patch({ side: side satisfies PropSide })}>{side === "long" ? "LONG" : "SHORT"}</button>
              ))}
            </div>
          </Field>
          <Field label={`Größe (${setup.asset})`}>
            <input className={fieldClass} inputMode="decimal" value={num(setup.coins)} onChange={(event) => patch({ coins: clamp(event.target.value, 0, 1_000_000, setup.coins) })} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-1">
          {([0, 10, 20, 30] as const).map((shift) => (
            <button key={shift} type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", shiftChoice === shift ? "bg-long text-bg" : "bg-bg text-muted")} onClick={() => setShiftChoice(shift)}>+${shift} Strike</button>
          ))}
          <button type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", shiftChoice === "auto" ? "bg-long text-bg" : "bg-bg text-muted")} onClick={() => setShiftChoice("auto")}>Strike Auto +${resolvedShift}</button>
        </div>
        <div className="space-y-2">
          <div className="grid gap-3 sm:grid-cols-[16rem_minmax(0,1fr)] sm:items-end">
            <Field label="Daily Loss ($) selbst eintragen">
              <input
                className={fieldClass}
                inputMode="decimal"
                placeholder="z.B. 150"
                value={dailyText}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^0-9.]/g, "");
                  setDailyText(raw);
                  const next = Number(raw);
                  if (!raw || !(next > 0)) setDailyMode("off");
                  else if (dailyMode === "off") setDailyMode("hedge");
                }}
              />
            </Field>
            <p className="text-[11px] leading-5 text-muted">{dailyAsPercent ? `Die ${rawDaily} gilt als ${rawDaily}% vom Konto, also $${dailyLoss.toFixed(0)} Daily Loss. Erst ab 16 ist es ein Dollar-Betrag.` : "0 = kein Daily Loss, nur der statische Drawdown. 1 bis 15 wird als Prozent gelesen."}{dailyTooTight ? ` Der Abstand wäre nur $${dailyMovePx.toFixed(2)}, unter 1,2% vom Spot. Der Hedge bleibt auf dem Max Drawdown.` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {([
              [0, "Kein Daily Loss"],
              [0.03, `3% = $${Math.round(plan.accountSize * 0.03)}`],
              [0.04, `4% = $${Math.round(plan.accountSize * 0.04)}`],
              [0.05, `5% = $${Math.round(plan.accountSize * 0.05)}`],
            ] as const).map(([pct, label]) => {
              const dollars = Math.round(plan.accountSize * pct);
              const on = pct === 0 ? dailyLoss === 0 : Math.abs(dailyLoss - dollars) < 1;
              return (
                <button key={pct} type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", on ? "bg-accent text-on-accent" : "bg-bg text-muted")} onClick={() => { setDailyText(String(dollars)); setDailyMode(pct === 0 ? "off" : dailyMode === "off" ? "hedge" : dailyMode); }}>
                  {label}
                </button>
              );
            })}
          </div>
          {dailyLoss > 0 ? (
            <div className="space-y-2 rounded-xl border border-accent/40 bg-accent/10 p-3">
              <p className="text-xs leading-5 text-fg">Sicherheits-Stop ${safeDaily.toFixed(0)} (90% von ${dailyLoss.toFixed(0)}). Puffer ${(dailyLoss - safeDaily).toFixed(0)} vor dem Daily-Breach.</p>
              <div className="flex flex-wrap gap-1">
                <button type="button" className={cn("rounded-lg px-2 py-1 text-left text-[11px] font-semibold", dailyMode === "hedge" ? "bg-long text-bg" : "bg-bg text-muted")} onClick={() => setDailyMode("hedge")}>Hedge auf den Daily-SL legen, Konto überlebt</button>
                <button type="button" className={cn("rounded-lg px-2 py-1 text-left text-[11px] font-semibold", dailyMode === "resize" ? "bg-long text-bg" : "bg-bg text-muted")} onClick={() => setDailyMode("resize")}>Prop-Größe verkleinern</button>
              </div>
              {dailyMode === "hedge" ? (
                <p className="text-xs leading-5 text-muted">Bei {setup.coins.toFixed(1)} {setup.asset} liegt der Hedge ${(safeDaily / Math.max(setup.coins, 0.01)).toFixed(0)} unter dem Entry. Trifft der Stop, kassierst du auf Deribit und behältst ${Math.max(0, setup.maxDd - safeDaily).toFixed(0)} Rest-Drawdown auf demselben Konto.</p>
              ) : (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] text-muted">Kursabstand</span>
                  {[60, 80].map((move) => (
                    <button key={move} type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", dailyMove === move ? "bg-fg text-bg" : "bg-bg text-muted")} onClick={() => setDailyMove(move)}>
                      −${Math.round(move * plan.accountSize / 5000)}
                    </button>
                  ))}
                  <span className="text-[11px] text-muted">ergibt {((dailyLoss * 0.9) / Math.max(20, dailyMove * plan.accountSize / 5000)).toFixed(2)} {setup.asset}.</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Meter label="DD Barrier" value={bars.dd == null ? "—" : px(bars.dd)} tone="text-short" />
          <Meter label="Live Spot" value={px(pxIndex)} tone="text-fg" />
          <Meter label="Pass TP" value={bars.pass == null ? "—" : px(bars.pass)} tone="text-long" />
        </div>
        <p className="text-xs leading-5 text-muted">
          {setup.coins.toFixed(1)} {setup.asset} {setup.side === "long" ? "Long" : "Short"} auf {px(plan.accountSize)} · Volumen {px(setup.coins * pxIndex)} · {(plan.accountSize > 0 ? (setup.coins * pxIndex) / plan.accountSize : 0).toFixed(2)}x Hebel · $1 Kurs = ±${setup.coins.toFixed(2)}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[11px] text-muted">
            Reingewinn bei Funded-Tod ${plan.targetFailNetProfit.toFixed(0)}
            <input type="range" min={0} max={200} step={5} value={plan.targetFailNetProfit} onChange={(event) => plan.patch({ targetFailNetProfit: Number(event.target.value) })} className="mt-1 w-full" />
          </label>
          <label className="block text-[11px] text-muted">
            Funded Take-Profit Brutto ${Math.round(plan.accountSize * plan.fundedTpPercent / 100)} · netto ${Math.round(plan.accountSize * plan.fundedTpPercent / 100 * plan.split)}
            <input
              type="range"
              min={Math.round(400 * plan.accountSize / 5000)}
              max={Math.round(650 * plan.accountSize / 5000)}
              step={Math.max(5, Math.round(plan.accountSize / 5000) * 5)}
              value={Math.min(Math.round(650 * plan.accountSize / 5000), Math.max(Math.round(400 * plan.accountSize / 5000), Math.round(plan.accountSize * plan.fundedTpPercent / 100)))}
              onChange={(event) => plan.patch({ fundedTpPercent: plan.accountSize > 0 ? (Number(event.target.value) / plan.accountSize) * 100 : plan.fundedTpPercent })}
              className="mt-1 w-full"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted">Funded Profit Split</span>
          {([0.8, 0.9] as const).map((split) => (
            <button key={split} type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", plan.split === split ? "bg-accent text-on-accent" : "bg-bg text-muted")} onClick={() => plan.patch({ split })}>
              {Math.round(split * 100)}%{split === 0.8 ? " Standard" : ""}
            </button>
          ))}
        </div>
        </div>
      </details>
      <StrategyMatrix
        rows={scanned.rows}
        waiting={!live.chain.length && !liveOptions.length}
        desk={{
          asset: setup.asset,
          side: setup.side,
          coins: setup.coins,
          spot: pxIndex,
          account: plan.accountSize,
          maxDd: setup.maxDd,
          evalTarget: plan.phase === "eval" ? setup.target : plan.evalTargetUsd,
          fundedGross: plan.accountSize * plan.fundedTpPercent / 100,
          fundedNet: plan.accountSize * plan.fundedTpPercent / 100 * plan.split,
          feeRefund,
          dailyLoss,
          safeDaily,
          dailyMode,
        }}
        horizon={horizon}
        cycle2={cycle2}
        fill={fill}
        feeRefund={feeRefund}
        shiftChoice={shiftChoice}
        resolvedShift={resolvedShift}
        onShift={setShiftChoice}
        onHorizon={setHorizon}
        onCycle={setCycle2}
        onFill={setFill}
        onLoad={(next, propEth) => {
          userEdited.current = true;
          setLegs(next.map((leg) => ({ ...leg, on: true })));
          if (propEth > 0) patch({ coins: propEth });
        }}
      />
    </div>
  );
}

function bookLabel(asset: Asset, liveBook: boolean, connected: boolean): string {
  const book = asset === "SOL" ? "SOL_USDC" : asset === "HYPE" ? "HYPE_USDC" : asset;
  if (liveBook) return connected ? `Deribit live · ${book}` : `Deribit · ${book}`;
  if (!connected) return `Deribit · ${book} wird geladen`;
  return `Deribit · ${book}`;
}

function sizeChoices(asset: Asset, account: number, spot: number): { lev: number; coins: number; optimal: boolean }[] {
  const price = spot > 0 ? spot : asset === "BTC" ? 74_500 : asset === "SOL" ? 85 : asset === "HYPE" ? 74 : 2_088;
  return [1.46, 2.09, 3.05].map((lev) => {
    const raw = (account * lev) / price;
    const coins = raw >= 20 ? Math.max(1, Math.round(raw)) : raw >= 1 ? Math.max(0.1, Math.round(raw * 10) / 10) : Math.max(0.01, Math.round(raw * 100) / 100);
    return { lev, coins, optimal: lev === 2.09 };
  });
}

function toLive(contract: ChainContract, index: number): LiveOption {
  const underlying = contract.underlying || index;
  const usd = (coin: number | null) => {
    if (coin == null || !(coin > 0)) return null;
    return contract.linear ? coin : underlying > 0 ? coin * underlying : null;
  };
  return {
    name: contract.name,
    expiry: contract.expiry,
    dte: contract.dte,
    strike: contract.strike,
    right: contract.right,
    iv: contract.iv,
    markUsd: usd(contract.markCoin) ?? 0,
    bidUsd: usd(contract.bidCoin),
    askUsd: usd(contract.askCoin),
    underlying,
  };
}

function fitCoins(setup: PropSetup, index: number): number {
  if (!(index > 0) || !(setup.maxDd > 0)) return setup.coins;
  const pct = (setup.maxDd / Math.max(setup.coins, 0.01)) / index;
  if (pct <= 0.18 && pct >= 0.005) return setup.coins;
  return Math.max(0.1, Math.round((setup.maxDd / (index * 0.029)) * 10) / 10);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 text-[11px] text-muted">{label}{children}</label>;
}

function Meter({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-bg px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={cn("truncate font-mono text-sm font-semibold", tone)}>{value}</p>
    </div>
  );
}

const fieldClass = "mt-1 h-10 w-full rounded-xl border border-line bg-bg px-2 text-right font-mono text-sm text-fg";

function num(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

function clamp(raw: string, min: number, max: number, fallback: number): number {
  if (raw.trim() === "") return min;
  const next = Number(raw);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function px(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
