import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { registerSchema } from "@/lib/validations";
import { sendEmail, generateVerificationEmail } from "@/lib/mail";
import { zodMessage } from "@/lib/api-auth";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

    await connectDB();

    const existing = await User.findOne({ email: validated.email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      name: validated.name,
      email: validated.email,
      password: validated.password,
      verificationToken,
      verificationTokenExpiry,
    });

    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: generateVerificationEmail(user.name, verificationToken),
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return NextResponse.json(
      {
        message: "Account created. Please check your email to verify your account.",
      },
      { status: 201 }
    );
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) {
      return NextResponse.json({ error: zod }, { status: 400 });
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
