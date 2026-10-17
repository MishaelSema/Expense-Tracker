"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/format";

export interface InsightsData {
  current: { income: number; expense: number; balance: number };
  previousExpense: number;
  expenseChangePercent: number | null;
  categories: { category: string; amount: number }[];
  months: { month: string; income: number; expense: number }[];
  hasData: boolean;
}

function signedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "\u2212" : "";
  return `${sign}${Math.abs(value)}%`;
}

function barHeight(value: number, scale: number): number | string {
  if (value <= 0) return 0;
  return `max(3px, ${((value / scale) * 100).toFixed(2)}%)`;
}

export function InsightsView({ data }: { data: InsightsData }) {
  const { current, expenseChangePercent, categories, months } = data;

  if (!data.hasData) {
    return (
      <div>
        <PageHeader title="Insights" subtitle="What your money did this month" />
        <EmptyState
          title="Nothing to show yet"
          description="Once you add income or spending, the pattern of your month will appear here."
          action={
            <Link href="/transactions">
              <Button>Add a transaction</Button>
            </Link>
          }
        />
      </div>
    );
  }

  // How spending moved compared with last month.
  let changeText: string;
  let changeColor = "var(--foreground-secondary)";
  if (expenseChangePercent !== null) {
    changeText = `${signedPercent(expenseChangePercent)} vs last month`;
    changeColor =
      expenseChangePercent > 0
        ? "var(--danger)"
        : expenseChangePercent < 0
          ? "var(--success)"
          : "var(--foreground-secondary)";
  } else if (current.expense > 0) {
    changeText = "No spending last month";
  } else {
    changeText = "No spending either month";
  }

  // One plain-language observation from the current month's data.
  const topCategory = categories[0];
  const topShare =
    current.expense > 0 && topCategory
      ? Math.round((topCategory.amount / current.expense) * 100)
      : 0;
  const observation =
    current.expense > 0 && topCategory
      ? `Your largest category this month was ${topCategory.category}, at ${topShare}% of spending.`
      : current.income > 0
        ? "Nothing has gone out this month yet."
        : "Nothing has come in or gone out this month yet.";

  const previousMonth = months[months.length - 2];
  const scale = Math.max(
    1,
    ...months.flatMap((m) => [m.income, m.expense])
  );
  const largestCategory = Math.max(1, ...categories.map((c) => c.amount));

  return (
    <div>
      <PageHeader title="Insights" subtitle="What your money did this month" />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-[13px] text-[var(--foreground-secondary)]">
              This month&apos;s spending
            </p>
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
            <p className="text-[13px] text-[var(--foreground-secondary)]">
              This month&apos;s income
            </p>
            <p
              className="mt-1 text-[24px] font-semibold tracking-apple tabular-nums"
              style={{ color: "var(--success)" }}
            >
              {formatCurrency(current.income)}
            </p>
            <p className="mt-1 text-[13px] text-[var(--foreground-secondary)] tabular-nums">
              Last month {formatCurrency(previousMonth.income)}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-[13px] text-[var(--foreground-secondary)]">
              Left over
            </p>
            <p
              className="mt-1 text-[24px] font-semibold tracking-apple tabular-nums"
              style={{
                color: current.balance >= 0 ? "var(--success)" : "var(--danger)",
              }}
            >
              {current.balance < 0 ? "\u2212" : ""}
              {formatCurrency(current.balance)}
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
        </CardHeader>
        <CardBody className="pt-4 space-y-4">
          {categories.length === 0 ? (
            <p className="text-[15px] text-[var(--foreground-secondary)]">
              No spending recorded this month.
            </p>
          ) : (
            categories.map((c) => (
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
          <div className="flex items-end gap-2 sm:gap-4">
            {months.map((m, i) => {
              const isCurrent = i === months.length - 1;
              return (
                <div
                  key={`${m.month}-${i}`}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-36 w-full items-end justify-center gap-1 sm:gap-1.5">
                    <div
                      className="w-2.5 sm:w-3.5"
                      style={{
                        height: barHeight(m.income, scale),
                        backgroundColor: "var(--success)",
                      }}
                    />
                    <div
                      className="w-2.5 sm:w-3.5"
                      style={{
                        height: barHeight(m.expense, scale),
                        backgroundColor: "var(--danger)",
                      }}
                    />
                  </div>
                  <span
                    className={
                      isCurrent
                        ? "text-[12px] font-medium text-[var(--foreground)]"
                        : "text-[12px] text-[var(--foreground-secondary)]"
                    }
                  >
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
