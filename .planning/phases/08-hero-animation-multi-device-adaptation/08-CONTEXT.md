# Phase 8: Hero Animation Multi-Device Adaptation - Context

**Gathered:** 2026-09-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 adapts the signature scroll-driven fan carousel animation in `useScrollFx` and `Home.jsx` to scale, fit, and animate gracefully across all screen sizes (phone, tablet, desktop, ultrawide):
- Preserve the exact motion physics and visual identity of the fan spread that the user confirmed ("animation should stay same like current animation").
- Remove mobile suppression (`display: none` and `mobile` bypass) so phone users experience the animated fan scaled proportionally to their screen.
- Dynamically calculate bounding, card scale, and spread angles to prevent side clipping or overflow on any display.
- Introduce a subtle luxury entrance reveal on initial page load.
- Maintain strict adherence to `prefers-reduced-motion: reduce`.

Requirements covered: `HERO-01`, `HERO-02`, `HERO-03`, `HERO-04`.
</domain>

<decisions>
## Implementation Decisions

### Adaptive Scaled Fan on Mobile (HERO-01, HERO-02)
- **D-01:** Remove the hard suppression (`display: none` on `.fan-origin .fan-card` in `@media (max-width: 767px)`) and the JS `if (cards.length && !mobile)` check that disabled the fan on phones.
- **D-02:** Implement responsive fan geometry calculation in `useScrollFx`:
  - On viewports < 768px (Phone), scale the card spread factor (`fit = Math.min(1, (window.innerWidth - 32) / 600)`) and card size (`scale ~0.60–0.70`).
  - Constrain horizontal translation `x` within `window.innerWidth / 2 - 80px` and scale rotation `r` to `fr * 0.65` so cards fan out smoothly without colliding or extending beyond screen margins.
  - On tablet (768–1023px) and desktop (1024px+), maintain full spread width with dynamic scale fitting.

### Responsive Scroll Distance (HERO-02, HERO-03)
- **D-03:** Drive the fan opening progress `raw` over `vh * 0.50` (using dynamic viewport height) so the fan opens smoothly within an organic scroll gesture on both mobile touch devices and desktop mousewheels without requiring excessive downward scrolling.
- **D-04:** Synchronize side-card title veil opacity (`fade-in`) and hero headline copy fade with the dynamic progress `p`.

### Initial Load Luxury Reveal (HERO-01)
- **D-05:** Apply a subtle luxury entrance animation on initial mount:
  - Hero header copy and fan resting cards smoothly fade and settle into resting position on first render (`opacity: 0 -> 1`, `translateY: 14px -> 0px` with a 0.6s smooth bezier).
  - Resting spread `P_REST` renders immediately so SSR/prerendered HTML presents a balanced composition before scroll begins.

### Reduced Motion Accessibility (HERO-04)
- **D-06:** Under `prefers-reduced-motion: reduce`, disable scroll-driven transformations and initial entrance delays:
  - Execute a single settled pass that lays out the fan in a static, balanced resting state.
  - Side card titles render with `opacity: 1` immediately.
  - Zero transform jumps or scroll listener overhead.

### Builder's Discretion
- Fine-tuning the exact multiplier for `fit` on intermediate tablet sizes (768px–1024px).
- Card shadow depth adjustments on smaller scales to maintain clean contrast.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing:**

- `.planning/PROJECT.md` — Core Value & Milestone v1.2 scope
- `.planning/REQUIREMENTS.md` — Requirements `HERO-01`, `HERO-02`, `HERO-03`, `HERO-04`
- `.planning/ROADMAP.md` — Phase 8 scope, goals, and success criteria
- `src/lib/breakpoints.js` — Canonical `QUERIES`, `BREAKPOINTS`, and `isPhone()`
- `src/lib/motion.js` — `useScrollFx` requestAnimationFrame loop and geometry solver
- `src/routes/Home.jsx` — `FAN_SLOTS`, `buildFan()`, and hero JSX structure
- `src/styles/eclat.css` — `.hero`, `.fan-origin`, `.fan-card`, `.fan-card--lead` CSS
</canonical_refs>

<code_context>
## Codebase Context

### Existing Fan Architecture
- `src/routes/Home.jsx:16-22`: `FAN_SLOTS` with `fx`, `fy`, `fr` coordinate offsets.
- `src/lib/motion.js:73-190`: `useScrollFx(key)` rAF loop solving scale `s`, origin `top`, translation `x, y`, rotation `r`, and opacity veils.
- `src/styles/eclat.css:531-569`: `.fan-origin`, `.fan-card`, `.fan-card--lead` styles.
- `src/styles/eclat.css:2233-2259`: Previous mobile override hiding side cards (`display: none;`) to be refactored into the adaptive scaled spread.
</code_context>

<deferred>
## Deferred Ideas

- **DYN-02 (v2)**: Interactive 3D tilt effects on desktop edition cards based on cursor position.
- **GRID-01..03 (Phase 9)**: Listing grids reflow on content pages.
</deferred>
