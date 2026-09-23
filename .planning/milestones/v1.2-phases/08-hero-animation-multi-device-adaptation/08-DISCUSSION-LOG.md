# Phase 8 Discussion Log: Hero Animation Multi-Device Adaptation

**Date:** 2026-09-23
**Phase:** 08
**Participants:** User & Assistant

## Discussion Points & Decisions

### 1. Mobile Screen Presentation (<768px)
- **Question:** How should the hero fan spread appear on phone screens (<768px)?
- **Choice:** Adaptive scaled fan: Show all cards scaled down proportionally (scale ~0.65, tighter angle) so the fan opens smoothly even on mobile.
- **Rationale:** Preserves the signature fan opening motion across all screen sizes as requested by user ("animation should stay same like current animation"), replacing the previous static single-card fallback.

### 2. Scroll Sensitivity & Distance
- **Question:** How should the scroll distance that drives the fan opening behave across devices?
- **Choice:** Viewport-proportional scroll travel (~50% svh) so the fan opens responsively on both touch screens and desktop mouse scroll.
- **Rationale:** Enables touch users on mobile and tablet to see the fan open organically with a natural short thumb-swipe while desktop retains smooth progressive travel.

### 3. Initial Load Experience
- **Question:** Should the hero have a smooth entrance reveal when the page first loads?
- **Choice:** Subtle luxury entrance on load: Hero headline and resting cards smoothly fade/settle in on initial mount.
- **Rationale:** Enhances the luxury magazine brand presentation on first arrival before scroll begins.

## Outcome
All decisions locked and recorded in `08-CONTEXT.md`. Ready to plan Phase 8.
