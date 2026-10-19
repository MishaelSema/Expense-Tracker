import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";
import { sendPush, recordPushOutcome, pushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Fires a real notification at this account's devices.
 *
 * Enabling notifications only proves the browser said "yes"; this proves the
 * whole path — server, push service and home-screen app — actually delivers.
 */
export async function POST() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();

    if (!pushConfigured()) {
      return badRequest("Notifications aren't available right now.");
    }

    const subs = await PushSubscription.find({ userId: auth.userId }).lean();
    if (subs.length === 0) {
      return badRequest("No device has notifications on yet.");
    }

    const endpoints = subs.map((s) => s.endpoint);
    const outcome = await sendPush(
      subs.map((s) => ({ endpoint: s.endpoint, keys: s.keys })),
      {
        title: "Ledger test notification",
        body: "This device will receive reminders here.",
        url: "/reminders",
      },
      { ttl: 120 }
    );
    await recordPushOutcome(endpoints, outcome);

    if (outcome.failures.length > 0 && outcome.sent === 0) {
      const first = outcome.failures[0];
      return NextResponse.json({
        sent: 0,
        error: first.status
          ? `The push service answered ${first.status}.`
          : "The push service couldn't be reached.",
        detail: first.message,
      });
    }

    return NextResponse.json({ sent: outcome.sent });
  } catch (error) {
    console.error("POST /api/notifications/test", error);
    return serverError();
  }
}
