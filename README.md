# Ledger — Expense tracker (Next.js)

A calm, Apple-inspired personal finance app for students in Cameroon. Built with
Next.js (App Router), MongoDB, and NextAuth, with Nodemailer for transactional
email.

This is a full rebuild of the original Vite + Firebase app (`../Expense-Tracker`),
redesigned for mobile first, with a proper auth flow, legal pages, and a
student-focused feature set.

## Features

- **Auth** — sign up, sign in, email verification, forgot / reset password,
  change password, delete account. Toasts on every action.
- **Overview** — balance for the month, income vs. spending, a daily
  "safe to spend" figure, top categories, and recent activity.
- **Activity** — every transaction shown as a card in a responsive tile grid,
  grouped by month with per-month income / expense totals, plus search and an
  income/expense filter.
- **Budgets** — per-category limits with a progress bar that turns amber and
  red as you approach and pass them.
- **Goals** — savings goals with progress and quick "add money".
- **Debts** — track what you owe and what you're owed, keep the notes attached
  to each one, and mark items paid.
- **Recurring bills** — weekly, monthly, yearly or one-off bills with a next
  due date, a note, and an active toggle.
- **Reminders** — debt due dates, upcoming bills, budget resets and overspend,
  and goal deadlines, gathered in one inbox. Delivered in-app (bell with an
  unread badge), as a daily email digest, and through browser push.
- **Market** — live exchange rates (Frankfurter, no API key required) and
  optional financial headlines.
- **Wishlist** — things worth saving for, with prices and priority.
- **Notes and tasks** — simple notes plus a task list with due dates.
- **Insights** — month-over-month spending, category breakdown and a 6-month
  income vs. expense view, built without a charting library.
- **Legal** — Privacy Policy, Terms of Service, Cookie Policy, a cookie notice
  and a help centre.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Tailwind CSS v4** with design tokens in `globals.css`
- **MongoDB + Mongoose** for data
- **NextAuth v4** (credentials) for sessions
- **Nodemailer** for verification and password-reset email
- **Framer Motion** for motion, **Sonner** for toasts

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Then fill in:

   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=          # openssl rand -base64 32
   MONGODB_URI=              # e.g. mongodb://localhost:27017/ledger
   SMTP_HOST=                # e.g. smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=                # your address
   SMTP_PASS=                # app password
   SMTP_FROM=                # e.g. no-reply@yourdomain.com
   APP_URL=http://localhost:3000
   NEXT_PUBLIC_SITE_URL=http://localhost:3000   # canonical URL for SEO (sitemap, robots, metadata)
   CRON_SECRET=              # openssl rand -hex 32 — protects GET /api/cron/reminders
   VAPID_PUBLIC_KEY=         # npx web-push generate-vapid-keys — browser push
   VAPID_PRIVATE_KEY=
   VAPID_SUBJECT=mailto:you@example.com
   NEWS_PROVIDER=            # optional: marketaux (default) or finnhub
   NEWS_API_KEY=             # optional: headlines on /market; hidden when unset
   ```

   Without `NEWS_API_KEY` the Market page still shows exchange rates and
   simply omits headlines. Without the VAPID keys and `CRON_SECRET`, browser
   push and the daily digest are skipped rather than failing.

   Contact details in the legal and support pages are set to
   `mishaelsema@gmail.com` and `+237 679 080 426`. Change them there if they
   ever move.

3. **Run**

   ```bash
   npm run dev
   ```

4. **Build**

   ```bash
   npm run build
   ```

## Migrating from the old Firebase app

`scripts/migrate-firebase-rest.mjs` copies users and data from the original
Firestore project into MongoDB. It signs in the way the old web app did — with
the project's *public* web config plus the account's email and password — and
reads through the Firestore REST API, so **no service-account key is needed**:

```bash
# PowerShell
$env:FIREBASE_EMAIL="you@example.com"
$env:FIREBASE_PASSWORD="your-firebase-password"
node scripts/migrate-firebase-rest.mjs --dry-run   # preview counts, write nothing
node scripts/migrate-firebase-rest.mjs --email=you@example.com --fresh --sync-verified
```

A service-account variant, `scripts/migrate-firebase.mjs`, does the same via
the Admin SDK if you would rather not type a password:

```bash
npm i -D firebase-admin
# PowerShell
$env:FIREBASE_SERVICE_ACCOUNT="C:\path\to\serviceAccount.json"
node scripts/migrate-firebase.mjs --email=you@example.com --fresh --sync-verified
```

- `--email=…` limits the run to one Firebase account and matches it to the
  MongoDB account with the same email (reused if it already exists, so data
  lands on the account you already have).
- `--fresh` clears that user's existing rows first, so the import can be re-run
  without duplicating. **Always use it on a re-run** — the script inserts rows,
  it does not upsert.
- `--sync-verified` mirrors Firebase's verified flag onto the MongoDB account.

What it does:

- Creates a Ledger user for every Firebase Auth account (matched by email).
  **Passwords cannot be migrated** — Firebase's hashes aren't bcrypt — so each
  newly created user gets a random password and must use *Forgot password*.
  Email verification state is preserved. Accounts that already exist in
  MongoDB keep their existing password.
- Imports `transactions`, `budgets`, `debts` (including the **`notes`** on each
  debt), `notes` and `todos`, mapping the old Firestore field names to the new
  schemas (the exact mapping is documented in the script header). Budgets keep
  their original window, with `startDate`/`endDate` derived from the old
  `createdAt` + `period`.
- Normalises the old category vocabulary to the nearest preset in
  `src/lib/categories.ts`, so migrated rows render on the new screens.

The old app has no `goals` or `wishlist` collections, so nothing is imported
there. Get a service-account key from Firebase console → Project settings →
Service accounts → *Generate new private key*, and keep it out of git.

To confirm what landed in the database:

```bash
node scripts/db-stats.mjs --email=you@example.com            # per-collection counts
node scripts/db-stats.mjs --email=you@example.com --samples  # plus sample documents
```

## SEO & accessibility

- Per-page titles/descriptions, Open Graph and Twitter metadata, a canonical
  `metadataBase` and per-page canonical URLs.
- `app/robots.ts` and `app/sitemap.ts` expose only the public pages; the app,
  auth and API routes are disallowed.
- Skip-to-content links, one `<main>` landmark per page, associated form
  labels, `aria-label`s on icon-only controls, and Framer Motion configured to
  honour the OS "reduce motion" preference (`MotionProvider`).

## Project structure

```
src/
├── app/
│   ├── (marketing)/        # public site: home, legal, support
│   ├── (auth)/             # login, register, forgot/reset, verify
│   ├── (app)/              # authenticated app shell + pages
│   └── api/                # route handlers (auth, resources, profile)
├── components/
│   ├── ui/                 # design-system primitives
│   ├── layout/             # top nav, mobile bar, bottom tabs
│   ├── marketing/          # landing page pieces
│   └── <feature>/          # per-feature client components
├── lib/                    # db, auth, mail, format, stats, validations
├── models/                 # Mongoose schemas
└── proxy.ts                # route protection (Next 16's middleware convention)
```

## Design system

Read `DESIGN.md` before adding a screen. The short version: use the CSS tokens
(`var(--accent)`, `var(--separator)`, …), no emoji, no eyebrow headings, minimal
icons, and confirm every mutating action with a toast.

## Scripts

```bash
npm run dev     # start the dev server
npm run build   # production build (no secrets required — data routes are dynamic)
npm run start   # serve the production build
npm run lint    # ESLint

node scripts/db-stats.mjs --email=you@example.com --samples   # inspect the database
node scripts/migrate-firebase-rest.mjs --dry-run              # preview a Firebase import
```

## Notes

- Currency defaults to **FCFA (XAF)** and uses `Intl` formatting.
- The public site (home, legal, support) is statically prerendered; the app and
  API routes are server-rendered on demand.
- The account screen lets users delete their account and all data immediately.
- The legal pages are written for Cameroon's framework (Law No. 2010/012 on
  Cybersecurity and Cybercriminality, Law No. 2010/013 on Electronic
  Communications, the Malabo Convention) and, where applicable, GDPR and
  CCPA/CPRA. Have a lawyer review them for your specific situation before
  launch.
