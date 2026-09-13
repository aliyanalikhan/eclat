# Éclat

## What This Is

Éclat is a quarterly-style magazine and children's-book publishing site for the LaDidiér brand, currently built as a prerendered React SPA with no backend, no database, and no real accounts. This milestone turns it into a real subscriber product: readers sign in with Google, subscribe via Stripe, and get real per-user access to gated content — replacing the current client-side demo paywall (a `subscribed` flag in localStorage that anyone can flip in devtools).

## Core Value

A signed-in subscriber's paid access is real and enforced server-side — no page, download, or API response leaks paid content to someone who hasn't actually paid for it.

## Current Milestone: v1.1 Mobile Responsive Design

**Goal:** Every page and interactive overlay on the site is fully usable and visually correct at phone-portrait widths (~375–430px), replacing the current desktop-first layout that breaks on real mobile devices.

**Target features:**
- Home page (hero fan carousel, Cultural Icons section, Videos section, drag-scroll strips) renders correctly on phone widths
- Archive / Edition / Books / Writings listing grids and detail pages are usable on phone widths — no horizontal scroll, readable text, tappable controls
- Magazine preview page-flip modal and Lightbox zoom overlay work correctly on phone-width touch screens
- Subscribe pricing picker, sign-in, Account panels, and Stripe billing portal redirect are usable on phone widths
- Global chrome (header/nav, footer) works correctly on phone widths across all of the above

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
- ✓ User can sign in with Google (no email/password option — Google is the only sign-in method) — Phase 2
- ✓ User's session is verified server-side (jose-verified ID token, opaque hashed session cookie, DB-backed session lookup on every `/api/auth/session` call) — Phase 2
- ✓ User can subscribe to any of the 4 existing Stripe products (ÉCLAT Online/Hard Copy, Children's Book Online/Hard Copy) via Stripe Checkout — Phase 3
- ✓ User's subscription status is kept in sync via verified Stripe webhooks (signature-checked), not by trusting the client — Phase 3
- ✓ No Stripe secret key, webhook secret, or Google OAuth client secret is ever exposed to client-side code — enforced by `scripts/check-secrets.js` gating every `npm run build`; verified Phase 3
- ✓ All money-related actions (checkout session creation, webhook handling, entitlement checks) happen server-side only — Phase 3
- ✓ Gated content (edition excerpt paragraphs, paywalled writings) is served/rendered based on the user's real, server-verified entitlement — replacing the `subscribed` localStorage flag entirely — Phase 4 (code-complete; human UAT still pending, see STATE.md Blockers)
- ✓ User can manage their subscription (view status, cancel) from the Account page, backed by real Stripe data instead of mocked invoices/plan — Phase 5 (code-complete; human UAT still pending, see STATE.md Blockers)
- ✓ Losing/cancelling a subscription revokes access to gated content on the next request — Phase 4/5 (code-complete; human UAT still pending, see STATE.md Blockers)

### Active

- [ ] Home page (hero fan, Cultural Icons, Videos, drag-scroll strips) is fully usable and visually correct at phone-portrait widths
- [ ] Archive / Edition / Books / Writings listing and detail pages are fully usable at phone-portrait widths (no horizontal scroll, readable text, tappable controls)
- [ ] Magazine preview page-flip modal and Lightbox zoom overlay work correctly on phone-width touch screens
- [ ] Subscribe pricing picker, sign-in, Account panels, and Stripe billing portal redirect are usable at phone-portrait widths
- [ ] Header/nav and footer render and function correctly at phone-portrait widths across every page

### Out of Scope

- White-label multi-tenant platform (separate branded sites for other publishers/businesses) — explicitly not what "multi-tenant" meant here; this is a single-brand product with many individual user accounts
- Email/password sign-in — Google-only by deliberate choice, avoids password storage/reset/leak surface entirely
- New pricing or new Stripe products — reusing the 4 products that already exist in the live Stripe account
- Building/rotating Google OAuth or Stripe credentials — both already exist and will be supplied as environment variables during implementation, never pasted into chat or committed to the repo
- Tablet/desktop layout changes — this milestone targets phone-portrait widths (~375–430px) only; tablet and landscape are not in scope unless a phone-portrait fix requires touching a shared breakpoint

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
- **Phase 2 complete (2026-09-09):** Google OAuth sign-in and server-side sessions are live: `api/auth/google.js` + `api/auth/google/callback.js` handle the full authorization-code flow (jose-verified ID token, constant-time state check, `isSafeReturnTo` open-redirect guard), sessions are opaque tokens hashed before storage (`lib/session.js`, `sessions.token_hash`), `middleware.js` does a cheap cookie-presence pre-filter for `/account` while `api/auth/session.js` is the real DB-backed entitlement check, and the header/`Account.jsx`/`App.jsx` are fully auth-aware with no more mocked sign-in state. 24/24 automated must-have truths verified plus 5/5 human UAT checks passed. Security review (`02-SECURITY.md`) closed 14 STRIDE threats (9 mitigated, 5 accepted) with `threats_open: 0`. One cosmetic carry-forward: `.env.example` still documents an unused `SESSION_SECRET=` line (WR-07, blocked by a sandbox permission restriction during the fix pass — not a functional issue, `hashToken()` uses plain SHA-256 by design).
- **Phase 3 complete (2026-09-09):** Real Stripe Checkout + signature-verified webhook sync are live: `lib/stripe.js` (server-only client) and `lib/products.js` (4-slug price allowlist) back `api/billing/checkout.js` (server-initiated redirect, re-verifies session + existing subscription before ever calling Stripe), `api/billing/status.js`, `api/billing/prices.js` (public price facts, zero price-ID leakage), and `api/billing/webhook.js` (raw-body signature verification, `webhook_events`-PK idempotency inside a real DB transaction, dispatches `checkout.session.completed`/subscription lifecycle/`invoice.payment_failed`→`past_due`). `/subscribe` is a real 4-tile picker with live prices and independent per-product ownership state (D-05); `/subscribe/success` only flips to success on an observed webhook-synced row (D-07), never on the redirect alone. D-02 resolved live against the real Stripe account: all 4 products carry monthly + annual prices (branch B), embedded in `migrations/0004_billing_stripe_price_id.sql` + `lib/products.js`. 16/17 automated must-have truths verified plus all 4 human UAT checks passed, including a real Stripe Checkout completion. Security review (`03-SECURITY.md`) closed 19 STRIDE threats (16 mitigated, 3 accepted) with `threats_open: 0`. Code review (`03-REVIEW.md`) found 0 critical/10 warnings/4 info — none blocking; notable open items for Phase 4/5 to be aware of: no idempotency key on Checkout Session creation (double-click risk), no event-ordering guard on subscription webhooks, and a `past_due` picker UX dead-end. **This phase ran against the LIVE production Stripe account (not test mode)** — an explicit, informed decision made by the user after being warned of the risk (real charges, real webhook effects); see Key Decisions.

## Constraints

- **Tech stack**: Must build on the existing Vite + React + React Router SPA rather than a rewrite in a different framework — the public site's design, routing, and content model stay as-is
- **Hosting**: Backend work should fit the existing Vercel deployment (`vercel.json` already present) — serverless/Edge functions plus a managed database, not a self-hosted server
- **Credentials**: Google OAuth client and Stripe API keys already exist and must be supplied via environment variables at implementation time — never invented, requested in chat, or committed to the repo
- **Security**: Standard best practice is the bar — server-side sessions, Stripe webhook signature verification, no secrets in client-shipped code, real per-request entitlement checks server-side (no client-trusted gating)
- **Billing products**: Reuse the 4 existing Stripe products/prices as-is rather than creating new ones

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Google-only sign-in (no email/password) | Avoids password storage, reset flows, and credential-leak surface entirely; user explicitly chose this over adding password auth | ✓ Applied — Phase 2 |
| Session token stored as SHA-256 hash, raw value only ever in an httpOnly/Secure cookie | A DB read/dump alone can never be replayed as a live session; matches D-12 from Phase 2 planning | ✓ Applied — Phase 2 |
| Full rebuild rather than bolt-on accounts layer | User wants the real site's gated content (editions/books/writings) to actually be protected, not just an added account page on top of a still-fake paywall | — Pending |
| Backend on Vercel serverless/Edge + managed DB | Fits the existing Vercel deployment with minimal new infra to operate; specific DB provider to be decided during research | ✓ Applied — Phase 1 |
| Reuse existing Stripe products instead of new pricing | 4 real recurring subscription products already exist in the live Stripe account (magazine + children's book, each online/hard-copy) | ✓ Applied — Phase 3 |
| "Multi-tenant" clarified to mean multi-user, single brand | Initial request used "multi-tenant" loosely; user confirmed it means many individual reader accounts on one Éclat product, not a white-label platform for other businesses | ✓ Good |
| `users.id` is `BIGINT`, not `UUID` | Phase 1 execution discovered a live Vercel Postgres database (~7 days old, prior out-of-band work on this same project) already had a `users` table with a `BIGINT` identity PK and 2 real rows, plus an `addresses` table. User confirmed this was intentional prior work and chose to adopt it as canonical rather than drop the data. Reverses the original UUID-PK decision (Phase 1 CONTEXT.md D-08). | ✓ Applied — Phase 1 |
| D-02: each of the 4 Stripe products has monthly + annual prices, not one fixed price (branch B) | Resolved live against the real Stripe account in Phase 3 Task 1 (`stripe.prices.list`), before any billing code was written — RESEARCH.md could not resolve this in advance (sandbox blocked `.env.local` access) | ✓ Applied — Phase 3 |
| Phase 3 executed against the LIVE production Stripe account, not test mode | User explicitly chose this after being warned it means real charges/real webhook effects against production data (no test-mode key was available at the time); the user separately confirmed the Checkout round-trip with a real purchase during Phase 3 UAT | ✓ Applied — Phase 3 |

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
*Last updated: 2026-09-13 after starting milestone v1.1 (Mobile Responsive Design)*
