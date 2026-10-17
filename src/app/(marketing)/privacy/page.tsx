import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Ledger collects, uses and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="17 October 2026"
      intro="This policy explains what personal data Ledger collects, why we collect it, how we keep it safe, and the rights you have over it. It is written to respect Cameroon's data protection framework and, where they apply, international standards such as the EU General Data Protection Regulation (GDPR)."
    >
      <LegalSection heading="1. Who we are">
        <p>
          Ledger is a personal finance application for tracking income and
          expenses. For the purposes of data protection law, Ledger is the{" "}
          <strong>data controller</strong> of the personal data described in this
          policy.
        </p>
        <p>
          Contact for privacy matters:{" "}
          <a href="mailto:privacy@ledger.app">privacy@ledger.app</a>
        </p>
      </LegalSection>

      <LegalSection heading="2. The law that applies">
        <p>
          Our primary legal framework is Cameroonian law, in particular:
        </p>
        <ul>
          <li>
            Law No. 2010/012 of 21 December 2010 relating to Cybersecurity and
            Cybercriminality in Cameroon, which governs the protection of
            electronic data and the security of information systems;
          </li>
          <li>
            Law No. 2010/013 of 21 December 2010 governing Electronic
            Communications in Cameroon;
          </li>
          <li>
            The African Union Convention on Cyber Security and Personal Data
            Protection (the Malabo Convention), to which Cameroon is a party.
          </li>
        </ul>
        <p>
          Where you are located in the European Union or the United Kingdom, the
          GDPR (or UK GDPR) also applies to our processing of your data, and the
          legal bases below apply to you. Where you are a California resident, the
          California Consumer Privacy Act, as amended by the CPRA (CCPA/CPRA),
          gives you the additional rights described in section 9.
        </p>
        <p>
          This policy is a plain-language summary and is not a substitute for the
          full texts of those laws.
        </p>
      </LegalSection>

      <LegalSection heading="3. What data we collect">
        <p>
          <strong>Account data.</strong> Your name, email address, password
          (stored only as a salted, irreversible hash), email verification status,
          and your display preferences such as currency and theme.
        </p>
        <p>
          <strong>Financial data you enter.</strong> Transactions (amounts,
          categories, descriptions, dates), budgets, savings goals, debts,
          wishlist items, notes and tasks. This is data you choose to record in
          the app. We do not connect to your bank or mobile money account and we
          do not import data from financial institutions.
        </p>
        <p>
          <strong>Technical data.</strong> We may record limited operational data
          such as the time of requests and error logs, for the sole purpose of
          keeping the service reliable and secure. We do not use advertising or
          cross-site tracking technologies.
        </p>
      </LegalSection>

      <LegalSection heading="4. How and why we use your data">
        <p>We process your data to:</p>
        <ul>
          <li>create and secure your account, and send verification and reset emails;</li>
          <li>provide the app&apos;s features, including showing your balances, budgets and insights;</li>
          <li>remember your preferences and present them consistently across devices;</li>
          <li>respond to support requests and keep the service running reliably;</li>
          <li>detect and prevent abuse, fraud and unauthorised access;</li>
          <li>meet our legal obligations and defend legal claims.</li>
        </ul>
        <p>
          The legal bases we rely on are: performance of a contract (providing the
          service to you), legitimate interests (security, reliability and
          product improvement, balanced against your rights), consent (for
          optional product emails), and compliance with legal obligations.
        </p>
      </LegalSection>

      <LegalSection heading="5. Who we share data with">
        <p>We do not sell your data, and we never will.</p>
        <p>We share data only with the service providers that run Ledger:</p>
        <ul>
          <li>
            <strong>MongoDB Atlas</strong>, which stores the database, hosted in
            secure cloud infrastructure;
          </li>
          <li>
            <strong>Vercel</strong>, which hosts the application and delivers it
            over HTTPS;
          </li>
          <li>
            our <strong>email provider</strong>, which sends verification and
            password reset emails;
          </li>
        </ul>
        <p>
          Each of these providers acts as a data processor under a contract that
          requires them to protect your data and use it only on our instructions.
          We do not disclose your data to any other third party except where
          required by law or a valid order of a competent Cameroonian authority.
        </p>
      </LegalSection>

      <LegalSection heading="6. Where your data is stored">
        <p>
          Your data is stored on cloud infrastructure operated by our providers,
          which may be located outside Cameroon, including in the European Union
          and the United States. Where data is transferred internationally, we
          rely on our processors&apos; contractual safeguards.
        </p>
        <p>
          If you are in the EU or UK, transfers outside the EEA or UK are made
          under the EU Standard Contractual Clauses (and UK equivalents), together
          with appropriate technical and organisational measures.
        </p>
      </LegalSection>

      <LegalSection heading="7. How long we keep data">
        <ul>
          <li>
            Your account and the data in it are kept for as long as your account
            is active.
          </li>
          <li>
            When you delete your account (from the Profile screen), we delete
            your account record and all associated transactions, budgets, goals,
            debts, wishlist items, notes and tasks, and this happens immediately.
          </li>
          <li>
            Limited server logs are kept for a short period (no more than 90
            days) for security and debugging, then deleted or aggregated.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="8. How we protect your data">
        <ul>
          <li>All traffic is encrypted in transit using HTTPS/TLS.</li>
          <li>Passwords are stored only as salted bcrypt hashes and are never readable by us.</li>
          <li>Access to production systems is restricted and authenticated.</li>
          <li>Access tokens and reset links expire after a short period.</li>
          <li>
            Database access is scoped so that each account can only reach its own
            records.
          </li>
        </ul>
        <p>
          No system is perfectly secure. If we become aware of a breach that
          affects your personal data, we will notify you and the relevant
          authority as required by Cameroonian law and, where applicable, the GDPR.
        </p>
      </LegalSection>

      <LegalSection heading="9. Your rights">
        <p>Depending on where you live, you may have the right to:</p>
        <ul>
          <li>access the personal data we hold about you;</li>
          <li>correct data that is inaccurate or incomplete;</li>
          <li>delete your account and your data (available directly in the app, under Profile);</li>
          <li>export a copy of your data;</li>
          <li>object to, or restrict, certain processing;</li>
          <li>withdraw consent where processing is based on consent;</li>
          <li>
            opt out of the sale or sharing of personal information (we do not sell
            or share data, so this right is not engaged).
          </li>
        </ul>
        <p>
          To exercise any right, email{" "}
          <a href="mailto:privacy@ledger.app">privacy@ledger.app</a>. We respond
          within 30 days, and we will not charge you for reasonable requests. You
          may also complain to your local supervisory authority, or, in Cameroon,
          to the competent authority responsible for data protection and
          cybersecurity.
        </p>
      </LegalSection>

      <LegalSection heading="10. Children">
        <p>
          Ledger is not directed at children under 16 (or under 13, whichever is
          higher in your country). If you believe a child has provided us with
          personal data, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection heading="11. Cookies">
        <p>
          We use a small number of cookies and similar technologies that are
          strictly necessary to run the app — mainly to keep you signed in and to
          remember your appearance preference. See our{" "}
          <a href="/cookies">Cookie Policy</a> for details.
        </p>
      </LegalSection>

      <LegalSection heading="12. Changes to this policy">
        <p>
          We may update this policy to reflect changes in our practices or the
          law. If we make material changes, we will update the date at the top of
          this page and, where appropriate, notify you in the app or by email.
        </p>
      </LegalSection>

      <LegalSection heading="13. Contact">
        <p>
          Questions about this policy or your data:{" "}
          <a href="mailto:privacy@ledger.app">privacy@ledger.app</a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
