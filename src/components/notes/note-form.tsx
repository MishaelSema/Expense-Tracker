"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";

export type NoteDTO = {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export function NoteForm({
  open,
  onClose,
  note,
}: {
  open: boolean;
  onClose: () => void;
  note: NoteDTO | null;
}) {
  const router = useRouter();
  const editing = Boolean(note);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
  }, [open, note]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return toast.error("Add a title.");

    setSaving(true);
    const payload = { title: trimmed, content };

    const res = await fetch(editing ? `/api/notes/${note!._id}` : "/api/notes", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "Couldn't save the note.");
      return;
    }

    toast.success(editing ? "Note updated" : "Note saved");
    onClose();
    router.refresh();
  }

  async function onDelete() {
    if (!note) return;
    setDeleting(true);

    const res = await fetch(`/api/notes/${note._id}`, { method: "DELETE" });

    setDeleting(false);

    if (!res.ok) {
      toast.error("Couldn't delete the note.");
      return;
    }

    toast.success("Note deleted");
    onClose();
    router.refresh();
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit note" : "New note"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="note-title">Title</Label>
          <Input
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give it a title"
            required
          />
        </div>

        <div>
          <Label htmlFor="note-content">Note</Label>
          <textarea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Write anything you'd like to remember"
            className="w-full resize-none rounded-xl bg-[var(--surface-secondary)] px-3.5 py-3 text-[16px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)] border border-transparent transition-colors focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          {editing ? (
            <Button
              type="button"
              variant="ghost-destructive"
              onClick={onDelete}
              disabled={deleting}
              className="shrink-0"
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Save note"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
