# Phase 2: Authentication — Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 11
**Analogs found:** 6 / 11 (no `/api` precedent exists yet in this repo — this phase introduces the project's first server code; several files have no in-repo analog and must follow RESEARCH.md Code Examples instead)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `api/auth/google.js` | route (serverless function) | request-response (redirect) | none in repo | no-analog (use RESEARCH.md Pattern 1 + Code Examples) |
| `api/auth/google/callback.js` | route (serverless function) | request-response + CRUD (upsert user, insert session) | none in repo | no-analog (use RESEARCH.md Architecture Patterns diagram) |
| `api/auth/session.js` | route (serverless function) | request-response (read + sliding-window CRUD update) | none in repo | no-analog (RESEARCH.md has full code example) |
| `api/auth/logout.js` | route (serverless function) | request-response + CRUD (delete) | `api/auth/session.js` (sibling, once written) | role-match (same file family) |
| `lib/session.js` | utility (shared helpers: token gen/hash, cookie serialize) | transform | `lib/db.js` | role-match (server-only lib module, same header-comment convention) |
| `middleware.js` | middleware | request-response (pre-filter) | none in repo | no-analog (Vercel routing-middleware convention, RESEARCH.md Architecture diagram) |
| `migrations/0002_sessions_token_hash.sql` | migration | batch/schema | `migrations/0001_init.sql` | exact (same file family, same idempotent convention) |
| `src/components/Header.jsx` | component | request-response (client fetch + conditional render) | itself (existing file, modified in place) | exact (existing pattern to extend, not replace) |
| `src/routes/Account.jsx` | component/route | request-response (client-side auth gate) | itself (existing file, modified in place) | exact (existing pattern to extend, not replace) |
| `src/lib/useSession.js` | hook | request-response (client fetch wrapper) | `src/lib/useSeo.js` | role-match (existing client `lib/` hook, effect-based DOM/state sync pattern) |
| `.env.example` | config | — | `.env.example` (existing) | exact (existing file, add two new vars) |

## Pattern Assignments

### `api/auth/google.js`, `api/auth/google/callback.js`, `api/auth/session.js`, `api/auth/logout.js` (route, request-response)

**No in-repo analog** — this codebase has zero prior `/api` code (confirmed via `ARCHITECTURE.md` and this session's search: no `api/` directory exists). Do not invent a local pattern; follow RESEARCH.md verbatim:

- **Full working code** for `api/auth/google.js` is given in RESEARCH.md "Code Examples > Full authorization-request redirect" (lines 357-394 of 02-RESEARCH.md) — copy this directly, including the `isSafeReturnTo` open-redirect guard and the Web Handler `export default { fetch(request) {...} }` signature.
- **Full working code** for `api/auth/session.js` is given in RESEARCH.md "Code Examples > Session check endpoint" (lines 396-425) — copy directly, including the sliding-window `UPDATE sessions SET expires_at = ...` bump (D-10).
- **Callback route** (`api/auth/google/callback.js`) is not given as a complete file but is fully specified step-by-step in RESEARCH.md "Architecture Patterns > System Architecture Diagram" (lines 152-177): read `oauth_state` cookie, compare to `?state=`, POST to `oauth2.googleapis.com/token`, verify via `jose` (Pattern 2, lines 244-263), upsert `users` by `google_sub` refreshing `name`/`email`/`picture` (D-16), generate+hash session token (Pattern 3, lines 265-280), `INSERT sessions`, `Set-Cookie` via `.append()` never `.set()` (Pitfall 4, lines 337-341).
- **`api/auth/logout.js`** has no example but is described in the Architectural Responsibility Map (row "Sign-out"): must `DELETE FROM sessions WHERE token_hash = ?` (not just clear the cookie — Pitfall 6/AUTH-05), then `Set-Cookie` an expired/cleared `session` cookie.

**Shared conventions across all four routes:**
- Use `import { sql } from '../../lib/db.js'` (or `'../../../lib/db.js'` for the nested `callback.js`) — reuse the existing pooled Postgres client exactly as `scripts/migrate.js` does (`lib/db.js:17-25`), never create a second DB client.
- Use `cookie` package's `serialize`/`parse`, never hand-roll cookie strings (RESEARCH.md "Don't Hand-Roll" table).
- Use `node:crypto.randomBytes`/`createHash`, never `Math.random()` (RESEARCH.md Pattern 3).

---

### `lib/session.js` (utility, transform)

**Analog:** `lib/db.js` (`C:/Users/Aliyan Khan/Documents/Éclat/lib/db.js`)

**Header-comment convention to copy** (lines 1-16):
```javascript
/**
 * Server-only Postgres client. SERVER-ONLY — this file must never be imported
 * from anything under src/ or shipped to the client bundle; it reads a secret
 * connection string from process.env.
 * ...
 */
```
Apply the same "SERVER-ONLY" banner-comment convention to `lib/session.js` (it will export `newSessionToken()`/`hashToken()` from RESEARCH.md Pattern 3, plus a shared cookie-options helper) — this repo enforces the server/client import boundary via `scripts/check-secrets.js`'s `SERVER_ONLY_IMPORT_MARKER` check (see below), so any new server-only `lib/*.js` file should follow the same "throws/fails fast, never silently proceeds" philosophy as `lib/db.js:19-23`.

**Fail-fast pattern** (lines 19-23):
```javascript
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Provision Vercel Postgres and run `vercel env pull .env.local`, then retry.',
  )
}
```
If `lib/session.js` needs `GOOGLE_CLIENT_SECRET` or similar, apply the same fail-fast-on-import pattern rather than a runtime undefined check deep in a handler.

---

### `middleware.js` (middleware, request-response pre-filter)

**No in-repo analog.** Follow RESEARCH.md Architecture Patterns diagram (lines 197-207) and "Recommended Project Structure" (line 222): `matcher: ['/account']`, Edge runtime, checks cookie **presence only** (never validates the session — that's `api/auth/session.js`'s job per Pitfall 6, lines 349-353). Redirect target: `/api/auth/google?return_to=/account`.

---

### `migrations/0002_sessions_token_hash.sql` (migration, batch)

**Analog:** `migrations/0001_init.sql` (`C:/Users/Aliyan Khan/Documents/Éclat/migrations/0001_init.sql`)

**Idempotent convention to copy** (lines 1-8, 50-59):
```sql
-- sessions: minimal shape per CONTEXT.md discretion — Phase 2 owns session design.
-- user_id is BIGINT to match the live users(id) IDENTITY column.
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
```
New migration must add `token_hash TEXT` via `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_hash TEXT` plus a `CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_key ON sessions (token_hash)` — matching this file's `IF NOT EXISTS` everywhere convention (per `scripts/migrate.js`'s "SAFETY CONTRACT" comment, lines 14-21: every migration must be safe to re-run in full, no non-idempotent ALTER/UPDATE/DELETE). Header comment style (explaining rationale/history) should be copied too — see lines 10-19 of `0001_init.sql` for the tone/format (explains *why*, references the CONTEXT.md decision ID).

**Migration runner** — no changes needed to `scripts/migrate.js`; it already auto-discovers and applies any new `.sql` file dropped into `migrations/` sorted by filename (`scripts/migrate.js:43-54`).

---

### `src/components/Header.jsx` (component, request-response — modified in place)

**Analog:** itself, `C:/Users/Aliyan Khan/Documents/Éclat/src/components/Header.jsx`

**Existing single-nav-array pattern to extend** (lines 5-10, 79-88):
```javascript
const LINKS = [
  { to: '/archive', label: 'Archive' },
  { to: '/books', label: "Children's Books" },
  { to: '/writings', label: 'Writings' },
  { to: '/account', label: 'Account' },
]
...
<nav id={navId} className="nav" hidden={navHidden} aria-label="Primary">
  {LINKS.map((l) => (
    <NavLink key={l.to} to={l.to} className="link-underline">
      {l.label}
    </NavLink>
  ))}
  <Link to="/subscribe" className="btn btn--sm">Subscribe</Link>
</nav>
```
D-06 requires the `/account` entry to become conditional. Per Pitfall 1 (RESEARCH.md), the "Sign in" state must render a plain `<a href="/api/auth/google?return_to=...">` — NOT a `NavLink`/`Link` — since React Router will 404 on `/api/*`. Suggested approach: replace the static `{ to: '/account', label: 'Account' }` entry in `LINKS` with a small inline conditional component that reads session state from the new `useSession()` hook and renders either `<a href="/api/auth/google?...">Sign in</a>` (signed out/loading) or `<NavLink to="/account">Account</NavLink>` + a sign-out control (signed in), consistent with the existing `.map()`-over-array structure and `link-underline` className convention.

---

### `src/routes/Account.jsx` (component/route, request-response auth gate — modified in place)

**Analog:** itself, `C:/Users/Aliyan Khan/Documents/Éclat/src/routes/Account.jsx`

**Current demo-state read pattern** (lines 1-10) to be replaced for auth (NOT for subscription — subscription/billing content stays exactly as-is per CONTEXT.md, only the auth gate is added):
```javascript
import { useApp } from '../store.jsx'
...
export default function Account() {
  const { subscribed, setSubscribed, plan } = useApp()
  useSeo({ ...staticSeo['/account'], path: '/account' })
  ...
```
Add a client-side effect (per Pitfall 2, no per-request SSR exists) that calls the new `useSession()` hook, shows a brief loading state, and redirects (`window.location.assign('/api/auth/google?return_to=/account')`, not `<Link>`/`navigate()`) when the session resolves to signed-out — mirrors D-09. Keep the existing `subscribed`/`plan`/`invoices` rendering below the gate untouched; do not conflate `useApp()`'s demo `subscribed` flag with real auth state (per `ARCHITECTURE.md` Anti-Patterns, explicitly flagged in CONTEXT.md).

---

### `src/lib/useSession.js` (hook, request-response client fetch wrapper)

**Analog:** `src/lib/useSeo.js` (`C:/Users/Aliyan Khan/Documents/Éclat/src/lib/useSeo.js`)

Read this file directly for the exact `useEffect`-based imperative-sync style this project uses in `src/lib/`; `useSession` should follow the same conventions: a `use`-prefixed camelCase export, a top-of-file JSDoc block describing intent/behavior (matching `useSeo.js`'s and `Lightbox.jsx`'s documented pattern per CLAUDE.md "Comments" section), and `useEffect` + local `useState` rather than any new state-management dependency. Internally it should `fetch('/api/auth/session')` once on mount (and expose a `refetch`/re-check trigger for post-login), returning `{ user, loading }` — the three-state (`loading`/signed-in/signed-out) shape mandated by Pitfall 2.

---

### `.env.example` (config)

**Analog:** itself (existing file) — add `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` following whatever existing line format documents `GOOGLE_CLIENT_ID` today. No new pattern needed; `scripts/check-secrets.js` auto-discovers all `.env.example` var names except those in its `KNOWN_PUBLIC_VAR_NAMES` allowlist (`check-secrets.js:35`) — `GOOGLE_CLIENT_SECRET` must NOT be added to that allowlist (it is a real secret); only `GOOGLE_CLIENT_ID` and (if it ends up non-secret) `GOOGLE_REDIRECT_URI` belong there.

---

## Shared Patterns

### Server-only module boundary
**Source:** `lib/db.js` (whole file) + `scripts/check-secrets.js` lines 47-51, 101-108
**Apply to:** `lib/db.js` (reused), `lib/session.js` (new), every `api/auth/*.js` route
Every server-only module gets a `SERVER-ONLY` banner JSDoc comment stating it must never be imported from `src/`. The build's `check-secrets.js` step already scans `dist/assets/*` for `lib/db.js`'s own error string as a tripwire for accidental client bundling — if `lib/session.js` introduces a new unique error string, no change to `check-secrets.js` is required (it isn't file-specific beyond that one marker), but keeping the same "fail fast in the module body" idiom is what makes such tripwires meaningful.

### Migration idempotency
**Source:** `migrations/0001_init.sql` (whole file), enforced by `scripts/migrate.js` lines 14-21, 43-54
**Apply to:** `migrations/0002_sessions_token_hash.sql`
`IF NOT EXISTS` on every `CREATE TABLE`/`CREATE INDEX`; use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for the new `token_hash` column. Never a plain `ALTER`/`UPDATE`/`DELETE` (migrations can partially re-run per the runner's non-transactional safety contract).

### CSP / headers config
**Source:** `vercel.json` lines 22-25
**Apply to:** `vercel.json`, `public/_headers` (parity file, not yet read this session but referenced identically in CONTEXT.md/RESEARCH.md)
Current CSP: `"img-src 'self' data:"` — needs `https://*.googleusercontent.com` appended for the Google avatar (Pitfall 3). RESEARCH.md's finding: no `connect-src`/`script-src` change needed for the OAuth redirect itself (full-page navigation + server-to-server call, not subject to CSP fetch directives) — do not widen those directives unnecessarily.

### React Router escape hatch for `/api/*`
**Source:** RESEARCH.md Pitfall 1 (no in-repo precedent — this is the first `/api` link in the app)
**Apply to:** `src/components/Header.jsx` sign-in link, any "try again" link after a failed sign-in (D-15)
Always a plain `<a href="/api/auth/google?...">`, never `<Link>`/`<NavLink>`/`navigate()`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `api/auth/google.js` | route | request-response | No `/api` directory has ever existed in this repo; use RESEARCH.md's complete code example verbatim |
| `api/auth/google/callback.js` | route | request-response + CRUD | Same — follow RESEARCH.md's step-by-step Architecture Patterns diagram |
| `api/auth/session.js` | route | request-response | Same — RESEARCH.md provides a complete, copy-ready implementation |
| `middleware.js` | middleware | request-response pre-filter | Vercel routing-middleware convention has no precedent in this repo; follow RESEARCH.md's Architecture diagram + official Vercel docs cited there |

## Metadata

**Analog search scope:** `src/`, `lib/`, `migrations/`, `scripts/`, repo root config files (`vercel.json`, `.env.example`, `package.json`)
**Files scanned:** `src/components/Header.jsx`, `src/store.jsx`, `src/routes/Account.jsx`, `lib/db.js`, `migrations/0001_init.sql`, `scripts/migrate.js`, `scripts/check-secrets.js`, `vercel.json`
**Pattern extraction date:** 2026-09-08
