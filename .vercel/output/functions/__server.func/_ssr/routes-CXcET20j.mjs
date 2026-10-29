import { i as __toESM } from "../_runtime.mjs";
import { J as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as ChevronUp, i as Moon, n as Trash2, o as ChevronDown, r as Sun } from "../_libs/lucide-react.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { a as Line, c as ResponsiveContainer, i as XAxis, l as Tooltip, n as LineChart, o as CartesianGrid, r as YAxis, s as ReferenceLine, t as ComposedChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CXcET20j.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function Button({ tone = "ghost", className, type = "button", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type,
		className: cn("press inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40", tone === "buy" && "bg-long text-bg hover:opacity-90", tone === "sell" && "bg-short text-bg hover:opacity-90", tone === "accent" && "bg-fg text-bg hover:opacity-90", tone === "ghost" && "bg-raised text-fg hover:opacity-90", className),
		...props
	});
}
function Signed({ value, text, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("font-mono tabular-nums", value > 1e-10 ? "text-long" : value < -1e-10 ? "text-short" : "text-muted", className),
		children: text
	});
}
var fieldClass = "h-11 w-full rounded-xl border border-line bg-bg px-3 font-mono text-base text-fg outline-none focus:border-accent";
var PLATFORMS = [
	"Eigenes System",
	"DXtrade",
	"Match-Trader",
	"cTrader",
	"TradeLocker",
	"Bybit/Binance WL"
];
var FIRM_STATUSES = [
	"Frei",
	"Aktiver Kloner (Funded)",
	"Im Eval-Lauf",
	"Cash-Kuh (Trader)",
	"Cooldown / Wartet auf Payout"
];
var ACCOUNT_SIZES$1 = [
	5e3,
	1e4,
	25e3,
	5e4,
	1e5
];
var DEFAULT_PRICES = {
	5e3: 20,
	1e4: 40,
	25e3: 95,
	5e4: 180,
	1e5: 330
};
var STORAGE_KEY$2 = "position-builder.firms.v1";
function firm(id, name, platform, makerFee, takerFee, status = "Frei") {
	return {
		id,
		name,
		platform,
		makerFee,
		takerFee,
		profitSplit: 80,
		maxDrawdownPct: 3,
		profitTargetPct: 9,
		prices: { ...DEFAULT_PRICES },
		status
	};
}
function defaultFirms() {
	return [
		firm("firm-a", "Prop A (Zero-Fee)", "Match-Trader", 0, 0),
		firm("firm-b", "Prop B (Low-Fee Crypto)", "Bybit/Binance WL", 0, .015),
		firm("hn-crypto", "Hypernova (Crypto)", "Eigenes System", .01, .04),
		firm("hn-fx", "Hypernova (FX / Indices / Gold)", "Eigenes System", 0, .005),
		firm("hn-eq", "Hypernova (Equities)", "Eigenes System", 0, .03),
		firm("firm-f", "Prop F (Reserve-Firma)", "DXtrade", .01, .02)
	];
}
function defaultStore() {
	return {
		firms: defaultFirms(),
		cash: 500,
		history: [],
		cycle: {
			slMovePct: 1,
			extraProfit: 0,
			funded: {
				firmId: "hn-crypto",
				size: 1e4,
				style: "market",
				discountPct: 0,
				buffer: 300,
				enabled: true
			},
			eval1: {
				firmId: "firm-b",
				size: 1e4,
				style: "market",
				discountPct: 0,
				buffer: 0,
				enabled: true
			},
			eval2: {
				firmId: "firm-f",
				size: 1e4,
				style: "market",
				discountPct: 0,
				buffer: 0,
				enabled: true
			}
		}
	};
}
function num$3(value, fallback, min = 0, max = 1e6) {
	return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function pricesOf(raw) {
	const next = { ...DEFAULT_PRICES };
	if (!raw || typeof raw !== "object") return next;
	const src = raw;
	for (const size of ACCOUNT_SIZES$1) {
		const value = src[String(size)];
		if (typeof value === "number" && Number.isFinite(value) && value >= 0) next[size] = value;
	}
	return next;
}
function sizeOf(value, fallback) {
	return ACCOUNT_SIZES$1.includes(value) ? value : fallback;
}
function firmOf(raw) {
	if (!raw || typeof raw !== "object") return null;
	const src = raw;
	if (typeof src.id !== "string" || typeof src.name !== "string" || !src.name.trim()) return null;
	const platform = PLATFORMS.includes(src.platform) ? src.platform : "Eigenes System";
	const status = FIRM_STATUSES.includes(src.status) ? src.status : "Frei";
	return {
		id: src.id,
		name: src.name.trim(),
		platform,
		makerFee: num$3(src.makerFee, 0, 0, 5),
		takerFee: num$3(src.takerFee, 0, 0, 5),
		profitSplit: num$3(src.profitSplit, 80, 1, 100),
		maxDrawdownPct: num$3(src.maxDrawdownPct, 3, .1, 50),
		profitTargetPct: num$3(src.profitTargetPct, 9, .1, 100),
		prices: pricesOf(src.prices),
		status
	};
}
function slotOf(raw, fallback, ids) {
	const src = raw && typeof raw === "object" ? raw : {};
	const firmId = typeof src.firmId === "string" && ids.has(src.firmId) ? src.firmId : fallback.firmId;
	return {
		firmId: ids.has(firmId) ? firmId : [...ids][0] ?? "",
		size: sizeOf(src.size, fallback.size),
		style: src.style === "limit" ? "limit" : "market",
		discountPct: num$3(src.discountPct, fallback.discountPct, 0, 100),
		buffer: num$3(src.buffer, fallback.buffer, 0, 1e6),
		enabled: typeof src.enabled === "boolean" ? src.enabled : fallback.enabled
	};
}
function sanitizeStore(raw) {
	const fallback = defaultStore();
	if (!raw || typeof raw !== "object") return fallback;
	const src = raw;
	const firms = Array.isArray(src.firms) ? src.firms.map(firmOf).filter((row) => row != null) : [];
	if (!firms.length) return fallback;
	const ids = new Set(firms.map((row) => row.id));
	const cycleRaw = src.cycle && typeof src.cycle === "object" ? src.cycle : {};
	const history = Array.isArray(src.history) ? src.history.filter((row) => !!row && typeof row === "object" && typeof row.text === "string").slice(0, 40) : [];
	return {
		firms,
		cash: num$3(src.cash, fallback.cash, 0, 1e7),
		history,
		cycle: {
			slMovePct: num$3(cycleRaw.slMovePct, 1, .1, 5),
			extraProfit: num$3(cycleRaw.extraProfit, 0, 0, 300),
			funded: slotOf(cycleRaw.funded, fallback.cycle.funded, ids),
			eval1: {
				...slotOf(cycleRaw.eval1, fallback.cycle.eval1, ids),
				enabled: true
			},
			eval2: slotOf(cycleRaw.eval2, fallback.cycle.eval2, ids)
		}
	};
}
function loadStore() {
	if (typeof window === "undefined") return defaultStore();
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY$2);
		if (!raw) return defaultStore();
		return sanitizeStore(JSON.parse(raw));
	} catch {
		return defaultStore();
	}
}
function saveStore(store) {
	window.localStorage.setItem(STORAGE_KEY$2, JSON.stringify(store));
}
/** Round-trip fee as a fraction of notional. Market is two taker fills, limit is maker then taker. */
function roundTripFraction(row, style) {
	return (style === "market" ? 2 * row.takerFee : row.makerFee + row.takerFee) / 100;
}
function blankLeg(name) {
	return {
		firmId: "",
		name,
		platform: "Eigenes System",
		size: 0,
		pos: 0,
		leverage: 0,
		feeUsd: 0,
		rtPct: 0,
		tpMovePct: 0,
		cost: 0,
		ddUsd: 0,
		targetUsd: 0,
		feasible: false,
		style: "market"
	};
}
function quoteEval(row, slot, slPct) {
	const rt = roundTripFraction(row, slot.style);
	const sl = slPct / 100;
	const ddUsd = slot.size * (row.maxDrawdownPct / 100);
	const targetUsd = slot.size * (row.profitTargetPct / 100);
	const denom = sl + rt;
	const feasible = denom > 1e-8 && ddUsd > 0;
	const pos = feasible ? ddUsd / denom : 0;
	const feeUsd = pos * rt;
	const tpMovePct = pos > 0 ? (targetUsd + feeUsd) / pos * 100 : 0;
	const cost = (row.prices[slot.size] ?? 0) * (1 - Math.min(100, Math.max(0, slot.discountPct)) / 100);
	return {
		firmId: row.id,
		name: row.name,
		platform: row.platform,
		size: slot.size,
		pos,
		leverage: slot.size > 0 ? pos / slot.size : 0,
		feeUsd,
		rtPct: rt * 100,
		tpMovePct,
		cost,
		ddUsd,
		targetUsd,
		feasible,
		style: slot.style
	};
}
function quoteCycle(store) {
	const byId = new Map(store.firms.map((row) => [row.id, row]));
	const sl = store.cycle.slMovePct;
	const evals = [store.cycle.eval1, store.cycle.eval2.enabled ? store.cycle.eval2 : null].map((slot, index) => {
		if (!slot) return null;
		const row = byId.get(slot.firmId);
		if (!row) return {
			...blankLeg(`Eval ${index + 1}`),
			name: "Firma fehlt"
		};
		return quoteEval(row, slot, sl);
	}).filter((row) => row != null);
	const totalCost = evals.reduce((sum, row) => sum + row.cost, 0);
	const maxTpMovePct = evals.reduce((max, row) => Math.max(max, row.feasible ? row.tpMovePct : 0), 0);
	const fundedFirm = byId.get(store.cycle.funded.firmId);
	const fundedSlot = store.cycle.funded;
	const neededNet = totalCost + store.cycle.extraProfit;
	let funded = {
		...blankLeg(fundedFirm?.name ?? "Funded"),
		neededNet,
		neededGross: 0,
		loss: 0,
		remaining: 0,
		buffer: fundedSlot.buffer
	};
	if (fundedFirm) {
		const rt = roundTripFraction(fundedFirm, fundedSlot.style);
		const slFrac = sl / 100;
		const split = fundedFirm.profitSplit / 100;
		const neededGross = split > 0 ? neededNet / split : 0;
		const denom = slFrac - rt;
		const feasible = denom > 1e-8 && neededGross >= 0;
		const pos = feasible ? neededGross / denom : 0;
		const feeUsd = pos * rt;
		const loss = pos * (maxTpMovePct / 100 + rt);
		const buffer = fundedSlot.buffer;
		funded = {
			firmId: fundedFirm.id,
			name: fundedFirm.name,
			platform: fundedFirm.platform,
			size: fundedSlot.size,
			pos,
			leverage: fundedSlot.size > 0 ? pos / fundedSlot.size : 0,
			feeUsd,
			rtPct: rt * 100,
			tpMovePct: maxTpMovePct,
			cost: 0,
			ddUsd: fundedSlot.size * (fundedFirm.maxDrawdownPct / 100),
			targetUsd: 0,
			feasible,
			style: fundedSlot.style,
			neededNet,
			neededGross,
			loss,
			remaining: buffer - loss,
			buffer
		};
	}
	return {
		evals,
		funded,
		maxTpMovePct,
		totalCost,
		warnings: collisions(store)
	};
}
function collisions(store) {
	const byId = new Map(store.firms.map((row) => [row.id, row]));
	const slots = [
		{
			label: "Funded",
			slot: store.cycle.funded
		},
		{
			label: "Eval 1",
			slot: store.cycle.eval1
		},
		store.cycle.eval2.enabled ? {
			label: "Eval 2",
			slot: store.cycle.eval2
		} : null
	].filter((row) => row != null);
	const out = [];
	for (let i = 0; i < slots.length; i += 1) for (let j = i + 1; j < slots.length; j += 1) {
		const a = slots[i];
		const b = slots[j];
		if (!a || !b) continue;
		if (a.slot.firmId && a.slot.firmId === b.slot.firmId) {
			const name = byId.get(a.slot.firmId)?.name ?? "dieselbe Firma";
			out.push({
				tone: "red",
				text: `Achtung: ${a.label} und ${b.label} sind beide ${name}. Niemals zwei Konten desselben Hedges bei derselben Prop-Firm eröffnen.`
			});
		}
	}
	const seen = /* @__PURE__ */ new Map();
	for (const row of slots) {
		const firmRow = byId.get(row.slot.firmId);
		if (!firmRow) continue;
		const names = seen.get(firmRow.platform) ?? [];
		if (!names.includes(firmRow.name)) names.push(firmRow.name);
		seen.set(firmRow.platform, names);
	}
	for (const [platform, names] of seen) {
		if (names.length < 2) continue;
		const distinctFirms = slots.filter((row) => byId.get(row.slot.firmId)?.platform === platform);
		if (new Set(distinctFirms.map((row) => row.slot.firmId)).size < 2) continue;
		out.push({
			tone: "yellow",
			text: `${names.join(" und ")} nutzen ${platform}. Zwingend getrennte Geräte und IPs (PC-WLAN gegen Smartphone-5G) und 45 Sekunden Zeitversatz.`
		});
	}
	return out;
}
/** ±1% and then off any round hundred, so the order book does not show a copier size. */
function fuzzNotional(notional, salt) {
	if (!(notional > 0)) return 0;
	const factor = .99 + (salt % 1 + 1) % 1 * .02;
	let next = Math.round(notional * factor * 100) / 100;
	if (Math.round(next) % 50 === 0) next += 7.37 + Math.round(salt * 17) % 9;
	return Math.round(next * 100) / 100;
}
function blankFirm() {
	return firm(`firm-${Date.now()}`, "Neue Firma", "Eigenes System", 0, 0);
}
function freshBuffer(row, size) {
	return Math.round(size * (row.maxDrawdownPct / 100) * 100) / 100;
}
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
function FirmDesk() {
	const [store, setStore] = (0, import_react.useState)(null);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [fuzz, setFuzz] = (0, import_react.useState)(null);
	const [note, setNote] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		setStore(loadStore());
	}, []);
	(0, import_react.useEffect)(() => {
		if (!store) return;
		saveStore(store);
	}, [store]);
	const quote = (0, import_react.useMemo)(() => store ? quoteCycle(store) : null, [store]);
	if (!store || !quote) return null;
	const patch = (next) => {
		setFuzz(null);
		setNote("");
		setStore(next);
	};
	const updateFirm = (id, partial) => {
		patch({
			...store,
			firms: store.firms.map((row) => row.id === id ? {
				...row,
				...partial
			} : row)
		});
	};
	const setSlot = (key, partial) => {
		patch({
			...store,
			cycle: {
				...store.cycle,
				[key]: {
					...store.cycle[key],
					...partial
				}
			}
		});
	};
	const rotate = (kind) => {
		if (kind === "fail") {
			const gain = store.cycle.extraProfit;
			const row = {
				id: `h-${Date.now()}`,
				at: (/* @__PURE__ */ new Date()).toISOString(),
				kind: "fail",
				cashDelta: gain,
				text: `Evals gestorben bei +${store.cycle.slMovePct.toFixed(2)}%. Over-Hedge ${fmtUsd(gain, true)} aufs Cash.`
			};
			patch({
				...store,
				cash: store.cash + gain,
				history: [row, ...store.history].slice(0, 40)
			});
			setNote(row.text);
			return;
		}
		const ids = [
			store.cycle.funded.firmId,
			store.cycle.eval1.firmId,
			store.cycle.eval2.enabled ? store.cycle.eval2.firmId : ""
		].filter(Boolean);
		if (new Set(ids).size !== ids.length) {
			setNote("Rotation blockiert: dieselbe Firma sitzt in zwei Slots.");
			return;
		}
		const statusFor = (id) => {
			if (id === store.cycle.funded.firmId) return "Cooldown / Wartet auf Payout";
			if (id === store.cycle.eval1.firmId) return "Aktiver Kloner (Funded)";
			if (store.cycle.eval2.enabled && id === store.cycle.eval2.firmId) return "Cash-Kuh (Trader)";
			return null;
		};
		const firms = store.firms.map((row) => {
			const status = statusFor(row.id);
			return status ? {
				...row,
				status
			} : row;
		});
		const text = "Evals bestanden. Funded auf Cooldown, Eval 1 ist der neue Kloner, Eval 2 die Cash-Kuh.";
		const row = {
			id: `h-${Date.now()}`,
			at: (/* @__PURE__ */ new Date()).toISOString(),
			kind: "pass",
			cashDelta: 0,
			text
		};
		patch({
			...store,
			firms,
			history: [row, ...store.history].slice(0, 40)
		});
		setNote(text);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto w-full max-w-5xl px-3 py-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold",
					children: "Firmen-Hedge"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 max-w-3xl text-sm text-muted",
					children: "Beide Evals sterben beim selben Kurs-Move. Die Positionsgröße ist der Drawdown geteilt durch Move plus Round-Trip-Fee der jeweiligen Firma. Das Funded ist so groß, dass nach Fee und Split die Eval-Kosten plus der Over-Hedge übrig bleiben."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FirmManager, {
				store,
				editing,
				onEdit: setEditing,
				onChange: updateFirm,
				onAdd: () => {
					const row = blankFirm();
					patch({
						...store,
						firms: [...store.firms, row]
					});
					setEditing(row.id);
				},
				onDelete: (id) => {
					const firms = store.firms.filter((row) => row.id !== id);
					if (!firms.length) return;
					const fallback = firms[0]?.id ?? "";
					const fix = (slot) => ({
						...slot,
						firmId: slot.firmId === id ? fallback : slot.firmId
					});
					patch({
						...store,
						firms,
						cycle: {
							...store.cycle,
							funded: fix(store.cycle.funded),
							eval1: fix(store.cycle.eval1),
							eval2: fix(store.cycle.eval2)
						}
					});
					if (editing === id) setEditing(null);
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-3 card p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: `SL-Move ${store.cycle.slMovePct.toFixed(2)}%`,
							min: .2,
							max: 3,
							step: .05,
							value: store.cycle.slMovePct,
							onChange: (slMovePct) => patch({
								...store,
								cycle: {
									...store.cycle,
									slMovePct
								}
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: `Over-Hedge ${fmtUsd(store.cycle.extraProfit)}`,
							min: 0,
							max: 300,
							step: 5,
							value: store.cycle.extraProfit,
							onChange: (extraProfit) => patch({
								...store,
								cycle: {
									...store.cycle,
									extraProfit
								}
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block text-xs text-muted",
							children: ["Cash-Bestand", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								min: 0,
								step: 10,
								className: cn(fieldClass, "mt-1"),
								value: store.cash,
								onChange: (event) => patch({
									...store,
									cash: numberOr$1(event.target.value)
								})
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid gap-3 lg:grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotCard, {
							title: "Funded · Kloner, long",
							firms: store.firms,
							slot: store.cycle.funded,
							kind: "funded",
							onChange: (partial) => setSlot("funded", partial)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotCard, {
							title: "Eval 1 · short",
							firms: store.firms,
							slot: store.cycle.eval1,
							kind: "eval",
							onChange: (partial) => setSlot("eval1", partial)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotCard, {
							title: "Eval 2 · short",
							firms: store.firms,
							slot: store.cycle.eval2,
							kind: "eval",
							optional: true,
							onChange: (partial) => setSlot("eval2", partial)
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WarningPanel, { quote }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-3 grid gap-3 lg:grid-cols-3",
				children: [quote.evals.map((leg, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultCard, {
					kicker: `Eval ${index + 1}`,
					leg
				}, `${leg.firmId}-${index}`)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FundedCard, { quote })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-3 card p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-sm font-semibold",
							children: "Tarn-Größen"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => {
								const salts = [
									Math.random(),
									Math.random(),
									Math.random()
								];
								setFuzz([fuzzNotional(quote.funded.pos, salts[0] ?? 0), ...quote.evals.map((leg, index) => fuzzNotional(leg.pos, salts[index + 1] ?? Math.random()))]);
							},
							children: "Tarn-Größen ±1%"
						})]
					}),
					fuzz ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-mono text-sm tabular-nums",
						children: [
							"Funded ",
							fmtUsd(fuzz[0] ?? 0),
							quote.evals.map((leg, index) => ` · Eval ${index + 1} ${fmtUsd(fuzz[index + 1] ?? 0)}`)
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: "Glatt gerechnet steht oben. Der Button verkrümmt die Größen, damit keine runde Copier-Summe im Buch steht."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							tone: "sell",
							onClick: () => rotate("fail"),
							children: [
								"Evals gestorben (+",
								store.cycle.slMovePct.toFixed(2),
								"%)"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							tone: "buy",
							onClick: () => rotate("pass"),
							children: "Evals bestanden, Rotation"
						})]
					}),
					note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm",
						children: note
					}) : null,
					store.history.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3 space-y-1 text-sm text-muted",
						children: store.history.slice(0, 6).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
							new Date(row.at).toLocaleString("de-DE"),
							" · ",
							row.text
						] }, row.id))
					}) : null
				]
			})
		]
	});
}
function FirmManager({ store, editing, onEdit, onChange, onAdd, onDelete }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "card p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-semibold",
				children: "Meine Prop-Firms"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				tone: "accent",
				onClick: onAdd,
				children: "Firma dazu"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 grid gap-2",
			children: store.firms.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "rounded-xl bg-bg p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-start justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: row.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted",
							children: [
								row.platform,
								" · Maker ",
								fmtPct$1(row.makerFee),
								" · Taker ",
								fmtPct$1(row.takerFee),
								" · Split ",
								row.profitSplit,
								"% · DD ",
								row.maxDrawdownPct,
								"%"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: cn("text-xs", statusTone(row.status)),
							children: row.status
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => onEdit(editing === row.id ? null : row.id),
							children: editing === row.id ? "Zu" : "Bearbeiten"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => onDelete(row.id),
							children: "Weg"
						})]
					})]
				}), editing === row.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FirmForm, {
					firm: row,
					onChange: (partial) => onChange(row.id, partial)
				}) : null]
			}, row.id))
		})]
	});
}
function FirmForm({ firm, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-3 grid gap-3 sm:grid-cols-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Name",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: fieldClass,
					value: firm.name,
					onChange: (event) => onChange({ name: event.target.value })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Plattform",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: fieldClass,
					value: firm.platform,
					onChange: (event) => onChange({ platform: event.target.value }),
					children: PLATFORMS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: item }, item))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Maker % pro Fill",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "number",
					min: 0,
					step: .001,
					className: fieldClass,
					value: firm.makerFee,
					onChange: (event) => onChange({ makerFee: numberOr$1(event.target.value) })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Taker % pro Fill",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "number",
					min: 0,
					step: .001,
					className: fieldClass,
					value: firm.takerFee,
					onChange: (event) => onChange({ takerFee: numberOr$1(event.target.value) })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Profit Split %",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "number",
					min: 1,
					max: 100,
					step: 1,
					className: fieldClass,
					value: firm.profitSplit,
					onChange: (event) => onChange({ profitSplit: numberOr$1(event.target.value) })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Max Drawdown %",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "number",
					min: .1,
					step: .1,
					className: fieldClass,
					value: firm.maxDrawdownPct,
					onChange: (event) => onChange({ maxDrawdownPct: numberOr$1(event.target.value) })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Profit Target %",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "number",
					min: .1,
					step: .1,
					className: fieldClass,
					value: firm.profitTargetPct,
					onChange: (event) => onChange({ profitTargetPct: numberOr$1(event.target.value) })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Status",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: fieldClass,
					value: firm.status,
					onChange: (event) => onChange({ status: event.target.value }),
					children: FIRM_STATUSES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: item }, item))
				})
			}),
			ACCOUNT_SIZES$1.map((size) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: `Eval-Preis ${size / 1e3}k`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "number",
					min: 0,
					step: 1,
					className: fieldClass,
					value: firm.prices[size],
					onChange: (event) => onChange({ prices: {
						...firm.prices,
						[size]: numberOr$1(event.target.value)
					} })
				})
			}, size))
		]
	});
}
function SlotCard({ title, firms, slot, kind, optional, onChange }) {
	const firm = firms.find((row) => row.id === slot.firmId);
	const price = firm?.prices[slot.size];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: cn("rounded-xl bg-bg p-3", optional && !slot.enabled && "opacity-60"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-semibold",
					children: title
				}), optional ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "text-xs text-accent",
					onClick: () => onChange({ enabled: !slot.enabled }),
					children: slot.enabled ? "Aus" : "An"
				}) : null]
			}),
			optional && !slot.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-muted",
				children: "Zweiter Eval ist aus."
			}) : null,
			!(optional && !slot.enabled) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 grid gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: fieldClass,
						value: slot.firmId,
						onChange: (event) => {
							const next = firms.find((row) => row.id === event.target.value);
							onChange(next && kind === "funded" ? {
								firmId: event.target.value,
								buffer: freshBuffer(next, slot.size)
							} : { firmId: event.target.value });
						},
						children: firms.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: row.id,
							children: row.name
						}, row.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: fieldClass,
						value: slot.size,
						onChange: (event) => {
							const size = Number(event.target.value);
							onChange(firm && kind === "funded" ? {
								size,
								buffer: freshBuffer(firm, size)
							} : { size });
						},
						children: ACCOUNT_SIZES$1.map((size) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: size,
							children: [
								size / 1e3,
								"k",
								kind === "eval" && firm ? ` · ${fmtUsd(firm.prices[size])}` : ""
							]
						}, size))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: fieldClass,
						value: slot.style,
						onChange: (event) => onChange({ style: event.target.value }),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "market",
							children: "Market + SL/TP (2× Taker)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "limit",
							children: "Limit + SL/TP (Maker + Taker)"
						})]
					}),
					kind === "funded" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-xs text-muted",
						children: ["Restpuffer USD", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							min: 0,
							step: 10,
							className: cn(fieldClass, "mt-1"),
							value: slot.buffer,
							onChange: (event) => onChange({ buffer: numberOr$1(event.target.value) })
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-xs text-muted",
						children: [
							"Rabatt % ",
							price != null ? `· zahlst ${fmtUsd(price * (1 - slot.discountPct / 100))}` : "",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								min: 0,
								max: 100,
								step: 1,
								className: cn(fieldClass, "mt-1"),
								value: slot.discountPct,
								onChange: (event) => onChange({ discountPct: numberOr$1(event.target.value) })
							})
						]
					}),
					firm ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-faint",
						children: [
							firm.status,
							" · RT ",
							fmtPct$1(slot.style === "market" ? 2 * firm.takerFee : firm.makerFee + firm.takerFee)
						]
					}) : null
				]
			}) : null
		]
	});
}
function WarningPanel({ quote }) {
	if (!quote.warnings.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "mt-3 card border-l-2 border-long p-4 text-sm",
		children: "Keine Firmen- oder Plattform-Kollision auf den aktiven Slots."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "mt-3 grid gap-2",
		children: quote.warnings.map((warning) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: cn("card border-l-2 p-4 text-sm", warning.tone === "red" ? "border-short text-short" : "border-preview text-preview"),
			children: warning.text
		}, warning.text))
	});
}
function ResultCard({ kicker, leg }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "card p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				children: kicker
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mt-1 text-sm font-semibold",
				children: leg.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 font-mono text-2xl font-semibold tabular-nums",
				children: leg.feasible ? fmtUsd(leg.pos) : "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-2 space-y-1 text-sm text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Hebel ", leg.feasible ? `${leg.leverage.toFixed(2)}×` : "Fee schluckt den Move"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						"Round-Trip ",
						fmtPct$1(leg.rtPct),
						" · Fee ",
						fmtUsd(leg.feeUsd)
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Bis Target nach Fee ", leg.feasible ? `${leg.tpMovePct.toFixed(2)}%` : "—"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Eval-Kosten ", fmtUsd(leg.cost)] })
				]
			})
		]
	});
}
function FundedCard({ quote }) {
	const leg = quote.funded;
	const alive = leg.feasible && leg.remaining >= 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "card p-4 lg:col-span-1",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				children: "Funded"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mt-1 text-sm font-semibold",
				children: leg.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 font-mono text-2xl font-semibold tabular-nums",
				children: leg.feasible ? fmtUsd(leg.pos) : "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-2 space-y-1 text-sm text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Hebel ", leg.feasible ? `${leg.leverage.toFixed(2)}×` : "Fee größer als der SL-Move"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						"Brutto nötig ",
						fmtUsd(leg.neededGross),
						" · Fee ",
						fmtUsd(leg.feeUsd)
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						"Verlust wenn Evals durchlaufen ",
						fmtUsd(leg.loss),
						" bei ",
						quote.maxTpMovePct.toFixed(2),
						"%"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: alive ? "text-long" : "text-short",
						children: [
							"Restpuffer ",
							leg.feasible ? fmtUsd(leg.remaining, true) : "—",
							" von ",
							fmtUsd(leg.buffer)
						]
					})
				]
			})
		]
	});
}
function Slider({ label, min, max, step, value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-xs text-muted",
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "range",
			min,
			max,
			step,
			value,
			className: "mt-3 w-full accent-accent",
			onChange: (event) => onChange(numberOr$1(event.target.value))
		})]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-xs text-muted",
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1",
			children
		})]
	});
}
function statusTone(status) {
	if (status.startsWith("Aktiver")) return "text-accent";
	if (status.startsWith("Cash")) return "text-long";
	if (status.startsWith("Cooldown") || status.startsWith("Im Eval")) return "text-preview";
	return "text-faint";
}
function fmtPct$1(n) {
	return `${n.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 3
	})}%`;
}
function numberOr$1(value) {
	const next = value === "" ? 0 : Number(value);
	return Number.isFinite(next) ? next : 0;
}
var HEDGE_STORAGE_KEY = "position-builder.hedge.v2";
var HEDGE_DEFAULTS = {
	evalSize: 25e3,
	evalPrice: 95,
	numEvals: 2,
	evalLeverage: 3,
	fundedSize: 25e3,
	numFunded: 1,
	mode: "optimal",
	manualNotional: 23750,
	targetPct: 9,
	ddPct: 3,
	splitPct: 80
};
var NUMBER_KEYS = [
	"evalSize",
	"evalPrice",
	"numEvals",
	"evalLeverage",
	"fundedSize",
	"numFunded",
	"manualNotional",
	"targetPct",
	"ddPct",
	"splitPct"
];
function sanitizeHedge(raw) {
	if (!raw || typeof raw !== "object") return { ...HEDGE_DEFAULTS };
	const src = raw;
	const next = { ...HEDGE_DEFAULTS };
	for (const key of NUMBER_KEYS) {
		const value = src[key];
		if (typeof value === "number" && Number.isFinite(value)) next[key] = value;
	}
	if (src.mode === "manual" || src.mode === "optimal") next.mode = src.mode;
	return next;
}
function finite(value, fallback) {
	return Number.isFinite(value) ? value : fallback;
}
/**
* Eval accounts are short, funded accounts are long.
* Fail move = drawdown / eval leverage. Pass move = target / eval leverage.
* Optimal funded notional makes the fail payout equal the eval fees.
*/
function optimizeHedge(raw) {
	const numEvals = Math.max(1, Math.round(finite(raw.numEvals, 1)));
	const evalSize = Math.max(0, finite(raw.evalSize, 0));
	const evalPrice = Math.max(0, finite(raw.evalPrice, 0));
	const evalLeverage = Math.max(.1, finite(raw.evalLeverage, 1));
	const fundedSize = Math.max(0, finite(raw.fundedSize, 0));
	const numFunded = Math.max(1, Math.round(finite(raw.numFunded, 1)));
	const targetPct = Math.max(0, finite(raw.targetPct, 0));
	const ddPct = Math.max(0, finite(raw.ddPct, 0));
	const split = Math.min(1, Math.max(.01, finite(raw.splitPct, 80) / 100));
	const mode = raw.mode === "manual" ? "manual" : "optimal";
	const totalCost = numEvals * evalPrice;
	const evalNotional = evalSize * evalLeverage;
	const cNotional = evalNotional * numEvals;
	const adverse = ddPct / 100 / evalLeverage;
	const favorable = targetPct / 100 / evalLeverage;
	let fNotional;
	if (mode === "optimal") {
		const denom = adverse * split;
		fNotional = denom > 0 ? totalCost / denom : 0;
	} else fNotional = Math.max(0, finite(raw.manualNotional, 0)) * numFunded;
	const fundedNotionalPer = fNotional / numFunded;
	const fundedLeverage = fundedSize > 0 ? fundedNotionalPer / fundedSize : 0;
	const fundedGrossAtFail = fNotional * adverse;
	const payoutAtFail = fundedGrossAtFail * split;
	const netFail = payoutAtFail - totalCost;
	const fundedLossAtPass = fNotional * favorable;
	const totalDDRoom = numFunded * fundedSize * (ddPct / 100);
	const equity = numFunded * fundedSize;
	const ddUsagePct = equity > 0 ? fundedLossAtPass / equity * 100 : 0;
	const fundedSurvives = ddUsagePct < ddPct;
	const span = favorable + adverse;
	const pPass = span > 0 ? adverse / span : 0;
	const warnings = [];
	if (!fundedSurvives) warnings.push("funded-dies");
	else if (ddPct > 0 && ddUsagePct > ddPct * .8) warnings.push("dd-tight");
	if (adverse * 100 < .4) warnings.push("tiny-move");
	if (mode === "manual" && netFail < -1) warnings.push("fail-short");
	return {
		mode,
		numEvals,
		numFunded,
		evalSize,
		fundedSize,
		evalNotional,
		cNotional,
		evalLeverage,
		adverseMovePct: adverse * 100,
		favorableMovePct: favorable * 100,
		fundedNotionalPer,
		fNotional,
		fundedLeverage,
		totalCost,
		fundedGrossAtFail,
		payoutAtFail,
		netFail,
		fundedLossAtPass,
		totalDDRoom,
		ddUsagePct,
		ddLimitPct: ddPct,
		fundedSurvives,
		pPass,
		pFail: 1 - pPass,
		split,
		targetPct,
		warnings
	};
}
/** Account P&L across the move. Trader cash on the way up is the funded split minus the eval fees. */
function hedgeCurve(plan) {
	const span = Math.min(12, Math.max(plan.adverseMovePct, plan.favorableMovePct, .8) * 2.2);
	const n = 81;
	const moves = /* @__PURE__ */ new Set();
	for (let i = 0; i < n; i++) moves.add(Math.round((-span + 2 * span * i / 80) * 1e3) / 1e3);
	for (const anchor of [
		-plan.favorableMovePct,
		0,
		plan.adverseMovePct
	]) if (Math.abs(anchor) <= span + .05) moves.add(Math.round(anchor * 1e3) / 1e3);
	return [...moves].sort((a, b) => a - b).map((move) => {
		const x = move / 100;
		const challenge = -plan.cNotional * x;
		const funded = plan.fNotional * x;
		const trader = move >= 0 ? funded * plan.split - plan.totalCost : challenge + funded;
		return {
			move,
			challenge,
			funded,
			net: challenge + funded,
			trader
		};
	});
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
function clean(input) {
	if (!input || typeof input !== "object") throw new Error("bad request");
	const src = input;
	const apiKey = typeof src.apiKey === "string" ? src.apiKey.trim() : "";
	const question = typeof src.question === "string" ? src.question.trim() : "";
	const context = typeof src.context === "string" ? src.context.trim() : "";
	if (apiKey.length < 12 || apiKey.length > 200) throw new Error("API-Key fehlt oder ist ungültig.");
	if (question.length < 2 || question.length > 2e3) throw new Error("Frage ist leer oder zu lang.");
	if (context.length > 6e3) throw new Error("Kontext ist zu groß.");
	return {
		apiKey,
		question,
		context
	};
}
var askHydra = createServerFn({ method: "POST" }).validator(clean).handler(createSsrRpc("6fca57093f3beb8b20e58f64786cdbeeeae2910ede8f7b073df450eaaabc46fd"));
var FAIL_MOVE = .01;
var PASS_MOVE = .03;
var SPLIT = .8;
/** Taker round-trip on the funded position. */
var FEE_RATE = 8e-4;
var FRESH_DD = .03;
/**
* Payout covers the eval cost and the trading fee after the 80% split.
* Fee is cash, so it is not added to the drawdown a second time.
* N = cost / (0.01 * 0.80 - 0.0008)
*/
var ZERO_DENOM = FAIL_MOVE * SPLIT - FEE_RATE;
var EVAL_PRODUCTS = [
	{
		size: 5e3,
		price: 20
	},
	{
		size: 1e4,
		price: 40
	},
	{
		size: 25e3,
		price: 95
	},
	{
		size: 5e4,
		price: 180
	},
	{
		size: 1e5,
		price: 330
	}
];
var COMBOS = [
	{
		id: "1x5",
		legs: [{
			size: 5e3,
			count: 1
		}]
	},
	{
		id: "2x5",
		legs: [{
			size: 5e3,
			count: 2
		}]
	},
	{
		id: "1x10",
		legs: [{
			size: 1e4,
			count: 1
		}]
	},
	{
		id: "10+5",
		legs: [{
			size: 1e4,
			count: 1
		}, {
			size: 5e3,
			count: 1
		}]
	},
	{
		id: "2x10",
		legs: [{
			size: 1e4,
			count: 2
		}]
	},
	{
		id: "1x25",
		legs: [{
			size: 25e3,
			count: 1
		}]
	},
	{
		id: "25+10",
		legs: [{
			size: 25e3,
			count: 1
		}, {
			size: 1e4,
			count: 1
		}]
	},
	{
		id: "2x25",
		legs: [{
			size: 25e3,
			count: 2
		}]
	},
	{
		id: "1x50",
		legs: [{
			size: 5e4,
			count: 1
		}]
	},
	{
		id: "2x50",
		legs: [{
			size: 5e4,
			count: 2
		}]
	},
	{
		id: "1x100",
		legs: [{
			size: 1e5,
			count: 1
		}]
	},
	{
		id: "2x100",
		legs: [{
			size: 1e5,
			count: 2
		}]
	}
];
var LADDER = [
	5e3,
	1e4,
	25e3,
	5e4,
	1e5
];
function productPrice(size) {
	const row = EVAL_PRODUCTS.find((item) => item.size === size);
	return row ? row.price : 0;
}
function comboLabel(legs) {
	return legs.map((leg) => `${leg.count}× ${formatK(leg.size)}`).join(" + ");
}
function formatK(size) {
	if (size >= 1e3 && size % 1e3 === 0) return `${size / 1e3}k`;
	return String(size);
}
function listCost(legs) {
	return legs.reduce((sum, leg) => sum + productPrice(leg.size) * leg.count, 0);
}
function evalNotional(legs) {
	return legs.reduce((sum, leg) => sum + leg.size * leg.count * 3, 0);
}
/** Fee-ignorant hedge: payout equals the eval cost, fee is not in the size. */
function classicNotional(cost) {
	if (!(cost > 0)) return 0;
	return cost / SPLIT / FAIL_MOVE;
}
function finish(id, legs, notional, accounts, cash, discountPct) {
	const grossList = listCost(legs);
	const cost = grossList * (1 - Math.min(.2, Math.max(0, discountPct / 100)));
	const fees = notional * FEE_RATE;
	const gross = notional * FAIL_MOVE;
	const payout = gross * SPLIT;
	const net = payout - cost - fees;
	const passLoss = notional * PASS_MOVE;
	const rest = accounts.reduce((sum, account) => sum + Math.max(0, account.buffer), 0) - passLoss;
	const allocations = allocate(accounts, notional);
	return {
		id,
		legs,
		label: comboLabel(legs),
		listCost: grossList,
		cost,
		evalNotional: evalNotional(legs),
		fundedNotional: notional,
		fees,
		gross,
		payout,
		net,
		passLoss,
		rest,
		feeSafe: rest >= -.05 && notional > 0 && cost > 0,
		affordable: cost <= cash + .05,
		allocations,
		shorts: legs.map((leg) => ({
			size: leg.size,
			count: leg.count,
			notional: leg.size * leg.count * 3
		}))
	};
}
function allocate(accounts, notional) {
	const live = accounts.filter((account) => account.buffer > 0 && account.size > 0);
	const buffer = live.reduce((sum, account) => sum + account.buffer, 0);
	return live.map((account) => {
		const leg = notional * (buffer > 0 ? account.buffer / buffer : 0);
		const passLoss = leg * PASS_MOVE;
		return {
			id: account.id,
			size: account.size,
			buffer: account.buffer,
			notional: leg,
			leverage: account.size > 0 ? leg / account.size : 0,
			passLoss,
			bufferAfter: account.buffer - passLoss
		};
	});
}
/** Zero-loss size: payout − cost − fee = 0, drawdown is the price move only. */
function quote(legs, accounts, cash, discountPct, id = "q") {
	return finish(id, legs, listCost(legs) * (1 - Math.min(.2, Math.max(0, discountPct / 100))) / ZERO_DENOM, accounts, cash, discountPct);
}
function quoteClassic(legs, accounts, cash, discountPct, id) {
	return finish(id, legs, classicNotional(listCost(legs) * (1 - Math.min(.2, Math.max(0, discountPct / 100)))), accounts, cash, discountPct);
}
function bySize(a, b) {
	return b.evalNotional - a.evalNotional || a.cost - b.cost;
}
function largestSafe(plans) {
	return plans.filter((plan) => plan.feeSafe && plan.affordable).sort(bySize)[0] ?? null;
}
function attackLegs(accounts) {
	const biggest = accounts.reduce((max, account) => Math.max(max, account.size), 0);
	if (!productPrice(biggest)) return null;
	return [{
		size: biggest,
		count: 2
	}];
}
function discountThatFits(legs, accounts, cash) {
	for (let pct = 0; pct <= 20; pct += 1) if (quote(legs, accounts, Math.max(cash, listCost(legs)), pct, "disc").feeSafe) return pct;
	return null;
}
function buildAttack(accounts, cash, discountPct) {
	const legs = attackLegs(accounts);
	if (!legs) return null;
	const plan = quote(legs, accounts, cash, discountPct, "attack");
	const classic = quoteClassic(legs, accounts, cash, discountPct, "attack-classic");
	const buffer = accounts.reduce((sum, account) => sum + Math.max(0, account.buffer), 0);
	const unusedBeforeFee = buffer - classic.passLoss;
	let stopMovePct = null;
	let stopLossUsd = null;
	let evalGainPct = null;
	if (!plan.feeSafe && classic.fundedNotional > 0) {
		const room = buffer - classic.fees;
		if (room > 0) {
			const move = Math.min(PASS_MOVE, room / classic.fundedNotional);
			stopMovePct = move * 100;
			stopLossUsd = classic.fundedNotional * move;
			evalGainPct = move * 3 * 100;
		}
	}
	const needed = plan.feeSafe ? null : discountThatFits(legs, accounts, cash);
	return {
		plan,
		classic,
		fits: plan.feeSafe && plan.affordable,
		discountNeededPct: needed,
		stopMovePct,
		stopLossUsd,
		evalGainPct,
		unusedBeforeFee
	};
}
function buildPrinter(plans, accounts, cash, discountPct, floorNotional) {
	const buffer = accounts.reduce((sum, account) => sum + Math.max(0, account.buffer), 0);
	if (buffer <= 150 || floorNotional <= 0) return null;
	const pick = plans.map((plan) => {
		const classic = quoteClassic(plan.legs, accounts, cash, discountPct, plan.id);
		return {
			plan,
			classic,
			unused: buffer - classic.passLoss
		};
	}).filter((row) => row.plan.evalNotional >= floorNotional && row.classic.affordable && row.unused > 150).sort((a, b) => b.plan.evalNotional - a.plan.evalNotional)[0];
	if (!pick) return null;
	const scaledNotional = (buffer - 150) / PASS_MOVE;
	const scaled = finish(pick.plan.id, pick.plan.legs, scaledNotional, accounts, cash, discountPct);
	const cashBeforeFee = scaled.payout - scaled.cost;
	if (!(cashBeforeFee > 1)) return null;
	return {
		base: pick.classic,
		scaled,
		unused: pick.unused,
		cashBeforeFee
	};
}
function buildBridge(plans, accounts) {
	if (accounts.length < 2) return {
		plan: null,
		reason: "Zum Bündeln brauchst du mindestens zwei Funded-Konten. Mit einem Konto ist das der normale Safe-Play."
	};
	const biggest = accounts.reduce((max, account) => Math.max(max, account.size), 0);
	const next = LADDER.find((size) => size > biggest);
	if (!next) return {
		plan: null,
		reason: "Du sitzt schon auf der größten Stufe. Der nächste Schritt ist auscashen, nicht mehr bündeln."
	};
	const exact = plans.find((plan) => plan.legs.length === 1 && plan.legs[0]?.size === next && plan.legs[0]?.count === 1);
	if (exact?.feeSafe && exact.affordable) return {
		plan: exact,
		reason: `Beide Konten zusammen hebeln die nächste Stufe, 1× ${formatK(next)}.`
	};
	const fallback = plans.filter((plan) => plan.feeSafe && plan.affordable && plan.legs.some((leg) => leg.size >= next)).sort(bySize)[0];
	if (fallback) return {
		plan: fallback,
		reason: `1× ${formatK(next)} passt nicht in den Puffer. Das hier ist die größte Stufe, die beide Konten noch tragen.`
	};
	return {
		plan: null,
		reason: `1× ${formatK(next)} frisst mehr Drawdown, als beide Konten zusammen noch haben.`
	};
}
function advise(inventory) {
	const accounts = inventory.accounts.filter((account) => account.size > 0);
	const cash = Math.max(0, inventory.cash);
	const discountPct = Math.min(20, Math.max(0, inventory.discountPct));
	const buffer = accounts.reduce((sum, account) => sum + Math.max(0, account.buffer), 0);
	const plans = COMBOS.map((combo) => quote(combo.legs, accounts, cash, discountPct, combo.id));
	const safe = largestSafe(plans);
	const printer = accounts.length ? buildPrinter(plans, accounts, cash, discountPct, safe?.evalNotional ?? 0) : null;
	const bridge = buildBridge(plans, accounts);
	const attack = accounts.length ? buildAttack(accounts, cash, discountPct) : null;
	const road = roadmap(accounts, cash, discountPct);
	return {
		buffer,
		plans,
		safe,
		printer,
		bridge: bridge.plan,
		bridgeReason: bridge.reason,
		attack,
		steps: road.steps,
		roadmapNote: road.note
	};
}
function pickRoad(plans, accounts) {
	const maxSize = accounts.reduce((max, account) => Math.max(max, account.size), 0);
	const equity = accounts.reduce((sum, account) => sum + account.size, 0);
	const safe = plans.filter((plan) => plan.feeSafe && plan.affordable);
	if (maxSize >= 1e5) {
		if (accounts.filter((account) => account.size >= 1e5 && account.buffer > 50).length < 2) {
			const more = safe.filter((plan) => plan.legs.some((leg) => leg.size >= 1e5)).sort(bySize);
			if (more[0]) return {
				plan: more[0],
				blocked: null
			};
			return {
				plan: null,
				blocked: plans.filter((plan) => plan.legs.some((leg) => leg.size >= 1e5)).sort((a, b) => a.cost - b.cost)[0] ?? null
			};
		}
	}
	const upgrade = safe.filter((plan) => plan.legs.some((leg) => leg.size > maxSize)).sort(bySize);
	if (upgrade[0]) return {
		plan: upgrade[0],
		blocked: null
	};
	const scale = safe.filter((plan) => plan.legs.reduce((sum, leg) => sum + leg.size * leg.count, 0) > equity).sort(bySize);
	if (scale[0]) return {
		plan: scale[0],
		blocked: null
	};
	return {
		plan: null,
		blocked: plans.filter((plan) => plan.legs.some((leg) => leg.size > maxSize)).sort((a, b) => a.cost - b.cost)[0] ?? null
	};
}
function roadmap(start, cash, discountPct) {
	let accounts = start.map((account) => ({ ...account }));
	let wallet = cash;
	const steps = [];
	const seen = /* @__PURE__ */ new Set();
	if (!accounts.length) return {
		steps,
		note: "Ohne Funded-Konto gibt es keine Stufe. Zuerst ein Konto eintragen."
	};
	for (let index = 1; index <= 8; index += 1) {
		if (accounts.filter((account) => account.size >= 1e5 && account.buffer > 50).length >= 2) return {
			steps,
			note: "Endstufe: 2× 100k Funded. Konto 1 klont weiter, Konto 2 bleibt flach und casht aus."
		};
		const picked = pickRoad(COMBOS.map((combo) => quote(combo.legs, accounts, wallet, discountPct, combo.id)), accounts);
		if (!picked.plan) {
			const blocked = picked.blocked;
			if (!blocked) return {
				steps,
				note: "Keine größere Stufe ist definiert."
			};
			const shortCash = Math.max(0, blocked.cost - wallet);
			const name = accounts.some((account) => account.size >= 1e5) ? `ein weiteres ${blocked.label}` : blocked.label;
			return {
				steps,
				note: [shortCash > .5 ? `Für ${name} fehlen ${Math.ceil(shortCash)} USD Cash (Kauf ${Math.ceil(blocked.cost)}, Wallet ${Math.floor(wallet)}). Ein Fail zahlt die Eval-Kosten zurück.` : null, !blocked.feeSafe ? `${name} passt nicht in den Restpuffer (${Math.round(blocked.rest)} USD).` : null].filter(Boolean).join(" ") || "Hier endet der Baum."
			};
		}
		const next = picked.plan;
		const key = `${next.id}:${accounts.map((account) => `${account.size}@${Math.round(account.buffer)}`).join(",")}`;
		if (seen.has(key)) return {
			steps,
			note: "Dieselbe Stufe würde sich wiederholen. Hier ist Schluss, sonst dreht sich der Baum im Kreis."
		};
		seen.add(key);
		const survivors = next.allocations.map((leg) => ({
			size: leg.size,
			buffer: leg.bufferAfter
		})).filter((leg) => leg.buffer > 1);
		const spawned = next.legs.flatMap((leg) => Array.from({ length: leg.count }, () => ({
			size: leg.size,
			buffer: leg.size * FRESH_DD
		})));
		wallet -= next.cost;
		const merged = [...survivors.map((leg, i) => ({
			id: `s-${index}-${i}`,
			size: leg.size,
			buffer: leg.buffer
		})), ...spawned.map((leg, i) => ({
			id: `n-${index}-${i}`,
			size: leg.size,
			buffer: leg.buffer
		}))];
		const reachesEnd = merged.filter((account) => account.size >= 1e5 && account.buffer > 50).length >= 2;
		steps.push({
			index,
			plan: next,
			cashAfter: wallet,
			spawned,
			survivors,
			reachesEnd
		});
		accounts = merged;
		if (reachesEnd) return {
			steps,
			note: "Endstufe erreicht: 2× 100k Funded. Konto 1 klont weiter, Konto 2 bleibt flach und casht aus."
		};
	}
	return {
		steps,
		note: "Nach 8 Stufen ist die 100k-Endstufe noch nicht da. Puffer oder Cash limitieren den Baum."
	};
}
function toHedgeInputs(plan) {
	const evalSize = plan.legs.reduce((sum, leg) => sum + leg.size * leg.count, 0);
	const same = plan.allocations.length > 0 && plan.allocations.every((leg) => leg.size === plan.allocations[0]?.size);
	const numFunded = same ? plan.allocations.length : 1;
	const fundedSize = same ? plan.allocations[0]?.size ?? 0 : plan.allocations.reduce((sum, leg) => sum + leg.size, 0);
	const manual = numFunded > 1 ? plan.fundedNotional / numFunded : plan.fundedNotional;
	return {
		evalSize,
		evalPrice: Math.round(plan.cost * 100) / 100,
		numEvals: 1,
		evalLeverage: 3,
		fundedSize,
		numFunded: Math.max(1, numFunded),
		mode: "manual",
		manualNotional: Math.round(manual),
		targetPct: 9,
		ddPct: 3,
		splitPct: 80
	};
}
var ADVISOR_QUESTIONS = [
	{
		id: "lev",
		label: "Warum 3× statt 10×?"
	},
	{
		id: "fees",
		label: "Wie überlebe ich den 10k-Start?"
	},
	{
		id: "cash",
		label: "Wie cashe ich Konto 2 aus?"
	},
	{
		id: "firm",
		label: "Wie stoppt eine Prop Firm den Loop?"
	}
];
function offlineAnswer(id, inventory, advice) {
	if (id === "lev") return [
		"Der Dollar-Drawdown im Pass hängt nicht am Hebel. Target und DD stehen 9 zu 3, also frisst der Pass immer das Dreifache dessen, was der Fail an Brutto bringt. Egal ob 3× oder 10×.",
		"Was sich ändert, ist der Weg. Bei 3× ist der Fail ein 1%-Move und der Pass ein 3%-Move. Bei 10× sind es 0,3% und 0,9%. Die 0,08% Round-Trip-Fee ist dann schon ein Viertel des Fail-Moves, und das Funded-Konto muss für denselben Dollar ein Vielfaches an Notional halten. Das läuft ins Hebel-Limit und in den Spread.",
		"3× hält die Funded-Seite nahe 1×, oft darunter. Das ist die 0,9×-Seite der Hydra: kurz die Evals mit 3×, lang das Funded knapp unter 1×."
	].join("\n\n");
	if (id === "fees") {
		const attack = advice.attack;
		const safe = advice.safe;
		const lines = ["Ein 10k-Funded hat 300 USD Puffer. 2× 10k-Eval kosten 80 USD. Die Position, die im Fail genau 0 macht und die Fee aus dem Payout zahlt, ist 11.111 USD long. Der Pass frisst davon 333 USD. Der Puffer hat nur 300. Die Verdopplung ist ohne Trick tot."];
		if (safe) lines.push(`Stattdessen ${safe.label} für ${safe.cost.toFixed(0)} USD. Long ${safe.fundedNotional.toFixed(0)} USD, aufgeteilt nach Puffer. Fail-Netto ${safe.net.toFixed(2)} USD. Im Pass bleiben ${safe.rest.toFixed(0)} USD Puffer.`);
		if (attack && !attack.fits && attack.discountNeededPct != null) lines.push(`Oder die Verdopplung mit ${attack.discountNeededPct}% Rabatt. Dann kostet sie ${attack.plan.listCost * (1 - attack.discountNeededPct / 100)} USD und der Pass landet auf dem Puffer, nicht darunter.`);
		if (attack?.stopMovePct != null && attack.stopLossUsd != null && attack.evalGainPct != null) lines.push(`Dritter Weg: die 10.000-Long trotzdem aufmachen und im Funded bei −${attack.stopMovePct.toFixed(2)}% hart raus (${attack.stopLossUsd.toFixed(0)} USD). Die Evals stehen dann bei +${attack.evalGainPct.toFixed(2)}% und bekommen einen Trailing-Stop. Das Funded überlebt, die Evals sind fast am Target.`);
		return lines.join("\n\n");
	}
	if (id === "cash") return [
		"Sobald zwei 100k-Funded stehen, hören sie auf, dieselbe Arbeit zu machen.",
		"Konto 1 bleibt der Kloner. Es hält die Longs gegen die nächsten Evals. Sein Puffer ist das Werkzeug, nicht das Einkommen.",
		"Konto 2 wird flach. Keine Position, kein Hedge, kein zweites Los in denselben Move. Auszahlung über den normalen Payout, 80% Split. Was auf Konto 2 offen ist, kann derselbe Move töten, der Konto 1 braucht.",
		"Nicht beide Konten in denselben Over-Hedge legen. Der Drucker-Play ist für die Phase, in der du noch skalierst. An der Endstufe wird ein Konto zur Kasse und das andere zur Maschine."
	].join("\n\n");
	return [
		"Der Loop ist aus Firm-Sicht ein Inventar-Angriff: viele billige Evals, ein Funded als Versicherung, korrelierte Gegenseite.",
		"Was ihn bricht, ist nicht eine weitere Regelzeile, sondern der Abgleich. Gleiche Person, gleiches Gerät, gleiche IP, Positionen die in derselben Sekunde gegeneinander aufgehen, ein Funded das immer genau dann long ist, wenn die eigenen Evals short sind.",
		"Payouts verzögern, bis der Stil über mehrere Tage nicht wie ein Hedge aussieht. Bei Treffer den Gegen-Account mit einziehen, nicht nur das eine Konto schließen. Der 80%-Split ist egal, wenn die Auszahlung nie ausgelöst wird.",
		"Eine Firma, die nur den einzelnen Drawdown prüft und nicht das Netz der Konten, bezahlt diesen Baum."
	].join("\n\n");
}
function adviceContext(inventory, advice) {
	const accounts = inventory.accounts.map((account) => `${formatK(account.size)} Puffer ${Math.round(account.buffer)}`).join(", ");
	const card = (plan) => plan ? `${plan.label}: Kosten ${plan.cost.toFixed(0)}, Long ${plan.fundedNotional.toFixed(0)}, Fail-Netto ${plan.net.toFixed(2)}, Rest ${plan.rest.toFixed(0)}` : "keine";
	return [
		`Cash ${inventory.cash.toFixed(0)} USD, Rabatt ${inventory.discountPct}%.`,
		`Funded: ${accounts || "keine"}. Puffer gesamt ${advice.buffer.toFixed(0)} USD.`,
		`Preise: 5k 20, 10k 40, 25k 95, 50k 180, 100k 330.`,
		`Regeln: Eval 3×, Fail +1%, Pass −3%, Split 80%, Fee 0.08% round-trip auf die Funded-Position.`,
		`Zero-Loss-Notional = Kosten / (0.01 * 0.80 - 0.0008). Drawdown im Pass = Notional * 0.03.`,
		`Karte A: ${card(advice.safe)}.`,
		advice.printer ? `Karte B: ${advice.printer.scaled.label}, Long ${advice.printer.scaled.fundedNotional.toFixed(0)}, Überschuss vor Fee ${advice.printer.cashBeforeFee.toFixed(0)}, ungenutzter Puffer vorher ${advice.printer.unused.toFixed(0)}.` : "Karte B: keine.",
		`Karte C: ${card(advice.bridge)}. ${advice.bridgeReason}`,
		advice.attack ? `Karte D: ${advice.attack.plan.label}, passt ${advice.attack.fits}, Rabatt nötig ${advice.attack.discountNeededPct ?? "nein"}, Stop ${advice.attack.stopMovePct?.toFixed(2) ?? "nein"}%.` : "Karte D: keine."
	].join("\n");
}
var STORAGE_KEY$1 = "position-builder.hydra.v1";
var KEY_STORAGE = "position-builder.hydra.key";
var PRESETS$1 = [
	{
		label: "10k Start",
		inventory: {
			cash: 500,
			discountPct: 0,
			accounts: [{
				id: "p1",
				size: 1e4,
				buffer: 300
			}]
		}
	},
	{
		label: "10k + 5k",
		inventory: {
			cash: 500,
			discountPct: 0,
			accounts: [{
				id: "p1",
				size: 1e4,
				buffer: 300
			}, {
				id: "p2",
				size: 5e3,
				buffer: 150
			}]
		}
	},
	{
		label: "100k Drucker",
		inventory: {
			cash: 2e3,
			discountPct: 0,
			accounts: [{
				id: "p1",
				size: 1e5,
				buffer: 3e3
			}]
		}
	}
];
function HydraAdvisor({ onOpenOptimizer }) {
	const [inventory, setInventory] = (0, import_react.useState)(PRESETS$1[0].inventory);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [apiKey, setApiKey] = (0, import_react.useState)("");
	const [question, setQuestion] = (0, import_react.useState)("");
	const [chat, setChat] = (0, import_react.useState)([]);
	const [pending, setPending] = (0, import_react.useState)(false);
	const [chatError, setChatError] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY$1);
			if (raw) setInventory(sanitizeInventory(JSON.parse(raw)));
			setApiKey(window.localStorage.getItem(KEY_STORAGE) ?? "");
		} catch {}
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		window.localStorage.setItem(STORAGE_KEY$1, JSON.stringify(inventory));
	}, [inventory, ready]);
	const advice = (0, import_react.useMemo)(() => advise(inventory), [inventory]);
	const apply = (plan) => {
		window.localStorage.setItem(HEDGE_STORAGE_KEY, JSON.stringify(toHedgeInputs(plan)));
		onOpenOptimizer();
	};
	const setAccount = (id, patch) => {
		setInventory((prev) => ({
			...prev,
			accounts: prev.accounts.map((account) => account.id === id ? {
				...account,
				...patch
			} : account)
		}));
	};
	const ask = async (text, quickId) => {
		const trimmed = text.trim();
		if (!trimmed || pending) return;
		setChatError("");
		setChat((prev) => [...prev, {
			role: "you",
			text: trimmed
		}]);
		setQuestion("");
		if (quickId || !apiKey.trim()) {
			const answer = quickId ? offlineAnswer(quickId, inventory, advice) : "Ohne API-Key beantworte ich nur die vier Schnellfragen. Trag einen xAI- oder OpenAI-Key ein, wenn die Frage frei sein soll.";
			setChat((prev) => [...prev, {
				role: "hydra",
				text: answer
			}]);
			return;
		}
		setPending(true);
		try {
			const result = await askHydra({ data: {
				apiKey: apiKey.trim(),
				question: trimmed,
				context: adviceContext(inventory, advice)
			} });
			setChat((prev) => [...prev, {
				role: "hydra",
				text: result.text
			}]);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Die Anfrage ist fehlgeschlagen.";
			setChatError(message);
		} finally {
			setPending(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
		className: "mx-auto w-full max-w-5xl px-3 pb-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
			className: "cursor-pointer text-sm font-medium text-muted",
			children: "Strategie-Baum mit festen Preisen"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pt-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold",
						children: "Hydra Strategie"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 max-w-3xl text-sm text-muted",
						children: "Evals short mit 3×, Funded long. Der Fail ist +1%, der Pass −3%, der Split 80%. Die Long-Größe ist so gerechnet, dass Payout minus Eval-Kosten minus 0,08% Fee genau 0 ist. Opposite-Positionen sind bei fast allen Firmen verboten."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "card p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-sm font-semibold",
							children: "Inventar"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 grid gap-3 sm:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-xs text-muted",
								children: ["Cash auf der Wallet", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									min: 0,
									step: 10,
									className: cn(fieldClass, "mt-1"),
									value: inventory.cash,
									onChange: (event) => setInventory((prev) => ({
										...prev,
										cash: numberOr(event.target.value)
									}))
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-xs text-muted",
								children: [
									"Rabatt auf neue Evals · ",
									inventory.discountPct,
									"%",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "range",
										min: 0,
										max: 20,
										step: 1,
										className: "mt-3 w-full accent-accent",
										value: inventory.discountPct,
										onChange: (event) => setInventory((prev) => ({
											...prev,
											discountPct: numberOr(event.target.value)
										}))
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 grid gap-2",
							children: inventory.accounts.map((account) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-[1fr_1fr_auto] items-end gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block text-xs text-muted",
										children: ["Funded", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											className: cn(fieldClass, "mt-1"),
											value: account.size,
											onChange: (event) => {
												const size = numberOr(event.target.value);
												setAccount(account.id, {
													size,
													buffer: Math.round(size * .03)
												});
											},
											children: EVAL_PRODUCTS.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: product.size,
												children: formatK(product.size)
											}, product.size))
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block text-xs text-muted",
										children: ["Restpuffer", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											min: 0,
											step: 10,
											className: cn(fieldClass, "mt-1"),
											value: account.buffer,
											onChange: (event) => setAccount(account.id, { buffer: numberOr(event.target.value) })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										className: "mb-0.5",
										onClick: () => setInventory((prev) => ({
											...prev,
											accounts: prev.accounts.filter((item) => item.id !== account.id)
										})),
										children: "Weg"
									})
								]
							}, account.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								tone: "accent",
								onClick: () => setInventory((prev) => ({
									...prev,
									accounts: [...prev.accounts, {
										id: `a-${Date.now()}`,
										size: 5e3,
										buffer: 150
									}]
								})),
								children: "Konto dazu"
							}), PRESETS$1.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								onClick: () => setInventory(structuredClone(preset.inventory)),
								children: preset.label
							}, preset.label))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-xs text-faint",
							children: [
								"Eval-Preise ",
								EVAL_PRODUCTS.map((product) => `${formatK(product.size)} ${fmtUsd(product.price)}`).join(" · "),
								". Puffer gesamt ",
								fmtUsd(advice.buffer),
								"."
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 grid gap-3 lg:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StrategyCard, {
							kicker: "A · Zero-Loss",
							title: "Gebührensicher",
							plan: advice.safe,
							onApply: apply,
							body: safeCopy(advice)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StrategyCard, {
							kicker: "B · Over-Hedge",
							title: "Fürs Scheitern bezahlt",
							plan: advice.printer?.scaled ?? null,
							onApply: apply,
							body: printerCopy(advice)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StrategyCard, {
							kicker: "C · Bridge",
							title: "Konten bündeln",
							plan: advice.bridge,
							onApply: apply,
							body: bridgeCopy(advice)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StrategyCard, {
							kicker: "D · Voll-Angriff",
							title: advice.attack?.fits ? "Passt schon" : "Rabatt oder Stop",
							plan: advice.attack?.fits ? advice.attack.plan : advice.attack?.classic ?? null,
							onApply: apply,
							body: attackCopy(advice, inventory.discountPct)
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "mt-3 card p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-sm font-semibold",
							children: "Roadmap bis 2× 100k"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted",
							children: "Jede Stufe ist der Pass. Die Evals werden Funded, die alten Konten behalten den Restpuffer. Konto 1 klont am Ende weiter, Konto 2 wird flach."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
							className: "mt-3 space-y-3",
							children: advice.steps.map((step) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "rounded-xl bg-bg p-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm font-medium",
										children: [
											step.index,
											". Kauf ",
											step.plan.label,
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "ml-2 font-mono text-muted",
												children: fmtUsd(step.plan.cost)
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-sm text-muted",
										children: ["Short ", step.plan.shorts.map((leg) => `${leg.count}× ${formatK(leg.size)} ${fmtUsd(leg.notional)}`).join(" · ")]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-sm text-muted",
										children: [
											"Long",
											" ",
											step.plan.allocations.map((leg) => `${formatK(leg.size)} ${fmtUsd(leg.notional)} (${leg.leverage.toFixed(2)}×)`).join(" · ")
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-sm",
										children: [
											"Fail +1%: Netto ",
											fmtUsd(step.plan.net, true),
											". Pass −3%: Restpuffer",
											" ",
											step.survivors.map((leg) => `${formatK(leg.size)} ${fmtUsd(leg.buffer)}`).join(", ") || "keine",
											step.spawned.length ? `. Neu: ${step.spawned.map((leg) => `${formatK(leg.size)} Puffer ${fmtUsd(leg.buffer)}`).join(", ")}` : "",
											". Wallet danach ",
											fmtUsd(step.cashAfter),
											"."
										]
									})
								]
							}, step.index))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-fg",
							children: advice.roadmapNote
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
					className: "mt-3 card p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
							className: "cursor-pointer text-sm font-semibold",
							children: "Frag den Hydra-Berater"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xs text-muted",
							children: "Ohne Key antwortet ein fester Satz auf die vier Fragen. Mit Key geht die Frage plus deine Zahlen an xAI (Key beginnt mit xai-) oder OpenAI. Der Key bleibt im Browser."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mt-3 block text-xs text-muted",
							children: ["API-Key", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "password",
								autoComplete: "off",
								className: cn(fieldClass, "mt-1"),
								value: apiKey,
								onChange: (event) => {
									setApiKey(event.target.value);
									window.localStorage.setItem(KEY_STORAGE, event.target.value);
								}
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 flex flex-wrap gap-2",
							children: ADVISOR_QUESTIONS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								onClick: () => ask(item.label, item.id),
								children: item.label
							}, item.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "mt-3 flex gap-2",
							onSubmit: (event) => {
								event.preventDefault();
								ask(question);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								value: question,
								placeholder: "Eigene Frage",
								onChange: (event) => setQuestion(event.target.value)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								tone: "accent",
								type: "submit",
								disabled: pending,
								children: pending ? "…" : "Fragen"
							})]
						}),
						chatError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-short",
							children: chatError
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 space-y-2",
							children: chat.map((entry, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "whitespace-pre-wrap text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-muted",
									children: [entry.role === "you" ? "Du" : "Hydra", " · "]
								}), entry.text]
							}, `${entry.role}-${index}`))
						})
					]
				})
			]
		})]
	});
}
function StrategyCard({ kicker, title, body, plan, onApply }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "card flex flex-col p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				children: kicker
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mt-1 text-base font-semibold",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted",
				children: body
			}),
			plan ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "mt-3 self-start",
				tone: "accent",
				onClick: () => onApply(plan),
				children: "In den Optimizer"
			}) : null
		]
	});
}
function safeCopy(advice) {
	const plan = advice.safe;
	if (!plan) return "Kein Kauf ist gleichzeitig bezahlbar und gebührensicher. Mehr Cash oder mehr Puffer.";
	const longs = plan.allocations.map((leg) => `${formatK(leg.size)} long ${fmtUsd(leg.notional)} (${leg.leverage.toFixed(2)}×)`).join(", ");
	return [
		`Kauf ${plan.label} für ${fmtUsd(plan.cost)}.`,
		`${longs}.`,
		`Bei +1% ist der Payout ${fmtUsd(plan.payout)}, die Fee ${fmtUsd(plan.fees)}, Netto ${fmtUsd(plan.net)}.`,
		`Bei −3% geht der Puffer um ${fmtUsd(plan.passLoss)} zurück. Es bleiben ${fmtUsd(plan.rest)}.`
	].join("\n");
}
function printerCopy(advice) {
	const printer = advice.printer;
	if (!printer) return "Der Puffer ist zu knapp, um die große Stufe über den Nullpunkt hinaus aufzudrehen. Erst Karte A. Ein Over-Hedge braucht mehr als 150 USD Luft über dem normalen Hedge.";
	const { scaled, unused, cashBeforeFee } = printer;
	const afterFee = cashBeforeFee - scaled.fees;
	return [
		`${scaled.label}. Der normale Hedge lässt ${fmtUsd(unused)} Puffer liegen.`,
		`Dreh die Long auf ${fmtUsd(scaled.fundedNotional)}, bis 150 USD Preis-Puffer übrig sind.`,
		`Bei jedem Fail: ${fmtUsd(cashBeforeFee, true)} vor Fee, Fee ${fmtUsd(scaled.fees)}, danach ${fmtUsd(afterFee, true)}.`
	].join("\n");
}
function bridgeCopy(advice) {
	const plan = advice.bridge;
	if (!plan) return advice.bridgeReason;
	const longs = plan.allocations.map((leg) => `${formatK(leg.size)} ${fmtUsd(leg.notional)} (${leg.leverage.toFixed(2)}×)`).join(", ");
	return [
		`${advice.bridgeReason}`,
		`Long parallel: ${longs}.`,
		`Kosten ${fmtUsd(plan.cost)}, Rest nach dem Pass ${fmtUsd(plan.rest)}.`
	].join("\n");
}
function attackCopy(advice, discountPct) {
	const attack = advice.attack;
	if (!attack) return "Ohne Funded-Konto gibt es keinen Voll-Angriff.";
	if (attack.fits) return `Die Verdopplung ${attack.plan.label} ist bei ${discountPct}% Rabatt schon gebührensicher. Long ${fmtUsd(attack.plan.fundedNotional)}, Rest ${fmtUsd(attack.plan.rest)}.`;
	const lines = [`${attack.classic.label} zum Listenpreis frisst den Puffer. Die Null-Größe wäre ${fmtUsd(attack.plan.fundedNotional)} und landet ${fmtUsd(attack.plan.rest)} unter null.`];
	if (attack.discountNeededPct != null) {
		const price = attack.plan.listCost * (1 - attack.discountNeededPct / 100);
		lines.push(`Ab ${attack.discountNeededPct}% Rabatt (${fmtUsd(price)}) wird dieselbe Verdopplung gebührensicher.`);
	} else lines.push("Auch 20% Rabatt reichen nicht. Der Puffer ist für diese Verdopplung zu klein.");
	if (attack.stopMovePct != null && attack.stopLossUsd != null && attack.evalGainPct != null) lines.push(`Oder die klassische Long ${fmtUsd(attack.classic.fundedNotional)} aufmachen und im Funded bei −${attack.stopMovePct.toFixed(2)}% hart raus (${fmtUsd(attack.stopLossUsd)}). Die Evals stehen dann bei +${attack.evalGainPct.toFixed(2)}% und laufen mit Trailing-Stop weiter.`);
	return lines.join("\n");
}
function numberOr(value) {
	const next = value === "" ? 0 : Number(value);
	return Number.isFinite(next) ? next : 0;
}
function sanitizeInventory(raw) {
	const fallback = PRESETS$1[0].inventory;
	if (!raw || typeof raw !== "object") return fallback;
	const src = raw;
	const accounts = Array.isArray(src.accounts) ? src.accounts.map((row, index) => {
		if (!row || typeof row !== "object") return null;
		const item = row;
		const size = EVAL_PRODUCTS.some((product) => product.size === item.size) ? item.size : 1e4;
		const buffer = typeof item.buffer === "number" && Number.isFinite(item.buffer) ? Math.max(0, item.buffer) : size * .03;
		return {
			id: typeof item.id === "string" ? item.id : `a-${index}`,
			size,
			buffer
		};
	}).filter((row) => row != null) : fallback.accounts;
	return {
		cash: typeof src.cash === "number" && Number.isFinite(src.cash) ? Math.max(0, src.cash) : fallback.cash,
		discountPct: typeof src.discountPct === "number" && Number.isFinite(src.discountPct) ? Math.min(20, Math.max(0, src.discountPct)) : 0,
		accounts
	};
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
function bookId(currency, settle) {
	if (settle === "linear" || !hasInverse(currency)) return `${currency}-USDC`;
	return currency;
}
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
	const size = num$2(row.size);
	const entry = num$2(row.entry);
	const positionUsd = typeof row.positionUsd === "number" && Number.isFinite(row.positionUsd) ? row.positionUsd : size * entry;
	if (size === 0 && positionUsd === 0 && num$2(row.account) === 0) return null;
	const split = Math.min(100, Math.max(0, num$2(row.split, 80)));
	return {
		id: row.id,
		name: row.name.slice(0, 32) || "Custom",
		enabled: row.enabled !== false,
		phase: row.phase === "challenge" ? "challenge" : "funded",
		size,
		entry,
		account: num$2(row.account, 1e5),
		balance: num$2(row.balance, 1e5),
		ddLimit: num$2(row.ddLimit, 95e3),
		dailyLimit: Math.max(0, num$2(row.dailyLimit, 0)),
		profitTarget: Math.max(0, num$2(row.profitTarget, 109e3)),
		cost: Math.max(0, num$2(row.cost, 5e3)),
		split,
		positionUsd,
		rtFeePct: Math.min(5, Math.max(0, num$2(row.rtFeePct, 0))),
		presetId: typeof row.presetId === "string" ? row.presetId : ""
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
function num$2(value, fallback = 0) {
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
	const size = num$2(row.size);
	if (size === 0) return null;
	const linear = typeof row.linear === "boolean" ? row.linear : row.instrument.includes("_USDC");
	return {
		instrument: row.instrument,
		kind: row.kind,
		right: row.right === "call" || row.right === "put" ? row.right : void 0,
		strike: row.strike != null ? num$2(row.strike) : void 0,
		expiry: row.expiry == null ? null : num$2(row.expiry),
		perpetual: Boolean(row.perpetual),
		contractSize: num$2(row.contractSize, 1) || 1,
		size,
		entry: num$2(row.entry),
		iv: num$2(row.iv),
		forward: num$2(row.forward),
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
	for (const id of BOOK_IDS) cash[id] = num$2(src[id]);
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
				ivShift: num$2(parsed.ivShift),
				daysForward: Math.max(0, num$2(parsed.daysForward)),
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
var DEFAULT_PRESETS = [
	{
		id: "zero",
		name: "Zero-Fee Firm",
		rtPct: 0,
		split: 80,
		maxDdPct: 3,
		targetPct: 9
	},
	{
		id: "low",
		name: "Low-Fee Crypto",
		rtPct: .03,
		split: 80,
		maxDdPct: 3,
		targetPct: 9
	},
	{
		id: "hn-mkt",
		name: "Hypernova Crypto Market",
		rtPct: .08,
		split: 80,
		maxDdPct: 3,
		targetPct: 9
	},
	{
		id: "hn-lmt",
		name: "Hypernova Crypto Limit",
		rtPct: .05,
		split: 80,
		maxDdPct: 3,
		targetPct: 9
	},
	{
		id: "hn-fx",
		name: "Hypernova Gold/Indices/FX",
		rtPct: .01,
		split: 80,
		maxDdPct: 3,
		targetPct: 9
	},
	{
		id: "hn-eq",
		name: "Hypernova Equities",
		rtPct: .06,
		split: 80,
		maxDdPct: 3,
		targetPct: 9
	}
];
var PRESET_KEY = "position-builder.presets.v1";
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function loadPresets() {
	if (typeof window === "undefined") return DEFAULT_PRESETS.map((row) => ({ ...row }));
	try {
		const raw = window.localStorage.getItem(PRESET_KEY);
		if (!raw) return DEFAULT_PRESETS.map((row) => ({ ...row }));
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return DEFAULT_PRESETS.map((row) => ({ ...row }));
		return DEFAULT_PRESETS.map((base) => {
			const saved = parsed.find((row) => !!row && typeof row === "object" && row.id === base.id);
			if (!saved) return { ...base };
			const name = typeof saved.name === "string" && saved.name.trim() ? saved.name.trim().slice(0, 48) : base.name;
			const rtPct = typeof saved.rtPct === "number" && Number.isFinite(saved.rtPct) ? clamp(saved.rtPct, 0, 5) : base.rtPct;
			return {
				...base,
				name,
				rtPct
			};
		});
	} catch {
		return DEFAULT_PRESETS.map((row) => ({ ...row }));
	}
}
function savePresets(presets) {
	window.localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}
function priceOf(size) {
	const hit = ACCOUNT_SIZES.find((item) => item === size);
	return hit != null ? EVAL_PRICES[hit] : 0;
}
function feeUsd(account) {
	return Math.abs(account.positionUsd) * (account.rtFeePct / 100);
}
function maxDdUsd(account) {
	return Math.max(0, account.balance - account.ddLimit);
}
function targetGap(account) {
	if (account.phase !== "challenge") return 0;
	return Math.max(0, account.profitTarget - account.balance);
}
/** Adverse price move (signed) at which fee plus price loss eats the max DD. */
function breachMove(account) {
	if (!(Math.abs(account.positionUsd) > 0)) return null;
	const room = maxDdUsd(account) - feeUsd(account);
	if (room <= 0) return 0;
	return -room / account.positionUsd;
}
/** Signed move at which a challenge has earned the target plus the round-trip fee. */
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
/** Unrealized eval P&L while the challenge is still alive, including the fee it still has to earn. */
function challengeOpen(account, price) {
	if (!account.enabled || account.phase !== "challenge") return null;
	if (!(account.entry > 0) || !(price > 0) || !(Math.abs(account.positionUsd) > 0)) return null;
	const move = price / account.entry - 1;
	const breach = breachMove(account);
	const pass = passMove(account);
	const short = account.positionUsd < 0;
	if (breach != null && (short ? move > breach + 1e-8 : move < breach - 1e-8)) return null;
	if (pass != null && (short ? move < pass - 1e-8 : move > pass + 1e-8)) return null;
	return account.positionUsd * move;
}
function bufferLeft(account, price) {
	if (account.phase !== "funded" || !(account.entry > 0) || !(price > 0)) return maxDdUsd(account);
	const open = account.positionUsd * (price / account.entry - 1);
	const consumed = feeUsd(account) + Math.max(0, -open);
	return maxDdUsd(account) - consumed;
}
function buildLoopCurve(accounts, entry, span = .08) {
	if (!(entry > 0)) return [];
	const live = accounts.filter((account) => account.enabled);
	const marks = live.flatMap((account) => [breachMove(account), passMove(account)]).filter((row) => row != null);
	let lo = -span;
	let hi = span;
	for (const mark of marks) {
		lo = Math.min(lo, mark - .005);
		hi = Math.max(hi, mark + .005);
	}
	const moves = /* @__PURE__ */ new Set([0]);
	const n = 121;
	for (let i = 0; i < n; i += 1) moves.add(lo + (hi - lo) * i / 120);
	for (const mark of marks) moves.add(mark);
	return [...moves].sort((a, b) => a - b).map((move) => {
		const price = entry * (1 + move);
		const progressParts = live.map((account) => challengeOpen(account, price));
		const anyAlive = progressParts.some((part) => part != null);
		return {
			move: move * 100,
			price,
			cash: live.reduce((sum, account) => sum + accountCash(account, price), 0),
			progress: anyAlive ? progressParts.reduce((sum, part) => sum + (part ?? 0), 0) : null,
			buffer: live.filter((account) => account.phase === "funded").reduce((sum, account) => sum + bufferLeft(account, price), 0),
			passed: live.some((account) => isPassed(account, price))
		};
	});
}
function roundCents(value) {
	return Math.round(value * 100) / 100;
}
function leverageSpan(rows) {
	const values = rows.filter((account) => account.account > 0 && Math.abs(account.positionUsd) > 0).map((account) => Math.abs(account.positionUsd) / account.account);
	if (!values.length) return null;
	return [Math.min(...values), Math.max(...values)];
}
function loopKpis(accounts, entry, slPct) {
	const on = accounts.filter((account) => account.enabled).map((account) => withEntry(account, entry));
	const evals = on.filter((account) => account.phase === "challenge");
	const funds = on.filter((account) => account.phase === "funded");
	const costs = evals.reduce((sum, account) => sum + account.cost, 0);
	const failPrice = entry > 0 ? entry * (1 + slPct / 100) : 0;
	const netAtFail = failPrice > 0 ? roundCents(on.reduce((sum, account) => sum + accountCash(account, failPrice), 0)) : 0;
	const passes = evals.map(passMove).filter((row) => row != null);
	const pass = passes.length ? Math.min(...passes) : -.03;
	const passPrice = entry > 0 ? entry * (1 + pass) : 0;
	const bufferAtPass = passPrice > 0 ? roundCents(funds.reduce((sum, account) => sum + bufferLeft(account, passPrice), 0)) : 0;
	const wonBuffer = evals.reduce((sum, account) => sum + maxDdUsd(account), 0);
	return {
		costs,
		netAtFail,
		failMove: slPct,
		bufferAtPass,
		passMove: pass * 100,
		alive: funds.length === 0 || bufferAtPass >= -.005,
		evalLeverage: leverageSpan(evals),
		fundedLeverage: leverageSpan(funds),
		wonCount: evals.length,
		wonBuffer
	};
}
function autoSync(accounts, slPct, extra) {
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
				const rt = account.rtFeePct / 100;
				const denom = sl + rt;
				const mag = denom > 0 ? maxDdUsd(account) / denom : 0;
				return {
					...account,
					positionUsd: -mag
				};
			}
			const share = totalDd > 0 ? maxDdUsd(account) / totalDd : funds.length > 0 ? 1 / funds.length : 0;
			const split = account.split / 100;
			const gross = split > 0 ? neededNet * share / split : 0;
			const rt = account.rtFeePct / 100;
			const denom = sl - rt;
			if (!(denom > 1e-8)) {
				warning = "Funded-Fee ist höher als der SL-Move. Die Long-Größe bleibt 0.";
				return {
					...account,
					positionUsd: 0
				};
			}
			return {
				...account,
				positionUsd: gross / denom
			};
		}),
		warning
	};
}
function fuzzBook(accounts) {
	return accounts.map((account) => {
		if (!account.enabled || account.positionUsd === 0) return account;
		const positionUsd = Math.sign(account.positionUsd) * fuzzNotional(Math.abs(account.positionUsd), Math.random());
		return {
			...account,
			positionUsd
		};
	});
}
function applyPreset(account, preset, size = account.account) {
	const dd = size * (preset.maxDdPct / 100);
	const challenge = account.phase === "challenge";
	return {
		...account,
		account: size,
		balance: size,
		ddLimit: Math.round((size - dd) * 100) / 100,
		dailyLimit: 0,
		profitTarget: challenge ? Math.round(size * (1 + preset.targetPct / 100) * 100) / 100 : 0,
		cost: challenge ? priceOf(size) : 0,
		split: preset.split,
		rtFeePct: preset.rtPct,
		presetId: preset.id
	};
}
function makeAccount(phase, size, preset) {
	return applyPreset({
		id: crypto.randomUUID(),
		name: `${phase === "funded" ? "Funded" : "Eval"} ${size / 1e3}k`,
		enabled: true,
		phase,
		size: 0,
		entry: 0,
		account: size,
		balance: size,
		ddLimit: 0,
		dailyLimit: 0,
		profitTarget: 0,
		cost: 0,
		split: preset.split,
		positionUsd: 0,
		rtFeePct: preset.rtPct,
		presetId: preset.id
	}, preset, size);
}
var TEMPLATES = [
	{
		id: "10k-safe",
		label: "10k Safe-Start",
		rows: [
			{
				phase: "funded",
				size: 1e4
			},
			{
				phase: "challenge",
				size: 1e4
			},
			{
				phase: "challenge",
				size: 5e3
			}
		]
	},
	{
		id: "25k",
		label: "25k Loop",
		rows: [
			{
				phase: "funded",
				size: 25e3
			},
			{
				phase: "challenge",
				size: 25e3
			},
			{
				phase: "challenge",
				size: 25e3
			}
		]
	},
	{
		id: "50k",
		label: "50k Upgrade",
		rows: [
			{
				phase: "funded",
				size: 25e3
			},
			{
				phase: "funded",
				size: 25e3
			},
			{
				phase: "challenge",
				size: 5e4
			},
			{
				phase: "challenge",
				size: 5e4
			}
		]
	},
	{
		id: "100k-up",
		label: "100k Upgrade",
		rows: [
			{
				phase: "funded",
				size: 5e4
			},
			{
				phase: "funded",
				size: 5e4
			},
			{
				phase: "challenge",
				size: 1e5
			},
			{
				phase: "challenge",
				size: 1e5
			}
		]
	},
	{
		id: "100k-end",
		label: "100k Endgame",
		rows: [
			{
				phase: "funded",
				size: 1e5
			},
			{
				phase: "challenge",
				size: 1e5
			},
			{
				phase: "challenge",
				size: 1e5
			}
		]
	}
];
function accountsFromTemplate(rows, preset) {
	return rows.map((row) => makeAccount(row.phase, row.size, preset));
}
function formatLeverage(span) {
	if (!span) return "—";
	const [lo, hi] = span;
	if (Math.abs(lo - hi) < .005) return `${lo.toFixed(2)}×`;
	return `${lo.toFixed(2)}–${hi.toFixed(2)}×`;
}
var LOOP_KEY = "position-builder.loop.v1";
var loopSettings = {
	sl: 1,
	extra: 0
};
var loopBooted = false;
var loopListeners = /* @__PURE__ */ new Set();
function bootLoop() {
	if (loopBooted || typeof window === "undefined") return;
	loopBooted = true;
	try {
		const raw = window.localStorage.getItem(LOOP_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw);
		if (typeof parsed.sl === "number" && Number.isFinite(parsed.sl)) loopSettings.sl = clamp(parsed.sl, .2, 3);
		if (typeof parsed.extra === "number" && Number.isFinite(parsed.extra)) loopSettings.extra = clamp(parsed.extra, 0, 200);
	} catch {}
}
function getLoopSettings() {
	bootLoop();
	return loopSettings;
}
function setLoopSettings(partial) {
	bootLoop();
	loopSettings = {
		sl: partial.sl != null ? clamp(partial.sl, .2, 3) : loopSettings.sl,
		extra: partial.extra != null ? clamp(partial.extra, 0, 200) : loopSettings.extra
	};
	window.localStorage.setItem(LOOP_KEY, JSON.stringify(loopSettings));
	for (const listener of loopListeners) listener();
}
function subscribeLoop(listener) {
	loopListeners.add(listener);
	return () => loopListeners.delete(listener);
}
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
function num$1(value) {
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
	const raw = num$1(value);
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
	const spot = num$1(asRecord(currencyRow).spot_price);
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
	const strike = num$1(details?.strike);
	const expirySec = num$1(details?.expiry);
	if (!right || !(strike > 0) || !(expirySec > 0)) return null;
	if (expirySec * 1e3 < now - 6e4) return null;
	const tick = num$1(row.tick_size);
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
	const tick = num$1(row.tick_size);
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
	const markUsd = num$1(row.M);
	if (!(markUsd > 0)) return null;
	const index = num$1(row.I) || spot;
	const forward = num$1(row.option_pricing?.f) || index || spot;
	const px = index > 0 ? index : forward;
	const mark = option && !linear && px > 0 ? markUsd / px : markUsd;
	if (!(mark > 0)) return null;
	const bid = positive(row.b);
	const ask = positive(row.a);
	const hourly = num$1(row.f);
	return {
		mark,
		iv: ivPercent(row.option_pricing?.i),
		underlying: forward > 0 ? forward : px,
		bid: option && !linear && bid != null && px > 0 ? bid / px : bid,
		ask: option && !linear && ask != null && px > 0 ? ask / px : ask,
		oi: num$1(row.stats?.oi),
		funding8h: option ? void 0 : hourly * 8
	};
}
function positive(value) {
	const parsed = num$1(value);
	return parsed > 0 ? parsed : null;
}
var WS_URL$1 = "wss://api.derive.xyz/v3/ws";
function num(value) {
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
			const price = num(feeds[currency]?.price);
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
function ensureFeed(book) {
	feed.start(book);
}
var fallback$1 = {
	sl: 1,
	extra: 0
};
function HydraKpis({ percentMode }) {
	const currency = useBook((state) => state.currency);
	const accounts = useBook((state) => state.props[currency]);
	const index = useMarket((state) => state.index);
	const settings = (0, import_react.useSyncExternalStore)(subscribeLoop, getLoopSettings, () => fallback$1);
	const entry = percentMode || !(index > 0) ? 100 : index;
	const kpis = loopKpis(accounts.map((account) => withEntry(account, entry)), entry, settings.sl);
	const cells = [
		{
			label: "Gesamtkosten Evals",
			value: fmtUsd(kpis.costs),
			tone: 0,
			hint: kpis.wonCount ? `${kpis.wonCount} Challenges` : "Keine aktive Eval"
		},
		{
			label: `Netto bei +${kpis.failMove.toFixed(2)}%`,
			value: fmtUsd(kpis.netAtFail, true),
			tone: kpis.netAtFail,
			hint: "Payout nach Split und Fee, minus Eval-Kosten"
		},
		{
			label: "Funded-Restpuffer bei Eval-Pass",
			value: fmtUsd(kpis.bufferAtPass, true),
			tone: kpis.alive ? 1 : -1,
			hint: `Pass bei ${kpis.passMove.toFixed(2)}% · ${kpis.alive ? "überlebt" : "Drawdown gerissen"}`
		},
		{
			label: "Hebel",
			value: `${formatLeverage(kpis.evalLeverage)} · ${formatLeverage(kpis.fundedLeverage)}`,
			tone: 0,
			hint: "Evals gegen Funded"
		},
		{
			label: "Account-Wert bei Sieg",
			value: kpis.wonCount ? `${kpis.wonCount}× · ${fmtUsd(kpis.wonBuffer)}` : "—",
			tone: kpis.wonCount ? 1 : 0,
			hint: "Neue Funded-Konten und ihr frischer Drawdown-Puffer"
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "grid grid-cols-2 gap-3 xl:grid-cols-5",
		children: cells.map((cell) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "card px-4 py-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: cell.label
				}),
				cell.label.startsWith("Netto") || cell.label.startsWith("Funded") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Signed, {
					value: cell.tone,
					text: cell.value,
					className: "mt-2 block text-2xl"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-mono text-2xl tabular-nums tracking-tight",
					children: cell.value
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-xs text-faint",
					children: cell.hint
				})
			]
		}, cell.label))
	});
}
var SPANS = [
	{
		id: .05,
		label: "±5%"
	},
	{
		id: .08,
		label: "±8%"
	},
	{
		id: .15,
		label: "±15%"
	}
];
function HydraPayoff({ percentMode }) {
	const currency = useBook((state) => state.currency);
	const accounts = useBook((state) => state.props[currency]);
	const index = useMarket((state) => state.index);
	const [span, setSpan] = (0, import_react.useState)(.08);
	const [hover, setHover] = (0, import_react.useState)(null);
	const entry = percentMode || !(index > 0) ? 100 : index;
	const rows = (0, import_react.useMemo)(() => accounts.map((account) => withEntry(account, entry)), [accounts, entry]);
	const data = (0, import_react.useMemo)(() => buildLoopCurve(rows, entry, span), [
		rows,
		entry,
		span
	]);
	const passMark = (0, import_react.useMemo)(() => {
		const moves = rows.filter((account) => account.enabled && account.phase === "challenge").map(passMove).filter((move) => move != null);
		return moves.length ? Math.min(...moves) * 100 : null;
	}, [rows]);
	const shown = hover ?? data.find((point) => Math.abs(point.move) < .02) ?? data[0];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-semibold",
					children: "Hydra-Payoff"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 max-w-3xl text-xs text-muted",
					children: "Eval-Tod ist −Kosten. Eine bestandene Eval zahlt keinen 80%-Split, sie wird ein neues Funded-Konto. Die gestrichelte Linie ist der offene Brutto-Fortschritt bis zum Target."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex rounded-full bg-bg p-1",
					children: SPANS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setSpan(item.id),
						className: cn("h-8 rounded-full px-3 text-xs", span === item.id ? "bg-fg text-bg" : "text-muted"),
						children: item.label
					}, item.id))
				})]
			}),
			shown ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 font-mono text-sm tabular-nums",
				children: [
					"Bei ",
					shown.move >= 0 ? "+" : "",
					shown.move.toFixed(2),
					"%",
					" · ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Signed, {
						value: shown.cash,
						text: `Cash ${fmtUsd(shown.cash, true)}`
					}),
					" · ",
					"Puffer ",
					fmtUsd(shown.buffer, true),
					shown.passed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-long",
						children: " · EVAL PASSED — neuer Funded-Account freigeschaltet"
					}) : null
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: "Noch keine Konten in der Tabelle."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 h-80",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ComposedChart, {
						data,
						margin: {
							top: 16,
							right: 12,
							left: 0,
							bottom: 0
						},
						onMouseMove: (state) => {
							const point = state?.activePayload?.[0]?.payload;
							if (point) setHover(point);
						},
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
								tickFormatter: (value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
								stroke: "var(--color-faint)",
								fontSize: 11
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								tickFormatter: (value) => fmtUsd(value),
								stroke: "var(--color-faint)",
								fontSize: 11,
								width: 72
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { content: () => null }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
								y: 0,
								stroke: "var(--color-faint)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
								x: 0,
								stroke: "var(--color-line)"
							}),
							passMark != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
								x: passMark,
								stroke: "var(--color-long)",
								strokeDasharray: "4 4",
								label: {
									value: "EVAL PASSED",
									fill: "var(--color-long)",
									fontSize: 11,
									position: "insideTopLeft"
								}
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "linear",
								dataKey: "cash",
								stroke: "var(--color-accent)",
								dot: false,
								strokeWidth: 2,
								isAnimationActive: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "linear",
								dataKey: "progress",
								stroke: "var(--color-preview)",
								strokeDasharray: "5 4",
								dot: false,
								strokeWidth: 1.5,
								connectNulls: false,
								isAnimationActive: false
							})
						]
					})
				})
			})
		]
	});
}
var fallback = {
	sl: 1,
	extra: 0
};
function PropAccounts({ percentMode }) {
	const currency = useBook((state) => state.currency);
	const accounts = useBook((state) => state.props[currency]);
	const setProps = useBook((state) => state.setProps);
	const patchProp = useBook((state) => state.patchProp);
	const removeProp = useBook((state) => state.removeProp);
	const index = useMarket((state) => state.index);
	const settings = (0, import_react.useSyncExternalStore)(subscribeLoop, getLoopSettings, () => fallback);
	const [presets, setPresets] = (0, import_react.useState)(DEFAULT_PRESETS);
	const [warning, setWarning] = (0, import_react.useState)("");
	const entry = percentMode || !(index > 0) ? 100 : index;
	const preset = presets.find((row) => row.id === "hn-mkt") ?? presets[0];
	(0, import_react.useEffect)(() => {
		setPresets(loadPresets());
	}, []);
	const viewed = accounts.map((account) => withEntry(account, entry));
	const write = (next, note = "") => {
		setWarning(note);
		setProps(currency, next);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-end justify-between gap-3 px-3 py-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-semibold",
				children: "Prop accounts"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 max-w-3xl text-xs text-muted",
				children: [
					"Short-Evals und Long-Funded. Die Fee geht sofort vom Puffer ab und auf das Target drauf. Positionsgröße ist USD, die Coin-Größe folgt dem ",
					currency,
					"-Preis",
					index > 0 ? ` (${fmtIndex(index)})` : "",
					"."
				]
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: () => {
					if (!preset) return;
					write([...accounts, makeAccount("challenge", 1e4, preset)]);
				},
				children: "Eval dazu"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4 px-3 pb-3 lg:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-xs text-muted",
				children: [
					"SL-Move bis Eval-Tod ",
					settings.sl.toFixed(2),
					"%",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: .2,
						max: 3,
						step: .05,
						value: settings.sl,
						className: "mt-3 w-full accent-accent",
						onChange: (event) => setLoopSettings({ sl: Number(event.target.value) })
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-xs text-muted",
				children: [
					"Over-Hedge bei Eval-Tod ",
					fmtUsd(settings.extra),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: 0,
						max: 200,
						step: 5,
						value: settings.extra,
						className: "mt-3 w-full accent-accent",
						onChange: (event) => setLoopSettings({ extra: Number(event.target.value) })
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap gap-2 px-3 pb-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					tone: "accent",
					onClick: () => {
						const result = autoSync(viewed, settings.sl, settings.extra);
						write(stampSize(result.accounts, index), result.warning);
					},
					children: "Auto-Sync Positionsgrößen"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => write(stampSize(fuzzBook(viewed), index), "Tarn-Größen ±1% gesetzt."),
					children: "Order-Fuzzing ±1%"
				}),
				accounts.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => write([]),
					children: "Tabelle leeren"
				}) : null
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-wrap gap-2 px-3 pb-3",
			children: TEMPLATES.map((template) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: () => {
					if (!preset) return;
					const result = autoSync(accountsFromTemplate(template.rows, preset).map((account) => withEntry(account, entry)), settings.sl, settings.extra);
					write(stampSize(result.accounts, index), result.warning || template.label);
				},
				children: template.label
			}, template.id))
		}),
		warning ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "px-3 pb-2 text-sm text-preview",
			children: warning
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
			className: "mx-3 mb-3 rounded-xl bg-bg px-3 py-2 text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
				className: "cursor-pointer text-muted",
				children: "Firmen-Gebühren"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 grid gap-2 sm:grid-cols-2",
				children: presets.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-xs text-muted",
					children: [row.name, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						min: 0,
						step: .001,
						className: "mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-sm",
						value: row.rtPct,
						onChange: (event) => {
							const rtPct = Number(event.target.value);
							if (!Number.isFinite(rtPct)) return;
							const next = presets.map((item) => item.id === row.id ? {
								...item,
								rtPct
							} : item);
							setPresets(next);
							savePresets(next);
							write(accounts.map((account) => account.presetId === row.id ? {
								...account,
								rtFeePct: rtPct
							} : account));
						}
					})]
				}, row.id))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-auto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full min-w-[1100px] border-collapse text-left text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "text-faint",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "An"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2 font-medium text-fg",
							children: "Konto"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2 font-medium",
							children: "Firma"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2 font-medium",
							children: "Größe"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2 font-medium",
							children: "Position $"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2 font-medium",
							children: "Hebel"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", {
							className: "px-2 py-2 font-medium",
							children: ["Size ", currency]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2 font-medium",
							children: "RT Fee %"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2 font-medium",
							children: "Fee $"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2 font-medium",
							children: "Max DD $"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2 font-medium",
							children: "Kosten $"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2 font-medium",
							children: "Status"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "px-2 py-2" })
					]
				}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: viewed.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					colSpan: 13,
					className: "px-3 py-4 text-sm text-muted",
					children: "Keine Konten. Ein Template lädt den Loop und setzt die Größen."
				}) }) : viewed.map((account) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					account,
					index,
					presets,
					onPatch: (patch) => patchProp(currency, account.id, patch),
					onRemove: () => removeProp(currency, account.id)
				}, account.id)) })]
			})
		})
	] });
}
function stampSize(accounts, index) {
	return accounts.map((account) => ({
		...account,
		size: index > 0 ? account.positionUsd / index : account.size
	}));
}
function Row({ account, index, presets, onPatch, onRemove }) {
	const coins = index > 0 ? account.positionUsd / index : 0;
	const leverage = account.account > 0 ? Math.abs(account.positionUsd) / account.account : 0;
	const cash = accountCash(account, account.entry);
	const passed = isPassed(account, account.entry);
	const blown = isBlown(account, account.entry);
	const status = blown ? "Tot" : passed ? "EVAL PASSED" : account.phase === "challenge" ? "Eval läuft" : "Funded";
	const buffer = account.phase === "funded" ? bufferLeft(account, account.entry) : null;
	const sl = breachMove(account);
	const tp = passMove(account);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
		className: "border-t border-line",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-3 py-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					className: "h-4 w-4 accent-accent",
					checked: account.enabled,
					"aria-label": `${account.name} an`,
					onChange: (event) => onPatch({ enabled: event.target.checked })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
				className: "px-2 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: cn("h-10 rounded-full border border-line px-3 text-xs", account.phase === "funded" ? "text-long" : "text-accent"),
					onClick: () => {
						const phase = account.phase === "funded" ? "challenge" : "funded";
						const current = presets.find((row) => row.id === account.presetId) ?? presets[0];
						if (!current) {
							onPatch({ phase });
							return;
						}
						onPatch(applyPreset({
							...account,
							phase
						}, current, nearestSize(account.account)));
					},
					children: account.phase === "funded" ? "Funded" : "Eval"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-faint",
					children: account.name
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-2 py-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: "h-10 max-w-48 rounded-xl border border-line bg-bg px-2",
					value: account.presetId,
					"aria-label": `Firma für ${account.name}`,
					onChange: (event) => {
						const next = presets.find((row) => row.id === event.target.value);
						if (!next) return;
						onPatch(applyPreset(account, next, nearestSize(account.account)));
					},
					children: [presets.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: row.id,
						children: row.name
					}, row.id)), account.presetId === "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: "Eigene Fee"
					}) : null]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-2 py-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: "h-10 rounded-xl border border-line bg-bg px-2",
					value: nearestSize(account.account),
					"aria-label": `Größe ${account.name}`,
					onChange: (event) => {
						const size = Number(event.target.value);
						const current = presets.find((row) => row.id === account.presetId) ?? presets[0];
						if (!current) return;
						onPatch(applyPreset(account, current, size));
					},
					children: ACCOUNT_SIZES.map((size) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
						value: size,
						children: [size / 1e3, "k"]
					}, size))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsdField, {
				account,
				onPatch
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-2 py-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "h-10 w-20 rounded-xl border border-line bg-bg px-2 text-right font-mono",
					defaultValue: leverage ? leverage.toFixed(2) : "",
					inputMode: "decimal",
					"aria-label": `Hebel ${account.name}`,
					onBlur: (event) => {
						const next = Number(event.target.value);
						if (!(next >= 0) || !Number.isFinite(next)) return;
						onPatch({ positionUsd: (account.phase === "challenge" ? -1 : 1) * next * account.account });
					}
				}, `${account.id}-${account.positionUsd}`)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-2 py-2 font-mono tabular-nums text-muted",
				children: index > 0 ? `${coins >= 0 ? "" : "−"}${Math.abs(coins).toFixed(4)}` : "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-2 py-2 font-mono tabular-nums",
				children: account.rtFeePct.toFixed(3)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-2 py-2 font-mono tabular-nums",
				children: fmtUsd(feeUsd(account))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-2 py-2 font-mono tabular-nums",
				children: fmtUsd(maxDdUsd(account))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-2 py-2 font-mono tabular-nums",
				children: account.phase === "challenge" ? fmtUsd(account.cost) : "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
				className: "px-2 py-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: cn(blown && "text-short", passed && "text-long"),
						children: status
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Signed, {
						value: cash,
						text: fmtUsd(cash, true)
					}),
					sl != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-faint",
						children: ["SL ", signedPct(sl)]
					}) : null,
					tp != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-faint",
						children: ["Target ", signedPct(tp)]
					}) : null,
					buffer != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-faint",
						children: ["Puffer ", fmtUsd(buffer, true)]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-2 py-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "inline-flex h-10 w-10 items-center justify-center rounded-md text-muted hover:text-short",
					"aria-label": `${account.name} entfernen`,
					onClick: onRemove,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
				})
			})
		]
	});
}
function UsdField({ account, onPatch }) {
	const [text, setText] = (0, import_react.useState)(account.positionUsd ? String(Math.round(account.positionUsd)) : "");
	(0, import_react.useEffect)(() => {
		setText(account.positionUsd ? String(Math.round(account.positionUsd)) : "");
	}, [account.positionUsd]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
		className: "px-2 py-2",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			className: "h-10 w-28 rounded-xl border border-line bg-bg px-2 text-right font-mono",
			value: text,
			inputMode: "decimal",
			"aria-label": `Position USD ${account.name}`,
			onChange: (event) => setText(event.target.value),
			onBlur: () => {
				const next = Number(text);
				if (!Number.isFinite(next)) {
					setText(account.positionUsd ? String(Math.round(account.positionUsd)) : "");
					return;
				}
				onPatch({ positionUsd: next });
			}
		})
	});
}
function nearestSize(size) {
	return ACCOUNT_SIZES.reduce((best, item) => Math.abs(item - size) < Math.abs(best - size) ? item : best);
}
function signedPct(move) {
	const pct = move * 100;
	return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}
var STORAGE_KEY = HEDGE_STORAGE_KEY;
var PRESETS = [
	{
		label: "25k→25k",
		patch: {
			evalSize: 25e3,
			evalPrice: 95,
			numEvals: 2,
			fundedSize: 25e3,
			numFunded: 1,
			manualNotional: 23750,
			mode: "manual"
		}
	},
	{
		label: "50k←25k",
		patch: {
			evalSize: 5e4,
			evalPrice: 180,
			numEvals: 2,
			fundedSize: 25e3,
			numFunded: 2,
			manualNotional: 22500,
			mode: "manual"
		}
	},
	{
		label: "100k←50k",
		patch: {
			evalSize: 1e5,
			evalPrice: 330,
			numEvals: 2,
			fundedSize: 5e4,
			numFunded: 2,
			manualNotional: 41250,
			mode: "manual"
		}
	}
];
function HedgeOptimizer() {
	const [inputs, setInputs] = (0, import_react.useState)(HEDGE_DEFAULTS);
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY);
			if (raw) setInputs(sanitizeHedge(JSON.parse(raw)));
		} catch {}
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
	}, [inputs, ready]);
	const plan = (0, import_react.useMemo)(() => optimizeHedge(inputs), [inputs]);
	const set = (key, value) => {
		setInputs((prev) => ({
			...prev,
			[key]: value
		}));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto w-full max-w-5xl px-3 py-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold",
					children: "Prop Firm Klon-Calculator"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 max-w-3xl text-sm text-muted",
					children: "Evals sind short, Funded ist long. Der Fail-Move ist Drawdown geteilt durch den Eval-Hebel, der Pass-Move ist Target geteilt durch denselben Hebel. Optimal heißt: der Payout im Fail deckt die Eval-Kosten."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 lg:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "card p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mb-3 text-sm font-semibold",
							children: "Evals (Short)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									id: "eval-size",
									label: "Eval-Account Größe",
									value: inputs.evalSize,
									unit: "$",
									min: 1e3,
									step: 1e3,
									hint: moneyHint(inputs.evalSize),
									onChange: (value) => set("evalSize", value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									id: "eval-price",
									label: "Preis pro Eval",
									value: inputs.evalPrice,
									unit: "$",
									min: 1,
									step: 1,
									hint: `Summe ${fmtUsd(inputs.numEvals * inputs.evalPrice)}`,
									onChange: (value) => set("evalPrice", value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									id: "num-evals",
									label: "Anzahl Evals",
									value: inputs.numEvals,
									unit: "Stk",
									min: 1,
									step: 1,
									onChange: (value) => set("numEvals", value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									id: "eval-lev",
									label: "Eval-Hebel",
									value: inputs.evalLeverage,
									unit: "×",
									min: .1,
									step: .1,
									hint: "Notional / Account",
									onChange: (value) => set("evalLeverage", value)
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "card p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mb-3 text-sm font-semibold",
							children: "Funded (Long)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									id: "funded-size",
									label: "Funded-Account Größe",
									value: inputs.fundedSize,
									unit: "$",
									min: 1e3,
									step: 1e3,
									hint: moneyHint(inputs.fundedSize),
									onChange: (value) => set("fundedSize", value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									id: "num-funded",
									label: "Anzahl Funded-Accounts",
									value: inputs.numFunded,
									unit: "Stk",
									min: 1,
									step: 1,
									onChange: (value) => set("numFunded", value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mb-1 text-xs text-muted",
										children: "Modus"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid grid-cols-2 gap-1 rounded-full bg-bg p-1",
										children: [["optimal", "Optimal"], ["manual", "Manuell"]].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setInputs((prev) => ({
												...prev,
												mode: id
											})),
											className: cn("h-9 rounded-full px-3 text-sm", inputs.mode === id ? "bg-fg text-bg" : "text-muted"),
											children: label
										}, id))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-xs text-faint",
										children: inputs.mode === "optimal" ? "Fail-Netto wird auf 0 gesetzt" : "Notional selbst vorgeben"
									})
								] }),
								inputs.mode === "manual" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									id: "manual-notional",
									label: "Notional pro Funded-Account",
									value: inputs.manualNotional,
									unit: "$",
									min: 0,
									step: 100,
									hint: moneyHint(inputs.manualNotional),
									onChange: (value) => set("manualNotional", value)
								}) : null
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "card p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mb-3 text-sm font-semibold",
							children: "Regeln"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									id: "target",
									label: "Profit Target",
									value: inputs.targetPct,
									unit: "%",
									min: .1,
									step: .1,
									hint: pctHint(inputs.evalSize, inputs.targetPct),
									onChange: (value) => set("targetPct", value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									id: "dd",
									label: "Max Drawdown",
									value: inputs.ddPct,
									unit: "%",
									min: .1,
									step: .1,
									hint: pctHint(inputs.fundedSize, inputs.ddPct),
									onChange: (value) => set("ddPct", value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									id: "split",
									label: "Profit Split, Trader",
									value: inputs.splitPct,
									unit: "%",
									min: 1,
									max: 100,
									step: 1,
									onChange: (value) => set("splitPct", value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mb-2 text-xs text-muted",
									children: "Presets"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap gap-2",
									children: PRESETS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										onClick: () => setInputs((prev) => ({
											...prev,
											...preset.patch
										})),
										children: preset.label
									}, preset.label))
								})] })
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid gap-3 lg:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Result, {
						kicker: `Evals (Short) · ${plan.numEvals} Accounts`,
						title: `${plan.numEvals}× ${fmtUsd(plan.evalNotional)}`,
						lines: [
							`Hebel ${fmtLev(plan.evalLeverage, 2)}`,
							`Fail-Move +${fmtPct(plan.adverseMovePct)}`,
							`Pass-Move −${fmtPct(plan.favorableMovePct)}`
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Result, {
						kicker: `Funded (Long) · ${plan.numFunded} Accounts · ${plan.mode === "optimal" ? "Optimal, Fail ≈ 0" : "Manuell"}`,
						title: `${plan.numFunded}× ${fmtUsd(plan.fundedNotionalPer)}`,
						lines: [
							`Hebel ${fmtLev(plan.fundedLeverage, 3)}`,
							`Gesamt-Notional ${fmtUsd(plan.fNotional)}`,
							`DD-Raum pro Account ${fmtUsd(plan.fundedSize * (plan.ddLimitPct / 100))}`
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Result, {
						tone: "short",
						kicker: `Fail · +${fmtPct(plan.adverseMovePct)} · Evals sterben`,
						title: `Netto ${fmtUsd(plan.netFail, true)}`,
						titleClass: Math.abs(plan.netFail) < 1 ? "text-long" : plan.netFail > 0 ? "text-long" : "text-short",
						lines: [
							`Funded brutto ${fmtUsd(plan.fundedGrossAtFail)}`,
							`${fmtPct(plan.split * 100, 0)} Payout ${fmtUsd(plan.payoutAtFail)}`,
							`Eval-Kosten ${fmtUsd(plan.totalCost)}`
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Result, {
						tone: "long",
						kicker: `Pass · −${fmtPct(plan.favorableMovePct)} · Evals treffen das Target`,
						title: plan.fundedSurvives ? "Funded überleben" : "Funded sterben",
						titleClass: plan.fundedSurvives ? "text-long" : "text-short",
						lines: [
							`Neue Funded ${plan.numEvals}× ${fmtUsd(plan.evalSize)}`,
							`Verlust auf bestehenden Funded ${fmtUsd(plan.fundedLossAtPass)}`,
							`DD-Raum ${fmtUsd(plan.totalDDRoom)} · Auslastung ${fmtPct(plan.ddUsagePct)} von ${fmtPct(plan.ddLimitPct, 1)}`
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid gap-3 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						label: "Pass",
						value: fmtPct(plan.pPass * 100, 1),
						sub: "Random Walk, untere Barriere",
						tone: "long"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						label: "Fail",
						value: fmtPct(plan.pFail * 100, 1),
						sub: "Random Walk, obere Barriere",
						tone: "short"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						label: "Hedge-Ratio",
						value: plan.cNotional > 0 ? fmtRatio(plan.fNotional / plan.cNotional) : "—",
						sub: "Funded-Notional / Eval-Notional"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HedgeChart, { plan }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "mt-3 card overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "text-xs text-faint",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Kennzahl"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 text-right font-medium",
							children: "Wert"
						})]
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, {
							label: "Gesamtkosten Evals",
							value: fmtUsd(plan.totalCost)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, {
							label: "Funded Gesamt-Notional",
							value: fmtUsd(plan.fNotional)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, {
							label: "Hebel auf Funded",
							value: fmtLev(plan.fundedLeverage, 3)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, {
							label: "Fail-Netto",
							value: fmtUsd(plan.netFail, true),
							signed: plan.netFail
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, {
							label: "Pass DD-Auslastung",
							value: fmtPct(plan.ddUsagePct)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, {
							label: "Neue Funded bei Pass",
							value: `${plan.numEvals}× ${fmtUsd(plan.evalSize)}`
						})
					] })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 rounded-xl bg-raised p-4 text-sm leading-relaxed",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-medium text-short",
					children: "Hinweise"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "mt-2 space-y-1 text-muted",
					children: [plan.warnings.map((warning) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: warningText(warning) }, warning)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Cross-Account Opposite-Positionen sind bei fast allen Prop Firms verboten und können zur Kündigung und zur Verweigerung des Payouts führen." })]
				})]
			})
		]
	});
}
function HedgeChart({ plan }) {
	const points = (0, import_react.useMemo)(() => hedgeCurve(plan), [plan]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-3 card p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-semibold",
				children: "Payoff"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-xs text-muted",
				children: [
					"Positiv ist der Markt nach oben. Fail sitzt bei +",
					fmtPct(plan.adverseMovePct),
					", Pass bei −",
					fmtPct(plan.favorableMovePct),
					". Nach Split gilt nur auf dem Weg nach oben: Funded-Gewinn mal Split, abzüglich der Eval-Kosten."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block h-0.5 w-6 bg-short" }), "Eval"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block h-0.5 w-6 bg-long" }), "Funded"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block w-6 border-t border-dashed border-accent" }), "Summe"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block h-0.5 w-6 bg-preview" }), "Nach Split"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "payoff mt-2 h-64 w-full sm:h-72",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
						data: points,
						margin: {
							top: 18,
							right: 12,
							left: 0,
							bottom: 4
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
								vertical: false,
								stroke: "var(--color-line)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "move",
								type: "number",
								scale: "linear",
								domain: ["dataMin", "dataMax"],
								tickFormatter: (value) => `${value.toFixed(1)}%`,
								tickCount: 7,
								axisLine: false,
								tickLine: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								tickFormatter: (value) => fmtUsd(value),
								width: 72,
								axisLine: false,
								tickLine: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { content: ({ active, payload }) => {
								if (!active || !payload?.length) return null;
								const row = payload[0]?.payload;
								if (!row) return null;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-xl bg-bg px-3 py-2 font-mono text-xs",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-muted",
											children: [row.move.toFixed(2), "%"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-short",
											children: ["Eval ", fmtUsd(row.challenge, true)]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-long",
											children: ["Funded ", fmtUsd(row.funded, true)]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-accent",
											children: ["Summe ", fmtUsd(row.net, true)]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-preview",
											children: ["Nach Split ", fmtUsd(row.trader, true)]
										})
									]
								});
							} }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
								y: 0,
								stroke: "var(--color-faint)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
								x: plan.adverseMovePct,
								stroke: "var(--color-short)",
								strokeDasharray: "3 3",
								label: {
									value: "Fail",
									fill: "var(--color-short)",
									fontSize: 11,
									position: "insideTop"
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
								x: -plan.favorableMovePct,
								stroke: "var(--color-long)",
								strokeDasharray: "3 3",
								label: {
									value: "Pass",
									fill: "var(--color-long)",
									fontSize: 11,
									position: "insideTop"
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "linear",
								dataKey: "challenge",
								stroke: "var(--color-short)",
								dot: false,
								strokeWidth: 2,
								isAnimationActive: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "linear",
								dataKey: "funded",
								stroke: "var(--color-long)",
								dot: false,
								strokeWidth: 2,
								isAnimationActive: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "linear",
								dataKey: "net",
								stroke: "var(--color-accent)",
								strokeDasharray: "5 4",
								dot: false,
								strokeWidth: 1.5,
								isAnimationActive: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "linear",
								dataKey: "trader",
								stroke: "var(--color-preview)",
								dot: false,
								strokeWidth: 2,
								isAnimationActive: false
							})
						]
					})
				})
			})
		]
	});
}
function warningText(warning) {
	if (warning === "funded-dies") return "Im Pass verbrauchen die bestehenden Funded mehr als ihren Drawdown. Sie sterben mit.";
	if (warning === "dd-tight") return "Im Pass werden über 80 % des Funded-Drawdowns verbraucht.";
	if (warning === "tiny-move") return "Der Fail-Move ist sehr klein. Spread und Slippage können das Ergebnis drehen.";
	return "Im manuellen Modus deckt der Fail-Payout die Eval-Kosten nicht.";
}
function Result({ kicker, title, titleClass, lines, tone = "accent" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: cn("card border-l-2 p-4", tone === "short" && "border-short", tone === "long" && "border-long", tone === "accent" && "border-accent"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				children: kicker
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("mt-1 font-mono text-xl font-semibold tabular-nums", titleClass),
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 space-y-1 text-sm text-muted",
				children: lines.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: line }, line))
			})
		]
	});
}
function TableRow({ label, value, signed }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
		className: "border-t border-line",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
			className: "px-3 py-2",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
			className: "px-3 py-2 text-right font-mono tabular-nums",
			children: signed == null ? value : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Signed, {
				value: signed,
				text: value
			})
		})]
	});
}
function Metric({ label, value, sub, tone = "fg" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "card px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: `mt-1 font-mono text-lg font-semibold tabular-nums ${tone === "accent" ? "text-accent" : tone === "long" ? "text-long" : tone === "short" ? "text-short" : "text-fg"}`,
				children: value
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 truncate text-xs text-faint",
				children: sub
			})
		]
	});
}
function NumField({ id, label, value, unit, hint, min, max, step, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
			htmlFor: id,
			className: "mb-1 block text-xs text-muted",
			children: label
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id,
				type: "number",
				inputMode: "decimal",
				className: fieldClass,
				value: Number.isFinite(value) ? value : 0,
				min,
				max,
				step,
				onChange: (event) => {
					const next = event.target.value === "" ? 0 : Number(event.target.value);
					if (Number.isFinite(next)) onChange(next);
				}
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-8 shrink-0 text-xs text-muted",
				children: unit
			})]
		}),
		hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-xs text-faint",
			children: hint
		}) : null
	] });
}
function moneyHint(amount) {
	return Number.isFinite(amount) ? fmtUsd(amount) : "—";
}
function pctHint(size, pct) {
	if (!Number.isFinite(size) || !Number.isFinite(pct)) return "—";
	return `= ${fmtUsd(size * pct / 100)}`;
}
function fmtPct(n, digits = 2) {
	if (!Number.isFinite(n)) return "—";
	return `${n.toLocaleString("en-US", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	})}%`;
}
function fmtLev(n, digits) {
	if (!Number.isFinite(n)) return "—";
	return `${n.toLocaleString("en-US", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	})}×`;
}
function fmtRatio(n) {
	if (!Number.isFinite(n)) return "—";
	return `${n.toLocaleString("en-US", {
		minimumFractionDigits: 3,
		maximumFractionDigits: 3
	})}×`;
}
function maxForwardDays(legs, now) {
	let max = 0;
	for (const leg of legs) {
		if (leg.perpetual || leg.expiry == null) continue;
		max = Math.max(max, (leg.expiry - now) / 864e5);
	}
	return max > 0 ? max : 0;
}
var THEME_KEY = "position-builder.theme";
var PAPER = "#e7eaef";
var INK = "#07080a";
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
var MODULE_KEY = "position-builder.module";
function Desk() {
	const hydrate = useBook((state) => state.hydrate);
	const currency = useBook((state) => state.currency);
	const settle = useBook((state) => state.settle);
	const setCurrency = useBook((state) => state.setCurrency);
	const setSettle = useBook((state) => state.setSettle);
	const days = useBook((state) => state.daysForward);
	const setDays = useBook((state) => state.setDaysForward);
	const legs = useBook((state) => state.books[bookId(currency, settle)]);
	const now = useMarket((state) => state.now);
	const setFeedBook = useMarket((state) => state.setBook);
	const [module, setModule] = (0, import_react.useState)("builder");
	const [theme, setTheme] = (0, import_react.useState)("dark");
	const [percentMode, setPercentMode] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		hydrate();
		const state = useBook.getState();
		ensureFeed(bookId(state.currency, state.settle));
		const saved = window.localStorage.getItem(MODULE_KEY);
		if (saved === "hedge" || saved === "builder" || saved === "hydra") setModule(saved);
		setTheme(currentTheme());
	}, [hydrate]);
	(0, import_react.useEffect)(() => {
		const max = maxForwardDays(legs, now);
		if (max > 0 && days > max + .001) setDays(max);
	}, [
		legs,
		now,
		days,
		setDays
	]);
	const selectModule = (next) => {
		setModule(next);
		window.localStorage.setItem(MODULE_KEY, next);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "desk-shell min-h-screen bg-bg text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative z-10 flex min-h-screen w-full min-w-0 flex-col gap-3 px-3 py-3 lg:px-5 lg:py-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
					theme,
					position: "top-center",
					toastOptions: { style: {
						background: "var(--color-raised)",
						color: "var(--color-fg)",
						border: "none",
						boxShadow: "var(--shadow-card)"
					} }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
					module,
					theme,
					onTheme: () => setTheme(toggleTheme()),
					onModule: selectModule,
					onSelect: (nextCurrency, nextSettle) => {
						setPercentMode(false);
						setCurrency(nextCurrency);
						setSettle(nextSettle);
						setFeedBook(bookId(nextCurrency, nextSettle));
					},
					percentMode,
					onPercent: () => setPercentMode(true)
				}),
				module === "hedge" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HedgeOptimizer, {}) : module === "hydra" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FirmDesk, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HydraAdvisor, { onOpenOptimizer: () => selectModule("hedge") })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HydraKpis, { percentMode }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "card min-w-0",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HydraPayoff, { percentMode })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "card min-w-0",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PropAccounts, { percentMode })
					})
				] })
			]
		})
	});
}
function Header({ module, theme, onTheme, onModule, onSelect, percentMode, onPercent }) {
	const currency = useBook((state) => state.currency);
	const settle = useBook((state) => state.settle);
	const index = useMarket((state) => state.index);
	const prev = useMarket((state) => state.prevIndex);
	const status = useMarket((state) => state.status);
	const transport = useMarket((state) => state.transport);
	const source = useMarket((state) => state.source);
	const error = useMarket((state) => state.error);
	const up = index >= prev;
	const statusLabel = status === "live" ? source === "derive" ? transport === "poll" ? "Derive poll" : "Derive" : transport === "poll" ? "Polling" : "Live" : status === "offline" ? "Offline" : status === "reconnecting" ? "Reconnecting" : "Connecting";
	const quote = ["BTC", "ETH"].includes(currency) ? currency : "ETH";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "card flex flex-wrap items-center gap-3 px-4 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-base font-semibold tracking-tight",
					children: "Hydra Loop"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "hidden text-xs text-muted sm:block",
					children: module === "hedge" ? "Opposite-position optimizer" : module === "hydra" ? "Firms, fees, rotation" : "Eval costs, funded buffer, fee-synced size"
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex rounded-full bg-bg p-1",
				role: "tablist",
				"aria-label": "Module",
				children: [
					["builder", "Loop"],
					["hedge", "Optimizer"],
					["hydra", "Strategie"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					role: "tab",
					"aria-selected": module === id,
					onClick: () => onModule(id),
					className: cn("h-9 min-w-14 rounded-full px-3 text-sm font-medium", module === id ? "bg-fg text-bg" : "text-muted"),
					children: label
				}, id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex rounded-full bg-bg p-1",
				children: [["BTC", "ETH"].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onSelect(item, settle),
					className: cn("h-9 min-w-14 rounded-full px-3 text-sm font-medium", !percentMode && quote === item ? "bg-fg text-bg" : "text-muted"),
					children: item
				}, item)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onPercent,
					className: cn("h-9 rounded-full px-3 text-sm font-medium", percentMode ? "bg-fg text-bg" : "text-muted"),
					children: "% Move"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ml-auto flex items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg text-fg",
						"aria-label": theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
						title: theme === "dark" ? "Light mode" : "Dark mode",
						onClick: onTheme,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "theme-swap",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "sun",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, {
									className: "h-4 w-4",
									"aria-hidden": true
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "moon",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, {
									className: "h-4 w-4",
									"aria-hidden": true
								})
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-right",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: percentMode ? "Entry 100" : `${currency} index`
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-center justify-end gap-1 font-mono text-2xl tabular-nums tracking-tight",
							children: [percentMode ? "100" : index > 0 ? fmtIndex(index) : "—", !percentMode && index > 0 && index !== prev ? up ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, {
								className: "h-4 w-4 text-long",
								"aria-hidden": true
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
								className: "h-4 w-4 text-short",
								"aria-hidden": true
							}) : null]
						})]
					}),
					percentMode && index > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-right",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted",
							children: [currency, " für Coins"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-lg tabular-nums",
							children: fmtIndex(index)
						})]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "inline-flex items-center gap-2 rounded-full bg-bg px-3 py-2 text-sm",
						title: source === "derive" ? "Deribit did not connect. Public Derive socket is the backup." : "Deribit public market data",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("inline-block h-2 w-2 rounded-full", status === "live" && "bg-long", (status === "connecting" || status === "reconnecting") && "bg-accent", status === "offline" && "bg-short") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted",
							children: statusLabel
						})]
					})
				]
			}),
			error && status !== "live" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "w-full text-xs text-short",
				children: error
			}) : null
		]
	});
}
function Mark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 32 32",
		className: "h-8 w-8 shrink-0",
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				width: "32",
				height: "32",
				rx: "6",
				fill: "var(--color-raised)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M5 23 H13 L17 9 H27",
				fill: "none",
				stroke: "var(--color-short)",
				strokeWidth: "1.7"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M5 25 C11 25 13 18 16 16 C19 14 21 7 27 7",
				fill: "none",
				stroke: "var(--color-long)",
				strokeWidth: "1.7"
			})
		]
	});
}
var SplitComponent = Desk;
//#endregion
export { SplitComponent as component };
