export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Rent",
  "Books and supplies",
  "Data and airtime",
  "Health",
  "Social",
  "Fees",
  "Savings",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Allowance",
  "Salary",
  "Freelance",
  "Gift",
  "Scholarship",
  "Refund",
  "Other",
] as const;

export function categoriesFor(type: "income" | "expense") {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}
