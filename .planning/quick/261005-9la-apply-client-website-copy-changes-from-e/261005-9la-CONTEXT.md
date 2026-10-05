# Quick Task 261005-9la: Client website copy changes - Context

Source: ~/Downloads/Eclat_Client_Website_Changes_for_Claude_Code.pdf (read by orchestrator; decisions below are LOCKED).

## Code locations
- Hero: `src/routes/Home.jsx` ~L211 "Read the New Issue" (Link), ~L214-222 hero complimentary button (leave as is)
- Closing CTA: `src/routes/Home.jsx` ~L418-431: `.cta__complimentary` link + `.cta__lede` "New editions land bimonthly."
- Footer: `src/components/Footer.jsx` (`.footer__fine`), CSS `src/styles/eclat.css` ~L1989-2030 and mobile ~L2607-2650
- CTA CSS: `src/styles/eclat.css` ~L1191-1270
- `Subscribe.jsx:60` "Bi-monthly" is subscription copy: DO NOT TOUCH

## Locked decisions
1. Hero button `Read the New Issue` -> `Read the Latest Edition` (same Link destination; check CSS text-transform so it renders uppercase; check mobile wrapping).
2. Closing CTA link (`.cta__complimentary-link`, href unchanged https://ladidier.com/#read): two rows.
   Row 1: `COMPLIMENTARY COPY AVAILABLE TO READ AT LADIDIER.COM` (exact; write as-is uppercase or rely on existing CSS uppercase but text must read LADIDIER.COM, no accent).
   Row 2: `Tap here` (inside same link, same interaction). Spacing visually balanced/centered. Keep existing glow/animation/arrow styling; arrow may stay on row 1.
   Never use "COMPLIMENTARY EDITION". Hero complimentary button is NOT changed.
3. `.cta__lede` "New editions land bimonthly." -> `New Edition Bimonthly` (client's later message supersedes "BIMONTHLY EDITIONS"). Subscribe button unchanged.
4. Footer: left "© 2026 Éclat", right "Published by Éclat lifestyle LLC, Minnesota, USA" (replacing the single `.footer__fine` sentence), opposite sides, small-screen safe (wrap/stack, no overflow). Keep brand mark and nav.
Verification: `npm run build`, grep old phrases, check desktop (~1280px) and mobile (~390px) rendering.
