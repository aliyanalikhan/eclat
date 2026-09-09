# Phase 4: Content Gating — Real Server-Side Entitlement Enforcement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-09
**Phase:** 4-Content Gating — Real Server-Side Entitlement Enforcement
**Areas discussed:** Books/writings gating scope, Writings entitlement mapping, Hard Copy web access, Archive access scope, Past-due access (surfaced post-hoc by RESEARCH.md)

---

## Books/writings gating scope

| Option | Description | Selected |
|--------|-------------|----------|
| Wire labels to real entitlement only (Recommended) | No new content or detail pages. Just make the existing `gate()` label reflect the user's real server-verified entitlement instead of the localStorage flag. Matches GATE-05's "renders exactly as today" framing; keeps GATE-06 (real degraded-preview content model) deferred to v2. | ✓ |
| Build new gated detail views now | Add real full-spread/full-essay content and detail routes as part of this phase, even though that's a content-model expansion beyond what exists today. | |

**User's choice:** Wire labels to real entitlement only (Recommended)
**Notes:** Confirmed via codebase scout that Books.jsx/Writings.jsx have no detail route or content fields — only cover art and listing metadata.

---

## Writings entitlement mapping

| Option | Description | Selected |
|--------|-------------|----------|
| eclat-online (Recommended) | Writings are magazine essay content, same as edition full issues — bundled under the same digital-magazine subscription. | ✓ |
| Any active subscription | Writings unlock for a user holding ANY of the 4 products. | |
| Separate/no real mapping needed | Treat Writings as already fully public today; leave it fully open in Phase 4. | |

**User's choice:** eclat-online (Recommended)
**Notes:** None.

---

## Hard Copy web access

| Option | Description | Selected |
|--------|-------------|----------|
| Zero digital access (Recommended) | Hard Copy is purely a physical-mail subscription — the paywall on web content behaves exactly as if they weren't subscribed at all. | ✓ |
| Some courtesy digital access | Hard Copy subscribers should still see gated web content unlocked as a bundled perk. | |

**User's choice:** Zero digital access (Recommended)
**Notes:** Matches the literal reading of GATE-03.

---

## Archive access scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full back-archive (Recommended) | Any active subscriber to a product can access every past edition/item under that product — a simple "active row for product X" boolean check. | ✓ |
| From subscription date forward only | Only content published on/after the subscription start date is unlocked — requires per-item date comparison. | |

**User's choice:** Full back-archive (Recommended)
**Notes:** Simplifies the entitlement query to a boolean check, no per-item date logic needed.

---

## Past-due access

> Not part of the original discussion — 04-RESEARCH.md (run in parallel) flagged this as an undecided policy question before planning could lock the entitlement query's `status IN (...)` filter. Resolved directly via follow-up AskUserQuestion rather than a full discuss-phase re-run.

| Option | Description | Selected |
|--------|-------------|----------|
| Lose access immediately (Recommended) | Matches the core value literally ("hasn't actually paid for it"). Phase 5's ACCT-04 notice explains why. | ✓ |
| Grace period — keep access | Common SaaS pattern: past_due still counts as entitled for a window. | |

**User's choice:** Lose access immediately (Recommended)
**Notes:** Only `status = 'active'` grants entitlement; `past_due`, `canceled`, and any other Stripe status are all treated as not-entitled.

---

## Claude's Discretion

- Exact API route naming/shape for the authenticated per-request gated-content fetch.
- Entitlement-checking DB query structure against `subscriptions.stripe_product_id`.
- Mechanism for avoiding stale cached access on cancellation (Cache-Control, prerender-shell-vs-client-fetch split) — flagged in STATE.md as needing verification during research, not a user preference.
- Whether the `gate()` label mechanism stays a single shared helper or goes per-page.

## Deferred Ideas

None — discussion stayed within phase scope. Real full-spread/full-essay gated content for Books/Writings remains v2 (GATE-06), not deferred from this discussion but already out of scope from the start.
