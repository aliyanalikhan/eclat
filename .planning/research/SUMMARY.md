# Project Research Summary

**Project:** Eclat - Mobile-Responsive Retrofit (v1.1 milestone)
**Domain:** Mobile-responsive layout/touch/UX fixes for an existing prerendered Vite + React SPA (magazine/subscription product with server-verified entitlements from a prior auth/billing milestone)
**Researched:** 2026-09-13
**Confidence:** HIGH

## Executive Summary

Eclat's v1.1 milestone is not a technology-adoption project - it is a targeted retrofit of an existing, working desktop-first site to be correct at phone-portrait widths (roughly 375-430px). The codebase already has most of the right primitives in place (native CSS scroll-snap strips, Pointer Events-based drag-scroll, a working top-drawer nav, CSS grid auto-collapse on pricing/account panels), so the recommended approach is disciplined extension of the existing plain-CSS/hand-rolled-JS conventions - zero new npm dependencies - rather than introducing a CSS framework, gesture library, or preprocessor. The correct fixes are native browser features (clamp, svh/dvh, touch-action, matchMedia pointer:coarse) layered onto src/styles/eclat.css and src/lib/motion.js.

The single biggest structural risk is breakpoint/state drift: three independent "what is mobile" literals already exist today (720px in useScrollFx, 900px in Header.jsx matchMedia, and CSS's own 1080/900/720/460 tiers), and per-page fixes done without first consolidating these will make the drift worse, not better. The second major risk cluster is desktop-only assumptions baked into interactive/modal code that were never exercised on a real touchscreen: iOS Safari overflow hidden does not actually lock background scroll, Pointer Events already fire for touch but race against native overflow-x auto scrolling, 100vh does not account for mobile toolbar collapse, and modal focus-traps are keyboard-only (invisible to VoiceOver/TalkBack swipe navigation). A third cluster is specific to this product's paid/entitlement surfaces: Stripe Checkout/portal redirects can leave stale pre-purchase state visible after mobile back-gesture navigation (bfcache), and the combined loading gate on /account has no fetch timeout, so a flaky mobile connection can strand a user on an infinite spinner.

Recommended mitigation: land a shared foundation pass first (breakpoint-tier documentation plus fluid tokens in CSS, plus the touch-vs-native-scroll decision in motion.js) before any per-page visual work, then fix global chrome (header/nav), then content pages, then the two modals (which share a lightbox base class and duplicate scroll-lock/focus-trap code that should be extracted into one shared hook), then Subscribe/Account (which carries the Stripe-redirect and fetch-timeout risks). All verification must happen on a real device or real touch-emulation (Chrome DevTools touch flag, not just a resized viewport) - several of the critical pitfalls (bfcache, iOS scroll-lock, dvh toolbar collapse, VoiceOver) simply do not reproduce in ordinary desktop DevTools device emulation.

## Key Findings

### Recommended Stack

Zero new npm packages. Every capability needed (fluid typography/spacing via clamp, correct full-height sections via svh/dvh with a vh fallback, unified touch/mouse handling via the already-in-use Pointer Events API, gesture ownership via touch-action) is a native browser feature already within the project's browserslist target. The project's own zero-dependency CDP script (verify-hero.mjs) should be generalized to sweep phone widths (375/390/414/430px) rather than introducing Playwright/Cypress.

**Core technologies:**
- CSS Custom Properties (root tokens) - central design tokens - extend the existing token block in eclat.css rather than adding a theming library
- clamp() fluid typography/spacing - replaces "one more breakpoint" with a single continuous CSS value, zero tooling
- svh viewport units (with vh fallback) - fixes hero/modal/nav height jumping as mobile browser chrome shows/hides; svh preferred over dvh for overflow-sensitive sections due to iOS lag
- Pointer Events API (already in use in useDragScroll) - no new touch library needed; the real gap is a pointerType touch guard, not missing capability
- touch-action: pan-x - tells the browser to cede horizontal drag gesture ownership to JS on the drag-scroll strip

**Explicitly rejected:** Tailwind/Bootstrap, CSS-in-JS, device-detection/UA-sniffing libraries, gesture libraries (Hammer.js, react-swipeable, use-gesture), Playwright/Cypress/Puppeteer, Sass/Less/PostCSS - all would add dependencies or build-tooling changes for capabilities the platform already provides or the codebase already implements.

### Expected Features

Research treats this as "make six existing feature types correct at phone width," not new feature work.

**Must have (table stakes) - all P1, matching PROJECT.md's Active requirements:**
- Horizontal strip touch-scroll correctness (scroll-snap-stop always, peek-width verified at 375px - layout already about 90 percent correct)
- Lightbox/MagazinePreview: touch-appropriate microcopy (no "Press Esc" or arrow-key hints on touch) and 44px minimum tap targets
- No unintended horizontal page-scroll anywhere, verified specifically at 375px
- Pricing picker (/subscribe) and Account panels: confirm existing CSS-grid stacking holds at 375-430px; fix cramped padding/tap targets on interval chips and CTAs
- Global nav drawer: safe-area-inset handling on notched devices, tap-target sizing, no regression to sign-in/sign-out flow

**Should have (differentiators, v1.x - add after UAT signal, not required for launch):**
- Swipe-left/right to turn pages in MagazinePreview (additive to existing Prev/Next buttons)
- Swipe-down-to-dismiss on modals

**Defer (v2+):**
- Pinch/double-tap zoom in Lightbox/MagazinePreview (gesture-conflict risk with dismiss/turn gestures)
- Bottom tab-bar navigation redesign (legitimate pattern but a structural nav redesign, explicitly out of "fix don't rebuild" scope)

### Architecture Approach

No new build tooling. The fix is organizational: consolidate three independently-hardcoded "what is mobile" breakpoint literals (CSS's 1080/900/720/460 tiers, useScrollFx's innerWidth less than 720 check, Header.jsx's matchMedia max-width 900px) into one documented tier source before touching per-page CSS, since CSS custom properties cannot be referenced inside media query conditions - the discipline has to be a documented comment convention, not a technical enforcement mechanism.

**Major components:**
1. src/styles/eclat.css root token block - gets new breakpoint-tier documentation and fluid-spacing/type custom properties; single source of truth for values (not media-query conditions)
2. src/lib/motion.js useDragScroll - gets a pointer-coarse gate so native touch scrolling isn't fought by the JS drag handler; useScrollFx's stale mobile flag gets reconciled to the same tier
3. Shared modal scroll-lock/focus-trap pattern (currently duplicated verbatim across Lightbox.jsx and MagazinePreview.jsx) - should be extracted into one hook before mobile-specific fixes are applied twice
4. Suggested build order: (A) shared foundation/tokens then (B) global chrome (Header/Footer) then (C) content pages (Home/Archive/Edition/Books/Writings) then (D) modals then (E) Subscribe/Account

### Critical Pitfalls

1. iOS Safari overflow hidden does not lock background scroll - background page rubber-bands behind open modals; fix with a position fixed body-lock technique in one shared useScrollLock hook, verified on a real iPhone (not DevTools emulation)
2. Pointer-based drag-scroll fights native touch scrolling on strip elements - causes jitter/snap-back on real touchscreens; fix by gating useDragScroll off for touch pointer type (native scroll already handles it) or adding touch-action pan-x
3. 100vh does not account for mobile toolbar collapse - hero, lightbox, and nav dropdown heights visibly jump as the address bar shows/hides; fix by layering 100dvh/100svh after a 100vh fallback on the three affected selectors
4. Modal focus-traps are Tab-key-only - invisible to VoiceOver/TalkBack swipe navigation, letting screen-reader users swipe past the modal into background content; fix with inert or aria-hidden on sibling content, not a keydown-only trap
5. No fetch timeout plus Stripe redirect/bfcache staleness - /account's combined loading gate can hang indefinitely on a flaky mobile connection (no timeout in useSafeFetch), and mobile back-gesture navigation after Stripe Checkout/portal can restore a bfcache-frozen pre-purchase page; fix with a shared-hook timeout plus retry and pageshow/persisted refetch listeners

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Shared Foundation (tokens, breakpoints, touch-input decision)
**Rationale:** Every other phase depends on this; a token/tier change made later forces re-verification of already-fixed pages (Architecture Anti-Pattern 3)
**Delivers:** Documented breakpoint-tier comment block plus fluid-spacing/type custom properties in eclat.css; useDragScroll pointer-coarse gate in motion.js, verified on real/emulated touch
**Uses:** CSS Custom Properties, clamp(), Pointer Events pointerType check, touch-action
**Avoids:** Pitfall 3 (breakpoint mismatch), Pitfall 2 (drag-scroll vs native touch conflict)

### Phase 2: Global Chrome (Header/Nav/Footer)
**Rationale:** Touches every page transitively; a header/nav regression is visible everywhere, so fix early
**Delivers:** Safe-area-inset handling on the nav drawer, tap-target sizing on nav links and auth avatar/menu, verified no regression to sign-in/sign-out flow at 375px
**Addresses:** Global nav drawer table-stakes item from FEATURES.md
**Avoids:** Pitfall 5 (100vh jump on the mobile nav dropdown's max-height), Pitfall 8 (hydration mismatch if any new JS-conditional nav rendering is added)

### Phase 3: Content Pages (Home, Archive, Edition, Books, Writings)
**Rationale:** Shares grid-covers/strip/writing CSS patterns already partially addressed; can be parallelized across pages once Phase 1 tokens exist since each page's CSS selectors are independent
**Delivers:** Horizontal strip scroll-snap tuning (peek-width, scroll-snap-stop), no-unintended-horizontal-scroll sweep at 375px, hero fan animation verified against the reconciled breakpoint, Edition's three-branch gated-content layout (loading/locked/entitled) each verified independently
**Addresses:** Strip/carousel table-stakes item, horizontal-scroll-elimination table-stakes item
**Avoids:** Pitfall 3 (fan-animation breakpoint discontinuity), Pitfall 2 (drag-scroll jitter, first exercised here)

### Phase 4: Modal Overlays (Lightbox, MagazinePreview)
**Rationale:** Depends on Phase 1's touch-input decision and benefits from Phase 3's page-level fixes being stable (both modals are triggered from cover grids); both modals share a lightbox base class and duplicate scroll-lock/focus-trap code - fix once, apply to both
**Delivers:** Extracted shared scroll-lock hook (with iOS-safe position fixed technique), inert or aria-hidden sibling-content trap replacing the Tab-only trap, touch-aware hint copy, 44px minimum tap targets on Prev/Next/close buttons
**Addresses:** Lightbox/MagazinePreview touch-microcopy and tap-target table-stakes item
**Avoids:** Pitfall 1 (iOS scroll-behind-modal), Pitfall 6 (keyboard-only focus trap), Pitfall 5 (lightbox 100vh/dvh)

### Phase 5: Subscribe/Account (Stripe redirect surfaces)
**Rationale:** Lowest shared-CSS overlap with other phases, no drag-scroll/modal touch concerns - can run last or in parallel with Phase 4; carries the two entitlement-adjacent pitfalls that most directly touch Core Value (real, server-verified paid access)
**Delivers:** Pricing-tile/account-panel tap-target and spacing pass at 375-430px; shared useSafeFetch timeout plus retry affordance; pageshow/persisted refetch listeners on Subscribe/Account to defeat bfcache staleness after Stripe Checkout/portal round-trips
**Addresses:** Pricing picker and account panel table-stakes items
**Avoids:** Pitfall 4 (indefinite loading hang), Pitfall 7 (stale post-redirect state on mobile back-gesture)

### Phase Ordering Rationale

- Foundation-first ordering directly follows Architecture's Anti-Pattern 3 warning: fixing breakpoints per-page before consolidating the tier/token layer recreates and worsens today's three-literal drift problem
- Global chrome before content pages because nav/header issues are visible on every subsequent page's screenshot/UAT
- Modals sequenced after content pages because they're triggered from content-page cover grids and share Phase 1's touch-input decision
- Subscribe/Account sequenced last because it has the least CSS/component overlap with the other phases and its two critical pitfalls (fetch timeout, Stripe bfcache) are independent, additive fixes to a shared hook and two route files respectively - no dependency on modal or content-page work

### Research Flags

Phases likely needing deeper research during planning:
- Phase 4 (Modal Overlays): VoiceOver/TalkBack inert migration and real-iOS scroll-lock behavior are genuinely device-dependent; if the planner isn't confident about inert browser support or the exact position-fixed scroll-restoration sequence, a focused research pass may help avoid regressions
- Phase 5 (Subscribe/Account): bfcache/pageshow interaction with the existing Stripe redirect flow (window.location.assign, success/portal return URLs) touches security-adjacent entitlement state - worth a research-phase pass to confirm the exact redirect/history sequence doesn't reintroduce a stale-state or redirect-loop bug

Phases with standard patterns (skip research-phase):
- Phase 1 (Foundation): Pure CSS custom properties/clamp()/touch-action - well-documented, standard web-platform features, HIGH confidence from STACK.md
- Phase 2 (Global Chrome): Extends an already-working, already-implemented top-drawer nav pattern - no new pattern being introduced
- Phase 3 (Content Pages): Extends existing scroll-snap CSS and reconciles one JS constant - standard, low-risk

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified directly against repo source (eclat.css, motion.js, verify-hero.mjs, package.json) plus cross-referenced browser-support data for dvh/svh/container queries |
| Features | HIGH (general UX patterns) / MEDIUM (Eclat-specific recommendations) | Corroborated by Smashing Magazine, WCAG 2.5.8, Apple HIG, Material Design; Eclat-specific claims verified directly against src source rather than inferred |
| Architecture | HIGH | Grounded entirely in current source inspection (eclat.css, motion.js, vite.config.js, prerender.js, Header.jsx) - an integration question about existing code, not an external ecosystem lookup |
| Pitfalls | HIGH | Codebase-verified against actual source (Lightbox.jsx, MagazinePreview.jsx, Subscribe.jsx, Account.jsx, useSafeFetch.js) with platform-behavior claims corroborated by MDN, web.dev, and independent practitioner sources |

**Overall confidence:** HIGH

### Gaps to Address

- inert attribute browser support edge cases: research assumes "broadly supported" but the planner should double check current Safari/iOS support at implementation time before committing Phase 4's focus-trap fix to it exclusively
- In-app/webview OAuth redirect behavior: PITFALLS.md flags that social-app embedded webviews may sandbox the Google OAuth redirect differently than mobile Safari/Chrome - this wasn't deeply researched (noted as an integration gotcha only) and should be spot-checked if marketing traffic via social links is expected
- Exact peek-width/snap-stop values at 375px vs 430px: FEATURES.md notes the existing 86vw peek should work at 375px but flags it needs re-verification specifically at that width, not just at the existing 720px breakpoint - treat as a verification task in Phase 3, not a settled fact
- Whether swipe-to-turn/swipe-to-dismiss (v1.x differentiators) get scheduled in the same milestone: PITFALLS/FEATURES both flag a real gesture-conflict risk between pinch-zoom and swipe-down-dismiss if both are ever pursued - no phase in the v1 plan should combine both without an explicit gesture-priority decision

## Sources

### Primary (HIGH confidence)
- Direct repository inspection: src/styles/eclat.css, src/lib/motion.js, src/components/Header.jsx, src/components/Lightbox.jsx, src/components/MagazinePreview.jsx, src/routes/Subscribe.jsx, src/routes/Account.jsx, src/lib/useSafeFetch.js, src/entry-client.jsx, index.html, vite.config.js, prerender.js, verify-hero.mjs, package.json, .planning/PROJECT.md, .planning/codebase/ARCHITECTURE.md
- touch-action - MDN
- The Large, Small, and Dynamic Viewports - Bram.us
- Back/forward cache - web.dev
- Accessible Target Sizes Cheatsheet - Smashing Magazine (WCAG 2.5.8)

### Secondary (MEDIUM confidence)
- Sizzy/Savvy/TestMu/LambdaTest/csstoolkit.net - dvh/svh browser support corroboration
- caniuse.com / LogRocket - CSS container query baseline status
- CXL / tutsplus - mobile pricing-page stacking-vs-carousel usage data
- Webflow/Squarespace/WordPress community forums - lightbox pinch-zoom gesture-conflict reports
- UXmatters, UXPin, Acclaim - touch target and mobile nav pattern guidance
- TIL Prefer h-dvh over h-screen on iOS Safari - Guide Fari
- stripe-js issue 175 - Stripe redirect back-button history reports

### Tertiary (LOW confidence)
- None flagged - all research files corroborated findings against either primary source code or multiple independent secondary sources

---
*Research completed: 2026-09-13*
*Ready for roadmap: yes*
