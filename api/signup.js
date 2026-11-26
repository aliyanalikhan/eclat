/**
 * POST /api/signup — public email-list form. JSON only: a cross-site HTML form
 * cannot send application/json without a CORS preflight, which is never granted.
 */
import { sql } from '../lib/db.js'
import { detectCountry, normalizeEmail, signup } from '../lib/signup.js'

const reply = (status, body) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export default {
  async fetch(request) {
    if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' })
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return reply(415, { error: 'Expected JSON.' })
    }
    const body = await request.json().catch(() => null)

    // Honeypot: people never see this field. Pretend success so bots learn nothing.
    if (body?.website) return reply(200, { ok: true })

    const email = normalizeEmail(body?.email)
    if (!email) return reply(400, { error: 'Please enter a valid email address.' })
    if (body.consent !== true) {
      return reply(400, { error: 'Please tick the box to agree to receive our emails.' })
    }

    try {
      await signup({ email, country: detectCountry(request.headers), method: 'signup form' }, { sql })
    } catch (err) {
      console.error(`signup: could not save: ${err.message}`)
      return reply(500, { error: 'Sorry, we couldn’t sign you up. Please try again.' })
    }
    // Same answer for new and existing addresses, so the list cannot be probed.
    return reply(200, { ok: true })
  },
}
