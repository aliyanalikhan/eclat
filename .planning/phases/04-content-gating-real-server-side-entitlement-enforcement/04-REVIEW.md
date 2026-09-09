---
phase: 04-content-gating-real-server-side-entitlement-enforcement
reviewed: 2026-09-10T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - lib/session-user.js
  - lib/gated-content.js
  - api/content/editions/[no].js
  - api/billing/status.js
  - src/data/content.js
  - vercel.json
  - scripts/check-secrets.js
  - src/lib/useSafeFetch.js
  - src/lib/useGatedContent.js
  - src/lib/useEntitlements.js
  - src/routes/Edition.jsx
  - src/store.jsx
  - src/routes/Account.jsx
  - src/routes/Books.jsx
  - src/routes/Writings.jsx
  - src/routes/Archive.jsx
findings:
  critical: 0
  warning: 4
  info: 1
  total: 5
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-09-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

This phase replaces the client-trusted `subscribed` localStorage flag with real server-side entitlement enforcement. The core mechanism is solid: `src/store.jsx` no longer carries any subscription/session state at all (confirmed via grep across `src/` — no `subscribed`, no `eclat:demo-state`, no leftover client-trusted gating), `src/data/content.js`'s `editions[].excerpt` arrays now contain only the free paragraphs, and the actual gated paragraph text lives exclusively in `lib/gated-content.js`, returned only from `api/content/editions/[no].js` after a fresh, per-request `subscriptions` re-derivation (never memoized, never trusting the session cookie's mere presence as entitlement). Every fail path I traced in the identity/entitlement chain (`getSessionUser`, the editions API, `api/billing/status.js`, `useSafeFetch`/`useGatedContent`/`useEntitlements`, `Account.jsx`) fails closed — no code path grants gated content on an uncertain or errored outcome. Cache-Control is `no-store` on every response branch of the editions API, reinforced by a `vercel.json` rule.

No blocker-level leaks or bypasses were found. The issues below are all quality/robustness gaps: a safety-net script whose coverage claim doesn't match its actual scope, a defense-in-depth header rule that wasn't extended to a second sensitive endpoint, a nondeterministic status-display bug (display-only, does not affect real enforcement), and fabricated billing data now being shown to genuinely-paying users.

## Warnings

### WR-01: check-secrets.js's server-only-import marker check doesn't scan prerendered HTML, contradicting its own stated coverage

**File:** `scripts/check-secrets.js:78, 128-140`
**Issue:** The file's header comment (lines 13-16) states this script "scans the complete dist/ contents (prerendered HTML included, not just the Vite JS bundle) every time a build happens." That's true for the generic tracked-env-secret-value loop (which walks all of `dist/`), but the `SERVER_ONLY_IMPORT_MARKERS` check — the specific safeguard meant to catch exactly the class of leak this phase exists to close (a server-only module's text, including `lib/gated-content.js`'s gated paragraphs, ending up somewhere it shouldn't) — is gated behind `if (file.startsWith(CLIENT_BUNDLE_DIR))` where `CLIENT_BUNDLE_DIR = join(dist, 'assets')`. Prerendered route HTML lives at `dist/<route>/index.html`, which never starts with `dist/assets`, so this check silently skips every prerendered page.

This matters specifically for the `'quiet luxury of authenticity'` marker (lines 68-77), which exists to catch a reintroduced D-02-style leak of `lib/gated-content.js`. That module's whole purpose is to hold text meant to be *rendered into HTML* if it ever leaked via SSR (e.g., a route component accidentally importing `gatedParagraphsFor` and rendering its result server-side during `prerender.js`) — not just text that could end up inert inside a JS bundle. The one check most relevant to that exact leak vector is the one that's blind to prerendered HTML.

Currently there is no active leak (verified: `src/data/content.js`'s excerpts contain none of the gated paragraphs), so this is a robustness/defense-in-depth gap rather than an active vulnerability — but it is the last automated check before deploy, and its blind spot is precisely the highest-value leak vector for this phase's core module.
**Fix:** Drop the `CLIENT_BUNDLE_DIR` restriction for the `SERVER_ONLY_IMPORT_MARKERS` loop (or run it over the same file list as the tracked-secret loop) so prerendered HTML is covered too:
```js
// before
if (file.startsWith(CLIENT_BUNDLE_DIR)) {
  for (const marker of SERVER_ONLY_IMPORT_MARKERS) { ... }
}

// after — run over every scanned file, not just dist/assets
for (const marker of SERVER_ONLY_IMPORT_MARKERS) {
  if (content.includes(marker)) {
    const relPath = relative(dist, file)
    console.error(`check-secrets: a server-only lib module appears to be bundled/rendered into ${relPath}`)
    leaked = true
  }
}
```

### WR-02: `/api/billing/status.js` lacks the vercel.json defense-in-depth Cache-Control rule that `/api/content/*` has

**File:** `vercel.json:12-15`, `api/billing/status.js:28,47,51`
**Issue:** `api/content/editions/[no].js`'s header comment explicitly notes: "vercel.json adds a matching headers rule as defense-in-depth (Task 4)," and indeed `vercel.json` has a `"source": "/api/content/(.*)"` rule forcing `Cache-Control: no-store`. `api/billing/status.js` sets `Cache-Control: no-store` in-code on every branch too, but there is no equivalent `vercel.json` rule for `/api/billing/(.*)` — despite this endpoint also returning per-user, sensitive subscription data (status, `current_period_end`) gated behind a session cookie. If the in-code header were ever dropped in a future edit (e.g., a refactor that forgets to carry it on a new branch), there is no CDN/edge-level backstop for this endpoint the way there is for `/api/content`.
**Fix:** Add a matching rule in `vercel.json`:
```json
{
  "source": "/api/billing/(.*)",
  "headers": [{ "key": "Cache-Control", "value": "no-store" }]
}
```

### WR-03: `api/billing/status.js`'s per-product status derivation has no ordering/dedup, so it can display stale subscription status

**File:** `api/billing/status.js:32-45`
**Issue:** The `subscriptions` table (see `migrations/0001_init.sql:61-79`) stores "one row per Stripe subscription" — there is no uniqueness constraint on `(user_id, stripe_product_id)`, only on `stripe_subscription_id`. A user who subscribes, cancels, and later resubscribes to the same product (e.g. `eclat-online`) will legitimately accumulate two rows for that product: an old row with `status = 'canceled'` and a new row with `status = 'active'`. The query:
```sql
SELECT stripe_product_id, status, current_period_end FROM subscriptions WHERE user_id = ${session.user.id}
```
has no `ORDER BY`, and the response-building loop does last-write-wins per product key:
```js
for (const row of rows) {
  const key = PRODUCT_ID_TO_KEY[row.stripe_product_id]
  if (!key || !isProductKey(key)) continue
  subscriptions[key] = { status: row.status, current_period_end: row.current_period_end }
}
```
Without an `ORDER BY`, Postgres does not guarantee row order, so which row "wins" for that product key is nondeterministic. A genuinely active, currently-paying subscriber could have their status displayed as `canceled` (or a stale `current_period_end` shown) on `Account.jsx`/`/subscribe`, or vice versa. This is a display-only bug — it does not affect real content-gating enforcement, which `api/content/editions/[no].js` re-derives independently and correctly via `WHERE status = 'active' LIMIT 1` (any active row is sufficient regardless of row order) — but it is a genuine correctness bug in the one endpoint whose entire purpose is to report the user's own accurate billing state.
**Fix:** Order by recency and take the latest row per product, e.g.:
```sql
SELECT DISTINCT ON (stripe_product_id) stripe_product_id, status, current_period_end
FROM subscriptions
WHERE user_id = ${session.user.id}
ORDER BY stripe_product_id, updated_at DESC
```

### WR-04: `Account.jsx` renders fully fabricated, identical billing history for every real subscriber

**File:** `src/routes/Account.jsx:57-62, 89-98`
**Issue:** Once `active` is true (a real, server-verified `eclat-online` subscription), the page renders `rows = invoices` — `src/data/content.js`'s hardcoded `invoices` array (dated `12 Aug 2026`, `12 Aug 2025`, `12 Aug 2024`, `12 Aug 2023`, all `$84.00`/`$78.00`) — as if it were the signed-in user's actual billing history, and additionally hardcodes `'•••• 4242'` as the "Card on file" for every active user (line 98) and `planLabel = '—'` regardless of which plan/interval they actually purchased. A subscriber who joined in September 2026 with a $9/mo plan would see four years of fabricated annual invoices that never happened, attached to their real account. This is explicitly flagged in-code as deferred to "Phase 5's ACCT-01/ACCT-04," so it's a known, documented gap rather than a silent oversight — but it ships to real, paying users in this phase and presents fabricated financial records as genuine, which is a user-trust/quality issue worth tracking explicitly rather than leaving implicit in a comment.
**Fix:** Either gate the "Billing history" section behind a real per-user invoice fetch (even a minimal one from Stripe) before this ships, or render an explicit "billing history coming soon" placeholder instead of static mock data that impersonates real records:
```jsx
{rows.length === 0 ? (
  <p className="empty">Billing history isn't available here yet.</p>
) : ( /* ... */ )}
```

## Info

### IN-01: `useGatedContent`'s `session` parameter is accepted but never used

**File:** `src/lib/useGatedContent.js:32`
**Issue:** `useGatedContent(editionNo, session)` documents that `session` is supplied by the caller and that the hook "never reads any signed-in/out indicator the API response might carry" — but the parameter is also never read anywhere in the function body at all. `Edition.jsx` passes a brand-new object literal (`{ ok: sessionOk }`) on every render for it. It's harmless today (no functional bug), but it's dead code that could mislead a future maintainer into thinking the hook's fetch/enabled logic is session-aware when it isn't.
**Fix:** Either remove the unused parameter, or make its purpose explicit with an inline comment/JSDoc `@param` note clarifying it is intentionally unused today and reserved for a future short-circuit optimization — whichever matches the team's intent.

---

_Reviewed: 2026-09-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
