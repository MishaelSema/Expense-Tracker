import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";

/**
 * Turns ordinary speech or typing into structured money records.
 *
 * Two layers share this shape: an optional paid model (see assistant-llm.ts)
 * and the rules below. The rules are what makes the feature free — no key, no
 * network, no cost — and they cover the phrasing this app actually hears.
 *
 * Nothing here writes anything. Every action is a proposal the user confirms.
 */

export interface TransactionAction {
  kind: "transaction";
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
}

export interface BillAction {
  kind: "bill";
  name: string;
  amount: number;
  category: string;
  frequency: "monthly" | "weekly" | "yearly";
  nextDueDate: string;
  note?: string;
}

export interface BudgetAction {
  kind: "budget";
  category: string;
  amount: number;
  period: "monthly" | "weekly" | "yearly";
  startDate: string;
  endDate: string;
}

export interface DebtAction {
  kind: "debt";
  type: "owed_to_me" | "i_owe";
  person: string;
  amount: number;
  description: string;
  dueDate?: string;
}

export type AssistantAction = TransactionAction | BillAction | BudgetAction | DebtAction;

/** The app's vocabulary, with the words people actually say attached. */
const CATEGORY_KEYWORDS: Record<string, { word: string; weight?: number }[]> = {
  Transport: [
    { word: "transport" },
    { word: "transportation" },
    { word: "bus" },
    { word: "taxi" },
    { word: "moto" },
    { word: "bike" },
    { word: "bicycle" },
    { word: "fuel" },
    { word: "petrol" },
    { word: "gas" },
    { word: "fare" },
    { word: "commute" },
    { word: "trip" },
    { word: "school", weight: 1 },
    { word: "come back", weight: 2 },
    { word: "back home", weight: 2 },
    { word: "comeback", weight: 2 },
  ],
  Food: [
    { word: "food" },
    { word: "lunch" },
    { word: "breakfast" },
    { word: "dinner" },
    { word: "eat" },
    { word: "restaurant" },
    { word: "rice" },
    { word: "chicken" },
    { word: "bread" },
    { word: "groceries" },
    { word: "market" },
    { word: "snack" },
    { word: "meal" },
    { word: "feeding" },
  ],
  Rent: [{ word: "rent" }, { word: "landlord" }, { word: "accommodation" }, { word: "lodge" }],
  "Books and supplies": [
    { word: "book", weight: 2 },
    { word: "books", weight: 2 },
    { word: "stationery" },
    { word: "supplies" },
    { word: "photocopy" },
    { word: "printing" },
    { word: "pen" },
  ],
  "Data and airtime": [
    { word: "data" },
    { word: "airtime" },
    { word: "bundle" },
    { word: "credit" },
    { word: "internet" },
    { word: "wifi" },
    { word: "mtn" },
    { word: "orange" },
    { word: "camtel" },
  ],
  Health: [
    { word: "health" },
    { word: "doctor" },
    { word: "hospital" },
    { word: "pharmacy" },
    { word: "medicine" },
    { word: "drugs" },
    { word: "clinic" },
  ],
  Social: [
    { word: "party" },
    { word: "drink" },
    { word: "beer" },
    { word: "bar" },
    { word: "club" },
    { word: "friends" },
    { word: "outing" },
    { word: "hangout" },
  ],
  Fees: [{ word: "fees" }, { word: "tuition" }, { word: "enrolment" }, { word: "registration" }],
  Savings: [{ word: "savings" }, { word: "save" }, { word: "put aside" }],
};

const INCOME_KEYWORDS: Record<string, string[]> = {
  Allowance: ["allowance", "pocket money"],
  Salary: ["salary", "wage", "pay day", "payday"],
  Freelance: ["freelance", "client", "gig", "contract"],
  Gift: ["gift", "birthday money"],
  Scholarship: ["scholarship", "bursary"],
  Refund: ["refund", "cashback", "change back"],
};

const BUDGET_WORDS = /\b(budget|limit|cap)\b/i;
const PER_DAY = /\b(per day|a day|daily|each day|par jour|jour)\b/i;
const PER_WEEK = /\b(per week|a week|weekly|each week|par semaine)\b/i;
const PER_MONTH = /\b(per month|a month|monthly|each month|par mois)\b/i;
const PER_YEAR = /\b(per year|a year|yearly|annually|par an)\b/i;

const BILL_WORDS =
  /\b(bill|subscription|subscribe|renew|renewal|direct debit|recurring|prime)\b/i;
const DEBT_WORDS =
  /\b(owe|owes|borrow|borrowed|lend|lent|debt|give back|pay back|repay|owed)\b/i;
const INCOME_WORDS =
  /\b(salary|wage|allowance|freelance|gift|scholarship|refund|received|earned|won|sold|bonus|income|paid me)\b/i;
const EXPENSE_WORDS =
  /\b(spend|spent|spending|buy|bought|pay|paid|cost|costs|used|purchase|dépensé|dépense|payé|acheté)\b/i;

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** "1 300", "1,300", "1.5k" and "2000fcfa" all come back as numbers. */
function parseAmount(text: string): number | null {
  const cleaned = text.replace(/\u00a0/g, " ");
  const match = /(\d+(?:[ ,.]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(k\b|mille|millier)?/i.exec(
    cleaned
  );
  if (!match) return null;

  let raw = match[1].replace(/[\s']/g, "");
  // A dot or comma followed by exactly three digits is thousands, not cents.
  raw = raw.replace(/[.,](?=\d{3}(?:\D|$))/g, "");
  let value = Number(raw.replace(",", "."));
  if (!isFinite(value)) return null;
  if (match[2]) value *= 1000;
  return value > 0 ? value : null;
}

function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** The next time this day-of-month comes around, from `from` onwards. */
function nextOccurrenceOf(day: number, from: Date): Date {
  const candidate = new Date(from.getFullYear(), from.getMonth(), day);
  if (candidate.getTime() < new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate;
}

/** Reads the day a clause refers to: today, yesterday, "the 21st", "21 oct", ISO. */
function findDate(text: string, today: Date): string | null {
  const lower = text.toLowerCase();

  if (/\btoday\b|\bthis morning\b|\bce matin\b/i.test(lower)) return isoDate(today);
  if (/\byesterday\b|hier\b/i.test(lower)) return isoDate(addDays(today, -1));
  if (/\btomorrow\b|demain\b/i.test(lower)) return isoDate(addDays(today, 1));

  const weekday = new RegExp(`\\b(${WEEKDAYS.join("|")})\\b`, "i").exec(lower);
  if (weekday) {
    const target = WEEKDAYS.indexOf(weekday[1].toLowerCase());
    const delta = (target - today.getDay() + 7) % 7;
    // "last friday" means the most recent one that has passed, never today or ahead.
    if (/\blast\b|last week|passed|dernier/i.test(lower)) {
      return isoDate(addDays(today, delta === 0 ? -7 : delta - 7));
    }
    // A bare weekday means the next one coming up.
    return isoDate(addDays(today, delta === 0 ? 7 : delta));
  }

  const iso = /(\d{4}-\d{2}-\d{2})/.exec(text);
  if (iso) return iso[1];

  const numeric = /\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/.exec(text);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = numeric[3]
      ? Number(numeric[3]) + (Number(numeric[3]) < 100 ? 2000 : 0)
      : today.getFullYear();
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return isoDate(new Date(year, month - 1, day));
    }
  }

  const named = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?(${MONTHS.join("|")})`, "i").exec(
    lower
  );
  if (named) {
    const month = MONTHS.indexOf(named[2].slice(0, 3));
    return isoDate(new Date(today.getFullYear(), month, Number(named[1])));
  }

  // "due 21", "on the 3rd", "pay on 25" — a bare day of the month.
  const dayOfMonth = /\b(?:due|by|on|pay on|the)\s*(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/i.exec(text);
  if (dayOfMonth && Number(dayOfMonth[1]) <= 31) {
    return isoDate(nextOccurrenceOf(Number(dayOfMonth[1]), today));
  }

  return null;
}

function scoreCategories(text: string): string | null {
  const lower = ` ${text.toLowerCase()} `;
  let best: { category: string; score: number } | null = null;

  for (const [category, entries] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const entry of entries) {
      if (lower.includes(entry.word)) score += entry.weight ?? 2;
    }
    if (score > 0 && (!best || score > best.score)) best = { category, score };
  }

  return best ? best.category : null;
}

function guessIncomeCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [category, words] of Object.entries(INCOME_KEYWORDS)) {
    if (words.some((word) => lower.includes(word))) return category;
  }
  return "Other";
}

/** "add bill spotify2609 monthly" → "Spotify". */
function guessBillName(text: string): string {
  const stop = new Set([
    "add", "new", "a", "an", "the", "my", "our", "bill", "subscription", "monthly", "weekly",
    "yearly", "month", "week", "year", "for", "of", "on", "to", "and", "due", "pay", "costs",
    "cost", "is", "at", "every", "each", "next", "record", "log", "please", "subscription to",
  ]);

  const words = text.replace(/[^\p{L}\p{N}'’\s]/gu, " ").split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (word.length < 3 || stop.has(word.toLowerCase())) continue;
    if (/^\d+$/.test(word)) continue;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  return "Bill";
}

function guessDebtPerson(text: string): string {
  // "owe"/"lent"/"gave" also introduce the person: "I owe George 2000".
  const match =
    /\b(?:from|with|to|owe|owes|lent|gave|repay)\s+(?:me\s+)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'’]*(?:\s[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'’]*){0,2})/i.exec(
      text
    );
  if (!match) return "Someone";

  const person = match[1].trim().replace(/\s+(the|a|an)$/i, "");
  if (/^\d+$/.test(person) || /^(it|them|him|her|back|debt|money)$/i.test(person)) {
    return "Someone";
  }
  return person;
}

/** Budgets are stated as a rate; the app records them as a period total. */
function buildBudget(
  rate: number,
  period: "monthly" | "weekly" | "yearly",
  perDay: boolean,
  today: Date
): { amount: number; startDate: string; endDate: string } {
  if (period === "weekly") {
    const start = addDays(today, -today.getDay() + 1); // Monday
    return {
      amount: perDay ? rate * 7 : rate,
      startDate: isoDate(start),
      endDate: isoDate(addDays(start, 6)),
    };
  }
  if (period === "yearly") {
    const start = new Date(today.getFullYear(), 0, 1);
    return {
      amount: perDay ? rate * 365 : rate,
      startDate: isoDate(start),
      endDate: isoDate(new Date(today.getFullYear(), 11, 31)),
    };
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    amount: perDay ? rate * daysInMonth(today.getFullYear(), today.getMonth()) : rate,
    startDate: isoDate(start),
    endDate: isoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}

function parseClause(clause: string, today: Date): AssistantAction | null {
  const amount = parseAmount(clause);
  if (!amount) return null;

  const perDay = PER_DAY.test(clause);
  const perWeek = PER_WEEK.test(clause);
  const perMonth = PER_MONTH.test(clause);
  const perYear = PER_YEAR.test(clause);

  // 1. Budget — a stated limit, or a rate with a period attached.
  if (BUDGET_WORDS.test(clause) || perDay || perWeek || perYear) {
    const period = perWeek ? "weekly" : perYear ? "yearly" : "monthly";
    const category = scoreCategories(clause) || "Other";
    const built = buildBudget(amount, period, perDay, today);
    return {
      kind: "budget",
      category,
      amount: built.amount,
      period,
      startDate: built.startDate,
      endDate: built.endDate,
    };
  }

  // 2. Recurring bill.
  if (BILL_WORDS.test(clause)) {
    const frequency = perWeek ? "weekly" : perYear ? "yearly" : "monthly";
    const date = findDate(clause, today) || isoDate(addDays(today, 30));
    return {
      kind: "bill",
      name: guessBillName(clause),
      amount,
      category: scoreCategories(clause) || "Other",
      frequency,
      nextDueDate: date,
      note: clause,
    };
  }

  // 3. Debt between people.
  if (DEBT_WORDS.test(clause)) {
    const iOwe = /\b(owe|owes|borrow|borrowed|i owe)\b/i.test(clause);
    return {
      kind: "debt",
      type: iOwe ? "i_owe" : "owed_to_me",
      person: guessDebtPerson(clause),
      amount,
      description: clause,
      dueDate: findDate(clause, today) ?? undefined,
    };
  }

  // 4. Money coming in.
  if (INCOME_WORDS.test(clause)) {
    return {
      kind: "transaction",
      type: "income",
      amount,
      category: guessIncomeCategory(clause),
      description: clause,
      date: findDate(clause, today) || isoDate(today),
    };
  }

  // 5. Everything else with a figure is spending.
  if (EXPENSE_WORDS.test(clause) || /\d/.test(clause)) {
    return {
      kind: "transaction",
      type: "expense",
      amount,
      category: scoreCategories(clause) || "Other",
      description: clause,
      date: findDate(clause, today) || isoDate(today),
    };
  }

  return null;
}

/** Splits "spent 500 on food and 300 on transport" into two clauses. */
function splitClauses(text: string): string[] {
  const rough = text
    .split(/[\n;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const part of rough) {
    const halves = part.split(/\s+(?:and|et)\s+/i);
    if (halves.length > 1 && halves.every((half) => /\d/.test(half))) {
      out.push(...halves.map((half) => half.trim()).filter(Boolean));
    } else {
      out.push(part);
    }
  }
  return out;
}

export function parseWithRules(text: string, today: Date = new Date()): AssistantAction[] {
  const actions: AssistantAction[] = [];
  for (const clause of splitClauses(text)) {
    const action = parseClause(clause, today);
    if (action) actions.push(action);
  }
  return actions;
}

/**
 * Model output is untrusted text, so every action is checked against what the
 * APIs will actually accept before the client is allowed to see it.
 */
export function validateActions(input: unknown, fallbackText = ""): AssistantAction[] {
  if (!Array.isArray(input)) return [];
  const fallback = fallbackText.trim().slice(0, 80) || "Recorded via Ask Ledger";
  const out: AssistantAction[] = [];

  for (const raw of input.slice(0, 6)) {
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Record<string, unknown>;

    const amount = Number(a.amount);
    if (!isFinite(amount) || amount <= 0 || amount > 1e12) continue;

    const date = typeof a.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.date) ? a.date : "";
    const description =
      typeof a.description === "string" && a.description.trim()
        ? a.description.trim().slice(0, 120)
        : fallback;

    if (a.kind === "transaction") {
      const type = a.type === "income" ? "income" : "expense";
      const pool: readonly string[] = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      out.push({
        kind: "transaction",
        type,
        amount,
        category: pool.includes(String(a.category)) ? String(a.category) : "Other",
        description,
        date: date || isoDate(new Date()),
      });
      continue;
    }

    if (a.kind === "bill") {
      const name = String(a.name || "").trim().slice(0, 60);
      if (!name) continue;
      const frequency =
        a.frequency === "weekly" ? "weekly" : a.frequency === "yearly" ? "yearly" : "monthly";
      const pool: readonly string[] = EXPENSE_CATEGORIES;
      const billDate =
        typeof a.nextDueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.nextDueDate)
          ? a.nextDueDate
          : "";
      if (!billDate) continue;
      out.push({
        kind: "bill",
        name,
        amount,
        category: pool.includes(String(a.category)) ? String(a.category) : "Other",
        frequency,
        nextDueDate: billDate,
        note: description,
      });
      continue;
    }

    if (a.kind === "budget") {
      const period =
        a.period === "weekly" ? "weekly" : a.period === "yearly" ? "yearly" : "monthly";
      const pool: readonly string[] = EXPENSE_CATEGORIES;
      const start =
        typeof a.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.startDate)
          ? a.startDate
          : "";
      const end =
        typeof a.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.endDate) ? a.endDate : "";
      if (!start || !end || new Date(end) < new Date(start)) continue;
      out.push({
        kind: "budget",
        category: pool.includes(String(a.category)) ? String(a.category) : "Other",
        amount,
        period,
        startDate: start,
        endDate: end,
      });
      continue;
    }

    if (a.kind === "debt") {
      const type = a.type === "i_owe" ? "i_owe" : "owed_to_me";
      const person = String(a.person || "").trim().slice(0, 60);
      if (!person) continue;
      const due =
        typeof a.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate) ? a.dueDate : "";
      out.push({
        kind: "debt",
        type,
        person,
        amount,
        description,
        dueDate: due || undefined,
      });
    }
  }

  return out;
}
