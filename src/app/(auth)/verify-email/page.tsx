"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MailIcon } from "@/components/ui/icons";
import { toast } from "sonner";

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const sent = params.get("sent");
  const email = params.get("email");

  const [status, setStatus] = useState<"idle" | "verifying" | "done" | "error">(
    token ? "verifying" : "idle"
  );
  const [message, setMessage] = useState("");

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
        setStatus("done");
        toast.success("Email verified");
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

  if (status === "done") {
    return (
      <div>
        <h1 className="text-[28px] font-semibold tracking-apple-display">Email verified</h1>
        <p className="mt-2 text-[15px] text-[var(--foreground-secondary)]">
          Your account is ready. Sign in to get started.
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
        <Button size="lg" className="w-full mt-8" onClick={() => router.push("/login")}>
          Back to sign in
        </Button>
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
        {sent && email ? (
          <>
            We sent a verification link to{" "}
            <span className="text-[var(--foreground)]">{email}</span>. Open it to
            activate your account.
          </>
        ) : (
          "Open the verification link we emailed you to activate your account."
        )}
      </p>
      <p className="mt-6 text-[14px] text-[var(--foreground-secondary)]">
        Wrong address or nothing arrived?{" "}
        <Link href="/register" className="text-[var(--accent)] hover:underline">
          Create the account again
        </Link>
        .
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
