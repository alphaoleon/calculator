import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, fieldClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  ACCOUNT_SIZES,
  FIRM_STATUSES,
  PLATFORMS,
  blankFirm,
  freshBuffer,
  fuzzNotional,
  loadStore,
  quoteCycle,
  saveStore,
  type AccountSize,
  type CycleQuote,
  type FillStyle,
  type FirmStore,
  type LegQuote,
  type PropFirm,
  type SlotSide,
} from "@/lib/firms";
import { fmtUsd } from "@/lib/format";

export function FirmDesk() {
  const [store, setStore] = useState<FirmStore | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [fuzz, setFuzz] = useState<number[] | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    setStore(loadStore());
  }, []);

  useEffect(() => {
    if (!store) return;
    saveStore(store);
  }, [store]);

  const quote = useMemo(() => (store ? quoteCycle(store) : null), [store]);

  if (!store || !quote) return null;

  const patch = (next: FirmStore) => {
    setFuzz(null);
    setNote("");
    setStore(next);
  };

  const updateFirm = (id: string, partial: Partial<PropFirm>) => {
    patch({ ...store, firms: store.firms.map((row) => (row.id === id ? { ...row, ...partial } : row)) });
  };

  const setSlot = (key: "funded" | "eval1" | "eval2", partial: Partial<SlotSide>) => {
    patch({ ...store, cycle: { ...store.cycle, [key]: { ...store.cycle[key], ...partial } } });
  };

  const rotate = (kind: "fail" | "pass") => {
    if (kind === "fail") {
      const gain = store.cycle.extraProfit;
      const row = {
        id: `h-${Date.now()}`,
        at: new Date().toISOString(),
        kind: "fail" as const,
        cashDelta: gain,
        text: `Evals gestorben bei +${store.cycle.slMovePct.toFixed(2)}%. Over-Hedge ${fmtUsd(gain, true)} aufs Cash.`,
      };
      patch({ ...store, cash: store.cash + gain, history: [row, ...store.history].slice(0, 40) });
      setNote(row.text);
      return;
    }
    const ids = [store.cycle.funded.firmId, store.cycle.eval1.firmId, store.cycle.eval2.enabled ? store.cycle.eval2.firmId : ""].filter(Boolean);
    if (new Set(ids).size !== ids.length) {
      setNote("Rotation blockiert: dieselbe Firma sitzt in zwei Slots.");
      return;
    }
    const statusFor = (id: string) => {
      if (id === store.cycle.funded.firmId) return "Cooldown / Wartet auf Payout" as const;
      if (id === store.cycle.eval1.firmId) return "Aktiver Kloner (Funded)" as const;
      if (store.cycle.eval2.enabled && id === store.cycle.eval2.firmId) return "Cash-Kuh (Trader)" as const;
      return null;
    };
    const firms = store.firms.map((row) => {
      const status = statusFor(row.id);
      return status ? { ...row, status } : row;
    });
    const text = "Evals bestanden. Funded auf Cooldown, Eval 1 ist der neue Kloner, Eval 2 die Cash-Kuh.";
    const row = { id: `h-${Date.now()}`, at: new Date().toISOString(), kind: "pass" as const, cashDelta: 0, text };
    patch({ ...store, firms, history: [row, ...store.history].slice(0, 40) });
    setNote(text);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Firmen-Hedge</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Beide Evals sterben beim selben Kurs-Move. Die Positionsgröße ist der Drawdown geteilt durch
          Move plus Round-Trip-Fee der jeweiligen Firma. Das Funded ist so groß, dass nach Fee und Split
          die Eval-Kosten plus der Over-Hedge übrig bleiben.
        </p>
      </div>

      <FirmManager
        store={store}
        editing={editing}
        onEdit={setEditing}
        onChange={updateFirm}
        onAdd={() => {
          const row = blankFirm();
          patch({ ...store, firms: [...store.firms, row] });
          setEditing(row.id);
        }}
        onDelete={(id) => {
          const firms = store.firms.filter((row) => row.id !== id);
          if (!firms.length) return;
          const fallback = firms[0]?.id ?? "";
          const fix = (slot: SlotSide): SlotSide => ({ ...slot, firmId: slot.firmId === id ? fallback : slot.firmId });
          patch({
            ...store,
            firms,
            cycle: { ...store.cycle, funded: fix(store.cycle.funded), eval1: fix(store.cycle.eval1), eval2: fix(store.cycle.eval2) },
          });
          if (editing === id) setEditing(null);
        }}
      />

      <section className="mt-3 card p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Slider
            label={`SL-Move ${store.cycle.slMovePct.toFixed(2)}%`}
            min={0.2}
            max={3}
            step={0.05}
            value={store.cycle.slMovePct}
            onChange={(slMovePct) => patch({ ...store, cycle: { ...store.cycle, slMovePct } })}
          />
          <Slider
            label={`Over-Hedge ${fmtUsd(store.cycle.extraProfit)}`}
            min={0}
            max={300}
            step={5}
            value={store.cycle.extraProfit}
            onChange={(extraProfit) => patch({ ...store, cycle: { ...store.cycle, extraProfit } })}
          />
          <label className="block text-xs text-muted">
            Cash-Bestand
            <input
              type="number"
              min={0}
              step={10}
              className={cn(fieldClass, "mt-1")}
              value={store.cash}
              onChange={(event) => patch({ ...store, cash: numberOr(event.target.value) })}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <SlotCard
            title="Funded · Kloner, long"
            firms={store.firms}
            slot={store.cycle.funded}
            kind="funded"
            onChange={(partial) => setSlot("funded", partial)}
          />
          <SlotCard
            title="Eval 1 · short"
            firms={store.firms}
            slot={store.cycle.eval1}
            kind="eval"
            onChange={(partial) => setSlot("eval1", partial)}
          />
          <SlotCard
            title="Eval 2 · short"
            firms={store.firms}
            slot={store.cycle.eval2}
            kind="eval"
            optional
            onChange={(partial) => setSlot("eval2", partial)}
          />
        </div>
      </section>

      <WarningPanel quote={quote} />

      <section className="mt-3 grid gap-3 lg:grid-cols-3">
        {quote.evals.map((leg, index) => (
          <ResultCard key={`${leg.firmId}-${index}`} kicker={`Eval ${index + 1}`} leg={leg} />
        ))}
        <FundedCard quote={quote} />
      </section>

      <section className="mt-3 card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Tarn-Größen</h3>
          <Button
            onClick={() => {
              const salts = [Math.random(), Math.random(), Math.random()];
              setFuzz([
                fuzzNotional(quote.funded.pos, salts[0] ?? 0),
                ...quote.evals.map((leg, index) => fuzzNotional(leg.pos, salts[index + 1] ?? Math.random())),
              ]);
            }}
          >
            Tarn-Größen ±1%
          </Button>
        </div>
        {fuzz ? (
          <p className="mt-2 font-mono text-sm tabular-nums">
            Funded {fmtUsd(fuzz[0] ?? 0)}
            {quote.evals.map((leg, index) => ` · Eval ${index + 1} ${fmtUsd(fuzz[index + 1] ?? 0)}`)}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">Glatt gerechnet steht oben. Der Button verkrümmt die Größen, damit keine runde Copier-Summe im Buch steht.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button tone="sell" onClick={() => rotate("fail")}>
            Evals gestorben (+{store.cycle.slMovePct.toFixed(2)}%)
          </Button>
          <Button tone="buy" onClick={() => rotate("pass")}>
            Evals bestanden, Rotation
          </Button>
        </div>
        {note ? <p className="mt-3 text-sm">{note}</p> : null}
        {store.history.length ? (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {store.history.slice(0, 6).map((row) => (
              <li key={row.id}>
                {new Date(row.at).toLocaleString("de-DE")} · {row.text}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function FirmManager({
  store,
  editing,
  onEdit,
  onChange,
  onAdd,
  onDelete,
}: {
  store: FirmStore;
  editing: string | null;
  onEdit: (id: string | null) => void;
  onChange: (id: string, partial: Partial<PropFirm>) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Meine Prop-Firms</h3>
        <Button tone="accent" onClick={onAdd}>
          Firma dazu
        </Button>
      </div>
      <div className="mt-3 grid gap-2">
        {store.firms.map((row) => (
          <article key={row.id} className="rounded-xl bg-bg p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-muted">
                  {row.platform} · Maker {fmtPct(row.makerFee)} · Taker {fmtPct(row.takerFee)} · Split {row.profitSplit}% · DD {row.maxDrawdownPct}%
                </p>
                <p className={cn("text-xs", statusTone(row.status))}>{row.status}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => onEdit(editing === row.id ? null : row.id)}>{editing === row.id ? "Zu" : "Bearbeiten"}</Button>
                <Button onClick={() => onDelete(row.id)}>Weg</Button>
              </div>
            </div>
            {editing === row.id ? <FirmForm firm={row} onChange={(partial) => onChange(row.id, partial)} /> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function FirmForm({ firm, onChange }: { firm: PropFirm; onChange: (partial: Partial<PropFirm>) => void }) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Field label="Name">
        <input className={fieldClass} value={firm.name} onChange={(event) => onChange({ name: event.target.value })} />
      </Field>
      <Field label="Plattform">
        <select className={fieldClass} value={firm.platform} onChange={(event) => onChange({ platform: event.target.value as PropFirm["platform"] })}>
          {PLATFORMS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
      <Field label="Maker % pro Fill">
        <input type="number" min={0} step={0.001} className={fieldClass} value={firm.makerFee} onChange={(event) => onChange({ makerFee: numberOr(event.target.value) })} />
      </Field>
      <Field label="Taker % pro Fill">
        <input type="number" min={0} step={0.001} className={fieldClass} value={firm.takerFee} onChange={(event) => onChange({ takerFee: numberOr(event.target.value) })} />
      </Field>
      <Field label="Profit Split %">
        <input type="number" min={1} max={100} step={1} className={fieldClass} value={firm.profitSplit} onChange={(event) => onChange({ profitSplit: numberOr(event.target.value) })} />
      </Field>
      <Field label="Max Drawdown %">
        <input type="number" min={0.1} step={0.1} className={fieldClass} value={firm.maxDrawdownPct} onChange={(event) => onChange({ maxDrawdownPct: numberOr(event.target.value) })} />
      </Field>
      <Field label="Profit Target %">
        <input type="number" min={0.1} step={0.1} className={fieldClass} value={firm.profitTargetPct} onChange={(event) => onChange({ profitTargetPct: numberOr(event.target.value) })} />
      </Field>
      <Field label="Status">
        <select className={fieldClass} value={firm.status} onChange={(event) => onChange({ status: event.target.value as PropFirm["status"] })}>
          {FIRM_STATUSES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
      {ACCOUNT_SIZES.map((size) => (
        <Field key={size} label={`Eval-Preis ${size / 1000}k`}>
          <input
            type="number"
            min={0}
            step={1}
            className={fieldClass}
            value={firm.prices[size]}
            onChange={(event) => onChange({ prices: { ...firm.prices, [size]: numberOr(event.target.value) } })}
          />
        </Field>
      ))}
    </div>
  );
}

function SlotCard({
  title,
  firms,
  slot,
  kind,
  optional,
  onChange,
}: {
  title: string;
  firms: PropFirm[];
  slot: SlotSide;
  kind: "funded" | "eval";
  optional?: boolean;
  onChange: (partial: Partial<SlotSide>) => void;
}) {
  const firm = firms.find((row) => row.id === slot.firmId);
  const price = firm?.prices[slot.size];
  return (
    <article className={cn("rounded-xl bg-bg p-3", optional && !slot.enabled && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {optional ? (
          <button type="button" className="text-xs text-accent" onClick={() => onChange({ enabled: !slot.enabled })}>
            {slot.enabled ? "Aus" : "An"}
          </button>
        ) : null}
      </div>
      {optional && !slot.enabled ? <p className="mt-2 text-xs text-muted">Zweiter Eval ist aus.</p> : null}
      {!(optional && !slot.enabled) ? (
        <div className="mt-2 grid gap-2">
          <select
            className={fieldClass}
            value={slot.firmId}
            onChange={(event) => {
              const next = firms.find((row) => row.id === event.target.value);
              onChange(next && kind === "funded" ? { firmId: event.target.value, buffer: freshBuffer(next, slot.size) } : { firmId: event.target.value });
            }}
          >
            {firms.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            value={slot.size}
            onChange={(event) => {
              const size = Number(event.target.value) as AccountSize;
              onChange(firm && kind === "funded" ? { size, buffer: freshBuffer(firm, size) } : { size });
            }}
          >
            {ACCOUNT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size / 1000}k{kind === "eval" && firm ? ` · ${fmtUsd(firm.prices[size])}` : ""}
              </option>
            ))}
          </select>
          <select className={fieldClass} value={slot.style} onChange={(event) => onChange({ style: event.target.value as FillStyle })}>
            <option value="market">Market + SL/TP (2× Taker)</option>
            <option value="limit">Limit + SL/TP (Maker + Taker)</option>
          </select>
          {kind === "funded" ? (
            <label className="text-xs text-muted">
              Restpuffer USD
              <input type="number" min={0} step={10} className={cn(fieldClass, "mt-1")} value={slot.buffer} onChange={(event) => onChange({ buffer: numberOr(event.target.value) })} />
            </label>
          ) : (
            <label className="text-xs text-muted">
              Rabatt % {price != null ? `· zahlst ${fmtUsd(price * (1 - slot.discountPct / 100))}` : ""}
              <input type="number" min={0} max={100} step={1} className={cn(fieldClass, "mt-1")} value={slot.discountPct} onChange={(event) => onChange({ discountPct: numberOr(event.target.value) })} />
            </label>
          )}
          {firm ? (
            <p className="text-xs text-faint">
              {firm.status} · RT {fmtPct(slot.style === "market" ? 2 * firm.takerFee : firm.makerFee + firm.takerFee)}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function WarningPanel({ quote }: { quote: CycleQuote }) {
  if (!quote.warnings.length) {
    return (
      <section className="mt-3 card border-l-2 border-long p-4 text-sm">
        Keine Firmen- oder Plattform-Kollision auf den aktiven Slots.
      </section>
    );
  }
  return (
    <section className="mt-3 grid gap-2">
      {quote.warnings.map((warning) => (
        <p key={warning.text} className={cn("card border-l-2 p-4 text-sm", warning.tone === "red" ? "border-short text-short" : "border-preview text-preview")}>
          {warning.text}
        </p>
      ))}
    </section>
  );
}

function ResultCard({ kicker, leg }: { kicker: string; leg: LegQuote }) {
  return (
    <article className="card p-4">
      <p className="text-xs text-muted">{kicker}</p>
      <h3 className="mt-1 text-sm font-semibold">{leg.name}</h3>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{leg.feasible ? fmtUsd(leg.pos) : "—"}</p>
      <ul className="mt-2 space-y-1 text-sm text-muted">
        <li>Hebel {leg.feasible ? `${leg.leverage.toFixed(2)}×` : "Fee schluckt den Move"}</li>
        <li>Round-Trip {fmtPct(leg.rtPct)} · Fee {fmtUsd(leg.feeUsd)}</li>
        <li>Bis Target nach Fee {leg.feasible ? `${leg.tpMovePct.toFixed(2)}%` : "—"}</li>
        <li>Eval-Kosten {fmtUsd(leg.cost)}</li>
      </ul>
    </article>
  );
}

function FundedCard({ quote }: { quote: CycleQuote }) {
  const leg = quote.funded;
  const alive = leg.feasible && leg.remaining >= 0;
  return (
    <article className="card p-4 lg:col-span-1">
      <p className="text-xs text-muted">Funded</p>
      <h3 className="mt-1 text-sm font-semibold">{leg.name}</h3>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{leg.feasible ? fmtUsd(leg.pos) : "—"}</p>
      <ul className="mt-2 space-y-1 text-sm text-muted">
        <li>Hebel {leg.feasible ? `${leg.leverage.toFixed(2)}×` : "Fee größer als der SL-Move"}</li>
        <li>Brutto nötig {fmtUsd(leg.neededGross)} · Fee {fmtUsd(leg.feeUsd)}</li>
        <li>Verlust wenn Evals durchlaufen {fmtUsd(leg.loss)} bei {quote.maxTpMovePct.toFixed(2)}%</li>
        <li className={alive ? "text-long" : "text-short"}>
          Restpuffer {leg.feasible ? fmtUsd(leg.remaining, true) : "—"} von {fmtUsd(leg.buffer)}
        </li>
      </ul>
    </article>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="mt-3 w-full accent-accent"
        onChange={(event) => onChange(numberOr(event.target.value))}
      />
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function statusTone(status: PropFirm["status"]): string {
  if (status.startsWith("Aktiver")) return "text-accent";
  if (status.startsWith("Cash")) return "text-long";
  if (status.startsWith("Cooldown") || status.startsWith("Im Eval")) return "text-preview";
  return "text-faint";
}

function fmtPct(n: number): string {
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}%`;
}

function numberOr(value: string): number {
  const next = value === "" ? 0 : Number(value);
  return Number.isFinite(next) ? next : 0;
}
