import { Link } from 'react-router-dom'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'

export default function NotFound() {
  useSeo({ ...staticSeo['/404'], path: '/404' })

  return (
    <main className="page--narrow" id="main" style={{ textAlign: 'center' }}>
      <div className="fade-up">
        <p className="eyebrow" style={{ marginBottom: 20 }}>
          Error 404
        </p>
        <h1 className="display" style={{ fontSize: 'clamp(40px,6vw,84px)' }}>
          Nothing here
          <br />
          <em>at this address</em>
        </h1>
        <p className="lede" style={{ margin: '26px auto 40px', maxWidth: '44ch' }}>
          The page has either moved or never existed. The archive is the best place to start.
        </p>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <Link to="/archive" className="btn">
            Browse the archive
          </Link>
          <Link to="/" className="btn btn--ghost">
            Back home
          </Link>
        </div>
      </div>
    </main>
  )
}
