import { Link } from 'react-router-dom'
import { SITE } from '../data/content.js'

export default function Footer() {
  const year = 2026 // Build-time constant; bump on rebuild rather than drifting per-visitor.
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <div className="footer__mark">ÉCLAT</div>
        </div>

        <nav className="footer__nav" aria-label="Footer">
          <Link to="/archive" className="link-quiet">
            Archive
          </Link>
          <Link to="/books" className="link-quiet">
            Children&rsquo;s Books
          </Link>
          <Link to="/writings" className="link-quiet">
            Writings
          </Link>
          <Link to="/subscribe" className="link-quiet">
            Subscribe
          </Link>
          <Link to="/account" className="link-quiet">
            Account
          </Link>
        </nav>

        <p className="footer__fine">
          &copy; {year} {SITE.name}. Éclat bi-monthly online magazine and the children's books are published by Éclat Life Style LLC.
        </p>
      </div>
    </footer>
  )
}
