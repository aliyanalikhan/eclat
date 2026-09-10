/**
 * GET /api/billing/account — authenticated, per-product account aggregate
 * read for the /account page. Vercel Node.js Function using the Web Handler
 * signature. Sibling of api/billing/status.js (D-01): status.js stays lean
 * (it is polled by useEntitlements on every gated page) while this endpoint
 * carries the richer per-product payload the rebuilt Account page needs.
 *
 * Composition (D-03/D-04): DB rows ALWAYS render, then three independent
 * best-effort live Stripe sections (cancel_at_period_end, card, invoices)
 * enrich the base map. Any section failure degrades only that section to
 * `available: false` — the endpoint never 502s and never lets a Stripe
 * error cross the wire (presentation-safe, T3/T9).
 *
 * Wire shape per held product slug (D-02/D-16):
 *   { status, planLabel, renews, cancelAtPeriodEnd, card, invoices }
 * renews is server-pre-formatted 'D MMM YYYY' (05-02 Task 3 + 05-UI-SPEC §1:
 * the client renders the string verbatim). card = { brand, last4, expMonth,
 * expYear } only — never a PAN or a payment-method id (T3).
 */
import { sql } from '../../lib/db.js'
import { PRODUCT_ID_TO_KEY, planLabelFor } from '../../lib/products.js'
import { getSessionUser } from '../../lib/session-user.js'
import { stripe } from '../../lib/stripe.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Normalize a renewal instant into the locked 'D MMM YYYY' wire format
// (e.g. '12 Aug 2026'). Accepts a JS Date (DB TIMESTAMPTZ via
// @vercel/postgres) or epoch seconds (live Stripe item current_period_end);
// null/undefined/garbage → null (the UI's '—' signal). UTC components keep
// the string deterministic across server timezones.
function formatRenews(value) {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value * 1000)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

export default {
  async fetch(request) {
    // Every response branch reuses this const — user-specific billing
    // payloads must never sit in a shared cache (IN-01/T2).
    const noStore = { 'Cache-Control': 'no-store' }

    // Step 1 — identity (fail-closed, status.js-identical 401 shape).
    const session = await getSessionUser(request)
    if (!session) {
      return Response.json({ subscriptions: {} }, { status: 401, headers: noStore })
    }

    // Step 2 — DB rows ALWAYS (D-04). A DB read failure here is a genuine
    // server-side outage, not "not signed in" — it must be observably
    // distinct (status + logging) from Step 1's 401 so the client-side
    // fail-closed check in useSafeFetch.js can tell the two apart (CR-01).
    let rows
    try {
      rows = await sql`
        SELECT stripe_product_id, status, current_period_end,
               stripe_customer_id, stripe_price_id, stripe_subscription_id
        FROM subscriptions WHERE user_id = ${session.user.id}
      `
    } catch (err) {
      console.error('account: failed to load subscriptions', err)
      return Response.json({ error: 'unavailable' }, { status: 500, headers: noStore })
    }

    // Step 3 — slug-keyed base map (D-02/D-16): unknown product ids are
    // skipped exactly like status.js skips them. planLabel is derived
    // server-side from the stored stripe_price_id (D-13).
    const subscriptions = {}
    const rowForKey = {}
    for (const row of rows) {
      const key = PRODUCT_ID_TO_KEY[row.stripe_product_id]
      if (!key) continue
      subscriptions[key] = {
        status: row.status,
        planLabel: planLabelFor(row.stripe_price_id),
        renews: formatRenews(row.current_period_end),
        cancelAtPeriodEnd: false,
        card: { available: false },
        invoices: { available: false },
      }
      rowForKey[key] = row
    }

    // Step 4 — best-effort live Stripe enrichment (D-07 single customer).
    // Each section is an independent try/catch that leaves its section's
    // `available: false` on failure (D-04) — never one big try, never a
    // 502 on /api/billing/account.
    const customerId = rows[0]?.stripe_customer_id
    if (customerId) {
      // Section A — live cancel_at_period_end + renewal (D-14): the DB does
      // not persist the cancel flag (upsertSubscription never writes it), so
      // read it live. current_period_end lives on the first subscription
      // item in this API version (webhook.js item-level pattern, Pitfall 1).
      let liveSubs = []
      try {
        const { data } = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 })
        liveSubs = data
        for (const key of Object.keys(subscriptions)) {
          const held = rowForKey[key]
          const live = liveSubs.find((sub) => sub.id === held.stripe_subscription_id)
          if (!live) continue
          const itemEnd = live.items?.data?.[0]?.current_period_end
          if (itemEnd) subscriptions[key].renews = formatRenews(itemEnd)
          subscriptions[key].cancelAtPeriodEnd = Boolean(live.cancel_at_period_end)
        }
      } catch {
        // Leave the DB renews and cancelAtPeriodEnd:false (D-04).
      }

      // Section B — card (D-15): resolve the default payment method, then
      // retrieve the EXACT pm when we have its id (never re-list and take
      // `.data[0]` when a specific default exists). Fall back to the first
      // listed payment method only when no default exists anywhere.
      try {
        const customer = await stripe.customers.retrieve(customerId)
        let pmId = customer.invoice_settings?.default_payment_method
        if (!pmId) {
          // Subscription-level default from Section A's live list — NOT a
          // DB column (research sketch's rows[0]?.default_payment_method is
          // wrong, prohibition 10).
          pmId = liveSubs[0]?.default_payment_method ?? null
        }
        let pm = null
        if (pmId) {
          pm = await stripe.paymentMethods.retrieve(pmId)
        } else {
          const { data: pms } = await stripe.customers.listPaymentMethods(customerId, { limit: 1 })
          pm = pms[0] ?? null
        }
        if (pm?.card) {
          const card = {
            available: true,
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
          for (const key of Object.keys(subscriptions)) {
            subscriptions[key].card = card
          }
        }
      } catch {
        // Leave card.available = false → the UI renders '—' (D-04/D-15).
      }

      // Section C — invoices (D-09..D-12): one shared list for ALL held
      // products, most-recent-first (Stripe's natural ordering), limit 12,
      // no pagination (D-10). Only presentation-safe fields cross the wire.
      try {
        const { data } = await stripe.invoices.list({ customer: customerId, limit: 12, status: 'paid' })
        const items = data.map((invoice) => ({
          number: invoice.number,
          created: invoice.created,
          amount_paid: invoice.amount_paid,
          hosted_invoice_url: invoice.hosted_invoice_url,
        }))
        for (const key of Object.keys(subscriptions)) {
          subscriptions[key].invoices = { available: true, items }
        }
      } catch {
        // Leave invoices.available = false → the error note (D-04).
      }
    }

    // Step 5 — always 200 with DB state, even if every section failed (D-04).
    return Response.json({ subscriptions }, { headers: noStore })
  },
}
