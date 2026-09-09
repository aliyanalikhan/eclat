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

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
