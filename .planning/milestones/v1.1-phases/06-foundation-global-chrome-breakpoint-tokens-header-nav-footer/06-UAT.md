---
status: testing
phase: 06-foundation-global-chrome-breakpoint-tokens-header-nav-footer
source: [06-VERIFICATION.md]
started: 2026-09-13T00:00:00Z
updated: 2026-09-13T00:00:00Z
---

## Current Test

number: 1
name: Notched-device safe-area clearance
expected: |
  Padding is visually identical to pre-phase on non-notched devices; on notched hardware, the dropdown clears the notch/home-indicator area.
awaiting: user response

## Tests

### 1. Notched-device safe-area clearance
expected: On a real notched/gesture-bar device (or a DevTools notched preset, e.g. iPhone 14 Pro), open the mobile hamburger nav and inspect the dropdown's left/right/bottom padding. Padding is visually identical to pre-phase on non-notched devices; on notched hardware, the dropdown clears the notch/home-indicator area.
result: [pending]

### 2. Toolbar-collapse height stability (svh)
expected: On a real mobile browser (iOS Safari or similar), scroll past the hero and open the Lightbox from a cover image while the address bar collapses/expands. No visible height jump in the hero band or lightbox frame as the toolbar state changes.
result: [pending]

### 3. Fluid token legibility at boundary widths
expected: At 375px, 430px, and >=481px, read `.wordmark`'s and `.footer`'s computed values in DevTools' Computed panel. Continuous scaling with no jump at 460px; letter-spacing remains legible at the smaller computed sizes.
result: [pending]

### 4. Real touch-drag behavior on the horizontal strips
expected: With touch emulation or a real touchscreen, drag the hero fan/Cultural Icons/Videos strips; repeat with a real mouse. Touch drag scrolls via native momentum/snap with no jitter; mouse drag is unchanged from pre-phase.
result: [pending]

### 5. Footer legibility at 375px/430px (CHROME-03 backstop)
expected: At exactly 375px and 430px, screenshot the footer and confirm the wordmark, nav-links row, and full copyright sentence each render on distinct, non-overlapping, non-clipped rows. 3 clean rows at both widths, full sentence wraps without clipping.
result: [pending]

### 6. Live signed-in auth-menu round trip
expected: In an environment with real Google OAuth credentials and a live database, sign in, open the auth menu, and sign out. Avatar/name render correctly sized; sign-out completes and clears the session with no regression.
result: [pending]

### 7. Mobile nav paint confirmation with JavaScript disabled
expected: With Chrome DevTools' "Disable JavaScript" setting enabled, load `/` at a viewport width <=900px and observe the header/nav region. Only the header bar (wordmark + hamburger icon) is visible; the nav links/auth-slot/Subscribe button do not render as an open full-width dropdown over the page.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
