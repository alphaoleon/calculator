import { LIVE_MARKETS, fetchLiveQuotes, type LiveQuote } from "@/lib/binance-live";
import { useEffect, useMemo, useRef, useState } from "react";
import { Settings, Trash2 } from "lucide-react";
import { HydraPayoff } from "@/components/hydra-payoff";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  CYCLE_TEMPLATES,
  applyTemplate,
  clashingFirms,
  defaultPlan,
  firmLabel,
  loadPlan,
  materialize,
  savePlan,
  type CyclePlan,
  type CycleSlot,
} from "@/lib/cycle";
import { useBook } from "@/lib/book-store";
import { fmtUsd } from "@/lib/format";
import {
  ACCOUNT_SIZES,
  DEFAULT_PRESETS,
  FIRM_PLATFORMS,
  accountCash,
  collectivePassMove,
  failFraction,
  fuzzWide,
  hedgeReserve,
  loadPresets,
  maxDdUsd,
  orderPrices,
  passMove,
  priceOf,
  savePresets,
  setLoopSettings,
  type AccountSize,
  type FirmPreset,
  type HedgeMode,
} from "@/lib/hydra-loop";
import type { PropAccount } from "@/lib/types";

const BANK_KEY = "position-builder.bankroll.v1";
const TAX_KEY = "position-builder.tax.v1";

type TaxRow = {
  nr: number;
  date: string;
  text: string;
  wallet: string;
  usd: number;
  fx: number;
  eur: number;
};

function roundEntry(price: number): number {
  if (price >= 100) return Math.round(price * 100) / 100;
  if (price >= 1) return Math.round(price * 1000) / 1000;
  return Math.round(price * 1e8) / 1e8;
}

function fmtLive(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 0.01) return price.toFixed(4);
  return price.toPrecision(3);
}

function LiveBoards({
  quotes,
  liveSymbol,
  onPick,
}: {
  quotes: Record<string, LiveQuote>;
  liveSymbol: string | null;
  onPick: (symbol: string) => void;
}) {
  const pinned = LIVE_MARKETS.find((market) => market.symbol === liveSymbol);
  return (
    <div className="mt-4">
      <p className="text-[11px] text-faint">
        {pinned
          ? `${pinned.id} folgt ${quotes[pinned.symbol]?.futures === false ? "dem letzten Hyperliquid-Kurs" : "Hyperliquid"}. Tippen ins Feld macht den Kurs manuell.`
          : "Manueller Kurs aktiv. Ein Button startet den Live-Kurs."}
      </p>
      {(["crypto", "tradfi"] as const).map((group) => (
        <div key={group} className="mt-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{group === "crypto" ? "Crypto" : "TradFi"}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {LIVE_MARKETS.filter((market) => market.group === group).map((market) => {
              const row = quotes[market.symbol];
              const on = liveSymbol === market.symbol;
              return (
                <button
                  key={market.symbol}
                  type="button"
                  className={cn("h-7 rounded-full px-2 font-mono text-[11px]", on ? "bg-fg text-bg" : "bg-bg text-muted")}
                  onClick={() => onPick(market.symbol)}
                >
                  {market.id} {row ? fmtLive(row.price) : "…"}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const HEDGE_MODES: { id: HedgeMode; label: string }[] = [
  { id: "manual", label: "✏️ Manuell" },
  { id: "auto", label: "🧠 Smart-Hedge (Auto, 10% Restpuffer)" },
];

export function HydraWizard() {
  const currency = useBook((state) => state.currency);
  const setProps = useBook((state) => state.setProps);
  const [plan, setPlan] = useState<CyclePlan>(defaultPlan);
  const [presets, setPresets] = useState<FirmPreset[]>(DEFAULT_PRESETS);
  const [firmsOpen, setFirmsOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [bank, setBank] = useState({ cash: 500, fails: 0 });
  const [ledger, setLedger] = useState<TaxRow[]>([]);
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [liveSymbol, setLiveSymbol] = useState<string | null>(null);
  const entryRef = useRef<HTMLInputElement>(null);
  const livePaused = useRef(false);

  useEffect(() => {
    const loaded = loadPlan();
    setPlan(loaded);
    if (entryRef.current) entryRef.current.value = String(loaded.entry);
    setPresets(loadPresets());
    setBank(loadBank());
    setLedger(loadLedger());
    setReady(true);
  }, []);

  const accounts = useMemo(() => materialize(plan, presets), [plan, presets]);

  useEffect(() => {
    if (!ready) return;
    savePlan(plan);
    const failPrice = plan.entry * (1 + failFraction(plan.side, plan.sl));
    const fundedPayout = accounts
      .filter((account) => account.enabled && account.phase === "funded")
      .reduce((sum, account) => sum + accountCash(account, failPrice), 0);
    const evalCosts = accounts
      .filter((account) => account.enabled && account.phase === "challenge")
      .reduce((sum, account) => sum + account.cost, 0);
    setLoopSettings({
      entry: plan.entry,
      sl: plan.sl,
      extra: plan.hedge === "manual" ? plan.extra : Math.max(0, Math.round((fundedPayout - evalCosts) * 100) / 100),
      discount: plan.discount,
      side: plan.side,
      split: plan.funded[0]?.split ?? 80,
    });
    setProps(currency, accounts);
  }, [ready, plan, accounts, currency, setProps]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(BANK_KEY, JSON.stringify(bank));
  }, [bank, ready]);

  useEffect(() => {
    if (left == null) return;
    if (left <= 0) {
      setLeft(null);
      beep();
      return;
    }
    const timer = window.setTimeout(() => setLeft((value) => (value == null ? null : value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [left]);

  useEffect(() => {
    let stop = false;
    const pull = () => {
      void fetchLiveQuotes().then((next) => {
        if (!stop) setQuotes(next);
      });
    };
    pull();
    const timer = window.setInterval(pull, 5000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (livePaused.current || !liveSymbol) return;
    const price = quotes[liveSymbol]?.price;
    if (!(price > 0)) return;
    if (entryRef.current && document.activeElement === entryRef.current) return;
    const next = roundEntry(price);
    if (entryRef.current) entryRef.current.value = String(next);
    setPlan((prev) => (prev.entry === next ? prev : { ...prev, entry: next }));
  }, [liveSymbol, quotes]);

  const pauseLive = () => {
    livePaused.current = true;
    setLiveSymbol(null);
  };
  const edit = (patch: Partial<CyclePlan>) => setPlan((prev) => ({ ...prev, ...patch, fuzz: null, dirtyTarget: null, layerShare: null }));
  const tweak = (patch: Partial<CyclePlan>) => setPlan((prev) => ({ ...prev, ...patch }));
  const recalculate = () => {
    const typed = Number(entryRef.current?.value);
    setPlan((prev) => ({
      ...prev,
      fuzz: null,
      entry: typed > 0 ? typed : prev.entry,
    }));
    setPresets((prev) => prev.map((row) => ({ ...row })));
  };
  const saveTax = (rows: Omit<TaxRow, "nr">[]) => {
    setLedger((prev) => {
      let nr = prev.reduce((max, row) => Math.max(max, row.nr), 0);
      const stamped = rows.map((row) => ({ ...row, nr: (nr += 1) }));
      const next = [...stamped, ...prev].slice(0, 400);
      window.localStorage.setItem(TAX_KEY, JSON.stringify(next));
      return next;
    });
  };
  const evals = accounts.filter((account) => account.enabled && account.phase === "challenge");
  const funds = accounts.filter((account) => account.enabled && account.phase === "funded");
  const failMove = failFraction(plan.side, plan.sl);
  const failPrice = plan.entry * (1 + failMove);
  const payout = funds.reduce((sum, account) => sum + accountCash(account, failPrice), 0);
  const costs = evals.reduce((sum, account) => sum + account.cost, 0);
  const net = payout - costs;
  const pass = collectivePassMove(evals, plan.side);
  const passAbs = pass == null ? 0 : Math.abs(pass);
  const fundedLoss = funds.reduce((sum, account) => sum + Math.abs(account.positionUsd) * (passAbs + account.rtFeePct / 100), 0);
  const remaining = funds.reduce((sum, account) => sum + (maxDdUsd(account) - Math.abs(account.positionUsd) * (passAbs + account.rtFeePct / 100)), 0);
  const families = clashingFirms(
    accounts
      .filter((account) => account.enabled)
      .map((account) => presets.find((row) => row.id === account.presetId)?.name ?? account.presetId),
  );
  const clash = families.length > 0;
  const alive = remaining > 0 && !clash && net >= -0.5;
  const unhedgeable = evals.length > 0 && (funds.length === 0 || remaining <= 0);
  const uncovered = evals.length > 0 && funds.length > 0 && net < -0.5;
  const failLabel = `${failMove >= 0 ? "+" : ""}${(failMove * 100).toFixed(2)}%`;
  const passLabel = `${(pass ?? (plan.side === "evals-short" ? -0.03 : 0.03)) * 100 >= 0 ? "+" : ""}${((pass ?? (plan.side === "evals-short" ? -0.03 : 0.03)) * 100).toFixed(2)}%`;

  return (
    <div className="flex w-full flex-col gap-2">
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">1. Zyklus-Stufe & Marktpreis eingeben</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CYCLE_TEMPLATES.map((template) => (
            <Button key={template.id} onClick={() => setPlan((prev) => applyTemplate(prev, template.funded, template.evals))}>
              {template.label}
            </Button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="text-xs text-muted">
            <label>
              Aktueller Kurs / Entry $
              <input
                ref={entryRef}
                className="mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3 text-right font-mono text-lg text-fg"
                inputMode="decimal"
                defaultValue={plan.entry}
                onPointerDown={pauseLive}
                onFocus={pauseLive}
                onChange={(event) => {
                  pauseLive();
                  const next = Number(event.target.value);
                  if (next > 0) edit({ entry: next });
                }}
              />
            </label>
          </div>
          <div className="text-xs text-muted">
            Setup-Richtung
            <div className="mt-1 grid gap-1">
              {(
                [
                  ["evals-short", "Evals SHORT / Funded LONG"],
                  ["evals-long", "Evals LONG / Funded SHORT"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn("h-6 rounded-lg px-2 text-[11px]", plan.side === id ? "bg-fg text-bg" : "bg-bg text-muted")}
                  onClick={() => edit({ side: id })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="text-xs text-muted">
            Eval-Breach bei %
            <input
              className="mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3 text-right font-mono text-lg text-fg"
              type="number"
              min={0.2}
              max={3}
              step={0.05}
              value={plan.sl}
              onChange={(event) => edit({ sl: Number(event.target.value) })}
            />
          </label>
          <label className="text-xs text-muted">
            Eval-Rabatt %
            <input
              className="mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3 text-right font-mono text-lg text-fg"
              type="number"
              min={0}
              max={25}
              step={1}
              value={plan.discount}
              onChange={(event) => edit({ discount: Number(event.target.value) })}
            />
          </label>
          <label className="text-xs text-muted">
            Extra-Gewinn bei Eval-Tod (Over-Hedge $)
            <input
              className="mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3 text-right font-mono text-lg text-fg disabled:opacity-40"
              type="number"
              min={0}
              max={5000}
              step={5}
              disabled={plan.hedge === "auto"}
              value={plan.extra}
              onChange={(event) => edit({ extra: Number(event.target.value), hedge: "manual" })}
            />
          </label>
        </div>
        <LiveBoards
          quotes={quotes}
          liveSymbol={liveSymbol}
          onPick={(symbol) => {
            const quote = quotes[symbol];
            const nextOn = liveSymbol !== symbol;
            if (nextOn) livePaused.current = false;
            else pauseLive();
            setLiveSymbol(nextOn ? symbol : null);
            if (nextOn && quote && quote.price > 0) {
              const next = roundEntry(quote.price);
              if (entryRef.current) entryRef.current.value = String(next);
              edit({ entry: next });
            }
          }}
        />
        <div className="mt-4">
          <p className="text-xs text-muted">Hedge-Modus (Smart-Sizing)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {HEDGE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-xs",
                  plan.hedge === mode.id ? "border-accent bg-accent/15 text-fg" : "border-line bg-bg text-muted",
                )}
                onClick={() => edit({ hedge: mode.id })}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">2. Konten & Prop-Firms auswählen</h2>
          <div className="flex flex-wrap gap-2">
            <Button tone="accent" onClick={recalculate}>Neu berechnen</Button>
            <Button onClick={() => setFirmsOpen(true)}>
              <Settings className="h-4 w-4" />
              Eigene Prop-Firms verwalten
            </Button>
          </div>
        </div>
        {firmsOpen ? (
          <FirmManager
            presets={presets}
            onChange={(next) => {
              setPresets(next);
              savePresets(next);
            }}
            onRemove={(id) => {
              const next = presets.filter((row) => row.id !== id);
              setPresets(next);
              savePresets(next);
              setPlan((prev) => ({
                ...prev,
                fuzz: null,
                funded: prev.funded.map((row) => (row.presetId === id ? { ...row, presetId: next[0]?.id ?? "breakout" } : row)),
                eval1: prev.eval1.presetId === id ? { ...prev.eval1, presetId: next[0]?.id ?? "breakout" } : prev.eval1,
                eval2: prev.eval2.presetId === id ? { ...prev.eval2, presetId: next[0]?.id ?? "breakout" } : prev.eval2,
              }));
            }}
            onClose={() => {
              recalculate();
              setFirmsOpen(false);
            }}
          />
        ) : null}
        {unhedgeable || uncovered ? (
          <div className="mt-3 rounded-xl bg-short/15 px-3 py-2 text-sm">
            {unhedgeable ? (
              <p className="font-semibold">
                {funds.length === 0
                  ? "Nicht hedgebar: kein Funded-Konto aktiv."
                  : `Nicht hedgebar: Beim Eval-Sieg bleibt kein Funded-Puffer (${fmtUsd(remaining, true)}).`}
              </p>
            ) : null}
            {uncovered ? (
              <p className="font-semibold">Nicht gedeckt: Das Payout {fmtUsd(payout)} reicht nicht für die Eval-Kosten {fmtUsd(costs)}.</p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {plan.funded.map((row, index) => (
            <AccountCard
              key={row.id}
              title={`Konto ${index + 1}: Mein Funded-Account`}
              kind="funded"
              slot={row}
              presets={presets}
              onChange={(patch) => edit({ funded: plan.funded.map((item) => (item.id === row.id ? { ...item, ...patch } : item)) })}
            />
          ))}
          <AccountCard
            title={`Konto ${plan.funded.length + 1}: Eval-Challenge #1`}
            kind="eval"
            slot={plan.eval1}
            presets={presets}
            onChange={(patch) => edit({ eval1: { ...plan.eval1, ...patch } })}
          />
          <AccountCard
            title={`Konto ${plan.funded.length + 2}: Eval-Challenge #2`}
            kind="eval"
            slot={plan.eval2}
            presets={presets}
            toggle
            onChange={(patch) => edit({ eval2: { ...plan.eval2, ...patch } })}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">3. Fertige Orders ablesen & im Anti-Detect-Browser eintippen</h2>
        <div className={cn("mt-3 rounded-2xl px-4 py-3 text-sm", alive ? "bg-long/15 text-fg" : "bg-short/15 text-fg")}>
          <HedgeLine mode={plan.hedge} costs={costs} extra={net} reserve={remaining} failLabel={failLabel} />
          {unhedgeable ? (
            <p className="font-semibold">
              {funds.length === 0
                ? "Nicht hedgebar: Es ist kein Funded-Konto aktiv."
                : `Nicht hedgebar: Beim Eval-Sieg läge das Funded ${fmtUsd(Math.abs(remaining))} unter dem Drawdown. Die Evals lassen sich so nicht absichern.`}
            </p>
          ) : null}
          {uncovered ? (
            <p className="font-semibold">Nicht gedeckt: Das Payout {fmtUsd(payout)} reicht nicht für die Eval-Kosten {fmtUsd(costs)}.</p>
          ) : null}
          <p className="mt-2">
            Bei {failLabel} Kursbewegung (Evals breachen): Funded gewinnt <b>{fmtUsd(payout)}</b> (nach Split & Fees) und bezahlt alle Eval-Kosten (<b>{fmtUsd(costs)}</b>). Netto-Ergebnis: <b>{fmtUsd(net, true)}</b>.
          </p>
          <p className="mt-2">
            Bei {passLabel} Kursbewegung (Evals bestehen): Du schaltest <b>{evals.length} neue Funded-Konten</b> frei. Dein alter Funded verliert <b>{fmtUsd(fundedLoss)}</b> und überlebt mit <b>{fmtUsd(remaining, true)}</b> Restpuffer.
          </p>
          {clash ? (
            <p className="mt-2 font-semibold text-short">
              ACHTUNG: Gleiche Prop-Firm ({families.join(", ")}) mehrfach ausgewählt – Copy-Trading-Sperre!
            </p>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            tone="accent"
            onClick={() => {
              const clean = materialize({ ...plan, fuzz: null, dirtyTarget: null, layerShare: null }, presets);
              const fuzzed = fuzzWide(clean, plan.entry, plan.sl, plan.side, 0.009);
              const dirty = Math.round((9.14 + Math.random() * 0.2) * 100) / 100;
              const layer = Math.round((0.53 + Math.random() * 0.09) * 1000) / 1000;
              setPlan((prev) => ({
                ...prev,
                fuzz: fuzzed.map((account) => account.positionUsd),
                dirtyTarget: dirty,
                layerShare: layer,
              }));
            }}
          >
            🎲 Tarn-Modus (Fuzzing + Dirty-Target + Human-Rounding)
          </Button>
          <Button onClick={() => setLeft(90 + Math.floor(Math.random() * 91))}>⏱️ Stealth-Timer starten (Zufall 90s–180s)</Button>
          <button
            type="button"
            className={cn("h-9 rounded-full px-3 text-xs", plan.humanRound ? "bg-fg text-bg" : "bg-bg text-muted")}
            onClick={() => tweak({ humanRound: !plan.humanRound })}
          >
            🖐️ Menschliche Rundung (2 Nachkommastellen) {plan.humanRound ? "AN" : "AUS"}
          </button>
          {left != null ? <p className="font-mono text-4xl tabular-nums text-accent">{left}s</p> : null}
        </div>
        {plan.dirtyTarget != null ? (
          <p className="mt-2 text-xs text-muted">
            Tarn aktiv: Eval-Target {plan.dirtyTarget.toFixed(2)}% statt 9,00% · Schichten {Math.round((plan.layerShare ?? 0.55) * 100)}% / {100 - Math.round((plan.layerShare ?? 0.55) * 100)}%.
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {accounts.filter((account) => account.enabled).map((account) => (
            <Ticket key={account.id} account={account} plan={plan} presets={presets} pass={pass} entry={plan.entry} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">4. Payoff-Kurven & Steuer-Dokumentation</h2>
        <div className="mt-3">
          <HydraPayoff percentMode={false} split entry={plan.entry} accounts={accounts} />
        </div>
        <div className="mt-4 rounded-xl bg-bg p-3">
          <h3 className="text-sm font-semibold">Zyklus abschließen</h3>
          <p className="mt-2 text-sm text-muted">
            Aktuelles Wallet-Cash: <b className="text-fg">{fmtUsd(bank.cash)}</b>
            {" · "}
            Fehlversuche in dieser Stufe: <b className="text-fg">{bank.fails}</b>
          </p>
          {plan.note ? <p className="mt-2 text-sm text-preview">{plan.note}</p> : null}
          <label className="mt-3 block max-w-xs text-xs text-muted">
            Aktueller BMF-Monatskurs (EUR/USD)
            <input
              className="mt-1 h-11 w-full rounded-xl border border-line bg-surface px-3 text-right font-mono text-base text-fg"
              type="number"
              min={0.5}
              max={2}
              step={0.01}
              value={plan.fx}
              onChange={(event) => tweak({ fx: Number(event.target.value) })}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              tone="buy"
              onClick={() => {
                setBank((prev) => ({ cash: Math.round((prev.cash + net) * 100) / 100, fails: prev.fails + 1 }));
                saveTax(taxLines("breach", evals, funds, presets, payout, plan.fx));
              }}
            >
              💥 Evals im Breach ({failLabel}) → Payout & Ausgaben buchen
            </Button>
            <Button
              tone="accent"
              onClick={() => {
                saveTax(taxLines("pass", evals, funds, presets, 0, plan.fx));
                setPlan((prev) => ({
                  ...prev,
                  fuzz: null,
                  dirtyTarget: null,
                  layerShare: null,
                  note: "Altes Funded im Cooldown. Eval #1 ist jetzt das Funded. Eval #2 ist die Cash-Kuh und aus dem Hedge.",
                  funded: [{ ...prev.funded[0], presetId: prev.eval1.presetId, size: prev.eval1.size, fill: prev.eval1.fill, enabled: true, buffer: null }],
                  eval1: { ...prev.eval1, enabled: false },
                  eval2: { ...prev.eval2, enabled: false },
                }));
                setBank((prev) => ({ ...prev, fails: 0 }));
              }}
            >
              🏆 Evals bestanden ({passLabel}) → Rotation & Ausgaben buchen
            </Button>
          </div>
          <Ledger
            rows={ledger}
            onClear={() => {
              setLedger([]);
              window.localStorage.setItem(TAX_KEY, "[]");
            }}
          />
        </div>
      </section>
    </div>
  );
}

function HedgeLine({
  mode,
  costs,
  extra,
  reserve,
  failLabel,
}: {
  mode: HedgeMode;
  costs: number;
  extra: number;
  reserve: number;
  failLabel: string;
}) {
  const pct = hedgeReserve(mode);
  if (pct == null && mode !== "safe") return null;
  if (mode === "safe") {
    return <p className="font-semibold">🛡️ 100% Sicherheits-Modus: Funded holt exakt die Eval-Kosten rein. Extra-Gewinn $0.</p>;
  }
  if (extra <= 0.5) {
    return (
      <p className="font-semibold">
        🧠 Smart-Hedge: Mehr Over-Hedge würde den 10%-Restpuffer unterschreiten. Over-Hedge bleibt $0.
      </p>
    );
  }
  return (
    <p className="font-semibold">
      🧠 Smart-Hedge aktiv: Funded zahlt alle Eval-Kosten ({fmtUsd(costs)}) + <b>{fmtUsd(extra)} automatischer Extra-Gewinn</b> bei {failLabel} Move (und behält exakt <b>{fmtUsd(reserve)} ({Math.round((pct ?? 0) * 100)}%)</b> Sicherheits-Reserve bei Eval-Sieg)!
    </p>
  );
}

function AccountCard({
  title,
  kind,
  slot,
  presets,
  toggle = false,
  onChange,
}: {
  title: string;
  kind: "funded" | "eval";
  slot: CycleSlot;
  presets: FirmPreset[];
  toggle?: boolean;
  onChange: (patch: Partial<CycleSlot>) => void;
}) {
  const preset = presets.find((row) => row.id === slot.presetId) ?? presets[0];
  const ddPct = slot.maxDdPct ?? preset?.maxDdPct ?? 3;
  const target = slot.targetPct ?? preset?.targetPct ?? 9;
  const autoBuffer = slot.size * (ddPct / 100);
  const dd = slot.buffer != null ? slot.buffer : autoBuffer;
  const price = slot.cost == null ? priceOf(slot.size) : slot.cost;
  return (
    <article className={cn("rounded-2xl border border-line bg-bg p-3", !slot.enabled && "opacity-50")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-1">
          {toggle || !slot.enabled ? (
            <button type="button" className="h-7 rounded-full px-2 text-[11px] text-muted" onClick={() => onChange({ enabled: !slot.enabled })}>
              {slot.enabled ? "An" : "Aus"}
            </button>
          ) : null}
        </div>
      </div>
      <select
        className="mt-3 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm text-fg"
        aria-label="Prop-Firm"
        value={slot.presetId}
        onChange={(event) => onChange({ presetId: event.target.value })}
      >
        {presets.map((row) => (
          <option key={row.id} value={row.id}>{firmLabel(row)}</option>
        ))}
      </select>
      <label className="mt-2 block text-[11px] text-muted">
        Ausführung
        <select
          className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm text-fg"
          value={slot.fill}
          onChange={(event) => onChange({ fill: event.target.value === "limit" ? "limit" : "market" })}
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
        </select>
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          className="h-11 rounded-xl border border-line bg-surface px-2 text-sm text-fg"
          aria-label="Kontogröße"
          value={slot.size}
          onChange={(event) => onChange({ size: Number(event.target.value) as AccountSize, cost: null, buffer: null })}
        >
          {ACCOUNT_SIZES.map((size) => (
            <option key={size} value={size}>{size / 1000}k</option>
          ))}
        </select>
        {kind === "eval" ? (
          <label className="text-[11px] text-muted">
            Eval-Kaufpreis ($)
            <input
              className="mt-1 h-11 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-base text-fg"
              inputMode="decimal"
              value={price}
              onChange={(event) => {
                const next = Number(event.target.value);
                onChange({ cost: Number.isFinite(next) ? Math.max(0, next) : 0 });
              }}
            />
          </label>
        ) : (
          <label className="text-[11px] text-muted">
            Split %
            <input
              className="mt-1 h-11 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-base text-fg"
              type="number"
              min={50}
              max={100}
              step={1}
              value={slot.split}
              onChange={(event) => onChange({ split: Number(event.target.value) })}
            />
          </label>
        )}
      </div>
      {kind === "funded" ? (
        <label className="mt-2 block text-[11px] text-muted">
          Verfügbarer DD-Puffer ($)
          <input
            className="mt-1 h-11 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-base text-fg"
            type="number"
            min={0}
            step={10}
            value={slot.buffer != null ? slot.buffer : Math.round(autoBuffer)}
            onChange={(event) => {
              const next = Number(event.target.value);
              onChange({ buffer: Number.isFinite(next) ? Math.max(0, next) : 0 });
            }}
          />
          <span className="mt-1 block">
            {slot.buffer == null ? `Standard ${ddPct}% = ${fmtUsd(autoBuffer)}` : `${((dd / slot.size) * 100).toFixed(2)}% von ${fmtUsd(slot.size)}`}. Dieser Betrag ist der Max-DD für Restpuffer und Sicherheits-Stop.
          </span>
        </label>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-[11px] text-muted">
            Max DD %
            <input
              className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-sm text-fg"
              type="number"
              min={0.1}
              max={20}
              step={0.1}
              value={ddPct}
              onChange={(event) => {
                const next = Number(event.target.value);
                onChange({ maxDdPct: Number.isFinite(next) ? next : 3, buffer: null });
              }}
            />
          </label>
          <label className="text-[11px] text-muted">
            Profit Target %
            <input
              className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-sm text-fg"
              type="number"
              min={0.1}
              max={30}
              step={0.1}
              value={target}
              onChange={(event) => {
                const next = Number(event.target.value);
                onChange({ targetPct: Number.isFinite(next) ? next : 9 });
              }}
            />
          </label>
        </div>
      )}
    </article>
  );
}

function camouflageTp(account: PropAccount, entry: number, dirtyPct: number | null): number | null {
  if (account.phase !== "challenge" || dirtyPct == null || !(entry > 0)) return null;
  const gap = account.account * (dirtyPct / 100);
  const need = gap + Math.abs(account.positionUsd) * (account.rtFeePct / 100);
  if (!(Math.abs(account.positionUsd) > 0) || !(need > 0)) return null;
  const price = entry * (1 + need / account.positionUsd);
  return price > 0 ? price : null;
}

function fmtPx(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100) return abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (abs >= 1) return abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (abs >= 0.01) return abs.toFixed(5);
  return abs.toPrecision(4);
}

function copyPx(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100) return abs.toFixed(2);
  if (abs >= 1) return abs.toFixed(4);
  if (abs >= 0.01) return abs.toFixed(5);
  return abs.toPrecision(4);
}

function Ticket({
  account,
  plan,
  presets,
  pass,
  entry,
}: {
  account: PropAccount;
  plan: CyclePlan;
  presets: FirmPreset[];
  pass: number | null;
  entry: number;
}) {
  const preset = presets.find((row) => row.id === account.presetId);
  const orders = orderPrices(account, entry, plan.sl, plan.side, pass);
  const fail = failFraction(plan.side, plan.sl);
  const short = account.phase === "challenge" ? plan.side === "evals-short" : plan.side !== "evals-short";
  const coins = entry > 0 ? Math.abs(account.positionUsd / entry) : 0;
  const usd = Math.abs(account.positionUsd);
  const human = plan.humanRound !== false;
  const share = plan.layerShare != null && plan.layerShare > 0 && plan.layerShare < 1 ? plan.layerShare : 0.55;
  const total = human ? Math.round(coins * 100) / 100 : coins;
  const layer1 = human ? Math.round(total * share * 100) / 100 : total * share;
  const layer2 = human ? Math.round((total - layer1) * 100) / 100 : total - layer1;
  const qty = (value: number) => (human ? value.toFixed(2) : value.toFixed(4));
  const leverage = account.account > 0 ? Math.abs(account.positionUsd) / account.account : 0;
  const openFee = Math.abs(account.positionUsd) * ((account.openFeePct ?? account.rtFeePct / 2) / 100);
  const rtFee = Math.abs(account.positionUsd) * (account.rtFeePct / 100);
  const economicTp = account.phase === "challenge" ? orders.tp : entry > 0 ? entry * (1 + fail) : null;
  const mainTp = (account.phase === "challenge" ? camouflageTp(account, entry, plan.dirtyTarget) : null) ?? economicTp;
  const tpMove = mainTp != null && entry > 0 ? mainTp / entry - 1 : fail;
  const sign = Math.sign(tpMove || fail || 1) || 1;
  const before = mainTp != null && entry > 0 ? mainTp - sign * entry * 0.0006 : null;
  const behind = (() => {
    if (mainTp == null || !(entry > 0)) return null;
    if (account.phase === "challenge" && before != null && layer2 > 0) {
      return (mainTp * (layer1 + layer2) - before * layer1) / layer2;
    }
    return mainTp + sign * entry * 0.0007;
  })();
  const dummy = entry > 0 ? entry * (1 + Math.sign(fail || 1) * 0.035) : null;
  const slMove = orders.sl != null && entry > 0 ? (orders.sl / entry - 1) * 100 : null;
  const layerA = Math.round(share * 100);
  const layerNote = `${layerA}% / ${100 - layerA}%`;
  const failPct = `${fail >= 0 ? "+" : ""}${(fail * 100).toFixed(2)}%`;
  const px = (value: number | null) => (value != null && Number.isFinite(value) ? fmtPx(value) : "—");
  const layer1Px = account.phase === "funded" ? mainTp : before;
  return (
    <article className="rounded-2xl border border-line bg-bg p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{account.phase === "funded" ? "Funded" : account.name}</h3>
          <p className="text-xs text-muted">{preset?.name ?? "Firma"}</p>
          <p className="mt-1 text-[11px] text-faint">🔐 {preset?.wallet?.trim() || "Wallet nicht hinterlegt"}</p>
        </div>
        <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", short ? "bg-short/20 text-short" : "bg-long/20 text-long")}>
          {short ? "SHORT / VERKAUFEN" : "LONG / KAUFEN"}
        </span>
      </div>
      <CopyRow label="Gesamt-Stückzahl (Coins/Lots)" value={total} text={qty(total)} copyText={qty(total)} />
      <CopyRow
        label="Positionsgröße USD"
        value={usd}
        text={fmtUsd(usd)}
        copyText={usd.toFixed(2)}
        hint={
          account.phase === "challenge"
            ? `Hebel ${leverage.toFixed(2)}× · Fee ${fmtUsd(openFee)} (Breach) / ${fmtUsd(rtFee)} (TP)`
            : `Hebel ${leverage.toFixed(2)}× · Fee ${fmtUsd(rtFee)} Round-Trip`
        }
      />
      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <p className="text-xs font-semibold">🛡️ 2-Schichten-Eingabe ({layerNote} Scaling-In)</p>
        <p className="mt-2 text-[11px] text-muted">Schicht 1 · sofort von Hand eintippen</p>
        <CopyRow label="Menge Schicht 1" value={layer1} text={qty(layer1)} copyText={qty(layer1)} />
        <CopyRow
          label="Kurs / Preisalarm Schicht 1"
          value={layer1Px}
          text={px(layer1Px)}
          copyText={layer1Px != null ? copyPx(layer1Px) : undefined}
          hint={account.phase === "funded" ? `Echter ${failPct}-Zielkurs. Hier die erste Hälfte schließen.` : "0,06% vor dem Haupt-TP."}
        />
        <p className="mt-2 text-[11px] text-muted">Schicht 2 · nach 3–5 Min. nachlegen</p>
        <CopyRow label="Menge Schicht 2" value={layer2} text={qty(layer2)} copyText={qty(layer2)} />
        <CopyRow
          label="Kurs / Preisalarm Schicht 2"
          value={behind}
          text={px(behind)}
          copyText={behind != null ? copyPx(behind) : undefined}
          hint={account.phase === "funded" ? "0,07% hinter dem echten Schließ-Kurs." : "Liegt hinter dem Haupt-TP, sodass Schicht 1 und 2 im Schnitt exakt das Target treffen."}
        />
      </div>
      {account.phase === "funded" ? (
        <>
          <CopyRow
            label="👁️ Optischer Tarn-TP fürs Orderbuch (+3,50% Move)"
            value={dummy}
            text={px(dummy)}
            copyText={dummy != null ? copyPx(dummy) : undefined}
            hint="Diesen weiten Dummy-TP ins Orderbuch eintragen, damit das Chance-Risiko-Verhältnis für die Risk-Engine gesund (1:1) aussieht."
          />
          <CopyRow
            label={`🔔 Echter Schließ-Kurs per Preisalarm (${failPct} Move)`}
            value={mainTp}
            text={px(mainTp)}
            copyText={mainTp != null ? copyPx(mainTp) : undefined}
            hint="Bei diesem Kurs den Funded-Trade manuell schließen, sobald die Evals gebreached sind."
          />
          <CopyRow
            label="Stop-Loss Kurs (SL)"
            value={orders.sl}
            text={px(orders.sl)}
            copyText={orders.sl != null ? copyPx(orders.sl) : undefined}
            hint={slMove != null ? `Sicherheits-SL bei 95% Max-DD (${slMove >= 0 ? "+" : ""}${slMove.toFixed(2)}%), hinter dem Eval-TP.` : ""}
          />
        </>
      ) : (
        <CopyRow
          label="Stop-Loss Kurs"
          value={orders.sl}
          text={px(orders.sl)}
          copyText={orders.sl != null ? copyPx(orders.sl) : undefined}
          hint="Keinen SL ins Orderbuch legen! Konto schließt bei diesem Kurs automatisch durch den Equity-Breach, ohne Closing-Fee. Für den TP den TradingView-Preisalarm nutzen."
        />
      )}
    </article>
  );
}

function CopyRow({ label, value, text, hint, warn, copyText }: { label: string; value: number | null; text: string; hint?: string; warn?: boolean; copyText?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className={cn("font-mono text-xl tabular-nums", warn && "text-preview")}>{text}</p>
        <button
          type="button"
          className="h-8 rounded-full bg-raised px-3 text-xs"
          disabled={value == null}
          onClick={() => {
            if (value == null) return;
            const raw = copyText ?? String(Math.abs(Math.round(value * 1e8) / 1e8));
            void navigator.clipboard?.writeText(raw);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 900);
          }}
        >
          {copied ? "Kopiert!" : "Kopieren"}
        </button>
      </div>
      {hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

function FirmManager({
  presets,
  onChange,
  onRemove,
  onClose,
}: {
  presets: FirmPreset[];
  onChange: (next: FirmPreset[]) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const patch = (id: string, next: Partial<FirmPreset>) => {
    onChange(
      presets.map((row) => {
        if (row.id !== id) return row;
        const makerPct = next.makerPct == null || !Number.isFinite(next.makerPct) ? row.makerPct : Math.min(5, Math.max(0, next.makerPct));
        const takerPct = next.takerPct == null || !Number.isFinite(next.takerPct) ? row.takerPct : Math.min(5, Math.max(0, next.takerPct));
        return { ...row, ...next, makerPct, takerPct, rtPct: takerPct * 2 };
      }),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="firm-manager-title"
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="firm-manager-title" className="text-base font-semibold">Eigene Prop-Firms</h3>
            <p className="mt-1 text-xs text-muted">Maker- und Taker-Gebühr gelten sofort für jedes Konto, das die Firma nutzt.</p>
          </div>
          <button type="button" className="h-9 rounded-full px-3 text-xs text-muted" onClick={onClose}>Schließen</button>
        </div>
        <div className="mt-4 grid gap-2">
          {presets.map((preset) => (
            <div key={preset.id} className="rounded-xl bg-bg p-2">
              <div className="grid items-end gap-2 sm:grid-cols-[1fr_11rem_auto]">
                <label className="text-[11px] text-muted">
                  Firmenname
                  <input
                    className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm text-fg"
                    value={preset.name}
                    maxLength={48}
                    onChange={(event) => patch(preset.id, { name: event.target.value })}
                  />
                </label>
                <label className="text-[11px] text-muted">
                  Handelsplattform
                  <select
                    className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm text-fg"
                    value={preset.platform}
                    onChange={(event) => patch(preset.id, { platform: event.target.value as FirmPreset["platform"] })}
                  >
                    {FIRM_PLATFORMS.map((platform) => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </label>
                {preset.custom ? (
                  <button type="button" className="h-10 rounded-xl px-3 text-short" aria-label={`${preset.name} löschen`} onClick={() => onRemove(preset.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="hidden h-10 sm:block" />
                )}
              </div>
              <label className="mt-2 block text-[11px] text-muted">
                Wallet & Anti-Detect-Profil
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm text-fg"
                  value={preset.wallet}
                  maxLength={80}
                  onChange={(event) => patch(preset.id, { wallet: event.target.value })}
                />
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-[11px] text-muted">
                  Maker-Gebühr %
                  <input
                    className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-sm text-fg"
                    type="number"
                    min={0}
                    max={5}
                    step={0.001}
                    value={preset.makerPct}
                    onChange={(event) => patch(preset.id, { makerPct: Number(event.target.value) })}
                  />
                </label>
                <label className="text-[11px] text-muted">
                  Taker-Gebühr %
                  <input
                    className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-sm text-fg"
                    type="number"
                    min={0}
                    max={5}
                    step={0.001}
                    value={preset.takerPct}
                    onChange={(event) => patch(preset.id, { takerPct: Number(event.target.value) })}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() =>
              onChange([
                ...presets,
                {
                  id: `firm-${crypto.randomUUID()}`,
                  name: "Neue Prop-Firm",
                  makerPct: 0,
                  takerPct: 0.04,
                  rtPct: 0.08,
                  split: 80,
                  maxDdPct: 3,
                  targetPct: 9,
                  platform: "Eigenes System",
                  wallet: "Neue Wallet · neues Profil",
                  custom: true,
                },
              ])
            }
          >
            + Neue Prop-Firm hinzufügen
          </Button>
          <Button tone="accent" onClick={onClose}>Speichern und neu berechnen</Button>
        </div>
      </div>
    </div>
  );
}

function stageLabel(plan: CyclePlan): string {
  const funded = plan.funded.filter((row) => row.enabled).map((row) => `${row.size / 1000}k`).join(" + ");
  const evals = [plan.eval1, ...(plan.eval2.enabled ? [plan.eval2] : [])].map((row) => `${row.size / 1000}k`).join(" + ");
  return `${funded} Funded vs ${evals} Eval`;
}

function taxLines(
  kind: "breach" | "pass",
  evals: PropAccount[],
  funds: PropAccount[],
  presets: FirmPreset[],
  payout: number,
  fxRate: number,
): Omit<TaxRow, "nr">[] {
  const fx = fxRate > 0 ? fxRate : 1.09;
  const toEur = (usd: number) => Math.round((usd / fx) * 100) / 100;
  const stamp = new Date().toISOString();
  const rows: Omit<TaxRow, "nr">[] = evals.map((account) => {
    const preset = presets.find((row) => row.id === account.presetId);
    const usd = -Math.round(Math.abs(account.cost) * 100) / 100;
    return {
      date: stamp,
      text: `${kind === "breach" ? "Eval-Kauf (Breach)" : "Eval-Kauf (Rotation)"} ${account.name} · ${preset?.name ?? "Firma"}`,
      wallet: preset?.wallet?.trim() || "—",
      usd,
      fx,
      eur: toEur(usd),
    };
  });
  if (kind === "breach") {
    const names = funds.map((account) => presets.find((row) => row.id === account.presetId)?.name ?? account.name).join(" + ");
    const wallet = presets.find((row) => row.id === funds[0]?.presetId)?.wallet?.trim() || "—";
    const usd = Math.round(payout * 100) / 100;
    rows.push({ date: stamp, text: `Payout ${names || "Funded"}`, wallet, usd, fx, eur: toEur(usd) });
  }
  return rows;
}

function loadLedger(): TaxRow[] {
  try {
    const raw = window.localStorage.getItem(TAX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is TaxRow => {
      if (!row || typeof row !== "object") return false;
      const item = row as TaxRow;
      return typeof item.nr === "number" && typeof item.date === "string" && typeof item.usd === "number";
    });
  } catch {
    return [];
  }
}

function Ledger({ rows, onClear }: { rows: TaxRow[]; onClear: () => void }) {
  return (
    <details className="mt-4 rounded-xl border border-line p-3">
      <summary className="cursor-pointer text-sm font-semibold">📄 Mein 7-Spalten Steuer-Logbuch (GoBD / EÜR)</summary>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">{rows.length} Buchungen · EUR = USD / BMF-Kurs</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => downloadLedger(rows)} disabled={rows.length === 0}>
            📥 Als CSV für Excel / Finanzamt exportieren
          </Button>
          <Button onClick={onClear} disabled={rows.length === 0}>🗑️ Logbuch leeren</Button>
        </div>
      </div>
      {rows.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="px-2 py-1 font-medium">Lfd. Nr.</th>
                <th className="px-2 py-1 font-medium">Datum</th>
                <th className="px-2 py-1 font-medium">Vorgang & Prop-Firm</th>
                <th className="px-2 py-1 font-medium">Genutzte Wallet</th>
                <th className="px-2 py-1 font-medium">Betrag USD</th>
                <th className="px-2 py-1 font-medium">BMF-Kurs</th>
                <th className="px-2 py-1 font-medium">Betrag EUR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.nr}-${row.date}-${row.text}`} className="border-t border-line">
                  <td className="px-2 py-1 font-mono">{row.nr}</td>
                  <td className="px-2 py-1 whitespace-nowrap">{new Date(row.date).toLocaleDateString("de-DE")}</td>
                  <td className="px-2 py-1">{row.text}</td>
                  <td className="px-2 py-1">{row.wallet}</td>
                  <td className="px-2 py-1 font-mono">{fmtUsd(row.usd, true)}</td>
                  <td className="px-2 py-1 font-mono">{row.fx.toFixed(4)}</td>
                  <td className="px-2 py-1 font-mono">{row.eur.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">Noch keine Buchung. Ein Abschluss oben schreibt die Eval-Ausgaben und, beim Breach, das Payout.</p>
      )}
    </details>
  );
}

function downloadLedger(rows: TaxRow[]): void {
  const header = ["Lfd. Nr.", "Datum", "Vorgang & Prop-Firm", "Genutzte Wallet", "Betrag USD", "BMF-Kurs", "Betrag EUR"];
  const body = rows.map((row) => [
    row.nr,
    new Date(row.date).toLocaleDateString("de-DE"),
    row.text,
    row.wallet,
    row.usd.toFixed(2).replace(".", ","),
    row.fx.toFixed(4).replace(".", ","),
    row.eur.toFixed(2).replace(".", ","),
  ]);
  const csv = [header, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hydra-euer.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function loadBank(): { cash: number; fails: number } {
  try {
    const raw = window.localStorage.getItem(BANK_KEY);
    if (!raw) return { cash: 500, fails: 0 };
    const parsed = JSON.parse(raw) as { cash?: number; fails?: number };
    return {
      cash: typeof parsed.cash === "number" ? parsed.cash : 500,
      fails: typeof parsed.fails === "number" ? parsed.fails : 0,
    };
  } catch {
    return { cash: 500, fails: 0 };
  }
}

function beep(): void {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}
