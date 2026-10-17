import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Reminder from "@/models/Reminder";
import { serialize } from "@/lib/serialize";

/** Marks a single reminder read/unread, or dismisses/restores it. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const update: Record<string, unknown> = {};
    if (typeof body.read === "boolean") {
      update.readAt = body.read ? new Date() : null;
    }
    if (typeof body.dismissed === "boolean") {
      update.dismissedAt = body.dismissed ? new Date() : null;
    }
    if (Object.keys(update).length === 0) {
      return badRequest("Nothing to update.");
    }

    const updated = await Reminder.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      update,
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    return NextResponse.json({ reminder: serialize(updated) });
  } catch (error) {
    console.error("PATCH /api/reminders/[id]", error);
    return serverError();
  }
}
