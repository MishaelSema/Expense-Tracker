import webpush from "web-push";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";

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
  /** Optional image (e.g. a platform logo) shown in the notification. */
  image?: string;
}

export interface PushFailure {
  endpoint: string;
  status?: number;
  message: string;
}

export interface PushOutcome {
  sent: number;
  /** Endpoints the push service says are permanently gone (404/410). */
  gone: string[];
  /** Everything else that didn't go through, with the reason. */
  failures: PushFailure[];
}

/**
 * Sends one notification to each subscription. Returns enough detail for the
 * caller to record what happened: success, a dead endpoint to prune, or the
 * exact status the push service refused with.
 */
export async function sendPush(
  subscriptions: StoredSubscription[],
  payload: PushPayload,
  options: { ttl?: number } = {}
): Promise<PushOutcome> {
  const outcome: PushOutcome = { sent: 0, gone: [], failures: [] };
  if (!pushConfigured() || subscriptions.length === 0) return outcome;
  ensureConfigured();

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, {
          TTL: options.ttl ?? 60 * 60 * 24,
          urgency: "normal",
        });
        outcome.sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        const message = String((error as Error)?.message ?? error).slice(0, 300);
        if (status === 404 || status === 410) {
          outcome.gone.push(sub.endpoint);
        } else {
          outcome.failures.push({ endpoint: sub.endpoint, status, message });
          console.error("Push failed:", status ?? message);
        }
      }
    })
  );

  return outcome;
}

/**
 * Writes down what delivery returned and prunes dead endpoints. Push is the
 * one feature where failure is invisible from here — a device we can't see
 * simply stays silent — so the answer is always stored on the subscription.
 */
export async function recordPushOutcome(
  endpoints: string[],
  outcome: PushOutcome
): Promise<void> {
  if (endpoints.length === 0 && outcome.gone.length === 0) return;

  try {
    await connectDB();
    const now = new Date();
    const failures = new Map(
      outcome.failures.map((failure) => [failure.endpoint, failure])
    );

    await Promise.all(
      endpoints.map((endpoint) => {
        const failure = failures.get(endpoint);
        return PushSubscription.updateOne(
          { endpoint },
          {
            $set: {
              lastPushAt: now,
              lastPushStatus: failure ? (failure.status ?? 0) : 201,
              lastPushError: failure ? failure.message : "",
            },
          }
        );
      })
    );

    if (outcome.gone.length > 0) {
      await PushSubscription.deleteMany({ endpoint: { $in: outcome.gone } });
    }
  } catch (error) {
    console.error("recordPushOutcome", error);
  }
}
