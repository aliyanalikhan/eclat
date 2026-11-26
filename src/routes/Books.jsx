import Cover from '../components/Cover.jsx'
import { books } from '../data/content.js'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useReveal } from '../lib/motion.js'
import { useApp } from '../store.jsx'

export default function Books() {
  const { openLightbox } = useApp()

  useSeo({ ...staticSeo['/books'], path: '/books' })
  useReveal('books')

  return (
    <main className="page" id="main">
      <div className="fade-up" style={{ maxWidth: '52ch' }}>
        <p className="eyebrow eyebrow--accent" style={{ marginBottom: 20 }}>
          By Ebuka Osuorah
        </p>
        <h1 className="display">
          Children&rsquo;s
          <br />
          <em>books</em>
        </h1>
        <p className="lede" style={{ margin: '24px 0 0' }}>
          Picture books and cultural stories, read aloud in the subscriber library. First spread of each is free.
        </p>
      </div>

      <div className="books-grid">
        {books.map((b, i) => (
          <div key={b.slug} className="reveal" data-rev={i}>
            <button
              type="button"
              className="book-zoom"
              aria-label={`Zoom — ${b.title} cover`}
              onClick={(e) =>
                openLightbox(
                  {
                    tint: b.tint,
                    img: b.img,
                    label: `${b.title} · Cover`,
                    alt: `Cover of ${b.title}`,
                    ratio: b.ratio,
                  },
                  e.currentTarget.getBoundingClientRect(),
                )
              }
            >
              <Cover tint={b.tint} img={b.img} alt={`Cover of ${b.title}`} ratio={b.ratio} width={b.w} height={b.h}>
                {!b.plateSuppressed && (
                  <div className="cover__plate">
                    <span className="cover__title">{b.title}</span>
                  </div>
                )}
              </Cover>
            </button>

            <div className="book-meta">
              <span>{b.meta}</span>
              <span>First spread free</span>
            </div>
            <p className="card__dek" style={{ marginTop: 12 }}>
              {b.dek}
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}
