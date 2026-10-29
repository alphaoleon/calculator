import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  IV_ROWS,
  SPOT_K,
  analyzePosition,
  contractBlurb,
  subjectLegs,
  type GreekPoint,
  type MatrixCell,
} from "@/lib/analytics";
import { useBook } from "@/lib/book-store";
import { cn } from "@/lib/cn";
import { fmtAxis, fmtIndex, fmtUsd } from "@/lib/format";
import { useMarket } from "@/lib/market-store";
import { bookId } from "@/lib/types";

type Horizon = "now" | "expiry";

const GREEKS = [
  {
    key: "delta" as const,
    title: "Delta",
    caption: "directional exposure · per $1 spot",
    color: "var(--color-long)",
    money: false,
  },
  {
    key: "gamma" as const,
    title: "Gamma",
    caption: "delta change · per $1 spot",
    color: "var(--color-accent)",
    money: false,
  },
  {
    key: "theta" as const,
    title: "Theta",
    caption: "time decay · per calendar day",
    color: "var(--color-short)",
    money: true,
  },
  {
    key: "vega" as const,
    title: "Vega",
    caption: "IV sensitivity · per 1% IV change",
    color: "var(--color-preview)",
    money: true,
  },
];

export function CalculatorPanel() {
  const currency = useBook((state) => state.currency);
  const settle = useBook((state) => state.settle);
  const legs = useBook((state) => state.books[bookId(currency, settle)]);
  const preview = useBook((state) => state.preview);
  const index = useMarket((state) => state.index);
  const quotes = useMarket((state) => state.quotes);
  const now = useMarket((state) => state.now);
  const dvol = useMarket((state) => state.dvol);
  const [horizon, setHorizon] = useState<Horizon>("now");
  const [scrub, setScrub] = useState<number | null>(null);

  const stats = useMemo(
    () => analyzePosition({ legs, preview, quotes, index, now, dvol }),
    [legs, preview, quotes, index, now, dvol],
  );
  const priced = subjectLegs(legs, preview);
  const linear = settle === "linear";
  const matrix = stats == null ? null : horizon === "now" ? stats.matrixNow : stats.matrixExpiry;

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 pt-3">
        <h2 className="text-sm font-semibold">Calculator</h2>
        <p className="text-xs text-muted">
          {priced.length > 0 ? contractBlurb(priced, linear, currency) : "Click a strike or add a leg"}
        </p>
      </div>

      {index <= 0 ? (
        <p className="px-3 py-6 text-sm text-muted">Waiting for the index…</p>
      ) : stats == null || matrix == null ? (
        <p className="px-3 py-6 text-sm text-muted">
          Select a strike or add a leg. This prices that position: payoff, scenarios, and greeks.
        </p>
      ) : (
        <div className="flex flex-col gap-3 p-3">
          <Returns stats={stats} currency={currency} />
          <Matrix
            stats={stats}
            matrix={matrix}
            horizon={horizon}
            onHorizon={setHorizon}
          />
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {GREEKS.map((card) => (
              <GreekCard
                key={card.key}
                title={card.title}
                caption={card.caption}
                color={card.color}
                money={card.money}
                points={stats.greeks}
                dataKey={card.key}
                index={stats.index}
                scrub={scrub}
                onScrub={setScrub}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Returns({
  stats,
  currency,
}: {
  stats: NonNullable<ReturnType<typeof analyzePosition>>;
  currency: string;
}) {
  const paid = Math.abs(stats.entryDebit);
  const debit = stats.entryDebit > 0.005;
  const credit = stats.entryDebit < -0.005;
  const riskText = stats.maxRisk == null ? "∞" : fmtUsd(stats.maxRisk);
  const returnText = stats.maxReturn == null ? "∞" : fmtUsd(stats.maxReturn);
  const ror =
    stats.maxReturn == null
      ? "∞"
      : stats.returnOnRisk == null
        ? "—"
        : `${stats.returnOnRisk > 0 ? "+" : ""}${Math.round(stats.returnOnRisk * 100)}%`;
  const days = stats.days < 10 ? stats.days.toFixed(1) : String(Math.round(stats.days));

  const cells = [
    {
      label: "Entry cost",
      value: fmtUsd(paid),
      hint: credit ? "credit" : debit ? "debit" : "no premium",
      tone: "text-fg",
    },
    {
      label: "Max risk",
      value: riskText,
      hint: stats.maxRisk == null ? "open wing" : "worst expiry",
      tone: stats.maxRisk == null ? "text-muted" : "text-short",
    },
    {
      label: "Max return",
      value: returnText,
      hint: stats.maxReturn == null ? "open wing" : "best expiry",
      tone: stats.maxReturn == null ? "text-muted" : "text-long",
    },
    {
      label: "Return on risk",
      value: ror,
      hint: "max return / max risk",
      tone: "text-fg",
    },
    {
      label: "Breakeven",
      value: stats.breakevens.length ? stats.breakevens.map((price) => fmtIndex(price)).join(" · ") : "—",
      hint: "expiry",
      tone: "text-fg",
    },
  ];

  return (
    <div>
      <h3 className="text-sm font-medium">Estimated returns</h3>
      <dl className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-5">
        {cells.map((cell) => (
          <div key={cell.label} className="min-w-0 rounded-xl bg-bg px-3 py-3">
            <dt className="text-xs text-muted">{cell.label}</dt>
            <dd className={cn("mt-1 truncate font-mono text-lg tabular-nums", cell.tone)}>{cell.value}</dd>
            <p className="truncate text-xs text-faint">{cell.hint}</p>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-faint">
        Computed as of {currency} @ {fmtIndex(stats.index)} · IV {stats.ivPct.toFixed(1)}% · σ over {days}d
      </p>
    </div>
  );
}

function Matrix({
  stats,
  matrix,
  horizon,
  onHorizon,
}: {
  stats: NonNullable<ReturnType<typeof analyzePosition>>;
  matrix: MatrixCell[][];
  horizon: Horizon;
  onHorizon: (horizon: Horizon) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Scenario matrix</h3>
          <p className="text-xs text-faint">
            σ = {stats.sigmaPct.toFixed(1)}% · 1σ = {fmtUsd(stats.sigmaUsd)} · % is return on max risk
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-bg p-1" role="tablist" aria-label="Scenario horizon">
          {(
            [
              ["now", "Now"],
              ["expiry", "At expiry"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={horizon === id}
              onClick={() => onHorizon(id)}
              className={cn(
                "press h-11 rounded-full px-3 text-sm",
                horizon === id ? "bg-fg text-bg" : "text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {horizon === "expiry" ? (
        <p className="mt-2 text-xs text-faint">At expiry every IV row is the same intrinsic payoff.</p>
      ) : null}
      <div className="mt-2 overflow-x-auto">
        <table className="matrix w-full text-center">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium text-muted">IV \ spot</th>
              {SPOT_K.map((k) => (
                <th key={k} className="px-1 py-1 text-xs font-medium text-muted">
                  <span className="block">{kLabel(k)}</span>
                  <span className="block font-mono text-faint">{moveLabel(k, stats.sigmaPct)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {IV_ROWS.map((shift, row) => (
              <tr key={shift}>
                <th className="px-2 py-1 text-left text-xs font-medium text-muted">{ivLabel(shift)}</th>
                {SPOT_K.map((k, col) => {
                  const cell = matrix[row]?.[col];
                  if (!cell) return <td key={k} />;
                  const current = shift === 0 && k === 0;
                  return (
                    <td
                      key={k}
                      title={cellTitle(cell)}
                      className="rounded-sm px-1 py-1.5"
                      style={{
                        background: wash(cell, stats.entryDebit, stats.sigmaUsd),
                        boxShadow: current ? "inset 0 0 0 1.5px var(--color-fg)" : undefined,
                      }}
                    >
                      <span className="block font-mono text-xs font-medium text-fg">
                        {cell.pct == null ? fmtUsd(cell.pnl, true) : fmtPct(cell.pct)}
                      </span>
                      {cell.pct != null ? (
                        <span className="block font-mono text-xs text-fg">{fmtUsd(cell.pnl, true)}</span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-faint">
        The framed cell is the live mark. Hover a cell for the full figure.
      </p>
    </div>
  );
}

function GreekCard({
  title,
  caption,
  color,
  money,
  points,
  dataKey,
  index,
  scrub,
  onScrub,
}: {
  title: string;
  caption: string;
  color: string;
  money: boolean;
  points: GreekPoint[];
  dataKey: "delta" | "gamma" | "theta" | "vega";
  index: number;
  scrub: number | null;
  onScrub: (price: number | null) => void;
}) {
  const at = nearestGreek(points, scrub ?? index);
  const shown = at ? at[dataKey] : 0;
  const text = money ? fmtUsd(shown, true) : fmtTiny(shown);
  return (
    <article className="rounded-xl bg-bg p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted">{title}</h3>
        <div className="text-right">
          <p className="font-mono text-sm tabular-nums" style={{ color }}>
            {text}
          </p>
          <p className="font-mono text-xs text-faint">{at ? fmtIndex(at.price) : "—"}</p>
        </div>
      </div>
      <div className="payoff h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            onMouseMove={(state) => {
              const point = state?.activePayload?.[0]?.payload as GreekPoint | undefined;
              if (point) onScrub(point.price);
            }}
            onMouseLeave={() => onScrub(null)}
          >
            <XAxis
              dataKey="price"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={[index]}
              interval={0}
              tickFormatter={fmtAxis}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={() => null} cursor={{ stroke: "var(--color-fg)" }} />
            <ReferenceLine x={index} stroke="var(--color-faint)" strokeDasharray="3 3" />
            {scrub != null ? <ReferenceLine x={scrub} stroke={color} /> : null}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.16}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, stroke: color, fill: "var(--color-bg)" }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-faint">{scrub == null ? caption : `At ${fmtIndex(scrub)}`}</p>
    </article>
  );
}

function nearestGreek(points: GreekPoint[], price: number): GreekPoint | null {
  if (!points.length || !(price > 0)) return points[0] ?? null;
  return points.reduce((best, point) =>
    Math.abs(point.price - price) < Math.abs(best.price - price) ? point : best,
  );
}

function wash(cell: MatrixCell, debit: number, sigmaUsd: number): string {
  const t =
    cell.pct != null
      ? Math.max(-1, Math.min(1, cell.pct / 100))
      : Math.max(-1, Math.min(1, cell.pnl / Math.max(Math.abs(debit), sigmaUsd * 0.25, 50)));
  const hue = t >= 0 ? "var(--color-long)" : "var(--color-short)";
  const amount = Math.round(Math.abs(t) * 58);
  return `color-mix(in srgb, ${hue} ${amount}%, var(--color-surface))`;
}

function cellTitle(cell: MatrixCell): string {
  const pct = cell.pct == null ? "risk unbounded" : fmtPct(cell.pct);
  return `${pct} · ${fmtUsd(cell.pnl, true)}`;
}

function fmtPct(pct: number): string {
  const rounded = Math.round(pct);
  if (rounded > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

function fmtTiny(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const digits = Math.abs(n) >= 0.01 ? 4 : 6;
  const body = Math.abs(n).toFixed(digits);
  return n < 0 ? `-${body}` : body;
}

function kLabel(k: number): string {
  if (k === 0) return "0";
  if (k === -0.5) return "−½σ";
  if (k === 0.5) return "+½σ";
  if (k === -1) return "−1σ";
  if (k === 1) return "+1σ";
  if (k === -2) return "−2σ";
  return "+2σ";
}

function moveLabel(k: number, sigmaPct: number): string {
  const pct = k * sigmaPct;
  if (Math.abs(pct) < 0.05) return "0";
  const body = Math.abs(pct).toFixed(1);
  return `${pct > 0 ? "+" : "−"}${body}%`;
}

function ivLabel(shift: number): string {
  if (shift === 0) return "base";
  return `${shift > 0 ? "+" : "−"}${Math.abs(shift)}v`;
}
