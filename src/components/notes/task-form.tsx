"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type TodoDTO = {
  _id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

const PRIORITIES: { value: "low" | "medium" | "high"; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function toDateInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function TaskForm({
  open,
  onClose,
  todo,
}: {
  open: boolean;
  onClose: () => void;
  todo: TodoDTO | null;
}) {
  const router = useRouter();
  const editing = Boolean(todo);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(todo?.title ?? "");
    setPriority(todo?.priority ?? "medium");
    setDueDate(toDateInput(todo?.dueDate));
  }, [open, todo]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return toast.error("Add a task title.");

    setSaving(true);
    const payload = {
      title: trimmed,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    };

    const res = await fetch(editing ? `/api/todos/${todo!._id}` : "/api/todos", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "Couldn't save the task.");
      return;
    }

    toast.success(editing ? "Task updated" : "Task added");
    onClose();
    router.refresh();
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit task" : "Add task"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            required
          />
        </div>

        <div>
          <Label htmlFor="task-due">Due date</Label>
          <Input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div>
          <Label>Priority</Label>
          <div className="inline-flex w-full rounded-full bg-[var(--surface-secondary)] p-1">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={cn(
                  "pressable h-9 flex-1 rounded-full text-[14px] font-medium transition-colors",
                  priority === p.value
                    ? "bg-[var(--surface)] text-[var(--foreground)]"
                    : "text-[var(--foreground-secondary)]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add task"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
