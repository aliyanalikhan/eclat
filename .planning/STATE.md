---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 3
current_phase_name: Billing & Webhooks — Stripe Checkout and Subscription Sync
status: planning
stopped_at: Phase 3 UI-SPEC approved
last_updated: "2026-09-09T01:20:47.244Z"
last_activity: 2026-09-09
last_activity_desc: Phase 02 complete, transitioned to Phase 3
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 6
  completed_plans: 6
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-09)

**Core value:** A signed-in subscriber's paid access is real and enforced server-side — no page, download, or API response leaks paid content to someone who hasn't actually paid for it.
**Current focus:** Phase 3 — Billing & Webhooks — Stripe Checkout and Subscription Sync

## Current Position

Phase: 3 — Billing & Webhooks — Stripe Checkout and Subscription Sync
Plan: Not started
Status: Ready to plan
Last activity: 2026-09-09 — Phase 02 complete, transitioned to Phase 3

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 6
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3 | - | - |
| 02 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Structure mode is Horizontal Layers (user's explicit choice) — env/secrets+DB foundation, then auth, then billing/webhooks, then content gating, then account UI, each a complete testable layer before the next depends on it
- Research: Server-initiated redirect flows chosen for both Google sign-in and Stripe Checkout/Billing Portal (not client-loaded SDKs) — keeps CSP changes minimal
- Research: Session (identity) and entitlement (access) are kept structurally separate — entitlement is always a live DB read per gated request, never baked into a session cookie/JWT
- Phase 2: Session tokens are opaque random values, only the SHA-256 hash is ever persisted (`sessions.token_hash`) — a DB compromise alone cannot yield a replayable session
- Phase 2: `middleware.js` is a cheap cookie-presence UX pre-filter only; `api/auth/session.js` (DB-backed) is the sole authoritative entitlement check — this same identity/entitlement split now has a concrete precedent for Phase 3's billing entitlement checks

### Pending Todos

None yet.

### Blockers/Concerns

- Format-aware gating decision (GATE-03): Hard Copy and Online are separate, independent entitlements — already decided 2026-09-08, carry into Phase 4 schema design
- Phase 3 (Billing & Webhooks): exact current Stripe API shapes/field names, `apiVersion` pinning, and real product prices should be verified against docs.stripe.com and the live Stripe account at planning time, not assumed from research
- Phase 4 (Content Gating): the prerender split (what stays static vs. becomes dynamic) needs verification against the actual current route list in the codebase, not assumed from research alone
- [Phase 2] Cosmetic: `.env.example` documents an unused `SESSION_SECRET=` line (WR-07) — no code reads it, `hashToken()` uses plain SHA-256 by design. Fix was blocked by a sandbox permission restriction on that filename during the review-fix pass; low priority, safe to clean up whenever that file is next touched.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none — first milestone)* | | | |

## Session Continuity

Last session: 2026-09-09T01:20:47.230Z
Stopped at: Phase 3 UI-SPEC approved
Resume file: .planning/phases/03-billing-webhooks-stripe-checkout-and-subscription-sync/03-UI-SPEC.md
