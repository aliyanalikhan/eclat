---
phase: quick-260910-qgi
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - public/assets/images/magazine-preview/1/*.jpg (60 new files)
  - public/assets/images/magazine-preview/2/*.jpg (62 new files)
  - src/components/MagazinePreview.jsx
  - src/styles/eclat.css
  - src/data/content.js
  - src/routes/Edition.jsx
autonomous: true
requirements: []

estimate:
  tokens: 75000
  raw_tokens: 68000
  tasks: 3
  confidence: medium

must_haves:
  truths:
    - "Visiting /editions/1 or /editions/2 while entitled and clicking 'Preview the Full Issue' opens a full-screen modal showing real compressed JPEG page images rendered from the actual magazine PDFs — not the current thin 3-paragraph text block."
    - "A visitor can page through every page of the magazine (60 pages for No. 1, 62 for No. 2) via visible Previous/Next buttons and Left/Right arrow keys, with a visible 'N / total' page counter."
    - "Escape, the close button, and clicking the backdrop all close the modal, restoring body scroll and keyboard focus exactly as the existing Lightbox does."
    - "An edition with no previewPageCount (any future edition lacking rendered page images) falls back to rendering the original 3-paragraph excerpt text exactly as it renders today — no regression to that path."
    - "All 122 rendered page images are committed as compressed JPEGs under public/assets/images/magazine-preview/; neither source PDF nor the Python conversion script is present anywhere in the repo."
    - "npm run build completes cleanly; api/content/editions/[no].js, TEMP_FREE_PREVIEW, Lightbox.jsx, and store.jsx are all untouched — this is a presentation-only change layered on the already-entitled state."
  artifacts:
    - public/assets/images/magazine-preview/1/page-01.jpg … page-60.jpg (60 files)
    - public/assets/images/magazine-preview/2/page-01.jpg … page-62.jpg (62 files)
    - src/components/MagazinePreview.jsx (new)
    - src/data/content.js (previewPageCount added to both editions)
    - src/routes/Edition.jsx (button + modal wiring in the entitled branch)
    - src/styles/eclat.css (new .magazine-preview__* scoped rules)
  key_links:
    - "Edition.jsx derives MagazinePreview's `pages` prop from `ed.no` and `ed.previewPageCount` via the exact `/assets/images/magazine-preview/${ed.no}/page-${String(i + 1).padStart(2, '0')}.jpg` template — this must match Task 1's on-disk zero-padded filenames exactly, or every page image silently 404s (the modal's <img> has no onError fallback)."
    - "MagazinePreview reuses the .lightbox/.lightbox__close/.lightbox__hint CSS contract — the same pattern src/routes/Videos.jsx's local VideoModal already established for a second, non-store modal in this codebase — rather than the shared store-driven Lightbox component, since local useState fits a button-triggered, edition-page-scoped modal better than store.jsx's cross-page FLIP-animated zoom contract."
    - "vercel.json's img-src 'self' ... already covers same-origin /assets/images/magazine-preview/*.jpg — confirmed by reading vercel.json in this planning pass. No CSP change is needed or included in this plan."
  prohibitions:
    - "Must not commit the source PDFs (343MB / 179MB — both far over GitHub's 100MB hard push limit) or the one-off Python conversion script to the repo. Render into public/assets/images/magazine-preview/ only, then delete the script."
    - "Must not touch api/content/editions/[no].js, the TEMP_FREE_PREVIEW flag, or any Stripe/billing/session code — purely a client-side presentation change on top of the already-entitled (entitled: true) state."
    - "Must not modify Lightbox.jsx, store.jsx/AppContext, or any route/component other than Edition.jsx and content.js."
---

<objective>
Replace the current thin 3-paragraph "Full issue unlocked" text block on the Edition page (`/editions/:no`, the `kind === 'entitled'` branch — currently reachable by everyone because of the prior quick task's `TEMP_FREE_PREVIEW` bypass) with a real, full-magazine "pop-up preview": a self-contained page-flip modal that pages through every compressed page image of the actual print magazine.

Two real print-quality PDFs already exist on disk matching the site's two existing editions exactly (Vol 1 = edition `no: 1`, 60 pages; Vol 2 = edition `no: 2`, 62 pages). Both are far too large to commit (343MB / 179MB) and unusable for the web as-is. This plan renders every page to a compressed JPEG (1400px wide, quality 78 — already tested this session, visually matches the site's existing cover art with no artifacts) and builds a new standalone `MagazinePreview` modal component that mirrors `Lightbox.jsx`'s accessibility contract, adding a page counter, Previous/Next buttons, and Left/Right arrow-key navigation.

This sits on top of the already-unlocked (`entitled: true`) state and touches zero entitlement logic — same spirit and scope as the `TEMP_FREE_PREVIEW` flag it renders alongside. Kept deliberately isolated (one new component file, one new CSS block, two small data/route edits) so it can be removed cleanly later if the promotion ends, without a separate feature flag (unlike the API bypass, there is no security implication here — it only ever renders once the API has already said `entitled: true`).

Output: 122 new compressed JPEG page images; a new `src/components/MagazinePreview.jsx` full-screen page-flip modal; `previewPageCount` added to both editions in `content.js`; `Edition.jsx`'s entitled branch wired to open the modal, with the original 3-paragraph fallback preserved for any edition without rendered pages.
</objective>

<execution_context>
@get-shit-done/workflows/execute-plan.md
@get-shit-done/templates/summary.md
</execution_context>

<context>
@src/data/content.js
@src/routes/Edition.jsx
@src/components/Lightbox.jsx
@src/routes/Videos.jsx
@src/store.jsx
@vercel.json

Confirmed current state (already read in full this planning pass — do not re-read beyond what's needed to apply the edits):

- `src/data/content.js`'s `editions` array (lines 18-65) has two objects, no: 2 first then no: 1, each ending with `.map((e) => ({ ...e, img: ... }))`. The `no: 2` object's `pages: 62,` line sits right after `year: '2026',`. The `no: 1` object's `pages: 60,` line sits in the same relative position, and that object alone also has a trailing `excerptBy: 'Ebuka Osuorah, Founder',` field after its `excerpt` array.
- `src/routes/Edition.jsx` currently imports `{ useEffect, useRef }` from `react` (no `useState` yet). Its `kind === 'entitled' && paragraphs` branch (inside the article-body `<section>`) renders, in order: the `eyebrow eyebrow--accent` "Full issue unlocked" paragraph, then `paragraphs.map((p, i) => <p key={i} className={i === 0 ? 'prose__open' : undefined}>{p}</p>)`, then `{ed.excerptBy && <p>— {ed.excerptBy}</p>}`. The sibling `kind === 'loading'` branch and the final not-entitled/paywall branch (which still render `ed.excerpt` + a Subscribe CTA) must not be touched. `editionArticles` is computed a few lines above this section via `articles.filter((a) => a.editionNo === ed.no)`.
- `src/components/Lightbox.jsx` is the exact accessibility contract to mirror: two `useRef(null)`s named `closeRef`/`restoreTo`; on open, save `document.activeElement` into `restoreTo.current`, focus `closeRef.current`, lock body scroll via `document.body.style.overflow = 'hidden'` plus a scrollbar-gap-compensating `paddingRight` (computed as `window.innerWidth - document.documentElement.clientWidth`), attach a `keydown` listener that calls `preventDefault()` + closes on `'Escape'` and traps `'Tab'` back onto `closeRef`; cleanup restores `overflow`/`paddingRight` and refocuses `restoreTo.current` if it's an `HTMLElement`. Guards `if (!open) return null` before rendering. The close button's inline `<svg>` X-icon markup (two diagonal `<line>`s inside an 18x18 viewBox) is copied verbatim by every modal in this codebase.
- `src/routes/Videos.jsx` already built a *second*, non-store modal (`VideoModal`, local to that file) using this exact same contract, reusing only the shared `.lightbox`/`.lightbox__close`/`.lightbox__hint` CSS classes plus a scoped modifier class (`video-modal`) for its own frame styling — including a scoped override of `.lightbox__close`'s colors (`.video-modal .lightbox__close`) because the shared translucent-dark styling has poor contrast against a plain dark backdrop with no light tint directly behind it. This is the precedent pattern `MagazinePreview.jsx` follows.
- `vercel.json`'s CSP already has `img-src 'self' data: https://*.googleusercontent.com https://i.ytimg.com` — same-origin `/assets/images/...` paths are already covered by `'self'`, so no CSP edit is needed for the new page images (plain same-origin `<img>` tags).
- `src/styles/eclat.css`: `.lightbox`/`.lightbox__frame`/`.lightbox__close`/`.lightbox__hint` run lines 1767-1842; `.video-modal .lightbox__close`/`.video-modal .lightbox__close:hover`/`.video-modal__frame`/`.video-modal__frame iframe` run lines 1858-1885, immediately followed by a `/* --- reveal / motion --- */` comment at line 1887. `.btn`/`.btn--light`/`.btn--sm` are defined at lines 234-266 and 281-291.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Render both magazine PDFs to compressed JPEG page images</name>
  <files>public/assets/images/magazine-preview/1/page-01.jpg … page-60.jpg (60 files), public/assets/images/magazine-preview/2/page-01.jpg … page-62.jpg (62 files)</files>
  <precondition>Both source PDFs exist at the exact paths given below (confirmed present and test-rendered by the orchestrator earlier in this same session; not re-verified here).</precondition>
  <action>
Using the Python interpreter at /c/Python313/python (PyMuPDF / `fitz` already installed and confirmed working earlier this session), write a one-off conversion script to a temp location OUTSIDE the project root (e.g. the OS temp directory) — never inside the Éclat repo, so it can never be accidentally staged or committed.

The script must: create the two output directories `public/assets/images/magazine-preview/1/` and `public/assets/images/magazine-preview/2/` (via `os.makedirs(..., exist_ok=True)`) resolved relative to the project root `C:\Users\Aliyan Khan\Documents\Éclat`; define two `(pdf_path, out_dir)` pairs — `C:\Users\Aliyan Khan\Downloads\ÉCLAT by  LaDidiér VOL 1 (2).pdf` → the `.../1` dir, and `C:\Users\Aliyan Khan\Downloads\_ÉCLAT by  LaDidiér VOL 2. Digital.pdf` → the `.../2` dir — copying these Windows paths byte-for-byte exactly as given (note the double space before "LaDidiér" in the Vol 1 filename, the leading underscore and ". Digital" in the Vol 2 filename, and the accented "É"/"ié" characters — do not normalize or retype them from memory).

For each pair: open the PDF via `fitz.open(pdf_path)`, iterate `for i, page in enumerate(doc)`, compute `zoom = 1400 / page.rect.width`, build `mat = fitz.Matrix(zoom, zoom)`, render `pix = page.get_pixmap(matrix=mat, alpha=False)`, and save each page to `out_dir/f'page-{i+1:02d}.jpg'` via `pix.save(..., jpg_quality=78)` — this exact 1400px-width, quality-78 combination was already tested this session (page 1 of Vol 1 produced a 265KB, 1400x1981px JPEG visually matching the site's existing cover art, no artifacts).

Run the script and confirm it completes without error: exactly 60 files in the `.../1/` directory and 62 in the `.../2/` directory, zero-padded 2-digit filenames (`page-01.jpg` through `page-60.jpg` / `page-62.jpg`). Once the verify command below passes, delete the temp script file — it must leave no trace in the repo. Confirm with `git status` that only the new `.jpg` files under `public/assets/images/magazine-preview/` appear as untracked, nothing else (no `.py` file, no PDF).
  </action>
  <verify>
    <automated>[ "$(ls public/assets/images/magazine-preview/1/*.jpg 2>/dev/null | wc -l)" = "60" ] && [ "$(ls public/assets/images/magazine-preview/2/*.jpg 2>/dev/null | wc -l)" = "62" ] && [ -f public/assets/images/magazine-preview/1/page-01.jpg ] && [ -f public/assets/images/magazine-preview/1/page-60.jpg ] && [ -f public/assets/images/magazine-preview/2/page-01.jpg ] && [ -f public/assets/images/magazine-preview/2/page-62.jpg ] && [ "$(stat -c%s public/assets/images/magazine-preview/1/page-01.jpg)" -gt 20480 ] && [ "$(stat -c%s public/assets/images/magazine-preview/1/page-60.jpg)" -gt 20480 ] && [ "$(stat -c%s public/assets/images/magazine-preview/2/page-01.jpg)" -gt 20480 ] && [ "$(stat -c%s public/assets/images/magazine-preview/2/page-62.jpg)" -gt 20480 ] && echo PASS</automated>
  </verify>
  <done>60 zero-padded JPEGs exist under public/assets/images/magazine-preview/1/ and 62 under .../2/, each over 20KB; the source PDFs and the conversion script are absent from the repo (git status shows only the new .jpg files as untracked).</done>
</task>

<task type="auto">
  <name>Task 2: Build the MagazinePreview modal component and its CSS</name>
  <files>src/components/MagazinePreview.jsx, src/styles/eclat.css</files>
  <action>
Create `src/components/MagazinePreview.jsx`, a new default-exported `MagazinePreview` component reusing the accessibility contract described in this plan's `<context>` (the same contract `Videos.jsx`'s local `VideoModal` already established for a second, non-store modal). Import `useEffect, useRef, useState` from `react`. Props: `pages` (array of image src strings), `title` (string, used for `aria-label`), `open` (boolean), `onClose` (function), `startIndex` (optional number, default `0`).

State: `const [index, setIndex] = useState(startIndex)`. Add a `useEffect` keyed on `[open, startIndex]` that calls `setIndex(startIndex)` whenever `open` becomes true, so reopening always starts from `startIndex`.

Add a second `useEffect` keyed on `[open, onClose, pages.length]` whose body only runs when `open` is true (an early return when it's false, mirroring the guard-then-effect shape) and otherwise follows the Lightbox contract: capture `restoreTo.current = document.activeElement`, focus `closeRef.current`, compute the scrollbar gap and lock body scroll the same way (`overflow: 'hidden'` plus a conditional `paddingRight`), attach a `keydown` listener, and in cleanup restore `overflow`/`paddingRight` and refocus `restoreTo.current` when it's an `HTMLElement`. The `keydown` handler branches on `e.key`: `'Escape'` → `preventDefault()` then call `onClose()`; `'ArrowLeft'` → `preventDefault()` then `setIndex((i) => Math.max(0, i - 1))`; `'ArrowRight'` → `preventDefault()` then `setIndex((i) => Math.min(pages.length - 1, i + 1))`; `'Tab'` → `preventDefault()` then refocus `closeRef.current` — the close button is the only Tab stop, matching the single-focus-trap contract exactly; the Previous/Next buttons below stay mouse/touch-operable and are also reachable via the arrow-key branches above, so keyboard users are never stranded.

Two `useRef(null)`s named `closeRef` and `restoreTo`. Guard `if (!open) return null` before the return statement.

Render structure: an outer `<div>` with `className="lightbox magazine-preview"` (the shared `.lightbox` base class plus a new scoped `magazine-preview` modifier — the same `"lightbox video-modal"` pairing `VideoModal` uses), `role="dialog"`, `aria-modal="true"`, `aria-label={title}`, `onClick={onClose}`. Inside it: a close `<button ref={closeRef} type="button" className="lightbox__close" onClick={onClose} aria-label="Close">` containing the same inline X-icon `<svg>` markup used in `Lightbox.jsx` and `Videos.jsx`'s `VideoModal` (18x18 viewBox, two diagonal `<line>`s). Then a `<div className="magazine-preview__frame" onClick={(e) => e.stopPropagation()}>` containing: an `<img src={pages[index]} alt={`${title} — page ${index + 1} of ${pages.length}`} className="magazine-preview__img" decoding="async" />`; a `<div className="magazine-preview__nav">` containing a Previous `<button type="button" className="btn btn--light btn--sm" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>` reading "Previous", a `<span className="magazine-preview__counter" aria-live="polite">{index + 1} / {pages.length}</span>`, and a Next `<button type="button" className="btn btn--light btn--sm" disabled={index === pages.length - 1} onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}>` reading "Next". Finally, as a direct child of the outer dialog div (outside the frame, matching `Lightbox.jsx`'s `<p className="lightbox__hint">` placement), a `<p className="lightbox__hint">` reading "Use ← → to browse · Esc to close".

Keep this component entirely self-contained — no dependency on the global app Context or its provider, and no dependency on any cross-page zoom/FLIP state; every piece of state this component needs lives in its own local hooks.

Then, in `src/styles/eclat.css`, insert a new block immediately after the existing `.video-modal__frame iframe { ... }` rule (right before the `/* --- reveal / motion --- */` comment), under a new `/* --- magazine preview modal --- */` header:
- `.magazine-preview .lightbox__close` and `.magazine-preview .lightbox__close:hover` — copy the exact same brightened-for-dark-backdrop color values already used by `.video-modal .lightbox__close`/`.video-modal .lightbox__close:hover`, since this modal's backdrop is the same dark `.lightbox` overlay and needs the same contrast treatment.
- `.magazine-preview__frame` — `position: relative`, `display: flex`, `flex-direction: column`, `align-items: center`, `gap: 18px`, `max-height: 100%`, `max-width: 100%`.
- `.magazine-preview__img` — `max-width: 100%`, `max-height: 78vh`, `width: auto`, `height: auto`, `object-fit: contain`, `background: var(--ink)`, `box-shadow: 0 40px 100px rgba(0, 0, 0, 0.6)`.
- `.magazine-preview__nav` — `display: flex`, `align-items: center`, `gap: 18px`.
- `.magazine-preview__counter` — `font-family: var(--narrow)`, `font-size: 11px`, `letter-spacing: 0.18em`, `color: rgba(247, 243, 236, 0.85)`, `min-width: 64px`, `text-align: center`.

Do not modify any existing rule in this file.
  </action>
  <verify>
    <automated>test -f src/components/MagazinePreview.jsx && grep -q "export default function MagazinePreview" src/components/MagazinePreview.jsx && grep -q "ArrowLeft" src/components/MagazinePreview.jsx && grep -q "ArrowRight" src/components/MagazinePreview.jsx && grep -q "role=\"dialog\"" src/components/MagazinePreview.jsx && grep -q "startIndex" src/components/MagazinePreview.jsx && grep -q "magazine-preview__frame" src/styles/eclat.css && grep -q "magazine-preview__img" src/styles/eclat.css && grep -q "magazine-preview__counter" src/styles/eclat.css && echo PASS</automated>
  </verify>
  <done>src/components/MagazinePreview.jsx exists, exports MagazinePreview, guards `if (!open) return null`, supports Escape/Tab/ArrowLeft/ArrowRight, renders a dialog with a close button, one page image, Previous/Next buttons, and an N/total counter; src/styles/eclat.css has the new scoped .magazine-preview__* rules; no existing rule was modified.</done>
</task>

<task type="auto">
  <name>Task 3: Wire previewPageCount into content.js and the Edition page</name>
  <files>src/data/content.js, src/routes/Edition.jsx</files>
  <action>
In `src/data/content.js`, add one new field `previewPageCount: 62,` immediately after the existing `pages: 62,` line on the `no: 2` edition object ("The Power of Vision"), and `previewPageCount: 60,` immediately after the existing `pages: 60,` line on the `no: 1` edition object ("The New Architect of Modern Living"). Do not change any other field on either object, and do not touch the `books`, `writings`, `articles`, `icons`, or `videos` arrays.

In `src/routes/Edition.jsx`: change the existing `import { useEffect, useRef } from 'react'` line to `import { useEffect, useRef, useState } from 'react'`; add a new import `import MagazinePreview from '../components/MagazinePreview.jsx'`. Inside the `Edition` component function, alongside the existing hook calls near the top, add `const [previewOpen, setPreviewOpen] = useState(false)`. Immediately after the existing `const editionArticles = articles.filter((a) => a.editionNo === ed.no)` line, add `const previewPages = ed.previewPageCount > 0 ? Array.from({ length: ed.previewPageCount }, (_, i) => \`/assets/images/magazine-preview/${ed.no}/page-${String(i + 1).padStart(2, '0')}.jpg\`) : []` — this must produce the exact zero-padded 2-digit filenames Task 1 rendered (`page-01.jpg` … `page-60.jpg`/`page-62.jpg`), or every page image will silently fail to load (the modal's `<img>` has no onError fallback, so a path mismatch here is a hard regression, not a graceful degradation).

In the `kind === 'entitled' && paragraphs` branch (inside the `<div className="prose" ...>` in the article-body section): keep the existing `<p className="eyebrow eyebrow--accent">Full issue unlocked</p>` line exactly as-is, then branch on `ed.previewPageCount > 0`. When true, render `{ed.excerptBy && <p style={{ marginBottom: 22 }}>— {ed.excerptBy}</p>}` followed by `<button type="button" className="btn" onClick={() => setPreviewOpen(true)}>Preview the Full Issue</button>` followed by `<MagazinePreview open={previewOpen} onClose={() => setPreviewOpen(false)} title={ed.title} pages={previewPages} />`. When `ed.previewPageCount` is falsy, render the original markup unchanged: `paragraphs.map((p, i) => <p key={i} className={i === 0 ? 'prose__open' : undefined}>{p}</p>)` followed by `{ed.excerptBy && <p>— {ed.excerptBy}</p>}` — this is the fallback path for any future edition with no rendered preview images, and it must render identically to how it renders today. Do not change the `kind === 'loading'` branch or the final not-entitled/paywall branch at all — both stay byte-for-byte as they are.
  </action>
  <verify>
    <automated>grep -q "previewPageCount: 60" src/data/content.js && grep -q "previewPageCount: 62" src/data/content.js && grep -q "import MagazinePreview from '../components/MagazinePreview.jsx'" src/routes/Edition.jsx && grep -q "useState" src/routes/Edition.jsx && grep -q "Preview the Full Issue" src/routes/Edition.jsx && grep -q "paragraphs.map((p, i)" src/routes/Edition.jsx && grep -q "previewPages" src/routes/Edition.jsx && echo PASS</automated>
  </verify>
  <done>Both editions carry previewPageCount (60 for No. 1, 62 for No. 2); Edition.jsx's entitled branch shows a "Preview the Full Issue" button wired to the new MagazinePreview modal when previewPageCount is set, and falls back to rendering the original 3-paragraph excerpt text unchanged when it is not; the loading and not-entitled branches are untouched.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Static asset host → any visitor | The 122 rendered page JPEGs are plain public files under `public/assets/images/magazine-preview/`, served unconditionally by the static host to any requester who knows or guesses the URL — same trust boundary as every other image asset in this app (covers, feature thumbnails). |
| Route param / array index → in-memory path template | `ed.no` and the page loop index come from the static, build-time-bundled `editions` array, never from user input — the derived image path is a pure string template, never reflected into HTML unsafely or used for a file-system/DB lookup. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-qgi-01 | Information Disclosure | public/assets/images/magazine-preview/*/page-*.jpg (static assets) | medium | accept | These are plain public static files served unconditionally by the host — the same architecture as every existing image asset (covers, feature thumbnails), none of which have ever been part of the server-side entitlement boundary; only excerpt/article text is server-gated per Phase 4's D-11 decision. `Edition.jsx`'s button gates the UI entry point only — the JPEGs themselves stay fetchable by direct URL indefinitely, including after `TEMP_FREE_PREVIEW` is eventually reverted to `false` (unlike gated text, which is server-enforced and reverts automatically, these images have no equivalent enforcement). If true per-user image gating is ever required, a future phase would need a server-proxied gated endpoint instead of static files. Explicitly out of scope for this task per its constraints (presentation-only, must not touch entitlement logic). |
| T-quick-qgi-02 | Tampering (repo integrity) | temp conversion script / source PDFs (Task 1) | high (if it happened — GitHub hard-blocks any push over 100MB, breaking the repo) | mitigate | Task 1's action explicitly writes the script outside the repo root and deletes it after use; its verify step and done criteria require confirming via `git status` that only the rendered .jpg files appear as untracked — no `.py` script, no PDF. |
| T-quick-qgi-03 | Tampering | src/routes/Edition.jsx (`ed.no` / `ed.previewPageCount` → image path template) | low | accept | Both values come from the static, build-time-bundled `editions` array in `content.js`, never from a URL param, query string, or any other runtime user input — a mismatch just produces a broken (silently-hidden-icon-free but visibly missing) image, never an injection or path-traversal vector. |
</threat_model>

<verification>
Run `npm run build` from the project root. As with prior quick tasks in this session, this sandbox's `scripts/migrate.js` build step requires `POSTGRES_URL`, which isn't configured here — if the full script fails specifically on that step, fall back to running the remaining steps individually: `npx vite build`, then `npx vite build --ssr src/entry-server.jsx --outDir dist/server`, then `node prerender.js`. Confirm: the build completes with no errors referencing `MagazinePreview.jsx`, `content.js`, `Edition.jsx`, or `eclat.css`; `dist/editions/1/index.html` and `dist/editions/2/index.html` both still exist (the prerendered shell is unchanged — per D-10 this route stays static-shell + client-fetched, so the new button/modal render entirely client-side); and Vite's public-dir copy placed all 122 new JPEGs at `dist/assets/images/magazine-preview/1/*.jpg` (60 files) and `dist/assets/images/magazine-preview/2/*.jpg` (62 files) unchanged from the `public/` source. Then confirm via `git status` that the only new/modified paths are the 122 `.jpg` files, `src/components/MagazinePreview.jsx`, and diffs to `content.js`/`Edition.jsx`/`eclat.css` — no PDF, no `.py` script, and nothing under `dist/` (gitignored build output).
</verification>

<success_criteria>
- [ ] 60 JPEGs exist under public/assets/images/magazine-preview/1/ and 62 under .../2/, zero-padded 2-digit filenames, each over 20KB
- [ ] Neither source PDF nor the Python conversion script is present anywhere in the repo
- [ ] src/components/MagazinePreview.jsx exists, is self-contained (no global Context/store dependency), and mirrors Lightbox.jsx's focus-trap/scroll-lock/Escape/backdrop-click contract
- [ ] The modal adds a visible page counter, Previous/Next buttons, and Left/Right arrow-key navigation
- [ ] Both editions in content.js carry previewPageCount (60 for No. 1, 62 for No. 2)
- [ ] Edition.jsx's entitled branch shows a "Preview the Full Issue" button that opens the modal when previewPageCount is set
- [ ] An edition without previewPageCount falls back to the original, unchanged 3-paragraph excerpt text
- [ ] Lightbox.jsx, store.jsx, api/content/editions/[no].js, and TEMP_FREE_PREVIEW are all untouched
- [ ] vercel.json is unmodified (img-src 'self' already covers the new same-origin images)
- [ ] npm run build (or its individual steps) completes with no errors, and the prerendered /editions/1 and /editions/2 shells are unchanged
</success_criteria>

<output>
Create `.planning/quick/260910-qgi-build-a-full-magazine-popup-preview-moda/260910-qgi-SUMMARY.md` when done
</output>