"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardList, CardRow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "sonner";
import { enablePush, disablePush } from "@/lib/push-client";

export interface ProfileUser {
  name: string;
  email: string;
  emailVerified: string | null;
  currency: string;
  notifications: boolean;
  remindersEmail: boolean;
  remindersPush: boolean;
}

/** iOS-style switch, shared by the preference rows. */
function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="relative w-[51px] h-[31px] rounded-full transition-colors shrink-0 disabled:opacity-50"
      style={{ background: checked ? "var(--success)" : "var(--surface-secondary)" }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-[27px] h-[27px] rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(20px)" : "none" }}
        aria-hidden="true"
      />
    </button>
  );
}

export function ProfileView({ user }: { user: ProfileUser }) {
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [notifications, setNotifications] = useState(user.notifications);
  const [remindersEmail, setRemindersEmail] = useState(user.remindersEmail);
  const [remindersPush, setRemindersPush] = useState(user.remindersPush);
  const [pushBusy, setPushBusy] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdError, setPwdError] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function saveName() {
    if (name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setSavingName(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      toast.success("Profile updated");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Couldn't save changes");
    }
    setSavingName(false);
  }

  async function toggleNotifications() {
    const next = !notifications;
    setNotifications(next);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifications: next }),
    });
    if (res.ok) {
      toast.success(next ? "Email updates on" : "Email updates off");
    } else {
      setNotifications(!next);
      toast.error("Couldn't save that setting");
    }
  }

  async function saveReminderPrefs(next: { email?: boolean; push?: boolean }) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminders: next }),
    });
    return res.ok;
  }

  async function toggleReminderEmail() {
    const next = !remindersEmail;
    setRemindersEmail(next);
    const ok = await saveReminderPrefs({ email: next });
    if (!ok) {
      setRemindersEmail(!next);
      toast.error("Couldn't save that setting");
      return;
    }
    toast.success(next ? "Email reminders on" : "Email reminders off");
  }

  async function toggleReminderPush() {
    if (pushBusy) return;

    // Turning off: unsubscribe in the browser, then persist.
    if (remindersPush) {
      setPushBusy(true);
      try {
        await disablePush();
        const ok = await saveReminderPrefs({ push: false });
        if (!ok) {
          toast.error("Couldn't save that setting");
          return;
        }
        setRemindersPush(false);
        toast.success("Browser notifications off");
      } finally {
        setPushBusy(false);
      }
      return;
    }

    // Turning on: request permission and subscribe.
    setPushBusy(true);
    try {
      const result = await enablePush();
      if (!result.ok) {
        toast.error(result.error || "Couldn't enable notifications");
        return;
      }
      const ok = await saveReminderPrefs({ push: true });
      if (!ok) {
        toast.error("Couldn't save that setting");
        return;
      }
      setRemindersPush(true);
      toast.success("Browser notifications on");
    } catch {
      toast.error("Couldn't enable notifications");
    } finally {
      setPushBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    if (pwd.next !== pwd.confirm) {
      setPwdError("Those passwords don't match.");
      return;
    }
    setPwdBusy(true);
    const res = await fetch("/api/profile/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.next }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setPwdError(d.error || "Something went wrong.");
      setPwdBusy(false);
      return;
    }
    toast.success("Password changed");
    setPwdBusy(false);
    setPwdOpen(false);
    setPwd({ current: "", next: "", confirm: "" });
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError("");
    setDeleteBusy(true);
    const res = await fetch("/api/profile", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePw }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setDeleteError(d.error || "Something went wrong.");
      setDeleteBusy(false);
      return;
    }
    toast.success("Your account has been deleted");
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

  const verified = Boolean(user.emailVerified);

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your account and preferences" />

      {/* Identity card */}
      <div className="rounded-3xl border overflow-hidden mb-4" style={{ borderColor: "var(--separator)", background: "var(--surface)" }}>
        <div className="p-6 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-[24px] font-semibold text-white shrink-0"
            style={{ background: "var(--accent)" }}
            aria-hidden="true"
          >
            {user.name?.[0]?.toUpperCase() || "·"}
          </div>
          <div className="min-w-0">
            <p className="text-[20px] font-semibold tracking-apple truncate">{user.name}</p>
            <p className="text-[15px] text-[var(--foreground-secondary)] truncate">{user.email}</p>
            <p
              className="mt-1 text-[13px] font-medium"
              style={{ color: verified ? "var(--success)" : "var(--warning)" }}
            >
              {verified ? "Email verified" : "Email not verified yet"}
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5 pt-4 space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <div className="flex gap-2">
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              <Button
                onClick={saveName}
                disabled={savingName || name.trim() === user.name}
                className="shrink-0"
              >
                {savingName ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
          <div>
            <Label>Appearance</Label>
            <div
              className="flex items-center justify-between rounded-xl px-3.5 h-11"
              style={{ background: "var(--surface-secondary)" }}
            >
              <span className="text-[15px]">Theme</span>
              <div className="flex items-center gap-1">
                <span className="text-[13px] text-[var(--foreground-secondary)] mr-1">
                  Toggle light or dark
                </span>
                <ThemeToggle className="w-9 h-9 rounded-full flex items-center justify-center pressable" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <div className="mt-3">
          <CardList className="border-0 rounded-none">
            <CardRow className="justify-between">
              <div>
                <p className="text-[16px]">Change password</p>
                <p className="text-[13px] text-[var(--foreground-secondary)]">
                  Use at least 6 characters
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setPwdOpen(true)}>
                Change
              </Button>
            </CardRow>
            <CardRow className="justify-between">
              <div className="pr-3">
                <p className="text-[16px]">Email updates</p>
                <p className="text-[13px] text-[var(--foreground-secondary)]">
                  Occasional product news
                </p>
              </div>
              <Switch
                checked={notifications}
                onChange={toggleNotifications}
                label="Email updates"
              />
            </CardRow>
          </CardList>
        </div>
      </Card>

      {/* Reminders */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Reminders</CardTitle>
        </CardHeader>
        <div className="mt-3">
          <CardList className="border-0 rounded-none">
            <CardRow className="justify-between">
              <div className="pr-3">
                <p className="text-[16px]">Email reminders</p>
                <p className="text-[13px] text-[var(--foreground-secondary)]">
                  A daily digest when debts, bills or budgets are due
                </p>
              </div>
              <Switch
                checked={remindersEmail}
                onChange={toggleReminderEmail}
                label="Email reminders"
              />
            </CardRow>
            <CardRow className="justify-between">
              <div className="pr-3">
                <p className="text-[16px]">Browser notifications</p>
                <p className="text-[13px] text-[var(--foreground-secondary)]">
                  Alerts even when Ledger isn&apos;t open
                </p>
              </div>
              <Switch
                checked={remindersPush}
                onChange={toggleReminderPush}
                label="Browser notifications"
                disabled={pushBusy}
              />
            </CardRow>
          </CardList>
        </div>
      </Card>

      {/* Legal */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Policies</CardTitle>
        </CardHeader>
        <div className="mt-3">
          <CardList className="border-0 rounded-none">
            <CardRow className="justify-between">
              <p className="text-[16px]">Privacy Policy</p>
              <Link href="/privacy" className="text-[15px] text-[var(--accent)]">
                Read
              </Link>
            </CardRow>
            <CardRow className="justify-between">
              <p className="text-[16px]">Terms of Service</p>
              <Link href="/terms" className="text-[15px] text-[var(--accent)]">
                Read
              </Link>
            </CardRow>
            <CardRow className="justify-between">
              <p className="text-[16px]">Cookie Policy</p>
              <Link href="/cookies" className="text-[15px] text-[var(--accent)]">
                Read
              </Link>
            </CardRow>
          </CardList>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5 pt-2">
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={async () => {
              await signOut({ redirect: false });
              toast.success("Signed out");
              router.push("/login");
            }}
          >
            Sign out
          </Button>
        </div>
      </Card>

      <Card style={{ borderColor: "color-mix(in srgb, var(--danger) 45%, transparent)" }}>
        <CardHeader>
          <CardTitle className="text-[var(--danger)]">Delete account</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5 pt-2">
          <p className="text-[14px] leading-relaxed text-[var(--foreground-secondary)]">
            This permanently removes your account and every transaction, budget,
            goal and note. It can&apos;t be undone.
          </p>
          <Button
            variant="ghost-destructive"
            size="lg"
            className="w-full mt-4"
            onClick={() => setDeleteOpen(true)}
          >
            Delete my account
          </Button>
        </div>
      </Card>

      {/* Change password sheet */}
      <Sheet open={pwdOpen} onClose={() => setPwdOpen(false)} title="Change password">
        <form onSubmit={changePassword} className="space-y-4">
          {pwdError && (
            <div
              role="alert"
              className="rounded-xl px-3.5 py-3 text-[14px] text-[var(--danger)]"
              style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, transparent)" }}
            >
              {pwdError}
            </div>
          )}
          <div>
            <Label htmlFor="cur">Current password</Label>
            <PasswordInput
              id="cur"
              autoComplete="current-password"
              required
              value={pwd.current}
              onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="new">New password</Label>
            <PasswordInput
              id="new"
              autoComplete="new-password"
              required
              placeholder="At least 6 characters"
              value={pwd.next}
              onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm new password</Label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              required
              value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setPwdOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={pwdBusy}>
              {pwdBusy ? "Updating…" : "Update"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Delete sheet */}
      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account?">
        <p className="text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
          Enter your password to confirm. Everything will be removed immediately.
        </p>
        <form onSubmit={deleteAccount} className="mt-5 space-y-4">
          {deleteError && (
            <div
              role="alert"
              className="rounded-xl px-3.5 py-3 text-[14px] text-[var(--danger)]"
              style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, transparent)" }}
            >
              {deleteError}
            </div>
          )}
          <PasswordInput
            autoComplete="current-password"
            required
            placeholder="Your password"
            value={deletePw}
            onChange={(e) => setDeletePw(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setDeleteOpen(false)}
            >
              Keep my account
            </Button>
            <Button type="submit" variant="destructive" size="lg" className="flex-1" disabled={deleteBusy}>
              {deleteBusy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
