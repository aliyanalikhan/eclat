---
phase: 06-foundation-global-chrome-breakpoint-tokens-header-nav-footer
verified: 2026-09-13T00:00:00Z
status: gaps_found
score: 7/10 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "The header's nav drawer opens and closes correctly at phone-portrait widths (CHROME-01 / ROADMAP Phase 6 Success Criterion 4)"
    status: failed
    reason: >
      Header.jsx initializes `isMobile` to `useState(false)` (line 24) and only corrects it inside a
      post-mount `useEffect` (lines 38-47). `navHidden = isMobile && !open` (line 112) therefore
      evaluates to `false` on every server-rendered/prerendered/first-painted page, so the `hidden`
      attribute is never present on `<nav>` at first paint. Verified independently (not just via
      06-REVIEW.md's claim): built the SSR bundle (`vite build --ssr src/entry-server.jsx`) and called
      `render('/')` directly — the emitted markup is `<nav id="..." class="nav" aria-label="Primary">`
      with no `hidden` attribute at all. At <=900px `.nav` is `position: fixed; inset: var(--nav-h) 0 auto 0`
      (eclat.css:2029-2045), a full-width column dropdown containing every nav link, the auth slot, and
      the Subscribe CTA, whose only closed-state mechanism is `.nav[hidden] { display: none }`
      (eclat.css:2047-2049). Net effect: every mobile visitor sees the full nav flyout rendered open over
      the page on first paint (prerendered HTML + the pre-hydration window), until JS hydrates and the
      effect finally runs. This is present-day behavior, not a corner case.
    artifacts:
      - path: "src/components/Header.jsx"
        issue: "isMobile useState(false) initial value + effect-only correction (lines 24, 38-47, 112) produces an incorrect pre-hydration DOM state on every mobile page load"
      - path: "src/styles/eclat.css"
        issue: ".nav's closed state at <=900px depends entirely on the `hidden` attribute (lines 2029-2049) with no CSS-only default-closed fallback for the pre-hydration window"
    missing:
      - "A CSS-only default-closed state for .nav at <=900px (e.g. `display: none` by default, with a JS-added `is-open` class switching to `display: flex`) so 'closed' is the safe default at every render stage — SSR, pre-hydration paint, and post-hydration. 06-REVIEW.md's CR-01 includes a concrete fix sketch."
    note: >
      This exact defect (isMobile defaulting false, corrected only post-mount) was introduced in Phase 2
      (commit 9f82841, "auth-aware header with three states...") — it predates Phase 6 and Phase 6's diff
      to Header.jsx is a single added comment line, not a behavioral change. It is flagged here regardless
      of origin because ROADMAP Phase 6's stated goal and Success Criterion 4 explicitly require "the nav
      drawer opens and closes correctly at phone widths," and the current codebase fails that criterion.
  - truth: "eclat.css's breakpoint-tier doc block names all 4 tiers and their exact call sites in eclat.css, Header.jsx, and motion.js (06-01-PLAN.md must_haves truth #1)"
    status: partial
    reason: >
      The doc block's own self-reference (eclat.css:7, cited from both Header.jsx's and motion.js's
      cross-reference comments) is accurate. However every body line-number citation inside the block is
      stale, confirmed by direct grep against the current file: `--bp-tablet` cites eclat.css:1996, actual
      `@media (max-width: 1080px)` is at line 2014; `--bp-nav` cites eclat.css:2006, actual
      `@media (max-width: 900px)` is at line 2024; `--bp-mobile` cites eclat.css:2094, actual
      `@media (max-width: 720px)` is at line 2125; `--bp-phone` cites eclat.css:2178, actual
      `@media (max-width: 460px)` is at line 2209; the "Header.jsx:38" and "motion.js:76" cross-references
      both point at the comment line in each file, not the actual `matchMedia`/`window.innerWidth` call
      (lines 39 and 77 respectively). The must-have explicitly requires "exact call sites" — these are not
      exact. The 4 breakpoint *values* themselves (1080/900/720/460) are still consistent and correct
      across every call site, so this does not break FOUND-01's functional intent, only its documentation
      accuracy (06-REVIEW.md WR-01).
    artifacts:
      - path: "src/styles/eclat.css"
        issue: "Doc block (lines 12-17) cites line numbers that no longer match the file's current @media block locations"
    missing:
      - "Correct the 6 stale line-number citations, or replace them with grep-able anchor comments (e.g. `// bp:tablet`) at each call site so they cannot drift silently again — 06-REVIEW.md WR-01 has the exact corrected values."
---

# Phase 6: Foundation & Global Chrome — Breakpoint Tokens, Header, Nav & Footer Verification Report

**Phase Goal:** The site's shared visual/layout foundation — a single breakpoint tier, fluid typography/spacing tokens, stable full-height sections, and native touch scrolling — is established once, and the global header/nav/footer that appear on every page work correctly at phone-portrait widths.
**Verified:** 2026-09-13
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | FOUND-01: Breakpoint doc block exists naming all 4 tiers; literals unchanged in Header.jsx/motion.js | ✓ VERIFIED | `grep` confirms doc block present (eclat.css:7-18); Header.jsx:39 `matchMedia('(max-width: 900px)')` and motion.js:77 `window.innerWidth < 720` are byte-identical to pre-phase (confirmed via `git diff 378e1e6 HEAD`); all 4 literal values consistent across CSS `@media` blocks and JS |
| 2 | FOUND-01: Doc block's call-site line references are exact | ✗ FAILED | 6 of the doc block's citations are stale (off by 1-31 lines) — see Gaps |
| 3 | FOUND-02: `--wordmark-fs`/`--footer-pad-y` clamp() tokens wired end-to-end, scaling continuously 375-430px | ✓ VERIFIED | `.wordmark` consumes `var(--wordmark-fs)` (eclat.css:374), `.footer` consumes `var(--footer-pad-y)` (eclat.css:1752); dead 460px 21px override removed; clamp math independently verified: `clamp(20px,5.4vw,26px)` reaches its 26px ceiling only above ~481px viewport width, `clamp(40px,10vw,56px)` reaches 56px only above 560px — matches must-have's stated floor/ceiling boundaries |
| 4 | FOUND-03: `svh` companions on `.hero`, `.lightbox`/`.lightbox__frame` (x2), mobile `.nav`; `.magazine-preview`'s 78vh untouched | ✓ VERIFIED | All 5 `vh`→`svh` pairs confirmed present with `vh` first, `svh` second, never reordered (eclat.css:515-516, 1792-1793, 1801-1802, 1805-1806, 2042-2043); `.magazine-preview__img`'s `max-height: 78vh` (line 1931) unchanged, no `78svh` companion added |
| 5 | FOUND-04: Touch pointers cede horizontal strip-scrolling to native scroll; desktop mouse path unchanged | ✓ VERIFIED (primary target) | `motion.js:266` gates `onDown` with `matchMedia('(pointer: coarse)')` before any drag-state mutation; `.strip` carries `touch-action: pan-x` (eclat.css:1254); no parallel `touchstart`/`touchmove` listeners added. Correct for the milestone's actual target (phone-primary touch devices). See Anti-Patterns for a real but out-of-target-scope edge case (WR-03). |
| 6 | CHROME-01: Safe-area insets wired via `viewport-fit=cover` + `env()` overrides | ✓ VERIFIED | `index.html:5` carries `viewport-fit=cover`; eclat.css:2038-2040 adds `max(var(--gut)\|22px, env(safe-area-inset-*))` for left/right/bottom, additive after the unchanged original shorthand (line 2037) |
| 7 | CHROME-01: No regression to sign-in/sign-out logic | ✓ VERIFIED | `git diff <pre-phase> HEAD -- src/components/Header.jsx` shows exactly 1 line added (a comment); `handleSignOut`, `toggleAuthMenu`, auth-slot JSX are byte-identical |
| 8 | CHROME-01: Nav drawer opens and closes correctly at phone widths | ✗ FAILED | Confirmed via direct SSR render (`entry-server.js`'s `render('/')`): emitted `<nav>` has no `hidden` attribute — nav renders open on every mobile first paint until hydration. See Gaps (CR-01). |
| 9 | CHROME-02: All nav/menu/auth tap targets meet 44px minimum | ✓ VERIFIED | `.nav>.btn` (min-height:44px + inline-flex centering, eclat.css:2056-2063), `.nav .auth-trigger` (min-height:44px, eclat.css:2065-2068), `.auth-menu__item` (padding:14px 16px, eclat.css:480-484) all confirmed in source; `.nav__toggle`/`.nav>a` confirmed unchanged; SUMMARY's CDP-measured real box-model heights (44-53px) corroborate |
| 10 | CHROME-03: Footer renders legibly, 3 distinct non-overlapping rows at 375px/430px | ? UNCERTAIN (backstop) | Footer CSS structure (`.footer__inner` flex+wrap, `.footer__nav` flex+wrap) is consistent with correct rendering, but this must-have is explicitly marked `verification: backstop` in 06-02-PLAN.md and its claimed proof (real screenshots) was captured by a throwaway script kept in the execution sandbox's scratchpad, not committed to the repo — no independently-checkable evidence exists in the codebase. Routed to human verification. |

**Score:** 7/10 truths verified (2 failed, 1 requires human confirmation — see Human Verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/styles/eclat.css` | Breakpoint doc block, `--wordmark-fs`/`--footer-pad-y`, svh companions, `touch-action: pan-x`, safe-area padding, 44px tap targets | ✓ VERIFIED (content) / ⚠️ partial (doc accuracy) | All CSS additions present and correctly scoped; doc block content itself has stale line-number citations (see gap #2) |
| `src/lib/motion.js` | Cross-reference comment + pointer-coarse gate in `useDragScroll` | ✓ VERIFIED | Comment present (line 76); gate present as first line of `onDown` (line 266); rest of `onDown`/`onMove`/`onUp`/`onClick` unchanged |
| `src/components/Header.jsx` | Cross-reference comment only, zero behavior change | ✓ VERIFIED (as scoped) / ✗ underlying defect | Comment added exactly as planned; but the plan's "zero behavior change" scope left CR-01's pre-existing pre-hydration nav-open defect unaddressed, and that defect blocks CHROME-01 |
| `index.html` | `viewport-fit=cover` on viewport meta | ✓ VERIFIED | Confirmed present, no other changes to the file |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `eclat.css :root` tokens | `.wordmark`/`.footer` selectors | `var(--wordmark-fs)`/`var(--footer-pad-y)` | ✓ WIRED | Both selectors consume the tokens directly |
| `motion.js useDragScroll onDown` | `eclat.css .strip touch-action: pan-x` | pointer-coarse early return handing off to native scroll | ✓ WIRED | Gate present; CSS `touch-action` present; consistent handoff |
| `index.html viewport-fit=cover` | `eclat.css env(safe-area-inset-*)` calls | browser safe-area resolution | ✓ WIRED | Prerequisite meta attribute present; `env()` calls present in `.nav` |
| `eclat.css` breakpoint-tier doc block | `Header.jsx:39` / `motion.js:77` | matching literal-value comments | ⚠️ PARTIAL | Comments present and literals match, but cited line numbers are stale (gap #2) |
| Header.jsx auth-slot state | `eclat.css .nav .auth-trigger`/`.auth-menu__item` | className-only styling | ✓ WIRED | New CSS rules target the existing, unchanged class names |

### Data-Flow Trace (Level 4)

Not applicable — this phase is CSS/JS-token/markup-attribute work with no dynamic data rendering (no API calls, no DB queries, no props flowing from a data source to a render).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CSS/JS build pipeline compiles cleanly with all phase changes | `npx vite build` | "63 modules transformed... built in 947ms", 0 errors | ✓ PASS |
| SSR entry renders the Home route without throwing | `vite build --ssr src/entry-server.jsx` then `render('/')` | Rendered successfully; used to inspect the emitted `<nav>` markup | ✓ PASS (used as evidence for gap #1) |
| Prerendered `<nav>` carries no `hidden` attribute at first paint | Direct SSR render inspection (see above) | `<nav id="..." class="nav" aria-label="Primary">` — no `hidden` attribute | ✗ FAIL (confirms CR-01) |
| Full `npm run build` (migrate + vite + prerender + secrets check) | not run | Requires `POSTGRES_URL`/live DB, unavailable in this environment (consistent with both plans' own noted limitation) | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FOUND-01 | 06-01 | Single documented breakpoint tier used consistently | ⚠️ PARTIALLY SATISFIED | Values consistent (SATISFIED); doc block's own "exact call sites" claim is inaccurate (gap #2) |
| FOUND-02 | 06-01 | Fluid clamp()-based typography/spacing tokens | ✓ SATISFIED | Tokens wired end-to-end, floor/ceiling math verified |
| FOUND-03 | 06-01 | svh/dvh with vh fallback on full-height sections | ✓ SATISFIED | All 3 named spots fixed additively; magazine-preview correctly excluded |
| FOUND-04 | 06-01 | Touch input scrolls natively, not via JS drag handler | ✓ SATISFIED (for phone-primary touch devices, the milestone's target) | Pointer-coarse gate + touch-action present; WR-02/WR-03 are real but out-of-target-scope edge cases |
| CHROME-01 | 06-02 | Nav fully usable at phone widths: drawer opens/closes, safe-area respected, no sign-in/out regression | ✗ BLOCKED | Safe-area and sign-in/out regression clauses pass; "opens/closes correctly" clause fails (CR-01, gap #1) |
| CHROME-02 | 06-02 | All header/nav tap targets meet 44px minimum | ✓ SATISFIED | All 3 targeted selectors bumped; unaffected selectors confirmed already-passing |
| CHROME-03 | 06-02 | Footer renders correctly/legibly at phone widths | ? NEEDS HUMAN | CSS structure consistent with correct rendering; claimed screenshot proof not present in the repo to independently confirm (backstop must-have) |

No orphaned requirements — FOUND-01..04 and CHROME-01..03 are the complete set mapped to Phase 6 in REQUIREMENTS.md's traceability table, and both plans' frontmatter `requirements:` fields together cover exactly this set.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/Header.jsx` | 24, 38-47, 112 | `isMobile` defaults `false`, corrected only in a post-mount effect | 🛑 Blocker | Nav renders open on every mobile first paint (CR-01) — blocks CHROME-01 |
| `src/styles/eclat.css` | 12-17 | Breakpoint-tier doc block cites stale line numbers | ⚠️ Warning | Misleads future maintainers trying to find call sites; doesn't affect current runtime behavior (WR-01) |
| `src/lib/motion.js` | 77, 113, 202-205 | `useScrollFx`'s `mobile` flag computed once, never recomputed on resize | ⚠️ Warning | Hero fan-effect logic can use a stale mobile/desktop decision after an in-session resize across 720px without a route change (WR-02) — orientation-change/foldable edge case |
| `src/lib/motion.js` | 266 | Touch/mouse gate uses device-level `matchMedia('(pointer: coarse)')` instead of per-event `PointerEvent.pointerType` | ⚠️ Warning | Misfires only on hybrid-input devices (touchscreen laptops) — outside this milestone's phone-portrait-only target scope, but a real correctness gap (WR-03) |
| `src/components/Header.jsx` | 15-19 | `truncateName` slices by UTF-16 code unit, not grapheme | ℹ️ Info | Could cut a surrogate-pair character (e.g. emoji) mid-glyph in a display name (IN-01) — low probability |

No TBD/FIXME/XXX debt markers found in any file modified by this phase.

## Human Verification Required

### 1. Notched-device safe-area clearance

**Test:** On a real notched/gesture-bar device (or a DevTools notched preset, e.g. iPhone 14 Pro), open the mobile hamburger nav and inspect the dropdown's left/right/bottom padding.
**Expected:** Padding is visually identical to pre-phase on non-notched devices; on notched hardware, the dropdown clears the notch/home-indicator area.
**Why human:** `env(safe-area-inset-*)` resolves to a genuine nonzero value only on real notched hardware or a notch-aware preset — this cannot be observed via source inspection alone.

### 2. Toolbar-collapse height stability (svh)

**Test:** On a real mobile browser (iOS Safari or similar), scroll past the hero and open the Lightbox from a cover image while the address bar collapses/expands.
**Expected:** No visible height jump in the hero band or lightbox frame as the toolbar state changes.
**Why human:** `svh` toolbar-collapse behavior does not reproduce in a desktop-resized viewport.

### 3. Fluid token legibility at boundary widths

**Test:** At 375px, 430px, and >=481px, read `.wordmark`'s and `.footer`'s computed values in DevTools' Computed panel.
**Expected:** Continuous scaling with no jump at 460px; letter-spacing remains legible at the smaller computed sizes.
**Why human:** Subjective legibility judgment; the underlying clamp() math has already been independently verified in this report.

### 4. Real touch-drag behavior on the horizontal strips

**Test:** With touch emulation or a real touchscreen, drag the hero fan/Cultural Icons/Videos strips; repeat with a real mouse.
**Expected:** Touch drag scrolls via native momentum/snap with no jitter; mouse drag is unchanged from pre-phase.
**Why human:** Pointer Events behavior under real touch input doesn't reproduce from static code inspection.

### 5. Footer legibility at 375px/430px (CHROME-03 backstop)

**Test:** At exactly 375px and 430px, screenshot the footer and confirm the wordmark, nav-links row, and full copyright sentence each render on distinct, non-overlapping, non-clipped rows.
**Expected:** 3 clean rows at both widths, full sentence wraps without clipping.
**Why human:** This must-have is explicitly marked `verification: backstop` in the plan; the SUMMARY's claimed screenshot evidence was produced by a script kept outside the repository and is not available for this report to inspect directly.

### 6. Live signed-in auth-menu round trip

**Test:** In an environment with real Google OAuth credentials and a live database, sign in, open the auth menu, and sign out.
**Expected:** Avatar/name render correctly sized (already proven via synthetic-DOM CSS measurement per 06-02-SUMMARY.md); sign-out completes and clears the session with no regression.
**Why human:** No live OAuth/DB backend was available in the execution or verification environment; this was already flagged as deferred by the executor.

## Gaps Summary

Two gaps block full goal achievement:

1. **CR-01 (blocker):** The global mobile nav renders open on first paint on every phone-width page load, before JS hydrates — confirmed by directly rendering the SSR entry and inspecting the emitted markup (no `hidden` attribute present). This directly fails CHROME-01's "the nav drawer opens/closes correctly" clause and ROADMAP Phase 6's Success Criterion 4. The defect itself was introduced in an earlier phase (Phase 2's auth-aware header work) and Phase 6 did not touch this logic — but Phase 6's explicit job is to make the global nav "work correctly at phone-portrait widths," and it currently does not. This needs a fix (CSS-default-closed pattern, sketched in 06-REVIEW.md) before the phase goal can be considered achieved.
2. **Stale doc-block line numbers (non-blocking but a genuine must-have miss):** 06-01-PLAN.md's own must-have text requires the breakpoint doc block to name "exact call sites" — 6 of its line-number citations are wrong as of the current file state. The documented breakpoint *values* are correct and consistent, so this does not affect runtime behavior, only the documentation's trustworthiness for future maintainers.

Three additional non-blocking code-quality issues were found during review and remain unaddressed (WR-02, WR-03, IN-01) — none of them fail an explicit must-have for this milestone's phone-portrait-only target scope, but are worth tracking for a future pass.

---

_Verified: 2026-09-13_
_Verifier: Claude (gsd-verifier)_
