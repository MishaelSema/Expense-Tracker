import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Todo from "@/models/Todo";

const PRIORITIES = ["low", "medium", "high"] as const;

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
      if (!title) return badRequest("Add a task title.");
      update.title = title;
    }
    if (body.completed !== undefined) {
      update.completed = Boolean(body.completed);
    }
    if (body.priority !== undefined) {
      update.priority = PRIORITIES.includes(body.priority) ? body.priority : "medium";
    }
    if (body.dueDate !== undefined) {
      if (!body.dueDate) {
        update.dueDate = null;
      } else {
        const parsed = new Date(body.dueDate);
        if (isNaN(parsed.getTime())) return badRequest("Choose a valid date.");
        update.dueDate = parsed;
      }
    }

    const updated = await Todo.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      update,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ todo: updated });
  } catch (error) {
    console.error("PATCH /api/todos/[id]", error);
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

    const deleted = await Todo.findOneAndDelete({ _id: id, userId: auth.userId });

    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/todos/[id]", error);
    return serverError();
  }
}
