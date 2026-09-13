# Pitfalls Research

**Domain:** Retrofitting mobile-responsiveness onto an existing desktop-first, prerendered React SPA with custom touch/drag animation, dual modal overlays, server-verified entitlements, and Stripe redirect billing
**Researched:** 2026-09-13
**Confidence:** HIGH (codebase-verified against actual source in `src/lib/motion.js`, `src/components/Lightbox.jsx`, `src/components/MagazinePreview.jsx`, `src/routes/Subscribe.jsx`, `src/routes/Account.jsx`, `src/lib/useSafeFetch.js`, `src/styles/eclat.css`, `index.html`, `src/entry-client.jsx`; platform-behavior claims corroborated by MDN/web.dev and multiple independent sources)

## Critical Pitfalls

### Pitfall 1: `overflow: hidden` body scroll-lock doesn't actually lock scroll on iOS Safari

**What goes wrong:**
Both `Lightbox.jsx` and `MagazinePreview.jsx` lock background scroll identically:
```js
document.body.style.overflow = 'hidden'
if (gap > 0) document.body.style.paddingRight = `${gap}px`
```
On desktop this is sufficient. On iOS Safari it is not: `body { overflow: hidden }` stops the body element's own scrollbox but does **not** stop the page from rubber-banding/scrolling via `touchmove` on the viewport itself, because iOS Safari's viewport scroll is not equivalent to the body's overflow box. The result: opening the Lightbox or MagazinePreview modal on an iPhone lets the reader drag the *page behind the modal* up and down, revealing the browser chrome, causing the modal to visually detach from the content, and in the worst case bouncing the whole layout so the close button drifts off-screen.

**Why it happens:**
This CSS-only scroll-lock pattern is the standard desktop-web idiom and works flawlessly with a mouse wheel or trackpad. It was never exercised against a touchscreen because the entire codebase was built and tested desktop-first (no touch events existed anywhere before this milestone).

**How to avoid:**
Add a touch-aware lock alongside the existing `overflow: hidden`: on modal open, also capture `window.scrollY`, apply `position: fixed; top: -${scrollY}px; width: 100%` to `<body>`, and on close remove those styles and restore scroll position via `window.scrollTo(0, scrollY)`. Alternatively, add a `touchmove` listener on `document` that calls `e.preventDefault()` while the modal is open, unless the touch target is inside a designated scrollable region (the MagazinePreview image area doesn't need internal scroll, but a future scrollable modal body would). Because this exact scroll-lock code is duplicated verbatim in two files, extract it into one shared `useScrollLock()` hook now — fixing it twice, and then again if a third modal (e.g., a future settings sheet) is added, is exactly the kind of drift this milestone should close.

**Warning signs:**
On a real iPhone (not just Chrome DevTools device emulation, which does not reproduce this bug), open the Lightbox or the magazine preview, then try to drag the background up/down. If the page behind the dark overlay visibly scrolls or rubber-bands, this pitfall is present.

**Phase to address:**
Modal overlays phase (Lightbox + MagazinePreview mobile-touch work). Fix the shared lock hook once, reuse in both modals.

---

### Pitfall 2: Custom pointer-based drag-scroll fights native touch scrolling on the same element

**What goes wrong:**
`useDragScroll` (in `src/lib/motion.js`) attaches `pointerdown`/`pointermove`/`pointerup` listeners directly to the `.strip` element, which is *also* a native scroll container (`overflow-x: auto` in `eclat.css`, used for the edition preview strip and other horizontal rails). Pointer events fire for touch input too, so on a touchscreen two scrolling mechanisms compete for the same gesture: the browser's native touch-pan scrolling and the JS handler's `strip.scrollLeft = startLeft - dx` assignment. Per the Pointer Events spec, once the browser recognizes a pan/scroll gesture on an element without `touch-action` restricting it, it can fire `pointercancel` mid-drag and take over scrolling itself — so the JS drag logic can be interrupted partway through, producing jittery, snap-back, or "sticky" scroll behavior specifically on touch, while working perfectly with a mouse (where no such native gesture pre-emption exists).

**Why it happens:**
Pointer Events were adopted specifically because they unify mouse/touch/pen input under one API, which makes it easy to assume "pointer events already support touch" — true for click/tap-style interactions, false for anything that also wants to *override* the browser's own default touch-scroll handling of the same element. No `touch-action` CSS property is set anywhere on `.strip` today (confirmed absent from `eclat.css`), so the element's default `touch-action: auto` lets the browser claim the gesture.

**How to avoid:**
Decide the intended touch behavior per strip and make it explicit rather than accidental:
- If native touch scrolling (finger-drag with momentum/inertia) is good enough on mobile — which it usually is, since `overflow-x: auto` already gives free, correct touch scrolling — gate `useDragScroll`'s pointer handlers to skip attaching (or no-op) when `pointerType === 'touch'`, and rely on native scrolling for touch while keeping the custom drag-to-scroll purely for mouse/trackpad users.
- If a custom touch drag interaction is genuinely wanted (e.g., to keep the click-swallow-after-drag logic consistent), set `touch-action: pan-x` (or `none` if vertical page scroll should also be blocked while dragging horizontally) on `.strip` so the browser cedes the gesture to JS instead of racing it, and verify `pointercancel` is handled gracefully (it already is, via the existing `pointercancel → onUp` listener — but only once `touch-action` stops the browser from firing it mid-drag prematurely).
Test on a real touchscreen device or Chrome's mobile emulation with touch simulation enabled (not just a resized desktop viewport, which doesn't simulate pointer type `touch`).

**Warning signs:**
On a touch device, dragging a `.strip` (edition preview rail, cover carousels) feels stuttery, snaps back to the drag-start position, or the `is-dragging` class gets stuck because `onUp` never fires cleanly.

**Phase to address:**
Home page phase (drag-scroll strips) — this is the first place `useDragScroll` is exercised on mobile; the fix in `motion.js` is shared, so later phases touching other strips inherit it for free.

---

### Pitfall 3: The fan/hero animation's mobile detection is stale and uses a different breakpoint than the CSS layout

**What goes wrong:**
`useScrollFx` (in `src/lib/motion.js`) computes `const mobile = window.innerWidth < 720` once, at effect-mount time, and never recomputes it — the `onResize` handler re-measures card DOM rects but does not re-derive `mobile`. Meanwhile, the actual responsive CSS layout breakpoint for mobile nav/layout is `900px` (`@media (max-width: 900px)` in `eclat.css`). This means: (a) a viewport between 720–900px wide is "mobile" by CSS layout but "desktop" by the fan-animation's own logic, so the hero fan animation runs its full desktop transform math on a viewport that's already laid out for mobile, likely producing overlapping/off-screen covers; (b) if the fan-animation's own mobile threshold is changed or extended during this milestone to actually cover phone-portrait widths (375–430px, well under 720, so today it does correctly skip the fan on phones), a later resize/rotation within the effect's lifetime (e.g., orientation change, or a phone's split-screen/foldable resize) won't be picked up because `mobile` isn't in `onResize`'s recomputation.
This is a genuine width-band gap right now (720–900px) that any phone-portrait-only milestone might not notice in testing (phones are ~375–430px, well below 720) but that a reviewer testing on a small tablet or resizing DevTools will hit, and it's exactly the kind of thing that regresses quietly if the animation logic is touched during this milestone without also updating this constant to match the CSS breakpoint.

**Why it happens:**
The `mobile` flag and the CSS breakpoint were authored independently (JS animation tuning vs. CSS layout), and nothing enforces they stay in sync — there's no shared constant.

**How to avoid:**
Extract the breakpoint into one shared source (e.g., a `MOBILE_BREAKPOINT = 900` exported from `motion.js` or a small `src/lib/breakpoints.js`, used both by `useScrollFx`'s `mobile` check and referenced in a comment next to the CSS `@media` rule so a future edit to one prompts checking the other). If phone-portrait fixes touch `useScrollFx` at all, also make `mobile` reactive (recompute inside `onResize`, not just at mount) so orientation changes are honored without a full remount.

**Warning signs:**
Resize a browser window (or view on a ~768–900px tablet) through the 720–900px band and watch the hero fan cards for overlap, cards escaping their band, or a visible "jump" in fan geometry right at 720px — a discontinuity that shouldn't exist if animation and layout logic were breakpoint-aligned.

**Phase to address:**
Home page phase (hero fan carousel). Low blast-radius fix, but must happen before broader breakpoint changes elsewhere in the same phase, since other CSS breakpoints may also get touched.

---

### Pitfall 4: Whole-page loading gates with no fetch timeout leave mobile users staring at a spinner indefinitely

**What goes wrong:**
`Account.jsx` blocks all content behind a single combined gate: `if (loading || entitlementsLoading || accountLoading)` renders only "Checking your session…" — nothing else — until *all three* independent fetches (`useSession`, `useEntitlements`, `useAccount`) resolve. All three go through the shared `useSafeFetch` primitive (`src/lib/useSafeFetch.js`), which has no request timeout — it only aborts on unmount, a new request superseding it, or an explicit `key` bump. On a flaky mobile connection (packet loss, cell handoff, a request that stalls rather than cleanly failing), any one of these three fetches can hang indefinitely, and the user sees an unbroken "Checking your session…" spinner forever, with no retry button, no error state, and nothing indicating whether to wait, reload, or give up. This reads as "the app is broken" specifically in the conditions mobile networks are most prone to (rather than the fast, reliable desktop office/home wifi this was built and demoed on).

**Why it happens:**
`useSafeFetch` was correctly designed to solve a *race* problem (Phase 3's IN-03 hazard: overlapping requests resolving out of order) but was never designed to solve a *hang* problem, because that failure mode essentially never surfaces on a wired desktop connection during development.

**How to avoid:**
Add a timeout to `useSafeFetch` itself (e.g., `AbortController` + `setTimeout(() => ctrl.abort(), N_MS)`, treating a timeout-triggered abort as `error: true` rather than the existing "cancelled, not a failure" `AbortError` short-circuit — these need to be distinguishable, e.g. via a `timedOut` flag set just before calling `.abort()`). Surface a real error+retry affordance in Account.jsx's combined loading gate after the timeout fires (a "This is taking longer than expected — Retry" state), rather than only ever showing the bare "Checking your session…" text. This is a one-place fix (the shared hook) that benefits every current and future consumer (`Subscribe.jsx`'s price fetch has the same unbounded-hang exposure).

**Warning signs:**
Throttle to "Slow 3G" + add request latency/packet loss in DevTools network conditions (or test on real mobile data in a low-signal area) and load `/account` or `/subscribe`. If the page can get stuck on a loading/skeleton state with no way forward other than a manual browser reload, this pitfall is present.

**Phase to address:**
Subscribe/Account/Stripe redirect phase — but implement the timeout in the shared `useSafeFetch` hook so both routes' loading states benefit, not just one.

---

### Pitfall 5: `100vh`-based full-bleed sections resize/jump as the mobile browser chrome shows and hides

**What goes wrong:**
`eclat.css` uses `height: 100vh` on `.hero` (the fan carousel section) and `max-height: 88vh` / `padding: 6vh 6vw` on `.lightbox`, plus `max-height: calc(100vh - var(--nav-h))` on the mobile `.nav` dropdown. On mobile Safari and Chrome, `100vh` is computed against the *largest possible* viewport (address bar and toolbar hidden), not the currently visible one. In practice this means: the hero section is taller than the actually-visible screen when the address bar is showing (which it always is on first load), so the fold sits below where a reader expects it and `useScrollFx`'s own band-fitting math (which explicitly special-cases "viewport shorter than 780" via `Math.min(H, vh)`) is working around a value that itself resizes as the user scrolls and the browser chrome collapses — causing the hero's fan geometry to visibly reflow/jump mid-scroll on mobile as `window.innerHeight` changes, not just once at load. The Lightbox and mobile nav dropdown have the milder version of the same bug: their max-heights are computed slightly wrong depending on toolbar state, which can clip the close button or bottom nav items just off-screen.

**Why it happens:**
`100vh` predates mobile browsers' dynamic/collapsing toolbar UI and was never redefined for it; `dvh`/`svh`/`lvh` units exist specifically to solve this but require deliberate adoption — nothing breaks this automatically, so it's easy to ship "it works" on desktop and only discover the jump on a real phone.

**How to avoid:**
Replace `100vh` with `100dvh` (dynamic viewport height, which tracks the actual visible viewport as the toolbar shows/hides) for anything meant to fill the visible screen exactly — `.hero`, `.lightbox` padding/max-height, and the mobile `.nav` max-height — with a `100vh` fallback for older browsers (`height: 100vh; height: 100dvh;`, relying on cascade so unsupporting browsers simply ignore the second declaration). For the hero specifically, also re-verify `useScrollFx`'s `Math.min(H, vh)` band-fitting logic against `window.visualViewport?.height` (which also reflects the live, chrome-aware viewport) rather than relying solely on `window.innerHeight`, since the JS animation reads dimensions independently of the CSS unit choice. Do not blanket-replace every `vh` in the codebase — only the ones intended to represent "the currently visible screen," since `dvh` recalculating on every scroll can itself cause layout jank if applied somewhere that doesn't need it (e.g., decorative min-heights that are fine being stable).

**Warning signs:**
On an actual iPhone Safari (device emulation in desktop DevTools does not reproduce toolbar collapse), scroll the home page hero and watch for the fan cards' vertical position visibly shifting as the address bar collapses; open the Lightbox and check whether the close button or hint text sits flush against or clipped by the screen edge before vs. after the toolbar auto-hides.

**Phase to address:**
Home page phase for `.hero`; Modal overlays phase for `.lightbox`/`.magazine-preview`; Header/nav phase for the mobile `.nav` dropdown max-height. Each of these three phases touches a different `100vh` usage, so this is one pitfall with three separate fix sites — flag all three explicitly in each phase's plan so none is missed.

---

### Pitfall 6: The modals' Tab-only focus trap does nothing for touch or VoiceOver/TalkBack users

**What goes wrong:**
Both `Lightbox.jsx` and `MagazinePreview.jsx` implement their focus trap purely via a `keydown` listener that intercepts the `Tab` key and forces focus back to the close button (`if (e.key === 'Tab') { e.preventDefault(); closeRef.current?.focus() }`). This assumes a hardware keyboard. On a touchscreen there is no `Tab` key in normal use, so this "trap" is inert for the primary mobile interaction model; more importantly, VoiceOver (iOS) and TalkBack (Android) screen readers navigate via swipe gestures that read the entire DOM in document order, not via `Tab` — so a screen-reader user on mobile can swipe straight past the modal into the page content behind the dark overlay, which is exactly the trapped-focus failure this code was written to prevent (per its own comment: "This one is a real modal... focus is trapped while open").

**Why it happens:**
The desktop accessibility contract (Esc closes, Tab stays inside) was built and validated against keyboard-only interaction, which is the dominant assistive pattern on desktop but not on mobile, where swipe-based screen-reader navigation is the norm. This gap is invisible unless testing is done with an actual mobile screen reader.

**How to avoid:**
Add `aria-hidden="true"` (or the `inert` attribute, now broadly supported) to the app's root sibling content when a modal is open — e.g., toggle `inert`/`aria-hidden` on the `#root`'s non-modal children, or restructure so the modal renders in a portal outside the main content tree and the main content gets `inert` while any modal is open. This makes the page content genuinely unreachable to assistive tech regardless of input modality, rather than relying on intercepting a specific key that mobile users don't have. `inert` also has the side benefit of blocking touch interaction with background content, which is a second, independent way Pitfall 1's scroll-behind-modal problem could otherwise resurface as "tap-through" on elements.

**Warning signs:**
Enable VoiceOver on an iPhone (or TalkBack on Android), open the Lightbox or magazine preview, and swipe right repeatedly — if focus/announcement moves into content behind the dark overlay instead of stopping at the modal's close button, this pitfall is present.

**Phase to address:**
Modal overlays phase (Lightbox + MagazinePreview). Fix once in the shared modal pattern (ideally alongside extracting the shared scroll-lock hook from Pitfall 1, since both fixes touch the same open/close effect in both files).

---

### Pitfall 7: Stripe Checkout/portal redirects can leave the mobile browser's back button pointing at a stale, pre-purchase page

**What goes wrong:**
`Subscribe.jsx`'s tiles link to `/api/billing/checkout?product=...` via a plain `<a href>` (server-initiated redirect to Stripe Checkout), and `Account.jsx`'s `openPortal()` does `window.location.assign(url)` to send the user to the Stripe billing portal. Both are full-page navigations away from the site to Stripe-hosted pages and back. On mobile Safari in particular, the back/forward cache (bfcache) can restore the pre-redirect page exactly as it was frozen — including stale entitlement/subscription state fetched *before* the purchase or cancellation completed — without re-running the page's data fetches, because bfcache restoration does not fire `load`/mount effects the same way a fresh navigation does. A subscriber who completes checkout, gets redirected to `/subscribe/success` (or Stripe's own confirmation), then taps the mobile browser's back button multiple times can land back on a bfcache-frozen `/subscribe` or `/account` that still shows "Subscribe" instead of "Subscribed" / stale invoice data, until a manual reload. Similarly, using `window.location.href`-style redirects (rather than `.replace()`) can leave an intermediate redirect URL in history, so back navigation bounces through a page that immediately re-redirects, which reads as a broken loop on mobile in particular because mobile back-gesture navigation (edge-swipe) is more casual/frequent than desktop back-button clicks.

**Why it happens:**
This entire flow was built and UAT'd (per PROJECT.md Phase 3 notes) against a live desktop Stripe Checkout round-trip; bfcache behavior differences between desktop and mobile Safari, and the back-button/edge-swipe gesture's prominence on mobile, weren't in scope for that verification and are easy to miss without testing on an actual iPhone.

**How to avoid:**
Add a `pageshow` listener (`window.addEventListener('pageshow', (e) => { if (e.persisted) refetch() })`) to `Subscribe.jsx` and `Account.jsx` so a bfcache restoration re-runs the entitlements/account fetch rather than trusting frozen state — this is a small, targeted addition to routes that already have `useEntitlements()`/`useAccount()` refetch capability. Verify `api/billing/checkout.js` and the portal endpoint use `window.location.assign()` (already the case in `Account.jsx`) rather than pushing multiple history entries, and confirm the return URLs Stripe redirects back to (`success_url`/portal return URL) don't create a redirect chain that back navigation has to unwind. Test the exact sequence: complete checkout on a real iPhone → land on success page → tap back twice → confirm the picker shows "Subscribed," not "Subscribe."

**Warning signs:**
On a real iPhone (bfcache behavior does not reproduce reliably in desktop DevTools), complete a Checkout or portal round-trip, then use the back gesture repeatedly. If the picker or account page ever shows pre-purchase/pre-cancellation state without a manual reload, this pitfall is present.

**Phase to address:**
Subscribe/Account/Stripe redirect phase.

---

### Pitfall 8: Prerendered marketing HTML and post-hydration mobile layout can visibly mismatch, causing a flash/jump at first paint

**What goes wrong:**
`prerender.js` renders every public route to static HTML at build time via `renderToString()` with no viewport context — the server has no concept of "this request is from a 390px-wide phone," so the prerendered markup and any inline layout it implies is viewport-agnostic HTML+CSS that only becomes meaningfully responsive once actual CSS media queries apply in the real browser. `entry-client.jsx` correctly does a real `hydrateRoot()` against this prerendered DOM (not a `createRoot()` remount) when `el.dataset.prerendered === 'true'`, which is the right approach — hydration mismatches will emit console warnings/errors if the server and client render different DOM trees, and any component that reads `window.innerWidth` (or the `mobile` flag in `useScrollFx`, or the phone-width-specific layout branches this milestone is expected to add) during its *initial* render (not inside `useEffect`) will differ between the server's pass (`window` doesn't exist, so any such check must already special-case SSR) and the client's first hydration pass. If new mobile-responsive logic is added as JS-driven conditionals (e.g., `{isMobile ? <MobileNav/> : <DesktopNav/>}` based on a `useState` initialized from `window.innerWidth`) rather than CSS media queries, it will render one thing during prerender/SSR and hydrate to a different DOM on a phone, producing a visible flash-of-wrong-layout and/or a hydration warning in the console — exactly the class of bug that's invisible on desktop (where the SSR guess and the client's actual width usually agree) but guaranteed on mobile (where they never agree, since SSR has no viewport at all).

**Why it happens:**
The prerender/hydrate pipeline was designed and validated for a desktop-first site where "what does the server render" and "what does the client show" were never expected to diverge by viewport, because no viewport-conditional rendering existed anywhere in the codebase before this milestone.

**How to avoid:**
Do mobile-responsive layout changes via CSS (media queries, `clamp()`, flexbox/grid reflow) wherever at all possible — the same DOM tree renders on server and client, and the browser's own layout engine handles the width-dependent presentation with zero hydration risk. Reserve JS-driven viewport branching (if truly needed, e.g., swapping event-handling strategy like touch-vs-mouse drag, or a hamburger menu whose *open/closed* state genuinely differs from anything CSS can express) for `useEffect`-gated state that starts at a fixed, SSR-safe default (e.g., closed/hidden) and only adjusts after mount — never branch the *initial* render output on `window.innerWidth` or similar. Audit `useScrollFx`'s `mobile` check specifically: it currently only affects `style.transform` values applied imperatively inside a `useEffect` (not JSX output), so it's already hydration-safe — but any *new* phone-portrait logic this milestone adds should follow that same pattern (imperative post-mount adjustment, not conditional JSX) unless expressed in CSS.

**Warning signs:**
Load a route directly (not via client-side navigation) on a real phone and watch for a visible flash where the layout looks briefly wrong then snaps to correct, or check the mobile browser's remote-debugging console (Safari Web Inspector via a connected Mac, or `chrome://inspect` for Android) for hydration mismatch warnings.

**Phase to address:**
Cross-cutting — call out explicitly in whichever phase first introduces any JS-conditional (not pure-CSS) mobile-only rendering branch, most likely the Header/nav phase (hamburger menu open/closed state) and the Modal overlays phase (touch-vs-mouse interaction branching).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Duplicating the scroll-lock + focus-trap effect verbatim in `Lightbox.jsx` and `MagazinePreview.jsx` instead of extracting a shared hook | Ships two working modals faster without a refactor | Every mobile fix (scroll lock, `inert`, `dvh`) must be applied and re-verified twice; the two will drift over time | Never — extract before adding mobile-specific logic, since this milestone is about to touch both |
| Fixing only the phone-portrait breakpoint (~375–430px) and leaving the 720–900px animation/CSS breakpoint mismatch (Pitfall 3) unresolved | Matches the milestone's stated scope exactly, ships faster | A future tablet/landscape milestone (explicitly listed as future work in PROJECT.md) inherits a known, undocumented discontinuity | Acceptable only if explicitly logged as a follow-up decision, not silently left |
| Testing mobile layout only in desktop DevTools device-emulation mode | Fast iteration, no device needed | Misses bfcache, `dvh`/toolbar-collapse, VoiceOver/TalkBack, and real touch-gesture-vs-pointer-event behavior — all five Critical Pitfalls above require a real device or real mobile browser to detect | Never for the modal overlay, drag-scroll, and Stripe-redirect phases specifically; acceptable for pure CSS grid/typography breakpoint work |
| Adding a fetch timeout only to the Account/Subscribe pages rather than the shared `useSafeFetch` hook | Smaller, faster patch | Every other current/future consumer of `useSafeFetch` (gated content on Edition/Archive/Books/Writings) keeps the same indefinite-hang exposure | Never — fix in the shared hook |

## Integration Gotchas

Common mistakes when connecting to external services in this milestone's context.

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Stripe Checkout / billing portal redirect | Assuming the desktop back-button UAT (Phase 3) covers mobile back-gesture/bfcache behavior | Re-test the full redirect round-trip on a real iPhone with repeated back-gesture navigation; add `pageshow`/`persisted` refetch guards (Pitfall 7) |
| Google OAuth sign-in redirect (`/api/auth/google`) | Not verifying the same-origin `return_to` redirect completes cleanly inside in-app mobile browsers (e.g., opened from a social app's embedded webview) which sometimes block or sandbox third-party OAuth popups/redirects differently than mobile Safari/Chrome | Test the sign-in redirect specifically in an iOS/Android in-app browser context if any marketing traffic is expected to arrive via social links, not just plain mobile Safari |
| Stripe billing portal (`window.location.assign(url)`) | Treating the portal as a fire-and-forget redirect with no consideration for what state the app should show if the user returns via back-gesture before the portal action (e.g., cancel) has propagated through the webhook | Re-fetch account/entitlement state on `pageshow`/`focus` after returning from the portal, not just on route mount, since the returning navigation may be a bfcache restore rather than a fresh mount |

## Performance Traps

Patterns that work on desktop/wifi but fail on real mobile network conditions.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| No timeout on `useSafeFetch` (Pitfall 4) | Infinite "Checking your session…" / price skeletons on flaky connections | Add request timeout + retry affordance in the shared hook | Any 3G/edge/spotty-signal condition — not a scale threshold, a network-quality threshold |
| `useScrollFx`'s rAF loop runs every animation frame on desktop widths; already skips the fan transform math on mobile widths (`mobile` flag) but still runs `[data-par]`/`[data-cta]` parallax loops unconditionally | Battery drain / jank on low-end phones scrolling the home page, even though the flagship fan animation is correctly suppressed | When retrofitting phone-portrait fixes, consider also throttling or disabling the parallax (`[data-par]`) and CTA-scale (`[data-cta]`) rAF work on narrow viewports/`prefers-reduced-motion`, not just the fan geometry | Low/mid-range Android devices scrolling the home page — desktop and high-end phones won't show this |
| Full-quality magazine preview page images loaded eagerly per page in `MagazinePreview.jsx` (`<img src={pages[index]}>`, no explicit lazy/priority hints beyond `decoding="async"`) | Slow first-page-flip render on cellular data | Confirm image sizes are mobile-appropriate (responsive `srcset` or pre-sized JPEGs) before this milestone's touch/viewport work ships, since mobile is disproportionately on cellular bandwidth | Any page set with large source images on a cellular connection |

## Security Mistakes

Domain-specific concerns for this milestone (mobile layer sits on top of an already-hardened server-verified entitlement system — the risk here is regressing that boundary while touching UI, not introducing new server holes).

| Mistake | Risk | Prevention |
|---------|------|------------|
| Adding a client-side "is this a paid tile" visual shortcut while reworking `ProductTile`/`Edition.jsx` for mobile layout (e.g., a quick `localStorage`-cached "last known subscribed" flag to avoid a loading flash on mobile) | Reintroduces exactly the client-trusted gating flaw this whole project replaced (the original `subscribed` localStorage flag) | Any mobile-specific loading-state UX improvement must still resolve from the real server-verified `useEntitlements()`/session data — never cache or shortcut entitlement state client-side, even for a "just cosmetic" fast-paint purpose |
| Using `inert`/`aria-hidden` (Pitfall 6 fix) incorrectly — e.g., applying it to the modal itself instead of its siblings, or forgetting to remove it on close | Background content becomes permanently unreachable/unfocusable after a modal closes | Toggle `inert` on the sibling content only, in the same effect cleanup that already restores `body.style.overflow` and focus, so it can't be forgotten independently |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|--------------|-------------------|
| Monthly/Annual "chip" toggle buttons and Previous/Next magazine-preview buttons sized for mouse-pointer precision, not a ~44×44px touch target | Mis-taps on the wrong interval or wrong page-nav direction, frustrating on a phone | Audit tap-target sizing on `.chip`, `.btn--sm`, and the magazine-preview nav buttons specifically at phone widths — bump padding/hit-area even if the visual size stays similar |
| `Edition.jsx`'s paywall loading state already shows an excerpt + skeleton (good pattern) but `Account.jsx`'s combined gate shows nothing but bare text for potentially many seconds on mobile (Pitfall 4) | Inconsistent perceived reliability: gated content "feels fine," account page "feels broken," on the same network conditions | Apply the same "always show something real (excerpt/skeleton), never a bare blocking spinner" pattern already used in `Edition.jsx` to `Account.jsx`'s combined loading gate |
| Lightbox/MagazinePreview "Press Esc or click anywhere to close" / "Use ← → to browse · Esc to close" hint text is keyboard-centric copy shown unconditionally, including on touch devices where there is no Esc key or arrow keys | Confusing/irrelevant instructions on the exact devices this milestone targets | Swap the hint copy based on input modality (e.g., "Tap the × or outside to close" on touch, detected via `matchMedia('(pointer: coarse)')` — safe to branch on inside a `useEffect`, not initial JSX, per Pitfall 8) |

## "Looks Done But Isn't" Checklist

- [ ] **Modal overlays (Lightbox/MagazinePreview):** Often missing real touch-device background-scroll prevention — verify by dragging the background on an actual iPhone, not DevTools emulation (Pitfall 1)
- [ ] **Drag-scroll strips:** Often missing `touch-action` tuning — verify by dragging a `.strip` on a real touchscreen and watching for jitter/snap-back (Pitfall 2)
- [ ] **Any "mobile" JS breakpoint check:** Often hardcodes a different pixel value than the CSS breakpoint it's meant to match — grep for `innerWidth` alongside `@media` values and confirm they agree (Pitfall 3)
- [ ] **Any loading/skeleton state:** Often has no timeout/retry path — verify by throttling to "Slow 3G" + adding artificial latency and confirming the UI never gets permanently stuck (Pitfall 4)
- [ ] **Any full-bleed `100vh` section:** Often still jumps as mobile toolbar collapses — verify on a real phone by scrolling and watching for a geometry shift, not just checking it "fits" at load (Pitfall 5)
- [ ] **Modal focus trap:** Often keyboard-only — verify with VoiceOver/TalkBack swipe navigation, not just Tab key (Pitfall 6)
- [ ] **Stripe redirect round-trip:** Often only verified with a fresh page load after return — verify specifically with mobile back-gesture/back-button navigation after purchase/cancel (Pitfall 7)
- [ ] **Any new mobile-only conditional rendering:** Often branches JSX output on `window.innerWidth` read during initial render — verify by loading the route directly (not via client nav) on a real phone and checking for a layout flash or console hydration warning (Pitfall 8)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| Scroll-behind-modal on iOS (Pitfall 1) | LOW | Extract and apply the `position: fixed` body-lock technique retroactively to both modals — same fix, one shared hook, low regression risk since it only changes lock/unlock behavior |
| Drag-scroll jitter on touch (Pitfall 2) | LOW | Add `touch-action` CSS + gate pointer handlers by `pointerType` — no structural change, purely additive |
| Breakpoint mismatch (Pitfall 3) | LOW | Extract shared constant, update `useScrollFx`'s `mobile` derivation — isolated to one file |
| Indefinite loading hangs (Pitfall 4) | MEDIUM | Add timeout to the shared `useSafeFetch` hook; requires re-verifying every existing consumer's error-state UI still renders sensibly on a timeout-triggered `error: true` |
| `100vh` toolbar jump (Pitfall 5) | LOW–MEDIUM | Swap to `100dvh` with fallback per site; re-verify `useScrollFx`'s band-fitting math against the corrected value, since it was written to compensate for `100vh`'s original behavior |
| Tab-only focus trap (Pitfall 6) | LOW | Add `inert`/`aria-hidden` toggle to the existing open/close effect in both modals |
| Stale post-redirect state (Pitfall 7) | LOW | Add `pageshow`/`persisted` refetch listeners to `Subscribe.jsx`/`Account.jsx` — additive, no change to the redirect flow itself |
| Hydration mismatch from JS viewport branching (Pitfall 8) | MEDIUM–HIGH | Depends how deep the offending conditional is threaded through JSX; recovery means moving the branch from render-time to a `useEffect`-driven post-mount state or replacing it with CSS — potentially a real refactor if discovered late |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| 1. iOS body scroll-lock doesn't hold | Modal overlays phase | Drag background on real iPhone with modal open; page must not move |
| 2. Pointer-drag vs. native touch scroll conflict | Home page phase | Drag a `.strip` on real touchscreen; no jitter/snap-back |
| 3. Fan-animation/CSS breakpoint mismatch | Home page phase | Resize through 720–900px band; no fan-geometry discontinuity |
| 4. No fetch timeout on loading gates | Subscribe/Account/Stripe phase | Throttle network + add latency; UI must reach an error+retry state, never hang forever |
| 5. `100vh` toolbar-collapse jump | Home page phase (hero), Modal overlays phase (lightbox), Header/nav phase (mobile nav) | Scroll on real phone; no layout shift as address bar collapses |
| 6. Keyboard-only focus trap | Modal overlays phase | VoiceOver/TalkBack swipe test; background must be unreachable |
| 7. Stale state after Stripe redirect + back navigation | Subscribe/Account/Stripe phase | Real-device back-gesture test after checkout/portal completion |
| 8. Hydration mismatch from viewport-conditional JSX | Cross-cutting; enforce in Header/nav phase and Modal overlays phase specifically | Direct route load on real phone; no flash, no console hydration warning |

## Sources

- Codebase (read directly, HIGH confidence): `src/lib/motion.js`, `src/components/Lightbox.jsx`, `src/components/MagazinePreview.jsx`, `src/routes/Subscribe.jsx`, `src/routes/Account.jsx`, `src/lib/useSafeFetch.js`, `src/lib/useEntitlements.js`, `src/routes/Edition.jsx`, `src/entry-client.jsx`, `index.html`, `src/styles/eclat.css`, `.planning/PROJECT.md`
- [touch-action CSS property — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) — pointer/touch gesture conflict mechanics (Pitfall 2), HIGH confidence
- [The Large, Small, and Dynamic Viewports – Bram.us](https://www.bram.us/2021/07/08/the-large-small-and-dynamic-viewports/) — `dvh`/`svh`/`lvh` semantics vs. `100vh` (Pitfall 5), HIGH confidence
- [TIL: Prefer h-dvh over h-screen on iOS Safari — Guide Fari](https://guidefari.com/safari-h-screen-vs-h-dvh/) — corroborating iOS-specific `100vh` behavior (Pitfall 5), MEDIUM confidence
- [Back/forward cache — web.dev](https://web.dev/articles/bfcache) — `pageshow`/`persisted` restoration semantics (Pitfall 7), HIGH confidence
- [Allow controlling the navigation type from stripe.redirectToCheckout() — stripe/stripe-js#175](https://github.com/stripe/stripe-js/issues/175) — real-world Stripe redirect back-button/history reports (Pitfall 7), MEDIUM confidence
- General web-platform knowledge (iOS Safari `overflow:hidden` scroll-lock limitations, VoiceOver/TalkBack swipe navigation vs. `Tab`-based focus traps, `inert` attribute support) — HIGH confidence, well-established, widely documented platform behavior

---
*Pitfalls research for: Mobile-responsive retrofit of an existing desktop-first magazine/subscription SPA*
*Researched: 2026-09-13*
