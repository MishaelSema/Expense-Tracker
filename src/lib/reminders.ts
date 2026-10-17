import { connectDB } from "./db";
import { formatCurrency, formatDate } from "./format";
import Debt from "@/models/Debt";
import Bill from "@/models/Bill";
import Budget from "@/models/Budget";
import Goal from "@/models/Goal";
import Transaction from "@/models/Transaction";
import Reminder from "@/models/Reminder";

export type ReminderType =
  | "debt_due"
  | "bill_due"
  | "budget_ending"
  | "budget_overspent"
  | "goal_deadline";

export type ReminderSeverity = "info" | "warning" | "critical";

export interface ReminderCandidate {
  key: string;
  type: ReminderType;
  title: string;
  body: string;
  dueDate?: Date;
  severity: ReminderSeverity;
}

export interface ReminderSourceDebt {
  id: string;
  person: string;
  amount: number;
  dueDate?: Date | null;
  status: string;
  type: string;
}
export interface ReminderSourceBill {
  id: string;
  name: string;
  amount: number;
  nextDueDate: Date;
  active: boolean;
}
export interface ReminderSourceBudget {
  id: string;
  category: string;
  amount: number;
  startDate: Date;
  endDate: Date;
}
export interface ReminderSourceGoal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: Date | null;
}
export interface ReminderSourceTx {
  type: string;
  amount: number;
  category: string;
  date: Date;
}

export interface BuildInput {
  debts: ReminderSourceDebt[];
  bills: ReminderSourceBill[];
  budgets: ReminderSourceBudget[];
  goals: ReminderSourceGoal[];
  transactions: ReminderSourceTx[];
  now?: Date;
  currency?: string;
}

const DAY_MS = 86_400_000;
/** Ignore anything this far past due so the list never fills with ancient noise. */
const MAX_OVERDUE_DAYS = 60;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole days from `today` to `date`; negative means already past. */
function daysUntil(date: Date, today: Date): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(today).getTime()) / DAY_MS);
}

function dayKey(d: Date): string {
  const x = startOfDay(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate()
  ).padStart(2, "0")}`;
}

function spentInWindow(
  txs: ReminderSourceTx[],
  category: string,
  start: Date,
  end: Date
): number {
  const wanted = category.trim().toLowerCase();
  return txs
    .filter(
      (t) =>
        t.type === "expense" &&
        t.category.trim().toLowerCase() === wanted &&
        new Date(t.date) >= start &&
        new Date(t.date) <= end
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

function money(amount: number, currency: string): string {
  return formatCurrency(amount, { currency });
}

/**
 * Turns the user's own records into a list of reminders. Pure and deterministic
 * for a given `now`, which keeps it easy to reason about and test.
 */
export function buildReminders(input: BuildInput): ReminderCandidate[] {
  const now = input.now ?? new Date();
  const today = startOfDay(now);
  const currency = input.currency ?? "XAF";
  const out: ReminderCandidate[] = [];

  // ── Debts due soon or overdue ──────────────────────────────────────────
  for (const d of input.debts) {
    if (d.status !== "active" || !d.dueDate) continue;
    const due = new Date(d.dueDate);
    const diff = daysUntil(due, today);
    if (diff > 7 || diff < -MAX_OVERDUE_DAYS) continue;

    const overdue = diff < 0;
    const owing = d.type === "i_owe";
    const who = owing ? `to ${d.person}` : `from ${d.person}`;
    out.push({
      key: `debt:${d.id}:${dayKey(due)}`,
      type: "debt_due",
      title: overdue ? `Overdue debt ${who}` : `Debt due ${who}`,
      body: overdue
        ? `${money(d.amount, currency)} was due ${formatDate(due)}.`
        : `${money(d.amount, currency)} due ${formatDate(due)}.`,
      dueDate: due,
      severity: overdue ? "critical" : diff <= 2 ? "warning" : "info",
    });
  }

  // ── Recurring bills ────────────────────────────────────────────────────
  for (const b of input.bills) {
    if (!b.active) continue;
    const due = new Date(b.nextDueDate);
    const diff = daysUntil(due, today);
    if (diff > 3 || diff < -MAX_OVERDUE_DAYS) continue;

    const overdue = diff < 0;
    out.push({
      key: `bill:${b.id}:${dayKey(due)}`,
      type: "bill_due",
      title: overdue ? `Bill overdue · ${b.name}` : `Bill due · ${b.name}`,
      body: overdue
        ? `${money(b.amount, currency)} was due ${formatDate(due)}.`
        : `${money(b.amount, currency)} due ${formatDate(due)}.`,
      dueDate: due,
      severity: overdue ? "critical" : diff <= 1 ? "warning" : "info",
    });
  }

  // ── Budgets: about to reset, or nearly/over spent ──────────────────────
  for (const b of input.budgets) {
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    if (now < start || now > end) continue;

    const spent = spentInWindow(input.transactions, b.category, start, end);
    if (spent <= 0) continue;

    const used = b.amount > 0 ? spent / b.amount : 0;
    if (used >= 1) {
      out.push({
        key: `budget:${b.id}:over:${dayKey(end)}`,
        type: "budget_overspent",
        title: `${b.category} budget exceeded`,
        body: `You've spent ${money(spent, currency)} of ${money(b.amount, currency)} (${Math.round(
          used * 100
        )}%).`,
        dueDate: end,
        severity: "critical",
      });
    } else if (used >= 0.9) {
      out.push({
        key: `budget:${b.id}:near:${dayKey(end)}`,
        type: "budget_overspent",
        title: `${b.category} budget nearly used`,
        body: `${Math.round(used * 100)}% of ${money(b.amount, currency)} used — ${money(
          Math.max(b.amount - spent, 0),
          currency
        )} left.`,
        dueDate: end,
        severity: "warning",
      });
    }

    const endsIn = daysUntil(end, today);
    if (endsIn >= 0 && endsIn <= 3) {
      out.push({
        key: `budget:${b.id}:end:${dayKey(end)}`,
        type: "budget_ending",
        title: `${b.category} budget resets soon`,
        body:
          endsIn === 0
            ? `This budget period ends today.`
            : `This budget period ends in ${endsIn} ${endsIn === 1 ? "day" : "days"}.`,
        dueDate: end,
        severity: "info",
      });
    }
  }

  // ── Goal deadlines ─────────────────────────────────────────────────────
  for (const g of input.goals) {
    if (!g.targetDate) continue;
    if (g.savedAmount >= g.targetAmount) continue;

    const target = new Date(g.targetDate);
    const diff = daysUntil(target, today);
    if (diff > 7 || diff < -MAX_OVERDUE_DAYS) continue;

    const remaining = Math.max(g.targetAmount - g.savedAmount, 0);
    const overdue = diff < 0;
    out.push({
      key: `goal:${g.id}:deadline:${dayKey(target)}`,
      type: "goal_deadline",
      title: overdue ? `Goal behind schedule · ${g.title}` : `Goal deadline soon · ${g.title}`,
      body: `${money(remaining, currency)} still to save by ${formatDate(target)}.`,
      dueDate: target,
      severity: overdue ? "critical" : diff <= 3 ? "warning" : "info",
    });
  }

  return out.sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 } as const;
    if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity];
    const at = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bt = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return at - bt;
  });
}

/**
 * Recomputes this user's reminders and upserts them. Rows are keyed by
 * occurrence, so calling this repeatedly never duplicates anything.
 */
export async function syncRemindersForUser(
  userId: string,
  currency = "XAF"
): Promise<ReminderCandidate[]> {
  await connectDB();

  const since = new Date(Date.now() - 400 * DAY_MS);
  const [debts, bills, budgets, goals, txs] = await Promise.all([
    Debt.find({ userId }).lean(),
    Bill.find({ userId }).lean(),
    Budget.find({ userId }).lean(),
    Goal.find({ userId }).lean(),
    Transaction.find({ userId, date: { $gte: since }, type: "expense" }).lean(),
  ]);

  const candidates = buildReminders({
    debts: debts.map((d) => ({
      id: String(d._id),
      person: d.person,
      amount: d.amount,
      dueDate: d.dueDate ?? null,
      status: d.status,
      type: d.type,
    })),
    bills: bills.map((b) => ({
      id: String(b._id),
      name: b.name,
      amount: b.amount,
      nextDueDate: b.nextDueDate,
      active: b.active,
    })),
    budgets: budgets.map((b) => ({
      id: String(b._id),
      category: b.category,
      amount: b.amount,
      startDate: b.startDate,
      endDate: b.endDate,
    })),
    goals: goals.map((g) => ({
      id: String(g._id),
      title: g.title,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      targetDate: g.targetDate ?? null,
    })),
    transactions: txs.map((t) => ({
      type: t.type,
      amount: t.amount,
      category: t.category,
      date: t.date,
    })),
    currency,
  });

  if (candidates.length > 0) {
    await Reminder.bulkWrite(
      candidates.map((c) => ({
        updateOne: {
          filter: { userId, key: c.key },
          update: {
            $set: {
              type: c.type,
              title: c.title,
              body: c.body,
              dueDate: c.dueDate ?? null,
              severity: c.severity,
            },
            $setOnInsert: {
              userId,
              key: c.key,
              readAt: null,
              dismissedAt: null,
              emailedAt: null,
              pushedAt: null,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }

  return candidates;
}

/** Active reminders that have not been opened yet — used for the badge. */
export async function unreadReminderCount(userId: string): Promise<number> {
  await connectDB();
  return Reminder.countDocuments({ userId, readAt: null, dismissedAt: null });
}
