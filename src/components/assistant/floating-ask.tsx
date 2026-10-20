"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { ChatIcon } from "@/components/ui/icons";
import { AskLedger } from "./ask-ledger";

/**
 * The assistant, one tap away from any screen: a floating button that opens a
 * sheet in place, so capturing a record never costs you your spot.
 */
export function FloatingAsk({ currency = "XAF" }: { currency?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // On its own page the button would only repeat what is already there.
  if (pathname === "/assistant") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask Ledger"
        className="pressable fixed right-4 bottom-20 lg:right-6 lg:bottom-6 z-[60] flex h-12 items-center gap-2 rounded-full bg-[var(--accent)] pl-4 pr-5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <ChatIcon width={20} height={20} />
        <span className="text-[15px] font-medium">Ask Ledger</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Ask Ledger">
        <AskLedger bare autoFocus={open} currency={currency} />
      </Sheet>
    </>
  );
}
