import { useSafeFetch } from './useSafeFetch.js'

/**
 * Edition gated-block hook (D-10..D-13, D-15, D-17). Maps
 * `GET /api/content/editions/:no`'s locked D-15 contract onto the four
 * renderable states Edition.jsx (Task 5) consumes.
 *
 * `session` is supplied by the CALLER's own `useSession()` result — this
 * hook never calls useSession itself and never reads any signed-in/out
 * indicator the API response might carry (D-13): the client always decides
 * its own session state independently of what the entitlement endpoint
 * reports.
 *
 * Mapping:
 *   1. loading                        -> { kind: 'loading' }
 *   2. network error or 5xx           -> { kind: 'unknown' }
 *   3. data.entitled === false        -> { kind: 'notEntitled' }
 *      (covers both the confirmed-signed-in-non-subscriber 200 response
 *      and the missing/invalid-session 401 response — both are
 *      confirmed-not-entitled from the client's point of view)
 *   4. data.entitled === true         -> { kind: 'entitled', paragraphs }
 *
 * Note: a 404 (unknown edition number) is impossible for a valid
 * /editions/:no route reached from this app's own route table, and would
 * map to the same `notEntitled` fallback if it ever occurred — the shell
 * never fabricates content for a missing issue.
 *
 * @param {number | string | undefined} editionNo
 * @param {{ ok: boolean }} session
 * @returns {{ kind: 'loading' | 'unknown' | 'notEntitled' | 'entitled', paragraphs?: string[] }}
 */
export function useGatedContent(editionNo, session) {
  const { loading, data, error } = useSafeFetch(
    editionNo ? '/api/content/editions/' + editionNo : null,
    { enabled: Boolean(editionNo) },
  )

  if (loading) return { kind: 'loading' }
  if (error) return { kind: 'unknown' }
  if (!data || data.entitled === false) return { kind: 'notEntitled' }
  if (data.entitled === true) return { kind: 'entitled', paragraphs: data.content.paragraphs }

  return { kind: 'unknown' }
}
