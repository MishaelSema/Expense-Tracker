import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError, zodMessage } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Budget from "@/models/Budget";
import { serializeList } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const PERIODS = ["monthly", "weekly", "yearly"];

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const items = await Budget.find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ budgets: serializeList(items) });
  } catch (error) {
    console.error("GET /api/budgets", error);
    return serverError();
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json();

    const category = String(body.category || "").trim();
    const amount = Number(body.amount);
    const period = PERIODS.includes(String(body.period)) ? String(body.period) : null;
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (!category) return badRequest("Choose a category.");
    if (!amount || amount <= 0)
      return badRequest("Enter an amount greater than zero.");
    if (!period) return badRequest("Choose a period: monthly, weekly or yearly.");
    if (isNaN(startDate.getTime())) return badRequest("Choose a valid start date.");
    if (isNaN(endDate.getTime())) return badRequest("Choose a valid end date.");
    if (endDate < startDate)
      return badRequest("End date must be on or after the start date.");

    const created = await Budget.create({
      userId: auth.userId,
      category,
      amount,
      period,
      startDate,
      endDate,
    });

    return NextResponse.json({ budget: created }, { status: 201 });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) return badRequest(zod);
    console.error("POST /api/budgets", error);
    return serverError();
  }
}
