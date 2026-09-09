# Phase 3: Billing & Webhooks — Stripe Checkout and Subscription Sync - Research

**Researched:** 2026-09-09
**Domain:** Stripe Checkout (hosted) + Stripe webhook signature verification/idempotency, on Vercel Node.js serverless functions
**Confidence:** MEDIUM (stack/API shape HIGH; real price/interval data for the 4 products remains UNVERIFIED — see Open Questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `/subscribe` becomes a single central picker across all 4 real products (Éclat Online, Éclat Hard Copy, Children's Book Online, Children's Book Hard Copy) — single-select, not two independent series/format toggles. Replaces the current generic monthly/annual-only flow.
- **D-02:** Whether monthly/annual billing intervals apply per product (vs. one fixed price per product) is **unverified** — could not be checked against the live Stripe account from the discuss-phase session. **Mandatory research-phase task**: verify real price IDs/intervals for all 4 products via `vercel env pull` (server-side, in the execution environment) or the Stripe Dashboard before planning locks the Checkout UI shape. Product IDs: Éclat Online `prod_VAyHWfX8XdHh2z`, Éclat Hard Copy `prod_VAyJTIfn7UVWi3`, Children's Book Online `prod_VCuT7Wcy4yQDrc`, Children's Book Hard Copy `prod_VCuJDGHg6vxcE6`.
- **D-03:** Checkout uses Stripe's hosted Checkout page via a server-created Checkout Session (server-initiated redirect, matching the D-01/D-07 pattern already established for Google OAuth in Phase 2) — no Stripe.js/Elements loaded client-side. Keeps the existing tight CSP (`script-src 'self'`) largely intact; confirmed consistent with REQUIREMENTS.md's explicit "Custom-built payment form (raw Stripe Elements)" exclusion.
- **D-04:** The `/subscribe` picker checks the signed-in user's real subscription state (per product) before rendering each product's action: a product the user already holds an active subscription to shows as "Subscribed" with a link to manage it (pointing at `/account`) instead of a "Subscribe" button. The server-side Checkout-session-creation endpoint must still independently verify no active subscription exists for that product — the picker's rendered state is not itself a security boundary.
- **D-05:** A user can hold subscriptions to multiple different products simultaneously — each product's subscribed/not-subscribed state on the picker is independent (GATE-03).
- **D-06:** After Stripe Checkout redirects back, the success page shows a brief "confirming your subscription…" state and polls (a few seconds, short-interval) for the webhook-synced subscription row to appear before revealing the unlocked/confirmed view. Exact poll endpoint/interval/timeout left to planning (likely reuses/extends the `api/auth/session.js` pattern).
- **D-07 (BILL-05, locked by REQUIREMENTS.md):** The Checkout success redirect itself never grants access on its own — only a processed webhook event writing to `subscriptions` counts as real entitlement. The confirming/polling UI in D-06 is purely a UX affordance around this already-locked rule.
- **D-08:** Subscribe CTAs live only on `/subscribe` — no direct per-product "Subscribe to this" buttons on `Books.jsx`, `Archive.jsx`, or `Edition.jsx` in this phase. Existing/future paywall prompts on those pages link to `/subscribe` rather than each page growing its own checkout entry point.
- **D-09 (BILL-03, locked by REQUIREMENTS.md):** Stripe webhook events are verified via signature (`constructEvent` + `STRIPE_WEBHOOK_SECRET`) before being trusted — unsigned/tampered payloads rejected outright.
- **D-10 (BILL-04, locked by REQUIREMENTS.md):** Webhook handling is idempotent — reuses the existing `webhook_events` table (PK on `stripe_event_id`, Phase 1 D-10) as the dedupe mechanism; a duplicate delivery of the same event is a no-op.
- **D-11 (BILL-06, locked by REQUIREMENTS.md):** `invoice.payment_failed` updates the affected `subscriptions` row's `status` to reflect "past due" (mirroring Stripe's own status vocabulary verbatim per Phase 1 D-09) — no separate notification/email system, no user-facing UI for this in Phase 3.

### Claude's Discretion

- Exact Checkout Session creation endpoint path/naming (e.g. `/api/billing/checkout`) and whether it runs on Node or Edge runtime — same pattern precedent as Phase 2's OAuth routes.
- Exact set of Stripe webhook event types subscribed to beyond the ones named in requirements (`checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`) — standard Stripe subscription-lifecycle coverage, not a user-facing choice.
- How/whether an existing `users.stripe_customer_id` is reused vs. a new Stripe Customer created at Checkout time — technical detail, should reuse the existing column from Phase 1's schema.
- Exact poll interval/timeout and endpoint shape for D-06's "confirming…" state.
- Visual design of the reworked `/subscribe` product-picker UI (`UI hint: yes` in ROADMAP.md).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. Real Customer Portal management, invoice history, and past-due UI notices are correctly scoped to Phase 5 (ACCT-01 through ACCT-04), not deferred from this discussion — just out of this phase's boundary from the start.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BILL-01 | User can start a Stripe Checkout session for any of the 4 existing products from the relevant page | Checkout Session API shape documented below (Code Examples); server-side product→price allowlist pattern (Don't Hand-Roll, Security Domain) |
| BILL-02 | Checkout shows the real Stripe price for the selected product, not placeholder copy | D-02 price/interval verification is a **blocking open question** — see Open Questions; picker UI must read live price data, not `SITE.price` |
| BILL-03 | Stripe webhook events are verified via signature (`constructEvent` + webhook signing secret) before being trusted | Signature verification pattern + raw-body handling for this project's Web-Handler-style routes (Code Examples, Pitfall 1) |
| BILL-04 | Stripe webhook handler is idempotent | `webhook_events` PK + `INSERT ... ON CONFLICT DO NOTHING` pattern (Code Examples, Don't Hand-Roll) |
| BILL-05 | Subscription created/updated/deleted events synced into DB as single source of truth; Checkout success redirect never grants access alone | Webhook-driven `subscriptions` upsert (Code Examples); D-06 polling UI pattern; architecture diagram |
| BILL-06 | `invoice.payment_failed` reflected as "past due", not silently ignored | `invoice.payment_failed` handler pattern + Basil-era `invoice.parent.subscription_details.subscription` field location (Pitfall 2) |

</phase_requirements>

## Summary

This phase adds the project's first real money-movement code on top of an otherwise-static SPA, using patterns Phase 2 already proved out: server-initiated redirects (no client-side third-party SDK), Web-standard `fetch(request)` handler signatures for Vercel Node.js Functions, and a strict fail-closed style for anything touching identity or entitlement. Stripe's hosted Checkout (`mode: 'subscription'`) is the correct and already-locked tool for BILL-01/BILL-02 — it keeps the tight `script-src 'self'` CSP untouched because the browser is redirected via a `Location` header, not loading `checkout.js` or Stripe Elements client-side.

The two hardest parts of this phase are not the "happy path" (create a session, listen for a webhook) but (1) **linking a webhook event back to an internal user** when `customer.subscription.*` events carry only a Stripe customer ID, not your `users.id`, and (2) a **library-version trap**: Stripe's Basil API version (2025-03-31, and everything since, including the version stripe-node 22.x pins by default) removed `current_period_end`/`current_period_start` from the top-level Subscription object and moved them under `subscription.items.data[].current_period_end`, and separately moved `invoice.subscription` to `invoice.parent.subscription_details.subscription`. Since this project's Stripe account is only ~1 week old as of Phase 1 (per PROJECT.md), it is almost certainly already on a post-Basil API version, so every webhook payload this phase parses will have the new shape — training-knowledge code examples that reference `subscription.current_period_end` directly will silently write `NULL`/`undefined` into a `NOT NULL`-adjacent column. Both findings are detailed in Common Pitfalls and Code Examples below.

Idempotency (BILL-04) is a straightforward reuse of the existing `webhook_events(stripe_event_id PK)` table via `INSERT ... ON CONFLICT (stripe_event_id) DO NOTHING` — checking the resulting row count before running any business-effect code is the standard, DB-enforced (not application-logic-enforced) pattern, and matches Phase 1's already-provisioned schema exactly.

**Primary recommendation:** Install `stripe` (official `stripe-node`, verified npm package, ~18M downloads/week), create Checkout Sessions server-side with `subscription_data.metadata.userId` set (not just `client_reference_id`) so every subscription-lifecycle webhook can resolve the internal user without depending on event delivery order, and pin the reconciliation of price/interval facts (D-02) as the first execution-time task before writing any Checkout UI.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Product/price display on `/subscribe` | Browser/Client (React) | API/Backend (data source) | UI renders picker; actual price/interval values must come from a server-verified source, not baked-in `SITE.price` copy |
| Already-subscribed check per product | API/Backend | Browser/Client (render hint) | `subscriptions` table is DB source of truth (D-04); client render is a UX hint only, never trusted at click time |
| Checkout Session creation | API/Backend (Vercel Node Function) | — | Must run server-side only — requires `STRIPE_SECRET_KEY`, never shipped to client (ENV-01) |
| Webhook signature verification & sync | API/Backend (Vercel Node Function) | Database/Storage | `constructEvent` must run server-side with the raw body; writes are the only path that mutates `subscriptions` |
| Subscription state (source of truth) | Database/Storage | — | `subscriptions` table mirrors Stripe directly (Phase 1 D-07); no other tier may write to it |
| Checkout success "confirming…" UX | Browser/Client (polling) | API/Backend (status read) | Purely a UX affordance around D-07 — polling endpoint is a thin authenticated read of `subscriptions`, same shape as `api/auth/session.js` |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | 22.6.1 [VERIFIED: npm registry, published 2026-09-03] | Official Stripe Node SDK — Checkout Session creation, webhook signature verification (`stripe.webhooks.constructEvent`) | Official SDK maintained by Stripe (`github.com/stripe/stripe-node`); hand-rolling HMAC signature verification is explicitly the wrong move (see Don't Hand-Roll) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vercel/postgres` | 0.10.0 (already installed) | `subscriptions`/`webhook_events`/`users` writes | Already the project's only DB client (`lib/db.js`) — no new dependency needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Checkout (hosted) | Stripe.js + Elements (custom payment form) | Explicitly excluded by REQUIREMENTS.md Out of Scope ("Custom-built payment form (raw Stripe Elements)") — more PCI scope, requires loosening `script-src` CSP to load `js.stripe.com`, not worth it for this project |
| `webhook_events` table dedupe | In-process `Set` of seen event IDs | Does not survive across serverless invocations (each Vercel Function invocation is a fresh process) — silently reintroduces the exact duplicate-processing bug BILL-04 exists to prevent |

**Installation:**
```bash
npm install stripe
```

**Version verification:** `npm view stripe version` → `22.6.1`, published 2026-09-03 [VERIFIED: npm registry]. `npm view stripe repository.url` → `git+https://github.com/stripe/stripe-node.git` [VERIFIED: npm registry]. Confirm again at execution time in case a newer patch has shipped — this is an actively maintained package.

## Package Legitimacy Audit

> The `gsd-tools query package-legitimacy check` seam is not present in the installed gsd-tools version (`1.50.0-canary.0` at `get-shit-done/bin/gsd-tools.cjs` — no `query` subcommand exists; available commands do not include a legitimacy check). Manual equivalent verification was performed instead, per the ecosystem-specific fallback in the protocol.

| Package | Registry | Age | Downloads | Source Repo | Postinstall script | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------------------|---------|-------------|
| `stripe` | npm | Long-established (major SDK, v22 line; this exact 22.6.1 patch published 2026-09-03) | 18,069,705/week [VERIFIED: npm registry `api.npmjs.org/downloads`] | `github.com/stripe/stripe-node` [VERIFIED: npm registry `repository.url`] — official Stripe org | none (`npm view stripe scripts.postinstall` empty) [VERIFIED: npm registry] | OK | Approved |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

*The package name `stripe` itself was supplied directly in this phase's task brief (additional_context), not discovered via WebSearch/training-data guess, and its registry metadata (official GitHub org, huge download volume, no suspicious install scripts) corroborates it as the genuine official SDK — treat as `[VERIFIED: npm registry + github.com/stripe/stripe-node]`, not `[ASSUMED]`.*

## Architecture Patterns

### System Architecture Diagram

```text
Browser                         Vercel Node Functions (api/billing/*)          Stripe                  Postgres
───────                         ────────────────────────────────────          ──────                  ────────
GET /subscribe ────────────────▶ (page load, client fetches entitlement) ─────▶                 ─────▶ subscriptions
  picker renders 4 products         GET /api/billing/status                                             (per-product
  "Subscribed"/"Subscribe" per   ◀── { [productId]: status|null } ─────────────────────────────◀────── read only)
  product from server truth

Click "Subscribe" (product X) ──▶ GET /api/billing/checkout?product=X
                                    1. require session (401 if none)
                                    2. re-check no active sub for X (server truth,
                                       not the picker's rendered state — D-04)
                                    3. map X → Stripe price ID (server-side
                                       allowlist, never client-supplied)
                                    4. stripe.checkout.sessions.create({
                                         mode: 'subscription',
                                         customer: users.stripe_customer_id (if set),
                                         client_reference_id: userId,
                                         subscription_data: { metadata: { userId } },
                                         success_url, cancel_url })
                                    5. 302 Location → session.url ───────────────▶ checkout.stripe.com
                                                                                    (hosted page,
                                                                                     user pays)
                                                                          ◀── redirect back ──┘
                         ◀───────────────────────────────────────────────── success_url or cancel_url

/subscribe/success (poll) ─────▶ GET /api/billing/status?product=X
   "confirming…" until DB row      (same read as above; D-06/D-07 —
   appears, then unlocked view      redirect alone never flips this)

                                                                    Stripe async, independent of
                                                                    the browser redirect timing:
                                 POST /api/billing/webhook ◀──────────────── webhook events:
                                    1. rawBody = await request.text()          checkout.session.completed
                                    2. stripe.webhooks.constructEvent(          customer.subscription.created
                                       rawBody, sig, WEBHOOK_SECRET)           customer.subscription.updated
                                       → reject (400) if signature invalid     customer.subscription.deleted
                                    3. INSERT INTO webhook_events               invoice.payment_failed
                                       (stripe_event_id) VALUES (...)
                                       ON CONFLICT DO NOTHING
                                       → if 0 rows inserted: already
                                         processed, return 200 no-op (BILL-04)
                                    4. switch(event.type): upsert/patch ───────────────────────────▶ subscriptions
                                       `subscriptions` row (BILL-05, BILL-06)                          (only writer)
                                    5. return 200
```

### Recommended Project Structure
```
api/
├── billing/
│   ├── checkout.js       # GET — create Checkout Session, 302 redirect (mirrors api/auth/google.js)
│   ├── webhook.js        # POST — signature-verify + idempotent sync (mirrors api/auth/google/callback.js's fail-closed style)
│   └── status.js         # GET — authenticated read of subscriptions for polling/picker (mirrors api/auth/session.js)
lib/
├── stripe.js             # new — single `new Stripe(process.env.STRIPE_SECRET_KEY)` client instance, server-only
└── products.js           # new — server-side allowlist: internal product key → { stripeProductId, stripePriceId }
```

### Pattern 1: Server-side product→price allowlist (never trust a client-supplied price ID)
**What:** A small server-only map from an internal product key (`eclat-online`, `eclat-hardcopy`, `book-online`, `book-hardcopy`) to the verified Stripe product/price IDs.
**When to use:** Every place a Checkout Session is created. The client sends only the internal key (e.g. `?product=eclat-online`); the server resolves the real Stripe `price` ID from its own trusted map.
**Example:**
```javascript
// lib/products.js — server-only. Values marked TODO must be filled in from
// the D-02 verification task (Stripe Dashboard or `stripe prices list`)
// before this file is complete — see Open Questions.
export const PRODUCTS = {
  'eclat-online':     { productId: 'prod_VAyHWfX8XdHh2z', priceId: /* TODO: verify */ null },
  'eclat-hardcopy':   { productId: 'prod_VAyJTIfn7UVWi3', priceId: /* TODO: verify */ null },
  'book-online':      { productId: 'prod_VCuT7Wcy4yQDrc', priceId: /* TODO: verify */ null },
  'book-hardcopy':    { productId: 'prod_VCuJDGHg6vxcE6', priceId: /* TODO: verify */ null },
}
```
*(Source: pattern derived from Stripe's own Checkout guidance that `line_items[].price` must be a real Price ID resolved server-side — [CITED: docs.stripe.com/api/checkout/sessions/create]. Product IDs above are quoted verbatim from `.planning/PROJECT.md:57-60` [VERIFIED: .planning/PROJECT.md:57-60] — `"ÉCLAT magazine — Online: prod_VAyHWfX8XdHh2z"` etc. — but the corresponding Price IDs are not yet known; see Open Questions.)*

### Pattern 2: Checkout Session creation (server-initiated redirect, mirrors `api/auth/google.js`)
**What:** A GET endpoint that validates the session, resolves price via Pattern 1, creates the Checkout Session, and 302-redirects the browser directly to Stripe's hosted URL — no client-side fetch/JSON round-trip.
**When to use:** BILL-01/BILL-02.
**Example:**
```javascript
// api/billing/checkout.js — Vercel Node.js Function, Web Handler signature
// (same style as api/auth/google.js, verified in this codebase this session).
import { stripe } from '../../lib/stripe.js'
import { sql } from '../../lib/db.js'
import { parseCookies, hashToken } from '../../lib/session.js'
import { PRODUCTS } from '../../lib/products.js'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const key = url.searchParams.get('product')
    const product = PRODUCTS[key]
    if (!product) return new Response('Unknown product', { status: 400 })

    const cookies = parseCookies(request.headers.get('cookie'))
    if (!cookies.session) return Response.redirect(new URL('/api/auth/google?return_to=/subscribe', request.url), 302)

    const hash = hashToken(cookies.session)
    const { rows } = await sql`
      SELECT u.id, u.stripe_customer_id FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ${hash} AND s.expires_at > now()
    `
    if (!rows.length) return Response.redirect(new URL('/api/auth/google?return_to=/subscribe', request.url), 302)
    const user = rows[0]

    // D-04 server-side re-check: don't create a duplicate Checkout Session
    // for a product the user already actively holds.
    const { rows: existing } = await sql`
      SELECT 1 FROM subscriptions
      WHERE user_id = ${user.id} AND stripe_product_id = ${product.productId}
        AND status IN ('active', 'trialing', 'past_due')
    `
    if (existing.length) return Response.redirect(new URL('/account', request.url), 302)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: product.priceId, quantity: 1 }],
      customer: user.stripe_customer_id || undefined,
      client_reference_id: String(user.id),
      subscription_data: { metadata: { userId: String(user.id) } },
      success_url: `${new URL(request.url).origin}/subscribe/success?product=${key}`,
      cancel_url: `${new URL(request.url).origin}/subscribe`,
    })

    return Response.redirect(session.url, 302)
  },
}
```
*(API shape — `mode`, `line_items`, `client_reference_id`, `subscription_data.metadata`, `success_url`/`cancel_url` — [CITED: docs.stripe.com/api/checkout/sessions/create]. `client_reference_id` max length 200 chars, intended exactly for "reconcil[ing] the session with your internal systems" [CITED: docs.stripe.com/api/checkout/sessions/create]. `subscription_data.metadata` propagates onto the created Subscription object itself — the key reason to set it, see Pattern 3.)*

### Pattern 3: Reconciling a webhook event back to an internal user (the "hard part")
**What:** `customer.subscription.created/updated/deleted` events include a Stripe `customer` ID but **not** `client_reference_id` (that field only exists on Checkout Session objects). Two complementary mechanisms close this gap:
1. On `checkout.session.completed`, read `session.client_reference_id` to identify the user, and backfill `users.stripe_customer_id = session.customer` if it was still `NULL`.
2. Because `subscription_data.metadata.userId` was set at Checkout creation time (Pattern 2), every `customer.subscription.*` event's `subscription.metadata.userId` carries the internal user ID directly — this does **not** depend on `stripe_customer_id` already being populated, and does not depend on event delivery order (Stripe does not guarantee `checkout.session.completed` arrives before `customer.subscription.created`).
**When to use:** Every subscription-lifecycle webhook handler.
**Example:**
```javascript
// api/billing/webhook.js (excerpt) — resolving the user for a subscription event
case 'customer.subscription.created':
case 'customer.subscription.updated': {
  const sub = event.data.object
  const userId = sub.metadata?.userId // set via Pattern 2's subscription_data.metadata
  const item = sub.items.data[0] // see Pitfall 2 — current_period_end lives here, not on `sub`
  await sql`
    INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_customer_id, stripe_product_id, status, current_period_end)
    VALUES (${userId}, ${sub.id}, ${sub.customer}, ${item.price.product}, ${sub.status}, to_timestamp(${item.current_period_end}))
    ON CONFLICT (stripe_subscription_id) DO UPDATE SET
      status = EXCLUDED.status,
      current_period_end = EXCLUDED.current_period_end,
      updated_at = now()
  `
  break
}
```
*(Metadata-propagation behavior — "metadata set on `subscription_data` when creating a Checkout Session is copied to the resulting Subscription object" — [CITED: docs.stripe.com/api/checkout/sessions/create, subscription_data.metadata field description]. `sub.items.data[].current_period_end` location per Basil API version change — [CITED: docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end]. Schema columns `user_id`, `stripe_subscription_id`, `stripe_customer_id`, `stripe_product_id`, `status`, `current_period_end` quoted verbatim from `migrations/0001_init.sql:66-79` [VERIFIED: migrations/0001_init.sql:66-79] — `"CREATE TABLE IF NOT EXISTS subscriptions ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, stripe_subscription_id TEXT NOT NULL, stripe_customer_id TEXT, stripe_product_id TEXT NOT NULL, status TEXT NOT NULL, current_period_end TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now() );"` and the unique index `"CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_key ON subscriptions (stripe_subscription_id);"`.)*

### Pattern 4: Idempotent webhook dispatch (BILL-04)
**What:** Use the `webhook_events` table's primary key as an atomic, DB-enforced dedupe gate — check the insert's row count, not a prior `SELECT`.
**When to use:** First thing every webhook handler invocation does, before any business-effect code runs.
**Example:**
```javascript
// api/billing/webhook.js (excerpt)
const { rowCount } = await sql`
  INSERT INTO webhook_events (stripe_event_id) VALUES (${event.id})
  ON CONFLICT (stripe_event_id) DO NOTHING
`
if (rowCount === 0) {
  // Already processed (or a concurrent invocation is processing it right now) — no-op.
  return new Response(null, { status: 200 })
}
// ... proceed to switch(event.type) business logic ...
```
*(Pattern — "avoid SELECT then INSERT without locking — you will race" / use the unique constraint as the dedupe mechanism — [CITED: theroadtoenterprise.com/blog/stripe-webhook-idempotency-production; hookdeck.com/docs/guides/deduplication-guide]. Schema `webhook_events(stripe_event_id PK)` quoted verbatim from `migrations/0001_init.sql:84-87` [VERIFIED: migrations/0001_init.sql:84-87] — `"CREATE TABLE IF NOT EXISTS webhook_events ( stripe_event_id TEXT PRIMARY KEY, processed_at TIMESTAMPTZ NOT NULL DEFAULT now() );"`.)*

### Anti-Patterns to Avoid
- **Trusting the Checkout success redirect (`success_url`) to grant access:** explicitly forbidden by BILL-05/D-07 — a user can reach `success_url` by guessing/bookmarking it without ever completing payment. Only a webhook-synced `subscriptions` row counts.
- **Accepting a client-supplied `price` or `product` ID at Checkout-creation time:** always resolve through the server-side allowlist (Pattern 1) — an unvalidated client-supplied price ID is a direct "pay whatever the attacker picks" vector.
- **Reading `subscription.current_period_end` directly:** removed from the top-level Subscription object in Basil (2025-03-31) and every version since — see Pitfall 2.
- **In-memory/global dedupe of webhook event IDs:** each Vercel Function invocation is a fresh process; only a durable store (the `webhook_events` table) survives across invocations and retries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Webhook authenticity | Custom HMAC-SHA256 comparison of a signature header | `stripe.webhooks.constructEvent(rawBody, sig, secret)` | The official SDK handles constant-time comparison, timestamp-tolerance replay protection, and multi-signature header parsing (Stripe rotates signing secrets and sends multiple `v1=` values during rotation) — [CITED: docs.stripe.com/webhooks/signature] |
| Webhook dedupe | Custom in-memory cache / "have I seen this event" logic in application code | `webhook_events` table PK + `INSERT ... ON CONFLICT DO NOTHING` | DB-level uniqueness constraint is race-safe across concurrent serverless invocations; in-process caches are not (see Anti-Patterns) |
| Subscription status vocabulary | A custom internal enum translating Stripe's states | Store `subscription.status` verbatim (`active`, `past_due`, `canceled`, `trialing`, `incomplete`, `incomplete_expired`, `unpaid`, `paused`) | Already locked as Phase 1 D-09; a translation layer is one more place to get out of sync with Stripe's actual behavior |
| Payment form / PCI scope | Any custom card-input UI, even calling Stripe.js under the hood | Stripe Checkout (hosted) | Explicitly out of scope per REQUIREMENTS.md; hosted Checkout offloads PCI SAQ A scope entirely |

**Key insight:** Everything money- or identity-adjacent in this phase (signature verification, dedupe, status vocabulary) already has a battle-tested, DB- or SDK-enforced answer. The only genuinely custom code this phase should write is the *mapping* between Stripe's world (customer/subscription/product IDs) and this project's world (`users.id`, `stripe_product_id` as an entitlement key) — Pattern 1 and Pattern 3 above.

## Common Pitfalls

### Pitfall 1: Body-parsing breaks signature verification
**What goes wrong:** `stripe.webhooks.constructEvent()` fails with a signature-verification error if the body it receives has been touched (re-serialized, whitespace-normalized) by any JSON parsing step before verification.
**Why it happens:** Stripe signs the exact raw bytes it sent; any parse-then-`JSON.stringify()` round-trip can change byte-for-byte formatting (key order, whitespace) even if the data is semantically identical.
**How to avoid:** This project's API routes already use the Web Handler signature (`export default { async fetch(request) {...} }`, confirmed in `api/auth/google.js`, `api/auth/google/callback.js`, `api/auth/session.js` this session [VERIFIED: api/auth/google.js:15-17, api/auth/session.js:21-22]) rather than an Express-style `(req, res)` handler with body-parsing middleware — this sidesteps the entire class of Express/Next.js `bodyParser` gotchas that dominate Stripe+Vercel search results. Call `const rawBody = await request.text()` and pass that string directly to `constructEvent`. Do **not** call `request.json()` first and re-stringify.
**Warning signs:** Signature verification fails only in production/deployed environments, or fails intermittently — a common symptom of an accidental parse-then-restringify step somewhere in the request pipeline.

### Pitfall 2: Basil API version moved fields webhook handlers rely on
**What goes wrong:** Code that reads `subscription.current_period_end` or `invoice.subscription` directly gets `undefined`, silently writing `NULL` into the `subscriptions.current_period_end` column and failing to resolve the subscription for a failed-payment event.
**Why it happens:** Stripe's Basil API version (2025-03-31) removed `current_period_start`/`current_period_end`/`billing_thresholds` from the top-level Subscription object, moving the period fields to `subscription.items.data[].current_period_end` (per-item billing periods) [CITED: docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end]. Similarly, `invoice.subscription` is superseded by `invoice.parent.subscription_details.subscription` for API version 2025-03-31+ [CITED: docs.stripe.com search result summarizing docs.stripe.com/invoicing webhook guidance — verify exact field name against the live account's actual webhook payload during execution]. `stripe-node` 22.x pins a default API version well past Basil (a 2026-dated version per its `apiVersion.ts`) [CITED: WebSearch of stripe-node CHANGELOG.md/apiVersion.ts], and per PROJECT.md this Stripe account is only ~1 week old as of Phase 1 (2026-09-08) [VERIFIED: .planning/PROJECT.md:62] — new accounts default to the latest API version at creation time, so this account is almost certainly already on a post-Basil version regardless of which stripe-node version this phase installs.
**How to avoid:** For every `customer.subscription.*` handler, read `sub.items.data[0].current_period_end` (Pattern 3 above), not `sub.current_period_end`. For `invoice.payment_failed`, inspect the actual received payload's shape during execution (log `JSON.stringify(event.data.object, null, 2)` once against a real test-mode event) before assuming a field path — do not hand-write the invoice→subscription lookup path from training-knowledge alone, since this exact field was relocated recently and multiple naming schemes have circulated in blog posts.
**Warning signs:** `current_period_end` column stays `NULL` after a successful subscription creation; `invoice.payment_failed` handler can't find a matching `subscriptions` row to mark past-due.

### Pitfall 3: Event delivery order is not guaranteed
**What goes wrong:** A handler that assumes `checkout.session.completed` always arrives before `customer.subscription.created` (e.g. to look up a user via `stripe_customer_id`, which is only backfilled by the checkout-session handler) intermittently fails to attribute the subscription to a user.
**Why it happens:** Stripe explicitly does not guarantee webhook delivery order between related events.
**How to avoid:** Pattern 3's `subscription_data.metadata.userId` mechanism makes every `customer.subscription.*` event self-sufficient for user resolution — it never needs `stripe_customer_id` to already be populated.
**Warning signs:** Subscriptions occasionally created with a `NULL`/missing `user_id`, correlating with load or retry timing rather than a specific product.

### Pitfall 4: CSP does not need loosening for this phase, but is easy to over-correct
**What goes wrong:** Assuming the hosted-Checkout redirect requires a CSP change (e.g. adding `checkout.stripe.com` to `connect-src` or `form-action`) and loosening the policy unnecessarily.
**Why it happens:** The existing CSP (`connect-src 'self'`, `form-action 'self'`) [VERIFIED: vercel.json:24] looks like it should block a cross-origin destination, but a server-issued `302 Location` redirect is a full top-level navigation, not a `fetch`/XHR (`connect-src`) or an HTML `<form action>` submission (`form-action`) — neither directive restricts where a `Location` header can point.
**How to avoid:** Confirm during planning that no CSP directive change is needed for BILL-01 — this is already proven by the working, deployed Phase 2 Google OAuth redirect (`api/auth/google.js` redirects to `accounts.google.com` under this exact same CSP with no reported issues, per git history showing Phase 2 as complete and deployed). The success/cancel-URL return and the D-06 polling call are same-origin and already covered by `connect-src 'self'`.
**Warning signs:** A plan task proposing to edit `vercel.json`'s CSP for this phase should be treated as a red flag requiring justification.

## Code Examples

### Complete webhook dispatcher skeleton
```javascript
// api/billing/webhook.js
import { stripe } from '../../lib/stripe.js'
import { sql } from '../../lib/db.js'

export default {
  async fetch(request) {
    const rawBody = await request.text()
    const signature = request.headers.get('stripe-signature')

    let event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } catch {
      // Signature invalid/missing — reject outright (BILL-03). Never parse
      // rawBody as JSON before this check succeeds.
      return new Response('Invalid signature', { status: 400 })
    }

    const { rowCount } = await sql`
      INSERT INTO webhook_events (stripe_event_id) VALUES (${event.id})
      ON CONFLICT (stripe_event_id) DO NOTHING
    `
    if (rowCount === 0) return new Response(null, { status: 200 }) // BILL-04 no-op

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object
          if (session.customer && session.client_reference_id) {
            await sql`
              UPDATE users SET stripe_customer_id = ${session.customer}
              WHERE id = ${session.client_reference_id} AND stripe_customer_id IS NULL
            `
          }
          break
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object
          const item = sub.items.data[0]
          await sql`
            INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_customer_id, stripe_product_id, status, current_period_end)
            VALUES (${sub.metadata.userId}, ${sub.id}, ${sub.customer}, ${item.price.product}, ${sub.status}, to_timestamp(${item.current_period_end}))
            ON CONFLICT (stripe_subscription_id) DO UPDATE SET
              status = EXCLUDED.status, current_period_end = EXCLUDED.current_period_end, updated_at = now()
          `
          break
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object
          await sql`UPDATE subscriptions SET status = ${sub.status}, updated_at = now() WHERE stripe_subscription_id = ${sub.id}`
          break
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object
          // Field location must be confirmed against a real captured payload
          // at execution time (Pitfall 2) — this is the Basil-era path.
          const subId = invoice.parent?.subscription_details?.subscription
          if (subId) {
            await sql`UPDATE subscriptions SET status = 'past_due', updated_at = now() WHERE stripe_subscription_id = ${subId}`
          }
          break
        }
      }
    } catch (err) {
      // A business-logic failure after the event is already marked processed
      // should not crash the function into a 5xx that makes Stripe retry
      // (retrying would re-hit the ON CONFLICT no-op and never fix itself) —
      // log for manual investigation instead. Exact strategy (dead-letter,
      // alerting) is a planning-time decision.
      return new Response(null, { status: 200 })
    }

    return new Response(null, { status: 200 })
  },
}
```
*(Event type list — `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed` — copied verbatim from `.planning/REQUIREMENTS.md:26-31` [VERIFIED: .planning/REQUIREMENTS.md:26-31] and CONTEXT.md D-09/D-10/D-11.)*

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `subscription.current_period_end` (top-level) | `subscription.items.data[].current_period_end` (per-item) | Basil API version, 2025-03-31 | Any webhook handler code from pre-2025 tutorials/blog posts will silently break — see Pitfall 2 |
| `invoice.subscription` (top-level) | `invoice.parent.subscription_details.subscription` | Basil-era invoice restructuring, 2025-03-31+ | `invoice.payment_failed` handlers copied from older examples will fail to resolve the subscription — see Pitfall 2 |

**Deprecated/outdated:**
- Any Stripe integration tutorial referencing `subscription.current_period_end` directly should be treated as stale for a new (2026-created) Stripe account/API-version pairing.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `invoice.payment_failed` webhook's subscription reference is at `invoice.parent.subscription_details.subscription` for this account's (post-Basil) API version | Pitfall 2, Code Examples | If the actual field path differs (e.g. account is pinned to an older API version than assumed), the past-due handler silently fails to find the subscription row — BILL-06 breaks silently. **Must be confirmed against a real captured test-mode event during execution**, not assumed from research. |
| A2 | The 4 Stripe products each have exactly one recurring Price (no separate monthly/annual variants) — informing the `PRODUCTS` allowlist shape in Pattern 1 | D-02, Pattern 1, Standard Stack | If a product actually has multiple active prices (e.g. monthly + annual), the Checkout UI needs an interval selector per product and the allowlist needs a price-per-interval shape instead of one price per product key — this changes the `/subscribe` picker's UI shape, which is explicitly flagged `UI hint: yes`. This is the single highest-impact unresolved item in this research — see Open Questions. |
| A3 | An "already subscribed" check (D-04) should treat `status IN ('active', 'trialing', 'past_due')` as "has this product" (shows "Subscribed"/manage link) rather than only `'active'` | Pattern 2 (server-side re-check) | If `past_due` should instead still show as purchasable (allowing a second subscription to the same product while the first is past-due), duplicate subscriptions to the same product become possible — contradicts D-04's stated intent to "structurally prevent duplicate Checkout sessions" |
| A4 | `.env.example` can be edited during this phase's execution to document `STRIPE_WEBHOOK_SECRET` (mirroring the existing `STRIPE_SECRET_KEY` documentation pattern) | Existing Config (canonical_refs) | This session's sandbox blocked reading `.env.local` and `.env.example` with a deny rule identical to the one that blocked WR-07 in Phase 2's review-fix pass (per `.planning/STATE.md` Blockers/Concerns). If the execution agent hits the same restriction, this documentation step may need to be deferred or done manually outside the agent session — low risk (cosmetic), but should not be assumed trivially completable. |

**If this table is empty:** N/A — see rows above.

## Open Questions

1. **Real Price IDs and billing intervals for the 4 products (D-02) — BLOCKING**
   - What we know: The 4 Stripe Product IDs are confirmed (`.planning/PROJECT.md:57-60` [VERIFIED]). The current `/subscribe` UI shows placeholder pricing (`SITE.price = { monthly: 9, annual: 84 }`, `src/data/content.js:15` [VERIFIED: src/data/content.js:15] — `"price: { monthly: 9, annual: 84 },"`) unrelated to real Stripe prices.
   - What's unclear: Whether each product has one fixed recurring Price, or separate monthly/annual Price objects; the actual Price IDs needed for `line_items[].price` in Checkout Session creation.
   - Why this session couldn't resolve it: `.env.local` (which would contain `STRIPE_SECRET_KEY`) is blocked by a sandbox deny rule in this environment (attempted once this session, blocked; per the phase brief's own instruction, no workaround was attempted). No `stripe` or `vercel` CLI is installed locally (confirmed via `command -v stripe`/`command -v vercel`, both empty) to query the live account another way.
   - Recommendation: This must be the **first execution-time task** in Phase 3's plan, gated as a `checkpoint:human-verify` or run in an environment/agent with legitimate access to `STRIPE_SECRET_KEY` (e.g. `vercel env pull` then `node -e "..."` calling `stripe.prices.list({product: 'prod_...', active: true})` for each of the 4 products, or checking the Stripe Dashboard directly). The Checkout UI shape (single button vs. monthly/annual toggle per product) cannot be finalized before this returns.

2. **Exact `invoice.payment_failed` → subscription field path for this account's actual API version**
   - What we know: Basil (2025-03-31) and later move this to `invoice.parent.subscription_details.subscription`; older versions used `invoice.subscription` directly.
   - What's unclear: Which exact API version this Stripe account is configured to send webhooks at (account default API version, set at account creation and independently overridable per webhook endpoint in the Stripe Dashboard).
   - Recommendation: Log and inspect one real `invoice.payment_failed` test-mode event's full JSON payload during execution before finalizing this handler — do not trust either field path from research alone (Assumption A1).

3. **Should a `stripe_price_id` column be added to `subscriptions`?**
   - What we know: The current schema (`migrations/0001_init.sql`) only has `stripe_product_id`, sufficient for GATE-03's per-product entitlement check.
   - What's unclear: Whether Account-page display (Phase 5, out of this phase's scope) or this phase's own picker copy ("Monthly" vs "Annual" badge) needs the specific Price ID/interval persisted, or whether it can always be re-fetched live from Stripe when needed.
   - Recommendation: Defer to planning once Open Question 1 resolves whether multiple prices per product even exist; if they do, a migration (`migrations/0002_...sql`, following the established idempotent `IF NOT EXISTS` convention) adding `stripe_price_id TEXT` to `subscriptions` is the likely answer.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All server routes | ✓ | v22.15.0 (satisfies `package.json` `engines.node: >=20.6.0`) | — |
| npm | Installing `stripe` | ✓ | 10.9.2 | — |
| `@vercel/postgres` (existing) | All DB writes | ✓ (already a dependency) | 0.10.0 | — |
| Stripe CLI (`stripe listen`, local webhook forwarding/testing) | Local webhook-handler testing during execution | ✗ (not installed, `command -v stripe` empty) | — | Use the Stripe Dashboard's "Send test webhook" feature against a deployed Vercel preview URL, or install the Stripe CLI at execution time (`npm install -g` or platform installer — not attempted this session, out of scope for research) |
| Vercel CLI | `vercel env pull` (needed for Open Question 1) | ✗ (not installed, `command -v vercel` empty) | — | Query Stripe Dashboard UI directly for price IDs/intervals if CLI installation isn't desired |
| `STRIPE_WEBHOOK_SECRET` env var | BILL-03 signature verification | ✗ (does not exist yet — must be created after registering the webhook endpoint URL in the Stripe Dashboard, same "provision and confirm env var" checkpoint pattern as Phase 1 D-02) | — | None — this is a hard blocker for BILL-03/BILL-04 until the webhook endpoint is registered and its signing secret is added to Vercel env vars |

**Missing dependencies with no fallback:**
- `STRIPE_WEBHOOK_SECRET` must be provisioned (new Stripe Dashboard webhook endpoint registration + env var) before webhook signature verification can be implemented or tested end-to-end.

**Missing dependencies with fallback:**
- Stripe CLI / local webhook testing — Dashboard-based test-event sending against a deployed preview URL is a viable substitute.
- Vercel CLI — Dashboard UI lookup is a viable substitute for the one-time price ID verification task.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | yes (reused, not re-implemented) | Existing `sessions`/`api/auth/session.js` DB-backed session check (Phase 2) — every billing route requires a valid, unexpired session before acting |
| V3 Session Management | yes (reused) | Same opaque-hashed-token session cookie scheme as Phase 2; no new session mechanism introduced |
| V4 Access Control | yes | Server-side re-check of existing active subscription before creating a new Checkout Session (D-04); webhook handler is the *only* writer to `subscriptions` — no client-reachable code path can write entitlement directly |
| V5 Input Validation | yes | Server-side product→price allowlist (Pattern 1) — a client-supplied product/price identifier is never passed directly to `stripe.checkout.sessions.create`; webhook payload is only trusted after `constructEvent` succeeds |
| V6 Cryptography | yes | `stripe.webhooks.constructEvent` (HMAC-SHA256 signature check + timestamp-tolerance replay protection) — never hand-rolled (see Don't Hand-Roll) |

### Known Threat Patterns for Stripe Checkout + Webhooks

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Forged webhook payload (attacker POSTs a fake "subscription active" event) | Spoofing / Tampering | `constructEvent` signature verification (BILL-03) — reject any payload whose signature doesn't match `STRIPE_WEBHOOK_SECRET` |
| Replayed old (previously valid) webhook payload captured by an attacker | Repudiation / Tampering | `constructEvent`'s built-in timestamp-tolerance check (default 5 minutes) rejects stale signed payloads; `webhook_events` PK dedupe independently prevents any *processed* event from re-applying its effect even if replayed within tolerance (BILL-04) |
| Client sends an arbitrary/cheaper Stripe Price ID to the checkout-creation endpoint | Tampering / Elevation of Privilege | Server-side product→price allowlist (Pattern 1) — the endpoint only ever accepts an internal product *key*, never a raw Stripe ID, from the client |
| Client bookmarks/guesses the Checkout `success_url` without paying, expecting access | Elevation of Privilege | BILL-05/D-07 — access is granted only by a webhook-synced `subscriptions` row, never by reaching `success_url` |
| Stripe secret key or webhook signing secret leaked to client bundle | Information Disclosure | Both live only in `process.env` inside Vercel Node Functions (never imported by anything under `src/`) — same pattern as `lib/db.js`'s `POSTGRES_URL` guard; existing build-time secret-leak scanner (`scripts/check-secrets.js`, Phase 1) should be checked at execution time for whether it needs the two new env var names added to its scan list |

## Sources

### Primary (HIGH confidence)
- `npm view stripe version` / `repository.url` / `scripts.postinstall` — this session, direct registry query [VERIFIED: npm registry]
- `api.npmjs.org/downloads/point/last-week/stripe` — this session, direct registry query [VERIFIED: npm registry]
- `migrations/0001_init.sql` (read this session, lines 25-37, 66-79, 84-87) [VERIFIED: migrations/0001_init.sql]
- `api/auth/google.js`, `api/auth/google/callback.js`, `api/auth/session.js`, `lib/session.js`, `lib/db.js`, `middleware.js` (read this session) [VERIFIED: in-repo]
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/phases/03-.../03-CONTEXT.md` (read this session) [VERIFIED: in-repo]

### Secondary (MEDIUM confidence)
- docs.stripe.com/api/checkout/sessions/create (Checkout Session creation shape, `client_reference_id`, `subscription_data.metadata`) [CITED]
- docs.stripe.com/webhooks/signature (signature verification requirements, raw body) [CITED]
- docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end [CITED]
- hookdeck.com/docs/guides/deduplication-guide, theroadtoenterprise.com/blog/stripe-webhook-idempotency-production (idempotency pattern via unique DB constraint) [CITED]

### Tertiary (LOW confidence)
- Blog-post summaries of `invoice.parent.subscription_details.subscription` field relocation — not independently confirmed against Stripe's own current API reference page in this session; flagged as Assumption A1 and Open Question 2, must be confirmed against a real captured payload during execution
- stripe-node's exact currently-pinned default API version string (e.g. "2026-01-28.clover") — summarized from WebSearch of the package's changelog/apiVersion file, not read directly; irrelevant to correctness as long as the execution-time code reads the actual received payload shape rather than assuming a specific version string

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `stripe` package identity/legitimacy independently verified via npm registry this session; Checkout/webhook API shapes are stable, well-documented patterns
- Architecture: HIGH — directly extends Phase 2's already-proven server-initiated-redirect and fail-closed patterns in this exact codebase
- Pitfalls: MEDIUM — the Basil field-relocation pitfall is well-documented externally but not independently confirmed against this specific Stripe account's actual configured API version (blocked by sandboxed `.env.local` access); real price/interval data (D-02) remains fully unverified

**Research date:** 2026-09-09
**Valid until:** 2026-10-09 (30 days) — shorter if Stripe ships another API version change before then; re-verify Pitfall 2's exact field paths against a real captured webhook payload regardless of this window, since that is an execution-time verification step, not a time-decay concern
