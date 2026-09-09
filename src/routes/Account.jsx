import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { invoices } from '../data/content.js'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useSession } from '../lib/useSession.js'
import { useEntitlements } from '../lib/useEntitlements.js'

export default function Account() {
  const { user, loading } = useSession()
  const { subs, loading: entitlementsLoading, error } = useEntitlements()

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

  // Extended to also cover entitlement loading (04-UI-SPEC) — the panel
  // never renders until BOTH session and entitlement are resolved, so
  // there is no intermediate flash of "Free tier" before "Active" (or the
  // reverse) once the real subscription state arrives.
  if (loading || entitlementsLoading) {
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

  // Real server-side entitlement (D-06/GATE-02): only a live 'active'
  // eclat-online subscriptions row counts. Fails closed to Free-tier
  // presentation on any fetch error, exactly like the not-entitled case —
  // never assumes ownership on an uncertain outcome.
  const sub = subs['eclat-online']
  const active = Boolean(!error && sub && sub.status === 'active')
  // Real plan metadata (monthly vs. annual, renewal date, card on file) is
  // Phase 5's ACCT-01/ACCT-04 concern — this fails closed to '—' for now.
  const planLabel = '—'
  const rows = active ? invoices : []

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
                style={{ background: active ? 'var(--ok)' : 'var(--accent)' }}
              />
              {active ? 'Active' : 'Free tier'}
            </p>
          </div>
          <div>
            <p className="panel__key">Plan</p>
            <p className="panel__val">{planLabel}</p>
          </div>
          <div>
            <p className="panel__key">Renews</p>
            <p className="panel__val">—</p>
          </div>
          <div>
            <p className="panel__key">Card</p>
            <p className="panel__val">{active ? '•••• 4242' : '—'}</p>
          </div>
        </div>

        {!active && (
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
      </div>
    </main>
  )
}
