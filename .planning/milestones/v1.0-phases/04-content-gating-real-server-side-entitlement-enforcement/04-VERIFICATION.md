---
phase: 04-content-gating-real-server-side-entitlement-enforcement
verified: 2026-09-09T23:12:08Z
status: human_needed
score: 8/8 truths verified (structural evidence); 0 present-behavior-unverified
behavior_unverified: 0
overrides_applied: 0
gaps: []
deferred:
  - truth: "Account.jsx billing history/card/plan fields show real per-user data instead of placeholders"
    addressed_in: "Phase 5"
    evidence: "Phase 5 success criteria: 'User sees their real invoice history on the Account page, replacing today's mocked invoice table' and 'User sees their real subscription status ... and renewal date' (ACCT-01/ACCT-03/ACCT-04)"
human_verification:
  - test: "Exercise the live entitlement matrix against a seeded Postgres DB and a real Google-authenticated session: (a) active eclat-online subscriber -> /editions/2 and /editions/1 unlock; (b) canceled eclat-online row -> paywall; (c) active eclat-hardcopy-only row (no eclat-online row) -> paywall (GATE-03/D-04 hard-copy grants zero digital access); (d) past_due eclat-online row -> paywall (GATE-04/D-06); (e) no session cookie -> 401 skeleton, no --bad fine print; (f) signed-in + API 5xx -> paywall + \"Couldn't confirm your subscription — reload to try again.\""
    expected: "(a) 200 {entitled:true, content:{paragraphs:[3 items]}}, unlocked prose renders, no-store on every response; (b)/(c)/(d) 200 {entitled:false, has_session:true}, ordinary paywall, ordinary fine print; (e) 401 {entitled:false, has_session:false}, skeleton, no fine print; (f) --bad fine print only, exactly as coded"
    why_human: "No Jest/Vitest/Playwright test suite exists anywhere in this codebase (confirmed: no *.test.*/*.spec.* files, no test script in package.json), and this verification run has no live Postgres/Stripe/Google-OAuth session available. The entitlement query, session helper, and 4-kind client hook are all structurally correct by direct code read (verified below), but the live cross-product/cross-status matrix has never been exercised end-to-end against real rows — both 04-01-SUMMARY.md (D3) and 04-02-SUMMARY.md (D8, D10) explicitly flag this same gap and recommend it for end-of-phase UAT."
  - test: "Confirm scripts/check-secrets.js's SERVER_ONLY_IMPORT_MARKERS check actually catches a gated-text leak reintroduced into PRERENDERED HTML (not just dist/assets/*.js)"
    expected: "Reintroducing 'quiet luxury of authenticity' into any dist/<route>/index.html file should make `node scripts/check-secrets.js` exit 1"
    why_human: "Verified by direct reproduction during this run: the marker-check loop is gated behind `if (file.startsWith(CLIENT_BUNDLE_DIR))` where CLIENT_BUNDLE_DIR = dist/assets — prerendered route HTML lives at dist/<route>/index.html and never matches that prefix. I appended the gated marker phrase into dist/editions/1/index.html and reran `node scripts/check-secrets.js`; it printed 'no leaked secrets found' (exit 0) instead of failing. This is exactly the leak vector (D-02: gated text landing in prerendered HTML) this guard exists to catch permanently, and it currently does not. This was already flagged by the phase's own 04-REVIEW.md as WR-01 (warning, not critical) — a human should decide whether to require a fix before Phase 5 or accept as tracked follow-up debt."
---

# Phase 4: Content Gating — Real Server-Side Entitlement Enforcement Verification Report

**Phase Goal:** Gated content is served only to users with a real, current, server-verified entitlement — the demo `subscribed` localStorage flag and every read site are gone for good.
**Verified:** 2026-09-09T23:12:08Z
**Status:** human_needed
**Re-verification:** No — initial verification (no prior VERIFICATION.md existed; ROADMAP/STATE "Complete" marks were not treated as evidence)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GATE-01: Every gated route re-derives entitlement from the live `subscriptions` table on each request, server-side | ✓ VERIFIED | `api/content/editions/[no].js` runs `SELECT 1 FROM subscriptions WHERE user_id=... AND stripe_product_id=... AND status='active' LIMIT 1` inline inside the handler on every call — no module-scope cache, no memoization. Session cookie only resolves identity (`lib/session-user.js`), never access. |
| 2 | The entitled predicate is `status = 'active'` ONLY — past_due/canceled/unpaid/incomplete are not-entitled | ✓ VERIFIED | Query literal is `status = 'active'`; `grep -c "trialing"`/`grep -c "IN ("`/`grep -c "<>"` all return 0 in `api/content/editions/[no].js`. |
| 3 | GATE-03: Product is `eclat-online` ONLY for the editions gate — Hard Copy rows grant zero digital access | ✓ VERIFIED | Query binds `getProduct('eclat-online').productId` (`prod_VAyHWfX8XdHh2z`) as the sole product filter; `lib/products.js` confirms `eclat-hardcopy`/`book-hardcopy` have distinct `productId` values that can never match this WHERE clause. |
| 4 | The gated text source is server-only and physically absent from `src/` and the shipped client bundle/prerendered HTML | ✓ VERIFIED | `lib/gated-content.js` lives outside `src/`; `grep -rn "gated-content" src/` → 0 hits. Built `npm run build` then `grep -rl "quiet luxury of authenticity" dist/` and `grep -rl "continues for subscribers" dist/` → both 0 hits (verified directly in this run, not just trusted from SUMMARY). |
| 5 | GATE-04: Every response branch of the gated route carries `Cache-Control: no-store`, reinforced by a `vercel.json` rule | ✓ VERIFIED | All 5 branches (404 bad `:no`, 401, 200-not-entitled, 200-entitled, 500) set `Cache-Control: no-store` inline; `vercel.json` has a `/api/content/(.*)` no-store rule correctly ordered between `/assets/(.*)` (unmodified) and the `/(.*)` CSP catch-all (unmodified). |
| 6 | The response contract has no 403 path and exactly matches D-15 (401/200-false/200-true/404) | ✓ VERIFIED | Read `api/content/editions/[no].js` end-to-end — exactly the 4 branches specified, no 403 anywhere, single-edition payload only (no full-archive dump). |
| 7 | GATE-02: The demo `subscribed`/`plan`/`gate()`/`eclat:demo-state` mechanism is removed from every read site (`store.jsx`, `Account.jsx`, `Books.jsx`, `Writings.jsx`, `Archive.jsx`) | ✓ VERIFIED | `src/store.jsx` now exposes only `lightbox`/`flipFrom` state (read in full). Repo-wide `grep -rn "subscribed\b"` → only an unrelated "You're subscribed." string in `SubscribeSuccess.jsx`; `grep -rn "eclat:demo-state"` / `"setSubscribed"` / `"setPlan\b"` / `"Reset demo state"` / `"gate("` (excluding `navigate(`) → 0 real hits. `Account.jsx` now derives its panel from real `useSession()` + `useEntitlements()`, fails closed to `'Free tier'`/`'—'`. Listing labels are static text with zero entitlement fetch. |
| 8 | GATE-05: The not-entitled view (signed-out AND signed-in non-subscriber) renders the exact same paywall markup as before, with only the gated-text slot swapped for a neutral skeleton; entitled view replaces the shell with the API's authoritative paragraphs (no duplication) | ✓ VERIFIED | Read `src/routes/Edition.jsx`'s render logic directly — 4-branch state table (`entitled`/`loading`/`notEntitled`/`unknown`) matches the plan's spec exactly; `.paywall`/`.prose__blur`/`.paywall__cta`/`.plan__skeleton` CSS classes all still exist in `eclat.css`; prerendered `dist/editions/2/index.html` confirmed to contain `plan__skeleton` in the loading shell, not gated text. |

**Score:** 8/8 truths verified by direct code inspection, build execution, and grep evidence (not SUMMARY claims). 0 present-behavior-unverified. However, the live cross-product/cross-status entitlement matrix (real DB rows + real session) was not exercised in this verification run — see Human Verification below, which is why overall status is `human_needed` rather than `passed`.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | `Account.jsx`'s Plan/Renews/Card fields and Billing History table show placeholder/mocked values (`'—'`, `'•••• 4242'`, static `invoices` array) rather than real per-user Stripe data, even for genuinely active subscribers (04-REVIEW.md WR-04) | Phase 5 | Phase 5 goal: "A user can view and manage their real subscription from the Account page — status, renewal date, invoices, and cancellation are all backed by live Stripe data instead of mocks"; success criteria 1 and 3 explicitly cover renewal date and invoice history (ACCT-01/ACCT-03/ACCT-04) |

This item is NOT a Phase 4 gap: Phase 4's own plan frontmatter explicitly authorized it ("billing details are placeholder until Phase 5"), and the *entitlement source* driving `active` is real (GATE-02's actual scope) — only the *billing-detail presentation* remains a placeholder, which is Phase 5's stated job.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/session-user.js` | Shared fail-closed `getSessionUser(request)` — identity only | ✓ VERIFIED | Exists, exports `getSessionUser`, no-cookie/no-row/DB-error all return `null`; zero `subscriptions`/`stripe_product_id`/`status` references (identity/entitlement separation held). |
| `lib/gated-content.js` | Server-only gated paragraph source, `gatedParagraphsFor`/`editionExcerptBy` | ✓ VERIFIED | Exists outside `src/`; frozen data matches the exact free+gated paragraph split; `gatedParagraphsFor(99)` returns `undefined`-coalesced via `?? null` → `null` for unknown editions. |
| `api/content/editions/[no].js` | `GET /api/content/editions/:no` — D-15 contract | ✓ VERIFIED (implemented at a different path than the plan's literal filename, correctly — see Decisions below) | Plan named the file `api/content/editions.js`; actual implementation is at `api/content/editions/[no].js` (Vercel's dynamic-segment convention) — a documented, justified deviation (both SUMMARYs explain this is *required* for the route to function at all). Route logic matches the D-15 contract exactly. |
| `vercel.json` | `/api/content/(.*)` no-store rule between assets and catch-all | ✓ VERIFIED | Confirmed 3-rule order: `/assets/(.*)` → `/api/content/(.*)` → `/(.*)`; valid JSON; assets/catch-all rules byte-identical to before. |
| `scripts/check-secrets.js` | Permanent guard proving gated text absent from shipped output | ⚠️ ORPHANED SCOPE (partial) | Entry exists (`'quiet luxury of authenticity'`) and the check passes on a clean build. However, reproduced directly in this run: the marker-check loop only scans `dist/assets/*` (`CLIENT_BUNDLE_DIR`), never prerendered route HTML (`dist/<route>/index.html`) — exactly where the original D-02 leak manifested. A reintroduced leak into prerendered HTML would NOT be caught by this guard today (04-REVIEW.md WR-01, confirmed live). See Human Verification. |
| `src/lib/useSafeFetch.js` | Abort-cancel, latest-request-wins fetch primitive | ✓ VERIFIED | Effect owns the abort; monotonic `idRef` guard; abort-by-newer-request never sets `error:true` (checked by direct code read of the ordering). |
| `src/lib/useGatedContent.js` | 4-kind Edition gated-block hook | ✓ VERIFIED | Maps `useSafeFetch` state onto exactly `loading`/`unknown`/`notEntitled`/`entitled`; never reads `has_session` (`grep -n "has_session" src/lib/useGatedContent.js` → 0). |
| `src/data/content.js` | Free-only 2-paragraph excerpts + Vol 1 `excerptBy` | ✓ VERIFIED | Matches `lib/gated-content.js`'s first two paragraphs verbatim; gated 3rd paragraph of each edition absent. |
| `src/routes/Edition.jsx` | Gated block rewritten onto `useGatedContent`+`useSession` | ✓ VERIFIED | No `subscribed` reference; 4-branch render matches spec; `--bad` fine print appears exactly once, gated on `kind === 'unknown' && sessionOk`. |
| `src/store.jsx` | Demo state removed | ✓ VERIFIED | Only `lightbox`/`flipFrom`/`openLightbox`/`closeLightbox`/`setFlipFrom` remain; no `localStorage`, no `useEffect` persistence. |
| `src/routes/Account.jsx` | Real-entitlement-driven panel, no "Reset demo state" | ✓ VERIFIED | Uses `useSession()`+`useEntitlements()`; `active` derived from `status === 'active'` (D-06 predicate, no `IN (...)`); no "Reset demo state" block anywhere. |
| `src/routes/Books.jsx`/`Writings.jsx`/`Archive.jsx` | Static cosmetic labels, no entitlement fetch | ✓ VERIFIED | `gate()` calls removed; labels are plain strings; no `useEntitlements` import on any of the three files. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `api/content/editions/[no].js` | `lib/session-user.js` | `getSessionUser(request)` → null means 401 | ✓ WIRED | Confirmed by direct read. |
| `api/content/editions/[no].js` | `lib/products.js` | `getProduct('eclat-online').productId` bound as query param | ✓ WIRED | Confirmed. |
| `api/content/editions/[no].js` | `lib/gated-content.js` | `gatedParagraphsFor(editionNo)` called only after entitlement passes | ✓ WIRED | Confirmed — IDOR-safe ordering (entitlement check before edition lookup). |
| `api/billing/status.js` | `lib/session-user.js` | Refactored onto shared helper, byte-identical responses | ✓ WIRED | Confirmed; `api/auth/session.js`/`api/billing/checkout.js` untouched (`git log` confirms last touch pre-Phase-4). |
| `vercel.json` | `api/content/editions/*` | Header rule `source: "/api/content/(.*)"` | ✓ WIRED | Confirmed correct rule order. |
| `src/routes/Edition.jsx` | `src/lib/useGatedContent.js` | `useGatedContent(ed.no, { ok: sessionOk })` | ✓ WIRED | Confirmed; session supplied by caller, never read from API (D-13 honored). |
| `src/routes/Account.jsx` | `src/lib/useEntitlements.js` | `subs['eclat-online']` drives Status/upsell | ✓ WIRED | Confirmed. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `api/content/editions/[no].js` | `paragraphs` | `gatedParagraphsFor(editionNo)` ← frozen module data (server-only) | Yes — real, non-empty, edition-specific | ✓ FLOWING |
| `api/content/editions/[no].js` | entitlement decision | live `SELECT 1 FROM subscriptions ...` per request | Yes — fresh DB read, no cache | ✓ FLOWING |
| `Edition.jsx` entitled branch | `paragraphs` | `useGatedContent` ← `useSafeFetch` ← `fetch('/api/content/editions/'+no)` | Yes — real API response | ✓ FLOWING |
| `Account.jsx` `active` | `subs['eclat-online'].status` | `useEntitlements` ← `useSafeFetch` ← `fetch('/api/billing/status')` ← live `subscriptions` SELECT | Yes | ✓ FLOWING |
| `Account.jsx` Card/Plan/Renews/Billing-history | hardcoded `'•••• 4242'` / `'—'` / static `invoices` import | none (explicitly deferred placeholder) | No | ⚠️ STATIC (explicitly deferred to Phase 5, see Deferred Items) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full production build succeeds end-to-end (client + SSR + prerender + secrets scan) | `npm run build` | `check-secrets: no leaked secrets found in dist/`, 10 routes prerendered, exit 0 | ✓ PASS |
| Gated phrases absent from shipped output | `grep -rl "quiet luxury of authenticity" dist/`; `grep -rl "continues for subscribers" dist/` | both exit 1 (no matches) | ✓ PASS |
| Free phrase legitimately ships (confirms excerpt restore, not an over-deletion) | `grep -rl "the work of decades, not quarters" dist/` | matches `dist/assets/index-*.js` and `dist/editions/2/index.html` | ✓ PASS |
| Prerendered loading shell renders skeleton, not gated text or CTA copy | `grep -o "plan__skeleton" dist/editions/2/index.html` | match found | ✓ PASS |
| check-secrets marker-check catches a reintroduced leak in prerendered HTML | Appended `'quiet luxury of authenticity'` into `dist/editions/1/index.html`, reran `node scripts/check-secrets.js` | printed `no leaked secrets found in dist/`, exit 0 (expected exit 1) | ✗ FAIL — see WR-01/Human Verification below (rebuilt afterward to restore clean `dist/`) |
| Live entitlement matrix (active/canceled/hardcopy/past_due, real session) | n/a | not run — no seeded Postgres/Stripe/Google session available in this environment | ? SKIP → routed to Human Verification |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist in this repository and none are referenced by the phase's PLAN/SUMMARY files. Step 7c: SKIPPED (no probes declared or discovered).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| GATE-01 | 04-01 | Every gated page/route checks real per-user entitlement from the DB on each request | ✓ SATISFIED | `api/content/editions/[no].js` — see Truth #1 |
| GATE-02 | 04-02 | `subscribed` localStorage flag and all read sites removed, replaced by real server-side check | ✓ SATISFIED | Truth #7 |
| GATE-03 | 04-01 | Hard Copy subscription does not grant Online/digital access | ✓ SATISFIED (structurally; live matrix unverified) | Truth #3; recommend live UAT |
| GATE-04 | 04-01 | Canceled/lapsed subscription revokes access on the very next request, no stale cache | ✓ SATISFIED (structurally; live matrix unverified) | Truths #2, #5; recommend live UAT |
| GATE-05 | 04-02 | Publicly-intended content renders exactly as today, unaffected by the new gating | ✓ SATISFIED | Truth #8 |

No orphaned requirements: all 5 GATE-01..05 IDs declared in `.planning/REQUIREMENTS.md` are claimed across the two plans' `requirements:` frontmatter (04-01: GATE-01/03/04; 04-02: GATE-02/05) and every one has direct implementation evidence above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/check-secrets.js` | 132 | `SERVER_ONLY_IMPORT_MARKERS` loop gated behind `file.startsWith(CLIENT_BUNDLE_DIR)` (`dist/assets` only) | ⚠️ Warning | The one guard specifically meant to catch a reintroduced D-02-style gated-text leak does not scan prerendered route HTML — the exact location the original leak occurred. No active leak today (confirmed), but the regression guard has a real, reproduced blind spot. Already flagged by 04-REVIEW.md as WR-01. |
| `src/routes/Account.jsx` | 57-62, 89-98 | Hardcoded `'•••• 4242'` / static `invoices` import shown as if real for any active subscriber | ℹ️ Info (deferred) | Explicitly authorized by the plan and tracked as Phase 5 scope (ACCT-01/ACCT-04) — not a Phase 4 gap, see Deferred Items. |
| `api/billing/status.js` | 32-45 | No `ORDER BY` on the per-product status query; last-row-wins is nondeterministic if a user has both a `canceled` and `active` row for the same product | ℹ️ Info (pre-existing, out of Phase 4 scope) | Flagged by 04-REVIEW.md WR-03. Does not affect `api/content/editions/[no].js`'s independent, correct `WHERE status = 'active' LIMIT 1` entitlement check (any active row is sufficient) — display-only bug on `/subscribe`/`/account`, inherited from Phase 3, not introduced or worsened by this phase. |

No `TBD`/`FIXME`/`XXX` debt markers found in any file this phase modified.

### Human Verification Required

### 1. Live entitlement matrix

**Test:** Against a seeded Postgres DB and a real Google-authenticated session, exercise: (a) active `eclat-online` subscriber, (b) canceled `eclat-online` row, (c) active `eclat-hardcopy`-only row (no `eclat-online` row), (d) `past_due` `eclat-online` row, (e) no session cookie, (f) signed-in + a forced API 5xx.
**Expected:** (a) unlocks `/editions/:no` with the API's paragraphs; (b)/(c)/(d) show the ordinary paywall (never unlocked); (e) shows the skeleton with no fine print; (f) shows the paywall with the `--bad` "Couldn't confirm your subscription — reload to try again." fine print, and only in that case.
**Why human:** No automated test suite exists anywhere in this codebase (confirmed: no `*.test.*`/`*.spec.*` files, no `test` script in `package.json`), and this verification run had no live Postgres/Stripe/Google-OAuth infrastructure available. The query/route/hook logic is structurally correct by direct code read (see Truths #1-3, #6, #8), but the cross-product/cross-status live matrix — the actual security-critical behavior this phase exists to deliver — has never been exercised end-to-end. Both 04-01-SUMMARY.md and 04-02-SUMMARY.md independently flag this same gap and recommend it for end-of-phase UAT.

### 2. check-secrets.js prerendered-HTML blind spot (WR-01)

**Test:** Decide whether `scripts/check-secrets.js`'s `SERVER_ONLY_IMPORT_MARKERS` loop must be extended to scan all of `dist/` (not just `dist/assets/`) before Phase 5, or whether this is acceptable as tracked follow-up debt.
**Expected:** A human decision — either an override accepting current scope, or a fix requiring the loop run over every scanned file (matching the tracked-secret loop's own coverage, which does already scan all of `dist/`).
**Why human:** Reproduced directly in this run (see Behavioral Spot-Checks): reintroducing the gated marker phrase into a prerendered `dist/<route>/index.html` file does not trip the guard. This is exactly the leak vector (gated text landing in prerendered HTML) D-02 fixed and this guard was built to keep fixed — it currently doesn't cover that vector. Not a live vulnerability today (the actual current build is clean), but a real gap in a security-relevant regression guard that a human should explicitly accept or require fixed.

### Gaps Summary

No must-have truth, artifact, or key link failed outright — the core entitlement-enforcement mechanism (server-side session→identity, per-request DB-derived entitlement, product/status predicates, no-store caching, physical removal of gated text from `src/`/the client bundle, and removal of every demo-state read site) is all present, correctly wired, and independently confirmed via direct code reads, a full `npm run build`, and `dist/` greps — not merely trusted from SUMMARY.md's claims.

Status is `human_needed` rather than `passed` for two reasons, neither of which is a code defect in the entitlement mechanism itself:
1. The live cross-product/cross-status entitlement matrix has never been exercised against real infrastructure (no test suite exists in this codebase at all, and this verification run had no DB/session available) — both execution SUMMARYs already flagged this themselves.
2. A reproduced, real gap in `scripts/check-secrets.js`'s regression guard (WR-01) means a future reintroduction of gated text into prerendered HTML specifically would currently go undetected by the one automated safety net meant to catch it.

Both items are recommended for explicit human sign-off before this phase is considered fully closed; neither blocks the core goal as implemented today.

---

_Verified: 2026-09-09T23:12:08Z_
_Verifier: Claude (gsd-verifier)_
