import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Cover from '../components/Cover.jsx'
import { archiveYears, editions } from '../data/content.js'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useReveal } from '../lib/motion.js'
import { useApp } from '../store.jsx'

export default function Archive() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { gate, setFlipFrom } = useApp()

  // Filter and sort live in the URL, so a filtered archive can be linked and shared.
  const year = archiveYears.includes(params.get('year')) ? params.get('year') : 'All'
  const sort = params.get('sort') === 'old' ? 'old' : 'new'

  const shown = useMemo(() => {
    const list = editions.filter((e) => year === 'All' || e.year === year)
    return list.slice().sort((a, b) => (sort === 'new' ? b.no - a.no : a.no - b.no))
  }, [year, sort])

  useSeo({ ...staticSeo['/archive'], path: '/archive' })
  useReveal(`archive:${year}:${sort}`)

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value === 'All' || (key === 'sort' && value === 'new')) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const openEdition = (no, e) => {
    e.preventDefault()
    const card = e.currentTarget.querySelector('[data-cover]') || e.currentTarget
    setFlipFrom(card.getBoundingClientRect())
    navigate(`/editions/${no}`)
  }

  return (
    <main className="page" id="main">
      <div className="fade-up">
        <h1 className="display">The archive</h1>
        <p className="lede" style={{ maxWidth: '46ch', margin: '22px 0 0' }}>
          Two issues so far — and everything that comes next. Covers are free to browse; full
          issues open with a subscription.
        </p>
      </div>

      <div className="filters">
        <div className="chips" role="group" aria-label="Filter by year">
          {archiveYears.map((y) => (
            <button
              key={y}
              type="button"
              className="chip"
              aria-pressed={year === y}
              onClick={() => setParam('year', y)}
            >
              {y}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="sort"
          onClick={() => setParam('sort', sort === 'new' ? 'old' : 'new')}
        >
          {sort === 'new' ? 'Newest first ↓' : 'Oldest first ↑'}
        </button>
      </div>

      <p aria-live="polite" className="visually-hidden">
        {shown.length} {shown.length === 1 ? 'edition' : 'editions'} shown
        {year === 'All' ? '' : ` from ${year}`}.
      </p>

      {shown.length === 0 ? (
        <p className="empty">No editions published that year.</p>
      ) : (
        <div className="grid-covers">
          {shown.map((ed, i) => (
            <Link
              key={ed.no}
              to={`/editions/${ed.no}`}
              className="reveal"
              data-rev={i}
              onClick={(e) => openEdition(ed.no, e)}
            >
              <Cover
                tint={ed.tint}
                img={ed.img}
                alt={`Cover of Éclat No. ${ed.no} — ${ed.title}`}
                ratio={ed.ratio || '3/4'}
                width={ed.w || 1200}
                height={ed.h || 1600}
                className="cover--lift"
                data-cover="1"
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
                {ed.isNew && <span className="cover__badge">NEW</span>}
              </Cover>
              <div className="cover-meta">
                <span>{ed.date}</span>
                <span>{gate('Preview free')}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
