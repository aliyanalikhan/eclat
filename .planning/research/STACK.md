# Stack Research

**Domain:** Mobile-responsive layout fixes for an existing prerendered Vite + React SPA (plain CSS, no framework)
**Researched:** 2026-09-13
**Confidence:** HIGH

## Recommended Stack

**Bottom line: add zero npm packages.** Every capability this milestone needs is a native browser feature already inside the project's own `browserslist` target (`"defaults and supports es6-module"`). The right "stack change" here is a set of CSS/JS *conventions* layered onto the existing `src/styles/eclat.css` and `src/lib/motion.js`, not new dependencies.

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| CSS Custom Properties (`:root` tokens) | Native (already in use) | Central design tokens | `eclat.css:8-36` already defines color/font tokens (`--bg`, `--serif`, `--shell`, `--gut`, etc.). Extend the same block with fluid-type and spacing tokens rather than introducing a token/theming library — the pattern already exists and is idiomatic to this codebase. |
| `clamp()` fluid typography & spacing | Native CSS (universal since ~2020, no polyfill needed) | Scale hero/heading font-size and section padding smoothly between phone and desktop widths | The stylesheet currently scales type/spacing via four discrete `max-width` breakpoints (1080/900/720/460, `eclat.css:1994-2196`). Each new phone-portrait tweak either adds a 5th breakpoint or hard-codes a value that fights the existing ones. `clamp(min, preferred, max)` replaces "one more breakpoint" with one line, and is a pure CSS value — zero build tooling, zero JS. |
| `svh`/`dvh` viewport units (with `vh` fallback) | Native CSS (Baseline since ~2023; Chrome 108+, Safari 15.4+, Firefox 101+) | Correct full-height hero and modal sizing on phones | `eclat.css` uses raw `100vh` in three places (`:158` body min-height, `:500` hero `height: 100vh`, `:2019` `max-height: calc(100vh - var(--nav-h))` for the mobile nav flyout). On real phones, `100vh` includes the area the address bar covers, so the hero and the mobile nav overflow/jump as the browser chrome shows and hides — a well-documented mobile Safari/Chrome bug, not a bug in this code. Fix: write `100vh` first (old-browser fallback), then override with `100svh` (small viewport, chrome visible) directly after. `svh` is preferred over `dvh` here because `dvh` has known lag/flicker on some iOS Safari versions when the address bar animates — `svh` gives a stable, no-overflow value at the cost of a small idle gap, which is the right tradeoff for a hero band that must never clip. |
| Pointer Events API (already in use) | Native (already used in `useDragScroll`, `src/lib/motion.js:254-306`) | Unified mouse/touch/pen drag-to-scroll | No new touch library is needed — `onDown`/`onMove`/`onUp` already listen for `pointerdown`/`pointermove`/`pointerup`, which fire for touch input too. The real gap is a **behavioral bug, not a missing capability**: on a touchscreen, the `.strip` element (`eclat.css:1229-1236`) already scrolls natively via `overflow-x: auto`, and the pointer handler *also* fires and manually reassigns `scrollLeft` — the two fight each other, causing jittery/doubled scroll distance on real phones. Fix in code, not in the stack: skip the manual drag entirely when `e.pointerType === 'touch'` (native scrolling already handles touch correctly) and keep the manual logic for `mouse`/`pen` only. |
| `touch-action` CSS property | Native CSS (universal support) | Tell the browser which gestures it owns on the drag-scroll strip | Add `touch-action: pan-x` to `.strip` so a touch drag is unambiguously treated as horizontal panning and the browser doesn't also try to interpret it as a page-scroll or double-tap-zoom gesture. Zero dependency, one CSS line, pairs with the pointer-events fix above. |
| Container queries (`container-type: inline-size`, `@container`) | Native CSS (Baseline since Sept 2023; Chrome 105+, Safari 16+, Firefox 110+) | Optional — component-level responsiveness independent of the viewport | Available with zero dependency if a specific component (e.g., a card that's full-width in a grid but narrow inside the `MagazinePreview`/`Lightbox` modal) needs to respond to its own box rather than the viewport. **Not required for this milestone** — the scope is a single phone-portrait viewport band (375–430px), which existing `@media` viewport queries already address directly and more simply. Mentioned so it isn't reached for reflexively; reach for it only if a later phase needs the same component correct at multiple container widths on the *same* screen size. |
| Viewport `<meta>` tag | Already correct, no change | Prevents desktop-width layout/zoom on mobile browsers | `index.html:5` already has `<meta name="viewport" content="width=device-width, initial-scale=1" />` — correct, standard, nothing to add or fix here. Confirmed so it isn't mistakenly "fixed" during this milestone. |

### Supporting Libraries

None. There is no supporting library this milestone needs — see "What NOT to Use" for the specific packages that are tempting but wrong for this codebase's scale and philosophy.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Extend `verify-hero.mjs`'s existing CDP pattern | Visual verification across phone widths (375/390/414/430px) during this milestone | The repo already has a zero-dependency Chrome DevTools Protocol driver (`verify-hero.mjs`): raw `spawn()` of headless Chrome + native `WebSocket` (Node ≥20.6, already the pinned `engines` version) — no Puppeteer/Playwright package installed. Generalize this script to accept a `--width`/`VW` list and take one screenshot per breakpoint per route instead of adding a new test-runner dependency. This matches the project's existing "no test framework" convention while still giving repeatable, scriptable evidence that a fix actually works on a real rendering engine at the target widths. |
| Chrome DevTools device toolbar (manual) | Fast iteration while writing the CSS | No install — built into the browser already used for `npm run dev`. Use for the interactive loop; reserve the CDP script above for the "prove it" verification step per the project's existing manual/CI-style verification convention (no automated test framework exists or is being introduced here). |

## Installation

```bash
# No new dependencies are required for this milestone.
# All recommended techniques (clamp(), svh/dvh, container queries,
# touch-action, Pointer Events) are native CSS/browser APIs already
# within the project's browserslist target.
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Native `clamp()` fluid type/spacing tokens | A design-token build tool (Style Dictionary, Theo) | Only if tokens needed to be shared across multiple platforms/repos (e.g., a native app consuming the same tokens). Éclat is a single Vite/CSS codebase — a token *build step* would add tooling for no consumer that needs it. |
| Native CSS Custom Properties for breakpoint documentation | PostCSS + `postcss-custom-media` for `@custom-media` breakpoint variables | Only if the team wants `@media (--phone)` syntax with a single source of truth enforced by the build. `@custom-media` is still not shipped natively in any evergreen browser as of 2026 (Media Queries Level 5, unflagged nowhere) — using it today requires adding PostCSS to a Vite project that currently has zero CSS build step. Not worth it for four documented breakpoint values; a comment block at the top of `eclat.css` (see Stack Patterns below) gets the same "one source of truth" benefit with no tooling. |
| Pointer Events (already in `motion.js`) + a `pointerType` guard | A gesture library (Hammer.js, `react-swipeable`, `@use-gesture/react`) | Only if the milestone needed complex multi-touch gestures (pinch-zoom, multi-finger swipe, velocity-based fling physics) beyond simple horizontal drag-to-scroll. The existing hand-rolled `useDragScroll` already covers drag-to-scroll; a gesture library would duplicate it and add bundle weight for capabilities this milestone doesn't need. |
| Viewport `@media` queries (existing convention) | CSS Container Queries as the *primary* responsive mechanism | Only if the same component must look different based on its container's width independent of the viewport (e.g., a card component reused at different widths on the same screen). This milestone's target ("every page correct at 375–430px") is a viewport-level concern, which `@media` already models directly. |
| Extending `verify-hero.mjs`'s raw-CDP pattern | Playwright or Cypress for visual regression | Only if the project later adopts a real automated test suite as a deliberate, separate decision (PROJECT.md already flags "no test framework exists anywhere in the repo" as a known gap for the *auth/billing* milestone — mobile CSS fixes are not the place to introduce that dependency for the first time, especially mid-milestone and out of scope here). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Tailwind CSS / Bootstrap / any utility-CSS framework | Would require rewriting markup across every route to adopt utility classes, adds a PostCSS/JIT build step to a Vite project that currently has none, and duplicates a design system that already exists as hand-tuned CSS custom properties in one ~2,240-line stylesheet. The milestone is *fixing* an existing bespoke editorial design at specific widths, not replacing the design system. | Extend `eclat.css` with the token/`clamp()`/`svh` techniques above. |
| CSS-in-JS (styled-components, Emotion, vanilla-extract) | Adds runtime cost (styled-components/Emotion) or a build-time compiler step (vanilla-extract) to a prerendering pipeline (`prerender.js` + `src/entry-server.jsx`) that currently has zero CSS-processing dependency; the SSR + hydration model here is intentionally simple and CSS-in-JS SSR has its own well-known hydration/FOUC pitfalls that don't currently exist in this codebase. | Plain CSS in `src/styles/eclat.css`, as already established. |
| A device-detection library (`react-device-detect`, `ua-parser-js`, UA-sniffing) | User-agent sniffing to branch layout is a responsive-design anti-pattern — it misclassifies foldables/tablets/desktop-with-touch, breaks on any new device string, and this codebase already has the right primitive (`window.matchMedia`, used for `prefers-reduced-motion` in `motion.js:3-18`) which reacts to actual viewport/capability, not a spoofable string. | CSS `@media` queries for layout; `matchMedia()` in JS only when a *behavior* (not layout) must branch, following the existing `useReducedMotion` pattern. |
| A touch-gesture library (Hammer.js, `react-swipeable`, `@use-gesture/react`) for the drag-scroll strip | The strip already has native horizontal touch-scrolling for free via `overflow-x: auto` (`eclat.css:1229`); the only real bug is that the existing Pointer Events handler in `useDragScroll` doesn't get out of the way on touch. Adding a gesture library on top would be strictly more code and more bundle weight to reimplement behavior the platform already provides. | Guard `useDragScroll`'s handlers with `if (e.pointerType === 'touch') return`, plus `touch-action: pan-x` on `.strip`. |
| Playwright / Cypress / Puppeteer | Each pulls in a bundled-Chromium dependency tree (100s of MB) and a full test-runner the project has deliberately not adopted anywhere else (`README.md`/codebase map: "no test framework exists"). Introducing one *specifically* for mobile CSS screenshots, mid-way through an unrelated milestone, is disproportionate to the need. | Generalize the project's own zero-dependency `verify-hero.mjs` CDP-over-`WebSocket` pattern to sweep phone widths. |
| Sass/Less/PostCSS + Autoprefixer | None of the recommended features (`clamp()`, `svh`/`dvh`, CSS custom properties, container queries, `touch-action`) need vendor prefixes or preprocessing in any evergreen browser within this project's stated `browserslist` (`"defaults and supports es6-module"`). Adding a CSS build step is unjustified complexity for features that work unprocessed today. | Plain CSS, as already established; write the `100vh` fallback line manually before the `100svh` override (a one-line "prefix," not a build-time one). |

## Stack Patterns by Variant

**If a rule needs to differ only by viewport width (the normal case in this milestone):**
- Use the existing desktop-first `@media (max-width: …)` convention already established in `eclat.css:1994-2196` (1080 / 900 / 720 / 460px tiers) — don't switch the whole file to mobile-first mid-milestone, that would touch every existing breakpoint for no functional gain.
- Where the target phone-portrait range (375–430px) needs its own tier distinct from the existing 460px breakpoint, add one more tier (e.g. `@media (max-width: 430px)`) rather than repurposing 460px, so tablet-adjacent phones (≤460px, e.g. some Android devices in landscape-adjacent widths) don't silently inherit phone-portrait-only fixes.
- Document the breakpoint values once, as a comment directly above the `:root` token block (`eclat.css:7-8`), e.g. `/* breakpoints: 1080 / 900 / 720 / 460 / 430 — keep @media queries in sync manually, CSS custom properties cannot be used inside @media conditions */` — this substitutes for `@custom-media` without adding PostCSS.

**If a value needs to scale continuously rather than step at breakpoints (hero title size, section padding, card gaps):**
- Use `clamp(min, preferred-in-vw, max)` as a token in the `:root` block, e.g. `--fs-hero: clamp(2rem, 5vw + 1rem, 3.4rem)`, and reference it from the existing selector instead of adding another breakpoint override.
- Because this project's `--shell`/`--gut` tokens already define the desktop content width, base new fluid tokens' `vw` component on the same design intent (don't introduce a second, inconsistent spacing scale).

**If a full-bleed section must be exactly one screen tall (the hero, the mobile nav flyout):**
- Write `height: 100vh;` first, then `height: 100svh;` directly after as the override — never `dvh` alone, for the iOS Safari lag reason noted above. This is a 1-line, additive fix to the three existing `100vh` usages in `eclat.css:158,500,2019`.

**If a component (not a whole page) needs to look right at multiple *container* widths on the same screen (not in scope for this milestone, but noted for later):**
- Reach for `container-type: inline-size` + `@container` rather than duplicating the component with viewport-conditional variants.

## Version Compatibility

| Feature | Minimum Browser Support | Notes |
|---------|--------------------------|-------|
| `clamp()` | All evergreen browsers since 2020 | No fallback needed; already inside this project's `browserslist` target. |
| `svh`/`dvh`/`lvh` units | Chrome/Edge 108+, Safari 15.4+, Firefox 101+ | Write plain `vh` first as a fallback for anything older; `svh` recommended over `dvh` for hero sections due to iOS Safari update-lag reports on some `dvh` versions. |
| CSS Container Queries (size) | Chrome/Edge 105+, Safari 16+, Firefox 110+ | Baseline "widely available" since September 2023 — safe to use if a later phase needs it, not required now. |
| `touch-action` | All evergreen browsers, years-old support | No fallback needed. |
| Pointer Events (`pointerdown`/`pointermove`/`pointerup`) | All evergreen browsers, already in use in this codebase | Already relied on by `useDragScroll`; no version concern, just the `pointerType` guard described above. |
| Node.js native `WebSocket` (for extending `verify-hero.mjs`) | Node ≥ 20.6 (stable, unflagged) | Matches the project's existing `"engines": { "node": ">=20.6.0" }` in `package.json` exactly — no new runtime requirement. |

## Sources

- Direct inspection of this repository — `index.html`, `src/styles/eclat.css`, `src/lib/motion.js`, `src/routes/Edition.jsx`, `verify-hero.mjs`, `package.json` — HIGH confidence (primary source, the actual code).
- Web search, "CSS dvh svh viewport units browser support 2026 mobile Safari address bar" — cross-referenced across multiple current sources (Sizzy, Savvy, TestMu/LambdaTest, csstoolkit.net) — MEDIUM-HIGH confidence, consistent across sources: `dvh`/`svh` Baseline since Chrome 108/Safari 15.4/Firefox 101, `svh` recommended over `dvh` for overflow-sensitive hero sections due to iOS update-lag reports.
- Web search, "CSS container queries baseline browser support caniuse status" — cross-referenced (caniuse.com, LogRocket) — MEDIUM-HIGH confidence: container size queries Baseline since September 2023 (Chrome 105+/Safari 16+/Firefox 110+); container *style* queries still incomplete (Firefox pending) — correctly excluded from this milestone's recommendations since only size queries are proposed.
- General CSS platform knowledge (`clamp()`, `touch-action`, Pointer Events, CSS custom properties) — long-standing, stable web-platform features, not subject to recent change — HIGH confidence.

---
*Stack research for: mobile-responsive design fixes on an existing plain-CSS Vite + React SPA*
*Researched: 2026-09-13*
