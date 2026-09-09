# Phase 5: Account Management — Real Status, Cancellation & Billing Portal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-09
**Phase:** 05-account-management-real-status-cancellation-billing-portal
**Areas discussed:** Data source for Account, Cancellation & portal flow, Invoice history, Plan label & renewal date

---

## Data source for Account

| Option | Description | Selected |
|--------|-------------|----------|
| New sibling endpoint `/api/billing/account` | Keeps `GET /api/billing/status` lean for entitlement polling; new `useAccount` hook via `useSafeFetch` (Phase 4 D-08) | ✓ |
| Extend `/api/billing/status` | Single endpoint, but bloats the payload fetched on every gated page | |
| Let Claude decide | Pick approach best fitting the existing consumer split | |

**User's choice:** New sibling endpoint `/api/billing/account` — and also granted Claude discretion on finer implementation details.

**Notes:** The per-question answers consolidated into D-01..D-04:
- **Response contract:** aggregate across **all products** the user holds, per-product map mirroring `status.js` shape (future-proof for deferred ACCT-05) — chosen over eclat-online-only.
- **Composition:** server-side — DB read like `status.js` (fail-closed 401 + no-store), then live Stripe details merged server-side; one client call; Stripe secret never leaks to `src/`.
- **Resilience:** partial degradation — DB state (status, current_period_end) always returned; Stripe enrichment best-effort, card/invoice sections marked unavailable on failure.

---

## Cancellation & portal flow

| Option | Description | Selected |
|--------|-------------|----------|
| New `POST /api/billing/portal` | Mirrors `checkout.js`: Sec-Fetch-Site CSRF guard (WR-06), `getSessionUser` 401 fail-closed, `stripe.billingPortal.sessions.create({ customer, return_url })`, returns `{ url }` | ✓ |
| Reuse checkout endpoint with portal flag | Muddles the contract; not recommended | |
| Let Claude decide | Follow `checkout.js` structure | |

**User's choice:** New `POST /api/billing/portal` endpoint mirroring `checkout.js`.

**Notes:** Consolidated into D-05..D-08:
- **return_url:** `origin + /account` — built from `PUBLIC_ORIGIN` (module-load fail-fast) with `redirectTo` discipline (pathname+search only, never Host-derived — WR-07 fix); fresh `/api/billing/account` refetch on landing shows the new state.
- **Customer scoping:** single Stripe customer (1:1 user↔customer, created at first checkout); one portal session handles all products; matches ACCT-05 direction.
- **CTA + past_due notice (WR-01 + ACCT-04):** state-aware CTA — active/past_due → "Manage" opens portal; no subscription → "Subscribe" to `/subscribe`; `past_due` also shows the clear **"payment failed, update your card"** notice with an **"Update payment method"** portal action. Fixes WR-01 and fulfills ACCT-04 together.

---

## Invoice history

| Option | Description | Selected |
|--------|-------------|----------|
| Live from Stripe API | `stripe.invoices.list({ customer, limit, status: 'paid' })` filtered server-side to the user's customer; always current; no migration | ✓ |
| New invoices DB table via webhooks | Larger scope: migration + webhook events + backfill | |
| Let Claude decide | Start with live Stripe API, DB-caching deferred | |

**User's choice:** Live from the Stripe API.

**Notes:** Consolidated into D-09..D-12:
- **Fetch scope / pagination:** up to 12 most recent paid invoices for the user's customer (matches mocked footprint); no pagination UI.
- **Row shape / receipt link:** invoice number, date, amount + real `hosted_invoice_url` receipt link ("Receipt →" opens in a new tab), mirroring existing table columns.
- **Product coverage:** all products under the customer (customer-scoped fetch shows eclat-online, hardcopy, books in one table); no filtering — consistent with aggregate + single-customer decisions.

---

## Plan label & renewal date

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side label + context-aware renews + real card | Label from stored `stripe_price_id` via `lib/products.js`; Renews aware of status; card from Stripe default payment method | ✓ |
| Live Stripe price lookup per render | Non-deterministic, extra latency, more Stripe calls | |
| Let Claude decide | Implement per existing patterns | |

**User's choice:** Server-side deterministic label; Renews formatting delegated to Claude (context-aware); real card from Stripe.

**Notes:** Consolidated into D-13..D-16:
- **Plan label (D-13):** derived server-side from stored `stripe_price_id` via `lib/products.js` — deterministic, no live lookup.
- **Renews (D-14, Claude's discretion on formatting):** context-aware by status — active → renewal date; canceled → "Access until {date}"; past_due → `current_period_end` + ACCT-04 notice.
- **Card (D-15):** from Stripe customer default payment method (`invoice_settings.default_payment_method`, falling back to the subscription's) → `card.brand` + `card.last4`, resolved server-side; `—` when unavailable; replaces the `'•••• 4242'` mock.
- **Summary panel (D-16):** rendered per held product (eclat-online first), matching the aggregate D-02 decision.

---

## Claude's Discretion

- Finer implementation details of `GET /api/billing/account` (user selected the sibling endpoint AND granted discretion — response fields, merge order, error payloads).
- Renews date formatting per state (locale, "Access until" phrasing) — the states themselves are locked (D-14).
- Invoice date formatting and loading/error skeleton design for the Account panels.
- Exact "Manage" / "Subscribe" / "Update payment method" button styling per the existing design system.

## Deferred Ideas

None — discussion stayed within phase scope. (v2 ACCT-05/06 already tracked in `.planning/REQUIREMENTS.md`.)

---
*Phase: 05-account-management-real-status-cancellation-billing-portal*
*Discussion log generated: 2026-09-09*
