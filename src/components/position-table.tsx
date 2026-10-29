import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useBook } from "@/lib/book-store";
import { fmtCoin, fmtGreek, fmtIv, fmtPremium, fmtPx, fmtUsd } from "@/lib/format";
import type { BookId, Leg } from "@/lib/types";
import { useValuation } from "@/lib/use-valuation";
import { Button, Signed } from "@/components/ui";

export function PositionTable() {
  const unit = useBook((state) => state.unit);
  const ivShift = useBook((state) => state.ivShift);
  const daysForward = useBook((state) => state.daysForward);
  const clear = useBook((state) => state.clear);
  const { currency, settle, book, legs, scenario } = useValuation();
  const [armed, setArmed] = useState(false);
  const stressed = Math.abs(ivShift) > 0 || daysForward > 0.001;
  const linear = settle === "linear";
  const byName = new Map(scenario.rows.map((row) => [row.instrument, row]));

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 2500);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <section className="flex min-h-40 flex-col lg:max-h-56 lg:overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <h2 className="text-sm font-semibold">
          Portfolio
          <span className="ml-2 font-normal text-muted">
            {legs.length} {legs.length === 1 ? "leg" : "legs"}
            {stressed ? " · stressed" : ""}
          </span>
        </h2>
        <Button
          className="h-9"
          tone={armed ? "sell" : "ghost"}
          disabled={legs.length === 0}
          onClick={() => {
            if (!armed) {
              setArmed(true);
              return;
            }
            clear(book);
            setArmed(false);
          }}
        >
          {armed ? "Confirm clear" : "Clear"}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="book w-full min-w-max border-collapse text-left text-xs">
          <thead>
            <tr className="text-faint">
              <th className="px-3 py-2 font-medium">Instrument</th>
              <th className="px-3 py-2 font-medium">Side</th>
              <th className="px-3 py-2 font-medium">Size</th>
              <th className="px-3 py-2 font-medium">Entry</th>
              <th className="px-3 py-2 font-medium">{stressed ? "Theo" : "Mark"}</th>
              <th className="px-3 py-2 font-medium">IV</th>
              <th className="px-3 py-2 font-medium">
                P&L {unit === "usd" ? (linear ? "USDC" : "USD") : currency}
              </th>
              <th className="px-3 py-2 font-medium">Delta</th>
              <th className="px-3 py-2 font-medium">Gamma</th>
              <th className="px-3 py-2 font-medium">Vega</th>
              <th className="px-3 py-2 font-medium">Theta</th>
              <th className="px-3 py-2 font-medium">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {legs.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-sm text-muted">
                  No positions. Buy or sell from the chain, or drop in a template.
                </td>
              </tr>
            ) : (
              legs.map((leg) => {
                const valued = byName.get(leg.instrument);
                const pnl = unit === "usd" ? valued?.pnlUsd ?? 0 : valued?.pnlCoin ?? 0;
                return (
                  <tr key={leg.instrument} className="border-t border-line">
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs">{leg.instrument}</div>
                      <div className={leg.right === "call" ? "text-long" : leg.right === "put" ? "text-short" : "text-muted"}>
                        {leg.right === "call"
                          ? "Call"
                          : leg.right === "put"
                            ? "Put"
                            : leg.perpetual
                              ? "Perpetual"
                              : "Future"}
                        {leg.linear ? " · USDC" : ""}
                      </div>
                    </td>
                    <td className={leg.size > 0 ? "px-3 py-2 text-long" : "px-3 py-2 text-short"}>
                      {leg.size > 0 ? "Long" : "Short"}
                    </td>
                    <td className="px-3 py-2">
                      <SizeField leg={leg} book={book} />
                    </td>
                    <td className="px-3 py-2">
                      <EntryField leg={leg} book={book} />
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {valued
                        ? leg.kind === "future" || leg.linear
                          ? fmtPx(valued.mark)
                          : fmtPremium(valued.mark)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums text-muted">
                      {fmtIv(valued?.iv)}
                    </td>
                    <td className="px-3 py-2">
                      <Signed
                        value={pnl}
                        text={unit === "usd" ? fmtUsd(pnl, true) : fmtCoin(pnl, true)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Signed value={valued?.delta ?? 0} text={fmtGreek(valued?.delta ?? 0, true)} />
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums text-muted">
                      {fmtGreek(valued?.gamma ?? 0, true)}
                    </td>
                    <td className="px-3 py-2">
                      <Signed value={valued?.vega ?? 0} text={fmtUsd(valued?.vega ?? 0, true)} />
                    </td>
                    <td className="px-3 py-2">
                      <Signed value={valued?.theta ?? 0} text={fmtUsd(valued?.theta ?? 0, true)} />
                    </td>
                    <td className="px-3 py-2">
                      <Remove leg={leg} book={book} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SizeField({ leg, book }: { leg: Leg; book: BookId }) {
  const setSize = useBook((state) => state.setSize);
  const [text, setText] = useState(String(leg.size));
  useEffect(() => setText(String(leg.size)), [leg.size]);
  return (
    <input
      className="h-11 w-24 rounded-xl border border-line bg-bg px-2 text-right font-mono text-base tabular-nums"
      value={text}
      inputMode="decimal"
      aria-label={`Size for ${leg.instrument}`}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        const next = Number(text);
        if (Number.isFinite(next)) setSize(book, leg.instrument, next);
        else setText(String(leg.size));
      }}
    />
  );
}

function EntryField({ leg, book }: { leg: Leg; book: BookId }) {
  const setEntry = useBook((state) => state.setEntry);
  const [text, setText] = useState(String(leg.entry));
  useEffect(() => setText(String(leg.entry)), [leg.entry]);
  return (
    <input
      className="h-11 w-28 rounded-xl border border-line bg-bg px-2 text-right font-mono text-base tabular-nums"
      value={text}
      inputMode="decimal"
      aria-label={`Entry for ${leg.instrument}`}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        const next = Number(text);
        if (!Number.isFinite(next) || (leg.kind === "future" && !(next > 0))) {
          setText(String(leg.entry));
          return;
        }
        setEntry(book, leg.instrument, next);
      }}
    />
  );
}

function Remove({ leg, book }: { leg: Leg; book: BookId }) {
  const remove = useBook((state) => state.remove);
  return (
    <button
      type="button"
      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted hover:text-short"
      aria-label={`Remove ${leg.instrument}`}
      onClick={() => remove(book, leg.instrument)}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
