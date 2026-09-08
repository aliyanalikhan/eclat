-- Phase 2 (Plan 02-01): add opaque session-token hash storage to sessions.
--
-- D-12: the session cookie carries a random, high-entropy opaque token; only
-- its SHA-256 hash is ever persisted here. A database read/leak alone can
-- never be replayed as a live session, since the raw token is never written
-- to this column (or anywhere else server-side).
--
-- All statements use IF NOT EXISTS so this file is safely re-runnable, per
-- scripts/migrate.js's non-transactional safety contract (see 0001_init.sql
-- header comment and scripts/migrate.js lines 14-21).

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_key ON sessions (token_hash);
