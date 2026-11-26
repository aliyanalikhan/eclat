/**
 * Client-safe display catalog for the 4 billing products. Display metadata
 * only — no prices, no Stripe imports, no server imports. Prices live on
 * the server (BILL-02) and are read from GET /api/billing/prices via
 * src/routes/Subscribe.jsx; this file only supplies stable labels/kinds for
 * the picker's tiles and SubscribeSuccess.jsx's copy/CTA routing.
 */

export const PRODUCTS = Object.freeze([
  Object.freeze({ key: 'eclat-online', name: 'Éclat Online', kind: 'online' }),
  Object.freeze({ key: 'eclat-hardcopy', name: 'Éclat Hard Copy', kind: 'hardcopy' }),
  Object.freeze({ key: 'book-online', name: 'Book Online', kind: 'online' }),
  Object.freeze({ key: 'book-hardcopy', name: 'Book Hard Copy', kind: 'hardcopy' }),
])

/**
 * @param {string} key
 * @returns {string} the product's display name, or the raw key if unknown
 */
export function productName(key) {
  const match = PRODUCTS.find((p) => p.key === key)
  return match ? match.name : key
}

/**
 * @param {string} key
 * @returns {'online' | 'hardcopy'} 'online' as the safe default for an unknown key
 */
export function productKind(key) {
  const match = PRODUCTS.find((p) => p.key === key)
  return match ? match.kind : 'online'
}
