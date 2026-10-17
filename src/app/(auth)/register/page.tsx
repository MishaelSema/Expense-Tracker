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

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

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
