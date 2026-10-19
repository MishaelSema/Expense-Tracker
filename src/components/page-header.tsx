import type { ReactNode } from "react";

/**
 * Page title block. Title + optional supporting line + optional trailing
 * action. No eyebrow heading.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-apple-display leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[15px] text-[var(--foreground-secondary)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
