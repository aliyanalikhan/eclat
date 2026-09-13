# Phase 3: Billing & Webhooks — Stripe Checkout and Subscription Sync - Context

**Gathered:** 2026-09-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers Stripe-backed billing: a signed-in user can start a hosted Stripe Checkout session for any of the 4 real products (Éclat Online, Éclat Hard Copy, Children's Book Online, Children's Book Hard Copy), and Stripe webhook events (not the client, not the Checkout redirect) are the single source of truth for subscription state in the database. No content gating (Phase 4 replaces the `subscribed` flag) and no real Account-page billing UI (Phase 5 builds status/cancellation/invoices via the Customer Portal) happen in this phase — /subscribe and the checkout flow are the extent of the user-facing surface, and /account only needs enough of a link-out to point a just-subscribed or already-subscribed user somewhere sensible.

</domain>

<decisions>
## Implementation Decisions

### Product & plan selection (Subscribe.jsx rework)
- **D-01:** `/subscribe` becomes a single central picker across all 4 real products (Éclat Online, Éclat Hard Copy, Children's Book Online, Children's Book Hard Copy) — single-select, not two independent series/format toggles. Replaces the current generic monthly/annual-only flow.
- **D-02:** Whether monthly/annual billing intervals apply per product (vs. one fixed price per product) is **unverified** — could not be checked against the live Stripe account from this session (`.env.local`/`STRIPE_SECRET_KEY` access is correctly sandboxed away from the discussion agent). **This is a mandatory research-phase task**: verify real price IDs/intervals for all 4 products below via `vercel env pull` (server-side, in the execution environment) or the Stripe Dashboard before planning locks the Checkout UI shape.
  - Éclat Online: `prod_VAyHWfX8XdHh2z`
  - Éclat Hard Copy: `prod_VAyJTIfn7UVWi3`
  - Children's Book Online: `prod_VCuT7Wcy4yQDrc`
  - Children's Book Hard Copy: `prod_VCuJDGHg6vxcE6`
- **D-03:** Checkout uses Stripe's hosted Checkout page via a server-created Checkout Session (server-initiated redirect, matching the D-01/D-07 pattern already established for Google OAuth in Phase 2) — no Stripe.js/Elements loaded client-side. This keeps the existing tight CSP (`script-src 'self'`) largely intact; confirmed consistent with REQUIREMENTS.md's explicit "Custom-built payment form (raw Stripe Elements)" exclusion.

### Existing-subscription handling on /subscribe
- **D-04:** The `/subscribe` picker checks the signed-in user's real subscription state (per product) before rendering each product's action: a product the user already holds an active subscription to shows as "Subscribed" with a link to manage it (pointing at `/account`, where Phase 5 will build the real Customer Portal entry point) instead of a "Subscribe" button. This structurally prevents duplicate Checkout sessions/double-billing for the same product without needing a separate server-side guard check at click time (though the server-side Checkout-session-creation endpoint should still independently verify no active subscription exists for that product, since the picker's rendered state is not itself a security boundary — same client-render-vs-server-check split established in Phase 2).
- **D-05:** A user can hold subscriptions to multiple different products simultaneously (e.g., both Éclat Online and Children's Book Online) — each product's subscribed/not-subscribed state on the picker is independent, consistent with GATE-03's "Hard Copy and Online are separate, independent entitlements" decision from Phase 1/4 planning.

### Checkout return experience
- **D-06:** After Stripe Checkout redirects back, the success page shows a brief "confirming your subscription…" state and polls (a few seconds, short-interval) for the webhook-synced subscription row to appear before revealing the unlocked/confirmed view — avoids a race where the page looks "done" before BILL-05's webhook-driven DB sync has actually landed. Exact poll endpoint/interval/timeout left to planning (likely reuses or extends the existing session-check pattern from `api/auth/session.js`).
- **D-07 (BILL-05, locked by REQUIREMENTS.md):** The Checkout success redirect itself never grants access on its own — only a processed webhook event writing to `subscriptions` counts as real entitlement. The confirming/polling UI in D-06 is purely a UX affordance around this already-locked rule, not an exception to it.

### Entry points
- **D-08:** Subscribe CTAs live only on `/subscribe` — no direct per-product "Subscribe to this" buttons on `Books.jsx`, `Archive.jsx`, or `Edition.jsx` in this phase. Existing/future paywall prompts on those pages link to `/subscribe` (optionally with a query param preselecting the relevant product) rather than each page growing its own direct-checkout entry point. Keeps the checkout surface area small and centralizes the D-04 already-subscribed check in one place.

### Webhook handling (mostly technical, confirmed in-scope per REQUIREMENTS.md)
- **D-09 (BILL-03, locked by REQUIREMENTS.md):** Stripe webhook events are verified via signature (`constructEvent` + `STRIPE_WEBHOOK_SECRET`) before being trusted — unsigned/tampered payloads rejected outright.
- **D-10 (BILL-04, locked by REQUIREMENTS.md):** Webhook handling is idempotent — reuses the existing `webhook_events` table (PK on `stripe_event_id`, Phase 1 D-10) as the dedupe mechanism; a duplicate delivery of the same event is a no-op.
- **D-11 (BILL-06, locked by REQUIREMENTS.md):** `invoice.payment_failed` updates the affected `subscriptions` row's `status` to reflect "past due" (mirroring Stripe's own status vocabulary verbatim per Phase 1 D-09) — no separate notification/email system, no user-facing UI for this in Phase 3 (that's ACCT-04, Phase 5's job). This phase only needs the DB state to be correct.

### Claude's Discretion
- Exact Checkout Session creation endpoint path/naming (e.g. `/api/billing/checkout`) and whether it runs on Node or Edge runtime — same pattern precedent as Phase 2's OAuth routes.
- Exact set of Stripe webhook event types subscribed to beyond the ones named in requirements (`checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`) — standard Stripe subscription-lifecycle coverage, not a user-facing choice.
- How/whether an existing `users.stripe_customer_id` is reused vs. a new Stripe Customer created at Checkout time — technical detail, should reuse the existing column from Phase 1's schema.
- Exact poll interval/timeout and endpoint shape for D-06's "confirming…" state.
- Visual design of the reworked `/subscribe` product-picker UI (this phase carries `UI hint: yes` in ROADMAP.md — likely warrants `/gsd-ui-phase` before/alongside planning).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` — Phase 3 section (Goal, Success Criteria, Requirements BILL-01 through BILL-06; `UI hint: yes`)
- `.planning/REQUIREMENTS.md` — BILL-01 through BILL-06 (full requirement text); Out of Scope table (hosted Checkout only, no custom payment form, no new pricing tiers)
- `.planning/PROJECT.md` — Core Value, Constraints, real Stripe product IDs, Key Decisions table

### Prior Phase Context
- `.planning/phases/01-foundation-environment-secrets-data-layer/01-CONTEXT.md` — D-07 (`subscriptions` table mirrors Stripe directly), D-08 (`users.id` is `BIGINT`, not `UUID` — carries into every FK this phase touches), D-09 (`status` mirrors Stripe's enum verbatim), D-10 (`webhook_events` idempotency table)
- `.planning/phases/02-authentication-google-sign-in-server-side-sessions/02-CONTEXT.md` — D-01/D-02 (server-initiated redirect pattern and identity/entitlement separation, both directly reused as D-03/D-07 above); established `/api/auth/*` route-naming and Node-runtime-per-route convention to follow for `/api/billing/*`
- `migrations/0001_init.sql` — live schema: `users.stripe_customer_id` (nullable, unique-indexed, currently unset for existing users), `subscriptions` (id, user_id, stripe_subscription_id, stripe_customer_id, stripe_product_id, status, current_period_end, created_at, updated_at — unique on `stripe_subscription_id`, indexed on `(user_id, stripe_product_id)`), `webhook_events` (stripe_event_id PK, processed_at)

### Codebase Analysis
- `src/routes/Subscribe.jsx` — current fake flow to be reworked per D-01 through D-08 (generic monthly/annual toggle, disabled card fieldset, `completeDemo` local-state flip — all replaced by real Checkout redirect)
- `src/store.jsx` — current `subscribed`/`plan` fields; NOT to be reused for real entitlement (same anti-pattern flagged in Phase 1/2 CONTEXT.md), though Phase 3 doesn't need to remove them yet (Phase 4/GATE-02's job)
- `vercel.json` / `public/_headers` — current CSP (`connect-src 'self'`, `script-src 'self'`); per D-03 (hosted Checkout, no Stripe.js), no CSP loosening for script-src is expected, but the redirect target (`checkout.stripe.com`) may need a `form-action`/navigation allowance — verify during planning, same as Phase 2's Google redirect handling

### Existing Config
- `.env.local` / `.env.example` — `STRIPE_SECRET_KEY` already provisioned on Vercel per Phase 1 discovery notes (PROJECT.md); `STRIPE_WEBHOOK_SECRET` will need to be added once the webhook endpoint is registered in the Stripe Dashboard (new checkpoint, same shape as Phase 1 D-02's "provision and confirm env var" pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/db.js` — existing `@vercel/postgres` tagged-template query client; billing routes should use this directly, no new DB client needed
- `lib/session.js` — existing session/cookie primitives; Checkout-session-creation and the polling success-page endpoint both need to identify "who is the signed-in user," reusing this rather than inventing new auth plumbing
- `api/auth/session.js` — existing pattern for a DB-backed, fail-closed GET endpoint returning current-user state; the D-06 polling endpoint should follow the same shape (fail closed, no raw secrets/tokens in the response body)

### Established Patterns
- `api/auth/google.js` + `api/auth/google/callback.js` — the exact server-initiated-redirect-then-callback shape (D-03) to mirror for Checkout-session-creation + Stripe's `success_url`/`cancel_url` return handling
- `middleware.js` — cheap edge-level pre-filter pattern (cookie presence only, no DB call) established in Phase 2; likely not needed for billing routes (Checkout creation should just 401/redirect on no session, same as any other authenticated API route) but worth checking if `/subscribe` itself should gain a similar auth pre-filter
- Migration file convention (`migrations/000N_description.sql`, idempotent `IF NOT EXISTS`) — any schema additions this phase (e.g., if D-02's research reveals a need for a `stripe_price_id` column) follow this same numbered-file pattern

### Integration Points
- `src/data/content.js` (`SITE.price`) — current placeholder pricing object read by `Subscribe.jsx`; needs reconciling with whatever D-02's research finds are the real per-product Stripe prices
- `package.json` — no Stripe SDK/dependency installed yet (`grep` confirms only `@vercel/postgres`, `@vercel/functions`, `jose`, `cookie` present); this phase introduces the project's first Stripe dependency (likely the `stripe` npm package) — subject to the same package-legitimacy-audit pattern used for `jose`/`cookie`/`@vercel/functions` in Phase 2's threat model

</code_context>

<specifics>
## Specific Ideas

- The user explicitly wants the already-subscribed state to be visible directly on the `/subscribe` picker itself (D-04) — "it already shows on subscribe page the subscribed package and shows to manage subs" — rather than a generic block-and-redirect error only surfaced at click time.
- No direct per-product subscribe buttons elsewhere in the site (D-08) — user confirmed centralizing on `/subscribe` alone as the recommended, simpler option.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Real Customer Portal management, invoice history, and past-due UI notices are already correctly scoped to Phase 5 per REQUIREMENTS.md ACCT-01 through ACCT-04, not deferred from this discussion — just out of this phase's boundary from the start.)

</deferred>

---

*Phase: 3-Billing & Webhooks — Stripe Checkout and Subscription Sync*
*Context gathered: 2026-09-09*
