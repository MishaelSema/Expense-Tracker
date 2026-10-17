import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError, zodMessage } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import WishlistItem from "@/models/WishlistItem";
import { serializeList } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const PRIORITIES = ["low", "medium", "high"] as const;

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();

    const items = await WishlistItem.find({ userId: auth.userId })
      .sort({ purchased: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({ items: serializeList(items) });
  } catch (error) {
    console.error("GET /api/wishlist", error);
    return serverError();
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json();

    const title = String(body.title || "").trim();
    const price = Number(body.price);
    const priority = PRIORITIES.includes(body.priority) ? body.priority : "medium";
    const link = String(body.link || "").trim();
    const notes = String(body.notes || "").trim();
    const purchased = Boolean(body.purchased);

    if (!title) return badRequest("Add a title.");
    if (!price || price <= 0) return badRequest("Enter a price greater than zero.");
    if (link && !isValidUrl(link)) return badRequest("Enter a valid link.");

    let targetDate: Date | undefined;
    if (body.targetDate) {
      const parsed = new Date(body.targetDate);
      if (isNaN(parsed.getTime())) return badRequest("Choose a valid date.");
      targetDate = parsed;
    }

    const created = await WishlistItem.create({
      userId: auth.userId,
      title,
      price,
      priority,
      link: link || undefined,
      notes: notes || undefined,
      purchased,
      targetDate,
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) return badRequest(zod);
    console.error("POST /api/wishlist", error);
    return serverError();
  }
}
