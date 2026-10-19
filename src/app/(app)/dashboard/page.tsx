import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Reminder from "@/models/Reminder";
import { serializeList } from "@/lib/serialize";
import { computeMonthStats } from "@/lib/stats";
import { syncRemindersForUser } from "@/lib/reminders";
import { getRates, getNews } from "@/lib/external-data";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata = { title: "Overview" };

const RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 };

function rateLabel(rate: number): string {
  const digits = rate >= 100 ? 2 : rate >= 1 ? 4 : 6;
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(rate);
}

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

  // Refresh reminders, then surface the most urgent few on the home screen.
  await syncRemindersForUser(String(user._id), user.currency || "XAF");
  const reminderDocs = await Reminder.find({ userId: user._id, dismissedAt: null }).lean();
  const reminders = serializeList<{
    _id: string;
    title: string;
    body: string;
    severity: string;
    dueDate?: string | null;
  }>(reminderDocs)
    .sort((a, b) => {
      const ra = RANK[a.severity] ?? 3;
      const rb = RANK[b.severity] ?? 3;
      if (ra !== rb) return ra - rb;
      const at = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bt = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return at - bt;
    })
    .slice(0, 3);

  // A two-line market strip: EUR→XAF and USD→XAF (the two that matter most),
  // plus the day's headlines so the Overview stands on its own.
  const [rates, news] = await Promise.all([getRates(), getNews(6)]);
  const marketRates: { label: string; value: string }[] = [];
  if (rates?.rates?.XAF) {
    marketRates.push({
      label: "1 EUR",
      value: `${rateLabel(rates.rates.XAF)} XAF`,
    });
    if (rates.rates.USD) {
      marketRates.push({
        label: "1 USD",
        value: `${rateLabel(rates.rates.XAF / rates.rates.USD)} XAF`,
      });
    }
  }

  return (
    <DashboardView
      userName={user.name}
      stats={JSON.parse(JSON.stringify(stats))}
      recent={JSON.parse(JSON.stringify(recent))}
      reminders={JSON.parse(JSON.stringify(reminders))}
      marketRates={marketRates}
      news={JSON.parse(JSON.stringify(news))}
    />
  );
}
