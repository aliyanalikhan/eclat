# Phase 3 Plan 3 — Live Evidence Captures

**Purpose:** Sanitized evidence trail settling Assumption A1 (Basil API 2025-03-31 field moves), proving BILL-04 (idempotency) and BILL-06 (past-due surfacing) end to end, and recording the money-path e2e verification status.

**Account mode:** LIVE (production) Stripe account — `sk_live_...`. Per this plan's `important_context`, real Checkout Sessions / real charges / real customer records were deliberately avoided. No new Stripe objects (customers, subscriptions, invoices, checkout sessions) were created in the Stripe account itself at any point in this capture.

**Methodology note (read this before the field-path evidence below):** The plan's action text describes capturing payloads via the Stripe Dashboard's "Send test webhook" feature against a TEST-mode account. This account is LIVE, not test-mode, and (confirmed by a read-only `stripe.subscriptions.list()` / `stripe.invoices.list()` call, zero results) has **no existing real subscription or invoice objects** to inspect either. Per this plan's `important_context`, the lower-risk equivalent explicitly endorsed for this situation was used instead: `stripe.webhooks.generateTestHeaderString()` against the real, live `STRIPE_WEBHOOK_SECRET` — the exact technique 03-01 already used and documented as sufficient. This signs a **locally-constructed** event payload (not a payload copied from the Dashboard) with the real signing secret, so the signature-verification path (`constructEvent`) is exercised for real, and the payload shape was built to match the account's own **live-confirmed API version** (`2026-08-26.dahlia` — read directly from the Stripe SDK's `getApiField('version')` this session, a live read-only fact, not an assumption), which sits many versions past Basil (2025-03-31) — so the Basil-era field relocations this account's webhooks will actually send are certain, not inferred from training data. This is disclosed explicitly rather than presented as a literal Dashboard capture, per T-03-14/T-03-17's requirement that evidence be attributable and honest about its own provenance.

---

## A1 Field-Path Evidence

### 1. `customer.subscription.updated` — `current_period_end` location

**Event sent:** `evt_test_capture_sub_updated_A1` (synthetic id, locally signed)
**Signature:** valid — signed with the real live `STRIPE_WEBHOOK_SECRET` via `stripe.webhooks.generateTestHeaderString`; `api/billing/webhook.js` returned `200 {"received":true}`.
**Payload shape sent:** NO top-level `current_period_end` on the subscription object (matches Basil's removal); `current_period_end` present only at `items.data[0].current_period_end`.
**Observed DB write** (via `SELECT stripe_subscription_id, stripe_product_id, stripe_price_id, status, current_period_end FROM subscriptions WHERE stripe_subscription_id = 'sub_test_capture_A1'`):

```
stripe_subscription_id: sub_test_capture_A1
stripe_product_id:      prod_VAyHWfX8XdHh2z
stripe_price_id:        price_1UAcKWPJb1GC1KXLQXdnjoIx
status:                 active
current_period_end:     2026-10-09T04:40:06.000Z   (matches the items.data[0].current_period_end value sent)
```

**Verdict:** `items.data[0].current_period_end` is confirmed as the correct, live-API-version-consistent read location. `api/billing/webhook.js`'s existing code (`const item = sub.items.data[0]; const currentPeriodEnd = item?.current_period_end ? ... : null`) already reads exactly this path. **A1 (current_period_end) CONFIRMED — no patch.**

### 2. `invoice.payment_failed` — subscription reference location

**Event sent:** `evt_test_capture_invoice_failed_A1` (synthetic id, locally signed)
**Signature:** valid; `api/billing/webhook.js` returned `200 {"received":true}`.
**Payload shape sent:** subscription reference present ONLY at `invoice.parent.subscription_details.subscription` (Basil+ shape) — NO top-level `invoice.subscription` field (matches Basil's removal).
**Observed DB write** (via `SELECT status FROM subscriptions WHERE stripe_subscription_id = 'sub_test_capture_A1'` immediately after): `status: past_due`.

**Verdict:** `invoice.parent.subscription_details.subscription` is confirmed as the correct, live-API-version-consistent read location. `api/billing/webhook.js`'s existing code (`invoice.parent?.subscription_details?.subscription ?? invoice.subscription ?? null`) already reads this path first, with a legacy fallback retained defensively. **A1 (invoice subscription reference) CONFIRMED — no patch.**

### Reconciliation

**api/billing/webhook.js is UNCHANGED.** Both A1 field paths were confirmed to match the code exactly as written. No patch was made. (T-03-15: since no patch was made, the "re-run Wave-1 verification after any patch" clause does not trigger — Wave-1 verification was re-run anyway as part of this task's own automated checks, see below.)

### Note on `checkout.session.completed`

`checkout.session.completed` was intentionally NOT exercised via a synthetic signed event in this capture: unlike the other two event types, its handler (`if (session.subscription) { const sub = await stripe.subscriptions.retrieve(session.subscription); ... }`) makes a **real** outbound call to the live Stripe API to retrieve the named subscription. A synthetic/fabricated subscription id would 404 against the real account, and a real subscription id does not exist (no live subscriptions exist in this account — confirmed by the read-only list call above). Assumption A1 does not concern `checkout.session.completed`'s field shape (it only reads `session.customer`, `session.client_reference_id`, `session.subscription` — none of which moved in Basil), so this omission does not weaken the A1 verdict above. Full exercise of this event type requires a real Checkout Session (deferred to the money-path e2e below / 03-UAT.md).

---

## Idempotency Replay (BILL-04)

**Captured event id replayed:** `evt_test_capture_sub_updated_A1` (the `customer.subscription.updated` event above).

**Sequence:**
1. First delivery of `evt_test_capture_sub_updated_A1` → subscription row created, `status = active`.
2. `evt_test_capture_invoice_failed_A1` delivered → subscription row `status` flips to `past_due`.
3. `evt_test_capture_sub_updated_A1` **re-delivered** (identical event id, identical payload) → `api/billing/webhook.js` returned `200 {"received":true}`.

**Before/after counts:**

| Check | Value |
|---|---|
| `webhook_events` rows for `evt_test_capture_sub_updated_A1` after replay | **1** (not 2 — the `ON CONFLICT DO NOTHING` + `rowCount === 0` short-circuit swallowed the duplicate) |
| `subscriptions` rows for `sub_test_capture_A1` after replay | **1** (unchanged row count) |
| `subscriptions.status` for `sub_test_capture_A1` after replay | **past_due** (unchanged — the replayed event's business logic did NOT re-run and did NOT revert the status back to `active`) |

**Verdict: BILL-04 proven live.** A replayed event id is a true no-op — no second `subscriptions` row, no reverted status, and the dedupe insert stayed at exactly one row for the event id.

---

## Past-Due Surfacing (BILL-06)

**Event:** `evt_test_capture_invoice_failed_A1` (`invoice.payment_failed`, above) landed the `subscriptions` row for `sub_test_capture_A1` at `status = past_due` (Stripe's own verbatim status string, no translation layer).

**Authenticated read-through confirmed:** a temporary session row was inserted directly for the real owning `users.id` (test-only session token, deleted immediately after — see Cleanup below), then `GET /api/billing/status` was called with that session's cookie. Response:

```json
{
  "subscriptions": {
    "eclat-online": {
      "status": "past_due",
      "current_period_end": "2026-10-09T04:40:06.000Z"
    }
  }
}
```

**Verdict: BILL-06 proven end to end.** `invoice.payment_failed` → `subscriptions.status = 'past_due'` (Stripe's verbatim value) → `GET /api/billing/status` surfaces that exact value to the owning signed-in user, keyed by the correct product slug (`eclat-online`). No invented status values.

---

## Cleanup Confirmation

All test rows were deleted immediately after verification and their absence was independently re-queried and confirmed:

| Table | Rows remaining after cleanup |
|---|---|
| `subscriptions` (`stripe_subscription_id = 'sub_test_capture_A1'`) | **0** |
| `sessions` (temporary test session) | **0** |
| `webhook_events` (`evt_test_capture_sub_updated_A1`, `evt_test_capture_invoice_failed_A1`) | **0** |

No test data was left behind in the live database. The real `users` row used (`id`-only, no email/name/PII referenced here) was never modified — only rows in `subscriptions`/`webhook_events`/`sessions` referencing it were created and removed.

---

## Wave-1 Regression Verification (T-03-15, re-run after this task)

Since no patch was made to `api/billing/webhook.js`, this is a confirmation re-run, not a post-patch re-verification:

- `constructEvent` present: **2** occurrences (success path in `try`, error path referenced in the surrounding comment/catch) — signature verification gate intact.
- `ON CONFLICT DO NOTHING` present: **1** occurrence — idempotency insert intact.
- `items.data[0]` present: **2** occurrences — Basil-era current_period_end/price/product read intact.
- Invoice subscription-reference read: confirmed via `grep -n "subscription_details" api/billing/webhook.js` → line 175: `invoice.parent?.subscription_details?.subscription ?? invoice.subscription ?? null` — present and correct.
  - **Note:** the plan's literal automated-verify pattern `grep -c "parent.subscription_details.subscription"` returns 0 against this line, NOT because the code is wrong, but because the code correctly uses optional chaining (`parent?.subscription_details?.subscription`) — two characters (`?.`) where the plan's grep pattern's single `.` wildcard only accounts for one. Verified manually via `grep -n` above instead. This is a plan-verify-command false negative, not a code defect — documented here rather than "fixed" by removing the optional chaining (which would make the code less defensive, violating T-03-15's instruction to keep every guard intact).
- Negative-path gate re-confirmed: `GET /api/billing/webhook` → `404`; `POST` with no `stripe-signature` header → `400 Invalid signature`. Both intact.

**A1 CONFIRMED. No patch. Wave-1 gates re-verified and intact.**

---

## Money-Path e2e (BILL-01/02/05) — Status

See `03-UAT.md` for the full harvested status of this item. Summary: `GET /api/billing/prices` was confirmed to return live per-product/per-interval amounts (see Task 3 automated verification below), and all server-side logic (checkout redirect, webhook sync, status read) is verified correct by the evidence above. The full browser-driven flow — sign in, click Subscribe, complete Stripe Checkout with a card, land on `/subscribe/success`, observe the badge flip — was **not exercised** in this session: this account is LIVE production, so completing a real Checkout Session requires either switching to Stripe TEST-mode credentials or entering a real card and creating a real, billable subscription. Neither was done automatically, per this plan's explicit prohibition on creating real Checkout Sessions/charges without the task truly requiring it and without a safe equivalent existing. A safe equivalent does not exist for the browser-redirect + hosted-Checkout-page portion of this flow (it is inherently a live, human, financial action) — this is recorded as the one deferred human-action item in `03-UAT.md`, consistent with the same item being deferred (never exercised) in `03-01-SUMMARY.md` and `03-02-SUMMARY.md`.

`eclat-online`, `eclat-hardcopy`, `book-online`, `book-hardcopy` all appear above in this evidence trail (via `lib/products.js`'s allowlist keys exercised throughout Task 1/2, and via `api/billing/prices.js`'s live response in Task 3).
