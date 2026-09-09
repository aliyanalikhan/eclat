---
phase: 03
slug: billing-webhooks-stripe-checkout-and-subscription-sync
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-09
---

# Phase 3 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser -> api/billing/checkout.js | Untrusted client request (`product` query string, `session` cookie) crosses into server code that resolves an allowlist entry and creates a real Stripe Checkout Session | Product slug, session cookie |
| Browser -> api/billing/status.js | Untrusted client request (`session` cookie) crosses into server code that reads the authenticated user's subscription rows | Session cookie, subscription status |
| Stripe (external) -> api/billing/webhook.js | Stripe's hosted delivery of signed events crosses into a public POST endpoint; every byte is unverified until `constructEvent` validates the HMAC signature | Signed webhook payload |
| Server -> Stripe API | Server-to-server Checkout Session creation and price lookups using the secret key | STRIPE_SECRET_KEY, price/product data |
| Server -> Postgres (subscriptions/webhook_events) | Server writes subscription state and processed-event ids; webhook_events holds only the event id, never raw payloads | Subscription rows, event ids |
| Browser -> api/billing/prices.js | Public GET endpoint serving the picker's price facts; must expose only display data, never price IDs/secrets/subscription state | Amount, currency, interval |
| Browser (client state) -> src/routes/Subscribe.jsx / SubscribeSuccess.jsx | Client-rendered ownership UI and success view are render-only by design (D-04) — never an entitlement boundary | Rendered subscription status (display only) |
| Stripe Dashboard (TEST mode) -> operator clipboard -> 03-03-CAPTURES.md | Human-captured test webhook JSON pasted into a repo-committed evidence artifact; must be sanitized before commit | Field paths, safe evt_/sub_/cus_ ids only — never PII, secrets, or full payloads |
| middleware.js -> /subscribe and /subscribe/success | Deliberately NOT a boundary: matcher stays `['/account']` so signed-out users can render the picker and success page degrades to confirming -> timeout | N/A (no interception) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 | Spoofing | api/billing/webhook.js | critical | mitigate | `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)` on raw `request.text()` body before any parsing; unsigned/tampered payloads rejected 400. Live-tested by verifier this session (bad-signature POST -> 400). | closed |
| T-03-02 | Repudiation / Tampering | api/billing/webhook.js (idempotency) | high | mitigate | `webhook_events` PK on `stripe_event_id` + `INSERT ... ON CONFLICT DO NOTHING` + `rowCount===0` short-circuit inside a real DB transaction. Replay evidence captured in 03-03-CAPTURES.md (row counts unchanged on 2nd delivery). | closed |
| T-03-03 | Tampering | api/billing/checkout.js | high | mitigate | Server-side product->price allowlist in lib/products.js (`isProductKey`/`getProduct`) — client may only pass an internal slug, never a raw Stripe price ID. Verified by code read + live 400-on-unknown-product test. | closed |
| T-03-04 | Spoofing | api/billing/status.js + success_url flow | medium | mitigate | `/subscribe/success` polls the authenticated status endpoint with a timeout rather than trusting the URL alone; status is read live from `subscriptions`. Verified (truth #15 in 03-VERIFICATION.md). | closed |
| T-03-05 | Information Disclosure | package.json, .env.example, scripts/check-secrets.js | high | mitigate | Both Stripe secrets tracked by check-secrets.js (derived from .env.example, absent from KNOWN_PUBLIC_VAR_NAMES); `npm run build`'s final step scans dist/ and passed clean this session. | closed |
| T-03-06 | Tampering | api/billing/checkout.js redirect | medium | mitigate | `success_url`/`cancel_url` built only from `new URL(request.url).origin` (verified via grep of api/billing/checkout.js lines 36/85/96-97) — no unvalidated input reaches the Location header. | closed |
| T-03-SC | Tampering | package.json (stripe install) | high | mitigate | stripe@22.6.1 pre-cleared by RESEARCH.md's Package Legitimacy Audit (official github.com/stripe/stripe-node, ~18M downloads/week, no postinstall). | closed |
| T-03-07 | Information Disclosure | api/billing/prices.js | high | mitigate | Endpoint returns only amount/currency/interval per slug, never a Stripe price ID. Live-tested by verifier this session — zero `price_` substring leakage across all 4 products/intervals. | closed |
| T-03-08 | Spoofing / Tampering | src/routes/Subscribe.jsx (ownership UI) | high | mitigate | Per-tile Subscribed/Manage state is a render hint only (D-04); checkout.js independently re-verifies subscription state server-side before creating a session. | closed |
| T-03-09 | Spoofing | src/routes/SubscribeSuccess.jsx (success view) | high | mitigate | D-07: only an observed `subscriptions` row with status active/trialing flips the success view; URL/redirect alone never grants it. Verified (truth #15). | closed |
| T-03-10 | Tampering | src/routes/Subscribe.jsx (checkout CTA) | medium | mitigate | Subscribe CTA is a plain anchor carrying only the internal slug; server allowlist rejects unknown values with 400 — same control as T-03-03. | closed |
| T-03-11 | Information Disclosure | src/data/products.js / client bundle | low | accept | Client catalog carries only display metadata (key/name/kind), no prices, no server imports. Verified via grep this session — no `price_` or `from 'stripe'` references found. Risk accepted at low since public price facts are already served by api/billing/prices.js. | closed |
| T-03-12 | Repudiation | api/billing/checkout.js (error redirect) | low | mitigate | Stripe-error catch redirects to `/subscribe?checkout_error=1` with no server error detail leaked. Verified via grep (lines 75, 103, 106). | closed |
| T-03-13 | Tampering | src/routes/SubscribeSuccess.jsx (polling) | low | mitigate | Poll loop uses a `cancelled` flag + `clearInterval` cleanup on unmount (verified via grep, lines 36/42/57-58) — no post-unmount state updates or leaked timers. | closed |
| T-03-14 | Information Disclosure | 03-03-CAPTURES.md (capture artifact) | high | mitigate | Task 1 sanitization rule: only field paths and safe evt_/sub_/cus_ ids recorded, no PII/secrets/full payloads. Verified via grep this session — no leaked email/card-pattern/`sk_live_`/`whsec_` values found (the one `sk_live_...` occurrence is prose noting the account mode, not a real secret value). | closed |
| T-03-15 | Tampering / Integrity | api/billing/webhook.js (post-capture patch) | medium | mitigate | Assumption A1 was CONFIRMED with no code change required (03-03-SUMMARY.md); verified via git log that webhook.js was touched only in Wave 1 (e6a28f8), never in Wave 3 — the conditional patch-and-reverify mitigation was never triggered, so no unmitigated speculative change exists. | closed |
| T-03-16 | Spoofing | 03-UAT.md harvest | low | accept | Harvest is a planning artifact, not an enforcement mechanism — a forged PASS row cannot grant entitlements since only the webhook-synced `subscriptions` row is authoritative (D-04). | closed |
| T-03-17 | Repudiation | live money-path e2e evidence | medium | mitigate | 03-03-CAPTURES.md's "Money-path e2e" section records `client_reference_id`/evt_/sub_/cus_ ids and status-flip observations, making the BILL-01/02/05 proof attributable and reproducible. | closed |
| T-03-18 | Denial of Service | middleware no-change verification | low | accept | Signed-out `/subscribe` rendering surfaces only public price data (already reduced by T-03-07); `middleware.js` matcher confirmed unchanged (`['/account']` only) via grep this session and by the verifier — no new DoS vector introduced. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-11 | Client product catalog omits prices/server imports by design; public price facts are already served by api/billing/prices.js, so no additional exposure results from accepting this as low-severity | User (via /gsd-secure-phase 3 run) | 2026-09-09 |
| AR-03-02 | T-03-16 | UAT harvest is a planning artifact with no enforcement power — entitlement is always re-derived from the webhook-synced DB row, never from this file | User (via /gsd-secure-phase 3 run) | 2026-09-09 |
| AR-03-03 | T-03-18 | Signed-out /subscribe rendering exposes only public price data already covered by T-03-07's mitigation; no new attack surface | User (via /gsd-secure-phase 3 run) | 2026-09-09 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-09 | 19 | 19 | 0 | Orchestrator (L1 grep-depth, short-circuit per ASVS L1 + register_authored_at_plan_time=true; auditor spawn not required — see workflow secure-phase.md §3) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-09
