/**
 * Build step 5 — scan the final dist/ output for leaked server secrets.
 *
 * This is the last line of defense before dist/ is deployed to a public CDN
 * (Phase 1 CONTEXT.md D-13/D-14/D-15). It checks for EXACT VALUES of tracked
 * server secret env vars, not prefix/pattern matching (e.g. `sk_live_`,
 * `whsec_`) — pattern matching risks false positives on unrelated strings
 * that merely look like a secret. Exact-value matching only flags an actual
 * leak of a real, currently-set secret. It also checks a couple of common
 * encoded variants (URL-encoded, JSON-escaped) since a connection string can
 * end up serialized that way without ever appearing byte-for-byte verbatim.
 *
 * Runs as the final step of `npm run build`, after prerender.js, so it scans
 * the complete dist/ contents (prerendered HTML included, not just the Vite
 * JS bundle) every time a build happens — not only in the Vercel deploy
 * pipeline — so a leak is caught locally the moment it occurs.
 *
 * On finding a leak, this prints WHICH env var leaked and WHERE, but never
 * the secret's own value, to avoid further exposing it in CI/terminal logs.
 *
 * The tracked var list is derived from .env.example rather than hardcoded,
 * so a future phase that adds a new secret there is automatically covered —
 * minus a small allowlist of vars that are intentionally public (OAuth
 * client IDs are not secrets).
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dist = resolve(here, '..', 'dist')
const envExamplePath = resolve(here, '..', '.env.example')

// Vars documented in .env.example that are intentionally public, not secret.
const KNOWN_PUBLIC_VAR_NAMES = new Set([
  'GOOGLE_CLIENT_ID',
  'GOOGLE_REDIRECT_URI',
  // PUBLIC_ORIGIN is the site's own canonical origin (WR-07) — public by
  // definition, exactly like the OAuth client ID/redirect URI above.
  'PUBLIC_ORIGIN',
])

async function trackedVarNamesFromEnvExample() {
  const text = await readFile(envExamplePath, 'utf8')
  const names = []
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=/)
    if (m && !KNOWN_PUBLIC_VAR_NAMES.has(m[1])) names.push(m[1])
  }
  return names
}

// WR-10: server-only lib/ modules each carry a unique, recognizable marker
// (their fail-fast error text, or a real Stripe product ID from the
// allowlist) that must never appear in client-bundled JS. If any does, that
// module — which reads process.env secrets at import time — got imported
// into client code despite the SERVER-ONLY contract (T-01-01). Full error
// strings, not bare env var names, avoid false positives on unrelated text
// that merely mentions a name.
const SERVER_ONLY_IMPORT_MARKERS = [
  // lib/db.js — POSTGRES_URL fail-fast text.
  'Provision Vercel Postgres and run `vercel env pull .env.local`',
  // lib/stripe.js — STRIPE_SECRET_KEY fail-fast text.
  'STRIPE_SECRET_KEY is not set. Pull it with `vercel env pull .env.local`',
  // lib/products.js — a real Stripe product ID from the allowlist would
  // only reach the client bundle if lib/products.js itself leaked.
  'prod_VAyHWfX8XdHh2z',
  // lib/gated-content.js — a gated edition paragraph, unique to that
  // server-only module, would only reach the client bundle if the D-02
  // bundling leak this phase fixes were ever reintroduced (D-11).
  'the work of decades, not quarters',
]
const CLIENT_BUNDLE_DIR = join(dist, 'assets')

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
  const trackedVarNames = await trackedVarNamesFromEnvExample()
  const tracked = trackedVarNames.map((name) => ({ name, value: process.env[name] })).filter(
    ({ value }) => value !== undefined && value !== '',
  )

  // For each secret value, also check the URL-encoded and JSON-escaped forms
  // it might take once serialized — a byte-for-byte-only check would miss
  // those even though the secret is genuinely present and extractable.
  const variantsFor = (value) => {
    const variants = new Set([value, encodeURIComponent(value), JSON.stringify(value).slice(1, -1)])
    return [...variants]
  }

  const files = await walk(dist)
  let leaked = false

  for (const file of files) {
    const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
    if (SKIP_EXTENSIONS.has(ext)) continue

    const content = await readFile(file, 'utf8')
    for (const { name, value } of tracked) {
      if (variantsFor(value).some((v) => content.includes(v))) {
        const relPath = relative(dist, file)
        console.error(`check-secrets: ${name} found in ${relPath}`)
        leaked = true
      }
    }

    // Import-boundary check (T-01-01, WR-10): lib/db.js, lib/stripe.js and
    // lib/products.js are server-only and must never end up in the client
    // bundle. If one did, its marker would be recognizable in the bundled
    // JS even after minification (string literals are never stripped).
    if (file.startsWith(CLIENT_BUNDLE_DIR)) {
      for (const marker of SERVER_ONLY_IMPORT_MARKERS) {
        if (content.includes(marker)) {
          const relPath = relative(dist, file)
          console.error(`check-secrets: a server-only lib module appears to be bundled into client code at ${relPath} (server-only import boundary violated)`)
          leaked = true
        }
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
