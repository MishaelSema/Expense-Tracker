"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { SearchIcon, PlusIcon, CloseIcon, EditIcon } from "@/components/ui/icons";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { TransactionFormSheet } from "./transaction-form-sheet";
import type { TransactionDTO } from "./types";

type Filter = "all" | "income" | "expense";

interface MonthGroup {
  key: string;
  label: string;
  items: TransactionDTO[];
  income: number;
  expense: number;
}

function monthKey(date: string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function TransactionsView({ transactions }: { transactions: TransactionDTO[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | undefined>();
  const [deleting, setDeleting] = useState<TransactionDTO | undefined>();
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (!q) return true;
      return (
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [transactions, filter, query]);

  const totals = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [transactions]);

  // Group into months so each statement reads as its own period.
  const groups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, TransactionDTO[]>();
    for (const t of filtered) {
      const key = monthKey(t.date);
      const bucket = map.get(key);
      if (bucket) bucket.push(t);
      else map.set(key, [t]);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => {
        const income = items
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amount, 0);
        const expense = items
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0);
        return { key, label: monthLabel(key), items, income, expense };
      });
  }, [filtered]);

  function openAdd() {
    setEditing(undefined);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/transactions/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Couldn't delete transaction");
        setDeleteBusy(false);
        return;
      }
      toast.success("Transaction deleted");
      setDeleting(undefined);
      router.refresh();
    } catch {
      toast.error("Couldn't delete transaction");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle={`${formatCurrency(totals.income, { showSign: true })} in · ${formatCurrency(
          -totals.expense
        )} out`}
        action={
          <Button size="md" onClick={openAdd} className="lg:hidden">
            <PlusIcon width={17} height={17} />
            Add
          </Button>
        }
      />

      <div className="hidden lg:flex justify-end mb-4">
        <Button onClick={openAdd}>
          <PlusIcon width={17} height={17} />
          New transaction
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5">
        <Segmented
          options={[
            { value: "all", label: "All" },
            { value: "income", label: "Income" },
            { value: "expense", label: "Expenses" },
          ]}
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
        />
        <div className="relative flex-1 max-w-[260px] min-w-0">
          <SearchIcon
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-secondary)]"
          />
          <Input
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-9 text-[14px]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={transactions.length === 0 ? "No transactions yet" : "Nothing matches"}
            description={
              transactions.length === 0
                ? "Add your first transaction and it will appear here."
                : "Try a different search or filter."
            }
            action={
              transactions.length === 0 ? (
                <Button onClick={openAdd}>Add a transaction</Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <div className="flex items-baseline justify-between gap-3 px-1 mb-3">
                <h2 className="text-[15px] font-semibold tracking-apple text-[var(--foreground)]">
                  {group.label}
                </h2>
                <div className="flex items-center gap-3 text-[12.5px] tabular-nums whitespace-nowrap">
                  {group.income > 0 && (
                    <span style={{ color: "var(--success)" }}>
                      +{formatCurrency(group.income)}
                    </span>
                  )}
                  {group.expense > 0 && (
                    <span className="text-[var(--foreground-secondary)]">
                      −{formatCurrency(group.expense)}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col gap-3 rounded-2xl border border-[var(--separator)] bg-[var(--surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 break-words text-[15px] font-medium leading-snug text-[var(--foreground)]">
                        {t.description}
                      </p>
                      <p
                        className="shrink-0 text-[15px] font-semibold tabular-nums whitespace-nowrap"
                        style={{
                          color:
                            t.type === "income" ? "var(--success)" : "var(--foreground)",
                        }}
                      >
                        {formatCurrency(t.type === "income" ? t.amount : -t.amount, {
                          showSign: true,
                        })}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-0.5 text-[12px] text-[var(--foreground-secondary)]">
                        {t.category}
                      </span>
                      <span className="text-[12.5px] text-[var(--foreground-secondary)] whitespace-nowrap">
                        {formatDate(t.date, "short")}
                      </span>
                    </div>

                    <div className="mt-auto flex items-center justify-end gap-0.5 border-t border-[var(--separator)] pt-2">
                      <button
                        onClick={() => {
                          setEditing(t);
                          setFormOpen(true);
                        }}
                        aria-label={`Edit ${t.description}`}
                        className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] text-[var(--accent)] pressable"
                      >
                        <EditIcon width={15} height={15} />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleting(t)}
                        aria-label={`Delete ${t.description}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--foreground-secondary)] hover:text-[var(--danger)] pressable"
                      >
                        <CloseIcon width={16} height={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <TransactionFormSheet
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
      />

      {/* Delete confirmation */}
      <Sheet
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        title="Delete transaction?"
      >
        <p className="text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
          This will remove{" "}
          <span className="text-[var(--foreground)]">{deleting?.description}</span>{" "}
          and its amount from your totals. This can&apos;t be undone.
        </p>
        <div className="flex gap-2 mt-6">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => setDeleting(undefined)}
          >
            Keep it
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="flex-1"
            onClick={confirmDelete}
            disabled={deleteBusy}
          >
            {deleteBusy ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
