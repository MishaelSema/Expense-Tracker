# Ledger — design and code reference

This app follows Apple's design language (apple.com, Wallet, Health). Any new
screen must conform to the rules below. Do not introduce new colors, radii, or
motion values.

## Stack

- Next.js App Router (src/app), TypeScript, Tailwind CSS v4
- MongoDB via Mongoose (`@/lib/db`, models in `src/models`)
- NextAuth v4 credentials provider (`@/lib/auth`, `@/lib/session`)
- Framer Motion for motion, Sonner for toasts

## Design tokens (already defined in `globals.css`)

Use these CSS variables through Tailwind arbitrary values or plain `style`.
Never hardcode hex colors.

| Token | Usage |
| --- | --- |
| `var(--background)` | page background |
| `var(--surface)` | cards, sheets, bars |
| `var(--surface-secondary)` | grouped fills, inputs, chips |
| `var(--foreground)` | primary text |
| `var(--foreground-secondary)` | secondary text |
| `var(--accent)` | links, primary buttons, selection |
| `var(--accent-hover)` | accent hover |
| `var(--success)` | income, positive |
| `var(--danger)` | expense, negative, destructive |
| `var(--warning)` | caution |
| `var(--separator)` | 1px dividers / card borders |

Radii: cards and sheets `rounded-2xl`/`rounded-3xl`; controls `rounded-xl`;
buttons and pills `rounded-full`. Shadows stay soft and rare.

## Typography

- System font stack is applied on `body`. Do not add webfonts.
- Headings: `font-semibold tracking-apple` (or `tracking-apple-display` for
  the largest headings).
- Body: 15–17px. Secondary: 13–14px `text-[var(--foreground-secondary)]`.
- **Never use eyebrow headings.** No small uppercase labels above titles.
- Hierarchy comes from weight, size and leading together — not from size alone.

## Components to reuse

- `@/components/ui/button` — `Button` with variants `primary | secondary | ghost | ghost-destructive | destructive | outline`, sizes `sm | md | lg`.
- `@/components/ui/input` — `Input`
- `@/components/ui/label` — `Label`
- `@/components/ui/card` — `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardBody`, `CardRow`, `CardFooter`
- `@/components/ui/sheet` — `Sheet` (bottom sheet on mobile, centered dialog on desktop)
- `@/components/ui/skeleton` — `Skeleton`
- `@/components/ui/empty-state` — `EmptyState`
- `@/components/ui/icons` — stroke icons (nav, lists, menus only)
- `@/components/ui/toaster` — mounted once in root layout
- `@/components/page-header` — `PageHeader`

## Hard rules

- **No emoji** anywhere in the UI. Icons are stroke SVGs only, and only where
  they aid scanning (nav, list rows, menus).
- **Do not overuse icons.** Text-first. A row needs an icon only when it is a
  menu / navigation / list affordance.
- Every interactive element is `pressable` (instant scale-down on press).
- Numbers and money right-aligned and tabular where in lists.
- Talent for restraint: prefer whitespace over dividers; one divider is fine,
  three is noise.
- Respect `prefers-reduced-motion` (already handled globally, and via
  `useReducedMotion()` in animated components).
- All actions that change state must confirm with a Sonner toast:
  `toast.success("…")` / `toast.error("…")`.

## Data fetching pattern

- Server Components read with Mongoose directly (see `src/app/(app)/transactions/page.tsx`).
- Client Components mutate via `fetch` to route handlers under
  `src/app/api/<resource>`, then call `router.refresh()`.
- Route handlers authorise with `requireUser()` from `@/lib/api-auth`.

## Money and dates

- Use `formatCurrency` and `formatDate` from `@/lib/format`.
- Currency defaults to XAF (FCFA). Keep `Intl` formatting; do not hand-roll.

## Motion

- Springs only, critically damped by default. Sheets use the shared `Sheet`.
- Transitions animate `transform` / `opacity` only.
