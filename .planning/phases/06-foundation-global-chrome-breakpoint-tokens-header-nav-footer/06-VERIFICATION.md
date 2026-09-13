---
phase: 06-foundation-global-chrome-breakpoint-tokens-header-nav-footer
verified: 2026-09-13T00:00:00Z
status: human_needed
score: 9/10 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/10
  gaps_closed:
    - "The header's nav drawer opens and closes correctly at phone-portrait widths (CHROME-01 / ROADMAP Phase 6 Success Criterion 4) — CR-01"
    - "eclat.css's breakpoint-tier doc block names all 4 tiers and their exact call sites (06-01-PLAN.md must_haves truth #1) — WR-01"
  gaps_remaining: []
  regressions: []
---

# Phase 6: Foundation & Global Chrome — Breakpoint Tokens, Header, Nav & Footer Verification Report

**Phase Goal:** The site's shared visual/layout foundation — a single breakpoint tier, fluid typography/spacing tokens, stable full-height sections, and native touch scrolling — is established once, and the global header/nav/footer that appear on every page work correctly at phone-portrait widths.
**Verified:** 2026-09-13
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plan 06-03)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | FOUND-01: Breakpoint doc block exists naming all 4 tiers; literals unchanged in Header.jsx/motion.js | ✓ VERIFIED | Unchanged from initial verification — doc block present (eclat.css:7-22); breakpoint pixel values (1080/900/720/460) unchanged by 06-03 |
| 2 | FOUND-01: Doc block's call-site line references are exact | ✓ VERIFIED (re-verified, was FAILED) | Independently confirmed the 6 originally-stale citations (`--bp-tablet`, `--bp-nav`, `--bp-mobile`, `--bp-phone`, `Header.jsx:38`, `motion.js:76`) are now grep-able anchor tags: `grep -c "bp:tablet\|bp:nav\|bp:mobile\|bp:phone" src/styles/eclat.css` confirms anchors at doc block (eclat.css:16-21) and at all 4 `@media` call sites (eclat.css:2028 `/* bp:nav */`, plus tablet/mobile/phone sites); `Header.jsx:39` carries `// bp:nav` on the actual `matchMedia` line; `motion.js:76` carries `// bp:mobile` on the actual `window.innerWidth < 720` line. Zero of the 6 originally-cited stale line numbers remain in the doc block. See Anti-Patterns for a new, non-blocking finding (WR-01-recurrence). |
| 3 | FOUND-02: `--wordmark-fs`/`--footer-pad-y` clamp() tokens wired end-to-end, scaling continuously 375-430px | ✓ VERIFIED | Unchanged from initial verification — not touched by 06-03 |
| 4 | FOUND-03: `svh` companions on `.hero`, `.lightbox`/`.lightbox__frame` (x2), mobile `.nav`; `.magazine-preview`'s 78vh untouched | ✓ VERIFIED | Unchanged from initial verification — not touched by 06-03 |
| 5 | FOUND-04: Touch pointers cede horizontal strip-scrolling to native scroll; desktop mouse path unchanged | ✓ VERIFIED (primary target) | Unchanged from initial verification — not touched by 06-03 |
| 6 | CHROME-01: Safe-area insets wired via `viewport-fit=cover` + `env()` overrides | ✓ VERIFIED | Unchanged from initial verification — not touched by 06-03 |
| 7 | CHROME-01: No regression to sign-in/sign-out logic | ✓ VERIFIED | Independently confirmed via `git diff 5eb6f9d..HEAD -- src/components/Header.jsx`: exactly 2 changed lines across all of 06-03 (the `<nav>` className expression, and a trailing `// bp:nav` comment on the `matchMedia` line) — `toggleAuthMenu`, `handleSignOut`, `isMobile`/`open` state initialization, the `matchMedia` `useEffect` body, `navHidden`'s computation, and all auth-slot JSX are byte-identical to before 06-03 |
| 8 | CHROME-01: Nav drawer opens and closes correctly at phone widths | ✓ VERIFIED (re-verified, was FAILED) | Independently re-ran the SAME method the prior verification used: rebuilt the SSR bundle (`npx vite build --ssr src/entry-server.jsx --outDir dist/server`) and called `render('/')` directly. Emitted markup is unchanged in shape — `<nav id=":R3:" class="nav" aria-label="Primary">`, still no `hidden`/`is-open` attribute — but this is now CORRECT: `eclat.css`'s `<=900px` `.nav` rule (eclat.css:2033-2054) now has `display: none;` as its first declaration, with `.nav.is-open { display: flex; }` (eclat.css:2056-2058) as the only override, and `.nav[hidden] { display: none; }` (eclat.css:2060-2062) preserved unchanged as a redundant-but-harmless reinforcement. Since neither `hidden` nor `is-open` is present in the SSR/pre-hydration markup, the nav now renders CLOSED by default at every render stage (SSR, pre-hydration paint, post-hydration) instead of the pre-fix full-width open dropdown. Confirmed in Header.jsx source: `<nav id={navId} className={\`nav${open ? ' is-open' : ''}\`} hidden={navHidden} aria-label="Primary">` — `open` defaults `false`, so no `is-open` class on first paint, consistent with the CSS-default-closed fix. `npx vite build` exits 0. |
| 9 | CHROME-02: All nav/menu/auth tap targets meet 44px minimum | ✓ VERIFIED | Unchanged from initial verification — not touched by 06-03 |
| 10 | CHROME-03: Footer renders legibly, 3 distinct non-overlapping rows at 375px/430px | ? UNCERTAIN (backstop) | Unchanged from initial verification — this must-have is explicitly marked `verification: backstop` in 06-02-PLAN.md; still routed to human verification, not touched by 06-03 |

**Score:** 9/10 truths verified (0 failed, 1 requires human confirmation — see Human Verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/styles/eclat.css` | `.nav.is-open` override + `display: none` default inside `@media (max-width: 900px) .nav`; breakpoint doc block converted to anchor comments | ✓ VERIFIED | Confirmed both new rules present at eclat.css:2033-2062 in the exact order specified (default-closed, `.is-open` override, then unchanged `.nav[hidden]`); doc block anchors confirmed at eclat.css:7-22 |
| `src/components/Header.jsx` | `<nav>` className template literal appending `is-open`; inline `bp:nav` anchor; zero other changes | ✓ VERIFIED | Confirmed via `git diff --numstat` (2 lines changed total across 06-03) and direct source read |
| `src/lib/motion.js` | Inline `bp:mobile` anchor on the actual `window.innerWidth < 720` line; no logic change | ✓ VERIFIED | Confirmed via `git diff --numstat` (1 line changed) and direct source read |
| `index.html` | `viewport-fit=cover` on viewport meta | ✓ VERIFIED | Unchanged from initial verification |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| Header.jsx `open` state | eclat.css `.nav.is-open` rule | className template literal appending `' is-open'` only when `open === true` | ✓ WIRED | Confirmed: `className={\`nav${open ? ' is-open' : ''}\`}` in Header.jsx; `.nav.is-open { display: flex; }` in eclat.css with higher specificity than the plain `.nav` default |
| eclat.css breakpoint-tier doc block | the 4 `@media` call sites, `Header.jsx:39`, `motion.js:76` | shared grep-able anchor comments (`bp:tablet`/`bp:nav`/`bp:mobile`/`bp:phone`) | ✓ WIRED (re-verified, was PARTIAL) | Confirmed every anchor's grep hit lands on the real code line — `@media (max-width: 900px) { /* bp:nav */`, `const mq = window.matchMedia('(max-width: 900px)') // bp:nav`, `const mobile = window.innerWidth < 720 // bp:mobile` |
| `eclat.css :root` tokens | `.wordmark`/`.footer` selectors | `var(--wordmark-fs)`/`var(--footer-pad-y)` | ✓ WIRED | Unchanged from initial verification |
| `motion.js useDragScroll onDown` | `eclat.css .strip touch-action: pan-x` | pointer-coarse early return | ✓ WIRED | Unchanged from initial verification |
| `index.html viewport-fit=cover` | `eclat.css env(safe-area-inset-*)` calls | browser safe-area resolution | ✓ WIRED | Unchanged from initial verification |
| Header.jsx auth-slot state | `eclat.css .nav .auth-trigger`/`.auth-menu__item` | className-only styling | ✓ WIRED | Unchanged from initial verification |

### Data-Flow Trace (Level 4)

Not applicable — this phase is CSS/JS-token/markup-attribute work with no dynamic data rendering.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CSS/JS build pipeline compiles cleanly with 06-03's changes | `npx vite build` | "63 modules transformed... built in 933ms", 0 errors | ✓ PASS |
| SSR entry renders the Home route without throwing | `npx vite build --ssr src/entry-server.jsx --outDir dist/server` then `render('/')` | Rendered successfully | ✓ PASS |
| Prerendered `<nav>` correctly represents CLOSED at first paint (re-verification of CR-01 fix) | Direct SSR render inspection (same method as initial verification) | `<nav id=":R3:" class="nav" aria-label="Primary">` — no `hidden`/`is-open`, but new CSS default (`display: none` at <=900px) now makes this mean CLOSED | ✓ PASS (confirms gap #1 closed) |
| `git diff --numstat` confirms Header.jsx/motion.js diffs are minimal and scoped | `git diff --numstat 5eb6f9d..HEAD -- src/components/Header.jsx src/lib/motion.js` | `2 2 src/components/Header.jsx`, `1 1 src/lib/motion.js` | ✓ PASS |
| Full `npm run build` (migrate + vite + prerender + secrets check) | not run | Requires `POSTGRES_URL`/live DB, unavailable in this environment | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FOUND-01 | 06-01, 06-03 | Single documented breakpoint tier used consistently | ✓ SATISFIED (re-verified, was PARTIAL) | Values consistent; doc block's call-site citations now anchor-tagged and confirmed to resolve to the exact current call sites |
| FOUND-02 | 06-01 | Fluid clamp()-based typography/spacing tokens | ✓ SATISFIED | Unchanged |
| FOUND-03 | 06-01 | svh/dvh with vh fallback on full-height sections | ✓ SATISFIED | Unchanged |
| FOUND-04 | 06-01 | Touch input scrolls natively, not via JS drag handler | ✓ SATISFIED (for phone-primary touch devices, the milestone's target) | Unchanged |
| CHROME-01 | 06-02, 06-03 | Nav fully usable at phone widths: drawer opens/closes, safe-area respected, no sign-in/out regression | ✓ SATISFIED (re-verified, was BLOCKED) | All 3 clauses now pass: safe-area (unchanged), no sign-in/out regression (confirmed via minimal diff), drawer opens/closes correctly (CSS-default-closed fix confirmed via independent SSR render) |
| CHROME-02 | 06-02 | All header/nav tap targets meet 44px minimum | ✓ SATISFIED | Unchanged |
| CHROME-03 | 06-02 | Footer renders correctly/legibly at phone widths | ? NEEDS HUMAN | Unchanged — backstop must-have, no independently-checkable evidence in the repo |

No orphaned requirements — FOUND-01..04 and CHROME-01..03 are the complete set mapped to Phase 6 in REQUIREMENTS.md's traceability table; plan frontmatter `requirements:` fields across 06-01 ([FOUND-01..04]), 06-02 ([CHROME-01..03]), and 06-03 ([FOUND-01, CHROME-01]) together cover exactly this set with no gaps.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/Header.jsx`, `src/lib/motion.js`, `src/styles/eclat.css` | Header.jsx:37, motion.js:76, eclat.css:2037 | WR-01-recurrence: 3 comments still cite the doc block's own location by raw line number (`eclat.css:7`) instead of a grep-able anchor — one of these (`eclat.css:2037`) was newly authored as part of 06-03's own CR-01 fix | ⚠️ Warning (non-blocking) | Currently accurate (line 7 is confirmed to still be the doc block's opening line) and won't break from any edit below it, but is fragile against a future edit to the file-header comment block above it, and reintroduces the citation style WR-01 was meant to eliminate. Not part of the specific 6 citations 06-VERIFICATION.md's original gap #2 and 06-03-PLAN.md's must-have truth #3 targeted (those were the 4 breakpoint tiers' call sites, not the doc block's own self-reference) — does not block FOUND-01's satisfaction. Judged non-blocking: leave as a tracked follow-up rather than a new gap. |
| `src/components/Header.jsx` | 16-19, 186 (renumbered from IN-01 in the initial verification to WR-02 in the post-gap-closure review) | `truncateName`/avatar-initial slice by UTF-16 code unit, not grapheme | ⚠️ Warning | Same pre-existing issue identified in the initial verification (there rated ℹ️ Info); explicitly out of scope for 06-03 per its prohibitions list; low-probability, real text-corruption edge case for names with astral-plane characters. Not a Phase 6 must-have; tracked for a future pass. |
| `src/lib/motion.js` | 77 (shifted), 113, 202-205 | `useScrollFx`'s `mobile` flag computed once, never recomputed on resize (WR-02 in initial verification) | ⚠️ Warning | Unchanged, explicitly out of scope for 06-03 |
| `src/lib/motion.js` | 266 | Touch/mouse gate uses device-level `matchMedia('(pointer: coarse)')` (WR-03 in initial verification) | ⚠️ Warning | Unchanged, explicitly out of scope for 06-03; outside milestone's phone-portrait-only target |
| `src/lib/motion.js` | 110-199 | `useScrollFx`'s `tick` closure has high branching complexity (IN-02 in latest review) | ℹ️ Info | Pre-existing, unrelated to Phase 6's scope |

No TBD/FIXME/XXX debt markers found in any file modified by this phase or by 06-03.

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
**Why human:** This must-have is explicitly marked `verification: backstop` in the plan; no independently-checkable evidence exists in the repo.

### 6. Live signed-in auth-menu round trip

**Test:** In an environment with real Google OAuth credentials and a live database, sign in, open the auth menu, and sign out.
**Expected:** Avatar/name render correctly sized; sign-out completes and clears the session with no regression.
**Why human:** No live OAuth/DB backend was available in the execution or verification environment.

### 7. Mobile nav paint confirmation with JavaScript disabled (new, from 06-03's own plan)

**Test:** With Chrome DevTools' "Disable JavaScript" setting enabled, load `/` at a viewport width <=900px and observe the header/nav region.
**Expected:** Only the header bar (wordmark + hamburger icon) is visible; the nav links/auth-slot/Subscribe button do not render as an open full-width dropdown over the page.
**Why human:** Confirms the actual browser paint matches the CSS-cascade reasoning verified above (grep/SSR-string checks confirm markup/CSS shape, not the final rendered/painted result).

## Gaps Summary

No gaps remain. Both gaps from the initial verification are closed and independently re-confirmed:

1. **CR-01 (previously blocker, now closed):** Rebuilt the SSR bundle and re-ran `render('/')` — the same method the initial verification used. The emitted `<nav>` markup is unchanged in shape (no `hidden`/`is-open` attribute), but this is now correct: `eclat.css`'s `<=900px` `.nav` rule defaults to `display: none`, with `.nav.is-open { display: flex; }` as the sole override, activated only by the user's own click setting React's `open` state true. The nav now renders closed at every stage — SSR, pre-hydration paint, and post-hydration.
2. **Stale doc-block line numbers (previously non-blocking miss, now closed):** All 6 originally-cited stale numeric citations are replaced with grep-able anchor comments (`bp:tablet`/`bp:nav`/`bp:mobile`/`bp:phone`), each confirmed to land on the real call-site line.

One new non-blocking finding surfaced during the post-fix code review (WR-01-recurrence: 3 remaining raw-line-number self-references to the doc block's own location, `eclat.css:7`) — judged non-blocking because these citations are currently accurate, were not part of the original gap's specific scope, and don't affect FOUND-01's functional satisfaction. Tracked as a follow-up, not a new gap.

Status is `human_needed` rather than `passed` because one must-have (CHROME-03 footer legibility) remains an explicit `backstop`-verification item with no independently-checkable repo evidence, and 6 other items require real-device/real-browser confirmation that cannot be established via source inspection.

---

_Verified: 2026-09-13_
_Verifier: Claude (gsd-verifier)_
