import { useCallback, useEffect, useState } from 'react'

/**
 * Client hook wrapping GET /api/billing/status. Sibling to useSession.js,
 * copying its exact cancel-flag + .then/.catch shape.
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
  const [subs, setSubs] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refetch = useCallback(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/billing/status')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return
        setSubs(body.subscriptions || {})
        setError(false)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setSubs({})
        setError(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => refetch(), [refetch])

  return { subs, loading, error, refetch }
}
