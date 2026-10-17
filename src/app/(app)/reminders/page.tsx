import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Reminder from "@/models/Reminder";
import { syncRemindersForUser } from "@/lib/reminders";
import { serializeList } from "@/lib/serialize";
import { RemindersView, type ReminderItem } from "@/components/reminders/reminders-view";

export const metadata = { title: "Reminders" };

const RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 };

export default async function RemindersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await connectDB();

  // Always rebuild from the user's current data before showing the list.
  await syncRemindersForUser(String(user._id), user.currency || "XAF");

  const items = await Reminder.find({ userId: user._id, dismissedAt: null }).lean();
  const serialized = serializeList<ReminderItem>(items);

  const reminders = serialized.sort((a, b) => {
    const ra = RANK[a.severity] ?? 3;
    const rb = RANK[b.severity] ?? 3;
    if (ra !== rb) return ra - rb;
    const at = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bt = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return at - bt;
  });

  return (
    <RemindersView
      reminders={reminders}
      unread={reminders.filter((r) => !r.readAt).length}
    />
  );
}
