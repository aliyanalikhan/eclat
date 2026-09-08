# External Integrations

**Analysis Date:** 2026-09-08

## Current State Summary

This codebase has **no external service integrations at runtime**. It is a static, prerendered React SPA with no server component. The only external network dependency is a font stylesheet loaded client-side. This document exists primarily to make the gap to the planned milestone (Google OAuth, multi-tenant SaaS, Stripe billing) explicit.

## APIs & External Services

**None integrated.**

- Google Fonts — `index.html` loads `https://fonts.googleapis.com/css2?family=Bodoni+Moda...&family=Archivo...&family=Archivo+Narrow...` via `<link rel="stylesheet">`, with `preconnect` hints to `fonts.googleapis.com` and `fonts.gstatic.com`. This is a static asset fetch (web fonts), not an API integration. Allowed explicitly in CSP `style-src`/`font-src` in `vercel.json` and `public/_headers`.
- No Stripe, no analytics SDK, no error tracking SDK, no CDN-hosted app dependencies (the legacy `Eclat.dc.html`/`support.js` prototype used unpkg-hosted React/Babel but is unused by the current build).

## Data Storage

**Databases:**
- None. No database client, connection string, or ORM anywhere in the repo.

**File Storage:**
- Local filesystem only, via the static `public/assets/images/` directory (see `public/assets/images/MANIFEST.md` referenced in `README.md`). Images are plain static files served by the host; no object storage service (S3, Cloudinary, etc.) is used.

**Caching:**
- None (application-level). Only HTTP cache headers for static assets, e.g. `Cache-Control: public, max-age=31536000, immutable` on `/assets/*` in `vercel.json`.

**Client-side persistence:**
- Browser `localStorage`, used exclusively by `src/store.jsx` under key `eclat:demo-state` to persist a demo `subscribed` boolean and `plan` string across reloads. This is UI-demo state only — not real subscription/session data, and not synced to any server.

## Authentication & Identity

**Auth Provider:**
- None. There is no login/session mechanism of any kind today. The `/account` and `/subscribe` routes (`src/routes/`) simulate a "subscribed" state via the `localStorage`-backed `AppContext` in `src/store.jsx` — no user identity, no credentials, no session tokens.
- **Planned:** Google OAuth is the target auth mechanism for the next milestone. Nothing in the current codebase (no OAuth client library, no callback route, no session/cookie handling, no JWT) provides a starting point — this will be built from scratch, likely requiring introduction of a server/API layer since OAuth token exchange cannot happen from a static-only site without either a backend or a BaaS (e.g., Supabase Auth, Auth0, Firebase Auth, NextAuth-style edge functions).

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Bugsnag, etc.)

**Logs:**
- None beyond browser console; no server exists to log to.

## CI/CD & Deployment

**Hosting:**
- Static hosting, host-agnostic by design. Documented supported hosts in `README.md`: Netlify, Cloudflare Pages, Vercel (`vercel.json` present with `cleanUrls`, security headers), GitHub Pages, nginx (manual `try_files` rewrite), S3+CloudFront (needs a viewer-request Lambda@Edge/CloudFront Function for directory-index rewriting).
- `vercel.json` is the only host-specific config file checked in, implying Vercel is the primary/intended deploy target, though the app is portable.

**CI Pipeline:**
- None detected — no `.github/workflows/`, no `.gitlab-ci.yml`, no other CI config found in the repo root.

## Environment Configuration

**Required env vars:**
- None. No `.env*` files exist, and no code in `src/` reads `import.meta.env.*` or `process.env.*` (confirmed no matches). `README.md` states explicitly: "No build-time secrets, no server, no database."
- Site URL is hardcoded in source (`src/data/seo-site.js` → `SITE.url`), not env-driven — flagged in README as a "before you go live" manual edit, along with `public/robots.txt`.

**Secrets location:**
- Not applicable — no secrets exist in the current system.

## Webhooks & Callbacks

**Incoming:**
- None (no server exists to receive webhooks — e.g., no Stripe webhook endpoint).

**Outgoing:**
- None.

## Content Security Policy (relevant to future integrations)

Both `vercel.json` and `public/_headers` currently enforce a strict CSP that will need explicit updates when integrations are added:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
object-src 'none';
upgrade-insecure-requests
```

`connect-src 'self'` and `script-src 'self'` currently block any client-side calls to Google OAuth endpoints or the Stripe.js SDK — both will require CSP additions (e.g., `https://accounts.google.com`, `https://js.stripe.com`, `https://api.stripe.com`) alongside whatever backend is introduced.

## Gap to Planned Milestone

To reach "Google OAuth + multi-tenant SaaS + Stripe billing with security," the following are entirely new additions, none of which exist today:

1. **A server/API layer** — currently 100% static output; OAuth token exchange and Stripe webhook handling require server-side code (framework choice, e.g., Vercel serverless functions given `vercel.json` is already present, or a standalone Node/Express API).
2. **A database** — for user accounts, tenant/organization records, and subscription state (currently faked via `localStorage`).
3. **Google OAuth client** — client ID/secret (env-managed secrets, currently unsupported since no `.env` handling exists), callback route, session/cookie or JWT strategy.
4. **Multi-tenancy model** — data scoping/isolation strategy; no concept of "tenant" or "organization" exists anywhere in current routes/data (`src/data/content.js`, `src/routes/`).
5. **Stripe integration** — Stripe SDK, webhook endpoint, checkout flow to replace the disabled demo `<fieldset>` in `/subscribe` (see `src/store.jsx` and the corresponding route component), and PCI-safe redirect to Stripe Checkout/Billing Portal as README already recommends.
6. **CSP updates** — loosen `connect-src`/`script-src`/`frame-src` in `vercel.json` and `public/_headers` to allow Google and Stripe domains.
7. **Secrets management** — introduce `.env` conventions and host-level secret storage (e.g., Vercel environment variables) since none exist today.

---

*Integration audit: 2026-09-08*
