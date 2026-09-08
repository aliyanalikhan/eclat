/**
 * GET /api/auth/google — starts the server-initiated Google OAuth redirect
 * flow (D-01, D-07). Vercel Node.js Function using the Web Handler
 * signature (export default { fetch(request) {...} }).
 *
 * Reads `return_to` from the query string (validated via isSafeReturnTo to
 * close the open-redirect vector — Pattern 1), generates a CSRF `state`
 * nonce, sets both as short-lived cookies via the state-cookie double-submit
 * pattern, then 302s the browser directly to Google's real consent screen —
 * no intermediary branded page (D-07).
 */
import { randomBytes } from 'node:crypto'
import { cookieOptions, isSafeReturnTo, serializeCookie } from '../../lib/session.js'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const rawReturnTo = url.searchParams.get('return_to')
    const returnTo = isSafeReturnTo(rawReturnTo) ? rawReturnTo : '/'

    const state = randomBytes(16).toString('base64url')

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid email profile')
    authUrl.searchParams.set('state', state)

    const headers = new Headers()
    headers.append(
      'Set-Cookie',
      serializeCookie('oauth_state', state, { ...cookieOptions(), maxAge: 600 }),
    )
    headers.append(
      'Set-Cookie',
      serializeCookie('oauth_return_to', returnTo, { ...cookieOptions(), maxAge: 600 }),
    )
    headers.set('Location', authUrl.toString())
    return new Response(null, { status: 302, headers })
  },
}
