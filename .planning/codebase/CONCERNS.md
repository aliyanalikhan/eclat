# Codebase Concerns

**Analysis Date:** 2026-09-08

## Context

This is a prerendered React SPA (Vite + `react-router-dom`, SSR-prerendered via `prerender.js`/`src/entry-server.jsx`). There is currently **no server, no database, no real auth, and no payment processing** — the "subscription" experience is an explicitly-labeled client-side demo. The user's next milestone adds Google OAuth, multi-tenant SaaS architecture, and Stripe billing with a security emphasis. The items below are framed against that upcoming work: what must be replaced/hardened, not fixed in place.

## Tech Debt

**Client-side-only "subscription" state (`src/store.jsx`):**
- Issue: `AppProvider` holds `subscribed` and `plan` in React state, persisted to `window.localStorage` under key `eclat:demo-state` (`src/store.jsx:5,20-38`). Any content gating (`gate()` helper at `src/store.jsx:61-63`, and direct `subscribed` checks in `src/routes/Edition.jsx:121`, `src/routes/Archive.jsx:115`, `src/routes/Books.jsx:61`, `src/routes/Account.jsx:10-102`) is enforced purely in the browser.
- Files: `src/store.jsx`, `src/routes/Subscribe.jsx`, `src/routes/Account.jsx`, `src/routes/Edition.jsx`, `src/routes/Archive.jsx`, `src/routes/Books.jsx`
- Impact: Trivially bypassable — any user can open DevTools and run `localStorage.setItem('eclat:demo-state', JSON.stringify({subscribed:true,plan:'annual'}))` (or just flip React state) to unlock "paywalled" content client-side. This is explicitly called out in-app as a demo (`src/routes/Subscribe.jsx:20-21,98-105`; `src/routes/Account.jsx:16-17,95-97`) and is acceptable for the current static-site milestone, but **none of this logic must be reused as the basis for real entitlement checks**. Content gating for paying subscribers must move server-side (session/JWT validated per-request, entitlement stored in a database, checked before serving gated content/API responses — not just hidden in the client).
- Fix approach: When Stripe billing lands, replace `subscribed`/`plan` client state with a server-verified entitlement (e.g., session claim or a `GET /api/me/entitlement` call cached briefly), and gate actual content delivery (not just UI display) server-side. Treat all current `gate()`/`subscribed` usages as UI-only decoration once real auth exists, not as security boundaries.

**No environment/config layer:**
- Issue: There is no `.env` handling, no config module, and no server runtime at all — `package.json` has zero backend dependencies (`react`, `react-dom`, `react-router-dom` only; `package.json:9-13`). `.gitignore` does not list `.env` (`.gitignore`), meaning if OAuth/Stripe secrets are added carelessly to a `.env` file later, there is nothing today preventing an accidental commit.
- Files: `.gitignore`, `package.json`
- Impact: Not a current vulnerability (no secrets exist yet), but it is a gap the security-conscious next milestone will hit immediately.
- Fix approach: Before introducing OAuth/Stripe, add `.env`, `.env.local`, `.env*.local` to `.gitignore`; pick a secrets-management approach for the deployment target (Vercel env vars, given `vercel.json` is already present) and never let secrets reach client bundles (Vite only exposes `VITE_`-prefixed vars to the client — keep OAuth client secrets and Stripe secret keys server-side only).

**Vendored `get-shit-done/` tooling directory:**
- Issue: A large vendored CLI toolkit (`get-shit-done/`, plus `agents/`, `gsd-file-manifest.json`, `gsd-install-state.json`, `.gsd-profile`, `.clinerules`, `.claude/`) lives at the repo root alongside the actual product source. It is Claude Code/GSD workflow tooling, not part of the shipped site.
- Files: `get-shit-done/`, `agents/`, `gsd-file-manifest.json`, `gsd-install-state.json`
- Impact: Low direct security risk (it's dev tooling, not bundled by Vite — `src/` is the only app source), but it does bloat the repo, is not excluded in `.gitignore`, and increases the surface an auditor/reviewer has to wade through. It also means anyone cloning the repo pulls in unrelated CLI scaffolding. `get-shit-done/bin/lib/secrets.cjs` / `secrets.generated.cjs` handle masking for the *tool's own* config, not the site — don't confuse this with app-level secret handling.
- Fix approach: Confirm this directory is not deployed (check `vercel.json` `outputDirectory: "dist"` — it isn't included since only `dist/` is served, so runtime exposure is not a concern). Consider `.gitignore`-ing or moving GSD tooling out of the project root before making the repo public, purely for clarity/hygiene, not because it currently leaks anything runtime-reachable.

**No test suite:**
- Issue: No test framework, test files, or `test` script exist anywhere in `package.json` or the repo (only `dev`, `build`, `build:client`, `preview`, `serve` scripts — `package.json:7-12`).
- Files: `package.json`
- Impact: Any new auth/billing logic will ship with zero automated regression protection unless a test framework is introduced alongside it. This is a significant risk for auth/payment flows specifically, where regressions are high-stakes (locked-out users, double-charges, entitlement bypass).
- Fix approach: Introduce Vitest (pairs naturally with the existing Vite setup) before or alongside the OAuth/Stripe work, with at least entitlement-check and webhook-handling coverage as non-negotiable.

## Known Bugs

None observed in current functionality — the codebase is small and the one previously-noted bug (billing history rendering on the free tier via `subscribed || true`) has already been fixed, per the inline comment at `src/routes/Account.jsx:16-17`: "The prototype had `subscribed || true` here, which always showed billing history even on the free tier. Gated properly now." No open bugs identified.

## Security Considerations

**No authentication exists yet — this is the primary gap the next milestone addresses:**
- Risk: There is no login, no session, no user identity concept anywhere in the code (`src/store.jsx` has no `user`/`email`/`token` field). All "account" data (`Reader since 2021`, renewal dates in `src/routes/Account.jsx:7`, invoice rows in `src/data/content.js`) is static/hardcoded, not tied to any real identity.
- Files: `src/store.jsx`, `src/routes/Account.jsx`, `src/data/content.js`
- Current mitigation: None needed today since nothing sensitive is actually gated (it's all static marketing content already shipped in the prerendered HTML — see below).
- Recommendations: When Google OAuth is added, ensure gated content is not simply hidden client-side while still being present in the server-rendered/prerendered HTML or JS bundle. Currently `prerender.js` + `src/entry-server.jsx` generate static HTML per route at build time — any future "members-only" content must NOT be baked into these prerendered pages or delivered in the initial JS payload; it must be fetched dynamically post-auth from an authenticated endpoint.

**Prerendering model is incompatible with real per-user gating:**
- Risk: `prerender.js` (repo root) generates static HTML for all routes at build time via `vite build --ssr` + a prerender pass (`package.json:8`). This works for a single canonical marketing site but breaks the assumption of per-tenant/per-user content once multi-tenant SaaS + billing exist — you cannot prerender content that depends on which user/tenant is viewing it.
- Files: `prerender.js`, `src/entry-server.jsx`, `src/entry-client.jsx`
- Recommendations: Plan an explicit split between the static marketing shell (can stay prerendered) and authenticated/tenant-specific views (must be client-fetched or server-rendered per-request with real auth, not part of the static build). This is an architectural decision the next milestone needs to make deliberately, not an incidental bug — flagging it because it's easy to accidentally keep prerendering "account" style routes.

**CSP and security headers are already strong and worth preserving:**
- Risk: N/A — this is a positive finding, but worth flagging as a constraint. `vercel.json:9-25` sets a strict CSP (`default-src 'self'; script-src 'self'; ... connect-src 'self'; frame-ancestors 'none'; object-src 'none'`), plus `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a `Permissions-Policy` that explicitly denies `payment=()`.
- Files: `vercel.json`
- Recommendations: When Stripe.js, Google Identity Services, and any OAuth/analytics scripts are added, `script-src 'self'` and `connect-src 'self'` will need deliberate, minimal allowlist additions (e.g., `https://js.stripe.com`, `https://accounts.google.com`) — do not weaken this to `'unsafe-inline'`/`*` wholesale. The current `payment=()` Permissions-Policy will also need revisiting once real Stripe Elements/Checkout is embedded (Stripe typically requires this permission delegated to its iframe origin).

**No secrets currently present in the repo:**
- Risk: Searched `src/`, `agents/`, `get-shit-done/`, and root config for API keys, tokens, and credential patterns — no live secrets, API keys, or credentials found committed anywhere. `.env*` files are absent from the working tree.
- Files: n/a (clean)
- Recommendations: Maintain this. Add `.env*` (except `.env.example`) to `.gitignore` proactively before any secret is ever created locally, and use Vercel's environment variable store for Stripe secret keys, Google OAuth client secret, and any session-signing secret — never hardcode or `VITE_`-prefix secret values.

## Performance Bottlenecks

None significant for current scope — this is a small static site (`src/` totals ~2,300 lines across ~15 files). No obvious bottlenecks in `src/lib/motion.js` (306 lines) or `src/routes/Home.jsx` (316 lines) beyond typical animation/DOM work, not reviewed line-by-line as it's out of scope for the concerns focus and not security/architecture-relevant.

## Fragile Areas

**`src/store.jsx` global context conflating UI state with future security state:**
- Files: `src/store.jsx`
- Why fragile: `AppProvider` mixes ephemeral UI state (`lightbox`, `flipFrom`) with what will need to become real entitlement/session state (`subscribed`, `plan`). If real auth is bolted onto this same context/provider without separating concerns, it's easy to accidentally treat client-side context state as a trust boundary again.
- Safe modification: Introduce a distinct `AuthProvider`/`useAuth()` (server-verified session, likely backed by an httpOnly cookie or similar) separate from this UI-only `AppProvider`, and have `AppProvider` consume auth state as read-only input rather than owning it.
- Test coverage: None (no test suite exists at all — see Tech Debt).

## Scaling Limits

Not applicable at current stage — no backend, database, or multi-tenant concept exists yet to evaluate for scaling limits. This will need fresh analysis once the SaaS/multi-tenant architecture is designed.

## Dependencies at Risk

None flagged. Dependency set is minimal and current: `react`/`react-dom` 18.3.1, `react-router-dom` 6.28.0, `vite` 5.4.11, `@vitejs/plugin-react` 4.3.4 (`package.json:14-21`). No deprecated or end-of-life packages identified.

## Missing Critical Features

**No auth, no server, no database, no payment processing:**
- Problem: Everything the next milestone needs (Google OAuth, multi-tenant SaaS, Stripe billing) is currently absent by design — this is a static, single-tenant prerendered site with zero backend.
- Blocks: Real user accounts, real entitlement enforcement, real billing, multi-tenant data isolation — all of it needs to be designed and built from scratch, not incrementally patched from `src/store.jsx`.

## Test Coverage Gaps

**Entire codebase untested:**
- What's not tested: Everything — no test framework installed, no test files present.
- Files: n/a
- Risk: Any refactor of `src/store.jsx` gating logic, `src/routes/Subscribe.jsx`/`Account.jsx` flows, or the prerender pipeline (`prerender.js`) during the auth/billing milestone has no safety net.
- Priority: High — establish a test framework before or in lockstep with the auth/billing milestone, prioritizing coverage of whatever replaces the client-side entitlement logic and any Stripe webhook handling.

---

*Concerns audit: 2026-09-08*
