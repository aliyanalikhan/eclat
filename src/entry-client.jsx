import { StrictMode } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppProvider } from './store.jsx'

const tree = (
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>
)

const el = document.getElementById('root')

// Prerendered HTML is present in production, so hydrate it; in dev there is
// nothing to hydrate and we mount fresh.
if (el.hasChildNodes() && el.dataset.prerendered === 'true') {
  hydrateRoot(el, tree)
} else {
  createRoot(el).render(tree)
}
