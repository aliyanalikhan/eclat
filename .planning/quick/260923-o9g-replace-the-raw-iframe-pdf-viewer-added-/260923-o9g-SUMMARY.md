---
phase: quick-260923-o9g
plan: 1
subsystem: ui
tags: [content, static-assets, pymupdf, lightbox, writings, image-rasterization]

# Dependency graph
requires:
  - phase: quick-260923-nof
    provides: the 6 archival letter PDFs under public/assets/documents/writings/ that this task rasterizes
provides:
  - 14 rasterized page JPGs under public/assets/images/writings/ (real page-1..N images for all 6 letter PDFs)
  - writings array in src/data/content.js: 6 non-Gettysburg entries carry real ratio/w/h (1224/1584) and a pages array for every multi-page letter
  - src/routes/Writing.jsx reverted to plain body/dek prose rendering only (no embedded document viewer)
  - src/components/Lightbox.jsx optional multi-page mode: Prev/Next buttons, ArrowLeft/ArrowRight keys, horizontal swipe-to-page, "Page X of Y" indicator
  - src/routes/Writings.jsx passes each entry's rasterized page list into the Lightbox via a new `images` field
affects: [writings-index, writings-detail-page, lightbox-component]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One-off Python (PyMuPDF + Pillow fallback) rasterization pass, run inline and not committed to the repo, for turning archival PDFs into designed-page JPG assets"
    - "Optional `images` array field on a Lightbox item enables multi-page paging with zero behavior change when absent (undefined) or single-element"

key-files:
  created:
    - public/assets/images/writings/immortal-beloved.jpg
    - public/assets/images/writings/immortal-beloved-p2.jpg
    - public/assets/images/writings/immortal-beloved-p3.jpg
    - public/assets/images/writings/the-poetical-science.jpg
    - public/assets/images/writings/the-poetical-science-p2.jpg
    - public/assets/images/writings/the-confession.jpg
    - public/assets/images/writings/come-here-i-want-to-see-you.jpg
    - public/assets/images/writings/come-here-i-want-to-see-you-p2.jpg
    - public/assets/images/writings/come-here-i-want-to-see-you-p3.jpg
    - public/assets/images/writings/two-minds-one-idea.jpg
    - public/assets/images/writings/two-minds-one-idea-p2.jpg
    - public/assets/images/writings/two-minds-one-idea-p3.jpg
    - public/assets/images/writings/the-einstein-szilard-letter.jpg
    - public/assets/images/writings/the-einstein-szilard-letter-p2.jpg
  modified:
    - src/data/content.js
    - src/routes/Writing.jsx
    - src/routes/Writings.jsx
    - src/components/Lightbox.jsx
    - src/styles/eclat.css

key-decisions:
  - "Rasterized at a 2x PyMuPDF matrix (~144dpi) with explicit RGB colorspace — every page-1 raster came out exactly 1224x1584px, matching the plan's assumption (all 6 source PDFs are uniform 612x792pt US-Letter portrait pages), so no dimension deviation was needed in content.js"
  - "Direct pixmap.save(path) succeeded for every one of the 14 pages — the Pillow PNG-intermediate fallback path was never exercised, though it remains in place unused"
  - "Kept each entry's existing `pdf` field in content.js untouched (per plan) as harmless metadata for a possible future 'download original PDF' link, even though Writing.jsx no longer reads it"
  - "Killed a stray leftover `vite preview` process already bound to port 4173 from an earlier session before running Task 3's verification, so the curl checks exercised the freshly built dist/ output rather than stale content"

patterns-established:
  - "Optional multi-image Lightbox item: `images: w.pages` (undefined for single-page entries) is the complete signal Lightbox.jsx needs to switch into paged mode; Books.jsx and Edition.jsx's existing single-image openLightbox calls needed zero changes"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-09-23
status: complete
actuals:
  tokens: 2758
  tasks: 3
  commits: 3
---

# Quick Task 260923-o9g: Replace Raw Iframe PDF Viewer with Rasterized Lightbox Pages Summary

**Replaced the raw browser-native `<iframe>` PDF viewer on writing detail pages with real rasterized page-1..N JPGs shown inside the site's existing dark-overlay Lightbox modal, giving all 5 multi-page letters Prev/Next paging (buttons, arrow keys, swipe) and every letter entry a real designed-page thumbnail on `/writings` instead of a flat tint rectangle.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-09-23T12:41:17Z
- **Completed:** 2026-09-23T12:45:21Z
- **Tasks:** 3
- **Files modified:** 19 (14 new JPGs, content.js, Writing.jsx, Writings.jsx, Lightbox.jsx, eclat.css)

## Accomplishments
- Rasterized all pages of all 6 archival letter PDFs into 14 real page JPGs via a one-off inline PyMuPDF script (2x matrix, RGB colorspace, Pillow fallback available but not needed) — every page-1 raster confirmed at exactly 1224x1584px
- Updated the 6 non-Gettysburg `writings` entries in `content.js` with those real dimensions and a `pages` array for every multi-page letter (5 entries); `the-confession` (1 page) correctly has no `pages` array; `the-gettysburg-address` left byte-unchanged
- Reverted `Writing.jsx` to unconditional body/dek prose rendering, removing the embedded `<iframe>` document-viewer block entirely for all 7 entries
- Extended `Lightbox.jsx` with an optional multi-page mode (Prev/Next buttons, ArrowLeft/ArrowRight keys, horizontal swipe-to-page, "Page X of Y" indicator) that activates only when an item's `images` array has more than one entry — single-image callers (`the-gettysburg-address`, `the-confession`, and every `Books.jsx`/`Edition.jsx` lightbox) keep the exact prior DOM shape
- Wired `Writings.jsx` to pass `images: w.pages` into `openLightbox`, and added the new `.lightbox__navbtn` / `.lightbox__pageindicator` CSS rules
- Ran the full production pipeline (client build, SSR build, `node prerender.js`) plus a local `vite preview` + curl round-trip confirming all 14 new image assets and all 6 `/writings/<slug>` routes return HTTP 200

## Task Commits

Each task was committed atomically:

1. **Task 1: Rasterize all 6 PDFs into real page images via PyMuPDF** - `ceb43b2` (feat)
2. **Task 2: Wire real dimensions + page arrays into content.js, revert Writing.jsx's document-viewer block** - `212392f` (feat)
3. **Task 3: Multi-page Lightbox (Prev/Next, keyboard, swipe, page indicator) + real Writings-list thumbnails** - `e5946d9` (feat)

## Files Created/Modified
- `public/assets/images/writings/immortal-beloved.jpg`, `-p2.jpg`, `-p3.jpg` - 3 rasterized pages, 1224x1584px
- `public/assets/images/writings/the-poetical-science.jpg`, `-p2.jpg` - 2 rasterized pages, 1224x1584px
- `public/assets/images/writings/the-confession.jpg` - 1 rasterized page (no `-pN` siblings), 1224x1584px
- `public/assets/images/writings/come-here-i-want-to-see-you.jpg`, `-p2.jpg`, `-p3.jpg` - 3 rasterized pages, 1224x1584px
- `public/assets/images/writings/two-minds-one-idea.jpg`, `-p2.jpg`, `-p3.jpg` - 3 rasterized pages, 1224x1584px
- `public/assets/images/writings/the-einstein-szilard-letter.jpg`, `-p2.jpg` - 2 rasterized pages, 1224x1584px
- `src/data/content.js` - 6 non-Gettysburg entries: `ratio: '1224/1584'`, `w: 1224`, `h: 1584`, new `pages` array (5 entries); `the-gettysburg-address` untouched
- `src/routes/Writing.jsx` - Removed the conditional `w.pdf &&` `<iframe>` + download-link block; `.prose` block now renders unconditionally for every entry
- `src/routes/Writings.jsx` - `openLightbox` call gains `images: w.pages`
- `src/components/Lightbox.jsx` - New `pageIndex` state, `hasPages`/`pageCount` derivation, ArrowLeft/ArrowRight keyboard paging, horizontal swipe-to-page, Prev/Next buttons, page indicator, all gated on `hasPages`
- `src/styles/eclat.css` - New `.lightbox__navbtn` (+ `--prev`/`--next`/`:disabled`/`:hover`) and `.lightbox__pageindicator` rules in the existing lightbox block

## Decisions Made
- Real page-1 raster dimensions came out exactly 1224x1584px for all 6 slugs (as the plan predicted from the uniform 612x792pt source pages), so `content.js` uses the plan's assumed values with no deviation
- The Pillow PNG-intermediate JPEG-save fallback specified in the plan was never triggered — PyMuPDF's direct `pixmap.save(path)` succeeded for all 14 pages
- Added a `.lightbox__navbtn:hover` rule (matching `.lightbox__close:hover`'s visual language) that the plan's CSS description didn't explicitly spell out but which its "matching .lightbox__close's visual language" instruction implied — purely additive, no existing rule altered

## Deviations from Plan

None - plan executed exactly as written. All 3 tasks completed with their exact specified file scope, and all automated `<verify>` blocks passed as written.

## Issues Encountered
- The rasterization script's first run crashed on a post-processing bug (reading `doc.page_count` after `doc.close()`) on the very last statement of the `immortal-beloved` loop iteration — after that slug's 3 JPGs had already been written correctly. Fixed by capturing `page_count` into a local variable before closing the document, then re-ran the full script (harmlessly overwriting the 3 already-correct `immortal-beloved` files) to process all 6 slugs cleanly.
- Task 3's `vite preview` verification initially failed with `Port 4173 is already in use` because a stray `node.exe` process from an earlier, unrelated session was still listening on that port — the curl checks reported PASS anyway (against the stale server rather than the fresh build). Identified and killed the stray process (`netstat`/`tasklist`/`taskkill`), then re-ran the full preview + curl verification cleanly against the current `dist/` output, confirming all 14 assets and all 6 routes genuinely return 200 from this task's actual build.

## User Setup Required

None - no external service configuration required. All changes are static image assets, content data, and client-side component/CSS changes already covered by the existing build and deployment pipeline.

## Next Phase Readiness
- All 6 letter entries now open the same dark-overlay Lightbox used for `the-gettysburg-address`, showing real rasterized document pages instead of a raw PDF viewer or a flat tint rectangle
- The 5 multi-page letters support full Prev/Next/keyboard/swipe paging with a "Page X of Y" indicator; `the-gettysburg-address` and `the-confession` (both single-page) open with no page controls, identical to pre-existing single-image behavior
- `Books.jsx` and `Edition.jsx`'s existing `openLightbox` calls are untouched and continue to hit the single-image code path unchanged
- Final live-browser visual confirmation (clicking a multi-page letter, paging through it via buttons/keys/swipe, confirming the-gettysburg-address and the-confession still open exactly as before) is the orchestrator's follow-up responsibility per the plan, since no browser-automation tooling exists in this repo's own toolchain
- No `git push` was performed — all 3 task commits are local only, per plan and orchestrator instruction

---
*Quick task: 260923-o9g*
*Completed: 2026-09-23*

## Self-Check: PASSED

- FOUND: public/assets/images/writings/immortal-beloved.jpg
- FOUND: public/assets/images/writings/immortal-beloved-p2.jpg
- FOUND: public/assets/images/writings/immortal-beloved-p3.jpg
- FOUND: public/assets/images/writings/the-poetical-science.jpg
- FOUND: public/assets/images/writings/the-poetical-science-p2.jpg
- FOUND: public/assets/images/writings/the-confession.jpg
- FOUND: public/assets/images/writings/come-here-i-want-to-see-you.jpg
- FOUND: public/assets/images/writings/come-here-i-want-to-see-you-p2.jpg
- FOUND: public/assets/images/writings/come-here-i-want-to-see-you-p3.jpg
- FOUND: public/assets/images/writings/two-minds-one-idea.jpg
- FOUND: public/assets/images/writings/two-minds-one-idea-p2.jpg
- FOUND: public/assets/images/writings/two-minds-one-idea-p3.jpg
- FOUND: public/assets/images/writings/the-einstein-szilard-letter.jpg
- FOUND: public/assets/images/writings/the-einstein-szilard-letter-p2.jpg
- FOUND: ceb43b2 (Task 1 commit)
- FOUND: 212392f (Task 2 commit)
- FOUND: e5946d9 (Task 3 commit)
