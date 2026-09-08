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
  - Live schema (users, addresses, sessions, subscriptions, webhook_events, _migrations) confirmed created via a real migration run
  - users/addresses adopted as bigint-IDENTITY-keyed (superseding CONTEXT.md D-08's original UUID design) to preserve pre-existing live data from prior out-of-band work on this Vercel project
affects: [01-foundation-environment-secrets-data-layer (Plan 03), Phase 2 (auth), Phase 3 (billing), Phase 4 (content gating), Phase 5 (account UI)]

actuals:
  tokens: 6800
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "users.id is BIGINT GENERATED ALWAYS AS IDENTITY, not UUID — any future schema/code referencing users(id) must use bigint, not uuid"

key-files:
  created: []
  modified:
    - .gitignore
    - migrations/0001_init.sql

key-decisions:
  - "Vercel CLI (via npx, already authenticated) was used to run `vercel link` and `vercel env pull .env.local` autonomously — the database turned out to already be provisioned, so no human dashboard action was actually required for Task 1."
  - "HUMAN DECISION (checkpoint, post-halt): adopt the pre-existing bigint-keyed users/addresses tables (from prior out-of-band work on this same Vercel project, containing 2 real rows) as canonical, superseding CONTEXT.md D-08's original UUID-PK design for users. sessions/subscriptions now reference users(id) as BIGINT instead of UUID. No live data was dropped or altered."

patterns-established:
  - "users(id) is bigint IDENTITY, not UUID — every future plan/phase touching the users table or FKing to it must use BIGINT, not UUID (Phase 2 session design, Phase 3 subscriptions/webhooks work, Phase 4 entitlement checks, Phase 5 account UI all need to account for this)."

requirements-completed: [ENV-01]

coverage:
  - id: D1
    description: "Vercel Postgres (Neon-backed) database provisioned, linked, and reachable locally via .env.local's POSTGRES_URL"
    requirement: "ENV-01"
    verification:
      - kind: manual_procedural
        ref: "vercel env ls (single POSTGRES_URL/POSTGRES_URL_NON_POOLING set shared across Production/Preview/Development, satisfying D-11); vercel env pull .env.local confirmed non-empty POSTGRES_URL written"
        status: pass
    human_judgment: false
  - id: D2
    description: "migrations/0001_init.sql applied for real against the live database, creating sessions/subscriptions/webhook_events (users/addresses already existed and were adopted as canonical) — schema verified end-to-end and migration confirmed idempotent"
    requirement: "ENV-01"
    verification:
      - kind: integration
        ref: "node --env-file=.env.local scripts/migrate.js (first run: 'migrate: applied 0001_init.sql'; second run: 'migrate: up to date (1 migrations)'); inline schema-check script printed SCHEMA_OK confirming users, sessions, subscriptions, webhook_events, _migrations, addresses all exist in information_schema.tables"
        status: pass
    human_judgment: false

duration: ~55min (across halt + resume)
completed: 2026-09-08
status: complete
---

# Phase 1 Plan 2: Vercel Postgres Provisioning Summary

**Live Vercel Postgres database confirmed reachable and fully migrated — `sessions`, `subscriptions`, and `webhook_events` created for real, while pre-existing bigint-keyed `users`/`addresses` tables (from prior out-of-band project work, 2 real rows) were adopted as canonical instead of being dropped, reversing CONTEXT.md D-08's original UUID-PK design for `users`.**

## Performance

- **Duration:** ~55 min (execution halted mid-plan for a human architectural decision, then resumed and completed)
- **Started:** 2026-09-08T07:03:00Z (approx, continuing from Phase 1 context-gathering)
- **Completed:** 2026-09-08T07:57:33Z
- **Tasks:** 2 of 2
- **Files modified:** 2 (`.gitignore`, `migrations/0001_init.sql`)

## Accomplishments

- Confirmed the Vercel Postgres (Neon-backed) database for the `la-didier/ladidier` project was already provisioned (created ~7 days before this plan's execution).
- Linked this worktree to the Vercel project (`vercel link --yes --project ladidier --scope la-didier`) and pulled real Development env vars into `.env.local` (`vercel env pull .env.local --yes`), including a non-empty `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING`.
- Confirmed only one Postgres instance/env-var set exists across Production, Preview, and Development (D-11 satisfied).
- Discovered, via read-only `information_schema`/`pg_indexes` queries, that the live database already contained a `users` table (bigint `IDENTITY` PK, 2 real rows) and an `addresses` table (0 rows) predating this plan's migration tooling entirely — halted execution and escalated as a Rule 4 architectural decision rather than guessing.
- Per human decision, rewrote `migrations/0001_init.sql` to adopt the live bigint schema as canonical: `users.id` is now `BIGINT GENERATED ALWAYS AS IDENTITY` (matching the live column's actual identity strategy, confirmed via `information_schema.columns`), a matching `addresses` table definition was added, and `sessions`/`subscriptions` now `REFERENCES users(id)` as `BIGINT` instead of `UUID`.
- Ran `node --env-file=.env.local scripts/migrate.js` — succeeded, applying `0001_init.sql` for real: created `sessions`, `subscriptions`, `webhook_events` (and `_migrations`); `users`/`addresses` CREATE statements correctly no-op'd against the pre-existing tables.
- Verified via inline schema-check script that all 6 tables exist (`users`, `sessions`, `subscriptions`, `webhook_events`, `_migrations`, `addresses`).
- Confirmed idempotency: second `migrate.js` run logged `migrate: up to date (1 migrations)`.
- Confirmed the pre-existing `users` (2 rows) and `addresses` (0 rows) data was untouched throughout.

## Task Commits

Each task was committed atomically:

1. **Task 1: Provision Vercel Postgres and pull env vars locally** - `1b0dfa7` (chore) — database already provisioned; `.gitignore` side-effect from `vercel link` committed.
2. **Task 2: Run the real migration and verify the live schema** - `8ad46ae` (fix) — reconciled `migrations/0001_init.sql` with the live bigint schema per human decision, then ran and verified the migration.

Also: `9e7ed96` (docs) — interim SUMMARY.md documenting the mid-plan halt (superseded by this finalized version, same file).

**Plan metadata:** commit pending (final metadata commit for this plan)

## Files Created/Modified

- `.gitignore` - added `.vercel` and `.env*` exclusions (auto-appended by `vercel link`)
- `migrations/0001_init.sql` - `users` changed to `BIGINT GENERATED ALWAYS AS IDENTITY` PK (was `UUID DEFAULT gen_random_uuid()`), full live column set added (`name`, `picture`, `last_login_at`, `stripe_customer_id` with their real unique constraints); new `addresses` table definition added; `sessions.user_id` and `subscriptions.user_id` changed from `UUID` to `BIGINT REFERENCES users(id) ON DELETE CASCADE`; `webhook_events` unchanged.

## Decisions Made

- Ran the Vercel CLI (`vercel link`, `vercel env pull`) autonomously for Task 1 instead of stopping for a human checkpoint — the plan explicitly permitted this ("only the actual dashboard click-through... needs a human"), and the database turned out to already exist, so no human dashboard action was actually required.
- **HUMAN DECISION (post-halt):** Adopt the live database's pre-existing bigint-keyed `users`/`addresses` schema as canonical rather than dropping it to match Plan 01's original UUID design. The user confirmed this reflects prior, intentional out-of-band work on this exact Vercel project and that the existing data (2 user rows) should be preserved and built on. This **reverses CONTEXT.md decision D-08** (internal UUID PK for users) — the orchestrator will update `01-CONTEXT.md`'s decision record after this wave merges (explicitly not done here, per instruction, to avoid a worktree merge conflict).
- Checked `lib/db.js` for any UUID-schema assumption before finalizing — it makes no explicit claim about the `users` table's key type (it only documents the pooled-connection choice and fail-fast behavior), so no change was needed there.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Committed `.gitignore` update for `.vercel` link metadata**
- **Found during:** Task 1 (`vercel link`)
- **Issue:** `vercel link` auto-appended `.vercel` and `.env*` to `.gitignore` as a side effect (standard Vercel CLI behavior) — not in the plan's `files_modified: []`, but leaving it uncommitted would risk `.vercel/project.json` (org/project IDs) being accidentally committed later.
- **Fix:** Committed the `.gitignore` diff as-is.
- **Files modified:** `.gitignore`
- **Verification:** `git status --short` confirms `.vercel/` stays untracked after the commit.
- **Committed in:** `1b0dfa7`

### Architectural Change (Rule 4 — escalated, human-approved)

**2. [Rule 4 - Architectural] users/addresses schema reconciled from UUID to bigint IDENTITY**
- **Found during:** Task 2 (`node scripts/migrate.js`)
- **Issue:** The live database already contained a `users` table (`id BIGINT GENERATED ALWAYS AS IDENTITY`, 2 real rows: `google_sub`, `email`, `name`, `picture`, `created_at`, `last_login_at`, `stripe_customer_id`, with unique constraints on `google_sub` and `stripe_customer_id`) and an `addresses` table (`user_id BIGINT PRIMARY KEY REFERENCES users(id)`, `line1`/`city`/`state`/`postal_code`/`country`, 0 rows) — from prior out-of-band work on this same Vercel project, predating both this plan and Plan 01's migration tooling (`_migrations` was empty before this run). This conflicted directly with `migrations/0001_init.sql`'s UUID-keyed `users` design (CONTEXT.md D-08), causing a hard failure (`sessions_user_id_fkey cannot be implemented ... uuid and bigint`) when creating `sessions`.
- **Escalation:** Halted per Deviation Rule 4 (architectural decision, real data at stake) rather than guessing or dropping data. Returned a `checkpoint:decision` (gate=blocking-human) with three options (drop-and-recreate / adopt-existing-as-canonical / investigate-first).
- **Human decision:** Adopt the existing bigint schema as canonical; confirmed as intentional prior work on this exact project.
- **Fix:** Queried live constraints/indexes/identity-generation strategy first (`information_schema.table_constraints`, `pg_indexes`, `information_schema.columns` with `is_identity`/`identity_generation`) to avoid guessing, then rewrote `migrations/0001_init.sql`: `users.id` → `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY` with all live columns and their real unique constraints; added a matching `addresses` table definition; changed `sessions.user_id` and `subscriptions.user_id` from `UUID` to `BIGINT REFERENCES users(id) ON DELETE CASCADE`; left `webhook_events` unchanged (no FK to users).
- **Files modified:** `migrations/0001_init.sql`
- **Verification:** `node --env-file=.env.local scripts/migrate.js` now succeeds (`migrate: applied 0001_init.sql`); inline schema-check confirms all 6 tables present; second run confirms idempotency (`migrate: up to date (1 migrations)`); `users`/`addresses` row counts confirmed unchanged (2 / 0) before and after; new FK constraints on `sessions`/`subscriptions` confirmed pointing at `users(id)` via `information_schema`.
- **Committed in:** `8ad46ae`
- **Not done here (explicitly deferred to orchestrator):** `.planning/phases/01-foundation-environment-secrets-data-layer/01-CONTEXT.md`'s D-08 decision record still describes the original UUID design — the orchestrator will update it after this wave merges, to avoid a merge conflict with this worktree branch.

---

**Total deviations:** 2 (1 auto-fixed hygiene, 1 architectural change made with explicit human approval after a halt/resume cycle)
**Impact on plan:** The architectural change is significant (reverses a documented Phase 1 decision, D-08) but was explicitly required to preserve real, pre-existing production data rather than destroy it — no scope creep beyond what the human decision authorized.

## Issues Encountered

- `node scripts/migrate.js` initially failed with a foreign-key type mismatch (`uuid` vs `bigint`) because the live database already had a `users` table with an incompatible schema and real data. Resolved via a human-decision checkpoint (see Deviations above) rather than guessing or auto-fixing — this was a genuine architectural conflict, not a bug.

## User Setup Required

None — Vercel Postgres is provisioned, linked, `.env.local` is populated, and the full live schema (adopted/reconciled) is confirmed via a real migration run.

## Next Phase Readiness

- Plan 03 (and Phase 2+) can now assume a fully live, reachable Postgres database with `users` (bigint IDENTITY, pre-existing data preserved), `addresses`, `sessions`, `subscriptions`, `webhook_events`, and `_migrations` all present.
- **Important for downstream phases:** `users.id` is `BIGINT`, not `UUID`. Any future schema, code, or session/entitlement design (Phase 2 auth, Phase 3 billing/webhooks, Phase 4 content gating, Phase 5 account UI) referencing `users(id)` must use `bigint`, not the originally-planned `uuid`.
- `.planning/phases/01-foundation-environment-secrets-data-layer/01-CONTEXT.md`'s D-08 decision record needs updating by the orchestrator post-merge to reflect this reversal (not done in this worktree, per explicit instruction, to avoid a merge conflict).

---
*Phase: 01-foundation-environment-secrets-data-layer*
*Completed: 2026-09-08*
