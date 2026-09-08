# Éclat

A quarterly magazine site — the complete archive, the children's books, and the essays.

Built as a prerendered React SPA: every route ships complete HTML on first byte,
then hydrates. No build-time secrets, no server, no database.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
npm run preview    # serve dist/ exactly as a static host would
```

---

## What this is

The site began as a single-file prototype (`Eclat.dc.html` + `support.js`) in an
`<x-dc>` template format that fetched React, ReactDOM and Babel-standalone from a
CDN and transpiled itself in the browser on every page load. Those two files are
still in the repo root for reference; nothing in the build reads them.

This version keeps that design and replaces the delivery mechanism.

| | Prototype | Now |
|---|---|---|
| JS to first paint | ~3 MB from unpkg, incl. in-browser Babel | 74 KB gzipped, self-hosted |
| Content without JS | none — blank page | full HTML, every route |
| URLs | one; all 7 views were client state behind `href="#"` | 19 real, linkable URLs |
| `<head>` | no title, description, canonical or social tags | per-route, baked in at build |
| Mobile nav | 5 links + button overflowing the bar | disclosure menu under 900px |
| Lightbox | click-to-close div | focus-trapped dialog, Esc, restore |

## Routes

`/` · `/archive` · `/editions/37…48` · `/books` · `/writings` · `/subscribe` ·
`/account` · `404.html`

Archive filters live in the query string (`/archive?year=2025&sort=old`) so a
filtered view can be linked.

## Build pipeline

`npm run build` runs three steps:

1. `vite build` — client bundle + `dist/index.html` template
2. `vite build --ssr src/entry-server.jsx` — a `render(url)` function
3. `node prerender.js` — renders each route from `src/data/seo.js`, bakes that
   route's `<head>` in, writes `dist/<route>/index.html`, emits `sitemap.xml`,
   and deletes the SSR bundle

`dist/` afterwards is exactly the set of files to deploy.

Routes are deliberately **not** code-split with `React.lazy`: prerendering renders
the whole tree to a string, and lazy boundaries would emit fallbacks instead of
content. The app chunk is 48 KB raw, so splitting would trade correctness for
nothing.

### Adding a route

1. Add the component under `src/routes/` and a `<Route>` in `src/App.jsx`
2. Add its `<head>` metadata to `staticSeo` in `src/data/seo.js`

Step 2 is what puts it in the prerender pass and the sitemap. Miss it and the
route still works client-side but ships no HTML and won't be indexed.

## The hero fan

The five covers open from a tight stack to a full arc as the hero scrolls, driven
by a rAF loop in `src/lib/motion.js`.

Two things are worth knowing before editing it:

- **The fit is closed-form.** The loop solves the scale that makes the fan fill
  the band between the copy and the fold, then seats it so the lowest card lands
  on that line. The prototype instead nudged a `fanShift` accumulator toward a fit
  each frame, which re-measured five card rects per frame and only converged after
  many frames — so the first paint was always wrong.
- **Side titles are veiled at rest.** At the resting spread the cards sit ~65px
  apart while being 230px wide, so a neighbour would cut each title mid-word
  (`Pape·Bird`). `.fan-card__veil` starts them at `opacity: 0` in CSS — not
  inline, so the prerendered HTML is already veiled and they never flash — and the
  loop fades them in once the gap clears the text.

`verify-hero.mjs` drives a real Chrome over CDP and reports card geometry, gaps
and title opacity at rest and fully open. Use it after touching the hero:

```bash
npm run build && npm run preview &
node verify-hero.mjs                      # default 1526x877
VW=1366 VH=640 node verify-hero.mjs       # short laptop viewport
REDUCED=1 node verify-hero.mjs            # prefers-reduced-motion
```

It writes `hero-rest.png` / `hero-open.png` alongside the numbers. Watch for
`pastFold` and `collision` — both should read `none`/`no` at every size.

## Images

Every image slot is empty. **This is a working state, not a broken one.**

`src/components/Cover.jsx` paints the edition's `tint` on the `<figure>` and fades
an `<img>` in over it. When the file is missing, `onError` drops the `<img>` and
the tint remains — so unsupplied slots read as deliberate colour blocks rather
than broken-image icons.

Drop a file at the path listed in `public/assets/images/MANIFEST.md` and it
appears on the next load, no code change. Alt text lives beside the content in
`src/data/content.js`.

Two things to do before launch, both listed in the manifest:

- replace `og/eclat-default.webp` (currently the 639×395 prototype thumbnail —
  below the 1200×630 most platforms crop to)
- once covers exist, point `editionSeo().og` at `ed.img` in `src/data/seo.js` for
  per-edition social cards

## The subscribe flow is a demo

`/subscribe` selects a plan and previews the subscriber view. The card fields are
in a `disabled` `<fieldset>`, nothing is read from them, and no request is made —
the step-2 notice says so on the page. "Subscribed" is a boolean in
`localStorage`, resettable from `/account`.

The prototype collected card numbers into nothing. If you want real payments,
replace the step-2 form with a redirect to a hosted checkout so card details are
never entered on this origin.

## Before you go live

- [ ] Set the real domain in `src/data/seo-site.js` (`SITE.url`) and
      `public/robots.txt`. Canonicals, `og:url` and the sitemap all derive from it.
- [ ] Replace the OG image (see above)
- [ ] Add `public/apple-touch-icon.png`, `icon-192.png`, `icon-512.png` —
      referenced by `index.html` and `site.webmanifest`, currently absent
- [ ] Confirm the pricing, renewal dates and "Reader since 2021" copy
- [ ] Decide on real payments, or keep the demo notice

## Hosting

`dist/` is static. It needs one thing from the host: `/archive` must resolve to
`/archive/index.html`.

| Host | Notes |
|---|---|
| Netlify, Cloudflare Pages | Works as-is. `public/_headers` is picked up; `404.html` is automatic. |
| Vercel | `vercel.json` included (`cleanUrls`). |
| GitHub Pages | Works as-is, including `404.html`. |
| nginx | `try_files $uri $uri/index.html $uri/ /404.html;` |
| S3 + CloudFront | Needs a viewer-request function to append `index.html` to directory paths. |

`npm run preview` reproduces this behaviour, including the 404 status — Vite's
default SPA fallback does not, which is worth knowing if you swap the preview
command out.

## Accessibility

Skip link, single `<h1>` per route, landmark regions, visible focus rings,
`aria-pressed` on the filter and plan toggles, `aria-live` on archive result
counts, a focus-trapped lightbox with Esc and focus restore, and full
`prefers-reduced-motion` support (the rAF loop doesn't start, the hero fan
settles, reveals show immediately).

Not yet verified: screen-reader passes and contrast audit of the tinted covers
once real photography replaces the flat colours — text sits directly on those
images, so check contrast per photo.
