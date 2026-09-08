# Éclat

## What This Is

Éclat is a quarterly-style magazine and children's-book publishing site for the LaDidiér brand, currently built as a prerendered React SPA with no backend, no database, and no real accounts. This milestone turns it into a real subscriber product: readers sign in with Google, subscribe via Stripe, and get real per-user access to gated content — replacing the current client-side demo paywall (a `subscribed` flag in localStorage that anyone can flip in devtools).

## Core Value

A signed-in subscriber's paid access is real and enforced server-side — no page, download, or API response leaks paid content to someone who hasn't actually paid for it.

## Business Context

- **Customer**: Individual readers/subscribers of ÉCLAT magazine and the LaDidiér children's books — not businesses or other publishers (this is a single-brand, multi-*user* product, not a multi-tenant/white-label platform)
- **Revenue model**: Recurring Stripe subscriptions across 4 existing products — ÉCLAT magazine (Online / Hard Copy) and Children's Book (Online / Hard Copy)
- **Success metric**: A subscriber can sign in with Google, subscribe via Stripe, and immediately see real content unlock — and losing/cancelling a subscription immediately re-locks it
- **Strategy notes**: —

## Requirements

### Validated

- ✓ Prerendered React SPA (Vite + React Router + SSR prerender step) serving the public magazine/books/writings content — existing
- ✓ Content data model (`src/data/content.js`) covering editions, books, writings, articles — existing
- ✓ Stripe account and 4 real recurring subscription products already created (product IDs known) — existing, external to this codebase
- ✓ Google OAuth client already created — existing, external to this codebase
- ✓ Server-side secrets boundary and database schema (users, sessions, subscriptions, webhook_events, addresses) — provisioned on Vercel Postgres, enforced by a build-time secret-leak scanner in `npm run build` — Phase 1

### Active

- [ ] User can sign in with Google (no email/password option — Google is the only sign-in method)
- [ ] User's session is verified server-side on every request that serves gated content (not trusted from the client)
- [ ] User can subscribe to any of the 4 existing Stripe products (ÉCLAT Online/Hard Copy, Children's Book Online/Hard Copy) via Stripe Checkout
- [ ] User's subscription status is kept in sync via verified Stripe webhooks (signature-checked), not by trusting the client
- [ ] Gated content (edition full issues, book full spreads, paywalled writings) is served/rendered based on the user's real, server-verified entitlement — replacing the current `subscribed` localStorage flag entirely
- [ ] User can manage their subscription (view status, cancel) from the Account page, backed by real Stripe data instead of the current mocked invoices/plan
- [ ] Losing/cancelling a subscription immediately revokes access to gated content on the next request
- [ ] No Stripe secret key, webhook secret, or Google OAuth client secret is ever exposed to client-side code
- [ ] All money-related actions (checkout session creation, webhook handling, entitlement checks) happen server-side only

### Out of Scope

- White-label multi-tenant platform (separate branded sites for other publishers/businesses) — explicitly not what "multi-tenant" meant here; this is a single-brand product with many individual user accounts
- Email/password sign-in — Google-only by deliberate choice, avoids password storage/reset/leak surface entirely
- New pricing or new Stripe products — reusing the 4 products that already exist in the live Stripe account
- Building/rotating Google OAuth or Stripe credentials — both already exist and will be supplied as environment variables during implementation, never pasted into chat or committed to the repo

## Context

- The site is currently 100% static: `README.md` states "No build-time secrets, no server, no database" — this milestone is the first time the project gets a real backend.
- A full parallel codebase map exists at `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS — mapped 2026-09-08). Key findings that shape this milestone:
  - `src/store.jsx` currently holds a `subscribed` boolean persisted to `localStorage` and read by `Edition.jsx`, `Archive.jsx`, `Books.jsx`, and `Account.jsx` to decide what to show. This is explicitly a demo and must not be reused as real entitlement logic.
  - No test framework exists anywhere in the repo — needs to be established from scratch, especially given this milestone adds security-sensitive auth/billing code.
  - The prerendering pipeline (`prerender.js`, `src/entry-server.jsx`) prerenders public routes at build time; it is not designed for per-user gated content and will need a deliberate split between what stays statically prerendered (marketing/public pages) and what becomes dynamically rendered per authenticated user.
  - `vercel.json` / `public/_headers` already carry a fairly strict CSP and security-header baseline. It will need careful, minimal loosening to allow Google Identity Services and Stripe.js origins — not a wholesale relaxation.
  - No secrets were found committed anywhere in the current repo.
- Real Stripe product IDs (safe to reference in planning docs — these are product identifiers, not secret keys):
  - ÉCLAT magazine — Online: `prod_VAyHWfX8XdHh2z`
  - ÉCLAT magazine — Hard Copy: `prod_VAyJTIfn7UVWi3`
  - Children's Book — Online: `prod_VCuT7Wcy4yQDrc`
  - Children's Book — Hard Copy: `prod_VCuJDGHg6vxcE6`
- Existing pricing shown on `/subscribe` ($9/mo, $84/year) is currently just UI copy tied to no real billing — it should be reconciled with whatever the actual prices are on the 4 Stripe products above during implementation.
- **Phase 1 complete (2026-09-08):** Server-side secrets boundary, Postgres schema, and a build-time secret-leak scanner are live and verified against the real, already-provisioned Vercel Postgres database. Discovered mid-phase that this Vercel project already had prior out-of-band work done on it (a `users`/`addresses` schema with 2 real rows, plus `GOOGLE_CLIENT_ID`/`STRIPE_SECRET_KEY`/`SESSION_SECRET` env vars already set, ~7 days old) — confirmed intentional by the user. **Phase 2/3 planning should explicitly check for other pre-existing artifacts (partial auth/billing code, other tables/routes) rather than assuming a blank slate**, since this milestone's actual starting point is not as clean as the original codebase map assumed.

## Constraints

- **Tech stack**: Must build on the existing Vite + React + React Router SPA rather than a rewrite in a different framework — the public site's design, routing, and content model stay as-is
- **Hosting**: Backend work should fit the existing Vercel deployment (`vercel.json` already present) — serverless/Edge functions plus a managed database, not a self-hosted server
- **Credentials**: Google OAuth client and Stripe API keys already exist and must be supplied via environment variables at implementation time — never invented, requested in chat, or committed to the repo
- **Security**: Standard best practice is the bar — server-side sessions, Stripe webhook signature verification, no secrets in client-shipped code, real per-request entitlement checks server-side (no client-trusted gating)
- **Billing products**: Reuse the 4 existing Stripe products/prices as-is rather than creating new ones

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Google-only sign-in (no email/password) | Avoids password storage, reset flows, and credential-leak surface entirely; user explicitly chose this over adding password auth | — Pending |
| Full rebuild rather than bolt-on accounts layer | User wants the real site's gated content (editions/books/writings) to actually be protected, not just an added account page on top of a still-fake paywall | — Pending |
| Backend on Vercel serverless/Edge + managed DB | Fits the existing Vercel deployment with minimal new infra to operate; specific DB provider to be decided during research | — Pending |
| Reuse existing Stripe products instead of new pricing | 4 real recurring subscription products already exist in the live Stripe account (magazine + children's book, each online/hard-copy) | — Pending |
| "Multi-tenant" clarified to mean multi-user, single brand | Initial request used "multi-tenant" loosely; user confirmed it means many individual reader accounts on one Éclat product, not a white-label platform for other businesses | ✓ Good |
| `users.id` is `BIGINT`, not `UUID` | Phase 1 execution discovered a live Vercel Postgres database (~7 days old, prior out-of-band work on this same project) already had a `users` table with a `BIGINT` identity PK and 2 real rows, plus an `addresses` table. User confirmed this was intentional prior work and chose to adopt it as canonical rather than drop the data. Reverses the original UUID-PK decision (Phase 1 CONTEXT.md D-08). | ✓ Applied — Phase 1 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-08 after Phase 1 completion*
