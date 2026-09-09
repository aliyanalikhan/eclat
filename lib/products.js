/**
 * Server-only product/price allowlist. SERVER-ONLY — this file must never be
 * imported from anything under src/ or shipped to the client bundle.
 *
 * Maps the 4 internal product slugs to their real Stripe product ID and
 * both of their real recurring Price IDs (monthly + annual). The client is
 * only ever allowed to pass one of these slugs (plus an 'monthly'|'annual'
 * interval) — never a raw Stripe product/price ID — so a forged value can
 * only ever select a real, server-owned price (RESEARCH.md Pattern 1).
 *
 * D-02 branch B: verified at execution time (2026-09-09) against the live
 * Stripe account via `stripe.prices.list({ product })` for each of the 4
 * products — every product has exactly 2 active recurring prices (monthly
 * and annual), not one fixed price. These IDs are real, fetched values —
 * never invented.
 */

export const PRODUCTS = Object.freeze({
  'eclat-online': Object.freeze({
    productId: 'prod_VAyHWfX8XdHh2z',
    prices: Object.freeze({
      monthly: 'price_1UAcKWPJb1GC1KXLQXdnjoIx',
      annual: 'price_1UAcLFPJb1GC1KXLASxWEXx9',
    }),
  }),
  'eclat-hardcopy': Object.freeze({
    productId: 'prod_VAyJTIfn7UVWi3',
    prices: Object.freeze({
      monthly: 'price_1UAcMuPJb1GC1KXLZkUfuMuv',
      annual: 'price_1UAcNgPJb1GC1KXLLMvf3Tjh',
    }),
  }),
  'book-online': Object.freeze({
    productId: 'prod_VCuT7Wcy4yQDrc',
    prices: Object.freeze({
      monthly: 'price_1UCUerPJb1GC1KXLkxCmvdiq',
      annual: 'price_1UCUfjPJb1GC1KXLdn2pWpQO',
    }),
  }),
  'book-hardcopy': Object.freeze({
    productId: 'prod_VCuJDGHg6vxcE6',
    prices: Object.freeze({
      monthly: 'price_1UCUVDPJb1GC1KXLKMyyeja7',
      annual: 'price_1UCUdVPJb1GC1KXLDOIHqh5D',
    }),
  }),
})

/**
 * Returns true only for one of the 4 known internal product slugs.
 * @param {unknown} key
 * @returns {boolean}
 */
export function isProductKey(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(PRODUCTS, key)
}

/**
 * Returns the allowlist entry for a known product slug, or undefined for an
 * unknown key. Never accepts a raw Stripe product/price ID as input.
 * @param {unknown} key
 * @returns {{ productId: string, prices: { monthly: string, annual: string } } | undefined}
 */
export function getProduct(key) {
  return isProductKey(key) ? PRODUCTS[key] : undefined
}
