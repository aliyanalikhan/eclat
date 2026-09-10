---
phase: 05-account-management-real-status-cancellation-billing-portal
plan: 03
subsystem: client+api
tags: [gap-closure, billing, fail-closed, invoices, cancellation, account]

# Dependency graph
requires:
  - phase: 05-account-management-real-status-cancellation-billing-portal
    plan: 01
    provides: GET /api/billing/account per-slug wire contract (status, planLabel, renews, cancelAtPeriodEnd, card, invoices)
  - phase: 05-account-management-real-status-cancellation-billing-portal
    plan: 02
    provides: src/lib/useAccount.js (useSafeFetch consumer) and the rebuilt src/routes/Account.jsx
provides:
  - "src/lib/useSafeFetch.js — status-aware fail-closed check: any non-2xx/non-401 response throws before r.json(), surfacing as error:true; 401 continues to resolve as data (no regression to useEntitlements/useGatedContent)"
  - "api/billing/account.js — DB-read-failure branch now returns a distinct 500 (logged server-side) instead of reusing the missing-session 401 shape"
  - "src/routes/Account.jsx — invoiceItems reads the shared invoice list from exactly one held product (no duplication); renewsKey and a new confirmation notice both key off cancelAtPeriodEnd"
affects: [05-VERIFICATION-followup, phase-06]

# Actuals (#2632)
actuals:
  tokens: 1617
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Status-aware fail-closed fetch primitive with a single explicit exemption (401) documented in the primitive's own JSDoc, so future consumers know the contract without re-deriving it from call sites"
    - "Distinct failure-status discipline: a DB/infra outage and 'not signed in' must never share a status+body shape, or a shared client-side primitive has nothing to distinguish them by"
    - "Single-source-of-truth invoice read: when a server intentionally shares one array reference across multiple map keys, the client reads it from exactly one key rather than re-combining copies"
    - "Confirmation-not-suppression for a reversible pending state: cancelAtPeriodEnd gets an inline notice, not a hidden CTA — the CTA remains the only path back to reversing the pending cancellation via Stripe's hosted portal"

key-files:
  created: []
  modified:
    - src/lib/useSafeFetch.js
    - api/billing/account.js
    - src/routes/Account.jsx

key-decisions:
  - "401 is explicitly exempted from the new fail-closed throw condition in useSafeFetch.js, not just left as an accidental pass-through — this is the single design fork that prevents regressing Phase 3/4's signed-out rendering on /subscribe, /subscribe/success, and /editions/:no, all of which share this primitive."
  - "The DB-catch branch in account.js changes ONLY its own status/body/logging; Step 1's missing-session 401 branch is untouched byte-for-byte, keeping the two failure modes independently verifiable."
  - "Confirmation notice text falls back to 'the current period end' only when sub.renews is unavailable, avoiding a blank date in the copy."
  - "The 'Manage' CTA's own render condition and handler were left completely untouched in Task 3 — CR-03 is closed by adding a notice, never by touching CTA visibility, per the plan's explicit prohibition against recreating a WR-01-style dead end."

requirements-completed: [ACCT-01, ACCT-02, ACCT-03]

coverage:
  - id: CR-01
    description: "useSafeFetch checks r.ok/r.status before parsing the body — any non-2xx status other than 401 throws before r.json(), surfacing as error:true via the existing catch path. api/billing/account.js's DB-catch branch now returns a distinct 500 (with console.error logging) instead of reusing the missing-session 401 shape."
    requirement: "ACCT-01"
    verification:
      - kind: unit
        ref: "node --check on both files: syntax OK. grep: r.ok check on line 61, r.json() on line 62 (check precedes parse). grep -c '401' useSafeFetch.js >= 1. grep -c 'console.error' account.js >= 1. grep -n 'status: 500' account.js: present. grep -c 'status: 401' account.js: exactly 1 (Step 1 only)."
        status: pass
      - kind: unit
        ref: "Throwaway node script evaluated the pure decision (ok, status) => (!ok && status !== 401) against the plan's 5-case fixture matrix: (true,200)->false, (false,401)->false, (false,500)->true, (false,403)->true, (false,404)->true — 5/5 passed."
        status: pass
      - kind: other
        ref: "git diff --name-only e4a8bda..HEAD confirms src/routes/Subscribe.jsx, src/routes/SubscribeSuccess.jsx, src/lib/useEntitlements.js, src/lib/useGatedContent.js, api/billing/status.js, api/content/editions/[no].js are all untouched — the regression-safety argument holds structurally."
        status: pass
    human_judgment: true
    rationale: "Forcing a live DB failure against vercel dev + a seeded DB, and confirming pixel-identical signed-out rendering on /subscribe and /editions/:no, both require a running server and a browser — deferred to the end-of-phase human verification pass per the plan's own human-check."
  - id: CR-02
    description: "invoiceItems now reads subs[heldKeys[0]].invoices.items (a single held key) instead of Object.values(subs).flat() across every held key, eliminating duplication of the server's intentionally-shared invoice list."
    requirement: "ACCT-03"
    verification:
      - kind: unit
        ref: "npm run build succeeds (59 modules + SSR 28 modules + prerender 10 routes, no errors). grep -n 'heldKeys[0]' src/routes/Account.jsx: present. grep -c 'Object.values(subs)' src/routes/Account.jsx: 0. grep -c 'slice(0, 12)' src/routes/Account.jsx: 1 (cap preserved)."
        status: pass
    human_judgment: true
    rationale: "Confirming zero duplicate rows for a real customer holding 2+ held products with real Stripe invoices requires a seeded DB + vercel dev + browser — deferred to the end-of-phase human verification pass."
  - id: CR-03
    description: "renewsKey now reads 'Access until' when status is 'canceled' OR cancelAtPeriodEnd is true. A new confirmation notice (reusing .fine, zero new CSS) renders when cancelAtPeriodEnd is true and status is not 'canceled'. The 'Manage' CTA's condition and handler are unchanged."
    requirement: "ACCT-02"
    verification:
      - kind: unit
        ref: "npm run build succeeds. grep -c 'cancelAtPeriodEnd' src/routes/Account.jsx: 3 (was 0 before this task, per 05-VERIFICATION.md's confirmed grep evidence). grep -n 'Access until' src/routes/Account.jsx: present, now reachable via two conditions. grep -c \"openPortal('manage')\" src/routes/Account.jsx: 1, unchanged from its pre-task value."
        status: pass
    human_judgment: true
    rationale: "Confirming the live-portal-cancellation round trip (cancel via Manage -> Stripe portal, return to /account before period end, see 'Access until' + the notice + a still-visible Manage button) requires a live Stripe test-mode session — deferred to the end-of-phase human verification pass."

duration: 4min
completed: 2026-09-10
status: complete
---

# Phase 5 Plan 3: Account Management — Gap Closure (CR-01/CR-02/CR-03) Summary

**Three narrow, independent corrections to already-shipped code from 05-01/05-02: `useSafeFetch.js` now fails closed on any non-2xx/non-401 response (with a distinct 500 for a DB outage in `account.js`), `Account.jsx`'s invoice table reads the shared list from a single held product instead of duplicating it, and `cancelAtPeriodEnd` now drives the "Access until" label plus a visible confirmation notice — all 3 confirmed critical gaps in `05-VERIFICATION.md`/`05-REVIEW.md` closed with zero regression to Phase 3/4's signed-out rendering.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-10T03:20:13Z
- **Completed:** 2026-09-10T03:23:57Z
- **Tasks:** 3
- **Files modified:** 3 (all existing, no new files)

## Accomplishments

- **CR-01 closed:** `src/lib/useSafeFetch.js` now checks `r.ok`/`r.status` before calling `r.json()` — any non-2xx response other than 401 throws before body parsing, surfacing as `error: true` through the existing catch path. A 401 response is explicitly exempted and continues to resolve as `data`, preserving the established "no session = well-formed empty state" contract relied on by `useEntitlements` (`Subscribe.jsx`, `SubscribeSuccess.jsx`) and `useGatedContent` (`Edition.jsx`).
- **CR-01 (server half) closed:** `api/billing/account.js`'s DB-read-failure branch now returns a distinct `500` with `console.error` logging instead of reusing Step 1's missing-session `401 { subscriptions: {} }` shape — the two failure modes are now observably different.
- **CR-02 closed:** `Account.jsx`'s `invoiceItems` now reads `subs[heldKeys[0]].invoices.items` (a single held key) instead of flattening `Object.values(subs)` across every held key, eliminating the once-per-held-product duplication of the server's intentionally shared invoice list. Sort order (most-recent-first) and the 12-row cap are unchanged.
- **CR-03 closed:** `renewsKey` now reads "Access until" when `sub.status === 'canceled'` OR `sub.cancelAtPeriodEnd` is true (previously status-only). A new confirmation notice — reusing the `.fine` class, zero new CSS — renders for a still-active-but-scheduled-to-end subscription, giving the user positive acknowledgement their cancellation was received. The "Manage" CTA's own condition and handler were left completely untouched, so the portal remains reachable to reverse the pending cancellation.
- **Zero regression:** `git diff --name-only` against the pre-plan commit confirms `src/routes/Subscribe.jsx`, `src/routes/SubscribeSuccess.jsx`, `src/lib/useEntitlements.js`, `src/lib/useGatedContent.js`, `api/billing/status.js`, and `api/content/editions/[no].js` were never touched by any of the 3 task commits.

## Task Commits

Each task was committed atomically:

1. **Task 1: Status-aware fail-closed check in useSafeFetch.js + distinguish DB failure from no-session in account.js** - `3167d6f` (fix, 2 files, +26/-5)
2. **Task 2: Read the shared invoice list from one held product instead of combining every held product's copy** - `3f74ec0` (fix, 1 file, +7/-3)
3. **Task 3: Wire cancelAtPeriodEnd into the Renews/Access-until label and add a cancellation-confirmation notice** - `1e25363` (fix, 1 file, +19/-1)

_No TDD tasks in this plan (`tdd="false"` on every task) — one commit per task, matching this plan's `type="auto"` tasks._

## Files Created/Modified

- `src/lib/useSafeFetch.js` - Added the `r.ok`/`status !== 401` check before `r.json()`; updated JSDoc to state the corrected fail-closed contract, including the 401 exemption rationale.
- `api/billing/account.js` - Step 2's DB-catch branch now logs the error server-side and returns `500 { error: 'unavailable' }`; Step 1's missing-session `401` branch is untouched.
- `src/routes/Account.jsx` - `invoiceItems` reads from `heldKeys[0]` with a defensive shallow copy; `renewsKey` extended to check `cancelAtPeriodEnd`; new confirmation-notice render branch added before the CTA row.

## Decisions Made

- **401 exemption is explicit, not incidental.** The plan required the fix to distinguish "genuine failure" from "no session" without touching any of the 3 other `useSafeFetch` consumers' behavior for signed-out visitors — exempting exactly status 401 (and no other status) is what makes that true, since every current server-side consumer of this primitive uses 401 specifically and only to mean "not signed in."
- **The DB-catch branch's fix is scoped to itself.** Step 1's missing-session branch in `account.js` was read but not modified — confirmed via `grep -c "status: 401"` staying at exactly 1 after the change.
- **CTA visibility was never touched for CR-03.** The task's `<action>` explicitly documents this as an intentional decision (Stripe's hosted portal is the only path to reverse a pending cancellation), so the fix is additive (a notice) rather than subtractive (hiding the CTA).

## Deviations from Plan

None — all 3 tasks executed exactly as specified: the same files, the same action, the same verification greps and fixture matrix. No Rule 1-4 deviations were needed; the plan's own scoping (narrow, single-file corrections to already-wired code) left no ambiguity requiring an on-the-fly decision.

## Issues Encountered

None. `npm run build` and `node scripts/check-secrets.js` passed on the first run after each task; no auto-fix attempts were needed.

## User Setup Required

None — no new environment variables, secrets, or external service setup. This plan modifies only existing, already-configured endpoints and client code.

## Next Phase Readiness

- This plan closes all 3 gaps recorded in `05-VERIFICATION.md`'s frontmatter `gaps:` list. A follow-up re-verification pass should find `gaps: []` and `status: verified`.
- **Human verification still required** (deferred per each task's `<human-check>`, requires `vercel dev` + seeded DB + real Google session): (1) force a DB/session failure on `/account` and confirm the fail-closed message renders, plus confirm signed-out `/subscribe` and `/editions/:no` render identically to before (CR-01 + regression check); (2) a customer holding 2+ products with real invoices sees each invoice exactly once (CR-02); (3) a live Stripe test-mode portal cancellation round trip shows "Access until" + the notice + a still-visible Manage button (CR-03).
- Phase 4 UAT (04-UAT.md) remains outstanding independently of this plan, per STATE.md's carried-forward blocker list.

## Self-Check: PASSED

- `src/lib/useSafeFetch.js` — FOUND (modified, confirmed via Read after edit)
- `api/billing/account.js` — FOUND (modified, confirmed via Read after edit)
- `src/routes/Account.jsx` — FOUND (modified, confirmed via Read after edit)
- `3167d6f` — FOUND in `git log`
- `3f74ec0` — FOUND in `git log`
- `1e25363` — FOUND in `git log`
- `npm run build` — PASSED (59 modules, SSR 28 modules, prerender 10 routes, no errors) at time of Task 3's completion
- `node scripts/check-secrets.js` — PASSED ("no leaked secrets found in dist/")
- Structural regression proof — PASSED: `git diff --name-only e4a8bda..HEAD` shows exactly `api/billing/account.js`, `src/lib/useSafeFetch.js`, `src/routes/Account.jsx` — none of the 6 prohibited files appear.

---
*Phase: 05-account-management-real-status-cancellation-billing-portal*
*Completed: 2026-09-10*
