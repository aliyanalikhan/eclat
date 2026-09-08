# Phase 1: Foundation — Environment, Secrets & Data Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 1-Foundation — Environment, Secrets & Data Layer
**Areas discussed:** Database provider, Entitlement schema shape, Local dev DB strategy, Secret-scan build gate

---

## Database provider

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Postgres (Neon-backed) | Native Vercel integration, auto-injected env vars, lowest friction | ✓ |
| Supabase | Generous free tier, own dashboard, separate account/connection string | |
| Neon (standalone) | Same tech, gives branch databases without Vercel integration | |
| I already have one picked | — | |

**User's choice:** Vercel Postgres (Neon-backed)
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| I'll create it during execution | Explicit checkpoint to provision in dashboard during execution | ✓ |
| Already created | Tell planning the existing env var names | |

**User's choice:** I'll create it during execution

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, pooled by default | Avoids connection exhaustion under serverless load | ✓ |
| Non-pooled | Only for specific reasons like long-lived migrations | |

**User's choice:** Yes, pooled by default

| Option | Description | Selected |
|--------|-------------|----------|
| @vercel/postgres + raw SQL | Official package, tagged-template SQL, lightweight | ✓ |
| Drizzle ORM | Type-safe schema/query builder, more scaffolding | |
| Prisma | Full ORM, heavier, generated client | |

**User's choice:** @vercel/postgres + raw SQL

| Option | Description | Selected |
|--------|-------------|----------|
| Plain SQL migration files | Numbered .sql files, applied via small Node script | ✓ |
| ORM-managed migrations | Tied to whichever ORM was picked | |

**User's choice:** Plain SQL migration files

---

## Entitlement schema shape

| Option | Description | Selected |
|--------|-------------|----------|
| One subscriptions table mirroring Stripe | Per-product entitlement via single indexed lookup, no extra table | ✓ |
| Separate subscriptions + entitlements tables | Derived table recomputed on every webhook, more moving parts | |

**User's choice:** One subscriptions table mirroring Stripe

| Option | Description | Selected |
|--------|-------------|----------|
| Internal UUID PK + unique google_sub column | Stable foreign keys, indirection from identity source | ✓ |
| google_sub as the primary key directly | Simpler, ties FKs to Google's identifier format | |

**User's choice:** Internal UUID PK + unique google_sub column

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror Stripe's status enum directly | No translation layer, webhook writes Stripe's value as-is | ✓ |
| Custom internal status enum | More vocabulary control, needs sync maintenance | |

**User's choice:** Mirror Stripe's status enum directly

| Option | Description | Selected |
|--------|-------------|----------|
| Unique stripe_event_id + processed_at | Insert-first-wins, race-safe, no payload storage | ✓ |
| Store full event payload too | Same + raw JSON for audit/replay, growing table | |

**User's choice:** Unique stripe_event_id + processed_at timestamp

---

## Local dev DB strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Same Vercel Postgres DB, dev-safe usage | Zero extra setup, acceptable pre-launch with no real users | ✓ |
| Separate branch/dev database | Fully isolated, more setup | |
| Local Postgres via Docker | Most isolated, requires Docker Desktop install on Windows | |

**User's choice:** Same Vercel Postgres DB, dev-safe usage

| Option | Description | Selected |
|--------|-------------|----------|
| vercel env pull → .env.local | Single source of truth stays in Vercel dashboard | ✓ |
| Manual .env.local, pasted by hand | More room for drift/paste errors | |

**User's choice:** vercel env pull → .env.local

| Option | Description | Selected |
|--------|-------------|----------|
| Manual command only | `npm run db:migrate`, no surprise schema changes | |
| Auto-run on build/deploy | Convenient, but riskier without manual review step | ✓ |

**User's choice:** Auto-run on build/deploy (chose against the recommended manual-only option)

---

## Secret-scan build gate

| Option | Description | Selected |
|--------|-------------|----------|
| Exact values of all server secret env vars | Zero false positives, catches literal leaks | ✓ |
| Pattern-based (sk_live_, sk_test_, etc.) | Catches secrets even if env var name changes, some false positives | |

**User's choice:** Exact values of all server secret env vars

| Option | Description | Selected |
|--------|-------------|----------|
| Part of npm run build, every time | Runs identically locally and on Vercel | ✓ |
| Vercel deploy only | Faster local iteration, risk of unnoticed local leak | |

**User's choice:** Part of npm run build, every time

| Option | Description | Selected |
|--------|-------------|----------|
| Exit non-zero + print which var leaked, not the value | Debuggable without further exposing the secret in logs | ✓ |
| Exit non-zero + print the matched value too | Faster debugging, riskier if logs are shared | |

**User's choice:** Exit non-zero + print which var leaked, not the value

---

## Claude's Discretion

- Exact SQL column types/constraints beyond what was discussed (timestamp precision, additional indexes)
- Exact shape of the `sessions` table (deferred to Phase 2, which owns session/cookie design)
- Migration file naming conventions and migration-runner script implementation details

## Deferred Ideas

None — discussion stayed within phase scope.
