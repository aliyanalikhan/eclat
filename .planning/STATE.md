---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 05
current_phase_name: account-management-real-status-cancellation-billing-portal
status: executing
stopped_at: context exhaustion at 75% (2026-09-10)
last_updated: "2026-09-10T04:49:11.461Z"
last_activity: 2026-09-10
last_activity_desc: Phase 05 re-verified after gap closure (05-VERIFICATION.md) — 5/5 must-haves pass, status human_needed — run /gsd-verify-work 05 to work through 05-UAT.md
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 14
  completed_plans: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-09)

**Core value:** A signed-in subscriber's paid access is real and enforced server-side — no page, download, or API response leaks paid content to someone who hasn't actually paid for it.
**Current focus:** Human UAT for both Phase 4 (04-UAT.md) and Phase 5 (05-UAT.md) — both phases are code-complete and goal-verified (5/5 and 5/5 must-haves respectively) but held open pending live-environment sign-off before either can be marked Complete

## Current Position

Phase: 05 (Account Management — Real Status, Cancellation & Billing Portal) — GAPS CLOSED, PENDING HUMAN VERIFICATION (5/5 must-haves verified)
Plan: 3 of 3 executed. 05-03 closed all 3 confirmed gaps (CR-01/CR-02/CR-03) plus an emergent critical bug (account.js `rows` destructuring) its own code review caught
Status: Code review clean (0 findings after fix), phase-goal re-verification passed 5/5 — 5 items in 05-UAT.md need a live vercel dev + seeded DB + real Google/Stripe session before the phase is fully closed
Last activity: 2026-09-10 -- Phase 05 re-verified after gap closure; status human_needed — run /gsd-verify-work 05 to work through 05-UAT.md

Progress: [████████████░░░░░░░░] 60% (3/5 phases complete; Phase 4 and Phase 5 both code-complete and goal-verified, both pending human UAT sign-off)

## Performance Metrics

**Velocity:**

- Total plans completed: 13
- Average duration: ~26 min
- Total execution time: ~5.7 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3 | - | - |
| 02 | 3 | - | - |
| 03 | 3 | - | - |
| 04 | 2 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 03 P01 | 48min | 3 tasks | 9 files |
| Phase 03 P02 | 25min | 3 tasks | 9 files |
| Phase 03 P03 | 13min | 3 tasks | 2 files |
| Phase 04 P01 | 26min | 5 tasks | 7 files |
| Phase 04 P02 | 11min | 6 tasks | 11 files |
| Phase 05 P01 | 28min | 3 tasks | 3 files |
| Phase 05 P02 | 22min | 4 tasks | 2 files |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 05 P03 | 4min | 3 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Research: Session (identity) and entitlement (access) are kept structurally separate — entitlement is always a live DB read per gated request, never baked into a session cookie/JWT. Phase 4's content-gating checks should follow this same split.
- Phase 3: D-02 resolved to branch B: all 4 Stripe products have 2 active recurring prices each (monthly + annual), verified live against the real Stripe account
- Phase 3: lib/db.js extended to export `db` (pooled client) alongside `sql`, since the HTTP-based `sql` tagged template has no multi-statement transaction support but the webhook handler needs one — Phase 4 can reuse `db` if it needs a transaction too
- Phase 3: ran against the LIVE production Stripe account throughout (user's explicit, informed choice) — subsequently confirmed end-to-end via a real Checkout purchase during UAT, so this is now fully closed, not a carry-forward risk
- Phase 3: format-aware gating (GATE-03, Hard Copy vs. Online as independent entitlements) is encoded in `subscriptions.stripe_product_id` per-product rows — Phase 4's schema/query design should read against this directly
- Phase 4 (via /gsd-discuss + /gsd-research, D-01..D-17): gated content = Editions excerpt paragraphs only; writings gated by `eclat-online`; Hard Copy = zero digital access; only `status = 'active'` is entitled; gated text leaves `src/` entirely (D-11) and is served per-request by `GET /api/content/editions/:no` (D-15 fail-closed contract, D-17 single-edition) with `no-store` every branch + `vercel.json` defense-in-depth (D-16); render strategy = static shell + client-fetched gated block via new `src/lib/useSafeFetch.js` (D-07..D-09, backported into `useEntitlements`); not-entitled = silent `.plan__skeleton` (signed-out) / `--bad` fine-print (signed-in) per D-12/D-13; listing labels stay cosmetic & session-independent (D-14)
- Phase 4: Plan 04-01 implemented the dynamic entitlement route at api/content/editions/[no].js (Vercel bracket-segment convention) rather than the plan's literal api/content/editions.js — required for Vercel to actually route :no path segments
- Phase 4: Plan 04-02 restored content.js editions[].excerpt as FREE-ONLY 2-paragraph arrays and re-targeted check-secrets.js's marker to 'quiet luxury of authenticity' — npm run build is green end-to-end again; Phase 4 is complete (GATE-01..GATE-05 all delivered)
- Phase 4: Plan 04-02's --bad fetch-failure fine print uses className="fine" + inline style={{ color: 'var(--bad)' }} rather than a fine--bad CSS class (no such class exists in eclat.css; this phase makes zero CSS additions by design) — matches the existing inline-style convention already used in Subscribe.jsx/SubscribeSuccess.jsx for the same color
- Phase 4: Plan 04-02 left Account.jsx's Plan/Renews/Card fields and billing-history rows as explicitly-deferred placeholders (real plan cadence, renewal date, card-on-file, and per-user invoice history are Phase 5's ACCT-01/ACCT-04 scope) — see 04-02-SUMMARY.md Known Stubs
- Phase 5 (via /gsd-plan-phase 5, locked D-01..D-16): two-wave plan — Wave 1 (05-01, server) adds lib/products.js reverse maps (PRODUCT_ID_TO_KEY / PRICE_ID_TO_PRODUCT_KEY / planLabelFor), the new sibling GET /api/billing/account (DB-always-200 + three independent best-effort live Stripe sections; no-store every branch), and POST /api/billing/portal (CSRF-first via isSameOriginNavigation, own-customer scoped, PUBLIC_ORIGIN return_url); Wave 2 (05-02, client) adds src/lib/useAccount.js (the third useSafeFetch consumer) and rebuilds src/routes/Account.jsx (per-product panels in D-16 order, 3-state status, D-13 plan label, D-14 state-aware Renews/Access-until, ACCT-04 Payment-failed notice, one D-12 invoice table, portal POST handlers fixing WR-01). Both plans carry <threat_model> blocks (security gate); plan-checker passed with 0 blockers
- Phase 5 (executed 2026-09-10, commits 362c693..83ce821): **both waves complete.** Wave 1 shipped server-only reverse maps + GET /api/billing/account (locked per-slug contract; renews server-pre-formatted 'D MMM YYYY'; DB-always-200 with three best-effort Stripe sections) + POST /api/billing/portal (CSRF-first, own-customer, PUBLIC_ORIGIN return_url). Wave 2 shipped src/lib/useAccount.js (fail-closed, single-shot) and the full Account.jsx rebuild (real per-product panels in PRODUCTS order, 3-state status map with '—' fail-closed, state-aware CTA, ACCT-04 --bad notice with zero new CSS, one all-products invoice table, openPortal = POST + location.assign, WR-06/WR-01 verified). `npm run build` green, check-secrets clean, 31/31 client verifier checks PASS. **PLAN-DEFECTS documented in 05-02-SUMMARY/VERIFICATION:** plan's "Subscribe == exactly 1" and "Update payment method ≥ 2" counts are unsatisfiable vs the Copywriting Contract (implemented per contract); `node --check` cannot parse .jsx (build gate used instead). Remaining: end-of-phase human verification matrix (M1–M12) with `vercel dev` + real Google session + seeded DB.
- [Phase ?]: Phase 5 gap-closure (05-03): closed CR-01 (useSafeFetch now fails closed on any non-2xx/non-401 response; account.js DB-catch returns distinct 500), CR-02 (invoiceItems reads a single held key instead of duplicating the shared invoice list across held products), and CR-03 (cancelAtPeriodEnd now drives the Access-until label plus a confirmation notice, CTA left reachable) — zero regression to Phase 3/4 signed-out rendering, confirmed structurally via git diff.

### Pending Todos

None yet.

### Blockers/Concerns

- **RESOLVED (2026-09-10, plan 05-03): all 3 of Phase 5's confirmed critical defects are closed**, plus a 4th emergent critical bug found during 05-03's own code review. (1) CR-01 fixed: `src/lib/useSafeFetch.js` now throws before parsing the body for any non-2xx/non-401 response, and `api/billing/account.js`'s DB-failure branch returns a distinct 500 instead of reusing the "no session" 401 shape — verified not to regress Phase 3/4's `useEntitlements`/`useGatedContent` (both untouched by the fix, 401 stays exempt). (2) CR-02 fixed: invoices now read from a single held product key instead of being flattened across all held products. (3) CR-03 fixed: `cancelAtPeriodEnd` now drives the "Access until" label plus a new confirmation notice, with the "Manage" CTA deliberately left reachable. (4) **Emergent bug found+fixed during 05-03's code review**: `api/billing/account.js` was assigning the raw `@vercel/postgres` `QueryResult` object to `rows` instead of destructuring `{ rows }` — every other query site in the codebase does this correctly — which threw an unhandled `TypeError` on every authenticated request to `/api/billing/account`, meaning the endpoint had never returned real data for any user since Plan 05-01 first shipped it. Fixed in commit `a01e33c`. Phase re-verified 5/5 must-haves after these fixes; 5 items remain in `05-UAT.md` requiring a live environment.
- Phase 4 (Content Gating): **prerender-split blocker resolved** — D-10 locks `/editions/:no` as static shell + client-fetched gated block with the route-list trio (`src/App.jsx`, `src/data/seo.js`, `prerender.js`) untouched. Remaining Phase 4 risk is the physical content split: gated text must leave `src/` entirely (D-11) with zero residual import paths (see RESEARCH.md Common Pitfalls 1–2).
- **NEW (fix-pass):** `PUBLIC_ORIGIN` env var must be set (`.env.local` + Vercel) to the canonical `https` origin before `api/billing/checkout.js` can run — it now fails fast at module load without it (WR-07). `src/data/seo-site.js`'s `SITE.url` is still the `https://eclat.example` placeholder and is NOT used for this.
- Phase 3 code review fix pass: **complete** (2026-09-09) — all 10 warnings (WR-01..WR-10) and IN-01/IN-02 fixed and verified by a green `npm run build` (see `03-REVIEW.md` Fix-Pass Results). Remaining review items now folded into Phase 4 research/planning: IN-01 → D-16 (`no-store` on every gated branch + `vercel.json` rule), IN-03 → D-07..D-09 (`useEntitlements` backported onto shared `useSafeFetch`, delivered in Plan 04-02), IN-04 still deferred to Phase 5.
- [Phase 2] Cosmetic: `.env.example` documents an unused `SESSION_SECRET=` line (WR-07) — no code reads it, `hashToken()` uses plain SHA-256 by design. Fix was blocked by a sandbox permission restriction on that filename during the review-fix pass; low priority, safe to clean up whenever that file is next touched.
- **RESOLVED**: Phase 4's prerender-build blocker (Edition.jsx read `ed.excerpt` after Wave 1 deleted it) is fixed by Plan 04-02's excerpt restore — `npm run build` is green end-to-end.
- Phase 4 UAT carry-forward: the live 4-state entitlement matrix (signed-out / signed-in non-subscriber / signed-in active subscriber / signed-in + API 5xx) has not been exercised against a real `vercel dev` + seeded Postgres + real Google session in either 04-01 or 04-02's execution sessions — recommended before this phase is considered fully verified in production (see both plans' SUMMARY `human_judgment: true` items).
- Phase 5 UAT carry-forward: Wave 1's live Stripe enrichment branches (real card + paid invoices, past_due row, portal round-trip, CSRF matrix) and Wave 2's full manual matrix (M1–M12 in 05-02-VERIFICATION.md: multi-product panels, ACCT-04 notice on a real past_due row, >12 invoice table, forced degradations, portal redirect + remount refresh) require `vercel dev` + seeded DB + real Google session — automated gates are green; the end-of-phase human verification pass is the remaining gate before Phase 5 is "verified".

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260909-kco | Fix checkout.js hard-failing on a stale/invalid stored stripe_customer_id | 2026-09-09 | 5916f7f | [260909-kco-fix-checkout-js-hard-failing-on-a-stale-](./quick/260909-kco-fix-checkout-js-hard-failing-on-a-stale-/) |
| 260909-l31 | Fix /subscribe page card grid layout: equal-height cards, no orphaned card, aligned buttons | 2026-09-09 | 7b337a2 | [260909-l31-fix-subscribe-page-card-grid-layout-equa](./quick/260909-l31-fix-subscribe-page-card-grid-layout-equa/) |
| 260910-vid | Separate hero fan to magazines-only; add /videos section (8 oEmbed-verified American culture/history clips, click-to-play modal, CSP update) | 2026-09-10 | 50dc6af, 378e1e6 | [260910-vid-add-videos-section-separate-hero-fan](./quick/260910-vid-add-videos-section-separate-hero-fan/) |
| 260910-soon | Fill empty hero fan slots with blurred "Coming Soon" cards; iterated flat tint -> stock photo -> drawn CSS covers -> 4 varied looks + real glassmorphism | 2026-09-10 | e051aa3, 21f9da5, 34a1e02, cde2156 | [260910-soon-hero-fan-coming-soon-cards](./quick/260910-soon-hero-fan-coming-soon-cards/) |
| 260910-icon | Add "Cultural Icons" decorative section to Home page (8 user-supplied tribute images + bios, uniform sizing; renamed from "American Icons") | 2026-09-10 | 2af6218, 67952bd, cc7386a | [260910-icon-american-icons-home-section](./quick/260910-icon-american-icons-home-section/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none — first milestone)* | | | |

## Session Continuity

Last session: 2026-09-10T04:49:11.433Z
Stopped at: context exhaustion at 75% (2026-09-10)
Resume file: None
