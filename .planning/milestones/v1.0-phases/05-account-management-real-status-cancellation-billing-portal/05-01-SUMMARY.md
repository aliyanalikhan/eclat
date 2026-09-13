---
phase: 05-account-management-real-status-cancellation-billing-portal
plan: 01
subsystem: api
tags: [billing, stripe, postgres, vercel-functions, session, csrf, account]

# Dependency graph
requires:
  - phase: 02-authentication-google-sign-in-server-side-sessions
    provides: cookie->hashToken->sessions-JOIN-users identity lookup; lib/session.js; the pattern lib/session-user.js extracts
  - phase: 03-billing-webhooks-stripe-checkout-and-subscription-sync
    provides: subscriptions table kept in sync via verified Stripe webhooks; Stripe SDK client (lib/stripe.js); the item-level sub.items.data[0] access pattern webhook.js uses
  - phase: 04-content-gating-real-server-side-entitlement-enforcement
    provides: lib/session-user.js shared fail-closed getSessionUser helper; the no-store-on-every-branch and generic-error-body conventions
provides:
  - "lib/products.js — server-only, frozen PRODUCT_ID_TO_KEY, PRICE_ID_TO_PRODUCT_KEY, planLabelFor reverse maps (stripe_product_id -> slug, stripe_price_id -> slug, stripe_price_id -> human label)"
  - "GET /api/billing/account — per-slug real account aggregate: DB status verbatim, live renewal, live cancelAtPeriodEnd, best-effort card + paid-invoice sections; DB always 200 (D-04); no raw Stripe identifiers on the wire (T-03)"
  - "POST /api/billing/portal — hosted Stripe Customer Portal session with own-customer scoping (D-07), CSRF-first ordering (T-06), PUBLIC_ORIGIN-only return_url (WR-07/D-06)"
affects: [05-02-account-management-client-render, phase-06]

# Actuals (#2632)
actuals:
  tokens: 6125
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Best-effort Stripe enrichment with DB-always-200 (D-04): three independent try/catch sections (live renewal + cancelAtPeriodEnd, card, invoices), each defaulting to available:false on failure — a Stripe outage never downgrades or 502s the DB-sourced account payload"
    - "Presentation-safe payload (T-03): card = brand/last4/expMonth/expYear only; invoices = number/created/amount_paid/hosted_invoice_url only; zero raw Stripe identifiers (pm_/cus_/sub_/pi_) cross the wire"
    - "UTC-based deterministic renewal formatter: formatRenews() accepts both a DB TIMESTAMPTZ (JS Date via @vercel/postgres) and Stripe epoch seconds, emits the locked 'D MMM YYYY' wire string"
    - "CSRF-first portal security ordering (WR-06/T-06): 405 method guard -> isSameOriginNavigation 403 -> session 401 -> body {action} enum 400 -> own-customer SELECT LIMIT 1 404 -> billingPortal.sessions.create; generic { error: 'unavailable' } on every failure branch"
    - "PUBLIC_ORIGIN constant copied from checkout.js's fail-fast pattern; return_url derives from PUBLIC_ORIGIN only — Host/request.url-derived origins forbidden (WR-07/D-06, ASVS 11.1)"

key-files:
  created:
    - api/billing/account.js
    - api/billing/portal.js
  modified:
    - lib/products.js

key-decisions:
  - "Locked the renews wire contract: the server pre-formats renews as a 'D MMM YYYY' string (e.g. '12 Aug 2026'), NOT the epoch value 05-01-PLAN.md's Task 2 shorthand ('renews: <unix>') implied. 05-02 Task 3 and 05-UI-SPEC §1 are authoritative ('server pre-formats — client renders the string verbatim'), and the client has zero date-formatting logic for renews. formatRenews() runs on the server against both the DB TIMESTAMPTZ value and live Stripe current_period_end (epoch seconds), so the client contract is identical regardless of source."
  - "Invoices keep epoch seconds (created) and minor units (amount_paid) on the wire — 05-02 Task 4 formats them client-side (Intl.DateTimeFormat en-GB, '$' + (amount_paid/100).toFixed(2)) per the locked contract."
  - "Card default-payment-method resolution follows RESEARCH.md Example 3 but honors prohibition 10: read the live Stripe subscription's default_payment_method (never a DB column — it does not exist), and when the id is known call paymentMethods.retrieve(pmId) for the exact payment method rather than re-listing .data[0]."
  - "No status.js modification (D-01): account.js is a brand-new sibling file; the old GET /api/billing/status keeps serving the /subscribe picker."

requirements-completed: [ACCT-01, ACCT-02, ACCT-03, ACCT-04]

coverage:
  - id: D1
    description: "lib/products.js gains PRODUCT_ID_TO_KEY (stripe_product_id -> slug), PRICE_ID_TO_PRODUCT_KEY (stripe_price_id -> slug), planLabelFor (stripe_price_id -> human label) — all frozen (Object.freeze), server-only, zero src/ imports (D-02/D-16)"
    requirement: "ACCT-01"
    verification:
      - kind: unit
        ref: "node script (scripts/tmp-verify-products.cjs): 4 product keys map to expected slugs, 8 price ids map, planLabelFor returns interval-based labels, unknown ids -> null, objects frozen (Object.isFrozen true)"
        status: pass
      - kind: other
        ref: "findstr /s /c:\"lib/products\" src\\* -> zero hits (server-only boundary clean)"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /api/billing/account builds the per-slug map from a live subscriptions SELECT (stripe_product_id, status, current_period_end, stripe_customer_id, stripe_price_id, stripe_subscription_id), skips unknown product ids, formats renews via UTC-based formatRenews(), returns the locked per-slug contract with Cache-Control: no-store on every branch"
    requirement: "ACCT-01"
    verification:
      - kind: unit
        ref: "node script (scripts/tmp-verify-account.cjs): noStore x4, getSessionUser x2, PRODUCT_ID_TO_KEY x2, planLabelFor x2, imports { sql } from lib/db.js + stripe from lib/stripe.js, per-slug keys restricted to the 4 slugs"
        status: pass
      - kind: other
        ref: "grep audits: Cache-Control no-store x4, try x6 / catch x5 (three independent best-effort sections), raw pm./cus_/sub_/pi_ identifier patterns x0 in the file"
        status: pass
      - kind: unit
        ref: "node script (scripts/tmp-verify-formatrenews.cjs) against the extracted real formatRenews(): Date object, epoch-seconds, null, undefined, invalid-date, 31-day-month and 2-digit-day cases — 6/6 passed with corrected fixtures"
        status: pass
    human_judgment: true
    rationale: "The full payload requires a real Google-authenticated session cookie plus a real Postgres subscriptions row and a live Stripe customer with a card and paid invoices. This session verified structure, greps, the formatRenews math, and the fail-closed no-session branch directly; the live signed-in branches need human/UAT verification against real data during the end-of-phase verification pass."
  - id: D3
    description: "Stripe enrichment is best-effort per section (D-04, no 502 on /account): Section A overrides renews + cancelAtPeriodEnd from the live subscription (matched by stripe_subscription_id); Section B card = brand/last4/expMonth/expYear from the resolved default payment method; Section C invoices = paid-invoices list (limit 12, no pagination, D-09/D-10) mapped to { number, created, amount_paid, hosted_invoice_url } (D-11)"
    requirement: "ACCT-01"
    verification:
      - kind: other
        ref: "grep audits: stripe.invoices.list({ customer, limit: 12, status: 'paid' }) on one line, subscriptions.list({ customer, status: 'all', limit: 10 }), paymentMethods.retrieve present, no re-list fallback when the default id is known, three independent try/catch blocks"
        status: pass
      - kind: unit
        ref: "node script: every Stripe section is wrapped in its own try/catch with available:false defaults; DB row fields (status/planLabel/renews/cancelAtPeriodEnd:false) survive a simulated Stripe throw"
        status: pass
    human_judgment: true
    rationale: "Card and invoice content can only be confirmed against a real Stripe test-mode customer with a saved payment method and paid invoices; the envelope and fallback behavior are proven, the live data values are not."
  - id: D4
    description: "POST /api/billing/portal implements the D-05..D-08 contract: 405 method guard, isSameOriginNavigation CSRF check before session/Stripe work (T-06), 401 no-session, 400 unknown action, own-customer SELECT LIMIT 1 (D-07, T-07), billingPortal.sessions.create with PUBLIC_ORIGIN-only return_url + payment_method_update flow_data, 200 {url}"
    requirement: "ACCT-02"
    verification:
      - kind: unit
        ref: "node script (scripts/tmp-verify-portal.cjs): noStore x9, method guard line < getSessionUser call line, body action enum read only, stripe_customer_id from own rows only, billingPortal.sessions.create + return_url on one line, zero request.url/Host-derived origin"
        status: pass
      - kind: other
        ref: "isSameOriginNavigation copied verbatim from checkout.js (sec-fetch-site same-origin/none pass, same-site/cross-site fail, referer fallback, fail closed); PUBLIC_ORIGIN fail-fast at module top"
        status: pass
    human_judgment: true
    rationale: "A real billingPortal.sessions.create round-trip needs a live Stripe customer id in the DB plus a valid session; the CSRF matrix (sec-fetch-site variants) needs a browser. Deferred to the end-of-phase human verification pass."
  - id: D5
    description: "Threat register T-01..T-10 mitigations all present: no-store on every branch (T-02), generic error bodies (T-09), no raw identifiers (T-03), own-customer scoping (T-07), CSRF-first ordering (T-06), PUBLIC_ORIGIN return_url (T-04)"
    requirement: "ACCT-02"
    verification:
      - kind: other
        ref: "grep audits on both endpoints: Cache-Control no-store present on 401/400/403/404/500/200 branches; { error: 'unavailable' } shape on failure branches; no console.error of response bodies to the client"
        status: pass
      - kind: other
        ref: "node scripts/check-secrets.js -> 'no leaked secrets found in dist/'; node --check passes on all three files; git diff shows zero changes to api/billing/status.js, api/billing/checkout.js, api/billing/webhook.js"
        status: pass
    human_judgment: false

duration: 28min
completed: 2026-09-10
status: complete
---

# Phase 5 Plan 1: Account Management — Real Status, Cancellation & Billing Portal Summary

**Server-side real account state (`GET /api/billing/account`) and hosted Stripe billing-portal session creation (`POST /api/billing/portal`), backed by the new server-only `lib/products.js` reverse maps — the wire contract Wave 2's `src/lib/useAccount.js` and the rebuilt `Account.jsx` will consume.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-09-10T01:34:00Z
- **Completed:** 2026-09-10T02:02:00Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Added frozen, server-only `PRODUCT_ID_TO_KEY`, `PRICE_ID_TO_PRODUCT_KEY`, `planLabelFor` to `lib/products.js` (D-02/D-16) — the reverse maps that key the account payload by slug and turn `stripe_price_id`s into human plan labels
- Built `GET /api/billing/account` returning the locked per-slug contract `{ status, planLabel, renews, cancelAtPeriodEnd, card, invoices }`: DB status verbatim (ACCT-01/ACCT-04), `renews` server-pre-formatted as `'D MMM YYYY'`, live `cancel_at_period_end` from the live Stripe subscription, best-effort card (`brand/last4/expMonth/expYear`) and paid-invoice (`number/created/amount_paid/hosted_invoice_url`, limit 12) sections (ACCT-03), DB always 200 on Stripe failure (D-04)
- Implemented a UTC-based `formatRenews()` handling both the DB TIMESTAMPTZ (JS Date) and Stripe epoch seconds, proven 6/6 against the real extracted function with corrected fixture constants
- Built `POST /api/billing/portal` with CSRF-first ordering (405 → 403 same-origin → 401 session → 400 action enum → 404 own-customer → portal session) and a `PUBLIC_ORIGIN`-only `return_url` (WR-07/D-06) plus `payment_method_update` flow_data (ACCT-02)
- Zero raw Stripe identifiers (`pm_`/`cus_`/`sub_`/`pi_`) anywhere in either payload (T-03); `Cache-Control: no-store` on every branch of both endpoints (T-02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Server-only reverse maps in lib/products.js** - `362c693` (feat, 1 file, +57)
2. **Task 2: GET /api/billing/account endpoint** - `6166e60` (feat, 1 file, +167)
3. **Task 3: POST /api/billing/portal endpoint** - `b710795` (feat, 1 file, +128)

_No TDD tasks in this plan (`tdd="false"` on every task) — one commit per task._

## Files Created/Modified
- `lib/products.js` - Added `PRODUCT_ID_TO_KEY`, `PRICE_ID_TO_PRODUCT_KEY` (both `Object.freeze`d), and `planLabelFor`; existing `PRODUCT_NAMES`/`PRODUCTS` untouched; server-only, zero imports from `src/`
- `api/billing/account.js` - New `GET /api/billing/account` aggregate endpoint (D-01..D-04, D-09..D-16)
- `api/billing/portal.js` - New `POST /api/billing/portal` portal-session endpoint (D-05..D-08)

## Decisions Made
- **Locked the `renews` wire contract as a server-pre-formatted `'D MMM YYYY'` string.** 05-01-PLAN.md's Task 2 shorthand ("renews: <unix>") conflicts with the authoritative 05-02 Task 3 + 05-UI-SPEC §1 ("server pre-formats 'D MMM YYYY' — client renders the string verbatim"). The server owns all date math via `formatRenews()` (UTC-based, deterministic for both DB and Stripe sources); the client renders the string with no formatting logic. `invoices.created` stays epoch seconds and `amount_paid` stays minor units because 05-02 Task 4 formats those client-side.
- **Default-payment-method resolution:** follow RESEARCH.md Example 3 but honor prohibition 10 — read `default_payment_method` from the live Stripe subscription (never a DB column; it does not exist), and when the id is known call `paymentMethods.retrieve(pmId)` for the exact payment method instead of re-listing `.data[0]`.
- **Inlined the `Cache-Control: no-store` literal per response branch** (matching `status.js` and Phase 4's convention) so the no-store discipline stays directly grep-auditable per branch.
- **Reused `checkout.js`'s `PUBLIC_ORIGIN` fail-fast and `isSameOriginNavigation` verbatim** (including the `sec-fetch-site` allowlist and `referer` fallback) — identical CSRF semantics across the two POST billing endpoints.

## Deviations from Plan

No plan deviations. All three tasks matched their `<files>`, action specs, and automated verification strings; `node --check` and every grep threshold passed on the first full run. No scope reduction: no deferred idea (self-serve upgrade/downgrade, unified v2 view) was pulled in.

## Issues Encountered

- **cmd.exe mangled inline `node -e` verification scripts.** `\"` sequences inside `node -e "..."` one-liners were consumed by the Windows shell, producing `SyntaxError: missing ) after argument list` (exit 1). Fixed by writing verification logic to temp `.cjs` files under `scripts/` (`scripts/tmp-verify-account.cjs`, `scripts/tmp-verify-formatrenews.cjs`, `scripts/tmp-verify-portal.cjs`), running them, and deleting them afterward to keep the tree clean.
- **formatRenews extraction initially failed with `MONTHS is not defined`** during the proof script — the function references the module-level `MONTHS` constant, which the eval-based extraction hadn't included. Fixed by extracting and providing both the constant and the function.
- **Fixture epoch constants in the formatRenews proof were miscalculated (test bug, not code bug):** `1786579200` is 2026-08-13 (not Aug 12) and `1775088000` is 2026-04-02 (not Mar 30). The function rendered the true dates correctly. Fixed the fixtures to `1786492800` (2026-08-12Z) and `1774828800` (2026-03-30Z); all 6 cases then passed. Lesson recorded: verify epoch constants before asserting.

## User Setup Required

None — both endpoints consume existing environment variables (`PUBLIC_ORIGIN`, Stripe keys, Postgres URL) already configured in Phase 1/3. No new secrets or external service setup.

## Next Phase Readiness
- Plan 05-02 (Wave 2) can now consume both endpoints: `src/lib/useAccount.js` fetches `GET /api/billing/account` as the third `useSafeFetch` consumer, and `Account.jsx` POSTs to `/api/billing/portal` for "Manage subscription" / "Update payment method" (D-05..D-08) with a post-portal-return refresh (D-06).
- The locked wire contract for Wave 2: per-slug `{ status, planLabel, renews ('D MMM YYYY' string), cancelAtPeriodEnd, card {available,brand,last4,expMonth,expYear} | {available:false}, invoices {available, items: [{number, created (epoch s), amount_paid (minor), hosted_invoice_url}]} | {available:false} }`.
- **Human verification items deferred to the end-of-phase pass:** (1) `GET /api/billing/account` signed-in full payload with a real DB row + real Stripe card/invoices; (2) a `past_due` DB row surfacing `status:'past_due'` for the ACCT-04 notice; (3) real `billingPortal.sessions.create` round-trip; (4) CSRF matrix (sec-fetch-site variants) exercised from a browser.

## Self-Check: PASSED

All created/modified files confirmed present on disk (`lib/products.js`, `api/billing/account.js`, `api/billing/portal.js`, this SUMMARY.md). All 3 commits confirmed in `git log` (`362c693`, `6166e60`, `b710795`). Plan gates re-run at summary time: `node --check` x3, `node scripts/check-secrets.js` clean, server-only boundary clean (`findstr /s /c:"lib/products" src\*` -> zero hits), and `git diff` shows zero changes to Phase 3/4 billing files (`api/billing/status.js`, `api/billing/checkout.js`, `api/billing/webhook.js`).

---
*Phase: 05-account-management-real-status-cancellation-billing-portal*
*Completed: 2026-09-10*
