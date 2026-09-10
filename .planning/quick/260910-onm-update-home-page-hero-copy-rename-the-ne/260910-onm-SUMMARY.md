---
task: 260910-onm
title: Update Home page hero copy, rename the flag pill, add hero CTA, extend Footer copyright
subsystem: public-site (Home route, Footer component)
tags: [copy, home, footer, jsx]
dependency-graph:
  requires: []
  provides:
    - "New Home hero headline/lede/flag/CTA copy"
    - "Extended Footer copyright line with publisher sentence"
  affects:
    - src/routes/Home.jsx
    - src/components/Footer.jsx
tech-stack:
  added: []
  patterns:
    - "Reused the existing `<Link to={`/editions/${newest.no}`} className=\"btn\">` pattern for the new hero CTA (same shape as the pre-existing 'See inside this edition' button)."
key-files:
  created: []
  modified:
    - src/routes/Home.jsx
    - src/components/Footer.jsx
decisions:
  - "Footer publisher sentence intentionally uses a plain straight apostrophe in \"children's\" (not the file's usual `&rsquo;` entity) because it's a verbatim user quote — React's SSR renderer HTML-entity-escapes it to `&#x27;` at build time, identical to how the file's existing `&rsquo;` entity elsewhere also gets escaped in the prerendered output; this is normal SSR behavior, not a defect."
  - "Orchestrator merged this task's branch as a clean fast-forward onto master (commit b8a75db) — no divergence with prior same-session tasks."
metrics:
  duration: ~15 min
  completed: 2026-09-10
status: complete
actuals:
  tokens: 1200
  tasks: 2
  commits: 2
---

# Quick Task 260910-onm: Update Home page hero copy, rename the flag pill, add hero CTA, extend Footer copyright Summary

Replaced the Home page hero's headline, lede, and flag-pill copy with new user-supplied text, added a working "Explore the Issue" CTA button inside the hero, and extended the Footer's copyright line with a verbatim publisher sentence about Éclat Life Style LLC.

## What Changed

**Task 1 — `src/routes/Home.jsx` hero section:**
- Flag pill: `New issue — {newest.date}` → `THE {newest.date.toUpperCase()} ISSUE` (decorative dot span untouched)
- `<h1>`: replaced the two-line "Two issues" / `<br/>` / `<em>of paying attention</em>` markup with the single plain-text sentence "Where remarkable stories come to light."
- `<p className="hero__lede">`: replaced with "Éclat celebrates the visionaries, leaders, creators, and changemakers whose stories deserve to be told."
- Added a new `<Link to={`/editions/${newest.no}`} className="btn">Explore the Issue</Link>` inside `hero__copy`, immediately after the lede, mirroring the pre-existing "See inside this edition" button used lower on the same page. That original button and every other Home.jsx section were left untouched.

**Task 2 — `src/components/Footer.jsx`:**
- Extended the `&copy; {year} {SITE.name}` line to also include, verbatim: "Éclat bi-monthly online magazine and the children's books are published by Éclat Life Style LLC."
- The separate "Quarterly since {SITE.founded}." tagline and the footer nav links were left completely untouched.

## Task Commits

1. **Task 1: Hero headline/lede replacement, flag rename, new "Explore the Issue" CTA** - `369d7e5` (feat)
2. **Task 2: Add publisher/copyright sentence to Footer** - `b8a75db` (feat)

## Deviations from Plan

None — plan executed exactly as written.

## Build Verification

`npm run build`'s first step (`scripts/migrate.js`) failed on missing `POSTGRES_URL`, exactly as anticipated by the plan's fallback instructions (no `.env.local` in this sandbox). Ran the individual steps instead:

```
npx vite build
npx vite build --ssr src/entry-server.jsx --outDir dist/server
node prerender.js
```

All three completed with no errors referencing `Home.jsx` or `Footer.jsx`. Confirmed `dist/index.html` contains "Where remarkable stories come to light.", "Explore the Issue", "Éclat Life Style LLC", and the flag pill renders correctly as "THE SEPTEMBER 2026 ISSUE" (React SSR splits interpolated text with hydration comment markers — `THE <!-- -->SEPTEMBER 2026<!-- --> ISSUE` — which is expected, not a defect). Re-verified again post-merge into master.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Hero and footer copy changes are live in the codebase, pushed to `origin/master`.
- Flagged to the user separately: the Footer's pre-existing "Quarterly since {SITE.founded}." tagline still says "quarterly" while the new publisher sentence says "bi-monthly" — a pre-existing wording discrepancy this task deliberately left untouched (out of scope), worth reconciling in a future pass.
- No blockers. This is a content/copy-only change with no effect on any in-flight phase (04/05 gating and account work).

---
*Quick task: 260910-onm*
*Completed: 2026-09-10*

## Self-Check: PASSED

- FOUND: src/routes/Home.jsx (hero flag/h1/lede/CTA changes present, verified via grep)
- FOUND: src/components/Footer.jsx (publisher sentence present, verified via grep)
- FOUND commit 369d7e5 (Task 1: hero headline/lede/flag/CTA)
- FOUND commit b8a75db (Task 2: Footer publisher sentence)
- Post-merge build + prerender re-verified clean
