import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/deribit-public-BFLu1nHb.js
var METHODS = /* @__PURE__ */ new Set([
	"public/get_index_price",
	"public/get_instruments",
	"public/get_book_summary_by_currency",
	"public/get_volatility_index_data"
]);
function cleanCall(input) {
	if (!input || typeof input !== "object") throw new Error("bad request");
	const method = input.method;
	const query = input.query;
	if (typeof method !== "string" || !METHODS.has(method)) throw new Error("method not allowed");
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
var fetchDeribit_createServerFn_handler = createServerRpc({
	id: "7c9b478a7b6fe28493e24faf266f62ff2ba4397c816ad242ec025257b3ea47c1",
	name: "fetchDeribit",
	filename: "src/lib/deribit-public.ts"
}, (opts) => fetchDeribit.__executeServer(opts));
var fetchDeribit = createServerFn({ method: "GET" }).validator(cleanCall).handler(fetchDeribit_createServerFn_handler, async ({ data }) => {
	const url = new URL(`https://www.deribit.com/api/v2/${data.method}`);
	for (const [key, value] of Object.entries(data.query)) url.searchParams.set(key, value);
	const response = await fetch(url, { signal: AbortSignal.timeout(2e4) });
	if (!response.ok) throw new Error(`Deribit ${response.status}`);
	const json = await response.json();
	if (json.error) throw new Error(json.error.message || "Deribit error");
	return json.result ?? null;
});
//#endregion
export { fetchDeribit_createServerFn_handler };
