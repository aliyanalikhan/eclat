// scripts/verify-grids-responsive.js
// Automated verification script for Phase 9 Content Pages & Responsive Multi-Device Grids
import { readFileSync } from 'fs'
import { resolve } from 'path'

console.log('🧪 Starting Phase 9 Grids & Reading Pages Verification...\n')

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

// 1. Verify CSS Grid Rules
const cssPath = resolve('src/styles/eclat.css')
const cssContent = readFileSync(cssPath, 'utf-8')

console.log('1. Checking CSS Grid & Layout rules:')

// Desktop listing grids
assert(
  cssContent.includes('.grid-covers {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));'),
  'Desktop .grid-covers uses repeat(auto-fill, minmax(230px, 1fr))'
)
assert(
  cssContent.includes('.books-grid {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));'),
  'Desktop .books-grid uses 3 columns: repeat(3, minmax(0, 1fr))'
)

// Tablet reflow (1023px)
const tabletQuery = cssContent.slice(cssContent.indexOf('@media (max-width: 1023px)'), cssContent.indexOf('@media (max-width: 900px)'))
assert(
  tabletQuery.includes('.grid-covers {\n    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));'),
  'Tablet .grid-covers reflows to minmax(180px, 1fr) for 2/3 column layout'
)
assert(
  tabletQuery.includes('.books-grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));'),
  'Tablet .books-grid reflows to 2 columns'
)
assert(
  tabletQuery.includes('.ed-hero__grid {\n    grid-template-columns: minmax(0, 1fr);') &&
  tabletQuery.includes('text-align: center;'),
  'Tablet .ed-hero__grid reflows to single-column centered layout at canonical 1023px threshold'
)

// Phone reflow (767px)
assert(
  /\.grid-covers\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);\s*gap:\s*24px 14px;/m.test(cssContent),
  'Phone .grid-covers reflows to 2-column compact thumbnail grid'
)
assert(
  /\.books-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);/m.test(cssContent),
  'Phone .books-grid reflows to 1-column stacked layout'
)
assert(
  /\.writing\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);/m.test(cssContent),
  'Phone .writing reflows to 1-column stacked layout'
)

// 2. Verify Horizontal Strip Enhancements
console.log('\n2. Checking Horizontal Media Strips (.strip / .strip-wrap):')
assert(
  cssContent.includes('.strip-wrap {') &&
  cssContent.includes('-webkit-mask-image: linear-gradient(') &&
  cssContent.includes('mask-image: linear-gradient('),
  '.strip-wrap defines luxury gradient edge fade masks via mask-image'
)
assert(
  cssContent.includes('touch-action: pan-x;') &&
  cssContent.includes('scrollbar-width: none;') &&
  cssContent.includes('-webkit-overflow-scrolling: touch;'),
  '.strip configures native momentum touch-scrolling and hides scrollbars'
)
assert(
  cssContent.includes('@media (pointer: fine) {') &&
  cssContent.includes('cursor: grab;') &&
  cssContent.includes('cursor: grabbing;'),
  '.strip configures desktop grab/grabbing cursor feedback'
)

// 3. Verify Reading Measures
console.log('\n3. Checking Editorial Reading Measures & Container Shells:')
assert(
  cssContent.includes('.prose {\n  max-width: 68ch;\n  margin-inline: auto;'),
  '.prose enforces max-width: 68ch reading measure with auto centering'
)

// 4. Verify Route Component Wiring
console.log('\n4. Checking Route Component Wiring:')
const editionPath = resolve('src/routes/Edition.jsx')
const editionContent = readFileSync(editionPath, 'utf-8')
assert(
  editionContent.includes('<div className="strip-wrap">') &&
  editionContent.includes('<div className="strip" ref={stripRef}>'),
  'Edition.jsx wraps .strip inside .strip-wrap'
)

const writingPath = resolve('src/routes/Writing.jsx')
const writingContent = readFileSync(writingPath, 'utf-8')
assert(
  writingContent.includes('<main className="page page--narrow" id="main">'),
  'Writing.jsx uses page--narrow for optimal centered reading measure'
)

console.log(`\nVerification finished: ${passCount} passed, ${failCount} failed.`)
if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 All Phase 9 grid and reading page verification checks passed cleanly!\n')
}
