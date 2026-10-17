"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      setSent(true);
      toast.success("Check your email for a reset link");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div>
        <h1 className="text-[28px] font-semibold tracking-apple-display">Check your email</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
          If an account exists for <span className="text-[var(--foreground)]">{email}</span>,
          we&apos;ve sent a link to reset your password. It expires in one hour.
        </p>
        <div className="mt-6 space-y-1">
          <button
            onClick={() => setSent(false)}
            className="text-[15px] text-[var(--accent)] hover:underline"
          >
            Use a different email
          </button>
          <div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-[15px] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
            >
              <ArrowLeftIcon width={17} height={17} />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-apple-display">Reset your password</h1>
      <p className="mt-1.5 text-[15px] text-[var(--foreground-secondary)]">
        Enter your email and we&apos;ll send you a link.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[15px] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
        >
          <ArrowLeftIcon width={17} height={17} />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
