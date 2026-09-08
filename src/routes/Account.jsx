import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { invoices } from '../data/content.js'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useSession } from '../lib/useSession.js'
import { useApp } from '../store.jsx'

const RENEWAL = { monthly: '27 September 2026', annual: '27 August 2027' }

export default function Account() {
  const { user, loading } = useSession()
  const { subscribed, setSubscribed, plan } = useApp()

  useSeo({ ...staticSeo['/account'], path: '/account' })

  // Signed out, or the session-check request itself failed — fail closed
  // in both cases (D-09): never render the mocked page content, always
  // send the visitor back into sign-in via a plain navigation. Performed
  // in an effect, not during render (WR-04) — render must stay pure, and
  // window.location.assign is a side effect that could otherwise fire
  // twice under Strict Mode's dev-time double-invocation or be started
  // and discarded under concurrent rendering.
  useEffect(() => {
    if (!loading && !user) {
      window.location.assign('/api/auth/google?return_to=/account')
    }
  }, [loading, user])

  if (loading) {
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

  const annual = plan === 'annual'
  const planLabel = subscribed ? (annual ? 'Annual' : 'Monthly') : '—'
  // The prototype had `subscribed || true` here, which always showed billing
  // history even on the free tier. Gated properly now.
  const rows = subscribed ? invoices : []

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

        <div className="panel">
          <div>
            <p className="panel__key">Status</p>
            <p className="panel__val">
              <span
                className="status-dot"
                style={{ background: subscribed ? 'var(--ok)' : 'var(--accent)' }}
              />
              {subscribed ? 'Active' : 'Free tier'}
            </p>
          </div>
          <div>
            <p className="panel__key">Plan</p>
            <p className="panel__val">{planLabel}</p>
          </div>
          <div>
            <p className="panel__key">Renews</p>
            <p className="panel__val">{subscribed ? RENEWAL[plan] : '—'}</p>
          </div>
          <div>
            <p className="panel__key">Card</p>
            <p className="panel__val">{subscribed ? '•••• 4242' : '—'}</p>
          </div>
        </div>

        {!subscribed && (
          <div className="upsell">
            <p className="upsell__text">
              You&rsquo;re on the free tier — covers and previews only. Subscribe to open the
              full issue.
            </p>
            <Link to="/subscribe" className="btn btn--sm btn--accent">
              Subscribe
            </Link>
          </div>
        )}

        <h2 className="h2" style={{ fontSize: 30, margin: '66px 0 0' }}>
          Billing history
        </h2>

        {rows.length === 0 ? (
          <p className="empty" style={{ paddingBottom: 0 }}>
            No invoices yet.
          </p>
        ) : (
          <div className="invoices">
            {rows.map((v) => (
              <div className="invoice" key={v.date}>
                <span className="invoice__date">{v.date}</span>
                <span className="invoice__desc">{v.desc}</span>
                <span>{v.amount}</span>
                <Link to="/account" className="invoice__link">
                  Receipt →
                </Link>
              </div>
            ))}
          </div>
        )}

        {subscribed && (
          <div style={{ marginTop: 46, paddingTop: 26, borderTop: '1px solid var(--line)' }}>
            <p className="fine" style={{ margin: '0 0 14px' }}>
              This site stores its subscriber state in your browser for demonstration purposes.
            </p>
            <button type="button" className="btn-text" onClick={() => setSubscribed(false)}>
              Reset demo state
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
