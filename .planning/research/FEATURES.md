# Feature Research

**Domain:** Subscriber accounts + Stripe billing for a digital magazine/publishing site
**Researched:** 2026-09-08
**Confidence:** MEDIUM-HIGH (Stripe/Google official-doc-backed findings HIGH; general paywall pattern findings MEDIUM — cross-checked across multiple independent sources)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Google sign-in (one click, no forms) | It's the only auth method for this project; users expect a standard Google button that "just works" and doesn't ask for a password | LOW | Use Google Identity Services (GIS) `credential` POST flow. Server verifies JWT signature, `aud`, `exp`, `iss`; use `sub` (not email) as the permanent user identifier — Google explicitly warns email can be reused/changed while `sub` never is. |
| Persistent signed-in session | Users don't expect to re-authenticate with Google on every page load | LOW-MEDIUM | Server-issued session (cookie, httpOnly, secure) after ID-token verification — do NOT re-trust the Google credential on every request; verify once at sign-in, then trust your own session token thereafter. |
| Clear "why am I seeing this paywall" messaging | Users get frustrated by ambiguous locked content — expect a specific CTA ("Subscribe to ÉCLAT Online to read this issue") | LOW | Content-type-aware CTA copy per the 4 products, not a generic "subscribe" wall. |
| Stripe Checkout for purchase | Users expect a fast, trusted, familiar checkout (Apple Pay/Google Pay, saved cards) rather than a custom payment form | LOW | Stripe-hosted Checkout is the standard, fastest-to-launch integration and reduces PCI/security scope versus building a custom payment form. |
| View current subscription status on Account page | Users expect to see what they're paying for and when it renews, without contacting support | LOW-MEDIUM | Minimum: plan name, status (active/canceled/past_due), renewal or end date. Can be Stripe-Customer-Portal-driven or a custom read of cached Stripe data. |
| Self-serve cancellation | Users expect to cancel without emailing support; forced "contact us to cancel" flows are a well-known dark pattern and consumer complaint magnet | LOW-MEDIUM | Either link out to Stripe Customer Portal, or implement `cancel_at_period_end` via API from the Account page. |
| Immediate re-lock on cancellation taking effect | If a user's subscription lapses (or they cancel and the period ends), they expect content to actually lock again — a paywall that "forgets" to re-lock destroys trust in the whole product | MEDIUM-HIGH | Requires server-side entitlement check on every gated request, driven by webhook-synced status, not client cache. This is the project's stated Core Value. |
| Payment failure handling / dunning | Users expect a grace period and a clear "your payment failed, update your card" notice, not silent cancellation | MEDIUM | Stripe Smart Retries + `invoice.payment_failed` webhook; minimum is surfacing a "past_due" banner and portal link. |
| Correct product/price shown pre-checkout | Since 4 discrete products exist (magazine/book × online/hard copy), users must clearly pick the right one and see its real price | LOW | Reconcile the current `/subscribe` page's placeholder $9/mo, $84/yr copy with the actual Stripe price objects on the 4 products. |
| Consistent access across all gated surfaces | A subscriber to "Magazine Online" expects every magazine page/route to unlock, not just the one they clicked from | MEDIUM | Single entitlement-check function/middleware reused across `Edition.jsx`, `Archive.jsx`, `Books.jsx`, `Account.jsx`, replacing the scattered `subscribed` flag reads. |
| Sign-out | Basic expectation once there's a real session | LOW | Clear server session/cookie. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable — and should map to this project's Core Value (real, server-enforced access).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Bundle awareness across the 4 products | A subscriber to both magazine + children's book products gets a unified "your subscriptions" view instead of 4 disconnected line items | LOW-MEDIUM | Cheap to add given the entitlement table already tracks per-product status; mostly a UI grouping decision on the Account page. |
| Format-aware gating (Online vs Hard Copy) | Hard Copy subscribers may reasonably expect Online digital access bundled in (common publisher pattern — print subscribers get web access too) | LOW (decision) / MEDIUM (implementation) | This is a product/business decision more than a technical one — flag it back to the user/roadmap rather than assuming. If chosen, it's just an entitlement-mapping rule (Hard Copy product ⇒ also grants Online entitlement), not new infrastructure. |
| Graceful degraded preview of gated content | Instead of a blank wall, show a partial preview (first few pages of an edition, cover + excerpt of a children's book) — increases conversion without giving away paid value | MEDIUM | Requires content model to support a "preview" slice, distinct from full content. Not in current data model (`content.js`) — would need a scoping decision. |
| "Content unlocked instantly after payment" confirmation UX | Immediate visual confirmation and redirect back into the content the user was trying to read, right after Stripe Checkout completes | LOW-MEDIUM | Requires Checkout `success_url` to route back to the originating content, plus a short-poll or optimistic-then-verify UI state while the webhook catches up (webhook delivery is not synchronous with checkout redirect). |
| Real invoice history | Genuine invoice list from Stripe )replacing today's mocked invoices/plan) reduces support burden and increases trust vs. a fake table | LOW | Straightforward if using Stripe Customer Portal (invoices included for free) or the Invoices API. |

### Anti-Features (Commonly Requested, Often Problematic — Explicitly Excluded Here)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Email/password sign-in (as a fallback to Google) | "What if a user doesn't have Google?" | Reintroduces password storage, reset-flow, credential-stuffing, and breach-liability surface the project explicitly chose to avoid | Google-only, as decided in PROJECT.md. If ever needed later, treat as a new milestone with its own threat model. |
| Multi-tenant / white-label subscription platform | Architecting "in case we sell this to other publishers" | Massive scope/complexity increase (tenant isolation, per-tenant billing config, per-tenant branding) for a single-brand product — explicitly out of scope | Single-brand schema: one set of 4 fixed products, one brand, many user accounts. |
| Custom-built payment form (raw Stripe Elements card form) instead of Checkout | Perceived design control | More PCI scope, more edge cases (3DS, wallets, localized payment methods) to hand-build for zero functional benefit at this stage | Stripe Checkout (hosted), which is the standard fast-launch path and already handles this. |
| New/flexible pricing tiers or custom pricing rules | "Wouldn't dynamic tiers be nice" | Explicitly out of scope — 4 real products/prices already exist in the live Stripe account; changing pricing model was never requested | Reuse the 4 existing products/prices as-is. |
| Client-trusted access flags (localStorage/cookie booleans set by the client) | Fast to build, worked for the demo | This is precisely the flaw the milestone exists to fix — the current `subscribed` localStorage flag is trivially spoofable in devtools | Server-side entitlement check on every request that serves gated content, sourced from webhook-synced Stripe state. |
| Building a fully custom subscription-management UI (upgrade/downgrade/pause/multi-item editing) from scratch | "More polished/branded than Stripe's portal" | High build+maintenance cost for functionality Stripe's hosted Customer Portal already provides for free, configurable from the Dashboard with no code | Default to Stripe Customer Portal for plan changes/cancellation/payment updates; only build custom views (read-only status) where branding truly matters. |
| Real-time WebSocket "your subscription just activated" push | Feels modern | Unnecessary complexity — webhook-to-DB sync plus a short client poll/redirect after Checkout success covers the real UX need | Poll/refetch entitlement on the success redirect page, or optimistic UI + background verification. |
| Metered/soft paywall with free-article counting | Common in general news publishing (NYT-style) | Not what this product is — it's a fixed-catalog magazine/book subscription with 4 discrete paid products, not a continuous article stream; introducing article-count metering adds a whole new tracking subsystem for a pattern that doesn't match the business model | Keep the existing table-stakes structure: some content public (as today), rest gated behind the relevant product's entitlement — a hybrid free/hard-gated split, not per-article metering. |

## Feature Dependencies

```
Google Sign-In (ID token verify + session)
    └──requires──> Server-side session issuance
                       └──requires──> A database/store for users + sessions

Stripe Checkout (subscribe flow)
    └──requires──> Signed-in user (need a Stripe customer <-> user mapping)
    └──requires──> Server-side session issuance   [same dependency as above]

Webhook-driven entitlement sync
    └──requires──> A database table for subscriptions/entitlements
    └──requires──> Stripe Checkout having created customer/subscription records to react to

Real content gating (replacing `subscribed` flag)
    └──requires──> Webhook-driven entitlement sync
    └──requires──> Server-side session issuance (need to know WHO is asking)

Subscription management UI (Account page)
    └──requires──> Webhook-driven entitlement sync   [reads the same synced state]
    └──enhances──> Real content gating (user can see WHY they're locked/unlocked)

Immediate access revocation on cancel
    └──requires──> Webhook-driven entitlement sync
    └──requires──> Real content gating doing a live (not cached-at-login) check per request

Format-aware gating (Hard Copy -> also grants Online) [differentiator]
    └──enhances──> Real content gating
    └──conflicts with──> nothing technical, but is a business-rule decision that must be made before entitlement-mapping code is written
```

### Dependency Notes

- **Everything gated requires a server-side session first.** Google sign-in producing a verified session is the single foundational dependency — checkout, entitlement checks, and account management all sit downstream of "we know who this request is from." This should be phase 1.
- **Webhook-driven entitlement sync is the load-bearing dependency for the Core Value.** Both "real content gating" and "immediate revocation" depend on it, not on the Checkout success redirect alone — Stripe webhook delivery is asynchronous relative to the Checkout redirect, so gating logic must never assume "just paid" == "entitlement row exists yet."
- **Subscription management UI enhances but does not block gating.** The product can technically gate content correctly with zero account-page polish; the Account page is a UX layer over the same synced state. Sequence gating correctness before UI polish if time-constrained.
- **Format-aware gating (Hard Copy → Online access) is a decision, not a research finding.** Flag this to the user during requirements/roadmap — it changes the entitlement-mapping rule from "1 product = 1 entitlement" to "1 product = N entitlements," which is cheap to implement either way but must be decided before the entitlement schema is finalized.

## MVP Definition

### Launch With (v1)

Minimum viable product for this milestone — matches the "Active" requirements in PROJECT.md.

- [ ] Google sign-in with server-side ID-token verification and server session — foundational, nothing else works without it
- [ ] Stripe Checkout for all 4 existing products, each mapped to its real Stripe product/price ID — the core revenue mechanism
- [ ] Webhook handler (signature-verified) syncing `customer.subscription.created/updated/deleted` and `invoice.payment_failed` into a database entitlement table — the mechanism that makes gating real instead of fake
- [ ] Server-side entitlement check replacing the `subscribed` localStorage flag across `Edition.jsx`, `Archive.jsx`, `Books.jsx`, `Account.jsx` — directly satisfies the Core Value
- [ ] Account page showing real subscription status (active/canceled/past_due) and a cancel action — table stakes, currently mocked
- [ ] Immediate re-lock on cancellation/period end — table stakes, this is literally the stated success metric

### Add After Validation (v1.x)

- [ ] Stripe Customer Portal integration (instead of/alongside a hand-rolled cancel button) — add once basic cancel-from-Account works, to reduce future support load with zero extra build cost
- [ ] Real invoice history on Account page — trivial add once Customer Portal or Invoices API is wired up
- [ ] Bundle/unified view across the 4 products on the Account page — add once multiple test subscriptions exist to validate against
- [ ] Past-due / payment-failed banner with clear "update payment method" CTA — add once basic webhook sync is proven stable

### Future Consideration (v2+)

- [ ] Format-aware gating rule (Hard Copy grants Online access too) — defer until the business explicitly decides this; don't bake it into the schema prematurely
- [ ] Preview/excerpt gating (partial content shown pre-subscription) — defer until conversion data suggests the current "just show a locked wall" approach is under-converting; requires a content-model change
- [ ] Plan upgrade/downgrade self-serve (e.g., switching Online to Hard Copy) — defer; not in current requirements and adds proration complexity

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Google sign-in + server session | HIGH | MEDIUM | P1 |
| Stripe Checkout for 4 products | HIGH | LOW-MEDIUM | P1 |
| Webhook-driven entitlement sync | HIGH | MEDIUM-HIGH | P1 |
| Server-side content gating (replace localStorage flag) | HIGH | MEDIUM | P1 |
| Account page: real status + cancel | HIGH | LOW-MEDIUM | P1 |
| Immediate revocation on cancel | HIGH | MEDIUM (depends on P1 items above) | P1 |
| Stripe Customer Portal integration | MEDIUM | LOW | P2 |
| Real invoice history | MEDIUM | LOW | P2 |
| Payment-failed banner/dunning UX | MEDIUM | LOW-MEDIUM | P2 |
| Bundle/unified subscriptions view | LOW-MEDIUM | LOW | P2 |
| Format-aware gating (Hard Copy→Online) | MEDIUM (if business wants it) | LOW | P3 (decision-gated) |
| Preview/excerpt gating | MEDIUM | MEDIUM-HIGH | P3 |
| Plan upgrade/downgrade self-serve | LOW (not requested) | MEDIUM-HIGH | P3 |

**Priority key:**
- P1: Must have for launch (matches PROJECT.md Active requirements)
- P2: Should have, add when possible
- P3: Nice to have, future consideration / decision-gated

## Competitor Feature Analysis

| Feature | NYT / large metered publishers | Financial Times / hard-paywall publishers | Our Approach |
|---------|-------------------------------|--------------------------------------------|--------------|
| Gating model | Metered (N free articles/month, then gate) | Hard (all premium content gated immediately) | Neither exactly — fixed-catalog hybrid: some content stays public as today, the rest (full editions, book spreads, paywalled writings) is hard-gated per the relevant one of 4 products. Not article-count metering; that's an anti-feature here given the catalog (not stream) content model. |
| Sign-in method | Email/password + social + sometimes magic link | Email/password + social | Google-only, deliberately narrower — matches the single-brand, security-minimal-surface goal |
| Subscription management | Custom-built account centers (large eng investment, many tiers) | Custom-built, often phone/chat support-heavy for cancellation | Stripe Customer Portal-backed — right-sized for a single small team managing 4 products, not a large publisher's bespoke billing team |
| Access enforcement | Server-side, article-level entitlement checks at request time | Server-side, section-level | Server-side, per-content-type entitlement check tied to the relevant Stripe product — matches best practice found in research (never trust cached/client state) |

## Sources

- [Build a subscriptions integration | Stripe Documentation](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Provide a customer portal to your customers | Stripe Documentation](https://docs.stripe.com/customer-management)
- [Integrate the customer portal with the API | Stripe Documentation](https://docs.stripe.com/customer-management/integrate-customer-portal)
- [How subscriptions work | Stripe Documentation](https://docs.stripe.com/billing/subscriptions/overview)
- [Using webhooks with subscriptions | Stripe Documentation](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Cancel a subscription | Stripe API Reference](https://docs.stripe.com/api/subscriptions/cancel)
- [docs.stripe.com/billing/entitlements](https://docs.stripe.com/billing/entitlements)
- [Verify the Google ID token on your server side | Google for Developers](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Authenticate with a backend server | Google for Developers](https://developers.google.com/identity/sign-in/web/backend-auth)
- [Sign in with Google One Tap prompt for Web | Google Codelabs](https://codelabs.developers.google.com/codelabs/google-one-tap)
- [Learn How to Add Subscriptions and Protected Content With Stripe | Netlify](https://www.netlify.com/blog/2020/07/13/manage-subscriptions-and-protect-content-with-stripe/)
- [How to Set Up a Stripe Paywall for Your Content in 2026 | PayRequest](https://payrequest.io/blog/stripe-paywall-content-monetization-2026)
- [Soft Paywall vs Hard Paywall: 2% vs 10% Explained | Leaky Paywall](https://leakypaywall.com/soft-paywall-vs-hard-paywall/)
- [The different types of paywalls (and how publishers use them) | Blockthrough](https://blockthrough.com/blog/the-different-types-of-paywalls-and-how-publishers-use-them/)
- [2025 Paywall Index: A Data-Driven Study Across Industries](https://www.websiteplanet.com/blog/2025-paywall-index-a-data-driven-study-across-industries/)
- [How to Create a Paywall Website: A Guide for Publishers & Creators | Memberful](https://memberful.com/blog/paywall)
- [Stripe Webhooks: Complete Guide with Event Examples | MagicBell](https://www.magicbell.com/blog/stripe-webhooks-guide)
- [Stripe subscription webhooks that survive the edge cases | Amplified Creations](https://amplifiedcreations.com/journal/stripe-subscription-webhooks)
- [Stripe Subscription Access Checklist: customer.subscription.deleted and Entitlements](https://ofeliacode.github.io/ai-saas-safety/guides/stripe-subscription-access-entitlements-checklist.html)
- Project context: `.planning/PROJECT.md` (requirements, Stripe product IDs, constraints)

---
*Feature research for: subscriber accounts + Stripe billing on a magazine/publishing site (Éclat)*
*Researched: 2026-09-08*
