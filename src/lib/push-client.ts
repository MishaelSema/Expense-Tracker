/**
 * Browser-side helpers for enabling/disabling web push. Only ever imported from
 * Client Components.
 */

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) {
    return { ok: false, error: "This browser doesn't support notifications." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      error: "Notifications are blocked. Allow them in your browser settings and try again.",
    };
  }

  const keyRes = await fetch("/api/notifications/subscribe");
  const keyData = await keyRes.json().catch(() => ({}));
  if (!keyData?.configured || !keyData?.publicKey) {
    return { ok: false, error: "Notifications aren't available right now." };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(String(keyData.publicKey)),
    }));

  const res = await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
  if (!res.ok) {
    return { ok: false, error: "Couldn't save your notification settings." };
  }

  return { ok: true };
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await fetch(
    `/api/notifications/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`,
    { method: "DELETE" }
  ).catch(() => undefined);

  await subscription.unsubscribe().catch(() => undefined);
}
