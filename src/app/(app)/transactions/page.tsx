import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import { serializeList } from "@/lib/serialize";
import { TransactionsView } from "@/components/transactions/transactions-view";

export const metadata = { title: "Activity" };

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  await connectDB();

  const items = await Transaction.find({ userId: user._id })
    .sort({ date: -1 })
    .limit(500)
    .lean();

  const transactions = serializeList(items).map((t) => ({
    id: String(t._id),
    type: t.type,
    amount: t.amount,
    category: t.category,
    description: t.description,
    date: t.date,
    createdAt: t.createdAt,
  }));

  return <TransactionsView transactions={transactions} />;
}
