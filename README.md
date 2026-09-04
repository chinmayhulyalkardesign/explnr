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
- Prisma 7 + PostgreSQL (via the `@prisma/adapter-pg` driver adapter —
  Prisma 7 moved connection config out of `schema.prisma` and into
  `prisma.config.ts`)
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

You need a Postgres database. For local development, either run one
yourself (`postgresql` locally, or `docker run -p 5432:5432 -e
POSTGRES_PASSWORD=postgres postgres:16`) or point at a free hosted instance
(Neon, Supabase, etc.).

```bash
cp .env.example .env   # then fill in DATABASE_URL
npm install             # also runs `prisma generate` via postinstall
npm run db:migrate      # applies migrations
npm run dev
```

Open http://localhost:3000. `npm run db:studio` opens Prisma Studio if you
want to inspect/edit rows directly.

## Deploying to Vercel

1. **Provision a database.** In the Vercel dashboard: Storage → Create
   Database → Postgres (this provisions a Neon-backed Postgres instance and
   wires up env vars automatically). Any other Postgres provider works too
   — you'll just set the env vars yourself in step 2.
2. **Set environment variables** on the Vercel project (Settings →
   Environment Variables):
   - `DATABASE_URL` — the **pooled** connection string (Vercel Postgres
     exposes this as `POSTGRES_PRISMA_URL` or `POSTGRES_URL`; copy its value
     into `DATABASE_URL` since that's the name the app and `prisma.config.ts`
     read).
   - `DIRECT_URL` — the **direct/unpooled** connection string (Vercel
     Postgres: `POSTGRES_URL_NON_POOLING`). Migrations run DDL, which
     shouldn't go through a transaction-mode pooler.
3. **Set the build command** to `npm run vercel-build` (Settings → Build &
   Development Settings → Build Command → override). This runs
   `prisma migrate deploy` against `DIRECT_URL` before `next build`, so
   your schema is applied on every deploy.
4. **Turn on Deployment Protection** (Settings → Deployment Protection —
   password or Vercel SSO) before you put any real financial data in.
   There is no in-app login yet (see below) — this is the only thing
   standing between the deployed URL and anyone who finds it.
5. Push to the branch Vercel is tracking, or run `vercel --prod`.

## Known limitations (by design, for now)

- **No authentication.** The app itself has no login — access control is
  whatever you configure at the hosting layer (Vercel Deployment Protection,
  for now). That's a reasonable stopgap for a single user behind a password,
  but it ties access to Vercel's project settings rather than the app. If
  you ever add other users, or host elsewhere, replace it with real
  application-level auth (e.g. NextAuth).
- **No bank connectivity.** Income and expenses are entered manually. If
  you want to import transactions automatically, the responsible path is
  the Account Aggregator framework (Setu AA, Finvu, OneMoney) — consent-
  based, revocable, no stored credentials.
- **No payment execution.** To actually pay bills via UPI/netbanking from
  an app, you integrate a licensed Payment Aggregator's API (Razorpay,
  Cashfree, Decentro, ...) after completing their merchant KYC. There is
  no way to do this without a licensed intermediary.
