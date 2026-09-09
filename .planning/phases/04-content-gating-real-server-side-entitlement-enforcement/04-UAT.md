---
status: testing
phase: 04-content-gating-real-server-side-entitlement-enforcement
source: [04-VERIFICATION.md]
started: 2026-09-10T00:00:00Z
updated: 2026-09-10T00:00:00Z
---

## Current Test

number: 1
name: Live entitlement matrix
expected: |
  Against a seeded Postgres DB and a real Google-authenticated session, exercise:
  (a) active `eclat-online` subscriber -> /editions/:no unlocks with the API's paragraphs
  (b) canceled `eclat-online` row -> ordinary paywall (never unlocked)
  (c) active `eclat-hardcopy`-only row (no `eclat-online` row) -> ordinary paywall (never unlocked)
  (d) `past_due` `eclat-online` row -> ordinary paywall (never unlocked)
  (e) no session cookie -> skeleton, no fine print
  (f) signed-in + a forced API 5xx -> paywall with the `--bad` "Couldn't confirm your subscription — reload to try again." fine print, and only in that case
awaiting: user response

## Tests

### 1. Live entitlement matrix
expected: |
  (a) active eclat-online subscriber unlocks the edition; (b) canceled, (c) hardcopy-only, and (d) past_due rows all show the ordinary paywall; (e) no session shows the skeleton with no fine print; (f) signed-in + API 5xx shows the paywall with the --bad fine print only in that case.
result: [pending]

### 2. check-secrets.js prerendered-HTML blind spot (WR-01)
expected: |
  Decide whether scripts/check-secrets.js's SERVER_ONLY_IMPORT_MARKERS loop must be extended to scan all of dist/ (not just dist/assets/) before Phase 5, or whether this is acceptable as tracked follow-up debt. Reproduced in this run: reintroducing the gated marker phrase into a prerendered dist/<route>/index.html file does not trip the guard (exit 0 instead of exit 1) — the exact leak vector D-02 fixed. Not a live vulnerability today (current build is clean), but a real gap in the regression guard.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
