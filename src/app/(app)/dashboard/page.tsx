import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import { serializeList } from "@/lib/serialize";
import { computeMonthStats } from "@/lib/stats";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  await connectDB();

  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const items = await Transaction.find({
    userId: user._id,
    date: { $gte: since },
  })
    .sort({ date: -1 })
    .limit(1000)
    .lean();

  const plain = serializeList(items).map((t) => ({
    id: String(t._id),
    type: t.type,
    amount: t.amount,
    category: t.category,
    description: t.description,
    date: t.date,
  }));

  const stats = computeMonthStats(plain);

  const recent = plain.slice(0, 5).map((t) => ({
    ...t,
    date: t.date,
  }));

  return (
    <DashboardView
      userName={user.name}
      stats={JSON.parse(JSON.stringify(stats))}
      recent={JSON.parse(JSON.stringify(recent))}
    />
  );
}
