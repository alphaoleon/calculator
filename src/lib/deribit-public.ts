import { createServerFn } from "@tanstack/react-start";

const METHODS = new Set([
  "public/get_index_price",
  "public/get_instruments",
  "public/get_book_summary_by_currency",
  "public/get_volatility_index_data",
]);

type PublicCall = {
  method: string;
  query: Record<string, string>;
};

function cleanCall(input: unknown): PublicCall {
  if (!input || typeof input !== "object") throw new Error("bad request");
  const method = (input as { method?: unknown }).method;
  const query = (input as { query?: unknown }).query;
  if (typeof method !== "string" || !METHODS.has(method)) throw new Error("method not allowed");
  if (!query || typeof query !== "object") throw new Error("bad query");
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (!/^[a-z0-9_]+$/i.test(key)) continue;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;
    clean[key] = String(value).slice(0, 64);
  }
  return { method, query: clean };
}

/** Public Deribit read, fetched by our server so the browser does not have to open their socket. */
export const fetchDeribit = createServerFn({ method: "GET" })
  .validator(cleanCall)
  .handler(async ({ data }) => {
    const url = new URL(`https://www.deribit.com/api/v2/${data.method}`);
    for (const [key, value] of Object.entries(data.query)) url.searchParams.set(key, value);
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Deribit ${response.status}`);
    const json = (await response.json()) as { result?: unknown; error?: { message?: string } };
    if (json.error) throw new Error(json.error.message || "Deribit error");
    return json.result ?? null;
  });
