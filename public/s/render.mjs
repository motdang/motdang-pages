// render.mjs — one page, from its data, as a whole HTML document.
// The Worker serves it; the builder runs the same function for its preview,
// so what a maker sees is what a reader gets. Everything the maker typed is
// escaped here; nothing they send is markup.

import { word, PAGE_LANGS } from './words.mjs'
import { encodeQr } from './qr.mjs'

export const KINDS = ['shop', 'food', 'service', 'me', 'event', 'group']
export const LOOK_IDS = ['poster', 'loom', 'stitch', 'night', 'y1997', 'clean', 'lanna']
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
  o.card = PHOTO_ID.test(d.card || '') ? d.card : ''
  o.photos = (Array.isArray(d.photos) ? d.photos : []).filter((p) => PHOTO_ID.test(p)).slice(0, 12)
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
  return o
}

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
const icon = (id, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="/~/s/icons.svg#i-${id}"/></svg>`

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

const F_THAI = '"Prompt","Noto Sans Thai","Leelawadee UI","Thonburi",Tahoma'
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
    s += `@font-face{font-family:"${n}";font-weight:${w};font-display:swap;src:url(/fonts/${f}-${sub}.woff2) format("woff2");unicode-range:${SUBSET[sub]}}`
  return s
}

// Each look: palette, type, and the drawing at the top that answers a tap.
export const LOOKS = {
  poster: {
    label: 'Poster', fonts: ['Prompt'], accent: '#f04a00',
    vars: `--bg:#fff7ec;--card:#ffffff;--ink:#1c1530;--mute:#5a4f6a;--line:#efd9bf;--hero:#1c1530;--r:4px;
      --display:"Avenir Next Condensed","HelveticaNeue-CondensedBold","Arial Narrow Bold","Franklin Gothic Heavy",Impact,${F_THAI},sans-serif;
      --body:"Avenir Next",Avenir,"Segoe UI",system-ui,-apple-system,Helvetica,Arial,${F_THAI},sans-serif;--case:uppercase;--h1w:800;--track:.01em`,
    css: `.top h1{font-stretch:condensed}.top .bar{display:block;width:84px;height:8px;background:var(--accent);margin:14px 0 10px}
      .card h2{font:800 30px/1 var(--display);letter-spacing:.02em;text-transform:uppercase;color:var(--ink)}
      .card.tools{background:var(--ink);color:var(--bg)}.card.tools h2{color:var(--bg)}
      .menu .p{font:800 26px/1 var(--display);color:var(--acc-ink)}.btn{border-radius:2px;text-transform:uppercase;letter-spacing:.04em}`,
    art: `<svg viewBox="0 0 120 120" class="art sun" aria-hidden="true"><g class="spin">${Array.from({ length: 12 }, (_, i) => `<rect x="57" y="4" width="6" height="22" rx="3" fill="var(--accent)" transform="rotate(${i * 30} 60 60)"/>`).join('')}</g><circle cx="60" cy="60" r="24" fill="#ffb000"/><circle cx="52" cy="56" r="3" fill="#1c1530"/><circle cx="68" cy="56" r="3" fill="#1c1530"/><path d="M50 66q10 9 20 0" stroke="#1c1530" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  },
  loom: {
    label: 'Loom', fonts: ['Chonburi'], accent: '#c24a82',
    vars: `--bg:#f6efe3;--card:#fffaf1;--ink:#2a1a12;--mute:#62503f;--line:#e3d5c0;--hero:#2a1a12;--r:14px;
      --display:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,"Chonburi",serif;
      --body:Georgia,"Iowan Old Style",${F_THAI},serif;--case:none;--h1w:700;--track:-.01em`,
    css: `.card{position:relative;overflow:hidden;padding-top:34px}.card::before{content:"";position:absolute;left:0;right:0;top:0;height:12px;
      background:repeating-linear-gradient(90deg,#b97a1c 0 10px,#137a71 10px 20px,var(--accent) 20px 30px,#2a1a12 30px 34px);
      -webkit-mask:repeating-linear-gradient(0deg,#000 0 3px,rgba(0,0,0,.55) 3px 6px);mask:repeating-linear-gradient(0deg,#000 0 3px,rgba(0,0,0,.55) 3px 6px)}
      .card h2{font:italic 700 24px/1.1 var(--display);color:var(--acc-ink);letter-spacing:0;text-transform:none}`,
    art: `<svg viewBox="0 0 120 120" class="art loom" aria-hidden="true"><g class="warp">${Array.from({ length: 9 }, (_, i) => `<rect x="${14 + i * 11}" y="10" width="5" height="100" rx="2" fill="${['#b97a1c', '#137a71', 'var(--accent)'][i % 3]}"/>`).join('')}</g><g class="weft">${Array.from({ length: 6 }, (_, i) => `<rect x="8" y="${18 + i * 16}" width="104" height="7" rx="3" fill="#2a1a12" opacity=".82"/>`).join('')}</g><path class="shuttle" d="M10 60q50-16 100 0q-50 16-100 0z" fill="#fffaf1" stroke="#2a1a12" stroke-width="2"/></svg>`,
  },
  stitch: {
    label: 'Stitch', fonts: ['Sriracha', 'Prompt'], accent: '#ff2e88',
    vars: `--bg:#1b1f5e;--card:#fffdf5;--ink:#1b1f5e;--mute:#45487a;--line:#d9d6ef;--hero:#1b1f5e;--r:18px;
      --display:"Sriracha","Chalkboard SE","Comic Sans MS",${F_THAI},cursive;--body:system-ui,-apple-system,"Segoe UI",${F_THAI},sans-serif;
      --case:none;--h1w:400;--track:0`,
    css: `body{color:var(--ink)}.top{color:#fff}.card{border:4px solid #1b1f5e;box-shadow:7px 7px 0 var(--accent)}
      .card h2{font:400 26px/1.1 var(--display);color:var(--acc-ink);text-transform:none;letter-spacing:0}
      main>.card+.card{margin-top:58px}main>.card+.card::before{content:"";display:block;height:26px;margin:-58px -26px 32px;
      background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='26'%3E%3Cpath d='M13 2l11 11-11 11L2 13z' fill='%23ff2e88'/%3E%3Cpath d='M13 8l5 5-5 5-5-5z' fill='%23ffd400'/%3E%3Cpath d='M39 2l11 11-11 11-11-11z' fill='%2319c37d'/%3E%3Cpath d='M39 8l5 5-5 5-5-5z' fill='%23fff'/%3E%3C/svg%3E") center/52px 26px repeat-x}
      .foot{color:#fff}.foot a{color:#ffd400}.btn{box-shadow:4px 4px 0 #1b1f5e;border:3px solid #1b1f5e}`,
    art: `<svg viewBox="0 0 120 120" class="art cat" aria-hidden="true"><path d="M24 44 30 12l22 20h16l22-20 6 32" fill="#ffd400" stroke="#1b1f5e" stroke-width="4" stroke-linejoin="round"/><ellipse cx="60" cy="66" rx="40" ry="34" fill="#ffd400" stroke="#1b1f5e" stroke-width="4"/><g class="eyes"><circle cx="45" cy="62" r="6" fill="#1b1f5e"/><circle cx="75" cy="62" r="6" fill="#1b1f5e"/></g><path d="M56 74l4 4 4-4" fill="#ff2e88" stroke="#1b1f5e" stroke-width="3" stroke-linejoin="round"/><path d="M44 84q16 10 32 0" stroke="#1b1f5e" stroke-width="3" fill="none" stroke-linecap="round"/><g class="hearts" fill="#ff2e88"><path d="M20 20c-4-6 4-10 6-4 2-6 10-2 6 4l-6 6z"/><path d="M92 16c-4-6 4-10 6-4 2-6 10-2 6 4l-6 6z"/><path d="M100 50c-3-5 3-8 5-3 2-5 8-2 5 3l-5 5z"/></g></svg>`,
  },
  night: {
    label: 'Night market', fonts: ['Prompt'], accent: '#ff4fa3',
    vars: `--bg:#0d1030;--card:#171b45;--ink:#fdf6ff;--mute:#c4c1e4;--line:#30367a;--hero:#0d1030;--r:16px;
      --display:"Prompt","Avenir Next",system-ui,${F_THAI},sans-serif;--body:system-ui,-apple-system,"Segoe UI",${F_THAI},sans-serif;
      --case:none;--h1w:600;--track:-.01em`,
    css: `.top h1{text-shadow:0 0 18px var(--accent),0 0 2px #fff}.lights{position:absolute;left:0;right:0;top:0;height:46px;z-index:2;pointer-events:none;
      background:radial-gradient(circle at 18px 26px,#ffd76a 0 5px,transparent 6px) 0 0/72px 46px,radial-gradient(circle at 54px 30px,#7df9ff 0 5px,transparent 6px) 0 0/72px 46px;
      animation:twinkle 2.4s steps(2) infinite}.lights::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 36px 32px,#ff7ad1 0 5px,transparent 6px) 0 0/72px 46px;animation:twinkle 1.7s steps(2) infinite reverse}
      @keyframes twinkle{50%{opacity:.45}}.card{box-shadow:0 0 0 1px var(--line),0 12px 40px rgba(0,0,0,.35)}
      .card h2{color:var(--acc-ink)}.menu .p{color:#ffd76a}`,
    art: `<svg viewBox="0 0 120 120" class="art lanterns" aria-hidden="true">${[[30, 52, '#ff4fa3'], [62, 36, '#ffd76a'], [92, 58, '#7df9ff']].map(([x, y, c], i) => `<g class="l l${i}"><path d="M${x} ${y - 30}v12" stroke="#c4c1e4" stroke-width="1.5"/><ellipse cx="${x}" cy="${y}" rx="14" ry="18" fill="${c}"/><path d="M${x - 14} ${y}h28M${x} ${y - 18}v36" stroke="#0d1030" stroke-width="1.5" opacity=".35"/><rect x="${x - 6}" y="${y + 16}" width="12" height="5" rx="2" fill="#0d1030" opacity=".6"/></g>`).join('')}</svg>`,
  },
  y1997: {
    label: '1997', fonts: [], accent: '#ffff00',
    vars: `--bg:#000018;--card:#000000;--ink:#ffffff;--mute:#c8d0ff;--line:#3a3aff;--hero:#000018;--r:0px;
      --display:"Comic Sans MS","Comic Neue","Chalkboard SE","Sriracha",${F_THAI},cursive;--body:Verdana,Tahoma,${F_THAI},sans-serif;
      --case:none;--h1w:700;--track:0`,
    css: `body{background-color:#000018;background-image:radial-gradient(1px 1px at 20px 30px,#fff,transparent),radial-gradient(1px 1px at 120px 80px,#9cf,transparent),
      radial-gradient(2px 2px at 200px 150px,#fff,transparent),radial-gradient(1px 1px at 300px 40px,#ff9,transparent),radial-gradient(1px 1px at 380px 200px,#fff,transparent);background-size:400px 240px}
      .top h1{background:linear-gradient(90deg,#ff004c,#ff9900,#ffee00,#33dd00,#00ccff,#9933ff);-webkit-background-clip:text;background-clip:text;color:#ffee00;-webkit-text-fill-color:transparent}
      .card{border:3px ridge #8a8aff;background:#000a}.card h2{color:#00ffff;font:700 22px/1.1 var(--display);text-transform:none;letter-spacing:0}
      .card h2::before{content:"★ ";color:#ff0}a{color:#00ffff}.btn{border:3px outset #c0c0c0;border-radius:0}.marq{overflow:hidden;white-space:nowrap;background:#000080;color:#ffee00;font:700 16px/34px var(--body);border-block:2px solid #ff00ff}
      .marq span{display:inline-block;padding-left:100%;animation:marq 16s linear infinite}@keyframes marq{to{transform:translateX(-100%)}}
      .odo{display:inline-flex;gap:2px;font:700 22px/1 "Courier New",monospace}.odo b{background:#000;color:#3f3;padding:4px 5px;border:1px solid #555}
      .badge88{display:inline-block;width:88px;min-height:31px;border:2px outset #ccc;background:#c0c0c0;color:#000;font:700 9px/12px Verdana,sans-serif;padding:2px 4px;text-align:center}`,
    art: `<svg viewBox="0 0 120 120" class="art hardhat" aria-hidden="true"><g class="dig"><path d="M28 54a32 32 0 0 1 64 0z" fill="#ffd400" stroke="#000" stroke-width="3"/><rect x="22" y="52" width="76" height="8" rx="3" fill="#ffb000" stroke="#000" stroke-width="3"/><circle cx="60" cy="76" r="18" fill="#d92b2b" stroke="#000" stroke-width="3"/><circle cx="53" cy="73" r="3"/><circle cx="67" cy="73" r="3"/><path d="M40 92l-12 18M80 92l12 18M50 96l-4 18M70 96l4 18" stroke="#000" stroke-width="4" stroke-linecap="round"/><path d="M48 50l-10-30M72 50l10-30" stroke="#000" stroke-width="3"/></g><text x="60" y="118" text-anchor="middle" font-size="9" font-family="Verdana" fill="#ff0">UNDER CONSTRUCTION</text></svg>`,
  },
  clean: {
    label: 'Clean', fonts: ['Prompt'], accent: '#2563eb',
    vars: `--bg:#ffffff;--card:#f5f6f8;--ink:#111827;--mute:#4b5563;--line:#e5e7eb;--hero:#111827;--r:14px;
      --display:system-ui,-apple-system,"Segoe UI",${F_THAI},sans-serif;--body:system-ui,-apple-system,"Segoe UI",${F_THAI},sans-serif;
      --case:none;--h1w:700;--track:-.02em`,
    css: `.card h2{color:var(--mute)}`,
    art: `<svg viewBox="0 0 120 120" class="art spark" aria-hidden="true"><g class="s">${[[60, 60, 30], [24, 30, 12], [96, 34, 10], [94, 92, 14], [26, 94, 9]].map(([x, y, r]) => `<path d="M${x} ${y - r}C${x + r * 0.2} ${y - r * 0.2} ${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y}C${x + r * 0.2} ${y + r * 0.2} ${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r}C${x - r * 0.2} ${y + r * 0.2} ${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y}C${x - r * 0.2} ${y - r * 0.2} ${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r}z" fill="var(--accent)"/>`).join('')}</g></svg>`,
  },
  lanna: {
    label: 'Lanna gold', fonts: ['Chonburi', 'Prompt'], accent: '#e2b03a',
    vars: `--bg:#5c0f14;--card:#fff6e3;--ink:#3b0a0d;--mute:#6e3f30;--line:#ebcf86;--hero:#3b0a0d;--r:6px;
      --display:"Chonburi","Iowan Old Style",Georgia,serif;--body:system-ui,-apple-system,"Segoe UI",${F_THAI},sans-serif;--case:none;--h1w:400;--track:0`,
    css: `.top{color:#fff6e3}.card{border:2px solid #e2b03a;box-shadow:0 0 0 6px var(--card),0 0 0 8px #e2b03a}
      .card h2{font:400 26px/1.2 var(--display);color:#8a1a1f;text-transform:none;letter-spacing:0}
      .kranok{height:28px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='28'%3E%3Cpath d='M20 26C10 22 8 12 14 6c0 6 4 8 6 8 2 0 6-2 6-8 6 6 4 16-6 20z' fill='%23e2b03a'/%3E%3Cpath d='M20 22c-4-2-5-6-3-9 1 3 2 4 3 4s2-1 3-4c2 3 1 7-3 9z' fill='%235c0f14'/%3E%3C/svg%3E") center/40px 28px repeat-x;margin:20px 0}
      .foot{color:#fff6e3}.foot a{color:#ffd77a}`,
    art: `<svg viewBox="0 0 120 120" class="art flame" aria-hidden="true"><g class="f"><path d="M60 112C30 100 22 66 40 40c0 18 10 26 20 26s20-8 20-26c18 26 10 60-20 72z" fill="#e2b03a"/><path d="M60 98c-14-6-18-22-10-34 2 10 6 14 10 14s8-4 10-14c8 12 4 28-10 34z" fill="#5c0f14"/><path d="M60 64c-6-10-6-24 0-40 6 16 6 30 0 40z" fill="#ffd77a"/></g></svg>`,
  },
}

// ---- the page ---------------------------------------------------------------------

const BASE_CSS = `*{box-sizing:border-box}[hidden]{display:none!important}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 18px/1.6 var(--body)}
img{max-width:100%;display:block}a{color:inherit}.i{width:22px;height:22px;flex:none;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.wrap{max-width:720px;margin:0 auto;padding:0 16px}
.top{position:relative;overflow:hidden;color:var(--ink)}
.top.has-cover{color:#fff;min-height:min(78vh,620px);display:flex;align-items:flex-end;background:var(--hero)}
.top.has-cover>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.top.has-cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.72) 100%)}
.top .t{position:relative;z-index:1;width:100%;padding:56px 16px 54px;max-width:720px;margin:0 auto}
.top h1{margin:0;font-family:var(--display);font-weight:var(--h1w);font-size:clamp(40px,11vw,86px);line-height:.98;letter-spacing:var(--track);text-transform:var(--case);overflow-wrap:anywhere}
.top .tag{margin:12px 0 0;font-size:clamp(18px,4.6vw,23px);line-height:1.35;max-width:34em}
.art{position:absolute;right:14px;top:14px;width:96px;height:96px;z-index:3;cursor:pointer;-webkit-tap-highlight-color:transparent;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))}
.t .art{position:relative;right:auto;top:auto;float:right;margin:0 0 0 12px;filter:none}
.badge{display:inline-flex;align-items:center;gap:6px;margin-top:16px;padding:6px 14px;border-radius:99px;font:600 15px/1.2 var(--body);background:#3d3d3d;color:#fff}
.badge.open{background:#0b8043}.badge .dot{width:9px;height:9px;border-radius:50%;background:currentColor}
.reach{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:22px auto 0}
.btn{display:flex;align-items:center;justify-content:center;gap:9px;min-height:56px;padding:10px 16px;border-radius:var(--r);border:0;font:700 17px/1.2 var(--body);text-decoration:none;cursor:pointer;background:var(--accent);color:var(--on-accent)}
.btn.line{background:#06c755;color:#000}.btn.grab{background:#00b14f;color:#000}.btn.dark{background:var(--ink);color:var(--card)}
.btn.ghost{background:transparent;color:inherit;box-shadow:inset 0 0 0 2px currentColor}.btn small{font-weight:400;opacity:.85}
.card{margin:26px 0;padding:24px 22px;border-radius:var(--r);background:var(--card);color:var(--ink)}
.card h2{margin:0 0 14px;font:700 14px/1.2 var(--body);letter-spacing:.14em;text-transform:uppercase}
.card p{margin:0 0 12px}.card p:last-child{margin:0}
.menu{list-style:none;margin:0;padding:0}.menu li{display:flex;gap:12px;align-items:baseline;padding:11px 0;border-bottom:1px dashed var(--line)}
.menu li:last-child{border:0}.menu .n{flex:1;font-weight:600}.menu .n small{display:block;font-weight:400;color:var(--mute);font-size:15px}.menu .p{font-weight:700;white-space:nowrap}
.hours{width:100%;border-collapse:collapse}.hours td{padding:7px 0;border-bottom:1px dashed var(--line)}.hours td+td{text-align:right}.hours tr.today td{font-weight:700;color:var(--acc-ink)}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.gallery button{padding:0;border:0;background:var(--line);border-radius:calc(var(--r)/2);overflow:hidden;aspect-ratio:1;cursor:zoom-in}
.gallery img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.gallery button:hover img{transform:scale(1.05)}
.mapbox{position:relative;display:block;width:100%;padding:0;border:0;border-radius:var(--r);overflow:hidden;aspect-ratio:16/10;background:#e8e2d4;cursor:pointer}
.mapbox img,.mapbox>svg:first-child{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.mapbox .pin{position:absolute;left:50%;top:50%;width:46px;height:46px;transform:translate(-50%,-100%);animation:bob 2.6s ease-in-out infinite}
@keyframes bob{50%{transform:translate(-50%,-112%)}}.mapbox .go{position:absolute;right:10px;bottom:10px;display:flex;gap:6px;align-items:center;padding:8px 12px;border-radius:99px;background:#fff;color:#111;font:600 15px/1 var(--body);box-shadow:0 2px 8px rgba(0,0,0,.25)}
.addr{margin:14px 0 0}.tools-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}
.far{margin:10px 0 0;font-weight:600;min-height:1.6em}
.qty{display:inline-flex;align-items:center;gap:6px;margin-left:4px}.qty button{width:38px;height:38px;border-radius:50%;border:2px solid currentColor;background:transparent;color:inherit;font:700 20px/1 system-ui;cursor:pointer}
.qty b{min-width:1.4em;text-align:center}.qty.on b{color:var(--acc-ink)}.btn.order{position:sticky;bottom:12px;margin-top:16px;z-index:5;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.lineqr{display:grid;grid-template-columns:150px 1fr;gap:18px;align-items:center}.lineqr .qr{width:150px;height:150px;border-radius:10px}
.links a.btn{margin:0 0 10px}
.contact{display:grid;gap:8px}.contact a{display:flex;align-items:center;gap:12px;min-height:48px;padding:6px 0;text-decoration:none;border-bottom:1px dashed var(--line);overflow-wrap:anywhere}
.when{font:700 24px/1.3 var(--display)}.count{margin-top:8px;color:var(--acc-ink);font-weight:700}
.foot{text-align:center;padding:26px 16px 120px;font-size:15px;color:var(--mute)}.foot .share{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:0 0 22px}
.foot .share .btn{min-height:46px;font-size:15px;flex:1 1 140px;max-width:220px}.foot nav{display:flex;flex-wrap:wrap;gap:6px 18px;justify-content:center;margin:14px 0}
.foot .made{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:99px;background:#d7261e;color:#fff;font-weight:700;text-decoration:none}
dialog{border:0;border-radius:16px;padding:0;max-width:min(94vw,900px);background:#111;color:#fff}dialog::backdrop{background:rgba(0,0,0,.8)}
dialog img{max-height:84vh;width:auto;margin:auto}dialog .x{position:absolute;right:8px;top:8px;width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:#000;font:700 22px/1 system-ui;cursor:pointer}
dialog.form{background:var(--card);color:var(--ink);padding:22px;width:min(94vw,440px)}dialog.form textarea{width:100%;min-height:110px;font:inherit;padding:10px;border-radius:10px;border:2px solid var(--line)}
.mapfull{position:fixed;inset:0;z-index:50;background:#e8e2d4}.mapfull .x{position:absolute;right:12px;top:12px;z-index:5;width:48px;height:48px;border-radius:50%;border:0;background:#fff;color:#000;font:700 24px/1 system-ui;box-shadow:0 2px 10px rgba(0,0,0,.3)}
.checking{padding:40px 22px;text-align:center}
.sun .spin{transform-origin:60px 60px}.sun.go .spin{animation:spin 1.6s cubic-bezier(.3,1.6,.5,1)}@keyframes spin{to{transform:rotate(180deg)}}
.loom.go .shuttle{animation:shuttle 1.2s ease-in-out}@keyframes shuttle{50%{transform:translateY(-22px)}}.loom.go .warp rect:nth-child(odd){animation:shuttle .9s ease-in-out reverse}
.cat .eyes{transform-origin:60px 62px}.cat.go .eyes{animation:wink .8s}@keyframes wink{40%{transform:scaleY(.1)}}
.cat .hearts{opacity:0}.cat.go .hearts{animation:hearts 1.3s}@keyframes hearts{30%{opacity:1}100%{opacity:0;transform:translateY(-22px)}}
.lanterns.go .l{animation:float 2.2s ease-in-out}.lanterns.go .l1{animation-delay:.15s}.lanterns.go .l2{animation-delay:.3s}@keyframes float{50%{transform:translateY(-34px)}}
.hardhat .dig{transform-origin:60px 110px}.hardhat.go .dig{animation:dig .9s}@keyframes dig{25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
.spark .s{transform-origin:60px 60px}.spark.go .s{animation:spark 1s}@keyframes spark{50%{transform:scale(1.25) rotate(20deg)}}
.flame .f{transform-origin:60px 112px}.flame.go .f{animation:flick 1s}@keyframes flick{30%{transform:scale(1.08,.92)}60%{transform:scale(.94,1.1)}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
@media (min-width:760px){.top .t{padding:80px 16px 70px}.art{width:128px;height:128px;right:24px;top:24px}.t .art{right:auto;top:auto}}
@media print{.reach,.foot,.art,.tools-row{display:none}body{background:#fff;color:#000}}`

const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6]

function dayName(lang, i) {
  const ref = new Date(Date.UTC(2024, 0, 1 + i)) // 1 Jan 2024 was a Monday
  try { return new Intl.DateTimeFormat(lang, { weekday: 'long', timeZone: 'UTC' }).format(ref) } catch { return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] }
}

function relDay(lang, n) {
  try { return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(n, 'day') } catch { return '' }
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

/** The whole page. site = { name, look, lang, kind, d, views, status }.
 *  opt = { origin, img(id, small?) → url, preview, nonce, now } */
export function render(site, opt = {}) {
  const d = normalize(site.d)
  const lang = PAGE_LANGS[site.lang] ? site.lang : 'en'
  const look = LOOKS[site.look] || LOOKS.poster
  const lookId = LOOKS[site.look] ? site.look : 'poster'
  const accent = d.accent || look.accent
  const W = (k, v) => esc(word(lang, k, v))
  const img = opt.img || ((id, small) => `/~/img/${id}${small ? '-s' : ''}.webp`)
  const origin = opt.origin || 'https://motdang.net'
  const url = `${origin}/~${site.name}`
  const name = d.name || site.name
  const cur = d.currency || currencyFor(d.place.cc, lang)
  const st = openState(d.hours, opt.now)
  const pl = d.place
  const hasPin = pl.lat !== null
  const c = d.contact
  const line = lineHref(c.line)
  const grabOk = hasPin && (GRAB_CC[pl.cc] || (!pl.cc && lang === 'th'))
  const out = []

  // head
  const desc = d.tagline || d.about.slice(0, 160)
  const card = d.card ? `${origin}/~/img/${d.card}.jpg` : d.cover ? origin + img(d.cover) : ''
  out.push(`<!doctype html><html lang="${lang}" data-look="${lookId}"><head><meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`,
    `<title>${esc(name)}</title><meta name="description" content="${esc(desc)}">`,
    `<meta property="og:title" content="${esc(name)}"><meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}"><meta property="og:type" content="website">`,
    card ? `<meta property="og:image" content="${esc(card)}"><meta name="twitter:card" content="summary_large_image">` : '',
    `<meta name="robots" content="noindex"><link rel="canonical" href="${esc(url)}">`,
    `<meta name="theme-color" content="${/--bg:(#[0-9a-f]+)/i.exec(look.vars)?.[1] || '#ffffff'}">`,
    `<link rel="icon" href="/~/s/ant.svg">`,
    `<style>${faces(look.fonts)}:root{${look.vars};--accent:${accent};--on-accent:${onColor(accent)};--acc-ink:${accInk(look, accent)}}${BASE_CSS}${look.css}</style></head><body>`)

  if (site.status === 'held' && !opt.preview) {
    out.push(`<main class="wrap"><section class="card checking"><h1 style="font:700 28px var(--display)">${esc(name)}</h1><p>${W('checking')}</p></section></main>`,
      foot(site, d, lang, url, opt, true), '</body></html>')
    return out.join('')
  }

  // top
  out.push(`<header class="top${d.cover ? ' has-cover' : ''}">`)
  if (lookId === 'night') out.push('<div class="lights"></div>')
  if (d.cover) out.push(`<img src="${esc(img(d.cover))}" alt="" fetchpriority="high">${look.art}`)
  out.push(`<div class="t">${d.cover ? '' : look.art}<h1>${esc(name)}</h1>`)
  if (lookId === 'poster') out.push('<span class="bar"></span>')
  if (d.tagline) out.push(`<p class="tag">${esc(d.tagline)}</p>`)
  out.push(`<span id="st">${badge(lang, st)}</span></div></header>`)
  if (lookId === 'y1997' && d.tagline) out.push(`<div class="marq"><span>★ ${esc(d.tagline)} ★ ${esc(name)} ★</span></div>`)

  out.push('<main class="wrap">')

  // reach: the buttons a reader came for
  const reach = []
  if (c.phone) reach.push(`<a class="btn" href="${esc(telHref(c.phone))}">${icon('phone')}${W('call')}</a>`)
  if (line) reach.push(`<a class="btn line" href="${esc(line)}" rel="nofollow noopener">${icon('chat')}${W('line')}</a>`)
  if (hasPin) reach.push(`<a class="btn dark" href="${esc(dirHref(pl.lat, pl.lng))}" rel="nofollow noopener">${icon('route')}${W('dir')}</a>`)
  if (grabOk) reach.push(`<a class="btn grab" href="${esc(grabRide(pl.lat, pl.lng, name, pl.cc || 'TH'))}" rel="nofollow noopener">${icon('ride')}${W('ride')}</a>`)
  if (d.order.grabfood) reach.push(`<a class="btn grab" href="${esc(d.order.grabfood)}" rel="nofollow noopener">${icon('food')}${W('food')}</a>`)
  if (d.order.lineman) reach.push(`<a class="btn line" href="${esc(d.order.lineman)}" rel="nofollow noopener">${icon('food')}${W('lineman')}</a>`)
  if (c.whatsapp && !c.phone) reach.push(`<a class="btn" href="${esc(waHref(c.whatsapp))}" rel="nofollow noopener">${icon('chat')}WhatsApp</a>`)
  if (reach.length) out.push(`<nav class="reach">${reach.join('')}</nav>`)

  // event
  if (d.event) {
    const s = zonedToUtc(d.event.start, d.event.tz)
    const e = d.event.end ? zonedToUtc(d.event.end, d.event.tz) : s + 3 * 3600e3
    let when
    try { when = new Intl.DateTimeFormat(lang, { dateStyle: 'full', timeStyle: 'short', timeZone: d.event.tz }).format(new Date(s)) } catch { when = d.event.start.replace('T', ' ') }
    out.push(`<section class="card"><h2>${W('when')}</h2><div class="when">${esc(when)}</div>`,
      `<div class="count" id="count" data-s="${s}" data-e="${e}"></div>`,
      `<div class="tools-row"><a class="btn ghost" href="/~${esc(site.name)}/event.ics">${icon('cal')}${W('addCal')}</a></div></section>`)
  }

  if (d.about) out.push(`<section class="card"><h2>${W('about')}</h2>${paras(d.about)}</section>`)

  if (d.items.length) {
    const oa = lineOa(c.line)
    out.push(`<section class="card"><h2>${W(site.kind === 'food' ? 'menu' : 'prices')}</h2><ul class="menu${oa ? ' orderable' : ''}">`)
    d.items.forEach((it, i) => out.push(`<li><span class="n">${esc(it.n)}${it.note ? `<small>${esc(it.note)}</small>` : ''}</span><span class="p">${esc(price(it.p, cur))}</span>` +
      (oa ? `<span class="qty" data-i="${i}" data-n="${esc(it.n)}"><button aria-label="−">−</button><b>0</b><button aria-label="+">+</button></span>` : '') + '</li>'))
    out.push('</ul>')
    if (oa) out.push(`<a class="btn line order" id="lineorder" data-oa="${esc(oa)}" href="${esc(lineHref(c.line))}" rel="nofollow noopener" hidden>${icon('chat')}${W('lineOrder')} <span></span></a>`)
    out.push('</section>')
  }

  if (d.hours.on) {
    out.push(`<section class="card"><h2>${W('hours')}</h2>`)
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

  const gallery = d.photos.length === 1 && d.photos[0] === d.cover ? [] : d.photos
  if (gallery.length) {
    out.push(`<section class="card"><h2>${W('photos')}</h2><div class="gallery">`)
    for (const p of gallery) out.push(`<button data-big="${esc(img(p))}"><img src="${esc(img(p, true))}" alt="" loading="lazy"></button>`)
    out.push('</div></section>')
  }

  if (hasPin || pl.addr) {
    out.push(`<section class="card tools"><h2>${W('where')}</h2>`)
    if (hasPin) {
      const pin = `<svg class="pin" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 46s15-15.5 15-26a15 15 0 0 0-30 0c0 10.5 15 26 15 26z" fill="${accent}" stroke="#fff" stroke-width="3"/><circle cx="24" cy="20" r="6" fill="#fff"/></svg>`
      const ground = postcard(pl) + (pl.snap ? `<img src="${esc(img(pl.snap))}" alt="" loading="lazy">` : '')
      out.push(`<button class="mapbox" id="openmap" data-lat="${pl.lat}" data-lng="${pl.lng}" data-z="${pl.zoom}" aria-label="${W('map')}">${ground}${pin}<span class="go">${icon('map')}${W('map')}</span></button>`)
    }
    if (pl.addr) out.push(`<p class="addr">${esc(pl.addr)}</p>`)
    if (hasPin) {
      out.push('<div class="tools-row">',
        `<a class="btn dark" href="${esc(dirHref(pl.lat, pl.lng))}" rel="nofollow noopener">${icon('route')}Google Maps</a>`,
        `<a class="btn ghost" href="${esc(appleHref(pl.lat, pl.lng, name))}" rel="nofollow noopener">${icon('map')}Apple Maps</a>`,
        grabOk ? `<a class="btn grab" href="${esc(grabRide(pl.lat, pl.lng, name, pl.cc || 'TH'))}" rel="nofollow noopener">${icon('ride')}${W('ride')}</a>` : '',
        `<button class="btn ghost" id="far" data-lat="${pl.lat}" data-lng="${pl.lng}">${icon('near')}${W('far')}</button>`,
        '</div><p class="far" id="farout" aria-live="polite"></p>')
    }
    out.push('</section>')
  }

  if (line) {
    out.push(`<section class="card"><h2>LINE</h2><div class="lineqr">${qrSvg(line, { dark: '#06c755', light: '#0e1f3d', label: word(lang, 'scanLine') })}`,
      `<div><p>${W('scanLine')}</p><a class="btn line" href="${esc(line)}" rel="nofollow noopener">${icon('chat')}${W('line')}</a></div></div></section>`)
  }

  if (d.links.length) {
    out.push(`<section class="card links"><h2>${W('links')}</h2>`)
    for (const l of d.links) out.push(`<a class="btn ghost" href="${esc(l.u)}" rel="ugc nofollow noopener">${icon('link')}${esc(l.t || hostOf(l.u))}</a>`)
    out.push('</section>')
  }

  const rows = []
  if (c.phone) rows.push(`<a href="${esc(telHref(c.phone))}">${icon('phone')}${esc(c.phone)}</a>`)
  if (c.line) rows.push(line ? `<a href="${esc(line)}" rel="nofollow noopener">${icon('chat')}LINE · ${esc(c.line)}</a>` : `<span>${icon('chat')}LINE · ${esc(c.line)}</span>`)
  if (c.whatsapp) rows.push(`<a href="${esc(waHref(c.whatsapp))}" rel="nofollow noopener">${icon('chat')}WhatsApp · ${esc(c.whatsapp)}</a>`)
  for (const k of ['facebook', 'instagram', 'tiktok', 'youtube']) {
    const h = socialHref(k, c[k])
    if (h) rows.push(`<a href="${esc(h)}" rel="ugc nofollow noopener">${icon(k === 'instagram' || k === 'tiktok' || k === 'youtube' ? 'camera' : 'people')}${esc(k[0].toUpperCase() + k.slice(1))} · ${esc(c[k].replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))}</a>`)
  }
  if (c.email) rows.push(`<a href="mailto:${esc(c.email)}">${icon('mail')}${esc(c.email)}</a>`)
  if (c.web) rows.push(`<a href="${esc(c.web)}" rel="ugc nofollow noopener">${icon('globe')}${esc(hostOf(c.web))}</a>`)
  if (rows.length) {
    out.push(`<section class="card"><h2>${W('contact')}</h2><div class="contact">${rows.join('')}</div>`)
    if (c.phone || c.email || line) out.push(`<div class="tools-row"><a class="btn ghost" href="/~${esc(site.name)}/contact.vcf">${icon('download')}${W('saveContact')}</a></div>`)
    out.push('</section>')
  }
  if (lookId === 'lanna') out.push('<div class="kranok"></div>')
  out.push('</main>', foot(site, d, lang, url, opt, false))
  out.push(`<script type="application/json" id="pd">${JSON.stringify({ lang, name: site.name, url, accent, preview: !!opt.preview, w: Object.fromEntries(['happening', 'ended', 'farFrom', 'reportAsk', 'send', 'thanks', 'close', 'copied', 'orderHi'].map((k) => [k, word(lang, k)])) }).replace(/</g, '\\u003c')}</script>`)
  out.push(`<script${opt.nonce ? ` nonce="${opt.nonce}"` : ''} src="/~/s/page.js" defer></script></body></html>`)
  return out.join('')
}

function foot(site, d, lang, url, opt, held) {
  const W = (k, v) => esc(word(lang, k, v))
  const name = d.name || site.name
  const views = Number(site.views) || 0
  const parts = ['<footer class="foot">']
  if (!held) {
    parts.push('<div class="share">',
      `<button class="btn" id="share">${icon('share')}${W('share')}</button>`,
      `<a class="btn line" href="${esc(lineShare(name + ' ' + url))}" rel="nofollow noopener">${icon('chat')}${W('shareLine')}</a>`,
      `<button class="btn ghost" id="copy" data-done="${W('copied')}">${icon('link')}${W('copy')}</button>`, '</div>')
  }
  if (d.counter && site.look === 'y1997') parts.push(`<p><span class="odo">${String(views).padStart(6, '0').split('').map((n) => `<b>${n}</b>`).join('')}</span><br>${W('visits')}</p><p><span class="badge88">BEST VIEWED ON ANY PHONE</span></p>`)
  else if (d.counter) parts.push(`<p>${new Intl.NumberFormat(lang).format(views)} ${W('visits')}</p>`)
  parts.push('<nav>')
  if (!held) parts.push(`<a href="/~${esc(site.name)}/sign">${W('sign')}</a>`)
  parts.push(`<a href="/~/random">${W('random')}</a>`)
  if (!opt.preview) parts.push(`<a href="#report" id="report">${W('report')}</a>`)
  parts.push('</nav>', `<a class="made" href="/~/make">${icon('ant-solid')}${W('madeOn')} · ${W('makeOwn')}</a></footer>`)
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
  lines.push(`URL:https://motdang.net/~${site.name}`)
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
    `UID:${site.name}-${s}@motdang.net`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(s)}`, `DTEND:${f(e)}`,
    `SUMMARY:${t(d.name || site.name)}`, d.place.addr ? `LOCATION:${t(d.place.addr)}` : '',
    d.place.lat !== null ? `GEO:${d.place.lat};${d.place.lng}` : '', `URL:https://motdang.net/~${site.name}`,
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n') + '\r\n'
}

/** A printable A4 sign: name, the page's QR, LINE's QR, phone, hours. */
export function sign(site, opt = {}) {
  const d = normalize(site.d)
  const lang = PAGE_LANGS[site.lang] ? site.lang : 'en'
  const look = LOOKS[site.look] || LOOKS.poster
  const accent = d.accent || look.accent
  const url = `https://motdang.net/~${site.name}`
  const line = lineHref(d.contact.line)
  const W = (k, v) => esc(word(lang, k, v))
  const hrs = d.hours.on && !d.hours.always
    ? DAY_ORDER.map((i) => `<tr><td>${esc(dayName(lang, i))}</td><td>${d.hours.week[i] ? d.hours.week[i].map(([a, b]) => `${a}–${b}`).join(', ') : W('closed')}</td></tr>`).join('')
    : ''
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.name || site.name)} · ${W('sign')}</title>
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
<div class="qrs"><div class="q">${qrSvg(url, { dark: '#000', light: '#fff', label: url })}motdang.net/~${esc(site.name)}</div>${line ? `<div class="q">${qrSvg(line, { dark: '#06c755', light: '#0e1f3d', label: 'LINE' })}${W('scanLine')}</div>` : ''}</div>
${d.contact.phone ? `<div class="big">${W('call')} ${esc(d.contact.phone)}</div>` : ''}${d.hours.always ? `<div class="big">${W('open24')}</div>` : ''}${hrs ? `<table>${hrs}</table>` : ''}
<div class="url">motdang.net/~${esc(site.name)}</div></div><script${opt.nonce ? ` nonce="${opt.nonce}"` : ''}>document.getElementById('print').onclick=function(){print()}</script></body></html>`
}
