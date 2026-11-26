---
phase: quick-261126-rbk
plan: 01
subsystem: content-ui
tags: [copy, navigation, books, branding]
status: complete
requires: []
provides:
  - "Generalised 'Books' nomenclature across header, footer, page headings, SEO, and subscription copy"
affects: [header, footer, /books, /, /subscribe, src/data/seo.js, src/data/products.js]
tech-stack:
  added: []
  patterns: ["site-wide copy alignment"]
key-files:
  modified:
    - src/components/Header.jsx
    - src/components/Footer.jsx
    - src/routes/Home.jsx
    - src/routes/Books.jsx
    - src/routes/Subscribe.jsx
    - src/data/seo.js
    - src/data/products.js
    - lib/products.js
    - public/assets/images/MANIFEST.md
---

# Quick Task Summary: Rename Children's Books to Books

## Completed Work
1. **Navigation & Headers**:
   - Header navigation item updated to `Books` (`src/components/Header.jsx`).
   - Footer navigation link updated to `Books` (`src/components/Footer.jsx`).
   - Home page library shelf section link updated to `Books →` (`src/routes/Home.jsx`).
2. **Page Headings & Copy**:
   - `/books` route title updated to `<h1 className="display">Books</h1>` (`src/routes/Books.jsx`).
   - Subscribe lede updated to "Full archive, all books, every essay..." (`src/routes/Subscribe.jsx`).
   - Product display names updated to `Book Online` and `Book Hard Copy` (`src/data/products.js`, `lib/products.js`).
3. **SEO & Manifest**:
   - Updated meta titles and descriptions in `src/data/seo.js` (`Books — Éclat`).
   - Updated heading in `public/assets/images/MANIFEST.md`.
4. **Verification**:
   - Ran `npm run build` — verified client bundle, SSR bundle, and prerender of all 25 routes.
