# Phase 6: Foundation & Global Chrome - Pattern Map

**Mapped:** 2026-09-13
**Files analyzed:** 4 (all modified, none new)
**Analogs found:** 4 / 4 (all self-analogs — this is a retrofit of existing files, not new-file creation)

This phase creates **zero new files**. Per `06-CONTEXT.md` and `06-UI-SPEC.md`, every change is a
targeted edit inside 4 already-existing files. Consequently "closest analog" for each file is the
file's own established internal conventions — the pattern to copy is "match the surrounding code's
existing style exactly," which this document makes concrete with line-numbered excerpts.

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/styles/eclat.css` | config (design tokens) + presentation (CSS rules) | transform (pure declarative styling, no data flow) | itself — `:root` token block (`:8-37`) and existing `@media` blocks (`:1996-2195`) | exact (self-pattern) |
| `src/components/Header.jsx` | component (global chrome) | request-response (matchMedia listeners driving render state) | itself — existing `isMobile`/`matchMedia` `useEffect` (`:37-46`) | exact (self-pattern) |
| `src/components/Footer.jsx` | component (global chrome) | transform (static content render, no state) | itself — no internal analog needed; only CSS class (`--footer-pad-y`) consumption changes, JSX untouched | exact (no JSX change expected) |
| `src/lib/motion.js` | utility (DOM/event effect hooks) | event-driven (pointer events → scroll manipulation) | itself — `useDragScroll`'s existing `onDown` handler (`:264-270`) | exact (self-pattern) |
| `index.html` | config (static HTML template) | n/a (build-time template) | itself — existing `<meta name="viewport">` tag (`:5`) | exact (single attribute value change) |

## Pattern Assignments

### `src/styles/eclat.css` (config/presentation, transform)

**Analog:** itself — the file's own `:root` token block and `@media` block conventions.

**Token block pattern to extend** (`eclat.css:7-37`):
```css
/* --- tokens ------------------------------------------------------------- */
:root {
  --bg: #f7f3ec;
  ...
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --shell: 1360px;
  --gut: 32px;
  --nav-h: 70px;
}
```
New tokens (`--wordmark-fs`, `--footer-pad-y`) and the breakpoint-tier documentation comment go
directly above/inside this block per UI-SPEC — follow the existing one-token-per-line, `--kebab-case`
naming, no trailing comment convention already used here.

**Existing `clamp()` precedent to match in spirit** (`eclat.css:710`, referenced by UI-SPEC, not
re-read here since UI-SPEC already quotes it verbatim):
```css
.hero h1 { font-size: clamp(44px, 7vw, 104px) }
```

**900px nav-collapse block — insertion point for safe-area insets and tap-target fixes**
(`eclat.css:2006-2041`):
```css
@media (max-width: 900px) {
  :root {
    --gut: 22px;
  }

  .nav {
    position: fixed;
    inset: var(--nav-h) 0 auto 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    background: var(--bg);
    border-bottom: 1px solid var(--line);
    padding: 8px var(--gut) 22px;
    box-shadow: 0 18px 40px rgba(22, 19, 15, 0.12);
    max-height: calc(100vh - var(--nav-h));   /* FOUND-03 #3: add 100svh override after this line */
    overflow-y: auto;
  }

  .nav[hidden] {
    display: none;
  }

  .nav>a {
    padding: 16px 2px;             /* already passes CHROME-02 — verify only */
    border-bottom: 1px solid var(--line-soft);
  }

  .nav>.btn {                       /* CHROME-02: add min-height:44px + inline-flex centering here */
    margin-top: 18px;
    text-align: center;
  }

  .nav__toggle {
    display: block;
  }
}
```

**720px content-collapse block** (`eclat.css:2094-2176`) — includes `.footer__inner` column-flex
rule already present at `:2172-2175`; no structural change needed here per CHROME-03, only the new
`--footer-pad-y` token feeding `.footer`'s padding declaration (`:1737`).

**460px block — wordmark hard-step to remove** (`eclat.css:2178-2195`):
```css
@media (max-width: 460px) {
  .wordmark {
    font-size: 21px;
    letter-spacing: 0.18em;
  }
  ...
}
```
Per UI-SPEC, remove the `font-size: 21px` line (superseded by `--wordmark-fs` clamp on the base
`.wordmark` rule at `:357-364`), keep `letter-spacing: 0.18em` only if still needed after visual
verification.

**Base selectors requiring the 3 `vh`→`svh` companion declarations** (add-after, don't replace):
- `.hero` (`eclat.css:498-503`): `height: 100vh;` at line 500 → add `height: 100svh;` after it.
- `.lightbox` / `.lightbox__frame` (`eclat.css:1769-1792`): `padding: 6vh 6vw;` (`:1777`),
  `max-height: 88vh;` (`:1785`), `max-width: min(1000px, calc(88vh * (var(--lb-ratio, 1))));`
  (`:1788`) — add `svh` companions after each.
- `.nav` inside the 900px block (`:2021`, shown above).

**Auth-slot tap-target selectors** (`eclat.css:399-479`):
```css
.auth-slot--loading {
  min-width: 90px;
  visibility: hidden;
}

.auth-trigger {
  display: inline-flex;
  align-items: center;
  background: transparent;
  border: 0;
  padding: 0;
  margin: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
...
.auth-menu__item {
  display: block;
  padding: 8px 16px;   /* CHROME-02: bump to 14px 16px, applies at all widths */
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}
```
`.auth-trigger` needs a **new** `.nav .auth-trigger { min-height: 44px; padding-block: 10px; }`
override scoped inside the 900px media block (mirrors `.nav>a`'s existing `16px`-padding pattern at
`:2029-2032` — same technique, new selector).

**`.btn--sm` base** (`eclat.css:260-262`) — do not edit the base rule; the `min-height`/flex
centering add-on for `.nav>.btn` goes only inside the 900px block per UI-SPEC (`eclat.css:2034-2037`).

**`.strip` touch-action addition** (`eclat.css:1231-1239`):
```css
.strip {
  display: flex;
  gap: 22px;
  overflow-x: auto;
  padding: 44px 0 24px;
  cursor: grab;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
  overscroll-behavior-x: contain;
  /* add: touch-action: pan-x; */
}
```

**`.footer` padding token swap** (`eclat.css:1734-1739`):
```css
.footer {
  border-top: 1px solid var(--line);
  padding: 56px var(--gut);   /* replace 56px with var(--footer-pad-y) */
  background: var(--bg);
}
```

---

### `src/components/Header.jsx` (component, request-response via matchMedia)

**Analog:** itself — the existing `isMobile` breakpoint-listener `useEffect`, the pattern any future
JS breakpoint consumer (if `useBreakpoint.js` is extracted per Claude's Discretion) should match.

**matchMedia listener pattern to reference/extend** (`Header.jsx:37-46`):
```jsx
useEffect(() => {
  const mq = window.matchMedia('(max-width: 900px)')
  const sync = () => {
    setIsMobile(mq.matches)
    if (!mq.matches) setOpen(false)
  }
  sync()
  mq.addEventListener('change', sync)
  return () => mq.removeEventListener('change', sync)
}, [])
```
This is the literal JS consumer of the `--bp-nav: 900px` token documented in `eclat.css`'s new
comment block — per D-01, do not change this literal, only add a one-line comment pointing back at
the `eclat.css` breakpoint-tier doc block.

**No JSX structural change required** — auth-slot markup (`Header.jsx:163-239`) and `nav__toggle`
markup (`:121-143`) are untouched; only their CSS sizing changes (per UI-SPEC "No regression to
sign-in/sign-out").

---

### `src/lib/motion.js` (utility, event-driven)

**Analog:** itself — `useScrollFx`'s existing `mobile` gate pattern (`motion.js:76`,
`const mobile = window.innerWidth < 720`) is the sibling breakpoint check already living in this
file; `useDragScroll`'s `onDown` gets an analogous coarse-pointer gate.

**Insertion point** (`motion.js:264-270`):
```jsx
const onDown = (e) => {
  down = true
  moved = 0
  startX = e.clientX
  startLeft = strip.scrollLeft
  strip.classList.add('is-dragging')
}
```
Add per D-02/UI-SPEC, as the very first line inside `onDown`:
```jsx
if (window.matchMedia('(pointer: coarse)').matches) return
```
No other line in `useDragScroll` (`:254-306`) moves — desktop mouse path is untouched.

**Existing sibling breakpoint literal for comment cross-reference** (`motion.js:76`):
```jsx
const mobile = window.innerWidth < 720
```
This is the `--bp-mobile: 720px` JS consumer named in the UI-SPEC's breakpoint-tier doc block — add
a one-line comment here too, pointing back at `eclat.css`'s new comment block, matching the
`Header.jsx:38` treatment.

---

### `src/components/Footer.jsx` (component, transform/static)

**Analog:** itself — no JSX pattern change. The component's existing structure (`Footer.jsx:1-37`)
is reused verbatim; the only phase-6 impact is that `.footer`'s CSS padding now resolves to a fluid
`clamp()` instead of a flat `56px` (see eclat.css section above). No import, state, or markup change
in this file.

---

### `index.html` (config, static template)

**Analog:** itself — the existing single-line `<meta name="viewport">` tag.

**Current line** (`index.html:5`):
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```
**Required change** (adds `viewport-fit=cover`, prerequisite for all `env(safe-area-inset-*)` calls
in eclat.css's 900px nav block):
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```
No other line in `index.html` changes — font preconnect/stylesheet links (`:11-16`) and the
`<!--app-head-->`/`<!--app-html-->` prerender injection points (`:18`, `:21`) are untouched.

---

## Shared Patterns

### Breakpoint literal duplication (by design, not a bug)
**Source:** `eclat.css`'s new comment block above `:root` (per UI-SPEC lines 46-60), cross-referenced
by `Header.jsx:38` and `motion.js:76`.
**Apply to:** All 3 files. CSS cannot reference custom properties inside an `@media` condition, so
each JS/CSS breakpoint consumer keeps its own literal number; the comment block is the only
"documentation," not a technical enforcement mechanism. Any future edit to a tier value must touch
all three call sites (`eclat.css` `@media`, `Header.jsx` `matchMedia`, `motion.js` `innerWidth`
check).

### JS/CSS split for interactive chrome
**Source:** `eclat.css:2011-2027` ↔ `Header.jsx:37-46, 111, 121-143`.
**Apply to:** Any nav-related fix. JS owns the open/closed boolean and ARIA attributes
(`aria-expanded`, `aria-controls`, `hidden`); CSS owns all presentation (position, padding, colors,
transitions). Do not move state into CSS (e.g., no CSS-only `:checked` hack) or presentation into JS
(e.g., no inline `style=` for sizing) — this phase's fixes must stay inside the existing split.

### `vh`→`svh` progressive-enhancement pattern
**Source:** UI-SPEC lines 97-106 (not an existing codebase pattern — this is new to the codebase,
introduced fresh in this phase per D-04/FOUND-03).
**Apply to:** `.hero` (eclat.css:500), `.lightbox`/`.lightbox__frame` (eclat.css:1777, 1785, 1788),
`.nav` in the 900px block (eclat.css:2021). Technique: keep the old `vh` declaration first as the
fallback, add the `svh` declaration immediately after as the override — never remove the `vh` line,
never reorder (unsupporting browsers ignore invalid `svh` and keep cascading the last valid `vh`
value; supporting browsers take the later `svh` declaration).

### Additive `min-height` tap-target pattern
**Source:** `eclat.css:2029-2032` (`.nav>a`'s existing `padding: 16px 2px` — already-passing
precedent CHROME-02's two failing selectors should visually match).
**Apply to:** `.nav>.btn` (eclat.css:2034-2037) and a new `.nav .auth-trigger` rule (sibling to
`.auth-trigger` at eclat.css:404-414) — both scoped inside the existing `@media (max-width: 900px)`
block, both add `min-height: 44px` without altering existing `padding` values (per Spacing Scale
"Exceptions" in UI-SPEC).

## No Analog Found

None — this phase introduces zero new files and zero new components; every change is a scoped edit
to one of the 4 files above, all of which are self-analogous to their own existing conventions.

## Metadata

**Analog search scope:** `src/styles/eclat.css`, `src/components/Header.jsx`,
`src/components/Footer.jsx`, `src/lib/motion.js`, `index.html` (the exact 5 files named in
CONTEXT.md/UI-SPEC.md — no broader codebase search was needed since this is a pure retrofit of
named files, not new-file creation)
**Files scanned:** 5 (all read in full or via targeted non-overlapping offset/limit reads)
**Pattern extraction date:** 2026-09-13
