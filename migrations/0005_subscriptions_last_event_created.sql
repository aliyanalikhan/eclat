-- Phase 3 code-review fix pass, WR-03: webhook subscription upserts have no
-- event-ordering guard. Stripe does not guarantee webhook delivery order (and
-- retries reorder it further), so a delayed older event could otherwise
-- overwrite a row that already reflects a newer one (e.g. resurrect a
-- canceled subscription or revoke an active one). This column stores the
-- source event's `created` epoch (unix seconds) as a watermark; the
-- upsert's ON CONFLICT ... DO UPDATE branch is guarded by
-- `WHERE subscriptions.last_event_created IS NULL OR
-- subscriptions.last_event_created <= EXCLUDED.last_event_created`
-- (api/billing/webhook.js's upsertSubscription), so a row already at least
-- as recent as the incoming event is never overwritten.
--
-- Idempotent per project migration convention (IF NOT EXISTS) so this file
-- is safely re-runnable. Backfill leaves existing rows at NULL, which the
-- upsert guard explicitly treats as "no watermark yet" — the next event for
-- such a row is accepted unconditionally, which is correct for pre-existing
-- live subscriptions.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_event_created BIGINT;
