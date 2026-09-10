---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-09-10T02:27:00.000Z"
last_activity: 2026-09-10 -- Phase 05 Wave 2 executed; both plans complete, phase pending human verification
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 13
  completed_plans: 13
  percent: 92
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-09)

**Core value:** A signed-in subscriber's paid access is real and enforced server-side — no page, download, or API response leaks paid content to someone who hasn't actually paid for it.
**Current focus:** Phase 05 — Account Management — Real Status, Cancellation & Billing Portal

## Current Position

Phase: 05 (Account Management — Real Status, Cancellation & Billing Portal) — EXECUTED (pending human verification)
Plan: 2 of 2
Status: Phase 05 both plans complete; awaiting end-of-phase human verification
Last activity: 2026-09-10 -- Phase 05 Wave 2 executed; both plans complete, phase pending human verification

Progress: [███████████████████░] 92% (4/5 phases complete; Phase 4 and Phase 5 both executed with automated gates green, pending human sign-off)

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

### Pending Todos

None yet.

### Blockers/Concerns

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

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none — first milestone)* | | | |

## Session Continuity

Last session: 2026-09-10T02:27:00.000Z
Stopped at: Phase 5 both plans executed (Wave 1: server endpoints; Wave 2: useAccount + Account.jsx rebuild) — automated gates green; end-of-phase human verification pending (see 05-02-VERIFICATION.md manual matrix M1–M12 and 05-01 human_judgment items)
Resume file: .planning/phases/05-account-management-real-status-cancellation-billing-portal/05-02-VERIFICATION.md
