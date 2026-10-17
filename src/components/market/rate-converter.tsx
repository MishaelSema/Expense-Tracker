"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

const selectClassName =
  "flex h-11 w-full rounded-xl bg-[var(--surface-secondary)] px-3.5 text-[16px] text-[var(--foreground)] border border-transparent focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none";

function formatAmount(value: number, code: string) {
  const zeroDecimal = code === "XAF" || code === "XOF" || code === "JPY";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: code,
    minimumFractionDigits: zeroDecimal ? 0 : 2,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  }).format(value);
}

export function RateConverter({
  base,
  rates,
}: {
  base: string;
  rates: Record<string, number>;
}) {
  const currencies = useMemo(() => Object.keys(rates), [rates]);

  const [from, setFrom] = useState(currencies.includes("USD") ? "USD" : base);
  const [to, setTo] = useState(currencies.includes("XAF") ? "XAF" : base);
  const [amount, setAmount] = useState("1");

  const value = Number(amount);
  const safeValue = Number.isFinite(value) ? value : 0;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  const converted = (safeValue / fromRate) * toRate;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div>
          <label
            htmlFor="conv-from"
            className="mb-1.5 block text-[13px] font-medium text-[var(--foreground-secondary)]"
          >
            From
          </label>
          <select
            id="conv-from"
            className={selectClassName}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <span className="pb-3 text-[15px] text-[var(--foreground-secondary)]" aria-hidden="true">
          →
        </span>
        <div>
          <label
            htmlFor="conv-to"
            className="mb-1.5 block text-[13px] font-medium text-[var(--foreground-secondary)]"
          >
            To
          </label>
          <select
            id="conv-to"
            className={selectClassName}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="conv-amount"
          className="mb-1.5 block text-[13px] font-medium text-[var(--foreground-secondary)]"
        >
          Amount
        </label>
        <Input
          id="conv-amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="rounded-xl bg-[var(--surface-secondary)] px-4 py-3.5">
        <p className="text-[13px] text-[var(--foreground-secondary)]">
          {formatAmount(safeValue, from)} =
        </p>
        <p
          className="mt-0.5 text-[22px] font-semibold tracking-apple tabular-nums text-[var(--foreground)]"
          aria-live="polite"
        >
          {formatAmount(converted, to)}
        </p>
      </div>
    </div>
  );
}
