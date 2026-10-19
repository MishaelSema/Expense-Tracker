/**
 * Canonical site URL, used for metadata, sitemap and robots — and, through
 * appUrl(), for every link we place in an email or push notification.
 *
 * Bases are reduced to their origin. The app is always served from the domain
 * root, so a stray path in a configured value (typically a page address that
 * got copy-pasted, e.g. `https://host/login`) would otherwise poison every
 * generated link — emails and the sitemap would all 404 on `/login/...`.
 *
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://ledger.app).
 */
function originOf(value?: string): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    // Relative or scheme-less values can't act as a base; fall through.
    return null;
  }
}

export const SITE_URL =
  originOf(process.env.NEXT_PUBLIC_SITE_URL) ??
  originOf(process.env.APP_URL) ??
  originOf(process.env.NEXTAUTH_URL) ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null) ??
  "https://ledger.app";

/** Absolute URL for a path in the app: `appUrl("/reminders")`. */
export function appUrl(path = ""): string {
  if (!path) return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_NAME = "Ledger";

export const SITE_DESCRIPTION =
  "A calm, private place to track income and spending, plan budgets, and reach your goals.";

export const SITE_TAGLINE = "Ledger — calm money for students";
