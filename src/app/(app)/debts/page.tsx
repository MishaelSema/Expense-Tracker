import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Debt from "@/models/Debt";
import { serializeList } from "@/lib/serialize";
import { DebtsView } from "@/components/debts/debts-view";

export default async function DebtsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await connectDB();

  const debts = await Debt.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  return <DebtsView debts={serializeList(debts)} />;
}
