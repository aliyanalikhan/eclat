import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store.jsx'
import { runFlip } from '../lib/motion.js'

/**
 * Zoom view for covers and sample spreads.
 *
 * The prototype's version was a click-to-close div with no keyboard path at all.
 * This one is a real modal: Escape closes it, focus moves in and is restored on
 * close, focus is trapped while open, and the page behind it cannot scroll.
 */
function parseRatio(r) {
  if (typeof r === 'number' && !isNaN(r) && r > 0) return r
  if (typeof r === 'string' && r.includes('/')) {
    const [w, h] = r.split('/').map(Number)
    if (w && h && !isNaN(w) && !isNaN(h) && h > 0) return w / h
  }
  const n = parseFloat(r)
  return isNaN(n) || n <= 0 ? 1 : n
}

export default function Lightbox() {
  const { lightbox, closeLightbox, flipFrom } = useApp()
  const closeRef = useRef(null)
  const imgRef = useRef(null)
  const restoreTo = useRef(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [naturalRatio, setNaturalRatio] = useState(null)

  const open = Boolean(lightbox)
  const images = lightbox?.images
  const hasPages = Array.isArray(images) && images.length > 1
  const pageCount = hasPages ? images.length : 1

  const currentSrc = hasPages ? images[pageIndex] : lightbox?.img

  useEffect(() => {
    setNaturalRatio(null)
    const el = imgRef.current
    if (el && el.complete && el.naturalWidth && el.naturalHeight) {
      setNaturalRatio(el.naturalWidth / el.naturalHeight)
    }
  }, [currentSrc])

  useEffect(() => {
    if (!open) return

    setPageIndex(0)
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
      if (hasPages && e.key === 'ArrowLeft') {
        e.preventDefault()
        setPageIndex((i) => Math.max(0, i - 1))
        return
      }
      if (hasPages && e.key === 'ArrowRight') {
        e.preventDefault()
        setPageIndex((i) => Math.min(pageCount - 1, i + 1))
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
  }, [open, closeLightbox, flipFrom, hasPages, pageCount])

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
      return
    }

    // Horizontal swipe > 60px and predominantly horizontal (at least 1.5x deltaY) pages a multi-image item
    if (hasPages && Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        setPageIndex((i) => Math.min(pageCount - 1, i + 1))
      } else {
        setPageIndex((i) => Math.max(0, i - 1))
      }
    }
  }

  if (!open) return null

  const { tint, label, alt, ratio = '16/10' } = lightbox
  const activeRatioNum = naturalRatio || parseRatio(ratio)

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
        style={{
          '--tint': tint,
          '--lb-ratio': activeRatioNum,
          aspectRatio: `${activeRatioNum}`,
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentSrc && (
          <img
            ref={imgRef}
            key={currentSrc}
            src={currentSrc}
            alt={hasPages ? `${alt || label || ''} — page ${pageIndex + 1} of ${pageCount}` : alt || label || ''}
            className="cover__img is-loaded"
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.currentTarget
              if (naturalWidth && naturalHeight) {
                setNaturalRatio(naturalWidth / naturalHeight)
              }
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}
        {hasPages && (
          <button
            type="button"
            className="lightbox__navbtn lightbox__navbtn--prev"
            onClick={(e) => {
              e.stopPropagation()
              setPageIndex((i) => Math.max(0, i - 1))
            }}
            disabled={pageIndex === 0}
            aria-label="Previous page"
          >
            <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M11 3 5 9l6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {hasPages && (
          <button
            type="button"
            className="lightbox__navbtn lightbox__navbtn--next"
            onClick={(e) => {
              e.stopPropagation()
              setPageIndex((i) => Math.min(pageCount - 1, i + 1))
            }}
            disabled={pageIndex === pageCount - 1}
            aria-label="Next page"
          >
            <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M7 3l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {label && <figcaption className="lightbox__caption">{label}</figcaption>}
        {hasPages && (
          <p className="lightbox__pageindicator" aria-live="polite">
            Page {pageIndex + 1} of {pageCount}
          </p>
        )}
      </figure>

      <p className="lightbox__hint">Press Esc or click anywhere to close</p>
    </div>
  )
}
