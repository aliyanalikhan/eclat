# Phase 10: Interactive Overlays & Global Chrome Refinement — Context & Decisions

**Phase:** 10-interactive-overlays-global-chrome-refinement  
**Date:** 2026-09-23  
**Status:** Decisions locked  

---

<domain>
Phase 10 refines the interactive overlay modals (Magazine Preview page-flip flipbook modal, Lightbox zoom overlay, and Video modal) and global chrome elements (Header navigation mobile drawer and Footer) to adapt gracefully across all device screen sizes (phone, tablet, desktop, ultrawide). It guarantees fluid responsive sizing, native touch gesture support, notch and home indicator safe-area compliance, bulletproof iOS scroll locking, and zero horizontal overflow.
</domain>

---

<decisions>
### 1. Magazine Preview Flipbook Modal Ergonomics (OVERLAY-01)
- **Touch Page Swiping:** Support direct horizontal touch swipe gestures (`touchstart`, `touchmove`, `touchend` with threshold detection) on the magazine image to advance or return to previous pages on mobile and touch devices.
- **Floating Bottom Glass Bar:** On mobile and tablet viewports, float the navigation controls (`Previous`, `N / Total` counter, `Next`) in a compact glassmorphism pill (`backdrop-filter: blur(12px)`) pinned near the bottom edge with `env(safe-area-inset-bottom)`, allowing the magazine page image to consume maximum available screen height (`max-height: calc(100svh - 96px)`).
- **Directional Slide Transition:** Page flips animate using a crisp 200ms slide/flip transition matching the direction of navigation (slide in from right when advancing; slide in from left when moving backwards).
- **Adjacent Page Preloading:** In the background, preload adjacent page images (`index + 1`, `index + 2`, and `index - 1`) to eliminate white flashes or layout delays on mobile networks.
- **Desktop Keyboard & Click Navigation:** Retain arrow key navigation (`ArrowLeft` / `ArrowRight`) and `Escape` to close, with hover/focus states for all interactive controls.

### 2. Lightbox & Video Modal Scroll-Locking & Safe Areas (OVERLAY-02)
- **Hardened iOS Scroll Lock:** Enhance modal backdrop scroll-locking to prevent background rubber-band scrolling on iOS Safari using `overscroll-behavior: contain;` and `touch-action: none;` on the backdrop overlay, while preserving scrollability/touch within modal content where needed.
- **Safe-Area Inset Alignment:** Calibrate modal close buttons and control targets using `env(safe-area-inset-top)` and `env(safe-area-inset-right)` (e.g., `top: max(20px, env(safe-area-inset-top))` and `right: max(22px, env(safe-area-inset-right))`) to prevent collision with device notches, dynamic islands, and status bars.
- **Mobile Swipe-to-Dismiss:** Allow touch users to dismiss the image Lightbox by either tapping the backdrop or swiping down on the frame.
- **Video Modal Containment:** Maintain responsive 16:9 aspect ratio scaling within `min(1000px, 90vw)` and `max-height: 80svh` with centered playback and safe-area compliant close button.

### 3. Global Header Drawer & Footer Refinement (OVERLAY-03)
- **Nav Drawer Animation & Dimmed Backdrop:** On mobile viewports (`<1024px`), opening the hamburger menu displays a smoothly animated slide-down drawer accompanied by a soft dimmed backdrop overlay behind it to focus attention on navigation and prevent accidental clicks on background elements.
- **Drawer Scroll Lock:** While the mobile navigation drawer is open, lock body scrolling to prevent background rubber-banding.
- **Footer Link Reflow:** On mobile screens (`<768px`), reflow the footer navigation links into a clean, balanced 2-column grid with generous tap targets (minimum 44px height).
- **Home Indicator Inset:** Add `padding-bottom: max(var(--pad), env(safe-area-inset-bottom))` to the footer and mobile nav drawer to prevent clipping against modern mobile gesture home bars.
</decisions>

---

<canonical_refs>
- `src/components/MagazinePreview.jsx` — Page-flip flipbook modal component
- `src/components/Lightbox.jsx` — Cover and spread zoom modal component
- `src/routes/Videos.jsx` — Video modal implementation and cross-origin iframe handling
- `src/components/Header.jsx` — Global header, mobile drawer toggle, and auth menu
- `src/components/Footer.jsx` — Global footer layout and copywriting
- `src/styles/eclat.css` — Global design tokens, breakpoint hierarchy, modal and chrome styling
- `src/lib/breakpoints.js` — Canonical breakpoint constants and queries
</canonical_refs>

---

<code_context>
- **Breakpoints:** Uses `QUERIES.nav` (`max-width: 1023px`) for mobile drawer and `QUERIES.phone` (`max-width: 767px`) for compact single/double column reflow.
- **Tokens:** Consumes `--fs-body`, `--shell-pad`, `--nav-h`, and CSS environment variables (`env(safe-area-inset-*)`).
- **A11y Contracts:** Maintains focus trap, `Escape` key listeners, focus restoration upon closing, `aria-modal="true"`, and `role="dialog"`.
</code_context>

---

<deferred>
- Physics-based 3D page curl/inertia animation for magazine flipbook (deferred to v2 `DYN-01`).
</deferred>
