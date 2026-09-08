---
phase: 01-foundation-environment-secrets-data-layer
plan: 01
subsystem: data-layer
tags: [postgres, migrations, env-secrets, server-only]
dependency-graph:
  requires: []
  provides: [lib/db.js, migrations/0001_init.sql, scripts/migrate.js, .env.example]
  affects: [package.json, .gitignore]
tech-stack:
  added: ["@vercel/postgres@0.10.0"]
  patterns:
    - "server-only module (lib/db.js), never imported from src/"
    - "fail-fast on missing env var (throw at import time, not silent connect)"
    - "numbered .sql migration files applied by a plain Node script, no ORM"
    - "auto-run migrations as the first step of npm run build"
key-files:
  created:
    - lib/db.js
    - migrations/0001_init.sql
    - scripts/migrate.js
    - .env.example
  modified:
    - package.json
    - package-lock.json
    - .gitignore
decisions:
  - "Pinned @vercel/postgres to exact version 0.10.0 (no caret) per Task 1's human-verified npmjs.com check, matching the repo's existing exact-pinned-version convention"
  - "npm flagged @vercel/postgres@0.10.0 as deprecated in favor of Neon's native SDK during install — noted but not acted on: D-01 (Vercel Postgres via @vercel/postgres) was a locked decision already confirmed through the Task 1 legitimacy checkpoint; revisiting the client library is a future architectural call, not something to make unilaterally mid-task"
metrics:
  duration: "2.5 min"
  completed: 2026-09-08
status: complete
actuals:
  tokens: 1913
  tasks: 2
  commits: 1
---

# Phase 1 Plan 01: Server-Only DB Client, Schema Migration & Migration Runner Summary

Fail-fast pooled `@vercel/postgres` client, the full 4-table schema as a numbered migration, and a migration runner wired to run automatically as the first step of every `npm run build` — using the script's own graceful-failure behavior (no `POSTGRES_URL` yet) as the proof that the full seam works end-to-end.

## What Was Built

- **`lib/db.js`** — server-only module re-exporting `sql` from `@vercel/postgres` (raw tagged-template SQL, no ORM, per D-04). Throws immediately at import time if `process.env.POSTGRES_URL` is unset or empty, naming both the missing var and the fix, rather than silently proceeding or inventing a connection string (D-02). Uses the pooled connection only — never `POSTGRES_URL_NON_POOLING` (D-03). Header comment states explicitly this file must never be imported from `src/`.
- **`migrations/0001_init.sql`** — defines exactly 4 tables, each `IF NOT EXISTS` so the file is safely re-runnable:
  - `users` (UUID PK, unique-indexed `google_sub`, per D-08)
  - `sessions` (minimal shape, `user_id` FK, per CONTEXT.md discretion — Phase 2 owns session design)
  - `subscriptions` (mirrors Stripe's own `status` vocabulary verbatim per D-09, unique index on `stripe_subscription_id`, composite index on `(user_id, stripe_product_id)` for GATE-03's per-product entitlement lookup, per D-07)
  - `webhook_events` (idempotency via `stripe_event_id` primary key alone, no payload column, per D-10)
- **`scripts/migrate.js`** — plain Node script (no ORM-managed migrations, per D-05) that dynamically imports `lib/db.js` inside its own try/catch, applies any `.sql` file in `migrations/` not yet recorded in a `_migrations` tracking table, in filename order, and logs `migrate: applied <file>` or `migrate: up to date (N migrations)`.
- **`.env.example`** — documents every env var name needed across the milestone (`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING` for Phase 1; `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` for Phase 2; `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` for Phase 3), no real values.
- **`.gitignore`** — added a grouped `# environment secrets` block excluding `.env`, `.env.local`, `.env*.local` (ENV-02).
- **`package.json`** — added `@vercel/postgres` pinned to exact version `0.10.0` (matching the repo's exact-pinned-version convention, e.g. `"react": "18.3.1"`); prepended `node scripts/migrate.js && ` to the `build` script so migrations auto-run on every build, ahead of `vite build` (D-06). `package-lock.json` updated via `npm install`.

## Task 1 Outcome (pre-resolved)

Task 1 (`checkpoint:human-verify`, `gate="blocking-human"`) was already resolved before this worktree existed. The human confirmed via npmjs.com that `@vercel/postgres` is published under the `@vercel` org scope, links to `github.com/vercel/storage`, has 214,851 weekly downloads, and the current published version is `0.10.0`. That exact version was pinned in Task 2 — no re-verification was performed in this run.

## Verification

All automated acceptance criteria from the plan passed:

- `node --check lib/db.js` and `node --check scripts/migrate.js` both exit 0
- `grep -c "CREATE TABLE IF NOT EXISTS" migrations/0001_init.sql` returns `4`
- `POSTGRES_URL= node scripts/migrate.js` exits `1` and prints `migrate: POSTGRES_URL is not set. Provision Vercel Postgres and run \`vercel env pull .env.local\`, then retry.` as its only output line — no raw stack trace
- `grep -c "node scripts/migrate.js" package.json` returns `1`, appearing as the first segment of `scripts.build`
- `grep -c "@vercel/postgres" package.json` returns `1`, pinned to `0.10.0`
- `grep -E '^\.env$|^\.env\.local$|^\.env\*\.local$' .gitignore` matches all three lines

The real database does not exist yet (that's Plan 02) — this plan's tracer verification deliberately used the graceful-failure path (`POSTGRES_URL` unset) as the proof the full migration -> runner -> client -> build-script seam works end-to-end, per the plan's own design.

## Deviations from Plan

None — plan executed exactly as written. Task 1's pre-resolved outcome (pinned version `0.10.0`) was applied to Task 2 as instructed.

One informational note (not a deviation, no code change made): `npm install` printed a deprecation warning for `@vercel/postgres@0.10.0`, recommending migration to Neon's native SDK. This is a known, publicly-documented transition in the Vercel/Neon ecosystem. D-01 (use Vercel Postgres via `@vercel/postgres`) was already a locked decision confirmed through Task 1's legitimacy checkpoint, so no substitution was made here — flagging this for future consideration (a possible client-library swap) rather than acting on it unilaterally mid-task, since it would be a Rule 4 architectural change requiring a human decision, not a bug or missing-functionality fix.

## Known Stubs

None — this plan produces no UI-facing code and introduces no placeholder data paths.

## Self-Check: PASSED

- FOUND: lib/db.js
- FOUND: migrations/0001_init.sql
- FOUND: scripts/migrate.js
- FOUND: .env.example
- FOUND: commit 11aad56
