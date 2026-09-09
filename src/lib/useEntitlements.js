import { useCallback, useState } from 'react'
import { useSafeFetch } from './useSafeFetch.js'

/**
 * Client hook wrapping GET /api/billing/status. Backported onto the shared
 * useSafeFetch primitive (D-07..D-09) — fixes the Phase 3 IN-03 hazard
 * where `refetch()` returned an orphaned abort-guard flag that a manual
 * caller (SubscribeSuccess.jsx's polling loop) had to remember to honor.
 * `refetch()` is now a safe key bump: useSafeFetch's effect owns the
 * abort-previous + latest-request-wins guarantee, so a refetch can never
 * resolve out of order or leak into an unmounted component.
 *
 * Fails closed to an empty subscriptions map on any fetch/parse error or a
 * 401 (no session) response — callers (the /subscribe picker and
 * /subscribe/success) must treat `error: true` as "unknown, not confirmed
 * free," and fall back to the safe default "Subscribe" action rather than
 * assuming ownership either way (D-04): the real boundary is always
 * api/billing/checkout.js's own server-side re-check.
 *
 * @returns {{ subs: Record<string, { status: string, current_period_end: string }>, loading: boolean, error: boolean, refetch: () => void }}
 */
export function useEntitlements() {
  const [key, setKey] = useState(0)
  const { loading, data, error } = useSafeFetch('/api/billing/status', { enabled: true, key })
  const subs = (data && data.subscriptions) || {}
  const refetch = useCallback(() => setKey((k) => k + 1), [])

  return { subs, loading, error, refetch }
}
