<!-- refreshed: 2026-09-08 -->
# Architecture

**Analysis Date:** 2026-09-08

## System Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│  BUILD TIME (Node, `npm run build`)                              │
│                                                                    │
│  1. vite build              → dist/          (client bundle)     │
│  2. vite build --ssr        → dist/server/   (SSR render fn)     │
│     `src/entry-server.jsx`                                       │
│  3. `prerender.js`          → walks src/data/seo.js allRoutes(), │
│                                calls render(path) per route,      │
│                                writes dist/<route>/index.html,    │
│                                dist/sitemap.xml, deletes           │
│                                dist/server (build artifact only)  │
└───────────────────────────────┬───────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATIC HOST (Vercel — `vercel.json`)                             │
│  Serves dist/ as plain files. No server code runs per-request.   │
│  Security headers + CSP set at the CDN edge via vercel.json.     │
└───────────────────────────────┬───────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER — first paint                                            │
│  Prerendered HTML for the requested route is served immediately  │
│  (real markup, real <title>/meta, real JSON-LD — indexable).     │
└───────────────────────────────┬───────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER — hydration (`src/entry-client.jsx`)                     │
│  hydrateRoot() attaches React to the existing DOM. From here on  │
│  it behaves as a normal client-side SPA (React Router client-    │
│  side navigation, no further network fetches for content).       │
└───────────────────────────────┬───────────────────────────────────┘
                                 ▼
┌───────────────────────┬───────────────────────────────────────────┐
│ STATIC CONTENT SOURCE  │  CLIENT-ONLY UI STATE                    │
│ `src/data/content.js`  │  `src/store.jsx` (React Context)         │
│ Hard-coded JS arrays:  │  - subscribed (bool), plan, lightbox,    │
│ editions, books,       │    flipFrom                              │
│ writings, samples,     │  - Persisted to `window.localStorage`    │
│ invoices, SITE         │    under key `eclat:demo-state`          │
│ Imported directly by   │  - No network calls, no server, no auth  │
│ route components —     │  - `subscribed` fakes a paywall unlock   │
│ no fetch, no API layer │    entirely client-side                  │
└───────────────────────┴───────────────────────────────────────────┘
```

**There is no backend today.** No server process handles requests at runtime, no database, no API routes, no auth. "Subscribing" in `src/routes/Subscribe.jsx` is a UI demo: it flips `subscribed` to `true` in React Context and persists it to `localStorage` — no payment provider, no network request, no server-side entitlement check. Anyone can flip this flag from devtools; there is no real access control.

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

**Overall:** Prerendered single-page application (SSG-via-SSR-at-build-time), not a traditional server-rendered app and not a pure CSR SPA. Content is compiled into the JS bundle at build time — there is no runtime data-fetching layer of any kind.

**Key Characteristics:**
- Single content module (`src/data/content.js`) is the entire "database" — plain exported JS arrays/objects, imported directly by route components
- No `fetch`/`axios`/API client anywhere in `src/`
- No authentication — `subscribed` is a `useState` boolean in a Context provider, not a session
- No environment variables, no secrets, no server runtime dependency
- Routing is standard `react-router-dom` `<Routes>`/`<Route>`, rendered once server-side per route at build time and once client-side on hydration
- SEO handled twice by design: statically baked into HTML at build time (`prerender.js` + `src/data/seo.js`) for the first paint/crawlers, and re-applied via `useEffect` (`src/lib/useSeo.js`) for in-app client-side navigations after hydration

## Layers

**Data layer (static):**
- Purpose: single source of truth for all editorial content and site metadata
- Location: `src/data/content.js` (editions, books, writings, samples, invoices, SITE), `src/data/seo.js` (per-route metadata + JSON-LD), `src/data/seo-site.js` (base SITE constant)
- Contains: plain JS arrays/objects, no classes, no fetch
- Depends on: nothing
- Used by: every route component, `prerender.js` (for `allRoutes()`/sitemap), `src/lib/useSeo.js` indirectly via SITE

**Presentation layer (routes):**
- Purpose: page-level composition — reads from the data layer, reads/writes UI state from the store, renders markup
- Location: `src/routes/*.jsx`
- Contains: one component per route, colocated `useSeo()` call, direct imports of `content.js` arrays
- Depends on: data layer, store, shared components, `src/lib/motion.js`
- Used by: `src/App.jsx` route table

**Shared components layer:**
- Purpose: reusable UI primitives (image slot, chrome, lightbox)
- Location: `src/components/*.jsx`
- Depends on: store (`useApp`) for lightbox/flip state where relevant
- Used by: routes and `App.jsx`

**Client state layer:**
- Purpose: cross-page UI state that must survive navigation (fake subscription, active plan, lightbox open/closed, FLIP animation origin rect)
- Location: `src/store.jsx` (`AppProvider`/`useApp`, React Context + `useState`, persisted to `localStorage`)
- Depends on: `window.localStorage` (guarded for SSR — `typeof window === 'undefined'` checks)
- Used by: nearly every route, `Header.jsx`, `Lightbox.jsx`

**Build/infra layer:**
- Purpose: turns the SPA into prerendered static HTML with correct per-route `<head>` and a sitemap
- Location: `prerender.js`, `src/entry-server.jsx`, `vite.config.js`
- Depends on: `dist/server/entry-server.js` (SSR bundle, deleted after use), `src/data/seo.js`

## Data Flow

### Primary Request Path (production, static host)

1. Browser requests `/editions/2` → Vercel serves the prerendered `dist/editions/2/index.html` directly (`prerender.js:74-91`)
2. HTML already contains full head tags (title, description, OG, canonical, JSON-LD) baked in by `headFor()` (`prerender.js:25-49`) and the fully rendered article markup from `renderToString()` (`src/entry-server.jsx:8-14`)
3. `src/entry-client.jsx:21-25` detects `data-prerendered="true"` on `#root` and calls `hydrateRoot()` instead of a fresh `createRoot().render()`
4. On hydration, `src/routes/Edition.jsx` reads its data via `editionByNo(no)` from `src/data/content.js`, and its UI-gating state (`subscribed`) via `useApp()` from `src/store.jsx`
5. `useSeo()` (`src/lib/useSeo.js`) runs a no-op-equivalent re-application of the same head tags (idempotent — keeps head correct for subsequent client-side nav)

### Client-side navigation (post-hydration)

1. User clicks a `<Link>` → `react-router-dom` swaps the matched route component, no network request for content
2. New route component pulls its content synchronously from the in-bundle `src/data/content.js` arrays
3. `useSeo()` updates `document.title` and meta tags via direct DOM mutation (`src/lib/useSeo.js:32-70`)
4. `ScrollToTop` (`src/App.jsx:17-23`) resets scroll on pathname change

### Fake "subscribe" flow

1. `src/routes/Subscribe.jsx` — two-step wizard (`plan` → `pay` → `done`), all local `useState`
2. On submit, `completeDemo()` calls `setSubscribed(true)` from `useApp()` — no network call, disabled/no-op payment fields (`Subscribe.jsx:20-27`, `98-105` demo notice)
3. `src/store.jsx:32-38` persists `{ subscribed, plan }` to `localStorage` under `eclat:demo-state`
4. Every gated route (`Edition.jsx`, `Account.jsx`) reads `subscribed` from `useApp()` to decide what to render — this is a client-side-only flag with zero server enforcement

**State Management:**
All mutable UI state lives in one React Context (`src/store.jsx`): `subscribed`, `plan`, `lightbox`, `flipFrom`. No Redux/Zustand/external state library. State persists across reloads only via `localStorage`, not via any server-side session.

## Key Abstractions

**Content record shape (editions/books/writings):**
- Purpose: represents a single publishable unit with editorial metadata + a `tint` CSS fallback color used before real cover art is supplied
- Examples: `src/data/content.js:18-61` (editions), `:63-86` (books), `:88-` (writings)
- Pattern: plain object literal, `.map()`-derived `img` path convention (`/assets/images/<category>/<slug>.jpg`)

**`<Cover>` image slot:**
- Purpose: renders an image with a tinted CSS fallback so missing photography degrades gracefully instead of showing a broken image icon
- Location: `src/components/Cover.jsx`
- Pattern: `idle | loaded | failed` local state machine driven by `onLoad`/`onError`, `--tint` CSS custom property painted under the `<img>`

**`AppProvider` / `useApp()`:**
- Purpose: single global Context for all cross-page UI state
- Location: `src/store.jsx`
- Pattern: Context + `useState`, memoized value object, `gate(label)` helper that returns `'Included'` when subscribed or a tier-specific label otherwise — used throughout routes to render paywalled labels

**`useSeo()` hook:**
- Purpose: imperative DOM head-tag sync for client-side navigation
- Location: `src/lib/useSeo.js`
- Pattern: `upsertMeta`/`upsertLink` helpers that find-or-create `<meta>`/`<link>` elements directly via `document.head.querySelector`

## Entry Points

**`src/entry-client.jsx`:**
- Location: `src/entry-client.jsx`
- Triggers: loaded by `index.html` in the browser
- Responsibilities: hydrate prerendered DOM in production, or mount fresh in dev (`vite dev` has no prerendered markup)

**`src/entry-server.jsx`:**
- Location: `src/entry-server.jsx`
- Triggers: imported only by `prerender.js` at build time, never shipped to the browser
- Responsibilities: exports `render(url)` — a pure `renderToString()` call used once per route during the build

**`prerender.js`:**
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

**What happens:** `subscribed` in `src/store.jsx` is a plain `useState(false)` gating access to full article content (`src/routes/Edition.jsx:121`) and billing history (`src/routes/Account.jsx:18`).
**Why it's wrong:** Any user can set this to `true` via devtools/localStorage edit and see "subscriber" content that the code intends to gate — there is no server enforcing it. This is explicitly a UI demo (commented as such) but will need full replacement before it means anything security-wise.
**Do this instead:** When a backend is introduced, entitlement/subscription status must be resolved server-side (session/JWT + DB lookup), and paywalled content itself (not just its rendering) must not ship to unauthenticated clients — currently the full `excerpt` array ships in `content.js` regardless of subscription state, so the "paywall" is CSS/JS visual truncation only (see `Edition.jsx:133-148`, `.prose__blur`), not a real content boundary.

### Content and code are the same deployable artifact

**What happens:** All editorial content lives in `src/data/content.js`, compiled into the JS bundle and baked into static HTML at build time.
**Why it's wrong:** There is no way to add/edit an edition, book, or writing without a code change + full rebuild + redeploy. This is fine for a static magazine site but is incompatible with any multi-tenant/user-generated-content model.
**Do this instead:** Introducing a backend means extracting `content.js` into a real data store (DB) behind an API, with `prerender.js`/route components fetching from it (build-time for public marketing pages is still viable via ISR/on-demand revalidation; per-tenant/user data must move to true runtime fetching).

## Error Handling

**Strategy:** Minimal — this is a content site with no mutations beyond local UI state, so there is little to fail. `Cover.jsx` handles image load failure gracefully (falls back to tint). `Edition.jsx` renders `<NotFound />` inline when `editionByNo(no)` returns nothing. `store.jsx` wraps `localStorage` reads/writes in `try/catch` (private browsing / quota).

**Patterns:**
- Defensive `try/catch` around all `localStorage` access (`src/store.jsx:9-15`, `32-37`)
- Component-level fallback rendering (`<NotFound />` returned directly from `Edition.jsx:33`) rather than route-level error boundaries — no `ErrorBoundary` component exists in the codebase

## Cross-Cutting Concerns

**Logging:** None. No logging library, no `console.log` calls found in `src/` route/component code beyond `prerender.js`'s build-time `console.log` progress output.

**Validation:** None at runtime — no forms submit real data. `Subscribe.jsx`'s payment fields are `disabled` and never read (`Subscribe.jsx:107-127`).

**Authentication:** None. No login, no session, no user identity concept anywhere in the codebase. `Account.jsx` is a static demo page keyed entirely off the client-only `subscribed`/`plan` state.

**SEO/Head management:** Dual-path by design — build-time baked (`prerender.js` + `src/data/seo.js`) for first paint/crawlers, runtime-synced (`src/lib/useSeo.js`) for client-side nav. Any future route must be added to both `src/App.jsx` and `src/data/seo.js` `staticSeo`/`allRoutes()`.

## What Must Change for Google OAuth + Multi-Tenant SaaS + Stripe Billing

This section exists to orient a future phase planner, not as a proposal to implement now.

1. **A real backend/API layer must be introduced.** There is currently zero server code that runs per-request — `prerender.js` runs only at build time and its output (`dist/server`) is deleted before deploy. OAuth callbacks, Stripe webhooks, and tenant-scoped data reads/writes all require a live server process (or serverless functions) — this repo currently has none, not even a `/api` directory.
2. **`src/data/content.js` must move from bundled static data to a real datastore.** Multi-tenancy implies per-tenant editions/books/writings, which cannot be compiled into a shared JS bundle. This is the single biggest architectural shift — every route component's direct `import { editions } from '../data/content.js'` pattern will need to become a data-fetching call against a tenant-scoped API/DB.
3. **`src/store.jsx`'s `subscribed` flag must be replaced with real session/auth state.** Google OAuth introduces an actual identity; Stripe billing introduces a real subscription record. The existing `useState` + `localStorage` pattern is a placeholder to delete, not extend — real entitlement checks belong server-side, gating actual data delivery (not just UI rendering as today).
4. **The static-host deployment model (`vercel.json` + prerendered `dist/`) needs to coexist with dynamic routes.** Marketing/public pages (`/`, `/archive`, `/writings`) can likely stay prerendered/ISR; anything tenant- or user-specific (`/account`, per-tenant dashboards) needs to become genuinely dynamic (SSR-per-request or CSR-with-API), which the current build pipeline (prerender-once-at-build) does not support.
5. **CSP in `vercel.json` (`script-src 'self'`) will block Google OAuth and Stripe.js scripts** until explicitly allowlisted (`accounts.google.com`, `js.stripe.com`, etc.) — flagged here so it isn't a silent runtime blocker during that phase.
6. **No environment/secrets handling exists yet** — introducing OAuth client secrets and Stripe API keys requires adding an env-var convention and a place to keep them server-side only (never in `src/`, which ships to the client bundle in full).

---

*Architecture analysis: 2026-09-08*
