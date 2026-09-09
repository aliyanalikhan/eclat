---
phase: 02
slug: authentication-google-sign-in-server-side-sessions
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-09
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser -> api/auth/google.js | Untrusted client request (query string `return_to`) crosses into server code that constructs a redirect | Return-path URL |
| Browser -> api/auth/google/callback.js | Untrusted client request (`code`, `state` query params, `oauth_state`/`oauth_return_to` cookies) crosses into server code that exchanges a code for tokens and creates a session | OAuth authorization code, CSRF state token |
| Server -> Google OAuth/JWKS endpoints | Server-to-server token exchange and JWKS fetch; response only trusted after independent JWT verification | ID token, access token |
| Server -> Postgres (users/sessions) | Server writes identity and session data; a DB compromise/leak is mitigated by only ever storing a hash of the session token | User profile, session token hash |
| Browser -> api/auth/logout.js | Untrusted client request (session cookie) crosses into server code that deletes a database row | Session cookie |
| Edge (middleware.js) -> origin | Cookie-presence pre-filter only; not a trust boundary for authorization, just a UX short-circuit before the origin serves the static /account page | Cookie presence (no value inspection) |
| Browser -> googleusercontent.com | Cross-origin image load for the profile avatar, scoped by CSP img-src and referrerPolicy | Profile photo |
| Browser (client-side gate) -> /account content | Client-side-only enforcement this phase (no per-request SSR); a UX gate, not the entitlement boundary — real server-side entitlement enforcement for paid content is Phase 4's job | Demo/mocked billing content only |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Spoofing | api/auth/google/callback.js | critical | mitigate | `jose` `jwtVerify` against Google's live JWKS — signature + audience (GOOGLE_CLIENT_ID) + issuer + expiry — before any user/session row is created | closed |
| T-02-02 | Tampering | api/auth/google/callback.js | high | mitigate | State-cookie double-submit with constant-time compare (`timingSafeEqual`, `callback.js:25,44`) — `state` query param must match `oauth_state` cookie or flow aborts before token exchange | closed |
| T-02-03 | Tampering | api/auth/google.js, api/auth/google/callback.js | medium | mitigate | `isSafeReturnTo()` in lib/session.js rejects any `return_to` not a same-origin relative path, including backslash bypass (CR-01 fix, independently re-verified live) | closed |
| T-02-04 | Information Disclosure | lib/session.js, migrations/0002_sessions_token_hash.sql | high | mitigate | Only the SHA-256 hash of the session token is ever written to `sessions.token_hash` — a DB read/dump alone cannot be replayed as a live session | closed |
| T-02-05 | Information Disclosure | api/auth/google/callback.js Set-Cookie | high | mitigate | Session cookie set httpOnly — unreadable to client-side JS even under an XSS bug elsewhere | closed |
| T-02-06 | Information Disclosure | api/auth/google/callback.js Set-Cookie | medium | mitigate | Session cookie set Secure (conditional on prod/Vercel env, WR-06) — never transmitted over plaintext in production | closed |
| T-02-07 | Spoofing | N/A (flow-shape level) | low | accept | ID-token nonce replay not a relevant vector — ID token only ever seen server-to-server in this authorization-code flow, never in the browser | accepted |
| T-02-SC (01) | Tampering | package.json (jose, cookie) | high | mitigate | Package legitimacy audit (RESEARCH.md) — OK/Approved, no SLOP/SUS, no postinstall scripts; confirmed installed at pinned versions | closed |
| T-02-11 | Repudiation / Information Disclosure | api/auth/logout.js | medium | mitigate | Sign-out deletes the DB-side sessions row (not just the cookie) — a captured cookie cannot be replayed after sign-out | closed |
| T-02-12 | Elevation of Privilege | middleware.js | low | accept | Middleware's cookie-presence check is a UX short-circuit only; the origin page still calls the authoritative GET /api/auth/session, which rejects any cookie without a matching, unexpired DB row | accepted |
| T-02-13 | Tampering | vercel.json, public/_headers (CSP img-src widening) | low | accept | Widening img-src to `https://*.googleusercontent.com` only allows image loads, not script execution — script-src remains 'self' only | accepted |
| T-02-SC (02) | Tampering | package.json (@vercel/functions) | high | mitigate | Verified official Vercel first-party package, no postinstall script — same trust tier as already-installed @vercel/postgres | closed |
| T-02-14 | Information Disclosure | src/routes/Account.jsx | low | accept | Client-side gate theoretically bypassable (disable JS / intercept redirect), but Account.jsx only shows demo/mocked billing data this phase — no real sensitive data yet to protect (real entitlement enforcement is Phase 4) | accepted |
| T-02-15 | Tampering | src/App.jsx (auth_error query param) | low | accept | `auth_error=1` only toggles a static, fixed error string — never used to construct a URL or render user-supplied HTML — no injection/open-redirect surface | accepted |

*Status: open · closed · open — below {block_on} threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-07 | Nonce replay not applicable — server-initiated authorization-code flow never exposes the ID token to the browser | Phase 02 plan (02-01) | 2026-09-09 |
| AR-02-02 | T-02-12 | Middleware bypass only skips a UX redirect; the authoritative session check still runs client-side against the DB-backed API | Phase 02 plan (02-02) | 2026-09-09 |
| AR-02-03 | T-02-13 | CSP img-src widening introduces no script-execution vector | Phase 02 plan (02-02) | 2026-09-09 |
| AR-02-04 | T-02-14 | No real sensitive data is gated by the client-side /account check yet — real entitlement enforcement lands in Phase 4 | Phase 02 plan (02-03) | 2026-09-09 |
| AR-02-05 | T-02-15 | `auth_error` query param only drives a fixed static string, no injection surface | Phase 02 plan (02-03) | 2026-09-09 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-09 | 14 | 9 | 0 (5 accepted) | Claude (gsd-secure-phase, retroactive from PLAN.md threat models) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-09

**Note:** No open threats at or above the `high` block threshold (`workflow.security_block_on`) remained after classification (`register_authored_at_plan_time: true`, `asvs_level: 1`), so per the short-circuit rule this audit skipped spawning `gsd-security-auditor` and classified directly from PLAN.md threat models (all 3 plans in this phase carried a `<threat_model>` block) plus direct re-verification of the corresponding implementation files/lines cited above (cross-checked against `02-VERIFICATION.md`'s independently-executed evidence and one live grep of `callback.js` for the state-compare constant-time check).
