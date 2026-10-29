import { useSyncExternalStore } from "react";
import { Signed } from "@/components/ui";
import { useBook } from "@/lib/book-store";
import { fmtUsd } from "@/lib/format";
import { formatLeverage, getLoopSettings, LOOP_FALLBACK, loopKpis, referenceEntry, subscribeLoop, withEntry } from "@/lib/hydra-loop";
import { useMarket } from "@/lib/market-store";

export function HydraKpis({ percentMode }: { percentMode: boolean }) {
  const currency = useBook((state) => state.currency);
  const accounts = useBook((state) => state.props[currency]);
  const index = useMarket((state) => state.index);
  const settings = useSyncExternalStore(subscribeLoop, getLoopSettings, () => LOOP_FALLBACK);
  const entry = referenceEntry(percentMode, index, settings.entry);
  const kpis = loopKpis(accounts.map((account) => withEntry(account, entry)), entry, settings.sl, settings.side);

  const cells = [
    {
      label: "Gesamtkosten Evals",
      value: fmtUsd(kpis.costs),
      tone: 0,
      hint: kpis.wonCount ? `${kpis.wonCount} Challenges` : "Keine aktive Eval",
    },
    {
      label: `Netto bei ${kpis.failMove >= 0 ? "+" : ""}${kpis.failMove.toFixed(2)}%`,
      value: fmtUsd(kpis.netAtFail, true),
      tone: kpis.netAtFail,
      hint: "Payout nach Split und Fee, minus Eval-Kosten",
    },
    {
      label: "Funded-Restpuffer bei Eval-Pass",
      value: fmtUsd(kpis.bufferAtPass, true),
      tone: kpis.alive ? 1 : -1,
      hint: `Pass bei ${kpis.passMove.toFixed(2)}% · ${kpis.alive ? "überlebt" : "Drawdown gerissen"}`,
    },
    {
      label: "Hebel",
      value: `${formatLeverage(kpis.evalLeverage)} · ${formatLeverage(kpis.fundedLeverage)}`,
      tone: 0,
      hint: "Evals gegen Funded",
    },
    {
      label: "Account-Wert bei Sieg",
      value: kpis.wonCount ? `${kpis.wonCount}× · ${fmtUsd(kpis.wonBuffer)}` : "—",
      tone: kpis.wonCount ? 1 : 0,
      hint: "Neue Funded-Konten und ihr frischer Drawdown-Puffer",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {cells.map((cell) => (
        <article key={cell.label} className="card px-4 py-4">
          <p className="text-xs text-muted">{cell.label}</p>
          {cell.label.startsWith("Netto") || cell.label.startsWith("Funded") ? (
            <Signed value={cell.tone} text={cell.value} className="mt-2 block text-2xl" />
          ) : (
            <p className="mt-2 font-mono text-2xl tabular-nums tracking-tight">{cell.value}</p>
          )}
          <p className="mt-2 text-xs text-faint">{cell.hint}</p>
        </article>
      ))}
    </section>
  );
}
