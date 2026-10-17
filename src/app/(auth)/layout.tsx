import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/nav";

/**
 * Centered, quiet auth layout. Minimal chrome, generous space, no decoration —
 * the focus stays on the form.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--background)]">
      <header className="h-14 flex items-center px-5">
        <Link href="/" className="text-[15px] font-semibold tracking-apple pressable">
          {APP_NAME}
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-5 pb-20">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
      <footer className="px-5 py-6 text-center">
        <p className="text-[12px] text-[var(--foreground-secondary)]">
          <Link href="/privacy" className="hover:text-[var(--foreground)]">
            Privacy
          </Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-[var(--foreground)]">
            Terms
          </Link>
          <span className="mx-2">·</span>
          <Link href="/cookies" className="hover:text-[var(--foreground)]">
            Cookies
          </Link>
        </p>
      </footer>
    </div>
  );
}
