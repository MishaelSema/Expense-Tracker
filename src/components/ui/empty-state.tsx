"use client";

import * as React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Minimal Apple-style empty state. Text-first, no decorative icons.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <p className="text-[17px] font-semibold text-[var(--foreground)]">{title}</p>
      {description && (
        <p className="mt-1.5 text-[15px] text-[var(--foreground-secondary)] max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
