# Requirements: Éclat

**Defined:** 2026-09-08
**Core Value:** A signed-in subscriber's paid access is real and enforced server-side — no page, download, or API response leaks paid content to someone who hasn't actually paid for it.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Environment & Secrets (ENV)

- [x] **ENV-01**: All server-side secrets (Google OAuth client secret, Stripe secret key, Stripe webhook signing secret, session encryption key) live only in server-side environment variables — never in client-shipped code, never committed to the repo
- [x] **ENV-02**: `.gitignore` excludes local env files so secrets can never be accidentally committed

### Authentication (AUTH)

- [x] **AUTH-01**: User can sign in with their Google account via a single "Sign in with Google" action
- [x] **AUTH-02**: Server verifies the Google ID token's signature, audience, expiry, and issuer before creating a session — never trusts an unverified client-supplied identity
- [x] **AUTH-03**: User is identified internally by Google's stable `sub` claim, not by email address
- [x] **AUTH-04**: User's signed-in session persists across page reloads without re-authenticating with Google each time
- [x] **AUTH-05**: User can sign out, which clears their server session
- [x] **AUTH-06**: No email/password sign-in option exists anywhere on the site

### Billing & Checkout (BILL)

- [x] **BILL-01**: User can start a Stripe Checkout session for any of the 4 existing products (Éclat Online, Éclat Hard Copy, Children's Book Online, Children's Book Hard Copy) from the relevant page
- [x] **BILL-02**: Checkout shows the real Stripe price for the selected product, not the current placeholder copy
- [x] **BILL-03**: Stripe webhook events are verified via signature (`constructEvent` + webhook signing secret) before being trusted
- [x] **BILL-04**: Stripe webhook handler is idempotent — processing the same event twice has no duplicate effect
- [x] **BILL-05**: Subscription created/updated/deleted events from Stripe are synced into the database as the single source of truth for entitlement — the Checkout success redirect never grants access on its own
- [x] **BILL-06**: A failed renewal payment (`invoice.payment_failed`) is reflected in the user's account as "past due," not silently ignored

### Content Gating (GATE)

- [x] **GATE-01**: Every gated page/route (edition full issues, book full spreads, paywalled writings) checks the signed-in user's real entitlement from the database on each request — no client-side-only gating remains
- [x] **GATE-02**: The existing `subscribed` localStorage flag and all its read sites (`Edition.jsx`, `Archive.jsx`, `Books.jsx`, `Account.jsx`) are removed and replaced by the real server-side check
- [x] **GATE-03**: A Hard Copy subscription does not grant Online/digital access to the same product — Online and Hard Copy are separate, independent entitlements (decided 2026-09-08)
- [x] **GATE-04**: When a subscription is canceled or lapses, the user's access to that product's gated content is revoked on their very next request — no stale cached access
- [x] **GATE-05**: Publicly-intended content (covers, previews, marketing pages) continues to render exactly as it does today, unaffected by the new gating

### Account Management (ACCT)

- [x] **ACCT-01**: User can view their real subscription status (active / canceled / past due) and renewal date on the Account page, replacing today's mocked data
- [x] **ACCT-02**: User can cancel a subscription from the Account page, via Stripe's hosted Customer Portal
- [x] **ACCT-03**: User can view their real invoice history on the Account page, replacing today's mocked invoice table
- [ ] **ACCT-04**: User sees a clear "payment failed, update your card" notice on the Account page when a subscription is past due

## v2 Requirements

Deferred to a future milestone. Tracked but not in this roadmap.

### Content Gating

- **GATE-06**: Graceful degraded preview of gated content (e.g. first pages of an edition) instead of a hard wall — requires a content-model change not present today

### Account Management

- **ACCT-05**: Unified "your subscriptions" view bundling all of a user's active products together
- **ACCT-06**: Self-serve plan upgrade/downgrade between products

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Email/password sign-in | Reintroduces password storage, reset flows, and credential-stuffing/breach-liability surface the project deliberately avoids by going Google-only |
| Multi-tenant / white-label platform (separate branded sites for other publishers) | Not what was actually requested — this is a single-brand product with many individual user accounts, not a B2B platform |
| Custom-built payment form (raw Stripe Elements) | Stripe Checkout (hosted) already covers this with far less PCI scope and edge-case handling |
| New/custom pricing tiers | 4 real products/prices already exist in the live Stripe account; reuse them as-is |
| Client-trusted access flags (localStorage/cookie booleans) | This is the exact flaw the milestone exists to fix |
| Real-time WebSocket "subscription activated" push | Unnecessary — webhook-to-DB sync plus a redirect/poll on Checkout success covers the real UX need |
| Metered/soft paywall (free-article counting) | Doesn't match this product's fixed-catalog (not continuous-stream) content model |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENV-01 | Phase 1 | Complete |
| ENV-02 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 2 | Complete |
| BILL-01 | Phase 3 | Complete |
| BILL-02 | Phase 3 | Complete |
| BILL-03 | Phase 3 | Complete |
| BILL-04 | Phase 3 | Complete |
| BILL-05 | Phase 3 | Complete |
| BILL-06 | Phase 3 | Complete |
| GATE-01 | Phase 4 | Complete |
| GATE-02 | Phase 4 | Complete |
| GATE-03 | Phase 4 | Complete |
| GATE-04 | Phase 4 | Complete |
| GATE-05 | Phase 4 | Complete |
| ACCT-01 | Phase 5 | Complete |
| ACCT-02 | Phase 5 | Complete |
| ACCT-03 | Phase 5 | Complete |
| ACCT-04 | Phase 5 | Pending |

**Coverage:**

- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-08*
*Last updated: 2026-09-08 after roadmap creation*
