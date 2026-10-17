import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { connectDB } from "./db";
import User from "@/models/User";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  await connectDB();
  const user = await User.findById(session.user.id);
  return user;
}
