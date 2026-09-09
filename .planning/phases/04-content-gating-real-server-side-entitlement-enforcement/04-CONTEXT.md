# Phase 4: Content Gating — Real Server-Side Entitlement Enforcement - Context

**Gathered:** 2026-09-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 replaces every remaining client-trusted content gate with a real server-side entitlement check, reading from the `subscriptions` table that Phase 3's webhooks already keep in sync. No new payment/product/session logic and no new content model — just correct, real-time, per-product access control layered onto the content types and gating UI that already exist (editions' full-issue excerpt text, and the cosmetic `gate()` labels on Books/Writings listing cards). The `subscribed` localStorage flag and all its read sites are removed for good.

</domain>

<decisions>
## Implementation Decisions

### Scope: what actually gets gated
- **D-01:** Books.jsx and Writings.jsx are listing pages only — there is no detail route or full-content data (no full spreads, no full essay text) anywhere in the codebase today; the only real gated *content* that exists is the excerpt paragraphs in `Edition.jsx`. Phase 4 does **not** build new gated detail views or expand the content model for books/writings — it only replaces the mechanism (`subscribed` boolean → real entitlement) behind the `gate()` label already shown on those listing cards. Building real full-spread/full-essay content remains a v2 concern (GATE-06, content-model change). — **Reversibility:** reversible — purely a scope boundary for this phase, doesn't block adding real detail content later.
- **D-02:** For Editions specifically, the actual security fix is deeper than a label swap: `ed.excerpt` (all paragraphs, including the one currently CSS-blurred via `.prose__blur`) is imported from `src/data/content.js` and rendered into the SSR/prerendered HTML today — meaning the "gated" paragraph is already sitting in view-source for everyone, subscribed or not. Fixing GATE-01 for editions requires moving the gated paragraph(s) out of the publicly prerendered/bundled data entirely and serving them only via an authenticated, per-request API call to an entitled user; the free-preview paragraphs (everything but the last, matching today's exact boundary per GATE-05) stay exactly as prerendered today. — **Reversibility:** one-way — once the content data is split into a public-preview set and a server-only-gated set, reverting to "ship it all in content.js" reintroduces the exact vulnerability this phase exists to close.

### Product → content entitlement mapping
- **D-03:** Of the 4 real Stripe products (`eclat-online`, `eclat-hardcopy`, `book-online`, `book-hardcopy`), Writings/essays are gated by `eclat-online` — same digital-magazine subscription that unlocks edition full issues, not a separate product and not "any active subscription."
- **D-04 (GATE-03):** A user holding only `eclat-hardcopy` (or only `book-hardcopy`) with no corresponding Online product gets **zero** digital/web access to that product's gated content — the paywall behaves exactly as if they weren't subscribed at all. Hard Copy is purely a physical-mail subscription with no bundled digital perk.
- **D-05:** An active Online subscription (`eclat-online` or `book-online`) unlocks the **entire back-archive** under that product — entitlement is a simple "does this user have a currently-active subscription row for product X" boolean, independent of specific edition/item or publish date. No per-item date comparison is needed.
- **D-06 (surfaced by RESEARCH.md, Open Question 2):** A `past_due` subscription (Stripe renewal payment failed, not yet canceled) does **not** count as entitled — it loses gated-content access immediately, same as `canceled`. Only `status = 'active'` grants entitlement; every other Stripe status value mirrored into `subscriptions.status` (`past_due`, `canceled`, `unpaid`, `incomplete`, etc.) is treated as not-entitled. Matches the milestone's core value literally ("hasn't actually paid for it"); Phase 5's ACCT-04 "update your card" notice is the user-facing explanation for why access dropped, not a grace-period mechanism.

### Claude's Discretion
- Exact API route naming/shape for the authenticated per-request gated-content fetch (e.g. `/api/content/editions/:no`) — follows the `/api/billing/*` and `/api/auth/*` Node-route conventions established in Phases 2/3.
- How the entitlement-checking DB query is structured against `subscriptions.stripe_product_id` (per Phase 3's D-05/GATE-03 encoding) — technical detail for research/planning.
- Exact mechanism for avoiding stale cached access on cancellation (GATE-04) — e.g. `Cache-Control: no-store` on the gated API route, whether the `/editions/:no` page itself can still be prerendered as a public shell with the gated block fetched client-side post-mount. This was flagged in STATE.md as needing verification against the actual current route list — research's job, not a user preference.
- Whether `Archive.jsx`'s "Preview free" label and `Books.jsx`/`Writings.jsx`'s labels are driven by the same generic `gate()`-style helper or per-page logic — implementation detail only.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` — Phase 4 section (Goal, Success Criteria, Requirements GATE-01 through GATE-05; `UI hint: yes`)
- `.planning/REQUIREMENTS.md` — GATE-01 through GATE-05 (full requirement text, GATE-03 locked 2026-09-08); v2 GATE-06 (deferred content-model change — explicitly NOT this phase); Out of Scope table
- `.planning/PROJECT.md` — Core Value, Constraints, Key Decisions table

### This Phase's Research
- `.planning/phases/04-content-gating-real-server-side-entitlement-enforcement/04-RESEARCH.md` — confirms the bundling-leak diagnosis (D-02), the books/writings scope finding (D-01), recommends extracting a shared `lib/auth.js` session-lookup helper (3x duplicated already across `api/auth/session.js`, `api/billing/status.js`, `api/billing/checkout.js`), and surfaced the `past_due` entitlement question resolved as D-06 above

### Prior Phase Context
- `.planning/phases/01-foundation-environment-secrets-data-layer/01-CONTEXT.md` — DB schema decisions (`subscriptions` table shape, `status` enum, `users.id` as `BIGINT`)
- `.planning/phases/02-authentication-google-sign-in-server-side-sessions/02-CONTEXT.md` — session/identity verification pattern (`lib/session.js`, `api/auth/session.js`) to reuse for entitlement checks
- `.planning/phases/03-billing-webhooks-stripe-checkout-and-subscription-sync/03-CONTEXT.md` — D-05 (per-product independent entitlement, same pattern GATE-03/D-04 above reuses); webhook-driven `subscriptions` sync is the single source of truth
- `.planning/STATE.md` — Accumulated Context: "Session (identity) and entitlement (access) are kept structurally separate — entitlement is always a live DB read per gated request, never baked into a session cookie/JWT"; "format-aware gating (GATE-03) is encoded in `subscriptions.stripe_product_id` per-product rows"; flagged blocker "the prerender split... needs verification against the actual current route list in the codebase"
- `lib/products.js` — the 4 canonical product slugs (`eclat-online`, `eclat-hardcopy`, `book-online`, `book-hardcopy`) and their real Stripe product IDs — D-03/D-04 above map directly onto these slugs
- `migrations/0001_init.sql` / `migrations/0004_billing_stripe_price_id.sql` — live `subscriptions` schema (`user_id`, `stripe_product_id`, `status`, `current_period_end`)

### Codebase Analysis
- `src/routes/Edition.jsx` — current paywall: `subscribed` boolean gates whether `ed.excerpt` renders in full vs. all-but-last-paragraph with CSS blur (`.prose__blur`) on the last one; **the full text is already present in prerendered HTML regardless of `subscribed` state** — this is the concrete vulnerability D-02 fixes
- `src/routes/Books.jsx`, `src/routes/Writings.jsx` — listing-only pages; `gate('First spread free')` / `gate('Subscribers')` are cosmetic labels only, no actual content is hidden today (confirms D-01)
- `src/routes/Archive.jsx` — `gate('Preview free')` label, same cosmetic pattern
- `src/routes/Account.jsx` — reads `subscribed`/`plan`/`setSubscribed` from the store for status/renewal/invoice display (GATE-02 removal site; note Phase 5 rebuilds this page's real billing UI, but the `subscribed` read must still go in Phase 4 per GATE-02's explicit file list)
- `src/store.jsx` — `AppProvider`: owns `subscribed`, `plan`, `gate(label)`, all persisted to `localStorage` key `eclat:demo-state` — entire subscription-related surface here is removed/replaced per GATE-02
- `src/data/content.js` — `editions[].excerpt` (the gated text array), `books[]`/`writings[]` (metadata only, no content fields) — confirms D-01/D-02's data-shape findings

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/session.js` + `api/auth/session.js` — existing DB-backed, fail-closed "who is the signed-in user" pattern; the new entitlement check should compose with this (verify session, then check `subscriptions` for the relevant product)
- `lib/db.js` (`sql` tagged template, `db` pooled client) — existing Postgres access; no new DB client needed
- `lib/products.js` — canonical product slugs; entitlement checks should key off these same 4 slugs, not raw Stripe product IDs

### Established Patterns
- `middleware.js` — cheap edge-level cookie-presence pre-filter pattern from Phase 2, already applied to `/account`; likely extends to any new gated-content routes
- `api/billing/status.js` — existing pattern for a per-user DB-backed status read; the new gated-content API likely follows the same shape (fail closed, entitlement-derived response)

### Integration Points
- `src/App.jsx` route table, `src/data/seo.js` (`allRoutes()`), `prerender.js` — all three must stay in sync per the project's documented architectural constraint; if any route's rendering strategy changes (static → hybrid shell+client-fetch), all three need updating
- `vercel.json` / `public/_headers` — current CSP and cache headers; gated API responses need explicit no-store caching guidance (GATE-04), separate from the existing long-cache `/assets/*` rule

</code_context>

<specifics>
## Specific Ideas

No specific UI/UX references beyond what's already locked by GATE-05 ("renders exactly as it does today" for public content). All four discussion decisions were scope/mapping questions with a clear recommended answer, accepted as-is.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Real full-spread/full-essay gated content for Books/Writings (D-01) is explicitly v2 (GATE-06), not deferred from this discussion but already out of scope from the start.

</deferred>

---

*Phase: 4-Content Gating — Real Server-Side Entitlement Enforcement*
*Context gathered: 2026-09-09*
