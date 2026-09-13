# Phase 3: Billing & Webhooks — Stripe Checkout and Subscription Sync - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-09
**Phase:** 3-Billing & Webhooks — Stripe Checkout and Subscription Sync
**Areas discussed:** Product & plan selection flow, Checkout return & confirmation experience, Duplicate / existing-subscription handling, Entry points — where "Subscribe" buttons live

---

## Product & plan selection flow

**Question 1: How should /subscribe let a user pick among the 4 real products?**

| Option | Description | Selected |
|--------|-------------|----------|
| One product picker, single-select | User picks exactly one of the 4 products, then goes straight to Checkout for that one | ✓ |
| Two independent toggles | Series (Éclat/Book) and format (Online/Hard Copy) as two separate choices combining into one of the 4 products | |
| Let each product's own page drive it | No central picker — Books.jsx/Archive.jsx/Edition.jsx each offer their own product's subscribe button | |

**User's choice:** One product picker, single-select

**Question 2: Does monthly/annual apply per product, or is it placeholder copy to replace?**

| Option | Description | Selected |
|--------|-------------|----------|
| Keep monthly/annual per product | Assume each product has both intervals; wire the toggle to real price IDs during research | |
| Single price per product, no toggle | Drop the toggle — one real Stripe price per product | |
| Not sure — verify against live Stripe account | Flag for research/planning to check against real Stripe data | |

**User's choice:** Gave the 4 real product IDs and asked to check pricing directly against them.

**Notes:** Attempted to query the live Stripe API by reading `.env.local` for `STRIPE_SECRET_KEY`; this was correctly blocked by a sandbox permission rule protecting that file. Could not verify real price/interval data from this session. Captured as a mandatory research-phase task in CONTEXT.md D-02 with the product IDs preserved, rather than guessing at the answer.

---

## Checkout return & confirmation experience

**Question: What should the user see between paying on Stripe and the webhook actually syncing the subscription?**

| Option | Description | Selected |
|--------|-------------|----------|
| Brief "confirming..." state, then poll | Short poll loop after redirect until the webhook-synced row appears, then reveal confirmed view | ✓ |
| Immediate "thank you", no polling | Static confirmation immediately, no wait for webhook | |
| Redirect straight to /account | No dedicated success page; /account's own loading state covers the wait | |

**User's choice:** Brief "confirming..." state, then poll

---

## Duplicate / existing-subscription handling

**Question: What happens if a user who already has an active subscription to a product clicks Subscribe again for it?**

| Option | Description | Selected |
|--------|-------------|----------|
| Block it, redirect to Account | Server checks for existing active subscription before creating a Checkout session; redirect to /account if found | |
| Let Stripe/webhook handle it | Always create a new Checkout session regardless | |

**User's choice (free text):** "IF user is already has an active subs it already shows on subscribe page the subscribed package and shows to manage subs" — the already-subscribed state should be visible directly on the /subscribe picker itself (not just a redirect-on-click), with a link to manage the subscription.

**Notes:** Captured as CONTEXT.md D-04 — richer than either canned option: the picker itself reflects per-product subscription state and swaps the CTA to "Subscribed — manage" rather than only guarding at click time.

---

## Entry points — where "Subscribe" buttons live

**Question: Should Subscribe CTAs live only on /subscribe, or also directly on product pages (Books.jsx, Archive/Edition)?**

| Option | Description | Selected |
|--------|-------------|----------|
| Only /subscribe | Central picker; other pages' paywall prompts link to /subscribe | ✓ |
| Central page + direct CTAs on relevant pages | /subscribe plus direct per-product checkout buttons elsewhere | |

**User's choice:** Only /subscribe

---

## Claude's Discretion

- Exact Checkout-session-creation endpoint path/naming and Node vs. Edge runtime
- Exact Stripe webhook event types subscribed to beyond the ones named in requirements
- Whether/how `users.stripe_customer_id` is reused vs. a new Stripe Customer created per Checkout
- Exact poll interval/timeout and endpoint shape for the "confirming..." state
- Visual design of the reworked /subscribe product picker (flagged for possible `/gsd-ui-phase` given ROADMAP.md's `UI hint: yes`)

## Deferred Ideas

None — discussion stayed within Phase 3's boundary. Customer Portal management, invoice history, and past-due UI notices remain correctly scoped to Phase 5 (ACCT-01 through ACCT-04) from the start, not deferred out of this discussion.
