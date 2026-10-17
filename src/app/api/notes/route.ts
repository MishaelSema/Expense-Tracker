import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError, zodMessage } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Note from "@/models/Note";
import { serializeList } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();

    const notes = await Note.find({ userId: auth.userId })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ notes: serializeList(notes) });
  } catch (error) {
    console.error("GET /api/notes", error);
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
    const content = String(body.content || "").trim();

    if (!title) return badRequest("Add a title.");

    const created = await Note.create({ userId: auth.userId, title, content });

    return NextResponse.json({ note: created }, { status: 201 });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) return badRequest(zod);
    console.error("POST /api/notes", error);
    return serverError();
  }
}
