# Architecture Research

**Domain:** Mobile-responsive retrofit of an existing prerendered Vite + React SPA (no CSS framework, no preprocessor)
**Researched:** 2026-09-13
**Confidence:** HIGH (grounded directly in current source: `src/styles/eclat.css`, `src/lib/motion.js`, `vite.config.js`, `prerender.js`, `src/components/*`, `src/routes/*` — no external ecosystem lookup needed, this is an integration question about code already in the repo)

## Standard Architecture

### System Overview

This is not a "pick a responsive framework" problem — the codebase already has a partial, ad-hoc responsive layer that this milestone must consolidate and extend, not replace.

```
┌─────────────────────────────────────────────────────────────────┐
│  src/styles/eclat.css  (single file, 2243 lines, no preprocessor)│
│  ┌───────────────┐   ┌──────────────────────────────────────┐   │
│  │ :root tokens  │   │ 5 hand-rolled @media blocks, bottom   │   │
│  │ (line 8-37)   │   │ of file: 1080 / 900 / 720 / 460 / PRM │   │
│  │ NO breakpoint │   │ Mixes layout, nav, and one-off tweaks │   │
│  │ vars today    │   │ per component in each block           │   │
│  └───────────────┘   └──────────────────────────────────────┘   │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ single bundle (cssCodeSplit:false)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  vite.config.js build → ONE .css asset, referenced by every      │
│  prerendered HTML file identically — CSS is route-agnostic       │
└───────────────────────────────┬───────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  src/lib/motion.js — imperative DOM/JS layer that duplicates     │
│  layout knowledge CSS should own:                                │
│  - useScrollFx: hardcodes `mobile = innerWidth < 720` (its own   │
│    breakpoint, independent of CSS's 720px block — coincidentally │
│    matches today, but not sourced from one place)                │
│  - Header.jsx: hardcodes `matchMedia('(max-width: 900px)')`      │
│    for its own mobile-nav toggle — a THIRD independent 900px     │
│    literal, coincidentally matching CSS's nav breakpoint          │
│  - useDragScroll: already Pointer Events (not mouse-only) —      │
│    see Pattern 2 below, this is further along than it looks      │
└─────────────────────────────────────────────────────────────────┘
```

**Key existing facts that shape this milestone:**
- There is **no** breakpoint variable system — every `@media (max-width: …)` and every JS `matchMedia`/`innerWidth` check is a hardcoded literal, scattered across `eclat.css` and `motion.js`/`Header.jsx`. Three independent sources of "what is mobile" exist today (720px in `useScrollFx`, 900px in `Header.jsx`'s `matchMedia`, and CSS's own 900/720/460 tiers) and they are not guaranteed to agree as fixes are made.
- A **mobile-nav pattern already exists and works**: `Header.jsx` (`isMobile` state + `nav__toggle` button + `.nav[hidden]`) and its CSS counterpart at `eclat.css:2004-2039` (`.nav` becomes `position: fixed` full-width dropdown under 900px). This is the reusable pattern to extend, not invent.
- `useDragScroll` (`src/lib/motion.js:254-306`) is **already built on Pointer Events** (`pointerdown/pointermove/pointerup/pointerleave/pointercancel`), which natively unify mouse, touch, and pen — this is not a "mouse events only" problem in the way the question assumes. The real touch gap is narrower and subtler (see Pattern 2).
- `vite.config.js` sets `cssCodeSplit: false` — the whole app ships one CSS file, included identically in every prerendered route's `<head>`. There is no per-route or conditional CSS today.

## Recommended Project Structure

No new build tooling, no CSS preprocessor, no CSS-in-JS — stay inside the existing "plain CSS in `src/styles/`" convention. The fix is organizational (extend the one file with disciplined sections and real tokens), not a new pipeline.

```
src/
├── styles/
│   └── eclat.css          # UNCHANGED single entry point, but internally reorganized:
│                           #   1. :root tokens        — ADD breakpoint + fluid-scale custom properties here
│                           #   2. reset                — unchanged
│                           #   3. component rules      — unchanged authoring location (rules stay colocated
│                           #      with the component selector they style, as today — do NOT split into
│                           #      per-component .css files; Vite/PostCSS-less pipeline has no import-merge
│                           #      step configured, and cssCodeSplit:false already forces one bundle anyway)
│                           #   4. @media blocks (bottom) — CONSOLIDATE into a fixed, named tier order that
│                           #      mirrors the new --bp-* tokens (see Pattern 1), replacing today's ad hoc
│                           #      1080/900/720/460 literals
├── lib/
│   ├── motion.js           # MODIFIED: useDragScroll gets a pointer-type/coarse-pointer branch (Pattern 2);
│   │                       #   useScrollFx's hardcoded `< 720` reads from the same breakpoint source as CSS
│   └── useBreakpoint.js    # NEW (optional, only if JS needs to react to breakpoint changes beyond Header's
│                           #   existing matchMedia — see Pattern 3): single hook wrapping matchMedia against
│                           #   the same pixel values the CSS tokens use, so JS and CSS can never disagree
```

### Structure Rationale

- **No preprocessor is being introduced.** CSS custom properties (`:root { --bp-sm: …; }`) are the correct "variable" mechanism here since the project explicitly has no Sass/PostCSS/Tailwind and the constraint is "don't rewrite the build." Custom properties can't be used *inside* `@media` query conditions (media queries can't reference `var()` — this is a real CSS limitation, not a project gap), so breakpoint values must additionally exist as plain numbers wherever a `@media` query needs them and wherever JS needs them (see Pattern 1 for how to keep these from drifting apart).
- **Stay with one CSS file.** Splitting into `base.css` / `layout.css` / `components.css` etc. would require either a manual `@import` chain (which Vite passes through file-by-file at dev time and concatenates at build time — works, but is a bigger structural change than this milestone needs) or a PostCSS bundler config that doesn't exist today. Given `cssCodeSplit: false` already merges everything into one asset regardless, splitting source files buys organization but not performance — reserve that refactor for if `eclat.css` becomes unwieldy, not as a prerequisite for mobile fixes.
- **Motion/JS breakpoint literals get pulled toward the CSS tokens, not replaced with a JS framework.** `useScrollFx`'s `mobile = window.innerWidth < 720` and `Header.jsx`'s `matchMedia('(max-width: 900px)')` are two of three sources of truth for "is this mobile" today; a mobile-responsive milestone that touches breakpoints without reconciling these will silently reintroduce the exact drift bug class this research flags.

## Architectural Patterns

### Pattern 1: CSS custom-property tokens for spacing/type scale + duplicated-literal breakpoint constants

**What:** Add fluid-spacing and fluid-type tokens as `:root` custom properties (these work fine referenced anywhere in a rule body, including inside `clamp()`), but breakpoints themselves must exist as literal numbers repeated at each `@media` call site — CSS has no way to parameterize a media query condition with a custom property. The fix for drift is a documented single source of truth (a comment block at the top of `eclat.css` naming the tiers) that both the CSS media queries and any JS `matchMedia`/`innerWidth` checks are written to match, not a technical mechanism that enforces it (none exists in plain CSS).

**When to use:** Any new spacing/type value introduced during the mobile-fix work (do not hardcode new magic numbers; add a token). Any new `@media` breakpoint must reuse one of the documented tiers, not a new arbitrary width.

**Trade-offs:** No compile-time guarantee that CSS and JS breakpoints stay in sync (unlike Sass `$breakpoint` variables shared via a JS-readable config) — this is a real limitation of the "no preprocessor" constraint, mitigated only by convention + a single documented tier list + (optionally) `useBreakpoint.js` (Pattern 3) as the one JS-side reader.

**Example:**
```css
:root {
  /* --- breakpoint tiers (documented source of truth; keep in sync with any
     JS matchMedia/innerWidth check — see src/lib/motion.js useScrollFx and
     Header.jsx's isMobile) --- */
  /* --bp-phone: 460px   — small-phone tier, matches existing @media (max-width: 460px) */
  /* --bp-mobile: 720px  — phone-portrait tier, matches existing @media (max-width: 720px) */
  /* --bp-nav: 900px     — nav-collapse tier, matches Header.jsx isMobile + existing 900px block */
  /* --bp-tablet: 1080px — matches existing @media (max-width: 1080px) */

  /* fluid type/spacing — usable directly since these ARE custom properties */
  --space-fluid-md: clamp(16px, 4vw, 32px);
  --type-fluid-h1: clamp(28px, 6vw + 1rem, 56px);
}
```

### Pattern 2: Pointer Events already unify touch/mouse — the real gap is native-scroll conflict, not missing touch handlers

**What:** `useDragScroll` in `src/lib/motion.js` listens for `pointerdown/pointermove/pointerup/pointerleave/pointercancel` — these fire uniformly for mouse, touch, and pen in every browser this project targets (`es2020`/"defaults and supports es6-module"), so there is no need to add parallel `touchstart/touchmove/touchend` handlers. The actual mobile risk is that `.strip` (`eclat.css:1229-1238`) already has native `overflow-x: auto` + `scroll-snap-type: x proximity`, and on a touchscreen the browser's own touch-panning and the JS `strip.scrollLeft = startLeft - dx` assignment can both be live at once (the handlers never call `preventDefault()`), which can produce double-handled/jankier scrolling on real touch devices than the desktop mouse-drag experience suggests.

**When to use:** Any phase-4-equivalent fix to `Edition.jsx`'s preview strip or `Home.jsx`'s drag-scroll usage. Verify on a real touch device (or Chrome DevTools touch emulation, which does dispatch Pointer Events with `pointerType: 'touch'`) before assuming it "just works" because Pointer Events are already wired up.

**Trade-offs:** The safest fix if jank is observed is to gate the JS drag path off for coarse pointers (`window.matchMedia('(pointer: coarse)')` — true on touchscreens, false for mouse/trackpad) and let native `overflow-x: auto` touch-scrolling handle it alone, rather than adding `preventDefault()`/`touch-action` fighting to make both systems cooperate. This keeps desktop mouse-drag behavior (the `is-dragging`/click-swallow logic) completely untouched.

**Example:**
```js
const onDown = (e) => {
  if (window.matchMedia('(pointer: coarse)').matches) return // let native touch scroll own it
  down = true
  // ...unchanged desktop mouse/pen drag logic
}
```

### Pattern 3: Optional shared `useBreakpoint` hook, only if a third JS consumer appears

**What:** `Header.jsx` already has a correct, self-contained `matchMedia('(max-width: 900px)')` `useEffect` pattern for reacting to breakpoint crossings in JS. `useScrollFx` has its own `innerWidth < 720` one-shot check. If the mobile-fix work needs a *third* place to branch on viewport width in JS (e.g., MagazinePreview or Lightbox needing different behavior on phone widths), extract a tiny shared hook instead of writing a fourth ad hoc literal.

**When to use:** Only when a genuine third/fourth JS breakpoint consumer appears. Do not preemptively refactor `Header.jsx`'s working `isMobile` state or `useScrollFx`'s working `mobile` flag just to use a shared hook — that's churn on working code outside this milestone's stated scope (phone-portrait fixes only, not a JS architecture refactor).

**Trade-offs:** Keeps JS/CSS breakpoint values one step further from drifting, at the cost of one more file. Skip it if only Header and useScrollFx ever need JS-side breakpoint awareness — two independent literals that are individually simple and well-commented is an acceptable, honest trade-off given the "no preprocessor" constraint already accepted for CSS.

## Data Flow

### Request Flow — confirms prerender.js has zero interaction with responsive CSS

```
npm run build
  → vite build            (client bundle: JS + ONE eclat.css asset, hashed filename)
  → vite build --ssr      (SSR render function only, no CSS involved)
  → prerender.js           for each route in allRoutes():
                              renders route to HTML string via SSR bundle
                              injects <head> tags from src/data/seo.js
                              writes dist/<route>/index.html
                            ↑ the <link rel="stylesheet" href="/assets/eclat-<hash>.css">
                              tag is identical across every single prerendered HTML file —
                              prerender.js never reads, filters, or varies CSS per route
  → deletes dist/server (SSR artifact only)
```

**Confirmed: no interaction to design around.** CSS is fully static and route-agnostic by construction (`cssCodeSplit: false`), and `prerender.js` only ever manipulates `<head>` SEO tags (title/meta/JSON-LD via `src/data/seo.js`) and body markup — it has no code path that touches stylesheet content or linkage at all. A phone-portrait media query added to `eclat.css` applies identically whether the page was reached via the prerendered static HTML (first paint) or via client-side React Router navigation post-hydration, with no prerender-side changes required. The one thing to actually verify (not a prerender concern, but adjacent): confirm no route-specific `<meta name="viewport">` override exists in `src/data/seo.js` that could fight a global `width=device-width, initial-scale=1` set in `index.html` — check this once, not per-phase.

### State Management

Not applicable to this milestone in the traditional sense — there is no new state library. The one relevant existing state-adjacent detail: gated-content routes (`Edition.jsx`, `Account.jsx`) render distinct branches (loading skeleton / locked-teaser / entitled-full-content) driven by `useEntitlements`/`useGatedContent`/`useSession` (from the completed auth/billing milestone). Each of those branches is a **separate DOM subtree with its own layout**, so a mobile-portrait fix to `Edition.jsx` must be verified in all three states (a phone-width fix to the "entitled" branch does not automatically fix the "locked" teaser branch's markup) — this is a real per-component checklist item, not a data-flow risk.

### Key Data Flows

1. **CSS delivery:** Build-time-only, single static asset, identical for every route and every auth/entitlement state — no runtime CSS logic exists or is needed for this milestone.
2. **JS breakpoint reads:** Currently two independent runtime reads (`Header.jsx` via `matchMedia` listener, `useScrollFx` via one-time `innerWidth` check at effect-mount/resize) — both client-only (`window`-guarded), never touched during SSR/prerender since `prerender.js`'s `renderToString()` pass has no `window`.

## Scaling Considerations

Not a traffic/user-scale concern (this is a layout-correctness milestone, not an infra one). "Scaling" here means how the fix effort compounds across pages:

| Scope | Architecture Adjustments |
|-------|--------------------------|
| Token/pattern layer (this milestone's Phase 0) | Establish breakpoint-tier documentation + fluid-spacing/type tokens once in `eclat.css:8-37`; touch-input decision for `useDragScroll` once in `motion.js`. Everything downstream reuses these — get them right before touching per-page CSS. |
| Per-page fixes (Home, Archive/Edition/Books/Writings, modals, Subscribe/Account) | Each page's existing `@media` rules get consolidated onto the shared tiers; new phone-specific rules are added under the same tiers rather than new arbitrary widths. No shared risk across pages once tokens exist — pages are independent CSS selector scopes today, so parallelizing per-page fixes across separate plan tasks is safe. |
| Global chrome (Header/Footer) | Touches every page transitively — fix and verify this early alongside the token work, not deferred to "last," since a header/nav regression is visible on every other page's screenshot/UAT. |

### Scaling Priorities

1. **First risk:** Breakpoint/token drift (three independent "what is mobile" literals today) compounding into inconsistent behavior as more phone-width `@media` rules are added ad hoc. Mitigate by documenting the tier list in `eclat.css` *before* any per-page fix work starts (Pattern 1).
2. **Second risk:** Touch-vs-native-scroll double-handling in `useDragScroll` (Pattern 2) being discovered late, after several pages' drag-strips have already been visually verified only on desktop mouse emulation. Mitigate by testing the strip on a real touch device (or DevTools touch emulation) as part of the *first* page that uses it (Home or Edition), not deferred to a final cross-device pass.

## Anti-Patterns

### Anti-Pattern 1: Introducing a CSS preprocessor or CSS-in-JS "just for this milestone"

**What people do:** Reach for Sass/PostCSS/Tailwind/styled-components to get real breakpoint variables and nesting, since plain CSS custom properties can't parameterize `@media` conditions.
**Why it's wrong:** Violates the stated constraint ("existing Vite + React SPA... design, routing, and content model stay as-is") and adds a build-tooling dependency change to what should be a pure layout/CSS milestone — `vite.config.js` has zero PostCSS config today, and introducing one is an unrelated, higher-risk change to bundle behind mobile fixes.
**Do this instead:** Custom properties for anything that's a *value* (spacing, type scale, colors — already the pattern at `eclat.css:8-37`), plain repeated numeric literals for anything that's a *media query condition*, disciplined by a documented tier comment block (Pattern 1).

### Anti-Pattern 2: Adding parallel `touchstart`/`touchmove` handlers alongside the existing Pointer Events in `useDragScroll`

**What people do:** See "drag scroll doesn't feel right on my phone" and assume Pointer Events don't cover touch, then bolt on a second, separate touch-event listener path.
**Why it's wrong:** Pointer Events already fire for touch input in every target browser here; adding a second handler set creates two competing sources of `scrollLeft` mutation and duplicate `is-dragging` class churn, making the bug harder to diagnose, not easier.
**Do this instead:** Diagnose first (is it native-scroll-vs-JS-scrollLeft conflict, Pattern 2), then fix with a `pointer: coarse` gate on the *existing* single handler set, not a second one.

### Anti-Pattern 3: Fixing breakpoints per-page without touching the shared tier/token layer first

**What people do:** Jump straight into "make Home look right on an iPhone," ship a `@media (max-width: 400px)` rule scoped to Home only, then repeat with a slightly different arbitrary width on Archive, Books, Writings.
**Why it's wrong:** Recreates and worsens the exact drift problem already present (three literals today) — by the time all pages are "fixed" independently, the codebase could have five or six near-duplicate but not-quite-matching breakpoint values, worse than the current three.
**Do this instead:** Land the tier-documentation + token pass (Pattern 1) as an explicit first phase/plan, referenced by every subsequent per-page plan, per the Build Order below.

## Integration Points

### External Services

None. This milestone has no external-service dependency — it is pure client-side CSS/JS layout work on an already-complete backend (auth/billing milestone is separate and finished per `PROJECT.md`).

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `src/styles/eclat.css` ↔ every route/component | Global CSS class selectors, no scoping/CSS-modules | Single shared file — a token/tier change here is felt everywhere simultaneously; this is why the token pass must land first and be treated as a shared-contract change, reviewed once, not re-litigated per page. |
| `src/lib/motion.js` ↔ `Home.jsx`, `Edition.jsx` (drag-scroll), all routes with `[data-rev]`/`[data-par]`/`[data-cta]` (reveal/parallax), `Home.jsx` hero (`useScrollFx`) | Hooks called directly from route components; DOM attribute selectors (`data-*`) as the coupling mechanism, not props | Touch-input changes to `useDragScroll` are isolated to that one function — `useScrollFx`, `useReveal`, `runFlip` are untouched by the touch-input question and don't need modification for this milestone unless their own mobile visual behavior (already partially handled via the `mobile` flag and the 720px CSS block) needs adjustment. |
| `Header.jsx` (mobile nav) ↔ `eclat.css` `.nav`/`.nav__toggle` rules | Component renders `hidden` attribute + class names; CSS owns all visual state (fixed-position dropdown, animation) | This is the reusable mobile-nav pattern — any new mobile-only overlay/menu (if the milestone surfaces one, e.g., a MagazinePreview mobile control layout) should follow this same shape: JS owns open/closed boolean + a11y attributes, CSS owns the presentation, not the other way around. |
| `prerender.js`/`entry-server.jsx` ↔ CSS | None (confirmed) | CSS is a single static build asset, identical across all prerendered routes and all auth/entitlement states; no prerender-time branching on viewport/CSS is possible or needed. |
| `MagazinePreview.jsx` / `Lightbox.jsx` ↔ `eclat.css` `.lightbox`/`.magazine-preview__*` rules | Shared `.lightbox` base class + component-specific modifier classes | Both modals already share the same accessibility contract (focus trap, Esc, scroll-lock) and the same base CSS class — a phone-width fix to `.lightbox`'s frame sizing/close-button hit-target benefits both components at once; fix the shared `.lightbox` rules before the modal-specific `.magazine-preview__nav`/`__frame` overrides. |

## Suggested Build Order

Given the constraint that tablet/desktop are out of scope and only phone-portrait (~375–430px) matters, and given the dependency shape above:

1. **Phase A — Shared foundation (tokens + breakpoint documentation + touch-input decision).** Land in `eclat.css` (tier comment block + fluid-spacing/type custom properties) and `src/lib/motion.js` (`useDragScroll` pointer-coarse gate, verified on a real/emulated touch device) before any per-page visual work. This is the one phase every other phase depends on — a token/tier change made later forces re-verification of every page already "fixed."
2. **Phase B — Global chrome (Header/Footer).** Already has a working mobile-nav pattern (`Header.jsx` + `.nav` CSS at 900px); this phase is about verifying/tightening it at true phone-portrait widths (375-430px, narrower than the existing 900px collapse point suggests was tested) and doing the same for `Footer.jsx`. High leverage — every other page inherits whatever chrome bugs exist here.
3. **Phase C — Content pages (Home, Archive, Edition, Books, Writings).** These share `.grid-covers`/`.newest__grid`/`.writing` CSS patterns already partially addressed in the existing 900/720/460 blocks — consolidate onto the Phase A tiers and extend for true phone-portrait. Home is highest-risk (hero fan carousel via `useScrollFx`, already has a `mobile` branch — verify it against real phone widths, not just the `< 720` boundary) and Edition carries the drag-scroll strip (Pattern 2) plus the three-branch gated-content layout (loading/locked/entitled) that must each be checked. Can be parallelized across pages once Phase A tokens exist, since each page's CSS selectors are independent.
4. **Phase D — Modals (MagazinePreview, Lightbox).** Depends on Phase A's touch-input decision (both may gain touch-swipe-to-navigate expectations on phone, even though `MagazinePreview`'s Previous/Next buttons already work via tap) and benefits from Phase C's page-level fixes being stable (they're triggered from Edition/Archive/Books cover grids). Shared `.lightbox` base class means fixing frame/close-button sizing once helps both components.
5. **Phase E — Subscribe/Account.** Lowest shared-CSS overlap with the other phases (`.plans`, `.panel`, `.field-pair`, `.invoice` already have some 720/900 handling) and no drag-scroll/modal touch concerns — can run last or in parallel with Phase D since it doesn't share components with the modal work, only the Phase A token/chrome foundation.

## Sources

- Direct inspection of current repository source (primary/authoritative — this is an integration question about code that already exists, not an external ecosystem question):
  - `src/styles/eclat.css` (2243 lines — tokens at 1-37, existing `@media` blocks at 1994-2244)
  - `src/lib/motion.js` (full file — `useScrollFx`, `useDragScroll`, `runFlip`, `useReveal`, `useScrolled`)
  - `src/components/Header.jsx` (existing mobile-nav pattern, `isMobile`/`matchMedia` usage)
  - `src/components/Lightbox.jsx`, `src/components/MagazinePreview.jsx` (shared `.lightbox` modal contract)
  - `vite.config.js` (`cssCodeSplit: false`, no PostCSS/preprocessor config, `target: 'es2020'`)
  - `prerender.js` (confirmed: no CSS-related logic, only `<head>` tag injection from `src/data/seo.js`)
  - `.planning/PROJECT.md` (v1.1 milestone scope: phone-portrait only, tablet/desktop explicitly out of scope)
  - `.planning/codebase/ARCHITECTURE.md` (prior codebase map, 2026-09-08, confirms no test framework/no CSS tooling beyond Vite defaults)

---
*Architecture research for: mobile-responsive retrofit, Éclat v1.1 milestone*
*Researched: 2026-09-13*
