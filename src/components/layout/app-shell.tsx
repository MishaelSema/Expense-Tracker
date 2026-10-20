import type { ReactNode } from "react";
import { TopNav } from "./top-nav";
import { MobileTopBar } from "./mobile-top-bar";
import { BottomNav } from "./bottom-nav";

/**
 * Shell for authenticated pages: translucent nav on desktop, compact bar +
 * bottom tab bar on phones. Content sits in a comfortable reading column.
 */
export function AppShell({
  children,
  userName,
  reminderCount = 0,
}: {
  children: ReactNode;
  userName?: string;
  reminderCount?: number;
}) {
  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-[14px] focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <TopNav userName={userName} reminderCount={reminderCount} />
      <MobileTopBar reminderCount={reminderCount} />
      <main
        id="main"
        className="mx-auto max-w-[1120px] px-4 sm:px-6 pt-5 pb-36 lg:pb-20"
      >
        {children}
      </main>
      <BottomNav reminderCount={reminderCount} />
    </div>
  );
}
