/**
 * Build step 5 — scan the final dist/ output for leaked server secrets.
 *
 * This is the last line of defense before dist/ is deployed to a public CDN
 * (Phase 1 CONTEXT.md D-13/D-14/D-15). It checks for EXACT VALUES of tracked
 * server secret env vars, not prefix/pattern matching (e.g. `sk_live_`,
 * `whsec_`) — pattern matching risks false positives on unrelated strings
 * that merely look like a secret. Exact-value matching only flags an actual
 * leak of a real, currently-set secret.
 *
 * Runs as the final step of `npm run build`, after prerender.js, so it scans
 * the complete dist/ contents (prerendered HTML included, not just the Vite
 * JS bundle) every time a build happens — not only in the Vercel deploy
 * pipeline — so a leak is caught locally the moment it occurs.
 *
 * On finding a leak, this prints WHICH env var leaked and WHERE, but never
 * the secret's own value, to avoid further exposing it in CI/terminal logs.
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dist = resolve(here, '..', 'dist')

// Tracked server secrets — per Phase 1 CONTEXT.md D-13, exactly these 6.
const TRACKED_VAR_NAMES = [
  'GOOGLE_CLIENT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SESSION_SECRET',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
]

// Binary/image/font assets never contain leaked text secrets and reading
// them as utf8 would be both wasteful and meaningless — skip by extension.
const SKIP_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf'])

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(full)))
    } else if (entry.isFile()) {
      files.push(full)
    }
  }
  return files
}

async function main() {
  const tracked = TRACKED_VAR_NAMES.map((name) => ({ name, value: process.env[name] })).filter(
    ({ value }) => value !== undefined && value !== '',
  )

  const files = await walk(dist)
  let leaked = false

  for (const file of files) {
    const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
    if (SKIP_EXTENSIONS.has(ext)) continue

    const content = await readFile(file, 'utf8')
    for (const { name, value } of tracked) {
      if (content.includes(value)) {
        const relPath = relative(dist, file)
        console.error(`check-secrets: ${name} found in ${relPath}`)
        leaked = true
      }
    }
  }

  if (leaked) {
    process.exit(1)
  }

  console.log('check-secrets: no leaked secrets found in dist/')
}

main().catch((err) => {
  console.error('check-secrets failed:', err)
  process.exit(1)
})
