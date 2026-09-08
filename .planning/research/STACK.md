# Stack Research

**Domain:** Adding real accounts + billing (Google Sign-In, Stripe subscriptions, server-side entitlement) to an existing static/prerendered Vite + React SPA on Vercel
**Researched:** 2026-09-08
**Confidence:** MEDIUM (web-sourced, cross-checked across multiple independent 2026 sources including Vercel/Google/Stripe/Neon/Drizzle official docs; no single-source claims treated as fact)

## Context This Research Assumes

Existing, validated, DO NOT re-research: Vite 5 + React 18 + React Router 6 prerendered SPA deployed as static `dist/` on Vercel (`vercel.json` present, strict CSP). No backend, no DB, no auth exist today (see `.planning/codebase/STACK.md`, `ARCHITECTURE.md`). This document covers ONLY the net-new backend slice: Google-only sign-in, server-side sessions, Stripe Checkout + webhooks, and a database — deployed as Vercel Functions alongside the existing static build, not a rewrite of the frontend framework.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel Functions (Node.js runtime) | Node 22.x | Serverless backend for auth callbacks, Stripe checkout/webhooks, entitlement API | Zero new infra: any file under `/api` in the repo root becomes a serverless endpoint automatically, deployed by the exact same `vercel.json`/Vercel project already in place. Node 22.x is Vercel's current default for new projects (20.x is being deprecated Oct 1, 2026); no framework migration needed — this bolts onto the existing static build rather than replacing it. |
| Google Identity Services (GIS) + `google-auth-library` | GIS: current web SDK (script-loaded, no npm version); `google-auth-library` ^10.x (Node, server-side verification) | Google-only sign-in with server-verified identity | This is Google's own current recommended pattern (not the deprecated old Google Sign-In JS library): the browser loads GIS, renders the "Sign in with Google" button, and gets back a signed JWT ID token — no OAuth redirect dance, no client secret in the browser. The **server** independently verifies that JWT's signature/`aud`/`exp`/`iss` via `google-auth-library`'s `verifyIdToken()` before trusting it, and uses the token's `sub` claim (not email) as the permanent user identifier. This satisfies the project's hard requirement that server-side verification, not client trust, gates access. |
| `stripe` (Node SDK) | ^22.x (22.6.1 confirmed current as of Sept 2026) | Checkout Sessions + webhook signature verification, server-side only | Official SDK, required for the project's "no secrets in client code, all money actions server-side" constraint. `stripe.checkout.sessions.create()` (mode: `subscription`, existing price IDs) hands off to Stripe-hosted Checkout so card data never touches this origin. `stripe.webhooks.constructEvent()` verifies webhook signatures with constant-time comparison — never hand-roll this. |
| `@stripe/stripe-js` | ^9.x (9.15.0 confirmed current) | Client-side redirect to Stripe Checkout | Thin, official loader for `stripe.js` — only used to call `redirectToCheckout`/mount Checkout; carries no secret keys, safe to ship to the browser. |
| Neon (Postgres) | Serverless Postgres (managed) | User records, session/account linkage, subscription/entitlement state | Vercel retired its own "Vercel Postgres" product (migrated to Neon, Dec 2024); Neon is now the first-party Postgres option in the Vercel Marketplace with one-click project linking + env var injection. Its HTTP-based serverless driver needs no persistent TCP connection pool, which matches Vercel Functions' cold-start-per-invocation model far better than a traditional pooled Postgres client would. Scale-to-zero pricing fits a small single-brand subscriber app (this is not a high-traffic multi-tenant platform). |
| `drizzle-orm` + `@neondatabase/serverless` | `drizzle-orm` ^0.x current, `@neondatabase/serverless` ^0.x current (pin exact via `npm view` at install time) | Type-safe SQL schema + queries against Neon from serverless functions | Drizzle's near-zero bundle size (~7KB gzip) and zero runtime dependencies keep Vercel Function cold starts fast (roughly 100–300ms vs Prisma's larger footprint even after Prisma 7's engine rewrite narrowed the gap). Drizzle's SQL-shaped API is also a good match for a small, well-understood schema (users, subscriptions) — no need for Prisma's heavier migration/generator tooling here. Neon publishes a `drizzle-orm/neon-http` adapter specifically for this pairing. |
| `iron-session` | ^8.x (8.0.4) | Stateless, encrypted-cookie server-side session | Seals session data (the verified Google `sub`/user id) into an encrypted, signed cookie — no server-side session store/table needed, which fits serverless functions well (nothing to keep alive between invocations). The library hasn't shipped a new release in ~2 years but is feature-complete for this exact job (encrypt/decrypt a small JSON payload in a cookie) and is framework-agnostic (works directly against Vercel Functions' Node request/response, not just Next.js). Every gated request still re-checks live entitlement from Neon — the cookie only proves *who*, not *what they're allowed*. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `micro` or plain Node `http` body handling | latest | Reading the **raw** request body for Stripe webhook signature verification | Vercel Functions parse JSON bodies by default; Stripe's `constructEvent()` requires the raw, unparsed body bytes. Either disable Vercel's automatic body parsing for the webhook route (config export) or read the raw stream manually — required, not optional, or signature verification will always fail. |
| `drizzle-kit` | matching `drizzle-orm` minor | Schema migrations | Dev-time only (`npm run db:generate`/`db:migrate`); not part of the deployed function bundle. |
| `dotenv` | latest | Local dev env var loading | Dev-only; Vercel injects env vars natively in deployed environments, `dotenv` is for `vercel dev`/local scripts only. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vercel CLI (`vercel dev`) | Local emulation of `/api` functions + env vars | Already implied by the existing `vercel.json`; use this instead of a separate Express dev server so local behavior matches production Functions behavior (Web-standard `Request`/`Response`, same routing). |
| Stripe CLI (`stripe listen --forward-to`) | Forward real Stripe webhook events to `localhost` during development | Required to test webhook signature verification end-to-end before relying on the live webhook endpoint; also prints the local-mode signing secret to use in dev. |

## Installation

```bash
# Core backend deps (install into the existing repo — no new project/scaffold)
npm install google-auth-library stripe @stripe/stripe-js iron-session
npm install drizzle-orm @neondatabase/serverless
npm install @react-oauth/google

# Dev dependencies
npm install -D drizzle-kit dotenv
```

`@react-oauth/google` (currently 0.13.5) is an optional but recommended thin React wrapper around GIS — it manages script loading and exposes a `<GoogleLogin>` component/hook idiomatically for React instead of hand-rolling `<script>` injection and global callbacks. It only wraps the client-side button/One Tap flow; server-side verification still goes through `google-auth-library`, independently.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Google Identity Services + `google-auth-library` (ID-token verification) | Auth.js (`@auth/core`) with a Google provider | If the project were expected to grow into multi-provider auth (GitHub, email magic links, etc.) later, Auth.js's provider abstraction and adapter ecosystem would pay for its extra complexity. Here, sign-in is Google-only by explicit, permanent product decision — Auth.js's session/adapter machinery would be net overhead for a single provider. |
| Google Identity Services + `google-auth-library` | Arctic (generic OAuth 2.0 client library) | Would apply for a full authorization-code OAuth flow against an arbitrary provider. Not recommended here regardless of preference: Arctic was deprecated by its maintainer in July 2026 with no direct successor, only "compose jose + oslo yourself" guidance — avoid starting a new dependency on a deprecated package. |
| Neon (serverless Postgres) | Supabase | Choose Supabase if the project also wanted built-in file storage, realtime subscriptions, or wanted auth/DB bundled from one vendor. This project has bespoke Google-only auth requirements and only needs relational storage for users/subscriptions — Neon's leaner scope and scale-to-zero pricing is the better fit and avoids paying for/operating unused Supabase surface area. |
| Drizzle ORM | Prisma | Choose Prisma if the team prefers Prisma's schema-first DX, richer migration tooling, and generated client, and cold-start latency is not a first-order concern. Prisma 7's WASM query engine rewrite narrowed the gap versus Drizzle considerably, so this is a legitimate DX-vs-latency tradeoff, not a correctness issue either way. |
| `iron-session` | Auth.js session/JWT handling, or a DB-backed session table | A DB-backed session table would let you force-revoke a single session instantly (e.g., "sign out everywhere"); iron-session's stateless cookie can only be invalidated by rotating the secret (revokes all sessions) or by short expiry + re-issuing. Given this app's entitlement check already re-queries Neon on every gated request (subscription status must always be live-checked per the project's requirements), a DB-backed session adds an extra table without adding real revocation value beyond what a short cookie TTL + live entitlement check already provides. Revisit only if per-device sign-out becomes a hard requirement. |
| Vercel Functions (Node.js runtime) for all backend routes | Vercel Edge Functions | Edge is worth using selectively later (e.g., a lightweight entitlement-check middleware) for lower latency, but the Stripe webhook endpoint specifically should stay on the Node.js runtime — it needs the raw request body and Stripe SDK APIs that have historically had friction under Edge's more restricted runtime. Keep it simple: Node.js runtime for all new `/api` routes in this milestone; consider Edge as a later optimization, not a v1 decision. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Continuing to use `src/store.jsx`'s `subscribed` boolean/`localStorage` for any real gating | This is an explicitly-labeled demo flag with zero server enforcement — literally the thing this milestone exists to replace. Any code path that still trusts it for real content delivery reintroduces the exact vulnerability the project requirements call out. | Server-verified session (iron-session cookie) + live entitlement lookup against Neon on every request that serves gated content. |
| Arctic (OAuth client library) | Deprecated by its maintainer in July 2026; no ongoing maintenance, no direct successor package. | Google Identity Services (browser) + `google-auth-library` (server) — purpose-built for exactly this single-provider case and actively maintained by Google. |
| Hand-rolled Stripe webhook signature checking (manual HMAC) | Easy to get wrong (timing-attack-safe comparison, timestamp tolerance, header parsing) — Stripe explicitly warns against this. | `stripe.webhooks.constructEvent()` from the official SDK. |
| Prisma's default connection-pooled Postgres client (`@prisma/client` over a raw TCP pool) in a Vercel serverless function without a pooler | Serverless functions can spin up many concurrent short-lived invocations; a naive pooled TCP client can exhaust Postgres connection limits quickly. | Neon's HTTP-based serverless driver (`@neondatabase/serverless`) via `drizzle-orm/neon-http`, which uses stateless HTTP requests instead of held connections. |
| Trusting the Stripe Checkout success-page redirect to grant access | The browser can close/lose connection before the redirect completes; this is not a reliable payment-confirmation signal. | Grant/update entitlement only from verified webhook events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`). |
| Leaving `vercel.json`'s current `script-src 'self'` / `connect-src 'self'` CSP untouched | It will silently block both the Google Identity Services script and Stripe.js — auth and checkout will appear to just not work, with no obvious error surfaced to the user. | Minimally extend CSP: `script-src` add `https://accounts.google.com/gsi/client` and `https://js.stripe.com`; `frame-src` add `https://accounts.google.com/gsi/` and `https://js.stripe.com`; `connect-src` add `https://accounts.google.com/gsi/` and `https://api.stripe.com`. Keep everything else `'self'`-scoped — this is a targeted allowlist addition, not a CSP relaxation. (Full CSP diff is an implementation/architecture detail for the phase that touches `vercel.json`, not a stack choice.) |

## Stack Patterns by Variant

**Given this is a single-brand app with exactly 4 fixed Stripe products (not a self-serve pricing/plan builder):**
- Store Stripe `price_id`/`product_id` as constants (env vars or a small server-side config module), not as DB-editable data
- Because there's no requirement to let admins create new plans — reusing the 4 existing products/prices as-is is an explicit constraint, so the DB only needs to store *which* product/price a user is subscribed to and its live status, not a plans table

**Given the site's public marketing/content pages must stay prerendered/fast, while `/account` and gated content become per-user dynamic:**
- Keep `prerender.js`'s existing build-time output for all public routes (`/`, `/archive`, `/writings`, etc.) unchanged
- Add new dynamic `/api/*` Vercel Functions for auth, checkout, webhooks, and an entitlement-check endpoint that gated route components call at runtime (client-side fetch after hydration, or a thin per-request check) — this is additive to the existing static build, not a replacement of the prerender pipeline

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `drizzle-orm` (neon-http adapter) | `@neondatabase/serverless` | Use `drizzle-orm/neon-http` import path specifically for Vercel Functions (HTTP driver); the WebSocket driver variant is for cases needing multi-statement transactions, which this schema (users/subscriptions) is unlikely to require. |
| `stripe` (Node SDK) v22.x | Stripe API version pinning | Stripe's API is date-versioned; pin the same API version string in both the Stripe Dashboard settings and the SDK's `apiVersion` init option to avoid silent behavior drift when Stripe ships a new default API version. |
| Vercel Functions Node runtime | Node 22.x | Set explicitly in Vercel Project Settings (or `vercel.json`/`package.json` `engines`) rather than relying on the default, since Vercel is actively deprecating Node 20.x (Oct 1, 2026) — pin to 22.x now to avoid a forced migration mid-project. |
| Google Identity Services (browser script) | `google-auth-library` (server) | These are independent: GIS is a browser-loaded script (no npm package, no version to pin — Google serves it directly from `accounts.google.com`), `google-auth-library` is the separate Node package used only server-side to verify the token GIS produced. Don't confuse this with the older, now-legacy Google Sign-In JS library. |

## Sources

- https://vercel.com/docs/functions/runtimes/node-js — Vercel Functions Node.js runtime, confirmed via WebSearch (MEDIUM confidence, cross-checked)
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions — Node 22.x default, Node 20.x deprecation date
- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token — server-side ID token verification guidance (Google official docs)
- https://developers.google.com/identity/sign-in/web/backend-auth — backend auth pattern for GIS
- https://github.com/googleapis/google-auth-library-nodejs — `google-auth-library` package, `verifyIdToken()`
- https://www.npmjs.com/package/@react-oauth/google — React GIS wrapper, version 0.13.5 confirmed
- https://arcticjs.dev/ , https://pilcrowonpaper.com/blog/18 — Arctic OAuth library deprecation (July 2026)
- https://docs.stripe.com/billing/subscriptions/build-subscriptions — Stripe subscriptions build guide
- https://www.npmjs.com/package/stripe , https://www.npmjs.com/package/@stripe/stripe-js — current SDK versions (22.6.1 / 9.15.0)
- https://docs.stripe.com/security/guide — Stripe integration security guidance (webhook verification, never trust redirect)
- https://neon.com/docs/serverless/serverless-driver , https://orm.drizzle.team/docs/connect-neon — Neon HTTP serverless driver + Drizzle adapter
- https://orm.drizzle.team/docs/tutorials/drizzle-with-vercel-edge-functions — Drizzle + Vercel setup pattern
- Vercel Postgres → Neon migration (Dec 2024), confirmed via multiple 2026 comparison sources (dev.to, buildmvpfast.com, tech-insider.org)
- Drizzle vs Prisma cold-start comparison — cross-checked across multiple independent 2026 comparison articles (makerkit.dev, dev.to, alexcloudstar.com); treated as directionally reliable (MEDIUM), not benchmark-verified first-hand
- https://www.npmjs.com/package/iron-session — version 8.0.4, last published ~2 years ago; functionally stable for this use case
- CSP directives for Google Identity Services and Stripe.js — cross-checked across Google developer docs and Stripe/community CSP guides (MEDIUM confidence; exact header values should be verified against `vercel.json`'s current CSP syntax during implementation)

---
*Stack research for: Google Sign-In + Stripe subscription billing backend on an existing Vercel-hosted Vite/React SPA*
*Researched: 2026-09-08*
