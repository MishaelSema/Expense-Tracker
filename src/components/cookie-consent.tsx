"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie-consent";

/**
 * Quiet, dismissible cookie notice. Sits above the mobile tab bar so it never
 * covers navigation.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      /* storage unavailable — stay hidden */
    }
  }, []);

  function dismiss(choice: "accepted" | "essential") {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed z-[90] bottom-20 lg:bottom-6 inset-x-3 sm:left-auto sm:right-6 sm:w-[360px]">
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--separator)] shadow-[0_12px_40px_rgba(0,0,0,0.16)] p-4">
        <p className="text-[14px] leading-relaxed text-[var(--foreground-secondary)]">
          We use essential cookies to keep you signed in. See our{" "}
          <Link href="/cookies" className="text-[var(--accent)] hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => dismiss("accepted")}
            className="h-9 px-4 rounded-full bg-[var(--accent)] text-white text-[14px] font-medium pressable"
          >
            Got it
          </button>
          <button
            onClick={() => dismiss("essential")}
            className="h-9 px-4 rounded-full text-[14px] font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)] pressable"
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}
