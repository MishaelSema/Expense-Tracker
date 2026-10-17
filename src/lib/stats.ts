import { monthRange } from "./format";

export interface PlainTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface MonthStats {
  income: number;
  expense: number;
  balance: number;
  daysInMonth: number;
  daysPassed: number;
  daysLeft: number;
  avgDailySpend: number;
  safeDaily: number;
  safeDailyLeft: number;
  spentByCategory: { category: string; amount: number; share: number }[];
  prevMonthExpense: number;
  changePercent: number | null;
  insight: string;
}

export function computeMonthStats(
  all: PlainTransaction[],
  now = new Date()
): MonthStats {
  const { start, end } = monthRange(now);
  const monthTx = all.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });

  const income = monthTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = monthTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const daysInMonth = end.getDate();
  const daysPassed = now.getDate();
  const daysLeft = daysInMonth - daysPassed;

  const avgDailySpend = daysPassed > 0 ? expense / daysPassed : 0;
  const safeDaily = income > 0 ? balance / Math.max(daysLeft, 1) : 0;

  // Category breakdown for the month
  const byCategory = new Map<string, number>();
  monthTx
    .filter((t) => t.type === "expense")
    .forEach((t) =>
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount)
    );

  const spentByCategory = [...byCategory.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      share: expense > 0 ? Math.round((amount / expense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Previous month comparison
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const prevMonthExpense = all
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === "expense" && d >= prevStart && d <= prevEnd;
    })
    .reduce((s, t) => s + t.amount, 0);

  const changePercent =
    prevMonthExpense > 0
      ? Math.round(((expense - prevMonthExpense) / prevMonthExpense) * 100)
      : null;

  const insight = buildInsight(spentByCategory, expense, changePercent);

  return {
    income,
    expense,
    balance,
    daysInMonth,
    daysPassed,
    daysLeft,
    avgDailySpend,
    safeDaily,
    safeDailyLeft: Math.max(balance, 0),
    spentByCategory: spentByCategory.slice(0, 4),
    prevMonthExpense,
    changePercent,
    insight,
  };
}

function buildInsight(
  categories: { category: string; share: number }[],
  expense: number,
  changePercent: number | null
): string {
  if (expense <= 0) {
    return "Nothing recorded yet. Add a transaction and your picture starts to take shape.";
  }
  const top = categories[0];
  const first =
    top && top.share >= 25
      ? `Your biggest spend this month is ${top.category.toLowerCase()}, at ${top.share}% of everything you've spent.`
      : `Your spending is spread nicely across categories this month.`;

  if (changePercent === null) return first;
  if (changePercent >= 10) {
    return `${first} You're spending ${changePercent}% more than last month so far.`;
  }
  if (changePercent <= -10) {
    return `${first} That's ${Math.abs(changePercent)}% less than last month — nicely done.`;
  }
  return `${first} You're tracking close to last month.`;
}
