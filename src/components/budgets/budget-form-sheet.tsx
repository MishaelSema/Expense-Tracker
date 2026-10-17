"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import type { BudgetItem } from "./budgets-view";

const CATEGORIES = [
  "Food",
  "Transport",
  "Rent",
  "Books and supplies",
  "Data and airtime",
  "Health",
  "Social",
  "Fees",
  "Savings",
  "Other",
];

const PERIODS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const selectClassName =
  "flex h-11 w-full rounded-xl bg-[var(--surface-secondary)] px-3.5 text-[16px] text-[var(--foreground)] border border-transparent focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none";

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year || 2000, (month || 1) - 1, day || 1);
}

function addPeriod(start: Date, period: string) {
  if (period === "weekly") {
    const d = new Date(start);
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (period === "yearly") {
    const d = new Date(start);
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  const year = start.getFullYear();
  const month = start.getMonth();
  const lastDay = new Date(year, month + 2, 0).getDate();
  return new Date(year, month + 1, Math.min(start.getDate(), lastDay));
}

export function BudgetFormSheet({
  open,
  onClose,
  budget,
}: {
  open: boolean;
  onClose: () => void;
  budget: BudgetItem | null;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = budget ? budget.startDate.slice(0, 10) : dateInputValue(new Date());
    const chosenPeriod = budget?.period || "monthly";

    if (budget && !CATEGORIES.includes(budget.category)) {
      setCategory(budget.category);
    } else {
      setCategory(budget?.category || CATEGORIES[0]);
    }
    setAmount(budget ? String(budget.amount) : "");
    setPeriod(chosenPeriod);
    setStartDate(start);
    setEndDate(
      budget
        ? budget.endDate.slice(0, 10)
        : dateInputValue(addPeriod(parseInputDate(start), chosenPeriod))
    );
    setSaving(false);
  }, [open, budget]);

  function onPeriodChange(value: string) {
    setPeriod(value);
    if (!budget && startDate) {
      setEndDate(dateInputValue(addPeriod(parseInputDate(startDate), value)));
    }
  }

  function onStartChange(value: string) {
    setStartDate(value);
    if (!budget && value && endDate) {
      setEndDate(dateInputValue(addPeriod(parseInputDate(value), period)));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(budget ? `/api/budgets/${budget._id}` : "/api/budgets", {
        method: budget ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          amount: Number(amount),
          period,
          startDate,
          endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        return;
      }
      toast.success(budget ? "Budget updated" : "Budget created");
      router.refresh();
      onClose();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const categoryOptions = CATEGORIES.includes(category)
    ? CATEGORIES
    : [category, ...CATEGORIES];

  return (
    <Sheet open={open} onClose={onClose} title={budget ? "Edit budget" : "Add budget"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="budget-category">Category</Label>
          <select
            id="budget-category"
            className={selectClassName}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="budget-amount">Limit</Label>
            <Input
              id="budget-amount"
              type="number"
              min="1"
              step="any"
              inputMode="decimal"
              required
              placeholder="20000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="budget-period">Period</Label>
            <select
              id="budget-period"
              className={selectClassName}
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
            >
              {PERIODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="budget-start">Start date</Label>
            <Input
              id="budget-start"
              type="date"
              required
              value={startDate}
              onChange={(e) => onStartChange(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="budget-end">End date</Label>
            <Input
              id="budget-end"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
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
            {saving ? "Saving…" : budget ? "Save changes" : "Add budget"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
