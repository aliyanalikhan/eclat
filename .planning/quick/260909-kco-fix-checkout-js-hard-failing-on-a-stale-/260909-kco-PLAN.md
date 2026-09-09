---
phase: quick-260909-kco
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - api/billing/checkout.js
autonomous: true
requirements: []

estimate:
  tokens: 15000
  raw_tokens: 15000
  tasks: 1
  confidence: low

must_haves:
  truths:
    - "A signed-in subscriber whose stored users.stripe_customer_id is a stale/invalid customer for the live-mode Stripe key can still complete Checkout Session creation instead of hitting checkout_error=1."
    - "Every other Stripe Checkout Session creation failure (any error that is not the specific stale-customer resource_missing case) still fails closed to /subscribe?checkout_error=1, unchanged from today."
    - "Both failure paths (retry failure and the generic catch) log the real Stripe error (type/code/message only — never raw request/response bodies or secrets) to server-side console.error, so a future failure is diagnosable from Vercel logs instead of silently swallowed."
  artifacts:
    - api/billing/checkout.js
  key_links:
    - "stripe.checkout.sessions.create() retry-without-customer call uses a distinct ':retry'-suffixed idempotency key — reusing the original key with different request params (no `customer` field) would make Stripe reject the retry as an idempotency-key/parameter mismatch instead of creating a session"
    - "Retry path omits `customer` entirely (not a re-lookup) so Stripe auto-creates a fresh Customer; api/billing/webhook.js's checkout.session.completed handler (lines ~171-177) already backfills users.stripe_customer_id from session.customer + client_reference_id on the next successful webhook delivery — no separate data migration needed"
---

<objective>
Fix `api/billing/checkout.js` hard-failing every checkout attempt for the signed-in test user because their stored `users.stripe_customer_id` (`cus_VBFNYvYF4DflCH`) is a test-mode customer ID that does not exist under the now-configured live-mode `STRIPE_SECRET_KEY`. Stripe's `stripe.checkout.sessions.create()` throws a `StripeInvalidRequestError` (`code: 'resource_missing'`, `param: 'customer'`) for this exact case, which the current bare `catch` swallows completely (no logging) before redirecting to `/subscribe?checkout_error=1`.

Purpose: Make checkout resilient to a stale/invalid stored customer reference (retry once without it, letting Stripe create a fresh Customer — the webhook already self-heals the DB value afterward) and make every remaining failure path loggable server-side, without changing the client-visible failure behavior for any other error type.

Output: Updated `api/billing/checkout.js` with (1) a narrow, single retry specifically for the stale-customer `resource_missing` case using a distinct idempotency key, and (2) `console.error` logging of the real Stripe error (type/code/message) in both the retry-failure and generic-failure catch paths, matching the logging convention already used in `api/billing/prices.js` and `api/billing/webhook.js`.
</objective>

<execution_context>
@get-shit-done/workflows/execute-plan.md
@get-shit-done/templates/summary.md
</execution_context>

<context>
@api/billing/checkout.js
@api/billing/webhook.js
@api/billing/prices.js
@.planning/STATE.md

Confirmed diagnosis (already investigated live against production Vercel + the live Stripe account, do not re-diagnose):
- `checkout.js`'s `stripe.checkout.sessions.create({ ..., customer: user.stripe_customer_id || undefined, ... }, { idempotencyKey })` throws because `user.stripe_customer_id` (`cus_VBFNYvYF4DflCH`) only exists in Stripe TEST mode, but the currently configured `STRIPE_SECRET_KEY` is LIVE mode. Stripe's exact error: `No such customer: 'cus_VBFNYvYF4DflCH'; a similar object exists in test mode, but a live mode key was used to make this request.` — `err.type === 'StripeInvalidRequestError'`, `err.code === 'resource_missing'`, `err.param === 'customer'`.
- The live secret key and the real price ID are both confirmed valid — this is specifically the stored `customer` reference being wrong for the current key's mode, not a bad key or bad price.
- `checkout.js`'s final `catch { return redirectTo('/subscribe?checkout_error=1', request) }` (current lines ~152-156) is a bare catch with zero logging — any Stripe error (this one or otherwise) is currently undiagnosable from server logs.
- `api/billing/webhook.js`'s `checkout.session.completed` handler (lines ~171-177) already unconditionally backfills/overwrites `users.stripe_customer_id` from `session.customer` + `session.client_reference_id` once a checkout actually completes — so once the retry below lets a session succeed, the stale DB value self-heals automatically. No migration/backfill task is in scope here.
- `subscriptions` and `webhook_events` tables are empty on this deployment; unrelated to this fix (webhook delivery was separately blocked by a missing `STRIPE_WEBHOOK_SECRET`, already resolved outside this task).

Codebase logging convention to match (do not invent a new format): `console.error(\`{route-prefix}: {context}: ${err.message}\`)` — see `api/billing/prices.js` line 45 (`prices: failed to fetch prices for ${key}: ${err.message}`) and `api/billing/webhook.js` lines 147/222. Never log raw request/response bodies, headers, or secrets — only the error's `type`/`code`/`message` fields, and only server-side (the client always still gets the same redirect, never the error detail).

Comment style to match: block comments above the changed logic explaining WHY (not what), referencing this codebase's `WR-NN` review-finding numbering already used throughout `checkout.js` (WR-02, WR-06, WR-07) and `.planning/phases/03-billing-webhooks-stripe-checkout-and-subscription-sync/03-REVIEW.md` (WR-01..WR-10) — this fix is `WR-11` in that same numbering, extending it optionally, not restarting a new scheme.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Retry Checkout Session creation without a stale customer ID, and log Stripe errors instead of swallowing them</name>
  <files>api/billing/checkout.js</files>
  <action>
Restructure the existing `try { const session = await stripe.checkout.sessions.create(...) ... } catch { return redirectTo('/subscribe?checkout_error=1', request) }` block (current lines ~129-156) as follows, changing `const session` to `let session` so it can be assigned from either attempt, and moving the existing `headers.set('Location', session.url); return new Response(...)` success-response code to run once, after the try/catch, only when `session` was actually assigned:

1. First attempt — unchanged from today: call `stripe.checkout.sessions.create` with the existing params object (`mode`, `line_items`, `customer: user.stripe_customer_id || undefined`, `client_reference_id`, `subscription_data`, `success_url`, `cancel_url`) and the existing idempotency key `checkout:${user.id}:${key}:${interval}`. Assign the result to `session`.

2. On catch of the first attempt, inspect the error to detect the specific stale-customer case: `err?.type === 'StripeInvalidRequestError' && err?.code === 'resource_missing' && err?.param === 'customer'` (only meaningful when `user.stripe_customer_id` was actually set — that's the only way `customer` could have been the failing param). Add a WR-11 comment above this check explaining why the retry is scoped this narrowly: a stale/invalid `stripe_customer_id` (e.g. a test-mode customer under a live-mode key) must not block checkout, but every other Stripe failure (bad price, network error, account issue, etc.) must still fail closed exactly as before — this is not a generic retry-on-any-error.

   - **If it matches:** retry `stripe.checkout.sessions.create` with the identical params object except `customer: undefined` (drop the stale ID entirely so Stripe creates a fresh Customer for this session — `api/billing/webhook.js`'s `checkout.session.completed` handler already backfills `users.stripe_customer_id` from `session.customer` on the next successful webhook delivery, so no DB write happens here). Use idempotency key `` `checkout:${user.id}:${key}:${interval}:retry` `` — add a comment explaining WHY this must be a distinct key: Stripe's idempotency-key guarantee only replays the same response for the exact same request parameters; reusing the original key here (whose stored request included `customer`) against a request that omits it would make Stripe reject the retry as a parameter mismatch rather than creating a session. Assign the retry's result to `session`.
     - If this second call also throws, log it via `console.error` (format: `` `checkout: retry after stale customer id failed (type=${retryErr?.type}, code=${retryErr?.code}): ${retryErr?.message}` ``) and `return redirectTo('/subscribe?checkout_error=1', request)` — same client-visible outcome as today, now diagnosable server-side.
   - **If it does not match** (any other Stripe error, or `resource_missing` on a different `param`): log it via `console.error` (format: `` `checkout: session creation failed (type=${err?.type}, code=${err?.code}): ${err?.message}` ``) and `return redirectTo('/subscribe?checkout_error=1', request)` — identical behavior to the current bare catch, just now logged.

3. After the try/catch, keep the existing success path unchanged: build `headers` with `Location: session.url` and return the 302 `Response`.

Do not change `isSameOriginNavigation`, the session/user lookup block, the D-04 already-subscribed re-check, `PUBLIC_ORIGIN`, or `redirectTo` — this task touches only the Checkout Session creation try/catch and its two failure branches. Do not touch `api/billing/webhook.js`, `lib/stripe.js`, or any other file.
  </action>
  <verify>
    <automated>npm run build && node -e "const s=require('fs').readFileSync('api/billing/checkout.js','utf8'); const need=['resource_missing',':retry','console.error','checkout_error=1']; const missing=need.filter(t=>!s.includes(t)); if(missing.length){console.error('MISSING:',missing.join(', '));process.exit(1)} console.log('checkout.js contains all required markers')"</automated>
  </verify>
  <done>
`npm run build` (the full pipeline: migrate + client build + SSR build + prerender + check-secrets) completes with exit 0. `api/billing/checkout.js` contains the narrow stale-customer retry (`err.type === 'StripeInvalidRequestError' && err.code === 'resource_missing' && err.param === 'customer'`), the retry call uses a `:retry`-suffixed idempotency key distinct from the first attempt's key, both failure branches call `console.error` with type/code/message only (no request/response bodies, no secrets), and the client-visible redirect on any non-retryable failure is still exactly `/subscribe?checkout_error=1` — unchanged from today. No other file is modified.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Server -> Stripe API | `api/billing/checkout.js` calls `stripe.checkout.sessions.create()` twice under this fix (original attempt + narrow retry) using the live-mode `STRIPE_SECRET_KEY` — both calls are server-to-server, no new client-facing surface is introduced. |
| Server -> Vercel logs | New `console.error` calls write Stripe error details to server-side logs only, never returned in the HTTP response to the browser. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| WR-11a | Denial of Service | `api/billing/checkout.js` retry branch | high | mitigate | Retry triggers ONLY on the exact `StripeInvalidRequestError` / `resource_missing` / `param==='customer'` triple — any other Stripe error (bad price, rate limit, network, account issue) still fails closed to `/subscribe?checkout_error=1` on the first attempt, with no retry loop and no risk of masking a real outage as a transient glitch. |
| WR-11b | Information Disclosure | `console.error` logging in both new catch branches | medium | mitigate | Logged fields are limited to `err.type`, `err.code`, `err.message` — never the raw Stripe request/response body, headers, API key, or session object; matches the existing `prices.js`/`webhook.js` logging discipline in this codebase. |
| WR-11c | Tampering (idempotency reuse) | Retry's Stripe idempotency key | low | mitigate | Retry uses a distinct `:retry`-suffixed idempotency key rather than reusing the original — prevents Stripe from either replaying the failed first response or rejecting the retry outright as a parameter-mismatched idempotent request. |
</threat_model>

<verification>
Run `npm run build` from the project root — the full pipeline (migrate + client build + SSR build + prerender + check-secrets) must complete with exit code 0, confirming the syntax and structure of `api/billing/checkout.js` are sound and no server-only secret markers leaked into the client bundle. Manually re-run the previously-reproduced live scenario (signed-in user whose `users.stripe_customer_id` is the stale `cus_VBFNYvYF4DflCH` test-mode ID, live-mode `STRIPE_SECRET_KEY` configured) against the deployed environment to confirm Checkout now redirects to a real Stripe-hosted session instead of `/subscribe?checkout_error=1`, and confirm the Vercel function logs now show a `checkout:` prefixed error line on any Stripe failure (this is a live-environment check outside what `npm run build` can prove — call it out explicitly if not independently re-verified in this session).
</verification>

<success_criteria>
- [ ] `api/billing/checkout.js` retries `stripe.checkout.sessions.create()` exactly once, without the `customer` field, specifically when the first attempt throws `StripeInvalidRequestError` / `resource_missing` / `param === 'customer'`
- [ ] The retry uses a distinct (`:retry`-suffixed) idempotency key, with a comment explaining why
- [ ] Every other Stripe error (and a failed retry) still redirects to `/subscribe?checkout_error=1`, unchanged from today's client-visible behavior
- [ ] Both failure branches log `err.type`/`err.code`/`err.message` via `console.error`, never raw request/response bodies or secrets
- [ ] No file other than `api/billing/checkout.js` is modified
- [ ] `npm run build` passes
</success_criteria>

<output>
Create `.planning/quick/260909-kco-fix-checkout-js-hard-failing-on-a-stale-/260909-kco-SUMMARY.md` when done
</output>