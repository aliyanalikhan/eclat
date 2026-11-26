---
phase: quick-261126-amz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/content.js
  - src/styles/eclat.css
  - src/routes/Books.jsx
  - src/routes/Home.jsx
autonomous: true
requirements: [ADD-AMAZON-BOOK-LINKS]

must_haves:
  truths:
    - "Amazon links for African Folklores and We Come From Kings are added to content.js"
    - "Available on Amazon links render on /books page"
    - "Available on Amazon links render on Home page shelf"
    - "Build and prerender complete cleanly"
---

# Plan: Add Amazon Links for Books

## Tasks
1. Add `amazonUrl` to *African Folklores* and *We Come From Kings* in `src/data/content.js`.
2. Add `.book-buy-link` CSS in `src/styles/eclat.css`.
3. Render `Available on Amazon →` in `src/routes/Books.jsx` and `src/routes/Home.jsx`.
4. Verify build and prerender with `npm run build`.
