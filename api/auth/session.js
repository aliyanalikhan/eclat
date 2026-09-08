/**
 * GET /api/auth/session — returns the current signed-in user (or null) from
 * the session cookie. Vercel Node.js Function using the Web Handler
 * signature.
 *
 * Reads the `session` cookie, hashes it, and looks up a matching, unexpired
 * sessions row (AUTH-04). A missing cookie returns { user: null } rather
 * than throwing (empty-input case). The expiry check uses a strict `>`
 * comparison — a session exactly at its expiry boundary is never treated as
 * still-valid (adjacency case). On a hit, only that one session row's
 * expires_at is bumped (D-10 sliding window) — this never touches any other
 * session row for the same user, so concurrent multi-device sessions
 * (D-11) stay independently valid (ordering case).
 *
 * Never includes a subscription/entitlement field in the response — this
 * phase's session proves identity only (D-02, prohibition P3).
 */
import { sql } from '../../lib/db.js'
import { hashToken, parseCookies } from '../../lib/session.js'

export default {
  async fetch(request) {
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
      // Fail closed on a DB error, matching this endpoint's own documented
      // contract (see header comment) rather than letting the exception
      // escape unhandled (WR-02).
      return Response.json({ user: null })
    }

    const { name, email, picture } = rows[0]
    return Response.json({ user: { name, email, picture } })
  },
}
