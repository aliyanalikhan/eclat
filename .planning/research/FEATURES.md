# Feature Research

**Domain:** Mobile-responsive behavior for an existing editorial/magazine SPA (Éclat) — horizontal scroll strips, image lightbox, page-flip preview modal, pricing picker, account panels, global nav
**Researched:** 2026-09-13
**Confidence:** HIGH (general mobile-UX patterns — corroborated by Smashing Magazine, WCAG 2.5.8, Apple HIG, Material Design, and multiple independent UX-practice sources) / MEDIUM where recommendations depend on Éclat's specific existing implementation (verified directly against `src/` source, not third-party claims)

This file assumes no new features are being built — everything below is scoped to *how the six existing feature types should behave correctly at ~375–430px*, per `.planning/PROJECT.md`'s v1.1 milestone. Each item also notes what the current codebase already does right vs. what's missing, verified by reading `src/lib/motion.js`, `src/components/Lightbox.jsx`, `src/components/MagazinePreview.jsx`, `src/components/Header.jsx`, `src/routes/Subscribe.jsx`, `src/routes/Account.jsx`, and `src/styles/eclat.css`.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = the site feels broken on a phone, not just "unpolished."

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Native touch-swipe on horizontal strips (hero fan omitted — see below) | Every mobile user expects a horizontally-scrolling row of cards to pan with a finger drag, no special gesture library needed | LOW | **Already 90% there.** `.strip` (`src/styles/eclat.css:1229`) already has `overflow-x:auto`, `scroll-snap-type: x proximity`, `overscroll-behavior-x: contain`, and a hidden scrollbar — this is native, so touch panning already works without any JS. `useDragScroll` (`src/lib/motion.js:254`) only attaches `pointerdown/move/up` listeners for *mouse*-drag; touch devices scroll natively regardless, so this hook is desktop-only sugar, not a mobile blocker. Remaining work is tuning peek width and snap strictness (below), not building swipe from scratch. |
| Visible "there's more" affordance (partial next-card peek) | A carousel/strip that exactly fills the viewport reads as "the whole gallery," and users never discover there's more — this is the single most common horizontal-scroll UX failure | LOW | At the existing `max-width: 720px` breakpoint, `.strip__item { max-width: 86vw }` already leaves a ~14vw peek of the next card — correct pattern, just needs re-verifying at 375px specifically (86vw of 375px ≈ 322px, leaving ~53px peek, which is enough to read as "more content" per Smashing Magazine's carousel guidance). No architecture change needed, just confirm this holds down to 375px and isn't only checked at tablet widths. |
| One card-stop per swipe (no fling-past) | Users expect one deliberate swipe to land on one card, not skid past 2–3 | LOW | `scroll-snap-type: x proximity` is a "soft" snap (browser may not snap at all on a fast fling). `scroll-snap-stop: always` on `.strip__item` would guarantee a hard stop per item — cheap CSS-only addition, no JS. |
| Pricing tiles stack to a single column | Comparing 4 tiles side-by-side is impossible below ~600px; industry data shows ~78% of pricing pages stack cards on mobile vs. ~8% using a carousel | LOW | **Already implemented.** `.plans` collapses via `grid-template-columns: minmax(0, 1fr)` at the existing 720px breakpoint (`eclat.css:2166`) — this already matches the recommended pattern for ≤4 tiles (stack, not carousel). Remaining work at 375–430px is tap-target sizing on the Monthly/Annual `chip` toggle buttons inside each tile and confirming price-skeleton/CTA button don't get cramped, not restructuring the layout. |
| Account panels stack to one column | Same reasoning as pricing — a `key/value` grid of Status/Plan/Renews/Card is unreadable side-by-side on a phone | LOW | **Already implemented.** `.panel` uses `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))` (`eclat.css:1642`), which auto-collapses to 1 column once the container is under ~2×180px+gap — true well below 430px. Verify padding (`24px` at 720px bp) doesn't crowd `panel__val` at 22px serif font on a 375px screen; no grid rework needed. |
| Global nav collapses to a toggleable off-canvas panel | Users expect either a hamburger/drawer or a simple stack below ~900px; a full horizontal nav bar simply doesn't fit 4 links + auth slot + Subscribe CTA at 375px | LOW–MEDIUM | **Already implemented as a top-down dropdown drawer**, not a hamburger-triggered side drawer: `Header.jsx` toggles `.nav[hidden]` via a hamburger/X icon button at a 900px `matchMedia` breakpoint, and `.nav` becomes a `position: fixed` full-width panel below the header (`eclat.css:2004-2039`). This is a valid, common pattern (top drawer vs. side drawer) — no pattern change needed. Two phone-specific things to verify: (1) `position: fixed; inset: var(--nav-h) 0 auto 0` needs `env(safe-area-inset-*)` accounted for on notched/Dynamic-Island phones so the drawer doesn't sit under a status bar or get clipped at the bottom; (2) touch target height of `.nav>a` (`padding: 16px 2px`) and the auth avatar/menu trigger meet the ~44px minimum. |
| Touch target sizing ≥ 44×44 (iOS)/48×48dp (Android), and WCAG 2.5.8 minimum 24×24 | Sub-40px tap targets have measurably higher mis-tap/rage-tap rates; this applies to the lightbox close button, magazine-preview Prev/Next buttons, interval chips, and nav toggle | LOW | `.lightbox__close` is already `44px × 44px` (`eclat.css:1812`) — correct. Audit `magazine-preview__nav` Prev/Next buttons (currently `btn--sm`) and `.chip` (interval toggle) sizes specifically at 375px; these are the two spots most likely to render under 44px in the current desktop-tuned CSS. |
| Touch-appropriate microcopy in modals (no keyboard-only instructions) | A hint that says "Press Esc" or "Use ← → to browse" is actively confusing on a device with no keyboard | LOW | **Gap found, not yet handled.** `Lightbox.jsx:100` renders `"Press Esc or click anywhere to close"` unconditionally, and `MagazinePreview.jsx:123` renders `"Use ← → to browse · Esc to close"` unconditionally — neither has a touch-aware variant. Fix is a simple conditional string (e.g. via a `(hover: hover) and (pointer: fine)` media query or a `matchMedia('(pointer: coarse)')` check) swapping to "Tap anywhere to close" / "Swipe or tap to browse · Tap outside to close". Cheap, but easy to miss because it's copy, not layout. |
| No unintended horizontal page scroll anywhere | The #1 "this site is broken on my phone" signal is a body/page that scrolls sideways because one element (a strip, a wide table, a fixed-width image) overflows the viewport | LOW–MEDIUM | Needs a systematic sweep (devtools responsive mode at 375px, then real-device check) across Archive/Edition/Books/Writings grids, not just the six named interactive features — anything with a fixed `min-width`, a wide inline `style={{ width: ... }}`, or an un-clamped `font-size`/`letter-spacing` combination is a candidate. `.grid-covers` and `.books-grid` already have 720px-breakpoint rules; re-verify at 375px specifically since most existing breakpoints target 720/900px, not phone-portrait exactly. |

### Differentiators (Nice Polish, Not Required)

Features that meaningfully improve the mobile experience but whose absence wouldn't make the site feel broken.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Swipe-left/right to turn pages in the magazine preview modal | Matches the mental model of "flipping" a magazine and removes reliance on small Prev/Next buttons | MEDIUM | **Currently absent.** `MagazinePreview.jsx` only wires `ArrowLeft`/`ArrowRight` keydown handlers and on-screen Previous/Next buttons — there is no touch/pointer swipe handler at all. Adding one is a bounded scope: a `touchstart/touchend` (or `pointerdown/up`) delta-X threshold on `.magazine-preview__frame` that calls the same `setIndex` logic already used by the buttons. Table-stakes tap-to-advance already exists via the visible buttons, so this is additive polish, not a blocker — the existing buttons already satisfy "usable on phone-width touch screens" from PROJECT.md. |
| Tap left-half/right-half of the image as invisible turn zones (in addition to visible buttons) | Common e-reader/comic-app pattern — larger, thumb-friendly hit areas than small buttons | MEDIUM | Adds a discoverability risk (invisible zones can be tapped by accident, e.g. when a user is just trying to look closer at the page) unless paired with a first-use hint. Given the visible Prev/Next buttons already meet the table-stakes bar, treat this as optional — only worth it if user testing shows people missing the small buttons. |
| Pinch-to-zoom or double-tap-to-zoom inside Lightbox / magazine preview | Lets a reader inspect fine detail (text, illustration) beyond what `object-fit: contain` shows at phone width | MEDIUM–HIGH | Neither `Lightbox.jsx` nor `MagazinePreview.jsx` implements pinch/double-tap zoom today — both are `object-fit: contain` static frames. Real pinch-zoom (not just relying on the OS/browser's native double-tap-to-zoom, which can be blocked by `user-scalable=no`/`maximum-scale` in the viewport meta — verify `index.html` isn't disabling this) requires either careful custom gesture code (competing with the modal's own swipe/close gestures — a common source of the "gesture conflict" bugs called out in mobile-lightbox implementations) or a small dependency. Given editorial cover/spread images aren't dense reference documents, this is genuinely optional polish, not required for "usable." If pursued, the simplest safe version is: don't block the browser's native pinch-zoom (avoid `user-scalable=no`) rather than building custom pinch logic. |
| Swipe-down-to-dismiss on Lightbox/magazine-preview (in addition to tap-outside/close button) | Matches iOS Photos-app / Instagram-style dismiss gesture users increasingly expect | LOW–MEDIUM | Tap-anywhere-to-close already exists (`onClick={closeLightbox}` on the backdrop) and satisfies the table-stakes bar. A vertical-drag-to-dismiss is a nice-to-have that must be careful not to conflict with pinch-zoom or horizontal swipe-to-turn if those are added later (sequencing note in Feature Dependencies below). |
| Bottom tab bar instead of top drawer for primary nav | Research shows bottom nav has better one-handed thumb reach and generally the highest satisfaction/task-completion scores on mobile, when there are ≤5 primary destinations | HIGH (relative to this milestone) | Éclat has 4 nav links + Subscribe CTA + auth — within bottom-nav's typical 3–5 item sweet spot, so this *would* be a valid pattern. But PROJECT.md scope is "fix the existing site's mobile responsiveness," not "redesign navigation," and a working top-drawer toggle already exists. Replacing it is a much larger UI change (new persistent chrome, footer/bottom-bar collision, safe-area handling for home-indicator devices) than fixing the current drawer's edge cases. Treat as an explicit anti-scope call for this milestone (see Anti-Features) rather than a differentiator to pursue now. |
| Sticky/condensed pricing-tile summary bar while scrolling `/subscribe` on mobile | Common SaaS pattern (e.g., a floating "select a plan" bar) to keep the CTA reachable while comparing 4 stacked tiles | LOW–MEDIUM | Genuinely optional since with only 4 stacked tiles the page isn't very long; only worth adding if UAT shows people losing track of which tile they were comparing. |

### Anti-Features (Common Mistakes to Avoid)

Patterns that look like reasonable mobile fixes but create more problems than they solve, or that are simply out of scope for this milestone.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Converting `.strip` drag-scroll rows into a JS carousel library (react-slick, Swiper, etc.) | "We need swipe support" is easy to over-solve by reaching for a full carousel dependency | The strips already get native touch-swipe for free from `overflow-x: auto` + `scroll-snap`; a JS carousel library adds bundle weight, a new dependency to keep patched, and its own set of accessibility/focus-order bugs, to replace something that already works. This directly matches the CLAUDE.md constraint to build on the existing stack, not introduce new frameworks/libraries where plain CSS already does the job. | Keep the existing CSS scroll-snap approach; only add `scroll-snap-stop: always` and confirm peek-width/tap-targets, as noted above. |
| Rebuilding the magazine preview as a "real" page-flip/curl animation (3D page-turn effect) library | Feels more premium/on-brand ("magazine" implies physical page-turning) | Page-curl/3D-flip libraries are heavy, frequently janky on mid-range Android GPUs, and commonly fight with the browser's own scroll/zoom gestures on touch — exactly the "gesture conflict" pitfall called out in page-flip UX research. It also isn't what PROJECT.md scoped: the requirement is that the *existing* preview modal "work correctly on phone-width touch screens," not that its visual metaphor be upgraded. | Keep the current image-swap-with-Prev/Next-and-counter implementation; optionally add swipe-to-advance (a differentiator, above) using the same simple index-based state, not a physics/curl engine. |
| Replacing the top-drawer nav with a hamburger-triggered *side* drawer or a bottom tab bar | "That's the more modern pattern" | Both are legitimate patterns in isolation, but swapping an already-working, already-toggle-driven nav for a structurally different one is a redesign, not a responsive-bug fix — it risks introducing new focus-trap/animation/z-index bugs in exactly the kind of security-adjacent, accessibility-sensitive chrome (`Header.jsx` also hosts the auth menu) that this milestone should be de-risking, not expanding. Out of scope per PROJECT.md ("this milestone does not add new content or business features" and targets fixing, not redesigning). | Keep the top-drawer + hamburger-icon-toggle pattern; fix its phone-specific edges only (safe-area insets, tap target sizes, scroll-lock when open). |
| Disabling native pinch-zoom site-wide via `user-scalable=no` / `maximum-scale=1` to "prevent accidental zoom" | A common but outdated defensive move to keep layouts pixel-perfect | This is a well-documented accessibility anti-pattern — it removes a core mobile-accessibility affordance (low-vision users rely on native pinch-zoom) for the entire site to solve a narrow problem in two modals. It's explicitly the kind of "seems good, isn't" mobile mistake worth flagging given this milestone touches viewport-sensitive components. | Scope any zoom-prevention (if genuinely needed inside the Lightbox/magazine-preview backdrop only, to stop the *page* from scrolling under a modal) to `document.body.style.overflow = 'hidden'` while the modal is open — which `Lightbox.jsx` and `MagazinePreview.jsx` already do — not a global viewport-meta change. |
| Building a distinct "mobile version" of the pricing/account data model or a separate mobile-only route | Tempting shortcut when a layout feels hard to make responsive | Éclat is one prerendered SPA with one content/data layer (per CLAUDE.md architecture); a parallel mobile route or data shape would violate "content and code are the same deployable artifact" and double the surface area to keep correct (and to secure, given `/account` and `/subscribe` touch real entitlement data). | Fix layout via CSS breakpoints and (where unavoidable) conditional rendering within the *same* components — exactly the pattern the existing 720px/900px media queries already use. |
| Adding a new animation/gesture library (Framer Motion, Hammer.js, etc.) purely to implement mobile swipe gestures | Feels like the "proper" way to handle touch gestures | The project has zero animation dependencies today — `src/lib/motion.js` is hand-rolled (`runFlip`, `useScrollFx`, `useDragScroll`) specifically to avoid one, and CLAUDE.md's stack constraint is to build on the existing Vite+React app, not introduce new frameworks. Any swipe-to-turn addition (a differentiator, not table stakes) should follow the same hand-rolled `pointerdown/pointermove/pointerup` delta-threshold pattern already used by `useDragScroll`, not a new dependency. | Extend `src/lib/motion.js` with a small `useSwipe(ref, { onLeft, onRight })`-style hook mirroring `useDragScroll`'s existing structure, if swipe-to-turn is pursued. |

## Feature Dependencies

```
[Fix strip/carousel touch behavior] (table stakes: scroll-snap-stop, peek-width audit)
    └──independent of──> [everything else — pure CSS, no shared state]

[Fix Lightbox touch microcopy + tap targets] (table stakes)
    └──shares a component with──> [Fix MagazinePreview touch microcopy + tap targets]
                                       (both extend the same `.lightbox` CSS class and
                                        dialog/focus-trap pattern — fix the shared
                                        `.lightbox__hint` conditional-copy approach once,
                                        apply to both, rather than solving it twice)

[Add swipe-to-turn in MagazinePreview] (differentiator)
    └──requires──> [Fix MagazinePreview touch microcopy + tap targets] (table stakes)
                       (swipe should be additive to, not replace, the working
                        button/keyboard navigation — sequence the table-stakes
                        pass first so there's a known-good fallback)

[Add pinch-to-zoom in Lightbox/MagazinePreview] (differentiator)
    ──conflicts with──> [Add swipe-down-to-dismiss] (differentiator)
                       (both are touch gestures on the same element; if both are
                        pursued, dismiss-swipe must only trigger when not
                        mid-pinch/mid-zoom — this is the well-documented
                        "gesture conflict" failure mode in mobile lightboxes)

[Fix pricing-tile stacking + tap targets] (table stakes — layout already exists)
    └──independent of──> [Fix account-panel stacking + tap targets] (table stakes — layout already exists)
                       (both already collapse via existing CSS grid rules;
                        neither blocks the other)

[Fix nav drawer safe-area/tap-targets] (table stakes)
    └──touches the same file/component as──> [Auth menu dropdown inside Header.jsx]
                       (do not regress the existing sign-in/sign-out menu's
                        focus-trap and outside-click-close behavior — Header.jsx
                        is auth-adjacent, not purely cosmetic chrome)
```

### Dependency Notes

- **Strip/carousel fixes are the lowest-risk, most independent item** — pure CSS (`scroll-snap-stop`, confirming peek-width at 375px), no JS logic changes, no shared component with anything else in scope. Good candidate to sequence first or in parallel with everything else.
- **Lightbox and MagazinePreview share a pattern, not a component** — they both reuse the `.lightbox` CSS class and a hand-rolled dialog/focus-trap/scroll-lock structure (see the shared `role="dialog"` + `document.body.style.overflow` pattern in both files), but are two separate React components. Fixing the "desktop-only microcopy" gap and tap-target sizing in one is a template for the other — do them together so the fix pattern (e.g., a shared `usePointerHint()` helper) isn't duplicated ad hoc.
- **Swipe-to-turn (differentiator) depends on the table-stakes MagazinePreview pass being done first**, because it's additive to the existing Prev/Next/keyboard navigation, not a replacement — if the table-stakes copy/tap-target fixes land first, the swipe addition has a known-good, already-verified fallback to fall back to if swipe detection has edge cases (e.g., a tap that jitters slightly and gets misread as a swipe).
- **Pinch-zoom and swipe-down-dismiss conflict if both are pursued** — this is a real, commonly-reported failure mode (see Sources), not a theoretical one. If the milestone stays scoped to table stakes only (as PROJECT.md suggests — "work correctly on phone-width touch screens" doesn't require these two differentiators), this conflict never has to be resolved. Flag clearly to the roadmap: don't schedule both in the same phase without an explicit gesture-priority decision.
- **Nav drawer fixes must not regress the auth menu.** `Header.jsx` isn't purely cosmetic — it renders the same sign-in/sign-out/session-menu logic built in Phase 2 of the OAuth milestone. Any phone-width CSS/safe-area fix to `.nav`/`.nav__toggle` should be tested against the signed-in state (avatar, name-truncation, auth dropdown) at 375px, not just the signed-out nav links.

## MVP Definition

### Launch With (v1 — this milestone's Active requirements, per PROJECT.md)

All six items below are table-stakes only — no differentiators are required to satisfy PROJECT.md's "fully usable and visually correct at phone-portrait widths" bar.

- [ ] Strip/carousel touch scrolling confirmed correct at 375–430px: `scroll-snap-stop: always`, peek-width verified (not just at 720px), scrollbar hidden — *why essential: horizontal strips appear on Home, Archive, and elsewhere; broken swipe here is highly visible*
- [ ] Lightbox and MagazinePreview: touch-appropriate microcopy (no "Press Esc"/"←→" hints on touch), tap targets audited to ≥44px (Prev/Next buttons, close button already correct) — *why essential: these are the two full-screen modals most likely to feel "broken" if their only instructions assume a keyboard*
- [ ] No unintended horizontal page-scroll anywhere in scope, verified at 375px specifically (not just at existing 720/900px breakpoints) — *why essential: this is the single clearest "this site is broken on mobile" signal to a real user*
- [ ] Pricing picker (`/subscribe`) and Account panels: confirm existing stacking/auto-fit CSS holds at 375–430px, fix any cramped padding/font-size/tap-target issues on the interval chips and CTA buttons — *why essential: these are the two paid-conversion and entitlement-management surfaces — a cramped or mis-tappable Subscribe/Manage button directly undermines the product's Core Value*
- [ ] Global nav drawer: safe-area-inset handling on notched devices, tap-target sizing on nav links and the auth avatar/menu trigger, confirmed no regression to the sign-in/sign-out flow — *why essential: nav is present on every page; a broken drawer or auth menu at phone width blocks navigation and account access entirely*

### Add After Validation (v1.x)

- [ ] Swipe-left/right to turn pages in MagazinePreview — *trigger: UAT or real usage shows people relying on/missing the small Prev/Next buttons instead of intuitively trying to swipe*
- [ ] Swipe-down-to-dismiss on Lightbox/MagazinePreview — *trigger: same signal as above; low cost to add once the table-stakes pass is stable*
- [ ] Sticky plan-comparison summary bar on `/subscribe` — *trigger: only if the page's stacked-tile length becomes a UAT complaint, which is unlikely at just 4 tiles*

### Future Consideration (v2+)

- [ ] Pinch-to-zoom / double-tap-to-zoom inside Lightbox or MagazinePreview — *defer: real gesture-conflict risk with any dismiss/turn gesture added in v1.x; editorial images aren't dense-detail content that clearly needs deep zoom; not requested in PROJECT.md scope*
- [ ] Bottom tab-bar navigation — *defer: legitimate pattern in the abstract, but a structural nav redesign, not a responsive-bug fix; explicitly out of this milestone's "fix, don't rebuild" framing*

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Strip/carousel snap + peek tuning | MEDIUM | LOW | P1 |
| Lightbox/MagazinePreview touch microcopy + tap targets | HIGH | LOW | P1 |
| Eliminate unintended horizontal page-scroll (site-wide sweep) | HIGH | LOW–MEDIUM | P1 |
| Pricing picker phone-width tap-target/spacing pass | HIGH | LOW | P1 |
| Account panel phone-width spacing pass | MEDIUM | LOW | P1 |
| Nav drawer safe-area + tap-target + auth-menu regression check | HIGH | LOW–MEDIUM | P1 |
| Swipe-to-turn in MagazinePreview | MEDIUM | MEDIUM | P2 |
| Swipe-down-to-dismiss on modals | LOW–MEDIUM | LOW–MEDIUM | P2 |
| Pinch/double-tap zoom in modals | LOW | MEDIUM–HIGH | P3 |
| Bottom tab-bar nav redesign | LOW (relative to milestone scope) | HIGH | P3 (explicitly deferred) |

**Priority key:**
- P1: Must have for this milestone (matches PROJECT.md's five Active requirements)
- P2: Should have, add once P1 is UAT-verified
- P3: Nice to have, explicitly future/out-of-scope for v1.1

## Competitor / Reference Pattern Analysis

| Feature | Reference pattern A | Reference pattern B | Éclat's approach |
|---------|---------------------|----------------------|-------------------|
| Horizontal content strips | Native CSS scroll-snap with peek (used by most modern editorial/e-commerce sites — cheap, accessible, no JS dependency) | JS carousel library (Swiper, Slick) with custom pagination dots | Already on pattern A (`.strip` + `useDragScroll` for desktop mouse only) — keep it, tune snap-stop and peek |
| Multi-plan pricing on mobile | Stack (≈78% of sites, per CXL/industry data) — best for ≤4 plans | Carousel/tabs — used when >4-5 plans need comparing | Already stacks via `.plans` grid collapse at ≤720px — matches the majority pattern correctly for exactly 4 tiles |
| Full-screen preview/lightbox dismissal | Tap-outside + explicit close button (most common, most discoverable) | Swipe-down-to-dismiss (Instagram/iOS Photos-style, increasingly expected but not universal) | Already has tap-outside + close button (table stakes met); swipe-down not yet built (differentiator) |
| Mobile primary nav | Off-canvas/top drawer behind a hamburger toggle (very common, works for any nav-item count) | Persistent bottom tab bar (best thumb reach, but capped at ~5 items and is a bigger structural commitment) | Already uses pattern A (top drawer + hamburger/X toggle) — correct choice given nav has 4 links + CTA + auth slot; no reason to switch to pattern B for this milestone |

## Sources

- [Building a modern carousel with CSS scroll snap, smooth scrolling, and pinch-zoom — Read the Tea Leaves](https://nolanlawson.com/2019/02/10/building-a-modern-carousel-with-css-scroll-snap-smooth-scrolling-and-pinch-zoom/) — `scroll-snap-stop`, `overscroll-behavior-x`, peek-width affordance guidance (MEDIUM confidence, independent practitioner writeup, technically verifiable against MDN spec)
- [CSS Scroll Snap: Properties, Recipes and Traps](https://theplusaddons.com/blog/css-scroll-snap/) — snap-type/snap-align/snap-stop behavior reference (MEDIUM confidence)
- [How to Design Mobile SaaS Pricing Pages that Don't Suck — CXL](https://cxl.com/blog/mobile-saas-pricing-pages/) — stacking vs. carousel vs. tabs usage data for pricing tables on mobile (MEDIUM confidence, cites usage-pattern statistics)
- [Best Practices: Planning & Designing Pricing Tables — Think About Mobile Users](https://webdesign.tutsplus.com/best-practices-planning-designing-pricing-tables--CRS-200797c/think-about-mobile-users) — corroborating stack-for-≤4-plans guidance (MEDIUM confidence)
- [Lightbox mobile gesture discussions — Webflow/Squarespace/WordPress community forums](https://discourse.webflow.com/t/lightbox-pinch-zoom-pan-on-mobile/77218) — real-world reports of pinch-zoom/swipe gesture-conflict bugs in production lightboxes (MEDIUM confidence, practitioner reports not a formal spec, but consistent across multiple independent platforms)
- [Designing for Touch — UXmatters](https://www.uxmatters.com/mt/archives/2020/02/designing-for-touch.php) — tap-zone sizing and touch-target design guidance for paginated/touch content (MEDIUM confidence)
- [Mobile Navigation Patterns: Pros and Cons — UXPin](https://www.uxpin.com/studio/blog/mobile-navigation-patterns-pros-and-cons/) and [The Future of Mobile Navigation: Hamburger Menus vs. Tab Bars — Acclaim](https://acclaim.agency/blog/the-future-of-mobile-navigation-hamburger-menus-vs-tab-bars) — hamburger/drawer vs. bottom-tab-bar tradeoffs, item-count guidance (MEDIUM confidence)
- [Accessible Target Sizes Cheatsheet — Smashing Magazine](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/) — 44×44/48×48dp/WCAG 2.5.8 24×24 minimum touch-target guidance, mis-tap error-rate research (HIGH confidence — Smashing Magazine is an established, technically-edited source, and the underlying WCAG 2.5.8 criterion is a normative W3C standard)
- Direct source reads (HIGH confidence — primary source, this codebase): `src/lib/motion.js`, `src/components/Lightbox.jsx`, `src/components/MagazinePreview.jsx`, `src/components/Header.jsx`, `src/routes/Subscribe.jsx`, `src/routes/Account.jsx`, `src/styles/eclat.css` (breakpoints at 460/720/900/1080px)

---
*Feature research for: Mobile-responsive design fixes — Éclat v1.1 milestone*
*Researched: 2026-09-13*
