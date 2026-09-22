import { existsSync, readFileSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const distDir = resolve(import.meta.dirname, 'dist')

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
 * Executes serverless API endpoints locally during `npm run dev`.
 */
function localApiDev() {
  return {
    name: 'local-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
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
          } catch (err) {
            console.error('Local API dev error (/api/billing/prices):', err)
          }
        }

        if (req.url.startsWith('/api/billing/status')) {
          res.statusCode = 401
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify({ subscriptions: {} }))
          return
        }

        next()
      })
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
