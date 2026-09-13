# Phase 5 Plan 2 — Verification Report (05-02)

**Plan:** `.planning/phases/05-account-management-real-status-cancellation-billing-portal/05-02-PLAN.md`
**Commits under test:** `a500a4f` (useAccount), `59e2388` (Account.jsx rebuild)
**Date:** 2026-09-10
**Verdict:** ✅ Automated gates PASS — manual matrix DEFERRED to end-of-phase verification (requires `vercel dev`, seeded DB, real Google session)

---

## 1. Automated verification

### 1.1 Build gate (plan `<verification>` step 1)

`npm run build` against the committed tree:

```
migrate: up to date (5 migrations)
vite v5.4.11 building for production...
✓ 59 modules transformed.
✓ built in 744ms
vite building SSR bundle for production...
✓ 28 modules transformed.
✓ built in 211ms
prerender: 10 routes -> dist/
prerender: sitemap.xml with 10 entries
prerender: removed dist/server (build artifact)
```

**PASS** — both new/edited source files (`src/lib/useAccount.js`, `src/routes/Account.jsx`) compile under Vite/Rollup.

### 1.2 Secret scan (plan step 2)

`node --env-file-if-exists=.env.local scripts/check-secrets.js`:

```
check-secrets: no leaked secrets found in dist/
```

**PASS**

### 1.3 Grep proofs (plan step 3)

Executed via `.roo/tmp-verify-accountjsx.cjs` (31 checks) + `.roo/tmp-verify-useaccount.cjs` (8 checks). Result: **ALL_CHECKS_PASS**.

| # | Proof (plan ref) | Result |
| --- | --- | --- |
| 1 | `data/content` absent from `Account.jsx` (mock invoices gone) | ✅ 0 |
| 2 | `from '../lib` / `from '../api` / `from 'lib/` / `from 'api/` absent from `useAccount.js` (WR-10) | ✅ 0 |
| 3 | `window.open` / `<a href="/api/billing/portal"` absent (WR-06) | ✅ 0 |
| 4 | "Subscribe" in `Account.jsx` | ✅ 2 — **PLAN-DEFECT**: contract notice body ("...Subscribe to unlock full issues...") + zero-held CTA Link; see note below; single-CTA invariant (`/>\s*Subscribe\s*<\/Link>/g` == 1) and WR-01 structural check (no Subscribe in held-panels branch) both PASS |
| 5 | "Couldn't confirm your account" ≥ 1 (whole-page fail-closed) | ✅ ≥1 |
| 6 | "Invoice history is temporarily unavailable" ≥ 1 (D-04 degradation) | ✅ ≥1 |
| 7 | `payment_method_update` ≥ 1 (D-08 portal action) | ✅ ≥1 |
| 8 | "Access until" ≥ 1 (D-14 canceled key) | ✅ ≥1 |
| 9 | `pm_`/`cus_`/`sub_`/`pi_` absent from both client files | ✅ 0 |

**Additional structural proofs (verifier):** useAccount import/call present; `accountLoading` gated; "Renews" key present (D-14 active); "Manage" CTA + `openPortal('manage')`; `openPortal` ≥ 3 (definition + 2 calls); `/api/billing/portal` ≥ 1; `window.location.assign` ≥ 2; `hosted_invoice_url` ≥ 2; `rel="noopener noreferrer"` ≥ 1; `amount_paid` ≥ 1; `toFixed(2)` ≥ 1; "No invoices yet" ≥ 1; `Intl.DateTimeFormat` en-GB 'D MMM YYYY' present; `demo-notice`/`__tag`/`__text` reused ≥ 2; "Payment failed" + verbatim ACCT-04 body; PRODUCTS/productName ≥ 1.

### 1.4 UI safety gate (plan step 4)

- ✅ **No new CSS:** ACCT-04 notice reuses `.demo-notice`/`__tag`/`__text` with inline `--bad` overrides (borderColor `var(--bad)`, `color-mix` background, tag background `var(--bad)`), following the Subscribe.jsx:161-178 precedent. `git diff` on `src/styles/eclat.css` → zero changes this wave.
- ✅ **No spinner/loading text introduced** beyond the existing extended page gate ("Checking your session…").
- ✅ **`--bad` copy confined to the three contract strings** (account fetch failure, invoice degradation) — the card fallback is a silent '—'.
- ✅ **Dates 'D MMM YYYY'** via `Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })`, matching the mock exactly (no comma, day before month).

---

## 2. Plan-defect notes

Three prescriptive counts in the plan are unsatisfiable against the phase's authoritative Copywriting Contract (05-UI-SPEC.md §Copywriting Contract). Implemented per contract; assertion adjusted with the contract-correct value:

1. **"Subscribe" == exactly 1 (plan `<verification>` 3.4).** The required verbatim zero-held notice body *contains* "Subscribe" ("You don't have an active subscription yet. Subscribe to unlock full issues, books, and more.") AND the required CTA is a "Subscribe" `Link` → 2 by contract. Implemented = 2. WR-01 intent (no Subscribe in the held-panels branch; past_due never dead-ends) verified structurally → PASS; single CTA (`/>\s*Subscribe\s*<\/Link>/g` == 1) → PASS.
2. **"Update payment method" implied ≥ 2.** Contract body says "Update your card"; the D-08 portal action is `payment_method_update` (underscore-separated). The literal occurs exactly once (button label). `payment_method_update ≥ 1` verified separately → PASS.
3. **`node --check src/routes/Account.jsx` (plan Tasks 2–4 automated).** Node 22 raises `ERR_UNKNOWN_FILE_EXTENSION` for `.jsx`. The plan's own build gate (step 1) is the definitive compile proof → used instead → PASS.

---

## 3. Manual matrix (plan step 5 — DEFERRED)

Requires `vercel dev`, a seeded Postgres DB, and a real Google-authenticated session. All deferred to the end-of-phase verification pass (05-VERIFICATION.md):

| # | Scenario | Expected | Status |
| --- | --- | --- | --- |
| M1 | Signed-in subscriber, zero subscriptions held | Generalized zero-held notice + Subscribe CTA (no panels) | ⏳ deferred |
| M2 | Active multi-product subscriber (e.g. eclat-online + book-online) | Ordered per-product panels (PRODUCTS order) with real status dot/label, planLabel, "Renews" + renews, '{Brand} •••• {last4}' | ⏳ deferred |
| M3 | `past_due` DB row | ACCT-04 `--bad` notice under that panel (verbatim copy, "Payment failed" tag, "Update payment method"), Manage CTA present, NO Subscribe dead-end (WR-01) | ⏳ deferred |
| M4 | `canceled` DB row | "Access until" + date, no CTA row | ⏳ deferred |
| M5 | Paid invoices across ≥ 2 products, > 12 rows | ONE table, most-recent-first, ≤ 12 rows, 'D MMM YYYY' dates, real numbers, '$X.XX', Receipt links open Stripe hosted invoice in new tab | ⏳ deferred |
| M6 | Zero invoices | "No invoices yet." under panels | ⏳ deferred |
| M7 | Forced invoices enrichment failure | "Invoice history is temporarily unavailable." (--bad) with panels still rendered (D-04) | ⏳ deferred |
| M8 | Forced account fetch failure | "Couldn't confirm your account — reload to try again." (--bad) in place of panels — NOT the no-subscription upsell | ⏳ deferred |
| M9 | Manage / Update payment method | Full-page redirect to Stripe portal (never popup/inline iframe); return to /account shows post-action state with no toast/banner (D-06) | ⏳ deferred |
| M10 | Non-ok portal response | Page unchanged (DB state stays on screen, D-04) | ⏳ deferred |
| M11 | Unknown status in payload | '—' with no status dot (fail-closed) | ⏳ deferred |
| M12 | Signed-out direct load of /account | Redirect to `/api/auth/google?return_to=/account`; `if (!user) return null` after gate | ⏳ deferred |

---

## 4. Scope guard

- `git diff` shows zero changes this wave to: `src/styles/eclat.css`, `src/data/content.js`, `api/billing/*`, `lib/*`, `scripts/*` — the client wave touched exactly `src/lib/useAccount.js` (new) and `src/routes/Account.jsx` (rewrite).
- No raw Stripe identifiers, no server imports, no new dependencies (`tech-stack.added: []`).
