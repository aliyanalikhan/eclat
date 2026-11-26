import { useEffect, useState } from 'react'

const FALLBACK_ERROR = 'Sorry, we couldn’t sign you up. Please try again.'

/** Home-page email list form. Posts to /api/signup. */
export default function SignupForm() {
  const [status, setStatus] = useState('idle') // idle | pending | done | error
  const [error, setError] = useState('')
  // Disabled until hydrated, so the prerendered form can't submit natively.
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])

  async function onSubmit(e) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    setStatus('pending')
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          consent: data.get('consent') === 'on',
          website: data.get('website'),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || FALLBACK_ERROR)
        setStatus('error')
        return
      }
      form.reset()
      setStatus('done')
    } catch {
      setError(FALLBACK_ERROR)
      setStatus('error')
    }
  }

  return (
    <section className="signup" aria-labelledby="signup-h">
      <h2 className="h2" id="signup-h">
        Stories in your inbox
      </h2>
      <p className="lede">Join the Éclat email list for new editions and stories.</p>
      <form className="signup__form" method="post" onSubmit={onSubmit}>
        <label className="field">
          Email
          <input type="email" name="email" autoComplete="email" maxLength={254} required />
        </label>
        <label className="signup__consent">
          <input type="checkbox" name="consent" required />
          <span>I agree to receive emails from Éclat. I can unsubscribe at any time.</span>
        </label>
        <div className="signup__trap" aria-hidden="true">
          <label>
            Leave this field empty
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <button type="submit" className="btn" disabled={!ready || status === 'pending'}>
          {status === 'pending' ? 'Signing up…' : 'Sign up'}
        </button>
        <p className="signup__msg" role="status">
          {status === 'done' && 'Thank you — you’re on the list.'}
        </p>
        {status === 'error' && (
          <p className="signup__msg signup__msg--error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
