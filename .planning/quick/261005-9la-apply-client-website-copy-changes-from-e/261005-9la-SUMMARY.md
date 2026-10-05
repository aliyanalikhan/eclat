---
status: complete
quick_id: 261005-9la
commit: 6cadfc1
---

# Quick Task 261005-9la: Client website copy changes

Source: Eclat_Client_Website_Changes_for_Claude_Code.pdf

## Changes (commit 6cadfc1)
- `src/routes/Home.jsx`: hero button "Read the New Issue" -> "Read the Latest Edition" (destination unchanged).
- `src/routes/Home.jsx` + `src/styles/eclat.css`: closing CTA link now two rows in the same anchor: "Complimentary copy available to read at LaDidier.com →" / "Tap here" (CSS uppercases; href unchanged, glow kept). Hero complimentary button left as-is (already says "Copy").
- `src/routes/Home.jsx`: "New editions land bimonthly." -> "New Edition Bimonthly" (client's later message wins over "BIMONTHLY EDITIONS").
- `src/components/Footer.jsx` + CSS: "© 2026 Éclat" left, "Published by Éclat lifestyle LLC, Minnesota, USA" right; stacked and centered on mobile. Removed unused `SITE` import.
- `Subscribe.jsx` "Bi-monthly" untouched (subscription copy).

## Decisions
- Task 4 vs Task 6 conflict resolved with user: "New Edition Bimonthly".
- Tasks 1/3: two-row treatment on closing CTA only (user choice). No "COMPLIMENTARY EDITION" text existed in code.

## Verification
- Old phrases absent from `src/`. Client build, SSR build and prerender pass (24 routes). `npm run build` itself fails locally: `scripts/migrate.js` needs `POSTGRES_URL` (pre-existing, unrelated).
- Checked via vite preview at 1280px-class desktop and a 555px-wide window (browser minimum; true 390px not tested): CTA two rows centered, footer left/right on desktop and stacked on narrow, no horizontal overflow.
