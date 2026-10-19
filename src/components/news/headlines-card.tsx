import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightIcon } from "@/components/ui/icons";
import { formatRelative } from "@/lib/format";
import type { NewsItem } from "@/lib/external-data";

/**
 * Financial headlines, shared by the Overview and the Market page so both
 * show the same feed. Purely presentational — safe in server and client
 * components alike (NewsItem is a type-only import).
 */
export function HeadlinesCard({
  items,
  limit,
  moreHref,
  moreLabel = "Market",
}: {
  items: NewsItem[];
  limit?: number;
  moreHref?: string;
  moreLabel?: string;
}) {
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Headlines</CardTitle>
        {moreHref && (
          <Link
            href={moreHref}
            className="text-[14px] text-[var(--accent)] flex items-center gap-1 pressable"
          >
            {moreLabel}
            <ArrowRightIcon width={15} height={15} />
          </Link>
        )}
      </CardHeader>
      <CardBody className="pt-1">
        {shown.length === 0 ? (
          <p className="py-2 text-[15px] text-[var(--foreground-secondary)]">
            No headlines right now. Check back soon.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--separator)]">
            {shown.map((item) => (
              <li key={item.url} className="py-3.5 first:pt-2 last:pb-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--foreground-secondary)]">
                    {item.source} · {formatRelative(item.publishedAt)}
                  </p>
                  <p className="mt-1 text-[15.5px] font-medium leading-snug text-[var(--foreground)] group-hover:text-[var(--accent)]">
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-[var(--foreground-secondary)]">
                      {item.summary}
                    </p>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
