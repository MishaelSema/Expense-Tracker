"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { APP_NAME, primaryNav, secondaryNav, accountNav } from "@/lib/nav";

const allNav = [...primaryNav, ...secondaryNav, ...accountNav];

/**
 * Compact top bar for phones. Shows the current section name (wayfinding) with
 * the wordmark and appearance toggle. The tab bar handles the rest.
 */
export function MobileTopBar({ reminderCount = 0 }: { reminderCount?: number }) {
  const pathname = usePathname();
  const current =
    allNav.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"))?.label ??
    APP_NAME;

  return (
    <header
      className="lg:hidden sticky top-0 z-40 material border-b border-[var(--separator)]"
      style={{ backgroundColor: "color-mix(in srgb, var(--surface) 72%, transparent)" }}
    >
      <div className="h-12 px-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-[15px] font-semibold tracking-apple pressable">
          {APP_NAME}
        </Link>
        <p className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold tracking-apple">
          {current}
        </p>
        <div className="flex items-center gap-0.5">
          <NotificationBell className="w-9 h-9 rounded-full" count={reminderCount} />
          <ThemeToggle className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--foreground-secondary)] pressable" />
        </div>
      </div>
    </header>
  );
}
