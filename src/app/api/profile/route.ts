import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import Budget from "@/models/Budget";
import Debt from "@/models/Debt";
import WishlistItem from "@/models/WishlistItem";
import Note from "@/models/Note";
import Todo from "@/models/Todo";
import Goal from "@/models/Goal";
import Bill from "@/models/Bill";
import Reminder from "@/models/Reminder";
import PushSubscription from "@/models/PushSubscription";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/** Update profile details (name, currency, notification preference). */
export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json();
    const user = await User.findById(auth.userId).select("+password");
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (typeof body.name === "string" && body.name.trim().length >= 2) {
      user.name = body.name.trim();
    }
    if (typeof body.currency === "string") {
      user.currency = body.currency;
    }
    if (typeof body.notifications === "boolean") {
      user.preferences = user.preferences || {};
      user.preferences.notifications = body.notifications;
    }
    if (body.reminders && typeof body.reminders === "object") {
      user.preferences = user.preferences || {};
      const current = user.preferences.reminders || { email: true, push: false };
      user.preferences.reminders = {
        email:
          typeof body.reminders.email === "boolean" ? body.reminders.email : current.email,
        push: typeof body.reminders.push === "boolean" ? body.reminders.push : current.push,
      };
      user.markModified("preferences");
    }

    await user.save();
    return NextResponse.json({ user: serialize(user) });
  } catch (error) {
    console.error("PATCH /api/profile", error);
    return serverError();
  }
}

/**
 * Delete the account. Requires the current password. Cascades to all of the
 * user's data.
 */
export async function DELETE(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));

    if (!body.password) {
      return badRequest("Enter your password to confirm.");
    }

    const user = await User.findById(auth.userId).select("+password");
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const match = await user.comparePassword(String(body.password));
    if (!match) {
      return badRequest("That password isn't correct.");
    }

    const userId = user._id;
    await Promise.all([
      Transaction.deleteMany({ userId }),
      Budget.deleteMany({ userId }),
      Debt.deleteMany({ userId }),
      WishlistItem.deleteMany({ userId }),
      Note.deleteMany({ userId }),
      Todo.deleteMany({ userId }),
      Goal.deleteMany({ userId }),
      Bill.deleteMany({ userId }),
      Reminder.deleteMany({ userId }),
      PushSubscription.deleteMany({ userId }),
    ]);
    await User.deleteOne({ _id: userId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/profile", error);
    return serverError();
  }
}
