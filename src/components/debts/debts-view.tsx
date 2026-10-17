"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardList, CardRow } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckSquareIcon, EditIcon, TrashIcon } from "@/components/ui/icons";
import { formatCurrency, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface DebtItem {
  _id: string;
  type: "owed_to_me" | "i_owe";
  person: string;
  amount: number;
  description: string;
  notes?: string | null;
  dueDate?: string | null;
  status: "active" | "paid";
}

type Filter = "owed_to_me" | "i_owe";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "owed_to_me", label: "Owed to you" },
  { value: "i_owe", label: "You owe" },
];

const selectClassName =
  "flex h-11 w-full rounded-xl bg-[var(--surface-secondary)] px-3.5 text-[16px] text-[var(--foreground)] border border-transparent focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dueInfo(debt: DebtItem): { text: string; color: string } {
  if (debt.status === "paid") {
    return { text: "Paid", color: "var(--success)" };
  }
  if (!debt.dueDate) {
    return { text: "No due date", color: "var(--foreground-secondary)" };
  }
  const due = new Date(debt.dueDate);
  if (due < startOfToday()) {
    return { text: `Overdue · ${formatRelative(due)}`, color: "var(--warning)" };
  }
  return { text: formatRelative(due), color: "var(--foreground-secondary)" };
}

export function DebtsView({ debts }: { debts: DebtItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("owed_to_me");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DebtItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DebtItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const owedToYou = useMemo(
    () =>
      debts
        .filter((d) => d.type === "owed_to_me" && d.status === "active")
        .reduce((sum, d) => sum + d.amount, 0),
    [debts]
  );

  const youOwe = useMemo(
    () =>
      debts
        .filter((d) => d.type === "i_owe" && d.status === "active")
        .reduce((sum, d) => sum + d.amount, 0),
    [debts]
  );

  const visible = useMemo(() => {
    return debts
      .filter((d) => d.type === filter)
      .sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === "active" ? -1 : 1;
      });
  }, [debts, filter]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(debt: DebtItem) {
    setEditing(debt);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
  }

  function closeDelete() {
    setDeleteOpen(false);
    setDeleteBusy(false);
  }

  async function toggleStatus(debt: DebtItem) {
    if (busyId) return;
    setBusyId(debt._id);
    const next = debt.status === "paid" ? "active" : "paid";
    try {
      const res = await fetch(`/api/debts/${debt._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        return;
      }
      toast.success(next === "paid" ? "Marked as paid" : "Marked as unpaid");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/debts/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        return;
      }
      toast.success("Debt deleted");
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
        title="Debts"
        subtitle="What you are owed and what you owe"
        action={<Button onClick={openAdd}>Add debt</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card>
          <CardBody>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[15px] text-[var(--foreground-secondary)]">
                Owed to you
              </p>
              <p
                className="text-[22px] font-semibold tracking-apple tabular-nums"
                style={{ color: "var(--success)" }}
              >
                {formatCurrency(owedToYou)}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[15px] text-[var(--foreground-secondary)]">
                You owe
              </p>
              <p
                className="text-[22px] font-semibold tracking-apple tabular-nums"
                style={{ color: "var(--danger)" }}
              >
                {formatCurrency(youOwe)}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] p-1 mb-4">
        {FILTERS.map((option) => {
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.value)}
              className={cn(
                "h-8 px-4 rounded-full text-[13px] font-medium pressable",
                active
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {debts.length === 0 ? (
        <EmptyState
          title="No debts yet"
          description="Record money you are owed or owe, and Ledger will keep the totals straight."
          action={<Button onClick={openAdd}>Add debt</Button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter === "owed_to_me" ? "Nothing owed to you" : "You owe nothing"}
          description={
            filter === "owed_to_me"
              ? "New money owed to you will show up here."
              : "What you owe will show up here."
          }
          action={<Button onClick={openAdd}>Add debt</Button>}
        />
      ) : (
        <CardList>
          {visible.map((debt) => {
            const info = dueInfo(debt);
            return (
              <CardRow key={debt._id} className="py-3 flex-wrap items-start gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-[var(--foreground)] truncate">
                    {debt.person}
                  </p>
                  <p className="text-[13px] text-[var(--foreground-secondary)] truncate">
                    {debt.description}
                  </p>
                  {debt.notes && (
                    <p className="mt-1 whitespace-pre-line break-words text-[13px] leading-snug text-[var(--foreground-secondary)]">
                      {debt.notes}
                    </p>
                  )}
                </div>

                <div className="ml-auto shrink-0 text-right">
                  <p className="text-[15px] font-semibold tabular-nums text-[var(--foreground)] whitespace-nowrap">
                    {formatCurrency(debt.amount)}
                  </p>
                  <p
                    className="text-[13px] tabular-nums whitespace-nowrap"
                    style={{ color: info.color }}
                  >
                    {info.text}
                  </p>
                </div>

                <div className="flex w-full shrink-0 items-center justify-end gap-0.5 sm:w-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={
                      debt.status === "paid"
                        ? `Mark ${debt.person} as unpaid`
                        : `Mark ${debt.person} as paid`
                    }
                    title={debt.status === "paid" ? "Mark unpaid" : "Mark paid"}
                    disabled={busyId === debt._id}
                    onClick={() => toggleStatus(debt)}
                  >
                    <CheckSquareIcon width={18} height={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit debt with ${debt.person}`}
                    title="Edit"
                    onClick={() => openEdit(debt)}
                  >
                    <EditIcon width={18} height={18} />
                  </Button>
                  <Button
                    variant="ghost-destructive"
                    size="sm"
                    aria-label={`Delete debt with ${debt.person}`}
                    title="Delete"
                    onClick={() => {
                      setDeleteTarget(debt);
                      setDeleteOpen(true);
                    }}
                  >
                    <TrashIcon width={18} height={18} />
                  </Button>
                </div>
              </CardRow>
            );
          })}
        </CardList>
      )}

      <DebtFormSheet
        open={formOpen}
        onClose={closeForm}
        debt={editing}
        defaultType={filter}
      />

      <Sheet open={deleteOpen} onClose={closeDelete} title="Delete this debt?">
        <p className="text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
          The entry with {deleteTarget?.person} will be removed and the totals
          will be recalculated.
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

function DebtFormSheet({
  open,
  onClose,
  debt,
  defaultType,
}: {
  open: boolean;
  onClose: () => void;
  debt: DebtItem | null;
  defaultType: Filter;
}) {
  const router = useRouter();
  const [type, setType] = useState<Filter>(defaultType);
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<"active" | "paid">("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(debt?.type || defaultType);
    setPerson(debt?.person || "");
    setAmount(debt ? String(debt.amount) : "");
    setDescription(debt?.description || "");
    setNotes(debt?.notes || "");
    setDueDate(debt?.dueDate ? debt.dueDate.slice(0, 10) : "");
    setStatus(debt?.status || "active");
    setSaving(false);
  }, [open, debt, defaultType]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(debt ? `/api/debts/${debt._id}` : "/api/debts", {
        method: debt ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          person,
          amount: Number(amount),
          description,
          notes,
          dueDate: dueDate || null,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        return;
      }
      toast.success(debt ? "Debt updated" : "Debt added");
      router.refresh();
      onClose();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={debt ? "Edit debt" : "Add debt"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="debt-type">Direction</Label>
          <select
            id="debt-type"
            className={selectClassName}
            value={type}
            onChange={(e) => setType(e.target.value as Filter)}
          >
            <option value="owed_to_me">Owed to me</option>
            <option value="i_owe">I owe</option>
          </select>
        </div>

        <div>
          <Label htmlFor="debt-person">Person</Label>
          <Input
            id="debt-person"
            required
            placeholder="Who is this with?"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="debt-amount">Amount</Label>
            <Input
              id="debt-amount"
              type="number"
              min="1"
              step="any"
              inputMode="decimal"
              required
              placeholder="15000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="debt-due">Due date</Label>
            <Input
              id="debt-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="debt-description">Description</Label>
          <Input
            id="debt-description"
            required
            placeholder="What is it for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="debt-notes">Notes (optional)</Label>
          <textarea
            id="debt-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything important to remember about this debt"
            className="w-full min-w-0 resize-none rounded-xl bg-[var(--surface-secondary)] px-3.5 py-3 text-[16px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)] border border-transparent transition-colors focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none"
          />
        </div>

        <div>
          <Label htmlFor="debt-status">Status</Label>
          <select
            id="debt-status"
            className={selectClassName}
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "paid")}
          >
            <option value="active">Active</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "Saving…" : debt ? "Save changes" : "Add debt"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
