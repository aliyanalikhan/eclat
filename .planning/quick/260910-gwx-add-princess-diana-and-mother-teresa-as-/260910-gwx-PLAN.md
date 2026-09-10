---
phase: quick-260910-gwx
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - public/assets/images/icons/princess-diana.png
  - public/assets/images/icons/mother-teresa.png
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
    - "The Cultural Icons section on the Home page shows two additional tribute portraits, Princess Diana and Mother Teresa, appended after the existing nine, rendered at their correct native aspect ratio with no stretching or cropping."
    - "Both new icon entries carry short, factual, uncontroversial bios matching the tone/length/format of the existing entries (one sentence, dates in parens, what they're known for)."
  artifacts:
    - public/assets/images/icons/princess-diana.png (new file, copied from user-supplied source, 1024x1536)
    - public/assets/images/icons/mother-teresa.png (new file, copied from user-supplied source, 1024x1536)
    - src/data/content.js (icons array gains two new entries after things-fall-apart, before the trailing .map())
  key_links:
    - "The two new icons array entries' slug field must exactly match their .png filename stem (princess-diana, mother-teresa), since the trailing .map((i) => ({ ...i, img: `/assets/images/icons/${i.slug}.png` })) derives the img path from slug alone."
    - "ratio/w/h (1024/1536, 1024, 1536) must match the copied files' real pixel dimensions exactly, or Cover's aspect-ratio CSS will letterbox/crop the new portraits."
---

<objective>
Add two new decorative Cultural Icons entries — Princess Diana and Mother Teresa — to the Home page's tribute section, using two images the user supplied and confirmed they hold rights to.

Purpose: Extends the existing user-supplied tribute gallery (9 entries) with two more, following the exact same pattern already established for the other 9 icons (see the prior 260910-icon and 260910-g36 quick tasks for precedent).

Output: Two new image files under public/assets/images/icons/, and two new objects appended to the `icons` array in src/data/content.js. No changes to Home.jsx (it already generically maps over `icons` with no per-entry special-casing) and no changes to any existing icon entry.
</objective>

<execution_context>
@get-shit-done/workflows/execute-plan.md
@get-shit-done/templates/summary.md
</execution_context>

<context>
@src/data/content.js
@src/routes/Home.jsx

Confirmed current state (already read in full — do not re-read beyond what's needed to apply the edits):

- Source images (outside the repo, same machine, confirmed via `file` to exist and both already be genuine PNGs at 1024x1536 — identical dimensions to several existing entries, e.g. `elvis-presley`, `james-brown`, `wole-soyinka`, `things-fall-apart`): `C:\Users\Aliyan Khan\Downloads\61A67EE7-8B4B-4B0F-8F57-AF206A3A6C27.png` (Princess Diana) and `C:\Users\Aliyan Khan\Downloads\52401969-77A0-4DB2-B50B-FAFFFEE64F31.png` (Mother Teresa). No format conversion or dimension-metadata correction is needed — a straight binary copy into place is sufficient.
- `src/data/content.js`'s `icons` array runs lines 180-245, nine entries each shaped `{ slug, name, bio, ratio, w, h }`, followed by a trailing `.map((i) => ({ ...i, img: '/assets/images/icons/${i.slug}.png' }))` on line 245 that derives every icon's image path from its `slug` alone. The last entry before the `.map()` line is `things-fall-apart` (Chinua Achebe), ending at line 244 with a closing `},`.
- The header comment above the array (lines 173-179) already documents that these are user-supplied, decorative-only tribute images with short factual bios "deliberately kept to widely-documented basics" — do not edit this comment, and do not touch any of the 9 existing entries.
- `src/routes/Home.jsx` (lines 372-397, the "Cultural Icons" section) maps generically over `icons` — no per-slug special-casing exists, so no changes are needed there. This has been confirmed by reading the file; do not modify it.
- Existing bio style to mirror exactly, e.g. `muhammad-ali`: "Three-time world heavyweight boxing champion (1942–2016) and civil-rights advocate, widely regarded as one of the 20th century's greatest athletes." and `fela-kuti`: "Nigerian multi-instrumentalist and composer (1938–1997) who pioneered Afrobeat and used his music as a platform for activism." — one sentence, en-dash date range in parens immediately after the name/title, then what they're known for.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Copy Princess Diana and Mother Teresa images, add their icons array entries</name>
  <files>public/assets/images/icons/princess-diana.png, public/assets/images/icons/mother-teresa.png, src/data/content.js</files>
  <action>
Copy the two user-supplied source images into place, preserving them as-is (no re-encoding, no resizing — both are already genuine PNGs at 1024x1536, matching several existing entries' dimensions exactly): copy `C:\Users\Aliyan Khan\Downloads\61A67EE7-8B4B-4B0F-8F57-AF206A3A6C27.png` to `public/assets/images/icons/princess-diana.png`, and copy `C:\Users\Aliyan Khan\Downloads\52401969-77A0-4DB2-B50B-FAFFFEE64F31.png` to `public/assets/images/icons/mother-teresa.png`.

Then, in `src/data/content.js`, append two new object literals to the `icons` array immediately after the `things-fall-apart` entry's closing `},` (line 244) and before the trailing `.map((i) => ({ ...i, img: ... }))` line (line 245). Each new object must match the exact field shape and order of every existing entry — `slug`, `name`, `bio`, `ratio`, `w`, `h`, in that order, with no `img` field (that's derived by the trailing `.map()`), each field on its own line and a trailing comma after each object, matching the existing entries' formatting exactly.

First new entry: `slug` is `'princess-diana'`, `name` is `'Princess Diana'`, `bio` is a single sentence reading "Princess of Wales (1961–1997), globally recognized for her humanitarian work confronting HIV/AIDS stigma and advocating for a worldwide ban on landmines." (en-dash between the years, matching the existing bios' punctuation style), `ratio` is `'1024/1536'`, `w` is `1024`, `h` is `1536`.

Second new entry: `slug` is `'mother-teresa'`, `name` is `'Mother Teresa'`, `bio` is a single sentence reading "Catholic nun and missionary (1910–1997), founder of the Missionaries of Charity and 1979 Nobel Peace Prize laureate for her work with the poor of Kolkata." (en-dash between the years), `ratio` is `'1024/1536'`, `w` is `1024`, `h` is `1536`.

Do not modify any of the 9 existing entries, the header comment above the array (lines 173-179), the trailing `.map()` line itself, or any other export in this file. Do not modify `src/routes/Home.jsx` — it already renders any `icons` array entry generically with no per-slug logic.
  </action>
  <verify>
    <automated>file public/assets/images/icons/princess-diana.png | grep -q "PNG image data, 1024 x 1536" && file public/assets/images/icons/mother-teresa.png | grep -q "PNG image data, 1024 x 1536" && test "$(grep -c "slug: 'princess-diana'" src/data/content.js)" -eq 1 && test "$(grep -c "slug: 'mother-teresa'" src/data/content.js)" -eq 1 && test "$(grep -v '^//' src/data/content.js | grep -c "slug: '")" -eq 11 && echo PASS</automated>
  </verify>
  <done>`public/assets/images/icons/princess-diana.png` and `public/assets/images/icons/mother-teresa.png` exist as genuine 1024x1536 PNGs (verified via `file`), and `src/data/content.js`'s `icons` array now has 11 entries total — the original 9 unchanged, plus new `princess-diana` and `mother-teresa` entries appended in the same `{ slug, name, bio, ratio, w, h }` shape, each with a factual one-sentence bio matching the file's existing tone.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| None | Pure static-asset addition (two new image files) + a data-file literal addition (two new plain object entries in an existing array) — no new code path, no user input, no client/server boundary crossed, no new dependency. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-gwx-01 | Tampering | public/assets/images/icons/princess-diana.png, mother-teresa.png, src/data/content.js | low | accept | Binary image addition and static data-literal addition only — no logic change, no user input, no new dependency; existing `Cover` component's `onError` fallback already handles a malformed/missing image gracefully, same as all 9 existing icon entries. |
</threat_model>

<verification>
Run `npm run build` from the project root. This environment's build pipeline first step (`scripts/migrate.js`) requires `POSTGRES_URL`, which is not configured in this sandbox — a known, pre-existing gap unrelated to this change. If the full `npm run build` fails specifically on the migration step for that reason, fall back to running the remaining build steps individually (client Vite build, SSR Vite build, then `node prerender.js`) to confirm: the two new PNGs don't break the build, the two new content.js entries don't break prerender (Home.jsx's SSR pass renders the icons array, including the two new entries, with no undefined-field errors), and the Home route still prerenders cleanly with 11 Cultural Icons cards.
</verification>

<success_criteria>
- [ ] `public/assets/images/icons/princess-diana.png` exists, genuine PNG, 1024x1536
- [ ] `public/assets/images/icons/mother-teresa.png` exists, genuine PNG, 1024x1536
- [ ] `src/data/content.js`'s `icons` array has exactly 11 entries: the original 9 unchanged, plus `princess-diana` and `mother-teresa` appended after `things-fall-apart` and before the trailing `.map()`
- [ ] Both new entries match the `{ slug, name, bio, ratio, w, h }` shape/order exactly, with `ratio: '1024/1536', w: 1024, h: 1536`
- [ ] Both new bios are single factual sentences with a dates-in-parens + known-for structure, matching existing entries' tone
- [ ] No change to any of the 9 existing icon entries, the header comment, the trailing `.map()` line, or `src/routes/Home.jsx`
- [ ] `npm run build` (or its individual steps, given the known POSTGRES_URL gap) completes with the Home route prerendering all 11 icons
</success_criteria>

<output>
Create `.planning/quick/260910-gwx-add-princess-diana-and-mother-teresa-as-/260910-gwx-SUMMARY.md` when done
</output>
