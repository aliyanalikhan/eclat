import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE } from '../data/content.js'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useApp } from '../store.jsx'

const RENEWAL = { monthly: '27 September 2026', annual: '27 August 2027' }

export default function Subscribe() {
  const { plan, setPlan, subscribed, setSubscribed } = useApp()
  const [step, setStep] = useState(subscribed ? 'done' : 'plan')

  useSeo({ ...staticSeo['/subscribe'], path: '/subscribe' })

  const annual = plan === 'annual'
  const total = annual ? `$${SITE.price.annual}.00` : `$${SITE.price.monthly}.00`
  const planLabel = annual ? 'Annual' : 'Monthly'

  // Demo only: flips local state so the unlocked reading view can be previewed.
  // No network request is made and no field value is read.
  const completeDemo = (e) => {
    e.preventDefault()
    setSubscribed(true)
    setStep('done')
    window.scrollTo(0, 0)
  }

  return (
    <main className="page--narrow" id="main">
      {step === 'plan' && (
        <div className="fade-up">
          <p className="eyebrow" style={{ marginBottom: 18 }}>
            Step 1 of 2 — choose a plan
          </p>
          <h1
            className="display"
            style={{ fontSize: 'clamp(36px,5vw,64px)', lineHeight: 1.02, margin: '0 0 12px' }}
          >
            Subscribe to Éclat
          </h1>
          <p className="lede" style={{ margin: '0 0 46px', maxWidth: '52ch', fontSize: 16 }}>
            Full archive, all children&rsquo;s books, every essay, and each new edition as it
            publishes.
          </p>

          <div className="plans" role="group" aria-label="Choose a plan">
            <button
              type="button"
              className="plan"
              aria-pressed={!annual}
              onClick={() => setPlan('monthly')}
            >
              <span className="plan__row">
                <span className="plan__name">Monthly</span>
                <span className="plan__price">${SITE.price.monthly}</span>
              </span>
              <span className="plan__note">Billed monthly. Cancel anytime.</span>
            </button>

            <button
              type="button"
              className="plan"
              aria-pressed={annual}
              onClick={() => setPlan('annual')}
            >
              <span className="plan__row">
                <span className="plan__name">Annual</span>
                <span className="plan__price">${SITE.price.annual}</span>
              </span>
              <span className="plan__note">$7/mo, billed yearly. Two issues free.</span>
            </button>
          </div>

          <div className="total-row">
            <p style={{ fontSize: 15, color: 'var(--muted)' }}>
              Total today <span className="total-row__figure">{total}</span>
            </p>
            <button type="button" className="btn" onClick={() => setStep('pay')}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'pay' && (
        <div className="fade-up" style={{ maxWidth: 560 }}>
          <p className="eyebrow" style={{ marginBottom: 18 }}>
            Step 2 of 2 — payment
          </p>
          <h1
            className="display"
            style={{ fontSize: 'clamp(32px,4.4vw,52px)', lineHeight: 1.04, margin: '0 0 28px' }}
          >
            {planLabel} · {total}
          </h1>

          <div className="demo-notice" role="note">
            <span className="demo-notice__tag">Demo</span>
            <p className="demo-notice__text">
              This is a design demonstration. No payment is taken, the fields below are disabled,
              and nothing you type is collected or transmitted. Continuing simply previews the
              subscriber view of the site.
            </p>
          </div>

          <form onSubmit={completeDemo} noValidate>
            <fieldset className="field-set" disabled aria-label="Payment details (disabled demo)">
              <label className="field">
                Email
                <input type="email" placeholder="you@example.com" autoComplete="off" />
              </label>
              <label className="field">
                Card
                <input type="text" placeholder="•••• •••• •••• ••••" autoComplete="off" />
              </label>
              <div className="field-pair">
                <label className="field">
                  <span className="visually-hidden">Expiry</span>
                  <input type="text" placeholder="MM / YY" autoComplete="off" />
                </label>
                <label className="field">
                  <span className="visually-hidden">Security code</span>
                  <input type="text" placeholder="CVC" autoComplete="off" />
                </label>
              </div>
            </fieldset>

            <div className="step-actions">
              <button type="submit" className="btn">
                Preview subscriber view
              </button>
              <button type="button" className="btn-text" onClick={() => setStep('plan')}>
                Back
              </button>
            </div>
          </form>

          <p className="fine">
            In a live build this step would hand off to a payment provider — card details would
            never be entered on this page.
          </p>
        </div>
      )}

      {step === 'done' && (
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
            You&rsquo;re in.
          </h1>
          <p className="lede" style={{ margin: '0 auto 16px', maxWidth: '44ch' }}>
            The full archive is open. New editions land quarterly.
          </p>
          <p className="fine" style={{ margin: '0 auto 40px', maxWidth: '44ch' }}>
            Demo state only — stored in this browser, and clearable from your account page.
          </p>

          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <Link to="/archive" className="btn">
              Open the archive
            </Link>
            <Link to="/account" className="btn btn--ghost">
              Account
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
