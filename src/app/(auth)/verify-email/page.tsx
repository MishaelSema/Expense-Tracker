"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MailIcon } from "@/components/ui/icons";
import { toast } from "sonner";

type Status = "idle" | "verifying" | "done" | "already" | "error";

/**
 * Inline "send me a fresh link" form. Verification links are one-time, so a
 * refresh, a double-click or a mail scanner can burn a link before the user
 * ever sees it — this is the way back out instead of a dead end.
 */
function ResendForm({
  initialEmail,
  onSent,
}: {
  initialEmail: string;
  onSent: (email: string, alreadyVerified: boolean) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "We couldn't send that. Try again.");
        return;
      }
      if (data.alreadyVerified) {
        toast.success("That email is already verified — just sign in.");
        onSent(value, true);
        return;
      }
      toast.success("New link sent — check your inbox");
      onSent(value, false);
    } catch {
      toast.error("We couldn't send that. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="resend-email">Email</Label>
        <Input
          id="resend-email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Sending…" : "Send a new link"}
      </Button>
    </form>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const emailParam = params.get("email") || "";

  const [status, setStatus] = useState<Status>(token ? "verifying" : "idle");
  const [message, setMessage] = useState("");
  const [already, setAlready] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "We couldn't verify this link.");
          return;
        }
        setAlready(Boolean(data.already));
        setStatus("done");
        toast.success(data.already ? "Email already verified" : "Email verified");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("We couldn't verify this link.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function afterResend(email: string, verified: boolean) {
    if (verified) {
      router.push("/login");
      return;
    }
    setStatus("idle");
    setNotice(email);
  }

  if (status === "verifying") {
    return (
      <div>
        <h1 className="text-[28px] font-semibold tracking-apple-display">
          Verifying your email
        </h1>
        <p className="mt-2 text-[15px] text-[var(--foreground-secondary)]">
          One moment…
        </p>
      </div>
    );
  }

  if (status === "done" || status === "already") {
    return (
      <div>
        <h1 className="text-[28px] font-semibold tracking-apple-display">
          {already ? "Email already verified" : "Email verified"}
        </h1>
        <p className="mt-2 text-[15px] text-[var(--foreground-secondary)]">
          {already
            ? "This address was already confirmed — nothing more to do here."
            : "Your account is ready. Sign in to get started."}
        </p>
        <Button size="lg" className="w-full mt-8" onClick={() => router.push("/login")}>
          Go to sign in
        </Button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div>
        <h1 className="text-[28px] font-semibold tracking-apple-display">
          Link didn&apos;t work
        </h1>
        <p className="mt-2 text-[15px] text-[var(--foreground-secondary)]">{message}</p>

        <div className="mt-7">
          <p className="mb-3 text-[14px] text-[var(--foreground-secondary)]">
            Enter your email and we&apos;ll send a fresh one.
          </p>
          <ResendForm initialEmail={emailParam} onSent={afterResend} />
        </div>

        <p className="mt-6 text-center text-[15px]">
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  // "sent" state: instruct the user to open their inbox
  return (
    <div>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--accent)]"
        style={{ backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
      >
        <MailIcon width={22} height={22} />
      </div>
      <h1 className="mt-5 text-[28px] font-semibold tracking-apple-display">
        Check your inbox
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
        {notice ? (
          <>
            We sent a new link to{" "}
            <span className="text-[var(--foreground)]">{notice}</span>. Open it to
            activate your account.
          </>
        ) : emailParam ? (
          <>
            We sent a verification link to{" "}
            <span className="text-[var(--foreground)]">{emailParam}</span>. Open it to
            activate your account.
          </>
        ) : (
          "Open the verification link we emailed you to activate your account."
        )}
      </p>

      <div className="mt-7 border-t border-[var(--separator)] pt-6">
        <p className="mb-3 text-[14px] text-[var(--foreground-secondary)]">
          Nothing arrived, or the link stopped working?
        </p>
        <ResendForm initialEmail={emailParam} onSent={afterResend} />
      </div>

      <p className="mt-6 text-center text-[15px]">
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
