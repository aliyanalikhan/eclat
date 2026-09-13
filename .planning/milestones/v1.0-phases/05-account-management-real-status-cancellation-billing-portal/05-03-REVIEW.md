---
phase: 05-account-management-real-status-cancellation-billing-portal
reviewed: 2026-09-10T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - api/billing/account.js
  - src/lib/useSafeFetch.js
  - src/routes/Account.jsx
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 05: Code Review Report (Re-verification Pass)

**Reviewed:** 2026-09-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** clean

## Summary

Re-verification pass over the same three files from the prior review
(`api/billing/account.js`, `src/lib/useSafeFetch.js`,
`src/routes/Account.jsx`), following a targeted fix to the previously
reported Critical bug in `api/billing/account.js`.

**1. Prior Critical (CR-01) — resolved.**
`api/billing/account.js:59` now correctly destructures the query result:

```js
;({ rows } = await sql`
  SELECT stripe_product_id, status, current_period_end,
         stripe_customer_id, stripe_price_id, stripe_subscription_id
  FROM subscriptions WHERE user_id = ${session.user.id}
`)
```

`rows` is a real array again, matching every other call site in the
codebase (`api/billing/status.js`, `api/billing/webhook.js`, etc.), so
`for (const row of rows)` at line 70 no longer throws.

In addition, the base-map construction step (the prior review's WR-01
recommendation) is now inside the same `try` block: lines 58–86 cover
both the DB read (line 59) and the slug-keyed `subscriptions`/`rowForKey`
construction (lines 65–82), with a single `catch` (lines 83–86) that logs
via `console.error` and returns `Response.json({ error: 'unavailable' },
{ status: 500, headers: noStore })`. A DB read failure or a shaping
failure (e.g. an unexpected row shape) both now degrade to the documented
500/`{ error: 'unavailable' }` response instead of an unhandled exception
reaching the runtime. Verified this return happens before `rows[0]` is
ever dereferenced at line 92 (Step 4), so a failed Step 2/3 can never
leave `rows` in a partially-consumed state downstream.

**2. Prior gap-closure fixes — all still present, unaffected by this edit.**
- **CR-01 (useSafeFetch fail-closed check):** `src/lib/useSafeFetch.js:61`
  — `if (!r.ok && r.status !== 401) throw new Error(\`http ${r.status}\`)`
  still throws before the body is parsed on any non-2xx/non-401 response,
  routing a `500 { error: 'unavailable' }` from `account.js` into the
  hook's fail-closed `error: true` path (not silently parsed as data).
- **CR-02 (single-held-key invoice read):** `src/routes/Account.jsx:95-103`
  still reads the shared invoice list from `subs[heldKeys[0]]` only,
  with the comment explaining why (one Stripe customer → one shared
  invoice list assigned identically to every held product key by
  `account.js` Section C, lines 153-166) rather than concatenating
  per-product copies.
- **CR-03 (cancelAtPeriodEnd label):** `src/routes/Account.jsx:147-148`
  still computes `renewsKey` as `'Access until'` when
  `sub.status === 'canceled' || sub.cancelAtPeriodEnd`, and
  `api/billing/account.js` Section A (lines 94-112) still fetches
  `cancel_at_period_end` live from Stripe on every request (not
  persisted in the DB), matching D-14.

**3. No new issues introduced by this edit.**
Traced the full request path: `rows` is guaranteed either (a) a valid
array when execution reaches Step 4 (line 92, `rows[0]?.stripe_customer_id`),
because any failure in the `try` block returns early at line 85, or
(b) never reached at all. `subscriptions` and `rowForKey` follow the same
guarantee — both are only read after the `try` block completes
successfully. Sections A/B/C (lines 93-167) are unchanged from the prior
review and remain independently try/caught, each degrading only its own
section (`cancelAtPeriodEnd: false`, `card.available: false`,
`invoices.available: false`) without affecting the others. No dead code,
no shadowed variables, no altered response shape.

All reviewed files meet quality standards. No open findings.

---

_Reviewed: 2026-09-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
