# Testing Patterns

**Analysis Date:** 2026-09-08

## No Test Framework Present

**This codebase has zero automated testing infrastructure.** Confirmed by exhaustive search:

- `package.json` (`C:\Users\Aliyan Khan\Documents\Éclat\package.json`) declares no test runner in `dependencies` or `devDependencies` (only `react`, `react-dom`, `react-router-dom`, `@vitejs/plugin-react`, `vite`), and there is **no `test` script** — only `dev`, `build`, `build:client`, `preview`, `serve`.
- No config files for any test runner exist anywhere in the repo: no `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `cypress.config.*`, or `.mocharc*`.
- No `*.test.*` or `*.spec.*` files exist anywhere under the project (excluding `node_modules`).
- No `__tests__/` directories exist.
- No assertion library (`chai`, `expect`, etc.), mocking library (`msw`, `sinon`, `vitest`'s built-in mocks, `jest.mock`), or coverage tool (`c8`, `nyc`, `istanbul`) is installed.
- The only quasi-verification script in the repo is `verify-hero.mjs` (`C:\Users\Aliyan Khan\Documents\Éclat\verify-hero.mjs`), a one-off manual/visual check script for a hero image asset — not a test suite, not run in CI, not wired to any `npm` script.
- No CI configuration exists (no `.github/workflows/`), so there is no pipeline that would run tests even if they existed.

## Why This Matters Now

The current app is a **prerendered marketing/content SPA** (React Router + Vite SSR prerender via `prerender.js`) with an explicitly simulated subscribe/payment flow — see `src/routes/Subscribe.jsx` and `src/store.jsx`, both of which contain comments stating no real network requests or payment data are involved, and subscription state is just `localStorage`-persisted UI state.

The next milestone adds **security-sensitive auth/billing code**. This is a major shift in risk profile: real user credentials, real payment provider integration, and real request/response handling will replace the current fake `localStorage` demo state. There is currently:

- No test runner to build on — one must be chosen and installed from scratch.
- No existing test file/directory naming convention to follow — a convention must be established as part of this milestone, not inferred from the codebase.
- No mocking pattern for network/API calls — none exist yet because the app makes none.
- No CI to enforce running tests before merge/deploy — `vercel.json` (`C:\Users\Aliyan Khan\Documents\Éclat\vercel.json`) configures deployment only, not test gating.

## Recommended Starting Point (not yet implemented)

For a Vite + React project, the conventional low-friction choice is **Vitest** (shares Vite's config/transform pipeline, fast, Jest-compatible API) plus **@testing-library/react** for component tests and **msw** (Mock Service Worker) for mocking auth/billing API calls at the network layer rather than mocking client code directly. For payment provider integration specifically (e.g., Stripe), tests should mock the provider SDK/webhook boundary and never exercise real payment endpoints in CI.

Concretely, before or alongside the auth/billing phase:
1. Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` (or use Vitest's built-in `environment: 'jsdom'`) to `devDependencies`.
2. Add a `vitest.config.js` (or `test` block in `vite.config.js`) and a `"test": "vitest"` script in `package.json`.
3. Establish file convention: co-located `*.test.jsx` next to source, or a mirrored `src/__tests__/` tree — either is reasonable given the current flat `src/` structure, but pick one and document it here once chosen.
4. For auth/billing specifically: unit-test pure logic (validation, plan/price calculation currently in `src/routes/Subscribe.jsx`) separately from integration tests that mock the provider SDK/API boundary with `msw`.
5. Add a lint step alongside (see `CONVENTIONS.md` — no ESLint config exists either) so both quality gates land together.

## Current State Summary

| Aspect | Status |
|---|---|
| Test runner | None installed |
| Test config | None |
| Test files | None (0 found) |
| `npm test` script | Not defined |
| Mocking library | None |
| Coverage tooling | None |
| CI test gate | None (no CI config at all) |
| Assertion library | None |

---

*Testing analysis: 2026-09-08*
