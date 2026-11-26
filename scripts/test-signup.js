/** Self-check for lib/signup.js with a faked database and Resend: `npm run test:signup`. */
import assert from 'node:assert/strict'
import { detectCountry, giftLinks, normalizeEmail, signup, welcomeEmail } from '../lib/signup.js'

console.warn = () => {}

// Validation
assert.equal(normalizeEmail('  Reader@Example.COM '), 'reader@example.com')
for (const bad of [undefined, 5, '', 'a@b', 'a b@c.com', 'a@@c.com', 'x<y>@c.com', `${'a'.repeat(250)}@c.com`]) {
  assert.equal(normalizeEmail(bad), null, String(bad))
}

// Country
const country = (value) => detectCountry(new Headers(value === undefined ? {} : { 'x-vercel-ip-country': value }))
assert.equal(country('us'), 'US')
assert.equal(country('NG'), 'NG')
for (const bad of [undefined, '', 'XX', 'USA']) assert.equal(country(bad), null)

// Email content
assert.deepEqual(giftLinks(' example.com/a  http://b.test/x '), ['https://example.com/a', 'http://b.test/x'])
assert.deepEqual(giftLinks(undefined), [])
const mail = welcomeEmail(giftLinks('a.test/?x=1&y="<z> b.test'))
assert.ok(mail.html.includes('&amp;y=&quot;&lt;z&gt;') && !mail.html.includes('<z>'))
assert.equal(mail.html.match(/>Open your gift</g).length, 2)
for (const part of [mail.html, mail.text]) {
  assert.ok(part.includes('ÉCLAT') && part.includes('unsubscribe') && part.includes('With warmth'))
}
assert.ok(mail.text.includes('https://b.test'))
assert.ok(!welcomeEmail([]).html.includes('Open your gift'))

// Flows: an in-memory stand-in for the four queries and a scripted Resend.
function fakes({ resend = () => new Response('{}'), env = {}, failClaim = false } = {}) {
  const table = new Map()
  const sent = []
  const sql = async (strings, ...v) => {
    const q = strings.join('?').trim()
    if (q.startsWith('INSERT')) {
      if (table.has(v[0])) return { rows: [] }
      table.set(v[0], { country: v[1], welcome_sent_at: null })
      return { rows: [{ ...table.get(v[0]) }] }
    }
    if (q.includes('COALESCE')) {
      const row = table.get(v[1])
      row.country ??= v[0]
      return { rows: [{ ...row }] }
    }
    const row = table.get(v[0])
    if (q.includes('= now()')) {
      if (failClaim) throw new Error('db down')
      if (row.welcome_sent_at) return { rows: [] }
      row.welcome_sent_at = new Date()
      return { rows: [{ email: v[0] }] }
    }
    row.welcome_sent_at = null
    return { rows: [] }
  }
  const fetch = async (_url, init) => {
    const body = JSON.parse(init.body)
    assert.ok(init.signal, 'request has a timeout')
    sent.push(body)
    return resend(body)
  }
  const deps = {
    sql,
    fetch,
    env: { RESEND_API_KEY: 'k', SIGNUP_FROM: 'B <h@x.test>', SIGNUP_NOTIFY_TO: 'o@x.test', ...env },
  }
  const run = (c = 'US') => signup({ email: 'r@x.test', country: c, method: 'signup form' }, deps)
  const to = (address) => sent.filter((m) => m.to[0] === address)
  return { table, sent, deps, run, reader: () => to('r@x.test'), owner: () => to('o@x.test') }
}

// Home reader: welcome once, owner told once, reply-to is the owner.
let f = fakes({ env: { GIFT_URL: 'gift.test' } })
await f.run()
await f.run()
assert.equal(f.reader().length, 1)
assert.equal(f.owner().length, 1)
assert.equal(f.reader()[0].reply_to, 'o@x.test')
assert.ok(!f.reader()[0].html.includes('gift.test'))
assert.match(f.owner()[0].text, /Country: US\nSignup method: signup form\nReader's email sent: yes/)

// Abroad and unknown get the gift.
for (const c of ['NG', null]) {
  f = fakes({ env: { GIFT_URL: 'gift.test' } })
  await f.run(c)
  assert.ok(f.reader()[0].html.includes('https://gift.test'))
}

// Abroad without GIFT_URL: nothing to the reader, exact reason, sent on a later attempt.
f = fakes()
await f.run('NG')
assert.equal(f.reader().length, 0)
assert.match(f.owner()[0].text, /sent: no\nReason: missing setting: GIFT_URL/)
f.deps.env.GIFT_URL = 'gift.test'
await f.run('US') // the stored country (NG) wins over the retry's
assert.ok(f.reader()[0].html.includes('https://gift.test'))
assert.equal(f.owner().length, 1)

// Gift "none": everyone gets the plain welcome.
f = fakes({ env: { GIFT_URL: 'none' } })
await f.run('NG')
assert.ok(!f.reader()[0].html.includes('Open your gift'))

// Resend rejects the reader: status and text reported, then retried.
let down = true
f = fakes({
  resend: (m) =>
    down && m.to[0] === 'r@x.test' ? new Response('domain is not verified', { status: 403 }) : new Response('{}'),
})
await f.run()
assert.match(f.owner()[0].text, /Reason: Resend 403: domain is not verified/)
assert.equal(f.table.get('r@x.test').welcome_sent_at, null)
down = false
await f.run()
assert.ok(f.table.get('r@x.test').welcome_sent_at)

// Timeout / network error.
f = fakes({ resend: () => Promise.reject(new DOMException('timed out', 'TimeoutError')) })
assert.match((await f.run()).reason, /Resend request failed: TimeoutError: timed out/)
assert.equal(f.table.get('r@x.test').welcome_sent_at, null)

// Missing settings: saved, nothing sent.
f = fakes({ env: { RESEND_API_KEY: '', SIGNUP_FROM: '' } })
assert.equal((await f.run()).reason, 'missing setting: RESEND_API_KEY, SIGNUP_FROM')
assert.equal(f.sent.length, 0)
assert.ok(f.table.has('r@x.test'))

// Database failure after saving still notifies the owner.
f = fakes({ failClaim: true })
await f.run()
assert.match(f.owner()[0].text, /Reason: database error: db down/)

// Concurrent requests send one welcome.
f = fakes()
await Promise.all([f.run(), f.run()])
assert.equal(f.reader().length, 1)

console.log('test-signup: all checks passed')
