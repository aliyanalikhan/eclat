---
status: complete
phase: 03-billing-webhooks-stripe-checkout-and-subscription-sync
source: [03-VERIFICATION.md, 03-UAT-HARVEST.md]
started: 2026-09-09T05:00:00Z
updated: 2026-09-09T05:36:37.491Z
---

## Current Test

[testing complete]

## Tests

### 1. Checkout redirect from a real signed-in session
expected: With the app running, sign in with a real Google account, then trigger checkout for a product (e.g. visit /api/billing/checkout?product=eclat-online, or click Subscribe on /subscribe). Browser redirects to a genuine checkout.stripe.com hosted Checkout page showing the correct product name and the real live price.
result: pass

### 2. /subscribe picker visual UX
expected: |
  Visit /subscribe signed-out: 4 product tiles render with live prices, the monthly/annual toggle works, and visiting with ?product=<slug> highlights + scrolls to that tile without starting checkout.
  Visit /subscribe signed-in with an active subscription on at least one product: that product's tile shows a "Subscribed" badge + "Manage" link, while other tiles still show "Subscribe" (each product's owned/unowned state is independent).
result: pass

### 3. Full Stripe Checkout round-trip
expected: |
  Starting from /subscribe, complete a real Checkout for one product. /subscribe/success shows "Confirming your subscription…" then flips to "You're subscribed." with a checkmark ONLY after the webhook lands and the subscription is active/trialing in the DB (never before). The picker then shows the "Subscribed" badge for that product.
  NOTE: this Stripe account is LIVE production. There is no test-mode card that works against it — completing this test creates a real, billable subscription. Feel free to skip this one for now if you're not ready to make a real purchase; it's the single most consequential outstanding check for launch-readiness, not a code-correctness blocker (server-side logic for this is already proven in 03-UAT-HARVEST.md).
result: pass

### 4. Webhook idempotency replay (independent confirmation)
expected: |
  Deliver the same Stripe webhook event twice (e.g. resend a delivery from the Stripe Dashboard's event log, or trigger a duplicate via `stripe trigger`/CLI if you have it). The second delivery should not create a duplicate row in `webhook_events` or `subscriptions`, and should not change the subscription's status.
  NOTE: this specific replay was already executed once during phase execution with concrete before/after row-count evidence (03-UAT-HARVEST.md item 8 / 03-03-CAPTURES.md), and the code path (`ON CONFLICT DO NOTHING` + `rowCount===0` short-circuit inside a real transaction) was independently code-reviewed and confirmed correct. This item exists because the automated verifier's own attempt to re-run the replay this session was blocked by a safety guardrail against mutating the live production DB directly — not because anything looked wrong. Low-priority; skip if you're satisfied with the existing evidence.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
