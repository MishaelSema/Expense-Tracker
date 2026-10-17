import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Goal from "@/models/Goal";
import { serializeList } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const items = await Goal.find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ goals: serializeList(items) });
  } catch (error) {
    console.error("GET /api/goals", error);
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
    const targetAmount = Number(body.targetAmount);
    const savedAmount =
      body.savedAmount === undefined || body.savedAmount === null || body.savedAmount === ""
        ? 0
        : Number(body.savedAmount);

    if (!title) return badRequest("Add a title for this goal.");
    if (!targetAmount || targetAmount <= 0)
      return badRequest("Enter a target greater than zero.");
    if (isNaN(savedAmount) || savedAmount < 0)
      return badRequest("Saved amount can't be negative.");

    let targetDate: Date | undefined;
    if (body.targetDate) {
      targetDate = new Date(body.targetDate);
      if (isNaN(targetDate.getTime())) return badRequest("Choose a valid target date.");
    }

    const note = String(body.note || "").trim() || undefined;

    const created = await Goal.create({
      userId: auth.userId,
      title,
      targetAmount,
      savedAmount: Math.min(Math.max(savedAmount, 0), targetAmount),
      targetDate,
      note,
    });

    return NextResponse.json({ goal: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/goals", error);
    return serverError();
  }
}
