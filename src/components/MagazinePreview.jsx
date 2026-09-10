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
  const closeRef = useRef(null)
  const restoreTo = useRef(null)

  useEffect(() => {
    if (!open) return
    setIndex(startIndex)
  }, [open, startIndex])

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
        setIndex((i) => Math.max(0, i - 1))
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
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

  if (!open) return null

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

      <div className="magazine-preview__frame" onClick={(e) => e.stopPropagation()}>
        <img
          src={pages[index]}
          alt={`${title} — page ${index + 1} of ${pages.length}`}
          className="magazine-preview__img"
          decoding="async"
        />

        <div className="magazine-preview__nav">
          <button
            type="button"
            className="btn btn--light btn--sm"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
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
            onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
          >
            Next
          </button>
        </div>
      </div>

      <p className="lightbox__hint">Use ← → to browse · Esc to close</p>
    </div>
  )
}
