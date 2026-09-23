---
phase: quick-260923-nof
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - public/assets/documents/writings/immortal-beloved.pdf
  - public/assets/documents/writings/the-poetical-science.pdf
  - public/assets/documents/writings/the-confession.pdf
  - public/assets/documents/writings/come-here-i-want-to-see-you.pdf
  - public/assets/documents/writings/two-minds-one-idea.pdf
  - public/assets/documents/writings/the-einstein-szilard-letter.pdf
  - src/data/content.js
  - src/routes/Writing.jsx
  - vercel.json
  - public/_headers
autonomous: true
requirements: []

estimate:
  tokens: 45000
  raw_tokens: 45000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Visiting /writings/<slug> for each of the 6 letter/writing entries that now have a PDF (immortal-beloved, the-poetical-science, the-confession, come-here-i-want-to-see-you, two-minds-one-idea, the-einstein-szilard-letter) renders the real archival PDF inline in the page (an <iframe> pointed at the PDF), plus a plain 'Open / download PDF' link that works even where inline PDF rendering is unsupported."
    - "/writings/the-gettysburg-address is untouched — it still renders as plain typed-out paragraph text, no PDF, no iframe (no PDF file was supplied for it)."
    - "The Writings index (/writings) lists all 7 entries oldest-to-newest: Immortal Beloved (1812), The Poetical Science (1843), The Confession (1844), The Gettysburg Address (1863), Come Here, I Want to See You (1876), Two Minds, One Idea (1909-1910), The Einstein-Szilard Letter (1939) — matching the page's own 'oldest to newest' claim."
    - "The embedded PDF iframe actually loads in a real browser rather than being silently blocked — the CSP frame-src directive permits same-origin framing in both vercel.json and public/_headers."
    - "The Einstein-Szilard letter entry keeps its existing transcribed body text (unchanged) in addition to gaining a pdf field — no duplicate entry was created for it."
  artifacts:
    - "public/assets/documents/writings/immortal-beloved.pdf"
    - "public/assets/documents/writings/the-poetical-science.pdf"
    - "public/assets/documents/writings/the-confession.pdf"
    - "public/assets/documents/writings/come-here-i-want-to-see-you.pdf"
    - "public/assets/documents/writings/two-minds-one-idea.pdf"
    - "public/assets/documents/writings/the-einstein-szilard-letter.pdf"
    - "src/data/content.js — writings array reordered chronologically, 5 new entries added with pdf fields, existing the-einstein-szilard-letter entry gains a pdf field"
    - "src/routes/Writing.jsx — renders an inline PDF viewer + fallback link when w.pdf is present"
    - "vercel.json, public/_headers — Content-Security-Policy frame-src widened to include 'self'"
  key_links:
    - "src/data/seo.js's allRoutes() already iterates the writings array generically (for (const w of writings) out.push({ path: `/writings/${w.slug}`, meta: writingSeo(w) })) — new array entries get a prerendered detail page and sitemap entry automatically. No changes to seo.js, App.jsx, or prerender.js are needed or made."
    - "Vite copies public/ verbatim into dist/ at build time (same mechanism already used for public/assets/images/...) — placing PDFs at public/assets/documents/writings/<slug>.pdf makes them reachable at /assets/documents/writings/<slug>.pdf in both dev and the prerendered build with zero extra wiring."
    - "vercel.json's Content-Security-Policy 'frame-src' directive currently only allowlists https://www.youtube-nocookie.com, which OVERRIDES default-src 'self' for frames — same-origin iframes are NOT currently permitted. Widening frame-src to 'self' https://www.youtube-nocookie.com in both vercel.json and public/_headers is what makes the new <iframe src={w.pdf}> actually load instead of being silently blocked by the browser."
    - "w.pdf is a new, optional field read only by src/routes/Writing.jsx — src/routes/Writings.jsx (the list page) does not reference w.pdf at all and needs no changes; it already renders w.tint/w.img/w.title/w.dek/w.year/w.type generically for every entry regardless of type or pdf presence."
---

<objective>
Replace the plain-text-only rendering of 6 archival letter/writing entries with the real supplied PDF documents, embedded inline on each entry's detail page (`/writings/<slug>`), while keeping the existing typed-text rendering path fully intact for entries that have no PDF (only `the-gettysburg-address`, going forward).

Concretely: copy the user's 6 source PDFs into `public/assets/documents/writings/`; add 5 new entries to the `writings` array in `src/data/content.js` (Ada Lovelace, Bell, Gandhi-Tolstoy, Darwin-Hooker, Beethoven) each carrying a `pdf` field, re-ordered into correct chronological (oldest-to-newest) position; add a `pdf` field to the existing `the-einstein-szilard-letter` entry (no duplicate — same entry, same body text, now also linked to its PDF); update `src/routes/Writing.jsx` to render an inline `<iframe>` PDF viewer plus an "Open / download PDF" fallback link whenever `w.pdf` is present; and widen the `Content-Security-Policy` `frame-src` directive in `vercel.json` and `public/_headers` to `'self' https://www.youtube-nocookie.com` so the browser actually allows the same-origin iframe (it currently does not — `frame-src` overrides `default-src 'self'` and today only allowlists the YouTube embed origin).

Purpose: The user's underlying complaint is that Writings entries are "just text on website" when they supplied real archival PDF documents — this plan makes the actual PDF the primary artifact readers see, not a hand-typed transcription standing in for it.
Output: 6 PDF assets under `public/assets/documents/writings/`; `src/data/content.js`'s `writings` array holding 7 chronologically-ordered entries (5 new + 2 existing, one of the existing two now carrying a `pdf` field); `src/routes/Writing.jsx` rendering an inline PDF viewer + download link wherever `pdf` is present; CSP `frame-src` permitting same-origin framing in both `vercel.json` and `public/_headers`.
</objective>

<execution_context>
@get-shit-done/workflows/execute-plan.md
@get-shit-done/templates/summary.md
</execution_context>

<context>
@src/data/content.js
@src/routes/Writing.jsx
@src/routes/Writings.jsx
@vercel.json
@public/_headers

Confirmed current state (already read in full — do not re-read beyond what's needed to apply the edits):

- `src/data/content.js` lines 94-137: `export const writings = [...]` currently has exactly 2 entries (`the-gettysburg-address`, `the-einstein-szilard-letter`), each shaped `{ slug, title, type, year, dek, [body], tint, ratio, w, h }`, followed by a trailing `.map((w) => ({ ...w, img: \`/assets/images/writings/${w.slug}.jpg\` }))`. Neither entry currently has a `pdf` field. No `pdf` field exists anywhere in this file today (confirmed by full read).
- `src/routes/Writings.jsx` (list page) and `src/data/seo.js`'s `allRoutes()`/`writingSeo()` both consume the `writings` array generically by iterating it — no per-slug/per-type special-casing, no changes needed to either file for this task. Confirmed by full read.
- `src/routes/Writing.jsx` (detail page) is the ONLY file that needs new rendering logic — it currently renders `w.body.map(...)` as `<p>` paragraphs when `body` is non-empty, else falls back to a single `<p>{w.dek}</p>`. This existing block must be preserved unchanged; the PDF viewer is new markup added alongside it, not a replacement.
- `Cover.jsx`'s `idle/loaded/failed` state machine already handles the case of no real cover photo (`onError` drops the `<img>`, the `tint` CSS color remains) — this is the accepted existing pattern for every writings entry that lacks a JPEG in `public/assets/images/writings/`. None of the 5 new entries need an image file; only `the-gettysburg-address.jpg` exists there today and that is not touched.
- `vercel.json` line 28 and `public/_headers` line 18 currently hold the IDENTICAL `Content-Security-Policy` value string, containing the exact substring `frame-src https://www.youtube-nocookie.com;` — this must become `frame-src 'self' https://www.youtube-nocookie.com;` in both files, with every other directive in the string left byte-for-byte unchanged (`object-src 'none'` in particular must NOT be touched — the PDF is embedded via `<iframe>`, never `<object>`/`<embed>`).
- Source files (outside the repo, read-only, do not modify/delete originals), exact Windows paths with spaces — quote them fully in any shell command:
  - `C:\Users\Aliyan Khan\Downloads\Writting and Letters\1-ECLAT_Ada_Lovelace_1843_Manuscript_Style_Reconstruction.pdf` -> `the-poetical-science.pdf`
  - `C:\Users\Aliyan Khan\Downloads\Writting and Letters\2-ECLAT_Come_Here_I_Want_To_See_You_Bell_1876.pdf` -> `come-here-i-want-to-see-you.pdf`
  - `C:\Users\Aliyan Khan\Downloads\Writting and Letters\3- ECLAT_Gandhi_Tolstoy_Two_Minds_One_Idea.pdf` (note the space after "3-") -> `two-minds-one-idea.pdf`
  - `C:\Users\Aliyan Khan\Downloads\Writting and Letters\4- ECLAT_Darwin_Hooker_1844_Archival_Letter.pdf` (space after "4-") -> `the-confession.pdf`
  - `C:\Users\Aliyan Khan\Downloads\Writting and Letters\5- ECLAT_Beethoven_Immortal_Beloved.pdf` (space after "5-") -> `immortal-beloved.pdf`
  - `C:\Users\Aliyan Khan\Downloads\Writting and Letters\6- Einstein_Szilard_1939_archival_facsimile.pdf` (space after "6-") -> `the-einstein-szilard-letter.pdf` (reuses the EXISTING entry's slug — this is the same 1939 letter already in `content.js`, not a new entry)
- Editorial note on titles: the user's own source "Details.txt" files give these as ALL-CAPS magazine coverline titles (e.g. "THE POETICAL SCIENCE", "IMMORTAL BELOVED"). Neither `.display` (used for the `<h1>` on the detail page) nor `.writing__title` (used on the list page) applies any CSS `text-transform`, so whatever case is stored in `title` renders verbatim. To stay visually consistent with the two existing entries (`The Gettysburg Address`, `The Einstein–Szilard Letter`, both stored in normal title case), the new entries below store the same wording in title case rather than literal ALL-CAPS — this is a presentation-only normalization, the words themselves are unchanged from what the user supplied.

**Exact replacement for the entire `writings` array** (`src/data/content.js` lines 94-137 — replace the whole `export const writings = [ ... ].map((w) => ({ ...w, img: ... }))` block with this, preserving the trailing `.map()` line exactly as it is today):

```js
export const writings = [
  {
    slug: 'immortal-beloved',
    title: 'Immortal Beloved',
    type: 'Letter',
    year: 'July 1812',
    dek: 'Beethoven’s letter to the woman history still cannot name.',
    tint: 'oklch(0.32 0.05 25)',
    ratio: '3/2',
    w: 1200,
    h: 800,
    pdf: '/assets/documents/writings/immortal-beloved.pdf',
  },
  {
    slug: 'the-poetical-science',
    title: 'The Poetical Science',
    type: 'Manuscript',
    year: '1843',
    dek: 'Ada Lovelace and the machine she imagined before the world was ready to build it.',
    tint: 'oklch(0.42 0.05 285)',
    ratio: '3/2',
    w: 1200,
    h: 800,
    pdf: '/assets/documents/writings/the-poetical-science.pdf',
  },
  {
    slug: 'the-confession',
    title: 'The Confession',
    type: 'Letter',
    year: '1844',
    dek: 'Darwin to Joseph Hooker, 1844 — the letter in which he first confided the theory that would upend the natural sciences.',
    tint: 'oklch(0.40 0.06 145)',
    ratio: '3/2',
    w: 1200,
    h: 800,
    pdf: '/assets/documents/writings/the-confession.pdf',
  },
  {
    slug: 'the-gettysburg-address',
    title: 'The Gettysburg Address',
    type: 'Speech',
    year: '1863',
    dek: 'Two minutes at a battlefield dedication that November, and a new birth of freedom promised in return.',
    body: [
      'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.',
      'Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting-place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.',
      'But, in a larger sense, we cannot dedicate, we cannot consecrate, we cannot hallow, this ground. The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us—that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion—that we here highly resolve that these dead shall not have died in vain—that this nation, under God, shall have a new birth of freedom—and that government of the people, by the people, for the people, shall not perish from the earth.',
    ],
    tint: 'oklch(0.55 0.05 70)',
    ratio: '1024/1536',
    w: 1024,
    h: 1536,
  },
  {
    slug: 'come-here-i-want-to-see-you',
    title: 'Come Here, I Want to See You',
    type: 'Notebook',
    year: 'March 10, 1876',
    dek: 'The words that traveled down a wire—and changed how the world communicated.',
    tint: 'oklch(0.46 0.04 205)',
    ratio: '3/2',
    w: 1200,
    h: 800,
    pdf: '/assets/documents/writings/come-here-i-want-to-see-you.pdf',
  },
  {
    slug: 'two-minds-one-idea',
    title: 'Two Minds, One Idea',
    type: 'Letter',
    year: '1909–1910',
    dek: 'Gandhi, Tolstoy, and a correspondence that crossed continents.',
    tint: 'oklch(0.46 0.08 55)',
    ratio: '3/2',
    w: 1200,
    h: 800,
    pdf: '/assets/documents/writings/two-minds-one-idea.pdf',
  },
  {
    slug: 'the-einstein-szilard-letter',
    title: 'The Einstein–Szilard Letter',
    type: 'Letter',
    year: '1939',
    dek: 'A physicist’s warning delivered to the White House in August 1939, and the letter that helped set the atomic age in motion.',
    body: [
      'Albert Einstein, Old Grove Rd., Nassau Point, Peconic, Long Island',
      'F.D. Roosevelt, President of the United States, White House, Washington, D.C.',
      'August 2nd, 1939',
      'Sir:',
      'Some recent work by E. Fermi and L. Szilard, which has been communicated to me in manuscript, leads me to expect that the element uranium may be turned into a new and important source of energy in the immediate future. Certain aspects of the situation which has arisen seem to call for watchfulness and, if necessary, quick action on the part of the Administration. I believe therefore that it is my duty to bring to your attention the following facts and recommendations:',
      'In the course of the last four months it has been made probable — through the work of Joliot in France as well as Fermi and Szilard in America — that it may become possible to set up a nuclear chain reaction in a large mass of uranium, by which vast amounts of power and large quantities of new radium-like elements would be generated. Now it appears almost certain that this could be achieved in the immediate future.',
      'This new phenomenon would also lead to the construction of bombs, and it is conceivable — though much less certain — that extremely powerful bombs of a new type may thus be constructed. A single bomb of this type, carried by boat and exploded in a port, might very well destroy the whole port together with some of the surrounding territory. However, such bombs might very well prove to be too heavy for transportation by air.',
      'The United States has only very poor ores of uranium in moderate quantities. There is some good ore in Canada and the former Czechoslovakia, while the most important source of uranium is Belgian Congo.',
      'In view of this situation you may think it desirable to have some permanent contact maintained between the Administration and the group of physicists working on chain reactions in America. One possible way of achieving this might be for you to entrust with this task a person who has your confidence and who could perhaps serve in an unofficial capacity. His task might comprise the following:',
      'a) to approach Government Departments, keep them informed of the further development, and put forward recommendations for Government action, giving particular attention to the problem of securing a supply of uranium ore for the United States;',
      'b) to speed up the experimental work, which is at present being carried on within the limits of the budgets of University laboratories, by providing funds, if such funds be required, through his contacts with private persons who are willing to make contributions for this cause, and perhaps also by obtaining the co-operation of industrial laboratories which have the necessary equipment.',
      'I understand that Germany has actually stopped the sale of uranium from the Czechoslovakian mines which she has taken over. That she should have taken such early action might perhaps be understood on the ground that the son of the German Under-Secretary of State, von Weizsacker, is attached to the Kaiser-Wilhelm-Institut in Berlin where some of the American work on uranium is now being repeated.',
      'Yours very truly, Albert Einstein',
    ],
    tint: 'oklch(0.38 0.04 230)',
    ratio: '3/2',
    w: 1200,
    h: 800,
    pdf: '/assets/documents/writings/the-einstein-szilard-letter.pdf',
  },
].map((w) => ({ ...w, img: `/assets/images/writings/${w.slug}.jpg` }))
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Copy the 6 archival PDFs into public/assets/documents/writings/ and replace the writings array in content.js</name>
  <files>public/assets/documents/writings/immortal-beloved.pdf, public/assets/documents/writings/the-poetical-science.pdf, public/assets/documents/writings/the-confession.pdf, public/assets/documents/writings/come-here-i-want-to-see-you.pdf, public/assets/documents/writings/two-minds-one-idea.pdf, public/assets/documents/writings/the-einstein-szilard-letter.pdf, src/data/content.js</name>
  <action>
Create the directory public/assets/documents/writings/ (it does not exist yet — public/assets/documents/ is entirely new). Copy each of the 6 source PDFs listed in the context section above from its exact Windows source path (quote paths fully — they contain spaces) to its mapped destination filename inside public/assets/documents/writings/. Do not modify, rename, or delete the source files in the Downloads folder — copy only.

Then, in src/data/content.js, replace the entire existing writings array (the current `export const writings = [ ... ].map((w) => ({ ...w, img: ... }))` block, currently 2 entries) with the complete 7-entry replacement block given verbatim in the "Exact replacement for the entire writings array" context section above. Copy it exactly — field order, indentation, quote style, curly apostrophes, and em dashes all matter and must match what's given. Do not alter any other export in this file (editions, books, articles, icons, videos, invoices, archiveYears, editionByNo, writingBySlug, SITE) — only the writings array changes.

Stage and commit only the 6 new PDF files and src/data/content.js for this task, locally. Do NOT run git push — pushing requires separate confirmation from the orchestrator and is out of scope for every task in this plan.
  </action>
  <verify>
    <automated>test -s "public/assets/documents/writings/immortal-beloved.pdf" && test -s "public/assets/documents/writings/the-poetical-science.pdf" && test -s "public/assets/documents/writings/the-confession.pdf" && test -s "public/assets/documents/writings/come-here-i-want-to-see-you.pdf" && test -s "public/assets/documents/writings/two-minds-one-idea.pdf" && test -s "public/assets/documents/writings/the-einstein-szilard-letter.pdf" && test "$(awk '/export const writings = \[/,/\]\.map\(\(w\)/' src/data/content.js | grep -c 'slug:')" -eq 7 && test "$(awk '/export const writings = \[/,/\]\.map\(\(w\)/' src/data/content.js | grep -c "pdf: '/assets/documents/writings/")" -eq 6 && ORDER=$(awk '/export const writings = \[/,/\]\.map\(\(w\)/' src/data/content.js | grep -oE "slug: '[a-z0-9-]+'" | sed -E "s/slug: '([a-z0-9-]+)'/\1/" | paste -sd, -) && test "$ORDER" = "immortal-beloved,the-poetical-science,the-confession,the-gettysburg-address,come-here-i-want-to-see-you,two-minds-one-idea,the-einstein-szilard-letter" && npm run build:client && echo PASS</automated>
  </verify>
  <done>All 6 PDFs exist at their mapped paths under public/assets/documents/writings/ with nonzero size. src/data/content.js's writings array has exactly 7 entries in the exact chronological order immortal-beloved, the-poetical-science, the-confession, the-gettysburg-address, come-here-i-want-to-see-you, two-minds-one-idea, the-einstein-szilard-letter — the first 3 and last 2 are new, the-gettysburg-address is unchanged, and the-einstein-szilard-letter keeps its existing body array and gains a pdf field. All 6 non-Gettysburg entries have a pdf field pointing at their matching PDF path. npm run build:client completes with no errors. Change is committed locally (PDFs + content.js only), no git push.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Render an inline PDF viewer + fallback link on the writing detail page</name>
  <files>src/routes/Writing.jsx</files>
  <action>
In src/routes/Writing.jsx, add a new conditional block immediately after the existing `<h1 className="display">{w.title}</h1>` line and before the existing `<div className="prose">...</div>` block (leave that entire prose block's body/dek-fallback logic completely unchanged — it must keep rendering exactly as it does today for every entry, PDF or not, since the-einstein-szilard-letter has both a pdf and a body and both must still render).

The new block renders only when `w.pdf` is truthy: a wrapping container holding an `<iframe>` whose `src` is `w.pdf`, with a descriptive `title` attribute (e.g. built from `w.title`, such as "${w.title} — full document"), styled inline as a bordered, full-width, roughly-80vh-tall box (use the existing global CSS custom property `var(--line)` for the border color, matching how borders are done elsewhere in this codebase's inline styles — do not invent a new border color or add any new CSS file/class). Immediately below the iframe, render a plain `<a href={w.pdf} target="_blank" rel="noopener noreferrer">` with visible text like "Open / download PDF" — this is the required fallback for mobile browsers that don't render PDFs inline, and must always render alongside the iframe (not only when the iframe fails), since there's no way to detect that failure client-side without extra JS this task doesn't need.

Do not add a CSS file, do not add a new global class definition, do not touch src/routes/Writings.jsx (the list page needs no changes — it doesn't read w.pdf), and do not touch src/data/seo.js or src/App.jsx.
  </action>
  <verify>
    <automated>grep -q "w.pdf &&" src/routes/Writing.jsx && grep -q "<iframe" src/routes/Writing.jsx && grep -q "src={w.pdf}" src/routes/Writing.jsx && grep -q 'target="_blank"' src/routes/Writing.jsx && grep -q "prose__open" src/routes/Writing.jsx && npm run build:client && echo PASS</automated>
  </verify>
  <done>src/routes/Writing.jsx renders an `<iframe src={w.pdf}>` plus an "Open / download PDF" `<a target="_blank">` link whenever w.pdf is present, positioned above the existing body/dek prose block, which is unchanged and still renders unconditionally for every entry (body paragraphs when present, dek fallback otherwise). npm run build:client completes with no errors.</done>
</task>

<task type="auto">
  <name>Task 3: Widen CSP frame-src for same-origin PDF iframes; full build + prerender + preview verification</name>
  <files>vercel.json, public/_headers</files>
  <action>
In vercel.json, inside the `Content-Security-Policy` header's `value` string (the `/(.*)` route's headers array), change the substring `frame-src https://www.youtube-nocookie.com;` to `frame-src 'self' https://www.youtube-nocookie.com;` — leave every other directive in that same string (default-src, script-src, style-src, font-src, img-src, connect-src, base-uri, form-action, frame-ancestors, object-src, upgrade-insecure-requests) byte-for-byte unchanged. Make the identical change to the equivalent `Content-Security-Policy:` line in public/_headers (same substring, same replacement, rest of the directive string unchanged).

After both files are edited, run the full verification described below (client build, SSR build, prerender, then a local preview server with curl checks against every new/updated writing route and its PDF asset) to confirm the change set from all 3 tasks in this plan works together end-to-end. Stage and commit only vercel.json and public/_headers for this task, locally. Do NOT run git push.
  </action>
  <verify>
    <automated>grep -q "frame-src 'self' https://www.youtube-nocookie.com" vercel.json && grep -q "frame-src 'self' https://www.youtube-nocookie.com" public/_headers && npm run build:client && npx vite build --ssr src/entry-server.jsx --outDir dist/server && node prerender.js && grep -q 'src="/assets/documents/writings/immortal-beloved.pdf"' dist/writings/immortal-beloved/index.html && grep -q 'src="/assets/documents/writings/the-einstein-szilard-letter.pdf"' dist/writings/the-einstein-szilard-letter/index.html && ! grep -q '<iframe' dist/writings/the-gettysburg-address/index.html && (npx vite preview --port 4173 --strictPort & echo $! > .gsd-preview.pid) && sleep 2 && FAIL=0 && for s in immortal-beloved the-poetical-science the-confession come-here-i-want-to-see-you two-minds-one-idea the-einstein-szilard-letter; do code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:4173/writings/$s"); [ "$code" = "200" ] || { echo "FAIL route $s -> $code"; FAIL=1; }; code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:4173/assets/documents/writings/$s.pdf"); [ "$code" = "200" ] || { echo "FAIL pdf $s -> $code"; FAIL=1; }; done; kill "$(cat .gsd-preview.pid)" 2>/dev/null; rm -f .gsd-preview.pid; test "$FAIL" -eq 0 && echo PASS</automated>
  </verify>
  <done>vercel.json and public/_headers both contain the exact substring "frame-src 'self' https://www.youtube-nocookie.com" in their Content-Security-Policy value, with every other CSP directive unchanged. A full client+SSR build and prerender pass completes with no errors. The prerendered HTML for each of the 6 PDF-bearing routes contains an iframe src pointing at its matching /assets/documents/writings/<slug>.pdf path; the-gettysburg-address's prerendered HTML contains no iframe. A local vite preview server serves 200 for all 6 /writings/<slug> routes and all 6 /assets/documents/writings/<slug>.pdf asset URLs. Change is committed locally (vercel.json + public/_headers only), no git push.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Site (self) -> embedded PDF iframe | The iframe's `src` is always a same-origin, build-time-bundled static asset path (`/assets/documents/writings/<slug>.pdf`) derived from a hardcoded literal in `content.js` — never user input, never a remote/third-party URL. |
| Browser CSP enforcement | `frame-src` is being widened from a single external allowlisted origin to also include `'self'` — the only new capability granted is the page framing its OWN static assets; `frame-ancestors 'none'` (who may frame THIS site) is untouched, so nothing changes about third parties embedding eclat.lifestyle. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-nof-01 | Tampering | public/assets/documents/writings/*.pdf | low | accept | Static, build-time-bundled binary assets supplied directly by the site owner (not user-uploaded, no upload endpoint exists), served with the same long-cache immutable headers as every other /assets/* file. No new attack surface versus the existing image-asset pattern. |
| T-quick-nof-02 | Information Disclosure | CSP frame-src widened to 'self' (vercel.json, public/_headers) | low | accept | `'self'` only permits the site to iframe its own same-origin static assets — it does not permit third-party sites to iframe eclat.lifestyle (frame-ancestors 'none' is unchanged) and does not touch object-src 'none' (still blocks `<object>`/`<embed>`-based plugin execution). The PDFs exposed via the new iframes are already publicly reachable static files at their own URL regardless of whether they're also framed. |
| T-quick-nof-03 | Denial of Service (resource) | Embedded PDFs (largest observed ~840KB) | low | accept | Files are small, served as static assets with immutable long-cache headers, no server compute involved in serving them — same resource profile as the site's existing image assets. |
</threat_model>

<verification>
Task 3's automated check is the load-bearing end-to-end verification for this whole plan: it runs the real production build pipeline (client bundle, SSR bundle, prerender) exactly as `npm run build` does (minus the DB-migration and secrets-scan steps, which require environment configuration unrelated to this content/CSP change — the same reasoning the prior `260923-lhx` quick task used for `npm run build:client`), then serves the actual prerendered `dist/` output via `vite preview` and confirms with `curl` that every new/updated writing route and its PDF asset return 200, and that the prerendered HTML actually contains the iframe pointing at the right PDF path. This cannot confirm the PDF visually renders inside the iframe in a real browser (no browser-automation tooling exists in this repo, and CSP headers from vercel.json/public/_headers are not applied by `vite preview` — they're asserted directly via grep on the config files instead) — that final live-browser confirmation is the orchestrator's job after this plan's SUMMARY.md is complete.
</verification>

<success_criteria>
- [ ] All 6 source PDFs copied to public/assets/documents/writings/<slug>.pdf with matching slugs
- [ ] writings array in src/data/content.js has 7 entries in correct chronological order (1812, 1843, 1844, 1863, 1876, 1909-1910, 1939)
- [ ] the-einstein-szilard-letter entry is updated in place (pdf field added, existing body/title/dek/tint untouched) — no duplicate entry
- [ ] the-gettysburg-address entry and its rendering are completely untouched (still plain text, no pdf field, no iframe)
- [ ] src/routes/Writing.jsx renders an inline PDF iframe + "Open / download PDF" link whenever w.pdf is present, without breaking existing body/dek rendering for entries without a pdf
- [ ] src/routes/Writings.jsx, src/data/seo.js, src/App.jsx, prerender.js all remain unmodified
- [ ] CSP frame-src in both vercel.json and public/_headers includes 'self' alongside the existing youtube-nocookie.com origin, with no other directive changed
- [ ] Full client+SSR build and prerender completes with no errors
- [ ] vite preview serves 200 for all 6 new/updated /writings/<slug> routes and all 6 PDF asset URLs
- [ ] Prerendered HTML for each of the 6 routes contains the correct iframe src; the-gettysburg-address's prerendered HTML contains no iframe
- [ ] All changes committed locally task-by-task; no git push performed by any task in this plan
</success_criteria>

<output>
Create `.planning/quick/260923-nof-add-real-pdf-previews-for-archival-lette/260923-nof-SUMMARY.md` when done
</output>
