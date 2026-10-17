import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Ledger uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated="17 October 2026"
      intro="We keep cookies to a strict minimum. Ledger has no advertising trackers and no cross-site profiling. This page explains the small number of cookies and local storage entries we do use, and why."
    >
      <LegalSection heading="1. What cookies are">
        <p>
          Cookies are small text files a website stores on your device. Similar
          technologies include <strong>local storage</strong>, which keeps data in
          your browser without sending it back to us on every request. We use
          both, and we use them only where they are necessary for the app to work
          or to remember a choice you made.
        </p>
      </LegalSection>

      <LegalSection heading="2. The cookies we use">
        <p>
          <strong>Session cookie.</strong> Keeps you signed in as you move around
          the app. Without it you would have to re-enter your password on every
          page. This is strictly necessary and is set only after you sign in. It
          expires when you sign out or your session ends.
        </p>
        <p>
          <strong>Security cookie.</strong> Protects the sign-in process against
          forgery (a &quot;same-site&quot; CSRF token). Strictly necessary.
        </p>
        <p>
          <strong>Appearance preference.</strong> Stored in your browser&apos;s local
          storage, this remembers whether you chose the light or dark theme so the
          app looks right when you return. It never leaves your device.
        </p>
        <p>
          <strong>Cookie consent choice.</strong> Also stored in local storage,
          this records that you&apos;ve seen and answered this notice so we don&apos;t show
          it again. It never leaves your device.
        </p>
      </LegalSection>

      <LegalSection heading="3. What we do not use">
        <p>We deliberately do not use:</p>
        <ul>
          <li>advertising or retargeting cookies;</li>
          <li>third-party analytics or social media pixels;</li>
          <li>cross-site tracking of your activity on other websites;</li>
          <li>cookies that profile you for commercial purposes.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Managing cookies">
        <p>
          Because the only cookies we set are strictly necessary for the app to
          function, blocking them in your browser will prevent you from staying
          signed in. You can always sign out to clear the session cookie.
        </p>
        <p>
          You can clear local storage entries (appearance and consent) at any
          time through your browser&apos;s settings. Doing so will reset your theme to
          your system default and show the consent notice once more.
        </p>
        <p>
          Every major browser lets you block or delete cookies — check your
          browser&apos;s help pages for step-by-step instructions.
        </p>
      </LegalSection>

      <LegalSection heading="5. Legal basis">
        <p>
          Under Cameroonian law (Law No. 2010/012 on Cybersecurity and
          Cybercriminality) and, where they apply to you, the GDPR and the
          ePrivacy rules, strictly necessary cookies are set on the basis of your
          request to use the service and do not require separate consent. If we
          ever add optional cookies, we will ask for your consent first and update
          this page.
        </p>
      </LegalSection>

      <LegalSection heading="6. Changes and contact">
        <p>
          If we change the cookies we use, we will update this page and the date
          above. Questions:{" "}
          <a href="mailto:mishaelsema@gmail.com">mishaelsema@gmail.com</a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
