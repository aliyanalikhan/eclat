---
phase: quick-260910-fr3
plan: 1
subsystem: ui
tags: [react, content, react-router]

requires: []
provides:
  - "Edition page's 'Inside this edition' free-preview strip now renders real, edition-specific content instead of a shared placeholder"
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/routes/Edition.jsx
    - src/data/content.js

key-decisions:
  - "Reused the existing `articles` array (already consumed by Home.jsx) filtered by `editionNo === ed.no`, instead of inventing new per-edition preview data or a new content field."
  - "Preview-strip items now use a fixed 360px/4:3 size (matching how Home.jsx already renders these same article images) since `articles` entries don't carry the bespoke per-item `w`/`ratio` fields the deleted `samples` placeholder had."

patterns-established: []

requirements-completed: []

duration: ~15min
completed: 2026-09-10
status: complete
---

# Quick Task 260910-fr3: Edition-specific free-preview strip Summary

**Edition page's "Inside this edition" strip now renders real per-edition `articles` (filtered by `editionNo`) instead of a shared, edition-agnostic `samples` placeholder referencing a nonexistent "no-48" edition.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 1/1
- **Files modified:** 2

## Accomplishments
- `src/routes/Edition.jsx` preview strip is now edition-scoped: derives `editionArticles = articles.filter((a) => a.editionNo === ed.no)` right after the `!ed` guard, and maps over it instead of the old global `samples` array.
- Strip items now show each edition's real article title as the caption, and open the lightbox with the correct `tint`/`img`/`alt`/`label` sourced from that article.
- Removed the dead `samples` export (58 lines of generic bakery/village placeholder data with `no-48` image paths that matched no real edition) from `src/data/content.js`.

## Task Commits

1. **Task 1: Make the free-preview strip edition-specific using real `articles` data; remove the dead `samples` placeholder** - `71b37cf` (feat)

## Files Created/Modified
- `src/routes/Edition.jsx` - Preview strip now imports and filters `articles` by `ed.no`; strip section wrapped in a length guard; click handler builds the `{tint, img, alt, label, ratio}` shape `Lightbox.jsx` expects.
- `src/data/content.js` - Deleted the unused `samples` export.

## Decisions Made
- Fixed strip-item sizing (360px width, 4:3 aspect ratio) chosen to match how `Home.jsx` already renders these same `articles` images, since the old `samples`-only `w`/`ratio` fields don't exist on `articles` entries.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
`npm run build`'s first step (`scripts/migrate.js`) requires `POSTGRES_URL`, which isn't set in this sandbox — a pre-existing environment gap unrelated to this change. Verified the remaining pipeline directly instead: `vite build`, `vite build --ssr`, and `node prerender.js` all succeeded, and the prerendered HTML confirms `/editions/1` shows "The Green Heart of the City" while `/editions/2` shows "The Power of Vision" and "Cracked Open" — distinct, real per-edition content. `grep -rn "samples" src/` returns zero matches.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Content-wiring fix only; no impact on the in-progress auth/entitlement/paywall milestone (Phase 4/5 work untouched). No blockers.

---
*Quick task: 260910-fr3*
*Completed: 2026-09-10*
