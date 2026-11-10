import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  barriers,
  bookGreeks,
  passed,
  rollLevel,
  sampleOptions,
  toUnit,
  type OptLeg,
  type PropSetup,
  type Sample,
} from "@/lib/options-sim";

export type SeriesKey = "current" | "expiry" | "payout" | "prop" | "dd" | "pass";

export type SeriesToggles = Record<SeriesKey, boolean>;

type View = { lo: number; hi: number };

const FALLBACK: View = { lo: -0.08, hi: 0.12 };

function fitView(setup: PropSetup): View {
  const index = setup.index > 0 ? setup.index : 1;
  const bars = barriers(setup);
  const left = bars.dd != null && bars.dd > 0 ? bars.dd : index * 0.97;
  const right = bars.pass != null && bars.pass > 0 ? bars.pass : index * 1.08;
  const loPrice = Math.min(left, right) * 0.96;
  const hiPrice = Math.max(left, right) * 1.04;
  return clampView({ lo: loPrice / index - 1, hi: hiPrice / index - 1 });
}

type Hover = { price: number; x: number; y: number };

export function OptionsChart({
  setup,
  legs,
  elapsed,
  volShift,
  rateShift,
  series,
  liveIndex,
  onToggle,
}: {
  setup: PropSetup;
  legs: OptLeg[];
  elapsed: number;
  volShift: number;
  rateShift: number;
  series: SeriesToggles;
  liveIndex: number;
  onToggle: (key: SeriesKey) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geo = useRef({ padL: 72, plotW: 1, min: 1, max: 2, width: 1, height: 1 });
  const [view, setView] = useState<View>(() => fitView(setup));
  const [hover, setHover] = useState<Hover | null>(null);
  const drag = useRef<{ x: number; lo: number; hi: number } | null>(null);
  const drawRef = useRef({ setup, samples: [] as Sample[], series, view, hoverPrice: null as number | null, liveIndex });
  const index = setup.index > 0 ? setup.index : 1;
  const span = Math.max(0.02, view.hi - view.lo);
  const min = index * (1 + view.lo);
  const max = index * (1 + view.hi);

  const samples = useMemo(() => {
    const bars = barriers(setup);
    const roll = rollLevel(setup);
    const marks = [index, bars.dd ?? 0, bars.pass ?? 0, roll ?? 0].filter((price) => price > 0);
    return sampleOptions(legs, index, elapsed, volShift, rateShift, Math.max(0.01, min), Math.max(min + index * 0.002, max), 181, marks);
  }, [setup, legs, index, elapsed, volShift, rateShift, min, max]);

  drawRef.current = { setup, samples, series, view, hoverPrice: hover?.price ?? null, liveIndex };

  useEffect(() => {
    let frame = 0;
    let hiddenTimer = 0;
    const loop = () => {
      if (typeof document !== "undefined" && document.hidden) {
        hiddenTimer = window.setTimeout(loop, 400);
        return;
      }
      const canvas = canvasRef.current;
      if (canvas) paint(canvas, { ...drawRef.current, now: performance.now(), geo });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(hiddenTimer);
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) paint(canvas, { ...drawRef.current, now: performance.now(), geo });
    };
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(draw);
    });
    observer.observe(el);
    requestAnimationFrame(() => requestAnimationFrame(draw));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const g = geo.current;
      const rect = el.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (event.clientX - rect.left - g.padL) / g.plotW));
      setView((prev) => zoomView(prev, t, event.deltaY > 0 ? 1.12 : 1 / 1.12));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const priceAt = (clientX: number) => {
    const el = wrapRef.current;
    const g = geo.current;
    if (!el) return index;
    const rect = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - rect.left - g.padL) / g.plotW));
    return g.min + t * (g.max - g.min);
  };

  const nearest = hover ? nearestSample(samples, hover.price) : null;
  const deltaNow = nearest ? bookGreeks(legs, nearest.price, elapsed, volShift, rateShift).delta : 0;
  const fee = Math.max(0, setup.fee);
  const funded = nearest && series.payout && passed(setup, nearest.price) ? Math.max(0, setup.payout) : 0;
  const tip = nearest
    ? {
      expiry: toUnit(nearest.expiry - fee, setup),
      current: toUnit(nearest.now - fee, setup),
      prop: funded > 0
        ? `Prop ${fmtDollar(toUnit(-fee, setup))} + Payout ${fmtDollar(toUnit(funded, setup))}`
        : `Prop ${fmtDollar(toUnit(-fee, setup))}`,
    }
    : null;

  return (
    <div>
      <div className="mt-2 flex h-7 items-center overflow-hidden whitespace-nowrap rounded border border-line bg-bg px-2 font-mono text-[11px] text-muted">
        {tip && nearest ? (
          <>
            <span>Kurs {fmtPx(nearest.price)}</span>
            <Sep />
            <span style={{ color: "var(--color-expiry)" }}>Expiry {fmtDollar(tip.expiry)}</span>
            <Sep />
            <span className="text-long">Current {fmtDollar(tip.current)}</span>
            <Sep />
            <span style={{ color: "var(--color-roll)" }}>{tip.prop}</span>
            <Sep />
            <span>Δ {fmtDeltaCoins(deltaNow, setup.asset)}</span>
          </>
        ) : (
          <span className="text-faint">Hover: Kurs · Expiry PnL · Current PnL · Prop Fee / Payout · Netto-Delta</span>
        )}
      </div>
      <div
        ref={wrapRef}
        className="relative h-80 touch-none select-none sm:h-[28rem]"
        onDoubleClick={() => {
          setView(fitView(setup));
          setHover(null);
        }}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-crosshair"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, lo: view.lo, hi: view.hi };
          }}
          onPointerMove={(event) => {
            const rect = wrapRef.current?.getBoundingClientRect();
            const price = priceAt(event.clientX);
            setHover(rect ? { price, x: event.clientX - rect.left, y: event.clientY - rect.top } : null);
            const start = drag.current;
            if (!start || !(geo.current.plotW > 0)) return;
            const shift = (-(event.clientX - start.x) / geo.current.plotW) * (start.hi - start.lo);
            setView(clampView({ lo: start.lo + shift, hi: start.hi + shift }));
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerLeave={() => {
            if (!drag.current) setHover(null);
          }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <LegendChip on={series.current} color="var(--color-long)" label="Current" onClick={() => onToggle("current")} />
          <LegendChip on={series.expiry} color="var(--color-expiry)" label="Expiry" onClick={() => onToggle("expiry")} />
          <LegendChip on={series.payout} color="var(--color-roll)" label="Payout" onClick={() => onToggle("payout")} />
          <LegendChip on={series.prop} color="var(--color-preview)" label="Prop" onClick={() => onToggle("prop")} />
          <LegendChip on={series.dd} color="var(--color-short)" label="DD barrier" onClick={() => onToggle("dd")} />
          <LegendChip on={series.pass} color="var(--color-long)" label="Pass" onClick={() => onToggle("pass")} />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="h-9 rounded-full bg-raised px-3 text-xs" onClick={() => setView((prev) => zoomView(prev, 0.5, 1 / 1.15))}>+</button>
          <button type="button" className="h-9 rounded-full bg-raised px-3 text-xs" onClick={() => setView((prev) => zoomView(prev, 0.5, 1.15))}>−</button>
          <button type="button" className="h-9 rounded-full bg-raised px-3 text-xs" onClick={() => setView(fitView(setup))}>Reset</button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-faint">Scroll zoomt, Ziehen verschiebt. Doppelklick setzt den Bereich auf DD barrier −4% bis Pass +4%. Die cyanfarbene Linie ist der Live-WS-Index. Spanne jetzt {(span * 100).toFixed(1)}%.</p>
    </div>
  );
}

function LegendChip({ on, color, label, onClick }: { on: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-xs", on ? "bg-bg text-fg" : "bg-bg text-faint line-through")}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </button>
  );
}

function Sep() {
  return <span className="text-faint"> · </span>;
}

function nearestSample<T extends { price: number }>(samples: T[], price: number): T | null {
  let best = samples[0];
  if (!best) return null;
  let gap = Math.abs(best.price - price);
  for (const row of samples) {
    const next = Math.abs(row.price - price);
    if (next < gap) {
      best = row;
      gap = next;
    }
  }
  return best;
}

function zoomView(prev: View, anchor: number, factor: number): View {
  const span = Math.max(0.02, prev.hi - prev.lo);
  const next = Math.min(1.4, Math.max(0.02, span * factor));
  const at = prev.lo + anchor * span;
  return clampView({ lo: at - anchor * next, hi: at + (1 - anchor) * next });
}

function clampView(view: View): View {
  let { lo, hi } = view;
  if (!(hi > lo)) return FALLBACK;
  const span = Math.min(1.4, Math.max(0.02, hi - lo));
  const mid = (lo + hi) / 2;
  lo = mid - span / 2;
  hi = mid + span / 2;
  if (lo < -0.85) {
    hi -= lo + 0.85;
    lo = -0.85;
  }
  if (hi > 1.5) {
    lo -= hi - 1.5;
    hi = 1.5;
  }
  return { lo, hi };
}

function fmtPx(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDeltaCoins(n: number, asset: string): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0.0005 ? "+" : n < -0.0005 ? "-" : "";
  const body = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}${body} ${asset}`;
}

function fmtDollar(n: number): string {
  const sign = n > 0.0000005 ? "+" : n < -0.0000005 ? "-" : "";
  const body = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}$${body}`;
}

function paint(
  canvas: HTMLCanvasElement,
  args: {
    setup: PropSetup;
    samples: { price: number; now: number; expiry: number }[];
    series: SeriesToggles;
    view: View;
    hoverPrice: number | null;
    liveIndex: number;
    now: number;
    geo: { current: { padL: number; plotW: number; min: number; max: number; width: number; height: number } };
  },
) {
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (cssW < 20 || cssH < 20) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const nextW = Math.round(cssW * dpr);
  const nextH = Math.round(cssH * dpr);
  if (canvas.width !== nextW || canvas.height !== nextH) {
    canvas.width = nextW;
    canvas.height = nextH;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const style = getComputedStyle(canvas);
  const color = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const long = color("--color-long", "#1fbf75");
  const short = color("--color-short", "#f0445a");
  const expiry = color("--color-expiry", "#c4b5fd");
  const preview = color("--color-preview", "#e6a23c");
  const roll = color("--color-roll", "#f5c518");
  const faint = color("--color-faint", "#6b7280");
  const line = color("--color-line", "#2c2e36");
  const surface = color("--color-surface", "#121316");
  const bg = color("--color-bg", "#0a0b0d");
  const fg = color("--color-fg", "#ffffff");
  const padL = 68;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const plotW = Math.max(1, cssW - padL - padR);
  const plotH = Math.max(1, cssH - padT - padB);
  const index = args.setup.index > 0 ? args.setup.index : 1;
  const xMin = index * (1 + args.view.lo);
  const xMax = index * (1 + args.view.hi);
  args.geo.current = { padL, plotW, min: xMin, max: xMax, width: cssW, height: cssH };
  const bars = barriers(args.setup);
  const fee = Math.max(0, args.setup.fee);
  const payout = Math.max(0, args.setup.payout);
  const rows = args.samples.map((row) => ({
    price: row.price,
    current: toUnit(row.now - fee, args.setup),
    expiry: toUnit(row.expiry - fee, args.setup),
    prop: toUnit(-fee, args.setup),
    payout: args.series.payout && passed(args.setup, row.price) ? toUnit(payout, args.setup) : 0,
  }));
  const ys: number[] = [0];
  for (const row of rows) {
    if (args.series.current) ys.push(row.current);
    if (args.series.expiry) ys.push(row.expiry);
    if (args.series.prop) ys.push(row.prop);
    if (args.series.payout) ys.push(row.payout);
  }
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (!(yMax > yMin)) {
    yMin = -1;
    yMax = 1;
  }
  const yPad = (yMax - yMin) * 0.08;
  yMin -= yPad;
  yMax += yPad;
  const xOf = (price: number) => padL + ((price - xMin) / (xMax - xMin)) * plotW;
  const yOf = (value: number) => padT + ((yMax - value) / (yMax - yMin)) * plotH;
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.font = "11px Roboto Mono, ui-monospace, monospace";
  ctx.fillStyle = faint;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const yStep = niceStep(yMax - yMin);
  const yStart = Math.ceil(yMin / yStep) * yStep;
  for (let y = yStart; y <= yMax; y += yStep) {
    const py = yOf(y);
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, py);
    ctx.lineTo(padL + plotW, py);
    ctx.stroke();
    ctx.fillText(fmtAxis(y, args.setup.unit), padL - 6, py);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const xStep = niceStep(xMax - xMin);
  const xStart = Math.ceil(xMin / xStep) * xStep;
  for (let x = xStart; x <= xMax; x += xStep) {
    const px = xOf(x);
    if (px < padL || px > padL + plotW) continue;
    ctx.fillText(fmtPx(x), px, padT + plotH + 6);
  }
  const y0 = yOf(0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(padL, padT, plotW, plotH);
  ctx.clip();
  if (args.series.current) {
    fillBand(ctx, rows, (row) => row.current, (row) => row.price, xOf, yOf, y0, withAlpha(long, 0.22), withAlpha(short, 0.2));
  }
  ctx.strokeStyle = faint;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, y0);
  ctx.lineTo(padL + plotW, y0);
  ctx.stroke();
  if (args.series.prop) strokeSeries(ctx, rows, (row) => row.prop, (row) => row.price, xOf, yOf, preview, 1.75, [5, 4]);
  if (args.series.payout) strokeSeries(ctx, rows, (row) => row.payout, (row) => row.price, xOf, yOf, roll, 1.75, [6, 4]);
  if (args.series.expiry) strokeSeries(ctx, rows, (row) => row.expiry, (row) => row.price, xOf, yOf, expiry, 2.25, []);
  if (args.series.current) strokeSeries(ctx, rows, (row) => row.current, (row) => row.price, xOf, yOf, long, 2.25, []);
  const markers = [
    args.series.dd && bars.dd != null ? { price: bars.dd, color: short, label: `DD barrier 1: ${fmtPx(bars.dd)}`, glow: false } : null,
    args.liveIndex > 0 && Math.abs(args.liveIndex - index) / index > 0.0008
      ? { price: index, color: faint, label: `Eval-Entry: ${fmtPx(index)}`, glow: false }
      : args.liveIndex > 0
        ? null
        : { price: index, color: faint, label: `Index: ${fmtPx(index)}`, glow: false },
    args.series.pass && bars.pass != null ? { price: bars.pass, color: long, label: `Pass 1: ${fmtPx(bars.pass)}`, glow: false } : null,
    args.liveIndex > 0 ? { price: args.liveIndex, color: "#22d3ee", label: `Live WS Index: ${fmtPx(args.liveIndex)}`, glow: true } : null,
    rollLevel(args.setup) != null ? { price: rollLevel(args.setup) as number, color: roll, label: `🔄 Roll-Punkt (55% DD): ${fmtPx(rollLevel(args.setup) as number)}`, glow: false } : null,
  ].filter((row): row is { price: number; color: string; label: string; glow: boolean } => row != null);
  markers.forEach((marker) => {
    const px = xOf(marker.price);
    if (px < padL - 2 || px > padL + plotW + 2) return;
    ctx.save();
    ctx.strokeStyle = marker.color;
    ctx.lineWidth = marker.glow ? 1.6 + Math.sin(args.now / 180) * 0.7 : 1.25;
    ctx.setLineDash(marker.glow ? [] : [5, 4]);
    if (marker.glow) {
      const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(args.now / 160));
      ctx.globalAlpha = 0.55 + pulse * 0.45;
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 6 + pulse * 10;
    }
    ctx.beginPath();
    ctx.moveTo(px, padT);
    ctx.lineTo(px, padT + plotH);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.translate(px + 8, padT + 28);
    ctx.rotate(Math.PI / 2);
    ctx.font = "11px Roboto Mono, ui-monospace, monospace";
    const width = ctx.measureText(marker.label).width;
    ctx.fillStyle = withAlpha(surface, 0.92);
    ctx.fillRect(0, -8, width + 6, 16);
    ctx.fillStyle = marker.color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(marker.label, 3, 0);
    ctx.restore();
  });
  if (args.hoverPrice != null && args.hoverPrice >= xMin && args.hoverPrice <= xMax) {
    const px = xOf(args.hoverPrice);
    const at = nearestSample(rows, args.hoverPrice);
    ctx.save();
    ctx.strokeStyle = withAlpha(fg, 0.28);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(px, padT);
    ctx.lineTo(px, padT + plotH);
    if (at && args.series.current) {
      const hy = yOf(at.current);
      ctx.moveTo(padL, hy);
      ctx.lineTo(padL + plotW, hy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (at && args.series.expiry) {
      ctx.fillStyle = expiry;
      ctx.beginPath();
      ctx.arc(px, yOf(at.expiry), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (at && args.series.current) {
      ctx.fillStyle = long;
      ctx.beginPath();
      ctx.arc(px, yOf(at.current), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

function fillBand(
  ctx: CanvasRenderingContext2D,
  rows: { price: number; current: number }[],
  value: (row: { price: number; current: number }) => number,
  price: (row: { price: number; current: number }) => number,
  xOf: (n: number) => number,
  yOf: (n: number) => number,
  y0: number,
  up: string,
  down: string,
) {
  for (let i = 0; i < rows.length - 1; i += 1) {
    const p0 = price(rows[i]);
    const p1 = price(rows[i + 1]);
    const v0 = value(rows[i]);
    const v1 = value(rows[i + 1]);
    if (!Number.isFinite(v0) || !Number.isFinite(v1)) continue;
    if (v0 * v1 < 0) {
      const t = v0 / (v0 - v1);
      const cross = p0 + t * (p1 - p0);
      quad(ctx, p0, v0, cross, 0, xOf, yOf, y0, v0 > 0 ? up : down);
      quad(ctx, cross, 0, p1, v1, xOf, yOf, y0, v1 > 0 ? up : down);
    } else if (v0 !== 0 || v1 !== 0) {
      quad(ctx, p0, v0, p1, v1, xOf, yOf, y0, v0 > 0 || v1 > 0 ? up : down);
    }
  }
}

function quad(
  ctx: CanvasRenderingContext2D,
  p0: number,
  v0: number,
  p1: number,
  v1: number,
  xOf: (n: number) => number,
  yOf: (n: number) => number,
  y0: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(xOf(p0), yOf(v0));
  ctx.lineTo(xOf(p1), yOf(v1));
  ctx.lineTo(xOf(p1), y0);
  ctx.lineTo(xOf(p0), y0);
  ctx.closePath();
  ctx.fill();
}

function strokeSeries<T extends { price: number }>(
  ctx: CanvasRenderingContext2D,
  rows: T[],
  value: (row: T) => number,
  price: (row: T) => number,
  xOf: (n: number) => number,
  yOf: (n: number) => number,
  color: string,
  width: number,
  dash: number[],
) {
  ctx.beginPath();
  let started = false;
  for (const row of rows) {
    const v = value(row);
    if (!Number.isFinite(v)) continue;
    const x = xOf(price(row));
    const y = yOf(v);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.stroke();
  ctx.setLineDash([]);
}

function niceStep(span: number): number {
  const raw = Math.abs(span) / 5;
  if (!(raw > 0)) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const m = raw / pow;
  const n = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
  return n * pow;
}

function fmtAxis(n: number, unit: "usd" | "coin"): string {
  const abs = Math.abs(n);
  const digits = unit === "coin" ? (abs >= 10 ? 2 : 3) : abs >= 1000 ? 0 : 1;
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return hex;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((part) => Number.isNaN(part))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
