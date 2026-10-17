/**
 * Abstract product preview built from the app's own design language — a balance
 * card above a short activity list. No stock imagery.
 */
export function AppPreview() {
  const rows = [
    { label: "Market run", meta: "Food · Today", amount: "−4 500" },
    { label: "Allowance", meta: "Income · Today", amount: "+25 000" },
    { label: "Taxi", meta: "Transport · Yesterday", amount: "−1 200" },
    { label: "Data bundle", meta: "Data · Yesterday", amount: "−2 000" },
  ];

  return (
    <div className="mx-auto w-full max-w-[380px]">
      <div
        className="rounded-[40px] border p-3 shadow-[0_30px_80px_rgba(0,0,0,0.12)]"
        style={{
          borderColor: "var(--separator)",
          background: "var(--surface)",
        }}
      >
        <div
          className="rounded-[30px] overflow-hidden"
          style={{ background: "var(--background)" }}
        >
          {/* Balance area */}
          <div className="px-6 pt-8 pb-6">
            <p className="text-[13px] text-[var(--foreground-secondary)]">
              Available this month
            </p>
            <p className="mt-1 text-[40px] font-semibold tracking-apple-display leading-none">
              128 400
              <span className="ml-2 text-[18px] font-medium text-[var(--foreground-secondary)]">
                FCFA
              </span>
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: "var(--surface-secondary)" }}
              >
                <p className="text-[12px] text-[var(--foreground-secondary)]">Income</p>
                <p className="mt-0.5 text-[17px] font-semibold text-[var(--success)]">
                  +74 000
                </p>
              </div>
              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: "var(--surface-secondary)" }}
              >
                <p className="text-[12px] text-[var(--foreground-secondary)]">Spent</p>
                <p className="mt-0.5 text-[17px] font-semibold text-[var(--danger)]">
                  −31 600
                </p>
              </div>
            </div>
          </div>

          {/* Activity list */}
          <div
            className="rounded-t-3xl border-t px-2 py-2"
            style={{ background: "var(--surface)", borderColor: "var(--separator)" }}
          >
            {rows.map((r, i) => (
              <div
                key={r.label}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--separator)",
                }}
              >
                <div>
                  <p className="text-[15px] font-medium">{r.label}</p>
                  <p className="text-[12.5px] text-[var(--foreground-secondary)]">{r.meta}</p>
                </div>
                <p
                  className="text-[15px] font-semibold tabular-nums"
                  style={{
                    color: r.amount.startsWith("+") ? "var(--success)" : "var(--foreground)",
                  }}
                >
                  {r.amount}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
