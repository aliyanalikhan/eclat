import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [lightbox, setLightbox] = useState(null)
  const [flipFrom, setFlipFrom] = useState(null)

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
      lightbox,
      openLightbox,
      closeLightbox,
      flipFrom,
      setFlipFrom,
    }),
    [lightbox, openLightbox, closeLightbox, flipFrom],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
