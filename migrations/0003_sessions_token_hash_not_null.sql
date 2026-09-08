-- Phase 2 code review (WR-08): enforce the "every session row has a hash"
-- invariant at the schema level, not just by convention.
--
-- 0002_sessions_token_hash.sql added `token_hash` as nullable so the ALTER
-- TABLE ADD COLUMN could run without a default against any pre-existing
-- rows. Every current insert path (api/auth/google/callback.js) always
-- supplies a hash, and no legacy null rows are expected to exist, so this
-- can safely tighten the column to NOT NULL in a follow-up migration.
--
-- Per scripts/migrate.js's safety contract, migration files must be safe to
-- re-run in full if the process dies mid-way (applying a file and recording
-- it in _migrations are two separate, non-transactional statements). A
-- plain `SET NOT NULL` is itself idempotent — re-running it against a
-- column that is already NOT NULL is a no-op, not an error — so this file
-- satisfies that contract without needing an IF NOT EXISTS guard.

ALTER TABLE sessions ALTER COLUMN token_hash SET NOT NULL;
