import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import {
  answerQuestion,
  looksLikeQuestion,
  parseWithRules,
  validateActions,
  type LedgerSnapshot,
} from "@/lib/assistant";
import { parseWithAI } from "@/lib/assistant-llm";
import { formatCurrency } from "@/lib/format";
import Transaction from "@/models/Transaction";
import Bill from "@/models/Bill";
import Budget from "@/models/Budget";
import Debt from "@/models/Debt";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Reads a sentence two ways: it proposes records to confirm, and it answers
 * questions straight from the person's own ledger — "what is my balance",
 * "how much did I spend on transport", "what bills are due". Nothing is ever
 * written here; the interface shows each proposal and the person confirms
 * before the normal authenticated APIs are called.
 *
 * Parsing is free by default (built-in rules). A model is only used when a
 * free-tier key has been configured, and its output is validated field by
 * field before it reaches the client.
 */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || "").trim().slice(0, 800);
    if (!text) return badRequest("Type or say what you want to record.");

    const today = new Date();
    // A question mark settles it: "did I spend 500 on food?" is a question.
    const asked = text.includes("?") || looksLikeQuestion(text);

    let actions = asked ? [] : parseWithRules(text, today);
    let source: "ai" | "built-in" = "built-in";
    let model: string | null = null;

    if (!asked) {
      const ai = await parseWithAI(text, today);
      if (ai) {
        const validated = validateActions(ai.raw, text);
        if (validated.length > 0) {
          actions = validated;
          source = "ai";
          model = ai.model;
        }
      }
    }

    // Questions — and sentences nothing could be recorded from — are answered
    // from the ledger itself. When no answer fits a question, it may still
    // carry a record ("is rent 25000 too much"), so the parser gets the turn.
    let answer: string | null = null;
    if (asked || actions.length === 0) {
      const snapshot = await loadSnapshot(auth.userId);
      answer = answerQuestion(text, snapshot, today, (value) =>
        formatCurrency(value, { currency: snapshot.currency })
      );
    }
    if (!answer && actions.length === 0) {
      actions = parseWithRules(text, today);
    }

    return NextResponse.json({ actions, answer, source, model });
  } catch (error) {
    console.error("POST /api/assistant", error);
    return serverError();
  }
}

/** The plain numbers one person's answer may need — nothing else is loaded. */
async function loadSnapshot(userId: string): Promise<LedgerSnapshot> {
  await connectDB();

  const [transactions, bills, budgets, debts, user] = await Promise.all([
    Transaction.find({ userId }).select("type amount category date").lean(),
    Bill.find({ userId, active: true })
      .select("name amount nextDueDate")
      .sort({ nextDueDate: 1 })
      .limit(20)
      .lean(),
    Budget.find({ userId }).select("category amount startDate endDate").limit(30).lean(),
    Debt.find({ userId, status: "active" }).select("type person amount").limit(50).lean(),
    User.findById(userId).select("currency").lean(),
  ]);

  return {
    transactions: transactions.map((t) => ({
      type: t.type,
      amount: t.amount,
      category: t.category,
      date: t.date,
    })),
    bills: bills.map((b) => ({
      name: b.name,
      amount: b.amount,
      nextDueDate: b.nextDueDate,
    })),
    budgets: budgets.map((b) => ({
      category: b.category,
      amount: b.amount,
      startDate: b.startDate,
      endDate: b.endDate,
    })),
    debts: debts.map((d) => ({
      type: d.type,
      person: d.person,
      amount: d.amount,
    })),
    currency: (user as { currency?: string } | null)?.currency || "XAF",
  };
}
