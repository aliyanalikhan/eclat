/**
 * GET /api/auth/google/callback — Google redirects here with ?code&state
 * after the user approves (or denies) consent. Vercel Node.js Function
 * using the Web Handler signature.
 *
 * Flow (Phase 2 CONTEXT.md D-01 through D-04, D-10 through D-13, D-16):
 *  1. Validate the `state` query param against the `oauth_state` cookie
 *     (double-submit CSRF guard) — mismatch aborts before token exchange.
 *  2. Exchange the authorization `code` for tokens at Google's token
 *     endpoint (server-to-server; never touches the browser).
 *  3. Independently verify the returned `id_token`'s signature (via
 *     Google's live JWKS), audience, issuer, and expiry with jose's
 *     jwtVerify — a token failing any check never reaches the database
 *     (D-03/AUTH-02). Any verification failure redirects back with
 *     ?auth_error=1, identically to the state-mismatch path (D-15).
 *  4. Upsert the users row by google_sub (D-04) — a user is never looked
 *     up or merged by email — refreshing name/email/picture on every
 *     sign-in (D-16), not only at first creation.
 *  5. Generate a new opaque session token (lib/session.js), store only its
 *     hash (D-12), and insert a sessions row with a 30-day expiry (D-10).
 *  6. Set the httpOnly/Secure/SameSite=Lax session cookie (D-13) and clear
 *     the two oauth_* cookies, then redirect back to the validated
 *     oauth_return_to value (D-08).
 */
import { timingSafeEqual } from 'node:crypto'
import { waitUntil } from '@vercel/functions'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { sql } from '../../../lib/db.js'
import {
  cookieOptions,
  isSafeReturnTo,
  newSessionToken,
  parseCookies,
  serializeCookie,
} from '../../../lib/session.js'
import { detectCountry, normalizeEmail, signup } from '../../../lib/signup.js'

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

// Constant-time comparison for the CSRF state double-submit check (WR-05).
// timingSafeEqual throws on mismatched-length buffers, so the length check
// must come first.
function safeEqual(a, b) {
  const bufA = Buffer.from(a ?? '')
  const bufB = Buffer.from(b ?? '')
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

function clearOauthCookies(headers) {
  headers.append('Set-Cookie', serializeCookie('oauth_state', '', { ...cookieOptions(), maxAge: 0 }))
  headers.append('Set-Cookie', serializeCookie('oauth_return_to', '', { ...cookieOptions(), maxAge: 0 }))
}

function redirectWithError(returnTo, headers) {
  clearOauthCookies(headers)
  const location = new URL(returnTo, 'http://placeholder.local')
  location.searchParams.set('auth_error', '1')
  headers.set('Location', location.pathname + location.search)
  return new Response(null, { status: 302, headers })
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const stateParam = url.searchParams.get('state')

    const cookies = parseCookies(request.headers.get('cookie'))
    const oauthState = cookies.oauth_state
    const rawReturnTo = cookies.oauth_return_to
    const returnTo = isSafeReturnTo(rawReturnTo) ? rawReturnTo : '/'

    const headers = new Headers()

    // Double-submit CSRF guard: the state param must exactly match the
    // cookie set by this app's own outbound leg — never trust the
    // callback's own query string alone (Pattern 1).
    if (!stateParam || !oauthState || !safeEqual(stateParam, oauthState) || !code) {
      return redirectWithError(returnTo, headers)
    }

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host
    const redirectUri = host.includes('eclat.lifestyle')
      ? 'https://www.eclat.lifestyle/api/auth/google/callback'
      : (process.env.GOOGLE_REDIRECT_URI || 'https://www.eclat.lifestyle/api/auth/google/callback')

    let idToken
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })
      if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`)
      const tokenBody = await tokenRes.json()
      idToken = tokenBody.id_token
      if (!idToken) throw new Error('no id_token in token response')
    } catch {
      return redirectWithError(returnTo, headers)
    }

    let payload
    try {
      const verified = await jwtVerify(idToken, GOOGLE_JWKS, {
        issuer: ['accounts.google.com', 'https://accounts.google.com'],
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      payload = verified.payload
    } catch {
      // Signature, audience, issuer, or expiry check failed — never
      // construct a session from an unverified claim (D-03/AUTH-02).
      return redirectWithError(returnTo, headers)
    }

    const { sub, email, name, picture } = payload

    let userId, raw, hash
    try {
      const { rows: userRows } = await sql`
        INSERT INTO users (google_sub, email, name, picture, last_login_at)
        VALUES (${sub}, ${email}, ${name}, ${picture}, now())
        ON CONFLICT (google_sub) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          picture = EXCLUDED.picture,
          last_login_at = now()
        RETURNING id
      `
      userId = userRows[0].id
      ;({ raw, hash } = newSessionToken())
      await sql`
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES (${userId}, ${hash}, now() + interval '30 days')
      `
    } catch {
      // A DB failure here (transient outage, constraint violation, pool
      // exhaustion) should surface as the same graceful ?auth_error=1 UX
      // as every other failure path in this file, not an unhandled
      // rejection (WR-01).
      return redirectWithError(returnTo, headers)
    }

    // Email list: runs after the response, so it can never delay or fail sign-in.
    const listEmail = payload.email_verified === true && normalizeEmail(email)
    if (listEmail) {
      waitUntil(
        signup(
          { email: listEmail, country: detectCountry(request.headers), method: 'Google sign-in' },
          { sql },
        ).catch((err) => console.error(`signup: sign-in add failed: ${err.message}`)),
      )
    }

    headers.append(
      'Set-Cookie',
      serializeCookie('session', raw, { ...cookieOptions(), maxAge: 60 * 60 * 24 * 30 }),
    )
    clearOauthCookies(headers)
    // Belt-and-suspenders (CR-01): never trust the raw returnTo string
    // directly for a Location header — reconstruct via URL so any value
    // that isSafeReturnTo() failed to catch still can't smuggle a host
    // (e.g. WHATWG backslash-as-slash resolution) into the redirect.
    const safeLocation = new URL(returnTo, 'http://placeholder.local')
    headers.set('Location', safeLocation.pathname + safeLocation.search)
    return new Response(null, { status: 302, headers })
  },
}
