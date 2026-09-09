# Phase 3: Billing & Webhooks — Pattern Map

**Mapped:** 2026-09-09
**Files analyzed:** 12 (new/modified)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `lib/stripe.js` | config/service (client singleton) | n/a (module init) | `lib/db.js` | exact |
| `lib/products.js` | config | lookup/allowlist | `lib/session.js` (server-only helper module style) | role-match |
| `api/billing/checkout.js` | route (GET redirect) | request-response | `api/auth/google.js` | exact |
| `api/billing/webhook.js` | route (POST webhook) | event-driven | `api/auth/google/callback.js` (fail-closed multi-step handler) | role-match |
| `api/billing/status.js` | route (GET, authenticated read) | request-response (polling) | `api/auth/session.js` | exact |
| `migrations/000N_billing.sql` (if needed, e.g. `stripe_price_id`) | migration | schema | `migrations/0001_init.sql` | exact |
| `src/routes/Subscribe.jsx` (reworked) | component (route) | CRUD-ish (read entitlement, trigger redirect) | itself (existing file, rewritten) + `src/routes/Account.jsx` (session/loading pattern) | exact (self) / role-match |
| `src/routes/SubscribeSuccess.jsx` (new) | component (route) | polling / request-response | `src/routes/Account.jsx` (useSession + loading gate) | role-match |
| `src/App.jsx` | route table | n/a | itself | exact |
| `src/data/seo.js` | config (per-route metadata) | n/a | itself | exact |
| `src/lib/useSession.js` (reused, maybe extended) | hook | request-response | itself | exact |
| `src/styles/eclat.css` (`--bad` token + `.plan__interval`/`.plan__badge`) | config (CSS) | n/a | itself (`.plan`, `.demo-notice`, `.pill`, `.chip`, `.dot` blocks) | exact |

## Pattern Assignments

### `lib/stripe.js` (config/service)

**Analog:** `lib/db.js` (full file, 25 lines)

Copy the "server-only singleton, fail fast if env var missing" shape verbatim:

```javascript
// lib/db.js — pattern to mirror
import { sql } from '@vercel/postgres'

if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Provision Vercel Postgres and run `vercel env pull .env.local`, then retry.',
  )
}

export { sql }
```

Apply the same shape to Stripe:
```javascript
// lib/stripe.js (new)
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set. ...')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
```
Keep the doc-comment convention: a `/** ... SERVER-ONLY — must never be imported from src/ ... */` header block, matching `lib/db.js` lines 1-16 and `lib/session.js` lines 1-15 verbatim in tone/wording.

---

### `lib/products.js` (server-side allowlist)

**Analog:** `lib/session.js` (module style: small exported pure helpers, JSDoc per function, no DB/network access)

No direct precedent for a static lookup table in this codebase, but follow `lib/session.js`'s JSDoc-per-export convention and its "server-only" doc-comment header (lines 1-15). This is the RESEARCH.md Pattern 1 shape (`PRODUCTS` map keyed by internal product slug → `{ productId, priceId }`), unresolved pending D-02 price verification.

---

### `api/billing/checkout.js` (GET, server-initiated redirect)

**Analog:** `api/auth/google.js` (full file, 42 lines) + the D-04 re-check idea from `api/auth/google/callback.js`'s upsert style

**Imports pattern** (mirror `api/auth/google.js` lines 12-13):
```javascript
import { cookieOptions, isSafeReturnTo, serializeCookie } from '../../lib/session.js'
```
For checkout.js, the equivalent imports are `sql` from `lib/db.js`, `parseCookies`/`hashToken` from `lib/session.js`, `stripe` from `lib/stripe.js`, `PRODUCTS` from `lib/products.js` — same relative-import, explicit-`.js`-extension convention used throughout `api/auth/*`.

**Web Handler signature** (copy exactly, lines 15-16, 41-42):
```javascript
export default {
  async fetch(request) {
    // ...
  },
}
```

**Auth/session-lookup pattern** — reuse the cookie-then-hash-then-DB-lookup idiom from `api/auth/session.js` lines 22-34 (parseCookies → hashToken → `sql` join on `sessions`/`users`), not `google.js`'s state-cookie approach (that's OAuth-specific). Fail closed: no session → redirect to `/api/auth/google?return_to=/subscribe` (302), matching the existing sign-in entry point rather than inventing a new one.

**Redirect pattern** (copy exactly from `api/auth/google.js` lines 30-40 — `Headers()`, `Set-Cookie` via `headers.append`, `Location` via `headers.set`, `return new Response(null, { status: 302, headers })`):
```javascript
const headers = new Headers()
headers.set('Location', authUrl.toString())
return new Response(null, { status: 302, headers })
```
For Checkout this becomes `headers.set('Location', session.url)`.

**Open-redirect discipline:** `api/auth/google/callback.js` lines 150-152 shows the "never trust a raw string directly in a Location header — reconstruct via `new URL(...)`" belt-and-suspenders pattern (CR-01 finding from Phase 2 review). Apply the same discipline to `success_url`/`cancel_url` construction (built from `new URL(request.url).origin`, never from unvalidated input).

---

### `api/billing/webhook.js` (POST, signature-verified, idempotent)

**Analog:** `api/auth/google/callback.js` (fail-closed multi-step handler shape) + `api/auth/logout.js` (DB mutation + explicit error-vs-success status code split)

**Fail-closed try/catch-per-step pattern** (mirror `api/auth/google/callback.js` lines 80-99, 101-112, 116-140 — each risky step wrapped in its own try/catch, each failure short-circuiting to the same safe fallback rather than letting one giant try/catch obscure which step failed):
```javascript
// callback.js pattern: token exchange, JWT verify, and DB upsert are each
// their own try/catch, each redirecting to the same redirectWithError()
// on failure — apply the same "one try/catch per risky step" discipline
// to webhook.js's constructEvent() call vs. its DB writes.
```

**DB mutation + explicit status-code contract** (mirror `api/auth/logout.js` lines 32-44 — comment explaining *why* a particular status code is chosen, not just what):
```javascript
// logout.js: dbError tracked explicitly, 500 vs 204 chosen deliberately
// with a comment justifying it. webhook.js should apply the same
// "comment justifies the status code choice" discipline for its
// "swallow business-logic errors as 200 to avoid Stripe retry storms"
// decision (see RESEARCH.md Code Examples).
```

**Web Handler + rawBody + status codes:** use `await request.text()` (never `request.json()` before signature verification — RESEARCH.md Pitfall 1), `request.headers.get('stripe-signature')`, and `new Response(...)` return shape consistent with every other route in `api/auth/*` (no Express-style `(req, res)`).

**DB idempotency pattern** — no existing direct analog for `INSERT ... ON CONFLICT DO NOTHING` + row-count check in this codebase, but the upsert idiom (`ON CONFLICT (...) DO UPDATE SET ...`) is already established in `api/auth/google/callback.js` lines 118-127 (`INSERT INTO users ... ON CONFLICT (google_sub) DO UPDATE SET ...`) — same tagged-template `sql` usage, same `RETURNING`/result-shape checking style. Use this as the closest in-repo SQL-idiom precedent for both the `webhook_events` dedupe insert and the `subscriptions` upsert.

---

### `api/billing/status.js` (GET, authenticated read for polling)

**Analog:** `api/auth/session.js` (full file, 50 lines) — near-exact match, this is explicitly named as the pattern to reuse in RESEARCH.md.

**Imports pattern** (copy lines 18-19):
```javascript
import { sql } from '../../lib/db.js'
import { hashToken, parseCookies } from '../../lib/session.js'
```

**Fail-closed, cookie→hash→DB-lookup, empty-input-returns-null-not-throw pattern** (copy the full shape, lines 21-49):
```javascript
export default {
  async fetch(request) {
    const cookies = parseCookies(request.headers.get('cookie'))
    const raw = cookies.session
    if (!raw) return Response.json({ user: null }) // status.js: return { subscriptions: {} } or 401 instead

    const hash = hashToken(raw)
    try {
      const { rows } = await sql`...`
      // ...
    } catch {
      // Fail closed on DB error (WR-02 precedent) — never let the
      // exception escape unhandled.
      return Response.json({ /* safe empty shape */ })
    }
  },
}
```
Reuse this exact fail-closed try/catch shape for `status.js`'s per-product entitlement read; the response shape should be a map of product key → status (or null), never leaking Stripe IDs/tokens, matching `session.js`'s discipline of returning only `{ name, email, picture }` and never raw session identifiers (line 47-48 comment: "Never includes a subscription/entitlement field..." — status.js is precisely the endpoint that inverts this rule intentionally, so its own doc-comment should explain why it's allowed to expose entitlement where `session.js` explicitly does not).

---

### `migrations/000N_billing.sql` (if D-02 research reveals multiple prices per product)

**Analog:** `migrations/0001_init.sql` (schema definitions read this session: `subscriptions` table lines ~66-79, `webhook_events` lines ~84-87)

Follow the exact same idempotent-migration convention already established: `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, numbered filename (`0002_...sql`), no destructive statements. `subscriptions` schema to extend (verbatim column list): `id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, stripe_subscription_id TEXT NOT NULL, stripe_customer_id TEXT, stripe_product_id TEXT NOT NULL, status TEXT NOT NULL, current_period_end TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.

---

### `src/routes/Subscribe.jsx` (reworked — single 4-tile picker, no wizard)

**Analog:** itself (existing file, being rewritten) for markup/class reuse; `src/routes/Account.jsx` for the session/loading-gate pattern.

**Imports pattern to drop:** `useState` step machine, `SITE.price`, `useApp`'s `plan`/`setPlan`/`subscribed`/`setSubscribed` — all removed per D-01/D-03 (no more local wizard state).

**Imports pattern to adopt** (mirror `src/routes/Account.jsx` lines 1-7):
```javascript
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { staticSeo } from '../data/seo.js'
import { useSeo } from '../lib/useSeo.js'
import { useSession } from '../lib/useSession.js'
```
Plus a new `fetch('/api/billing/status')` call (own `useState`/`useEffect`, following `src/lib/useSession.js`'s exact `fetchSession` shape — cancel flag, `.then`/`.catch`, explicit `loading` boolean) — either extend `useSession.js` or add a sibling hook `useEntitlements.js` with the identical structure (see `src/lib/useSession.js` lines 13-40 as the literal template to copy).

**Markup to reuse verbatim:** `.plans` grid + `.plan`/`.plan__row`/`.plan__name`/`.plan__price`/`.plan__note` classes (Subscribe.jsx current lines 47-73); `.demo-notice`-shaped error banner structure (current lines 98-105, swap `--accent` for the new `--bad` token per UI-SPEC); `.eyebrow`/`.display`/`.lede` heading block (current lines 33-45), unchanged in structure, only copy changes ("Subscribe to Éclat" heading stays).

**Button-as-navigation pattern (new):** the "Subscribe" action becomes a plain `<a href="/api/billing/checkout?product=...">` full-page navigation styled with the existing `.btn` class — not a React Router `<Link>` and not a `fetch` call (per UI-SPEC §1 "no JS interception" principle, matching Phase 2's own sign-in link precedent in `Header.jsx`/`Account.jsx`'s `window.location.assign('/api/auth/google?return_to=...')` at Account.jsx line 26 — same "real browser navigation to a server route" idiom).

---

### `src/routes/SubscribeSuccess.jsx` (new route — confirming/success/timeout)

**Analog:** `src/routes/Account.jsx` (loading-gate + `useSession` composition pattern, lines 11-49) + `src/routes/Subscribe.jsx`'s existing `.done` block (current lines 146-189, reused verbatim for the success state's layout/checkmark SVG).

**Loading/polling-gate pattern** (mirror Account.jsx's `if (loading) return (...)` / `if (!user) return null` early-return style, lines 30-49):
```javascript
if (confirming) {
  return (
    <main className="page--narrow" id="main">
      <div className="done fade-up">
        {/* pulsing .dot instead of checkmark SVG, per UI-SPEC */}
      </div>
    </main>
  )
}
```

**Checkmark SVG to reuse verbatim** (Subscribe.jsx current lines 148-165):
```jsx
<svg viewBox="0 0 60 60" width="72" height="72" style={{ margin: '0 auto 30px' }} aria-hidden="true">
  <circle cx="30" cy="30" r="28" fill="none" stroke="rgba(22,19,15,0.16)" strokeWidth="1" />
  <path className="tick-path" d="M18 31 L27 39 L43 22" fill="none" stroke="oklch(0.56 0.14 38)" strokeWidth="2" strokeLinecap="round" strokeDasharray="60" />
</svg>
```

**Polling pattern (new, no direct in-repo analog):** build on `src/lib/useSession.js`'s `fetchSession` shape (cancel-flag + `.then`/`.catch`) but wrapped in a `setInterval`/timeout — this is the one genuinely new hook pattern this phase introduces; base its cancellation-safety idiom on `useSession.js` lines 17-35 exactly (same `let cancelled = false` guard inside the effect closure).

---

### Route/SEO registration (`src/App.jsx`, `src/data/seo.js`)

**Analog:** itself — the "three places in sync" convention documented in CLAUDE.md architecture notes.

Add `/subscribe/success` to:
1. `src/App.jsx` `<Routes>` (new `<Route path="/subscribe/success" element={<SubscribeSuccess />} />`)
2. `src/data/seo.js` `staticSeo` object — copy the `/subscribe` entry's shape (lines 30-36) including `robots: 'noindex,follow'` (this is a post-checkout confirmation page, same non-indexable treatment as `/subscribe` and `/account`).

`allRoutes()` (seo.js lines 63-72) picks up the new `staticSeo` key automatically — no separate change needed there, matching how every other static route is wired.

---

### CSS additions (`src/styles/eclat.css`)

**Analog:** existing `:root` token block (lines ~20-22 for `--accent`/`--accent-lit`/`--ok`), `.plan`/`.plan[aria-pressed='true']` (lines 1341-1352+), `.demo-notice`/`.demo-notice__tag`/`.demo-notice__text` (lines 1397-1420+), `.pill` (line 1110+), `.chip`/`.chip[aria-pressed='true']` (lines 961-985), `.dot`/`.dot::after`/`@keyframes pulseDot` (lines 628-644, 1729).

**New `--bad` token** — one-line addition beside `--accent`/`--ok`, same oklch declaration convention:
```css
--bad: oklch(0.55 0.16 25);
```

**New `.plan__badge`** — derive from `.pill` (line 1110-1116, outlined treatment) but filled per UI-SPEC (`background: var(--accent); color: #fff;`), positioned via the same absolute-corner idiom already used by `.cover__badge` (search that class for the exact positioning values to copy).

**New `.plan__interval`** — new small sub-line class, sibling to `.plan__note`, 13px/`var(--muted)`, `sm` (8px) gap above per UI-SPEC spacing table.

**Chip-toggle fallback** — if D-02 reveals multiple prices/intervals, reuse `.chip`/`.chip[aria-pressed='true']` verbatim (already used in `Archive.jsx` for filter pills) rather than inventing a new toggle control.

## Shared Patterns

### Server-only module + fail-fast env var check
**Source:** `lib/db.js` (full file) — the canonical shape for any new server-only singleton (`lib/stripe.js`).
```javascript
if (!process.env.SOME_KEY) {
  throw new Error('SOME_KEY is not set. ...')
}
```
**Apply to:** `lib/stripe.js`.

### Web Handler signature (`export default { async fetch(request) {...} }`)
**Source:** every file in `api/auth/*` — universal convention, no Express-style `(req, res)` anywhere in the codebase.
**Apply to:** `api/billing/checkout.js`, `api/billing/webhook.js`, `api/billing/status.js`.

### Cookie → hash → DB session lookup
**Source:** `api/auth/session.js` lines 22-34 (and duplicated with minor variation in `api/auth/logout.js` lines 21-40).
```javascript
const cookies = parseCookies(request.headers.get('cookie'))
const raw = cookies.session
if (!raw) return Response.json({ user: null })
const hash = hashToken(raw)
const { rows } = await sql`SELECT ... FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ${hash} AND s.expires_at > now()`
```
**Apply to:** `api/billing/checkout.js`, `api/billing/status.js` — every authenticated billing route.

### Fail-closed try/catch around DB/network calls, never let exceptions escape
**Source:** `api/auth/session.js` lines 40-45 (comment explicitly ties the catch block back to the endpoint's documented contract); `api/auth/google/callback.js`'s per-step try/catch (lines 80-99, 101-112, 116-140).
**Apply to:** all three new `api/billing/*` routes, especially `webhook.js` where a business-logic exception after `webhook_events` insert must return 200 (not 5xx) to avoid a Stripe retry storm re-hitting the now-permanent no-op (see RESEARCH.md Code Examples).

### Open-redirect / Location-header discipline
**Source:** `api/auth/google/callback.js` lines 52-58 (`redirectWithError`) and 150-152 (reconstruct via `new URL(...)` before setting `Location`, never trust a raw string).
**Apply to:** `api/billing/checkout.js`'s `success_url`/`cancel_url` construction and its redirect-on-no-session/redirect-on-already-subscribed paths.

### `.done` centered confirmation layout + checkmark SVG
**Source:** `src/routes/Subscribe.jsx` current lines 146-189 (the "done" step).
**Apply to:** new `src/routes/SubscribeSuccess.jsx` success state — reuse verbatim, do not redesign (per UI-SPEC explicit instruction).

### Client polling hook shape (cancel-flag + `.then`/`.catch`, explicit loading boolean)
**Source:** `src/lib/useSession.js` full file (40 lines).
**Apply to:** new entitlement-fetch hook for `Subscribe.jsx`'s picker and the interval-based poll in `SubscribeSuccess.jsx`.

### Three-places-in-sync route registration
**Source:** documented in CLAUDE.md architecture notes; concretely `src/App.jsx` + `src/data/seo.js` `staticSeo`/`allRoutes()`.
**Apply to:** registering `/subscribe/success` as a new route.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `api/billing/webhook.js`'s idempotency insert (`INSERT ... ON CONFLICT DO NOTHING` + rowCount check) | service logic | event-driven | No prior webhook/dedupe code exists in this codebase; closest precedent is the `ON CONFLICT DO UPDATE` upsert in `api/auth/google/callback.js`, which is a different conflict-resolution strategy (update, not no-op) — use RESEARCH.md's Pattern 4 code example directly |
| Polling `useEffect` with `setInterval`/timeout + backoff (`SubscribeSuccess.jsx`) | hook | polling | No existing polling pattern in this codebase (only one-shot fetches); base structure on `useSession.js`'s cancel-flag idiom but the interval/timeout logic itself is new — use RESEARCH.md's D-06 description and UI-SPEC Component Notes §2 as the spec |
| `lib/products.js` allowlist map | config | lookup | No prior static-config-module precedent in `lib/` (both existing `lib/` files are behavior modules, not data maps) — closest structural precedent is `src/data/content.js`'s plain-object-export style (e.g. `SITE`), even though that lives in `src/data/` not `lib/` |

## Metadata

**Analog search scope:** `api/auth/**`, `lib/**`, `src/routes/**`, `src/data/seo.js`, `src/styles/eclat.css`, `migrations/0001_init.sql`
**Files scanned:** `lib/db.js`, `lib/session.js`, `api/auth/google.js`, `api/auth/google/callback.js`, `api/auth/session.js`, `api/auth/logout.js`, `src/routes/Subscribe.jsx`, `src/routes/Account.jsx`, `src/lib/useSession.js`, `src/data/seo.js`, `src/styles/eclat.css` (targeted grep + line refs)
**Pattern extraction date:** 2026-09-09
