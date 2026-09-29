---
status: complete
---
# Quick 260929-iss3: Add Issue 3 (The Legacy Issue), archive Issue 2, hero triptych

- Rasterized ECLAT ISSUE 3 PDF (70 pp) to `public/assets/images/magazine-preview/3/` (1400px) and cover `covers/no-3-eclat-vol-3.jpg`.
- `content.js`: edition 3 added as newest (isNew); edition 2 no longer NEW (archived, still in /archive).
- `lib/gated-content.js`: server-side gated copy for edition 3.
- `Home.jsx`: hero fan = triptych (No.3 centre, No.2 right, No.1 left, no Coming Soon cards); removed hard-coded Issue-1 copy under "Newest issue".
- Verified: build passes, hero rendered in browser.
