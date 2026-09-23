import { useEffect, useRef } from 'react'
import { useApp } from '../store.jsx'
import { runFlip } from '../lib/motion.js'

/**
 * Zoom view for covers and sample spreads.
 *
 * The prototype's version was a click-to-close div with no keyboard path at all.
 * This one is a real modal: Escape closes it, focus moves in and is restored on
 * close, focus is trapped while open, and the page behind it cannot scroll.
 */
export default function Lightbox() {
  const { lightbox, closeLightbox, flipFrom } = useApp()
  const closeRef = useRef(null)
  const restoreTo = useRef(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const open = Boolean(lightbox)

  useEffect(() => {
    if (!open) return

    restoreTo.current = document.activeElement
    closeRef.current?.focus()

    runFlip('[data-lb-frame]', flipFrom)

    const { overflow, paddingRight } = document.body.style
    const gap = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = `${gap}px`

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeLightbox()
        return
      }
      // Only the close button is focusable in here, so keep Tab on it.
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
  }, [open, closeLightbox, flipFrom])

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

    // Downward swipe > 60px and predominantly vertical (at least 1.5x deltaX)
    if (deltaY > 60 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
      closeLightbox()
    }
  }

  if (!open) return null

  const { tint, img, label, alt, ratio = '16/10' } = lightbox

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={label || 'Enlarged image'}
      onClick={closeLightbox}
    >
      <button
        ref={closeRef}
        type="button"
        className="lightbox__close"
        onClick={closeLightbox}
        aria-label="Close"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="3" x2="15" y2="15" />
            <line x1="15" y1="3" x2="3" y2="15" />
          </g>
        </svg>
      </button>

      <figure
        data-lb-frame="1"
        className="lightbox__frame"
        style={{ '--tint': tint, '--lb-ratio': ratio, aspectRatio: ratio }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {img && (
          <img
            src={img}
            alt={alt || label || ''}
            className="cover__img is-loaded"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}
        {label && <figcaption className="lightbox__caption">{label}</figcaption>}
      </figure>

      <p className="lightbox__hint">Press Esc or click anywhere to close</p>
    </div>
  )
}
