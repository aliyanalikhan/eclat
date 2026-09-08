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
 */
import { sql } from '@vercel/postgres'

if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Provision Vercel Postgres and run `vercel env pull .env.local`, then retry.',
  )
}

export { sql }
