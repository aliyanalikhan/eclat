/**
 * POST /api/billing/webhook — Stripe webhook dispatcher (BILL-03/BILL-04).
 * Vercel Node.js Function using the Web Handler signature. POST only —
 * every other method is rejected with 404.
 *
 * Reads the raw body via `request.text()` BEFORE any parsing and verifies
 * it with `stripe.webhooks.constructEvent` (D-09) — never `request.json()`
 * first, which would break signature verification (RESEARCH.md Pitfall 1).
 * Idempotent via the `webhook_events` primary key (D-10): the dedupe insert
 * and the subscriptions upsert run inside one real Postgres transaction
 * (`lib/db.js`'s `db.connect()` pooled client, not the HTTP-based `sql`
 * tagged template used elsewhere — that driver does not support
 * multi-statement transactions, see scripts/migrate.js's SAFETY CONTRACT
 * comment) so a failed upsert rolls the event record back too and Stripe's
 * redelivery can retry it. `webhook_events` is only ever recorded once a
 * business-effect step either succeeds or deliberately no-ops (unresolved
 * user — logged, not thrown); a genuine DB failure rolls back and returns
 * 500 so Stripe retries.
 *
 * `customer.subscription.*` events resolve the internal user via
 * `subscription.metadata.userId` (set via `subscription_data.metadata` at
 * Checkout creation time, api/billing/checkout.js) — this makes every
 * subscription-lifecycle event self-sufficient for user resolution and
 * never depends on delivery order (RESEARCH.md Pattern 3, Pitfall 3).
 * `checkout.session.completed` additionally backfills
 * `users.stripe_customer_id` from `client_reference_id`.
 *
 * Status values mirror Stripe's own enum verbatim (D-11) — no translation
 * layer. `invoice.payment_failed` only ever writes `status = 'past_due'`;
 * it never touches a subscriptions row directly with data pulled from
 * anywhere except the resolved subscription id, since status transitions
 * are otherwise owned exclusively by the subscription events.
 *
 * Never logs raw webhook payloads or signing secrets — only event ids and
 * error messages.
 */
import { db } from '../../lib/db.js'
import { stripe } from '../../lib/stripe.js'

/**
 * Resolves the internal users.id for a Stripe Subscription object: first
 * via subscription.metadata.userId (set via Pattern 2's subscription_data
 * metadata at Checkout creation time — this is what makes subscription
 * events self-sufficient, independent of event delivery order), falling
 * back to a stripe_customer_id lookup if the metadata path can't be
 * trusted (row doesn't actually exist). Returns null if neither resolves.
 */
async function resolveUserId(client, sub) {
  const metadataUserId = sub.metadata?.userId // set via Pattern 2's subscription_data.metadata
  if (metadataUserId) {
    const { rows } = await client.query('SELECT id FROM users WHERE id = $1', [metadataUserId])
    if (rows.length) return rows[0].id
  }
  if (sub.customer) {
    const { rows } = await client.query('SELECT id FROM users WHERE stripe_customer_id = $1', [
      sub.customer,
    ])
    if (rows.length) return rows[0].id
  }
  return null
}

/**
 * Upserts one subscriptions row from a Stripe Subscription object, keyed on
 * stripe_subscription_id (unique index from migrations/0001_init.sql).
 * status is stored verbatim (D-09) — customer.subscription.deleted also
 * flows through here with Stripe's own 'canceled' status, so the row
 * always reflects Stripe's latest word and naturally falls out of D-04's
 * active/trialing/past_due entitlement check.
 */
async function upsertSubscription(client, sub) {
  const userId = await resolveUserId(client, sub)
  if (!userId) {
    // Cannot reconcile yet (e.g. checkout.session.completed hasn't landed
    // and stripe_customer_id isn't backfilled) — record-only, no throw, so
    // the transaction still commits and this event is not redelivered
    // forever. A later event for the same subscription can still resolve.
    console.error(`webhook: could not resolve user for subscription ${sub.id}`)
    return
  }

  // items.data[0] — Basil API version moved current_period_end (and the
  // price/product reference) off the subscription root onto the first
  // subscription item (RESEARCH.md Pitfall 2).
  const item = sub.items.data[0]
  const priceId = item?.price?.id ?? null
  const productId = item?.price?.product ?? null
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null

  await client.query(
    `INSERT INTO subscriptions
       (user_id, stripe_subscription_id, stripe_customer_id, stripe_product_id, stripe_price_id, status, current_period_end, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (stripe_subscription_id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       stripe_customer_id = EXCLUDED.stripe_customer_id,
       stripe_product_id = EXCLUDED.stripe_product_id,
       stripe_price_id = EXCLUDED.stripe_price_id,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       updated_at = now()`,
    [userId, sub.id, sub.customer, productId, priceId, sub.status, currentPeriodEnd],
  )
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response(null, { status: 404 })
    }

    // Raw body FIRST, never request.json() before signature verification —
    // Stripe signs the exact bytes it sent (RESEARCH.md Pitfall 1).
    const rawBody = await request.text()
    const signature = request.headers.get('stripe-signature')

    let event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      // 400 — signature verification owns this status code. Never log the
      // payload or the signing secret, only the failure reason.
      console.error(`webhook: signature verification failed: ${err.message}`)
      return new Response('Invalid signature', { status: 400 })
    }

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // Idempotency gate (D-10/BILL-04): record-before-process via the
      // webhook_events primary key. If this event id is already recorded,
      // it was already processed (or a concurrent invocation owns it right
      // now) — no-op, never touch subscriptions.
      const { rowCount } = await client.query(
        'INSERT INTO webhook_events (stripe_event_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [event.id],
      )
      if (rowCount === 0) {
        await client.query('COMMIT')
        return Response.json({ received: true })
      }

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object
          if (session.customer && session.client_reference_id) {
            await client.query(
              `UPDATE users SET stripe_customer_id = $1
               WHERE id = $2 AND (stripe_customer_id IS NULL OR stripe_customer_id <> $1)`,
              [session.customer, session.client_reference_id],
            )
          }
          if (session.subscription) {
            const sub = await stripe.subscriptions.retrieve(session.subscription)
            await upsertSubscription(client, sub)
          }
          break
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const sub = event.data.object
          await upsertSubscription(client, sub)
          break
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object
          // Basil-era path first, with a fallback to the pre-Basil direct
          // field — the live payload shape for this account's actual API
          // version is confirmed at execution time (RESEARCH.md Assumption
          // A1 / Open Question 2), not assumed from training data alone.
          const subId = invoice.parent?.subscription_details?.subscription ?? invoice.subscription ?? null
          if (subId) {
            await client.query(
              `UPDATE subscriptions SET status = 'past_due', updated_at = now()
               WHERE stripe_subscription_id = $1`,
              [subId],
            )
          } else {
            console.error(`webhook: invoice.payment_failed ${event.id} has no resolvable subscription id`)
          }
          break
        }
        default:
          // Unknown/uncatchable event type — record-only, no business
          // effect. 200 owns this status code.
          break
      }

      await client.query('COMMIT')
      return Response.json({ received: true })
    } catch (err) {
      // 500 — DB/business-logic error owns this status code. Roll back so
      // the webhook_events insert is undone too and Stripe's redelivery
      // can retry the whole event, never a half-applied state.
      await client.query('ROLLBACK').catch(() => {})
      console.error(`webhook: failed to process event ${event.id}: ${err.message}`)
      return new Response(null, { status: 500 })
    } finally {
      client.release()
    }
  },
}
