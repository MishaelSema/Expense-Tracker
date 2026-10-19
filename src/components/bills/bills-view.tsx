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
import { PlusIcon, TrashIcon, RepeatIcon } from "@/components/ui/icons";
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
  /** Days before the due date the reminder window opens. */
  leadDays?: number;
  /** Absolute logo URL (hosted image or our own logo endpoint). */
  logoUrl?: string;
}

const FREQUENCIES: { value: BillItem["frequency"]; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "once", label: "One-off" },
];

/** Lead-time choices offered in the form; 3 is the default everywhere. */
const LEAD_OPTIONS = [1, 2, 3, 5, 7, 14];

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
  leadDays: number;
  /** Pasted URL. Kept as-is when it already points at the stored logo. */
  logoUrl: string;
  /** A newly picked file, as a data URL; only sent when changed. */
  logoData: string | null;
}

const emptyForm = (): FormState => ({
  name: "",
  amount: "",
  category: EXPENSE_CATEGORIES[0],
  frequency: "monthly",
  nextDueDate: todayInput(),
  note: "",
  active: true,
  leadDays: 3,
  logoUrl: "",
  logoData: null,
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
      leadDays: bill.leadDays ?? 3,
      // The stored logo URL (pasted image or our own logo endpoint) rides back
      // untouched unless the user replaces or removes it.
      logoUrl: bill.logoUrl ?? "",
      logoData: null,
    });
    setError("");
    setSheetOpen(true);
  }

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again after a remove
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
      toast.error("Use a PNG, JPEG, WebP or GIF image");
      return;
    }
    if (file.size > 400 * 1024) {
      toast.error("Image must be under 400 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, logoData: String(reader.result), logoUrl: "" }));
    };
    reader.onerror = () => toast.error("That image couldn't be read");
    reader.readAsDataURL(file);
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
        leadDays: form.leadDays,
        // Always send the URL (possibly empty) so clearing works; only send a
        // data URL when a file was just picked — an untouched upload keeps its
        // stored bytes because its URL comes back identical.
        logoUrl: form.logoUrl.trim(),
        ...(form.logoData ? { logoData: form.logoData } : {}),
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
        subtitle="Subscriptions and recurring bills, with a reminder and their logos before each due date."
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
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--separator)] bg-[var(--surface-secondary)] text-[var(--foreground-secondary)]">
                    <RepeatIcon width={15} height={15} />
                    {bill.logoUrl && (
                      // User-supplied logo URL: next/image would need an allowlist, and
                      // the onError fallback needs a plain img.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bill.logoUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
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
                      {bill.leadDays && bill.leadDays !== 3
                        ? ` · remind ${bill.leadDays}d before`
                        : ""}
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
            <Label>Platform logo (optional)</Label>
            <div className="flex items-center gap-3">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--separator)] bg-[var(--surface-secondary)] text-[var(--foreground-secondary)]">
                <RepeatIcon width={18} height={18} />
                {(form.logoData || form.logoUrl) && (
                  // Picked files are data URLs and pasted logos are arbitrary URLs:
                  // next/image supports neither without configuration, and onError
                  // needs a plain img.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logoData || form.logoUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </span>
              <label className="inline-flex h-9 cursor-pointer items-center rounded-full border border-[var(--separator)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)] pressable">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  /* sr-only, not hidden: keeps the input in the accessibility
                     tree (screen readers, test automation) while invisible. */
                  className="sr-only"
                  onChange={onPickLogo}
                />
                Choose image
              </label>
              {(form.logoData || form.logoUrl) && (
                <button
                  type="button"
                  className="text-[13px] text-[var(--danger)] pressable"
                  onClick={() => setForm((f) => ({ ...f, logoUrl: "", logoData: null }))}
                >
                  Remove
                </button>
              )}
            </div>
            <Input
              value={form.logoUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, logoUrl: e.target.value, logoData: null }))
              }
              placeholder="…or paste an image URL"
              className="mt-2.5"
            />
            <p className="mt-1.5 text-[12px] text-[var(--foreground-secondary)]">
              The logo appears on reminders, emails and push notifications.
            </p>
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
            <Label htmlFor="bill-lead">Remind me before due</Label>
            <select
              id="bill-lead"
              className={selectClassName}
              value={form.leadDays}
              onChange={(e) => setForm((f) => ({ ...f, leadDays: Number(e.target.value) }))}
            >
              {(LEAD_OPTIONS.includes(form.leadDays)
                ? LEAD_OPTIONS
                : [...LEAD_OPTIONS, form.leadDays].sort((a, b) => a - b)
              ).map((days) => (
                <option key={days} value={days}>
                  {days} day{days === 1 ? "" : "s"} before
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] text-[var(--foreground-secondary)]">
              Ledger starts reminding you this many days ahead of each due date.
            </p>
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
