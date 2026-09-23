---
phase: 9
slug: content-pages-responsive-multi-device-grids
status: draft
shadcn_initialized: false
preset: none
created: 2026-09-23
---

# Phase 9 — UI Design Contract: Content Pages & Responsive Multi-Device Grids

> Visual, structural, and interaction design contract for reflowing content listing pages
> (Editions, Books, Writings, Archive) and editorial reading detail pages (Edition, Writing, Book detail)
> across all 4 canonical breakpoint tiers (Phone <=767px, Tablet 768–1023px, Desktop 1024–1439px, Ultrawide >=1440px).
> Covers requirements: **`GRID-01`**, **`GRID-02`**, **`GRID-03`**.

---

## 1. Design System & Constraints

| Property | Value |
|---|---|
| Styling Architecture | Vanilla CSS (`src/styles/eclat.css`) using fluid tokens (`--shell`, `--shell-pad`, `--gut`, `--fs-h1`..`--fs-body`) |
| Breakpoint Source | Canonical tiers in `src/lib/breakpoints.js` and `@media` queries in `eclat.css` |
| Component Framework | React 18, React Router v6 |
| Interaction Models | Native momentum scroll on touch; smooth pointer click-and-drag via `useDragScroll` on desktop |
| Reading Measure | Body text strictly capped at `max-width: 68ch` with fluid `line-height: 1.7` |
| Overflow Containment | Global `overflow-x: clip;` enforced at root containers |

---

## 2. Multi-Device Listing Grids Contract (GRID-01)

### 2.1 Content-Aware Grid Density Across Breakpoints

Listing grids must reflow based on content complexity — visual thumbnail covers (Archive) reflow to 2 columns on phones, whereas editorial cards with lengthy text descriptions and metadata (Books, Writings) stack to 1 column:

| Component / Grid | Phone (`<= 767px`) | Tablet (`768px – 1023px`) | Desktop (`1024px – 1439px`) | Ultrawide (`>= 1440px`) |
|---|---|---|---|---|
| **Archive Covers (`.grid-covers`)** | 2-column: `repeat(2, minmax(0, 1fr))`, gap: `24px 14px` | 3-column: `repeat(auto-fill, minmax(180px, 1fr))`, gap: `28px 20px` | 4-column: `repeat(auto-fill, minmax(230px, 1fr))`, gap: `36px 24px` | 4-column (max 1520px shell), gap: `44px 32px` |
| **Books Grid (`.books-grid`)** | 1-column: `1fr`, gap: `40px` | 2-column: `repeat(2, minmax(0, 1fr))`, gap: `36px 24px` | 3-column: `repeat(3, minmax(0, 1fr))`, gap: `44px 32px` | 4-column: `repeat(4, minmax(0, 1fr))`, gap: `48px 36px` |
| **Writings List (`.writings` / `.writing`)** | 1-column stacked: `minmax(0, 1fr)`, image max-width `100%`, gap: `32px` | 2-column list or structured row: `minmax(0, 1fr)` | 3-column / tabular row: `150px minmax(0, 1fr) 90px 110px`, gap: `48px 36px` | 4-column / wide tabular row capped to shell |
| **Shelf Grid (`.shelf__grid` / `.cards`)** | 1-column, gap: `32px` | 2-column, gap: `32px 24px` | 3-column, gap: `44px 32px` | 4-column, gap: `48px 36px` |

### 2.2 CSS Grid Rules in `eclat.css`

```css
/* Base Desktop (1024px+) */
.grid-covers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 36px 24px;
}

.books-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 44px 32px;
}

/* Tablet Reflow (768px – 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .grid-covers {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 28px 20px;
  }
  .books-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 36px 24px;
  }
}

/* Phone Reflow (<= 767px) */
@media (max-width: 767px) {
  .grid-covers {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 14px;
  }
  .books-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  .writing {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .writing > figure {
    max-width: 100%;
  }
  .writing__aside {
    grid-column: 1;
  }
}
```

---

## 3. Horizontal Media Strips Contract (GRID-02)

### 3.1 Strip Interaction & Performance Model
Horizontal media strips (`.strip`) used for Cultural Icons and Videos on Home and Archive pages must provide smooth continuous scrolling without interfering with vertical page momentum:

- **Touch Screens (Mobile & Tablet):**
  - Native momentum scrolling enabled with `touch-action: pan-x;` and `overscroll-behavior-x: contain;`.
  - Native browser momentum on iOS (`-webkit-overflow-scrolling: touch;`).
  - Native scrollbar hidden with `scrollbar-width: none;` and `&::-webkit-scrollbar { display: none; }`.
- **Desktop (Pointer devices):**
  - Managed by `useDragScroll(stripRef)` in `src/lib/motion.js`.
  - Cursor states: `cursor: grab;` when hovering over the strip, switching to `cursor: grabbing;` during active drag.
  - Drag velocity clamping to prevent overshoot.

### 3.2 Luxury Edge Fade Masks
To visually signal that content extends beyond screen edges without clunky scrollbars, strips will feature luxury gradient masks:

```css
.strip-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.strip-wrap--masked {
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0px,
    black clamp(16px, 4vw, 36px),
    black calc(100% - clamp(16px, 4vw, 36px)),
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0px,
    black clamp(16px, 4vw, 36px),
    black calc(100% - clamp(16px, 4vw, 36px)),
    transparent 100%
  );
}

.strip {
  display: flex;
  gap: var(--gut);
  overflow-x: auto;
  scroll-behavior: smooth;
  touch-action: pan-x;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.strip::-webkit-scrollbar {
  display: none;
}
```

---

## 4. Editorial Detail Pages Contract (GRID-03)

### 4.1 Layout Spread Architecture
Editorial detail pages (`src/routes/Edition.jsx`, `src/routes/Writing.jsx`, and Book previews) must deliver a print-magazine aesthetic on desktop and a clean, comfortable reading experience on narrow screens.

#### 1. Edition Detail (`.ed-hero__grid`)
- **Desktop (`>= 1024px`):**
  - 2-column asymmetric layout: `grid-template-columns: minmax(0, 360px) minmax(0, 1fr); gap: 64px; align-items: end;`.
  - Cover plate: generous dimensions with shadow depth (`0 40px 80px rgba(0, 0, 0, 0.5)`).
- **Tablet & Phone (`< 1024px`):**
  - Harmonize media query from `900px` to canonical `1023px` (`@media (max-width: 1023px)`).
  - Single-column stacked: `grid-template-columns: minmax(0, 1fr); gap: 36px;`.
  - Cover plate centered with constrained max-width (`max-width: 280px; margin: 0 auto;`).
  - Text typography scales with `--fs-h1` and `--fs-lede`.

#### 2. Writing Detail (`Writing.jsx` & `.prose`)
- **Desktop (`>= 1024px`):**
  - Editorial hero image with max-height constraint (`max-height: 540px; object-fit: cover;`).
  - Centered reading column with strict typographical measure: `max-width: 68ch; margin: 0 auto;`.
- **Phone & Tablet (`< 1024px`):**
  - Full-width hero image with aspect ratio preservation (`aspect-ratio: 3/2`).
  - Reading body: `padding: 0 var(--shell-pad); font-size: var(--fs-body); line-height: 1.75;`.
  - Opening dropcap / lead paragraph (`.prose__open`): font-size scales to `clamp(18px, 2.4vw, 22px)`.

### 4.2 Typographical Hierarchy & Reading Invariants
- Body measure: Never exceed `68ch` (~65-75 characters per line for optimal reading ergonomics).
- Line height: `1.75` for body prose, `1.1` for display titles.
- Pull quotes (`.quote`, `blockquote`):
  - Desktop: Indented with subtle accent border or italic serif (`font-family: var(--serif); font-size: var(--fs-title);`).
  - Phone: Full width with 16px inline padding, preventing horizontal clipping.

---

## 5. Cross-Device Visual Verification Matrix

| Viewport Tier | Width × Height | Reference Device | Invariant Checked |
|---|---|---|---|
| **Compact Phone** | 375px × 667px | iPhone SE | Archive shows 2-col covers; Books/Writings 1-col; zero horizontal scroll; strip touch-scrollable with edge fade. |
| **Modern Phone** | 430px × 932px | iPhone 16 Pro Max | Optimal gutter padding (`--shell-pad: 16px`); Edition detail cover centered (max 280px); Writing text comfortable at `68ch`. |
| **Tablet Portrait** | 768px × 1024px | iPad Mini | Clean 2-col book & writing cards; Edition hero stacked without clipping; strip smoothly draggable. |
| **Tablet Landscape / Desktop** | 1024px × 768px | iPad Pro / Laptop | Desktop 2-column asymmetric edition spread activated; 3-col book and writings grids; sticky cover functional. |
| **Standard Desktop** | 1440px × 900px | MacBook Pro | Expansive 3-col/4-col grids; full typography scale; grab cursor active on strips. |
| **Ultrawide** | 2560px × 1440px | 4K Monitor | All content cleanly centered and bounded inside `--shell: min(100%, 1520px);` auto-margins; zero card stretching. |

---

## 6. Downstream Planning Handoff

This UI design contract is immediately ready for consumption by `/gsd-plan-phase 9`:
- **Phase 9 Plans:**
  - `09-01-PLAN.md`: Standardize listing grids across Archive, Books, and Writings (content-aware 1-col/2-col/3-col/4-col reflow, `--shell-pad` alignment).
  - `09-02-PLAN.md`: Enhance horizontal media strips (`.strip-wrap`, touch pan-x, desktop grab cursor, gradient fade masks) and reflow editorial reading detail pages (`Edition.jsx`, `Writing.jsx`, `.ed-hero__grid`, `max-width: 68ch`).
