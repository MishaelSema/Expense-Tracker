import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Note from "@/models/Note";
import Todo from "@/models/Todo";
import { serializeList } from "@/lib/serialize";
import { NotesView } from "@/components/notes/notes-view";
import type { NoteDTO } from "@/components/notes/note-form";
import type { TodoDTO } from "@/components/notes/task-form";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await connectDB();

  const [notes, todos] = await Promise.all([
    Note.find({ userId: user._id }).sort({ updatedAt: -1 }).lean(),
    Todo.find({ userId: user._id }).sort({ completed: 1, createdAt: -1 }).lean(),
  ]);

  return (
    <NotesView
      notes={serializeList<NoteDTO>(notes)}
      todos={serializeList<TodoDTO>(todos)}
    />
  );
}
