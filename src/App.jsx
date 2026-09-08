import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Lightbox from './components/Lightbox.jsx'
import Home from './routes/Home.jsx'
import Archive from './routes/Archive.jsx'
import Edition from './routes/Edition.jsx'
import Books from './routes/Books.jsx'
import Writings from './routes/Writings.jsx'
import Subscribe from './routes/Subscribe.jsx'
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
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollToTop />
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/editions/:no" element={<Edition />} />
        <Route path="/books" element={<Books />} />
        <Route path="/writings" element={<Writings />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
      <Lightbox />
    </>
  )
}
