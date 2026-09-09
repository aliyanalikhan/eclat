---
phase: 04-content-gating-real-server-side-entitlement-enforcement
plan: 01
subsystem: api
tags: [entitlement, access-control, vercel-functions, postgres, session]

# Dependency graph
requires:
  - phase: 02-authentication-google-sign-in-server-side-sessions
    provides: cookie->hashToken->sessions-JOIN-users identity lookup (lib/session.js), the pattern lib/session-user.js extracts
  - phase: 03-billing-webhooks-stripe-checkout-and-subscription-sync
    provides: subscriptions table kept in sync via verified Stripe webhooks; lib/products.js product-slug allowlist
provides:
  - "lib/session-user.js — shared, fail-closed getSessionUser(request) helper (identity only, never entitlement)"
  - "lib/gated-content.js — server-only gated edition paragraphs, physically outside src/ (D-11)"
  - "GET /api/content/editions/:no — per-request entitlement re-derivation with the D-15 fail-closed contract"
  - "vercel.json defense-in-depth no-store rule for /api/content/(.*)"
  - "scripts/check-secrets.js permanent guard against the D-02 gated-text bundling leak reappearing"
affects: [04-02-content-gating-client-render, phase-05-account-management]

# Actuals (#2632)
actuals:
  tokens: 3623
  tasks: 5
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared fail-closed session->user helper (lib/session-user.js) extracted from an existing inline DB lookup, reused by api/billing/status.js and the new gated-content endpoint"
    - "Server-only content module (lib/*.js, never imported from src/) for text that must never reach the client bundle, mirroring the existing lib/db.js / lib/stripe.js / lib/products.js convention"
    - "Per-request entitlement re-derivation from a live DB read (never cached/memoized) with an explicit 200/401/404 contract — no 403 path — and Cache-Control: no-store on every branch including errors"
    - "Vercel bracket dynamic-segment file naming (api/content/editions/[no].js) for path-parameterized API routes — the first dynamic API route in this codebase"

key-files:
  created:
    - lib/session-user.js
    - lib/gated-content.js
    - "api/content/editions/[no].js"
  modified:
    - api/billing/status.js
    - src/data/content.js
    - vercel.json
    - scripts/check-secrets.js

key-decisions:
  - "Implemented the dynamic route as api/content/editions/[no].js (Vercel bracket-segment convention) rather than the plan's literal api/content/editions.js filename — a non-bracketed filename only matches the exact path with no further segments and would 404 on every real request; the edition number is still read via the request URL's pathname (RESEARCH.md Pattern 2), not a framework-injected params object, matching this codebase's existing single-argument fetch(request) convention."
  - "Kept per-branch inline { 'Cache-Control': 'no-store' } header literals (matching api/billing/status.js's existing style) rather than a shared NO_STORE constant, so the no-store discipline stays directly grep-auditable per response branch."

requirements-completed: [GATE-01, GATE-03, GATE-04]

coverage:
  - id: D1
    description: "Shared getSessionUser(request) helper extracted from api/billing/status.js's inline cookie->hash->DB lookup; status.js refactored onto it with byte-identical response bodies on every branch"
    requirement: "GATE-01"
    verification:
      - kind: unit
        ref: "node one-liner: getSessionUser(new Request('http://localhost/')) === null for no cookie"
        status: pass
      - kind: other
        ref: "git diff 1bba3c6 review: only the session block + import changed; api/auth/session.js and api/billing/checkout.js show zero diff"
        status: pass
    human_judgment: true
    rationale: "This refactor touches a live production endpoint (/api/billing/status) that backs the /subscribe picker and success polling. Behavior-preservation was confirmed via a direct git diff read by the executing agent, not via an automated response-shape test against a real session/DB — a human should confirm production behavior didn't drift before this ships."
  - id: D2
    description: "Gated edition paragraphs relocated from src/data/content.js into server-only lib/gated-content.js (gatedParagraphsFor, editionExcerptBy); src/data/content.js purged of excerpt/excerptBy; production client bundle confirmed free of both distinctive gated phrases"
    requirement: "GATE-01"
    verification:
      - kind: unit
        ref: "node one-liner: gatedParagraphsFor(2)/(1) return the 3-paragraph arrays, gatedParagraphsFor(99) === null, editionExcerptBy(1) === 'Ebuka Osuorah, Founder'"
        status: pass
      - kind: other
        ref: "grep -rl 'the work of decades, not quarters' dist/ and grep -rl 'quiet luxury of authenticity' dist/ — both zero hits after npm run build"
        status: pass
    human_judgment: false
  - id: D3
    description: "GET /api/content/editions/:no re-derives eclat-online entitlement (status='active' only) per request and returns the locked D-15 contract: 401 no-session, 200 entitled:false, 200 entitled:true+paragraphs, 404 unknown/malformed edition, no-store on every branch including the 500 path"
    requirement: "GATE-03"
    verification:
      - kind: unit
        ref: "node smoke test: /api/content/editions/abc -> 404 no-store; /api/content/editions/2 with no cookie -> 401 no-store {entitled:false,has_session:false}"
        status: pass
      - kind: other
        ref: "grep audit: Cache-Control no-store x6, status = 'active' present, eclat-online bound, trialing=0, literal 403=0, IN (=0, <>=0, LIMIT 1 present"
        status: pass
    human_judgment: true
    rationale: "The full entitlement matrix (active/past_due/canceled eclat-online rows, and eclat-hardcopy/book-* rows granting zero access) requires a live Postgres subscriptions table plus a real Google-authenticated session cookie. This execution session verified only the fail-closed no-session and invalid-edition-number branches directly; the signed-in active/not-entitled branches need human/UAT verification against real data before this is trusted in production."
  - id: D4
    description: "vercel.json /api/content/(.*) Cache-Control:no-store header rule added between the untouched /assets/(.*) immutable rule and the untouched /(.*) security-header catch-all (defense-in-depth, D-16)"
    requirement: "GATE-04"
    verification:
      - kind: unit
        ref: "node one-liner: JSON.parse(vercel.json) rule order assertion (assets < api/content < catch-all) plus header key/value check"
        status: pass
    human_judgment: false
  - id: D5
    description: "scripts/check-secrets.js SERVER_ONLY_IMPORT_MARKERS extended with a gated-only phrase, turning the D-02 bundling-leak fix into a permanent build-time guard"
    requirement: "GATE-01"
    verification:
      - kind: unit
        ref: "node --check scripts/check-secrets.js; node scripts/check-secrets.js against a clean dist/ -> 'no leaked secrets found'"
        status: pass
      - kind: other
        ref: "negative test: wrote the marker phrase into dist/assets/__leak-test.js, reran check-secrets.js, got the server-only import-boundary error and exit 1; file removed afterward"
        status: pass
    human_judgment: false

duration: 26min
completed: 2026-09-09
status: complete
---

# Phase 4 Plan 1: Content Gating — Server-Side Entitlement Enforcement Summary

**A shared fail-closed session helper, a server-only gated-text module, and a per-request `GET /api/content/editions/:no` endpoint that re-derives `eclat-online` entitlement from the live `subscriptions` table on every call — closing the D-02 bundling leak that shipped gated edition text to every visitor's browser regardless of subscription state.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-09-09T22:03:00Z
- **Completed:** 2026-09-09T22:29:11Z
- **Tasks:** 5
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- Extracted `lib/session-user.js`'s `getSessionUser(request)` from `api/billing/status.js`'s inline cookie->hash->DB lookup and refactored `status.js` onto it with byte-identical responses (verified via `git diff`)
- Moved the actual gated edition paragraphs out of `src/data/content.js` entirely into server-only `lib/gated-content.js` (D-11) — confirmed the distinctive gated phrases no longer appear anywhere in the built client bundle (D-02 fixed)
- Built `GET /api/content/editions/:no` (as `api/content/editions/[no].js`) implementing the locked D-15 fail-closed contract: 401/200-not-entitled/200-entitled/404, no 403 path, `status = 'active'` + `eclat-online` product ONLY, `Cache-Control: no-store` on every branch including the 500 error path
- Added a `vercel.json` defense-in-depth `no-store` header rule for `/api/content/(.*)`, correctly ordered between the untouched `/assets/(.*)` immutable rule and the untouched `/(.*)` security catch-all
- Extended `scripts/check-secrets.js` with a gated-text marker and proved it live with a negative test (reintroducing the phrase into `dist/assets` makes the scan fail)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract lib/session-user.js and refactor api/billing/status.js** - `1bba3c6` (feat)
2. **Task 2: Create lib/gated-content.js, purge excerpt/excerptBy from content.js** - `d501d46` (feat)
3. **Task 3: Create GET /api/content/editions/:no entitlement endpoint** - `6cade9d` (feat)
4. **Task 4: Add /api/content/(.*) no-store rule to vercel.json** - `a8fac13` (feat)
5. **Task 5: Extend check-secrets.js with the gated-text marker** - `0e0769f` (feat)

_No TDD tasks in this plan (`tdd="false"` on every task) — one commit per task._

## Files Created/Modified
- `lib/session-user.js` - Shared fail-closed `getSessionUser(request)` -> `{ user: { id } } | null`, identity only
- `api/billing/status.js` - Refactored onto `getSessionUser`; response bodies byte-identical to before
- `lib/gated-content.js` - SERVER-ONLY `gatedParagraphsFor(no)` / `editionExcerptBy(no)`, the gated text's new sole home
- `src/data/content.js` - `excerpt`/`excerptBy` deleted from both edition objects; all public fields (title/blurb/etc.) intact
- `api/content/editions/[no].js` - New `GET /api/content/editions/:no` gated entitlement endpoint (D-15/D-16/D-17)
- `vercel.json` - New `/api/content/(.*)` `Cache-Control: no-store` rule, positioned between the assets and catch-all rules
- `scripts/check-secrets.js` - New `SERVER_ONLY_IMPORT_MARKERS` entry for the gated-content phrase

## Decisions Made
- **Dynamic route file naming:** implemented at `api/content/editions/[no].js` instead of the plan's literal `api/content/editions.js`. Vercel's file-based routing only creates a path-parameterized route (`/api/content/editions/:no`) via the bracket-segment convention; a flat, non-bracketed filename would only ever match the exact path with no trailing segment and would 404 on every real request (e.g. `/api/content/editions/2`). This is exactly the "Claude's Discretion" item RESEARCH.md flagged ("Exact API route naming/shape... technical detail for research/planning"). The edition number is still parsed directly from `request.url`'s final path segment (matching RESEARCH.md's own Pattern 2 example and this codebase's existing single-argument `fetch(request)` convention), not from an assumed framework-injected `params` object.
- **Inline no-store literals over a shared constant:** kept `{ 'Cache-Control': 'no-store' }` written out on every response branch (matching `api/billing/status.js`'s existing style) instead of factoring a `NO_STORE` constant, so the no-store discipline stays directly grep-auditable per branch (the codebase's own security-review tooling greps for this literal pattern).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dynamic route required Vercel's bracket-segment filename, not the plan's literal `api/content/editions.js`**
- **Found during:** Task 3 (GET /api/content/editions/:no)
- **Issue:** The plan's `<files>` field and automated verify script both name the file `api/content/editions.js`. A flat file at that path only matches the exact URL `/api/content/editions` with no further path segment — `/api/content/editions/2` would 404 before ever reaching the handler, making the endpoint non-functional as specified (`GET /api/content/editions/:no`).
- **Fix:** Created the file at `api/content/editions/[no].js` (Vercel's dynamic path-segment convention) instead. Ran the plan's grep-based verification checks against this actual file path; all passed after one further adjustment (see deviation 2).
- **Files modified:** `api/content/editions/[no].js` (new)
- **Verification:** `node --check` passes; smoke-tested the no-session and invalid-`:no` branches directly (both return the correct fail-closed D-15 responses)
- **Committed in:** `6cade9d` (Task 3 commit)

**2. [Rule 1 - Bug] Removed a literal "403" substring from an explanatory comment**
- **Found during:** Task 3, running the acceptance criteria's literal-string grep audit
- **Issue:** A code comment ("There is NO 403 path anywhere in this contract") caused `grep -c '403'` to return 1 instead of the required 0, even though no actual 403 status code exists anywhere in the response logic — the acceptance criteria checks for the literal substring, not just runtime behavior.
- **Fix:** Reworded the comment to "There is no forbidden-status path anywhere in this contract" — same meaning, no literal digit sequence.
- **Files modified:** `api/content/editions/[no].js`
- **Verification:** `grep -c '403' "api/content/editions/[no].js"` returns 0
- **Committed in:** `6cade9d` (Task 3 commit, pre-commit fix)

---

**Total deviations:** 2 auto-fixed (1 blocking route-naming correction, 1 literal-string comment fix)
**Impact on plan:** Both fixes were necessary for the endpoint to function/verify at all — no scope creep, no behavior change beyond what D-15/D-16/D-17 already specified.

## Issues Encountered
- `npm run build`'s prerender step now fails: `src/routes/Edition.jsx` still unconditionally calls `ed.excerpt.slice(0, -1)` and reads `ed.excerpt[...]`, and `ed.excerpt` is now `undefined` after Task 2's deletion. This is expected and explicitly scoped out of this plan — Task 2's action explicitly said "Do NOT modify src/routes/Edition.jsx in this task"; that render replacement (static shell + `.plan__skeleton` + client-fetched gated block) is Plan 04-02's (Wave 2) job. Confirmed the D-02 fix at the level this plan owns: the Vite client build step (`vite build`, which runs before prerender) completed successfully and the resulting `dist/assets/` bundle contains zero occurrences of either distinctive gated phrase. **This means `npm run build` will not fully succeed, and no deploy should happen, until Plan 04-02 is also executed** — matching the plan's own stated assumption ("this wave and Wave 2 execute together before any deploy, so no intermediate state is ever shipped").
- The plan's own automated verify strings for Tasks 1 and 5 chain several `grep -c` calls with `&&`; a couple of those greps are structurally guaranteed to print `0` (an absent pattern) or a count other than the literal value asserted (e.g. Task 1's `grep -c "sessions s" api/billing/status.js` after the block is intentionally removed; Task 5's `grep -c "SERVER_ONLY_IMPORT_MARKERS"` naturally matches 2 — the declaration plus its one usage — not 1). `grep -c` on a zero-match file still exits non-zero, which would break a naive `&&` chain. Ran each check individually instead of as one chained one-liner and confirmed every check's actual intent (absence/presence of the right patterns) was satisfied; documented here rather than treated as a plan defect requiring a stop.

## User Setup Required

None - no external service configuration required. No new environment variables (Environment Availability: Step 2.6 SKIPPED, confirmed accurate).

## Next Phase Readiness
- Plan 04-02 (Wave 2) can now consume this API from `Edition.jsx`: replace the `subscribed`-boolean paywall render with the static shell + `.plan__skeleton` + `useGatedContent`/`useSafeFetch` fetch of `GET /api/content/editions/:no` (D-07..D-13), and remove the `subscribed` flag read sites across `Archive.jsx`/`Books.jsx`/`Writings.jsx`/`Account.jsx`/`store.jsx` (GATE-02).
- **Blocker for Plan 04-02 (carried forward, not a blocker for this plan):** `npm run build` will continue to fail at the prerender step until `Edition.jsx` stops reading `ed.excerpt`/`ed.excerptBy` directly — Plan 04-02 must fix this before any deploy or even before a clean local build can succeed again.
- The full live entitlement matrix (active/past_due/canceled `eclat-online`; `eclat-hardcopy`/`book-*` granting zero access) was not exercised against a real DB/session in this execution session (see D3 `human_judgment: true` above) — recommend exercising this during Phase 4's end-of-phase human UAT pass once Plan 04-02 makes the endpoint reachable from the UI.

---
*Phase: 04-content-gating-real-server-side-entitlement-enforcement*
*Completed: 2026-09-09*
