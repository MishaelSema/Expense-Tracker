import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { resendVerificationSchema } from "@/lib/validations";
import { sendEmail, generateVerificationEmail } from "@/lib/mail";
import { zodMessage } from "@/lib/api-auth";

/**
 * Issues a fresh verification link.
 *
 * Without this, a user whose link expired (or was consumed by a refresh, a
 * double-click, or a mail scanner) had no way out: re-registering the same
 * address returns 409. Response shapes are kept generic for unknown addresses
 * so this can't be used to fish for accounts.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = resendVerificationSchema.parse(body);

    await connectDB();

    const user = await User.findOne({ email: validated.email });

    if (user && user.emailVerified) {
      return NextResponse.json({
        message: "That email is already verified — you can sign in.",
        alreadyVerified: true,
      });
    }

    if (user && !user.emailVerified) {
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      user.verificationToken = verificationToken;
      user.verificationTokenExpiry = verificationTokenExpiry;
      await user.save();

      try {
        await sendEmail({
          to: user.email,
          subject: "Verify your email",
          html: generateVerificationEmail(user.name, verificationToken),
        });
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        return NextResponse.json(
          { error: "We couldn't send the email right now. Please try again in a moment." },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      message: "If that address still needs verifying, a new link is on its way.",
      sent: true,
    });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) {
      return NextResponse.json({ error: zod }, { status: 400 });
    }
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
