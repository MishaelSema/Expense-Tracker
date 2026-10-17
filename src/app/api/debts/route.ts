import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError, zodMessage } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Debt from "@/models/Debt";
import { serializeList } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const TYPES = ["owed_to_me", "i_owe"];
const STATUSES = ["active", "paid"];

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const items = await Debt.find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ debts: serializeList(items) });
  } catch (error) {
    console.error("GET /api/debts", error);
    return serverError();
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json();

    const type = TYPES.includes(String(body.type)) ? String(body.type) : null;
    const person = String(body.person || "").trim();
    const amount = Number(body.amount);
    const description = String(body.description || "").trim();

    let status = "active";
    if (body.status !== undefined) {
      if (!STATUSES.includes(String(body.status)))
        return badRequest("Choose a valid status.");
      status = String(body.status);
    }

    let dueDate: Date | undefined;
    if (body.dueDate) {
      const parsed = new Date(body.dueDate);
      if (isNaN(parsed.getTime())) return badRequest("Choose a valid due date.");
      dueDate = parsed;
    }

    if (!type) return badRequest("Choose whether it is owed to you or by you.");
    if (!person) return badRequest("Add who this is with.");
    if (!amount || amount <= 0)
      return badRequest("Enter an amount greater than zero.");
    if (!description) return badRequest("Add a short description.");

    const created = await Debt.create({
      userId: auth.userId,
      type,
      person,
      amount,
      description,
      dueDate,
      status,
    });

    return NextResponse.json({ debt: created }, { status: 201 });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) return badRequest(zod);
    console.error("POST /api/debts", error);
    return serverError();
  }
}
