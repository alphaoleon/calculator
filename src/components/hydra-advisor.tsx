import { useEffect, useMemo, useState } from "react";
import { Button, fieldClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { fmtUsd } from "@/lib/format";
import { HEDGE_STORAGE_KEY } from "@/lib/hedge";
import { askHydra } from "@/lib/hydra-chat";
import {
  ADVISOR_QUESTIONS,
  EVAL_PRODUCTS,
  adviceContext,
  advise,
  formatK,
  offlineAnswer,
  toHedgeInputs,
  type Advice,
  type ComboPlan,
  type FundedSlot,
  type Inventory,
} from "@/lib/hydra";

const STORAGE_KEY = "position-builder.hydra.v1";
const KEY_STORAGE = "position-builder.hydra.key";

const PRESETS: { label: string; inventory: Inventory }[] = [
  {
    label: "10k Start",
    inventory: { cash: 500, discountPct: 0, accounts: [{ id: "p1", size: 10_000, buffer: 300 }] },
  },
  {
    label: "10k + 5k",
    inventory: {
      cash: 500,
      discountPct: 0,
      accounts: [
        { id: "p1", size: 10_000, buffer: 300 },
        { id: "p2", size: 5_000, buffer: 150 },
      ],
    },
  },
  {
    label: "100k Drucker",
    inventory: { cash: 2000, discountPct: 0, accounts: [{ id: "p1", size: 100_000, buffer: 3000 }] },
  },
];

export function HydraAdvisor({ onOpenOptimizer }: { onOpenOptimizer: () => void }) {
  const [inventory, setInventory] = useState<Inventory>(PRESETS[0].inventory);
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<{ role: "you" | "hydra"; text: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setInventory(sanitizeInventory(JSON.parse(raw)));
      setApiKey(window.localStorage.getItem(KEY_STORAGE) ?? "");
    } catch {
      /* keep defaults */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  }, [inventory, ready]);

  const advice = useMemo(() => advise(inventory), [inventory]);

  const apply = (plan: ComboPlan) => {
    window.localStorage.setItem(HEDGE_STORAGE_KEY, JSON.stringify(toHedgeInputs(plan)));
    onOpenOptimizer();
  };

  const setAccount = (id: string, patch: Partial<FundedSlot>) => {
    setInventory((prev) => ({
      ...prev,
      accounts: prev.accounts.map((account) => (account.id === id ? { ...account, ...patch } : account)),
    }));
  };

  const ask = async (text: string, quickId?: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setChatError("");
    setChat((prev) => [...prev, { role: "you", text: trimmed }]);
    setQuestion("");
    if (quickId || !apiKey.trim()) {
      const answer = quickId
        ? offlineAnswer(quickId, inventory, advice)
        : "Ohne API-Key beantworte ich nur die vier Schnellfragen. Trag einen xAI- oder OpenAI-Key ein, wenn die Frage frei sein soll.";
      setChat((prev) => [...prev, { role: "hydra", text: answer }]);
      return;
    }
    setPending(true);
    try {
      const result = await askHydra({
        data: { apiKey: apiKey.trim(), question: trimmed, context: adviceContext(inventory, advice) },
      });
      setChat((prev) => [...prev, { role: "hydra", text: result.text }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Die Anfrage ist fehlgeschlagen.";
      setChatError(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <details className="mx-auto w-full max-w-5xl px-3 pb-4">
      <summary className="cursor-pointer text-sm font-medium text-muted">Strategie-Baum mit festen Preisen</summary>
      <div className="pt-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Hydra Strategie</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Evals short mit 3×, Funded long. Der Fail ist +1%, der Pass −3%, der Split 80%. Die
          Long-Größe ist so gerechnet, dass Payout minus Eval-Kosten minus 0,08% Fee genau 0 ist.
          Opposite-Positionen sind bei fast allen Firmen verboten.
        </p>
      </div>

      <section className="card p-4">
        <h3 className="text-sm font-semibold">Inventar</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-muted">
            Cash auf der Wallet
            <input
              type="number"
              min={0}
              step={10}
              className={cn(fieldClass, "mt-1")}
              value={inventory.cash}
              onChange={(event) => setInventory((prev) => ({ ...prev, cash: numberOr(event.target.value) }))}
            />
          </label>
          <label className="block text-xs text-muted">
            Rabatt auf neue Evals · {inventory.discountPct}%
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              className="mt-3 w-full accent-accent"
              value={inventory.discountPct}
              onChange={(event) => setInventory((prev) => ({ ...prev, discountPct: numberOr(event.target.value) }))}
            />
          </label>
        </div>
        <div className="mt-3 grid gap-2">
          {inventory.accounts.map((account) => (
            <div key={account.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <label className="block text-xs text-muted">
                Funded
                <select
                  className={cn(fieldClass, "mt-1")}
                  value={account.size}
                  onChange={(event) => {
                    const size = numberOr(event.target.value);
                    setAccount(account.id, { size, buffer: Math.round(size * 0.03) });
                  }}
                >
                  {EVAL_PRODUCTS.map((product) => (
                    <option key={product.size} value={product.size}>
                      {formatK(product.size)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-muted">
                Restpuffer
                <input
                  type="number"
                  min={0}
                  step={10}
                  className={cn(fieldClass, "mt-1")}
                  value={account.buffer}
                  onChange={(event) => setAccount(account.id, { buffer: numberOr(event.target.value) })}
                />
              </label>
              <Button
                className="mb-0.5"
                onClick={() =>
                  setInventory((prev) => ({
                    ...prev,
                    accounts: prev.accounts.filter((item) => item.id !== account.id),
                  }))
                }
              >
                Weg
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            tone="accent"
            onClick={() =>
              setInventory((prev) => ({
                ...prev,
                accounts: [
                  ...prev.accounts,
                  { id: `a-${Date.now()}`, size: 5_000, buffer: 150 },
                ],
              }))
            }
          >
            Konto dazu
          </Button>
          {PRESETS.map((preset) => (
            <Button key={preset.label} onClick={() => setInventory(structuredClone(preset.inventory))}>
              {preset.label}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-faint">
          Eval-Preise {EVAL_PRODUCTS.map((product) => `${formatK(product.size)} ${fmtUsd(product.price)}`).join(" · ")}
          . Puffer gesamt {fmtUsd(advice.buffer)}.
        </p>
      </section>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <StrategyCard
          kicker="A · Zero-Loss"
          title="Gebührensicher"
          plan={advice.safe}
          onApply={apply}
          body={safeCopy(advice)}
        />
        <StrategyCard
          kicker="B · Over-Hedge"
          title="Fürs Scheitern bezahlt"
          plan={advice.printer?.scaled ?? null}
          onApply={apply}
          body={printerCopy(advice)}
        />
        <StrategyCard
          kicker="C · Bridge"
          title="Konten bündeln"
          plan={advice.bridge}
          onApply={apply}
          body={bridgeCopy(advice)}
        />
        <StrategyCard
          kicker="D · Voll-Angriff"
          title={advice.attack?.fits ? "Passt schon" : "Rabatt oder Stop"}
          plan={advice.attack?.fits ? advice.attack.plan : advice.attack?.classic ?? null}
          onApply={apply}
          body={attackCopy(advice, inventory.discountPct)}
        />
      </div>

      <section className="mt-3 card p-4">
        <h3 className="text-sm font-semibold">Roadmap bis 2× 100k</h3>
        <p className="mt-1 text-xs text-muted">
          Jede Stufe ist der Pass. Die Evals werden Funded, die alten Konten behalten den Restpuffer.
          Konto 1 klont am Ende weiter, Konto 2 wird flach.
        </p>
        <ol className="mt-3 space-y-3">
          {advice.steps.map((step) => (
            <li key={step.index} className="rounded-xl bg-bg p-3">
              <p className="text-sm font-medium">
                {step.index}. Kauf {step.plan.label}
                <span className="ml-2 font-mono text-muted">{fmtUsd(step.plan.cost)}</span>
              </p>
              <p className="mt-1 text-sm text-muted">
                Short {step.plan.shorts.map((leg) => `${leg.count}× ${formatK(leg.size)} ${fmtUsd(leg.notional)}`).join(" · ")}
              </p>
              <p className="mt-1 text-sm text-muted">
                Long{" "}
                {step.plan.allocations
                  .map((leg) => `${formatK(leg.size)} ${fmtUsd(leg.notional)} (${leg.leverage.toFixed(2)}×)`)
                  .join(" · ")}
              </p>
              <p className="mt-1 text-sm">
                Fail +1%: Netto {fmtUsd(step.plan.net, true)}. Pass −3%: Restpuffer{" "}
                {step.survivors.map((leg) => `${formatK(leg.size)} ${fmtUsd(leg.buffer)}`).join(", ") || "keine"}
                {step.spawned.length
                  ? `. Neu: ${step.spawned.map((leg) => `${formatK(leg.size)} Puffer ${fmtUsd(leg.buffer)}`).join(", ")}`
                  : ""}
                . Wallet danach {fmtUsd(step.cashAfter)}.
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-fg">{advice.roadmapNote}</p>
      </section>

      <details className="mt-3 card p-4">
        <summary className="cursor-pointer text-sm font-semibold">Frag den Hydra-Berater</summary>
        <p className="mt-2 text-xs text-muted">
          Ohne Key antwortet ein fester Satz auf die vier Fragen. Mit Key geht die Frage plus deine
          Zahlen an xAI (Key beginnt mit xai-) oder OpenAI. Der Key bleibt im Browser.
        </p>
        <label className="mt-3 block text-xs text-muted">
          API-Key
          <input
            type="password"
            autoComplete="off"
            className={cn(fieldClass, "mt-1")}
            value={apiKey}
            onChange={(event) => {
              setApiKey(event.target.value);
              window.localStorage.setItem(KEY_STORAGE, event.target.value);
            }}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {ADVISOR_QUESTIONS.map((item) => (
            <Button key={item.id} onClick={() => ask(item.label, item.id)}>
              {item.label}
            </Button>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(question);
          }}
        >
          <input
            className={fieldClass}
            value={question}
            placeholder="Eigene Frage"
            onChange={(event) => setQuestion(event.target.value)}
          />
          <Button tone="accent" type="submit" disabled={pending}>
            {pending ? "…" : "Fragen"}
          </Button>
        </form>
        {chatError ? <p className="mt-2 text-sm text-short">{chatError}</p> : null}
        <div className="mt-3 space-y-2">
          {chat.map((entry, index) => (
            <p key={`${entry.role}-${index}`} className="whitespace-pre-wrap text-sm">
              <span className="text-muted">{entry.role === "you" ? "Du" : "Hydra"} · </span>
              {entry.text}
            </p>
          ))}
        </div>
      </details>
    </div>
    </details>
  );
}

function StrategyCard({
  kicker,
  title,
  body,
  plan,
  onApply,
}: {
  kicker: string;
  title: string;
  body: string;
  plan: ComboPlan | null;
  onApply: (plan: ComboPlan) => void;
}) {
  return (
    <section className="card flex flex-col p-4">
      <p className="text-xs text-muted">{kicker}</p>
      <h3 className="mt-1 text-base font-semibold">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{body}</p>
      {plan ? (
        <Button className="mt-3 self-start" tone="accent" onClick={() => onApply(plan)}>
          In den Optimizer
        </Button>
      ) : null}
    </section>
  );
}

function safeCopy(advice: Advice): string {
  const plan = advice.safe;
  if (!plan) return "Kein Kauf ist gleichzeitig bezahlbar und gebührensicher. Mehr Cash oder mehr Puffer.";
  const longs = plan.allocations
    .map((leg) => `${formatK(leg.size)} long ${fmtUsd(leg.notional)} (${leg.leverage.toFixed(2)}×)`)
    .join(", ");
  return [
    `Kauf ${plan.label} für ${fmtUsd(plan.cost)}.`,
    `${longs}.`,
    `Bei +1% ist der Payout ${fmtUsd(plan.payout)}, die Fee ${fmtUsd(plan.fees)}, Netto ${fmtUsd(plan.net)}.`,
    `Bei −3% geht der Puffer um ${fmtUsd(plan.passLoss)} zurück. Es bleiben ${fmtUsd(plan.rest)}.`,
  ].join("\n");
}

function printerCopy(advice: Advice): string {
  const printer = advice.printer;
  if (!printer) {
    return "Der Puffer ist zu knapp, um die große Stufe über den Nullpunkt hinaus aufzudrehen. Erst Karte A. Ein Over-Hedge braucht mehr als 150 USD Luft über dem normalen Hedge.";
  }
  const { scaled, unused, cashBeforeFee } = printer;
  const afterFee = cashBeforeFee - scaled.fees;
  return [
    `${scaled.label}. Der normale Hedge lässt ${fmtUsd(unused)} Puffer liegen.`,
    `Dreh die Long auf ${fmtUsd(scaled.fundedNotional)}, bis 150 USD Preis-Puffer übrig sind.`,
    `Bei jedem Fail: ${fmtUsd(cashBeforeFee, true)} vor Fee, Fee ${fmtUsd(scaled.fees)}, danach ${fmtUsd(afterFee, true)}.`,
  ].join("\n");
}

function bridgeCopy(advice: Advice): string {
  const plan = advice.bridge;
  if (!plan) return advice.bridgeReason;
  const longs = plan.allocations
    .map((leg) => `${formatK(leg.size)} ${fmtUsd(leg.notional)} (${leg.leverage.toFixed(2)}×)`)
    .join(", ");
  return [`${advice.bridgeReason}`, `Long parallel: ${longs}.`, `Kosten ${fmtUsd(plan.cost)}, Rest nach dem Pass ${fmtUsd(plan.rest)}.`].join("\n");
}

function attackCopy(advice: Advice, discountPct: number): string {
  const attack = advice.attack;
  if (!attack) return "Ohne Funded-Konto gibt es keinen Voll-Angriff.";
  if (attack.fits) {
    return `Die Verdopplung ${attack.plan.label} ist bei ${discountPct}% Rabatt schon gebührensicher. Long ${fmtUsd(attack.plan.fundedNotional)}, Rest ${fmtUsd(attack.plan.rest)}.`;
  }
  const lines = [
    `${attack.classic.label} zum Listenpreis frisst den Puffer. Die Null-Größe wäre ${fmtUsd(attack.plan.fundedNotional)} und landet ${fmtUsd(attack.plan.rest)} unter null.`,
  ];
  if (attack.discountNeededPct != null) {
    const price = attack.plan.listCost * (1 - attack.discountNeededPct / 100);
    lines.push(`Ab ${attack.discountNeededPct}% Rabatt (${fmtUsd(price)}) wird dieselbe Verdopplung gebührensicher.`);
  } else {
    lines.push("Auch 20% Rabatt reichen nicht. Der Puffer ist für diese Verdopplung zu klein.");
  }
  if (attack.stopMovePct != null && attack.stopLossUsd != null && attack.evalGainPct != null) {
    lines.push(
      `Oder die klassische Long ${fmtUsd(attack.classic.fundedNotional)} aufmachen und im Funded bei −${attack.stopMovePct.toFixed(2)}% hart raus (${fmtUsd(attack.stopLossUsd)}). Die Evals stehen dann bei +${attack.evalGainPct.toFixed(2)}% und laufen mit Trailing-Stop weiter.`,
    );
  }
  return lines.join("\n");
}

function numberOr(value: string): number {
  const next = value === "" ? 0 : Number(value);
  return Number.isFinite(next) ? next : 0;
}

function sanitizeInventory(raw: unknown): Inventory {
  const fallback = PRESETS[0].inventory;
  if (!raw || typeof raw !== "object") return fallback;
  const src = raw as Partial<Inventory>;
  const accounts = Array.isArray(src.accounts)
    ? src.accounts
        .map((row, index) => {
          if (!row || typeof row !== "object") return null;
          const item = row as Partial<FundedSlot>;
          const size = EVAL_PRODUCTS.some((product) => product.size === item.size) ? item.size! : 10_000;
          const buffer = typeof item.buffer === "number" && Number.isFinite(item.buffer) ? Math.max(0, item.buffer) : size * 0.03;
          return { id: typeof item.id === "string" ? item.id : `a-${index}`, size, buffer };
        })
        .filter((row): row is FundedSlot => row != null)
    : fallback.accounts;
  return {
    cash: typeof src.cash === "number" && Number.isFinite(src.cash) ? Math.max(0, src.cash) : fallback.cash,
    discountPct:
      typeof src.discountPct === "number" && Number.isFinite(src.discountPct)
        ? Math.min(20, Math.max(0, src.discountPct))
        : 0,
    accounts,
  };
}
