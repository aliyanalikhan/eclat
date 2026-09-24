import { Link } from 'react-router-dom'
import Cover from '../components/Cover.jsx'
import { writings, seriesBySlug } from '../data/content.js'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useReveal } from '../lib/motion.js'
import { useApp } from '../store.jsx'

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']

// Consecutive members of one series collapse into a single group so the
// trilogy can be drawn as its own panel; everything else stays a plain row.
function buildBlocks(list) {
  const blocks = []
  list.forEach((w, i) => {
    const last = blocks[blocks.length - 1]
    if (w.series && last && last.series === w.series) {
      last.items.push({ w, i })
    } else if (w.series) {
      blocks.push({ series: w.series, items: [{ w, i }] })
    } else {
      blocks.push({ items: [{ w, i }] })
    }
  })
  return blocks
}

export default function Writings() {
  const { openLightbox } = useApp()

  useSeo({ ...staticSeo['/writings'], path: '/writings' })
  useReveal('writings')

  const renderRow = ({ w, i }, series) => (
    <button
      key={w.slug}
      type="button"
      className="writing reveal"
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
          {series ? `Part ${ROMAN[w.part]} of ${ROMAN[series.count]} · ${w.partTitle}` : w.type}
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
  )

  return (
    <main className="page" id="main">
      <div className="fade-up" style={{ maxWidth: '52ch' }}>
        <h1 className="display">Writings</h1>
        <p className="lede" style={{ margin: '24px 0 0' }}>
          Essays, reportage and two collections, oldest to newest.
        </p>
      </div>

      <div className="writings">
        {buildBlocks(writings).map((block) => {
          const series = block.series && seriesBySlug(block.series)
          if (!series) return block.items.map((item) => renderRow(item, null))

          return (
            <section
              key={series.slug}
              className="writings__group"
              aria-labelledby={`series-${series.slug}`}
            >
              <div className="writings__series reveal" data-rev={block.items[0].i}>
                <p className="writings__series-kicker">{series.kicker}</p>
                <h2 className="writings__series-title" id={`series-${series.slug}`}>
                  {series.title}
                </h2>
                <p className="writings__series-pitch">{series.pitch}</p>
              </div>
              {block.items.map((item) => renderRow(item, series))}
            </section>
          )
        })}
      </div>
    </main>
  )
}
