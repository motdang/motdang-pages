// render.mjs — one page, from its data, as a whole HTML document.
// The Worker serves it; the builder runs the same function for its preview,
// so what a maker sees is what a reader gets. Everything the maker typed is
// escaped here; nothing they send is markup.

import { word, PAGE_LANGS } from './words.mjs'
import { encodeQr } from './qr.mjs'
import { DINGBATS } from './db/names.mjs'
import { normalizeExtras, upcoming, campsNow, utcOf, money, MAP_NEAR, MAX, UNIT_LABEL, tagsOf } from './extras.mjs'
import { normalizeAmulets, amuletSection, amuletBody, amuletLd, amuletDesc, AM_CSS, AM_MAX, amCap } from './amulet.mjs'
import { normalizeStore, shopSection, dlSection, productBody, productLd, productDesc, shopData, forSale, dlForSale, prCap, SHOP_CSS } from './store.mjs'
import { LOOKS, LOOK_IDS, GOLD_LOOKS, LOOK_ALIAS, lookOf, HERO_CSS, F_THAI } from './looks.mjs'
import { lookOk, freeLooks, groupOf, GROUPS, GROUP_OF, GROUP_KINDS } from './kinds.mjs'
import { ogOf, normalizeOg } from './og.mjs'

export { LOOKS, LOOK_IDS, GOLD_LOOKS, LOOK_ALIAS, lookOf, lookOk, freeLooks, groupOf, GROUPS, GROUP_OF, GROUP_KINDS }

export const KINDS = ['shop', 'food', 'service', 'work', 'amulet', 'stay', 'homes', 'me', 'event', 'group', 'store', 'online']
export const HOME = 'https://sites.motdang.net'
export const MAIN = 'https://motdang.net'
export const MAX_PHOTOS = { free: 12, gold: 120, amulet: 360 }
// a Gold amulet page holds 360 (her word 2026-10-16: 120 amulets, front, back and a close-up)
export const photoMax = (kind, gold) => (!gold ? MAX_PHOTOS.free : kind === 'amulet' ? MAX_PHOTOS.amulet : MAX_PHOTOS.gold)

// The auto-doodler's scenes a page can draw itself as (motdang.net/front/doodler*.js),
// by kind, with words for the builder. The first is each kind's own.
export const SCENES = {
  food: [['restaurant', 'ร้านอาหาร', 'Restaurant'], ['cafe', 'ร้านกาแฟ', 'Café'], ['noodle', 'ร้านก๋วยเตี๋ยว', 'Noodle shop'], ['streetfood', 'ร้านริมทาง', 'Street stall'],
    ['bakery', 'ร้านขนม', 'Bakery'], ['bar', 'บาร์', 'Bar'], ['cooking', 'สอนทำอาหาร', 'Cooking class']],
  shop: [['convenience', 'ร้านของชำ', 'Corner shop'], ['clothes', 'ร้านเสื้อผ้า', 'Clothes'], ['crafts', 'งานฝีมือ', 'Crafts'], ['handicraft', 'หัตถกรรม', 'Handicraft'],
    ['pharmacy', 'ร้านขายยา', 'Pharmacy'], ['secondhand', 'ของมือสอง', 'Second-hand'], ['pets', 'ร้านสัตว์เลี้ยง', 'Pets'], ['printing', 'ร้านถ่ายเอกสาร', 'Printing'],
    ['laundry', 'ร้านซักผ้า', 'Laundry'], ['rental', 'เช่ารถ', 'Rentals'], ['freshmarket', 'ตลาดสด', 'Fresh market'], ['cannabis', 'ร้านกัญชา', 'Cannabis'], ['mall', 'ห้าง', 'Mall']],
  service: [['fixit', 'ร้านซ่อม', 'Repairs'], ['salon', 'ร้านทำผม', 'Hair salon'], ['massage', 'ร้านนวด', 'Massage'], ['beautyclinic', 'คลินิกความงาม', 'Beauty clinic'],
    ['clinic', 'คลินิก', 'Clinic'], ['dentist', 'ทันตกรรม', 'Dentist'], ['optician', 'ร้านแว่น', 'Optician'], ['tattoo', 'ร้านสัก', 'Tattoo'], ['sakyant', 'สักยันต์', 'Sak yant'],
    ['gym', 'ยิม', 'Gym'], ['muaythai', 'มวยไทย', 'Muay Thai'], ['garage', 'อู่ซ่อมรถ', 'Garage'], ['office', 'สำนักงาน', 'Office'], ['agent', 'นายหน้า', 'Estate agent'],
    ['tours', 'ทัวร์', 'Tours'], ['training', 'สอนพิเศษ', 'Classes'], ['hotel', 'โรงแรม', 'Hotel'], ['guesthouse', 'เกสต์เฮาส์', 'Guesthouse'], ['hostel', 'โฮสเทล', 'Hostel']],
  stay: [['hotel', 'โรงแรม', 'Hotel'], ['guesthouse', 'เกสต์เฮาส์', 'Guesthouse'], ['hostel', 'โฮสเทล', 'Hostel'], ['lanna-house', 'บ้านล้านนา', 'Lanna house'], ['rooftop', 'ดาดฟ้า', 'Rooftop']],
  homes: [['agent', 'นายหน้า', 'Estate agent'], ['lanna-house', 'บ้านล้านนา', 'House'], ['alley', 'ซอย', 'Soi'], ['office', 'สำนักงาน', 'Office'], ['rooftop', 'ดาดฟ้า', 'Rooftop']],
  work: [['studio', 'สตูดิโอ', 'Studio'], ['office', 'สำนักงาน', 'Office'], ['lanna-house', 'บ้านล้านนา', 'Lanna house'], ['rooftop', 'ดาดฟ้า', 'Rooftop'], ['alley', 'ซอย', 'Soi'],
    ['crafts', 'งานฝีมือ', 'Crafts'], ['band', 'ดนตรี', 'Music'], ['robots', 'หุ่นยนต์', 'Robots']],
  amulet: [['wat', 'วัด', 'Wat'], ['market', 'ตลาด', 'Market'], ['secondhand', 'ของเก่า', 'Antiques'], ['crafts', 'งานฝีมือ', 'Crafts'], ['alley', 'ซอย', 'Soi']],
  me: [['lanna-house', 'บ้านล้านนา', 'Lanna house'], ['alley', 'ซอย', 'Soi'], ['rooftop', 'ดาดฟ้า', 'Rooftop'], ['studio', 'สตูดิโอ', 'Studio'], ['band', 'ดนตรี', 'Music'],
    ['dance', 'เต้น', 'Dance'], ['tuktuk', 'ตุ๊กตุ๊ก', 'Tuk-tuk'], ['robots', 'หุ่นยนต์', 'Robots']],
  event: [['social', 'ปาร์ตี้', 'Party'], ['market', 'ตลาด', 'Market'], ['band', 'ดนตรีสด', 'Live music'], ['feast', 'งานเลี้ยง', 'Feast'], ['yoga', 'โยคะ', 'Yoga'],
    ['run', 'วิ่ง', 'Run'], ['learn', 'เวิร์กช็อป', 'Workshop'], ['latin', 'ละติน', 'Latin night'], ['film', 'หนัง', 'Film'], ['dance', 'เต้น', 'Dance'],
    ['calm', 'ทำบุญ · สมาธิ', 'Merit · meditation'], ['ball', 'กีฬา', 'Sport'], ['songkran', 'สงกรานต์', 'Songkran'], ['yipeng', 'ยี่เป็ง', 'Yi Peng'],
    ['walking-street', 'ถนนคนเดิน', 'Walking street'], ['flowers', 'ดอกไม้', 'Flowers']],
  group: [['community', 'ชุมชน', 'Community'], ['learn', 'ชมรม', 'Club'], ['school', 'โรงเรียน', 'School'], ['park', 'สวน', 'Park'], ['ball', 'กีฬา', 'Sport'],
    ['run', 'วิ่ง', 'Run'], ['calm', 'สมาธิ', 'Meditation'], ['wat', 'วัด', 'Wat'], ['akha', 'อาข่า', 'Akha'], ['spirithouse', 'ศาลพระภูมิ', 'Spirit house']],
}
const SCENE_IDS = new Set(Object.values(SCENES).flat().map((x) => x[0]))
export const DPROPS = ['wifi', 'aircon', 'parking', 'wheelchair', 'pool', 'tables', 'takeaway', 'lights', 'water', 'farm', 'camp', 'chicken', 'rooster', 'noodles', 'pizza', 'bubbletea']
export const DTIMES = ['dawn', 'day', 'dusk', 'night']
export const sceneOf = (kind, d) => (d.scene && SCENE_IDS.has(d.scene) ? d.scene : (SCENES[kind] || SCENES.shop)[0][0])

// The dingbat beside each section's heading, and the look each page look draws them in.
const HEAD_DING = { pay: 'coin', about: 'sparkle', menu: 'noodles', prices: 'coin', hours: 'clock', photos: 'camera', where: 'pin', line: 'chat', links: 'link',
  contact: 'telephone', msg: 'envelope', when: 'calendar', drawn: 'pencil', video: 'play', spots: 'compass', share: 'share',
  cal: 'calendar', news: 'megaphone', camp: 'megaphone', book: 'clock', rooms: 'key', lists: 'home', works: 'nib', quotes: 'hedera', amulets: 'lotus', amterms: 'bell', amkt: 'coin', shop: 'cart', dls: 'gift' }
const DING_LOOK = { poster: 'riso', loom: 'paper', stitch: 'paper', night: 'neon', clean: 'ink', lanna: 'paper', gold: 'paper' }
export const ACCENTS = ['#f04a00', '#ff2e88', '#ffb000', '#19a974', '#137a71', '#2563eb', '#7c3aed', '#111827']

// Grab's own countries, and the path its web pages use for each.
export const GRAB_CC = { TH: 'th', MY: 'my', SG: 'sg', ID: 'id', PH: 'ph', VN: 'vn', KH: 'kh', MM: 'mm' }

export const CURRENCY = {
  THB: '฿', USD: '$', EUR: '€', GBP: '£', MMK: 'K ', LAK: '₭', KHR: '៛', VND: '₫', CNY: '¥', JPY: '¥', KRW: '₩',
  MYR: 'RM ', SGD: 'S$', IDR: 'Rp ', PHP: '₱', INR: '₹', AUD: 'A$', CAD: 'C$', TWD: 'NT$', HKD: 'HK$',
}
const CC_CURRENCY = {
  TH: 'THB', US: 'USD', MM: 'MMK', LA: 'LAK', KH: 'KHR', VN: 'VND', CN: 'CNY', JP: 'JPY', KR: 'KRW', MY: 'MYR',
  SG: 'SGD', ID: 'IDR', PH: 'PHP', IN: 'INR', AU: 'AUD', CA: 'CAD', TW: 'TWD', HK: 'HKD', GB: 'GBP',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', PT: 'EUR', IE: 'EUR', AT: 'EUR', BE: 'EUR', FI: 'EUR', GR: 'EUR',
}
export function currencyFor(cc, lang) {
  return CC_CURRENCY[cc] || { th: 'THB', my: 'MMK', zh: 'CNY', ja: 'JPY', ko: 'KRW', vi: 'VND', km: 'KHR', lo: 'LAK', id: 'IDR' }[lang] || 'USD'
}

// ---- cleaning ---------------------------------------------------------------

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n)
const PHOTO_ID = /^[a-z0-9]{12,24}$/
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

/** https URL or '' — http becomes https, other schemes are dropped. */
export function safeUrl(u) {
  let s = str(u, 400)
  if (!s) return ''
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s
  try {
    const x = new URL(s)
    if (x.protocol === 'http:') x.protocol = 'https:'
    if (x.protocol !== 'https:' || !x.hostname.includes('.')) return ''
    if (x.username || x.password) return ''
    return x.toString()
  } catch { return '' }
}

const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase() } catch { return '' } }
const hostIs = (u, list) => { const h = hostOf(u); return list.some((d) => h === d || h.endsWith('.' + d)) }

/** The page's data, every field cut to size and typed. Unknown keys drop. */
export function normalize(d = {}) {
  const o = {}
  o.name = str(d.name, 60)
  o.tagline = str(d.tagline, 140)
  o.about = str(d.about, 2400)
  o.accent = /^#[0-9a-f]{6}$/i.test(d.accent || '') ? d.accent.toLowerCase() : ''
  o.counter = !!d.counter
  o.currency = CURRENCY[d.currency] ? d.currency : ''
  o.cover = PHOTO_ID.test(d.cover || '') ? d.cover : ''
  o.coverPos = Array.isArray(d.coverPos) && d.coverPos.length === 2 && d.coverPos.every((v) => typeof v === 'number' && v >= 0 && v <= 1) ? d.coverPos.map((v) => Math.round(v * 100) / 100) : null
  o.card = PHOTO_ID.test(d.card || '') ? d.card : ''
  o.og = normalizeOg(d.og) // the maker's share card choices (make-card.mjs)
  o.avatar = PHOTO_ID.test(d.avatar || '') ? d.avatar : ''
  o.avround = d.avround !== false
  o.photos = (Array.isArray(d.photos) ? d.photos : []).filter((p) => PHOTO_ID.test(p)).slice(0, MAX_PHOTOS.amulet)
  o.scene = SCENE_IDS.has(d.scene) ? d.scene : ''
  o.drawing = d.drawing !== false
  const pay = d.pay || {}, ppn = String(pay.pp || '').replace(/\D/g, '')
  o.pay = { pp: [10, 13, 15].includes(ppn.length) ? ppn : '', tips: !!pay.tips, price: str(pay.price, 10).replace(/[^\d.]/g, '') }
  o.dprops = [...new Set((Array.isArray(d.dprops) ? d.dprops : []).filter((x) => DPROPS.includes(x)))].slice(0, 8)
  o.dseed = Number.isInteger(d.dseed) && d.dseed > 0 && d.dseed < 1e9 ? d.dseed : 0
  o.dtime = DTIMES.includes(d.dtime) ? d.dtime : ''
  o.floors = Number.isInteger(d.floors) && d.floors > 0 ? Math.min(60, d.floors) : 0
  o.msg = d.msg !== false
  o.dings = [...new Set((Array.isArray(d.dings) ? d.dings : []).filter((n) => typeof n === 'string' && DINGBATS[n]))].slice(0, 6)
  o.credits = {}
  for (const [id, c] of Object.entries(d.credits && typeof d.credits === 'object' ? d.credits : {})) {
    if (!PHOTO_ID.test(id) || !c || typeof c !== 'object' || c.from === 'doodle') continue // a doodle is the maker's own picture: no credit line, no PD badge
    o.credits[id] = { title: str(c.title, 120), by: str(c.by, 120), src: safeUrl(c.src), license: str(c.license, 40), licenseUrl: safeUrl(c.licenseUrl), from: str(c.from, 20) }
  }
  o.video = videoUrl(d.video)
  o.vposter = PHOTO_ID.test(d.vposter || '') ? d.vposter : ''
  o.give = safeUrl(d.give)
  o.spots = (Array.isArray(d.spots) ? d.spots : []).map((x) => ({ n: str(x?.n, 60), note: str(x?.note, 160), lat: Number(x?.lat), lng: Number(x?.lng) }))
    .filter((x) => x.n && Number.isFinite(x.lat) && Number.isFinite(x.lng) && Math.abs(x.lat) <= 85 && Math.abs(x.lng) <= 180)
    .map((x) => ({ ...x, lat: Math.round(x.lat * 1e6) / 1e6, lng: Math.round(x.lng * 1e6) / 1e6 })).slice(0, 20)
  o.items = (Array.isArray(d.items) ? d.items : []).map((i) => ({ n: str(i?.n, 80), p: str(i?.p, 24), note: str(i?.note, 160) }))
    .filter((i) => i.n || i.p).slice(0, 60)
  o.links = (Array.isArray(d.links) ? d.links : []).map((l) => ({ t: str(l?.t, 50), u: safeUrl(l?.u) }))
    .filter((l) => l.u).slice(0, 12)
  const c = d.contact || {}
  o.contact = {
    phone: str(c.phone, 30).replace(/[^\d+ ()-]/g, ''),
    line: str(c.line, 120), whatsapp: str(c.whatsapp, 30).replace(/[^\d+ ()-]/g, ''),
    facebook: str(c.facebook, 200), instagram: str(c.instagram, 120), tiktok: str(c.tiktok, 120),
    youtube: str(c.youtube, 200), email: /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,}$/i.test(c.email || '') ? str(c.email, 254) : '',
    web: safeUrl(c.web),
  }
  const g = d.order || {}
  o.order = {
    grabfood: hostIs(safeUrl(g.grabfood), ['grab.com', 'grab.onelink.me']) ? safeUrl(g.grabfood) : '',
    lineman: hostIs(safeUrl(g.lineman), ['lineman.line.me', 'wongnai.com', 'lin.ee', 'lineman.onelink.me', 'line.me']) ? safeUrl(g.lineman) : '',
  }
  const p = d.place || {}
  const lat = Number(p.lat), lng = Number(p.lng)
  o.place = {
    lat: Number.isFinite(lat) && Math.abs(lat) <= 85 && p.lat !== '' && p.lat != null ? Math.round(lat * 1e6) / 1e6 : null,
    lng: Number.isFinite(lng) && Math.abs(lng) <= 180 && p.lng !== '' && p.lng != null ? Math.round(lng * 1e6) / 1e6 : null,
    addr: str(p.addr, 240),
    cc: /^[A-Z]{2}$/.test(p.cc || '') ? p.cc : '',
    snap: PHOTO_ID.test(p.snap || '') ? p.snap : '',
    zoom: Math.min(19, Math.max(3, Number(p.zoom) || 16)),
  }
  if (o.place.lat === null || o.place.lng === null) { o.place.lat = null; o.place.lng = null }
  const h = d.hours || {}
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = Array.isArray(h.week) ? h.week[i] : null
    if (!Array.isArray(day)) return null
    return day.filter((r) => Array.isArray(r) && HHMM.test(r[0]) && HHMM.test(r[1])).slice(0, 2).map((r) => [r[0], r[1]])
  }).map((d) => (d && d.length ? d : null))
  o.hours = { on: !!h.on, always: !!h.always, tz: validTz(h.tz), week, note: str(h.note, 160) }
  const e = d.event || {}
  o.event = LOCAL_DT.test(e.start || '')
    ? { start: e.start, end: LOCAL_DT.test(e.end || '') && e.end > e.start ? e.end : '', tz: validTz(e.tz) }
    : null
  return normalizeStore(d, normalizeAmulets(d, normalizeExtras(d, o)))
}

/** A YouTube, Vimeo or Google Drive address as { kind, id }, else null. */
export function videoUrl(v) {
  if (v && typeof v === 'object') return (v.kind === 'youtube' && /^[\w-]{11}$/.test(v.id)) || (v.kind === 'vimeo' && /^\d{6,12}$/.test(v.id)) || (v.kind === 'drive' && /^[\w-]{20,80}$/.test(v.id)) ? { kind: v.kind, id: v.id } : null
  const u = safeUrl(v)
  if (!u) return null
  let m = /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(u)
  if (m) return { kind: 'youtube', id: m[1] }
  m = /^https:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{6,12})/.exec(u)
  if (m) return { kind: 'vimeo', id: m[1] }
  m = /^https:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]{20,80})/.exec(u)
  if (m) return { kind: 'drive', id: m[1] }
  return null
}

/** The video as a button that becomes the player on a tap; `poster` a photo id shown before. */
function videoBlock(v, poster, H2, W, img) {
  const thumb = poster ? img(poster) : v.kind === 'youtube' ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : ''
  return `<section class="card rise">${H2('video', W('video'))}<button class="video" data-t="video" data-kind="${v.kind}" data-id="${esc(v.id)}" aria-label="${W('video')}">` +
    (thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy">` : '') + `<span class="play"><svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span></button></section>`
}

/** A Gold page's give button: a link to where the money goes. */
/** The tick for "News from <page>, once a month at most", and the email it asks for once it is ticked. Gold pages. */
const newsBox = (W, name) => {
  return `<label class="newsopt"><input type="checkbox" name="news" value="1"><span>${W('newsOpt', { n: name })}</span></label>` +
    `<input class="newsmail" name="newsmail" type="email" maxlength="254" autocomplete="email" placeholder="${W('newsMail')}" aria-label="${W('newsMail')}" hidden>`
}
const giveBtn = (u, W) => `<a class="btn give" data-t="give" href="${esc(u)}" rel="nofollow noopener">${icon('heart')}${W('give')}</a>`

function validTz(tz) {
  try { if (tz) { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz } } catch {}
  return 'Asia/Bangkok'
}

// ---- links the tools make -----------------------------------------------------

/** LINE add-friend link from what the maker typed: @oa, a personal id, or a line.me / lin.ee link. */
export function lineHref(v) {
  const s = str(v, 120)
  if (!s) return ''
  if (/^(https?:\/\/)?(line\.me|lin\.ee|page\.line\.me)\//i.test(s)) return safeUrl(s)
  const id = s.replace(/^line\s*(id)?\s*[:：]?\s*/i, '').replace(/\s+/g, '')
  if (/^@[a-z0-9._-]{2,40}$/i.test(id)) return 'https://line.me/R/ti/p/' + encodeURIComponent(id)
  if (/^[a-z0-9._-]{3,40}$/i.test(id)) return 'https://line.me/R/ti/p/~' + encodeURIComponent(id)
  return ''
}
/** The @ id of a LINE Official Account, which can take a pre-written message; '' for a personal id. */
export function lineOa(v) {
  const s = str(v, 120).replace(/\s+/g, '')
  const m = /^@[a-z0-9._-]{2,40}$/i.exec(s) || /(?:line\.me\/R\/ti\/p\/|line\.me\/ti\/p\/)(%40|@)([a-z0-9._-]{2,40})/i.exec(s)
  if (!m) return ''
  return m[2] ? '@' + m[2] : m[0]
}
export const lineShare = (text) => 'https://line.me/R/share?text=' + encodeURIComponent(text)
export const telHref = (p) => (p ? 'tel:' + p.replace(/[^\d+]/g, '') : '')
export const waHref = (p) => (p ? 'https://wa.me/' + p.replace(/[^\d]/g, '') : '')

function socialHref(kind, v) {
  if (!v) return ''
  if (/^(https?:\/\/|www\.)/i.test(v) || /\.(com|net|me)\//i.test(v)) {
    const u = safeUrl(v)
    const hosts = { facebook: ['facebook.com', 'fb.com', 'fb.me'], instagram: ['instagram.com'], tiktok: ['tiktok.com'], youtube: ['youtube.com', 'youtu.be'] }
    return hostIs(u, hosts[kind]) ? u : ''
  }
  const h = v.replace(/^@/, '').replace(/\s+/g, '')
  if (!/^[a-z0-9._-]{1,60}$/i.test(h)) return ''
  return { facebook: 'https://www.facebook.com/', instagram: 'https://www.instagram.com/', tiktok: 'https://www.tiktok.com/@', youtube: 'https://www.youtube.com/@' }[kind] + h
}

/** Grab's onelink: opens the app at a booking with the drop-off filled in. */
export function grabRide(lat, lng, name, cc) {
  const dp = `grab://open?screenType=BOOKING&dropOffLatitude=${lat.toFixed(6)}&dropOffLongitude=${lng.toFixed(6)}` +
    `&dropOffAddress=${encodeURIComponent(name || '')}`
  return 'https://grab.onelink.me/2695613898?af_dp=' + encodeURIComponent(dp) +
    '&af_web_dp=' + encodeURIComponent(`https://www.grab.com/${GRAB_CC[cc] || 'th'}/transport/`)
}
export const dirHref = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
export const appleHref = (lat, lng, name) => `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name || '')}`

// ---- time -----------------------------------------------------------------------

const DAY_IX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

/** Weekday (Mon = 0) and minutes past midnight at `now` in `tz`. */
export function clockIn(tz, now = new Date()) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]))
  return { day: DAY_IX[p.weekday], min: (Number(p.hour) % 24) * 60 + Number(p.minute) }
}
const mins = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))

/** { open, at } — open now and closing at `at`, or shut and opening at `at`
 *  (with `day` offset when that is not today). Null without hours. */
export function openState(h, now = new Date()) {
  if (!h || !h.on) return null
  if (h.always) return { open: true, always: true }
  const { day, min } = clockIn(h.tz, now)
  const ranges = (d) => h.week[((d % 7) + 7) % 7] || []
  for (const [a, b] of ranges(day - 1)) if (mins(b) < mins(a) && min < mins(b)) return { open: true, at: b }
  for (const [a, b] of ranges(day)) {
    const s = mins(a), e = mins(b)
    if (e > s ? min >= s && min < e : min >= s) return { open: true, at: b }
  }
  for (let k = 0; k < 7; k++) {
    for (const [a] of ranges(day + k)) if (k > 0 || mins(a) > min) return { open: false, at: a, day: k, dayIx: (day + k) % 7 }
  }
  return { open: false }
}

/** UTC milliseconds for a wall-clock 'YYYY-MM-DDTHH:MM' in `tz`. */
export function zonedToUtc(local, tz) {
  const [d, t] = local.split('T')
  const [Y, M, D] = d.split('-').map(Number)
  const [h, m] = t.split(':').map(Number)
  const guess = Date.UTC(Y, M - 1, D, h, m)
  const off = (ms) => {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - ms
  }
  let u = guess - off(guess)
  u = guess - off(u)
  return u
}

// ---- small pieces ---------------------------------------------------------------

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
const paras = (s) => esc(s).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
const icon = (id, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="/s/icons.svg#i-${id}"/></svg>`

function lum(hex) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
/** The accent where it reads on a card at 4.5:1, else the look's ink. */
function accInk(look, accent) {
  const card = /--card:(#[0-9a-f]{6})/i.exec(look.vars)?.[1] || '#ffffff'
  const ink = /--ink:(#[0-9a-f]{6})/i.exec(look.vars)?.[1] || '#111111'
  return contrast(accent, card) >= 4.5 ? accent : ink
}

/** Contrast-safe text colour for a fill: black on light fills, white on dark. */
export function onColor(hex) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.05) ? '#ffffff' : '#000000'
}

/** QR as one compact SVG path (horizontal runs merged). */
export function qrSvg(text, { dark = '#111', light = '#fff', label = 'QR' } = {}) {
  const { size, modules } = encodeQr(text, { ecl: 'M' })
  const B = 4, dim = size + B * 2
  let d = ''
  for (let y = 0; y < size; y++) {
    let x = 0
    while (x < size) {
      if (!modules[y][x]) { x++; continue }
      let run = 1
      while (x + run < size && modules[y][x + run]) run++
      d += `M${x + B} ${y + B}h${run}v1h-${run}z`
      x += run
    }
  }
  return `<svg class="qr" viewBox="0 0 ${dim} ${dim}" role="img" aria-label="${esc(label)}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`
}

// ---- the looks --------------------------------------------------------------------

const FONTS = {
  Prompt: [[400, 'prompt-400'], [600, 'prompt-600']], Chonburi: [[400, 'chonburi-400']], Sriracha: [[400, 'sriracha-400']],
}
const SUBSET = {
  thai: 'U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC',
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
}
function faces(names) {
  let s = ''
  for (const n of names) for (const [w, f] of FONTS[n]) for (const sub of ['thai', 'latin'])
    s += `@font-face{font-family:"${n}";font-weight:${w};font-display:swap;src:url(/s/fonts/${f}-${sub}.woff2) format("woff2");unicode-range:${SUBSET[sub]}}`
  return s
}

const BASE_CSS = `*{box-sizing:border-box}[hidden]{display:none!important}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:400 18px/1.6 var(--body);overflow-x:hidden}
img{max-width:100%;display:block}a{color:inherit}.i{width:22px;height:22px;flex:none;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.wrap{max-width:760px;margin:0 auto;padding:0 16px}
.dings{display:flex;gap:.35em;margin:14px 0 0;font-size:clamp(30px,8vw,46px);line-height:1}
.badge{display:inline-flex;align-items:center;gap:6px;margin-top:16px;padding:6px 14px;border-radius:99px;font:600 15px/1.2 var(--body);background:#3d3d3d;color:#fff}
.badge.open{background:#0b8043}.badge .dot{width:9px;height:9px;border-radius:50%;background:currentColor}.badge.open .dot{animation:pulse 1.6s ease-in-out infinite}
@keyframes pulse{50%{opacity:.35;transform:scale(.7)}}
.reach{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:22px auto 0}
.btn{display:flex;align-items:center;justify-content:center;gap:9px;min-height:56px;padding:10px 16px;border-radius:var(--r);border:0;font:700 17px/1.2 var(--body);text-decoration:none;cursor:pointer;background:var(--accent);color:var(--on-accent);transition:transform .15s}
.btn.give{background:linear-gradient(100deg,#c8901f,#f8dd8e 45%,#e2b04a);color:#111}
.btn:active{transform:scale(.97)}
.btn.line{background:#06c755;color:#000}.btn.ota-agoda{background:#fff;color:#1a1a1a;box-shadow:inset 0 0 0 2px #1a1a1a}.btn.ota-booking{background:#003580;color:#fff}.btn.grab{background:#00b14f;color:#000}.btn.dark{background:var(--ink);color:var(--card)}
.btn.ghost{background:transparent;color:inherit;box-shadow:inset 0 0 0 2px currentColor}.btn small{font-weight:400;opacity:.85}
.card{margin:26px 0;padding:24px 22px;border-radius:var(--r);background:var(--card);color:var(--ink)}
.card h2{display:flex;align-items:center;gap:.4em;margin:0 0 14px;font:700 14px/1.2 var(--body);letter-spacing:.14em;text-transform:uppercase}
.card h2 [data-dingbat]{font-size:1.5em;letter-spacing:0;flex:none}
.card p{margin:0 0 12px}.card p:last-child{margin:0}
.menu{list-style:none;margin:0;padding:0}.menu li{display:flex;gap:12px;align-items:baseline;padding:11px 0;border-bottom:1px dashed var(--line)}
.menu li:last-child{border:0}.menu .n{flex:1;font-weight:600}.menu .n small{display:block;font-weight:400;color:var(--mute);font-size:15px}.menu .p{font-weight:700;white-space:nowrap}
.hours{width:100%;border-collapse:collapse}.hours td{padding:7px 0;border-bottom:1px dashed var(--line)}.hours td+td{text-align:right}.hours tr.today td{font-weight:700;color:var(--acc-ink)}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.gallery figure{margin:0;position:relative}.gallery button{display:block;width:100%;padding:0;border:0;background:var(--line);border-radius:calc(var(--r)/2);overflow:hidden;aspect-ratio:1;cursor:zoom-in}
.gallery img{width:100%;height:100%;object-fit:cover;transition:transform .4s}.gallery button:hover img{transform:scale(1.06)}
.gallery figcaption,.credit{font-size:11px;line-height:1.3;color:var(--mute);margin-top:4px;overflow-wrap:anywhere}.gallery figcaption a,.credit a{color:inherit}
.drawn{position:relative;margin:26px 0;border-radius:var(--r);overflow:hidden;background:#121330;cursor:pointer;-webkit-tap-highlight-color:transparent}
.drawn canvas{display:block;width:100%;aspect-ratio:2/1}
.drawn figcaption{position:absolute;left:12px;bottom:10px;display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;background:rgba(0,0,0,.45);color:#fff;font:600 13px/1.2 var(--body);pointer-events:none;backdrop-filter:blur(4px)}
.mapcard{padding:0;overflow:hidden}.mapcard>h2,.mapcard>.in{padding:0 22px}.mapcard>h2{padding-top:22px}.mapcard>.in{padding-bottom:22px}
.dmap{position:relative;height:min(62vh,440px);background:#f5ecd7}.dmap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.dmap.full{position:fixed;inset:0;z-index:60;height:auto}
.mapbox{position:relative;display:block;width:100%;padding:0;border:0;overflow:hidden;aspect-ratio:16/10;background:#e8e2d4;cursor:pointer}
.mapbox img,.mapbox>svg:first-child{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.mapbox .pin{position:absolute;left:50%;top:50%;width:46px;height:46px;transform:translate(-50%,-100%);animation:bob 2.6s ease-in-out infinite}
@keyframes bob{50%{transform:translate(-50%,-112%)}}.mapbox .go{position:absolute;right:10px;bottom:10px;display:flex;gap:6px;align-items:center;padding:8px 12px;border-radius:99px;background:#fff;color:#111;font:600 15px/1 var(--body);box-shadow:0 2px 8px rgba(0,0,0,.25)}
.addr{margin:14px 0 0}.tools-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}
.far{margin:10px 0 0;font-weight:600;min-height:1.6em}
.spots{list-style:none;margin:0;padding:0;counter-reset:s}.spots li{display:grid;grid-template-columns:34px 1fr;gap:10px;padding:10px 0;border-bottom:1px dashed var(--line)}
.spots li::before{counter-increment:s;content:counter(s);display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--accent);color:var(--on-accent);font-weight:800;font-size:15px}
.spots b{display:block}.spots small{color:var(--mute);font-size:15px}.spots button,.spots a{border:0;background:none;color:var(--acc-ink);font:600 14px var(--body);padding:4px 0;cursor:pointer;text-decoration:underline}
.qty{display:inline-flex;align-items:center;gap:6px;margin-left:4px}.qty button{width:38px;height:38px;border-radius:50%;border:2px solid currentColor;background:transparent;color:inherit;font:700 20px/1 system-ui;cursor:pointer}
.qty b{min-width:1.4em;text-align:center}.qty.on b{color:var(--acc-ink)}.btn.order{position:sticky;bottom:12px;margin-top:16px;z-index:5;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.top .cta{display:inline-flex;margin-top:18px;min-height:58px;padding:12px 28px;font-size:19px}.top .cta .i{width:24px;height:24px}
.orderrow{display:grid;gap:10px;margin-top:16px}.orderrow .btn.order{position:sticky;bottom:12px}
.pay .amts{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 0}.pay .amt{min-width:84px;min-height:56px;padding:8px 16px;border-radius:calc(var(--r) + 4px);border:2px solid var(--line);background:var(--soft);color:var(--ink);font:800 20px/1.1 var(--body);cursor:pointer}
.pay .amt small{display:block;font:600 12px/1.2 var(--body);color:var(--mute)}.pay .amt.on{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent)}
.pay .amtin{display:flex;align-items:center;gap:6px;flex:1 1 160px;min-height:56px;padding:0 14px;border-radius:calc(var(--r) + 4px);border:2px solid var(--line);background:var(--soft)}
.pay .amtin input{flex:1;min-width:0;border:0;background:none;color:var(--ink);font:700 20px var(--body);outline:0}.pay #paygo{flex:1 1 100%}
.ppout{margin-top:16px;text-align:center}.ppout .qr{width:min(260px,72vw);height:auto;border-radius:14px;background:#fff;padding:8px}.ppout b{display:block;font-size:24px;margin:8px 0 4px}
.lineqr{display:grid;grid-template-columns:150px 1fr;gap:18px;align-items:center}.lineqr .qr{width:150px;height:150px;border-radius:10px}
.links a.btn{margin:0 0 10px}
.contact{display:grid;gap:8px}.contact a{display:flex;align-items:center;gap:12px;min-height:48px;padding:6px 0;text-decoration:none;border-bottom:1px dashed var(--line);overflow-wrap:anywhere}
.when{font:700 24px/1.3 var(--display)}.count{margin-top:8px;color:var(--acc-ink);font-weight:700;font-size:20px}
.video{position:relative;display:block;width:100%;aspect-ratio:16/9;border:0;padding:0;border-radius:calc(var(--r)/1.5);overflow:hidden;background:#000;cursor:pointer}
.video img{width:100%;height:100%;object-fit:cover;opacity:.85}.video .play{position:absolute;left:50%;top:50%;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:grid;place-items:center}
.video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.msgf{display:grid;gap:10px}.msgf input,.msgf textarea{width:100%;min-height:52px;padding:12px 14px;border-radius:calc(var(--r)/1.5 + 4px);border:2px solid var(--line);background:var(--soft);color:var(--ink);font:inherit;outline:0}
.msgf textarea{min-height:120px;resize:vertical}.msgf input:focus,.msgf textarea:focus{border-color:var(--accent)}.msgf .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.msgf .newsopt{display:flex;gap:12px;align-items:flex-start;min-height:52px;padding:6px 0;font-weight:600;cursor:pointer}.msgf .newsopt input{flex:none;width:30px;min-width:30px;height:30px;min-height:30px;margin:0;padding:0;accent-color:var(--accent)}.msgf .newsmail[hidden]{display:none}
.msgf .ok{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;color:var(--acc-ink)}
.foot{text-align:center;padding:30px 16px 120px;font-size:15px;color:var(--mute)}
.share{max-width:560px;margin:0 auto 26px;padding:22px 18px;border-radius:var(--r);background:var(--card);color:var(--ink)}
.share h2{display:flex;align-items:center;justify-content:center;gap:.4em;margin:0 0 14px;font:700 14px/1.2 var(--body);letter-spacing:.14em;text-transform:uppercase}.share h2 [data-dingbat]{font-size:1.6em}
.share .big{width:100%;min-height:58px;font-size:19px;margin:0 0 12px}
.share .row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.share .row a,.share .row button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:74px;padding:8px 4px;border-radius:calc(var(--r)/1.5 + 4px);border:0;background:var(--soft);color:var(--ink);font:600 13px/1.15 var(--body);text-decoration:none;cursor:pointer}
.share .row svg.b{width:28px;height:28px}
.credits{max-width:560px;margin:0 auto 18px;font-size:12px;line-height:1.5;text-align:left}.credits summary{cursor:pointer;font-weight:700}.credits a{color:inherit}
.foot nav{display:flex;flex-wrap:wrap;gap:6px 18px;justify-content:center;margin:14px 0}
.foot .made{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:99px;background:#d7261e;color:#fff;font-weight:700;text-decoration:none}
.foot .made.small{padding:0;background:none;color:inherit;font-weight:400;text-decoration:underline}
dialog{border:0;border-radius:16px;padding:0;max-width:min(94vw,900px);background:#111;color:#fff}dialog::backdrop{background:rgba(0,0,0,.8)}
dialog img{max-height:84vh;width:auto;margin:auto}dialog .x{position:absolute;right:8px;top:8px;width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:#000;font:700 22px/1 system-ui;cursor:pointer}
dialog .cap{padding:8px 14px 12px;font-size:13px;color:#ccc}dialog .cap a{color:#fff}
dialog.form{background:var(--card);color:var(--ink);padding:22px;width:min(94vw,440px)}dialog.form textarea{width:100%;min-height:110px;font:inherit;padding:10px;border-radius:10px;border:2px solid var(--line)}
dialog.qrd{background:#fff;color:#000;padding:26px;text-align:center;width:min(92vw,400px)}dialog.qrd .qr{width:100%;height:auto;border-radius:12px}dialog.qrd p{font:700 16px ui-monospace,Menlo,monospace;overflow-wrap:anywhere}
.mapfull{position:fixed;inset:0;z-index:50;background:#e8e2d4}.mapfull .x{position:absolute;right:12px;top:12px;z-index:5;width:48px;height:48px;border-radius:50%;border:0;background:#fff;color:#000;font:700 24px/1 system-ui;box-shadow:0 2px 10px rgba(0,0,0,.3)}
.checking{padding:40px 22px;text-align:center}
.rise{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.8,.2,1)}.rise.in{opacity:1;transform:none}
.drawn .pen{position:absolute;left:0;top:0;width:36px;height:36px;z-index:2;pointer-events:none;filter:drop-shadow(0 3px 3px rgba(0,0,0,.45));transition:opacity .5s}
.camp{position:relative;margin:22px 0;border-radius:calc(var(--r) + 6px);background:var(--accent);color:var(--on-accent);overflow:hidden;box-shadow:0 12px 34px rgba(0,0,0,.2)}
.camp::before{content:"";position:absolute;inset:0 -60px;background:repeating-linear-gradient(135deg,rgba(255,255,255,.16) 0 14px,transparent 14px 28px);animation:slide 3.5s linear infinite}
@keyframes slide{to{transform:translateX(39.6px)}}
.camp::after{content:"";position:absolute;top:50%;left:-12px;right:-12px;height:24px;margin-top:-12px;background:radial-gradient(circle at 12px 12px,var(--bg) 11px,transparent 12px) left/100% 100% no-repeat,radial-gradient(circle at calc(100% - 12px) 12px,var(--bg) 11px,transparent 12px) right/100% 100% no-repeat;pointer-events:none}
.campin{position:relative;z-index:1;display:flex;gap:14px;align-items:center;padding:20px 26px}.campin>[data-dingbat]{font-size:46px;flex:none}
.campt{flex:1}.campt b{display:block;font:800 23px/1.15 var(--display);text-transform:var(--case)}.campt p{margin:4px 0 0}.campt .cnt{font-weight:700;font-size:15px;opacity:.92}
.code{flex:none;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 12px;border:2px dashed currentColor;border-radius:10px;background:rgba(255,255,255,.18);color:inherit;font:800 19px/1.1 ui-monospace,Menlo,monospace;letter-spacing:.06em;cursor:pointer}.code small{font:700 10px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;opacity:.85}
.calz{list-style:none;margin:0;padding:0}.calz li{display:grid;grid-template-columns:58px 1fr 44px;gap:14px;align-items:center;padding:12px 0;border-bottom:1px dashed var(--line)}.calz li:last-child{border:0}
.calz .dt{display:flex;flex-direction:column;align-items:center;justify-content:center;height:62px;border-radius:12px;background:var(--accent);color:var(--on-accent);line-height:1}.calz .dt b{font:800 26px/1 var(--display)}.calz .dt span{margin-top:3px;font:800 11px/1.2 var(--body);letter-spacing:.08em;text-transform:uppercase}
.calz small{display:block;color:var(--mute);font-size:15px}.calz em{color:#0b8043;font-style:normal;font-weight:800}.calz p{margin:4px 0 0;font-size:16px}.calz li.now .dt{animation:pulse 1.6s ease-in-out infinite}
.calz .add{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;box-shadow:inset 0 0 0 2px var(--line);color:var(--acc-ink)}
.svc{list-style:none;margin:0;padding:0;display:grid;gap:8px}.svcb{width:100%;display:flex;gap:12px;align-items:center;text-align:left;padding:14px 16px;border-radius:calc(var(--r) + 4px);border:2px solid var(--line);background:var(--soft);color:var(--ink);font:inherit;cursor:pointer;transition:border-color .2s,transform .15s}.svcb:active{transform:scale(.98)}
.svcb .n{flex:1;font-weight:700}.svcb small{display:block;font-weight:400;color:var(--mute);font-size:15px}.svcb .p{font-weight:800;color:var(--acc-ink);white-space:nowrap}.svcb.on{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent)}
.bookui{margin-top:16px}.days{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 10px;scroll-snap-type:x mandatory;scrollbar-width:none}.days::-webkit-scrollbar{display:none}
.days button{flex:none;scroll-snap-align:start;width:64px;padding:8px 0;border-radius:12px;border:2px solid var(--line);background:var(--soft);color:var(--ink);font:600 12px/1.2 var(--body);text-transform:uppercase;cursor:pointer}.days button b{display:block;font:800 22px/1.15 var(--display)}.days button.on{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
.times{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;margin:6px 0 14px;min-height:46px}.times button{min-height:48px;border-radius:10px;border:2px solid var(--line);background:var(--card);color:var(--ink);font:700 16px var(--body);cursor:pointer}.times button small{display:block;font-weight:400;font-size:11px;color:var(--mute)}.times button.on{background:var(--ink);color:var(--card);border-color:var(--ink)}.times button.on small{color:inherit;opacity:.8}.times p{grid-column:1/-1;color:var(--mute);margin:0}
.pp{text-align:center}.pp .qr{width:min(240px,70vw);height:auto;margin:10px auto;border-radius:12px}.pp b{display:block;font-size:20px}
.rooms{display:grid;gap:18px}.room{border-radius:calc(var(--r) + 4px);overflow:hidden;background:var(--soft);box-shadow:inset 0 0 0 1px var(--line)}
.room .strip{display:flex;gap:2px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.room .strip::-webkit-scrollbar{display:none}.room .strip button{flex:0 0 86%;aspect-ratio:4/3;padding:0;border:0;scroll-snap-align:start;background:var(--line);cursor:zoom-in}.room .strip button:only-child{flex-basis:100%}.room .strip img{width:100%;height:100%;object-fit:cover}
.rin{padding:16px 18px}.rin h3{margin:0 0 4px;font:700 23px/1.2 var(--display)}.rin .facts{display:flex;gap:6px;align-items:center;margin:0 0 8px;color:var(--mute)}.rin .night{font:800 21px/1.2 var(--body);color:var(--acc-ink)}
.mcal{margin:14px 0}.mcal .mh{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-weight:800}.mcal .mh button{width:42px;height:42px;border-radius:50%;border:2px solid var(--line);background:var(--card);color:var(--ink);font:700 18px system-ui;cursor:pointer}
.mcal .g{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.mcal .g span{padding:4px 0;text-align:center;font:700 11px var(--body);color:var(--mute)}.mcal .g button{aspect-ratio:1;border:0;border-radius:8px;background:var(--card);color:var(--ink);font:600 15px var(--body);cursor:pointer}
.mcal .g button{display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05}.mcal .g button small{font-size:9px;font-weight:700;opacity:.75;margin-top:2px}.mcal .g button.few small{color:#c2410c;opacity:1}
.mcal .g button:disabled{opacity:.32;cursor:default}#rooms>.facts{display:flex;gap:6px;align-items:center;color:var(--mute);margin:-4px 0 12px}.rin .night small{font-size:15px;color:var(--mute);font-weight:600}.mcal .g button.tk{text-decoration:line-through}.mcal .g button.in{background:var(--line)}.mcal .g button.end{background:var(--accent);color:var(--on-accent)}.rsum{margin:8px 0 12px;font-weight:700}
.lfilter{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}.lfilter button{padding:8px 15px;border-radius:99px;border:2px solid var(--line);background:var(--soft);color:var(--ink);font:700 15px var(--body);cursor:pointer}.lfilter button.on{background:var(--ink);color:var(--card);border-color:var(--ink)}
.lgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px}
.top .av{display:block;width:104px;height:104px;margin:0 0 14px;object-fit:cover;filter:drop-shadow(0 6px 14px rgba(0,0,0,.18))}.top .av.round{border-radius:50%;border:4px solid var(--card)}.top.gilt .av.round{border-color:#e9b43b}
.wgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}.wcard{display:flex;flex-direction:column;gap:2px;color:var(--ink);text-decoration:none}
.wcard figure{position:relative;margin:0 0 8px;aspect-ratio:4/3;border-radius:calc(var(--r) + 2px);overflow:hidden;background:var(--line)}.wcard img{width:100%;height:100%;object-fit:cover;transition:transform .6s}.wcard:hover img{transform:scale(1.05)}
.wcard .noimg{display:grid;place-items:center;height:100%;font-size:72px;background:repeating-linear-gradient(45deg,var(--line) 0 12px,var(--bg) 12px 24px)}.wcard .n{position:absolute;right:8px;bottom:8px;padding:2px 9px;border-radius:99px;background:rgba(0,0,0,.66);color:#fff;font:700 12px/1.5 var(--body)}
.wcard b{font:800 19px/1.25 var(--display)}.wcard small{color:var(--mute);font-size:14px}
.wshots{display:grid;gap:12px}.wshots button{display:block;padding:0;border:0;background:none;cursor:zoom-in}.wshots img{display:block;width:100%;height:auto;border-radius:calc(var(--r)/2)}
.wtags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0}.wtags a{padding:4px 12px;border-radius:99px;background:var(--soft);color:var(--ink);font:700 14px var(--body);text-decoration:none}
.news time{display:block;margin:0 0 4px;color:var(--mute);font:700 14px/1.4 var(--body)}.news .n1 p{margin:0 0 8px;font:500 20px/1.5 var(--body)}.nold{list-style:none;margin:14px 0 0;padding:14px 0 0;border-top:2px solid var(--line);display:grid;gap:12px}.nold li p{margin:0;font:500 16px/1.5 var(--body)}.nold time{margin:0}
.quotes figure{margin:0 0 18px;padding:0 0 0 18px;border-left:4px solid var(--accent)}.quotes blockquote{margin:0;font:500 19px/1.5 var(--body)}.quotes blockquote p{margin:0 0 6px}.quotes figcaption{color:var(--mute);font-weight:700}.lcard{display:flex;flex-direction:column;gap:3px;color:var(--ink);text-decoration:none}
.lcard figure{position:relative;margin:0 0 6px;aspect-ratio:4/3;border-radius:calc(var(--r) + 2px);overflow:hidden;background:var(--line)}.lcard img{width:100%;height:100%;object-fit:cover;transition:transform .5s}.lcard:hover img{transform:scale(1.05)}.lcard .noimg{display:grid;place-items:center;height:100%;font-size:72px;background:repeating-linear-gradient(45deg,var(--line) 0 12px,var(--bg) 12px 24px)}
.lcard .deal,.lhead .deal{position:absolute;left:8px;top:8px;padding:3px 10px;border-radius:99px;background:var(--accent);color:var(--on-accent);font:800 12px/1.4 var(--body);letter-spacing:.06em;text-transform:uppercase}.lhead .deal{position:static}
.lcard .st{position:absolute;right:8px;top:8px;padding:3px 10px;border-radius:99px;background:#111;color:#fff;font:800 12px/1.4 var(--body);text-transform:uppercase}.lcard.gone figure{filter:grayscale(.75)}.lcard .pr{font:800 19px/1.2 var(--body);color:var(--acc-ink)}.lcard small{color:var(--mute);font-size:14px}
.lhead{display:flex;gap:8px;margin:0 0 6px}.lhead .st{padding:3px 10px;border-radius:99px;background:#0b8043;color:#fff;font:800 12px/1.4 var(--body);text-transform:uppercase}.lhead .st-sold,.lhead .st-rented{background:#111}.lhead .st-reserved{background:#b45309}
.lprice{margin:6px 0 12px;font:800 clamp(28px,7vw,40px)/1.1 var(--display);color:var(--acc-ink)}.lfacts dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:0}.lfacts dl div{padding:10px 12px;border-radius:12px;background:var(--soft)}.lfacts dt{font-size:13px;color:var(--mute)}.lfacts dd{margin:0;font-size:20px;font-weight:800}
.foot .mt{font-size:12px;opacity:.8}
.readin{position:fixed;left:50%;bottom:16px;z-index:40;display:flex;align-items:center;gap:8px;padding:10px 12px 10px 18px;border-radius:99px;background:var(--ink);color:var(--card);font:700 15px/1.2 var(--body);text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.3);transform:translateX(-50%);animation:up .5s cubic-bezier(.2,.8,.2,1);white-space:nowrap}
@keyframes up{from{opacity:0;transform:translate(-50%,40px)}}
@media (max-width:560px){.campin{flex-wrap:wrap;padding:18px 22px}.campin>[data-dingbat]{font-size:34px}.campt{flex:1 1 calc(100% - 52px)}.code{width:100%;flex-direction:row;justify-content:center;gap:12px}}.readin button{padding:0 4px;border:0;background:none;color:inherit;font:700 20px/1 system-ui;cursor:pointer}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.rise{opacity:1;transform:none}}
@media (min-width:760px){.drawn{margin:30px -40px}}
@media print{.reach,.foot,.tshare,.tlang,.tools-row,.msgcard,.dmap{display:none}body{background:#fff;color:#000}}`

const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6]
const OSM_DAY = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function dayName(lang, i) {
  const ref = new Date(Date.UTC(2024, 0, 1 + i)) // 1 Jan 2024 was a Monday
  try { return new Intl.DateTimeFormat(lang, { weekday: 'long', timeZone: 'UTC' }).format(ref) } catch { return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] }
}

function relDay(lang, n) {
  try { return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(n, 'day') } catch { return '' }
}

/** The hours in OpenStreetMap's opening_hours shape, which the doodler reads. */
export function osmHours(h) {
  if (!h || !h.on) return ''
  if (h.always) return '24/7'
  return h.week.map((r, i) => (r ? `${OSM_DAY[i]} ${r.map(([a, b]) => `${a}-${b}`).join(',')}` : `${OSM_DAY[i]} off`)).join('; ')
}

export function badge(lang, st) {
  if (!st) return ''
  if (st.always) return `<span class="badge open"><span class="dot"></span>${esc(word(lang, 'open24'))}</span>`
  if (st.open) return `<span class="badge open"><span class="dot"></span>${esc(word(lang, 'openNow'))}${st.at ? ' · ' + esc(word(lang, 'closesAt', { t: st.at })) : ''}</span>`
  const t = st.at ? (st.day > 0 ? (st.day === 1 ? '' : dayName(lang, st.dayIx) + ' ') + st.at : st.at) : ''
  const tomorrow = st.day === 1 ? relDay(lang, 1) + ' ' : ''
  return `<span class="badge"><span class="dot"></span>${esc(word(lang, 'closedNow'))}${t ? ' · ' + esc(word(lang, 'opensAt', { t: tomorrow + t })) : ''}</span>`
}

function price(p, cur) {
  if (!p) return ''
  return /^[\d.,\s–-]+$/.test(p) ? (CURRENCY[cur] || '') + p : p
}

/** A library title read as words: no camera file number in front ("DFC 4431 …", "IMG_2041 …"), no underscores. */
export function tidyTitle(t) {
  const s = String(t || '').replace(/_/g, ' ').replace(/^(?:dfc|dsc[fn]?|img|pxl|dji|gopr|mvimg|p|_?mg)\s*[-_ ]?\d{3,}[a-z]?\b[\s\-–—.,:]*/i, '').replace(/\s{2,}/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : String(t || '')
}

/** "Title — Creator · Public domain", linked to its source. */
function creditLine(c) {
  if (!c) return ''
  const t = esc(tidyTitle(c.title))
  return `${c.src ? `<a href="${esc(c.src)}" rel="nofollow noopener">${t}</a>` : t}${c.by ? ' — ' + esc(c.by) : ''} · ${c.licenseUrl ? `<a href="${esc(c.licenseUrl)}" rel="nofollow noopener">${esc(c.license)}</a>` : esc(c.license)}`
}

const ding = (name, look, play = 'loop') => (DINGBATS[name] ? `<i data-dingbat="${name}" data-look="${look}" data-play="${play}" aria-hidden="true"></i>` : '')

// little brand marks for the share row (single-colour, drawn here)
const BRAND = {
  line: '<svg class="b" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="6" fill="#06c755"/><path d="M12 5.5c-4.2 0-7.5 2.7-7.5 6 0 3 2.6 5.4 6.1 5.9.4.1.6.4.5.8l-.2 1.2c0 .3.3.6.6.4 2-1.1 7.9-4.4 7.9-8.3 0-3.3-3.3-6-7.4-6z" fill="#fff"/></svg>',
  fb: '<svg class="b" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1877f2"/><path d="M13.3 19.5v-6h2l.3-2.4h-2.3V9.6c0-.7.2-1.2 1.2-1.2h1.2V6.3c-.2 0-1-.1-1.8-.1-1.8 0-3.1 1.1-3.1 3.1v1.8H8.8v2.4h2v6z" fill="#fff"/></svg>',
  x: '<svg class="b" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="6" fill="#111"/><path d="M6.5 6h3.2l2.9 4 3.4-4h1.5l-4.2 5 4.7 7h-3.2l-3.1-4.4L8 18H6.5l4.6-5.4z" fill="#fff"/></svg>',
  wa: '<svg class="b" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#25d366"/><path d="M12 5.8a6.2 6.2 0 0 0-5.3 9.4l-.8 3 3.1-.8A6.2 6.2 0 1 0 12 5.8zm3.3 8.6c-.1.4-.8.8-1.2.8-.3 0-.7.1-2.2-.5-1.8-.8-3-2.6-3.1-2.8-.1-.1-.7-1-.7-1.9s.5-1.4.7-1.6c.2-.2.4-.2.5-.2h.4c.1 0 .3 0 .4.3l.6 1.4c0 .1.1.2 0 .4l-.3.4c-.1.1-.2.2-.1.4.1.2.6 1 1.3 1.6.9.8 1.6 1 1.8 1.1.2.1.3.1.4-.1l.6-.7c.1-.2.3-.1.4-.1l1.3.6c.2.1.3.2.3.2v.9z" fill="#fff"/></svg>',
  tg: '<svg class="b" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#2aabee"/><path d="M5.6 11.6l11.2-4.4c.5-.2 1 .1.8.9l-1.9 9c-.1.6-.5.8-1 .5l-2.9-2.1-1.4 1.3c-.2.2-.3.3-.6.3l.2-3 5.4-4.9c.2-.2 0-.3-.3-.1l-6.7 4.2-2.9-.9c-.6-.2-.6-.6.1-.8z" fill="#fff"/></svg>',
  mail: '<svg class="b" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="6" fill="#ea4335"/><path d="M5.5 8h13v8.5h-13z" fill="#fff"/><path d="M5.5 8l6.5 5 6.5-5" fill="none" stroke="#ea4335" stroke-width="1.6"/></svg>',
  qr: '<svg class="b" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="6" fill="#111"/><path d="M6 6h5v5H6zM13 6h5v5h-5zM6 13h5v5H6zM14 14h2v2h-2zM16 16h2v2h-2zM13 17h1.5v1.5H13zM17 13h1v1h-1z" fill="#fff"/></svg>',
  story: '<svg class="b" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset=".5" stop-color="#d62976"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient></defs><rect x="1" y="1" width="22" height="22" rx="6" fill="url(#sg)"/><rect x="8" y="5" width="8" height="14" rx="2" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="12" r="2" fill="#fff"/></svg>',
  copy: '<svg class="b" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="6" fill="#5a4f6a"/><path d="M10 14l4-4M9 11l-1.4 1.4a2.6 2.6 0 0 0 3.7 3.7L12.7 15M15 13l1.4-1.4a2.6 2.6 0 0 0-3.7-3.7L11.3 9" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/></svg>',
}

/** The whole page. site = { name, look, lang, kind, d, views, status, tier }.
 *  opt = { origin, img(id, small?) → url, preview, nonce, now, gold } */
/**
 * On Google and other search engines: a live Gold page; a live free page once it has a way to reach the
 * maker (a phone, LINE or a pin on the map) and no reports (Nan 2026-10-26: "Free pages should be on google").
 */
export function findable(site, d, gold = site.tier === 'gold') {
  if (site.status !== 'live') return false
  if (gold) return true
  if (Number(site.reports) > 0) return false
  const c = d?.contact || {}
  return !!(String(c.phone || '').trim() || String(c.line || '').trim() || (d?.place && Number.isFinite(d.place.lat) && Number.isFinite(d.place.lng) && d.place.lat !== null))
}

export function render(site, opt = {}) {
  const d = normalize(site.d)
  const lang = PAGE_LANGS[site.lang] ? site.lang : 'en'
  const gold = opt.gold ?? site.tier === 'gold'
  const hotel = gold && (opt.hotel ?? !!site.hotel) // direct room bookings: the hotel month or the first 30 days
  const wantLook = lookOf(site.look)
  // a free page wears its own kind's looks; Gold, a preview and the builder any look (kinds.mjs)
  const lookId = LOOKS[wantLook] && (opt.preview || lookOk(site.kind, wantLook, gold)) ? wantLook : freeLooks(site.kind)[0]
  const look = LOOKS[lookId]
  const accent = d.accent || look.accent
  const dl = DING_LOOK[lookId] || 'ink'
  // a group's page (a club, a school, a program) names its parts as a group's, not a business's
  const GW = site.kind === 'group' ? { works: 'g_works', quotes: 'g_quotes', w_client: 'g_client', w_more: 'g_more', w_all: 'g_all', w_ask: 'g_ask', spots: 'g_spots' } : {}
  const W = (k, v) => esc(word(lang, GW[k] || k, v))
  const img = opt.img || ((id, small) => `/img/${id}${small ? '-s' : ''}.webp`)
  const origin = opt.origin || HOME
  const url = opt.base || `${origin}/${site.name}`
  const name = d.name || site.name
  const cur = d.currency || currencyFor(d.place.cc, lang)
  const st = openState(d.hours, opt.now)
  const pl = d.place
  const hasPin = pl.lat !== null
  const c = d.contact
  const line = lineHref(c.line)
  const grabOk = hasPin && (GRAB_CC[pl.cc] || (!pl.cc && lang === 'th'))
  const photos = d.photos.slice(0, photoMax(site.kind, gold))
  const H2 = (k, label) => `<h2>${ding(HEAD_DING[k], dl)}${label}</h2>`
  const out = []
  const L = gold && opt.listing ? d.lists.find((x) => x.id === opt.listing) || null : null
  const Wk = !L && opt.work ? d.works.find((x) => x.id === opt.work) || null : null
  const sianOn = gold && !!site.sian
  const ams = d.amulets.slice(0, amCap(gold, sianOn))
  const Am = !L && !Wk && opt.amulet ? ams.find((x) => x.id === opt.amulet) || null : null
  // the online shop: the products a page lists, one product's page, the downloads (Gold), and whether a buyer can pay (store.mjs)
  const prs = d.products.slice(0, prCap(gold))
  const Pr = !L && !Wk && !Am && opt.product ? prs.find((x) => x.id === opt.product) || null : null
  const dls = gold ? d.dls : []
  const shopOn = !!(d.pay.pp && (prs.some((x) => forSale(x, gold)) || dls.some((x) => dlForSale(x, gold))))
  const tz = d.hours.tz
  const sym = CURRENCY[cur] || ''
  const now = opt.now ? +opt.now : Date.now()
  const title = L ? `${L.t} · ${name}` : Wk ? `${Wk.t} · ${name}` : Am ? `${Am.t} · ${name}` : Pr ? `${Pr.t} · ${name}` : name
  const pageUrl = L ? `${url}/l/${L.id}` : Wk ? `${url}/w/${Wk.id}` : Am ? `${url}/a/${Am.id}` : Pr ? `${url}/p/${Pr.id}` : url
  const langs = (opt.langs || []).filter((l) => PAGE_LANGS[l])
  const home = opt.home || site.lang

  // head
  const desc = (L && L.note.slice(0, 160)) || (Wk && (Wk.note.slice(0, 160) || [Wk.client, Wk.year].filter(Boolean).join(' · '))) || (Am && amuletDesc(Am, lang)) || (Pr && productDesc(Pr, lang, '฿')) || d.tagline || d.about.slice(0, 160) || name
  // each page and item page its own 1200×630 card: the drawn one, else /card/… (og.mjs)
  const X = L || Wk || Am || Pr
  const og = ogOf(site, d, L ? 'l' : Wk ? 'w' : Am ? 'a' : Pr ? 'p' : '', X)
  const card = Wk && Wk.card ? `${origin}/img/${Wk.card}.jpg` : `${origin}/card/${og.path}.jpg?k=${og.key}`
  const cardAlt = X ? `${X.t} · ${name}` : d.tagline ? `${name} · ${d.tagline}` : name
  out.push(`<!doctype html><html lang="${lang}" data-look="${lookId}" translate="no" class="notranslate"><head><meta charset="utf-8"><meta name="google" content="notranslate">`,
    opt.nonce ? `<script nonce="${opt.nonce}">if(/[.]translate[.]goog$/.test(location.hostname))location.replace("https://"+location.hostname.slice(0,-15).replace(/--/g,"~").replace(/-/g,".").replace(/~/g,"-")+location.pathname+location.search.replace(/([?&])_x_tr_[^&]*/g,"$1").replace(/[?&]+$/,"").replace(/[?]&+/,"?")+location.hash)</script>` : '',
    `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`,
    `<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">`,
    `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(pageUrl)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Mot Dang">`,
    `<meta property="og:image" content="${esc(card)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:alt" content="${esc(cardAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(card)}"><meta name="twitter:image:alt" content="${esc(cardAlt)}">`,
    `<meta name="robots" content="${findable(site, d, gold) ? 'index,follow,notranslate' : 'noindex,notranslate'}"><link rel="canonical" href="${esc(opt.hl ? pageUrl + '?hl=' + opt.hl : pageUrl)}">`,
    langs.length > 1 && gold && site.status === 'live' ? langs.map((l) => `<link rel="alternate" hreflang="${l}" href="${esc(l === home ? pageUrl : pageUrl + '?hl=' + l)}">`).join('') : '',
    gold && site.status === 'live' && !opt.preview ? `<script type="application/ld+json">${(Am ? JSON.stringify(amuletLd(Am, pageUrl, card, cur)) : Pr ? JSON.stringify(productLd(Pr, pageUrl, card, 'THB', gold)) : ldJson(site, d, name, pageUrl, card, L, sym)).replace(/</g, '\\u003c')}</script>` : '',
    `<meta name="theme-color" content="${/--bg:(#[0-9a-f]+)/i.exec(look.vars)?.[1] || '#ffffff'}">`,
    `<link rel="icon" href="${d.avatar ? esc(img(d.avatar, true)) : '/s/ant.svg'}">`,
    `<style>${faces(look.fonts)}:root{${look.vars};--accent:${accent};--on-accent:${onColor(accent)};--acc-ink:${accInk(look, accent)};--soft:color-mix(in srgb,var(--ink) 6%,var(--card))}${BASE_CSS}${HERO_CSS}${ams.length ? AM_CSS : ''}${prs.length || dls.length ? SHOP_CSS : ''}${look.css}</style></head><body>`)

  if (site.status === 'held' && !opt.preview) {
    out.push(`<main class="wrap"><section class="card checking"><h1 style="font:700 28px var(--display)">${esc(name)}</h1><p>${W('checking')}</p></section></main>`,
      foot(site, d, lang, url, opt, true, gold, dl), '</body></html>')
    return out.join('')
  }

  // top: each look lays it out its own way (looks.mjs); the photo box holds still while the page slides over it
  const cov = L ? L.photos[0] || '' : Wk ? Wk.photos[0] || '' : d.cover
  const deco = look.deco ? look.deco({ gold, open: !!(st && (st.open || st.always)) }) : {}
  const h1 = L ? L.t : Wk ? Wk.t : Am ? Am.t : Pr ? Pr.t : name
  out.push(`<header class="top${cov ? ' has-cover' : ''}${gold ? ' gilt' : ''}">`, deco.back || '')
  if (cov) out.push(`<div class="pf"><div class="ph"><img src="${esc(img(cov))}" alt="" fetchpriority="high"${cov === d.cover && d.coverPos ? ` style="object-position:${d.coverPos[0] * 100}% ${d.coverPos[1] * 100}%;--fy:${d.coverPos[1]}"` : ''}>${deco.ph || ''}</div>${deco.frame || ''}${d.credits[cov] ? `<p class="cr">${creditLine(d.credits[cov])}</p>` : ''}</div>`)
  out.push(deco.front || '', '<div class="t">')
  const kick = !L && !Wk && !Am && !Pr ? kicker(d) : ''
  if (kick) out.push(`<p class="kick">${esc(kick)}</p>`)
  if (d.avatar && !L && !Wk && !Am && !Pr) out.push(`<img class="av${d.avround ? ' round' : ''}" src="${esc(img(d.avatar, true))}" alt="" width="104" height="104">`)
  out.push(`<h1 style="--lw:${longestWord(h1)}"${/[\u0E00-\u0E7F]/.test(h1) ? ' class="th"' : ''}>${wordsOf(h1)}</h1><span class="bar"></span>`)
  if (L) out.push(`<p class="tag"><a href="/${esc(site.name)}#lists">${esc(name)}</a></p>`)
  else if (Wk) out.push(`<p class="tag"><a href="/${esc(site.name)}#works">${esc(name)}</a></p>`)
  else if (Am) out.push(`<p class="tag"><a href="/${esc(site.name)}#amulets">${esc(name)}</a></p>`)
  else if (Pr) out.push(`<p class="tag"><a href="/${esc(site.name)}#shop">${esc(name)}</a></p>`)
  else if (d.tagline) out.push(`<p class="tag">${esc(d.tagline)}</p>`)
  if (d.dings.length) out.push(`<p class="dings">${d.dings.map((n) => ding(n, dl)).join('')}</p>`)
  out.push(`<span id="st">${badge(lang, st)}</span>`)
  const cta = !L && !Wk ? leadButton(site, d, gold, line) : null
  if (cta) out.push(`<a class="btn cta${cta[1] === 'give' ? ' give' : ''}" data-t="${cta[1] === 'give' ? 'give' : 'cta'}" href="${esc(cta[0])}"${/^https?:/.test(cta[0]) ? ' rel="nofollow noopener"' : ''}>${icon(cta[2])}${W(cta[1])}</a>`)
  out.push('</div>')
  out.push(`<button class="tshare" data-t="share" aria-label="${W('share')}" title="${W('share')}">${icon('share')}</button>`)
  if (!opt.thumb && gold && langs.length > 1) {
    const cur = opt.hl || home
    out.push(`<label class="tlang" title="${W('readIn')}">${icon('globe')}<span class="cur">${esc(cur)}</span><select data-t="lang" aria-label="${W('readIn')}">${langs.map((l) => `<option value="${l === home ? '?' : '?hl=' + l}"${l === cur ? ' selected' : ''}>${esc(PAGE_LANGS[l])}</option>`).join('')}</select></label>`)
  }
  if (gold) out.push(`<span class="seal" role="img" aria-label="${W('gold')}" title="${W('gold')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18.5h18l1.2-11-5.7 4.2L12 4.5l-4.5 7.2L1.8 7.5z" fill="currentColor"/></svg></span>`)
  out.push('</header>', deco.under || '')
  // a look picker's tile: the top of the page only, no script (make.js scales it down)
  if (opt.thumb) return out.join('') + '</body></html>'

  out.push('<main class="wrap">')
  if (L) out.push(listingBody(L, { site, d, W, H2, img, sym, gold, opt, name }))
  else if (Wk) out.push(workBody(Wk, { site, d, W, H2, img, gold }))
  else if (Pr) out.push(productBody(Pr, { site, d, lang, esc, H2, img, icon, paras, sym: '฿', ding, gold, pp: shopOn, line, oa: lineOa(c.line), url: pageUrl, list: prs, W, tel: telHref, title: name }))
  else if (Am) out.push(amuletBody(Am, { site, d, lang, esc, H2, img, icon, paras, sym, ding, line, oa: lineOa(c.line), url: pageUrl, list: ams, W, tel: telHref, sian: sianOn }))
  else {

  // reach: the buttons a reader came for
  const reach = []
  if (c.phone) reach.push(`<a class="btn" data-t="call" href="${esc(telHref(c.phone))}">${icon('phone')}${W('call')}</a>`)
  if (line) reach.push(`<a class="btn line" data-t="line" href="${esc(line)}" rel="nofollow noopener">${icon('chat')}${W('line')}</a>`)
  if (hasPin) reach.push(`<a class="btn dark" data-t="dir" href="${esc(dirHref(pl.lat, pl.lng))}" rel="nofollow noopener">${icon('route')}${W('dir')}</a>`)
  if (grabOk) reach.push(`<a class="btn grab" data-t="ride" href="${esc(grabRide(pl.lat, pl.lng, name, pl.cc || 'TH'))}" rel="nofollow noopener">${icon('ride')}${W('ride')}</a>`)
  if (d.order.grabfood) reach.push(`<a class="btn grab" data-t="food" href="${esc(d.order.grabfood)}" rel="nofollow noopener">${icon('food')}${W('food')}</a>`)
  if (d.order.lineman) reach.push(`<a class="btn line" data-t="lineman" href="${esc(d.order.lineman)}" rel="nofollow noopener">${icon('food')}${W('lineman')}</a>`)
  if (gold && d.ota.agoda) reach.push(otaBtn('agoda', d.ota.agoda, W))
  if (gold && d.ota.booking) reach.push(otaBtn('booking', d.ota.booking, W))
  if (gold && d.give && cta?.[1] !== 'give') reach.unshift(giveBtn(d.give, W))
  if (c.whatsapp && !c.phone) reach.push(`<a class="btn" data-t="whatsapp" href="${esc(waHref(c.whatsapp))}" rel="nofollow noopener">${icon('chat')}WhatsApp</a>`)
  if (d.msg && !reach.length) reach.push(`<a class="btn" data-t="msg" href="#message">${icon('mail')}${W('msg')}</a>`)
  if (reach.length) out.push(`<nav class="reach">${reach.join('')}</nav>`)

  // timed campaigns (Gold): only inside their window; the page counts down to the end
  if (gold) for (const { c: k, e } of campsNow(d.camps, tz, now)) {
    let ends
    try { ends = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(new Date(e)) } catch { ends = k.end.replace('T', ' ') }
    out.push(`<section class="camp" data-e="${e}"><div class="campin">${ding('megaphone', 'mono')}<div class="campt"><b>${esc(k.t)}</b>${k.note ? `<p>${esc(k.note)}</p>` : ''}`,
      `<p class="cnt"><span data-left="${e}"></span> · ${W('campEnds', { t: esc(ends) })}</p></div>`,
      k.code ? `<button class="code" data-t="code" data-code="${esc(k.code)}" aria-label="${W('campCopy')}"><small>${W('campCode')}</small>${esc(k.code)}</button>` : '', '</div></section>')
  }

  // News (Edit by LINE, Gold): dated notes the owner sent from LINE; the newest in full, a few older ones below it
  const news = gold && Array.isArray(opt.news) ? opt.news.filter((n) => n && n.at && n.body).slice(0, 5) : []
  if (news.length) {
    const day = (iso) => { try { return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: tz }).format(new Date(iso)) } catch { return String(iso).slice(0, 10) } }
    const item = (n) => `<time datetime="${esc(n.at)}">${esc(day(n.at))}</time>${paras(n.body)}`
    out.push(`<section class="card rise news" id="news">${H2('news', W('news'))}<article class="n1">${item(news[0])}</article>`,
      news.length > 1 ? `<ol class="nold">${news.slice(1).map((n) => `<li>${item(n)}</li>`).join('')}</ol>` : '', '</section>')
  }

  // event
  if (d.event) {
    const s = zonedToUtc(d.event.start, d.event.tz)
    const e = d.event.end ? zonedToUtc(d.event.end, d.event.tz) : s + 3 * 3600e3
    let when
    try { when = new Intl.DateTimeFormat(lang, { dateStyle: 'full', timeStyle: 'short', timeZone: d.event.tz }).format(new Date(s)) } catch { when = d.event.start.replace('T', ' ') }
    out.push(`<section class="card rise">${H2('when', W('when'))}<div class="when">${esc(when)}</div>`,
      `<div class="count" id="count" data-s="${s}" data-e="${e}"></div>`,
      `<div class="tools-row"><a class="btn ghost" data-t="ics" href="/${esc(site.name)}/event.ics">${icon('cal')}${W('addCal')}</a></div></section>`)
  }

  // calendar: the next dates, each to a phone calendar, the whole as a feed
  if (d.cal.length) {
    const seen = new Set()
    const next = upcoming(d.cal, tz, now, 60).filter((x) => !x.item.rep || (!seen.has(x.item.id) && seen.add(x.item.id))).slice(0, 8)
    if (next.length) {
      const fm = (o, ms) => { try { return new Intl.DateTimeFormat(lang, { ...o, timeZone: tz }).format(new Date(ms)) } catch { return '' } }
      out.push(`<section class="card rise" id="cal">${H2('cal', W('cal'))}<ol class="calz">`)
      for (const x of next) {
        const rep = x.item.rep === 'weekly' ? W('calEvery', { d: fm({ weekday: 'long' }, x.start) }) : x.item.rep === 'monthly' ? W('calMonthly') : ''
        const live = x.start <= now && now < x.end
        out.push(`<li${live ? ' class="now"' : ''}><time class="dt" datetime="${new Date(x.start).toISOString()}"><b>${esc(fm({ day: 'numeric' }, x.start))}</b><span>${esc(fm({ month: 'short' }, x.start))}</span></time>`,
          `<div><b>${esc(x.item.t)}</b><small>${esc(fm({ weekday: 'short', hour: '2-digit', minute: '2-digit' }, x.start))}${rep ? ' · ' + rep : ''}${live ? ` · <em>${W('happening')}</em>` : ''}</small>${x.item.note ? `<p>${esc(x.item.note)}</p>` : ''}</div>`,
          `<a class="add" data-t="calone" href="/${esc(site.name)}/calendar.ics?only=${esc(x.item.id)}" aria-label="${W('addCal')}">${icon('cal')}</a></li>`)
      }
      out.push(`</ol><div class="tools-row"><a class="btn ghost" data-t="calfollow" href="webcal://${esc(origin.replace(/^https?:\/\//, ''))}/${esc(site.name)}/calendar.ics">${icon('cal')}${W('calFollow')}</a></div></section>`)
    }
  }

  // the drawing: the auto-doodler draws the place from its own facts, lit by the sun where it stands
  if (d.drawing) {
    const scene = sceneOf(site.kind, d)
    const facts = { id: site.name, name, nameTh: name, nameEn: name, cat: site.kind, sub: [scene], hours: osmHours(d.hours) || undefined, lat: pl.lat ?? undefined, lng: pl.lng ?? undefined, props: d.dprops.length ? d.dprops : undefined, floors: d.floors || undefined }
    out.push(`<figure class="drawn rise" id="drawn"><canvas data-set="${esc(scene)}" data-seed="${d.dseed}" data-time="${d.dtime}" data-p="${esc(JSON.stringify(facts))}" role="img" aria-label="${W('drawnAlt', { n: name })}"></canvas>`,
      `<figcaption>${ding('pencil', 'mono')}${W('drawnTap')}</figcaption></figure>`)
  }

  if (d.about) out.push(`<section class="card rise">${H2('about', W('about'))}${paras(d.about)}</section>`)

  // the online shop: products, each its own page; the downloads of an online business (store.mjs)
  const shopH = { site, d, lang, esc, H2, img, icon, sym: '฿', ding, gold, pp: shopOn, title: name } // a shop's prices are baht: PromptPay pays them
  if (prs.length) out.push(shopSection(prs, shopH))
  if (dls.length) out.push(dlSection(dls, shopH))

  // an amulet seller's amulets, each its own page
  if (ams.length) out.push(amuletSection(ams, { site, lang, esc, H2, img, sym, ding, sian: sianOn }))

  // a portfolio: the work, filtered by tag, each its own page
  const works = d.works.slice(0, gold ? MAX.works : MAX.worksFree)
  if (works.length) {
    const tags = [...new Set(works.flatMap(tagsOf))]
    out.push(`<section class="card rise" id="works">${H2('works', W('works'))}`)
    if (tags.length > 1) out.push(`<div class="lfilter wfilter" role="group"><button class="on" data-tag="">${W('all')}</button>${tags.map((t) => `<button data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>`)
    out.push(`<div class="wgrid">${works.map((x) => workCard(x, { site, img })).join('')}</div></section>`)
  }
  if (d.quotes.length) {
    out.push(`<section class="card rise quotes">${H2('quotes', W('quotes'))}`)
    for (const q of d.quotes) out.push(`<figure><blockquote>${paras(q.q)}</blockquote>${q.who ? `<figcaption>${esc(q.who)}</figcaption>` : ''}</figure>`)
    out.push('</section>')
  }

  if (d.items.length) {
    const oa = lineOa(c.line), pp = !!d.pay.pp
    out.push(`<section class="card rise" id="menu">${H2(site.kind === 'food' ? 'menu' : 'prices', W(site.kind === 'food' ? 'menu' : gold && d.give ? 'giveList' : 'prices'))}<ul class="menu${oa || pp ? ' orderable' : ''}">`)
    d.items.forEach((it, i) => out.push(`<li><span class="n">${esc(it.n)}${it.note ? `<small>${esc(it.note)}</small>` : ''}</span><span class="p">${esc(price(it.p, cur))}</span>` +
      (oa || pp ? `<span class="qty" data-i="${i}" data-n="${esc(it.n)}" data-p="${amountOf(it.p)}"><button aria-label="−">−</button><b>0</b><button aria-label="+">+</button></span>` : '') + '</li>'))
    out.push('</ul>')
    if (oa || pp) out.push('<div class="orderrow">')
    if (oa) out.push(`<a class="btn line order" id="lineorder" data-t="order" data-oa="${esc(oa)}" href="${esc(lineHref(c.line))}" rel="nofollow noopener" hidden>${icon('chat')}${W('lineOrder')} <span></span></a>`)
    if (pp) out.push(`<button class="btn order" id="paytotal" data-t="paytotal" data-sym="${esc(sym)}" data-w="${W('payTotal')}" hidden>${icon('coin')}<span></span></button>`)
    if (oa || pp) out.push('</div>')
    out.push('</section>')
  }

  if (gold && d.svc.length) {
    out.push(`<section class="card rise" id="book">${H2('book', W('book'))}<ul class="svc">`)
    for (const v of d.svc) out.push(`<li><button class="svcb" data-t="book" data-svc="${esc(v.id)}"><span class="n">${esc(v.n)}<small>${W('bookMins', { m: v.mins })}${v.note ? ' · ' + esc(v.note) : ''}</small></span><span class="p">${esc(money(v.p, sym))}</span></button></li>`)
    out.push(`</ul><div class="bookui" id="bookui" hidden></div></section>`)
  }

  if (gold && d.rooms.length) {
    out.push(`<section class="card rise" id="rooms">${H2('rooms', W('rooms'))}<p class="facts">${icon('clock')} ${W('roomIn')} ${esc(d.stay.in)} · ${W('roomOut')} ${esc(d.stay.out)}</p><div class="rooms">`)
    for (const r of d.rooms) {
      out.push(`<article class="room" data-room="${esc(r.id)}" data-p="${esc(r.p)}" data-g="${r.guests}">`,
        r.photos.length ? `<div class="strip">${r.photos.map((p, i) => `<button data-t="photo" data-big="${esc(img(p))}"><img src="${esc(img(p, true))}" alt="" loading="lazy"${i ? '' : ''}></button>`).join('')}</div>` : '',
        `<div class="rin"><h3>${esc(r.n)}</h3><p class="facts">${icon('people')}${W('roomGuests', { n: r.guests })}${r.beds ? ' · ' + esc(r.beds) : ''}</p>`,
        r.note ? `<p>${esc(r.note)}</p>` : '', r.p ? `<p class="night">${W('roomNight', { p: esc(money(r.p, sym)) })}${r.p2 ? ` <small>· ${W('roomWeekend', { p: esc(money(r.p2, sym)) })}</small>` : ''}</p>` : '',
        r.min > 1 ? `<p class="facts">${W('roomMin', { n: r.min })}</p>` : '',
        hotel ? `<button class="btn" data-t="rooms" data-pick="${esc(r.id)}">${icon('cal')}${W('roomSend')}</button><div class="roomui" hidden></div>` : '', '</div></article>')
    }
    out.push('</div>')
    if (!hotel && (d.ota.agoda || d.ota.booking)) out.push(`<div class="tools-row">${d.ota.agoda ? otaBtn('agoda', d.ota.agoda, W) : ''}${d.ota.booking ? otaBtn('booking', d.ota.booking, W) : ''}</div>`)
    out.push('</section>')
  }

  if (gold && d.lists.length) {
    const deals = [...new Set(d.lists.map((x) => x.deal))]
    out.push(`<section class="card rise" id="lists">${H2('lists', W('lists'))}`)
    if (deals.length > 1) out.push(`<div class="lfilter" role="group"><button class="on" data-deal="">${W('all')}</button>${deals.map((k) => `<button data-deal="${k}">${W(k === 'sale' ? 'forSale' : 'forRent')}</button>`).join('')}</div>`)
    out.push('<div class="lgrid">')
    for (const x of d.lists) out.push(listCard(x, { site, W, img, sym }))
    out.push('</div></section>')
  }

  if (d.hours.on) {
    out.push(`<section class="card rise">${H2('hours', W('hours'))}`)
    if (d.hours.always) out.push(`<p><b>${W('open24')}</b></p>`)
    else {
      const today = clockIn(d.hours.tz, opt.now).day
      out.push('<table class="hours">')
      for (const i of DAY_ORDER) {
        const r = d.hours.week[i]
        out.push(`<tr${i === today ? ' class="today"' : ''}><td>${esc(dayName(lang, i))}</td><td>${r ? r.map(([a, b]) => `${a}–${b}`).join(', ') : W('closed')}</td></tr>`)
      }
      out.push('</table>')
    }
    if (d.hours.note) out.push(`<p style="margin-top:12px">${esc(d.hours.note)}</p>`)
    out.push('</section>')
  }

  // on an amulet page the gallery leaves out the amulets' own photos: each is on its amulet already
  const amPh = new Set([...ams.flatMap((a) => a.photos), ...prs.flatMap((a) => a.photos)])
  const gallery = (photos.length === 1 && photos[0] === d.cover ? [] : photos).filter((p) => !amPh.has(p))
  if (gallery.length) {
    out.push(`<section class="card rise">${H2('photos', W('photos'))}<div class="gallery">`)
    for (const p of gallery) {
      const cr = d.credits[p]
      out.push(`<figure><button data-t="photo" data-big="${esc(img(p))}"${cr ? ` data-cap="${esc(creditLine(cr))}"` : ''}><img src="${esc(img(p, true))}" alt="${cr ? esc(tidyTitle(cr.title)) : ''}" loading="lazy"></button>${cr ? `<figcaption>${creditLine(cr)}</figcaption>` : ''}</figure>`)
    }
    out.push('</div></section>')
  }

  if (gold && d.video) out.push(videoBlock(d.video, d.vposter, H2, W, img))

  if (hasPin || pl.addr) {
    out.push(`<section class="card mapcard rise" id="where">${H2('where', W('where'))}`)
    if (hasPin) {
      const marks = d.spots.slice(0, gold ? MAX.spotsGold : MAX.spotsFree)
      const q = new URLSearchParams({ pin: `${pl.lat},${pl.lng}`, pn: name, embed: '1', look: d.map.style, s: String(MAP_NEAR[d.map.near]) })
      out.push(`<div class="dmap" id="dmap" data-marks="${esc(JSON.stringify(marks))}"><iframe src="/map?${esc(q.toString())}" title="${W('mapOpen')}" loading="lazy" allow="geolocation"></iframe></div>`)
    }
    out.push('<div class="in">')
    if (pl.addr) out.push(`<p class="addr">${esc(pl.addr)}</p>`)
    if (hasPin) {
      out.push('<div class="tools-row">',
        `<a class="btn dark" data-t="dir" href="${esc(dirHref(pl.lat, pl.lng))}" rel="nofollow noopener">${icon('route')}Google Maps</a>`,
        `<a class="btn ghost" data-t="dir" href="${esc(appleHref(pl.lat, pl.lng, name))}" rel="nofollow noopener">${icon('map')}Apple Maps</a>`,
        grabOk ? `<a class="btn grab" data-t="ride" href="${esc(grabRide(pl.lat, pl.lng, name, pl.cc || 'TH'))}" rel="nofollow noopener">${icon('ride')}${W('ride')}</a>` : '',
        `<button class="btn ghost" id="far" data-t="far" data-lat="${pl.lat}" data-lng="${pl.lng}">${icon('near')}${W('far')}</button>`,
        '</div><p class="far" id="farout" aria-live="polite"></p>')
    }
    out.push('</div></section>')
  }

  if (d.spots.length) {
    out.push(`<section class="card rise">${H2('spots', W('spots'))}<ol class="spots">`)
    d.spots.slice(0, gold ? MAX.spotsGold : MAX.spotsFree).forEach((x, i) => out.push(`<li><span><b>${esc(x.n)}</b>${x.note ? `<small>${esc(x.note)}</small>` : ''}<br>${hasPin ? `<button data-spot="${i}" data-lat="${x.lat}" data-lng="${x.lng}">${W('spotsMap')}</button>` : `<a data-t="map" href="${esc(dirHref(x.lat, x.lng))}" rel="nofollow noopener">${W('spotsMap')}</a>`}</span></li>`))
    out.push('</ol></section>')
  }

  if (line) {
    out.push(`<section class="card rise">${H2('line', 'LINE')}<div class="lineqr">${qrSvg(line, { dark: '#06c755', light: '#0e1f3d', label: word(lang, 'scanLine') })}`,
      `<div><p>${W('scanLine')}</p><a class="btn line" data-t="line" href="${esc(line)}" rel="nofollow noopener">${icon('chat')}${W('line')}</a></div></div></section>`)
  }

  if (d.links.length) {
    out.push(`<section class="card links rise">${H2('links', W('links'))}`)
    for (const l of d.links) out.push(`<a class="btn ghost" data-t="link" href="${esc(l.u)}" rel="ugc nofollow noopener">${icon('link')}${esc(l.t || hostOf(l.u))}</a>`)
    out.push('</section>')
  }

  const rows = []
  if (c.phone) rows.push(`<a data-t="call" href="${esc(telHref(c.phone))}">${icon('phone')}${esc(c.phone)}</a>`)
  if (c.line) rows.push(line ? `<a data-t="line" href="${esc(line)}" rel="nofollow noopener">${icon('chat')}LINE · ${esc(c.line)}</a>` : `<span>${icon('chat')}LINE · ${esc(c.line)}</span>`)
  if (c.whatsapp) rows.push(`<a data-t="whatsapp" href="${esc(waHref(c.whatsapp))}" rel="nofollow noopener">${icon('chat')}WhatsApp · ${esc(c.whatsapp)}</a>`)
  for (const k of ['facebook', 'instagram', 'tiktok', 'youtube']) {
    const h = socialHref(k, c[k])
    if (h) rows.push(`<a data-t="social" href="${esc(h)}" rel="ugc nofollow noopener">${icon(k === 'instagram' || k === 'tiktok' || k === 'youtube' ? 'camera' : 'people')}${esc(k[0].toUpperCase() + k.slice(1))} · ${esc(c[k].replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))}</a>`)
  }
  if (c.email) rows.push(`<a data-t="email" href="mailto:${esc(c.email)}">${icon('mail')}${esc(c.email)}</a>`)
  if (c.web) rows.push(`<a data-t="web" href="${esc(c.web)}" rel="ugc nofollow noopener">${icon('globe')}${esc(hostOf(c.web))}</a>`)
  if (rows.length) {
    out.push(`<section class="card rise">${H2('contact', W('contact'))}<div class="contact">${rows.join('')}</div>`)
    if (c.phone || c.email || line) out.push(`<div class="tools-row"><a class="btn ghost" data-t="vcf" href="/${esc(site.name)}/contact.vcf">${icon('download')}${W('saveContact')}</a></div>`)
    out.push('</section>')
  }

  // paying by PromptPay: amounts to tap; the Worker draws the QR with the amount in it
  if (d.pay.pp && !L && !Wk) {
    const opts = []
    if (site.kind === 'event' && amountOf(d.pay.price)) opts.push([amountOf(d.pay.price), W('payTicket')])
    if (d.pay.tips) for (const a of [20, 50, 100, 500]) opts.push([a, ''])
    out.push(`<section class="card rise pay" id="pay">${H2('pay', W('pay'))}<p>${W('payHint', { n: esc(name) })}</p><div class="amts">`,
      opts.map(([a, l]) => `<button class="amt" data-a="${a}" data-t="payamt">${esc(money(String(a), sym))}${l ? `<small>${l}</small>` : ''}</button>`).join(''),
      `<label class="amtin"><span>${esc(sym || '฿')}</span><input type="number" inputmode="decimal" min="1" max="999999" step="any" placeholder="${W('payOther')}" aria-label="${W('payAmt')}"></label>`,
      `<button class="btn" id="paygo" data-t="pay">${icon('coin')}${W('payShow')}</button></div><div class="ppout" id="ppout" hidden></div></section>`)
  }

  if (d.msg) {
    out.push(`<section class="card msgcard rise" id="message">${H2('msg', W('msg'))}`,
      opt.preview ? `<p style="color:var(--mute)">${W('msgPreview')}</p>` : '',
      `<form class="msgf" id="msgf"><input name="name" maxlength="80" autocomplete="name" placeholder="${W('msgName')}" aria-label="${W('msgName')}">`,
      `<input name="reach" maxlength="120" autocomplete="tel" placeholder="${W('msgReach')}" aria-label="${W('msgReach')}">`,
      `<textarea name="body" maxlength="2000" required placeholder="${W('msgBody')}" aria-label="${W('msgBody')}"></textarea>`,
      gold ? newsBox(W, name) : '',
      `<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">`,
      `<button class="btn" type="submit"${opt.preview ? ' disabled' : ''}>${icon('mail')}${W('msgSend')}</button></form></section>`)
  }

  }
  if (lookId === 'lanna') out.push('<div class="kranok"></div>')
  if (lookId === 'gold') out.push('<div class="goldrule"></div>')
  if (opt.events) out.push(opt.events) // what its linked calendars have coming (src/events.mjs)
  out.push('</main>', foot(site, d, lang, url, { ...opt, home, langs: gold ? langs : [] }, false, gold, dl))
  const pd = {
    lang, name: site.name, title: name, tagline: d.tagline, url, accent, preview: !!opt.preview, gold, look: lookId, main: '',
    bg: /--bg:(#[0-9a-f]+)/i.exec(look.vars)?.[1], ink: /--ink:(#[0-9a-f]+)/i.exec(look.vars)?.[1], cover: d.cover ? img(d.cover) : '',
    coverCredit: d.cover && d.credits[d.cover] ? `${tidyTitle(d.credits[d.cover].title)} — ${d.credits[d.cover].by} · ${d.credits[d.cover].license}` : '',
    north: hasPin && pl.lat > 17 && pl.lat < 20.6 && pl.lng > 97.3 && pl.lng < 101.8,
    fams: [...new Set(out.join('').match(/data-dingbat="([a-z0-9-]+)"/g)?.map((m) => DINGBATS[m.slice(14, -1)]).filter(Boolean) || [])],
    tz, sym, langs, hl: opt.hl || '', home, listing: L ? L.id : '', lnames: Object.fromEntries(langs.map((l) => [l, PAGE_LANGS[l]])),
    book: gold && (d.svc.length || (hotel && d.rooms.length)) ? { ahead: d.book.ahead, svc: Object.fromEntries(d.svc.map((v) => [v.id, { cap: v.cap, mins: v.mins, p: v.p }])), rooms: Object.fromEntries(d.rooms.map((r) => [r.id, { g: r.guests, p: r.p, p2: r.p2, rates: r.rates, min: r.min, units: r.units }])), stay: { in: d.stay.in, out: d.stay.out } } : null,
    w: Object.fromEntries(['happening', 'ended', 'farFrom', 'reportAsk', 'send', 'thanks', 'close', 'copied', 'orderHi', 'msgSent', 'msgFail', 'saveQr', 'story', 'drawnTap',
      'bookPick', 'bookNone', 'bookName', 'bookReach', 'bookEmail', 'bookPeople', 'bookNote', 'bookSend', 'bookAsked', 'bookDone', 'bookFail', 'bookDeposit', 'bookScan', 'bookLeft',
      'newsOpt', 'newsMail', 'roomIn', 'roomOut', 'roomNights', 'roomNight1', 'roomSend', 'roomTotal', 'roomPickIn', 'roomPickOut', 'roomTaken', 'roomMin', 'roomLeft', 'bookRef', 'payNow', 'payHotel', 'payLink', 'yourBooking', 'readIn', 'msgName', 'msgReach', 'msgBody', 'msgSend', 'payScan', 'paySlip', 'payTotal'].map((k) => [k, word(lang, k)])),
    line: line || '',
  }
  out.push(`<template id="qrsvg">${qrSvg(url, { dark: '#000', light: '#fff', label: url })}</template>`)
  out.push(`<script type="application/json" id="pd">${JSON.stringify(pd).replace(/</g, '\\u003c')}</script>`)
  if (shopOn && !L && !Wk && !Am) out.push(`<script type="application/json" id="shopd">${JSON.stringify(shopData(d, { site, lang, gold, sym: '฿', img, list: prs, dls })).replace(/</g, '\\u003c')}</script>`)
  out.push(`<script${opt.nonce ? ` nonce="${opt.nonce}"` : ''} src="/s/page.js" defer></script>`)
  if (shopOn && !L && !Wk && !Am) out.push(`<script${opt.nonce ? ` nonce="${opt.nonce}"` : ''} src="/s/shop.js" defer></script>`)
  out.push('</body></html>')
  return out.join('')
}

// Agoda's five dots and Booking.com's blue: buttons to the page's own listing there
const OTA_MARK = {
  agoda: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="4" cy="12" r="2.6" fill="#e3242b"/><circle cx="9" cy="12" r="2.6" fill="#f68b1f"/><circle cx="14" cy="12" r="2.6" fill="#ffc72c"/><circle cx="19" cy="9" r="2.6" fill="#76b843"/><circle cx="19" cy="15.5" r="2.6" fill="#2f84d8"/></svg>',
  booking: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="5" fill="#fff"/><path d="M7 5.5h4.6c2.4 0 3.8 1.2 3.8 3 0 1.2-.7 2.1-1.8 2.5 1.5.3 2.4 1.4 2.4 2.9 0 2.1-1.6 3.6-4.2 3.6H7zm2.6 2.2v3h1.8c1 0 1.6-.6 1.6-1.5s-.6-1.5-1.6-1.5zm0 5v3.3h2.1c1.1 0 1.8-.6 1.8-1.7 0-1-.7-1.6-1.8-1.6z" fill="#003580"/><circle cx="18" cy="17" r="1.6" fill="#009fe3"/></svg>',
}
function otaBtn(k, u, W) {
  return `<a class="btn ota ota-${k}" data-t="${k}" href="${esc(u)}" rel="nofollow noopener">${OTA_MARK[k]}${W(k === 'agoda' ? 'otaAgoda' : 'otaBooking')}</a>`
}

/** One listing as a card in the grid: first photo, status, deal, price, facts. */
function workCard(x, { site, img }) {
  const sub = [x.client, x.year].filter(Boolean).join(' · ')
  return `<a class="wcard" href="/${esc(site.name)}/w/${esc(x.id)}" data-tags="${esc(JSON.stringify(tagsOf(x)))}" data-t="work"><figure>` +
    (x.photos[0] ? `<img src="${esc(img(x.photos[0], true))}" alt="" loading="lazy">` : `<span class="noimg">${ding('nib', 'paper')}</span>`) +
    `${x.photos.length > 1 ? `<span class="n">${x.photos.length}</span>` : ''}</figure><b>${esc(x.t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</a>`
}

/** A work's own page: the facts, every photo, the words, the link, the other work. */
function workBody(x, { site, d, W, H2, img, gold }) {
  const out = []
  const facts = [['client', x.client], ['year', x.year], ['role', x.role]].filter(([, v]) => v)
  out.push('<section class="card lfacts rise">')
  if (facts.length) out.push(`<dl>${facts.map(([k, v]) => `<div><dt>${W('w_' + k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`)
  if (x.tags) out.push(`<p class="wtags">${tagsOf(x).map((t) => `<a href="/${esc(site.name)}?tag=${encodeURIComponent(t)}#works">${esc(t)}</a>`).join('')}</p>`)
  if (x.u) out.push(`<div class="tools-row"><a class="btn" data-t="worklink" href="${esc(x.u)}" rel="ugc nofollow noopener">${icon('link')}${W('w_see')}</a></div>`)
  out.push('</section>')
  if (gold && x.video) out.push(videoBlock(x.video, x.photos[0], H2, W, img))
  if (x.note) out.push(`<section class="card rise">${H2('about', W('about'))}${paras(x.note)}</section>`)
  if (x.photos.length > 1) out.push(`<section class="card rise">${H2('photos', W('photos'))}<div class="wshots">${x.photos.map((p) => `<button data-t="photo" data-big="${esc(img(p))}"><img src="${esc(img(p))}" alt="" loading="lazy"></button>`).join('')}</div></section>`)
  const others = d.works.slice(0, gold ? MAX.works : MAX.worksFree).filter((y) => y.id !== x.id).slice(0, 6)
  if (others.length) out.push(`<section class="card rise">${H2('works', W('w_more'))}<div class="wgrid">${others.map((y) => workCard(y, { site, img })).join('')}</div>`,
    `<div class="tools-row"><a class="btn ghost" href="/${esc(site.name)}#works">${icon('list')}${W('w_all')}</a></div></section>`)
  if ((gold && d.give) || d.msg) out.push(`<section class="card rise"><div class="tools-row">${gold && d.give ? giveBtn(d.give, W) : ''}${d.msg ? `<a class="btn" href="/${esc(site.name)}#message">${icon('mail')}${W('w_ask')}</a>` : ''}</div></section>`)
  return out.join('')
}

/** Letters in the title's longest word, so the title is sized to keep every word whole.
 *  Thai, Lao, Khmer and Burmese run without spaces and break between words on their own. */
/** A number from a price as typed ("฿60", "60 baht", "1,500"); 0 when there is none. */
export function amountOf(p) {
  const n = parseFloat(String(p || '').replace(/,/g, '').match(/\d+(\.\d+)?/)?.[0] || '')
  return n > 0 && n < 1e6 ? n : 0
}

/** The button a page leads with, by kind and by what the page holds: [href, word, icon]. */
function leadButton(site, d, gold, line) {
  const k = site.kind, c = d.contact, pp = !!d.pay.pp, oa = lineOa(c.line)
  if ((k === 'food' || k === 'shop') && d.items.length && (pp || oa)) return ['#menu', k === 'food' ? 'ctaOrder' : 'ctaBuy', 'basket']
  if (k === 'stay' && gold && d.rooms.length) return ['#rooms', 'ctaRoom', 'cal']
  if (k === 'service' && gold && d.svc.length) return ['#book', 'ctaBook', 'cal']
  if (k === 'homes' && gold && d.lists.length) return ['#lists', 'ctaHomes', 'tag']
  if (k === 'event' && pp && amountOf(d.pay.price)) return ['#pay', 'ctaTicket', 'coin']
  if ((k === 'me' || k === 'group') && pp && d.pay.tips) return ['#pay', k === 'group' ? 'ctaDues' : 'ctaTip', 'heart']
  if (k === 'work') return [d.msg ? '#message' : line || (c.phone ? telHref(c.phone) : '#message'), 'ctaHire', 'mail']
  if (gold && d.give) return [d.give, 'give', 'heart']
  if (k === 'group' && (line || d.msg)) return [line || '#message', 'ctaJoin', 'people']
  if (k === 'event') return [`/${site.name}/event.ics`, 'addCal', 'cal']
  if (line) return [line, 'line', 'chat']
  if (c.phone) return [telHref(c.phone), 'call', 'phone']
  return null
}

/** The name as words, each in a span a look can move on its own. */
function wordsOf(t) {
  let i = 0
  return esc(t).split(/(\s+)/).map((p) => (!p || /^\s+$/.test(p) ? p : `<span class="w" style="--i:${i++}">${p}</span>`)).join('')
}

/** The line over the name: the town, from the last part of the address. */
function kicker(d) {
  const a = (d.place.addr || '').trim()
  if (!a) return ''
  const segs = a.split(/[,，、]/).map((x) => x.trim()).filter(Boolean)
  let c = (segs[segs.length - 1] || '').replace(/\s*\d[\d\s-]*$/, '').trim()
  if (segs.length === 1 && c.length > 22) c = c.split(/\s+/).pop()
  return c.length >= 2 && c.length <= 28 ? c : ''
}

export function longestWord(t) {
  const words = String(t || '').split(/\s+/).filter((w) => /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\d]/u.test(w))
  return Math.min(16, Math.max(6, ...words.map((w) => [...w].length)))
}

function listCard(x, { site, W, img, sym }) {
  const facts = [x.beds ? `${W('beds')} ${x.beds}` : '', x.baths ? `${W('baths')} ${x.baths}` : '', x.area ? `${esc(x.area)} ${UNIT_LABEL[x.unit]}` : ''].filter(Boolean).join(' · ')
  const pr = x.p ? (x.deal === 'rent' ? W('perMonth', { p: esc(money(x.p, sym)) }) : esc(money(x.p, sym))) : ''
  return `<a class="lcard${x.status !== 'open' ? ' gone' : ''}" href="/${esc(site.name)}/l/${esc(x.id)}" data-deal="${x.deal}" data-t="listing"><figure>` +
    (x.photos[0] ? `<img src="${esc(img(x.photos[0], true))}" alt="" loading="lazy">` : `<span class="noimg">${ding(x.deal === 'rent' ? 'key' : 'home', 'paper')}</span>`) +
    `<span class="deal">${W(x.deal === 'rent' ? 'forRent' : 'forSale')}</span>${x.status !== 'open' ? `<span class="st">${W('st_' + x.status)}</span>` : ''}</figure>` +
    `<b>${esc(x.t)}</b>${pr ? `<span class="pr">${pr}</span>` : ''}${facts ? `<small>${facts}</small>` : ''}</a>`
}

/** A listing's own page: its photos, facts, words, pin and an ask-about form. */
function listingBody(x, { site, d, W, H2, img, sym, name }) {
  const out = []
  const pr = x.p ? (x.deal === 'rent' ? W('perMonth', { p: esc(money(x.p, sym)) }) : esc(money(x.p, sym))) : ''
  out.push(`<section class="card lfacts rise"><p class="lhead"><span class="deal">${W(x.deal === 'rent' ? 'forRent' : 'forSale')}</span><span class="st st-${x.status}">${W('st_' + x.status)}</span></p>`,
    pr ? `<p class="lprice">${pr}</p>` : '', '<dl>',
    x.kind ? `<div><dt>${icon('shop')}</dt><dd>${esc(x.kind)}</dd></div>` : '',
    x.beds ? `<div><dt>${W('beds')}</dt><dd>${x.beds}</dd></div>` : '', x.baths ? `<div><dt>${W('baths')}</dt><dd>${x.baths}</dd></div>` : '',
    x.area ? `<div><dt>${W('area')}</dt><dd>${esc(x.area)} ${UNIT_LABEL[x.unit]}</dd></div>` : '', '</dl></section>')
  if (x.photos.length > 1) out.push(`<section class="card rise">${H2('photos', W('photos'))}<div class="gallery">${x.photos.map((p) => `<figure><button data-t="photo" data-big="${esc(img(p))}"><img src="${esc(img(p, true))}" alt="" loading="lazy"></button></figure>`).join('')}</div></section>`)
  if (x.note) out.push(`<section class="card rise">${H2('about', W('about'))}${paras(x.note)}</section>`)
  const lat = x.lat ?? d.place.lat, lng = x.lng ?? d.place.lng
  if (lat !== null && lng !== null) {
    const q = new URLSearchParams({ pin: `${lat},${lng}`, pn: x.t, embed: '1', look: d.map.style, s: String(MAP_NEAR[d.map.near]) })
    out.push(`<section class="card mapcard rise" id="where">${H2('where', W('where'))}<div class="dmap" id="dmap" data-marks="[]"><iframe src="/map?${esc(q.toString())}" title="${W('mapOpen')}" loading="lazy"></iframe></div>`,
      `<div class="in"><div class="tools-row"><a class="btn dark" data-t="dir" href="${esc(dirHref(lat, lng))}" rel="nofollow noopener">${icon('route')}Google Maps</a></div></div></section>`)
  }
  const c = d.contact, line = lineHref(c.line)
  const reach = []
  if (c.phone) reach.push(`<a class="btn" data-t="call" href="${esc(telHref(c.phone))}">${icon('phone')}${W('call')}</a>`)
  if (line) reach.push(`<a class="btn line" data-t="line" href="${esc(line)}" rel="nofollow noopener">${icon('chat')}${W('line')}</a>`)
  out.push(`<section class="card msgcard rise" id="message">${H2('msg', W('listAsk'))}`, reach.length ? `<nav class="reach" style="margin:0 0 16px">${reach.join('')}</nav>` : '',
    d.msg ? `<form class="msgf" id="msgf" data-about="${esc(x.t)}"><input name="name" maxlength="80" autocomplete="name" placeholder="${W('msgName')}" aria-label="${W('msgName')}">` +
      `<input name="reach" maxlength="120" autocomplete="tel" placeholder="${W('msgReach')}" aria-label="${W('msgReach')}">` +
      `<textarea name="body" maxlength="2000" required aria-label="${W('msgBody')}">${esc(x.t)} — </textarea>` + (site.tier === 'gold' ? newsBox(W, name) : '') + `<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">` +
      `<button class="btn" type="submit">${icon('mail')}${W('msgSend')}</button></form>` : '', '</section>')
  const others = d.lists.filter((y) => y.id !== x.id).slice(0, 6)
  if (others.length) out.push(`<section class="card rise">${H2('lists', W('listAll'))}<div class="lgrid">${others.map((y) => listCard(y, { site, W, img, sym })).join('')}</div>`,
    `<div class="tools-row"><a class="btn ghost" href="/${esc(site.name)}#lists">${icon('list')}${W('listAll')}</a></div></section>`)
  return out.join('')
}

/** schema.org for a Gold page: the business, or one listing as an offer. */
function ldJson(site, d, name, url, image, L, sym) {
  const geo = d.place.lat !== null ? { '@type': 'GeoCoordinates', latitude: d.place.lat, longitude: d.place.lng } : undefined
  if (L) {
    const num = Number(String(L.p).replace(/[^\d.]/g, ''))
    return JSON.stringify({ '@context': 'https://schema.org', '@type': 'RealEstateListing', name: L.t, url, image, description: L.note.slice(0, 500) || undefined,
      offers: num ? { '@type': 'Offer', price: num, priceCurrency: d.currency || undefined, availability: L.status === 'open' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut' } : undefined })
  }
  const type = { food: 'Restaurant', shop: 'Store', service: d.rooms.length ? 'LodgingBusiness' : 'LocalBusiness', stay: 'LodgingBusiness', homes: 'RealEstateAgent', event: 'Event', group: 'Organization', me: 'Person' }[site.kind] || 'LocalBusiness'
  const o = { '@context': 'https://schema.org', '@type': type, name, url, image, description: d.tagline || d.about.slice(0, 300) || undefined }
  if (type !== 'Person' && type !== 'Event') {
    if (d.contact.phone) o.telephone = d.contact.phone
    if (d.place.addr) o.address = d.place.addr
    if (geo) o.geo = geo
    if (d.hours.on && !d.hours.always) o.openingHours = osmHours(d.hours).split('; ').filter((x) => !x.endsWith('off'))
  }
  if (type === 'Event' && d.event) { o.startDate = d.event.start; if (d.place.addr) o.location = { '@type': 'Place', name, address: d.place.addr } }
  return JSON.stringify(o)
}

function foot(site, d, lang, url, opt, held, gold, dl) {
  const W = (k, v) => esc(word(lang, k, v))
  const name = d.name || site.name
  const views = Number(site.views) || 0
  const parts = ['<footer class="foot">']
  if (!held) {
    const t = encodeURIComponent(name), u = encodeURIComponent(url)
    parts.push('<section class="share">', `<h2>${ding('share', dl)}${W('shareTitle')}</h2>`,
      `<button class="btn big" id="share" data-t="share">${icon('share')}${W('share')}</button><div class="row">`,
      `<a data-t="shareline" href="${esc(lineShare(name + ' ' + url))}" rel="nofollow noopener">${BRAND.line}LINE</a>`,
      `<a data-t="sharefb" href="https://www.facebook.com/sharer/sharer.php?u=${u}" rel="nofollow noopener">${BRAND.fb}Facebook</a>`,
      `<a data-t="sharewa" href="https://wa.me/?text=${t}%20${u}" rel="nofollow noopener">${BRAND.wa}WhatsApp</a>`,
      `<a data-t="sharex" href="https://x.com/intent/post?text=${t}&amp;url=${u}" rel="nofollow noopener">${BRAND.x}X</a>`,
      `<a data-t="sharetg" href="https://t.me/share/url?url=${u}&amp;text=${t}" rel="nofollow noopener">${BRAND.tg}Telegram</a>`,
      `<a data-t="email" href="mailto:?subject=${t}&amp;body=${u}">${BRAND.mail}${W('email')}</a>`,
      `<button data-t="qr" id="qrbtn">${BRAND.qr}${W('qr')}</button>`,
      `<button data-t="story" id="storybtn">${BRAND.story}${W('story')}</button>`,
      `</div><p style="margin:12px 0 0"><button class="btn ghost" id="copy" data-t="copy" data-done="${W('copied')}" style="width:100%;min-height:46px">${icon('link')}<span>${esc(url.replace(/^https:\/\//, ''))}</span></button></p></section>`)
  }
  const cr = Object.entries(d.credits).filter(([id]) => d.photos.includes(id) || id === d.cover)
  if (cr.length && !held) parts.push(`<details class="credits"><summary>${W('pictures')} (${cr.length})</summary><ul>${cr.map(([, c]) => `<li>${creditLine(c)}</li>`).join('')}</ul></details>`)
  if (d.counter) parts.push(`<p>${new Intl.NumberFormat(lang).format(views)} ${W('visits')}</p>`)
  if (!held && opt.langs && opt.langs.length > 1) {
    const home = opt.home || site.lang
    if (opt.hl && opt.hl !== home) parts.push(`<p class="mt">${W('machine', { l: esc(PAGE_LANGS[home]) })}</p>`)
  }
  parts.push('<nav>')
  if (!held) parts.push(`<a href="/${esc(site.name)}/sign" data-t="sign">${W('sign')}</a>`)
  parts.push(`<a href="/random">${W('random')}</a>`)
  if (!opt.preview) parts.push(`<a href="#report" id="report">${W('report')}</a>`)
  parts.push('</nav>', gold
    ? `<a class="made small" href="${HOME}/">${W('made')}</a></footer>`
    : `<a class="made" href="${HOME}/">${icon('ant-solid')}${W('made')} · ${W('makeYours')}</a></footer>`)
  return parts.join('')
}

/** A drawn ground for a pin with no map picture yet: paper, a grid, a compass. */
function postcard(pl) {
  const ns = pl.lat >= 0 ? 'N' : 'S', ew = pl.lng >= 0 ? 'E' : 'W'
  return `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="width:100%;height:100%"><rect width="320" height="200" fill="#efe6d2"/>` +
    Array.from({ length: 9 }, (_, i) => `<path d="M${i * 40} 0v200M0 ${i * 25}h320" stroke="#d8ccb2" stroke-width="1"/>`).join('') +
    `<path d="M0 140C60 120 90 160 160 130S260 90 320 110" stroke="#9cc3d5" stroke-width="10" fill="none" opacity=".7"/>` +
    `<path d="M30 0L70 200M0 60h320M210 0l-20 200" stroke="#fff" stroke-width="6" opacity=".8"/>` +
    `<g transform="translate(278 40)"><circle r="22" fill="#fff" opacity=".85"/><path d="M0-18l5 18h-10z" fill="#d7261e"/><path d="M0 18l5-18h-10z" fill="#555"/><text y="-24" font-size="10" text-anchor="middle" fill="#555">N</text></g>` +
    `<text x="12" y="190" font-size="11" fill="#6b5d48" font-family="ui-monospace,Menlo,monospace">${Math.abs(pl.lat).toFixed(5)}°${ns} ${Math.abs(pl.lng).toFixed(5)}°${ew}</text></svg>`
}

/** vCard 3.0 for "Save contact". */
export function vcard(site) {
  const d = normalize(site.d)
  const e = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${e(d.name || site.name)}`, `ORG:${e(d.name || site.name)}`]
  if (d.contact.phone) lines.push(`TEL;TYPE=CELL:${d.contact.phone.replace(/[^\d+]/g, '')}`)
  if (d.contact.email) lines.push(`EMAIL:${e(d.contact.email)}`)
  if (d.place.addr) lines.push(`ADR:;;${e(d.place.addr)};;;;`)
  if (d.place.lat !== null) lines.push(`GEO:${d.place.lat};${d.place.lng}`)
  lines.push(`URL:${HOME}/${site.name}`)
  if (d.contact.line) lines.push(`NOTE:LINE ${e(d.contact.line)}`)
  lines.push('END:VCARD')
  return lines.join('\r\n') + '\r\n'
}

/** iCalendar for an event page. */
export function ics(site) {
  const d = normalize(site.d)
  if (!d.event) return null
  const s = zonedToUtc(d.event.start, d.event.tz)
  const e = d.event.end ? zonedToUtc(d.event.end, d.event.tz) : s + 3 * 3600e3
  const f = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const t = (x) => String(x).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//motdang.net//pages//EN', 'BEGIN:VEVENT',
    `UID:${site.name}-${s}@sites.motdang.net`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(s)}`, `DTEND:${f(e)}`,
    `SUMMARY:${t(d.name || site.name)}`, d.place.addr ? `LOCATION:${t(d.place.addr)}` : '',
    d.place.lat !== null ? `GEO:${d.place.lat};${d.place.lng}` : '', `URL:${HOME}/${site.name}`,
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n') + '\r\n'
}

/** A printable A4 sign: name, the page's QR, LINE's QR, phone, hours. */
export function sign(site, opt = {}) {
  const d = normalize(site.d)
  const lang = PAGE_LANGS[site.lang] ? site.lang : 'en'
  const look = LOOKS[site.look] || LOOKS.poster
  const accent = d.accent || look.accent
  const url = `${HOME}/${site.name}`
  const line = lineHref(d.contact.line)
  const W = (k, v) => esc(word(lang, k, v))
  const hrs = d.hours.on && !d.hours.always
    ? DAY_ORDER.map((i) => `<tr><td>${esc(dayName(lang, i))}</td><td>${d.hours.week[i] ? d.hours.week[i].map(([a, b]) => `${a}–${b}`).join(', ') : W('closed')}</td></tr>`).join('')
    : ''
  return `<!doctype html><html lang="${lang}" translate="no" class="notranslate"><head><meta charset="utf-8"><meta name="google" content="notranslate"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.name || site.name)} · ${W('sign')}</title>
<meta name="robots" content="noindex"><style>${faces(look.fonts)}:root{${look.vars};--accent:${accent};--on-accent:${onColor(accent)}}
*{box-sizing:border-box}body{margin:0;background:#ddd;font:400 18px/1.4 var(--body);color:#111}
.sheet{width:210mm;min-height:297mm;margin:16px auto;background:#fff;padding:18mm 16mm;display:flex;flex-direction:column;gap:10mm;box-shadow:0 4px 20px rgba(0,0,0,.2)}
h1{margin:0;font:var(--h1w) 64px/1 var(--display);text-transform:var(--case);color:#111;overflow-wrap:anywhere}.tag{font-size:26px;margin:0}
.bar{height:10mm;background:var(--accent)}.qrs{display:grid;grid-template-columns:${line ? '1fr 1fr' : '1fr'};gap:10mm;align-items:start}
.q{text-align:center;font-weight:700;font-size:20px}.q .qr{width:100%;max-width:${line ? '80mm' : '120mm'};height:auto;display:block;margin:0 auto 4mm}
.big{font:700 34px/1.2 var(--body)}table{border-collapse:collapse;font-size:20px;width:100%}td{padding:2mm 0;border-bottom:1px solid #ccc}td+td{text-align:right}
.url{font:700 22px/1 ui-monospace,Menlo,monospace;text-align:center}.print{display:block;margin:16px auto;padding:14px 28px;border-radius:99px;border:0;background:#111;color:#fff;font:700 18px system-ui;cursor:pointer}
@media print{body{background:#fff}.sheet{margin:0;box-shadow:none}.print{display:none}@page{size:A4;margin:0}}</style></head><body>
<button class="print" id="print">${W('sign')}</button><div class="sheet"><div class="bar"></div><h1>${esc(d.name || site.name)}</h1>${d.tagline ? `<p class="tag">${esc(d.tagline)}</p>` : ''}
<div class="qrs"><div class="q">${qrSvg(url, { dark: '#000', light: '#fff', label: url })}sites.motdang.net/${esc(site.name)}</div>${line ? `<div class="q">${qrSvg(line, { dark: '#06c755', light: '#0e1f3d', label: 'LINE' })}${W('scanLine')}</div>` : ''}</div>
${d.contact.phone ? `<div class="big">${W('call')} ${esc(d.contact.phone)}</div>` : ''}${d.hours.always ? `<div class="big">${W('open24')}</div>` : ''}${hrs ? `<table>${hrs}</table>` : ''}
<div class="url">sites.motdang.net/${esc(site.name)}</div></div><script${opt.nonce ? ` nonce="${opt.nonce}"` : ''}>document.getElementById('print').onclick=function(){print()}</script></body></html>`
}
