# Pitfalls Research

**Domain:** Google OAuth + Stripe subscription billing + server-verified content gating, added to an existing zero-backend static SPA
**Researched:** 2026-09-08
**Confidence:** MEDIUM (cross-checked web sources; no official Stripe/Google docs API access in this session — verify exact API signatures against `docs.stripe.com` and Google Identity Services docs at implementation time)

## Context

This project's specific starting point matters: `src/store.jsx` currently holds a `subscribed` flag in `localStorage` that any user can flip via devtools, and this exact anti-pattern is explicitly called out in `.planning/PROJECT.md` and `.planning/codebase/CONCERNS.md` as something that **must not be carried forward** into the real implementation. Every pitfall below is framed against replacing that flag with genuine server-verified entitlement, not against building a paywall from scratch.

## Critical Pitfalls

### Pitfall 1: Re-implementing the fake paywall with a server-issued cookie instead of removing the trust boundary

**What goes wrong:**
Teams "add auth" by having the server set a cookie/JWT once at login containing `{ subscribed: true }`, then have the client read and trust that claim indefinitely (or until it expires) without re-checking against current Stripe state. Access looks server-verified because a server issued the token, but the token itself becomes a new version of the same stale, unverified flag — cancel a subscription and the user keeps access until the token happens to expire or the page fully reloads.

**Why it happens:**
It's the path of least resistance once OAuth exists: "we have a signed session now, so trust whatever it says" feels like an upgrade from `localStorage`, but a long-lived claim that isn't re-validated per-request against the billing system is still client-trusted state, just wrapped in a signature.

**How to avoid:**
Treat the session (who is this user) and the entitlement (what are they allowed to see right now) as two separate concerns. The session can be long-lived (httpOnly cookie identifying the user). The entitlement must be checked fresh — either on every gated request against a database row that webhooks keep in sync, or via a short-TTL cache (seconds, not the session lifetime) that is invalidated the moment a webhook changes subscription status. Never bake `subscribed`/`plan` into a long-lived signed token as the sole access-control source.

**Warning signs:**
- A JWT/session payload contains subscription status fields with no corresponding re-check against the database on gated requests.
- Cancelling a subscription in the Stripe dashboard doesn't immediately affect access in a running session, only after logout/re-login.
- Any code path that reads `req.session.subscribed` (or similar) directly to decide what content to return, instead of querying a `subscriptions`/`entitlements` table.

**Phase to address:**
Server-side session + entitlement architecture phase (before any content-gating phase). Entitlement checks must be designed as "query current state," not "trust the token," from the first line of code.

---

### Pitfall 2: Trusting the Stripe Checkout success-page redirect instead of the webhook (or vice versa, with no reconciliation)

**What goes wrong:**
Two independent, unordered signals exist after a successful Stripe Checkout: the browser redirect to your success URL (which can carry a `session_id` query param) and the webhook event delivered to your server. Teams often grant access purely on the redirect (trusting a client-supplied `session_id` with no server-side verification — trivially spoofable, since anyone can hit `/success?session_id=fake`), or they grant access purely on the webhook and leave the user staring at "processing…" for several seconds to a minute because the webhook hasn't arrived yet, sometimes because the webhook was slower than the redirect, sometimes because delivery genuinely lags.

**Why it happens:**
Stripe does not guarantee the redirect and the webhook arrive in any particular order relative to each other, and this isn't obvious from a first read of Checkout's docs — the two paths look sequential in a demo but race in production.

**How to avoid:**
Use both paths, converging on the same idempotent update. The success-page handler should server-side re-fetch the actual Checkout Session (and its subscription) from the Stripe API using the `session_id` — never trust the query param's presence as proof of payment, only use it to look up the real state — and reconcile immediately so the user doesn't wait. The webhook remains the authoritative source of truth running independently in the background. Both paths should call the same "sync subscription state from Stripe" function so whichever arrives first performs the update and the other is a safe no-op.

**Warning signs:**
- Access is granted the instant the success page loads, with no server call back to Stripe to verify the session.
- Users report intermittent "why don't I have access yet" after paying, especially any correlation with browser speed or Stripe API latency.
- No shared reconciliation function — checkout-success handler and webhook handler each have separate, divergent logic for "what does an active subscription look like."

**Phase to address:**
Stripe Checkout integration phase, in tandem with the webhook-handling phase — plan these as one unit of work, not sequential unrelated phases.

---

### Pitfall 3: Skipping or weakening Stripe webhook signature verification

**What goes wrong:**
The webhook endpoint processes events without verifying the `Stripe-Signature` header, or verification is technically present but broken because the raw request body was already parsed/re-serialized by framework middleware (e.g., a global JSON body parser) before the signature check runs — any re-serialization changes byte-for-byte content and breaks HMAC verification, so teams sometimes "fix" the resulting errors by disabling verification rather than fixing the raw-body handling.

**Why it happens:**
Most web frameworks parse JSON bodies globally by default, and the webhook route needs the *raw* bytes specifically for signature verification. This is a well-known but easy-to-miss ordering issue, especially in serverless functions where body-parsing behavior isn't always obvious.

**How to avoid:**
Ensure the webhook route receives the untouched raw body (Vercel serverless functions receive the raw body by default if you don't run it through a body-parsing middleware — verify this explicitly for the chosen runtime). Call the Stripe SDK's signature-verification function with the raw body string, the `Stripe-Signature` header, and the correct endpoint secret. Use environment-specific secrets (test vs. live webhook signing secret) and never share one secret across environments. Never process a webhook payload that fails signature verification, even in a "just to unblock testing" way that later ships to production.

**Warning signs:**
- Any middleware chain where a global JSON/body parser runs before the webhook route.
- `constructEvent`-equivalent calls wrapped in a broad try/catch that silently falls through to "process anyway."
- Signature verification errors appearing intermittently in production logs (often a test/live secret mismatch, not a bug).

**Phase to address:**
Webhook-handling phase, first task before any event-processing logic is written — get raw-body plumbing and signature verification working and tested (including a deliberately-tampered payload that must be rejected) before building out event handlers.

---

### Pitfall 4: No webhook idempotency — duplicate or out-of-order events double-process or corrupt state

**What goes wrong:**
Stripe delivers webhooks with an at-least-once guarantee, not exactly-once, and does not guarantee ordering. The same event can be redelivered after a timeout, a transient error, or a retry window following an outage, and semantically-related events (e.g., a subscription's creation and deletion) can arrive out of the order they actually happened in. Handlers that assume "each event fires once, in order" end up double-sending confirmation emails, double-incrementing counters, or — worse — reviving access that should have been revoked because a later "activate" event is processed after an earlier "cancel" event that actually happened first.

**Why it happens:**
In local testing (Stripe CLI forwarding, low traffic) events almost always arrive once and in order, so the ordering/duplication assumption goes untested until production traffic or an outage exposes it.

**How to avoid:**
Store every processed `event.id` with a unique constraint before running business logic — reject/no-op any event whose ID has already been recorded. Never treat the webhook payload as the final source of truth for anything ordering-sensitive; instead use the event as a trigger to refetch/reconcile current subscription state from the Stripe API (or use the event's `created` timestamp to reject stale updates against a `last_synced_at` on the entitlement row). Design every handler to be safely re-runnable with the same event twice.

**Warning signs:**
- No table/column tracking which Stripe event IDs have already been processed.
- Handlers that directly write payload fields into the database (`subscription.status = event.data.object.status`) without checking whether this event is newer than the last-applied one.
- Any "this shouldn't happen" comment near subscription status transitions.

**Phase to address:**
Webhook-handling phase — idempotency and reconciliation-over-trust must be designed in from the first handler, not retrofitted after a duplicate-processing bug appears in production.

---

### Pitfall 5: Missing or incomplete CSRF/state protection on the Google OAuth flow

**What goes wrong:**
The OAuth redirect flow is implemented without a server-generated, unpredictable `state` parameter (or with one that's generated but never actually validated on callback), leaving the login flow open to CSRF — an attacker can trick a victim's browser into completing an OAuth flow initiated by the attacker, potentially linking the attacker's Google identity to the victim's session or vice versa. A related mistake: reusing the pre-authentication session ID after login succeeds (session fixation) instead of issuing a fresh session identifier post-auth.

**Why it happens:**
Many "quickstart" OAuth examples skip `state` handling for brevity, and it's invisible in day-to-day testing (nothing looks broken) — it only matters when someone is actively attacking the login flow.

**How to avoid:**
Before redirecting to Google, generate a random, unpredictable `state` value, store it server-side (signed cookie or session store) with a short expiry (e.g., 10 minutes) and mark it single-use. On the callback, validate the returned `state` matches, hasn't expired, and hasn't been used before, then invalidate it immediately. On successful authentication, issue a brand-new session identifier rather than upgrading the pre-auth session in place. If running on serverless/multiple instances, back session/state storage with a shared store (DB or Redis), not in-memory per-instance state that won't survive across function invocations.

**Warning signs:**
- OAuth redirect URL built with no `state` param, or a `state` param that's a static/constant value.
- Callback handler that doesn't compare the returned `state` against anything stored server-side.
- Session cookie value unchanged before and after login completes.

**Phase to address:**
Google OAuth integration phase — state validation and session regeneration are part of the minimum viable OAuth implementation, not a hardening pass added later.

---

### Pitfall 6: Client-visible "publishable"-looking secrets end up in the Vite bundle

**What goes wrong:**
Vite only exposes environment variables prefixed `VITE_` to client code via `import.meta.env`, and that prefix is often mistaken for a safety marker rather than what it actually is: an opt-in exposure gate. A developer trying to unblock a feature quickly renames a genuinely secret value (Stripe secret key, webhook signing secret, Google OAuth client secret, session-signing secret) to start with `VITE_` "just to get it working," and it ships into the built JS bundle verbatim, readable by anyone via devtools or by scraping the public bundle — and once deployed, that leak persists in any cached/CDN-served build even after the variable is removed in a later commit.

**Why it happens:**
This project's current README explicitly states "no build-time secrets, no server" — the team has no existing muscle memory for the client/server secrets boundary, and Vite's env-var model (unlike a traditional server framework where "all env vars are private by default") inverts the usual mental model in a way that's easy to get backwards under time pressure.

**How to avoid:**
Establish the rule explicitly before any secret exists in the repo: Stripe secret key, Stripe webhook signing secret, and the Google OAuth client secret are never assigned to a `VITE_`-prefixed variable — they live only in server-side environment variables (Vercel project env vars) referenced exclusively from serverless/Edge functions. Only genuinely public identifiers (Stripe publishable key, Google OAuth client ID) may use the `VITE_` prefix. Add `.env`, `.env.local`, and `.env*.local` to `.gitignore` (per `CONCERNS.md`, this is currently missing) before any secret is created locally. Grep the built `dist/` bundle for known secret substrings as a release check.

**Warning signs:**
- Any `VITE_STRIPE_SECRET_KEY`, `VITE_STRIPE_WEBHOOK_SECRET`, or `VITE_GOOGLE_CLIENT_SECRET`-style variable name appearing anywhere in the codebase or `.env.example`.
- `.gitignore` not excluding `.env*` files (current state per `CONCERNS.md`).
- Any serverless function importing a secret from `import.meta.env` instead of `process.env` (a sign the secret was made client-visible to be reachable from a function that shouldn't need client exposure at all).

**Phase to address:**
Environment/config-layer setup, before any OAuth or Stripe code is written — this is foundational and should be a explicit early phase per `CONCERNS.md`'s "No environment/config layer" finding, not something discovered mid-integration.

---

### Pitfall 7: Prerendered/static HTML or the initial JS bundle still contains gated content

**What goes wrong:**
The existing prerendering pipeline (`prerender.js` + `src/entry-server.jsx`) generates static HTML per route at build time for the whole public site. If gated routes (full edition issues, full book spreads, paywalled writings) are left in this same prerendering pass, the actual protected content gets baked into publicly-servable static HTML or shipped in the client JS bundle regardless of any subsequent client-side "hide it" logic — meaning the content is not actually protected, it's just visually hidden, and anyone can view-source, disable JavaScript, or inspect network responses to get it. This is functionally the same failure mode as the current `localStorage` flag, just relocated.

**Why it happens:**
The prerendering pipeline was built for a single canonical marketing site with no concept of per-user content, and it's easy to keep a route in the "always prerender" set out of habit or to avoid touching pipeline code, especially since the pipeline currently prerenders everything by default.

**How to avoid:**
Explicitly split routes into two categories: static marketing/public routes (can stay prerendered as-is — no gated content ever) and authenticated/entitled routes (must NOT be prerendered with real content; either render only a shell/teaser server-side, or fetch gated content client-side from an authenticated endpoint post-login that itself performs the entitlement check before returning any protected payload). Treat "is this route ever included in the static build with the actual protected content?" as a mandatory checklist item per gated route, not an assumption.

**Warning signs:**
- `prerender.js`'s route list includes edition/book/writing detail pages with full paywalled content variants.
- Viewing page source (not devtools React state) on a gated route shows the actual protected content, not just a locked/teaser state.
- A gated API/data fetch happens in a component that also runs during the SSR prerender pass, without a guard that skips actual content inclusion during that pass.

**Phase to address:**
Architecture/content-gating design phase, before any prerendering pipeline changes are made — this is called out directly in `.planning/codebase/CONCERNS.md` as something the milestone must deliberately design, not patch reactively.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Checking entitlement once at login and caching it in a long-lived session/JWT claim | Simple, fast, no extra DB round-trip per request | Cancelled/downgraded subscribers keep access until token expiry or re-login; contradicts "losing access immediately re-locks it" requirement in PROJECT.md | Never for this project — the milestone explicitly requires immediate revocation on cancellation |
| Handling only `checkout.session.completed` and skipping `customer.subscription.deleted`/`invoice.payment_failed` | Faster to ship a "subscribe" flow | Cancellations and failed renewals never revoke access — entitlement only ever grows, never shrinks | Never — revocation events are equally required as grant events for a real paywall |
| Trusting the `session_id` on the Checkout success redirect without re-verifying against Stripe | Instant-feeling UX, less code | Spoofable access grant via a crafted URL | Never as the sole check — acceptable only as an optimistic "processing" state while the real check (redirect handler re-fetch + webhook) is in flight |
| Using in-memory storage for OAuth `state` values or processed-event dedup sets | No DB/Redis setup needed early on | Breaks on serverless (each function invocation may be a fresh instance) and doesn't survive restarts, reopening the CSRF/duplicate-processing holes it was meant to close | Only in a single local-dev process during early prototyping, never in any deployed environment |
| Skipping a test suite for entitlement/webhook logic to move faster | Faster initial implementation | Per `CONCERNS.md`, no test framework exists at all today; auth/billing regressions are high-stakes (locked-out users, double charges, entitlement bypass) with zero safety net | Never for this milestone specifically — `CONCERNS.md` flags this as high priority to fix in lockstep with, not after, the auth/billing work |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| Stripe webhooks | Verifying signature against a body already parsed/re-serialized by global JSON middleware | Route-specific raw-body handling for the webhook endpoint only; verify signature before any parsing |
| Stripe webhooks | Assuming one event = one delivery, in order | Idempotent handling keyed on `event.id`; reconcile against live Stripe state rather than trusting payload fields blindly |
| Stripe Checkout | Trusting the success-page `session_id` query param as proof of payment | Server-side re-fetch the Checkout Session/Subscription from Stripe's API using that ID before granting anything |
| Google OAuth | No `state` parameter validation, or session ID reused post-login | Generate/validate single-use, short-TTL `state`; issue a fresh session ID after successful auth |
| Google OAuth + CSP | Adding `https://accounts.google.com` (and Stripe.js origins) to CSP via broad `'unsafe-inline'`/wildcard relaxation | Minimal, specific `script-src`/`connect-src`/`frame-src` allowlist entries only for the exact origins needed (per `CONCERNS.md`, the current CSP is intentionally strict and should stay that way) |
| Vercel serverless functions | Assuming `process.env.VITE_*` vars are available server-side the same way client vars are, or vice versa assuming server-only vars are safe to reference from client code | Keep a hard line: client code only ever reads `VITE_`-prefixed public values; serverless functions read non-prefixed secret env vars from Vercel's project settings |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Querying Stripe's API directly on every gated page load to check subscription status (instead of a locally synced DB record) | Slow page loads, tied to Stripe API latency/availability | Keep a local `entitlements`/`subscriptions` table kept in sync via webhooks; only fall back to a live Stripe API call for the checkout-success reconciliation path | Noticeable at even modest traffic (tens of concurrent users) since every gated request round-trips to a third-party API |
| No caching at all on entitlement checks, hitting the DB on every single request for every gated asset (e.g., every image in a gallery) | High DB load, elevated latency on content-heavy pages | Short-TTL (seconds) in-memory or edge cache of "is this user entitled" per request/session, invalidated eagerly on webhook-driven state changes | Becomes noticeable once gated pages include many discrete gated sub-resources fetched independently |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Gating content by hiding it in the client (CSS/conditional render) while still delivering the full payload in the initial HTML/JS/API response | Anyone can bypass via view-source, disabling JS, or reading network responses — this is the exact anti-pattern the milestone exists to remove | Server must never include the actual gated content in any response to an unentitled request; return a locked/teaser placeholder instead |
| Trusting a webhook payload's embedded subscription/customer fields as final truth without verifying the request's signature and without reconciling against live Stripe state | A forged or replayed request (or a stale/out-of-order legitimate one) can grant or extend access incorrectly | Signature verification is mandatory and non-bypassable; treat webhook payloads as triggers to re-sync, not as the write-source themselves |
| Storing the Google OAuth client secret or Stripe secret/webhook-signing keys in any client-reachable location (VITE_ vars, public repo, client bundle) | Full account/billing compromise, ability to forge webhook events or checkout sessions | Server-only environment variables (Vercel), never `VITE_`-prefixed, never committed; `.gitignore` updated for `.env*` before secrets exist locally |
| No re-validation of entitlement per gated request — checked once at login and assumed valid for the rest of the session | Access persists past cancellation, violating the "losing/cancelling immediately re-locks it" requirement | Per-request (or short-TTL cached, webhook-invalidated) entitlement check, not a session-lifetime claim |
| Loosening CSP with `'unsafe-inline'` or wildcard origins to unblock Stripe.js/Google Identity Services integration quickly | Reopens the exact XSS/injection surface the current strict CSP (`vercel.json`) was designed to prevent | Minimal, specific origin allowlisting only (`https://js.stripe.com`, `https://accounts.google.com`, and Stripe's iframe/frame-src needs); revisit `payment=()` Permissions-Policy deliberately for Stripe Elements/Checkout, don't blanket-remove it |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| User pays, lands on success page, sees "processing…" for an uncomfortably long or indefinite time because access is gated solely on webhook arrival | Feels broken/untrustworthy right after paying — the worst possible moment for a bad experience | Reconcile immediately in the success-page handler via a direct Stripe API re-fetch, with the webhook as background confirmation, not the only trigger |
| Cancelling a subscription in the Account page doesn't immediately reflect in what the user can access (stale cache, session claim) | Confusing — user thinks cancellation "didn't work" or, worse, thinks they still have access when they don't and are surprised later | Entitlement check must reflect webhook-driven state changes within seconds, not on next login |
| Sign-in is Google-only with no fallback messaging for users who don't have/want a Google account | Users without Google accounts are silently locked out with no explanation | Explicit, clear UI copy on why Google-only (already a deliberate product decision per PROJECT.md) — this is a scope decision, not a bug, but the UX should own it clearly rather than looking like a missing "other login options" bug |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Google sign-in:** Often missing `state` CSRF validation and post-login session regeneration — verify by attempting to replay an old `state` value or checking whether the session cookie value changes across login.
- [ ] **Stripe Checkout flow:** Often missing server-side re-verification of the success-page `session_id` — verify by manually crafting a `/success?session_id=fake_id` URL and confirming no access is granted.
- [ ] **Webhook handler:** Often missing raw-body signature verification, idempotency (event.id dedup), and handling of `customer.subscription.deleted`/`invoice.payment_failed` (not just the "happy path" `checkout.session.completed`) — verify by replaying the same event twice via the Stripe CLI and confirming no double-processing, and by triggering a test cancellation and confirming access is revoked.
- [ ] **Content gating:** Often missing actual server-side content withholding (still just client-side hiding) — verify by inspecting the raw network response / page source for a gated route while unauthenticated and confirming the protected content is genuinely absent, not just hidden.
- [ ] **Prerendered routes:** Often missing an explicit exclusion of gated/authenticated routes from the static prerender pass — verify by checking `dist/` output for any route that renders full protected content without requiring a request-time auth check.
- [ ] **Secrets boundary:** Often missing exclusion of `.env*` from `.gitignore`, or accidental `VITE_`-prefixing of a secret — verify by grepping the built `dist/` bundle for any known secret-key substrings before each deploy.
- [ ] **Immediate revocation:** Often missing — entitlement checked once and cached for the session lifetime instead of re-verified per gated request — verify by cancelling a test subscription and confirming the currently-logged-in session loses access without needing to log out/in.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| Discovering gated content leaking via prerendered HTML/JS bundle in production | HIGH | Immediately pull the affected build, add the route to the excluded-from-prerender list, redeploy; treat any content that was live as potentially scraped and assume it needs no further remediation beyond the fix (static content, not credentials) |
| Discovering a leaked secret in a shipped `VITE_`-prefixed bundle | HIGH | Rotate the leaked credential immediately (Stripe key, OAuth client secret) at the provider, redeploy with the secret removed from client code, audit for any unauthorized use during the exposure window |
| Duplicate webhook processing caused a double-grant or double-charge-adjacent side effect (e.g., duplicate confirmation email) | MEDIUM | Add the missing `event.id` uniqueness constraint, backfill a dedup table from Stripe's event log via the Stripe API/CLI if needed, manually reconcile affected user records |
| Stale entitlement (user kept access after cancelling) discovered in production | LOW–MEDIUM | Add/fix the webhook handler for `customer.subscription.deleted`, run a one-off reconciliation script that re-syncs all local subscription records against live Stripe state |
| CSRF/session-fixation gap discovered in OAuth flow before any known exploitation | LOW | Add `state` generation/validation and session regeneration; no user-facing recovery needed if caught pre-exploitation, but audit logs for suspicious login patterns during the exposure window |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Long-lived session claim treated as entitlement | Server-side session + entitlement architecture phase | Cancel a test subscription and confirm access is lost without logout/re-login |
| Checkout success vs. webhook race | Stripe Checkout + webhook-handling phases (designed together) | Manually delay/replay webhook via Stripe CLI and confirm success page still reconciles correctly |
| Webhook signature verification broken/skipped | Webhook-handling phase (first task) | Send a deliberately-tampered payload and confirm it's rejected; confirm raw-body middleware ordering |
| No webhook idempotency / ordering assumptions | Webhook-handling phase | Replay the same event twice via Stripe CLI; confirm single processing and correct final state regardless of replay order |
| OAuth CSRF / session fixation | Google OAuth integration phase | Attempt callback with a missing/mismatched/expired `state`; confirm session ID changes pre- vs. post-login |
| Secrets in Vite client bundle | Environment/config-layer setup phase (before OAuth/Stripe work begins) | Grep built `dist/` output for secret substrings before every deploy; confirm `.gitignore` covers `.env*` |
| Gated content present in prerendered HTML/JS bundle | Architecture/content-gating design phase (before touching `prerender.js`) | Inspect raw page source/network response for a gated route while unauthenticated |
| No test coverage for entitlement/webhook logic | Introduced alongside (not after) the auth/billing phases, per `CONCERNS.md` | Entitlement-check and webhook-handling test suites exist and cover duplicate/out-of-order event cases before the phase is considered done |

## Sources

- [Resolve webhook signature verification errors — Stripe Documentation](https://docs.stripe.com/webhooks/signature)
- [Receive Stripe events in your webhook endpoint — Stripe Documentation](https://docs.stripe.com/webhooks)
- [Stripe Webhooks: A Practical Guide to Getting Them Right — Webhook Watchtower](https://webhookwatchtower.co.uk/blog/stripe-webhook-guide)
- [Stripe Webhook Best Practices: Raw Body, Signatures & Retries — HookRay](https://hookray.com/blog/stripe-webhook-best-practices-2026)
- [Stripe Webhook Idempotency, the Production Pattern — The Road to Enterprise](https://theroadtoenterprise.com/blog/stripe-webhook-idempotency-production)
- [Handling duplicate events from Stripe in your webhook endpoint — Duncan Mackenzie](https://www.duncanmackenzie.net/blog/handling-duplicate-stripe-events/)
- [Stripe webhooks: idempotency, duplicates, and concurrency — Snowinch](https://www.snowinch.com/en/blog/stripe-webhook-idempotency-duplicates)
- [When /success Beats the Webhook: Stripe Checkout's Hidden Race — GembaPay Blog](https://gembapay.com/blog/stripe-checkout-success-webhook-race-condition)
- [I've Reviewed a Dozen Next.js Stripe Integrations. Almost None Handle This Race Condition. — DEV Community](https://dev.to/anas_sheikh_2/ive-reviewed-a-dozen-nextjs-stripe-integrations-almost-none-handle-this-race-condition-26i9)
- [The Race Condition You're Probably Shipping Right Now With Stripe Webhooks — DEV Community](https://dev.to/belazy/the-race-condition-youre-probably-shipping-right-now-with-stripe-webhooks-mj4)
- [Prevent CSRF Attacks in OAuth 2.0 Implementations — Auth0 Blog](https://auth0.com/blog/prevent-csrf-attacks-in-oauth-2-implementations/)
- [Prevent Attacks and Redirect Users with OAuth 2.0 State Parameters — Auth0 Docs](https://auth0.com/docs/secure/attack-protection/state-parameters)
- [How do I handle OAuth2 state parameter validation to prevent CSRF attacks? — CIAM Q&A](https://mojoauth.com/ciam-qna/how-to-handle-oauth2-state-parameter-validation-prevent-csrf)
- [Vite Environment Variables: Complete Configuration & Security Guide — Reintech](https://reintech.io/blog/vite-environment-variables-configuration-security)
- [Environment (.env) files and .gitignore — vitejs/vite Discussion #22287](https://github.com/vitejs/vite/discussions/22287)
- [Improve clarity around VITE_* exposure to client — vitejs/vite Issue #21592](https://github.com/vitejs/vite/issues/21592)
- [Hunting Secrets in JavaScript: Vite Misconfiguration Leads to Full CI/CD Compromise — Sprocket Security](https://www.sprocketsecurity.com/blog/hunting-secrets-in-javascript-at-scale-how-a-vite-misconfiguration-lead-to-full-ci-cd-compromise)
- [Comparing server-side and client-side paywall technology — A Media Operator](https://www.amediaoperator.com/analysis/comparing-server-side-and-client-side-paywall-methods/)
- [Bypassing Paywalls with Client-Side JavaScript Manipulation — Medium](https://medium.com/@salt.creative/bypassing-paywalls-with-client-side-javascript-manipulation-a-technical-exploration-0f5759d04488)
- [Handle payment events with webhooks — Stripe Documentation](https://docs.stripe.com/webhooks/handling-payment-events)
- [Using webhooks with subscriptions — Stripe Documentation](https://docs.stripe.com/billing/subscriptions/webhooks)
- Project-internal: `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md` (this repo's own audit of the existing fake paywall and missing env/secrets layer)

---
*Pitfalls research for: Google OAuth + Stripe subscription billing + content gating on an existing static SPA (Éclat)*
*Researched: 2026-09-08*
