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
import { SearchIcon, PlusIcon, CloseIcon } from "@/components/ui/icons";
import { formatCurrency, formatRelative } from "@/lib/format";
import { toast } from "sonner";
import { TransactionFormSheet } from "./transaction-form-sheet";
import type { TransactionDTO } from "./types";

type Filter = "all" | "income" | "expense";

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
          <Button
            size="md"
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            className="lg:hidden"
          >
            <PlusIcon width={17} height={17} />
            Add
          </Button>
        }
      />

      <div className="hidden lg:flex justify-end mb-4">
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
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
        <div className="relative flex-1 max-w-[260px]">
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
                <Button
                  onClick={() => {
                    setEditing(undefined);
                    setFormOpen(true);
                  }}
                >
                  Add a transaction
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-[var(--separator)]">
            {filtered.map((t) => (
              <li key={t.id}>
                <div className="flex items-center gap-3 px-4 sm:px-5 min-h-[64px] py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-medium truncate">{t.description}</p>
                    <p className="text-[13.5px] text-[var(--foreground-secondary)] truncate">
                      {t.category} · {formatRelative(t.date)}
                    </p>
                  </div>
                  <p
                    className="text-[16px] font-semibold tabular-nums shrink-0"
                    style={{ color: t.type === "income" ? "var(--success)" : "var(--foreground)" }}
                  >
                    {formatCurrency(t.type === "income" ? t.amount : -t.amount, {
                      showSign: true,
                    })}
                  </p>
                  <div className="flex items-center shrink-0">
                    <button
                      onClick={() => {
                        setEditing(t);
                        setFormOpen(true);
                      }}
                      className="h-8 px-3 rounded-full text-[13px] text-[var(--accent)] pressable"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleting(t)}
                      aria-label="Delete transaction"
                      className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--foreground-secondary)] hover:text-[var(--danger)] pressable"
                    >
                      <CloseIcon width={16} height={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
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
