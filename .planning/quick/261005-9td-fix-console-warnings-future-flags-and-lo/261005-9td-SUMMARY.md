---
status: complete
quick_id: 261005-9td
commit: e6ec0d1
---

# Quick Task 261005-9td: Fix React Router future flags and local dev/preview API endpoints

## Changes (commit e6ec0d1)
- `src/entry-client.jsx`: Added `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` to `<BrowserRouter>`. Silences React Router v7 preparation warnings (`v7_startTransition` and `v7_relativeSplatPath`).
- `src/entry-server.jsx`: Added `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` to `<StaticRouter>`. Keeps SSR router options aligned with client router.
- `vite.config.js`:
  - Updated `previewStaticSemantics` to bypass `/api/` and `/_vercel/` routes, preventing the preview server from prematurely returning `dist/404.html` on API/internal requests.
  - Extended `localApiDev` middleware to run on both `configureServer` (dev) and `configurePreviewServer` (preview).
  - Added stub for `/_vercel/insights/script.js` (200 OK JS stub) to eliminate 404s from `@vercel/analytics/react` when previewing/testing locally outside Vercel.
  - Added handler for `/api/auth/session` (200 OK `{ user: null }`) for local dev/preview.
  - Added fallback pricing in `/api/billing/prices` matching live Stripe catalog values when `STRIPE_SECRET_KEY` is not present locally, eliminating 404s and enabling functional price rendering offline/locally.
  - Added `/api/billing/account` (401 unauthenticated) alongside existing `/api/billing/status` (401 unauthenticated).

## Browser-Level Notices Clarification
- `contentscript.js:14083 MaxListenersExceededWarning` & `ObjectMultiplex - orphaned data for stream "app-init-liveness" / "background-liveness"`:
  Injected by MetaMask (web3 wallet) browser extension into all web pages. It is an internal EventEmitter listener count limit exceeded within MetaMask's content script, unrelated to Éclat codebase. Does not occur in private/incognito browsing or without MetaMask.
- `[Intervention] Images loaded lazily and replaced with placeholders`:
  Informational browser intervention by Chromium/Edge indicating off-screen lazy-loaded images (`loading="lazy"`) are deferred until viewport entry.

## Verification
- Client build (`npm run build:client`) succeeded without error.
- Verified all endpoints (`/api/auth/session`, `/api/billing/prices`, `/api/billing/status`, `/api/billing/account`, `/_vercel/insights/script.js`) across both Vite dev and preview servers with automated HTTP tests, returning 200/401 with expected JSON/JS headers and bodies.
