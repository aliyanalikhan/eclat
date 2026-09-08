---
phase: 02-authentication-google-sign-in-server-side-sessions
plan: 02
subsystem: auth
tags: [google-oauth, session-lifecycle, sign-out, vercel-middleware, header-ui, csp]

# Dependency graph
requires:
  - phase: 02-authentication-google-sign-in-server-side-sessions
    plan: 01
    provides: "lib/session.js (hashToken/cookieOptions/serializeCookie/parseCookies), lib/db.js, api/auth/session.js, src/lib/useSession.js, signed-out-only Header.jsx anchor"
provides:
  - "api/auth/logout.js — POST handler that deletes the caller's sessions row by token_hash and clears the session cookie (AUTH-05)"
  - "middleware.js — Edge routing middleware, matcher ['/account'], redirects to /api/auth/google when the session cookie is entirely absent"
  - "src/components/Header.jsx — full three-state auth-aware nav slot (loading / signed-out / signed-in with sign-out disclosure menu)"
  - "src/styles/eclat.css — .auth-slot/.auth-trigger/.auth-avatar/.auth-caret/.auth-menu rule set"
  - "vercel.json + public/_headers — CSP img-src widened to allow https://*.googleusercontent.com"
affects: [02-03-account-gate, 04-content-gating, account-ui]

# Actuals (#2632)
actuals:
  tokens: 3900
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: ["@vercel/functions@3.9.5"]
  patterns:
    - "Vercel routing middleware (Edge default runtime) as a cheap cookie-presence pre-filter, never the authoritative auth check — matches the Architectural Responsibility Map's split between Edge pre-filter and API/DB-backed authority"
    - "idle/loaded/failed-style onError fallback for a cross-origin avatar image, mirroring Cover.jsx's existing state-machine shape"
    - "Disclosure-menu open/close mechanics (Escape + focus return, close-on-route-change, outside-click) reusing and extending Header.jsx's existing mobile-nav toggle pattern"

key-files:
  created:
    - api/auth/logout.js
    - middleware.js
  modified:
    - src/components/Header.jsx
    - src/styles/eclat.css
    - vercel.json
    - public/_headers
    - package.json
    - package-lock.json

key-decisions:
  - "Reused lib/session.js's existing hashToken/cookieOptions/serializeCookie/parseCookies wrappers in api/auth/logout.js rather than touching the cookie package directly, keeping Plan 02-01's 'one file owns the cookie package API' pattern intact."
  - "Wrapped the signed-in trigger + dropdown in a single position:relative .auth-slot div so the auth-menu can be absolutely positioned (top:100%, right:0) without a portal, and so the outside-click listener has one containment boundary to check."

patterns-established:
  - "New CSS rule sets for interactive dropdown menus reuse existing design tokens (--paper, --line, --ink, --ease) and existing hover-state values (.btn--ghost:hover's rgba background) rather than inventing new colors."

requirements-completed: [AUTH-01, AUTH-04, AUTH-05, AUTH-06]

coverage:
  - id: D1
    description: "POST /api/auth/logout deletes the matching sessions row by token_hash (not just the cookie) and clears the session cookie; a copy of the old raw cookie made before logout no longer authenticates against GET /api/auth/session"
    requirement: "AUTH-05"
    verification:
      - kind: integration
        ref: "node -e DB round-trip test — inserts a real users/sessions row, POSTs to api/auth/logout.js with the matching cookie, asserts 204 + row deletion, then confirms the same raw cookie against api/auth/session.js returns user: null"
        status: pass
    human_judgment: false
  - id: D2
    description: "middleware.js redirects a cookie-less request to /account toward /api/auth/google and passes through via @vercel/functions' next() when a session cookie is present, without querying the database"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "grep assertions — matcher: ['/account'] present, next import from '@vercel/functions' present, no lib/db.js import in middleware.js"
        status: pass
      - kind: manual_procedural
        ref: "live browser check: visiting /account signed-out redirects into Google sign-in without a stale-page flash; signed-in visit passes through"
        status: unknown
    human_judgment: true
    rationale: "Requires a real browser navigation and (for the signed-in case) a live session cookie from an actual Google round-trip; deferred to phase-level UAT per workflow.human_verify_mode=end-of-phase."
  - id: D3
    description: "Header.jsx renders exactly one of three auth-slot states with no visible flash, and the signed-in state exposes a working sign-out menu with avatar, truncated name, and in-flight/error handling"
    requirement: "AUTH-01, AUTH-06"
    verification:
      - kind: unit
        ref: "npm run build:client succeeds; grep assertions confirm useSession(), aria-expanded, referrerPolicy=\"no-referrer\", fetch('/api/auth/logout'), and eclat.css's .auth-menu rule set are all present"
        status: pass
      - kind: manual_procedural
        ref: "live browser check: sign in with a real Google account, observe header transition, avatar render/fallback, and menu open/close/dim/error states"
        status: unknown
    human_judgment: true
    rationale: "Visual layout, animation smoothness, and flash-of-wrong-state cannot be verified by grep or a scripted fetch; deferred to phase-level UAT per workflow.human_verify_mode=end-of-phase."
  - id: D4
    description: "No email/password sign-in option exists anywhere on the site — Google OAuth via the header's Sign in anchor remains the sole entry point after this plan's header rewrite"
    requirement: "AUTH-06"
    verification:
      - kind: unit
        ref: "Header.jsx's signed-out branch still renders only the plain <a href=\"/api/auth/google?...\"> anchor from Plan 02-01 — no form/password field was introduced by this plan's changes"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-09-09
status: complete
---

# Phase 2 Plan 2: Sign-Out, Middleware Pre-Filter & Auth-Aware Header Summary

**Database-backed sign-out (`api/auth/logout.js`), an Edge cookie-presence pre-filter for `/account` (`middleware.js`), and `Header.jsx`'s full three-state auth-aware nav slot (loading placeholder / signed-out link / signed-in name+avatar with a working sign-out disclosure menu), matching 02-UI-SPEC.md exactly.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-09 (session start)
- **Completed:** 2026-09-09
- **Tasks:** 2
- **Files modified:** 8 (2 created, 6 modified, including package-lock.json)

## Accomplishments
- `api/auth/logout.js`: real DB-backed sign-out — deletes the `sessions` row by `token_hash` (not merely the cookie), so a captured copy of the old raw cookie is rejected by `GET /api/auth/session` immediately after sign-out
- `middleware.js`: Edge routing middleware (`matcher: ['/account']`) that redirects a cookie-less visitor straight into `/api/auth/google` before any stale page content can flash — a cheap presence-check pre-filter, never the authoritative check, and makes zero database calls
- `Header.jsx` now implements every state from 02-UI-SPEC.md Component Notes §1-2: an invisible reserved-width loading placeholder, the existing plain "Sign in" anchor, and — when signed in — a 20px avatar + truncated name + disclosure caret trigger that opens a "Account"/"Sign out" menu with in-flight dimming and an inline failure message
- CSP (`vercel.json`, `public/_headers`) widened to allow `https://*.googleusercontent.com` in `img-src` so the Google profile photo can render; the avatar sets `referrerPolicy="no-referrer"` and falls back to an initials circle on load failure
- New `@vercel/functions@3.9.5` dependency (official Vercel package, verified via `npm view`: no postinstall script) provides `next()` for the middleware pass-through case

## Task Commits

Each task was committed atomically:

1. **Task 1: Sign-out route and the /account edge pre-filter** - `981f066` (feat)
2. **Task 2: Auth-aware header — three states, sign-out menu, avatar, CSP** - `9f82841` (feat)

**Plan metadata:** _(pending — this commit, docs(02-02): complete plan)_

## Files Created/Modified
- `api/auth/logout.js` - POST handler, deletes the matching `sessions` row by `token_hash`, clears the `session` cookie, returns 204
- `middleware.js` - Edge pre-filter, `matcher: ['/account']`, redirects to `/api/auth/google` when no session cookie is present, otherwise `next()`
- `src/components/Header.jsx` - full three-state auth slot (loading/signed-out/signed-in), sign-out disclosure menu, avatar fallback state machine
- `src/styles/eclat.css` - new `.auth-slot`, `.auth-slot--loading`, `.auth-trigger`, `.auth-avatar`, `.auth-avatar--fallback`, `.auth-trigger__name`, `.auth-caret`, `.auth-menu`, `.auth-menu__item`, `.auth-menu__error` rules
- `vercel.json`, `public/_headers` - CSP `img-src` widened to `'self' data: https://*.googleusercontent.com`
- `package.json`/`package-lock.json` - added `@vercel/functions@3.9.5`

## Decisions Made
- Kept all cookie-package interaction inside `lib/session.js`'s existing wrappers (`hashToken`, `cookieOptions`, `serializeCookie`, `parseCookies`) in `api/auth/logout.js`, consistent with Plan 02-01's established pattern of routes never importing the `cookie` package directly.
- Wrapped the signed-in trigger and its dropdown in a single `position: relative` `.auth-slot` container so the menu can be absolutely positioned (`top: 100%; right: 0`) without a portal, and so the outside-click listener has one DOM node to test containment against.
- The sign-out menu's `Escape`/route-change/outside-click close behavior directly extends `Header.jsx`'s pre-existing mobile-nav toggle effects (same `useEffect` shapes) rather than introducing a separate, differently-structured mechanism.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written. `npm view @vercel/functions@3.9.5` was run before install per the plan's own instruction and confirmed the package legitimacy claim (official `github.com/vercel/vercel` repo, no postinstall script) already stated in the plan text.

---

**Total deviations:** 0
**Impact on plan:** None — implementation matched the plan's action text and UI-SPEC references directly.

## Issues Encountered
- Live browser verification of the sign-out click-through cycle and the real Google-account header transition (both tasks' `<human-check>`) was not run in this session — this worktree has no interactive browser available, and per `.planning/config.json`'s `workflow.human_verify_mode: "end-of-phase"`, these are deferred to end-of-phase UAT rather than blocking this plan's completion. The automated DB-backed logout test (Task 1) and the `npm run build:client` + grep assertions (Task 2) both passed.

## User Setup Required

None. This plan introduced no new environment variables or external service configuration beyond what Plan 02-01 already established.

## Next Phase Readiness
- The session lifecycle is now complete end-to-end: sign-in (Plan 02-01) through sign-out (this plan), with a real DB-backed guarantee that a signed-out cookie cannot be replayed.
- `middleware.js` is in place for Plan 02-03 to build `/account`'s client-side auth gate on top of — middleware only short-circuits the "definitely no cookie" case; the authoritative check remains the existing `GET /api/auth/session` call.
- `Header.jsx` is now fully auth-aware and is the site's one and only sign-in/sign-out entry point (AUTH-01, AUTH-06 complete for this phase's scope).
- No blockers. Open items carried to end-of-phase UAT: the live sign-out click-through, the real Google-account header render (avatar + fallback), and `/account`'s middleware redirect in an actual browser.

---
*Phase: 02-authentication-google-sign-in-server-side-sessions*
*Completed: 2026-09-09*
