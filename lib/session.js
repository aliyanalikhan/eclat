/**
 * Server-only session primitives. SERVER-ONLY — this file must never be
 * imported from anything under src/ or shipped to the client bundle.
 *
 * Implements the opaque-hashed-token session scheme (Phase 2 CONTEXT.md
 * D-12): the session cookie carries a random, high-entropy raw token;
 * only its SHA-256 hash is ever written to sessions.token_hash. A database
 * read/leak alone can never be replayed as a live session, since the raw
 * token never reaches the database.
 *
 * Reversibility: costly (D-12) — switching later to a different session
 * scheme (e.g. JWT sessions) would require invalidating every existing
 * session and changing both the cookie-issuing and cookie-verifying code
 * paths in every route that reads it.
 */
import { createHash, randomBytes } from 'node:crypto'
import { parseCookie, stringifySetCookie } from 'cookie'

/**
 * Generates a new opaque session token.
 * @returns {{ raw: string, hash: string }} raw → set as the cookie value;
 *   hash → the only value ever written to sessions.token_hash.
 */
export function newSessionToken() {
  const raw = randomBytes(32).toString('base64url') // 256 bits of entropy
  const hash = hashToken(raw)
  return { raw, hash }
}

/**
 * Hashes a raw session token for comparison against sessions.token_hash.
 * @param {string} raw
 * @returns {string} SHA-256 hex digest
 */
export function hashToken(raw) {
  return createHash('sha256').update(raw).digest('hex')
}

/**
 * Validates a `return_to` value as a safe same-origin relative path before
 * it is trusted for a post-auth redirect (open-redirect guard). Rejects
 * protocol-relative paths (`//host`), absolute URLs, any /api/* path, and
 * any path containing a backslash. The backslash check matters because the
 * WHATWG URL algorithm — implemented identically by every modern browser —
 * treats a backslash the same as a forward slash when resolving a relative
 * reference against a special-scheme (http/https) base, so `/\evil.com`
 * would otherwise pass this guard yet resolve to the absolute, off-origin
 * URL `http://evil.com/` once placed in a Location header (verified
 * open-redirect, see Phase 2 code review CR-01).
 * @param {unknown} path
 * @returns {boolean}
 */
export function isSafeReturnTo(path) {
  return (
    typeof path === 'string' &&
    /^\/(?!\/)/.test(path) &&
    !path.startsWith('/api/') &&
    !path.includes('\\')
  )
}

/**
 * Shared base Set-Cookie attribute options (D-13): httpOnly (unreadable to
 * client-side JS, XSS-safe), secure (HTTPS only), sameSite=lax (survives the
 * top-level redirect back from Google's OAuth flow). Callers add their own
 * `maxAge` per cookie.
 * @returns {{ httpOnly: true, secure: true, sameSite: 'lax', path: '/' }}
 */
export function cookieOptions() {
  return { httpOnly: true, secure: true, sameSite: 'lax', path: '/' }
}

/**
 * Builds a Set-Cookie header value for the given name/value/attributes.
 *
 * Deviation note: RESEARCH.md's code examples were written against the
 * `cookie` package's older `serialize(name, value, options)` / `parse(str)`
 * API. The version pinned and installed for this phase (cookie@2.0.1,
 * confirmed via npm view during research) ships a different API surface —
 * `stringifySetCookie({ name, value, ...attrs }, opts)` and
 * `parseCookie(str)` — so these two wrappers adapt the documented call
 * shape (name, value, options) onto the package's actual current exports
 * (Rule 1 auto-fix: the code as researched would throw
 * `SyntaxError: The requested module 'cookie' does not provide an export
 * named 'serialize'` against the real installed package).
 * @param {string} name
 * @param {string} value
 * @param {object} [options]
 * @returns {string}
 */
export function serializeCookie(name, value, options = {}) {
  return stringifySetCookie({ name, value, ...options })
}

/**
 * Parses an incoming `Cookie` request header into a plain name->value map.
 * @param {string} header
 * @returns {Record<string, string>}
 */
export function parseCookies(header) {
  return parseCookie(header || '')
}
