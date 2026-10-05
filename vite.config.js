import { existsSync, readFileSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const distDir = resolve(import.meta.dirname, 'dist')

/**
 * Fallback Stripe product prices used during local development and preview
 * when STRIPE_SECRET_KEY is not configured locally, matching live Stripe values.
 */
const LOCAL_FALLBACK_PRICES = {
  products: {
    'eclat-online': {
      amount: 1499,
      currency: 'usd',
      interval: 'month',
      intervals: {
        monthly: { amount: 1499, currency: 'usd' },
        annual: { amount: 7999, currency: 'usd' },
      },
    },
    'eclat-hardcopy': {
      amount: 2499,
      currency: 'usd',
      interval: 'month',
      intervals: {
        monthly: { amount: 2499, currency: 'usd' },
        annual: { amount: 9999, currency: 'usd' },
      },
    },
    'book-online': {
      amount: 1299,
      currency: 'usd',
      interval: 'month',
      intervals: {
        monthly: { amount: 1299, currency: 'usd' },
        annual: { amount: 6499, currency: 'usd' },
      },
    },
    'book-hardcopy': {
      amount: 3999,
      currency: 'usd',
      interval: 'month',
      intervals: {
        monthly: { amount: 3999, currency: 'usd' },
        annual: { amount: 19999, currency: 'usd' },
      },
    },
  },
}

/**
 * `vite preview` defaults to SPA history fallback, which answers /archive with
 * dist/index.html and hides the prerendered dist/archive/index.html. That makes
 * local preview disagree with every real static host, and shows up as a
 * hydration mismatch. This resolves directory indexes first, then falls back to
 * 404.html with a real 404 status — which is what the hosts do.
 */
function previewStaticSemantics() {
  return {
    name: 'preview-static-semantics',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const [pathname, query] = req.url.split('?')

        // Pass API and Vercel internal routes through to the local API middleware
        if (pathname.startsWith('/api/') || pathname.startsWith('/_vercel/')) {
          return next()
        }

        if (pathname !== '/' && !extname(pathname)) {
          const clean = pathname.replace(/\/+$/, '')
          const candidate = join(distDir, clean, 'index.html')
          if (existsSync(candidate)) {
            req.url = `${clean}/index.html${query ? `?${query}` : ''}`
            return next()
          }

          // Unknown path: serve the prerendered 404 with the right status.
          const notFound = join(distDir, '404.html')
          if (existsSync(notFound)) {
            res.statusCode = 404
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(readFileSync(notFound))
            return
          }
        }

        next()
      })
    },
  }
}

/**
 * Executes serverless API endpoints and stubs platform assets (e.g. Vercel Analytics)
 * locally during both `npm run dev` and `npm run preview`.
 */
function localApiDev() {
  const middleware = async (req, res, next) => {
    // 1. Stub Vercel Analytics script locally so @vercel/analytics doesn't 404 in preview/dev
    if (req.url.startsWith('/_vercel/')) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end('/* @vercel/analytics local dev stub */')
      return
    }

    // 2. Auth session endpoint: return signed-out state { user: null } in local dev/preview
    if (req.url.startsWith('/api/auth/session')) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify({ user: null }))
      return
    }

    // 3. Billing prices endpoint
    if (req.url.startsWith('/api/billing/prices')) {
      try {
        if (!process.env.STRIPE_SECRET_KEY && existsSync('.env.local')) {
          const envContent = readFileSync('.env.local', 'utf-8')
          for (const line of envContent.split('\n')) {
            const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/)
            if (match && !process.env[match[1]]) {
              process.env[match[1]] = match[2]?.trim().replace(/^['"](.*)['"]$/, '$1')
            }
          }
        }
        if (process.env.STRIPE_SECRET_KEY) {
          const pricesHandler = await import('./api/billing/prices.js')
          const response = await pricesHandler.default.fetch(
            new Request(`http://${req.headers.host || 'localhost'}${req.url}`, {
              method: req.method,
              headers: req.headers,
            })
          )
          res.statusCode = response.status
          response.headers.forEach((val, key) => res.setHeader(key, val))
          const body = await response.text()
          res.end(body)
          return
        }
      } catch (err) {
        console.error('Local API dev error (/api/billing/prices):', err)
      }

      // Fallback prices when STRIPE_SECRET_KEY is not configured locally or offline
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify(LOCAL_FALLBACK_PRICES))
      return
    }

    // 4. Billing status endpoint (401 unauthenticated with empty subscriptions)
    if (req.url.startsWith('/api/billing/status')) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify({ subscriptions: {} }))
      return
    }

    // 5. Billing account endpoint (401 unauthenticated)
    if (req.url.startsWith('/api/billing/account')) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify({ error: 'unauthorized' }))
      return
    }

    next()
  }

  return {
    name: 'local-api-dev',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig({
  plugins: [react(), previewStaticSemantics(), localApiDev()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
  server: { port: 5173, open: true },
  preview: { port: 4173 },
})
