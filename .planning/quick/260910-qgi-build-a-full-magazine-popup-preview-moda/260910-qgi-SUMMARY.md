---
phase: quick-260910-qgi
plan: 1
subsystem: content-presentation
tags: [magazine-preview, modal, ui, content]
status: complete
dependency-graph:
  requires: []
  provides: [magazine-preview-modal, edition-preview-page-count]
  affects: [src/routes/Edition.jsx]
tech-stack:
  added: []
  patterns:
    - "PyMuPDF (fitz) PDF-to-JPEG rasterization for build-time asset prep (one-off, outside the deployed app)"
    - "Local, self-contained page-flip modal mirroring Lightbox.jsx's a11y contract (same pattern as Videos.jsx's VideoModal)"
key-files:
  created:
    - public/assets/images/magazine-preview/1/page-01.jpg … page-60.jpg (60 files)
    - public/assets/images/magazine-preview/2/page-01.jpg … page-62.jpg (62 files)
    - src/components/MagazinePreview.jsx
  modified:
    - src/styles/eclat.css
    - src/data/content.js
    - src/routes/Edition.jsx
decisions:
  - "Rendered both source magazine PDFs to 1400px-wide, quality-78 JPEGs via a one-off Python/PyMuPDF script kept entirely outside the repo (OS temp scratchpad), matching tested compression settings exactly."
  - "MagazinePreview.jsx is fully self-contained (local useState, no store/Context dependency), following the Videos.jsx VideoModal precedent rather than the shared store-driven Lightbox."
  - "Edition.jsx's entitled branch branches on ed.previewPageCount > 0: when set, shows the new 'Preview the Full Issue' button + modal; when absent, falls back byte-for-byte to the original 3-paragraph excerpt rendering — no regression path for any future edition without rendered pages."
  - "Orchestrator manually reviewed MagazinePreview.jsx, the Edition.jsx/content.js diff, and the CSS diff in full before merging (clean fast-forward, commit 09b5956) given the size and scope of this change."
metrics:
  duration: ~35min
  completed: 2026-09-10
actuals:
  tokens: 24000
  tasks: 3
  commits: 3
---

# Phase quick-260910-qgi Plan 1: Full Magazine Pop-up Preview Modal Summary

Replaced the thin 3-paragraph "Full issue unlocked" text block on `/editions/:no` with a real full-magazine pop-up preview: a self-contained page-flip modal that pages through all 60 (No. 1) / 62 (No. 2) compressed page images rendered from the actual print magazine PDFs the user supplied.

## What Was Built

**Task 1 — Rendered both magazine PDFs to compressed JPEG page images.** Used Python/PyMuPDF (`fitz`) via a one-off script written to the OS temp scratchpad — never inside the repo. Rendered every page of both source PDFs at 1400px width, JPEG quality 78, to zero-padded filenames (`page-01.jpg` … `page-60.jpg` / `page-62.jpg`) under `public/assets/images/magazine-preview/1/` and `.../2/`. 122 files total, 43MB combined. Source PDFs (343MB / 179MB — both far over GitHub's 100MB push limit) and the script never touched the repo.

**Task 2 — Built the MagazinePreview modal component and its CSS.** New `src/components/MagazinePreview.jsx` mirrors `Lightbox.jsx`'s accessibility contract (focus trap, scroll lock with scrollbar-gap compensation, Escape-to-close, backdrop-click-to-close, focus restore) plus page navigation: `ArrowLeft`/`ArrowRight` keydown handlers, Previous/Next buttons, an `N / total` `aria-live` counter. Entirely self-contained. New scoped `.magazine-preview__*` CSS rules added to `eclat.css`, no existing rule modified.

**Task 3 — Wired `previewPageCount` into content.js and the Edition page.** Added `previewPageCount: 60`/`62` to editions No. 1/No. 2. `Edition.jsx`'s `kind === 'entitled'` branch now checks `ed.previewPageCount > 0`: true → excerptBy byline + "Preview the Full Issue" button + `MagazinePreview` modal; false → original unchanged paragraph rendering (fallback preserved for any future edition without rendered pages). The `loading` and not-entitled/paywall branches were left completely untouched.

## Verification

- `npm run build` (via individual `vite build` / `vite build --ssr` / `prerender.js` steps, since `scripts/migrate.js` needs `POSTGRES_URL` not set in this sandbox) completed cleanly, both during execution and again after the orchestrator's merge into master.
- `dist/editions/1/index.html` and `dist/editions/2/index.html` prerendered shells confirmed unchanged (presentation-only change, per D-10 this route stays static-shell + client-fetched).
- All 122 JPEGs confirmed copied to `dist/assets/images/magazine-preview/{1,2}/` (60 + 62 files) both times.
- `git status` confirmed clean at every checkpoint — no source PDFs or Python script ever touched the repo.
- Orchestrator manually reviewed `MagazinePreview.jsx`, the `Edition.jsx`/`content.js` diff, and the CSS diff line-by-line before merging — all matched the plan exactly, fallback path intact, no existing code/rules disturbed.
- `Lightbox.jsx`, `store.jsx`, `api/content/editions/[no].js` (including `TEMP_FREE_PREVIEW`), and `vercel.json` all confirmed untouched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Windows codepage mangling of accented source-PDF filenames in the Python conversion script**
- **Found during:** Task 1
- **Issue:** The script's hardcoded accented paths (`É`, `ié`) mangled under the shell's active codepage, throwing `FileNotFoundError`.
- **Fix:** Resolved the two source PDFs via `os.listdir()` + ASCII-safe substring matching instead of hardcoding the accented filenames; derived the project root from `os.getcwd()`.
- **Files modified:** none (fix was entirely within the temp scratchpad script, never committed)

No other deviations — Tasks 2 and 3 executed exactly as specified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Edition pages No. 1 and No. 2 now show a real "Preview the Full Issue" button opening a working page-flip modal through the actual magazine content.
- Repo size grew by ~43MB (122 JPEGs) — acceptable, all individual files well under any size limit.
- This sits entirely on top of the existing `TEMP_FREE_PREVIEW` bypass from quick task `260910-pj6` — when that flag is eventually reverted to `false`, the "Preview the Full Issue" button will only appear for genuinely entitled (subscribed) users, same as the rest of the entitled branch. The rendered page images themselves remain publicly fetchable by direct URL even after that revert (flagged in the plan's threat model as an accepted, out-of-scope limitation — static assets were never part of the server-side entitlement boundary in this app).
- Pushed to `origin/master`.

---
*Phase: quick-260910-qgi*
*Completed: 2026-09-10*

## Self-Check: PASSED

- FOUND: public/assets/images/magazine-preview/1/page-01.jpg, page-60.jpg
- FOUND: public/assets/images/magazine-preview/2/page-01.jpg, page-62.jpg
- FOUND: src/components/MagazinePreview.jsx
- FOUND commits: ef79e49, 28cb3b3, 09b5956
- Post-merge build + prerender re-verified clean; orchestrator manually reviewed full diff before merge
