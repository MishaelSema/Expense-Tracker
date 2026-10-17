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

    const user = await User.findOne({
      resetToken: validated.token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    user.password = validated.password;
    user.resetToken = undefined;
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
