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

    const products = {}
    for (const [key, product] of Object.entries(PRODUCTS)) {
      try {
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
      } catch (err) {
        // WR-08: degrade per-product, never zero the whole catalog — a
        // single stale/archived price ID or transient Stripe blip omits
        // only the affected product, not the other three. Log server-side
        // only; never expose the underlying error detail to the client.
        console.error(`prices: failed to fetch prices for ${key}: ${err.message}`)
      }
    }
    return Response.json({ products })
  },
}
