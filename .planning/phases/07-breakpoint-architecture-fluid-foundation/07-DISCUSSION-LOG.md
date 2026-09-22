# Phase 7 Discussion Log: Breakpoint Architecture & Fluid Foundation

**Date:** 2026-09-23
**Phase:** 07
**Participants:** User & Assistant

## Discussion Points & Decisions

### 1. Breakpoint Architecture & JS Synchronization
- **Question:** How should JavaScript (motion, header nav) synchronize with CSS media queries?
- **Choice:** Shared JS helper module (`src/lib/breakpoints.js`) with `matchMedia` listeners matching CSS media queries exactly.
- **Rationale:** Prevents drift between CSS `@media` rules and runtime JS checks (`Header.jsx`, `motion.js`), ensuring unified breakpoint boundaries.

### 2. Layout & Container Widths on Ultra-Wide Monitors (>1440px)
- **Question:** On ultra-wide desktop monitors (>1440px), how should the layout behave?
- **Choice:** Generous capped max-width (~1440px–1600px) centered with fluid margins on ultra-wide screens.
- **Rationale:** Preserves the luxury editorial reading experience, prevents over-stretched body lines and card grids, while backgrounds remain full-bleed.

### 3. Horizontal Overflow Strategy
- **Question:** How should root-level horizontal overflow prevention be enforced?
- **Choice:** Apply modern `overflow-x: clip` / defensive bounding on root & main to preserve sticky/fixed elements without side-scroll.
- **Rationale:** `overflow-x: clip` prevents horizontal scrolling and iOS rubber-band artifacting without establishing an unwanted scroll container that breaks `position: sticky`.

## Outcome
All decisions locked and recorded in `07-CONTEXT.md`. Ready to plan Phase 7.
