# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # ESLint (Next.js config, no --fix by default)
```

No test runner is configured.

## Architecture

Coffee OS is a coffee-shop POS (point-of-sale) frontend built with Next.js 16 App Router, Tailwind CSS v4, and shadcn/ui. There is **no backend** — all state lives in the browser via Zustand persisted to `localStorage` (key `"coffee-os-store"`, version 1). Supabase/Drizzle/Better Auth integration is deferred.

### Routing

```
/                   → redirects to /login or /dashboard
/login              → role picker (owner | cashier), no real auth
/(app)/dashboard    → sales overview with Recharts charts
/(app)/pos          → POS terminal (product grid + cart)
/(app)/inventory    → stock management, product CRUD
/(app)/reports      → PDF export via jsPDF
```

The `(app)` route group has a layout (`src/app/(app)/layout.tsx`) that guards every protected route: it reads `currentUser` from the Zustand store and redirects to `/login` if null. Hydration timing is handled by `useHydrated()` in `src/lib/store.ts` to avoid SSR/localStorage mismatches — always call this hook before rendering user-dependent UI.

### State (`src/lib/store.ts`)

Single Zustand store exported as `useStore`. All business logic lives here:
- **auth**: `login(role)` sets a mock user from `USERS`, `logout()` clears user and cart.
- **cart**: `addToCart`, `decrementCart`, `removeFromCart`, `clearCart` — cart items are `{ productId, quantity }` only; product details are joined at render time.
- **checkout**: validates stock, creates a `Transaction`, deducts stock from products, appends to `transactions[]`, clears cart. Returns `{ ok, transaction?, error? }`.
- **inventory**: `restock`, `upsertProduct` (insert or update by `id`), `deleteProduct`.
- `resetData()` resets products and transactions to seed values.

Derived helpers exported from the same file: `getLowStock(products)`, `isToday(iso)`, `CATEGORIES`.

### Data layer

`src/lib/mock-data.ts` — seed products (`SEED_PRODUCTS`, 14 items), two mock users (`USERS`), and `generateSeedTransactions()` which uses a seeded PRNG (mulberry32, seed 42) to produce stable 30-day transaction history.

Product categories: `"Kopi" | "Non-Kopi" | "Makanan"`.  
Payment methods: `"Cash" | "QRIS" | "Debit"`.  
Currency and dates use `id-ID` locale throughout (`src/lib/format.ts`).

### Analytics (`src/lib/analytics.ts`)

Pure functions that derive metrics from `Transaction[]`:
- `getRange(key)` / `filterByRange` — date windowing (today / 7d / 30d)
- `summarize` → `{ revenue, count, itemsSold, avg }`
- `dailySeries(transactions, days)` → array of `{ date, label, revenue, count }` for Recharts
- `topProducts` / `paymentBreakdown` — ranked aggregates

### PDF reports (`src/lib/pdf.ts`)

`generateSalesReportPDF(range, transactions)` builds an A4 PDF using jsPDF + jspdf-autotable and triggers a browser download. It calls the same analytics functions above. The `@ts-expect-error` on `doc.lastAutoTable` is intentional — the plugin attaches this property at runtime and has no types.

### UI components

`src/components/ui/` — shadcn/ui components (Button, Card, Dialog, Sheet, etc.). Do not edit these directly; re-run `npx shadcn add <component>` to update them.

`src/components/app-shell.tsx` — the persistent sidebar + header wrapper rendered by the `(app)` layout. It reads low-stock products from the store and shows a notification badge on the bell icon.
