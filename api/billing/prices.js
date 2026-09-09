/**
 * GET /api/billing/prices — public, unauthenticated price-facts endpoint.
 * Vercel Node.js Function using the Web Handler signature, mirrors the
 * other api/billing/* routes' shape.
 *
 * This is the /subscribe picker's ONLY sanctioned price source (BILL-02):
 * it resolves the 4 product slugs through the server-side allowlist
 * (lib/products.js) and reads live Stripe price data via
 * stripe.prices.retrieve() for both the monthly and annual price of each
 * product (D-02 branch B, see lib/products.js). The response is reduced to
 * public display facts only — amount, currency, interval — and must NEVER
 * include a Stripe price ID or any other identifier that could let a
 * client bypass the allowlist enforced by api/billing/checkout.js.
 */
import { PRODUCTS } from '../../lib/products.js'
import { stripe } from '../../lib/stripe.js'

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return new Response('Not found', { status: 404 })
    }

    try {
      const products = {}
      for (const [key, product] of Object.entries(PRODUCTS)) {
        const [monthly, annual] = await Promise.all([
          stripe.prices.retrieve(product.prices.monthly),
          stripe.prices.retrieve(product.prices.annual),
        ])
        products[key] = {
          amount: monthly.unit_amount,
          currency: monthly.currency,
          interval: monthly.recurring?.interval === 'year' ? 'year' : 'month',
          intervals: {
            monthly: { amount: monthly.unit_amount, currency: monthly.currency },
            annual: { amount: annual.unit_amount, currency: annual.currency },
          },
        }
      }
      return Response.json({ products })
    } catch {
      // Fail closed on any Stripe/network error — never let the exception
      // escape unhandled, and never expose the underlying error detail to
      // the client (matches the other api/billing/* routes' discipline).
      // The picker's fetch-failure fallback (Task 2) treats an empty
      // products map the same as "still loading".
      return Response.json({ products: {} }, { status: 500 })
    }
  },
}
