import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError, zodMessage } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Debt from "@/models/Debt";

const TYPES = ["owed_to_me", "i_owe"];
const STATUSES = ["active", "paid"];

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

    if (body.type !== undefined) {
      if (!TYPES.includes(String(body.type)))
        return badRequest("Choose whether it is owed to you or by you.");
      update.type = String(body.type);
    }
    if (body.person !== undefined) {
      const person = String(body.person).trim();
      if (!person) return badRequest("Add who this is with.");
      update.person = person;
    }
    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!amount || amount <= 0)
        return badRequest("Enter an amount greater than zero.");
      update.amount = amount;
    }
    if (body.description !== undefined) {
      const description = String(body.description).trim();
      if (!description) return badRequest("Add a short description.");
      update.description = description;
    }
    if (body.status !== undefined) {
      if (!STATUSES.includes(String(body.status)))
        return badRequest("Choose a valid status.");
      update.status = String(body.status);
    }
    if (body.dueDate !== undefined) {
      if (body.dueDate === null || body.dueDate === "") {
        update.dueDate = null;
      } else {
        const date = new Date(body.dueDate);
        if (isNaN(date.getTime())) return badRequest("Choose a valid due date.");
        update.dueDate = date;
      }
    }

    const updated = await Debt.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      update,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    return NextResponse.json({ debt: updated });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) return badRequest(zod);
    console.error("PATCH /api/debts/[id]", error);
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

    const deleted = await Debt.findOneAndDelete({
      _id: id,
      userId: auth.userId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/debts/[id]", error);
    return serverError();
  }
}
