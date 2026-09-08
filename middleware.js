/**
 * Routing middleware (Edge, default runtime) — cheap cookie-presence
 * pre-filter for /account (D-09). If the `session` cookie is entirely
 * absent, redirect straight into the sign-in flow before the static
 * (stale-looking) page can flash. This is a UX optimization only, never
 * the authoritative access check — it never queries the database, and a
 * forged/expired `session=` cookie value simply falls through to the
 * client-side GET /api/auth/session check, which is authoritative
 * (RESEARCH.md Pitfall 6).
 */
import { next } from '@vercel/functions'

export const config = { matcher: ['/account'] }

function hasSessionCookie(cookieHeader) {
  if (!cookieHeader) return false
  // Boundary-aware match: `session=` at the very start of the header, or
  // immediately following a `; ` separator — avoids false-positives on
  // cookie names that merely end with "session" (e.g. `other_session=`).
  return /(^|; )session=/.test(cookieHeader)
}

export default function middleware(request) {
  const cookieHeader = request.headers.get('cookie')

  if (!hasSessionCookie(cookieHeader)) {
    return Response.redirect(new URL('/api/auth/google?return_to=/account', request.url), 302)
  }

  return next()
}
