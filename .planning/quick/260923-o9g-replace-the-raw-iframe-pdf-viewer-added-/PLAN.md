---
phase: quick-260923-o9g
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - public/assets/images/writings/immortal-beloved.jpg
  - public/assets/images/writings/immortal-beloved-p2.jpg
  - public/assets/images/writings/immortal-beloved-p3.jpg
  - public/assets/images/writings/the-poetical-science.jpg
  - public/assets/images/writings/the-poetical-science-p2.jpg
  - public/assets/images/writings/the-confession.jpg
  - public/assets/images/writings/come-here-i-want-to-see-you.jpg
  - public/assets/images/writings/come-here-i-want-to-see-you-p2.jpg
  - public/assets/images/writings/come-here-i-want-to-see-you-p3.jpg
  - public/assets/images/writings/two-minds-one-idea.jpg
  - public/assets/images/writings/two-minds-one-idea-p2.jpg
  - public/assets/images/writings/two-minds-one-idea-p3.jpg
  - public/assets/images/writings/the-einstein-szilard-letter.jpg
  - public/assets/images/writings/the-einstein-szilard-letter-p2.jpg
  - src/data/content.js
  - src/routes/Writing.jsx
  - src/routes/Writings.jsx
  - src/components/Lightbox.jsx
  - src/styles/eclat.css
autonomous: true
requirements: []

estimate:
  tokens: 55000
  raw_tokens: 55000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Clicking any of the 6 letter entries (immortal-beloved, the-poetical-science, the-confession, come-here-i-want-to-see-you, two-minds-one-idea, the-einstein-szilard-letter) on /writings opens the same dark-overlay Lightbox modal used for the-gettysburg-address, showing the letter's real rasterized first page as a designed document image — not a flat tint rectangle and not a raw browser PDF viewer."
    - "For the 5 letters with more than one PDF page, the open Lightbox shows Prev/Next controls and a 'Page X of Y' indicator letting the reader step through every rasterized page of that letter; Prev disables on page 1, Next disables on the last page."
    - "/writings/the-gettysburg-address and /writings/the-confession (a genuinely single-page letter) open the Lightbox with no page controls and no page indicator, identical DOM shape to today's single-image behavior."
    - "The Writings index (/writings) shows a real thumbnail image (the letter's rasterized first page) for all 6 letter entries instead of a flat tint-color placeholder rectangle."
    - "/writings/<slug> detail pages for all 6 PDF-backed entries no longer render a raw embedded document viewer — the page reverts to the same plain prose/body rendering the-gettysburg-address has always used."
    - "Swiping left/right on a multi-page Lightbox item on a touch device turns pages; swiping down still closes the modal exactly as it does today."
  artifacts:
    - "public/assets/images/writings/immortal-beloved.jpg, -p2.jpg, -p3.jpg (3 pages)"
    - "public/assets/images/writings/the-poetical-science.jpg, -p2.jpg (2 pages)"
    - "public/assets/images/writings/the-confession.jpg (1 page, no -pN siblings)"
    - "public/assets/images/writings/come-here-i-want-to-see-you.jpg, -p2.jpg, -p3.jpg (3 pages)"
    - "public/assets/images/writings/two-minds-one-idea.jpg, -p2.jpg, -p3.jpg (3 pages)"
    - "public/assets/images/writings/the-einstein-szilard-letter.jpg, -p2.jpg (2 pages)"
    - "src/data/content.js — writings array: 6 non-Gettysburg entries get real ratio/w/h (1224/1584, 1224, 1224x1584 raster) and a pages array where page count > 1; the-gettysburg-address entry byte-unchanged"
    - "src/routes/Writing.jsx — reverted to plain body/dek prose rendering only, no embedded document viewer"
    - "src/routes/Writings.jsx — passes the entry's rasterized page list into the Lightbox open call"
    - "src/components/Lightbox.jsx — supports an optional multi-image mode (Prev/Next buttons, keyboard arrows, horizontal swipe, page indicator) with zero behavior change when only one image is present"
    - "src/styles/eclat.css — new .lightbox__navbtn / .lightbox__pageindicator rules"
  key_links:
    - "content.js's trailing .map((w) => ({ ...w, img: `/assets/images/writings/${w.slug}.jpg` })) already builds img generically from slug — Cover.jsx (list thumbnail) picks up the new page-1 rasters with zero code changes once the files exist at the right paths."
    - "store.jsx's openLightbox(item, rect) stores whatever object is passed verbatim into lightbox state — passing a new images field from Writings.jsx requires zero store.jsx changes."
    - "Writings.jsx is the only openLightbox caller gaining the new images field; Books.jsx and Edition.jsx's existing openLightbox calls (no images field) continue to hit Lightbox.jsx's untouched single-image path."
---

<objective>
Replace the raw embedded-document-viewer approach added by the prior quick task with the user's actual request: rasterize each of the 6 archival-letter PDFs' real pages into JPG images (via PyMuPDF), show them inside the site's existing Lightbox modal (the same polished popup already used for the-gettysburg-address), and give multi-page letters Prev/Next paging inside that popup. Also give every letter a real designed-page thumbnail on the /writings list instead of a flat tint rectangle.

Concretely: run a one-off Python (PyMuPDF + Pillow fallback) rasterization pass turning each of the 6 PDFs' pages into JPGs under `public/assets/images/writings/`; update the 6 corresponding entries in `src/data/content.js` with real page-1 pixel dimensions and a `pages` array for every letter with more than one page; remove the browser-native embedded document viewer block from `src/routes/Writing.jsx` entirely, reverting it to the same unconditional body/dek prose rendering the-gettysburg-address already uses; and extend `src/components/Lightbox.jsx` with an optional multi-page mode (Prev/Next buttons, ArrowLeft/ArrowRight keys, horizontal swipe-to-turn-page, "Page X of Y" indicator) that only activates when an item's `images` array has more than one entry, wired up from `src/routes/Writings.jsx`.

Purpose: the user explicitly rejected the raw browser-native PDF viewer approach and asked for "all pdf should show like this popup of this speech not in a pdf viewer also on letter list there should be a thumbnails of letters" — this plan delivers exactly that, using the user's chosen approach (rasterize real PDF pages into images, no AI-generated artwork, no new parchment-reader component).
Output: 14 new rasterized page JPGs; `content.js` writings entries carrying accurate dimensions and page lists; `Writing.jsx` reverted to plain prose; `Lightbox.jsx` + `Writings.jsx` + `eclat.css` delivering a multi-page Lightbox experience for every letter, single-image behavior fully preserved for every existing caller.
</objective>

<execution_context>
@get-shit-done/workflows/execute-plan.md
@get-shit-done/templates/summary.md
</execution_context>

<context>
@src/data/content.js
@src/routes/Writing.jsx
@src/routes/Writings.jsx
@src/components/Lightbox.jsx
@src/store.jsx
@src/styles/eclat.css

Confirmed current state (already read in full during planning — do not re-read beyond what's needed to apply the edits):

- `public/assets/documents/writings/*.pdf` — all 6 PDFs already committed by the prior quick task. Confirmed via direct PyMuPDF inspection during planning that every page of every one of these 6 PDFs is a uniform US-Letter portrait page, 612.0 x 792.0 points, with these exact page counts: `immortal-beloved.pdf` = 3, `the-poetical-science.pdf` = 2, `the-confession.pdf` = 1, `come-here-i-want-to-see-you.pdf` = 3, `two-minds-one-idea.pdf` = 3, `the-einstein-szilard-letter.pdf` = 2. At a 2x rasterization matrix (~144dpi) every page-1 raster is therefore expected to be exactly 1224x1584 pixels — Task 1's script must still read this from the actual `Pixmap.width`/`Pixmap.height` it produces (not hardcode it), since it's the thing being verified, but do not be surprised if every value comes out identical — that is expected given the uniform source page size.
- `public/assets/images/writings/` already exists and currently holds only `the-gettysburg-address.jpg` and a `.gitkeep` — no directory creation needed, just add files.
- `src/data/content.js` lines 94-198: the `writings` array, 7 entries, each shaped `{ slug, title, type, year, dek, [body], tint, ratio, w, h, [pdf] }`, followed by a trailing `.map((w) => ({ ...w, img: \`/assets/images/writings/${w.slug}.jpg\` }))`. The 6 non-Gettysburg entries currently hold placeholder `ratio: '3/2', w: 1200, h: 800,` (landscape values that do not match these portrait PDFs) immediately followed by their `pdf: '/assets/documents/writings/<slug>.pdf',` line. `the-gettysburg-address` (lines 132-146) has no `pdf` field and must stay completely untouched.
- `src/routes/Writing.jsx` — the detail-page block to remove is the conditional rendering keyed on the entry's `pdf` field (currently lines 43-61), sitting between the `<h1>` title and the `.prose` block. Removing it restores the file to unconditional `.prose` rendering only (body paragraphs when present, `dek` fallback otherwise) for every entry, exactly as it behaved before the prior quick task.
- `src/routes/Writings.jsx` list page: `onClick` currently calls `openLightbox({ tint: w.tint, img: w.img, label: w.title, alt: ..., ratio: w.ratio || '3/2' }, rect)`. This object needs one additive field so the Lightbox can page through a letter's full rasterized page set.
- `src/components/Lightbox.jsx` (127 lines) — consumes `lightbox` state shaped `{ tint, img, label, alt, ratio }` via `useApp()`, renders one `<img>` inside `<figure data-lb-frame="1" className="lightbox__frame">`, has an Escape-closes + Tab-trapped-to-close-button keydown effect, and a touch handler that closes on a >60px predominantly-vertical downward swipe. This is the only file needing new interactive state.
- `src/store.jsx` — `openLightbox(item, rect)` stores `item` verbatim into `lightbox` state; fully generic, confirmed via read, needs zero changes.
- Other `openLightbox` callers confirmed via grep — `src/routes/Books.jsx` and `src/routes/Edition.jsx` both call it with only `{ tint, img, alt, label, ratio }`, no images/pages field. Adding an optional field to the lightbox item shape is purely additive and does not affect these call sites.
- `src/styles/eclat.css` lines 1974-2058 hold the `/* --- lightbox --- */` block: `.lightbox`, `.lightbox__frame`, `.lightbox__frame::after`, `.lightbox__caption`, `.lightbox__close`, `.lightbox__close:hover`, `.lightbox__hint`, immediately followed by the `/* --- video section --- */` block. New page-nav rules belong in this block, before the video-section comment.
- CSP (`vercel.json`, `public/_headers`) is explicitly out of scope for this plan — do not touch either file.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rasterize all 6 PDFs into real page images via PyMuPDF</name>
  <files>public/assets/images/writings/immortal-beloved.jpg, public/assets/images/writings/immortal-beloved-p2.jpg, public/assets/images/writings/immortal-beloved-p3.jpg, public/assets/images/writings/the-poetical-science.jpg, public/assets/images/writings/the-poetical-science-p2.jpg, public/assets/images/writings/the-confession.jpg, public/assets/images/writings/come-here-i-want-to-see-you.jpg, public/assets/images/writings/come-here-i-want-to-see-you-p2.jpg, public/assets/images/writings/come-here-i-want-to-see-you-p3.jpg, public/assets/images/writings/two-minds-one-idea.jpg, public/assets/images/writings/two-minds-one-idea-p2.jpg, public/assets/images/writings/two-minds-one-idea-p3.jpg, public/assets/images/writings/the-einstein-szilard-letter.jpg, public/assets/images/writings/the-einstein-szilard-letter-p2.jpg</files>
  <precondition>python3 (or python) on PATH can `import fitz` (PyMuPDF) and `import PIL` (Pillow) — confirmed working in this exact environment immediately before this plan was written; if either import fails, halt and report rather than guessing an install method.</precondition>
  <action>
Run a single one-off Python script via the Bash tool's inline `python -c` or a `python - <<'PY' ... PY` heredoc — do not save it as a tracked file anywhere in the repo, and delete any temp `.py`/`.png` scratch file it leaves behind before finishing this task. The script must, for each of the 6 slugs (`immortal-beloved`, `the-poetical-science`, `the-confession`, `come-here-i-want-to-see-you`, `two-minds-one-idea`, `the-einstein-szilard-letter`) with their expected page counts (3, 2, 1, 3, 3, 2 respectively):

Open `public/assets/documents/writings/<slug>.pdf` with `fitz.open`, assert `doc.page_count` equals the expected count for that slug (fail loudly and stop if it doesn't — that would mean the source PDF changed since planning), then for every page in the document render a pixmap via `page.get_pixmap(matrix=fitz.Matrix(2, 2), colorspace=fitz.csRGB)` — the 2x matrix targets ~144dpi crispness, the explicit RGB colorspace avoids CMYK/indexed-colorspace save failures on scanned archival facsimiles. Save page index 0's pixmap to `public/assets/images/writings/<slug>.jpg` (this overwrites nothing — only `the-gettysburg-address.jpg` currently exists in that directory) and every subsequent page index N (1-based page number N+1) to `public/assets/images/writings/<slug>-p{N+1}.jpg`, e.g. page index 1 becomes `<slug>-p2.jpg`, page index 2 becomes `<slug>-p3.jpg`.

For every page, first attempt `pixmap.save(path)` directly (PyMuPDF can usually infer JPEG output from the `.jpg` extension). If that raises any exception, fall back to saving the same pixmap to a sibling `.png` path, opening it with `PIL.Image.open(...).convert('RGB')`, saving it to the real `.jpg` destination with `quality=85`, then deleting the intermediate `.png`. Apply this same try/direct-save-then/Pillow-fallback logic uniformly to every page of every letter, not just the ones that might need it — the two code paths must produce byte-equivalent final `.jpg` files at the same destination paths either way.

After processing all 6 PDFs, have the script print, per slug, the page count it processed and page index 0's `pixmap.width`/`pixmap.height` — this is how the real page-1 raster pixel dimensions get confirmed for Task 2 (expected to be 1224x1584 for every slug given the uniform 612x792pt source pages, but read the actual values the script reports rather than assuming).
  </action>
  <verify>
    <automated>python -c "import os,fitz
from PIL import Image
d='public/assets/images/writings'
expect={'immortal-beloved':3,'the-poetical-science':2,'the-confession':1,'come-here-i-want-to-see-you':3,'two-minds-one-idea':3,'the-einstein-szilard-letter':2}
missing=[]
for s,n in expect.items():
    files=[f'{s}.jpg']+[f'{s}-p{i}.jpg' for i in range(2,n+1)]
    for fn in files:
        p=os.path.join(d,fn)
        if not os.path.isfile(p) or os.path.getsize(p)==0:
            missing.append(p)
mismatches=[s for s,n in expect.items() if fitz.open(f'public/assets/documents/writings/{s}.pdf').page_count!=n]
w,h=Image.open(os.path.join(d,'immortal-beloved.jpg')).size
w2,h2=Image.open(os.path.join(d,'the-confession.jpg')).size
ok=(not missing) and (not mismatches) and (w,h)==(1224,1584) and (w2,h2)==(1224,1584)
print('missing:',missing,'mismatches:',mismatches,'dims1:',(w,h),'dims2:',(w2,h2))
print('PASS' if ok else 'FAIL')
" | grep -q '^PASS$'</automated>
  </verify>
  <done>All 14 expected page JPGs exist under public/assets/images/writings/ with nonzero size, matching each PDF's real page count (3+2+1+3+3+2=14). Page-1 raster dimensions for at least two spot-checked slugs are exactly 1224x1584px. No stray .py/.png scratch files left in the repo.</done>
</task>

<task type="auto">
  <name>Task 2: Wire real dimensions + page arrays into content.js, revert Writing.jsx's document-viewer block</name>
  <files>src/data/content.js, src/routes/Writing.jsx</files>
  <action>
In `src/data/content.js`, for each of the 6 non-Gettysburg writings entries, replace its existing `ratio: '3/2',` / `w: 1200,` / `h: 800,` trio with `ratio: '1224/1584',` / `w: 1224,` / `h: 1584,` (the real page-1 raster dimensions produced by Task 1 — confirm against Task 1's actual printed output before applying; if any slug's real dimensions differ from 1224x1584, use that slug's actual reported value instead). Leave each entry's existing `pdf: '/assets/documents/writings/<slug>.pdf',` line exactly as it is — keep it, do not remove it, it stays as harmless metadata for a possible future "download original PDF" link.

Then, immediately after each entry's `pdf` line (and before its closing `},`), add a `pages` array field for every slug whose PDF has more than 1 page, listing every rasterized page path Task 1 produced, in order, starting with the same path already used for `img` (`/assets/images/writings/<slug>.jpg`) and continuing with `-p2.jpg`, `-p3.jpg` etc.: `immortal-beloved` gets 3 entries, `the-poetical-science` gets 2, `come-here-i-want-to-see-you` gets 3, `two-minds-one-idea` gets 3, `the-einstein-szilard-letter` gets 2. `the-confession` has exactly 1 page — it gets no `pages` field at all, mirroring how `the-gettysburg-address` has none today.

Do not touch `the-gettysburg-address` entry (its `body`, `tint`, `ratio: '1024/1536'`, `w: 1024`, `h: 1536` block) in any way — leave those lines byte-for-byte as they are. Do not alter any other export in this file (editions, books, articles, icons, videos, invoices, archiveYears, editionByNo, writingBySlug, SITE) or the trailing `.map((w) => ({ ...w, img: ... }))` line.

In `src/routes/Writing.jsx`, remove the entire conditional block that currently sits between the `<h1 className="display">{w.title}</h1>` line and the `<div className="prose">` block — the block gated on the entry's `pdf` field that renders an embedded document frame plus an "Open / download PDF" link. Delete it in full, leaving the file rendering the `<h1>` immediately followed by the unchanged `.prose` block (body paragraphs when `w.body` is non-empty, `dek` fallback otherwise) — this restores the exact structure the file had before the prior quick task, for every entry, PDF-backed or not.
  </action>
  <verify>
    <automated>COUNT_RATIO=$(grep -c "ratio: '1224/1584'," src/data/content.js); COUNT_W=$(grep -c "w: 1224," src/data/content.js); COUNT_H=$(grep -c "h: 1584," src/data/content.js); COUNT_P2=$(grep -c -- "-p2.jpg" src/data/content.js); COUNT_P3=$(grep -c -- "-p3.jpg" src/data/content.js); test "$COUNT_RATIO" -eq 6 && test "$COUNT_W" -eq 6 && test "$COUNT_H" -eq 6 && test "$COUNT_P2" -eq 5 && test "$COUNT_P3" -eq 3 && grep -q "ratio: '1024/1536'," src/data/content.js && grep -q "oklch(0.55 0.05 70)" src/data/content.js && ORDER=$(awk '/export const writings = \[/,/\]\.map\(\(w\)/' src/data/content.js | grep -oE "slug: '[a-z0-9-]+'" | sed -E "s/slug: '([a-z0-9-]+)'/\1/" | paste -sd, -) && test "$ORDER" = "immortal-beloved,the-poetical-science,the-confession,the-gettysburg-address,come-here-i-want-to-see-you,two-minds-one-idea,the-einstein-szilard-letter" && ! grep -q '<iframe' src/routes/Writing.jsx && grep -q "prose__open" src/routes/Writing.jsx && npm run build:client && echo PASS</automated>
  </verify>
  <done>All 6 non-Gettysburg entries in content.js carry ratio '1224/1584' (or their actual Task-1-reported dimensions if different), w 1224, h 1584, their unchanged pdf field, and a pages array with the correct page count (5 entries total have a pages array: 3+2+3+3+2 page-path entries = 5 "-p2.jpg" occurrences and 3 "-p3.jpg" occurrences file-wide); the-confession has no pages field. the-gettysburg-address entry is untouched (still ratio 1024/1536, still the unique tint value, still no pdf/pages field). Writing.jsx no longer contains an embedded document frame; its body/dek prose block renders unconditionally. npm run build:client completes with no errors.</done>
</task>

<task type="auto">
  <name>Task 3: Multi-page Lightbox (Prev/Next, keyboard, swipe, page indicator) + real Writings-list thumbnails</name>
  <files>src/components/Lightbox.jsx, src/routes/Writings.jsx, src/styles/eclat.css</files>
  <action>
In `src/routes/Writings.jsx`, add one field to the object passed into `openLightbox`: `images: w.pages` alongside the existing `tint`, `img`, `label`, `alt`, `ratio` fields. `w.pages` is `undefined` for entries without a `pages` array (the-confession, and any future single-page entry) — that is the intended signal for "no paging," not a bug to guard against. No other change to this file; the `<Cover>` thumbnail markup below already renders `w.img` generically and needs nothing new since Task 1/2 made real page-1 JPGs exist for every slug.

In `src/components/Lightbox.jsx`, add `useState` to the existing React import. Add a `pageIndex` state (initial `0`). Right after the existing `const open = Boolean(lightbox)` line, derive `images` from `lightbox?.images`, a boolean `hasPages` (`Array.isArray(images) && images.length > 1`), and `pageCount` (`hasPages ? images.length : 1`) — these must be computed before the keydown effect so the effect can read them. Inside the existing `useEffect` that runs when `open` becomes true, add a call resetting `pageIndex` back to `0` (so paging always starts on page 1 whenever any new item, single- or multi-page, is opened). Extend the effect's `onKey` handler: when `hasPages` is true and the key is `ArrowLeft`, call `e.preventDefault()` and step `pageIndex` down via the functional updater form (`setPageIndex((i) => Math.max(0, i - 1))`) so it never needs `pageIndex` itself in the closure; when the key is `ArrowRight`, do the symmetric `Math.min(pageCount - 1, i + 1)` step. Leave the existing Escape-closes and Tab-always-returns-to-close-button behavior completely unchanged — do not add Prev/Next to the Tab cycle, since ArrowLeft/ArrowRight already give full keyboard paging without touching the existing focus-trap logic. Add `hasPages` and `pageCount` to the effect's dependency array alongside the existing `open`, `closeLightbox`, `flipFrom`.

In `handleTouchEnd`, keep the existing vertical-downward-swipe-closes `if` block (condition and `closeLightbox()` call) first and completely unchanged, and give it an explicit `return` right after `closeLightbox()` so it short-circuits the function (it currently has none, relying on being the last statement — that's no longer safe once a second check follows it). Immediately after that `if` block, add a new one: when `hasPages` is true and the swipe is predominantly horizontal and further than 60px (mirror the existing vertical check's `Math.abs(deltaX) > Math.abs(deltaY) * 1.5` shape, using `deltaX`/`deltaY` in the horizontal orientation instead), step to the next page via the same functional updater when `deltaX` is negative (left swipe) or the previous page when `deltaX` is positive (right swipe). Since the two conditions' thresholds are mutually exclusive by construction, this ordering is a defensive-clarity change, not a behavior-correctness fix.

In the render, after the existing `const { tint, img, label, alt, ratio = '16/10' } = lightbox` line, compute `currentSrc` as `images[pageIndex]` when `hasPages`, else the existing `img`. Change the `<img>` element's `src` from `img` to `currentSrc`, add a `key={currentSrc}` prop so React remounts the element on page change (this clears any stale `onError`-triggered `display: none` from a previous page), and when `hasPages` append the current/total page numbers to its `alt` text. Leave the existing `{label && <figcaption className="lightbox__caption">{label}</figcaption>}` line completely unchanged — this preserves the exact single-page DOM shape. Add new sibling markup inside `<figure data-lb-frame="1">`, only rendered when `hasPages`: a "Previous page" button and a "Next page" button (each `type="button"`, each with an `onClick` that calls `e.stopPropagation()` before stepping the page via the same functional updaters used above, `disabled` on the Previous button when `pageIndex === 0` and on the Next button when `pageIndex === pageCount - 1`), styled via two new CSS classes `lightbox__navbtn` (shared) plus `lightbox__navbtn--prev` / `lightbox__navbtn--next` for left/right positioning; and a page-indicator element (a `<p>` with a new `lightbox__pageindicator` class and `aria-live="polite"`) reading "Page {pageIndex + 1} of {pageCount}".

In `src/styles/eclat.css`, inside the existing `/* --- lightbox --- */` block (immediately after the current `.lightbox__hint` rule, before the `/* --- video section --- */` comment), add: `.lightbox__navbtn` styled as a circular semi-transparent button matching `.lightbox__close`'s visual language (same border/background colors, smaller ~36px diameter, `position: absolute`, vertically centered via `top: 50%; transform: translateY(-50%)`, `z-index: 3` so it sits above the frame's diagonal texture overlay but below `.lightbox__close`'s `z-index: 100`), `.lightbox__navbtn--prev` with `left: 12px`, `.lightbox__navbtn--next` with `right: 12px`, a `.lightbox__navbtn:disabled` rule dimming opacity and disabling pointer events, and `.lightbox__pageindicator` positioned like `.lightbox__caption` but right-aligned (`right: 22px; bottom: 18px;`) so it never collides with the existing left-aligned label caption, reusing the same `--narrow` font/letter-spacing/color treatment.

After all three files are edited, run the full verification below (client build, SSR build, prerender, then a local preview server with curl checks against every new asset and route) to confirm this task's changes work together with Task 1 and Task 2's output end-to-end.
  </action>
  <verify>
    <automated>FILES="immortal-beloved.jpg immortal-beloved-p2.jpg immortal-beloved-p3.jpg the-poetical-science.jpg the-poetical-science-p2.jpg the-confession.jpg come-here-i-want-to-see-you.jpg come-here-i-want-to-see-you-p2.jpg come-here-i-want-to-see-you-p3.jpg two-minds-one-idea.jpg two-minds-one-idea-p2.jpg two-minds-one-idea-p3.jpg the-einstein-szilard-letter.jpg the-einstein-szilard-letter-p2.jpg"; grep -q "images: w.pages" src/routes/Writings.jsx && grep -q "pageIndex" src/components/Lightbox.jsx && grep -q "lightbox__navbtn" src/components/Lightbox.jsx && grep -q "ArrowLeft" src/components/Lightbox.jsx && grep -q "ArrowRight" src/components/Lightbox.jsx && grep -q "lightbox__pageindicator" src/styles/eclat.css && npm run build:client && npx vite build --ssr src/entry-server.jsx --outDir dist/server && node prerender.js && grep -q 'src="/assets/images/writings/immortal-beloved.jpg"' dist/writings/index.html && grep -q 'src="/assets/images/writings/the-confession.jpg"' dist/writings/index.html && ! grep -q '<iframe' dist/writings/immortal-beloved/index.html && ! grep -q '<iframe' dist/writings/the-confession/index.html && (npx vite preview --port 4173 --strictPort & echo $! > .gsd-preview.pid) && sleep 2 && FAIL=0 && for f in $FILES; do code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:4173/assets/images/writings/$f"); [ "$code" = "200" ] || { echo "FAIL asset $f -> $code"; FAIL=1; }; done && for s in immortal-beloved the-poetical-science the-confession come-here-i-want-to-see-you two-minds-one-idea the-einstein-szilard-letter; do code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:4173/writings/$s"); [ "$code" = "200" ] || { echo "FAIL route $s -> $code"; FAIL=1; }; done; kill "$(cat .gsd-preview.pid)" 2>/dev/null; rm -f .gsd-preview.pid; test "$FAIL" -eq 0 && echo PASS</automated>
  </verify>
  <done>Writings.jsx passes each entry's rasterized page list into the Lightbox. Lightbox.jsx supports Prev/Next buttons, ArrowLeft/ArrowRight keys, horizontal swipe-to-page (vertical-swipe-to-close unchanged), and a "Page X of Y" indicator, active only when an item has more than one image; single-image items (the-gettysburg-address, the-confession, and every Books.jsx/Edition.jsx lightbox) render with the exact same DOM shape as before. eclat.css carries the new nav-button/page-indicator rules. Full client+SSR build and prerender complete with no errors; the prerendered Writings list HTML references the real page-1 JPGs for both a multi-page and the single-page letter; the prerendered detail HTML for those same two contains no embedded document frame. A local vite preview server serves 200 for all 14 new image assets and all 6 /writings/<slug> routes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Site (self) -> rasterized JPG images | Static, build-time image assets generated once from the 6 PDFs already committed to the repo by the site owner; served as ordinary same-origin static files via the same public/ -> dist/ copy mechanism as every other /assets/images/* file. Never user input, no upload path exists. |
| Lightbox client-side page navigation | Pure client-side array-index state over a hardcoded array of same-origin image URLs sourced from content.js literals — Prev/Next/ArrowKeys/swipe never touch the network or accept external input. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-o9g-01 | Tampering | public/assets/images/writings/*.jpg | low | accept | Generated once, locally, from PDFs already committed to the repo by the site owner; not user-uploaded, no upload endpoint exists anywhere in this app; served with the same static-asset caching as every other image under /assets/images/. |
| T-o9g-02 | Denial of Service (resource) | Lightbox loading up to 3 same-origin JPGs per multi-page letter | low | accept | Each rasterized JPG is a single compressed page image, fetched lazily only as the reader opens that specific letter's Lightbox and steps to that specific page — same resource profile as any other on-page image, no new fetch triggered by initial page load. |
</threat_model>

<verification>
Task 3's automated check is the load-bearing end-to-end verification for this whole plan: it runs the real production build pipeline (client bundle, SSR bundle, `node prerender.js`) exactly as `npm run build` does, minus the DB-migration and secrets-scan steps (same reasoning the prior `260923-nof` and `260923-lhx` quick tasks in this repo used for `npm run build:client`), then serves the actual prerendered `dist/` output via `vite preview` and confirms with `curl` that every new rasterized image asset and every `/writings/<slug>` route returns 200, and that the prerendered HTML for the Writings list references the real page-1 JPGs while the detail pages no longer contain an embedded document frame. This cannot visually confirm the Lightbox popup itself — its open/close/page-turn behavior is pure client-side React state that only exists after hydration in a real browser, and no browser-automation tooling exists in this repo's own toolchain. That final live-browser confirmation (clicking a multi-page letter, paging through it, confirming the-gettysburg-address and the-confession still open exactly as before) is the orchestrator's job after this plan's SUMMARY.md is complete, per the same pattern the prior `260923-nof` quick task used.
</verification>

<success_criteria>
- [ ] All 14 expected page JPGs exist under public/assets/images/writings/ with nonzero size, matching each PDF's real page count
- [ ] content.js's 6 non-Gettysburg writings entries carry real page-1 raster dimensions (ratio/w/h) and a pages array sized to their actual page count; the-confession (1 page) has no pages array; the-gettysburg-address entry is byte-unchanged
- [ ] Writing.jsx no longer renders an embedded document frame for any entry — plain body/dek prose renders unconditionally for all 7 writings, matching pre-260923-nof behavior
- [ ] Writings.jsx passes each entry's page list into the Lightbox via a new images field; Books.jsx and Edition.jsx are untouched
- [ ] Lightbox.jsx renders Prev/Next buttons, responds to ArrowLeft/ArrowRight, supports horizontal swipe-to-page, and shows a page indicator only when an item has more than one image; single-image items keep the exact pre-existing DOM shape and behavior
- [ ] eclat.css carries new lightbox nav-button and page-indicator rules without altering any existing lightbox rule
- [ ] Full client+SSR build and prerender complete with no errors
- [ ] vite preview serves 200 for all 14 new image assets and all 6 /writings/<slug> routes
- [ ] No AI-generated artwork, no new parchment-reader component, no CSP changes, no deletion of the source PDFs under public/assets/documents/writings/
- [ ] All changes committed locally task-by-task; no git push performed by any task in this plan
</success_criteria>

<output>
Create `.planning/quick/260923-o9g-replace-the-raw-iframe-pdf-viewer-added-/260923-o9g-SUMMARY.md` when done
</output>
