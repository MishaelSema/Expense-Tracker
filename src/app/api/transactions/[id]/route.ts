import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";

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
    if (body.type === "income" || body.type === "expense") update.type = body.type;
    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!amount || amount <= 0) return badRequest("Enter an amount greater than zero.");
      update.amount = amount;
    }
    if (body.category !== undefined) update.category = String(body.category).trim();
    if (body.description !== undefined) update.description = String(body.description).trim();
    if (body.date !== undefined) {
      const date = new Date(body.date);
      if (isNaN(date.getTime())) return badRequest("Choose a valid date.");
      update.date = date;
    }

    const updated = await Transaction.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      update,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ transaction: updated });
  } catch (error) {
    console.error("PATCH /api/transactions/[id]", error);
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

    const deleted = await Transaction.findOneAndDelete({
      _id: id,
      userId: auth.userId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id]", error);
    return serverError();
  }
}
