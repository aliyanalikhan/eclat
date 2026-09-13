---
phase: 06-foundation-global-chrome-breakpoint-tokens-header-nav-footer
plan: 03
subsystem: ui
tags: [css, react, header, nav, responsive, documentation]

# Dependency graph
requires:
  - phase: 06-01
    provides: breakpoint-tier doc block, fluid clamp() tokens, svh companions, pointer-coarse gating
  - phase: 06-02
    provides: header/nav/footer safe-area insets, 44px tap targets, auth-aware header cross-reference comments
provides:
  - CSS-default-closed mobile nav (.nav defaults to display:none at <=900px; .nav.is-open overrides to display:flex)
  - Header.jsx <nav> className now additive is-open toggle instead of a bare "nav" literal
  - Grep-able bp:tablet/bp:nav/bp:mobile/bp:phone anchor comments replacing stale line-number citations in the breakpoint-tier doc block
affects: [phase-06-verification, future-nav-visual-work]

# Actuals (#2632)
actuals:
  tokens: 1200
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS-default-closed pattern: a JS-toggled class (.is-open) provides the 'open' override on top of a CSS default that is safe at every render stage (SSR, pre-hydration, post-hydration), rather than relying on a client-computed attribute (hidden) as the sole closed-state mechanism."
    - "Grep-able anchor comments (bp:tablet/bp:nav/bp:mobile/bp:phone) instead of numeric line citations in cross-file documentation blocks, so citations cannot go stale from unrelated edits."

key-files:
  created: []
  modified:
    - src/styles/eclat.css
    - src/components/Header.jsx
    - src/lib/motion.js

key-decisions:
  - "Implemented the anchor-comment alternative for WR-01 (not corrected line numbers) per the plan's own instruction, since Task 1's edit in this same plan would have immediately re-staled any hardcoded number."
  - "Left .nav[hidden] { display: none; } untouched — redundant post-hydration but harmless, per the plan's explicit prohibition against removing it."

patterns-established:
  - "CSS-default-closed nav pattern (display:none default + .is-open override) for any future mobile-nav-shaped UI needing a safe pre-hydration state."

requirements-completed: [FOUND-01, CHROME-01]

coverage:
  - id: D1
    description: "Mobile nav defaults closed at every render stage (SSR, pre-hydration paint, post-hydration) via a CSS-only display:none default plus an additive .is-open override class; Header.jsx's hidden={navHidden}, isMobile/open state, matchMedia effect, and all auth-slot JSX/handlers are unchanged (CR-01 fix)."
    requirement: "CHROME-01"
    verification:
      - kind: unit
        ref: "grep assertions: exactly one display:none inside the mobile .nav rule, exactly one .nav.is-open{display:flex;} rule, .nav[hidden] unchanged, Header.jsx diff is exactly one line (git diff --numstat)"
        status: pass
      - kind: integration
        ref: "rebuilt SSR bundle (vite build --ssr src/entry-server.jsx) + node render('/') — emitted <nav> tag carries neither hidden nor is-open, which the new CSS default now correctly interprets as CLOSED"
        status: pass
      - kind: other
        ref: "npx vite build (full production build)"
        status: pass
    human_judgment: true
    rationale: "The plan's own <human-check> requires confirming the actual browser paint (DevTools 'Disable JavaScript' at <=900px) matches the CSS-cascade reasoning — automated grep/SSR-string checks confirm markup/CSS shape but not the final rendered/painted result."
  - id: D2
    description: "Breakpoint-tier doc block's 6 stale numeric line citations replaced with grep-able bp:tablet/bp:nav/bp:mobile/bp:phone anchor comments, with matching inline anchors at each of the 4 @media call sites, the Header.jsx matchMedia call, and the motion.js window.innerWidth < 720 call."
    requirement: "FOUND-01"
    verification:
      - kind: unit
        ref: "grep counts: bp:tablet/bp:nav/bp:mobile/bp:phone each appear >=2x in eclat.css; bp:nav appears exactly once in Header.jsx; bp:mobile appears exactly once in motion.js; all 6 stale numeric citations (eclat.css:1996/2006/2094/2178, Header.jsx:38, motion.js:76) are gone"
        status: pass
      - kind: other
        ref: "npx vite build"
        status: pass
    human_judgment: false

# Metrics
duration: ~10min
completed: 2026-09-13
status: complete
---

# Phase 6 Plan 03: Gap Closure — Mobile Nav Default-Closed Fix & Breakpoint Doc Anchors Summary

**Mobile nav now defaults closed at every render stage via a CSS-only display:none + is-open override (fixing the SSR/pre-hydration open-nav flash), and the breakpoint-tier doc block's stale line-number citations are replaced with drift-immune grep-able anchor comments.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2
- **Files modified:** 3 (`src/styles/eclat.css`, `src/components/Header.jsx`, `src/lib/motion.js`)

## Accomplishments
- Closed CR-01: the mobile `<nav>` at `<=900px` now defaults to `display: none`, with a new `.nav.is-open { display: flex; }` override activated only when the user's own click sets React's `open` state to `true` — closed is now the safe default at SSR, pre-hydration paint, and post-hydration alike, eliminating the full-width open-nav flash the verifier found on every mobile first paint.
- Closed WR-01: the breakpoint-tier doc block's 6 stale numeric line citations (off by 18-31 lines even before this plan's own edits) are replaced with grep-able `bp:tablet`/`bp:nav`/`bp:mobile`/`bp:phone` anchor comments, with matching inline anchors added at all 4 `@media` call sites, the actual Header.jsx `matchMedia` call, and the actual motion.js `window.innerWidth < 720` call.
- Verified via rebuilt SSR bundle + direct `render('/')` call (the same method the verifier used) that the emitted `<nav>` markup — unchanged in shape (no `hidden`/`is-open` attributes) — is now correctly interpreted as CLOSED by the new CSS default, rather than the pre-fix full-width open dropdown.
- Zero changes to `isMobile`/`open` state initialization, the `matchMedia` `useEffect` body, `navHidden`'s computation, or any auth-slot JSX/handler — confirmed by `git diff --numstat` showing Header.jsx's total diff across both tasks is exactly 2 changed lines.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix CR-01 — CSS-default-closed mobile nav** - `e04d21e` (fix)
2. **Task 2: Fix WR-01 — replace stale line citations with grep-able anchors** - `2d002bb` (docs)

## Files Created/Modified
- `src/styles/eclat.css` - Added `display: none;` default (with explanatory comment) as the mobile `.nav` rule's first declaration, plus a new `.nav.is-open { display: flex; }` rule; replaced the breakpoint-tier doc block's 6 numeric line citations with `bp:tablet`/`bp:nav`/`bp:mobile`/`bp:phone` anchor tags and added matching inline anchor comments at each of the 4 `@media` call sites.
- `src/components/Header.jsx` - `<nav>` tag's `className` changed from the literal `"nav"` to a template literal appending `' is-open'` when `open` is `true`; added a trailing `// bp:nav` anchor comment on the actual `matchMedia('(max-width: 900px)')` call line.
- `src/lib/motion.js` - Added a trailing `// bp:mobile` anchor comment on the actual `window.innerWidth < 720` line; no logic change.

## Decisions Made
- Implemented the anchor-comment alternative (not corrected line numbers) for WR-01, since Task 1's own CSS edit in this same plan shifts every subsequent line number — a hardcoded number would have gone stale immediately.
- Left `.nav[hidden] { display: none; }` byte-for-byte unchanged per the plan's explicit prohibition — it remains a harmless, now-redundant reinforcement of the closed state once JS hydrates.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their `<action>` and `<acceptance_criteria>` sections precisely; all automated `<verify>` checks passed on first attempt.

## Issues Encountered

The worktree was forked from a base predating master's phase-06 work (06-01/06-02/06-03 plan/summary files, and the eclat.css/Header.jsx changes those plans made, were absent). Per the orchestrator's own instructions for this scenario, ran `git merge master --ff-only` before starting any task, which fast-forwarded cleanly with no conflicts.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both verifier-confirmed gaps from `06-VERIFICATION.md` (CR-01, CHROME-01's "opens/closes correctly" clause; WR-01, FOUND-01's "exact call sites" clause) are closed.
- `npx vite build` exits 0 after both tasks; SSR bundle rebuild + `render('/')` confirms the nav markup is now correctly interpreted as closed by the new CSS default.
- Remaining human-check items (real-browser paint confirmation with JS disabled; manual grep confirmation that each anchor lands on its real call-site line) are listed in this plan's `<verify><human-check>` blocks and are appropriate for a human/UAT pass, not blocking further automated work.
- WR-02 (stale `useScrollFx` mobile flag on resize), WR-03 (device-level vs per-event pointer-coarse gating), and IN-01 (UTF-16 name truncation) remain explicitly out of scope for this gap-closure plan, as documented in 06-REVIEW.md and this plan's own prohibitions.

---
*Phase: 06-foundation-global-chrome-breakpoint-tokens-header-nav-footer*
*Completed: 2026-09-13*
