/**
 * SERVER-ONLY — gated edition text. Must never be imported from anything
 * under src/ or shipped to the client bundle (D-11).
 *
 * The gated full-issue paragraphs formerly lived in src/data/content.js
 * (editions[].excerpt/.excerptBy), which meant they shipped to every
 * visitor's browser inside the client bundle and prerendered HTML
 * regardless of subscription state (D-02 — the concrete bundling leak
 * this module closes). They are transcribed verbatim here and now exist
 * only behind the authenticated api/content/editions.js endpoint.
 */

const GATED = Object.freeze({
  2: Object.freeze([
    'This issue opens with Paul Onuwanibe on leadership, legacy, and rebuilding Africa’s business landscape — a conversation about vision as the work of decades, not quarters.',
    'Also inside: Chef Efi’s culinary revolution, a retrospective on the World Cup, women’s health in focus, and a look at fairways, finance, and fatherhood.',
    'The full conversation with Paul Onuwanibe, and every feature in this issue, continues for subscribers.',
  ]),
  1: Object.freeze([
    'ÉCLAT is born from a simple belief: that style is not only what you wear, but how you move through the world. It lives in the confidence of a well-chosen outfit, the calm of a beautifully designed space, the glow of healthy skin, and the curiosity that leads you to new places.',
    'Inside these pages, we bring together the worlds that shape modern living — fashion, beauty, lifestyle, and travel — curated with intention and a distinctly global perspective. We chose to celebrate Minnesota, our beautiful home state and the place where the stories of LaDidiér and ÉCLAT began.',
    'This magazine is not about excess — it is about essence. The quiet luxury of authenticity. The boldness of individuality. The elegance of simplicity done well. At LaDidiér, we envisioned ÉCLAT as more than a magazine: a mood, a lens, and a reminder that beauty exists everywhere, if you choose to see it.',
  ]),
})

const EXCERPT_BY = Object.freeze({
  1: 'Ebuka Osuorah, Founder',
})

/**
 * @param {number} editionNo
 * @returns {string[] | null} the gated paragraph array for a known edition,
 *   else null for any unknown value.
 */
export function gatedParagraphsFor(editionNo) {
  return GATED[editionNo] ?? null
}

/**
 * @param {number} editionNo
 * @returns {string | null} the gated byline for a known edition, else null.
 */
export function editionExcerptBy(editionNo) {
  return EXCERPT_BY[editionNo] ?? null
}
