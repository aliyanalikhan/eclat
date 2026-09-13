# Phase 2: Authentication — Google Sign-In & Server-Side Sessions - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers real Google sign-in with server-side identity verification and persistent server-side sessions — no billing, no content gating, no account-management UI. Concretely: a server-initiated OAuth redirect flow to Google, server-side verification of the returned ID token (signature, audience, expiry, issuer), a `users` row keyed by Google's stable `sub` claim, a real session (cookie + DB-backed `sessions` row) that survives page reloads, and sign-out that clears it. The `/account` route becomes auth-gated (redirects signed-out visitors to sign-in) as a consequence of real sessions existing, but its content/UI stays the existing mocked page — real billing/subscription data is Phase 5's job. Phases 3–5 (billing, content gating, account UI) build on the identity and session primitives this phase establishes but do not exist yet.

</domain>

<decisions>
## Implementation Decisions

### OAuth flow (already locked before this discussion — carried forward)
- **D-01:** Server-initiated redirect flow for Google sign-in (not a client-loaded Google Identity Services SDK) — decided during roadmap research specifically to keep CSP changes minimal (`script-src`/`connect-src` stay tight; no third-party auth JS runs in the browser). The browser is redirected to Google's OAuth endpoint and back to a server callback route; token exchange and verification happen server-side only.
- **D-02:** Session (identity) and entitlement (access) are kept structurally separate — decided during roadmap research. This phase's session only proves "who is signed in," never "what they're allowed to see." Entitlement remains a live DB read in later phases, never baked into the session cookie/token.
- **D-03 (AUTH-02, locked by REQUIREMENTS.md):** The server independently verifies the Google ID token's signature, audience, expiry, and issuer before creating any session — an unverified or forged client-supplied identity is never trusted.
- **D-04 (AUTH-03, locked by REQUIREMENTS.md):** The user is identified internally by Google's stable `sub` claim (stored in the existing `users.google_sub` column), never by email address.
- **D-05 (AUTH-06, locked by REQUIREMENTS.md):** No email/password sign-in option exists anywhere on the site — Google is the only sign-in method.

### Sign-in entry point & post-login redirect
- **D-06:** The header's existing static "Account" link becomes auth-aware: it reads "Sign in" when signed out and "Account" (or the user's name) when signed in — one nav slot, matching today's single-link pattern in `src/components/Header.jsx` rather than adding a second nav item.
- **D-07:** Clicking "Sign in" redirects straight to Google's OAuth consent screen — no intermediary branded page. Fewest clicks, and consistent with D-01's server-redirect flow.
- **D-08:** After a successful sign-in, the user returns to whatever page they were on when they started sign-in (not always to `/account` or home) — preserves context, since sign-in will later be triggered from gated-content prompts in Phase 4.
- **D-09:** Visiting `/account` while signed out redirects straight into the sign-in flow (does not render the page with a placeholder). This is a direct consequence of the "Account" nav slot becoming a real authenticated destination once sessions exist.

### Session cookie & lifetime
- **D-10:** Sessions use a 30-day **sliding window** — the session's `expires_at` is extended on activity, so an actively-reading user never gets logged out mid-use, while an inactive one expires after 30 days of no visits.
- **D-11:** Concurrent multi-device sessions are allowed — each sign-in creates a new row in `sessions`; signing in on a phone does not invalidate a session on a laptop. Matches normal reader behavior and the existing schema (`sessions.user_id` with no uniqueness constraint already supports multiple rows per user).
- **D-12:** The session cookie carries a random, cryptographically-generated opaque token; only its hash is stored in the `sessions` table (requires adding a token-hash column — the current `sessions` table from Phase 1 has only `id`, `user_id`, `created_at`, `expires_at`). A database read/leak alone cannot be replayed as a live session, since the raw token is never persisted. — **Reversibility:** costly — **rationale:** switching later from opaque-hashed-token to a different session-identification scheme (e.g. JWT) would require invalidating all existing sessions and changing both the cookie-issuing and cookie-verifying code paths.
- **D-13:** Cookie attributes: `httpOnly`, `Secure`, `SameSite=Lax`. `httpOnly` keeps the token unreadable to JS (XSS-safe), `Secure` restricts it to HTTPS, and `SameSite=Lax` is required (not `Strict`) so the cookie survives the top-level redirect back from Google's OAuth flow.

### Sign-out placement & failed sign-in handling
- **D-14:** Sign-out lives in the header, in the same auth-aware slot that shows "Sign in" when signed out (D-06) — e.g. clicking the signed-in state reveals a sign-out action, rather than requiring a trip to `/account`.
- **D-15:** If Google sign-in is denied, cancelled, or ID token verification fails, the user is redirected back (to the page/flow they started from) with a brief inline error message ("Sign-in failed, try again") — no dead-end dedicated error page/route.

### Profile data sync on repeat sign-in
- **D-16:** `users.name`, `users.email`, and `users.picture` are refreshed from the Google ID token's claims on every sign-in (not just set once at first sign-up) — keeps the record current if the user changes their Google display name or photo. Same row-update operation that already touches `last_login_at` at sign-in time.

### Claude's Discretion
- Exact OAuth route paths/naming (e.g. `/api/auth/google`, `/api/auth/google/callback`) and whether serverless functions run on Vercel's Node or Edge runtime — left to planning/execution, informed by `@vercel/postgres` compatibility.
- CSRF protection mechanism for the OAuth redirect (e.g. `state` parameter validation) — standard OAuth practice, not discussed as a user-facing choice.
- Exact error-message copy for D-15's inline failure state.
- Exact UI treatment of the auth-aware header slot when signed in (name only vs. name + avatar vs. dropdown) — functional requirement (shows sign-out) is locked by D-06/D-14, visual detail is not.
- CSP updates required to allow the redirect to `accounts.google.com` (`vercel.json`, `public/_headers`) — technical necessity of D-01/D-07, not a preference to litigate.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` — Phase 2 section (Goal, Success Criteria, Requirements AUTH-01 through AUTH-06)
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-06 (full requirement text)
- `.planning/PROJECT.md` — Core Value, Constraints, Key Decisions (Google-only auth rationale, horizontal-layers structure, `users.id` is `BIGINT` not `UUID`)
- `.planning/STATE.md` — Accumulated Decisions: server-initiated redirect flow, session/entitlement separation (both carried into D-01/D-02 above)

### Prior Phase Context
- `.planning/phases/01-foundation-environment-secrets-data-layer/01-CONTEXT.md` — full Phase 1 decision log (D-01–D-15), especially D-08 (`users.id` is `BIGINT GENERATED ALWAYS AS IDENTITY`, not `UUID`) and the note that Phase 2/3 planning must check for other pre-existing artifacts rather than assuming a blank slate
- `migrations/0001_init.sql` — current live schema: `users` (has `google_sub`, `email`, `name`, `picture`, `last_login_at`, `stripe_customer_id`), `sessions` (currently only `id UUID`, `user_id BIGINT`, `created_at`, `expires_at` — needs a token-hash column per D-12), `subscriptions`, `webhook_events`, `addresses`

### Codebase Analysis
- `.planning/codebase/ARCHITECTURE.md` — "What Must Change" section; confirms no `/api` directory or per-request server code exists yet; confirms `src/store.jsx`'s `subscribed` flag must not be conflated with real session state
- `.planning/codebase/INTEGRATIONS.md` — confirms zero auth/session code exists today; documents the current strict CSP baseline that must be minimally loosened for the Google OAuth redirect

### Existing Config (likely to be modified this phase)
- `vercel.json`, `public/_headers` — current CSP (`script-src 'self'`, `connect-src 'self'`); will need a scoped addition for the redirect to Google's OAuth endpoint
- `package.json` — no `/api` directory or auth dependency exists yet; build script already runs migrations (`scripts/migrate.js`) before `vite build`
- `.env.example` / `.env.local` — `GOOGLE_CLIENT_ID` already present per Phase 1 discovery notes (PROJECT.md); `GOOGLE_CLIENT_SECRET` and a session-signing/token secret will be needed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store.jsx` (`AppProvider`/`useApp`) — the existing single-Context pattern for cross-page state; real auth/session state should likely surface through a comparable pattern (server-provided on load, not `localStorage`-persisted) rather than inventing a second state mechanism, but the `subscribed`/`plan` fields themselves must not be reused (see Phase 1 CONTEXT.md and `ARCHITECTURE.md` Anti-Patterns).
- `migrations/0001_init.sql` — established pattern for schema changes: numbered, idempotent (`IF NOT EXISTS`) SQL files. Adding the D-12 token-hash column should follow this same file convention (e.g. `0002_sessions_token_hash.sql`).
- `scripts/migrate.js` (Phase 1) — already wired into `npm run build`; any new session-table migration runs through this existing mechanism, no new tooling needed.

### Established Patterns
- `src/components/Header.jsx` — single `LINKS` array driving nav items, with "Account" currently a static, always-visible link (`/account`) with no auth-awareness. D-06 requires this link to become conditional/dynamic based on session state.
- `src/routes/Account.jsx` — currently reads `subscribed`/`plan` from `useApp()` (client-only, demo). Real auth state (signed-in or not) needs a different source; this phase does not need to rewrite Account.jsx's content, only make the route auth-gated per D-09 (billing/account-data realism is Phase 5).
- No `/api` directory, no server-per-request code, no `fetch`/API client anywhere in `src/` today (`ARCHITECTURE.md`) — this phase introduces the project's first real backend code paths (OAuth callback, session verification, sign-out).

### Integration Points
- `vercel.json` — CSP and headers config; needs a scoped addition allowing redirect/navigation to Google's OAuth authorization endpoint (exact directive depends on flow shape, left to planning).
- `package.json` build script — already runs `scripts/migrate.js` and `scripts/check-secrets.js` around the Vite build; a new session-token-secret env var (if added) must be covered by the existing secret-scan gate from Phase 1.

</code_context>

<specifics>
## Specific Ideas

- The header's existing single "Account" nav link is the anchor point for D-06 — the user confirmed reusing that slot rather than adding new UI surface, keeping the nav visually unchanged in structure.
- The 30-day sliding-window session (D-10) and concurrent-multi-device support (D-11) were both explicitly chosen with a magazine-subscription reading pattern in mind (people check in periodically from more than one device, shouldn't be logged out mid-read).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Authentication — Google Sign-In & Server-Side Sessions*
*Context gathered: 2026-09-08*
