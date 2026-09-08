import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AppContext = createContext(null)

const STORAGE_KEY = 'eclat:demo-state'

function readStored() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AppProvider({ children }) {
  // Subscription state is a front-end demo only — see the notice on /subscribe.
  // Persisted so the unlocked view survives navigation and reload.
  const [subscribed, setSubscribed] = useState(false)
  const [plan, setPlan] = useState('annual')
  const [lightbox, setLightbox] = useState(null)
  const [flipFrom, setFlipFrom] = useState(null)

  useEffect(() => {
    const stored = readStored()
    if (!stored) return
    if (typeof stored.subscribed === 'boolean') setSubscribed(stored.subscribed)
    if (stored.plan === 'monthly' || stored.plan === 'annual') setPlan(stored.plan)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ subscribed, plan }))
    } catch {
      /* private mode / quota — the demo just won't persist */
    }
  }, [subscribed, plan])

  const openLightbox = useCallback((item, rect) => {
    setFlipFrom(rect || null)
    setLightbox(item)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightbox(null)
    setFlipFrom(null)
  }, [])

  const value = useMemo(
    () => ({
      subscribed,
      setSubscribed,
      plan,
      setPlan,
      lightbox,
      openLightbox,
      closeLightbox,
      flipFrom,
      setFlipFrom,
      // "Included" once subscribed, otherwise the tier-specific teaser label.
      gate: (label) => (subscribed ? 'Included' : label),
    }),
    [subscribed, plan, lightbox, openLightbox, closeLightbox, flipFrom],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
