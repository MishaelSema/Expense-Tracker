import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json();

    const current = String(body.currentPassword ?? "");
    const next = String(body.newPassword ?? "");

    if (!current) return badRequest("Enter your current password.");
    if (next.length < 6) return badRequest("Use at least 6 characters for your new password.");
    if (next === current) return badRequest("Choose a password that isn't your current one.");

    const user = await User.findById(auth.userId).select("+password");
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const match = await user.comparePassword(current);
    if (!match) {
      return badRequest("Your current password isn't correct.");
    }

    user.password = next;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/profile/password", error);
    return serverError();
  }
}
