import { Link } from 'react-router-dom'

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
            Books
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

        <div className="footer__fine">
          <span className="footer__copy">&copy; {year} Éclat</span>
          <span className="footer__publisher">Published by Éclat lifestyle LLC, Minnesota, USA</span>
        </div>
      </div>
    </footer>
  )
}
