---
phase: 11-thanksgiving-home-theme
plan: 01
subsystem: ui
status: complete
tags: [seasonal-theme, home, css, svg, prerender]
requires: []
provides:
  - "THANKSGIVING build-time switch in src/routes/Home.jsx"
  - "Scoped seasonal CSS block (.home--thanksgiving) in src/styles/eclat.css"
  - "Undated take-down reminder in .planning/STATE.md"
affects: [home-route]
tech-stack:
  added: []
  patterns:
    - "Build-time constant + ternaries (originals kept in false branch) for seasonal copy"
    - "Inline SVG sprite (symbol + use) for decorative art, no assets or network"
key-files:
  created: []
  modified:
    - src/routes/Home.jsx
    - src/styles/eclat.css
    - .planning/STATE.md
decisions:
  - "Leaf position and size live in CSS per .tg-leaf--n, not in TG_LEAVES, because the phone-tier media query must override them and inline styles would beat it"
  - "Leaf style split: outlines on 1, 5, 6 and fills on 2, 3, 4 (maple/oak alternate 3+3; both styles on both shapes and both sides)"
  - "Outline leaves use fill-opacity 0.12 + 1.5 stroke (per plan) rather than the UI-SPEC's fill: none + faint fill wording; same visual intent"
metrics:
  duration: "~5 min"
  completed: 2026-11-16
actuals:
  tokens: 3200
  tasks: 3
  commits: 3
---

# Phase 11 Plan 01: Thanksgiving Home Theme Summary

One build-time constant (`THANKSGIVING = true` in Home.jsx) switches on a seasonal layer for `/`: a warm hero wash and halo, six hand-drawn inline-SVG maple/oak leaves (3 filled, 3 outline) that sway gently, a warmer books band, a low ember glow on the closing CTA, and four themed copy strings. All CSS is scoped under `.home--thanksgiving`, and the themed HTML is baked in by prerender.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Tracer: constant, main class, themed flag, scoped wash/halo | f68fff2 | src/routes/Home.jsx, src/styles/eclat.css |
| 2 | Themed h1/lede/eyebrow, band, CTA ember, STATE reminder | c6b362f | src/routes/Home.jsx, src/styles/eclat.css, .planning/STATE.md |
| 3 | Six leaves, sway, reduced-motion, phone tier, phase verification | 9250c2e | src/routes/Home.jsx, src/styles/eclat.css |

## Verification

- Every automated check passed: OK tracer, OK scoped, OK constant, OK copy+surfaces, OK state reminder, OK off-state, OK restored, OK leaves, OK boundaries.
- **Build:** `npm run build` was green on every run. The migrate step reached the database each time ("migrate: up to date (5 migrations)"), so **the DB-only fallback was not used**. check-secrets: no leaked secrets found in dist/.
- **Tracer gate:** auto mode was off, but the orchestrator set `human_verify_mode: end-of-phase`. So instead of stopping at a checkpoint, the tracer's `<verify>` was re-run automatically after Task 1. It passed, and the human checks are listed below.
- **Off-state:** with `THANKSGIVING = false`, the SSR render of `/` contains the original flag, h1, lede and eyebrow, and none of the theme markers. The constant was then restored to `true`.

### Final leaf assignment

| # | Shape | Style | Hue | Side |
|---|-------|-------|-----|------|
| 1 | maple | outline | rust `var(--accent)` | left (shown on phone, 32px) |
| 2 | oak | filled | ochre | left |
| 3 | maple | filled | cranberry | left |
| 4 | oak | filled | ochre | right (shown on phone, 24px) |
| 5 | maple | outline | cranberry | right |
| 6 | oak | outline | rust | right |

### verify-hero.mjs outputs (theme on, vite preview :4173)

```
===== VW=390 VH=844 =====
=== AT REST  (scrollY=0, viewport=697px) ===
hero: top=0 bottom=697 height=697
cards: top=431 bottom=669  pastHero=none  pastFold=none
scroll cue: top=0 opacity=1.00  collision=YES
  card              left  right   gap-to-next   title-opacity
                      87    250      38        (lead)
                     125    283      34        (lead)
                     159    325      42        (lead)
                     201    359      33        (lead)
                     234    397       —        (lead)
=== OPENED  (scrollY=432, viewport=697px) ===
hero: top=-432 bottom=265 height=697
cards: top=-6 bottom=237  pastHero=none  pastFold=none
scroll cue: top=0 opacity=0.00  collision=no
                     -56    112     103        (lead)
                      47    201     119        (lead)
                     166    318     117        (lead)
                     283    437      89        (lead)
                     372    540       —        (lead)

===== VW=768 VH=1024 =====
=== AT REST  (scrollY=0, viewport=877px) ===
hero: top=0 bottom=877 height=877
cards: top=611 bottom=849  pastHero=none  pastFold=none
scroll cue: top=0 opacity=1.00  collision=YES
                     221    384      38        (lead)
                     259    417      34        (lead)
                     293    459      42        (lead)
                     335    493      33        (lead)
                     368    531       —        (lead)
=== OPENED  (scrollY=544, viewport=877px) ===
hero: top=-544 bottom=333 height=877
cards: top=20 bottom=305  pastHero=none  pastFold=none
scroll cue: top=0 opacity=0.00  collision=no
                      46    244     121        (lead)
                     167    349     120        (lead)
                     287    465     116        (lead)
                     403    585     105        (lead)
                     508    706       —        (lead)

===== VW=1526 VH=877 =====
=== AT REST  (scrollY=0, viewport=730px) ===
hero: top=0 bottom=780 height=780
cards: top=421 bottom=678  pastHero=none  pastFold=none
scroll cue: top=739 opacity=1.00  collision=no
                     531    712      69        (lead)
                     600    773      66        (lead)
                     666    844      71        (lead)
                     737    910      61        (lead)
                     798    979       —        (lead)
=== OPENED  (scrollY=453, viewport=730px) ===
hero: top=-453 bottom=327 height=780
cards: top=-32 bottom=225  pastHero=none  pastFold=none
scroll cue: top=246 opacity=0.00  collision=no
                     241    429     215        (lead)
                     456    624     220        (lead)
                     676    834     210        (lead)
                     886   1054     195        (lead)
                    1081   1269       —        (lead)

===== REDUCED=1 =====
=== AT REST  (scrollY=0, viewport=730px) ===
hero: top=0 bottom=780 height=780
cards: top=421 bottom=678  pastHero=none  pastFold=none
scroll cue: top=739 opacity=1.00  collision=no
                     241    429     215        (lead)
                     456    624     220        (lead)
                     676    834     210        (lead)
                     886   1054     195        (lead)
                    1081   1269       —        (lead)
=== OPENED  (scrollY=453, viewport=730px) ===
hero: top=-453 bottom=327 height=780
cards: top=-32 bottom=225  pastHero=none  pastFold=none
scroll cue: top=286 opacity=1.00  collision=no
                     241    429     215        (lead)
                     456    624     220        (lead)
                     676    834     210        (lead)
                     886   1054     195        (lead)
                    1081   1269       —        (lead)
```

**About the at-rest `collision=YES` at 390 and 768:** I rebuilt with `THANKSGIVING = false` and re-ran both widths. The off-state output is byte-identical: same hero, same card rows, `scroll cue: top=0 ... collision=YES`. So this collision existed before the phase. The `top=0` reading suggests the scroll cue is hidden at those tiers and the harness counts that as a collision. The theme does not change fan geometry at any width. I restored the constant to `true` and rebuilt.

```
===== OFF VW=390 VH=844 =====   AT REST: cards top=431 bottom=669, scroll cue top=0 collision=YES, rows 87/250 125/283 159/325 201/359 234/397
===== OFF VW=768 VH=1024 =====  AT REST: cards top=611 bottom=849, scroll cue top=0 collision=YES, rows 221/384 259/417 293/459 335/493 368/531
```

## Deviations from Plan

**Leaf position and size live in CSS, not in TG_LEAVES (planner-sanctioned).** The UI-SPEC says the leaf array holds size and position. The plan instead keeps only `{ n, shape, line, hue, r, d }` in `TG_LEAVES` and puts position and size in `.tg-leaf--n` CSS rules. The reason: the phone-tier `@media (max-width: 767px)` rule overrides them, and inline styles would beat a media query. A one-line comment above `TG_LEAVES` records this.

**[Rule 3 - Blocking] Matching against CRLF line endings.** The working-tree copies of Home.jsx and eclat.css use CRLF. All edits were matched on normalised text and written back as CRLF. Git Bash `sed -i` in the off-state check stripped the CRs from Home.jsx, so I put them back. The content git stores is unchanged.

Otherwise the plan was executed as written.

## Human checks (end-of-phase, harvest into 11-UAT.md)

1. **Hydration:** run `npm run serve` and open http://localhost:4173/ with the console visible. Expect no React hydration error or warning (#418/#423/#425), and view-source should already contain "HAPPY THANKSGIVING · THE LEGACY ISSUE".
2. **Visual (touch emulation):** check phone 390×844, tablet 768×1024 and desktop 1440×900. The fan should open and seat as before. Leaves should read as quiet edge decoration that tucks behind cards. Only leaves 1 and 4 should show on phone. The books band should be a warmer cream, and the CTA ember a soft glow from the bottom, not a bar.
3. **Line count:** at 320, 390, 768, 1024 and 1440, compare the h1/lede line counts and the `.hero__copy` offsetHeight against the pre-theme production site. Themed values should be less than or equal to the originals.
4. **Overflow and reduced motion:** at 320, 768, 1024, 1440 and 2560, `scrollWidth === clientWidth` should be true. With reduced motion emulated, the leaves should be still at their rest tilt.
5. **Screen reader:** with NVDA or Narrator, the flag should be announced once, and nothing should be announced or focusable for the leaves.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/routes/Home.jsx (`const THANKSGIVING = true`, TG_LEAVES, tg-maple/tg-oak)
- FOUND: src/styles/eclat.css (seasonal block, once, between `.cta__lede` and archive)
- FOUND: .planning/STATE.md reminder line
- FOUND commits: f68fff2, c6b362f, 9250c2e
