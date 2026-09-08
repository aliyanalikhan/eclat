---
status: testing
phase: 02-authentication-google-sign-in-server-side-sessions
source: [02-VERIFICATION.md]
started: 2026-09-09T00:05:00Z
updated: 2026-09-09T00:05:00Z
---

## Current Test

number: 1
name: Real Google OAuth round-trip
expected: |
  Run `vercel dev` with GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI set (redirect URI registered in Google Cloud Console). Visit the site signed out, click "Sign in" in the header, approve with a real Google account. Browser lands on Google's real consent screen (no branded intermediary page); on approval, returns to the exact originating page with the header showing the signed-in name/avatar instead of "Sign in".
awaiting: user response

## Tests

### 1. Real Google OAuth round-trip
expected: Browser lands on Google's real consent screen (no branded intermediary page); on approval, returns to the exact originating page with the header showing the signed-in name/avatar instead of "Sign in".
result: [pending]

### 2. Session persistence across reloads
expected: While signed in, reload the page several times — header continues to show the signed-in name/avatar on every reload, no re-authentication prompt.
result: [pending]

### 3. Sign-out click-through + private-window /account redirect
expected: While signed in, open the sign-out menu and click "Sign out", reload — header returns to "Sign in" and stays that way across reload. In a private window, visiting /account directly while signed out redirects straight into Google sign-in without ever flashing the old mocked page content.
result: [pending]

### 4. Header visual states (no flash, avatar, menu interactions)
expected: No visible flash between "Sign in" and the signed-in name/avatar on any reload. Real Google profile photo renders (or a legible initials-circle fallback if it 403s). Disclosure menu opens/closes on click, Escape, outside-click, and route change; "Sign out" visibly dims while in flight.
result: [pending]

### 5. Denied-consent handling
expected: Visit /account while signed in (real content shows). At Google's consent screen during a fresh sign-in attempt, click "Cancel" instead of approving — returns to the originating page with a brief "Sign-in failed — try again." notice; reloading does not re-show it. /account briefly shows "Checking your session…" before real content appears (never a stale flash).
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
