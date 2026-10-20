import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import type { AssistantAction } from "@/lib/assistant";

/**
 * Optional paid-model parsing, wired to free tiers only:
 *
 *   GROQ_API_KEY        Groq — free tier, fast (llama-3.3-70b)
 *   OPENAI_API_KEY      any OpenAI-compatible endpoint (OpenRouter, a home
 *                       Ollama/LM Studio via AI_BASE_URL and AI_MODEL)
 *   GEMINI_API_KEY      Google Gemini free tier
 *
 * With none of them configured the route falls back to the built-in rules in
 * assistant.ts, so the feature always works and costs nothing by default.
 * A model that fails or times out also falls back rather than blocking.
 */

const SYSTEM_PROMPT = `You turn what a person said or typed into structured money records for their personal finance app.
Reply with ONLY a JSON object shaped like {"actions":[...]} and nothing else.

Possible actions:
- {"kind":"transaction","type":"expense"|"income","amount":number,"category":string,"description":string,"date":"YYYY-MM-DD"}
- {"kind":"bill","name":string,"amount":number,"category":string,"frequency":"monthly"|"weekly"|"yearly","nextDueDate":"YYYY-MM-DD","note":string}
- {"kind":"budget","category":string,"amount":number,"period":"monthly"|"weekly"|"yearly","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD"}
- {"kind":"debt","type":"owed_to_me"|"i_owe","person":string,"amount":number,"description":string,"dueDate":"YYYY-MM-DD"|null}

Rules:
- Amounts are in the account currency (XAF). "1 300" and "1,300" both mean one thousand three hundred.
- A budget spoken as a daily or weekly rate becomes a period budget: amount = rate times 30 for a month, 7 for a week, 365 for a year, and startDate/endDate cover one period starting today.
- Expense categories: ${EXPENSE_CATEGORIES.join(", ")}. Income categories: ${INCOME_CATEGORIES.join(", ")}.
- Bills default to monthly. A due day like "the 21st" means the next such day from today.
- description is the short thing the person said, cleaned up, never invented.
- Return {"actions":[]} when nothing recordable was said. Never guess an amount.`;

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  text: string,
  today: Date
): Promise<unknown> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Today is ${today.toISOString().slice(0, 10)}.\n\nWhat the person said:\n"""${text}"""` },
      ],
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`AI answered ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return extractJson(data.choices?.[0]?.message?.content || "");
}

async function callGemini(apiKey: string, model: string, text: string, today: Date): Promise<unknown> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nToday is ${today.toISOString().slice(0, 10)}.\n\nWhat the person said:\n"""${text}"""`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(12000),
    }
  );

  if (!res.ok) throw new Error(`AI answered ${res.status}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
}

/** The model behind the current configuration, for the interface. */
export function aiModelLabel(): string | null {
  if (process.env.GROQ_API_KEY) return "Groq free tier";
  if (process.env.OPENAI_API_KEY || (process.env.AI_BASE_URL && process.env.AI_API_KEY)) {
    return process.env.AI_MODEL || "OpenAI";
  }
  if (process.env.GEMINI_API_KEY) return "Gemini free tier";
  return null;
}

/**
 * Returns the raw actions a model produced, or null when no model is
 * configured or it failed — the caller then uses the free built-in rules.
 */
export async function parseWithAI(
  text: string,
  today: Date
): Promise<{ raw: unknown; model: string } | null> {
  try {
    if (process.env.GROQ_API_KEY) {
      const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
      const raw = await callOpenAiCompatible(
        "https://api.groq.com/openai/v1",
        process.env.GROQ_API_KEY,
        model,
        text,
        today
      );
      return raw ? { raw, model } : null;
    }

    const openAiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    if (openAiKey) {
      const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
      const model = process.env.AI_MODEL || "gpt-4o-mini";
      const raw = await callOpenAiCompatible(baseUrl, openAiKey, model, text, today);
      return raw ? { raw, model } : null;
    }

    if (process.env.GEMINI_API_KEY) {
      const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const raw = await callGemini(process.env.GEMINI_API_KEY, model, text, today);
      return raw ? { raw, model } : null;
    }
  } catch (error) {
    console.error("assistant parseWithAI", error);
  }

  return null;
}
