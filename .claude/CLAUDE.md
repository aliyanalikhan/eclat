<!-- GSD:project-start source:PROJECT.md -->

## Project

**Éclat**

Éclat is a quarterly-style magazine and children's-book publishing site for the LaDidiér brand, currently built as a prerendered React SPA with no backend, no database, and no real accounts. This milestone turns it into a real subscriber product: readers sign in with Google, subscribe via Stripe, and get real per-user access to gated content — replacing the current client-side demo paywall (a `subscribed` flag in localStorage that anyone can flip in devtools).

**Core Value:** A signed-in subscriber's paid access is real and enforced server-side — no page, download, or API response leaks paid content to someone who hasn't actually paid for it.

### Constraints

- **Tech stack**: Must build on the existing Vite + React + React Router SPA rather than a rewrite in a different framework — the public site's design, routing, and content model stay as-is
- **Hosting**: Backend work should fit the existing Vercel deployment (`vercel.json` already present) — serverless/Edge functions plus a managed database, not a self-hosted server
- **Credentials**: Google OAuth client and Stripe API keys already exist and must be supplied via environment variables at implementation time — never invented, requested in chat, or committed to the repo
- **Security**: Standard best practice is the bar — server-side sessions, Stripe webhook signature verification, no secrets in client-shipped code, real per-request entitlement checks server-side (no client-trusted gating)
- **Billing products**: Reuse the 4 existing Stripe products/prices as-is rather than creating new ones

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- JavaScript (ES modules, JSX) — all of `src/`, `prerender.js`, `vite.config.js`, `verify-hero.mjs`
- HTML — `index.html` (Vite template), `Eclat.dc.html` (legacy single-file prototype, no longer read by the build)
- CSS — `src/styles/` (plain CSS, no preprocessor/CSS-in-JS detected)

## Runtime

- Node.js (version unpinned — no `.nvmrc`, no `engines` field in `package.json`)
- Browser target: `es2020` (set in `vite.config.js` build.target), browserslist `"defaults and supports es6-module"`
- npm (package-lock.json present, lockfile v-format standard npm)
- No `.npmrc` found

## Frameworks

- React 18.3.1 — UI library, `src/App.jsx`, `src/entry-client.jsx`, `src/entry-server.jsx`
- React DOM 18.3.1 — client hydration (`entry-client.jsx`) and SSR string rendering (`entry-server.jsx`, used only at build time by `prerender.js`)
- React Router DOM 6.28.0 — client-side routing, routes defined in `src/App.jsx`, matched against `src/routes/`
- None detected. No Jest/Vitest/Playwright config, no `*.test.*`/`*.spec.*` files, no test script in `package.json`.
- `verify-hero.mjs` is a manual/CI-style visual verification script (drives real Chrome via CDP, not a unit/integration test framework) — run manually per README instructions.
- Vite 5.4.11 — dev server and client/SSR bundler, config in `vite.config.js`
- @vitejs/plugin-react 4.3.4 — JSX/Fast Refresh support
- Custom Node script `prerender.js` — post-build step that renders every route to static HTML via the SSR bundle, injects per-route `<head>` metadata from `src/data/seo.js`, writes `dist/<route>/index.html`, generates `sitemap.xml`, then deletes the SSR bundle

## Key Dependencies

- `react-router-dom` 6.28.0 — defines the entire app's navigable surface (19 routes); any auth/tenant gating will hook into route definitions here
- None. There is no HTTP client library (no `axios`/`fetch` wrapper), no state-management library beyond React context (`src/store.jsx` — a single `AppContext` backed by `localStorage`), no ORM/DB client, no auth SDK.

## Configuration

- No environment variables in use. No `.env*` files exist in the repo (confirmed absent). README explicitly states "No build-time secrets, no server, no database."
- Site URL/domain configured in source at `src/data/seo-site.js` (`SITE.url`), not via env var — a "before you go live" TODO in `README.md`.
- `vite.config.js` — client/SSR build config, includes a custom `previewStaticSemantics` Vite plugin that makes `vite preview` emulate static-host directory-index/404 behavior
- `vercel.json` — Vercel deployment config: `cleanUrls`, security headers (CSP, X-Frame-Options, Permissions-Policy, Referrer-Policy), long-cache headers for `/assets/*`
- `public/_headers` — equivalent headers for Netlify/Cloudflare Pages hosting
- `.gitignore` — standard excludes (see file for details)

## Platform Requirements

- Node.js + npm
- `npm install` then `npm run dev` (Vite dev server on port 5173)
- Static file hosting only — output of `npm run build` is a plain `dist/` directory of prerendered HTML + hashed JS/CSS assets
- Deployment target requires directory-index rewriting (`/archive` → `/archive/index.html`); documented host support: Netlify, Cloudflare Pages, Vercel (`vercel.json` included), GitHub Pages, nginx (`try_files`), S3+CloudFront (needs a viewer-request function)
- No server runtime, no database, no container/orchestration config (no `Dockerfile`, no `docker-compose.yml`) detected

## Tooling / Non-App Directories

- `get-shit-done/` — vendored GSD (Get Shit Done) planning/workflow tooling (`bin/`, `contexts/`, `references/`, `templates/`, `workflows/`, `CHANGELOG.md`, `VERSION`). This is project-management tooling for the AI-assisted dev workflow, not an application dependency — it ships no runtime code consumed by `src/` or the Vite build.
- `.claude/`, `.planning/`, `.gsd-profile`, `gsd-file-manifest.json`, `gsd-install-state.json` — GSD/Claude Code workflow state and configuration, not part of the deployed app.
- `agents/` — present at repo root; not referenced by `vite.config.js` or `src/`, likely additional AI-tooling scaffolding rather than application code.
- `Eclat.dc.html` + `support.js` — legacy single-file prototype (fetched React/ReactDOM/Babel-standalone from CDN, transpiled in-browser). Kept for reference only; nothing in the current build reads them.

## Gap to Planned Milestone (Google OAuth, multi-tenant SaaS, Stripe billing)

- No server/API layer of any kind (no Express/Fastify/Next API routes/serverless functions)
- No auth library or SDK (no `next-auth`, `@auth0`, `firebase`, `supabase`, `passport`, etc.)
- No database client/ORM (no Prisma/Drizzle/Mongoose/pg/etc.)
- No Stripe SDK or any payment integration — `/subscribe` is a pure front-end demo (disabled card `<fieldset>`, no network request, "subscribed" state is a boolean in `localStorage`, see `src/store.jsx`)
- No environment/secrets management setup — introducing OAuth client secrets and Stripe API keys will require adding `.env` handling plus a real server runtime, since the current CSP (`vercel.json`, `public/_headers`) is locked to `connect-src 'self'` and `script-src 'self'` with no external API allowances
- README explicitly flags the payments gap: "If you want real payments, replace the step-2 form with a redirect to a hosted checkout so card details are never entered on this origin."

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Components and route pages: PascalCase, `.jsx` extension — `src/components/Lightbox.jsx`, `src/routes/Subscribe.jsx`
- Non-component modules (data, hooks, utilities): camelCase or lowercase, `.js` extension — `src/lib/useSeo.js`, `src/lib/motion.js`, `src/data/content.js`, `src/data/seo.js`, `src/data/seo-site.js`
- The global store is `src/store.jsx` (`.jsx` because it renders `<AppContext.Provider>`)
- Multi-word data files use hyphenation: `seo-site.js`
- Components: PascalCase, default-exported — `export default function Subscribe()`
- Hooks: camelCase prefixed with `use` — `useApp`, `useSeo`
- Helper/utility functions: camelCase, verb-first — `upsertMeta`, `upsertLink`, `readStored`, `runFlip`
- Event handlers defined inline in components: camelCase, verb-first, no `handle` prefix convention enforced — `completeDemo`, `onKey`, `openLightbox`, `closeLightbox`
- camelCase throughout (`subscribed`, `flipFrom`, `restoreTo`)
- Constants that are effectively static config: SCREAMING_SNAKE_CASE — `STORAGE_KEY`, `RENEWAL` in `src/routes/Subscribe.jsx`
- Data/config objects exported from `src/data/*.js`: UPPERCASE identifiers — `SITE`, `staticSeo`
- Plain JavaScript (JSX), no TypeScript, no PropTypes. No type-level naming conventions apply.

## Code Style

- No Prettier or `.prettierrc` config present in the repo — formatting is by convention/habit only, not tool-enforced.
- Observed style: 2-space indentation, no semicolons, single quotes for strings, trailing commas in multiline literals (`src/store.jsx`, `src/routes/Subscribe.jsx`).
- JSX: multi-line for anything with more than 1–2 attributes; inline `style={{ ... }}` objects are used liberally for one-off layout tweaks rather than CSS classes (e.g. `style={{ marginBottom: 18 }}` in `src/routes/Subscribe.jsx`).
- No ESLint config (`.eslintrc*`, `eslint.config.*`) present anywhere in the repo, and no `lint` script in `package.json`.
- **This means there is currently no automated code-quality gate.** Any new phase introducing security-sensitive code (auth, billing) should consider adding ESLint (or at minimum a `tsc --noEmit`/JSDoc type-check step) as part of that work, since nothing currently catches unused variables, unsafe patterns, or accidental `console.log` leaks before commit.

## Import Organization

- None configured in `vite.config.js`. All intra-`src` imports use relative paths (`../store.jsx`, `../lib/motion.js`). Explicit `.js`/`.jsx` extensions are always included in import specifiers.

## Error Handling

- `try/catch` is used defensively around browser storage APIs that can throw (private-mode `localStorage`), with silent recovery: `src/store.jsx` (`readStored`, persistence `useEffect`) — catches return `null` or no-op with a comment explaining why (`/* private mode / quota — the demo just won't persist */`).
- No centralized error boundary, no global error-reporting/monitoring hook exists anywhere in `src/`.
- Context misuse is guarded with a thrown `Error` at the hook boundary: `useApp()` in `src/store.jsx` throws `'useApp must be used inside <AppProvider>'` if called outside the provider — this is the only explicit `throw` pattern in the codebase.
- Image load failures are handled inline via `onError` handlers that hide the broken element rather than showing a fallback UI: `src/components/Lightbox.jsx`.
- **No async network error handling exists anywhere** — the app currently makes no real network requests (subscribe/payment flows are explicitly simulated, see `src/routes/Subscribe.jsx`). Any future auth/billing phase introducing real API calls will need to establish this pattern from scratch (loading/error states, retry, user-facing error messaging).

## Logging

- No established logging convention. Errors are currently swallowed (see Error Handling) rather than logged.

## Comments

- Comments are used sparingly but purposefully to explain *why*, not *what* — especially around demo/prototype limitations and intentional design decisions. Examples:
- This "demo-only, no real network/payment activity" comment pattern is load-bearing context: multiple files explicitly flag that auth/subscription state is fake and locally persisted only. Any future real-auth/billing phase must locate and remove/replace every one of these comments and their associated fake logic (search `demo` across `src/`).
- Used selectively on components/hooks whose behavior needs explanation beyond the code itself (not on every function): `src/components/Lightbox.jsx` and `src/lib/useSeo.js` both open with a `/** ... */` block describing intent and behavior. Simple presentational components (`Header`, `Footer`, `Cover`) do not have JSDoc.

## Function Design

## Module Design

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App shell | Route table, header/footer/lightbox chrome, scroll reset | `src/App.jsx` |
| Client entry | Hydrates prerendered HTML or mounts fresh in dev | `src/entry-client.jsx` |
| SSR entry | `render(url)` used only at build time by prerender.js | `src/entry-server.jsx` |
| Prerender script | Renders every route to static HTML + sitemap at build time | `prerender.js` |
| Content source of truth | All editions/books/writings/samples/invoices/site data | `src/data/content.js` |
| SEO metadata | Per-route `<head>` tags + JSON-LD, consumed at build and at runtime | `src/data/seo.js`, `src/data/seo-site.js` |
| UI/session state store | React Context: subscribed flag, plan, lightbox state | `src/store.jsx` |
| Runtime head sync | Keeps `<head>` correct on client-side route changes | `src/lib/useSeo.js` |
| FLIP/drag animation helpers | Shared motion utilities (cover FLIP-in, drag-scroll strip) | `src/lib/motion.js` |
| Route: landing page | `src/routes/Home.jsx` |
| Route: full archive list | `src/routes/Archive.jsx` |
| Route: single edition + paywall | `src/routes/Edition.jsx` |
| Route: children's books | `src/routes/Books.jsx` |
| Route: essays/reportage | `src/routes/Writings.jsx` |
| Route: fake checkout flow | `src/routes/Subscribe.jsx` |
| Route: fake account/billing | `src/routes/Account.jsx` |
| Route: 404 | `src/routes/NotFound.jsx` |
| Image slot w/ tint fallback | `src/components/Cover.jsx` |
| Global chrome | `src/components/Header.jsx`, `src/components/Footer.jsx` |
| Zoom overlay for preview pages | `src/components/Lightbox.jsx` |

## Pattern Overview

- Single content module (`src/data/content.js`) is the entire "database" — plain exported JS arrays/objects, imported directly by route components
- No `fetch`/`axios`/API client anywhere in `src/`
- No authentication — `subscribed` is a `useState` boolean in a Context provider, not a session
- No environment variables, no secrets, no server runtime dependency
- Routing is standard `react-router-dom` `<Routes>`/`<Route>`, rendered once server-side per route at build time and once client-side on hydration
- SEO handled twice by design: statically baked into HTML at build time (`prerender.js` + `src/data/seo.js`) for the first paint/crawlers, and re-applied via `useEffect` (`src/lib/useSeo.js`) for in-app client-side navigations after hydration

## Layers

- Purpose: single source of truth for all editorial content and site metadata
- Location: `src/data/content.js` (editions, books, writings, samples, invoices, SITE), `src/data/seo.js` (per-route metadata + JSON-LD), `src/data/seo-site.js` (base SITE constant)
- Contains: plain JS arrays/objects, no classes, no fetch
- Depends on: nothing
- Used by: every route component, `prerender.js` (for `allRoutes()`/sitemap), `src/lib/useSeo.js` indirectly via SITE
- Purpose: page-level composition — reads from the data layer, reads/writes UI state from the store, renders markup
- Location: `src/routes/*.jsx`
- Contains: one component per route, colocated `useSeo()` call, direct imports of `content.js` arrays
- Depends on: data layer, store, shared components, `src/lib/motion.js`
- Used by: `src/App.jsx` route table
- Purpose: reusable UI primitives (image slot, chrome, lightbox)
- Location: `src/components/*.jsx`
- Depends on: store (`useApp`) for lightbox/flip state where relevant
- Used by: routes and `App.jsx`
- Purpose: cross-page UI state that must survive navigation (fake subscription, active plan, lightbox open/closed, FLIP animation origin rect)
- Location: `src/store.jsx` (`AppProvider`/`useApp`, React Context + `useState`, persisted to `localStorage`)
- Depends on: `window.localStorage` (guarded for SSR — `typeof window === 'undefined'` checks)
- Used by: nearly every route, `Header.jsx`, `Lightbox.jsx`
- Purpose: turns the SPA into prerendered static HTML with correct per-route `<head>` and a sitemap
- Location: `prerender.js`, `src/entry-server.jsx`, `vite.config.js`
- Depends on: `dist/server/entry-server.js` (SSR bundle, deleted after use), `src/data/seo.js`

## Data Flow

### Primary Request Path (production, static host)

### Client-side navigation (post-hydration)

### Fake "subscribe" flow

## Key Abstractions

- Purpose: represents a single publishable unit with editorial metadata + a `tint` CSS fallback color used before real cover art is supplied
- Examples: `src/data/content.js:18-61` (editions), `:63-86` (books), `:88-` (writings)
- Pattern: plain object literal, `.map()`-derived `img` path convention (`/assets/images/<category>/<slug>.jpg`)
- Purpose: renders an image with a tinted CSS fallback so missing photography degrades gracefully instead of showing a broken image icon
- Location: `src/components/Cover.jsx`
- Pattern: `idle | loaded | failed` local state machine driven by `onLoad`/`onError`, `--tint` CSS custom property painted under the `<img>`
- Purpose: single global Context for all cross-page UI state
- Location: `src/store.jsx`
- Pattern: Context + `useState`, memoized value object, `gate(label)` helper that returns `'Included'` when subscribed or a tier-specific label otherwise — used throughout routes to render paywalled labels
- Purpose: imperative DOM head-tag sync for client-side navigation
- Location: `src/lib/useSeo.js`
- Pattern: `upsertMeta`/`upsertLink` helpers that find-or-create `<meta>`/`<link>` elements directly via `document.head.querySelector`

## Entry Points

- Location: `src/entry-client.jsx`
- Triggers: loaded by `index.html` in the browser
- Responsibilities: hydrate prerendered DOM in production, or mount fresh in dev (`vite dev` has no prerendered markup)
- Location: `src/entry-server.jsx`
- Triggers: imported only by `prerender.js` at build time, never shipped to the browser
- Responsibilities: exports `render(url)` — a pure `renderToString()` call used once per route during the build
- Location: `prerender.js` (repo root)
- Triggers: `npm run build` (step 3, after `vite build` and `vite build --ssr`)
- Responsibilities: renders every route from `src/data/seo.js` `allRoutes()`, injects head tags, writes static HTML files + `sitemap.xml`, deletes the SSR bundle

## Architectural Constraints

- **Threading:** Single-threaded Node build script (`prerender.js`) runs sequentially over routes; no concurrency concerns. Browser runtime is standard single-threaded React.
- **Global state:** `src/store.jsx` `AppProvider` is the one app-wide singleton; it is provider-scoped (mounted once in `entry-client.jsx`/`entry-server.jsx`), not a true module-level global. `localStorage` key `eclat:demo-state` is the only persisted global state.
- **No environment/config layer:** No `.env` usage detected in `src/` — `SITE` constants are hard-coded in `src/data/seo-site.js` and extended in `src/data/content.js`.
- **No API/data-fetching layer:** All content is compile-time-bundled; there is no `fetch`, no client for any external service, no loading/error states for data (everything is synchronous).
- **CSP is script-src 'self' only** (`vercel.json:24`) — any future third-party script (Stripe.js, Google OAuth SDK, analytics) will need this CSP updated or it will be silently blocked.
- **Route list must stay in three places in sync:** `src/App.jsx` (`<Routes>`), `src/data/seo.js` (`staticSeo` + `allRoutes()`), and implicitly `prerender.js` (which iterates `allRoutes()`). Adding a route without updating `seo.js` means it will render client-side but never get a prerendered HTML file or sitemap entry.

## Anti-Patterns

### Client-side-only "auth"/entitlement flag

### Content and code are the same deployable artifact

## Error Handling

- Defensive `try/catch` around all `localStorage` access (`src/store.jsx:9-15`, `32-37`)
- Component-level fallback rendering (`<NotFound />` returned directly from `Edition.jsx:33`) rather than route-level error boundaries — no `ErrorBoundary` component exists in the codebase

## Cross-Cutting Concerns

## What Must Change for Google OAuth + Multi-Tenant SaaS + Stripe Billing

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
