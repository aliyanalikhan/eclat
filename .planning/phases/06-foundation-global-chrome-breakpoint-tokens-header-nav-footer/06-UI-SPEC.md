---
phase: 6
slug: foundation-global-chrome-breakpoint-tokens-header-nav-footer
status: draft
shadcn_initialized: false
preset: none
created: 2026-09-13
---

# Phase 6 — UI Design Contract

> Visual and interaction contract for Foundation & Global Chrome (breakpoint tokens, header, nav,
> footer). This is a **retrofit, not a redesign** — all 4 locked decisions in `06-CONTEXT.md`
> (D-01..D-04) chose the lowest-risk, fix-not-rebuild option. This contract documents the existing
> visual system precisely enough that the executor changes nothing it isn't explicitly told to,
> and adds only the tokens/fixes FOUND-01..04 and CHROME-01..03 require.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none — hand-authored BEM-ish CSS classes (`.nav`, `.auth-trigger`, `.footer__nav`, etc.) |
| Icon library | none — inline hand-drawn SVG (hamburger/close icon and auth-menu caret, both inline in `Header.jsx`) |
| Font | `--serif` 'Bodoni Moda' (display/headings/wordmark), `--sans` Archivo (body/nav/UI text), `--narrow` Archivo Narrow (fine print, footer links) |

**shadcn gate — deliberately skipped.** `components.json` is absent and the project's own
`REQUIREMENTS.md` "Out of Scope" table explicitly excludes CSS framework adoption (Tailwind/
Bootstrap) and CSS-in-JS/preprocessors: *"Every capability needed is a native CSS/browser feature
already within this project's target — adding a framework is unjustified dependency weight for a
plain-CSS codebase."* shadcn's component model assumes Tailwind. Introducing it here would violate
a locked project constraint and contradict this phase's own "fix, don't rebuild" posture (D-01..
D-04). The single-file plain-CSS convention (`src/styles/eclat.css`, 2245 lines, `cssCodeSplit:
false` in `vite.config.js`) is extended in place, not replaced.

---

## Breakpoint Tokens (FOUND-01)

**D-01 (locked): keep two tiers, not one — document, don't change.** No pixel value changes; this
is a documentation/naming pass that stops the 3-way independent-literal drift research flagged.

Add this comment block directly above the existing `:root` token block in `eclat.css` (`:7-8`):

```css
/* --- breakpoint tiers (documented source of truth — CSS cannot reference
   var() inside an @media condition, so these are repeated as literal
   numbers at each @media call site and in the two JS consumers below;
   any change to a tier value must be applied in all three places) ---
   --bp-tablet : 1080px  — @media (max-width: 1080px)  [eclat.css:1996]
   --bp-nav    :  900px  — @media (max-width: 900px)   [eclat.css:2006]
                          — Header.jsx matchMedia('(max-width: 900px)') [Header.jsx:38]
   --bp-mobile :  720px  — @media (max-width: 720px)   [eclat.css:2094]
                          — motion.js useScrollFx `window.innerWidth < 720` [motion.js:76]
   --bp-phone  :  460px  — @media (max-width: 460px)   [eclat.css:2178]
*/
```

No behavior change: `--bp-nav` (900) already equals `Header.jsx`'s literal and `--bp-mobile` (720)
already equals `useScrollFx`'s literal today — this pass makes the agreement explicit and durable,
it does not correct a present mismatch. Do not touch `Header.jsx`'s or `motion.js`'s working
literals beyond adding a one-line comment pointing back at this block.

---

## Fluid Tokens (FOUND-02)

**Discretion (CONTEXT.md):** exact `clamp()` values are mine to set; the codebase already has one
working precedent to match in spirit — `.hero h1 { font-size: clamp(44px, 7vw, 104px) }`
(`eclat.css:710`). This phase applies the same technique to the two chrome values that currently
have no phone-portrait scaling at all (footer vertical padding is completely flat; the wordmark
only has a single hard step at 460px). Do not touch `--gut`'s existing 32→22px step at 900px —
that is intentional nav-collapse-tier spacing per D-01 and is out of this phase's blast radius.

Add to `:root` (`eclat.css:8-37`):

```css
--wordmark-fs: clamp(20px, 5.4vw, 26px);
--footer-pad-y: clamp(40px, 10vw, 56px);
```

| Token | Replaces | Old behavior | New behavior |
|-------|----------|---------------|---------------|
| `--wordmark-fs` | `.wordmark` font-size 26px + the `@media (max-width: 460px)` override to 21px (`eclat.css:2179-2182`) | Hard jump at exactly 460px; flat 21px for every width below it (no difference between a 375px and 430px phone) | Continuous scale — ~20.3px at 375px, ~23.2px at 430px, reaches the original 26px ceiling above ~481px viewport width. Remove the now-redundant `.wordmark` rule inside the `460px` media block; keep its `letter-spacing: 0.18em` override only if still needed for legibility at the smaller computed size (verify visually, keep if it still reads correctly) |
| `--footer-pad-y` | `.footer { padding: 56px var(--gut); }` (`eclat.css:1737`, flat at every width) | No phone-portrait scaling at all | `padding: var(--footer-pad-y) var(--gut);` — eases to ~40px at 375px, ~43px at 430px, unchanged 56px above ~560px viewport |

Both tokens are additive, single-property changes — no other selector, layout direction, or
color changes.

---

## Viewport-Height Correctness (FOUND-03)

**D-04 (locked): exactly 3 spots, not a full `vh` audit.** Write the existing `vh`-based
declaration first (kept as the old-browser fallback), then the `svh` companion directly after as
the override (unsupporting browsers ignore the invalid `svh` line and keep the `vh` cascade value;
supporting browsers take the last valid declaration).

| # | Selector | File:line | Old declaration | Add immediately after |
|---|----------|-----------|------------------|------------------------|
| 1 | `.hero` | `eclat.css:500` | `height: 100vh;` | `height: 100svh;` |
| 2 | `.lightbox` (frame sizing) | `eclat.css:1777, 1785, 1788` | `padding: 6vh 6vw;` / `max-height: 88vh;` / `max-width: min(1000px, calc(88vh * var(--lb-ratio, 1)));` | `padding: 6svh 6vw;` / `max-height: 88svh;` / `max-width: min(1000px, calc(88svh * var(--lb-ratio, 1)));` — same three properties, `vh`→`svh` only |
| 3 | mobile `.nav` dropdown | `eclat.css:2021` | `max-height: calc(100vh - var(--nav-h));` | `max-height: calc(100svh - var(--nav-h));` |

**Explicitly out of scope (log, don't fix):** `.magazine-preview`'s own `max-height: 78vh`
(`eclat.css:1913`) is a 4th `vh` usage but is **not** one of D-04's 3 named spots (D-04 names
"hero section, lightbox, mobile nav dropdown" — `.lightbox` is the shared base class used by both
`Lightbox.jsx` and `MagazinePreview.jsx`, but `.magazine-preview`'s own additional `78vh` override
is a distinct rule). Leave it unchanged; carry it forward as a known follow-up for Phase 8 (Modal
Overlays), which owns `MagazinePreview.jsx`.

---

## Touch vs. Mouse Drag-Scroll (FOUND-04)

**D-02 (locked): gate the existing handler, do not rewrite it.** Behavioral contract, not a
visual one — included here because it's this phase's 4th foundation requirement and the plan/
executor need the exact gate condition.

- In `src/lib/motion.js`'s `useDragScroll`, add a single early-return at the top of `onDown`:
  `if (window.matchMedia('(pointer: coarse)').matches) return` — desktop mouse/trackpad path is
  completely unchanged (no other line in `useDragScroll` moves).
- In `eclat.css`, add `touch-action: pan-x;` to `.strip` (`eclat.css:1231`) so the browser
  unambiguously cedes horizontal panning to native scrolling once the JS handler steps aside.
- No change to `.strip`'s existing `overflow-x: auto; scroll-snap-type: x proximity;` — native
  scroll-snap already does the work once the JS handler stops competing with it.
- Verification must use a real touch device or Chrome DevTools' touch-emulation flag (dispatches
  real `pointerType: 'touch'` events) — a resized desktop viewport alone does not exercise this
  gate.

---

## Nav Drawer (CHROME-01)

**D-03 (locked): keep the exact visual pattern — fixed full-width dropdown under the header,
toggled by `Header.jsx`'s `isMobile`/`open` state (`Header.jsx:24-46`, `eclat.css:2011-2027`).
No slide-in side drawer, no visual redesign.** This section is fixes only.

**Prerequisite (required, not optional):** `index.html:5`'s viewport meta tag has no
`viewport-fit=cover`. Every `env(safe-area-inset-*)` call below resolves to `0` and is inert
without it. Change:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

**Safe-area insets on the nav dropdown** (`.nav` inside the `@media (max-width: 900px)` block,
`eclat.css:2011-2023`): add to the existing rule (don't replace `padding`, extend it) —
```css
padding-left: max(var(--gut), env(safe-area-inset-left));
padding-right: max(var(--gut), env(safe-area-inset-right));
padding-bottom: max(22px, env(safe-area-inset-bottom));
```
This preserves the existing `22px` bottom/`var(--gut)` side values as the floor on non-notched
devices and only grows the inset on devices that report a nonzero safe area (landscape notch,
gesture-bar home indicator).

**No regression to sign-in/sign-out:** the auth-slot's three states (loading placeholder / signed-
out `<a>` / signed-in trigger+menu, `Header.jsx:163-239`) and their JS logic are untouched by this
phase — only their CSS sizing changes (see tap targets below). Verify all three states after the
CSS change, since they share the same `.nav` container whose padding is being extended.

---

## Tap Targets (CHROME-02)

All targets below apply specifically **inside the `@media (max-width: 900px)` nav-dropdown
context** (desktop mouse targets are unaffected and already fine as-is; this is a phone-portrait,
touch-input requirement).

| Element | File:line | Current size (mobile) | Status | Fix |
|---------|-----------|------------------------|--------|-----|
| `.nav__toggle` (hamburger) | `eclat.css:375-382` | 26px icon + 10px padding on all sides ≈ 46×46px hit area | ✅ Already passes | No change — verify only |
| `.nav > a` (nav links) | `eclat.css:2029-2032` | `padding: 16px 2px`, 13px/line-height 1 text ≈ 47px tall, full-width block | ✅ Already passes | No change — verify only |
| `.nav > .btn` (Subscribe CTA) | `eclat.css:2034-2037` (`.btn--sm` base at `eclat.css:260-262`, `padding: 12px 22px`) | ≈37px tall | ⚠ Fails | Inside the `900px` block, add `min-height: 44px; display: inline-flex; align-items: center; justify-content: center;` to the existing `.nav > .btn` rule |
| `.auth-trigger` (avatar+name button) | `eclat.css:404-414` | `padding: 0`, governed by 20px avatar/13px text ≈ 20-24px tall | ⚠ Fails | Inside the `900px` block only, add a `.nav .auth-trigger { min-height: 44px; padding-block: 10px; }` override (mirrors the `16px`-padding treatment already used on `.nav > a`) |
| `.auth-menu__item` (Account / Sign out rows) | `eclat.css:465-474` | `padding: 8px 16px`, default ~16px body text ≈ 32px tall | ⚠ Fails | Bump to `padding: 14px 16px` (14+14+16=44px) — applies at all widths since this menu only ever renders as a small dropdown, not worth a separate mobile-only override |

Footer links (`.link-quiet`, `.footer__nav`) are **not** in CHROME-02's scope (that requirement
names "menu button, nav links, auth avatar/menu" — header/nav only). Leave footer tap sizing as-is;
CHROME-03 below covers the footer's own requirement (legibility/no-overlap, not touch-target size).

---

## Footer (CHROME-03)

`.footer__inner` already reflows to a column at `≤720px` (`eclat.css:2172-2175`,
`flex-direction: column; gap: 24px;`) and `.footer__nav` already wraps
(`eclat.css:1757-1761`, `flex-wrap: wrap`). The only new change here is `--footer-pad-y`
(Fluid Tokens section above) — no structural/layout rule changes. Verify at 375px and 430px that:
- The wordmark, nav links, and copyright line each render on their own row with no overlap
- `.footer__fine`'s long copyright sentence (`Footer.jsx:32`) wraps onto multiple lines without
  clipping against the container edge or crowding the nav row above it (see UI Considerations
  below — this is the one flagged backstop item)

---

## Spacing Scale

Declared values (must be multiples of 4) — **new tokens introduced by this phase only**:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | `.auth-avatar` margin-right, `.auth-caret` gap (pre-existing, unchanged) |
| sm | 8px | `.nav__toggle` padding, `.auth-menu` padding (pre-existing, unchanged) |
| md | 16px | `.nav > a` padding-inline, `.auth-menu__item` padding-inline (pre-existing, unchanged) |
| lg | 24px | `.footer__inner` column gap at ≤720px (pre-existing, unchanged) |
| xl | 32px | `--gut` desktop ceiling (pre-existing, unchanged) |
| — | `--wordmark-fs`, `--footer-pad-y` | New fluid `clamp()` tokens, see Fluid Tokens section — not flat multiples-of-4 by construction (clamp ranges), documented separately above |

Exceptions: `.btn`/`.btn--sm` padding (`15px 28px` / `12px 22px`) and `.nav`'s `30px` gap are
pre-existing non-4px values. Per D-03 ("fix bugs, don't redesign the visual pattern") they are
**not** altered by this phase except where CHROME-02 explicitly requires a `min-height` add-on
(the `.nav > .btn` and `.auth-trigger` tap-target fixes above only ever *add* a `min-height`
declaration — they never change the existing `padding` values).

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px (`eclat.css:57`) | 400 | 1.5 |
| Label | 13px (`.nav`, `eclat.css:370`), uppercase, `letter-spacing: 0.09em` | 500 | 1 |
| Heading (wordmark) | `--wordmark-fs: clamp(20px, 5.4vw, 26px)` — **new, this phase** | 500 | 1 |
| Display (`.hero h1`, existing precedent, unmodified) | `clamp(44px, 7vw, 104px)` (`eclat.css:710`) | inherits serif default | 0.9 |

All values are existing sitewide tokens except `--wordmark-fs`, which this phase introduces per
the Fluid Tokens section above.

---

## Color

No new colors are introduced by this phase. Reuse the existing `:root` tokens exactly as defined
(`eclat.css:8-37`) — this section documents them for the checker's reference, it does not propose
changes.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--bg: #f7f3ec` | Page background, header/footer background |
| Secondary (30%) | `--band: #efe8db` / `--paper: #fffdf8` | Nav dropdown background (`--bg` actually — nav dropdown uses `background: var(--bg)`, `eclat.css:2017`), auth-menu background (`--paper`) |
| Accent (10%) | `--accent: oklch(0.56 0.14 38)` | Reserved for: `:focus-visible` outline (`eclat.css:100`), `.btn:hover` background (Subscribe CTA hover), `.link-underline`'s current-page indicator via `currentColor` — **no new accent usage added by this phase** |
| Destructive | `--bad: oklch(0.55 0.16 25)` | Not used by any element this phase touches (sign-out has no destructive-confirmation UI per D-03/scope — see Copywriting Contract) |

Accent reserved for: focus-visible outlines, primary-button hover states, current-page nav
indication — unchanged, pre-existing sitewide contract, not renegotiated by this phase.

---

## Copywriting Contract

No new user-facing copy is introduced by this phase (pure layout/token/behavior fixes to already-
shipped chrome). Existing copy is reused verbatim:

| Element | Copy |
|---------|------|
| Primary CTA | "Subscribe" (`Header.jsx:241`, existing `.btn.btn--sm` in nav) — unchanged |
| Empty state heading | Not applicable — this phase has no list/data-empty states (nav/footer are static chrome) |
| Empty state body | Not applicable |
| Error state | "Couldn't sign out — try again." (`Header.jsx:227`, existing `.auth-menu__error`) — unchanged, reused verbatim |
| Destructive confirmation | None — sign-out has no confirmation dialog today and D-03 does not request adding one; this phase does not introduce any destructive action |

---

## UI Considerations

Applicable state considerations resolved: 6 covered, 1 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| loading | Header nav — auth slot (`nav`/`interactive-control`) | ✅ covered | Already implemented as an invisible reserved-width placeholder (`.auth-slot--loading`, `eclat.css:399-402`) while `useSession()`'s fetch is in flight — unaffected by this phase; verify the reserved width still holds after the `900px`-block tap-target CSS additions |
| error | Header nav — auth menu (`interactive-control`) | ✅ covered | Existing `.auth-menu__error` ("Couldn't sign out — try again.", `Header.jsx:226-228`) — unchanged, see Copywriting Contract |
| overflow | Header nav (`nav`) | ✅ covered | At ≤900px `.nav` becomes a vertical flex column (`eclat.css:2011-2023`) — links never overflow horizontally; taller-than-viewport content scrolls via `overflow-y: auto` with the `max-height` this phase corrects to `svh` (FOUND-03 §2) |
| overflow | Footer nav (`nav`) | ✅ covered | `.footer__nav { flex-wrap: wrap }` (`eclat.css:1757-1761`) already wraps links onto multiple rows at any width |
| long-text | Header nav — display name (`nav`) | ✅ covered | Signed-in display name is already truncated to 18 chars via `truncateName()` (`Header.jsx:15-19`) — no change needed |
| long-text | Header nav — labels (`nav`) | ✅ covered | Nav labels are fixed short editorial strings ("Archive", "Children's Books", "Writings", "Videos") — not user-generated, no truncation risk |
| long-text | Footer — copyright fine print (`static-content`) | 🧪 backstop | `Footer.jsx:32`'s full sentence ("Éclat bi-monthly online magazine and the children's books are published by Éclat Life Style LLC.") must wrap onto multiple lines at 375px without clipping against the container edge or overlapping `.footer__nav` above it — verify via a real-width screenshot (375px and 430px), not just a DevTools resize; no code change proposed beyond the `--footer-pad-y` fluid token, this is a verification item |

---

## Registry Safety

Not applicable — no shadcn or third-party component registry is in use (see Design System
section above; this is a plain-CSS project by explicit project constraint).

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable |
| third-party | none | not applicable |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
