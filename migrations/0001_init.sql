-- Phase 1 foundation schema: users, sessions, subscriptions, webhook_events.
-- All statements use IF NOT EXISTS so this file is safely re-runnable.
--
-- Assumes native gen_random_uuid() (built into PostgreSQL 13+, which
-- Neon/Vercel Postgres runs) needs no extension. If this fails with a
-- missing-function error when Plan 02 runs the real migration, the fix is
-- adding `CREATE EXTENSION IF NOT EXISTS pgcrypto;` as this file's first
-- statement before re-running.

-- users: internal UUID PK; google_sub (Google's stable identity claim) is a
-- separate unique, indexed column looked up only at sign-in (D-08).
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_key ON users (google_sub);

-- sessions: minimal shape per CONTEXT.md discretion — Phase 2 owns session design.
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

-- subscriptions: mirrors Stripe directly, one row per Stripe subscription
-- (D-07). status mirrors Stripe's own status enum verbatim, no translation
-- layer (D-09). The (user_id, stripe_product_id) index satisfies GATE-03's
-- per-product entitlement lookup (Hard Copy and Online are independent).
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
-- no full payload column, no audit-log requirement was raised.
CREATE TABLE IF NOT EXISTS webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
