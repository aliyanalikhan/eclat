---
phase: quick-260923-nof
plan: 1
subsystem: ui
tags: [content, static-assets, pdf, csp, writings]

# Dependency graph
requires: []
provides:
  - 6 archival letter/writing PDF assets under public/assets/documents/writings/
  - writings array in src/data/content.js expanded from 2 to 7 chronologically-ordered entries, 6 of which carry a new `pdf` field
  - Inline PDF iframe + "Open / download PDF" fallback link on src/routes/Writing.jsx whenever w.pdf is present
  - CSP frame-src widened to 'self' https://www.youtube-nocookie.com in vercel.json and public/_headers
affects: [writings-detail-page, writings-index, csp-headers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional `pdf` field on a writings array entry, read only by the detail page, renders an inline <iframe> + always-visible fallback download link when present"

key-files:
  created:
    - public/assets/documents/writings/immortal-beloved.pdf
    - public/assets/documents/writings/the-poetical-science.pdf
    - public/assets/documents/writings/the-confession.pdf
    - public/assets/documents/writings/come-here-i-want-to-see-you.pdf
    - public/assets/documents/writings/two-minds-one-idea.pdf
    - public/assets/documents/writings/the-einstein-szilard-letter.pdf
  modified:
    - src/data/content.js
    - src/routes/Writing.jsx
    - vercel.json
    - public/_headers

key-decisions:
  - "Copied the 6 source PDFs as-is (binary copy, no re-encoding/compression) into public/assets/documents/writings/ — same static-asset pattern already used for images"
  - "the-einstein-szilard-letter entry was updated in place (pdf field added) rather than duplicated, since the same archival facsimile PDF corresponds to the letter's existing transcribed body text"
  - "PDF iframe + fallback link block placed above the existing body/dek prose block in Writing.jsx, leaving that block's logic completely unchanged so text still renders for every entry regardless of pdf presence"
  - "Fallback download link always renders alongside the iframe (not conditionally on iframe failure) since client-side iframe-load-failure detection isn't feasible without extra JS this task didn't need"

patterns-established:
  - "Optional per-entry `pdf` field pattern: any future writings/editions entry can gain a real embedded document by adding a `pdf: '/assets/documents/...'` field with zero changes to list/SEO/prerender code, since those already iterate the array generically"

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-09-23
status: complete
actuals:
  tokens: 1435
  tasks: 3
  commits: 3
---

# Quick Task 260923-nof: Add Real PDF Previews for Archival Letters Summary

**Replaced plain-text-only rendering of 6 archival letter/writing entries with the real supplied PDF documents, embedded inline via `<iframe>` on each entry's `/writings/<slug>` detail page, plus a same-origin CSP widening to let the browser actually load them.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-09-23T17:14:00+05:00 (approx.)
- **Completed:** 2026-09-23T17:16:16+05:00
- **Tasks:** 3
- **Files modified:** 10 (6 new PDFs, content.js, Writing.jsx, vercel.json, public/_headers)

## Accomplishments
- Copied 6 archival letter/writing PDFs from the user's Downloads folder into `public/assets/documents/writings/`, verified nonzero size and byte-identical to their sources
- Replaced the `writings` array in `src/data/content.js` with the full 7-entry chronological block (Immortal Beloved 1812, The Poetical Science 1843, The Confession 1844, The Gettysburg Address 1863, Come Here I Want to See You 1876, Two Minds One Idea 1909-1910, The Einstein-Szilard Letter 1939) — 5 new entries plus the existing 2, one of which (the Einstein-Szilard letter) gained a `pdf` field in place with its body text untouched
- Added an inline PDF viewer (`<iframe>`) + "Open / download PDF" fallback link to `src/routes/Writing.jsx`, rendered whenever `w.pdf` is present, without altering the existing body/dek prose rendering
- Widened `Content-Security-Policy` `frame-src` in both `vercel.json` and `public/_headers` from `https://www.youtube-nocookie.com` to `'self' https://www.youtube-nocookie.com`, with every other directive left byte-for-byte unchanged
- Ran the full production pipeline (client build, SSR build, `node prerender.js`) and a local `vite preview` server, confirming all 6 `/writings/<slug>` routes and all 6 PDF asset URLs return HTTP 200, and that prerendered HTML contains the correct iframe `src` for each PDF-bearing entry while `the-gettysburg-address` has no iframe

## Task Commits

Each task was committed atomically:

1. **Task 1: Copy the 6 archival PDFs and replace the writings array in content.js** - `03f3aa3` (feat)
2. **Task 2: Render an inline PDF viewer + fallback link on the writing detail page** - `6486840` (feat)
3. **Task 3: Widen CSP frame-src for same-origin PDF iframes; full build + prerender + preview verification** - `6ad641b` (fix)

## Files Created/Modified
- `public/assets/documents/writings/immortal-beloved.pdf` - Beethoven's 1812 "Immortal Beloved" letter, copied as-is
- `public/assets/documents/writings/the-poetical-science.pdf` - Ada Lovelace 1843 manuscript reconstruction, copied as-is
- `public/assets/documents/writings/the-confession.pdf` - Darwin to Hooker 1844 letter, copied as-is
- `public/assets/documents/writings/come-here-i-want-to-see-you.pdf` - Bell 1876 notebook entry, copied as-is
- `public/assets/documents/writings/two-minds-one-idea.pdf` - Gandhi-Tolstoy 1909-1910 correspondence, copied as-is
- `public/assets/documents/writings/the-einstein-szilard-letter.pdf` - Einstein-Szilard 1939 archival facsimile, copied as-is
- `src/data/content.js` - Replaced the entire `writings` array (2 entries -> 7 entries), reordered chronologically, 6 entries now carry a `pdf` field; no other exports touched
- `src/routes/Writing.jsx` - Added a conditional `w.pdf &&` block rendering an `<iframe>` + fallback `<a target="_blank">` download link, positioned between the `<h1>` title and the existing `.prose` block
- `vercel.json` - `Content-Security-Policy` `frame-src` widened to include `'self'`
- `public/_headers` - Identical `Content-Security-Policy` `frame-src` change for Netlify/Cloudflare Pages hosting parity

## Decisions Made
- No format conversion needed on any PDF — all 6 source files copied byte-for-byte, sizes verified to match the source Downloads folder exactly (largest ~840KB, the Einstein-Szilard facsimile)
- Titles for the 5 new entries stored in title case (not the source "Details.txt" ALL-CAPS coverline style) to stay visually consistent with the two pre-existing entries, since neither `.display` nor `.writing__title` CSS applies text-transform
- `src/routes/Writings.jsx`, `src/data/seo.js`, `src/App.jsx`, and `prerender.js` were left untouched — confirmed by reading them, they already iterate the `writings` array generically and need no per-entry special-casing for the new `pdf` field

## Deviations from Plan

None - plan executed exactly as written. All 3 tasks completed with their exact specified file scope, and all automated `<verify>` blocks passed as written (adapted only for the POSIX-style path handling required by the Bash tool on this Windows environment, e.g. `/c/Users/Aliyan Khan/...` instead of `C:\Users\Aliyan Khan\...` — no change to the actual verification logic or outcome).

## Issues Encountered
- The Bash tool's shell rejected a Windows-style absolute path with a Unicode character (`Éclat`) and backslashes in an early invocation (exit code 2, "unexpected EOF"). Resolved by using POSIX-style paths (`/c/Users/Aliyan Khan/Documents/Éclat`) for all subsequent shell commands, which the Git Bash environment handles correctly. No impact on the actual file changes or verification outcomes.

## User Setup Required

None - no external service configuration required. All changes are static assets, content data, and headers already covered by the existing Vercel/Netlify/Cloudflare Pages deployment configuration.

## Next Phase Readiness
- All 6 PDF-bearing `/writings/<slug>` routes now render an inline PDF viewer with a working fallback download link, verified end-to-end via a real production build + prerender + local preview server round-trip
- `the-gettysburg-address` remains completely untouched (plain text, no pdf field, no iframe) per plan requirement
- CSP changes are live in both `vercel.json` (Vercel) and `public/_headers` (Netlify/Cloudflare Pages) so the iframe will not be silently blocked on either hosting path
- Final live-browser visual confirmation that the PDFs actually render inside the iframe (not just that the routes/assets return 200 and the CSP header is set) is noted in the plan as the orchestrator's follow-up responsibility, since no browser-automation tooling exists in this repo
- No `git push` was performed — all 3 task commits are local only, per plan and orchestrator instruction

---
*Quick task: 260923-nof*
*Completed: 2026-09-23*

## Self-Check: PASSED

- FOUND: public/assets/documents/writings/immortal-beloved.pdf
- FOUND: public/assets/documents/writings/the-poetical-science.pdf
- FOUND: public/assets/documents/writings/the-confession.pdf
- FOUND: public/assets/documents/writings/come-here-i-want-to-see-you.pdf
- FOUND: public/assets/documents/writings/two-minds-one-idea.pdf
- FOUND: public/assets/documents/writings/the-einstein-szilard-letter.pdf
- FOUND: 03f3aa3 (Task 1 commit)
- FOUND: 6486840 (Task 2 commit)
- FOUND: 6ad641b (Task 3 commit)
