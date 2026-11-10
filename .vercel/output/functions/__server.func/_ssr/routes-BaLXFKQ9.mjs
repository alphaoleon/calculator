import { i as __toESM } from "../_runtime.mjs";
import { J as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { n as Trash2, r as Settings } from "../_libs/lucide-react.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { a as Line, c as ResponsiveContainer, i as Area, l as Tooltip, n as YAxis, o as CartesianGrid, r as XAxis, s as ReferenceLine, t as ComposedChart } from "../_libs/recharts+[...].mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BaLXFKQ9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Coin names are Hyperliquid perp keys. TradFi lives on the xyz HIP-3 dex. */
var LIVE_MARKETS = [
	{
		id: "BTC",
		symbol: "BTC",
		group: "crypto"
	},
	{
		id: "ETH",
		symbol: "ETH",
		group: "crypto"
	},
	{
		id: "SOL",
		symbol: "SOL",
		group: "crypto"
	},
	{
		id: "HYPE",
		symbol: "HYPE",
		group: "crypto"
	},
	{
		id: "BNB",
		symbol: "BNB",
		group: "crypto"
	},
	{
		id: "XRP",
		symbol: "XRP",
		group: "crypto"
	},
	{
		id: "DOGE",
		symbol: "DOGE",
		group: "crypto"
	},
	{
		id: "ADA",
		symbol: "ADA",
		group: "crypto"
	},
	{
		id: "AVAX",
		symbol: "AVAX",
		group: "crypto"
	},
	{
		id: "LINK",
		symbol: "LINK",
		group: "crypto"
	},
	{
		id: "SUI",
		symbol: "SUI",
		group: "crypto"
	},
	{
		id: "TON",
		symbol: "TON",
		group: "crypto"
	},
	{
		id: "LTC",
		symbol: "LTC",
		group: "crypto"
	},
	{
		id: "BCH",
		symbol: "BCH",
		group: "crypto"
	},
	{
		id: "DOT",
		symbol: "DOT",
		group: "crypto"
	},
	{
		id: "NEAR",
		symbol: "NEAR",
		group: "crypto"
	},
	{
		id: "APT",
		symbol: "APT",
		group: "crypto"
	},
	{
		id: "ARB",
		symbol: "ARB",
		group: "crypto"
	},
	{
		id: "OP",
		symbol: "OP",
		group: "crypto"
	},
	{
		id: "UNI",
		symbol: "UNI",
		group: "crypto"
	},
	{
		id: "AAVE",
		symbol: "AAVE",
		group: "crypto"
	},
	{
		id: "TRX",
		symbol: "TRX",
		group: "crypto"
	},
	{
		id: "TIA",
		symbol: "TIA",
		group: "crypto"
	},
	{
		id: "SEI",
		symbol: "SEI",
		group: "crypto"
	},
	{
		id: "INJ",
		symbol: "INJ",
		group: "crypto"
	},
	{
		id: "TAO",
		symbol: "TAO",
		group: "crypto"
	},
	{
		id: "WLD",
		symbol: "WLD",
		group: "crypto"
	},
	{
		id: "kPEPE",
		symbol: "kPEPE",
		group: "crypto"
	},
	{
		id: "Gold",
		symbol: "xyz:GOLD",
		group: "tradfi"
	},
	{
		id: "Silber",
		symbol: "xyz:SILVER",
		group: "tradfi"
	},
	{
		id: "Platin",
		symbol: "xyz:PLATINUM",
		group: "tradfi"
	},
	{
		id: "Palladium",
		symbol: "xyz:PALLADIUM",
		group: "tradfi"
	},
	{
		id: "Öl",
		symbol: "xyz:CL",
		group: "tradfi"
	},
	{
		id: "Brent",
		symbol: "xyz:BRENTOIL",
		group: "tradfi"
	},
	{
		id: "Gas",
		symbol: "xyz:NATGAS",
		group: "tradfi"
	},
	{
		id: "Kupfer",
		symbol: "xyz:COPPER",
		group: "tradfi"
	},
	{
		id: "Nasdaq",
		symbol: "xyz:XYZ100",
		group: "tradfi"
	},
	{
		id: "S&P",
		symbol: "xyz:SP500",
		group: "tradfi"
	},
	{
		id: "NVDA",
		symbol: "xyz:NVDA",
		group: "tradfi"
	},
	{
		id: "TSLA",
		symbol: "xyz:TSLA",
		group: "tradfi"
	},
	{
		id: "AAPL",
		symbol: "xyz:AAPL",
		group: "tradfi"
	},
	{
		id: "MSFT",
		symbol: "xyz:MSFT",
		group: "tradfi"
	},
	{
		id: "GOOGL",
		symbol: "xyz:GOOGL",
		group: "tradfi"
	},
	{
		id: "AMZN",
		symbol: "xyz:AMZN",
		group: "tradfi"
	},
	{
		id: "META",
		symbol: "xyz:META",
		group: "tradfi"
	},
	{
		id: "MSTR",
		symbol: "xyz:MSTR",
		group: "tradfi"
	}
];
var CACHE_KEY = "position-builder.hl-mids.v1";
var memory = {};
/** Mid prices from Hyperliquid. A missing TradFi print keeps the last good price. */
async function fetchLiveQuotes() {
	const [main, xyz] = await Promise.all([loadMids(), loadMids("xyz")]);
	const book = {
		...main,
		...xyz
	};
	const cached = {
		...readCache(),
		...memory
	};
	const out = {};
	for (const market of LIVE_MARKETS) {
		const live = pick(book, market.symbol);
		if (live != null) {
			cached[market.symbol] = live;
			out[market.symbol] = {
				price: live,
				futures: true
			};
		} else if (cached[market.symbol] > 0) out[market.symbol] = {
			price: cached[market.symbol],
			futures: false
		};
	}
	memory = cached;
	try {
		window.localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
	} catch {}
	return out;
}
function pick(book, symbol) {
	const direct = Number(book[symbol]);
	if (direct > 0) return direct;
	const tail = symbol.includes(":") ? symbol.slice(symbol.lastIndexOf(":") + 1) : symbol;
	for (const [key, raw] of Object.entries(book)) {
		if (key !== tail && !key.endsWith(`:${tail}`)) continue;
		const price = Number(raw);
		if (price > 0) return price;
	}
	return null;
}
function readCache() {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.localStorage.getItem(CACHE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
		const out = {};
		for (const [key, value] of Object.entries(parsed)) {
			const price = Number(value);
			if (price > 0) out[key] = price;
		}
		return out;
	} catch {
		return {};
	}
}
async function loadMids(dex) {
	try {
		const response = await fetch("https://api.hyperliquid.xyz/info", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(dex ? {
				type: "allMids",
				dex
			} : { type: "allMids" })
		});
		if (!response.ok) return {};
		const body = await response.json();
		if (!body || typeof body !== "object" || Array.isArray(body)) return {};
		return body;
	} catch {
		return {};
	}
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function Button({ tone = "ghost", className, type = "button", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type,
		className: cn("press inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40", tone === "buy" && "bg-long text-bg hover:opacity-90", tone === "sell" && "bg-short text-bg hover:opacity-90", tone === "accent" && "bg-accent text-on-accent hover:opacity-90", tone === "ghost" && "bg-raised text-fg hover:opacity-90", className),
		...props
	});
}
function Signed({ value, text, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("font-mono tabular-nums", value > 1e-10 ? "text-long" : value < -1e-10 ? "text-short" : "text-muted", className),
		children: text
	});
}
var CURRENCIES$1 = [
	"BTC",
	"ETH",
	"SOL",
	"HYPE"
];
function hasInverse(currency) {
	return currency === "BTC" || currency === "ETH";
}
var BOOK_IDS = [
	"BTC",
	"ETH",
	"BTC-USDC",
	"ETH-USDC",
	"SOL-USDC",
	"HYPE-USDC"
];
function bookParts(id) {
	if (id === "BTC" || id === "ETH") return {
		currency: id,
		settle: "inverse"
	};
	return {
		currency: id.slice(0, -5),
		settle: "linear"
	};
}
var INDEX_NAME = {
	BTC: "btc_usd",
	ETH: "eth_usd",
	"BTC-USDC": "btc_usdc",
	"ETH-USDC": "eth_usdc",
	"SOL-USDC": "sol_usdc",
	"HYPE-USDC": "hype_usdc"
};
var DVOL_INDEX = {
	BTC: "btc_usd",
	ETH: "eth_usd"
};
var KEY = "position-builder.v1";
function emptyBooks() {
	const books = {};
	for (const id of BOOK_IDS) books[id] = [];
	return books;
}
function emptyCash() {
	const cash = {};
	for (const id of BOOK_IDS) cash[id] = 0;
	return cash;
}
function emptyProps() {
	const props = {};
	for (const id of CURRENCIES$1) props[id] = [];
	return props;
}
function sanitizeProp(raw) {
	if (!raw || typeof raw !== "object") return null;
	const row = raw;
	if (typeof row.id !== "string" || typeof row.name !== "string") return null;
	const size = num$5(row.size);
	const entry = num$5(row.entry);
	const positionUsd = typeof row.positionUsd === "number" && Number.isFinite(row.positionUsd) ? row.positionUsd : size * entry;
	if (size === 0 && positionUsd === 0 && num$5(row.account) === 0) return null;
	const split = Math.min(100, Math.max(0, num$5(row.split, 80)));
	return {
		id: row.id,
		name: row.name.slice(0, 32) || "Custom",
		enabled: row.enabled !== false,
		phase: row.phase === "challenge" ? "challenge" : "funded",
		size,
		entry,
		account: num$5(row.account, 1e5),
		balance: num$5(row.balance, 1e5),
		ddLimit: num$5(row.ddLimit, 95e3),
		dailyLimit: Math.max(0, num$5(row.dailyLimit, 0)),
		profitTarget: Math.max(0, num$5(row.profitTarget, 109e3)),
		cost: Math.max(0, num$5(row.cost, 5e3)),
		split,
		positionUsd,
		rtFeePct: Math.min(5, Math.max(0, num$5(row.rtFeePct, 0))),
		openFeePct: typeof row.openFeePct === "number" && Number.isFinite(row.openFeePct) ? Math.min(5, Math.max(0, row.openFeePct)) : void 0,
		presetId: typeof row.presetId === "string" ? row.presetId : "",
		tag: row.tag === "cooldown" || row.tag === "active" || row.tag === "trader" ? row.tag : ""
	};
}
function sanitizeProps(raw) {
	const props = emptyProps();
	if (!raw || typeof raw !== "object") return props;
	const src = raw;
	for (const currency of CURRENCIES$1) {
		const list = src[currency];
		if (!Array.isArray(list)) continue;
		props[currency] = list.map(sanitizeProp).filter((row) => row != null);
	}
	return props;
}
function num$5(value, fallback = 0) {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function isCurrency(value) {
	return typeof value === "string" && CURRENCIES$1.includes(value);
}
function isSettle(value) {
	return value === "inverse" || value === "linear";
}
function sanitizeLeg(raw) {
	if (!raw || typeof raw !== "object") return null;
	const row = raw;
	if (typeof row.instrument !== "string" || row.kind !== "option" && row.kind !== "future") return null;
	const size = num$5(row.size);
	if (size === 0) return null;
	const linear = typeof row.linear === "boolean" ? row.linear : row.instrument.includes("_USDC");
	return {
		instrument: row.instrument,
		kind: row.kind,
		right: row.right === "call" || row.right === "put" ? row.right : void 0,
		strike: row.strike != null ? num$5(row.strike) : void 0,
		expiry: row.expiry == null ? null : num$5(row.expiry),
		perpetual: Boolean(row.perpetual),
		contractSize: num$5(row.contractSize, 1) || 1,
		size,
		entry: num$5(row.entry),
		iv: num$5(row.iv),
		forward: num$5(row.forward),
		linear
	};
}
function sanitizeBooks(raw) {
	const books = emptyBooks();
	if (!raw || typeof raw !== "object") return books;
	const src = raw;
	for (const id of BOOK_IDS) {
		const list = src[id];
		if (!Array.isArray(list)) continue;
		books[id] = list.map(sanitizeLeg).filter((leg) => leg != null);
	}
	return books;
}
function sanitizeCash(raw) {
	const cash = emptyCash();
	if (!raw || typeof raw !== "object") return cash;
	const src = raw;
	for (const id of BOOK_IDS) cash[id] = num$5(src[id]);
	return cash;
}
function net(old, incoming) {
	const size = old.size + incoming.size;
	if (Math.abs(size) < 1e-9) return null;
	let entry = old.entry;
	if (old.size === 0 || Math.sign(old.size) === Math.sign(incoming.size)) entry = (old.size * old.entry + incoming.size * incoming.entry) / size;
	else if (Math.abs(incoming.size) > Math.abs(old.size)) entry = incoming.entry;
	return {
		...old,
		...incoming,
		size,
		entry
	};
}
var initial = {
	v: 2,
	currency: "ETH",
	settle: "inverse",
	books: emptyBooks(),
	ivShift: 0,
	daysForward: 0,
	unit: "usd",
	cash: emptyCash(),
	metric: "pnl",
	span: .35,
	props: emptyProps()
};
var useBook = create((set) => ({
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
			const parsed = JSON.parse(raw);
			const currency = isCurrency(parsed.currency) ? parsed.currency : "ETH";
			const settleRaw = isSettle(parsed.settle) ? parsed.settle : "inverse";
			const settle = hasInverse(currency) ? settleRaw : "linear";
			const unit = parsed.unit === "coin" ? "coin" : "usd";
			const metric = parsed.metric === "delta" || parsed.metric === "gamma" || parsed.metric === "vega" || parsed.metric === "theta" ? parsed.metric : "pnl";
			const span = parsed.span === .18 || parsed.span === .6 ? parsed.span : .35;
			set({
				hydrated: true,
				currency,
				settle,
				books: sanitizeBooks(parsed.books),
				ivShift: num$5(parsed.ivShift),
				daysForward: Math.max(0, num$5(parsed.daysForward)),
				unit,
				metric,
				span,
				cash: sanitizeCash(parsed.cash),
				props: sanitizeProps(parsed.props)
			});
		} catch {
			set({ hydrated: true });
		}
	},
	setPreview: (preview) => set({ preview }),
	setCurrency: (currency) => set((state) => ({
		currency,
		settle: hasInverse(currency) ? state.settle : "linear"
	})),
	setSettle: (settle) => set((state) => ({ settle: settle === "inverse" && !hasInverse(state.currency) ? state.settle : settle })),
	setIvShift: (ivShift) => set({ ivShift }),
	setDaysForward: (daysForward) => set({ daysForward: Math.max(0, daysForward) }),
	setUnit: (unit) => set({ unit }),
	setMetric: (metric) => set({ metric }),
	setSpan: (span) => set({ span }),
	setCash: (book, cash) => set((state) => ({ cash: {
		...state.cash,
		[book]: cash
	} })),
	addLeg: (book, incoming) => set((state) => {
		const legs = state.books[book];
		const index = legs.findIndex((leg) => leg.instrument === incoming.instrument);
		const next = legs.slice();
		if (index < 0) next.push(incoming);
		else {
			const merged = net(legs[index], incoming);
			if (merged) next[index] = merged;
			else next.splice(index, 1);
		}
		return { books: {
			...state.books,
			[book]: next
		} };
	}),
	setSize: (book, instrument, size) => set((state) => {
		const next = state.books[book].flatMap((leg) => {
			if (leg.instrument !== instrument) return [leg];
			if (!Number.isFinite(size) || size === 0) return [];
			return [{
				...leg,
				size
			}];
		});
		return { books: {
			...state.books,
			[book]: next
		} };
	}),
	setEntry: (book, instrument, entry) => set((state) => ({ books: {
		...state.books,
		[book]: state.books[book].map((leg) => leg.instrument === instrument ? {
			...leg,
			entry
		} : leg)
	} })),
	remove: (book, instrument) => set((state) => ({ books: {
		...state.books,
		[book]: state.books[book].filter((leg) => leg.instrument !== instrument)
	} })),
	clear: (book) => set((state) => ({
		books: {
			...state.books,
			[book]: []
		},
		daysForward: 0
	})),
	resetScenario: () => set({
		ivShift: 0,
		daysForward: 0
	}),
	addProp: (currency, account) => set((state) => ({ props: {
		...state.props,
		[currency]: [...state.props[currency], account]
	} })),
	patchProp: (currency, id, patch) => set((state) => ({ props: {
		...state.props,
		[currency]: state.props[currency].map((account) => account.id === id ? {
			...account,
			...patch,
			id: account.id
		} : account)
	} })),
	removeProp: (currency, id) => set((state) => ({ props: {
		...state.props,
		[currency]: state.props[currency].filter((account) => account.id !== id)
	} })),
	setPropsEnabled: (currency, enabled) => set((state) => ({ props: {
		...state.props,
		[currency]: state.props[currency].map((account) => ({
			...account,
			enabled
		}))
	} })),
	setProps: (currency, accounts) => set((state) => ({ props: {
		...state.props,
		[currency]: accounts
	} })),
	clearProps: (currency) => set((state) => ({ props: {
		...state.props,
		[currency]: []
	} }))
}));
if (typeof window !== "undefined") useBook.subscribe((state) => {
	if (!state.hydrated) return;
	const payload = {
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
		props: state.props
	};
	window.localStorage.setItem(KEY, JSON.stringify(payload));
});
function fmtIndex(n) {
	if (!Number.isFinite(n)) return "—";
	return n.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}
function fmtUsd(n, signed = false) {
	if (!Number.isFinite(n)) return "—";
	const a = Math.abs(n);
	const d = a >= 1e4 ? 0 : 2;
	const body = a.toLocaleString("en-US", {
		minimumFractionDigits: d,
		maximumFractionDigits: d
	});
	return `${n < 0 ? "-" : signed && n > 0 ? "+" : ""}$${body}`;
}
var ACCOUNT_SIZES = [
	5e3,
	1e4,
	25e3,
	5e4,
	1e5
];
var EVAL_PRICES = {
	5e3: 20,
	1e4: 40,
	25e3: 95,
	5e4: 180,
	1e5: 330
};
var FIRM_PLATFORMS = [
	"DXtrade",
	"Match-Trader",
	"cTrader",
	"TradeLocker",
	"Eigenes System"
];
var DEFAULT_PRESETS = [
	{
		id: "breakout",
		name: "Breakout",
		makerPct: .035,
		takerPct: .035,
		rtPct: .07,
		split: 80,
		maxDdPct: 3,
		targetPct: 9,
		platform: "Eigenes System",
		wallet: "OneKey #1 · Dolphin Profil 1",
		custom: false
	},
	{
		id: "hypernova",
		name: "Hypernova",
		makerPct: .01,
		takerPct: .04,
		rtPct: .08,
		split: 80,
		maxDdPct: 3,
		targetPct: 9,
		platform: "Eigenes System",
		wallet: "OneKey #2 · Dolphin Profil 2",
		custom: false
	},
	{
		id: "cashed",
		name: "cashed.fun",
		makerPct: .02,
		takerPct: .05,
		rtPct: .1,
		split: 80,
		maxDdPct: 3,
		targetPct: 9,
		platform: "Eigenes System",
		wallet: "OneKey #3 · Dolphin Profil 3",
		custom: false
	},
	{
		id: "iceberg",
		name: "iceberg.cash",
		makerPct: .02,
		takerPct: .05,
		rtPct: .1,
		split: 80,
		maxDdPct: 3,
		targetPct: 9,
		platform: "Eigenes System",
		wallet: "OneKey #4 · Dolphin Profil 4",
		custom: false
	},
	{
		id: "propr",
		name: "propr",
		makerPct: .02,
		takerPct: .05,
		rtPct: .1,
		split: 80,
		maxDdPct: 3,
		targetPct: 9,
		platform: "Eigenes System",
		wallet: "OneKey #5 · Dolphin Profil 5",
		custom: false
	},
	{
		id: "bungee",
		name: "bungee",
		makerPct: .02,
		takerPct: .05,
		rtPct: .1,
		split: 80,
		maxDdPct: 3,
		targetPct: 9,
		platform: "Eigenes System",
		wallet: "OneKey #6 · Dolphin Profil 6",
		custom: false
	}
];
var PRESET_KEY = "position-builder.presets.v2";
function clamp$1(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function isPlatform(value) {
	return typeof value === "string" && FIRM_PLATFORMS.includes(value);
}
function readPreset(raw) {
	if (!raw || typeof raw !== "object") return null;
	const row = raw;
	if (typeof row.id !== "string" || !row.id.trim()) return null;
	const base = DEFAULT_PRESETS.find((item) => item.id === row.id);
	const makerPct = typeof row.makerPct === "number" && Number.isFinite(row.makerPct) ? clamp$1(row.makerPct, 0, 5) : base?.makerPct ?? 0;
	const takerPct = typeof row.takerPct === "number" && Number.isFinite(row.takerPct) ? clamp$1(row.takerPct, 0, 5) : base?.takerPct ?? 0;
	const name = typeof row.name === "string" && row.name.trim() ? row.name.trim().slice(0, 48) : base?.name ?? "Prop-Firm";
	return {
		id: base ? base.id : row.id.slice(0, 64),
		name,
		makerPct,
		takerPct,
		rtPct: takerPct * 2,
		split: base?.split ?? 80,
		maxDdPct: base?.maxDdPct ?? 3,
		targetPct: base?.targetPct ?? 9,
		platform: isPlatform(row.platform) ? row.platform : base?.platform ?? "Eigenes System",
		wallet: typeof row.wallet === "string" && row.wallet.trim() ? row.wallet.trim().slice(0, 80) : base?.wallet ?? "",
		custom: !base
	};
}
function loadPresets() {
	const fresh = () => DEFAULT_PRESETS.map((row) => ({ ...row }));
	if (typeof window === "undefined") return fresh();
	try {
		const raw = window.localStorage.getItem(PRESET_KEY);
		if (!raw) return fresh();
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return fresh();
		const saved = parsed.map(readPreset).filter((row) => row != null);
		const defaults = DEFAULT_PRESETS.map((base) => saved.find((row) => row.id === base.id) ?? { ...base });
		const custom = saved.filter((row) => row.custom && !DEFAULT_PRESETS.some((base) => base.id === row.id));
		return [...defaults, ...custom];
	} catch {
		return fresh();
	}
}
function savePresets(presets) {
	window.localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}
function priceOf(size) {
	const hit = ACCOUNT_SIZES.find((item) => item === size);
	return hit != null ? EVAL_PRICES[hit] : 0;
}
/** Round-trip trading fee in USD. A normal close pays this. */
function feeUsd(account) {
	return Math.abs(account.positionUsd) * (account.rtFeePct / 100);
}
/** Opening fee only. An eval liquidation charges the entry fee and not the close. */
function openFeeUsd(account) {
	const pct = account.openFeePct == null ? account.rtFeePct / 2 : account.openFeePct;
	return Math.abs(account.positionUsd) * (pct / 100);
}
function maxDdUsd(account) {
	return Math.max(0, account.balance - account.ddLimit);
}
function targetGap(account) {
	if (account.phase !== "challenge") return 0;
	return Math.max(0, account.profitTarget - account.balance);
}
/**
* Adverse move where equity hits max DD.
* An eval is liquidated, so only the opening fee is in the room. A funded account
* is closed by order and owes the full round trip.
*/
function breachMove(account) {
	if (!(Math.abs(account.positionUsd) > 0)) return null;
	const fee = account.phase === "challenge" ? openFeeUsd(account) : feeUsd(account);
	const room = maxDdUsd(account) - fee;
	if (room <= 0) return 0;
	return -room / account.positionUsd;
}
/** Signed move at which a challenge has earned the target plus the full round-trip fee. */
function passMove(account) {
	if (account.phase !== "challenge") return null;
	const need = targetGap(account) + feeUsd(account);
	if (!(Math.abs(account.positionUsd) > 0) || !(need > 0)) return null;
	return need / account.positionUsd;
}
function withEntry(account, entry) {
	if (!(entry > 0)) return account;
	return {
		...account,
		entry
	};
}
function moveAt(account, price) {
	if (!(account.entry > 0) || !(price > 0)) return null;
	return price / account.entry - 1;
}
function isBlown(account, price) {
	const move = moveAt(account, price);
	const breach = breachMove(account);
	if (move == null || breach == null) return false;
	return account.positionUsd < 0 ? move >= breach - 1e-8 : move <= breach + 1e-8;
}
function isPassed(account, price) {
	if (account.phase !== "challenge") return false;
	const move = moveAt(account, price);
	const pass = passMove(account);
	if (move == null || pass == null) return false;
	return account.positionUsd < 0 ? move <= pass + 1e-8 : move >= pass - 1e-8;
}
/**
* Cash the trader actually books.
* A dead eval is −cost. A passed eval pays nothing — it becomes a funded account.
* A funded account pays the split of profit after the round-trip fee, and nothing on a loss.
*/
function accountCash(account, price) {
	if (!account.enabled || !(account.entry > 0) || !(price > 0)) return 0;
	if (account.phase === "challenge") {
		if (isBlown(account, price)) return -Math.max(account.cost, 0);
		return 0;
	}
	const net = account.positionUsd * (price / account.entry - 1) - feeUsd(account);
	if (net <= 0 || isBlown(account, price)) return 0;
	return net * account.split / 100;
}
function bufferLeft(account, price) {
	if (account.phase !== "funded" || !(account.entry > 0) || !(price > 0)) return maxDdUsd(account);
	const open = account.positionUsd * (price / account.entry - 1);
	const consumed = feeUsd(account) + Math.max(0, -open);
	return maxDdUsd(account) - consumed;
}
var FUNDED_COLORS = [
	"#22d3ee",
	"#38bdf8",
	"#6366f1"
];
var EVAL_COLORS = [
	"#fb923c",
	"#c084fc",
	"#f472b6",
	"#fbbf24"
];
function legAt(account, move) {
	const empty = {
		solid: null,
		dash: null,
		dot: null
	};
	if (!account.enabled || !(Math.abs(account.positionUsd) > 0)) return empty;
	const breach = breachMove(account);
	const pass = passMove(account);
	const short = account.positionUsd < 0;
	const dead = breach != null && (short ? move >= breach - 1e-8 : move <= breach + 1e-8);
	const won = account.phase === "challenge" && pass != null && (short ? move <= pass + 1e-8 : move >= pass - 1e-8);
	if (account.phase === "funded") {
		const dd = maxDdUsd(account);
		if (dead) return {
			solid: -dd,
			dash: null,
			dot: null
		};
		const net = account.positionUsd * move - feeUsd(account);
		return {
			solid: net >= 0 ? net * account.split / 100 : Math.max(net, -dd),
			dash: null,
			dot: null
		};
	}
	if (dead) return {
		solid: -Math.max(account.cost, 0),
		dash: null,
		dot: null
	};
	if (won && pass != null) {
		const at = Math.abs(move - pass) <= 1e-6;
		const y = account.positionUsd * pass;
		return {
			solid: null,
			dash: at ? y : null,
			dot: at ? y : null
		};
	}
	if (short ? move >= -1e-9 : move <= 1e-9) return {
		solid: account.positionUsd * move,
		dash: null,
		dot: null
	};
	return {
		solid: null,
		dash: account.positionUsd * move,
		dot: null
	};
}
function cushionAt(accounts, price) {
	return accounts.reduce((sum, account) => {
		if (!account.enabled) return sum;
		if (account.phase === "funded") return sum + Math.max(0, bufferLeft(account, price));
		return sum + (isPassed(account, price) ? maxDdUsd(account) : 0);
	}, 0);
}
/** Individual legs plus the net cash and unlocked-buffer step. Window is −4.5% to +2.5%, widened only if a stop or pass sits outside. */
function buildDualBook(accounts, entry, slPct, side) {
	const live = accounts.filter((account) => account.enabled && Math.abs(account.positionUsd) > 0);
	let fundedColor = 0;
	let evalColor = 0;
	const series = live.map((account) => {
		const funded = account.phase === "funded";
		const color = funded ? FUNDED_COLORS[fundedColor++ % FUNDED_COLORS.length] : EVAL_COLORS[evalColor++ % EVAL_COLORS.length];
		return {
			id: account.id,
			name: account.name,
			kind: funded ? "funded" : "challenge",
			color,
			solidKey: `s${account.id}`,
			dashKey: `d${account.id}`,
			dotKey: `p${account.id}`,
			floor: funded ? -maxDdUsd(account) : -Math.max(account.cost, 0)
		};
	});
	const marks = live.flatMap((account) => [breachMove(account), passMove(account)]).filter((row) => row != null);
	const fail = failFraction(side, slPct);
	const pass = collectivePassMove(live, side);
	let lo = -.045;
	let hi = .025;
	for (const mark of [
		...marks,
		fail,
		pass
	].filter((row) => row != null)) {
		lo = Math.min(lo, mark - .004);
		hi = Math.max(hi, mark + .004);
	}
	const moves = /* @__PURE__ */ new Set([0, fail]);
	if (pass != null) moves.add(pass);
	const steps = 161;
	for (let i = 0; i < steps; i += 1) moves.add(lo + (hi - lo) * i / 160);
	for (const account of live) {
		const breach = breachMove(account);
		if (breach == null) continue;
		moves.add(breach);
		moves.add(account.positionUsd < 0 ? breach - 1e-4 : breach + 1e-4);
	}
	return {
		points: [...moves].sort((a, b) => a - b).map((move) => {
			const price = entry * (1 + move);
			const point = {
				move: move * 100,
				price,
				cash: 0,
				cashUp: 0,
				cashDn: 0,
				cushion: entry > 0 ? cushionAt(live, price) : 0,
				passed: live.some((account) => isPassed(account, price))
			};
			for (const account of live) {
				const leg = legAt(account, move);
				point[`s${account.id}`] = leg.solid;
				point[`d${account.id}`] = leg.dash;
				point[`p${account.id}`] = leg.dot;
			}
			const cash = entry > 0 ? live.reduce((sum, account) => sum + accountCash(account, price), 0) : 0;
			point.cash = cash;
			point.cashUp = cash > 0 ? cash : 0;
			point.cashDn = cash < 0 ? cash : 0;
			return point;
		}),
		series,
		failPct: fail * 100,
		passPct: pass == null ? null : pass * 100
	};
}
function roundCents(value) {
	return Math.round(value * 100) / 100;
}
function leverageSpan(rows) {
	const values = rows.filter((account) => account.account > 0 && Math.abs(account.positionUsd) > 0).map((account) => Math.abs(account.positionUsd) / account.account);
	if (!values.length) return null;
	return [Math.min(...values), Math.max(...values)];
}
function loopKpis(accounts, entry, slPct, side = "evals-short") {
	const on = accounts.filter((account) => account.enabled).map((account) => withEntry(account, entry));
	const evals = on.filter((account) => account.phase === "challenge");
	const funds = on.filter((account) => account.phase === "funded");
	const costs = evals.reduce((sum, account) => sum + account.cost, 0);
	const failMove = failFraction(side, slPct);
	const failPrice = entry > 0 ? entry * (1 + failMove) : 0;
	const netAtFail = failPrice > 0 ? roundCents(on.reduce((sum, account) => sum + accountCash(account, failPrice), 0)) : 0;
	const pass = collectivePassMove(evals, side) ?? (side === "evals-short" ? -.03 : .03);
	const passPrice = entry > 0 ? entry * (1 + pass) : 0;
	const bufferAtPass = passPrice > 0 ? roundCents(funds.reduce((sum, account) => sum + bufferLeft(account, passPrice), 0)) : 0;
	const wonBuffer = evals.reduce((sum, account) => sum + maxDdUsd(account), 0);
	return {
		costs,
		netAtFail,
		failMove: failMove * 100,
		bufferAtPass,
		passMove: pass * 100,
		alive: funds.length === 0 || bufferAtPass >= -.005,
		evalLeverage: leverageSpan(evals),
		fundedLeverage: leverageSpan(funds),
		wonCount: evals.length,
		wonBuffer
	};
}
/** Auto keeps 10% of max DD when the evals pass. Balanced is the older 20% mode. */
function hedgeReserve(mode) {
	if (mode === "auto" || mode === "max") return .1;
	if (mode === "balanced") return .2;
	return null;
}
/**
* Sizes evals from their own max DD, then sizes the funded book.
* Safe and manual keep the break-even hedge (manual adds a typed extra).
* Balanced and max grow the funded position until the pass-move loss
* leaves exactly the reserve, but never below the size that covers the eval fees.
*/
function sizeForHedge(accounts, slPct, extra, side, hedge) {
	const base = autoSync(accounts, slPct, hedge === "manual" ? extra : 0, side).accounts;
	const reserve = hedgeReserve(hedge);
	if (reserve == null) return {
		accounts: base,
		tight: false
	};
	const evals = base.filter((account) => account.enabled && account.phase === "challenge");
	const funds = base.filter((account) => account.enabled && account.phase === "funded");
	const pass = collectivePassMove(evals, side);
	const passAbs = pass == null ? 0 : Math.abs(pass);
	if (!(passAbs > 0) || funds.length === 0) return {
		accounts: base,
		tight: true
	};
	let minSum = 0;
	let maxSum = 0;
	const maxSafe = /* @__PURE__ */ new Map();
	for (const account of funds) {
		const min = Math.abs(account.positionUsd);
		const rt = account.rtFeePct / 100;
		const room = maxDdUsd(account) * (1 - reserve);
		const max = room > 0 ? room / (passAbs + rt) : 0;
		minSum += min;
		maxSum += max;
		maxSafe.set(account.id, max);
	}
	if (!(maxSum > minSum + .005)) return {
		accounts: base,
		tight: true
	};
	return {
		tight: false,
		accounts: base.map((account) => {
			const max = maxSafe.get(account.id);
			if (max == null) return account;
			return {
				...account,
				positionUsd: positionSign(account.phase, side) * max
			};
		})
	};
}
function autoSync(accounts, slPct, extra, side = "evals-short") {
	const sl = slPct / 100;
	const evals = accounts.filter((account) => account.enabled && account.phase === "challenge");
	const funds = accounts.filter((account) => account.enabled && account.phase === "funded");
	const neededNet = evals.reduce((sum, account) => sum + account.cost, 0) + extra;
	const totalDd = funds.reduce((sum, account) => sum + maxDdUsd(account), 0);
	let warning = "";
	return {
		accounts: accounts.map((account) => {
			if (!account.enabled) return account;
			if (account.phase === "challenge") {
				const openFee = (account.openFeePct == null ? account.rtFeePct / 2 : account.openFeePct) / 100;
				const denom = sl + openFee;
				const mag = denom > 0 ? maxDdUsd(account) / denom : 0;
				return {
					...account,
					positionUsd: positionSign(account.phase, side) * mag
				};
			}
			const share = totalDd > 0 ? maxDdUsd(account) / totalDd : funds.length > 0 ? 1 / funds.length : 0;
			const split = account.split / 100;
			const gross = split > 0 ? neededNet * share / split : 0;
			const rt = account.rtFeePct / 100;
			const denom = sl - rt;
			if (!(denom > 1e-8)) {
				warning = "Funded-Fee ist höher als der SL-Move. Die Größe bleibt 0.";
				return {
					...account,
					positionUsd: 0
				};
			}
			return {
				...account,
				positionUsd: positionSign(account.phase, side) * (gross / denom)
			};
		}),
		warning
	};
}
/** Crooked size change. Default is the wide ±0.8–1.5% smear. Pass 0.009 for the ±0.9% camo. */
function fuzzWide(accounts, entry, slPct, side, span) {
	const next = accounts.map((account) => {
		if (!account.enabled || account.positionUsd === 0) return account;
		const width = span == null ? .008 + Math.random() * .007 : Math.random() * span;
		const way = Math.random() < .5 ? -1 : 1;
		let mag = Math.abs(account.positionUsd) * (1 + way * width);
		mag = Math.round(mag * 100) / 100;
		if (span == null && Math.round(mag) % 50 === 0) mag += 7.4 + Math.floor(Math.random() * 9);
		return {
			...account,
			positionUsd: Math.sign(account.positionUsd) * Math.round(mag * 100) / 100
		};
	});
	const net = loopKpis(next.map((account) => withEntry(account, entry)), entry, slPct, side).netAtFail;
	if (net >= 0) return next;
	const funds = next.filter((account) => account.enabled && account.phase === "funded" && account.positionUsd !== 0);
	const book = funds.reduce((sum, account) => sum + Math.abs(account.positionUsd), 0);
	const perDollar = Math.abs(failFraction(side, slPct)) * ((funds[0]?.split ?? 80) / 100);
	if (!(book > 0) || !(perDollar > 0)) return next;
	const add = (-net + 1) / perDollar;
	return next.map((account) => {
		if (!account.enabled || account.phase !== "funded" || account.positionUsd === 0) return account;
		const share = Math.abs(account.positionUsd) / book;
		const mag = Math.round((Math.abs(account.positionUsd) + add * share) * 100) / 100;
		return {
			...account,
			positionUsd: Math.sign(account.positionUsd) * mag
		};
	});
}
/** Price where the funded loss equals 95% of max DD, so a tick of slippage still survives. */
function safetyStop(account, entry) {
	if (!(entry > 0) || !(Math.abs(account.positionUsd) > 0)) return null;
	const room = maxDdUsd(account) * .95 - feeUsd(account);
	if (!(room > 0)) return null;
	const price = entry * (1 + -Math.sign(account.positionUsd) * (room / Math.abs(account.positionUsd)));
	return price > 0 ? price : null;
}
/** Evals-short dies on a rise. Evals-long dies on a drop. */
function failFraction(side, slPct) {
	const mag = slPct / 100;
	return side === "evals-short" ? mag : -mag;
}
function positionSign(phase, side) {
	if (phase === "challenge") return side === "evals-short" ? -1 : 1;
	return side === "evals-short" ? 1 : -1;
}
/** Move where every eval has reached its own fee-inclusive target. */
function collectivePassMove(accounts, side) {
	const passes = accounts.filter((account) => account.enabled && account.phase === "challenge").map(passMove).filter((move) => move != null);
	if (!passes.length) return null;
	return side === "evals-short" ? Math.min(...passes) : Math.max(...passes);
}
function referenceEntry(percentMode, index, override) {
	if (override != null && override > 0) return override;
	if (percentMode) return 100;
	return index > 0 ? index : 100;
}
/**
* Broker prices for one row.
* An eval stops at the shared SL move and takes profit at its own fee-inclusive target.
* The funded stop is 95% of its max DD, past the eval take-profit, so the spread
* cannot fill the funded stop before the evals close.
*/
function orderPrices(account, entry, slPct, side, _fundedStopMove) {
	if (!(entry > 0)) return {
		sl: null,
		tp: null
	};
	const fail = entry * (1 + failFraction(side, slPct));
	if (account.phase === "challenge") {
		const pass = passMove(account);
		return {
			sl: fail,
			tp: pass == null ? null : entry * (1 + pass)
		};
	}
	return {
		sl: safetyStop(account, entry),
		tp: fail
	};
}
var LOOP_KEY = "position-builder.loop.v1";
var LOOP_FALLBACK = {
	sl: 1,
	extra: 0,
	side: "evals-short",
	entry: null,
	discount: 0,
	split: 80
};
var loopSettings = { ...LOOP_FALLBACK };
var loopBooted = false;
var loopListeners = /* @__PURE__ */ new Set();
function bootLoop() {
	if (loopBooted || typeof window === "undefined") return;
	loopBooted = true;
	try {
		const raw = window.localStorage.getItem(LOOP_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw);
		if (typeof parsed.sl === "number" && Number.isFinite(parsed.sl)) loopSettings.sl = clamp$1(parsed.sl, .2, 3);
		if (typeof parsed.extra === "number" && Number.isFinite(parsed.extra)) loopSettings.extra = clamp$1(parsed.extra, 0, 200);
		if (parsed.side === "evals-long" || parsed.side === "evals-short") loopSettings.side = parsed.side;
		if (typeof parsed.entry === "number" && Number.isFinite(parsed.entry) && parsed.entry > 0) loopSettings.entry = parsed.entry;
		if (typeof parsed.discount === "number" && Number.isFinite(parsed.discount)) loopSettings.discount = clamp$1(parsed.discount, 0, 25);
		if (typeof parsed.split === "number" && Number.isFinite(parsed.split)) loopSettings.split = clamp$1(parsed.split, 50, 100);
	} catch {}
}
function getLoopSettings() {
	bootLoop();
	return loopSettings;
}
function setLoopSettings(partial) {
	bootLoop();
	const entry = partial.entry === void 0 ? loopSettings.entry : partial.entry != null && partial.entry > 0 ? partial.entry : null;
	loopSettings = {
		sl: partial.sl != null ? clamp$1(partial.sl, .2, 3) : loopSettings.sl,
		extra: partial.extra != null ? clamp$1(partial.extra, 0, 200) : loopSettings.extra,
		side: partial.side === "evals-long" || partial.side === "evals-short" ? partial.side : loopSettings.side,
		entry,
		discount: partial.discount != null ? clamp$1(partial.discount, 0, 25) : loopSettings.discount,
		split: partial.split != null ? clamp$1(partial.split, 50, 100) : loopSettings.split
	};
	window.localStorage.setItem(LOOP_KEY, JSON.stringify(loopSettings));
	for (const listener of loopListeners) listener();
}
function subscribeLoop(listener) {
	loopListeners.add(listener);
	return () => loopListeners.delete(listener);
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var METHODS$1 = /* @__PURE__ */ new Set([
	"public/get_index_price",
	"public/get_instruments",
	"public/get_book_summary_by_currency",
	"public/get_volatility_index_data"
]);
function cleanCall$1(input) {
	if (!input || typeof input !== "object") throw new Error("bad request");
	const method = input.method;
	const query = input.query;
	if (typeof method !== "string" || !METHODS$1.has(method)) throw new Error("method not allowed");
	if (!query || typeof query !== "object") throw new Error("bad query");
	const clean = {};
	for (const [key, value] of Object.entries(query)) {
		if (!/^[a-z0-9_]+$/i.test(key)) continue;
		if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;
		clean[key] = String(value).slice(0, 64);
	}
	return {
		method,
		query: clean
	};
}
/** Public Deribit read, fetched by our server so the browser does not have to open their socket. */
var fetchDeribit = createServerFn({ method: "GET" }).validator(cleanCall$1).handler(createSsrRpc("7c9b478a7b6fe28493e24faf266f62ff2ba4397c816ad242ec025257b3ea47c1"));
var METHODS = /* @__PURE__ */ new Set([
	"public/get_currency",
	"public/get_all_instruments",
	"public/get_tickers"
]);
var CURRENCIES = /* @__PURE__ */ new Set([
	"BTC",
	"ETH",
	"SOL",
	"HYPE"
]);
function cleanCall(input) {
	if (!input || typeof input !== "object") throw new Error("bad request");
	const method = input.method;
	const params = input.params;
	if (typeof method !== "string" || !METHODS.has(method)) throw new Error("method not allowed");
	if (!params || typeof params !== "object") throw new Error("bad params");
	const clean = {};
	for (const [key, value] of Object.entries(params)) {
		if (!/^[a-z0-9_]+$/i.test(key)) continue;
		if (typeof value === "string") clean[key] = value.slice(0, 32);
		else if (typeof value === "number" && Number.isFinite(value)) clean[key] = value;
		else if (typeof value === "boolean") clean[key] = value;
	}
	const currency = clean.currency;
	if (typeof currency === "string" && !CURRENCIES.has(currency)) throw new Error("currency not allowed");
	const kind = clean.instrument_type;
	if (typeof kind === "string" && kind !== "option" && kind !== "perp") throw new Error("type not allowed");
	return {
		method,
		params: clean
	};
}
/** Public Derive read. The browser uses this when their socket is blocked. */
var fetchDerive = createServerFn({ method: "POST" }).validator(cleanCall).handler(createSsrRpc("68fc9cfa76a1152d748e7581eed7103c405b842372b50c9e26464ca80623e2e9"));
function num$4(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return 0;
}
function rightOf(value) {
	const text = String(value ?? "").toLowerCase();
	if (text === "c" || text === "call") return "call";
	if (text === "p" || text === "put") return "put";
	return null;
}
/** Derive publishes vol as a decimal. Deribit marks in this app are percent. */
function ivPercent(value) {
	const raw = num$4(value);
	if (!(raw > 0)) return 0;
	return raw > 3 ? raw : raw * 100;
}
function ymd(expirySec) {
	const date = /* @__PURE__ */ new Date(expirySec * 1e3);
	return date.getUTCFullYear() * 1e4 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}
function asRecord(value) {
	return value && typeof value === "object" ? value : {};
}
function instrumentRows(payload) {
	const rows = asRecord(payload).instruments;
	return Array.isArray(rows) ? rows : [];
}
function tickerMap(payload) {
	const tickers = asRecord(payload).tickers;
	if (!tickers || typeof tickers !== "object" || Array.isArray(tickers)) return {};
	return tickers;
}
async function deriveCallHttp(method, params) {
	return fetchDerive({ data: {
		method,
		params
	} });
}
async function loadDeriveBook(book, call, now = Date.now()) {
	const { currency, settle } = bookParts(book);
	const linear = settle === "linear";
	const [currencyRow, optionRow, perpRow] = await Promise.all([
		call("public/get_currency", { currency }),
		call("public/get_all_instruments", {
			currency,
			instrument_type: "option",
			expired: false,
			page: 1,
			page_size: 1e3
		}),
		call("public/get_all_instruments", {
			currency,
			instrument_type: "perp",
			expired: false,
			page: 1,
			page_size: 20
		})
	]);
	const spot = num$4(asRecord(currencyRow).spot_price);
	const instruments = [];
	const expiries = /* @__PURE__ */ new Set();
	for (const row of instrumentRows(optionRow)) {
		const parsed = parseOption(row, linear, now);
		if (!parsed) continue;
		instruments.push(parsed.instrument);
		expiries.add(parsed.expirySec);
	}
	for (const row of instrumentRows(perpRow)) {
		const parsed = parsePerp(row, linear);
		if (parsed) instruments.push(parsed);
	}
	instruments.sort((a, b) => {
		if (a.perpetual !== b.perpetual) return a.perpetual ? -1 : 1;
		const ea = a.expiry ?? Number.MAX_SAFE_INTEGER;
		const eb = b.expiry ?? Number.MAX_SAFE_INTEGER;
		if (ea !== eb) return ea - eb;
		return (a.strike ?? 0) - (b.strike ?? 0);
	});
	const quotes = await loadDeriveQuotes(currency, linear, [...expiries], spot, call);
	let index = spot;
	if (!(index > 0)) {
		for (const quote of Object.values(quotes)) if (quote.underlying > 0) {
			index = quote.underlying;
			break;
		}
	}
	return {
		index,
		instruments,
		quotes,
		expiries: [...expiries]
	};
}
async function loadDeriveQuotes(currency, linear, expiries, spot, call) {
	const quotes = {};
	const expiryDates = [...new Set(expiries)].sort((a, b) => a - b);
	for (let i = 0; i < expiryDates.length; i += 4) {
		const chunk = expiryDates.slice(i, i + 4);
		const pages = await Promise.all(chunk.map((expiry) => call("public/get_tickers", {
			currency,
			instrument_type: "option",
			expiry_date: ymd(expiry)
		}).catch(() => null)));
		for (const page of pages) {
			if (!page) continue;
			for (const [name, row] of Object.entries(tickerMap(page))) {
				const quote = quoteFromTicker(row, linear, spot, true);
				if (quote) quotes[name] = quote;
			}
		}
	}
	const perp = await call("public/get_tickers", {
		currency,
		instrument_type: "perp"
	}).catch(() => null);
	if (perp) for (const [name, row] of Object.entries(tickerMap(perp))) {
		const quote = quoteFromTicker(row, linear, spot, false);
		if (quote) quotes[name] = quote;
	}
	return quotes;
}
function parseOption(row, linear, now) {
	if (!row.instrument_name || row.is_active === false || row.instrument_type !== "option") return null;
	const details = row.option_details;
	const right = rightOf(details?.option_type);
	const strike = num$4(details?.strike);
	const expirySec = num$4(details?.expiry);
	if (!right || !(strike > 0) || !(expirySec > 0)) return null;
	if (expirySec * 1e3 < now - 6e4) return null;
	const tick = num$4(row.tick_size);
	return {
		expirySec,
		instrument: {
			name: row.instrument_name,
			kind: "option",
			right,
			strike,
			expiry: expirySec * 1e3,
			perpetual: false,
			contractSize: 1,
			tickSize: tick > 0 ? tick : .1,
			settlement: "Derive",
			linear
		}
	};
}
function parsePerp(row, linear) {
	if (!row.instrument_name || row.is_active === false || row.instrument_type !== "perp") return null;
	const tick = num$4(row.tick_size);
	return {
		name: row.instrument_name,
		kind: "future",
		expiry: null,
		perpetual: true,
		contractSize: 1,
		tickSize: tick > 0 ? tick : .01,
		settlement: linear ? "USDC" : "inverse",
		linear
	};
}
function quoteFromTicker(row, linear, spot, option) {
	const markUsd = num$4(row.M);
	if (!(markUsd > 0)) return null;
	const index = num$4(row.I) || spot;
	const forward = num$4(row.option_pricing?.f) || index || spot;
	const px = index > 0 ? index : forward;
	const mark = option && !linear && px > 0 ? markUsd / px : markUsd;
	if (!(mark > 0)) return null;
	const bid = positive(row.b);
	const ask = positive(row.a);
	const hourly = num$4(row.f);
	return {
		mark,
		iv: ivPercent(row.option_pricing?.i),
		underlying: forward > 0 ? forward : px,
		bid: option && !linear && bid != null && px > 0 ? bid / px : bid,
		ask: option && !linear && ask != null && px > 0 ? ask / px : ask,
		oi: num$4(row.stats?.oi),
		funding8h: option ? void 0 : hourly * 8
	};
}
function positive(value) {
	const parsed = num$4(value);
	return parsed > 0 ? parsed : null;
}
var WS_URL$1 = "wss://api.derive.xyz/v3/ws";
function num$3(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return 0;
}
/**
* Public Derive socket. Used only when Deribit has not delivered a book.
* Index streams on spot_feed; the chain is refreshed with public/get_tickers.
*/
var DeriveBackup = class {
	onUpdate;
	onIndex;
	onError;
	book = "ETH";
	alive = false;
	ws = null;
	pending = /* @__PURE__ */ new Map();
	id = 1;
	generation = 0;
	channel = null;
	mode = null;
	pollTimer = null;
	refreshTimer = null;
	reconnectTimer = null;
	retryMs = 1500;
	cached = null;
	constructor(onUpdate, onIndex, onError) {
		this.onUpdate = onUpdate;
		this.onIndex = onIndex;
		this.onError = onError;
	}
	start(book) {
		this.alive = true;
		this.book = book;
		this.generation += 1;
		this.connect();
	}
	stop() {
		this.alive = false;
		this.generation += 1;
		this.teardown();
	}
	setBook(book) {
		if (!this.alive) return;
		this.book = book;
		this.cached = null;
		this.generation += 1;
		if (this.ws?.readyState === WebSocket.OPEN) this.bootstrap(this.generation);
		else if (this.mode === "poll") this.poll(this.generation);
		else this.connect();
	}
	connect() {
		if (!this.alive || typeof WebSocket === "undefined") {
			this.startPoll();
			return;
		}
		if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
		this.stopPoll();
		const ws = new WebSocket(WS_URL$1);
		this.ws = ws;
		const openTimer = setTimeout(() => {
			if (ws.readyState !== WebSocket.OPEN) ws.close();
		}, 6e3);
		ws.onopen = () => {
			clearTimeout(openTimer);
			this.retryMs = 1500;
			this.mode = "ws";
			this.bootstrap(this.generation);
		};
		ws.onmessage = (event) => this.onMessage(String(event.data));
		ws.onerror = () => {};
		ws.onclose = () => {
			clearTimeout(openTimer);
			if (this.ws === ws) this.ws = null;
			this.rejectAll(/* @__PURE__ */ new Error("Derive socket closed"));
			this.channel = null;
			if (this.refreshTimer) clearInterval(this.refreshTimer);
			this.refreshTimer = null;
			if (!this.alive) return;
			this.startPoll();
			this.scheduleReconnect();
		};
	}
	scheduleReconnect() {
		if (this.reconnectTimer || !this.alive) return;
		const wait = this.retryMs;
		this.retryMs = Math.min(this.retryMs * 2, 2e4);
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, wait);
	}
	teardown() {
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.reconnectTimer = null;
		this.stopPoll();
		if (this.refreshTimer) clearInterval(this.refreshTimer);
		this.refreshTimer = null;
		this.channel = null;
		this.cached = null;
		this.mode = null;
		const ws = this.ws;
		this.ws = null;
		if (ws && ws.readyState === WebSocket.OPEN) ws.close();
		this.rejectAll(/* @__PURE__ */ new Error("Derive stopped"));
	}
	startPoll() {
		if (this.pollTimer || !this.alive) return;
		this.mode = "poll";
		const gen = this.generation;
		this.poll(gen);
		this.pollTimer = setInterval(() => void this.poll(this.generation), 12e3);
	}
	stopPoll() {
		if (this.pollTimer) clearInterval(this.pollTimer);
		this.pollTimer = null;
	}
	async poll(gen) {
		try {
			const snap = await loadDeriveBook(this.book, deriveCallHttp);
			if (!this.alive || gen !== this.generation) return;
			if (this.ws?.readyState === WebSocket.OPEN && this.mode === "ws") return;
			this.cached = {
				book: this.book,
				expiries: snap.expiries,
				spot: snap.index,
				at: Date.now()
			};
			this.onUpdate({
				...snap,
				transport: "poll"
			});
		} catch (error) {
			if (!this.alive || gen !== this.generation) return;
			this.onError(error instanceof Error ? error : /* @__PURE__ */ new Error("Derive unavailable"));
		}
	}
	async bootstrap(gen) {
		const book = this.book;
		try {
			if (this.channel) {
				const old = this.channel;
				this.channel = null;
				await this.call("unsubscribe", { channels: [old] }).catch(() => void 0);
			}
			const snap = await loadDeriveBook(book, (method, params) => this.call(method, params));
			if (!this.alive || gen !== this.generation || book !== this.book) return;
			this.cached = {
				book,
				expiries: snap.expiries,
				spot: snap.index,
				at: Date.now()
			};
			this.onUpdate({
				...snap,
				transport: "ws"
			});
			const channel = `spot_feed.${bookParts(book).currency}`;
			const subscribed = await this.call("subscribe", { channels: [channel] });
			if (!this.alive || gen !== this.generation) {
				await this.call("unsubscribe", { channels: [channel] }).catch(() => void 0);
				return;
			}
			const status = subscribed?.status;
			if (status && status[channel] && status[channel] !== "ok") throw new Error(`Derive ${channel} ${status[channel]}`);
			this.channel = channel;
			this.armRefresh();
		} catch (error) {
			if (!this.alive || gen !== this.generation) return;
			this.onError(error instanceof Error ? error : /* @__PURE__ */ new Error("Derive unavailable"));
			this.startPoll();
		}
	}
	armRefresh() {
		if (this.refreshTimer) clearInterval(this.refreshTimer);
		this.refreshTimer = setInterval(() => {
			this.refreshQuotes();
		}, 12e3);
	}
	async refreshQuotes() {
		if (this.ws?.readyState !== WebSocket.OPEN) return;
		const book = this.book;
		const gen = this.generation;
		const cached = this.cached;
		if (!cached || cached.book !== book) {
			this.bootstrap(gen);
			return;
		}
		try {
			const { currency, settle } = bookParts(book);
			const quotes = await loadDeriveQuotes(currency, settle === "linear", cached.expiries, cached.spot, (method, params) => this.call(method, params));
			if (!this.alive || gen !== this.generation || book !== this.book) return;
			if (Object.keys(quotes).length === 0) return;
			this.onUpdate({
				index: cached.spot,
				instruments: [],
				quotes,
				expiries: cached.expiries,
				transport: "ws"
			});
		} catch {}
	}
	call(method, params) {
		const ws = this.ws;
		if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(/* @__PURE__ */ new Error("Derive socket closed"));
		const id = this.id++;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(/* @__PURE__ */ new Error(`${method} timed out`));
			}, 2e4);
			this.pending.set(id, {
				resolve,
				reject,
				timer
			});
			ws.send(JSON.stringify({
				jsonrpc: "2.0",
				id,
				method,
				params
			}));
		});
	}
	rejectAll(error) {
		for (const pending of this.pending.values()) {
			clearTimeout(pending.timer);
			pending.reject(error);
		}
		this.pending.clear();
	}
	onMessage(raw) {
		let msg;
		try {
			msg = JSON.parse(raw);
		} catch {
			return;
		}
		if (msg.id && this.pending.has(msg.id)) {
			const pending = this.pending.get(msg.id);
			clearTimeout(pending.timer);
			this.pending.delete(msg.id);
			if (msg.error) pending.reject(new Error(msg.error.message || "Derive error"));
			else pending.resolve(msg.result);
			return;
		}
		if (msg.method === "subscription" && msg.params?.channel?.startsWith("spot_feed.")) {
			const feeds = msg.params.data?.feeds;
			if (!feeds) return;
			const currency = bookParts(this.book).currency;
			const price = num$3(feeds[currency]?.price);
			if (price > 0) {
				if (this.cached && this.cached.book === this.book) this.cached.spot = price;
				this.onIndex(price);
			}
		}
	}
};
var WS_URL = "wss://www.deribit.com/ws/api/v2";
var API = "https://www.deribit.com/api/v2";
function asArray(value) {
	return Array.isArray(value) ? value : [];
}
function keepBookRow(row, book) {
	if (!row.instrument_name) return false;
	const { currency, settle } = bookParts(book);
	if (settle !== "linear") return true;
	return (row.base_currency ?? row.instrument_name.split("_")[0]) === currency && row.instrument_name.includes("_USDC");
}
function parseInstruments(rows, book) {
	const { currency, settle } = bookParts(book);
	const out = [];
	for (const row of rows) {
		if (!row.instrument_name || row.is_active === false) continue;
		if (row.kind !== "option" && row.kind !== "future") continue;
		const linear = row.instrument_type === "linear" || row.instrument_name.includes("_USDC");
		if (settle === "linear") {
			if (!linear) continue;
			if ((row.base_currency ?? row.instrument_name.split("_")[0]) !== currency) continue;
		} else if (linear) continue;
		const perpetual = row.settlement_period === "perpetual";
		if (row.kind === "option" && row.option_type !== "call" && row.option_type !== "put") continue;
		const listed = row.contract_size && row.contract_size > 0 ? row.contract_size : 1;
		out.push({
			name: row.instrument_name,
			kind: row.kind,
			right: row.option_type,
			strike: row.strike,
			expiry: perpetual ? null : row.expiration_timestamp ?? null,
			perpetual,
			contractSize: linear && row.kind === "future" ? 1 : listed,
			tickSize: row.tick_size && row.tick_size > 0 ? row.tick_size : 1e-4,
			settlement: row.settlement_period ?? "",
			linear
		});
	}
	out.sort((a, b) => {
		if (a.perpetual !== b.perpetual) return a.perpetual ? -1 : 1;
		const ea = a.expiry ?? Number.MAX_SAFE_INTEGER;
		const eb = b.expiry ?? Number.MAX_SAFE_INTEGER;
		if (ea !== eb) return ea - eb;
		return (a.strike ?? 0) - (b.strike ?? 0);
	});
	return out;
}
function quoteFromBook(row, prev) {
	if (!row.instrument_name || !(row.mark_price && row.mark_price > 0)) return null;
	return {
		mark: row.mark_price,
		iv: typeof row.mark_iv === "number" ? row.mark_iv : prev?.iv ?? 0,
		underlying: row.underlying_price && row.underlying_price > 0 ? row.underlying_price : prev?.underlying ?? 0,
		bid: row.bid_price ?? prev?.bid ?? null,
		ask: row.ask_price ?? prev?.ask ?? null,
		oi: typeof row.open_interest === "number" ? row.open_interest : prev?.oi ?? 0,
		funding8h: typeof row.funding_8h === "number" ? row.funding_8h : prev?.funding8h
	};
}
function patchSide(quote, mark, extra = {}) {
	return {
		mark,
		iv: extra.iv ?? quote?.iv ?? 0,
		underlying: extra.underlying ?? quote?.underlying ?? 0,
		bid: extra.bid !== void 0 ? extra.bid : quote?.bid ?? null,
		ask: extra.ask !== void 0 ? extra.ask : quote?.ask ?? null,
		oi: extra.oi ?? quote?.oi ?? 0,
		funding8h: extra.funding8h ?? quote?.funding8h
	};
}
var useMarket = create(() => ({
	book: "ETH",
	status: "connecting",
	transport: null,
	source: null,
	error: null,
	index: 0,
	prevIndex: 0,
	dvol: null,
	instruments: [],
	quotes: {},
	updatedAt: 0,
	now: Date.now(),
	setBook: (book) => feed.setBook(book)
}));
var Feed = class {
	ws = null;
	pending = /* @__PURE__ */ new Map();
	id = 1;
	channels = [];
	book = "ETH";
	alive = false;
	retryMs = 1e3;
	failures = 0;
	reconnectTimer = null;
	bookTimer = null;
	pollTimer = null;
	nowTimer = null;
	flushTimer = null;
	buffer = /* @__PURE__ */ new Map();
	generation = 0;
	deriveOn = false;
	deriveWatch = null;
	derive = new DeriveBackup((update) => this.onDerive(update), (price) => this.onDeriveIndex(price), (error) => this.onDeriveError(error));
	start(book) {
		this.alive = true;
		this.book = book;
		useMarket.setState({
			book,
			now: Date.now()
		});
		if (!this.nowTimer) this.nowTimer = setInterval(() => {
			useMarket.setState({ now: Date.now() });
		}, 15e3);
		if (!this.ws || this.ws.readyState === WebSocket.CLOSED) this.connect();
		this.startPoll();
		this.armDeriveWatch();
	}
	setBook(book) {
		if (this.book === book) return;
		this.book = book;
		this.generation += 1;
		this.buffer.clear();
		useMarket.setState({
			book,
			instruments: [],
			quotes: {},
			index: 0,
			prevIndex: 0,
			dvol: null,
			error: null,
			status: this.ws?.readyState === WebSocket.OPEN ? "live" : "connecting"
		});
		if (this.deriveOn) this.derive.setBook(book);
		else this.armDeriveWatch();
		if (this.ws?.readyState === WebSocket.OPEN) this.load(this.generation);
		else if (useMarket.getState().transport === "poll") this.pollOnce();
		else this.connect();
	}
	connect() {
		if (!this.alive || typeof WebSocket === "undefined") return;
		if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
		useMarket.setState({
			status: this.failures > 0 ? "reconnecting" : "connecting",
			error: null
		});
		const ws = new WebSocket(WS_URL);
		this.ws = ws;
		const openTimer = setTimeout(() => {
			if (ws.readyState !== WebSocket.OPEN) ws.close();
		}, 6e3);
		ws.onopen = () => {
			clearTimeout(openTimer);
			this.retryMs = 1e3;
			this.call("public/set_heartbeat", { interval: 20 }).catch(() => void 0);
			this.load(this.generation);
		};
		ws.onmessage = (event) => {
			this.onMessage(String(event.data));
		};
		ws.onerror = () => {
			useMarket.setState({ error: "Deribit socket error" });
		};
		ws.onclose = () => {
			clearTimeout(openTimer);
			if (this.ws === ws) this.ws = null;
			this.rejectAll(/* @__PURE__ */ new Error("socket closed"));
			this.channels = [];
			if (!this.alive) return;
			this.failures += 1;
			this.startPoll();
			this.armDeriveWatch();
			useMarket.setState({
				status: useMarket.getState().index > 0 ? "live" : "reconnecting",
				error: null
			});
			this.scheduleReconnect();
		};
	}
	scheduleReconnect() {
		if (this.reconnectTimer) return;
		const wait = this.retryMs;
		this.retryMs = Math.min(this.retryMs * 2, 15e3);
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, wait);
	}
	startPoll() {
		if (this.pollTimer) return;
		this.pollOnce();
		this.pollTimer = setInterval(() => void this.pollOnce(), 8e3);
	}
	stopPoll() {
		if (this.pollTimer) clearInterval(this.pollTimer);
		this.pollTimer = null;
	}
	async pollOnce() {
		const book = this.book;
		const spec = bookParts(book);
		const gen = this.generation;
		const api = spec.settle === "linear" ? "USDC" : spec.currency;
		try {
			const [idx, inst, opt, fut] = await Promise.all([
				fetchPublic("public/get_index_price", { index_name: INDEX_NAME[book] }),
				fetchPublic("public/get_instruments", {
					currency: api,
					expired: "false"
				}),
				fetchPublic("public/get_book_summary_by_currency", {
					currency: api,
					kind: "option"
				}),
				fetchPublic("public/get_book_summary_by_currency", {
					currency: api,
					kind: "future"
				})
			]);
			if (gen !== this.generation || book !== this.book) return;
			if (this.ws?.readyState === WebSocket.OPEN && useMarket.getState().transport === "ws") return;
			const instruments = parseInstruments(asArray(resultOf(inst)), book);
			const quotes = booksToQuotes(asArray(resultOf(opt)).concat(asArray(resultOf(fut))).filter((row) => keepBookRow(row, book)));
			const index = numberAt(idx, "index_price");
			if (!(instruments.length > 0) || !(index > 0)) {
				this.startDerive();
				return;
			}
			this.noteDeribitUp();
			useMarket.setState((state) => ({
				status: "live",
				transport: "poll",
				source: "deribit",
				error: null,
				instruments,
				quotes,
				index: index || state.index,
				prevIndex: state.index || index,
				updatedAt: Date.now(),
				now: Date.now()
			}));
		} catch (error) {
			if (gen !== this.generation) return;
			this.startDerive();
			const state = useMarket.getState();
			if (state.source === "derive" && state.index > 0) return;
			useMarket.setState({
				status: state.index > 0 ? "live" : "offline",
				transport: "poll",
				error: error instanceof Error ? error.message : "Market data unavailable"
			});
		}
	}
	call(method, params = {}) {
		const ws = this.ws;
		if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(/* @__PURE__ */ new Error("socket closed"));
		const id = this.id++;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(/* @__PURE__ */ new Error(`${method} timed out`));
			}, 2e4);
			this.pending.set(id, {
				resolve,
				reject,
				timer
			});
			ws.send(JSON.stringify({
				jsonrpc: "2.0",
				id,
				method,
				params
			}));
		});
	}
	rejectAll(error) {
		for (const pending of this.pending.values()) {
			clearTimeout(pending.timer);
			pending.reject(error);
		}
		this.pending.clear();
	}
	onMessage(raw) {
		let msg;
		try {
			msg = JSON.parse(raw);
		} catch {
			return;
		}
		if (msg.id && this.pending.has(msg.id)) {
			const pending = this.pending.get(msg.id);
			clearTimeout(pending.timer);
			this.pending.delete(msg.id);
			if (msg.error) pending.reject(new Error(msg.error.message || "Deribit error"));
			else pending.resolve(msg.result);
			return;
		}
		if (msg.method === "heartbeat" && msg.params?.type === "test_request") {
			this.call("public/test").catch(() => void 0);
			return;
		}
		if (msg.method === "subscription" && msg.params?.channel) this.onSubscription(msg.params.channel, msg.params.data);
	}
	async load(gen) {
		const book = this.book;
		const spec = bookParts(book);
		const api = spec.settle === "linear" ? "USDC" : spec.currency;
		try {
			if (this.channels.length) {
				const old = this.channels;
				this.channels = [];
				await this.call("public/unsubscribe", { channels: old }).catch(() => void 0);
			}
			const [instRes, optRes, futRes, idxRes] = await Promise.all([
				this.call("public/get_instruments", {
					currency: api,
					expired: false
				}),
				this.call("public/get_book_summary_by_currency", {
					currency: api,
					kind: "option"
				}),
				this.call("public/get_book_summary_by_currency", {
					currency: api,
					kind: "future"
				}),
				this.call("public/get_index_price", { index_name: INDEX_NAME[book] })
			]);
			if (gen !== this.generation || book !== this.book) return;
			const instruments = parseInstruments(asArray(instRes), book);
			const quotes = booksToQuotes(asArray(optRes).concat(asArray(futRes)).filter((row) => keepBookRow(row, book)));
			const index = numberAt(idxRes, "index_price");
			if (!(instruments.length > 0) || !(index > 0)) {
				this.startDerive();
				return;
			}
			this.noteDeribitUp();
			useMarket.setState((state) => ({
				instruments,
				quotes,
				index: index || state.index,
				prevIndex: state.index || index,
				status: "live",
				transport: "ws",
				source: "deribit",
				error: null,
				updatedAt: Date.now(),
				now: Date.now()
			}));
			this.failures = 0;
			this.stopPoll();
			const dvol = DVOL_INDEX[spec.currency];
			const channels = [
				`deribit_price_index.${INDEX_NAME[book]}`,
				`markprice.options.${INDEX_NAME[book]}`,
				...dvol ? [`deribit_volatility_index.${dvol}`] : [],
				...instruments.filter((item) => item.kind === "future").map((item) => `ticker.${item.name}.100ms`)
			];
			const subscribed = await this.call("public/subscribe", { channels });
			if (gen !== this.generation) {
				await this.call("public/unsubscribe", { channels }).catch(() => void 0);
				return;
			}
			this.channels = Array.isArray(subscribed) ? subscribed.filter((item) => typeof item === "string") : channels;
			this.armBookRefresh();
		} catch (error) {
			if (gen !== this.generation) return;
			this.startPoll();
			this.startDerive();
			useMarket.setState((state) => ({
				status: state.index > 0 ? "live" : "reconnecting",
				error: state.index > 0 ? null : error instanceof Error ? error.message : "Could not load the book"
			}));
		}
	}
	armBookRefresh() {
		if (this.bookTimer) clearInterval(this.bookTimer);
		this.bookTimer = setInterval(() => {
			if (this.ws?.readyState !== WebSocket.OPEN) return;
			this.refreshBooks();
		}, 2e4);
	}
	async refreshBooks() {
		const book = this.book;
		const spec = bookParts(book);
		const api = spec.settle === "linear" ? "USDC" : spec.currency;
		const gen = this.generation;
		try {
			const [optRes, futRes] = await Promise.all([this.call("public/get_book_summary_by_currency", {
				currency: api,
				kind: "option"
			}), this.call("public/get_book_summary_by_currency", {
				currency: api,
				kind: "future"
			})]);
			if (gen !== this.generation || book !== this.book) return;
			const rows = asArray(optRes).concat(asArray(futRes)).filter((row) => keepBookRow(row, book));
			useMarket.setState((state) => {
				const quotes = { ...state.quotes };
				for (const row of rows) {
					if (!row.instrument_name) continue;
					const prev = quotes[row.instrument_name];
					const next = quoteFromBook(row, prev);
					if (!next) continue;
					const option = /-[CP]$/.test(row.instrument_name);
					if (prev && option) quotes[row.instrument_name] = {
						...prev,
						bid: next.bid,
						ask: next.ask,
						oi: next.oi,
						underlying: next.underlying || prev.underlying,
						funding8h: next.funding8h ?? prev.funding8h
					};
					else quotes[row.instrument_name] = prev ? {
						...next,
						iv: prev.iv || next.iv
					} : next;
				}
				return {
					quotes,
					updatedAt: Date.now()
				};
			});
		} catch {}
	}
	onSubscription(channel, data) {
		const indexName = INDEX_NAME[this.book];
		if (channel.startsWith("deribit_price_index.")) {
			if (channel !== `deribit_price_index.${indexName}`) return;
			const price = numberAt(data, "price");
			if (!(price > 0)) return;
			useMarket.setState((state) => ({
				prevIndex: state.index || price,
				index: price,
				now: Date.now()
			}));
			return;
		}
		if (channel.startsWith("deribit_volatility_index.")) {
			const dvolName = DVOL_INDEX[bookParts(this.book).currency];
			if (!dvolName || channel !== `deribit_volatility_index.${dvolName}`) return;
			const vol = numberAt(data, "volatility");
			if (!(vol > 0)) return;
			useMarket.setState({ dvol: vol > 3 ? vol : vol * 100 });
			return;
		}
		if (channel.startsWith("markprice.options.")) {
			if (channel !== `markprice.options.${indexName}`) return;
			for (const row of asArray(data)) {
				if (!row.instrument_name || !(row.mark_price && row.mark_price > 0)) continue;
				const iv = typeof row.iv === "number" ? row.iv * 100 : void 0;
				this.buffer.set(row.instrument_name, {
					mark: row.mark_price,
					...iv != null ? { iv } : {}
				});
			}
			this.scheduleFlush();
			return;
		}
		if (channel.startsWith("ticker.")) {
			const row = data;
			if (!row.instrument_name || !(row.mark_price && row.mark_price > 0)) return;
			this.buffer.set(row.instrument_name, {
				mark: row.mark_price,
				bid: row.best_bid_price ?? null,
				ask: row.best_ask_price ?? null,
				oi: row.open_interest,
				funding8h: row.funding_8h
			});
			this.scheduleFlush();
		}
	}
	scheduleFlush() {
		if (this.flushTimer) return;
		this.flushTimer = setTimeout(() => {
			this.flushTimer = null;
			if (this.buffer.size === 0) return;
			const batch = this.buffer;
			this.buffer = /* @__PURE__ */ new Map();
			useMarket.setState((state) => {
				const quotes = { ...state.quotes };
				for (const [name, patch] of batch) quotes[name] = patchSide(quotes[name], patch.mark, patch);
				return {
					quotes,
					updatedAt: Date.now()
				};
			});
		}, 350);
	}
	armDeriveWatch() {
		if (this.deriveWatch || this.deriveOn) return;
		this.deriveWatch = setTimeout(() => {
			this.deriveWatch = null;
			const state = useMarket.getState();
			if (state.source === "deribit" && state.index > 0 && state.instruments.length > 0) return;
			this.startDerive();
		}, 7e3);
	}
	startDerive() {
		if (this.deriveOn) return;
		const state = useMarket.getState();
		if (state.source === "deribit" && state.index > 0 && state.instruments.length > 0) return;
		this.deriveOn = true;
		if (this.deriveWatch) {
			clearTimeout(this.deriveWatch);
			this.deriveWatch = null;
		}
		this.derive.start(this.book);
	}
	noteDeribitUp() {
		if (this.deriveWatch) {
			clearTimeout(this.deriveWatch);
			this.deriveWatch = null;
		}
		if (!this.deriveOn) return;
		this.deriveOn = false;
		this.derive.stop();
	}
	onDerive(update) {
		if (!this.deriveOn) return;
		const state = useMarket.getState();
		if (state.source === "deribit" && state.index > 0 && state.instruments.length > 0) {
			this.noteDeribitUp();
			return;
		}
		useMarket.setState((current) => ({
			status: "live",
			transport: update.transport,
			source: "derive",
			error: null,
			index: update.index || current.index,
			prevIndex: current.index || update.index || current.prevIndex,
			instruments: update.instruments.length > 0 ? update.instruments : current.instruments,
			quotes: update.instruments.length > 0 ? update.quotes : {
				...current.quotes,
				...update.quotes
			},
			updatedAt: Date.now(),
			now: Date.now()
		}));
	}
	onDeriveIndex(price) {
		if (!this.deriveOn || useMarket.getState().source !== "derive") return;
		useMarket.setState((state) => ({
			prevIndex: state.index || price,
			index: price,
			now: Date.now()
		}));
	}
	onDeriveError(error) {
		if (!this.deriveOn) return;
		const state = useMarket.getState();
		if (state.source === "deribit" && state.index > 0) return;
		useMarket.setState({
			status: state.index > 0 ? "live" : "offline",
			source: state.index > 0 ? "derive" : state.source,
			error: state.index > 0 ? null : error.message
		});
	}
};
function booksToQuotes(rows) {
	const quotes = {};
	for (const row of rows) {
		if (!row.instrument_name) continue;
		const quote = quoteFromBook(row);
		if (quote) quotes[row.instrument_name] = quote;
	}
	return quotes;
}
function resultOf(payload) {
	if (payload && typeof payload === "object" && "result" in payload) return payload.result;
	return payload;
}
function numberAt(payload, key) {
	const source = resultOf(payload);
	if (!source || typeof source !== "object") return 0;
	const value = source[key];
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
async function fetchJson(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Market request failed (${response.status})`);
	return response.json();
}
async function fetchPublic(method, query) {
	try {
		return await fetchDeribit({ data: {
			method,
			query
		} });
	} catch {
		const url = new URL(`${API}/${method}`);
		for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
		return resultOf(await fetchJson(url.toString()));
	}
}
var feed = new Feed();
function HydraPayoff({ percentMode, split = false, entry: entryProp, accounts: accountsProp }) {
	const currency = useBook((state) => state.currency);
	const stored = useBook((state) => state.props[currency]);
	const accounts = accountsProp ?? stored;
	const index = useMarket((state) => state.index);
	const [hover, setHover] = (0, import_react.useState)(null);
	const settings = (0, import_react.useSyncExternalStore)(subscribeLoop, getLoopSettings, () => LOOP_FALLBACK);
	const fromBook = accounts.find((account) => account.entry > 0)?.entry;
	const entry = entryProp != null && entryProp > 0 ? entryProp : fromBook != null && fromBook > 0 ? fromBook : referenceEntry(percentMode, index, settings.entry);
	const rows = (0, import_react.useMemo)(() => accounts.map((account) => withEntry(account, entry)), [accounts, entry]);
	const book = (0, import_react.useMemo)(() => buildDualBook(rows, entry, settings.sl, settings.side), [
		rows,
		entry,
		settings.sl,
		settings.side
	]);
	const shown = hover ?? book.points.find((point) => Math.abs(point.move) < .04) ?? book.points[0];
	const floors = uniqueFloors(book.series);
	const legDomain = padded(book.points.flatMap((point) => book.series.flatMap((series) => [
		point[series.solidKey],
		point[series.dashKey],
		point[series.dotKey]
	])).concat(floors));
	const cashDomain = padded(book.points.flatMap((point) => [
		point.cash,
		point.cashUp,
		point.cashDn
	]));
	const cushionDomain = padded(book.points.map((point) => point.cushion));
	const scaleKey = `${book.series.map((series) => `${series.id}:${series.floor}`).join("|")}|${legDomain[0]}|${legDomain[1]}|${cashDomain[1]}|${cushionDomain[1]}`;
	const onMove = (state) => {
		const point = state?.activePayload?.[0]?.payload;
		if (point) setHover(point);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: split ? "" : "px-3 py-3",
		children: [
			split ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-semibold",
				children: "Hydra-Payoff"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 max-w-3xl text-xs text-muted",
				children: "Oben jede Linie für sich, unten die Summe. Eine tote Eval ist −Kosten. Bestehen zahlt nichts, es schaltet den neuen Puffer frei."
			})] }),
			shown ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 font-mono text-xs leading-6 tabular-nums sm:text-sm",
				children: [
					shown.move >= 0 ? "+" : "",
					shown.move.toFixed(2),
					"%",
					" · ",
					fmtIndex(shown.price > 0 ? shown.price : entry * (1 + shown.move / 100)),
					book.series.map((series) => {
						const value = legValue(shown, series);
						if (value == null) return null;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							" · ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: { color: series.color },
								children: series.name
							}),
							" ",
							fmtUsd(value, true)
						] }, series.id);
					}),
					" · ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Signed, {
						value: shown.cash,
						text: `Netto-Cash ${fmtUsd(shown.cash, true)}`
					}),
					" · ",
					"Netto-Gesamtpuffer ",
					fmtUsd(shown.cushion, true),
					shown.passed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-long",
						children: " · EVAL PASSED (Neuer Funded-Puffer freigeschaltet!)"
					}) : null
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: "Noch keine Größen in der Tabelle."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: split ? "mt-4 grid gap-4 lg:grid-cols-2" : "",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-xs font-semibold",
							children: "Einzel-Payoffs (Konten-Synchronisation)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 flex flex-wrap gap-x-3 gap-y-1",
							children: book.series.map((series) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1 text-xs text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "inline-block h-2 w-2 rounded-full",
									style: { background: series.color }
								}), series.name]
							}, series.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 h-64",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ComposedChart, {
									data: book.points,
									margin: {
										top: 16,
										right: 8,
										left: 0,
										bottom: 0
									},
									syncId: "hydra",
									onMouseMove: onMove,
									onMouseLeave: () => setHover(null),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
											stroke: "var(--color-line)",
											vertical: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
											dataKey: "move",
											type: "number",
											domain: ["dataMin", "dataMax"],
											tickFormatter: pct,
											stroke: "var(--color-faint)",
											fontSize: 11
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											domain: legDomain,
											tickFormatter: (value) => fmtUsd(value),
											stroke: "var(--color-faint)",
											fontSize: 11,
											width: 72
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { content: () => null }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Guides, {
											failPct: book.failPct,
											passPct: book.passPct,
											hover: hover?.move ?? null
										}),
										floors.map((floor) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
											y: floor,
											stroke: "var(--color-short)",
											strokeDasharray: "3 3",
											label: {
												value: "Max DD",
												fill: "var(--color-short)",
												fontSize: 10,
												position: "insideBottomLeft"
											}
										}, floor)),
										book.series.map((series) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
											type: "linear",
											dataKey: series.solidKey,
											stroke: series.color,
											strokeWidth: 2,
											dot: false,
											connectNulls: false,
											isAnimationActive: false
										}, series.solidKey)),
										book.series.map((series) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
											type: "linear",
											dataKey: series.dashKey,
											stroke: series.color,
											strokeDasharray: "5 4",
											strokeWidth: 1.5,
											dot: false,
											connectNulls: false,
											isAnimationActive: false
										}, series.dashKey)),
										book.series.map((series) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
											type: "linear",
											dataKey: series.dotKey,
											stroke: "none",
											strokeWidth: 0,
											dot: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PassDot, {}),
											connectNulls: false,
											isAnimationActive: false
										}, series.dotKey))
									]
								}, scaleKey)
							})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-xs font-semibold",
							children: "Netto-Payoff-Diagramm (Gesamtbilanz unter dem Strich)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted",
							children: "Weiße Linie ist Cash nach Split und Kosten. Gold ist der Puffer, der beim Bestehen nach oben springt."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 h-64",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ComposedChart, {
									data: book.points,
									margin: {
										top: 16,
										right: 8,
										left: 0,
										bottom: 0
									},
									syncId: "hydra",
									onMouseMove: onMove,
									onMouseLeave: () => setHover(null),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
											stroke: "var(--color-line)",
											vertical: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
											dataKey: "move",
											type: "number",
											domain: ["dataMin", "dataMax"],
											tickFormatter: pct,
											stroke: "var(--color-faint)",
											fontSize: 11
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											yAxisId: "cash",
											domain: cashDomain,
											tickFormatter: (value) => fmtUsd(value),
											stroke: "var(--color-faint)",
											fontSize: 11,
											width: 72
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											yAxisId: "cushion",
											orientation: "right",
											domain: cushionDomain,
											tickFormatter: (value) => fmtUsd(value),
											stroke: "#eab308",
											fontSize: 11,
											width: 72
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { content: () => null }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Guides, {
											failPct: book.failPct,
											passPct: book.passPct,
											hover: hover?.move ?? null
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
											yAxisId: "cash",
											y: 0,
											stroke: "var(--color-faint)"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
											yAxisId: "cash",
											type: "linear",
											dataKey: "cashUp",
											stroke: "none",
											fill: "var(--color-long)",
											fillOpacity: .22,
											isAnimationActive: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
											yAxisId: "cash",
											type: "linear",
											dataKey: "cashDn",
											stroke: "none",
											fill: "var(--color-short)",
											fillOpacity: .2,
											isAnimationActive: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
											yAxisId: "cash",
											type: "linear",
											dataKey: "cash",
											stroke: "var(--color-fg)",
											strokeWidth: 2.25,
											dot: false,
											isAnimationActive: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
											yAxisId: "cushion",
											type: "stepAfter",
											dataKey: "cushion",
											stroke: "#eab308",
											strokeWidth: 2,
											dot: false,
											isAnimationActive: false
										})
									]
								}, `${scaleKey}-net`)
							})
						})
					]
				})]
			})
		]
	});
}
function Guides({ failPct, passPct, hover }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
			x: 0,
			stroke: "var(--color-line)",
			label: {
				value: "Entry",
				fill: "var(--color-faint)",
				fontSize: 10,
				position: "insideTopLeft"
			}
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
			x: failPct,
			stroke: "var(--color-short)",
			strokeDasharray: "4 4",
			label: {
				value: "Eval-SL",
				fill: "var(--color-short)",
				fontSize: 10,
				position: "insideTopRight"
			}
		}),
		passPct != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
			x: passPct,
			stroke: "var(--color-long)",
			strokeDasharray: "4 4",
			label: {
				value: "Eval-Pass",
				fill: "var(--color-long)",
				fontSize: 10,
				position: "insideTopLeft"
			}
		}) : null,
		hover != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
			x: hover,
			stroke: "var(--color-accent)"
		}) : null
	] });
}
function PassDot(props) {
	if (props.value == null || props.cx == null || props.cy == null) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
		cx: props.cx,
		cy: props.cy,
		r: 5,
		fill: "var(--color-long)"
	});
}
function pct(value) {
	return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
function legValue(point, series) {
	const solid = point[series.solidKey];
	const dash = point[series.dashKey];
	if (typeof solid === "number") return solid;
	if (typeof dash === "number") return dash;
	return null;
}
function padded(values) {
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
	const pad = (hi - lo) * .08;
	return [Math.round(lo - pad), Math.round(hi + pad)];
}
function uniqueFloors(series) {
	const floors = series.filter((row) => row.kind === "funded" && row.floor < 0).map((row) => Math.round(row.floor * 100) / 100);
	return [...new Set(floors)];
}
var CYCLE_TEMPLATES = [
	{
		id: "10k",
		label: "10k Safe-Start (10k Funded vs. 10k + 5k Eval)",
		funded: [1e4],
		evals: [1e4, 5e3]
	},
	{
		id: "25k",
		label: "25k Loop (25k Funded vs. 2× 25k Eval)",
		funded: [25e3],
		evals: [25e3, 25e3]
	},
	{
		id: "50k",
		label: "50k Upgrade (2× 25k Funded vs. 2× 50k Eval)",
		funded: [25e3, 25e3],
		evals: [5e4, 5e4]
	},
	{
		id: "100k",
		label: "100k Endgame (100k Funded vs. 2× 100k Eval)",
		funded: [1e5],
		evals: [1e5, 1e5]
	}
];
function slot(id, size, presetId, enabled = true) {
	return {
		id,
		enabled,
		presetId,
		size,
		fill: "market",
		split: 80,
		cost: null,
		buffer: null,
		maxDdPct: null,
		targetPct: null
	};
}
function defaultPlan() {
	return {
		entry: 2500,
		side: "evals-short",
		sl: 1,
		discount: 0,
		extra: 0,
		hedge: "manual",
		funded: [slot("funded-1", 1e4, "breakout")],
		eval1: slot("eval-1", 1e4, "hypernova"),
		eval2: slot("eval-2", 5e3, "cashed"),
		fuzz: null,
		dirtyTarget: null,
		layerShare: null,
		humanRound: true,
		fx: 1.09,
		note: ""
	};
}
function applyTemplate(plan, funded, evals) {
	const fundedPresets = ["breakout", "hypernova"];
	const evalPresets = ["cashed", "iceberg"];
	return {
		...plan,
		fuzz: null,
		dirtyTarget: null,
		layerShare: null,
		note: "",
		funded: funded.map((size, index) => slot(`funded-${index + 1}`, size, fundedPresets[index] ?? "hypernova")),
		eval1: slot("eval-1", evals[0] ?? 1e4, evalPresets[0] ?? "cashed"),
		eval2: slot("eval-2", evals[1] ?? evals[0] ?? 1e4, evalPresets[1] ?? "iceberg", evals.length > 1)
	};
}
function feePair(preset, fill) {
	if (fill === "market") return {
		openPct: preset.takerPct,
		rtPct: preset.takerPct * 2
	};
	return {
		openPct: preset.makerPct,
		rtPct: preset.makerPct + preset.takerPct
	};
}
function firmLabel(preset) {
	const fee = `${preset.name} (${trimPct(preset.makerPct)}% / ${trimPct(preset.takerPct)}%)`;
	return preset.platform ? `${fee} · ${preset.platform}` : fee;
}
function trimPct(value) {
	return String(Math.round(value * 1e3) / 1e3);
}
function availableBuffer(row, preset) {
	if (row.buffer != null && row.buffer >= 0) return row.buffer;
	const pct = row.maxDdPct != null ? row.maxDdPct : preset.maxDdPct;
	return row.size * (pct / 100);
}
function targetPercent(row, preset) {
	return row.targetPct != null ? row.targetPct : preset.targetPct;
}
/** First word of the firm name. "Hypernova Crypto" and "Hypernova Gold" are the same firm. */
function firmFamily(name) {
	return name.trim().split(/\s+/)[0] ?? name.trim();
}
function clashingFirms(names) {
	const counts = /* @__PURE__ */ new Map();
	for (const name of names) {
		const label = firmFamily(name);
		const key = label.toLowerCase();
		const row = counts.get(key);
		if (row) row.n += 1;
		else counts.set(key, {
			label,
			n: 1
		});
	}
	return [...counts.values()].filter((row) => row.n > 1).map((row) => row.label);
}
function asSize(value) {
	return ACCOUNT_SIZES.find((size) => size === value) ?? 1e4;
}
function materialize(plan, presets) {
	const book = presets.length ? presets : DEFAULT_PRESETS;
	const funded = plan.funded.filter((row) => row.enabled);
	const evals = [plan.eval1, ...plan.eval2.enabled ? [plan.eval2] : []];
	const priced = [...funded.map((row) => slotAccount(row, "funded", book, plan)), ...evals.map((row) => slotAccount(row, "challenge", book, plan))].map((account) => withEntry(account, plan.entry));
	const hedge = plan.hedge ?? "balanced";
	const synced = sizeForHedge(priced, plan.sl, plan.extra, plan.side, hedge).accounts.map((account) => ({
		...account,
		size: plan.entry > 0 ? account.positionUsd / plan.entry : 0
	}));
	if (!plan.fuzz || plan.fuzz.length !== synced.length) return synced;
	return synced.map((account, index) => {
		const positionUsd = plan.fuzz?.[index] ?? account.positionUsd;
		return {
			...account,
			positionUsd,
			size: plan.entry > 0 ? positionUsd / plan.entry : 0
		};
	});
}
function slotAccount(row, phase, presets, plan) {
	const preset = presets.find((item) => item.id === row.presetId) ?? presets[0] ?? DEFAULT_PRESETS[0];
	const fees = feePair(preset, row.fill);
	const list = row.cost == null ? priceOf(row.size) : row.cost;
	const discount = phase === "challenge" && row.cost == null ? Math.min(25, Math.max(0, plan.discount)) / 100 : 0;
	const dd = availableBuffer(row, preset);
	return {
		id: row.id,
		name: phase === "funded" ? row.id.endsWith("2") ? "Funded 2" : "Funded" : row.id === "eval-2" ? "Eval #2" : "Eval #1",
		enabled: row.enabled,
		phase,
		size: 0,
		entry: plan.entry,
		account: row.size,
		balance: row.size,
		ddLimit: Math.round((row.size - dd) * 100) / 100,
		dailyLimit: 0,
		profitTarget: phase === "challenge" ? Math.round(row.size * (1 + targetPercent(row, preset) / 100) * 100) / 100 : 0,
		cost: phase === "challenge" ? Math.round(list * (1 - discount) * 100) / 100 : 0,
		split: row.split,
		positionUsd: 0,
		rtFeePct: fees.rtPct,
		openFeePct: fees.openPct,
		presetId: preset.id,
		tag: ""
	};
}
var CYCLE_KEY = "position-builder.cycle.v1";
function loadPlan() {
	const base = defaultPlan();
	if (typeof window === "undefined") return base;
	try {
		const raw = window.localStorage.getItem(CYCLE_KEY);
		if (!raw) return base;
		const parsed = JSON.parse(raw);
		return {
			...base,
			entry: num$2(parsed.entry, base.entry, .01, 1e7),
			side: parsed.side === "evals-long" ? "evals-long" : "evals-short",
			sl: num$2(parsed.sl, base.sl, .2, 3),
			discount: num$2(parsed.discount, 0, 0, 25),
			extra: num$2(parsed.extra, 0, 0, 5e3),
			hedge: hedgeOf(parsed.hedge, num$2(parsed.extra, 0, 0, 5e3)),
			funded: Array.isArray(parsed.funded) && parsed.funded.length ? parsed.funded.map((row, index) => cleanSlot(row, `funded-${index + 1}`)) : base.funded,
			eval1: cleanSlot(parsed.eval1, "eval-1"),
			eval2: cleanSlot(parsed.eval2, "eval-2"),
			fuzz: Array.isArray(parsed.fuzz) ? parsed.fuzz.filter((row) => typeof row === "number") : null,
			dirtyTarget: typeof parsed.dirtyTarget === "number" && parsed.dirtyTarget >= 8 && parsed.dirtyTarget <= 12 ? parsed.dirtyTarget : null,
			layerShare: typeof parsed.layerShare === "number" && parsed.layerShare >= .5 && parsed.layerShare <= .7 ? parsed.layerShare : null,
			humanRound: parsed.humanRound !== false,
			fx: num$2(parsed.fx, 1.09, .5, 2),
			note: typeof parsed.note === "string" ? parsed.note : ""
		};
	} catch {
		return base;
	}
}
function savePlan(plan) {
	window.localStorage.setItem(CYCLE_KEY, JSON.stringify(plan));
}
function presetIdOf(value) {
	if (typeof value !== "string" || !value.trim()) return "breakout";
	if (value.startsWith("firm-")) return value.slice(0, 64);
	return [
		"breakout",
		"hypernova",
		"cashed",
		"iceberg",
		"propr",
		"bungee"
	].includes(value) ? value : "breakout";
}
function cleanSlot(raw, id) {
	const row = raw && typeof raw === "object" ? raw : {};
	return {
		id,
		enabled: row.enabled !== false,
		presetId: presetIdOf(row.presetId),
		size: asSize(typeof row.size === "number" ? row.size : 1e4),
		fill: row.fill === "limit" ? "limit" : "market",
		split: num$2(row.split, 80, 50, 100),
		cost: typeof row.cost === "number" && Number.isFinite(row.cost) ? row.cost : null,
		buffer: typeof row.buffer === "number" && Number.isFinite(row.buffer) ? Math.max(0, row.buffer) : null,
		maxDdPct: optionalPct(row.maxDdPct, .1, 20),
		targetPct: optionalPct(row.targetPct, .1, 30)
	};
}
function hedgeOf(value, _extra) {
	if (value === "manual" || value === "safe" || value === "balanced") return "manual";
	if (value === "auto" || value === "max") return "auto";
	return "manual";
}
function optionalPct(value, min, max) {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return Math.min(max, Math.max(min, value));
}
function num$2(value, fallback, min, max) {
	return Math.min(max, Math.max(min, typeof value === "number" && Number.isFinite(value) ? value : fallback));
}
var BANK_KEY = "position-builder.bankroll.v1";
var TAX_KEY = "position-builder.tax.v1";
function roundEntry(price) {
	if (price >= 100) return Math.round(price * 100) / 100;
	if (price >= 1) return Math.round(price * 1e3) / 1e3;
	return Math.round(price * 1e8) / 1e8;
}
function fmtLive(price) {
	if (price >= 1e3) return price.toLocaleString("en-US", { maximumFractionDigits: 1 });
	if (price >= 1) return price.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	if (price >= .01) return price.toFixed(4);
	return price.toPrecision(3);
}
function LiveBoards({ quotes, liveSymbol, onPick }) {
	const pinned = LIVE_MARKETS.find((market) => market.symbol === liveSymbol);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] text-faint",
			children: pinned ? `${pinned.id} folgt ${quotes[pinned.symbol]?.futures === false ? "dem letzten Hyperliquid-Kurs" : "Hyperliquid"}. Tippen ins Feld macht den Kurs manuell.` : "Manueller Kurs aktiv. Ein Button startet den Live-Kurs."
		}), ["crypto", "tradfi"].map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] uppercase tracking-[0.14em] text-muted",
				children: group === "crypto" ? "Crypto" : "TradFi"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1 flex flex-wrap gap-1",
				children: LIVE_MARKETS.filter((market) => market.group === group).map((market) => {
					const row = quotes[market.symbol];
					const on = liveSymbol === market.symbol;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: cn("h-7 rounded-full px-2 font-mono text-[11px]", on ? "bg-fg text-bg" : "bg-bg text-muted"),
						onClick: () => onPick(market.symbol),
						children: [
							market.id,
							" ",
							row ? fmtLive(row.price) : "…"
						]
					}, market.symbol);
				})
			})]
		}, group))]
	});
}
var HEDGE_MODES = [{
	id: "manual",
	label: "✏️ Manuell"
}, {
	id: "auto",
	label: "🧠 Smart-Hedge (Auto, 10% Restpuffer)"
}];
function HydraWizard() {
	const currency = useBook((state) => state.currency);
	const setProps = useBook((state) => state.setProps);
	const [plan, setPlan] = (0, import_react.useState)(defaultPlan);
	const [presets, setPresets] = (0, import_react.useState)(DEFAULT_PRESETS);
	const [firmsOpen, setFirmsOpen] = (0, import_react.useState)(false);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [left, setLeft] = (0, import_react.useState)(null);
	const [bank, setBank] = (0, import_react.useState)({
		cash: 500,
		fails: 0
	});
	const [ledger, setLedger] = (0, import_react.useState)([]);
	const [quotes, setQuotes] = (0, import_react.useState)({});
	const [liveSymbol, setLiveSymbol] = (0, import_react.useState)(null);
	const entryRef = (0, import_react.useRef)(null);
	const livePaused = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		const loaded = loadPlan();
		setPlan(loaded);
		if (entryRef.current) entryRef.current.value = String(loaded.entry);
		setPresets(loadPresets());
		setBank(loadBank());
		setLedger(loadLedger());
		setReady(true);
	}, []);
	const accounts = (0, import_react.useMemo)(() => materialize(plan, presets), [plan, presets]);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		savePlan(plan);
		const failPrice = plan.entry * (1 + failFraction(plan.side, plan.sl));
		const fundedPayout = accounts.filter((account) => account.enabled && account.phase === "funded").reduce((sum, account) => sum + accountCash(account, failPrice), 0);
		const evalCosts = accounts.filter((account) => account.enabled && account.phase === "challenge").reduce((sum, account) => sum + account.cost, 0);
		setLoopSettings({
			entry: plan.entry,
			sl: plan.sl,
			extra: plan.hedge === "manual" ? plan.extra : Math.max(0, Math.round((fundedPayout - evalCosts) * 100) / 100),
			discount: plan.discount,
			side: plan.side,
			split: plan.funded[0]?.split ?? 80
		});
		setProps(currency, accounts);
	}, [
		ready,
		plan,
		accounts,
		currency,
		setProps
	]);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		window.localStorage.setItem(BANK_KEY, JSON.stringify(bank));
	}, [bank, ready]);
	(0, import_react.useEffect)(() => {
		if (left == null) return;
		if (left <= 0) {
			setLeft(null);
			beep();
			return;
		}
		const timer = window.setTimeout(() => setLeft((value) => value == null ? null : value - 1), 1e3);
		return () => window.clearTimeout(timer);
	}, [left]);
	(0, import_react.useEffect)(() => {
		let stop = false;
		const pull = () => {
			fetchLiveQuotes().then((next) => {
				if (!stop) setQuotes(next);
			});
		};
		pull();
		const timer = window.setInterval(pull, 5e3);
		return () => {
			stop = true;
			window.clearInterval(timer);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (livePaused.current || !liveSymbol) return;
		const price = quotes[liveSymbol]?.price;
		if (!(price > 0)) return;
		if (entryRef.current && document.activeElement === entryRef.current) return;
		const next = roundEntry(price);
		if (entryRef.current) entryRef.current.value = String(next);
		setPlan((prev) => prev.entry === next ? prev : {
			...prev,
			entry: next
		});
	}, [liveSymbol, quotes]);
	const pauseLive = () => {
		livePaused.current = true;
		setLiveSymbol(null);
	};
	const edit = (patch) => setPlan((prev) => ({
		...prev,
		...patch,
		fuzz: null,
		dirtyTarget: null,
		layerShare: null
	}));
	const tweak = (patch) => setPlan((prev) => ({
		...prev,
		...patch
	}));
	const recalculate = () => {
		const typed = Number(entryRef.current?.value);
		setPlan((prev) => ({
			...prev,
			fuzz: null,
			entry: typed > 0 ? typed : prev.entry
		}));
		setPresets((prev) => prev.map((row) => ({ ...row })));
	};
	const saveTax = (rows) => {
		setLedger((prev) => {
			let nr = prev.reduce((max, row) => Math.max(max, row.nr), 0);
			const next = [...rows.map((row) => ({
				...row,
				nr: nr += 1
			})), ...prev].slice(0, 400);
			window.localStorage.setItem(TAX_KEY, JSON.stringify(next));
			return next;
		});
	};
	const evals = accounts.filter((account) => account.enabled && account.phase === "challenge");
	const funds = accounts.filter((account) => account.enabled && account.phase === "funded");
	const failMove = failFraction(plan.side, plan.sl);
	const failPrice = plan.entry * (1 + failMove);
	const payout = funds.reduce((sum, account) => sum + accountCash(account, failPrice), 0);
	const costs = evals.reduce((sum, account) => sum + account.cost, 0);
	const net = payout - costs;
	const pass = collectivePassMove(evals, plan.side);
	const passAbs = pass == null ? 0 : Math.abs(pass);
	const fundedLoss = funds.reduce((sum, account) => sum + Math.abs(account.positionUsd) * (passAbs + account.rtFeePct / 100), 0);
	const remaining = funds.reduce((sum, account) => sum + (maxDdUsd(account) - Math.abs(account.positionUsd) * (passAbs + account.rtFeePct / 100)), 0);
	const families = clashingFirms(accounts.filter((account) => account.enabled).map((account) => presets.find((row) => row.id === account.presetId)?.name ?? account.presetId));
	const clash = families.length > 0;
	const alive = remaining > 0 && !clash && net >= -.5;
	const unhedgeable = evals.length > 0 && (funds.length === 0 || remaining <= 0);
	const uncovered = evals.length > 0 && funds.length > 0 && net < -.5;
	const failLabel = `${failMove >= 0 ? "+" : ""}${(failMove * 100).toFixed(2)}%`;
	const passLabel = `${(pass ?? (plan.side === "evals-short" ? -.03 : .03)) * 100 >= 0 ? "+" : ""}${((pass ?? (plan.side === "evals-short" ? -.03 : .03)) * 100).toFixed(2)}%`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex w-full flex-col gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-2xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-semibold",
						children: "1. Zyklus-Stufe & Marktpreis eingeben"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: CYCLE_TEMPLATES.map((template) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => setPlan((prev) => applyTemplate(prev, template.funded, template.evals)),
							children: template.label
						}, template.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Aktueller Kurs / Entry $", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: entryRef,
									className: "mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3 text-right font-mono text-lg text-fg",
									inputMode: "decimal",
									defaultValue: plan.entry,
									onPointerDown: pauseLive,
									onFocus: pauseLive,
									onChange: (event) => {
										pauseLive();
										const next = Number(event.target.value);
										if (next > 0) edit({ entry: next });
									}
								})] })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-muted",
								children: ["Setup-Richtung", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 grid gap-1",
									children: [["evals-short", "Evals SHORT / Funded LONG"], ["evals-long", "Evals LONG / Funded SHORT"]].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: cn("h-6 rounded-lg px-2 text-[11px]", plan.side === id ? "bg-fg text-bg" : "bg-bg text-muted"),
										onClick: () => edit({ side: id }),
										children: label
									}, id))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs text-muted",
								children: ["Eval-Breach bei %", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3 text-right font-mono text-lg text-fg",
									type: "number",
									min: .2,
									max: 3,
									step: .05,
									value: plan.sl,
									onChange: (event) => edit({ sl: Number(event.target.value) })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs text-muted",
								children: ["Eval-Rabatt %", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3 text-right font-mono text-lg text-fg",
									type: "number",
									min: 0,
									max: 25,
									step: 1,
									value: plan.discount,
									onChange: (event) => edit({ discount: Number(event.target.value) })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs text-muted",
								children: ["Extra-Gewinn bei Eval-Tod (Over-Hedge $)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3 text-right font-mono text-lg text-fg disabled:opacity-40",
									type: "number",
									min: 0,
									max: 5e3,
									step: 5,
									disabled: plan.hedge === "auto",
									value: plan.extra,
									onChange: (event) => edit({
										extra: Number(event.target.value),
										hedge: "manual"
									})
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveBoards, {
						quotes,
						liveSymbol,
						onPick: (symbol) => {
							const quote = quotes[symbol];
							const nextOn = liveSymbol !== symbol;
							if (nextOn) livePaused.current = false;
							else pauseLive();
							setLiveSymbol(nextOn ? symbol : null);
							if (nextOn && quote && quote.price > 0) {
								const next = roundEntry(quote.price);
								if (entryRef.current) entryRef.current.value = String(next);
								edit({ entry: next });
							}
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: "Hedge-Modus (Smart-Sizing)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 grid gap-2 sm:grid-cols-2",
							children: HEDGE_MODES.map((mode) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: cn("rounded-xl border px-3 py-2 text-left text-xs", plan.hedge === mode.id ? "border-accent bg-accent/15 text-fg" : "border-line bg-bg text-muted"),
								onClick: () => edit({ hedge: mode.id }),
								children: mode.label
							}, mode.id))
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-2xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm font-semibold",
							children: "2. Konten & Prop-Firms auswählen"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								tone: "accent",
								onClick: recalculate,
								children: "Neu berechnen"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								onClick: () => setFirmsOpen(true),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "h-4 w-4" }), "Eigene Prop-Firms verwalten"]
							})]
						})]
					}),
					firmsOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FirmManager, {
						presets,
						onChange: (next) => {
							setPresets(next);
							savePresets(next);
						},
						onRemove: (id) => {
							const next = presets.filter((row) => row.id !== id);
							setPresets(next);
							savePresets(next);
							setPlan((prev) => ({
								...prev,
								fuzz: null,
								funded: prev.funded.map((row) => row.presetId === id ? {
									...row,
									presetId: next[0]?.id ?? "breakout"
								} : row),
								eval1: prev.eval1.presetId === id ? {
									...prev.eval1,
									presetId: next[0]?.id ?? "breakout"
								} : prev.eval1,
								eval2: prev.eval2.presetId === id ? {
									...prev.eval2,
									presetId: next[0]?.id ?? "breakout"
								} : prev.eval2
							}));
						},
						onClose: () => {
							recalculate();
							setFirmsOpen(false);
						}
					}) : null,
					unhedgeable || uncovered ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 rounded-xl bg-short/15 px-3 py-2 text-sm",
						children: [unhedgeable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold",
							children: funds.length === 0 ? "Nicht hedgebar: kein Funded-Konto aktiv." : `Nicht hedgebar: Beim Eval-Sieg bleibt kein Funded-Puffer (${fmtUsd(remaining, true)}).`
						}) : null, uncovered ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-semibold",
							children: [
								"Nicht gedeckt: Das Payout ",
								fmtUsd(payout),
								" reicht nicht für die Eval-Kosten ",
								fmtUsd(costs),
								"."
							]
						}) : null]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 grid gap-3 lg:grid-cols-3",
						children: [
							plan.funded.map((row, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountCard, {
								title: `Konto ${index + 1}: Mein Funded-Account`,
								kind: "funded",
								slot: row,
								presets,
								onChange: (patch) => edit({ funded: plan.funded.map((item) => item.id === row.id ? {
									...item,
									...patch
								} : item) })
							}, row.id)),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountCard, {
								title: `Konto ${plan.funded.length + 1}: Eval-Challenge #1`,
								kind: "eval",
								slot: plan.eval1,
								presets,
								onChange: (patch) => edit({ eval1: {
									...plan.eval1,
									...patch
								} })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountCard, {
								title: `Konto ${plan.funded.length + 2}: Eval-Challenge #2`,
								kind: "eval",
								slot: plan.eval2,
								presets,
								toggle: true,
								onChange: (patch) => edit({ eval2: {
									...plan.eval2,
									...patch
								} })
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-2xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-semibold",
						children: "3. Fertige Orders ablesen & im Anti-Detect-Browser eintippen"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: cn("mt-3 rounded-2xl px-4 py-3 text-sm", alive ? "bg-long/15 text-fg" : "bg-short/15 text-fg"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HedgeLine, {
								mode: plan.hedge,
								costs,
								extra: net,
								reserve: remaining,
								failLabel
							}),
							unhedgeable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-semibold",
								children: funds.length === 0 ? "Nicht hedgebar: Es ist kein Funded-Konto aktiv." : `Nicht hedgebar: Beim Eval-Sieg läge das Funded ${fmtUsd(Math.abs(remaining))} unter dem Drawdown. Die Evals lassen sich so nicht absichern.`
							}) : null,
							uncovered ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-semibold",
								children: [
									"Nicht gedeckt: Das Payout ",
									fmtUsd(payout),
									" reicht nicht für die Eval-Kosten ",
									fmtUsd(costs),
									"."
								]
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2",
								children: [
									"Bei ",
									failLabel,
									" Kursbewegung (Evals breachen): Funded gewinnt ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: fmtUsd(payout) }),
									" (nach Split & Fees) und bezahlt alle Eval-Kosten (",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: fmtUsd(costs) }),
									"). Netto-Ergebnis: ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: fmtUsd(net, true) }),
									"."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2",
								children: [
									"Bei ",
									passLabel,
									" Kursbewegung (Evals bestehen): Du schaltest ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [evals.length, " neue Funded-Konten"] }),
									" frei. Dein alter Funded verliert ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: fmtUsd(fundedLoss) }),
									" und überlebt mit ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: fmtUsd(remaining, true) }),
									" Restpuffer."
								]
							}),
							clash ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 font-semibold text-short",
								children: [
									"ACHTUNG: Gleiche Prop-Firm (",
									families.join(", "),
									") mehrfach ausgewählt – Copy-Trading-Sperre!"
								]
							}) : null
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								tone: "accent",
								onClick: () => {
									const fuzzed = fuzzWide(materialize({
										...plan,
										fuzz: null,
										dirtyTarget: null,
										layerShare: null
									}, presets), plan.entry, plan.sl, plan.side, .009);
									const dirty = Math.round((9.14 + Math.random() * .2) * 100) / 100;
									const layer = Math.round((.53 + Math.random() * .09) * 1e3) / 1e3;
									setPlan((prev) => ({
										...prev,
										fuzz: fuzzed.map((account) => account.positionUsd),
										dirtyTarget: dirty,
										layerShare: layer
									}));
								},
								children: "🎲 Tarn-Modus (Fuzzing + Dirty-Target + Human-Rounding)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								onClick: () => setLeft(90 + Math.floor(Math.random() * 91)),
								children: "⏱️ Stealth-Timer starten (Zufall 90s–180s)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: cn("h-9 rounded-full px-3 text-xs", plan.humanRound ? "bg-fg text-bg" : "bg-bg text-muted"),
								onClick: () => tweak({ humanRound: !plan.humanRound }),
								children: ["🖐️ Menschliche Rundung (2 Nachkommastellen) ", plan.humanRound ? "AN" : "AUS"]
							}),
							left != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-mono text-4xl tabular-nums text-accent",
								children: [left, "s"]
							}) : null
						]
					}),
					plan.dirtyTarget != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-xs text-muted",
						children: [
							"Tarn aktiv: Eval-Target ",
							plan.dirtyTarget.toFixed(2),
							"% statt 9,00% · Schichten ",
							Math.round((plan.layerShare ?? .55) * 100),
							"% / ",
							100 - Math.round((plan.layerShare ?? .55) * 100),
							"%."
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 grid gap-3 lg:grid-cols-3",
						children: accounts.filter((account) => account.enabled).map((account) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticket, {
							account,
							plan,
							presets,
							pass,
							entry: plan.entry
						}, account.id))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-2xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-semibold",
						children: "4. Payoff-Kurven & Steuer-Dokumentation"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HydraPayoff, {
							percentMode: false,
							split: true,
							entry: plan.entry,
							accounts
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 rounded-xl bg-bg p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-sm font-semibold",
								children: "Zyklus abschließen"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 text-sm text-muted",
								children: [
									"Aktuelles Wallet-Cash: ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: "text-fg",
										children: fmtUsd(bank.cash)
									}),
									" · ",
									"Fehlversuche in dieser Stufe: ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: "text-fg",
										children: bank.fails
									})
								]
							}),
							plan.note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-preview",
								children: plan.note
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "mt-3 block max-w-xs text-xs text-muted",
								children: ["Aktueller BMF-Monatskurs (EUR/USD)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "mt-1 h-11 w-full rounded-xl border border-line bg-surface px-3 text-right font-mono text-base text-fg",
									type: "number",
									min: .5,
									max: 2,
									step: .01,
									value: plan.fx,
									onChange: (event) => tweak({ fx: Number(event.target.value) })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 flex flex-wrap gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									tone: "buy",
									onClick: () => {
										setBank((prev) => ({
											cash: Math.round((prev.cash + net) * 100) / 100,
											fails: prev.fails + 1
										}));
										saveTax(taxLines("breach", evals, funds, presets, payout, plan.fx));
									},
									children: [
										"💥 Evals im Breach (",
										failLabel,
										") → Payout & Ausgaben buchen"
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									tone: "accent",
									onClick: () => {
										saveTax(taxLines("pass", evals, funds, presets, 0, plan.fx));
										setPlan((prev) => ({
											...prev,
											fuzz: null,
											dirtyTarget: null,
											layerShare: null,
											note: "Altes Funded im Cooldown. Eval #1 ist jetzt das Funded. Eval #2 ist die Cash-Kuh und aus dem Hedge.",
											funded: [{
												...prev.funded[0],
												presetId: prev.eval1.presetId,
												size: prev.eval1.size,
												fill: prev.eval1.fill,
												enabled: true,
												buffer: null
											}],
											eval1: {
												...prev.eval1,
												enabled: false
											},
											eval2: {
												...prev.eval2,
												enabled: false
											}
										}));
										setBank((prev) => ({
											...prev,
											fails: 0
										}));
									},
									children: [
										"🏆 Evals bestanden (",
										passLabel,
										") → Rotation & Ausgaben buchen"
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ledger, {
								rows: ledger,
								onClear: () => {
									setLedger([]);
									window.localStorage.setItem(TAX_KEY, "[]");
								}
							})
						]
					})
				]
			})
		]
	});
}
function HedgeLine({ mode, costs, extra, reserve, failLabel }) {
	const pct = hedgeReserve(mode);
	if (pct == null && mode !== "safe") return null;
	if (mode === "safe") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "font-semibold",
		children: "🛡️ 100% Sicherheits-Modus: Funded holt exakt die Eval-Kosten rein. Extra-Gewinn $0."
	});
	if (extra <= .5) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "font-semibold",
		children: "🧠 Smart-Hedge: Mehr Over-Hedge würde den 10%-Restpuffer unterschreiten. Over-Hedge bleibt $0."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "font-semibold",
		children: [
			"🧠 Smart-Hedge aktiv: Funded zahlt alle Eval-Kosten (",
			fmtUsd(costs),
			") + ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [fmtUsd(extra), " automatischer Extra-Gewinn"] }),
			" bei ",
			failLabel,
			" Move (und behält exakt ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
				fmtUsd(reserve),
				" (",
				Math.round((pct ?? 0) * 100),
				"%)"
			] }),
			" Sicherheits-Reserve bei Eval-Sieg)!"
		]
	});
}
function AccountCard({ title, kind, slot, presets, toggle = false, onChange }) {
	const preset = presets.find((row) => row.id === slot.presetId) ?? presets[0];
	const ddPct = slot.maxDdPct ?? preset?.maxDdPct ?? 3;
	const target = slot.targetPct ?? preset?.targetPct ?? 9;
	const autoBuffer = slot.size * (ddPct / 100);
	const dd = slot.buffer != null ? slot.buffer : autoBuffer;
	const price = slot.cost == null ? priceOf(slot.size) : slot.cost;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: cn("rounded-2xl border border-line bg-bg p-3", !slot.enabled && "opacity-50"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-semibold",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-1",
					children: toggle || !slot.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "h-7 rounded-full px-2 text-[11px] text-muted",
						onClick: () => onChange({ enabled: !slot.enabled }),
						children: slot.enabled ? "An" : "Aus"
					}) : null
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				className: "mt-3 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm text-fg",
				"aria-label": "Prop-Firm",
				value: slot.presetId,
				onChange: (event) => onChange({ presetId: event.target.value }),
				children: presets.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: row.id,
					children: firmLabel(row)
				}, row.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mt-2 block text-[11px] text-muted",
				children: ["Ausführung", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: "mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm text-fg",
					value: slot.fill,
					onChange: (event) => onChange({ fill: event.target.value === "limit" ? "limit" : "market" }),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "market",
						children: "Market"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "limit",
						children: "Limit"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 grid grid-cols-2 gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: "h-11 rounded-xl border border-line bg-surface px-2 text-sm text-fg",
					"aria-label": "Kontogröße",
					value: slot.size,
					onChange: (event) => onChange({
						size: Number(event.target.value),
						cost: null,
						buffer: null
					}),
					children: ACCOUNT_SIZES.map((size) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
						value: size,
						children: [size / 1e3, "k"]
					}, size))
				}), kind === "eval" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-[11px] text-muted",
					children: ["Eval-Kaufpreis ($)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "mt-1 h-11 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-base text-fg",
						inputMode: "decimal",
						value: price,
						onChange: (event) => {
							const next = Number(event.target.value);
							onChange({ cost: Number.isFinite(next) ? Math.max(0, next) : 0 });
						}
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-[11px] text-muted",
					children: ["Split %", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "mt-1 h-11 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-base text-fg",
						type: "number",
						min: 50,
						max: 100,
						step: 1,
						value: slot.split,
						onChange: (event) => onChange({ split: Number(event.target.value) })
					})]
				})]
			}),
			kind === "funded" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mt-2 block text-[11px] text-muted",
				children: [
					"Verfügbarer DD-Puffer ($)",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "mt-1 h-11 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-base text-fg",
						type: "number",
						min: 0,
						step: 10,
						value: slot.buffer != null ? slot.buffer : Math.round(autoBuffer),
						onChange: (event) => {
							const next = Number(event.target.value);
							onChange({ buffer: Number.isFinite(next) ? Math.max(0, next) : 0 });
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "mt-1 block",
						children: [slot.buffer == null ? `Standard ${ddPct}% = ${fmtUsd(autoBuffer)}` : `${(dd / slot.size * 100).toFixed(2)}% von ${fmtUsd(slot.size)}`, ". Dieser Betrag ist der Max-DD für Restpuffer und Sicherheits-Stop."]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 grid grid-cols-2 gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-[11px] text-muted",
					children: ["Max DD %", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-sm text-fg",
						type: "number",
						min: .1,
						max: 20,
						step: .1,
						value: ddPct,
						onChange: (event) => {
							const next = Number(event.target.value);
							onChange({
								maxDdPct: Number.isFinite(next) ? next : 3,
								buffer: null
							});
						}
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-[11px] text-muted",
					children: ["Profit Target %", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-sm text-fg",
						type: "number",
						min: .1,
						max: 30,
						step: .1,
						value: target,
						onChange: (event) => {
							const next = Number(event.target.value);
							onChange({ targetPct: Number.isFinite(next) ? next : 9 });
						}
					})]
				})]
			})
		]
	});
}
function camouflageTp(account, entry, dirtyPct) {
	if (account.phase !== "challenge" || dirtyPct == null || !(entry > 0)) return null;
	const need = account.account * (dirtyPct / 100) + Math.abs(account.positionUsd) * (account.rtFeePct / 100);
	if (!(Math.abs(account.positionUsd) > 0) || !(need > 0)) return null;
	const price = entry * (1 + need / account.positionUsd);
	return price > 0 ? price : null;
}
function fmtPx$1(value) {
	const abs = Math.abs(value);
	if (abs >= 100) return abs.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	if (abs >= 1) return abs.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 4
	});
	if (abs >= .01) return abs.toFixed(5);
	return abs.toPrecision(4);
}
function copyPx(value) {
	const abs = Math.abs(value);
	if (abs >= 100) return abs.toFixed(2);
	if (abs >= 1) return abs.toFixed(4);
	if (abs >= .01) return abs.toFixed(5);
	return abs.toPrecision(4);
}
function Ticket({ account, plan, presets, pass, entry }) {
	const preset = presets.find((row) => row.id === account.presetId);
	const orders = orderPrices(account, entry, plan.sl, plan.side, pass);
	const fail = failFraction(plan.side, plan.sl);
	const short = account.phase === "challenge" ? plan.side === "evals-short" : plan.side !== "evals-short";
	const coins = entry > 0 ? Math.abs(account.positionUsd / entry) : 0;
	const usd = Math.abs(account.positionUsd);
	const human = plan.humanRound !== false;
	const share = plan.layerShare != null && plan.layerShare > 0 && plan.layerShare < 1 ? plan.layerShare : .55;
	const total = human ? Math.round(coins * 100) / 100 : coins;
	const layer1 = human ? Math.round(total * share * 100) / 100 : total * share;
	const layer2 = human ? Math.round((total - layer1) * 100) / 100 : total - layer1;
	const qty = (value) => human ? value.toFixed(2) : value.toFixed(4);
	const leverage = account.account > 0 ? Math.abs(account.positionUsd) / account.account : 0;
	const openFee = Math.abs(account.positionUsd) * ((account.openFeePct ?? account.rtFeePct / 2) / 100);
	const rtFee = Math.abs(account.positionUsd) * (account.rtFeePct / 100);
	const economicTp = account.phase === "challenge" ? orders.tp : entry > 0 ? entry * (1 + fail) : null;
	const mainTp = (account.phase === "challenge" ? camouflageTp(account, entry, plan.dirtyTarget) : null) ?? economicTp;
	const tpMove = mainTp != null && entry > 0 ? mainTp / entry - 1 : fail;
	const sign = Math.sign(tpMove || fail || 1) || 1;
	const before = mainTp != null && entry > 0 ? mainTp - sign * entry * 6e-4 : null;
	const behind = (() => {
		if (mainTp == null || !(entry > 0)) return null;
		if (account.phase === "challenge" && before != null && layer2 > 0) return (mainTp * (layer1 + layer2) - before * layer1) / layer2;
		return mainTp + sign * entry * 7e-4;
	})();
	const dummy = entry > 0 ? entry * (1 + Math.sign(fail || 1) * .035) : null;
	const slMove = orders.sl != null && entry > 0 ? (orders.sl / entry - 1) * 100 : null;
	const layerA = Math.round(share * 100);
	const layerNote = `${layerA}% / ${100 - layerA}%`;
	const failPct = `${fail >= 0 ? "+" : ""}${(fail * 100).toFixed(2)}%`;
	const px = (value) => value != null && Number.isFinite(value) ? fmtPx$1(value) : "—";
	const layer1Px = account.phase === "funded" ? mainTp : before;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "rounded-2xl border border-line bg-bg p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-semibold",
						children: account.phase === "funded" ? "Funded" : account.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: preset?.name ?? "Firma"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-[11px] text-faint",
						children: ["🔐 ", preset?.wallet?.trim() || "Wallet nicht hinterlegt"]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("rounded-full px-2 py-1 text-xs font-semibold", short ? "bg-short/20 text-short" : "bg-long/20 text-long"),
					children: short ? "SHORT / VERKAUFEN" : "LONG / KAUFEN"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
				label: "Gesamt-Stückzahl (Coins/Lots)",
				value: total,
				text: qty(total),
				copyText: qty(total)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
				label: "Positionsgröße USD",
				value: usd,
				text: fmtUsd(usd),
				copyText: usd.toFixed(2),
				hint: account.phase === "challenge" ? `Hebel ${leverage.toFixed(2)}× · Fee ${fmtUsd(openFee)} (Breach) / ${fmtUsd(rtFee)} (TP)` : `Hebel ${leverage.toFixed(2)}× · Fee ${fmtUsd(rtFee)} Round-Trip`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 rounded-xl border border-line bg-surface p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs font-semibold",
						children: [
							"🛡️ 2-Schichten-Eingabe (",
							layerNote,
							" Scaling-In)"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[11px] text-muted",
						children: "Schicht 1 · sofort von Hand eintippen"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
						label: "Menge Schicht 1",
						value: layer1,
						text: qty(layer1),
						copyText: qty(layer1)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
						label: "Kurs / Preisalarm Schicht 1",
						value: layer1Px,
						text: px(layer1Px),
						copyText: layer1Px != null ? copyPx(layer1Px) : void 0,
						hint: account.phase === "funded" ? `Echter ${failPct}-Zielkurs. Hier die erste Hälfte schließen.` : "0,06% vor dem Haupt-TP."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[11px] text-muted",
						children: "Schicht 2 · nach 3–5 Min. nachlegen"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
						label: "Menge Schicht 2",
						value: layer2,
						text: qty(layer2),
						copyText: qty(layer2)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
						label: "Kurs / Preisalarm Schicht 2",
						value: behind,
						text: px(behind),
						copyText: behind != null ? copyPx(behind) : void 0,
						hint: account.phase === "funded" ? "0,07% hinter dem echten Schließ-Kurs." : "Liegt hinter dem Haupt-TP, sodass Schicht 1 und 2 im Schnitt exakt das Target treffen."
					})
				]
			}),
			account.phase === "funded" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
					label: "👁️ Optischer Tarn-TP fürs Orderbuch (+3,50% Move)",
					value: dummy,
					text: px(dummy),
					copyText: dummy != null ? copyPx(dummy) : void 0,
					hint: "Diesen weiten Dummy-TP ins Orderbuch eintragen, damit das Chance-Risiko-Verhältnis für die Risk-Engine gesund (1:1) aussieht."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
					label: `🔔 Echter Schließ-Kurs per Preisalarm (${failPct} Move)`,
					value: mainTp,
					text: px(mainTp),
					copyText: mainTp != null ? copyPx(mainTp) : void 0,
					hint: "Bei diesem Kurs den Funded-Trade manuell schließen, sobald die Evals gebreached sind."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
					label: "Stop-Loss Kurs (SL)",
					value: orders.sl,
					text: px(orders.sl),
					copyText: orders.sl != null ? copyPx(orders.sl) : void 0,
					hint: slMove != null ? `Sicherheits-SL bei 95% Max-DD (${slMove >= 0 ? "+" : ""}${slMove.toFixed(2)}%), hinter dem Eval-TP.` : ""
				})
			] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
				label: "Stop-Loss Kurs",
				value: orders.sl,
				text: px(orders.sl),
				copyText: orders.sl != null ? copyPx(orders.sl) : void 0,
				hint: "Keinen SL ins Orderbuch legen! Konto schließt bei diesem Kurs automatisch durch den Equity-Breach, ohne Closing-Fee. Für den TP den TradingView-Preisalarm nutzen."
			})
		]
	});
}
function CopyRow({ label, value, text, hint, warn, copyText }) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-1 flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: cn("font-mono text-xl tabular-nums", warn && "text-preview"),
					children: text
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-8 rounded-full bg-raised px-3 text-xs",
					disabled: value == null,
					onClick: () => {
						if (value == null) return;
						const raw = copyText ?? String(Math.abs(Math.round(value * 1e8) / 1e8));
						navigator.clipboard?.writeText(raw);
						setCopied(true);
						window.setTimeout(() => setCopied(false), 900);
					},
					children: copied ? "Kopiert!" : "Kopieren"
				})]
			}),
			hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-faint",
				children: hint
			}) : null
		]
	});
}
function FirmManager({ presets, onChange, onRemove, onClose }) {
	(0, import_react.useEffect)(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (event) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = previous;
			window.removeEventListener("keydown", onKey);
		};
	}, [onClose]);
	const patch = (id, next) => {
		onChange(presets.map((row) => {
			if (row.id !== id) return row;
			const makerPct = next.makerPct == null || !Number.isFinite(next.makerPct) ? row.makerPct : Math.min(5, Math.max(0, next.makerPct));
			const takerPct = next.takerPct == null || !Number.isFinite(next.takerPct) ? row.takerPct : Math.min(5, Math.max(0, next.takerPct));
			return {
				...row,
				...next,
				makerPct,
				takerPct,
				rtPct: takerPct * 2
			};
		}));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			role: "dialog",
			"aria-labelledby": "firm-manager-title",
			className: "max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-card",
			onClick: (event) => event.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						id: "firm-manager-title",
						className: "text-base font-semibold",
						children: "Eigene Prop-Firms"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted",
						children: "Maker- und Taker-Gebühr gelten sofort für jedes Konto, das die Firma nutzt."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "h-9 rounded-full px-3 text-xs text-muted",
						onClick: onClose,
						children: "Schließen"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 grid gap-2",
					children: presets.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-bg p-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid items-end gap-2 sm:grid-cols-[1fr_11rem_auto]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "text-[11px] text-muted",
										children: ["Firmenname", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											className: "mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm text-fg",
											value: preset.name,
											maxLength: 48,
											onChange: (event) => patch(preset.id, { name: event.target.value })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "text-[11px] text-muted",
										children: ["Handelsplattform", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											className: "mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm text-fg",
											value: preset.platform,
											onChange: (event) => patch(preset.id, { platform: event.target.value }),
											children: FIRM_PLATFORMS.map((platform) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: platform,
												children: platform
											}, platform))
										})]
									}),
									preset.custom ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "h-10 rounded-xl px-3 text-short",
										"aria-label": `${preset.name} löschen`,
										onClick: () => onRemove(preset.id),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "hidden h-10 sm:block" })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "mt-2 block text-[11px] text-muted",
								children: ["Wallet & Anti-Detect-Profil", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm text-fg",
									value: preset.wallet,
									maxLength: 80,
									onChange: (event) => patch(preset.id, { wallet: event.target.value })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 grid gap-2 sm:grid-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-[11px] text-muted",
									children: ["Maker-Gebühr %", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-sm text-fg",
										type: "number",
										min: 0,
										max: 5,
										step: .001,
										value: preset.makerPct,
										onChange: (event) => patch(preset.id, { makerPct: Number(event.target.value) })
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-[11px] text-muted",
									children: ["Taker-Gebühr %", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-sm text-fg",
										type: "number",
										min: 0,
										max: 5,
										step: .001,
										value: preset.takerPct,
										onChange: (event) => patch(preset.id, { takerPct: Number(event.target.value) })
									})]
								})]
							})
						]
					}, preset.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => onChange([...presets, {
							id: `firm-${crypto.randomUUID()}`,
							name: "Neue Prop-Firm",
							makerPct: 0,
							takerPct: .04,
							rtPct: .08,
							split: 80,
							maxDdPct: 3,
							targetPct: 9,
							platform: "Eigenes System",
							wallet: "Neue Wallet · neues Profil",
							custom: true
						}]),
						children: "+ Neue Prop-Firm hinzufügen"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						tone: "accent",
						onClick: onClose,
						children: "Speichern und neu berechnen"
					})]
				})
			]
		})
	});
}
function taxLines(kind, evals, funds, presets, payout, fxRate) {
	const fx = fxRate > 0 ? fxRate : 1.09;
	const toEur = (usd) => Math.round(usd / fx * 100) / 100;
	const stamp = (/* @__PURE__ */ new Date()).toISOString();
	const rows = evals.map((account) => {
		const preset = presets.find((row) => row.id === account.presetId);
		const usd = -Math.round(Math.abs(account.cost) * 100) / 100;
		return {
			date: stamp,
			text: `${kind === "breach" ? "Eval-Kauf (Breach)" : "Eval-Kauf (Rotation)"} ${account.name} · ${preset?.name ?? "Firma"}`,
			wallet: preset?.wallet?.trim() || "—",
			usd,
			fx,
			eur: toEur(usd)
		};
	});
	if (kind === "breach") {
		const names = funds.map((account) => presets.find((row) => row.id === account.presetId)?.name ?? account.name).join(" + ");
		const wallet = presets.find((row) => row.id === funds[0]?.presetId)?.wallet?.trim() || "—";
		const usd = Math.round(payout * 100) / 100;
		rows.push({
			date: stamp,
			text: `Payout ${names || "Funded"}`,
			wallet,
			usd,
			fx,
			eur: toEur(usd)
		});
	}
	return rows;
}
function loadLedger() {
	try {
		const raw = window.localStorage.getItem(TAX_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((row) => {
			if (!row || typeof row !== "object") return false;
			const item = row;
			return typeof item.nr === "number" && typeof item.date === "string" && typeof item.usd === "number";
		});
	} catch {
		return [];
	}
}
function Ledger({ rows, onClear }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
		className: "mt-4 rounded-xl border border-line p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
				className: "cursor-pointer text-sm font-semibold",
				children: "📄 Mein 7-Spalten Steuer-Logbuch (GoBD / EÜR)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted",
					children: [rows.length, " Buchungen · EUR = USD / BMF-Kurs"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => downloadLedger(rows),
						disabled: rows.length === 0,
						children: "📥 Als CSV für Excel / Finanzamt exportieren"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: onClear,
						disabled: rows.length === 0,
						children: "🗑️ Logbuch leeren"
					})]
				})]
			}),
			rows.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[760px] text-left text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1 font-medium",
								children: "Lfd. Nr."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1 font-medium",
								children: "Datum"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1 font-medium",
								children: "Vorgang & Prop-Firm"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1 font-medium",
								children: "Genutzte Wallet"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1 font-medium",
								children: "Betrag USD"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1 font-medium",
								children: "BMF-Kurs"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1 font-medium",
								children: "Betrag EUR"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1 font-mono",
								children: row.nr
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1 whitespace-nowrap",
								children: new Date(row.date).toLocaleDateString("de-DE")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1",
								children: row.text
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1",
								children: row.wallet
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1 font-mono",
								children: fmtUsd(row.usd, true)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1 font-mono",
								children: row.fx.toFixed(4)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1 font-mono",
								children: row.eur.toLocaleString("de-DE", {
									style: "currency",
									currency: "EUR"
								})
							})
						]
					}, `${row.nr}-${row.date}-${row.text}`)) })]
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-muted",
				children: "Noch keine Buchung. Ein Abschluss oben schreibt die Eval-Ausgaben und, beim Breach, das Payout."
			})
		]
	});
}
function downloadLedger(rows) {
	const csv = [[
		"Lfd. Nr.",
		"Datum",
		"Vorgang & Prop-Firm",
		"Genutzte Wallet",
		"Betrag USD",
		"BMF-Kurs",
		"Betrag EUR"
	], ...rows.map((row) => [
		row.nr,
		new Date(row.date).toLocaleDateString("de-DE"),
		row.text,
		row.wallet,
		row.usd.toFixed(2).replace(".", ","),
		row.fx.toFixed(4).replace(".", ","),
		row.eur.toFixed(2).replace(".", ",")
	])].map((line) => line.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(";")).join("\n");
	const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "hydra-euer.csv";
	link.click();
	URL.revokeObjectURL(url);
}
function loadBank() {
	try {
		const raw = window.localStorage.getItem(BANK_KEY);
		if (!raw) return {
			cash: 500,
			fails: 0
		};
		const parsed = JSON.parse(raw);
		return {
			cash: typeof parsed.cash === "number" ? parsed.cash : 500,
			fails: typeof parsed.fails === "number" ? parsed.fails : 0
		};
	} catch {
		return {
			cash: 500,
			fails: 0
		};
	}
}
function beep() {
	const Ctx = window.AudioContext ?? window.webkitAudioContext;
	if (!Ctx) return;
	const ctx = new Ctx();
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.frequency.value = 880;
	gain.gain.value = .04;
	osc.connect(gain);
	gain.connect(ctx.destination);
	osc.start();
	osc.stop(ctx.currentTime + .15);
}
function normPdf(x) {
	return Math.exp(-.5 * x * x) / Math.sqrt(2 * Math.PI);
}
/** Abramowitz-Stegun tail approximation. Matches Deribit greeks to ~1e-5. */
function normCdf(x) {
	const a1 = .31938153;
	const a2 = -.356563782;
	const a3 = 1.781477937;
	const a4 = -1.821255978;
	const a5 = 1.330274429;
	const k = 1 / (1 + .2316419 * Math.abs(x));
	const tail = normPdf(x) * (((((a5 * k + a4) * k + a3) * k + a2) * k + a1) * k);
	return x >= 0 ? 1 - tail : tail;
}
/**
* Inverse option on the Deribit forward.
* Coin premium = Black-76(F) / F, r = 0. Vega is USD per 1 vol point,
* theta is USD per day, gamma is per $1, delta is dimensionless.
*/
function priceOption(args) {
	const { forward: F, strike: K, tYears: T, sigma, right } = args;
	const call = right === "call";
	const zero = {
		coin: 0,
		usd: 0,
		delta: 0,
		gamma: 0,
		vega: 0,
		theta: 0
	};
	if (!(F > 0) || !(K > 0)) return zero;
	if (!(T > 1e-8) || !(sigma > 1e-6)) {
		const usd = call ? Math.max(F - K, 0) : Math.max(K - F, 0);
		const delta = Math.abs(F - K) / F < 1e-6 ? call ? .5 : -.5 : usd === 0 ? 0 : call ? 1 : -1;
		return {
			coin: usd / F,
			usd,
			delta,
			gamma: 0,
			vega: 0,
			theta: 0
		};
	}
	const vol = sigma * Math.sqrt(T);
	const d1 = (Math.log(F / K) + .5 * sigma * sigma * T) / vol;
	const d2 = d1 - vol;
	const nd1 = normCdf(d1);
	const pdf = normPdf(d1);
	const usd = call ? F * nd1 - K * normCdf(d2) : K * normCdf(-d2) - F * normCdf(-d1);
	const delta = call ? nd1 : nd1 - 1;
	const gamma = pdf / (F * sigma * Math.sqrt(T));
	const vega = F * pdf * Math.sqrt(T) * .01;
	const theta = -F * pdf * sigma / (2 * Math.sqrt(T)) / 365;
	return {
		coin: usd / F,
		usd,
		delta,
		gamma,
		vega,
		theta
	};
}
function defaultSetup() {
	return {
		unit: "usd",
		asset: "ETH",
		index: 2298,
		fee: 1e3,
		maxDd: 6e3,
		target: 1e4,
		side: "long",
		coins: 100,
		payout: 3e3
	};
}
function barriers(setup) {
	if (!(setup.index > 0) || !(setup.coins > 0)) return {
		dd: null,
		pass: null
	};
	const ddMove = Math.max(0, setup.maxDd) / setup.coins;
	const passMove = Math.max(0, setup.target) / setup.coins;
	if (setup.side === "long") return {
		dd: setup.index - ddMove,
		pass: setup.index + passMove
	};
	return {
		dd: setup.index + ddMove,
		pass: setup.index - passMove
	};
}
function passed(setup, price, bars = barriers(setup)) {
	if (bars.pass == null || !(price > 0)) return false;
	return setup.side === "long" ? price >= bars.pass - 1e-8 : price <= bars.pass + 1e-8;
}
/** Flat challenge cost, or the funded-account value once price is through Pass and payout is on. */
function propCashUsd(setup, price, payoutOn) {
	if (payoutOn && passed(setup, price)) return setup.payout;
	return -Math.max(0, setup.fee);
}
/** Futures equity of the prop, floored at the drawdown because the account is dead past the barrier. */
function propEquityUsd(setup, price) {
	if (!(setup.index > 0) || !(setup.coins > 0) || !(price > 0)) return 0;
	const pnl = (setup.side === "long" ? 1 : -1) * (price - setup.index) * setup.coins;
	return Math.max(pnl, -Math.max(0, setup.maxDd));
}
function toUnit(usd, setup) {
	if (setup.unit === "usd" || !(setup.index > 0)) return usd;
	return usd / setup.index;
}
/** Black-Scholes with q = 0. Rate 0 matches the Deribit forward pricer. Vega per 1 vol point, theta per day. */
function quoteOption(args) {
	const { spot: S, strike: K, right } = args;
	const call = right === "call";
	const zero = {
		usd: 0,
		delta: 0,
		gamma: 0,
		vega: 0,
		theta: 0
	};
	if (!(S > 0) || !(K > 0)) return zero;
	const T = Math.max(0, args.dte) / 365;
	const sigma = Math.max(.01, args.ivPct / 100);
	const r = args.ratePct / 100;
	if (!(T > 1e-8)) {
		const usd = call ? Math.max(S - K, 0) : Math.max(K - S, 0);
		return {
			usd,
			delta: Math.abs(S - K) / S < 1e-6 ? call ? .5 : -.5 : usd === 0 ? 0 : call ? 1 : -1,
			gamma: 0,
			vega: 0,
			theta: 0
		};
	}
	if (Math.abs(r) < 1e-8) {
		const bare = priceOption({
			forward: S,
			strike: K,
			tYears: T,
			sigma,
			right
		});
		return {
			usd: bare.usd,
			delta: bare.delta,
			gamma: bare.gamma,
			vega: bare.vega,
			theta: bare.theta
		};
	}
	const vol = sigma * Math.sqrt(T);
	const d1 = (Math.log(S / K) + (r + .5 * sigma * sigma) * T) / vol;
	const d2 = d1 - vol;
	const nd1 = normCdf(d1);
	const pdf = normPdf(d1);
	const disc = Math.exp(-r * T);
	return {
		usd: call ? S * nd1 - K * disc * normCdf(d2) : K * disc * normCdf(-d2) - S * normCdf(-d1),
		delta: call ? nd1 : nd1 - 1,
		gamma: pdf / (S * sigma * Math.sqrt(T)),
		vega: S * pdf * Math.sqrt(T) * .01,
		theta: (call ? -S * pdf * sigma / (2 * Math.sqrt(T)) - r * K * disc * normCdf(d2) : -S * pdf * sigma / (2 * Math.sqrt(T)) + r * K * disc * normCdf(-d2)) / 365
	};
}
function strikeForDelta(spot, dte, ivPct, right, delta) {
	if (!(spot > 0) || !(dte > 0) || !(ivPct > 0)) return spot;
	let lo = spot * .05;
	let hi = spot * 5;
	for (let i = 0; i < 56; i += 1) {
		const mid = (lo + hi) / 2;
		if (quoteOption({
			spot,
			strike: mid,
			dte,
			ivPct,
			ratePct: 0,
			right
		}).delta > delta) lo = mid;
		else hi = mid;
	}
	return (lo + hi) / 2;
}
function niceStrike(asset, strike) {
	const step = asset === "BTC" ? 500 : 10;
	if (!(strike > 0)) return step;
	return Math.max(step, Math.round(strike / step) * step);
}
function leg(id, partial) {
	return {
		id,
		on: true,
		premium: null,
		name: "",
		expiry: "",
		priceMode: "mark",
		...partial
	};
}
function blankLeg(setup) {
	return leg(`leg-${Date.now().toString(36)}`, {
		right: "call",
		side: "buy",
		qty: 1,
		strike: niceStrike(setup.asset, setup.index > 0 ? setup.index : 2298),
		dte: 7,
		iv: 55
	});
}
function shiftedIv(iv, volShift) {
	return Math.max(1, iv * (1 + volShift / 100));
}
function entryPremium(legRow, index) {
	if (legRow.premium != null && Number.isFinite(legRow.premium)) return Math.max(0, legRow.premium);
	if (!(index > 0)) return 0;
	return quoteOption({
		spot: index,
		strike: legRow.strike,
		dte: legRow.dte,
		ivPct: legRow.iv,
		ratePct: 0,
		right: legRow.right
	}).usd;
}
function optionsPnlUsd(legs, spot, elapsed, volShift, rateShift, index) {
	let sum = 0;
	for (const row of legs) {
		if (!row.on || !(row.qty > 0) || !(row.strike > 0)) continue;
		const mark = quoteOption({
			spot,
			strike: row.strike,
			dte: Math.max(0, row.dte - elapsed),
			ivPct: shiftedIv(row.iv, volShift),
			ratePct: rateShift,
			right: row.right
		}).usd;
		const entry = entryPremium(row, index);
		const sign = row.side === "buy" ? 1 : -1;
		sum += (mark - entry) * sign * row.qty;
	}
	return sum;
}
function bookGreeks(legs, index, elapsed, volShift, rateShift) {
	const out = {
		delta: 0,
		gamma: 0,
		vega: 0,
		theta: 0
	};
	if (!(index > 0)) return out;
	for (const row of legs) {
		if (!row.on || !(row.qty > 0) || !(row.strike > 0)) continue;
		const q = quoteOption({
			spot: index,
			strike: row.strike,
			dte: Math.max(0, row.dte - elapsed),
			ivPct: shiftedIv(row.iv, volShift),
			ratePct: rateShift,
			right: row.right
		});
		const mult = (row.side === "buy" ? 1 : -1) * row.qty;
		out.delta += q.delta * mult;
		out.gamma += q.gamma * mult;
		out.vega += q.vega * mult;
		out.theta += q.theta * mult;
	}
	return out;
}
function smileIv(spot, strike, right) {
	if (!(spot > 0) || !(strike > 0)) return 55;
	const m = (strike - spot) / spot;
	const smile = 55 * (1 + 1.35 * m * m);
	const skew = right === "put" ? Math.max(0, -m) * 18 : Math.max(0, m) * 8;
	return Math.round((smile + skew) * 10) / 10;
}
/** Price where 55% of the path from entry to the DD barrier is done. */
function rollLevel(setup) {
	const bars = barriers(setup);
	if (bars.dd == null || !(setup.index > 0)) return null;
	return setup.index - .55 * (setup.index - bars.dd);
}
var ROLL_SHARE = .55;
var REST_SHARE = .45;
function roundQty(qty) {
	return Math.min(1e6, Math.max(.01, Math.ceil(qty * 100 - 1e-8) / 100));
}
/** Size each short call so the book earns 55% of the challenge fee at the roll. The other 45% is the planned next strike. */
function scaleShortCallsToFee(legs, setup) {
	const fee = Math.max(0, setup.fee);
	const roll = rollLevel(setup);
	if (roll == null || !(fee > 0)) return {
		legs,
		note: "Keine Challenge-Gebühr oder keine DD-Barrier."
	};
	const shorts = legs.filter((row) => row.on && row.side === "sell" && row.right === "call");
	if (!shorts.length) return {
		legs,
		note: "Kein Short-Call in der Tabelle."
	};
	const useful = shorts.map((row) => ({
		row,
		unit: optionsPnlUsd([{
			...row,
			qty: 1
		}], roll, 0, 0, 0, setup.index)
	})).filter((item) => item.unit > .01);
	if (!useful.length) return {
		legs,
		note: "Der Short-Call verdient am 55%-Roll-Punkt nichts. Strike näher an den Entry legen."
	};
	const target = fee * ROLL_SHARE;
	const weight = useful.reduce((sum, item) => sum + Math.max(item.row.qty, .01), 0);
	const qtyById = /* @__PURE__ */ new Map();
	for (const item of useful) {
		const share = Math.max(item.row.qty, .01) / weight * target;
		qtyById.set(item.row.id, roundQty(share / item.unit));
	}
	return {
		legs: legs.map((row) => qtyById.has(row.id) ? {
			...row,
			qty: qtyById.get(row.id) ?? row.qty
		} : row),
		note: ""
	};
}
function nearestNumber(values, target) {
	if (!values.length) return null;
	let best = values[0];
	let gap = Math.abs(best - target);
	for (const value of values) {
		const next = Math.abs(value - target);
		if (next < gap) {
			gap = next;
			best = value;
		}
	}
	return best;
}
/** 55% roll versus holding the starter short call all the way to the DD barrier. */
function feeRoll(legs, setup, strikes, elapsed = 0, volShift = 0, rateShift = 0) {
	const bars = barriers(setup);
	const roll = rollLevel(setup);
	if (bars.dd == null || roll == null) return null;
	const fee = Math.max(0, setup.fee);
	const realized = optionsPnlUsd(legs, roll, elapsed, volShift, rateShift, setup.index);
	const unrolled = optionsPnlUsd(legs, bars.dd, elapsed, volShift, rateShift, setup.index);
	const capped = legs.reduce((sum, row) => {
		if (!row.on || row.side !== "sell" || !(row.qty > 0)) return sum;
		return sum + entryPremium(row, setup.index) * row.qty;
	}, 0);
	const down = bars.dd < setup.index;
	const raw = strikeForDelta(roll, 7, 55, "call", down ? .7 : -.7);
	const deeper = strikes.filter((strike) => down ? strike < roll - .5 : strike > roll + .5);
	const nextStrike = nearestNumber(deeper.length ? deeper : strikes, down ? raw : strikeForDelta(roll, 7, 55, "put", -.7));
	let nextQty = 0;
	let nextProfit = 0;
	if (nextStrike != null && fee > 0 && realized > .5) {
		const right = down ? "call" : "put";
		const iv = smileIv(roll, nextStrike, right);
		const per = quoteOption({
			spot: roll,
			strike: nextStrike,
			dte: 7,
			ivPct: iv,
			ratePct: 0,
			right
		}).usd - quoteOption({
			spot: bars.dd,
			strike: nextStrike,
			dte: 7,
			ivPct: iv,
			ratePct: 0,
			right
		}).usd;
		if (per > .01) {
			nextQty = roundQty(fee * REST_SHARE / per);
			nextProfit = per * nextQty;
		}
	}
	const protection = Math.max(0, realized) + nextProfit;
	return {
		roll,
		dd: bars.dd,
		fee,
		realized,
		share: fee > 0 ? realized / fee : 0,
		nextStrike,
		nextQty,
		nextProfit,
		protection,
		capped,
		unrolled,
		shortfall: Math.max(0, fee - unrolled)
	};
}
function sampleOptions(legs, index, elapsed, volShift, rateShift, min, max, count, marks = []) {
	const n = Math.max(2, count);
	const prices = /* @__PURE__ */ new Set();
	for (let i = 0; i < n; i += 1) prices.add(min + (max - min) * i / (n - 1));
	for (const mark of marks) if (mark > min && mark < max) prices.add(mark);
	return [...prices].sort((a, b) => a - b).map((price) => ({
		price,
		now: optionsPnlUsd(legs, price, elapsed, volShift, rateShift, index),
		expiry: optionsPnlUsd(legs, price, 1e4, 0, 0, index)
	}));
}
var INITIAL = {
	lo: -.15,
	hi: .15
};
function OptionsChart({ setup, legs, elapsed, volShift, rateShift, series, liveIndex, cover, onToggle }) {
	const wrapRef = (0, import_react.useRef)(null);
	const canvasRef = (0, import_react.useRef)(null);
	const geo = (0, import_react.useRef)({
		padL: 72,
		plotW: 1,
		min: 1,
		max: 2,
		width: 1,
		height: 1
	});
	const [view, setView] = (0, import_react.useState)(INITIAL);
	const [hover, setHover] = (0, import_react.useState)(null);
	const drag = (0, import_react.useRef)(null);
	const drawRef = (0, import_react.useRef)({
		setup,
		samples: [],
		series,
		view,
		hoverPrice: null,
		liveIndex,
		cover
	});
	const index = setup.index > 0 ? setup.index : 1;
	const span = Math.max(.02, view.hi - view.lo);
	const min = index * (1 + view.lo);
	const max = index * (1 + view.hi);
	const samples = (0, import_react.useMemo)(() => {
		const bars = barriers(setup);
		const roll = rollLevel(setup);
		const marks = [
			index,
			bars.dd ?? 0,
			bars.pass ?? 0,
			roll ?? 0
		].filter((price) => price > 0);
		return sampleOptions(legs, index, elapsed, volShift, rateShift, Math.max(.01, min), Math.max(min + index * .002, max), 181, marks);
	}, [
		setup,
		legs,
		index,
		elapsed,
		volShift,
		rateShift,
		min,
		max
	]);
	drawRef.current = {
		setup,
		samples,
		series,
		view,
		hoverPrice: hover?.price ?? null,
		liveIndex,
		cover
	};
	(0, import_react.useEffect)(() => {
		let frame = 0;
		let hiddenTimer = 0;
		const loop = () => {
			if (typeof document !== "undefined" && document.hidden) {
				hiddenTimer = window.setTimeout(loop, 400);
				return;
			}
			const canvas = canvasRef.current;
			if (canvas) paint(canvas, {
				...drawRef.current,
				now: performance.now(),
				geo
			});
			frame = requestAnimationFrame(loop);
		};
		frame = requestAnimationFrame(loop);
		return () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(hiddenTimer);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const el = wrapRef.current;
		if (!el) return;
		const onWheel = (event) => {
			event.preventDefault();
			const g = geo.current;
			const rect = el.getBoundingClientRect();
			const t = Math.min(1, Math.max(0, (event.clientX - rect.left - g.padL) / g.plotW));
			setView((prev) => zoomView(prev, t, event.deltaY > 0 ? 1.12 : 1 / 1.12));
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, []);
	const priceAt = (clientX) => {
		const el = wrapRef.current;
		const g = geo.current;
		if (!el) return index;
		const rect = el.getBoundingClientRect();
		const t = Math.min(1, Math.max(0, (clientX - rect.left - g.padL) / g.plotW));
		return g.min + t * (g.max - g.min);
	};
	const nearest = hover ? nearestSample(samples, hover.price) : null;
	const deltaNow = nearest ? bookGreeks(legs, nearest.price, elapsed, volShift, rateShift).delta : 0;
	const deltaExpiry = nearest ? bookGreeks(legs, nearest.price, 1e4, 0, 0).delta : 0;
	const tip = nearest ? tipRows(setup, nearest.price, nearest.now, nearest.expiry, deltaNow, deltaExpiry) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			ref: wrapRef,
			className: "relative mt-2 h-80 touch-none select-none sm:h-[28rem]",
			onDoubleClick: () => {
				setView(INITIAL);
				setHover(null);
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "h-full w-full cursor-crosshair",
				onPointerDown: (event) => {
					event.currentTarget.setPointerCapture(event.pointerId);
					drag.current = {
						x: event.clientX,
						lo: view.lo,
						hi: view.hi
					};
				},
				onPointerMove: (event) => {
					const rect = wrapRef.current?.getBoundingClientRect();
					const price = priceAt(event.clientX);
					setHover(rect ? {
						price,
						x: event.clientX - rect.left,
						y: event.clientY - rect.top
					} : null);
					const start = drag.current;
					if (!start || !(geo.current.plotW > 0)) return;
					const shift = -(event.clientX - start.x) / geo.current.plotW * (start.hi - start.lo);
					setView(clampView({
						lo: start.lo + shift,
						hi: start.hi + shift
					}));
				},
				onPointerUp: () => {
					drag.current = null;
				},
				onPointerLeave: () => {
					if (!drag.current) setHover(null);
				}
			}), tip && hover ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none absolute z-10 flex w-72 flex-col gap-1",
				style: {
					left: Math.min(Math.max(8, hover.x > (wrapRef.current?.clientWidth ?? 0) * .55 ? hover.x - 300 : hover.x + 12), Math.max(8, (wrapRef.current?.clientWidth ?? 320) - 300)),
					top: Math.min(Math.max(8, hover.y > 220 ? hover.y - 230 : hover.y + 12), Math.max(8, (wrapRef.current?.clientHeight ?? 240) - 240))
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TipBox, {
					title: "Expiry",
					color: "var(--color-expiry)",
					rows: tip.expiry
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TipBox, {
					title: "Current",
					color: "var(--color-long)",
					rows: tip.current
				})]
			}) : null]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2 flex flex-wrap items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendChip, {
						on: series.current,
						color: "var(--color-long)",
						label: "Current",
						onClick: () => onToggle("current")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendChip, {
						on: series.expiry,
						color: "var(--color-expiry)",
						label: "Expiry",
						onClick: () => onToggle("expiry")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendChip, {
						on: series.payout,
						color: "var(--color-accent)",
						label: "Payout",
						onClick: () => onToggle("payout")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendChip, {
						on: series.prop,
						color: "var(--color-preview)",
						label: "Prop",
						onClick: () => onToggle("prop")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendChip, {
						on: series.dd,
						color: "var(--color-short)",
						label: "DD barrier",
						onClick: () => onToggle("dd")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendChip, {
						on: series.pass,
						color: "var(--color-long)",
						label: "Pass",
						onClick: () => onToggle("pass")
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "h-9 rounded-full bg-raised px-3 text-xs",
						onClick: () => setView((prev) => zoomView(prev, .5, 1 / 1.15)),
						children: "+"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "h-9 rounded-full bg-raised px-3 text-xs",
						onClick: () => setView((prev) => zoomView(prev, .5, 1.15)),
						children: "−"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "h-9 rounded-full bg-raised px-3 text-xs",
						onClick: () => setView(INITIAL),
						children: "Reset"
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-1 text-[11px] text-faint",
			children: [
				"Scroll zoomt, Ziehen verschiebt. Doppelklick setzt ±15% um den Eval-Entry zurück. Die cyanfarbene Linie ist der Live-WS-Index. Spanne jetzt ",
				(span * 100).toFixed(1),
				"%."
			]
		})
	] });
}
function LegendChip({ on, color, label, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		"aria-pressed": on,
		onClick,
		className: cn("inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-xs", on ? "bg-bg text-fg" : "bg-bg text-faint line-through"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "inline-block h-2 w-2 rounded-full",
			style: { background: color }
		}), label]
	});
}
function TipBox({ title, color, rows }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-line bg-tip px-3 py-2 text-tip-fg",
		style: { borderLeft: `3px solid ${color}` },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs font-semibold",
			style: { color },
			children: title
		}), rows.map((row) => row.banner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 font-mono text-[11px] leading-5 text-long",
			children: row.key
		}, row.key) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "flex justify-between gap-3 font-mono text-[11px] leading-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: row.key }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: row.value })]
		}, row.key))]
	});
}
function tipRows(setup, price, optionsNow, optionsExpiry, deltaNow, deltaExpiry) {
	const unitName = setup.unit === "usd" ? "USD" : setup.asset;
	const fee = Math.max(0, setup.fee);
	const row = (options, delta) => {
		const trading = toUnit(options - fee, setup);
		const lines = [
			{
				key: "Index Price",
				value: fmtPx(price)
			},
			{
				key: "Options PNL",
				value: fmtMoney(toUnit(options, setup), unitName)
			},
			{
				key: "Prop PNL",
				value: fmtMoney(toUnit(-fee, setup), unitName)
			},
			{
				key: "Trading PNL",
				value: fmtMoney(trading, unitName)
			},
			{
				key: "Netto Options-Delta bei diesem Kurs",
				value: fmtDeltaCoins(delta, setup.asset)
			}
		];
		if (passed(setup, price)) {
			const funded = toUnit(setup.payout, setup);
			const total = trading + funded;
			const fundedText = unitName === "USD" ? fmtDollar(funded) : fmtMoney(funded, unitName);
			const totalText = unitName === "USD" ? `${fmtDollar(total)} USD` : fmtMoney(total, unitName);
			lines.push({
				key: `🏆 Inkl. Funded-Account Wert (${fundedText}): ${totalText}`,
				value: "",
				banner: true
			});
		}
		return lines;
	};
	return {
		expiry: row(optionsExpiry, deltaExpiry),
		current: row(optionsNow, deltaNow)
	};
}
function nearestSample(samples, price) {
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
function zoomView(prev, anchor, factor) {
	const span = Math.max(.02, prev.hi - prev.lo);
	const next = Math.min(1.4, Math.max(.02, span * factor));
	const at = prev.lo + anchor * span;
	return clampView({
		lo: at - anchor * next,
		hi: at + (1 - anchor) * next
	});
}
function clampView(view) {
	let { lo, hi } = view;
	if (!(hi > lo)) return INITIAL;
	const span = Math.min(1.4, Math.max(.02, hi - lo));
	const mid = (lo + hi) / 2;
	lo = mid - span / 2;
	hi = mid + span / 2;
	if (lo < -.85) {
		hi -= lo + .85;
		lo = -.85;
	}
	if (hi > 1.5) {
		lo -= hi - 1.5;
		hi = 1.5;
	}
	return {
		lo,
		hi
	};
}
function fmtPx(n) {
	return n.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}
function fmtDeltaCoins(n, asset) {
	if (!Number.isFinite(n)) return "—";
	return `${n > 5e-4 ? "+" : n < -5e-4 ? "-" : ""}${Math.abs(n).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	})} ${asset}`;
}
function fmtDollar(n) {
	return `${n > 5e-7 ? "+" : n < -5e-7 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	})}`;
}
function fmtMoney(n, unitName) {
	const sign = n > 5e-7 ? "+" : n < -5e-7 ? "-" : "";
	const abs = Math.abs(n);
	const digits = unitName === "USD" ? 2 : abs >= 1 ? 4 : 6;
	return `${sign}${abs.toLocaleString("en-US", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	})} ${unitName}`;
}
function coverBadge(net) {
	const body = Math.abs(net).toLocaleString("en-US", { maximumFractionDigits: 0 });
	return net >= -.5 ? "✅ Gebühr bei Breach gedeckt" : `⚠️ Noch -$${body} ungedeckt`;
}
function paint(canvas, args) {
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
	const color = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
	const long = color("--color-long", "#1fbf75");
	const short = color("--color-short", "#f0445a");
	const expiry = color("--color-expiry", "#c4b5fd");
	const accent = color("--color-accent", "#4c8dff");
	const preview = color("--color-preview", "#e6a23c");
	const roll = color("--color-roll", "#f5c518");
	const faint = color("--color-faint", "#6b7280");
	const line = color("--color-line", "#2c2e36");
	const surface = color("--color-surface", "#121316");
	const bg = color("--color-bg", "#0a0b0d");
	color("--color-fg", "#ffffff");
	const padL = 68;
	const padR = 12;
	const padT = 16;
	const padB = 28;
	const plotW = Math.max(1, cssW - padL - padR);
	const plotH = Math.max(1, cssH - padT - padB);
	const index = args.setup.index > 0 ? args.setup.index : 1;
	const xMin = index * (1 + args.view.lo);
	const xMax = index * (1 + args.view.hi);
	args.geo.current = {
		padL,
		plotW,
		min: xMin,
		max: xMax,
		width: cssW,
		height: cssH
	};
	const bars = barriers(args.setup);
	const payoutOn = args.series.payout;
	const rows = args.samples.map((row) => {
		const cash = toUnit(propCashUsd(args.setup, row.price, payoutOn), args.setup);
		const equity = toUnit(propEquityUsd(args.setup, row.price), args.setup);
		return {
			price: row.price,
			current: toUnit(row.now, args.setup) + cash,
			expiry: toUnit(row.expiry, args.setup) + cash,
			cash,
			equity
		};
	});
	const ys = [0];
	for (const row of rows) {
		if (args.series.current) ys.push(row.current);
		if (args.series.expiry) ys.push(row.expiry);
		if (args.series.payout) ys.push(row.cash);
		if (args.series.prop) ys.push(row.equity);
	}
	let yMin = Math.min(...ys);
	let yMax = Math.max(...ys);
	if (!(yMax > yMin)) {
		yMin = -1;
		yMax = 1;
	}
	const yPad = (yMax - yMin) * .08;
	yMin -= yPad;
	yMax += yPad;
	const xOf = (price) => padL + (price - xMin) / (xMax - xMin) * plotW;
	const yOf = (value) => padT + (yMax - value) / (yMax - yMin) * plotH;
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
		ctx.fillText(fmtAxis(y, args.setup.unit), 62, py);
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
	if (args.series.current) fillBand(ctx, rows, (row) => row.current, (row) => row.price, xOf, yOf, y0, withAlpha(long, .22), withAlpha(short, .2));
	ctx.strokeStyle = faint;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(padL, y0);
	ctx.lineTo(padL + plotW, y0);
	ctx.stroke();
	if (args.series.prop) strokeSeries(ctx, rows, (row) => row.equity, (row) => row.price, xOf, yOf, preview, 1.75, [5, 4]);
	if (args.series.payout) strokeSeries(ctx, rows, (row) => row.cash, (row) => row.price, xOf, yOf, accent, 1.75, [2, 3]);
	if (args.series.expiry) strokeSeries(ctx, rows, (row) => row.expiry, (row) => row.price, xOf, yOf, expiry, 2.25, []);
	if (args.series.current) strokeSeries(ctx, rows, (row) => row.current, (row) => row.price, xOf, yOf, long, 2.25, []);
	const markers = [
		args.series.dd && bars.dd != null ? {
			price: bars.dd,
			color: short,
			label: `DD barrier 1: ${fmtPx(bars.dd)}`,
			glow: false
		} : null,
		args.liveIndex > 0 && Math.abs(args.liveIndex - index) / index > 8e-4 ? {
			price: index,
			color: faint,
			label: `Eval-Entry: ${fmtPx(index)}`,
			glow: false
		} : args.liveIndex > 0 ? null : {
			price: index,
			color: faint,
			label: `Index: ${fmtPx(index)}`,
			glow: false
		},
		args.series.pass && bars.pass != null ? {
			price: bars.pass,
			color: long,
			label: `Pass 1: ${fmtPx(bars.pass)}`,
			glow: false
		} : null,
		args.liveIndex > 0 ? {
			price: args.liveIndex,
			color: "#22d3ee",
			label: `Live WS Index: ${fmtPx(args.liveIndex)}`,
			glow: true
		} : null,
		rollLevel(args.setup) != null ? {
			price: rollLevel(args.setup),
			color: roll,
			label: `🔄 Roll-Punkt (55% DD): ${fmtPx(rollLevel(args.setup))}`,
			glow: false
		} : null
	].filter((row) => row != null);
	if (args.series.dd && bars.dd != null && args.cover) {
		const badge = coverBadge(args.cover.current);
		const px = xOf(bars.dd);
		if (px >= 66 && px <= padL + plotW + 2) {
			ctx.save();
			ctx.font = "11px Roboto Mono, ui-monospace, monospace";
			const width = ctx.measureText(badge).width;
			const x = Math.min(Math.max(72, px + 6), padL + plotW - width - 10);
			ctx.fillStyle = withAlpha(surface, .94);
			ctx.fillRect(x, 18, width + 10, 18);
			ctx.fillStyle = args.cover.current >= -.5 ? long : short;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(badge, x + 5, 27);
			ctx.restore();
		}
	}
	markers.forEach((marker) => {
		const px = xOf(marker.price);
		if (px < 66 || px > padL + plotW + 2) return;
		ctx.save();
		ctx.strokeStyle = marker.color;
		ctx.lineWidth = marker.glow ? 1.6 + Math.sin(args.now / 180) * .7 : 1.25;
		ctx.setLineDash(marker.glow ? [] : [5, 4]);
		if (marker.glow) {
			const pulse = .45 + .55 * (.5 + .5 * Math.sin(args.now / 160));
			ctx.globalAlpha = .55 + pulse * .45;
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
		ctx.translate(px + 8, 44);
		ctx.rotate(Math.PI / 2);
		ctx.font = "11px Roboto Mono, ui-monospace, monospace";
		const width = ctx.measureText(marker.label).width;
		ctx.fillStyle = withAlpha(surface, .92);
		ctx.fillRect(0, -8, width + 6, 16);
		ctx.fillStyle = marker.color;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(marker.label, 3, 0);
		ctx.restore();
	});
	if (args.hoverPrice != null && args.hoverPrice >= xMin && args.hoverPrice <= xMax) {
		ctx.strokeStyle = accent;
		ctx.lineWidth = 1;
		ctx.setLineDash([]);
		ctx.beginPath();
		ctx.moveTo(xOf(args.hoverPrice), padT);
		ctx.lineTo(xOf(args.hoverPrice), padT + plotH);
		ctx.stroke();
	}
	ctx.restore();
}
function fillBand(ctx, rows, value, price, xOf, yOf, y0, up, down) {
	for (let i = 0; i < rows.length - 1; i += 1) {
		const p0 = price(rows[i]);
		const p1 = price(rows[i + 1]);
		const v0 = value(rows[i]);
		const v1 = value(rows[i + 1]);
		if (!Number.isFinite(v0) || !Number.isFinite(v1)) continue;
		if (v0 * v1 < 0) {
			const cross = p0 + v0 / (v0 - v1) * (p1 - p0);
			quad(ctx, p0, v0, cross, 0, xOf, yOf, y0, v0 > 0 ? up : down);
			quad(ctx, cross, 0, p1, v1, xOf, yOf, y0, v1 > 0 ? up : down);
		} else if (v0 !== 0 || v1 !== 0) quad(ctx, p0, v0, p1, v1, xOf, yOf, y0, v0 > 0 || v1 > 0 ? up : down);
	}
}
function quad(ctx, p0, v0, p1, v1, xOf, yOf, y0, color) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(xOf(p0), yOf(v0));
	ctx.lineTo(xOf(p1), yOf(v1));
	ctx.lineTo(xOf(p1), y0);
	ctx.lineTo(xOf(p0), y0);
	ctx.closePath();
	ctx.fill();
}
function strokeSeries(ctx, rows, value, price, xOf, yOf, color, width, dash) {
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
function niceStep(span) {
	const raw = Math.abs(span) / 5;
	if (!(raw > 0)) return 1;
	const pow = 10 ** Math.floor(Math.log10(raw));
	const m = raw / pow;
	return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * pow;
}
function fmtAxis(n, unit) {
	const abs = Math.abs(n);
	const digits = unit === "coin" ? abs >= 10 ? 2 : 3 : abs >= 1e3 ? 0 : 1;
	return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}
function withAlpha(hex, alpha) {
	const h = hex.replace("#", "");
	if (h.length < 6) return hex;
	const r = Number.parseInt(h.slice(0, 2), 16);
	const g = Number.parseInt(h.slice(2, 4), 16);
	const b = Number.parseInt(h.slice(4, 6), 16);
	if ([
		r,
		g,
		b
	].some((part) => Number.isNaN(part))) return hex;
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
var EMPTY = {
	status: "connecting",
	latencyMs: null,
	index: 0,
	chain: [],
	tickers: {},
	error: null
};
var MONTHS = {
	JAN: 0,
	FEB: 1,
	MAR: 2,
	APR: 3,
	MAY: 4,
	JUN: 5,
	JUL: 6,
	AUG: 7,
	SEP: 8,
	OCT: 9,
	NOV: 10,
	DEC: 11
};
var NAME_RE = /^(ETH|BTC)-(\d{1,2})([A-Z]{3})(\d{2})-(\d+(?:\.\d+)?)-([CP])$/;
function num$1(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function pos(value) {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
function parseInstrument(name) {
	const match = NAME_RE.exec(name);
	if (!match) return null;
	const month = MONTHS[match[3]];
	if (month == null) return null;
	const expiryMs = Date.UTC(2e3 + Number(match[4]), month, Number(match[2]), 8, 0, 0);
	return {
		name,
		currency: match[1],
		expiry: `${match[2]}${match[3]}${match[4]}`,
		expiryMs,
		dte: Math.max(0, (expiryMs - Date.now()) / 864e5),
		strike: Number(match[5]),
		right: match[6] === "C" ? "call" : "put"
	};
}
function parseBook(result, currency) {
	if (!Array.isArray(result)) return [];
	const out = [];
	for (const row of result) {
		if (!row || typeof row !== "object") continue;
		const record = row;
		const parsed = parseInstrument(typeof record.instrument_name === "string" ? record.instrument_name : "");
		if (!parsed || parsed.currency !== currency || !(parsed.dte > 0) || !(parsed.strike > 0)) continue;
		out.push({
			...parsed,
			markCoin: num$1(record.mark_price),
			bidCoin: pos(record.bid_price),
			askCoin: pos(record.ask_price),
			iv: num$1(record.mark_iv),
			underlying: num$1(record.underlying_price)
		});
	}
	out.sort((a, b) => a.expiryMs - b.expiryMs || a.strike - b.strike || (a.right === b.right ? 0 : a.right === "call" ? -1 : 1));
	return out;
}
function ingestTicker(data) {
	if (!data || typeof data !== "object") return null;
	const row = data;
	const name = typeof row.instrument_name === "string" ? row.instrument_name : "";
	if (!parseInstrument(name)) return null;
	const greeks = row.greeks && typeof row.greeks === "object" ? row.greeks : {};
	return {
		name,
		markCoin: num$1(row.mark_price),
		bidCoin: pos(row.best_bid_price),
		askCoin: pos(row.best_ask_price),
		iv: num$1(row.mark_iv),
		underlying: num$1(row.underlying_price),
		delta: num$1(greeks.delta),
		gamma: num$1(greeks.gamma),
		vega: num$1(greeks.vega),
		theta: num$1(greeks.theta)
	};
}
var DeribitLive = class {
	ws = null;
	retainers = 0;
	currency = "ETH";
	names = /* @__PURE__ */ new Set();
	nameKey = "";
	tickerChannels = /* @__PURE__ */ new Set();
	indexChannel = "";
	id = 1;
	pending = /* @__PURE__ */ new Map();
	retry = 800;
	reconnectTimer = null;
	releaseTimer = null;
	pingTimer = null;
	bookTimer = null;
	listeners = /* @__PURE__ */ new Set();
	snap = EMPTY;
	bufIndex = null;
	bufTickers = /* @__PURE__ */ new Map();
	raf = 0;
	generation = 0;
	job = Promise.resolve();
	bootFails = 0;
	chainFromWs = false;
	restFlight = 0;
	listen(fn) {
		this.listeners.add(fn);
		fn(this.snap);
		return () => this.listeners.delete(fn);
	}
	retain() {
		this.retainers += 1;
		if (this.releaseTimer) {
			clearTimeout(this.releaseTimer);
			this.releaseTimer = null;
		}
		this.ensure();
		this.loadRest(this.generation);
	}
	release() {
		this.retainers = Math.max(0, this.retainers - 1);
		if (this.retainers > 0) return;
		this.releaseTimer = setTimeout(() => {
			if (this.retainers === 0) this.shutdown();
		}, 400);
	}
	setCurrency(next) {
		if (next === this.currency) return;
		this.currency = next;
		this.generation += 1;
		this.bootFails = 0;
		this.chainFromWs = false;
		this.bufTickers.clear();
		this.bufIndex = null;
		this.snap = {
			...this.snap,
			chain: [],
			tickers: {},
			index: 0,
			error: null
		};
		this.emit();
		this.loadRest(this.generation);
		if (this.ws?.readyState === WebSocket.OPEN) this.enqueue(() => this.bootstrap(this.generation));
	}
	setNames(list) {
		const key = [...new Set(list.filter(Boolean))].sort().join("|");
		if (key === this.nameKey) return;
		this.nameKey = key;
		this.names = new Set(key ? key.split("|") : []);
		this.enqueue(() => this.syncTickers(this.generation));
	}
	emit() {
		for (const fn of this.listeners) fn(this.snap);
	}
	ensure() {
		if (this.retainers <= 0 || typeof WebSocket === "undefined") return;
		if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
		this.connect();
	}
	connect() {
		if (this.retainers <= 0 || typeof WebSocket === "undefined") return;
		if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
		const ws = new WebSocket("wss://www.deribit.com/ws/api/v2");
		this.ws = ws;
		const openTimer = setTimeout(() => {
			if (ws.readyState !== WebSocket.OPEN) ws.close();
		}, 8e3);
		ws.onopen = () => {
			clearTimeout(openTimer);
			this.retry = 800;
			this.bootFails = 0;
			this.snap = {
				...this.snap,
				status: "live",
				error: null
			};
			this.emit();
			this.enqueue(async () => {
				await this.call("public/set_heartbeat", { interval: 30 }).catch(() => void 0);
				await this.bootstrap(this.generation);
			});
			this.armPing();
		};
		ws.onmessage = (event) => {
			this.onMessage(String(event.data));
		};
		ws.onerror = () => {
			this.snap = {
				...this.snap,
				error: "Deribit-Socket gestört"
			};
			this.emit();
		};
		ws.onclose = () => {
			clearTimeout(openTimer);
			if (this.ws === ws) this.ws = null;
			this.rejectAll(/* @__PURE__ */ new Error("socket closed"));
			this.tickerChannels.clear();
			this.indexChannel = "";
			this.stopTimers();
			if (this.retainers <= 0) return;
			this.snap = {
				...this.snap,
				status: "reconnecting"
			};
			this.emit();
			this.scheduleReconnect();
		};
	}
	scheduleReconnect() {
		if (this.reconnectTimer || this.retainers <= 0) return;
		const wait = this.retry;
		this.retry = Math.min(this.retry * 2, 15e3);
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, wait);
	}
	shutdown() {
		this.stopTimers();
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.reconnectTimer = null;
		if (this.raf) cancelAnimationFrame(this.raf);
		this.raf = 0;
		const ws = this.ws;
		this.ws = null;
		if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();
		this.rejectAll(/* @__PURE__ */ new Error("closed"));
		this.tickerChannels.clear();
		this.indexChannel = "";
		this.snap = {
			...EMPTY,
			status: "connecting"
		};
		this.emit();
	}
	stopTimers() {
		if (this.pingTimer) clearInterval(this.pingTimer);
		if (this.bookTimer) clearInterval(this.bookTimer);
		this.pingTimer = null;
		this.bookTimer = null;
	}
	armPing() {
		if (this.pingTimer) clearInterval(this.pingTimer);
		this.pingTimer = setInterval(() => {
			if (this.ws?.readyState !== WebSocket.OPEN) return;
			const sent = Date.now();
			this.call("public/get_time").then(() => {
				this.snap = {
					...this.snap,
					latencyMs: Math.max(1, Date.now() - sent)
				};
				this.emit();
			}).catch(() => void 0);
		}, 5e3);
	}
	enqueue(task) {
		this.job = this.job.then(task).catch(() => void 0);
	}
	call(method, params = {}) {
		const ws = this.ws;
		if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(/* @__PURE__ */ new Error("socket closed"));
		const id = this.id++;
		const sent = Date.now();
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(/* @__PURE__ */ new Error(`${method} Zeitüberschreitung`));
			}, 2e4);
			this.pending.set(id, {
				timer,
				sent,
				resolve: (value) => {
					const ms = Date.now() - sent;
					if (ms > 0 && ms < 1e4) this.snap = {
						...this.snap,
						latencyMs: ms
					};
					resolve(value);
				},
				reject
			});
			ws.send(JSON.stringify({
				jsonrpc: "2.0",
				id,
				method,
				params
			}));
		});
	}
	rejectAll(error) {
		for (const pending of this.pending.values()) {
			clearTimeout(pending.timer);
			pending.reject(error);
		}
		this.pending.clear();
	}
	onMessage(raw) {
		let msg;
		try {
			msg = JSON.parse(raw);
		} catch {
			return;
		}
		if (msg.id && this.pending.has(msg.id)) {
			const pending = this.pending.get(msg.id);
			clearTimeout(pending.timer);
			this.pending.delete(msg.id);
			if (msg.error) pending.reject(new Error(msg.error.message || "Deribit-Fehler"));
			else pending.resolve(msg.result);
			return;
		}
		if (msg.method === "heartbeat" && msg.params?.type === "test_request") {
			const ws = this.ws;
			if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({
				jsonrpc: "2.0",
				id: this.id++,
				method: "public/test",
				params: {}
			}));
			return;
		}
		if (msg.method !== "subscription" || !msg.params?.channel) return;
		const channel = msg.params.channel;
		if (channel.startsWith("deribit_price_index.")) {
			const data = msg.params.data;
			const price = num$1(data?.price);
			if (price > 0) {
				this.bufIndex = price;
				this.scheduleFlush();
			}
			return;
		}
		if (channel.startsWith("ticker.")) {
			const ticker = ingestTicker(msg.params.data);
			if (!ticker) return;
			this.bufTickers.set(ticker.name, ticker);
			this.scheduleFlush();
		}
	}
	scheduleFlush() {
		if (this.raf || typeof requestAnimationFrame === "undefined") return;
		this.raf = requestAnimationFrame(() => {
			this.raf = 0;
			let next = this.snap;
			let dirty = false;
			if (this.bufIndex != null && Math.abs(this.bufIndex - next.index) >= .005) {
				next = {
					...next,
					index: this.bufIndex
				};
				dirty = true;
			}
			this.bufIndex = null;
			if (this.bufTickers.size) {
				const tickers = { ...next.tickers };
				for (const [name, ticker] of this.bufTickers) tickers[name] = ticker;
				this.bufTickers.clear();
				next = {
					...next,
					tickers
				};
				dirty = true;
			}
			if (!dirty) return;
			this.snap = next;
			this.emit();
		});
	}
	async bootstrap(gen) {
		const currency = this.currency;
		const indexChannel = `deribit_price_index.${currency.toLowerCase()}_usd`;
		try {
			const stale = [...this.tickerChannels];
			if (this.indexChannel && this.indexChannel !== indexChannel) stale.push(this.indexChannel);
			if (stale.length) {
				this.tickerChannels.clear();
				this.indexChannel = "";
				await this.call("public/unsubscribe", { channels: stale }).catch(() => void 0);
			}
			if (gen !== this.generation) return;
			const book = await this.call("public/get_book_summary_by_currency", {
				currency,
				kind: "option"
			});
			if (gen !== this.generation) return;
			const chain = parseBook(book, currency);
			this.snap = {
				...this.snap,
				chain,
				status: "live",
				error: chain.length ? null : "Keine Optionen in der Kette"
			};
			if (chain.length) this.chainFromWs = true;
			this.emit();
			await this.call("public/subscribe", { channels: [indexChannel] });
			if (gen !== this.generation) {
				await this.call("public/unsubscribe", { channels: [indexChannel] }).catch(() => void 0);
				return;
			}
			this.indexChannel = indexChannel;
			this.bootFails = 0;
			await this.syncTickers(gen);
			this.armBook();
		} catch (error) {
			if (gen !== this.generation || this.retainers <= 0) return;
			this.bootFails += 1;
			this.snap = {
				...this.snap,
				error: error instanceof Error ? error.message : "Deribit-Kette nicht geladen"
			};
			this.emit();
			if (this.bootFails <= 3) {
				await new Promise((resolve) => setTimeout(resolve, 1500));
				if (gen === this.generation && this.ws?.readyState === WebSocket.OPEN) await this.bootstrap(gen);
			}
		}
	}
	armBook() {
		if (this.bookTimer) clearInterval(this.bookTimer);
		this.bookTimer = setInterval(() => {
			this.refreshBook();
		}, 2e4);
	}
	async refreshBook() {
		if (this.ws?.readyState !== WebSocket.OPEN) return;
		const gen = this.generation;
		const currency = this.currency;
		try {
			const book = await this.call("public/get_book_summary_by_currency", {
				currency,
				kind: "option"
			});
			if (gen !== this.generation) return;
			const chain = parseBook(book, currency);
			if (!chain.length) return;
			this.chainFromWs = true;
			this.snap = {
				...this.snap,
				chain,
				error: null
			};
			this.emit();
		} catch {}
	}
	async syncTickers(gen) {
		if (this.ws?.readyState !== WebSocket.OPEN) return;
		const want = new Set([...this.names].map((name) => `ticker.${name}.100ms`));
		const del = [...this.tickerChannels].filter((channel) => !want.has(channel));
		const add = [...want].filter((channel) => !this.tickerChannels.has(channel));
		if (del.length) {
			await this.call("public/unsubscribe", { channels: del }).catch(() => void 0);
			if (gen !== this.generation) return;
			for (const channel of del) this.tickerChannels.delete(channel);
		}
		if (!add.length) return;
		await this.call("public/subscribe", { channels: add });
		if (gen !== this.generation) {
			await this.call("public/unsubscribe", { channels: add }).catch(() => void 0);
			return;
		}
		for (const channel of add) this.tickerChannels.add(channel);
	}
	async loadRest(gen) {
		const flight = ++this.restFlight;
		const currency = this.currency;
		try {
			const loaded = await pullPublic(currency);
			if (flight !== this.restFlight || gen !== this.generation || this.retainers <= 0) return;
			if (this.chainFromWs && this.snap.chain.length) {
				if (!(this.snap.index > 0) && loaded.index > 0) {
					this.snap = {
						...this.snap,
						index: loaded.index
					};
					this.emit();
				}
				return;
			}
			if (!loaded.chain.length && !(loaded.index > 0)) return;
			this.snap = {
				...this.snap,
				chain: loaded.chain.length ? loaded.chain : this.snap.chain,
				index: this.snap.index > 0 ? this.snap.index : loaded.index,
				error: loaded.chain.length ? null : this.snap.error
			};
			this.emit();
		} catch (error) {
			if (flight !== this.restFlight || gen !== this.generation || this.snap.chain.length) return;
			this.snap = {
				...this.snap,
				error: error instanceof Error ? error.message : "Deribit-REST nicht erreichbar"
			};
			this.emit();
		}
	}
};
var singleton = null;
function client() {
	if (!singleton) singleton = new DeribitLive();
	return singleton;
}
function useDeribitLive(currency, names) {
	const [snap, setSnap] = (0, import_react.useState)(EMPTY);
	const key = names.filter(Boolean).join("|");
	(0, import_react.useEffect)(() => {
		const live = client();
		live.setCurrency(currency);
		const stop = live.listen(setSnap);
		live.retain();
		return () => {
			stop();
			live.release();
		};
	}, [currency]);
	(0, import_react.useEffect)(() => {
		client().setNames(key ? key.split("|") : []);
	}, [key]);
	return snap;
}
function coinToUsd(coin, underlying) {
	if (coin == null || !Number.isFinite(coin) || coin < 0 || !(underlying > 0)) return null;
	return coin * underlying;
}
function coinForMode(row, mode) {
	if (!row || mode === "custom") return null;
	if (mode === "bid") return row.bidCoin;
	if (mode === "ask") return row.askCoin;
	return row.markCoin > 0 ? row.markCoin : null;
}
function legFromContract(contract, side, qty) {
	const premium = coinToUsd(contract.markCoin > 0 ? contract.markCoin : null, contract.underlying);
	return {
		id: `live-${contract.name}-${Math.random().toString(36).slice(2, 7)}`,
		on: true,
		right: contract.right,
		side,
		qty: qty > 0 ? qty : 1,
		strike: contract.strike,
		dte: contract.dte,
		iv: contract.iv > 0 ? contract.iv : 50,
		premium,
		name: contract.name,
		expiry: contract.expiry,
		priceMode: "mark"
	};
}
function modelDelta(contract, spot) {
	const s = contract.underlying > 0 ? contract.underlying : spot;
	const iv = contract.iv > 1 ? contract.iv : 50;
	if (!(s > 0) || !(contract.strike > 0)) return contract.right === "call" ? .5 : -.5;
	return quoteOption({
		spot: s,
		strike: contract.strike,
		dte: Math.max(contract.dte, 1 / 24),
		ivPct: iv,
		ratePct: 0,
		right: contract.right
	}).delta;
}
/** Black-Scholes-Delta am Index, oder das Deribit-Ticker-Delta wenn der Kontrakt abonniert ist. */
function liveDelta(contract, index, ticker) {
	if (ticker && Number.isFinite(ticker.delta) && (ticker.iv > 0 || ticker.markCoin > 0)) return ticker.delta;
	const spot = index > 0 ? index : contract.underlying;
	const iv = contract.iv > 1 ? contract.iv : 50;
	if (!(spot > 0) || !(contract.strike > 0)) return contract.right === "call" ? .5 : -.5;
	return quoteOption({
		spot,
		strike: contract.strike,
		dte: Math.max(contract.dte, 1 / 24),
		ivPct: iv,
		ratePct: 0,
		right: contract.right
	}).delta;
}
async function pullPublic(currency) {
	const indexName = `${currency.toLowerCase()}_usd`;
	try {
		const [bookRes, indexRes] = await Promise.all([fetch(`https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`), fetch(`https://www.deribit.com/api/v2/public/get_index_price?index_name=${indexName}`)]);
		if (!bookRes.ok || !indexRes.ok) throw new Error(`Deribit REST ${bookRes.status}`);
		const bookJson = await bookRes.json();
		const indexJson = await indexRes.json();
		const chain = parseBook(bookJson.result, currency);
		const index = num$1(indexJson.result?.index_price);
		if (!chain.length) throw new Error("leere Kette");
		return {
			chain,
			index
		};
	} catch {
		const [book, idx] = await Promise.all([fetchDeribit({ data: {
			method: "public/get_book_summary_by_currency",
			query: {
				currency,
				kind: "option"
			}
		} }), fetchDeribit({ data: {
			method: "public/get_index_price",
			query: { index_name: indexName }
		} })]);
		const index = idx && typeof idx === "object" ? num$1(idx.index_price) : 0;
		return {
			chain: parseBook(book, currency),
			index
		};
	}
}
function nearestExpiry(chain, targetDte) {
	let best = null;
	let gap = Infinity;
	const seen = /* @__PURE__ */ new Set();
	for (const row of chain) {
		if (seen.has(row.expiry) || row.dte < .15) continue;
		seen.add(row.expiry);
		const next = Math.abs(row.dte - targetDte);
		if (next < gap) {
			gap = next;
			best = row.expiry;
		}
	}
	return best;
}
function closestDelta(rows, target, spot) {
	let best = null;
	let gap = Infinity;
	for (const row of rows) {
		if (!(row.iv > 0) && !(row.markCoin > 0)) continue;
		const next = Math.abs(modelDelta(row, spot) - target);
		if (next < gap) {
			gap = next;
			best = row;
		}
	}
	return best;
}
function closestStrike(rows, target) {
	let best = null;
	let gap = Infinity;
	for (const row of rows) {
		const next = Math.abs(row.strike - target);
		if (next < gap) {
			gap = next;
			best = row;
		}
	}
	return best;
}
function syntheticChain(asset, spot) {
	const anchor = spot > 0 ? spot : asset === "BTC" ? 8e4 : 2300;
	const step = asset === "BTC" ? 500 : 25;
	const expiries = [
		{
			dte: 3,
			label: "3d (Fr)"
		},
		{
			dte: 7,
			label: "7d (Woche)"
		},
		{
			dte: 14,
			label: "14d (2 Wochen)"
		},
		{
			dte: 30,
			label: "30d (Monat)"
		}
	];
	const first = Math.ceil(anchor * .85 / step) * step;
	const last = Math.floor(anchor * 1.15 / step) * step;
	const now = Date.now();
	const out = [];
	for (const expiry of expiries) {
		const expiryMs = now + expiry.dte * 864e5;
		for (let strike = first; strike <= last + 1e-6; strike += step) {
			const k = Math.round(strike);
			for (const right of ["call", "put"]) {
				const iv = smileIv(anchor, k, right);
				const quote = quoteOption({
					spot: anchor,
					strike: k,
					dte: expiry.dte,
					ivPct: iv,
					ratePct: 0,
					right
				});
				const markCoin = anchor > 0 ? Math.max(0, quote.usd / anchor) : 0;
				const spread = Math.max(markCoin * .01, asset === "BTC" ? 2e-5 : 8e-5);
				out.push({
					name: `SYN-${asset}-${expiry.dte}d-${k}-${right === "call" ? "C" : "P"}`,
					currency: asset,
					expiry: expiry.label,
					expiryMs,
					dte: expiry.dte,
					strike: k,
					right,
					markCoin,
					bidCoin: markCoin > spread ? markCoin - spread : null,
					askCoin: markCoin + spread,
					iv,
					underlying: anchor
				});
			}
		}
	}
	return out;
}
function buildLivePreset(kind, chain, setup) {
	if (!chain.length || !(setup.index > 0)) return [];
	const qty = setup.coins > 0 ? setup.coins : 1;
	const bars = barriers(setup);
	if (kind === 1) {
		const expiry = nearestExpiry(chain, 7);
		if (!expiry) return [];
		const call = closestDelta(chain.filter((row) => row.expiry === expiry && row.right === "call"), .7, setup.index);
		return call ? [legFromContract(call, "sell", qty)] : [];
	}
	if (kind === 2) {
		const expiry = nearestExpiry(chain, 14);
		if (!expiry) return [];
		const calls = chain.filter((row) => row.expiry === expiry && row.right === "call");
		const short = closestDelta(calls, .7, setup.index);
		if (!short) return [];
		const pool = calls.filter((row) => row.name !== short.name);
		const pass = bars.pass != null && bars.pass > 0 ? bars.pass : short.strike;
		let long = closestStrike(pool, pass);
		if (long && long.strike === short.strike) long = closestStrike(pool.filter((row) => row.strike > short.strike), pass);
		return long ? [legFromContract(short, "sell", qty), legFromContract(long, "buy", qty)] : [legFromContract(short, "sell", qty)];
	}
	const far = nearestExpiry(chain, 30);
	const near = nearestExpiry(chain, 7);
	if (!far || !near) return [];
	const long = closestDelta(chain.filter((row) => row.expiry === far && row.right === "put"), -.6, setup.index);
	const dd = bars.dd != null && bars.dd > 0 ? bars.dd : setup.index * .97;
	const short = closestStrike(chain.filter((row) => row.expiry === near && row.right === "put"), dd);
	if (!long || !short) return [];
	return [legFromContract(long, "buy", qty), legFromContract(short, "sell", qty)];
}
var bookMemory = null;
var PRESETS = [
	{
		id: 1,
		label: "⚡ Preset 1: Live 70-Delta ITM Short Call (Long Theta)"
	},
	{
		id: 2,
		label: "🛡️ Preset 2: Live Gedeckelter Bear Call Credit Spread (Short 70d Call + Long Schutz-Call bei Pass 1)"
	},
	{
		id: 3,
		label: "🔄 Preset 3: Live Put-Diagonal Roll-Maschine (Long 30d ITM Put + Short 7d Put exakt auf DD barrier 1)"
	}
];
var MODES = [
	{
		id: "mark",
		label: "Live Mark $"
	},
	{
		id: "bid",
		label: "Live Bid $"
	},
	{
		id: "ask",
		label: "Live Ask $"
	},
	{
		id: "custom",
		label: "Eigener Entry $"
	}
];
function normalize(rows) {
	return rows.map((row) => ({
		...row,
		name: row.name || "",
		expiry: row.expiry || "",
		priceMode: row.priceMode || "mark"
	}));
}
function OptionsBuilder({ live: chartLive = true }) {
	const [setup, setSetup] = (0, import_react.useState)(() => bookMemory?.setup ?? defaultSetup());
	const [legs, setLegs] = (0, import_react.useState)(() => normalize(bookMemory?.legs ?? []));
	const [time, setTime] = (0, import_react.useState)(() => bookMemory?.time ?? 0);
	const [vol, setVol] = (0, import_react.useState)(() => bookMemory?.vol ?? 0);
	const [rate, setRate] = (0, import_react.useState)(() => bookMemory?.rate ?? 0);
	const [syncEntry, setSyncEntry] = (0, import_react.useState)(() => bookMemory?.syncEntry ?? true);
	const [chainExpiry, setChainExpiry] = (0, import_react.useState)("");
	const [note, setNote] = (0, import_react.useState)("");
	const [series, setSeries] = (0, import_react.useState)(() => bookMemory?.series ?? {
		current: true,
		expiry: true,
		payout: true,
		prop: true,
		dd: true,
		pass: true
	});
	const names = (0, import_react.useMemo)(() => legs.map((row) => row.name).filter(Boolean), [legs]);
	const live = useDeribitLive(setup.asset, names);
	const booted = (0, import_react.useRef)(Boolean(bookMemory?.legs.some((row) => row.name)));
	const touched = (0, import_react.useRef)(Boolean(bookMemory?.legs.length));
	const seedStage = (0, import_react.useRef)(bookMemory?.legs.length ? 2 : 0);
	const seededKey = (0, import_react.useRef)("");
	const setupRef = (0, import_react.useRef)(setup);
	const syncRef = (0, import_react.useRef)(syncEntry);
	setupRef.current = setup;
	syncRef.current = syncEntry;
	(0, import_react.useEffect)(() => {
		bookMemory = {
			setup,
			legs,
			time,
			vol,
			rate,
			series,
			syncEntry
		};
	}, [
		setup,
		legs,
		time,
		vol,
		rate,
		series,
		syncEntry
	]);
	(0, import_react.useEffect)(() => {
		if (!syncEntry || !(live.index > 0)) return;
		setSetup((prev) => Math.abs(prev.index - live.index) < .005 ? prev : {
			...prev,
			index: live.index
		});
	}, [syncEntry, live.index]);
	const entrySpot = setup.index > 0 ? setup.index : live.index > 0 ? live.index : 2298;
	const fallbackSpot = Math.round(entrySpot);
	const fallback = (0, import_react.useMemo)(() => live.chain.length ? [] : syntheticChain(setup.asset, fallbackSpot), [
		live.chain.length,
		setup.asset,
		fallbackSpot
	]);
	const book = live.chain.length ? live.chain : fallback;
	(0, import_react.useEffect)(() => {
		if (touched.current || seedStage.current >= 2) return;
		const liveReady = live.chain.length >= 8;
		const spot = (syncRef.current && live.index > 0 ? live.index : setupRef.current.index) || (setup.asset === "BTC" ? 8e4 : 2300);
		const key = liveReady ? `live:${setup.asset}` : `syn:${setup.asset}:${Math.round(spot / (setup.asset === "BTC" ? 500 : 25))}`;
		if (seededKey.current === key) return;
		const source = liveReady ? live.chain : syntheticChain(setup.asset, spot);
		const next = {
			...setupRef.current,
			asset: setup.asset,
			index: spot
		};
		const built = buildLivePreset(1, source, next);
		if (!built.length) return;
		setLegs(scaleShortCallsToFee(built, next).legs);
		seededKey.current = key;
		seedStage.current = liveReady ? 2 : 1;
		booted.current = true;
		if (syncRef.current && live.index > 0) setSetup((prev) => Math.abs(prev.index - live.index) < .005 ? prev : {
			...prev,
			index: live.index
		});
	}, [
		live.chain,
		live.index,
		setup.asset
	]);
	const chainMap = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const row of book) map.set(row.name, row);
		return map;
	}, [book]);
	const byExpiry = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const row of book) {
			const list = map.get(row.expiry);
			if (list) list.push(row);
			else map.set(row.expiry, [row]);
		}
		return map;
	}, [book]);
	const expiries = (0, import_react.useMemo)(() => [...byExpiry.keys()].sort((a, b) => (byExpiry.get(a)?.[0]?.expiryMs ?? 0) - (byExpiry.get(b)?.[0]?.expiryMs ?? 0)), [byExpiry]);
	(0, import_react.useEffect)(() => {
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
	}, [
		expiries,
		chainExpiry,
		byExpiry
	]);
	const chartLegs = (0, import_react.useMemo)(() => legs.map((leg) => {
		const iv = live.tickers[leg.name]?.iv || chainMap.get(leg.name)?.iv || leg.iv;
		if (!(iv > 0) || Math.abs(iv - leg.iv) < .01) return leg;
		return {
			...leg,
			iv
		};
	}), [
		legs,
		live.tickers,
		chainMap
	]);
	const spot = live.index > 0 ? live.index : setup.index;
	const greeks = (0, import_react.useMemo)(() => sumGreeks(legs, live.tickers, spot), [
		legs,
		live.tickers,
		spot
	]);
	const spread = (0, import_react.useMemo)(() => spreadCost(legs, live.tickers, chainMap), [
		legs,
		live.tickers,
		chainMap
	]);
	const horizon = Math.max(1, ...chartLegs.filter((row) => row.on && row.dte > 0).map((row) => row.dte), 1);
	const elapsed = Math.min(Math.max(0, time), horizon);
	const bars = barriers(setup);
	const unitName = setup.unit === "usd" ? "USD" : setup.asset;
	const mid = live.index > 0 ? live.index : setup.index;
	const listed = (0, import_react.useMemo)(() => {
		const list = [...byExpiry.get(chainExpiry) ?? []];
		list.sort((a, b) => a.strike - b.strike || (a.right === b.right ? 0 : a.right === "call" ? -1 : 1));
		return list;
	}, [byExpiry, chainExpiry]);
	const deltaSpot = spot > 0 ? Math.round(spot * 2) / 2 : 0;
	const deltaByName = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const contract of listed) map.set(contract.name, liveDelta(contract, deltaSpot));
		return map;
	}, [listed, deltaSpot]);
	const ddStrike = nearestStrike(listed.map((contract) => contract.strike), bars.dd);
	const strikes = (0, import_react.useMemo)(() => [...new Set(book.map((contract) => contract.strike))], [book]);
	const roll = (0, import_react.useMemo)(() => feeRoll(chartLegs, setup, strikes, elapsed, vol, rate), [
		chartLegs,
		setup,
		strikes,
		elapsed,
		vol,
		rate
	]);
	const cover = (0, import_react.useMemo)(() => {
		if (bars.dd == null || !(bars.dd > 0)) return null;
		const fee = Math.max(0, setup.fee);
		const gap = (roll?.protection ?? optionsPnlUsd(chartLegs, bars.dd, elapsed, vol, rate, setup.index)) - fee;
		return {
			current: gap >= -Math.max(1, fee * .01) ? Math.max(gap, 0) : gap,
			expiry: optionsPnlUsd(chartLegs, bars.dd, 1e4, 0, 0, setup.index) - fee
		};
	}, [
		chartLegs,
		bars.dd,
		elapsed,
		vol,
		rate,
		setup.index,
		setup.fee,
		roll
	]);
	const patch = (next) => setSetup((prev) => ({
		...prev,
		...next
	}));
	const patchLeg = (id, next) => {
		touched.current = true;
		setLegs((rows) => rows.map((row) => row.id === id ? {
			...row,
			...next
		} : row));
	};
	const applyPreset = (id) => {
		touched.current = true;
		booted.current = true;
		const base = syncEntry && live.index > 0 ? {
			...setup,
			index: live.index
		} : setup;
		const built = buildLivePreset(id, book.length ? book : syntheticChain(base.asset, base.index), base);
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
	const setAsset = (asset) => {
		setSetup((prev) => ({
			...prev,
			asset
		}));
		setLegs((rows) => rows.filter((row) => !row.name || row.name.startsWith(`${asset}-`) || row.name.startsWith(`SYN-${asset}-`)));
		setChainExpiry("");
		setNote("");
		if (!touched.current) {
			seedStage.current = 0;
			seededKey.current = "";
		}
	};
	const adopt = (id, contract, mode) => {
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
				underlying
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
				premium: priceMode === "custom" ? row.premium : coinToUsd(coin, underlying) ?? row.premium
			};
		}));
	};
	const addFromChain = (contract, side) => {
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
	const snapLegToBarrier = (row) => {
		if (bars.dd == null || !(bars.dd > 0)) {
			setNote("Keine DD-Barrier. Coins und Max DD prüfen.");
			return;
		}
		const sameExpiry = (byExpiry.get(row.expiry) ?? []).filter((contract) => contract.right === row.right);
		const next = closestContract(sameExpiry.length ? sameExpiry : book.filter((contract) => contract.right === row.right), bars.dd);
		if (!next) {
			setNote("Kein Deribit-Strike an der DD-Barrier.");
			return;
		}
		setNote("");
		adopt(row.id, next);
	};
	const when = /* @__PURE__ */ new Date();
	when.setDate(when.getDate() + Math.round(elapsed));
	const whenLabel = elapsed < .05 ? "Heute (T+0)" : `${when.toLocaleDateString("de-DE", {
		day: "2-digit",
		month: "short",
		year: "numeric"
	})} (T+${trim(elapsed)})`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex w-full flex-col gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-raised px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted",
					children: [
						"Simulated PNL · ",
						setup.asset,
						"-Index"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: cn("text-xs font-medium", live.status === "live" ? "text-long" : "text-short"),
					children: live.status === "live" ? `Deribit WS Connected · 100ms · Latenz ${live.latencyMs == null ? "…" : `${live.latencyMs} ms`}` : live.status === "connecting" ? "Verbinde mit Deribit…" : "Getrennt – Verbinde neu…"
				})]
			}),
			live.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] text-short",
				children: live.error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-2xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm font-semibold",
							children: "Prop-Challenge"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Segment, {
								value: setup.unit,
								options: [["usd", "USD"], ["coin", setup.asset]],
								onChange: (unit) => patch({ unit })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Segment, {
								value: setup.asset,
								options: [["ETH", "ETH"], ["BTC", "BTC"]],
								onChange: setAsset
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-pressed": syncEntry,
							className: cn("min-h-11 rounded-xl px-3 py-2 text-left text-xs font-semibold", syncEntry ? "bg-long text-bg" : "bg-raised text-fg"),
							onClick: () => {
								setSyncEntry((on) => {
									const next = !on;
									if (next && live.index > 0) setSetup((prev) => ({
										...prev,
										index: live.index
									}));
									return next;
								});
							},
							children: ["📌 Eval-Entry mit Live-Index synchronisieren: ", syncEntry ? "AN" : "AUS"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[11px] text-faint",
							children: syncEntry ? "Pre-Trade: Eval-Entry, DD barrier 1 und Pass 1 laufen mit dem Live-Index." : "In-Trade: Eval-Entry und beide Barrieren bleiben eingefroren. Nur die Live-Index-Linie wandert."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Eval-Entry-Kurs ($)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: fieldClass,
									inputMode: "decimal",
									disabled: syncEntry,
									value: num(setup.index),
									onChange: (event) => patch({ index: clamp(event.target.value, .01, 1e7, setup.index) })
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Challenge-Gebühr ($)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: fieldClass,
									inputMode: "decimal",
									value: num(setup.fee),
									onChange: (event) => patch({ fee: clamp(event.target.value, 0, 1e6, setup.fee) })
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Max Drawdown ($)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: fieldClass,
									inputMode: "decimal",
									value: num(setup.maxDd),
									onChange: (event) => patch({ maxDd: clamp(event.target.value, 0, 5e6, setup.maxDd) })
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Profit Target ($)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: fieldClass,
									inputMode: "decimal",
									value: num(setup.target),
									onChange: (event) => patch({ target: clamp(event.target.value, 0, 5e6, setup.target) })
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Richtung",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 grid grid-cols-2 gap-1",
									children: ["long", "short"].map((side) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: cn("h-10 rounded-xl text-xs font-semibold", setup.side === side ? side === "long" ? "bg-long text-bg" : "bg-short text-bg" : "bg-bg text-muted"),
										onClick: () => patch({ side }),
										children: side === "long" ? "LONG" : "SHORT"
									}, side))
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Prop-Positionsgröße (Coins)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: fieldClass,
									inputMode: "decimal",
									value: num(setup.coins),
									onChange: (event) => patch({ coins: clamp(event.target.value, 0, 1e5, setup.coins) })
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Wert des Funded-Accounts bei Pass ($)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: fieldClass,
									inputMode: "decimal",
									value: num(setup.payout),
									onChange: (event) => patch({ payout: clamp(event.target.value, 0, 5e6, setup.payout) })
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 font-mono text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-short",
								children: ["DD barrier 1: ", bars.dd == null ? "—" : px(bars.dd)]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-faint",
								children: " · "
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-muted",
								children: ["Eval-Entry: ", px(setup.index)]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-faint",
								children: " · "
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								style: { color: "#22d3ee" },
								children: ["Live WS Index: ", live.index > 0 ? px(live.index) : "—"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-faint",
								children: " · "
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-long",
								children: ["Pass 1: ", bars.pass == null ? "—" : px(bars.pass)]
							})
						]
					}),
					setup.unit === "coin" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-[11px] text-faint",
						children: [
							"Chart, Tooltip, Spread und Theta/Vega in ",
							setup.asset,
							". Delta bleibt in Coins. Die Eingaben bleiben in USD."
						]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-2xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-semibold",
						children: "Options-Beine"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: PRESETS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "h-auto min-h-11 whitespace-normal py-2 text-left text-xs leading-snug",
							onClick: () => applyPreset(preset.id),
							children: preset.label
						}, preset.id))
					}),
					note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-short",
						children: note
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptionCatalog, {
						expiries,
						byExpiry,
						expiry: chainExpiry,
						onExpiry: setChainExpiry,
						listed,
						tickers: live.tickers,
						deltaByName,
						ddStrike,
						loading: !book.length,
						fallback: !live.chain.length && book.length > 0,
						onAdd: addFromChain
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						tone: "accent",
						className: "mt-3 h-auto min-h-11 whitespace-normal text-left text-xs leading-snug",
						onClick: scaleToFee,
						children: [
							"🎯 Kontrakt-Menge automatisch auf Challenge-Gebühr ($",
							px(setup.fee),
							") berechnen"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-[1080px] text-left text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "text-muted",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-2 py-1 font-medium",
										children: "Aktiv"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-2 py-1 font-medium",
										children: "Expiry"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-2 py-1 font-medium",
										children: "Strike & Typ"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-2 py-1 font-medium",
										children: "Richtung"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-2 py-1 font-medium",
										children: "Menge"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-2 py-1 font-medium",
										children: "Preis-Modus"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-2 py-1 font-medium",
										children: "Entry $"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-2 py-1 font-medium",
										children: "IV %"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-2 py-1 font-medium",
										children: "Δ Delta"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-2 py-1 font-medium",
										children: "Θ Theta $/Tag"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "px-2 py-1 font-medium" })
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: legs.map((row) => {
								const choices = (byExpiry.get(row.expiry) ?? byExpiry.get(chainExpiry) ?? []).filter((contract) => !row.expiry || contract.expiry === row.expiry);
								const shown = quoteRow(row, live.tickers[row.name], chainMap.get(row.name), spot);
								const liveMark = markUsd(live.tickers[row.name], chainMap.get(row.name));
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t border-line",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-2 py-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												className: "h-4 w-4",
												checked: row.on,
												onChange: (event) => patchLeg(row.id, { on: event.target.checked }),
												"aria-label": "Bein aktiv"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-2 py-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
												className: cellClass,
												value: row.expiry || chainExpiry,
												onChange: (event) => {
													const expiry = event.target.value;
													const pool = (byExpiry.get(expiry) ?? []).filter((contract) => contract.right === row.right);
													const next = closestContract(pool, row.strike) ?? pool[0];
													if (next) adopt(row.id, next);
												},
												children: [row.expiry && !byExpiry.has(row.expiry) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: row.expiry,
													children: row.expiry
												}) : null, expiries.map((expiry) => {
													const dte = byExpiry.get(expiry)?.[0]?.dte ?? 0;
													return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
														value: expiry,
														children: [
															expiry,
															" · ",
															dte.toFixed(1),
															"d"
														]
													}, expiry);
												})]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "px-2 py-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
												className: cellClass,
												value: row.name,
												onChange: (event) => {
													const contract = chainMap.get(event.target.value);
													if (contract) adopt(row.id, contract);
												},
												children: [
													!row.name ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "",
														children: "Kontrakt wählen"
													}) : null,
													row.name && !chainMap.has(row.name) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
														value: row.name,
														children: [
															row.strike,
															" ",
															row.right === "call" ? "Call" : "Put"
														]
													}) : null,
													(choices.length ? choices : [...chainMap.values()].filter((contract) => contract.expiry === (row.expiry || chainExpiry))).map((contract) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: contract.name,
														children: contractChoice(contract, spot)
													}, contract.name))
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "mt-1 h-8 w-full rounded-lg bg-bg px-2 text-left text-[11px] font-semibold text-short",
												onClick: () => snapLegToBarrier(row),
												children: "🎯 Strike auf DD-Barrier setzen"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-2 py-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
												className: cellClass,
												value: row.side,
												onChange: (event) => patchLeg(row.id, { side: event.target.value }),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "buy",
													children: "Buy"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "sell",
													children: "Sell"
												})]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-2 py-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												className: cellClass,
												inputMode: "decimal",
												value: num(row.qty),
												onChange: (event) => patchLeg(row.id, { qty: clamp(event.target.value, 0, 1e6, row.qty) })
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-2 py-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
												className: cellClass,
												value: row.priceMode,
												onChange: (event) => {
													const mode = event.target.value;
													if (mode === "custom") {
														patchLeg(row.id, {
															priceMode: mode,
															premium: row.premium ?? liveMark ?? 0
														});
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
														underlying
													}, mode);
													patchLeg(row.id, {
														priceMode: mode,
														premium: coinToUsd(coin, underlying) ?? row.premium
													});
												},
												children: MODES.map((mode) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: mode.id,
													children: mode.label
												}, mode.id))
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-2 py-2",
											children: row.priceMode === "custom" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												className: cellClass,
												inputMode: "decimal",
												value: row.premium == null ? "" : num(row.premium),
												onChange: (event) => patchLeg(row.id, { premium: clamp(event.target.value, 0, 1e7, row.premium ?? 0) })
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-24 font-mono",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: row.premium == null ? "—" : px(row.premium) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-[10px] text-faint",
													children: ["Mark ", liveMark == null ? "—" : px(liveMark)]
												})]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-2 py-2 font-mono",
											children: shown.iv > 0 ? shown.iv.toFixed(1) : "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-2 py-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex min-w-36 flex-col gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: cn("inline-flex w-fit rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold", shown.unitDelta > 5e-4 ? "bg-long text-bg" : shown.unitDelta < -5e-4 ? "bg-short text-bg" : "bg-bg text-muted"),
													children: ["Einzel-Δ: ", fmtSigned(shown.unitDelta, 2)]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: cn("inline-flex w-fit rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold", shown.positionDelta > 5e-4 ? "bg-long text-bg" : shown.positionDelta < -5e-4 ? "bg-short text-bg" : "bg-bg text-muted"),
													children: [
														"Gesamt-Δ: ",
														fmtSigned(shown.positionDelta, 2),
														" ",
														setup.asset
													]
												})]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-2 py-2 font-mono",
											children: fmtSigned(shown.theta, 2)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-2 py-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "grid h-10 w-10 place-items-center rounded-lg text-short",
												"aria-label": "Bein löschen",
												onClick: () => {
													touched.current = true;
													setLegs((rows) => rows.filter((item) => item.id !== row.id));
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
											})
										})
									]
								}, row.id);
							}) })]
						})
					}),
					legs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted",
						children: "Keine Beine. Preset wählen oder einen Kontrakt aus der Kette übernehmen."
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-3",
						onClick: () => {
							touched.current = true;
							booted.current = true;
							const next = closestContract((byExpiry.get(chainExpiry) ?? []).filter((contract) => contract.right === "call"), mid);
							if (next) setLegs((rows) => [...rows, legFromContract(next, "buy", 1)]);
							else setLegs((rows) => [...rows, blankLeg(setup)]);
						},
						children: "+ Options-Bein hinzufügen"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-2xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-semibold",
						children: "Portfolio-Griechen"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Netto-Delta",
								value: fmtGreek(greeks.delta)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Netto-Gamma",
								value: fmtGreek(greeks.gamma)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: setup.unit === "usd" ? "Netto-Theta ($ / Tag im Seitwärtsmarkt)" : `Netto-Theta (${setup.asset} / Tag im Seitwärtsmarkt)`,
								value: fmtGreek(toUnit(greeks.theta, setup)),
								tone: greeks.theta
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: setup.unit === "usd" ? "Netto-Vega" : `Netto-Vega (${setup.asset})`,
								value: fmtGreek(toUnit(greeks.vega, setup))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: setup.unit === "usd" ? "Live Bid/Ask Spread-Kosten ($)" : `Live Bid/Ask Spread-Kosten (${setup.asset})`,
								value: fmtGreek(toUnit(spread, setup))
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[11px] text-faint",
						children: "Theta und Vega kommen aus dem Deribit-Ticker (USD pro Kontrakt) und werden mit Richtung und Menge multipliziert. Die Slider verschieben nur die Kurve."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 grid gap-3 lg:grid-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
								label: `Time: ${whenLabel}`,
								min: 0,
								max: horizon,
								step: horizon > 20 ? .5 : .1,
								value: elapsed,
								onChange: setTime
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
								label: `Volatility shift: ${vol.toFixed(0)}%`,
								min: -70,
								max: 200,
								step: 1,
								value: vol,
								onChange: setVol
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
								label: `Rate shift: ${rate.toFixed(0)}%`,
								min: -20,
								max: 20,
								step: 1,
								value: rate,
								onChange: setRate
							})
						]
					}),
					cover ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 grid gap-2 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoverLine, {
							label: "Current",
							net: cover.current,
							fee: true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoverLine, {
							label: "Expiry",
							net: cover.expiry,
							fee: true
						})]
					}) : null,
					chartLive ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptionsChart, {
						setup,
						legs: chartLegs,
						elapsed,
						volShift: vol,
						rateShift: rate,
						liveIndex: live.index,
						cover,
						series,
						onToggle: (key) => setSeries((prev) => ({
							...prev,
							[key]: !prev[key]
						}))
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-xs text-muted",
						children: "Payoff-Diagramm liegt in diesem Tab und wird gezeichnet, sobald der Options-Tab aktiv ist."
					}),
					roll ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RollCompare, { plan: roll }) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-[11px] text-faint",
						children: [
							"Orange ist der Verfall, Grün ist Black-Scholes mit der Live-Mark-IV plus Time-, Vol- und Rate-Shift. Der Entry jedes Beins ist der Preis zum Zeitpunkt der Auswahl. Payout addiert ab Pass 1 den Funded-Wert (",
							px(setup.payout),
							"). Anzeige: ",
							unitName,
							"."
						]
					})
				]
			})
		]
	});
}
function sumGreeks(legs, tickers, spot) {
	const out = {
		delta: 0,
		gamma: 0,
		vega: 0,
		theta: 0
	};
	for (const leg of legs) {
		if (!leg.on || !(leg.qty > 0)) continue;
		const mult = (leg.side === "buy" ? 1 : -1) * leg.qty;
		const ticker = leg.name ? tickers[leg.name] : void 0;
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
			right: leg.right
		});
		out.delta += quote.delta * mult;
		out.gamma += quote.gamma * mult;
		out.vega += quote.vega * mult;
		out.theta += quote.theta * mult;
	}
	return out;
}
function spreadCost(legs, tickers, chain) {
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
function quoteRow(leg, ticker, contract, spot) {
	const iv = ticker?.iv || contract?.iv || leg.iv;
	const sign = leg.side === "buy" ? 1 : -1;
	const fallback = contract ? liveDelta(contract, spot, ticker) : quoteOption({
		spot: spot > 0 ? spot : 1,
		strike: leg.strike > 0 ? leg.strike : 1,
		dte: Math.max(leg.dte, 0),
		ivPct: iv > 0 ? iv : 50,
		ratePct: 0,
		right: leg.right
	}).delta;
	const raw = ticker && (ticker.iv > 0 || ticker.markCoin > 0) ? ticker.delta : fallback;
	const thetaRaw = ticker && (ticker.theta !== 0 || ticker.markCoin > 0) ? ticker.theta : quoteOption({
		spot: ticker?.underlying || contract?.underlying || spot || 1,
		strike: leg.strike > 0 ? leg.strike : 1,
		dte: Math.max(leg.dte, 0),
		ivPct: iv > 0 ? iv : 50,
		ratePct: 0,
		right: leg.right
	}).theta;
	const unitDelta = raw * sign;
	return {
		iv,
		unitDelta,
		positionDelta: unitDelta * Math.max(0, leg.qty),
		theta: thetaRaw * sign * leg.qty
	};
}
function markUsd(ticker, contract) {
	const coin = ticker?.markCoin || contract?.markCoin || 0;
	const underlying = ticker?.underlying || contract?.underlying || 0;
	return coin > 0 && underlying > 0 ? coin * underlying : null;
}
function closestContract(rows, strike) {
	let best = null;
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
function nearestStrike(strikes, target) {
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
function prettyExpiry(expiry, dte) {
	if (expiry.includes("(")) return expiry;
	const match = /^(\d{1,2})([A-Z]{3})(\d{2})$/.exec(expiry);
	return `${match ? `${match[1].padStart(2, "0")}${match[2]}${match[3]}` : expiry} (${Math.max(0, Math.round(dte))}d)`;
}
function contractChoice(contract, spot) {
	const anchor = spot > 0 ? spot : contract.underlying || 1;
	const quote = quoteOption({
		spot: anchor,
		strike: contract.strike,
		dte: Math.max(contract.dte, 1 / 24),
		ivPct: contract.iv > 1 ? contract.iv : 55,
		ratePct: 0,
		right: contract.right
	});
	const delta = liveDelta(contract, anchor);
	const mark = contract.underlying > 0 && contract.markCoin > 0 ? contract.markCoin * contract.underlying : quote.usd;
	return `${trim(contract.strike)} ${contract.right === "call" ? "Call" : "Put"} · Δ ${fmtSigned(delta, 2)} · Mark: $${px(mark)} · Θ ${fmtSigned(quote.theta, 2)}/d`;
}
function CoverLine({ label, net, fee = false }) {
	const hedged = net >= -.5;
	const body = Math.abs(net).toLocaleString("en-US", { maximumFractionDigits: net >= 100 || net <= -100 ? 0 : 2 });
	const text = fee ? hedged ? `✅ ${label}: Challenge-Gebühr bei Breach zu 100% gedeckt!` : `⚠️ ${label}: Noch -$${body} der Challenge-Gebühr ungedeckt` : hedged ? `✅ ${label}: Breach voll gehedgt (+$${body} Netto)` : `⚠️ ${label}: Noch -$${body} ungedeckt bei Breach (Menge erhöhen!)`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: cn("rounded-xl px-3 py-2 text-xs font-semibold", hedged ? "bg-long text-bg" : "bg-short text-bg"),
		children: text
	});
}
function RollCompare({ plan }) {
	const pct = Math.round(plan.share * 100);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-3 rounded-lg border border-line bg-bg p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-sm font-semibold",
			children: "🔄 Roll bei 55% DD vs. Auslaufen lassen (Nur Challenge-Fee Hedge)"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2 grid gap-2 md:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-line bg-surface p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs font-semibold text-fg",
						children: [
							"Spalte A – Bei 55% DD (",
							px(plan.roll),
							") rollen"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-mono text-xs leading-5 text-muted",
						children: [
							"Realisierter Options-Gewinn: ",
							usd(plan.realized),
							" · deckt ",
							pct,
							"% der Challenge-Gebühr (",
							usd(plan.fee),
							")."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-xs leading-5 text-muted",
						children: [
							"Neuer tieferer Ziel-Strike für die restlichen 45%: ",
							plan.nextStrike == null ? "—" : `$${trim(plan.nextStrike)}`,
							" · Menge ",
							plan.nextQty.toFixed(2),
							" · zusätzlicher Schutz ",
							usd(plan.nextProfit),
							"."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 font-mono text-xs font-semibold text-long",
						children: ["Gesamt-Cash-Schutz bis zur DD barrier 1: ", usd(plan.protection)]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-line bg-surface p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-semibold text-fg",
						children: "Spalte B – Ohne Rollen bis Expiry halten"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-mono text-xs leading-5 text-muted",
						children: [
							"Gedeckelter Maximalgewinn der Start-Option: ",
							usd(plan.capped),
							"."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-xs leading-5 text-muted",
						children: [
							"Ungerollt an der DD barrier (",
							px(plan.dd),
							"): ",
							usd(plan.unrolled),
							"."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: cn("mt-1 font-mono text-xs font-semibold", plan.shortfall > .5 ? "text-short" : "text-long"),
						children: plan.shortfall > .5 ? `Zur vollen Challenge-Gebühr fehlen ${usd(plan.shortfall)}.` : "Challenge-Gebühr auch ohne Roll gedeckt."
					})
				]
			})]
		})]
	});
}
function usd(n) {
	return `${n > .005 ? "+" : n < -.005 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	})}`;
}
function usdCoin(coin, underlying) {
	const usd = coinToUsd(coin != null && coin > 0 ? coin : null, underlying);
	return usd == null ? "—" : `$${px(usd)}`;
}
function OptionCatalog({ expiries, byExpiry, expiry, onExpiry, listed, tickers, deltaByName, ddStrike, loading, fallback, onAdd }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4 rounded-2xl border border-line bg-bg p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "pb-head text-sm font-semibold",
				children: "📋 Verfügbare Live-Optionen auf Deribit auswählen"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 flex gap-1 overflow-x-auto pb-1",
				children: expiries.map((item) => {
					const dte = byExpiry.get(item)?.[0]?.dte ?? 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: cn("h-9 shrink-0 rounded-full px-3 text-xs", item === expiry ? "bg-fg text-bg" : "bg-surface text-muted"),
						onClick: () => onExpiry(item),
						children: prettyExpiry(item, dte)
					}, item);
				})
			}),
			loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-muted",
				children: "Deribit-Optionen werden geladen…"
			}) : null,
			fallback ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-muted",
				children: "Modell-Kette um den Eval-Entry (IV 55% mit Smile). Echte Deribit-Kurse ersetzen sie, sobald sie da sind."
			}) : null,
			!loading && listed.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-muted",
				children: "Für diesen Verfall sind keine Optionen in der Kette."
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 max-h-80 space-y-1 overflow-auto",
				children: listed.map((contract) => {
					const ticker = tickers[contract.name];
					const delta = ticker && (ticker.iv > 0 || ticker.markCoin > 0) ? ticker.delta : deltaByName.get(contract.name) ?? liveDelta(contract, 0, ticker);
					const underlying = ticker?.underlying || contract.underlying;
					const iv = ticker?.iv || contract.iv;
					const quote = quoteOption({
						spot: underlying > 0 ? underlying : 1,
						strike: contract.strike,
						dte: Math.max(contract.dte, 1 / 24),
						ivPct: iv > 1 ? iv : 55,
						ratePct: 0,
						right: contract.right
					});
					const hot = Math.abs(delta) >= .65 && Math.abs(delta) <= .75;
					const onBarrier = ddStrike != null && contract.strike === ddStrike;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line py-2 text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono",
								children: contract.name.startsWith("SYN-") ? `${trim(contract.strike)} ${contract.right === "call" ? "Call" : "Put"}` : contract.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Strike: $", trim(contract.strike)] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: cn("inline-flex rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold", delta >= 0 ? "bg-long text-bg" : "bg-short text-bg"),
								children: ["🎯 Δ ", fmtSigned(delta, 2)]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-muted",
								children: [
									"Mark: ",
									usdCoin(ticker?.markCoin || contract.markCoin, underlying),
									" (Bid: ",
									usdCoin(ticker?.bidCoin ?? contract.bidCoin, underlying),
									" / Ask: ",
									usdCoin(ticker?.askCoin ?? contract.askCoin, underlying),
									")"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["IV: ", iv > 0 ? `${iv.toFixed(1)}%` : "—"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono",
								children: [
									"Θ ",
									fmtSigned(ticker?.theta || quote.theta, 2),
									"/d"
								]
							}),
							onBarrier ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-short px-2 py-0.5 text-[11px] font-semibold text-bg",
								children: "[🎯 DD-Barrier Strike]"
							}) : null,
							hot ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-raised px-2 py-0.5 text-[11px] font-semibold",
								children: "[🔥 ~70Δ ITM]"
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "ml-auto inline-flex gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "h-8 rounded-lg bg-long px-2 text-[11px] font-semibold text-bg",
									onClick: () => onAdd(contract, "buy"),
									children: "+ Buy"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "h-8 rounded-lg bg-short px-2 text-[11px] font-semibold text-bg",
									onClick: () => onAdd(contract, "sell"),
									children: "− Sell"
								})]
							})
						]
					}, contract.name);
				})
			})
		]
	});
}
function Segment({ value, options, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex rounded-full bg-bg p-1",
		children: options.map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: cn("h-8 rounded-full px-3 text-xs", value === id ? "bg-fg text-bg" : "text-muted"),
			onClick: () => onChange(id),
			children: label
		}, id))
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-[11px] text-muted",
		children: [label, children]
	});
}
function Stat({ label, value, tone = 0 }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-bg px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: cn("mt-1 font-mono text-lg tabular-nums", tone > 1e-8 ? "text-long" : tone < -1e-8 ? "text-short" : "text-fg"),
			children: value
		})]
	});
}
function Slider({ label, min, max, step, value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-xs text-muted",
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			className: "mt-1 w-full",
			type: "range",
			min,
			max,
			step,
			value: Math.min(max, Math.max(min, value)),
			onChange: (event) => onChange(Number(event.target.value))
		})]
	});
}
var fieldClass = "mt-1 h-10 w-full rounded-xl border border-line bg-bg px-2 text-right font-mono text-sm text-fg disabled:opacity-70";
var cellClass = "h-10 w-full min-w-24 rounded-lg border border-line bg-bg px-2 font-mono text-sm text-fg";
function num(value) {
	if (!Number.isFinite(value)) return "";
	return String(value);
}
function trim(value) {
	if (!Number.isFinite(value)) return "";
	const digits = Math.abs(value) >= 100 ? 2 : 4;
	return String(Math.round(value * 10 ** digits) / 10 ** digits);
}
function clamp(raw, min, max, fallback) {
	if (raw.trim() === "") return min;
	const next = Number(raw);
	if (!Number.isFinite(next)) return fallback;
	return Math.min(max, Math.max(min, next));
}
function px(n) {
	return n.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}
function fmtGreek(n) {
	if (!Number.isFinite(n)) return "—";
	const abs = Math.abs(n);
	const digits = abs >= 100 ? 1 : abs >= 1 ? 2 : abs >= .01 ? 4 : 6;
	return n.toLocaleString("en-US", {
		maximumFractionDigits: digits,
		minimumFractionDigits: Math.min(2, digits)
	});
}
function fmtSigned(n, digits) {
	if (!Number.isFinite(n)) return "—";
	return (n > 0 ? "+" : "") + n.toLocaleString("en-US", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
}
var THEME_KEY = "position-builder.theme";
var PAPER = "#f3f4f6";
var INK = "#0a0b0d";
function currentTheme() {
	if (typeof document === "undefined") return "dark";
	return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}
function applyTheme(theme) {
	const root = document.documentElement;
	root.dataset.theme = theme;
	root.style.colorScheme = theme;
	root.style.backgroundColor = theme === "light" ? PAPER : INK;
	try {
		localStorage.setItem(THEME_KEY, theme);
	} catch {}
	const meta = document.querySelector("meta[name=\"theme-color\"]");
	if (meta) meta.setAttribute("content", theme === "light" ? PAPER : INK);
}
function toggleTheme() {
	const next = currentTheme() === "light" ? "dark" : "light";
	applyTheme(next);
	return next;
}
function Desk() {
	const hydrate = useBook((state) => state.hydrate);
	const [theme, setTheme] = (0, import_react.useState)("dark");
	const [mode, setMode] = (0, import_react.useState)("perp");
	(0, import_react.useEffect)(() => {
		hydrate();
		const saved = currentTheme();
		setTheme(saved);
		if (saved !== "dark") applyTheme("dark");
		setTheme("dark");
	}, [hydrate]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "desk-shell min-h-screen bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "pb-top",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pb-brand",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "pb-mark",
						"aria-hidden": true,
						children: "P"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "pb-name",
						children: ["Position Builder", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Simulation" })]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					role: "tablist",
					"aria-label": "Modus",
					className: "pb-tabs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabButton, {
						active: mode === "perp",
						controls: "panel-perp",
						title: "Hydra Perp-Loop",
						meta: "Funded vs. Evals",
						onClick: () => setMode("perp")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabButton, {
						active: mode === "options",
						controls: "panel-options",
						title: "Options + Prop",
						meta: "Live-WS",
						onClick: () => setMode("options")
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pb-tools",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "pb-outline",
						onClick: () => setTheme(toggleTheme()),
						children: theme === "dark" ? "Hell" : "Dunkel"
					})
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex w-full min-w-0 flex-col gap-2 px-2 py-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
					theme,
					position: "top-center",
					toastOptions: { style: {
						background: "var(--color-raised)",
						color: "var(--color-fg)",
						border: "1px solid var(--color-line)",
						boxShadow: "none"
					} }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					id: "panel-perp",
					role: "tabpanel",
					hidden: mode !== "perp",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HydraWizard, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					id: "panel-options",
					role: "tabpanel",
					hidden: mode !== "options",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptionsBuilder, { live: mode === "options" })
				})
			]
		})]
	});
}
function TabButton({ active, controls, title, meta, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		role: "tab",
		"aria-selected": active,
		"aria-controls": controls,
		className: "pb-tab",
		onClick,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: meta })]
	});
}
var SplitComponent = Desk;
//#endregion
export { SplitComponent as component };
