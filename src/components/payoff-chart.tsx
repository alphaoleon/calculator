import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBook } from "@/lib/book-store";
import { fmtAxis, fmtCoin, fmtGreek, fmtIndex, fmtUsd } from "@/lib/format";
import { useMarket } from "@/lib/market-store";
import { buildCurve, maxForwardDays, metricValue, propLevels, propPnlAt, solveCrossings, valueBook, type CurvePoint } from "@/lib/pricing";
import { bookId, type Metric, type Unit } from "@/lib/types";
import { Button, Signed } from "@/components/ui";
import { cn } from "@/lib/cn";

const METRICS: { id: Metric; label: string }[] = [
  { id: "pnl", label: "P&L" },
  { id: "delta", label: "Delta" },
  { id: "gamma", label: "Gamma" },
  { id: "vega", label: "Vega" },
  { id: "theta", label: "Theta" },
];

const SPANS = [
  { id: 0.18, label: "Tight" },
  { id: 0.35, label: "Base" },
  { id: 0.6, label: "Wide" },
];

export function PayoffChart() {
  const currency = useBook((state) => state.currency);
  const settle = useBook((state) => state.settle);
  const legs = useBook((state) => state.books[bookId(currency, settle)]);
  const props = useBook((state) => state.props[currency]);
  const metric = useBook((state) => state.metric);
  const unit = useBook((state) => state.unit);
  const span = useBook((state) => state.span);
  const ivShift = useBook((state) => state.ivShift);
  const daysForward = useBook((state) => state.daysForward);
  const setMetric = useBook((state) => state.setMetric);
  const setUnit = useBook((state) => state.setUnit);
  const setSpan = useBook((state) => state.setSpan);
  const setIvShift = useBook((state) => state.setIvShift);
  const setDays = useBook((state) => state.setDaysForward);
  const resetScenario = useBook((state) => state.resetScenario);
  const index = useMarket((state) => state.index);
  const quotes = useMarket((state) => state.quotes);
  const now = useMarket((state) => state.now);
  const preview = useBook((state) => state.preview);
  const plottedLegs = legs.length > 0 ? legs : preview ? [preview] : [];
  const overlay =
    legs.length > 0 && preview && !legs.some((leg) => leg.instrument === preview.instrument)
      ? preview
      : null;
  const [hover, setHover] = useState<CurvePoint | null>(null);

  const maxDays = maxForwardDays(plottedLegs, now);
  const earlyDays = maxDays >= 0.2 ? maxDays / 3 : 0;
  const lateDays = maxDays >= 0.2 ? (maxDays * 2) / 3 : 0;
  const activeProps = useMemo(
    () => props.filter((account) => account.enabled && account.size !== 0),
    [props],
  );
  const markers = useMemo(
    () =>
      metric === "pnl"
        ? activeProps.flatMap((account) => {
            const levels = propLevels(account);
            return [
              levels.daily != null
                ? { id: `${account.id}-day`, price: levels.daily, kind: "day" as const, name: account.name }
                : null,
              levels.maxDd != null
                ? { id: `${account.id}-max`, price: levels.maxDd, kind: "max" as const, name: account.name }
                : null,
              levels.pass != null
                ? { id: `${account.id}-pass`, price: levels.pass, kind: "pass" as const, name: account.name }
                : null,
            ].filter((row) => row != null);
          })
        : [],
    [activeProps, metric],
  );
  const roots = useMemo(() => {
    const empty = { option: [] as number[], net: [] as number[] };
    if (metric !== "pnl" || !(index > 0) || (plottedLegs.length === 0 && activeProps.length === 0)) return empty;
    let lo = index * 0.2;
    let hi = index * 2.6;
    const pins: number[] = [];
    for (const leg of plottedLegs) {
      if (!(leg.strike && leg.strike > 0)) continue;
      pins.push(leg.strike);
      lo = Math.min(lo, leg.strike * 0.55);
      hi = Math.max(hi, leg.strike * 1.45);
    }
    for (const account of activeProps) {
      const levels = propLevels(account);
      for (const price of [levels.daily, levels.maxDd, levels.breach, levels.pass]) {
        if (price != null && price > 0) pins.push(price);
      }
    }
    lo = Math.max(lo, index * 0.05);
    const optionAt = (price: number) =>
      metricValue(
        valueBook(plottedLegs, {
          indexNow: index,
          indexSim: price,
          now,
          quotes,
          daysForward: 0,
          ivShift: 0,
          atExpiry: true,
        }).totals,
        "pnl",
        unit,
      );
    const netAt = (price: number) => {
      const propUsd = activeProps.reduce((sum, account) => sum + propPnlAt(account, price), 0);
      return optionAt(price) + (unit === "usd" ? propUsd : propUsd / price);
    };
    return {
      option: plottedLegs.length > 0 ? solveCrossings(lo, hi, optionAt, pins) : [],
      net: solveCrossings(lo, hi, netAt, pins),
    };
  }, [metric, index, plottedLegs, activeProps, now, quotes, unit]);
  const points = useMemo(
    () =>
      buildCurve({
        legs: plottedLegs,
        quotes,
        indexNow: index,
        now,
        daysForward,
        ivShift,
        metric,
        unit,
        span,
        anchors: markers.map((marker) => marker.price),
        samples: [...roots.option, ...roots.net],
        props: activeProps,
        preview: overlay,
        earlyDays,
        lateDays,
      }),
    [plottedLegs, quotes, index, now, daysForward, ivShift, metric, unit, span, activeProps, markers, overlay, earlyDays, lateDays, roots],
  );
  const yDomain = useMemo((): [number, number] => {
    let min = 0;
    let max = 0;
    const fitProp = plottedLegs.length === 0;
    for (const point of points) {
      const values = [point.sim, point.expiry];
      if (fitProp && point.prop != null) values.push(point.prop);
      if (point.early != null) values.push(point.early);
      if (point.late != null) values.push(point.late);
      for (const value of values) {
        if (!Number.isFinite(value)) continue;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
    const pad = Math.max((max - min) * 0.06, 1);
    return [min - pad, max + pad];
  }, [points, plottedLegs.length]);
  const propOnOwnAxis = plottedLegs.length > 0 && markers.length > 0;
  const propDomain = useMemo((): [number, number] => {
    let min = 0;
    let max = 0;
    for (const point of points) {
      if (point.prop == null || !Number.isFinite(point.prop)) continue;
      min = Math.min(min, point.prop);
      max = Math.max(max, point.prop);
    }
    const pad = Math.max((max - min) * 0.06, 1);
    return [min - pad, max + pad];
  }, [points]);

  const spot = useMemo(() => nearestPoint(points, index), [points, index]);
  const shown = hover ?? spot;
  const move = shown && index > 0 ? (shown.price / index - 1) * 100 : null;
  const strikes = plottedLegs.filter((leg) => leg.strike).slice(0, 8);
  const zeros = roots.option;
  const netZeros = roots.net;
  const plotted = useMemo(
    () =>
      points.map((point) => ({
        ...point,
        expUp: point.expiry > 0 ? point.expiry : 0,
        expDn: point.expiry < 0 ? point.expiry : 0,
        propUp: point.prop != null && point.prop > 0 ? point.prop : 0,
        propDn: point.prop != null && point.prop < 0 ? point.prop : 0,
        netUp: point.net != null && point.net > 0 ? point.net : 0,
        netDn: point.net != null && point.net < 0 ? point.net : 0,
      })),
    [points],
  );
  const netDomain = useMemo((): [number, number] => {
    let min = 0;
    let max = 0;
    for (const point of points) {
      if (point.net == null || !Number.isFinite(point.net)) continue;
      min = Math.min(min, point.net);
      max = Math.max(max, point.net);
    }
    const pad = Math.max((max - min) * 0.08, 1);
    return [min - pad, max + pad];
  }, [points]);

  return (
    <section className="flex flex-col">
      <div className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted">
            <span className="sr-only">Chart metric</span>
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value as Metric)}
              className="h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg"
              aria-label="Chart metric"
            >
              {METRICS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {metric === "pnl" ? (
            <div className="grid grid-cols-2 gap-1 rounded-full bg-bg p-1">
              {(["usd", "coin"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setUnit(item)}
                  className={cn(
                    "h-9 rounded-full px-3 text-sm",
                    unit === item ? "bg-fg text-bg" : "text-muted",
                  )}
                >
                  {item === "usd" ? (settle === "linear" ? "USDC" : "USD") : currency}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">{metricHint(metric, currency, settle === "linear")}</p>
          )}
          <div className="ml-auto flex flex-wrap gap-1">
            {SPANS.map((item) => (
              <Button
                key={item.id}
                tone={span === item.id ? "accent" : "ghost"}
                className="h-9"
                onClick={() => setSpan(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <Slider
          label="IV shift"
          value={ivShift}
          min={-40}
          max={40}
          step={0.5}
          display={`${ivShift > 0 ? "+" : ""}${ivShift.toFixed(1)} vol`}
          onChange={setIvShift}
        />
        <Slider
          label="Time"
          value={Math.min(daysForward, maxDays || 0)}
          min={0}
          max={Math.max(maxDays, 0.01)}
          step={maxDays > 14 ? 0.25 : 0.05}
          display={maxDays > 0 ? `${Math.min(daysForward, maxDays).toFixed(1)}d forward` : "No dated legs"}
          disabled={maxDays <= 0}
          onChange={setDays}
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {plottedLegs.length > 0 ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="inline-block h-0.5 w-6 bg-long" />
              Now
            </span>
          ) : null}
          {plottedLegs.length > 0 ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="inline-block w-6 border-t border-dashed border-short" />
              Expiry
            </span>
          ) : null}
          {earlyDays > 0 ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="swatch-early inline-block h-0.5 w-6" />
              {fmtHorizon(earlyDays)}
            </span>
          ) : null}
          {lateDays > 0 ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="swatch-late inline-block h-0.5 w-6" />
              {fmtHorizon(lateDays)}
            </span>
          ) : null}
          {markers.length > 0 ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="inline-block h-0.5 w-6 bg-accent" />
              Prop
            </span>
          ) : null}
          {overlay ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="inline-block h-0.5 w-6 bg-preview" />
              Selected
            </span>
          ) : null}
          {markers.some((marker) => marker.kind === "day") ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="inline-block h-3 border-l border-dashed border-preview" />
              Daily
            </span>
          ) : null}
          {markers.some((marker) => marker.kind === "max") ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="inline-block h-3 border-l border-dashed border-short" />
              Max DD
            </span>
          ) : null}
          {markers.some((marker) => marker.kind === "pass") ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="inline-block h-3 border-l border-dashed border-long" />
              Pass
            </span>
          ) : null}
          {shown ? (
            <>
              <span className="font-mono text-muted tabular-nums">
                At {fmtIndex(shown.price)}
                {move != null ? (
                  <>
                    {" · "}
                    <span className={moveClass(move)}>{fmtMove(move)}</span>
                  </>
                ) : null}
              </span>
              <Signed value={shown.sim} text={`Now ${formatY(shown.sim, metric, unit)}`} />
              <Signed value={shown.expiry} text={`Expiry ${formatY(shown.expiry, metric, unit)}`} />
              {shown.early != null && earlyDays > 0 ? (
                <Signed value={shown.early} text={`${fmtHorizon(earlyDays)} ${formatY(shown.early, metric, unit)}`} />
              ) : null}
              {shown.late != null && lateDays > 0 ? (
                <Signed value={shown.late} text={`${fmtHorizon(lateDays)} ${formatY(shown.late, metric, unit)}`} />
              ) : null}
              {shown.prop != null ? (
                <Signed value={shown.prop} text={`Prop ${formatY(shown.prop, "pnl", unit)}`} />
              ) : null}
              {shown.preview != null && overlay ? (
                <Signed value={shown.preview} text={`Selected ${formatY(shown.preview, metric, unit)}`} />
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            onClick={resetScenario}
            className="ml-auto text-sm text-accent"
          >
            Reset sliders
          </button>
        </div>
        {zeros.length > 0 ? (
          <p className="font-mono text-xs text-muted">
            Option breakeven {zeros.map((price) => beLabel(price, index)).join(" · ")}
          </p>
        ) : null}
      </div>

      <div className="payoff relative mx-3 mb-3 h-72 overflow-hidden rounded-xl bg-bg sm:h-80 lg:h-96">
        {index <= 0 || points.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted">
            Waiting for an index…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={plotted}
              margin={{ top: 8, right: propOnOwnAxis ? 4 : 12, left: 0, bottom: 4 }}
              onMouseMove={(state) => {
                const point = state?.activePayload?.[0]?.payload as CurvePoint | undefined;
                if (point) setHover(point);
              }}
              onMouseLeave={() => setHover(null)}
            >
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis
                dataKey="price"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="linear"
                tickFormatter={fmtAxis}
                tickCount={6}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="book"
                tickFormatter={(value: number) => formatY(value, metric, unit)}
                width={72}
                axisLine={false}
                tickLine={false}
                domain={yDomain}
                allowDataOverflow
              />
              {propOnOwnAxis ? (
                <YAxis
                  yAxisId="prop"
                  orientation="right"
                  tickFormatter={(value: number) => formatY(value, "pnl", unit)}
                  width={68}
                  axisLine={false}
                  tickLine={false}
                  domain={propDomain}
                />
              ) : null}
              <Tooltip content={() => null} cursor={{ stroke: "var(--color-faint)" }} />
              <ReferenceLine yAxisId="book" y={0} stroke="var(--color-faint)" />
              {index > 0 ? (
                <ReferenceLine
                  yAxisId="book"
                  x={index}
                  stroke="var(--color-accent)"
                  strokeDasharray="3 3"
                  label={{
                    value: "Spot",
                    fill: "var(--color-accent)",
                    fontSize: 11,
                    position: "insideTopRight",
                  }}
                />
              ) : null}
              {strikes.map((leg) => (
                <ReferenceLine
                  yAxisId="book"
                  key={leg.instrument}
                  x={leg.strike}
                  stroke="var(--color-line)"
                />
              ))}
              {markers.map((marker) => {
                const ink = markerInk(marker.kind);
                return (
                  <ReferenceLine
                    yAxisId="book"
                    key={marker.id}
                    x={marker.price}
                    stroke={ink.stroke}
                    strokeDasharray="2 3"
                    label={{
                      value: ink.label,
                      fill: ink.stroke,
                      fontSize: 11,
                      position: "insideTop",
                    }}
                  />
                );
              })}
              {metric === "pnl" && plottedLegs.length > 0
                ? zeros.filter((price) => inWindow(points, price)).map((price) => (
                    <ReferenceLine
                      yAxisId="book"
                      key={`be-${price}`}
                      x={price}
                      stroke="var(--color-fg)"
                      strokeDasharray="2 3"
                      label={{
                        value: "B.E.",
                        fill: "var(--color-fg)",
                        fontSize: 11,
                        position: "insideBottomRight",
                      }}
                    />
                  ))
                : null}
              {metric === "pnl" && plottedLegs.length > 0 ? (
                <Area
                  yAxisId="book"
                  type="linear"
                  dataKey="expUp"
                  stroke="none"
                  fill="var(--color-long)"
                  fillOpacity={0.18}
                  baseValue={0}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ) : null}
              {metric === "pnl" && plottedLegs.length > 0 ? (
                <Area
                  yAxisId="book"
                  type="linear"
                  dataKey="expDn"
                  stroke="none"
                  fill="var(--color-short)"
                  fillOpacity={0.18}
                  baseValue={0}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ) : null}
              {metric === "pnl" && markers.length > 0 && !propOnOwnAxis ? (
                <Area
                  yAxisId="book"
                  type="linear"
                  dataKey="propUp"
                  stroke="none"
                  fill="var(--color-long)"
                  fillOpacity={0.18}
                  baseValue={0}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ) : null}
              {metric === "pnl" && markers.length > 0 && !propOnOwnAxis ? (
                <Area
                  yAxisId="book"
                  type="linear"
                  dataKey="propDn"
                  stroke="none"
                  fill="var(--color-short)"
                  fillOpacity={0.18}
                  baseValue={0}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ) : null}
              {plottedLegs.length > 0 ? (
                <Line
                  yAxisId="book"
                  type="linear"
                  dataKey="expiry"
                  stroke="var(--color-short)"
                  strokeDasharray="5 4"
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              ) : null}
              {earlyDays > 0 ? (
                <Line
                  yAxisId="book"
                  type="monotone"
                  dataKey="early"
                  stroke="color-mix(in srgb, var(--color-fg) 42%, transparent)"
                  dot={false}
                  strokeWidth={1.25}
                  isAnimationActive={false}
                  connectNulls
                />
              ) : null}
              {lateDays > 0 ? (
                <Line
                  yAxisId="book"
                  type="monotone"
                  dataKey="late"
                  stroke="color-mix(in srgb, var(--color-fg) 72%, transparent)"
                  dot={false}
                  strokeWidth={1.25}
                  isAnimationActive={false}
                  connectNulls
                />
              ) : null}
              {plottedLegs.length > 0 ? (
                <Line
                  yAxisId="book"
                  type="monotone"
                  dataKey="sim"
                  stroke="var(--color-long)"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              ) : null}
              {markers.length > 0 ? (
                <Line
                  yAxisId={propOnOwnAxis ? "prop" : "book"}
                  type="linear"
                  dataKey="prop"
                  stroke="var(--color-accent)"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                  connectNulls
                />
              ) : null}
              {overlay ? (
                <Line
                  yAxisId="book"
                  type="linear"
                  dataKey="preview"
                  stroke="var(--color-preview)"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                  connectNulls
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        )}
        {index > 0 && plottedLegs.length === 0 && markers.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <p className="rounded-xl bg-raised px-4 py-3 text-center text-sm text-muted">
              Add a leg or load a template to plot the payoff.
            </p>
          </div>
        ) : null}
      </div>

      {metric === "pnl" && index > 0 && points.length > 0 && (plottedLegs.length > 0 || activeProps.length > 0) ? (
        <div className="border-t border-line px-3 pb-3 pt-3">
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <h3 className="text-sm font-semibold">Net payoff</h3>
            <span className="text-xs text-muted">Option expiry plus checked prop accounts, one scale</span>
            {netZeros.length > 0 ? (
              <span className="font-mono text-xs text-muted">
                Net breakeven {netZeros.map((price) => beLabel(price, index)).join(" · ")}
              </span>
            ) : (
              <span className="text-xs text-muted">No zero inside the window</span>
            )}
            {shown?.net != null ? (
              <Signed value={shown.net} text={`Net ${formatY(shown.net, "pnl", unit)}`} />
            ) : null}
          </div>
          <div className="payoff relative h-56 overflow-hidden rounded-xl bg-bg sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={plotted}
                margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                onMouseMove={(state) => {
                  const point = state?.activePayload?.[0]?.payload as CurvePoint | undefined;
                  if (point) setHover(point);
                }}
                onMouseLeave={() => setHover(null)}
              >
                <CartesianGrid vertical={false} stroke="var(--color-line)" />
                <XAxis
                  dataKey="price"
                  type="number"
                  scale="linear"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={fmtAxis}
                  tickCount={6}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value: number) => formatY(value, "pnl", unit)}
                  width={72}
                  axisLine={false}
                  tickLine={false}
                  domain={netDomain}
                  allowDataOverflow
                />
                <Tooltip content={() => null} cursor={{ stroke: "var(--color-faint)" }} />
                <ReferenceLine y={0} stroke="var(--color-faint)" />
                {index > 0 ? (
                  <ReferenceLine x={index} stroke="var(--color-accent)" strokeDasharray="3 3" />
                ) : null}
                {strikes.map((leg) => (
                  <ReferenceLine key={`net-${leg.instrument}`} x={leg.strike} stroke="var(--color-line)" />
                ))}
                {markers.map((marker) => (
                  <ReferenceLine
                    key={`net-${marker.id}`}
                    x={marker.price}
                    stroke={markerInk(marker.kind).stroke}
                    strokeDasharray="2 3"
                  />
                ))}
                {netZeros.filter((price) => inWindow(points, price)).map((price) => (
                  <ReferenceLine
                    key={`net-be-${price}`}
                    x={price}
                    stroke="var(--color-fg)"
                    strokeDasharray="2 3"
                    label={{
                      value: "B.E.",
                      fill: "var(--color-fg)",
                      fontSize: 11,
                      position: "insideTopRight",
                    }}
                  />
                ))}
                <Area
                  type="linear"
                  dataKey="netUp"
                  stroke="none"
                  fill="var(--color-long)"
                  fillOpacity={0.2}
                  baseValue={0}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="linear"
                  dataKey="netDn"
                  stroke="none"
                  fill="var(--color-short)"
                  fillOpacity={0.2}
                  baseValue={0}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="net"
                  stroke="var(--color-fg)"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <details className="border-t border-line px-3 py-2 text-xs text-muted">
        <summary>Model</summary>
        <p className="pt-2 leading-relaxed">
          Inverse and USDC contracts, same shape as the Deribit position builder. Option premium is
          Black-76 on the listed forward divided by that forward, so marks and greeks line up
          with the exchange. A short call is flat at the premium until the strike, then falls —
          the corner sits on the strike. On an inverse contract the USD value of that coin premium
          still rises with the index, so the left side is not perfectly flat. The amber line is the
          strike selected in the ticket, priced as a buy at that size. It is not in the book until
          you press Buy or Sell, and it does not rescale the booked position. Checked prop accounts
          add their own payoff: your split of the coin move from entry. Daily DD and max DD are
          equity floors. Touching the nearer one ends the account and the line becomes the fee.
          A challenge locks at the profit target. A funded account does not — the split keeps
          going. With an option book on the chart, that prop payoff uses the right axis so the
          option shape stays readable. The solid curve reprices at the IV shift and the time slider. The green and red fill is
          the expiry payoff above and below zero. The faint lines are one third and two thirds of
          the way to the longest expiry, at the same IV shift. The dashed curve is intrinsic, with
          futures converged to the index. Option breakeven is the solved index where that expiry P&L is zero, not the strike. On an inverse contract that price is strike / (1 − coin premium) for a call, which is not strike plus the dollar premium. The net chart under it adds the checked prop accounts on the same scale, and its breakeven is where the sum is zero. USD P&L
          converts coin P&L at the scenario index. Funding is not included. Initial and
          maintenance margin are a flat standard-margin estimate, not portfolio margin.
        </p>
      </details>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-xs text-muted">
      <span className="w-16 shrink-0">{label}</span>
      <input
        className="min-w-0 flex-1"
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="w-28 shrink-0 text-right font-mono text-fg tabular-nums">{display}</span>
    </label>
  );
}

function markerInk(kind: "day" | "max" | "pass"): { stroke: string; label: string } {
  if (kind === "day") return { stroke: "var(--color-preview)", label: "Day" };
  if (kind === "max") return { stroke: "var(--color-short)", label: "Max" };
  return { stroke: "var(--color-long)", label: "Pass" };
}

function beLabel(price: number, index: number): string {
  if (!(index > 0)) return fmtIndex(price);
  const pct = (price / index - 1) * 100;
  return `${fmtIndex(price)} (${fmtMove(pct)})`;
}

function inWindow(points: CurvePoint[], price: number): boolean {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return false;
  return price >= first.price && price <= last.price;
}

function fmtMove(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function moveClass(pct: number): string {
  if (pct > 0.005) return "text-long";
  if (pct < -0.005) return "text-short";
  return "text-fg";
}

function fmtHorizon(days: number): string {
  if (days < 1) return `${Math.max(1, Math.round(days * 24))}h`;
  if (days < 10) return `${days.toFixed(1)}d`;
  return `${Math.round(days)}d`;
}

function nearestPoint(points: CurvePoint[], price: number): CurvePoint | null {
  if (!points.length || !(price > 0)) return points[0] ?? null;
  return points.reduce((best, point) =>
    Math.abs(point.price - price) < Math.abs(best.price - price) ? point : best,
  );
}

function formatY(value: number, metric: Metric, unit: Unit): string {
  if (metric === "pnl") return unit === "usd" ? fmtUsd(value, true) : fmtCoin(value, true);
  if (metric === "vega" || metric === "theta") return fmtUsd(value, true);
  return fmtGreek(value, true);
}

function metricHint(metric: Metric, currency: string, linear: boolean): string {
  if (metric === "delta") return `Coin delta (${currency})`;
  if (metric === "gamma") return "Gamma per $1";
  if (metric === "vega") return linear ? "USDC per 1 vol point" : "USD per 1 vol point";
  return linear ? "USDC per day" : "USD per day";
}
