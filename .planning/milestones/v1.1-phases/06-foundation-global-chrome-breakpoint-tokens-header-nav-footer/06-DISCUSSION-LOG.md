# Phase 6: Foundation & Global Chrome — Breakpoint Tokens, Header, Nav & Footer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-13
**Phase:** 6-Foundation & Global Chrome — Breakpoint Tokens, Header, Nav & Footer
**Areas discussed:** Breakpoint consolidation, Touch drag-scroll behavior, Nav drawer style, 100vh/dvh fix scope

---

## Breakpoint Consolidation

| Option | Description | Selected |
|--------|-------------|----------|
| Keep two tiers, documented | No visual behavior change — nav still collapses earlier (900px) than content (720px), but both become named tokens instead of independent literals | ✓ |
| Converge to one value | Pick a single breakpoint for both nav and content (e.g. 720px) — nav would stay in desktop layout longer than it does today | |

**User's choice:** Keep two tiers, documented (recommended option)
**Notes:** Confirms this phase is a documentation/token consolidation, not a behavior change to the nav-collapse point.

---

## Touch Drag-Scroll Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, native scroll on touch | Touch users get standard OS momentum/snap scrolling on strips — removes the jank risk research flagged, simplest fix | ✓ |
| Keep custom drag feel on touch too | Try to preserve the exact same JS-driven drag physics for touch, accepting more engineering risk of jank/double-handling | |

**User's choice:** Yes, native scroll on touch (recommended option)
**Notes:** Desktop mouse-drag behavior stays fully unchanged; only the touch path changes.

---

## Nav Drawer Style

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current style | Fix safe-area insets and tap targets on the existing full-width dropdown — matches research's "extend, don't invent" recommendation | ✓ |
| Redesign it | Use this phase to also change the visual pattern (e.g. a slide-in side drawer) | |

**User's choice:** Keep current style (recommended option)
**Notes:** No redesign requested — confirms the phase's fix-not-rebuild posture.

---

## 100vh/dvh Fix Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Just the 3 flagged spots | Matches the phase's fix-not-rebuild scope — hero, lightbox, and nav dropdown are the only places a user would actually notice the jump | ✓ |
| Audit all vh usage | Check every @media/height rule in eclat.css for the same bug, even ones research didn't flag as user-visible | |

**User's choice:** Just the 3 flagged spots (recommended option)
**Notes:** —

---

## Claude's Discretion

- Exact fluid `clamp()` values for typography/spacing tokens
- Whether to extract a shared `useBreakpoint.js` hook now vs. defer until a third JS breakpoint consumer appears
- Footer-specific CSS fixes (no gray area raised; treated as standard phone-width polish)

## Deferred Ideas

None — all four gray areas were resolved within phase scope; no scope-creep ideas surfaced during discussion.
