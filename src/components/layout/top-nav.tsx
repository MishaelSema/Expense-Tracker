"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { primaryNav, secondaryNav, accountNav, APP_NAME } from "@/lib/nav";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Desktop top bar — translucent, content scrolls beneath it, apple.com-like.
 * Compact on mobile (wordmark only).
 */
export function TopNav({
  userName,
  reminderCount = 0,
}: {
  userName?: string;
  reminderCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const links = [...primaryNav, ...secondaryNav];

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  const initials = (userName ?? "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 hidden lg:block material transition-colors duration-300",
        scrolled ? "border-b border-[var(--separator)]" : "border-b border-transparent"
      )}
      style={{ backgroundColor: "color-mix(in srgb, var(--surface) 72%, transparent)" }}
    >
      <div className="mx-auto max-w-[1120px] px-6 h-12 flex items-center gap-7">
        <Link
          href="/dashboard"
          className="text-[15px] font-semibold tracking-apple text-[var(--foreground)] pressable"
        >
          {APP_NAME}
        </Link>

        <nav className="flex items-center gap-1" aria-label="Primary">
          {links.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[13px] tracking-apple transition-colors",
                  active
                    ? "text-[var(--foreground)]"
                    : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] pressable" />
          <NotificationBell className="w-9 h-9 rounded-full hover:bg-[var(--surface-secondary)]" count={reminderCount} />
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold text-white pressable"
              style={{ backgroundColor: "var(--accent)" }}
              title={userName ?? "Account"}
            >
              {initials || "·"}
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 z-50 rounded-2xl bg-[var(--surface)] border border-[var(--separator)] shadow-[0_12px_40px_rgba(0,0,0,0.16)] overflow-hidden py-1.5"
                >
                  {userName && (
                    <div className="px-4 py-2">
                      <p className="text-[14px] font-medium text-[var(--foreground)] truncate">
                        {userName}
                      </p>
                    </div>
                  )}
                  <div className="h-px bg-[var(--separator)] my-1" />
                  {accountNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className="flex items-center gap-3 px-4 h-9 text-[14px] text-[var(--foreground)] hover:bg-[var(--surface-secondary)]"
                    >
                      <item.icon width={17} height={17} className="text-[var(--foreground-secondary)]" />
                      {item.label}
                    </Link>
                  ))}
                  <div className="h-px bg-[var(--separator)] my-1" />
                  <button
                    role="menuitem"
                    onClick={handleSignOut}
                    className="w-full text-left px-4 h-9 text-[14px] text-[var(--danger)] hover:bg-[var(--surface-secondary)]"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
