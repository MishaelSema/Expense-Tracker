import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api-auth";
import { parseWithRules, validateActions } from "@/lib/assistant";
import { parseWithAI } from "@/lib/assistant-llm";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Reads a sentence and returns proposed records. It never writes anything —
 * the interface shows each proposal and the person confirms before the normal
 * authenticated APIs are called.
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
    const ai = await parseWithAI(text, today);

    let actions = parseWithRules(text, today);
    let source: "ai" | "built-in" = "built-in";
    let model: string | null = null;

    if (ai) {
      const validated = validateActions(ai.raw, text);
      if (validated.length > 0) {
        actions = validated;
        source = "ai";
        model = ai.model;
      }
    }

    return NextResponse.json({ actions, source, model });
  } catch (error) {
    console.error("POST /api/assistant", error);
    return serverError();
  }
}
