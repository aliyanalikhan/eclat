import { useEffect, useState } from 'react'

/**
 * Canonical Breakpoint Tiers for Éclat
 *
 * Phone     : <= 767px
 * Tablet    : 768px - 1023px
 * Desktop   : 1024px - 1439px
 * Ultrawide : >= 1440px
 */
export const BREAKPOINTS = {
  PHONE_MAX: 767,
  TABLET_MIN: 768,
  TABLET_MAX: 1023,
  DESKTOP_MIN: 1024,
  DESKTOP_MAX: 1439,
  ULTRAWIDE_MIN: 1440,
}

export const QUERIES = {
  phone: `(max-width: ${BREAKPOINTS.PHONE_MAX}px)`,
  tablet: `(min-width: ${BREAKPOINTS.TABLET_MIN}px) and (max-width: ${BREAKPOINTS.TABLET_MAX}px)`,
  desktop: `(min-width: ${BREAKPOINTS.DESKTOP_MIN}px) and (max-width: ${BREAKPOINTS.DESKTOP_MAX}px)`,
  ultrawide: `(min-width: ${BREAKPOINTS.ULTRAWIDE_MIN}px)`,
  nav: '(max-width: 900px)',
  touch: '(pointer: coarse)',
}

function safeMatch(query) {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(query).matches
}

export function isPhone() {
  return safeMatch(QUERIES.phone)
}

export function isTablet() {
  return safeMatch(QUERIES.tablet)
}

export function isDesktop() {
  return safeMatch(QUERIES.desktop)
}

export function isUltrawide() {
  return safeMatch(QUERIES.ultrawide)
}

export function isTouch() {
  return safeMatch(QUERIES.touch)
}

export function getBreakpointTier() {
  if (typeof window === 'undefined') return 'desktop'
  if (isPhone()) return 'phone'
  if (isTablet()) return 'tablet'
  if (isUltrawide()) return 'ultrawide'
  return 'desktop'
}

/**
 * Reactive React hook tracking the current breakpoint tier and device capabilities.
 */
export function useBreakpoint() {
  const [state, setState] = useState(() => ({
    isPhone: isPhone(),
    isTablet: isTablet(),
    isDesktop: isDesktop(),
    isUltrawide: isUltrawide(),
    isTouch: isTouch(),
    tier: getBreakpointTier(),
  }))

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mqlPhone = window.matchMedia(QUERIES.phone)
    const mqlTablet = window.matchMedia(QUERIES.tablet)
    const mqlDesktop = window.matchMedia(QUERIES.desktop)
    const mqlUltrawide = window.matchMedia(QUERIES.ultrawide)
    const mqlTouch = window.matchMedia(QUERIES.touch)

    const update = () => {
      setState({
        isPhone: mqlPhone.matches,
        isTablet: mqlTablet.matches,
        isDesktop: mqlDesktop.matches,
        isUltrawide: mqlUltrawide.matches,
        isTouch: mqlTouch.matches,
        tier: mqlPhone.matches
          ? 'phone'
          : mqlTablet.matches
            ? 'tablet'
            : mqlUltrawide.matches
              ? 'ultrawide'
              : 'desktop',
      })
    }

    mqlPhone.addEventListener('change', update)
    mqlTablet.addEventListener('change', update)
    mqlDesktop.addEventListener('change', update)
    mqlUltrawide.addEventListener('change', update)
    mqlTouch.addEventListener('change', update)

    return () => {
      mqlPhone.removeEventListener('change', update)
      mqlTablet.removeEventListener('change', update)
      mqlDesktop.removeEventListener('change', update)
      mqlUltrawide.removeEventListener('change', update)
      mqlTouch.removeEventListener('change', update)
    }
  }, [])

  return state
}
