/**
 * SERVER-ONLY — must never be imported from anything under src/ or shipped
 * to the client bundle.
 *
 * Shared cookie->hashToken->sessions-JOIN-users lookup, extracted verbatim
 * from api/billing/status.js (RESEARCH A3/Q1). Resolves the caller's
 * identity only — never entitlement. Identity and entitlement are kept
 * structurally separate (Phase 2 D-02): callers that need entitlement must
 * run their own fresh `subscriptions` read after getting a session here.
 */
import { sql } from './db.js'
import { hashToken, parseCookies } from './session.js'

/**
 * @param {Request} request
 * @returns {Promise<{ user: { id: number } } | null>} null on no cookie,
 *   no matching/unexpired session row, or any DB error (fail-closed).
 */
export async function getSessionUser(request) {
  const cookies = parseCookies(request.headers.get('cookie'))
  const raw = cookies.session
  if (!raw) return null

  const hash = hashToken(raw)
  try {
    const { rows: userRows } = await sql`
      SELECT u.id FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ${hash} AND s.expires_at > now()
    `
    if (!userRows.length) return null
    return { user: { id: userRows[0].id } }
  } catch {
    // Fail closed on a DB error (WR-02 precedent) — never let the
    // exception escape unhandled, and never treat it as an authenticated
    // user.
    return null
  }
}
