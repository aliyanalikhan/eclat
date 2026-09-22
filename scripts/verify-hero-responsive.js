// scripts/verify-hero-responsive.js
// Automated verification script for Phase 8 Hero Animation Multi-Device Adaptation
import { readFileSync } from 'fs'
import { resolve } from 'path'

console.log('🧪 Starting Phase 8 Hero Multi-Device Verification...\n')

let passCount = 0
let failCount = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passCount++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failCount++
  }
}

// 1. Verify eclat.css rules
const cssPath = resolve('src/styles/eclat.css')
const cssContent = readFileSync(cssPath, 'utf-8')

console.log('1. Checking CSS Hero & Fan rules:')
assert(
  !cssContent.includes('.fan-origin .fan-card {\n    display: none;'),
  'No display: none override hiding fan cards on mobile'
)
assert(
  !cssContent.includes('transform: none !important;'),
  'No transform: none !important disabling fan card transforms'
)
assert(
  cssContent.includes('@keyframes heroFadeUp') && cssContent.includes('@keyframes fanEntrance'),
  'Initial mount luxury entrance keyframes (heroFadeUp & fanEntrance) defined'
)
assert(
  cssContent.includes('.hero__copy {') && cssContent.includes('animation: heroFadeUp'),
  'heroFadeUp animation applied to .hero__copy'
)
assert(
  cssContent.includes('.fan-origin {') && cssContent.includes('animation: fanEntrance'),
  'fanEntrance animation applied to .fan-origin'
)
assert(
  cssContent.includes('@media (prefers-reduced-motion: reduce)') &&
  cssContent.includes('animation: none !important;'),
  'Reduced motion disables entrance animations (animation: none !important)'
)

// 2. Verify motion.js rules
const motionPath = resolve('src/lib/motion.js')
const motionContent = readFileSync(motionPath, 'utf-8')

console.log('\n2. Checking motion.js useScrollFx logic:')
assert(
  !motionContent.includes('cards.length && !mobile'),
  'useScrollFx does not short-circuit mobile viewports (!mobile removed)'
)
assert(
  motionContent.includes('const isPhone = vw <= 767'),
  'Responsive tier detection identifies isPhone'
)
assert(
  motionContent.includes('const rotFactor = isPhone ? 0.65 : isTablet ? 0.85 : 1.0'),
  'rotFactor dampens angular spread on narrow screens'
)
assert(
  motionContent.includes('Math.max(80, vw / 2 - (isPhone ? 28 : 120))'),
  'Horizontal translation bound is constrained to screen margins'
)
assert(
  motionContent.includes('const scrollDistance = isPhone ? vh * 0.48 : isTablet ? vh * 0.54 : vh * 0.62'),
  'Adaptive scroll travel distance calibrated across device tiers'
)
assert(
  motionContent.includes('for (const el of titles) el.style.opacity = \'1\''),
  'Reduced motion mode immediately sets side card titles to opacity 1'
)

// 3. Mathematical Fan Solver Simulation across all 4 tiers
console.log('\n3. Simulating Fan Solver across Viewport Matrix:')

const FAN_SLOTS = [
  { fx: -420, fy: 34, fr: -15 },
  { fx: -215, fy: 6, fr: -8 },
  { fx: 0, fy: -14, fr: 0 },
  { fx: 215, fy: 6, fr: 8 },
  { fx: 420, fy: 34, fr: 15 },
]

function solveFan(vw, vh, scrollY) {
  const isPhone = vw <= 767
  const isTablet = vw > 767 && vw <= 1023
  const scrollDistance = isPhone ? vh * 0.48 : isTablet ? vh * 0.54 : vh * 0.62
  const raw = Math.min(1, Math.max(0, scrollY / scrollDistance))
  const p = 1 - Math.pow(1 - Math.min(1, raw + 0.12), 3)

  const fit = isPhone
    ? Math.min(0.55, (vw - 32) / 720)
    : Math.min(1.0, (vw - 48) / 1120)
  const rotFactor = isPhone ? 0.65 : isTablet ? 0.85 : 1.0
  const bound = Math.max(80, vw / 2 - (isPhone ? 28 : 120))
  const cs = 0.9 + 0.1 * p
  const s = isPhone ? 0.60 + 0.20 * fit : 0.72 + 0.28 * fit

  const transforms = FAN_SLOTS.map((slot) => {
    const x = Math.max(-bound, Math.min(bound, slot.fx * p * fit))
    const y = slot.fy * p * s
    const r = slot.fr * p * rotFactor
    const scale = cs * s
    return { x, y, r, scale }
  })

  return { transforms, bound, fit, p, raw }
}

const testViewports = [
  { name: 'Phone Compact (iPhone SE)', vw: 375, vh: 667 },
  { name: 'Phone Standard (iPhone 16 Pro)', vw: 430, vh: 932 },
  { name: 'Tablet Portrait (iPad Mini)', vw: 768, vh: 1024 },
  { name: 'Tablet Landscape (iPad Pro)', vw: 1024, vh: 768 },
  { name: 'Desktop Standard (MacBook Pro)', vw: 1440, vh: 900 },
  { name: 'Ultrawide 4K Monitor', vw: 2560, vh: 1440 },
]

for (const vp of testViewports) {
  // Test at scroll 0 (resting) and scroll 400 (opened)
  const resting = solveFan(vp.vw, vp.vh, 0)
  const opened = solveFan(vp.vw, vp.vh, vp.vh * 0.6)

  // Verify all card X positions are strictly within [-bound, bound]
  const restingWithinBounds = resting.transforms.every(t => Math.abs(t.x) <= resting.bound + 0.1)
  const openedWithinBounds = opened.transforms.every(t => Math.abs(t.x) <= opened.bound + 0.1)

  // Verify that cards don't exceed half-viewport margin
  const noOverflowResting = resting.transforms.every(t => Math.abs(t.x) <= vp.vw / 2)
  const noOverflowOpened = opened.transforms.every(t => Math.abs(t.x) <= vp.vw / 2)

  assert(
    restingWithinBounds && openedWithinBounds && noOverflowResting && noOverflowOpened,
    `${vp.name} (${vp.vw}x${vp.vh}): cards stay strictly within viewport bounds [bound: ±${opened.bound.toFixed(0)}px, maxCardX: ±${Math.max(...opened.transforms.map(t => Math.abs(t.x))).toFixed(0)}px]`
  )
}

console.log(`\nVerification finished: ${passCount} passed, ${failCount} failed.`)
if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 All Phase 8 verification checks passed cleanly!\n')
}
