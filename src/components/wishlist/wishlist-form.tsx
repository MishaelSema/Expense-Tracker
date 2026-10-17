"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type WishlistItemDTO = {
  _id: string;
  title: string;
  price: number;
  priority: "low" | "medium" | "high";
  link?: string | null;
  notes?: string | null;
  purchased: boolean;
  targetDate?: string | null;
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

export function WishlistForm({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item?: WishlistItemDTO | null;
}) {
  const router = useRouter();
  const editing = Boolean(item);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(item?.title ?? "");
    setPrice(item ? String(item.price) : "");
    setPriority(item?.priority ?? "medium");
    setLink(item?.link ?? "");
    setNotes(item?.notes ?? "");
    setTargetDate(toDateInput(item?.targetDate));
  }, [open, item]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    const priceValue = Number(price);

    if (!trimmed) return toast.error("Add a title.");
    if (!priceValue || priceValue <= 0)
      return toast.error("Enter a price greater than zero.");

    setSaving(true);
    const payload = {
      title: trimmed,
      price: priceValue,
      priority,
      link: link.trim(),
      notes: notes.trim(),
      targetDate: targetDate ? new Date(targetDate).toISOString() : null,
    };

    const res = await fetch(editing ? `/api/wishlist/${item!._id}` : "/api/wishlist", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "Couldn't save the item.");
      return;
    }

    toast.success(editing ? "Item updated" : "Item added to your wishlist");
    onClose();
    router.refresh();
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit item" : "Add item"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="wishlist-title">Title</Label>
          <Input
            id="wishlist-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you saving for?"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="wishlist-price">Price</Label>
            <Input
              id="wishlist-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              required
            />
          </div>
          <div>
            <Label htmlFor="wishlist-target">Target date</Label>
            <Input
              id="wishlist-target"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
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

        <div>
          <Label htmlFor="wishlist-link">Link</Label>
          <Input
            id="wishlist-link"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://"
          />
        </div>

        <div>
          <Label htmlFor="wishlist-notes">Notes</Label>
          <textarea
            id="wishlist-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional details"
            className="w-full resize-none rounded-xl bg-[var(--surface-secondary)] px-3.5 py-3 text-[16px] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)] border border-transparent transition-colors focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add item"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
