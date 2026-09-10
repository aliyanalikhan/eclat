import { useSafeFetch } from './useSafeFetch.js'

/**
 * Stable, module-level empty payload. A fresh `{ subscriptions: {} }` per
 * render would churn any consumer that keys effects or memos off `data`, so
 * the safe default is created exactly once and reused on every fallback.
 */
const EMPTY = { subscriptions: {} }

/**
 * Client hook wrapping GET /api/billing/account (Wave 1, D-01). The third
 * consumer of the shared useSafeFetch primitive (after useGatedContent and
 * useEntitlements) — it inherits AbortController cancellation on
 * unmount/route-change and latest-request-wins ordering for free rather than
 * re-implementing its own cancelled-guard.
 *
 * Wire contract (D-01, server-pre-formatted):
 *   200 {
 *     subscriptions: {
 *       [slug]: {
 *         status,                 // 'active' | 'past_due' | 'canceled' | ...
 *         planLabel,              // e.g. 'Éclat Online — Monthly'
 *         renews,                 // 'D MMM YYYY' string, or ''
 *         cancelAtPeriodEnd,      // boolean
 *         card:    { available, brand, last4 },
 *         invoices:{ available, items: [{ number, created, amount_paid, hosted_invoice_url }] }
 *       }
 *     }
 *   }
 *   401 { subscriptions: {} }
 *
 * Fail-closed (D-04 client mirror): any 401, network, or parse failure sets
 * `error: true` so the renderer treats the outcome as UNKNOWN — it must never
 * fabricate a "no subscription" state from a failed request.
 *
 * Single shot on mount (`enabled: true, key: 0`): this hook NEVER re-fetches
 * and NEVER polls. A portal round-trip returns to a freshly mounted /account
 * (route remount, D-06), which issues a new request — no `key` bump is needed
 * here. Imports are restricted to sibling `src/lib` modules; this file must
 * never import from `lib/` or `api/` (SERVER-ONLY boundary, WR-10).
 *
 * @returns {{ loading: boolean, data: { subscriptions: Record<string, object> }, error: boolean }}
 */
export function useAccount() {
  const { loading, data, error } = useSafeFetch('/api/billing/account', {
    enabled: true,
    key: 0, // single shot on mount; Account refetches on route return (D-06)
  })

  return {
    loading,
    data: data ?? EMPTY,
    error: Boolean(error), // fail-closed: true → treats as unknown, never as "no subscriptions"
  }
}
