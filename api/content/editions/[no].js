/**
 * GET /api/content/editions/:no — per-request entitlement re-derivation for
 * a single edition's gated paragraphs (ASVS V4). Vercel Node.js Function
 * using the Web Handler signature, mirrors api/billing/status.js's
 * fail-closed cookie->hash->DB-lookup shape via the shared getSessionUser
 * helper (Task 1).
 *
 * File is placed at api/content/editions/[no].js (Vercel's bracket dynamic
 * segment convention) rather than a flat api/content/editions.js so that
 * Vercel actually routes /api/content/editions/2, /api/content/editions/99,
 * etc. to this function at all — a plain, non-bracketed filename only
 * matches the exact path /api/content/editions with no further segments.
 * The edition number is read directly from the request URL's final path
 * segment (RESEARCH.md Pattern 2) rather than trusted from any framework-
 * injected params object, since this codebase's existing routes never rely
 * on one and this keeps the parsing behavior explicit and verifiable.
 *
 * Contract (D-15, locked): 401 {entitled:false, has_session:false} for a
 * missing/invalid session; 200 {entitled:false, has_session:true} for a
 * confirmed signed-in non-subscriber; 200 {entitled:true, content:{paragraphs}}
 * for an entitled user; 404 {error:Not found} for an unknown/malformed
 * edition number. There is no forbidden-status path anywhere in this
 * contract.
 *
 * Entitlement is re-derived from a fresh `subscriptions` read on every
 * request (never from the session cookie itself, never memoized/cached at
 * module scope — Phase 2 D-02, ASVS V4): the query binds ONLY
 * `status = 'active'` (D-06 — past_due/canceled/unpaid/incomplete are all
 * not-entitled) and ONLY the `eclat-online` product id (D-03/GATE-03 —
 * eclat-hardcopy/book-online/book-hardcopy rows grant zero digital access,
 * D-04). The `:no` path segment only selects which edition's paragraphs to
 * return, and only AFTER the entitlement check has already passed — an
 * unknown edition number for an entitled user still 404s, and a known
 * edition number for a non-entitled user never reaches gatedParagraphsFor
 * at all (IDOR mitigation).
 *
 * Every response branch — including the 500 DB-error branch — carries
 * Cache-Control: no-store (D-16/GATE-04); vercel.json adds a matching
 * headers rule as defense-in-depth (Task 4).
 */
import { sql } from '../../../lib/db.js'
import { gatedParagraphsFor } from '../../../lib/gated-content.js'
import { getProduct } from '../../../lib/products.js'
import { getSessionUser } from '../../../lib/session-user.js'

// ============================================================================
// TEMPORARY PROMOTIONAL BYPASS — READ BEFORE EDITING THIS FILE
// ============================================================================
// This is a temporary, time-boxed promotional bypass requested by the site
// owner for a marketing push — it is not a defect and not a weakening of the
// endpoint's real contract. While TEMP_FREE_PREVIEW is true, every VALID
// edition number's full gated content is returned to ANY caller: the session
// check and the live subscription lookup below are both skipped entirely for
// as long as this flag stays true.
//
// EXACT REVERT: set TEMP_FREE_PREVIEW back to false, or delete the
// TEMP_FREE_PREVIEW conditional block in the handler below. The moment
// that happens, the original entitlement logic beneath it — the session
// check, the live subscription lookup, both not-entitled response branches,
// and the 404 response for an unknown edition — resumes exactly as
// documented in the header contract above, with zero other edits required
// anywhere in this file.
// ============================================================================
const TEMP_FREE_PREVIEW = false

function notFound() {
  return Response.json(
    { error: 'Not found' },
    { status: 404, headers: { 'Cache-Control': 'no-store' } },
  )
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const editionNo = Number(url.pathname.split('/').pop())
    if (!Number.isInteger(editionNo) || editionNo < 1) {
      return notFound()
    }

    if (TEMP_FREE_PREVIEW) {
      const paragraphs = gatedParagraphsFor(editionNo)
      if (paragraphs === null) {
        return notFound()
      }
      return Response.json(
        { entitled: true, content: { paragraphs } },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    try {
      // Identity only (Phase 2 D-02) — a valid session proves who the caller
      // is, never what they're entitled to.
      const session = await getSessionUser(request)
      if (!session) {
        return Response.json(
          { entitled: false, has_session: false },
          { status: 401, headers: { 'Cache-Control': 'no-store' } },
        )
      }

      // Entitlement re-derivation — runs on EVERY request, never hoisted or
      // memoized. status = 'active' ONLY (D-06); eclat-online productId
      // ONLY (D-03/GATE-03); no date comparison (D-05 — any active Online
      // subscription unlocks the entire back-archive).
      const { rows } = await sql`
        SELECT 1 FROM subscriptions
        WHERE user_id = ${session.user.id}
          AND stripe_product_id = ${getProduct('eclat-online').productId}
          AND status = 'active'
        LIMIT 1
      `

      if (rows.length === 0) {
        return Response.json(
          { entitled: false, has_session: true },
          { status: 200, headers: { 'Cache-Control': 'no-store' } },
        )
      }

      const paragraphs = gatedParagraphsFor(editionNo)
      if (paragraphs === null) {
        return notFound()
      }

      return Response.json(
        { entitled: true, content: { paragraphs } },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      )
    } catch {
      // Fail closed on a DB error (WR-02 precedent) — never let the
      // exception escape unhandled, and never serve gated content on an
      // uncertain outcome. Still no-store (D-16 — every branch, including
      // errors).
      return Response.json(
        { error: 'Internal error' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      )
    }
  },
}
