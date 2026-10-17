import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-[680px] px-5 py-14 sm:py-20">
      <h1 className="text-[34px] sm:text-[40px] font-semibold tracking-apple-display leading-tight">
        {title}
      </h1>
      <p className="mt-2 text-[14px] text-[var(--foreground-secondary)]">
        Last updated {updated}
      </p>
      {intro && (
        <p className="mt-6 text-[17px] leading-relaxed text-[var(--foreground-secondary)]">
          {intro}
        </p>
      )}
      <div className="mt-10 space-y-9">{children}</div>
    </article>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[20px] font-semibold tracking-apple">{heading}</h2>
      <div className="mt-3 space-y-3 text-[16px] leading-relaxed text-[var(--foreground-secondary)] [&_a]:text-[var(--accent)] [&_a:hover]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[var(--foreground)] [&_strong]:font-medium">
        {children}
      </div>
    </section>
  );
}
