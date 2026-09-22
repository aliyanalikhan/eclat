---
phase: 06-foundation-global-chrome-breakpoint-tokens-header-nav-footer
reviewed: 2026-09-13T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/styles/eclat.css
  - src/lib/motion.js
  - src/components/Header.jsx
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 06: Code Review Report (re-review after gap-closure wave 06-03)

**Reviewed:** 2026-09-13
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

This is a re-review of the current state of `src/styles/eclat.css`, `src/lib/motion.js`, and `src/components/Header.jsx` after plan 06-03 closed two findings from the prior review: CR-01 (mobile nav rendered open before hydration) and WR-01 (stale line-number citations in the breakpoint doc block). This report supersedes `06-REVIEW.md` (prior version).

**CR-01 verification: fix confirmed correct.** The mobile nav (`eclat.css:2033-2062`) now defaults to `display: none` inside `@media (max-width: 900px)`, independent of any JS/React state, and `.nav.is-open { display: flex }` (eclat.css:2056) is the only rule that opens it. Traced the full state machine in `Header.jsx`:
- SSR/pre-hydration render always has `isMobile=false, open=false` → no `hidden` attribute, no `is-open` class is present in the markup regardless of actual viewport width. Previously this meant the nav fell through to its old default-visible CSS; now the CSS default (`display:none` under the media query) hides it on mobile with zero dependency on JS having run. This closes the original gap correctly.
- Post-hydration, `hidden={navHidden}` (`navHidden = isMobile && !open`) and the `is-open` class are driven by mutually exclusive conditions (`open` is true → `is-open` present and `hidden` absent; `open` is false → `is-open` absent and, on mobile, `hidden` present). Confirmed via grep that `is-open` appears in exactly one place in each file, with no orphaned `.nav--open`/`.open` variants left over from before the fix — no other selector still assumes the old default-visible state.
- The `.nav.is-open` / `.nav[hidden]` pair have equal specificity (two class-equivalent selectors each), with `.nav[hidden]` last in source order. Since the two conditions are never simultaneously true in the current code, this ordering is inert today; and in the one case it isn't (`is-open` and `hidden` both true), the fail-safe direction is closed-wins, which is the *correct* direction relative to the CR-01 regression it fixed (fail hidden, not fail open). No fix needed here — noted for completeness, not raised as a finding.

**WR-01 verification: fix is incomplete.** See WR-01-recurrence finding below — a raw line-number citation of the same kind WR-01 was meant to eliminate exists in three places, one of which (`eclat.css:2037`) was written as part of the very fix that closed CR-01/WR-01.

## Warnings

### WR-01-recurrence: New/leftover stale line-number citations reintroduce the exact defect WR-01 closed

**File:** `src/components/Header.jsx:37`, `src/lib/motion.js:76`, `src/styles/eclat.css:2037`
**Issue:** WR-01 replaced the breakpoint doc block's per-tier line-number references with grep-able anchor comments (`[anchor: bp:tablet]`, `[anchor: bp:nav]`, etc. — confirmed present and correct at `eclat.css:16-21` and at all four call sites). However, three comments still cite the doc block's own location by raw line number, `eclat.css:7`:
- `Header.jsx:37`: `// --bp-nav: 900px — matches eclat.css's breakpoint-tier doc block above :root (eclat.css:7); ...`
- `motion.js:76`: `// --bp-mobile: 720px — matches eclat.css's breakpoint-tier doc block above :root (eclat.css:7); ...`
- `eclat.css:2037`: `... see the breakpoint-tier doc block at eclat.css:7. */` — this comment was newly authored as part of the CR-01 fix itself, meaning the gap-closure wave introduced a fresh instance of the exact citation style it was simultaneously supposed to be eliminating elsewhere in the same file.

None of these three will break today (line 7 is right after the 6-line file header and unlikely to move), but the whole point of the WR-01 fix was that "these are repeated literals kept in sync by convention, not enforcement" (eclat.css:10) — any future edit that adds a line to the file-header comment block silently desyncs all three citations, and nothing greps for them the way `bp:tablet|bp:nav|bp:mobile|bp:phone` does.
**Fix:** Add a self-referential anchor to the doc block's opening line (e.g. `/* --- breakpoint tiers [anchor: bp:doc] ---`) and change all three citations to reference it instead of a line number:
```diff
- // --bp-nav: 900px — matches eclat.css's breakpoint-tier doc block above :root (eclat.css:7); keep this literal in sync with that block.
+ // --bp-nav: 900px — matches eclat.css's breakpoint-tier doc block above :root [anchor: bp:doc]; keep this literal in sync with that block.
```
and likewise for `motion.js:76` and `eclat.css:2037`.

### WR-02: Truncating/initialing a display name by UTF-16 code unit can corrupt names with astral-plane characters

**File:** `src/components/Header.jsx:16-19`, `186`
**Issue:** `truncateName` does `trimmed.slice(0, 18)` and the avatar-fallback initial does `displayName.charAt(0)`. Both operate on UTF-16 code units. A Google account display name containing a character outside the Basic Multilingual Plane (many emoji, some CJK extension characters, some scripts) is represented as a surrogate pair; slicing/charAt at an arbitrary boundary can split the pair, producing a rendered replacement glyph (mojibake) in the nav and in the avatar-fallback badge instead of a truncated-but-valid string. This is real user-facing text corruption for a plausible (if not majority) subset of real Google account names, not a crash.
**Fix:** Use `Array.from(trimmed)` (which is surrogate-pair aware) before slicing:
```js
function truncateName(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'Account'
  const chars = Array.from(trimmed)
  return chars.length > 18 ? `${chars.slice(0, 18).join('')}…` : trimmed
}
```
and for the initial: `Array.from(displayName)[0]` instead of `displayName.charAt(0)`.

## Info

### IN-01: No focus trap while the mobile nav overlay is open

**File:** `src/components/Header.jsx:38-65`, `src/styles/eclat.css:2033-2054`
**Issue:** The mobile `<nav>` panel is a `position: fixed` overlay, but Tab/Shift+Tab is not constrained to it while `open` is true — focus can move past the last nav link into whatever page content sits underneath the fixed panel (visually hidden behind it but still in tab order). Escape-to-close plus refocusing the toggle is handled (Header.jsx:56-65), but there is no keydown-based wraparound or `inert`/tabindex management for the rest of the document while the panel is open.
**Fix:** Either add a minimal focus trap (cycle Tab between the toggle and the last nav item) or set `inert` (or `aria-hidden` + `tabindex="-1"` on siblings) on the rest of `<main>`/page content while `open` is true.

### IN-02: `useScrollFx`'s `tick` closure is a single ~90-line function with high branching complexity

**File:** `src/lib/motion.js:110-199`
**Issue:** The inner `tick(finalOnly)` function mixes hero-fan geometry, side-title fade, parallax, and CTA-scale logic in one closure with multiple early returns and nested loops. It is well-commented for the *math*, but the function's size and branching make it hard to reason about in isolation or to unit test any one effect (fan geometry vs. parallax vs. CTA) independently.
**Fix:** Not urgent — this is pre-existing, ported-from-prototype logic unrelated to the CR-01/WR-01 fixes under review. If touched again, consider splitting into `applyFan(...)`, `applyParallax(...)`, `applyCta(...)` helper functions called from `tick`.

---

_Reviewed: 2026-09-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
