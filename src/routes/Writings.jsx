import Cover from '../components/Cover.jsx'
import { writings } from '../data/content.js'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useReveal } from '../lib/motion.js'
import { useApp } from '../store.jsx'

export default function Writings() {
  const { gate, openLightbox } = useApp()

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
        {writings.map((w, i) => (
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
                  label: w.title,
                  alt: `Opening image for ${w.title}`,
                  ratio: '3/2',
                },
                e.currentTarget.getBoundingClientRect(),
              )
            }
          >
            <Cover
              tint={w.tint}
              img={w.img}
              alt={`Opening image for ${w.title}`}
              ratio="3/2"
              width={1200}
              height={800}
            />

            <div>
              <p className="writing__type">{w.type}</p>
              <h2 className="writing__title">{w.title}</h2>
              <p className="writing__dek">{w.dek}</p>
            </div>

            <div className="writing__aside">
              {w.year}
              <br />
              <span>{gate('Subscribers')}</span>
            </div>
          </button>
        ))}
      </div>
    </main>
  )
}
