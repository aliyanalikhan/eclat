# Technology Stack

**Analysis Date:** 2026-09-08

## Languages

**Primary:**
- JavaScript (ES modules, JSX) — all of `src/`, `prerender.js`, `vite.config.js`, `verify-hero.mjs`

**Secondary:**
- HTML — `index.html` (Vite template), `Eclat.dc.html` (legacy single-file prototype, no longer read by the build)
- CSS — `src/styles/` (plain CSS, no preprocessor/CSS-in-JS detected)

No TypeScript is used anywhere in `src/` — no `.ts`/`.tsx` files, no `tsconfig.json`.

## Runtime

**Environment:**
- Node.js (version unpinned — no `.nvmrc`, no `engines` field in `package.json`)
- Browser target: `es2020` (set in `vite.config.js` build.target), browserslist `"defaults and supports es6-module"`

**Package Manager:**
- npm (package-lock.json present, lockfile v-format standard npm)
- No `.npmrc` found

## Frameworks

**Core:**
- React 18.3.1 — UI library, `src/App.jsx`, `src/entry-client.jsx`, `src/entry-server.jsx`
- React DOM 18.3.1 — client hydration (`entry-client.jsx`) and SSR string rendering (`entry-server.jsx`, used only at build time by `prerender.js`)
- React Router DOM 6.28.0 — client-side routing, routes defined in `src/App.jsx`, matched against `src/routes/`

**Testing:**
- None detected. No Jest/Vitest/Playwright config, no `*.test.*`/`*.spec.*` files, no test script in `package.json`.
- `verify-hero.mjs` is a manual/CI-style visual verification script (drives real Chrome via CDP, not a unit/integration test framework) — run manually per README instructions.

**Build/Dev:**
- Vite 5.4.11 — dev server and client/SSR bundler, config in `vite.config.js`
- @vitejs/plugin-react 4.3.4 — JSX/Fast Refresh support
- Custom Node script `prerender.js` — post-build step that renders every route to static HTML via the SSR bundle, injects per-route `<head>` metadata from `src/data/seo.js`, writes `dist/<route>/index.html`, generates `sitemap.xml`, then deletes the SSR bundle

## Key Dependencies

**Critical:**
- `react-router-dom` 6.28.0 — defines the entire app's navigable surface (19 routes); any auth/tenant gating will hook into route definitions here

**Infrastructure:**
- None. There is no HTTP client library (no `axios`/`fetch` wrapper), no state-management library beyond React context (`src/store.jsx` — a single `AppContext` backed by `localStorage`), no ORM/DB client, no auth SDK.

## Configuration

**Environment:**
- No environment variables in use. No `.env*` files exist in the repo (confirmed absent). README explicitly states "No build-time secrets, no server, no database."
- Site URL/domain configured in source at `src/data/seo-site.js` (`SITE.url`), not via env var — a "before you go live" TODO in `README.md`.

**Build:**
- `vite.config.js` — client/SSR build config, includes a custom `previewStaticSemantics` Vite plugin that makes `vite preview` emulate static-host directory-index/404 behavior
- `vercel.json` — Vercel deployment config: `cleanUrls`, security headers (CSP, X-Frame-Options, Permissions-Policy, Referrer-Policy), long-cache headers for `/assets/*`
- `public/_headers` — equivalent headers for Netlify/Cloudflare Pages hosting
- `.gitignore` — standard excludes (see file for details)

## Platform Requirements

**Development:**
- Node.js + npm
- `npm install` then `npm run dev` (Vite dev server on port 5173)

**Production:**
- Static file hosting only — output of `npm run build` is a plain `dist/` directory of prerendered HTML + hashed JS/CSS assets
- Deployment target requires directory-index rewriting (`/archive` → `/archive/index.html`); documented host support: Netlify, Cloudflare Pages, Vercel (`vercel.json` included), GitHub Pages, nginx (`try_files`), S3+CloudFront (needs a viewer-request function)
- No server runtime, no database, no container/orchestration config (no `Dockerfile`, no `docker-compose.yml`) detected

## Tooling / Non-App Directories

- `get-shit-done/` — vendored GSD (Get Shit Done) planning/workflow tooling (`bin/`, `contexts/`, `references/`, `templates/`, `workflows/`, `CHANGELOG.md`, `VERSION`). This is project-management tooling for the AI-assisted dev workflow, not an application dependency — it ships no runtime code consumed by `src/` or the Vite build.
- `.claude/`, `.planning/`, `.gsd-profile`, `gsd-file-manifest.json`, `gsd-install-state.json` — GSD/Claude Code workflow state and configuration, not part of the deployed app.
- `agents/` — present at repo root; not referenced by `vite.config.js` or `src/`, likely additional AI-tooling scaffolding rather than application code.
- `Eclat.dc.html` + `support.js` — legacy single-file prototype (fetched React/ReactDOM/Babel-standalone from CDN, transpiled in-browser). Kept for reference only; nothing in the current build reads them.

## Gap to Planned Milestone (Google OAuth, multi-tenant SaaS, Stripe billing)

Today's stack has **no backend, no database, no auth, no payment processing** — everything below will be net-new:

- No server/API layer of any kind (no Express/Fastify/Next API routes/serverless functions)
- No auth library or SDK (no `next-auth`, `@auth0`, `firebase`, `supabase`, `passport`, etc.)
- No database client/ORM (no Prisma/Drizzle/Mongoose/pg/etc.)
- No Stripe SDK or any payment integration — `/subscribe` is a pure front-end demo (disabled card `<fieldset>`, no network request, "subscribed" state is a boolean in `localStorage`, see `src/store.jsx`)
- No environment/secrets management setup — introducing OAuth client secrets and Stripe API keys will require adding `.env` handling plus a real server runtime, since the current CSP (`vercel.json`, `public/_headers`) is locked to `connect-src 'self'` and `script-src 'self'` with no external API allowances
- README explicitly flags the payments gap: "If you want real payments, replace the step-2 form with a redirect to a hosted checkout so card details are never entered on this origin."

---

*Stack analysis: 2026-09-08*
