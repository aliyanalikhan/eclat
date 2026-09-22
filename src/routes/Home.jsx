import { Link, useNavigate } from 'react-router-dom'
import Cover from '../components/Cover.jsx'
import { articles, books, editions, icons } from '../data/content.js'
import { siteJsonLd, staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useReveal, useScrollFx, runFlip } from '../lib/motion.js'
import { useApp } from '../store.jsx'
import { useOnlinePrice } from '../lib/useOnlinePrice.js'

// Hero fan geometry, preserved from the prototype: five fixed slots the fan
// opens into on scroll. Real editions and books fill them outward from the
// centre — newest edition in the lead slot, then the rest of the real
// covers alternating mid/far left and right — so the fan scales cleanly
// from one cover up to a full five-card spread as more are added, instead
// of being pinned to specific issue numbers that may not exist yet.
const FAN_SLOTS = [
  { fx: -420, fy: 34, fr: -15, cls: '' },
  { fx: -215, fy: 6, fr: -8, cls: 'fan-card--mid' },
  { fx: 0, fy: -14, fr: 0, cls: 'fan-card--lead', lead: true },
  { fx: 215, fy: 6, fr: 8, cls: 'fan-card--mid', mirror: true },
  { fx: 420, fy: 34, fr: 15, cls: '', mirror: true },
]
const FAN_FILL_ORDER = [2, 3, 1, 4, 0] // centre, then outward alternating right/left

// Muted, deliberately un-editorial tint so a "coming soon" placeholder never
// reads as a real, uncovered edition (those use rich per-issue oklch tints)
// — it's the same tint+stripe-texture fallback Cover already renders for a
// missing img, just visually flagged as "not yet real" via the blur overlay.
const COMING_SOON_TINT = 'oklch(0.4 0.01 80)'

function buildFan(eds) {
  const slots = new Array(FAN_SLOTS.length).fill(null)
  eds.slice(0, FAN_SLOTS.length).forEach((ed, i) => {
    slots[FAN_FILL_ORDER[i]] = { ed, comingSoon: false }
  })
  // The fan is always 5 slots wide by design (see comment above), but only
  // ever has as many real editions as exist so far. Rather than leave the
  // remaining slots empty — sparse and asymmetric with just 1-2 editions —
  // fill them with blurred "Coming Soon" placeholders so the spread stays
  // visually balanced while there are still only a couple of real issues.
  slots.forEach((slot, i) => {
    if (!slot) {
      // `variant` picks one of 4 drawn sample-cover looks (see
      // .fan-card__sample--0..3 in eclat.css) — fixed by slot position, not
      // Math.random(), so server and client render identically (a real
      // random pick per render would hydration-mismatch).
      slots[i] = {
        ed: { no: `soon-${i}`, tint: COMING_SOON_TINT },
        comingSoon: true,
        variant: i % 4,
      }
    }
  })
  return slots.map((slot, i) => ({ ...FAN_SLOTS[i], ...slot }))
}

export default function Home() {
  const navigate = useNavigate()
  const { setFlipFrom } = useApp()
  const { label: onlinePriceLabel } = useOnlinePrice()
  const newest = editions[0]
  const homeBooks = books.slice(0, 5)
  // Hero fan is strictly magazine covers — children's books get their own
  // "Books & writings" band below, so a browsing visitor doesn't see the two
  // formats interleaved in the same rotating spread.
  const fan = buildFan(editions)

  useSeo({ ...staticSeo['/'], path: '/', jsonLd: siteJsonLd() })
  useReveal('home')
  useScrollFx('home')

  // Capture the cover's rect so the edition page can FLIP from it.
  const openEdition = (no, e) => {
    const card = e.currentTarget.querySelector('[data-cover]') || e.currentTarget
    setFlipFrom(card.getBoundingClientRect())
    navigate(`/editions/${no}`)
  }

  return (
    <main id="main">
      <section className="hero" data-hero="1">
        <div className="hero__wash" />

        <div className="fan-origin" data-fan-origin="1" aria-hidden="true">
          {fan.map((f) => {
            const ed = f.ed
            if (f.comingSoon) {
              return (
                <Cover
                  key={ed.no}
                  tint={ed.tint}
                  alt=""
                  ratio={null}
                  className={`fan-card ${f.cls}`}
                  data-fan="1"
                  data-fx={f.fx}
                  data-fy={f.fy}
                  data-fr={f.fr}
                  style={{
                    transform: `translate(${f.fx}px,${f.fy}px) rotate(${f.fr}deg)`,
                    aspectRatio: 'auto',
                  }}
                >
                  {/* A drawn (not photographed) sample cover layout — no
                      real photo, no real publication, just generic
                      placeholder blocks standing in for a masthead/cover
                      line/image well. `--{variant}` (0-3, fixed per slot
                      position) gives each placeholder a different color and
                      layout order so the 3 empty slots don't look like
                      identical clones. A frosted-glass overlay (light,
                      translucent, blurred, bordered) sits on top, blurring
                      this layout without blurring the "Coming Soon" label
                      itself. */}
                  <div
                    className={`fan-card__sample fan-card__sample--${f.variant}`}
                    aria-hidden="true"
                  >
                    <span className="fan-card__sample-mast">MAGAZINE</span>
                    <div className="fan-card__sample-well" />
                    <span className="fan-card__sample-line" />
                    <span className="fan-card__sample-line" style={{ width: '70%' }} />
                    <span className="fan-card__sample-line" style={{ width: '45%' }} />
                  </div>
                  <div className="fan-card__soon fan-card__soon--glass">
                    <span className="fan-card__soon-label">Coming Soon</span>
                  </div>
                </Cover>
              )
            }
            return (
              <Cover
                key={ed.no ?? ed.slug}
                tint={ed.tint}
                img={ed.img}
                alt=""
                ratio={null}
                eager={f.lead}
                className={`fan-card ${f.cls}`}
                data-fan="1"
                data-fx={f.fx}
                data-fy={f.fy}
                data-fr={f.fr}
                style={{
                  transform: `translate(${f.fx}px,${f.fy}px) rotate(${f.fr}deg)`,
                  aspectRatio: 'auto',
                }}
              >
                {!ed.plateSuppressed && (
                  <div
                    className="cover__plate"
                    style={
                      f.mirror ? { alignItems: 'flex-end', textAlign: 'right' } : undefined
                    }
                  >
                    {f.lead ? (
                      <>
                        <div className="cover__top">
                          <span className="cover__mark" style={{ fontSize: 16 }}>
                            ÉcLAT
                          </span>
                          <span className="cover__no">NO. {ed.no}</span>
                        </div>
                        <div>
                          <div className="cover__title" style={{ fontSize: 34, lineHeight: 0.98 }}>
                            {ed.title}
                          </div>
                          <div
                            className="cover__no"
                            style={{ marginTop: 10, opacity: 0.8, letterSpacing: '0.16em' }}
                          >
                            {ed.date.toUpperCase()}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="cover__mark" style={{ fontSize: 15 }}>
                          ÉcLAT
                        </span>
                        {/* Veiled at rest — useScrollFx fades these in as the fan
                            opens, so a neighbouring card never cuts them mid-word. */}
                        <span
                          className="cover__title fan-card__veil"
                          data-fan-title="1"
                          style={{ fontSize: 26, lineHeight: 1.05 }}
                        >
                          {ed.title}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </Cover>
            )
          })}
        </div>

        <div className="hero__copy" data-copy-block="1">
          <div className="hero__halo" aria-hidden="true" />
          <p className="hero__flag" data-hero-copy="1">
            <span className="dot" aria-hidden="true" />
            THE {newest.date.toUpperCase()} ISSUE
          </p>
          <h1 data-hero-copy="1">Where remarkable stories come to light.</h1>
          <p className="hero__lede" data-hero-copy="1">
            Éclat celebrates the visionaries, leaders, creators, and changemakers whose stories
            deserve to be told.
          </p>
          <div className="hero__actions" data-hero-copy="1">
            <Link to={`/editions/${newest.no}`} className="btn">
              Explore the Issue
            </Link>
            <a
              href="https://ladidier.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--sm hero__btn-complimentary"
            >
              Complimentary Copy Available Here
              <span className="hero__btn-complimentary-arrow" aria-hidden="true"> &rarr;</span>
            </a>
          </div>
        </div>

        <p className="hero__scroll" data-hero-copy="1" aria-hidden="true">
          SCROLL
        </p>
      </section>

      {/* --- newest issue --- */}
      <section className="newest" aria-labelledby="newest-h">
        <div className="section-head reveal" data-rev="0">
          <h2 className="h2" id="newest-h">
            Newest issue
          </h2>
          <p className="section-head__meta">
            No. {newest.no} · {newest.date}
          </p>
        </div>

        <div className="newest__grid">
          <div className="reveal newest__cover" data-rev="1">
            <div style={{ overflow: 'hidden' }}>
              <Cover
                tint={newest.tint}
                img={newest.img}
                alt={`Cover of Éclat No. ${newest.no} — ${newest.title}`}
                ratio={newest.ratio || '3/4'}
                eager
                width={newest.w || 1200}
                height={newest.h || 1600}
                data-par="6"
                style={{ willChange: 'transform' }}
              >
                {!newest.plateSuppressed && (
                  <div className="cover__plate">
                    <div className="cover__top">
                      <span className="cover__mark">ÉcLAT</span>
                      <span className="cover__no">NO. {newest.no}</span>
                    </div>
                    <div>
                      <div className="cover__title">{newest.title}</div>
                      <div className="cover__foot">
                        {newest.date.toUpperCase()} · {newest.pages} PAGES
                      </div>
                    </div>
                  </div>
                )}
              </Cover>
            </div>
          </div>

          <div className="reveal" data-rev="2">
            <p className="pull">{newest.blurb}</p>
            <p className="body-copy">
              An editorial on essence over excess, a Minneapolis city guide, and LaDidiér
              Bridal&rsquo;s elegance reimagined. Free preview opens the first eighteen pages to
              everyone.
            </p>
            <div className="btn-row">
              <Link to={`/editions/${newest.no}`} className="btn">
                See inside this edition
              </Link>
              <Link to="/subscribe" className="btn btn--ghost">
                {onlinePriceLabel ? `Subscribe — ${onlinePriceLabel}/mo` : 'Subscribe'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- featured articles --- */}
      <section className="section" aria-labelledby="features-h">
        <div className="section-head reveal" data-rev="0" style={{ marginBottom: 52 }}>
          <h2 className="h2" id="features-h">
            Featured articles
          </h2>
          <Link to="/archive" className="section-head__meta">
            All issues →
          </Link>
        </div>

        <div className="cards">
          {articles.map((a, i) => (
            <Link
              key={a.slug}
              to={`/editions/${a.editionNo}`}
              className="card reveal"
              data-rev={i}
              onClick={(e) => {
                e.preventDefault()
                openEdition(a.editionNo, e)
              }}
            >
              <div style={{ overflow: 'hidden', position: 'relative' }}>
                <Cover
                  tint={a.tint}
                  img={a.img}
                  alt={a.alt}
                  ratio="4/3"
                  width={1600}
                  height={1200}
                  data-cover="1"
                  data-par="4"
                  style={{ willChange: 'transform', transition: 'transform .7s var(--ease)' }}
                />
              </div>
              <p className="card__kicker">{a.kicker}</p>
              <h3 className="card__title">{a.title}</h3>
              <p className="card__dek">{a.dek}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* --- books & writings --- */}
      <section className="band" aria-labelledby="band-h">
        <div className="band__inner">
          <div className="section-head reveal" data-rev="0" style={{ marginBottom: 52 }}>
            <h2 className="h2" id="band-h">
              Books &amp; writings
            </h2>
            <div style={{ display: 'flex', gap: 22, paddingBottom: 8, flexWrap: 'wrap' }}>
              <Link to="/books" className="link-quiet">
                Children&rsquo;s books →
              </Link>
              <Link to="/writings" className="link-quiet">
                Writings →
              </Link>
            </div>
          </div>

          <div className="shelf">
            {homeBooks.map((b, i) => (
              <Link key={b.slug} to="/books" className="reveal" data-rev={i}>
                <Cover
                  tint={b.tint}
                  img={b.img}
                  alt={`Cover of ${b.title}`}
                  ratio={b.ratio}
                  width={b.w}
                  height={b.h}
                  className="cover--lift cover--book"
                >
                  {!b.plateSuppressed && <span className="shelf__title">{b.title}</span>}
                </Cover>
                <p className="label" style={{ marginTop: 12 }}>
                  {b.meta}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- Cultural icons (decoration only — supplied tribute images, not
          editorial content, not a claim any of these appeared in a real
          Éclat issue. Titled "Cultural" rather than "American" since two of
          the seven — Soyinka, Kuti — aren't American. Bios are short,
          widely-documented public facts, not sourced from any particular
          reference. */}
      <section className="section" aria-labelledby="icons-h">
        <div className="section-head reveal" data-rev="0" style={{ marginBottom: 52 }}>
          <h2 className="h2" id="icons-h">
            Cultural Icons
          </h2>
        </div>

        <div className="shelf">
          {icons.map((icon, i) => (
            <div key={icon.slug} className="reveal" data-rev={i}>
              <Cover
                tint="oklch(0.2 0.02 260)"
                img={icon.img}
                alt={`Tribute image of ${icon.name}`}
                ratio="2/3"
                width={800}
                height={1200}
                className="cover--lift"
              />
              <p className="label" style={{ marginTop: 12 }}>
                <strong>{icon.name}</strong> — {icon.bio}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --- closing CTA --- */}
      <section className="cta" aria-labelledby="cta-h">
        <div className="cta__weave" data-par="10" aria-hidden="true" />
        <div className="cta__inner">
          <div className="cta__scale" data-cta="1">
            <p className="cta__eyebrow">One subscription</p>
            <h2 id="cta-h">
              Our stories, our voice, our Éclat.
              <br />
              <em style={{ fontStyle: 'italic' }}>Come belong.</em>
            </h2>
            <div className="cta__complimentary">
              <a
                href="https://ladidier.com"
                target="_blank"
                rel="noopener noreferrer"
                className="cta__complimentary-link"
              >
                Complimentary copy available to read at LaDidiér
                <span className="cta__complimentary-arrow" aria-hidden="true"> &rarr;</span>
              </a>
            </div>
            <p className="cta__lede">
              New editions land bimonthly.
            </p>
            <Link to="/subscribe" className="btn btn--light btn--lg">
              Subscribe
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
