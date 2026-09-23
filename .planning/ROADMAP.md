# Roadmap: Éclat

## Overview

Éclat goes from a static prerendered demo to a real subscriber product with secure server-side content gating and Stripe billing (v1.0), establishes a mobile foundation (v1.1), and now in Milestone v1.2 expands to an all-screen responsive design across all devices (mobile, tablet, desktop, ultrawide) while preserving and adapting the signature hero fan scroll animation.

Milestone v1.2 builds directly upon the existing codebase and validated backend, ensuring the luxury editorial presentation looks stunning, reflows seamlessly, and animates fluidly on every display resolution.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

### Completed Milestones

- [x] **Milestone v1.0: Real Subscriber Gating & Stripe Billing** (Phases 1–5, completed 2026-09-10)
- [x] **Milestone v1.1: Foundation & Global Chrome** (Phase 6, completed 2026-09-13)
- [x] **Milestone v1.2: All-Screen Responsive & Hero Animation** (Phases 7–10, completed 2026-09-23) — See [v1.2-ROADMAP.md](./milestones/v1.2-ROADMAP.md)

## Active / Next Milestone

*No active milestone. Run `/gsd-new-milestone` to define the next cycle.*

### Phase 7: Breakpoint Architecture & Fluid Foundation

**Goal**: Establish a unified 4-tier responsive breakpoint architecture, fluid clamp() typography and spacing tokens, and guarantee zero horizontal overflow site-wide across all routes.
**Depends on**: Phase 6
**Requirements**: RESP-01, RESP-02, RESP-03
**Success Criteria** (what must be TRUE):
1. A single 4-tier breakpoint system (Phone <768px, Tablet 768–1024px, Desktop 1024–1440px, Ultrawide >1440px) is applied consistently across CSS and JS viewport checks.
2. Fluid typography and spacing use `clamp()` so headlines, body copy, and container margins scale proportionally across all screen widths.
3. No page produces unwanted horizontal scrollbars or clipped overflow on any viewport width from 320px to 4K displays.

### Phase 8: Hero Animation Multi-Device Adaptation

**Goal**: Preserve the current signature scroll-driven hero fan animation mechanics while adapting geometry, bounding, and card scaling dynamically so it looks elegant and unclipped on phone, tablet, desktop, and ultrawide screens.
**Depends on**: Phase 7
**Requirements**: HERO-01, HERO-02, HERO-03, HERO-04
**Success Criteria** (what must be TRUE):
1. The fan cards open smoothly on scroll across all capable viewport widths with dynamically calculated bounds and scale, preventing clipping or overflow.
2. Mobile and tablet viewports preserve the visual elegance of the spread rather than hard-disabling the fan to a single static card or overflowing off-screen.
3. Hero copy fade, veil opacity transitions, and side card titles unveil in perfect synchronization with scroll depth.
4. Users with `prefers-reduced-motion: reduce` receive an immediate settled layout with zero motion jar or transform jumping.

### Phase 9: Content Pages & Responsive Multi-Device Grids

**Goal**: Reflow all content listing grids (Editions, Books, Writings, Archive) and editorial reading pages seamlessly across phone, tablet, desktop, and large displays.
**Depends on**: Phase 7
**Requirements**: GRID-01, GRID-02, GRID-03
**Success Criteria** (what must be TRUE):
1. Grids reflow cleanly from 1-column on phone to 2-column on tablet, 3-column on desktop, and 4-column on ultrawide displays.
2. Horizontal media strips (Cultural Icons, Videos) support native touch-swipe on mobile/tablet and smooth pointer-drag on desktop.
3. Reader line-lengths and image scales maintain luxury editorial readability on all screen resolutions.

### Phase 10: Interactive Overlays & Global Chrome Refinement

**Goal**: Ensure modals (Magazine Preview flipbook, Lightbox zoom) and global chrome (header nav and footer) adapt flawlessly on any viewport size.
**Depends on**: Phase 8, Phase 9
**Requirements**: OVERLAY-01, OVERLAY-02, OVERLAY-03
**Success Criteria** (what must be TRUE):
1. Magazine preview flipbook modal fits viewport dimensions dynamically without page clipping, scroll trapping, or aspect ratio distortion.
2. Lightbox zoom modal displays high-resolution covers with background scroll lock on iOS and desktop.
3. Header navigation and footer transition cleanly between compact mobile drawer and expansive desktop bar, with notch safe-area inset support.
