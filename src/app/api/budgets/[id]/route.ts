import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError, zodMessage } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Budget from "@/models/Budget";

const PERIODS = ["monthly", "weekly", "yearly"];

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

    const existing = await Budget.findOne({ _id: id, userId: auth.userId });
    if (!existing) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {};

    if (body.category !== undefined) {
      const category = String(body.category).trim();
      if (!category) return badRequest("Choose a category.");
      update.category = category;
    }
    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!amount || amount <= 0)
        return badRequest("Enter an amount greater than zero.");
      update.amount = amount;
    }
    if (body.period !== undefined) {
      if (!PERIODS.includes(String(body.period)))
        return badRequest("Choose a period: monthly, weekly or yearly.");
      update.period = String(body.period);
    }

    let startDate = existing.startDate;
    let endDate = existing.endDate;

    if (body.startDate !== undefined) {
      const date = new Date(body.startDate);
      if (isNaN(date.getTime())) return badRequest("Choose a valid start date.");
      update.startDate = date;
      startDate = date;
    }
    if (body.endDate !== undefined) {
      const date = new Date(body.endDate);
      if (isNaN(date.getTime())) return badRequest("Choose a valid end date.");
      update.endDate = date;
      endDate = date;
    }
    if (endDate < startDate)
      return badRequest("End date must be on or after the start date.");

    const updated = await Budget.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      update,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    return NextResponse.json({ budget: updated });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) return badRequest(zod);
    console.error("PATCH /api/budgets/[id]", error);
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

    const deleted = await Budget.findOneAndDelete({
      _id: id,
      userId: auth.userId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/budgets/[id]", error);
    return serverError();
  }
}
