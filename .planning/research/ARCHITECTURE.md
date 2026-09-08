# Architecture Research

**Domain:** Adding auth (Google OAuth) + sessions + database + Stripe billing to an existing prerendered Vite/React SPA, deployed on Vercel
**Researched:** 2026-09-08
**Confidence:** MEDIUM (patterns cross-checked against Vercel, Google, Stripe, and Neon official docs; no single canonical "prerendered-SPA-plus-Vercel-functions-plus-billing" reference architecture exists, so the synthesis below is reasoned from verified component-level facts rather than copied from one source)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BUILD TIME (unchanged) — npm run build                                 │
│  vite build → vite build --ssr → prerender.js walks public routes only  │
│  writes dist/<route>/index.html (public marketing pages + free excerpts)│
└──────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  VERCEL PROJECT (two artifact types, one deploy)                        │
│  ┌───────────────────────────┐   ┌────────────────────────────────────┐│
│  │ STATIC (dist/)             │   │ SERVERLESS FUNCTIONS (/api/*)      ││
│  │ CDN-served, no per-request │   │ Node.js runtime, cold-started      ││
│  │ compute. Prerendered HTML  │   │ per request. NEW in this milestone ││
│  │ for /, /archive, /books,   │   │ — this is where all secrets,       ││
│  │ /writings, /editions/:no   │   │ sessions, DB, and Stripe/Google    ││
│  │ (excerpt shell only)       │   │ calls live.                        ││
│  └───────────────────────────┘   └──────────────────┬─────────────────┘│
│  vercel.json rewrite: everything except /api/* falls back to index.html │
└──────────────────────────────────┬────────────────────┼────────────────┘
                                    ▼                    ▼
┌─────────────────────────────┐   ┌───────────────────────────────────────┐
│ BROWSER                       │   │ EXTERNAL SERVICES                    │
│ Hydrates prerendered shell    │   │ - Google OAuth (Authorization Code)  │
│ (unchanged). Post-hydration,  │──▶│ - Stripe (Checkout, Billing Portal,  │
│ gated regions fetch from       │   │   Webhooks)                          │
│ /api/* with credentials        │   └───────────────────────────────────────┘
│ (session cookie) to render     │
│ real per-user state.           │              ┌──────────────────────────┐
└─────────────────────────────┘              │ DATABASE (Neon Postgres) │
                                               │ users, stripe_customers, │
                                               │ subscriptions,           │
                                               │ processed_stripe_events  │
                                               └──────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Static prerendered shell | Public marketing pages + free excerpts, SEO, first paint | Unchanged `prerender.js` + `src/entry-server.jsx` output in `dist/` |
| Frontend SPA (post-hydration) | Renders gated/dynamic regions by calling `/api/*` with the session cookie; owns "am I signed in / what do I see" client state | React Router SPA (existing) + new `src/api/*.js` fetch wrapper replacing `store.jsx`'s fake `subscribed` flag |
| Auth functions | Google Authorization Code exchange, ID token verification, session cookie issuance | `/api/auth/google/login`, `/api/auth/google/callback`, `/api/auth/logout` — `google-auth-library` OAuth2Client |
| Session layer | Stateless, signed httpOnly cookie carrying only a user id (no entitlement baked in) | `iron-session` (or equivalent signed-cookie helper), shared `_lib/session.js` |
| Billing functions | Create Stripe Checkout Sessions and Billing Portal Sessions for the signed-in user | `/api/checkout`, `/api/billing-portal` — `stripe` Node SDK, server-side secret key only |
| Webhook function | Signature-verified, idempotent ingestion of Stripe subscription lifecycle events into the DB | `/api/stripe/webhook` — raw-body read + `stripe.webhooks.constructEvent` |
| Entitlement/content functions | Per-request, server-side resolution of "does this session's user have an active subscription that unlocks this content" | `/api/me`, `/api/content/:type/:slug` — DB read of `subscriptions`, never trusts client or cookie payload |
| Database | Source of truth for identity + a *cache* of Stripe's subscription state (Stripe itself remains authoritative for billing facts) | Neon Postgres, accessed via `@neondatabase/serverless` HTTP driver from serverless functions |

## Recommended Project Structure

```
Éclat/
├── src/
│   ├── api/                    # NEW — thin fetch wrappers the SPA calls at runtime
│   │   ├── auth.js             # getSession(), signOut()
│   │   ├── checkout.js         # startCheckout(priceId), openBillingPortal()
│   │   └── content.js          # fetchGatedContent(type, slug)
│   ├── routes/                 # existing — Edition/Books/Account now fetch from src/api/
│   ├── store.jsx               # existing — subscribed/plan fields replaced by
│   │                           #   { user, entitlements, loading } populated from /api/me
│   ├── data/content.js         # existing — keeps ONLY public metadata + free excerpts;
│   │                           #   full gated text moves out of this bundled file
│   └── ...                     # entry-client/server, prerender.js unchanged
├── api/                        # NEW — Vercel serverless functions (repo root, per Vercel convention)
│   ├── auth/
│   │   ├── google/
│   │   │   ├── login.js        # redirects to Google's OAuth consent URL
│   │   │   └── callback.js     # exchanges code, verifies, upserts user, sets session cookie
│   │   └── logout.js           # clears session cookie
│   ├── checkout.js             # creates a Stripe Checkout Session for one of the 4 products
│   ├── billing-portal.js       # creates a Stripe Billing Portal Session
│   ├── stripe/
│   │   └── webhook.js          # signature-verified, idempotent event handler
│   ├── me.js                   # returns { user, entitlements } for the current session
│   ├── content/
│   │   └── [type]/[slug].js    # returns full content only if entitled, else 403/teaser
│   └── _lib/                   # shared, not deployed as routes (Vercel ignores `_`-prefixed dirs)
│       ├── db.js                # Neon client singleton (HTTP driver)
│       ├── session.js            # iron-session config + get/set helpers
│       ├── stripe.js               # stripe-node client singleton
│       ├── google.js                # OAuth2Client singleton
│       └── entitlements.js           # PRODUCT_ID → content-scope mapping (the 4 known product IDs)
├── prerender.js                # unchanged — still only walks public/free routes
└── vercel.json                 # updated: rewrite so /api/* bypasses SPA fallback; CSP updates (minimal — see below)
```

### Structure Rationale

- **`api/` at repo root, not `src/api/`:** Vercel's zero-config convention deploys anything under root-level `api/` as serverless functions; this is a hard platform requirement, not a style choice. `src/api/` is a separate, client-side concern (fetch wrappers bundled into the SPA) and must not be confused with the server-side `api/` directory.
- **`api/_lib/`:** Vercel does not deploy directories/files prefixed with `_` as routes, making it the idiomatic place for shared server-only modules (DB client, session helpers, SDK singletons) reused across multiple function files without each becoming its own route.
- **`src/data/content.js` split:** keeps its current role for anything that must be public (titles, dates, cover art, free excerpts, SEO copy) so `prerender.js` and public routes need no structural change. Full paywalled text/pages move to the database and are served exclusively through `api/content/[type]/[slug].js` — this directly fixes the existing anti-pattern where the full excerpt already ships in the bundle regardless of subscription state.

## Architectural Patterns

### Pattern 1: Server-initiated redirect flows for both OAuth and billing (no client-side Google/Stripe SDKs)

**What:** Use the Google OAuth **Authorization Code** flow (link/redirect to Google's consent screen → server-side callback exchanges the code) instead of Google Identity Services' client-side token/One Tap flow. Similarly, create Stripe Checkout Sessions and Billing Portal Sessions server-side and simply navigate the browser to the returned `url` — never load `js.stripe.com` client-side.
**When to use:** Always, for this project. There is no product requirement for One Tap or embedded Stripe Elements (Checkout is Stripe-hosted).
**Trade-offs:** Slightly more clicks (full-page redirect instead of an in-page popup/button), but it means **no new script-src/frame-src CSP entries are required for either provider** — a plain top-level navigation (`window.location.href = ...` or an `<a href>`) is not governed by CSP script-src at all. This directly de-risks the "CSP will need loosening" concern flagged in the existing codebase architecture doc — with this pattern, that loosening becomes near-zero instead of a wholesale relaxation.

**Example:**
```js
// api/auth/google/login.js
export default function handler(req, res) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', `${process.env.SITE_URL}/api/auth/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', generateAndStoreCsrfState(req, res)); // double-submit cookie
  res.writeHead(302, { Location: url.toString() });
  res.end();
}
```

### Pattern 2: Stateless identity cookie, live DB entitlement check per gated request

**What:** The session cookie (via `iron-session` or equivalent) carries only a stable user id — never subscription status. Every request for gated content re-reads current entitlement from the `subscriptions` table.
**When to use:** Always, for any route/endpoint serving paid content or billing data.
**Trade-offs:** One extra DB read per gated request vs. a JWT with baked-in claims — but it is the only way to satisfy the explicit requirement "losing/cancelling a subscription immediately revokes access to gated content on the next request." A cached/TTL'd claim in a cookie would mean up to TTL minutes of stale access after cancellation.

**Example:**
```js
// api/_lib/entitlements.js
export async function hasActiveEntitlement(userId, contentType) {
  const rows = await sql`
    SELECT s.status, s.stripe_product_id FROM subscriptions s
    WHERE s.user_id = ${userId} AND s.status IN ('active', 'trialing')`;
  return rows.some(r => PRODUCT_SCOPE[r.stripe_product_id] === contentType);
}
```

### Pattern 3: Stripe webhook as the single writer of subscription state, idempotent by event id

**What:** `api/stripe/webhook.js` is the *only* code path that writes to `subscriptions`. Client-triggered flows (`checkout.js`, `billing-portal.js`) only ever *read* or *initiate* — they never optimistically write subscription status themselves. Every processed event id is inserted into `processed_stripe_events` under a unique constraint; a constraint violation means "already handled," and the handler returns `200` immediately without reprocessing.
**When to use:** All Stripe subscription lifecycle events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, etc.).
**Trade-offs:** Slight latency between a Stripe action and DB reflecting it (webhook delivery time, typically sub-second to a few seconds) — acceptable for a subscription product; the alternative (trusting client-side "payment succeeded" callbacks) is exactly the class of bug this milestone exists to eliminate.

## Data Flow

### Sign-in flow

```
[User clicks "Sign in with Google"]
    ↓ full-page navigation, no CSP impact
[api/auth/google/login.js] → redirect to accounts.google.com consent screen
    ↓ user approves
[Google redirects to api/auth/google/callback.js?code=...&state=...]
    ↓ verify CSRF state, exchange code for tokens (google-auth-library OAuth2Client)
    ↓ verify ID token, extract `sub` (never email) as stable identity
[DB] upsert users row keyed on google_sub
    ↓
[Set httpOnly, secure, sameSite session cookie] (iron-session; payload = { userId })
    ↓ redirect back into the SPA
[Browser] SPA calls GET /api/me on mount → populates store.jsx with real user/entitlement state
```

### Checkout flow

```
[Signed-in user clicks "Subscribe" on one of the 4 products]
    ↓
[POST /api/checkout { priceId }] — requires valid session
    ↓ server creates/reuses stripe_customers row, calls stripe.checkout.sessions.create()
[Stripe] returns Checkout Session URL
    ↓
[Browser navigates to Stripe-hosted checkout] → user pays
    ↓
[Stripe redirects to success_url on the SPA] (UI shows "processing" — NOT "subscribed",
    since the webhook, not this redirect, is what confirms and persists entitlement)
```

### Webhook-driven entitlement sync (the authoritative path)

```
[Stripe] checkout.session.completed / customer.subscription.updated / .deleted
    ↓ POST to api/stripe/webhook.js (raw body preserved — see Anti-Pattern 4)
[Verify signature] stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    ↓
[INSERT processed_stripe_events(event_id) ON CONFLICT DO NOTHING]
    → conflict? already processed → return 200 immediately
    → inserted? continue
    ↓
[Resolve stripe_customer_id → user_id] (from stripe_customers table)
[UPSERT subscriptions row] status/product/price/current_period_end from the (re-fetched,
    not payload-trusted) live Stripe subscription object
    ↓ return 200 within Stripe's timeout window
```

### Entitlement check (every gated request, the enforcement point)

```
[Browser] fetch('/api/content/editions/12', { credentials: 'include' })
    ↓
[api/content/[type]/[slug].js] read session cookie → userId
    ↓ hasActiveEntitlement(userId, 'edition') — live DB read, every time
    → true  → return full content JSON
    → false → return teaser/excerpt + 200 (or 403 if the route is strictly gated)
```

### Key Data Flows

1. **Identity is established once (sign-in), entitlement is checked on every gated request** — these are deliberately separate concerns with separate data: the session cookie never expresses "what am I allowed to see," only "who am I."
2. **Stripe webhooks are the only path that mutates `subscriptions`** — Checkout/Billing Portal redirects only *initiate* state changes at Stripe; the DB only reflects those changes once Stripe's webhook confirms them, closing the loop the current `localStorage` demo (`Subscribe.jsx` setting `subscribed=true` on submit) fakes today.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k subscribers (realistic near-term for this project) | Single Neon Postgres project, `@neondatabase/serverless` HTTP driver (one query per function invocation, no pooling infra needed). No caching layer required. |
| 1k–100k subscribers | Add indexes on `subscriptions.user_id` and `stripe_customers.stripe_customer_id`; consider Vercel Fluid Compute + a warm `pg` connection pool (`attachDatabasePool`) if function cold-start/HTTP-driver latency becomes measurable; add a short-lived in-memory cache of entitlement lookups per warm function instance (not a cookie/JWT cache) if DB read latency becomes a bottleneck on gated-content-heavy pages. |
| 100k+ subscribers | Move webhook processing off the synchronous request path (enqueue to a queue/worker, ack Stripe fast) if event volume causes handler timeouts; consider a read replica for entitlement reads if write contention from webhooks grows. |

### Scaling Priorities

1. **First bottleneck:** DB connection overhead per serverless invocation if a traditional pooled `pg` client is used without Fluid Compute — mitigated from day one by choosing the Neon HTTP driver (Pattern in Sources below), so this is a non-issue at this project's realistic scale.
2. **Second bottleneck (much further out):** Webhook handler synchronous processing time if Stripe event volume grows — not a concern for a single-brand magazine subscriber base; flagged only for completeness.

## Anti-Patterns

### Anti-Pattern 1: Baking entitlement/subscription status into the session cookie or a JWT claim

**What people do:** Put `{ userId, subscribed: true, plan: 'premium' }` into a signed cookie or JWT so every request can check entitlement without a DB round-trip.
**Why it's wrong:** Violates the explicit requirement that cancelling immediately re-locks content — the cookie stays valid (and "subscribed") until it expires or is reissued, even after Stripe reports the cancellation via webhook.
**Do this instead:** Cookie carries identity only (`userId`). Entitlement is always a live DB read at request time, sourced from the webhook-maintained `subscriptions` table.

### Anti-Pattern 2: Trusting the Stripe Checkout success-page redirect as proof of payment

**What people do:** On landing at the `success_url` after Checkout, immediately set `subscribed = true` client-side (this is exactly what `Subscribe.jsx` does today with its fake `completeDemo()`).
**Why it's wrong:** The redirect only proves the browser was sent back to that URL — it proves nothing about payment success server-side, and is trivially fakeable by visiting the URL directly.
**Do this instead:** The success page shows a "confirming your subscription…" state and polls `GET /api/me` (or the page simply re-fetches on next real navigation) until the webhook-driven DB write lands; the webhook is the only source of truth for "did this actually succeed."

### Anti-Pattern 3: Using a pooled `pg` TCP client from classic (non-Fluid) Vercel serverless functions

**What people do:** `new Pool()` from `node-postgres` at module scope, assuming it behaves like a long-lived server process.
**Why it's wrong:** Each classic serverless invocation may be a fresh, short-lived execution environment; TCP connections accumulate and exhaust Postgres's connection limit under concurrent traffic instead of being reused.
**Do this instead:** Use `@neondatabase/serverless` in HTTP mode (`neon()` function, one query per call) for typical request/response functions; only reach for pooled TCP + Fluid Compute's `attachDatabasePool` if functions are explicitly configured to stay warm.

### Anti-Pattern 4: Letting the platform auto-parse the Stripe webhook request body

**What people do:** Read `req.body` (already JSON-parsed by the platform) inside the webhook handler and pass it to `stripe.webhooks.constructEvent`.
**Why it's wrong:** Stripe's signature verification requires the exact raw bytes of the request body; a re-serialized parsed-then-stringified body will not match the signature, and verification will fail (or, worse, someone "fixes" this by skipping verification entirely, which removes all protection against forged webhook calls).
**Do this instead:** In the webhook function specifically, read the raw body directly from the Node request stream (or use the Web API `request.text()` handler style) before any parsing occurs, and pass that untouched buffer/string to `constructEvent`.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google OAuth | Authorization Code flow: redirect to consent screen → `api/auth/google/callback` exchanges code via `google-auth-library` `OAuth2Client`, verifies ID token, extracts `sub` | No client-side Google script needed with this flow choice — avoids CSP script-src changes entirely (Pattern 1) |
| Stripe (Checkout) | Server creates a Checkout Session (`mode: 'subscription'`, one of the 4 known price IDs), returns `session.url`, browser navigates there | No Stripe.js needed client-side with server-redirect approach |
| Stripe (Billing Portal) | Server creates a Billing Portal Session for the user's `stripe_customer_id`, browser navigates there for cancel/manage | Replaces the current mocked Account page cancel/manage UI with Stripe's own hosted flow |
| Stripe (Webhooks) | `api/stripe/webhook.js`, raw body + signature verification, idempotent via `processed_stripe_events` unique constraint | Must be registered in the Stripe dashboard against the deployed `/api/stripe/webhook` URL; webhook signing secret is a separate env var from the API secret key |
| Neon Postgres | `@neondatabase/serverless` HTTP driver, one query per invocation, no persistent connection state | Avoids the classic serverless connection-exhaustion problem (Anti-Pattern 3) without needing PgBouncer or Fluid Compute at this project's scale |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend SPA ↔ `/api/*` functions | Same-origin `fetch(..., { credentials: 'include' })`, JSON in/out | No CORS configuration needed (same Vercel deployment/origin); session cookie travels automatically |
| `/api/*` functions ↔ Neon Postgres | `@neondatabase/serverless` HTTP driver, parameterized SQL (or a thin query builder — Drizzle is a reasonable fit given the schema's small surface) | Each function imports a shared singleton from `api/_lib/db.js` |
| `/api/*` functions ↔ Stripe | `stripe` Node SDK, secret key from env, never exposed to `src/` (client bundle) | Webhook secret and API secret key are two distinct env vars, both server-only |
| `/api/*` functions ↔ Google | `google-auth-library` `OAuth2Client`, client secret from env, never exposed to `src/` | Client ID (not secret) is safe to reference from the login-redirect URL construction, which can live server-side or client-side equally |
| Static prerendered pages ↔ dynamic gated regions (same page) | Post-hydration `fetch()` calls from route components (e.g. `Edition.jsx`) into `/api/content/...` | The prerendered HTML for a gated route contains only the free excerpt/shell; the "full content" DOM region is populated client-side after hydration, gated by the live entitlement check server-side |

## The Prerendering Split — Explicit Guidance

**Stays exactly as-is (build-time prerendered, unchanged pipeline):**
- `/`, `/archive`, `/books`, `/writings` — pure listing/marketing pages, identical for every visitor, no reason to touch `prerender.js` for these.
- `/editions/:no`, individual book/writing detail pages — **the public shell only**: title, cover, metadata, free excerpt, JSON-LD/SEO tags. This is unchanged from today's build-time rendering *except* that the data source for what counts as "the excerpt" must now be genuinely public data (already the case for `src/data/content.js` metadata), not the currently-bundled full text that CSS merely blurs.
- `/subscribe` (plan-selection view) — public, no auth required to see pricing/plan options.
- `/404` and any other route with no per-user variation.

**Must become dynamic (post-hydration, runtime `/api/*` fetch — never prerendered with real data):**
- The **full-text/full-issue region** within `/editions/:no` and equivalent book/writing pages — fetched via `api/content/[type]/[slug].js`, gated by live entitlement check. The prerendered page still exists and is still crawlable/indexable for its public shell; only this specific DOM region is populated dynamically.
- `/account` — subscription status, plan, invoices, cancel/manage. Prerender only a generic "sign in to view your account" shell (or skip prerendering this route's content entirely and let the SPA render a loading state, then populate from `GET /api/me` + `GET /api/subscription` after hydration). There is no public/SEO value in this route, so minimal-shell prerendering is purely for consistency with the rest of the build pipeline, not necessity.
- Sign-in state anywhere it appears (header "Sign in" vs. avatar/menu) — resolved client-side from `/api/me` after hydration; the prerendered HTML should render a neutral/signed-out-looking default (never guess a signed-in state at build time, since prerendering happens once per deploy with no viewer context).

**Why this split and not a framework migration:** The existing `prerender.js` + `src/entry-server.jsx` mechanism already correctly separates "render once at build time" from "hydrate and behave as SPA thereafter." Nothing about adding per-user dynamic content requires replacing this with a per-request SSR framework (e.g., migrating to Next.js) — it only requires adding a runtime data-fetching layer (the new `/api/*` functions + `src/api/*.js` client wrappers) for the specific regions that are genuinely per-user. This keeps the milestone scoped to additive changes rather than a rewrite, consistent with the project's stated constraint to build on the existing Vite + React Router SPA.

**CSP consequence of this split + Pattern 1:** Because both Google sign-in and Stripe checkout/billing-portal use server-initiated full-page redirects rather than embedded client-side SDKs, the CSP change needed is minimal — essentially none for `script-src` (no new third-party script origins to load), and no `frame-src` changes for either provider under this flow (Stripe Checkout/Billing Portal and Google's consent screen are top-level navigations, not iframes). The only CSP consideration is ensuring `connect-src`/`form-action` don't unnecessarily block the redirect targets — full-page navigations are generally unaffected by `connect-src`, so this is a smaller, more surgical change than "loosen CSP for Google + Stripe," directly addressing the concern flagged in the existing codebase architecture doc.

## Sources

- [How do I get the raw body of a Serverless Function? — Vercel Knowledge Base](https://vercel.com/support/articles/how-do-i-get-the-raw-body-of-a-serverless-function) — MEDIUM confidence (official Vercel docs)
- [Connection Pooling with Vercel Functions — Vercel Knowledge Base](https://vercel.com/kb/guide/connection-pooling-with-functions) — MEDIUM confidence (official Vercel docs)
- [Neon serverless driver — Neon Docs](https://neon.com/docs/serverless/serverless-driver) — MEDIUM confidence (official Neon docs)
- [Connecting to Neon from Vercel — Neon Docs](https://neon.com/docs/guides/vercel-connection-methods) — MEDIUM confidence (official Neon docs)
- [Verify the Google ID token on your server side — Google for Developers](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) — MEDIUM confidence (official Google docs)
- [Authenticate with a backend server — Google for Developers](https://developers.google.com/identity/sign-in/web/backend-auth) — MEDIUM confidence (official Google docs)
- [google-auth-library-nodejs verifyGoogleIdToken.js sample — googleapis/GitHub](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/verifyGoogleIdToken.js) — MEDIUM confidence (official Google client library repo)
- [iron-session README — vvo/GitHub](https://github.com/vvo/iron-session/blob/main/README.md) — MEDIUM confidence (canonical library docs, widely adopted)
- [Rewrites on Vercel — Vercel Docs](https://vercel.com/docs/routing/rewrites) — MEDIUM confidence (official Vercel docs)
- [Static Configuration with vercel.json — Vercel Docs](https://vercel.com/docs/project-configuration/vercel-json) — MEDIUM confidence (official Vercel docs)
- [Resolve webhook signature verification errors — Stripe Documentation](https://docs.stripe.com/webhooks/signature) — MEDIUM confidence (official Stripe docs)
- [Stripe subscriptions webhooks documentation — docs.stripe.com](https://docs.stripe.com/subscriptions/webhooks) — MEDIUM confidence (official Stripe docs)

---
*Architecture research for: Auth + billing backend integration into an existing prerendered React SPA*
*Researched: 2026-09-08*
