# Phase 2: Authentication — Google Sign-In & Server-Side Sessions - Research

**Researched:** 2026-09-08
**Domain:** Server-initiated Google OAuth 2.0 Authorization Code flow, ID token verification, opaque-token session cookies, on Vercel serverless functions in a Vite + React Router SPA with no prior backend
**Confidence:** HIGH (protocol mechanics, Vercel Functions API, package legitimacy) / MEDIUM (exact CSP scope, edge cases specific to this codebase's prerendering model)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### OAuth flow (already locked before this discussion — carried forward)
- **D-01:** Server-initiated redirect flow for Google sign-in (not a client-loaded Google Identity Services SDK) — decided during roadmap research specifically to keep CSP changes minimal (`script-src`/`connect-src` stay tight; no third-party auth JS runs in the browser). The browser is redirected to Google's OAuth endpoint and back to a server callback route; token exchange and verification happen server-side only.
- **D-02:** Session (identity) and entitlement (access) are kept structurally separate — decided during roadmap research. This phase's session only proves "who is signed in," never "what they're allowed to see." Entitlement remains a live DB read in later phases, never baked into the session cookie/token.
- **D-03 (AUTH-02, locked by REQUIREMENTS.md):** The server independently verifies the Google ID token's signature, audience, expiry, and issuer before creating any session — an unverified or forged client-supplied identity is never trusted.
- **D-04 (AUTH-03, locked by REQUIREMENTS.md):** The user is identified internally by Google's stable `sub` claim (stored in the existing `users.google_sub` column), never by email address.
- **D-05 (AUTH-06, locked by REQUIREMENTS.md):** No email/password sign-in option exists anywhere on the site — Google is the only sign-in method.

#### Sign-in entry point & post-login redirect
- **D-06:** The header's existing static "Account" link becomes auth-aware: it reads "Sign in" when signed out and "Account" (or the user's name) when signed in — one nav slot, matching today's single-link pattern in `src/components/Header.jsx` rather than adding a second nav item.
- **D-07:** Clicking "Sign in" redirects straight to Google's OAuth consent screen — no intermediary branded page. Fewest clicks, and consistent with D-01's server-redirect flow.
- **D-08:** After a successful sign-in, the user returns to whatever page they were on when they started sign-in (not always to `/account` or home) — preserves context, since sign-in will later be triggered from gated-content prompts in Phase 4.
- **D-09:** Visiting `/account` while signed out redirects straight into the sign-in flow (does not render the page with a placeholder). This is a direct consequence of the "Account" nav slot becoming a real authenticated destination once sessions exist.

#### Session cookie & lifetime
- **D-10:** Sessions use a 30-day **sliding window** — the session's `expires_at` is extended on activity, so an actively-reading user never gets logged out mid-use, while an inactive one expires after 30 days of no visits.
- **D-11:** Concurrent multi-device sessions are allowed — each sign-in creates a new row in `sessions`; signing in on a phone does not invalidate a session on a laptop. Matches normal reader behavior and the existing schema (`sessions.user_id` with no uniqueness constraint already supports multiple rows per user).
- **D-12:** The session cookie carries a random, cryptographically-generated opaque token; only its hash is stored in the `sessions` table (requires adding a token-hash column — the current `sessions` table from Phase 1 has only `id`, `user_id`, `created_at`, `expires_at`). A database read/leak alone cannot be replayed as a live session, since the raw token is never persisted. — **Reversibility:** costly — **rationale:** switching later from opaque-hashed-token to a different session-identification scheme (e.g. JWT) would require invalidating all existing sessions and changing both the cookie-issuing and cookie-verifying code paths.
- **D-13:** Cookie attributes: `httpOnly`, `Secure`, `SameSite=Lax`. `httpOnly` keeps the token unreadable to JS (XSS-safe), `Secure` restricts it to HTTPS, and `SameSite=Lax` is required (not `Strict`) so the cookie survives the top-level redirect back from Google's OAuth flow.

#### Sign-out placement & failed sign-in handling
- **D-14:** Sign-out lives in the header, in the same auth-aware slot that shows "Sign in" when signed out (D-06) — e.g. clicking the signed-in state reveals a sign-out action, rather than requiring a trip to `/account`.
- **D-15:** If Google sign-in is denied, cancelled, or ID token verification fails, the user is redirected back (to the page/flow they started from) with a brief inline error message ("Sign-in failed, try again") — no dead-end dedicated error page/route.

#### Profile data sync on repeat sign-in
- **D-16:** `users.name`, `users.email`, and `users.picture` are refreshed from the Google ID token's claims on every sign-in (not just set once at first sign-up) — keeps the record current if the user changes their Google display name or photo. Same row-update operation that already touches `last_login_at` at sign-in time.

### Claude's Discretion
- Exact OAuth route paths/naming (e.g. `/api/auth/google`, `/api/auth/google/callback`) and whether serverless functions run on Vercel's Node or Edge runtime — left to planning/execution, informed by `@vercel/postgres` compatibility.
- CSRF protection mechanism for the OAuth redirect (e.g. `state` parameter validation) — standard OAuth practice, not discussed as a user-facing choice.
- Exact error-message copy for D-15's inline failure state.
- Exact UI treatment of the auth-aware header slot when signed in (name only vs. name + avatar vs. dropdown) — functional requirement (shows sign-out) is locked by D-06/D-14, visual detail is not.
- CSP updates required to allow the redirect to `accounts.google.com` (`vercel.json`, `public/_headers`) — technical necessity of D-01/D-07, not a preference to litigate.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|--------------------|
| AUTH-01 | User can sign in with their Google account via a single "Sign in with Google" action | Architecture Patterns (redirect flow diagram), Pitfall 1 (`<a href>` not `<Link>`), Code Examples (`api/auth/google.js`) |
| AUTH-02 | Server verifies the Google ID token's signature, audience, expiry, and issuer before creating a session — never trusts an unverified client-supplied identity | Pattern 2 (`jose` verification), Standard Stack (`jose` vs `google-auth-library`), Pitfall 5 (`openid` scope requirement) |
| AUTH-03 | User is identified internally by Google's stable `sub` claim, not by email address | Pattern 2 code example (`payload.sub`), migrations/0001_init.sql `users.google_sub` column (already exists) |
| AUTH-04 | User's signed-in session persists across page reloads without re-authenticating with Google each time | Pattern 3 (opaque token + hash), Code Examples (`api/auth/session.js` sliding-window bump), migration `0002_sessions_token_hash.sql` |
| AUTH-05 | User can sign out, which clears their server session | Architecture Responsibility Map (sign-out row), Pitfall 6 (must delete DB row, not just cookie) |
| AUTH-06 | No email/password sign-in option exists anywhere on the site | Confirmed as a locked decision (D-05); no research action needed beyond not introducing one |
</phase_requirements>

## Summary

This phase adds the project's first server-side code to a codebase that has never had one — a Vite SPA prerendered at build time with zero `/api` directory, zero auth SDK, and zero per-request server rendering. The concrete mechanics are well-trodden (Google's OAuth web-server flow, JWT/JWKS verification) but the *integration* into this exact stack has three non-obvious traps that standard OAuth tutorials don't cover: (1) React Router will swallow a client-side `<Link>` to `/api/auth/google` and render `<NotFound/>` instead of letting the browser navigate to the serverless function — the sign-in trigger must be a plain `<a href>`; (2) this app has no per-request SSR (`entry-server.jsx` runs only at build time), so the header's signed-in/signed-out state and the `/account` auth gate can only be resolved **client-side after hydration**, via a fetch to a session-check endpoint — there is an unavoidable one-frame "unknown" state to design for; (3) the existing `Referrer-Policy: strict-origin-when-cross-origin` plus a tightened `img-src` are both relevant to rendering the user's Google profile photo, which is hosted cross-origin on `googleusercontent.com`.

Google's server-initiated flow itself is standard: redirect to `https://accounts.google.com/o/oauth2/v2/auth` with `scope=openid email profile`, exchange the returned `code` at `https://oauth2.googleapis.com/token` server-side (with `client_secret`), then verify the `id_token` JWT's signature against Google's JWKS, plus `aud`, `iss`, `exp`. Contrary to the CONTEXT.md worry, **no CSP `connect-src`/`script-src` change is needed for the OAuth redirect or token exchange** — both are either a full-page browser navigation (not subject to CSP fetch directives) or a server-to-server call (not subject to CSP at all, which only governs the browser). The one real CSP change is `img-src` for `*.googleusercontent.com` profile pictures.

**Primary recommendation:** Build `/api/auth/google.js` (redirect), `/api/auth/google/callback.js` (exchange + verify + session), and `/api/auth/session.js` + `/api/auth/logout.js` as Vercel Node.js Functions using the modern Web Handler signature (`export default { fetch(request) {...} }`), verify ID tokens with `jose`'s `createRemoteJWKSet`/`jwtVerify` (not `google-auth-library`, to avoid its Node-only, GCP-metadata-probing dependency tree), serialize/parse cookies with the `cookie` package, and add a `middleware.js` (Edge, matcher `/account`) that redirects to sign-in when the session cookie is entirely absent — cheap, no DB call, and it eliminates the placeholder-flash D-09 requires for the common case.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| OAuth redirect initiation (`/api/auth/google`) | API / Backend (Vercel Node Function) | — | Must attach the `state`/`return_to` cookie and issue a real 302; a client-side `fetch` cannot follow a cross-origin redirect chain to Google and back usefully |
| Sign-in trigger UI (header link) | Browser / Client | — | Plain `<a href="/api/auth/google">`, NOT a React Router `<Link>` — see Pitfall 1 |
| Token exchange + ID token verification | API / Backend (Vercel Node Function) | — | Requires `client_secret`; must never touch the browser (D-01, D-03) |
| Session creation (DB row + Set-Cookie) | API / Backend | Database | Opaque token hashed before storage (D-12); DB is source of truth for session validity |
| Session existence check (fast, pre-render) | Edge / CDN (`middleware.js`) | — | Cookie-presence check only, no DB round-trip — cheap pre-filter for `/account`, not the authority |
| Session validity check (authoritative) | API / Backend | Database | Only a live `sessions` row (unexpired, hash match) proves a session is real; middleware's presence-check is a UX optimization, never a security boundary |
| Auth-aware header state | Browser / Client | API / Backend (data source) | No per-request SSR exists in this app (`entry-server.jsx` is build-time only) — the header MUST fetch `/api/auth/session` client-side post-hydration; there is no server tier available to inject this into the initial HTML |
| `/account` auth gate | Browser / Client (redirect) | Edge (pre-filter) | Same no-per-request-SSR constraint — the static prerendered page loads, then a client effect checks session and redirects if signed out; middleware only short-circuits the "definitely no cookie" case |
| Google profile picture rendering | Browser / Client | CDN (`googleusercontent.com`) | Cross-origin `<img>`, needs CSP `img-src` allowance + `referrerPolicy="no-referrer"` |
| Sign-out | API / Backend | Database | Must delete/invalidate the DB-side session row, not just clear the cookie, or the token remains valid if replayed |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `jose` | 6.2.12 (confirmed via `npm view`) | Verify Google's `id_token` JWT: fetch/cache JWKS, check signature, `aud`, `iss`, `exp` | Zero-dependency, actively maintained (11+ yrs on npm, 116M+ weekly downloads), works identically in Node and Edge runtimes — matches this project's minimal-dependency convention better than `google-auth-library`'s Node-only, gaxios/gcp-metadata-laden dependency tree [VERIFIED: npm registry] |
| `cookie` | 2.0.1 (confirmed via `npm view`) | Serialize `Set-Cookie` headers (httpOnly/Secure/SameSite/Max-Age attributes) and parse the incoming `Cookie` header | The library Express itself uses internally for cookie handling; 12+ yrs on npm, 185M+ weekly downloads; hand-rolled cookie-attribute string building is a well-known source of subtle bugs (attribute ordering, value encoding) [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vercel/postgres` | 0.10.0 (already installed, Phase 1) | Read/write `users` and `sessions` rows from the new `/api/auth/*` functions | Already proven working in this exact pattern via `lib/db.js` / `scripts/migrate.js` — reuse `lib/db.js` as-is, do not create a second DB client |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jose` for ID token verification | `google-auth-library` (`OAuth2Client.verifyIdToken()`) | Officially recommended by Google's own docs [CITED: developers.google.com/identity/gsi/web/guides/verify-google-id-token] and handles JWKS caching/rotation identically; but it is Node-only (blocks a future move to Edge functions for these routes), pulls in `gaxios`/`gcp-metadata`/`gtoken` transitively, and does more than this phase needs (full OAuth2 client, token refresh helpers). `jose` performs the exact same three checks (signature/aud/iss) plus `exp` with ~1/10th the dependency surface. |
| Cookie-based `state` (in a short-lived cookie) | `state` param alone, validated server-side in memory/DB | Storing `state` server-side (e.g., a DB row) adds a write+read round trip and a cleanup job for a value that only needs to survive one redirect round-trip; the cookie-based double-submit pattern is the documented standard approach and needs no extra storage [CITED: auth0.com/docs/secure/attack-protection/state-parameters] |
| Vercel `middleware.js` pre-filter for `/account` | Skip middleware, rely solely on client-side redirect | Works, but a signed-out visitor to `/account` would see the stale mocked page flash before the client-side check redirects them — D-09 explicitly says "does not render the page with a placeholder." Middleware closes that gap for the common (no-cookie) case for near-zero cost. |

**Installation:**
```bash
npm install jose cookie
```

**Version verification:** Confirmed via `npm view jose version` → `6.2.12`, `npm view cookie version` → `2.0.1`, both run 2026-09-08 against the live npm registry.

## Package Legitimacy Audit

> Automated `gsd-tools query package-legitimacy check` seam was unavailable in this environment (installed `gsd-tools.cjs` is an older build without the `query` subcommand family). Audit performed manually via `npm view` + npm download-stats API + postinstall-script inspection as a substitute.

| Package | Registry | Age | Downloads (last week) | Source Repo | Verdict | Disposition |
|---------|----------|-----|------------------------|--------------|---------|-------------|
| `jose` | npm | 12 yrs (created 2014-02-27) | 116,546,211 | github.com/panva/jose | OK | Approved |
| `cookie` | npm | 14 yrs (created 2012-05-28) | 185,104,135 | github.com/jshttp/cookie | OK | Approved |
| `google-auth-library` (alternative, not recommended) | npm | long-standing (googleapis org) | not queried (not selected) | github.com/googleapis/google-cloud-node | OK | Not installed — listed only as an alternative in Standard Stack |

No `postinstall` scripts found on `jose` or `cookie` (`npm view <pkg> scripts.postinstall` returned empty for both).

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Sign-in trigger (Browser)
  <a href="/api/auth/google">Sign in</a>  ← plain <a>, NOT React Router <Link> (Pitfall 1)
        |
        v  (full browser navigation, GET)
┌───────────────────────────────────────────┐
│ /api/auth/google  (Vercel Node Function)   │
│  1. generate random `state` + read/keep    │
│     `return_to` (validated same-origin     │
│     relative path from Referer or a query  │
│     param)                                 │
│  2. Set-Cookie: oauth_state=<state>        │
│     (httpOnly, Secure, SameSite=Lax, 10min)│
│  3. 302 → accounts.google.com/o/oauth2/v2/ │
│     auth?client_id=...&redirect_uri=...&   │
│     response_type=code&scope=openid email  │
│     profile&state=<state>                  │
└───────────────────────────────────────────┘
        |
        v  (user authenticates at Google — outside this app entirely)
        v  (302 back, top-level GET navigation — SameSite=Lax cookie survives)
┌───────────────────────────────────────────┐
│ /api/auth/google/callback (Node Function)  │
│  1. Read oauth_state cookie; compare to    │
│     ?state= query param — mismatch = 403,  │
│     clear cookie, redirect to return_to    │
│     with an inline error flag              │
│  2. POST oauth2.googleapis.com/token       │
│     { code, client_id, client_secret,      │
│       redirect_uri, grant_type }           │
│     (server-to-server — CSP does not apply)│
│  3. Verify id_token via jose:               │
│     createRemoteJWKSet(googleJWKSUrl)      │
│     jwtVerify(id_token, JWKS, {issuer,     │
│       audience: GOOGLE_CLIENT_ID})         │
│  4. Upsert users row by google_sub (D-04); │
│     refresh name/email/picture (D-16);     │
│     update last_login_at                   │
│  5. Generate random opaque session token   │
│     (crypto.randomBytes), SHA-256 hash it, │
│     INSERT sessions (user_id, token_hash,  │
│     expires_at = now()+30d)  (D-12)        │
│  6. Set-Cookie: session=<raw token>        │
│     (httpOnly, Secure, SameSite=Lax, 30d); │
│     clear oauth_state cookie               │
│  7. 302 → return_to (or "/" fallback)      │
└───────────────────────────────────────────┘
        |
        v
   Browser loads return_to page (static prerendered HTML, unauthenticated-looking)
        |
        v  (React hydrates, then client-side effect fires)
┌───────────────────────────────────────────┐
│ GET /api/auth/session  (Node Function)     │
│  Reads `session` cookie → SHA-256 hash it  │
│  → SELECT ... FROM sessions JOIN users     │
│    WHERE token_hash = ? AND expires_at >   │
│    now()                                   │
│  → sliding-window bump: UPDATE sessions    │
│    SET expires_at = now()+30d WHERE id=... │
│  → { user: {name, email, picture} } | null │
└───────────────────────────────────────────┘
        |
        v
   Header re-renders "Sign in" → "Account ▾ / Sign out"

Parallel, cheap pre-filter (not a security boundary):
Request to /account
        v
┌───────────────────────────────────────────┐
│ middleware.js (Edge, matcher: ['/account'])│
│  if no `session` cookie present at all:    │
│    302 → /api/auth/google?return_to=/account│
│  else: pass through to the static page     │
│  (does NOT validate the token — that's the │
│  client-side /api/auth/session call's job) │
└───────────────────────────────────────────┘
```

### Recommended Project Structure
```
api/
├── auth/
│   ├── google.js            # GET — starts the redirect flow
│   ├── google/
│   │   └── callback.js      # GET — Google redirects here with ?code&state
│   ├── session.js           # GET — returns current signed-in user or null
│   └── logout.js            # POST — deletes the session row, clears cookie
lib/
├── db.js                    # EXISTING (Phase 1) — reused as-is
├── session.js                # NEW — token generation/hashing, cookie helpers shared by the api/auth/* routes
middleware.js                 # NEW — Edge cookie-presence pre-check, matcher: /account
migrations/
├── 0001_init.sql             # EXISTING
├── 0002_sessions_token_hash.sql  # NEW — adds token_hash column (D-12)
src/
├── components/Header.jsx     # MODIFIED — auth-aware nav slot (D-06)
├── routes/Account.jsx        # MODIFIED — client-side auth gate (D-09)
├── lib/useSession.js         # NEW — client hook wrapping fetch('/api/auth/session')
```

### Pattern 1: State-cookie CSRF + open-redirect-safe return_to
**What:** A single short-lived cookie set by `/api/auth/google` carries both the CSRF nonce and (optionally, as a second cookie or a validated query param) the return-to path. The callback compares the `state` query param Google echoes back against the cookie value — not against anything client-supplied on the callback request itself, since the callback request's own query string is attacker-controllable if a victim is tricked into visiting a crafted callback URL.
**When to use:** Every OAuth redirect flow initiated from this app.
**Open-redirect guard:** `return_to` must be validated as a **relative path** (`^\/(?!\/)`  — starts with exactly one `/`, not `//` which browsers treat as protocol-relative to attacker infrastructure) before being trusted for the final redirect. Reject/replace with `/` if it fails validation, is absent, or points off-site.
```javascript
// Source: pattern synthesized from Auth0's documented state-parameter guidance
// [CITED: auth0.com/docs/secure/attack-protection/state-parameters]
function isSafeReturnTo(path) {
  return typeof path === 'string' && /^\/(?!\/)/.test(path) && !path.startsWith('/api/')
}
```

### Pattern 2: ID token verification with `jose`
**What:** Fetch Google's JWKS once (module-level, `jose` caches and honors the JWKS endpoint's own `Cache-Control` internally via `createRemoteJWKSet`'s built-in cache), then verify signature + `iss` + `aud` + `exp` in one call.
**When to use:** Immediately after the token exchange, before creating any session or trusting any claim.
```javascript
// Source: jose README pattern (github.com/panva/jose) + Google's documented
// claim requirements [CITED: developers.google.com/identity/gsi/web/guides/verify-google-id-token]
import { createRemoteJWKSet, jwtVerify } from 'jose'

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

async function verifyGoogleIdToken(idToken, clientId) {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ['accounts.google.com', 'https://accounts.google.com'], // both forms are valid per Google docs
    audience: clientId,
  })
  // payload.sub is the stable identifier (D-04). payload.exp is checked
  // automatically by jwtVerify; an expired token throws.
  return payload
}
```

### Pattern 3: Opaque session token — generate, hash, store, verify
**What:** The cookie holds a random token; only its SHA-256 hash lives in `sessions.token_hash` (D-12). A DB read/leak cannot be replayed as a live session.
```javascript
// Source: standard opaque-token session pattern (not framework-specific)
import { randomBytes, createHash } from 'node:crypto'

function newSessionToken() {
  const raw = randomBytes(32).toString('base64url') // 256 bits of entropy
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash } // raw → cookie; hash → DB column
}

function hashToken(raw) {
  return createHash('sha256').update(raw).digest('hex')
}
```

### Pattern 4: Setting cookies from a Vercel Web Handler function
**What:** The modern Vercel Node.js Function signature (`export default { fetch(request) {...} }`) returns a standard `Response`. Standard `Headers` only keeps ONE value per `Set-Cookie` if you use `.set()` — you MUST use `.append()` for each cookie, or a second cookie silently overwrites the first.
```javascript
// Source: Vercel Node.js runtime docs (Web Handler pattern)
// [CITED: vercel.com/docs/functions/runtimes/node-js]
import { serialize } from 'cookie'

export default {
  async fetch(request) {
    const headers = new Headers()
    headers.append('Set-Cookie', serialize('oauth_state', state, {
      httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/',
    }))
    headers.set('Location', googleAuthUrl.toString())
    return new Response(null, { status: 302, headers })
  },
}
```

### Anti-Patterns to Avoid
- **`<Link to="/api/auth/google">` from React Router:** React Router will treat this as an in-app client route, find no match, and render `<NotFound/>` instead of letting the browser navigate to the serverless function. Use a plain `<a href="/api/auth/google">`.
- **Trusting the callback's own `?state=` against anything other than a cookie set by *this app* on the *outbound* leg:** validating state against a DB value keyed only by session-less context (e.g., IP address) is weaker than the cookie double-submit pattern and adds needless storage.
- **Storing the raw session token in the DB:** directly violates D-12 and defeats the entire point of hashing — a DB dump then IS a set of live session tokens.
- **Baking entitlement/subscription status into the session cookie or JWT:** explicitly out of scope per D-02 (carried from roadmap research) — session proves identity only; every gated-content check in later phases re-reads entitlement from the DB per request.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| JWT signature/claims verification against a rotating JWKS | Manual base64url-decode + RS256 verify + manual JWKS fetch/cache | `jose` (`createRemoteJWKSet` + `jwtVerify`) | JWKS key rotation, clock-skew tolerance, and constant-time signature comparison are easy to get subtly wrong; `jose` is maintained specifically to get these right |
| `Set-Cookie` header construction (attribute encoding, `Max-Age` vs `Expires`, value escaping) | Template-string cookie header | `cookie` package's `serialize()`/`parse()` | Cookie value characters (`;`, `,`, whitespace) need URI-encoding per RFC 6265; hand-rolled string concatenation is a recurring source of cookie-not-set bugs |
| CSRF-safe random token / state generation | `Math.random()`-based strings | `node:crypto` `randomBytes` (already a Node built-in, no new dependency) | `Math.random()` is not cryptographically secure and is a classic ASVS finding |

**Key insight:** Every piece of this phase's core security guarantee (D-01 through D-03, D-12) rests on primitives (JWT verification, CSPRNG, cookie serialization) that have well-known, thoroughly-audited implementations. Hand-rolling any of them reintroduces exactly the class of risk this milestone exists to eliminate.

## Common Pitfalls

### Pitfall 1: React Router intercepts the sign-in link
**What goes wrong:** Using `<Link to="/api/auth/google">` (React Router's client-side nav component) instead of a plain `<a href>` causes React Router to treat `/api/auth/google` as an in-app route, find no match in `<Routes>`, and render the `NotFound` page — the OAuth flow never starts, with no console error.
**Why it happens:** `Link` always does client-side routing for same-origin `to` targets; it has no way to know `/api/*` isn't a React Router route.
**How to avoid:** Use a plain `<a href="/api/auth/google">Sign in</a>` (or `window.location.assign(...)` in a click handler) for anything that must leave the SPA's client-side router, including the OAuth entry point and (per D-15) any "try again" link after a failed sign-in.
**Warning signs:** Clicking "Sign in" shows the site's own 404 page instead of Google's consent screen.

### Pitfall 2: No per-request SSR means a flash of "signed-out" state
**What goes wrong:** Because `prerender.js` runs once at build time and the deployed site serves static HTML per route, the header cannot know a visitor's auth state until client-side JS runs and calls `/api/auth/session`. Every page load — even for a signed-in user — briefly renders in an "unknown/signed-out-looking" state.
**Why it happens:** `entry-server.jsx`'s `render(url)` is invoked only by `prerender.js` at build time (confirmed: `.planning/codebase/ARCHITECTURE.md` "No `/api` directory or per-request server code exists yet"); there is no per-request rendering path in this deployment model to inject a signed-in user's name into the initial HTML.
**How to avoid:** Design the header's auth slot with an explicit third state (`loading` / `unknown`), not just `signed-in` / `signed-out` — e.g. render nothing or a neutral placeholder until the `/api/auth/session` fetch resolves, then transition. Same for `/account`'s auth gate (D-09): show a brief loading state, not the stale mocked page content, while the session check is in flight.
**Warning signs:** Signed-in users see "Sign in" flash for a moment on every navigation; `/account` briefly shows old mocked content before redirecting a signed-out visitor.

### Pitfall 3: Google profile pictures blocked or 403'ing
**What goes wrong:** `<img src="https://lh3.googleusercontent.com/...">` either gets blocked by CSP `img-src 'self' data:` (current policy) or returns a 403 from Google's CDN.
**Why it happens:** The current CSP has no allowance for any external image host. Separately, some Google-hosted images 403 when a strict `Referrer-Policy` sends an unexpected referrer — the working fix documented by developers who hit this is setting `referrerPolicy="no-referrer"` directly on the `<img>` element. [CITED: mazeez.dev/posts/why-google-oauth-profile-picture-returns-403]
**How to avoid:** Add `img-src 'self' data: https://*.googleusercontent.com;` to `vercel.json`'s CSP (and `public/_headers` for parity), and set `referrerPolicy="no-referrer"` on the avatar `<img>` regardless.
**Warning signs:** Broken-image icon in the header for signed-in users; CSP violation reports naming `img-src`.

### Pitfall 4: `Headers.set('Set-Cookie', ...)` silently drops earlier cookies
**What goes wrong:** The callback route needs to set the session cookie AND clear the `oauth_state` cookie in the same response. Calling `headers.set('Set-Cookie', a)` then `headers.set('Set-Cookie', b)` leaves only `b`.
**Why it happens:** The Web standard `Headers.set()` replaces all values for that header name; `Set-Cookie` is the one header where multiple values are semantically valid and must use `.append()`.
**How to avoid:** Always `headers.append('Set-Cookie', ...)` for every cookie in a response, never `.set()`.
**Warning signs:** One of the two cookies never appears in the browser's dev tools Application/Cookies panel after the callback redirect.

### Pitfall 5: `openid` scope omitted → no `id_token` returned
**What goes wrong:** If the authorization request's `scope` doesn't include `openid`, Google's token response contains only an `access_token`, no `id_token` — there is nothing to verify, and the whole D-03 identity-verification requirement silently has nothing to check.
**Why it happens:** `openid` is what makes this an OpenID Connect (identity) flow rather than a bare OAuth (authorization) flow; it's easy to omit if copying a generic "Google API access" example instead of a "Sign in with Google" example.
**How to avoid:** `scope=openid email profile` — always include `openid` first.
**Warning signs:** `token.id_token` is `undefined` after the exchange call.

### Pitfall 6: Middleware auth pre-check used as the security boundary
**What goes wrong:** Treating the `middleware.js` cookie-presence check as sufficient auth enforcement for `/account` (or, later, gated content) — it only checks the cookie EXISTS, never that the session is valid/unexpired.
**Why it happens:** It's tempting to think "middleware already handled it" once a redirect-if-absent check is in place.
**How to avoid:** Middleware is a UX optimization only (skip the placeholder flash for the obviously-signed-out case). The DB-backed `/api/auth/session` check (or, in later phases, a live entitlement read) is the only authoritative check — this matches D-02's identity/entitlement separation principle and must be re-applied to every future gated route, not assumed handled by this phase's middleware.
**Warning signs:** A revoked/expired session cookie still "gets in" because only its presence, not its DB row, was checked somewhere in the flow.

## Code Examples

### Full authorization-request redirect (`api/auth/google.js`)
```javascript
// Source: synthesized from Google's documented endpoint/params
// [CITED: developers.google.com/identity/protocols/oauth2/web-server]
import { serialize } from 'cookie'
import { randomBytes } from 'node:crypto'

function isSafeReturnTo(path) {
  return typeof path === 'string' && /^\/(?!\/)/.test(path) && !path.startsWith('/api/')
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const rawReturnTo = url.searchParams.get('return_to')
    const returnTo = isSafeReturnTo(rawReturnTo) ? rawReturnTo : '/'

    const state = randomBytes(16).toString('base64url')

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid email profile')
    authUrl.searchParams.set('state', state)

    const headers = new Headers()
    headers.append('Set-Cookie', serialize('oauth_state', state, {
      httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/',
    }))
    headers.append('Set-Cookie', serialize('oauth_return_to', returnTo, {
      httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/',
    }))
    headers.set('Location', authUrl.toString())
    return new Response(null, { status: 302, headers })
  },
}
```

### Session check endpoint (`api/auth/session.js`)
```javascript
// Source: pattern synthesized for this project's schema
// (users/sessions columns per migrations/0001_init.sql, read this session)
import { parse } from 'cookie'
import { createHash } from 'node:crypto'
import { sql } from '../../lib/db.js'

export default {
  async fetch(request) {
    const cookies = parse(request.headers.get('cookie') || '')
    const raw = cookies.session
    if (!raw) return Response.json({ user: null })

    const hash = createHash('sha256').update(raw).digest('hex')
    const { rows } = await sql`
      SELECT u.name, u.email, u.picture, s.id AS session_id
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ${hash} AND s.expires_at > now()
    `
    if (!rows.length) return Response.json({ user: null })

    // Sliding window (D-10): bump expiry on every authenticated check-in.
    await sql`UPDATE sessions SET expires_at = now() + interval '30 days' WHERE id = ${rows[0].session_id}`

    const { name, email, picture } = rows[0]
    return Response.json({ user: { name, email, picture } })
  },
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| Vercel legacy `(req, res)` handler with `@vercel/node` types | Web Handler signature `export default { fetch(request) {...} }` / per-method `export function GET(request)` using standard `Request`/`Response` | Documented as the primary pattern in current Vercel Node.js runtime docs (fetched 2026-09-08) | No `@vercel/node` dependency needed; code is portable to Edge runtime later if desired; cookie/query parsing must be done manually (no `request.cookies` helper in this mode) — use the `cookie` package |
| "Edge Middleware" | "Routing Middleware" (`middleware.js`/`proxy.ts`, `proxy` field in `vercel.json`) | Renamed per Vercel docs (page last updated 2026-08-14) | Same capability (pre-request redirect/rewrite), new file-convention name; default runtime for the `middleware.ts` file convention is still Edge unless `export const config = { runtime: 'nodejs' }` is set |
| OWASP ASVS 4.0 chapter numbers (V2 Authentication, V3 Session Management) | ASVS 5.0 (May 2025): Authentication is now **V6**, Session Management is now **V7** (~350 requirements across 17 chapters, up from 286/14) | ASVS 5.0 released May 2025 | Any reference to "ASVS V2/V3" in older training material or prior project notes should be read as V6/V7 in current ASVS terminology |

**Deprecated/outdated:**
- Google's older `https://accounts.google.com/o/oauth2/auth` (v1-style) endpoint and `oauth2/v1/certs` PEM-format JWKS are superseded by `/o/oauth2/v2/auth` and `oauth2/v3/certs` (JWK format, what `jose` expects) — use v2/v3 throughout.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|-----------------|
| A1 | Exact route paths (`/api/auth/google`, `/api/auth/google/callback`, `/api/auth/session`, `/api/auth/logout`) — CONTEXT.md explicitly leaves this to planning/execution | Recommended Project Structure | Low — purely a naming choice, easy to change before other code depends on it |
| A2 | Recommending Vercel Node.js runtime (not Edge) for the `/api/auth/*` functions themselves, reserving Edge only for the lightweight `middleware.js` pre-check | Architecture Patterns, Summary | Medium — if the team wants full Edge deployment for lower cold-start latency, `jose` still works there, but `node:crypto`'s `randomBytes`/`createHash` would need to become `crypto.getRandomValues`/`crypto.subtle.digest` (Web Crypto); @vercel/postgres is confirmed to work in both runtimes so this is not itself a blocker either way |
| A3 | `img-src` CSP allowance scoped to `https://*.googleusercontent.com` (wildcard subdomain) rather than pinning exactly `lh3.googleusercontent.com` | Pitfall 3, Standard Stack | Low — Google has historically used lh3–lh6 subdomains for this CDN; a too-narrow pin could break for some accounts. Verify against a real signed-in test account during execution. |
| A4 | `access_type=online` (default, no `access_type=offline`) is sufficient since this app never calls Google APIs on the user's behalf after sign-in and doesn't need a refresh token | Code Examples | Low — if a future phase needs ongoing Google API access, `access_type=offline` + `prompt=consent` would need to be added; not needed for this phase's identity-only scope |
| A5 | `nonce` claim is not required for this server-initiated authorization-code flow (only relevant to implicit/hybrid flows where the ID token arrives directly in the browser) | Architecture Patterns | Low — omitting it is standard practice for this flow shape per OAuth/OIDC guidance encountered during research; adding it would be defense-in-depth, not a gap |

## Open Questions

1. **Exact `GOOGLE_REDIRECT_URI` value and whether it's already registered in the Google Cloud Console OAuth client**
   - What we know: `GOOGLE_CLIENT_ID` is already set in the linked Vercel project (per Phase 1 discovery notes); `GOOGLE_CLIENT_SECRET` is not yet set.
   - What's unclear: Whether the Google Cloud Console OAuth client already has an "Authorized redirect URI" entry matching whatever path this phase picks (e.g. `https://<domain>/api/auth/google/callback`), for both production and any preview-deployment domains.
   - Recommendation: Confirm with the user/console before or during execution — a mismatched redirect URI is an immediate, opaque `redirect_uri_mismatch` error from Google with no useful client-side debugging path.

2. **Whether preview deployments (Vercel's per-PR preview URLs) need their own OAuth redirect URI registered**
   - What we know: Vercel generates a unique URL per preview deployment; Google OAuth requires exact redirect URI matches (no wildcards for production-verified apps, though `localhost`/loopback IPs get special-cased by Google for local dev).
   - What's unclear: Whether this project's workflow relies on testing OAuth on preview deployments at all, or only locally + production.
   - Recommendation: If preview-deployment testing of the sign-in flow is desired, plan a stable preview redirect URI (e.g. one fixed preview domain aliased in Vercel) rather than trying to register every ephemeral preview URL.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|-----------|
| Node.js | All `/api/*` functions, build scripts | ✓ (per `package.json` engines) | `>=20.6.0` required; Vercel offers Node 24 LTS | — |
| npm | Installing `jose`/`cookie` | ✓ (package-lock.json present) | — | — |
| `@vercel/postgres` / `lib/db.js` | Session + user persistence | ✓ (installed & proven in Phase 1) | 0.10.0 | — |
| `GOOGLE_CLIENT_ID` env var | Authorization request | ✓ (per Phase 1 discovery notes in PROJECT.md — not independently re-verified this session since `.env.local` is not readable by this agent) | — | — |
| `GOOGLE_CLIENT_SECRET` env var | Token exchange | Not yet set (per CONTEXT.md) | — | Must be added to Vercel env + `.env.example` (public-key allowlist already excludes it by default — only `GOOGLE_CLIENT_ID` is in `check-secrets.js`'s `KNOWN_PUBLIC_VAR_NAMES`) |
| A session-token-signing/hashing secret | Not actually needed for opaque-hashed-token sessions (D-12) — SHA-256 hashing needs no secret key, unlike HMAC-signed tokens | — | — | If a future phase wants signed cookies (e.g. for the `oauth_state`/`oauth_return_to` cookies) a `SESSION_SECRET` could be added, but the core session mechanism per D-12 does not require one |

**Missing dependencies with no fallback:**
- `GOOGLE_CLIENT_SECRET` must be obtained from the existing Google Cloud Console project (per CLAUDE.md: "already exist and must be supplied via environment variables at implementation time — never invented, requested in chat, or committed to the repo") and set in Vercel's environment variables before the callback route can exchange codes.

**Missing dependencies with fallback:**
- None — all other dependencies are either already installed or are new, ordinary npm packages with no environment prerequisites.

## Security Domain

### Applicable ASVS Categories

> Chapter numbers below use ASVS 5.0 terminology (V6 Authentication, V7 Session Management) — see State of the Art for the renumbering vs. the older 4.0 scheme. `security_asvs_level: 1` per `.planning/config.json`.

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V6 Authentication | Yes | Federated identity only (Google OIDC) — no password storage, no credential-stuffing surface (matches D-05/AUTH-06); server independently verifies the ID token rather than trusting a client-supplied identity assertion (D-03/AUTH-02) |
| V7 Session Management | Yes | Opaque, high-entropy (256-bit) session token; only its SHA-256 hash persisted server-side (D-12); `httpOnly`/`Secure`/`SameSite=Lax` cookie attributes (D-13); sliding 30-day expiry (D-10); logout invalidates the server-side row, not just the cookie (AUTH-05) |
| V5 Input Validation | Yes | `return_to` path validated as same-origin relative path before use in any redirect (open-redirect prevention); `state` param compared via cookie double-submit, not accepted verbatim from the callback query string alone |
| V6/Cryptography (token generation) | Yes | `node:crypto.randomBytes` (CSPRNG) for session tokens and the `state` nonce — never `Math.random()` |
| V2 Access Control (later phases) | Not this phase | Explicitly deferred — this phase produces identity/session only; entitlement checks are Phase 4's job (D-02) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| CSRF on the OAuth callback (attacker initiates a flow using the victim's session to link the attacker's Google account) | Spoofing / Tampering | `state` param + cookie double-submit validation (Pattern 1) |
| Open redirect via `return_to` | Tampering | Relative-path-only validation (Pattern 1) — reject absolute URLs and protocol-relative (`//host`) paths |
| Session fixation / token replay from a DB leak | Information Disclosure | Only the SHA-256 hash is stored (D-12) — a DB read alone cannot be replayed as a cookie |
| Forged/tampered ID token accepted as real identity | Spoofing | Full JWT verification (signature via JWKS + `aud` + `iss` + `exp`) before any session is created (D-03) |
| Session cookie theft via XSS | Information Disclosure | `httpOnly` prevents JS access to the cookie entirely (D-13) |
| Session cookie leaked over plaintext HTTP | Information Disclosure | `Secure` attribute — cookie never sent over non-HTTPS (D-13); Vercel serves HTTPS by default |
| Long-lived session outliving a compromised device | Elevation of Privilege (persistence) | 30-day sliding window still expires an unused/stolen cookie eventually (D-10); concurrent multi-device sessions (D-11) mean sign-out only needs to affect the one compromised session's row, not force-logout every device — acceptable per the explicit multi-device decision, but note there is no "sign out everywhere" control in this phase's scope |

## Sources

### Primary (HIGH confidence)
- developers.google.com/identity/protocols/oauth2/web-server — authorization endpoint, token exchange endpoint, required/recommended parameters, state-parameter CSRF guidance
- developers.google.com/identity/gsi/web/guides/verify-google-id-token — required ID token claims (`iss`, `aud`, `exp`), JWKS endpoint URLs
- vercel.com/docs/functions/runtimes/node-js (last updated 2026-08-11) — Web Handler function signature, `/api` directory convention, request/response helpers
- vercel.com/docs/routing-middleware (last updated 2026-08-14) — `middleware.js` file convention, runtime options, matcher config
- npm registry (`npm view`) — `jose` 6.2.12, `cookie` 2.0.1, both confirmed present, aged, no postinstall scripts
- npmjs.org downloads API — weekly download counts for `jose` and `cookie`

### Secondary (MEDIUM confidence)
- auth0.com/docs/secure/attack-protection/state-parameters — state-cookie double-submit pattern, open-redirect mitigation guidance
- mazeez.dev/posts/why-google-oauth-profile-picture-returns-403 — `referrerPolicy="no-referrer"` fix for Google avatar image 403s
- vercel.com/docs/frameworks/frontend/vite (last updated 2026-08-26) — confirms `/api` convention still applies to non-Next/non-Nitro Vite projects, though the page now steers new projects toward Nitro for full-backend needs (not adopted here — plain `/api` matches this project's "serverless functions, not a self-hosted server" constraint better and requires no new build-tool dependency)

### Tertiary (LOW confidence)
- General ASVS 5.0 chapter-numbering summary (WebSearch aggregation, not the primary OWASP ASVS document itself) — chapter renumbering (V6/V7) treated as CITED-tier since corroborated by title text of the official GitHub-hosted ASVS repo search hit, but the specific control text within those chapters was not fetched directly this session

## Metadata

**Confidence breakdown:**
- Standard stack (jose/cookie choice, versions): HIGH — verified directly against npm registry and official docs this session
- Architecture (Vercel Functions/middleware conventions): HIGH — fetched directly from current Vercel docs (Aug 2026 last-updated dates)
- Pitfalls (React Router `<Link>` vs `<a>`, no-per-request-SSR, CSP/referrer for avatars): HIGH for the React Router and no-SSR findings (derived from direct codebase reading of `App.jsx`/`entry-server.jsx`/`ARCHITECTURE.md` this session and this session's initial file reads); MEDIUM for the Google avatar 403/referrer specifics (single tertiary source, not Google's own docs)
- Security domain (ASVS mapping): MEDIUM — chapter numbers/renumbering corroborated via search but not fetched from the primary OWASP ASVS document text directly

**Research date:** 2026-09-08
**Valid until:** 2026-10-08 (30 days — stable protocol/library surface, but Google Cloud Console UI and Vercel's function-signature conventions have both changed within the last year per this session's findings, so re-verify endpoint/runtime specifics if planning is delayed significantly past this window)
