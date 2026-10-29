import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useBook } from "@/lib/book-store";
import { fmtDelta, fmtDte, fmtExpiry, fmtIndex, fmtIv, fmtPremium, fmtPx, fmtUsd, instrumentDate } from "@/lib/format";
import { useMarket } from "@/lib/market-store";
import { optionDelta } from "@/lib/pricing";
import { TEMPLATES, buildTemplate } from "@/lib/templates";
import { bookId, type Currency, type Instrument, type Right } from "@/lib/types";
import { Button, fieldClass } from "@/components/ui";
import { cn } from "@/lib/cn";

type Kind = "option" | "future";

export function BuilderPanel() {
  const currency = useBook((state) => state.currency);
  const settle = useBook((state) => state.settle);
  const book = bookId(currency, settle);
  const linear = settle === "linear";
  const addLeg = useBook((state) => state.addLeg);
  const setPreview = useBook((state) => state.setPreview);
  const instruments = useMarket((state) => state.instruments);
  const quotes = useMarket((state) => state.quotes);
  const index = useMarket((state) => state.index);
  const now = useMarket((state) => state.now);
  const status = useMarket((state) => state.status);
  const source = useMarket((state) => state.source);
  const feedError = useMarket((state) => state.error);

  const [kind, setKind] = useState<Kind>("option");
  const [expiry, setExpiry] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [allStrikes, setAllStrikes] = useState(false);
  const [amount, setAmount] = useState("1");
  const [notional, setNotional] = useState(false);
  const [price, setPrice] = useState("");
  const [priceDirty, setPriceDirty] = useState(false);
  const [custom, setCustom] = useState({
    right: "call" as Right,
    strike: "",
    date: "",
    iv: "50",
    premium: "",
  });
  const atmRef = useRef<HTMLDivElement | null>(null);
  const spotRef = useRef<HTMLDivElement | null>(null);
  const chainRef = useRef<HTMLDivElement | null>(null);

  const expiries = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of instruments) {
      if (item.kind === "option" && item.expiry) map.set(item.expiry, item.settlement);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [instruments]);

  useEffect(() => {
    if (expiry && expiries.some(([ts]) => ts === expiry)) return;
    const pick =
      expiries.find(([ts]) => ts - now > 7 * 86_400_000)?.[0] ??
      expiries.find(([ts]) => ts - now > 6 * 3_600_000)?.[0] ??
      expiries[0]?.[0] ??
      null;
    setExpiry(pick);
    setSelected(null);
  }, [expiries, expiry, now]);

  const chain = useMemo(() => {
    const map = new Map<number, { call?: Instrument; put?: Instrument }>();
    for (const item of instruments) {
      if (item.kind !== "option" || item.expiry !== expiry || item.strike == null) continue;
      const row = map.get(item.strike) ?? {};
      if (item.right === "call") row.call = item;
      else row.put = item;
      map.set(item.strike, row);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([strike, sides]) => ({ strike, ...sides }));
  }, [instruments, expiry]);

  const atm = useMemo(() => {
    if (!chain.length || !(index > 0)) return null;
    return chain.reduce((best, row) =>
      Math.abs(row.strike - index) < Math.abs(best.strike - index) ? row : best,
    ).strike;
  }, [chain, index]);

  const shown = chain.filter((row) => {
    if (query && !String(row.strike).startsWith(query.trim())) return false;
    if (allStrikes || !(index > 0)) return true;
    const oi =
      (quotes[row.call?.name ?? ""]?.oi ?? 0) + (quotes[row.put?.name ?? ""]?.oi ?? 0);
    return Math.abs(row.strike - index) / index <= 0.4 || oi > 0;
  });

  const spotAnchor =
    !(index > 0) || shown.length === 0
      ? null
      : (shown.find((row) => row.strike >= index)?.strike ?? -1);

  useEffect(() => {
    const row = spotRef.current ?? atmRef.current;
    const scroller = chainRef.current;
    if (!row || !scroller) return;
    scroller.scrollTop = Math.max(0, row.offsetTop - scroller.clientHeight / 2);
  }, [expiry, currency, spotAnchor]);

  const futures = instruments.filter((item) => item.kind === "future");
  const selectedInst = instruments.find((item) => item.name === selected) ?? null;
  const selectedQuote = selected ? quotes[selected] : undefined;

  useEffect(() => {
    if (!selected || priceDirty) return;
    if (selectedQuote && selectedQuote.mark > 0) {
      setPrice(selectedInst?.kind === "future" ? String(selectedQuote.mark) : String(selectedQuote.mark));
    }
  }, [selected, selectedQuote, priceDirty, selectedInst?.kind]);

  const ticketRef = useRef<HTMLDivElement | null>(null);

  function contractUnit(): number {
    const size = selectedInst?.contractSize && selectedInst.contractSize > 0 ? selectedInst.contractSize : 1;
    return size * index;
  }

  function orderQty(): number {
    const raw = Math.abs(Number(amount));
    if (!(raw > 0)) return 0;
    const pricingKind = selectedInst?.kind ?? kind;
    if (notional && linear && pricingKind === "option") {
      const unit = contractUnit();
      return unit > 0 ? raw / unit : 0;
    }
    return raw;
  }

  useEffect(() => {
    if (!linear) setNotional(false);
  }, [linear]);

  useEffect(() => {
    if (!selectedInst) {
      setPreview(null);
      return;
    }
    const qty = orderQty();
    const px = Number(price);
    if (!(qty > 0) || price.trim() === "" || !Number.isFinite(px)) {
      setPreview(null);
      return;
    }
    setPreview({
      instrument: selectedInst.name,
      kind: selectedInst.kind,
      right: selectedInst.right,
      strike: selectedInst.strike,
      expiry: selectedInst.expiry,
      perpetual: selectedInst.perpetual,
      contractSize: selectedInst.contractSize,
      size: qty,
      entry: px,
      iv: selectedQuote?.iv ?? 0,
      forward: selectedQuote?.underlying || index,
      linear: selectedInst.linear,
    });
  }, [
    selectedInst,
    amount,
    price,
    notional,
    index,
    linear,
    kind,
    selectedQuote?.iv,
    selectedQuote?.underlying,
    setPreview,
  ]);

  useEffect(() => () => setPreview(null), [setPreview]);

  function choose(name: string) {
    setSelected(name);
    setPriceDirty(false);
    const quote = quotes[name];
    if (quote) setPrice(String(quote.mark));
    requestAnimationFrame(() => {
      ticketRef.current?.scrollIntoView({ block: "nearest" });
    });
  }

  function commit(sign: 1 | -1) {
    if (!selectedInst) {
      toast.error("Select an instrument");
      return;
    }
    const qty = orderQty();
    const px = Number(price);
    if (notional && linear && !(index > 0)) {
      toast.error("Waiting for the index to convert USDC into contracts");
      return;
    }
    if (!(qty > 0) || !Number.isFinite(px)) {
      toast.error("Enter a size and a price");
      return;
    }
    if (selectedInst.kind === "future" && !(px > 0)) {
      toast.error("Future entry has to be above zero");
      return;
    }
    const quote = quotes[selectedInst.name];
    addLeg(book, {
      instrument: selectedInst.name,
      kind: selectedInst.kind,
      right: selectedInst.right,
      strike: selectedInst.strike,
      expiry: selectedInst.expiry,
      perpetual: selectedInst.perpetual,
      contractSize: selectedInst.contractSize,
      size: sign * qty,
      entry: px,
      iv: quote?.iv ?? 0,
      forward: quote?.underlying || index,
      linear: selectedInst.linear,
    });
    toast.success(`${sign > 0 ? "Long" : "Short"} ${qty} ${selectedInst.name}`);
  }

  function applyTemplate(id: (typeof TEMPLATES)[number]["id"]) {
    const qty = orderQty();
    const built = buildTemplate({
      id,
      currency,
      expiry,
      instruments,
      quotes,
      index,
      amount: qty,
    });
    if (typeof built === "string") {
      toast.error(built);
      return;
    }
    for (const leg of built) addLeg(book, leg);
    toast.success(`${built.length} legs added`);
  }

  function addCustom() {
    const strike = Number(custom.strike);
    const iv = Number(custom.iv);
    const premium = Number(custom.premium);
    const qty = Math.abs(Number(amount));
    if (!(strike > 0) || !(iv > 0) || !Number.isFinite(premium) || !(qty > 0) || !custom.date) {
      toast.error("Custom option needs strike, date, IV and premium");
      return;
    }
    const [year, month, day] = custom.date.split("-").map(Number);
    if (!year || !month || !day) return;
    const expiryTs = Date.UTC(year, month - 1, day, 8, 0, 0);
    const prefix = linear ? `${currency}_USDC` : currency;
    const name = `${prefix}-${instrumentDate(expiryTs)}-${custom.strike}-${custom.right === "call" ? "C" : "P"}`;
    const listed = instruments.find((item) => item.name === name);
    addLeg(book, {
      instrument: name,
      kind: "option",
      right: custom.right,
      strike,
      expiry: expiryTs,
      perpetual: false,
      contractSize: listed?.contractSize ?? 1,
      size: qty,
      entry: premium,
      iv,
      forward: index,
      linear,
    });
    toast.success(`Long ${qty} ${name}`);
  }

  const loading = status !== "offline" && instruments.length === 0;

  return (
    <div className="flex min-w-0 flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Add leg</h2>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-bg p-1">
          {(["option", "future"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setKind(item);
                setSelected(null);
                setPriceDirty(false);
              }}
              className={cn(
                "h-9 rounded-full px-3 text-sm capitalize",
                kind === item ? "bg-fg text-bg" : "text-muted",
              )}
            >
              {item === "option" ? "Options" : "Futures"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="rounded-xl bg-bg px-3 py-4 text-sm text-muted">
          Loading the {currency}
          {linear ? " USDC" : ""} book…
          {feedError ? <span className="mt-1 block text-short">{feedError}</span> : null}
        </p>
      ) : null}
      {source === "derive" && instruments.length > 0 ? (
        <p className="text-xs text-muted">
          Derive backup. {linear ? "USDC marks." : "USDC premiums converted to coin."} Deribit did not connect.
        </p>
      ) : null}
      {!loading && instruments.length === 0 && feedError ? (
        <p className="rounded-xl bg-bg px-3 py-4 text-sm text-short">{feedError}</p>
      ) : null}

      {kind === "option" ? (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Expiry
            <select
              className={fieldClass}
              value={expiry ?? ""}
              onChange={(event) => {
                setExpiry(Number(event.target.value));
                setSelected(null);
                setPriceDirty(false);
              }}
              aria-label="Expiry"
            >
              {expiries.length === 0 ? <option value="">No expiries</option> : null}
              {expiries.map(([ts, settlement]) => (
                <option key={ts} value={ts}>
                  {fmtExpiry(ts)} · {fmtDte(ts, now)}
                  {settlement ? ` · ${settlement}` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <input
              className={fieldClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter strike"
              inputMode="decimal"
              aria-label="Filter strikes"
            />
            <Button
              className="shrink-0"
              tone={allStrikes ? "accent" : "ghost"}
              onClick={() => setAllStrikes((value) => !value)}
            >
              {allStrikes ? "All" : "Near"}
            </Button>
          </div>

          <div ref={chainRef} className="relative min-w-0 overflow-x-auto rounded-xl bg-bg">
            <div className="sticky top-0 z-10 border-b border-line bg-bg">
              <div className="grid grid-cols-2 px-2 py-2 text-xs text-faint">
                <span>Call</span>
                <span className="text-right">Put</span>
              </div>
              <div className="flex items-center justify-center gap-2 border-t border-accent bg-raised px-2 py-1 font-mono text-xs">
                <span className="text-accent">{currency}</span>
                <span className="text-fg">{index > 0 ? fmtIndex(index) : "—"}</span>
                <span className="text-muted">index</span>
              </div>
            </div>
            {shown.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">No strikes match.</p>
            ) : (
              shown.map((row) => {
                const callQ = row.call ? quotes[row.call.name] : undefined;
                const putQ = row.put ? quotes[row.put.name] : undefined;
                const forward = callQ?.underlying || putQ?.underlying || index;
                const callDelta = row.call
                  ? optionDelta({
                      forward,
                      strike: row.strike,
                      expiry: row.call.expiry ?? 0,
                      now,
                      ivPct: callQ?.iv ?? 0,
                      right: "call",
                    })
                  : null;
                const putDelta = row.put
                  ? optionDelta({
                      forward,
                      strike: row.strike,
                      expiry: row.put.expiry ?? 0,
                      now,
                      ivPct: putQ?.iv ?? 0,
                      right: "put",
                    })
                  : null;
                return (
                  <div key={row.strike} className="contents">
                    {index > 0 && row.strike >= index && (shown[0] === row || shown[shown.indexOf(row) - 1]!.strike < index) ? (
                      <div
                        ref={spotRef}
                        className="flex items-center gap-2 border-t border-accent bg-raised px-2 py-1.5"
                      >
                        <span className="h-px flex-1 bg-accent" />
                        <span className="font-mono text-xs text-accent">
                          {currency} {fmtIndex(index)}
                        </span>
                        <span className="h-px flex-1 bg-accent" />
                      </div>
                    ) : null}
                    <div
                      ref={row.strike === atm ? atmRef : undefined}
                      className={cn(
                        "grid grid-cols-2 border-t border-line",
                        row.strike === atm && "bg-surface",
                      )}
                    >
                    <ChainSide
                      active={selected === row.call?.name}
                      iv={callQ?.iv}
                      mark={callQ?.mark}
                      linear={linear}
                      align="left"
                      strike={row.strike}
                      delta={callDelta}
                      disabled={!row.call}
                      onClick={() => row.call && choose(row.call.name)}
                    />
                    <ChainSide
                      active={selected === row.put?.name}
                      iv={putQ?.iv}
                      mark={putQ?.mark}
                      linear={linear}
                      align="right"
                      strike={row.strike}
                      delta={putDelta}
                      disabled={!row.put}
                      onClick={() => row.put && choose(row.put.name)}
                    />
                  </div>
                  </div>
                );
              })
            )}
            {index > 0 && shown.length > 0 && shown[shown.length - 1]!.strike < index ? (
              <div
                ref={spotRef}
                className="flex items-center gap-2 border-t border-accent bg-raised px-2 py-1.5"
              >
                <span className="h-px flex-1 bg-accent" />
                <span className="font-mono text-xs text-accent">
                  {currency} {fmtIndex(index)}
                </span>
                <span className="h-px flex-1 bg-accent" />
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="max-h-80 overflow-auto rounded-xl bg-bg">
          {futures.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted">No futures yet.</p>
          ) : (
            futures.map((item) => {
              const quote = quotes[item.name];
              const basis = quote && index > 0 ? quote.mark - index : null;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => choose(item.name)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 border-b border-line px-3 py-3 text-left last:border-b-0",
                    selected === item.name ? "bg-raised" : "hover:bg-surface",
                  )}
                >
                  <span>
                    <span className="block text-sm">
                      {item.perpetual ? "Perpetual" : fmtExpiry(item.expiry ?? 0)}
                    </span>
                    <span className="font-mono text-xs text-faint">{item.name}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-sm tabular-nums">
                      {quote ? fmtPx(quote.mark) : "—"}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {basis == null
                        ? linear
                          ? "USDC settled"
                          : item.contractSize === 1
                            ? "1 USD"
                            : `${item.contractSize} USD`
                        : `${basis >= 0 ? "+" : ""}${fmtPx(basis)} vs index`}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      <div ref={ticketRef}>
        <Ticket
          name={selectedInst?.name ?? null}
          amount={amount}
          price={price}
          kind={selectedInst?.kind ?? kind}
          linear={selectedInst?.linear ?? linear}
          quote={selectedQuote}
          disabled={!selectedInst}
          notional={notional && linear && (selectedInst?.kind ?? kind) === "option"}
          contractSize={selectedInst?.contractSize ?? 1}
          currency={currency}
          index={index}
          onNotional={(next) => {
            if (next === notional) return;
            const raw = Math.abs(Number(amount));
            const unit = (selectedInst?.contractSize && selectedInst.contractSize > 0 ? selectedInst.contractSize : 1) * index;
            if (raw > 0 && unit > 0) {
              const converted = next ? raw * unit : raw / unit;
              const factor = next ? 100 : 10000;
              setAmount(String(Math.round(converted * factor) / factor));
            }
            setNotional(next);
          }}
          onAmount={setAmount}
          onPrice={(value) => {
            setPriceDirty(true);
            setPrice(value);
          }}
          onMark={() => {
            if (!selectedQuote) return;
            setPriceDirty(false);
            setPrice(String(selectedQuote.mark));
          }}
          onBid={() => {
            if (selectedQuote?.bid == null) return;
            setPriceDirty(true);
            setPrice(String(selectedQuote.bid));
          }}
          onAsk={() => {
            if (selectedQuote?.ask == null) return;
            setPriceDirty(true);
            setPrice(String(selectedQuote.ask));
          }}
          onBuy={() => commit(1)}
          onSell={() => commit(-1)}
        />
      </div>

      <div>
        <p className="mb-2 text-xs text-muted">Templates use the size above and live marks</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((template) => (
            <Button key={template.id} onClick={() => applyTemplate(template.id)}>
              {template.label}
            </Button>
          ))}
        </div>
      </div>

      <details className="rounded-xl bg-bg px-3 py-2">
        <summary className="text-sm">Custom option</summary>
        <div className="mt-3 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            {(["call", "put"] as const).map((right) => (
              <Button
                key={right}
                tone={custom.right === right ? "accent" : "ghost"}
                onClick={() => setCustom((value) => ({ ...value, right }))}
              >
                {right === "call" ? "Call" : "Put"}
              </Button>
            ))}
          </div>
          <input
            className={fieldClass}
            placeholder="Strike"
            inputMode="decimal"
            aria-label="Custom strike"
            value={custom.strike}
            onChange={(event) => setCustom((value) => ({ ...value, strike: event.target.value }))}
          />
          <input
            className={fieldClass}
            type="date"
            aria-label="Custom expiry"
            value={custom.date}
            onChange={(event) => setCustom((value) => ({ ...value, date: event.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={fieldClass}
              placeholder="IV %"
              inputMode="decimal"
              aria-label="Custom implied volatility"
              value={custom.iv}
              onChange={(event) => setCustom((value) => ({ ...value, iv: event.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder={linear ? "Premium USDC" : "Premium"}
              inputMode="decimal"
              aria-label={linear ? "Custom premium in USDC" : "Custom premium in coin"}
              value={custom.premium}
              onChange={(event) => setCustom((value) => ({ ...value, premium: event.target.value }))}
            />
          </div>
          <Button tone="accent" onClick={addCustom}>
            Add custom long
          </Button>
        </div>
      </details>
    </div>
  );
}

function ChainSide({
  active,
  iv,
  mark,
  linear,
  align,
  strike,
  delta,
  disabled,
  onClick,
}: {
  active: boolean;
  iv?: number;
  mark?: number;
  linear: boolean;
  align: "left" | "right";
  strike: number;
  delta: number | null;
  disabled: boolean;
  onClick: () => void;
}) {
  const price = mark == null ? "—" : linear ? fmtPx(mark) : fmtPremium(mark);
  const tone = align === "left" ? "text-long" : "text-short";
  const side = align === "left" ? "Call" : "Put";
  const strikeLabel = (
    <span className={cn("shrink-0 leading-tight", align === "left" ? "text-left" : "text-right")}>
      <span className="block text-sm text-fg">{fmtPx(strike)}</span>
      <span className={cn("block text-xs", tone)}>{fmtDelta(delta)}</span>
    </span>
  );
  const quote = (
    <span className={cn("min-w-0 leading-tight", align === "right" && "text-right")}>
      <span className={cn("block", tone)}>{price}</span>
      <span className="block text-faint">{fmtIv(iv)}</span>
    </span>
  );
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`${side} ${fmtPx(strike)}`}
      className={cn(
        "flex min-h-12 items-center justify-between gap-2 border-line px-2 py-1.5 font-mono text-xs tabular-nums hover:bg-raised disabled:cursor-not-allowed disabled:opacity-30",
        align === "left" && "border-r",
        active && "bg-raised outline outline-1 -outline-offset-1 outline-accent",
      )}
    >
      {align === "left" ? (
        <>
          {strikeLabel}
          {quote}
        </>
      ) : (
        <>
          {quote}
          {strikeLabel}
        </>
      )}
    </button>
  );
}

function Ticket({
  name,
  amount,
  price,
  kind,
  linear,
  quote,
  disabled,
  notional,
  contractSize,
  currency,
  index,
  onNotional,
  onAmount,
  onPrice,
  onMark,
  onBid,
  onAsk,
  onBuy,
  onSell,
}: {
  name: string | null;
  amount: string;
  price: string;
  kind: Kind;
  linear: boolean;
  quote?: { bid: number | null; ask: number | null; mark: number; iv: number };
  disabled: boolean;
  notional: boolean;
  contractSize: number;
  currency: Currency;
  index: number;
  onNotional: (notional: boolean) => void;
  onAmount: (value: string) => void;
  onPrice: (value: string) => void;
  onMark: () => void;
  onBid: () => void;
  onAsk: () => void;
  onBuy: () => void;
  onSell: () => void;
}) {
  const qty = Math.abs(Number(amount));
  const unitNotional = (contractSize > 0 ? contractSize : 1) * index;
  const contracts = notional && unitNotional > 0 ? qty / unitNotional : qty;
  const coinSize = contracts * (contractSize > 0 ? contractSize : 1);
  const presets = notional
    ? ["250", "1000", "5000", "10000"]
    : kind === "future"
      ? linear
        ? ["0.1", "0.5", "1", "5"]
        : ["100", "1000", "5000", "10000"]
      : linear
        ? ["0.1", "1", "5", "10"]
        : ["1", "5", "10", "25"];

  return (
    <div className="grid gap-2 rounded-xl bg-bg p-3">
      <p className={cn("font-mono text-sm", name ? "text-fg" : "text-muted")}>
        {name ?? "Click a strike to select the call or the put"}
      </p>
      {linear && kind === "option" ? (
        <div className="grid grid-cols-2 gap-1 rounded-full bg-bg p-1">
          <button
            type="button"
            onClick={() => onNotional(false)}
            className={cn("h-9 rounded-full px-3 text-sm", !notional ? "bg-fg text-bg" : "text-muted")}
          >
            Contracts
          </button>
          <button
            type="button"
            onClick={() => onNotional(true)}
            className={cn("h-9 rounded-full px-3 text-sm", notional ? "bg-fg text-bg" : "text-muted")}
          >
            USDC
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button key={preset} className="min-w-11 px-2" onClick={() => onAmount(preset)}>
            {preset}
          </Button>
        ))}
      </div>
      <label className="grid gap-1 text-xs text-muted">
        {kind === "future"
          ? linear
            ? `Size (${currency})`
            : `Contracts · ${contractSize} USD each`
          : notional
            ? "Size (USDC notional)"
            : linear
              ? `Contracts · ${contractSize} ${currency} each`
              : "Contracts (coin)"}
        <input
          className={fieldClass}
          value={amount}
          onChange={(event) => onAmount(event.target.value)}
          inputMode="decimal"
          aria-label="Amount"
        />
      </label>
      {notional && index > 0 && qty > 0 ? (
        <p className="font-mono text-xs text-faint">
          ≈ {contracts.toLocaleString("en-US", { maximumFractionDigits: 4 })} contracts · {coinSize.toLocaleString("en-US", { maximumFractionDigits: 4 })} {currency}
        </p>
      ) : kind === "future" && index > 0 && qty > 0 ? (
        <p className="font-mono text-xs text-faint">
          {linear ? `≈ ${fmtUsd(qty * index)} notional` : `≈ ${((qty * contractSize) / index).toFixed(3)} coin notional`}
        </p>
      ) : kind === "option" && linear && !notional && qty > 0 ? (
        <p className="font-mono text-xs text-faint">
          ≈ {coinSize.toLocaleString("en-US", { maximumFractionDigits: 4 })} {currency}
          {index > 0 ? ` · ${fmtUsd(coinSize * index)}` : ""}
        </p>
      ) : null}
      <label className="grid gap-1 text-xs text-muted">
        {kind === "future" ? "Entry price (USD)" : linear ? "Entry premium (USDC)" : "Entry premium (coin)"}
        <input
          className={fieldClass}
          value={price}
          onChange={(event) => onPrice(event.target.value)}
          inputMode="decimal"
          aria-label="Entry price"
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <Button onClick={onBid} disabled={quote?.bid == null}>
          Bid
        </Button>
        <Button onClick={onMark} disabled={!quote}>
          Mark
        </Button>
        <Button onClick={onAsk} disabled={quote?.ask == null}>
          Ask
        </Button>
      </div>
      {quote && kind === "option" ? (
        <p className="font-mono text-xs text-faint">Live IV {fmtIv(quote.iv)}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button tone="buy" disabled={disabled} onClick={onBuy}>
          Buy
        </Button>
        <Button tone="sell" disabled={disabled} onClick={onSell}>
          Sell
        </Button>
      </div>
      <p className="text-xs text-faint">Simulated leg only. Nothing is sent to the exchange.</p>
    </div>
  );
}
