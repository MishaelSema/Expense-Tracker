import webpush from "web-push";

let ready = false;

/** True when VAPID keys are configured; without them push is simply skipped. */
export function pushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function ensureConfigured() {
  if (ready) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
  ready = true;
}

export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends one notification to each subscription. Returns the endpoints the push
 * service says are gone, so the caller can prune them.
 */
export async function sendPush(
  subscriptions: StoredSubscription[],
  payload: PushPayload
): Promise<{ sent: number; gone: string[] }> {
  if (!pushConfigured() || subscriptions.length === 0) {
    return { sent: 0, gone: [] };
  }
  ensureConfigured();

  const body = JSON.stringify(payload);
  const gone: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body
        );
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          gone.push(sub.endpoint);
        } else {
          console.error("Push failed:", status ?? error);
        }
      }
    })
  );

  return { sent, gone };
}
