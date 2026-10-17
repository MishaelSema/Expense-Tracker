"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { APP_NAME } from "@/lib/nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { status } = useSession();
  const authed = status === "authenticated";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 material transition-[border-color] duration-300",
        scrolled ? "border-b border-[var(--separator)]" : "border-b border-transparent"
      )}
      style={{ backgroundColor: "color-mix(in srgb, var(--surface) 72%, transparent)" }}
    >
      <div className="mx-auto max-w-[1024px] px-5 h-12 flex items-center gap-6">
        <Link href="/" className="text-[15px] font-semibold tracking-apple pressable">
          {APP_NAME}
        </Link>
        <nav className="hidden sm:flex items-center gap-1" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "px-3 py-1.5 rounded-full text-[13px] tracking-apple transition-colors",
                pathname === l.href
                  ? "text-[var(--foreground)]"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--foreground-secondary)] pressable" />
          {authed ? (
            <Link
              href="/dashboard"
              className="h-8 px-4 rounded-full bg-[var(--accent)] text-white text-[13px] font-medium flex items-center pressable"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:flex h-8 px-3 items-center text-[13px] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="h-8 px-4 rounded-full bg-[var(--accent)] text-white text-[13px] font-medium flex items-center pressable"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
