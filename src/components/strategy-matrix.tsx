import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { optionsPnlUsd, type OptLeg } from "@/lib/options-sim";
import { buildPlans, monkeyUrl, skewView, type BreachHorizon, type Combo, type FillMode, type ScannedSetup, type SkewView, type TradePlan } from "@/lib/strategy-scan";

export type VestDesk = {
  asset: "ETH" | "BTC" | "SOL" | "HYPE";
  side: "long" | "short";
  coins: number;
  spot: number;
  account: number;
  maxDd: number;
  evalTarget: number;
  fundedGross: number;
  fundedNet: number;
  feeRefund: boolean;
  dailyLoss: number;
  safeDaily: number;
  dailyMode: "off" | "hedge" | "resize";
};

export function StrategyMatrix({
  rows,
  waiting,
  desk,
  horizon,
  cycle2,
  fill: _fill,
  feeRefund,
  shiftChoice: _shiftChoice,
  resolvedShift: _resolvedShift,
  onShift: _onShift,
  onHorizon: _onHorizon,
  onCycle: _onCycle,
  onFill: _onFill,
  onLoad,
}: {
  rows: ScannedSetup[];
  waiting: boolean;
  desk: VestDesk;
  horizon: BreachHorizon;
  cycle2: boolean;
  fill: FillMode;
  feeRefund: boolean;
  shiftChoice: 0 | 10 | 20 | 30 | "auto";
  resolvedShift: number;
  onShift: (shift: 0 | 10 | 20 | 30 | "auto") => void;
  onHorizon: (horizon: BreachHorizon) => void;
  onCycle: (on: boolean) => void;
  onFill: (mode: FillMode) => void;
  onLoad: (legs: OptLeg[], propEth: number) => void;
}) {
  const [picked, setPicked] = useState("");
  const [chartSide, setChartSide] = useState<"eval" | "funded" | "compare">("eval");
  const [entryMode, setEntryMode] = useState<"pass" | "spot">("pass");
  const loadRef = useRef(onLoad);
  loadRef.current = onLoad;
  const split = desk.fundedGross > 0 ? desk.fundedNet / desk.fundedGross : 0.8;
  const plans = useMemo(
    () => buildPlans(rows, horizon, cycle2, feeRefund, desk.account, split, desk.fundedGross, desk.coins, desk.side),
    [rows, horizon, cycle2, feeRefund, desk.account, desk.fundedGross, desk.coins, desk.side, split],
  );
  const plan = plans.find((item) => item.key === picked) ?? plans[0] ?? null;
  const skew = useMemo(() => skewView(rows), [rows]);
  useEffect(() => {
    if (!plan) return;
    loadRef.current(plan.combo.evalLegs, plan.evalRow.propEth);
  }, [plan?.key]);

  return (
    <section className="space-y-4">
      {plan ? <Cockpit desk={desk} plan={plan} horizon={horizon} cycle2={cycle2} entryMode={entryMode} skew={skew} onEntryMode={setEntryMode} /> : <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">{waiting ? "Warte auf Deribit-Kontrakte zwischen 1 und 2 Tagen." : "Keine Kombi erfüllt Gebühr, Rucksack und grünen Take-Profit."}</p>}
      <div className="space-y-2">
        <h2>Fertige Kombis</h2>
        <p className="text-xs leading-5 text-muted">Teil 1 und Teil 2 sind schon zusammengerechnet. Oben steht das Paar mit dem besten Gesamtergebnis. Kurze Laufzeit, kleiner Rucksack, beide Funded-Ausgänge über dem Minimum.</p>
        {plans.map((item, index) => {
          const evalNet = netAt(item.combo, horizon);
          const on = item.key === plan?.key;
          return (
            <article key={item.key} className={cn("rounded-2xl border p-3", on ? "border-long bg-bg" : "border-line bg-surface")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-fg">{index + 1}. {comboTitle(item)}{index === 0 ? " · Empfohlen" : ""}{item.green ? "" : " · nicht beide Seiten grün"}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">Teil 1 {item.combo.evalQty.toFixed(1)}x {legBrief(item.combo.evalLegs)} · Rucksack {usd(item.combo.sunk)} · Teil 2 {item.combo.fundedQty.toFixed(1)}x {legBrief(item.combo.fundedLegs)}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button type="button" className="h-8 rounded-lg bg-long px-2 text-[11px] font-semibold text-bg" onClick={() => setPicked(item.key)}>Diese Kombi oben laden</button>
                  <a href={monkeyUrl(desk.asset, item.combo.evalLegs)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg bg-raised px-2 text-[11px] font-semibold text-fg">In Monkey prüfen <ExternalLink className="h-3 w-3" /></a>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Result label="Eval-Tod" value={money(evalNet)} good={evalNet >= -0.5} />
                <Result label="Funded-Tod" value={money(item.combo.failTotal)} good={item.combo.failTotal > 0} />
                <Result label="Funded-Payout" value={money(item.combo.passTotal)} good={item.combo.passTotal > 0} />
              </div>
            </article>
          );
        })}
      </div>
      {plan ? (
        <div className="space-y-2 rounded-2xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2>Payoff</h2>
            <div className="flex flex-wrap gap-1">
              <button type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", chartSide === "eval" ? "bg-long text-bg" : "bg-bg text-muted")} onClick={() => setChartSide("eval")}>Chart: Teil 1 (Eval {plan.combo.evalQty.toFixed(1)}x)</button>
              <button type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", chartSide === "funded" ? "bg-accent text-on-accent" : "bg-bg text-muted")} onClick={() => setChartSide("funded")}>Chart: Teil 2 (Funded {plan.combo.fundedQty.toFixed(1)}x)</button>
              <button type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", chartSide === "compare" ? "bg-fg text-bg" : "bg-bg text-muted")} onClick={() => setChartSide("compare")}>Direktvergleich: Put vs. ITM Call</button>
            </div>
          </div>
          <CurveChart
            legs={chartLegs(chartSide, plan, rows, desk, entryMode).main}
            overlay={chartLegs(chartSide, plan, rows, desk, entryMode).overlay}
            spot={chartSide === "funded" && entryMode === "pass" ? fundedAnchor(desk, plan, entryMode) : desk.spot}
            breach={chartSide === "funded" ? fundedAnchor(desk, plan, entryMode) + (plan.fundedRow.down - plan.fundedRow.spot) : plan.evalRow.down}
            tp={chartSide === "funded" ? fundedAnchor(desk, plan, entryMode) + (plan.tpPrice - plan.fundedRow.spot) : passPrice(desk, plan)}
          />
        </div>
      ) : null}
    </section>
  );
}

function netAt(combo: Combo, horizon: BreachHorizon): number {
  const gross = horizon === "now" ? combo.evalNow : horizon === "1d" ? combo.evalD1 : combo.evalExp;
  return gross - combo.fee;
}

function Cockpit({ desk, plan, horizon, cycle2, entryMode, skew, onEntryMode }: { desk: VestDesk; plan: TradePlan; horizon: BreachHorizon; cycle2: boolean; entryMode: "pass" | "spot"; skew: SkewView | null; onEntryMode: (mode: "pass" | "spot") => void }) {
  const combo = plan.combo;
  const coins = Math.max(plan.evalRow.propEth, 0.01);
  const sign = desk.side === "long" ? 1 : -1;
  const stopPx = plan.evalRow.down;
  const stopDist = Math.abs(desk.spot - stopPx);
  const passDist = desk.evalTarget / coins;
  const passPx = desk.spot + sign * passDist;
  const fundedCoins = Math.max(plan.fundedRow.propEth, 0.01);
  const fundedStopDist = desk.maxDd / fundedCoins;
  const fundedTpDist = plan.fundedGross / fundedCoins;
  const anchor = entryMode === "pass" ? passPx : desk.spot;
  const fundedStop = anchor - sign * fundedStopDist;
  const fundedTp = anchor + sign * fundedTpDist;
  const volume = coins * desk.spot;
  const leverage = desk.account > 0 ? volume / desk.account : 0;
  const dir = desk.side === "long" ? "LONG" : "SHORT";
  const sheet = books(desk, plan, horizon, cycle2);
  const freeCash = combo.budget - combo.sunk;
  const fits = freeCash + 0.5 >= combo.margin;
  const rule = fundedRule(combo.fundedLegs, desk.spot, desk.asset);
  return (
    <div className="space-y-4">
      {skew ? <SkewPanel skew={skew} /> : null}
      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-4">
          <p className="text-[11px] font-semibold text-long">Jetzt ausführen</p>
          <h3 className="mt-1 text-lg font-semibold">Teil 1 · Heute die Evaluation starten</h3>
          <p className="mt-1 text-xs leading-5 text-muted">Ziel: die Challenge bestehen oder beim Stop ohne Verlust rausgehen. Teil 2 kommt erst danach.</p>
          <h4 className="mt-4 text-sm font-semibold">1A · Auf Vest eingeben</h4>
          <p className="mt-2 font-mono text-sm text-fg">{coins.toFixed(1)} {desk.asset} {dir}</p>
          <p className="text-xs text-muted">Volumen {usd(volume)} · {leverage.toFixed(2)}x Hebel</p>
          <p className="mt-2 text-sm text-fg">Stop {px(stopPx)} · −{usd(stopDist)}</p>
          <p className="text-sm text-fg">Take-Profit {px(passPx)} · +{usd(passDist)} · Ziel {usd(desk.evalTarget)}</p>
          <h4 className="mt-4 text-sm font-semibold">1B · Gleichzeitig auf Deribit, Limit-Mid</h4>
          <div className="mt-2 space-y-1">{combo.evalLegs.map((leg) => <OrderLine key={leg.id} leg={leg} asset={desk.asset} />)}</div>
          <p className="mt-2 text-xs text-muted">Margin ungefähr {usd(combo.evalMargin)}</p>
          <div className="mt-auto rounded-xl border border-line bg-bg p-3">
            <p className="text-xs leading-5 text-fg">Übergabe bei Eval-Pass ({px(passPx)}): Deribit-Hedge wird bei {money(combo.passAt)} geschlossen. Dein Rucksack für Teil 2 beträgt {money(-combo.sunk)} ({usd(combo.fee)} Gebühr + {usd(Math.abs(Math.min(0, combo.passAt)))}).</p>
            <a href={monkeyUrl(desk.asset, combo.evalLegs)} target="_blank" rel="noreferrer" className="mt-2 inline-flex h-8 items-center gap-1 rounded-lg bg-raised px-2 text-[11px] font-semibold text-fg">Teil-1-Beine in Monkey öffnen <ExternalLink className="h-3 w-3" /></a>
          </div>
        </article>
        <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-4">
          <p className="text-[11px] font-semibold text-accent">Erst wenn Teil 1 bestanden ist</p>
          <h3 className="mt-1 text-lg font-semibold">Teil 2 · Funded-Konto</h3>
          <p className="mt-1 text-xs leading-5 text-muted">Startet erst nach Teil 1, an einem neuen Entry. Die Strikes hängen an diesem Entry, nicht am heutigen Spot.</p>
          <div className="mt-3 flex flex-wrap gap-1">
            <button type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", entryMode === "pass" ? "bg-accent text-on-accent" : "bg-bg text-muted")} onClick={() => onEntryMode("pass")}>Berechnet ab Eval-Pass ({px(passPx)})</button>
            <button type="button" className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", entryMode === "spot" ? "bg-accent text-on-accent" : "bg-bg text-muted")} onClick={() => onEntryMode("spot")}>Berechnet ab aktuellem Live-Spot ({px(desk.spot)})</button>
          </div>
          <h4 className="mt-4 text-sm font-semibold">2A · Auf Vest eingeben</h4>
          <p className="mt-2 font-mono text-sm text-fg">{fundedCoins.toFixed(1)} {desk.asset} {dir}</p>
          <p className="mt-2 text-sm text-fg">Stop-Loss: −{usd(fundedStopDist)} unter deinem neuen Funded-Entry E (bei E = {px(anchor)} also {px(fundedStop)})</p>
          <p className="text-sm text-fg">Take-Profit: +{usd(fundedTpDist)} über E (bei E = {px(anchor)} also {px(fundedTp)}) · {usd(plan.fundedGross)} brutto = {usd(plan.fundedNet)} netto</p>
          <h4 className="mt-4 text-sm font-semibold">2B · Gleichzeitig auf Deribit, relativ zum neuen Entry</h4>
          <div className="mt-2 space-y-1">{combo.fundedLegs.map((leg) => <RelOrder key={leg.id} leg={leg} asset={desk.asset} spot={desk.spot} anchor={anchor} />)}</div>
          <p className="mt-2 text-xs leading-5 text-muted">{rule}</p>
          <p className="mt-1 text-xs text-muted">{combo.fundedQty.toFixed(1)}x statt {combo.evalQty.toFixed(1)}x · Margin ungefähr {usd(combo.margin)}</p>
          <div className="mt-auto rounded-xl border border-line bg-bg p-3">
            <p className="text-xs leading-5 text-fg">Benötigte Kriegskasse in Teil 2: Nach Teil 1 sind noch {usd(Math.max(0, freeCash))} von {usd(combo.budget)} frei. Teil 2 benötigt ~{usd(combo.margin)} Margin ({fits ? "Passt zu 100%." : "Marge reicht nicht."})</p>
            <a href={monkeyUrl(desk.asset, combo.fundedLegs)} target="_blank" rel="noreferrer" className="mt-2 inline-flex h-8 items-center gap-1 rounded-lg bg-raised px-2 text-[11px] font-semibold text-fg">Teil-2-Beine in Monkey öffnen <ExternalLink className="h-3 w-3" /></a>
          </div>
        </article>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Receipt title="Ausgang 1 · Eval stirbt beim Stop" lines={sheet.dead} />
        <Receipt title="Ausgang 2 · Eval bestanden, Funded stirbt" lines={sheet.fundedDead} />
        <Receipt title="Ausgang 3 · Eval bestanden und Funded-Payout" lines={sheet.payout} />
      </div>
    </div>
  );
}

type BookLine = { label: string; value: number; note?: string };

function books(desk: VestDesk, plan: TradePlan, horizon: BreachHorizon, cycle2: boolean): { dead: BookLine[]; fundedDead: BookLine[]; payout: BookLine[] } {
  const combo = plan.combo;
  const stopGain = horizon === "now" ? combo.evalNow : horizon === "1d" ? combo.evalD1 : combo.evalExp;
  const refund = desk.feeRefund && !cycle2 ? combo.fee : 0;
  const splitPct = desk.fundedGross > 0 ? Math.round((desk.fundedNet / desk.fundedGross) * 100) : 80;
  return {
    dead: [
      { label: "Gezahlte Challenge-Gebühr", value: -combo.fee },
      { label: "Deribit-Gewinn Teil 1 (am Stop)", value: stopGain, note: `bis ${money(combo.evalExp)} bei Verfall` },
    ],
    fundedDead: [
      { label: "Gezahlte Challenge-Gebühr (Teil 1)", value: -combo.fee },
      { label: "Deribit beim Eval-Pass (Teil 1)", value: combo.passAt },
      { label: "Deribit-Gewinn Teil 2 (beim Funded-Stop)", value: combo.failTotal + combo.sunk, note: `bis ${money(combo.fundedExp)} bei Verfall` },
    ],
    payout: [
      { label: `Vest Funded-Payout (${splitPct}% von ${usd(plan.fundedGross)})`, value: plan.fundedNet },
      { label: "Gebühren-Refund beim 1. Payout", value: refund },
      { label: "Abzüglich Challenge-Gebühr (Teil 1)", value: -combo.fee },
      { label: "Abzüglich Deribit Teil 1 (Eval-Pass)", value: combo.passAt },
      { label: "Abzüglich Deribit Teil 2 (Funded-TP)", value: combo.fundedTp },
    ],
  };
}

function Receipt({ title, lines }: { title: string; lines: BookLine[] }) {
  const total = lines.reduce((sum, line) => sum + line.value, 0);
  const good = total >= -0.5;
  return (
    <div className={cn("rounded-2xl border p-3", good ? "border-long/40 bg-long/10" : "border-short/40 bg-short/10")}>
      <p className="text-sm font-semibold text-fg">{title}</p>
      <dl className="mt-2 space-y-1.5">
        {lines.map((line) => (
          <div key={line.label} className="flex items-start justify-between gap-3 text-xs">
            <dt className="text-muted">{line.label}{line.note ? <span className="mt-0.5 block text-[10px]">{line.note}</span> : null}</dt>
            <dd className={cn("shrink-0 font-mono", line.value >= -0.005 ? "text-long" : "text-short")}>{money(line.value)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2 text-sm font-semibold">
        <span>Netto-Endstand</span>
        <span className={cn("font-mono", good ? "text-long" : "text-short")}>{money(total)}{good ? " · grün" : ""}</span>
      </div>
    </div>
  );
}

function comboTitle(plan: TradePlan): string {
  const same = plan.evalRow.kind === plan.fundedRow.kind;
  if (same) return `Reine Struktur · ${structureLabel(plan.evalRow)}`;
  return `Hybrid · Teil 1 ${plan.evalRow.title} → Teil 2 ${structureLabel(plan.fundedRow)}`;
}

function passPrice(desk: VestDesk, plan: TradePlan): number {
  const coins = Math.max(plan.evalRow.propEth, 0.01);
  const dist = desk.evalTarget / coins;
  return desk.side === "short" ? desk.spot - dist : desk.spot + dist;
}

function fundedAnchor(desk: VestDesk, plan: TradePlan, mode: "pass" | "spot"): number {
  return mode === "pass" ? passPrice(desk, plan) : desk.spot;
}

function shiftLegs(legs: OptLeg[], from: number, to: number): OptLeg[] {
  const delta = to - from;
  return legs.map((leg) => ({ ...leg, strike: leg.strike + delta }));
}

function offsetText(offset: number): string {
  const sign = offset >= 0 ? "+" : "−";
  return `E ${sign} ${usd(Math.abs(offset))}`;
}

function fundedRule(legs: OptLeg[], spot: number, asset: string): string {
  const buys = legs.filter((leg) => leg.side === "buy");
  const sells = legs.filter((leg) => leg.side === "sell");
  if (!buys.length || !sells.length) return "Die Abstände gelten ab dem neuen Funded-Entry E, nicht ab dem heutigen Spot.";
  const buy = buys[0];
  const sell = sells[0];
  const right = buy.right === "put" ? "Put" : "Call";
  return `Wenn Teil 1 bestanden ist und das Funded-Konto bei deinem neuen ${asset}-Kurs (E) startet: Kaufe ${buy.qty.toFixed(1)}x ${right} bei Strike (${offsetText(buy.strike - spot)}) und verkaufe ${sell.qty.toFixed(1)}x ${right} bei Strike (${offsetText(sell.strike - spot)}).`;
}

function RelOrder({ leg, asset, spot, anchor }: { leg: OptLeg; asset: string; spot: number; anchor: number }) {
  const offset = leg.strike - spot;
  const strike = anchor + offset;
  const right = leg.right === "put" ? "Put" : "Call";
  const text = `${leg.side === "sell" ? "SELL" : "BUY"} ${leg.qty.toFixed(1)}x ${asset} ${right} @ Strike (${offsetText(offset)}) [bei ${px(anchor)} → Strike ${px(strike)}]`;
  return (
    <button type="button" className="block w-full rounded-xl bg-bg px-3 py-2 text-left font-mono text-sm text-fg" onClick={() => navigator.clipboard?.writeText(text)}>
      {text}
    </button>
  );
}

function structureLabel(row: ScannedSetup): string {
  const strikes = [...row.legs].sort((a, b) => a.strike - b.strike).map((leg) => px(leg.strike));
  const width = Math.abs(Math.max(...row.legs.map((leg) => leg.strike)) - Math.min(...row.legs.map((leg) => leg.strike)));
  if (row.kind === "call-mirror") return `Enger ITM Bear Call (${strikes.join(" / ")} · ${usd(width)} Breite · Hohe Prämie · ${prettyExpiry(row.expiry)})`;
  return `${row.title} (${strikes.join(" / ")} · ${prettyExpiry(row.expiry)})`;
}

function legBrief(legs: OptLeg[]): string {
  return legs.map((leg) => `${leg.side === "sell" ? "S" : "B"} ${px(leg.strike)} ${leg.right === "put" ? "P" : "C"}`).join(" · ");
}

function sumLines(lines: BookLine[]): number {
  return lines.reduce((sum, line) => sum + line.value, 0);
}

function PathCard({ title, text, good }: { title: string; text: string; good: boolean | null }) {
  return (
    <div className={cn("rounded-xl border px-3 py-2", good == null ? "border-line bg-bg" : good ? "border-long/40 bg-long/10" : "border-short/40 bg-short/10")}>
      <p className="text-[11px] font-semibold text-fg">{title}</p>
      <p className={cn("mt-1 text-xs leading-5", good == null ? "text-muted" : good ? "text-long" : "text-short")}>{text}</p>
    </div>
  );
}

function SkewPanel({ skew }: { skew: SkewView }) {
  const callWay = skew.callBetter;
  const winner = callWay ? "ITM-Call-Spread (SELL Call / BUY Call)" : "Put-Debit-Spread (BUY Put / SELL Put)";
  const ivGap = skew.callIv - skew.putIv;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-sm font-semibold">Live Skew- und Put-Call-Parität</h3>
      <p className="mt-1 text-xs leading-5 text-muted">Dieselben Strikes {px(skew.low)} / {px(skew.high)}, Breite {usd(skew.width)}, {prettyExpiry(skew.expiry)}. Der Call-Deckel sitzt auf dem hohen Put-Strike, nicht am Take-Profit.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <p className="rounded-xl bg-bg px-3 py-2 text-xs leading-5 text-fg">Put-Debit: BUY {px(skew.high)} Put / SELL {px(skew.low)} Put. Netto-Debit {money(-Math.abs(skew.putDebit))}. Max-Gewinn {money(skew.putMax)}. IV {skew.putIv.toFixed(1)}%. Bid/Ask {usd(skew.putSlip)}.</p>
        <p className="rounded-xl bg-bg px-3 py-2 text-xs leading-5 text-fg">ITM-Call: SELL {px(skew.low)} Call / BUY {px(skew.high)} Call. Netto-Credit {money(skew.callCredit)}. Max-Risiko {money(-Math.abs(skew.callRisk))}. IV {skew.callIv.toFixed(1)}%. Bid/Ask {usd(skew.callSlip)}.</p>
      </div>
      <p className={cn("mt-3 rounded-xl px-3 py-2 text-xs font-semibold", callWay ? "bg-accent/15 text-fg" : "bg-long/10 text-long")}>
        Deribit-Skew bevorzugt gerade den {callWay ? "Call-Weg" : "Put-Weg"}. {winner} ist um {money(skew.advantage)} pro Kontrakt günstiger. Call-IV liegt {Math.abs(ivGap).toFixed(1)} Punkte {ivGap >= 0 ? "über" : "unter"} der Put-IV.
      </p>
    </section>
  );
}

function chartLegs(side: "eval" | "funded" | "compare", plan: TradePlan, rows: ScannedSetup[], desk: VestDesk, entryMode: "pass" | "spot"): { main: OptLeg[]; overlay: OptLeg[] | null } {
  if (side === "compare") {
    const put = rows.find((row) => row.kind === "put-debit");
    const call = rows.find((row) => row.kind === "call-mirror");
    return { main: put?.legs ?? plan.combo.evalLegs, overlay: call?.legs ?? null };
  }
  if (side === "funded") return { main: shiftLegs(plan.combo.fundedLegs, desk.spot, fundedAnchor(desk, plan, entryMode)), overlay: null };
  return { main: plan.combo.evalLegs, overlay: null };
}

function CurveChart({ legs, overlay = null, spot, breach, tp }: { legs: OptLeg[]; overlay?: OptLeg[] | null; spot: number; breach: number; tp: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState("");
  const signature = legs.map((leg) => `${leg.id}:${leg.qty}:${leg.strike}`).join("|");
  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent || !(spot > 0)) return;
    const draw = () => {
      const width = Math.max(280, parent.clientWidth);
      const height = 280;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = "100%";
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const lo = Math.min(breach, spot, tp) * 0.975;
      const hi = Math.max(breach, spot, tp) * 1.025;
      const dte = Math.max(1, ...legs.map((leg) => leg.dte || 0));
      const samples = Array.from({ length: 90 }, (_, index) => {
        const price = lo + ((hi - lo) * index) / 89;
        return {
          price,
          now: optionsPnlUsd(legs, price, 0, 0, 0, spot),
          d1: optionsPnlUsd(legs, price, Math.min(1, dte), 0, 0, spot),
          d2: optionsPnlUsd(legs, price, Math.min(2, dte), 0, 0, spot),
          expiry: optionsPnlUsd(legs, price, dte + 2, 0, 0, spot),
        };
      });
      const values = samples.flatMap((sample) => [sample.now, sample.d1, sample.d2, sample.expiry, 0]);
      const minY = Math.min(...values);
      const maxY = Math.max(...values);
      const pad = 28;
      const xOf = (price: number) => pad + ((price - lo) / Math.max(hi - lo, 1)) * (width - pad * 2);
      const yOf = (value: number) => pad + ((maxY - value) / Math.max(maxY - minY, 1)) * (height - pad * 2);
      ctx.beginPath();
      samples.forEach((sample, index) => {
        const x = xOf(sample.price);
        const y = yOf(Math.max(0, sample.expiry));
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      for (let index = samples.length - 1; index >= 0; index -= 1) ctx.lineTo(xOf(samples[index].price), yOf(0));
      ctx.closePath();
      ctx.fillStyle = "rgba(34,197,94,0.16)";
      ctx.fill();
      ctx.beginPath();
      samples.forEach((sample, index) => {
        const x = xOf(sample.price);
        const y = yOf(Math.min(0, sample.expiry));
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      for (let index = samples.length - 1; index >= 0; index -= 1) ctx.lineTo(xOf(samples[index].price), yOf(0));
      ctx.closePath();
      ctx.fillStyle = "rgba(239,68,68,0.16)";
      ctx.fill();
      ctx.strokeStyle = "rgba(148,163,184,0.45)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pad, yOf(0));
      ctx.lineTo(width - pad, yOf(0));
      ctx.stroke();
      const mark = (price: number, color: string) => {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(xOf(price), pad);
        ctx.lineTo(xOf(price), height - pad);
        ctx.stroke();
      };
      mark(breach, "#f87171");
      mark(spot, "#e2e8f0");
      mark(tp, "#4ade80");
      const stroke = (pick: (sample: (typeof samples)[number]) => number, color: string, dash: number[]) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.setLineDash(dash);
        ctx.beginPath();
        samples.forEach((sample, index) => {
          const x = xOf(sample.price);
          const y = yOf(pick(sample));
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      };
      stroke((sample) => sample.now, "#f8fafc", []);
      stroke((sample) => sample.d1, "#d6e34a", [4, 3]);
      stroke((sample) => sample.d2, "#2dd4bf", [2, 3]);
      stroke((sample) => sample.expiry, "#22c55e", []);
      if (overlay?.length) {
        const extra = Array.from({ length: 90 }, (_, index) => {
          const price = lo + ((hi - lo) * index) / 89;
          return optionsPnlUsd(overlay, price, 10_000, 0, 0, spot);
        });
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([]);
        ctx.beginPath();
        extra.forEach((value, index) => {
          const price = lo + ((hi - lo) * index) / 89;
          const x = xOf(price);
          const y = yOf(value);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    };
    draw();
    const watcher = new ResizeObserver(draw);
    watcher.observe(parent);
    return () => watcher.disconnect();
  }, [signature, spot, breach, tp, legs, overlay]);
  return (
    <div>
      <p className="mb-1 min-h-4 font-mono text-[11px] text-muted">{hover || (overlay?.length ? "Put: Now weiß · 1d gelb · 2d türkis · Exp grün · Call-Spiegel lila" : "Now weiß · 1d gelb · 2d türkis · Exp grün/rot · Linien: Stop, Spot, TP")}</p>
      <canvas
        ref={ref}
        className="w-full rounded-xl bg-bg"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
          const lo = Math.min(breach, spot, tp) * 0.975;
          const hi = Math.max(breach, spot, tp) * 1.025;
          const price = lo + (hi - lo) * ratio;
          const dte = Math.max(1, ...legs.map((leg) => leg.dte || 0));
          const now = optionsPnlUsd(legs, price, 0, 0, 0, spot);
          const d1 = optionsPnlUsd(legs, price, Math.min(1, dte), 0, 0, spot);
          const d2 = optionsPnlUsd(legs, price, Math.min(2, dte), 0, 0, spot);
          const expiry = optionsPnlUsd(legs, price, dte + 2, 0, 0, spot);
          setHover(`${px(price)} · Now ${money(now)} · 1d ${money(d1)} · 2d ${money(d2)} · Exp ${money(expiry)}`);
        }}
        onMouseLeave={() => setHover("")}
      />
    </div>
  );
}

function Result({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className={cn("rounded-2xl border px-3 py-3", good ? "border-long/40 bg-long/10" : "border-short/40 bg-short/10")}>
      <p className="text-[11px] text-muted">{label}</p>
      <p className={cn("mt-1 font-mono text-base font-semibold", good ? "text-long" : "text-short")}>{value}</p>
    </div>
  );
}

function OrderLine({ leg, asset }: { leg: OptLeg; asset: string }) {
  const mid = leg.mark ?? leg.premium ?? 0;
  const text = `${leg.side === "sell" ? "SELL" : "BUY"} ${leg.qty.toFixed(1)}x ${asset} ${leg.right === "put" ? "Put" : "Call"} ${px(leg.strike)} (${prettyExpiry(leg.expiry)}) @ Limit ${usd(mid)}`;
  return (
    <button type="button" className="block w-full rounded-xl bg-bg px-3 py-2 text-left font-mono text-sm text-fg" onClick={() => navigator.clipboard?.writeText(text)}>
      {text}
    </button>
  );
}

function prettyExpiry(code: string): string {
  if (!code) return "—";
  return code.replace(/(\d{1,2})([A-Z]{3})(\d{2})/, "$1 $2 $3");
}

function money(value: number): string {
  const sign = value < -0.005 ? "−" : value > 0.005 ? "+" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function usd(value: number): string {
  return `$${Math.abs(value).toFixed(value >= 100 ? 0 : 2)}`;
}

function px(value: number): string {
  return value >= 100 ? `$${value.toFixed(0)}` : `$${value.toFixed(2)}`;
}
