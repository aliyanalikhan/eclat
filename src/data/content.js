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
    // FREE-ONLY (D-11) — everything but the last paragraph, matching the
    // exact free-preview boundary this page has always shown. The gated
    // third paragraph lives only in lib/gated-content.js, server-side.
    excerpt: [
      'This issue opens with Paul Onuwanibe on leadership, legacy, and rebuilding Africa’s business landscape — a conversation about vision as the work of decades, not quarters.',
      'Also inside: Chef Efi’s culinary revolution, a retrospective on the World Cup, women’s health in focus, and a look at fairways, finance, and fatherhood.',
    ],
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
    // FREE-ONLY (D-11) — everything but the last paragraph, matching the
    // exact free-preview boundary this page has always shown. The gated
    // third paragraph lives only in lib/gated-content.js, server-side.
    excerpt: [
      'ÉCLAT is born from a simple belief: that style is not only what you wear, but how you move through the world. It lives in the confidence of a well-chosen outfit, the calm of a beautifully designed space, the glow of healthy skin, and the curiosity that leads you to new places.',
      'Inside these pages, we bring together the worlds that shape modern living — fashion, beauty, lifestyle, and travel — curated with intention and a distinctly global perspective. We chose to celebrate Minnesota, our beautiful home state and the place where the stories of LaDidiér and ÉCLAT began.',
    ],
    excerptBy: 'Ebuka Osuorah, Founder',
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
    slug: 'the-gettysburg-address',
    title: 'The Gettysburg Address',
    type: 'Speech',
    year: '1863',
    dek: 'Two minutes at a battlefield dedication that November, and a new birth of freedom promised in return.',
    body: [
      'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.',
      'Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting-place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.',
      'But, in a larger sense, we cannot dedicate, we cannot consecrate, we cannot hallow, this ground. The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us—that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion—that we here highly resolve that these dead shall not have died in vain—that this nation, under God, shall have a new birth of freedom—and that government of the people, by the people, for the people, shall not perish from the earth.',
    ],
    tint: 'oklch(0.55 0.05 70)',
    ratio: '1024/1536',
    w: 1024,
    h: 1536,
  },
].map((w) => ({ ...w, img: `/assets/images/writings/${w.slug}.jpg` }))

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

// Decorative tribute imagery only — not editorial content, not a claim that
// any of these people have ever appeared in a real Éclat issue. Each `img`
// is a supplied asset (not generated by the site) placed as-is. `bio` is a
// short, uncontroversial factual line (dates + what they're known for) —
// deliberately kept to widely-documented basics, not a claim of exclusivity.
// Two of the seven (Soyinka, Kuti) aren't American, which is why the section
// is titled "Cultural Icons" rather than "American Icons."
export const icons = [
  {
    slug: 'louis-armstrong',
    name: 'Louis Armstrong',
    bio: 'Pioneering jazz trumpeter and vocalist (1901–1971), one of the most influential figures in the genre’s history.',
    ratio: '1122/1402',
    w: 1122,
    h: 1402,
  },
  {
    slug: 'elvis-presley',
    name: 'Elvis Presley',
    bio: '“The King of Rock ‘n’ Roll” (1935–1977), whose fusion of country, blues, and gospel reshaped American popular music.',
    ratio: '1024/1536',
    w: 1024,
    h: 1536,
  },
  {
    slug: 'muhammad-ali',
    name: 'Muhammad Ali',
    bio: 'Three-time world heavyweight boxing champion (1942–2016) and civil-rights advocate, widely regarded as one of the 20th century’s greatest athletes.',
    ratio: '896/1200',
    w: 896,
    h: 1200,
  },
  {
    slug: 'marilyn-monroe',
    name: 'Marilyn Monroe',
    bio: 'Actress and cultural icon (1926–1962) whose image remains one of the most recognizable in American film history.',
    ratio: '1122/1402',
    w: 1122,
    h: 1402,
  },
  {
    slug: 'james-brown',
    name: 'James Brown',
    bio: '“The Godfather of Soul” (1933–2006), whose rhythmic innovations laid the groundwork for funk music.',
    ratio: '1024/1536',
    w: 1024,
    h: 1536,
  },
  {
    slug: 'wole-soyinka',
    name: 'Wole Soyinka',
    bio: 'Nigerian playwright, poet, and essayist (b. 1934) — in 1986, the first African to win the Nobel Prize in Literature.',
    ratio: '1024/1536',
    w: 1024,
    h: 1536,
  },
  {
    slug: 'fela-kuti',
    name: 'Fela Kuti',
    bio: 'Nigerian multi-instrumentalist and composer (1938–1997) who pioneered Afrobeat and used his music as a platform for activism.',
    ratio: '1145/1374',
    w: 1145,
    h: 1374,
  },
  {
    slug: 'things-fall-apart',
    name: 'Chinua Achebe',
    bio: 'Nigerian novelist (1930–2013) whose 1958 debut, "Things Fall Apart," is the most widely read work in modern African literature.',
    ratio: '1024/1536',
    w: 1024,
    h: 1536,
  },
  {
    slug: 'princess-diana',
    name: 'Princess Diana',
    bio: 'Princess of Wales (1961–1997), globally recognized for her humanitarian work confronting HIV/AIDS stigma and advocating for a worldwide ban on landmines.',
    ratio: '1024/1536',
    w: 1024,
    h: 1536,
  },
  {
    slug: 'pele',
    name: 'Pelé',
    bio: 'Brazilian footballer (1940–2022), born Edson Arantes do Nascimento, a three-time FIFA World Cup winner with Brazil widely regarded as one of the greatest footballers of all time.',
    ratio: '1254/1254',
    w: 1254,
    h: 1254,
  },
].map((i) => ({ ...i, img: `/assets/images/icons/${i.slug}.png` }))

// American culture, told through speeches and moments people actually lived
// through — not a stock library. Each `youtubeId` is played inline via
// youtube-nocookie.com on click (CSP: frame-src); the thumbnail comes
// straight from YouTube's own CDN (CSP: img-src https://i.ytimg.com), so no
// local asset is needed. `source` credits the original uploader for the
// title shown in the modal.
export const videos = [
  {
    slug: 'obama-election-night-2008',
    youtubeId: 'HfHbw3n0EIM',
    kicker: 'Election Night · 2008',
    title: 'President-Elect Barack Obama',
    dek: 'The address that opened a new chapter — delivered to Grant Park, Chicago, the night America elected its first Black president.',
    source: 'Barack Obama',
  },
  {
    slug: 'mandela-childrens-rights',
    youtubeId: 'eF8IKcZuyoQ',
    kicker: "World Voices · Children's Rights",
    title: 'Nelson Mandela on Children',
    dek: 'Not an American voice, but a friend to the American civil-rights story — Mandela on why a nation is judged by how it treats its children.',
    source: 'Keepin It Kaashual',
  },
  {
    slug: 'jfk-ask-not',
    youtubeId: 'L8l11q_MNRY',
    kicker: 'Inaugural Address · 1961',
    title: '"Ask Not What Your Country Can Do for You"',
    dek: 'John F. Kennedy’s inaugural line became a generation’s call to public service — still the most-quoted sentence in American political oratory.',
    source: 'John F. Kennedy Library Foundation',
  },
  {
    slug: 'breakdance-80s',
    youtubeId: 'PN_o0cB5iKs',
    kicker: 'Street Culture · The 1980s',
    title: 'Breakdance in the 80s',
    dek: 'Before it was an Olympic sport, breaking was a Bronx block-party invention — cardboard mats, boomboxes, and a whole new American art form.',
    source: 'JOAN NSX',
  },
  {
    slug: 'obama-yes-we-can',
    youtubeId: 'FPBSilfiRY0',
    kicker: 'Campaign Trail · 2008',
    title: '"Yes We Can"',
    dek: 'A New Hampshire primary-night concession speech that became one of the most studied pieces of American political rhetoric of the century.',
    source: 'John Zimmer',
  },
  {
    slug: 'maya-angelou-phenomenal-woman',
    youtubeId: 'x2Mh-4P6OQU',
    kicker: 'Poetry · American Letters',
    title: 'Maya Angelou — "Phenomenal Woman"',
    dek: 'Maya Angelou reads her own poem — a defiant, joyful anthem that became one of the best-loved works in American poetry.',
    source: 'UPSURGE! The Global Women of Choice Podcast',
  },
  {
    slug: 'reagan-farewell-address',
    youtubeId: 'J5upAEZOchM',
    kicker: 'Farewell Address · 1989',
    title: 'Ronald Reagan on What Made America Great',
    dek: 'Reagan’s closing message from the Oval Office — his own account of the country he believed America to be.',
    source: '1990 Institute',
  },
  {
    slug: 'mlk-i-have-a-dream',
    youtubeId: 'vP4iY1TtS3s',
    kicker: 'March on Washington · 1963',
    title: '"I Have a Dream"',
    dek: 'From the steps of the Lincoln Memorial — Martin Luther King Jr.’s address to the March on Washington for Jobs and Freedom, and the defining speech of the civil-rights era.',
    source: 'RARE FACTS',
  },
  {
    slug: 'amanda-gorman-inauguration-poem',
    youtubeId: 'Jp9pyMqnBzk',
    kicker: 'Inaugural Address · 2021',
    title: 'Amanda Gorman — "The Hill We Climb"',
    dek: 'At twenty-two, Amanda Gorman became the youngest inaugural poet in U.S. history — reciting "The Hill We Climb" to a nation asking what came next.',
    source: 'CNBC Television',
  },
]

export const invoices = [
  { date: '12 Aug 2026', desc: 'Annual subscription — Éclat', amount: '$84.00' },
  { date: '12 Aug 2025', desc: 'Annual subscription — Éclat', amount: '$84.00' },
  { date: '12 Aug 2024', desc: 'Annual subscription — Éclat', amount: '$78.00' },
  { date: '12 Aug 2023', desc: 'Annual subscription — Éclat', amount: '$78.00' },
]

export const archiveYears = ['All', '2026']

export const editionByNo = (no) => editions.find((e) => e.no === Number(no))
export const writingBySlug = (slug) => writings.find((w) => w.slug === slug)
