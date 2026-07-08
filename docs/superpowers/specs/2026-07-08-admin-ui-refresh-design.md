# Ailem Admin — Modern-SaaS Visual Refresh

**Date:** 2026-07-08 · **Branch:** `feat/admin-ui-refresh` · **Status:** approved (mockup), implementing

## Goal
Visually refresh the entire admin panel (shell + all 16 sections) into a Linear/Vercel-style
"Modern SaaS" look: refined cool-neutral palette, hairline borders, tight typography, Ailem red
as a restrained accent, semantic status colors, and first-class dark mode. **No layout/UX rework,
no logic changes** — purely presentational. Customer-facing site is untouched.

## Constraints
- Scope everything under an admin root class (`.admin-ui`) so the token layer never leaks to the shop.
- Keep it CSS-variable driven (component classes), not Tailwind `dark:` — avoids touching customer styles.
- Preserve every handler, `value=`, and status key. Uzbek strings stay as-is (already translated).
- Desktop-only (admin is desktop-only today).

## Design tokens (scoped to `.admin-ui`)
Light: `--bg #f6f7f9 · --surface #fff · --surface-2 #fafbfc · --sidebar #fbfcfd · --border #e7e9ee ·
--text #141619 · --text-2 #5b6472 · --text-3 #8a92a0 · --accent #ed2224 · --accent-ink #c41a1c ·
--accent-weak rgba(237,34,36,.09)`. Semantic: `ok #15935a · warn #b7791f · danger #d1352f · info #2563eb`
(+ `-weak` tints). Radii `--r 10 / --r-sm 7`. Subtle shadows.
Dark: `--bg #0c0d0f · --surface #141619 · --surface-2 #181b1f · --sidebar #101215 · --border #23262c ·
--text #e8eaee · --text-2 #98a1af · --text-3 #6b7482 · --accent #ff5254`; semantic brightened.
Theme via `data-theme` on `.admin-ui` (default = `prefers-color-scheme`), toggle persisted in localStorage.

## Component classes (in globals.css, `@layer components`, all prefixed `a-`)
`a-card / a-card-h`, `a-btn / a-btn-primary`, `a-input`, `a-kpi`, `a-nav / a-nav-active`,
`a-table` (th/td hairline, tabular nums), `a-pill` (+ `ok warn danger info`), `a-tab`, `a-avatar`.
Reference styling: the approved mockup (`scratchpad/ailem-admin-refresh.html`).

## Staging (verify build + visual after each; deploy only when user approves)
1. **Foundation** — token layer + `a-*` component classes in globals.css; wire `.admin-ui` root +
   theme toggle/persist. (Invisible until classes are applied.)
2. **Shell** — sidebar (grouped nav, active indicator, counts, brand) + top bar (title, ⌘K search,
   theme toggle, notifications, avatar) in `DesktopAdminPanel`.
3. **Shared** — `StatCard` → `a-kpi`; establish `a-card`/`a-table`/`a-pill`/`a-btn` on Dashboard.
4. **Cascade** — apply the component classes section by section: Orders → Products → Analytics →
   Users → Reviews → the rest. Verify each.

## Verification
`npm run build` after every stage; live drive in Chrome (authenticated) before deploy. Status pills
map to `getStatusLabel` output. Rollback = branch is isolated; nothing deploys until approved.
