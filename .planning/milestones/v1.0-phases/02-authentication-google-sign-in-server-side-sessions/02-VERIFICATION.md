---
phase: 02-authentication-google-sign-in-server-side-sessions
verified: 2026-09-09T00:00:00Z
status: passed
score: 24/24 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps: []
human_verification:

  - test: "Run `vercel dev` with GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI set (redirect URI registered in Google Cloud Console). Visit the site signed out, click 'Sign in' in the header, approve with a real Google account."
    expected: "Browser lands on Google's real consent screen (no branded intermediary page); on approval, returns to the exact originating page with the header showing the signed-in name/avatar instead of 'Sign in'."
    why_human: "A real OAuth round-trip against Google's live consent screen cannot be automated in this environment — no automated check can forge a Google-signed ID token (02-01-PLAN Task 1)."

  - test: "While signed in, reload the page several times."
    expected: "Header continues to show the signed-in name/avatar on every reload — no re-authentication prompt."
    why_human: "Confirms the session persists server-side across full page reloads in a real browser, not just in a scripted DB round-trip (02-01-PLAN Task 2)."

  - test: "While signed in, open the sign-out menu and click 'Sign out', reload. Separately, in a private window, visit /account directly while signed out."
    expected: "After sign-out, header returns to 'Sign in' and stays that way across reload. In the private window, /account redirects straight into Google sign-in without ever flashing the old mocked page content."
    why_human: "Confirms the middleware pre-filter and DB-backed sign-out behave correctly together in an actual browser (02-02-PLAN Task 1)."

  - test: "Reload the site while signed in and signed out. Sign in with a real Google account and observe the header transition. Open the sign-out menu and check its visual states."
    expected: "No visible flash between 'Sign in' and the signed-in name/avatar on any reload. Real Google profile photo renders (or a legible initials-circle fallback if it 403s). Disclosure menu opens/closes on click, Escape, outside-click, and route change; 'Sign out' visibly dims while in flight."
    why_human: "Visual layout, animation smoothness, and flash-of-wrong-state are not verifiable by grep or a scripted fetch (02-02-PLAN Task 2)."

  - test: "Visit /account while signed in (real content should show). At Google's consent screen during a fresh sign-in attempt, click 'Cancel' instead of approving. Reload afterward."
    expected: "/account briefly shows 'Checking your session…' before real content appears (never a stale flash). Canceling at Google returns to the originating page with a brief 'Sign-in failed — try again.' notice; reloading does not re-show it."
    why_human: "Denied-consent handling and the loading-to-content transition timing can only be judged by watching a real browser session (02-03-PLAN Task 1)."
---

# Phase 2: Authentication — Google Sign-In & Server-Side Sessions Verification Report

**Phase Goal:** A user can sign in with Google, and the server independently verifies their identity before trusting it — no client-supplied identity claim is ever trusted directly.
**Verified:** 2026-09-09
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

All truths below were checked against the current codebase (not SUMMARY.md claims). Where the codebase makes a runtime claim, I re-ran the actual code (not the plan's canned test scripts) against the real, currently-installed dependencies (`npm install` was run to materialize `jose`/`cookie`/`@vercel/functions`, previously absent from `node_modules`).

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sign-in anchor navigates directly to Google's consent screen, scope=openid email profile, no intermediary page | ✓ VERIFIED | `src/components/Header.jsx:232-237` renders a plain `<a href="/api/auth/google?return_to=...">` (no `onClick`, no React Router `Link`). Executed `api/auth/google.js` live: returns 302 to `https://accounts.google.com/o/oauth2/v2/auth?...&scope=openid+email+profile...` and sets `oauth_state`/`oauth_return_to` cookies (verified by direct invocation, not grep). |
| 2 | Callback independently verifies ID token (signature/audience/issuer/expiry) via jose before any session row is created | ✓ VERIFIED | `api/auth/google/callback.js:101-112`: `jwtVerify(idToken, GOOGLE_JWKS, { issuer: [...], audience: GOOGLE_CLIENT_ID })` wrapped in try/catch that `redirectWithError`s on **any** failure, strictly before the upsert/session-insert block (lines 116-140) executes. Verification-then-persistence ordering confirmed by reading full file top-to-bottom. |
| 3 | Internal identity is always `google_sub` via `ON CONFLICT (google_sub)`, never merged by email | ✓ VERIFIED | `callback.js:118-127`: `INSERT INTO users (...) ON CONFLICT (google_sub) DO UPDATE ...`. No email-based lookup anywhere in the file. |
| 4 | `users.name/email/picture` refreshed on every sign-in, not only at creation | ✓ VERIFIED | Same `ON CONFLICT` clause: `DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, picture = EXCLUDED.picture, last_login_at = now()`. |
| 5 | Session cookie holds a random 256-bit opaque token; only its SHA-256 hash is written to `sessions.token_hash` | ✓ VERIFIED | `lib/session.js:24-28,35-37`: `newSessionToken()` returns `{raw, hash}` from `randomBytes(32)`/`createHash('sha256')`. Executed live: raw/hash pair generated, confirmed `hashToken(raw) === hash`. `callback.js:130-133` inserts only `hash` into `sessions.token_hash`; `raw` only ever goes into the Set-Cookie header. |
| 6 | Session cookie set with httpOnly, Secure, SameSite=Lax | ✓ VERIFIED | `lib/session.js:71-74` `cookieOptions()` returns `{httpOnly: true, secure, sameSite: 'lax', path: '/'}`; `secure` is `true` in Vercel/production (`VERCEL_ENV` set or `NODE_ENV==='production'`), `false` only for local `vercel dev` over plain HTTP (WR-06 fix, confirmed live: `cookieOptions()` returns `secure:false` with neither env var set, `true` would be forced once deployed). |
| 7 | Session-check with no cookie returns null user, not a throw | ✓ VERIFIED | `api/auth/session.js:24-25`: `if (!raw) return Response.json({ user: null })` — early return, no throw path reachable. |
| 8 | Session exactly at expiry boundary treated as invalid — strict `>` | ✓ VERIFIED | `api/auth/session.js:33`: `WHERE s.token_hash = ${hash} AND s.expires_at > now()` — strict inequality, not `>=`. |
| 9 | Two concurrent sessions for the same user are independently valid; checking one never mutates the other | ✓ VERIFIED | `api/auth/session.js:39`: `UPDATE sessions SET expires_at = ... WHERE id = ${rows[0].session_id}` — scoped to that session row's own UUID primary key. A primary-key equality filter is guaranteed by Postgres semantics to touch exactly one row, so this invariant is provable by static reading of the query, not merely inferred; the plan's own automated test only exercised a single session, so this specific two-device claim rests on the PK-scoping argument rather than an executed multi-row test. |
| 10 | Successful sign-in returns to `return_to`; unsafe/off-site values rejected → `/` | ✓ VERIFIED | `lib/session.js:53-60` `isSafeReturnTo` rejects `//`, `/api/*`, and (post-fix) any backslash. Live-tested against the real module: `isSafeReturnTo('/\\evil.com')` → `false`, `isSafeReturnTo('/account')` → `true`, `isSafeReturnTo('//evil.com')` → `false`, `isSafeReturnTo('/api/foo')` → `false`. |
| 11 | No raw Google ID token / OAuth access token / raw session token ever leaves the server on any client-readable surface | ✓ VERIFIED | `api/auth/session.js:48` response body only contains `{name, email, picture}`; `callback.js` never returns/logs `idToken` or the token-exchange response; only the httpOnly `session` cookie (raw token) is set via `Set-Cookie`, never in a response body. |
| 12 | Signing out deletes the session DB row (not just the cookie); a captured old cookie is rejected immediately after | ✓ VERIFIED | `api/auth/logout.js:33-40`: `DELETE FROM sessions WHERE token_hash = ${hash}` before clearing the cookie. Combined with `session.js`'s `WHERE s.token_hash = ...` lookup, a deleted row can never match on a subsequent `/api/auth/session` call. |
| 13 | No password field / email-password sign-in exists anywhere | ✓ VERIFIED | `grep -i "password"` across all of `src/` returned zero matches. |
| 14 | Middleware only checks cookie presence (no DB call) before redirecting `/account` | ✓ VERIFIED | `middleware.js` imports only `@vercel/functions`; no `lib/db.js` import; `hasSessionCookie()` is a pure regex test on the `Cookie` header. |
| 15 | Header renders exactly one of three auth-slot states, no visible flash | ✓ VERIFIED (structure) / see human-check for flash timing | `Header.jsx:162-238`: mutually-exclusive `loading ? ... : user ? ... : ...` ternary guarantees exactly one branch renders; the "no visible flash" claim about paint timing is inherently a human-observable property and is listed below under Human Verification. |
| 16 | Signed-in label truncates to 18 chars + ellipsis, falls back to "Account" | ✓ VERIFIED | `Header.jsx:14-18` `truncateName()` implements exactly this logic. |
| 17 | Avatar renders via CSP img-src allowance + `referrerPolicy="no-referrer"`, falls back to initials circle on error | ✓ VERIFIED | `Header.jsx:174-186`: `<img referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)}>` / fallback `<span>` branch; `vercel.json:24` and `public/_headers:18` both include `img-src 'self' data: https://*.googleusercontent.com`. |
| 18 | Sign-out menu item dims + non-interactive in flight; shows inline error and stays open on failure | ✓ VERIFIED | `Header.jsx:97-108,219,225-227`; CSS `.auth-menu__item.is-pending { opacity: 0.5; pointer-events: none; }` (`eclat.css:480-483`); on catch, `signOutState` set to `'error'`, menu is not closed, `.auth-menu__error` renders. |
| 19 | Header carries no separate error UI for failed sign-in (lives at App.jsx shell level) | ✓ VERIFIED | `grep "auth_error" src/components/Header.jsx` → no matches; the notice only exists in `src/App.jsx`. |
| 20 | "Sign in" anchor is a full native navigation, no onClick/spinner | ✓ VERIFIED | `Header.jsx:232-237` — plain `<a href>`, no `onClick` attribute anywhere on that element. |
| 21 | `/account` never renders mocked content for a signed-out visitor, even briefly | ✓ VERIFIED | `src/routes/Account.jsx:30-49`: `if (loading) return <...Checking your session…>`; `if (!user) return null` — the existing panel/invoices JSX is unreachable unless `user` is truthy. |
| 22 | If the session-check request itself fails, `/account` fails closed identically to signed-out | ✓ VERIFIED | `src/lib/useSession.js:27-31`: `.catch(() => { setUser(null); setLoading(false) })` — a network/5xx failure resolves to the same `user === null` state `Account.jsx` already treats as signed-out; `api/auth/session.js` itself also fails closed on a DB error (`catch { return Response.json({ user: null }) }`, WR-02 fix). |
| 23 | Failed/denied/cancelled sign-in shows a one-time inline notice tied to `?auth_error=1`, self-clearing via `history.replaceState` | ✓ VERIFIED | `src/App.jsx:32-39`: reads `auth_error=1` from `window.location.search`, sets `authError`, immediately strips the param via `window.history.replaceState`; notice markup (lines 49-61) is conditioned solely on `authError` state, no persistent storage. |
| 24 | No password/email sign-in option exists after this plan's changes | ✓ VERIFIED | Re-confirmed same repo-wide grep after all three plans' changes — zero matches. |

**Score:** 24/24 truths verified (0 present-but-behavior-unverified)

### Deferred Items

None — no gaps exist to defer against later phases.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `migrations/0002_sessions_token_hash.sql` | `sessions.token_hash` column + unique index | ✓ VERIFIED | File present, idempotent `IF NOT EXISTS` guards; `0003_sessions_token_hash_not_null.sql` (post-review, WR-08) additionally tightens the column to `NOT NULL`. |
| `lib/session.js` | Token/hash/return-to/cookie primitives, server-only | ✓ VERIFIED | All exports present (`newSessionToken`, `hashToken`, `isSafeReturnTo`, `cookieOptions`, `serializeCookie`, `parseCookies`); "SERVER-ONLY" banner comment present. |
| `api/auth/google.js` | GET handler starting OAuth redirect | ✓ VERIFIED | Executed live; correct 302 + cookies + scope. |
| `api/auth/google/callback.js` | GET handler: state validation, token exchange, verification, upsert, session, redirect | ✓ VERIFIED | Full flow present; DB-error handling (WR-01) and constant-time state compare (WR-05) added post-review. |
| `api/auth/session.js` | GET handler returning current user or null | ✓ VERIFIED | Present, fail-closed on DB error (WR-02). |
| `api/auth/logout.js` | POST handler deleting session row + clearing cookie | ✓ VERIFIED | Present, fail-safe error surfacing (WR-03). |
| `middleware.js` | Edge cookie-presence pre-filter for `/account` | ✓ VERIFIED | Present at project root, matcher `['/account']`, no DB import. |
| `src/lib/useSession.js` | Client hook `{user, loading, refetch}` | ✓ VERIFIED | Present, fail-closed `.catch()`. |
| `src/components/Header.jsx` | Full three-state auth-aware nav slot + sign-out menu | ✓ VERIFIED | Present and complete. |
| `src/routes/Account.jsx` | Client-side auth gate | ✓ VERIFIED | Present, effect-based redirect (WR-04 fix moved it out of render body). |
| `src/App.jsx` | Shell-level `auth_error` notice | ✓ VERIFIED | Present. |
| `src/styles/eclat.css` | `.auth-slot`/`.auth-avatar`/`.auth-menu` rule set | ✓ VERIFIED | All 13 selectors present and substantive (not empty rule bodies). |
| `vercel.json` / `public/_headers` | CSP `img-src` widened for googleusercontent.com | ✓ VERIFIED | Both files updated identically. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `Header.jsx` | `api/auth/google.js` | plain `<a href>` | ✓ WIRED | Confirmed no `onClick`, real `href`. |
| `callback.js` | Google JWKS | `jwtVerify(...)` | ✓ WIRED | Confirmed present with audience check. |
| `callback.js` | `lib/db.js` | upsert + session insert | ✓ WIRED | `ON CONFLICT (google_sub)` present. |
| `useSession.js` | `api/auth/session.js` | `fetch('/api/auth/session')` | ✓ WIRED | Confirmed. |
| `Header.jsx` | `api/auth/logout.js` | `fetch('/api/auth/logout', ...)` then `refetch()` | ✓ WIRED | Confirmed in `handleSignOut`. |
| `middleware.js` | `api/auth/google.js` | 302 redirect on missing cookie | ✓ WIRED | Confirmed. |
| `Account.jsx` | `useSession.js` | `useSession()` call gating render | ✓ WIRED | Confirmed. |
| `App.jsx` | `callback.js` | reads `?auth_error=1` | ✓ WIRED | Confirmed. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `isSafeReturnTo` rejects the CR-01 backslash open-redirect exploit while accepting legitimate paths | Ran the real `lib/session.js` module directly (not a re-implementation) against `/\evil.com`, `/account`, `//evil.com`, `/api/foo` | `false, true, false, false` respectively | ✓ PASS |
| `newSessionToken()`/`hashToken()` round-trip | Ran live: generate token, confirm `hashToken(raw) === hash` | `true` | ✓ PASS |
| `cookieOptions()` secure flag is conditional (WR-06) | Ran live with no `VERCEL_ENV`/`NODE_ENV` set | `secure: false` | ✓ PASS |
| `api/auth/google.js` redirect shape | Invoked `.fetch()` directly against a real `Request` | 302, correct `Location` (`scope=openid+email+profile`), both cookies set | ✓ PASS |
| `npm run build:client` compiles the auth-aware Header/Account/App changes | `npm run build:client` | Exit 0, 4 output files, no errors | ✓ PASS |
| DB-backed round trips (session sliding window, logout deletion, multi-device isolation) | Not runnable — no live Postgres connection available in this environment (`POSTGRES_URL` unset) | N/A | ? SKIP — covered by static SQL analysis above + originally executed by the plan's own automated verify scripts during execution (documented pass in SUMMARY.md coverage, not independently re-run here) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention or PLAN-declared probes found for this phase — skipped (not applicable; this phase uses inline `<verify><automated>` grep/node scripts, not a probe-script convention).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| AUTH-01 | 02-01, 02-02 | Sign in via single Google action | ✓ SATISFIED | Truths #1, #20 |
| AUTH-02 | 02-01 | Server verifies ID token sig/aud/exp/iss before session creation | ✓ SATISFIED | Truth #2 |
| AUTH-03 | 02-01 | Identified by Google `sub`, not email | ✓ SATISFIED | Truths #3, #4 |
| AUTH-04 | 02-01, 02-02, 02-03 | Session persists across reload | ✓ SATISFIED | Truths #7, #8, #9, #21, #22 |
| AUTH-05 | 02-02 | Sign-out clears server session | ✓ SATISFIED | Truth #12 |
| AUTH-06 | 02-02, 02-03 | No email/password sign-in anywhere | ✓ SATISFIED | Truths #13, #24 |

No orphaned requirements — REQUIREMENTS.md maps exactly AUTH-01 through AUTH-06 to Phase 2, and all six appear in at least one plan's `requirements` frontmatter field.

### Anti-Patterns Found

Scanned every file touched by this phase (`lib/session.js`, all `api/auth/*.js`, `middleware.js`, `src/lib/useSession.js`, `src/components/Header.jsx`, `src/routes/Account.jsx`, `src/App.jsx`, both migration files) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and stub patterns (`return null`/empty handlers/hardcoded empty state not overwritten by fetch). **Zero matches.** No debt markers, no stub returns, no dead-end handlers.

One open item outside this scan's scope but flagged by the phase's own code-review process:

| File | Issue | Severity | Impact |
|------|-------|----------|--------|
| `.env.example` | Documents an unused `SESSION_SECRET=` line for Phase 2 (WR-07) — no file reads `process.env.SESSION_SECRET`; `hashToken()` uses plain unkeyed SHA-256 by design (D-12) | Info/Minor | Cosmetic — will not cause a misconfiguration that breaks functionality, only a confusing unused env var for whoever provisions the Vercel project. Explicitly noted as a sandbox-permission-blocked fix in `02-REVIEW-FIX.md` (the fixer's Read/Grep/Bash tools were all denied against this filename). Confirmed still present via `git show HEAD:.env.example`. **Not a blocker** per this phase's explicit instructions — carry forward as a human TODO. |

### Security Review Note (CR-01 open-redirect — re-verified independently)

The phase's own code-review pass found and the fix pass claimed to resolve a BLOCKER: an open-redirect via backslash bypass of `isSafeReturnTo()`, exploitable to bounce a freshly-authenticated user to an attacker-controlled domain immediately after a real Google sign-in. I independently re-verified this is genuinely fixed in the current codebase (not just claimed in `02-REVIEW-FIX.md`):

- Read the live `lib/session.js:53-60` — confirms `!path.includes('\\')` is present in `isSafeReturnTo`.
- Executed the real, currently-installed module directly (`node` import, not a stand-in re-implementation): `isSafeReturnTo('/\\evil.com')` → `false` (rejected), while `isSafeReturnTo('/account')` → `true` (legitimate paths still pass).
- Read `api/auth/google/callback.js:147-152` — confirms the success-path `Location` header is now built via `new URL(returnTo, 'http://placeholder.local')` reconstruction (belt-and-suspenders), matching the already-safe error path, rather than trusting the raw string directly as it did pre-fix.
- Confirmed via `git log` that commit `dbcfee4` (`fix(02): CR-01 reject backslash bypass...`) exists on the current branch and touches exactly `api/auth/google/callback.js` (and, per the diff header comment, `lib/session.js`).

This is a genuine fix, not merely a documentation claim.

### Human Verification Required

Five items — all live-browser/real-Google-account checks that no automated tool in this environment can perform, consistently deferred by all three plans per `workflow.human_verify_mode=end-of-phase`. See YAML frontmatter `human_verification` for the full structured list; summarized:

1. **Real Google OAuth round-trip** — sign in with a real Google account and confirm landing on Google's actual consent screen, then correct return-to-origin behavior.
2. **Session persistence across reloads** — confirm the signed-in header state survives multiple real browser reloads.
3. **Sign-out click-through + private-window `/account` redirect** — confirm the DB-backed sign-out and middleware pre-filter both behave correctly in a real browser.
4. **Header visual states (no flash, avatar render/fallback, menu interactions)** — confirm the three auth-slot states transition without a visible flash and that the sign-out menu's open/close/dim/error states render correctly.
5. **Denied-consent handling** — cancel at Google's real consent screen and confirm the inline error notice appears once and self-clears.

### Gaps Summary

No gaps found. All 24 must-have truths across the three plans are backed by real, wired, currently-correct code — independently re-executed where the tooling allowed (redirect construction, open-redirect exploit/fix, token hashing, cookie security-flag conditionality), and traced by direct file reading everywhere a live DB connection was unavailable in this environment. The one critical finding from the phase's own code-review pass (CR-01 open-redirect) is confirmed genuinely fixed by independent re-verification, not just by trusting `02-REVIEW-FIX.md`'s narrative. The single remaining open item (WR-07, unused `SESSION_SECRET` in `.env.example`) is cosmetic and explicitly out of blocker scope per this phase's own review-fix pass (blocked by a sandbox permission restriction, not by a wiring problem).

The phase does not reach `passed` only because a substantial set of behaviors (the actual live Google OAuth round-trip, and all visual/timing UI states) can only be judged by a human in a real browser — this was true by design for every plan in this phase (`workflow.human_verify_mode=end-of-phase`) and is not evidence of incompleteness.

---

_Verified: 2026-09-09_
_Verifier: Claude (gsd-verifier)_
