import { useMemo, useState, useSyncExternalStore } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Signed } from "@/components/ui";
import { useBook } from "@/lib/book-store";
import { fmtIndex, fmtUsd } from "@/lib/format";
import { buildDualBook, getLoopSettings, LOOP_FALLBACK, referenceEntry, subscribeLoop, withEntry, type DualPoint, type DualSeries } from "@/lib/hydra-loop";
import { useMarket } from "@/lib/market-store";
import type { PropAccount } from "@/lib/types";

export function HydraPayoff({
  percentMode,
  split = false,
  entry: entryProp,
  accounts: accountsProp,
}: {
  percentMode: boolean;
  split?: boolean;
  entry?: number;
  accounts?: PropAccount[];
}) {
  const currency = useBook((state) => state.currency);
  const stored = useBook((state) => state.props[currency]);
  const accounts = accountsProp ?? stored;
  const index = useMarket((state) => state.index);
  const [hover, setHover] = useState<DualPoint | null>(null);
  const settings = useSyncExternalStore(subscribeLoop, getLoopSettings, () => LOOP_FALLBACK);
  const fromBook = accounts.find((account) => account.entry > 0)?.entry;
  const entry = entryProp != null && entryProp > 0 ? entryProp : fromBook != null && fromBook > 0 ? fromBook : referenceEntry(percentMode, index, settings.entry);
  const rows = useMemo(() => accounts.map((account) => withEntry(account, entry)), [accounts, entry]);
  const book = useMemo(
    () => buildDualBook(rows, entry, settings.sl, settings.side),
    [rows, entry, settings.sl, settings.side],
  );
  const shown = hover ?? book.points.find((point) => Math.abs(point.move) < 0.04) ?? book.points[0];
  const floors = uniqueFloors(book.series);
  const legDomain = padded(
    book.points.flatMap((point) =>
      book.series.flatMap((series) => [point[series.solidKey], point[series.dashKey], point[series.dotKey]]),
    ).concat(floors),
  );
  const cashDomain = padded(book.points.flatMap((point) => [point.cash, point.cashUp, point.cashDn]));
  const cushionDomain = padded(book.points.map((point) => point.cushion));
  const scaleKey = `${book.series.map((series) => `${series.id}:${series.floor}`).join("|")}|${legDomain[0]}|${legDomain[1]}|${cashDomain[1]}|${cushionDomain[1]}`;
  const onMove = (state: { activePayload?: { payload?: DualPoint }[] }) => {
    const point = state?.activePayload?.[0]?.payload;
    if (point) setHover(point);
  };

  return (
    <section className={split ? "" : "px-3 py-3"}>
      {split ? null : (
      <div>
        <h2 className="text-sm font-semibold">Hydra-Payoff</h2>
        <p className="mt-1 max-w-3xl text-xs text-muted">
          Oben jede Linie für sich, unten die Summe. Eine tote Eval ist −Kosten. Bestehen zahlt nichts, es schaltet den neuen Puffer frei.
        </p>
      </div>
      )}
      {shown ? (
        <p className="mt-3 font-mono text-xs leading-6 tabular-nums sm:text-sm">
          {shown.move >= 0 ? "+" : ""}
          {shown.move.toFixed(2)}%
          {" · "}
          {fmtIndex(shown.price > 0 ? shown.price : entry * (1 + shown.move / 100))}
          {book.series.map((series) => {
            const value = legValue(shown, series);
            if (value == null) return null;
            return (
              <span key={series.id}>
                {" · "}
                <span style={{ color: series.color }}>{series.name}</span> {fmtUsd(value, true)}
              </span>
            );
          })}
          {" · "}
          <Signed value={shown.cash} text={`Netto-Cash ${fmtUsd(shown.cash, true)}`} />
          {" · "}
          Netto-Gesamtpuffer {fmtUsd(shown.cushion, true)}
          {shown.passed ? <span className="text-long"> · EVAL PASSED (Neuer Funded-Puffer freigeschaltet!)</span> : null}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">Noch keine Größen in der Tabelle.</p>
      )}

      <div className={split ? "mt-4 grid gap-4 lg:grid-cols-2" : ""}>
      <div className="mt-4">
        <h3 className="text-xs font-semibold">Einzel-Payoffs (Konten-Synchronisation)</h3>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {book.series.map((series) => (
            <span key={series.id} className="inline-flex items-center gap-1 text-xs text-muted">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: series.color }} />
              {series.name}
            </span>
          ))}
        </div>
        <div className="mt-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart key={scaleKey} data={book.points} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} syncId="hydra" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
              <CartesianGrid stroke="var(--color-line)" vertical={false} />
              <XAxis dataKey="move" type="number" domain={["dataMin", "dataMax"]} tickFormatter={pct} stroke="var(--color-faint)" fontSize={11} />
              <YAxis domain={legDomain} tickFormatter={(value: number) => fmtUsd(value)} stroke="var(--color-faint)" fontSize={11} width={72} />
              <Tooltip content={() => null} />
              <Guides failPct={book.failPct} passPct={book.passPct} hover={hover?.move ?? null} />
              {floors.map((floor) => (
                <ReferenceLine key={floor} y={floor} stroke="var(--color-short)" strokeDasharray="3 3" label={{ value: "Max DD", fill: "var(--color-short)", fontSize: 10, position: "insideBottomLeft" }} />
              ))}
              {book.series.map((series) => (
                <Line key={series.solidKey} type="linear" dataKey={series.solidKey} stroke={series.color} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
              ))}
              {book.series.map((series) => (
                <Line key={series.dashKey} type="linear" dataKey={series.dashKey} stroke={series.color} strokeDasharray="5 4" strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />
              ))}
              {book.series.map((series) => (
                <Line key={series.dotKey} type="linear" dataKey={series.dotKey} stroke="none" strokeWidth={0} dot={<PassDot />} connectNulls={false} isAnimationActive={false} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-semibold">Netto-Payoff-Diagramm (Gesamtbilanz unter dem Strich)</h3>
        <p className="mt-1 text-xs text-muted">Weiße Linie ist Cash nach Split und Kosten. Gold ist der Puffer, der beim Bestehen nach oben springt.</p>
        <div className="mt-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart key={`${scaleKey}-net`} data={book.points} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} syncId="hydra" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
              <CartesianGrid stroke="var(--color-line)" vertical={false} />
              <XAxis dataKey="move" type="number" domain={["dataMin", "dataMax"]} tickFormatter={pct} stroke="var(--color-faint)" fontSize={11} />
              <YAxis yAxisId="cash" domain={cashDomain} tickFormatter={(value: number) => fmtUsd(value)} stroke="var(--color-faint)" fontSize={11} width={72} />
              <YAxis yAxisId="cushion" orientation="right" domain={cushionDomain} tickFormatter={(value: number) => fmtUsd(value)} stroke="#eab308" fontSize={11} width={72} />
              <Tooltip content={() => null} />
              <Guides failPct={book.failPct} passPct={book.passPct} hover={hover?.move ?? null} />
              <ReferenceLine yAxisId="cash" y={0} stroke="var(--color-faint)" />
              <Area yAxisId="cash" type="linear" dataKey="cashUp" stroke="none" fill="var(--color-long)" fillOpacity={0.22} isAnimationActive={false} />
              <Area yAxisId="cash" type="linear" dataKey="cashDn" stroke="none" fill="var(--color-short)" fillOpacity={0.2} isAnimationActive={false} />
              <Line yAxisId="cash" type="linear" dataKey="cash" stroke="var(--color-fg)" strokeWidth={2.25} dot={false} isAnimationActive={false} />
              <Line yAxisId="cushion" type="stepAfter" dataKey="cushion" stroke="#eab308" strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>
    </section>
  );
}

function Guides({ failPct, passPct, hover }: { failPct: number; passPct: number | null; hover: number | null }) {
  return (
    <>
      <ReferenceLine x={0} stroke="var(--color-line)" label={{ value: "Entry", fill: "var(--color-faint)", fontSize: 10, position: "insideTopLeft" }} />
      <ReferenceLine x={failPct} stroke="var(--color-short)" strokeDasharray="4 4" label={{ value: "Eval-SL", fill: "var(--color-short)", fontSize: 10, position: "insideTopRight" }} />
      {passPct != null ? (
        <ReferenceLine x={passPct} stroke="var(--color-long)" strokeDasharray="4 4" label={{ value: "Eval-Pass", fill: "var(--color-long)", fontSize: 10, position: "insideTopLeft" }} />
      ) : null}
      {hover != null ? <ReferenceLine x={hover} stroke="var(--color-accent)" /> : null}
    </>
  );
}

function PassDot(props: { cx?: number; cy?: number; value?: number | null }) {
  if (props.value == null || props.cx == null || props.cy == null) return null;
  return <circle cx={props.cx} cy={props.cy} r={5} fill="var(--color-long)" />;
}

function pct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function legValue(point: DualPoint, series: DualSeries): number | null {
  const solid = point[series.solidKey];
  const dash = point[series.dashKey];
  if (typeof solid === "number") return solid;
  if (typeof dash === "number") return dash;
  return null;
}

function padded(values: Array<number | boolean | null | undefined>): [number, number] {
  let lo = 0;
  let hi = 0;
  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    lo = Math.min(lo, value);
    hi = Math.max(hi, value);
  }
  if (hi - lo < 1) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.08;
  return [Math.round(lo - pad), Math.round(hi + pad)];
}

function uniqueFloors(series: DualSeries[]): number[] {
  const floors = series.filter((row) => row.kind === "funded" && row.floor < 0).map((row) => Math.round(row.floor * 100) / 100);
  return [...new Set(floors)];
}
