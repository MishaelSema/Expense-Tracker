"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CardList, CardRow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ArrowRightIcon, EditIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { formatRelative, formatDate } from "@/lib/format";
import { TaskForm } from "./task-form";
import { NoteForm } from "./note-form";
import type { TodoDTO } from "./task-form";
import type { NoteDTO } from "./note-form";

const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const PRIORITY_STYLE: Record<string, React.CSSProperties> = {
  high: {
    color: "var(--danger)",
    backgroundColor: "color-mix(in srgb, var(--danger) 10%, transparent)",
  },
  medium: {
    color: "var(--warning)",
    backgroundColor: "color-mix(in srgb, var(--warning) 12%, transparent)",
  },
  low: {
    color: "var(--foreground-secondary)",
    backgroundColor: "color-mix(in srgb, var(--foreground-secondary) 12%, transparent)",
  },
};

function isOverdue(todo: TodoDTO): boolean {
  if (todo.completed || !todo.dueDate) return false;
  const due = new Date(todo.dueDate);
  if (isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
        checked
          ? "border-transparent bg-[var(--accent)]"
          : "border-[var(--separator)] bg-transparent"
      )}
    >
      {checked && (
        <span className="block h-2.5 w-1.5 -translate-y-px rotate-45 border-b-2 border-r-2 border-white" />
      )}
    </span>
  );
}

function Segmented({
  tab,
  onChange,
}: {
  tab: "tasks" | "notes";
  onChange: (t: "tasks" | "notes") => void;
}) {
  const tabs = [
    { value: "tasks" as const, label: "Tasks" },
    { value: "notes" as const, label: "Notes" },
  ];

  return (
    <div className="inline-flex rounded-full bg-[var(--surface-secondary)] p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "pressable h-8 rounded-full px-4 text-[13px] font-medium transition-colors",
            tab === t.value
              ? "bg-[var(--surface)] text-[var(--foreground)]"
              : "text-[var(--foreground-secondary)]"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function TaskRow({
  todo,
  onToggle,
  onEdit,
  onDelete,
}: {
  todo: TodoDTO;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const overdue = isOverdue(todo);

  return (
    <CardRow className="items-start py-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        <Checkbox checked={todo.completed} />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-[16px] font-medium",
              todo.completed
                ? "text-[var(--foreground-secondary)] line-through"
                : "text-[var(--foreground)]"
            )}
          >
            {todo.title}
          </span>
          {(todo.dueDate || (!todo.completed && todo.priority !== "low")) && (
            <span className="mt-0.5 flex items-center gap-2 text-[13px]">
              {todo.dueDate && (
                <span
                  className={cn(
                    "tabular-nums",
                    overdue ? "font-medium text-[var(--danger)]" : "text-[var(--foreground-secondary)]"
                  )}
                >
                  {overdue ? `Overdue · ${formatDate(todo.dueDate)}` : formatRelative(todo.dueDate)}
                </span>
              )}
              {!todo.completed && todo.priority !== "low" && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={PRIORITY_STYLE[todo.priority]}
                >
                  {PRIORITY_LABEL[todo.priority]}
                </span>
              )}
            </span>
          )}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1 self-center">
        <button
          type="button"
          onClick={onEdit}
          className="pressable grid h-8 w-8 place-items-center rounded-full text-[var(--foreground-secondary)] hover:bg-[var(--surface-secondary)]"
          aria-label={`Edit ${todo.title}`}
        >
          <EditIcon width={16} height={16} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="pressable grid h-8 w-8 place-items-center rounded-full text-[var(--foreground-secondary)] hover:bg-[var(--surface-secondary)]"
          aria-label={`Delete ${todo.title}`}
        >
          <TrashIcon width={16} height={16} />
        </button>
      </div>
    </CardRow>
  );
}

export function NotesView({
  notes: initialNotes,
  todos: initialTodos,
}: {
  notes: NoteDTO[];
  todos: TodoDTO[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteDTO[]>(initialNotes);
  const [todos, setTodos] = useState<TodoDTO[]>(initialTodos);
  const [tab, setTab] = useState<"tasks" | "notes">("tasks");

  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const [taskEdit, setTaskEdit] = useState<TodoDTO | null>(null);
  const [noteEdit, setNoteEdit] = useState<NoteDTO | null>(null);
  const [noteFormOpen, setNoteFormOpen] = useState(false);

  useEffect(() => setNotes(initialNotes), [initialNotes]);
  useEffect(() => setTodos(initialTodos), [initialTodos]);

  const activeTasks = todos.filter((t) => !t.completed);
  const completedTasks = todos.filter((t) => t.completed);

  function openNewNote() {
    setNoteEdit(null);
    setNoteFormOpen(true);
  }

  function openNote(note: NoteDTO) {
    setNoteEdit(note);
    setNoteFormOpen(true);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTask.trim();
    if (!title) return;

    setAddingTask(true);
    setNewTask("");

    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    setAddingTask(false);

    if (!res.ok) {
      setNewTask(title);
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "Couldn't add the task.");
      return;
    }

    toast.success("Task added");
    router.refresh();
  }

  async function toggleTodo(todo: TodoDTO) {
    const previous = todos;
    const next = !todo.completed;
    setTodos((prev) =>
      prev.map((t) => (t._id === todo._id ? { ...t, completed: next } : t))
    );

    const res = await fetch(`/api/todos/${todo._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: next }),
    });

    if (!res.ok) {
      setTodos(previous);
      toast.error("Couldn't update the task.");
      return;
    }

    toast.success(next ? "Task completed" : "Task reopened");
    router.refresh();
  }

  async function deleteTodo(todo: TodoDTO) {
    const previous = todos;
    setTodos((prev) => prev.filter((t) => t._id !== todo._id));

    const res = await fetch(`/api/todos/${todo._id}`, { method: "DELETE" });

    if (!res.ok) {
      setTodos(previous);
      toast.error("Couldn't delete the task.");
      return;
    }

    toast.success("Task deleted");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="Notes and tasks" />

      <div className="mb-5">
        <Segmented tab={tab} onChange={setTab} />
      </div>

      {tab === "tasks" ? (
        <div className="space-y-5">
          <form onSubmit={addTask} className="flex gap-2">
            <Input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a task and press Enter"
              className="flex-1"
              disabled={addingTask}
            />
            <Button type="submit" disabled={addingTask || !newTask.trim()} aria-label="Add task">
              <PlusIcon width={18} height={18} />
            </Button>
          </form>

          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              description="Add a task above to start clearing your head."
            />
          ) : (
            <div className="space-y-5">
              {activeTasks.length > 0 && (
                <CardList>
                  {activeTasks.map((todo) => (
                    <TaskRow
                      key={todo._id}
                      todo={todo}
                      onToggle={() => toggleTodo(todo)}
                      onEdit={() => setTaskEdit(todo)}
                      onDelete={() => deleteTodo(todo)}
                    />
                  ))}
                </CardList>
              )}

              {completedTasks.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowCompleted((s) => !s)}
                    className="pressable flex w-full items-center justify-between px-1 py-2 text-[13px] font-medium text-[var(--foreground-secondary)]"
                    aria-expanded={showCompleted}
                  >
                    <span>Completed · {completedTasks.length}</span>
                    <span
                      className={cn(
                        "transition-transform",
                        showCompleted ? "rotate-90" : ""
                      )}
                    >
                      <ArrowRightIcon width={16} height={16} />
                    </span>
                  </button>
                  {showCompleted && (
                    <CardList className="mt-1">
                      {completedTasks.map((todo) => (
                        <TaskRow
                          key={todo._id}
                          todo={todo}
                          onToggle={() => toggleTodo(todo)}
                          onEdit={() => setTaskEdit(todo)}
                          onDelete={() => deleteTodo(todo)}
                        />
                      ))}
                    </CardList>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewNote}>
              <PlusIcon width={18} height={18} />
              New note
            </Button>
          </div>

          {notes.length === 0 ? (
            <EmptyState
              title="No notes yet"
              description="Jot down anything you want to keep close."
              action={
                <Button onClick={openNewNote}>
                  <PlusIcon width={18} height={18} />
                  New note
                </Button>
              }
            />
          ) : (
            <CardList>
              {notes.map((note) => {
                const preview = note.content.split("\n").find((l) => l.trim()) || "";
                return (
                  <button
                    key={note._id}
                    type="button"
                    onClick={() => openNote(note)}
                    className="block w-full text-left pressable"
                  >
                    <CardRow className="items-start py-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-medium text-[var(--foreground)]">
                          {note.title}
                        </p>
                        {preview && (
                          <p className="mt-0.5 truncate text-[13px] text-[var(--foreground-secondary)]">
                            {preview}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 self-center text-[13px] text-[var(--foreground-secondary)]">
                        {formatRelative(note.updatedAt)}
                      </p>
                    </CardRow>
                  </button>
                );
              })}
            </CardList>
          )}
        </div>
      )}

      <TaskForm
        open={Boolean(taskEdit)}
        onClose={() => setTaskEdit(null)}
        todo={taskEdit}
      />
      <NoteForm
        open={noteFormOpen}
        onClose={() => setNoteFormOpen(false)}
        note={noteEdit}
      />
    </div>
  );
}
