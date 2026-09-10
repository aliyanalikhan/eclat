# Roadmap: Éclat

## Overview

Éclat goes from a static prerendered demo (fake `subscribed` flag anyone can flip in devtools) to a real subscriber product. The five phases build strictly as horizontal technical layers, each one a complete, testable foundation the next layer depends on: first the environment/secrets/database foundation, then real Google authentication with server-side sessions, then Stripe Checkout and webhook-driven subscription sync, then server-side content gating that replaces the fake paywall everywhere it lives, and finally the Account page surfaced with real Stripe-backed status, cancellation, and billing history. By the end, a signed-in subscriber's paid access is real and enforced server-side on every request — no page, download, or API response leaks paid content to someone who hasn't actually paid for it.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation — Environment, Secrets & Data Layer** - Server-only secrets boundary and database schema in place before any auth or billing code exists (completed 2026-09-08)
- [x] **Phase 2: Authentication — Google Sign-In & Server-Side Sessions** - Users sign in with Google only, verified server-side, with persistent sessions (completed 2026-09-09)
- [x] **Phase 3: Billing & Webhooks — Stripe Checkout and Subscription Sync** - Users subscribe via Stripe Checkout; webhook-verified events are the single source of truth for subscription state (completed 2026-09-09)
- [ ] **Phase 4: Content Gating — Real Server-Side Entitlement Enforcement** - Every gated page checks real per-user entitlement server-side; the fake `subscribed` flag is gone (pending human verification — see 04-UAT.md)
- [ ] **Phase 5: Account Management — Real Status, Cancellation & Billing Portal** - The Account page shows real subscription status, invoices, and payment-failure notices, backed by Stripe (all 3 confirmed gaps closed + 1 emergent critical bug fixed — 5/5 must-haves verified, pending human verification — see 05-UAT.md)

## Phase Details

### Phase 1: Foundation — Environment, Secrets & Data Layer

**Goal**: The project has a secure server-side foundation — secrets never reach the client, and a database schema exists to back sessions, users, and subscriptions — before any auth or billing code is written.
**Depends on**: Nothing (first phase)
**Requirements**: ENV-01, ENV-02
**Success Criteria** (what must be TRUE):

  1. All server-side secrets (Google OAuth client secret, Stripe secret key, Stripe webhook signing secret, session encryption key) are read only from server-side environment variables, with zero occurrences of any secret substring in the built client bundle
  2. Local env files (`.env`, `.env.local`, etc.) are excluded by `.gitignore`, and no secret has ever been committed to the repo
  3. A Postgres database is provisioned and reachable from a Vercel serverless function, with tables for users, sessions/customers, subscriptions, and processed webhook events created
  4. A build-time check scans the `dist/` output for secret substrings and fails if any are found

**Plans**: 3/3 plans executed
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Server-only DB client, full schema migration, migration runner wired into build

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Provision Vercel Postgres and verify the live schema

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Build-time secret scan gate wired into npm run build

### Phase 2: Authentication — Google Sign-In & Server-Side Sessions

**Goal**: A user can sign in with Google, and the server independently verifies their identity before trusting it — no client-supplied identity claim is ever trusted directly.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):

  1. User can sign in with their Google account via a single "Sign in with Google" action, with no email/password option present anywhere on the site
  2. The server independently verifies the returned Google ID token's signature, audience, expiry, and issuer before creating a session — a tampered or forged token is rejected
  3. The signed-in user is identified internally by Google's stable `sub` claim, and their session persists across page reloads without re-authenticating
  4. User can sign out from the site, which clears their server-side session so subsequent requests are treated as signed-out

**Plans**: 3/3 plans executed
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Schema (sessions.token_hash), session primitives, and the Google redirect + callback tracer through to a persisted session

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Sign-out route, /account edge pre-filter, and the full auth-aware header (three states, sign-out menu, avatar CSP)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — /account auth gate and inline sign-in error notice

**UI hint**: yes

### Phase 3: Billing & Webhooks — Stripe Checkout and Subscription Sync

**Goal**: A signed-in user can subscribe to any of the 4 real Stripe products via Stripe Checkout, and the database's subscription state is always driven by signature-verified webhook events, never by the client alone.
**Depends on**: Phase 2
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06
**Success Criteria** (what must be TRUE):

  1. Signed-in user can start a Stripe Checkout session for any of the 4 real products (Éclat Online, Éclat Hard Copy, Children's Book Online, Children's Book Hard Copy) from the relevant page, seeing the real Stripe price instead of the current placeholder copy
  2. Stripe webhook events are only trusted after their signature is verified with the webhook signing secret; unsigned or tampered payloads are rejected
  3. Replaying the same Stripe webhook event twice produces no duplicate subscription records or double-applied effects
  4. Subscription created/updated/deleted events from Stripe are synced into the database as the single source of truth for entitlement — completing Checkout alone never grants access without webhook confirmation
  5. A failed renewal payment (`invoice.payment_failed`) marks the affected subscription "past due" in the database rather than being silently ignored

**Plans**: TBD
**UI hint**: yes

### Phase 4: Content Gating — Real Server-Side Entitlement Enforcement

**Goal**: Gated content is served only to users with a real, current, server-verified entitlement — the demo `subscribed` localStorage flag and every read site are gone for good.
**Depends on**: Phase 3
**Requirements**: GATE-01, GATE-02, GATE-03, GATE-04, GATE-05
**Success Criteria** (what must be TRUE):

  1. Every gated route (edition full issues, book full spreads, paywalled writings) checks the signed-in user's real entitlement from the database on each request — no page, download, or API response leaks gated content to someone without it
  2. The `subscribed` localStorage flag and all its read sites (`Edition.jsx`, `Archive.jsx`, `Books.jsx`, `Account.jsx`) no longer exist anywhere in the codebase
  3. A user holding only a Hard Copy subscription cannot access that product's Online/digital content, and vice versa
  4. Canceling or lapsing a subscription revokes access to that product's gated content on the user's very next request, with no stale cached access
  5. Publicly-intended content (covers, previews, marketing pages) renders exactly as it does today, unaffected by the new gating

**Plans**: 2/2 plans executed
Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Server-only session helper, gated-content module, GET /api/content/editions/:no entitlement endpoint, no-store defense-in-depth, check-secrets guard

**Wave 2**

- [x] 04-02-PLAN.md — useSafeFetch/useGatedContent client hooks, useEntitlements IN-03 backport, free-only excerpt restore, Edition.jsx gated-block rewrite, GATE-02 demo-state removal

**UI hint**: yes

### Phase 5: Account Management — Real Status, Cancellation & Billing Portal

**Goal**: A user can view and manage their real subscription from the Account page — status, renewal date, invoices, and cancellation are all backed by live Stripe data instead of mocks.
**Depends on**: Phase 3
**Requirements**: ACCT-01, ACCT-02, ACCT-03, ACCT-04
**Success Criteria** (what must be TRUE):

  1. User sees their real subscription status (active / canceled / past due) and renewal date on the Account page, replacing today's mocked data
  2. User can cancel a subscription from the Account page via Stripe's hosted Customer Portal
  3. User sees their real invoice history on the Account page, replacing today's mocked invoice table
  4. User sees a clear "payment failed, update your card" notice on the Account page when a subscription is past due

**Plans**: 3/3 plans executed. 05-03 (gap closure) fixed CR-01/CR-02/CR-03 plus an emergent critical bug (account.js's `rows` destructuring) found during its own code review. Re-verification: 5/5 must-haves now pass; status human_needed — 5 items require a live environment (see 05-UAT.md)
Plans:

- [x] 05-03-PLAN.md — gap closure: CR-01 fail-closed useSafeFetch check + distinct DB-failure status, CR-02 single-held-key invoice read, CR-03 cancelAtPeriodEnd → "Access until" label + confirmation notice, plus an emergent fix for account.js's `rows` destructuring bug — committed 3167d6f, 3f74ec0, 1e25363, a01e33c; summary 05-03-SUMMARY.md

**Wave 1**

- [x] 05-01-PLAN.md — lib/products.js reverse maps (PRODUCT_ID_TO_KEY/PRICE_ID_TO_PRODUCT_KEY/planLabelFor), GET /api/billing/account (DB-always + best-effort Stripe enrichment), POST /api/billing/portal (CSRF-first, own-customer scoped) — committed 362c693, 6166e60, b710795; summary c77371a

**Wave 2**

- [x] 05-02-PLAN.md — src/lib/useAccount.js (third useSafeFetch consumer) + Account.jsx rebuild: per-product panels, 3-state status, state-aware CTA (WR-01 fix), ACCT-04 notice, one real invoice table, portal handlers — committed a500a4f, 59e2388; summary 83ce821

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|-----------------|--------|-----------|
| 1. Foundation — Environment, Secrets & Data Layer | 3/3 | Complete    | 2026-09-08 |
| 2. Authentication — Google Sign-In & Server-Side Sessions | 3/3 | Complete    | 2026-09-09 |
| 3. Billing & Webhooks — Stripe Checkout and Subscription Sync | 3/3 | Complete    | 2026-09-09 |
| 4. Content Gating — Real Server-Side Entitlement Enforcement | 2/2 | Pending human verification | - |
| 5. Account Management — Real Status, Cancellation & Billing Portal | 3/3 | Pending human verification | - |
