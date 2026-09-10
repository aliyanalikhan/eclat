---
phase: quick-260910-icon
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/content.js
  - src/routes/Home.jsx
autonomous: false
requirements: []

estimate:
  tokens: 20000
  raw_tokens: 20000
  tasks: 1
  confidence: high

must_haves:
  truths:
    - "The 4 user-supplied tribute images (Louis Armstrong, Elvis Presley, Muhammad Ali, Marilyn Monroe) render on the Home page in a new decorative section."
    - "Before placing the 2 images styled as fake 'ÉcLat LiFeStyLe' magazine covers (fabricated issue number/date/barcode, different brand than the site's real 'Éclat'), the user is explicitly told this and given the choice to strip that framing, keep it, or skip those two — not silently placed as-is."
  artifacts:
    - src/data/content.js (icons export)
    - src/routes/Home.jsx (American Icons section)
  key_links:
    - "Reuses .band/.shelf/Cover exactly as the existing Books & writings section, since these are already-finished designed images with no missing-art fallback need."
---

<objective>
User supplied 4 local tribute/poster images and asked to put up "pictures of some American icons" — the same request declined in an earlier quick task (260910-vid) when no images were supplied and generating real celebrity likenesses was out of scope. With real user-supplied images in hand, place them on the Home page.

Two of the four (Ali, Marilyn) are styled as fake magazine covers under a different brand name ("ÉcLat LiFeStyLe") with fabricated issue metadata — flagged to the user via AskUserQuestion before placement rather than assumed.

Output: new "American Icons" decorative band on Home.jsx, 4 images copied to public/assets/images/icons/.
</objective>
