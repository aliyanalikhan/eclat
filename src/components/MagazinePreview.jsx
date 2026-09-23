import { useEffect, useRef, useState } from 'react'

/**
 * Full-magazine page-flip modal. Mirrors Lightbox.jsx's accessibility
 * contract (focus trap, Esc to close, scroll lock, focus restore) — the
 * same pattern Videos.jsx's local VideoModal already established for a
 * second, non-store modal — but adds page navigation (Previous/Next,
 * arrow keys, an N / total counter) since its payload is a full page set
 * rather than a single image. Kept entirely self-contained: no dependency
 * on the global app Context or any cross-page zoom/FLIP state.
 */
export default function MagazinePreview({ pages, title, open, onClose, startIndex = 0 }) {
  const [index, setIndex] = useState(startIndex)
  const [slideDir, setSlideDir] = useState(null) // 'forward' | 'backward' | null
  const closeRef = useRef(null)
  const restoreTo = useRef(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  useEffect(() => {
    if (!open) return
    setIndex(startIndex)
    setSlideDir(null)
  }, [open, startIndex])

  // Preload adjacent magazine spread images to eliminate blank flashes on mobile
  useEffect(() => {
    if (!open || !pages || pages.length === 0) return
    const toPreload = [index - 1, index + 1, index + 2].filter(
      (i) => i >= 0 && i < pages.length
    )
    toPreload.forEach((i) => {
      const img = new Image()
      img.src = pages[i]
    })
  }, [open, index, pages])

  useEffect(() => {
    if (!open) return

    restoreTo.current = document.activeElement
    closeRef.current?.focus()

    const { overflow, paddingRight } = document.body.style
    const gap = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = `${gap}px`

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSlideDir('backward')
        setIndex((i) => Math.max(0, i - 1))
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSlideDir('forward')
        setIndex((i) => Math.min(pages.length - 1, i + 1))
        return
      }
      // Only the close button is focusable in here, so keep Tab on it —
      // the Previous/Next buttons stay mouse/touch-operable and are also
      // reachable via the arrow-key branches above.
      if (e.key === 'Tab') {
        e.preventDefault()
        closeRef.current?.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
      if (restoreTo.current instanceof HTMLElement) restoreTo.current.focus()
    }
  }, [open, onClose, pages.length])

  function handleTouchStart(e) {
    if (!e.touches || e.touches.length === 0) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    // Require distinct horizontal swipe gesture (>40px and >1.5x vertical delta)
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && index < pages.length - 1) {
        setSlideDir('forward')
        setIndex((i) => Math.min(pages.length - 1, i + 1))
      } else if (deltaX > 0 && index > 0) {
        setSlideDir('backward')
        setIndex((i) => Math.max(0, i - 1))
      }
    }
  }

  const slideModifier =
    slideDir === 'forward'
      ? 'is-sliding-forward'
      : slideDir === 'backward'
        ? 'is-sliding-backward'
        : ''

  return (
    <div
      className="lightbox magazine-preview"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        className="lightbox__close"
        onClick={onClose}
        aria-label="Close"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="3" x2="15" y2="15" />
            <line x1="15" y1="3" x2="3" y2="15" />
          </g>
        </svg>
      </button>

      <div
        className="magazine-preview__frame"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          key={index}
          src={pages[index]}
          alt={`${title} — page ${index + 1} of ${pages.length}`}
          className={`magazine-preview__img ${slideModifier}`.trim()}
          decoding="async"
          onAnimationEnd={() => setSlideDir(null)}
        />

        <div className="magazine-preview__nav">
          <button
            type="button"
            className="btn btn--light btn--sm"
            disabled={index === 0}
            onClick={() => {
              setSlideDir('backward')
              setIndex((i) => Math.max(0, i - 1))
            }}
          >
            Previous
          </button>
          <span className="magazine-preview__counter" aria-live="polite">
            {index + 1} / {pages.length}
          </span>
          <button
            type="button"
            className="btn btn--light btn--sm"
            disabled={index === pages.length - 1}
            onClick={() => {
              setSlideDir('forward')
              setIndex((i) => Math.min(pages.length - 1, i + 1))
            }}
          >
            Next
          </button>
        </div>
      </div>

      <p className="lightbox__hint">Use ← → to browse · Esc to close</p>
    </div>
  )
}
