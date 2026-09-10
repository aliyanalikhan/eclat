---
phase: quick-260910-jrt
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - public/assets/images/icons/mother-teresa.png
  - public/assets/images/icons/pele.png
  - src/data/content.js
autonomous: true
requirements: []

estimate:
  tokens: 10000
  raw_tokens: 10000
  tasks: 1
  confidence: low

must_haves:
  truths:
    - "The Cultural Icons section on the Home page no longer shows a Mother Teresa portrait, and instead shows a new Pelé portrait, rendered at its correct native aspect ratio (square, no stretching or cropping)."
    - "The Pelé bio is a short, factual, uncontroversial single-sentence bio matching the tone/format of the existing entries (dates in parens + what he's known for)."
    - "The Princess Diana entry and all 8 original entries are untouched — this task only removes mother-teresa and adds pele."
  artifacts:
    - "src/data/content.js (icons array: mother-teresa entry removed entirely; pele entry appended after princess-diana, before the trailing .map())"
    - "public/assets/images/icons/pele.png (new file, copied from user-supplied source, 1254x1254)"
    - "public/assets/images/icons/mother-teresa.png (deleted from disk)"
  key_links:
    - "The new pele entry's slug field must exactly match its .png filename stem (pele), since the trailing .map((i) => ({ ...i, img: `/assets/images/icons/${i.slug}.png` })) derives the img path from slug alone."
    - "ratio/w/h (1254/1254, 1254, 1254) must match the copied file's real pixel dimensions exactly — this is a new square aspect ratio not currently used by any other icons entry — or Cover's aspect-ratio CSS will letterbox/crop the new portrait."
---

<objective>
Remove the `mother-teresa` Cultural Icons entry (data + image) that was just added in the immediately-preceding quick task, and add a new `pele` entry (data + image) in its place, using a user-supplied square image.

Purpose: The user asked for Mother Teresa to be removed right after it landed (commit 91b4c87), and to add Pelé instead. This follows the exact same pattern already established for the other 9 icons entries (see 260910-icon, 260910-g36, 260910-gwx quick tasks for precedent).

Output: `public/assets/images/icons/mother-teresa.png` deleted, `public/assets/images/icons/pele.png` added, and `src/data/content.js`'s `icons` array updated: 9 entries after removal (8 original + princess-diana), then 10 entries after the pele addition (8 original + princess-diana + pele). No changes to `src/routes/Home.jsx` (it already renders any `icons` array entry generically) and no changes to the princess-diana entry or any of the 8 original entries.
</objective>

<execution_context>
@get-shit-done/workflows/execute-plan.md
@get-shit-done/templates/summary.md
</execution_context>

<context>
@src/data/content.js
@src/routes/Home.jsx

Confirmed current state (already read in full — do not re-read beyond what's needed to apply the edits):

- `src/data/content.js`'s `icons` array currently runs lines 180-261, with 10 entries in this order: `louis-armstrong`, `elvis-presley`, `muhammad-ali`, `marilyn-monroe`, `james-brown`, `wole-soyinka`, `fela-kuti`, `things-fall-apart`, `princess-diana`, `mother-teresa` — each shaped `{ slug, name, bio, ratio, w, h }` — followed by a trailing `.map((i) => ({ ...i, img: '/assets/images/icons/${i.slug}.png' }))` on line 261 that derives every icon's image path from its `slug` alone.
- The `mother-teresa` entry is the last entry before the `.map()` line (currently lines 253-260: `{ slug: 'mother-teresa', name: 'Mother Teresa', bio: 'Catholic nun and missionary (1910–1997), founder of the Missionaries of Charity and 1979 Nobel Peace Prize laureate for her work with the poor of Kolkata.', ratio: '1024/1536', w: 1024, h: 1536, },`). Removing it entirely leaves `princess-diana` (currently lines 245-252) as the new last entry.
- The header comment above the array (lines 173-179) already documents that these are user-supplied, decorative-only tribute images with short factual bios "deliberately kept to widely-documented basics" — do not edit this comment, and do not touch `princess-diana` or any of the 8 original entries.
- `src/routes/Home.jsx` (lines 372-397, the "Cultural Icons" section) maps generically over `icons` — no per-slug special-casing exists, so no changes are needed there. This has been confirmed by reading the file; do not modify it.
- Source image for the new entry (outside the repo, same machine, confirmed via `file` to be a genuine PNG at 1254x1254 — a new square aspect ratio not currently used by any existing icons entry): `C:\Users\Aliyan Khan\Downloads\74F4F610-F715-468C-9B0E-E679E0EEA9AC.png`. No format conversion or resizing is needed — a straight binary copy into place is sufficient.
- Existing bio style to mirror exactly, e.g. `muhammad-ali`: "Three-time world heavyweight boxing champion (1942–2016) and civil-rights advocate, widely regarded as one of the 20th century's greatest athletes." — one sentence, en-dash date range in parens immediately after the name/title (or after "born ..." where relevant), then what they're known for.
- Note (not part of this task): a Princess Diana image the user also mentioned was confirmed byte-for-byte identical (sha256) to the already-added `princess-diana.png` — it is a duplicate, not a new image, so the `princess-diana` entry must NOT be touched by this task.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove mother-teresa, add pele — image files and icons array entry</name>
  <files>public/assets/images/icons/mother-teresa.png, public/assets/images/icons/pele.png, src/data/content.js</files>
  <action>
Delete `public/assets/images/icons/mother-teresa.png` from disk (remove it from the working tree so the next commit reflects the deletion — plain `rm` or `git rm` are both fine).

Copy the user-supplied source image `C:\Users\Aliyan Khan\Downloads\74F4F610-F715-468C-9B0E-E679E0EEA9AC.png` to `public/assets/images/icons/pele.png`, preserving it as-is (no re-encoding, no resizing — it is already a genuine PNG at 1254x1254). When invoking from Git Bash, use forward-slash form of the source path (e.g. `/c/Users/Aliyan Khan/Downloads/74F4F610-F715-468C-9B0E-E679E0EEA9AC.png`) or quote the Windows-style path as given.

Then, in `src/data/content.js`, remove the `mother-teresa` object literal entirely from the `icons` array (the block currently at lines 253-260, from its opening `{` through its closing `},`), leaving the `princess-diana` entry as the new last entry before the trailing `.map((i) => ({ ...i, img: ... }))` line.

Next, append one new object literal to the `icons` array immediately after the (now-last) `princess-diana` entry's closing `},` and before the trailing `.map()` line. It must match the exact field shape and order of every existing entry — `slug`, `name`, `bio`, `ratio`, `w`, `h`, in that order, with no `img` field (that's derived by the trailing `.map()`), each field on its own line and a trailing comma after the object, matching the existing entries' formatting exactly.

New entry: `slug` is `'pele'`, `name` is `'Pelé'`, `bio` is a single sentence reading "Brazilian footballer (1940–2022), born Edson Arantes do Nascimento, a three-time FIFA World Cup winner with Brazil widely regarded as one of the greatest footballers of all time." (en-dash between the years, matching the existing bios' punctuation style), `ratio` is `'1254/1254'`, `w` is `1254`, `h` is `1254`.

Do not modify the `princess-diana` entry, any of the 8 original entries, the header comment above the array (lines 173-179), the trailing `.map()` line itself, or any other export in this file. Do not modify `src/routes/Home.jsx` — it already renders any `icons` array entry generically with no per-slug logic.
  </action>
  <verify>
    <automated>test ! -f public/assets/images/icons/mother-teresa.png && file public/assets/images/icons/pele.png | grep -q "PNG image data, 1254 x 1254" && ! grep -q "slug: 'mother-teresa'" src/data/content.js && test "$(grep -c "slug: 'pele'" src/data/content.js)" -eq 1 && test "$(sed -n '/^export const icons = \[/,/^\]\.map/p' src/data/content.js | grep -c "slug: '")" -eq 10 && echo PASS</automated>
  </verify>
  <done>`public/assets/images/icons/mother-teresa.png` no longer exists. `public/assets/images/icons/pele.png` exists as a genuine 1254x1254 PNG (verified via `file`). `src/data/content.js`'s `icons` array now has exactly 10 entries (scoped count, not a whole-file grep — the file also contains unrelated `slug:` fields in editions/books/writings/articles): the 8 original entries and `princess-diana` unchanged, `mother-teresa` removed, and a new `pele` entry appended in the same `{ slug, name, bio, ratio, w, h }` shape with `ratio: '1254/1254', w: 1254, h: 1254` and a factual one-sentence bio matching the file's existing tone.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| None | Pure static-asset removal/addition (one deleted image, one new image) + a data-file literal edit (remove one plain object entry, append another) — no new code path, no user input, no client/server boundary crossed, no new dependency. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-jrt-01 | Tampering | public/assets/images/icons/mother-teresa.png, pele.png, src/data/content.js | low | accept | Binary image removal/addition and static data-literal edit only — no logic change, no user input, no new dependency; existing `Cover` component's `onError` fallback already handles a malformed/missing image gracefully, same as all other icon entries. |
</threat_model>

<verification>
Run `npm run build` from the project root. This environment's build pipeline first step (`scripts/migrate.js`) requires `POSTGRES_URL`, which is not configured in this sandbox — a known, pre-existing gap unrelated to this change (see prior quick-task SUMMARYs for the same caveat). If the full `npm run build` fails specifically on the migration step for that reason, fall back to running the remaining build steps individually (client Vite build, SSR Vite build, then `node prerender.js`) to confirm: `pele.png` doesn't break the build, the updated `content.js` doesn't break prerender (Home.jsx's SSR pass renders the icons array, including the new `pele` entry and the absence of `mother-teresa`, with no undefined-field errors), and the Home route still prerenders cleanly with 10 Cultural Icons cards. Check the prerendered `dist/index.html` contains "Pelé" and `pele.png`, and does NOT contain "Mother Teresa" or `mother-teresa.png`.
</verification>

<success_criteria>
- [ ] `public/assets/images/icons/mother-teresa.png` no longer exists on disk
- [ ] `public/assets/images/icons/pele.png` exists, genuine PNG, 1254x1254
- [ ] `src/data/content.js`'s `icons` array has exactly 10 entries: the 8 original entries + `princess-diana` unchanged, `mother-teresa` removed, `pele` appended after `princess-diana` and before the trailing `.map()`
- [ ] The new `pele` entry matches the `{ slug, name, bio, ratio, w, h }` shape/order exactly, with `ratio: '1254/1254', w: 1254, h: 1254`
- [ ] The `pele` bio is a single factual sentence with a dates-in-parens + known-for structure, matching existing entries' tone
- [ ] No change to `princess-diana`, any of the 8 original icon entries, the header comment, the trailing `.map()` line, or `src/routes/Home.jsx`
- [ ] `npm run build` (or its individual steps, given the known POSTGRES_URL gap) completes with the Home route prerendering all 10 icons, Pelé present, Mother Teresa absent
</success_criteria>

<output>
Create `.planning/quick/260910-jrt-remove-mother-teresa-from-cultural-icons/260910-jrt-SUMMARY.md` when done
</output>
