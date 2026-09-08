import { useCallback, useEffect, useState } from 'react'

/**
 * Client hook wrapping GET /api/auth/session. Because this app has no
 * per-request SSR (entry-server.jsx only runs at build time), the header's
 * signed-in/signed-out state can only be resolved client-side after
 * hydration — this hook exposes an explicit third "loading" state so
 * callers can render a neutral placeholder instead of flashing
 * signed-out UI for signed-in users on first paint.
 *
 * @returns {{ user: { name: string, email: string, picture: string } | null, loading: boolean, refetch: () => void }}
 */
export function useSession() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSession = useCallback(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return
        setUser(body.user)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => fetchSession(), [fetchSession])

  return { user, loading, refetch: fetchSession }
}
