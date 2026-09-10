---
phase: quick-260910-onm
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/routes/Home.jsx
  - src/components/Footer.jsx
autonomous: true
requirements: []

estimate:
  tokens: 15000
  raw_tokens: 15000
  tasks: 2
  confidence: high

must_haves:
  truths:
    - "Home page hero <h1> renders the single sentence 'Where remarkable stories come to light.' with no <br/>/<em> two-line split."
    - "Home page hero lede paragraph renders the exact sentence 'Éclat celebrates the visionaries, leaders, creators, and changemakers whose stories deserve to be told.'"
    - "Home page hero flag pill reads 'THE {DATE IN UPPERCASE} ISSUE' (e.g. 'THE SEPTEMBER 2026 ISSUE' for the current newest edition) instead of 'New issue — {date}', with the decorative dot span unchanged."
    - "Home page hero now has a working 'Explore the Issue' button linking to /editions/{newest.no}, placed in hero__copy right after the lede and before hero__scroll, matching the existing 'See inside this edition' button's Link shape."
    - "Footer's copyright line contains both the existing &copy; {year} notice and the verbatim sentence 'Éclat bi-monthly online magazine and the children's books are published by Éclat Life Style LLC', while the separate 'Quarterly since {SITE.founded}.' line is left completely untouched."
  artifacts:
    - src/routes/Home.jsx (hero__flag, h1, hero__lede text updated; new Explore the Issue Link added)
    - src/components/Footer.jsx (footer__fine copyright line extended with publisher sentence)
  key_links:
    - "New hero 'Explore the Issue' Link must use the identical `to={`/editions/${newest.no}`}` shape already used by the newest-issue section's 'See inside this edition' button, or it silently points at the wrong route/format."
    - "Footer's SITE.name/SITE.founded imports and the separate 'Quarterly since {SITE.founded}.' line stay completely untouched — the publisher sentence is added as new literal text alongside the existing &copy; {year} expression, not by editing content.js."
---

<objective>
Three copy-only changes to the public Home page and site footer, all requested verbatim by the user:

1. Replace the hero `<h1>`/lede text on `src/routes/Home.jsx` with the user's new headline and sub-line.
2. Rename the hero's "New issue — {date}" flag pill to "THE {DATE} ISSUE" (uppercased), and add a new "Explore the Issue" CTA button into the hero, mirroring the existing "See inside this edition" button already used lower on the same page.
3. Extend the Footer's existing `&copy; {year} {SITE.name}` line to also carry the user's exact publisher sentence about Éclat Life Style LLC.

This is copy/markup only — no new data fields, no routing changes, no CSS additions, no touching SITE.founded/SITE.name in content.js, no touching the pre-existing "Quarterly since {SITE.founded}." footer line or the newest-issue section's own "See inside this edition" button.

Output: updated hero copy + new hero CTA on Home.jsx; updated copyright line on Footer.jsx.
</objective>

<execution_context>
@get-shit-done/workflows/execute-plan.md
@get-shit-done/templates/summary.md
</execution_context>

<context>
@src/routes/Home.jsx
@src/components/Footer.jsx

Confirmed current state (already read in full — do not re-read beyond what's needed to apply the edits):

- `src/routes/Home.jsx` already imports `Link` from `'react-router-dom'` (line 1) — no new import needed for the hero CTA.
- The hero section (`<section className="hero" data-hero="1">`, lines 81-218) contains a `<div className="hero__copy" data-copy-block="1">` block (lines 198-213) with, in order: a `<div className="hero__halo">`, the `<p className="hero__flag" data-hero-copy="1">` flag pill (`<span className="dot" aria-hidden="true" />` + `New issue — {newest.date}`, lines 200-203), the `<h1 data-hero-copy="1">` (currently "Two issues" / `<br />` / `<em>of paying attention</em>`, lines 204-208), and the `<p className="hero__lede" data-hero-copy="1">` (lines 209-212). The `hero__copy` div closes on line 213. A separate `<p className="hero__scroll" data-hero-copy="1" aria-hidden="true">SCROLL</p>` (line 215) sits outside `hero__copy`, after it — do not move or touch this element.
- `newest` (line 61) is `editions[0]`, already in scope in `Home()` — `newest.date` is a string like `'September 2026'`, `newest.no` is a number.
- The exact button pattern to mirror lives in the "newest issue" section further down (lines 270-273): `<Link to={`/editions/${newest.no}`} className="btn">See inside this edition</Link>`. The only differences for the new hero button: different text ("Explore the Issue") and a new placement inside `hero__copy`. Do not modify the original button at lines 270-273 in any way.
- `src/components/Footer.jsx` imports `{ SITE }` from `'../data/content.js'` and defines `const year = 2026` (line 5). The footer renders two separate `<p className="footer__fine">` lines: one reading `Quarterly since {SITE.founded}.` (lines 11-13, inside the mark/logo block) and one reading `&copy; {year} {SITE.name}` (lines 34-36, at the end of `footer__inner`). Only the second one (`&copy; {year} {SITE.name}`) is edited by this plan. The first ("Quarterly since...") is a pre-existing, separate tagline elsewhere in the file with its own "quarterly" vs. the publisher sentence's "bi-monthly" wording — this is a pre-existing discrepancy, explicitly out of scope for this task; do not touch it or attempt to reconcile the wording.
- Codebase convention elsewhere uses the typographic `&rsquo;` HTML entity for apostrophes in JSX text (e.g. Home.jsx's `children&rsquo;s books`, Footer.jsx's own `Children&rsquo;s Books` nav link). The publisher sentence in this task is a direct user quote that must appear byte-for-byte verbatim (including a plain straight apostrophe in "children's"), so this one line intentionally uses a literal `'` instead of `&rsquo;` — do not "correct" it to the entity, and do not apply this exception anywhere else in the file.
- Do not touch any other section of Home.jsx (fan/covers, "newest issue" section's own copy, featured articles, books & writings, cultural icons, closing CTA), and do not touch `src/data/content.js`'s `SITE` object (`SITE.founded`, `SITE.name` stay exactly as they are — this plan only reads them, never edits them).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Hero headline/lede replacement, flag rename, new "Explore the Issue" CTA</name>
  <files>src/routes/Home.jsx</files>
  <action>
In `src/routes/Home.jsx`'s hero section, inside the `<div className="hero__copy" data-copy-block="1">` block:

1. In the `<p className="hero__flag" data-hero-copy="1">` pill, keep the `<span className="dot" aria-hidden="true" />` element exactly as-is, but change the text after it from `New issue — {newest.date}` to `THE {newest.date.toUpperCase()} ISSUE` — so for the current newest edition (`date: 'September 2026'`) this renders "THE SEPTEMBER 2026 ISSUE".

2. Replace the `<h1 data-hero-copy="1">` element's entire contents (currently "Two issues" / `<br />` / `<em>of paying attention</em>`) with the single plain-text sentence `Where remarkable stories come to light.` — no `<br />`, no `<em>`, just this one sentence as the h1's text content. Keep the `data-hero-copy="1"` attribute.

3. Replace the `<p className="hero__lede" data-hero-copy="1">` element's entire text content with the exact sentence `Éclat celebrates the visionaries, leaders, creators, and changemakers whose stories deserve to be told.` (wrap across lines for readability if needed, matching this file's existing line-wrapping convention — the words must not be altered). Keep the `data-hero-copy="1"` attribute.

4. Immediately after this `hero__lede` paragraph's closing `</p>`, and immediately before the `hero__copy` div's own closing `</div>`, add a new element: `<Link to={`/editions/${newest.no}`} className="btn">Explore the Issue</Link>` — identical shape to the existing "See inside this edition" button used in the "newest issue" section further down this same file, just with different link text and this new placement inside the hero. Do not add any wrapping div/row around it unless required for valid JSX; a bare `<Link>` as the last child of `hero__copy` is sufficient. Do not touch the separate `<p className="hero__scroll">` paragraph that sits after `hero__copy` closes.

Do not modify the fan/cover markup above `hero__copy`, the `hero__halo` div, or any section below the hero.
  </action>
  <verify>
    <automated>grep -q 'THE {newest.date.toUpperCase()} ISSUE' src/routes/Home.jsx && ! grep -q 'New issue —' src/routes/Home.jsx && grep -q 'Where remarkable stories come to light.' src/routes/Home.jsx && ! grep -q 'of paying attention' src/routes/Home.jsx && grep -q 'Éclat celebrates the visionaries' src/routes/Home.jsx && grep -q 'leaders, creators, and changemakers' src/routes/Home.jsx && grep -q 'deserve to be told.' src/routes/Home.jsx && grep -q 'Explore the Issue' src/routes/Home.jsx && grep -c 'to={`/editions/${newest.no}`}' src/routes/Home.jsx | grep -q '^2$' && echo PASS</automated>
  </verify>
  <done>Hero flag pill reads "THE {DATE} ISSUE" (uppercased, dot span intact); h1 is the single new sentence with no <br/>/<em>; lede is the new visionaries/leaders/creators/changemakers sentence; a working "Explore the Issue" Link to /editions/{newest.no} sits inside hero__copy right after the lede; the pre-existing "See inside this edition" button and every other section of the file are unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: Add publisher/copyright sentence to Footer</name>
  <files>src/components/Footer.jsx</files>
  <action>
In `src/components/Footer.jsx`, replace the contents of the second `<p className="footer__fine">` element (the one currently rendering `&copy; {year} {SITE.name}`, at the end of `footer__inner`) so it keeps the existing `&copy; {year}` copyright notice AND includes, verbatim, the user's exact sentence: `Éclat bi-monthly online magazine and the children's books are published by Éclat Life Style LLC` (plain straight apostrophe in "children's" — see context note on why this line deviates from the file's usual `&rsquo;` convention). A reasonable combined rendering is: `&copy; {year} {SITE.name}. Éclat bi-monthly online magazine and the children's books are published by Éclat Life Style LLC.` — the `&copy;` entity and `{year}` variable must remain exactly as before, and the quoted sentence must appear character-for-character somewhere in the line.

Do not touch the separate `<p className="footer__fine">Quarterly since {SITE.founded}.</p>` line earlier in the same file (inside the mark/logo block) — leave it exactly as it is, including the "quarterly" vs. "bi-monthly" wording difference from the new sentence; that discrepancy is a pre-existing, out-of-scope tagline this task does not reconcile. Do not modify the `footer__nav` links or any other part of the file.
  </action>
  <verify>
    <automated>grep -q '&copy; {year}' src/components/Footer.jsx && grep -q "Éclat bi-monthly online magazine and the children's books are published by Éclat Life Style LLC" src/components/Footer.jsx && grep -q 'Quarterly since {SITE.founded}.' src/components/Footer.jsx && echo PASS</automated>
  </verify>
  <done>Footer's `&copy; {year}` copyright line now also contains the verbatim publisher sentence "Éclat bi-monthly online magazine and the children's books are published by Éclat Life Style LLC"; the separate "Quarterly since {SITE.founded}." line and the footer nav links are unchanged.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| None | Pure static-copy/markup change — replaces hardcoded JSX text strings and adds one existing-pattern `<Link>` on two presentational components. No user input, no new data flow, no client/server boundary crossed, no change to any entitlement/session/auth logic. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-onm-01 | Tampering | src/routes/Home.jsx, src/components/Footer.jsx | low | accept | Both edits are literal, hardcoded JSX text/markup changes with no user-controlled input; the new `<Link>` reuses the existing `to={`/editions/${newest.no}`}` pattern already rendered elsewhere on the same page, so no new route or data path is introduced. |
</threat_model>

<verification>
Run `npm run build` from the project root (or, if the sandbox's `scripts/migrate.js` step fails on a missing `POSTGRES_URL` as in prior quick tasks, fall back to running `vite build`, then `vite build --ssr src/entry-server.jsx --outDir dist/server`, then `node prerender.js` individually). Confirm the build completes with no errors referencing `Home.jsx` or `Footer.jsx`, and that `dist/index.html` contains "Where remarkable stories come to light.", "Explore the Issue", and the uppercased "ISSUE" flag text, and `dist/index.html` (footer is shared chrome) also contains the new publisher sentence.
</verification>

<success_criteria>
- [ ] Hero `<h1>` is exactly "Where remarkable stories come to light." with no `<br/>`/`<em>` split
- [ ] Hero lede is exactly "Éclat celebrates the visionaries, leaders, creators, and changemakers whose stories deserve to be told."
- [ ] Hero flag pill reads "THE {DATE IN UPPERCASE} ISSUE" with the decorative dot span intact
- [ ] A new "Explore the Issue" `<Link to={`/editions/${newest.no}`} className="btn">` renders inside hero__copy, after the lede
- [ ] The pre-existing "See inside this edition" button and every other Home.jsx section are unchanged
- [ ] Footer's `&copy; {year}` line also contains the verbatim publisher sentence about Éclat Life Style LLC
- [ ] Footer's "Quarterly since {SITE.founded}." line and nav links are untouched
- [ ] `SITE.founded`/`SITE.name` in `src/data/content.js` are unchanged
- [ ] `npm run build` (or its individual steps) completes with no errors
</success_criteria>

<output>
Create `.planning/quick/260910-onm-update-home-page-hero-copy-rename-the-ne/260910-onm-SUMMARY.md` when done
</output>
