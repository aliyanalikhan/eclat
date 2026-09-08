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

    // WR-03 decision: sign-out always clears the browser's cookie — even if
    // the DB delete below fails — so the client stops presenting it. But a
    // failed delete means the sessions row is still live server-side (a
    // copy of the raw cookie captured before sign-out would still
    // authenticate, per this file's own header comment), so we deliberately
    // report a 5xx in that case rather than silently claiming success; the
    // client already surfaces this via signOutState === 'error'
    // (src/components/Header.jsx).
    let dbError = false
    if (raw) {
      const hash = hashToken(raw)
      try {
        await sql`DELETE FROM sessions WHERE token_hash = ${hash}`
      } catch {
        dbError = true
      }
    }

    const headers = new Headers()
    headers.append('Set-Cookie', serializeCookie('session', '', { ...cookieOptions(), maxAge: 0 }))
    return new Response(null, { status: dbError ? 500 : 204, headers })
  },
}
