---
phase: 03-billing-webhooks-stripe-checkout-and-subscription-sync
verified: 2026-09-09T00:00:00Z
status: human_needed
score: 16/17 must-haves verified
behavior_unverified: 1
overrides_applied: 0
human_verification:
  - test: "With `vercel dev` running, sign in with a real Google account and visit /api/billing/checkout?product=eclat-online in a browser."
    expected: "Browser is redirected to a genuine checkout.stripe.com hosted Checkout page showing the correct product and live price."
    why_human: "Requires a real interactive Google OAuth sign-in and a real browser redirect to Stripe's hosted domain — no safe automatable equivalent exists (03-UAT.md item 2, NOT RUN)."
  - test: "Visit /subscribe signed-out and signed-in (with an active subscription on at least one product) in a real browser."
    expected: "Signed-out: 4 tiles render with live prices, monthly/annual chip toggle works, ?product= preselect highlights + scrolls to the correct tile without starting checkout. Signed-in with an active subscription: that product's tile shows the accent 'Subscribed' badge + 'Manage' link while other tiles still show 'Subscribe' (independent per-product state, D-05)."
    why_human: "Visual layout, badge placement, and preselect scroll behavior are UX outcomes automated string/shape checks cannot judge (03-UAT.md item 5, NOT RUN)."
  - test: "Complete a real Stripe Checkout round-trip (test-mode card 4242 4242 4242 4242 against a TEST-mode Stripe key, or a real purchase against the live account) starting from /subscribe, through Checkout, to /subscribe/success."
    expected: "The picker shows real prices, Checkout completes, /subscribe/success shows 'Confirming your subscription…' and flips to 'You're subscribed.' with the checkmark SVG + correct copy/CTA ONLY after the webhook lands and the subscriptions row is active/trialing (never before), and the picker subsequently shows the 'Subscribed' badge for that product. A signed-out visit to /subscribe/success must degrade to confirming → timeout (~25s), never a false success."
    why_human: "This account is LIVE production — card 4242 4242 4242 4242 is test-mode-only and does not work against it, and using a real card would create a real billable charge. No safe automatable equivalent exists for a hosted-Checkout-page completion (03-UAT.md items 6 and 9, NOT RUN / PARTIAL). Recommend switching to Stripe TEST-mode keys for one verification pass, or a deliberate human-initiated real purchase, before this money path is considered launch-ready."
  - test: "Independently replay a captured/synthetic Stripe webhook event id twice against api/billing/webhook.js in a non-production database (or accept the existing live evidence) and confirm webhook_events / subscriptions row counts stay unchanged on the second delivery."
    expected: "Second delivery returns 200, webhook_events has exactly 1 row for that event id, subscriptions has exactly 1 row for that subscription id with status unchanged from the first delivery — no double-write, no status reversion (BILL-04)."
    why_human: "This verifier's own attempt to replay this exact test against the live production database this session was blocked by the sandbox's auto-mode classifier (a safety guardrail against mutating a live production DB via Bash) — code review confirms the ON CONFLICT DO NOTHING + rowCount===0 short-circuit is implemented correctly, and 03-03-CAPTURES.md documents a prior agent-run replay with concrete before/after row-count evidence, but this verifier could not independently re-execute the state-mutating replay itself in this session."
---

# Phase 3: Billing & Webhooks — Stripe Checkout and Subscription Sync Verification Report

**Phase Goal:** A signed-in user can subscribe to any of the 4 real Stripe products via Stripe Checkout, and the database's subscription state is always driven by signature-verified webhook events, never by the client alone.
**Verified:** 2026-09-09
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | D-02 (price shape) resolved before any Stripe code written, branch B (monthly+annual per product) | ✓ VERIFIED | `lib/products.js` header comment + `migrations/0004_billing_stripe_price_id.sql`; `stripe_price_id` column confirmed present via migration read |
| 2 | 4 product IDs are the canonical ones from CONTEXT.md D-02 | ✓ VERIFIED | `lib/products.js` productId values match `03-CONTEXT.md` exactly (prod_VAyHWfX8XdHh2z, prod_VAyJTIfn7UVWi3, prod_VCuT7Wcy4yQDrc, prod_VCuJDGHg6vxcE6) |
| 3 | `lib/stripe.js` mirrors `lib/db.js`'s server-only fail-fast singleton shape | ✓ VERIFIED | Read `lib/stripe.js` — SERVER-ONLY banner, fail-fast throw on missing `STRIPE_SECRET_KEY`, single `stripe` export |
| 4 | `checkout.js` is a server-initiated redirect, never accepts a client price ID, never loads Stripe.js | ✓ VERIFIED | Read `api/billing/checkout.js` — resolves `product` only via `lib/products.js` allowlist, builds session server-side, 302s to `session.url` |
| 5 | `checkout.js` independently re-checks real subscription state before creating a session (D-04) | ✓ VERIFIED | Lines 63-74: `SELECT ... WHERE status IN ('active','trialing','past_due')` gate before `stripe.checkout.sessions.create` |
| 6 | `status.js` returns only a product→status map, fail-closed, session-gated | ✓ VERIFIED | Read `api/billing/status.js`; live-tested: no-session request returned `401 {"subscriptions":{}}` |
| 7 | `webhook.js` reads raw body before parsing, verifies via `constructEvent`, idempotent via `webhook_events` PK | ✓ VERIFIED (guard behavior); ⚠️ idempotency state-transition PRESENT_BEHAVIOR_UNVERIFIED by this verifier | Code read confirms `request.text()` before any parsing, `constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`, `INSERT ... ON CONFLICT DO NOTHING` + `rowCount===0` short-circuit inside a real `db.connect()` transaction. Live-tested this session: GET→404, bad-signature POST→400. The idempotent-replay *behavior* itself (does a duplicate event id actually no-op against the DB) was not independently re-executed by this verifier — see Human Verification #4 |
| 8 | Subscription events reconciled via `metadata.userId`, delivery-order independent; checkout.session.completed backfills `stripe_customer_id` | ✓ VERIFIED | `resolveUserId()` reads `sub.metadata.userId` first, falls back to `stripe_customer_id` lookup; `checkout.session.completed` case backfills `users.stripe_customer_id` from `client_reference_id` |
| 9 | Status values mirror Stripe's enum verbatim (no translation layer) | ✓ VERIFIED | `upsertSubscription` stores `sub.status` verbatim; `invoice.payment_failed` writes literal `'past_due'` |
| 10 | Both Stripe secrets tracked by `scripts/check-secrets.js`, absent from `dist/` | ✓ VERIFIED | Independently confirmed via live script: both `STRIPE_SECRET_KEY=`/`STRIPE_WEBHOOK_SECRET=` present in `.env.example`, neither in `KNOWN_PUBLIC_VAR_NAMES`; `npm run build`'s final `check-secrets.js` step passed clean this session |
| 11 | Picker is a single-view 4-tile grid; wizard/`SITE.price`/`useApp` demo state deleted (D-01) | ✓ VERIFIED | Read `src/routes/Subscribe.jsx` — no `SITE`, `useApp`, `completeDemo`, `RENEWAL`, or `setPlan`/`setSubscribed` references; renders `PRODUCTS.map(...)` as 4 tiles |
| 12 | Price display never reads `SITE.price` — comes only from `GET /api/billing/prices` | ✓ VERIFIED | `Subscribe.jsx` fetches `/api/billing/prices` on mount; live-tested this session: endpoint returned real Stripe amounts for all 4 products/both intervals with zero `price_` substrings |
| 13 | Ownership UI is a render hint, not a boundary (D-04); fetch failure falls back to Subscribe | ✓ VERIFIED | `useEntitlements()` fails closed to `{}`; `owned` derives from `subs[key]`; server (`checkout.js`) independently re-verifies regardless of client state |
| 14 | Each product's owned/unowned state is independent (D-05) | ✓ VERIFIED | `ProductTile` computes `owned` per-tile from `subs[product.key]`, no shared/global toggle |
| 15 | Success view flips only on an observed webhook-synced row (D-07); URL/redirect alone never grants access | ✓ VERIFIED | `SubscribeSuccess.jsx` polls `/api/billing/status` every 2s, flips to `'success'` only when `record.status` is `active`/`trialing`; never on mount/URL alone |
| 16 | `?product=` preselect only highlights/scrolls, never auto-starts checkout (D-08) | ✓ VERIFIED | `Subscribe.jsx` preselect effect only calls `setPreselectKey`/`scrollIntoView`; no checkout call anywhere in that path |
| 17 | `invoice.payment_failed` reflected as verbatim `'past_due'` in DB, surfaced by `status.js` (BILL-06) | ✓ VERIFIED (code) / documented live evidence | Code confirms literal `status = 'past_due'` write; `03-03-CAPTURES.md` records a live-verified round trip (`invoice.payment_failed` → DB `past_due` → `GET /api/billing/status` returned `past_due`) — not independently re-executed by this verifier (DB-mutation blocked, see Human Verification #4) |

**Score:** 16/17 truths verified (1 present + wired, behavior-unverified by this verifier — see below)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/stripe.js` | Server-only Stripe client singleton | ✓ VERIFIED | Fail-fast, single export, never imported from `src/` (grep confirms no `src/` reference) |
| `lib/products.js` | Server-side product→price allowlist | ✓ VERIFIED | 4 slugs, `isProductKey`/`getProduct`, frozen, real price IDs |
| `migrations/0004_billing_stripe_price_id.sql` | Conditional D-02 branch-B column | ✓ VERIFIED | Present, idempotent `IF NOT EXISTS`, applied (`npm run build`'s migrate step reports "up to date, 4 migrations") |
| `api/billing/checkout.js` | Checkout redirect endpoint | ✓ VERIFIED | Session gate, allowlist lookup, D-04 re-check, Checkout Session creation, 302 |
| `api/billing/status.js` | Authenticated status read | ✓ VERIFIED | Fail-closed, session-gated, product-key map only |
| `api/billing/webhook.js` | Signature-verified idempotent dispatcher | ✓ VERIFIED (structure/guards); idempotency runtime behavior not independently re-executed | See Truth #7 |
| `api/billing/prices.js` | Public price-facts endpoint | ✓ VERIFIED | Live-tested this session; real amounts, no price ID leak |
| `src/data/products.js` | Client display catalog | ✓ VERIFIED | 4 entries, metadata-only, no Stripe/server imports |
| `src/lib/useEntitlements.js` | `useSession`-shaped entitlement hook | ✓ VERIFIED | `{ subs, loading, error, refetch }`, fails closed to `{}` |
| `src/routes/Subscribe.jsx` | Reworked 4-tile picker | ✓ VERIFIED | Matches spec; wizard fully removed |
| `src/routes/SubscribeSuccess.jsx` | Confirming→success/timeout flow | ✓ VERIFIED | Matches D-06/D-07 exactly |
| `src/App.jsx` / `src/data/seo.js` | Route + SEO registration | ✓ VERIFIED | `/subscribe/success` present in both (three-places-in-sync) |
| `src/styles/eclat.css` | `--bad`, `.plan__badge/__interval/__skeleton` | ✓ VERIFIED | All 4 selectors present, used in `Subscribe.jsx`/`SubscribeSuccess.jsx` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `checkout.js` | `lib/products.js` | `getProduct`/`isProductKey` | ✓ WIRED | Confirmed by direct read + live 400 on unknown product |
| `checkout.js` | `lib/stripe.js` | `checkout.sessions.create` | ✓ WIRED | Confirmed by direct read |
| `checkout.js` | `api/auth/google.js` | 302 to sign-in on no session | ✓ WIRED | Live-tested: `302 /api/auth/google?return_to=/subscribe` |
| `webhook.js` | `lib/stripe.js` | `constructEvent` | ✓ WIRED | Live-tested: bad signature → 400 |
| `webhook.js` | `lib/db.js` | `ON CONFLICT DO NOTHING` in a real transaction | ✓ WIRED (code) | Confirmed by direct read; runtime replay not independently re-executed (see Truth #7) |
| `status.js` | `lib/db.js` | `FROM subscriptions WHERE user_id` | ✓ WIRED | Live-tested: 401 empty shape without session |
| `Subscribe.jsx` | `api/billing/prices.js` | `fetch('/api/billing/prices')` | ✓ WIRED / FLOWING | Live-tested this session — real amounts returned |
| `Subscribe.jsx` | `api/billing/checkout.js` | plain `<a href>` | ✓ WIRED | Confirmed real anchor, no fetch interception |
| `Subscribe.jsx` | `useEntitlements` | hook call | ✓ WIRED | Confirmed |
| `SubscribeSuccess.jsx` | `api/billing/status.js` | 2s poll | ✓ WIRED | Confirmed |
| `SubscribeSuccess.jsx` | `src/data/products.js` | `productName`/`productKind` | ✓ WIRED | Confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `api/billing/prices.js` | `products[key].amount/currency/interval` | `stripe.prices.retrieve()` (live Stripe API) | Yes — live-tested this session, real cents/currency/interval per product | ✓ FLOWING |
| `Subscribe.jsx` `.plan__price` | `priceInfo.intervals[interval].amount` | `fetch('/api/billing/prices')` | Yes | ✓ FLOWING |
| `Subscribe.jsx` `.plan__badge`/Manage | `subs[product.key]` | `GET /api/billing/status` → `subscriptions` table | Yes (code-confirmed; DB-level replay not independently re-executed) | ✓ FLOWING (code-level) |
| `SubscribeSuccess.jsx` success state | `subs[productKey].status` | `GET /api/billing/status` poll | Yes (code-confirmed) | ✓ FLOWING (code-level) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Webhook rejects non-POST | `fetch(...,{method:'GET'})` against `api/billing/webhook.js` | 404 | ✓ PASS |
| Webhook rejects unsigned POST | `fetch(...,{method:'POST',...})` with no valid signature | 400 "Invalid signature" | ✓ PASS |
| Checkout redirects unauthenticated user to sign-in | `fetch('/api/billing/checkout?product=eclat-online')`, no cookie | 302 → `/api/auth/google?return_to=/subscribe` | ✓ PASS |
| Checkout rejects unknown product | `fetch('/api/billing/checkout?product=nope')` | 400 | ✓ PASS |
| Status fails closed with no session | `fetch('/api/billing/status')`, no cookie | 401 `{"subscriptions":{}}` | ✓ PASS |
| Live price endpoint returns real Stripe data, no leak | `fetch('/api/billing/prices')` against live account | Real amounts for all 4 products, matches `03-03-CAPTURES.md` exactly ($14.99/$79.99, $24.99/$99.99, $12.99/$64.99, $39.99/$199.99, all USD), zero `price_` substrings | ✓ PASS |
| `npm run build` (migrate → vite → SSR → prerender → check-secrets) | `npm run build` | Migrate up to date (4 migrations), 10 routes prerendered, "check-secrets: no leaked secrets found in dist/" | ✓ PASS |
| Webhook idempotent-replay DB behavior | Attempted a fresh, self-contained replay test (temp user + synthetic signed events + cleanup) | **Blocked** — sandbox auto-mode classifier denied the DB-mutating Bash command against the live production database | ? SKIP (see Human Verification #4) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BILL-01 | 03-01, 03-02, 03-03 | Start Checkout for any of 4 products | ✓ SATISFIED | `checkout.js` + `Subscribe.jsx` tiles; browser-driven round-trip not independently verified (human item #3) |
| BILL-02 | 03-01, 03-02, 03-03 | Real Stripe price shown, not placeholder | ✓ SATISFIED | Live-tested this session — real amounts, `SITE.price` fully removed |
| BILL-03 | 03-01, 03-03 | Webhook signature verification before trust | ✓ SATISFIED | Live-tested: bad signature → 400; raw body read before any parsing |
| BILL-04 | 03-01, 03-03 | Idempotent webhook handling | ✓ SATISFIED (code + documented evidence) | `ON CONFLICT DO NOTHING` + `rowCount===0` short-circuit in code; `03-03-CAPTURES.md` documents a live replay with before/after counts — not independently re-executed by this verifier |
| BILL-05 | 03-01, 03-02, 03-03 | Webhook-synced DB is sole source of entitlement | ✓ SATISFIED | `SubscribeSuccess.jsx` polls DB-backed status, never trusts the redirect alone; `checkout.js` never writes `subscriptions` itself |
| BILL-06 | 03-01, 03-03 | Failed renewal reflected as "past due" | ✓ SATISFIED (code + documented evidence) | Code writes literal `'past_due'`; `status.js` surfaces it verbatim; `03-03-CAPTURES.md` records a live round-trip |

No orphaned requirement IDs — REQUIREMENTS.md maps exactly BILL-01 through BILL-06 to Phase 3, and all 6 appear in the plans' `requirements:` frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/routes/Subscribe.jsx` | 22 | `owned` only treats `active`/`trialing` as owned, while `checkout.js`'s D-04 re-check also treats `past_due` as "already subscribed" | ⚠️ Warning (carried from `03-REVIEW.md` WR-01) | A `past_due` subscriber sees a "Subscribe" button (not "Manage"), clicks it, and is silently redirected back to `/subscribe` with no explanation. Not a security/entitlement bypass (server-side gate still holds) — a UX gap, not a phase-goal blocker; ACCT-04's explicit past-due UI notice is Phase 5's job |
| `api/billing/checkout.js` | 90-98 | No Stripe idempotency key on `checkout.sessions.create` | ⚠️ Warning (carried from `03-REVIEW.md` WR-02) | A double-click/two-tab race before the D-04 DB check catches up could create two Checkout Sessions for the same user/product |
| `api/billing/webhook.js` | 71-106 | No event-ordering/staleness guard on the subscription upsert | ⚠️ Warning (carried from `03-REVIEW.md` WR-03) | Reordered webhook redelivery could theoretically overwrite a newer status with a stale one |
| `api/billing/checkout.js` | 85-87 | `success_url`/`cancel_url` built from request `Host`-derived origin, not a fixed canonical origin | ⚠️ Warning (carried from `03-REVIEW.md` WR-07) | Host-header-dependent redirect target for the post-payment URL |

No TBD/FIXME/XXX/HACK/PLACEHOLDER markers found in any file touched by this phase (`api/billing/*`, `src/routes/Subscribe*.jsx`, `src/lib/useEntitlements.js`, `src/data/products.js`, `lib/stripe.js`, `lib/products.js`). `03-REVIEW.md` (0 critical / 10 warnings / 4 info) is advisory and does not by itself fail this verification — no Warning above rises to a security/entitlement bypass of the phase's stated goal.

## Human Verification Required

See frontmatter `human_verification` — 4 items, harvested from `03-UAT.md`'s already-documented deferred checks (items #2, #5, #6/#9) plus one item from this verifier's own blocked attempt to independently re-execute the webhook idempotency replay. None of these represent a known defect — `03-UAT.md` and `03-03-CAPTURES.md` already document why each was deferred (this is a LIVE production Stripe account, not test-mode, so test-card/Dashboard-driven flows have no safe automated equivalent) and recommend either switching to Stripe TEST-mode keys for one verification pass, or a deliberate human-initiated real purchase, before the money path is considered launch-ready.

## Gaps Summary

No blocking gaps found. Every must-have truth, artifact, and key link from both `03-01-PLAN.md` and `03-02-PLAN.md`'s frontmatter is present, substantively implemented, and wired — independently confirmed by direct code review plus live execution of the checkout/status/webhook/prices endpoints against the real database and the real (live) Stripe account this session (guard clauses, fail-closed paths, and the price endpoint's real data were all re-verified, not just read). The phase's core mandate — server-side, signature-verified, allowlist-only billing with the database (never the client or the redirect) as the sole source of subscription truth — is implemented correctly.

The one item this verifier could not independently confirm is the webhook's idempotent-replay *runtime behavior*: a fresh, self-contained replay test (temp user + locally-signed synthetic events + cleanup, mirroring what `03-01`/`03-03`'s execution agent already did and documented in `03-03-CAPTURES.md`) was blocked by the sandbox's own auto-mode classifier from mutating the live production database. The code implementing this (`ON CONFLICT DO NOTHING` + `rowCount===0` short-circuit inside a real transaction) is correct on direct read, and `03-03-CAPTURES.md` documents a prior successful replay with concrete before/after row counts — but per this process's standard for behavior-dependent truths (state-transition/idempotency invariants require actual behavioral evidence, not just presence), this is recorded as present-but-behavior-unverified-by-this-verifier rather than silently upgraded to VERIFIED.

Four items remain genuinely deferred to human verification, all converging on the same root cause already identified by the phase's own UAT harvest: this Stripe account is LIVE production, so the literal browser-driven Checkout round-trip (test card, Dashboard test-webhook sends) has no safe automated equivalent. No code is blocked on these — they are launch-readiness confirmations, not open correctness questions.

---

_Verified: 2026-09-09_
_Verifier: Claude (gsd-verifier)_
