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

/** Whole words only: "pen" must not score inside "spent", "bar" inside "barber". */
function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function scoreCategories(text: string): string | null {
  let best: { category: string; score: number; length: number } | null = null;

  for (const [category, entries] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    let length = 0;
    for (const entry of entries) {
      if (hasWord(text, entry.word)) {
        score += entry.weight ?? 2;
        length = Math.max(length, entry.word.length);
      }
    }
    // Ties go to the more specific word, not to table order.
    if (
      score > 0 &&
      (!best || score > best.score || (score === best.score && length > best.length))
    ) {
      best = { category, score, length };
    }
  }

  return best ? best.category : null;
}

function guessIncomeCategory(text: string): string {
  for (const [category, words] of Object.entries(INCOME_KEYWORDS)) {
    if (words.some((word) => hasWord(text, word))) return category;
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
  // "Pierre yesterday" and "George next week" are a person plus a date, not a
  // name — peel date words off the end until only the name is left.
  const trimDate = (name: string) => {
    const tail =
      /\s+(?:yesterday|today|tomorrow|tonight|ago|due|next|last|this|coming|since|for|day|days|week|weeks|month|months|year|years|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i;
    let out = name.trim();
    let previous = "";
    while (out !== previous) {
      previous = out;
      out = out.replace(tail, "").trim();
    }
    return out;
  };

  // "Mom lent me 5000" — the person is the subject of the verb.
  const subject =
    /(?:^|[^\p{L}])([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'’]*(?:\s[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'’]*){0,2})\s+(?:lent|lend|gave|give|owes?|borrow(?:ed)?|repaid?|repay|paid|pays?)\b/iu.exec(
      text
    );
  if (subject) {
    const name = trimDate(subject[1].trim());
    const pronoun = /^(i|we|you|they|he|she|it|someone|somebody|nobody)$/i;
    if (name && !pronoun.test(name) && !/^\d/.test(name)) return name;
  }

  // "owe/lent/gave" also introduce the person: "I owe George 2000".
  const match =
    /\b(?:from|with|to|owe|owes|lent|gave|repay)\s+(?:me\s+)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'’]*(?:\s[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'’]*){0,2})/i.exec(
      text
    );
  if (!match) return "Someone";

  const person = trimDate(match[1].trim().replace(/\s+(the|a|an)$/i, ""));
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
    // A past date says when it happened, not when it is due — only a date that
    // is still ahead counts as the due date.
    const found = findDate(clause, today);
    return {
      kind: "debt",
      type: iOwe ? "i_owe" : "owed_to_me",
      person: guessDebtPerson(clause),
      amount,
      description: clause,
      dueDate: found && found >= isoDate(today) ? found : undefined,
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

/** Words that begin a new money statement in run-on speech. */
const MONEY_START =
  /\b(?:ok(?:ay)?|so|well|yeah|um+|uh+|erm?|hmm+|ah+|right|and|then|plus|spent|spend|pay(?:ing|id|s)?|buy|bought|purchase[ds]?|topped up|recharg\w+|used|receiv\w+|earn\w+|won|sold|gave|lent|borrow\w+|owe[sd]?|deposit\w+|withdr\w+|sent|add(?:ed)?(?:\s+bill)?|budget(?:ed)?|costs?)\b/i;

/** "…groceries 400 on transport" — a fresh figure carrying its own preposition. */
const FIGURE_START = /\s+(?=\d+(?:[.,]\d+)?\s*(?:k\b|mille\b)?\s*(?:on|for|at|of|due)\b)/gi;

function splitClauses(text: string): string[] {
  const rough = text
    .split(/[\n;.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const part of rough) {
    const halves = part.split(/\s+(?:and|et)\s+/i);
    if (halves.length > 1 && halves.every((half) => /\d/.test(half))) {
      out.push(...halves.map((half) => half.trim()).filter(Boolean));
      continue;
    }

    // Voice arrives as one run-on line. Cut where a new statement starts, but
    // only when the side before the cut already keeps a figure of its own —
    // "the bus I paid 300 yesterday" must never lose "the bus".
    const cuts: number[] = [];
    const verbs = new RegExp(MONEY_START.source, "gi");
    let match: RegExpExecArray | null;
    while ((match = verbs.exec(part))) {
      const at = match.index;
      if (at === 0 || !/\d/.test(part.slice(0, at))) continue;
      if (!/^\W*(?:\w+\W+){0,7}\d/.test(part.slice(at))) continue;
      cuts.push(at);
    }
    FIGURE_START.lastIndex = 0;
    while ((match = FIGURE_START.exec(part))) {
      const at = match.index;
      if (at === 0 || !/\d/.test(part.slice(0, at))) continue;
      cuts.push(at);
    }

    const marks = [...new Set(cuts)].sort((a, b) => a - b);
    const pieces: string[] = [];
    let cursor = 0;
    for (const mark of marks) {
      pieces.push(part.slice(cursor, mark));
      cursor = mark;
    }
    pieces.push(part.slice(cursor));

    for (const piece of pieces) {
      const trimmed = piece
        .replace(/^(?:(?:ok(?:ay)?|so|well|yeah|um+|uh+|erm?|hmm+|ah+|right|and|then|plus)[,\s]+)+/i, "")
        .replace(/(?:\s+(?:ok(?:ay)?|so|well|yeah|um+|uh+|erm?|hmm+|ah+|right|and|then|plus|i))+\s*$/i, "")
        .trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out.slice(0, 8);
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

/* ---------- Answers: reading the ledger back ---------- */

/** Plain data the route gathers per user; the answer function stays pure. */
export interface LedgerSnapshot {
  transactions: {
    type: "income" | "expense";
    amount: number;
    category: string;
    date: string | Date;
  }[];
  bills?: { name: string; amount: number; nextDueDate: string | Date }[];
  budgets?: {
    category: string;
    amount: number;
    startDate: string | Date;
    endDate: string | Date;
  }[];
  debts?: { type: "owed_to_me" | "i_owe"; person: string; amount: number }[];
  currency?: string;
}

/**
 * A sentence is a question when it is written as one — a question mark or an
 * interrogative opening. "I owe George 2000 due 25" stays a record: it opens
 * with "I", so the parser, not the answerer, gets the final word.
 */
export function looksLikeQuestion(text: string): boolean {
  const t = text.trim();
  if (t.includes("?")) return true;
  if (
    /^\s*(?:what|how|when|who|which|why|where|show|tell|list|do|does|did|is|are|was|were|can|could|any)\b/i.test(
      t
    )
  ) {
    return true;
  }
  return /^\s*(?:balance|owe|owed|owing|debts?|bills?|subscriptions?)\b/i.test(t);
}

function dueLabel(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Answers questions straight from the person's own ledger — balance, spending,
 * money in, bills due, debts, what is left of a budget. Returns null when the
 * sentence carries no question, so the caller can fall through to recording.
 */
export function answerQuestion(
  text: string,
  ledger: LedgerSnapshot,
  today: Date = new Date(),
  money?: (value: number) => string
): string | null {
  if (!looksLikeQuestion(text)) return null;
  const lower = text.toLowerCase();
  const currency = (ledger.currency || "XAF").toUpperCase();
  const fmt =
    money ?? ((n: number) => `${Math.round(n).toLocaleString("en-US")} ${currency}`);
  /** Plain figure for repeats — a sentence needs the currency name once. */
  const bare = (n: number) => Math.round(n).toLocaleString("en-US");

  const dayStart = (offset = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const thisMonday = (() => {
    const d = dayStart();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  })();

  let from: Date;
  let to: Date;
  let when: string;
  if (/\btoday\b|\bthis morning\b|\btonight\b/.test(lower)) {
    from = dayStart();
    to = dayStart(1);
    to.setMilliseconds(-1);
    when = "today";
  } else if (/\byesterday\b/.test(lower)) {
    from = dayStart(-1);
    to = dayStart();
    to.setMilliseconds(-1);
    when = "yesterday";
  } else if (/\bthis week\b/.test(lower)) {
    from = thisMonday;
    to = dayStart(1);
    to.setMilliseconds(-1);
    when = "this week";
  } else if (/\blast week\b/.test(lower)) {
    from = new Date(thisMonday);
    from.setDate(from.getDate() - 7);
    to = new Date(thisMonday);
    to.setMilliseconds(-1);
    when = "last week";
  } else if (/\blast month\b/.test(lower)) {
    from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    to = new Date(today.getFullYear(), today.getMonth(), 1);
    to.setMilliseconds(-1);
    when = "last month";
  } else if (/\ball time\b|\bever\b|\bin total\b|\baltogether\b/.test(lower)) {
    from = new Date(0);
    to = dayStart(1);
    to.setMilliseconds(-1);
    when = "in total";
  } else {
    from = new Date(today.getFullYear(), today.getMonth(), 1);
    to = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    to.setMilliseconds(-1);
    when = "this month";
  }
  const within = (value: string | Date) => {
    const d = new Date(value);
    return d >= from && d <= to;
  };
  const sum = (list: { amount: number }[]) => list.reduce((s, x) => s + x.amount, 0);

  // 1. Budgets — "how much is left on my transport budget".
  if (/\bbudget/.test(lower)) {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const wanted = scoreCategories(text);
    const candidates = (ledger.budgets || []).filter(
      (b) => new Date(b.endDate) >= monthStart && (!wanted || b.category === wanted)
    );
    if (candidates.length === 0) {
      return wanted ? `No ${wanted} budget is set.` : "No budgets are set yet.";
    }
    const line = (b: { category: string; amount: number; startDate: string | Date; endDate: string | Date }) => {
      const spent = sum(
        (ledger.transactions || []).filter(
          (t) => t.type === "expense" && t.category === b.category && within(t.date)
        )
      );
      const left = b.amount - spent;
      const until = dueLabel(b.endDate);
      return left >= 0
        ? `${b.category}: ${fmt(left)} left of ${bare(b.amount)}, until ${until}`
        : `${b.category}: over by ${fmt(-left)} against ${bare(b.amount)}, until ${until}`;
    };
    const shown = candidates.slice(0, 3).map(line);
    const more =
      candidates.length > 3 ? ` (+${candidates.length - 3} more)` : "";
    return shown.join(" · ") + more + ".";
  }

  // 2. Balance — same reading as the dashboard: money in minus money out.
  if (
    /\bbalance\b|\bavailable\b|\bhave left\b|\bis left\b|\bdo i have\b|\bhave i got\b|how much (?:money )?do i have/.test(
      lower
    )
  ) {
    const inc = sum(ledger.transactions.filter((t) => t.type === "income" && within(t.date)));
    const out = sum(ledger.transactions.filter((t) => t.type === "expense" && within(t.date)));
    if (inc === 0 && out === 0) return `Nothing recorded ${when}.`;
    const net = inc - out;
    return net >= 0
      ? `${fmt(inc)} in, ${bare(out)} out ${when} — ${bare(net)} left.`
      : `${fmt(inc)} in, ${bare(out)} out ${when} — you're ${bare(-net)} short.`;
  }

  // 3. Debts — both directions, named.
  if (/\bowe|owed|owing|debt|borrow|\blent\b|\blend\b|repay|pay back\b/.test(lower)) {
    const debts = ledger.debts || [];
    const mine = debts.filter((d) => d.type === "i_owe");
    const theirs = debts.filter((d) => d.type === "owed_to_me");
    const named = (items: { person: string; amount: number }[]) =>
      items.map((d) => `${d.person} ${fmt(d.amount)}`).join(", ");

    if (/who owes me|owed to me|owe me|\blent\b|borrowed from me|back to me/.test(lower)) {
      if (theirs.length === 0) return "No one owes you anything right now.";
      if (theirs.length === 1) return `Owed to you — ${fmt(theirs[0].amount)} from ${theirs[0].person}.`;
      return `Owed to you — ${fmt(sum(theirs))} in total: ${named(theirs)}.`;
    }
    if (/how much do i owe|i owe|my debts|what do i owe|owe anyone|\bowe\b/.test(lower)) {
      if (mine.length === 0) return "You don't owe anyone right now.";
      if (mine.length === 1) return `You owe ${fmt(mine[0].amount)} to ${mine[0].person}.`;
      return `You owe ${fmt(sum(mine))} — ${named(mine)}.`;
    }
    const parts: string[] = [];
    if (theirs.length > 0) parts.push(`Owed to you: ${fmt(sum(theirs))} — ${named(theirs)}`);
    if (mine.length > 0) parts.push(`You owe: ${fmt(sum(mine))} — ${named(mine)}`);
    return parts.length > 0 ? parts.join(". ") + "." : "No open debts.";
  }

  // 4. Bills — what is coming, soonest first.
  if (/\bbills?\b|\bsubscriptions?\b/.test(lower)) {
    const bills = (ledger.bills || [])
      .slice()
      .sort((a, b) => +new Date(a.nextDueDate) - +new Date(b.nextDueDate));
    if (bills.length === 0) return "No bills are scheduled.";
    const overdueStart = dayStart();
    const upcoming = bills.slice(0, 5);
    const lines = upcoming.map(
      (b) =>
        `${b.name} ${fmt(b.amount)}${
          new Date(b.nextDueDate) < overdueStart ? " — overdue since" : " due"
        } ${dueLabel(b.nextDueDate)}`
    );
    const more = bills.length > 5 ? ` (+${bills.length - 5} more)` : "";
    return lines.join(" · ") + more + ".";
  }

  // 5. Money in.
  if (/\bearn|income|receiv|got paid|salary|allowance|\bmade\b/.test(lower)) {
    const incoming = ledger.transactions.filter(
      (t) => t.type === "income" && within(t.date)
    );
    if (incoming.length === 0) return `No money in recorded ${when}.`;
    const suffix = incoming.length > 1 ? ` across ${incoming.length} entries` : "";
    return `Money in ${when} — ${fmt(sum(incoming))}${suffix}.`;
  }

  // 6. Spending — with the category when one is named.
  if (/\bspent\b|\bspending\b|\bspend\b|\bexpenses?\b/.test(lower)) {
    const category = scoreCategories(text);
    const costs = ledger.transactions.filter(
      (t) => t.type === "expense" && within(t.date) && (!category || t.category === category)
    );
    if (costs.length === 0) {
      return category ? `Nothing spent on ${category} ${when}.` : `Nothing spent ${when}.`;
    }
    const total = fmt(sum(costs));
    if (category) {
      const suffix = costs.length > 1 ? ` across ${costs.length} entries` : "";
      return `Spent ${total} on ${category} ${when}${suffix}.`;
    }
    const byCategory = new Map<string, number>();
    costs.forEach((t) =>
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount)
    );
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    const topNote = top ? ` Biggest: ${top[0]} ${fmt(top[1])}.` : "";
    return `Spent ${total} ${when} across ${costs.length} ${
      costs.length === 1 ? "entry" : "entries"
    }.${topNote}`;
  }

  return null;
}
