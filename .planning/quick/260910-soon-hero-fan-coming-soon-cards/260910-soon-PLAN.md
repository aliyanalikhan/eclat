---
phase: quick-260910-soon
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/routes/Home.jsx
  - src/styles/eclat.css
autonomous: true
requirements: []

estimate:
  tokens: 15000
  raw_tokens: 15000
  tasks: 1
  confidence: medium

must_haves:
  truths:
    - "With fewer than 5 real editions, the hero fan still shows a full 5-card spread — empty slots are filled with a visually distinct 'Coming Soon' placeholder instead of being left empty."
    - "The placeholder card's background (tint + stripe texture) reads as blurred; the 'Coming Soon' label itself stays crisp and legible."
    - "Placeholders never land in the lead/centre slot when at least one real edition exists — they only fill the outer/mid slots real editions haven't claimed."
    - "The existing scroll-driven fan-open animation (useScrollFx) continues to work unmodified — placeholders participate in the same data-fan/data-fx/data-fy/data-fr contract as real cards, no separate animation path."
  artifacts:
    - src/routes/Home.jsx (buildFan, fan render map)
    - src/styles/eclat.css (.fan-card__soon, .fan-card__soon-label)
  key_links:
    - "backdrop-filter (blurs what's behind an element) is used instead of filter:blur() (which would blur the element's own children too) — this is what lets the tint/texture blur while 'Coming Soon' stays sharp, without restructuring the DOM hierarchy useScrollFx measures."
---

<objective>
The previous quick task restricted the hero fan to magazines-only, which — with only 2 real editions — left 3 of the fan's 5 fixed slots empty, reading as sparse. Fill those empty slots with a blurred "Coming Soon" placeholder card instead, so the spread stays visually balanced until more real editions exist.

Output: `buildFan` fills unclaimed slots with a `comingSoon` marker instead of leaving them null; the render map shows a Cover with the same tint+stripe fallback, backdrop-blurred, with a crisp "Coming Soon" label on top.
</objective>
