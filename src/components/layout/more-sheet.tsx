"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Sheet } from "@/components/ui/sheet";
import { secondaryNav, accountNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const rows = [...secondaryNav, ...accountNav];

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ redirect: false });
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  return (
    <Sheet open={open} onClose={onClose} title="More">
      <div className="rounded-2xl bg-[var(--surface-secondary)] overflow-hidden -mx-1">
        {rows.map((item, i) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 h-[52px] pressable",
                i > 0 && "border-t border-[var(--separator)]"
              )}
            >
              <Icon
                width={20}
                height={20}
                className={active ? "text-[var(--accent)]" : "text-[var(--foreground-secondary)]"}
              />
              <span className="text-[16px] text-[var(--foreground)]">{item.label}</span>
              {active && (
                <span className="ml-auto text-[13px] text-[var(--accent)]">Current</span>
              )}
            </Link>
          );
        })}
      </div>

      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="mt-4 w-full h-[52px] rounded-2xl bg-[var(--surface-secondary)] text-[16px] font-medium text-[var(--danger)] pressable disabled:opacity-50"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </Sheet>
  );
}
