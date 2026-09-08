/**
 * Build step 0 — apply pending database migrations.
 *
 * Schema changes are tracked as plain numbered .sql files in /migrations,
 * applied here via a small Node script rather than ORM-managed migrations
 * (Phase 1 CONTEXT.md D-05). This runs as the first step of `npm run build`
 * (D-06) so the schema is always current before any code that might query it
 * during SSR render.
 *
 * lib/db.js throws immediately if POSTGRES_URL is unset (fail-fast, D-02) —
 * that throw is caught here and reported as a clean, actionable CLI message
 * instead of a raw stack trace.
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = resolve(here, '..', 'migrations')

async function main() {
  let sql
  try {
    ;({ sql } = await import('../lib/db.js'))
  } catch (err) {
    console.error('migrate: ' + err.message)
    process.exit(1)
  }

  await sql`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort()

  let applied = 0
  for (const file of files) {
    const { rows } = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`
    if (rows.length) continue
    const text = await readFile(resolve(migrationsDir, file), 'utf8')
    await sql.query(text)
    await sql`INSERT INTO _migrations (name) VALUES (${file})`
    console.log(`migrate: applied ${file}`)
    applied++
  }

  if (applied === 0) {
    console.log(`migrate: up to date (${files.length} migrations)`)
  }
}

main().catch((err) => {
  console.error('migrate failed:', err)
  process.exit(1)
})
