/**
 * GET /api/billing/checkout — server-initiated Stripe Checkout redirect
 * (D-03). Vercel Node.js Function using the Web Handler signature, mirrors
 * api/auth/google.js's redirect shape.
 *
 * Flow: require a valid session (fail closed -> 302 to Google sign-in),
 * resolve `product` through the server-side allowlist (lib/products.js —
 * never trust a client-supplied Stripe price ID, RESEARCH.md Pattern 1),
 * re-check the user doesn't already hold an active/trialing/past_due
 * subscription for that product (D-04 — the /subscribe picker's rendered
 * state is a UX hint only, never a security boundary), then create a real
 * Stripe Checkout Session and 302 the browser directly to it.
 *
 * D-02 branch B: each product has two real prices (monthly + annual) —
 * `interval` selects which one; defaults to monthly if omitted/invalid.
 */
import { sql } from '../../lib/db.js'
import { getProduct, isProductKey } from '../../lib/products.js'
import { hashToken, parseCookies } from '../../lib/session.js'
import { stripe } from '../../lib/stripe.js'

// Belt-and-suspenders open-redirect discipline (mirrors
// api/auth/google/callback.js's redirectWithError): every internal redirect
// target is reconstructed via `new URL(path, request.url)` and only its
// pathname+search is ever placed in the Location header — never a raw
// string, never an absolute cross-origin URL.
function redirectTo(path, request) {
  const location = new URL(path, request.url)
  const headers = new Headers()
  headers.set('Location', location.pathname + location.search)
  return new Response(null, { status: 302, headers })
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const key = url.searchParams.get('product')

    if (!isProductKey(key)) {
      return new Response('Unknown product', { status: 400 })
    }
    const product = getProduct(key)

    const cookies = parseCookies(request.headers.get('cookie'))
    const raw = cookies.session
    if (!raw) {
      return redirectTo('/api/auth/google?return_to=/subscribe', request)
    }

    const hash = hashToken(raw)
    let user
    try {
      const { rows } = await sql`
        SELECT u.id, u.stripe_customer_id FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ${hash} AND s.expires_at > now()
      `
      if (!rows.length) {
        return redirectTo('/api/auth/google?return_to=/subscribe', request)
      }
      user = rows[0]

      // D-04 server-side re-check: never create a duplicate Checkout Session
      // for a product the user already actively holds — the picker's
      // rendered "Subscribed" state is a UX hint only, not a security
      // boundary.
      const { rows: existing } = await sql`
        SELECT 1 FROM subscriptions
        WHERE user_id = ${user.id} AND stripe_product_id = ${product.productId}
          AND status IN ('active', 'trialing', 'past_due')
      `
      if (existing.length) {
        return redirectTo('/subscribe', request)
      }
    } catch {
      // Fail closed on a DB error — never proceed to create a real Checkout
      // Session without having verified session + already-subscribed state.
      return redirectTo('/subscribe', request)
    }

    const intervalParam = url.searchParams.get('interval')
    const interval = intervalParam === 'annual' ? 'annual' : 'monthly'
    const priceId = product.prices[interval]

    const origin = new URL(request.url).origin
    const successUrl = `${origin}/subscribe/success?product=${key}`
    const cancelUrl = `${origin}/subscribe`

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        customer: user.stripe_customer_id || undefined,
        client_reference_id: String(user.id),
        subscription_data: { metadata: { userId: String(user.id) } },
        success_url: successUrl,
        cancel_url: cancelUrl,
      })

      const headers = new Headers()
      headers.set('Location', session.url)
      return new Response(null, { status: 302, headers })
    } catch {
      // Never leak the Stripe error to the client — fail closed back to the
      // picker.
      return redirectTo('/subscribe', request)
    }
  },
}
