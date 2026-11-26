---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: All-Screen Responsive & Hero Animation
current_phase: 11
current_phase_name: Thanksgiving Home Theme
status: verifying
stopped_at: Completed 11-01-PLAN.md
last_updated: "2026-11-15T23:10:54.637Z"
last_activity: 2026-11-26
last_activity_desc: Completed quick task 261126-obi: Add Peter Obi to Cultural Icons on home page after Pele
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-23)

**Core value:** A signed-in subscriber's paid access is real and enforced server-side — no page, download, or API response leaks paid content to someone who hasn't actually paid for it.
**Current focus:** Phase 11 — Thanksgiving Home Theme

## Current Position

Phase: 11 (Thanksgiving Home Theme) — EXECUTING
Plan: 1 of 1
Status: Phase complete — ready for verification
Last activity: 2026-11-16 - Completed quick task 261116-6i2: Added Issue 4 "The Legacy of Giving" as newest edition

Progress: [██████████] 100% (4/4 phases complete in v1.2)

## Performance Metrics

**Velocity:**

- Total plans completed: 13
- Average duration: ~26 min
- Total execution time: ~5.7 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3 | - | - |
| 02 | 3 | - | - |
| 03 | 3 | - | - |
| 04 | 2 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 03 P01 | 48min | 3 tasks | 9 files |
| Phase 03 P02 | 25min | 3 tasks | 9 files |
| Phase 03 P03 | 13min | 3 tasks | 2 files |
| Phase 04 P01 | 26min | 5 tasks | 7 files |
| Phase 04 P02 | 11min | 6 tasks | 11 files |
| Phase 05 P01 | 28min | 3 tasks | 3 files |
| Phase 05 P02 | 22min | 4 tasks | 2 files |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 05 P03 | 4min | 3 tasks | 3 files |
| Phase 11 P01 | 5min | 3 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap (v1.1): Research's suggested 5-phase structure (Foundation, Global Chrome, Content Pages, Modal Overlays, Subscribe/Account) was consolidated to 4 phases (6-9) per config's `coarse` granularity setting — Foundation's breakpoint-tier/token/touch-scroll work (FOUND-01..04) is folded into Phase 6 alongside Global Chrome (CHROME-01..03), its first visible consumer. The foundation-must-land-before-per-page-fixes ordering from research is preserved as sequenced plans within Phase 6 rather than as a standalone phase.
- Roadmap (v1.1): All 19 v1 requirements mapped 1:1 to Phase 6 (7 reqs), Phase 7 (4 reqs), Phase 8 (4 reqs), Phase 9 (4 reqs) — zero orphans. Phase 6 depends on Phase 5 only in the sense of not touching its entitlement logic; Phase 7 and Phase 9 both depend only on Phase 6; Phase 8 depends on Phase 6 and Phase 7 since both modals are triggered from content-page cover grids.
- Research: Session (identity) and entitlement (access) are kept structurally separate — entitlement is always a live DB read per gated request, never baked into a session cookie/JWT. Phase 4's content-gating checks should follow this same split.
- Phase 3: D-02 resolved to branch B: all 4 Stripe products have 2 active recurring prices each (monthly + annual), verified live against the real Stripe account
- Phase 3: lib/db.js extended to export `db` (pooled client) alongside `sql`, since the HTTP-based `sql` tagged template has no multi-statement transaction support but the webhook handler needs one — Phase 4 can reuse `db` if it needs a transaction too
- Phase 3: ran against the LIVE production Stripe account throughout (user's explicit, informed choice) — subsequently confirmed end-to-end via a real Checkout purchase during UAT, so this is now fully closed, not a carry-forward risk
- Phase 3: format-aware gating (GATE-03, Hard Copy vs. Online as independent entitlements) is encoded in `subscriptions.stripe_product_id` per-product rows — Phase 4's schema/query design should read against this directly
- Phase 4 (via /gsd-discuss + /gsd-research, D-01..D-17): gated content = Editions excerpt paragraphs only; writings gated by `eclat-online`; Hard Copy = zero digital access; only `status = 'active'` is entitled; gated text leaves `src/` entirely (D-11) and is served per-request by `GET /api/content/editions/:no` (D-15 fail-closed contract, D-17 single-edition) with `no-store` every branch + `vercel.json` defense-in-depth (D-16); render strategy = static shell + client-fetched gated block via new `src/lib/useSafeFetch.js` (D-07..D-09, backported into `useEntitlements`); not-entitled = silent `.plan__skeleton` (signed-out) / `--bad` fine-print (signed-in) per D-12/D-13; listing labels stay cosmetic & session-independent (D-14)
- Phase 4: Plan 04-01 implemented the dynamic entitlement route at api/content/editions/[no].js (Vercel bracket-segment convention) rather than the plan's literal api/content/editions.js — required for Vercel to actually route :no path segments
- Phase 4: Plan 04-02 restored content.js editions[].excerpt as FREE-ONLY 2-paragraph arrays and re-targeted check-secrets.js's marker to 'quiet luxury of authenticity' — npm run build is green end-to-end again; Phase 4 is complete (GATE-01..GATE-05 all delivered)
- Phase 4: Plan 04-02's --bad fetch-failure fine print uses className="fine" + inline style={{ color: 'var(--bad)' }} rather than a fine--bad CSS class (no such class exists in eclat.css; this phase makes zero CSS additions by design) — matches the existing inline-style convention already used in Subscribe.jsx/SubscribeSuccess.jsx for the same color
- Phase 4: Plan 04-02 left Account.jsx's Plan/Renews/Card fields and billing-history rows as explicitly-deferred placeholders (real plan cadence, renewal date, card-on-file, and per-user invoice history are Phase 5's ACCT-01/ACCT-04 scope) — see 04-02-SUMMARY.md Known Stubs
- Phase 5 (via /gsd-plan-phase 5, locked D-01..D-16): two-wave plan — Wave 1 (05-01, server) adds lib/products.js reverse maps (PRODUCT_ID_TO_KEY / PRICE_ID_TO_PRODUCT_KEY / planLabelFor), the new sibling GET /api/billing/account (DB-always-200 + three independent best-effort live Stripe sections; no-store every branch), and POST /api/billing/portal (CSRF-first via isSameOriginNavigation, own-customer scoped, PUBLIC_ORIGIN return_url); Wave 2 (05-02, client) adds src/lib/useAccount.js (the third useSafeFetch consumer) and rebuilds src/routes/Account.jsx (per-product panels in D-16 order, 3-state status, D-13 plan label, D-14 state-aware Renews/Access-until, ACCT-04 Payment-failed notice, one D-12 invoice table, portal POST handlers fixing WR-01). Both plans carry <threat_model> blocks (security gate); plan-checker passed with 0 blockers
- Phase 5 (executed 2026-09-10, commits 362c693..83ce821): **both waves complete.** Wave 1 shipped server-only reverse maps + GET /api/billing/account (locked per-slug contract; renews server-pre-formatted 'D MMM YYYY'; DB-always-200 with three best-effort Stripe sections) + POST /api/billing/portal (CSRF-first, own-customer, PUBLIC_ORIGIN return_url). Wave 2 shipped src/lib/useAccount.js (fail-closed, single-shot) and the full Account.jsx rebuild (real per-product panels in PRODUCTS order, 3-state status map with '—' fail-closed, state-aware CTA, ACCT-04 --bad notice with zero new CSS, one all-products invoice table, openPortal = POST + location.assign, WR-06/WR-01 verified). `npm run build` green, check-secrets clean, 31/31 client verifier checks PASS. **PLAN-DEFECTS documented in 05-02-SUMMARY/VERIFICATION:** plan's "Subscribe == exactly 1" and "Update payment method ≥ 2" counts are unsatisfiable vs the Copywriting Contract (implemented per contract); `node --check` cannot parse .jsx (build gate used instead). Remaining: end-of-phase human verification matrix (M1–M12) with `vercel dev` + real Google session + seeded DB.
- [Phase ?]: Phase 5 gap-closure (05-03): closed CR-01 (useSafeFetch now fails closed on any non-2xx/non-401 response; account.js DB-catch returns distinct 500), CR-02 (invoiceItems reads a single held key instead of duplicating the shared invoice list across held products), and CR-03 (cancelAtPeriodEnd now drives the Access-until label plus a confirmation notice, CTA left reachable) — zero regression to Phase 3/4 signed-out rendering, confirmed structurally via git diff.
- [Phase 11]: Thanksgiving theme gated by build-time THANKSGIVING constant in Home.jsx; leaf position/size in CSS (.tg-leaf--n) so the phone media query can override

### Pending Todos

None yet.

### Blockers/Concerns

- **ACTION NEEDED — seasonal theme (Phase 11):** Thanksgiving Home theme is live: set `THANKSGIVING = false` in `src/routes/Home.jsx` and redeploy — take-down date to be chosen by the user (no fixed date).
- **v1.1 verification requirement (research, 2026-09-13):** every mobile-responsive fix in Phases 6-9 must be verified on a real device or real touch-emulation (Chrome DevTools touch flag), not a resized-viewport-only DevTools check — bfcache staleness (SUB-04), iOS Safari scroll-lock (MODAL-01), dvh toolbar-collapse jump (FOUND-03), and VoiceOver/TalkBack swipe-trap (MODAL-04) do not reproduce under plain desktop viewport resize.
- **ACTION NEEDED — temporary security posture change (2026-09-10, quick-260910-pj6):** `api/content/editions/[no].js` currently has `TEMP_FREE_PREVIEW = true`, which serves full gated edition content to EVERY caller (no session or subscription check) as a time-boxed marketing promotion, explicitly requested by the site owner. All real entitlement logic (`getSessionUser`, the live `subscriptions` DB query, both not-entitled branches) remains fully intact and unmodified beneath the flag. **Revert by setting `TEMP_FREE_PREVIEW = false` in that file and redeploying** once the promotion period ends — no other file changes needed. Do not let this be forgotten.
- **RESOLVED (2026-09-10, plan 05-03): all 3 of Phase 5's confirmed critical defects are closed**, plus a 4th emergent critical bug found during 05-03's own code review. (1) CR-01 fixed: `src/lib/useSafeFetch.js` now throws before parsing the body for any non-2xx/non-401 response, and `api/billing/account.js`'s DB-failure branch returns a distinct 500 instead of reusing the "no session" 401 shape — verified not to regress Phase 3/4's `useEntitlements`/`useGatedContent` (both untouched by the fix, 401 stays exempt). (2) CR-02 fixed: invoices now read from a single held product key instead of being flattened across all held products. (3) CR-03 fixed: `cancelAtPeriodEnd` now drives the "Access until" label plus a new confirmation notice, with the "Manage" CTA deliberately left reachable. (4) **Emergent bug found+fixed during 05-03's code review**: `api/billing/account.js` was assigning the raw `@vercel/postgres` `QueryResult` object to `rows` instead of destructuring `{ rows }` — every other query site in the codebase does this correctly — which threw an unhandled `TypeError` on every authenticated request to `/api/billing/account`, meaning the endpoint had never returned real data for any user since Plan 05-01 first shipped it. Fixed in commit `a01e33c`. Phase re-verified 5/5 must-haves after these fixes; 5 items remain in `05-UAT.md` requiring a live environment.
- Phase 4 (Content Gating): **prerender-split blocker resolved** — D-10 locks `/editions/:no` as static shell + client-fetched gated block with the route-list trio (`src/App.jsx`, `src/data/seo.js`, `prerender.js`) untouched. Remaining Phase 4 risk is the physical content split: gated text must leave `src/` entirely (D-11) with zero residual import paths (see RESEARCH.md Common Pitfalls 1–2).
- **NEW (fix-pass):** `PUBLIC_ORIGIN` env var must be set (`.env.local` + Vercel) to the canonical `https` origin before `api/billing/checkout.js` can run — it now fails fast at module load without it (WR-07). `src/data/seo-site.js`'s `SITE.url` is still the `https://eclat.example` placeholder and is NOT used for this.
- Phase 3 code review fix pass: **complete** (2026-09-09) — all 10 warnings (WR-01..WR-10) and IN-01/IN-02 fixed and verified by a green `npm run build` (see `03-REVIEW.md` Fix-Pass Results). Remaining review items now folded into Phase 4 research/planning: IN-01 → D-16 (`no-store` on every gated branch + `vercel.json` rule), IN-03 → D-07..D-09 (`useEntitlements` backported onto shared `useSafeFetch`, delivered in Plan 04-02), IN-04 still deferred to Phase 5.
- [Phase 2] Cosmetic: `.env.example` documents an unused `SESSION_SECRET=` line (WR-07) — no code reads it, `hashToken()` uses plain SHA-256 by design. Fix was blocked by a sandbox permission restriction on that filename during the review-fix pass; low priority, safe to clean up whenever that file is next touched.
- **RESOLVED**: Phase 4's prerender-build blocker (Edition.jsx read `ed.excerpt` after Wave 1 deleted it) is fixed by Plan 04-02's excerpt restore — `npm run build` is green end-to-end.
- Phase 4 UAT carry-forward: the live 4-state entitlement matrix (signed-out / signed-in non-subscriber / signed-in active subscriber / signed-in + API 5xx) has not been exercised against a real `vercel dev` + seeded Postgres + real Google session in either 04-01 or 04-02's execution sessions — recommended before this phase is considered fully verified in production (see both plans' SUMMARY `human_judgment: true` items).
- Phase 5 UAT carry-forward: Wave 1's live Stripe enrichment branches (real card + paid invoices, past_due row, portal round-trip, CSRF matrix) and Wave 2's full manual matrix (M1–M12 in 05-02-VERIFICATION.md: multi-product panels, ACCT-04 notice on a real past_due row, >12 invoice table, forced degradations, portal redirect + remount refresh) require `vercel dev` + seeded DB + real Google session — automated gates are green; the end-of-phase human verification pass is the remaining gate before Phase 5 is "verified".

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 261126-obi | Add Peter Gregory Obi tribute card to Cultural Icons section on home page after Pelé | 2026-11-26 | 19597a3 | [261126-obi-add-peter-obi-to-cultural-icons](./quick/261126-obi-add-peter-obi-to-cultural-icons/) |
| 261126-bkc | Upload book covers ("Heir to the Obi" and "Under the Baobab") and scale down display sizes across /books and home shelf | 2026-11-26 | 4aefc0e | [261126-bkc-upload-book-covers-and-scale-display-sizes](./quick/261126-bkc-upload-book-covers-and-scale-display-sizes/) |
| 261116-6i2 | Add Issue 4 "The Legacy of Giving" (Dec 2026, 100 pages) as newest edition — hero fan centre, Just released, 3 highlights | 2026-11-16 | 9755da7 | [261116-6i2-add-issue-4-the-legacy-of-giving-as-newe](./quick/261116-6i2-add-issue-4-the-legacy-of-giving-as-newe/) |
| 261116-67d | Make the Thanksgiving hero leaves fall-animate and increase them (16 desktop / 8 phone) | 2026-11-16 | c3584cf | [261116-67d-make-the-thanksgiving-leaves-fall-animat](./quick/261116-67d-make-the-thanksgiving-leaves-fall-animat/) |
| 261005-ptq | Eliminate rectangular container glow bar in closing CTA section | 2026-10-05 | 5fd4cf6 | [261005-ptq-fix-glow-of-complimentary-copy-link-in-c](./quick/261005-ptq-fix-glow-of-complimentary-copy-link-in-c/) |
| 261005-9td | Fix React Router future flags and local dev/preview API endpoints | 2026-10-05 | e6ec0d1 | [261005-9td-fix-console-warnings-future-flags-and-lo](./quick/261005-9td-fix-console-warnings-future-flags-and-lo/) |
| 261005-9la | Apply client website copy changes from Eclat_Client_Website_Changes_for_Claude_Code.pdf | 2026-10-05 | 6cadfc1 | [261005-9la-apply-client-website-copy-changes-from-e](./quick/261005-9la-apply-client-website-copy-changes-from-e/) |
| 261002-6e5 | Add publishing location to Footer copyright message | 2026-10-02 | 36fbc26 | [261002-6e5-add-publishing-location-to-footer-copyri](./quick/261002-6e5-add-publishing-location-to-footer-copyri/) |
| 260925-3u3 | Add two videos to the Videos section | 2026-09-25 | eaf5521 | [260925-3u3-add-two-videos-xaxvhklbrwc-u4hkm6wzmfy-t](./quick/260925-3u3-add-two-videos-xaxvhklbrwc-u4hkm6wzmfy-t/) |
| 260925-60j | Present Adams / Van Gogh / Einstein letters as a single trilogy in Writings | 2026-09-25 | 587a8e8 | [260925-60j-present-abigail-adams-van-gogh-einstein-](./quick/260925-60j-present-abigail-adams-van-gogh-einstein-/) |
| 260925-66a | Visually separate the letters trilogy from the documents below it on /writings | 2026-09-25 | 96fd947 | [260925-66a-visually-separate-the-letters-trilogy-fr](./quick/260925-66a-visually-separate-the-letters-trilogy-fr/) |
| 260909-kco | Fix checkout.js hard-failing on a stale/invalid stored stripe_customer_id | 2026-09-09 | 5916f7f | [260909-kco-fix-checkout-js-hard-failing-on-a-stale-](./quick/260909-kco-fix-checkout-js-hard-failing-on-a-stale-/) |
| 260909-l31 | Fix /subscribe page card grid layout: equal-height cards, no orphaned card, aligned buttons | 2026-09-09 | 7b337a2 | [260909-l31-fix-subscribe-page-card-grid-layout-equa](./quick/260909-l31-fix-subscribe-page-card-grid-layout-equa/) |
| 260910-vid | Separate hero fan to magazines-only; add /videos section (8 oEmbed-verified American culture/history clips, click-to-play modal, CSP update) | 2026-09-10 | 50dc6af, 378e1e6 | [260910-vid-add-videos-section-separate-hero-fan](./quick/260910-vid-add-videos-section-separate-hero-fan/) |
| 260910-soon | Fill empty hero fan slots with blurred "Coming Soon" cards; iterated flat tint -> stock photo -> drawn CSS covers -> 4 varied looks + real glassmorphism | 2026-09-10 | e051aa3, 21f9da5, 34a1e02, cde2156 | [260910-soon-hero-fan-coming-soon-cards](./quick/260910-soon-hero-fan-coming-soon-cards/) |
| 260910-icon | Add "Cultural Icons" decorative section to Home page (8 user-supplied tribute images + bios, uniform sizing; renamed from "American Icons") | 2026-09-10 | 2af6218, 67952bd, cc7386a | [260910-icon-american-icons-home-section](./quick/260910-icon-american-icons-home-section/) |
| 260910-fr3 | Make Edition page's "Inside this edition" free-preview strip edition-specific: swap dead generic `samples` placeholder for real per-edition `articles` filtered by `editionNo` | 2026-09-10 | 71b37cf | [260910-fr3-in-magazine-free-preview-fill-in-some-da](./quick/260910-fr3-in-magazine-free-preview-fill-in-some-da/) |
| 260910-g36 | Replace Marilyn Monroe + Muhammad Ali Cultural Icons portraits with user-supplied images (JPEG-to-PNG re-encode + corrected aspect-ratio metadata for Ali); add `useOnlinePrice` hook wiring Home/Edition Subscribe CTAs to the real live Stripe price instead of a hardcoded `$9/mo` | 2026-09-10 | c9e9eff, 8a5766d, ae40a01 | [260910-g36-swap-two-cultural-icons-section-images-w](./quick/260910-g36-swap-two-cultural-icons-section-images-w/) |
| 260910-gwx | Add Princess Diana and Mother Teresa as Cultural Icons entries (user-supplied images, 10 icons total); Mother Teresa removed again in a same-session follow-up task | 2026-09-10 | 91b4c87 | [260910-gwx-add-princess-diana-and-mother-teresa-as-](./quick/260910-gwx-add-princess-diana-and-mother-teresa-as-/) |
| 260910-jrt | Remove Mother Teresa Cultural Icons entry, add Pelé instead (user-supplied 1254x1254 square image, new aspect ratio) | 2026-09-10 | a95e864 | [260910-jrt-remove-mother-teresa-from-cultural-icons](./quick/260910-jrt-remove-mother-teresa-from-cultural-icons/) |
| 260910-p67 | Remove 6 fictional placeholder writings entries + duplicate Yes We Can test entry (leaves only real Gettysburg Address article); fix Writing.jsx hero image to render at native 1024x1536 portrait ratio instead of cropped 3/2 box | 2026-09-10 | 1884b42, a90daba | [260910-p67-remove-all-fictional-placeholder-writing](./quick/260910-p67-remove-all-fictional-placeholder-writing/) |
| 260910-pj6 | Add temporary `TEMP_FREE_PREVIEW` bypass to `api/content/editions/[no].js` — serves full gated edition content to every caller (no session/subscription check) for a time-boxed promotion; real entitlement logic left fully intact underneath, revertible by flipping one constant back to `false` | 2026-09-10 | d58a5a6 | [260910-pj6-temporarily-make-full-magazine-editions-](./quick/260910-pj6-temporarily-make-full-magazine-editions-/) |
| 260910-qgi | Build full-magazine pop-up preview modal: converted user-supplied print PDFs (60+62 pages) to 122 compressed JPEGs, new `MagazinePreview.jsx` page-flip modal (mirrors Lightbox a11y contract), wired into Edition's entitled branch with fallback preserved | 2026-09-10 | ef79e49, 28cb3b3, 09b5956 | [260910-qgi-build-a-full-magazine-popup-preview-moda](./quick/260910-qgi-build-a-full-magazine-popup-preview-moda/) |
| 260910-onm | Replace Home hero headline/lede/flag pill copy, add "Explore the Issue" CTA; extend Footer copyright line with Éclat Life Style LLC publisher sentence | 2026-09-10 | 369d7e5, b8a75db | [260910-onm-update-home-page-hero-copy-rename-the-ne](./quick/260910-onm-update-home-page-hero-copy-rename-the-ne/) |
| 260910-o5t | Build a real article-detail page (`/writings/:slug`, mirrors Edition.jsx pattern); add optional `body` field to writings; populate Gettysburg Address with real full text, add Yes We Can (2008) as dek-only teaser | 2026-09-10 | 2b3c12b, 7833d41, 79b8ba9 | [260910-o5t-build-a-real-article-detail-page-for-the](./quick/260910-o5t-build-a-real-article-detail-page-for-the/) |
| 260910-jsf | Add "The Gettysburg Address" (1863) as a 7th, real (non-fictional) Writings entry — PNG-to-JPEG re-encode of user-supplied artwork, new `Speech` type, own-words dek | 2026-09-10 | 133fd20 | [260910-jsf-add-abraham-lincoln-s-gettysburg-address](./quick/260910-jsf-add-abraham-lincoln-s-gettysburg-address/) |
| 260913-hgd | Add YouTube Short `U4jOI7N3qwo` (real title/channel fetched via YouTube oEmbed: "This Prof. Yemi Osinbajo Speech Will Make You Stop and Think!" / ATILOYE GLOBAL TV) to the Videos section; reword the closing "One subscription" CTA heading to "Our stories, our voice, our Éclat. / Come belong." in both Home.jsx and the Eclat.dc.html design-canvas mirror | 2026-09-13 | 1e7824c, c64c1ae | [260913-hgd-add-youtube-shorts-video-u4joi7n3qwo-to-](./quick/260913-hgd-add-youtube-shorts-video-u4joi7n3qwo-to-/) |
| 260922-rev | Reverse free read bypass and restore Stripe payments | 2026-09-22 | 550982a | N/A |
| 260922-lad | Add direct complimentary copy link to LaDidiér reader in Home CTA section without using 'free' wording | 2026-09-22 | 7cb3188 | N/A |
| 260922-cta | Remove 'Two issues, two children’s books, every essay.' from Home closing CTA section | 2026-09-22 | faa2037 | N/A |
| 260922-hro | Add small 'COMPLIMENTARY COPY AVAILABLE HERE' button in Home hero section | 2026-09-22 | dc5e0d4 | N/A |
| 260922-bim | Change 'Monthly' to 'Bi-monthly' on /subscribe and enable local dev billing endpoints in Vite | 2026-09-22 | 6dbda9a | N/A |
| 260922-r14 | Update complimentary copy links in hero and CTA to https://ladidier.com/read and https://ladidier.com/#read | 2026-09-22 | 508a008 | [260922-r14-update-complimentary-copy-links](./quick/260922-r14-update-complimentary-copy-links/) |
| 260922-r8s | Change site link message title to Discover EcLat | 2026-09-22 | d38e313 | [260922-r8s-change-site-link-message-title-to-discov](./quick/260922-r8s-change-site-link-message-title-to-discov/) |
| 260923-og-logo | Replace OG link-preview image: magazine cover → ÉcLAT° logo (1200×630 WebP) | 2026-09-23 | ef3cb80 | [260922-r8s-change-site-link-message-title-to-discov](./quick/260922-r8s-change-site-link-message-title-to-discov/) |
| 260923-lhx | Add the Einstein–Szilard 1939 letter to Writings (new 'Letter' type entry, transcribed from user-supplied archival-facsimile PDF) | 2026-09-23 | 6ed104a | [260923-lhx-add-the-einstein-szilard-1939-letter-to-](./quick/260923-lhx-add-the-einstein-szilard-1939-letter-to-/) |
| 260923-nof | Add real PDF previews for 6 archival Writings letters (inline iframe + download link on detail pages, 5 new chronologically-ordered entries + Einstein-Szilard letter gains its pdf field, CSP frame-src widened to 'self') | 2026-09-23 | 03f3aa3, 6486840, 6ad641b | [260923-nof-add-real-pdf-previews-for-archival-lette](./quick/260923-nof-add-real-pdf-previews-for-archival-lette/) |
| 260923-o9g | Replace raw iframe PDF viewer with rasterized Lightbox pages: PyMuPDF-rasterized 14 page JPGs for the 6 archival letters, real thumbnails on /writings, Writing.jsx reverted to plain prose, Lightbox.jsx gains multi-page Prev/Next + keyboard + swipe paging | 2026-09-23 | ceb43b2, 212392f, e5946d9 | [260923-o9g-replace-the-raw-iframe-pdf-viewer-added-](./quick/260923-o9g-replace-the-raw-iframe-pdf-viewer-added-/) |
| 260925-add | Add writings: The Girl Who Changed Lincoln's Face, A Trilogy, 13th Amendment | 2026-09-25 | 9d56cce | [20260925-add-writings](./quick/20260925-add-writings/) |
| 260925-fix | Fix aspect ratio for recent writings | 2026-09-25 | 258f3bd | [20260925-fix-writings-ratio](./quick/20260925-fix-writings-ratio/) |
| 261003-5a3 | Add looping glow/flash animation (with prefers-reduced-motion override) to hero and closing-CTA complimentary copy links | 2026-10-03 | 29ff83e | [261003-5a3-make-the-complimentary-copy-link-more-vi](./quick/261003-5a3-make-the-complimentary-copy-link-more-vi/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none — first milestone)* | | | |

## Session Continuity

Last session: 2026-11-15T23:10:54.624Z
Stopped at: Completed 11-01-PLAN.md
Resume file: None
