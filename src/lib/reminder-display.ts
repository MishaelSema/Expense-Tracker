/**
 * Presentation-only lookups for reminders. Kept free of server imports so both
 * the reminders list and the dashboard can use them in Client Components.
 */

export const REMINDER_SEVERITY_COLOR: Record<string, string> = {
  critical: "var(--danger)",
  warning: "var(--warning)",
  info: "var(--accent)",
};

export const REMINDER_TYPE_LABEL: Record<string, string> = {
  debt_due: "Debt",
  bill_due: "Bill",
  budget_ending: "Budget",
  budget_overspent: "Budget",
  goal_deadline: "Goal",
};
