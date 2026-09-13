---
phase: 02-authentication-google-sign-in-server-side-sessions
reviewed: 2026-09-09T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - .env.example
  - api/auth/google.js
  - api/auth/google/callback.js
  - api/auth/logout.js
  - api/auth/session.js
  - lib/session.js
  - middleware.js
  - migrations/0002_sessions_token_hash.sql
  - package.json
  - package-lock.json
  - scripts/check-secrets.js
  - src/App.jsx
  - src/components/Header.jsx
  - src/lib/useSession.js
  - src/routes/Account.jsx
  - src/styles/eclat.css
  - vercel.json
findings:
  critical: 1
  warning: 8
  info: 2
  total: 11
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-09-09T00:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

The Google OAuth sign-in flow is well-structured: ID tokens are independently verified via `jose`/JWKS (signature, issuer, audience all checked), sessions use an opaque high-entropy token with only its SHA-256 hash persisted, cookies carry `httpOnly`/`secure`/`sameSite=lax`, the CSRF `state` uses a double-submit cookie, `Set-Cookie` headers are correctly `.append()`-ed (not `.set()`) everywhere multiple cookies are issued, and `/account` fails closed to the sign-in flow rather than ever rendering gated content client-side. The middleware's cookie-presence check is correctly treated as a non-authoritative UX pre-filter, with `GET /api/auth/session` as the real gate.

However, I found and **verified by direct execution** a real open-redirect bug: `isSafeReturnTo()` in `lib/session.js` does not reject backslash characters, and a `return_to` value like `/\evil.com` passes its check yet resolves — per the WHATWG URL algorithm all browsers implement — to an absolute, off-origin URL (`http://evil.com/`). This value round-trips intact through the `oauth_return_to` cookie and is placed directly into the `Location` header on a **successful** sign-in, meaning a crafted link can bounce a user who just authenticated with their real Google account off to an attacker-controlled domain. I confirmed both the `isSafeReturnTo` bypass and the cookie round-trip against the actual `cookie@2.0.1` package (see reproduction below). This is a BLOCKER.

I also found several robustness gaps (missing DB error handling on the two most security-sensitive endpoints, a React anti-pattern, a non-constant-time CSRF token comparison, and a hardcoded `secure: true` cookie that will silently break local testing over plain HTTP), plus a couple of minor documentation/schema hygiene issues.

## Critical Issues

### CR-01: Open redirect via backslash bypass of `isSafeReturnTo` — exploitable post-login

**File:** `lib/session.js:46-48` (root cause), consumed by `api/auth/google.js:18-19` and `api/auth/google/callback.js:58-59,129`

**Issue:**
`isSafeReturnTo` only guards against a *literal second forward slash* immediately after the leading `/` (to block `//evil.com`), and rejects `/api/*`:

```javascript
export function isSafeReturnTo(path) {
  return typeof path === 'string' && /^\/(?!\/)/.test(path) && !path.startsWith('/api/')
}
```

It does **not** reject backslashes. Per the WHATWG URL standard (implemented identically by every modern browser and by Node's own `URL`), a backslash is treated the same as a forward slash when resolving a relative reference against a special-scheme (http/https) base. I verified this directly:

```
node's URL: new URL('/\\evil.com', 'http://placeholder.local').href
  => "http://evil.com/"          (host becomes evil.com, not placeholder.local)

isSafeReturnTo('/\\evil.com')  => true   (passes the guard)
```

I also confirmed the value survives the cookie round-trip unchanged: `cookie@2.0.1`'s `stringifySetCookie` percent-encodes the backslash (`%2F%5Cevil.com`) when writing the `Set-Cookie` header, and `parseCookie` decodes it back to the literal `/\evil.com` string on the next request — so nothing about the cookie layer strips or rejects it.

**Exploit path:**
1. Attacker sends a victim `https://eclat.example/api/auth/google?return_to=%2F%5Cevil.com%2Fphish`.
2. `api/auth/google.js` reads `return_to`, `isSafeReturnTo` returns `true`, and the value is stored verbatim in the `oauth_return_to` cookie.
3. Victim is redirected to Google's real consent screen and signs in with their **real** Google account — nothing looks wrong.
4. Google redirects back to `api/auth/google/callback.js`. State validates, ID token verifies, session is created — all correct.
5. The callback reads `oauth_return_to` back off the cookie, re-validates with the same flawed `isSafeReturnTo`, and on success does `headers.set('Location', returnTo)` (`api/auth/google/callback.js:129`) — setting the raw string `/\evil.com/phish` as the `Location` header.
6. The victim's browser resolves this relative reference using the same WHATWG algorithm and navigates to `http://evil.com/phish` immediately after a real, successful sign-in on the legitimate site — ideal for a "please re-enter your Google password" phishing follow-up, since the victim just went through a genuine Google auth screen seconds earlier.

Note the error path (`redirectWithError`, `api/auth/google/callback.js:42-48`) is accidentally *not* exploitable the same way, because it reconstructs the `Location` value via `new URL(returnTo, 'http://placeholder.local').pathname + search`, which discards the spoofed host. The success path (line 129) skips this reconstruction and uses `returnTo` directly — this asymmetry is itself evidence the success path is an oversight, not a deliberate design choice.

**Fix:** Reject backslashes explicitly, and/or apply the same safe-reconstruction pattern already used in the error path to the success path so a raw string is never trusted directly for the `Location` header:

```javascript
// lib/session.js
export function isSafeReturnTo(path) {
  return (
    typeof path === 'string' &&
    /^\/(?!\/)/.test(path) &&
    !path.startsWith('/api/') &&
    !path.includes('\\') // blocks the WHATWG backslash-as-slash open-redirect bypass
  )
}
```

```javascript
// api/auth/google/callback.js — belt-and-suspenders: never trust the raw
// string for Location, reconstruct exactly like redirectWithError does.
const safeLocation = new URL(returnTo, 'http://placeholder.local')
headers.set('Location', safeLocation.pathname + safeLocation.search)
```

## Warnings

### WR-01: No error handling around DB operations in the OAuth callback after token verification

**File:** `api/auth/google/callback.js:106-122`
**Issue:** Once the ID token verifies, the user upsert and session insert (`await sql\`...\`` twice) run with no `try/catch`. Every other failure mode in this same file (state mismatch, token-exchange failure, JWT verification failure) is caught and turned into a graceful `redirectWithError` — but a DB error here (transient outage, constraint violation, pool exhaustion) becomes an unhandled rejection, surfacing as a raw framework error instead of the `?auth_error=1` UX the rest of the file establishes.
**Fix:** Wrap the upsert/insert block in `try/catch` and route failures through `redirectWithError(returnTo, headers)` like every other failure path in this file.

### WR-02: No error handling around the DB query in `GET /api/auth/session`

**File:** `api/auth/session.js:28-37`
**Issue:** The `SELECT`/`UPDATE` pair has no error handling. A DB failure throws unhandled instead of returning the documented `{ user: null }` "empty-input case" the file's own header comment describes. In practice the client's `useSession` hook (`src/lib/useSession.js:27-31`) happens to catch the resulting non-JSON/failed fetch and treat it as signed-out, so the visible behavior is still fail-closed — but that's incidental to a client-side `.catch()`, not something this endpoint guarantees itself.
**Fix:** Wrap the query in `try/catch` and return `Response.json({ user: null })` (optionally with a 200/503 as appropriate) on failure, matching the file's stated contract.

### WR-03: No error handling around the DB delete in `POST /api/auth/logout`

**File:** `api/auth/logout.js:24-27`
**Issue:** If the `DELETE FROM sessions` call throws, the handler never reaches the `Set-Cookie` clear at line 30 — the response becomes an unhandled 500 and the session cookie is never cleared. The client does surface this to the user (`signOutState === 'error'` in `src/components/Header.jsx:225-227`), but the server should not let a DB exception escape the handler unhandled.
**Fix:** Wrap the delete in `try/catch`; on failure, still clear the cookie (or explicitly decide and document whether sign-out should be "best-effort cookie clear regardless of DB state").

### WR-04: Navigation side effect performed directly in a component's render body

**File:** `src/routes/Account.jsx:33-39`
**Issue:**
```javascript
if (!user) {
  window.location.assign('/api/auth/google?return_to=/account')
  return null
}
```
`window.location.assign` is called unconditionally during render, not inside a `useEffect`. Render functions are expected to be pure (no side effects) under React's contract; this "works" today only because the resulting full-page navigation happens to mask the impurity. Under React 18 Strict Mode's dev-time double-invocation of render, or future concurrent-rendering scenarios where a render can be started and discarded, this pattern is fragile.
**Fix:**
```javascript
useEffect(() => {
  if (!loading && !user) {
    window.location.assign('/api/auth/google?return_to=/account')
  }
}, [loading, user])

if (loading) return <LoadingState />
if (!user) return null
```

### WR-05: CSRF `state` comparison is not constant-time

**File:** `api/auth/google/callback.js:66`
**Issue:** `stateParam !== oauthState` is a variable-time string comparison. Real-world exploitability is low here (network jitter dwarfs any timing signal, and the `state` cookie is `httpOnly`/short-lived), but this is the one place in the flow where a constant-time comparison is the recognized best practice for defense-in-depth on a security-critical token compare.
**Fix:** Use `crypto.timingSafeEqual` on equal-length buffers (with a length check first, since `timingSafeEqual` throws on mismatched lengths):
```javascript
import { timingSafeEqual } from 'node:crypto'
function safeEqual(a, b) {
  const bufA = Buffer.from(a ?? '')
  const bufB = Buffer.from(b ?? '')
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}
```

### WR-06: Hardcoded `secure: true` cookie option has no local-dev escape hatch

**File:** `lib/session.js:57-59`
**Issue:** `cookieOptions()` always returns `secure: true`. Browsers silently refuse to store a `Secure`-flagged cookie received over plain HTTP. Since these are Vercel serverless functions (not served by `vite dev`), local testing of this entire feature would need `vercel dev`, which serves over plain `http://localhost` by default — meaning none of the `oauth_state`, `oauth_return_to`, or `session` cookies would ever be stored locally, and the flow could only ever be exercised against a deployed (HTTPS) preview/production URL.
**Fix:** Make `secure` conditional on environment, e.g. `secure: process.env.VERCEL_ENV !== undefined || process.env.NODE_ENV === 'production'`, or document explicitly that local testing must go through a deployed preview URL.

### WR-07: `.env.example` documents an unused `SESSION_SECRET` for Phase 2

**File:** `.env.example` (line ~14, under the "Phase 2 — Google OAuth sign-in" heading)
**Issue:** `SESSION_SECRET=` is listed as a Phase 2 variable, but no file under `api/`, `lib/`, or `src/` ever reads `process.env.SESSION_SECRET` — `hashToken()` in `lib/session.js` uses plain unsalted/unkeyed SHA-256, and the phase's own research doc (`02-RESEARCH.md:469`) explicitly concludes "Not actually needed for opaque-hashed-token sessions (D-12)". Leaving it in `.env.example` will lead whoever provisions the Vercel project to set a secret that does nothing, and misrepresents what's actually required to deploy this phase.
**Fix:** Remove the `SESSION_SECRET=` line from `.env.example` (or move it to a "not currently used" note) until a future phase actually needs a signing secret.

### WR-08: `sessions.token_hash` added without a `NOT NULL` constraint

**File:** `migrations/0002_sessions_token_hash.sql:12`
**Issue:** `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_hash TEXT;` leaves the column nullable, and Postgres unique indexes treat multiple `NULL`s as distinct (non-conflicting). Every current insert path (`api/auth/google/callback.js:118-122`) always supplies a hash, so this isn't exploitable today, but the schema itself doesn't enforce the invariant the rest of the code depends on ("every session row has a hash").
**Fix:** Add `ALTER TABLE sessions ALTER COLUMN token_hash SET NOT NULL;` in a follow-up migration once any legacy null rows are backfilled/purged.

## Info

### IN-01: No `email_verified` check before trusting the Google `email` claim

**File:** `api/auth/google/callback.js:104-115`
**Issue:** The upsert keys on `google_sub` (correct — never on email), but `email` is persisted from the ID token without checking the `email_verified` claim. Risk is low here specifically because `google_sub` is the actual identity key, but if `email` is later used for communication or account-recovery purposes in a future phase, an unverified email claim should not be trusted blindly.
**Fix:** Destructure and check `email_verified` from the payload; if `false`, either omit the email or flag the account.

### IN-02: No fail-fast validation of required Google OAuth env vars

**File:** `api/auth/google.js:24-25`, `api/auth/google/callback.js:77-79,95`
**Issue:** `lib/db.js` fails fast at import time if `POSTGRES_URL` is unset, giving a clear startup error. `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` have no equivalent check — an unset value just flows into a Google request that will fail far downstream (or, for `GOOGLE_REDIRECT_URI`, could silently mismatch what's registered in the Google Cloud Console), surfacing only as an opaque `auth_error=1` with no indication of the actual misconfiguration.
**Fix:** Add the same fail-fast pattern used in `lib/db.js` for these three vars, or at minimum log a specific server-side diagnostic before falling back to the generic error redirect.

---

_Reviewed: 2026-09-09T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
