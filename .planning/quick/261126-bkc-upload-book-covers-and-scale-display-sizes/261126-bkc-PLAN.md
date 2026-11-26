---
phase: quick-261126-bkc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - public/assets/images/books/heir-to-the-obi.jpg
  - public/assets/images/books/under-the-baobab.jpg
  - public/assets/images/MANIFEST.md
  - src/data/content.js
  - src/data/seo.js
  - src/routes/Books.jsx
  - src/styles/eclat.css
autonomous: true
requirements: [UPLOAD-BOOK-COVERS, SCALE-BOOK-DISPLAY-SIZES]

must_haves:
  truths:
    - "Heir to the Obi cover is saved and published with accurate metadata"
    - "Under the Baobab cover is saved and published with accurate metadata"
    - "Book covers scale nicely on desktop, tablet, and mobile without blowing up into giant monoliths"
    - "Build and prerender complete with zero errors or warnings"
---

# Plan: Upload Book Covers and Scale Display Sizes

## Tasks
1. Copy and optimize user-provided book covers into `public/assets/images/books/`.
2. Add new books to `books` array in `src/data/content.js`.
3. Update lede copy in `src/routes/Books.jsx` and description in `src/data/seo.js`.
4. Scale down book display sizes and improve responsiveness in `src/styles/eclat.css`.
5. Update `MANIFEST.md` and verify with `npm run build`.
