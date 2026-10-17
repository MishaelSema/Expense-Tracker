"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CardList } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { formatCurrency, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface BillItem {
  _id: string;
  name: string;
  amount: number;
  category: string;
  frequency: "weekly" | "monthly" | "yearly" | "once";
  nextDueDate: string;
  active: boolean;
  note?: string;
}

const FREQUENCIES: { value: BillItem["frequency"]; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "once", label: "One-off" },
];

const selectClassName =
  "flex h-11 w-full rounded-xl bg-[var(--surface-secondary)] px-3.5 text-[16px] text-[var(--foreground)] border border-transparent focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none";

function freqLabel(value: string) {
  return FREQUENCIES.find((f) => f.value === value)?.label ?? "Monthly";
}

function todayInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

interface FormState {
  name: string;
  amount: string;
  category: string;
  frequency: BillItem["frequency"];
  nextDueDate: string;
  note: string;
  active: boolean;
}

const emptyForm = (): FormState => ({
  name: "",
  amount: "",
  category: EXPENSE_CATEGORIES[0],
  frequency: "monthly",
  nextDueDate: todayInput(),
  note: "",
  active: true,
});

export function BillsView({ bills }: { bills: BillItem[] }) {
  const router = useRouter();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<BillItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<BillItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setError("");
    setSheetOpen(true);
  }

  function openEdit(bill: BillItem) {
    setEditing(bill);
    setForm({
      name: bill.name,
      amount: String(bill.amount),
      category: bill.category,
      frequency: bill.frequency,
      nextDueDate: (bill.nextDueDate || todayInput()).slice(0, 10),
      note: bill.note ?? "",
      active: bill.active,
    });
    setError("");
    setSheetOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.name.trim()) {
      setError("Give the bill a name.");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!form.nextDueDate) {
      setError("Choose the next due date.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        amount,
        category: form.category,
        frequency: form.frequency,
        nextDueDate: new Date(form.nextDueDate).toISOString(),
        note: form.note.trim() || undefined,
        active: form.active,
      };

      const res = await fetch(editing ? `/api/bills/${editing._id}` : "/api/bills", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }

      toast.success(editing ? "Bill updated" : "Bill added");
      setSheetOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/bills/${pendingDelete._id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Couldn't delete that bill");
        return;
      }
      toast.success("Bill deleted");
      setPendingDelete(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills"
        subtitle="Recurring commitments Ledger should remind you about."
        action={
          <Button variant="primary" size="md" onClick={openNew}>
            <PlusIcon width={18} height={18} />
            Add
          </Button>
        }
      />

      {bills.length === 0 ? (
        <EmptyState
          title="No bills yet"
          description="Add rent, electricity, data or a subscription and Ledger will remind you before each one is due."
          action={
            <Button variant="primary" size="md" onClick={openNew}>
              Add your first bill
            </Button>
          }
        />
      ) : (
        <CardList>
          {bills.map((bill) => {
            const paused = !bill.active;
            return (
              <div key={bill._id} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => openEdit(bill)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-3.5 text-left pressable"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-[15px] font-medium text-[var(--foreground)]",
                          paused && "text-[var(--foreground-secondary)]"
                        )}
                      >
                        {bill.name}
                      </span>
                      {paused && (
                        <span className="shrink-0 rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] text-[var(--foreground-secondary)]">
                          Paused
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-[var(--foreground-secondary)]">
                      {bill.category} · {freqLabel(bill.frequency)} · due{" "}
                      {formatRelative(bill.nextDueDate)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums text-[var(--foreground)]">
                    {formatCurrency(bill.amount)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(bill)}
                  aria-label={`Delete ${bill.name}`}
                  className="flex items-center px-4 text-[var(--foreground-secondary)] hover:text-[var(--danger)] pressable"
                >
                  <TrashIcon width={16} height={16} />
                </button>
              </div>
            );
          })}
        </CardList>
      )}

      {/* Add / edit sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? "Edit bill" : "New bill"}
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="bill-name">Name</Label>
            <Input
              id="bill-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Electricity"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="bill-amount">Amount</Label>
            <Input
              id="bill-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="15000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bill-category">Category</Label>
              <select
                id="bill-category"
                className={selectClassName}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="bill-frequency">Repeats</Label>
              <select
                id="bill-frequency"
                className={selectClassName}
                value={form.frequency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, frequency: e.target.value as BillItem["frequency"] }))
                }
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="bill-due">Next due date</Label>
            <Input
              id="bill-due"
              type="date"
              value={form.nextDueDate}
              onChange={(e) => setForm((f) => ({ ...f, nextDueDate: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="bill-note">Note (optional)</Label>
            <Input
              id="bill-note"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Account number, reminder…"
            />
          </div>

          {editing && (
            <label className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-secondary)] px-4 py-3">
              <span className="text-[15px] text-[var(--foreground)]">Active</span>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-5 w-5 accent-[var(--accent)]"
              />
            </label>
          )}

          {error && (
            <p className="text-[14px] text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="lg" className="flex-1" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add bill"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Delete confirmation */}
      <Sheet
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete bill"
      >
        <p className="text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
          Delete <span className="font-medium text-[var(--foreground)]">{pendingDelete?.name}</span>?
          This can&apos;t be undone.
        </p>
        <div className="mt-5 flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => setPendingDelete(null)}
          >
            Keep it
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="flex-1"
            onClick={confirmDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
