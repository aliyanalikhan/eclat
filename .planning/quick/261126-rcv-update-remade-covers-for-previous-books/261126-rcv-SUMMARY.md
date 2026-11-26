---
phase: quick-261126-rcv
plan: 01
subsystem: content
tags: [books, covers, images, assets]
status: complete
requires: []
provides:
  - "Updated remade high-fidelity cover for We Come From Kings (native 2:3 ratio)"
  - "Updated remade cover for African Folklores"
affects: [/, /books, src/data/content.js]
tech-stack:
  added: []
  patterns: ["PyMuPDF rasterization of vector PDF covers at 300 DPI"]
key-files:
  modified:
    - public/assets/images/books/we-come-from-kings.jpg
    - public/assets/images/books/african-folklores.jpg
    - src/data/content.js
---

# Quick Task Summary: Update Remade Covers for Previous Books

## Completed Work
1. **Rendered & Saved New Artwork**:
   - `we-come-from-kings.jpg`: Rendered from `We_Come_From_Kings_Front_Cover.pdf` at 300 DPI and scaled to a crisp `1200×1800` (exact 2:3 native aspect ratio, ~491 KB), featuring the new elegant framed illustration and typography.
   - `african-folklores.jpg`: Saved from `WhatsApp Image 2026-11-25 at 2.56.12 AM.jpeg` (`474×702`, ~159 KB), featuring the new nighttime lantern storytelling artwork.
2. **Updated Content Metadata**:
   - Updated `tint` to `#f5ead5` for *We Come From Kings* (matching the new cream border) and `#201404` for *African Folklores* in `src/data/content.js`.
3. **Verification**:
   - Ran `npm run build` — verified client bundle, SSR bundle, and prerender of all 25 routes.
