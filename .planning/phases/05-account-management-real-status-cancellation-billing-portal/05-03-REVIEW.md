---
phase: 05-account-management-real-status-cancellation-billing-portal
reviewed: 2026-09-10T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - api/billing/account.js
  - src/lib/useSafeFetch.js
  - src/routes/Account.jsx
findings:
  critical: 1
  warning: 1
  info: 1
  total: 3
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-09-10
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

This is a gap-closure review for three previously-confirmed defects (05-VERIFICATION.md CR-01/CR-02/CR-03). Two of the three fixes are correctly and cleanly implemented:

- **CR-03** (`src/routes/Account.jsx`): `cancelAtPeriodEnd` now correctly drives the "Access until" vs "Renews" label (`sub.status === 'canceled' || sub.cancelAtPeriodEnd`), and the Manage CTA is deliberately still rendered for an active-but-scheduled-to-cancel subscription, matching the stated intent exactly. Correct.
- **CR-02** (`src/routes/Account.jsx`): the invoice table now reads `subs[heldKeys[0]].invoices.items` — a single held product key — instead of flattening/combining across all held products. This is correct given the server assigns the identical shared invoice list to every held key (confirmed in `api/billing/account.js` Section C, lines 151-164, which loops `Object.keys(subscriptions)` and assigns the same `items` array reference to each).
- **CR-01** (`src/lib/useSafeFetch.js` + `api/billing/account.js`): `useSafeFetch` now throws before parsing the body for any non-2xx, non-401 response (`if (!r.ok && r.status !== 401) throw ...`, line 61), and `api/billing/account.js`'s DB-failure catch branch now returns a distinct `{ error: 'unavailable' }` / 500 instead of reusing the 401 shape. Cross-checked against `api/billing/status.js`, `api/content/editions/[no].js`, `src/lib/useEntitlements.js`, and `src/lib/useGatedContent.js` (all confirmed untouched by this diff via `git diff e4a8bda..HEAD`) — none of these regress under the new fail-closed logic: `status.js` still only ever returns 200 or 401 (its own DB-failure branch deliberately returns 401, unchanged, pre-existing design), and `editions/[no].js`'s 404/500 branches already resolved to `kind: 'unknown'` in `useGatedContent.js` both before and after this change (its `data.entitled === false` check was never true for those bodies), so there is no behavior change for that consumer. No regression found.

However, review of the full `api/billing/account.js` file (required to verify CR-01's DB-failure catch branch) surfaced a pre-existing, un-related **Critical** defect that breaks the endpoint entirely for every authenticated request, which in turn means CR-02's and CR-03's otherwise-correct fixes in `Account.jsx` are currently unreachable in production — the account page will always render the whole-page `accountError` fallback ("Couldn't confirm your account — reload to try again."), never the corrected panels. This bug pre-dates the current diff (confirmed via `git diff e4a8bda..HEAD -- api/billing/account.js` — the affected lines are unchanged), but since the file was in scope for this review and directly gates whether CR-02/CR-03 can be observed working at all, it is reported below.

## Critical Issues

### CR-01: `api/billing/account.js` throws an uncaught `TypeError` on every authenticated request — the endpoint never returns real account data

**File:** `api/billing/account.js:57` (assignment), `:72` (crash site), `:90` (also affected)
**Issue:** `sql` (from `lib/db.js`, `@vercel/postgres`) is a tagged template that resolves to a `QueryResult`-shaped object (`{ rows, rowCount, fields, command, ... }`), not an array — every other call site in this codebase destructures it correctly: `const { rows } = await sql\`...\`` (see `api/billing/status.js:32`, `api/content/editions/[no].js:72`, `api/billing/checkout.js:94/108`, `api/billing/portal.js:103`, `api/auth/session.js:30`, `api/auth/google/callback.js:118`, `lib/session-user.js:26`).

`api/billing/account.js` is the sole outlier:
```js
let rows
try {
  rows = await sql`
    SELECT stripe_product_id, status, current_period_end, ...
    FROM subscriptions WHERE user_id = ${session.user.id}
  `
} catch (err) { ... }
```
`rows` here is bound to the entire result object, not `result.rows`. Two consequences:

1. `for (const row of rows) { ... }` (line 72, Step 3) — a plain object without `Symbol.iterator` is not iterable, so this throws `TypeError: rows is not iterable` for **every** signed-in request, regardless of whether the user has zero or many subscription rows (an empty case would still be a non-iterable object).
2. This `for` loop lives *outside* the Step 2 `try/catch` (which only wraps the `await sql\`...\`` call itself), so the exception is completely unhandled inside the `fetch` handler — it never reaches the new, correctly-implemented `{ error: 'unavailable' }` / 500 branch this same diff just added. The runtime will produce whatever generic/undocumented error response Vercel's Web Handler wrapper emits for an unhandled promise rejection, not the endpoint's documented contract, and without the `Cache-Control: no-store` header the rest of the file is careful to set on every other branch.
3. `const customerId = rows[0]?.stripe_customer_id` (line 90) is independently wrong for the same reason — `rows[0]` on the QueryResult object is `undefined`, so even if Step 3 were fixed in isolation, live Stripe enrichment (Sections A/B/C) would never run because `customerId` would always be `undefined`.

Net effect: `GET /api/billing/account` cannot currently return a successful response containing real subscription data for **any** caller. On the client, `useSafeFetch`'s new fail-closed logic (correctly, per CR-01's own intent) will treat whatever non-2xx status this produces as `error: true`, so `src/routes/Account.jsx` will always render the whole-page `accountError` branch ("Couldn't confirm your account — reload to try again.") and never reach the CR-02/CR-03 code paths this same gap-closure task was meant to verify. This is not a hypothetical edge case — it fires on the very first successful sign-in with zero rows as well as with data.

**Fix:**
```js
let rows
try {
  const result = await sql`
    SELECT stripe_product_id, status, current_period_end,
           stripe_customer_id, stripe_price_id, stripe_subscription_id
    FROM subscriptions WHERE user_id = ${session.user.id}
  `
  rows = result.rows
} catch (err) {
  console.error('account: failed to load subscriptions', err)
  return Response.json({ error: 'unavailable' }, { status: 500, headers: noStore })
}
```
(or simply `const { rows } = await sql\`...\`` inside the `try`, matching every other call site in the codebase). Also consider wrapping Step 3/4's base-map construction in the same `try`, or a second guarded block, so a future regression here fails into the documented 500 shape rather than an unhandled exception outside any handler.

## Warnings

### WR-01: New 500 branch and Step 3's base-map construction are not both covered by defense-in-depth error handling

**File:** `api/billing/account.js:55-65`, `:70-84`
**Issue:** The CR-01 fix correctly isolates the DB *read* (`await sql\`...\``) inside a `try/catch` that returns the intended distinct 500. But the immediately-following base-map construction (Step 3, lines 70-84) and `customerId` derivation (Step 4, line 90) run unguarded. As demonstrated by the Critical finding above, any exception thrown while shaping `rows` into `subscriptions` (a `TypeError`, a malformed row, a future schema change, etc.) escapes uncaught and bypasses the very 500-shape contract this diff was written to establish, undermining the "the endpoint never 502s and never lets a Stripe error cross the wire" guarantee the file's own header comment claims (lines 8-12) — that guarantee currently only holds for Sections A/B/C, not for the base-map step itself.
**Fix:** Once the Critical fix above lands, extend the try/catch (or add a second one) to cover Steps 3-4 as well, so any future defect in row-shaping still degrades to the documented `{ error: 'unavailable' }` / 500 response instead of an unhandled exception.

## Info

### IN-01: `src/lib/useAccount.js` docstring is stale relative to the new `useSafeFetch` 401 contract

**File:** `src/lib/useAccount.js:30-34` (not in this diff's file list, but directly downstream of the reviewed `useSafeFetch.js` change)
**Issue:** The hook's docstring states `401 { subscriptions: {} }` is folded into "Fail-closed... any 401, network, or parse failure sets `error: true`". Under the CR-01 fix, a 401 is explicitly exempted from the fail-closed throw in `useSafeFetch.js` (line 61: `r.status !== 401`) and resolves as ordinary `data`, not `error: true`. In practice this has no user-visible effect for `Account.jsx` today (it redirects to sign-in on `!user` before the account payload is ever read), but the comment now describes behavior that doesn't match the shared primitive it wraps and could mislead a future maintainer relying on `error` to detect "signed out" from this hook.
**Fix:** Update the comment to say a 401 resolves as `data: { subscriptions: {} }` with `error: false` (matching `useSafeFetch`'s documented 401 exemption), and that sign-out detection for `/account` is handled entirely by `useSession()`, not by this hook's `error` flag.

---

_Reviewed: 2026-09-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
