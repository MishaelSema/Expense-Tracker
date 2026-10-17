import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";
import { pushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Tells the client whether push is available, and the VAPID public key. */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const configured = pushConfigured();
  return NextResponse.json({
    configured,
    publicKey: configured ? process.env.VAPID_PUBLIC_KEY ?? null : null,
  });
}

/** Saves (or refreshes) this browser's push subscription for the user. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));

    const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
    const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
    const authKey = typeof body?.keys?.auth === "string" ? body.keys.auth : "";

    if (!endpoint || !p256dh || !authKey) {
      return badRequest("That subscription is incomplete.");
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        $set: {
          userId: auth.userId,
          keys: { p256dh, auth: authKey },
          userAgent: req.headers.get("user-agent") || undefined,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/notifications/subscribe", error);
    return serverError();
  }
}

/** Removes a browser subscription the user turned off (or that has expired). */
export async function DELETE(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");
    if (!endpoint) return badRequest("Missing endpoint.");

    await PushSubscription.deleteOne({ userId: auth.userId, endpoint });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/notifications/subscribe", error);
    return serverError();
  }
}
