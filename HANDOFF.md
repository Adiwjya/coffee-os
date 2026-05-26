# Handoff — Coffee OS

## Goal

Build a coffee-shop POS (point-of-sale) web app called **Coffee OS** from the PRD located at `docs/prd.md`. The current phase is **frontend only** — the full backend (Supabase, Drizzle ORM, Better Auth) is deferred until the UI flows are validated.


## Current Progress

The initial frontend is complete and committed to `main` (2 commits total):

- `57ca064` — Initial commit: Coffee OS POS frontend
- `f557447` — Add CLAUDE.md with project architecture and development guidance

### What's working

- **Next.js 16 App Router** project with Tailwind CSS v4 and shadcn/ui (amber-minimal theme via tweakcn)
- **Routes**: `/login`, `/dashboard`, `/pos`, `/inventory`, `/reports`
- **Auth mock**: role picker (owner | cashier) — no real auth, sets a mock user in Zustand
- **POS terminal**: product grid + cart, checkout with stock validation
- **Inventory**: product CRUD (`upsertProduct`, `deleteProduct`, `restock`)
- **Dashboard**: Recharts charts powered by analytics helpers (`src/lib/analytics.ts`)
- **Reports**: PDF export (jsPDF + jspdf-autotable, `src/lib/pdf.ts`) with date-range filtering
- **State**: single Zustand store (`src/lib/store.ts`) persisted to `localStorage` (key `"coffee-os-store"`, version 1)
- **Seed data**: 14 products, 2 mock users, 30-day stable transaction history via seeded PRNG (`src/lib/mock-data.ts`)
- **CLAUDE.md**: full architecture documentation checked in

## What Didn't Work / Key Decisions

- **TanStack Start was skipped** — the PRD specified it but the user chose Next.js to match the `D:\Nextjs\coffee-os` folder location.
- **Backend is intentionally absent** — Supabase/Drizzle/Better Auth are deferred. Non-persistence across browsers is expected, not a bug.

## Next Steps

The natural next phase is **wiring the real backend**:

1. Set up Supabase project and get credentials.
2. Add Drizzle ORM schema (products, transactions, users).
3. Integrate Better Auth for real login (replace the mock role picker).
4. Replace the Zustand/localStorage layer with server-side data fetching (Server Components or API routes).
5. Migrate seed data into the Supabase DB.

If the user wants to stay in the frontend-only phase, possible improvements include:
- Adding more shadcn/ui components or polish passes
- Expanding analytics (hourly breakdown, product-level trends)
- Improving the PDF report layout

## Key Files

| Path | Purpose |
|------|---------|
| `src/lib/store.ts` | Zustand store — all business logic and state |
| `src/lib/mock-data.ts` | Seed products, users, transaction generator |
| `src/lib/analytics.ts` | Pure analytics functions (revenue, series, top products) |
| `src/lib/pdf.ts` | PDF report generation |
| `src/lib/format.ts` | Currency/date formatters (id-ID locale) |
| `src/app/(app)/layout.tsx` | Auth guard for protected routes |
| `src/components/app-shell.tsx` | Sidebar + header with low-stock badge |
| `CLAUDE.md` | Full architecture reference for Claude |
