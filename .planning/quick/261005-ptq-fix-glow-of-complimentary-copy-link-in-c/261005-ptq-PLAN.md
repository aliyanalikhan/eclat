---
phase: quick-261005-ptq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/styles/eclat.css
autonomous: true
requirements: [QUICK-261005-ptq]
must_haves:
  truths:
    - "The closing CTA's complimentary copy link pulses with a refined, soft glow conforming to its pill contour"
    - "No wide rectangular background or spread box-shadow exists on the .cta__complimentary container div"
    - "prefers-reduced-motion continues to disable glowing animations"
  artifacts:
    - path: "src/styles/eclat.css"
      provides: "Clean pill-only glowing animation without container block flash"
---

<objective>
Fix the glow in the closing CTA section so it emanates cleanly from the pill-shaped complimentary copy link button itself, eliminating the wide rectangular background and shadow flash on the `.cta__complimentary` container div.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Remove container bar flash and refine pill link glow</name>
  <files>src/styles/eclat.css</files>
  <action>
1. In `src/styles/eclat.css`, remove `padding`, `border-radius`, and `animation: ctaBarFlash` from `.cta__complimentary`.
2. Remove `@keyframes ctaBarFlash`.
3. Refine `@keyframes ctaLinkGlow` on `.cta__complimentary-link` to provide a subtle, dual-layer luxury copper-gold glow conforming to the pill contour.
4. Update `@media (prefers-reduced-motion: reduce)` to target `.hero__btn-complimentary` and `.cta__complimentary-link`.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>Closing CTA container no longer renders an oversized rectangular glow bar, and the pill link glows cleanly.</done>
</task>

</tasks>
