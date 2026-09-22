---
phase: 08-hero-animation-multi-device-adaptation
plan: 01
subsystem: motion
tags: [motion, animation, hero, raf, responsive, reduced-motion]

# Dependency graph
requires: [07-01-breakpoint-architecture, 07-02-fluid-foundation]
provides:
  - "Multi-device adaptive useScrollFx solver in src/lib/motion.js"
  - "Responsive card fit multiplier, rotation dampening (rotFactor), and translation clamping (bound)"
  - "Adaptive scroll travel distance (vh * 0.48 on phone, vh * 0.54 on tablet, vh * 0.62 on desktop)"
  - "Synchronized title veil opacity and hero headline drift"
  - "Accessible prefers-reduced-motion single settled pass with immediate title visibility"
affects: [08-02-css-hero-refactor]

actuals:
  tasks: 2
  status: complete

key-files:
  created: []
  modified:
    - src/lib/motion.js

key-decisions:
  - "D-01: Removed mobile suppression check (!mobile) in useScrollFx so the 5-card fan carousel animates on all screen widths"
  - "D-02: Scaled fit factor (0.55 max on phone), rotFactor (0.65 on phone, 0.85 on tablet), and translation bound to keep all 5 cards visible and unclipped on narrow viewports"
  - "D-03: Tuned scroll distance to vh * 0.48 on phone so fan completes opening in a natural swipe gesture"
  - "D-06: Hardened reduced-motion mode to execute a single static settled pass, show titles at opacity 1, and attach zero scroll listeners"

requirements-completed: [HERO-01, HERO-02, HERO-03, HERO-04]
---

# Plan 08-01 Summary: Motion Engine & Responsive Solver

## What Changed
1. **Refactored `useScrollFx` in `src/lib/motion.js`**:
   - Removed the `!mobile` bypass condition so mobile viewports animate the 5-card fan carousel.
   - Added responsive viewport tier detection (`isPhone = vw <= 767`, `isTablet = vw > 767 && vw <= 1023`).
   - Implemented dynamic horizontal spread `fit`: phone scales up to 0.55 max (`(vw - 32) / 720`), preventing off-screen spread on narrow widths.
   - Added `rotFactor`: dampened rotation on phones to `0.65` and tablets to `0.85` so cards don't collide or intersect viewport borders.
   - Dynamic translation bound: clamped card horizontal offset within `Math.max(80, vw / 2 - (isPhone ? 28 : 120))`.
   - Adaptive vertical band solver: adjusted `bandTop`, `bandBottom`, and minimum height (`160px`) to prevent fan collision with the hero headline on compact screens.
   - Adaptive scroll travel distance: calibrated to `vh * 0.48` on phone, `vh * 0.54` on tablet, and `vh * 0.62` on desktop.
   - Hero copy drift & fade: calibrated drift to 24px and fade multiplier to 1.6 on phones for clean legibility.

2. **Hardened Reduced-Motion Accessibility (`HERO-04`)**:
   - `prefers-reduced-motion: reduce` triggers a single settled pass `tick(true)`.
   - All side card titles (`titles`) immediately receive `opacity: 1`.
   - Copy and CTA buttons settle cleanly to `transform: none` and `opacity: 1`.
   - Zero scroll event listeners or rAF animation loops are registered.

## Verification
- Client bundle, SSR bundle, and prerender of all 12 routes succeeded cleanly with exit code 0.
- Secret check passed (`no leaked secrets found in dist/`).
- Requirements `HERO-01`, `HERO-02`, `HERO-03`, `HERO-04` logic implemented in `src/lib/motion.js`.
