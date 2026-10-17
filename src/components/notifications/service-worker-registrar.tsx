"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once per session so push notifications keep
 * working for users who already enabled them. Renders nothing.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* Notification support is optional — ignore failures. */
    });
  }, []);

  return null;
}
