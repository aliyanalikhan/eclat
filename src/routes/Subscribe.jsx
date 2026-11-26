import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useEntitlements } from '../lib/useEntitlements.js'
import { PRODUCTS } from '../data/products.js'

function formatAmount(amount) {
  if (typeof amount !== 'number') return null
  return `$${(amount / 100).toFixed(2)}`
}

/**
 * A single product tile. Owns its own monthly/annual interval toggle
 * (independent per tile, D-05) and reads its live price/ownership state
 * from props — never from a client constant (BILL-02) and never treats
 * ownership as more than a render hint (D-04).
 */
function ProductTile({ product, priceInfo, pricesLoading, subs, preselected, setTileRef }) {
  const [interval, setInterval_] = useState('monthly')
  const record = subs[product.key]
  // WR-01: past_due subscribers are already entitled server-side (the D-04
  // re-check in api/billing/checkout.js includes past_due), so they must see
  // "Subscribed" + "Manage" (→ /account to fix billing) — never a dead-end
  // "Subscribe" button that redirects silently back here.
  const owned = !!record && ['active', 'trialing', 'past_due'].includes(record.status)

  const intervalData = priceInfo?.intervals?.[interval]
  const priceLabel = intervalData ? formatAmount(intervalData.amount) : null
  const showSkeleton = pricesLoading || !priceLabel

  const checkoutHref = `/api/billing/checkout?product=${product.key}&interval=${interval}`

  return (
    <div
      className="plan"
      ref={setTileRef}
      style={{
        position: 'relative',
        ...(preselected ? { border: '2px solid var(--accent)' } : {}),
      }}
    >
      {owned && <span className="plan__badge">Subscribed</span>}

      <span className="plan__row">
        <span className="plan__name">{product.name}</span>
        <span className="plan__price">
          {showSkeleton ? <span className="plan__skeleton" aria-hidden="true" /> : priceLabel}
        </span>
      </span>

      <span className="plan__interval">
        <span className="chips" role="group" aria-label={`${product.name} billing interval`}>
          <button
            type="button"
            className="chip"
            aria-pressed={interval === 'monthly'}
            onClick={() => setInterval_('monthly')}
          >
            Bi-monthly
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={interval === 'annual'}
            onClick={() => setInterval_('annual')}
          >
            Annual
          </button>
        </span>
      </span>

      <span className="plan__note">
        {owned ? (
          <Link to="/account" className="btn btn--ghost">
            Manage
          </Link>
        ) : (
          <a href={checkoutHref} className="btn">
            Subscribe
          </a>
        )}
      </span>
    </div>
  )
}

export default function Subscribe() {
  const { subs, error: entitlementsError } = useEntitlements()
  const [prices, setPrices] = useState({})
  const [pricesLoading, setPricesLoading] = useState(true)
  const [pricesError, setPricesError] = useState(false)
  const [preselectKey, setPreselectKey] = useState(null)
  const [checkoutError, setCheckoutError] = useState(false)
  const tileRefs = useRef({})

  useSeo({ ...staticSeo['/subscribe'], path: '/subscribe' })

  useEffect(() => {
    let cancelled = false
    fetch('/api/billing/prices')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return
        setPrices(body.products || {})
        setPricesError(false)
        setPricesLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setPrices({})
        setPricesError(true)
        setPricesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // D-08: a ?product= preselect only highlights + scrolls to a tile — it
  // never auto-starts checkout. api/billing/checkout.js independently
  // re-validates the slug and subscription state server-side regardless.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const key = params.get('product')
    if (key && PRODUCTS.some((p) => p.key === key)) {
      setPreselectKey(key)
      const node = tileRefs.current[key]
      if (node) node.scrollIntoView({ block: 'center' })
    }
    if (params.get('checkout_error') === '1') {
      setCheckoutError(true)
    }
  }, [])

  const showEntitlementNotice = entitlementsError || pricesError

  return (
    <main className="page--narrow" id="main">
      <div className="fade-up">
        <p className="eyebrow" style={{ marginBottom: 18 }}>
          Subscribe
        </p>
        <h1
          className="display"
          style={{ fontSize: 'clamp(36px,5vw,64px)', lineHeight: 1.02, margin: '0 0 12px' }}
        >
          Subscribe to Éclat
        </h1>
        <p className="lede" style={{ margin: '0 0 16px', maxWidth: '52ch', fontSize: 16 }}>
          Full archive, all books, every essay, and each new edition as it
          publishes.
        </p>

        {showEntitlementNotice && (
          <p className="fine" style={{ fontSize: 13, color: 'var(--faint)', margin: '0 0 30px' }}>
            Couldn't confirm your current plans — refresh to check.
          </p>
        )}

        {checkoutError && (
          <div
            className="demo-notice"
            role="note"
            style={{
              borderColor: 'var(--bad)',
              background: 'color-mix(in srgb, var(--bad) 7%, transparent)',
              marginBottom: 30,
            }}
          >
            <span className="demo-notice__tag" style={{ background: 'var(--bad)' }}>
              Error
            </span>
            <p className="demo-notice__text">
              Something went wrong starting checkout — try again.
            </p>
          </div>
        )}

        <div className="plans" role="group" aria-label="Choose a product">
          {PRODUCTS.map((product) => (
            <ProductTile
              key={product.key}
              product={product}
              priceInfo={prices[product.key]}
              pricesLoading={pricesLoading}
              subs={subs}
              preselected={preselectKey === product.key}
              setTileRef={(node) => {
                tileRefs.current[product.key] = node
              }}
            />
          ))}
        </div>
        <p className="fine">Signing in with Google adds you to our email list.</p>
      </div>
    </main>
  )
}
