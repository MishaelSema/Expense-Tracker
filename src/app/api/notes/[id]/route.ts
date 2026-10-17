import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Note from "@/models/Note";

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
      if (!title) return badRequest("Add a title.");
      update.title = title;
    }
    if (body.content !== undefined) {
      update.content = String(body.content || "");
    }

    const updated = await Note.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      update,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ note: updated });
  } catch (error) {
    console.error("PATCH /api/notes/[id]", error);
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

    const deleted = await Note.findOneAndDelete({ _id: id, userId: auth.userId });

    if (!deleted) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/notes/[id]", error);
    return serverError();
  }
}
