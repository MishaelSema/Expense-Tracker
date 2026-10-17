"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CardList } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CloseIcon } from "@/components/ui/icons";
import { formatRelative } from "@/lib/format";
import { REMINDER_SEVERITY_COLOR, REMINDER_TYPE_LABEL } from "@/lib/reminder-display";
import { cn } from "@/lib/utils";

export interface ReminderItem {
  _id: string;
  type: string;
  title: string;
  body: string;
  dueDate?: string | null;
  severity: "info" | "warning" | "critical";
  readAt?: string | null;
  createdAt: string;
}

const SEVERITY_COLOR = REMINDER_SEVERITY_COLOR;
const TYPE_LABEL = REMINDER_TYPE_LABEL;

export function RemindersView({
  reminders,
  unread,
}: {
  reminders: ReminderItem[];
  unread: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const urgent = reminders.filter((r) => r.severity === "critical");
  const upcoming = reminders.filter((r) => r.severity !== "critical");

  async function markRead(id: string) {
    if (busy) return;
    setBusy(id);
    try {
      await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function dismiss(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: true }),
      });
      if (!res.ok) {
        toast.error("Couldn't dismiss that reminder");
        return;
      }
      toast.success("Reminder dismissed");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function markAllRead() {
    setBusy("all");
    try {
      const res = await fetch("/api/reminders", { method: "PATCH" });
      if (!res.ok) {
        toast.error("Couldn't mark reminders as read");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const renderGroup = (label: string, items: ReminderItem[]) => {
    if (items.length === 0) return null;
    return (
      <section className="space-y-2.5">
        <h2 className="px-1 text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--foreground-secondary)]">
          {label}
        </h2>
        <CardList>
          {items.map((r) => {
            const unreadItem = !r.readAt;
            return (
              <div key={r._id} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => unreadItem && markRead(r._id)}
                  disabled={busy === r._id}
                  className={cn(
                    "flex flex-1 items-start gap-3.5 px-5 py-3.5 text-left pressable min-w-0",
                    busy === r._id && "opacity-60"
                  )}
                >
                  <span
                    className="mt-[7px] h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLOR[r.severity] }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-[15px] tracking-apple",
                          unreadItem
                            ? "font-semibold text-[var(--foreground)]"
                            : "text-[var(--foreground-secondary)]"
                        )}
                      >
                        {r.title}
                      </span>
                      {unreadItem && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                          aria-label="Unread"
                        />
                      )}
                    </span>
                    <span className="mt-0.5 block text-[13.5px] leading-snug text-[var(--foreground-secondary)]">
                      {r.body}
                    </span>
                    <span className="mt-1.5 flex items-center gap-2 text-[12px] text-[var(--foreground-secondary)]">
                      <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5">
                        {TYPE_LABEL[r.type] ?? "Reminder"}
                      </span>
                      {r.dueDate && <span>{formatRelative(r.dueDate)}</span>}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(r._id)}
                  disabled={busy === r._id}
                  aria-label={`Dismiss ${r.title}`}
                  className="flex items-center px-4 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] pressable"
                >
                  <CloseIcon width={16} height={16} />
                </button>
              </div>
            );
          })}
        </CardList>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders"
        subtitle={
          reminders.length === 0
            ? "Nothing needs your attention right now."
            : unread > 0
              ? `${unread} unread of ${reminders.length} active.`
              : `${reminders.length} active.`
        }
        action={
          unread > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={markAllRead}
              disabled={busy === "all"}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {reminders.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          description="Reminders for debt due dates, recurring bills, budgets and goal deadlines will show up here."
          action={
            <Link href="/bills">
              <Button variant="primary" size="md">
                Add a recurring bill
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {renderGroup("Needs attention", urgent)}
          {renderGroup("Coming up", upcoming)}
        </div>
      )}
    </div>
  );
}
