-- Phase 1 foundation schema: users, addresses, sessions, subscriptions, webhook_events.
-- All statements use IF NOT EXISTS so this file is safely re-runnable.
--
-- Assumes native gen_random_uuid() (built into PostgreSQL 13+, which
-- Neon/Vercel Postgres runs) needs no extension. If this fails with a
-- missing-function error, the fix is adding
-- `CREATE EXTENSION IF NOT EXISTS pgcrypto;` as this file's first
-- statement before re-running.
--
-- users/addresses reconciled with reality (2026-09-08, Plan 01-02 Task 2):
-- this Vercel project already had a bigint-keyed `users` table (and an
-- `addresses` table) from prior out-of-band work on this same project,
-- containing real rows. The original Phase 1 CONTEXT.md decision D-08
-- (internal UUID PK for users) is superseded — the pre-existing bigint
-- IDENTITY schema is adopted as canonical instead of dropping live data.
-- The CREATE TABLE/INDEX statements below for users/addresses are no-ops
-- against that live database (IF NOT EXISTS) but document the schema
-- shape for anyone provisioning a fresh environment. sessions and
-- subscriptions reference users(id) as BIGINT (was UUID) to match.

-- users: bigint IDENTITY PK (matches the live table's actual
-- GENERATED ALWAYS AS IDENTITY strategy); google_sub (Google's stable
-- identity claim) is a separate unique, indexed column looked up only at
-- sign-in (D-08, now bigint-keyed instead of UUID-keyed).
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  google_sub TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_customer_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_key ON users (google_sub);
CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_key ON users (stripe_customer_id);

-- addresses: one-to-one with users (PK = FK, no separate id column) —
-- matches the live table's shape exactly.
CREATE TABLE IF NOT EXISTS addresses (
  user_id BIGINT PRIMARY KEY REFERENCES users(id),
  line1 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT
);

-- sessions: minimal shape per CONTEXT.md discretion — Phase 2 owns session design.
-- user_id is BIGINT to match the live users(id) IDENTITY column.
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

-- subscriptions: mirrors Stripe directly, one row per Stripe subscription
-- (D-07). status mirrors Stripe's own status enum verbatim, no translation
-- layer (D-09). The (user_id, stripe_product_id) index satisfies GATE-03's
-- per-product entitlement lookup (Hard Copy and Online are independent).
-- user_id is BIGINT to match the live users(id) IDENTITY column.
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_product_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_key ON subscriptions (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS subscriptions_user_product_idx ON subscriptions (user_id, stripe_product_id);

-- webhook_events: idempotency via the primary key constraint alone (D-10) —
-- no full payload column, no audit-log requirement was raised. Unaffected
-- by the users id-type reconciliation (no FK to users).
CREATE TABLE IF NOT EXISTS webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
