import { useEffect } from 'react'
import { SITE } from '../data/seo-site.js'

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) el.removeAttribute(k)
    else el.setAttribute(k, v)
  }
  return el
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Keeps <head> in sync on client-side navigation. The first paint of every route
 * already carries the correct tags — prerender.js bakes them into each HTML file
 * at build time — so this only has to handle in-app route changes.
 */
export function useSeo({ title, description, og, type = 'website', robots, jsonLd, path }) {
  useEffect(() => {
    if (title) document.title = title

    const url = `${SITE.url}${path || window.location.pathname}`
    const image = og ? `${SITE.url}${og}` : undefined

    if (description) {
      upsertMeta('meta[name="description"]', { name: 'description', content: description })
    }
    upsertMeta('meta[name="robots"]', { name: 'robots', content: robots || 'index,follow' })

    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url })
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE.name })
    if (image) upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image })

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    upsertMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: description,
    })
    if (image) upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image })

    upsertLink('canonical', url)
  }, [title, description, og, type, robots, path])

  useEffect(() => {
    if (!jsonLd) return
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.dataset.route = '1'
    el.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(el)
    return () => el.remove()
  }, [jsonLd])
}
