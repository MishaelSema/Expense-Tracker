import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Budget from "@/models/Budget";
import Transaction from "@/models/Transaction";
import { serialize } from "@/lib/serialize";
import { BudgetsView } from "@/components/budgets/budgets-view";

export default async function BudgetsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await connectDB();

  const budgets = await Budget.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  const items = await Promise.all(
    budgets.map(async (budget) => {
      const [result] = await Transaction.aggregate([
        {
          $match: {
            userId: budget.userId,
            type: "expense",
            category: budget.category,
            date: { $gte: budget.startDate, $lte: budget.endDate },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      return {
        ...serialize(budget),
        spent: typeof result?.total === "number" ? result.total : 0,
      };
    })
  );

  return <BudgetsView budgets={items} />;
}
