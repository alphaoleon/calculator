export type LiveGroup = "crypto" | "tradfi";

export type LiveMarket = {
  id: string;
  symbol: string;
  group: LiveGroup;
};

/** Coin names are Hyperliquid perp keys. TradFi lives on the xyz HIP-3 dex. */
export const LIVE_MARKETS: LiveMarket[] = [
  { id: "BTC", symbol: "BTC", group: "crypto" },
  { id: "ETH", symbol: "ETH", group: "crypto" },
  { id: "SOL", symbol: "SOL", group: "crypto" },
  { id: "HYPE", symbol: "HYPE", group: "crypto" },
  { id: "BNB", symbol: "BNB", group: "crypto" },
  { id: "XRP", symbol: "XRP", group: "crypto" },
  { id: "DOGE", symbol: "DOGE", group: "crypto" },
  { id: "ADA", symbol: "ADA", group: "crypto" },
  { id: "AVAX", symbol: "AVAX", group: "crypto" },
  { id: "LINK", symbol: "LINK", group: "crypto" },
  { id: "SUI", symbol: "SUI", group: "crypto" },
  { id: "TON", symbol: "TON", group: "crypto" },
  { id: "LTC", symbol: "LTC", group: "crypto" },
  { id: "BCH", symbol: "BCH", group: "crypto" },
  { id: "DOT", symbol: "DOT", group: "crypto" },
  { id: "NEAR", symbol: "NEAR", group: "crypto" },
  { id: "APT", symbol: "APT", group: "crypto" },
  { id: "ARB", symbol: "ARB", group: "crypto" },
  { id: "OP", symbol: "OP", group: "crypto" },
  { id: "UNI", symbol: "UNI", group: "crypto" },
  { id: "AAVE", symbol: "AAVE", group: "crypto" },
  { id: "TRX", symbol: "TRX", group: "crypto" },
  { id: "TIA", symbol: "TIA", group: "crypto" },
  { id: "SEI", symbol: "SEI", group: "crypto" },
  { id: "INJ", symbol: "INJ", group: "crypto" },
  { id: "TAO", symbol: "TAO", group: "crypto" },
  { id: "WLD", symbol: "WLD", group: "crypto" },
  { id: "kPEPE", symbol: "kPEPE", group: "crypto" },
  { id: "Gold", symbol: "xyz:GOLD", group: "tradfi" },
  { id: "Silber", symbol: "xyz:SILVER", group: "tradfi" },
  { id: "Platin", symbol: "xyz:PLATINUM", group: "tradfi" },
  { id: "Palladium", symbol: "xyz:PALLADIUM", group: "tradfi" },
  { id: "Öl", symbol: "xyz:CL", group: "tradfi" },
  { id: "Brent", symbol: "xyz:BRENTOIL", group: "tradfi" },
  { id: "Gas", symbol: "xyz:NATGAS", group: "tradfi" },
  { id: "Kupfer", symbol: "xyz:COPPER", group: "tradfi" },
  { id: "Nasdaq", symbol: "xyz:XYZ100", group: "tradfi" },
  { id: "S&P", symbol: "xyz:SP500", group: "tradfi" },
  { id: "NVDA", symbol: "xyz:NVDA", group: "tradfi" },
  { id: "TSLA", symbol: "xyz:TSLA", group: "tradfi" },
  { id: "AAPL", symbol: "xyz:AAPL", group: "tradfi" },
  { id: "MSFT", symbol: "xyz:MSFT", group: "tradfi" },
  { id: "GOOGL", symbol: "xyz:GOOGL", group: "tradfi" },
  { id: "AMZN", symbol: "xyz:AMZN", group: "tradfi" },
  { id: "META", symbol: "xyz:META", group: "tradfi" },
  { id: "MSTR", symbol: "xyz:MSTR", group: "tradfi" },
];

export type LiveQuote = { price: number; futures: boolean };

const CACHE_KEY = "position-builder.hl-mids.v1";
let memory: Record<string, number> = {};

/** Mid prices from Hyperliquid. A missing TradFi print keeps the last good price. */
export async function fetchLiveQuotes(): Promise<Record<string, LiveQuote>> {
  const [main, xyz] = await Promise.all([loadMids(), loadMids("xyz")]);
  const book = { ...main, ...xyz };
  const cached = { ...readCache(), ...memory };
  const out: Record<string, LiveQuote> = {};
  for (const market of LIVE_MARKETS) {
    const live = pick(book, market.symbol);
    if (live != null) {
      cached[market.symbol] = live;
      out[market.symbol] = { price: live, futures: true };
    } else if (cached[market.symbol] > 0) {
      out[market.symbol] = { price: cached[market.symbol], futures: false };
    }
  }
  memory = cached;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    /* ignore quota */
  }
  return out;
}

function pick(book: Record<string, string>, symbol: string): number | null {
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

function readCache(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const price = Number(value);
      if (price > 0) out[key] = price;
    }
    return out;
  } catch {
    return {};
  }
}

async function loadMids(dex?: string): Promise<Record<string, string>> {
  try {
    const response = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dex ? { type: "allMids", dex } : { type: "allMids" }),
    });
    if (!response.ok) return {};
    const body = (await response.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return {};
    return body as Record<string, string>;
  } catch {
    return {};
  }
}
