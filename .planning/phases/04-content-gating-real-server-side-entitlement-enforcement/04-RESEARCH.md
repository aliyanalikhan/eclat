# Phase 4: Content Gating — Real Server-Side Entitlement Enforcement - Research

**Researched:** 2026-09-09
**Domain:** Server-side content authorization on a prerendered Vite/React SPA + Vercel serverless functions + Postgres, replacing a client-trusted localStorage flag
**Confidence:** HIGH (architecture/schema — all read directly from this repo's own source this session) / MEDIUM (external best-practice citations) / LOW (see Assumptions Log — scope of "book full spreads"/"paywalled writings" content)

## Summary

This phase has one real architectural bug to fix and one scope gap to surface before planning.

**The bug:** `src/data/content.js` is a single ES module imported directly by `Edition.jsx`, `Archive.jsx`, `Home.jsx`, and `src/data/seo.js`. Because it is one module with many live import sites, Vite/Rollup can never tree-shake any of its exports out of the client bundle — which means `editions[].excerpt` (the actual full-issue text that `Edition.jsx` conditionally renders behind `subscribed`) ships to **every** visitor's browser today, in plain text, inside the JS bundle, regardless of what the `subscribed` boolean is set to. Flipping the conditional server-side without also moving the underlying text out of the client-shipped module fixes nothing — the leak is in what gets bundled, not (only) in what gets rendered. This is the concrete mechanism behind GATE-01/GATE-02's "no client-shipped code leaks paid content" mandate, and it must be understood before any task list is written.

**The scope gap:** GATE-01's success criteria names "book full spreads" and "paywalled writings" as gated content types, but `src/data/content.js`'s `books` and `writings` arrays contain **only** cover art + short marketing metadata (title, meta, dek) — there is no full-spread image data or full essay-text field anywhere in the codebase today. Only `editions[].excerpt` is real gated content. This must be surfaced to the user (via `/gsd-discuss-phase` or an explicit planning decision) before Phase 4 is planned: either (a) scope real server-enforcement to editions only, since books/writings currently have nothing sensitive to leak beyond a "Subscribers"/"First spread free" label, or (b) the user supplies real placeholder full-content data for books/writings so there is something to gate. Recommendation: (a), with the `gate()` *label* on Books/Writings switched to reflect real per-product entitlement (so it stops lying visually) while flagging GATE-06 (v2, deferred) as the natural home for real book/writing full-content delivery.

Phase 1–3 already built everything Phase 4 needs to reuse: the `subscriptions` table (one row per Stripe subscription, `status` mirrors Stripe verbatim, `stripe_product_id` distinguishes all 4 products independently — GATE-03 is already satisfied by this schema shape, not something Phase 4 needs to invent), a working cookie→hash→DB session-lookup pattern duplicated verbatim across three existing files, and a server-only-module convention (`lib/*.js`, never imported from `src/`) that any new gated-content module must follow.

**Primary recommendation:** Split `src/data/content.js` into a public, client-safe metadata module (unchanged import sites, minus the gated fields) and a new server-only module holding the actual gated text, exposed only through a new authenticated `/api/content/*` endpoint that re-derives entitlement from the `subscriptions` table on every request — never from a client-supplied flag, never cached by the CDN.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Public preview metadata (cover art, blurb, dates, sample-strip images) | Browser/Client | Frontend Server (SSR/prerender) | Already public today; stays in `src/data/content.js`, stays statically prerendered — GATE-05 requires zero change here |
| Full gated content (edition `excerpt`, and any future book-spread/full-writing text) | API/Backend | Database | Must move out of the client bundle entirely; served only via a per-request, entitlement-checked API response (this is the fix for the bundling leak) |
| Entitlement determination (does user X currently own product Y) | API/Backend | Database | Always a live `subscriptions` row read per request — never baked into the session cookie/JWT (Phase 2/3 precedent, `02-CONTEXT.md`/STATE.md decision) |
| Session identity (who is the caller) | API/Backend | — | Already built (Phase 2): cookie → SHA-256 hash → `sessions` JOIN `users` lookup |
| Route-level page shell (is `/editions/2` reachable at all) | Browser/Client | Frontend Server (SSR/prerender) | Stays public/unauthenticated — only the *full-content payload inside the page* is gated, not the page itself (GATE-05) |
| Cache/CDN behavior for gated API responses | CDN/Static | API/Backend | Must be excluded from caching (`Cache-Control: private, no-store`) so a canceled user's browser or a shared edge cache never serves stale gated content (GATE-04) |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GATE-01 | Every gated route checks real DB entitlement on each request; no leak via page/download/API | `subscriptions` schema + entitlement query pattern below; the content.js bundling-leak finding (Summary) is the actual mechanism this requirement targets |
| GATE-02 | `subscribed` localStorage flag and all 4 read sites removed | Exact file/line inventory below (Runtime State Inventory + Don't Hand-Roll) |
| GATE-03 | Hard Copy does not grant Online access, and vice versa | Already satisfied structurally: `lib/products.js`'s 4 distinct `productId`s + `subscriptions.stripe_product_id` — entitlement query must key on the specific product slug for the content type, not "any active subscription" |
| GATE-04 | Cancel/lapse revokes access on next request, no stale cache | Live DB read per request (no session/JWT caching of entitlement) + explicit no-store Cache-Control on gated API responses |
| GATE-05 | Public content (covers, previews, marketing) unaffected | Public metadata stays in `content.js`/prerendered exactly as today; only the gated payload moves to a runtime fetch |

## Standard Stack

### Core

No new runtime dependencies are required for this phase. Everything needed already exists in `package.json` and was installed/verified in Phases 1–3:

| Library | Version | Purpose | Why Standard (already in this repo) |
|---------|---------|---------|--------------------------------------|
| `@vercel/postgres` | 0.10.0 (pinned) | `sql` tagged-template queries against `subscriptions`/`sessions`/`users` | Already the project's only DB client (`lib/db.js`), Phase 1 |
| `cookie` | ^2.0.1 | Parsing the `session` cookie in new API routes | Already wrapped by `lib/session.js`'s `parseCookies`/`hashToken` |
| (none) | — | Entitlement logic itself | A single indexed `WHERE user_id = $1 AND stripe_product_id = $2 AND status IN (...)` query — no authorization library is justified at this catalog size (4 products, ~6 gated routes) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| — | — | — | No supporting libraries identified as needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written `WHERE ... IN ('active','trialing')` entitlement query | A general-purpose authorization library (CASL, Casbin) | Massive overkill for a fixed 4-product catalog with one relationship (user owns product); adds a dependency and a rules DSL to review for a check that is one SQL predicate. Rejected. |
| Per-route duplicated cookie→hash→DB lookup (current pattern) | A shared `lib/auth.js` `getSessionUser(request)` helper | Recommended refactor (see Don't Hand-Roll) — not a new library, just deduplication of existing logic across `api/auth/session.js`, `api/billing/status.js`, `api/billing/checkout.js` |

**Installation:** None — no `npm install` needed for this phase.

**Version verification:** N/A — no new packages.

## Package Legitimacy Audit

No external packages are introduced by this phase. All server-side logic reuses `@vercel/postgres@0.10.0` and `cookie@2.0.1`, both already vetted and installed in Phases 1–2 (see `01-01-SUMMARY.md`, `02-01-SUMMARY.md`). The Package Legitimacy Gate does not apply.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```text
Browser (signed-in subscriber)
   │
   │ 1. GET /editions/2  (public page shell, unauthenticated)
   ▼
Prerendered static HTML (dist/editions/2/index.html)
   — public metadata only: title, blurb, cover img, dates, sample-strip
   — NO ed.excerpt text present (fixed in this phase; today it's absent from
     the *rendered HTML* only, not from the JS bundle — see Pitfall 1)
   │
   │ 2. React hydrates, useEffect fires
   ▼
useGatedContent('edition', 2)  ─────►  GET /api/content/edition?no=2
                                            │
                                            │ 3. cookie → hash → sessions JOIN users
                                            │    (fail closed: no cookie/expired → 401)
                                            ▼
                                       subscriptions table
                                       WHERE user_id = $1
                                         AND stripe_product_id = $2  (eclat-online only)
                                         AND status IN ('active','trialing')
                                            │
                                  ┌─────────┴─────────┐
                              entitled                not entitled
                                  │                         │
                                  ▼                         ▼
                     200 + { excerpt: [...] }      401/403 + {}  (no partial leak)
                     Cache-Control: private,        Cache-Control: private, no-store
                     no-store
                                  │                         │
                                  ▼                         ▼
                        Full issue renders           Existing paywall__clip
                        client-side                  teaser stays as-is
```

### Recommended Project Structure

```
lib/
├── db.js                    # existing — sql/db exports
├── session.js                # existing — cookie/hash helpers
├── products.js                # existing — 4-slug allowlist
├── auth.js                    # NEW (recommended) — shared getSessionUser(request) helper,
│                               #   deduplicates the 3x-copied cookie→hash→DB lookup
└── gated-content.js            # NEW — SERVER-ONLY full-text content (ed.excerpt today);
                                #   never imported from src/, mirrors lib/products.js's
                                #   "SERVER-ONLY" header-comment convention
api/
└── content/
    └── edition.js              # NEW — GET ?no=2, entitlement-checked, no-store
src/
├── data/
│   └── content.js               # MODIFIED — excerpt/excerptBy fields removed from the
                                  #   editions array (public fields only remain)
├── lib/
│   └── useGatedContent.js       # NEW — useEntitlements.js-shaped hook (cancel-flag,
                                  #   loading/error states)
├── routes/
│   ├── Edition.jsx               # MODIFIED — subscribed → real per-product entitlement
│   │                              #   via useGatedContent + useEntitlements, excerpt come
│   │                              #   from the API response, not content.js
│   ├── Archive.jsx                # MODIFIED — gate() label → real entitlement
│   ├── Books.jsx                  # MODIFIED — gate() label → real entitlement
│   └── Account.jsx                # MODIFIED (Phase 5 owns full rework; this phase only
                                    #   removes the subscribed/setSubscribed reset-demo bits)
└── store.jsx                      # MODIFIED — subscribed/setSubscribed/gate/plan removed
                                    #   entirely (lightbox/flipFrom state stays)
```

### Pattern 1: Server-only gated-content module (extends the existing `lib/*.js` convention)

**What:** A module exactly like `lib/products.js` — a `SERVER-ONLY` header comment, never imported from `src/`, holding the actual full-issue text keyed by edition number.
**When to use:** Any content field that must never appear in the client bundle.
**Example:**
```javascript
// lib/gated-content.js — SERVER-ONLY. Never import from src/.
// [VERIFIED: lib/products.js:1-16 — same header-comment convention already
// established for this exact "never ship to client" guarantee]
export const EDITION_CONTENT = Object.freeze({
  2: { excerpt: [ /* full text, moved out of src/data/content.js */ ] },
  1: { excerpt: [ /* ... */ ], excerptBy: 'Ebuka Osuorah, Founder' },
})

export function getEditionContent(no) {
  return EDITION_CONTENT[Number(no)]
}
```

### Pattern 2: Entitlement-checked API route (extends `api/billing/status.js`'s exact shape)

**What:** Reuse the cookie→hash→DB pattern verbatim, then add a product-specific `stripe_product_id` predicate.
**When to use:** Every new `/api/content/*` route.
**Example:**
```javascript
// api/content/edition.js
// [VERIFIED: api/billing/status.js:24-60 — this is the same fail-closed
// cookie/hash/DB shape, quoted verbatim below from the real file]
import { sql } from '../../lib/db.js'
import { hashToken, parseCookies } from '../../lib/session.js'
import { getEditionContent } from '../../lib/gated-content.js'
import { PRODUCTS } from '../../lib/products.js'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const no = url.searchParams.get('no')
    const cookies = parseCookies(request.headers.get('cookie'))
    const raw = cookies.session
    const noStore = { 'Cache-Control': 'private, no-store' }
    if (!raw) return Response.json({}, { status: 401, headers: noStore })

    const hash = hashToken(raw)
    try {
      const { rows } = await sql`
        SELECT u.id FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ${hash} AND s.expires_at > now()
      `
      if (!rows.length) return Response.json({}, { status: 401, headers: noStore })

      const { rows: sub } = await sql`
        SELECT 1 FROM subscriptions
        WHERE user_id = ${rows[0].id}
          AND stripe_product_id = ${PRODUCTS['eclat-online'].productId}
          AND status IN ('active', 'trialing')
      `
      if (!sub.length) return Response.json({}, { status: 403, headers: noStore })

      const content = getEditionContent(no)
      if (!content) return Response.json({}, { status: 404, headers: noStore })
      return Response.json(content, { headers: noStore })
    } catch {
      return Response.json({}, { status: 401, headers: noStore })
    }
  },
}
```

### Anti-Patterns to Avoid

- **Fixing only the render conditional, not the bundle:** Swapping `subscribed` (localStorage) for `entitled` (a client-side hook) while leaving `ed.excerpt` inside `src/data/content.js` does NOT fix GATE-01/GATE-02 — the text is still present in the shipped JS bundle for every visitor, discoverable via view-source/devtools regardless of what gate the render logic applies. The data must physically move server-side.
- **Checking "any active subscription" instead of the specific product:** GATE-03 requires the entitlement query to filter on the exact `stripe_product_id` for the content's type (e.g., `eclat-online`, not `eclat-hardcopy`). A query that only checks `status = 'active'` across all of a user's subscriptions would incorrectly grant Hard-Copy-only subscribers digital access.
- **Gating the route/page instead of the payload:** Do not redirect signed-out/non-subscriber visitors away from `/editions/2` (unlike `/account`, which Phase 2's `middleware.js` does gate at the route level). GATE-05 requires the public preview to render exactly as today — only the full-content payload inside the page is gated.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie→hash→DB session lookup for a new gated-content route | A 4th copy-paste of the same ~10-line block already duplicated in `api/auth/session.js`, `api/billing/status.js`, `api/billing/checkout.js` | Extract a shared `lib/auth.js` `getSessionUser(request)` helper once, in this phase, before adding a 4th copy | Each existing copy is already an independent maintenance point (a future session-scheme change means editing 3 files); adding a 4th without consolidating compounds this. Not a new library — pure internal dedup, low risk, high payoff given this phase is exactly "add more of these" |
| Authorization rules engine for 4 fixed products | CASL, Casbin, custom RBAC/ABAC layer | One indexed SQL predicate (`user_id`, `stripe_product_id`, `status IN (...)`) | The entitlement model is fixed and tiny (4 products, boolean owns-or-not per product); a rules engine adds a dependency and abstraction with no matching complexity to justify it |

**Key insight:** This phase's entire "hard part" is not writing new authorization logic — it's relocating existing plaintext content out of a client-bundled module and reusing the session/product primitives Phases 1–3 already built correctly.

## Runtime State Inventory

This phase removes a client-side demo flag and restructures a content module — it qualifies as a refactor phase for this inventory.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `localStorage` key `eclat:demo-state` holds `{ subscribed, plan }` per browser [VERIFIED: src/store.jsx:5,20-21,34 — `const STORAGE_KEY = 'eclat:demo-state'`; `const [subscribed, setSubscribed] = useState(false)`; `const [plan, setPlan] = useState('annual')`; `window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ subscribed, plan }))`]. This is client-only, ephemeral, per-browser — no server datastore holds it. | Code edit only: stop writing to it (remove the `useEffect`s and state in `store.jsx`). No data migration — existing users' stale localStorage values become inert once nothing reads them; nothing needs to be actively cleared. |
| Live service config | None — the `subscribed` flag has no corresponding external service configuration. | None. |
| OS-registered state | None — this is a browser-only SPA flag, no OS-level registration exists. | None. |
| Secrets/env vars | None — no secret or env var references `subscribed`/`plan`. | None. |
| Build artifacts | Prerendered `dist/editions/*/index.html` currently already renders the paywall-clipped view during SSR (since `useState(false)` is the SSR-time value of `subscribed` — confirmed by reading `src/store.jsx:20` and `src/entry-server.jsx`'s lack of any localStorage/session read at render time), so the *rendered HTML* does not currently leak `ed.excerpt`. The client JS bundle does, per the Summary's bundling-leak finding — `content.js`'s `excerpt` fields must be removed from the module that `Edition.jsx`/`prerender.js`'s SSR path imports. | Code edit: move `excerpt`/`excerptBy` out of `src/data/content.js` into the new server-only `lib/gated-content.js`. No separate reinstall/artifact-regeneration step beyond the next `npm run build`. |

**Nothing found in category:** Live service config, OS-registered state, and secrets/env vars — verified explicitly above, not merely assumed absent.

## Common Pitfalls

### Pitfall 1: Fixing the conditional but not the bundle (the actual bug motivating this phase)
**What goes wrong:** A plan that only changes `subscribed ? full : paywall` to `entitled ? full : paywall` in `Edition.jsx`, without also removing `ed.excerpt` from `src/data/content.js`, ships zero real security improvement — the full text is still present in the client JS bundle for every visitor.
**Why it happens:** Vite/Rollup tree-shakes unused *exports*, not unused *branches of a rendered conditional* — and `editions` (the whole array, `excerpt` included) has multiple live import sites (`Home.jsx`, `Archive.jsx`, `Edition.jsx`, `seo.js`), so the whole object literal, including `excerpt`, is retained in the bundle regardless of any render-time branching.
**How to avoid:** Physically relocate the gated text fields to a server-only module (`lib/gated-content.js`) that is never imported by anything under `src/`, and fetch them via an authenticated API call instead.
**Warning signs:** `grep -r "excerpt" dist/assets/*.js` (post-build) finding the actual paragraph text in the built client bundle is the concrete, checkable signal this bug is still present.

### Pitfall 2: Treating any active subscription as sufficient (breaks GATE-03)
**What goes wrong:** An entitlement check that only tests `status IN ('active','trialing')` without also filtering `stripe_product_id` would let an Éclat-Hard-Copy-only subscriber read the digital edition content.
**Why it happens:** It's tempting to write "is this user subscribed at all" as the check, since that's how the old `subscribed` boolean worked (single flag, no product distinction).
**How to avoid:** Every entitlement query must include `AND stripe_product_id = <the specific product's real ID from lib/products.js>` for the content type being gated (`eclat-online` for edition full-content; `book-online` for future book-spread content).
**Warning signs:** A Hard-Copy-only test subscriber (no Online product) successfully sees full edition content.

### Pitfall 3: CDN/browser caching a gated response (breaks GATE-04)
**What goes wrong:** Vercel's Edge Network or an intermediate cache stores a `200` gated-content response and serves it to a later visitor (including the same user after cancellation) without re-checking entitlement.
**Why it happens:** Vercel serverless function responses are cacheable by default unless the response explicitly opts out — omitting `Cache-Control` on a per-user JSON response is a silent, easy mistake.
**How to avoid:** Every gated `/api/content/*` (and `/api/billing/*`) response must set `Cache-Control: private, no-store` [CITED: vercel.com/docs/caching/cache-control-headers — "Responses must not contain the private, no-cache or no-store directives... to be cached by Vercel's Edge Network"]. `private` alone still permits browser-level caching; `no-store` is required for the "no stale cached access" guarantee GATE-04 demands.
**Warning signs:** Re-requesting the same gated endpoint after a subscription cancellation (simulated via a direct DB status update) still returns `200` with content, or a `curl -I` on the endpoint shows an `Age`/`x-vercel-cache: HIT` header.

### Pitfall 4: Reintroducing the SSR `window is not defined` crash
**What goes wrong:** A new gated-content fetch hook that reads `window`/query params/`document` in the render body (not inside `useEffect`) crashes `prerender.js`'s SSR pass — this exact bug already occurred once in Phase 3 (`SubscribeSuccess.jsx`, see `03-02-SUMMARY.md` Deviation 1).
**Why it happens:** `src/entry-server.jsx` runs in a pure Node context with no `window`/`document` global; only render-body code is exercised at build time, `useEffect` bodies are not.
**How to avoid:** Follow the exact pattern already established in `useSession.js`/`useEntitlements.js` — all `fetch()` calls happen inside a `useEffect`, with a lazy `useState` initializer guarded by `typeof window === 'undefined'` if any browser API is needed before the effect runs.
**Warning signs:** `npm run build`'s prerender step throwing `ReferenceError: window is not defined`.

### Pitfall 5: `past_due` entitlement ambiguity left undecided
**What goes wrong:** Without an explicit decision, different endpoints may treat `past_due` inconsistently — `api/billing/checkout.js`'s existing re-check treats `past_due` as "already subscribed" (blocks a duplicate Checkout), but that is a different question from "should past_due content-gating still show full content."
**Why it happens:** Stripe's `past_due` status means a renewal payment failed but the subscription hasn't been canceled yet — reasonable products differ on whether this is a grace period or an immediate lockout, and this project's core value statement ("hasn't actually paid for it") argues for the stricter reading, but no explicit decision has been made yet for content gating specifically.
**How to avoid:** Surface this as an explicit decision point before/during planning (see Open Questions) rather than letting each new endpoint pick a default independently.
**Warning signs:** `api/content/*` and `api/billing/status.js` disagreeing on whether a `past_due` user is "entitled."

## Code Examples

### Reused pattern: fail-closed cookie→hash→DB session lookup
```javascript
// Source: api/billing/status.js:24-37 (existing file, read this session)
// [VERIFIED: api/billing/status.js:24-37]
const cookies = parseCookies(request.headers.get('cookie'))
const raw = cookies.session
if (!raw) return Response.json({ subscriptions: {} }, { status: 401 })

const hash = hashToken(raw)
try {
  const { rows: userRows } = await sql`
    SELECT u.id FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${hash} AND s.expires_at > now()
  `
  if (!userRows.length) return Response.json({ subscriptions: {} }, { status: 401 })
  // ...
} catch {
  return Response.json({ subscriptions: {} }, { status: 401 })
}
```

### Reused pattern: client hook shape for a new gated-content fetch
```javascript
// Source: src/lib/useEntitlements.js (existing file, read this session) —
// [VERIFIED: src/lib/useEntitlements.js:16-46, full file quoted in the file
// itself; same cancel-flag/.then/.catch shape should be copied for
// useGatedContent(type, id)]
export function useEntitlements() {
  const [subs, setSubs] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const refetch = useCallback(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/billing/status')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return
        setSubs(body.subscriptions || {})
        setError(false)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setSubs({})
        setError(true)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])
  useEffect(() => refetch(), [refetch])
  return { subs, loading, error, refetch }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `subscribed` boolean in `localStorage`, read by 4 route files, gating a render conditional only | Real per-product entitlement, read from `subscriptions` on every request, gating both the render *and* what data is ever sent to the client | This phase | Closes both the "flip it in devtools" bug and the deeper "the content was never actually hidden from the bundle" bug |

**Deprecated/outdated:**
- `useApp().subscribed`, `useApp().setSubscribed`, `useApp().plan`, `useApp().setPlan`, `useApp().gate()` (src/store.jsx) — all four read sites (`Edition.jsx`, `Archive.jsx`, `Books.jsx`, `Account.jsx`, plus `Writings.jsx` which also calls `gate()`) must stop calling these and switch to real entitlement data (`useEntitlements()`, already built in Phase 3, plus this phase's new `useGatedContent()`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Books/writings have no existing full-content data model — GATE-01's "book full spreads, paywalled writings" wording is aspirational relative to the current codebase, and Phase 4 should scope real server-enforcement to editions (the only content type with real gated text today), treating books/writings as label-only fixes | Summary, Phase Requirements | If wrong (the user actually wants placeholder full-spread/essay content authored in this phase), the plan under-scopes Phase 4 and GATE-01 is not fully satisfied for those two content types — needs explicit confirmation via `/gsd-discuss-phase` before planning proceeds |
| A2 | `past_due` subscriptions should NOT count as entitled for content-gating purposes (stricter reading of "hasn't actually paid"), even though `api/billing/checkout.js`'s existing re-check treats `past_due` as "already subscribed" for a different purpose (blocking duplicate Checkout) | Common Pitfalls (Pitfall 5), Architectural Responsibility Map | If wrong (the intended behavior is a grace period during `past_due`), subscribers who miss a renewal payment lose access immediately instead of getting the grace window the business may want — this is a product/billing policy decision, not a technical one, and should be locked explicitly rather than inferred |
| A3 | A new `lib/auth.js` shared session-lookup helper is worth extracting in this phase (Don't Hand-Roll) rather than adding a 4th copy-pasted block | Don't Hand-Roll | Low risk either way — pure internal refactor; if skipped, only cost is one more duplicated ~10-line block, not a correctness issue |

**If this table is empty:** N/A — see entries above; A1 in particular should block final phase planning until resolved.

## Open Questions

1. **Does GATE-01 require real full-content data for books and writings, or is editions-only server-enforcement sufficient for this phase?**
   - What we know: `src/data/content.js`'s `books` and `writings` arrays contain no full-spread/full-essay text field today; only `editions[].excerpt` is real gated content.
   - What's unclear: Whether the user considers the current book/writing "gate() label" (a UI string like "First spread free"/"Subscribers") to be in-scope "gated content" that must be entitlement-driven (a small, real fix — swap the label's data source), versus expecting actual full book-spread/essay content to be authored and gated in this phase (a larger, content-authoring task outside a typical engineering phase's scope).
   - Recommendation: Confirm with the user during `/gsd-discuss-phase`. Default recommendation if undecided: scope real content-payload gating to editions only in Phase 4; make the Books/Writings `gate()` label reflect real per-product entitlement (so it's no longer driven by the fake flag) without inventing placeholder full content; note the real content-delivery gap as a `v2`/GATE-06-adjacent follow-up.

2. **Should a `past_due` subscription retain content access (grace period) or lose it immediately?**
   - What we know: Stripe's `past_due` status means a renewal payment failed but Stripe hasn't yet canceled the subscription; `ACCT-04` (Phase 5) already plans a "payment failed, update your card" notice, implying `past_due` is meant to be visible/actionable to the user, not silently identical to "active."
   - What's unclear: Whether `past_due` should still unlock gated content (common "grace period" billing pattern) or should immediately revoke it (matches the milestone's stated core value literally: "hasn't actually paid").
   - Recommendation: Lock this explicitly as a phase decision before writing the entitlement query's `status IN (...)` list — it is a one-word change with real product-policy consequences, not a default to infer silently.

## Environment Availability

No new external tools, services, or runtimes are introduced by this phase — it reuses the already-provisioned Vercel Postgres database (Phase 1) and existing Vercel serverless function runtime (Phases 2–3). Skipped per this section's own skip condition (no *new* external dependencies).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | Indirect (reused) | Already built (Phase 2) — session cookie verification, no new auth surface introduced here |
| V3 Session Management | Indirect (reused) | Already built (Phase 2) — opaque hashed session tokens, sliding expiry |
| V4 Access Control | **Yes — this phase's core domain** | Per-request server-side entitlement check against `subscriptions`, keyed on the exact `stripe_product_id` for the content type; never a client-supplied or cached flag |
| V5 Input Validation | Yes | Edition `no` (and any future book/writing slug) must be validated against the known content set (`getEditionContent(no)` returning `undefined` for anything unrecognized) before any DB/content lookup — mirrors `lib/products.js`'s `isProductKey()` allowlist pattern |
| V6 Cryptography | No new surface | Reuses Phase 2's existing SHA-256 session-hash scheme; no new cryptographic code introduced |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Insecure Direct Object Reference — requesting another user's or another product's gated content by guessing/altering an ID | Elevation of Privilege | Server-side entitlement check keyed on the authenticated session's own `user_id` (never a client-supplied user identifier) plus an explicit `stripe_product_id` predicate per content type [CITED: OWASP ASVS V4 / IDOR Prevention Cheat Sheet — "proper authorization checks are the primary defense... centralized authorization logic so every data access path enforces ownership"] |
| Sensitive data present in a static/cacheable artifact (the bundling-leak this phase exists to fix) | Information Disclosure | Move gated text to a server-only module never imported by `src/`; verify post-build via `grep` on the built `dist/assets/*.js` for gated strings |
| Stale cached entitlement response served after cancellation | Information Disclosure | `Cache-Control: private, no-store` on every gated API response [CITED: vercel.com/docs/caching/cache-control-headers] |
| Client-trusted entitlement flag (the exact flaw this milestone exists to fix, per REQUIREMENTS.md "Out of Scope" table) | Tampering | No entitlement value is ever read from `localStorage`, a cookie value, or any client-supplied field — always a live DB read |

## Sources

### Primary (HIGH confidence)
- `lib/db.js`, `lib/session.js`, `lib/products.js`, `migrations/0001_init.sql`, `migrations/0004_billing_stripe_price_id.sql`, `api/auth/session.js`, `api/billing/status.js`, `api/billing/checkout.js`, `src/store.jsx`, `src/routes/Edition.jsx`, `src/routes/Archive.jsx`, `src/routes/Books.jsx`, `src/routes/Writings.jsx`, `src/routes/Account.jsx`, `src/data/content.js`, `src/data/seo.js`, `src/App.jsx`, `prerender.js`, `vercel.json`, `vite.config.js`, `package.json`, `src/lib/useSession.js`, `src/lib/useEntitlements.js`, `src/data/products.js`, `src/components/Cover.jsx` — all read directly this session
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/PROJECT.md`, and all Phase 1–3 `*-SUMMARY.md` files — read directly this session

### Secondary (MEDIUM confidence)
- [Vercel Cache-Control headers docs](https://vercel.com/docs/caching/cache-control-headers) — `private`/`no-store` semantics for excluding a serverless function response from Edge Network caching
- [OWASP ASVS V4 — Access Control](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x12-V4-Access-Control.md) and [IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html) — per-request authorization and IDOR mitigation guidance

### Tertiary (LOW confidence)
- None used — no unverified claims are load-bearing in this document beyond what's flagged in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; every existing library/pattern verified by reading the actual installed files this session
- Architecture: HIGH for the bundling-leak diagnosis and schema reuse (all read from source); MEDIUM for the exact new-file layout (a reasonable, convention-following proposal, not yet user-confirmed)
- Pitfalls: HIGH — Pitfalls 1, 2, 4 are directly traceable to this repo's own code/history (Pitfall 4 already happened once in Phase 3, see `03-02-SUMMARY.md`); Pitfalls 3, 5 draw on cited external docs plus this repo's schema

**Research date:** 2026-09-09
**Valid until:** 30 days (stable, in-repo architecture; no fast-moving external dependency)
