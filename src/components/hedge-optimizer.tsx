import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, Signed, fieldClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { fmtUsd } from "@/lib/format";
import {
  HEDGE_DEFAULTS,
  HEDGE_STORAGE_KEY,
  hedgeCurve,
  optimizeHedge,
  sanitizeHedge,
  type HedgeCurvePoint,
  type HedgeInputs,
  type HedgePlan,
  type HedgeWarning,
} from "@/lib/hedge";

const STORAGE_KEY = HEDGE_STORAGE_KEY;

const PRESETS: { label: string; patch: Partial<HedgeInputs> }[] = [
  {
    label: "25k→25k",
    patch: {
      evalSize: 25000,
      evalPrice: 95,
      numEvals: 2,
      fundedSize: 25000,
      numFunded: 1,
      manualNotional: 23750,
      mode: "manual",
    },
  },
  {
    label: "50k←25k",
    patch: {
      evalSize: 50000,
      evalPrice: 180,
      numEvals: 2,
      fundedSize: 25000,
      numFunded: 2,
      manualNotional: 22500,
      mode: "manual",
    },
  },
  {
    label: "100k←50k",
    patch: {
      evalSize: 100000,
      evalPrice: 330,
      numEvals: 2,
      fundedSize: 50000,
      numFunded: 2,
      manualNotional: 41250,
      mode: "manual",
    },
  },
];

export function HedgeOptimizer() {
  const [inputs, setInputs] = useState<HedgeInputs>(HEDGE_DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setInputs(sanitizeHedge(JSON.parse(raw)));
    } catch {
      /* keep defaults */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
  }, [inputs, ready]);

  const plan = useMemo(() => optimizeHedge(inputs), [inputs]);

  const set = (key: keyof HedgeInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Prop Firm Klon-Calculator</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Evals sind short, Funded ist long. Der Fail-Move ist Drawdown geteilt durch den
          Eval-Hebel, der Pass-Move ist Target geteilt durch denselben Hebel. Optimal heißt: der
          Payout im Fail deckt die Eval-Kosten.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">Evals (Short)</h3>
          <div className="grid gap-3">
            <NumField
              id="eval-size"
              label="Eval-Account Größe"
              value={inputs.evalSize}
              unit="$"
              min={1000}
              step={1000}
              hint={moneyHint(inputs.evalSize)}
              onChange={(value) => set("evalSize", value)}
            />
            <NumField
              id="eval-price"
              label="Preis pro Eval"
              value={inputs.evalPrice}
              unit="$"
              min={1}
              step={1}
              hint={`Summe ${fmtUsd(inputs.numEvals * inputs.evalPrice)}`}
              onChange={(value) => set("evalPrice", value)}
            />
            <NumField
              id="num-evals"
              label="Anzahl Evals"
              value={inputs.numEvals}
              unit="Stk"
              min={1}
              step={1}
              onChange={(value) => set("numEvals", value)}
            />
            <NumField
              id="eval-lev"
              label="Eval-Hebel"
              value={inputs.evalLeverage}
              unit="×"
              min={0.1}
              step={0.1}
              hint="Notional / Account"
              onChange={(value) => set("evalLeverage", value)}
            />
          </div>
        </section>

        <section className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">Funded (Long)</h3>
          <div className="grid gap-3">
            <NumField
              id="funded-size"
              label="Funded-Account Größe"
              value={inputs.fundedSize}
              unit="$"
              min={1000}
              step={1000}
              hint={moneyHint(inputs.fundedSize)}
              onChange={(value) => set("fundedSize", value)}
            />
            <NumField
              id="num-funded"
              label="Anzahl Funded-Accounts"
              value={inputs.numFunded}
              unit="Stk"
              min={1}
              step={1}
              onChange={(value) => set("numFunded", value)}
            />
            <div>
              <p className="mb-1 text-xs text-muted">Modus</p>
              <div className="grid grid-cols-2 gap-1 rounded-full bg-bg p-1">
                {(
                  [
                    ["optimal", "Optimal"],
                    ["manual", "Manuell"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setInputs((prev) => ({ ...prev, mode: id }))}
                    className={cn(
                      "h-9 rounded-full px-3 text-sm",
                      inputs.mode === id ? "bg-fg text-bg" : "text-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-faint">
                {inputs.mode === "optimal" ? "Fail-Netto wird auf 0 gesetzt" : "Notional selbst vorgeben"}
              </p>
            </div>
            {inputs.mode === "manual" ? (
              <NumField
                id="manual-notional"
                label="Notional pro Funded-Account"
                value={inputs.manualNotional}
                unit="$"
                min={0}
                step={100}
                hint={moneyHint(inputs.manualNotional)}
                onChange={(value) => set("manualNotional", value)}
              />
            ) : null}
          </div>
        </section>

        <section className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">Regeln</h3>
          <div className="grid gap-3">
            <NumField
              id="target"
              label="Profit Target"
              value={inputs.targetPct}
              unit="%"
              min={0.1}
              step={0.1}
              hint={pctHint(inputs.evalSize, inputs.targetPct)}
              onChange={(value) => set("targetPct", value)}
            />
            <NumField
              id="dd"
              label="Max Drawdown"
              value={inputs.ddPct}
              unit="%"
              min={0.1}
              step={0.1}
              hint={pctHint(inputs.fundedSize, inputs.ddPct)}
              onChange={(value) => set("ddPct", value)}
            />
            <NumField
              id="split"
              label="Profit Split, Trader"
              value={inputs.splitPct}
              unit="%"
              min={1}
              max={100}
              step={1}
              onChange={(value) => set("splitPct", value)}
            />
            <div>
              <p className="mb-2 text-xs text-muted">Presets</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    onClick={() => setInputs((prev) => ({ ...prev, ...preset.patch }))}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Result
          kicker={`Evals (Short) · ${plan.numEvals} Accounts`}
          title={`${plan.numEvals}× ${fmtUsd(plan.evalNotional)}`}
          lines={[
            `Hebel ${fmtLev(plan.evalLeverage, 2)}`,
            `Fail-Move +${fmtPct(plan.adverseMovePct)}`,
            `Pass-Move −${fmtPct(plan.favorableMovePct)}`,
          ]}
        />
        <Result
          kicker={`Funded (Long) · ${plan.numFunded} Accounts · ${plan.mode === "optimal" ? "Optimal, Fail ≈ 0" : "Manuell"}`}
          title={`${plan.numFunded}× ${fmtUsd(plan.fundedNotionalPer)}`}
          lines={[
            `Hebel ${fmtLev(plan.fundedLeverage, 3)}`,
            `Gesamt-Notional ${fmtUsd(plan.fNotional)}`,
            `DD-Raum pro Account ${fmtUsd(plan.fundedSize * (plan.ddLimitPct / 100))}`,
          ]}
        />
        <Result
          tone="short"
          kicker={`Fail · +${fmtPct(plan.adverseMovePct)} · Evals sterben`}
          title={`Netto ${fmtUsd(plan.netFail, true)}`}
          titleClass={Math.abs(plan.netFail) < 1 ? "text-long" : plan.netFail > 0 ? "text-long" : "text-short"}
          lines={[
            `Funded brutto ${fmtUsd(plan.fundedGrossAtFail)}`,
            `${fmtPct(plan.split * 100, 0)} Payout ${fmtUsd(plan.payoutAtFail)}`,
            `Eval-Kosten ${fmtUsd(plan.totalCost)}`,
          ]}
        />
        <Result
          tone="long"
          kicker={`Pass · −${fmtPct(plan.favorableMovePct)} · Evals treffen das Target`}
          title={plan.fundedSurvives ? "Funded überleben" : "Funded sterben"}
          titleClass={plan.fundedSurvives ? "text-long" : "text-short"}
          lines={[
            `Neue Funded ${plan.numEvals}× ${fmtUsd(plan.evalSize)}`,
            `Verlust auf bestehenden Funded ${fmtUsd(plan.fundedLossAtPass)}`,
            `DD-Raum ${fmtUsd(plan.totalDDRoom)} · Auslastung ${fmtPct(plan.ddUsagePct)} von ${fmtPct(plan.ddLimitPct, 1)}`,
          ]}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric label="Pass" value={fmtPct(plan.pPass * 100, 1)} sub="Random Walk, untere Barriere" tone="long" />
        <Metric label="Fail" value={fmtPct(plan.pFail * 100, 1)} sub="Random Walk, obere Barriere" tone="short" />
        <Metric
          label="Hedge-Ratio"
          value={plan.cNotional > 0 ? fmtRatio(plan.fNotional / plan.cNotional) : "—"}
          sub="Funded-Notional / Eval-Notional"
        />
      </div>

      <HedgeChart plan={plan} />

      <section className="mt-3 card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-faint">
              <th className="px-3 py-2 font-medium">Kennzahl</th>
              <th className="px-3 py-2 text-right font-medium">Wert</th>
            </tr>
          </thead>
          <tbody>
            <TableRow label="Gesamtkosten Evals" value={fmtUsd(plan.totalCost)} />
            <TableRow label="Funded Gesamt-Notional" value={fmtUsd(plan.fNotional)} />
            <TableRow label="Hebel auf Funded" value={fmtLev(plan.fundedLeverage, 3)} />
            <TableRow label="Fail-Netto" value={fmtUsd(plan.netFail, true)} signed={plan.netFail} />
            <TableRow label="Pass DD-Auslastung" value={fmtPct(plan.ddUsagePct)} />
            <TableRow label="Neue Funded bei Pass" value={`${plan.numEvals}× ${fmtUsd(plan.evalSize)}`} />
          </tbody>
        </table>
      </section>

      <div className="mt-3 rounded-xl bg-raised p-4 text-sm leading-relaxed">
        <p className="font-medium text-short">Hinweise</p>
        <ul className="mt-2 space-y-1 text-muted">
          {plan.warnings.map((warning) => (
            <li key={warning}>{warningText(warning)}</li>
          ))}
          <li>
            Cross-Account Opposite-Positionen sind bei fast allen Prop Firms verboten und können zur Kündigung
            und zur Verweigerung des Payouts führen.
          </li>
        </ul>
      </div>
    </div>
  );
}

function HedgeChart({ plan }: { plan: HedgePlan }) {
  const points = useMemo(() => hedgeCurve(plan), [plan]);
  return (
    <section className="mt-3 card p-3">
      <h3 className="text-sm font-semibold">Payoff</h3>
      <p className="mt-1 text-xs text-muted">
        Positiv ist der Markt nach oben. Fail sitzt bei +{fmtPct(plan.adverseMovePct)}, Pass bei −
        {fmtPct(plan.favorableMovePct)}. Nach Split gilt nur auf dem Weg nach oben: Funded-Gewinn mal
        Split, abzüglich der Eval-Kosten.
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0.5 w-6 bg-short" />
          Eval
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0.5 w-6 bg-long" />
          Funded
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-6 border-t border-dashed border-accent" />
          Summe
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0.5 w-6 bg-preview" />
          Nach Split
        </span>
      </div>
      <div className="payoff mt-2 h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 18, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis
              dataKey="move"
              type="number"
              scale="linear"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value: number) => `${value.toFixed(1)}%`}
              tickCount={7}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value: number) => fmtUsd(value)}
              width={72}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as HedgeCurvePoint | undefined;
                if (!row) return null;
                return (
                  <div className="rounded-xl bg-bg px-3 py-2 font-mono text-xs">
                    <p className="text-muted">{row.move.toFixed(2)}%</p>
                    <p className="text-short">Eval {fmtUsd(row.challenge, true)}</p>
                    <p className="text-long">Funded {fmtUsd(row.funded, true)}</p>
                    <p className="text-accent">Summe {fmtUsd(row.net, true)}</p>
                    <p className="text-preview">Nach Split {fmtUsd(row.trader, true)}</p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="var(--color-faint)" />
            <ReferenceLine
              x={plan.adverseMovePct}
              stroke="var(--color-short)"
              strokeDasharray="3 3"
              label={{ value: "Fail", fill: "var(--color-short)", fontSize: 11, position: "insideTop" }}
            />
            <ReferenceLine
              x={-plan.favorableMovePct}
              stroke="var(--color-long)"
              strokeDasharray="3 3"
              label={{ value: "Pass", fill: "var(--color-long)", fontSize: 11, position: "insideTop" }}
            />
            <Line type="linear" dataKey="challenge" stroke="var(--color-short)" dot={false} strokeWidth={2} isAnimationActive={false} />
            <Line type="linear" dataKey="funded" stroke="var(--color-long)" dot={false} strokeWidth={2} isAnimationActive={false} />
            <Line type="linear" dataKey="net" stroke="var(--color-accent)" strokeDasharray="5 4" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            <Line type="linear" dataKey="trader" stroke="var(--color-preview)" dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function warningText(warning: HedgeWarning): string {
  if (warning === "funded-dies") {
    return "Im Pass verbrauchen die bestehenden Funded mehr als ihren Drawdown. Sie sterben mit.";
  }
  if (warning === "dd-tight") {
    return "Im Pass werden über 80 % des Funded-Drawdowns verbraucht.";
  }
  if (warning === "tiny-move") {
    return "Der Fail-Move ist sehr klein. Spread und Slippage können das Ergebnis drehen.";
  }
  return "Im manuellen Modus deckt der Fail-Payout die Eval-Kosten nicht.";
}

function Result({
  kicker,
  title,
  titleClass,
  lines,
  tone = "accent",
}: {
  kicker: string;
  title: string;
  titleClass?: string;
  lines: string[];
  tone?: "accent" | "long" | "short";
}) {
  return (
    <section
      className={cn(
        "card border-l-2 p-4",
        tone === "short" && "border-short",
        tone === "long" && "border-long",
        tone === "accent" && "border-accent",
      )}
    >
      <p className="text-xs text-muted">{kicker}</p>
      <p className={cn("mt-1 font-mono text-xl font-semibold tabular-nums", titleClass)}>{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-muted">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

function TableRow({ label, value, signed }: { label: string; value: string; signed?: number }) {
  return (
    <tr className="border-t border-line">
      <td className="px-3 py-2">{label}</td>
      <td className="px-3 py-2 text-right font-mono tabular-nums">
        {signed == null ? value : <Signed value={signed} text={value} />}
      </td>
    </tr>
  );
}

function Metric({
  label,
  value,
  sub,
  tone = "fg",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "fg" | "accent" | "long" | "short";
}) {
  const color =
    tone === "accent" ? "text-accent" : tone === "long" ? "text-long" : tone === "short" ? "text-short" : "text-fg";
  return (
    <div className="card px-3 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 font-mono text-lg font-semibold tabular-nums ${color}`}>{value}</p>
      <p className="mt-1 truncate text-xs text-faint">{sub}</p>
    </div>
  );
}

function NumField({
  id,
  label,
  value,
  unit,
  hint,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  unit: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={fieldClass}
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = event.target.value === "" ? 0 : Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
        />
        <span className="w-8 shrink-0 text-xs text-muted">{unit}</span>
      </div>
      {hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

function moneyHint(amount: number): string {
  return Number.isFinite(amount) ? fmtUsd(amount) : "—";
}

function pctHint(size: number, pct: number): string {
  if (!Number.isFinite(size) || !Number.isFinite(pct)) return "—";
  return `= ${fmtUsd((size * pct) / 100)}`;
}

function fmtPct(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

function fmtLev(n: number, digits: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}×`;
}

function fmtRatio(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}×`;
}
