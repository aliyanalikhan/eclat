# Coding Conventions

**Analysis Date:** 2026-09-08

## Naming Patterns

**Files:**
- Components and route pages: PascalCase, `.jsx` extension — `src/components/Lightbox.jsx`, `src/routes/Subscribe.jsx`
- Non-component modules (data, hooks, utilities): camelCase or lowercase, `.js` extension — `src/lib/useSeo.js`, `src/lib/motion.js`, `src/data/content.js`, `src/data/seo.js`, `src/data/seo-site.js`
- The global store is `src/store.jsx` (`.jsx` because it renders `<AppContext.Provider>`)
- Multi-word data files use hyphenation: `seo-site.js`

**Functions:**
- Components: PascalCase, default-exported — `export default function Subscribe()`
- Hooks: camelCase prefixed with `use` — `useApp`, `useSeo`
- Helper/utility functions: camelCase, verb-first — `upsertMeta`, `upsertLink`, `readStored`, `runFlip`
- Event handlers defined inline in components: camelCase, verb-first, no `handle` prefix convention enforced — `completeDemo`, `onKey`, `openLightbox`, `closeLightbox`

**Variables:**
- camelCase throughout (`subscribed`, `flipFrom`, `restoreTo`)
- Constants that are effectively static config: SCREAMING_SNAKE_CASE — `STORAGE_KEY`, `RENEWAL` in `src/routes/Subscribe.jsx`
- Data/config objects exported from `src/data/*.js`: UPPERCASE identifiers — `SITE`, `staticSeo`

**Types:**
- Plain JavaScript (JSX), no TypeScript, no PropTypes. No type-level naming conventions apply.

## Code Style

**Formatting:**
- No Prettier or `.prettierrc` config present in the repo — formatting is by convention/habit only, not tool-enforced.
- Observed style: 2-space indentation, no semicolons, single quotes for strings, trailing commas in multiline literals (`src/store.jsx`, `src/routes/Subscribe.jsx`).
- JSX: multi-line for anything with more than 1–2 attributes; inline `style={{ ... }}` objects are used liberally for one-off layout tweaks rather than CSS classes (e.g. `style={{ marginBottom: 18 }}` in `src/routes/Subscribe.jsx`).

**Linting:**
- No ESLint config (`.eslintrc*`, `eslint.config.*`) present anywhere in the repo, and no `lint` script in `package.json`.
- **This means there is currently no automated code-quality gate.** Any new phase introducing security-sensitive code (auth, billing) should consider adding ESLint (or at minimum a `tsc --noEmit`/JSDoc type-check step) as part of that work, since nothing currently catches unused variables, unsafe patterns, or accidental `console.log` leaks before commit.

## Import Organization

**Order (as observed, not enforced by tooling):**
1. React / external package imports — `import { useState } from 'react'`, `import { Link } from 'react-router-dom'`
2. Relative data imports — `import { SITE } from '../data/content.js'`
3. Relative lib/hook imports — `import { useSeo } from '../lib/useSeo.js'`
4. Relative store import — `import { useApp } from '../store.jsx'`

**Path Aliases:**
- None configured in `vite.config.js`. All intra-`src` imports use relative paths (`../store.jsx`, `../lib/motion.js`). Explicit `.js`/`.jsx` extensions are always included in import specifiers.

## Error Handling

**Patterns:**
- `try/catch` is used defensively around browser storage APIs that can throw (private-mode `localStorage`), with silent recovery: `src/store.jsx` (`readStored`, persistence `useEffect`) — catches return `null` or no-op with a comment explaining why (`/* private mode / quota — the demo just won't persist */`).
- No centralized error boundary, no global error-reporting/monitoring hook exists anywhere in `src/`.
- Context misuse is guarded with a thrown `Error` at the hook boundary: `useApp()` in `src/store.jsx` throws `'useApp must be used inside <AppProvider>'` if called outside the provider — this is the only explicit `throw` pattern in the codebase.
- Image load failures are handled inline via `onError` handlers that hide the broken element rather than showing a fallback UI: `src/components/Lightbox.jsx`.
- **No async network error handling exists anywhere** — the app currently makes no real network requests (subscribe/payment flows are explicitly simulated, see `src/routes/Subscribe.jsx`). Any future auth/billing phase introducing real API calls will need to establish this pattern from scratch (loading/error states, retry, user-facing error messaging).

## Logging

**Framework:** None. No `console.log`/logging utility wrapper found in `src/`.

**Patterns:**
- No established logging convention. Errors are currently swallowed (see Error Handling) rather than logged.

## Comments

**When to Comment:**
- Comments are used sparingly but purposefully to explain *why*, not *what* — especially around demo/prototype limitations and intentional design decisions. Examples:
  - `// Subscription state is a front-end demo only — see the notice on /subscribe.` (`src/store.jsx`)
  - `// Demo only: flips local state so the unlocked reading view can be previewed. No network request is made and no field value is read.` (`src/routes/Subscribe.jsx`)
  - `// Only the close button is focusable in here, so keep Tab on it.` (`src/components/Lightbox.jsx`)
- This "demo-only, no real network/payment activity" comment pattern is load-bearing context: multiple files explicitly flag that auth/subscription state is fake and locally persisted only. Any future real-auth/billing phase must locate and remove/replace every one of these comments and their associated fake logic (search `demo` across `src/`).

**JSDoc/TSDoc:**
- Used selectively on components/hooks whose behavior needs explanation beyond the code itself (not on every function): `src/components/Lightbox.jsx` and `src/lib/useSeo.js` both open with a `/** ... */` block describing intent and behavior. Simple presentational components (`Header`, `Footer`, `Cover`) do not have JSDoc.

## Function Design

**Size:** Small, single-purpose. Route components can run long (100–200 lines) because they inline full JSX markup for multi-step UI (`src/routes/Subscribe.jsx`), but logic-only helper functions stay under ~15 lines.

**Parameters:** Destructured object props are standard for components and hooks — `export function useSeo({ title, description, og, type = 'website', robots, jsonLd, path })`. Default values are set via destructuring defaults, not inside the function body.

**Return Values:** Components return JSX or `null` (guard-clause early return, e.g. `if (!open) return null` in `src/components/Lightbox.jsx`). Hooks return plain objects (`useApp()` returns the context value object) or nothing (`useSeo` is effect-only, no return value).

## Module Design

**Exports:** Mix of named and default exports depending on role — components use `export default function ComponentName()`; hooks, providers, and data modules use named exports (`export function AppProvider`, `export function useApp`, `export const SITE`). This split is consistent throughout `src/`.

**Barrel Files:** None. No `index.js` re-export files exist; every module is imported directly by its file path.

---

*Convention analysis: 2026-09-08*
