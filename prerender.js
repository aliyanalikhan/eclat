/**
 * Build step 3 — prerender every route to static HTML.
 *
 * `vite build` gives us a client bundle and a template; `vite build --ssr` gives us
 * a render() function. This script pairs them: for each known route it renders the
 * app to a string, bakes the route's <head> in, and writes dist/<route>/index.html.
 *
 * The result is a static site where every URL serves complete, indexable markup on
 * first byte, then hydrates into the SPA.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dist = resolve(here, 'dist')

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function headFor({ path, meta }, site) {
  const url = `${site.url}${path === '/404' ? '/404' : path}`
  const image = meta.og ? `${site.url}${meta.og}` : null
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    meta.description && `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="robots" content="${esc(meta.robots || 'index,follow')}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:site_name" content="${esc(site.name)}" />`,
    `<meta property="og:type" content="${esc(meta.type || 'website')}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    meta.description && `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    image && `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:locale" content="en_GB" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    meta.description && `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    image && `<meta name="twitter:image" content="${esc(image)}" />`,
    meta.jsonLd &&
      `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].filter(Boolean)

  return tags.join('\n    ')
}

function sitemap(routes, site) {
  const indexable = routes.filter(
    ({ path, meta }) => !String(meta.robots || '').includes('noindex') && path !== '/404',
  )
  const body = indexable
    .map(({ path }) => {
      const priority = path === '/' ? '1.0' : path.startsWith('/editions/') ? '0.7' : '0.8'
      return `  <url>\n    <loc>${site.url}${path}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

const main = async () => {
  const template = await readFile(join(dist, 'index.html'), 'utf8')

  const { render } = await import(pathToFileURL(join(dist, 'server', 'entry-server.js')).href)
  const { allRoutes } = await import(pathToFileURL(join(here, 'src/data/seo.js')).href)
  const { SITE } = await import(pathToFileURL(join(here, 'src/data/seo-site.js')).href)

  const routes = allRoutes()
  let written = 0

  for (const route of routes) {
    const appHtml = render(route.path === '/404' ? '/__not_found__' : route.path)

    const html = template
      .replace('<!--app-head-->', headFor(route, SITE))
      .replace('<div id="root"><!--app-html--></div>', `<div id="root" data-prerendered="true">${appHtml}</div>`)

    // '/' -> dist/index.html, '/404' -> dist/404.html, '/x' -> dist/x/index.html
    const out =
      route.path === '/'
        ? join(dist, 'index.html')
        : route.path === '/404'
          ? join(dist, '404.html')
          : join(dist, route.path, 'index.html')

    await mkdir(dirname(out), { recursive: true })
    await writeFile(out, html, 'utf8')
    written++
  }

  await writeFile(join(dist, 'sitemap.xml'), sitemap(routes, SITE), 'utf8')

  // The SSR bundle is a build input, not something to deploy. Removing it leaves
  // dist/ as exactly the set of files that should go to the host.
  await rm(join(dist, 'server'), { recursive: true, force: true })

  console.log(`prerender: ${written} routes -> dist/`)
  console.log(`prerender: sitemap.xml with ${routes.length} entries`)
  console.log('prerender: removed dist/server (build artifact)')
}

main().catch((err) => {
  console.error('prerender failed:', err)
  process.exit(1)
})
