---
status: complete
quick_id: 261005-ptq
commit: 5fd4cf6
date: 2026-10-05
files_modified:
  - src/styles/eclat.css
---

# Quick Task Summary: Fix glow of complimentary copy link in CTA section

## Problem
In `src/styles/eclat.css`, the `.cta__complimentary` container element (a block `<div>`) had `padding: 10px 14px`, `border-radius: 14px`, and `animation: ctaBarFlash 2.6s ease-in-out infinite`. During the glow cycle, `ctaBarFlash` gave the full-width block container a reddish-brown background and a heavy `28px` blur box-shadow, creating an unsightly, oversized rectangular brown glow bar across the dark diagonal-pinstripe background of the closing CTA section.

## Solution
1. **Container Cleanup**: Removed `padding`, `border-radius`, and `animation: ctaBarFlash` from `.cta__complimentary`, restoring it as a clean positioning wrapper (`margin: 0 auto 34px`).
2. **Keyframe Removal**: Removed `@keyframes ctaBarFlash`.
3. **Pill Glow Refinement**: Refined `@keyframes ctaLinkGlow` on the pill button `.cta__complimentary-link` using a dual-layered `box-shadow` (`0 0 16px 3px ...`, `0 0 32px 6px ...`) with `--accent-lit` border pulsation so the glow conforms tightly and elegantly to the pill contour.
4. **Accessibility**: Updated `@media (prefers-reduced-motion: reduce)` to disable animations on `.hero__btn-complimentary` and `.cta__complimentary-link`.

## Verification
- Verified in browser via visual screenshot inspection: the wide rectangular muddy glow block is completely gone and the pill button glows smoothly with clean luxury aesthetics.
- Verified build: `npm run build` completed with 0 errors across 24 routes and 0 leaked secrets.
