# Budget Tracker

Categorize salary into fixed and variable expense buckets, log a budget per
category, and track actual spend against it month by month.

This is a **manual-entry budgeting app** — there is no bank connection and no
payment execution. That is deliberate: initiating UPI/netbanking payments
requires going through an NPCI-authorized Payment Aggregator (Razorpay,
Cashfree, Setu, etc.) with merchant KYC, and reading live bank data
responsibly means the RBI-regulated Account Aggregator framework, not
credential scraping. Neither is something to bolt onto a personal project
without deliberately taking on that scope. See below for what a real
integration would require.

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS
- Prisma 7 + SQLite (via the `@prisma/adapter-better-sqlite3` driver
  adapter — Prisma 7 moved connection config out of `schema.prisma` and
  into `prisma.config.ts`)
- Zod for request validation
- SWR for client-side data fetching

## Data model

- **Category** — name, `FIXED` or `VARIABLE`, monthly budget. Categories
  with expenses logged against them can't be hard-deleted (referential
  integrity is enforced at the DB level) — archive them instead.
- **Income** — salary/other income entries (source, amount, date).
- **Expense** — logged against a category (amount, date, description).

The `/api/summary` endpoint aggregates all three by calendar month: total
income, total budgeted, total spent, a fixed-vs-variable split, and
per-category remaining budget.

## Getting started

```bash
npm install        # also runs `prisma generate` via postinstall
npm run db:migrate  # creates prisma/dev.db and applies migrations
npm run dev
```

Open http://localhost:3000.

`prisma/dev.db` is gitignored — it holds real financial data once you start
using this for real, and must never be committed. `npm run db:studio` opens
Prisma Studio if you want to inspect/edit rows directly.

## Known limitations (by design, for now)

- **No authentication.** This is built for single-user local/personal use.
  Before deploying this anywhere reachable over a network, add auth
  (e.g. NextAuth) and move off a local SQLite file to a real database with
  proper access control.
- **No bank connectivity.** Income and expenses are entered manually. If
  you want to import transactions automatically, the responsible path is
  the Account Aggregator framework (Setu AA, Finvu, OneMoney) — consent-
  based, revocable, no stored credentials.
- **No payment execution.** To actually pay bills via UPI/netbanking from
  an app, you integrate a licensed Payment Aggregator's API (Razorpay,
  Cashfree, Decentro, ...) after completing their merchant KYC. There is
  no way to do this without a licensed intermediary.
