---
phase: 7
slug: breakpoint-architecture-fluid-foundation
status: draft
shadcn_initialized: false
preset: none
created: 2026-09-23
---

# Phase 7 — UI Design Contract: Breakpoint Architecture & Fluid Foundation

> Visual, structural, and interaction design contract for Breakpoint Architecture & Fluid Foundation.
> This phase establishes the unified multi-tier responsive foundation, fluid typographic scales,
> and root-level zero-horizontal-overflow containment for Milestone v1.2 (All-Screen Responsive & Hero Animation).
> Covers requirements: **`RESP-01`**, **`RESP-02`**, **`RESP-03`**.

---

## 1. Design System & Constraints

| Property | Value |
|---|---|
| Framework / Styling | Vanilla CSS (`src/styles/eclat.css`), CSS Custom Properties in `:root` |
| Component library | None — Hand-authored BEM-style classes |
| Typography | `--serif`: `'Bodoni Moda', Georgia, serif` (display/headings), `--sans`: `Archivo, sans-serif` (body/UI), `--narrow`: `'Archivo Narrow', sans-serif` |
| Color System | Luxury warm editorial palette (`--bg: #f7f3ec`, `--paper: #fffdf8`, `--ink: #16130f`, `--accent: oklch(...)`) |
| Breakpoint System | Unified 4-tier model (Phone, Tablet, Desktop, Ultrawide) synchronized between CSS and JS |
| Zero-Overflow Tool | Modern `overflow-x: clip` on `#root` and `<main>` containers |

**Framework Gate:** No CSS frameworks (Tailwind, Bootstrap) or CSS-in-JS preprocessors are permitted. All adjustments build directly upon `eclat.css` and native browser capabilities.

---

## 2. Breakpoint Architecture Contract (RESP-01)

### 2.1 The Canonical 4-Tier Breakpoint Model

Replaces previous fragmented literals (`1080px`, `900px`, `720px`, `460px`) with a single coherent hierarchy across all devices:

| Tier | Range | Viewport Target | Primary Structural Reflow |
|---|---|---|---|
| **Phone** | `<= 767px` | Mobile phones (portrait & compact) | Single-column cards, hamburger nav drawer, touch-first padding |
| **Tablet** | `768px – 1023px` | Tablets (portrait/landscape), large foldables | 2-column grids, collapsed or hybrid nav, balanced reading line-length |
| **Desktop** | `1024px – 1439px` | Laptops, standard monitors | Full horizontal desktop nav bar, multi-column editorial spreads, 3-col grids |
| **Ultrawide** | `>= 1440px` | 2K, 4K, widescreen desktop monitors | Capped shell (`max-width: 1520px`) with fluid auto-margins, expansive luxury whitespace |

### 2.2 CSS Media Query Standardization in `eclat.css`

Replace the previous comment block (`eclat.css:7-22`) and standardize `@media` blocks:

```css
/* --- canonical breakpoint tiers (source of truth) -------------------------
   Tier 1 (Phone)     : max-width: 767px
   Tier 2 (Tablet)    : min-width: 768px and max-width: 1023px
   Tier 3 (Desktop)   : min-width: 1024px and max-width: 1439px
   Tier 4 (Ultrawide) : min-width: 1440px
   ------------------------------------------------------------------------- */
```

### 2.3 JavaScript Breakpoint Synchronization (`src/lib/breakpoints.js`)

Create a shared module `src/lib/breakpoints.js` exporting:

1. **`BREAKPOINTS` Constants:**
   ```javascript
   export const BREAKPOINTS = {
     PHONE_MAX: 767,
     TABLET_MIN: 768,
     TABLET_MAX: 1023,
     DESKTOP_MIN: 1024,
     DESKTOP_MAX: 1439,
     ULTRAWIDE_MIN: 1440,
   }
   ```

2. **`QUERIES` matchMedia strings:**
   ```javascript
   export const QUERIES = {
     phone: '(max-width: 767px)',
     tablet: '(min-width: 768px) and (max-width: 1023px)',
     desktop: '(min-width: 1024px) and (max-width: 1439px)',
     ultrawide: '(min-width: 1440px)',
     touch: '(pointer: coarse)',
   }
   ```

3. **`useBreakpoint()` React Hook:**
   Returns reactive object:
   ```javascript
   {
     isPhone: boolean,
     isTablet: boolean,
     isDesktop: boolean,
     isUltrawide: boolean,
     isTouch: boolean,
     tier: 'phone' | 'tablet' | 'desktop' | 'ultrawide'
   }
   ```

4. **Call Site Migrations:**
   - `src/components/Header.jsx`: Replace `matchMedia('(max-width: 900px)')` with `useBreakpoint().isPhone || useBreakpoint().isTablet` (or `matchMedia('(max-width: 1023px)')` if nav collapses under 1024px).
   - `src/lib/motion.js`: Replace `window.innerWidth < 720` with `window.matchMedia(QUERIES.phone).matches`.

---

## 3. Fluid Typography & Spacing Tokens (RESP-02)

### 3.1 Container Sizing & Ultrawide Capping

Add/update in `:root` (`eclat.css:25-56`):

```css
:root {
  /* Container & Layout Shell */
  --shell: min(100%, 1520px);
  --shell-pad: clamp(16px, 4vw, 48px);
  --gut: clamp(16px, 3vw, 32px);
  --nav-h: 70px;

  /* Fluid Typography */
  --fs-h1: clamp(38px, 6vw, 78px);
  --fs-h2: clamp(28px, 4.2vw, 48px);
  --fs-title: clamp(22px, 3.2vw, 36px);
  --fs-lede: clamp(17px, 1.8vw, 22px);
  --fs-body: clamp(15px, 1.2vw, 17px);
  --fs-fine: clamp(12px, 1vw, 13px);

  /* Fluid Vertical Section Spacing */
  --section-space: clamp(48px, 8vw, 112px);
}
```

### 3.2 Typography Behavior Across Breakpoints

| Selector | Token / Rule | Computed @ 375px (Phone) | Computed @ 768px (Tablet) | Computed @ 1440px+ (Desktop/Wide) |
|---|---|---|---|---|
| `.hero h1` | `font-size: var(--fs-h1); line-height: 1.05;` | ~38px | ~46px | ~78px |
| `.hero__lede` | `font-size: var(--fs-lede); line-height: 1.55;` | ~17px | ~18.5px | ~22px |
| `.title-lead` / Section Title | `font-size: var(--fs-h2); line-height: 1.15;` | ~28px | ~32px | ~48px |
| `.wordmark` | `--wordmark-fs: clamp(20px, 5vw, 26px);` | ~20px | ~26px | 26px |
| Content Containers (`.shell`) | `max-width: var(--shell); padding-inline: var(--shell-pad); margin-inline: auto;` | Full width (16px pad) | Full width (30px pad) | Capped at 1520px centered with 48px pad |

---

## 4. Horizontal Overflow Prevention Contract (RESP-03)

### 4.1 Root Containment Architecture

To guarantee zero horizontal overflow site-wide across all routes without breaking `position: sticky` on the header or modal overlays, apply `overflow-x: clip`:

```css
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  max-width: 100vw;
  overflow-x: clip; /* Eliminates side-scrolling while preserving sticky descendants */
}

#root,
#main,
.page,
.page--narrow {
  width: 100%;
  max-width: 100%;
  overflow-x: clip;
  box-sizing: border-box;
}
```

### 4.2 Why `overflow-x: clip` vs `overflow-x: hidden`
- `overflow-x: hidden` forces the browser to treat the element as an independent scroll container, which breaks child `position: sticky` elements (like the navigation header) in Safari and Firefox.
- `overflow-x: clip` strictly clips visual paint overflow without creating a scroll container, allowing `position: sticky` to function normally.

### 4.3 Element Containment Rules
- Media elements (`img`, `video`, `svg`, `canvas`) must strictly adhere to `max-width: 100%; height: auto;`.
- Horizontal scroll strips (`.strip`) must maintain `touch-action: pan-x;` and `overscroll-behavior-x: contain;` so horizontal panning does not trigger browser-level page navigation gestures or page-level horizontal wobble.

---

## 5. Visual Verification Matrix

Automated and manual validation will confirm the visual presentation across all 4 tiers:

| Tier | Width | Device Equivalent | Required Verification Invariant |
|---|---|---|---|
| **Phone** | 375px, 430px | iPhone SE, iPhone 16 Pro | Zero horizontal scroll (`scrollWidth === clientWidth`); legible typography; header toggle functional; `--shell-pad: 16px` |
| **Tablet** | 768px, 1024px | iPad Mini, iPad Pro portrait | Clean 2-column or fluid layouts; no text clipping; no sticky header jump; balanced reading measure |
| **Desktop** | 1280px, 1440px | MacBook Pro, 1080p Monitor | Horizontal navigation menu; full hero typography hierarchy; sharp cover aspect ratios |
| **Ultrawide** | 1920px, 2560px | 1440p, 4K UHD Monitors | Main container strictly centered and capped at 1520px; generous proportional gutters; zero stretched card distortion |

---

## 6. Forward Handoff

- **Phase 8 (Hero Animation Multi-Device Adaptation):** Will consume `src/lib/breakpoints.js` and the unified tokens to adapt the fan carousel geometry and bounding math across phone, tablet, and desktop.
- **Phase 9 (Content Pages & Multi-Device Grids):** Will use the 4 breakpoint tiers to reflow Editions, Books, Writings, and Archive grids.
- **Phase 10 (Interactive Overlays & Global Chrome):** Will use the fluid tokens and safe-area insets to scale Magazine Preview and Lightbox modals dynamically.
