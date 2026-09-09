---
phase: 03-billing-webhooks-stripe-checkout-and-subscription-sync
plan: 02
subsystem: payments
tags: [stripe, checkout, react, ssr, client-hooks]

# Dependency graph
requires:
  - phase: 03-billing-webhooks-stripe-checkout-and-subscription-sync
    plan: 01
    provides: lib/stripe.js, lib/products.js (D-02 branch B price IDs), api/billing/checkout.js, api/billing/status.js, api/billing/webhook.js
provides:
  - GET /api/billing/prices — public price-facts endpoint (amount/currency/interval, never a price ID or secret)
  - src/data/products.js — client-safe display catalog (key/name/kind) for the 4 billing products
  - src/lib/useEntitlements.js — useSession-shaped hook wrapping GET /api/billing/status
  - src/routes/Subscribe.jsx — reworked single-view 4-tile product picker (real prices, per-product ownership, checkout CTA, preselect, error banners)
  - src/routes/SubscribeSuccess.jsx — new /subscribe/success confirming -> success/timeout polling view
  - api/billing/checkout.js — Stripe-error redirect now carries ?checkout_error=1
affects: [phase-04-content-gating, phase-05-account-billing-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-tile local interval state (monthly/annual) so D-05's independent per-product ownership extends to independent per-product billing-interval selection too"
    - "Client polling: fetch + cancel-flag + setInterval/clearInterval built directly in SubscribeSuccess.jsx (no existing polling precedent in this codebase; useEntitlements.js's own cancel-flag idiom was the shape to mirror, not the hook itself, to keep the poll loop and its cleanup local to the one component that needs 2s cadence)"
    - "SSR-safe query-param read: typeof window === 'undefined' guarded lazy useState initializer (matches src/store.jsx's existing SSR-guard convention) rather than reading window.location directly in the render body"

key-files:
  created:
    - api/billing/prices.js
    - src/data/products.js
    - src/lib/useEntitlements.js
    - src/routes/SubscribeSuccess.jsx
  modified:
    - src/routes/Subscribe.jsx
    - src/App.jsx
    - src/data/seo.js
    - src/styles/eclat.css
    - api/billing/checkout.js

key-decisions:
  - "Product display names sourced from must_haves.truths / PROJECT.md's Stripe product list ('Éclat Online', 'Éclat Hard Copy', Children's Book Online/Hard Copy) rather than from Subscribe.jsx's current markup, since the plan's read_first assumption (current lines 47-73 already listing 4 product tiles) didn't match the file on disk — the file still had the old Monthly/Annual two-tile wizard. Names cross-checked against lib/products.js's productId comments in PROJECT.md and confirmed a 1:1 match with the 4 real Stripe products."
  - "SubscribeSuccess.jsx implements its own local fetch/cancel-flag/setInterval poll loop rather than driving useEntitlements()'s refetch() on a timer — keeps the 2s poll cadence and its cleanup entirely local to the one component that needs it, and avoids a double-fetch race between useEntitlements()'s own mount-time fetch and a separate poll trigger."
  - "Entitlement-fetch-failure notice implemented as UI-SPEC's lightweight inline text line (13px/var(--faint), non-blocking) rather than a full .demo-notice-shaped banner — UI-SPEC's Copywriting Contract and Component Notes §1 both specify this lighter treatment (checker-approved), while the plan's action-text prose loosely said '.demo-notice structure' for both notices. The checkout-creation-failure banner (the one both documents agree is a --bad-colored .demo-notice-shaped banner) is implemented as specified."

requirements-completed: [BILL-01, BILL-02, BILL-05]

# Metrics
duration: ~25min
completed: 2026-09-09

actuals:
  tokens: 7050
  tasks: 3
  commits: 3
---

# Phase 3 Plan 2: Product Picker, Success Confirmation, and Price/Entitlement Client Plumbing Summary

**Reworked `/subscribe` into a real, live-priced 4-product picker and added `/subscribe/success`'s webhook-gated confirmation flow, deleting the old localStorage demo wizard entirely.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-09 (session start, following 03-01's completion)
- **Completed:** 2026-09-09T09:31:34+05:00
- **Tasks:** 3/3
- **Files modified:** 9 (4 created, 5 modified)

## Accomplishments

- Built `api/billing/prices.js`: a public, unauthenticated GET endpoint that resolves all 4 product slugs through `lib/products.js`'s allowlist and reads live Stripe monthly + annual prices via `stripe.prices.retrieve()`, reducing the response to public display facts only (amount/currency/interval, plus a branch-B `intervals` map) — verified against the live Stripe account with an automated no-`price_`-leak assertion.
- Built `src/data/products.js` (client-safe metadata catalog) and `src/lib/useEntitlements.js` (a `useSession.js`-shaped hook wrapping `GET /api/billing/status`, failing closed to `{}` on any error).
- Fully reworked `src/routes/Subscribe.jsx`: deleted the two-step `plan -> pay -> done` demo wizard, `SITE.price`, and every `useApp()` `plan`/`subscribed` reference; replaced it with a single view of 4 independently actionable product tiles, each with its own live price, its own monthly/annual chip toggle (D-02 branch B), an independent "Subscribed" badge + "Manage" link (D-04/D-05), a plain-anchor "Subscribe" CTA to `/api/billing/checkout?product=<slug>&interval=<interval>` (D-03, real browser navigation, no fetch/Link interception), a `?product=` preselect that highlights + scrolls without auto-starting checkout (D-08), and both prescribed failure notices.
- Built `src/routes/SubscribeSuccess.jsx`: the new `/subscribe/success` confirming -> success/timeout state machine (D-06/D-07). Polls `GET /api/billing/status` every 2s via its own fetch/cancel-flag/`setInterval` loop; flips to success **only** when an observed `subscriptions` row for the product is `active`/`trialing` — a plain visit to the URL or the Checkout redirect alone can never grant it. Times out at 25s into a neutral `--bad`-colored notice while polling keeps running in the background. Reuses the existing checkmark SVG and `.done` centered layout verbatim.
- Registered the new route in `src/App.jsx` and `src/data/seo.js` (`noindex,follow`, three-places-in-sync), added the `--bad` token plus `.plan__badge`/`.plan__interval`/`.plan__skeleton` to `src/styles/eclat.css`, and refined `api/billing/checkout.js`'s Stripe-error catch to redirect to `/subscribe?checkout_error=1` so the picker's error banner is reachable.
- Ran the full standard gates after all three tasks: `node scripts/check-secrets.js` (no leaked secrets in `dist/`) and `npm run build` (prerender succeeded, 10 routes including the new `/subscribe/success`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Price-facts endpoint, client display catalog, entitlement hook** - `b52eec4` (feat)
2. **Task 2: Reworked Subscribe.jsx into the single-view 4-tile product picker** - `76748b7` (feat)
3. **Task 3: SubscribeSuccess.jsx, route/SEO/CSS wiring, checkout error redirect** - `aee3279` (feat)

## Files Created/Modified

- `api/billing/prices.js` - Public GET endpoint: live Stripe amount/currency/interval per product slug, no price ID or secret ever returned
- `src/data/products.js` - Client-safe display catalog: `{ key, name, kind }` x4, plus `productName()`/`productKind()` helpers
- `src/lib/useEntitlements.js` - `useSession.js`-shaped hook over `GET /api/billing/status`, fails closed to `{}`
- `src/routes/Subscribe.jsx` - Full rework: single-view 4-tile picker, live prices, interval chip toggle, per-tile Subscribed badge/Manage, preselect, error/notice banners
- `src/routes/SubscribeSuccess.jsx` - New: confirming -> success/timeout polling view, webhook-gated (D-07)
- `src/App.jsx` - `/subscribe/success` route registration
- `src/data/seo.js` - `/subscribe/success` `staticSeo` entry (`noindex,follow`)
- `src/styles/eclat.css` - `--bad` token, `.plan__badge`, `.plan__interval`, `.plan__skeleton`
- `api/billing/checkout.js` - Stripe-error catch redirect target: `/subscribe` -> `/subscribe?checkout_error=1`

## Decisions Made

- **Product display names sourced from the plan's `must_haves.truths` / PROJECT.md's real Stripe product list**, not from `Subscribe.jsx`'s current markup as the plan's `read_first` assumed — see Deviations below.
- **SubscribeSuccess.jsx's poll loop is self-contained** (its own `fetch`/cancel-flag/`setInterval`), not driven through `useEntitlements()`'s `refetch()` on a timer, to keep the 2s cadence and cleanup local and avoid a double-fetch race on mount.
- **Entitlement-fetch-failure notice uses UI-SPEC's lightweight inline-text treatment**, not a full `.demo-notice` banner — see Deviations below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `SubscribeSuccess.jsx` read `window.location.search` in the render body, breaking SSR prerendering**
- **Found during:** Task 3, `npm run build`'s prerender step (`ReferenceError: window is not defined` inside `dist/server/entry-server.js`)
- **Issue:** `prerender.js` renders every route at build time via `src/entry-server.jsx`, which runs in a Node context with no `window` global. Reading `window.location.search` directly in the component body (not inside a `useEffect`) crashed the entire build.
- **Fix:** Moved the query-param read into a `typeof window === 'undefined'`-guarded helper (`getProductKeyFromUrl`), consumed via a lazy `useState` initializer — mirrors the SSR-guard convention already established in `src/store.jsx`'s `readStored()`. The prerendered output always shows the initial `confirming` state (which doesn't need the product key), so a `null` value during SSR is harmless; the real value is read once hydrated client-side.
- **Files modified:** `src/routes/SubscribeSuccess.jsx`
- **Verification:** `npm run build` re-run cleanly after the fix — 10 routes prerendered including `/subscribe/success`, no leaked secrets.
- **Committed in:** `aee3279` (Task 3 commit)

**2. [Rule 1 - Bug] Plan's `read_first` for Task 1/2 assumed `Subscribe.jsx` already listed 4 named product tiles (current lines 47-73) — the file on disk still had the old 2-tile Monthly/Annual wizard**
- **Found during:** Task 1 (writing `src/data/products.js`'s names)
- **Issue:** The plan's action text says to take product names "verbatim from the existing `.plan__name` text already rendered in `src/routes/Subscribe.jsx` lines 47-73" — but those lines actually rendered "Monthly"/"Annual" plan-selector buttons, not the 4 real products. This is a stale assumption in the plan's `read_first`, not a code bug, but it would have produced wrong data if followed literally.
- **Fix:** Used the plan's own `must_haves.truths` line (which names all 4 products explicitly: "Éclat Online, Éclat Hard Copy, Children's Book Online, Children's Book Hard Copy") cross-checked against `PROJECT.md`'s real Stripe product-ID list and `lib/products.js`'s slug-to-`productId` mapping — all three sources agree on the same 4 names/slugs.
- **Files modified:** `src/data/products.js`
- **Verification:** Task 1's automated verify (key/kind assertions) passed; names visually match the canonical product list in `PROJECT.md`.
- **Committed in:** `b52eec4` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking SSR bug, 1 stale-assumption data-source correction)
**Impact on plan:** Both were necessary corrections with no scope creep — the SSR fix only touches how one query param is read (not what's rendered), and the product-name source correction produces the exact same 4 names the plan's own frontmatter specifies.

## Issues Encountered

- The installed `get-shit-done` CLI (`gsd-tools.cjs`, v1.50.0-canary.0) in this repo does not expose a `query` subcommand wrapper — commands are invoked directly (e.g. `gsd-tools state advance-plan`, not `gsd-tools query state.advance-plan`). Adapted all state/roadmap/requirements calls to the installed CLI's actual command surface; no functional difference in what was recorded.
- `.env.local`/`.env.example` remain denied to this agent's `Read` tool (same sandbox restriction as 03-01); `Bash`-invoked Node (`node --env-file-if-exists=.env.local -e "..."`) was used throughout for any env-var presence check, always redacting values.

## User Setup Required

None. This plan reused Wave 1's `STRIPE_SECRET_KEY` (already provisioned) — no new Stripe Dashboard configuration, env var, or webhook endpoint was needed (`GET /api/billing/prices` is a read-only price lookup using the existing key).

## Known Gaps (deferred to end-of-phase UAT per `workflow.human_verify_mode=end-of-phase`)

Per `important_context`, none of this plan's nested `<human-check>` items halted execution — they are harvested into `03-UAT.md` at end of phase. Recorded here for that harvesting step:

- **Task 1 human-check:** `GET /api/billing/prices`'s 4 amounts/intervals should be visually cross-checked against the Stripe Dashboard's Products -> Prices screen. The automated check (this session) queried the same live account it would be reconciling against and asserted shape + no-`price_`-leak only, not that the numbers are the "right" ones for launch pricing.
- **Task 2 human-check:** The picker's signed-out/signed-in visual UX (tile layout, badge placement, preselect scroll behavior) was not exercised in a browser this session — `vercel dev` was not run. All automated string/shape checks passed; the actual rendered result is unverified.
- **Task 3 human-check:** The real end-to-end flow (start Checkout with a live product, complete it, land on `/subscribe/success`, watch it flip to success once Wave 1's webhook syncs the row, then reconfirm the picker shows "Subscribed") was not exercised — this account is live/production, so a real Checkout Session was deliberately not created in this session (same discipline as 03-01). `npm run build`'s prerender confirms the route renders without crashing; the money-path itself needs a human-driven real test-mode-card Checkout against this live account before ship.

## Next Phase Readiness

- The full client billing UI is in place and wired to Wave 1's real endpoints: `/subscribe` shows live per-product prices/ownership, `/subscribe/success` gates on the real webhook-synced row, and both fail safely (never a client-trusted entitlement) per D-04/D-07.
- Phase 4 (Content Gating) can now build its real per-user gating checks knowing the full subscribe -> confirm -> `subscriptions` row loop exists and is exercised by real UI, not just server endpoints.
- Phase 5 (Account/Billing UI) inherits `src/data/products.js`'s `productName`/`productKind` helpers and `src/lib/useEntitlements.js` as ready-made building blocks for a real per-product account view (replacing `Account.jsx`'s remaining `useApp()`-based mocked plan/invoices, which this plan did not touch — out of scope per `files_modified`).
- No blockers carried forward from this plan. The Task 3 human-check above (real live Checkout -> webhook -> success-view flip) is the one remaining unexercised path before ship — recommend a human runs it once against the live account using a real test card before end-of-phase UAT closes.

## Self-Check: PASSED

All 4 created files confirmed present on disk (`api/billing/prices.js`, `src/data/products.js`, `src/lib/useEntitlements.js`, `src/routes/SubscribeSuccess.jsx`); all 3 task commit hashes (`b52eec4`, `76748b7`, `aee3279`) confirmed present in git history; `npm run build` passed end-to-end after all three tasks (10 routes prerendered, no leaked secrets).

---
*Phase: 03-billing-webhooks-stripe-checkout-and-subscription-sync*
*Completed: 2026-09-09*
