---
phase: 05-account-management-real-status-cancellation-billing-portal
reviewed: 2026-09-10T18:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - api/billing/account.js
  - api/billing/portal.js
  - lib/products.js
  - src/lib/useAccount.js
  - src/routes/Account.jsx
findings:
  critical: 3
  warning: 5
  info: 1
  total: 9
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-09-10T18:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the Account rebuild (GET `/api/billing/account`, POST `/api/billing/portal`, `lib/products.js`, `useAccount.js`, `Account.jsx`) against the phase's own stated goals: own-customer scoping on the portal endpoint, fail-closed behavior on Stripe enrichment failure, no raw Stripe IDs on the wire, and avoidance of the Phase 3 WR-01 dead-end-CTA bug.

The portal endpoint's ordering (method guard → CSRF → session → action enum → own-customer-scoped DB lookup → fixed `PUBLIC_ORIGIN` return_url) is sound, and no Stripe/customer/subscription/price ID ever crosses the wire in either endpoint's success payload. However, three cross-file defects undermine the headline guarantees this phase set out to deliver:

1. The client-side "fail-closed on error" contract that `useAccount.js`'s own docstring promises is not actually enforced, because the shared `useSafeFetch` primitive it depends on never inspects the HTTP status code — only network-level failures trip `error: true`. A DB outage in `account.js` (which intentionally responds `401 { subscriptions: {} }` to "fail closed") is therefore read by the client as a *successful* "you have zero subscriptions" response, and the Account page renders the "Subscribe" upsell to what may be an existing paying customer. This is precisely the class of bug the fail-closed design in `account.js`'s comments (D-04) claims to prevent.
2. `account.js` intentionally shares one invoice list across every held product key (by design, per its own comments), but `Account.jsx` flattens `Object.values(subs)` without deduping, so a customer holding 2+ products sees every invoice duplicated once per held product (and duplicate React list keys).
3. `account.js` does real Stripe work to compute `cancelAtPeriodEnd` per subscription, but `Account.jsx` never reads that field — a subscriber who has scheduled cancellation (Stripe status still `active` through the paid period) is shown "Active" / "Renews: <date>" with no indication the subscription will not renew.

## Critical Issues

### CR-01: Client never detects account-fetch failures — DB/session errors render as "no subscription"

**File:** `src/lib/useAccount.js:44-55` (root cause in `src/lib/useSafeFetch.js:44-57`, a direct dependency of this file)
**Issue:** `useAccount.js`'s docstring asserts: "Fail-closed (D-04 client mirror): any 401, network, or parse failure sets `error: true`... it must never fabricate a 'no subscription' state from a failed request." The primitive it calls, `useSafeFetch`, does not implement that: it only sets `error: true` on a rejected `fetch()` promise (network failure) or on `r.json()` throwing (malformed body). It never checks `r.ok`/`r.status`.

`api/billing/account.js` deliberately returns `401 Response.json({ subscriptions: {} }, ...)` on **both** "not signed in" (Step 1) **and** a DB query failure (Step 2's `catch`, `account.js:60-62`) — a well-formed JSON body with a 2xx-shaped payload. Because `useSafeFetch` never looks at the status code, `r.json()` succeeds, `setData({ subscriptions: {} })` runs, and `error` stays `false`.

Concretely: if the session-store/DB has a transient outage while a signed-in paying subscriber loads `/account`, they will see the "You don't have an active subscription yet. Subscribe" upsell (`Account.jsx:122-133`) instead of the intended "Couldn't confirm your account — reload to try again" fail-closed message (`Account.jsx:114-119`, which is effectively dead code for this failure mode). This actively risks prompting an existing subscriber to pay again, and directly contradicts the phase's own D-04 guarantee.
**Fix:**
```js
// src/lib/useSafeFetch.js — check response status before treating the body as data
fetch(url, { signal: ctrl.signal, credentials: 'same-origin' })
  .then((r) => {
    if (!r.ok) throw new Error(`http ${r.status}`)
    return r.json()
  })
  .then((body) => {
    if (id !== idRef.current) return
    setData(body)
    setError(false)
    setLoading(false)
  })
  .catch((err) => {
    if (err.name === 'AbortError' || id !== idRef.current) return
    setData(null)
    setError(true)
    setLoading(false)
  })
```
Note this primitive is also consumed by `useGatedContent`/`useEntitlements` — fixing it here removes the same latent fail-closed gap from those call sites too.

### CR-02: Billing history duplicates every invoice once per held product

**File:** `src/routes/Account.jsx:95-99` (root cause pairs with `api/billing/account.js:145-161`)
**Issue:** `account.js` Section C fetches **one** shared invoice list for the customer and assigns the *same array reference* to `subscriptions[key].invoices.items` for every held product key (`account.js:156-158`, by design per its own comment: "one shared list for ALL held products"). `Account.jsx` then builds the unified table with:
```js
const invoiceItems = Object.values(subs)
  .map((s) => (s.invoices && s.invoices.items) || [])
  .flat()
  .sort((a, b) => b.created - a.created)
  .slice(0, 12)
```
For a customer holding N held products, this flattens N copies of the identical invoice list together, so every invoice appears N times in "Billing history" (and produces duplicate `key={number}` values in the `.map()` at `Account.jsx:247-267`, a React key-uniqueness violation). With 2 held products the effective 12-row cap also now holds at most 6 distinct invoices instead of 12. A subscriber seeing the same receipt listed twice is a real billing-trust issue, not just a cosmetic one.
**Fix:** Since the list is intentionally shared per customer, take it from a single key rather than flattening across all held keys:
```js
const invoiceItems = (subs[heldKeys[0]]?.invoices?.items || [])
  .slice()
  .sort((a, b) => b.created - a.created)
  .slice(0, 12)
```
(and keep `invoicesUnavailable` derived from `heldKeys.some(...)` as-is, since availability can legitimately differ from the items question).

### CR-03: `cancelAtPeriodEnd` is computed server-side but never surfaced — active-but-canceling subscriptions look like normal renewals

**File:** `src/routes/Account.jsx` (field never read; computed in `api/billing/account.js:88-107`, documented in `src/lib/useAccount.js:24`)
**Issue:** `account.js` does a live `stripe.subscriptions.list` call specifically to compute `cancelAtPeriodEnd` per held product (Section A, D-14) and ships it on the wire (confirmed via the wire-contract docstring in `useAccount.js:24`). `Account.jsx` never reads `sub.cancelAtPeriodEnd` anywhere — `grep` for the field across `src/` turns up only the docstring reference, no consumer. A subscriber who has already cancelled via the portal but is still inside their paid period has Stripe status `active` and `cancel_at_period_end: true`; on this Account page they see `Status: Active`, `Renews: <date>`, and a `Manage` button — nothing communicates that the subscription will *not* renew on that date. This misinforms exactly the customer segment (recently-cancelled-but-still-active) that most needs accurate billing information, and wastes the Section A Stripe round-trip that computes a value nobody displays.
**Fix:** Wire the field into the renewal row and (optionally) the CTA row, e.g.:
```jsx
const renewsKey = sub.status === 'canceled' || sub.cancelAtPeriodEnd ? 'Access until' : 'Renews'
...
{sub.cancelAtPeriodEnd && sub.status !== 'canceled' && (
  <p className="fine" style={{ marginTop: 8 }}>
    Your subscription won't renew and will end on {sub.renews || 'the current period end'}.
  </p>
)}
```

## Warnings

### WR-01: `account.js` DB failures return the same 401 shape as "not authenticated," and no failure path is logged

**File:** `api/billing/account.js:53-62` (DB catch), `:105-107`, `:141-143`, `:159-161` (Stripe section catches)
**Issue:** Step 2's `catch` on the DB query returns `401 { subscriptions: {} }` — the identical status/body used for "no session" in Step 1. This conflates an infrastructure failure with an authentication failure, which (combined with CR-01) means a DB outage is indistinguishable, both to the client and in any status-code-based monitoring, from a routine unauthenticated request. Additionally, none of the four `catch` blocks in this file (`Step 2`, Sections A/B/C) log anything — contrast with `api/billing/portal.js:124` which does `console.error('portal: failed...', error)`. A sustained Stripe or DB outage on this endpoint would be completely invisible in server logs.
**Fix:** Return a distinct status (e.g. `500`) for the DB-catch branch, and add `console.error` (or the project's chosen server-side logging call) in each catch so failures are observable:
```js
} catch (err) {
  console.error('account: failed to load subscriptions', err)
  return Response.json({ subscriptions: {} }, { status: 500, headers: noStore })
}
```

### WR-02: Own-customer lookup relies on `LIMIT 1` with no `ORDER BY` in both endpoints

**File:** `api/billing/account.js:87` (`rows[0]?.stripe_customer_id`), `api/billing/portal.js:103-107`
**Issue:** Both endpoints assume exactly one `stripe_customer_id` per user ("D-07 single customer") and pick it via `rows[0]` / `LIMIT 1` with no `ORDER BY`. Postgres does not guarantee row order without an `ORDER BY` clause, so if that invariant is ever violated elsewhere (e.g., a bug that lets one user end up with two Stripe customer IDs across rows), which row is picked becomes nondeterministic — for `portal.js` this could send a user's card-update flow to a different customer object than the one their currently-displayed subscription belongs to.
**Fix:** Add a deterministic `ORDER BY` (e.g. `ORDER BY created_at DESC` or similar) to both queries, and consider asserting the single-customer invariant explicitly (e.g., logging a warning if `rows` contains more than one distinct `stripe_customer_id`).

### WR-03: `account.js` has no HTTP method guard, unlike its sibling `portal.js`

**File:** `api/billing/account.js:40`
**Issue:** The file's own header comment calls this "GET /api/billing/account", and `portal.js` explicitly guards `request.method !== 'POST'` (`portal.js:69-71`) before doing any work. `account.js`'s `fetch(request)` handler performs no method check at all — a `POST`/`DELETE`/`PUT` to this URL runs the identical read logic. Low exploitability since it's a read-only, self-scoped endpoint, but it's an inconsistency with the codebase's own established defensive pattern in the sibling file, and means the endpoint doesn't actually enforce being GET-only.
**Fix:**
```js
if (request.method !== 'GET') {
  return Response.json({ subscriptions: {} }, { status: 405, headers: noStore })
}
```

### WR-04: Canceled-subscription panels render no CTA at all on the Account page

**File:** `src/routes/Account.jsx:185-195`
**Issue:** The CTA row is gated on `sub.status !== 'canceled'`, so a canceled product panel shows Status/Plan/"Access until"/Card and then nothing actionable. `heldKeys` includes canceled rows indefinitely (as long as the DB row exists), so once a user has ever subscribed and cancelled a given product, `heldKeys.length === 0` is permanently false for that product and the page's own zero-held "Subscribe" upsell block (`Account.jsx:122-133`) never renders again for it. The global header nav retains a persistent "Subscribe" link (`src/components/Header.jsx:239-241`), so this is not a total site-wide dead end like the original WR-01 finding, but within the Account page itself there is no path back to resubscribing — which the phase's own commentary (`Account.jsx:184`: "never a dead-end upsell CTA (WR-01)") suggests was meant to be covered here.
**Fix:** Render a lightweight resubscribe link on the canceled panel itself, e.g.:
```jsx
{sub.status === 'canceled' && (
  <div style={{ marginTop: 24 }}>
    <Link to="/subscribe" className="btn btn--sm btn--accent">Resubscribe</Link>
  </div>
)}
```

### WR-05: Card fallback picks an arbitrary subscription's default payment method when no customer-level default exists

**File:** `api/billing/account.js:113-128`
**Issue:** When `customer.invoice_settings.default_payment_method` is unset, Section B falls back to `liveSubs[0]?.default_payment_method`. `liveSubs` is the full `stripe.subscriptions.list({ status: 'all' })` result (`account.js:95`), so `liveSubs[0]` is simply whichever subscription Stripe returns first (most-recently-created, and can include a canceled/incomplete subscription ahead of an active one for a different product) — not necessarily related to the product panel(s) being rendered. The resolved card is then applied uniformly to *every* held product's panel (`account.js:137-139`), so a customer holding two products with different payment methods per subscription could see the wrong card on one of the panels.
**Fix:** If a per-subscription default is needed as a fallback, prefer the *held* subscription actually being rendered for that key rather than an arbitrary first entry in the unfiltered list, or drop the subscription-level fallback and rely solely on the customer-level default plus the "first listed payment method" fallback that already exists.

## Info

### IN-01: `useAccount.js` docstring says `renews` can be `''`, but the server never emits that

**File:** `src/lib/useAccount.js:23`, `api/billing/account.js:32-37`
**Issue:** The wire-contract comment states `renews` is a `'D MMM YYYY' string, or ''`. `formatRenews()` in `account.js` returns `null` (never `''`) when the value is unresolvable. Functionally harmless today because `Account.jsx:175` uses `sub.renews || '—'`, which treats `null` and `''` identically, but the doc drift could mislead a future maintainer relying on the documented contract.
**Fix:** Update the docstring to say `'D MMM YYYY' string, or null`.

---

_Reviewed: 2026-09-10T18:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
