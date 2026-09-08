# Codebase Structure

**Analysis Date:** 2026-09-08

## Directory Layout

```
Éclat/
├── src/
│   ├── components/       # Reusable UI: Cover, Header, Footer, Lightbox
│   ├── data/              # Static content source of truth + SEO metadata
│   ├── lib/                # Framework-agnostic helpers (useSeo hook, motion/FLIP utils)
│   ├── routes/            # One component per top-level route
│   ├── styles/             # Single global stylesheet
│   ├── App.jsx             # Route table + global chrome composition
│   ├── entry-client.jsx    # Browser entry — hydrate or mount
│   ├── entry-server.jsx    # Build-time SSR entry (render() used by prerender.js only)
│   └── store.jsx           # App-wide React Context (UI/session-like state)
├── public/
│   ├── assets/images/      # Static images, organized by content category
│   │   ├── books/, covers/, features/, og/, samples/, writings/
│   │   └── MANIFEST.md     # List of expected image files (some slots intentionally empty)
│   ├── _headers, favicon.svg, robots.txt, site.webmanifest
├── dist/                   # Build output (prerendered static site) — generated, not committed source
├── get-shit-done/          # GSD tooling (workflow framework, not app code)
├── .planning/               # GSD planning artifacts (this document lives here)
├── prerender.js             # Build step 3 — renders every route to static HTML + sitemap.xml
├── vite.config.js           # Vite build config + custom preview-server static-file semantics
├── vercel.json               # Static hosting config: headers, CSP, clean URLs
├── index.html                 # HTML template with `<!--app-head-->` / `<!--app-html-->` injection points
└── package.json
```

## Directory Purposes

**`src/components/`:**
- Purpose: shared, route-agnostic UI pieces
- Contains: `Cover.jsx` (image slot with tint fallback), `Header.jsx`, `Footer.jsx`, `Lightbox.jsx` (zoom overlay)
- Key files: `src/components/Cover.jsx` — the single reusable image component used by every route that shows a cover/sample image

**`src/data/`:**
- Purpose: the entire "content database" of the site — hard-coded JS, no fetch, no DB
- Contains: `content.js` (editions, books, writings, samples, invoices, SITE — full data), `seo.js` (per-route `<head>` metadata + JSON-LD builders + `allRoutes()`), `seo-site.js` (base `SITE` constant: name, url, locale, tagline)
- Key files: `src/data/content.js` is the file to edit for any content change; `src/data/seo.js` must be updated whenever a route is added/removed

**`src/lib/`:**
- Purpose: small framework-adjacent utilities, not tied to a specific route
- Contains: `useSeo.js` (runtime `<head>` sync hook), `motion.js` (FLIP animation + drag-scroll helpers, 306 lines — largest lib file)

**`src/routes/`:**
- Purpose: one file per top-level page, matches routes registered in `src/App.jsx`
- Contains: `Home.jsx` (316 lines, largest route), `Archive.jsx`, `Edition.jsx` (201 lines, dynamic `/editions/:no`), `Books.jsx`, `Writings.jsx`, `Subscribe.jsx` (192 lines, fake checkout wizard), `Account.jsx` (fake billing/account page), `NotFound.jsx`

**`src/styles/`:**
- Purpose: single global stylesheet, no CSS-in-JS, no CSS modules
- Contains: `eclat.css`, imported once in `src/App.jsx`

**`public/assets/images/`:**
- Purpose: static image assets referenced by path convention from `src/data/content.js` (e.g. `/assets/images/covers/no-1-eclat-vol-1.jpg`)
- Contains: subdirectories per content category (`books/`, `covers/`, `features/`, `og/`, `samples/no-48/`, `writings/`); several contain only `.gitkeep` — slots intentionally awaiting real photography, rendered as CSS `tint` fallback until filled
- Key files: `public/assets/images/MANIFEST.md` documents which files are expected at which paths

**`dist/`:**
- Purpose: build output only — prerendered static HTML per route, client JS/CSS bundle, `sitemap.xml`
- Generated: yes, by `npm run build` (`vite build` + `vite build --ssr` + `node prerender.js`)
- Committed: not part of source review scope — treat as disposable build artifact

**`get-shit-done/`:**
- Purpose: GSD workflow tooling (this agent framework's own files) — not part of the Éclat application
- Contains: workflow definitions, templates, references used by `/gsd-*` commands

## Key File Locations

**Entry Points:**
- `src/entry-client.jsx`: browser hydration/mount entry, loaded via `index.html`
- `src/entry-server.jsx`: build-time-only SSR render function, consumed by `prerender.js`
- `prerender.js`: orchestrates the third build step — turns SSR output into static HTML files

**Configuration:**
- `vite.config.js`: build target, chunking (`vendor` split), dev/preview server behavior
- `vercel.json`: hosting config — headers, CSP, clean URLs, cache-control for `/assets/*`
- `package.json`: scripts (`dev`, `build`, `build:client`, `preview`, `serve`) and the full dependency list (React 18.3.1, react-router-dom 6.28.0, Vite 5.4.11 — no other runtime deps)

**Core Logic:**
- `src/data/content.js`: content source of truth
- `src/data/seo.js`: route registry for SEO/prerendering (`allRoutes()` — the canonical list of prerenderable paths)
- `src/store.jsx`: the one app-wide state container
- `src/App.jsx`: the one route table (React Router `<Routes>`)

**Testing:**
- Not applicable — no test framework, test files, or test scripts are present anywhere in the repo (no `*.test.*`/`*.spec.*` files, no `jest`/`vitest` config, no test script in `package.json`)

## Naming Conventions

**Files:**
- Route components: PascalCase matching the page name, one per route, e.g. `Edition.jsx`, `Subscribe.jsx`, `NotFound.jsx` in `src/routes/`
- Shared components: PascalCase in `src/components/`, e.g. `Cover.jsx`
- Data/lib modules: lowerCamelCase or lowercase, e.g. `content.js`, `seo.js`, `seo-site.js`, `useSeo.js`, `motion.js`
- Entry files: `entry-client.jsx` / `entry-server.jsx` — kebab-case, mirrors Vite SSR convention

**Directories:**
- Plural, lowercase, purpose-named: `components/`, `data/`, `lib/`, `routes/`, `styles/`
- `public/assets/images/<category>/` mirrors the content-type keys used in `src/data/content.js` (`books`, `covers`, `features`, `og`, `samples`, `writings`)

**Content record slugs:**
- Every content record (`editions`, `books`, `writings`) carries a `slug` field used to derive its image path (`img: /assets/images/<category>/${slug}.jpg`) — kebab-case, e.g. `eclat-vol-1`, `african-folklores`, `on-rebuilding-slowly`

## Where to Add New Code

**New Route/Page:**
- Add component: `src/routes/NewPage.jsx`
- Register route: add `<Route path="/new-page" element={<NewPage />} />` to `src/App.jsx`
- Register SEO metadata: add an entry to `staticSeo` in `src/data/seo.js` (required — without this the route will render client-side but will not get a prerendered HTML file or a sitemap entry, since `prerender.js` iterates `allRoutes()` which is built from `staticSeo`)
- Call `useSeo({ ...staticSeo['/new-page'], path: '/new-page' })` inside the new component, matching the pattern in every existing route

**New Content Type (e.g. a new editorial category):**
- Add the array/object to `src/data/content.js`, following the existing `.map(...)` pattern for deriving `img` paths from `slug`
- Add corresponding image subdirectory under `public/assets/images/<category>/`
- If the content type needs its own detail route, follow "New Route/Page" above; if it needs per-item SEO (like editions), add a builder function to `src/data/seo.js` analogous to `editionSeo()`/`editionJsonLd()` and wire it into `allRoutes()`

**New Shared UI Component:**
- Implementation: `src/components/NewThing.jsx`, PascalCase, default export
- If it needs cross-page state, consume via `useApp()` from `src/store.jsx` rather than introducing new local/global state

**New Cross-Page State:**
- Add to `src/store.jsx` `AppProvider` (new `useState` + expose via the memoized context value) — this is the only state container in the app; do not introduce a second one

**Utilities:**
- Shared, framework-light helpers: `src/lib/`
- Keep data-fetching-style logic out of `src/lib/` for now — there is no data-fetching layer yet; when a backend is introduced, a new `src/api/` or `src/services/` directory will likely be needed alongside (not instead of) `src/data/`, since `src/data/` should shift toward types/fixtures rather than live content once tenant data is backend-driven

## Special Directories

**`dist/`:**
- Purpose: build output (prerendered static site)
- Generated: Yes (`npm run build`)
- Committed: No — regenerate via build; do not hand-edit

**`get-shit-done/`:**
- Purpose: GSD agent framework files (workflows, templates, references)
- Generated: No (tooling source)
- Committed: Yes, but not part of the Éclat application's runtime code

**`.planning/`:**
- Purpose: GSD planning artifacts, including this codebase map
- Generated: Partially (by GSD commands)
- Committed: Yes

**`public/assets/images/*/` with only `.gitkeep`:**
- Purpose: reserved image slots awaiting real photography; components render a CSS `tint` fallback until a file is dropped at the documented path
- Generated: No
- Committed: Yes (the `.gitkeep` placeholders; actual images added manually per `MANIFEST.md`)

---

*Structure analysis: 2026-09-08*
