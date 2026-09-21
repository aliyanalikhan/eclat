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
 * Mocks the Vercel API locally for the frontend to consume during `npm run dev`.
 */
function mockLocalApi() {
  return {
    name: 'mock-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/api/content/editions/')) {
          const no = Number(req.url.split('/').pop())
          try {
            const { gatedParagraphsFor } = await import('./lib/gated-content.js')
            const paragraphs = gatedParagraphsFor(no)
            if (paragraphs) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ entitled: true, content: { paragraphs } }))
              return
            }
          } catch (err) {
            console.error('Error in mock API:', err)
          }
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), previewStaticSemantics(), mockLocalApi()],
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
