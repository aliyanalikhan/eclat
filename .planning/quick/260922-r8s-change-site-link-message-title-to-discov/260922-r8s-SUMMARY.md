---
id: 260922-r8s
type: quick
title: Change site link message title to Discover EcLat
status: complete
date: 2026-09-22
---

# Quick Task Summary: Change Site Link Message Title to "Discover EcLat"

## Changes Made
- Updated `src/data/seo.js`:
  - Changed `staticSeo['/'].title` from `'Éclat — A quarterly magazine of paying attention'` to `'Discover EcLat'`.
- Updated `src/data/seo-site.js`:
  - Changed `SITE.tagline` from `'A quarterly magazine of paying attention'` to `'Discover EcLat'`.
- Updated `public/site.webmanifest`:
  - Updated description to `"Discover EcLat — the complete archive, children's books and essays."`.

## Verification
- Ran `npm run build`: verified all routes prerendered cleanly with `<title>Discover EcLat</title>` and `<meta property="og:title" content="Discover EcLat" />`.
