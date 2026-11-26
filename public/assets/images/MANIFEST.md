# Image manifest

Every path below is referenced by `src/data/content.js`. **All of them are optional.**

Each slot is rendered by `src/components/Cover.jsx`, which paints the edition's
`tint` colour on the `<figure>` itself and fades the `<img>` in over it once the
file loads. If a file is absent the `onError` handler drops the `<img>` and the
tint remains — so a missing image reads as a deliberate editorial colour block,
never a broken-image icon.

That means you can ship today and add photography incrementally: drop a file at
the path below and it appears on the next page load, with no code change.

---

## Covers — `covers/` · natural cover ratio (see `ratio` field per edition)

| File | Edition |
|---|---|
| `covers/no-4-eclat-vol-4.jpg` | No. 4 — The Legacy of Giving (Dec 2026) |
| `covers/no-2-eclat-vol-2.jpg` | No. 2 — The Power of Vision (Sep 2026) |
| `covers/no-1-eclat-vol-1.jpg` | No. 1 — The New Architect of Modern Living (Maiden Edition) |

> Note: the cover plate (wordmark, issue number, title) is normally drawn in HTML
> **over** the image — supply covers without type baked in. When a cover's art
> already carries its own type (as both real covers do), set
> `plateSuppressed: true` on that entry in `content.js` instead, so the HTML
> plate is skipped for that item alone. Each real cover also carries its own
> `ratio`/`w`/`h` rather than a forced 3:4 crop, since neither source cover is
> exactly that ratio and object-fit: cover would otherwise crop into printed
> coverlines near the edges.

## Feature photos — `features/` · 1600 × 1200 (4:3)

| File | Article |
|---|---|
| `features/the-frequency-of-success.jpg` | The Frequency of Success |
| `features/nollywoods-new-wave.jpg` | Nollywood’s New Wave |
| `features/why-african-money-does-not-become-capital.jpg` | Why African Money Does Not Become Capital |
| `features/essence-over-excess.jpg` | Essence Over Excess |
| `features/a-minneapolis-city-guide.jpg` | A Minneapolis City Guide |
| `features/ladidier-bridal-elegance-reimagined.jpg` | Elegance Reimagined |

No. 4 preview pages: `magazine-preview/4/page-01.jpg` … `page-100.jpg` (1400 px wide, 100 pages).

## Books — `books/` · natural cover ratio (see `ratio` field per book)

| File | Title |
|---|---|
| `books/heir-to-the-obi.jpg` | Heir to the Obi |
| `books/under-the-baobab.jpg` | Under the Baobab |
| `books/african-folklores.jpg` | African Folklores — As Told by My Grandmother |
| `books/we-come-from-kings.jpg` | We Come From Kings |

> Both are real cover art with type baked in (`plateSuppressed: true`), each at
> its own natural aspect ratio rather than a forced 1:1 crop — see the `ratio`/
> `w`/`h` fields on each entry in `content.js`.

## Writings — `writings/` · 1200 × 800 (3:2)

| File | Piece |
|---|---|
| `writings/on-rebuilding-slowly.jpg` | On Rebuilding Slowly |
| `writings/the-bakery-on-the-square.jpg` | The Bakery on the Square |
| `writings/letters-to-the-meadow.jpg` | Letters to the Meadow |
| `writings/night-shift.jpg` | Night Shift |
| `writings/a-short-history-of-the-long-table.jpg` | A Short History of the Long Table |
| `writings/cold-water.jpg` | Cold Water |

## No. 48 preview spreads — `samples/no-48/` · mixed ratios

| File | Ratio | Suggested |
|---|---|---|
| `samples/no-48/spread-02-03-orchard-road.jpg` | 16:10 | 1920 × 1200 |
| `samples/no-48/page-07-portrait.jpg` | 3:4 | 1200 × 1600 |
| `samples/no-48/spread-08-09-the-ovens.jpg` | 16:10 | 1920 × 1200 |
| `samples/no-48/page-11-still-life.jpg` | 3:4 | 1200 × 1600 |
| `samples/no-48/spread-12-13-market.jpg` | 16:10 | 1920 × 1200 |
| `samples/no-48/page-16-letters.jpg` | 3:4 | 1200 × 1600 |
| `samples/no-48/page-18-end-of-preview.jpg` | 4:5 | 1200 × 1500 |

## Social card — `og/`

| File | Size | Notes |
|---|---|---|
| `og/eclat-default.webp` | 1200 × 630 | Currently the 639 × 395 prototype thumbnail. **Replace before launch** — it is below the size most platforms crop to. |

---

## Alt text

Alt text lives beside the content in `src/data/content.js` (the `alt` field on
samples and articles; covers and books derive theirs from the title). Update it
there when you supply real photography — the placeholder descriptions were
written against imagined images.
