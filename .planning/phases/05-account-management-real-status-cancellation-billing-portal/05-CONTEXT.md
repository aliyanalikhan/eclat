# Phase 5: Account Management — Real Status, Cancellation & Billing Portal - Context

**Gathered:** 2026-09-09
**Status:** Ready for planning

<domain>
## Phase Boundary

A user can view and manage their **real** subscription from the Account page — status, renewal date, invoices, and cancellation are all backed by live Stripe data instead of mocks. Scope is fixed by ROADMAP.md Phase 5: replace the mocked Account page with real status (active / canceled / past due), renewal date, Stripe-hosted Customer Portal cancellation, real invoice history, and a clear "payment failed, update your card" notice for past-due subscriptions.

- **Requirements:** ACCT-01, ACCT-02, ACCT-03, ACCT-04
- **Depends on:** Phase 3 (Stripe Checkout + webhook-driven `subscriptions` sync)
- **UI hint:** yes — the Account page gets a real rebuild, but visual polish follows the existing design system
- **Out of scope:** custom (non-Stripe) payment form, client-trusted access flags, unified ACCT-05/06 v2 views (deferred per REQUIREMENTS.md)

**Success Criteria** (must be TRUE):
1. User sees their real subscription status (active / canceled / past due) and renewal date on the Account page, replacing today's mocked data
2. User can cancel a subscription from the Account page via Stripe's hosted Customer Portal
3. User sees their real invoice history on the Account page, replacing today's mocked invoice table
4. User sees a clear "payment failed, update your card" notice on the Account page when a subscription is past due

</domain>

<decisions>
## Implementation Decisions

### Data source for Account (D-01..D-04)
- **D-01:** Add a new sibling endpoint `GET /api/billing/account` — do NOT extend `GET /api/billing/status`. The status endpoint stays lean for entitlement polling (its payload is fetched on every gated page). The Account page consumes a new `useAccount` hook built on the shared `useSafeFetch` primitive (third consumer — named in Phase 4 D-08).
- **D-02:** The endpoint aggregates **all products the user holds** as a per-product map mirroring the `status.js` shape (keyed by product slug via `PRODUCT_ID_TO_KEY`). Not eclat-online-only — future-proofs the deferred ACCT-05 unified view.
- **D-03:** **Server-side composition.** The endpoint reads `subscriptions` from our DB exactly like `status.js` (fail-closed 401 on missing session, `Cache-Control: no-store`), then fetches live Stripe details (card, invoices, prices) server-side and merges them. Client makes one call; the Stripe secret never reaches `src/`.
- **D-04:** **Partial degradation.** DB state (status, `current_period_end`) is ALWAYS returned. Stripe enrichment is best-effort: if the live Stripe call fails, the card and invoice sections are marked unavailable rather than failing the whole request (no 502 error state on /account).

### Cancellation & portal flow (D-05..D-08)
- **D-05:** Add a new state-changing endpoint `POST /api/billing/portal` mirroring `checkout.js` structure: Sec-Fetch-Site same-origin CSRF guard (Phase 3 **WR-06** pattern), `getSessionUser` 401 fail-closed, then `stripe.billingPortal.sessions.create({ customer, return_url })`; returns `{ url }` and the client redirects.
- **D-06:** `return_url = origin + /account` — built from `PUBLIC_ORIGIN` (module-load fail-fast) using the `redirectTo` discipline (pathname + search only, never Host-derived). Landing back on /account refetches `/api/billing/account` fresh and shows the new post-action state.
- **D-07:** **Single Stripe customer scoping.** One Stripe customer owns the user's subscriptions (created at first checkout). One portal session handles all their products — matches the ACCT-05 direction and avoids per-product portal sessions.
- **D-08:** **State-aware CTA + ACCT-04 notice pairing** (fixes Phase 3 **WR-01**, fulfills **ACCT-04**):
  - `status = active` or `past_due` → **"Manage"** CTA opens the portal (no more dead-end "Subscribe" for past_due).
  - No subscription → **"Subscribe"** CTA to `/subscribe`.
  - `status = past_due` → show the clear **"payment failed, update your card"** notice with an **"Update payment method"** portal action.

### Invoice history (D-09..D-12)
- **D-09:** **Live from Stripe API** — `stripe.invoices.list({ customer, limit, status: 'paid' })`, filtered server-side to the user's Stripe customer. Always current, no new DB table, no webhook events, no backfill migration. Pairs with D-04's partial degradation.
- **D-10:** Fetch **up to 12 most recent paid invoices** for the user's customer — matches the mocked table footprint. No pagination UI (no "Load more" / cursor state).
- **D-11:** Invoice rows keep the existing columns — invoice number, date, amount — and the mocked **"Receipt →"** link becomes the real `invoice.hosted_invoice_url`, opening in a new tab.
- **D-12:** **All products under the customer** surface in one table (eclat-online, hardcopy, books). No product filtering — consistent with D-02 (aggregate) and D-07 (single customer).

### Plan label & renewal date (D-13..D-16)
- **D-13:** Plan label is derived **server-side from the stored `stripe_price_id`** via `lib/products.js` (deterministic slug/price lookup — no live Stripe price call at render time).
- **D-14:** The **Renews** date is context-aware by subscription status: `active` → renewal date; `canceled` → "Access until {date}"; `past_due` → `current_period_end` plus the ACCT-04 notice (per D-08).
- **D-15:** Card display comes from the Stripe customer's default payment method (`invoice_settings.default_payment_method`, falling back to the subscription's) → `card.brand` + `card.last4`, resolved **server-side**; shows `—` when unavailable. Replaces the hardcoded `'•••• 4242'` mock.
- **D-16:** The summary panel renders **per held product** (eclat-online first, then the rest), matching the aggregate per-product decision D-02.

### Claude's Discretion
- Finer implementation details of the `GET /api/billing/account` endpoint (user selected the sibling endpoint AND granted discretion on internals — response shape fields, enrichment merge order, error payloads).
- Renews date formatting per state (locale, "Access until" phrasing) — the states themselves are locked by D-14.
- Invoice date formatting and loading/error skeleton design for the Account panels.
- Exact "Manage"/"Subscribe"/"Update payment method" button styling per the existing design system.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` — Phase 5 section (Goal, Depends on, Success Criteria 1-4, Requirements ACCT-01..04, `UI hint: yes`)
- `.planning/REQUIREMENTS.md` — ACCT-01 through ACCT-04 (full requirement text, all `[ ]` Pending); v2 ACCT-05/06 (deferred — unified account view, custom billing UI); Out of Scope table (custom payment form, client-trusted access flags)

### Prior Phase Context
- `.planning/phases/03-billing-webhooks-stripe-checkout-and-subscription-sync/03-REVIEW.md` — Phase 3 review: **WR-01** (past_due dead-end "Subscribe" CTA → fixed by D-08), **WR-06** (Sec-Fetch-Site CSRF guard for state-changing endpoints → D-05), **WR-07** (Host-derived URLs → D-06 PUBLIC_ORIGIN + redirectTo discipline), **IN-01** (no-store on billing reads → D-03)
- `.planning/phases/03-billing-webhooks-stripe-checkout-and-subscription-sync/03-CONTEXT.md` — webhook-driven `subscriptions` sync is the single source of truth; single Stripe customer created at first checkout (basis for D-07)
- `.planning/phases/04-content-gating-real-server-side-entitlement-enforcement/04-CONTEXT.md` — **D-06** (only `status='active'` is entitled; past_due loses access → ACCT-04 notice is the user-facing explanation), **D-08** (names Phase 5 account hooks as the third `useSafeFetch` consumer → D-01)
- `.planning/STATE.md` — Phase 4 complete (11/11 plans, 80%); Account.jsx mocked placeholders explicitly flagged as Phase 5 ACCT-01/ACCT-04 scope
- `.planning/phases/01-foundation-environment-secrets-data-layer/01-CONTEXT.md` — `subscriptions` table shape (user_id, stripe_product_id, status, current_period_end; `stripe_price_id` added in `migrations/0004_billing_stripe_price_id.sql`)

### Codebase Analysis
- `api/billing/status.js` — the sibling pattern for D-01/D-03: `getSessionUser`, fail-closed 401, `PRODUCT_ID_TO_KEY` per-product map, no-store; returns only status + `current_period_end` (the gap that justifies the new endpoint)
- `api/billing/checkout.js` — pattern reference for D-05/D-06: `PUBLIC_ORIGIN` fail-fast, `redirectTo(path, request)` (pathname+search only), `isSameOriginNavigation(request)` (Sec-Fetch-Site, fail closed), idempotency keys
- `lib/stripe.js` — pinned `apiVersion: '2026-08-26.dahlia'`, fail-fast `STRIPE_SECRET_KEY`; all Stripe calls live server-side
- `lib/session-user.js` — `getSessionUser(request)` → `{ user: { id } }` or null (fail-closed auth)
- `lib/products.js` — frozen `PRODUCTS` map: eclat-online, eclat-hardcopy, book-online, book-hardcopy with real Stripe product + monthly/annual price IDs (label source for D-13)
- `src/lib/useSafeFetch.js` — shared abort-cancel fetch primitive (`useSafeFetch(url, { enabled, key })` → `{loading, data, error}`); the base for the new `useAccount` hook
- `src/lib/useEntitlements.js` — existing hook wrapping `GET /api/billing/status`, fails closed to `{}`; pattern to mirror for `useAccount`
- `src/routes/Account.jsx` — the rebuild target: mocked `invoices` from `../data/content.js`, hardcoded card `'•••• 4242'`, `planLabel = '—'`, dead-end upsell CTA, mocked invoice rows with "Receipt →" links

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/session-user.js` + `lib/session.js` — fail-closed signed-in-user resolution; reuse for both new endpoints (D-03, D-05)
- `lib/stripe.js` — already-pinned Stripe client; `billingPortal.sessions.create` and `invoices.list` are available on it (no new dependency)
- `lib/products.js` — canonical product slugs + real price IDs; server-side plan-label source (D-13)
- `src/lib/useSafeFetch.js` — the shared fetch primitive for the new `useAccount` hook (third consumer per Phase 4 D-08)
- `src/lib/useEntitlements.js` — established hook shape (enabled-gating, fail-closed) to mirror for `useAccount`

### Established Patterns
- **Server-side Stripe only** — all Stripe calls live in `api/*`/`lib/*`, never in `src/` (enforced by `scripts/check-secrets.js`); new endpoint must follow (D-03)
- **Fail-closed auth reads** — `getSessionUser` → 401 with empty/no-store response on billing GETs (D-03, IN-01 pattern)
- **CSRF on state-changing endpoints** — Sec-Fetch-Site same-origin guard, fail closed (D-05, WR-06 pattern from `checkout.js`)
- **PUBLIC_ORIGIN fail-fast + redirectTo discipline** — module-load fail-fast for origin; pathname+search-only redirects, never Host-derived (D-06, WR-07 fix)
- **Partial degradation** — DB state always returned, Stripe enrichment best-effort (D-04)
- **Per-product aggregation** — `PRODUCT_ID_TO_KEY` map shape from `status.js` reused for the account payload (D-02)

### Integration Points
- **New** `api/billing/account.js` (GET) — sibling of `api/billing/status.js`; reads `subscriptions`, merges Stripe card/invoices/labels
- **New** `api/billing/portal.js` (POST) — sibling of `api/billing/checkout.js`; creates Stripe portal session, returns `{ url }`
- **New** `src/lib/useAccount.js` — `useSafeFetch` consumer for `GET /api/billing/account`
- `src/routes/Account.jsx` — full rebuild: status + renewal date, per-product summary panels, card, invoice table, state-aware CTA, ACCT-04 notice
- `subscriptions` table — `user_id`, `stripe_product_id`, `status`, `current_period_end`, `stripe_price_id` (label source)
- Stripe API — `customers` (default payment method), `invoices.list` (paid, customer-scoped), `billingPortal.sessions.create`

</code_context>

<specifics>
## Specific Ideas

- The Account page keeps today's visual footprint for invoices — up to 12 rows, columns of number / date / amount, with the "Receipt →" link now pointing at the real `hosted_invoice_url` in a new tab (D-11/D-10).
- Card display format follows the existing mock's spirit (`brand` + `last4`, e.g. "Visa •••• 4242") but is now real server-side data with `—` fallback (D-15).
- The ACCT-04 notice copy is requirement-locked: **"payment failed, update your card"** — pair it with the "Update payment method" portal action (D-08).

No other specific references or "I want it like X" moments — discussion stayed within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

(Note: v2 ACCT-05 unified account view and ACCT-06 custom billing UI are already tracked as deferred in `.planning/REQUIREMENTS.md`; the aggregate per-product payload D-02 and single-customer scoping D-07 deliberately keep this phase compatible with them.)

</deferred>

---
*Phase: 05-account-management-real-status-cancellation-billing-portal*
*Context gathered: 2026-09-09*
