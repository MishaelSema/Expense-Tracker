"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { EditIcon, TrashIcon } from "@/components/ui/icons";
import { formatCurrency, formatDate } from "@/lib/format";
import { BudgetFormSheet } from "./budget-form-sheet";

export interface BudgetItem {
  _id: string;
  category: string;
  amount: number;
  period: "monthly" | "weekly" | "yearly";
  startDate: string;
  endDate: string;
  spent: number;
}

const PERIOD_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function progressColor(ratio: number) {
  if (ratio >= 1) return "var(--danger)";
  if (ratio >= 0.8) return "var(--warning)";
  return "var(--accent)";
}

export function BudgetsView({ budgets }: { budgets: BudgetItem[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(budget: BudgetItem) {
    setEditing(budget);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
  }

  function closeDelete() {
    setDeleteOpen(false);
    setDeleteBusy(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/budgets/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        return;
      }
      toast.success("Budget deleted");
      router.refresh();
      setDeleteOpen(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Budgets"
        subtitle="Plan what each category can spend"
        action={<Button onClick={openAdd}>Add budget</Button>}
      />

      {budgets.length === 0 ? (
        <EmptyState
          title="No budgets yet"
          description="Set a limit for a category and Ledger will keep track of what you spend against it."
          action={<Button onClick={openAdd}>Add budget</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((budget) => {
            const ratio = budget.amount > 0 ? budget.spent / budget.amount : 0;
            const remaining = budget.amount - budget.spent;
            const barWidth = Math.min(100, Math.round(ratio * 100));

            return (
              <Card key={budget._id}>
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle className="truncate">{budget.category}</CardTitle>
                    <p className="mt-1 text-[13px] text-[var(--foreground-secondary)]">
                      {PERIOD_LABELS[budget.period] || budget.period} ·{" "}
                      {formatDate(budget.startDate)} – {formatDate(budget.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${budget.category} budget`}
                      title="Edit"
                      onClick={() => openEdit(budget)}
                    >
                      <EditIcon width={18} height={18} />
                    </Button>
                    <Button
                      variant="ghost-destructive"
                      size="sm"
                      aria-label={`Delete ${budget.category} budget`}
                      title="Delete"
                      onClick={() => {
                        setDeleteTarget(budget);
                        setDeleteOpen(true);
                      }}
                    >
                      <TrashIcon width={18} height={18} />
                    </Button>
                  </div>
                </CardHeader>

                <CardBody className="pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[17px] font-semibold tabular-nums text-[var(--foreground)]">
                      {formatCurrency(budget.spent)}
                      <span className="ml-1.5 text-[13px] font-normal text-[var(--foreground-secondary)]">
                        of {formatCurrency(budget.amount)}
                      </span>
                    </p>
                    <p
                      className="text-[13px] tabular-nums text-right"
                      style={{
                        color: remaining >= 0 ? "var(--foreground-secondary)" : "var(--danger)",
                      }}
                    >
                      {remaining >= 0
                        ? `${formatCurrency(remaining)} left`
                        : `Over by ${formatCurrency(Math.abs(remaining))}`}
                    </p>
                  </div>

                  <div className="mt-3 h-1.5 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: progressColor(ratio),
                      }}
                    />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetFormSheet
        open={formOpen}
        onClose={closeForm}
        budget={editing}
      />

      <Sheet
        open={deleteOpen}
        onClose={closeDelete}
        title="Delete this budget?"
      >
        <p className="text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
          The {deleteTarget?.category} budget will be removed. Transactions you
          have already logged stay exactly as they are.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={closeDelete}
            disabled={deleteBusy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
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
