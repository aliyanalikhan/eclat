---
phase: quick-261126-rcv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - public/assets/images/books/we-come-from-kings.jpg
  - public/assets/images/books/african-folklores.jpg
  - src/data/content.js
autonomous: true
requirements: [UPDATE-REMADE-BOOK-COVERS]

must_haves:
  truths:
    - "We Come From Kings cover updated with high-res render from user-supplied PDF in 2:3 ratio"
    - "African Folklores cover updated with new user-supplied artwork"
    - "Content metadata tints and dimensions updated"
    - "Build and prerender complete cleanly"
---

# Plan: Update Remade Covers for Previous Books

## Tasks
1. Render and optimize `We_Come_From_Kings_Front_Cover.pdf` to `public/assets/images/books/we-come-from-kings.jpg` (1200x1800, 2:3).
2. Process and optimize `WhatsApp Image 2026-11-25 at 2.56.12 AM.jpeg` to `public/assets/images/books/african-folklores.jpg`.
3. Update metadata tints and dimensions in `src/data/content.js`.
4. Verify build and prerender with `npm run build`.
