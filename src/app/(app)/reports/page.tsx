import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import { InsightsView, type InsightsData } from "@/components/reports/insights-view";

interface MonthBucket {
  key: string;
  label: string;
  income: number;
  expense: number;
}

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await connectDB();

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // One query for the whole window; everything else is computed in memory.
  const transactions = await Transaction.find({
    userId: user._id,
    date: { $gte: rangeStart },
  }).lean();

  const months: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(d),
      income: 0,
      expense: 0,
    });
  }

  const bucketByKey = new Map(months.map((m) => [m.key, m]));
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const categoryTotals = new Map<string, number>();

  for (const t of transactions) {
    const date = new Date(t.date);

    const bucket = bucketByKey.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) {
      if (t.type === "income") bucket.income += t.amount;
      else bucket.expense += t.amount;
    }

    if (t.type === "expense" && date >= currentStart) {
      categoryTotals.set(
        t.category,
        (categoryTotals.get(t.category) || 0) + t.amount
      );
    }
  }

  const current = months[months.length - 1];
  const previous = months[months.length - 2];

  const expenseChangePercent =
    previous.expense > 0
      ? Math.round(
          ((current.expense - previous.expense) / previous.expense) * 100
        )
      : null;

  const categories = Array.from(categoryTotals, ([category, amount]) => ({
    category,
    amount,
  })).sort((a, b) => b.amount - a.amount);

  const data: InsightsData = {
    current: {
      income: current.income,
      expense: current.expense,
      balance: current.income - current.expense,
    },
    previousExpense: previous.expense,
    expenseChangePercent,
    categories,
    months: months.map((m) => ({
      month: m.label,
      income: m.income,
      expense: m.expense,
    })),
    hasData: transactions.length > 0,
  };

  return <InsightsView data={data} />;
}
