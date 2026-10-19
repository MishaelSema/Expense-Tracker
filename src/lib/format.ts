export function formatCurrency(
  amount: number,
  options: { currency?: string; showSign?: boolean; compact?: boolean } = {}
): string {
  const { currency = "XAF", showSign = false, compact = false } = options;
  const value = Math.abs(amount);

  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency === "XAF" ? "XAF" : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(value);

  if (!showSign) return formatted;
  return `${amount < 0 ? "\u2212" : "+"}${formatted}`;
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Date-only values — a transaction day, a due date — are calendar dates, not
 * instants. They round-trip through the database as UTC midnight, which prints
 * the *previous* day in any timezone behind UTC, leaving the server and the
 * browser disagreeing (and the day sliding out from under the user). Reading
 * them as local dates means everyone sees the day the record means.
 */
export function parseDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}(T00:00:00(?:\.000)?Z?)?$/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export function formatDate(date: Date | string, style: "short" | "long" = "short"): string {
  const d = parseDate(date);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  }).format(d);
}

export function formatRelative(date: Date | string): string {
  const d = parseDate(date);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86400000
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays === -1) return "Tomorrow";
  return formatDate(d, "short");
}

export function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}
