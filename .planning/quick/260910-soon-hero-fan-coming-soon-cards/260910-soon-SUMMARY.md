---
phase: quick-260910-soon
plan: 1
subsystem: ui
tags: [css, animation, home, hero]

requires: []
provides:
  - Hero fan always shows a full 5-card spread regardless of real edition count
  - Blurred "Coming Soon" placeholder cards fill unclaimed fan slots
affects: []

tech-stack:
  added: []
  patterns:
    - "backdrop-filter: blur() on an overlay child instead of filter: blur() on the card itself, to blur the background layer without blurring the label sitting on top of it"

key-files:
  created: []
  modified:
    - src/routes/Home.jsx
    - src/styles/eclat.css

key-decisions:
  - "Reused Cover's existing tint+stripe-texture fallback (already the site's established 'no real cover art yet' visual) for the placeholder background, rather than inventing a new empty-state treatment."
  - "Placeholders always land in outer/mid slots, never centre — guaranteed by FAN_FILL_ORDER filling the lead slot first from real editions, so this needed no extra guard logic."
  - "Used a muted, low-chroma tint (oklch(0.4 0.01 80)) distinct from the vivid per-issue tints real editions use, so a placeholder never reads as an uncovered real edition."

patterns-established:
  - "backdrop-filter-on-overlay-child is now the established way to blur a card's background without blurring text/children rendered on top of it in this codebase."

requirements-completed: []

duration: ~30min
completed: 2026-09-10
status: complete
---

# Quick Task 260910-soon: Hero Fan "Coming Soon" Placeholder Cards Summary

**Filled the hero fan's empty slots (3 of 5, given only 2 real editions exist) with blurred "Coming Soon" placeholder cards, so the carousel stays visually balanced instead of looking sparse.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-09-10
- **Files modified:** 2

## Accomplishments

- `buildFan` now fills every unclaimed slot with a `{ comingSoon: true, ed: { no: 'soon-N', tint: COMING_SOON_TINT } }` marker instead of leaving it `null` (previously dropped via `flatMap`).
- Render map branches on `f.comingSoon`: renders the same `Cover` component real cards use (same tint+stripe-texture fallback, same `data-fan`/`data-fx`/`data-fy`/`data-fr` animation contract — `useScrollFx` needed zero changes), with a `backdrop-filter: blur(9px)` overlay carrying the "Coming Soon" label.
- `backdrop-filter` (blurs what's behind the element) used instead of `filter: blur()` on the whole card (which would blur its own children too) — this is what lets the label stay crisp.

## Task Commits

1. `e051aa3` — feat(home): fill empty hero fan slots with blurred "Coming Soon" cards

## Browser Verification

Ran `npm run dev`, loaded `/`, scrolled to trigger the fan-open animation. Confirmed:
- Full 5-card spread: 3 blurred "Coming Soon" cards (far-left, mid-left, far-right) + 2 real editions (centre lead, mid-right).
- Blur is real (zoomed screenshot shows the stripe texture visibly softened behind crisp "COMING SOON" text), not just a flat overlay.
- At rest (unscrolled, stacked state) the placeholders sit naturally in the stack behind the lead cover — no premature "Coming Soon" text visible, no layout break.

## Deviations from Plan

None — executed directly given the fix was small, well-scoped, and a direct continuation of the previous quick task's own documented tradeoff.

## Next Steps

None — this closes the sparseness gap flagged in the previous quick task (260910-vid). As real editions are added, they'll naturally displace these placeholders outward per the existing `FAN_FILL_ORDER` logic; no further changes needed when edition #3 ships.

---
*Quick task: 260910-soon*
*Completed: 2026-09-10*

## Extension (same session, later): real blurred photo instead of flat tint

User asked for the Coming Soon cards to blur a "random magazine cover" photo instead of a flat
tint. Two Unsplash "magazine covers stack" search results were rejected after inspection — both
showed real, identifiable, currently-published magazines (Bon Appétit, an IKEA catalog) fully
legible in the source photo, a copyright/trademark risk even though the on-screen result would be
blurred (the stored repo asset itself would still be a crisp reproduction). Flagged this to the
user via AskUserQuestion; user chose to keep searching for an unbranded option. Found one via a
"blank magazine mockup" search: a genuinely blank, portrait-oriented mockup photo (Unsplash,
free-license, no real branding) — saved as `public/assets/images/covers/coming-soon.jpg`. Wired
into the existing `Cover`'s `img` prop; no changes needed to the backdrop-filter blur CSS since it
already blurs whatever renders behind the "Coming Soon" label. Verified in-browser (zoomed
screenshot confirms the photo is visible-but-blurred behind the crisp label). Commit: `21f9da5`.

## Extension 2 (same session): drawn CSS cover instead of any photo

User asked to remove the stock photo entirely and draw a sample cover in CSS instead. Deleted
`coming-soon.jpg`; added `.fan-card__sample` (masthead text + image-well box + cover-line bars)
rendered behind the existing blur overlay. First attempt (thin near-white details on the dark
tint) was invisible after blur+compression — fixed with a distinct lighter card background
(#d8d2c4) and dark text/lines, verified visible in-browser. Zero external assets now. Commit:
`34a1e02`.

## Self-Check: PASSED

- FOUND: `src/routes/Home.jsx` (buildFan + render map changes)
- FOUND: `src/styles/eclat.css` (.fan-card__soon, .fan-card__soon-label)
- FOUND commit: `e051aa3`
- Build verified: 11 routes prerendered, check-secrets clean
- Browser-verified: full 5-card spread, real blur confirmed via zoomed screenshot, rest state unaffected
