import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardList, CardRow } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Help centre",
  description: "Answers to common questions and how to reach us.",
};

const faqs = [
  {
    q: "How do I add a transaction?",
    a: "Open the Overview or Activity screen and tap Add. Choose whether it's an expense or income, enter the amount, a short description, a category and the date. It shows up in your totals right away.",
  },
  {
    q: "Can Ledger connect to my bank or MoMo?",
    a: "No. Ledger never connects to your bank or mobile money account. Everything is recorded by you, which keeps you in control and your accounts untouched.",
  },
  {
    q: "I forgot my password. What now?",
    a: "On the sign-in screen tap Forgot password and enter your email. We'll send a link to set a new one. The link expires after one hour for your security.",
  },
  {
    q: "I didn't get the verification email.",
    a: "Check your spam folder first. If it's not there, the address may have been entered with a typo — create the account again with the correct email, or contact support and we'll help.",
  },
  {
    q: "How do I delete my account and my data?",
    a: "Go to Profile, then Delete account and confirm with your password. Your account and every transaction, budget, goal and note are removed immediately and permanently.",
  },
  {
    q: "Does Ledger give financial advice?",
    a: "No. Ledger is a record-keeping and planning tool. The figures it shows are calculations based on what you enter — they aren't financial, tax or investment advice.",
  },
  {
    q: "Is my data safe and private?",
    a: "Yes. Your data is encrypted in transit, passwords are stored only as salted hashes, and we never sell your data or show ads. See the Privacy Policy for the full detail.",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-[680px] px-5 py-14 sm:py-20">
      <h1 className="text-[34px] sm:text-[40px] font-semibold tracking-apple-display leading-tight">
        How can we help?
      </h1>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--foreground-secondary)]">
        Answers to the questions we hear most. If yours isn&apos;t here, we&apos;d
        like to hear from you.
      </p>

      <div className="mt-10 space-y-3">
        {faqs.map((f) => (
          <Card key={f.q}>
            <div className="p-5">
              <p className="text-[16px] font-semibold tracking-apple">{f.q}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
                {f.a}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Still stuck?</CardTitle>
        </CardHeader>
        <div className="mt-3">
          <CardList className="border-0 rounded-none">
            <CardRow className="justify-between">
              <div>
                <p className="text-[16px]">Email support</p>
                <p className="text-[13px] text-[var(--foreground-secondary)]">
                  We usually reply within a day
                </p>
              </div>
              <a
                href="mailto:support@ledger.app"
                className="text-[15px] text-[var(--accent)] pressable"
              >
                support@ledger.app
              </a>
            </CardRow>
            <CardRow className="justify-between">
              <div>
                <p className="text-[16px]">Privacy requests</p>
                <p className="text-[13px] text-[var(--foreground-secondary)]">
                  Access, export or deletion
                </p>
              </div>
              <a
                href="mailto:privacy@ledger.app"
                className="text-[15px] text-[var(--accent)] pressable"
              >
                privacy@ledger.app
              </a>
            </CardRow>
          </CardList>
        </div>
      </Card>

      <p className="mt-8 text-[14px] text-[var(--foreground-secondary)]">
        Prefer the small print?{" "}
        <Link href="/terms" className="text-[var(--accent)] hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-[var(--accent)] hover:underline">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
