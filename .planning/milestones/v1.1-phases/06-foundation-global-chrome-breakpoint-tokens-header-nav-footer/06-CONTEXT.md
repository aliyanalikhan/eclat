# Phase 6: Foundation & Global Chrome — Breakpoint Tokens, Header, Nav & Footer - Context

**Gathered:** 2026-09-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase establishes the shared visual/touch foundation the rest of the v1.1 mobile-responsive milestone depends on — a single documented breakpoint tier, fluid typography/spacing tokens, stable full-height sections, and a resolved touch-vs-native-scroll conflict — and makes the global header/nav/footer (visible on every page) fully usable at phone-portrait widths (~375–430px). It does not touch content pages (Phase 7), modals (Phase 8), or Subscribe/Account (Phase 9), and it makes zero changes to entitlement/auth/billing logic.

</domain>

<decisions>
## Implementation Decisions

### Breakpoint Consolidation
- **D-01:** Keep two documented breakpoint tiers rather than converging to one — nav continues collapsing at 900px, general content layout continues collapsing at 720px. No visual/behavioral change from today; the fix is that both values (plus the 460px and 1080px tiers) become named, documented tokens in `eclat.css` that `useScrollFx` (720px) and `Header.jsx` (900px) are written to match, eliminating the current 3-way independent-literal drift research flagged. — **Reversibility:** reversible — pure documentation/token consolidation, no behavior change to undo

### Touch Drag-Scroll Behavior
- **D-02:** On touch (coarse pointer), let native OS scrolling own the horizontal drag-scroll strips (hero fan, Cultural Icons, Videos) — gate the existing `useDragScroll` JS handler off via `matchMedia('(pointer: coarse)')`. Desktop mouse-drag behavior is completely unchanged. Touch users get standard momentum/snap scrolling instead of the custom JS drag physics. — **Reversibility:** reversible — a single conditional gate in `motion.js`, easy to relax later if touch UX needs revisiting

### Nav Drawer Style
- **D-03:** Keep the existing mobile-nav visual pattern exactly as-is (fixed full-width dropdown under the header, toggled by `Header.jsx`'s `isMobile` state) — this phase only fixes phone-width bugs (safe-area insets on notched devices, 44px tap targets), it does not redesign the nav's visual style (e.g., no slide-in side drawer). — **Reversibility:** reversible — a future phase could still redesign nav visuals without conflicting with this phase's fixes

### 100vh/dvh Fix Scope
- **D-04:** Apply the `svh`-with-`vh`-fallback fix only to the 3 spots research identified as user-visible (hero section, lightbox, mobile nav dropdown) — not a full audit of every `vh` usage in `eclat.css`. Matches the phase's fix-not-rebuild scope. — **Reversibility:** reversible — additional `vh` spots can be fixed in a later pass if found

### Claude's Discretion
- Exact fluid `clamp()` values for typography/spacing tokens (research's example values are a starting point, not locked)
- Whether a `useBreakpoint.js` shared hook (Architecture Pattern 3) is worth extracting now vs. deferred — research says only introduce it if a third JS breakpoint consumer appears during this phase's work
- Footer-specific CSS fixes (no gray area was raised about footer specifically; treat as straightforward phone-width polish under the same token system)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research (this milestone)
- `.planning/research/SUMMARY.md` — synthesized findings across all 4 research dimensions; read first
- `.planning/research/ARCHITECTURE.md` — the authoritative integration analysis for this phase: exact line numbers for `eclat.css` tokens/media blocks, `motion.js`'s `useScrollFx`/`useDragScroll`, `Header.jsx`'s `isMobile` pattern, and the confirmed build order (Phase A = this phase)
- `.planning/research/STACK.md` — confirms zero new dependencies; documents the `svh`/`clamp()`/`touch-action`/Pointer Events techniques to use
- `.planning/research/PITFALLS.md` — the `useScrollFx`'s 720px vs. CSS's 900px band discontinuity, and the `100vh` toolbar-jump specifics

### Project-level
- `.planning/PROJECT.md` — Core Value, milestone scope (phone-portrait ~375–430px only)
- `.planning/REQUIREMENTS.md` — FOUND-01..04, CHROME-01..03 (this phase's requirements)
- `.planning/ROADMAP.md` — Phase 6 section (goal, success criteria, dependency on Phase 5)

No external specs/ADRs — requirements fully captured in REQUIREMENTS.md and the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Header.jsx`'s `isMobile` state + `matchMedia('(max-width: 900px)')` + `.nav[hidden]` toggle — the working mobile-nav pattern to extend, not replace (per D-03)
- `eclat.css:8-37` — existing `:root` token block; add breakpoint-tier documentation and fluid `clamp()` tokens here rather than a new file
- `motion.js`'s `useDragScroll` (lines 254-306) — already built on Pointer Events; needs only a `pointer: coarse` gate added (per D-02), not a rewrite

### Established Patterns
- Single CSS file (`eclat.css`, no preprocessor, `cssCodeSplit: false`) — stay inside this convention, no Sass/PostCSS/Tailwind
- CSS custom properties for values (colors, spacing, type scale already exist) but breakpoints themselves must stay plain numeric literals at each `@media` call site (CSS can't reference `var()` in a media query condition) — discipline is a documented comment block, not a technical enforcement mechanism

### Integration Points
- `eclat.css`'s `.nav`/`.nav__toggle` rules (~line 2004-2039) ↔ `Header.jsx` — JS owns open/closed boolean + a11y attributes, CSS owns presentation; any nav fix follows this existing split
- `prerender.js`/`entry-server.jsx` ↔ CSS — confirmed zero interaction (CSS is one static route-agnostic asset); no prerender-side changes needed for this phase

</code_context>

<specifics>
## Specific Ideas

No specific visual references given beyond "keep it as it is, just fix the bugs" — all 4 decisions in this discussion chose the lowest-risk, fix-not-redesign option. This confirms the phase's overall posture: retrofit, not redesign.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Nav redesign and a full `vh` audit were both explicitly considered and deferred by the user's choices in D-03/D-04, not raised as out-of-scope scope-creep — noted above as decisions, not here.)

### Reviewed Todos (not folded)
None — `todo.match-phase` returned zero matches for Phase 6.

</deferred>

---

*Phase: 6-Foundation & Global Chrome — Breakpoint Tokens, Header, Nav & Footer*
*Context gathered: 2026-09-13*
