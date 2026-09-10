---
phase: quick-260910-vid
plan: 1
subsystem: ui
tags: [content, routing, csp, video, home]

requires: []
provides:
  - Hero fan carousel on Home restricted to magazine editions only (was interleaving children's books)
  - New /videos route: 8 curated American-history/culture video cards, real YouTube titles via oEmbed
  - Click-to-play inline modal embedding youtube-nocookie.com, CSP updated in vercel.json + public/_headers
affects: []

tech-stack:
  added: []
  patterns:
    - "External image src (YouTube thumbnail CDN) through the existing Cover component — no local asset needed, CSP img-src extended instead"
    - "Route-local modal state (not the global store-driven Lightbox) when the payload shape genuinely differs (iframe vs img)"

key-files:
  created:
    - src/routes/Videos.jsx
  modified:
    - src/data/content.js
    - src/data/seo.js
    - src/App.jsx
    - src/components/Header.jsx
    - src/styles/eclat.css
    - src/routes/Home.jsx
    - vercel.json
    - public/_headers

key-decisions:
  - "Fetched real video titles/uploaders via YouTube's public oEmbed endpoint instead of guessing from URLs — confirmed link #4 was verbatim 'Breakdance During The 80's' matching the user's own example, giving confidence the other 7 titles are equally reliable."
  - "Kept the user-supplied Mandela clip (not American) but labeled it 'World Voices' rather than silently dropping it or mislabeling it as American culture."
  - "Video modal is local component state in Videos.jsx, not routed through the global store's image-only Lightbox — different payload shape (iframe vs img), avoids touching a shared, already-tested contract."
  - "Declined to source/generate real photographic posters of Michael Jackson, Marilyn Monroe, Michael Jordan (copyright/likeness/deepfake-risk concerns) — flagged to user instead of silently skipping or fabricating."

patterns-established:
  - "Reused .cards/.card grid (from Home's featured-articles section) for the video grid — zero new grid CSS."
  - "Scoped .lightbox__close contrast override (.video-modal .lightbox__close) rather than changing the shared rule other Lightbox instances rely on."

requirements-completed: []

duration: ~90min
completed: 2026-09-10
status: complete
---

# Quick Task 260910-vid: Videos Section + Hero Fan Separation Summary

**Split the homepage hero carousel to magazine-only, added a new `/videos` route with 8 curated American-history video cards (real YouTube titles fetched via oEmbed, not guessed), and confirmed per-edition magazine URLs already existed.**

## Performance

- **Duration:** ~90 min
- **Completed:** 2026-09-10
- **Files modified:** 8 modified, 1 created

## Accomplishments

- `Home.jsx`'s hero fan (`buildFan([...editions, ...books])`) changed to `buildFan(editions)` — the rotating hero spread no longer interleaves children's books with magazine covers; confirmed via prerendered build output (0 book image paths in the fan section).
- Confirmed (no code change needed): every magazine edition already has a real, shareable URL at `/editions/:no` (e.g. `/editions/1`, `/editions/2`), wired since Phase 4.
- New `videos` export in `content.js` — 8 entries with real titles/uploaders pulled from `https://www.youtube.com/oembed` (public, no API key), not fabricated from the URLs alone.
- New `src/routes/Videos.jsx` — a `.cards`/`.card` grid (reusing Home's existing featured-articles pattern, zero new grid CSS) showing each video's real YouTube thumbnail (`i.ytimg.com`) with a play-button affordance; clicking opens an inline modal embedding `youtube-nocookie.com` — nothing plays until clicked.
- Route wired into all three places CLAUDE.md flags as needing to stay in sync: `App.jsx` (`<Route path="/videos">`), `seo.js` (`staticSeo['/videos']`, automatically picked up by `allRoutes()`), confirmed via a full build (11 prerendered routes, `/videos` present in `sitemap.xml`).
- `Header.jsx` nav gets a "Videos" link.
- CSP updated in both `vercel.json` and `public/_headers` (previously `default-src 'self'` blocked everything needed): added `frame-src https://www.youtube-nocookie.com` and extended `img-src` with `https://i.ytimg.com`.
- `eclat.css`: minimal new CSS — a 16:9 video modal frame (image lightbox's frame is photo-ratio), a play-button overlay layer, and a scoped `.lightbox__close` contrast override for this modal (the shared style relies on photo content behind it for contrast, which a flat-black video frame doesn't have).

## Task Commits

1. `50dc6af` — fix(home): keep the hero fan strictly to magazine covers
2. `378e1e6` — feat: add a Videos section — American speeches and culture on YouTube

## Issues Found and Fixed During Browser Verification

Per CLAUDE.md's UI-change convention, started the dev server and exercised the feature live rather than trusting the build alone. Found and fixed two real bugs before considering this done:

1. **Play-button overlay invisible** — `Cover`'s internal `.cover__img` has `z-index: 1`; my overlay `<span>` had `z-index: auto`, so it painted underneath the thumbnail image on every card. Fixed with an explicit `z-index: 2`.
2. **Escape-to-close doesn't reliably work** — the embedded YouTube iframe grabs focus (confirmed via `document.activeElement` immediately after opening), and a cross-origin iframe's keydown events never reach the parent document's listener. Backdrop-click still closes reliably (verified with a real mouse click, not just a programmatic one) and is now the primary documented affordance — the modal's hint text was written to say "Click anywhere outside the video to close" rather than overclaiming Esc support the way the image lightbox's hint does. Also fixed the close button's contrast (was rgba dark-on-dark, nearly invisible against the flat-black video frame) with a scoped override.

## Deviations from Plan

This was executed directly (no sub-agent planner/executor spawn) given the scope was already well-understood from direct codebase inspection and real oEmbed data-gathering before any code was written — see the conversation for the discovery work (reading `content.js`/`Home.jsx`/`Archive.jsx` to find the actual mixing bug, confirming per-edition URLs already existed, fetching all 8 real video titles). Atomic commits and browser-verified testing were preserved per the quick-task guarantee.

## Not Done — Explicitly Declined

**Poster images of American icons (Michael Jackson, Marilyn Monroe, Michael Jordan) for decoration.** Declined to source or generate real photographic likenesses of these specific, still-actively-managed real people — copyright (photo licensing), likeness/publicity rights (all three estates/individuals are litigious about unauthorized commercial use of their image), and deepfake-risk concerns around AI-generating realistic depictions of real people. Flagged to the user with alternative directions (stylized/typographic treatment matching the Gettysburg Address scroll example they provided themselves, or the user supplying their own licensed images) rather than silently skipping or fabricating.

## User Setup Required

None — no new env vars, no new dependencies, no schema changes. `PUBLIC_ORIGIN`/DB/Stripe/Google config already covered by prior phases.

## Next Steps

- The Mandela clip is the one video not thematically "American culture" as literally requested — kept because the user supplied the link directly, labeled "World Voices" instead of folded into the American framing. User may want it removed or the section retitled if that reads as inconsistent.
- Poster-image decoration request needs a decision from the user (see "Not Done" above) before any further work there.
- Not deployed — this is local-only; user handles push/deploy separately per their own workflow.

---
*Quick task: 260910-vid*
*Completed: 2026-09-10*

## Self-Check: PASSED

- FOUND: `src/routes/Videos.jsx`
- FOUND: `src/data/content.js` (videos export)
- FOUND: `src/App.jsx` (/videos route)
- FOUND: `src/data/seo.js` (/videos staticSeo entry)
- FOUND: `src/components/Header.jsx` (Videos nav link)
- FOUND: `vercel.json` + `public/_headers` (CSP frame-src/img-src)
- FOUND commit: `50dc6af`
- FOUND commit: `378e1e6`
- Build verified: 11 routes prerendered, `/videos` in sitemap.xml, `check-secrets` clean
- Browser-verified: thumbnails load, play button visible, modal opens and plays, backdrop-click closes reliably
