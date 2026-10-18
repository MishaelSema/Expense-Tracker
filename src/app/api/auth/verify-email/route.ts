import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    await connectDB();

    // Look the token up WITHOUT the expiry predicate first. Verification links
    // get replayed all the time — a refresh, the Back button, opening the mail
    // twice, or a mail scanner following the URL. Treating every replay as
    // "expired" told users their brand-new link was dead, so a redeemed token
    // now answers "already verified" instead.
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return NextResponse.json(
        { error: "This verification link is invalid. Please request a new one." },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({
        message: "Your email is already verified. You can sign in.",
        already: true,
      });
    }

    if (
      !user.verificationTokenExpiry ||
      user.verificationTokenExpiry.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "This verification link has expired. Please request a new one.", expired: true },
        { status: 400 }
      );
    }

    user.emailVerified = new Date();
    // Deliberately keep the token: it still expires on its own after 24h, and
    // keeping it makes a second click on the same link harmless.
    await user.save();

    return NextResponse.json({ message: "Email verified successfully. You can now sign in." });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
