import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  barriers,
  bookGreeks,
  optionsPnlUsd,
  toUnit,
  type OptLeg,
  type PropSetup,
} from "@/lib/options-sim";

export type SeriesKey = "now" | "d1" | "d2" | "expiry" | "dd" | "pass";

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

type Curve = { price: number; now: number; d1: number; d2: number; expiry: number };

export function OptionsChart({
  setup,
  legs,
  volShift,
  rateShift,
  liveIndex,
  net,
  cashDrag,
  onNet,
}: {
  setup: PropSetup;
  legs: OptLeg[];
  volShift: number;
  rateShift: number;
  liveIndex: number;
  net: boolean;
  cashDrag: number;
  onNet: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geo = useRef({ padL: 72, plotW: 1, min: 1, max: 2, width: 1, height: 1 });
  const [view, setView] = useState<View>(() => fitView(setup));
  const [hover, setHover] = useState<Hover | null>(null);
  const [pin, setPin] = useState<"breach" | "spot" | "tp" | null>(null);
  const drag = useRef<{ x: number; lo: number; hi: number } | null>(null);
  const drawRef = useRef({ setup, samples: [] as Curve[], view, hoverPrice: null as number | null, liveIndex, net, cashDrag });
  const index = setup.index > 0 ? setup.index : 1;
  const span = Math.max(0.02, view.hi - view.lo);
  const min = index * (1 + view.lo);
  const max = index * (1 + view.hi);

  const samples = useMemo(() => {
    const bars = barriers(setup);
    const marks = [index, bars.dd ?? 0, bars.pass ?? 0, liveIndex].filter((price) => price > 0);
    const lo = Math.max(0.01, min);
    const hi = Math.max(lo + index * 0.002, max);
    const prices = new Set<number>();
    for (let i = 0; i < 121; i += 1) prices.add(lo + ((hi - lo) * i) / 120);
    for (const mark of marks) if (mark > lo && mark < hi) prices.add(mark);
    const dte = Math.max(1, ...legs.filter((row) => row.on).map((row) => row.dte));
    return [...prices].sort((a, b) => a - b).map((price) => ({
      price,
      now: optionsPnlUsd(legs, price, 0, volShift, rateShift, index),
      d1: optionsPnlUsd(legs, price, Math.min(1, dte), volShift, rateShift, index),
      d2: optionsPnlUsd(legs, price, Math.min(2, dte), volShift, rateShift, index),
      expiry: optionsPnlUsd(legs, price, dte + 1, 0, 0, index),
    }));
  }, [setup, legs, index, volShift, rateShift, min, max, liveIndex]);

  const pinPrice = pin === "breach" ? barriers(setup).dd : pin === "tp" ? barriers(setup).pass : pin === "spot" ? (liveIndex > 0 ? liveIndex : index) : null;
  drawRef.current = { setup, samples, view, hoverPrice: hover?.price ?? pinPrice ?? null, liveIndex, net, cashDrag };

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

  const focus = hover?.price ?? pinPrice;
  const nearest = focus != null ? nearestSample(samples, focus) : null;
  const deltaNow = nearest ? bookGreeks(legs, nearest.price, 0, volShift, rateShift).delta : 0;
  const dragCash = net ? cashDrag : 0;
  const tip = nearest
    ? {
      now: toUnit(nearest.now - dragCash, setup),
      d1: toUnit(nearest.d1 - dragCash, setup),
      d2: toUnit(nearest.d2 - dragCash, setup),
      expiry: toUnit(nearest.expiry - dragCash, setup),
    }
    : null;

  return (
    <div>
      <div className="mt-2 flex flex-wrap gap-1">
        {([["breach", "Breach"], ["spot", "Spot"], ["tp", "TP"]] as const).map(([id, label]) => (
          <button key={id} type="button" className={cn("h-7 rounded-full px-2.5 text-[11px] font-semibold", pin === id ? "bg-fg text-bg" : "bg-bg text-muted")} onClick={() => setPin((current) => current === id ? null : id)}>
            {label}
          </button>
        ))}
      </div>
      <div
        ref={wrapRef}
        className="relative mt-2 h-80 touch-none select-none sm:h-[28rem]"
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
        {tip && nearest ? (
          <div
            className="pointer-events-none absolute z-10 min-w-36 rounded-md border border-white/15 bg-black/80 px-2 py-1.5 font-mono text-[10px] leading-4 text-white shadow-lg"
            style={{ left: Math.min((hover?.x ?? 24) + 12, 280), top: Math.max(8, (hover?.y ?? 16) - 8) }}
          >
            <p>{fmtPx(nearest.price)} · Δ {fmtDeltaCoins(deltaNow, setup.asset)}</p>
            <p style={{ color: "#f8fafc" }}>Now {fmtDollar(tip.now)}</p>
            <p style={{ color: "#d6e34a" }}>1d {fmtDollar(tip.d1)}</p>
            <p style={{ color: "#2dd4bf" }}>2d {fmtDollar(tip.d2)}</p>
            <p style={{ color: "#34d399" }}>Exp {fmtDollar(tip.expiry)}</p>
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <LegendChip on color="#f8fafc" label="Now" onClick={() => undefined} />
          <LegendChip on color="#d6e34a" label="1d" onClick={() => undefined} />
          <LegendChip on color="#2dd4bf" label="2d" onClick={() => undefined} />
          <LegendChip on color="#34d399" label="Exp" onClick={() => undefined} />
          <LegendChip on={net} color="var(--color-accent)" label={net ? "Netto inkl. Gebühr" : "Reiner Options-PnL"} onClick={onNet} />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="h-9 rounded-full bg-raised px-3 text-xs" onClick={() => setView((prev) => zoomView(prev, 0.5, 1 / 1.15))}>+</button>
          <button type="button" className="h-9 rounded-full bg-raised px-3 text-xs" onClick={() => setView((prev) => zoomView(prev, 0.5, 1.15))}>−</button>
          <button type="button" className="h-9 rounded-full bg-raised px-3 text-xs" onClick={() => setView(fitView(setup))}>Reset</button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-faint">Now weiß, 1d gelb gestrichelt, 2d türkis gestrichelt, Exp grün. Fläche grün über $0 und rot darunter. Spanne {(span * 100).toFixed(1)}%.</p>
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
    samples: Curve[];
    view: View;
    hoverPrice: number | null;
    liveIndex: number;
    net: boolean;
    cashDrag: number;
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
  const drag = args.net ? args.cashDrag : 0;
  const rows = args.samples.map((row) => ({
    price: row.price,
    now: toUnit(row.now - drag, args.setup),
    d1: toUnit(row.d1 - drag, args.setup),
    d2: toUnit(row.d2 - drag, args.setup),
    expiry: toUnit(row.expiry - drag, args.setup),
  }));
  const ys: number[] = [0];
  for (const row of rows) ys.push(row.now, row.d1, row.d2, row.expiry);
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
  if (args.samples.length) {
    fillBand(ctx, rows, (row) => row.expiry, (row) => row.price, xOf, yOf, y0, withAlpha("#34d399", 0.22), withAlpha("#f43f5e", 0.2));
  }
  ctx.strokeStyle = faint;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, y0);
  ctx.lineTo(padL + plotW, y0);
  ctx.stroke();
  strokeSeries(ctx, rows, (row) => row.d2, (row) => row.price, xOf, yOf, "#2dd4bf", 1.6, [4, 3]);
  strokeSeries(ctx, rows, (row) => row.d1, (row) => row.price, xOf, yOf, "#d6e34a", 1.6, [5, 3]);
  strokeSigned(ctx, rows, (row) => row.expiry, (row) => row.price, xOf, yOf, "#34d399", "#f43f5e");
  strokeSeries(ctx, rows, (row) => row.now, (row) => row.price, xOf, yOf, "#f8fafc", 2, []);
  const markers = [
    bars.dd != null ? { price: bars.dd, color: short, label: `Breach ${fmtPx(bars.dd)}`, glow: false } : null,
    bars.pass != null ? { price: bars.pass, color: long, label: `TP ${fmtPx(bars.pass)}`, glow: false } : null,
    args.liveIndex > 0 ? { price: args.liveIndex, color: "#f8fafc", label: `spot ${fmtPx(args.liveIndex)}`, glow: false } : { price: index, color: faint, label: `spot ${fmtPx(index)}`, glow: false },
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
    if (at) {
      const hy = yOf(at.now);
      ctx.moveTo(padL, hy);
      ctx.lineTo(padL + plotW, hy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (at) {
      ctx.fillStyle = expiry;
      ctx.beginPath();
      ctx.arc(px, yOf(at.expiry), 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = long;
      ctx.beginPath();
      ctx.arc(px, yOf(at.now), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

function fillBand<T extends { price: number }>(
  ctx: CanvasRenderingContext2D,
  rows: T[],
  value: (row: T) => number,
  price: (row: T) => number,
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

function strokeSigned<T extends { price: number }>(
  ctx: CanvasRenderingContext2D,
  rows: T[],
  value: (row: T) => number,
  price: (row: T) => number,
  xOf: (n: number) => number,
  yOf: (n: number) => number,
  up: string,
  down: string,
) {
  ctx.lineWidth = 2.4;
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  for (let i = 0; i < rows.length - 1; i += 1) {
    const p0 = price(rows[i]);
    const p1 = price(rows[i + 1]);
    const v0 = value(rows[i]);
    const v1 = value(rows[i + 1]);
    if (!Number.isFinite(v0) || !Number.isFinite(v1)) continue;
    const draw = (a: number, b: number, va: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(xOf(a), yOf(va));
      ctx.lineTo(xOf(b), yOf(b === p1 ? v1 : 0));
      ctx.stroke();
    };
    if (v0 * v1 < 0) {
      const t = v0 / (v0 - v1);
      const cross = p0 + t * (p1 - p0);
      draw(p0, cross, v0, v0 > 0 ? up : down);
      ctx.strokeStyle = v1 > 0 ? up : down;
      ctx.beginPath();
      ctx.moveTo(xOf(cross), yOf(0));
      ctx.lineTo(xOf(p1), yOf(v1));
      ctx.stroke();
    } else {
      ctx.strokeStyle = v0 > 0 || v1 > 0 ? up : down;
      ctx.beginPath();
      ctx.moveTo(xOf(p0), yOf(v0));
      ctx.lineTo(xOf(p1), yOf(v1));
      ctx.stroke();
    }
  }
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
