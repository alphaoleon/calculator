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
import { fmtIndex, fmtUsd } from "@/lib/format";
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
  safetyStop,
  savePresets,
  setLoopSettings,
  type AccountSize,
  type FirmPreset,
  type HedgeMode,
} from "@/lib/hydra-loop";
import type { PropAccount } from "@/lib/types";

const BANK_KEY = "position-builder.bankroll.v1";

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
          ? `${pinned.id} folgt Hyperliquid. Nochmal klicken oder ins Feld tippen stoppt das.`
          : "Klick hält den Entry auf dem Live-Kurs von Hyperliquid."}
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
  { id: "safe", label: "🛡️ 100% Sicherheits-Modus (Break-Even = $0 Extra)" },
  { id: "balanced", label: "🧠 Smart-Hedge: Ausgewogen (20% Puffer-Reserve)" },
  { id: "max", label: "🔥 Smart-Hedge: Maximaler Cashflow (10% Puffer-Reserve)" },
  { id: "manual", label: "✏️ Manuell" },
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
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [liveSymbol, setLiveSymbol] = useState<string | null>(null);
  const entryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPlan(loadPlan());
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
    if (!liveSymbol) return;
    const price = quotes[liveSymbol]?.price;
    if (!(price > 0)) return;
    if (entryRef.current && document.activeElement === entryRef.current) return;
    const next = roundEntry(price);
    setPlan((prev) => (prev.entry === next ? prev : { ...prev, entry: next }));
  }, [liveSymbol, quotes]);

  const edit = (patch: Partial<CyclePlan>) => setPlan((prev) => ({ ...prev, ...patch, fuzz: null }));
  const recalculate = () => {
    const typed = Number(entryRef.current?.value);
    setPlan((prev) => ({
      ...prev,
      fuzz: null,
      entry: typed > 0 ? typed : prev.entry,
    }));
    setPresets((prev) => prev.map((row) => ({ ...row })));
  };
  const pushLedger = (row: Omit<LedgerRow, "date">) => {
    setLedger((prev) => {
      const next = [{ date: new Date().toISOString(), ...row }, ...prev].slice(0, 200);
      window.localStorage.setItem(LEDGER_KEY, JSON.stringify(next));
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
  const alive = remaining > 0 && !clash;
  const failLabel = `${failMove >= 0 ? "+" : ""}${(failMove * 100).toFixed(2)}%`;
  const passLabel = `${(pass ?? (plan.side === "evals-short" ? -0.03 : 0.03)) * 100 >= 0 ? "+" : ""}${((pass ?? (plan.side === "evals-short" ? -0.03 : 0.03)) * 100).toFixed(2)}%`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Hydra Loop</p>
          <h1 className="text-2xl font-semibold tracking-tight">Zyklus planen</h1>
        </div>
      </header>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">1. Zyklus-Stufe & Marktpreis eingeben</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CYCLE_TEMPLATES.map((template) => (
            <Button key={template.id} onClick={() => setPlan((prev) => applyTemplate(prev, template.funded, template.evals))}>
              {template.label}
            </Button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-xs text-muted">
            <label>
              Aktueller Kurs / Entry $
              <input
                ref={entryRef}
                className="mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3 text-right font-mono text-lg text-fg"
                inputMode="decimal"
                defaultValue={plan.entry}
                key={plan.entry}
                onFocus={() => setLiveSymbol(null)}
                onBlur={(event) => {
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
            Kurs-Abstand bis Eval-Tod % (Chart-Move)
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
        </div>
        <LiveBoards
          quotes={quotes}
          liveSymbol={liveSymbol}
          onPick={(symbol) => {
            const quote = quotes[symbol];
            const nextOn = liveSymbol !== symbol;
            setLiveSymbol(nextOn ? symbol : null);
            if (nextOn && quote && quote.price > 0) edit({ entry: roundEntry(quote.price) });
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
          {plan.hedge === "manual" ? (
            <label className="mt-3 block max-w-xs text-xs text-muted">
              Extra-Gewinn (Over-Hedge $)
              <input
                className="mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3 text-right font-mono text-lg text-fg"
                type="number"
                min={0}
                max={5000}
                step={5}
                value={plan.extra}
                onChange={(event) => edit({ extra: Number(event.target.value) })}
              />
            </label>
          ) : null}
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
                funded: prev.funded.map((row) => (row.presetId === id ? { ...row, presetId: next[0]?.id ?? "zero" } : row)),
                eval1: prev.eval1.presetId === id ? { ...prev.eval1, presetId: next[0]?.id ?? "zero" } : prev.eval1,
                eval2: prev.eval2.presetId === id ? { ...prev.eval2, presetId: next[0]?.id ?? "zero" } : prev.eval2,
              }));
            }}
            onClose={() => {
              recalculate();
              setFirmsOpen(false);
            }}
          />
        ) : null}
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {plan.funded.map((row, index) => (
            <AccountCard
              key={row.id}
              title={`Konto ${index + 1}: Mein Funded-Account`}
              tone="border-cyan-400"
              kind="funded"
              slot={row}
              presets={presets}
              onChange={(patch) => edit({ funded: plan.funded.map((item) => (item.id === row.id ? { ...item, ...patch } : item)) })}
            />
          ))}
          <AccountCard
            title={`Konto ${plan.funded.length + 1}: Eval-Challenge #1`}
            tone="border-orange-400"
            kind="eval"
            slot={plan.eval1}
            presets={presets}
            onChange={(patch) => edit({ eval1: { ...plan.eval1, ...patch } })}
          />
          <AccountCard
            title={`Konto ${plan.funded.length + 2}: Eval-Challenge #2`}
            tone="border-violet-400"
            kind="eval"
            slot={plan.eval2}
            presets={presets}
            toggle
            onChange={(patch) => edit({ eval2: { ...plan.eval2, ...patch } })}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">3. Fertige Orders kopieren & ausführen</h2>
        <div className={cn("mt-3 rounded-2xl px-4 py-3 text-sm", alive ? "bg-long/15 text-fg" : "bg-short/15 text-fg")}>
          <HedgeLine mode={plan.hedge} costs={costs} extra={net} reserve={remaining} failLabel={failLabel} />
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
              const clean = materialize({ ...plan, fuzz: null }, presets);
              const fuzzed = fuzzWide(clean, plan.entry, plan.sl, plan.side);
              setPlan((prev) => ({ ...prev, fuzz: fuzzed.map((account) => account.positionUsd) }));
            }}
          >
            Tarn-Modus: Zahlen leicht krumm machen (±1.2% Fuzzing)
          </Button>
          <Button onClick={() => setLeft(45)}>45s Stealth-Timer starten</Button>
          {left != null ? <p className="font-mono text-4xl tabular-nums text-accent">{left}s</p> : null}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {accounts.filter((account) => account.enabled).map((account) => (
            <Ticket key={account.id} account={account} plan={plan} presets={presets} pass={pass} entry={plan.entry} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">4. Payoff-Kurven & Zyklus-Abschluss</h2>
        <div className="mt-3">
          <HydraPayoff percentMode={false} split entry={plan.entry} />
        </div>
        <div className="mt-4 rounded-xl bg-bg p-3">
          <h3 className="text-sm font-semibold">Zyklus abschließen</h3>
          <p className="mt-2 text-sm text-muted">
            Aktuelles Wallet-Cash: <b className="text-fg">{fmtUsd(bank.cash)}</b>
            {" · "}
            Fehlversuche in dieser Stufe: <b className="text-fg">{bank.fails}</b>
          </p>
          {plan.note ? <p className="mt-2 text-sm text-preview">{plan.note}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              tone="buy"
              onClick={() => {
                setBank((prev) => ({ cash: Math.round((prev.cash + net) * 100) / 100, fails: prev.fails + 1 }));
                pushLedger({ stage: stageLabel(plan), costs, payout, net, won: 0 });
              }}
            >
              Evals im Breach ({failLabel}) → Payout zum Wallet buchen
            </Button>
            <Button
              tone="accent"
              onClick={() => {
                setPlan((prev) => ({
                  ...prev,
                  fuzz: null,
                  note: "Altes Funded im Cooldown. Eval #1 ist jetzt das Funded. Eval #2 ist die Cash-Kuh und aus dem Hedge.",
                  funded: [{ ...prev.funded[0], presetId: prev.eval1.presetId, size: prev.eval1.size, fill: prev.eval1.fill, enabled: true, buffer: null }],
                  eval1: { ...prev.eval1, enabled: false },
                  eval2: { ...prev.eval2, enabled: false },
                }));
                setBank((prev) => ({ ...prev, fails: 0 }));
                pushLedger({ stage: stageLabel(plan), costs, payout: 0, net: -costs, won: evals.length });
              }}
            >
              Evals bestanden ({passLabel}) → Konten rotieren
            </Button>
          </div>
          <Ledger rows={ledger} />
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
        🧠 Smart-Hedge: Der Puffer wird bereits für die Grundkosten gebraucht. Over-Hedge = $0, die Funded-Position bleibt auf Break-Even.
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
  tone,
  kind,
  slot,
  presets,
  toggle = false,
  onChange,
}: {
  title: string;
  tone: string;
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
    <article className={cn("rounded-2xl border-2 bg-bg p-3", tone, !slot.enabled && "opacity-50")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn("h-7 rounded-full px-2 text-[11px]", slot.fill === "market" ? "bg-fg text-bg" : "text-muted")}
            onClick={() => onChange({ fill: slot.fill === "market" ? "limit" : "market" })}
          >
            {slot.fill === "market" ? "Market" : "Limit"}
          </button>
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
  const remaining = maxDdUsd(account) - Math.abs(account.positionUsd) * ((pass == null ? 0 : Math.abs(pass)) + account.rtFeePct / 100);
  const guard = account.phase === "funded" && remaining < 50;
  const sl = guard ? safetyStop(account, entry) ?? orders.sl : orders.sl;
  const short = account.phase === "challenge" ? plan.side === "evals-short" : plan.side !== "evals-short";
  const coins = entry > 0 ? Math.abs(account.positionUsd / entry) : 0;
  const usd = Math.abs(account.positionUsd);
  const leverage = account.account > 0 ? Math.abs(account.positionUsd) / account.account : 0;
  const openFee = Math.abs(account.positionUsd) * ((account.openFeePct ?? account.rtFeePct / 2) / 100);
  const fee = account.phase === "challenge" ? openFee : Math.abs(account.positionUsd) * (account.rtFeePct / 100);
  const slMove = orders.sl != null && entry > 0 ? (orders.sl / entry - 1) * 100 : null;
  const tpMove = orders.tp != null && entry > 0 ? (orders.tp / entry - 1) * 100 : null;
  const slShown = sl != null && entry > 0 ? (sl / entry - 1) * 100 : slMove;
  return (
    <article className="rounded-2xl border border-line bg-bg p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{account.phase === "funded" ? "Funded" : "Eval"}</h3>
          <p className="text-xs text-muted">{preset ? firmLabel(preset) : "Firma"}</p>
        </div>
        <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", short ? "bg-short/20 text-short" : "bg-long/20 text-long")}>
          {short ? "SHORT / VERKAUFEN" : "LONG / KAUFEN"}
        </span>
      </div>
      <CopyRow label="Stückzahl (Coins / Lots)" value={coins} text={coins.toFixed(4)} />
      <CopyRow label="Positionsgröße in USD" value={usd} text={fmtUsd(usd)} hint={`Hebel ${leverage.toFixed(2)}× · Fee ${fmtUsd(fee)}`} />
      <CopyRow label="Take-Profit Kurs" value={orders.tp} text={orders.tp != null ? fmtIndex(orders.tp) : "—"} hint={tpMove != null ? `bei ${tpMove >= 0 ? "+" : ""}${tpMove.toFixed(2)}% Kursbewegung` : ""} />
      <CopyRow
        label="Stop-Loss Kurs"
        value={sl}
        text={sl != null ? fmtIndex(sl) : "—"}
        warn={guard}
        hint={
          account.phase === "challenge"
            ? "Kein SL nötig. Konto schließt bei diesem Kurs automatisch durch den Equity-Breach, ohne Closing-Fee."
            : slShown != null
              ? `bei ${slShown >= 0 ? "+" : ""}${slShown.toFixed(2)}%${guard ? " · Sicherheits-SL bei 95% Max-DD" : ""}`
              : ""
        }
      />
    </article>
  );
}

function CopyRow({ label, value, text, hint, warn }: { label: string; value: number | null; text: string; hint?: string; warn?: boolean }) {
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
            void navigator.clipboard?.writeText(String(Math.abs(Math.round(value * 1e6) / 1e6)));
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={onClose}>
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
            <div key={preset.id} className="grid items-end gap-2 rounded-xl bg-bg p-2 sm:grid-cols-[1.4fr_6rem_6rem_9rem_auto]">
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
                <span className="h-10" />
              )}
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

type LedgerRow = {
  date: string;
  stage: string;
  costs: number;
  payout: number;
  net: number;
  won: number;
};

const LEDGER_KEY = "position-builder.ledger.v1";

function loadLedger(): LedgerRow[] {
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is LedgerRow => !!row && typeof row === "object" && typeof (row as LedgerRow).date === "string");
  } catch {
    return [];
  }
}

function Ledger({ rows }: { rows: LedgerRow[] }) {
  return (
    <details className="mt-4 rounded-xl border border-line p-3">
      <summary className="cursor-pointer text-sm font-semibold">Mein Steuer- & Trade-Logbuch (EÜR)</summary>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">{rows.length} Einträge</p>
        <Button onClick={() => downloadLedger(rows)} disabled={rows.length === 0}>
          Als CSV für Excel / Steuer exportieren
        </Button>
      </div>
      {rows.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="px-2 py-1 font-medium">Datum</th>
                <th className="px-2 py-1 font-medium">Stufe</th>
                <th className="px-2 py-1 font-medium">Eval-Ausgaben ($)</th>
                <th className="px-2 py-1 font-medium">Brutto-Payout ($)</th>
                <th className="px-2 py-1 font-medium">Netto-Cash-Ergebnis ($)</th>
                <th className="px-2 py-1 font-medium">Gewonnene Funded-Konten</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.date}-${row.stage}`} className="border-t border-line">
                  <td className="px-2 py-1 whitespace-nowrap">{new Date(row.date).toLocaleString("de-DE")}</td>
                  <td className="px-2 py-1">{row.stage}</td>
                  <td className="px-2 py-1 font-mono">{fmtUsd(row.costs)}</td>
                  <td className="px-2 py-1 font-mono">{fmtUsd(row.payout)}</td>
                  <td className="px-2 py-1 font-mono">{fmtUsd(row.net, true)}</td>
                  <td className="px-2 py-1 font-mono">{row.won}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">Noch kein Abschluss gebucht.</p>
      )}
    </details>
  );
}

function downloadLedger(rows: LedgerRow[]): void {
  const header = ["Datum", "Stufe", "Eval-Ausgaben ($)", "Brutto-Payout ($)", "Netto-Cash-Ergebnis ($)", "Gewonnene Funded-Konten"];
  const body = rows.map((row) => [new Date(row.date).toLocaleString("de-DE"), row.stage, row.costs, row.payout, row.net, row.won]);
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
