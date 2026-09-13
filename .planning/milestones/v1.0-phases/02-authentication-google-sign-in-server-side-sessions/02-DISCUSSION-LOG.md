# Phase 2: Authentication — Google Sign-In & Server-Side Sessions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 2-Authentication — Google Sign-In & Server-Side Sessions
**Areas discussed:** Sign-in entry point & post-login redirect, Session cookie & lifetime, Sign-out placement & failed sign-in handling, Profile data sync on repeat sign-in

---

## Sign-in entry point & post-login redirect

### Where should "Sign in with Google" live in the UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Replace Account link with auth-aware state | The header's "Account" link becomes "Sign in" when signed out, and "Account" (or the user's name/avatar) when signed in — one nav slot, matches today's single-link pattern | ✓ |
| Separate "Sign in" button | Add a distinct "Sign in" button/link alongside the existing Account link and Subscribe button | |
| Dedicated /login page only | No header entry point yet; sign-in only reachable via a direct /login URL | |

### Straight to Google consent screen, or an intermediary page first?

| Option | Description | Selected |
|--------|-------------|----------|
| Straight to Google redirect | Clicking "Sign in" immediately redirects to Google's OAuth consent screen | ✓ |
| Intermediary page first | Clicking "Sign in" goes to a branded page with a "Continue with Google" button first | |

### Where does the user land after a successful Google sign-in?

| Option | Description | Selected |
|--------|-------------|----------|
| Return to where they were | Redirect back to whatever page triggered sign-in | ✓ |
| Always redirect to /account | Every successful sign-in lands on the Account page | |
| Always redirect to home | Every successful sign-in lands on the homepage | |

### Does visiting /account while signed out behave differently than today's demo page?

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect signed-out visitors to sign-in | /account requires a session; visiting it while signed out redirects into the sign-in flow | ✓ |
| Show Account page with an inline sign-in prompt | /account stays reachable while signed out but shows a "Sign in" prompt instead of data | |

**User's choice:** Reuse the existing single header nav slot as an auth-aware toggle; go straight to Google's consent screen with no intermediary page; return the user to wherever they started; and treat /account as a real authenticated route from this phase forward.
**Notes:** None — no follow-up questions requested for this area.

---

## Session cookie & lifetime

### How long should a session last before requiring re-login?

| Option | Description | Selected |
|--------|-------------|----------|
| 30-day sliding window | Session expiry extends on activity | ✓ |
| 30-day fixed expiry | Session expires exactly 30 days after sign-in regardless of activity | |
| Long-lived (e.g. 1 year) | Session lasts a full year | |

### Can a user be signed in on multiple devices/browsers at once?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — concurrent sessions allowed | Each sign-in creates a new row in `sessions`; other devices stay signed in | ✓ |
| No — new sign-in invalidates other sessions | Signing in on a new device deletes/expires all other active sessions | |

### What identifies a session to the browser?

| Option | Description | Selected |
|--------|-------------|----------|
| Random opaque token, hashed in DB | Cookie holds a cryptographically random token; only its hash is stored in `sessions` | ✓ |
| Raw sessions.id (UUID) as the cookie value | The cookie directly carries the `sessions.id` UUID already in the schema | |

### Cookie security attributes — any reason to deviate from strict defaults?

| Option | Description | Selected |
|--------|-------------|----------|
| httpOnly, Secure, SameSite=Lax | Standard for a same-origin redirect-flow session cookie | ✓ |
| You decide | Leave the exact attribute tuning to implementation/research | |

**User's choice:** 30-day sliding-window session, concurrent multi-device sessions allowed, opaque hashed token (not raw UUID) as the cookie value, and standard httpOnly/Secure/SameSite=Lax cookie attributes.
**Notes:** None — no follow-up questions requested for this area.

---

## Sign-out placement & failed sign-in handling

### Where does sign-out live in the UI?

| Option | Description | Selected |
|--------|-------------|----------|
| In the header, where "Sign in" used to be | The auth-aware header slot shows the user with a sign-out action once signed in | ✓ |
| On the Account page only | No sign-out control in the header; user must go to /account to sign out | |

### What happens if Google sign-in is denied, cancelled, or token verification fails?

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect back with an inline error message | User lands back on the page/flow they started from with a brief error message | ✓ |
| Dedicated error page | A standalone error page explains what went wrong with a retry link | |

**User's choice:** Sign-out lives in the same header slot as sign-in; failed/denied sign-in redirects back with an inline error rather than a dedicated error page.
**Notes:** This area resolved in 2 questions rather than the full 4 — no further clarification needed.

---

## Profile data sync on repeat sign-in

### Do name/email/picture refresh from Google on every sign-in, or only get set once at first sign-up?

| Option | Description | Selected |
|--------|-------------|----------|
| Refresh on every sign-in | name/email/picture in `users` are overwritten from Google's ID token claims each time someone signs in | ✓ |
| Set once at first sign-up only | name/email/picture are written once and never touched again | |

**User's choice:** Refresh profile fields from Google on every sign-in, alongside the existing `last_login_at` update.
**Notes:** This area resolved in a single question — no further clarification needed.

---

## Claude's Discretion

- Exact OAuth route paths/naming and Vercel runtime choice (Node vs Edge) for the auth serverless functions
- CSRF protection mechanism for the OAuth redirect (`state` parameter validation) — standard practice, not surfaced as a user choice
- Exact error-message copy for the failed sign-in inline message
- Visual treatment of the signed-in header state (name only / name + avatar / dropdown) — functional requirement (must expose sign-out) is locked, visual detail is not
- Exact CSP directive additions needed to permit the Google OAuth redirect

## Deferred Ideas

None — discussion stayed within phase scope.
