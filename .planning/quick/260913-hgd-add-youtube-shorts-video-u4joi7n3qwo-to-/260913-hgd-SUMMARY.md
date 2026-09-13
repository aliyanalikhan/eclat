# Quick Task 260913-hgd — Summary

**Description:** Add YouTube Shorts video (`U4jOI7N3qwo`) to the Videos section, and change the closing
"One subscription" CTA heading from "Everything, always, / including what's next" to
"Our stories, our voice, our eclate / Come belong".

**Date:** 2026-09-13
**Status:** complete

## Changes

| File | Change |
|------|--------|
| [`src/data/content.js`](src/data/content.js:329) | Appended a new entry to the `videos` array: `slug: 'our-stories-our-voice-our-eclat'`, `youtubeId: 'U4jOI7N3qwo'` (parsed from `youtube.com/shorts/U4jOI7N3qwo`), kicker `Our Stories · Éclat`, title `Our Stories, Our Voice, Our Éclat`, dek `Come belong — the Éclat story in its own voice.`, source `Éclat`. |
| [`src/routes/Home.jsx`](src/routes/Home.jsx:404) | Closing CTA `<h2 id="cta-h">` reworded to `Our stories, our voice, our eclate` + italic `Come belong` (line 1 plain, line 2 in `<em>`, matching the prior two-line structure). |
| [`Eclat.dc.html`](Eclat.dc.html:195) | Design-canvas mirror of the same closing CTA `<h2>` updated to the identical wording. |

## Notes

- The video ID `U4jOI7N3qwo` was extracted directly from the supplied Shorts URL
  (`https://youtube.com/shorts/U4jOI7N3qwo`). No URL query parameters were stored.
- The new video card renders through the existing, unmodified [`Videos.jsx`](src/routes/Videos.jsx:105)
  map — thumbnail from `i.ytimg.com` and click-to-play `youtube-nocookie.com` modal — so no
  component, CSS, or CSP change was required.
- Card metadata (title/dek/kicker/source) was supplied by the user, since the video itself could
  not be viewed from this environment.
- The `Eclat.dc.html` CSS diagnostics reported by the editor on save are pre-existing and stem from
  the design-canvas `{{ ... }}` mustache placeholders being misparsed as CSS; the single edited
  line contains no CSS and the file is not part of the Vite build graph.

## Verification

- `npm run build:client` → **green** (63 modules transformed, built in 1.03s).
- `npm run build` (full) was not run: it begins with `scripts/migrate.js`, which requires a live
  database; `build:client` covers the JSX/data edits made here.
