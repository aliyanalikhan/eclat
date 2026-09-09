# Phase 3 — End-of-Phase UAT Harvest

**Harvested:** 2026-09-09, during Plan 03-03 (per `workflow.human_verify_mode=end-of-phase`)
**Scope:** Every `<verify><human-check>` block across Plans 03-01, 03-02, and 03-03.
**Context:** This Stripe account is LIVE (production), not test-mode — supplied deliberately by the user (see `03-01-SUMMARY.md` Decisions Made). Several of the plans' human-checks were written assuming a TEST-mode account (test cards, "Send test webhook" against a sandboxed endpoint); against a LIVE account those same checks would require either (a) switching this project's Stripe keys to TEST mode for verification purposes, or (b) a real, billable transaction. Neither substitution was made unilaterally by the execution agent — see the **Recommendation** at the end of this file.

| # | Plan/Task | Check | Status | Evidence | Why deferred (if not run) |
|---|-----------|-------|--------|----------|----------------------------|
| 1 | 03-01 Task 1 | D-02 branch/price-ID confirmation against the Stripe Dashboard | **PASS (agent-verified, live query)** | `lib/products.js` header comment + `03-01-SUMMARY.md` — resolved live via `stripe.prices.list({ product })` against the real account this session, branch B confirmed (2 prices/product) | A human should still visually cross-check the 8 price IDs in `lib/products.js` against the Dashboard before shipping, since the automated verification queried the same live account it was reconciling against — recommended, not required |
| 2 | 03-01 Task 2 | Real signed-in browser hit on `GET /api/billing/checkout?product=eclat-online` redirects to `checkout.stripe.com` | **NOT RUN** | `03-01-SUMMARY.md` "Known Gaps" | Requires a real Google OAuth sign-in in a real browser — outside a scripted agent session's reach; automated 401/400/302-to-sign-in guard-clause tests all passed |
| 3 | 03-01 Task 3 | Dashboard-sent `checkout.session.completed` + `customer.subscription.updated` test webhooks, inspect `subscriptions`/`webhook_events` | **SUBSTITUTED, NOT literally run** | `03-01-SUMMARY.md` — full dispatch/idempotency/transaction logic verified instead via locally-generated, correctly-signed payloads against the real `STRIPE_WEBHOOK_SECRET` and real DB; test rows cleaned up and confirmed absent | Account is live/production; a real Dashboard-sent test event would be indistinguishable from real traffic to any other integration watching this account |
| 4 | 03-02 Task 1 | `GET /api/billing/prices` amounts cross-checked visually against Stripe Dashboard | **NOT RUN** (superseded by #7 below) | `03-02-SUMMARY.md` "Known Gaps"; re-confirmed live in `03-03-CAPTURES.md` "Money-path e2e" section this session | Automated check asserted shape + no-leak only, not "are these the right launch numbers" — that judgment call is inherently human |
| 5 | 03-02 Task 2 | Signed-out/signed-in `/subscribe` picker visual UX (tile layout, badge placement, preselect scroll) | **NOT RUN** | `03-02-SUMMARY.md` "Known Gaps" | `vercel dev` was not run in a browser this session; all automated string/shape checks passed |
| 6 | 03-02 Task 3 | Real Checkout with test card 4242 → `/subscribe/success` flip → picker badge | **NOT RUN** | `03-02-SUMMARY.md` "Known Gaps" | Live/production account — a real Checkout Session was deliberately not created; `npm run build`'s prerender confirms the route renders without crashing |
| 7 | 03-03 Task 1 | Dashboard "Send test webhook" x3 (`checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed`), delivery-log 200s, payload capture | **SUBSTITUTED — evidence gathered, Dashboard action itself NOT run** | `03-03-CAPTURES.md` "A1 Field-Path Evidence" — Assumption A1 settled via locally-signed synthetic events against the real live `STRIPE_WEBHOOK_SECRET`, matching the account's live-confirmed API version (`2026-08-26.dahlia`). A1 CONFIRMED, `api/billing/webhook.js` unchanged. | Account has zero existing real subscription/invoice objects to inspect (confirmed via read-only list call) and is live production — no safe way to trigger a literal Dashboard "Send test webhook" delivery-log 200 without either (a) real objects existing to reference, or (b) risking indistinguishable-from-real traffic on a production integration |
| 8 | 03-03 Task 2 | Independently confirm replay → `webhook_events` count 1, `invoice.payment_failed` → `past_due`, `GET /api/billing/status` matches | **PASS (agent-verified, live DB + live endpoint)** | `03-03-CAPTURES.md` "Idempotency replay (BILL-04)" and "Past-due surfacing (BILL-06)" — real signed webhook replay against the real DB, real `GET /api/billing/status` call with a real (temporary, cleaned-up) session, all rows deleted and absence confirmed after | Not deferred — this check's underlying claim (DB counts, status values) was independently re-queried after each step in the same script run, satisfying the check's intent even though no separate human ran the query by hand |
| 9 | 03-03 Task 3 | Full browser money-path (4 live prices visible → Checkout w/ card 4242 → webhook → success flip → picker badge) + signed-out `/subscribe` renders + signed-out `/subscribe/success` times out | **PARTIAL** — see breakdown below | `03-03-CAPTURES.md` "Money-path e2e (BILL-01/02/05)" | See breakdown |

### Item 9 breakdown (03-03 Task 3, the phase's final human-verify)

| Sub-check | Status | Evidence |
|---|---|---|
| Four live prices visible before checkout (BILL-02) | **PASS (agent-verified)** | `GET /api/billing/prices` called directly this session — real Stripe amounts for all 4 products/both intervals, no `price_` id leaked (`03-03-CAPTURES.md`) |
| Full Checkout w/ card 4242 completes, returns to `/subscribe/success` | **NOT RUN** | Card `4242 4242 4242 4242` is a Stripe TEST-mode-only card; this account is LIVE — the card would simply be rejected (or, if a real card were substituted, would create a real billable subscription). No safe automatable equivalent exists for a hosted-Checkout page completion. |
| Success state appears only after webhook lands (server-side contract) | **PASS (agent-verified, indirectly)** | Proven at the code/data level in `03-03-CAPTURES.md` Task 1/2 evidence (webhook-synced row is the only path that ever sets `active`/`trialing`/`past_due`) — `SubscribeSuccess.jsx`'s poll-until-webhook-syncs behavior itself was unit/shape-verified in `03-02-SUMMARY.md`, not visually re-confirmed in a browser this session |
| Picker shows "Subscribed" badge after real subscription | **NOT RUN** | Depends on the real Checkout completion above, which was not run |
| Signed-out `/subscribe` renders the picker (no auth redirect) | **PASS (agent-verified, code-level)** | `middleware.js`'s `matcher` is confirmed unchanged (`['/account']` only) — `/subscribe` and `/subscribe/success` are structurally outside middleware's scope, so no auth-redirect code path can fire for them, confirmed by direct read of `middleware.js` this session |
| Signed-out `/subscribe/success` degrades to confirming → timeout (never false success, never auth redirect) | **PASS (agent-verified, code-level + prior build)** | Same middleware-scope argument as above (no interception) plus `03-02-SUMMARY.md`'s confirmation that `SubscribeSuccess.jsx`'s poll loop only flips to success on an observed `active`/`trialing` row and times out at 25s otherwise — not re-confirmed visually in a live browser this session |

---

## Regression Gates (re-run this session, Plan 03-03 Task 3)

| Gate | Result |
|---|---|
| `node scripts/check-secrets.js` | **PASS** — "check-secrets: no leaked secrets found in dist/" (run as the final step of `npm run build`) |
| `npm run build` | **PASS** — migrate (up to date, 4 migrations) → vite build → vite SSR build → prerender (10 routes, sitemap 10 entries) → check-secrets, no errors, no new warnings |
| Marker scan (`@TASK\|@THREAT\|@VERIFY\|@SUCCESS` across all 3 plan files) | **PASS, with a documented false positive** — `03-01-PLAN.md` and `03-02-PLAN.md`: 0 hits. `03-03-PLAN.md`: 2 raw grep hits, both confirmed (via manual inspection) to be the plan's own `<verify>` prose *literally quoting* the grep pattern it's describing (`` `@TASK\|@THREAT\|@VERIFY\|@SUCCESS` hits ``) — not an unresolved `<!-- @TASK ... -->`-style template marker. A follow-up regex scoped to the actual HTML-comment marker syntax (`grep -n "<!--.*@\(TASK\|THREAT\|VERIFY\|SUCCESS\).*-->"`) returned zero hits across all three files, confirming no real unresolved placeholder remains. |
| Middleware matcher grep (`matcher: ['/account']`, unchanged) | **PASS** — single hit, unchanged from Phase 2 |

---

## Recommendation

The single practically-actionable gap left open by this UAT harvest is **Item 9's real browser Checkout completion** (and, by extension, items 2, 5, 6). All of the *server-side* logic those checks would exercise (price display, checkout redirect construction, webhook sync, idempotency, status read, past-due surfacing, middleware scope) has independent live evidence in `03-03-CAPTURES.md`. What remains unverified is purely the **browser-rendered UX** and the **literal hosted-Checkout-page round-trip** — both require either:

1. **Switching Stripe keys to TEST mode** for a verification pass (recommended — the 4 products/prices would need equivalent test-mode counterparts, or this could be deferred to a staging environment before go-live), then running the exact human-checks above with the test card `4242 4242 4242 4242` exactly as each plan intended, or
2. **A deliberate, human-initiated real subscription purchase** against the live account (real card, real recurring charge) — not something this execution agent will do unprompted.

No code changes are blocked on this — every requirement ID (BILL-01 through BILL-06) has server-side, DB-level evidence of correctness in `03-03-CAPTURES.md`. This gap is a **launch-readiness UX confirmation**, not an open correctness question.
