---
phase: quick-261126-bka
plan: 01
subsystem: content-ui
tags: [books, layout, alignment, aspect-ratio, css]
status: complete
requires: []
provides:
  - "Uniform 2:3 aspect ratio across all 4 books on Home shelf and Books page"
  - "Equal height and baseline alignment for We Come From Kings"
affects: [/, /books, src/components/Cover.jsx, src/styles/eclat.css, src/data/content.js]
tech-stack:
  added: []
  patterns: ["cover--2x3 standard ratio class"]
key-files:
  modified:
    - src/components/Cover.jsx
    - src/styles/eclat.css
    - src/data/content.js
---

# Quick Task Summary: Fix Alignment of Last Book

## Completed Work
1. **Identified Root Cause**:
   - The first three books had aspect ratios of ~2:3 (`1066/1600`, `1064/1600`, `515/807`), while "We Come From Kings" had `ratio: '3/4'` (0.75 vs 0.66). In a grid with equal column widths, a 3:4 ratio rendered the 4th book ~40px shorter than the others, pulling its bottom edge and metadata caption out of alignment.
2. **Standardized Aspect Ratio & Sizing**:
   - Added `cover--2x3` with `aspect-ratio: 2 / 3` in `src/styles/eclat.css` and mapped `'2/3': 'cover--2x3'` in `src/components/Cover.jsx`.
   - Updated all 4 books in `src/data/content.js` to `ratio: '2/3'`, ensuring all covers have mathematically identical height, matching top/bottom baselines, and aligned captions.
3. **Verification**:
   - Ran `npm run build` — verified client bundle, SSR bundle, and prerender of all 25 routes. All 4 books render with `cover--2x3` cleanly.
