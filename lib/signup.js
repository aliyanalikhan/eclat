/**
 * SERVER-ONLY email-list logic: validation, country detection, the welcome
 * email and the owner notification. Deliberately does not import db.js — the
 * caller passes `sql`, so scripts/test-signup.js can fake it and Resend.
 */
export const HOME_COUNTRY = 'US'
const BRAND = 'Éclat'
const TAGLINE = 'Where remarkable stories come to light.'
const SITE_URL = 'https://www.eclat.lifestyle'
const TIMEOUT_MS = 8000

/** @returns {string|null} the normalised address, or null if invalid. */
export function normalizeEmail(value) {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[a-z0-9-]{2,}$/.test(email)
    ? email
    : null
}

/** @returns {string|null} two-letter country code, or null for unknown. */
export function detectCountry(headers) {
  const code = (headers.get('x-vercel-ip-country') || '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) && code !== 'XX' ? code : null
}

export function giftLinks(value) {
  return (value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((link) => (/^https?:\/\//i.test(link) ? link : `https://${link}`))
    .filter((link) => URL.canParse(link))
}

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// Colours mirror the :root tokens in src/styles/eclat.css (accent converted from oklch).
const SERIF = "'Bodoni Moda', Georgia, 'Times New Roman', serif"
const SANS = "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"

export function welcomeEmail(links = []) {
  const headline = 'Welcome. Come belong.'
  const intro = `Thank you for joining ${BRAND}. We celebrate the visionaries, leaders, creators and changemakers whose stories deserve to be told, and we are glad to share them with you.`
  const giftIntro = links.length > 1 ? 'Your gifts are below' : 'Your gift is below'
  const unsubscribe = `You are receiving this because you joined the ${BRAND} email list. To unsubscribe, reply to this email with the word "unsubscribe".`
  const publisher = 'Éclat lifestyle LLC, Minnesota, USA'
  const label = (i) => (links.length > 1 ? `Gift ${i + 1}` : 'Your gift')

  const button = (href, text) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td bgcolor="#16130f" style="border-radius:999px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:15px 32px;font-family:${SANS};font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#f7f3ec;text-decoration:none;">${text}</a></td></tr></table>`

  const cards = links
    .map(
      (link, i) =>
        `<tr><td style="padding:0 32px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffdf8;border:1px solid #e2dbcf;border-radius:4px;"><tr><td align="center" style="padding:28px 20px;"><p style="margin:0 0 18px;font-family:${SERIF};font-size:22px;color:#16130f;">${label(i)}</p>${button(link, 'Open your gift')}</td></tr></table></td></tr>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to ${BRAND}</title>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&family=Archivo:wght@400;500&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#f7f3ec;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f3ec;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fbf8f2;border:1px solid #e2dbcf;">
<tr><td align="center" bgcolor="#16130f" style="padding:36px 24px;">
<a href="${SITE_URL}" style="font-family:${SERIF};font-size:30px;letter-spacing:7px;color:#f7f3ec;text-decoration:none;">ÉCLAT</a>
<p style="margin:10px 0 0;font-family:${SERIF};font-style:italic;font-size:15px;color:#cfc6b8;">${TAGLINE}</p>
</td></tr>
<tr><td align="center" style="padding:40px 32px 28px;">
<h1 style="margin:0 0 16px;font-family:${SERIF};font-weight:400;font-size:36px;line-height:1.15;color:#16130f;">${headline}</h1>
<p style="margin:0;font-family:${SANS};font-size:16px;line-height:1.65;color:#3a352e;">${intro}</p>
${links.length ? `<p style="margin:24px 0 0;font-family:${SANS};font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:#b75131;">${giftIntro}</p>` : ''}
</td></tr>
${cards || `<tr><td style="padding:0 32px 16px;">${button(SITE_URL, `Visit ${BRAND}`)}</td></tr>`}
<tr><td align="center" style="padding:20px 32px 36px;font-family:${SERIF};font-size:18px;line-height:1.6;color:#16130f;">With warmth,<br>The ${BRAND} team</td></tr>
<tr><td align="center" style="padding:20px 32px;border-top:1px solid #e2dbcf;font-family:${SANS};font-size:12px;line-height:1.6;color:#6f665b;">${unsubscribe}<br>${publisher}</td></tr>
</table></td></tr></table>
</body></html>`

  const text = [
    `ÉCLAT\n${TAGLINE}`,
    headline,
    intro,
    ...(links.length ? [`${giftIntro}:`, ...links.map((link, i) => `${label(i)}: ${link}`)] : [SITE_URL]),
    `With warmth,\nThe ${BRAND} team`,
    `${unsubscribe}\n${publisher}`,
  ].join('\n\n')

  return { subject: `Welcome to ${BRAND}`, html, text }
}

/** @returns {Promise<string|null>} null on success, otherwise the exact failure reason. */
async function sendEmail(message, { fetch, env }) {
  const missing = ['RESEND_API_KEY', 'SIGNUP_FROM'].filter((name) => !env[name])
  if (missing.length) return `missing setting: ${missing.join(', ')}`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.SIGNUP_FROM,
        reply_to: env.SIGNUP_NOTIFY_TO || undefined,
        ...message,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (res.ok) return null
    return `Resend ${res.status}: ${(await res.text()).slice(0, 500)}`
  } catch (err) {
    return `Resend request failed: ${err.name}: ${err.message}`
  }
}

/** @returns {Promise<string|null>} null once sent, otherwise why it wasn't. */
async function sendWelcome(email, country, deps) {
  const { sql, env } = deps
  let links = []
  const noGift = env.GIFT_URL?.trim().toLowerCase() === 'none'
  // Unknown country counts as outside the home country.
  if (country !== HOME_COUNTRY && !noGift) {
    links = giftLinks(env.GIFT_URL)
    if (!links.length) {
      return env.GIFT_URL ? 'GIFT_URL has no usable link' : 'missing setting: GIFT_URL'
    }
  }

  // Claim before sending so two concurrent requests cannot both send.
  // shortcut: a function killed mid-send leaves the row marked sent; add a
  // separate claim column if that ever shows up.
  const { rows } = await sql`
    UPDATE signups SET welcome_sent_at = now()
    WHERE email = ${email} AND welcome_sent_at IS NULL
    RETURNING email
  `
  if (!rows.length) return 'already sent or being sent by another request'

  const headers = env.SIGNUP_NOTIFY_TO
    ? { 'List-Unsubscribe': `<mailto:${env.SIGNUP_NOTIFY_TO}?subject=unsubscribe>` }
    : undefined
  const reason = await sendEmail({ to: [email], headers, ...welcomeEmail(links) }, deps)
  if (reason) await sql`UPDATE signups SET welcome_sent_at = NULL WHERE email = ${email}`
  return reason
}

/**
 * Saves the address, sends the welcome email if still owed, and tells the owner
 * about new addresses. Throws only if the address could not be saved.
 */
export async function signup({ email, country, method }, { sql, fetch = globalThis.fetch, env = process.env }) {
  const deps = { sql, fetch, env }
  const inserted = await sql`
    INSERT INTO signups (email, country) VALUES (${email}, ${country})
    ON CONFLICT (email) DO NOTHING
    RETURNING country, welcome_sent_at
  `
  let row = inserted.rows[0]
  const isNew = Boolean(row)
  if (!row) {
    const existing = await sql`
      UPDATE signups SET country = COALESCE(country, ${country}) WHERE email = ${email}
      RETURNING country, welcome_sent_at
    `
    row = existing.rows[0]
  }

  let reason = null
  if (!row.welcome_sent_at) {
    try {
      reason = await sendWelcome(email, row.country, deps)
    } catch (err) {
      reason = `database error: ${err.message}`
    }
    if (reason) console.warn(`signup: welcome email not sent: ${reason}`)
  }

  if (isNew) {
    const problem = env.SIGNUP_NOTIFY_TO
      ? await sendEmail(
          {
            to: [env.SIGNUP_NOTIFY_TO],
            subject: `New ${BRAND} signup: ${email}`,
            text: [
              `Email: ${email}`,
              `Country: ${row.country || 'unknown'}`,
              `Signup method: ${method}`,
              `Reader's email sent: ${reason ? 'no' : 'yes'}`,
              ...(reason ? [`Reason: ${reason}`] : []),
            ].join('\n'),
          },
          deps,
        )
      : 'missing setting: SIGNUP_NOTIFY_TO'
    if (problem) console.warn(`signup: owner notification not sent: ${problem}`)
  }

  return { isNew, reason }
}
