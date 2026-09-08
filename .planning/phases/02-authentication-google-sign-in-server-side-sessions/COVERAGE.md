# Phase 2 — API Coverage Matrix (Google OAuth / OIDC)

**Detector:** `api-coverage.cjs` → `detected: true` (signals: OAuth SDK/API/integration language in CONTEXT.md + RESEARCH.md).
**Scope:** Google's server-initiated OAuth 2.0 Authorization Code flow + OpenID Connect identity verification, as consumed by this phase's sign-in/session feature (not a general-purpose Google API client).

Default posture: every capability starts as `INTEGRATE`. Rows below are the subtraction record — each `OPT-OUT` carries a reason.

| capability | decision | reason |
|---|---|---|
| `sign_in_redirect` (server-initiated 302 to accounts.google.com) | INTEGRATE | AUTH-01, D-01/D-07 |
| `scope_consent` (`openid email profile`) | INTEGRATE | AUTH-02/AUTH-03 depend on the `openid` scope returning an `id_token` (RESEARCH.md Pitfall 5) |
| `token_exchange` (authorization `code` → tokens, server-to-server) | INTEGRATE | Required to obtain the `id_token` to verify |
| `token_verification` (signature via JWKS, `aud`, `iss`, `exp`) | INTEGRATE | AUTH-02, D-03 |
| `csrf_state_validation` (state param + cookie double-submit) | INTEGRATE | Standard OAuth CSRF protection (Claude's Discretion, CONTEXT.md) |
| `open_redirect_protection` (`return_to` relative-path validation) | INTEGRATE | D-08 requires returning to the originating page; must be validated to stay same-origin |
| `session_creation` (opaque token + DB row) | INTEGRATE | AUTH-04, D-12 |
| `session_persistence` (sliding-window expiry) | INTEGRATE | AUTH-04, D-10 |
| `concurrent_multi_device_sessions` | INTEGRATE | D-11 |
| `profile_data_sync` (refresh name/email/picture every sign-in) | INTEGRATE | D-16 |
| `sign_out` (local session revocation) | INTEGRATE | AUTH-05 |
| `denied_consent_error_handling` (user cancels/denies at Google) | INTEGRATE | D-15 |
| `token_refresh` (requesting/using a refresh token) | OPT-OUT | This app never calls a Google API on the user's behalf after sign-in — identity is established once at callback time and then the app relies entirely on its own session, not continued Google API access. `access_type=online` (the default) is used, so no refresh token is ever issued or needed (RESEARCH.md Assumption A4). |
| `google_token_revocation` (calling Google's `oauth2.googleapis.com/revoke` endpoint) | OPT-OUT | Sign-out (AUTH-05) only invalidates this app's own server-side session row. There is no stored Google access/refresh token to revoke — the `id_token` obtained at callback time is verified once and discarded, never persisted. Revoking the underlying Google Account grant is a Google Account-settings action outside this app's scope. |
| `nonce_replay_protection` (OIDC `nonce` claim) | OPT-OUT | `nonce` defends against ID-token replay in implicit/hybrid flows where the token transits the browser directly. This phase uses a server-initiated authorization-code flow (D-01) — the `id_token` is only ever seen server-to-server during the token exchange, and the CSRF/replay surface on the browser-visible leg is already covered by `csrf_state_validation` (RESEARCH.md Assumption A5). |
| `account_linking` (linking a second identity provider to one user) | OPT-OUT | Google is the sole sign-in method for this product (D-05/AUTH-06 — no email/password option exists anywhere). There is no second provider to link against. |
| `offline_access_consent_prompt` (`access_type=offline` + `prompt=consent`) | OPT-OUT | Follows directly from the `token_refresh` opt-out above — offline access is only meaningful if a refresh token will actually be used. |

**Summary:** 12 capabilities integrated, 4 opted out (all with a documented, capability-specific reason tied to this phase's identity-only, no-ongoing-Google-API-access scope per D-02).
