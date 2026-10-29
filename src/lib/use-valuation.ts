import { useMemo } from "react";
import { activeBook, useBook } from "@/lib/book-store";
import { useMarket } from "@/lib/market-store";
import { valueBook } from "@/lib/pricing";

export function useValuation() {
  const currency = useBook((state) => state.currency);
  const settle = useBook((state) => state.settle);
  const book = activeBook({ currency, settle });
  const legs = useBook((state) => state.books[book]);
  const ivShift = useBook((state) => state.ivShift);
  const daysForward = useBook((state) => state.daysForward);
  const cash = useBook((state) => state.cash[book]);
  const index = useMarket((state) => state.index);
  const quotes = useMarket((state) => state.quotes);
  const now = useMarket((state) => state.now);

  return useMemo(() => {
    const shared = { indexNow: index, indexSim: index, now, quotes };
    const scenario = valueBook(legs, {
      ...shared,
      daysForward,
      ivShift,
      atExpiry: false,
    });
    const live = valueBook(legs, {
      ...shared,
      daysForward: 0,
      ivShift: 0,
      atExpiry: false,
    });
    return { currency, settle, book, legs, cash, index, scenario, live, ivShift, daysForward, now };
  }, [currency, settle, book, legs, cash, index, quotes, now, ivShift, daysForward]);
}