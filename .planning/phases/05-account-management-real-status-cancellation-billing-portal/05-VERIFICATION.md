---
phase: 05-account-management-real-status-cancellation-billing-portal
verified: 2026-09-10T19:30:00Z
status: gaps_found
score: 2/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "useAccount fails closed on a server-side auth/DB failure exactly like useEntitlements — an unknown outcome must never render as 'no subscription' (D-04 client mirror)."
    status: failed
    reason: "CR-01 (confirmed in code): src/lib/useSafeFetch.js resolves on any successful fetch() promise, regardless of HTTP status — it never checks response.ok/status before calling r.json(). api/billing/account.js deliberately returns 401 { subscriptions: {} } for BOTH 'not signed in' and a DB query failure (account.js:60-62), which is a well-formed 2xx-shaped JSON body. useSafeFetch treats this as success: setData({ subscriptions: {} }), error stays false. useAccount.js then returns { data: EMPTY, error: false } to Account.jsx, which renders the zero-held 'Subscribe' upsell — not the '--bad' 'Couldn't confirm your account' branch. A transient DB outage for a real paying subscriber is indistinguishable, client-side, from having zero subscriptions."
    artifacts:
      - path: "src/lib/useSafeFetch.js"
        issue: "fetch(url,...).then(r => r.json()) — no r.ok/r.status check before treating the body as data (lines 44-45)"
      - path: "src/lib/useAccount.js"
        issue: "Docstring (lines 32-34) promises 'any 401 ... sets error: true' but this is not true given useSafeFetch's implementation — the promise is unenforced"
    missing:
      - "useSafeFetch must check r.ok (or r.status) and throw/reject before r.json() so a non-2xx response — including account.js's intentional 401 fail-closed responses — surfaces as error:true, not as a successful empty payload."
  - truth: "Invoices render in ONE table for all held products (D-12), most-recent-first, up to 12 rows, with no duplication."
    status: failed
    reason: "CR-02 (confirmed in code): api/billing/account.js Section C assigns the SAME shared invoice array reference to subscriptions[key].invoices.items for every held product key (account.js:156-158, by design — one Stripe customer, one invoice list). src/routes/Account.jsx:95-99 then does Object.values(subs).map(s => s.invoices.items).flat() — for a customer holding N held products, this concatenates N identical copies of the same invoice list. A subscriber with 2 held products sees every invoice duplicated, halving the effective 12-row cap to 6 distinct invoices, and produces duplicate React list keys (key={number} at Account.jsx:250)."
    artifacts:
      - path: "src/routes/Account.jsx"
        issue: "Lines 95-99: Object.values(subs).flat() re-flattens the same shared invoices.items array once per held product instead of reading it from a single held key"
    missing:
      - "Read the shared invoice list from a single held key (e.g. subs[heldKeys[0]]?.invoices?.items) instead of flattening across Object.values(subs), per the reviewer's suggested fix."
  - truth: "cancel_at_period_end is read LIVE from Stripe and drives the D-14 label — a still-active sub with cancelAtPeriodEnd=true must render 'Access until', not 'Renews' (explicit must-have in 05-01-PLAN.md and locked decision D-14 per 05-RESEARCH.md line 251: '\"Access until {date}\" nuance')."
    status: failed
    reason: "CR-03 (confirmed in code): api/billing/account.js Section A does a live stripe.subscriptions.list call specifically to compute cancelAtPeriodEnd per held product and ships it on the wire (account.js:97-104; documented in useAccount.js:24). src/routes/Account.jsx never reads sub.cancelAtPeriodEnd anywhere — grep across src/ finds the field only in the useAccount.js docstring, never as a consumed value. Account.jsx:140 computes renewsKey solely from sub.status === 'canceled', ignoring cancelAtPeriodEnd entirely. A subscriber who has cancelled via the portal but is still within their paid period (Stripe status stays 'active', cancel_at_period_end:true) sees 'Active' / 'Renews: <date>' / a 'Manage' button — no indication their subscription will not renew. This directly undermines ACCT-02 (the user just cancelled and gets no confirmation the cancellation took effect) and the D-14 decision as locked in 05-CONTEXT.md/05-RESEARCH.md."
    artifacts:
      - path: "src/routes/Account.jsx"
        issue: "renewsKey (line 140) and the CTA-row gate (line 185) key only off sub.status, never sub.cancelAtPeriodEnd — the field is fetched server-side (at Stripe API cost) and never rendered"
    missing:
      - "renewsKey should read 'Access until' when sub.status === 'canceled' OR sub.cancelAtPeriodEnd is true; ideally also suppress/relabel the 'Manage' CTA or add an inline notice for the canceling-but-still-active case, per the reviewer's suggested fix."
deferred: []
human_verification:
  - test: "Signed-in active subscriber holding 2+ products (e.g. eclat-online + book-online), each with paid invoices — load /account and inspect the Billing history table."
    expected: "Prior to a CR-02 fix this will show every invoice duplicated once per held product with duplicate React keys (visible as a console key-warning and doubled rows); confirms CR-02 in a live browser."
    why_human: "Requires a seeded DB with 2+ held products and real Stripe invoices; cannot be exercised via grep/static analysis alone."
  - test: "Cancel an active subscription via the 'Manage' → Stripe portal flow, return to /account before the current period ends."
    expected: "Prior to a CR-03 fix, the panel will still show 'Active' / 'Renews <date>' / a 'Manage' button with no indication the subscription was cancelled — confirms CR-03 end-to-end."
    why_human: "Requires a live Stripe test-mode cancellation round trip through the hosted portal."
  - test: "Force a transient DB/session failure while a real signed-in paying subscriber loads /account (e.g. temporarily break the DB connection string or throw inside the subscriptions SELECT)."
    expected: "Prior to a CR-01 fix, the page will render the 'You don't have an active subscription yet. Subscribe...' upsell instead of 'Couldn't confirm your account — reload to try again.' — confirms CR-01 end-to-end and shows the risk of prompting a paying customer to pay again."
    why_human: "Requires deliberately inducing a server-side failure against a live deployment/dev server; not observable via static code reading alone (the logic path is confirmed by code trace above, but the end-user-visible outcome is best confirmed live)."
  - test: "Canceled-product panel — verify there is genuinely no path back to /subscribe for that specific product from the Account page itself (WR-04 finding, non-blocking)."
    expected: "Canceled panel shows Status/Plan/'Access until'/Card and nothing actionable; global header 'Subscribe' link is the only resubscribe path."
    why_human: "Visual/UX judgment call on whether this is acceptable — confirmed structurally in code (Account.jsx:185 gates the CTA row on status !== 'canceled' with no fallback), routed here as a warning, not a blocker."
---

# Phase 5: Account Management — Real Status, Cancellation & Billing Portal Verification Report

**Phase Goal:** A user can view and manage their real subscription from the Account page — status, renewal date, invoices, and cancellation are all backed by live Stripe data instead of mocks.
**Verified:** 2026-09-10T19:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial phase-level verification (05-02-VERIFICATION.md was a per-plan automated-gate pass with the manual matrix deferred to this pass)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees real subscription status (active/canceled/past due) and renewal date (SC1/ACCT-01) | ✗ FAILED | Server contract is correct (`api/billing/account.js` returns DB status + live-enriched renewal verbatim), but the client-side fail-closed guarantee (CR-01) and the missing `cancelAtPeriodEnd` render (CR-03) both undermine the accuracy of what's shown on error/cancellation edge cases — see gaps 1 and 3 below |
| 2 | User can cancel a subscription via Stripe's hosted Customer Portal (SC2/ACCT-02) | ⚠️ Mechanically VERIFIED, but undermined | `api/billing/portal.js` correctly creates a portal session (CSRF-first, own-customer scoped, `PUBLIC_ORIGIN`-only return_url) and `Account.jsx`'s `openPortal('manage')` correctly redirects via `window.location.assign`. However, after a real cancellation the Account page gives the user zero confirmation it took effect (CR-03) — counted against gap 3, not double-counted here |
| 3 | User sees real invoice history, one table, most-recent-first, ≤12 rows (SC3/ACCT-03) | ✗ FAILED | `api/billing/account.js` Section C and `Account.jsx`'s render/format/receipt-link logic are individually correct, but the duplication bug (CR-02) means any customer with 2+ held products sees every invoice repeated — see gap 2 below |
| 4 | User sees a clear "payment failed, update your card" notice when past due (SC4/ACCT-04) | ✓ VERIFIED | `Account.jsx:200-226` renders the verbatim `.demo-notice`-based notice with `--bad` inline overrides exactly under a `past_due` panel only, wired to `openPortal('payment_method_update')` → `POST /api/billing/portal {action:'payment_method_update'}` with `flow_data.type: 'payment_method_update'` server-side (`api/billing/portal.js:118`). Also correctly avoids WR-01's dead-end "Subscribe" CTA for `past_due` (renders "Manage" instead, `Account.jsx:185-195`) |
| 5 | No raw Stripe identifiers, no server-only imports, presentation-safe payload only (T3/T9/WR-10) | ✓ VERIFIED | Read both endpoint files directly: `card` = `{available,brand,last4,expMonth,expYear}` only; `invoices.items` = `{number,created,amount_paid,hosted_invoice_url}` only; generic `{error:'unavailable'}` on every failure branch; `Cache-Control: no-store` on every branch of both endpoints; `grep -rn "pm_\|cus_\|sub_\|pi_"` across `src/lib/useAccount.js src/routes/Account.jsx` → 0 hits; `lib/products.js` has zero `src/` importers |

**Score:** 2/5 truths verified (3 failed — see Gaps Summary)

### Independent Confirmation of 05-REVIEW.md's 3 Critical Findings

All three CRITICAL findings from `05-REVIEW.md` were independently re-derived by reading the actual source (not taken on faith) and are **confirmed real, unresolved defects** as of this verification (no fix commits exist after the review; `git log` on the phase's files shows only the 5 original implementation commits):

| Review ID | Claim | Independent confirmation |
|-----------|-------|---------------------------|
| CR-01 | `useSafeFetch` never checks `response.ok`; a DB-outage 401 with `{subscriptions:{}}` body reads as success | **CONFIRMED.** Read `src/lib/useSafeFetch.js:44-45` — `fetch(url,...).then(r => r.json())` has no status check whatsoever between the two calls. Read `api/billing/account.js:60-62` — the DB-catch branch returns `401 Response.json({subscriptions:{}}, ...)`, a well-formed JSON body that `r.json()` will happily parse. `useAccount.js` returns `error: Boolean(error)` which stays `false` in this path. |
| CR-02 | Invoice list is one shared array reused per held product; client flattens without dedup | **CONFIRMED.** `api/billing/account.js:156-158` assigns the identical `items` array to `subscriptions[key].invoices` inside a `for (const key of Object.keys(subscriptions))` loop — same reference, not a copy, for every key. `src/routes/Account.jsx:95-99` does `Object.values(subs).map(s => s.invoices.items).flat()` with no dedup — for 2 held products this doubles every invoice. |
| CR-03 | `cancelAtPeriodEnd` computed server-side but never read client-side | **CONFIRMED.** `grep -rn "cancelAtPeriodEnd" src/` returns exactly one hit — the JSDoc comment in `src/lib/useAccount.js:24`. Zero occurrences in `Account.jsx`. `Account.jsx:140`'s `renewsKey` computation checks only `sub.status === 'canceled'`. Cross-checked against the phase's own locked decision record: `05-RESEARCH.md:251` and `05-CONTEXT.md:50` both define D-14 as requiring the "Access until {date}" nuance to be driven by `cancel_at_period_end` for a still-`active` subscription — this is not implemented. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/products.js` | Server-only frozen reverse maps: `PRODUCT_ID_TO_KEY`, `PRICE_ID_TO_PRODUCT_KEY`, `planLabelFor` | ✓ VERIFIED | All three present, frozen (`Object.freeze` on both maps), zero `src/` importers confirmed by grep, existing `PRODUCTS`/`isProductKey`/`getProduct` untouched |
| `api/billing/account.js` | `GET /api/billing/account` — DB-always-200 + 3 independent best-effort Stripe sections | ✓ VERIFIED (artifact level) | Exists, substantive, correctly wired to `lib/products.js`/`lib/db.js`/`lib/stripe.js`/`lib/session-user.js`; no-store on every branch; three independent try/catch sections confirmed by reading the file. Note: correctness of the *composition contract* the client depends on (D-04 fail-closed mirror) is broken client-side — see gap 1 |
| `api/billing/portal.js` | `POST /api/billing/portal` — CSRF-first, own-customer scoped, `PUBLIC_ORIGIN`-only return_url | ✓ VERIFIED | Ordering confirmed by reading the file top to bottom: method guard → CSRF → session → action enum → own-customer SELECT → `billingPortal.sessions.create` → 200; generic error bodies + no-store on every branch; `console.error` logs the StripeError server-side only |
| `src/lib/useAccount.js` | Third `useSafeFetch` consumer, fail-closed wrapper | ⚠️ ORPHANED CONTRACT | File exists, is wired (imported and called from `Account.jsx`), single-shot (`enabled:true, key:0`) confirmed — but its documented fail-closed contract (lines 32-34) does not actually hold given `useSafeFetch`'s implementation (gap 1) |
| `src/routes/Account.jsx` | Full rebuild: per-product panels, 3-state status, D-13/14/15 fields, state-aware CTA, ACCT-04 notice, one invoice table, portal handlers | ⚠️ WIRED but two behaviors defective | Mock invoices import gone (`grep "data/content"` → 0), all panels/CTA/notice render logic present and wired to real data — but invoice dedup (gap 2) and `cancelAtPeriodEnd` (gap 3) are missing/incorrect |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/lib/useAccount.js` | `api/billing/account` | `useSafeFetch('/api/billing/account', {enabled:true, key:0})` | ✓ WIRED (mechanically) | Confirmed by reading both files; the link fetches correctly. The *reliability* of what it returns on error is broken (gap 1), which is a behavior defect, not a wiring gap |
| `src/routes/Account.jsx` | `src/lib/useAccount.js` | `const {loading, data, error} = useAccount()` | ✓ WIRED | `data.subscriptions` drives `heldKeys`/panels directly |
| `src/routes/Account.jsx` | `src/data/products.js` | `PRODUCTS`/`productName(key)` for D-16 order + eyebrow labels | ✓ WIRED | `heldKeys = PRODUCTS.map(p=>p.key).filter(key=>subs[key])` — confirmed fixed order by construction |
| `src/routes/Account.jsx` | `api/billing/portal` | `openPortal(action)` → `fetch POST` → `window.location.assign(url)` | ✓ WIRED | Confirmed same-origin POST, no `<a href>`/`window.open`; non-ok response is a no-op (DB state stays) |
| `api/billing/account.js` | `lib/stripe.js` | Best-effort sections A/B/C | ✓ WIRED | All three sections present, independently try/caught, correct API calls (`subscriptions.list`, `paymentMethods.retrieve`/`listPaymentMethods`, `invoices.list` with `limit:12, status:'paid'`) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| Status/Plan/Renews/Card panel fields | `sub.status`/`sub.planLabel`/`sub.renews`/`sub.card` | `data.subscriptions[key]` ← `GET /api/billing/account` ← DB `SELECT` + live Stripe reads | Yes | ✓ FLOWING |
| Invoice table rows | `invoiceItems` | `data.subscriptions[*].invoices.items` ← `stripe.invoices.list` | Yes, but duplicated across held products | ⚠️ FLOWING WITH DEFECT (CR-02) |
| `cancelAtPeriodEnd` | computed server-side, present on the wire | `data.subscriptions[key].cancelAtPeriodEnd` | Computed but never read | ✗ DISCONNECTED (fetched, never rendered — CR-03) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build compiles both new/edited client files | `npm run build` | 59 modules + SSR 28 modules + prerender 10 routes, no errors, `check-secrets: no leaked secrets found in dist/` | ✓ PASS |
| No debt markers in phase files | `grep -n "TODO\|FIXME\|XXX\|HACK\|PLACEHOLDER"` across all 6 phase files | 0 hits | ✓ PASS |
| No fix commits since review | `git log --oneline -8 -- api/billing/account.js api/billing/portal.js lib/products.js src/lib/useAccount.js src/routes/Account.jsx` | Only the 5 original implementation commits (362c693, 6166e60, b710795, a500a4f, 59e2388) | ✓ PASS (confirms gaps are still open, not stale) |
| `cancelAtPeriodEnd` client-side usage | `grep -rn "cancelAtPeriodEnd" src/` | 1 hit (docstring only, `useAccount.js:24`) | ✗ FAIL (confirms CR-03) |
| Invoice flatten dedup | Manual trace of `Account.jsx:95-99` against `account.js:156-158`'s shared-reference assignment | Confirmed: same array object assigned per held key, `Object.values().flat()` has no dedup | ✗ FAIL (confirms CR-02) |
| Response-status check in `useSafeFetch` | Manual trace of `useSafeFetch.js:44-45` | Confirmed: no `r.ok`/`r.status` check exists | ✗ FAIL (confirms CR-01) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist in this repo and no PLAN/SUMMARY/VERIFICATION for this phase references a probe script. Skipped — no probes declared or discovered.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|--------------|--------|----------|
| ACCT-01 | 05-01, 05-02 | Real subscription status + renewal date | ✗ BLOCKED | Server-side correct; client-side fail-closed contract (CR-01) and missing cancellation-in-progress indicator (CR-03) both undermine the accuracy guarantee this requirement implies |
| ACCT-02 | 05-01, 05-02 | Cancel via Stripe hosted Customer Portal | ⚠️ NEEDS HUMAN (mechanically works, outcome invisible) | Portal creation/redirect verified correct; post-cancellation UI feedback is the CR-03 gap |
| ACCT-03 | 05-01, 05-02 | Real invoice history | ✗ BLOCKED | Duplication bug (CR-02) for any customer with 2+ held products |
| ACCT-04 | 05-01, 05-02 | Payment-failed notice when past due | ✓ SATISFIED | Notice renders correctly, verbatim copy, correct CTA, WR-01 dead-end avoided |

**Orphaned requirements check:** `grep -E "Phase 5" .planning/REQUIREMENTS.md` and the traceability table both map exactly ACCT-01..ACCT-04 to Phase 5; both plans (`05-01-PLAN.md`, `05-02-PLAN.md`) declare `requirements: [ACCT-01, ACCT-02, ACCT-03, ACCT-04]` in frontmatter. No orphaned requirements — full coverage on paper, but 3 of the 4 are undermined by the confirmed defects above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/useSafeFetch.js` | 44-45 | Missing HTTP status check before treating a response body as valid data | 🛑 Blocker | Root cause of CR-01; also silently affects `useEntitlements`/`useGatedContent` (Phase 4's gating hooks), a wider blast radius than this phase alone |
| `src/routes/Account.jsx` | 95-99 | Flattening a shared array reference across multiple map keys without dedup | 🛑 Blocker | Root cause of CR-02 (invoice duplication) |
| `src/routes/Account.jsx` | 140, 185 | Field fetched server-side (`cancelAtPeriodEnd`) but never consumed client-side | 🛑 Blocker | Root cause of CR-03 (silent cancellation state) |
| `api/billing/account.js` | 60-62 | DB-error branch returns the identical 401 shape/status as "not authenticated," with no server-side logging | ⚠️ Warning | WR-01 (review numbering) — conflates infra failure with auth failure; makes CR-01's blast radius worse and harder to detect operationally |
| `api/billing/account.js` | 87 | `rows[0]` with no `ORDER BY` for the "single customer" assumption | ⚠️ Warning | WR-02 — nondeterministic row selection if the single-customer invariant is ever violated |
| `api/billing/account.js` | 40 | No HTTP method guard on a GET-only endpoint (inconsistent with sibling `portal.js`) | ⚠️ Warning | WR-03 — low exploitability, but inconsistent defensive posture |
| `src/routes/Account.jsx` | 185 | Canceled-product panels render no CTA at all, and once a product is ever cancelled it holds a `subscriptions` row indefinitely so the page's own zero-held "Subscribe" block never reappears for it | ⚠️ Warning | WR-04 — no in-page resubscribe path for a specific canceled product (global header nav still has "Subscribe", so not a total dead end) |
| `api/billing/account.js` | 120 | Card fallback (`liveSubs[0]?.default_payment_method`) picks an arbitrary subscription's payment method when no customer-level default exists, applied uniformly to every held product | ⚠️ Warning | WR-05 — could show the wrong card on one panel for a multi-product customer with differing payment methods per subscription |
| `src/lib/useAccount.js` | 23 | Docstring says `renews` can be `''`; server only ever emits `null` | ℹ️ Info | IN-01 (review numbering) — harmless today (`sub.renews || '—'` treats both identically), but documentation drift |

### Human Verification Required

See `human_verification` in the frontmatter above — 4 items, all direct live-environment confirmations of the 3 confirmed CRITICAL code defects plus one UX judgment call (WR-04, non-blocking).

### Gaps Summary

Phase 5's server-side contract (`lib/products.js`, `api/billing/account.js`, `api/billing/portal.js`) is solid: correct DB-first/Stripe-enrichment composition, correct CSRF/IDOR ordering on the portal, correct presentation-safe payload with zero raw Stripe identifiers, correct no-store discipline. The client rebuild (`useAccount.js`, `Account.jsx`) correctly consumes the new endpoints, replaces every mock, and gets the ACCT-04 payment-failed notice and the WR-01 dead-end-CTA fix exactly right.

However, three independently-confirmed defects — all flagged by `05-REVIEW.md` and re-derived here directly from the source rather than taken on faith — mean the phase's own headline promises are not fully met:

1. **CR-01** breaks the fail-closed guarantee that both `05-01-PLAN.md` and `05-02-PLAN.md` state as an explicit must-have in their own words ("never a fabricated 'no subscription'"). The defect lives in the shared `src/lib/useSafeFetch.js` primitive (not a file phase 5 modified) but is the direct cause of `useAccount.js`'s documented contract being false, and the same defect silently affects Phase 4's `useEntitlements`/`useGatedContent`.
2. **CR-02** means ACCT-03 ("real invoice history") is factually wrong for any customer holding 2+ products — every invoice is shown once per held product.
3. **CR-03** means the phase's own D-14 decision (locked in `05-CONTEXT.md`/`05-RESEARCH.md`, restated as an explicit must-have truth in `05-01-PLAN.md`) is unimplemented client-side — a cancelled-but-still-active subscriber gets zero indication their cancellation took effect, which also weakens confidence in ACCT-02 ("user can cancel a subscription") since the cancellation is invisible after the fact.

None of these are cosmetic; each has a concrete "customer gets wrong billing information" or "paying customer wrongly told they have no subscription" consequence, which directly touches the project's Core Value statement (real, accurate, server-verified access/billing state).

**Recommended next step:** a small closure plan targeting exactly these three fixes (the reviewer's suggested patches are concrete and minimal — a status check in `useSafeFetch.js`, a single-key invoice read instead of a flatten, and wiring `cancelAtPeriodEnd` into the renewal label) before this phase can be marked complete.

---

_Verified: 2026-09-10T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
