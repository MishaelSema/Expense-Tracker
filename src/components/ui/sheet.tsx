"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Apple-style sheet: slides up from the bottom on small screens with a spring,
 * centered dialog on large screens. Scrim dims the background. Dismissible
 * by scrim click or Escape.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const spring = reduceMotion
    ? { duration: 0.15 }
    : { type: "spring" as const, stiffness: 400, damping: 34, mass: 0.9 };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          {/* Scrim */}
          <motion.div
            className="absolute inset-0 bg-black/40 material"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.25 }}
            onClick={onClose}
          />
          {/* Sheet surface */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "relative w-full sm:w-[480px] max-h-[92vh] overflow-y-auto",
              "bg-[var(--surface)] sm:rounded-3xl rounded-t-3xl",
              "shadow-[0_-8px_40px_rgba(0,0,0,0.16)] sm:shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
            )}
            initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            transition={spring}
          >
            {/* Grabber — hint that the sheet is draggable/dismissible */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
              <div className="w-9 h-1.5 rounded-full bg-[var(--separator)]" />
            </div>
            {title && (
              <div className="px-5 pt-4 sm:pt-5 pb-1">
                <h2 className="text-[20px] font-semibold tracking-apple">{title}</h2>
              </div>
            )}
            <div className="p-5 pt-3">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
