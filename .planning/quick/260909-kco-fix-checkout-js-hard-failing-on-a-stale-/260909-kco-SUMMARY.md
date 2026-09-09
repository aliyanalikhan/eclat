---
phase: quick-260909-kco
plan: 1
subsystem: payments
tags: [stripe, checkout, api, node]
status: complete

# Dependency graph
requires:
  - phase: 03-billing-webhooks-stripe-checkout-and-subscription-sync
    provides: api/billing/checkout.js Checkout Session creation, api/billing/webhook.js stripe_customer_id backfill
provides:
  - Checkout no longer hard-fails when a stored users.stripe_customer_id is stale for the currently configured Stripe key's mode (e.g. a test-mode customer id under a live-mode key)
  - Server-side console.error logging of Stripe Checkout Session creation failures (type/code/message only)
affects: [billing, checkout, stripe-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Narrow single-retry-on-specific-error pattern for Stripe Checkout Session creation, gated on exact error type/code/param match, not a generic retry-on-any-error"
    - "Distinct :retry-suffixed idempotency key when retrying a Stripe call with different request params than the original attempt"

key-files:
  created: []
  modified:
    - api/billing/checkout.js

key-decisions:
  - "Retry omits `customer` entirely (letting Stripe auto-create a fresh Customer) rather than looking up/creating a replacement customer id server-side — api/billing/webhook.js's checkout.session.completed handler already backfills users.stripe_customer_id from session.customer on the next successful webhook delivery, so no separate DB write or migration was needed here"
  - "Retry is scoped to the exact triple (StripeInvalidRequestError / resource_missing / param==='customer') plus user.stripe_customer_id having been set — every other Stripe failure (bad price, rate limit, network, account issue) still fails closed to /subscribe?checkout_error=1 on the first attempt with no retry, avoiding any risk of masking a real outage as a transient glitch"

patterns-established:
  - "console.error(`checkout: ...`) logging convention extended to Checkout Session creation failures, matching the existing prices.js/webhook.js `{route-prefix}: {context}: ${err.message}` format"

requirements-completed: []

# Metrics
duration: ~15min
completed: 2026-09-09
---

# Quick Task 260909-kco: Fix checkout.js hard-failing on a stale customer id Summary

**`api/billing/checkout.js` now retries Stripe Checkout Session creation once (without the stored `customer` id) when the first attempt fails with a stale-customer `resource_missing` error, and logs every Checkout Session creation failure server-side via `console.error` instead of swallowing it silently.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-09-09T09:47:31Z
- **Tasks:** 1/1 completed
- **Files modified:** 1

## Accomplishments
- Signed-in subscribers whose stored `users.stripe_customer_id` is invalid for the currently configured Stripe key's mode (the reproduced production case: a test-mode customer id under a live-mode key) can now complete Checkout Session creation instead of hitting `checkout_error=1`
- Every other Stripe Checkout Session creation failure still fails closed to `/subscribe?checkout_error=1`, unchanged from before this fix
- Both new failure paths (retry failure, generic failure) now log the real Stripe error's `type`/`code`/`message` via `console.error`, matching the codebase's existing `prices.js`/`webhook.js` logging convention — no request/response bodies or secrets are ever logged

## Task Commits

Each task was committed atomically:

1. **Task 1: Retry Checkout Session creation without a stale customer ID, and log Stripe errors instead of swallowing them** - `5916f7f` (fix)

## Files Created/Modified
- `api/billing/checkout.js` - Restructured the Checkout Session creation `try/catch` to (1) retry once without `customer` on the specific stale-customer `resource_missing` error using a distinct `:retry`-suffixed idempotency key, and (2) log `console.error` with `type`/`code`/`message` in both new failure branches instead of the previous bare, silent `catch`

## Decisions Made
- Retry omits `customer` entirely rather than performing a fresh Stripe customer lookup/creation inline — `api/billing/webhook.js`'s `checkout.session.completed` handler already self-heals `users.stripe_customer_id` from `session.customer` on the next successful webhook, so no additional DB write belonged in this fix
- Retry gate is intentionally narrow (`StripeInvalidRequestError` + `resource_missing` + `param === 'customer'`, only when `user.stripe_customer_id` was actually set) rather than a generic retry-on-any-Stripe-error, per the plan's WR-11a threat mitigation (avoids masking a real Stripe outage as a transient glitch)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**`npm run build`'s `migrate` step cannot run in this worktree.** The full pipeline (`node scripts/migrate.js && vite build && vite build --ssr ... && node prerender.js && node scripts/check-secrets.js`) starts with a database migration step that requires `POSTGRES_URL`. This worktree has no `.env.local` and no `POSTGRES_URL` provisioned (confirmed via `Glob(.env*)` — no files — and `git ls-files` showing only the tracked `.env.example` template, not a real `.env.local`). Per project constraints, credentials must be supplied via environment variables at implementation time and must never be invented — so this was not worked around by fabricating a connection string.

This is a pre-existing environment gap in this specific worktree, not a regression introduced by this fix: `api/billing/checkout.js` is a Vercel serverless function, not part of the Vite client/SSR bundle, and the migration step has no code-path dependency on this file. To still satisfy the "run the full build verification" instruction to the extent this sandbox allows, every build step that does not require a live Postgres connection was run individually and passed cleanly:
- `node --check api/billing/checkout.js` → syntax OK
- The plan's own automated verify command (marker check for `resource_missing`, `:retry`, `console.error`, `checkout_error=1`) → all markers present
- `npx vite build` (client bundle) → succeeded, 56 modules transformed
- `npx vite build --ssr src/entry-server.jsx --outDir dist/server` → succeeded, 25 modules transformed
- `node prerender.js` → succeeded, 10 routes prerendered, sitemap generated
- `node scripts/check-secrets.js` → `check-secrets: no leaked secrets found in dist/`

**Not independently re-verified in this session:** the plan's manual live-environment check (re-running the actual reproduced scenario — a signed-in user with the stale `cus_VBFNYvYF4DflCH` customer id against the live-mode `STRIPE_SECRET_KEY` in the deployed environment) was outside what this sandboxed worktree (no DB, no live Stripe network access) can prove. The code change matches the plan's exact specification (narrow retry gate, distinct idempotency key, matching log format, unchanged client-visible failure behavior for every other error), and all statically-verifiable checks pass, but the live end-to-end redirect behavior should be confirmed against the deployed environment before considering this fully closed.

## User Setup Required

None - no external service configuration required. (`POSTGRES_URL` is a pre-existing project requirement unrelated to this fix; see Issues Encountered above.)

## Next Phase Readiness
- `api/billing/checkout.js` is ready as-is; no follow-up code changes required by this task
- Recommended: re-run the live scenario (stale test-mode `stripe_customer_id` under the live-mode key) against the actual Vercel deployment to confirm the redirect now lands on a real Stripe-hosted Checkout session and that Vercel function logs show the new `checkout:`-prefixed error lines on any failure

## Self-Check: PASSED

- FOUND: `api/billing/checkout.js`
- FOUND: `.planning/quick/260909-kco-fix-checkout-js-hard-failing-on-a-stale-/260909-kco-SUMMARY.md`
- FOUND: commit `5916f7f`

---
*Quick task: 260909-kco*
*Completed: 2026-09-09*
