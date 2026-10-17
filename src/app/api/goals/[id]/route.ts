import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Goal from "@/models/Goal";

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

    const goal = await Goal.findOne({ _id: id, userId: auth.userId });
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return badRequest("Add a title for this goal.");
      update.title = title;
    }

    if (body.targetAmount !== undefined) {
      const targetAmount = Number(body.targetAmount);
      if (!targetAmount || targetAmount <= 0)
        return badRequest("Enter a target greater than zero.");
      update.targetAmount = targetAmount;
    }

    if (body.targetDate !== undefined) {
      if (body.targetDate === null || body.targetDate === "") {
        update.targetDate = null;
      } else {
        const targetDate = new Date(body.targetDate);
        if (isNaN(targetDate.getTime()))
          return badRequest("Choose a valid target date.");
        update.targetDate = targetDate;
      }
    }

    if (body.note !== undefined) {
      update.note = String(body.note).trim();
    }

    if (body.savedAmount !== undefined) {
      const savedAmount = Number(body.savedAmount);
      if (isNaN(savedAmount) || savedAmount < 0)
        return badRequest("Saved amount can't be negative.");
      const target = Number(update.targetAmount ?? goal.targetAmount);
      // "Add to saved" is clamped so progress never exceeds the target.
      update.savedAmount = Math.min(Math.max(savedAmount, 0), target);
    }

    const updated = await Goal.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      update,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({ goal: updated });
  } catch (error) {
    console.error("PATCH /api/goals/[id]", error);
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

    const deleted = await Goal.findOneAndDelete({
      _id: id,
      userId: auth.userId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/goals/[id]", error);
    return serverError();
  }
}
