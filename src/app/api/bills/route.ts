import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError, zodMessage } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Bill from "@/models/Bill";
import { serializeList } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const FREQUENCIES = ["weekly", "monthly", "yearly", "once"];

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const items = await Bill.find({ userId: auth.userId })
      .sort({ active: -1, nextDueDate: 1 })
      .lean();
    return NextResponse.json({ bills: serializeList(items) });
  } catch (error) {
    console.error("GET /api/bills", error);
    return serverError();
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json();

    const name = String(body.name || "").trim();
    const amount = Number(body.amount);
    const category = String(body.category || "").trim();
    const frequency = FREQUENCIES.includes(String(body.frequency))
      ? String(body.frequency)
      : "monthly";
    const nextDueDate = new Date(body.nextDueDate);
    const note = body.note ? String(body.note).trim() : undefined;
    const active = body.active === undefined ? true : Boolean(body.active);

    if (!name) return badRequest("Give the bill a name.");
    if (!amount || amount <= 0) return badRequest("Enter an amount greater than zero.");
    if (!category) return badRequest("Choose a category.");
    if (isNaN(nextDueDate.getTime())) return badRequest("Choose a valid next due date.");

    const created = await Bill.create({
      userId: auth.userId,
      name,
      amount,
      category,
      frequency,
      nextDueDate,
      note,
      active,
    });

    return NextResponse.json({ bill: created }, { status: 201 });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) return badRequest(zod);
    console.error("POST /api/bills", error);
    return serverError();
  }
}
