---
phase: 10
slug: interactive-overlays-global-chrome-refinement
status: approved
shadcn_initialized: false
preset: none
created: 2026-09-23
---

# Phase 10 — UI Design Contract: Interactive Overlays & Global Chrome Refinement

> Visual, structural, and interaction design contract for interactive overlay modals (Magazine Preview page-flip flipbook modal, Lightbox zoom overlay, Video modal) and global chrome elements (Header mobile navigation drawer and Footer) across all 4 canonical breakpoint tiers (Phone <=767px, Tablet 768–1023px, Desktop 1024–1439px, Ultrawide >=1440px).
> Covers requirements: **`OVERLAY-01`**, **`OVERLAY-02`**, **`OVERLAY-03`**.

---

## 1. Design System & Constraints

| Property | Value |
|---|---|
| Styling Architecture | Vanilla CSS (`src/styles/eclat.css`) using fluid tokens (`--shell`, `--shell-pad`, `--gut`, `--fs-body`, `--nav-h`) |
| Breakpoint Source | Canonical tiers in `src/lib/breakpoints.js` (`QUERIES.nav`, `QUERIES.phone`, `QUERIES.touch`) and `@media` queries in `eclat.css` |
| Component Framework | React 18, React Router v6 |
| Modal Interaction | Native touch swiping for flipbook; backdrop tap or swipe-down to dismiss; Esc key; focus trap |
| Safe-Area Adaptation | CSS environment variables (`env(safe-area-inset-top)`, `env(safe-area-inset-right)`, `env(safe-area-inset-bottom)`) |
| Touch Target Standard | Minimum 44px × 44px tap targets for all mobile controls and navigation links |
| Overflow Containment | Global `overflow-x: clip;` enforced at root containers |

---

## 2. Magazine Preview Flipbook Modal Ergonomics (OVERLAY-01)

### 2.1 Viewport Sizing & Layout Structure
- **Container**: Fixed overlay (`position: fixed; inset: 0; z-index: 90;`) using `100svh` to avoid mobile toolbar jump.
- **Image Frame**:
  - Desktop (`>=1024px`): Center-aligned image with `max-height: 80vh; max-width: min(900px, 90vw); box-shadow: 0 40px 100px rgba(0, 0, 0, 0.6);`.
  - Tablet (`768px – 1023px`): `max-height: calc(100svh - 110px); max-width: 92vw;`.
  - Phone (`<=767px`): `max-height: calc(100svh - 96px); max-width: calc(100vw - 28px);`, ensuring magazine pages maintain full portrait aspect ratio without clipping.
- **Floating Bottom Glass Bar (`.magazine-preview__nav`)**:
  - On mobile/tablet, positioned near the bottom edge with `backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);`.
  - Background: `rgba(22, 19, 15, 0.75); border: 1px solid rgba(247, 243, 236, 0.18); border-radius: 9999px;`.
  - Padding: `6px 14px; bottom: max(16px, env(safe-area-inset-bottom));`.
  - Controls: `Previous` button (`min-height: 38px`), counter `N / Total` (`font-family: var(--narrow); letter-spacing: 0.16em; font-size: 11px`), and `Next` button (`min-height: 38px`).

### 2.2 Touch Swiping Gestures
- **Touch Gesture Engine**:
  - Listeners on the magazine frame container: `onTouchStart`, `onTouchMove`, `onTouchEnd`.
  - Horizontal threshold: `Math.abs(deltaX) > 40px && Math.abs(deltaX) > Math.abs(deltaY) * 1.5` triggers page flip.
  - Swipe Left (`deltaX < -40px`) → Advances to next page (`index + 1`).
  - Swipe Right (`deltaX > 40px`) → Returns to previous page (`index - 1`).
  - Touch action on frame: `touch-action: pan-y;` or `touch-action: none;` while swiping to prevent accidental page scroll.

### 2.3 Directional Page Transitions & Preloading
- **Keyframe Slide Animation**:
  - When moving Forward (`Next` / Swipe Left):
    ```css
    @keyframes flipSlideInRight {
      from { opacity: 0.4; transform: translateX(24px) scale(0.98); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    ```
  - When moving Backward (`Previous` / Swipe Right):
    ```css
    @keyframes flipSlideInLeft {
      from { opacity: 0.4; transform: translateX(-24px) scale(0.98); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    ```
  - Duration: `200ms cubic-bezier(0.16, 1, 0.3, 1)`.
  - Reduced Motion: If `prefers-reduced-motion: reduce`, animations are skipped (`animation: none !important; opacity: 1;`).
- **Adjacent Page Preloading**:
  - An effect in `MagazinePreview.jsx` prefetches `pages[index + 1]`, `pages[index + 2]`, and `pages[index - 1]` via `new Image().src = ...` whenever `index` updates.

---

## 3. Lightbox & Video Modal Scroll-Locking & Safe Areas (OVERLAY-02)

### 3.1 Hardened iOS Scroll Lock Contract
- Modal backdrop (`.lightbox`):
  ```css
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(14, 12, 10, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: max(20px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
    overscroll-behavior: contain;
    touch-action: none;
  }
  ```
- Body scroll locking locks `overflow: hidden;` and applies scrollbar compensation to `paddingRight` on desktop.

### 3.2 Close Button Safe-Area Alignment
- Close button (`.lightbox__close`):
  ```css
  .lightbox__close {
    position: absolute;
    top: max(20px, env(safe-area-inset-top));
    right: max(22px, env(safe-area-inset-right));
    z-index: 100;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid rgba(247, 243, 236, 0.3);
    background: rgba(14, 12, 10, 0.6);
    color: rgba(247, 243, 236, 0.9);
    cursor: pointer;
  }
  ```

### 3.3 Mobile Swipe-to-Dismiss on Lightbox
- On touch devices, swiping down on the lightbox image (`deltaY > 60px && Math.abs(deltaY) > Math.abs(deltaX) * 2`) triggers `closeLightbox()`.
- Tapping anywhere on the backdrop overlay continues to trigger `closeLightbox()` / `onClose()`.

### 3.4 Video Modal Proportions
- In `Videos.jsx` (`.video-modal`):
  - `.video-modal__frame` maintains `aspect-ratio: 16/9; width: min(1000px, 92vw); max-height: 80svh;`.
  - Close button respects safe-area insets identically to Lightbox.

---

## 4. Global Header Drawer & Footer Refinement (OVERLAY-03)

### 4.1 Header Mobile Navigation Drawer
- **Breakpoint**: Activates under `QUERIES.nav` (`max-width: 1023px`).
- **Drawer Animation & Positioning**:
  ```css
  @media (max-width: 1023px) {
    .nav {
      display: none;
      position: fixed;
      inset: var(--nav-h) 0 auto 0;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      background: var(--bg);
      border-bottom: 1px solid var(--line);
      padding: 12px var(--gut) 24px;
      padding-left: max(var(--gut), env(safe-area-inset-left));
      padding-right: max(var(--gut), env(safe-area-inset-right));
      padding-bottom: max(24px, env(safe-area-inset-bottom));
      box-shadow: 0 18px 40px rgba(22, 19, 15, 0.12);
      max-height: calc(100svh - var(--nav-h));
      overflow-y: auto;
      z-index: 70;
      transform: translateY(-8px);
      opacity: 0;
      transition: transform 0.25s var(--ease), opacity 0.25s var(--ease);
    }

    .nav.is-open {
      display: flex;
      transform: translateY(0);
      opacity: 1;
    }
  }
  ```
- **Dimmed Backdrop Overlay (`.nav-backdrop`)**:
  - When mobile nav is open, a backdrop overlay (`position: fixed; inset: var(--nav-h) 0 0 0; background: rgba(14, 12, 10, 0.4); z-index: 65; backdrop-filter: blur(4px);`) renders behind the drawer.
  - Tapping the backdrop overlay immediately closes the drawer.
- **Scroll Locking**: While `open` is true in `Header.jsx`, `document.body.style.overflow = 'hidden'` is applied.

### 4.2 Footer Responsive Reflow & Home Indicator Safe Areas
- **Desktop (`1024px+`)**: Horizontal spread: Brand mark left, nav links center, copyright right/underneath.
- **Tablet (`768px – 1023px`)**: Balanced layout with horizontal nav links and centered copyright.
- **Phone (`<= 767px`)**:
  - Brand mark: centered at top (`margin-bottom: 24px; text-align: center;`).
  - Nav links (`.footer__nav`): Reflows into a 2-column balanced grid (`display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 20px; text-align: center;`).
  - Each link: minimum 44px tap target height with centered alignment.
  - Copyright (`.footer__fine`): Centered text at bottom.
  - Padding: `padding-bottom: max(36px, env(safe-area-inset-bottom))` ensuring the iOS gesture bar never overlaps footer content.

---

## 5. Accessibility & Motion Contracts

- **Focus Management**:
  - Modals trap focus between close button and interactive elements.
  - Pressing `Escape` closes the modal and returns focus to the initiating trigger button.
- **ARIA Semantics**:
  - `role="dialog"` and `aria-modal="true"`.
  - Accessible labels: `aria-label={title}` on modals; `aria-label="Close"` on close buttons.
  - `aria-expanded={open}` and `aria-controls={navId}` on mobile nav toggle button.
- **Reduced Motion**:
  - For `prefers-reduced-motion: reduce`:
    - Modal entrance fade and slide animations replaced with immediate appearance (`animation: none !important; opacity: 1; transform: none !important;`).
    - Page flip transitions switch immediately without slide keyframes.

---

## 6. Verification & Automated Test Matrix

| Check | Target | Expected Result |
|---|---|---|
| 1 | `MagazinePreview.jsx` | Touch swipe handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`) present |
| 2 | `MagazinePreview.jsx` | Adjacent image preloading effect implemented |
| 3 | `eclat.css` | `.magazine-preview__nav` styled as compact floating pill with `env(safe-area-inset-bottom)` |
| 4 | `eclat.css` | `@keyframes flipSlideInRight` and `@keyframes flipSlideInLeft` defined |
| 5 | `Lightbox.jsx` / `eclat.css` | Hardened scroll-lock (`overscroll-behavior: contain; touch-action: none`) |
| 6 | `eclat.css` | `.lightbox__close` uses `max(20px, env(safe-area-inset-top))` and `max(22px, env(safe-area-inset-right))` |
| 7 | `Header.jsx` / `eclat.css` | `.nav-backdrop` overlay rendered when open, closing drawer on tap |
| 8 | `Header.jsx` | Body scroll-locking engaged when mobile nav is open |
| 9 | `eclat.css` | Phone footer (`@media (max-width: 767px)`) reflows `.footer__nav` into 2-column grid |
| 10 | `eclat.css` | Footer has `padding-bottom: max(..., env(safe-area-inset-bottom))` |
| 11 | Build & Prerender | `vite build` + SSR prerendering of all 12 routes passes with exit code 0 |
| 12 | Live Browser Verification | Verified in browser across mobile (`390x844`) and desktop (`1280x800`) |
