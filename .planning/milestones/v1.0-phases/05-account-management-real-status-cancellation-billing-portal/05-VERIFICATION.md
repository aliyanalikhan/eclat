---
phase: 05-account-management-real-status-cancellation-billing-portal
verified: 2026-09-10T20:15:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 2/5
  gaps_closed:
    - "useAccount fails closed on a server-side auth/DB failure (CR-01) — useSafeFetch now throws before body-parsing on any non-2xx/non-401 response; api/billing/account.js's DB-catch branch returns a distinct 500 (not the 401 no-session shape)."
    - "Invoices render in ONE table with no duplication (CR-02) — Account.jsx reads the shared invoice list from a single held key (heldKeys[0]) instead of flattening Object.values(subs)."
    - "cancel_at_period_end drives the D-14 'Access until' label (CR-03) — renewsKey now checks sub.status === 'canceled' || sub.cancelAtPeriodEnd, and a confirmation notice renders for the still-active-but-scheduled-to-end state."
  gaps_remaining: []
  regressions: []
deferred: []
behavior_unverified_items: []
human_verification:
  - test: "With vercel dev and a seeded DB row for a signed-in user, temporarily break the DB connection (or force an exception inside the subscriptions SELECT) and load /account."
    expected: "The page renders 'Couldn't confirm your account — reload to try again.' (the accountError branch), NOT the zero-subscriptions 'Subscribe' upsell."
    why_human: "Reproducing a live DB failure against a running server requires vercel dev + a seeded DB; not provable by static code reading alone (though the code trace strongly supports it — see below)."
  - test: "While signed OUT, visit /subscribe and any /editions/:no page."
    expected: "/subscribe shows no 'Couldn't confirm your current plans' notice, and the edition page shows its normal paywall preview — both render exactly as before the CR-01 fix, confirming the 401 exemption prevented a Phase 3/4 regression."
    why_human: "Requires a running server and browser to confirm pixel-identical signed-out rendering; structurally confirmed (zero commits to the 6 shared-primitive consumer files since before this gap-closure plan) but not behaviorally exercised here."
  - test: "Signed-in active subscriber holding 2+ held products (e.g. eclat-online + book-online), each with paid invoices — load /account and inspect the Billing history table."
    expected: "Each real invoice appears exactly once, zero duplicate rows, no duplicate-React-key console warning."
    why_human: "Requires a seeded DB with 2+ held products and real Stripe invoices under one customer; the code fix (heldKeys[0] single-key read) is confirmed correct by direct source reading, but the live multi-product render is not exercised here."
  - test: "Cancel an active subscription via the 'Manage' → Stripe portal flow, return to /account before the current period ends."
    expected: "The panel shows 'Access until {date}' instead of 'Renews {date}', a confirmation notice states the subscription won't renew, and the 'Manage' button is still present (not hidden)."
    why_human: "Requires a live Stripe test-mode cancellation round trip through the hosted portal; the render logic (renewsKey + notice condition) is confirmed correct by direct source reading, but the live cancellation flow is not exercised here."
  - test: "Canceled-product panel — verify there is genuinely no path back to /subscribe for that specific product from the Account page itself (WR-04 finding, non-blocking, carried forward from the prior verification)."
    expected: "Canceled panel shows Status/Plan/'Access until'/Card and nothing actionable; the global header 'Subscribe' link is the only resubscribe path."
    why_human: "Visual/UX judgment call on whether this is acceptable — confirmed structurally in code (Account.jsx's CTA row still gates on status !== 'canceled' with no fallback), unchanged since the prior verification and explicitly out of scope for the 05-03 gap-closure plan."
---

# Phase 5: Account Management — Real Status, Cancellation & Billing Portal Verification Report (Re-verification)

**Phase Goal:** A user can view and manage their real subscription from the Account page — status, renewal date, invoices, and cancellation are all backed by live Stripe data instead of mocks.
**Verified:** 2026-09-10T20:15:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (05-03 plan executed, plus an emergent code-review fix in commit a01e33c)

## Goal Achievement

### Observable Truths

All 5 original must-haves truths re-verified — the 2 that previously passed (#4, #5) were re-checked for regression, and the 3 that previously failed (#1, #2, #3, which map to CR-01/CR-02/CR-03) were fully re-verified end-to-end against the current source.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees real subscription status (active/canceled/past due) and renewal date (SC1/ACCT-01) — fails closed on a server-side auth/DB failure (CR-01) | ✓ VERIFIED | `src/lib/useSafeFetch.js:61` — `if (!r.ok && r.status !== 401) throw new Error(...)` runs BEFORE `r.json()` (line 62), routing any non-2xx/non-401 response through the existing `.catch` fail-closed path (`setData(null); setError(true)`). `api/billing/account.js:83-86` — the DB-catch branch (now wrapping both the SELECT at line 59 AND the base-map build at lines 65-82, per the a01e33c follow-up fix) logs via `console.error` and returns a distinct `500 { error: 'unavailable' }`, never reusing Step 1's `401 { subscriptions: {} }` shape (confirmed: exactly 1 occurrence of `status: 401` remains in the file, at Step 1 only). `Account.jsx:118-123` renders "Couldn't confirm your account — reload to try again." whenever `accountError` is true. Additionally confirmed the a01e33c destructuring fix (`;({ rows } = await sql\`...\`)`) is present and correctly inside the try block — the pre-existing bug that made the DB read throw an *unhandled* TypeError (bypassing the try/catch entirely) is closed; `05-03-REVIEW.md` independently re-derived this same conclusion after re-reading the file |
| 2 | User can cancel a subscription via Stripe's hosted Customer Portal, and the cancellation is visible after the fact (SC2/ACCT-02, CR-03) | ✓ VERIFIED | `api/billing/portal.js` unchanged since the prior (already-passing) verification. `Account.jsx:147-148` — `renewsKey = sub.status === 'canceled' || sub.cancelAtPeriodEnd ? 'Access until' : 'Renews'` now reads the live-fetched flag. `Account.jsx:198-203` renders a new confirmation notice ("Your subscription won't renew and will end on {date}.") exactly when `cancelAtPeriodEnd && status !== 'canceled'`. The "Manage" CTA (`Account.jsx:207-217`) is deliberately left reachable for this state (not suppressed), preserving the only path to reverse a pending cancellation |
| 3 | User sees real invoice history, one table, most-recent-first, ≤12 rows, no duplication (SC3/ACCT-03, CR-02) | ✓ VERIFIED | `Account.jsx:100-103` — `invoiceItems` now reads `subs[heldKeys[0]]?.invoices?.items` (a single held key), with a defensive `.slice()` shallow copy, `.sort((a,b) => b.created - a.created)` (most-recent-first), and `.slice(0, 12)` (cap). `grep -c "Object.values(subs)"` → 0 — the cross-product flatten that caused duplication is gone. `api/billing/account.js:150-166` (Section C) confirms the server still intentionally assigns the identical shared `items` array to every held key, so reading from any single key yields the complete, non-duplicated list |
| 4 | User sees a clear "payment failed, update your card" notice when past due (SC4/ACCT-04) | ✓ VERIFIED (regression-checked) | `Account.jsx:222-248` — unchanged since the prior passing verification; the `.demo-notice`-based notice with `--bad` overrides still renders only under `sub.status === 'past_due'`, wired to `openPortal('payment_method_update')` |
| 5 | No raw Stripe identifiers, no server-only imports, presentation-safe payload only (T3/T9/WR-10) | ✓ VERIFIED (regression-checked) | `grep -rn "pm_\|cus_\|sub_\|pi_" src/lib/useAccount.js src/routes/Account.jsx` → 0 hits. `api/billing/account.js`'s wire shape (card: `{available,brand,last4,expMonth,expYear}`; invoices.items: `{number,created,amount_paid,hosted_invoice_url}`) unchanged; `Cache-Control: no-store` present on every response branch, including the new/modified ones |

**Score:** 5/5 truths verified (0 failed, 0 behavior-unverified — all upgraded from "present/wired" to "verified" by direct source trace matching the plan's exact fix design)

### Independent Confirmation of Gap Closure (CR-01/CR-02/CR-03) Plus the Emergent a01e33c Fix

Re-derived independently by reading the actual current source (not taken from 05-03-SUMMARY.md or 05-03-REVIEW.md on faith):

| ID | Prior defect | Independent confirmation of fix |
|----|--------------|----------------------------------|
| CR-01 | `useSafeFetch` never checked `response.ok`; a DB-outage 401 read as success | **CONFIRMED FIXED.** `src/lib/useSafeFetch.js:61` throws before parsing for any non-2xx/non-401. `api/billing/account.js:83-86` returns a distinct `500`. |
| CR-01 (emergent) | `api/billing/account.js` assigned the raw `QueryResult` object (not destructured) to `rows`, throwing an unhandled `TypeError` OUTSIDE the try/catch on every authenticated request — the real data path was unreachable even after the CR-01/02/03 client fixes | **CONFIRMED FIXED.** `api/billing/account.js:59` now reads `;({ rows } = await sql\`...\`)`, and this line sits inside the `try` block (lines 58-86) alongside the base-map construction (lines 65-82), with the shared `catch` at 83-86. Verified `rows` is only ever dereferenced (line 92, `rows[0]?.stripe_customer_id`) after the try block completes successfully — matches `05-03-REVIEW.md`'s independent trace exactly |
| CR-02 | Invoice list flattened across all held products, duplicating every invoice N times | **CONFIRMED FIXED.** `src/routes/Account.jsx:100-103` reads `subs[heldKeys[0]]` only; `grep -c "Object.values(subs)"` → 0 |
| CR-03 | `cancelAtPeriodEnd` fetched but never rendered | **CONFIRMED FIXED.** `src/routes/Account.jsx:147-148` (label) and `:198-203` (notice) both consume the flag; `grep -c "cancelAtPeriodEnd"` → 3 in this file (was 0) |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/useSafeFetch.js` | Status-aware fail-closed check, 401 exempted | ✓ VERIFIED | Read directly: check at line 61 precedes `r.json()` at line 62; JSDoc (lines 21-30) accurately documents the corrected contract |
| `api/billing/account.js` | DB-catch branch distinct from 401 branch; `rows` destructured correctly; try/catch covers the full base-map build | ✓ VERIFIED | Read directly: 401 branch (line 48) untouched; DB-catch branch (83-86) returns distinct 500; `rows` destructuring (line 59) confirmed correct and inside the try block |
| `src/routes/Account.jsx` | Single-held-key invoice read; `cancelAtPeriodEnd`-aware renewal label + confirmation notice; CTA not suppressed | ✓ VERIFIED | Read directly: lines 100-103 (invoices), 147-148 (renewsKey), 198-203 (notice), 207-217 (CTA unchanged) |
| `src/lib/useAccount.js` | Fail-closed wrapper, third `useSafeFetch` consumer | ✓ VERIFIED (wired) | Unchanged since prior verification; correctly delegates to the now-fixed `useSafeFetch`. Note: its own JSDoc (lines 32-34) still states "any 401 ... sets error: true," which is stale relative to the actual (and correct) 401-exempted behavior — flagged as an info-level anti-pattern below, not a functional defect (Account.jsx does not rely on 401 producing an error; a signed-out user is already redirected by `useSession`, independently of `useAccount`) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/lib/useSafeFetch.js` | `src/lib/useAccount.js` | non-2xx/non-401 response throws before `r.json()`, surfacing as `error: true` | ✓ WIRED | Confirmed by direct read; matches the plan's `key_links` pattern `r\.ok` |
| `api/billing/account.js` | `src/lib/useSafeFetch.js` | DB-catch branch's distinct `500` is the signal the client-side check needs | ✓ WIRED | Confirmed; `status: 500` present, `status: 401` count is exactly 1 (Step 1 only) |
| `src/lib/useSafeFetch.js` | `src/lib/useEntitlements.js` / `src/lib/useGatedContent.js` | 401 exemption preserves Phase 3/4 signed-out behavior | ✓ WIRED (structurally) | Zero commits to `Subscribe.jsx`, `SubscribeSuccess.jsx`, `useEntitlements.js`, `useGatedContent.js`, `status.js`, `editions/[no].js` since before this gap-closure plan — confirmed via `git log` |
| `src/routes/Account.jsx` | `api/billing/account.js` | `invoiceItems reads subs[heldKeys[0]].invoices.items` | ✓ WIRED | Confirmed; `heldKeys[0]` present, `Object.values(subs)` for invoices gone |
| `src/routes/Account.jsx` | `api/billing/account.js` | `renewsKey`/notice read `sub.cancelAtPeriodEnd`, computed live in Section A | ✓ WIRED | Confirmed at both ends |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| Status/Plan/Renews/Card panel fields | `sub.status`/`sub.planLabel`/`sub.renews`/`sub.card` | `data.subscriptions[key]` ← `GET /api/billing/account` ← DB `SELECT` (now correctly destructured) + live Stripe reads | Yes | ✓ FLOWING |
| Invoice table rows | `invoiceItems` | `data.subscriptions[heldKeys[0]].invoices.items` ← `stripe.invoices.list` | Yes, single-copy, no duplication | ✓ FLOWING |
| `cancelAtPeriodEnd` | computed server-side (Section A, live Stripe) | `data.subscriptions[key].cancelAtPeriodEnd` | Yes, now rendered in both the label and the notice | ✓ FLOWING |
| Fail-closed error state | `accountError` | `useAccount().error` ← `useSafeFetch` status check ← non-2xx/non-401 HTTP response | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build compiles all 3 gap-closure-touched files + emergent fix | `npm run build` (run fresh, not taken from SUMMARY) | 59 modules + SSR 28 modules + prerender 10 routes, no errors, `check-secrets: no leaked secrets found in dist/` | ✓ PASS |
| No debt markers in phase files | `grep -n "TODO\|FIXME\|XXX\|HACK\|PLACEHOLDER"` across `api/billing/account.js`, `src/lib/useSafeFetch.js`, `src/routes/Account.jsx`, `src/lib/useAccount.js`, `api/billing/portal.js` | 0 hits | ✓ PASS |
| Status-check ordering in `useSafeFetch.js` | Direct read of lines 55-63 | `r.ok`/`status !== 401` check (line 61) precedes `r.json()` (line 62) | ✓ PASS |
| DB-catch branch distinct from 401 branch | `grep -c "status: 401" api/billing/account.js` → 1; `grep -n "status: 500"` → present | Confirmed distinct | ✓ PASS |
| Invoice single-key read, no flatten | `grep -c "Object.values(subs)" src/routes/Account.jsx` → 0; `grep -n "heldKeys\[0\]"` → present | Confirmed | ✓ PASS |
| `cancelAtPeriodEnd` client-side usage | `grep -c "cancelAtPeriodEnd" src/routes/Account.jsx` → 3 (was 0 pre-fix) | Confirmed | ✓ PASS |
| No raw Stripe identifiers reach the client | `grep -rn "pm_\|cus_\|sub_\|pi_" src/lib/useAccount.js src/routes/Account.jsx` → 0 hits | Confirmed | ✓ PASS |
| Regression-safety: 6 shared-primitive consumer files untouched | `git log --oneline -5 -- src/routes/Subscribe.jsx src/routes/SubscribeSuccess.jsx src/lib/useEntitlements.js src/lib/useGatedContent.js api/billing/status.js "api/content/editions/[no].js"` | Most recent commit on any of these 6 files is `ff40ecd` (Phase 4), predating the entire 05-03 gap-closure plan and the a01e33c follow-up | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist in this repo and no PLAN/SUMMARY/VERIFICATION for this phase references a probe script. Skipped — no probes declared or discovered (unchanged from the prior verification).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|--------------|--------|----------|
| ACCT-01 | 05-01, 05-02, 05-03 | Real subscription status + renewal date, fail-closed on failure | ✓ SATISFIED | CR-01 closed (both the client status check and the server-side DB-read/destructuring bugs); server contract unchanged and correct |
| ACCT-02 | 05-01, 05-02, 05-03 | Cancel via Stripe hosted Customer Portal, visible after the fact | ✓ SATISFIED | Portal mechanics unchanged (already correct); CR-03 closes the "invisible cancellation" gap with a label + notice, CTA still reachable |
| ACCT-03 | 05-01, 05-02, 05-03 | Real invoice history, no duplication | ✓ SATISFIED | CR-02 closed — single-key read eliminates duplication |
| ACCT-04 | 05-01, 05-02 | Payment-failed notice when past due | ✓ SATISFIED | Unchanged since prior verification; correctly renders, correct CTA, WR-01 dead-end avoided |

**Orphaned requirements check:** `.planning/REQUIREMENTS.md` maps exactly ACCT-01..ACCT-04 to Phase 5. All 4 are declared across the phase's plans (05-01/05-02 declare all 4; 05-03 declares ACCT-01/02/03, the 3 it closed gaps for). No orphaned requirements.

**Note — REQUIREMENTS.md checklist drift:** `.planning/REQUIREMENTS.md` line 46 still shows `ACCT-04` as an unchecked `[ ]` item and its traceability table (line 101) marks it "Pending," even though ACCT-04 was already verified `✓ VERIFIED` in the prior (initial) 05-VERIFICATION.md pass and remains so here — this is a stale tracking-doc artifact, not a code defect. ACCT-01/02/03 are correctly checked `[x]`/"Complete." Flagged for the human decision below since REQUIREMENTS.md is meant to be the traceability source of truth and this phase's own artifacts (both VERIFICATION.md passes) disagree with it on ACCT-04.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/useAccount.js` | 32-34 | JSDoc still states "any 401 ... sets error: true," which is now inaccurate — 401 is explicitly exempted from the error path by design (the established "no session, well-formed empty state" contract) | ℹ️ Info | Documentation drift only; no functional impact since `Account.jsx` gates signed-out users via `useSession`, independently of `useAccount`'s 401 handling. Not part of the 3 confirmed CR gaps and not flagged by 05-03-REVIEW.md, but worth a follow-up doc fix |
| `.planning/REQUIREMENTS.md` | 46, 101 | ACCT-04 still shown as unchecked/"Pending" despite being verified complete in both VERIFICATION.md passes | ℹ️ Info | Tracking-doc drift, not a code defect — see note above |

No blocker or warning-level anti-patterns found in any of the 5 phase-relevant source files (`api/billing/account.js`, `src/lib/useSafeFetch.js`, `src/routes/Account.jsx`, `src/lib/useAccount.js`, `api/billing/portal.js`). This is a meaningful change from the prior verification pass, which found 3 blocker-level anti-patterns (the CR-01/02/03 root causes) plus 5 warnings — all now resolved or (in the case of WR-04) explicitly carried forward as non-blocking.

### Human Verification Required

See `human_verification` in the frontmatter above — 5 items. Four are direct live-environment confirmations of the CR-01/CR-02/CR-03 fixes now present in source (the code trace strongly supports each one working as intended, but a DB-outage simulation, a multi-product Stripe customer, and a live portal cancellation round trip all require a running server + seeded DB/Stripe test-mode data that this static verification pass cannot exercise). The fifth (WR-04, canceled-product resubscribe path) is a non-blocking UX judgment call carried forward unchanged from the prior verification — it was explicitly out of scope for the 05-03 gap-closure plan.

### Gaps Summary

No gaps remain. All 3 previously-confirmed critical defects (CR-01, CR-02, CR-03) are independently re-verified as closed by direct source inspection, matching both `05-03-SUMMARY.md`'s claims and `05-03-REVIEW.md`'s independent code review. The emergent 4th bug found during that code review (the `rows` destructuring defect in `api/billing/account.js`, which made the endpoint's real data path completely unreachable via an unhandled exception) is also confirmed fixed and correctly scoped inside the try/catch, with the try block now covering both the DB read and the base-map construction.

The server-side contract (`lib/products.js`, `api/billing/account.js`, `api/billing/portal.js`) and the client rebuild (`useAccount.js`, `Account.jsx`) are now both internally consistent and mutually correct: status/renewal/cancellation/invoices/card all flow from live DB + Stripe data with no client-visible mocks, fail-closed behavior holds on genuine server failures, invoices are not duplicated, and cancellation is visibly acknowledged.

Two info-level documentation-drift items are noted (a stale JSDoc comment in `useAccount.js`, and a stale REQUIREMENTS.md checklist entry for ACCT-04) — neither blocks phase completion, but the REQUIREMENTS.md discrepancy is surfaced for a human decision since it contradicts this phase's own verification record.

**Recommended next step:** Route to human verification for the 5 items above (primarily a live `vercel dev` + seeded DB + Stripe test-mode pass through the 4 CR scenarios, standard end-of-phase UAT). No further closure plan is needed — all code-level gaps are closed.

---

_Verified: 2026-09-10T20:15:00Z_
_Verifier: Claude (gsd-verifier)_
