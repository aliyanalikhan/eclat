import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from './App.jsx'
import { AppProvider } from './store.jsx'

/** Called by prerender.js once per route at build time. */
export function render(url) {
  return renderToString(
    <StaticRouter location={url}>
      <AppProvider>
        <App />
      </AppProvider>
    </StaticRouter>,
  )
}
