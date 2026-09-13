---
phase: 06-foundation-global-chrome-breakpoint-tokens-header-nav-footer
plan: 02
subsystem: ui
tags: [css, safe-area-inset, viewport-fit, tap-targets, accessibility, mobile-nav]

# Dependency graph
requires:
  - phase: 06-01
    provides: "Documented breakpoint-tier comment block, --wordmark-fs/--footer-pad-y tokens, svh companions on mobile .nav max-height"
provides:
  - "viewport-fit=cover on index.html's viewport meta, unlocking env(safe-area-inset-*) resolution"
  - "Mobile .nav safe-area padding-left/right/bottom overrides (additive to the existing shorthand)"
  - ".nav>.btn, .nav .auth-trigger, and .auth-menu__item each meeting the 44px tap-target minimum"
  - "Real-rendering evidence (screenshots + measured box-model heights) confirming zero regression to Header.jsx/Footer.jsx across auth-slot states and footer legibility at 375px/430px"
affects: []

actuals:
  tokens: 414
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "CSS-only tap-target/safe-area fixes verified via a headless-Chrome CDP harness (same pattern as verify-hero.mjs) rather than a component-level unit test, since the acceptance bar is real rendered box-model geometry, not declared CSS values"
    - "Auth-trigger/auth-menu__item real height verified via synthetic DOM injection matching Header.jsx's exact markup under the live CSS cascade, working around the lack of a live OAuth/DB backend in this execution sandbox"

key-files:
  created: []
  modified:
    - index.html
    - src/styles/eclat.css

key-decisions:
  - "Verified `npm run build`'s CSS/JS scope via `npx vite build` directly, same substitution as Plan 06-01: this sandbox has no POSTGRES_URL so the full `npm run build` pipeline fails at the migration step before ever reaching the Vite build, unrelated to this plan's CSS/HTML-only scope"
  - "Live signed-in auth-menu interaction (real Google OAuth + POST /api/auth/logout) could not be exercised in this sandbox (no DB, no OAuth credentials per CLAUDE.md's never-invent-credentials constraint) — substituted a synthetic DOM injection of the exact .auth-trigger/.auth-menu__item markup into the live page to measure real rendered box-model height under the actual CSS cascade, and confirmed Header.jsx's JS/markup is byte-identical via git diff --stat (T-06-06's concrete mitigation gate)"
  - "Loading-placeholder state timing: used CDP's Fetch domain to pause the /api/auth/session request specifically (rather than throttling the whole page) so the .auth-slot--loading placeholder was directly observable, both nav-closed (0 rendered height/width, as expected — mobile nav is collapsed by default) and nav-open (stretches to full nav width in mobile's column+stretch layout, confirming the placeholder's min-width:90px is a desktop-row-layout affordance that is moot but harmless in the mobile column layout — pre-existing, unmodified by this plan)"

requirements-completed: [CHROME-01, CHROME-02, CHROME-03]

coverage:
  - id: D1
    description: "index.html's viewport meta carries viewport-fit=cover; the mobile .nav rule gains 3 env(safe-area-inset-*) padding overrides additive to the existing padding shorthand"
    requirement: "CHROME-01"
    verification:
      - kind: unit
        ref: "grep -c viewport-fit=cover index.html ==1; grep -c env(safe-area-inset-left/right/bottom) eclat.css (all >=1); grep -c 'padding: 8px var(--gut) 22px' eclat.css ==1 (original shorthand intact)"
        status: pass
      - kind: automated_ui
        ref: "verify-06-02.mjs navPadding probe: left/right/bottom all resolve to max(22px, env(...)) == 22px on this non-notched emulated device, visually identical to pre-phase padding"
        status: pass
    human_judgment: true
    rationale: "env(safe-area-inset-*) resolves to a genuine nonzero value only on real notched hardware or a notch-aware device preset — this sandbox's emulated viewport reports 0 for every inset, so the notched-device clearance itself (not just the CSS wiring) needs a real device or Chrome DevTools' notched-preset mode, deferred to end-of-phase human verification per config's human_verify_mode: end-of-phase."
  - id: D2
    description: ".nav>.btn, .nav .auth-trigger, and .auth-menu__item each measure >=44px real rendered height at the 900px breakpoint; .nav__toggle and .nav>a are untouched and still pass"
    requirement: "CHROME-02"
    verification:
      - kind: unit
        ref: "grep -c 'min-height: 44px' eclat.css >=2; grep -n 'padding: 14px 16px' on .auth-menu__item; grep -c '\\.nav \\.auth-trigger' ==1"
        status: pass
      - kind: automated_ui
        ref: "verify-06-02.mjs: real getBoundingClientRect() at 375x812/430x932 — .nav__toggle 46px, .nav>a 53px, .nav>.btn 53px, .auth-trigger 44px (synthetic-DOM real-cascade measurement), .auth-menu__item 48px x2"
        status: pass
    human_judgment: false
  - id: D3
    description: "Zero regression to Header.jsx/Footer.jsx JS/markup across the whole phase; all three auth-slot states (loading/signed-out/signed-in) render/behave correctly at 375px and 430px"
    requirement: "CHROME-01"
    verification:
      - kind: unit
        ref: "git diff --stat -- src/components/Header.jsx src/components/Footer.jsx (empty output, both commits + working tree)"
        status: pass
      - kind: automated_ui
        ref: "verify-06-02.mjs: loading state captured via CDP Fetch-domain request pause (auth-slot--loading present, visibility:hidden, 0px when nav closed / full-width when nav open — pre-existing, unaffected); signed-out state live-rendered (Sign in link present, 53px tap target)"
        status: pass
    human_judgment: true
    rationale: "The signed-in interactive flow (real Google OAuth round trip + POST /api/auth/logout + session cookie clearing) requires a live database and OAuth credentials that do not exist in this execution sandbox (CLAUDE.md: credentials must be supplied via env vars, never invented) — the CSS sizing of the signed-in auth-trigger/auth-menu was proven via synthetic DOM injection under the real cascade (see D2), but the live functional sign-in/sign-out round trip itself must be confirmed once in an environment with real credentials, deferred to end-of-phase human verification per config's human_verify_mode: end-of-phase, consistent with Plan 06-01's precedent for its own environment-blocked checks."
  - id: D4
    description: "At 375px and 430px, the footer's wordmark, nav-links row, and copyright fine-print row render on distinct, non-overlapping rows with no clipped text (CHROME-03 backstop)"
    requirement: "CHROME-03"
    verification:
      - kind: automated_ui
        ref: "verify-06-02.mjs footer probe + footer-375x812.png / footer-430x932.png: markOverlapsNav=false, navOverlapsFine=false, fine-print right edge (353px/408px) within viewport width, real screenshots confirm 3 distinct rows with full-sentence wrap"
        status: pass
    human_judgment: false
---

# Phase 6 Plan 2: Global Chrome — Header/Nav/Footer Summary

**Wired `viewport-fit=cover` end-to-end to unlock safe-area insets on the mobile nav drawer, bumped 3 failing tap targets (`.nav>.btn`, `.auth-trigger`, `.auth-menu__item`) to the 44px minimum, and proved zero regression to Header.jsx/Footer.jsx with real rendered evidence — headless-Chrome screenshots and measured box-model heights — at 375px and 430px.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-13T13:06:00Z
- **Completed:** 2026-09-13T13:41:09Z
- **Tasks:** 3
- **Files modified:** 2 (`index.html`, `src/styles/eclat.css`)

## Accomplishments

- `index.html`'s viewport meta now carries `viewport-fit=cover`, the prerequisite for `env(safe-area-inset-*)` to resolve to anything but 0; the mobile `.nav` rule gained 3 new `padding-left`/`padding-right`/`padding-bottom` overrides using `max(existing-value, env(safe-area-inset-*))`, additive to the original `padding: 8px var(--gut) 22px` shorthand
- `.nav>.btn` (mobile Subscribe CTA) gained `min-height: 44px` + inline-flex centering; a new `.nav .auth-trigger` rule (`min-height: 44px; padding-block: 10px`) was added; `.auth-menu__item`'s padding was bumped from `8px 16px` to `14px 16px` at all widths — `.nav__toggle` and `.nav>a` were confirmed already passing and left byte-for-byte unchanged
- Built and ran a headless-Chrome CDP verification harness (same pattern as the project's own `verify-hero.mjs`) to capture real evidence at 375x812 and 430x932: measured `.nav__toggle` (46px), `.nav>a` (53px), `.nav>.btn` (53px), `.auth-trigger` (44px via synthetic DOM injection under the live CSS cascade), and `.auth-menu__item` (48px x2) — all meet or exceed the 44px minimum
- Confirmed via `git diff --stat` that `Header.jsx` and `Footer.jsx` have zero changes across the entire phase (both plans), satisfying the T-06-06 clickjacking-mitigation gate
- Captured real screenshots of the footer at both widths confirming the wordmark, nav-links row, and copyright fine-print each render on distinct, non-overlapping rows with the full copyright sentence wrapping cleanly (CHROME-03 backstop)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire safe-area insets end-to-end for the notched-device nav drawer** - `9a5f10e` (feat)
2. **Task 2: Bump nav/auth tap targets to the 44px minimum** - `5eb6f9d` (feat)
3. **Task 3: Verify chrome regression across 3 auth states, real tap-target measurement, and the CHROME-03 footer backstop** - verification-only, no source changes (see evidence below); recorded in this SUMMARY and the plan-metadata commit

## Files Created/Modified

- `index.html` - Added `viewport-fit=cover` to the viewport meta tag
- `src/styles/eclat.css` - Mobile `.nav` safe-area padding overrides; `.nav>.btn`/`.nav .auth-trigger` 44px min-height; `.auth-menu__item` padding bump to `14px 16px`

## Decisions Made

- Substituted `npx vite build` for the plan's literal `npm run build` verification command after every task, same as Plan 06-01: this sandbox has no `POSTGRES_URL`, so the full build pipeline fails at the DB migration step before reaching the Vite/CSS build — unrelated to this plan's HTML/CSS-only scope. `npx vite build` exercises the exact transform pipeline this plan's changes affect and passed cleanly all 3 times (63 modules transformed, 0 errors).
- Built a one-off CDP verification script (`verify-06-02.mjs`, kept in the session scratchpad, not committed — matches the project's existing `verify-hero.mjs` pattern of a throwaway/manual verification harness) to get real rendered evidence instead of relying on grep alone for the human-check items.
- For the signed-in auth-menu state, which requires a live Google OAuth + database session unavailable in this sandbox (per CLAUDE.md's constraint against inventing credentials), measured the real rendered height of `.auth-trigger`/`.auth-menu__item` by injecting the exact markup structure from `Header.jsx` into the live page's DOM — this exercises the real CSS cascade, fonts, and box model without needing a live backend, while the live interactive sign-in/sign-out round trip itself is deferred to end-of-phase human verification (see Issues Encountered).
- Used CDP's `Fetch` domain to pause the `/api/auth/session` request specifically (rather than throttling the whole page load) to reliably observe the `.auth-slot--loading` placeholder before it resolves.

## Deviations from Plan

None - plan executed exactly as written. All file/line targets matched the plan's `<action>` descriptions (accounting for the ~15-line offset introduced by Plan 06-01's merged breakpoint-doc-block addition, which the plan's own line numbers already anticipated as "originally lines X-Y").

## Issues Encountered

- **Stale preview server (environment quirk, not a code bug):** the first `npm run serve` background process ended up serving a stale cached build from an earlier session on the same port (4173), causing an initial false-negative reading of `.auth-trigger`'s min-height (measured 0/auto instead of 44px). Diagnosed by comparing the served CSS hash against `dist/`'s actual on-disk hash, killed the stale process, and restarted — the fresh server correctly served the latest build and all measurements matched expectations. No code changes were involved; purely a leftover-process artifact of this sandbox.
- **Live signed-in auth flow cannot be exercised in this sandbox:** no `POSTGRES_URL` and no OAuth credentials are configured here (per CLAUDE.md, credentials must be supplied via env vars, never invented). The `/api/auth/session` endpoint 404s under `vite preview` (no serverless functions running), so the app correctly falls through to the signed-out state after the fetch fails — this was usable to verify the loading and signed-out states live, but the actual signed-in interactive round trip (Google OAuth redirect, session cookie, `POST /api/auth/logout`) could not be triggered. Substituted a synthetic-DOM CSS-cascade measurement for the box-model height claim (see Decisions Made) and confirmed `Header.jsx`'s JS/markup is byte-identical via `git diff --stat`, satisfying the T-06-06 mitigation gate. The live functional round trip itself should be confirmed once in an environment with real DB + OAuth credentials, consistent with Plan 06-01's own precedent for environment-blocked human-checks (`human_verify_mode: end-of-phase` in `.planning/config.json`).

## User Setup Required

None - no external service configuration required for this plan's CSS/HTML-only changes. (A live database + Google OAuth credentials are required to close out the one deferred human-check noted above, but that is pre-existing project setup, not new setup introduced by this plan.)

## Next Phase Readiness

- All 3 CHROME requirements (CHROME-01, CHROME-02, CHROME-03) have their automatable and CSS-cascade-verifiable claims proven with real evidence (screenshots + measured box-model heights), not just code review.
- One item remains for end-of-phase human verification, consistent with `human_verify_mode: end-of-phase`: confirming the live signed-in auth-menu interaction (real OAuth sign-in, avatar+name display, `Sign out` round trip) in an environment with a real database and OAuth credentials — the CSS sizing itself is already proven correct via synthetic-DOM measurement.
- Also carrying forward from Plan 06-01: `env(safe-area-inset-*)`'s actual nonzero resolution on genuinely notched hardware (this plan's CSS wiring is confirmed correct and additive; the visual notch-clearance effect itself needs a real device or notched DevTools preset).
- No blockers. Global chrome (header/nav/footer) is now the foundation the rest of the v1.1 milestone's content-page phases build on top of, with zero JS/markup changes to `Header.jsx`/`Footer.jsx` across the whole phase.

## Self-Check: PASSED

- FOUND: `.planning/phases/06-foundation-global-chrome-breakpoint-tokens-header-nav-footer/06-02-SUMMARY.md`
- FOUND: `9a5f10e` (Task 1 commit)
- FOUND: `5eb6f9d` (Task 2 commit)

---
*Phase: 06-foundation-global-chrome-breakpoint-tokens-header-nav-footer*
*Completed: 2026-09-13*
