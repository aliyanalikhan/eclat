# Phase 9: Content Pages & Responsive Multi-Device Grids - Context

**Gathered:** 2026-09-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 reflows all content listing pages (Editions, Books, Writings, Archive) and editorial reading detail pages (Edition, Writing, Book detail) across the canonical 4-tier breakpoint system (Phone <=767px, Tablet 768–1023px, Desktop 1024–1439px, Ultrawide >=1440px):
- Implement content-aware grid density across all 4 tiers without horizontal page overflow.
- Optimize horizontal strips (Cultural Icons, Videos) for dual touch-pan and pointer grab-drag with gradient scroll masks.
- Adapt editorial reading layouts to preserve luxury typography, optimal line-lengths (`max-width: 68ch`), and proportional media scaling.

Requirements covered: `GRID-01`, `GRID-02`, `GRID-03`.
</domain>

<decisions>
## Implementation Decisions

### Multi-Device Listing Grids (GRID-01)
- **D-01:** Implement content-aware responsive grid density:
  - **Phone (<=767px):**
    - 1-column for rich editorial cards with excerpts and metadata (`.writings-grid`, `.books-grid`).
    - 2-column compact grid for visual cover thumbnails (`.grid-covers` on Archive & Editions).
  - **Tablet (768–1023px):** 2-column balanced layouts across all listing grids.
  - **Desktop (1024–1439px):** 3-column editorial grid.
  - **Ultrawide (>=1440px):** 4-column capped grid within the container shell (`min(100%, 1520px)`), with generous luxury whitespace.
- **D-02:** Enforce container padding and gutters using Phase 7 fluid tokens (`--shell-pad`, `--gut`) so cards never touch viewport edges on mobile or stretch disproportionately on ultrawide displays.

### Horizontal Media Strips (GRID-02)
- **D-03:** Provide dual-mode interaction for `.strip` components:
  - **Touch Devices (Phone/Tablet):** Native momentum scrolling (`touch-action: pan-x; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain;`) with hidden scrollbars.
  - **Desktop:** Interactive pointer click-and-drag with visual grab cursor (`cursor: grab / grabbing`) managed by `useDragScroll` in `src/lib/motion.js`.
- **D-04:** Add subtle gradient edge fade masks (CSS `mask-image` or pseudo-element overlays) to gracefully signal to users that more content exists off-screen.

### Editorial Detail Pages (GRID-03)
- **D-05:** Layout reflow for detail pages (`Edition.jsx`, `Writing.jsx`, `Book.jsx`):
  - **Desktop (>=1024px):** 2-column editorial spread with sticky left column for book/edition cover or metadata, and primary reading content on the right.
  - **Phone & Tablet Portrait (<1024px):** Collapses into a clean, stacked single-column layout with centered or proportional media header.
- **D-06:** Reading column constraints:
  - Enforce optimal typographical measure (`max-width: 68ch`) on article body paragraphs.
  - Ensure images, tables, blockquotes, and pulled quotes adapt fluidly within the reading container with zero side-spill.

### Builder's Discretion
- Exact card gap spacing tokens across intermediate tablet sizes.
- Fine-tuning cover thumbnail aspect ratios on compact phone grids to preserve title plate legibility.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing:**

- `.planning/PROJECT.md` — Core Value & Milestone v1.2 scope
- `.planning/REQUIREMENTS.md` — Requirements `GRID-01`, `GRID-02`, `GRID-03`
- `.planning/ROADMAP.md` — Phase 9 scope, goals, and success criteria
- `src/lib/breakpoints.js` — Canonical `QUERIES`, `BREAKPOINTS`, and `useBreakpoint()`
- `src/styles/eclat.css` — `.grid-covers`, `.books-grid`, `.writings-grid`, `.archive-grid`, `.strip` rules
- `src/routes/Editions.jsx`, `src/routes/Edition.jsx` — Magazine edition listing and detail
- `src/routes/Books.jsx`, `src/routes/Book.jsx` — Books listing and detail
- `src/routes/Writings.jsx`, `src/routes/Writing.jsx` — Writings listing and detail
- `src/routes/Archive.jsx` — Magazine archive catalog
- `src/lib/motion.js` — `useDragScroll` hook
</canonical_refs>

<code_context>
## Codebase Context

### Existing Grid Classes in `src/styles/eclat.css`
- Lines 1265-1275: `.grid-covers` (Archive & Editions)
- Lines 1085-1100: Book shelf cards
- Lines 1590-1615: Writings cards and lists
- Lines 835-865: `.strip` container and scroll items
- Lines 2285-2345: Existing mobile media overrides to be standardized
</code_context>

<deferred>
## Deferred Ideas

- **DYN-01 (v2):** Physics-based drag-throw / inertia for mobile flipbook pages.
- **OVERLAY-01..03 (Phase 10):** Flipbook modal and Lightbox zoom responsiveness.
</deferred>
