import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import { serializeList } from "@/lib/serialize";
import { InsightsView } from "@/components/reports/insights-view";

export const metadata = { title: "Insights" };

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await connectDB();

  // The whole history, trimmed to the fields insights need — the client picks
  // the period (any past month, any year, or all time) without another round
  // trip. A generous limit keeps payloads sane for long-lived accounts.
  const items = await Transaction.find({ userId: user._id })
    .select("type amount category date")
    .sort({ date: -1 })
    .limit(5000)
    .lean();

  const transactions = serializeList<{
    type: string;
    amount: number;
    category: string;
    date: string;
  }>(items).map((t) => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    date: t.date,
  }));

  return <InsightsView transactions={transactions} />;
}
