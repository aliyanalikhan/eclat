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
    previewPageCount: 62,
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
    previewPageCount: 60,
    tint: 'oklch(0.32 0.02 60)',
    plateSuppressed: true, // real cover art — wordmark and coverlines are already printed in
    ratio: '3/4',
    w: 1200,
    h: 1600,
    blurb:
      'The maiden edition of ÉcLAT by LaDidiér, built around a conversation with Ebuka Osuorah on becoming the new architect of modern living — plus an editorial on essence over excess, a Minneapolis city guide, and LaDidiér Bridal’s elegance reimagined.',
    // FREE-ONLY (D-11) — everything but the last paragraph, matching the
    // exact free-preview boundary this page has always shown. The gated
    // third paragraph lives only in lib/gated-content.js, server-side.
    excerpt: [
      'ÉcLAT is born from a simple belief: that style is not only what you wear, but how you move through the world. It lives in the confidence of a well-chosen outfit, the calm of a beautifully designed space, the glow of healthy skin, and the curiosity that leads you to new places.',
      'Inside these pages, we bring together the worlds that shape modern living — fashion, beauty, lifestyle, and travel — curated with intention and a distinctly global perspective. We chose to celebrate Minnesota, our beautiful home state and the place where the stories of LaDidiér and ÉcLAT began.',
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
    slug: 'immortal-beloved',
    title: 'Immortal Beloved',
    type: 'Letter',
    year: 'July 1812',
    dek: 'Beethoven’s letter to the woman history still cannot name.',
    tint: 'oklch(0.32 0.05 25)',
    ratio: '1224/1584',
    w: 1224,
    h: 1584,
    pdf: '/assets/documents/writings/immortal-beloved.pdf',
    pages: [
      '/assets/images/writings/immortal-beloved.jpg',
      '/assets/images/writings/immortal-beloved-p2.jpg',
      '/assets/images/writings/immortal-beloved-p3.jpg',
    ],
  },
  {
    slug: 'the-poetical-science',
    title: 'The Poetical Science',
    type: 'Manuscript',
    year: '1843',
    dek: 'Ada Lovelace and the machine she imagined before the world was ready to build it.',
    tint: 'oklch(0.42 0.05 285)',
    ratio: '1224/1584',
    w: 1224,
    h: 1584,
    pdf: '/assets/documents/writings/the-poetical-science.pdf',
    pages: [
      '/assets/images/writings/the-poetical-science.jpg',
      '/assets/images/writings/the-poetical-science-p2.jpg',
    ],
  },
  {
    slug: 'the-confession',
    title: 'The Confession',
    type: 'Letter',
    year: '1844',
    dek: 'Darwin to Joseph Hooker, 1844 — the letter in which he first confided the theory that would upend the natural sciences.',
    tint: 'oklch(0.40 0.06 145)',
    ratio: '1224/1584',
    w: 1224,
    h: 1584,
    pdf: '/assets/documents/writings/the-confession.pdf',
  },
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
  {
    slug: 'come-here-i-want-to-see-you',
    title: 'Come Here, I Want to See You',
    type: 'Notebook',
    year: 'March 10, 1876',
    dek: 'The words that traveled down a wire—and changed how the world communicated.',
    tint: 'oklch(0.46 0.04 205)',
    ratio: '1224/1584',
    w: 1224,
    h: 1584,
    pdf: '/assets/documents/writings/come-here-i-want-to-see-you.pdf',
    pages: [
      '/assets/images/writings/come-here-i-want-to-see-you.jpg',
      '/assets/images/writings/come-here-i-want-to-see-you-p2.jpg',
      '/assets/images/writings/come-here-i-want-to-see-you-p3.jpg',
    ],
  },
  {
    slug: 'two-minds-one-idea',
    title: 'Two Minds, One Idea',
    type: 'Letter',
    year: '1909–1910',
    dek: 'Gandhi, Tolstoy, and a correspondence that crossed continents.',
    tint: 'oklch(0.46 0.08 55)',
    ratio: '1224/1584',
    w: 1224,
    h: 1584,
    pdf: '/assets/documents/writings/two-minds-one-idea.pdf',
    pages: [
      '/assets/images/writings/two-minds-one-idea.jpg',
      '/assets/images/writings/two-minds-one-idea-p2.jpg',
      '/assets/images/writings/two-minds-one-idea-p3.jpg',
    ],
  },
  {
    slug: 'the-einstein-szilard-letter',
    title: 'The Einstein–Szilard Letter',
    type: 'Letter',
    year: '1939',
    dek: 'A physicist’s warning delivered to the White House in August 1939, and the letter that helped set the atomic age in motion.',
    body: [
      'Albert Einstein, Old Grove Rd., Nassau Point, Peconic, Long Island',
      'F.D. Roosevelt, President of the United States, White House, Washington, D.C.',
      'August 2nd, 1939',
      'Sir:',
      'Some recent work by E. Fermi and L. Szilard, which has been communicated to me in manuscript, leads me to expect that the element uranium may be turned into a new and important source of energy in the immediate future. Certain aspects of the situation which has arisen seem to call for watchfulness and, if necessary, quick action on the part of the Administration. I believe therefore that it is my duty to bring to your attention the following facts and recommendations:',
      'In the course of the last four months it has been made probable — through the work of Joliot in France as well as Fermi and Szilard in America — that it may become possible to set up a nuclear chain reaction in a large mass of uranium, by which vast amounts of power and large quantities of new radium-like elements would be generated. Now it appears almost certain that this could be achieved in the immediate future.',
      'This new phenomenon would also lead to the construction of bombs, and it is conceivable — though much less certain — that extremely powerful bombs of a new type may thus be constructed. A single bomb of this type, carried by boat and exploded in a port, might very well destroy the whole port together with some of the surrounding territory. However, such bombs might very well prove to be too heavy for transportation by air.',
      'The United States has only very poor ores of uranium in moderate quantities. There is some good ore in Canada and the former Czechoslovakia, while the most important source of uranium is Belgian Congo.',
      'In view of this situation you may think it desirable to have some permanent contact maintained between the Administration and the group of physicists working on chain reactions in America. One possible way of achieving this might be for you to entrust with this task a person who has your confidence and who could perhaps serve in an unofficial capacity. His task might comprise the following:',
      'a) to approach Government Departments, keep them informed of the further development, and put forward recommendations for Government action, giving particular attention to the problem of securing a supply of uranium ore for the United States;',
      'b) to speed up the experimental work, which is at present being carried on within the limits of the budgets of University laboratories, by providing funds, if such funds be required, through his contacts with private persons who are willing to make contributions for this cause, and perhaps also by obtaining the co-operation of industrial laboratories which have the necessary equipment.',
      'I understand that Germany has actually stopped the sale of uranium from the Czechoslovakian mines which she has taken over. That she should have taken such early action might perhaps be understood on the ground that the son of the German Under-Secretary of State, von Weizsacker, is attached to the Kaiser-Wilhelm-Institut in Berlin where some of the American work on uranium is now being repeated.',
      'Yours very truly, Albert Einstein',
    ],
    tint: 'oklch(0.38 0.04 230)',
    ratio: '1224/1584',
    w: 1224,
    h: 1584,
    pdf: '/assets/documents/writings/the-einstein-szilard-letter.pdf',
    pages: [
      '/assets/images/writings/the-einstein-szilard-letter.jpg',
      '/assets/images/writings/the-einstein-szilard-letter-p2.jpg',
    ],
  },
  {
    slug: 'the-girl-who-changed-lincolns-face',
    title: 'THE GIRL WHO CHANGED LINCOLN’S FACE',
    dek: 'She was eleven years old. She wrote to a presidential candidate with a suggestion. Abraham Lincoln listened.',
    type: 'Letter',
    origin: 'Grace Bedell & Abraham Lincoln',
    date: 'October 1860',
    tint: 'oklch(0.38 0.04 230)',
    ratio: '1312/1199',
    w: 1312,
    h: 1199,
    img: '/assets/images/writings/the-girl-who-changed-lincolns-face.png',
    pages: [
      '/assets/images/writings/the-girl-who-changed-lincolns-face.png',
    ],
  },
  {
    slug: 'a-trilogy',
    title: 'A Trilogy',
    dek: 'The 3 is like a trilogy I don’t know how you wanna pitch it but I trust you’d figure it out',
    type: 'Letter',
    origin: 'Unknown',
    date: 'Unknown',
    tint: 'oklch(0.38 0.04 230)',
    ratio: '1312/1199',
    w: 1312,
    h: 1199,
    img: '/assets/images/writings/trilogy-1.png',
    pages: [
      '/assets/images/writings/trilogy-1.png',
      '/assets/images/writings/trilogy-2.png',
      '/assets/images/writings/trilogy-3.png',
      '/assets/images/writings/trilogy-4.png',
    ],
  },
  {
    slug: '13th-amendment',
    title: '13th Amendment to the U.S. Constitution',
    dek: 'Abolition of Slavery',
    type: 'Document',
    origin: 'U.S. Constitution',
    date: '1865',
    tint: 'oklch(0.38 0.04 230)',
    ratio: '1108/1419',
    w: 1108,
    h: 1419,
    img: '/assets/images/writings/13th-amendment.png',
    pages: [
      '/assets/images/writings/13th-amendment.png',
      '/assets/images/writings/13th-amendment-p2.png',
    ],
  },
].map((w) => ({ ...w, img: w.img || `/assets/images/writings/${w.slug}.jpg` }))

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
  {
    slug: 'paul-onwuanibe-real-estate-empire',
    youtubeId: 'clhvBJua_A4',
    kicker: 'Enterprise · The Joey Akan Experience',
    title: 'How Paul Onwuanibe Built a $1B Real Estate Empire',
    dek: 'Paul Onwuanibe discusses building a landmark real estate enterprise, visionary design, and institution-building in modern Africa.',
    source: 'Glitch Africa Studios',
  },
  {
    slug: 'chikwe-ihekweazu-pandemics-power-institutions',
    youtubeId: 'RYi5FDvTF-w',
    kicker: 'Public Health & Governance · ONE2ONE',
    title: 'Dr. Chikwe Ihekweazu — Pandemics, Power & Institutions',
    dek: 'The former NCDC Director General on leadership under pressure, managing global health crises, and strengthening institutions.',
    source: 'ONE2ONE',
  },
  {
    slug: 'yemi-osinbajo-speech',
    youtubeId: 'U4jOI7N3qwo',
    kicker: 'World Voices · Leadership',
    title: 'This Prof. Yemi Osinbajo Speech Will Make You Stop and Think!',
    dek: 'Prof. Yemi Osinbajo — Nigeria’s Vice President from 2015 to 2023 — on leadership, service, and the work of building a nation.',
    source: 'ATILOYE GLOBAL TV',
  },
  {
    slug: 'mandela-on-his-imprisonment',
    youtubeId: 'XaxvHkLbRwc',
    kicker: 'World Voices · Freedom',
    title: 'In His Own Words: Nelson Mandela on His Imprisonment',
    dek: 'Nelson Mandela reflects, in his own voice, on his years of imprisonment — and on the resolve that carried him through them.',
    source: 'American Archive of Public Broadcasting',
  },
  {
    slug: 'better-days-inauguration-2021',
    youtubeId: 'u4HkM6WzmFY',
    kicker: 'Inauguration · 2021',
    title: 'Ant Clemons & Justin Timberlake — "Better Days"',
    dek: 'A performance from the Biden-Harris Inauguration 2021 celebration — a song of hope offered to a nation looking ahead.',
    source: 'Biden Inaugural Committee',
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
