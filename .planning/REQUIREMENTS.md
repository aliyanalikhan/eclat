# Requirements: Éclat

**Defined:** 2026-09-23
**Core Value:** A signed-in subscriber's paid access is real and enforced server-side — no page, download, or API response leaks paid content to someone who hasn't actually paid for it.
**Milestone:** v1.2 All-Screen Responsive & Hero Animation — every layout, component, and interactive page reflows seamlessly across all device screen sizes (phone, tablet, desktop, ultra-wide) while preserving and adapting the signature hero fan scroll animation.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Breakpoint Architecture & Fluid Sizing (RESP)

- [x] **RESP-01**: Unified multi-tier breakpoint system across CSS and JS (Phone <768px, Tablet 768–1024px, Desktop 1024–1440px, Ultrawide >1440px) replacing fragmented ad-hoc pixel values.
- [x] **RESP-02**: Fluid typographic and spacing tokens using `clamp()` so headlines, body copy, and container paddings scale smoothly across all viewports.
- [x] **RESP-03**: Zero unintended horizontal overflow guarantee site-wide across all routes and viewport widths (from 320px up to 4K+).

### Hero Animation & Multi-Device Adaptation (HERO)

- [ ] **HERO-01**: Preserve existing rAF scroll-based fan animation mechanics while adapting geometry and card scaling smoothly across screen tiers.
- [ ] **HERO-02**: Responsive fan bounding & fit logic in `useScrollFx`: dynamically calculate card spread, translation bounds, and scale so cards remain visible and unclipped on all viewports.
- [ ] **HERO-03**: Preserve hero scroll reveal / fade transitions and side card title unveil timing matching desktop feel across all capable screen widths.
- [ ] **HERO-04**: Maintain strict adherence to `prefers-reduced-motion: reduce` with single settled pass and zero animation jumps.

### Content Pages & Multi-Device Grids (GRID)

- [ ] **GRID-01**: Archive, Editions, Books, and Writings listing grids reflow cleanly across all 4 breakpoint tiers (1-col mobile, 2-col tablet, 3-col desktop, 4-col ultrawide).
- [ ] **GRID-02**: Cultural Icons, Videos, and book drag-scroll strips support native smooth touch swipe on touch devices and pointer drag on desktop.
- [ ] **GRID-03**: Editorial detail pages (Edition, Writings, Book detail) maintain optimal reading line-lengths and proportional media display across all screens.

### Overlays & Chrome Adaptation (OVERLAY)

- [ ] **OVERLAY-01**: Magazine preview flipbook modal scales dynamically to viewport aspect ratio and height on mobile, tablet, and desktop without clipping.
- [ ] **OVERLAY-02**: Lightbox zoom overlay maintains image proportions, touch-action, and prevents background rubber-band scrolling on mobile and desktop.
- [ ] **OVERLAY-03**: Global header navigation and footer adapt seamlessly across mobile drawer and desktop bar with safe-area inset support.

## v2 Requirements

Deferred to a future milestone. Tracked but not in this roadmap.

### Interactive Dynamics
- **DYN-01**: Physics-based drag-throw / inertia for mobile flipbook pages.
- **DYN-02**: Interactive 3D tilt effects on desktop edition cards based on cursor position.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Replacing hero animation with completely different interaction | User explicitly instructed: "animation should stay same like current animation" — preserve core scroll-driven fan mechanics |
| CSS framework adoption (Tailwind, Bootstrap) | Project deliberately uses Vanilla CSS with custom properties; no utility frameworks |
| Heavy external animation libraries (GSAP, Framer Motion) | Lightweight native requestAnimationFrame and CSS transitions already handle motion smoothly with zero extra bundle weight |
| Auth & Stripe billing changes | Gated access and Stripe billing flows are already validated; this milestone focuses on responsive design and hero adaptation |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RESP-01 | Phase 7 | Complete |
| RESP-02 | Phase 7 | Complete |
| RESP-03 | Phase 7 | Complete |
| HERO-01 | Phase 8 | Pending |
| HERO-02 | Phase 8 | Pending |
| HERO-03 | Phase 8 | Pending |
| HERO-04 | Phase 8 | Pending |
| GRID-01 | Phase 9 | Pending |
| GRID-02 | Phase 9 | Pending |
| GRID-03 | Phase 9 | Pending |
| OVERLAY-01 | Phase 10 | Pending |
| OVERLAY-02 | Phase 10 | Pending |
| OVERLAY-03 | Phase 10 | Pending |

**Coverage:**

- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-23*
*Last updated: 2026-09-23 after v1.2 requirements scoping*
