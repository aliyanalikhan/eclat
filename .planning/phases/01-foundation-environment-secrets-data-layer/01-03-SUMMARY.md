---
phase: 01-foundation-environment-secrets-data-layer
plan: 03
subsystem: infra
tags: [build-tooling, secrets, security, node]

requires:
  - phase: 01-foundation-environment-secrets-data-layer (Plan 01)
    provides: package.json build script chain (migrate.js -> vite build x2 -> prerender.js), .env.example, .gitignore secrets exclusion
  - phase: 01-foundation-environment-secrets-data-layer (Plan 02)
    provides: live, migrated Vercel Postgres database reachable via .env.local (POSTGRES_URL)
provides:
  - "scripts/check-secrets.js — build-time exact-value secret leak scanner over dist/"
  - "npm run build now fails non-zero if any of the 6 tracked secret values leak into dist/"
  - "Real, verified npm run build run: migrate -> vite build x2 -> prerender -> check-secrets, exit 0, clean pass"
affects: [Phase 2 (auth), Phase 3 (billing/webhooks), Phase 4 (content gating), Phase 5 (account UI) — all rely on this gate staying green on every future build]

actuals:
  tokens: 1200
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Build-time verification scripts follow prerender.js's exact skeleton: JSDoc header explaining why, node:fs/promises + node:path + node:url imports, here = dirname(fileURLToPath(import.meta.url)), top-level main().catch(err => { console.error('<script>: ...', err); process.exit(1) }) tail, '<script-name>: ' prefixed console messages."
    - "Secret scanning is exact-value match against process.env, never pattern/prefix matching — avoids false positives and is the only way to guarantee zero false negatives for arbitrary secret formats."

key-files:
  created:
    - scripts/check-secrets.js
  modified:
    - package.json

key-decisions:
  - "Local verification of `npm run build` (which requires POSTGRES_URL via scripts/migrate.js) required linking this worktree to the Vercel project and pulling a fresh .env.local, since worktrees don't inherit gitignored .env.local/.vercel from the main checkout — done via `npx vercel link` and `npx vercel env pull`, matching the pattern already established in Plan 01-02."
  - "Node's --env-file flag is not accepted via NODE_OPTIONS on this Node version (22.15.0) and npm run build is a multi-command && chain (not a single node invocation), so a small throwaway env-loader script (not committed) was used purely to run the verification command with .env.local's vars injected into the child process — the actual build script (package.json) and check-secrets.js contain no dependency on this loader."

patterns-established:
  - "scripts/check-secrets.js is the final step of npm run build (after prerender.js) — any future script that needs to inspect the fully-built dist/ output should be added after this step, not before, so it doesn't interfere with the leak scan's completeness."

requirements-completed: [ENV-01]

coverage:
  - id: D1
    description: "scripts/check-secrets.js scans the final dist/ output for exact values of 6 tracked server secrets (GOOGLE_CLIENT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SESSION_SECRET, POSTGRES_URL, POSTGRES_URL_NON_POOLING) and is wired as the last step of npm run build"
    requirement: "ENV-01"
    verification:
      - kind: unit
        ref: "node --check scripts/check-secrets.js (exit 0)"
        status: pass
      - kind: integration
        ref: "grep -c 'node scripts/check-secrets.js' package.json (returns 1, last segment of build script)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A real npm run build (migrate -> vite build x2 -> prerender -> check-secrets) completes end-to-end with exit 0 on a clean tree, and check-secrets.js's own output is the clean-pass message"
    requirement: "ENV-01"
    verification:
      - kind: integration
        ref: "npm run build (via env-file-loading wrapper for local .env.local injection) — exit 0, final line 'check-secrets: no leaked secrets found in dist/'"
        status: pass
    human_judgment: false
  - id: D3
    description: "Leak-detection path proven with a dynamically-generated (non-hardcoded) test token: injected into a throwaway dist/ file, check-secrets.js exits 1, reports 'SESSION_SECRET found in ...', and never prints the token's own value; after removal, a clean run reports the pass message and exits 0 again"
    requirement: "ENV-01"
    verification:
      - kind: integration
        ref: "manual shell test injecting SESSION_SECRET=\"leaktest-$(date +%s)\" into dist/__leak-test.tmp, asserting exit code 1, message content, absence of the token value in output, and a subsequent clean exit 0 run"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-09-08
status: complete
---

# Phase 1 Plan 3: Build-Time Secret Leak Scanner Summary

**`scripts/check-secrets.js` scans the fully-built `dist/` output for exact values of 6 tracked server secrets and fails `npm run build` (non-zero exit) if any leak through — verified with a real clean build and a dynamically-generated-token injection test proving both detection and non-disclosure.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-08T07:45:00Z (approx)
- **Completed:** 2026-09-08T08:05:49Z
- **Tasks:** 2 of 2
- **Files modified:** 2 (`scripts/check-secrets.js` created, `package.json` modified)

## Accomplishments

- Created `scripts/check-secrets.js` following `prerender.js`'s exact skeleton (JSDoc header, `node:fs/promises`/`node:path`/`node:url` imports, `here`-relative path resolution, top-level `main().catch()` tail, `check-secrets:`-prefixed console messages).
- Implemented a manual recursive directory walk over `dist/` (no reliance on `readdir(..., { recursive: true })`, matching PATTERNS.md's portability guidance since `package.json` has no `engines` field).
- Implemented exact-value (not pattern-based) matching: builds a `{ name, value }` list from `process.env` for the 6 tracked vars, filters out unset/empty ones, and checks `content.includes(value)` per file — continuing past the first match so a single run reports every leak found, never printing the value itself.
- Wired `node scripts/check-secrets.js` as the final segment of `package.json`'s `build` script, after `prerender.js`, so it scans the complete `dist/` contents (prerendered HTML included).
- Linked this worktree to the Vercel project (`vercel link`) and pulled a fresh `.env.local` (`vercel env pull`) since worktrees don't inherit gitignored env/link state from the main checkout — matching the same pattern Plan 01-02 already used.
- Ran a real `npm run build` end-to-end (with `.env.local`'s vars injected into the build's child process, since Node's `--env-file` isn't usable via `NODE_OPTIONS` and the build is a multi-command chain): `migrate: up to date (1 migrations)` -> both `vite build` steps -> `prerender: 9 routes -> dist/` -> `check-secrets: no leaked secrets found in dist/`, exit 0.
- Proved the leak-detection path with a dynamically-generated timestamp-based token (never hardcoded): injected as `SESSION_SECRET` into a throwaway `dist/__leak-test.tmp` file, `check-secrets.js` exited 1 and printed `check-secrets: SESSION_SECRET found in __leak-test.tmp` — the token's own value never appeared in the script's output. After removing the throwaway file, a subsequent run again reported the clean-pass message and exited 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build-time secret scanner** - `1b1bdc5` (feat) — `scripts/check-secrets.js` created, `package.json` build script wired.
2. **Task 2: Full build verification — clean pass and injected-leak pass** - no commit (verification-only task per plan `files_modified: []`; no source changes produced).

**Plan metadata:** commit pending (final metadata commit for this plan)

## Files Created/Modified

- `scripts/check-secrets.js` - build-time exact-value secret leak scanner; recursively walks `dist/`, checks each non-binary file's contents against the 6 tracked secret values currently set in `process.env`, exits 1 with a leak report (var name + relative path, never the value) if any match, otherwise logs a clean-pass message and exits 0.
- `package.json` - `scripts.build` extended with `&& node scripts/check-secrets.js` as the final chained step, after `node prerender.js`.

## Decisions Made

- Used the Vercel CLI (`vercel link`, `vercel env pull`) to populate this worktree's `.env.local`, since Plan 03's real `npm run build` verification requires a live `POSTGRES_URL` (via `scripts/migrate.js`, built in Plan 01) and worktrees don't carry over gitignored `.env.local`/`.vercel` from the main checkout — this mirrors the exact approach Plan 01-02 already established.
- Used a small, uncommitted local script (in the session scratchpad, not the repo) to inject `.env.local`'s variables into the `npm run build` child process for local verification, because Node 22.15.0 rejects `--env-file` via `NODE_OPTIONS` and `npm run build` invokes a multi-command `&&` chain rather than a single `node` entrypoint that could accept `--env-file` directly. This is purely a local-verification convenience — it has no bearing on the actual deployed build (Vercel's deploy pipeline injects env vars directly into `process.env`, as already noted in the plan's environment context) and is not part of any committed file.

## Deviations from Plan

None - plan executed exactly as written. Task 1's implementation matched the plan's `<action>` spec precisely (skeleton, tracked-var list, manual walk, binary-extension skip list, exact-value matching, package.json wiring). Task 2's verification ran successfully with the plan's intended dynamically-generated-token approach (adapted only in *how* env vars were injected into the shell for local verification, per the plan's own `<important_environment_note>` guidance to adapt literal command syntax as needed).

## Issues Encountered

- `NODE_OPTIONS="--env-file=.env.local"` is rejected by Node 22.15.0 with `--env-file= is not allowed in NODE_OPTIONS`. Resolved by writing a small throwaway Node script (in the session scratchpad, never committed to the repo) that parses `.env.local` and spawns the actual `npm run build` command with those vars merged into the child process's environment — this only affected how the verification command was invoked locally, not any repo file.
- Bash `&&`-chaining a `$(...)` command substitution whose inner command deliberately returns exit code 1 (the leak-detection test) aborts the chain at that point, since the substitution's own exit status is 1. Resolved by switching to `;`-separated statements for the leak-injection verification sequence instead of `&&`-chaining, since that sequence intentionally includes a step expected to fail.

## User Setup Required

None - no external service configuration required. `.env.local` in this worktree was populated automatically via the already-authenticated Vercel CLI (same as Plan 01-02); no manual dashboard action was needed.

## Next Phase Readiness

- Phase 1's full secrets boundary is now closed end-to-end: source-level fail-fast (Plan 01's `lib/db.js`), a live, reconciled database (Plan 02), and this plan's build-time enforcement gate (`scripts/check-secrets.js`) — together satisfying ROADMAP Phase 1 Success Criteria #1 and #4.
- Every future phase (2-5) that adds new secrets to the tracked-var list in `scripts/check-secrets.js` (e.g. `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` were already included in this scan's 6-var list even though not yet set as env vars in this environment) is automatically covered by this gate — no further wiring needed, only ensuring any new secret name is added to `TRACKED_VAR_NAMES` if it isn't one of the original 6.
- `npm run build` now requires `POSTGRES_URL` to be set (via `scripts/migrate.js`, from Plan 01) in every environment that runs it, including CI/local dev — this was already true before this plan; this plan adds no new environment-variable requirement, only a scan of vars that may already be set.

---
*Phase: 01-foundation-environment-secrets-data-layer*
*Completed: 2026-09-08*
