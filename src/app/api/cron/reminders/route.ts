import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Reminder from "@/models/Reminder";
import PushSubscription from "@/models/PushSubscription";
import { syncRemindersForUser } from "@/lib/reminders";
import { sendPush } from "@/lib/push";
import { generateReminderDigestEmail, sendEmail } from "@/lib/mail";

/**
 * Daily reminder job. Vercel Cron calls this once a day; the same endpoint can
 * be triggered manually with `?secret=$CRON_SECRET`.
 *
 * For every user: rebuild reminders, then email a digest and/or send a browser
 * push, honouring their per-user preferences.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 };

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  const { searchParams } = new URL(req.url);
  return searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const appUrl = (process.env.APP_URL || "").replace(/\/+$/, "");
    const users = await User.find({})
      .select("name email currency preferences")
      .lean();

    let emailed = 0;
    let pushed = 0;
    let failed = 0;

    for (const user of users) {
      const prefs = user.preferences?.reminders ?? { email: true, push: false };
      const wantEmail = prefs.email !== false;
      const wantPush = Boolean(prefs.push);
      if (!wantEmail && !wantPush) continue;

      try {
        await syncRemindersForUser(String(user._id), user.currency || "XAF");

        const items = await Reminder.find({
          userId: user._id,
          readAt: null,
          dismissedAt: null,
        }).lean();
        if (items.length === 0) continue;

        const ordered = [...items].sort((a, b) => {
          const ra = RANK[a.severity] ?? 3;
          const rb = RANK[b.severity] ?? 3;
          if (ra !== rb) return ra - rb;
          const at = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bt = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return at - bt;
        });
        const ids = ordered.map((r) => r._id);

        if (wantEmail && user.email) {
          await sendEmail({
            to: user.email,
            subject: `Ledger · ${ordered.length} reminder${ordered.length === 1 ? "" : "s"}`,
            html: generateReminderDigestEmail(
              user.name || "there",
              ordered.map((r) => ({ title: r.title, body: r.body }))
            ),
          });
          await Reminder.updateMany(
            { _id: { $in: ids } },
            { $set: { emailedAt: new Date() } }
          );
          emailed++;
        }

        if (wantPush) {
          const subs = await PushSubscription.find({ userId: user._id }).lean();
          if (subs.length > 0) {
            const { sent, gone } = await sendPush(
              subs.map((s) => ({ endpoint: s.endpoint, keys: s.keys })),
              {
                title: "Ledger reminders",
                body:
                  ordered.length === 1
                    ? ordered[0].title
                    : `${ordered.length} things need your attention.`,
                url: `${appUrl}/reminders`,
              }
            );

            if (gone.length > 0) {
              await PushSubscription.deleteMany({ endpoint: { $in: gone } });
            }
            if (sent > 0) {
              await Reminder.updateMany(
                { _id: { $in: ids } },
                { $set: { pushedAt: new Date() } }
              );
              pushed++;
            }
          }
        }
      } catch (error) {
        failed++;
        console.error("Cron reminders failed for", user.email, error);
      }
    }

    return NextResponse.json({
      ok: true,
      users: users.length,
      emailed,
      pushed,
      failed,
    });
  } catch (error) {
    console.error("GET /api/cron/reminders", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
