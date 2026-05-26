# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint (Next.js config)

# Database (requires DATABASE_URL in .env.local)
npm run db:generate  # generate Drizzle SQL migration from schema.ts
npm run db:push      # push schema directly (dev only)
npm run db:migrate   # apply generated migrations from ./drizzle
npm run db:studio    # open Drizzle Studio
npm run db:seed      # insert demo users + 14 seed products
npm run db:reset-avatars  # one-shot recovery: NULLs user.image + drops legacy `settings` table
```

No test runner is configured.

## First-time setup

1. Copy `.env.example` → `.env.local`
2. Fill in `DATABASE_URL` (Supabase Connection String → URI, prefer Session pooler) and `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`)
3. `npm install`
4. `npm run db:migrate` (or `npm run db:push` for first dev iteration)
5. `npm run db:seed` — creates `owner@coffeeos.id` / `owner123` and `kasir@coffeeos.id` / `kasir123` plus 14 products
6. `npm run dev`

## Architecture

Coffee OS is a coffee-shop POS frontend built with **Next.js 16 App Router**, **Tailwind CSS v4**, **shadcn/ui**, **Drizzle ORM (Postgres / Supabase)**, and **Better Auth**. Cart state lives in `localStorage` via Zustand; everything else is server-backed.

### Routing

```
/                   → redirects to /login or role-based home (server)
/login              → email/password sign-in via Better Auth
/(app)/dashboard    → sales overview (all roles)
/(app)/pos          → POS terminal
/(app)/inventory    → stock + product CRUD (CRUD restricted to owner)
/(app)/staff        → list users + "Kasir Baru" dialog (owner-only)
/(app)/reports      → PDF export (owner-only)
/api/auth/[...all]  → Better Auth catch-all handler
```

Auth guard lives in `src/app/(app)/layout.tsx` — a server component that calls `requireSession()` and redirects unauthenticated users to `/login`. Role gating (owner vs cashier) happens both server-side (e.g. `requireOwner()` in `reports/page.tsx`) and in the UI (`AppShell` hides nav links via `ownerOnly`).

### Database (`src/db/`)

`src/db/schema.ts` defines all tables using `drizzle-orm/pg-core`:

- **Better Auth core**: `user`, `session`, `account`, `verification` (column names follow the Better Auth Drizzle adapter conventions). A custom `role` field (`"owner" | "cashier" | "gudang" | "barista"`) is added on `user` and surfaced on `session.user.role` via `additionalFields` in `src/lib/auth.ts`. `STAFF_ROLES` / `ROLE_LABELS` (Indonesian labels) live in `src/lib/types.ts`.
- **Business tables**: `products`, `transactions`, `transaction_items` (per PRD section 6).

Connection is `postgres-js` driver via `src/db/index.ts`. The client is cached on `globalThis` in dev to survive HMR. Use `db` for all queries; `schema` is also re-exported for filter helpers.

`drizzle.config.ts` reads `DATABASE_URL` from `.env.local` (then `.env`) and writes migrations to `./drizzle/`. The config falls back to a placeholder URL if env is missing so `npx drizzle-kit generate` works without a live DB.

### Auth (`src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`)

- `auth` = server-side Better Auth instance with the Drizzle adapter, email+password enabled, 7-day sessions, `nextCookies()` plugin.
- `authClient` = browser-side client (`createAuthClient` + `inferAdditionalFields<typeof auth>()` so `role` is typed on the client too).
- `getSession()` / `requireSession()` / `requireOwner()` (in `src/lib/session.ts`) are server-only helpers used inside Server Components and Server Actions to authenticate and authorize requests.

The `/api/auth/[...all]/route.ts` mounts Better Auth's catch-all handler — it's the only API route in the app.

### Server actions (`src/server/actions/`)

`products.ts` — `listProducts`, `upsertProduct` (owner-only), `deleteProduct` (owner-only), `restockProduct`. All call `requireSession()` / `requireOwner()` for authz and `revalidatePath("/", "layout")` after mutations.

`transactions.ts` — `listTransactions`, `createTransaction`. Checkout runs the validate-insert-deduct steps inside `db.transaction()` with `SELECT … FOR UPDATE` locks to prevent oversell. Receipt numbers are `TRX-<8 hex>` from a random UUID prefix — no sequence, no race.

`users.ts` — `listCashiers`, `createCashier` (both owner-only). `createCashier` accepts `role: StaffRole` and creates the account via `auth.api.signUpEmail()` (so the password is hashed correctly), then sets `role` with a follow-up UPDATE — same pattern as the seed script, because Better Auth's `additionalFields.role.input: false` blocks setting role at sign-up.

### Pages (Server + Client pattern)

Each protected page is split:

- `page.tsx` — Server Component. Fetches data via server actions (or queries `db` directly for the auth-layout's low-stock list) and passes it as `initial*` props to a client child.
- `*-client.tsx` — `"use client"` component that owns interactive state (search, filters, cart) and triggers mutations via Server Actions inside `useTransition` + `router.refresh()`.

This keeps the network shape simple: initial data is in the HTML payload, mutations go through Server Actions, and revalidation is cache-driven.

### Client state (`src/lib/store.ts`)

Zustand store reduced to **cart only** (`useCartStore`). Cart items are `{ productId, quantity }` — product details join at render time using the server-fetched product list. The store is still persisted to `localStorage` under `"coffee-os-cart"` (version 1).

Derived helpers remain exported: `getLowStock(products)`, `isToday(iso)`, `CATEGORIES`.

### Analytics (`src/lib/analytics.ts`)

Unchanged. Pure functions over `Transaction[]`:
- `getRange(key)` / `filterByRange` — date windowing (today / 7d / 30d)
- `summarize` → `{ revenue, count, itemsSold, avg }`
- `dailySeries(transactions, days)` → array for Recharts
- `topProducts` / `paymentBreakdown` — ranked aggregates

These are reused by both the dashboard and the PDF generator.

### PDF reports (`src/lib/pdf.ts`)

`generateSalesReportPDF(range, transactions)` builds an A4 PDF using jsPDF + jspdf-autotable. The `@ts-expect-error` on `doc.lastAutoTable` is intentional.

### UI components

`src/components/ui/` — shadcn/ui components. Do not edit directly; re-run `npx shadcn add <component>` to update them.

`src/components/app-shell.tsx` — persistent sidebar + header. Receives `currentUser` and `lowStock` as props from `src/app/(app)/layout.tsx`. Logout calls `authClient.signOut()` and `router.refresh()`. Nav links hide owner-only routes (`/staff`, `/reports`) for non-owners. The sidebar's collapsed-state width is exposed on the AppShell root as the `--sidebar-width` CSS variable (`4rem` collapsed, `16rem` expanded) — fixed-position UI inside `<main>` (e.g. the POS mobile bottom bar) reads it via `md:left-[var(--sidebar-width,16rem)]` to avoid overlapping the sidebar. When collapsed, clicking the brand icon or any blank area in the sidebar expands it (no dedicated expand button).

`src/components/theme-provider.tsx` + `src/components/theme-toggle.tsx` — `next-themes`-based light/dark toggle wired in `src/app/layout.tsx` (`<html suppressHydrationWarning>`, attribute=class, defaultTheme=system). The toggle reads `resolvedTheme` only inside `onClick` to avoid hydration mismatch; icons swap via `dark:` CSS variants. `.dark` CSS variables are defined in `src/app/globals.css`. `src/components/ui/sonner.tsx` already reads `useTheme()` so toasts follow the theme.
