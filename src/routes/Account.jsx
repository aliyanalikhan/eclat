import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useSession } from '../lib/useSession.js'
import { useEntitlements } from '../lib/useEntitlements.js'
import { useAccount } from '../lib/useAccount.js'
import { PRODUCTS, productName } from '../data/products.js'

// 3-state status map (D-02/D-16, 05-UI-SPEC §1). Wave 1 only ever emits
// these three statuses; an unknown value fails closed to '—' with no dot.
const STATUS = {
  active: { dot: 'var(--ok)', label: 'Active' },
  past_due: { dot: 'var(--bad)', label: 'Past due' },
  canceled: { dot: 'var(--accent)', label: 'Canceled' },
}

// Shared formatter — 'D MMM YYYY', e.g. '12 Aug 2026', no comma, day before
// month (matches the mock invoice format exactly, 05-UI-SPEC §1).
const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export default function Account() {
  const { user, loading } = useSession()
  // Entitlements contribute ONLY its loading flag to the page gate
  // (05-UI-SPEC §6) — account data comes exclusively from useAccount().
  const { loading: entitlementsLoading } = useEntitlements()
  const { loading: accountLoading, data, error: accountError } = useAccount()

  useSeo({ ...staticSeo['/account'], path: '/account' })

  // Signed out, or the session-check request itself failed — fail closed
  // in both cases (D-09): never render account content, always send the
  // visitor back into sign-in via a plain navigation. Performed in an
  // effect, not during render (WR-04).
  useEffect(() => {
    if (!loading && !user) {
      window.location.assign('/api/auth/google?return_to=/account')
    }
  }, [loading, user])

  // Extended gate (05-UI-SPEC §6): no panel/CTA/invoice content renders
  // until session, entitlements, AND the account fetch have all resolved —
  // no intermediate flash of stale state.
  if (loading || entitlementsLoading || accountLoading) {
    return (
      <main className="page--narrow" id="main">
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p className="eyebrow">Checking your session…</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  // Portal CTA (WR-06): never an anchor or popup. POST the fixed
  // { action } enum, then assign the server-returned URL. A non-ok response
  // is a no-op — the DB-driven page state stays on screen (D-04). Returning
  // to /account remounts the route → fresh useAccount fetch (D-06 §7).
  async function openPortal(action) {
    const res = await fetch('/api/billing/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (!res.ok) return
    const { url } = await res.json()
    window.location.assign(url)
  }

  const subs = data.subscriptions
  // Fixed D-16 order: PRODUCTS array order IS the display order (eclat-online
  // first). Unknown slugs in the payload are ignored (Wave 1 skips them too).
  const heldKeys = PRODUCTS.map((p) => p.key).filter((key) => subs[key])

  // Invoices: one table across ALL held products (D-12). Best-effort section:
  // if ANY held product reports invoices unavailable, degrade the table to the
  // contract message while panels still render (D-04).
  const invoicesUnavailable = heldKeys.some(
    (key) => subs[key].invoices && subs[key].invoices.available === false
  )
  // The server intentionally assigns the SAME shared invoice list to every
  // held product key (one Stripe customer, one invoice list — see
  // api/billing/account.js Section C) — read it from a single held key
  // rather than combining every held product's copy, which would just
  // duplicate the identical list once per held product.
  const invoiceItems = ((subs[heldKeys[0]] && subs[heldKeys[0]].invoices && subs[heldKeys[0]].invoices.items) || [])
    .slice() // defensive shallow copy — never mutate the underlying payload
    .sort((a, b) => b.created - a.created) // most-recent-first (D-10)
    .slice(0, 12) // cap at 12 rows (D-09)

  return (
    <main className="page--narrow" id="main">
      <div className="fade-up">
        <p className="eyebrow" style={{ marginBottom: 18 }}>
          Account
        </p>
        <h1
          className="display"
          style={{ fontSize: 'clamp(34px,5vw,64px)', lineHeight: 1.02, margin: '0 0 44px' }}
        >
          Reader since 2021
        </h1>

        {accountError ? (
          // Whole-page fail-closed (Copywriting Contract, mirrors Edition.jsx
          // D-13): an unknown outcome NEVER renders the no-subscription notice.
          <p className="fine" style={{ color: 'var(--bad)' }}>
            Couldn't confirm your account — reload to try again.
          </p>
        ) : (
          <>
            {heldKeys.length === 0 ? (
              // Zero-held case (05-UI-SPEC §5): generalized notice + CTA; the
              // Billing history section still renders below.
              <div className="upsell">
                <p className="upsell__text">
                  You don't have an active subscription yet. Subscribe to unlock full issues,
                  books, and more.
                </p>
                <Link to="/subscribe" className="btn btn--sm btn--accent">
                  Subscribe
                </Link>
              </div>
            ) : (
              // Per-product panels in fixed D-16 order, held products only (§1).
              heldKeys.map((key, i) => {
                const sub = subs[key]
                const product = PRODUCTS.find((p) => p.key === key)
                const state = STATUS[sub.status]
                // D-14: "Access until" when the sub is canceled OR still
                // active but scheduled not to renew (cancelAtPeriodEnd,
                // fetched live from Stripe in api/billing/account.js).
                const renewsKey =
                  sub.status === 'canceled' || sub.cancelAtPeriodEnd ? 'Access until' : 'Renews'
                const brand = sub.card && sub.card.brand
                const card =
                  sub.card && sub.card.available && sub.card.brand && sub.card.last4
                    ? `${brand[0].toUpperCase()}${brand.slice(1)} •••• ${sub.card.last4}`
                    : '—' // silent degradation (D-15) — no error copy

                return (
                  <div key={key}>
                    <p
                      className="eyebrow"
                      style={{ marginBottom: 20, ...(i > 0 ? { marginTop: 40 } : {}) }}
                    >
                      {productName(key)}
                    </p>
                    <div className="panel">
                      <div>
                        <p className="panel__key">Status</p>
                        <p className="panel__val">
                          {state ? (
                            <>
                              <span className="status-dot" style={{ background: state.dot }} />
                              {state.label}
                            </>
                          ) : (
                            '—'
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="panel__key">Plan</p>
                        <p className="panel__val">{sub.planLabel || '—'}</p>
                      </div>
                      <div>
                        <p className="panel__key">{renewsKey}</p>
                        <p className="panel__val">{sub.renews || '—'}</p>
                      </div>
                      <div>
                        <p className="panel__key">Card</p>
                        <p className="panel__val">{card}</p>
                      </div>
                    </div>

                    {/* CR-03 confirmation notice: still-active but scheduled
                        not to renew — positive acknowledgement that a
                        cancellation was received. The "Manage" CTA below is
                        deliberately NOT suppressed for this state: Stripe's
                        hosted portal is the only path to reverse a pending
                        cancellation (suppressing it would recreate a WR-01
                        dead end). */}
                    {sub.cancelAtPeriodEnd && sub.status !== 'canceled' && (
                      <p className="fine" style={{ marginTop: 12 }}>
                        Your subscription won't renew and will end on{' '}
                        {sub.renews || 'the current period end'}.
                      </p>
                    )}

                    {/* State-aware CTA row (§2, D-08): active/past_due → Manage;
                        canceled → no CTA; never a dead-end upsell CTA (WR-01). */}
                    {sub.status !== 'canceled' && (
                      <div style={{ marginTop: 24 }}>
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => openPortal('manage')}
                        >
                          Manage
                        </button>
                      </div>
                    )}

                    {/* ACCT-04 notice (§3, D-08): past_due only; .demo-notice
                        classes verbatim with --bad inline overrides (zero new
                        CSS, Phase 4 precedent). */}
                    {sub.status === 'past_due' && (
                      <div
                        className="demo-notice"
                        role="note"
                        style={{
                          borderColor: 'var(--bad)',
                          background: 'color-mix(in srgb, var(--bad) 7%, transparent)',
                          margin: '24px 0 0',
                        }}
                      >
                        <span className="demo-notice__tag" style={{ background: 'var(--bad)' }}>
                          Payment failed
                        </span>
                        <p className="demo-notice__text">
                          We couldn't process your last payment. Update your card to keep your
                          subscription active.
                        </p>
                        <button
                          type="button"
                          className="btn btn--sm"
                          style={{ marginLeft: 'auto', flex: '0 0 auto' }}
                          onClick={() => openPortal('payment_method_update')}
                        >
                          Update payment method
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}

            <h2 className="h2" style={{ fontSize: 30, margin: '66px 0 0' }}>
              Billing history
            </h2>

            {invoicesUnavailable ? (
              // Invoices-only degradation (D-04): panels above still render.
              <p className="fine" style={{ color: 'var(--bad)' }}>
                Invoice history is temporarily unavailable.
              </p>
            ) : invoiceItems.length === 0 ? (
              <p className="empty" style={{ paddingBottom: 0 }}>
                No invoices yet.
              </p>
            ) : (
              <div className="invoices">
                {invoiceItems.map((item) => {
                  const { number, created, amount_paid, hosted_invoice_url } = item
                  return (
                    <div className="invoice" key={number}>
                      <span className="invoice__date">
                        {DATE_FMT.format(new Date(created * 1000))}
                      </span>
                      <span>{number}</span>
                      <span>{'$' + (amount_paid / 100).toFixed(2)}</span>
                      <a
                        href={hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="invoice__link"
                      >
                        Receipt →
                      </a>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
