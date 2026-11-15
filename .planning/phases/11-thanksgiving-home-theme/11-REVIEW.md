---
phase: 11-thanksgiving-home-theme
reviewed: 2026-11-15T23:16:04Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/routes/Home.jsx
  - src/styles/eclat.css
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-11-15T23:16:04Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

Scope: the phase 11 diff (`git diff e68ecdb -- src/routes/Home.jsx src/styles/eclat.css`). That is the `THANKSGIVING` constant, the `TG_LEAVES` array, the leaf SVG sprite and its six `<use>` instances, four copy ternaries, and the scoped `.home--thanksgiving` CSS block (eclat.css:1276-1401).

Checked and clean:
- **Hydration:** I served the existing `dist/` (built from this code) with `vite preview` and loaded `/` in headless Chrome over CDP at 390x697 and 1440x900. No console errors or warnings appeared, so there were no #418/#423/#425 hydration errors. The prerendered HTML serializes `style="--r:…;--d:…;color:…"`, `vector-effect`, `focusable` and `<use href>` the same way the client renders them. The gate is a build-time constant, so the server and client cannot disagree.
- **Duplicate ids / `<use href>`:** `tg-maple` and `tg-oak` each appear once in the document. There is no `<base>` tag that could break `#fragment` references. The sprite `<svg width=0 height=0>` is not `display:none`, so the symbols still render.
- **a11y:** `.tg-leaves` has `aria-hidden="true"`, which covers the sprite and all six leaves. Nothing inside it can take focus.
- **Pointer events / z-index:** `.tg-leaves` has `pointer-events: none`, which the SVG children inherit. It sits at z 1, below `.fan-origin` (z 2), `.hero__copy` (z 4) and `.hero__scroll` (z 5). `.hero` creates no stacking context and has `overflow: hidden`, so the leaves cannot paint outside it.
- **Scoping:** every new selector starts with `.home--thanksgiving`. The `--band` override only reaches `.band` inside Home's `<main>`.
- **Reduced motion:** the base style is `transform: rotate(var(--r))`. The scoped rule `animation: none !important` at specificity (0,2,0) beats the global `*` reduced-motion rule (0,0,0) whatever the source order.

The defect: the spec says the layering is "covered" and that "No leaf overlaps or obscures hero text or buttons". That claim was never measured, because `verify-hero.mjs` only measures the fan. I measured each visible leaf's box against the line boxes of the hero text (`Range.getClientRects()`) at 10 viewport sizes. Leaves overlap the h1, the flag or the primary button at 7 of the 10 sizes (results below).

## Warnings

### WR-01: At tablet and small-laptop widths, leaves 1 and 4 sit behind the hero h1, and leaf 2 sits behind the primary button

**File:** `src/styles/eclat.css:1322-1348` (`.tg-leaf--1`, `.tg-leaf--2`, `.tg-leaf--4`)
**Issue:** The themed h1 "A season of remarkable stories." is 8 characters shorter than the original, so between 768px and about 1300px it renders as a **single full-width line**. That line runs straight through the `top: 16%` / `top: 20%` band where leaves 1 and 4 sit. Measured results (leaf box vs text line box, in px):

| Viewport | Leaf | Leaf box | Overlaps |
|---|---|---|---|
| 768x877 | 1 | 23–103 x, 133–213 y | H1 line 70–698 x, 157–227 y (33px horizontal overlap) |
| 768x877 | 4 | 671–738 x, 168–235 y | H1 line (27px) |
| 768x877 | 2 | 77–120 x, 349–393 y | "Read the Latest Edition" button 83–338 x, 324–373 y |
| 820x1000 | 1 and 4 | — | H1 line 75–745 x, 175–250 y |
| 1024x700 | 1 and 4 | — | H1 line 94–930 x, 127–221 y (19px / 16px) |
| 1280x720 | 1 and 4 | — | H1 line 117–1163 x (about 6px each) |
| 1440x900 | all | — | clear |

The leaves paint below the copy, but the halo is nearly transparent at the edges (about 0.2 opacity at 88% of its radius). So the rust outline maple and the ochre oak show through behind the first and last glyphs of the display headline, which contradicts UI-SPEC § UI Considerations, layering row. The summary's verify-hero output cannot catch this because the harness does not look at `.tg-leaf`.
**Fix:** Move the edge leaves into the clear vertical gap between the h1 and the actions row for the 768–1365px tier, then re-measure:
```css
@media (min-width: 768px) and (max-width: 1365px) {
  .home--thanksgiving .tg-leaf--1 { top: 30%; }
  .home--thanksgiving .tg-leaf--4 { top: 34%; }
  .home--thanksgiving .tg-leaf--2 { top: 50%; }
}
```
Also add a leaf-vs-text intersection check to `verify-hero.mjs`, so the "covered" layering claim is actually tested. For each visible `.tg-leaf` box, check it against `Range.getClientRects()` of `.hero__flag`, `.hero h1`, `.hero__lede` and the `.hero__actions .btn` boxes, and fail on any intersection.

### WR-02: On phones 375px wide and narrower, both phone leaves sit behind the hero flag

**File:** `src/styles/eclat.css:1387-1399` (phone-tier `.tg-leaf--1`, `.tg-leaf--4`)
**Issue:** On phones, `.hero__copy` sits at `top: clamp(80px, 12vh, 120px)` and leaf 1 at `top: 12%` of a `100svh` hero. Both resolve to about 12% of the viewport, so leaf 1 always lands on the flag row. Whether it collides depends only on the flag's width. Measured:

| Viewport | Leaf 1 | Leaf 4 |
|---|---|---|
| 320x640 | overlaps the flag's `.dot` (16–23 x) | overlaps the flag text (51–286 x) by 8px; at this width the flag wraps to two lines |
| 360x740 | overlaps the `.dot` | overlaps the flag text tail by 12px |
| 375x667 | overlaps the `.dot` | overlaps the flag text tail by 5px |
| 390x697, 430x800 | clear | clear |

Leaf 4 is a **filled ochre** oak (`oklch(0.74 0.13 75)` at 0.85 opacity) behind 11px `--accent` rust text (`oklch(0.56 0.14 38)`). Rust on ochre is low contrast, so the last letters of "THE LEGACY ISSUE" get harder to read on 360px Android phones and on the iPhone SE/mini. Leaf 1 sits on the pulsing accent dot. Both break the spec's "No leaf overlaps or obscures hero text" layering rule.
**Fix:** The smallest correct fix is to drop the two phone leaves where the flag fills the row:
```css
@media (max-width: 389px) {
  .home--thanksgiving .tg-leaf--1,
  .home--thanksgiving .tg-leaf--4 { display: none; }
}
```
The alternative is to move them below the copy block, into the side gutters beside the lede (for example `top: 48%`), and then re-run the intersection check from WR-01 at 320, 360, 375 and 390.

## Info

### IN-01: The sway translate runs along the rotated axis, not straight down

**File:** `src/styles/eclat.css:1365-1372`
**Issue:** In `rotate(...) translateY(8px)` the translate is applied in the rotated frame. Leaf 6 (rest rotation 48deg, 56deg at the end of the sway) therefore moves mostly sideways, by about 6.6px left and 4.5px down, rather than "8px down" as the spec describes. This is cosmetic only, because `.hero { overflow: hidden }` keeps it contained.
**Fix:** If a vertical drift is intended, put the translate first: `transform: translateY(8px) rotate(calc(var(--r) + 8deg))`. Change the `from` frame to `translateY(0) rotate(var(--r))` so the two lists still interpolate.

### IN-02: `hue` holds full color values, not hues

**File:** `src/routes/Home.jsx:38-45`
**Issue:** `TG_LEAVES[].hue` holds complete CSS colors (`var(--accent)`, `oklch(...)`) and is passed as `color`. The name suggests a single hue angle.
**Fix:** Rename the field to `color`.

### IN-03: The theme CSS stays in the global bundle when switched off, and the leaves print

**File:** `src/styles/eclat.css:1276-1401`
**Issue:** `THANKSGIVING = false` turns the theme off, but it leaves about 125 lines of inert CSS in the stylesheet that every route downloads. The removal reminder in STATE.md covers this, so it is noted here for the take-down task only. Separately, `@media print` (eclat.css:2826) hides `.hero__scroll` but not `.tg-leaves`, so the leaves print.
**Fix:** At take-down, delete the block along with the constant, as D-01 already says. Optionally add `.tg-leaves` to the existing print `display: none` list.

---

_Reviewed: 2026-11-15T23:16:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
