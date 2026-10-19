"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { EditIcon, TrashIcon } from "@/components/ui/icons";
import { formatCurrency, formatDate, parseDate } from "@/lib/format";

export interface GoalItem {
  _id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string | null;
  note?: string | null;
}

type SheetMode =
  | { mode: "create" }
  | { mode: "edit"; goal: GoalItem }
  | { mode: "add"; goal: GoalItem }
  | { mode: "delete"; goal: GoalItem };

const EMPTY_FORM = {
  title: "",
  targetAmount: "",
  savedAmount: "",
  targetDate: "",
  note: "",
};

function progressOf(goal: GoalItem) {
  const ratio =
    goal.targetAmount > 0 ? goal.savedAmount / goal.targetAmount : 0;
  return {
    ratio: Math.min(1, Math.max(0, ratio)),
    percent: Math.min(100, Math.round(Math.max(0, ratio) * 100)),
    reached: goal.targetAmount > 0 && goal.savedAmount >= goal.targetAmount,
  };
}

function dueState(goal: GoalItem) {
  if (!goal.targetDate) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = parseDate(goal.targetDate);
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round(
    (dueStart.getTime() - start.getTime()) / 86400000
  );
  return {
    label: `Due ${formatDate(goal.targetDate)}`,
    soon: days >= 0 && days <= 14,
  };
}

export function GoalsView({ goals }: { goals: GoalItem[] }) {
  const router = useRouter();
  const [sheet, setSheet] = React.useState<SheetMode | null>(null);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [amount, setAmount] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);

  function update(key: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function close() {
    setSheet(null);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setSheet({ mode: "create" });
  }

  function openEdit(goal: GoalItem) {
    setForm({
      title: goal.title,
      targetAmount: String(goal.targetAmount),
      savedAmount: String(goal.savedAmount),
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : "",
      note: goal.note || "",
    });
    setSheet({ mode: "edit", goal });
  }

  async function mutate(
    url: string,
    method: string,
    body: unknown,
    success: string
  ) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Something went wrong. Please try again.");
        return false;
      }

      toast.success(success);
      router.refresh();
      close();
      return true;
    } catch {
      toast.error("Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();

    const title = form.title.trim();
    const targetAmount = Number(form.targetAmount);
    const savedAmount = form.savedAmount.trim() ? Number(form.savedAmount) : 0;

    if (!title) return toast.error("Add a title for this goal.");
    if (!targetAmount || targetAmount <= 0)
      return toast.error("Enter a target greater than zero.");
    if (isNaN(savedAmount) || savedAmount < 0)
      return toast.error("Saved amount can't be negative.");

    await mutate(
      "/api/goals",
      "POST",
      {
        title,
        targetAmount,
        savedAmount,
        targetDate: form.targetDate || undefined,
        note: form.note.trim() || undefined,
      },
      "Goal created"
    );
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!sheet || sheet.mode !== "edit") return;

    const title = form.title.trim();
    const targetAmount = Number(form.targetAmount);
    const savedAmount = Number(form.savedAmount);

    if (!title) return toast.error("Add a title for this goal.");
    if (!targetAmount || targetAmount <= 0)
      return toast.error("Enter a target greater than zero.");
    if (isNaN(savedAmount) || savedAmount < 0)
      return toast.error("Saved amount can't be negative.");

    await mutate(
      `/api/goals/${sheet.goal._id}`,
      "PATCH",
      {
        title,
        targetAmount,
        savedAmount,
        targetDate: form.targetDate || null,
        note: form.note.trim(),
      },
      "Goal updated"
    );
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!sheet || sheet.mode !== "add") return;

    const goal = sheet.goal;
    const value = Number(amount);
    if (!value || value <= 0)
      return toast.error("Enter an amount greater than zero.");

    const next = Math.min(goal.savedAmount + value, goal.targetAmount);
    const finished = next >= goal.targetAmount && goal.savedAmount < goal.targetAmount;

    await mutate(
      `/api/goals/${goal._id}`,
      "PATCH",
      { savedAmount: next },
      finished ? `${goal.title} is fully funded` : `Added to ${goal.title}`
    );
  }

  async function submitDelete() {
    if (!sheet || sheet.mode !== "delete") return;
    await mutate(`/api/goals/${sheet.goal._id}`, "DELETE", undefined, "Goal deleted");
  }

  const sheetTitle =
    sheet?.mode === "create"
      ? "New goal"
      : sheet?.mode === "edit"
        ? "Edit goal"
        : sheet?.mode === "add" && sheet.goal
          ? `Add to ${sheet.goal.title}`
          : sheet?.mode === "delete"
            ? "Delete this goal?"
            : undefined;

  return (
    <div>
      <PageHeader
        title="Goals"
        subtitle="Small steps toward something bigger"
        action={<Button onClick={openCreate}>New goal</Button>}
      />

      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Set something aside for what matters next — a trip, a new laptop, a rainy day."
        />
      ) : (
        <>
          <Card>
            <CardBody className="flex items-center gap-5 sm:gap-8">
              <div className="min-w-0">
                <p className="text-[13px] text-[var(--foreground-secondary)]">
                  Saved so far
                </p>
                <p className="mt-0.5 text-[22px] sm:text-[26px] font-semibold tracking-apple tabular-nums">
                  {formatCurrency(totalSaved)}
                </p>
              </div>
              <div
                className="h-10 w-px shrink-0"
                style={{ backgroundColor: "var(--separator)" }}
              />
              <div className="min-w-0">
                <p className="text-[13px] text-[var(--foreground-secondary)]">
                  Across targets
                </p>
                <p className="mt-0.5 text-[22px] sm:text-[26px] font-semibold tracking-apple tabular-nums">
                  {formatCurrency(totalTarget)}
                </p>
              </div>
            </CardBody>
          </Card>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {goals.map((goal) => {
              const { ratio, percent, reached } = progressOf(goal);
              const due = dueState(goal);
              const showDueSoon = due?.soon && !reached;

              return (
                <Card key={goal._id}>
                  <CardHeader>
                    <CardTitle className="truncate">{goal.title}</CardTitle>
                    <span className="shrink-0 text-[13px] tabular-nums text-[var(--foreground-secondary)]">
                      {percent}%
                    </span>
                  </CardHeader>
                  <CardBody className="pt-4">
                    <div className="flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        {due && (
                          <p className="truncate text-[13px] text-[var(--foreground-secondary)]">
                            {due.label}
                          </p>
                        )}
                        {showDueSoon && (
                          <p
                            className="text-[13px] font-medium"
                            style={{ color: "var(--warning)" }}
                          >
                            Due soon
                          </p>
                        )}
                        {!due && goal.note && (
                          <p className="truncate text-[13px] text-[var(--foreground-secondary)]">
                            {goal.note}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[17px] font-semibold tabular-nums">
                          {formatCurrency(goal.savedAmount)}
                        </p>
                        <p className="text-[13px] tabular-nums text-[var(--foreground-secondary)]">
                          of {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
                      style={{ backgroundColor: "var(--surface-secondary)" }}
                    >
                      <div
                        className="h-full w-full rounded-full"
                        style={{
                          backgroundColor: "var(--accent)",
                          transform: `scaleX(${ratio})`,
                          transformOrigin: "left",
                        }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-[13px] text-[var(--foreground-secondary)]">
                        {reached ? (
                          <span
                            className="font-medium"
                            style={{ color: "var(--success)" }}
                          >
                            Reached
                          </span>
                        ) : (
                          `${formatCurrency(goal.targetAmount - goal.savedAmount)} to go`
                        )}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        {!reached && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setAmount("");
                              setSheet({ mode: "add", goal });
                            }}
                          >
                            Add money
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Edit ${goal.title}`}
                          className="px-2"
                          onClick={() => openEdit(goal)}
                        >
                          <EditIcon width={16} height={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost-destructive"
                          aria-label={`Delete ${goal.title}`}
                          className="px-2"
                          onClick={() => setSheet({ mode: "delete", goal })}
                        >
                          <TrashIcon width={16} height={16} />
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Create */}
      <Sheet open={sheet?.mode === "create"} onClose={close} title={sheetTitle}>
        <form onSubmit={submitCreate} className="space-y-4">
          <div>
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              required
              placeholder="What are you saving for?"
              value={form.title}
              onChange={update("title")}
            />
          </div>
          <div>
            <Label htmlFor="goal-target">Target amount</Label>
            <Input
              id="goal-target"
              type="number"
              min="1"
              step="any"
              inputMode="decimal"
              required
              placeholder="0"
              value={form.targetAmount}
              onChange={update("targetAmount")}
            />
          </div>
          <div>
            <Label htmlFor="goal-saved-create">Already saved</Label>
            <Input
              id="goal-saved-create"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="0"
              value={form.savedAmount}
              onChange={update("savedAmount")}
            />
          </div>
          <div>
            <Label htmlFor="goal-date-create">Target date</Label>
            <Input
              id="goal-date-create"
              type="date"
              value={form.targetDate}
              onChange={update("targetDate")}
            />
          </div>
          <div>
            <Label htmlFor="goal-note-create">Note</Label>
            <Input
              id="goal-note-create"
              placeholder="Optional"
              value={form.note}
              onChange={update("note")}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={close}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? "Saving…" : "Create goal"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Edit */}
      <Sheet open={sheet?.mode === "edit"} onClose={close} title={sheetTitle}>
        <form onSubmit={submitEdit} className="space-y-4">
          <div>
            <Label htmlFor="goal-title-edit">Title</Label>
            <Input
              id="goal-title-edit"
              required
              placeholder="What are you saving for?"
              value={form.title}
              onChange={update("title")}
            />
          </div>
          <div>
            <Label htmlFor="goal-target-edit">Target amount</Label>
            <Input
              id="goal-target-edit"
              type="number"
              min="1"
              step="any"
              inputMode="decimal"
              required
              placeholder="0"
              value={form.targetAmount}
              onChange={update("targetAmount")}
            />
          </div>
          <div>
            <Label htmlFor="goal-saved-edit">Saved so far</Label>
            <Input
              id="goal-saved-edit"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="0"
              value={form.savedAmount}
              onChange={update("savedAmount")}
            />
          </div>
          <div>
            <Label htmlFor="goal-date-edit">Target date</Label>
            <Input
              id="goal-date-edit"
              type="date"
              value={form.targetDate}
              onChange={update("targetDate")}
            />
          </div>
          <div>
            <Label htmlFor="goal-note-edit">Note</Label>
            <Input
              id="goal-note-edit"
              placeholder="Optional"
              value={form.note}
              onChange={update("note")}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={close}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Add money */}
      <Sheet open={sheet?.mode === "add"} onClose={close} title={sheetTitle}>
        <form onSubmit={submitAdd} className="space-y-4">
          <div>
            <Label htmlFor="goal-add-amount">Amount</Label>
            <Input
              id="goal-add-amount"
              type="number"
              min="1"
              step="any"
              inputMode="decimal"
              required
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {sheet?.mode === "add" && (
            <p className="text-[13px] text-[var(--foreground-secondary)] tabular-nums">
              {formatCurrency(sheet.goal.savedAmount)} saved of{" "}
              {formatCurrency(sheet.goal.targetAmount)}.
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={close}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? "Adding…" : "Add money"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Delete */}
      <Sheet open={sheet?.mode === "delete"} onClose={close} title={sheetTitle}>
        <p className="text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
          {sheet?.mode === "delete"
            ? `${sheet.goal.title} will be removed for good. This can't be undone.`
            : ""}
        </p>
        <div className="mt-5 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={close}
            disabled={busy}
          >
            Keep it
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={submitDelete}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
