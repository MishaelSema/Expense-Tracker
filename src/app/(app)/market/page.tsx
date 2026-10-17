import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { RateConverter } from "@/components/market/rate-converter";
import { getRates, getNews } from "@/lib/external-data";
import { formatDate, formatRelative } from "@/lib/format";

export const metadata = { title: "Market" };

/** The order rates are listed in, with XAF first since it is the app default. */
const PRIORITY = ["XAF", "USD", "GBP", "NGN", "GHS", "CAD", "CHF"];

function formatRate(value: number): string {
  const digits = value >= 100 ? 2 : value >= 1 ? 4 : 6;
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

export default async function MarketPage() {
  const [rates, news] = await Promise.all([getRates(), getNews()]);

  const listed = rates
    ? Object.keys(rates)
        .filter((code) => code !== rates.base)
        .sort((a, b) => {
          const ia = PRIORITY.indexOf(a);
          const ib = PRIORITY.indexOf(b);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market"
        subtitle="Reference exchange rates and financial headlines."
      />

      {/* Exchange rates */}
      {rates ? (
        <Card>
          <CardHeader>
            <CardTitle>Exchange rates</CardTitle>
            <span className="text-[13px] text-[var(--foreground-secondary)]">
              {formatDate(rates.date)}
            </span>
          </CardHeader>
          <CardBody className="space-y-5 pt-3">
            <RateConverter base={rates.base} rates={rates.rates} />

            <div className="divide-y divide-[var(--separator)] border-t border-[var(--separator)]">
              {listed.map((code) => (
                <div key={code} className="flex items-center justify-between py-2.5">
                  <span className="text-[14px] text-[var(--foreground-secondary)]">
                    1 {rates.base} =
                  </span>
                  <span className="text-[15px] font-medium tabular-nums text-[var(--foreground)]">
                    {formatRate(rates.rates[code])}{" "}
                    <span className="text-[var(--foreground-secondary)]">{code}</span>
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[12px] leading-relaxed text-[var(--foreground-secondary)]">
              Indicative reference rates, updated daily from central-bank data via Frankfurter.
              Not for trading.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Exchange rates</CardTitle>
          </CardHeader>
          <CardBody className="pt-3">
            <p className="text-[15px] text-[var(--foreground-secondary)]">
              Rates are unavailable right now. Please try again shortly.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Headlines */}
      <Card>
        <CardHeader>
          <CardTitle>Headlines</CardTitle>
        </CardHeader>
        <CardBody className="pt-1">
          {news.length === 0 ? (
            <p className="py-2 text-[15px] text-[var(--foreground-secondary)]">
              No headlines right now. Check back soon.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--separator)]">
              {news.map((item) => (
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
    </div>
  );
}
