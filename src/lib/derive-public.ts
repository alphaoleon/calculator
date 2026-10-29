import { createServerFn } from "@tanstack/react-start";

const METHODS = new Set([
  "public/get_currency",
  "public/get_all_instruments",
  "public/get_tickers",
]);

const CURRENCIES = new Set(["BTC", "ETH", "SOL", "HYPE"]);

type PublicCall = {
  method: string;
  params: Record<string, string | number | boolean>;
};

function cleanCall(input: unknown): PublicCall {
  if (!input || typeof input !== "object") throw new Error("bad request");
  const method = (input as { method?: unknown }).method;
  const params = (input as { params?: unknown }).params;
  if (typeof method !== "string" || !METHODS.has(method)) throw new Error("method not allowed");
  if (!params || typeof params !== "object") throw new Error("bad params");
  const clean: Record<string, string | number | boolean> = {};
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
  return { method, params: clean };
}

/** Public Derive read. The browser uses this when their socket is blocked. */
export const fetchDerive = createServerFn({ method: "POST" })
  .validator(cleanCall)
  .handler(async ({ data }) => {
    const response = await fetch(`https://api.derive.xyz/v3/${data.method}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(data.params),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Derive ${response.status}`);
    const json = (await response.json()) as { result?: unknown; error?: { message?: string } };
    if (json.error) throw new Error(json.error.message || "Derive error");
    return json.result ?? null;
  });
