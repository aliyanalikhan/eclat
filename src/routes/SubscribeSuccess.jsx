import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { productKind, productName } from '../data/products.js'

// D-06/D-07: this view has three states — confirming, success, timeout.
// Only an OBSERVED webhook-synced subscriptions row with status
// 'active'/'trialing' may flip it to success. A plain visit to this URL, or
// the Checkout success redirect alone, must never grant the unlocked view
// — the redirect only gets a visitor here, it carries no entitlement of its
// own. Polling never stops on timeout: a late webhook still flips the view
// while the route stays mounted.
const POLL_INTERVAL_MS = 2000
const TIMEOUT_MS = 25000

// SSR-safe: prerender.js renders this route at build time with no `window`
// (src/entry-server.jsx). The prerendered output always shows the initial
// 'confirming' state regardless (see state below), so a null productKey
// during SSR is harmless — the real value is read once hydrated.
function getProductKeyFromUrl() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('product')
}

export default function SubscribeSuccess() {
  const [productKey] = useState(getProductKeyFromUrl)
  const name = productName(productKey)
  const kind = productKind(productKey)

  const [state, setState] = useState('confirming')

  useSeo({ ...staticSeo['/subscribe/success'], path: '/subscribe/success' })

  useEffect(() => {
    let cancelled = false
    let interval

    const checkStatus = () => {
      fetch('/api/billing/status')
        .then((res) => res.json())
        .then((body) => {
          if (cancelled) return
          const record = (body.subscriptions || {})[productKey]
          const active = record && (record.status === 'active' || record.status === 'trialing')
          if (active) {
            // WR-09: once success is reached there is nothing left to poll
            // for — stop the interval instead of firing every 2s forever.
            // The 'timeout' state intentionally keeps polling (a late
            // webhook can still flip the view while the route is mounted).
            if (interval) clearInterval(interval)
            setState('success')
          }
        })
        .catch(() => {
          // Fail closed — a failed poll never flips the view; it just
          // tries again on the next interval tick (D-07).
        })
    }

    checkStatus()
    interval = setInterval(checkStatus, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [productKey])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setState((s) => (s === 'confirming' ? 'timeout' : s))
    }, TIMEOUT_MS)
    return () => clearTimeout(timeout)
  }, [])

  if (state === 'success') {
    return (
      <main className="page--narrow" id="main">
        <div className="done fade-up">
          <svg
            viewBox="0 0 60 60"
            width="72"
            height="72"
            style={{ margin: '0 auto 30px' }}
            aria-hidden="true"
          >
            <circle cx="30" cy="30" r="28" fill="none" stroke="rgba(22,19,15,0.16)" strokeWidth="1" />
            <path
              className="tick-path"
              d="M18 31 L27 39 L43 22"
              fill="none"
              stroke="oklch(0.56 0.14 38)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="60"
            />
          </svg>

          <h1
            className="display"
            style={{ fontSize: 'clamp(34px,5vw,64px)', lineHeight: 1.02, margin: '0 0 16px' }}
          >
            You're subscribed.
          </h1>
          <p className="lede" style={{ margin: '0 auto 40px', maxWidth: '44ch' }}>
            {kind === 'hardcopy'
              ? `${name} is confirmed — the first issue ships with your next billing cycle.`
              : `${name} is now open.`}
          </p>

          <div className="btn-row" style={{ justifyContent: 'center' }}>
            {kind === 'hardcopy' ? (
              <Link to="/account" className="btn">
                Go to your account
              </Link>
            ) : (
              <>
                <Link to="/archive" className="btn">
                  Browse the archive
                </Link>
                <Link to="/books" className="btn btn--ghost">
                  Browse the books
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    )
  }

  if (state === 'timeout') {
    return (
      <main className="page--narrow" id="main">
        <div className="done fade-up">
          <h1
            className="display"
            style={{
              fontSize: 'clamp(34px,5vw,64px)',
              lineHeight: 1.02,
              margin: '0 0 16px',
              color: 'var(--bad)',
            }}
          >
            This is taking longer than expected.
          </h1>
          <p className="lede" style={{ margin: '0 auto 40px', maxWidth: '48ch' }}>
            Check your email for a receipt, or <Link to="/account">view your account</Link> — this
            page will keep checking in the background.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="page--narrow" id="main">
      <div className="done fade-up">
        <span
          className="dot"
          style={{ width: 14, height: 14, margin: '0 auto 30px', display: 'block' }}
          aria-hidden="true"
        />
        <h1
          className="display"
          style={{ fontSize: 'clamp(34px,5vw,64px)', lineHeight: 1.02, margin: '0 0 16px' }}
        >
          Confirming your subscription…
        </h1>
        <p className="lede" style={{ margin: '0 auto 40px', maxWidth: '44ch' }}>
          This usually takes a few seconds.
        </p>
      </div>
    </main>
  )
}
