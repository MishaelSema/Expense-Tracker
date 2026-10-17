import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { connectDB } from "./db";

/**
 * Returns the authenticated user's id, or a 401 Response. Route handlers should
 * return the Response directly when `"response" in result`.
 */
export async function requireUser(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return {
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  await connectDB();
  return { userId };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError() {
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}

/** Extracts the first Zod issue message, if the error is a ZodError. */
export function zodMessage(error: unknown): string | null {
  const zod = error as {
    name?: string;
    errors?: Array<{ message?: unknown }>;
  };
  const message = zod?.errors?.[0]?.message;
  if (zod?.name === "ZodError" && message) {
    return String(message);
  }
  return null;
}
