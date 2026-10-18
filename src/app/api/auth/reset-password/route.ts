import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { resetPasswordSchema } from "@/lib/validations";
import { zodMessage } from "@/lib/api-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = resetPasswordSchema.parse(body);

    await connectDB();

    // No expiry predicate: we need to know WHY the link failed so the message
    // is accurate ("already used" / "expired" / "invalid") instead of lumping
    // them all into a scary "expired".
    const user = await User.findOne({ resetToken: validated.token });

    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid. Please request a new one." },
        { status: 400 }
      );
    }

    if (user.resetTokenUsedAt) {
      return NextResponse.json(
        { error: "This reset link has already been used. Please request a new one." },
        { status: 400 }
      );
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    user.password = validated.password;
    // Mark the token redeemed instead of deleting it — still strictly one-time,
    // but a second click now reports the truth rather than "expired".
    user.resetTokenUsedAt = new Date();
    user.resetTokenExpiry = undefined;
    await user.save();

    return NextResponse.json({ message: "Password reset successful. You can now sign in." });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) {
      return NextResponse.json({ error: zod }, { status: 400 });
    }
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
