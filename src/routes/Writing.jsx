import { Link, useParams } from 'react-router-dom'
import Cover from '../components/Cover.jsx'
import NotFound from './NotFound.jsx'
import { writingBySlug, seriesBySlug, writings } from '../data/content.js'
import { writingSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']

export default function Writing() {
  const { slug } = useParams()
  const w = writingBySlug(slug)
  const series = w && seriesBySlug(w.series)
  const members = series ? writings.filter((m) => m.series === series.slug) : []

  useSeo(
    w
      ? { ...writingSeo(w), path: `/writings/${w.slug}` }
      : { title: 'Writing not found — Éclat', robots: 'noindex,follow' },
  )

  if (!w) return <NotFound />

  return (
    <main className="page page--narrow" id="main">
      <Link to="/writings" className="link-quiet">
        ← Writings
      </Link>

      <div style={{ margin: '28px 0 36px', overflow: 'hidden', borderRadius: 4 }}>
        <Cover
          tint={w.tint}
          img={w.img}
          alt={`Opening image for ${w.title}`}
          ratio={w.ratio || '3/2'}
          width={w.w || 1200}
          height={w.h || 800}
          style={{ maxHeight: 520, width: '100%', objectFit: 'cover' }}
        />
      </div>

      <p className="writing__type">
        {series ? `${series.title} · Part ${ROMAN[w.part]} of ${ROMAN[series.count]}` : `${w.type} · ${w.year}`}
      </p>
      <h1 className="display">{w.title}</h1>

      <div className="prose">
        {w.body && w.body.length > 0 ? (
          w.body.map((p, i) => (
            <p key={i} className={i === 0 ? 'prose__open' : undefined}>
              {p}
            </p>
          ))
        ) : (
          <p className="prose__open">{w.dek}</p>
        )}
      </div>

      {series && (
        <nav className="series-nav" aria-label={series.title}>
          <p className="series-nav__label">{series.title}</p>
          <ol className="series-nav__list">
            {members.map((m) => (
              <li key={m.slug}>
                {m.slug === w.slug ? (
                  <span className="series-nav__item is-current" aria-current="page">
                    <span className="series-nav__part">Part {ROMAN[m.part]}</span>
                    {m.title}
                  </span>
                ) : (
                  <Link to={`/writings/${m.slug}`} className="series-nav__item">
                    <span className="series-nav__part">Part {ROMAN[m.part]}</span>
                    {m.title}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </main>
  )
}
