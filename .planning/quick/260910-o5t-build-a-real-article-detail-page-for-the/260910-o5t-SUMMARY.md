---
phase: quick-260910-o5t
plan: 1
subsystem: ui
tags: [react, react-router, content, seo, prerender]

# Dependency graph
requires: []
provides:
  - "src/routes/Writing.jsx — single-article detail page at /writings/:slug"
  - "writingBySlug(slug) lookup helper in content.js"
  - "writingSeo(w) SEO helper in seo.js, wired into allRoutes() for prerendering"
  - "Real, verbatim 3-paragraph Gettysburg Address body text on the-gettysburg-address writings entry"
  - "yes-we-can-2008 teaser entry exercising the dek-only fallback path"
affects: [writings, content-model, seo]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Detail-page pattern mirrored from Edition.jsx: useParams -> lookup helper -> useSeo(found/not-found ternary) -> `if (!x) return <NotFound />` guard -> render"
    - "Optional per-entry `body: string[]` field on a content.js array, with dek used as fallback when absent"

key-files:
  created:
    - src/routes/Writing.jsx
    - public/assets/images/writings/yes-we-can-2008.jpg
  modified:
    - src/data/content.js
    - src/data/seo.js
    - src/App.jsx
    - src/routes/Writings.jsx

key-decisions:
  - "Followed the plan's verbatim instruction to copy the Gettysburg Address's three paragraphs exactly as given (public-domain, 1863 US historical speech), with no summarizing or rewording."
  - "yes-we-can-2008 entry intentionally carries no body field and no transcription/paraphrase of the actual 2008 speech — only an original-wording dek and the short title phrase; no source document for that speech was supplied, and unlike Gettysburg it is a modern copyrighted work."
  - "Orchestrator merged this task's branch as a clean fast-forward onto master (commit 79b8ba9) — no divergence with prior same-session tasks this time."

patterns-established:
  - "Any future writings entry can add a `body: string[]` array to get a full detail page automatically render its content; omitting `body` falls back to rendering the dek as a single paragraph."

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-09-10
status: complete
---

# Quick Task 260910-o5t: Real Article Detail Page for Writings Summary

**New `/writings/:slug` detail route (mirroring Edition.jsx's pattern) renders full article body text when present, falling back to the dek when absent — exercised by the real 1863 Gettysburg Address full text and a new dek-only Yes We Can teaser entry.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-10T12:29:00Z
- **Completed:** 2026-09-10T12:35:04Z
- **Tasks:** 3 completed
- **Files modified:** 6 (2 new, 4 modified)

## Accomplishments

- `src/data/content.js`'s `writings` array now supports an optional `body: string[]` field
- `the-gettysburg-address` entry carries the real, verbatim 3-paragraph text of Lincoln's 1863 Gettysburg Address
- New `yes-we-can-2008` entry added with no `body` field, exercising the dek-only fallback path, plus a byte-identical copy of the placeholder cover image
- `writingBySlug(slug)` lookup helper exported from `content.js`
- New `src/routes/Writing.jsx` detail page, wired into `src/App.jsx` (`/writings/:slug`, registered before the catch-all) and `src/data/seo.js` (`writingSeo(w)`, looped into `allRoutes()` for prerendering + sitemap)
- `src/routes/Writings.jsx` card titles are now `Link`s into the new detail pages, with `stopPropagation` so a title click navigates without also popping the existing zoom lightbox

## Task Commits

Each task was committed atomically (in the executor's isolated worktree, then fast-forward merged):

1. **Task 1: Add optional `body` field, populate the Gettysburg Address's full text, add the Yes We Can teaser entry, copy its cover image, add writingBySlug helper** - `2b3c12b` (feat)
2. **Task 2: Build the Writing.jsx detail route and wire it into App.jsx and seo.js** - `7833d41` (feat)
3. **Task 3: Link each Writings card's title to its new detail page** - `79b8ba9` (feat)
4. **Merge into master** - fast-forward, no separate merge commit needed (clean ancestor relationship)

_No TDD tasks; each task is a single atomic commit._

## Files Created/Modified

- `src/data/content.js` - added optional `body` field, real Gettysburg Address body text, `yes-we-can-2008` entry, `writingBySlug` export
- `public/assets/images/writings/yes-we-can-2008.jpg` - byte-identical copy of `the-gettysburg-address.jpg`
- `src/routes/Writing.jsx` - new detail page component (Cover, byline, title, body-or-dek)
- `src/data/seo.js` - added `writings` import, `writingSeo(w)` export, `allRoutes()` writings loop
- `src/App.jsx` - added `Writing` import and `/writings/:slug` route
- `src/routes/Writings.jsx` - card title wrapped in a `Link` with `stopPropagation`

## Decisions Made

- Copied the Gettysburg Address paragraphs verbatim from the plan's action text (no retyping from memory), per the plan's strict copyright boundary — safe because it is unambiguous 1863 public-domain historical text.
- Did not add a `body` field to `yes-we-can-2008` and did not write any part of the actual "Yes We Can" speech text anywhere in code, comments, or commit messages — only an original-wording dek and the short title phrase are used.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build`'s first step (`scripts/migrate.js`) failed on the missing `POSTGRES_URL` env var, exactly as the plan's `<verification>` anticipated as a known, pre-existing sandbox gap unrelated to this change. Fell back to running the remaining build steps individually (`vite build`, `vite build --ssr src/entry-server.jsx --outDir dist/server`, `node prerender.js`, `node scripts/check-secrets.js`) per the plan's documented fallback — all completed cleanly, both during execution and again after the orchestrator's merge into master.
- Confirmed `dist/writings/the-gettysburg-address/index.html` and `dist/writings/yes-we-can-2008/index.html` both exist with correct `<title>` tags, both paths present in `dist/sitemap.xml`, the Gettysburg Address body text renders in its static HTML, the Yes We Can page correctly falls back to its dek text, all six pre-existing body-less writings entries still prerender and fall back to their own dek text, and `check-secrets.js` found no leaked secrets in `dist/`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The Writings section now has a working detail-page pattern; any future writings entry can opt into a full article body by adding a `body: string[]` field, or remain a teaser by omitting it.
- Pushed to `origin/master` (commit `79b8ba9`) to trigger the linked Vercel deployment.
- No blockers. This quick task is fully self-contained and does not affect any other in-flight phase (04/05 gating and account work).

---
*Quick task: 260910-o5t*
*Completed: 2026-09-10*

## Self-Check: PASSED

All created/modified files confirmed present (src/routes/Writing.jsx, public/assets/images/writings/yes-we-can-2008.jpg, src/data/content.js, src/data/seo.js, src/App.jsx, src/routes/Writings.jsx). All 3 task commits confirmed in git log (2b3c12b, 7833d41, 79b8ba9). Post-merge build + prerender re-verified.
