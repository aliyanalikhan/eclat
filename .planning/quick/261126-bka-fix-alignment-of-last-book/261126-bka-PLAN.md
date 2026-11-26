---
phase: quick-261126-bka
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/Cover.jsx
  - src/styles/eclat.css
  - src/data/content.js
autonomous: true
requirements: [FIX-LAST-BOOK-ALIGNMENT]

must_haves:
  truths:
    - "All four books share the uniform 2:3 aspect ratio"
    - "The last book (We Come From Kings) bottom edge and caption align with the other three books"
    - "Build and prerender complete cleanly"
---

# Plan: Fix Alignment of Last Book

## Tasks
1. Add `cover--2x3` ratio class to `src/components/Cover.jsx` and `src/styles/eclat.css`.
2. Standardize `we-come-from-kings` and the other books to `ratio: '2/3'` in `src/data/content.js`.
3. Verify build and prerender with `npm run build`.
