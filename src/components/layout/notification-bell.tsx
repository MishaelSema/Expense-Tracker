"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Reminder bell with an unread badge. Lives in the top bar on both phone and
 * desktop so notifications sit where people expect them.
 */
export function NotificationBell({
  count = 0,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const pathname = usePathname();
  const active = pathname.startsWith("/reminders");

  return (
    <Link
      href="/reminders"
      aria-label={count > 0 ? `Reminders, ${count} unread` : "Reminders"}
      className={cn(
        "relative flex items-center justify-center pressable text-[var(--foreground-secondary)] hover:text-[var(--foreground)]",
        className
      )}
    >
      <BellIcon width={20} height={20} className={active ? "text-[var(--accent)]" : undefined} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold leading-none text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
