import { create } from "zustand";
import {
  BOOK_IDS,
  CURRENCIES,
  bookId,
  hasInverse,
  type BookId,
  type Currency,
  type Leg,
  type Metric,
  type PropAccount,
  type Settle,
  type Unit,
} from "@/lib/types";

const KEY = "position-builder.v1";

type Books = Record<BookId, Leg[]>;

type Persisted = {
  v: 2;
  currency: Currency;
  settle: Settle;
  books: Books;
  ivShift: number;
  daysForward: number;
  unit: Unit;
  cash: Record<BookId, number>;
  metric: Metric;
  span: number;
  props: Record<Currency, PropAccount[]>;
};

type BookState = Persisted & {
  hydrated: boolean;
  hydrate: () => void;
  setCurrency: (currency: Currency) => void;
  setSettle: (settle: Settle) => void;
  setIvShift: (ivShift: number) => void;
  setDaysForward: (daysForward: number) => void;
  setUnit: (unit: Unit) => void;
  setMetric: (metric: Metric) => void;
  setSpan: (span: number) => void;
  setCash: (book: BookId, cash: number) => void;
  addLeg: (book: BookId, incoming: Leg) => void;
  setSize: (book: BookId, instrument: string, size: number) => void;
  setEntry: (book: BookId, instrument: string, entry: number) => void;
  remove: (book: BookId, instrument: string) => void;
  clear: (book: BookId) => void;
  resetScenario: () => void;
  addProp: (currency: Currency, account: PropAccount) => void;
  patchProp: (currency: Currency, id: string, patch: Partial<PropAccount>) => void;
  removeProp: (currency: Currency, id: string) => void;
  setPropsEnabled: (currency: Currency, enabled: boolean) => void;
  setProps: (currency: Currency, accounts: PropAccount[]) => void;
  clearProps: (currency: Currency) => void;
  /** Selected ticket, drawn on the payoff chart. Not persisted. */
  preview: Leg | null;
  setPreview: (leg: Leg | null) => void;
};

function emptyBooks(): Books {
  const books = {} as Books;
  for (const id of BOOK_IDS) books[id] = [];
  return books;
}

function emptyCash(): Record<BookId, number> {
  const cash = {} as Record<BookId, number>;
  for (const id of BOOK_IDS) cash[id] = 0;
  return cash;
}

function emptyProps(): Record<Currency, PropAccount[]> {
  const props = {} as Record<Currency, PropAccount[]>;
  for (const id of CURRENCIES) props[id] = [];
  return props;
}

function sanitizeProp(raw: unknown): PropAccount | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<PropAccount>;
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  const size = num(row.size);
  const entry = num(row.entry);
  const positionUsd = typeof row.positionUsd === "number" && Number.isFinite(row.positionUsd)
    ? row.positionUsd
    : size * entry;
  if (size === 0 && positionUsd === 0 && num(row.account) === 0) return null;
  const split = Math.min(100, Math.max(0, num(row.split, 80)));
  return {
    id: row.id,
    name: row.name.slice(0, 32) || "Custom",
    enabled: row.enabled !== false,
    phase: row.phase === "challenge" ? "challenge" : "funded",
    size,
    entry,
    account: num(row.account, 100000),
    balance: num(row.balance, 100000),
    ddLimit: num(row.ddLimit, 95000),
    dailyLimit: Math.max(0, num(row.dailyLimit, 0)),
    profitTarget: Math.max(0, num(row.profitTarget, 109000)),
    cost: Math.max(0, num(row.cost, 5000)),
    split,
    positionUsd,
    rtFeePct: Math.min(5, Math.max(0, num(row.rtFeePct, 0))),
    openFeePct: typeof row.openFeePct === "number" && Number.isFinite(row.openFeePct) ? Math.min(5, Math.max(0, row.openFeePct)) : undefined,
    presetId: typeof row.presetId === "string" ? row.presetId : "",
    tag: row.tag === "cooldown" || row.tag === "active" || row.tag === "trader" ? row.tag : "",
  };
}

function sanitizeProps(raw: unknown): Record<Currency, PropAccount[]> {
  const props = emptyProps();
  if (!raw || typeof raw !== "object") return props;
  const src = raw as Partial<Record<string, unknown>>;
  for (const currency of CURRENCIES) {
    const list = src[currency];
    if (!Array.isArray(list)) continue;
    props[currency] = list.map(sanitizeProp).filter((row): row is PropAccount => row != null);
  }
  return props;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as string[]).includes(value);
}

function isSettle(value: unknown): value is Settle {
  return value === "inverse" || value === "linear";
}

function sanitizeLeg(raw: unknown): Leg | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<Leg>;
  if (typeof row.instrument !== "string" || (row.kind !== "option" && row.kind !== "future")) {
    return null;
  }
  const size = num(row.size);
  if (size === 0) return null;
  const linear =
    typeof row.linear === "boolean" ? row.linear : row.instrument.includes("_USDC");
  return {
    instrument: row.instrument,
    kind: row.kind,
    right: row.right === "call" || row.right === "put" ? row.right : undefined,
    strike: row.strike != null ? num(row.strike) : undefined,
    expiry: row.expiry == null ? null : num(row.expiry),
    perpetual: Boolean(row.perpetual),
    contractSize: num(row.contractSize, 1) || 1,
    size,
    entry: num(row.entry),
    iv: num(row.iv),
    forward: num(row.forward),
    linear,
  };
}

function sanitizeBooks(raw: unknown): Books {
  const books = emptyBooks();
  if (!raw || typeof raw !== "object") return books;
  const src = raw as Partial<Record<string, unknown>>;
  for (const id of BOOK_IDS) {
    const list = src[id];
    if (!Array.isArray(list)) continue;
    books[id] = list.map(sanitizeLeg).filter((leg): leg is Leg => leg != null);
  }
  return books;
}

function sanitizeCash(raw: unknown): Record<BookId, number> {
  const cash = emptyCash();
  if (!raw || typeof raw !== "object") return cash;
  const src = raw as Partial<Record<string, unknown>>;
  for (const id of BOOK_IDS) cash[id] = num(src[id]);
  return cash;
}

function net(old: Leg, incoming: Leg): Leg | null {
  const size = old.size + incoming.size;
  if (Math.abs(size) < 1e-9) return null;
  let entry = old.entry;
  const sameWay = old.size === 0 || Math.sign(old.size) === Math.sign(incoming.size);
  if (sameWay) {
    entry = (old.size * old.entry + incoming.size * incoming.entry) / size;
  } else if (Math.abs(incoming.size) > Math.abs(old.size)) {
    entry = incoming.entry;
  }
  return {
    ...old,
    ...incoming,
    size,
    entry,
  };
}

const initial: Persisted = {
  v: 2,
  currency: "ETH",
  settle: "inverse",
  books: emptyBooks(),
  ivShift: 0,
  daysForward: 0,
  unit: "usd",
  cash: emptyCash(),
  metric: "pnl",
  span: 0.35,
  props: emptyProps(),
};

export const useBook = create<BookState>((set) => ({
  ...initial,
  preview: null,
  hydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) {
        set({ hydrated: true });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<Persisted> & { v?: number };
      const currency = isCurrency(parsed.currency) ? parsed.currency : "ETH";
      const settleRaw = isSettle(parsed.settle) ? parsed.settle : "inverse";
      const settle = hasInverse(currency) ? settleRaw : "linear";
      const unit = parsed.unit === "coin" ? "coin" : "usd";
      const metric: Metric =
        parsed.metric === "delta" ||
        parsed.metric === "gamma" ||
        parsed.metric === "vega" ||
        parsed.metric === "theta"
          ? parsed.metric
          : "pnl";
      const span = parsed.span === 0.18 || parsed.span === 0.6 ? parsed.span : 0.35;
      set({
        hydrated: true,
        currency,
        settle,
        books: sanitizeBooks(parsed.books),
        ivShift: num(parsed.ivShift),
        daysForward: Math.max(0, num(parsed.daysForward)),
        unit,
        metric,
        span,
        cash: sanitizeCash(parsed.cash),
        props: sanitizeProps(parsed.props),
      });
    } catch {
      set({ hydrated: true });
    }
  },
  setPreview: (preview) => set({ preview }),
  setCurrency: (currency) =>
    set((state) => ({
      currency,
      settle: hasInverse(currency) ? state.settle : "linear",
    })),
  setSettle: (settle) =>
    set((state) => ({
      settle: settle === "inverse" && !hasInverse(state.currency) ? state.settle : settle,
    })),
  setIvShift: (ivShift) => set({ ivShift }),
  setDaysForward: (daysForward) => set({ daysForward: Math.max(0, daysForward) }),
  setUnit: (unit) => set({ unit }),
  setMetric: (metric) => set({ metric }),
  setSpan: (span) => set({ span }),
  setCash: (book, cash) =>
    set((state) => ({ cash: { ...state.cash, [book]: cash } })),
  addLeg: (book, incoming) =>
    set((state) => {
      const legs = state.books[book];
      const index = legs.findIndex((leg) => leg.instrument === incoming.instrument);
      const next = legs.slice();
      if (index < 0) next.push(incoming);
      else {
        const merged = net(legs[index]!, incoming);
        if (merged) next[index] = merged;
        else next.splice(index, 1);
      }
      return { books: { ...state.books, [book]: next } };
    }),
  setSize: (book, instrument, size) =>
    set((state) => {
      const next = state.books[book].flatMap((leg) => {
        if (leg.instrument !== instrument) return [leg];
        if (!Number.isFinite(size) || size === 0) return [];
        return [{ ...leg, size }];
      });
      return { books: { ...state.books, [book]: next } };
    }),
  setEntry: (book, instrument, entry) =>
    set((state) => ({
      books: {
        ...state.books,
        [book]: state.books[book].map((leg) =>
          leg.instrument === instrument ? { ...leg, entry } : leg,
        ),
      },
    })),
  remove: (book, instrument) =>
    set((state) => ({
      books: {
        ...state.books,
        [book]: state.books[book].filter((leg) => leg.instrument !== instrument),
      },
    })),
  clear: (book) =>
    set((state) => ({
      books: { ...state.books, [book]: [] },
      daysForward: 0,
    })),
  resetScenario: () => set({ ivShift: 0, daysForward: 0 }),
  addProp: (currency, account) =>
    set((state) => ({
      props: { ...state.props, [currency]: [...state.props[currency], account] },
    })),
  patchProp: (currency, id, patch) =>
    set((state) => ({
      props: {
        ...state.props,
        [currency]: state.props[currency].map((account) =>
          account.id === id ? { ...account, ...patch, id: account.id } : account,
        ),
      },
    })),
  removeProp: (currency, id) =>
    set((state) => ({
      props: {
        ...state.props,
        [currency]: state.props[currency].filter((account) => account.id !== id),
      },
    })),
  setPropsEnabled: (currency, enabled) =>
    set((state) => ({
      props: {
        ...state.props,
        [currency]: state.props[currency].map((account) => ({ ...account, enabled })),
      },
    })),
  setProps: (currency, accounts) =>
    set((state) => ({
      props: { ...state.props, [currency]: accounts },
    })),
  clearProps: (currency) =>
    set((state) => ({
      props: { ...state.props, [currency]: [] },
    })),
}));

if (typeof window !== "undefined") {
  useBook.subscribe((state) => {
    if (!state.hydrated) return;
    const payload: Persisted = {
      v: 2,
      currency: state.currency,
      settle: state.settle,
      books: state.books,
      ivShift: state.ivShift,
      daysForward: state.daysForward,
      unit: state.unit,
      cash: state.cash,
      metric: state.metric,
      span: state.span,
      props: state.props,
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  });
}

export function activeBook(state: { currency: Currency; settle: Settle }): BookId {
  return bookId(state.currency, state.settle);
}
