/* Ledger service worker — handles reminder push notifications. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Ledger";
  const body = data.body || "";
  const url = data.url || "/reminders";

  event.waitUntil(
    (async () => {
      // Show the alert, then tell the server what actually happened. Without
      // the report-back, a push Apple accepted but the phone refused to show is
      // indistinguishable from one that was delivered.
      let shown = false;
      let error = "";
      try {
        await self.registration.showNotification(title, {
          body,
          icon: "/icon.svg",
          badge: "/icon.svg",
          // A reminder's platform logo, when one was attached.
          ...(data.image ? { image: data.image } : {}),
          // Let iOS treat the alert as time-sensitive so Focus modes and the
          // Scheduled Summary don't park it for hours. Ignored where unsupported.
          interruptionLevel: "time-sensitive",
          data: { url },
        });
        shown = true;
      } catch (err) {
        error = String((err && err.message) || err).slice(0, 160);
        // If the richer options were rejected outright, a plain notification
        // still beats silence.
        try {
          await self.registration.showNotification(title, { body, data: { url } });
          shown = true;
        } catch (err2) {
          error = `${error} | ${String((err2 && err2.message) || err2)}`.slice(0, 200);
        }
      }

      try {
        const subscription = await self.registration.pushManager.getSubscription();
        if (subscription) {
          await fetch("/api/notifications/ack", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint, shown, error }),
          });
        }
      } catch {
        // The ack is best effort — never let it stop the notification.
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || "/reminders";
  // Absolute on purpose: Client.navigate() resolves relative URLs against the
  // client's own address, which on iOS can be anything (about:blank, a deep
  // link) — the origin keeps the tap landing on the right page.
  const url = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
