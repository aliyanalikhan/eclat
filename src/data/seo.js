import { SITE, editions } from './content.js'

const DEFAULT_OG = '/assets/images/og/eclat-default.webp'

/** Per-route <head> metadata. Consumed at runtime by useSeo() and at build time by prerender.js. */
export const staticSeo = {
  '/': {
    title: 'Éclat — A quarterly magazine of paying attention',
    description:
      'Two issues of Éclat by LaDidiér, two children’s books and every essay — one subscription, every edition, from No. 1 to whatever comes next.',
    og: DEFAULT_OG,
  },
  '/archive': {
    title: 'The Archive — Éclat',
    description:
      'Two issues of Éclat so far, and everything that comes next. Covers are free to browse; full issues open with a subscription.',
    og: DEFAULT_OG,
  },
  '/books': {
    title: 'Children’s Books — Éclat',
    description:
      'Two picture books by Ebuka Osuorah, read aloud in the subscriber library. The first spread of each is free.',
    og: DEFAULT_OG,
  },
  '/writings': {
    title: 'Writings — Éclat',
    description: 'Essays, reportage and two collections from the Éclat archive, oldest to newest.',
    og: DEFAULT_OG,
  },
  '/subscribe': {
    title: 'Subscribe — Éclat',
    description:
      'Full archive, all children’s books, every essay, and each new edition as it publishes. $9/month or $84/year.',
    og: DEFAULT_OG,
    robots: 'noindex,follow',
  },
  '/account': {
    title: 'Your Account — Éclat',
    description: 'Manage your Éclat subscription, plan and billing history.',
    og: DEFAULT_OG,
    robots: 'noindex,nofollow',
  },
  '/404': {
    title: 'Page not found — Éclat',
    description: 'That page has moved or never existed.',
    og: DEFAULT_OG,
    robots: 'noindex,follow',
  },
}

export const editionSeo = (ed) => ({
  title: `${ed.title} — Éclat No. ${ed.no}`,
  description: ed.blurb,
  // Uses the shared card while cover artwork is outstanding, so shared links
  // always resolve to an image that exists. Once the files listed in
  // public/assets/images/MANIFEST.md are in place, swap this to `ed.img` to get
  // a per-edition social card.
  og: DEFAULT_OG,
  type: 'article',
})

/** Every prerenderable path, with its resolved metadata. */
export function allRoutes() {
  const out = Object.entries(staticSeo).map(([path, meta]) => ({
    path,
    meta: path === '/' ? { ...meta, jsonLd: siteJsonLd() } : meta,
  }))
  for (const ed of editions) {
    out.push({ path: `/editions/${ed.no}`, meta: { ...editionSeo(ed), jsonLd: editionJsonLd(ed) } })
  }
  return out
}

/** JSON-LD for the site as a whole; injected on the home page. */
export function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Periodical',
    name: SITE.name,
    description: SITE.tagline,
    url: SITE.url,
    inLanguage: SITE.locale,
    issn: undefined,
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    hasPart: editions.slice(0, 6).map((e) => ({
      '@type': 'PublicationIssue',
      issueNumber: e.no,
      name: e.title,
      datePublished: e.date,
      url: `${SITE.url}/editions/${e.no}`,
    })),
  }
}

export function editionJsonLd(ed) {
  return {
    '@context': 'https://schema.org',
    '@type': 'PublicationIssue',
    issueNumber: ed.no,
    name: ed.title,
    headline: ed.title,
    description: ed.blurb,
    datePublished: ed.date,
    numberOfPages: ed.pages,
    url: `${SITE.url}/editions/${ed.no}`,
    isPartOf: { '@type': 'Periodical', name: SITE.name, url: SITE.url },
  }
}
