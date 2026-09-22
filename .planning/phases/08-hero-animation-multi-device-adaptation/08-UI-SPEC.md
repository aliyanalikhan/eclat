---
phase: 8
slug: hero-animation-multi-device-adaptation
status: draft
shadcn_initialized: false
preset: none
created: 2026-09-23
---

# Phase 8 — UI Design Contract: Hero Animation Multi-Device Adaptation

> Visual, structural, and motion design contract for adapting Éclat's signature scroll-driven
> fan carousel animation across all viewports (Phone, Tablet, Desktop, Ultrawide).
> Preserves the exact mathematical fan spread physics and luxury editorial feel ("animation should stay same like current animation")
> while eliminating mobile suppression and side clipping.
> Covers requirements: **`HERO-01`**, **`HERO-02`**, **`HERO-03`**, **`HERO-04`**.

---

## 1. Motion Philosophy & Architecture Constraints

| Property | Value |
|---|---|
| Engine | Native `requestAnimationFrame` loop in `src/lib/motion.js` (`useScrollFx`) |
| Styling / Sizing | Vanilla CSS in `src/styles/eclat.css` with fluid clamp tokens from Phase 7 |
| Component Structure | `src/routes/Home.jsx` (`FAN_SLOTS`, `buildFan()`, `data-hero`, `data-fan-origin`) |
| Breakpoint Source | `src/lib/breakpoints.js` (`BREAKPOINTS`, `QUERIES`) |
| Libraries Permitted | None — Zero GSAP, Framer Motion, or external physics engines |
| Accessibility | Full `prefers-reduced-motion: reduce` static settled pass |
| Viewport Fit Invariant | Zero horizontal page overflow (`scrollWidth === clientWidth`) at all scroll offsets from 320px to 4K |

**Core Mandate:** The user confirmed that the signature fan carousel interaction must remain identical in visual concept, layering order, and rotational spread. Mobile devices must no longer be relegated to a static single-card fallback; instead, all five cards fan out responsively according to the device's screen geometry.

---

## 2. Hero Layout & Fan Bounding Contract (HERO-01, HERO-02)

### 2.1 Removing Mobile Suppression
In previous iterations, `@media (max-width: 767px)` applied `display: none` to all `.fan-card` elements except `.fan-card--lead`, and set `.hero { height: auto; }` and `.fan-card--lead { transform: none !important; }`. Simultaneously, `useScrollFx` short-circuited with `if (cards.length && !mobile)`.

**Contract Requirement:**
1. Remove `.fan-origin .fan-card { display: none; }` and `.fan-origin .fan-card--lead { transform: none !important; }` in `eclat.css`.
2. Remove `!mobile` check from `useScrollFx` in `src/lib/motion.js`.
3. Standardize `.hero` height across mobile: `height: 100vh; height: 100svh; min-height: 620px;` (phone) up to `min-height: 780px;` (desktop).
4. Maintain `overflow: hidden;` on `.hero` container and preserve `overflow-x: clip;` at root.

### 2.2 Breakpoint-Specific Card Geometry & Dimensions

The base desktop card dimensions are 230px × 306px (side) and 252px × 336px (lead). On smaller viewports, base card scales and margins adapt so the origin remains centered and responsive:

| Viewport Tier | Width Range | Base Card Size (CSS) | Lead Card Size (CSS) | Scaled Card Transform Range (`s * cs`) | Spread Bound (`bound`) |
|---|---|---|---|---|---|
| **Phone** | `<= 767px` | 150px × 200px (or scaled ~0.65) | 165px × 220px | `0.48 – 0.65` | `(innerWidth / 2) - 16px` |
| **Tablet** | `768px – 1023px` | 190px × 252px | 210px × 280px | `0.65 – 0.85` | `(innerWidth / 2) - 48px` |
| **Desktop** | `1024px – 1439px` | 230px × 306px | 252px × 336px | `0.85 – 1.00` | `(innerWidth / 2) - 120px` |
| **Ultrawide** | `>= 1440px` | 230px × 306px | 252px × 336px | `1.00 – 1.05` | Max 620px (capped to shell) |

### 2.3 Mathematical Fan Solver (`useScrollFx`)

The responsive geometry solver dynamically computes scaling factor `s`, horizontal spread multiplier `fit`, and rotational factor `rotFactor`:

```javascript
// 1. Viewport Tier Classification
const isPhone = window.innerWidth <= 767
const isTablet = window.innerWidth > 767 && window.innerWidth <= 1023

// 2. Horizontal Spread & Angle Dampening for Narrow Screens
// Prevents side cards from extending outside narrow viewport margins
const fit = isPhone
  ? Math.min(0.55, (window.innerWidth - 32) / 720)
  : Math.min(1.0, (window.innerWidth - 48) / 1120)

// Reduce spread angle slightly on phones so cards remain legible and do not cross screen borders
const rotFactor = isPhone ? 0.65 : isTablet ? 0.85 : 1.0

// 3. Translation Bounding
// Maximum horizontal displacement from center origin
const bound = Math.max(80, window.innerWidth / 2 - (isPhone ? 28 : 120))

// 4. Per-card transformed coordinates
for (const c of cards) {
  const x = Math.max(-bound, Math.min(bound, c.fx * p * fit))
  const y = c.fy * p * s
  const r = c.fr * p * rotFactor
  c.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${(cs * s).toFixed(3)})`
}
```

### 2.4 Origin Band & Height Solver
The solver calculates the vertical band between the hero headline copy bottom and the viewport fold:
- `bandTop = copyBottom + (isPhone ? 16 : 24)`
- `bandBottom = Math.min(H, vh) - (isPhone ? 28 : 52)`
- `band = Math.max(160, bandBottom - bandTop - cyUp - cyDown)`
- `origin.style.top = \`${(bandBottom - s * down - cyDown).toFixed(1)}px\``
This guarantees that on compact mobile screens with short viewport heights (e.g. mobile landscape or small phones), the fan lands right above the fold without pushing into the next section or clipping behind the hero title.

---

## 3. Scroll Dynamics & Timing Contract (HERO-02, HERO-03)

### 3.1 Adaptive Scroll Travel Distance
Desktop mousewheels require standard scroll distance (~`vh * 0.62`), while mobile touch screens require a tighter gesture distance so a natural thumb swipe reveals the fan without forcing multiple page scrolls.

- **Desktop Scroll Range:** `window.scrollY / (vh * 0.62)`
- **Phone Scroll Range:** `window.scrollY / (vh * 0.48)`
- **Tablet Scroll Range:** `window.scrollY / (vh * 0.54)`

```javascript
const scrollDistance = isPhone ? vh * 0.48 : isTablet ? vh * 0.54 : vh * 0.62
const raw = Math.min(1, Math.max(0, window.scrollY / scrollDistance))
```

### 3.2 Progress Curves & Opening Mechanics
Preserve the cubic deceleration curve that gives the fan its natural physical weight:
- Resting progress offset: `0.12`
- Curved progress: `p = finalOnly ? 1 : 1 - Math.pow(1 - Math.min(1, raw + 0.12), 3)`
- Per-card dynamic scale: `cs = 0.90 + 0.10 * p`

### 3.3 Synchronized Side-Title Veil & Hero Copy Fade (HERO-03)
1. **Title Veil Timing:**
   Side card titles (`[data-fan-title]`) remain veiled (`opacity: 0`) while overlapping neighbouring cards, fading in smoothly across the second half of the fan opening:
   ```javascript
   const P_REST = 1 - Math.pow(1 - 0.12, 3)
   const FADE_IN = isPhone ? 0.20 : 0.25
   const opened = Math.max(0, Math.min(1, (p - P_REST) / (1 - P_REST)))
   const veil = Math.max(0, Math.min(1, (opened - FADE_IN) / (1 - FADE_IN)))
   for (const el of titles) el.style.opacity = veil.toFixed(3)
   ```
2. **Hero Copy Drift & Fade:**
   As the fan expands upwards, the hero header copy (`[data-hero-copy]`) subtly drifts upward and fades out:
   - Phone: `translateY(-raw * 24px)`, opacity: `Math.max(0, 1 - raw * 1.6)`
   - Desktop: `translateY(-raw * 40px)`, opacity: `Math.max(0, 1 - raw * 1.4)`

---

## 4. Initial Mount Luxury Entrance Reveal (HERO-01)

### 4.1 First Render State & SSR Stability
- On initial page load (and SSR / static prerender), cards render at resting progress `P_REST` (`raw = 0`) immediately.
- To evoke the high-end editorial feel of a luxury print magazine, an entrance reveal class (`.hero--entered` or keyframe animation) is applied on client mount:
  - Hero headline & lede: gentle fade-up (`opacity: 0 -> 1`, `translateY: 16px -> 0px` over `650ms` cubic-bezier(0.16, 1, 0.3, 1)).
  - Fan cards: resting stack softly resolves into focus (`opacity: 0 -> 1`, `scale: 0.96 -> 1.0` over `700ms` with subtle 40ms stagger per slot outward from lead).
- This replaces any harsh layout jumps with a smooth arrival transition.

### 4.2 CSS Keyframe Specification

```css
@keyframes heroFadeUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fanEntrance {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.hero__copy {
  animation: heroFadeUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.fan-origin {
  animation: fanEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

---

## 5. Reduced Motion & Accessibility Contract (HERO-04)

### 5.1 `prefers-reduced-motion: reduce` Requirements
When the user's OS or browser requests reduced motion:
1. `useScrollFx` executes exactly **one** static pass with `finalOnly = true` or `p = P_REST` (settled resting fan).
2. The scroll listener and `requestAnimationFrame` loop are **not** attached.
3. Card transforms are computed once for the resting arrangement so cards sit statically in a balanced spread.
4. Side card titles (`[data-fan-title]`) render with `opacity: 1;` immediately (no veiled delay).
5. CSS entrance keyframes are bypassed (`animation: none !important; transition: none !important;`).
6. Zero horizontal scrollbar or jumping transforms.

### 5.2 Accessibility Tree & Screen Readers
- The decorative fan stack retains `aria-hidden="true"` on `.fan-origin` because the covers in the fan are visual previews.
- Primary navigation and accessibility links to editions are fully accessible via standard landmark semantics in the document flow.
- Card images maintain appropriate `alt` attributes or empty strings for decorative sample cards.

---

## 6. Multi-Device Visual Verification Matrix

Automated headless and manual browser checks will verify the fan at each responsive milestone:

| Viewport Tier | Test Width × Height | Device Reference | Verification Invariant |
|---|---|---|---|
| **Compact Phone** | 375px × 667px | iPhone SE | All 5 cards visible in resting fan; zero side overflow (`scrollWidth === innerWidth`); cards spread smoothly on swipe; no collision with copy. |
| **Modern Phone** | 430px × 932px | iPhone 16 Pro Max | Balanced fan spread; title veils fade in smoothly at ~50% scroll; scroll travel completed in ~450px of scroll. |
| **Tablet Portrait** | 768px × 1024px | iPad Mini | Mid-scale cards (~190px); fan width stays within `innerWidth - 48px`; headline remains legible above fan. |
| **Tablet Landscape** | 1024px × 768px | iPad Pro | Height band solver seats fan correctly above fold despite shorter vertical height (768px). |
| **Standard Desktop** | 1440px × 900px | MacBook Pro | Full desktop spread; signature 420px max horizontal card displacement; titles crisp; lead card elevated. |
| **Ultrawide** | 2560px × 1440px | 4K Display | Fan spread centered within container shell; no card stretching; zero overflow. |
| **Reduced Motion** | Any viewport | macOS Reduced Motion | Single static layout; no rAF scroll binding; zero visual jitter. |

---

## 7. Downstream Planning Handoff

This UI design contract is immediately ready for consumption by `/gsd-plan-phase 8`:
- **Phase 8 Plans:**
  - `08-01-PLAN.md`: Refactor `src/lib/motion.js` (`useScrollFx`) for responsive fan geometry, dynamic travel distance, and reduced motion enforcement.
  - `08-02-PLAN.md`: Refactor `src/styles/eclat.css` and `src/routes/Home.jsx` to remove mobile suppression, add entrance animations, and apply responsive card aspect rules.
