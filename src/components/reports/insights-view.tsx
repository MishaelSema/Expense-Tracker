"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, parseDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface InsightTransaction {
  type: string;
  amount: number;
  category: string;
  /** ISO string; bucketed as a calendar date via parseDate, like Activity. */
  date: string;
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DatedTx extends InsightTransaction {
  d: Date;
}

interface Summary {
  income: number;
  expense: number;
  count: number;
  categories: { category: string; amount: number }[];
}

function signedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "\u2212" : "";
  return `${sign}${Math.abs(value)}%`;
}

function barHeight(value: number, scale: number): number | string {
  if (value <= 0) return 0;
  return `max(3px, ${((value / scale) * 100).toFixed(2)}%)`;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors pressable",
        active
          ? "border-transparent bg-[var(--accent)] text-white"
          : "border-[var(--separator)] bg-[var(--surface)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Insights for any period the account holds: drill into a past month or a
 * whole year with the chips, or step back to all time. Every figure — totals,
 * the comparison, the categories and the chart — is derived for the selected
 * period from the single transaction list the server passed down, so switching
 * periods is instant.
 */
export function InsightsView({ transactions }: { transactions: InsightTransaction[] }) {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1; // 1–12

  const dated: DatedTx[] = transactions.map((t) => ({ ...t, d: parseDate(t.date) }));

  // Years the account actually holds, newest first; the current year is always
  // offered even before this year has any transactions.
  const yearSet = new Set<number>([nowYear]);
  for (const t of dated) yearSet.add(t.d.getFullYear());
  const years = Array.from(yearSet).sort((a, b) => b - a);

  const [year, setYear] = useState<number | "all">(nowYear);
  const [month, setMonth] = useState<number | "all">(nowMonth);

  const allTime = year === "all";

  // Months to offer for the chosen year: any month with data, plus the month
  // we are in now for the current year.
  const monthOptions = (() => {
    if (allTime) return [] as number[];
    const set = new Set<number>();
    if (year === nowYear) set.add(nowMonth);
    for (const t of dated) {
      if (t.d.getFullYear() === year) set.add(t.d.getMonth() + 1);
    }
    return Array.from(set).sort((a, b) => a - b);
  })();

  const summarize = (pred: (t: DatedTx) => boolean): Summary => {
    const out: Summary = { income: 0, expense: 0, count: 0, categories: [] };
    const byCategory = new Map<string, number>();
    for (const t of dated) {
      if (!pred(t)) continue;
      out.count++;
      if (t.type === "income") {
        out.income += t.amount;
      } else {
        out.expense += t.amount;
        byCategory.set(t.category, (byCategory.get(t.category) || 0) + t.amount);
      }
    }
    out.categories = Array.from(byCategory, ([category, amount]) => ({ category, amount })).sort(
      (a, b) => b.amount - a.amount
    );
    return out;
  };

  // The selected period and the one right before it (last month / last year).
  const inPeriod = (t: DatedTx) => {
    if (allTime) return true;
    if (t.d.getFullYear() !== year) return false;
    return month === "all" || t.d.getMonth() + 1 === month;
  };

  let prevMatch: ((t: DatedTx) => boolean) | null = null;
  let prevLabel = "";
  if (!allTime && month !== "all") {
    const pm = month === 1 ? 12 : month - 1;
    const py = month === 1 ? year - 1 : year;
    prevMatch = (t) => t.d.getFullYear() === py && t.d.getMonth() + 1 === pm;
    prevLabel = month === 1 ? `Dec ${year - 1}` : MONTH_SHORT[month - 2];
  } else if (!allTime) {
    prevMatch = (t) => t.d.getFullYear() === year - 1;
    prevLabel = String(year - 1);
  }

  const current = summarize(inPeriod);
  const previous = prevMatch ? summarize(prevMatch) : null;

  // Human labels for the selected period.
  const periodLabel = allTime
    ? "All time"
    : month !== "all"
      ? `${MONTH_LONG[month - 1]} ${year}`
      : String(year);
  const isCurrentMonth = !allTime && year === nowYear && month === nowMonth;
  const phrase = isCurrentMonth
    ? "this month"
    : allTime
      ? "overall"
      : month !== "all"
        ? `in ${MONTH_LONG[month - 1]} ${year}`
        : `in ${year}`;

  // How spending moved against the period before the selected one.
  const expenseChangePercent =
    previous && previous.expense > 0
      ? Math.round(((current.expense - previous.expense) / previous.expense) * 100)
      : null;

  let changeText: string;
  let changeColor = "var(--foreground-secondary)";
  if (previous !== null) {
    if (expenseChangePercent !== null) {
      changeText = `${signedPercent(expenseChangePercent)} vs ${prevLabel}`;
      changeColor =
        expenseChangePercent > 0
          ? "var(--danger)"
          : expenseChangePercent < 0
            ? "var(--success)"
            : "var(--foreground-secondary)";
    } else if (current.expense > 0) {
      changeText = `No spending in ${prevLabel}`;
    } else {
      changeText = "No spending in either period";
    }
  } else {
    changeText =
      current.count === 0
        ? "Nothing recorded yet"
        : `${current.count} transaction${current.count === 1 ? "" : "s"}`;
  }

  // One plain-language observation for the selected period.
  const topCategory = current.categories[0];
  const topShare =
    current.expense > 0 && topCategory
      ? Math.round((topCategory.amount / current.expense) * 100)
      : 0;
  const observation =
    current.expense > 0 && topCategory
      ? `Your largest category ${phrase} was ${topCategory.category}, at ${topShare}% of spending.`
      : current.income > 0
        ? `Nothing has gone out ${phrase}.`
        : `Nothing has come in or gone out ${phrase}.`;

  // The chart: every month of the chosen year (the selected one highlighted),
  // or one bar pair per year when looking at all time.
  const chartByMonth = !allTime;
  const series = chartByMonth
    ? Array.from({ length: 12 }, (_, i) => {
        let income = 0;
        let expense = 0;
        for (const t of dated) {
          if (t.d.getFullYear() === year && t.d.getMonth() === i) {
            if (t.type === "income") income += t.amount;
            else expense += t.amount;
          }
        }
        return { label: MONTH_SHORT[i], income, expense };
      })
    : years
        .slice()
        .sort((a, b) => a - b)
        .map((y) => {
          let income = 0;
          let expense = 0;
          for (const t of dated) {
            if (t.d.getFullYear() === y) {
              if (t.type === "income") income += t.amount;
              else expense += t.amount;
            }
          }
          return { label: String(y), income, expense };
        });

  const activeIndex = chartByMonth
    ? month !== "all"
      ? month - 1
      : year === nowYear
        ? nowMonth - 1
        : -1
    : -1;

  const scale = Math.max(1, ...series.flatMap((m) => [m.income, m.expense]));
  const largestCategory = Math.max(1, ...current.categories.map((c) => c.amount));

  if (transactions.length === 0) {
    return (
      <div>
        <PageHeader title="Insights" subtitle="What your money did over time" />
        <EmptyState
          title="Nothing to show yet"
          description="Once you add income or spending, the pattern of your months will appear here."
          action={
            <Link href="/transactions">
              <Button>Add a transaction</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle={`What your money did · ${periodLabel}`}
      />

      {/* Period: year first, then the months that year actually holds */}
      <div className="mb-5 space-y-2">
        {years.length > 1 && (
          <div
            role="group"
            aria-label="Filter by year"
            className="flex gap-2 overflow-x-auto no-scrollbar"
          >
            <FilterChip
              active={allTime}
              onClick={() => {
                setYear("all");
                setMonth("all");
              }}
            >
              All years
            </FilterChip>
            {years.map((value) => (
              <FilterChip
                key={value}
                active={year === value}
                onClick={() => {
                  setYear(value);
                  setMonth("all");
                }}
              >
                {value}
              </FilterChip>
            ))}
          </div>
        )}

        {!allTime && (
          <div
            role="group"
            aria-label="Filter by month"
            className="flex gap-2 overflow-x-auto no-scrollbar"
          >
            <FilterChip active={month === "all"} onClick={() => setMonth("all")}>
              All months
            </FilterChip>
            {monthOptions.map((value) => (
              <FilterChip
                key={value}
                active={month === value}
                onClick={() => setMonth(value)}
              >
                {MONTH_SHORT[value - 1]}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-[13px] text-[var(--foreground-secondary)]">Spending</p>
            <p className="mt-1 text-[24px] font-semibold tracking-apple tabular-nums">
              {formatCurrency(current.expense)}
            </p>
            <p
              className="mt-1 text-[13px] font-medium tabular-nums"
              style={{ color: changeColor }}
            >
              {changeText}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-[13px] text-[var(--foreground-secondary)]">Income</p>
            <p
              className="mt-1 text-[24px] font-semibold tracking-apple tabular-nums"
              style={{ color: "var(--success)" }}
            >
              {formatCurrency(current.income)}
            </p>
            <p className="mt-1 text-[13px] text-[var(--foreground-secondary)] tabular-nums">
              {previous
                ? `${!allTime && month !== "all" ? "Last month" : `${prevLabel}:`} ${formatCurrency(
                    previous.income
                  )}`
                : allTime
                  ? "Since you started"
                  : "Nothing to compare yet"}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-[13px] text-[var(--foreground-secondary)]">Left over</p>
            <p
              className="mt-1 text-[24px] font-semibold tracking-apple tabular-nums"
              style={{
                color: current.income - current.expense >= 0 ? "var(--success)" : "var(--danger)",
              }}
            >
              {current.income - current.expense < 0 ? "\u2212" : ""}
              {formatCurrency(current.income - current.expense)}
            </p>
            <p className="mt-1 text-[13px] text-[var(--foreground-secondary)]">
              Income minus spending
            </p>
          </CardBody>
        </Card>
      </div>

      <p className="mt-6 text-[15px] leading-relaxed text-[var(--foreground)]">
        {observation}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Where it went</CardTitle>
          <span className="text-[13px] text-[var(--foreground-secondary)]">{periodLabel}</span>
        </CardHeader>
        <CardBody className="pt-4 space-y-4">
          {current.categories.length === 0 ? (
            <p className="text-[15px] text-[var(--foreground-secondary)]">
              No spending recorded {phrase}.
            </p>
          ) : (
            current.categories.map((c) => (
              <div key={c.category}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px]">{c.category}</span>
                  <span className="shrink-0 text-[15px] font-medium tabular-nums">
                    {formatCurrency(c.amount)}
                  </span>
                </div>
                <div
                  className="mt-2 h-1.5 w-full rounded-full"
                  style={{ backgroundColor: "var(--surface-secondary)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${((c.amount / largestCategory) * 100).toFixed(1)}%`,
                      backgroundColor: "var(--accent)",
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Income and spending</CardTitle>
          <div className="flex items-center gap-3 text-[12px] text-[var(--foreground-secondary)]">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--success)" }}
              />
              Income
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--danger)" }}
              />
              Spending
            </span>
          </div>
        </CardHeader>
        <CardBody className="pt-5">
          {/* Twelve bar pairs at fixed width need ~380px — wider than any
              phone, which pushed the whole card past the viewport. The bars
              and gaps below shrink instead, labels stay on one line, and on
              the narrowest screens this strip scrolls itself rather than the
              page. */}
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex min-w-[264px] items-end gap-1 sm:gap-4">
              {series.map((m, i) => {
                const isActive = i === activeIndex;
                return (
                  <div
                    key={`${m.label}-${i}`}
                    className="flex min-w-0 flex-1 flex-col items-center gap-2"
                  >
                    <div className="flex h-36 w-full items-end justify-center gap-1 sm:gap-1.5">
                      <div
                        className="min-w-0 flex-1 max-w-3.5"
                        style={{
                          height: barHeight(m.income, scale),
                          backgroundColor: "var(--success)",
                        }}
                      />
                      <div
                        className="min-w-0 flex-1 max-w-3.5"
                        style={{
                          height: barHeight(m.expense, scale),
                          backgroundColor: "var(--danger)",
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        "whitespace-nowrap text-[12px]",
                        isActive
                          ? "font-medium text-[var(--foreground)]"
                          : "text-[var(--foreground-secondary)]"
                      )}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
