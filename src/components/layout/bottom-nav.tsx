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
 */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 material border-t border-[var(--separator)]"
        style={{ backgroundColor: "color-mix(in srgb, var(--surface) 72%, transparent)" }}
        aria-label="Primary"
      >
        <div className="flex items-stretch h-[54px] pb-[env(safe-area-inset-bottom)]">
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
                  "relative flex-1 flex flex-col items-center justify-center gap-0.5",
                  active ? "text-[var(--accent)]" : "text-[var(--foreground-secondary)]"
                )}
              >
                <Icon width={22} height={22} />
                <span className="text-[10px] font-medium tracking-apple leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 text-[var(--foreground-secondary)]"
            aria-label="More"
          >
            <MoreIcon width={22} height={22} />
            <span className="text-[10px] font-medium tracking-apple leading-none">More</span>
          </button>
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
