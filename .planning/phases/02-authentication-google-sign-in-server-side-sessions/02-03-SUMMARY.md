---
phase: 02-authentication-google-sign-in-server-side-sessions
plan: 03
subsystem: auth
tags: [account-gate, session-check, error-notice, react-router]

# Dependency graph
requires:
  - phase: 02-authentication-google-sign-in-server-side-sessions
    plan: 02
    provides: "middleware.js Edge cookie-presence pre-filter for /account, api/auth/google/callback.js's ?auth_error=1 redirect on failure, src/lib/useSession.js hook"
provides:
  - "src/routes/Account.jsx — client-side auth gate: loading state, then real mocked content (signed-in) or full redirect into sign-in (signed-out/session-check-failed)"
  - "src/App.jsx — shell-level inline sign-in error notice driven by ?auth_error=1, self-clearing via history.replaceState"
affects: [04-content-gating, account-ui]

# Actuals (#2632)
actuals:
  tokens: 900
  tasks: 1
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSession()-driven route gate: loading -> content vs. window.location.assign redirect (plain navigation, never React Router navigate/Link, per Pitfall 1) — same fail-closed treatment for 'confirmed signed out' and 'session-check request itself failed' (D-09)"
    - ".demo-notice class reuse extended from Subscribe.jsx's static demo banner to a dynamic, self-clearing shell-level error notice (tag text swapped to 'Error', body includes a live retry link) — no new CSS introduced"

key-files:
  modified:
    - src/routes/Account.jsx
    - src/App.jsx

key-decisions:
  - "The inline error notice's 'try again' text is a live <a href=\"/api/auth/google?return_to={current pathname}\"> (via useLocation()'s pathname), not static text — Component Notes §3 and the Copywriting Contract both specify a linked retry, not just an error message."
  - "Left Account.jsx's existing subscribed/plan/invoices rendering logic completely untouched below the new gate — billing realism remains explicitly out of scope for this phase (D-02, Phase 5's job)."

patterns-established:
  - "Route-level auth gates in this app are a three-way branch on useSession()'s { user, loading }: loading -> minimal placeholder, user present -> existing route content unmodified, user null -> plain-navigation redirect. No new abstraction/hook was introduced — this plan is pure consumption of Plan 02-01's useSession()."

requirements-completed: [AUTH-04, AUTH-06]

coverage:
  - id: D1
    description: "Visiting /account while signed out (or when the session-check request itself fails) never renders the existing mocked account content, even briefly — shows 'Checking your session…' then redirects into sign-in once the check resolves to signed-out or errors"
    requirement: "AUTH-04"
    verification:
      - kind: unit
        ref: "npm run build:client succeeds; grep confirms useSession() call, 'Checking your session' loading copy, and window.location.assign('/api/auth/google...') redirect (never navigate()/Link) all present in Account.jsx"
        status: pass
      - kind: manual_procedural
        ref: "live browser check: visit /account signed-in (real content should show, no stale flash) and signed-out (redirect into sign-in, no content flash)"
        status: unknown
    human_judgment: true
    rationale: "The loading-to-content transition timing and absence of a stale-content flash can only be judged by watching a real browser session; deferred to phase-level UAT per workflow.human_verify_mode=end-of-phase."
  - id: D2
    description: "A failed, denied, or cancelled Google sign-in returns the user to their original page with a brief inline error notice (not a dead-end), rendered only when ?auth_error=1 is present on load, and clears itself via history.replaceState on the next navigation rather than a persistent stored flag"
    requirement: "AUTH-06"
    verification:
      - kind: unit
        ref: "npm run build:client succeeds; grep confirms auth_error param read, history.replaceState call, and .demo-notice class reuse all present in App.jsx"
        status: pass
      - kind: manual_procedural
        ref: "live browser check: cancel consent at Google's real screen, confirm return to origin page with the notice, confirm a reload does not re-show it"
        status: unknown
    human_judgment: true
    rationale: "Denied-consent handling against Google's real consent screen cannot be automated in this environment (no automated check can forge/decline a live OAuth flow); deferred to phase-level UAT per workflow.human_verify_mode=end-of-phase."

duration: ~15min
completed: 2026-09-09
status: complete
---

# Phase 2 Plan 3: Account Auth Gate & Inline Sign-In Error Notice Summary

**`/account` becomes a real `useSession()`-gated route (loading -> real content or full redirect, never a stale-content flash) and `App.jsx` gains a shell-level, self-clearing inline error notice for failed/denied/cancelled Google sign-ins — the last two pieces of phase-visible auth UX (D-09, D-15).**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-09
- **Completed:** 2026-09-09
- **Tasks:** 1
- **Files modified:** 2 (both modified, no new files)

## Accomplishments
- `src/routes/Account.jsx`: calls `useSession()` ahead of the existing `useApp()` destructure; renders a centered "Checking your session…" line (no mocked panel/invoices markup) while loading; on resolution, signed-in renders the existing unmodified mocked content, signed-out **or session-check-failed** both fail closed into a plain `window.location.assign('/api/auth/google?return_to=/account')` redirect (never React Router's `navigate()`)
- `src/App.jsx`: new `authError` state + a mount-time effect reading `?auth_error=1` off `window.location.search`, immediately stripping it via `window.history.replaceState` so a refresh never re-shows the notice; renders the reused `.demo-notice`/`.demo-notice__tag`/`.demo-notice__text` markup (tag swapped to "Error") directly below `<Header />` and above `<Routes>`, with a live `<a href="/api/auth/google?return_to={current pathname}">try again</a>` link built from `useLocation()`'s pathname
- No new dependencies, files, DB columns, or env vars — pure consumption of Plans 02-01/02-02's `useSession()` hook and the callback's existing `?auth_error=1` redirect contract

## Task Commits

Each task was committed atomically:

1. **Task 1: Account.jsx auth gate and App.jsx inline sign-in error notice** - `7c780ea` (feat)

**Plan metadata:** _(pending — this commit, docs(02-03): complete plan)_

## Files Created/Modified
- `src/routes/Account.jsx` - added `useSession()` call, loading state, and fail-closed signed-out/error redirect ahead of the pre-existing mocked panel/invoices rendering (left byte-for-byte unchanged below the gate)
- `src/App.jsx` - added `authError` state, mount-time `?auth_error=1` effect with `history.replaceState` strip, and the reused `.demo-notice`-styled inline error banner with a live retry link

## Decisions Made
- The "try again" copy is a live link (`href="/api/auth/google?return_to={pathname}"`), not static text — per UI-SPEC Component Notes §3 and the Copywriting Contract, which both specify an inline `<a>` for the retry action, not just an error string.
- `Account.jsx`'s `subscribed`/`plan`/`invoices` rendering logic below the gate is untouched — billing realism remains explicitly out of scope for this phase (D-02), deferred to Phase 5.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Live browser verification of both `<human-check>` flows (signed-in vs. signed-out `/account` visit; denied-consent-at-Google round trip) was not run in this session — this worktree has no interactive browser available, and per `.planning/config.json`'s `workflow.human_verify_mode: "end-of-phase"`, these are deferred to end-of-phase UAT rather than blocking this plan's completion. `npm run build:client` and all six automated grep assertions passed.

## User Setup Required

None. This plan introduced no new environment variables or external service configuration.

## Next Phase Readiness
- This plan closes out Phase 2's user-facing auth surface: sign-in (02-01), sign-out/middleware/header (02-02), and now the `/account` gate + error notice (02-03) are all in place.
- Open items carried to end-of-phase UAT: the live `/account` signed-in/signed-out visit and the real Google-consent-denial round trip (both deferred per `workflow.human_verify_mode: "end-of-phase"`, consistent with 02-01 and 02-02's identical deferrals).
- No blockers. Phase 4 (content gating) and Phase 5 (billing) both build on the session/auth primitives now fully wired through the UI.

---
*Phase: 02-authentication-google-sign-in-server-side-sessions*
*Completed: 2026-09-09*
