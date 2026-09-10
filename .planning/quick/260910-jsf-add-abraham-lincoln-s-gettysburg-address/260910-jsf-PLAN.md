---
phase: quick-260910-jsf
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - public/assets/images/writings/the-gettysburg-address.jpg
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
    - "The Writings page shows a seventh entry, The Gettysburg Address, appended after Cold Water, rendered with a working cover image at the same 3/2 aspect ratio as the other six entries, with correct type/year/dek."
    - "The dek is a single-sentence, own-words description of the speech (referencing the November 1863 Gettysburg battlefield dedication, its brevity, and its 'new birth of freedom' theme) with no verbatim reproduction of the historical text beyond that short phrase."
  artifacts:
    - public/assets/images/writings/the-gettysburg-address.jpg (new file, genuinely re-encoded as JPEG from the user-supplied PNG source via Pillow — not a renamed copy — 1024x1536 preserved)
    - src/data/content.js (writings array gains a 7th entry after cold-water, before the trailing .map())
  key_links:
    - "The new entry's slug field (the-gettysburg-address) must exactly match the .jpg filename stem, since the trailing .map((w) => ({ ...w, img: `/assets/images/writings/${w.slug}.jpg` })) derives the img path from slug alone and hardcodes the .jpg extension."
    - "The source file is a PNG; the writings map's hardcoded .jpg extension means it must be genuinely transcoded to JPEG (Pillow's Image.save with format JPEG), not merely renamed, or the browser will receive PNG bytes at a .jpg URL."
---

<objective>
Add one new entry to the `writings` array in `src/data/content.js` for Abraham Lincoln's Gettysburg Address (1863) — a real historical public-domain document — using a user-supplied "scroll" graphic image, following the exact same data-shape pattern as the existing six writings entries.

Purpose: Lets the user test how the Writings section (currently six fictional/placeholder entries) handles a real, non-fictional historical document, using a decorative image they created themselves (same self-created-tribute-graphic pattern already established for other recent additions this session).

Output: One new JPEG at `public/assets/images/writings/the-gettysburg-address.jpg` (re-encoded from the user's PNG source), and one new object appended to the `writings` array in `src/data/content.js`. No changes to `src/routes/Writings.jsx` (it already generically maps over `writings` with no per-type special-casing — confirmed by reading the file) and no changes to any of the six existing writings entries.
</objective>

<execution_context>
@get-shit-done/workflows/execute-plan.md
@get-shit-done/templates/summary.md
</execution_context>

<context>
@src/data/content.js
@src/routes/Writings.jsx

Confirmed current state (already read in full — do not re-read beyond what's needed to apply the edits):

- Source image (outside the repo, same machine, confirmed via `file` to be a genuine PNG, 1024x1536, 8-bit RGB, non-interlaced): `C:\Users\Aliyan Khan\Downloads\ED82EC4D-9B99-45E1-B740-3D079341C01E.png` — a designed "scroll" graphic with the full historical speech text rendered as decorative artwork, created by the user themselves.
- `src/data/content.js`'s `writings` array runs lines 92-141, six entries each shaped `{ slug, title, type, year, dek, tint }` in that exact field order, followed by a trailing `.map((w) => ({ ...w, img: `/assets/images/writings/${w.slug}.jpg` }))` on line 141 that derives every entry's image path from its `slug` alone, always with a hardcoded `.jpg` extension — different from the `icons` array's `.png` convention. The last entry before the `.map()` line is `cold-water`, ending at line 140 with a closing `},`. Unlike `editions`/`books`/`icons`, writings entries carry NO `ratio`/`w`/`h` fields — `src/routes/Writings.jsx` hardcodes `ratio="3/2"` for every `<Cover>` and lightbox regardless of an image's native dimensions, so no dimension metadata is needed or wanted on the new entry.
- `public/assets/images/writings/` currently contains only a `.gitkeep` — no real writings images exist yet, so this will be the first.
- `src/routes/Writings.jsx` (confirmed by reading it in full) maps generically over `writings` with no per-slug or per-type special-casing, no enum/allowlist restricting `type` — it just renders `{w.type}` as-is. No changes are needed there; do not modify it.
- Existing entry shape/style to mirror exactly, e.g. `night-shift`: `{ slug: 'night-shift', title: 'Night Shift', type: 'Essay', year: '2023', dek: 'What the country looks like between two and five in the morning.', tint: 'oklch(0.38 0.08 300)' }` — one-sentence `dek`, no trailing period is present on some but IS present on all six existing entries (every existing `dek` ends with a period), `tint` is a valid `oklch(L C H)` triple.
- This environment has Python 3 with Pillow (PIL) confirmed installed and importable. PowerShell/.NET invocation is known to be BLOCKED inside worktree-isolated sandboxes in this environment (confirmed in a prior task this session) — use Pillow (`Image.open(...).save(..., 'JPEG', quality=90)`) as the primary path; only fall back to PowerShell if running outside a worktree sandbox context and Pillow is somehow unavailable.
- Do NOT transcribe or reproduce the Gettysburg Address's full text anywhere in code, comments, or commit messages. The `dek` is a one-sentence teaser written in the executor's own words — it may reference the speech being delivered at the Gettysburg battlefield dedication in November 1863, its brevity, and its "new birth of freedom" theme, but must not quote more than a few words of the original verbatim.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Re-encode the source image as JPEG and add the Gettysburg Address entry to the writings array</name>
  <files>public/assets/images/writings/the-gettysburg-address.jpg, src/data/content.js</files>
  <precondition>Source PNG exists at C:\Users\Aliyan Khan\Downloads\ED82EC4D-9B99-45E1-B740-3D079341C01E.png and Python's Pillow (PIL) library is importable — both already confirmed in this session.</precondition>
  <action>
Using Python with Pillow, open the source PNG at `C:\Users\Aliyan Khan\Downloads\ED82EC4D-9B99-45E1-B740-3D079341C01E.png`, convert it to RGB mode (JPEG has no alpha channel), and save it as a genuine JPEG (format `JPEG`, quality 90) at `public/assets/images/writings/the-gettysburg-address.jpg`, preserving the source's native 1024x1536 dimensions (no resize, no crop — Writings.jsx's CSS handles fitting into the 3/2 display box, matching how every other writings/icons image is already handled unresized). Run this as a one-off `python -c "..."` invocation (or an inline script in the scratchpad directory) rather than a persisted helper script in the repo. After saving, confirm the output file is a genuine JPEG (not a renamed PNG) by running the `file` command against it and checking the output reads "JPEG image data".

Then, in `src/data/content.js`, append one new object literal to the `writings` array immediately after the `cold-water` entry's closing `},` (line 140) and before the trailing `.map((w) => ({ ...w, img: ... }))` line (line 141). The new object must match the exact field shape and order of every existing entry — `slug`, `title`, `type`, `year`, `dek`, `tint`, in that order, each field on its own line, with a trailing comma after the object, matching the existing entries' formatting exactly. Field values: `slug` is `'the-gettysburg-address'`; `title` is `'The Gettysburg Address'`; `type` is `'Speech'` (a new type value — confirmed nothing in Writings.jsx restricts `type` to an enum); `year` is `'1863'`; `dek` is a single sentence, ending in a period, written in the executor's own words, referencing the November 1863 Gettysburg battlefield dedication, the speech's brevity, and its "new birth of freedom" theme, without quoting more than a few words of the original verbatim, matching the fragment-style tone of the six existing deks (e.g. "Fourteen months, one oven at a time, and what speed costs."); `tint` is a plausible warm sepia/parchment-toned OKLCH value in the same `oklch(L C H)` format as existing entries (e.g. `oklch(0.55 0.05 70)`), to serve as the fallback color before the image loads.

Do not modify any of the six existing writings entries, the trailing `.map()` line itself, any other export in this file, or `src/routes/Writings.jsx`.
  </action>
  <verify>
    <automated>file "public/assets/images/writings/the-gettysburg-address.jpg" | grep -qi "JPEG image data, 1024 x 1536" && test "$(awk '/export const writings = \[/,/\]\.map\(\(w\)/' src/data/content.js | grep -c "slug:")" -eq 7 && grep -q "slug: 'the-gettysburg-address'" src/data/content.js && echo PASS</automated>
  </verify>
  <done>`public/assets/images/writings/the-gettysburg-address.jpg` exists as a genuine JPEG (verified via `file`, not a renamed PNG) at the source's native 1024x1536 dimensions, and `src/data/content.js`'s `writings` array now has 7 entries total — the original 6 unchanged, plus a new `the-gettysburg-address` entry appended in the same `{ slug, title, type, year, dek, tint }` shape, with a one-sentence own-words `dek` (no verbatim reproduction of the historical text beyond a few words) matching the tone of the existing six.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| None | Pure static-asset addition (one new image file, transcoded from a user-supplied source) + a data-file literal addition (one new plain object entry in an existing array) — no new code path, no user input, no client/server boundary crossed, no new dependency. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-jsf-01 | Tampering | public/assets/images/writings/the-gettysburg-address.jpg, src/data/content.js | low | accept | Binary image addition (genuinely re-encoded via Pillow, verified via `file`) and static data-literal addition only — no logic change, no user input, no new dependency; existing `Cover` component's `onError` fallback already handles a malformed/missing image gracefully, same as all six existing writings entries. |
</threat_model>

<verification>
Run `npm run build` from the project root. This environment's build pipeline first step (`scripts/migrate.js`) requires `POSTGRES_URL`, which is not configured in this sandbox — a known, pre-existing gap unrelated to this change. If the full `npm run build` fails specifically on the migration step for that reason, fall back to running the remaining build steps individually (client Vite build, SSR Vite build, then `node prerender.js`) to confirm: the new JPEG doesn't break the build, the new content.js entry doesn't break prerender (Writings.jsx's SSR pass renders the writings array, including the new entry, with no undefined-field errors), and the Writings route still prerenders cleanly with 7 entries.
</verification>

<success_criteria>
- [ ] `public/assets/images/writings/the-gettysburg-address.jpg` exists, genuine JPEG (not a renamed PNG), 1024x1536
- [ ] `src/data/content.js`'s `writings` array has exactly 7 entries: the original 6 unchanged, plus `the-gettysburg-address` appended after `cold-water` and before the trailing `.map()`
- [ ] The new entry matches the `{ slug, title, type, year, dek, tint }` shape/order exactly, with `slug: 'the-gettysburg-address'`, `title: 'The Gettysburg Address'`, `type: 'Speech'`, `year: '1863'`
- [ ] The new `dek` is a single own-words sentence referencing the November 1863 Gettysburg dedication, brevity, and the "new birth of freedom" theme, with no verbatim reproduction of the historical text beyond that short phrase
- [ ] `tint` is a valid `oklch(L C H)` triple in a warm sepia/parchment range
- [ ] No change to any of the six existing writings entries, the trailing `.map()` line, or `src/routes/Writings.jsx`
- [ ] `npm run build` (or its individual steps, given the known POSTGRES_URL gap) completes with the Writings route prerendering all 7 entries
</success_criteria>

<output>
Create `.planning/quick/260910-jsf-add-abraham-lincoln-s-gettysburg-address/260910-jsf-SUMMARY.md` when done
</output>