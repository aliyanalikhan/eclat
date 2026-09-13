---
phase: 06-foundation-global-chrome-breakpoint-tokens-header-nav-footer
reviewed: 2026-09-13T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/styles/eclat.css
  - src/lib/motion.js
  - src/components/Header.jsx
  - index.html
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-09-13T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the breakpoint-tier documentation, fluid `clamp()` tokens, `svh` viewport-height fallbacks, touch-vs-mouse drag-scroll gating, `viewport-fit=cover` + safe-area nav padding, and 44px tap-target work in `eclat.css`, `motion.js`, `Header.jsx`, and `index.html`.

The `svh`/`vh` fallback pairs, the `viewport-fit=cover` meta tag, safe-area-inset padding on the mobile nav, and the fluid `clamp()` tokens (`--wordmark-fs`, `--footer-pad-y`) are all implemented correctly and consistently. However, the mobile nav has a real first-paint defect (nav renders open on every prerendered/hydrating mobile page load), the new breakpoint-tier documentation block is already out of sync with the line numbers it cites, and the drag-scroll/hero-fan breakpoint detection has stale-state edge cases.

## Critical Issues

### CR-01: Mobile nav renders open (unhidden) on first paint / before hydration

**File:** `src/components/Header.jsx:24,112`
**Issue:** `isMobile` is initialized to `false` (`useState(false)`) and is only set correctly inside a `useEffect` that runs after mount (line 38-47). `navHidden` is computed as `isMobile && !open` (line 112). Because the effect never runs during SSR/prerendering and hasn't run yet at the moment of initial client hydration, the prerendered/first-painted HTML always has `navHidden === false`, so the `hidden` attribute is never applied to `<nav>` (line 146) on the initial markup.

At mobile viewport widths, `.nav` (eclat.css:2029-2045) becomes `position: fixed; inset: var(--nav-h) 0 auto 0; ...` — a full-width dropdown menu — as soon as the CSS (loaded synchronously via `<link>` in `index.html`) is applied, which happens before the deferred `type="module"` script has executed. The net effect: every mobile visitor sees the full nav flyout (all links + the auth slot + the Subscribe button) rendered open over the top of the page on first paint, until JS loads, hydrates, and the `useEffect` finally sets `isMobile` true (which then adds `hidden` since `open` is still `false`). On slow connections/low-end devices this flash is clearly visible and looks like a broken layout on every single page load — directly undermining this phase's mobile-nav work.

**Fix:** Default-hide the mobile nav via CSS rather than relying on a client-computed `hidden` attribute as the fail-safe state, e.g. gate visibility with a JS-added "open" class instead of a JS-removed default-visible state:
```css
/* eclat.css, inside @media (max-width: 900px) */
.nav { display: none; /* ...existing fixed/column layout... */ }
.nav.is-open { display: flex; }
```
```jsx
// Header.jsx
<nav id={navId} className={`nav${open ? ' is-open' : ''}`} aria-label="Primary">
```
This makes "closed" the safe default at every stage (SSR, pre-hydration paint, and post-hydration), eliminating the flash, and matches the existing desktop behavior where `.nav` is always `display: flex` regardless of JS.

## Warnings

### WR-01: Breakpoint-tier doc-block line references are already stale

**File:** `src/styles/eclat.css:12-17`
**Issue:** The new breakpoint-tier documentation block explicitly states these literals are "kept in sync by convention, not enforcement" and cites specific line numbers to help future maintainers find each call site. Those citations are already wrong:
- `--bp-tablet` cites `eclat.css:1996`; the actual `@media (max-width: 1080px)` is at line **2014** (off by 18).
- `--bp-nav` cites `eclat.css:2006`; the actual `@media (max-width: 900px)` is at line **2024** (off by 18).
- `--bp-mobile` cites `eclat.css:2094`; the actual `@media (max-width: 720px)` is at line **2125** (off by 31).
- `--bp-phone` cites `eclat.css:2178`; the actual `@media (max-width: 460px)` is at line **2209** (off by 31).
- The cross-references to `Header.jsx:38` and `motion.js:76` also point at the *comment line* in each file, not the actual `matchMedia`/`window.innerWidth` call (lines 39 and 77 respectively).

A documentation block whose entire purpose is preventing breakpoint drift, but which is inaccurate on arrival, will actively mislead the next person who trusts it to find a call site, and undermines confidence that the four *values* (1080/900/720/460) are actually still in sync everywhere.

**Fix:** Correct the line numbers now, and consider replacing hard line numbers with a `grep`-able anchor comment (e.g. `// bp:tablet`) at each call site instead of numeric line references that will drift again on the next edit:
```
--bp-tablet : 1080px — @media (max-width: 1080px), eclat.css:2014
--bp-nav    :  900px — @media (max-width: 900px), eclat.css:2024; Header.jsx matchMedia call, Header.jsx:39
--bp-mobile :  720px — @media (max-width: 720px), eclat.css:2125; motion.js window.innerWidth < 720, motion.js:77
--bp-phone  :  460px — @media (max-width: 460px), eclat.css:2209
```

### WR-02: `useScrollFx`'s mobile flag is computed once and never re-evaluated on resize

**File:** `src/lib/motion.js:77,113,184,202-205`
**Issue:** `const mobile = window.innerWidth < 720` (line 77) is computed a single time when the effect mounts and is then closed over for the lifetime of the effect. `onResize` (lines 202-205) calls `measure()` again but never recomputes `mobile`. If the viewport is resized across the 720px `--bp-mobile` breakpoint without a route change (e.g. rotating a tablet/foldable, resizing a desktop browser window, entering/exiting a split-screen view), the hero fan-effect logic keeps using the stale decision: a session that started above 720px keeps running the desktop fan math (`tick`'s `if (cards.length && !mobile)` branch, line 113) even after the layout has switched to the mobile CSS (where `.fan-card` elements other than `.fan-card--lead` are `display:none` per eclat.css:2153-2162), and the reverse case silently skips the fan math even though the layout is now wide enough for it. This directly parallels the `--bp-mobile: 720px` literal this same diff added a sync-comment for, but the JS side doesn't actually stay in sync across resizes the way `Header.jsx`'s `isMobile` (driven by a live `matchMedia` change listener) does.

**Fix:** Recompute `mobile` inside `onResize` (and read it via a `let` rather than a `const`), mirroring the pattern already used correctly in `Header.jsx`:
```js
let mobile = window.innerWidth < 720
const onResize = () => {
  mobile = window.innerWidth < 720
  measure()
  if (reduced) tick(true)
}
```

### WR-03: Touch/mouse drag-scroll gating uses a static device query instead of the per-event pointer type

**File:** `src/lib/motion.js:266`
**Issue:** `onDown` gates the custom drag-scroll behavior with `window.matchMedia('(pointer: coarse)').matches`, which reflects the *device's primary pointer* at the time of the event, not the pointer that actually triggered it. On hybrid-input devices (touchscreen laptops/Chromebooks/Surface-style devices with a mouse attached), this can misfire in both directions:
- If the primary pointer is reported as coarse (touch), a real mouse-drag on the strip is silently disabled (the function returns before `down = true` is ever set), even though the user is dragging with a precise pointer.
- If the primary pointer is fine (mouse), a touch drag on the same element is *not* gated out, so the custom `pointermove` handler (line 273-278, `strip.scrollLeft = startLeft - dx`, no `preventDefault`) runs concurrently with the browser's native touch scrolling driven by `touch-action: pan-x` (eclat.css:1254), which can produce jittery/fighting scroll behavior for touch users on that class of device.

**Fix:** Gate per-event using `PointerEvent.pointerType`, which reflects the actual input that fired the event rather than a device-wide media query:
```js
const onDown = (e) => {
  if (e.pointerType !== 'mouse') return
  down = true
  ...
}
```

## Info

### IN-01: `truncateName` slices by UTF-16 code unit, not by grapheme

**File:** `src/components/Header.jsx:15-19`
**Issue:** `trimmed.slice(0, 18)` truncates by UTF-16 code unit. A display name containing a surrogate-pair character (e.g. an emoji or certain non-BMP characters) that straddles index 18 will be cut mid-character, rendering a broken/replacement glyph immediately before the appended ellipsis. Google account display names can contain emoji.
**Fix:** Use `Array.from(trimmed).slice(0, 18).join('')` (iterates by code point) if this needs to be robust against non-BMP characters, or leave as-is if this is an accepted low-probability edge case.

---

_Reviewed: 2026-09-13T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
