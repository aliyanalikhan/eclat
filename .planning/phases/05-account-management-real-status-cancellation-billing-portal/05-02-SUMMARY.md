---
phase: 05-account-management-real-status-cancellation-billing-portal
plan: 02
subsystem: client
tags: [account, react, hooks, hooks-fail-closed, billing-portal, invoice-table, stripe, ui]

# Dependency graph
requires:
  - phase: 04-content-gating-real-server-side-entitlement-enforcement
    provides: useSafeFetch (third consumer pattern), useEntitlements fail-closed hook shape, useSession, the no-server-imports client boundary (WR-10)
  - phase: 05-account-management-real-status-cancellation-billing-portal
    plan: 01
    provides: GET /api/billing/account locked per-slug wire contract; POST /api/billing/portal {action}→{url}; server-pre-formatted renews 'D MMM YYYY'
provides:
  - "src/lib/useAccount.js — fail-closed, single-shot useSafeFetch consumer of GET /api/billing/account; EMPTY={subscriptions:{}} stable identity; error:Boolean(error) (D-01/D-04/D-06)"
  - "src/routes/Account.jsx rebuilt — real per-product panels in PRODUCTS order with productName eyebrows (D-02/D-16); 3-state status map with '—' fail-closed; state-aware renews/access-until key (D-14); '{Brand} •••• {last4}' card render (D-15); state-aware CTA row (D-08); ACCT-04 --bad notice; one invoice table across all held products (D-09..D-12); openPortal POST + location.assign (WR-06); post-portal remount refresh (D-06)"
affects: [phase-06, verification]

# Actuals (#2632)
actuals:
  tokens: 3410
  tasks: 4
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fail-closed hook consumption (D-04): useAccount returns data ?? module-level EMPTY ({subscriptions:{}} — stable identity, no re-render churn) and error:Boolean(error); the page treats error===true as 'unknown outcome', never as 'no subscriptions', and renders a --bad reload message instead of the no-subscription upsell"
    - "Single-shot fetch, remount-refresh (D-06): useSafeFetch('/api/billing/account', { enabled: true, key: 0 }) fetches once per mount — no polling, no refetch key; returning from the Stripe portal remounts the /account route → fresh fetch with zero client state (no toast/banner/diffing)"
    - "Presentation-only client (T-02): renders brand + last4 only, renders server-pre-formatted renews/planLabel verbatim, adds no date math for renewals (invoice dates only), and never touches a Stripe id — a tampered/replaced payload cannot fabricate a different customer's data"
    - "External-target discipline (WR-06): the only server-supplied navigation is consumed via window.location.assign(url) after a same-origin POST — never an anchor and never a popup; hosted_invoice_url receipts use target=_blank rel=noopener noreferrer"
    - "Zero-new-CSS ACCT-04 notice: reuses .demo-notice/__tag/__text with inline --bad overrides (borderColor, background color-mix, tag background), following the Subscribe.jsx:161-178 precedent"
    - "Source-comment hygiene: comments deliberately avoid literal grep terms (e.g. the popup API name and the CTA string) so automated proof greps cannot false-positive on documentation"

key-files:
  created:
    - src/lib/useAccount.js
  modified:
    - src/routes/Account.jsx

key-decisions:
  - "Per-product panel order follows src/data/products.js PRODUCTS array order verbatim (D-16) — the page does not define its own ordering; heldKeys = PRODUCTS.map(p=>p.key).filter(k=>subs[k])."
  - "Unknown/blank status fails closed to an em-dash with no status dot (STATUS map hit-test); renews/planLabel/card also fall back to '—' rather than rendering an empty string, so a partial payload never shows a blank cell."
  - "Whole-page account error renders 'Couldn't confirm your account — reload to try again.' in place of panels — the no-subscription upsell is unreachable when error===true (fail-closed ordering: error branch is evaluated before the zero-held branch)."
  - "Invoice best-effort degradation is invoice-only: invoicesUnavailable (any held product with invoices.available===false) swaps just the Billing history block for the --bad message while all panels above still render."
  - "Three prescriptive grep counts in 05-02-PLAN.md are unsatisfiable against the phase's own Copywriting Contract and were implemented per contract with a documented PLAN-DEFECT note (see Deviations)."

requirements-completed: [ACCT-01, ACCT-02, ACCT-03, ACCT-04]

coverage:
  - id: D1
    description: "src/lib/useAccount.js is the third useSafeFetch consumer: fetches GET /api/billing/account once (enabled:true, key:0), returns { loading, data: data ?? EMPTY, error: Boolean(error) } with EMPTY={subscriptions:{}} and a JSDoc'd D-01 200|401 contract; imports nothing from lib/ or api/ (WR-10)"
    requirement: "ACCT-01"
    verification:
      - kind: unit
        ref: "node script (.roo/tmp-verify-useaccount.cjs, 8 checks): useSafeFetch >=1, '/api/billing/account' >=1, EMPTY >=2, Boolean(error) >=1, enabled:true >=1, key:0 >=1, no lib//api/ imports, .js extension"
        status: pass
    human_judgment: false
  - id: D2
    description: "Account.jsx replaces the single mocked panel + content.js invoices with real per-product panels driven by useAccount; the mock invoices import is gone; the signed-out redirect and the page-level loading gate are preserved and extended to cover accountLoading"
    requirement: "ACCT-01"
    verification:
      - kind: other
        ref: "grep 'data/content' src/routes/Account.jsx -> 0; verifier PASS 'data/content == 0 (mock invoices gone)'; useAccount >=2 (import + call); accountLoading >=2 (destructure + gate); PRODUCTS/productName >=1"
        status: pass
      - kind: other
        ref: "npm run build -> 59 modules transformed, SSR 28 modules, prerender 10 routes, no errors"
        status: pass
    human_judgment: true
    rationale: "Real per-product values (status/plan/renews/card) require a signed-in session with live DB rows + Stripe data; the envelope, ordering, fail-closed fallbacks and compile are proven here, the live values at end-of-phase verification."
  - id: D3
    description: "State-aware CTA row + ACCT-04 notice: active/past_due render Manage (openPortal('manage')), canceled renders no CTA; past_due additionally renders the verbatim --bad demo-notice with Update payment method (openPortal('payment_method_update')); Subscribe appears only in the zero-held block (WR-01)"
    requirement: "ACCT-04"
    verification:
      - kind: other
        ref: "verifier PASS: openPortal >=3 (definition + 2 calls); payment_method_update >=1; demo-notice >=2; 'Payment failed' >=1; verbatim body >=1; WR-01 structural check 'no Subscribe inside the held-panels branch'"
        status: pass
      - kind: other
        ref: "verifier PASS: 'Access until' >=1 (D-14 canceled key) and 'Renews' >=1 (D-14 active key); past_due >=2 (status map + notice branch)"
        status: pass
    human_judgment: true
    rationale: "Requires a real past_due DB row to see the ACCT-04 notice render under the correct panel and to confirm the button round-trips to the portal; the render branches and greps are proven."
  - id: D4
    description: "openPortal(action) = same-origin POST /api/billing/portal {action} -> if (!res.ok) return (DB state stays) -> window.location.assign(url); never an anchor, never a popup (WR-06). One invoice table across all held products: flatten, sort created DESC, slice 12, 'D MMM YYYY' dates, '$'+(amount_paid/100).toFixed(2), hosted_invoice_url receipts with rel=noopener noreferrer; degradation and empty states verbatim"
    requirement: "ACCT-03"
    verification:
      - kind: other
        ref: "verifier PASS: '/api/billing/portal' >=1; window.location.assign >=2; WR-06 check window.open|<a href=\"/api/billing/portal\" == 0; hosted_invoice_url >=2; rel=\"noopener noreferrer\" >=1; amount_paid >=1; toFixed(2) >=1; 'No invoices yet' >=1; 'Invoice history is temporarily unavailable' >=1; Intl en-GB 'D MMM YYYY' formatter present"
        status: pass
      - kind: other
        ref: "verifier PASS: no raw Stripe identifiers pm_/cus_/sub_/pi_ in useAccount.js or Account.jsx; check-secrets.js -> 'no leaked secrets found in dist/'"
        status: pass
    human_judgment: true
    rationale: "Table composition across two products, the <=12 cap with >12 invoices, the new-tab receipt, and the full portal redirect + remount-refresh round trip require a browser against real Stripe/DB data; deferred to end-of-phase verification."

duration: 22min
completed: 2026-09-10
status: complete
---

# Phase 5 Plan 2: Account Management — Real Status, Cancellation & Billing Portal Summary

**The `/account` surface rebuilt against Wave 1's locked wire contract: a fail-closed `useAccount` hook plus a full `Account.jsx` rewrite delivering real per-product panels, state-aware CTAs, the ACCT-04 payment-failed notice, an all-products invoice table, and Stripe billing-portal redirection — zero mocked data, zero new CSS.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-10T02:03:00Z
- **Completed:** 2026-09-10T02:25:00Z
- **Tasks:** 4
- **Files modified:** 2 (1 created, 1 rewritten)

## Accomplishments
- Added `src/lib/useAccount.js`, the third `useSafeFetch` consumer and the single client source of account truth: one `no-store` GET per mount (`enabled: true, key: 0`), a module-level `EMPTY = { subscriptions: {} }` stable default, and `error: Boolean(error)` fail-closed semantics (D-01/D-04/D-06)
- Rebuilt `src/routes/Account.jsx` (~275 lines) — deleted the mocked panel and the `src/data/content.js` invoices import; the page now renders solely from `data.subscriptions`
- Per-held-product panels in fixed `PRODUCTS` array order with `productName(key)` eyebrows (D-02/D-16), each showing Status (3-state dot/label map, unknown → '—' no dot), Plan (`planLabel || '—'`), a state-aware key (`sub.status === 'canceled' ? 'Access until' : 'Renews'`, D-14), and Card (`'{Brand} •••• {last4}'` only when available, else '—', D-15)
- State-aware CTA row: active/past_due → Manage; canceled → no CTA; the past_due product never dead-ends into Subscribe (WR-01, D-08)
- ACCT-04 `--bad` payment-failed notice reusing `.demo-notice`/`__tag`/`__text` with inline `--bad` overrides (zero new CSS), tagged "Payment failed" with verbatim body and an "Update payment method" action (D-08)
- Billing history: one table across ALL held products (flatten → sort `created` DESC → slice 12, D-09/D-10/D-12) with `Intl.DateTimeFormat('en-GB')` dates, real invoice numbers, `'$' + (amount_paid/100).toFixed(2)` amounts, and `hosted_invoice_url` receipts in a new tab; invoice-only degradation to "Invoice history is temporarily unavailable." (D-04) and the "No invoices yet." empty state
- `openPortal(action)` implemented as a same-origin POST → `window.location.assign(url)` — never an anchor, never a popup (WR-06); post-portal return remounts the route for a fresh fetch with no toast/banner (D-06/§7)
- Fail-closed ordering: the account-error branch (`--bad` "Couldn't confirm your account — reload to try again.") is evaluated before the zero-held branch, so an unknown outcome can never render the no-subscription upsell

## Task Commits

The plan's Task 2 reversibility note states Tasks 2, 3 and 4 "ship with ... as the client wave" — the Account.jsx file is a single coherent component, so Tasks 2–4 were implemented and committed together (one file), with Task 1 separate:

1. **Task 1: src/lib/useAccount.js (fail-closed hook)** - `a500a4f` (feat, 1 file, +55)
2. **Tasks 2–4: Account.jsx rebuild (panels + CTA + ACCT-04 notice + invoice table + portal handlers)** - `59e2388` (feat, 1 file, +212/−77)

_No TDD tasks in this plan (`tdd="false"` on every task). Wave 1's precedent (one commit per file) applies to the combined Tasks 2–4 rewrite._

## Files Created/Modified
- `src/lib/useAccount.js` - New fail-closed account-state hook; third `useSafeFetch` consumer; single-shot `GET /api/billing/account`
- `src/routes/Account.jsx` - Full rebuild replacing mocked content: per-product panels, state-aware CTA row, ACCT-04 notice, all-products invoice table, `openPortal` handler; mocked panel + `src/data/content.js` invoices import removed

## Decisions Made
- **Panel order is data-driven, not UI-declared.** `heldKeys` derives from `PRODUCTS.map(p => p.key).filter(key => subs[key])`, hard-wiring the D-16 fixed order by construction and guaranteeing a panel can never appear for a product the server did not return.
- **Partial payloads degrade per field, not per panel.** Unknown status → '—' (no dot); missing `planLabel`/`renews` → '—'; card renders only when `available && brand && last4`, otherwise '—' — so a best-effort Stripe miss silently degrades that cell instead of blanking the panel.
- **Fail-closed branch ordering is load-bearing.** Because `if (accountError)` precedes the zero-held check, an account outage can never present as "you have no subscriptions" — it presents as an explicit retry prompt.
- **Invoice degradation is scoped to the table only,** so a Stripe invoice outage never hides real subscription state (panels still render).
- **Implemented the three unsatisfiable grep counts per the prescriptive Copywriting Contract** and documented them as PLAN-DEFECTs rather than contorting the copy (see Deviations).

## Deviations from Plan

Three prescriptive counts in 05-02-PLAN.md's `<verification>`/success criteria are unsatisfiable against the phase's own authoritative 05-UI-SPEC.md Copywriting Contract. In each case the Copywriting Contract was treated as authoritative and the plan's grep was adjusted with a PLAN-DEFECT note (implementing per contract, asserting the contract-correct value):

- **`grep -rn "Subscribe" src/routes/Account.jsx` → "exactly 1" is unsatisfiable.** The required verbatim zero-held notice body is "You don't have an active subscription yet. Subscribe to unlock full issues, books, and more." (contains "Subscribe") AND the required CTA is a "Subscribe" `Link` — that is 2 occurrences by contract. Implemented = 2 (notice body + CTA Link). The plan's structural *intent* (WR-01: no "Subscribe" in the held-panels branch, so past_due never dead-ends) was verified explicitly instead and PASSES; the single-CTA invariant was also verified (`/>\s*Subscribe\s*<\/Link>/g` occurs exactly once).
- **`Update payment method` count.** The plan/success-criteria implied the ACCT-04 body and action both contain the literal, but the Copywriting Contract body says "Update your card" and the D-08 portal action is `payment_method_update` (underscore-separated). Implemented = 1 (the button label only); `payment_method_update >= 1` PASSES separately.
- **`node --check src/routes/Account.jsx` is not executable.** Node 22 cannot `--check` a `.jsx` file (ERR_UNKNOWN_FILE_EXTENSION). The plan's own verification step 1 (`npm run build`) is the definitive compile gate and was used instead — it PASSED.

No scope reduction, and no deferred idea (self-serve upgrade/downgrade, unified v2 view) was pulled in.

## Issues Encountered

- **`node --check` cannot parse `.jsx`.** Node 22 rejects the extension (`ERR_UNKNOWN_FILE_EXTENSION`), so the plan's per-file syntax greps for `Account.jsx` are unworkable. Resolved by relying on `npm run build` (Vite/Rollup actually compiles the file), which is also the plan's verification step 1.
- **Source comments created false positives in automated proof greps.** An early verifier run failed three checks because comments literally contained "Subscribe" and the popup API name. Fixed by rewording the comments (e.g. "generalized notice + CTA", "never an anchor or popup") so documentation cannot trip the WR-06/WR-01 proofs; the verifier's multiline `Link` regex was also corrected to `/>\s*Subscribe\s*<\/Link>/g`.
- **cmd.exe mangling of inline `node -e`** (carried over from Wave 1) again forced the temp-`.cjs` verifier pattern: `.roo/tmp-verify-useaccount.cjs` (8 checks) and `.roo/tmp-verify-accountjsx.cjs` (31 checks).

## User Setup Required

None — the client consumes only same-origin endpoints already configured in Phase 1/3/5 Wave 1. No new secrets or environment variables.

## Next Phase Readiness
- Plan 05-02 is complete; Wave 2 (client) now consumes Wave 1's `GET /api/billing/account` and `POST /api/billing/portal` end to end. Phase 5's four requirements (ACCT-01..ACCT-04) are implemented on both sides of the wire.
- **Human verification items deferred to the end-of-phase pass (require `vercel dev`, seeded DB, real Google session):** (1) active multi-product subscriber → ordered panels with real status/plan/renews/card; (2) past_due row → ACCT-04 notice under the correct panel and no Subscribe dead-end; (3) canceled row → "Access until" key + no CTA; (4) >12 paid invoices across two products → one most-recent-first table with correct dates/amounts and new-tab receipts; (5) forced account and invoice failures → the two distinct `--bad` degradations; (6) full portal round trip → redirect and, on return, post-action state with no toast.

## Self-Check: PASSED

Both files confirmed on disk (`src/lib/useAccount.js`, `src/routes/Account.jsx`, this SUMMARY.md). Both commits confirmed in `git log` (`a500a4f`, `59e2388`). Plan gates re-run at summary time against the committed tree: `npm run build` green (59 modules + SSR + prerender 10 routes), `node --check-secrets.js` → "no leaked secrets found in dist/", and the 31-check verifier → ALL_CHECKS_PASS (including the PLAN-DEFECT-adjusted assertions and the WR-01/WR-06 structural proofs).

---
*Phase: 05-account-management-real-status-cancellation-billing-portal*
*Completed: 2026-09-10*
