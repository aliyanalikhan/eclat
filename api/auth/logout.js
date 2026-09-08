/**
 * POST /api/auth/logout — deletes the caller's session row from the database
 * and clears the session cookie. Vercel Node.js Function using the Web
 * Handler signature.
 *
 * Deletes the DB-side sessions row (AUTH-05), not merely the cookie — a
 * copy of the raw cookie captured before sign-out would otherwise still
 * authenticate against GET /api/auth/session (RESEARCH.md Pitfall 6).
 * Always clears the session cookie in the response, whether or not a
 * matching row existed.
 */
import { sql } from '../../lib/db.js'
import { cookieOptions, hashToken, parseCookies, serializeCookie } from '../../lib/session.js'

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response(null, { status: 405 })
    }

    const cookies = parseCookies(request.headers.get('cookie'))
    const raw = cookies.session

    if (raw) {
      const hash = hashToken(raw)
      await sql`DELETE FROM sessions WHERE token_hash = ${hash}`
    }

    const headers = new Headers()
    headers.append('Set-Cookie', serializeCookie('session', '', { ...cookieOptions(), maxAge: 0 }))
    return new Response(null, { status: 204, headers })
  },
}
