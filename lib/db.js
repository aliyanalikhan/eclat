/**
 * Server-only Postgres client. SERVER-ONLY — this file must never be imported
 * from anything under src/ or shipped to the client bundle; it reads a secret
 * connection string from process.env.
 *
 * Uses the pooled connection (POSTGRES_URL), not POSTGRES_URL_NON_POOLING —
 * serverless functions must use the pooled connection to avoid exhausting
 * Postgres's connection limit under concurrent invocations (Phase 1 CONTEXT.md D-03).
 *
 * Raw tagged-template SQL via @vercel/postgres, no ORM (D-04) — matches the
 * project's existing minimal-dependency style.
 *
 * Fails fast: if POSTGRES_URL is unset, this module throws immediately on
 * import rather than silently proceeding or inventing a connection string
 * (D-02). Provision Vercel Postgres and pull the env var locally before use.
 *
 * `sql` (the HTTP-based tagged template) is the default for every
 * single-statement query in this codebase and does not support real
 * multi-statement transactions (see scripts/migrate.js's SAFETY CONTRACT
 * comment). `db` is additionally exported — a pooled client
 * (`db.connect()` -> `client.query('BEGIN')`/`'COMMIT'`/`'ROLLBACK')` -
 * for the rare case that genuinely needs one (Phase 3 Plan 03-01 Task 3:
 * the webhook idempotency insert and subscriptions upsert must roll back
 * together on failure). Prefer `sql` unless you actually need atomicity
 * across more than one statement.
 */
import { db, sql } from '@vercel/postgres'

if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Provision Vercel Postgres and run `vercel env pull .env.local`, then retry.',
  )
}

export { db, sql }
