---
phase: 03-billing-webhooks-stripe-checkout-and-subscription-sync
reviewed: 2026-09-09T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - api/billing/checkout.js
  - api/billing/prices.js
  - api/billing/status.js
  - api/billing/webhook.js
  - lib/db.js
  - lib/products.js
  - lib/stripe.js
  - migrations/0004_billing_stripe_price_id.sql
  - package.json
  - src/App.jsx
  - src/data/products.js
  - src/data/seo.js
  - src/lib/useEntitlements.js
  - src/routes/Subscribe.jsx
  - src/routes/SubscribeSuccess.jsx
  - src/styles/eclat.css
findings:
  critical: 0
  warning: 10
  info: 4
  total: 14
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-09-09
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

This phase adds real Stripe billing (Checkout, webhook sync, entitlement status) on top of the Phase 2 auth foundation. The core security posture is solid: every dollar-relevant decision is re-verified server-side (`api/billing/checkout.js` re-checks existing subscriptions before creating a session; `api/billing/status.js`/`api/billing/webhook.js` never trust client input for product/price resolution; all Stripe product/price IDs are resolved through the server-only `lib/products.js` allowlist; the webhook verifies the raw-body signature before any parsing; DB access is fully parameterized with no injection vectors found). No secrets, Stripe keys, or webhook signing secrets are referenced from any `src/` file, and no hardcoded credentials were found.

No Critical/Blocker-tier issues were found — nothing here lets an unauthenticated or unpaid visitor reach gated content, forge a webhook event, or bypass the product/price allowlist. However, several Warning-tier gaps would benefit from a fix pass before this ships: a UI/business-logic mismatch that dead-ends `past_due` subscribers, no idempotency key on Checkout Session creation (double-click/retry could double-bill), a webhook event-ordering gap that can let a stale event overwrite a newer subscription status, an unpinned Stripe API version despite the code's explicit Basil-era assumptions, a state-changing GET endpoint with no CSRF mitigation, and a couple of consistency gaps against this codebase's own established fail-fast/no-store conventions.

## Warnings

### WR-01: `past_due` subscribers get a dead-end "Subscribe" CTA instead of "Manage"

**File:** `src/routes/Subscribe.jsx:21-22`
**Issue:** `owned` (which decides whether a tile shows "Subscribed" + a `Manage` link, vs. "Subscribe") only treats `active`/`trialing` as owned:
```js
const owned = !!record && (record.status === 'active' || record.status === 'trialing')
```
But `api/billing/checkout.js:70` treats `active`, `trialing`, **and `past_due`** as "already subscribed" and silently redirects a `past_due` user's checkout attempt straight back to `/subscribe` with no explanation (`redirectTo('/subscribe', request)`, line 73). The result: a `past_due` subscriber sees a plain "Subscribe" button (not "Manage"), clicks it, and lands back on the exact same page with no error, no explanation, and no way to fix their payment method from this tile.
**Fix:** Include `past_due` in the tile's `owned`/"Manage" condition so past_due subscribers get routed to `/account` to fix billing, consistent with the server-side entitlement check:
```js
const owned = !!record && ['active', 'trialing', 'past_due'].includes(record.status)
```

### WR-02: No idempotency key on Stripe Checkout Session creation

**File:** `api/billing/checkout.js:90-98`
**Issue:** `stripe.checkout.sessions.create({...})` is called with no `idempotencyKey`. A double-click, a slow-network retry, or a browser back-button-and-resubmit against this GET-triggered redirect can create two distinct Checkout Sessions for the same user/product. If both are completed (e.g., user opens the link twice in two tabs), the user ends up with two active Stripe subscriptions for the same product and is billed twice — the D-04 "existing subscription" re-check at lines 67-74 only catches this if the *first* session's webhook has already landed and been processed by the time the second request runs; it does not close the window between two concurrent requests.
**Fix:** Pass a request-scoped idempotency key to `stripe.checkout.sessions.create`, e.g. derived from `user.id` + `product.productId` + `interval`, via the second argument:
```js
const session = await stripe.checkout.sessions.create(
  { mode: 'subscription', /* ... */ },
  { idempotencyKey: `checkout:${user.id}:${key}:${interval}` },
)
```

### WR-03: Webhook subscription upserts have no event-ordering guard

**File:** `api/billing/webhook.js:71-106`
**Issue:** `upsertSubscription` unconditionally overwrites `status`/`current_period_end`/etc. with whatever the current event's payload says, keyed only by the `webhook_events` primary key for *duplicate* protection — there is no check that the incoming event is newer than what's already stored (e.g. comparing against `sub.items.data[0]` timestamps, or Stripe's own event `created` field vs. a stored "last event processed" watermark). Stripe explicitly does not guarantee webhook delivery order, and retries can reorder delivery further. A `customer.subscription.updated` (status: `active`) event that is delayed and processed *after* a later `customer.subscription.deleted` (status: `canceled`) event for the same subscription would silently resurrect a canceled subscriber's access, or vice versa incorrectly revoke a still-active one.
**Fix:** Store the source event's identifying timestamp (e.g. `event.created`, or fetch the subscription fresh via `stripe.subscriptions.retrieve` inside `upsertSubscription` rather than trusting `event.data.object` verbatim) and skip the upsert if the stored row is already at least as recent, e.g. `... WHERE stripe_subscription_id = $1 AND (last_event_created IS NULL OR last_event_created <= $N)` guarding the `UPDATE` branch of the upsert.

### WR-04: `lib/stripe.js` does not pin an explicit Stripe API version

**File:** `lib/stripe.js:19`
**Issue:** `export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)` — no `apiVersion` option. `api/billing/webhook.js`'s own comments (lines 82-84, 171-175) explicitly document that the code's behavior depends on "Basil"-era response shapes (`current_period_end` moved onto `items.data[0]`, `invoice.parent.subscription_details.subscription` vs. the pre-Basil `invoice.subscription`). Without pinning `apiVersion` in the client, the effective API version is whatever is configured as the account's default in the Stripe Dashboard — which can be changed independently of this code and is not visible in the repo. If it drifts from what the webhook handler assumes, the Basil-shape parsing silently breaks (e.g. `item?.current_period_end` becomes `undefined`, `current_period_end` gets stored as `null` for every subscription).
**Fix:** Pin the version the code is actually written against:
```js
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-XX-XX' })
```

### WR-05: `STRIPE_WEBHOOK_SECRET` is not fail-fast validated at module load

**File:** `api/billing/webhook.js:121`
**Issue:** Unlike `lib/stripe.js` (`STRIPE_SECRET_KEY`) and `lib/db.js` (`POSTGRES_URL`), which both throw immediately at import time if their required secret is missing (an established, documented convention in this codebase — see both files' header comments), `process.env.STRIPE_WEBHOOK_SECRET` is read inline inside `stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)` with no upfront check. If the env var is unset in a deployment, every webhook request fails signature verification with a generic `Invalid signature` 400 — happening to fail closed by accident, but making a misconfiguration look identical to a genuine forged-signature attack in logs, instead of failing loudly and obviously at deploy/cold-start time like the codebase's other two secrets do.
**Fix:** Add the same fail-fast guard used by `lib/stripe.js`/`lib/db.js`, e.g. at the top of this module:
```js
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not set. Configure the webhook endpoint in Stripe and pull the signing secret.')
}
```

### WR-06: State-changing GET endpoint with no CSRF mitigation

**File:** `api/billing/checkout.js:34-108`
**Issue:** `GET /api/billing/checkout` is a simple top-level navigation (`<a href>` in `Subscribe.jsx:75`) that creates a real Stripe Checkout Session tied to whichever user's session cookie is attached, and 302-redirects the browser to Stripe. Since the session cookie is `sameSite: 'lax'` (per `lib/session.js`), it is sent on cross-site top-level GET navigations. A third-party page can trigger this endpoint against a signed-in victim (e.g. `<img>`/`<iframe>`/auto-navigating link) to force their browser to a Stripe Checkout page for a product of the attacker's choosing, without the victim's consent — not directly exploitable for fraud (the attacker still can't complete payment without the victim's card), but it is an unwanted state change (a fresh Checkout Session created against the victim's account) and a plausible phishing/annoyance vector using a trusted-looking `stripe.com` redirect the victim didn't initiate.
**Fix:** Consider requiring a same-origin `Referer`/`Sec-Fetch-Site` check, or moving checkout initiation behind a same-origin `POST` (fetch) call rather than a plain `<a href>` GET, consistent with the "no client-trusted, no unintended state change" bar this phase otherwise holds itself to.

### WR-07: Checkout success/cancel URLs are built from the request's own Host-derived origin

**File:** `api/billing/checkout.js:85-87`
**Issue:**
```js
const origin = new URL(request.url).origin
const successUrl = `${origin}/subscribe/success?product=${key}`
const cancelUrl = `${origin}/subscribe`
```
`request.url`'s origin is derived from whatever `Host` header the incoming request carried. If this deployment is reachable under more than one hostname (Vercel preview deployments, a misconfigured custom-domain rule, or any Host-header trust gap upstream), this lets the resulting Stripe Checkout Session's `success_url`/`cancel_url` be pointed at an origin the caller controls. Stripe does not restrict `success_url`/`cancel_url` to a fixed domain, so a crafted request could get a real paying customer redirected post-payment to an off-origin URL.
**Fix:** Build these from a fixed, server-controlled canonical origin (e.g. `SITE.url` from `src/data/seo-site.js`, or a `PUBLIC_ORIGIN` env var) instead of the incoming request's `Host`-derived origin.

### WR-08: `GET /api/billing/prices` fails all 4 products if any single Stripe price lookup fails

**File:** `api/billing/prices.js:24-49`
**Issue:** The loop over `PRODUCTS` calls `stripe.prices.retrieve` twice per product inside a single outer `try`; if any one of the 8 calls throws (e.g. one price ID becomes archived/inactive in the Stripe Dashboard, or a transient Stripe API blip hits just one call), the `catch` discards every already-successfully-fetched product and returns `{ products: {} }` with a 500 — so a single stale price ID anywhere in the 4-product catalog blanks out pricing for the entire `/subscribe` page, not just the affected product.
**Fix:** Fetch/catch per-product so one failure degrades gracefully (omit that product, or fall back to a cached/last-known price) rather than zeroing the whole response.

### WR-09: `/subscribe/success` polling never stops once a terminal state is reached

**File:** `src/routes/SubscribeSuccess.jsx:35-60`
**Issue:** The polling `useEffect` depends only on `[productKey]`; `setInterval(checkStatus, POLL_INTERVAL_MS)` keeps firing every 2s indefinitely for as long as the route stays mounted, including after `state` has already flipped to `'success'`. The header comment explains why polling should continue *through* the `'timeout'` state ("a late webhook still flips the view"), but there's no equivalent rationale for continuing to poll after the subscription is already confirmed — every poll after that point is a wasted request with no possible effect on the UI.
**Fix:** Clear the interval once `state === 'success'` (e.g. read `state` via a ref inside `checkStatus`, or add an early-return/clearInterval call once success is reached), leaving the "never stop while unconfirmed" behavior intact for the `confirming`/`timeout` states only.

### WR-10: No automated guard against `src/` importing the server-only `lib/*` billing modules

**File:** `lib/db.js`, `lib/stripe.js`, `lib/products.js`
**Issue:** All three files rely entirely on a comment ("SERVER-ONLY — this file must never be imported from anything under src/") for enforcement. No `src/` file in this phase actually violates it, but as CLAUDE.md itself flags, there is no ESLint/import-restriction rule in this repo to catch a future accidental import of `lib/stripe.js` (which would pull `STRIPE_SECRET_KEY` into the client bundle) or `lib/products.js`/`lib/db.js` into a `src/` route. Given this phase's explicit mandate is "no secret leakage into client-bundled code," relying solely on a doc comment is a gap.
**Fix:** Add a lightweight guard — e.g. a `postbuild`/`prebuild` grep step (matching the existing `scripts/check-secrets.js` pattern already in `package.json`'s `build` script) that fails the build if any file under `dist/` client assets contains `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`POSTGRES_URL` substrings, or a minimal ESLint `no-restricted-imports` rule scoped to `src/**`.

## Info

### IN-01: `GET /api/billing/status` has no explicit `Cache-Control: no-store`

**File:** `api/billing/status.js:54`
**Issue:** This endpoint returns per-user, session-scoped subscription state (`Response.json({ subscriptions })`) but sets no `Cache-Control` header. There is currently no blanket cache policy for `/api/*` in `vercel.json` (only `/assets/*` and global security headers are configured), so this relies entirely on Vercel Functions' default (uncached) behavior rather than an explicit, defensive header — the same posture `api/auth/session.js` (Phase 2) already has, for the same reason (per-user data must never be shared-cached).
**Fix:** Add `headers.set('Cache-Control', 'no-store')` on both the success and error responses, matching the sensitivity of the data returned.

### IN-02: Dead CSS rule left behind by this phase's `Subscribe.jsx` refactor

**File:** `src/styles/eclat.css:1353`
**Issue:** `.plan[aria-pressed='true'] { ... }` targeted the old `Subscribe.jsx` implementation where `.plan` was a `<button aria-pressed={...}>`. This phase's rewrite (`src/routes/Subscribe.jsx`) changes `.plan` to a plain `<div>` wrapper around nested interactive elements and never sets `aria-pressed` anywhere; grep across `src/` confirms no element sets `aria-pressed` on `.plan` now. The rule is orphaned.
**Fix:** Remove the dead rule, or repurpose `preselected` (currently done via an inline `style={{ border: ... }}` in `Subscribe.jsx:34-37`) to use this class + `aria-pressed`/`data-` attribute instead of an inline style, restoring the rule's usefulness.

### IN-03: `useEntitlements().refetch()` is unsafe to call manually without capturing its cleanup

**File:** `src/lib/useEntitlements.js:21-41`
**Issue:** `refetch` returns a cleanup closure (`() => { cancelled = true }`) that is only wired up automatically for the initial mount call via `useEffect(() => refetch(), [refetch])`. If a future consumer calls the returned `refetch` function directly (e.g. a "Refresh" button), that call's own `cancelled` flag is never set to `true` on unmount, since the caller has no access to (and no obligation to store) the closure returned from that particular invocation. No current caller in this phase does this, but the hook's public shape invites it.
**Fix:** Document on the JSDoc that manually-invoked `refetch()` calls are fire-and-forget and not unmount-safe, or restructure so `loading`/`error`/`subs` updates check a `mountedRef` instead of a per-call closure flag.

### IN-04: Sign-in redirect from checkout drops the in-progress product/interval selection

**File:** `api/billing/checkout.js:46-48`
**Issue:** When a signed-out visitor clicks "Subscribe" on a tile, `redirectTo('/api/auth/google?return_to=/subscribe', request)` sends them to sign in and back to a bare `/subscribe` — losing the `product`/`interval` they had just chosen. `Subscribe.jsx`'s own preselect mechanism (`?product=` query param, lines 119-130) exists specifically to restore this kind of context, but it's not used here since the query string isn't propagated through the auth round-trip.
**Fix:** Propagate the chosen product (and optionally interval) through `return_to`, e.g. `return_to=/subscribe?product=${key}`, so the visitor lands back on the tile they were trying to subscribe to.

---

_Reviewed: 2026-09-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
