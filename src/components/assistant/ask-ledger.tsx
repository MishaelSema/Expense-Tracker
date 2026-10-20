"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MicIcon, SparkleIcon, CloseIcon } from "@/components/ui/icons";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AssistantAction } from "@/lib/assistant";

/**
 * Speak or type a sentence; it comes back as proposed records the person
 * confirms one by one. Nothing is written until they tap Save, and every save
 * goes through the same authenticated APIs the rest of the app uses.
 */

interface SpeechRecognitionEventLike {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
}

function getSpeechCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface PendingAction {
  id: string;
  action: AssistantAction;
  status: "idle" | "saving" | "done";
}

/**
 * The sheet unmounts when it closes, so an unsaved sentence and its proposals
 * are kept here instead — an accidental scrim tap should not cost a typed line.
 */
const DRAFT_KEY = "ledger.ask.draft";

function isPendingAction(value: unknown): value is PendingAction {
  const v = value as PendingAction | null;
  return Boolean(
    v &&
      typeof v.id === "string" &&
      v.action &&
      typeof (v.action as { kind?: unknown }).kind === "string"
  );
}

const ENDPOINTS: Record<AssistantAction["kind"], string> = {
  transaction: "/api/transactions",
  bill: "/api/bills",
  budget: "/api/budgets",
  debt: "/api/debts",
};

const SAVED_LABELS: Record<AssistantAction["kind"], string> = {
  transaction: "Transaction added",
  bill: "Bill added",
  budget: "Budget added",
  debt: "Debt added",
};

function payloadFor(action: AssistantAction): Record<string, unknown> {
  switch (action.kind) {
    case "transaction":
      return {
        type: action.type,
        amount: action.amount,
        category: action.category,
        description: action.description,
        date: action.date,
      };
    case "bill":
      return {
        name: action.name,
        amount: action.amount,
        category: action.category,
        frequency: action.frequency,
        nextDueDate: action.nextDueDate,
        note: action.note,
      };
    case "budget":
      return {
        category: action.category,
        amount: action.amount,
        period: action.period,
        startDate: action.startDate,
        endDate: action.endDate,
      };
    case "debt":
      return {
        type: action.type,
        person: action.person,
        amount: action.amount,
        description: action.description,
        dueDate: action.dueDate,
      };
  }
}

function describe(
  action: AssistantAction,
  currency: string
): { label: string; primary: string; secondary: string } {
  const money = (value: number) => formatCurrency(value, { currency });

  switch (action.kind) {
    case "transaction":
      return {
        label: action.type === "income" ? "Money in" : "Money out",
        primary: `${money(action.amount)} · ${action.category}`,
        secondary: `${action.description} · ${formatDate(action.date)}`,
      };
    case "bill":
      return {
        label: "Bill",
        primary: `${action.name} · ${money(action.amount)}`,
        secondary: `${action.frequency} · due ${formatDate(action.nextDueDate)}`,
      };
    case "budget":
      return {
        label: "Budget",
        primary: `${action.category} · ${money(action.amount)}`,
        secondary: `${action.period} · ${formatDate(action.startDate)} – ${formatDate(
          action.endDate
        )}`,
      };
    case "debt":
      return {
        label: action.type === "owed_to_me" ? "Owed to you" : "You owe",
        primary: `${action.person} · ${money(action.amount)}`,
        secondary: action.dueDate
          ? `${action.description} · due ${formatDate(action.dueDate)}`
          : action.description,
      };
  }
}

export function AskLedger({
  currency = "XAF",
  autoFocus = false,
  examples,
  compact = false,
  bare = false,
}: {
  currency?: string;
  autoFocus?: boolean;
  examples?: string[];
  compact?: boolean;
  /** Render without the card chrome, for sitting inside a sheet. */
  bare?: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [entries, setEntries] = useState<PendingAction[]>([]);
  const [engine, setEngine] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Restore an unsaved draft (the sheet unmounts whenever it closes).
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { text?: string; entries?: unknown[] };
      if (typeof draft.text === "string" && draft.text) setText(draft.text);
      if (Array.isArray(draft.entries)) {
        const restored = draft.entries
          .filter(isPendingAction)
          .map((entry) => ({ ...entry, status: entry.status === "saving" ? "idle" : entry.status }));
        if (restored.length > 0) setEntries(restored);
      }
    } catch {
      /* a corrupt draft is not worth surfacing */
    }
  }, []);

  // Keep only what is still unsaved; saving everything clears the draft.
  useEffect(() => {
    try {
      const unsaved = entries.filter((entry) => entry.status !== "done");
      if (!text && unsaved.length === 0) {
        window.sessionStorage.removeItem(DRAFT_KEY);
        return;
      }
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ text, entries: unsaved }));
    } catch {
      /* storage full or blocked — losing a draft is not an error to report */
    }
  }, [text, entries]);

  function toggleMic() {
    if (listening) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      setListening(false);
      if (rec) {
        try {
          rec.stop();
        } catch {
          /* already stopped */
        }
      }
      return;
    }

    const Ctor = getSpeechCtor();
    if (!Ctor) {
      inputRef.current?.focus();
      toast("This browser cannot listen directly.", {
        description:
          "On iPhone, tap the microphone on your keyboard and speak — the words land in this box.",
      });
      return;
    }

    const rec = new Ctor();
    rec.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (event) => {
      let heard = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) heard += result[0].transcript;
      }
      if (heard.trim()) {
        setText((prev) => (prev ? `${prev} ${heard.trim()}` : heard.trim()));
      }
    };
    rec.onend = () => {
      if (recognitionRef.current === rec) recognitionRef.current = null;
      setListening(false);
    };
    rec.onerror = (event) => {
      if (recognitionRef.current === rec) recognitionRef.current = null;
      setListening(false);
      // "aborted" fires when the mic is deliberately stopped — not an error.
      const code = event?.error;
      if (code !== "aborted" && code !== "no-speech") {
        toast.error("I could not hear that. Try again, or type it.");
      }
    };

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  // Closing the sheet unmounts this component; the mic must never outlive it.
  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      if (!rec) return;
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  async function read(sentence: string) {
    const value = sentence.trim();
    if (!value || busy) return;

    setBusy(true);
    setEntries([]);
    setEngine(null);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error || "Could not read that.");
        return;
      }

      const actions: AssistantAction[] = Array.isArray(data?.actions) ? data.actions : [];
      setEngine(data?.source === "ai" ? String(data.model || "the model") : null);

      if (actions.length === 0) {
        toast("Nothing to record in that.", {
          description:
            "Try: Spent 500 on transport · Budget 1300 a day for transport · Add bill Netflix 2609 due 21",
        });
        return;
      }

      setEntries(
        actions.map((action, index) => ({
          id: `${Date.now()}-${index}`,
          action,
          status: "idle" as const,
        }))
      );
      setText("");
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function saveOne(entry: PendingAction): Promise<boolean> {
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, status: "saving" as const } : e))
    );

    try {
      const res = await fetch(ENDPOINTS[entry.action.kind], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFor(entry.action)),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not save that.");

      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: "done" as const } : e))
      );
      toast.success(SAVED_LABELS[entry.action.kind]);
      router.refresh();
      return true;
    } catch (error) {
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: "idle" as const } : e))
      );
      toast.error(error instanceof Error ? error.message : "Could not save that.");
      return false;
    }
  }

  async function saveAll() {
    for (const entry of entries) {
      if (entry.status !== "idle") continue;
      const ok = await saveOne(entry);
      if (!ok) break;
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      read(text);
    }
  }

  const idleCount = entries.filter((entry) => entry.status === "idle").length;

  const content = (
    <>
        {!compact && (
          <p className="mb-3 text-[14px] leading-snug text-[var(--foreground-secondary)]">
            Say or type it the way you would say it out loud. Ledger turns it into
            records you confirm — nothing is saved until you tap Save.
          </p>
        )}

        <textarea
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          rows={2}
          placeholder="Spent 500 on transport to come back home"
          aria-label="Tell Ledger what happened"
          className="w-full resize-none rounded-xl border border-[var(--separator)] bg-[var(--surface-secondary)] px-3.5 py-2.5 text-[15px] leading-snug text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleMic}
              aria-label={listening ? "Stop listening" : "Speak instead of typing"}
              aria-pressed={listening}
              className={cn(
                "pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full border focus-visible:outline-2 focus-visible:outline-[var(--accent)]",
                listening
                  ? "border-[var(--danger)] text-[var(--danger)]"
                  : "border-[var(--separator)] text-[var(--foreground-secondary)]"
              )}
            >
              <MicIcon width={20} height={20} />
            </button>
            <p
              className={cn(
                "text-[13px]",
                listening
                  ? "font-medium text-[var(--danger)]"
                  : "text-[var(--foreground-secondary)]"
              )}
            >
              {listening ? "Listening…" : "Speak or type"}
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            disabled={!text.trim() || busy}
            onClick={() => read(text)}
          >
            {busy ? "Reading…" : "Read it"}
          </Button>
        </div>

        {examples && examples.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setText(example)}
                className="pressable rounded-full border border-[var(--separator)] px-3 py-1.5 text-[13px] leading-tight text-[var(--foreground-secondary)] hover:bg-[var(--surface-secondary)]"
              >
                {example}
              </button>
            ))}
          </div>
        )}

        {entries.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] leading-snug text-[var(--foreground-secondary)]">
                {idleCount > 1 ? "Check each one, then save." : "Check it, then save."}
                {engine ? ` Read by ${engine}.` : ""}
              </p>
              {idleCount > 1 && (
                <Button variant="ghost" size="sm" onClick={saveAll}>
                  Save all
                </Button>
              )}
            </div>

            {entries.map((entry) => {
              const info = describe(entry.action, currency);
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-xl border border-[var(--separator)] bg-[var(--surface-secondary)] px-4 py-3",
                    entry.status === "done" && "opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium uppercase tracking-wide text-[var(--foreground-secondary)]">
                        {info.label}
                      </p>
                      <p className="mt-0.5 text-[15px] font-medium text-[var(--foreground)]">
                        {info.primary}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-snug text-[var(--foreground-secondary)]">
                        {info.secondary}
                      </p>
                    </div>

                    {entry.status === "done" ? (
                      <span className="shrink-0 text-[13px] font-medium text-[var(--success)]">
                        Saved
                      </span>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={entry.status === "saving"}
                          onClick={() => saveOne(entry)}
                        >
                          {entry.status === "saving" ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          variant="ghost-destructive"
                          size="sm"
                          aria-label="Drop this suggestion"
                          onClick={() =>
                            setEntries((prev) => prev.filter((e) => e.id !== entry.id))
                          }
                        >
                          <CloseIcon width={16} height={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </>
  );

  if (bare) return <div className="pt-1">{content}</div>;

  return (
    <Card>
      <div className="px-5 pt-5 flex items-center gap-2">
        <SparkleIcon width={18} height={18} className="text-[var(--accent)]" />
        <h2 className="text-[17px] font-semibold tracking-apple">Ask Ledger</h2>
      </div>
      <div className="px-5 pb-5 pt-3">{content}</div>
    </Card>
  );
}
