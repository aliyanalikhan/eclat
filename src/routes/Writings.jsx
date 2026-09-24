import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import Cover from '../components/Cover.jsx'
import { writings, seriesBySlug } from '../data/content.js'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useReveal } from '../lib/motion.js'
import { useApp } from '../store.jsx'

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']

export default function Writings() {
  const { openLightbox } = useApp()

  useSeo({ ...staticSeo['/writings'], path: '/writings' })
  useReveal('writings')

  return (
    <main className="page" id="main">
      <div className="fade-up" style={{ maxWidth: '52ch' }}>
        <h1 className="display">Writings</h1>
        <p className="lede" style={{ margin: '24px 0 0' }}>
          Essays, reportage and two collections, oldest to newest.
        </p>
      </div>

      <div className="writings">
        {writings.map((w, i) => {
          const series = seriesBySlug(w.series)

          return (
            <Fragment key={w.slug}>
              {series && w.part === 1 && (
                <div className="writings__series reveal" data-rev={i}>
                  <p className="writings__series-kicker">{series.kicker}</p>
                  <h2 className="writings__series-title">{series.title}</h2>
                  <p className="writings__series-pitch">{series.pitch}</p>
                </div>
              )}

              <button
                type="button"
                className={`writing reveal${series ? ' writing--series' : ''}`}
                data-rev={i}
                aria-label={`Zoom — ${w.title}`}
                onClick={(e) =>
                  openLightbox(
                    {
                      tint: w.tint,
                      img: w.img,
                      images: w.pages,
                      label: w.title,
                      alt: `Opening image for ${w.title}`,
                      ratio: w.ratio || '3/2',
                    },
                    e.currentTarget.getBoundingClientRect(),
                  )
                }
              >
                <Cover
                  tint={w.tint}
                  img={w.img}
                  alt={`Opening image for ${w.title}`}
                  ratio={w.ratio || '3/2'}
                  width={w.w || 1200}
                  height={w.h || 800}
                />

                <div>
                  <p className="writing__type">
                    {series
                      ? `Part ${ROMAN[w.part]} of ${ROMAN[series.count]} · ${w.partTitle}`
                      : w.type}
                  </p>
                  <h2 className="writing__title">
                    <Link to={`/writings/${w.slug}`} onClick={(e) => e.stopPropagation()}>
                      {w.title}
                    </Link>
                  </h2>
                  <p className="writing__dek">{w.dek}</p>
                </div>

                <div className="writing__aside">
                  {w.year}
                  <br />
                  <span>Subscribers</span>
                </div>
              </button>
            </Fragment>
          )
        })}
      </div>
    </main>
  )
}
