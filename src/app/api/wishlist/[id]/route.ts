import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import WishlistItem from "@/models/WishlistItem";

const PRIORITIES = ["low", "medium", "high"] as const;

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const update: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return badRequest("Add a title.");
      update.title = title;
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!price || price <= 0) return badRequest("Enter a price greater than zero.");
      update.price = price;
    }
    if (body.priority !== undefined) {
      update.priority = PRIORITIES.includes(body.priority) ? body.priority : "medium";
    }
    if (body.link !== undefined) {
      const link = String(body.link || "").trim();
      if (link && !isValidUrl(link)) return badRequest("Enter a valid link.");
      update.link = link || null;
    }
    if (body.notes !== undefined) {
      update.notes = String(body.notes || "").trim() || null;
    }
    if (body.purchased !== undefined) {
      update.purchased = Boolean(body.purchased);
    }
    if (body.targetDate !== undefined) {
      if (!body.targetDate) {
        update.targetDate = null;
      } else {
        const parsed = new Date(body.targetDate);
        if (isNaN(parsed.getTime())) return badRequest("Choose a valid date.");
        update.targetDate = parsed;
      }
    }

    const updated = await WishlistItem.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      update,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Wishlist item not found" }, { status: 404 });
    }

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("PATCH /api/wishlist/[id]", error);
    return serverError();
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const { id } = await params;

    const deleted = await WishlistItem.findOneAndDelete({
      _id: id,
      userId: auth.userId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Wishlist item not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/wishlist/[id]", error);
    return serverError();
  }
}
