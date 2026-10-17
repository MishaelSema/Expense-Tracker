import type { Metadata } from "next";
import Link from "next/link";
import { AppPreview } from "@/components/marketing/app-preview";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const steps = [
  {
    title: "Add what comes in",
    body: "Log your allowance, part-time pay or any income in a couple of taps. No spreadsheets, no formulas.",
  },
  {
    title: "Track what goes out",
    body: "Record spending as it happens, grouped into categories that actually make sense for student life.",
  },
  {
    title: "See where you stand",
    body: "A single clear number, plus the trends behind it — so next month is calmer than this one.",
  },
];

const features = [
  {
    title: "Built for FCFA",
    body: "Amounts, categories and habits tuned to how money moves in Cameroon — from MoMo to market runs.",
  },
  {
    title: "Budgets that hold",
    body: "Set a ceiling per category and watch the bar fill. You'll know before you overspend, not after.",
  },
  {
    title: "Goals worth keeping",
    body: "Save toward a laptop, a trip or next semester's fees, and watch the progress build.",
  },
  {
    title: "Debts kept straight",
    body: "Remember who owes you, and what you owe back, without the awkward guesswork.",
  },
  {
    title: "A wishlist, with a plan",
    body: "Save the things you want, price them, and decide when it's actually the right time to buy.",
  },
  {
    title: "Private by default",
    body: "Your data is yours. No ads, no resale, and no one reading your spending over your shoulder.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-[1024px] px-5 pt-16 sm:pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div>
            <h1 className="text-[clamp(2.6rem,7vw,4.2rem)] font-semibold tracking-apple-display leading-[1.04]">
              Money, finally
              <br />
              under control.
            </h1>
            <p className="mt-5 text-[19px] sm:text-[21px] leading-relaxed text-[var(--foreground-secondary)] max-w-[46ch]">
              A calm place to track income and spending, plan your budgets, and
              reach the goals that matter — built for students in Cameroon.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/register"
                className="h-12 px-7 rounded-full bg-[var(--accent)] text-white text-[17px] font-medium flex items-center justify-center pressable"
              >
                Get started free
              </Link>
              <Link
                href="/login"
                className="h-12 px-7 rounded-full border border-[var(--separator)] text-[17px] font-medium flex items-center justify-center pressable"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-[var(--foreground-secondary)]">
              No card, no subscription. Works on the phone you already have.
            </p>
          </div>
          <Reveal delay={0.05}>
            <AppPreview />
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-[var(--separator)]">
        <div className="mx-auto max-w-[1024px] px-5 py-20">
          <h2 className="text-[clamp(1.9rem,4.5vw,2.6rem)] font-semibold tracking-apple-display max-w-[20ch] leading-tight">
            Three habits. That&apos;s the whole method.
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-10">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.06}>
                <p className="text-[15px] font-semibold text-[var(--accent)]">
                  Step {i + 1}
                </p>
                <h3 className="mt-2 text-[21px] font-semibold tracking-apple">
                  {s.title}
                </h3>
                <p className="mt-2 text-[16px] leading-relaxed text-[var(--foreground-secondary)]">
                  {s.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-[var(--separator)]"
        style={{ background: "var(--surface-secondary)" }}
      >
        <div className="mx-auto max-w-[1024px] px-5 py-20">
          <h2 className="text-[clamp(1.9rem,4.5vw,2.6rem)] font-semibold tracking-apple-display max-w-[24ch] leading-tight">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.05}>
                <div
                  className="h-full rounded-2xl border p-6"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--separator)",
                  }}
                >
                  <h3 className="text-[18px] font-semibold tracking-apple">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
                    {f.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="border-t border-[var(--separator)]">
        <div className="mx-auto max-w-[1024px] px-5 py-20">
          <div className="max-w-[56ch]">
            <h2 className="text-[clamp(1.9rem,4.5vw,2.6rem)] font-semibold tracking-apple-display leading-tight">
              Your money is personal. We treat it that way.
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--foreground-secondary)]">
              Ledger is a tool, not a financial institution. We don&apos;t sell your
              data, we don&apos;t show you ads, and we only collect what&apos;s needed
              to run the app and keep your account secure.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
              <Link href="/privacy" className="text-[var(--accent)] hover:underline">
                Read the Privacy Policy
              </Link>
              <Link href="/cookies" className="text-[var(--accent)] hover:underline">
                How we use cookies
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[var(--separator)]">
        <div className="mx-auto max-w-[1024px] px-5 py-24 text-center">
          <h2 className="text-[clamp(2rem,5vw,3rem)] font-semibold tracking-apple-display leading-tight max-w-[18ch] mx-auto">
            Start with one number today.
          </h2>
          <p className="mt-4 text-[17px] text-[var(--foreground-secondary)] max-w-[44ch] mx-auto">
            Create a free account in under a minute and add your first
            transaction. The rest gets easier from there.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/register"
              className="h-12 px-8 rounded-full bg-[var(--accent)] text-white text-[17px] font-medium flex items-center pressable"
            >
              Get started free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
