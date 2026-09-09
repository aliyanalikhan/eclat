# Phase 4: Content Gating — Real Server-Side Entitlement Enforcement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-09
**Phase:** 4-Content Gating — Real Server-Side Entitlement Enforcement
**Areas discussed:** Books/writings gating scope, Writings entitlement mapping, Hard Copy web access, Archive access scope, Past-due access (surfaced post-hoc by RESEARCH.md), Entitlement hook lifecycle (folds Phase 3 IN-03), Edition page render strategy, Not-entitled presentation, Gated API response contract

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

## Entitlement hook lifecycle (folds Phase 3 IN-03)

> Phase 3's 03-REVIEW.md flagged IN-03: `useEntitlements().refetch()` returns a cleanup function the effect captures, but manual callers (SubscribeSuccess.jsx polling) drop it → state-after-unmount risk. Folded into this phase because Phase 4 introduces a sibling `useGatedContent` hook that would inherit the same pattern.

| Option | Description | Selected |
|--------|-------------|----------|
| AbortController + cancelled guard (hybrid) (Recommended) | Aborts the in-flight fetch on unmount/refetch; `.then/.catch` still check a cancelled flag. Backported into `useEntitlements` too. | ✓ |
| Cancel-flag only (extend current pattern) | Keep per-call cleanup shape, hold active cleanup in a ref for manual `refetch()` calls; no network abort. | |

**User's choice:** AbortController + cancelled guard (hybrid) (Recommended)
**Notes:** The abort is a real network-level cancel; the cancelled flag covers continuations that fire anyway (cached/no-network paths).

---

### Shared fetch primitive (sub-question of hook lifecycle)

| Option | Description | Selected |
|--------|-------------|----------|
| Shared `useSafeFetch(url)` primitive (Recommended) | New `src/lib/useSafeFetch.js` wrapping fetch + AbortController + cancelled flag; both hooks consume it and map results. | ✓ |
| Duplicate the pattern in both hooks | No new abstraction; matches the sibling-hook copy convention. | |

**User's choice:** Shared `useSafeFetch(url)` primitive (Recommended)
**Notes:** Phase 5's account hooks are a third consumer, which justifies the abstraction over a third copy.

---

### Stale-response / rapid-refetch handling (sub-question of hook lifecycle)

| Option | Description | Selected |
|--------|-------------|----------|
| Abort previous + only latest wins (Recommended) | `refetch()` aborts the in-flight fetch and bumps a monotonically increasing request id; a response applies only if its id is still latest. | ✓ |
| Abort previous only | AbortController cancellation alone drops the stale response; request id is redundant. | |

**User's choice:** Abort previous + only latest wins (Recommended)
**Notes:** The id guard covers the race where an aborted fetch still resolves before the newer request completes.

---

## Edition page render strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Static shell + client-fetched gated block (Recommended) | Prerender free paragraphs + silent skeleton placeholder; `useGatedContent` fetches the entitled paragraph post-mount; route-list trio untouched. | ✓ |
| Fully dynamic `/editions/:no` route | Remove from the prerender route list; server-side render per request with session-decided gated block; drops prerendering, forces route-list change. | |

**User's choice:** Static shell + client-fetched gated block (Recommended)
**Notes:** Resolves the STATE.md prerender-split blocker; the route-list trio (`src/App.jsx`, `src/data/seo.js`, `prerender.js`) stays in sync as-is.

---

### Edition excerpt data location (sub-question of render strategy)

| Option | Description | Selected |
|--------|-------------|----------|
| content.js free-only (Recommended) | `editions[].excerpt` becomes a FREE-ONLY array; gated paragraphs physically absent from `src/` ("everything in src/ is public by construction"); API serves the full gated set. | ✓ |
| Keep full excerpt in content.js, slice in Edition.jsx | Minimal change, but full gated text still ships in the src/ bundle — defeats D-02. | |

**User's choice:** content.js free-only (Recommended)
**Notes:** This permanently closes the D-02 bundling leak.

---

### Non-subscriber public shell visual (sub-question of render strategy)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep exact visual today + silent skeleton (Recommended) | Same free paragraphs + silent ink-tint skeleton (`.plan__skeleton`, rgba(22,19,15,0.06)) where the last paragraph was; no CTA, no lock icon, no "Loading…" text. | ✓ |
| Add subtle "Subscribers" affordance | Same skeleton + small subscribe CTA/lock hint (deviates from GATE-05/UI-SPEC — scope creep). | |

**User's choice:** Keep exact visual today + silent skeleton (Recommended)
**Notes:** Matches GATE-05's "renders exactly as it does today".

---

## Not-entitled presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct confirmed-blocked state per session state (Recommended) | Signed-out keeps silent skeleton; signed-in non-subscribers get fail-closed fine-print "Couldn't confirm your subscription — reload to try again" in `--bad` color per UI-SPEC. | ✓ |
| Uniform silent skeleton for everyone | No copy regardless of session; weaker for just-charged users who lost access. | |

**User's choice:** Distinct confirmed-blocked state per session state (Recommended)
**Notes:** The 401 vs 200 `{entitled:false}` API split (see next area) is what lets the client distinguish the two without a second endpoint.

---

### Listing labels session-awareness (sub-question of not-entitled presentation)

| Option | Description | Selected |
|--------|-------------|----------|
| Stay cosmetic and session-independent (Recommended) | Same label text regardless of session; `gate()` re-wired to a static value or removed for hard-coded text; no entitlement fetch on listing pages. | ✓ |
| Entitlement-driven labels | Listing pages call the entitlement API and flip labels; adds fetch+loading to every listing page for a cosmetic label (scope creep vs D-01). | |

**User's choice:** Stay cosmetic and session-independent (Recommended)
**Notes:** Matches D-01 and UI-SPEC's silent-fail rule.

---

## Gated API response contract

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit 200/401 semantics, fail-closed unknown (Recommended) | 200 `{entitled:false, has_session:false}` (confirmed not-entitled signed-in); 401 (missing/invalid session); 200 `{entitled:true, content:{paragraphs:[...]}}` (entitled); non-2xx/network → unknown → fail-closed skeleton. | ✓ |
| Uniform 200 shape with session flag only | No 401; client derives blocked-vs-signed-out from a body flag; weaker contract. | |

**User's choice:** Explicit 200/401 semantics, fail-closed unknown (Recommended)
**Notes:** Mirrors `api/billing/status.js`'s fail-closed error handling; single-edition payload only (D-17).

---

### Cache invalidation / defense-in-depth (sub-question of API contract)

| Option | Description | Selected |
|--------|-------------|----------|
| no-store on every branch + vercel.json rule (Recommended) | `Cache-Control: no-store` on every response (mirrors Phase 3 IN-01's 4-response pattern), plus a `vercel.json` headers rule for the gated route path as defense-in-depth. | ✓ |
| no-store on every branch only | Relies on the handler remembering the header forever; no config-level guard. | |

**User's choice:** no-store on every branch + vercel.json rule (Recommended)
**Notes:** The existing long-cache `/assets/*` rule is untouched.

---

## Claude's Discretion

- Exact API route naming/shape for the authenticated per-request gated-content fetch.
- Entitlement-checking DB query structure against `subscriptions.stripe_product_id`.
- Exact placement/pattern of the `vercel.json` no-store header rule for the gated route path; whether the shared `useSafeFetch` client primitive needs a server-side sibling.
- Whether the `gate()` label mechanism stays a single shared helper or goes per-page (now largely moot — D-14 re-wires it to a static value or removes it).

## Deferred Ideas

None — discussion stayed within phase scope. Real full-spread/full-essay gated content for Books/Writings remains v2 (GATE-06), not deferred from this discussion but already out of scope from the start.
