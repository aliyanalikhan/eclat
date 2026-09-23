#!/usr/bin/env node

/**
 * Multi-Viewport Automated Verification Suite for Phase 10:
 * Interactive Overlays & Global Chrome Refinement (OVERLAY-01, OVERLAY-02, OVERLAY-03)
 */

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

console.log('🧪 Starting Phase 10 Overlays & Chrome Verification...\n')

// 1. Check MagazinePreview.jsx
console.log('1. Checking Magazine Preview Modal (OVERLAY-01):')
const magPreviewSrc = fs.readFileSync(path.join(root, 'src/components/MagazinePreview.jsx'), 'utf8')
assert(/onTouchStart=\{handleTouchStart\}/.test(magPreviewSrc), 'MagazinePreview attaches onTouchStart touch handler')
assert(/onTouchEnd=\{handleTouchEnd\}/.test(magPreviewSrc), 'MagazinePreview attaches onTouchEnd touch handler')
assert(/toPreload\.forEach/.test(magPreviewSrc) && /new Image\(\)/.test(magPreviewSrc), 'MagazinePreview preloads adjacent pages in background')
assert(/slideDir/.test(magPreviewSrc) && /is-sliding-forward/.test(magPreviewSrc), 'MagazinePreview manages directional slide transitions')

// 2. Check Lightbox.jsx & Video Modal (OVERLAY-02)
console.log('\n2. Checking Lightbox & Video Modal (OVERLAY-02):')
const lightboxSrc = fs.readFileSync(path.join(root, 'src/components/Lightbox.jsx'), 'utf8')
assert(/onTouchStart=\{handleTouchStart\}/.test(lightboxSrc) && /onTouchEnd=\{handleTouchEnd\}/.test(lightboxSrc), 'Lightbox attaches touch swipe handlers on frame')
assert(/deltaY > 60/.test(lightboxSrc) && /closeLightbox\(\)/.test(lightboxSrc), 'Lightbox triggers dismiss on downward touch swipe')

// 3. Check Header.jsx & Global Chrome (OVERLAY-03)
console.log('\n3. Checking Header Mobile Drawer (OVERLAY-03):')
const headerSrc = fs.readFileSync(path.join(root, 'src/components/Header.jsx'), 'utf8')
assert(/document\.body\.style\.overflow = 'hidden'/.test(headerSrc), 'Header locks body scroll while mobile drawer is open')
assert(/className="nav-backdrop"/.test(headerSrc), 'Header renders dimmed nav-backdrop overlay when mobile drawer is open')
assert(/onClick=\{.*?setOpen\(false\).*?\}/.test(headerSrc), 'Header nav-backdrop closes mobile drawer on tap')

// 4. Check CSS Rules in eclat.css
console.log('\n4. Checking Overlay & Chrome CSS Rules in eclat.css:')
const css = fs.readFileSync(path.join(root, 'src/styles/eclat.css'), 'utf8')

// Modal Scroll-Lock & Safe Areas
assert(/overscroll-behavior:\s*contain/.test(css) && /touch-action:\s*none/.test(css), '.lightbox enforces overscroll-behavior: contain and touch-action: none')
assert(/\.lightbox__close\s*\{[^}]*top:\s*max\(20px,\s*env\(safe-area-inset-top\)\)/.test(css), '.lightbox__close respects env(safe-area-inset-top)')
assert(/\.lightbox__close\s*\{[^}]*right:\s*max\(22px,\s*env\(safe-area-inset-right\)\)/.test(css), '.lightbox__close respects env(safe-area-inset-right)')
assert(/\.video-modal__frame\s*\{[^}]*aspect-ratio:\s*16\/9/.test(css), '.video-modal__frame enforces 16/9 aspect ratio')

// Flip Keyframes & Floating Nav
assert(/@keyframes\s+flipSlideInRight/.test(css) && /@keyframes\s+flipSlideInLeft/.test(css), 'Directional flipSlideInRight and flipSlideInLeft keyframes defined')
assert(/\.magazine-preview__nav\s*\{[^}]*bottom:\s*max\(16px,\s*env\(safe-area-inset-bottom\)\)/.test(css), '.magazine-preview__nav floats with safe-area bottom padding')
assert(/\.magazine-preview__img\s*\{[^}]*max-height:\s*calc\(100svh - 96px\)/.test(css), '.magazine-preview__img scales to calc(100svh - 96px) on mobile/tablet')

// Nav Backdrop & Drawer Animation
assert(/\.nav-backdrop\s*\{[^}]*backdrop-filter:\s*blur\(4px\)/.test(css), '.nav-backdrop applies frosted glass backdrop-filter')
assert(/\.nav\s*\{[^}]*transform:\s*translateY\(-8px\)/.test(css) && /\.nav\.is-open\s*\{[^}]*transform:\s*translateY\(0\)/.test(css), '.nav applies smooth slide-down translateY transition')

// Footer 2-Column Mobile Reflow & Safe Areas
assert(/\.footer__nav\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css), 'Mobile footer reflows links into 2-column grid')
assert(/\.footer__nav\s+\.link-quiet\s*\{[^}]*min-height:\s*44px/.test(css), 'Footer links enforce 44px minimum tap target height')
assert(/\.footer\s*\{[^}]*padding-bottom:\s*max\(.*?env\(safe-area-inset-bottom\)\)/.test(css), 'Footer includes safe-area bottom padding')

console.log(`\nVerification finished: ${passed} passed, ${failed} failed.`)

if (failed > 0) {
  console.error('❌ Some Phase 10 verification checks failed!')
  process.exit(1)
} else {
  console.log('🎉 All Phase 10 overlay and global chrome verification checks passed cleanly!\n')
  process.exit(0)
}
