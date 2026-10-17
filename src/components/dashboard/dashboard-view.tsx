"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusIcon, ArrowRightIcon } from "@/components/ui/icons";
import { formatCurrency, formatRelative } from "@/lib/format";
import { REMINDER_SEVERITY_COLOR } from "@/lib/reminder-display";
import type { MonthStats } from "@/lib/stats";
import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";

interface RecentItem {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface DashboardReminder {
  _id: string;
  title: string;
  body: string;
  severity: string;
}

interface MarketRate {
  label: string;
  value: string;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardView({
  userName,
  stats,
  recent,
  reminders = [],
  marketRates = [],
}: {
  userName: string;
  stats: MonthStats;
  recent: RecentItem[];
  reminders?: DashboardReminder[];
  marketRates?: MarketRate[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const firstName = userName?.split(" ")[0] || "there";
  const today = new Date();

  const hasAny = stats.income > 0 || stats.expense > 0;

  return (
    <div className="space-y-4">
      {/* Greeting + primary action */}
      <div className="flex items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-apple-display leading-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-[15px] text-[var(--foreground-secondary)]">
            {today.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <PlusIcon width={17} height={17} />
          <span className="hidden sm:inline">Add transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Balance hero */}
      <div
        className="rounded-3xl border p-6 sm:p-7"
        style={{
          background: "var(--surface)",
          borderColor: "var(--separator)",
        }}
      >
        <p className="text-[14px] text-[var(--foreground-secondary)]">
          Available this month
        </p>
        <p className="mt-1 text-[44px] sm:text-[52px] font-semibold tracking-apple-display leading-none tabular-nums">
          {formatCurrency(stats.balance)}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: "var(--surface-secondary)" }}
          >
            <p className="text-[13px] text-[var(--foreground-secondary)]">Income</p>
            <p className="mt-0.5 text-[20px] font-semibold tabular-nums text-[var(--success)]">
              {formatCurrency(stats.income)}
            </p>
          </div>
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: "var(--surface-secondary)" }}
          >
            <p className="text-[13px] text-[var(--foreground-secondary)]">Spent</p>
            <p className="mt-0.5 text-[20px] font-semibold tabular-nums text-[var(--danger)]">
              {formatCurrency(stats.expense)}
            </p>
          </div>
        </div>
        {hasAny && stats.balance > 0 && stats.daysLeft > 0 && (
          <p className="mt-4 text-[14px] text-[var(--foreground-secondary)]">
            About{" "}
            <span className="text-[var(--foreground)] font-medium tabular-nums">
              {formatCurrency(stats.safeDaily)}
            </span>{" "}
            a day for the remaining {stats.daysLeft}{" "}
            {stats.daysLeft === 1 ? "day" : "days"}.
          </p>
        )}
      </div>

      {/* Insight */}
      <Card className="p-5">
        <p className="text-[16px] leading-relaxed">{stats.insight}</p>
      </Card>

      {/* Reminders needing attention */}
      {reminders.length > 0 && (
        <Card>
          <div className="px-5 pt-5 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold tracking-apple">Needs attention</h2>
            <Link
              href="/reminders"
              className="text-[14px] text-[var(--accent)] flex items-center gap-1 pressable"
            >
              View all
              <ArrowRightIcon width={15} height={15} />
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-[var(--separator)]">
            {reminders.map((r) => (
              <li key={r._id} className="flex items-start gap-3.5 px-5 py-3.5">
                <span
                  className="mt-[7px] h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: REMINDER_SEVERITY_COLOR[r.severity] ?? "var(--accent)" }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium truncate">{r.title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-snug text-[var(--foreground-secondary)]">
                    {r.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Rates strip */}
      {marketRates.length > 0 && (
        <Card>
          <div className="px-5 pt-5 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold tracking-apple">Rates today</h2>
            <Link
              href="/market"
              className="text-[14px] text-[var(--accent)] flex items-center gap-1 pressable"
            >
              Market
              <ArrowRightIcon width={15} height={15} />
            </Link>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            {marketRates.map((r) => (
              <div
                key={r.label}
                className="rounded-2xl px-4 py-3"
                style={{ background: "var(--surface-secondary)" }}
              >
                <p className="text-[13px] text-[var(--foreground-secondary)]">{r.label}</p>
                <p className="mt-0.5 text-[18px] font-semibold tabular-nums">{r.value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Category breakdown */}
      <Card>
        <div className="px-5 pt-5 flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold tracking-apple">
            Where it went this month
          </h2>
          {stats.spentByCategory.length > 0 && (
            <span className="text-[13px] text-[var(--foreground-secondary)] tabular-nums">
              {formatCurrency(stats.expense)}
            </span>
          )}
        </div>
        <div className="p-5 pt-4">
          {stats.spentByCategory.length === 0 ? (
            <p className="text-[15px] text-[var(--foreground-secondary)]">
              No spending recorded this month yet.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.spentByCategory.map((c) => (
                <div key={c.category}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[15px]">{c.category}</span>
                    <span className="text-[15px] font-medium tabular-nums">
                      {formatCurrency(c.amount)}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--surface-secondary)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(c.share, 3)}%`,
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Recent activity */}
      <Card>
        <div className="px-5 pt-5 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold tracking-apple">Recent activity</h2>
          {recent.length > 0 && (
            <Link
              href="/transactions"
              className="text-[14px] text-[var(--accent)] flex items-center gap-1 pressable"
            >
              View all
              <ArrowRightIcon width={15} height={15} />
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="Add your first one and it will show up here."
            action={<Button onClick={() => setAddOpen(true)}>Add a transaction</Button>}
          />
        ) : (
          <ul className="mt-3 divide-y divide-[var(--separator)]">
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 px-5 min-h-[62px] py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-medium truncate">{t.description}</p>
                  <p className="text-[13.5px] text-[var(--foreground-secondary)] truncate">
                    {t.category} · {formatRelative(t.date)}
                  </p>
                </div>
                <p
                  className="text-[16px] font-semibold tabular-nums shrink-0"
                  style={{
                    color: t.type === "income" ? "var(--success)" : "var(--foreground)",
                  }}
                >
                  {formatCurrency(t.type === "income" ? t.amount : -t.amount, {
                    showSign: true,
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <TransactionFormSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
