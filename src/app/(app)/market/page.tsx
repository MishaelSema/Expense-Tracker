import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { RateConverter } from "@/components/market/rate-converter";
import { HeadlinesCard } from "@/components/news/headlines-card";
import { getRates, getNews } from "@/lib/external-data";
import { formatDate } from "@/lib/format";

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
    ? Object.keys(rates.rates)
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
      <HeadlinesCard items={news} />
    </div>
  );
}
