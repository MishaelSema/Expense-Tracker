import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { forgotPasswordSchema } from "@/lib/validations";
import { sendEmail, generateResetPasswordEmail } from "@/lib/mail";
import { zodMessage } from "@/lib/api-auth";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = forgotPasswordSchema.parse(body);

    await connectDB();

    const user = await User.findOne({ email: validated.email });

    // Always return success to prevent email enumeration
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.resetToken = resetToken;
      user.resetTokenExpiry = resetTokenExpiry;
      // A fresh link invalidates the "redeemed" mark of any previous one.
      user.resetTokenUsedAt = undefined;
      await user.save();

      try {
        await sendEmail({
          to: user.email,
          subject: "Reset your password",
          html: generateResetPasswordEmail(user.name, resetToken),
        });
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError);
      }
    }

    return NextResponse.json({
      message: "If an account exists with that email, a password reset link has been sent.",
    });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) {
      return NextResponse.json({ error: zod }, { status: 400 });
    }
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
