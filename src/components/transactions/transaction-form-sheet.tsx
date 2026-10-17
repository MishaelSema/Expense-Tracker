"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { categoriesFor } from "@/lib/categories";
import { toast } from "sonner";
import type { TransactionDTO } from "./types";

const todayISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
};

export function TransactionFormSheet({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: TransactionDTO;
}) {
  const router = useRouter();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(categoriesFor("expense")[0]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setType(initial.type);
      setAmount(String(initial.amount));
      setCategory(initial.category);
      setDescription(initial.description);
      setDate(initial.date.slice(0, 10));
    } else {
      setType("expense");
      setAmount("");
      setCategory(categoriesFor("expense")[0]);
      setDescription("");
      setDate(todayISO());
    }
    setError("");
  }, [open, initial]);

  function changeType(next: "income" | "expense") {
    setType(next);
    const available: readonly string[] = categoriesFor(next);
    if (!available.includes(category)) setCategory(available[0]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        initial ? `/api/transactions/${initial.id}` : "/api/transactions",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, amount: amountNum, category, description, date }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        toast.error("Couldn't save transaction");
        setSaving(false);
        return;
      }
      toast.success(initial ? "Transaction updated" : "Transaction added");
      router.refresh();
      onClose();
    } catch {
      setError("Something went wrong.");
      toast.error("Couldn't save transaction");
    } finally {
      setSaving(false);
    }
  }

  const available = categoriesFor(type);

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "Edit transaction" : "New transaction"}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-xl px-3.5 py-3 text-[14px] text-[var(--danger)]"
            style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, transparent)" }}
          >
            {error}
          </div>
        )}

        <div className="flex justify-center py-1">
          <Segmented
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
            value={type}
            onChange={(v) => changeType(v as "income" | "expense")}
          />
        </div>

        <div>
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              required
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pr-16 text-[18px] font-semibold tabular-nums"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[14px] text-[var(--foreground-secondary)] pointer-events-none">
              FCFA
            </span>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            required
            placeholder="What was it for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-11 w-full rounded-xl bg-[var(--surface-secondary)] px-3.5 text-[16px] text-[var(--foreground)] border border-transparent focus:border-[var(--accent)] focus:outline-none"
          >
            {available.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" size="lg" className="flex-1" disabled={saving}>
            {saving ? "Saving…" : initial ? "Save" : "Add"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
