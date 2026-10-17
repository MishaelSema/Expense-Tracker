import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";
import { CookieConsent } from "@/components/cookie-consent";
import { ServiceWorkerRegistrar } from "@/components/notifications/service-worker-registrar";
import { unreadReminderCount } from "@/lib/reminders";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const reminderCount = await unreadReminderCount(String(user._id));

  return (
    <>
      <AppShell userName={user.name} reminderCount={reminderCount}>
        {children}
      </AppShell>
      <CookieConsent />
      <ServiceWorkerRegistrar />
    </>
  );
}
