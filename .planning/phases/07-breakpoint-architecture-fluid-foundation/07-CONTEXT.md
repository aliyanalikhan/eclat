# Phase 7: Breakpoint Architecture & Fluid Foundation - Context

**Gathered:** 2026-09-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 establishes the comprehensive responsive foundation for Milestone v1.2:
- A unified 4-tier responsive breakpoint architecture:
  - Phone / Mobile: `< 768px`
  - Tablet: `768px – 1024px`
  - Desktop: `1024px – 1440px`
  - Ultrawide: `> 1440px`
- Fluid typography and spacing tokens using `clamp()`
- Site-wide zero-horizontal-overflow guarantee on all viewports from 320px to 4K+ displays

Requirements covered: `RESP-01`, `RESP-02`, `RESP-03`.
Phase 7 does not modify the internal fan scroll physics (Phase 8), content page card grids (Phase 9), or modal overlays (Phase 10), but provides the foundational tokens and JS/CSS architecture they all build upon.
</domain>

<decisions>
## Implementation Decisions

### Breakpoint Synchronization (RESP-01)
- **D-01:** Create a single canonical JavaScript helper `src/lib/breakpoints.js` that exports reactive `matchMedia` queries and breakpoint constants matching CSS media queries exactly:
  - `PHONE`: `(max-width: 767px)`
  - `TABLET`: `(min-width: 768px) and (max-width: 1023px)`
  - `DESKTOP`: `(min-width: 1024px) and (max-width: 1439px)`
  - `ULTRAWIDE`: `(min-width: 1440px)`
  Existing ad-hoc checks in `Header.jsx` (`max-width: 900px`) and `motion.js` (`window.innerWidth < 720`) will be migrated to reference these canonical queries.

### Ultrawide Layout & Container Sizing (RESP-02)
- **D-02:** On large and ultrawide screens (>1440px, up to 4K), cap the primary content shell (`--shell`) at a maximum of `1440px`–`1600px` and center with fluid automatic margins. This avoids unnaturally stretched line-lengths and preserves the luxury editorial balance of Éclat's Bodoni typography while allowing background washes and bands to remain full-bleed.

### Horizontal Overflow Containment (RESP-03)
- **D-03:** Enforce root-level horizontal overflow prevention using modern `overflow-x: clip` on `#root` and `<main>`/page containers. Unlike `overflow-x: hidden`, `overflow-x: clip` eliminates accidental horizontal scrollbars and mobile side-swiping rubber-band artifacts without creating an unwanted scroll container that breaks `position: sticky` on the header or modals.

### Fluid Typography & Spacing Scale (RESP-02)
- **D-04:** Introduce standardized CSS `clamp()` tokens in `:root` of `eclat.css`:
  - `--fs-h1`: fluid scaling from mobile (~36px) to desktop/ultrawide (~72px)
  - `--fs-lede`: fluid scaling from mobile (~18px) to desktop (~24px)
  - `--shell-pad`: fluid horizontal page padding (`clamp(16px, 4vw, 48px)`)
  - Keep typographic hierarchy strictly anchored to `--serif` (Bodoni Moda) and `--sans` (Archivo).

### Builder's Discretion
- Exact clamp curve math for intermediate heading levels (`h2`, `h3`, wordmark) to preserve line-height readability across viewports.
- Selection of subtle helper classes or CSS custom property aliases for backwards-compatibility with existing styles.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing:**

- `.planning/PROJECT.md` — Core Value & Milestone v1.2 scope
- `.planning/REQUIREMENTS.md` — Requirements `RESP-01`, `RESP-02`, `RESP-03`
- `.planning/ROADMAP.md` — Phase 7 scope, goals, and success criteria
- `src/styles/eclat.css` — `:root` token declarations and media query blocks
- `src/components/Header.jsx` — Existing navigation media query listener
- `src/lib/motion.js` — Existing viewport measurement & scroll effect listeners
</canonical_refs>

<code_context>
## Codebase Context

### Breakpoint Call Sites to Unify
- `src/styles/eclat.css:16-21`: Breakpoint tier comment block documenting previous literal breakpoints (1080px, 900px, 720px, 460px)
- `src/styles/eclat.css:2102-2324`: Media query blocks for tablet, nav, mobile, and phone
- `src/components/Header.jsx:13`: `matchMedia('(max-width: 900px)')`
- `src/lib/motion.js:77`: `const mobile = window.innerWidth < 720`

### Reusable Assets
- `src/styles/eclat.css`: `:root` token architecture (lines 25-56) ready for new fluid `clamp()` tokens
- React hooks pattern in `src/lib/`: `useScrolled`, `useReducedMotion`
</code_context>

<deferred>
## Deferred Ideas

- **GRID-01..03 (Phase 9)**: Specific per-page card grid reflows (Archive, Books, Writings, Editions).
- **HERO-01..04 (Phase 8)**: Adaptive fan spread geometry and multi-device scroll animation.
- **OVERLAY-01..03 (Phase 10)**: Flipbook modal responsive scaling and Lightbox viewport bounds.
</deferred>
