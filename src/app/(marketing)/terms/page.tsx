import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Ledger.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="17 October 2026"
      intro="These terms set out the agreement between you and Ledger when you use the app. Please read them carefully. By creating an account you accept them."
    >
      <LegalSection heading="1. About Ledger">
        <p>
          Ledger is a personal finance tool that lets you record and review your
          own income and expenses. Ledger is operated from Cameroon and these
          terms are governed by Cameroonian law.
        </p>
        <p>
          These terms are a supplement to, not a replacement for, our{" "}
          <a href="/privacy">Privacy Policy</a>, which explains how we handle your
          personal data.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your account">
        <ul>
          <li>
            You must be at least 16 years old, or the age of digital consent in
            your country, whichever is higher.
          </li>
          <li>
            You must provide accurate information and keep your password
            confidential. You are responsible for activity under your account.
          </li>
          <li>
            Tell us promptly at{" "}
            <a href="mailto:support@ledger.app">support@ledger.app</a> if you
            believe your account has been accessed without your permission.
          </li>
          <li>One person may not maintain multiple accounts to evade limits.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>use the app for any unlawful, fraudulent or deceptive purpose;</li>
          <li>
            attempt to gain unauthorised access to our systems, other users&apos;
            accounts, or the underlying databases;
          </li>
          <li>probe, scan or test the vulnerability of the service;</li>
          <li>interfere with or disrupt the app or the servers it runs on;</li>
          <li>use automated means to access the app without our written consent;</li>
          <li>upload malicious code or use the app to transmit spam.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Your content and your data">
        <p>
          Everything you record in Ledger — transactions, budgets, notes, goals
          and the like — belongs to you. You grant us only the limited rights
          needed to store that content and make the app work for you.
        </p>
        <p>
          You are responsible for the accuracy of what you enter. You can delete
          your content and your whole account at any time from the Profile screen.
        </p>
      </LegalSection>

      <LegalSection heading="5. Important financial disclaimer">
        <p>
          Ledger is a record-keeping and planning tool. It is{" "}
          <strong>not</strong> a bank, a licensed financial adviser, a payment
          service or an investment product.
        </p>
        <ul>
          <li>
            We do not hold your money and we do not have access to your bank or
            mobile money accounts.
          </li>
          <li>
            Any figures, averages, budgets or insights shown in the app are
            calculations based on what you entered. They are informational only
            and are not financial, tax, accounting or investment advice.
          </li>
          <li>
            You are responsible for your own financial decisions. If you need
            advice, speak to a qualified professional.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Availability">
        <p>
          We work hard to keep Ledger reliable, but we do not promise it will be
          uninterrupted or error-free. We may suspend or change the service from
          time to time, including for maintenance. We will try to give reasonable
          notice of planned downtime.
        </p>
        <p>
          The app is provided on an &quot;as is&quot; and &quot;as available&quot; basis, to the
          extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection heading="7. Limitation of liability">
        <p>
          To the maximum extent permitted by Cameroonian law and the laws that
          apply to you:
        </p>
        <ul>
          <li>
            we are not liable for indirect, incidental, special, consequential or
            punitive damages, or for loss of profits, data or goodwill;
          </li>
          <li>
            our total liability for any claim arising out of the app is limited
            to the amount you paid us, if any, in the twelve months before the
            claim arose (which, for the free service, is zero);
          </li>
          <li>
            nothing in these terms limits liability that cannot be limited by law,
            including liability for fraud or for death or personal injury caused
            by negligence.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="8. Ending your access">
        <p>
          You can stop using Ledger at any time and delete your account from the
          Profile screen, which removes your data.
        </p>
        <p>
          We may suspend or terminate your access if you break these terms, if we
          are required to by law, or if we discontinue the service. Where it is
          reasonable and lawful, we will give you notice and a chance to export
          your data first.
        </p>
      </LegalSection>

      <LegalSection heading="9. Intellectual property">
        <p>
          Ledger — the app, its design, code, name and logo — belongs to us and is
          protected by intellectual property laws. You may not copy, modify,
          distribute or reverse engineer any part of it without our written
          permission, except where the law allows it.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to these terms">
        <p>
          We may update these terms. If we make material changes, we will notify
          you in the app or by email before they take effect. Continuing to use
          Ledger after that means you accept the updated terms. If you do not
          agree, stop using the app and delete your account.
        </p>
      </LegalSection>

      <LegalSection heading="11. Governing law and disputes">
        <p>
          These terms are governed by the laws of the Republic of Cameroon, and
          the courts of Cameroon have jurisdiction over any dispute, subject to
          any mandatory consumer protections that apply where you live.
        </p>
        <p>
          Before starting legal proceedings, please contact us at{" "}
          <a href="mailto:support@ledger.app">support@ledger.app</a> — most
          issues can be resolved quickly and informally.
        </p>
      </LegalSection>

      <LegalSection heading="12. Contact">
        <p>
          Questions about these terms:{" "}
          <a href="mailto:support@ledger.app">support@ledger.app</a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
