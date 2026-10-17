/**
 * Canonical site URL, used for metadata, sitemap and robots.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://ledger.app).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "https://ledger.app"
).replace(/\/+$/, "");

export const SITE_NAME = "Ledger";

export const SITE_DESCRIPTION =
  "A calm, private place to track income and spending, plan budgets, and reach your goals.";

export const SITE_TAGLINE = "Ledger — calm money for students";
