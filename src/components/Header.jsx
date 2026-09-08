import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useScrolled } from '../lib/motion.js'

const LINKS = [
  { to: '/archive', label: 'Archive' },
  { to: '/books', label: "Children's Books" },
  { to: '/writings', label: 'Writings' },
  { to: '/account', label: 'Account' },
]

export default function Header() {
  const scrolled = useScrolled(30)
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { pathname } = useLocation()
  const navId = useId()
  const toggleRef = useRef(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = () => {
      setIsMobile(mq.matches)
      if (!mq.matches) setOpen(false)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Close the menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const navHidden = isMobile && !open

  return (
    <header className={`header${scrolled ? ' header--scrolled' : ''}`}>
      <div className="header__inner">
        <Link to="/" className="wordmark" aria-label="Éclat — home">
          ÉCLAT
        </Link>

        <button
          ref={toggleRef}
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls={navId}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            {open ? (
              <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="6" y1="6" x2="20" y2="20" />
                <line x1="20" y1="6" x2="6" y2="20" />
              </g>
            ) : (
              <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="4" y1="9" x2="22" y2="9" />
                <line x1="4" y1="17" x2="22" y2="17" />
              </g>
            )}
          </svg>
        </button>

        <nav id={navId} className="nav" hidden={navHidden} aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className="link-underline">
              {l.label}
            </NavLink>
          ))}
          <Link to="/subscribe" className="btn btn--sm">
            Subscribe
          </Link>
        </nav>
      </div>
    </header>
  )
}
