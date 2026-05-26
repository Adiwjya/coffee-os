# Handoff — Coffee OS

## Goal

Build a coffee-shop POS web app called **Coffee OS** per `docs/prd.md`. Backend (Supabase / Drizzle / Better Auth) is wired up; the most recent pass added UX polish (theming, responsive layouts, role expansion, sidebar UX) and a "Kasir Baru" staff-registration flow. App boots once the user supplies Supabase credentials and runs migrations.

## Current Progress

### Already shipped (prior passes)

- **Next.js 16 App Router** + Tailwind v4 + shadcn/ui (amber-minimal via tweakcn).
- **Drizzle schema** at `src/db/schema.ts` covering Better Auth (`user`, `session`, `account`, `verification`) + business tables (`products`, `transactions`, `transaction_items`).
- **Better Auth** with email + password, Drizzle adapter, custom `role` on `session.user.role`.
- **Server actions** for product CRUD/restock and transactional checkout (`SELECT … FOR UPDATE` to avoid oversell). Receipt numbers `TRX-<8 hex>` from `crypto.randomUUID()`.
- **Pages** use the `page.tsx` (server, fetches initial data) + `*-client.tsx` (client, owns state + server-action calls) split.
- **Zustand store** trimmed to cart-only, persisted under `coffee-os-cart`.

### Last pass — added/changed (all **uncommitted** as of 2026-05-27)

- **Light/dark theme** ([src/components/theme-provider.tsx](src/components/theme-provider.tsx), [src/components/theme-toggle.tsx](src/components/theme-toggle.tsx)) via `next-themes`. Wired in `src/app/layout.tsx` with `attribute="class" defaultTheme="system" enableSystem suppressHydrationWarning`. The toggle is hydration-safe — `resolvedTheme` is only read inside `onClick`, icons swap via Tailwind `dark:` variants. Currently: Moon shown in light mode (purple), Sun shown in dark mode (orange) — the icon hints at the destination, not the current state. `.dark` CSS variables were already defined in `globals.css`.
- **Staff feature** — new owner-only `/staff` route (`src/app/(app)/staff/page.tsx` + `staff-client.tsx`) lists all accounts and opens a "Tambah Staff" dialog. Server actions in [src/server/actions/users.ts](src/server/actions/users.ts): `listCashiers`, `createCashier(role: StaffRole)`. Creation flow: `auth.api.signUpEmail()` then UPDATE role (Better Auth's `additionalFields.role.input: false` still blocks role at sign-up).
- **Role union extended** in [src/lib/types.ts](src/lib/types.ts) to `"owner" | "cashier" | "gudang" | "barista"`. `STAFF_ROLES` (selectable roles, excludes owner) and `ROLE_LABELS` (Indonesian display labels) exported here. Schema's role `text` enum hint was widened to match — no DB migration needed since it was already `text`, not a Postgres enum.
- **Sidebar UX overhaul** ([src/components/app-shell.tsx](src/components/app-shell.tsx)):
  - Logout button moved to the bottom of the sidebar (next to the existing footer card), full-width when expanded / icon-only when collapsed.
  - Dedicated expand button removed. Collapsed sidebar expands by clicking the brand icon or any blank area inside the wrapper (`onClick` with `e.target === e.currentTarget`, keyboard accessible via `role="button" tabIndex={0}` + Enter/Space).
  - Sidebar width is exposed on AppShell root as `--sidebar-width` CSS variable (`4rem` collapsed, `16rem` expanded). Used by the POS mobile bottom bar (`md:left-[var(--sidebar-width,16rem)]`) to stop overlapping the sidebar at tablet width.
  - Avatar dropdown is back to just `Keluar` after the picture-change feature was rolled back (see below).
- **POS polish** ([src/app/(app)/pos/pos-client.tsx](src/app/(app)/pos/pos-client.tsx)):
  - Payment method picker swapped from `Select` dropdown to a 3-up boxy grid with stacked icons: Cash (Banknote) / QRIS (QrCode) / Debit (CreditCard). Active state uses `bg-primary text-primary-foreground`.
  - Category tabs hide their overflow scrollbar (`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`) while keeping swipe-scroll behavior.
  - Mobile bottom bar respects the sidebar via the CSS var above.
- **Responsive stat cards** — Dashboard `StatCard` and Inventory `MiniStat` accept a `compact` prop. The two cramped cards in each grid (Transaksi/Item Terjual on dashboard, Stok Menipis/Stok Habis on inventory) are wrapped in `grid grid-cols-2 gap-4 sm:contents` so on mobile they share one row, and the `compact` versions stack icon-on-top with `flex-col` (reverting to the standard horizontal layout at `sm:`).
- **CLAUDE.md** updated to reflect all the above.

## What's Required Before First Boot

1. Postgres database (Supabase recommended).
2. `.env.local` with `DATABASE_URL`, `BETTER_AUTH_SECRET`, optionally `BETTER_AUTH_URL`.
3. `npm run db:migrate` then `npm run db:seed`.
4. `npm run dev` → log in as `owner@coffeeos.id` / `owner123`.

## What Worked

- **CSS variable for sidebar width** — cleaner than threading the `collapsed` boolean through every component that needs to clear the sidebar.
- **`grid-cols-2 ... sm:contents` wrapper trick** — lets a 2-column mobile subgrid "dissolve" into the parent grid at larger breakpoints without duplicating cards.
- **Hydration-safe theme toggle** — making `aria-label` static and reading `resolvedTheme` only inside `onClick` eliminated the hydration warning without needing a `mounted` state (which the project's lint rule against setState-in-effect would have made awkward).
- **Click-to-expand sidebar via `e.target === e.currentTarget`** — empty-area clicks expand the sidebar without intercepting clicks on nav links or the logout button.

## What Didn't Work / Reverted

- **Picture-changing feature (avatars + brand logo) — built then fully reverted.** Initial implementation stored resized base64 data URLs directly in `user.image` (existing field) and a new single-row `settings` table for the brand logo. Better Auth's `cookieCache` serialized the session, including `user.image`, into the auth cookie → uploading even a small image pushed the cookie past Node's max header size → HTTP 431 "Request Header Fields Too Large" on every subsequent request, plus a Chrome `chrome-error://chromewebdata/` redirect loop because the error page can't auto-reload across protocols. We agreed to move to Supabase Storage instead (URLs, not base64), but the user dismissed the bucket/auth setup prompt and asked to undo the feature. All of: `src/server/actions/profile.ts`, `src/components/image-picker.tsx`, the `0001` migration + snapshot, the `settings` table from schema, the brand-logo wiring in layout/AppShell, the `image` field on `AppShellUser`, and the `ImageDialog` components are gone. `cookieCache` is back to `{ enabled: true, maxAge: 60 * 5 }`. **Recovery script kept**: `npm run db:reset-avatars` ([scripts/reset-avatars.ts](scripts/reset-avatars.ts)) NULLs out any leftover `user.image` values and drops the `settings` table if it still exists — needed if anyone had uploaded an image before the revert.
- **Floating notification button** — tried fixed bottom-right FAB, didn't fit the existing header pattern. Reverted to the in-header bell.
- **`useEffect`-based dialog state sync** — the project's `react-hooks/set-state-in-effect` lint rule rejects `setValue(initial)` inside `useEffect(..., [open, initial])`. Pattern that works: extract dialog body into a child component that's only mounted while `open === true`, so state initializes from props on each mount.

## Known Lint Noise

`src/components/app-shell.tsx:~238` has a pre-existing `react-hooks/set-state-in-effect` error for restoring the collapsed sidebar from localStorage on mount. Not introduced by this pass. Anyone refactoring AppShell should fix it — likely by reading localStorage during initial state (with the `typeof window` guard) instead of in an effect. Also a stale unused-import warning from a commented-out `DialogDescription` in `src/app/(app)/staff/staff-client.tsx` left by the user's manual edit.

## Next Steps

1. **Commit the current working tree** — all last-pass changes are uncommitted (12 modified files + 5 new untracked files). Run `git add` and create a commit before continuing.
2. **Run `npm run db:reset-avatars`** if any test users uploaded a profile picture before the revert, then clear browser cookies for `localhost:3000` and sign in fresh — otherwise the bloated session cookie persists and 431s recur. (No-op if nobody uploaded anything.)
3. **If you want avatars later**: implement via Supabase Storage. Store only the public URL on `user.image` / `settings.brand_logo`. Keep `cookieCache` enabled — URLs are small. User already indicated the preference; the questions about auth method (service role vs anon+RLS) and bucket layout (one bucket with prefixes vs two buckets) were dismissed last time — needs another pass.
4. **Owner-only registration is now `/staff`**, but it only creates non-owner accounts (Kasir / Gudang / Barista). New owners still require direct DB updates (intentional — matches the seed-script security posture). Consider an admin "promote to owner" affordance later.
5. **Fix the pre-existing lint error** in AppShell (see "Known Lint Noise") — read localStorage during initial state with a `typeof window` guard.
6. **Tests** — still no test runner configured.

## Key Files (delta vs prior handoff)

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
