import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import Cover from '../components/Cover.jsx'
import NotFound from './NotFound.jsx'
import { editionByNo, editions, samples } from '../data/content.js'
import { editionJsonLd, editionSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { runFlip, useDragScroll } from '../lib/motion.js'
import { useApp } from '../store.jsx'
import { useSession } from '../lib/useSession.js'
import { useGatedContent } from '../lib/useGatedContent.js'
import { useOnlinePrice } from '../lib/useOnlinePrice.js'

export default function Edition() {
  const { no } = useParams()
  const ed = editionByNo(no)
  const { openLightbox, flipFrom, setFlipFrom } = useApp()
  const { user, loading: sessionLoading } = useSession()
  const sessionOk = !sessionLoading && Boolean(user)
  const { kind, paragraphs } = useGatedContent(ed?.no, { ok: sessionOk })
  const { label: onlinePriceLabel } = useOnlinePrice()
  const stripRef = useRef(null)

  useDragScroll(stripRef)

  // FLIP the cover in from wherever it was clicked, then clear the stored rect.
  useEffect(() => {
    if (!ed || !flipFrom) return
    runFlip('[data-flip-in]', flipFrom)
    setFlipFrom(null)
  }, [ed, flipFrom, setFlipFrom])

  const seo = ed ? editionSeo(ed) : null
  useSeo(
    ed
      ? { ...seo, path: `/editions/${ed.no}`, jsonLd: editionJsonLd(ed) }
      : { title: 'Edition not found — Éclat', robots: 'noindex,follow' },
  )

  if (!ed) return <NotFound />

  const idx = editions.findIndex((e) => e.no === ed.no)
  const newer = editions[idx - 1]
  const older = editions[idx + 1]

  return (
    <main id="main">
      <section className="ed-hero">
        <div className="ed-hero__grid">
          <Cover
            data-flip-in="1"
            tint={ed.tint}
            img={ed.img}
            alt={`Cover of Éclat No. ${ed.no} — ${ed.title}`}
            ratio={ed.ratio || '3/4'}
            eager
            width={ed.w || 1200}
            height={ed.h || 1600}
          >
            {!ed.plateSuppressed && (
              <div className="cover__plate">
                <div className="cover__top">
                  <span className="cover__mark">ÉCLAT</span>
                  <span className="cover__no">No. {ed.no}</span>
                </div>
                <span className="cover__title">{ed.title}</span>
              </div>
            )}
          </Cover>

          <div className="fade-up--slow">
            <Link to="/archive" className="ed-hero__back">
              ← Archive
            </Link>
            <h1>{ed.title}</h1>
            <div className="ed-hero__meta">
              <span>Issue No. {ed.no}</span>
              <span>{ed.date}</span>
              <span>{ed.pages} pages</span>
            </div>
            <p className="ed-hero__blurb">{ed.blurb}</p>
          </div>
        </div>
      </section>

      {/* --- preview strip --- */}
      <section className="section" style={{ padding: '96px var(--gut) 40px' }}>
        <div className="section-head">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap' }}>
            <h2 className="h2" style={{ fontSize: 'clamp(28px,3.6vw,46px)' }}>
              Inside this edition
            </h2>
            <span className="pill">Free preview</span>
          </div>
          <p className="section-head__meta">Drag to browse · click to zoom</p>
        </div>

        <div className="strip" ref={stripRef}>
          {samples.map((s) => (
            <button
              key={s.slug}
              type="button"
              className="strip__item"
              style={{ '--tint': s.tint, width: s.w, aspectRatio: s.ratio }}
              aria-label={`Zoom — ${s.label}`}
              onClick={(e) => openLightbox(s, e.currentTarget.getBoundingClientRect())}
            >
              {s.img && (
                <img
                  src={s.img}
                  alt={s.alt}
                  className="cover__img is-loaded"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <span className="strip__caption">{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* --- article body / paywall --- */}
      <section className="section" style={{ padding: '60px var(--gut) 130px' }}>
        {kind === 'entitled' && paragraphs ? (
          <div className="prose" style={{ borderTop: '1px solid var(--line)', paddingTop: 56 }}>
            <p className="eyebrow eyebrow--accent" style={{ marginBottom: 22 }}>
              Full issue unlocked
            </p>
            {paragraphs.map((p, i) => (
              <p key={i} className={i === 0 ? 'prose__open' : undefined}>
                {p}
              </p>
            ))}
            {ed.excerptBy && <p>— {ed.excerptBy}</p>}
          </div>
        ) : kind === 'loading' ? (
          <div className="paywall">
            <div className="paywall__clip">
              <div className="prose">
                {ed.excerpt.map((p, i) => (
                  <p key={i} className={i === 0 ? 'prose__open' : undefined}>
                    {p}
                  </p>
                ))}
              </div>
              <div className="paywall__fade" aria-hidden="true" />
            </div>

            <div className="paywall__cta">
              {/* Silent pending placeholder (D-12) — no spinner text, no
                  lock icon; never the CTA copy until resolved. */}
              <div className="plan__skeleton" aria-hidden="true" style={{ width: '58%', height: 18, marginTop: 18 }} />
            </div>
          </div>
        ) : (
          <div className="paywall">
            <div className="paywall__clip">
              <div className="prose">
                {ed.excerpt.map((p, i) => (
                  <p key={i} className={i === 0 ? 'prose__open' : undefined}>
                    {p}
                  </p>
                ))}
                {/* Neutral skeleton placeholder (D-11) — the gated paragraph
                    itself never ships to the client, so this slot (still the
                    same .prose__blur position/DOM shape as before) can no
                    longer render real gated text, blurred or otherwise. */}
                <div
                  className="prose__blur plan__skeleton"
                  aria-hidden="true"
                  style={{ width: '72%', height: 22, marginTop: 12 }}
                />
              </div>
              <div className="paywall__fade" aria-hidden="true" />
            </div>

            <div className="paywall__cta">
              <p className="eyebrow" style={{ marginBottom: 16 }}>
                {ed.pages - 18} more pages for subscribers
              </p>
              <h3 className="h2" style={{ fontSize: 'clamp(28px,3.6vw,44px)', margin: '0 0 26px' }}>
                Read the full issue
              </h3>
              <Link to="/subscribe" className="btn">
                {onlinePriceLabel ? `Subscribe — ${onlinePriceLabel}/mo` : 'Subscribe'}
              </Link>
              {kind === 'unknown' && sessionOk ? (
                <p className="fine" style={{ marginTop: 16, color: 'var(--bad)' }}>
                  Couldn't confirm your subscription — reload to try again.
                </p>
              ) : (
                <p className="fine" style={{ marginTop: 16 }}>
                  Cancel anytime. Covers and previews stay free.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* --- prev / next --- */}
      <nav
        className="section"
        style={{ paddingTop: 0, paddingBottom: 110 }}
        aria-label="Other editions"
      >
        <div
          style={{
            borderTop: '1px solid var(--line)',
            paddingTop: 28,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          {older ? (
            <Link to={`/editions/${older.no}`} className="link-quiet">
              ← No. {older.no} · {older.title}
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link to={`/editions/${newer.no}`} className="link-quiet">
              No. {newer.no} · {newer.title} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </nav>
    </main>
  )
}
