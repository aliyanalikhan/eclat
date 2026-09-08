# Phase 1: Foundation — Environment, Secrets & Data Layer - Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 8 (new/modified)
**Analogs found:** 1 exact/reusable structural analog (`prerender.js`) applied across scripts; rest are net-new with codebase style extracted from `store.jsx`, `seo.js`, `content.js`

## Context

This phase is **100% net-new server-side infrastructure**. There is no existing DB client, no `.env` handling, no auth SDK, and no `/lib` or `/migrations` directory anywhere in the repo (confirmed via `Glob`/`Bash` — neither directory exists). Consequently there are no true "role + data flow" analogs for most files. What the codebase *does* offer is:

1. A strong **structural analog for build-time Node scripts**: `prerender.js` (post-`vite build` step, ESM, `node:fs/promises` + `node:path` + `node:url`, top-level `main().catch(err => { console.error(...); process.exit(1) })`, JSDoc file-header comment explaining *why*).
2. A **project-wide code style** (2-space indent, no semicolons, single quotes, trailing commas, explicit `.js`/`.jsx` extensions, camelCase functions, SCREAMING_SNAKE_CASE for static config constants, defensive `try/catch` with commented rationale) drawn from `src/store.jsx`, `src/data/seo.js`, `src/data/content.js`, `prerender.js`.
3. A **wiring point** for new build steps: `package.json` `scripts.build` (currently `"vite build && vite build --ssr src/entry-server.jsx --outDir dist/server && node prerender.js"`).

Every new file below should be judged against these two things (style + `prerender.js` shape) rather than a same-role match, since no same-role file exists yet.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/check-secrets.js` (or `check-secrets.mjs`) | build-tool / utility | batch (scan `dist/` files) | `prerender.js` | role-match (explicit, per CONTEXT.md D-14) |
| `scripts/migrate.js` (migration-runner) | build-tool / utility | batch (sequential SQL exec) | `prerender.js` (script shape only) | style-match (no DB-script analog exists) |
| `migrations/0001_init.sql` (+ subsequent numbered files) | migration | batch/schema-DDL | none in repo | no analog |
| `lib/db.js` (or `src/lib/db.js`) — `@vercel/postgres` client wrapper | service / config | CRUD (query gateway) | `src/store.jsx` (module-level singleton export shape only) | style-match (no server data-client analog exists) |
| `.env.local` / `.env.example` (documentation only, not committed) | config | n/a | none (repo has zero `.env*` precedent) | no analog |
| `.gitignore` (modified) | config | n/a | existing `.gitignore` itself | exact (edit in place) |
| `package.json` (modified — `build` script) | config | n/a | existing `scripts.build` chain | exact (edit in place) |
| `vercel.json` (modified, if needed for env/build settings) | config | n/a | existing `vercel.json` | exact (edit in place) |

## Pattern Assignments

### `scripts/check-secrets.js` (build-tool, batch scan)

**Analog:** `prerender.js` (root) — this is the explicit analog named in CONTEXT.md D-14 ("wired in alongside the existing `prerender.js` post-build step").

**File header / intent-comment pattern** (`prerender.js` lines 1-10):
```javascript
/**
 * Build step 3 — prerender every route to static HTML.
 *
 * `vite build` gives us a client bundle and a template; `vite build --ssr` gives us
 * a render() function. This script pairs them: for each known route it renders the
 * app to a string, bakes the route's <head> in, and writes dist/<route>/index.html.
 *
 * The result is a static site where every URL serves complete, indexable markup on
 * first byte, then hydrates into the SPA.
 */
```
Apply the same shape to `check-secrets.js`: explain *why* an exact-value scan exists (not pattern-based), per D-13.

**Imports pattern** (`prerender.js` lines 11-13):
```javascript
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
```
`check-secrets.js` needs a recursive directory walk over `dist/` — use `node:fs/promises` (`readdir` with `{ recursive: true }` on Node 20+, or a manual recursive walk for portability) + `node:path`, following the same import style (named imports from `node:*`, no default imports).

**Path resolution pattern** (`prerender.js` lines 15-16):
```javascript
const here = dirname(fileURLToPath(import.meta.url))
const dist = resolve(here, 'dist')
```
Reuse verbatim — `check-secrets.js` also needs to locate `dist/` relative to its own file, not `process.cwd()`.

**Top-level `main()` + fail-fast pattern** (`prerender.js` lines 64-108, specifically the tail at 105-108):
```javascript
main().catch((err) => {
  console.error('prerender failed:', err)
  process.exit(1)
})
```
`check-secrets.js` should mirror this exactly, but the leak-detection path exits non-zero itself (inside `main`, before the catch) per D-15 — e.g. `process.exit(1)` after printing `` `${envVarName} found in ${filePath}` `` (never the secret value itself). Console messaging style matches `prerender.js`'s `console.log('prerender: ...')` prefixed-tag convention (lines 100-102) — use a `check-secrets:` prefix for consistency.

**Secret list source:** Read exact values via `process.env.GOOGLE_CLIENT_SECRET`, `process.env.STRIPE_SECRET_KEY`, `process.env.STRIPE_WEBHOOK_SECRET`, `process.env.SESSION_SECRET`, `process.env.POSTGRES_URL`, etc. (per D-13) — build a `{ name, value }` list, skip any that are `undefined` (not yet set locally), and grep-match only the ones with actual string values against each file's contents read via `readFile(path, 'utf8')` (consistent with `prerender.js` line 65's `readFile(..., 'utf8')` usage).

---

### `scripts/migrate.js` (migration-runner, batch)

**Analog:** `prerender.js` (script shape/style only — no DB precedent exists).

Reuse the same skeleton: file-header JSDoc comment explaining intent, `node:fs/promises` + `node:path` + `node:url` imports, `here`/target-dir resolution via `fileURLToPath(import.meta.url)`, a `main()` async function, and the same `main().catch(err => { console.error(...); process.exit(1) })` tail.

**New pattern needed (no analog):** sequential `.sql` file execution against `@vercel/postgres`. Structure per D-05/D-06:
```javascript
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from '@vercel/postgres'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = resolve(here, 'migrations')

async function main() {
  // Ensure a tracking table exists, then apply any .sql file not yet recorded,
  // in filename order (numbered prefixes: 0001_, 0002_, ...).
  await sql`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    const { rows } = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`
    if (rows.length) continue
    const text = await readFile(join(migrationsDir, file), 'utf8')
    await sql.query(text) // raw multi-statement SQL from the file
    await sql`INSERT INTO _migrations (name) VALUES (${file})`
    console.log(`migrate: applied ${file}`)
  }
}

main().catch((err) => {
  console.error('migrate failed:', err)
  process.exit(1)
})
```
This is original (no in-repo precedent) but follows the file's naming/comment/error-handling conventions exactly. Wire into `package.json`'s `build` script per D-06 (auto-run on build), positioned before `vite build` output is scanned by `check-secrets.js` (migrations touch DB, not `dist/`, so ordering relative to `check-secrets.js` doesn't matter — but should run before/independent of the prerender step since it has no dependency on `dist/`).

---

### `migrations/0001_init.sql` (and subsequent numbered files)

**No analog** — first SQL in the repo. Follow D-05 naming (`NNNN_description.sql`, zero-padded 4 digits recommended for sort stability past 9999 — not strictly specified, planner's discretion per CONTEXT.md). Schema shape per D-07/D-08/D-09/D-10:

- `users` — `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `google_sub TEXT UNIQUE NOT NULL`, indexed on `google_sub`.
- `sessions` — shape left to Phase 2 per CONTEXT.md discretion; Phase 1 only needs the table to exist (minimal columns: `id`, `user_id REFERENCES users(id)`, `created_at`).
- `subscriptions` — `user_id REFERENCES users(id)`, `stripe_subscription_id TEXT UNIQUE`, `stripe_product_id TEXT`, `status TEXT` (mirrors Stripe's enum verbatim per D-09), `current_period_end TIMESTAMPTZ`, indexed on `(user_id, stripe_product_id)` for the GATE-03 per-product lookup.
- `webhook_events` — `stripe_event_id TEXT UNIQUE NOT NULL` (idempotency per D-10), `processed_at TIMESTAMPTZ NOT NULL DEFAULT now()`, no full payload column.

No code-style excerpt applies (SQL DDL, not JS) — just note the file must be plain `.sql`, no ORM migration DSL.

---

### `lib/db.js` (DB client wrapper)

**Analog:** `src/store.jsx` — for module-export shape and comment style only (no server-side data-client precedent exists in this repo).

**Module-level singleton + comment-explains-why pattern** (`src/store.jsx` lines 1-5, adapted):
```javascript
/**
 * Server-only Postgres client. Uses the pooled connection (POSTGRES_URL) — see
 * Phase 1 CONTEXT.md D-03: serverless functions must not use POSTGRES_URL_NON_POOLING,
 * to avoid exhausting Postgres's connection limit under concurrent invocations.
 */
import { sql } from '@vercel/postgres'

export { sql }
```
Given D-04 (raw tagged-template SQL via `@vercel/postgres`, no ORM), this file may be nearly a thin re-export — keep it minimal, matching the project's "no unnecessary abstraction" style evident in `src/data/seo-site.js` (a single exported `SITE` constant, no wrapper class).

**Defensive-check convention** (from `src/store.jsx` lines 70-73, the `useApp()` guard pattern):
```javascript
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
```
If `lib/db.js` needs a runtime guard (e.g., failing fast when `POSTGRES_URL` is missing at import time — useful given D-02's "DB not yet provisioned" checkpoint), mirror this explicit-throw-with-clear-message convention rather than silently returning `undefined`.

---

### `.gitignore` (modified)

**Analog:** existing file, edit in place.

**Current content** (`.gitignore` lines 1-10):
```
node_modules/
dist/
.vite/
*.local
.DS_Store
Thumbs.db

# verify-hero.mjs screenshot output
hero-rest.png
hero-open.png
```
Add per ENV-02 (grouped, with a comment matching the existing "# purpose" comment convention seen for the screenshot-output block):
```
# environment secrets
.env
.env.local
.env*.local
```
Note `*.local` already exists at line 4 and technically covers `.env.local`/`.env*.local`, but CONTEXT.md explicitly calls out adding `.env`, `.env.local`, `.env*.local` — add them explicitly and non-redundantly for clarity/auditability (`.env` bare is NOT covered by `*.local` and must be added regardless).

---

### `package.json` (modified — build scripts)

**Analog:** existing `scripts.build` chain, edit in place.

**Current** (`package.json` line 9):
```json
"build": "vite build && vite build --ssr src/entry-server.jsx --outDir dist/server && node prerender.js",
```
Extend with `&&`-chained steps matching the existing convention (no separate pre/post npm lifecycle hooks are used anywhere in this repo — everything is one explicit chained string). Per D-06 (migrations auto-run on build) and D-14 (secret scan runs every `npm run build`):
```json
"build": "node scripts/migrate.js && vite build && vite build --ssr src/entry-server.jsx --outDir dist/server && node prerender.js && node scripts/check-secrets.js",
```
Migration runs first (schema must exist before any code that might query it during SSR render), secret scan runs last (must run after `prerender.js` since it scans final `dist/` contents, including prerendered HTML — not just the Vite JS bundle). Also add `@vercel/postgres` to `dependencies` (currently only `react`/`react-dom`/`react-router-dom` — line 14-18).

---

### `vercel.json` (modified, if needed)

**Analog:** existing file, edit in place. No CSP/header changes are required by Phase 1 itself (no client-side third-party script or fetch target is introduced this phase — that's Phase 2/3's concern for Google OAuth/Stripe.js). Only touch `vercel.json` if the Vercel Postgres integration requires explicit config (typically it does not — env vars are auto-injected per D-01). Planner should treat this as "check, modify only if the provisioning step demands it," not a guaranteed diff.

## Shared Patterns

### Build-script skeleton (applies to `scripts/check-secrets.js` and `scripts/migrate.js`)
**Source:** `prerender.js` (root), lines 1-16 and 105-108
```javascript
/**
 * [What this script does and why, in prose — see prerender.js header for tone/length.]
 */
import { ... } from 'node:fs/promises'
import { ... } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
// ... resolve target paths relative to `here`

async function main() {
  // ...
}

main().catch((err) => {
  console.error('<script-name> failed:', err)
  process.exit(1)
})
```
**Apply to:** `scripts/check-secrets.js`, `scripts/migrate.js`

### Console messaging convention
**Source:** `prerender.js` lines 100-102
```javascript
console.log(`prerender: ${written} routes -> dist/`)
console.log(`prerender: sitemap.xml with ${routes.length} entries`)
console.log('prerender: removed dist/server (build artifact)')
```
**Apply to:** all new build scripts — prefix log lines with `<script-name>: `.

### Code style (whole-codebase convention, no single source file)
**Source:** observed across `src/store.jsx`, `src/data/seo.js`, `prerender.js`
- 2-space indentation, no semicolons, single quotes, trailing commas in multiline literals
- Explicit `.js` extensions in all relative imports
- camelCase functions/variables; SCREAMING_SNAKE_CASE for static config constants (e.g. `STORAGE_KEY` in `store.jsx`)
- Comments explain *why*, placed above the code they justify, not restating the obvious
**Apply to:** all new JS files this phase (`lib/db.js`, `scripts/check-secrets.js`, `scripts/migrate.js`)

### Defensive try/catch with commented rationale
**Source:** `src/store.jsx` lines 9-15, 32-37
```javascript
try {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ subscribed, plan }))
} catch {
  /* private mode / quota — the demo just won't persist */
}
```
**Apply to:** `lib/db.js` and `scripts/migrate.js` error paths where a caught failure has a specific, explainable cause (vs. letting `main().catch()` handle unexpected failures generically).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `migrations/0001_init.sql` | migration | schema-DDL | No SQL, no DB, no migrations exist anywhere in the repo — first of its kind |
| `lib/db.js` | service | CRUD gateway | No server-side data-access layer exists; repo is currently 100% static/client-only |
| `.env.example` | config | n/a | No `.env*` precedent exists (README explicitly states "no build-time secrets" pre-Phase-1) |

## Metadata

**Analog search scope:** repo root (`prerender.js`, `package.json`, `.gitignore`, `vercel.json`), `src/data/*.js`, `src/store.jsx`; confirmed absence of `/lib`, `/migrations`, `.env*` via `Glob`/`Bash`
**Files scanned:** 6 read in full (`01-CONTEXT.md`, `prerender.js`, `package.json`, `.gitignore`, `vercel.json`, `src/data/seo.js`, `src/store.jsx`)
**Pattern extraction date:** 2026-09-08
