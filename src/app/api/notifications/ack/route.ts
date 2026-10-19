import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";

export const dynamic = "force-dynamic";

/**
 * Called by the service worker the moment a push actually lands on a device.
 *
 * A push service answering 201 only means the message left the queue — if the
 * phone then refuses to show it, nothing anywhere records that. This endpoint
 * closes the loop, so "did it arrive?" has an answer instead of silence.
 *
 * No session is required: the subscription endpoint is itself an unguessable
 * capability, known only to the device that owns it, and an unknown endpoint
 * simply updates nothing.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    if (!endpoint) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await connectDB();
    await PushSubscription.updateOne(
      { endpoint },
      {
        $set: {
          lastAckAt: new Date(),
          lastAckShown: body?.shown === true,
          lastAckError: typeof body?.error === "string" ? body.error.slice(0, 200) : "",
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/notifications/ack", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
