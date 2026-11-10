import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { OptionsChart, type SeriesKey, type SeriesToggles } from "@/components/options-chart";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  buildLivePreset,
  coinForMode,
  coinToUsd,
  legFromContract,
  liveDelta,
  syntheticChain,
  useDeribitLive,
  type ChainContract,
  type LiveTicker,
} from "@/lib/deribit-live";
import {
  barriers,
  blankLeg,
  cappedCallSpread,
  defaultSetup,
  entryPremium,
  feeRoll,
  optionsPnlUsd,
  quoteOption,
  scaleShortCallsToFee,
  sizeSpreadToFee,
  toUnit,
  type Asset,
  type FeeRoll,
  type OptLeg,
  type OptSide,
  type PriceMode,
  type PropSetup,
  type PropSide,
} from "@/lib/options-sim";

type BookMemory = {
  setup: PropSetup;
  legs: OptLeg[];
  time: number;
  vol: number;
  rate: number;
  series: SeriesToggles;
  syncEntry: boolean;
};

let bookMemory: BookMemory | null = null;

const PRESETS: { id: 1 | 2 | 3; label: string }[] = [
  { id: 1, label: "⚡ Preset 1: Live 70-Delta ITM Short Call (Long Theta)" },
  { id: 2, label: "🛡️ Preset 2: Live Gedeckelter Bear Call Credit Spread (Short 70d Call + Long Schutz-Call bei Pass 1)" },
  { id: 3, label: "🔄 Preset 3: Live Put-Diagonal Roll-Maschine (Long 30d ITM Put + Short 7d Put exakt auf DD barrier 1)" },
];

const MODES: { id: PriceMode; label: string }[] = [
  { id: "mark", label: "Live Mark $" },
  { id: "bid", label: "Live Bid $" },
  { id: "ask", label: "Live Ask $" },
  { id: "custom", label: "Eigener Entry $" },
];

function normalize(rows: OptLeg[]): OptLeg[] {
  return rows.map((row) => ({
    ...row,
    name: row.name || "",
    expiry: row.expiry || "",
    priceMode: row.priceMode || "mark",
  }));
}

function legacySetup(setup: PropSetup | undefined): boolean {
  return !!setup && setup.fee === 1000 && setup.maxDd === 6000 && setup.target === 10000 && setup.coins === 100;
}

export function OptionsBuilder({ live: chartLive = true }: { live?: boolean }) {
  const [setup, setSetup] = useState<PropSetup>(() => (bookMemory?.setup && !legacySetup(bookMemory.setup) ? bookMemory.setup : defaultSetup()));
  const [legs, setLegs] = useState<OptLeg[]>(() => {
    const base = bookMemory?.setup && !legacySetup(bookMemory.setup) ? bookMemory.setup : defaultSetup();
    const saved = normalize(bookMemory?.legs ?? []);
    const hasSpread = !legacySetup(bookMemory?.setup) && saved.some((row) => row.side === "sell" && row.right === "call") && saved.some((row) => row.side === "buy" && row.right === "call");
    return hasSpread ? saved : cappedCallSpread(base);
  });
  const [time, setTime] = useState(() => bookMemory?.time ?? 0);
  const [vol, setVol] = useState(() => bookMemory?.vol ?? 0);
  const [rate, setRate] = useState(() => bookMemory?.rate ?? 0);
  const [syncEntry, setSyncEntry] = useState(() => bookMemory?.syncEntry ?? true);
  const [chainExpiry, setChainExpiry] = useState("");
  const [note, setNote] = useState("");
  const [series, setSeries] = useState<SeriesToggles>(() => (
    bookMemory?.series && !legacySetup(bookMemory.setup)
      ? bookMemory.series
      : { current: true, expiry: true, payout: false, prop: true, dd: true, pass: true }
  ));
  const names = useMemo(() => legs.map((row) => row.name).filter(Boolean), [legs]);
  const live = useDeribitLive(setup.asset, names);
  const booted = useRef(Boolean(bookMemory?.legs.some((row) => row.name)));
  const touched = useRef(Boolean(bookMemory?.legs.length));
  const seedStage = useRef(bookMemory?.legs.length ? 2 : 0);
  const seededKey = useRef("");
  const setupRef = useRef(setup);
  const syncRef = useRef(syncEntry);
  setupRef.current = setup;
  syncRef.current = syncEntry;

  useEffect(() => {
    bookMemory = { setup, legs, time, vol, rate, series, syncEntry };
  }, [setup, legs, time, vol, rate, series, syncEntry]);

  useEffect(() => {
    if (!syncEntry || !(live.index > 0)) return;
    setSetup((prev) => (Math.abs(prev.index - live.index) < 0.005 ? prev : { ...prev, index: live.index }));
  }, [syncEntry, live.index]);

  const entrySpot = setup.index > 0 ? setup.index : live.index > 0 ? live.index : 2298;
  const fallbackSpot = Math.round(entrySpot);
  const fallback = useMemo(
    () => (live.chain.length ? [] : syntheticChain(setup.asset, fallbackSpot)),
    [live.chain.length, setup.asset, fallbackSpot],
  );
  const book = live.chain.length ? live.chain : fallback;
  const pxIndex = live.index > 0 ? live.index : setup.index > 0 ? setup.index : 2298;
  const aligned = useRef(false);

  useEffect(() => {
    if (touched.current || aligned.current || !syncEntry || !(live.index > 0)) return;
    if (Math.abs(live.index - setupRef.current.index) < 5) {
      aligned.current = true;
      return;
    }
    aligned.current = true;
    setLegs(cappedCallSpread({ ...setupRef.current, index: live.index }));
  }, [live.index, syncEntry]);

  useEffect(() => {
    const prev = setupRef.current;
    if (!legacySetup(prev)) return;
    const next = { ...defaultSetup(), unit: prev.unit, asset: prev.asset, index: prev.index > 0 ? prev.index : defaultSetup().index, side: prev.side };
    setSetup(next);
    setLegs(cappedCallSpread(next));
    setSeries((current) => ({ ...current, payout: false }));
  }, []);

  useEffect(() => {
    if (!live.chain.length) return;
    const spot = live.index > 0 ? live.index : setupRef.current.index;
    setLegs((rows) => {
      if (!rows.some((row) => row.name.startsWith("SYN-"))) return rows;
      let changed = false;
      const next = rows.map((row) => {
        if (!row.name.startsWith("SYN-")) return row;
        const pick = matchContract(live.chain, row);
        if (!pick) return row;
        changed = true;
        const under = spot > 0 ? spot : pick.underlying;
        return {
          ...row,
          name: pick.name,
          expiry: pick.expiry,
          dte: pick.dte,
          iv: pick.iv > 1 ? pick.iv : row.iv,
          strike: pick.strike,
          premium: coinToUsd(pick.markCoin > 0 ? pick.markCoin : null, under) ?? row.premium,
        };
      });
      return changed ? sizeSpreadToFee(next, { ...setupRef.current, index: spot > 0 ? spot : setupRef.current.index }) : rows;
    });
  }, [live.chain, live.index]);

  const chainMap = useMemo(() => {
    const map = new Map<string, ChainContract>();
    for (const row of book) map.set(row.name, row);
    return map;
  }, [book]);

  const byExpiry = useMemo(() => {
    const map = new Map<string, ChainContract[]>();
    for (const row of book) {
      const list = map.get(row.expiry);
      if (list) list.push(row);
      else map.set(row.expiry, [row]);
    }
    return map;
  }, [book]);

  const expiries = useMemo(
    () => [...byExpiry.keys()].sort((a, b) => (byExpiry.get(a)?.[0]?.expiryMs ?? 0) - (byExpiry.get(b)?.[0]?.expiryMs ?? 0)),
    [byExpiry],
  );

  useEffect(() => {
    if (!expiries.length) return;
    if (chainExpiry && byExpiry.has(chainExpiry)) return;
    let best = expiries[0];
    let gap = Infinity;
    for (const expiry of expiries) {
      const dte = byExpiry.get(expiry)?.[0]?.dte ?? 999;
      const next = Math.abs(dte - 7);
      if (next < gap) {
        gap = next;
        best = expiry;
      }
    }
    setChainExpiry(best);
  }, [expiries, chainExpiry, byExpiry]);

  const chartLegs = useMemo(() => legs.map((leg) => {
    const iv = live.tickers[leg.name]?.iv || chainMap.get(leg.name)?.iv || leg.iv;
    if (!(iv > 0) || Math.abs(iv - leg.iv) < 0.01) return leg;
    return { ...leg, iv };
  }), [legs, live.tickers, chainMap]);

  const spot = live.index > 0 ? live.index : setup.index;
  const greeks = useMemo(() => sumGreeks(legs, live.tickers, spot), [legs, live.tickers, spot]);
  const spread = useMemo(() => spreadCost(legs, live.tickers, chainMap), [legs, live.tickers, chainMap]);
  const horizon = Math.max(1, ...chartLegs.filter((row) => row.on && row.dte > 0).map((row) => row.dte), 1);
  const elapsed = Math.min(Math.max(0, time), horizon);
  const bars = barriers(setup);
  const unitName = setup.unit === "usd" ? "USD" : setup.asset;
  const mid = live.index > 0 ? live.index : setup.index;

  const listed = useMemo(() => {
    const list = [...(byExpiry.get(chainExpiry) ?? [])];
    list.sort((a, b) => a.strike - b.strike || (a.right === b.right ? 0 : a.right === "call" ? -1 : 1));
    return list;
  }, [byExpiry, chainExpiry]);

  const deltaSpot = spot > 0 ? Math.round(spot * 2) / 2 : 0;
  const deltaByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const contract of listed) map.set(contract.name, liveDelta(contract, deltaSpot));
    return map;
  }, [listed, deltaSpot]);

  const ddStrike = nearestStrike(listed.map((contract) => contract.strike), bars.dd);
  const strikes = useMemo(() => [...new Set(book.map((contract) => contract.strike))], [book]);
  const roll = useMemo(
    () => feeRoll(chartLegs, setup, strikes, elapsed, vol, rate),
    [chartLegs, setup, strikes, elapsed, vol, rate],
  );
  const cover = useMemo(() => {
    if (bars.dd == null || !(bars.dd > 0)) return null;
    const fee = Math.max(0, setup.fee);
    const atBarrier = optionsPnlUsd(chartLegs, bars.dd, elapsed, vol, rate, setup.index) - fee;
    return {
      current: atBarrier >= -Math.max(1, fee * 0.01) ? Math.max(atBarrier, 0) : atBarrier,
      expiry: optionsPnlUsd(chartLegs, bars.dd, 10_000, 0, 0, setup.index) - fee,
    };
  }, [chartLegs, bars.dd, elapsed, vol, rate, setup.index, setup.fee, roll]);

  const patch = (next: Partial<PropSetup>) => setSetup((prev) => ({ ...prev, ...next }));
  const patchLeg = (id: string, next: Partial<OptLeg>) => {
    touched.current = true;
    setLegs((rows) => rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  };

  const applyPreset = (id: 1 | 2 | 3) => {
    touched.current = true;
    booted.current = true;
    const base = syncEntry && live.index > 0 ? { ...setup, index: live.index } : setup;
    const source = book.length ? book : syntheticChain(base.asset, base.index);
    const built = buildLivePreset(id, source, base);
    if (!built.length) {
      setNote("Keine passenden Kontrakte in der Kette.");
      return;
    }
    setNote("");
    setLegs(id === 1 ? scaleShortCallsToFee(built, base).legs : built);
    setTime(0);
    setVol(0);
    setRate(0);
  };

  const setAsset = (asset: Asset) => {
    setSetup((prev) => ({ ...prev, asset }));
    setLegs((rows) => rows.filter((row) => !row.name || row.name.startsWith(`${asset}-`) || row.name.startsWith(`SYN-${asset}-`)));
    setChainExpiry("");
    setNote("");
    if (!touched.current) {
      seedStage.current = 0;
      seededKey.current = "";
    }
  };

  const adopt = (id: string, contract: ChainContract, mode?: PriceMode) => {
    setLegs((rows) => rows.map((row) => {
      if (row.id !== id) return row;
      const priceMode = mode ?? (row.priceMode === "custom" ? "mark" : row.priceMode);
      const ticker = live.tickers[contract.name];
      const underlying = ticker?.underlying || contract.underlying;
      const iv = ticker?.iv || contract.iv || row.iv;
      const coin = coinForMode({
        markCoin: ticker?.markCoin || contract.markCoin,
        bidCoin: ticker?.bidCoin ?? contract.bidCoin,
        askCoin: ticker?.askCoin ?? contract.askCoin,
        iv,
        underlying,
      }, priceMode);
      return {
        ...row,
        name: contract.name,
        expiry: contract.expiry,
        strike: contract.strike,
        right: contract.right,
        dte: contract.dte,
        iv,
        priceMode,
        premium: priceMode === "custom" ? row.premium : coinToUsd(coin, pxIndex > 0 ? pxIndex : underlying) ?? row.premium,
      };
    }));
  };

  const addFromChain = (contract: ChainContract, side: OptSide) => {
    touched.current = true;
    booted.current = true;
    setLegs((rows) => [...rows, legFromContract(contract, side, setup.coins > 0 ? setup.coins : 1)]);
  };

  const scaleToFee = () => {
    touched.current = true;
    booted.current = true;
    const result = scaleShortCallsToFee(legs, setup);
    setNote(result.note);
    if (!result.note) setLegs(result.legs);
  };

  const snapLegToBarrier = (row: OptLeg) => {
    if (bars.dd == null || !(bars.dd > 0)) {
      setNote("Keine DD-Barrier. Coins und Max DD prüfen.");
      return;
    }
    const sameExpiry = (byExpiry.get(row.expiry) ?? []).filter((contract) => contract.right === row.right);
    const pool = sameExpiry.length ? sameExpiry : book.filter((contract) => contract.right === row.right);
    const next = closestContract(pool, bars.dd);
    if (!next) {
      setNote("Kein Deribit-Strike an der DD-Barrier.");
      return;
    }
    setNote("");
    adopt(row.id, next);
  };

  const when = new Date();
  when.setDate(when.getDate() + Math.round(elapsed));
  const whenLabel = elapsed < 0.05
    ? "Heute (T+0)"
    : `${when.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })} (T+${trim(elapsed)})`;

  return (
    <div className="mx-auto flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-raised px-3 py-2">
        <p className="text-xs text-muted">Simulated PNL · {setup.asset}-Index</p>
        <p className={cn("text-xs font-medium", live.status === "live" ? "text-long" : "text-short")}>
          {live.status === "live"
            ? `Deribit WS Connected · 100ms · Latenz ${live.latencyMs == null ? "…" : `${live.latencyMs} ms`}`
            : live.status === "connecting"
              ? "Verbinde mit Deribit…"
              : "Getrennt – Verbinde neu…"}
        </p>
      </div>
      {live.error ? <p className="text-[11px] text-short">{live.error}</p> : null}

      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Prop-Challenge</h2>
          <div className="flex flex-wrap gap-2">
            <Segment value={setup.unit} options={[["usd", "USD"], ["coin", setup.asset]]} onChange={(unit) => patch({ unit })} />
            <Segment value={setup.asset} options={[["ETH", "ETH"], ["BTC", "BTC"]]} onChange={setAsset} />
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            aria-pressed={syncEntry}
            className={cn("min-h-11 rounded-xl px-3 py-2 text-left text-xs font-semibold", syncEntry ? "bg-long text-bg" : "bg-raised text-fg")}
            onClick={() => {
              setSyncEntry((on) => {
                const next = !on;
                if (next && live.index > 0) setSetup((prev) => ({ ...prev, index: live.index }));
                return next;
              });
            }}
          >
            📌 Eval-Entry mit Live-Index synchronisieren: {syncEntry ? "AN" : "AUS"}
          </button>
          <p className="mt-1 text-[11px] text-faint">
            {syncEntry
              ? "Pre-Trade: Eval-Entry, DD barrier 1 und Pass 1 laufen mit dem Live-Index."
              : "In-Trade: Eval-Entry und beide Barrieren bleiben eingefroren. Nur die Live-Index-Linie wandert."}
          </p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Field label="Eval-Entry-Kurs ($)">
            <input
              className={fieldClass}
              inputMode="decimal"
              disabled={syncEntry}
              value={num(setup.index)}
              onChange={(event) => patch({ index: clamp(event.target.value, 0.01, 10_000_000, setup.index) })}
            />
          </Field>
          <Field label="Challenge-Gebühr ($)">
            <input className={fieldClass} inputMode="decimal" value={num(setup.fee)} onChange={(event) => patch({ fee: clamp(event.target.value, 0, 1_000_000, setup.fee) })} />
          </Field>
          <Field label="Max Drawdown ($)">
            <input className={fieldClass} inputMode="decimal" value={num(setup.maxDd)} onChange={(event) => patch({ maxDd: clamp(event.target.value, 0, 5_000_000, setup.maxDd) })} />
          </Field>
          <Field label="Profit Target ($)">
            <input className={fieldClass} inputMode="decimal" value={num(setup.target)} onChange={(event) => patch({ target: clamp(event.target.value, 0, 5_000_000, setup.target) })} />
          </Field>
          <Field label="Richtung">
            <div className="mt-1 grid grid-cols-2 gap-1">
              {(["long", "short"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  className={cn("h-10 rounded-xl text-xs font-semibold", setup.side === side ? (side === "long" ? "bg-long text-bg" : "bg-short text-bg") : "bg-bg text-muted")}
                  onClick={() => patch({ side: side satisfies PropSide })}
                >
                  {side === "long" ? "LONG" : "SHORT"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Prop-Positionsgröße (Coins)">
            <input className={fieldClass} inputMode="decimal" value={num(setup.coins)} onChange={(event) => patch({ coins: clamp(event.target.value, 0, 100_000, setup.coins) })} />
          </Field>
          <Field label="Wert des Funded-Accounts bei Pass ($)">
            <input className={fieldClass} inputMode="decimal" value={num(setup.payout)} onChange={(event) => patch({ payout: clamp(event.target.value, 0, 5_000_000, setup.payout) })} />
          </Field>
        </div>
        <p className="mt-3 font-mono text-xs">
          <span className="text-short">DD barrier 1: {bars.dd == null ? "—" : px(bars.dd)}</span>
          <span className="text-faint"> · </span>
          <span className="text-muted">Eval-Entry: {px(setup.index)}</span>
          <span className="text-faint"> · </span>
          <span style={{ color: "#22d3ee" }}>Live WS Index: {px(pxIndex)}</span>
          <span className="text-faint"> · </span>
          <span className="text-long">Pass 1: {bars.pass == null ? "—" : px(bars.pass)}</span>
        </p>
        {setup.unit === "coin" ? (
          <p className="mt-1 text-[11px] text-faint">Chart, Tooltip, Spread und Theta/Vega in {setup.asset}. Delta bleibt in Coins. Die Eingaben bleiben in USD.</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Options-Beine</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button key={preset.id} className="h-auto min-h-11 whitespace-normal py-2 text-left text-xs leading-snug" onClick={() => applyPreset(preset.id)}>
              {preset.label}
            </Button>
          ))}
        </div>
        {note ? <p className="mt-2 text-xs text-short">{note}</p> : null}
        <OptionCatalog
          expiries={expiries}
          byExpiry={byExpiry}
          expiry={chainExpiry}
          onExpiry={setChainExpiry}
          listed={listed}
          tickers={live.tickers}
          deltaByName={deltaByName}
          ddStrike={ddStrike}
          index={pxIndex}
          loading={!book.length}
          fallback={!live.chain.length && book.length > 0}
          onAdd={addFromChain}
        />
        <Button tone="accent" className="mt-3 h-auto min-h-11 whitespace-normal text-left text-xs leading-snug" onClick={scaleToFee}>
          🎯 Kontrakt-Menge automatisch auf Challenge-Gebühr (${px(setup.fee)}) berechnen
        </Button>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="px-2 py-1 font-medium">Aktiv</th>
                <th className="px-2 py-1 font-medium">Expiry</th>
                <th className="px-2 py-1 font-medium">Strike & Typ</th>
                <th className="px-2 py-1 font-medium">Richtung</th>
                <th className="px-2 py-1 font-medium">Menge</th>
                <th className="px-2 py-1 font-medium">Preis-Modus</th>
                <th className="px-2 py-1 font-medium">Entry $</th>
                <th className="px-2 py-1 font-medium">IV %</th>
                <th className="px-2 py-1 font-medium">Δ Delta</th>
                <th className="px-2 py-1 font-medium">Θ Theta $/Tag</th>
                <th className="px-2 py-1 font-medium" />
              </tr>
            </thead>
            <tbody>
              {legs.map((row) => {
                const choices = (byExpiry.get(row.expiry) ?? byExpiry.get(chainExpiry) ?? []).filter((contract) => !row.expiry || contract.expiry === row.expiry);
                const shown = quoteRow(row, live.tickers[row.name], chainMap.get(row.name), spot);
                const liveMark = markUsd(live.tickers[row.name], chainMap.get(row.name), pxIndex);
                return (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-2 py-2">
                      <input type="checkbox" className="h-4 w-4" checked={row.on} onChange={(event) => patchLeg(row.id, { on: event.target.checked })} aria-label="Bein aktiv" />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className={cellClass}
                        value={row.expiry || chainExpiry}
                        onChange={(event) => {
                          const expiry = event.target.value;
                          const pool = (byExpiry.get(expiry) ?? []).filter((contract) => contract.right === row.right);
                          const next = closestContract(pool, row.strike) ?? pool[0];
                          if (next) adopt(row.id, next);
                        }}
                      >
                        {row.expiry && !byExpiry.has(row.expiry) ? <option value={row.expiry}>{row.expiry}</option> : null}
                        {expiries.map((expiry) => {
                          const dte = byExpiry.get(expiry)?.[0]?.dte ?? 0;
                          return <option key={expiry} value={expiry}>{expiry} · {dte.toFixed(1)}d</option>;
                        })}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className={cellClass}
                        value={row.name}
                        onChange={(event) => {
                          const contract = chainMap.get(event.target.value);
                          if (contract) adopt(row.id, contract);
                        }}
                      >
                        {!row.name ? <option value="">Kontrakt wählen</option> : null}
                        {row.name && !chainMap.has(row.name) ? <option value={row.name}>{row.strike} {row.right === "call" ? "Call" : "Put"}</option> : null}
                        {(choices.length ? choices : [...chainMap.values()].filter((contract) => contract.expiry === (row.expiry || chainExpiry))).map((contract) => (
                          <option key={contract.name} value={contract.name}>
                            {contractChoice(contract, spot)}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="mt-1 h-8 w-full rounded-lg bg-bg px-2 text-left text-[11px] font-semibold text-short" onClick={() => snapLegToBarrier(row)}>
                        🎯 Strike auf DD-Barrier setzen
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <select className={cellClass} value={row.side} onChange={(event) => patchLeg(row.id, { side: event.target.value as OptSide })}>
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input className={cellClass} inputMode="decimal" value={num(row.qty)} onChange={(event) => patchLeg(row.id, { qty: clamp(event.target.value, 0, 1_000_000, row.qty) })} />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className={cellClass}
                        value={row.priceMode}
                        onChange={(event) => {
                          const mode = event.target.value as PriceMode;
                          if (mode === "custom") {
                            patchLeg(row.id, { priceMode: mode, premium: row.premium ?? liveMark ?? 0 });
                            return;
                          }
                          const ticker = live.tickers[row.name];
                          const contract = chainMap.get(row.name);
                          const underlying = ticker?.underlying || contract?.underlying || 0;
                          const coin = coinForMode({
                            markCoin: ticker?.markCoin || contract?.markCoin || 0,
                            bidCoin: ticker?.bidCoin ?? contract?.bidCoin ?? null,
                            askCoin: ticker?.askCoin ?? contract?.askCoin ?? null,
                            iv: ticker?.iv || contract?.iv || row.iv,
                            underlying,
                          }, mode);
                          patchLeg(row.id, { priceMode: mode, premium: coinToUsd(coin, pxIndex > 0 ? pxIndex : underlying) ?? row.premium });
                        }}
                      >
                        {MODES.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      {row.priceMode === "custom" ? (
                        <input className={cellClass} inputMode="decimal" value={row.premium == null ? "" : num(row.premium)} onChange={(event) => patchLeg(row.id, { premium: clamp(event.target.value, 0, 10_000_000, row.premium ?? 0) })} />
                      ) : (
                        <div className="min-w-24 font-mono">
                          <div>{row.premium == null ? "—" : px(row.premium)}</div>
                          <div className="text-[10px] text-faint">Mark {liveMark == null ? "—" : px(liveMark)}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 font-mono">{shown.iv > 0 ? shown.iv.toFixed(1) : "—"}</td>
                    <td className="px-2 py-2">
                      <div className="flex min-w-36 flex-col gap-1">
                        <span className={cn("inline-flex w-fit rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold", shown.unitDelta > 0.0005 ? "bg-long text-bg" : shown.unitDelta < -0.0005 ? "bg-short text-bg" : "bg-bg text-muted")}>
                          Einzel-Δ: {fmtSigned(shown.unitDelta, 2)}
                        </span>
                        <span className={cn("inline-flex w-fit rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold", shown.positionDelta > 0.0005 ? "bg-long text-bg" : shown.positionDelta < -0.0005 ? "bg-short text-bg" : "bg-bg text-muted")}>
                          Gesamt-Δ: {fmtSigned(shown.positionDelta, 2)} {setup.asset}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 font-mono">{fmtSigned(shown.theta, 2)}</td>
                    <td className="px-2 py-2">
                      <button type="button" className="grid h-10 w-10 place-items-center rounded-lg text-short" aria-label="Bein löschen" onClick={() => { touched.current = true; setLegs((rows) => rows.filter((item) => item.id !== row.id)); }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {legs.length === 0 ? <p className="mt-2 text-xs text-muted">Keine Beine. Preset wählen oder einen Kontrakt aus der Kette übernehmen.</p> : null}
        <Button className="mt-3" onClick={() => {
          touched.current = true;
          booted.current = true;
          const pool = (byExpiry.get(chainExpiry) ?? []).filter((contract) => contract.right === "call");
          const next = closestContract(pool, mid);
          if (next) setLegs((rows) => [...rows, legFromContract(next, "buy", 1)]);
          else setLegs((rows) => [...rows, blankLeg(setup)]);
        }}
        >
          + Options-Bein hinzufügen
        </Button>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Portfolio-Griechen</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Stat label="Netto-Delta" value={fmtGreek(greeks.delta)} />
          <Stat label="Netto-Gamma" value={fmtGreek(greeks.gamma)} />
          <Stat label={setup.unit === "usd" ? "Netto-Theta ($ / Tag im Seitwärtsmarkt)" : `Netto-Theta (${setup.asset} / Tag im Seitwärtsmarkt)`} value={fmtGreek(toUnit(greeks.theta, setup))} tone={greeks.theta} />
          <Stat label={setup.unit === "usd" ? "Netto-Vega" : `Netto-Vega (${setup.asset})`} value={fmtGreek(toUnit(greeks.vega, setup))} />
          <Stat label={setup.unit === "usd" ? "Live Bid/Ask Spread-Kosten ($)" : `Live Bid/Ask Spread-Kosten (${setup.asset})`} value={fmtGreek(toUnit(spread, setup))} />
        </div>
        <p className="mt-2 text-[11px] text-faint">Theta und Vega kommen aus dem Deribit-Ticker (USD pro Kontrakt) und werden mit Richtung und Menge multipliziert. Die Slider verschieben nur die Kurve.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <Slider label={`Time: ${whenLabel}`} min={0} max={horizon} step={horizon > 20 ? 0.5 : 0.1} value={elapsed} onChange={setTime} />
          <Slider label={`Volatility shift: ${vol.toFixed(0)}%`} min={-70} max={200} step={1} value={vol} onChange={setVol} />
          <Slider label={`Rate shift: ${rate.toFixed(0)}%`} min={-20} max={20} step={1} value={rate} onChange={setRate} />
        </div>
        {cover ? (
          <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <SpreadCards setup={setup} legs={chartLegs} bars={bars} elapsed={elapsed} vol={vol} rate={rate} thetaDay={greeks.theta} />
            </div>
            <HedgeBadge net={cover.current} />
          </div>
        ) : (
          <SpreadCards setup={setup} legs={chartLegs} bars={bars} elapsed={elapsed} vol={vol} rate={rate} thetaDay={greeks.theta} />
        )}
        {chartLive ? (
          <OptionsChart
            setup={setup}
            legs={chartLegs}
            elapsed={elapsed}
            volShift={vol}
            rateShift={rate}
            liveIndex={pxIndex}
            series={series}
            onToggle={(key: SeriesKey) => setSeries((prev) => ({ ...prev, [key]: !prev[key] }))}
          />
        ) : (
          <p className="mt-3 text-xs text-muted">Payoff-Diagramm liegt in diesem Tab und wird gezeichnet, sobald der Options-Tab aktiv ist.</p>
        )}
        {roll ? <RollCompare plan={roll} /> : null}
        <p className="mt-2 text-[11px] text-faint">
          Violett ist der Verfall, Grün ist Black-Scholes minus die Challenge-Gebühr. Beide laufen glatt; Payout zeichnet den Funded-Sprung extra als goldene gestrichelte Linie. Zoom startet bei DD barrier −4% bis Pass +4%. Anzeige: {unitName}.
        </p>
      </section>
    </div>
  );
}

function sumGreeks(legs: OptLeg[], tickers: Record<string, LiveTicker>, spot: number) {
  const out = { delta: 0, gamma: 0, vega: 0, theta: 0 };
  for (const leg of legs) {
    if (!leg.on || !(leg.qty > 0)) continue;
    const mult = (leg.side === "buy" ? 1 : -1) * leg.qty;
    const ticker = leg.name ? tickers[leg.name] : undefined;
    if (ticker && (ticker.markCoin > 0 || ticker.delta !== 0 || ticker.theta !== 0)) {
      out.delta += ticker.delta * mult;
      out.gamma += ticker.gamma * mult;
      out.vega += ticker.vega * mult;
      out.theta += ticker.theta * mult;
      continue;
    }
    if (!(spot > 0) || !(leg.strike > 0)) continue;
    const quote = quoteOption({
      spot,
      strike: leg.strike,
      dte: Math.max(leg.dte, 0),
      ivPct: leg.iv > 0 ? leg.iv : 50,
      ratePct: 0,
      right: leg.right,
    });
    out.delta += quote.delta * mult;
    out.gamma += quote.gamma * mult;
    out.vega += quote.vega * mult;
    out.theta += quote.theta * mult;
  }
  return out;
}

function spreadCost(legs: OptLeg[], tickers: Record<string, LiveTicker>, chain: Map<string, ChainContract>) {
  let sum = 0;
  for (const leg of legs) {
    if (!leg.on || !(leg.qty > 0) || !leg.name) continue;
    const ticker = tickers[leg.name];
    const contract = chain.get(leg.name);
    const bid = ticker?.bidCoin ?? contract?.bidCoin ?? null;
    const ask = ticker?.askCoin ?? contract?.askCoin ?? null;
    const underlying = ticker?.underlying || contract?.underlying || 0;
    if (bid == null || ask == null || !(underlying > 0)) continue;
    sum += Math.abs(ask - bid) * underlying * leg.qty;
  }
  return sum;
}

function quoteRow(leg: OptLeg, ticker: LiveTicker | undefined, contract: ChainContract | undefined, spot: number) {
  const iv = ticker?.iv || contract?.iv || leg.iv;
  const sign = leg.side === "buy" ? 1 : -1;
  const fallback = contract
    ? liveDelta(contract, spot, ticker)
    : quoteOption({
      spot: spot > 0 ? spot : 1,
      strike: leg.strike > 0 ? leg.strike : 1,
      dte: Math.max(leg.dte, 0),
      ivPct: iv > 0 ? iv : 50,
      ratePct: 0,
      right: leg.right,
    }).delta;
  const raw = ticker && (ticker.iv > 0 || ticker.markCoin > 0) ? ticker.delta : fallback;
  const thetaRaw = ticker && (ticker.theta !== 0 || ticker.markCoin > 0)
    ? ticker.theta
    : quoteOption({
      spot: ticker?.underlying || contract?.underlying || spot || 1,
      strike: leg.strike > 0 ? leg.strike : 1,
      dte: Math.max(leg.dte, 0),
      ivPct: iv > 0 ? iv : 50,
      ratePct: 0,
      right: leg.right,
    }).theta;
  const unitDelta = raw * sign;
  return { iv, unitDelta, positionDelta: unitDelta * Math.max(0, leg.qty), theta: thetaRaw * sign * leg.qty };
}

function markUsd(ticker: LiveTicker | undefined, contract: ChainContract | undefined, index: number): number | null {
  const coin = ticker?.markCoin || contract?.markCoin || 0;
  const underlying = index > 0 ? index : ticker?.underlying || contract?.underlying || 0;
  return coin > 0 && underlying > 0 ? coin * underlying : null;
}

function matchContract(chain: ChainContract[], row: OptLeg): ChainContract | null {
  const rights = chain.filter((contract) => contract.right === row.right && contract.dte > 0.5);
  if (!rights.length) return null;
  let expiry = rights[0].expiry;
  let gap = Math.abs(rights[0].dte - row.dte);
  const seen = new Set<string>();
  for (const contract of rights) {
    if (seen.has(contract.expiry)) continue;
    seen.add(contract.expiry);
    const next = Math.abs(contract.dte - row.dte);
    if (next < gap) {
      gap = next;
      expiry = contract.expiry;
    }
  }
  const pool = rights.filter((contract) => contract.expiry === expiry);
  return pool.find((contract) => contract.strike === row.strike) ?? closestContract(pool, row.strike);
}

function closestContract(rows: ChainContract[], strike: number): ChainContract | null {
  let best: ChainContract | null = null;
  let gap = Infinity;
  for (const row of rows) {
    const next = Math.abs(row.strike - strike);
    if (next < gap) {
      gap = next;
      best = row;
    }
  }
  return best;
}

function nearestStrike(strikes: number[], target: number | null): number | null {
  if (target == null || !strikes.length) return null;
  let best = strikes[0];
  let gap = Math.abs(best - target);
  for (const strike of strikes) {
    const next = Math.abs(strike - target);
    if (next < gap) {
      gap = next;
      best = strike;
    }
  }
  return best;
}

function prettyExpiry(expiry: string, dte: number): string {
  if (expiry.includes("(")) return expiry;
  const match = /^(\d{1,2})([A-Z]{3})(\d{2})$/.exec(expiry);
  const label = match ? `${match[1].padStart(2, "0")}${match[2]}${match[3]}` : expiry;
  return `${label} (${Math.max(0, Math.round(dte))}d)`;
}

function contractChoice(contract: ChainContract, spot: number): string {
  const anchor = spot > 0 ? spot : contract.underlying || 1;
  const quote = quoteOption({
    spot: anchor,
    strike: contract.strike,
    dte: Math.max(contract.dte, 1 / 24),
    ivPct: contract.iv > 1 ? contract.iv : 55,
    ratePct: 0,
    right: contract.right,
  });
  const delta = liveDelta(contract, anchor);
  const markCoin = contract.markCoin > 0 ? contract.markCoin : quote.usd / anchor;
  const mark = markCoin * anchor;
  return `${trim(contract.strike)} ${contract.right === "call" ? "Call" : "Put"} · Δ ${fmtSigned(delta, 2)} · Mark: $${px(mark)} · Θ ${fmtSigned(quote.theta, 2)}/d`;
}

function HedgeBadge({ net }: { net: number }) {
  const hedged = net >= -0.5;
  const body = Math.abs(net).toLocaleString("en-US", { maximumFractionDigits: net >= 100 || net <= -100 ? 0 : 2 });
  return (
    <span className={cn("inline-flex h-8 shrink-0 items-center self-start rounded-full px-2.5 text-[11px] font-semibold", hedged ? "bg-long text-bg" : "bg-short text-bg")}>
      {hedged ? "✅ Gebühr gedeckt" : `⚠️ Noch −$${body} ungedeckt`}
    </span>
  );
}

function RollCompare({ plan }: { plan: FeeRoll }) {
  const pct = Math.round(plan.share * 100);
  return (
    <div className="mt-3 rounded-lg border border-line bg-bg p-3">
      <h3 className="text-sm font-semibold">🔄 Roll bei 55% DD vs. Auslaufen lassen (Nur Challenge-Fee Hedge)</h3>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="text-xs font-semibold text-fg">Spalte A – Bei 55% DD ({px(plan.roll)}) rollen</p>
          <p className="mt-2 font-mono text-xs leading-5 text-muted">
            Realisierter Options-Gewinn: {usd(plan.realized)} · deckt {pct}% der Challenge-Gebühr ({usd(plan.fee)}).
          </p>
          <p className="font-mono text-xs leading-5 text-muted">
            Neuer tieferer Ziel-Strike für die restlichen 45%: {plan.nextStrike == null ? "—" : `$${trim(plan.nextStrike)}`} · Menge {plan.nextQty.toFixed(2)} · zusätzlicher Schutz {usd(plan.nextProfit)}.
          </p>
          <p className="mt-1 font-mono text-xs font-semibold text-long">Gesamt-Cash-Schutz bis zur DD barrier 1: {usd(plan.protection)}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="text-xs font-semibold text-fg">Spalte B – Ohne Rollen bis Expiry halten</p>
          <p className="mt-2 font-mono text-xs leading-5 text-muted">
            Gedeckelter Maximalgewinn der Start-Option: {usd(plan.capped)}.
          </p>
          <p className="font-mono text-xs leading-5 text-muted">
            Ungerollt an der DD barrier ({px(plan.dd)}): {usd(plan.unrolled)}.
          </p>
          <p className={cn("mt-1 font-mono text-xs font-semibold", plan.shortfall > 0.5 ? "text-short" : "text-long")}>
            {plan.shortfall > 0.5 ? `Zur vollen Challenge-Gebühr fehlen ${usd(plan.shortfall)}.` : "Challenge-Gebühr auch ohne Roll gedeckt."}
          </p>
        </div>
      </div>
    </div>
  );
}

function SpreadCards({
  setup,
  legs,
  bars,
  elapsed,
  vol,
  rate,
  thetaDay,
}: {
  setup: PropSetup;
  legs: OptLeg[];
  bars: { dd: number | null; pass: number | null };
  elapsed: number;
  vol: number;
  rate: number;
  thetaDay: number;
}) {
  const fee = Math.max(0, setup.fee);
  const gain = bars.dd != null ? optionsPnlUsd(legs, bars.dd, elapsed, vol, rate, setup.index) : 0;
  const net = gain - fee;
  const hedged = Math.abs(net) <= Math.max(25, fee * 0.03);
  const wing = legs.find((row) => row.on && row.side === "buy");
  const wingCost = wing ? entryPremium(wing, setup.index) * Math.max(0, wing.qty) : 0;
  const week = thetaDay * 7;
  const atPass = bars.pass != null ? optionsPnlUsd(legs, bars.pass, 10_000, 0, 0, setup.index) : 0;
  const loss = Math.max(0, -atPass);
  return (
    <div className="grid gap-2 lg:grid-cols-3">
      <div className="rounded-lg border border-line bg-bg px-3 py-2">
        <p className="text-xs font-semibold text-long">🟢 Bei Breach (DD barrier 1: {bars.dd == null ? "—" : `$${px(bars.dd)}`})</p>
        <p className="mt-1 font-mono text-[11px] leading-5 text-muted">
          Options-Gewinn: {usd(gain)} | Eval-Fee: {usd(-fee)} | Netto: {hedged ? "±$0 (Voll gehedgt)" : usd(net)}
        </p>
      </div>
      <div className="rounded-lg border border-line bg-bg px-3 py-2">
        <p className="text-xs font-semibold" style={{ color: "var(--color-roll)" }}>🟡 Im Seitwärtsmarkt (Theta / Woche)</p>
        <p className="mt-1 font-mono text-[11px] leading-5 text-muted">
          {usd(week)} Zeitwert-Gewinn (OTM-Schutz kostet nur {usd(-wingCost)})
        </p>
      </div>
      <div className="rounded-lg border border-line bg-bg px-3 py-2">
        <p className="text-xs font-semibold text-short">🔴 Bei Eval-Sieg (Pass 1: {bars.pass == null ? "—" : `$${px(bars.pass)}`})</p>
        <p className="mt-1 font-mono text-[11px] leading-5 text-muted">
          Max. Options-Verlust (gedeckelt): {usd(-loss)} | Gesamtkosten für Funded-Account: {usd(-(loss + fee))} (gegen {usd(setup.payout)} Funded-Wert)
        </p>
      </div>
    </div>
  );
}

function usd(n: number): string {
  const sign = n > 0.005 ? "+" : n < -0.005 ? "−" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function usdCoin(coin: number | null | undefined, underlying: number): string {
  const usd = coinToUsd(coin != null && coin > 0 ? coin : null, underlying);
  return usd == null ? "—" : `$${px(usd)}`;
}

function OptionCatalog({
  expiries,
  byExpiry,
  expiry,
  onExpiry,
  listed,
  tickers,
  deltaByName,
  ddStrike,
  index,
  loading,
  fallback,
  onAdd,
}: {
  expiries: string[];
  byExpiry: Map<string, ChainContract[]>;
  expiry: string;
  onExpiry: (expiry: string) => void;
  listed: ChainContract[];
  tickers: Record<string, LiveTicker>;
  deltaByName: Map<string, number>;
  ddStrike: number | null;
  index: number;
  loading: boolean;
  fallback: boolean;
  onAdd: (contract: ChainContract, side: OptSide) => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-line bg-bg p-3">
      <h3 className="pb-head text-sm font-semibold">📋 Verfügbare Live-Optionen auf Deribit auswählen</h3>
      <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
        {expiries.map((item) => {
          const dte = byExpiry.get(item)?.[0]?.dte ?? 0;
          return (
            <button
              key={item}
              type="button"
              className={cn("h-9 shrink-0 rounded-full px-3 text-xs", item === expiry ? "bg-fg text-bg" : "bg-surface text-muted")}
              onClick={() => onExpiry(item)}
            >
              {prettyExpiry(item, dte)}
            </button>
          );
        })}
      </div>
      {loading ? <p className="mt-2 text-xs text-muted">Deribit-Optionen werden geladen…</p> : null}
      {fallback ? <p className="mt-2 text-xs text-muted">Modell-Kette um den Eval-Entry (IV 55% mit Smile). Echte Deribit-Kurse ersetzen sie, sobald sie da sind.</p> : null}
      {!loading && listed.length === 0 ? <p className="mt-2 text-xs text-muted">Für diesen Verfall sind keine Optionen in der Kette.</p> : null}
      <div className="mt-2 max-h-80 space-y-1 overflow-auto">
        {listed.map((contract) => {
          const ticker = tickers[contract.name];
          const delta = ticker && (ticker.iv > 0 || ticker.markCoin > 0) ? ticker.delta : deltaByName.get(contract.name) ?? liveDelta(contract, 0, ticker);
          const underlying = ticker?.underlying || contract.underlying;
          const iv = ticker?.iv || contract.iv;
          const quoteSpot = index > 0 ? index : underlying > 0 ? underlying : 1;
          const quote = quoteOption({
            spot: quoteSpot,
            strike: contract.strike,
            dte: Math.max(contract.dte, 1 / 24),
            ivPct: iv > 1 ? iv : 55,
            ratePct: 0,
            right: contract.right,
          });
          const hot = Math.abs(delta) >= 0.65 && Math.abs(delta) <= 0.75;
          const onBarrier = ddStrike != null && contract.strike === ddStrike;
          return (
            <div key={contract.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line py-2 text-xs">
              <span className="font-mono">{contract.name.startsWith("SYN-") ? `${trim(contract.strike)} ${contract.right === "call" ? "Call" : "Put"}` : contract.name}</span>
              <span>Strike: ${trim(contract.strike)}</span>
              <span className={cn("inline-flex rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold", delta >= 0 ? "bg-long text-bg" : "bg-short text-bg")}>
                🎯 Δ {fmtSigned(delta, 2)}
              </span>
              <span className="font-mono text-muted">
                Mark: {usdCoin(ticker?.markCoin || contract.markCoin, quoteSpot)} (Bid: {usdCoin(ticker?.bidCoin ?? contract.bidCoin, quoteSpot)} / Ask: {usdCoin(ticker?.askCoin ?? contract.askCoin, quoteSpot)})
              </span>
              <span>IV: {iv > 0 ? `${iv.toFixed(1)}%` : "—"}</span>
              <span className="font-mono">Θ {fmtSigned(ticker?.theta || quote.theta, 2)}/d</span>
              {onBarrier ? <span className="rounded-full bg-short px-2 py-0.5 text-[11px] font-semibold text-bg">[🎯 DD-Barrier Strike]</span> : null}
              {hot ? <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-semibold">[🔥 ~70Δ ITM]</span> : null}
              <span className="ml-auto inline-flex gap-1">
                <button type="button" className="h-8 rounded-lg bg-long px-2 text-[11px] font-semibold text-bg" onClick={() => onAdd(contract, "buy")}>+ Buy</button>
                <button type="button" className="h-8 rounded-lg bg-short px-2 text-[11px] font-semibold text-bg" onClick={() => onAdd(contract, "sell")}>− Sell</button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Segment<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (next: T) => void }) {
  return (
    <div className="flex rounded-full bg-bg p-1">
      {options.map(([id, label]) => (
        <button key={id} type="button" className={cn("h-8 rounded-full px-3 text-xs", value === id ? "bg-fg text-bg" : "text-muted")} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-[11px] text-muted">
      {label}
      {children}
    </label>
  );
}

function Stat({ label, value, tone = 0 }: { label: string; value: string; tone?: number }) {
  return (
    <div className="rounded-xl bg-bg px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={cn("mt-1 font-mono text-lg tabular-nums", tone > 1e-8 ? "text-long" : tone < -1e-8 ? "text-short" : "text-fg")}>{value}</p>
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (next: number) => void }) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <input className="mt-1 w-full" type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

const fieldClass = "mt-1 h-10 w-full rounded-xl border border-line bg-bg px-2 text-right font-mono text-sm text-fg disabled:opacity-70";
const cellClass = "h-10 w-full min-w-24 rounded-lg border border-line bg-bg px-2 font-mono text-sm text-fg";

function num(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

function trim(value: number): string {
  if (!Number.isFinite(value)) return "";
  const digits = Math.abs(value) >= 100 ? 2 : 4;
  return String(Math.round(value * 10 ** digits) / 10 ** digits);
}

function clamp(raw: string, min: number, max: number, fallback: number): number {
  if (raw.trim() === "") return min;
  const next = Number(raw);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function px(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtGreek(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 1 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: Math.min(2, digits) });
}

function fmtSigned(n: number, digits: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return sign + n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
