---
phase: 11-thanksgiving-home-theme
verified: 2026-11-16T00:00:00Z
status: gaps_found
score: 12/15 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "layering: no leaf overlaps or obscures hero text or buttons (UI-SPEC § UI Considerations, layering row, marked covered; PLAN truth 'no leaf covers hero text or buttons')"
    status: failed
    reason: "z-index 1 and pointer-events: none are correct, so no leaf paints over text or takes clicks. But leaf boxes intersect hero text and button boxes at 7 of 11 measured viewports, and screenshots show the leaves visibly sitting behind the first and last glyphs of the h1 (768-1280px) and on the flag row (320-375px). The themed h1 is shorter, so from 768px to about 1300px it becomes a single full-width line that runs through the top: 16% / 20% band where leaves 1 and 4 sit."
    artifacts:
      - path: "src/styles/eclat.css"
        issue: "Lines 1322-1348: .tg-leaf--1 (top 16%), .tg-leaf--4 (top 20%) and .tg-leaf--2 (top 40%) collide with the h1 line or the 'Read the Latest Edition' button at 768x877, 820x1000, 1024x700 and 1280x720"
      - path: "src/styles/eclat.css"
        issue: "Lines 1387-1399: the phone tier puts .tg-leaf--1 (top 12%) on the flag's accent dot and .tg-leaf--4 (top 14%) on the tail of the flag text at 320x640, 360x740 and 375x667"
    missing:
      - "Reposition leaves 1, 2 and 4 for the 768-1365px tier so they clear the h1 line box and the .hero__actions buttons (the review's WR-01 suggests top 30% / 50% / 34%)"
      - "On phones below 390px, hide leaves 1 and 4 or move them clear of .hero__flag (WR-02)"
      - "Re-run a leaf-vs-text intersection check at 320, 360, 375, 390, 430, 768, 820, 1024, 1280 and 1440, and add it to verify-hero.mjs so the 'covered' claim is actually tested"
human_verification:
  - test: "Visual check at phone 390x844 with touch emulation, tablet 768x1024 and desktop 1440x900"
    expected: "The fan opens and seats as before, the leaves read as quiet edge decoration, the books band is a warmer cream, and the CTA ember is a soft glow from the bottom"
    why_human: "Aesthetic judgement ('decoration, not clutter') cannot be measured"
  - test: "With NVDA or Narrator, read the Home hero"
    expected: "'Happy Thanksgiving · The Legacy Issue' is announced once, and nothing is announced or focusable for the leaves"
    why_human: "The markup is correct (aria-hidden on .tg-leaves, focusable=false on the svgs), but what a real screen reader announces needs a human"
---

# Phase 11: Thanksgiving Home Theme Verification Report

**Phase Goal:** The Éclat main page (Home route) carries a seasonal Thanksgiving visual theme while keeping the existing design, routing, and content model intact
**Verified:** 2026-11-16
**Status:** gaps_found
**Re-verification:** No, this is the first verification

The theme exists, it is wired, and it is baked into the prerendered HTML. The switch, the scoping, the off-state, reduced motion, overflow and hydration all hold under my own measurements. One contract truth fails: the leaves collide with the hero headline, the primary button and the flag at common tablet, laptop and small-phone widths. The code review's WR-01 and WR-02 are **confirmed**. I reproduced the reviewer's numbers to within a pixel and confirmed the collision visually in screenshots.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The prerendered `dist/index.html` has `home--thanksgiving` on main#main and the four themed strings (D-01, D-03..D-06) | ✓ VERIFIED | grep of dist/index.html finds `home--thanksgiving`, "HAPPY THANKSGIVING · THE LEGACY ISSUE", "A season of remarkable stories.", the themed lede, and "With gratitude". None of the old strings (JUST LAUNCHED, Where remarkable…, One subscription) are present. |
| 2 | Warm wash and halo, `#f1e3cd` band, CTA ember glow, all scoped under `.home--thanksgiving`, so the header, footer and other routes are unchanged (D-02) | ✓ VERIFIED | eclat.css:1276-1401. Every selector, including those inside media queries, starts with `.home--thanksgiving`. The class is on `<main>` in Home.jsx:97. Header and Footer render outside `<Routes>` in App.jsx:51/81, so the class cannot reach them. |
| 3 | Six leaves alternate maple/oak 3+3, with 3 filled and 3 outline, both styles on both shapes and both sides. Only leaves 1 and 4 show at 767px and below (D-07, D-08) | ✓ VERIFIED | TG_LEAVES (Home.jsx:38-45): maple 1L/3F/5L and oak 2F/4F/6L, left side 1L/2F/3F and right side 4F/5L/6L. dist has 6 `<use>` elements alternating `#tg-maple` and `#tg-oak`, and each symbol id appears once. Measured: `visible=1,4` at 320-430px and `visible=1..6` at 768px and up. |
| 4 | Hero buttons, the closing Subscribe button and the CTA heading are unchanged (D-03) | ✓ VERIFIED | `git diff e68ecdb HEAD -- Home.jsx` removes only the main tag, flag, h1, lede and eyebrow lines. dist contains "Read the Latest Edition", "Complimentary Copy Available Here", "Our stories, our voice, our Éclat." and "Come belong." Subscribe is still at Home.jsx:487. |
| 5 | No runtime date logic, gated only by the build-time constant and shipped on (D-01, D-09) | ✓ VERIFIED | `const THANKSGIVING = true` is at Home.jsx:34. Home.jsx contains no `Date`, `getMonth` or `new Date`. |
| 6 | STATE.md has an undated take-down reminder (D-10) | ✓ VERIFIED | STATE.md:104 reads "set `THANKSGIVING = false` in `src/routes/Home.jsx` and redeploy — take-down date to be chosen by the user (no fixed date)." |
| 7 | Under reduced motion the leaves are static at `rotate(var(--r))` with `animation: none` | ✓ VERIFIED | With `prefers-reduced-motion: reduce` emulated over CDP at 1440 and 390, computed `animationName=none` on every visible leaf. The base rule is `transform: rotate(var(--r))`. |
| 8 | No horizontal overflow at 320, 768, 1024, 1440 and 2560 | ✓ VERIFIED | Measured `scrollWidth === clientWidth` at all 11 viewports from 320 to 2560. |
| 9 | Each themed string is no longer than the original, and `.hero__copy` gets no new elements | ✓ VERIFIED | The diff confirms the lengths (37 ≤ 47, 31 ≤ 39, 99 ≤ 103) and that .hero__copy has the same elements and data attributes. Minor inaccuracy: the flag's longest word changes from "LAUNCHED" (8) to "THANKSGIVING" (12), so the "same longest word" sub-claim is false for the flag. It has no effect, because truth 12 measures the copy as no taller. |
| 10 | **layering:** leaves at z 1 with pointer-events none, and no leaf overlaps or obscures hero text or buttons | ✗ FAILED | The z-index and pointer-events parts hold (`leavesZ=1 pe=none`). The overlap part fails. See the Leaf Collision table below. |
| 11 | toggle-off: with `THANKSGIVING = false`, Home renders the pre-phase copy, no `.tg-leaves` and no class on main | ✓ VERIFIED | Ran a Vite `ssrLoadModule` render of `/` with an in-memory transform setting the constant to false; no source files were touched. Result: old flag, h1, lede and eyebrow all present, `HAPPY THANKSGIVING`, `tg-leaves` and `home--thanksgiving` absent, and the main tag renders as `<main id="main">`. |
| 12 | (backstop) The themed h1 and lede line counts and `.hero__copy` height are no greater than the originals at 320, 390, 768, 1024 and 1440 | ✓ VERIFIED | Live DOM measurement, then the original strings swapped in. copyH on vs off: 320 is 417 vs 453, 390 is 353 vs 364, 768 is 242 vs 285, 1024 is 261 vs 319, 1440 is 288 vs 288. No tier grows. |
| 13 | (backstop) No hydration error, and dist already contains HAPPY THANKSGIVING | ✓ VERIFIED | Ran `vite preview` with headless Chrome over CDP and captured Runtime console, exception and Log errors and warnings over 13 page loads (320 to 2560, plus reduced motion). Result: **none**. dist/index.html contains the string. |
| 14 | (backstop) Visual: the fan seats as before, and the leaves read as decoration | ? UNCERTAIN | Needs human judgement. The fan geometry is unchanged per SUMMARY's on/off verify-hero output, which I did not re-run. |
| 15 | (backstop) a11y: the flag is announced once, and the leaves are silent | ? UNCERTAIN | Structurally correct (`aria-hidden="true"` on `.tg-leaves`, `focusable="false"`, the dot is aria-hidden). Real screen-reader output needs a human. |

**Score:** 12/15 truths verified (1 failed, 2 human, 0 present-but-behavior-unverified)

### Leaf Collision Evidence (truth 10)

The measurement compares each visible leaf's `getBoundingClientRect` against `Range.getClientRects()` line boxes for the flag, h1 and lede, and against the `.btn` boxes. My script was adapted from the reviewer's `leafcheck.mjs`, which I read first: it only drives headless Chrome against localhost.

| Viewport | Collisions |
|---|---|
| 320x640 | leaf 1 is on the flag dot. Leaf 4 [277-311] overlaps the flag text, which ends at 286. |
| 360x740 | leaf 1 is on the dot. Leaf 4 [315-349] overlaps the flag text, which ends at 327. |
| 375x667 | leaf 1 is on the dot. Leaf 4 [330-363] overlaps the flag text, which ends at 335. |
| 390x697, 430x800 | clear |
| 768x877 | leaves 1 and 4 overlap the H1 line [70-698, 157-227]. Leaf 2 overlaps the "Read the Latest Edition" button [83-338, 324-373]. |
| 820x1000 | leaves 1 and 4 overlap the H1 |
| 1024x700 | leaves 1 and 4 overlap the H1 |
| 1280x720 | leaves 1 and 4 overlap the H1 |
| 1440x900, 2560x1300 | clear |

Bounding boxes overstate a rotated leaf, so I also took screenshots. At 768 (scratchpad `hero-768.png`), the outline maple's stem sits against the "A" of the headline, the ochre oak sits right behind the final "s." of "stories.", and a leaf peeks out from under the black primary button. At 1024 the same h1 collisions are visible. At 360 the outline maple sits on the flag's accent dot. So the overlap is real and visible, not a bounding-box artefact. The text paints above the leaves, so nothing is covered in the strict z-order sense. Even so, this breaks the UI-SPEC's "No leaf overlaps or obscures hero text or buttons" contract and the goal's "keeping the existing design intact": the display headline now has decoration running into its edge glyphs on iPad and laptop widths.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/routes/Home.jsx` | THANKSGIVING constant, TG_LEAVES, class on main, 4 ternaries, sprite and leaves | ✓ VERIFIED | Contains `const THANKSGIVING = true`. The original strings are kept in the false branches. |
| `src/styles/eclat.css` | One labelled scoped block | ✓ VERIFIED | The header `/* --- seasonal: thanksgiving (remove after season) --- */` appears once, at L1276. The block is 126 lines and sits between `.cta__lede` and archive. It ships in dist/assets/style-BAIcqhlK.css (contains tgLeafSway). |
| `.planning/STATE.md` | Undated reminder | ✓ VERIFIED | L104 |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| Home.jsx main className | eclat.css `.home--thanksgiving` rules | class on main#main | ✓ WIRED (class present in dist, CSS present in the dist bundle) |
| Leaf svgs | sprite symbols | `use href="#tg-maple"` / `#tg-oak` | ✓ WIRED (6 hrefs, 2 unique ids, no `<base>`) |
| Inline `--r` / `--d` | `@keyframes tgLeafSway` | CSS custom props | ✓ WIRED (computed animationName=tgLeafSway when motion is allowed) |
| Home.jsx | dist/index.html | prerender | ✓ WIRED (themed strings in static HTML; dist built 04:10, same as commit 9250c2e; no src changes since) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Leaf overlap, overflow, reduced motion, console | `node scratchpad/verify11.mjs` against `vite preview :4173` | see above | ✗ overlap FAIL, rest PASS |
| Off-state SSR | `node scratchpad/offstate.mjs` (Vite ssrLoadModule with an in-memory transform) | old copy present, theme absent | ✓ PASS |
| Line count on vs off | `node scratchpad/lines2.mjs` (DOM text swap) | copyH on ≤ off at all 5 tiers | ✓ PASS |

The preview server and every headless Chrome instance were stopped afterwards. No source files were modified.

### Probe Execution

None declared. Step 7c does not apply.

### Requirements Coverage

The phase has no requirement IDs. Coverage source is CONTEXT D-01..D-10:

| Decision | Status |
|---|---|
| D-01 one switch, scoped CSS, no date logic | ✓ |
| D-02 medium-strength surfaces | ✓ code; visual strength is a human item |
| D-03 four strings, buttons and heading unchanged | ✓ |
| D-04 / D-05 / D-06 exact copy | ✓ |
| D-07 maple/oak 3+3 | ✓ |
| D-08 3 filled + 3 outline, spread across shapes and sides | ✓ |
| D-09 live on next deploy | ✓ |
| D-10 undated reminder | ✓ |
| UI-SPEC layering row | ✗ (gap) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| src/styles/eclat.css | 1322-1348, 1387-1399 | Leaf positions in % of hero height are not checked against the copy block, which got shorter | ⚠️ (becomes the gap) | Leaves collide with h1, button and flag |
| src/styles/eclat.css | 2823 | `@media print` does not hide `.tg-leaves` | ℹ️ Info (IN-03) | Leaves print |
| — | — | No TBD/FIXME/XXX markers. No `url()` or `@import` in the block. No changes to motion.js, Header, Footer, content.js, seo.js, prerender.js, vercel.json, _headers or package.json | — | Prohibitions hold |

### Human Verification Required

These remain after the gap is fixed.

#### 1. Visual pass
**Test:** Check phone 390x844 (touch emulation), tablet 768x1024 and desktop 1440x900.
**Expected:** The fan opens and seats as before, and the leaves read as quiet decoration. The band is a warmer cream, and the CTA ember is a soft glow.
**Why human:** Aesthetic judgement.

#### 2. Screen reader
**Test:** Read the hero with NVDA or Narrator.
**Expected:** The flag is announced once, and the leaves are silent and unfocusable.
**Why human:** Real assistive-technology output.

### Gaps Summary

There is one gap, with one root cause: the leaf positions were set as percentages of hero height without being checked against where the hero copy actually lands. The themed h1 is shorter, so at 768-1300px it collapses to one full-width line, and that line runs through leaves 1 and 4. On phones 375px and narrower the flag fills the row where leaves 1 and 4 sit. The z-order is correct, so the text stays on top and clickable, but leaves visibly crowd the display headline, the primary button and the flag. That breaks the UI-SPEC layering contract, which was marked "covered" but never measured. The review's WR-01 and WR-02 fixes, a tablet/laptop repositioning and a phone hide under 390px followed by a re-measure, should close it.

**If the user decides that leaves sitting behind text is acceptable** (the text stays on top, and it fits the "layered collage feel"), this can be accepted instead with:

```yaml
overrides:
  - must_have: "layering: no leaf overlaps or obscures hero text or buttons"
    reason: "Leaves paint below the copy (z 1 < z 4) and never intercept clicks; edge contact with the h1/flag accepted as part of the collage look"
    accepted_by: "{name}"
    accepted_at: "{ISO timestamp}"
```

---

_Verified: 2026-11-16_
_Verifier: Claude (gsd-verifier)_
