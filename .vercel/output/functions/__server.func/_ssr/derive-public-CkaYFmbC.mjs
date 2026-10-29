import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/derive-public-CkaYFmbC.js
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
var fetchDerive_createServerFn_handler = createServerRpc({
	id: "68fc9cfa76a1152d748e7581eed7103c405b842372b50c9e26464ca80623e2e9",
	name: "fetchDerive",
	filename: "src/lib/derive-public.ts"
}, (opts) => fetchDerive.__executeServer(opts));
var fetchDerive = createServerFn({ method: "POST" }).validator(cleanCall).handler(fetchDerive_createServerFn_handler, async ({ data }) => {
	const response = await fetch(`https://api.derive.xyz/v3/${data.method}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			accept: "application/json"
		},
		body: JSON.stringify(data.params),
		signal: AbortSignal.timeout(2e4)
	});
	if (!response.ok) throw new Error(`Derive ${response.status}`);
	const json = await response.json();
	if (json.error) throw new Error(json.error.message || "Derive error");
	return json.result ?? null;
});
//#endregion
export { fetchDerive_createServerFn_handler };
