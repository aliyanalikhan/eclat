---
status: testing
phase: 05-account-management-real-status-cancellation-billing-portal
source: [05-VERIFICATION.md]
started: 2026-09-10T20:15:00Z
updated: 2026-09-10T20:15:00Z
---

## Current Test

number: 1
name: DB/session failure fails closed on /account
expected: |
  With vercel dev and a seeded DB row for a signed-in user, temporarily break the DB connection
  (or force an exception inside the subscriptions SELECT) and load /account. The page renders
  "Couldn't confirm your account — reload to try again." (the accountError branch), NOT the
  zero-subscriptions "Subscribe" upsell.
awaiting: user response

## Tests

### 1. DB/session failure fails closed on /account
expected: |
  Forcing a DB/session failure renders "Couldn't confirm your account — reload to try again.",
  never the zero-subscriptions "Subscribe" upsell. Confirms CR-01 end-to-end.
result: [pending]

### 2. Signed-out regression check on /subscribe and /editions/:no
expected: |
  While signed OUT, /subscribe shows no "Couldn't confirm your current plans" notice, and any
  /editions/:no page shows its normal paywall preview — both render exactly as before the CR-01
  fix, confirming the 401 exemption in useSafeFetch prevented a Phase 3/4 regression.
result: [pending]

### 3. Multi-product invoice de-duplication
expected: |
  Signed-in active subscriber holding 2+ held products (e.g. eclat-online + book-online), each
  with paid invoices — load /account and inspect the Billing history table. Each real invoice
  appears exactly once, zero duplicate rows, no duplicate-React-key console warning.
result: [pending]

### 4. Live cancellation shows "Access until" + confirmation notice
expected: |
  Cancel an active subscription via the "Manage" -> Stripe portal flow, return to /account before
  the current period ends. The panel shows "Access until {date}" instead of "Renews {date}", a
  confirmation notice states the subscription won't renew, and the "Manage" button is still
  present (not hidden).
result: [pending]

### 5. Canceled-product panel has no in-page resubscribe path (non-blocking, carried forward)
expected: |
  Canceled panel shows Status/Plan/"Access until"/Card and nothing actionable; the global header
  "Subscribe" link is the only resubscribe path. This is a UX judgment call, not a code defect.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
