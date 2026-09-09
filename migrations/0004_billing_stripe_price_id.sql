-- Phase 3, Plan 03-01 Task 1: D-02 branch B. The live Stripe account was
-- verified (execution time, 2026-09-09) to have TWO active recurring prices
-- per product (monthly + annual) for all 4 products, not one fixed price —
-- so the specific price a subscriber is on must be recorded, not just the
-- product. subscriptions_user_product_idx (0001_init.sql) already satisfies
-- the per-product entitlement lookup (GATE-03); this column is additive and
-- does not need its own index. Idempotent per project migration convention
-- (IF NOT EXISTS) so this file is safely re-runnable.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
