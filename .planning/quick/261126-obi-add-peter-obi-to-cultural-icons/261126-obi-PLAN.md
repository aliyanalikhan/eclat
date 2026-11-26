---
phase: quick-261126-obi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - public/assets/images/icons/peter-obi.png
  - src/data/content.js
autonomous: true
requirements: [ADD-PETER-OBI-CULTURAL-ICON]

must_haves:
  truths:
    - "Peter Obi icon image is saved as public/assets/images/icons/peter-obi.png"
    - "Peter Obi is added to the cultural icons array in content.js immediately after Pelé"
    - "Build and prerender succeed cleanly"
---

# Plan: Add Peter Obi to Cultural Icons

## Tasks
1. Convert and save `WhatsApp Image 2026-11-23 at 10.26.18 AM.jpeg` as `public/assets/images/icons/peter-obi.png`.
2. Add Peter Gregory Obi entry to `icons` in `src/data/content.js` immediately following Pelé.
3. Verify build and prerender with `npm run build`.
