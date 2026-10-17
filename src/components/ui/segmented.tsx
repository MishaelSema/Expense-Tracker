"use client";

import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * iOS-style segmented control. A sliding translucent thumb marks the selection.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center rounded-full p-0.5",
        size === "sm" ? "h-8" : "h-9",
        className
      )}
      style={{ background: "var(--surface-secondary)" }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative rounded-full font-medium transition-colors pressable",
              size === "sm" ? "px-3 text-[12.5px] h-7" : "px-4 text-[13.5px] h-8",
              active ? "text-[var(--foreground)]" : "text-[var(--foreground-secondary)]"
            )}
          >
            {active && (
              <span
                className="absolute inset-0 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                style={{ background: "var(--surface)" }}
                aria-hidden="true"
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
