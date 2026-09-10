import { useSafeFetch } from './useSafeFetch.js'

function formatAmount(amount) {
  if (typeof amount !== 'number') return null
  return `$${(amount / 100).toFixed(2)}`
}

/**
 * Thin wrapper over the shared `useSafeFetch('/api/billing/prices')`
 * primitive (same public, unauthenticated endpoint Subscribe.jsx already
 * calls) — reads the live `eclat-online` monthly amount so CTAs outside
 * /subscribe never show a hardcoded price guess that can drift from what
 * Stripe actually charges.
 *
 * Fails closed to `label: null` while loading, on any fetch/parse error, or
 * if the `eclat-online` monthly amount is missing from a degraded response
 * — callers must render plain "Subscribe" (no price suffix) in that case,
 * never a stale or broken price fragment.
 *
 * @returns {{ label: string | null }}
 */
export function useOnlinePrice() {
  const { loading, data, error } = useSafeFetch('/api/billing/prices')
  const amount = data?.products?.['eclat-online']?.intervals?.monthly?.amount
  const label = !loading && !error ? formatAmount(amount) : null

  return { label }
}
