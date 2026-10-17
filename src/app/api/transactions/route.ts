import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError, zodMessage } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import { serializeList } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 200), 500);

    const items = await Transaction.find({ userId: auth.userId })
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ transactions: serializeList(items) });
  } catch (error) {
    console.error("GET /api/transactions", error);
    return serverError();
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json();

    const type = body.type === "income" ? "income" : "expense";
    const amount = Number(body.amount);
    const category = String(body.category || "").trim();
    const description = String(body.description || "").trim();
    const date = body.date ? new Date(body.date) : new Date();

    if (!amount || amount <= 0) return badRequest("Enter an amount greater than zero.");
    if (!description) return badRequest("Add a short description.");
    if (!category) return badRequest("Choose a category.");
    if (isNaN(date.getTime())) return badRequest("Choose a valid date.");

    const created = await Transaction.create({
      userId: auth.userId,
      type,
      amount,
      category,
      description,
      date,
    });

    return NextResponse.json({ transaction: created }, { status: 201 });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) return badRequest(zod);
    console.error("POST /api/transactions", error);
    return serverError();
  }
}
