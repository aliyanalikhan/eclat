---
phase: quick-260910-vid
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/routes/Home.jsx
  - src/data/content.js
  - src/routes/Videos.jsx
  - src/data/seo.js
  - src/App.jsx
  - src/components/Header.jsx
  - src/styles/eclat.css
  - vercel.json
  - public/_headers
autonomous: true
requirements: []

estimate:
  tokens: 60000
  raw_tokens: 60000
  tasks: 3
  confidence: medium

must_haves:
  truths:
    - "The homepage hero fan carousel shows only magazine editions — no children's book covers appear interleaved in the rotating spread."
    - "Every magazine edition has a real, shareable per-edition URL (verified this already existed at /editions/:no — no change needed)."
    - "A new /videos route renders all 8 user-supplied YouTube links as clickable cards, each showing a real thumbnail and a title/description grounded in the video's actual (oEmbed-verified) content, not a guess."
    - "Clicking a video card opens an inline player (not an external redirect) and the CSP allows the youtube-nocookie.com embed and the i.ytimg.com thumbnail without loosening any other directive."
    - "The route is registered in all three places CLAUDE.md flags as needing to stay in sync (App.jsx, seo.js staticSeo/allRoutes, and therefore prerender.js), confirmed via a full build."
  artifacts:
    - src/routes/Videos.jsx
    - src/data/content.js (videos export)
  key_links:
    - "Cover's img prop accepts any URL, including the external https://i.ytimg.com thumbnail CDN — no new component needed, just a CSP img-src extension."
    - "The video modal is local component state, not routed through the global store-driven Lightbox — its payload (an iframe) doesn't fit that component's img-only contract, so it reuses only the shared .lightbox/.lightbox__close/.lightbox__hint CSS classes, not the component or store."
  prohibitions:
    - "Must not source or generate real photographic likenesses of Michael Jackson, Marilyn Monroe, or Michael Jordan for the separately-requested poster/decoration ask — copyright, likeness/publicity rights, and deepfake-risk concerns around real, still-actively-managed people. Flag to the user instead of silently fabricating or skipping."
---

<objective>
Three requests from one large user message, scoped down to what was concretely actionable:

1. Separate children's books from magazines — found the actual mixing site (Home.jsx's hero fan carousel interleaves `editions` and `books`), not the vague "this place" the user described; Archive.jsx already only shows editions.
2. Per-edition magazine URLs — already existed (`/editions/:no`, wired since Phase 4); no code change, just confirm and inform.
3. A new Videos section for 8 supplied YouTube links, each explained in terms of what it actually shows (fetched via YouTube's public oEmbed endpoint rather than guessed), framed around American culture/history, with a thumbnail that plays the video on click.

A 4th request (poster images of Michael Jackson/Marilyn Monroe/Michael Jordan for decoration) was explicitly declined — see prohibitions — and reported back rather than silently dropped.

Output: Home.jsx hero fan restricted to editions; new /videos route with 8 real, oEmbed-grounded video cards and a click-to-play modal; CSP updated to allow the embed and thumbnail; route registered everywhere CLAUDE.md requires.
</objective>
