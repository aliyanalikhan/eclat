---
phase: 01-foundation-environment-secrets-data-layer
plan: 02
subsystem: database
tags: [postgres, vercel, neon, migrations]

requires:
  - phase: 01-foundation-environment-secrets-data-layer (Plan 01)
    provides: lib/db.js, migrations/0001_init.sql, scripts/migrate.js
provides:
  - Vercel Postgres (Neon-backed) database confirmed provisioned, linked, and reachable via .env.local
affects: [01-foundation-environment-secrets-data-layer (Plan 03), Phase 2 (auth), Phase 3 (billing)]

actuals:
  tokens: 3200
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - .gitignore

key-decisions:
  - "Vercel CLI (via npx, already authenticated on this machine) was used to run `vercel link` and `vercel env pull .env.local` autonomously — per the plan's automation note, only the actual dashboard database-creation click-through needs a human, and that step turned out to already be done."

patterns-established: []

requirements-completed: []

coverage: []

duration: ~50min (halted, not complete)
completed: 2026-09-08
status: halted
---

# Phase 1 Plan 2: Vercel Postgres Provisioning Summary

**Database already provisioned and reachable, but the live schema conflicts with `migrations/0001_init.sql` — a pre-existing `users` table (bigint PK, 2 real rows) blocks the plan's UUID-based schema and needs a human decision before Task 2 can proceed.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-08T07:03:00Z (approx, continuing from Phase 1 context-gathering)
- **Completed:** HALTED at 2026-09-08T07:52:00Z — not complete
- **Tasks:** 1 of 2 (Task 1 resolved via automation; Task 2 blocked)
- **Files modified:** 1 (`.gitignore`)

## Accomplishments

- Confirmed the Vercel Postgres (Neon-backed) database for the `la-didier/ladidier` project was **already provisioned** (created ~7 days prior to this plan's execution, per `vercel env ls` timestamps) — no dashboard click-through was needed at execution time.
- Linked this worktree to the Vercel project via `vercel link --yes --project ladidier --scope la-didier` (npx-cached Vercel CLI, already authenticated as `ebukaosuorah-3078`).
- Pulled real Development-environment env vars into `.env.local` via `vercel env pull .env.local --yes`, including a non-empty `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING`.
- Confirmed only one Postgres database/env-var set exists across Production, Preview, and Development (satisfies D-11 — no separate branch/dev database).
- `vercel link` auto-appended `.vercel` and `.env*` to `.gitignore`; committed that side effect.
- Ran `node --env-file=.env.local scripts/migrate.js` — **failed** with a foreign-key type mismatch (see Issues Encountered), which led to discovering pre-existing, non-empty tables in the live database that the plan's migration did not anticipate.

## Task Commits

Each task was committed atomically:

1. **Task 1: Provision Vercel Postgres and pull env vars locally** - `1b0dfa7` (chore) — database was already provisioned; only the local link/pull automation was new work, captured as a `.gitignore` side-effect commit.
2. **Task 2: Run the real migration and verify the live schema** - NOT STARTED (blocked, no commit — see below)

**Plan metadata:** not yet created (plan incomplete)

## Files Created/Modified

- `.gitignore` - added `.vercel` and `.env*` exclusions (auto-appended by `vercel link`)

## Decisions Made

- Ran the Vercel CLI (`vercel link`, `vercel env pull`) autonomously instead of stopping for a human checkpoint, per the plan's explicit note: "only the actual dashboard click-through to create the database resource itself needs a human." Since the database turned out to already exist, no human action was actually required for Task 1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Committed `.gitignore` update for `.vercel` link metadata**
- **Found during:** Task 1 (`vercel link`)
- **Issue:** `vercel link` auto-appended `.vercel` and `.env*` to `.gitignore` as a side effect (standard Vercel CLI behavior) — this wasn't in the plan's `files_modified: []` but leaving it uncommitted would risk `.vercel/project.json` (org/project IDs) being accidentally committed later.
- **Fix:** Committed the `.gitignore` diff as-is.
- **Files modified:** `.gitignore`
- **Verification:** `git status --short` confirms `.vercel/` is not tracked/untracked after the commit.
- **Committed in:** `1b0dfa7`

---

**Total deviations:** 1 auto-fixed (1 missing critical / hygiene)
**Impact on plan:** Minor, no scope creep — a standard CLI side effect, not app logic.

## Issues Encountered — BLOCKING (halted here)

**Task 2 (`node scripts/migrate.js`) failed** with:

```
error: foreign key constraint "sessions_user_id_fkey" cannot be implemented
detail: Key columns "user_id" of the referencing table and "id" of the referenced table
        are of incompatible types: uuid and bigint.
```

Investigating (read-only queries against `information_schema`, no writes made):

- The live database's `public` schema **already contains** two tables that `migrations/0001_init.sql` does not know about:
  - **`users`** — columns: `id bigint`, `google_sub text`, `email text`, `name text`, `picture text`, `created_at timestamptz`, `last_login_at timestamptz`, `stripe_customer_id text`. **Contains 2 rows of real data.**
  - **`addresses`** — columns: `user_id bigint`, `line1 text`, `city text`, `state text`, `postal_code text`, `country text`. Empty (0 rows).
- `_migrations` table was empty before this run (confirming these two tables were **not** created by `scripts/migrate.js` at any prior point — they pre-date this plan's migration tooling entirely).
- `migrations/0001_init.sql`'s `CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY ...)` **silently no-ops** against the existing `users` table (IF NOT EXISTS skips it since a `users` table already exists) — but the schema doesn't match (bigint vs UUID), so the next statement (`sessions` table, `user_id UUID REFERENCES users(id)`) fails outright on the FK type mismatch. Postgres correctly refuses to create an incompatible foreign key.
- The existing `users` table's column shape (`google_sub`, `email`, `name`, `picture`, `stripe_customer_id`, `last_login_at`) is **suspiciously well-aligned with this exact milestone's eventual auth/billing needs** — it is not a generic starter-template table. Combined with the pre-existing `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`STRIPE_SECRET_KEY`/`SESSION_SECRET` env vars already present in the Vercel project (all ~7 days old), this strongly suggests some prior, out-of-band work was done directly against this Vercel project/database — outside of what Plan 01 (which built `migrations/0001_init.sql` from scratch, assuming an empty database) or this GSD milestone's planning artifacts account for.

**This is an architectural conflict requiring a human decision (Deviation Rule 4), not an auto-fixable bug:**

- Two real user rows already exist in a table with an incompatible schema (bigint PK vs. this plan's UUID PK design).
- No commit was made for Task 2 — `scripts/migrate.js` failed before applying anything to `_migrations`, so the database is in the same state it was before this plan ran (aside from the pre-existing `users`/`addresses` tables, which predate this plan entirely).
- **Nothing was dropped, altered, or overwritten.** All investigation was read-only (`information_schema` queries, `SELECT count(*)`).

**Options for the human to decide between:**

1. **Confirm the existing `users`/`addresses` data is stale/test data safe to drop**, then re-run `node scripts/migrate.js` as-is (it will still no-op the `users` CREATE due to `IF NOT EXISTS` unless the table is dropped first — would need an explicit `DROP TABLE users, addresses;` before re-running, or add that as a new migration step).
2. **Adopt the existing `users`/`addresses` schema as canonical** (it already has `stripe_customer_id`, `email`, `google_sub`, `name`, `picture` — arguably a superset of Plan 01's `users` table) and rewrite `migrations/0001_init.sql`'s `users` table + all downstream FKs (`sessions`, `subscriptions`) to reference `bigint` instead of `uuid`, incorporating `addresses` into the schema design.
3. **Investigate first**: ask whoever has prior context on this Vercel project whether this schema/data was intentionally seeded (e.g., a demo/seed script run against production infra ahead of this milestone) before deciding whether to preserve or discard it.

No files in `migrations/`, `lib/`, or `scripts/` were modified during this investigation — only read queries were run against the live database.

## User Setup Required

None beyond the architectural decision above — Vercel Postgres is provisioned, linked, and `.env.local` is populated. No further external-service configuration is needed.

## Next Phase Readiness

- **Blocked.** Task 2 (and therefore this plan) cannot complete until a human decides how to reconcile `migrations/0001_init.sql`'s intended schema with the pre-existing `users`/`addresses` tables and their 2 rows of live data.
- Plan 03 (which likely depends on this plan's live-schema confirmation) should not proceed until this is resolved.
- `.env.local` with a real `POSTGRES_URL` is in place and usable for whichever resolution path is chosen.
