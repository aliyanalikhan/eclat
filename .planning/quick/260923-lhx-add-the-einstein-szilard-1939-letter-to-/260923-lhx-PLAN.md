---
phase: quick-260923-lhx
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/content.js
autonomous: true
requirements: []

estimate:
  tokens: 12000
  raw_tokens: 12000
  tasks: 1
  confidence: low

must_haves:
  truths:
    - "The Writings page shows a second entry, The Einstein–Szilard Letter, appended after The Gettysburg Address (chronological, oldest to newest — 1863 then 1939), rendered with a working tint fallback at the 3/2 aspect ratio, with correct type (Letter), year (1939), and dek."
    - "Visiting /writings/the-einstein-szilard-letter renders the full transcribed letter text as separate paragraphs via the existing Writing.jsx detail route, with no code changes to any route file."
    - "The dek is a single-sentence, own-words description of the letter (referencing its August 1939 delivery to the White House and its role in prompting nuclear research attention) with no verbatim reproduction of the letter's own sentences in the dek itself."
  artifacts:
    - "src/data/content.js — writings array gains a 2nd entry after the-gettysburg-address, before the trailing .map()"
  key_links:
    - "The new entry's slug field (the-einstein-szilard-letter) must exactly match what the trailing .map((w) => ({ ...w, img: `/assets/images/writings/${w.slug}.jpg` })) derives — no real file exists at that path, which is expected: Cover.jsx's onError handler drops the <img> and the tint colour remains, per public/assets/images/MANIFEST.md's documented fallback behavior. Do not fabricate or reference a placeholder image file."
    - "src/data/seo.js's allRoutes() already iterates the writings array generically (`for (const w of writings) out.push({ path: `/writings/${w.slug}`, meta: writingSeo(w) })`) — the new entry gets a prerendered detail page and sitemap entry automatically. Do not touch src/App.jsx, src/data/seo.js, or prerender.js."
---

<objective>
Add one new entry to the `writings` array in `src/data/content.js` for the Einstein–Szilard letter (August 2, 1939) — a real, public-domain historical document — as a new `'Letter'` type entry, using the full text transcribed from the user-supplied archival-facsimile PDF, following the exact same data-shape pattern as the existing Gettysburg Address entry.

Purpose: Extends the Writings section's real-historical-document pattern (currently one entry, "The Gettysburg Address", type `'Speech'`) with a second entry of a new type, `'Letter'`, reusing the same detail-page and listing infrastructure with zero route/component changes.

Output: One new object appended to the `writings` array in `src/data/content.js`, immediately after the existing `the-gettysburg-address` entry. No changes to `src/routes/Writings.jsx`, `src/routes/Writing.jsx`, `src/data/seo.js`, `src/App.jsx`, or `prerender.js` — all already generically consume the `writings` array with no per-type or per-slug special-casing (confirmed by reading each file).
</objective>

<execution_context>
@get-shit-done/workflows/execute-plan.md
@get-shit-done/templates/summary.md
</execution_context>

<context>
@src/data/content.js
@src/routes/Writings.jsx
@src/routes/Writing.jsx

Confirmed current state (already read in full — do not re-read beyond what's needed to apply the edit):

- `src/data/content.js`'s `writings` array runs lines 94-111. It has exactly one entry today, `the-gettysburg-address`, shaped `{ slug, title, type, year, dek, body, tint, ratio, w, h }` in that exact field order (an array of paragraph strings for `body`, added after the entry's original creation), followed by a trailing `.map((w) => ({ ...w, img: `/assets/images/writings/${w.slug}.jpg` }))` on line 111 that derives every entry's image path from `slug` alone with a hardcoded `.jpg` extension.
- `type` has no enum/allowlist anywhere — `src/routes/Writings.jsx` and `src/routes/Writing.jsx` both render `{w.type}` as a plain string. `'Letter'` is a new, valid value, same pattern as `'Speech'` was when first added.
- No real image file will exist for this entry (the user supplied only the source PDF, not a cover photo). This is expected and fine: `public/assets/images/MANIFEST.md` documents that every image path is optional — `Cover.jsx` paints `tint` as a CSS fallback and its `onError` handler drops the `<img>` if the file 404s, so the missing file reads as a deliberate editorial colour block. Do not create any file under `public/assets/images/writings/`.
- `src/data/seo.js`'s `allRoutes()` already iterates `writings` generically for both the listing entry (implicit via `staticSeo['/writings']`) and one `/writings/${w.slug}` detail route per entry with `writingSeo(w)` metadata — the new entry is automatically prerendered and added to the sitemap with zero changes to `seo.js`, `App.jsx`, or `prerender.js`.
- `src/routes/Writing.jsx` (the detail route) renders `w.body.map((p, i) => <p key={i}>...)` when `body` is present and non-empty — exactly the shape being added here — with no other logic branching on `type`.
- The codebase's established convention for apostrophes inside single-quoted JS string literals is the typographic curly apostrophe `’` (U+2019), never a backslash-escaped straight quote — confirmed via multiple existing `dek`/`bio` fields in this same file (e.g. `'Paul Onuwanibe on leadership, legacy, and rebuilding Africa’s business landscape...'`). Use `’` if the new `dek` needs an apostrophe.
- Source PDF (outside the repo, not to be committed): `C:\Users\Aliyan Khan\Downloads\Einstein_Szilard_1939_archival_facsimile.pdf` — a modern archival-facsimile reproduction of the real Einstein–Szilard letter to President Franklin D. Roosevelt, dated August 2, 1939. Do not commit the PDF itself; only the transcribed text goes into `content.js`.

**Exact new entry to append** (field order, indentation, quote style, and trailing commas all match the existing `the-gettysburg-address` entry exactly — 2-space object indent inside the array, 4-space property indent, 6-space `body` array item indent):

```js
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
  },
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Append the Einstein–Szilard letter entry to the writings array and commit locally</name>
  <files>src/data/content.js</files>
  <action>
In `src/data/content.js`, insert the exact new object literal given in the "Exact new entry to append" block above into the `writings` array, immediately after the `the-gettysburg-address` entry's closing `},` and before the trailing `.map((w) => ({ ...w, img: ... }))` line. Copy the object verbatim — field order (slug, title, type, year, dek, body, tint, ratio, w, h), indentation, single-quote style, the curly apostrophe in `dek`, and the em dashes inside the body paragraphs must all match exactly as given. Do not modify the existing `the-gettysburg-address` entry, the trailing `.map()` line, or any other export in this file. Do not create, reference, or fabricate any image file under `public/assets/images/writings/` — the entry relies entirely on the `tint` CSS fallback, per the existing MANIFEST.md-documented behavior. Do not modify `src/routes/Writings.jsx`, `src/routes/Writing.jsx`, `src/data/seo.js`, `src/App.jsx`, or `prerender.js` — none require changes for this addition.

After the edit is verified (see below), stage and commit only `src/data/content.js` locally: `git add src/data/content.js` then `git commit -m "..."` with a concise message describing the addition (e.g. referencing the Einstein–Szilard letter, 1939, new Letter type). Do NOT run `git push` or push to any remote — pushing requires separate confirmation from the orchestrator and is out of scope for this task.
  </action>
  <verify>
    <automated>test "$(awk '/export const writings = \[/,/\]\.map\(\(w\)/' src/data/content.js | grep -c "slug:")" -eq 2 && grep -q "slug: 'the-einstein-szilard-letter'" src/data/content.js && grep -q "type: 'Letter'" src/data/content.js && npm run build:client && echo PASS</automated>
  </verify>
  <done>`src/data/content.js`'s `writings` array has exactly 2 entries total — the original `the-gettysburg-address` unchanged, plus the new `the-einstein-szilard-letter` entry appended in the exact `{ slug, title, type, year, dek, body, tint, ratio, w, h }` shape given, with the full 13-paragraph transcribed letter text in `body`, a one-sentence own-words `dek`, and `type: 'Letter'`. `npm run build:client` completes without errors. The change is committed locally to `src/data/content.js` only, with no push to any remote.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| None | Pure data-file literal addition (one new plain object entry appended to an existing array in `src/data/content.js`) — no new code path, no user input, no client/server boundary crossed, no new dependency, no new asset file. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-lhx-01 | Tampering | src/data/content.js | low | accept | Static data-literal addition only — no logic change, no user input, no new dependency; existing `Cover` component's `onError` fallback already handles the (expected, permanent) missing image gracefully, same pattern as every other writings entry without a supplied photo. |
</threat_model>

<verification>
Run `npm run build:client` (client-only Vite build; avoids the full `npm run build` pipeline's DB-migration and secrets-check steps, which require environment configuration unrelated to this change). This confirms the new `content.js` entry is syntactically valid and that `Writings.jsx`/`Writing.jsx` bundle cleanly against the updated array shape (13-paragraph `body`, new `type: 'Letter'` value).
</verification>

<success_criteria>
- [ ] `src/data/content.js`'s `writings` array has exactly 2 entries: `the-gettysburg-address` (unchanged) then `the-einstein-szilard-letter` (new), in that order
- [ ] The new entry matches the `{ slug, title, type, year, dek, body, tint, ratio, w, h }` shape/order exactly, with `slug: 'the-einstein-szilard-letter'`, `title: 'The Einstein–Szilard Letter'`, `type: 'Letter'`, `year: '1939'`
- [ ] `body` contains the full letter text as separate paragraph strings, transcribed from the user-supplied PDF
- [ ] The `dek` is a single own-words sentence referencing the August 1939 White House delivery and its role in prompting nuclear research attention, with no verbatim reproduction of the letter's own sentences
- [ ] `tint` is a valid `oklch(L C H)` triple distinct from all other tints already in `content.js`
- [ ] No new image file created under `public/assets/images/writings/`
- [ ] No change to the existing `the-gettysburg-address` entry, the trailing `.map()` line, or any route/SEO file
- [ ] `npm run build:client` completes with no errors
- [ ] `src/data/content.js` is committed locally; no `git push` was run
</success_criteria>

<output>
Create `.planning/quick/260923-lhx-add-the-einstein-szilard-1939-letter-to-/260923-lhx-SUMMARY.md` when done
</output>
