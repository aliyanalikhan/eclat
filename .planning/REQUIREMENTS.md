# Requirements: Éclat

**Defined:** 2026-09-13
**Core Value:** A signed-in subscriber's paid access is real and enforced server-side — no page, download, or API response leaks paid content to someone who hasn't actually paid for it.
**Milestone:** v1.1 Mobile Responsive Design — every page and interactive overlay is fully usable and visually correct at phone-portrait widths (~375–430px)

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Shared Foundation (FOUND)

- [ ] **FOUND-01**: A single documented breakpoint tier for phone-portrait widths is used consistently across CSS media queries and JS viewport checks — replacing the three currently-drifting literals (CSS's 720/900px tiers, `useScrollFx`'s 720px JS check, `Header.jsx`'s 900px `matchMedia`)
- [ ] **FOUND-02**: Fluid typography and spacing use `clamp()`-based tokens so text and layout scale smoothly across phone widths instead of jumping at fixed breakpoints
- [ ] **FOUND-03**: Full-height sections (hero, modal, nav dropdown) use `svh`/`dvh` with a `vh` fallback so they don't visibly jump as the mobile browser's address bar collapses/expands
- [ ] **FOUND-04**: The horizontal drag-scroll strip (`useDragScroll`) doesn't fight native touch scrolling on phones — touch input scrolls smoothly via native scrolling, not via the JS pointer-drag handler

### Global Chrome (CHROME)

- [ ] **CHROME-01**: The site header/nav is fully usable at phone-portrait widths — the nav drawer opens/closes correctly, safe-area insets are respected on notched devices, and there's no regression to sign-in/sign-out
- [ ] **CHROME-02**: All header/nav tap targets (menu button, nav links, auth avatar/menu) meet a 44px minimum touch target size
- [ ] **CHROME-03**: The footer renders correctly and legibly at phone-portrait widths with no overlapping or cut-off content

### Content Pages (CONTENT)

- [ ] **CONTENT-01**: No page produces unintended horizontal scrolling at phone-portrait widths (375–430px)
- [ ] **CONTENT-02**: Horizontal drag-scroll strips (hero fan, Cultural Icons, Videos) scroll smoothly via touch with correct peek-width and snap behavior at 375px
- [ ] **CONTENT-03**: Archive / Edition / Books / Writings listing grids reflow to a usable narrow-column layout at phone widths with readable text and tappable cards
- [ ] **CONTENT-04**: Edition's three content-access states (loading / not-entitled / entitled) each render correctly and legibly at phone-portrait widths

### Modal Overlays (MODAL)

- [ ] **MODAL-01**: Opening the Lightbox or MagazinePreview modal locks background scroll correctly on iOS Safari (not just `overflow:hidden`, which doesn't prevent background rubber-band scrolling)
- [ ] **MODAL-02**: Modal hint text doesn't reference keyboard-only interactions (e.g. "Press Esc", arrow-key hints) on touch devices — touch users see touch-appropriate instructions or none
- [ ] **MODAL-03**: Modal close/prev/next controls meet a 44px minimum tap target size
- [ ] **MODAL-04**: Modal focus-trapping is not keyboard-only — screen-reader users (VoiceOver/TalkBack) using swipe navigation cannot swipe past the modal into background content

### Subscribe / Account (SUB)

- [ ] **SUB-01**: The 4-tile pricing picker on `/subscribe` stacks to a usable single-column layout at phone widths with legible pricing and tappable CTAs
- [ ] **SUB-02**: Account page's per-product panels, status, and billing-portal CTA are usable and legible at phone widths
- [ ] **SUB-03**: A stalled network request on sign-in/session/account checks doesn't leave the user on an infinite loading state — a timeout surfaces a retry affordance
- [ ] **SUB-04**: Returning to `/subscribe` or `/account` via mobile back-gesture navigation after a Stripe Checkout/portal redirect never shows stale pre-purchase/pre-cancel state (bfcache staleness)

## v2 Requirements

Deferred to a future milestone. Tracked but not in this roadmap.

### Modal Overlays

- **MODAL-05**: Swipe-left/right to turn pages in the MagazinePreview modal (additive to existing Prev/Next buttons)
- **MODAL-06**: Swipe-down-to-dismiss on Lightbox/MagazinePreview
- **MODAL-07**: Pinch/double-tap zoom in Lightbox/MagazinePreview — deferred due to a genuine gesture-conflict risk against swipe-to-dismiss/swipe-to-turn; requires an explicit gesture-priority decision before being combined with MODAL-05/06

### Global Chrome

- **CHROME-04**: Bottom tab-bar navigation redesign — a legitimate mobile pattern, but a structural nav redesign that's out of this milestone's "fix, don't rebuild" scope

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Tablet/desktop layout changes | This milestone targets phone-portrait widths (~375–430px) only |
| CSS framework adoption (Tailwind, Bootstrap) | Every capability needed is a native CSS/browser feature already within this project's target — adding a framework is unjustified dependency weight for a plain-CSS codebase |
| CSS-in-JS or a preprocessor (Sass/Less/PostCSS) | Project deliberately has zero CSS build tooling beyond Vite's default pipeline; `clamp()`/custom properties cover the need without one |
| Gesture libraries (Hammer.js, react-swipeable, use-gesture) | The existing Pointer Events API already covers what's needed; a gesture library is unneeded dependency weight for this milestone's table-stakes scope |
| Automated visual-regression testing (Playwright/Cypress) | No test framework exists in this project; the existing zero-dependency `verify-hero.mjs` CDP script is extended instead, per research |
| CSS Container Queries | Available and viable, but unnecessary for this milestone's single-viewport-band scope; flagged as a future option only |
| Device-detection / UA-sniffing | Feature detection (`matchMedia`, `pointer: coarse`) is the correct tool; UA-sniffing is brittle and explicitly rejected by research |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 6 | Pending |
| FOUND-02 | Phase 6 | Pending |
| FOUND-03 | Phase 6 | Pending |
| FOUND-04 | Phase 6 | Pending |
| CHROME-01 | Phase 7 | Pending |
| CHROME-02 | Phase 7 | Pending |
| CHROME-03 | Phase 7 | Pending |
| CONTENT-01 | Phase 8 | Pending |
| CONTENT-02 | Phase 8 | Pending |
| CONTENT-03 | Phase 8 | Pending |
| CONTENT-04 | Phase 8 | Pending |
| MODAL-01 | Phase 9 | Pending |
| MODAL-02 | Phase 9 | Pending |
| MODAL-03 | Phase 9 | Pending |
| MODAL-04 | Phase 9 | Pending |
| SUB-01 | Phase 10 | Pending |
| SUB-02 | Phase 10 | Pending |
| SUB-03 | Phase 10 | Pending |
| SUB-04 | Phase 10 | Pending |

**Coverage:**

- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

*Phase numbers above are provisional (continuing from v1.0's Phase 5) — confirmed/adjusted by the roadmapper.*

---
*Requirements defined: 2026-09-13*
*Last updated: 2026-09-13 after v1.1 milestone research*
