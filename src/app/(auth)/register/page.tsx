"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  /**
   * The address is already registered, so registering again is impossible —
   * offer a fresh verification link instead of leaving them stuck here.
   */
  async function resendVerification() {
    const value = form.email.trim();
    if (!value) return;

    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "We couldn't send that. Try again.");
        return;
      }
      if (data.alreadyVerified) {
        setError("");
        setShowResend(false);
        toast.success("That email is already verified — you can sign in");
        router.push("/login");
        return;
      }
      toast.success("New link sent — check your inbox");
      router.push("/verify-email?sent=1&email=" + encodeURIComponent(value));
    } catch {
      setError("We couldn't send that. Try again.");
    } finally {
      setResending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setShowResend(false);

    if (form.password !== form.confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Use at least 6 characters for your password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setShowResend(res.status === 409);
        setLoading(false);
        return;
      }

      toast.success("Account created — check your email to verify");
      router.push("/verify-email?sent=1&email=" + encodeURIComponent(form.email));
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-apple-display">Create your account</h1>
      <p className="mt-1.5 text-[15px] text-[var(--foreground-secondary)]">
        Start tracking in under a minute.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-xl px-3.5 py-3 text-[14px] text-[var(--danger)]"
            style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, transparent)" }}
          >
            {error}
          </div>
        )}

        {showResend && (
          <div
            className="rounded-xl px-3.5 py-3"
            style={{ backgroundColor: "var(--surface-secondary)" }}
          >
            <p className="text-[13.5px] leading-relaxed text-[var(--foreground-secondary)]">
              Already signed up with this address? You don&apos;t need to register
              again — we can email you a fresh verification link.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={resendVerification}
              disabled={resending}
            >
              {resending ? "Sending…" : "Send a new verification link"}
            </Button>
          </div>
        )}

        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            required
            placeholder="Your name"
            value={form.name}
            onChange={update("name")}
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={update("email")}
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            placeholder="At least 6 characters"
            value={form.password}
            onChange={update("password")}
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            required
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
          />
        </div>

        <p className="text-[12.5px] leading-relaxed text-[var(--foreground-secondary)]">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="text-[var(--accent)] hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[var(--accent)] hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[15px] text-[var(--foreground-secondary)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
