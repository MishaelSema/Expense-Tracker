import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError, zodMessage } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Todo from "@/models/Todo";
import { serializeList } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const PRIORITIES = ["low", "medium", "high"] as const;

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();

    const todos = await Todo.find({ userId: auth.userId })
      .sort({ completed: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({ todos: serializeList(todos) });
  } catch (error) {
    console.error("GET /api/todos", error);
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
    const completed = Boolean(body.completed);
    const priority = PRIORITIES.includes(body.priority) ? body.priority : "medium";

    if (!title) return badRequest("Add a task title.");

    let dueDate: Date | undefined;
    if (body.dueDate) {
      const parsed = new Date(body.dueDate);
      if (isNaN(parsed.getTime())) return badRequest("Choose a valid date.");
      dueDate = parsed;
    }

    const created = await Todo.create({
      userId: auth.userId,
      title,
      completed,
      priority,
      dueDate,
    });

    return NextResponse.json({ todo: created }, { status: 201 });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) return badRequest(zod);
    console.error("POST /api/todos", error);
    return serverError();
  }
}
