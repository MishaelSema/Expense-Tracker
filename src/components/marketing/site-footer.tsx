import Link from "next/link";
import { APP_NAME } from "@/lib/nav";

const groups = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how", label: "How it works" },
      { href: "/register", label: "Get started" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/cookies", label: "Cookie Policy" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/support", label: "Help centre" },
      { href: "mailto:support@ledger.app", label: "Contact support" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--separator)] mt-24">
      <div className="mx-auto max-w-[1024px] px-5 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[15px] font-semibold tracking-apple">{APP_NAME}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--foreground-secondary)] max-w-[22ch]">
              A calm, private place to manage your money.
            </p>
          </div>
          {groups.map((g) => (
            <div key={g.title}>
              <p className="text-[13px] font-semibold text-[var(--foreground)]">{g.title}</p>
              <ul className="mt-3 space-y-2">
                {g.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-[var(--separator)] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-[12px] text-[var(--foreground-secondary)]">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p className="text-[12px] text-[var(--foreground-secondary)]">
            Made in Cameroon.
          </p>
        </div>
      </div>
    </footer>
  );
}
