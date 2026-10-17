"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CardList, CardRow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MoreIcon, PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { WishlistForm, type WishlistItemDTO } from "./wishlist-form";

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

function MenuItem({
  label,
  onClick,
  destructive,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full px-3.5 py-2 text-left text-[14px] transition-colors hover:bg-[var(--surface-secondary)]",
        destructive ? "text-[var(--danger)]" : "text-[var(--foreground)]"
      )}
    >
      {label}
    </button>
  );
}

function RowMenu({
  purchased,
  onEdit,
  onToggle,
  onDelete,
}: {
  purchased: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative shrink-0 self-center" ref={ref}>
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="pressable grid h-8 w-8 place-items-center rounded-full text-[var(--foreground-secondary)] hover:bg-[var(--surface-secondary)]"
      >
        <MoreIcon width={18} height={18} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-[var(--separator)] bg-[var(--surface)] py-1">
          <MenuItem
            label={purchased ? "Mark as wanted" : "Mark as purchased"}
            onClick={() => {
              setOpen(false);
              onToggle();
            }}
          />
          <MenuItem
            label="Edit"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          />
          <MenuItem
            label="Delete"
            destructive
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          />
        </div>
      )}
    </div>
  );
}

function Segmented({
  tab,
  onChange,
  wantedCount,
  purchasedCount,
}: {
  tab: "wanted" | "purchased";
  onChange: (t: "wanted" | "purchased") => void;
  wantedCount: number;
  purchasedCount: number;
}) {
  const tabs = [
    { value: "wanted" as const, label: "Wanted", count: wantedCount },
    { value: "purchased" as const, label: "Purchased", count: purchasedCount },
  ];

  return (
    <div className="inline-flex rounded-full bg-[var(--surface-secondary)] p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "pressable h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors",
            tab === t.value
              ? "bg-[var(--surface)] text-[var(--foreground)]"
              : "text-[var(--foreground-secondary)]"
          )}
        >
          {t.label}
          {t.count > 0 && (
            <span className="ml-1.5 tabular-nums text-[12px] font-normal text-[var(--foreground-secondary)]">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function WishlistView({ items: initialItems }: { items: WishlistItemDTO[] }) {
  const router = useRouter();
  const [items, setItems] = useState<WishlistItemDTO[]>(initialItems);
  const [tab, setTab] = useState<"wanted" | "purchased">("wanted");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WishlistItemDTO | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const wanted = items.filter((i) => !i.purchased);
  const purchased = items.filter((i) => i.purchased);
  const shown = tab === "wanted" ? wanted : purchased;
  const total = wanted.reduce((sum, i) => sum + i.price, 0);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: WishlistItemDTO) {
    setEditing(item);
    setFormOpen(true);
  }

  async function togglePurchased(item: WishlistItemDTO) {
    const previous = items;
    const next = !item.purchased;
    setItems((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, purchased: next } : i))
    );

    const res = await fetch(`/api/wishlist/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchased: next }),
    });

    if (!res.ok) {
      setItems(previous);
      toast.error("Couldn't update the item.");
      return;
    }

    toast.success(next ? "Marked as purchased" : "Moved back to wanted");
    router.refresh();
  }

  async function remove(item: WishlistItemDTO) {
    const previous = items;
    setItems((prev) => prev.filter((i) => i._id !== item._id));

    const res = await fetch(`/api/wishlist/${item._id}`, { method: "DELETE" });

    if (!res.ok) {
      setItems(previous);
      toast.error("Couldn't delete the item.");
      return;
    }

    toast.success("Item deleted");
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Wishlist"
        subtitle="Things worth saving for"
        action={
          <Button onClick={openAdd}>
            <PlusIcon width={18} height={18} />
            Add item
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-[var(--foreground-secondary)]">
          {wanted.length} {wanted.length === 1 ? "item" : "items"} ·{" "}
          <span className="font-medium tabular-nums text-[var(--foreground)]">
            {formatCurrency(total)}
          </span>{" "}
          to go
        </p>
        <Segmented
          tab={tab}
          onChange={setTab}
          wantedCount={wanted.length}
          purchasedCount={purchased.length}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={tab === "wanted" ? "Nothing on your wishlist yet" : "Nothing purchased yet"}
          description={
            tab === "wanted"
              ? "Add something worth saving for and keep an eye on the total."
              : "Items you mark as purchased will show up here."
          }
          action={
            tab === "wanted" ? (
              <Button onClick={openAdd}>
                <PlusIcon width={18} height={18} />
                Add item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <CardList className="overflow-visible">
          {shown.map((item) => (
            <CardRow key={item._id} className="items-start py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "truncate text-[16px] font-medium text-[var(--foreground)]",
                      item.purchased && "text-[var(--foreground-secondary)] line-through"
                    )}
                  >
                    {item.title}
                  </p>
                  {!item.purchased && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={PRIORITY_STYLE[item.priority]}
                    >
                      {PRIORITY_LABEL[item.priority]}
                    </span>
                  )}
                </div>
                {item.notes && (
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[var(--foreground-secondary)]">
                    {item.notes}
                  </p>
                )}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-[13px] text-[var(--accent)] hover:underline"
                  >
                    Open link
                  </a>
                )}
              </div>

              <div className="shrink-0 self-center text-right">
                <p className="tabular-nums text-[16px] font-semibold text-[var(--foreground)]">
                  {formatCurrency(item.price)}
                </p>
                {item.targetDate && (
                  <p className="mt-0.5 text-[12px] text-[var(--foreground-secondary)]">
                    {formatDate(item.targetDate)}
                  </p>
                )}
              </div>

              <RowMenu
                purchased={item.purchased}
                onEdit={() => openEdit(item)}
                onToggle={() => togglePurchased(item)}
                onDelete={() => remove(item)}
              />
            </CardRow>
          ))}
        </CardList>
      )}

      <WishlistForm open={formOpen} onClose={() => setFormOpen(false)} item={editing} />
    </div>
  );
}
