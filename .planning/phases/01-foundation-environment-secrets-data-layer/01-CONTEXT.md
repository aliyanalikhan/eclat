# Phase 1: Foundation — Environment, Secrets & Data Layer - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the server-side foundation only — no auth flow, no billing flow, no gating logic yet. Concretely: a server-only secrets boundary (env vars never reach the client bundle), a Postgres schema with tables for users, sessions, subscriptions, and processed webhook events, and a build-time check that fails `npm run build` if any secret substring leaks into `dist/`. Phases 2-5 build on top of this schema but do not exist yet.

</domain>

<decisions>
## Implementation Decisions

### Database provider & provisioning
- **D-01:** Use Vercel Postgres (Neon-backed) as the managed database — native Vercel integration, env vars auto-injected into the project, no separate account to manage.
- **D-02:** The database has NOT been created yet. Plan/execute MUST include an explicit checkpoint instructing the user to provision it in the Vercel dashboard and confirm the resulting env vars (`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, etc.) before continuing. Do not invent connection strings.
- **D-03:** Serverless functions use the pooled connection (`POSTGRES_URL`) by default, not `POSTGRES_URL_NON_POOLING` — avoids exhausting Postgres's connection limit under concurrent serverless invocations.
- **D-04:** Query via `@vercel/postgres` with raw tagged-template SQL. No ORM (Drizzle/Prisma rejected) — matches the project's existing minimal-dependency style and needs no generated client or extra build step.
- **D-05:** Schema changes are tracked as plain numbered `.sql` files in a `/migrations` folder, applied via a small Node script (not ORM-managed migrations).
- **D-06:** Migrations auto-run as part of the Vercel build/deploy step (not manual-only). **Reversibility:** costly — **rationale:** an auto-run migration executing against production on every deploy means a bad migration script has no manual review gate before it touches live schema; if this proves risky in practice, switching to manual-only requires re-wiring the build script and establishing a new deploy runbook step.

### Entitlement schema shape
- **D-07:** One `subscriptions` table mirrors Stripe directly (`user_id`, `stripe_subscription_id`, `stripe_product_id`, `status`, `current_period_end`, ...). No separate derived `entitlements` table — each of the 4 Stripe products is already its own subscription, so "does user X have an active sub to product Y" is a single indexed lookup on this table. This directly satisfies GATE-03 (Hard Copy and Online are independent entitlements) without extra schema.
- **D-08:** `users.id` is an internal UUID primary key. `google_sub` (Google's stable identity claim, per AUTH-03) is stored as a separate unique, indexed column — looked up only at sign-in. All other tables (subscriptions, sessions) reference `users.id`, not `google_sub`, directly. **Reversibility:** reversible — internal indirection layer, doesn't lock in Google as the only future identity source.
- **D-09:** `subscriptions.status` mirrors Stripe's own status enum verbatim (`active`, `past_due`, `canceled`, `unpaid`, etc.) — no custom internal status vocabulary or translation layer. Phase 3's webhook handler writes Stripe's value as-is; Phase 4/5 read it directly.
- **D-10:** `webhook_events` table enforces idempotency via a unique constraint on `stripe_event_id` plus a `processed_at` timestamp. The webhook handler attempts to insert the event id first; a constraint violation means "already processed, skip." No full event payload is stored (kept lean, no audit-log requirement was raised).

### Local dev DB strategy
- **D-11:** Local development points at the SAME Vercel Postgres database used for preview deploys — no separate dev/branch database. Accepted as safe because there are no real users/production data yet (pre-launch). No Docker Desktop install required on Windows.
- **D-12:** Env vars are pulled locally via `vercel env pull .env.local` (Vercel CLI), not manually copy-pasted — the Vercel dashboard stays the single source of truth, avoiding drift.

### Secret-scan build gate
- **D-13:** The build-time secret scan checks for EXACT VALUES of server secret env vars (`GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SESSION_SECRET`, `POSTGRES_URL`, etc.) read from `process.env`, grepped against the built `dist/` output. Not pattern-based (no `sk_live_`/`whsec_` prefix matching) — exact-value matching only, to avoid false positives.
- **D-14:** The scan runs as part of `npm run build` every time (wired in alongside the existing `prerender.js` post-build step), not only in the Vercel deploy pipeline — a leak is caught locally the moment it happens.
- **D-15:** On finding a leaked secret, the script exits non-zero and prints WHICH env var leaked and where (e.g., `STRIPE_SECRET_KEY found in dist/assets/index-abc123.js`) — but never prints the secret's actual value, to avoid further exposure in CI/terminal logs.

### Claude's Discretion
- Exact SQL column types/constraints beyond what's specified above (e.g., timestamp precision, additional indexes) — left to planning/execution.
- Exact shape of the `sessions` table (not discussed in detail — cookie/session-ID design is Phase 2's concern; Phase 1 only needs the table to exist per Success Criterion #3).
- Naming conventions for migration files and the migration-runner script's exact implementation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` — Phase 1 section (Goal, Success Criteria, Requirements ENV-01/ENV-02)
- `.planning/REQUIREMENTS.md` — ENV-01, ENV-02 (full requirement text); also GATE-03, BILL-04, BILL-06, AUTH-03 (referenced during this discussion, relevant to schema design even though implemented in later phases)
- `.planning/PROJECT.md` — Core Value, Constraints, Key Decisions (Stripe product IDs, Google-only auth, horizontal-layers structure)

### Codebase Analysis
- `.planning/codebase/STACK.md` — confirms zero current backend/DB/env-var usage; current build/config file locations
- `.planning/codebase/CONCERNS.md` — flags `.gitignore` does not yet exclude `.env*`; flags `src/store.jsx`'s `subscribed` flag as the thing NOT to reuse for real entitlement; flags the prerendering model's incompatibility with per-user gating (relevant context, acted on in Phase 4, not this phase)
- `.planning/codebase/INTEGRATIONS.md` — confirms no env vars, no secrets, no DB currently exist anywhere in the repo; documents current CSP baseline

### Existing Config (to be modified this phase)
- `vercel.json` — current security headers/CSP baseline; deployment config target for the DB integration
- `.gitignore` — must be updated to exclude `.env`, `.env.local`, `.env*.local` (ENV-02)
- `package.json` — current build scripts (`dev`, `build`, `build:client`, `preview`, `serve`); secret-scan step gets wired in here

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prerender.js` — existing pattern for a post-build Node script; the new secret-scan step should follow this same "runs after `vite build`, operates on `dist/`" shape rather than inventing a new build-tooling pattern.

### Established Patterns
- No `.env` handling, no config module, no DB client, no auth SDK exist anywhere yet — this phase is 100% net-new infrastructure, not a modification of existing patterns.
- `src/store.jsx`'s `subscribed`/`plan` localStorage state is the CURRENT demo entitlement mechanism. It must NOT be read from, extended, or treated as a starting point for the real `subscriptions` table — it gets fully replaced in Phase 4 (GATE-02). Phase 1 does not touch `src/store.jsx` at all; this note exists so planning doesn't accidentally conflate the two.

### Integration Points
- `vercel.json` already exists and is the deployment config target — new DB/env config layers onto it, doesn't replace it.
- `package.json` build scripts (`build`, `build:client`) are where the secret-scan step and migration-runner step get added.

</code_context>

<specifics>
## Specific Ideas

- User already has a Vercel account (implied by existing `vercel.json`) but has NOT yet provisioned Vercel Postgres — this must be an explicit, called-out step during execution, not assumed to exist.
- User explicitly chose auto-run migrations on build/deploy over the manual-only recommendation — comfortable with that risk tradeoff at this pre-launch stage.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Foundation — Environment, Secrets & Data Layer*
*Context gathered: 2026-09-08*
