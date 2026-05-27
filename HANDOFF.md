# Handoff — Coffee OS

## Goal

Build a coffee-shop POS web app called **Coffee OS** per `docs/prd.md`. Backend (Supabase / Drizzle / Better Auth) is wired up; UX polish (theming, responsive layouts, role expansion, sidebar UX) and a "Kasir Baru" staff-registration flow have been shipped and committed. **Live on Vercel at https://coffee-os-seven.vercel.app** — auto-deploys on every push to `main`.

## Current Progress

### Already shipped (prior passes, all committed)

- **Next.js 16 App Router** + Tailwind v4 + shadcn/ui (amber-minimal via tweakcn).
- **Drizzle schema** at `src/db/schema.ts` covering Better Auth (`user`, `session`, `account`, `verification`) + business tables (`products`, `transactions`, `transaction_items`).
- **Better Auth** with email + password, Drizzle adapter, custom `role` on `session.user.role`.
- **Server actions** for product CRUD/restock and transactional checkout (`SELECT … FOR UPDATE` to avoid oversell). Receipt numbers `TRX-<8 hex>` from `crypto.randomUUID()`.
- **Pages** use the `page.tsx` (server, fetches initial data) + `*-client.tsx` (client, owns state + server-action calls) split.
- **Zustand store** trimmed to cart-only, persisted under `coffee-os-cart`.
- **Light/dark theme** ([src/components/theme-provider.tsx](src/components/theme-provider.tsx), [src/components/theme-toggle.tsx](src/components/theme-toggle.tsx)) via `next-themes`. Hydration-safe — `resolvedTheme` read only inside `onClick`, icons swap via Tailwind `dark:` variants.
- **Staff feature** — owner-only `/staff` route lists all accounts and opens a "Tambah Staff" dialog. Server actions in [src/server/actions/users.ts](src/server/actions/users.ts): `listCashiers`, `createCashier(role: StaffRole)`. Creation flow: `auth.api.signUpEmail()` then UPDATE role.
- **Role union extended** in [src/lib/types.ts](src/lib/types.ts) to `"owner" | "cashier" | "gudang" | "barista"`. `STAFF_ROLES` (selectable, excludes owner) and `ROLE_LABELS` (Indonesian display labels) exported here.
- **Sidebar UX overhaul** ([src/components/app-shell.tsx](src/components/app-shell.tsx)): logout moved to bottom, click-anywhere-to-expand when collapsed, `--sidebar-width` CSS variable on root for fixed-position children (e.g. POS mobile bar).
- **POS polish** ([src/app/(app)/pos/pos-client.tsx](src/app/(app)/pos/pos-client.tsx)): boxy 3-up payment-method picker with stacked icons (Cash / QRIS / Debit), hidden scrollbar on category tabs, mobile bar respects sidebar.
- **Responsive stat cards** — Dashboard `StatCard` and Inventory `MiniStat` accept a `compact` prop. Cramped pairs are wrapped in `grid grid-cols-2 gap-4 sm:contents` so they share a row on mobile.

### This pass — deployment (2026-05-27)

- **`npm run build` — passes clean.** Next.js 16.2.6 / Turbopack. Compiled in 4.0s, TypeScript in 3.6s, no errors or warnings. All routes generated successfully (5 static, rest dynamic server-rendered): `/`, `/login`, `/dashboard`, `/inventory`, `/pos`, `/reports`, `/staff`, `/api/auth/[...all]`, `/_not-found`.
- **GitHub repo flipped to public** at https://github.com/Adiwjya/coffee-os.
- **Vercel deploy — LIVE** at https://coffee-os-seven.vercel.app. Imported via Vercel dashboard GitHub integration (no CLI used). Auto-deploys on every push to `main`; feature branches get Preview deployments. Verified end-to-end: login as `owner@coffeeos.id` / `owner123` lands on `/dashboard` with seeded data.
- **Production env vars set on Vercel** (all marked Sensitive — unreadable after creation, only overwritable):
  - `DATABASE_URL` → Supabase Session pooler URI (port 5432). Postgres-js + Better Auth need session pooler, not transaction pooler — transaction pooler breaks prepared statements.
  - `BETTER_AUTH_SECRET` → reused from `.env.local` (rotating logs everyone out).
  - `BETTER_AUTH_URL` → `https://coffee-os-seven.vercel.app` (Vercel assigned `-seven` because `coffee-os.vercel.app` was taken; initial placeholder mismatch was caught and corrected before first successful login).

## Deployment

- **Production URL**: https://coffee-os-seven.vercel.app
- **GitHub**: https://github.com/Adiwjya/coffee-os (public)
- **Hosting**: Vercel (Hobby tier, `Adiw's projects`), project name `coffee-os`. Production branch = `main`. Auto-deploy on push.
- **DB**: Supabase Postgres (same instance as local dev — connection string in Vercel env). Schema migrated via `npm run db:migrate` from the dev machine; seed data in place.

## Local dev setup

1. Postgres database (Supabase recommended).
2. `.env.local` with `DATABASE_URL`, `BETTER_AUTH_SECRET`, optionally `BETTER_AUTH_URL` (defaults to `http://localhost:3000`).
3. `npm run db:migrate` then `npm run db:seed`.
4. `npm run dev` → log in as `owner@coffeeos.id` / `owner123`.

## What Worked

- **Vercel dashboard + GitHub import flow** — zero local CLI setup, no `vercel login` browser dance, secrets stay in the dashboard. Cleanest path for a first deploy. Total time from clicking Import to first working login: ~5 minutes (plus the one re-deploy to fix the BETTER_AUTH_URL placeholder).
- **Sensitive flag on Vercel env vars** — Vercel auto-marks values that look secret-like as Sensitive, which permanently hides the value (no eye icon). To "see" what's there you have to overwrite. Means: when in doubt about a Sensitive var, just re-set it from the known-good `.env.local`. Don't waste time hunting for a reveal button.
- **Production build is clean on Next.js 16 + Turbopack** — no migration drift from earlier App Router work; TypeScript and route collection both green.
- **CSS variable for sidebar width** — cleaner than threading the `collapsed` boolean through every component that needs to clear the sidebar.
- **`grid-cols-2 ... sm:contents` wrapper trick** — lets a 2-column mobile subgrid "dissolve" into the parent grid at larger breakpoints without duplicating cards.
- **Hydration-safe theme toggle** — making `aria-label` static and reading `resolvedTheme` only inside `onClick` eliminated the hydration warning without needing a `mounted` state (which the project's lint rule against setState-in-effect would have made awkward).
- **Click-to-expand sidebar via `e.target === e.currentTarget`** — empty-area clicks expand the sidebar without intercepting clicks on nav links or the logout button.

## What Didn't Work / Reverted

- **Picture-changing feature (avatars + brand logo) — built then fully reverted in a prior pass.** Storing resized base64 data URLs in `user.image` blew through Node's max header size (HTTP 431) because Better Auth's `cookieCache` was serializing `user.image` into the auth cookie. We agreed to move to Supabase Storage instead but the user dismissed the bucket/auth setup prompt and asked to undo. All related code removed; `cookieCache` is back to `{ enabled: true, maxAge: 60 * 5 }`. **Recovery script kept**: `npm run db:reset-avatars` ([scripts/reset-avatars.ts](scripts/reset-avatars.ts)) NULLs out any leftover `user.image` values and drops the `settings` table.
- **Floating notification button** — tried fixed bottom-right FAB, didn't fit the existing header pattern. Reverted to the in-header bell.
- **`useEffect`-based dialog state sync** — the project's `react-hooks/set-state-in-effect` lint rule rejects `setValue(initial)` inside `useEffect(..., [open, initial])`. Pattern that works: extract dialog body into a child component that's only mounted while `open === true`, so state initializes from props on each mount.

## Known Lint Noise

`src/components/app-shell.tsx:~238` has a pre-existing `react-hooks/set-state-in-effect` error for restoring the collapsed sidebar from localStorage on mount. Not blocking the build (build passed clean). Fix likely: read localStorage during initial state with a `typeof window` guard instead of in an effect.

## Next Steps

1. **Demo credentials are publicly visible** on the login screen ([src/app/login/login-client.tsx](src/app/login/login-client.tsx)). Fine for a portfolio/demo, but before any real-user pilot: remove the hint card and rotate the seeded passwords (or delete the seed accounts).
2. **Custom domain (optional)** — Vercel → Project → Settings → Domains → Add Domain. After adding, update `BETTER_AUTH_URL` to the new domain and redeploy, or auth cookies will scope to the wrong origin.
3. **If you want avatars later**: implement via Supabase Storage. Store only the public URL on `user.image` / `settings.brand_logo`. Keep `cookieCache` enabled — URLs are small. Open questions for that pass: auth method (service role vs anon+RLS) and bucket layout (one bucket with prefixes vs two buckets).
4. **Owner-only registration is now `/staff`**, but only creates non-owner accounts (Kasir / Gudang / Barista). New owners still require direct DB updates. Consider an admin "promote to owner" affordance later.
5. **Fix the pre-existing lint error** in AppShell (see "Known Lint Noise") — read localStorage during initial state with a `typeof window` guard.
6. **Tests** — still no test runner configured.
7. **`db:reset-avatars` recovery script** — keep around in case anyone resurfaces with a 431. No-op if nobody uploaded anything.

## Key Files

| Path | Purpose |
|------|---------|
| `src/components/theme-provider.tsx`, `theme-toggle.tsx` | Light/dark theme + toggle |
| `src/app/(app)/staff/page.tsx` + `staff-client.tsx` | Staff list + "Tambah Staff" dialog |
| `src/server/actions/users.ts` | `listCashiers`, `createCashier(role)` |
| `src/lib/types.ts` | Extended `Role` union + `STAFF_ROLES` + `ROLE_LABELS` |
| `src/components/app-shell.tsx` | Sidebar logout, click-to-expand, `--sidebar-width` CSS var |
| `src/app/(app)/pos/pos-client.tsx` | Boxy payment-method buttons w/ icons, tab scrollbar hidden, mobile bar respects sidebar |
| `src/app/(app)/dashboard/dashboard-client.tsx`, `inventory/inventory-client.tsx` | `compact` stat-card mode + `sm:contents` mobile subgrids |
| `scripts/reset-avatars.ts` | One-shot recovery: NULL `user.image`, DROP `settings` |
