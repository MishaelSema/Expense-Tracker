"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { primaryNav } from "@/lib/nav";
import { MoreIcon } from "@/components/ui/icons";
import { MoreSheet } from "./more-sheet";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom tab bar — translucent material with content scrolling beneath,
 * matching iOS tab-bar behaviour. Hidden on large screens.
 *
 * Safe-area padding lives on the <nav> (outside the fixed-height row) so the
 * row's height is never eaten by the home-indicator inset. Height and icon size
 * step up at `sm` so the bar stays comfortable from small phones to tablets.
 */
export function BottomNav({ reminderCount = 0 }: { reminderCount?: number }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        // translate3d promotes the bar to its own composited layer. WebKit
        // (notably iOS) occasionally paints fixed bottom bars against the wrong
        // viewport edge — the bar rides up with the page while scrolling even
        // though its layout is correct — and layer promotion is the documented
        // remedy (WebKit bugs 312149 / 297779). It is a no-op elsewhere.
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 material border-t border-[var(--separator)] pb-[env(safe-area-inset-bottom)] [transform:translate3d(0,0,0)]"
        style={{ backgroundColor: "color-mix(in srgb, var(--surface) 72%, transparent)" }}
        aria-label="Primary"
      >
        <div className="mx-auto flex h-14 max-w-[600px] items-stretch sm:h-[60px]">
          {primaryNav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1",
                  active ? "text-[var(--accent)]" : "text-[var(--foreground-secondary)]"
                )}
              >
                <Icon className="h-6 w-6 sm:h-[26px] sm:w-[26px]" />
                <span className="max-w-full truncate text-[11px] font-medium leading-none tracking-apple sm:text-[12px]">
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[var(--foreground-secondary)]"
            aria-label="More"
          >
            <MoreIcon className="h-6 w-6 sm:h-[26px] sm:w-[26px]" />
            <span className="max-w-full truncate text-[11px] font-medium leading-none tracking-apple sm:text-[12px]">
              More
            </span>
          </button>
        </div>
      </nav>

      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        reminderCount={reminderCount}
      />
    </>
  );
}
