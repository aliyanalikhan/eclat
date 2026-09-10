import { useEffect, useRef, useState } from 'react'

/**
 * Shared abort-cancel fetch primitive (D-07..D-09). Every hook that needs a
 * safe, race-free `fetch` — `useGatedContent`, the backported
 * `useEntitlements` — consumes this instead of re-implementing its own
 * cancelled-guard.
 *
 * The effect itself owns the AbortController: it aborts the previous
 * in-flight request before starting a new one, and its cleanup aborts on
 * unmount or on any dependency change (including a `key` bump). Because the
 * effect always owns the abort, a caller never needs to return its own
 * cleanup — this is what fixes the Phase 3 IN-03 hazard (an orphaned
 * `cancelled` flag a manual `refetch()` caller had to remember to honor).
 *
 * A monotonic request id (`idRef`) guarantees latest-request-wins even for
 * an aborted request that still resolves before the newer one — its result
 * is dropped rather than applied, and an abort-by-newer-request is never
 * surfaced as `error: true`.
 *
 * Status-aware fail-closed contract: any HTTP response whose `ok` flag is
 * false AND whose `status` is not exactly 401 sets `error: true` BEFORE the
 * body is ever parsed — the same fail-closed path a network-level rejection
 * already took. A 401 response continues to resolve as `data`, unchanged,
 * because every current server-side consumer (`api/billing/status.js`,
 * `api/content/editions/[no].js`, and `api/billing/account.js`'s own
 * missing-session branch) uses 401 specifically to mean "no session" — a
 * well-formed, non-error outcome, not a failure. This distinguishes a
 * genuine server-side failure (e.g. a DB outage returning a distinct 500)
 * from "not signed in" without regressing any existing signed-out caller.
 *
 * @param {string | null} url
 * @param {{ enabled?: boolean, key?: number }} [options]
 * @returns {{ loading: boolean, data: any, error: boolean }}
 */
export function useSafeFetch(url, { enabled = true, key = 0 } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(false)
  const abortRef = useRef(null)
  const idRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const id = ++idRef.current
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)

    fetch(url, { signal: ctrl.signal, credentials: 'same-origin' })
      .then((r) => {
        // Fail closed on any non-2xx response except 401 (the established
        // "no session, well-formed empty state" signal) — throw BEFORE the
        // body is parsed so the .catch below runs the same fail-closed path
        // a network-level failure already takes.
        if (!r.ok && r.status !== 401) throw new Error(`http ${r.status}`)
        return r.json()
      })
      .then((body) => {
        if (id !== idRef.current) return // superseded by a newer request — drop
        setData(body)
        setError(false)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError' || id !== idRef.current) return // cancelled, not a failure
        setData(null)
        setError(true)
        setLoading(false)
      })

    // Unmount and key-bump both abort the in-flight request — the effect
    // owns the abort, so no caller cleanup is ever returned.
    return () => ctrl.abort()
  }, [url, enabled, key])

  return { loading, data, error }
}
