/**
 * Server-only helpers for the small amount of outside information Ledger shows:
 * exchange rates from Frankfurter (no API key, commercial use allowed) and
 * financial headlines gathered from many providers' public feeds (with an
 * optional keyed API on top when NEWS_API_KEY is set).
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

/**
 * Financial feeds used when no provider key is configured — and as a fallback
 * when a keyed provider returns nothing. Every one of them publishes without
 * an API key, so headlines work out of the box.
 *
 * Ordered by how finance-specific they are: dedicated outlets first, general
 * aggregators last.
 */
const NEWS_SOURCES: Array<{ name: string; url: string }> = [
  {
    name: "CNBC",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
  },
  {
    name: "CNBC",
    url: "https://www.cnbc.com/id/10000664/device/rss/rss.html",
  },
  {
    name: "MarketWatch",
    url: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
  },
  {
    name: "MarketWatch",
    url: "https://feeds.content.dowjones.io/public/rss/mw_marketpulse",
  },
  { name: "Investing.com", url: "https://www.investing.com/rss/news_25.rss" },
  { name: "Investing.com", url: "https://www.investing.com/rss/news_1.rss" },
  { name: "FXStreet", url: "https://www.fxstreet.com/rss" },
  { name: "Seeking Alpha", url: "https://seekingalpha.com/market_currents.xml" },
  {
    name: "The Economist",
    url: "https://www.economist.com/finance-and-economics/rss.xml",
  },
  { name: "Financial Times", url: "https://www.ft.com/rss/home" },
  {
    name: "Google News",
    url: "https://news.google.com/rss/search?q=markets%20OR%20forex%20OR%20stocks%20OR%20economy&hl=en-US&gl=US&ceid=US:en",
  },
];

const FEED_REVALIDATE = 60 * 60 * 6; // a few refreshes a day, well past "daily"
const FEED_TIMEOUT_MS = 8000;
const FEED_CACHE_TTL = 1000 * 60 * 60;
const FEED_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// Feeds rarely change within the hour; a short in-memory cache keeps a burst
// of page views from hammering them (belt and braces over Next's data cache).
let feedCache: { at: number; items: NewsItem[] } | null = null;

/**
 * Headlines from many financial sources.
 *
 * A keyed provider (Marketaux/Finnhub) is used when NEWS_API_KEY is set; the
 * RSS sources below are used otherwise, or when the provider comes back
 * empty — a missing key should never mean an empty page.
 *
 * Set NEWS_PROVIDER=finnhub to use Finnhub instead of the default Marketaux.
 */
export async function getNews(limit = 10): Promise<NewsItem[]> {
  const key = process.env.NEWS_API_KEY;
  try {
    if (key) {
      const provider = (process.env.NEWS_PROVIDER || "marketaux").toLowerCase();
      const items =
        provider === "finnhub"
          ? await fetchFinnhub(key, limit)
          : await fetchMarketaux(key, limit);
      if (items.length > 0) return items;
    }
    return (await getFeedNews()).slice(0, limit);
  } catch {
    return [];
  }
}

/** Aggregated, de-duplicated headlines from the RSS sources above. */
async function getFeedNews(): Promise<NewsItem[]> {
  if (feedCache && Date.now() - feedCache.at < FEED_CACHE_TTL) {
    return feedCache.items;
  }

  const settled = await Promise.allSettled(NEWS_SOURCES.map(fetchFeed));
  const lists = settled
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .map((r) => r.value.slice(0, 5));

  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const merged: NewsItem[] = [];

  // Round-robin across sources so one fast feed can't crowd out the rest.
  const rounds = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < rounds; i++) {
    for (const list of lists) {
      const item = list[i];
      if (!item) continue;
      const url = canonicalUrl(item.url);
      const title = canonicalTitle(item.title);
      if (seenUrls.has(url) || seenTitles.has(title)) continue;
      seenUrls.add(url);
      seenTitles.add(title);
      merged.push(item);
    }
  }

  const items = merged
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, 24);

  feedCache = { at: Date.now(), items };
  return items;
}

async function fetchFeed(source: { name: string; url: string }): Promise<NewsItem[]> {
  const res = await fetch(source.url, {
    headers: {
      "User-Agent": FEED_UA,
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    next: { revalidate: FEED_REVALIDATE },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) return [];
  return parseFeed(await res.text(), source.name);
}

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const param of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ]) {
      url.searchParams.delete(param);
    }
    url.hash = "";
    return `${url.origin}${url.pathname.replace(/\/$/, "")}${url.search}`;
  } catch {
    return value;
  }
}

function canonicalTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 80);
}

function stripCdata(value: string): string {
  const match = value.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return match ? match[1] : value;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Number(digits)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripHtml(text: string): string {
  return decodeEntities(text.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(block: string, name: string): string | null {
  const match = block.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i")
  );
  if (!match) return null;
  const value = decodeEntities(stripCdata(match[1].trim())).trim();
  return value || null;
}

/**
 * Minimal, tolerant RSS/Atom item reader. Hand-rolled on purpose: the feeds
 * above are simple, and a zero-dependency parser keeps the Market page fast.
 */
function parseFeed(xml: string, fallbackSource: string): NewsItem[] {
  const blocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  const items: NewsItem[] = [];

  for (const block of blocks) {
    const rawTitle = readTag(block, "title");
    if (!rawTitle) continue;

    const link =
      readTag(block, "link") ??
      block.match(/<link[^>]+href="([^"]+)"/i)?.[1] ??
      "";
    if (!link) continue;

    const publisher = readTag(block, "source");
    const source = publisher || fallbackSource;
    // Google News appends the publisher to the headline ("… — CNBC").
    const title =
      publisher && rawTitle.endsWith(` - ${publisher}`)
        ? rawTitle.slice(0, rawTitle.length - publisher.length - 3)
        : rawTitle;

    const dateText =
      readTag(block, "pubDate") ?? readTag(block, "updated") ?? readTag(block, "published");
    const parsed = dateText ? new Date(dateText) : null;

    const summary =
      readTag(block, "description") ??
      readTag(block, "summary") ??
      "";

    items.push({
      title: stripHtml(title),
      url: link.trim(),
      source,
      publishedAt:
        parsed && !Number.isNaN(parsed.getTime())
          ? parsed.toISOString()
          : new Date().toISOString(),
      summary: summary ? stripHtml(summary).slice(0, 220) : undefined,
    });
  }

  return items;
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
