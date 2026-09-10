import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Lightbox from './components/Lightbox.jsx'
import Home from './routes/Home.jsx'
import Archive from './routes/Archive.jsx'
import Edition from './routes/Edition.jsx'
import Books from './routes/Books.jsx'
import Writings from './routes/Writings.jsx'
import Videos from './routes/Videos.jsx'
import Subscribe from './routes/Subscribe.jsx'
import SubscribeSuccess from './routes/SubscribeSuccess.jsx'
import Account from './routes/Account.jsx'
import NotFound from './routes/NotFound.jsx'
import './styles/eclat.css'

/** Reset scroll on route change, but not when only the query string moves. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const [authError, setAuthError] = useState(false)
  const { pathname } = useLocation()

  // Reads the `?auth_error=1` param the OAuth callback appends on a
  // failed/denied/cancelled sign-in (D-15). Lives at the shell level (not
  // inside a route) since `return_to` can land the visitor on any page.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('auth_error') === '1') {
      setAuthError(true)
      // Strip the param immediately so a refresh doesn't re-show the notice
      // — this is the notice's only dismissal mechanism (no close button).
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollToTop />
      <Header />

      {authError && (
        <div
          className="demo-notice"
          role="note"
          style={{ margin: '24px auto 32px', maxWidth: 'var(--shell)', padding: '0 var(--gut)' }}
        >
          <span className="demo-notice__tag">Error</span>
          <p className="demo-notice__text">
            Sign-in failed —{' '}
            <a href={`/api/auth/google?return_to=${encodeURIComponent(pathname)}`}>try again</a>.
          </p>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/editions/:no" element={<Edition />} />
        <Route path="/books" element={<Books />} />
        <Route path="/writings" element={<Writings />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/subscribe/success" element={<SubscribeSuccess />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
      <Lightbox />
    </>
  )
}
