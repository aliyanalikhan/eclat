# Project Research Summary

**Project:** Éclat — subscriber accounts + Stripe billing for a digital magazine/publishing site
**Domain:** Adding real Google-only auth, server-side sessions, and Stripe subscription billing to an existing prerendered Vite + React SPA on Vercel (currently zero-backend)
**Researched:** 2026-09-08
**Confidence:** MEDIUM

## Executive Summary

This is a bolt-on backend slice for an existing static/prerendered marketing site, not a framework rewrite: Vercel serverless Functions under `/api` handle everything server-only (Google ID verification, Stripe Checkout/webhooks, entitlement checks), while the existing `prerender.js` + Vite/React Router SPA continues serving public marketing pages unchanged. Experts building this pattern separate two concerns rigorously — a long-lived session cookie that proves who the user is, and a live, webhook-synced database read on every gated request that proves what they're currently allowed to see. The entire project hinges on never conflating these: the current `subscribed` localStorage flag is the anti-pattern this milestone must eliminate root and branch, and it is easy to accidentally re-create the same flaw in a fancier form (a signed cookie/JWT with `subscribed: true` baked in) if session and entitlement aren't kept structurally separate from day one.

The recommended approach is Vercel Functions (Node 22.x) + Neon Postgres (via `drizzle-orm`/`@neondatabase/serverless` HTTP driver, avoiding serverless connection-pool exhaustion) + `iron-session` for stateless identity cookies + the official `stripe` Node SDK for Checkout and signature-verified webhooks. For both Google sign-in and Stripe checkout/billing management, use server-initiated redirect flows (see Reconciliation below) rather than embedding client-side Google/Stripe SDKs — this keeps the site's existing strict CSP essentially untouched, which matters because the codebase's current CSP is a deliberate, already-flagged-as-fragile security control. Stripe webhooks are the single source of truth for subscription state; Checkout success-page redirects and client-supplied `session_id` values are never trusted on their own.

The key risks are all trust-boundary risks, not technical-integration risks: (1) re-implementing the fake paywall as a server-issued but still stale cookie claim instead of a live per-request DB check, (2) trusting the Checkout success redirect over the asynchronous webhook (a genuine race condition, not a hypothetical), (3) broken or skipped webhook signature verification due to body-parsing middleware touching the raw bytes first, (4) missing webhook idempotency causing duplicate/out-of-order state corruption, (5) secrets leaking into the client bundle via a mistaken `VITE_` prefix, and (6) gated content still being baked into the build-time prerendered HTML/JS bundle. All six are well-documented, avoidable, and should be designed against from the first line of code in their respective phases, not retrofitted.

## Key Findings

### Recommended Stack

Vercel Functions (Node.js 22.x runtime) host all new server logic under root-level `/api`, deployed by the existing `vercel.json`/Vercel project with zero new infra. Google Identity Services + `google-auth-library` (server-side `verifyIdToken()`) handles sign-in, using the token's `sub` claim — never email — as the permanent user identifier. Stripe's official Node SDK creates Checkout Sessions and verifies webhook signatures via `constructEvent()`. Neon (serverless Postgres) is the database, accessed through `drizzle-orm`'s `neon-http` adapter and `@neondatabase/serverless`'s HTTP driver — this avoids the classic serverless failure mode of a pooled TCP Postgres client exhausting connections under concurrent short-lived invocations. `iron-session` provides a stateless, encrypted-cookie session (identity only, no entitlement baked in) with no server-side session store needed.

**Core technologies:**
- Vercel Functions (Node 22.x) — serverless backend for auth callbacks, Stripe checkout/webhooks, entitlement API — zero new infra, bolts onto the existing static build
- Google Identity Services + `google-auth-library` — Google-only sign-in with server-verified identity — server independently verifies the JWT rather than trusting the client
- `stripe` (Node SDK) — Checkout Sessions + signature-verified webhooks, server-only — official SDK, required so no money-moving logic or secrets ever reach the client
- Neon Postgres + `drizzle-orm`/`@neondatabase/serverless` — users, sessions, subscription/entitlement state — HTTP-based driver matches Vercel's cold-start-per-invocation model; scale-to-zero fits this project's size
- `iron-session` — stateless, encrypted-cookie session carrying identity only — no session-store table needed; every gated request still re-checks live entitlement from Neon

### Expected Features

Table-stakes features center on making the existing mocked flows (fake `subscribed` flag, mocked invoices/plan on Account) genuinely real: one-click Google sign-in with a persistent session, Stripe-hosted Checkout for all 4 existing products at correct real prices, visible real subscription status with self-serve cancellation, and — critically — immediate re-lock of gated content the moment a subscription lapses or is cancelled, driven by webhook-synced state rather than a cache. Differentiators (Stripe Customer Portal integration, real invoice history, bundle-awareness across the 4 products) are valuable but not launch-blocking. Anti-features explicitly excluded: email/password fallback auth, a custom-built payment form, flexible/new pricing tiers, and any client-trusted access flag — the last being precisely what this milestone must remove.

**Must have (table stakes):**
- Google sign-in with server-verified session
- Stripe Checkout for all 4 products, correctly priced
- Webhook-driven entitlement sync replacing `subscribed` across `Edition.jsx`/`Archive.jsx`/`Books.jsx`/`Account.jsx` — this is the Core Value
- Account page with real status + self-serve cancellation
- Immediate re-lock on cancellation — this is the stated success metric

**Should have (competitive):**
- Stripe Customer Portal integration in place of a hand-rolled cancel button
- Real invoice history (trivial once Portal/Invoices API is wired)
- Payment-failed/dunning banner with clear CTA

**Defer (v2+):**
- Format-aware gating (Hard Copy → also grants Online) — this is a business decision, not a technical one; flag to the user before finalizing the entitlement schema
- Preview/excerpt gating (partial content shown pre-subscription)
- Plan upgrade/downgrade self-serve

### Architecture Approach

Two artifact types share one Vercel deploy: the existing build-time prerendered `dist/` output (unchanged for public marketing pages) and new `/api/*` serverless Functions (all secrets, sessions, DB, Stripe/Google calls). The frontend SPA hydrates as today, then post-hydration fetches gated regions from `/api/*` using the session cookie. A single entitlement function/table is the one place that decides whether a user currently has access, always by live DB read, never by trusting a cookie payload — this directly replaces the scattered `subscribed` flag reads throughout the route components.

**Major components:**
1. Static prerendered shell — public marketing pages + free excerpts, unchanged `prerender.js` output
2. Auth functions (`/api/auth/google/*`) — OAuth exchange, ID token verification, session cookie issuance
3. Billing functions (`/api/checkout`, `/api/billing-portal`) — create Stripe Checkout/Billing Portal Sessions for the signed-in user
4. Webhook function (`/api/stripe/webhook`) — the single writer of subscription state, idempotent by `event.id`
5. Entitlement/content functions (`/api/me`, `/api/content/*`) — per-request server-side resolution of access, sourced from the DB, never from client or cookie claims

### Reconciliation: Client-side SDKs vs. server-initiated redirects (STACK.md vs. ARCHITECTURE.md)

STACK.md and ARCHITECTURE.md proposed two different integration shapes for Google sign-in and Stripe checkout. This summary adopts ARCHITECTURE.md's server-initiated redirect flow as the primary recommendation — Google OAuth Authorization Code flow (redirect to `accounts.google.com`, server-side callback exchanges the code) and Stripe Checkout/Billing Portal Sessions created server-side with the browser simply navigating to the returned `url` — rather than STACK.md's client-loaded Google Identity Services button + `@stripe/stripe-js` client SDK.

Why: the deciding factor is CSP impact, and it is not a close call given this codebase's existing constraints. `.planning/codebase/CONCERNS.md`'s own flagged concern is that adding Google/Stripe will force a CSP relaxation; the redirect-based approach makes that relaxation near-zero (full-page top-level navigations are not governed by `script-src`/`frame-src` at all — only `connect-src`/`form-action` need minor, surgical entries), whereas loading GIS's script and Stripe.js client-side would require adding both origins to `script-src` and `frame-src`. Since this project has no product requirement for One Tap or embedded Stripe Elements (Checkout is Stripe-hosted either way), the redirect flow achieves the identical user-facing outcome (one-click Google sign-in, Stripe-hosted checkout) with materially less security-surface change. The extra cost is a full-page redirect instead of an in-page popup/button — a minor UX tradeoff, not a functional gap.

Practical implication for the stack list: `google-auth-library` (server-side `OAuth2Client` + `verifyIdToken()`) remains required exactly as STACK.md specifies. Google Identity Services' client-loaded script and `@react-oauth/google` become optional/unneeded for v1 under this flow choice — retain them only if a future milestone explicitly wants One Tap. `@stripe/stripe-js` likewise becomes unnecessary for v1; the `stripe` Node SDK (server-only) is sufficient since Checkout/Billing Portal Sessions are consumed via a server-side redirect, not a client-side redirect call. If a future need for embedded Stripe Elements or Google One Tap arises, treat that as a scoped follow-up decision with its own CSP diff, not a default.

### Critical Pitfalls

1. **Re-implementing the fake paywall as a server-issued cookie/JWT with `subscribed: true` baked in** — treat session (who) and entitlement (what they can see right now) as separate concerns; entitlement is always a live DB read per gated request, sourced from webhook-synced state, never a long-lived signed claim.
2. **Trusting the Stripe Checkout success-page redirect (or a client-supplied `session_id`) instead of the webhook, or vice versa with no reconciliation** — the redirect and webhook are unordered, racing signals; the success-page handler should re-fetch the real Checkout Session from Stripe's API to reconcile immediately, with the webhook as the independent, authoritative background confirmation. Both paths must call the same idempotent sync function.
3. **Skipping or breaking Stripe webhook signature verification** — almost always caused by a global JSON body parser touching the request before the raw bytes reach `constructEvent()`; the webhook route must read raw, unparsed bytes specifically, tested against a deliberately-tampered payload before shipping.
4. **No webhook idempotency** — Stripe delivers at-least-once, unordered; store every processed `event.id` under a unique constraint and treat events as triggers to reconcile against live Stripe state, not as directly-trusted, order-sensitive writes.
5. **Gated content still present in the prerendered HTML/JS bundle or client-only hidden** — full paywalled text must never enter the build-time prerender pass or ship in the initial bundle; it is fetched only from an authenticated, entitlement-checked `/api/content/*` endpoint post-hydration.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Environment/config layer + secrets boundary
**Rationale:** Per `CONCERNS.md` and PITFALLS.md Pitfall 6, this project currently has no env/config layer and no `.env*` exclusion in `.gitignore` — establishing the client/server secrets boundary (`VITE_`-prefixed = public only; secrets are server-only `process.env`) before any OAuth or Stripe code exists prevents the single highest-cost pitfall (a leaked secret in a shipped bundle) from ever becoming possible.
**Delivers:** `.gitignore` updated, env var conventions documented, Vercel project env vars scaffolded (placeholders), a release check (grep `dist/` for secret substrings).
**Addresses:** Foundational prerequisite for all P1 features in FEATURES.md.
**Avoids:** Pitfall 6 (secrets in Vite bundle).

### Phase 2: Google sign-in + server-side session
**Rationale:** FEATURES.md and PITFALLS.md both identify this as the single foundational dependency — nothing else (checkout, entitlement, account management) can be built until we know who this request is from. Server-initiated OAuth Authorization Code flow (per Reconciliation above) is used specifically to avoid CSP script-src/frame-src changes.
**Delivers:** `/api/auth/google/login.js`, `/api/auth/google/callback.js`, `/api/auth/logout.js`, `iron-session`-based identity cookie, `users` table (keyed on Google `sub`), CSRF `state` validation, post-login session regeneration.
**Uses:** `google-auth-library`, `iron-session`, Neon/Drizzle `users` table.
**Implements:** Auth functions + Session layer components from ARCHITECTURE.md.
**Avoids:** Pitfall 5 (OAuth CSRF/session fixation).

### Phase 3: Stripe Checkout + webhook handling (designed as one unit)
**Rationale:** PITFALLS.md explicitly warns these must be planned together, not sequentially — the success-redirect-vs-webhook race is a structural property of Stripe Checkout, not an edge case, and idempotent webhook handling is the load-bearing mechanism the whole entitlement system depends on.
**Delivers:** `/api/checkout.js` (Checkout Session creation for the 4 real product/price IDs), `/api/stripe/webhook.js` (raw-body signature verification, `processed_stripe_events` idempotency table, handlers for `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`), `subscriptions`/`stripe_customers` tables, success-page reconciliation via server-side re-fetch of the Checkout Session.
**Addresses:** Stripe Checkout for all 4 products and the webhook-driven entitlement sync feature from FEATURES.md.
**Avoids:** Pitfalls 2, 3, 4 (success/webhook race, broken signature verification, missing idempotency).

### Phase 4: Content gating — replace `subscribed` flag, split prerendering
**Rationale:** This is the Core Value the whole milestone exists to deliver, and PITFALLS.md flags it as needing explicit architectural design (which routes stay prerendered vs. become dynamic) before touching `prerender.js`, not a reactive patch after the fact.
**Delivers:** Single entitlement-check function/module (`api/_lib/entitlements.js`, `api/content/[type]/[slug].js`) reused across `Edition.jsx`, `Archive.jsx`, `Books.jsx`; `src/data/content.js` split so full gated text no longer ships in the public bundle; `prerender.js` route list audited to exclude gated content from the static build.
**Uses:** `subscriptions` table from Phase 3, session from Phase 2.
**Implements:** Entitlement/content functions + the Prerendering Split from ARCHITECTURE.md.
**Avoids:** Pitfalls 1, 7 (stale-cookie-as-entitlement, gated content leaking via prerendered HTML/bundle).

### Phase 5: Account page — real status, self-serve cancel, Billing Portal
**Rationale:** FEATURES.md notes this enhances but does not block gating — sequence gating correctness (Phase 4) before UI polish. This phase replaces the currently-mocked Account page invoices/plan data with real Stripe-backed state.
**Delivers:** `/api/billing-portal.js`, Account page reading real subscription status/renewal date, cancel action (via Billing Portal redirect), past-due/payment-failed messaging.
**Addresses:** View current subscription status, self-serve cancellation, payment failure handling features from FEATURES.md.

### Phase Ordering Rationale

- Config/secrets (Phase 1) must precede any code that could accidentally leak a secret — cheapest to fix before it exists, most expensive after a real key is ever committed or bundled.
- Identity (Phase 2) is a hard dependency for every other phase per FEATURES.md's dependency graph — checkout, webhooks, and gating all need to know who is asking first.
- Checkout + webhook (Phase 3) are grouped as one phase per PITFALLS.md's explicit guidance that treating them as sequential/unrelated is itself a common source of the success/webhook race bug.
- Content gating (Phase 4) depends on Phase 3's `subscriptions` table existing and being correctly synced — building gating against fake/absent entitlement data would just recreate the current flaw with extra steps.
- Account/Portal UI (Phase 5) is explicitly the lowest-risk, most deferrable phase per both FEATURES.md and PITFALLS.md — correctness of gating matters more than UI polish if time-constrained.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Checkout + webhook):** Exact current Stripe API shapes/field names for the 4 real products, `apiVersion` pinning, and the precise idempotency/reconciliation code pattern should be verified against `docs.stripe.com` at implementation time — PITFALLS.md notes this research session had no live Stripe docs API access.
- **Phase 4 (Content gating + prerendering split):** No existing reference architecture combines this project's specific prerender pipeline (`prerender.js` + `entry-server.jsx`) with per-user runtime gating; the split needs to be verified against the actual current route list in the codebase, not assumed from research alone.

Phases with standard patterns (skip research-phase):
- **Phase 1 (env/config):** Well-documented Vite/Vercel env-var conventions, no ambiguity.
- **Phase 2 (Google sign-in):** Google's official Authorization Code flow + `google-auth-library` is a standard, well-documented server-side OAuth pattern.
- **Phase 5 (Account/Billing Portal):** Stripe Billing Portal is a documented, low-custom-code integration once Phase 3's Stripe plumbing exists.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Cross-checked against official Vercel/Google/Stripe/Neon/Drizzle docs; some package version specifics should be re-verified at install time since they drift quickly |
| Features | MEDIUM-HIGH | Stripe/Google official-doc-backed findings are HIGH confidence; general paywall UX pattern findings are MEDIUM (community/industry sources) |
| Architecture | MEDIUM | No single canonical prerendered-SPA + Vercel Functions + billing reference architecture exists; synthesized from verified component-level facts rather than one authoritative source |
| Pitfalls | MEDIUM | Cross-checked web sources; no live Stripe/Google docs API access during this research session — exact API signatures should be verified against current docs at implementation time |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Format-aware gating (Hard Copy → also grants Online access):** Explicitly flagged by FEATURES.md as a business decision, not a research finding — must be decided by the user before the entitlement schema (1 product = 1 entitlement vs. 1 product = N entitlements) is finalized. Raise this during roadmap/requirements review, not silently default it.
- **Exact current Stripe product/price IDs and their real prices:** STACK.md notes the current `/subscribe` page has placeholder pricing ($9/mo, $84/yr) that must be reconciled against the actual 4 live Stripe products before Phase 3 is planned in detail.
- **Client-side Google/Stripe SDK question (resolved above but worth re-confirming at planning time):** If product later wants Google One Tap or embedded Stripe Elements, that requires revisiting the CSP diff decided here — treat as an explicit, scoped follow-up, not an assumed default.
- **Package version pinning:** Several stack versions (`drizzle-orm`, `@neondatabase/serverless`, `stripe`) should be re-checked via `npm view <pkg> version` at actual install time rather than trusting the versions recorded in STACK.md, since this research is a point-in-time snapshot (2026-09-08).

## Sources

### Primary (HIGH confidence)
- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token — server-side ID token verification (Google official)
- https://developers.google.com/identity/sign-in/web/backend-auth — backend auth pattern for GIS (Google official)
- https://docs.stripe.com/billing/subscriptions/build-subscriptions — Stripe subscriptions build guide (official)
- https://docs.stripe.com/webhooks/signature — webhook signature verification (Stripe official)
- https://docs.stripe.com/webhooks — receiving Stripe events (official)
- https://docs.stripe.com/customer-management — Stripe Customer Portal (official)
- https://vercel.com/docs/functions/runtimes/node-js — Vercel Functions Node.js runtime (official)
- https://vercel.com/support/articles/how-do-i-get-the-raw-body-of-a-serverless-function — raw body handling (official Vercel)
- https://neon.com/docs/serverless/serverless-driver — Neon HTTP serverless driver (official)
- https://orm.drizzle.team/docs/connect-neon — Drizzle + Neon adapter (official)

### Secondary (MEDIUM confidence)
- https://github.com/googleapis/google-auth-library-nodejs — google-auth-library package/samples
- https://arcticjs.dev/ , https://pilcrowonpaper.com/blog/18 — Arctic OAuth library deprecation (July 2026)
- Drizzle vs Prisma cold-start comparisons — cross-checked across multiple 2026 comparison articles
- https://auth0.com/docs/secure/attack-protection/state-parameters — OAuth CSRF/state parameter guidance
- https://reintech.io/blog/vite-environment-variables-configuration-security — Vite env var security model
- https://www.sprocketsecurity.com/blog/hunting-secrets-in-javascript-at-scale-how-a-vite-misconfiguration-lead-to-full-ci-cd-compromise — real-world Vite secret leak case study
- Multiple Stripe webhook race-condition/idempotency writeups (GembaPay, DEV Community, The Road to Enterprise) — cross-checked, consistent findings

### Tertiary (LOW confidence)
- General paywall/publisher UX pattern comparisons (NYT/FT-style) — industry blog sources, directionally useful but not verified first-hand

---
*Research completed: 2026-09-08*
*Ready for roadmap: yes*
