---
phase: quick-261126-amz
plan: 01
subsystem: content-ui
tags: [books, amazon, links, shopping, ui]
status: complete
requires: []
provides:
  - "Available on Amazon outbound links on /books and Home page shelf"
affects: [/, /books, src/data/content.js, src/styles/eclat.css, src/routes/Books.jsx, src/routes/Home.jsx]
tech-stack:
  added: []
  patterns: ["book-buy-link quiet CTA styling", "conditional outbound link rendering"]
key-files:
  modified:
    - src/data/content.js
    - src/styles/eclat.css
    - src/routes/Books.jsx
    - src/routes/Home.jsx
---

# Quick Task Summary: Add Amazon Links for Books

## Completed Work
1. **Added Amazon URLs**:
   - *African Folklores*: `https://www.amazon.com/dp/B0HSP7J3XW`
   - *We Come From Kings*: `https://www.amazon.com/dp/B0HSQG8KLY`
2. **Added Styling & Link Components**:
   - Styled `.book-buy-link` in `src/styles/eclat.css` using narrow uppercase typography, accent coloring, and subtle arrow nudge on hover.
   - Rendered "Available on Amazon →" in `src/routes/Books.jsx` below the dek.
   - Rendered "Available on Amazon →" in `src/routes/Home.jsx` below the metadata label, restructuring the shelf card to keep cover clicks routing to `/books` while allowing direct outbound Amazon clicks without invalid nested anchors.
3. **Verification**:
   - Ran `npm run build` — verified client bundle, SSR bundle, and prerender of all 25 routes. Confirmed Amazon URLs present in `dist/index.html` and `dist/books/index.html`.
