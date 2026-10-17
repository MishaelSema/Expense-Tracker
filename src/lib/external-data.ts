/**
 * Server-only helpers for the small amount of outside information Ledger shows:
 * exchange rates from Frankfurter (no API key, commercial use allowed) and
 * financial headlines from an optional news provider.
 *
 * Everything degrades to `null` / `[]` on failure, so the UI never breaks when a
 * third party is slow or a key is missing.
 */

const RATES_REVALIDATE = 60 * 60 * 6; // 6 hours — Frankfurter updates daily
const NEWS_REVALIDATE = 60 * 30; // 30 minutes

export interface RatesSnapshot {
  base: string;
  date: string;
  rates: Record<string, number>;
  fetchedAt: string;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
  image?: string;
}

/** Currencies worth surfacing next to XAF (the Central African CFA franc). */
export const DEFAULT_QUOTES = ["USD", "XAF", "GBP", "NGN", "GHS", "CAD", "CHF"];

const RATES_BASE = "EUR";

/**
 * Latest reference rates from Frankfurter. Base is EUR, so `rates.XAF` is how
 * many francs one euro buys. No API key required.
 */
export async function getRates(quotes: string[] = DEFAULT_QUOTES): Promise<RatesSnapshot | null> {
  try {
    const url = `https://api.frankfurter.dev/v2/rates?base=${RATES_BASE}&quotes=${quotes.join(",")}`;
    const res = await fetch(url, { next: { revalidate: RATES_REVALIDATE } });
    if (!res.ok) return null;

    const rows = (await res.json()) as Array<{
      date?: string;
      quote?: string;
      rate?: number;
    }>;
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const rates: Record<string, number> = { [RATES_BASE]: 1 };
    let date = "";
    for (const row of rows) {
      if (!row || typeof row.quote !== "string" || typeof row.rate !== "number") continue;
      rates[row.quote] = row.rate;
      if (row.date) date = row.date;
    }
    if (!date) return null;

    return { base: RATES_BASE, date, rates, fetchedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

/** True when a news provider key is present. */
export function newsConfigured(): boolean {
  return Boolean(process.env.NEWS_API_KEY);
}

/**
 * Financial headlines. Returns `[]` when no key is configured, so the feature
 * can be switched on later without any code change.
 *
 * Set NEWS_PROVIDER=finnhub to use Finnhub instead of the default Marketaux.
 */
export async function getNews(limit = 6): Promise<NewsItem[]> {
  const key = process.env.NEWS_API_KEY;
  if (!key) return [];

  const provider = (process.env.NEWS_PROVIDER || "marketaux").toLowerCase();
  try {
    if (provider === "finnhub") return await fetchFinnhub(key, limit);
    return await fetchMarketaux(key, limit);
  } catch {
    return [];
  }
}

async function fetchMarketaux(key: string, limit: number): Promise<NewsItem[]> {
  const url = `https://api.marketaux.com/v1/news/all?language=en&filter_entities=true&limit=${limit}&api_token=${key}`;
  const res = await fetch(url, { next: { revalidate: NEWS_REVALIDATE } });
  if (!res.ok) return [];

  const json = (await res.json()) as {
    data?: Array<{
      title?: string;
      description?: string;
      snippet?: string;
      url?: string;
      image_url?: string;
      source?: string;
      published_at?: string;
    }>;
  };

  return (json.data ?? [])
    .filter((a) => a.title && a.url)
    .map((a) => ({
      title: String(a.title),
      url: String(a.url),
      source: a.source ? String(a.source) : "Marketaux",
      publishedAt: a.published_at ? String(a.published_at) : new Date().toISOString(),
      summary: a.description || a.snippet || undefined,
      image: a.image_url || undefined,
    }));
}

async function fetchFinnhub(key: string, limit: number): Promise<NewsItem[]> {
  const url = `https://finnhub.io/api/v1/news?category=general&token=${key}`;
  const res = await fetch(url, { next: { revalidate: NEWS_REVALIDATE } });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<{
    headline?: string;
    summary?: string;
    url?: string;
    image?: string;
    source?: string;
    datetime?: number;
  }>;
  if (!Array.isArray(data)) return [];

  return data
    .filter((a) => a.headline && a.url)
    .slice(0, limit)
    .map((a) => ({
      title: String(a.headline),
      url: String(a.url),
      source: a.source ? String(a.source) : "Finnhub",
      publishedAt: a.datetime
        ? new Date(a.datetime * 1000).toISOString()
        : new Date().toISOString(),
      summary: a.summary || undefined,
      image: a.image || undefined,
    }));
}
