/**
 * Éclat — content source of truth.
 *
 * Every image path below points into /public/assets/images/. Files are optional:
 * each <Cover> renders the `tint` as a CSS fallback beneath the <img>, so a slot
 * with no file yet shows as a solid editorial colour block rather than a broken
 * image. See public/assets/images/MANIFEST.md for the list of files to supply.
 */

import { SITE as SITE_BASE } from './seo-site.js'

export const SITE = {
  ...SITE_BASE,
  founded: 2013,
  price: { monthly: 9, annual: 84 },
}

export const editions = [
  {
    no: 2,
    slug: 'eclat-vol-2',
    title: 'The Power of Vision',
    date: 'September 2026',
    year: '2026',
    pages: 62,
    tint: 'oklch(0.24 0.03 255)',
    isNew: true,
    plateSuppressed: true, // real cover art — wordmark and coverlines are already printed in
    ratio: '1200/1698',
    w: 1200,
    h: 1698,
    blurb:
      'Paul Onuwanibe on leadership, legacy, and rebuilding Africa’s business landscape — plus Chef Efi’s culinary revolution, a World Cup retrospective, and women’s health in focus.',
  },
  {
    no: 1,
    slug: 'eclat-vol-1',
    title: 'The New Architect of Modern Living',
    date: '2026',
    year: '2026',
    pages: 60,
    tint: 'oklch(0.32 0.02 60)',
    plateSuppressed: true, // real cover art — wordmark and coverlines are already printed in
    ratio: '3/4',
    w: 1200,
    h: 1600,
    blurb:
      'The maiden edition of ÉCLAT by LaDidiér, built around a conversation with Ebuka Osuorah on becoming the new architect of modern living — plus an editorial on essence over excess, a Minneapolis city guide, and LaDidiér Bridal’s elegance reimagined.',
  },
].map((e) => ({ ...e, img: `/assets/images/covers/no-${e.no}-${e.slug}.jpg` }))

export const books = [
  {
    slug: 'african-folklores',
    title: 'African Folklores',
    meta: 'As Told by My Grandmother · By Ebuka Osuorah',
    dek: 'When Grandmother speaks, the savanna listens — animals talk, rivers remember, and every tale leaves a lasting spark of truth.',
    tint: 'oklch(0.30 0.06 260)',
    plateSuppressed: true, // real cover art — title is already printed in
    ratio: '515/807',
    w: 515,
    h: 807,
  },
  {
    slug: 'we-come-from-kings',
    title: 'We Come From Kings',
    meta: 'A Journey Through West African History · By Ebuka Osuorah',
    dek: 'Long before today, kings and queens ruled vast lands of gold, courage, and wisdom — for the sons and daughters of the diaspora.',
    tint: 'oklch(0.55 0.12 40)',
    plateSuppressed: true,
    ratio: '3/4',
    w: 1200,
    h: 1600,
  },
].map((b) => ({ ...b, img: `/assets/images/books/${b.slug}.jpg` }))

export const writings = [
  {
    slug: 'on-rebuilding-slowly',
    title: 'On Rebuilding Slowly',
    type: 'Essay',
    year: '2026',
    dek: 'Fourteen months, one oven at a time, and what speed costs.',
    tint: 'oklch(0.48 0.10 38)',
  },
  {
    slug: 'the-bakery-on-the-square',
    title: 'The Bakery on the Square',
    type: 'Reportage',
    year: '2025',
    dek: 'A village, a roof, and eleven hundred bricks carried by hand.',
    tint: 'oklch(0.44 0.08 84)',
  },
  {
    slug: 'letters-to-the-meadow',
    title: 'Letters to the Meadow',
    type: 'Collection',
    year: '2024',
    dek: 'Thirty-eight years of a botanist’s correspondence, annotated.',
    tint: 'oklch(0.46 0.09 148)',
  },
  {
    slug: 'night-shift',
    title: 'Night Shift',
    type: 'Essay',
    year: '2023',
    dek: 'What the country looks like between two and five in the morning.',
    tint: 'oklch(0.38 0.08 300)',
  },
  {
    slug: 'a-short-history-of-the-long-table',
    title: 'A Short History of the Long Table',
    type: 'Nonfiction',
    year: '2021',
    dek: 'One recipe, six households, a hundred years of substitutions.',
    tint: 'oklch(0.42 0.09 210)',
  },
  {
    slug: 'cold-water',
    title: 'Cold Water',
    type: 'Collection',
    year: '2019',
    dek: 'Swimming pieces, collected — rivers, harbours, one reservoir.',
    tint: 'oklch(0.44 0.09 232)',
  },
].map((w) => ({ ...w, img: `/assets/images/writings/${w.slug}.jpg` }))

export const samples = [
  {
    slug: 'spread-02-03-orchard-road',
    label: 'Spread 02–03 · Orchard Road',
    alt: 'A closed orchard road at the turn of the season, hedges heavy on both sides.',
    tint: 'oklch(0.44 0.08 84)',
    w: 640,
    ratio: '16/10',
  },
  {
    slug: 'page-07-portrait',
    label: 'Page 07 · Portrait',
    alt: 'Portrait of a baker standing in the doorway of a half-rebuilt bakery.',
    tint: 'oklch(0.40 0.11 38)',
    w: 320,
    ratio: '3/4',
  },
  {
    slug: 'spread-08-09-the-ovens',
    label: 'Spread 08–09 · The Ovens',
    alt: 'Two brick ovens, newly lit, in a workshop strung with work lamps.',
    tint: 'oklch(0.38 0.07 258)',
    w: 640,
    ratio: '16/10',
  },
  {
    slug: 'page-11-still-life',
    label: 'Page 11 · Still Life',
    alt: 'Still life of flour, a folded cloth and a cooling loaf on scarred wood.',
    tint: 'oklch(0.46 0.09 148)',
    w: 320,
    ratio: '3/4',
  },
  {
    slug: 'spread-12-13-market',
    label: 'Spread 12–13 · Market',
    alt: 'A village market at first light, awnings still being cranked open.',
    tint: 'oklch(0.42 0.10 262)',
    w: 640,
    ratio: '16/10',
  },
  {
    slug: 'page-16-letters',
    label: 'Page 16 · Letters',
    alt: 'A fan of handwritten letters, one of them answered a year late.',
    tint: 'oklch(0.34 0.08 300)',
    w: 320,
    ratio: '3/4',
  },
  {
    slug: 'page-18-end-of-preview',
    label: 'Page 18 · End of Preview',
    alt: 'The last page of the free preview, a wide empty meadow at dusk.',
    tint: 'oklch(0.40 0.06 160)',
    w: 400,
    ratio: '4/5',
  },
].map((s) => ({ ...s, img: `/assets/images/samples/no-48/${s.slug}.jpg` }))

export const articles = [
  {
    slug: 'the-power-of-vision',
    editionNo: 2,
    kicker: 'The Interview · No. 2',
    title: 'The Power of Vision',
    dek: 'Over lunch in New York, Éclat sat down with Paul Onuwanibe — visionary, builder, and founder of Landmark Africa — for a conversation on leadership, legacy, and rebuilding Africa’s business landscape.',
    alt: 'Founder Ebuka Osuorah interviewing Paul Onuwanibe, CEO of Landmark Africa, over lunch in New York.',
    tint: 'oklch(0.24 0.03 255)',
  },
  {
    slug: 'cracked-open-chef-efi',
    editionNo: 2,
    kicker: 'At the Chef’s Table · No. 2',
    title: 'Cracked Open',
    dek: 'Chef Efi’s Cantonese-style ginger-scallion lobster — an Atlanta-based US Navy veteran, culinary instructor, and consultant on timing, technique, and cooking with your own palate.',
    alt: 'Chef Efi holding two whole lobsters in his restaurant kitchen.',
    tint: 'oklch(0.44 0.09 84)',
  },
  {
    slug: 'the-green-heart-of-the-city',
    editionNo: 1,
    kicker: 'Travel · No. 1',
    title: 'The Green Heart of the City',
    dek: 'Minnehaha Falls, the Chain of Lakes, and Lake Harriet at sunset — from Éclat’s Minneapolis city guide. “In Minneapolis, nature isn’t a destination, it’s a way of life.”',
    alt: 'Minnehaha Falls cascading into a gorge in Minneapolis.',
    tint: 'oklch(0.42 0.10 148)',
  },
].map((a) => ({ ...a, img: `/assets/images/features/${a.slug}.jpg` }))

export const invoices = [
  { date: '12 Aug 2026', desc: 'Annual subscription — Éclat', amount: '$84.00' },
  { date: '12 Aug 2025', desc: 'Annual subscription — Éclat', amount: '$84.00' },
  { date: '12 Aug 2024', desc: 'Annual subscription — Éclat', amount: '$78.00' },
  { date: '12 Aug 2023', desc: 'Annual subscription — Éclat', amount: '$78.00' },
]

export const archiveYears = ['All', '2026']

export const editionByNo = (no) => editions.find((e) => e.no === Number(no))
