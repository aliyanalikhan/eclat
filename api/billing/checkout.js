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

// WR-07: canonical, server-controlled public origin for the Stripe Checkout
// success/cancel URLs — never the incoming request's Host-derived origin (a
// crafted Host header could otherwise point a paying customer's post-payment
// redirect at an attacker-controlled URL). Fails fast at module load, like
// lib/stripe.js / lib/db.js / the WR-05 webhook guard, so a missing value is
// a loud cold-start error rather than a silently misconfigured Checkout
// Session.
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN
if (!PUBLIC_ORIGIN) {
  throw new Error(
    'PUBLIC_ORIGIN is not set. Set it to the canonical https origin of this deployment (see .env.example).',
  )
}

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

// WR-06: CSRF mitigation. Checkout initiation is a state-changing GET (it
// creates a real Stripe Checkout Session against the signed-in session's
// account) running on a SameSite=Lax cookie — which browsers DO attach to
// cross-site top-level GET navigations, so a plain cross-site link, <img> or
// <iframe> could otherwise force a fresh Checkout Session onto a victim's
// account. Accept only same-origin navigation or a direct address-bar entry
// (Sec-Fetch-Site: 'none'); when the header is absent (older browsers) fall
// back to the Referer origin matching PUBLIC_ORIGIN, and fail closed on any
// mismatch or missing signal.
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
    // WR-06: reject cross-site triggers before any session, DB or Stripe work.
    if (!isSameOriginNavigation(request)) {
      return new Response('Forbidden', { status: 403 })
    }

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

    const successUrl = `${PUBLIC_ORIGIN}/subscribe/success?product=${key}`
    const cancelUrl = `${PUBLIC_ORIGIN}/subscribe`

    try {
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          customer: user.stripe_customer_id || undefined,
          client_reference_id: String(user.id),
          subscription_data: { metadata: { userId: String(user.id) } },
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
        // WR-02: request-scoped idempotency key so a double-click, network
        // retry or two-tab resubmit of this GET never creates two distinct
        // Checkout Sessions for the same user/product/interval — two
        // completed sessions would mean two active subscriptions for the
        // same product, billed twice (the D-04 re-check above only closes
        // that window once the first session's webhook has landed).
        { idempotencyKey: `checkout:${user.id}:${key}:${interval}` },
      )

      const headers = new Headers()
      headers.set('Location', session.url)
      return new Response(null, { status: 302, headers })
    } catch {
      // Never leak the Stripe error to the client — fail closed back to the
      // picker, flagged so it can surface the prescribed error banner.
      return redirectTo('/subscribe?checkout_error=1', request)
    }
  },
}
