/**
 * Verification harness for the hero fan. Drives a real Chrome over CDP so the
 * rAF loop runs normally (--screenshot alone can't scroll, and virtual time
 * starves the loop). Reports card geometry and title opacity at rest and at the
 * end of the fan's travel, and writes a screenshot of each.
 */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9333
const W = +(process.env.VW || 1526)
const H = +(process.env.VH || 877)
const URL = 'http://localhost:4173/'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--window-size=${W},${H}`,
  '--hide-scrollbars',
  '--disable-gpu',
  '--no-first-run',
  '--no-sandbox',
  '--user-data-dir=/tmp/eclat-cdp-profile',
  'about:blank',
])
chrome.stderr.on('data', () => {})

let ws
for (let i = 0; i < 40; i++) {
  await sleep(300)
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
    const tabs = await res.json()
    const page = tabs.find((t) => t.type === 'page')
    if (page?.webSocketDebuggerUrl) {
      ws = new WebSocket(page.webSocketDebuggerUrl)
      break
    }
  } catch {}
}
if (!ws) {
  console.error('could not reach chrome')
  chrome.kill()
  process.exit(1)
}

await new Promise((r) => (ws.onopen = r))

let id = 0
const pending = new Map()
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result)
    pending.delete(msg.id)
  }
}
const send = (method, params = {}) =>
  new Promise((res) => {
    const n = ++id
    pending.set(n, res)
    ws.send(JSON.stringify({ id: n, method, params }))
  })

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  })
  return r?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
if (process.env.REDUCED) {
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
}
await send('Page.navigate', { url: URL })
await sleep(3500) // let fonts settle and the rAF loop run

const PROBE = `(() => {
  const hero = document.querySelector('[data-hero]');
  const hr = hero.getBoundingClientRect();
  const cards = [...document.querySelectorAll('[data-fan]')].map(el => {
    const r = el.getBoundingClientRect();
    const t = el.querySelector('[data-fan-title]');
    const title = el.querySelector('.cover__title');
    return {
      title: (title?.textContent || '').trim(),
      left: Math.round(r.left), right: Math.round(r.right),
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      w: Math.round(r.width), h: Math.round(r.height),
      veiled: !!t,
      opacity: t ? +getComputedStyle(t).opacity : 1,
    };
  }).sort((a,b) => a.left - b.left);
  const scrollCue = document.querySelector('.hero__scroll');
  const sr = scrollCue.getBoundingClientRect();
  return {
    scrollY: Math.round(window.scrollY),
    vh: window.innerHeight,
    heroTop: Math.round(hr.top), heroBottom: Math.round(hr.bottom),
    heroH: Math.round(hero.clientHeight),
    cards,
    lowestCardBottom: Math.max(...cards.map(c => c.bottom)),
    highestCardTop: Math.min(...cards.map(c => c.top)),
    scrollCue: { top: Math.round(sr.top), bottom: Math.round(sr.bottom), opacity: +getComputedStyle(scrollCue).opacity },
  };
})()`

const shot = async (file) => {
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(file, Buffer.from(r.data, 'base64'))
}

const report = (label, d) => {
  console.log(`\n=== ${label}  (scrollY=${d.scrollY}, viewport=${d.vh}px) ===`)
  console.log(`hero: top=${d.heroTop} bottom=${d.heroBottom} height=${d.heroH}`)
  const belowFold = d.lowestCardBottom - d.vh
  console.log(
    `cards: top=${d.highestCardTop} bottom=${d.lowestCardBottom}  ` +
      `pastHero=${d.lowestCardBottom - d.heroBottom > 0 ? `+${d.lowestCardBottom - d.heroBottom}px` : 'none'}  ` +
      `pastFold=${belowFold > 0 ? `+${belowFold}px BELOW FOLD` : 'none'}`,
  )
  console.log(
    `scroll cue: top=${d.scrollCue.top} opacity=${d.scrollCue.opacity.toFixed(2)}  ` +
      `collision=${d.lowestCardBottom > d.scrollCue.top && d.scrollCue.opacity > 0.05 ? 'YES' : 'no'}`,
  )
  console.log('  card              left  right   gap-to-next   title-opacity')
  d.cards.forEach((c, i) => {
    const next = d.cards[i + 1]
    const gap = next ? next.left - c.left : null
    console.log(
      `  ${c.title.replace(/\s+/g, ' ').padEnd(16)} ${String(c.left).padStart(5)} ${String(c.right).padStart(6)}` +
        `   ${gap === null ? '    —' : String(gap).padStart(5)}` +
        `        ${c.veiled ? c.opacity.toFixed(3) : '(lead)'}`,
    )
  })
}

// --- at rest ---
const rest = await evaluate(PROBE)
report('AT REST', rest)
await shot('./hero-rest.png')

// --- fully opened: scroll past the fan's travel ---
await evaluate(`window.scrollTo(0, Math.round(window.innerHeight * 0.62)); true`)
await sleep(1200)
const open = await evaluate(PROBE)
report('OPENED', open)
await shot('./hero-open.png')

ws.close()
chrome.kill()
