import { useEffect, useState } from 'react'

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

/**
 * Reveals every [data-rev] element as it scrolls into view, staggered by the
 * numeric value of the attribute. Re-runs on `key` so route changes re-observe.
 */
export function useReveal(key) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-rev]'))
    if (!nodes.length) return

    if (prefersReducedMotion()) {
      nodes.forEach((el) => el.classList.add('is-in'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target
          const delay = Math.min(6, parseInt(el.dataset.rev || '0', 10)) * 0.08
          el.style.transition = `opacity .85s cubic-bezier(.2,.7,.2,1) ${delay}s, transform .95s cubic-bezier(.2,.7,.2,1) ${delay}s`
          el.classList.add('is-in')
          io.unobserve(el)
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' },
    )

    nodes.forEach((el) => {
      if (!el.classList.contains('is-in')) io.observe(el)
    })

    return () => io.disconnect()
  }, [key])
}

/** Adds a shadow to the fixed header once the page has scrolled. */
export function useScrolled(threshold = 30) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

/**
 * The prototype's rAF loop: fans the hero covers out on scroll, drifts
 * [data-par] layers, and scales [data-cta]. Skipped entirely under
 * reduced-motion, where a single settled pass is applied instead.
 */
export function useScrollFx(key) {
  useEffect(() => {
    const reduced = prefersReducedMotion()
    // --bp-mobile: 720px — matches eclat.css's breakpoint-tier doc block above :root (eclat.css:7); keep this literal in sync with that block.
    const mobile = window.innerWidth < 720 // bp:mobile
    let raf = 0

    // Resting spread of the fan. It opens from here to 1.0 as the hero scrolls.
    const P_REST = 1 - Math.pow(1 - 0.12, 3)
    // Fraction of the opening to hold the side titles back for, so they never
    // appear while a neighbouring card would cut them mid-word.
    const FADE_IN = 0.25

    // Card boxes come from CSS and only change on resize, so measure them once
    // instead of reading layout for all five every frame.
    let cards = []
    let titles = []
    const measure = () => {
      cards = Array.from(document.querySelectorAll('[data-fan]')).map((el) => {
        const mt = parseFloat(getComputedStyle(el).marginTop) || 0
        return {
          el,
          w: el.offsetWidth,
          h: el.offsetHeight,
          // The negative margins seat each card on the origin, but not centred:
          // a 306px card at -142px sits 11px low. Transforms rotate and scale
          // about that centre, so track its unscaled offset separately.
          cy: mt + el.offsetHeight / 2,
          fx: parseFloat(el.dataset.fx) || 0,
          fy: parseFloat(el.dataset.fy) || 0,
          fr: parseFloat(el.dataset.fr) || 0,
        }
      })
      titles = Array.from(document.querySelectorAll('[data-fan-title]'))
    }
    measure()

    const tick = (finalOnly) => {
      const vh = window.innerHeight

      if (cards.length && !mobile) {
        const raw = Math.min(1, Math.max(0, window.scrollY / (vh * 0.62)))
        const p = finalOnly ? 1 : 1 - Math.pow(1 - Math.min(1, raw + 0.12), 3)
        const fit = Math.min(1, (window.innerWidth - 48) / 1120)
        const hero = document.querySelector('[data-hero]')
        const origin = document.querySelector('[data-fan-origin]')
        const copy = document.querySelector('[data-copy-block]')

        // Per-card scale, relative to the fan scale `s` solved for below.
        const cs = 0.9 + 0.1 * p

        // Each card's rotated half-height plus its vertical offset gives the
        // fan's true extent above and below the origin, in units of `s`. The
        // unscaled centre offset (cy) is accumulated separately.
        let up = 0
        let down = 0
        let cyUp = 0
        let cyDown = 0
        for (const c of cards) {
          const a = (c.fr * p * Math.PI) / 180
          const half = ((c.h * Math.abs(Math.cos(a)) + c.w * Math.abs(Math.sin(a))) / 2) * cs
          up = Math.max(up, half - c.fy * p)
          down = Math.max(down, half + c.fy * p)
          cyUp = Math.max(cyUp, -c.cy)
          cyDown = Math.max(cyDown, c.cy)
        }

        let s = 0.72 + 0.28 * fit

        if (hero && origin) {
          const H = hero.clientHeight
          const hTop = hero.getBoundingClientRect().top
          const copyBottom = copy ? copy.getBoundingClientRect().bottom - hTop : H * 0.42
          const bandTop = copyBottom + 24
          // The hero is `height:100vh; min-height:780px`, so on a viewport
          // shorter than 780 it runs past the fold. Seat the fan against the
          // fold rather than the hero's foot, or the stack opens off-screen.
          // (When the viewport is tall these are the same number.)
          const bandBottom = Math.min(H, vh) - 52
          // cy is unscaled, so withhold it before solving for s.
          const band = Math.max(200, bandBottom - bandTop - cyUp - cyDown)

          // Solve for the scale that makes the fan fill the band exactly, then
          // seat it so its lowest card lands on bandBottom. Closed form — no
          // frame-to-frame feedback, so it is correct on the very first paint.
          s = Math.min(s, band / (up + down))
          origin.style.top = `${(bandBottom - s * down - cyDown).toFixed(1)}px`
        }

        const bound = window.innerWidth / 2 - 152
        for (const c of cards) {
          const x = Math.max(-bound, Math.min(bound, c.fx * p * fit))
          const y = c.fy * p * s
          const r = c.fr * p
          c.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${(cs * s).toFixed(3)})`
        }

        // Side titles stay veiled while a neighbour would clip them, then fade
        // in across the rest of the opening.
        const opened = Math.max(0, Math.min(1, (p - P_REST) / (1 - P_REST)))
        const veil = Math.max(0, Math.min(1, (opened - FADE_IN) / (1 - FADE_IN)))
        for (const el of titles) el.style.opacity = veil.toFixed(3)

        document.querySelectorAll('[data-hero-copy]').forEach((el) => {
          el.style.opacity = String(Math.max(0, 1 - raw * 1.4))
          el.style.transform = `translateY(${(-raw * 40).toFixed(1)}px)`
        })
      }

      if (finalOnly) return

      const k = mobile ? 0.4 : 1
      document.querySelectorAll('[data-par]').forEach((el) => {
        const amount = parseFloat(el.dataset.par) * k
        const r = el.getBoundingClientRect()
        if (r.bottom < -200 || r.top > vh + 200) return
        const off = (r.top + r.height / 2 - vh / 2) / vh
        el.style.transform = `translate3d(0,${(-off * amount * 10).toFixed(2)}px,0) scale(1.06)`
      })

      document.querySelectorAll('[data-cta]').forEach((el) => {
        const r = el.getBoundingClientRect()
        const v = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.8)))
        el.style.transform = `scale(${(0.94 + 0.06 * v).toFixed(3)})`
        el.style.opacity = String(0.5 + 0.5 * v)
      })
    }

    // Re-measure when the layout can have changed under us.
    const onResize = () => {
      measure()
      if (reduced) tick(true)
    }
    window.addEventListener('resize', onResize)

    if (reduced) {
      // The fit is closed-form now, so one settled pass is enough where the old
      // feedback loop needed to be run repeatedly to converge.
      tick(true)
      document.querySelectorAll('[data-cta]').forEach((el) => {
        el.style.transform = 'none'
        el.style.opacity = '1'
      })
      return () => window.removeEventListener('resize', onResize)
    }

    const loop = () => {
      tick(false)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [key])
}

/**
 * FLIP: animates `selector` from a previously captured DOMRect to its new
 * position. Used when opening an edition from a cover, and when zooming.
 */
export function runFlip(selector, from) {
  if (!from || prefersReducedMotion()) return
  const el = document.querySelector(selector)
  if (!el) return
  const to = el.getBoundingClientRect()
  if (!to.width || !to.height) return

  el.animate(
    [
      {
        transformOrigin: 'top left',
        transform: `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width},${from.height / to.height})`,
      },
      { transformOrigin: 'top left', transform: 'none' },
    ],
    { duration: 620, easing: 'cubic-bezier(.72,0,.16,1)' },
  )
}

/** Drag-to-scroll for the edition preview strip. */
export function useDragScroll(ref) {
  useEffect(() => {
    const strip = ref.current
    if (!strip) return

    let down = false
    let startX = 0
    let startLeft = 0
    let moved = 0

    const onDown = (e) => {
      if (window.matchMedia('(pointer: coarse)').matches) return
      down = true
      moved = 0
      startX = e.clientX
      startLeft = strip.scrollLeft
      strip.classList.add('is-dragging')
    }
    const onMove = (e) => {
      if (!down) return
      const dx = e.clientX - startX
      moved = Math.max(moved, Math.abs(dx))
      strip.scrollLeft = startLeft - dx
    }
    const onUp = () => {
      down = false
      strip.classList.remove('is-dragging')
    }
    // Swallow the click that ends a drag so it doesn't open the lightbox.
    const onClick = (e) => {
      if (moved > 6) {
        e.preventDefault()
        e.stopPropagation()
        moved = 0
      }
    }

    strip.addEventListener('pointerdown', onDown)
    strip.addEventListener('pointermove', onMove)
    strip.addEventListener('pointerup', onUp)
    strip.addEventListener('pointerleave', onUp)
    strip.addEventListener('pointercancel', onUp)
    strip.addEventListener('click', onClick, true)

    return () => {
      strip.removeEventListener('pointerdown', onDown)
      strip.removeEventListener('pointermove', onMove)
      strip.removeEventListener('pointerup', onUp)
      strip.removeEventListener('pointerleave', onUp)
      strip.removeEventListener('pointercancel', onUp)
      strip.removeEventListener('click', onClick, true)
    }
  }, [ref])
}
