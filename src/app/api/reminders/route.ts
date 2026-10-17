import { NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Reminder from "@/models/Reminder";
import { syncRemindersForUser } from "@/lib/reminders";
import { serializeList } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 };

/** Active reminders for the signed-in user, rebuilt from their current data. */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();

    const user = await User.findById(auth.userId);
    await syncRemindersForUser(auth.userId, user?.currency || "XAF");

    const items = await Reminder.find({
      userId: auth.userId,
      dismissedAt: null,
    }).lean();

    const reminders = items.sort((a, b) => {
      const ra = RANK[a.severity] ?? 3;
      const rb = RANK[b.severity] ?? 3;
      if (ra !== rb) return ra - rb;
      const at = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bt = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return at - bt;
    });

    return NextResponse.json({ reminders: serializeList(reminders) });
  } catch (error) {
    console.error("GET /api/reminders", error);
    return serverError();
  }
}

/** Marks every unread reminder as read. */
export async function PATCH() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const result = await Reminder.updateMany(
      { userId: auth.userId, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return NextResponse.json({ ok: true, updated: result.modifiedCount });
  } catch (error) {
    console.error("PATCH /api/reminders", error);
    return serverError();
  }
}
