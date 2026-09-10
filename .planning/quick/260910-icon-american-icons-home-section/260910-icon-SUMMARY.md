---
phase: quick-260910-icon
plan: 1
subsystem: ui
tags: [content, home, images, decoration]

requires: []
provides:
  - "Cultural Icons" decorative band on Home page (7 user-supplied tribute images with bio captions; renamed from "American Icons" — 2 of 7 aren't American)
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - public/assets/images/icons/louis-armstrong.png
    - public/assets/images/icons/elvis-presley.png
    - public/assets/images/icons/muhammad-ali.png
    - public/assets/images/icons/marilyn-monroe.png
  modified:
    - src/data/content.js
    - src/routes/Home.jsx

key-decisions:
  - "Flagged to user before placing: 2 of the 4 supplied images (Muhammad Ali, Marilyn Monroe) are styled as fake 'ÉcLat LiFeStyLe' magazine covers with a fabricated issue number/date/barcode — a different brand name than the site's real 'Éclat', readable as implying real past editorial content. User explicitly chose to keep them exactly as-is after being shown this."
  - "Reused the existing .band/.shelf pattern (same as Books & writings) verbatim — no new CSS needed since these are already-finished poster/cover images, not tint-fallback covers needing a title overlay."
  - "Images copied as-is (PNG, 2-2.8MB each) — no compression tooling available in this environment; flagged as a pre-deploy follow-up."

patterns-established: []

requirements-completed: []

duration: ~25min
completed: 2026-09-10
status: complete
---

# Quick Task 260910-icon: American Icons Home Section Summary

**Added a decorative "American Icons" band to the Home page using 4 user-supplied tribute images (Louis Armstrong, Elvis Presley, Muhammad Ali, Marilyn Monroe) — placed after user confirmed placement (home page) and confirmed keeping 2 fake-magazine-cover-styled images exactly as supplied despite a flagged concern.**

## Accomplishments
- Copied 4 user-supplied PNGs into `public/assets/images/icons/`.
- New `icons` export in `content.js` (slug/name/ratio/w/h per item).
- New "American Icons" `<section className="section">` on Home.jsx, between "Books & writings" and the closing CTA — reuses `.band`/`.shelf`/`Cover` exactly as the books section does, zero new CSS.
- Browser-verified: all 4 images load and render correctly in the grid.

## Task Commits
1. `2af6218` — feat(home): add American Icons decorative section

## Flagged, Not Blocking
- Ali/Marilyn images are styled as fake "ÉcLat LiFeStyLe" (not the site's real "Éclat") magazine covers with a fabricated Vol/No/date/barcode — could read as implying real past Éclat issues. User was shown this explicitly and chose to keep as-is.
- Source PNGs are 2-2.8MB each (9.6MB total across 4 images) — no compression tooling in this environment; worth optimizing before a real deploy.

---
*Quick task: 260910-icon*
*Completed: 2026-09-10*

## Extension (same session, immediately after): 3 more icons + bios

User supplied 3 more images (James Brown, Wole Soyinka, Fela Kuti) and asked for a short bio
under each icon. Added `bio` field to all 7 `content.js` icons entries (short, widely-documented
public facts — dates + primary claim to fame, no particular source cited) and a `<p className="label">`
caption under each `Cover` in the Home.jsx section. Renamed the section heading from "American Icons"
to "Cultural Icons" since Soyinka and Kuti are Nigerian, not American — reported to user, not asked
(low-stakes, easily-reversible naming call). Verified via prerendered `dist/index.html` grep (all 7
names + bio fragments present) rather than a full browser session, to conserve context budget.
Commit: `67952bd`.

## Self-Check: PASSED
- FOUND: `public/assets/images/icons/` (4 files)
- FOUND: `src/data/content.js` (icons export)
- FOUND: `src/routes/Home.jsx` (American Icons section)
- FOUND commit: `2af6218`
- Build verified: 11 routes prerendered, check-secrets clean
- Browser-verified: all 4 images render correctly
