---
phase: 06-foundation-global-chrome-breakpoint-tokens-header-nav-footer
plan: 01
subsystem: ui
tags: [css, clamp, viewport-units, pointer-events, breakpoints]

# Dependency graph
requires: []
provides:
  - "Documented breakpoint-tier comment block above eclat.css's :root (all 4 tiers: 1080/900/720/460px, with exact file/line call sites)"
  - "--wordmark-fs and --footer-pad-y fluid clamp() tokens in :root, consumed by .wordmark and .footer"
  - "svh companions on .hero, .lightbox, .lightbox__frame (x2), and the mobile .nav max-height (vh kept first as fallback)"
  - "Touch-pointer early-return gate in useDragScroll's onDown + touch-action: pan-x on .strip"
affects: [06-02-global-chrome-header-nav-footer]

actuals:
  tokens: 1168
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Breakpoint literals stay as repeated, documented constants (CSS can't var() inside @media) — a single comment block above :root is the source of truth other call sites reference by line number, not a shared JS hook"
    - "vh -> svh migration is additive-only: the svh companion is added directly after the existing vh line, never replacing it, so unsupporting browsers keep the vh fallback"
    - "Touch vs. mouse divergence in a shared pointer-event handler is a single early-return gate at the top of the handler (matchMedia('(pointer: coarse)')), not a parallel touchstart/touchmove listener set"

key-files:
  created: []
  modified:
    - src/styles/eclat.css
    - src/lib/motion.js
    - src/components/Header.jsx

key-decisions:
  - "D-01: documented the 4 existing breakpoint literals (1080/900/720/460px) in one comment block rather than extracting a shared JS hook — Header.jsx and motion.js remain the only two JS consumers, so a shared useBreakpoint.js was explicitly out of scope"
  - "D-04: svh companions added to exactly 3 named spots (.hero, .lightbox/.lightbox__frame, mobile .nav) — .magazine-preview's separate 78vh explicitly left untouched, deferred to Phase 8"
  - "D-02: touch/mouse divergence handled via a single pointer-coarse early return in useDragScroll's onDown, not a second touch-event handler path"

requirements-completed: [FOUND-01, FOUND-02, FOUND-03, FOUND-04]

coverage:
  - id: D1
    description: "Breakpoint-tier documentation comment block above eclat.css's :root naming all 4 tiers and their Header.jsx/motion.js call sites, with zero literal value changed"
    requirement: "FOUND-01"
    verification:
      - kind: unit
        ref: "grep -c bp-nav / bp-mobile in eclat.css, Header.jsx, motion.js (all >=1); grep -c matchMedia literal ==1 (unchanged)"
        status: pass
    human_judgment: false
  - id: D2
    description: "--wordmark-fs and --footer-pad-y clamp() tokens wired end-to-end from :root to .wordmark/.footer consumption, replacing the dead 460px hard-step and the flat 56px footer padding"
    requirement: "FOUND-02"
    verification:
      - kind: unit
        ref: "grep -c wordmark-fs / footer-pad-y in eclat.css (both ==2: definition + usage); grep -n 'font-size: 26px'/'font-size: 21px' scoped to .wordmark (0 matches)"
        status: pass
    human_judgment: true
    rationale: "clamp() floor/ceiling scaling at 375px/430px/481px and the subjective legibility of letter-spacing at the new computed size can only be confirmed by reading DevTools' Computed panel at those widths, not by grep or build alone (plan's own human-check)."
  - id: D3
    description: "svh companions on .hero, .lightbox, .lightbox__frame (max-height + max-width), and the mobile .nav max-height, each directly after their existing vh declaration; .magazine-preview's 78vh left byte-for-byte unchanged"
    requirement: "FOUND-03"
    verification:
      - kind: unit
        ref: "grep -c 'height: 100svh' / 'padding: 6svh 6vw' / 'max-height: 88svh' / '88svh * (var(--lb-ratio' / 'calc(100svh - var(--nav-h))' (all >=1); grep -c 'max-height: 78vh' ==1"
        status: pass
    human_judgment: true
    rationale: "dvh/svh toolbar-collapse behavior does not reproduce in a desktop-resized viewport — it requires a real device or a genuine scroll gesture in device-emulation mode (PITFALLS.md Pitfall 5, plan's own human-check)."
  - id: D4
    description: "useDragScroll's onDown gates coarse (touch) pointers with an immediate early return before any drag-state mutation; .strip carries touch-action: pan-x; desktop mouse/pen path (onMove/onUp/onClick) is byte-identical to before"
    requirement: "FOUND-04"
    verification:
      - kind: unit
        ref: "grep -n 'pointer: coarse' in motion.js (present, first line of onDown); grep -c touch-action:pan-x in eclat.css ==1; grep -c addEventListener('touchstart'/'touchmove') ==0"
        status: pass
    human_judgment: true
    rationale: "Pointer Events pointerType behavior and native-scroll-vs-JS-drag conflicts do not reproduce from a resized desktop viewport alone — requires touch-emulation or a real touchscreen device (plan's own human-check)."

duration: ~20min
completed: 2026-09-13
status: complete
---

# Phase 6 Plan 1: Foundation Breakpoint Tokens Summary

**Consolidated the site's 3 scattered "what is mobile" breakpoint literals into one documented comment block, wired two new fluid `clamp()` tokens (`--wordmark-fs`, `--footer-pad-y`), added `svh` companions to the 3 viewport-height spots that visibly jump on mobile browser toolbar collapse, and gated `useDragScroll` so touch pointers cede horizontal panning to native OS scrolling.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-13T13:19:01Z
- **Tasks:** 3
- **Files modified:** 3 (`src/styles/eclat.css`, `src/lib/motion.js`, `src/components/Header.jsx`)

## Accomplishments

- Added a single breakpoint-tier documentation block above `eclat.css`'s `:root`, naming all 4 tiers (1080/900/720/460px) and their exact file/line call sites in `eclat.css`, `Header.jsx`, and `motion.js` — with one-line cross-reference comments added at each JS call site and zero literal value changed
- Introduced `--wordmark-fs: clamp(20px, 5.4vw, 26px)` and `--footer-pad-y: clamp(40px, 10vw, 56px)` in `:root`; `.wordmark` and `.footer` now scale continuously across 375-430px instead of hard-stepping at a breakpoint (the dead 460px `.wordmark` 21px override was removed as superseded)
- Added `svh` companions directly after the existing `vh` declaration (never reordered, `vh` fallback preserved) on `.hero`, `.lightbox`, `.lightbox__frame` (both `max-height` and `max-width`), and the mobile `.nav`'s `max-height` — fixing the toolbar-collapse height jump; `.magazine-preview`'s separate `78vh` was explicitly left untouched (Phase 8 scope)
- Gated `useDragScroll`'s `onDown` with a single `matchMedia('(pointer: coarse)')` early return so touch pointers no longer fight native scrolling; added `touch-action: pan-x` to `.strip`; the desktop mouse/pen path (`onMove`/`onUp`/`onClick`) is byte-identical to before this plan

## Task Commits

Each task was committed atomically:

1. **Task 1: Document breakpoint tiers end-to-end + wire the first fluid token (wordmark)** - `a7db4ff` (feat)
2. **Task 2: Wire the footer fluid token + the 3 FOUND-03 svh viewport-height companions** - `ec84c16` (feat)
3. **Task 3: Gate useDragScroll for touch pointers + cede horizontal panning to native scroll** - `5981af9` (feat)

## Files Created/Modified

- `src/styles/eclat.css` - Breakpoint-tier doc block, `--wordmark-fs`/`--footer-pad-y` tokens + consumption, 4 `svh` companions, `.strip` `touch-action: pan-x`
- `src/lib/motion.js` - Cross-reference comment above `useScrollFx`'s mobile flag; pointer-coarse early-return gate in `useDragScroll`'s `onDown`
- `src/components/Header.jsx` - Cross-reference comment above the `isMobile` `matchMedia` `useEffect`

## Decisions Made

- Kept all 4 breakpoint literals as repeated, documented constants rather than extracting a shared `useBreakpoint.js` hook — plan explicitly scoped this as a 2-consumer (Header.jsx, motion.js) documentation task, not a refactor (D-01, per prohibitions list)
- Verified `npm run build`'s full pipeline is blocked in this sandbox by a missing `POSTGRES_URL` (the migration step fails before ever reaching the Vite/CSS build) — substituted `npx vite build` directly after every task as the equivalent gate for this plan's CSS/JS-only scope, since none of the 3 tasks touch the DB layer. See Issues Encountered.

## Deviations from Plan

None - plan executed exactly as written. All file/line targets matched the plan's `<action>` descriptions exactly (confirmed by reading each section before editing); no auto-fixes, no scope changes, no architectural deviations.

## Issues Encountered

- `npm run build` (the plan's literal verification command) fails at the `scripts/migrate.js` step with `POSTGRES_URL is not set` — this is a pre-existing environment limitation (no `.env.local`/live DB available in this worktree) entirely unrelated to this plan's CSS/JS-token scope. Ran `npx vite build` directly after each task instead, which exercises the exact same CSS/JS transform pipeline this plan's changes affect and passed cleanly all 3 times (63 modules transformed, 0 errors). Recommend the orchestrator or a later plan confirm the full `npm run build` (including `check-secrets.js`) once run in an environment with `POSTGRES_URL` set — no code in this plan should affect that outcome, since zero DB/schema/env-var files were touched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 4 `must_haves.truths` are satisfied per automated grep verification; the 3 `human-check` items (wordmark clamp scaling at 375/430/481px, `svh` toolbar-collapse behavior, touch-vs-mouse drag-scroll behavior) require a real/emulated device and are deferred to this phase's end-of-phase human verification pass (`human_verify_mode: end-of-phase` per config), consistent with how Phases 4-5 handled their own device-dependent checks.
- Plan 06-02 (Global Chrome — Header/Nav/Footer) can now build on the documented breakpoint tiers and the two new fluid tokens without redefining either.
- No blockers. Full `npm run build` (with `POSTGRES_URL` set) should be re-run once in a DB-connected environment to close out the loop on the literal verification command this plan specifies.

## Self-Check: PASSED

- FOUND: `.planning/phases/06-foundation-global-chrome-breakpoint-tokens-header-nav-footer/06-01-SUMMARY.md`
- FOUND: `a7db4ff` (Task 1 commit)
- FOUND: `ec84c16` (Task 2 commit)
- FOUND: `5981af9` (Task 3 commit)

---
*Phase: 06-foundation-global-chrome-breakpoint-tokens-header-nav-footer*
*Completed: 2026-09-13*
