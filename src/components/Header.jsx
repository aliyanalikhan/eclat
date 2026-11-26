import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useScrolled } from '../lib/motion.js'
import { useSession } from '../lib/useSession.js'
import { QUERIES } from '../lib/breakpoints.js'

const LINKS = [
  { to: '/archive', label: 'Archive' },
  { to: '/books', label: 'Books' },
  { to: '/writings', label: 'Writings' },
  { to: '/videos', label: 'Videos' },
]

/** Truncates a display name to 18 characters with an ellipsis, falling back
 * to "Account" if the name claim is empty (Copywriting Contract). */
function truncateName(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'Account'
  return trimmed.length > 18 ? `${trimmed.slice(0, 18)}…` : trimmed
}

export default function Header() {
  const scrolled = useScrolled(30)
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { pathname } = useLocation()
  const navId = useId()
  const authMenuId = useId()
  const toggleRef = useRef(null)

  const { user, loading, refetch } = useSession()
  const [authMenuOpen, setAuthMenuOpen] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [signOutState, setSignOutState] = useState('idle') // idle | pending | error
  const authSlotRef = useRef(null)
  const authTriggerRef = useRef(null)

  // Uses canonical nav breakpoint from src/lib/breakpoints.js
  useEffect(() => {
    const mq = window.matchMedia(QUERIES.nav) // bp:nav
    const sync = () => {
      setIsMobile(mq.matches)
      if (!mq.matches) setOpen(false)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Close both the mobile nav and the auth menu whenever the route changes.
  useEffect(() => {
    setOpen(false)
    setAuthMenuOpen(false)
  }, [pathname])

  // Lock body scrolling while the mobile nav drawer is open
  useEffect(() => {
    if (!open || !isMobile) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [open, isMobile])

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

  // A stale avatar-load-failure flag shouldn't survive a different picture URL.
  useEffect(() => setAvatarFailed(false), [user?.picture])

  useEffect(() => {
    if (!authMenuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setAuthMenuOpen(false)
        authTriggerRef.current?.focus()
      }
    }
    const onClickOutside = (e) => {
      if (authSlotRef.current && !authSlotRef.current.contains(e.target)) {
        setAuthMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [authMenuOpen])

  function toggleAuthMenu() {
    setAuthMenuOpen((v) => {
      const next = !v
      if (next) setSignOutState('idle')
      return next
    })
  }

  async function handleSignOut() {
    setSignOutState('pending')
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      if (!res.ok) throw new Error(`logout failed: ${res.status}`)
      setSignOutState('idle')
      setAuthMenuOpen(false)
      refetch()
    } catch {
      setSignOutState('error')
    }
  }

  const navHidden = isMobile && !open
  const displayName = user ? truncateName(user.name) : ''

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

        <nav id={navId} className={`nav${open ? ' is-open' : ''}`} hidden={navHidden} aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className="link-underline">
              {l.label}
            </NavLink>
          ))}
          {/*
            Auth-aware nav slot (D-06): reuses the single "Account" nav
            position rather than adding a second nav item. Renders exactly
            one of three states — an invisible reserved-width placeholder
            while useSession()'s fetch is in flight, a plain <a href> when
            signed out, or a name+avatar disclosure trigger with a sign-out
            menu when signed in (02-UI-SPEC.md Component Notes §1-2). The
            signed-out anchor is a plain <a href> — NOT a React Router
            <Link>/<NavLink> — because /api/* is a serverless function
            route, not a client-side route; React Router would otherwise
            intercept it and render NotFound (Pitfall 1).
          */}
          {loading ? (
            <span className="auth-slot auth-slot--loading" aria-hidden="true" />
          ) : user ? (
            <div className="auth-slot" ref={authSlotRef}>
              <button
                ref={authTriggerRef}
                type="button"
                className="auth-trigger"
                aria-expanded={authMenuOpen}
                aria-controls={authMenuId}
                onClick={toggleAuthMenu}
              >
                {!avatarFailed && user.picture ? (
                  <img
                    className="auth-avatar"
                    src={user.picture}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span className="auth-avatar auth-avatar--fallback" aria-hidden="true">
                    {displayName.charAt(0)}
                  </span>
                )}
                <span className="auth-trigger__name">{displayName}</span>
                <svg
                  className="auth-caret"
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  aria-hidden="true"
                  style={authMenuOpen ? { transform: 'rotate(180deg)' } : undefined}
                >
                  <path
                    d="M1 2.5L4 5.5L7 2.5"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {authMenuOpen && (
                <div id={authMenuId} className="auth-menu" role="menu">
                  <Link
                    to="/account"
                    className="auth-menu__item"
                    role="menuitem"
                    onClick={() => setAuthMenuOpen(false)}
                  >
                    Account
                  </Link>
                  <button
                    type="button"
                    className={`auth-menu__item${signOutState === 'pending' ? ' is-pending' : ''}`}
                    role="menuitem"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                  {signOutState === 'error' && (
                    <p className="auth-menu__error">Couldn&rsquo;t sign out — try again.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="signin-slot">
              <a
                href={`/api/auth/google?return_to=${encodeURIComponent(pathname)}`}
                className="link-underline"
              >
                Sign in
              </a>
              <span className="signin-note">Adds you to our email list</span>
            </span>
          )}
          <Link to="/subscribe" className="btn btn--sm">
            Subscribe
          </Link>
        </nav>
      </div>

      {open && isMobile && (
        <div
          className="nav-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  )
}
