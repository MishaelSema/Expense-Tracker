import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Bill from "@/models/Bill";
import { serializeList } from "@/lib/serialize";
import { BillsView } from "@/components/bills/bills-view";

export const metadata = { title: "Bills" };

export default async function BillsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await connectDB();

  const bills = await Bill.find({ userId: user._id })
    .sort({ active: -1, nextDueDate: 1 })
    .lean();

  return <BillsView bills={serializeList(bills)} />;
}
