---
phase: quick-261126-bkc
plan: 01
subsystem: content-ui
tags: [books, images, css, responsive, content]
status: complete
requires: []
provides:
  - "Heir to the Obi book cover and metadata in library and home shelf"
  - "Under the Baobab book cover and metadata in library and home shelf"
  - "Responsive scaled book card sizing across desktop, tablet, and mobile"
affects: [/books, /, src/styles/eclat.css, src/data/content.js]
tech-stack:
  added: []
  patterns: ["Cover component with natural aspect ratios", "CSS auto-fill grid with mobile 2-column layout"]
key-files:
  created:
    - public/assets/images/books/heir-to-the-obi.jpg
    - public/assets/images/books/under-the-baobab.jpg
  modified:
    - src/data/content.js
    - src/routes/Books.jsx
    - src/data/seo.js
    - src/styles/eclat.css
    - public/assets/images/MANIFEST.md
---

# Quick Task Summary: Upload Book Covers & Scale Display Sizes

## Completed Work
1. **Added Cover Art**:
   - `heir-to-the-obi.jpg` (1066x1600, ~58 KB, warm cream `#efe7d4` tint)
   - `under-the-baobab.jpg` (1064x1600, ~65 KB, rich dark charcoal `#1a1511` tint)
2. **Registered in Content & SEO**:
   - Added both books to `books` array in `src/data/content.js` with natural aspect ratios, plate suppression (art has typography included), and editorial deks.
   - Updated lede and SEO descriptions in `src/routes/Books.jsx` and `src/data/seo.js` from "Two picture books" to inclusive library description.
   - Documented in `public/assets/images/MANIFEST.md`.
3. **Scaled Display Sizes in CSS**:
   - Adjusted `.books-grid` on desktop to use `repeat(auto-fill, minmax(230px, 1fr))` with `max-width: 1140px`, displaying the books in a clean, compact ~260px width instead of giant ~420px blocks.
   - Updated mobile breakpoint (<=640px) to use a 2-column layout (`repeat(2, minmax(0, 1fr))`) matching the site's magazine cover grid standard.
   - Capped home page `.cover--book` to `max-width: 270px` and set mobile `.shelf` to 2 columns so books remain well-proportioned across all viewports.
4. **Verification**:
   - `npm run build` completed successfully in ~1.5s with all 25 routes prerendered cleanly.
