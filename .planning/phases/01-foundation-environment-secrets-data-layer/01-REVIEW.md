---
phase: 01-foundation-environment-secrets-data-layer
reviewed: 2026-09-08T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - .env.example
  - .gitignore
  - lib/db.js
  - migrations/0001_init.sql
  - package.json
  - scripts/check-secrets.js
  - scripts/migrate.js
findings:
  critical: 1
  warning: 5
  info: 2
  total: 8
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-09-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the foundation layer: env var documentation, `.gitignore`, the Postgres client wrapper, the initial schema migration, the migration runner, and the build-time secret scanner. The schema's `users.id` BIGINT reconciliation is internally consistent — `addresses.user_id`, `sessions.user_id`, and `subscriptions.user_id` all correctly reference `users(id)` as `BIGINT`, no stray UUID FK found. `sql` tagged-template usage in `migrate.js` is parameterized correctly (no SQL injection). `check-secrets.js`'s design (exact-value matching, fail-closed on missing `dist/`, secret value never printed) is sound in principle.

The one **blocker**: the documented local dev flow ("run `vercel env pull .env.local`, then retry") does not actually work with this build pipeline, because `npm run build`'s first step (`node scripts/migrate.js`) is a bare Node process invoked before Vite ever runs, and nothing in this codebase loads `.env.local` into `process.env` for it — `@vercel/postgres`'s own README explicitly flags this exact gotcha for Vite projects. Every other finding is a warning-level robustness/consistency gap in the secret-scanning and migration tooling that is this phase's core deliverable.

## Critical Issues

### CR-01: Documented local dev flow (`vercel env pull .env.local`) cannot actually satisfy `POSTGRES_URL` for `npm run build`

**File:** `package.json:9`, `lib/db.js:13-23`, `scripts/migrate.js:21-28`, `.env.example:4-7`

**Issue:** `lib/db.js` throws unless `process.env.POSTGRES_URL` is set, and its own error message instructs the developer to run `vercel env pull .env.local`, then retry. `.env.example`'s header says the same: "Copy to .env.local and fill in real values." But the build script is:

```json
"build": "node scripts/migrate.js && vite build && vite build --ssr src/entry-server.jsx --outDir dist/server && node prerender.js && node scripts/check-secrets.js"
```

`node scripts/migrate.js` is a **bare Node process**, run before Vite ever starts. Vite's `.env.local` loading (`loadEnv`) only applies inside Vite's own dev/build lifecycle (`vite`, `vite build`) — it never populates `process.env` for a plain `node <script>` invocation that precedes it in the same npm script chain, and Node itself does not auto-load `.env.local` files. `@vercel/postgres`'s own README states this exact caveat verbatim:

> "`process.env` is automatically populated from your `.env` file during development... However, Vite does not expose the `.env` variables on `process.env`."

...and recommends manually wiring `dotenv`/`dotenv-expand`. This project has no `dotenv` dependency and no code anywhere that loads `.env.local` into `process.env`.

**Net effect:** a developer who follows the exact instructions printed by `lib/db.js`'s own error message (`vercel env pull .env.local`, then `npm run build`) will still get `Error: POSTGRES_URL is not set` every time, because `.env.local` is never read by `scripts/migrate.js`. The full pipeline (migrate → build → prerender → check-secrets) can currently only succeed on Vercel's own build infrastructure, where Vercel injects configured env vars directly into `process.env` — or if the developer manually `export`s the var into their shell, which is undocumented anywhere in the reviewed files.

**Fix:** Load `.env.local` explicitly at the top of `scripts/migrate.js` (and `lib/db.js`, since it's imported standalone), e.g. using Node's built-in flag or a tiny loader:

```js
// scripts/migrate.js, before importing lib/db.js
import { config } from 'node:process'
// Node >=20.6:
// run via: node --env-file=.env.local scripts/migrate.js
// or, without requiring a Node version bump, parse manually:
import { readFileSync, existsSync } from 'node:fs'
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
}
```

or add `dotenv`/`dotenv-expand` as a devDependency and call `dotenvExpand.expand(dotenv.config({ path: '.env.local' }))` before the `POSTGRES_URL` check in `lib/db.js`. Update the error message and `.env.example` header if the chosen fix changes the required command.

## Warnings

### WR-01: `.gitignore`'s broad `.env*` rule also matches the tracked `.env.example` template

**File:** `.gitignore:17`

**Issue:** Line 17 (`.env*`) is added after the more specific rules on lines 9-11 (`.env`, `.env.local`, `.env*.local`) and re-ignores everything starting with `.env`, including `.env.example` — the template file that exists specifically to be committed and kept in sync with real env var names. `.env.example` is currently tracked only because it was added to git before/despite this rule; `git check-ignore -v --no-index .env.example` confirms `.gitignore:17:.env*` matches it. This is currently harmless for editing the existing tracked file, but `git add .` / `git add -A` will silently refuse to (re-)stage `.env.example` if it is ever deleted and recreated, or if a contributor unintentionally runs `git rm --cached .env.example`.

**Fix:** Add an explicit negation after the broad rule:

```gitignore
.env*
!.env.example
```

### WR-02: `check-secrets.js`'s `TRACKED_VAR_NAMES` is a hand-maintained list disconnected from `.env.example`

**File:** `scripts/check-secrets.js:27-34`, `.env.example`

**Issue:** The scanner only checks for leaks of the 6 names hardcoded in `TRACKED_VAR_NAMES`. `.env.example` is the actual source of truth for which env vars exist per phase, but nothing enforces that every secret-shaped var added there in a future phase also gets added to `TRACKED_VAR_NAMES`. A future phase that adds a new secret to `.env.example` (e.g. a new API key) but forgets to add it to this list would silently lose scan coverage for exactly that secret — precisely the failure mode this phase exists to prevent.

**Fix:** Derive the tracked list from `.env.example` at scan time (e.g., parse all keys, exclude a documented allowlist of known-public ones like `GOOGLE_CLIENT_ID`), or add a lightweight test/assertion that fails CI if `.env.example` gains a key not present in `TRACKED_VAR_NAMES`.

### WR-03: Exact-value matching in `check-secrets.js` misses encoded/escaped variants of a leaked secret

**File:** `scripts/check-secrets.js:66-73`

**Issue:** `content.includes(value)` only catches the secret appearing byte-for-byte verbatim. If a secret ever got embedded into prerendered HTML/JSON/JS via `JSON.stringify` (which escapes `/` as `\/` in some serializers), URL-encoding, or HTML-entity encoding (common for connection strings containing `&`/`@`/`:` characters), the scan would not detect it even though the secret is genuinely present and extractable. This is a known tradeoff of exact-match vs. pattern-match (correctly reasoned about in the file's own header comment re: false positives), but the encoded-variant gap isn't mentioned or tested anywhere.

**Fix:** At minimum, also check `encodeURIComponent(value)` and `JSON.stringify(value).slice(1, -1)` variants for the connection-string-shaped secrets (`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`), since those are the values most likely to end up serialized somewhere:

```js
const variants = [value, encodeURIComponent(value), JSON.stringify(value).slice(1, -1)]
for (const v of variants) {
  if (content.includes(v)) { /* ... */ }
}
```

### WR-04: `migrate.js` applies SQL and records it in `_migrations` as two independent, non-transactional steps

**File:** `scripts/migrate.js:39-45`

**Issue:**

```js
const { rows } = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`
if (rows.length) continue
const text = await readFile(resolve(migrationsDir, file), 'utf8')
await sql.query(text)
await sql`INSERT INTO _migrations (name) VALUES (${file})`
```

If the process is killed or the connection drops between `sql.query(text)` succeeding and the subsequent `INSERT INTO _migrations` completing, the migration will be considered "not applied" on the next run and re-executed. This happens to be safe for `0001_init.sql` only because every statement in it is `CREATE ... IF NOT EXISTS`. Nothing in the runner itself enforces or documents that constraint for future migrations — a later migration doing `ALTER TABLE ADD COLUMN` (without `IF NOT EXISTS`, which Postgres doesn't uniformly support pre-9.6-style across all `ALTER` variants) or a data-mutating `UPDATE` would not be safe to silently re-run.

**Fix:** Wrap the apply+record pair in a single transaction (`BEGIN; ...; COMMIT;`) per migration file, or document explicitly (in this file's header comment) that every future migration file must be idempotent/re-run-safe, since that's the runner's actual safety model.

### WR-05: `lib/db.js`'s "server-only, never imported from src/" contract has no automated enforcement

**File:** `lib/db.js:1-4`

**Issue:** The file's header comment is the only thing preventing a future route component under `src/` from doing `import { sql } from '../../lib/db.js'`, which Vite would bundle into client-shipped JS without any error today (there's no path-alias restriction, no ESLint `no-restricted-imports` rule, and no build-time check equivalent to `check-secrets.js` for import boundaries). Given this phase's stated purpose is establishing the secrets boundary, relying purely on a code comment for that boundary is a gap.

**Fix:** Add an ESLint rule (`no-restricted-imports` targeting `lib/db.js` from any file under `src/`) once ESLint is introduced (already flagged as a gap in `CLAUDE.md`), or add a minimal grep-based build check similar in spirit to `check-secrets.js` that fails the build if any file under `dist/assets/*.js` contains a marker string unique to `lib/db.js`.

## Info

### IN-01: `check-secrets.js` extension check mishandles dotless filenames

**File:** `scripts/check-secrets.js:63`

**Issue:**

```js
const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
```

For a filename with no `.` at all, `lastIndexOf('.')` returns `-1`, so `file.slice(-1)` returns the file's **last character**, not an empty string or the full name. Today this is harmless — no `SKIP_EXTENSIONS` entry is a bare single character, so the file still falls through to be scanned (fails safe, over-inclusive) — but it's fragile logic for a security-relevant script and easy to get wrong when the skip list is edited later.

**Fix:** Use `node:path`'s `extname()` (already available; just not imported here) instead of manual string slicing:

```js
import { extname } from 'node:path'
const ext = extname(file).toLowerCase()
```

### IN-02: Recursive directory walk silently skips symlinks

**File:** `scripts/check-secrets.js:40-52`, `scripts/migrate.js` (n/a — only reads a flat migrations dir)

**Issue:** `walk()` only recurses on `entry.isDirectory()` and collects on `entry.isFile()`. A symlink entry (`entry.isSymbolicLink()`) is neither, so it is silently skipped — a symlinked file inside `dist/` would never be scanned for leaked secrets. Vite's own build output doesn't currently produce symlinks, so this is not exploitable today, but it's a silent gap rather than a fail-loud one.

**Fix:** Either resolve symlinks explicitly (`stat` instead of `dirent` type checks) or, at minimum, log a warning when a non-file/non-directory entry is encountered so the gap is visible rather than silent.

---

_Reviewed: 2026-09-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
