import { useEffect, useRef, useState } from 'react'
import Cover from '../components/Cover.jsx'
import { videos } from '../data/content.js'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useReveal } from '../lib/motion.js'

/** Same modal contract as components/Lightbox.jsx (focus trap, Esc to close,
 * scroll lock, focus restore) but plays a youtube-nocookie.com embed instead
 * of an image — kept local to this route rather than folded into the shared
 * store-driven Lightbox, since its payload shape (an iframe, not an img) is
 * different enough to not share the same contract. */
function VideoModal({ video, onClose }) {
  const closeRef = useRef(null)
  const restoreTo = useRef(null)

  useEffect(() => {
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
  }, [onClose])

  return (
    <div
      className="lightbox video-modal"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
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

      <div className="video-modal__frame" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* The embedded player is a cross-origin iframe — once it has focus,
          a document-level Escape listener never sees the keypress, so this
          hint deliberately doesn't promise Esc the way the image lightbox's
          does. Clicking outside the frame always works regardless of focus. */}
      <p className="lightbox__hint">Click anywhere outside the video to close</p>
    </div>
  )
}

export default function Videos() {
  const [open, setOpen] = useState(null)

  useSeo({ ...staticSeo['/videos'], path: '/videos' })
  useReveal('videos')

  return (
    <main className="page" id="main">
      <div className="fade-up" style={{ maxWidth: '52ch' }}>
        <h1 className="display">Videos</h1>
        <p className="lede" style={{ margin: '24px 0 0' }}>
          Speeches, moments and street culture — a short reel of American history, told in its
          own voice.
        </p>
      </div>

      <div className="cards" style={{ marginTop: 52 }}>
        {videos.map((v, i) => (
          <button
            key={v.slug}
            type="button"
            className="card reveal"
            data-rev={i}
            style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }}
            aria-label={`Play — ${v.title}`}
            onClick={() => setOpen(v)}
          >
            <div className="video-card__thumb">
              <Cover
                tint="oklch(0.2 0.02 260)"
                img={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`}
                alt=""
                ratio="4/3"
                width={480}
                height={360}
              />
              <span className="video-card__play" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 22 22">
                  <circle cx="11" cy="11" r="11" fill="rgba(14,12,10,0.55)" />
                  <path d="M9 7l7 4-7 4V7z" fill="#f7f3ec" />
                </svg>
              </span>
            </div>
            <p className="card__kicker">{v.kicker}</p>
            <h3 className="card__title">{v.title}</h3>
            <p className="card__dek">{v.dek}</p>
          </button>
        ))}
      </div>

      {open && <VideoModal video={open} onClose={() => setOpen(null)} />}
    </main>
  )
}
