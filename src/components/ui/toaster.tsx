"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Apple-style toasts via Sonner: top-center, minimal system-like styling.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      offset={16}
      richColors={false}
      closeButton={false}
      duration={3200}
      toastOptions={{
        style: {
          background: "var(--surface)",
          color: "var(--foreground)",
          border: "1px solid var(--separator)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          fontFamily: "inherit",
          fontSize: "15px",
        },
      }}
      gap={8}
    />
  );
}
