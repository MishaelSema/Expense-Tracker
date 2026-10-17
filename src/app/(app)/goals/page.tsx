import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Goal from "@/models/Goal";
import { serializeList } from "@/lib/serialize";
import { GoalsView } from "@/components/goals/goals-view";

export default async function GoalsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await connectDB();
  const goals = await Goal.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  return <GoalsView goals={serializeList(goals)} />;
}
