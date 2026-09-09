/**
 * GET /api/billing/status — authenticated, per-product subscription-state
 * read. Vercel Node.js Function using the Web Handler signature, mirrors
 * api/auth/session.js's fail-closed cookie->hash->DB-lookup shape.
 *
 * Unlike api/auth/session.js (which deliberately never includes an
 * entitlement field — identity and entitlement are kept structurally
 * separate, Phase 2 D-02/prohibition P3), this endpoint exists specifically
 * to expose the caller's own real, server-verified subscription state: it
 * backs both the /subscribe picker's "Subscribed"/"Subscribe" per-product
 * render (D-04) and the /subscribe/success polling UI (D-06/D-07 — the
 * Checkout success redirect alone never grants access, only a
 * webhook-synced subscriptions row does). It never exposes raw Stripe IDs
 * or tokens, only Stripe's own status value verbatim plus current_period_end.
 */
import { sql } from '../../lib/db.js'
import { isProductKey, PRODUCTS } from '../../lib/products.js'
import { hashToken, parseCookies } from '../../lib/session.js'

const PRODUCT_ID_TO_KEY = Object.fromEntries(
  Object.entries(PRODUCTS).map(([key, { productId }]) => [productId, key]),
)

export default {
  async fetch(request) {
    const cookies = parseCookies(request.headers.get('cookie'))
    const raw = cookies.session
    if (!raw) {
      return Response.json({ subscriptions: {} }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
    }

    const hash = hashToken(raw)
    try {
      const { rows: userRows } = await sql`
        SELECT u.id FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ${hash} AND s.expires_at > now()
      `
      if (!userRows.length) {
        return Response.json({ subscriptions: {} }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
      }

      const { rows } = await sql`
        SELECT stripe_product_id, status, current_period_end
        FROM subscriptions WHERE user_id = ${userRows[0].id}
      `

      const subscriptions = {}
      for (const row of rows) {
        const key = PRODUCT_ID_TO_KEY[row.stripe_product_id]
        if (!key || !isProductKey(key)) continue
        subscriptions[key] = {
          status: row.status,
          current_period_end: row.current_period_end,
        }
      }

      return Response.json({ subscriptions }, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      // Fail closed on a DB error (WR-02 precedent) — never let the
      // exception escape unhandled.
      return Response.json({ subscriptions: {} }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
    }
  },
}
