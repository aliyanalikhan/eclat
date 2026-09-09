/**
 * Server-only Stripe client. SERVER-ONLY — this file must never be imported
 * from anything under src/ or shipped to the client bundle; it reads a
 * secret API key from process.env.
 *
 * Fails fast: if STRIPE_SECRET_KEY is unset, this module throws immediately
 * on import rather than silently proceeding or inventing a key (mirrors
 * lib/db.js's POSTGRES_URL fail-fast check, Phase 1 CONTEXT.md D-02).
 * Provision the key on Vercel and pull it locally before use.
 */
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY is not set. Pull it with `vercel env pull .env.local`, then retry.',
  )
}

// WR-04: pin the API version the webhook handler and price lookups are
// actually written against (confirmed live on this account 2026-09-09) so a
// Stripe Dashboard default change can never silently drift the response
// shapes this code parses (Basil-era `items.data[0].current_period_end`,
// `invoice.parent.subscription_details.subscription`). Passed verbatim as
// the Stripe-Version header.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-08-26.dahlia',
})
