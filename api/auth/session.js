/**
 * /api/auth/session — session management endpoint.
 *
 * GET  /api/auth/session — returns current signed-in user (or null)
 * POST /api/auth/session — signs out: deletes DB session row and clears cookie
 * (also handles /api/auth/logout via vercel.json rewrite)
 */
import { sql } from '../../lib/db.js'
import { cookieOptions, hashToken, parseCookies, serializeCookie } from '../../lib/session.js'

export default {
  async fetch(request) {
    // POST /api/auth/session (sign out)
    if (request.method === 'POST') {
      const cookies = parseCookies(request.headers.get('cookie'))
      const raw = cookies.session

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
    }

    if (request.method !== 'GET') {
      return new Response(null, { status: 405 })
    }

    // GET /api/auth/session (identity check)
    const cookies = parseCookies(request.headers.get('cookie'))
    const raw = cookies.session
    if (!raw) return Response.json({ user: null })

    const hash = hashToken(raw)
    let rows
    try {
      ;({ rows } = await sql`
        SELECT u.name, u.email, u.picture, s.id AS session_id
        FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ${hash} AND s.expires_at > now()
      `)
      if (!rows.length) return Response.json({ user: null })

      // Sliding window (D-10): bump only this session row's expiry — never
      // any other session row for the same user (multi-device isolation).
      await sql`UPDATE sessions SET expires_at = now() + interval '30 days' WHERE id = ${rows[0].session_id}`
    } catch {
      // Fail closed on a DB error
      return Response.json({ user: null })
    }

    const { name, email, picture } = rows[0]
    return Response.json({ user: { name, email, picture } })
  },
}
