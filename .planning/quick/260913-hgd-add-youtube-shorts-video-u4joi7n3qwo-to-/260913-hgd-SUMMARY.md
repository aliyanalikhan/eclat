# Quick Task 260913-hgd — Summary

**Description:** Add YouTube Shorts video (`U4jOI7N3qwo`) to the Videos section, and change the closing
"One subscription" CTA heading from "Everything, always, / including what's next" to
"Our stories, our voice, our Éclat. / Come belong."

**Date:** 2026-09-13
**Status:** complete

## Changes

| File | Change |
|------|--------|
| [`src/data/content.js`](src/data/content.js:330) | Appended a new entry to the `videos` array: `slug: 'yemi-osinbajo-speech'`, `youtubeId: 'U4jOI7N3qwo'` (parsed from `youtube.com/shorts/U4jOI7N3qwo`), kicker `World Voices · Leadership`, title `This Prof. Yemi Osinbajo Speech Will Make You Stop and Think!`, dek describing the Osinbajo speech, source `ATILOYE GLOBAL TV`. Title and channel name fetched live from YouTube's oEmbed endpoint (`youtube.com/oembed`). |
| [`src/routes/Home.jsx`](src/routes/Home.jsx:404) | Closing CTA `<h2 id="cta-h">` reworded to `Our stories, our voice, our Éclat.` + italic `Come belong.` (line 1 plain, line 2 in `<em>`, matching the prior two-line structure; brand styled with the accented `É` and both lines end-punctuated). |
| [`Eclat.dc.html`](Eclat.dc.html:195) | Design-canvas mirror of the same closing CTA `<h2>` updated to the identical wording. |

## Notes

- The video ID `U4jOI7N3qwo` was extracted directly from the supplied Shorts URL
  (`https://youtube.com/shorts/U4jOI7N3qwo`). No URL query parameters were stored.
- The card title and `source` credit are the real, fetched values from YouTube oEmbed
  (`title: "This Prof. Yemi Osinbajo Speech Will Make You Stop and Think!"`,
  `author_name: "ATILOYE GLOBAL TV"`), not placeholders. The `kicker`/`dek` remain Éclat's
  own editorial framing around the real subject.
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
