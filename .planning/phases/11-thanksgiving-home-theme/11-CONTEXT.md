# Phase 11: Thanksgiving Home Theme - Context

**Gathered:** 2026-11-16
**Status:** Ready for planning

<domain>
## Phase Boundary

A seasonal Thanksgiving visual layer on the Éclat main page (Home route, `/`) only, turned on and off by one build-time constant. It covers a warm hero wash, six decorative leaves, a warmer books band, an ember glow on the closing CTA, and four themed copy strings. Layout, fan animation, covers, fonts, header, footer, SEO and every other route stay unchanged. The full visual contract is in `11-UI-SPEC.md` (approved).

</domain>

<decisions>
## Implementation Decisions

### Carried from the approved UI-SPEC (user-confirmed 2026-11-16)
- **D-01:** Seasonal, with one switch: `const THANKSGIVING = true` in `src/routes/Home.jsx` gates everything, and all CSS is scoped under `.home--thanksgiving` in one labelled block of `src/styles/eclat.css`. No runtime date logic, because the site is prerendered and a runtime date check would cause a hydration mismatch.
- **D-02:** Medium strength, exactly as specified in UI-SPEC §Color / §Leaves.
- **D-03:** Four themed strings (flag, h1, lede, CTA eyebrow). The original strings stay in code as the `false` branch of each ternary. Buttons and the CTA heading do not change.

### Headline & intro wording
- **D-04:** Hero h1 (themed) = **"A season of remarkable stories."** (31 chars, at or under the 39 limit). This replaces the UI-SPEC's earlier proposal "Giving thanks for remarkable stories."
- **D-05:** Hero lede (themed) = **"Éclat gives thanks for the visionaries, leaders, creators, and changemakers whose stories we share."** (99 chars, at or under the 103 limit)
- **D-06:** Flag and CTA eyebrow follow the UI-SPEC: "HAPPY THANKSGIVING · {TITLE}" and "With gratitude".

### Leaf illustration style
- **D-07:** Shapes are a **maple and oak mix**: two inline SVG `<symbol>`s (`tg-maple`, `tg-oak`), alternating 3 + 3.
- **D-08:** Style is **mixed**: 3 leaves solid-filled and 3 fine-line outlines (stroke ≈1.5, faint fill ≤0.15 opacity). Outline and filled leaves are spread across both shapes and both sides of the hero, so neither side looks heavier. Hues stay as in the UI-SPEC (rust, ochre, cranberry).

### Live dates
- **D-09:** Go live **as soon as it is built and verified**. There is no scheduled launch date and no date gating in code.
- **D-10:** Take-down date: **the user will decide**. The STATE.md reminder must not name a date. It says the theme is live and that turning it off means setting `THANKSGIVING = false` and redeploying, on a date the user chooses.

### Claude's Discretion
- The exact SVG path artwork for maple and oak, and which of the 6 positions get outline vs filled, provided D-07/D-08 and the UI-SPEC sizing/layering/reduced-motion rules hold.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract
- `.planning/phases/11-thanksgiving-home-theme/11-UI-SPEC.md` — the approved visual and interaction contract: tokens, leaf layout, layering, motion, copy limits, boundaries, and UI Considerations. Where it conflicts with this file, D-04..D-10 here win; the spec has already been updated to match them.

### Prior responsive/hero work (must not regress)
- `.planning/milestones/v1.2-ROADMAP.md` — v1.2 responsive tiers and hero fan animation
- `.planning/milestones/v1.2-phases/08-hero-animation-multi-device-adaptation/` — hero fan geometry and animation that the theme must not affect

### Security policy
- `vercel.json`, `public/_headers` — CSP; must remain untouched (no new origins)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prefersReducedMotion` in `src/lib/motion.js` and the global reduced-motion CSS rule: the leaf sway must stop under reduced motion.
- Existing `--accent` (rust) token in `eclat.css`, reused as one leaf hue and for the flag.

### Established Patterns
- The hero copy block is at `src/routes/Home.jsx` ~L199–213 (`.hero__flag`, `h1`, `.hero__lede`, all marked `data-hero-copy="1"`, which the hero animation uses). Themed strings must keep these elements and attributes; only the text changes.
- Inline `style={{...}}` is the house convention for one-off values (leaf CSS vars `--r`, `--d`).
- Temporary flags have a STATE.md reminder (the `TEMP_FREE_PREVIEW` precedent).

### Integration Points
- `<main id="main">` in `Home.jsx` (~L81) gets the `home--thanksgiving` class when the theme is on.
- The leaves go directly after `.hero__wash` inside `section.hero`.
- `prerender.js` bakes the themed HTML at build time, so check `dist/index.html` for the themed copy.

</code_context>

<specifics>
## Specific Ideas

- The user picked a less literal headline ("A season of…") over "Giving thanks…": the hero should feel seasonal and warm rather than holiday-greeting-card.
- Mixed outline and filled leaves give a layered collage feel that stays editorial.

</specifics>

<deferred>
## Deferred Ideas

- Closing CTA button copy "Subscribe" → "Subscribe to Éclat" (UI checker recommendation, out of scope for D-03)
- Automatic date-window activation (would need a build-time check plus a scheduled redeploy)

</deferred>

---

*Phase: 11-thanksgiving-home-theme*
*Context gathered: 2026-11-16*
