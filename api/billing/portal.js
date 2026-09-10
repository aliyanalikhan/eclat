/**
 * POST /api/billing/portal — opens Stripe's hosted Customer Portal for the
 * signed-in user's OWN subscription(s). Vercel Node.js Function using the
 * Web Handler signature; the structural clone of api/billing/checkout.js
 * (WR-06/WR-07), serving the "Manage" and "Update payment method" CTAs on
 * the /account page (D-05..D-08).
 *
 * Security ordering (T6/T7) — every check runs BEFORE any session or Stripe
 * work:
 *   1. method guard (405) — POST-only, never a GET/<a href> path (WR-06)
 *   2. isSameOriginNavigation (403) — CSRF guard first
 *   3. session (401)
 *   4. body { action } enum validation (400) — client sends only the fixed
 *      action; never a user-id/customer-id (D-07/T7)
 *   5. own-customer scoping (404) — stripe_customer_id from the user's OWN
 *      subscriptions rows, LIMIT 1; never a foreign/absent customer
 *   6. stripe.billingPortal.sessions.create with return_url from the
 *      PUBLIC_ORIGIN constant ONLY (never request Host, WR-07/T4)
 *   7. 200 { url } — the only server-supplied navigation target on /account
 *
 * Every branch returns generic { error: 'unavailable' } with
 * Cache-Control: no-store (T9/IN-01) — no StripeError body ever crosses the
 * wire.
 */
import { sql } from '../../lib/db.js'
import { getSessionUser } from '../../lib/session-user.js'
import { stripe } from '../../lib/stripe.js'

// WR-07: canonical, server-controlled public origin for the portal's
// return_url — never the incoming request's Host-derived origin (a crafted
// Host header could otherwise point a paying customer's post-portal return
// at an attacker-controlled URL). Fails fast at module load, like
// lib/stripe.js / lib/db.js / the WR-05 webhook guard, so a missing value is
// a loud cold-start error rather than a silently misconfigured portal.
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN
if (!PUBLIC_ORIGIN) {
  throw new Error(
    'PUBLIC_ORIGIN is not set. Set it to the canonical https origin of this deployment (see .env.example).',
  )
}

// WR-06: CSRF mitigation, copied verbatim from api/billing/checkout.js.
// Portal initiation is a state-changing POST that creates a real Stripe
// billingPortal session against the signed-in session's account. Accept only
// same-origin navigation or a direct address-bar entry (Sec-Fetch-Site:
// 'none'); when the header is absent (older browsers) fall back to the
// Referer origin matching PUBLIC_ORIGIN, and fail closed on any mismatch or
// missing signal.
function isSameOriginNavigation(request) {
  const site = request.headers.get('sec-fetch-site')
  if (site === 'same-origin' || site === 'none') return true
  if (site === 'same-site' || site === 'cross-site') return false
  const referer = request.headers.get('referer')
  if (!referer) return false
  try {
    return new URL(referer).origin === PUBLIC_ORIGIN
  } catch {
    return false
  }
}

export default {
  async fetch(request) {
    // Every response branch reuses this const — portal sessions are
    // user-specific and must never sit in a shared cache (IN-01/T2).
    const noStore = { 'Cache-Control': 'no-store' }

    // 1. Method guard FIRST (T6) — this endpoint is POST-only.
    if (request.method !== 'POST') {
      return Response.json({ error: 'unavailable' }, { status: 405, headers: noStore })
    }

    // 2. CSRF guard before any session/DB/Stripe work (T6).
    if (!isSameOriginNavigation(request)) {
      return Response.json({ error: 'unavailable' }, { status: 403, headers: noStore })
    }

    // 3. Session gate (fail-closed).
    const session = await getSessionUser(request)
    if (!session) {
      return Response.json({ error: 'unavailable' }, { status: 401, headers: noStore })
    }

    // 4. Body { action } enum validation (D-08) — only the fixed action is
    // read; the client never supplies a user-id or customer-id (D-07/T7).
    let action
    try {
      const body = await request.json()
      action = body.action
    } catch {
      return Response.json({ error: 'unavailable' }, { status: 400, headers: noStore })
    }
    if (action !== 'manage' && action !== 'payment_method_update') {
      return Response.json({ error: 'unavailable' }, { status: 400, headers: noStore })
    }

    // 5-7. Own-customer scoping + portal session + response. Wrapped so any
    // failure (DB or Stripe) degrades to a generic 500 — the StripeError is
    // logged server-side only (T9).
    try {
      // 5. Own-customer scoping (D-07/T7): stripe_customer_id comes from the
      // user's OWN subscriptions rows, never the client.
      const { rows } = await sql`
        SELECT stripe_customer_id FROM subscriptions
        WHERE user_id = ${session.user.id} LIMIT 1
      `
      const customer = rows[0]?.stripe_customer_id
      if (!customer) {
        return Response.json({ error: 'unavailable' }, { status: 404, headers: noStore })
      }

      // 6. Portal session (D-05/D-06): return_url from PUBLIC_ORIGIN ONLY
      // (WR-07/T4); payment_method_update deep-links the portal's card-update
      // flow (D-08).
      const portal = await stripe.billingPortal.sessions.create({
        customer,
        return_url: `${PUBLIC_ORIGIN}/account`,
        ...(action === 'payment_method_update' ? { flow_data: { type: 'payment_method_update' } } : {}),
      })

      // 7. 200 { url } — the only navigation target Wave 2 may assign.
      return Response.json({ url: portal.url }, { status: 200, headers: noStore })
    } catch (error) {
      console.error('portal: failed to create billing portal session', error)
      return Response.json({ error: 'unavailable' }, { status: 500, headers: noStore })
    }
  },
}
