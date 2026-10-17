import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[13px] font-medium text-[var(--foreground-secondary)]">404</p>
      <h1 className="mt-3 text-[30px] sm:text-[36px] font-semibold tracking-apple-display leading-tight max-w-[18ch]">
        We can&apos;t find that page
      </h1>
      <p className="mt-3 text-[16px] leading-relaxed text-[var(--foreground-secondary)] max-w-[40ch]">
        The link may be out of date, or the page may have moved. Let&apos;s get you
        back on track.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          href="/dashboard"
          className="h-11 px-6 rounded-full bg-[var(--accent)] text-white text-[15px] font-medium flex items-center pressable"
        >
          Go to Overview
        </Link>
        <Link
          href="/"
          className="h-11 px-6 rounded-full border border-[var(--separator)] text-[15px] font-medium flex items-center pressable"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
