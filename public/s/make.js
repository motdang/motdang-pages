// make.js — the builder. Three questions (what for, what name, which look),
// then one form with the page itself beside it. Every change saves on its
// own; "Put it online" is the only button that matters. Beside the page:
// its messages, its traffic, and Gold.

import { render, normalize, LOOKS, LOOK_IDS, GOLD_LOOKS, lookOf, KINDS, ACCENTS, CURRENCY, SCENES, MAX_PHOTOS, osmHours, currencyFor, qrSvg, lineShare, esc } from './render.mjs'
import { MAX, UNIT_LABEL } from './extras.mjs'
import { DINGBATS } from './db/names.mjs'
import { PAGE_LANGS } from './words.mjs'
import { ui, UI_LANGS } from './make-words.mjs'
import { exifBlock, readExif } from './exif.mjs'
import { openStudio, openMark } from './studio-ui.mjs'
import { drawCard, cardKey, CARD } from './card.mjs'
import { loadFaces } from './mark.mjs'

const $ = (s, el = document) => el.querySelector(s)
const app = $('#app')
const store = {
  get(k, d) { try { const v = localStorage.getItem('mdp:' + k); return v === null ? d : JSON.parse(v) } catch { return d } },
  set(k, v) { try { localStorage.setItem('mdp:' + k, JSON.stringify(v)) } catch {} },
}
const icon = (id) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="/s/icons.svg#i-${id}"/></svg>`
const KIND_ICON = { shop: 'shop', food: 'food', service: 'gear', work: 'star', stay: 'moon', homes: 'tag', me: 'me', event: 'party', group: 'people' }
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'Asia/Bangkok' } })()

const S = {
  lang: store.get('lang', (() => { const l = (navigator.language || 'th').slice(0, 2); return UI_LANGS[l] ? l : 'th' })()),
  step: 'kind', kind: 'shop', name: '', addr: '', addrTouched: false, look: 'poster', accent: '', peek: '', token: '', status: 'draft', views: 0,
  pageLang: '', d: null, open: new Set(), local: new Map(), big: new Map(), photoGps: null, picker: null, busy: 0,
  tab: 'edit', tier: 'gold', goldUntil: '', notifyEmail: '', notifyOk: false, unread: 0, // a page starts with 30 days of Gold
  trial: false, asks: 0, domain: '', domainState: '', domains: false, price: 3000, dbFam: '', dbQ: '',
  plan: 'gold', hotel: true, plans: null, payPlan: '', part: '',
}
const isGold = () => S.tier === 'gold'
const ding = (n, look = 'ink', play = 'loop') => `<i data-dingbat="${n}" data-look="${look}" data-play="${play}" aria-hidden="true"></i>`
// the families the builder's own dingbats need, loaded once
let dbReady = null
function dingbats(fams) {
  const add = (src) => new Promise((ok) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ok; document.head.appendChild(s) })
  dbReady = (dbReady || add('/s/db/core.js')).then(() => Promise.all([...new Set(fams)].map((f) => (dingbats.loaded.has(f) ? null : (dingbats.loaded.add(f), add('/s/db/' + f + '.js'))))))
  return dbReady
}
dingbats.loaded = new Set()
dingbats(['signals', 'classic', 'kitchen', 'faces', 'lanna'])
const KIND_DING = { shop: 'cart', food: 'noodles', service: 'gear', work: 'nib', stay: 'key', homes: 'home', me: 'wave', event: 'party', group: 'crown' }
const DB_FAMS = [...new Set(Object.values(DINGBATS))]
const rid = () => Math.random().toString(36).slice(2, 8).padEnd(6, 'x')
// the dingbats a maker can put beside the name: a handful from each family
const DING_PICKS = ['lantern', 'naga', 'lotus', 'krathong', 'elephant', 'tuk-tuk', 'scooter', 'khao-soi', 'mango-rice', 'cha-yen', 'chili', 'frangipani', 'gecko', 'soi-dog',
  'coffee', 'noodles', 'bubble-tea', 'cake', 'dumplings', 'cocktail', 'beer', 'ice-cream', 'heart', 'star', 'sparkle', 'sun', 'flower', 'crown', 'note', 'scissors',
  'smile', 'wai', 'party', 'cool', 'heart-eyes', 'rock-on', 'butterfly', 'cat', 'leaf', 'rainbow', 'moon', 'koi', 'owl', 'bee', 'rocket', 'balloon', 'gift', 'camera',
  'string-lights', 'bunting', 'lai-kham'].filter((n) => DINGBATS[n])
const T = (k) => esc(ui(S.lang, k))

// ---- starting data per kind ---------------------------------------------------------

const DEFAULT_OPEN = {
  shop: ['words', 'photos', 'contact', 'map', 'hours', 'items'],
  food: ['words', 'photos', 'items', 'order', 'map', 'hours', 'contact'],
  service: ['words', 'face', 'photos', 'svc', 'items', 'contact', 'map'],
  work: ['words', 'face', 'works', 'photos', 'quotes', 'contact', 'links'],
  me: ['words', 'face', 'photos', 'links', 'contact'],
  stay: ['words', 'photos', 'rooms', 'ota', 'map', 'contact'],
  homes: ['words', 'lists', 'photos', 'contact', 'map'],
  event: ['event', 'words', 'cal', 'photos', 'map', 'contact'],
  group: ['words', 'cal', 'photos', 'links', 'contact'],
}
const LOOK_FOR = { shop: 'poster', food: 'night', service: 'loom', work: 'clean', stay: 'lanna', homes: 'clean', me: 'stitch', event: 'poster', group: 'stitch' }

function guessCc() {
  const zone = { 'Asia/Bangkok': 'TH', 'Asia/Yangon': 'MM', 'Asia/Rangoon': 'MM', 'Asia/Vientiane': 'LA', 'Asia/Phnom_Penh': 'KH',
    'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Singapore': 'SG', 'Asia/Jakarta': 'ID',
    'Asia/Manila': 'PH', 'Asia/Shanghai': 'CN', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Taipei': 'TW', 'Asia/Hong_Kong': 'HK' }[TZ]
  if (zone) return zone
  const m = /-([A-Z]{2})$/.exec(navigator.language || '')
  return m ? m[1] : ''
}

function starter(kind) {
  const week = (open) => Array.from({ length: 7 }, (_, i) => (open(i) ? [['09:00', '18:00']] : null))
  const d = {
    name: S.name, tagline: '', about: '', photos: [], items: [], links: [], contact: {}, order: {},
    place: { lat: null, lng: null, addr: '', cc: guessCc(), snap: '', zoom: 16 },
    hours: { on: kind === 'shop' || kind === 'food', always: false, tz: TZ, week: week((i) => kind === 'food' || i < 6), note: '' },
    counter: kind === 'me', accent: '',
  }
  if (kind === 'food') d.hours.week = d.hours.week.map(() => [['10:00', '20:00']])
  if (kind === 'stay') d.rooms = [{ id: rid(), n: '', guests: 2, beds: '', p: '', note: '', photos: [], ical: [] }]
  if (kind === 'homes') d.lists = [{ id: rid(), t: '', deal: 'sale', status: 'open', p: '', area: '', unit: 'm2', beds: 0, baths: 0, kind: '', note: '', photos: [] }]
  if (kind === 'service') d.svc = []
  if (kind === 'event') {
    const t = new Date(Date.now() + 7 * 864e5)
    const p = (n) => String(n).padStart(2, '0')
    d.event = { start: `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T18:00`, end: '', tz: TZ }
  }
  return d
}

// ---- address suggestions ----------------------------------------------------------------

const TH_INIT = { ก: 'k', ข: 'kh', ฃ: 'kh', ค: 'kh', ฅ: 'kh', ฆ: 'kh', ง: 'ng', จ: 'ch', ฉ: 'ch', ช: 'ch', ซ: 's', ฌ: 'ch', ญ: 'y',
  ฎ: 'd', ฏ: 't', ฐ: 'th', ฑ: 'th', ฒ: 'th', ณ: 'n', ด: 'd', ต: 't', ถ: 'th', ท: 'th', ธ: 'th', น: 'n', บ: 'b', ป: 'p', ผ: 'ph',
  ฝ: 'f', พ: 'ph', ฟ: 'f', ภ: 'ph', ม: 'm', ย: 'y', ร: 'r', ล: 'l', ว: 'w', ศ: 's', ษ: 's', ส: 's', ห: 'h', ฬ: 'l', อ: '', ฮ: 'h' }
const TH_FIN = { ก: 'k', ข: 'k', ค: 'k', ฆ: 'k', ง: 'ng', จ: 't', ช: 't', ซ: 't', ฌ: 't', ญ: 'n', ฎ: 't', ฏ: 't', ฐ: 't', ฑ: 't',
  ฒ: 't', ณ: 'n', ด: 't', ต: 't', ถ: 't', ท: 't', ธ: 't', น: 'n', บ: 'p', ป: 'p', พ: 'p', ฟ: 'p', ภ: 'p', ม: 'm', ย: 'i', ร: 'n',
  ล: 'n', ว: 'o', ศ: 't', ษ: 't', ส: 't', ฬ: 'n' }
const TH_LEAD = { เ: 'e', แ: 'ae', โ: 'o', ใ: 'ai', ไ: 'ai' }
const TH_VOW = { 'ะ': 'a', 'ั': 'a', 'า': 'a', 'ำ': 'am', 'ิ': 'i', 'ี': 'i', 'ึ': 'ue', 'ื': 'ue', 'ุ': 'u', 'ู': 'u', 'ฤ': 'rue' }
const SKIP = /[่้๊๋็ๆฯ]/
const CLUSTER = /[รลว]/

/** A rough Latin spelling of a Thai name, good enough to suggest an address. */
export function romanizeThai(s) {
  const c = [...s]
  let out = '', lead = '', state = 'init'
  const isCons = (x) => x in TH_INIT
  const nextReal = (i) => { let j = i + 1; while (j < c.length && SKIP.test(c[j])) j++; return c[j] }
  for (let i = 0; i < c.length; i++) {
    const x = c[i]
    if (SKIP.test(x)) continue
    if (c[i + 1] === '์') { i++; continue }
    if (x in TH_LEAD) { lead = TH_LEAD[x]; state = 'init'; continue }
    if (x in TH_VOW) { out += TH_VOW[x]; state = 'coda'; continue }
    if (!isCons(x)) { out += /[a-z0-9]/i.test(x) ? x.toLowerCase() : ' '; state = 'init'; continue }
    const n = nextReal(i)
    const nextVowel = n && (n in TH_VOW)
    if (state === 'init') {
      out += TH_INIT[x]
      if (n && isCons(n) && CLUSTER.test(n) && !lead && 'กขคตปพผ'.includes(x) && c[i + 2] && (c[i + 2] in TH_VOW || c[i + 2] in TH_LEAD)) { out += TH_INIT[n]; i++ }
      if (lead) { out += lead; lead = ''; state = 'coda' } else state = 'nuc'
      continue
    }
    if (state === 'nuc') {
      if (x === 'อ' || x === 'ว' && !nextVowel) { out += x === 'อ' ? 'o' : 'ua'; state = 'coda'; continue }
      if (nextVowel) { out += 'a' + TH_INIT[x]; state = 'nuc'; continue }
      out += 'o' + (TH_FIN[x] || ''); state = 'init'; continue
    }
    // coda
    if (nextVowel) { out += TH_INIT[x]; state = 'nuc'; continue }
    out += TH_FIN[x] || ''; state = 'init'
  }
  return out
}

export function slugify(name, kind) {
  let s = String(name || '').trim()
  if (/[฀-๿]/.test(s)) s = romanizeThai(s)
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-').slice(0, 30).replace(/-+$/, '')
  if (s.length < 3) s = (kind || 'page') + '-' + Math.floor(1000 + Math.random() * 9000)
  return s
}

// ---- server ----------------------------------------------------------------------------

async function call(method, path, body, isForm) {
  const h = {}
  if (S.token) h['x-edit'] = S.token
  if (body && !isForm) h['content-type'] = 'application/json'
  const r = await fetch('/api/' + path, { method, headers: h, body: isForm ? body : body ? JSON.stringify(body) : undefined })
  let j = {}
  try { j = await r.json() } catch {}
  if (!r.ok) throw Object.assign(new Error(j.error || 'http-' + r.status), { status: r.status, why: j.why })
  return j
}

function remember() {
  const list = store.get('pages', []).filter((p) => p.token !== S.token)
  list.unshift({ name: S.name, token: S.token, title: S.d?.name || S.name })
  store.set('pages', list.slice(0, 20))
}

// ---- drawing ---------------------------------------------------------------------------

function langs() {
  $('#langs').innerHTML = Object.entries(UI_LANGS).map(([k, v]) => `<button data-lang="${k}"${k === S.lang ? ' class="on"' : ''}>${esc(v)}</button>`).join('')
  document.documentElement.lang = S.lang
}
$('#langs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-lang]')
  if (!b) return
  S.lang = b.dataset.lang
  store.set('lang', S.lang)
  draw()
})

function draw() {
  langs()
  if (S.step !== 'edit') return drawTry()
  return drawEdit()
}

// ---- the first screen: the page itself, drawn as the maker types (Nan 2026-10-15: lead with why,
// lead with "try it", be not afraid, what you see is what you get) ----------------------------

// a picture for each kind (tools/kinds.py): the tile, and the new page's cover until the maker adds a photo
let KPIC = {}
const kpicReady = fetch('/s/kinds/kinds.json').then((r) => r.json()).then((j) => { KPIC = j }).catch(() => {})
const KPIC_ID = 'kindpic000000'
const kpicUrl = (kind, small) => `/s/kinds/${kind}${small ? '-s' : ''}.webp`

// On the first screen the phone shows each kind's own parts filled in with examples, so a hotel shows
// rooms and a noodle shop a menu; the box above it says they are examples. The new page starts empty.
function examples(kind, lang) {
  const th = lang === 'th'
  const day = (n, hh) => { const t = new Date(Date.now() + n * 864e5); const p = (x) => String(x).padStart(2, '0'); return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${hh}` }
  const x = {}
  const parts = DEFAULT_OPEN[kind] || []
  if (parts.includes('map')) x.place = { lat: 18.78772, lng: 98.99331, addr: th ? 'ถนนท่าแพ เชียงใหม่' : 'Tha Phae Road, Chiang Mai', cc: 'TH', snap: '', zoom: 16 }
  if (parts.includes('items')) x.items = {
    shop: th ? [['ถุงผ้าฝ้าย', '250'], ['โปสการ์ด ชุดละ 6 ใบ', '120'], ['ชาอู่หลง 100 กรัม', '180']] : [['Cotton bag', '250'], ['Postcards, set of 6', '120'], ['Oolong tea, 100 g', '180']],
    food: th ? [['ข้าวซอยไก่', '60'], ['กะเพราหมูสับ ไข่ดาว', '55'], ['ชาเย็น', '30']] : [['Khao soi with chicken', '60'], ['Kaphrao with fried egg', '55'], ['Thai iced tea', '30']],
    service: th ? [['นวดไทย 1 ชั่วโมง', '300'], ['นวดเท้า', '250']] : [['Thai massage, 1 hour', '300'], ['Foot massage', '250']],
  }[kind]?.map(([n, p]) => ({ n, p, note: '' }))
  if (parts.includes('svc')) x.svc = th ? [{ n: 'นวดไทย', mins: 60, p: '300' }, { n: 'นวดน้ำมัน', mins: 90, p: '500' }] : [{ n: 'Thai massage', mins: 60, p: '300' }, { n: 'Oil massage', mins: 90, p: '500' }]
  if (parts.includes('rooms')) x.rooms = [
    { n: th ? 'ห้องริมสวน' : 'Garden room', guests: 2, beds: th ? 'เตียงควีน 1' : '1 queen bed', p: '900', p2: '1100', photos: [KPIC_ID] },
    { n: th ? 'ห้องครอบครัว' : 'Family room', guests: 4, beds: th ? 'เตียงคู่ 2' : '2 double beds', p: '1500', photos: [] },
  ]
  if (parts.includes('lists')) x.lists = [
    { t: th ? 'บ้านไม้สัก 3 ห้องนอน' : 'Teak house, 3 bedrooms', deal: 'sale', p: '4500000', area: '320', beds: 3, baths: 2, photos: [KPIC_ID] },
    { t: th ? 'สตูดิโอใกล้นิมมาน' : 'Studio near Nimman', deal: 'rent', p: '9000', area: '32', beds: 1, baths: 1, photos: [] },
  ]
  if (parts.includes('works')) x.works = [
    { t: th ? 'งานแต่ง ดอยสุเทพ' : 'A wedding on Doi Suthep', year: '2026', tags: th ? 'งานแต่ง' : 'weddings', photos: [KPIC_ID] },
    { t: th ? 'รูปเมนูร้านกาแฟ' : 'Menu photos for a café', year: '2025', tags: th ? 'อาหาร' : 'food', photos: [KPIC_ID] },
  ]
  if (parts.includes('quotes')) x.quotes = [{ q: th ? 'เร็ว ใจดี และรูปสวยมาก' : 'Quick, kind, and the photos were beautiful.', who: 'Ploy' }]
  if (parts.includes('links')) x.links = [{ t: 'Facebook', u: 'https://www.facebook.com/' }, { t: 'Instagram', u: 'https://www.instagram.com/' }]
  if (parts.includes('cal')) x.cal = [
    { t: th ? 'นัดพบประจำเดือน' : 'Monthly meet-up', start: day(5, '18:00'), end: '20:00', rep: 'monthly' },
    { t: th ? 'ตลาดนัดวันเสาร์' : 'Saturday market', start: day(2, '16:00'), end: '21:00', rep: 'weekly' },
  ]
  return x
}

function tryData() {
  const d = normalize(applyPrefill({ ...starter(S.kind), ...examples(S.kind, S.pageLangTry || 'en'), name: S.name.trim() || ui(S.lang, 'yourName'), accent: S.accent || '' }))
  if (KPIC[S.kind]) { d.cover = KPIC_ID; d.photos = [KPIC_ID]; d.credits = { [KPIC_ID]: { title: KPIC[S.kind].title, by: 'Wikimedia Commons', src: KPIC[S.kind].src, license: KPIC[S.kind].license, from: 'commons' } } }
  return d
}

// The two pickers (Nan 2026-10-15, "Level 1/10. Bring it up to 11."; notes/pickers-2026-10-15.txt):
// every kind on screen with what its page gets, every look a small copy of the page with the
// maker's name in it, a colour now, and the look changed on the phone itself.
const shownName = () => S.name.trim() || ui(S.lang, 'yourName')
// (SECTIONS and PART are declared further down, so these are worked out on first use)
let SEC_ICON = null, PART_AT = null
const secIcon = (p) => (SEC_ICON ||= Object.fromEntries(SECTIONS.map(([id, ic, , g]) => [id, [ic, g]])))[p]
// where each part sits on the page, for "tap one to see it"
function partAt(p) {
  if (!PART_AT) { PART_AT = { photos: '.gallery, header.top img:not(.av)', ota: '#rooms', face: 'header.top', order: 'nav.reach, ul.menu', event: '.when, #count' }; for (const [sel, part] of PART) if (!PART_AT[part]) PART_AT[part] = sel }
  return PART_AT[p]
}

function kindTile(k) {
  return `<button class="kind${k === S.kind ? ' on' : ''}" data-kind="${k}" aria-pressed="${k === S.kind}">${KPIC[k] ? `<img src="${kpicUrl(k, true)}" alt="" loading="lazy">` : `<span class="kd">${ding(KIND_DING[k] || 'star', 'paper')}</span>`}<b>${T('k_' + k)}</b><small>${T('h_' + k)}</small></button>`
}

function getsHtml() {
  return `<p class="gl">${T('gets')} <span>${T('getsTap')} ${T('exNote')}</span></p><div class="getchips">${(DEFAULT_OPEN[S.kind] || []).map((p) => {
    const [ic, g] = secIcon(p) || ['star']
    return `<button class="chip" data-at="${p}">${icon(ic)}${T('s_' + p)}${g ? '<i>★</i>' : ''}</button>`
  }).join('')}</div>`
}

function lookTile(id) {
  const L = LOOKS[id]
  return `<button class="lp${id === S.look ? ' on' : ''}" data-look="${id}" aria-pressed="${id === S.look}">
    <span class="mp"><iframe data-th="${id}" tabindex="-1" aria-hidden="true" sandbox="allow-same-origin" scrolling="no" loading="lazy" title=""></iframe></span>
    <span class="lkt"><b>${T('lk_' + id)}${L.gold ? `<i class="gtag">★ ${T('tagGold')}</i>` : ''}</b><small>${T('m_' + id)}</small></span></button>`
}

// Each look tile is the page itself in that look, the top of it, drawn by the same render() and
// scaled down: what the maker picks is what the page will be.
const THUMB_W = 390, THUMB_H = 660
function thumbData() { return S.step === 'edit' && S.d ? { ...S.d, name: S.d.name || S.name } : tryData() }
function fillThumbs(root = app) {
  const d = thumbData()
  root.querySelectorAll('iframe[data-th]').forEach((f) => {
    const id = f.dataset.th
    const html = render({ name: S.addr || S.name || 'your-page', look: id, lang: (S.step === 'edit' ? S.pageLang : S.pageLangTry) || 'en', kind: S.kind, d, views: 1234, status: 'live', tier: 'gold' },
      { preview: true, thumb: true, gold: true, hotel: true, origin: location.origin, img: (x, small) => (x === KPIC_ID ? kpicUrl(S.kind, small) : imgUrl(x, small)) })
    if (f.dataset.html !== html) { f.dataset.html = html; f.srcdoc = html }
  })
  sizeThumbs(root)
}
function sizeThumbs(root = app) {
  root.querySelectorAll('.mp').forEach((m) => m.style.setProperty('--k', String(m.clientWidth / THUMB_W)))
}
let thumbTimer = 0
const thumbsSoon = (ms = 600) => { clearTimeout(thumbTimer); thumbTimer = setTimeout(() => fillThumbs(), ms) }
addEventListener('resize', () => sizeThumbs())

function accDots() {
  const own = LOOKS[S.look].accent
  return `<button class="ad own${S.accent ? '' : ' on'}" data-acc="" style="--c:${own}" title="${T('lookOwn')}" aria-label="${T('lookOwn')}"></button>` +
    ACCENTS.filter((c) => c !== own).map((c) => `<button class="ad${S.accent === c ? ' on' : ''}" data-acc="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')
}

function lookNav() {
  return `<button class="ln" id="lkprev" aria-label="${T('prevLook')}">‹</button><span><b>${T('lk_' + S.look)}</b><small>${T('swipe')}</small></span><button class="ln" id="lknext" aria-label="${T('nextLook')}">›</button>`
}

// after a kind, look or colour changes: the tiles, the chips and the phone, the name box untouched
function syncPick() {
  app.querySelectorAll('.kind').forEach((x) => { const on = x.dataset.kind === S.kind; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on) })
  const g = $('#gets'); if (g) g.innerHTML = getsHtml()
  const l = $('#lks'); if (l) l.innerHTML = LOOK_IDS.map(lookTile).join('')
  const a = $('#accs'); if (a) a.innerHTML = accDots()
  const n = $('#lknav'); if (n) n.innerHTML = lookNav()
  wirePick()
  fillThumbs()
}

function setLook(id, how) {
  if (!LOOKS[id] || id === S.look) return
  S.look = S.lookWanted = id
  if (S.accent === LOOKS[id].accent) S.accent = ''
  syncPick()
  const sh = $('.tphone .shell')
  if (sh) { sh.classList.remove('flip', 'fl', 'fr'); void sh.offsetWidth; sh.classList.add('flip', how === 'prev' ? 'fr' : 'fl') }
  tryPreview(0)
}
const stepLook = (n) => setLook(LOOK_IDS[(LOOK_IDS.indexOf(S.look) + n + LOOK_IDS.length) % LOOK_IDS.length], n < 0 ? 'prev' : 'next')

// "tap one to see it on the page": the phone scrolls to the part and lights it
function showPart(p) {
  const f = $('#tryframe'), doc = f?.contentDocument
  const el = doc && ((partAt(p) && doc.querySelector(partAt(p))) || doc.querySelector('header.top'))
  if (!el) return
  const sh = $('.tphone .shell').getBoundingClientRect()
  if (sh.top > innerHeight * 0.55 || sh.bottom < 80) window.scrollBy({ top: sh.top - 70, behavior: 'smooth' })
  f.contentWindow.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + f.contentWindow.scrollY - 60), behavior: 'smooth' })
  doc.querySelectorAll('.mk-flash').forEach((x) => x.classList.remove('mk-flash'))
  void el.offsetWidth
  el.classList.add('mk-flash')
}

let peekTimer = 0
function wirePick() {
  app.querySelectorAll('.chip').forEach((b) => (b.onclick = () => {
    app.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b))
    showPart(b.dataset.at)
  }))
  app.querySelectorAll('.lp').forEach((b) => {
    b.onclick = () => { clearTimeout(peekTimer); S.peek = ''; setLook(b.dataset.look, 'next') }
    // pointing at a look shows it on the phone; moving away puts the picked one back
    b.onmouseenter = () => {
      if (!matchMedia('(hover:hover)').matches || b.dataset.look === S.look) return
      clearTimeout(peekTimer); peekTimer = setTimeout(() => { S.peek = b.dataset.look; tryPreview(0) }, 140)
    }
  })
  const lks = $('#lks')
  if (lks) lks.onmouseleave = () => { clearTimeout(peekTimer); if (S.peek) { S.peek = ''; tryPreview(0) } }
  app.querySelectorAll('.ad').forEach((b) => (b.onclick = () => { S.accent = b.dataset.acc; syncPick(); tryPreview(0) }))
  const p = $('#lkprev'), n = $('#lknext')
  if (p) p.onclick = () => stepLook(-1)
  if (n) n.onclick = () => stepLook(1)
}

function drawTry() {
  if (!Object.keys(KPIC).length) kpicReady.then(() => { if (S.step !== 'edit' && Object.keys(KPIC).length && $('#nm')) { const f = document.activeElement?.id; drawTry(); if (f) $('#' + f)?.focus() } })
  const mine = store.get('pages', [])
  const pageLang = PAGE_LANGS[S.lang] ? S.lang : 'en'
  app.innerHTML = `<section class="try">
    <div class="tw"><p class="why">${T('why')}</p><p class="why2">${T('why2')}</p>
      <h1 class="q">${T('try')}</h1>
      <input id="nm" class="bigname" maxlength="60" autocomplete="off" placeholder="${T('ph')}" value="${esc(S.name)}"></div>
    <div class="tphone"><div class="shell"><div class="url">${icon('globe')}<span>sites.motdang.net/<b id="pvaddr">${esc(S.addr || '…')}</b></span></div><iframe id="tryframe" title="${T('preview')}"></iframe></div>
      <div class="lknav" id="lknav">${lookNav()}</div></div>
    <div class="tkind"><p class="lbl">${T('for')}</p>
      <div class="kinds">${KINDS.map(kindTile).join('')}</div>
      <div class="gets" id="gets">${getsHtml()}</div></div>
    <div class="tlook">
      <div class="lbrow"><p class="lbl">${T('look')}</p><button class="dice" id="dice">${ding('sparkle', 'ink')}${T('surprise')}</button></div>
      <div class="lks" id="lks">${LOOK_IDS.map(lookTile).join('')}</div>
      <div class="accrow"><span>${T('colour')}</span><div class="accs" id="accs">${accDots()}</div></div></div>
    <div class="tpick">
      <label class="field taddr"><span>${T('addr')}</span><div class="addr"><span>sites.motdang.net/</span><input id="ad" maxlength="30" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="url" value="${esc(S.addr)}"></div><span class="avail" id="av"></span></label>
      <div class="row"><button class="go big" id="next">${T('go')} →</button></div>
      <p class="afraid">${ding('heart', 'paper')}${T('afraid')}</p>
      ${mine.length ? `<section class="mine"><h2>${T('mine')}</h2>${mine.map((p) => `<a href="/make#t=${esc(p.token)}">${esc(p.title)}<span>sites.motdang.net/${esc(p.name)}</span></a>`).join('')}</section>` : ''}
    </div></section>`
  const nm = $('#nm'), ad = $('#ad')
  if (matchMedia('(min-width:980px)').matches || S.name) nm.focus()
  nm.oninput = () => {
    S.name = nm.value
    if (!S.addrTouched) { ad.value = S.addr = slugify(nm.value, S.kind) }
    $('#pvaddr').textContent = S.addr || '…'
    // the name changes in the page and in every look at once; the whole page is drawn again when typing stops
    const h1 = $('#tryframe').contentDocument?.querySelector('header.top h1')
    if (h1) h1.textContent = shownName()
    thumbsSoon(700)
    tryPreview(700)
    check()
  }
  ad.oninput = () => { S.addrTouched = true; ad.value = ad.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); S.addr = ad.value; $('#pvaddr').textContent = S.addr || '…'; check() }
  nm.onkeydown = ad.onkeydown = (e) => { if (e.key === 'Enter') $('#next').click() }
  app.querySelectorAll('.kind').forEach((b) => (b.onclick = () => {
    S.kind = b.dataset.kind
    if (!S.lookWanted) { S.look = LOOK_FOR[S.kind] || S.look; if (S.accent === LOOKS[S.look].accent) S.accent = '' }
    if (!S.addrTouched && S.name) { ad.value = S.addr = slugify(S.name, S.kind); check() }
    syncPick()
    tryPreview(0)
  }))
  $('#dice').onclick = () => {
    const others = LOOK_IDS.filter((x) => x !== S.look)
    const id = others[Math.floor(Math.random() * others.length)]
    S.accent = Math.random() < 0.5 ? '' : ACCENTS[Math.floor(Math.random() * ACCENTS.length)]
    if (S.accent === LOOKS[id].accent) S.accent = ''
    setLook(id, 'next')
  }
  wirePick()
  $('#next').onclick = () => {
    if (!S.name.trim()) { nm.focus(); nm.classList.add('nudge'); setTimeout(() => nm.classList.remove('nudge'), 600); return }
    if (availOk) create(S.look, $('#next'))
  }
  app.querySelectorAll('.mine a').forEach((a) => (a.onclick = (e) => { e.preventDefault(); history.replaceState(null, '', a.getAttribute('href')); boot() }))
  S.pageLangTry = pageLang
  if (S.addr) check()
  kpicReady.then(() => { tryPreview(0); fillThumbs() })
}

let tryTimer = 0
function tryPreview(ms) {
  clearTimeout(tryTimer)
  tryTimer = setTimeout(() => {
    const f = $('#tryframe')
    if (!f) return
    const y = f.contentWindow?.scrollY || 0
    f.srcdoc = render({ name: S.addr || 'your-page', look: S.peek || S.look, lang: S.pageLangTry || 'en', kind: S.kind, d: tryData(), views: 1234, status: 'live', tier: 'gold' },
      { preview: true, gold: true, hotel: true, origin: location.origin, img: (id, small) => (id === KPIC_ID ? kpicUrl(S.kind, small) : imgUrl(id, small)) })
    f.onload = () => {
      try {
        f.contentWindow.scrollTo(0, y)
        // a tap on the page's name goes to the name box; links stay inside; a sideways swipe is another look
        const doc = f.contentDocument
        const st = doc.createElement('style')
        st.textContent = '.mk-flash{outline:4px solid #ffb000!important;outline-offset:4px;border-radius:8px;animation:mkf 1.8s ease-out}@keyframes mkf{0%,40%{outline-color:#ffb000}100%{outline-color:#ffb00000}}'
        doc.head.appendChild(st)
        doc.addEventListener('click', (e) => { const a = e.target.closest('a[href]'); if (a && !a.getAttribute('href').startsWith('#')) e.preventDefault(); if (e.target.closest('header.top')) $('#nm')?.focus() }, true)
        let x0 = 0, y0 = 0
        doc.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY }, { passive: true })
        doc.addEventListener('touchend', (e) => {
          const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0
          if (Math.abs(dx) > 60 && Math.abs(dy) < Math.abs(dx) * 0.6) stepLook(dx < 0 ? 1 : -1)
        }, { passive: true })
      } catch {}
    }
  }, ms)
}

let availTimer = 0, availOk = false
function check() {
  const av = $('#av'), next = $('#next')
  availOk = false
  next.disabled = true
  clearTimeout(availTimer)
  if (!S.addr) { av.textContent = ''; next.disabled = false; return }
  av.className = 'avail'; av.textContent = ui(S.lang, 'a_wait')
  availTimer = setTimeout(async () => {
    try {
      const r = await call('GET', 'name?n=' + encodeURIComponent(S.addr))
      // a taken address the maker did not type: the next free one, -2, -3 …
      if (!r.ok && (r.why || 'taken') === 'taken' && !S.addrTouched && $('#ad')) {
        const m = /^(.*?)(?:-(\d+))?$/.exec(S.addr)
        const n = (+m[2] || 1) + 1
        if (n <= 9) { S.addr = `${m[1].slice(0, 27)}-${n}`; $('#ad').value = S.addr; const pa = $('#pvaddr'); if (pa) pa.textContent = S.addr; return check() }
      }
      availOk = r.ok
      av.className = 'avail ' + (r.ok ? 'ok' : 'no')
      av.innerHTML = r.ok ? `${icon('check')}${T('a_ok')}` : esc(ui(S.lang, 'a_' + (r.why || 'taken')))
      next.disabled = !r.ok
    } catch { av.textContent = ui(S.lang, 'e_net') }
  }, 350)
}

function lookCard(id, on) {
  const L = LOOKS[id]
  const locked = L.gold && !isGold()
  return `<button class="lp${on ? ' on' : ''}" data-look="${id}" aria-pressed="${on}">
    <span class="mp"><iframe data-th="${id}" tabindex="-1" aria-hidden="true" sandbox="allow-same-origin" scrolling="no" loading="lazy" title=""></iframe></span>
    <span class="lkt"><b>${T('lk_' + id)}${L.gold ? `<i class="gtag">★ ${locked ? T('goldLock') : T('tagGold')}</i>` : ''}</b><small>${T('m_' + id)}</small></span></button>`
}

function goldTease() {
  toast(ui(S.lang, 'goldLock') + ' ★')
}

// A place page on motdang.net sends what its record holds in the hash: pin=lat,lng  tel=  ad=  cc=
// hrs=Monday..Sunday joined by '.', a day = '0900-1800' (ranges joined by ','), 'x' = closed, 'a' = always.
function prefill(h) {
  const pre = {}
  const m = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(h.get('pin') || '')
  if (m && Math.abs(+m[1]) <= 85 && Math.abs(+m[2]) <= 180) pre.pin = [+m[1], +m[2]]
  const tel = (h.get('tel') || '').replace(/[^\d+ ()-]/g, '').slice(0, 30)
  if (tel) pre.tel = tel
  const ad = (h.get('ad') || '').slice(0, 200)
  if (ad) pre.ad = ad
  if (/^[A-Z]{2}$/.test(h.get('cc') || '')) pre.cc = h.get('cc')
  const hv = h.get('hrs') || ''
  if (hv === 'a') pre.hours = 'a'
  else {
    const days = hv.split('.')
    if (days.length === 7) {
      const week = days.map((x) => (x === 'x' ? null : x.split(',').map((r) => /^(\d{2})(\d{2})-(\d{2})(\d{2})$/.exec(r)).filter(Boolean).map((q) => [`${q[1]}:${q[2]}`, `${q[3]}:${q[4]}`])))
      if (week.some((x) => x && x.length)) pre.hours = week.map((x) => (x && x.length ? x : null))
    }
  }
  return Object.keys(pre).length ? pre : null
}
function applyPrefill(d) {
  const p = S.pre
  if (!p) return d
  if (p.pin) d.place = { ...d.place, lat: p.pin[0], lng: p.pin[1], addr: p.ad || d.place.addr, cc: p.cc || d.place.cc }
  else if (p.ad) d.place = { ...d.place, addr: p.ad }
  if (p.tel) d.contact = { ...d.contact, phone: p.tel }
  if (p.hours === 'a') d.hours = { ...d.hours, on: true, always: true }
  else if (p.hours) d.hours = { ...d.hours, on: true, always: false, week: p.hours }
  return d
}

// the kind's picture goes on as the cover, credited, so the page looks like the one on the first screen
async function starterPic(kind) {
  S.busy++
  redrawSec('photos')
  try {
    const bmp = await createImageBitmap(await (await fetch(kpicUrl(kind))).blob())
    await addBitmap(bmp, KPIC[kind].pd)
    changed()
  } catch {}
  S.busy--
  redrawSec('photos')
}

async function create(look, btn) {
  S.look = look
  btn.classList.add('on')
  S.d = normalize(applyPrefill({ ...starter(S.kind), name: S.name.trim(), accent: S.accent || '' }))
  if (S.kind === 'event') S.d.event = starter('event').event
  if (S.kind === 'stay') S.d.rooms = [NEW_ROW.rooms()]
  if (S.kind === 'homes') S.d.lists = [NEW_ROW.lists()]
  if (S.kind === 'work') S.d.works = [NEW_ROW.works()]
  S.pageLang = PAGE_LANGS[S.lang] ? S.lang : 'en'
  try {
    const r = await call('POST', 'sites', { name: S.addr, kind: S.kind, look, lang: S.pageLang, d: S.d, by: new URLSearchParams(location.search).get('by') || '' })
    S.token = r.token; S.name = r.name; S.status = r.status; S.tier = r.tier || 'gold'; S.goldUntil = r.gold_until || ''; S.trial = !!r.trial; S.hotel = !!r.trial
    history.replaceState(null, '', '/make#t=' + S.token)
    remember()
    S.open = new Set(DEFAULT_OPEN[S.kind]); S.part = ''
    S.step = 'edit'
    draw()
    if (KPIC[S.kind]) starterPic(S.kind)
  } catch (e) {
    toast(ui(S.lang, e.message === 'quota' ? 'e_quota' : e.message === 'name' ? 'e_name' : 'e_net'))
    if (e.message === 'name') { S.step = 'name'; draw() }
  }
}

// ---- the editor ------------------------------------------------------------------------

const SECTIONS = [
  ['event', 'cal', 's_event'], ['words', 'note', 's_words'], ['face', 'me', 's_face'], ['works', 'star', 's_works'], ['drawing', 'sparkle', 's_drawing'], ['photos', 'camera', 's_photos'], ['quotes', 'chat', 's_quotes'],
  ['rooms', 'moon', 's_rooms', 'gold'], ['ota', 'globe', 's_ota', 'gold'], ['lists', 'tag', 's_lists', 'gold'], ['svc', 'clock', 's_svc', 'gold'], ['items', 'tag', 's_items'],
  ['cal', 'cal', 's_cal'], ['camps', 'party', 's_camps', 'gold'],
  ['order', 'basket', 's_order'], ['contact', 'phone', 's_contact'], ['map', 'pin', 's_map'], ['spots', 'compass', 's_spots'], ['hours', 'clock', 's_hours'],
  ['links', 'link', 's_links'], ['msg', 'mail', 's_msg'], ['look', 'star', 's_look'], ['video', 'camera', 's_video', 'gold'],
]

function hasData(id) {
  const d = S.d
  return { event: !!d.event, words: true, drawing: true, photos: d.photos.length > 0, items: d.items.length > 0, order: !!(d.order.grabfood || d.order.lineman),
    contact: Object.values(d.contact).some(Boolean), map: d.place.lat !== null || !!d.place.addr, hours: d.hours.on, links: d.links.length > 0, msg: true, look: true,
    video: !!d.video, spots: d.spots.length > 0, cal: d.cal.length > 0, ota: !!(d.ota.agoda || d.ota.booking), camps: d.camps.length > 0, svc: d.svc.length > 0, rooms: d.rooms.length > 0, lists: d.lists.length > 0, face: !!d.avatar, works: d.works.length > 0, quotes: d.quotes.length > 0 }[id]
}

function tabs() {
  const t = (id, label, extra = '') => `<button data-tab="${id}"${S.tab === id ? ' class="on"' : ''}>${label}${extra}</button>`
  const bk = S.d && (S.d.svc.length || S.d.rooms.length) ? t('book', T('t_book'), S.asks ? `<span class="dot">${S.asks}</span>` : '') : ''
  return `<nav class="tabs">${t('edit', T('t_edit'))}${t('msgs', T('t_msgs'), S.unread ? `<span class="dot">${S.unread}</span>` : '')}${bk}${t('stats', T('t_stats'))}${t('gold', (isGold() ? '★ ' : '') + T('t_gold'))}</nav>`
}

// The editor is the page and six parts under it (Nan 2026-10-15: lead with why, try it, be not afraid,
// what you see is what you get). A part is a card with a picture of what it puts on the page, a line on
// why, and what it holds now; one opens at a time, beside the page on a wide screen and as a sheet under
// the page on a phone. The page lights the part that is open.
const GROUPS = [
  ['words', ['event', 'words'], 'pencil'],
  ['pics', ['photos', 'drawing', 'face', 'video'], 'camera'],
  ['offer', ['items', 'works', 'amulets', 'svc', 'rooms', 'lists', 'ota', 'cal', 'camps', 'quotes'], 'cart'],
  ['reach', ['contact', 'order', 'msg', 'links'], 'telephone'],
  ['where', ['map', 'hours', 'spots'], 'compass'],
  ['look', ['look'], 'sparkle'],
]
const groupOf = (id) => (GROUPS.find(([g, ids]) => g === id || ids.includes(id)) || GROUPS[0])[0]
const secRow = (id) => SECTIONS.find((x) => x[0] === id)
const narrow = () => window.innerWidth < 980

function groupTitle(g) {
  if (g !== 'offer') return T('g_' + g)
  const k = 'g_offer_' + S.kind
  return ui(S.lang, k) === k ? T('g_offer') : T(k)
}

function thumb(g, ding0) {
  const L = LOOKS[S.look], d = S.d
  const vars = esc(L.vars.replace(/\s+/g, ' ') + ';--accent:' + (d.accent || L.accent))
  const img = (src) => `<span class="th" data-d="${ding0}"><img src="${esc(src)}" alt="" loading="lazy"></span>`
  if (g === 'words') {
    const nm = (d.name || S.name).slice(0, 24), L = Math.max(4, ...nm.split(/\s+/).map((w) => [...w].length))
    return `<span class="th lookth" style="${vars};--L:${L}"><b>${esc(nm)}</b></span>`
  }
  if (g === 'look') return `<span class="th lookth" style="${vars}"><b>Aa</b><i class="acc"></i>${d.dings[0] ? `<span class="tdg">${ding(d.dings[0], 'ink')}</span>` : ''}</span>`
  if (g === 'pics') {
    const c = d.cover && d.cover !== KPIC_ID ? imgUrl(d.cover, true) : (d.photos[0] ? imgUrl(d.photos[0], true) : '')
    if (c) return img(c)
  }
  if (g === 'offer') {
    const ph = ['works', 'amulets', 'rooms', 'lists'].flatMap((k) => (d[k] || []).flatMap((x) => x.photos || []))[0]
    if (ph) return img(imgUrl(ph, true))
    if (KPIC[S.kind]) return img(kpicUrl(S.kind, true))
  }
  if (g === 'where' && d.place.snap) return img(imgUrl(d.place.snap, true))
  return `<span class="th dgth">${ding(ding0, 'riso')}</span>`
}

// what the part puts on the page now, in a few words; '' = nothing yet
function summary(g) {
  const d = S.d, n = (k) => (d[k] || []).length, out = []
  const sec = (id) => T(secRow(id)?.[2] || id)
  if (g === 'words') { if (d.event?.start) out.push(when(d.event.start)); if (d.tagline) out.push(d.tagline); else if (d.about) out.push(d.about.slice(0, 60)) }
  if (g === 'pics') {
    const own = d.photos.filter((x) => x !== KPIC_ID && !(d.credits?.[x] && KPIC[S.kind] && d.credits[x].src === KPIC[S.kind].src)).length
    if (own) out.push(`${own} ${T('sm_photos')}`); else if (d.photos.length) out.push(T('sm_example'))
    if (d.drawing) out.push(sec('drawing')); if (d.avatar) out.push(sec('face')); if (d.video) out.push(sec('video'))
  }
  if (g === 'offer') for (const k of ['items', 'works', 'amulets', 'svc', 'rooms', 'lists', 'cal', 'camps', 'quotes']) if (n(k)) out.push(`${sec(k)} · ${n(k)}`)
  if (g === 'offer' && (d.ota.agoda || d.ota.booking)) out.push(sec('ota'))
  if (g === 'reach') {
    const c = d.contact
    if (c.phone) out.push(T('phone')); if (c.line) out.push('LINE'); if (c.facebook || c.instagram || c.tiktok) out.push('Facebook · Instagram · TikTok'.split(' · ').filter((x, i) => [c.facebook, c.instagram, c.tiktok][i]).join(' · '))
    if (d.order.grabfood) out.push('GrabFood'); if (d.order.lineman) out.push('LINE MAN'); if (d.msg) out.push(sec('msg')); if (n('links')) out.push(`${sec('links')} · ${n('links')}`)
  }
  if (g === 'where') { if (d.place.lat !== null) out.push(T('pinSet')); else if (d.place.addr) out.push(d.place.addr.slice(0, 40)); if (d.hours.on) out.push(d.hours.always ? T('open24') : sec('hours')); if (n('spots')) out.push(`${sec('spots')} · ${n('spots')}`) }
  if (g === 'look') { out.push(LOOKS[S.look].label); if (d.dings.length) out.push(`${T('s_dings')} · ${d.dings.length}`) }
  return out.join(' · ')
}

function partCard([g, ids, ding0]) {
  const order = DEFAULT_OPEN[S.kind] || []
  const rank = (id) => (order.includes(id) ? order.indexOf(id) : 99 + ids.indexOf(id))
  const subs = ids.filter((id) => SEC[id] && secRow(id))
  const shown = subs.filter((id) => S.open.has(id)).sort((a, b) => rank(a) - rank(b))
  const more = subs.filter((id) => !S.open.has(id))
  if (!shown.length && !more.length) return ''
  const open = S.part === g, sm = summary(g)
  const sub = (id) => {
    const [, , t, gold] = secRow(id)
    const head = gold || (shown.length > 1 && ui(S.lang, t) !== groupTitle(g))
    return `<div class="sub${gold ? ' gsec' : ''}" data-sec="${id}">${head ? `<h4>${T(t)}${gold ? `<span class="gpill">★ ${T('t_gold')}</span>` : ''}</h4>` : ''}<div class="in">${gold && !isGold() ? goldLocked() : SEC[id]()}</div></div>`
  }
  return `<section class="part${open ? ' open' : ''}${sm ? '' : ' none'}" data-grp="${g}">
    <button class="phead" data-pg="${g}" aria-expanded="${open}">${thumb(g, ding0)}<span class="pt"><b>${esc(groupTitle(g))}</b><small>${T('gw_' + g)}</small>
      <em>${sm ? `${icon('check')}${esc(sm)}` : T('sm_none')}</em></span><span class="chev" aria-hidden="true"></span></button>
    ${open ? `<div class="pbody"><div class="ptop"><b>${esc(groupTitle(g))}</b><button class="go small" data-pg="">${T('g_done')}</button></div>
      ${shown.map(sub).join('')}
      ${more.length ? `<div class="adds"><p>${T('g_more')}</p>${more.map((id) => { const [, , t, gold] = secRow(id); return `<button data-add="${id}"${gold ? ' class="g"' : ''}><b>+ ${T(t)}${gold ? ' ★' : ''}</b><small>${T('a_' + id)}</small></button>` }).join('')}</div>` : ''}
    </div>` : ''}</section>`
}

function drawParts() {
  const box = $('#parts')
  if (!box) return
  S.picker = null
  box.innerHTML = GROUPS.map(partCard).join('')
  dingbats(['curious'])
  document.body.classList.toggle('sheeton', !!S.part && narrow())
  const open = box.querySelector('.part.open')
  if (open) {
    if (open.querySelector('#mapel')) mountMap()
    if (open.querySelector('#drawpv')) mountDrawing()
    if (open.querySelector('iframe[data-th]')) fillThumbs(open)
  }
  lightPart()
}

function drawEdit() {
  if (S.tab !== 'edit') { document.body.classList.remove('sheeton'); return drawTab() }
  for (const [id] of SECTIONS) if (hasData(id)) S.open.add(id)
  S.open.add('look'); S.open.add('drawing'); S.open.add('msg')
  app.innerHTML = tabs() + `<div class="ed">
    <div class="pv" id="pv"><div class="url">${icon('globe')}<span>sites.motdang.net/${esc(S.name)}</span></div><iframe id="frame" title="${T('preview')}"></iframe>
      <p class="taphint">${ding('manicule', 'paper')}${T('tap')}</p></div>
    <div class="form" id="form"><div id="parts"></div>
      <div class="danger"><button id="del">${T('del')}</button></div></div></div>
    <div class="dock"><span class="state" id="state">${stateText()}</span>
      <button class="go red" id="pub">${S.status === 'live' ? T('share') : T('publish')}</button></div>`
  bindTabs()
  bindEdit()
  drawParts()
  preview(true)
}

const goldLocked = () => `<p class="glocked">${T('goldLock')}. <button class="linkbtn" data-tab="gold">${T('goldOpen')} →</button></p>`

const val = (v) => esc(v ?? '')
const field = (k, label, v, type = 'text', extra = '') => `<label class="field"><span>${label}</span><input type="${type}" data-k="${k}" value="${val(v)}" ${extra}></label>`

const SEC = {
  words() {
    return field('name', T('name'), S.d.name, 'text', 'maxlength="60"') + field('tagline', T('tagline'), S.d.tagline, 'text', 'maxlength="140"') +
      `<label class="field"><span>${T('about')}</span><textarea data-k="about" maxlength="2400">${val(S.d.about)}</textarea></label>`
  },
  drawing() {
    const list = SCENES[S.kind] || SCENES.shop
    const cur = S.d.scene || list[0][0]
    const th = S.lang === 'th'
    return `<label class="check"><input type="checkbox" class="sw" data-k="drawing" ${S.d.drawing ? 'checked' : ''}>${T('drawingOn')}</label>
      <div ${S.d.drawing ? '' : 'hidden'}><div class="drawpv"><canvas id="drawpv"></canvas></div><p class="hint">${T('drawingHint')}</p>
      <div class="scenes">${list.map(([id, t, e]) => `<button data-scene="${id}"${id === cur ? ' class="on"' : ''}>${esc(th ? t : e)}</button>`).join('')}</div></div>`
  },
  photos() {
    const max = isGold() ? MAX_PHOTOS.gold : MAX_PHOTOS.free
    return `<div class="photos">${S.d.photos.map((id) => `<div class="ph${id === S.d.cover ? ' cover' : ''}" data-ph="${id}"><img src="${esc(imgUrl(id, true))}" alt="">${id === S.d.cover ? `<span class="flag">${T('cover')}</span>` : ''}${S.d.credits?.[id] ? '<span class="pdf">PD</span>' : ''}
      <div class="tools"><button data-mo="${id}">${T('st_make')}</button>${id !== S.d.cover ? `<button data-cover="${id}">${T('makeCover')}</button>` : ''}<button data-rm="${id}">${T('remove')}</button></div></div>`).join('')}
      ${Array.from({ length: S.busy }, () => '<div class="ph"><div class="busy">…</div></div>').join('')}</div>
      ${S.d.photos.length < max ? `<div class="row2"><label class="pick">${icon('camera')}${T('addPhotos')}<input type="file" accept="image/*" multiple id="files"></label>
      <button class="pick pdpick" id="pdopen">${ding('sparkle', 'riso')}${T('pdBtn')}</button>
      <button class="pick pdpick" id="mkcover">${ding('pencil', 'riso')}${T('mk_coverBtn')}</button></div>
      <p class="hint">${T('st_tip')}</p>` : ''}`
  },
  items() {
    const cur = S.d.currency || currencyFor(S.d.place.cc, S.pageLang)
    return `<div class="items">${S.d.items.map((it, i) => `<div class="it"><input data-k="items.${i}.n" placeholder="${T('item')}" value="${val(it.n)}" maxlength="80">
      <input data-k="items.${i}.p" placeholder="${T('price')}" value="${val(it.p)}" maxlength="24" inputmode="decimal"><button class="x" data-rmitem="${i}" aria-label="${T('remove')}">×</button>
      <input data-k="items.${i}.note" placeholder="${T('details')}" value="${val(it.note)}" maxlength="160"></div>`).join('')}</div>
      <div class="row"><button class="go ghost" id="additem">${icon('plus')}${T('addItem')}</button>
      <label style="flex:1;min-width:150px"><select data-k="currency">${Object.entries(CURRENCY).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${k} ${esc(v.trim())}</option>`).join('')}</select></label></div>`
  },
  order() {
    return field('order.grabfood', T('grabfood'), S.d.order.grabfood, 'url', 'placeholder="https://r.grab.com/…"') +
      field('order.lineman', T('lineman'), S.d.order.lineman, 'url', 'placeholder="https://lin.ee/…"')
  },
  contact() {
    const c = S.d.contact
    return field('contact.phone', T('phone'), c.phone, 'tel', 'autocomplete="tel"') + field('contact.line', T('line'), c.line, 'text', 'autocapitalize="off" placeholder="@myshop"') +
      `<details${c.whatsapp || c.facebook || c.instagram || c.tiktok || c.youtube || c.email || c.web ? ' open' : ''}><summary style="cursor:pointer;font-weight:700;margin:0 0 12px">${T('addMore')} · Facebook · Instagram · TikTok · WhatsApp…</summary>` +
      field('contact.facebook', T('facebook'), c.facebook, 'text', 'autocapitalize="off"') + field('contact.instagram', T('instagram'), c.instagram, 'text', 'autocapitalize="off" placeholder="@"') +
      field('contact.tiktok', T('tiktok'), c.tiktok, 'text', 'autocapitalize="off" placeholder="@"') + field('contact.whatsapp', T('whatsapp'), c.whatsapp, 'tel') +
      field('contact.youtube', T('youtube'), c.youtube, 'text', 'autocapitalize="off"') + field('contact.email', T('email'), c.email, 'email') +
      field('contact.web', T('web'), c.web, 'url', 'placeholder="https://"') + '</details>'
  },
  map() {
    const p = S.d.place
    const has = p.lat !== null
    return `<div class="row"><button class="go ink" id="here">${icon('here')}${T('here')}</button>
      ${S.photoGps ? `<button class="go ghost" id="photopin">${icon('camera')}${T('photoPin')}</button>` : ''}</div>
      <div class="row" style="margin-top:10px"><input id="paste" type="url" placeholder="${T('paste')}" style="flex:1;min-width:200px"><button class="go ghost" id="pastego">${T('pasteGo')}</button></div>
      <p class="pinstate${has ? ' ok' : ''}" id="pinstate">${has ? `${icon('pin')}${T('pinSet')} · ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : T('noPin')}</p>
      <div class="mapwrap" id="mapwrap"><div class="hint">${T('dragHint')}</div><div id="mapel" style="position:absolute;inset:0"></div></div>
      <p id="nomap" style="display:none;color:var(--mute)">${T('noMap')}</p>
      <label class="field"><span>${T('address')}</span><textarea data-k="place.addr" maxlength="240" style="min-height:80px">${val(p.addr)}</textarea></label>
      <label class="field"><span>${T('country')}</span><select data-k="place.cc">${countries(p.cc)}</select></label>
      <div class="field"><span>${T('m_style')}</span>${seg('map.style', S.d.map.style, [['doodle', T('m_doodle')], ['terrain', T('m_terrain')], ['streets', T('m_streets')]])}</div>
      <div class="field"><span>${T('m_near')}</span>${seg('map.near', S.d.map.near, [['near', T('m_close')], ['mid', T('m_mid')], ['far', T('m_far')]])}</div>
      ${has ? `<button class="back" id="clearpin">× ${T('clearPin')}</button>` : ''}`
  },
  hours() {
    const h = S.d.hours
    const day = (i) => { try { return new Intl.DateTimeFormat(S.lang, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + i))) } catch { return String(i) } }
    return `<label class="check"><input type="checkbox" class="sw" data-k="hours.on" ${h.on ? 'checked' : ''}>${T('s_hours')}</label>
      <div ${h.on ? '' : 'hidden'}><label class="check"><input type="checkbox" class="sw" data-k="hours.always" ${h.always ? 'checked' : ''}>${T('open24')}</label>
      <div class="hours" ${h.always ? 'hidden' : ''}>${h.week.map((r, i) => `<div class="hr${r ? '' : ' off'}"><span>${esc(day(i))}</span>
        <input type="checkbox" class="sw" data-day="${i}" ${r ? 'checked' : ''} aria-label="${esc(day(i))}">
        <input type="time" data-from="${i}" value="${r ? r[0][0] : '09:00'}" ${r ? '' : 'disabled'}><input type="time" data-to="${i}" value="${r ? r[0][1] : '18:00'}" ${r ? '' : 'disabled'}></div>`).join('')}
        <button class="go ghost" id="sameall" style="margin-top:6px">${T('sameAll')}</button></div>
      ${field('hours.note', T('note'), h.note, 'text', 'maxlength="160"')}</div>`
  },
  links() {
    return `<div class="links">${S.d.links.map((l, i) => `<div class="lk"><div><input data-k="links.${i}.t" placeholder="${T('linkText')}" value="${val(l.t)}" maxlength="50" style="margin-bottom:6px">
      <input data-k="links.${i}.u" type="url" placeholder="https://" value="${val(l.u)}"></div><button class="x" data-rmlink="${i}" aria-label="${T('remove')}">×</button></div>`).join('')}</div>
      <button class="go ghost" id="addlink">${icon('plus')}${T('addLink')}</button>`
  },
  event() {
    const e = S.d.event || { start: '', end: '' }
    return field('event.start', T('starts'), e.start, 'datetime-local') + field('event.end', T('ends'), e.end, 'datetime-local')
  },
  msg() {
    const state = S.notifyEmail ? (S.notifyOk ? `<p class="pinstate ok">${icon('check')}${esc(ui(S.lang, 'notifyOk').replace('{e}', S.notifyEmail))}</p>` : `<p class="pinstate">${icon('mail')}${T('notifyWait')} · ${esc(S.notifyEmail)}</p>`) : ''
    return `<label class="check"><input type="checkbox" class="sw" data-k="msg" ${S.d.msg ? 'checked' : ''}>${T('msgOn')}</label>
      <div ${S.d.msg ? '' : 'hidden'}><label class="field"><span>${T('notifyEmail')}</span><div class="row"><input id="nmail" type="email" autocomplete="email" value="${val(S.notifyEmail)}" style="flex:1;min-width:200px"><button class="go ghost" id="nmailgo">${T('notifyGo')}</button></div></label>
      ${state}${S.notifyEmail ? `<button class="back" id="nmailoff">× ${T('notifyOff')}</button>` : ''}</div>`
  },
  look() {
    const acc = S.d.accent || LOOKS[S.look].accent
    return `<div class="lks">${LOOK_IDS.map((id) => lookCard(id, id === S.look)).join('')}</div>
      <div><b>${T('colour')}</b><div class="swatches">${[LOOKS[S.look].accent, ...ACCENTS.filter((a) => a !== LOOKS[S.look].accent)].map((a) => `<button data-acc="${a}" style="background:${a}"${a === acc ? ' class="on"' : ''} aria-label="${a}"></button>`).join('')}</div></div>
      <div><b>${T('s_dings')}</b><p class="hint">${T('dingsHint')}</p>${dingBrowser()}</div>
      <label class="check"><input type="checkbox" class="sw" data-k="counter" ${S.d.counter ? 'checked' : ''}>${T('counter')}</label>
      <label class="field"><span>${T('pageLang')}</span><select id="plang">${Object.entries(PAGE_LANGS).map(([k, v]) => `<option value="${k}"${k === S.pageLang ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`
  },
  video() {
    const v = S.d.video
    const shown = v ? (v.kind === 'youtube' ? 'https://youtu.be/' + v.id : 'https://vimeo.com/' + v.id) : ''
    return field('video', T('videoUrl'), shown, 'url', 'placeholder="https://youtu.be/…"')
  },
  spots() {
    return `<p class="hint">${T('spotsHint')}${isGold() ? '' : ' ' + T('sp_free')}</p><div class="items">${S.d.spots.map((x, i) => `<div class="it"><input data-k="spots.${i}.n" placeholder="${T('spotName')}" value="${val(x.n)}" maxlength="60">
      <span class="ll">${x.lat.toFixed(4)}, ${x.lng.toFixed(4)}</span><button class="x" data-rmspot="${i}" aria-label="${T('remove')}">×</button>
      <input data-k="spots.${i}.note" placeholder="${T('spotNote')}" value="${val(x.note)}" maxlength="160"></div>`).join('')}</div>
      ${S.d.spots.length < (isGold() ? MAX.spotsGold : MAX.spotsFree) ? `<div class="row"><input id="spotlink" type="url" placeholder="${T('spotPaste')}" style="flex:1;min-width:200px"><button class="go ghost" id="spotadd">${icon('plus')}${T('spotAdd')}</button></div>
      <p class="hint">${T('spotHere')}: <button class="linkbtn" id="spothere">${icon('pin')}${T('spotAdd')}</button></p>` : ''}`
  },
}

// ---- the parts added 2026-10-14 -----------------------------------------------------------

const seg = (k, cur, opts) => `<div class="seg" role="group">${opts.map(([v, label]) => `<button type="button" data-seg="${k}" data-v="${v}"${v === cur ? ' class="on"' : ''}>${label}</button>`).join('')}</div>`
const sel = (k, cur, opts) => `<select data-k="${k}">${opts.map(([v, label]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${label}</option>`).join('')}</select>`
const num = (k, v, label, extra = '') => `<label class="mini"><span>${label}</span><input type="number" data-k="${k}" data-num="1" value="${val(v)}" ${extra}></label>`
const rowX = (list, i) => `<button class="x" data-rmrow="${list}" data-i="${i}" aria-label="${T('remove')}">×</button>`
function photoPick(path, chosen) {
  if (!S.d.photos.length) return ''
  return `<div class="pickph" data-path="${path}">${S.d.photos.map((id) => `<button type="button" data-pp="${id}"${chosen.includes(id) ? ' class="on"' : ''}><img src="${esc(imgUrl(id, true))}" alt=""></button>`).join('')}</div>`
}

function dingBrowser() {
  const q = S.dbQ.trim().toLowerCase()
  const names = Object.keys(DINGBATS).filter((n) => (!S.dbFam || DINGBATS[n] === S.dbFam) && (!q || n.includes(q)))
  dingbats(S.dbFam ? [S.dbFam] : DB_FAMS)
  return `<div class="dpicked">${S.d.dings.length ? S.d.dings.map((n) => `<button data-ding="${n}" class="on" aria-label="${n}">${ding(n, 'ink')}<span>×</span></button>`).join('') : `<p class="hint" style="margin:0">${T('db_none')}</p>`}</div>
    <div class="row" style="margin:8px 0"><input id="dbq" type="search" placeholder="${T('db_find')}" value="${val(S.dbQ)}" style="flex:1;min-width:160px"></div>
    <div class="chips">${['', ...DB_FAMS].map((f) => `<button type="button" data-dbfam="${f}"${f === S.dbFam ? ' class="on"' : ''}>${f ? esc(f) : T('db_all')}</button>`).join('')}</div>
    <div class="dpick" id="dpick">${names.map((n) => `<button data-ding="${n}"${S.d.dings.includes(n) ? ' class="on"' : ''} aria-label="${n}" title="${n}">${ding(n, 'ink', 'hover')}</button>`).join('')}</div>`
}

Object.assign(SEC, {
  cal() {
    return `<p class="hint">${T('c_hint')}</p><div class="rows">${S.d.cal.map((x, i) => `<div class="rowc">${rowX('cal', i)}
      <label class="field"><span>${T('c_title')}</span><input data-k="cal.${i}.t" value="${val(x.t)}" maxlength="80"></label>
      <div class="grid2f"><label class="field"><span>${T('c_start')}</span><input type="datetime-local" data-k="cal.${i}.start" value="${val(x.start)}"></label>
      <label class="field"><span>${T('c_end')}</span><input type="time" data-k="cal.${i}.end" value="${val(x.end)}"></label>
      <label class="field"><span>${T('c_rep')}</span>${sel(`cal.${i}.rep`, x.rep, [['', T('c_once')], ['weekly', T('c_weekly')], ['monthly', T('c_monthly')]])}</label>
      ${x.rep ? `<label class="field"><span>${T('c_until')}</span><input type="date" data-k="cal.${i}.until" value="${val(x.until)}"></label>` : ''}</div>
      <label class="field"><span>${T('c_note')}</span><input data-k="cal.${i}.note" value="${val(x.note)}" maxlength="240"></label></div>`).join('')}</div>
      ${S.d.cal.length < MAX.cal ? `<button class="go ghost" data-addrow="cal">${icon('plus')}${T('c_add')}</button>` : ''}`
  },
  camps() {
    return `<p class="hint">${T('o_hint')}</p><div class="rows">${S.d.camps.map((x, i) => `<div class="rowc camp">${rowX('camps', i)}
      <label class="field"><span>${T('o_title')}</span><input data-k="camps.${i}.t" value="${val(x.t)}" maxlength="90"></label>
      <label class="field"><span>${T('o_note')}</span><input data-k="camps.${i}.note" value="${val(x.note)}" maxlength="240"></label>
      <div class="grid2f"><label class="field"><span>${T('o_start')}</span><input type="datetime-local" data-k="camps.${i}.start" value="${val(x.start)}"></label>
      <label class="field"><span>${T('o_end')}</span><input type="datetime-local" data-k="camps.${i}.end" value="${val(x.end)}"></label>
      <label class="field"><span>${T('o_code')}</span><input data-k="camps.${i}.code" value="${val(x.code)}" maxlength="24" autocapitalize="characters"></label></div></div>`).join('')}</div>
      ${S.d.camps.length < MAX.camps ? `<button class="go ghost" data-addrow="camps">${icon('plus')}${T('o_add')}</button>` : ''}`
  },
  svc() {
    const b = S.d.book
    return `<p class="hint">${T('b_hint')}</p><div class="rows">${S.d.svc.map((x, i) => `<div class="rowc">${rowX('svc', i)}
      <label class="field"><span>${T('b_svc')}</span><input data-k="svc.${i}.n" value="${val(x.n)}" maxlength="80"></label>
      <div class="grid3f">${num(`svc.${i}.mins`, x.mins, T('b_mins'), 'min="10" max="720" step="5"')}<label class="mini"><span>${T('price')}</span><input data-k="svc.${i}.p" value="${val(x.p)}" maxlength="24" inputmode="decimal"></label>${num(`svc.${i}.cap`, x.cap, T('b_cap'), 'min="1" max="50"')}</div>
      <label class="field"><span>${T('details')}</span><input data-k="svc.${i}.note" value="${val(x.note)}" maxlength="200"></label></div>`).join('')}</div>
      ${S.d.svc.length < MAX.svc ? `<button class="go ghost" data-addrow="svc">${icon('plus')}${T('b_add')}</button>` : ''}
      <div class="grid3f" style="margin-top:16px"><label class="mini"><span>${T('b_step')}</span>${sel('book.step', String(b.step), [['15', '15 min'], ['30', '30 min'], ['60', '1 h'], ['120', '2 h']])}</label>
      ${num('book.lead', b.lead, T('b_lead'), 'min="0" max="168"')}${num('book.ahead', b.ahead, T('b_ahead'), 'min="1" max="180"')}</div>
      <label class="check"><input type="checkbox" class="sw" data-k="book.auto" ${b.auto ? 'checked' : ''}>${T('b_auto')}</label>
      <details${b.pp ? ' open' : ''}><summary style="cursor:pointer;font-weight:700;margin:0 0 10px">${T('b_dep')}</summary><p class="hint">${T('b_depHint')}</p>
      <div class="grid2f"><label class="mini"><span>${T('b_depAmt')}</span><input data-k="book.deposit" value="${val(b.deposit)}" inputmode="decimal" maxlength="12"></label>
      <label class="mini"><span>${T('b_pp')}</span><input data-k="book.pp" value="${val(b.pp)}" inputmode="numeric" maxlength="20"></label></div></details>`
  },
  ota() {
    return `<p class="hint">${T('o_otaHint')}</p>` + field('ota.agoda', 'Agoda', S.d.ota.agoda, 'url', 'placeholder="https://www.agoda.com/…"') +
      field('ota.booking', 'Booking.com', S.d.ota.booking, 'url', 'placeholder="https://www.booking.com/hotel/th/…"')
  },
  rooms() {
    const st = S.d.stay
    return (S.hotel ? '' : `<p class="glocked">${esc(ui(S.lang, 'h_needHotel').replace('{p}', new Intl.NumberFormat(S.lang).format(S.plans?.hotel?.baht || 555)))} <button class="linkbtn" data-tab="gold">${T('goldOpen')} →</button></p>`) +
      `<div class="rowc" style="margin-bottom:12px"><b>${T('h_setup')}</b>
      <div class="grid2f" style="margin-top:8px"><label class="mini"><span>${T('h_in')}</span><input type="time" data-k="stay.in" value="${val(st.in)}"></label><label class="mini"><span>${T('h_out')}</span><input type="time" data-k="stay.out" value="${val(st.out)}"></label></div>
      <label class="check"><input type="checkbox" class="sw" data-k="stay.instant" ${st.instant ? 'checked' : ''}>${T('h_instant')}</label>
      <div class="field"><span>${T('h_pay')}</span>${seg('stay.pay', st.pay, [['hotel', T('h_payHotel')], ['pp', 'PromptPay'], ['link', T('h_payLink')]])}</div>
      ${st.pay === 'pp' ? `<label class="mini"><span>${T('b_pp')}</span><input data-k="stay.pp" value="${val(st.pp)}" inputmode="numeric" maxlength="20"></label>` : ''}
      ${st.pay === 'link' ? `<label class="mini"><span>${T('h_link')}</span><input type="url" data-k="stay.link" value="${val(st.link)}" placeholder="https://buy.stripe.com/…"></label>` : ''}
      ${st.pay !== 'hotel' ? `<label class="mini"><span>${T('h_dep')}</span>${sel('stay.dep', st.dep, [['none', T('h_depNone')], ['night1', T('h_dep1')], ['pct30', '30%'], ['full', T('h_depFull')]])}</label>` : ''}
      <label class="field"><span>${T('h_policy')}</span><textarea data-k="stay.policy" maxlength="600" style="min-height:64px" placeholder="${T('h_policyEx')}">${val(st.policy)}</textarea></label></div>
      <div class="rows">${S.d.rooms.map((x, i) => `<div class="rowc">${rowX('rooms', i)}
      <label class="field"><span>${T('r_name')}</span><input data-k="rooms.${i}.n" value="${val(x.n)}" maxlength="80"></label>
      <div class="grid3f">${num(`rooms.${i}.guests`, x.guests, T('r_guests'), 'min="1" max="40"')}<label class="mini"><span>${T('r_beds')}</span><input data-k="rooms.${i}.beds" value="${val(x.beds)}" maxlength="60"></label>
      ${num(`rooms.${i}.units`, x.units, T('r_units'), 'min="1" max="200"')}</div>
      <div class="grid3f"><label class="mini"><span>${T('r_price')}</span><input data-k="rooms.${i}.p" value="${val(x.p)}" maxlength="24" inputmode="decimal"></label>
      <label class="mini"><span>${T('r_p2')}</span><input data-k="rooms.${i}.p2" value="${val(x.p2)}" maxlength="24" inputmode="decimal"></label>${num(`rooms.${i}.min`, x.min, T('r_min'), 'min="1" max="30"')}</div>
      <div class="field"><span>${T('r_seasons')}</span>${(x.rates || []).map((r, k) => `<div class="pair" style="margin:0 0 6px"><input type="date" data-k="rooms.${i}.rates.${k}.from" value="${val(r.from)}"><input type="date" data-k="rooms.${i}.rates.${k}.to" value="${val(r.to)}"><input data-k="rooms.${i}.rates.${k}.p" value="${val(r.p)}" placeholder="${T('price')}" inputmode="decimal" style="max-width:110px"><button class="x" data-rmrate="${i}.${k}" aria-label="${T('remove')}">×</button></div>`).join('')}
      ${(x.rates || []).length < 8 ? `<button class="linkbtn" data-addrate="${i}">${icon('plus')}${T('r_addSeason')}</button>` : ''}</div>
      <label class="field"><span>${T('details')}</span><textarea data-k="rooms.${i}.note" maxlength="400" style="min-height:70px">${val(x.note)}</textarea></label>
      <div class="field"><span>${T('r_photos')}</span>${photoPick(`rooms.${i}.photos`, x.photos) || `<small>${T('addPhotos')} ↑</small>`}</div>
      <label class="field"><span>${T('r_ical')}</span><textarea data-ical="${i}" style="min-height:64px" placeholder="https://www.airbnb.com/calendar/ical/….ics">${val(x.ical.join('\n'))}</textarea><small>${T('r_icalHint')}</small></label>
      ${S.status === 'live' && x.id ? `<p class="hint">${T('r_out')}<br><code class="cp" data-copy="${esc(location.origin + '/' + S.name + '/room/' + x.id + '.ics')}">${esc(location.origin.replace(/^https?:\/\//, '') + '/' + S.name + '/room/' + x.id + '.ics')}</code></p>` : ''}</div>`).join('')}</div>
      ${S.d.rooms.length < MAX.rooms ? `<button class="go ghost" data-addrow="rooms">${icon('plus')}${T('r_add')}</button>` : ''}`
  },
  lists() {
    const st = ['open', 'reserved', 'sold', 'rented'].map((k) => [k, T('st_' + k)])
    return `<div class="rows">${S.d.lists.map((x, i) => `<div class="rowc">${rowX('lists', i)}
      <label class="field"><span>${T('l_title')}</span><input data-k="lists.${i}.t" value="${val(x.t)}" maxlength="100"></label>
      <div class="grid3f"><label class="mini"><span>${T('l_deal')}</span>${sel(`lists.${i}.deal`, x.deal, [['sale', T('l_sale')], ['rent', T('l_rent')]])}</label>
      <label class="mini"><span>${T('l_status')}</span>${sel(`lists.${i}.status`, x.status, st)}</label>
      <label class="mini"><span>${T('l_price')}</span><input data-k="lists.${i}.p" value="${val(x.p)}" maxlength="24" inputmode="decimal"></label></div>
      <div class="grid3f"><label class="mini"><span>${T('l_area')}</span><span class="pair"><input data-k="lists.${i}.area" value="${val(x.area)}" inputmode="decimal" maxlength="16">${sel(`lists.${i}.unit`, x.unit, Object.entries(UNIT_LABEL))}</span></label>
      ${num(`lists.${i}.beds`, x.beds, T('l_beds'), 'min="0" max="50"')}${num(`lists.${i}.baths`, x.baths, T('l_baths'), 'min="0" max="50"')}</div>
      <label class="field"><span>${T('l_kind')}</span><input data-k="lists.${i}.kind" value="${val(x.kind)}" maxlength="40"></label>
      <label class="field"><span>${T('details')}</span><textarea data-k="lists.${i}.note" maxlength="2000">${val(x.note)}</textarea></label>
      <div class="field"><span>${T('l_photos')}</span>${photoPick(`lists.${i}.photos`, x.photos) || `<small>${T('addPhotos')} ↑</small>`}</div>
      <div class="field"><span>${T('l_pin')}</span><div class="row"><input data-lpin="${i}" type="url" placeholder="${T('paste')}" style="flex:1;min-width:180px"><button class="go ghost small" data-lpingo="${i}">${T('l_pinUse')}</button></div>
      <small>${x.lat != null ? `${icon('pin')} ${x.lat.toFixed(5)}, ${x.lng.toFixed(5)} · <button class="linkbtn" data-lpinx="${i}">× ${T('clearPin')}</button>` : T('l_pinPage')}</small></div>
      ${S.status === 'live' && x.id ? `<a class="linkbtn" href="/${esc(S.name)}/l/${esc(x.id)}" target="_blank">${icon('globe')}${T('l_open')}</a>` : ''}</div>`).join('')}</div>
      ${S.d.lists.length < MAX.lists ? `<button class="go ghost" data-addrow="lists">${icon('plus')}${T('l_add')}</button>` : ''}`
  },
})

const NEW_ROW = {
  cal: () => { const t = new Date(Date.now() + 864e5); const p = (n) => String(n).padStart(2, '0'); return { id: rid(), t: '', note: '', start: `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T18:00`, end: '', rep: '', until: '' } },
  camps: () => { const p = (n) => String(n).padStart(2, '0'); const f = (t) => `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:00`; return { id: rid(), t: '', note: '', code: '', start: f(new Date()), end: f(new Date(Date.now() + 7 * 864e5)) } },
  svc: () => ({ id: rid(), n: '', p: '', note: '', mins: 60, cap: 1 }),
  rooms: () => ({ id: rid(), n: '', guests: 2, beds: '', p: '', p2: '', units: 1, min: 1, rates: [], note: '', photos: [], ical: [] }),
  lists: () => ({ id: rid(), t: '', deal: 'sale', status: 'open', p: '', area: '', unit: 'm2', beds: 0, baths: 0, kind: '', note: '', photos: [], lat: null, lng: null }),
  works: () => ({ id: rid(), t: '', client: '', year: String(new Date().getFullYear()), role: '', tags: '', note: '', u: '', photos: [] }),
  quotes: () => ({ q: '', who: '' }),
}

// ---- the parts added 2026-10-15: an avatar, a portfolio, the picture studio ---------------

Object.assign(SEC, {
  face() {
    const a = S.d.avatar
    return `<p class="hint">${T('face_hint')}</p><div class="avrow">${a ? `<img class="avpv${S.d.avround ? ' round' : ''}" src="${esc(imgUrl(a, true))}" alt="">` : `<span class="avpv none">${ding('smile', 'paper')}</span>`}
      <div class="avbtns"><label class="pick">${icon('camera')}${T('f_photo')}<input type="file" accept="image/*" id="avfile"></label>
      <button class="pick pdpick" id="avmake">${ding('sparkle', 'riso')}${T('f_make')}</button></div></div>
      ${S.d.photos.length ? `<div class="field"><span>${T('f_mine')}</span><div class="pickph">${S.d.photos.map((id) => `<button type="button" data-avpick="${id}"><img src="${esc(imgUrl(id, true))}" alt=""></button>`).join('')}</div></div>` : ''}
      ${a ? `<label class="check"><input type="checkbox" class="sw" id="avround" ${S.d.avround ? 'checked' : ''}>${T('f_round')}</label><button class="back" id="avrm">× ${T('remove')}</button>` : ''}`
  },
  works() {
    const cap = isGold() ? MAX.works : MAX.worksFree
    return `<p class="hint">${T('w_hint')}${isGold() ? '' : ' ' + T('w_free')}</p><div class="rows">${S.d.works.map((x, i) => `<div class="rowc${i >= cap ? ' over' : ''}">${rowX('works', i)}
      <label class="field"><span>${T('w_title')}</span><input data-k="works.${i}.t" value="${val(x.t)}" maxlength="100"></label>
      <div class="grid3f"><label class="mini"><span>${T('w_client')}</span><input data-k="works.${i}.client" value="${val(x.client)}" maxlength="80"></label>
      <label class="mini"><span>${T('w_year')}</span><input data-k="works.${i}.year" value="${val(x.year)}" maxlength="12" inputmode="numeric"></label>
      <label class="mini"><span>${T('w_role')}</span><input data-k="works.${i}.role" value="${val(x.role)}" maxlength="80"></label></div>
      <label class="field"><span>${T('w_tags')}</span><input data-k="works.${i}.tags" value="${val(x.tags)}" maxlength="120"></label>
      <label class="field"><span>${T('w_note')}</span><textarea data-k="works.${i}.note" maxlength="2000">${val(x.note)}</textarea></label>
      <label class="field"><span>${T('w_link')}</span><input type="url" data-k="works.${i}.u" value="${val(x.u)}" placeholder="https://"></label>
      <div class="field"><span>${T('w_photos')}</span>${photoPick(`works.${i}.photos`, x.photos) || `<small>${T('addPhotos')} ↓</small>`}</div>
      ${S.status === 'live' && x.id && x.t ? `<a class="linkbtn" href="/${esc(S.name)}/w/${esc(x.id)}" target="_blank">${icon('globe')}${T('l_open')}</a>` : ''}</div>`).join('')}</div>
      ${S.d.works.length < MAX.works ? `<button class="go ghost" data-addrow="works">${icon('plus')}${T('w_add')}</button>` : ''}`
  },
  quotes() {
    return `<div class="rows">${S.d.quotes.map((x, i) => `<div class="rowc">${rowX('quotes', i)}
      <label class="field"><span>${T('q_q')}</span><textarea data-k="quotes.${i}.q" maxlength="400" style="min-height:80px">${val(x.q)}</textarea></label>
      <label class="field"><span>${T('q_who')}</span><input data-k="quotes.${i}.who" value="${val(x.who)}" maxlength="80"></label></div>`).join('')}</div>
      ${S.d.quotes.length < MAX.quotes ? `<button class="go ghost" data-addrow="quotes">${icon('plus')}${T('q_add')}</button>` : ''}`
  },
})

const accentNow = () => S.d.accent || LOOKS[S.look].accent

/** A photo of the page as a bitmap: the copy this browser sent, else the server's. */
async function bitmapOf(id) {
  const blob = S.big.get(id) || await fetch(`/img/${id}.webp`).then((r) => (r.ok ? r.blob() : fetch(imgUrl(id, true)).then((x) => x.blob())))
  return createImageBitmap(blob)
}

/** Shrink, upload, and hand back the new photo's id (not added to the gallery). */
async function sendCanvas(canvas, max) {
  const bmp = await createImageBitmap(canvas)
  const big = await shrink(bmp, max, 0.9), small = await shrink(bmp, Math.min(max, 480), 0.86)
  const r = await upload(big.blob, small.blob, 'photo', big.w, big.h)
  S.local.set(r.id, URL.createObjectURL(small.blob))
  S.big.set(r.id, big.blob)
  return r.id
}
const sendFail = (e) => { toast(ui(S.lang, e.message === 'photo-refused' ? 'e_refused' : e.message === 'quota' ? 'e_quota' : 'e_net')); throw e }

/** The studio on one of the page's photos; the new picture takes the old one's place. */
async function makeOver(id) {
  let bmp
  try { bmp = await bitmapOf(id) } catch { toast(ui(S.lang, 'e_net')); return }
  openStudio({ bitmap: bmp, mode: 'photo', accent: accentNow(), T, onUse: async (canvas) => {
    const nid = await sendCanvas(canvas, 1600).catch(sendFail)
    const swap = (x) => (x === id ? nid : x)
    S.d.photos = S.d.photos.map(swap)
    if (S.d.cover === id) S.d.cover = nid
    for (const k of ['rooms', 'lists', 'works']) for (const x of S.d[k] || []) x.photos = x.photos.map(swap)
    redrawSec('photos'); if (S.open.has('works')) redrawSec('works')
    changed()
  } })
}

async function avatarStudio(bmp) {
  openStudio({ bitmap: bmp, mode: 'avatar', round: S.d.avround, accent: accentNow(), T, onUse: async (canvas) => {
    S.d.avatar = await sendCanvas(canvas, 640).catch(sendFail)
    redrawSec('face'); changed()
  } })
}
async function avatarFrom(id) {
  try { avatarStudio(await bitmapOf(id)) } catch { toast(ui(S.lang, 'e_net')) }
}

/** The mark maker: an avatar, or a cover for a page with no photo. */
function markSheet(mode) {
  openMark({ mode, name: S.d.name || S.name, tagline: S.d.tagline, accent: accentNow(), T, need: (f) => dingbats(f.filter(Boolean)), onUse: async (canvas, o) => {
    if (mode === 'avatar') {
      S.d.avatar = await sendCanvas(canvas, 640).catch(sendFail)
      S.d.avround = o.shape === 'circle'
      S.open.add('face'); redrawSec('face')
    } else {
      if (S.d.photos.length >= (isGold() ? MAX_PHOTOS.gold : MAX_PHOTOS.free)) { toast(ui(S.lang, 'e_full')); throw new Error('full') }
      const nid = await sendCanvas(canvas, 1600).catch(sendFail)
      S.d.photos.unshift(nid); S.d.cover = nid
      redrawSec('photos')
    }
    changed()
  } })
}

const CC = 'TH MM LA KH VN MY SG ID PH CN JP KR TW HK IN BD NP LK US CA MX GB IE FR DE ES PT IT NL BE CH AT SE NO DK FI PL CZ GR TR IL AE SA EG ZA NG KE AU NZ BR AR CL CO PE BT MN KZ UZ PK RU UA RO HU BG HR RS SI SK LT LV EE IS LU MT CY MA TN GH ET TZ UG FJ PG TL BN MO'.split(' ')
function countries(cur) {
  let dn
  try { dn = new Intl.DisplayNames([S.lang], { type: 'region' }) } catch {}
  const list = CC.map((c) => [c, dn ? dn.of(c) : c]).sort((a, b) => a[1].localeCompare(b[1], S.lang))
  return `<option value="">—</option>` + list.map(([c, n]) => `<option value="${c}"${c === cur ? ' selected' : ''}>${esc(n)}</option>`).join('')
}

function stateText() {
  if (S.saving) return ui(S.lang, 'saving')
  return { draft: ui(S.lang, 'draft'), live: ui(S.lang, 'live'), held: ui(S.lang, 'held') }[S.status] || ''
}

function setPath(o, path, v) {
  const ks = path.split('.')
  let x = o
  for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (x[k] == null) x[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; x = x[k] }
  x[ks.at(-1)] = v
}

function bindTabs() {
  app.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = (e) => { e.preventDefault(); S.tab = b.dataset.tab; draw(); window.scrollTo(0, 0) }))
}

function bindEdit() {
  const form = $('#form')
  form.addEventListener('input', (e) => {
    const k = e.target.dataset.k
    if (!k) return
    let v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    if (k === 'event.start' || k === 'event.end') { S.d.event = S.d.event || { start: '', end: '', tz: TZ }; S.d.event.tz = TZ }
    setPath(S.d, k, v)
    if (k === 'hours.on' || k === 'hours.always' || k === 'place.cc') redrawSec(k.split('.')[0] === 'place' ? 'items' : 'hours')
    if (k === 'drawing') { redrawSec('drawing') }
    if (k === 'msg') redrawSec('msg')
    if (/^cal\.\d+\.rep$/.test(k)) redrawSec('cal')
    if (k === 'name' || k.startsWith('hours')) drawPreviewSoon()
    changed()
  })
  form.addEventListener('input', (e) => {
    const t = e.target
    if (t.dataset.ical !== undefined) { const r = S.d.rooms[+t.dataset.ical]; if (r) { r.ical = t.value.split(/\s+/).map((x) => x.trim()).filter(Boolean).slice(0, 4); changed() } }
    if (t.id === 'dbq') {
      S.dbQ = t.value
      const box = $('#dpick'), q = S.dbQ.trim().toLowerCase()
      if (box) box.innerHTML = Object.keys(DINGBATS).filter((n) => (!S.dbFam || DINGBATS[n] === S.dbFam) && (!q || n.includes(q))).map((n) => `<button data-ding="${n}"${S.d.dings.includes(n) ? ' class="on"' : ''} aria-label="${n}" title="${n}">${ding(n, 'ink', 'hover')}</button>`).join('')
    }
  })
  form.addEventListener('change', (e) => {
    const t = e.target
    if (t.id === 'files') addFiles([...t.files])
    if (t.id === 'avfile' && t.files[0]) createImageBitmap(t.files[0], { imageOrientation: 'from-image' }).then((bmp) => avatarStudio(bmp)).catch(() => toast(ui(S.lang, 'e_net')))
    if (t.id === 'avround') { S.d.avround = t.checked; changed() }
    if (t.id === 'plang') { S.pageLang = t.value; changed() }
    if (t.dataset.day !== undefined) { const i = +t.dataset.day; S.d.hours.week[i] = t.checked ? [[$(`[data-from="${i}"]`).value || '09:00', $(`[data-to="${i}"]`).value || '18:00']] : null; redrawSec('hours'); changed() }
    if (t.dataset.from !== undefined || t.dataset.to !== undefined) {
      const i = +(t.dataset.from ?? t.dataset.to)
      if (S.d.hours.week[i]) S.d.hours.week[i] = [[$(`[data-from="${i}"]`).value, $(`[data-to="${i}"]`).value]]
      changed()
    }
  })
  form.addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b) return
    if (b.dataset.tab) { e.preventDefault(); S.tab = b.dataset.tab; draw(); return }
    if (b.dataset.pg !== undefined) { e.preventDefault(); if (b.dataset.pg && S.part !== b.dataset.pg) openPart(b.dataset.pg); else closePart(); return }
    if (b.dataset.add) {
      e.preventDefault()
      if (b.dataset.add === 'event' && !S.d.event) S.d.event = starter('event').event
      if (b.dataset.add === 'hours') S.d.hours.on = true
      openPart(b.dataset.add)
      changed(); return
    }
    if (b.dataset.cover) { S.d.cover = b.dataset.cover; redrawSec('photos'); changed() }
    if (b.dataset.rm) { S.d.photos = S.d.photos.filter((x) => x !== b.dataset.rm); if (S.d.cover === b.dataset.rm) S.d.cover = S.d.photos[0] || ''; redrawSec('photos'); changed() }
    if (b.id === 'additem') { S.d.items.push({ n: '', p: '', note: '' }); redrawSec('items'); $(`[data-k="items.${S.d.items.length - 1}.n"]`).focus() }
    if (b.dataset.rmitem) { S.d.items.splice(+b.dataset.rmitem, 1); redrawSec('items'); changed() }
    if (b.id === 'addlink') { S.d.links.push({ t: '', u: '' }); redrawSec('links'); $(`[data-k="links.${S.d.links.length - 1}.t"]`).focus() }
    if (b.dataset.rmlink) { S.d.links.splice(+b.dataset.rmlink, 1); redrawSec('links'); changed() }
    if (b.dataset.look) { if (LOOKS[b.dataset.look].gold && !isGold()) { S.tab = 'gold'; draw(); return } S.look = b.dataset.look; S.d.accent = ''; redrawSec('look'); changed() }
    if (b.dataset.acc) { S.d.accent = b.dataset.acc === LOOKS[S.look].accent ? '' : b.dataset.acc; redrawSec('look'); changed() }
    if (b.dataset.ding) {
      const n = b.dataset.ding
      S.d.dings = S.d.dings.includes(n) ? S.d.dings.filter((x) => x !== n) : [...S.d.dings, n].slice(-6)
      app.querySelectorAll('#dpick [data-ding]').forEach((x) => x.classList.toggle('on', S.d.dings.includes(x.dataset.ding)))
      const pk = $('.dpicked'); if (pk) pk.innerHTML = S.d.dings.length ? S.d.dings.map((x) => `<button data-ding="${x}" class="on" aria-label="${x}">${ding(x, 'ink')}<span>×</span></button>`).join('') : `<p class="hint" style="margin:0">${T('db_none')}</p>`
      changed()
    }
    if (b.dataset.dbfam !== undefined) { S.dbFam = b.dataset.dbfam; redrawSec('look') }
    if (b.dataset.seg) { setPath(S.d, b.dataset.seg, b.dataset.v); b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); changed() }
    if (b.dataset.addrow) {
      const k = b.dataset.addrow
      S.d[k].push(NEW_ROW[k]()); redrawSec(k)
      const rows = $(`[data-sec="${k}"]`)?.querySelectorAll('.rowc'); const last = rows && rows[rows.length - 1]
      if (last) { last.querySelector('input')?.focus(); last.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
      changed()
    }
    if (b.dataset.rmrow) { S.d[b.dataset.rmrow].splice(+b.dataset.i, 1); redrawSec(b.dataset.rmrow); changed() }
    if (b.dataset.addrate) { const r = S.d.rooms[+b.dataset.addrate]; r.rates = r.rates || []; r.rates.push({ from: '', to: '', p: '' }); redrawSec('rooms') }
    if (b.dataset.rmrate) { const [i, k] = b.dataset.rmrate.split('.').map(Number); S.d.rooms[i].rates.splice(k, 1); redrawSec('rooms'); changed() }
    if (b.dataset.seg === 'stay.pay') redrawSec('rooms')
    if (b.dataset.pp) {
      const path = b.closest('.pickph').dataset.path, [k, i] = path.split('.'), item = S.d[k][+i]
      if (item) { item.photos = item.photos.includes(b.dataset.pp) ? item.photos.filter((x) => x !== b.dataset.pp) : [...item.photos, b.dataset.pp].slice(0, k === 'works' ? 24 : MAX.itemPhotos); b.classList.toggle('on', item.photos.includes(b.dataset.pp)); changed() }
    }
    if (b.dataset.lpingo) listingPin(+b.dataset.lpingo)
    if (b.dataset.lpinx) { const x = S.d.lists[+b.dataset.lpinx]; if (x) { x.lat = x.lng = null; redrawSec('lists'); changed() } }
    if (b.dataset.scene) { S.d.scene = b.dataset.scene; app.querySelectorAll('[data-scene]').forEach((x) => x.classList.toggle('on', x === b)); drawPreviewSoon(); changed() }
    if (b.id === 'sameall') { const r = S.d.hours.week.find(Boolean) || [['09:00', '18:00']]; S.d.hours.week = S.d.hours.week.map(() => r.map((x) => [...x])); redrawSec('hours'); changed() }
    if (b.id === 'here') here()
    if (b.id === 'photopin' && S.photoGps) setPin(S.photoGps.lat, S.photoGps.lng, 18)
    if (b.id === 'pastego') pasteLink()
    if (b.id === 'clearpin') { S.d.place.lat = S.d.place.lng = null; S.d.place.snap = ''; redrawSec('map'); changed() }
    if (b.id === 'pdopen') pdSheet()
    if (b.dataset.mo) makeOver(b.dataset.mo)
    if (b.id === 'mkcover') markSheet('cover')
    if (b.id === 'avmake') markSheet('avatar')
    if (b.dataset.avpick) avatarFrom(b.dataset.avpick)
    if (b.id === 'avrm') { S.d.avatar = ''; redrawSec('face'); changed() }
    if (b.id === 'nmailgo') notifyOn()
    if (b.id === 'nmailoff') notifyOff()
    if (b.id === 'spotadd') spotFromLink()
    if (b.id === 'spothere') spotHere()
    if (b.dataset.rmspot) { S.d.spots.splice(+b.dataset.rmspot, 1); redrawSec('spots'); changed() }
  })
  form.addEventListener('toggle', (e) => {
    if (e.target.dataset?.sec === 'map' && e.target.open) mountMap()
    if (e.target.dataset?.sec === 'drawing' && e.target.open) mountDrawing()
  }, true)
  form.addEventListener('change', (e) => { if (e.target.dataset.k === 'video') { S.d.video = e.target.value; changed() } })
  form.addEventListener('click', (e) => { const c = e.target.closest('.cp'); if (c) copy(c.dataset.copy) })
  // a picture that will not load (a photo still waiting for its check) gives way to the part's drawing
  form.addEventListener('error', (e) => { const th = e.target.tagName === 'IMG' && e.target.closest('.th[data-d]'); if (th) { th.classList.add('dgth'); th.innerHTML = ding(th.dataset.d, 'riso') } }, true)
  $('#del').onclick = del
  $('#pub').onclick = publish
}

function redrawSec(id) {
  const sec = $(`[data-sec="${id}"] .in`)
  if (!sec) return
  const g = SECTIONS.find((x) => x[0] === id)?.[3]
  sec.innerHTML = g && !isGold() ? goldLocked() : SEC[id]()
  if (id === 'map') { S.picker = null; mountMap() }
  if (id === 'drawing') { drawCv = null; mountDrawing() }
  if (sec.querySelector('iframe[data-th]')) fillThumbs(sec)
}

// ---- the drawing preview in the editor ----------------------------------------------------

let drawCv = null, drawLoad = null, drawRaf = 0
function mountDrawing() {
  const cv = $('#drawpv')
  if (!cv || !S.d.drawing) return
  drawCv = cv
  const add = (src) => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s) })
  drawLoad = drawLoad || add('/front/skyline.js').then(() => add('/front/doodler.js')).then(() => addEventListener('mddoodler', () => paintDrawing(performance.now())))
  drawLoad.then(() => {
    cancelAnimationFrame(drawRaf)
    const loop = (t) => { if (!drawCv || !drawCv.isConnected) return; paintDrawing(t); drawRaf = requestAnimationFrame(loop) }
    drawRaf = requestAnimationFrame(loop)
  }).catch(() => {})
}
let lastDraw = 0
function paintDrawing(t) {
  const D = window.MDDOODLER, cv = drawCv
  if (!D || !cv || t - lastDraw < 40) return
  lastDraw = t
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr) }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H)
  const set = S.d.scene || (SCENES[S.kind] || SCENES.shop)[0][0]
  const p = S.d.place
  try { D.portrait(c, W, H, t, { set, place: { id: S.name, name: S.d.name || S.name, nameTh: S.d.name, nameEn: S.d.name, cat: S.kind, sub: [set], hours: osmHours(S.d.hours) || undefined, lat: p.lat ?? undefined, lng: p.lng ?? undefined } }) } catch {}
}
function drawPreviewSoon() { lastDraw = 0 }

// ---- the page is the editor (Nan 2026-10-15: what you see is what you get) --------------------
// A tap on a part of the page opens the part of the form that draws it; the name and the line under
// it are typed on the page itself.

const PART = [
  ['header.top img:not(.av)', 'photos'], ['header.top img.av', 'face'], ['header.top .dings', 'look'], ['header.top #st', 'hours'], ['header.top', 'words'],
  ['nav.reach', 'contact'], ['.camp', 'camps'], ['#count', 'event'], ['.when', 'event'], ['#cal', 'cal'], ['figure.drawn', 'drawing'], ['#works', 'works'], ['.quotes', 'quotes'],
  ['ul.menu', 'items'], ['#book', 'svc'], ['#rooms', 'rooms'], ['#lists', 'lists'], ['table.hours', 'hours'], ['.gallery', 'photos'], ['.video', 'video'],
  ['#where', 'map'], ['ol.spots', 'spots'], ['.lineqr', 'contact'], ['.card.links', 'links'], ['.contact', 'contact'], ['#message', 'msg'], ['#amulets', 'amulets'],
  ['.card', 'words'], ['footer', 'look'],
]
const PART_CSS = `[data-part]{cursor:pointer;transition:opacity .3s}[data-part]:hover{outline:3px dashed #d7261e;outline-offset:3px}
.mk-on{outline:4px solid #ffb000!important;outline-offset:4px;border-radius:8px}body.mk-lit main.wrap>[data-part]:not(.mk-on){opacity:.45}
[contenteditable]{cursor:text;outline:0}[contenteditable]:hover,[contenteditable]:focus{outline:3px solid #ffb000;outline-offset:4px;border-radius:6px}
.mk-ghost{opacity:.55;font-style:italic}.mk-pic{position:absolute;left:12px;top:12px;z-index:5;padding:6px 12px;border-radius:99px;background:#1c1530e0;color:#fff;font:600 13px/1.2 system-ui,sans-serif;cursor:pointer}`

// a block of the page and the part of the form that draws it: by what it is, else by what it holds
function partOf(el) {
  const own = PART.find(([sel]) => sel !== '.card' && el.matches(sel))
  if (own) return own[1]
  const held = PART.find(([sel]) => !sel.startsWith('header') && sel !== '.card' && sel !== 'footer' && el.querySelector(sel))
  return held ? held[1] : 'words'
}

// a part of the page (a section id) or a whole card (a group id): open its card, show it on the page
function openPart(id) {
  const g = groupOf(id)
  if (SEC[id]) S.open.add(id)
  S.part = g
  // an empty menu opens on a blank line to type into
  if (g === 'offer' && S.open.has('items') && !S.d.items.length) S.d.items.push({ n: '', p: '', note: '' })
  drawParts()
  const card = $(`[data-grp="${g}"]`)
  if (!card) return
  const sec = SEC[id] && card.querySelector(`[data-sec="${id}"]`)
  if (narrow()) {
    window.scrollTo(0, 0)
    const body = card.querySelector('.pbody')
    if (body && sec) body.scrollTop = sec.offsetTop - 70
  } else (sec && id !== g ? sec : card).scrollIntoView({ behavior: 'smooth', block: 'start' })
  const fl = sec || card
  fl.classList.remove('flash'); void fl.offsetWidth; fl.classList.add('flash')
}
function closePart() {
  const g = S.part
  S.part = ''
  drawParts()
  if (!narrow() && g) $(`[data-grp="${g}"]`)?.scrollIntoView({ block: 'nearest' })
}

// the open part, lit on the page and scrolled into view
function lightPart(scroll = true) {
  const doc = $('#frame')?.contentDocument
  if (!doc || !doc.body) return
  const ids = S.part ? (GROUPS.find(([g]) => g === S.part)?.[1] || []) : []
  // the first block of the part's first section that is on the page: the map before the hours
  let first = null, rank = 99
  doc.querySelectorAll('[data-part]').forEach((el) => {
    const i = ids.indexOf(el.dataset.part)
    el.classList.toggle('mk-on', i >= 0)
    if (i >= 0 && i < rank) { first = el; rank = i }
  })
  doc.body.classList.toggle('mk-lit', !!first && S.part !== 'look')
  if (scroll && first) first.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function wireFrame(f) {
  const doc = f.contentDocument
  if (!doc) return
  const st = doc.createElement('style'); st.textContent = PART_CSS; doc.head.appendChild(st)
  doc.querySelectorAll('header.top img, header.top #st, header.top .dings, header.top, main.wrap > *, footer').forEach((el) => { el.dataset.part = partOf(el) })
  // the name and the line under it, typed on the page
  const top = doc.querySelector('header.top .t')
  const h1 = top?.querySelector('h1')
  let tag = top?.querySelector('p.tag')
  if (h1 && !tag) { tag = doc.createElement('p'); tag.className = 'tag mk-ghost'; tag.textContent = ui(S.lang, 'addTag'); h1.after(tag) }
  const inline = (el, key, max) => {
    if (!el) return
    el.contentEditable = 'plaintext-only'
    el.spellcheck = false
    el.addEventListener('focus', () => { S.inline = true; if (el.classList.contains('mk-ghost')) { el.textContent = ''; el.classList.remove('mk-ghost') } })
    el.addEventListener('input', () => {
      const v = el.textContent.replace(/\s+/g, ' ').slice(0, max)
      S.d[key] = v
      const box = $(`[data-k="${key}"]`); if (box) box.value = v
      changed()
    })
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur() } })
    el.addEventListener('blur', () => { S.inline = false; preview(true) })
  }
  inline(h1, 'name', 60)
  inline(tag, 'tagline', 140)
  // the kind's picture, until the maker's own goes on
  const cov = S.d.cover && S.d.credits?.[S.d.cover]
  if (cov && KPIC[S.kind] && (cov.src === KPIC[S.kind].src || cov.title === KPIC[S.kind].title) && doc.querySelector('header.top')) {
    const b = doc.createElement('span'); b.className = 'mk-pic'; b.textContent = ui(S.lang, 'yourPic'); b.dataset.part = 'photos'
    doc.querySelector('header.top').appendChild(b)
  }
  doc.addEventListener('click', (e) => {
    if (e.target.closest('[contenteditable]')) return
    const p = e.target.closest('[data-part]')
    if (!p) return
    e.preventDefault(); e.stopPropagation()
    openPart(p.dataset.part)
  }, true)
}

// ---- preview + saving ----------------------------------------------------------------------

function imgUrl(id, small) { return S.local.get(id) || `/img/${id}${small ? '-s' : ''}.webp` }

let pvTimer = 0
function preview(now) {
  clearTimeout(pvTimer)
  pvTimer = setTimeout(() => {
    const f = $('#frame')
    if (!f) return
    if (S.inline) return
    const html = render({ name: S.name, look: S.look, lang: S.pageLang, kind: S.kind, d: S.d, views: S.views || 1234, status: 'live', tier: S.tier }, { preview: true, img: imgUrl, origin: location.origin, hotel: S.hotel })
    const y = f.contentWindow?.scrollY || 0
    f.srcdoc = html
    f.onload = () => { try { f.contentWindow.scrollTo(0, y) } catch {} ; f.contentDocument?.querySelectorAll('a[href]').forEach((a) => a.setAttribute('target', '_blank')); try { wireFrame(f); lightPart(false) } catch {} }
  }, now ? 0 : 260)
}

// the open card's picture and line follow what the maker types
function refreshHead() {
  const card = S.part && $(`[data-grp="${S.part}"]`)
  if (!card) return
  const [g, , d0] = GROUPS.find(([x]) => x === S.part)
  const sm = summary(g), em = card.querySelector('.phead em'), th = card.querySelector('.phead .th')
  card.classList.toggle('none', !sm)
  if (em) em.innerHTML = sm ? `${icon('check')}${esc(sm)}` : T('sm_none')
  if (th && !th.contains(document.activeElement)) { const t = document.createElement('div'); t.innerHTML = thumb(g, d0); if (t.firstChild.outerHTML !== th.outerHTML) th.replaceWith(t.firstChild) }
}

let saveTimer = 0
function changed() {
  preview()
  refreshHead()
  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 1400)
  store.set('d:' + S.token, { d: S.d, look: S.look, at: Date.now() })
}

async function save(extra = {}) {
  clearTimeout(saveTimer)
  S.saving = true
  const st = $('#state'); if (st) st.textContent = stateText()
  try {
    // a live page whose name, picture, avatar or look changed gets a new share card
    if (S.status === 'live' && !extra.publish && cardKey({ look: S.look, name: S.name, kind: S.kind, tier: S.tier }, S.d) !== S.cardKey) await makeCard().catch(() => {})
    const d = { ...S.d, items: S.d.items.filter((x) => x.n || x.p || x.note) }
    const r = await call('PUT', 'site', { d, look: S.look, lang: S.pageLang, kind: S.kind, ...extra })
    S.status = r.status
    if (r.d) { S.d.credits = r.d.credits; S.d.video = r.d.video }
    remember()
  } catch (e) {
    toast(ui(S.lang, e.message === 'quota' ? 'e_quota' : e.message === 'edit-link' ? 'e_link' : 'e_net'))
  } finally {
    S.saving = false
    const st2 = $('#state'); if (st2) st2.textContent = stateText()
    const pub = $('#pub'); if (pub) pub.textContent = ui(S.lang, S.status === 'live' ? 'share' : 'publish')
  }
}

// ---- photos ------------------------------------------------------------------------------

async function shrink(bmp, max, q) {
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * r), h = Math.round(bmp.height * r)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  c.getContext('2d').drawImage(bmp, 0, 0, w, h)
  let b = await new Promise((ok) => c.toBlob(ok, 'image/webp', q))
  if (!b || b.type !== 'image/webp') b = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', q))
  return { blob: b, w, h }
}

async function upload(blob, small, role, w, h, pd) {
  const f = new FormData()
  f.append('role', role)
  f.append('big', blob, 'big')
  if (small) f.append('small', small, 'small')
  if (w) { f.append('w', w); f.append('h', h) }
  if (pd) f.append('pd', pd)
  return call('POST', 'photo', f, true)
}

async function addFiles(files) {
  const max = isGold() ? MAX_PHOTOS.gold : MAX_PHOTOS.free
  files = files.slice(0, max - S.d.photos.length)
  S.busy += files.length
  redrawSec('photos')
  for (const file of files) {
    try {
      const raw = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer())
      const ex = exifBlock(raw)
      if (ex) { const x = readExif(ex); if (x.lat != null && x.lon != null) S.photoGps = { lat: x.lat, lng: x.lon } }
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      await addBitmap(bmp)
    } catch (e) {
      toast(ui(S.lang, e.message === 'photo-refused' ? 'e_refused' : e.message === 'quota' ? 'e_quota' : 'e_net'))
    }
    S.busy--
    redrawSec('photos')
  }
  if (S.photoGps && S.d.place.lat === null) { S.open.add('map'); drawParts() }
  changed()
}

async function addBitmap(bmp, pd) {
  const big = await shrink(bmp, 1600, 0.82)
  const small = await shrink(bmp, 480, 0.76)
  const r = await upload(big.blob, small.blob, 'photo', big.w, big.h, pd)
  S.local.set(r.id, URL.createObjectURL(small.blob))
  S.big.set(r.id, big.blob)
  S.d.photos.push(r.id)
  if (r.credit) S.d.credits = { ...(S.d.credits || {}), [r.id]: r.credit }
  if (!S.d.cover) S.d.cover = r.id
  return r
}

// ---- the free picture library -------------------------------------------------------------

// searches that bring back pictures worth a cover, by kind of page (the museum's paintings and prints among them)
const PD_IDEAS = {
  food: ['still life fruit', 'noodles', 'tea', 'market', 'rice field', 'botanical illustration'],
  shop: ['textile pattern', 'ceramics', 'still life', 'woodblock print', 'flowers', 'market'],
  service: ['botanical illustration', 'garden', 'hands', 'woodblock print', 'temple', 'mountains'],
  work: ['architecture drawing', 'woodblock print', 'textile pattern', 'botanical illustration', 'map', 'abstract painting'],
  stay: ['Chiang Mai', 'garden', 'mountains', 'temple', 'river', 'bedroom painting'],
  homes: ['house', 'garden', 'architecture drawing', 'window', 'courtyard', 'rice field'],
  me: ['flowers', 'birds', 'woodblock print', 'stars', 'ocean', 'butterflies'],
  event: ['festival', 'lanterns', 'dance', 'music', 'fireworks', 'crowd'],
  group: ['temple', 'forest', 'mountains', 'river', 'village', 'boats'],
}

function pdSheet() {
  const box = document.createElement('div')
  box.className = 'sheet pdsheet'
  box.innerHTML = `<div class="box"><h2>${ding('sparkle', 'riso')} ${T('pdTitle')}</h2><p class="hint">${T('pdHint')}</p>
    <form class="row" id="pdf"><input id="pdq" type="search" placeholder="${T('pdSearch')}" style="flex:1;min-width:180px" autocomplete="off"><button class="go">${icon('compass')}</button></form>
    <div class="chips pdideas">${(PD_IDEAS[S.kind] || PD_IDEAS.shop).map((q) => `<button type="button" data-pdq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <div class="pdgrid" id="pdg"></div><p style="text-align:center"><button class="back" id="pdclose">${T('back')}</button></p></div>`
  document.body.appendChild(box)
  const q = box.querySelector('#pdq'), grid = box.querySelector('#pdg')
  q.value = S.d.name && /[a-z]/i.test(S.d.name) ? '' : ''
  q.focus()
  box.querySelector('#pdclose').onclick = () => box.remove()
  box.addEventListener('click', (e) => { if (e.target === box) box.remove() })
  box.querySelectorAll('[data-pdq]').forEach((b) => (b.onclick = () => { q.value = b.dataset.pdq; box.querySelector('#pdf').requestSubmit() }))
  box.querySelector('#pdf').onsubmit = async (e) => {
    e.preventDefault()
    const term = q.value.trim()
    if (!term) return
    grid.innerHTML = '<p class="hint">…</p>'
    try {
      const r = await call('GET', 'pd?q=' + encodeURIComponent(term))
      if (!r.results.length) { grid.innerHTML = `<p class="hint">${T('pdNone')}</p>`; return }
      grid.innerHTML = r.results.map((x, i) => `<button class="pdi" data-i="${i}"><img src="${esc(x.thumb)}" data-alt="${esc(x.big)}" alt="${esc(x.title)}" loading="lazy" referrerpolicy="no-referrer"><span>${esc(x.title)}<small>${esc(x.by)} · ${esc(x.license)}</small></span></button>`).join('')
      grid.querySelectorAll('.pdi').forEach((b) => (b.onclick = () => pdTake(r.results[+b.dataset.i], b, box)))
      grid.querySelectorAll('.pdi img').forEach((im) => (im.onerror = () => { if (im.dataset.alt && im.src !== im.dataset.alt) im.src = im.dataset.alt; else im.closest('.pdi').remove() }))
    } catch (err) { grid.innerHTML = `<p class="hint">${T(err.message === 'quota' ? 'e_quota' : 'e_net')}</p>` }
  }
}

async function pdTake(x, b, box) {
  if (S.d.photos.length >= (isGold() ? MAX_PHOTOS.gold : MAX_PHOTOS.free)) return
  b.disabled = true
  b.classList.add('busy')
  b.querySelector('span').innerHTML = T('pdBusy')
  try {
    const r = await fetch('/api/pd/raw?id=' + encodeURIComponent(x.id), { headers: { 'x-edit': S.token } })
    if (!r.ok) throw new Error('net')
    const bmp = await createImageBitmap(await r.blob())
    await addBitmap(bmp, x.id)
    box.remove()
    redrawSec('photos')
    changed()
  } catch (e) {
    b.disabled = false; b.classList.remove('busy')
    toast(ui(S.lang, e.message === 'photo-refused' ? 'e_refused' : 'e_net'))
  }
}

// ---- message copies by email -----------------------------------------------------------------

async function notifyOn() {
  const v = $('#nmail').value.trim()
  if (!v) return
  try {
    const r = await call('PUT', 'notify', { email: v })
    S.notifyEmail = v.toLowerCase(); S.notifyOk = false
    redrawSec('msg')
    if (!r.sent) toast(ui(S.lang, 'notifyNo'))
  } catch (e) { toast(ui(S.lang, e.message === 'quota' ? 'e_quota' : 'e_net')) }
}
async function notifyOff() {
  try { await call('DELETE', 'notify'); S.notifyEmail = ''; S.notifyOk = false; redrawSec('msg') } catch { toast(ui(S.lang, 'e_net')) }
}

// ---- places around here (Gold) -----------------------------------------------------------

async function spotFromLink() {
  const u = $('#spotlink').value.trim()
  if (!u) return
  try {
    const r = await call('GET', 'resolve?u=' + encodeURIComponent(u))
    if (r.lat == null) throw new Error('no')
    S.d.spots.push({ n: '', note: '', lat: r.lat, lng: r.lng })
    redrawSec('spots'); $(`[data-k="spots.${S.d.spots.length - 1}.n"]`)?.focus(); changed()
  } catch { toast(ui(S.lang, 'e_coords')) }
}
function spotHere() {
  const p = S.picker?.map?.getCenter?.()
  const lat = p ? p.lat : S.d.place.lat, lng = p ? p.lng : S.d.place.lng
  if (lat == null) { toast(ui(S.lang, 'noPin')); return }
  S.d.spots.push({ n: '', note: '', lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 })
  redrawSec('spots'); $(`[data-k="spots.${S.d.spots.length - 1}.n"]`)?.focus(); changed()
}

// ---- map tools ---------------------------------------------------------------------------

async function mountMap() {
  const el = $('#mapel')
  if (!el || S.picker) return
  const p = S.d.place
  const lat = p.lat ?? (S.d.place.cc === 'TH' || !S.d.place.cc ? 18.7883 : 20), lng = p.lng ?? (S.d.place.cc === 'TH' || !S.d.place.cc ? 98.9853 : 0)
  try {
    const m = await import('./map.mjs')
    S.picker = await m.picker(el, { lat, lng, zoom: p.lat !== null ? p.zoom : (S.d.place.cc === 'TH' || !S.d.place.cc ? 13 : 2), accent: S.d.accent || LOOKS[S.look].accent, onMove: moved })
    if (!S.picker.covered) { $('#mapwrap').style.display = 'none'; $('#nomap').style.display = '' }
  } catch { $('#mapwrap').style.display = 'none'; $('#nomap').style.display = '' }
}

let snapTimer = 0, moving = false
function moved({ lat, lng, zoom }) {
  if (moving) return
  S.d.place.lat = Math.round(lat * 1e6) / 1e6
  S.d.place.lng = Math.round(lng * 1e6) / 1e6
  S.d.place.zoom = zoom
  const ps = $('#pinstate')
  if (ps) { ps.className = 'pinstate ok'; ps.innerHTML = `${icon('pin')}${T('pinSet')} · ${S.d.place.lat.toFixed(5)}, ${S.d.place.lng.toFixed(5)}` }
  changed()
}

function setPin(lat, lng, z = 17) {
  S.d.place.lat = Math.round(lat * 1e6) / 1e6
  S.d.place.lng = Math.round(lng * 1e6) / 1e6
  S.d.place.zoom = z
  S.open.add('map')
  if (S.picker) { S.picker.go(lat, lng, z) } else { redrawSec('map') }
  moved({ lat, lng, zoom: z })
}

function here() {
  if (!navigator.geolocation) return
  const b = $('#here'); if (b) b.disabled = true
  navigator.geolocation.getCurrentPosition((p) => { if (b) b.disabled = false; setPin(p.coords.latitude, p.coords.longitude, 18) },
    () => { if (b) b.disabled = false; toast(ui(S.lang, 'e_coords')) }, { enableHighAccuracy: true, timeout: 20000 })
}

async function listingPin(i) {
  const inp = $(`[data-lpin="${i}"]`), u = inp?.value.trim()
  if (!u) return
  try {
    const r = await call('GET', 'resolve?u=' + encodeURIComponent(u))
    if (r.lat == null) throw new Error('no')
    Object.assign(S.d.lists[i], { lat: Math.round(r.lat * 1e6) / 1e6, lng: Math.round(r.lng * 1e6) / 1e6 })
    redrawSec('lists'); changed()
  } catch { toast(ui(S.lang, 'e_coords')) }
}

async function pasteLink() {
  const u = $('#paste').value.trim()
  if (!u) return
  try {
    const r = await call('GET', 'resolve?u=' + encodeURIComponent(u))
    if (r.lat == null) throw new Error('no')
    setPin(r.lat, r.lng, 18)
    $('#paste').value = ''
  } catch { toast(ui(S.lang, 'e_coords')) }
}

// ---- the other tabs: messages, traffic, Gold ------------------------------------------------

function drawTab() {
  app.innerHTML = tabs() + `<div class="tabbody" id="tb"><p class="loading">…</p></div>`
  bindTabs()
  if (S.tab === 'msgs') return drawMsgs()
  if (S.tab === 'stats') return drawStats()
  if (S.tab === 'book') return drawBookings()
  return drawGold()
}

async function drawBookings() {
  const tb = $('#tb')
  let r
  try { r = await call('GET', 'bookings') } catch { tb.innerHTML = `<p class="hint">${T('e_net')}</p>`; return }
  S.asks = r.rows.filter((x) => x.status === 'new').length
  const nav = app.querySelector('.tabs'); if (nav) { nav.outerHTML = tabs(); bindTabs() }
  const card = (x) => {
    const rp = replyHref(x.reach)
    return `<article class="msg bk ${x.status}" data-id="${esc(x.id)}"><header><b>${esc(x.what)}</b><span class="bst">${T('bk_' + x.status)}</span></header>
      <p class="when">${esc(x.when)}</p><p class="body">${x.ref ? `<code>${esc(x.ref)}</code> · ` : ''}<b>${esc(x.name || '—')}</b>${x.reach ? ' · ' + esc(x.reach) : ''}${x.email ? ' · ' + esc(x.email) : ''}${x.people > 1 ? ` · ${x.people} ${T('bk_people')}` : ''}${x.kind === 'room' && x.status !== 'hold' ? ` · <b class="${x.paid ? 'paidy' : 'paidn'}">${T(x.paid ? 'bk_paid' : 'bk_unpaid')}</b>` : ''}</p>
      ${x.note ? `<p class="reach">${esc(x.note)}</p>` : ''}
      <footer>${x.status === 'hold' ? '' : `${x.status !== 'ok' ? `<button class="go small" data-bk="ok">${icon('check')}${T('bk_accept')}</button>` : ''}${x.status !== 'no' ? `<button class="go ghost small" data-bk="no">${T('bk_decline')}</button>` : ''}`}
      ${x.kind === 'room' && x.status === 'ok' ? `<button class="go ghost small" data-bk="${x.paid ? 'unpaid' : 'paid'}">${T(x.paid ? 'bk_markUnpaid' : 'bk_markPaid')}</button>` : ''}
      ${rp ? `<a class="go line small" href="${esc(rp.href)}" target="_blank" rel="noopener">${icon('chat')}${T('m_reply')} · ${esc(rp.label)}</a>` : ''}<button class="go ghost small" data-bk="gone">${T('bk_del')}</button></footer></article>`
  }
  const groups = ['new', 'ok', 'hold', 'no', 'gone'].map((st) => [st, r.rows.filter((x) => x.status === st)]).filter(([, l]) => l.length)
  const closeBox = S.d.rooms.length ? `<section class="panel"><h3>${T('bk_close')}</h3><div class="grid3f"><label class="mini"><span>${T('r_name')}</span><select id="clroom">${S.d.rooms.map((x) => `<option value="${esc(x.id)}">${esc(x.n)}</option>`).join('')}</select></label>
    <label class="mini"><span>${T('roomInB')}</span><input type="date" id="clfrom"></label><label class="mini"><span>${T('roomOutB')}</span><input type="date" id="clto"></label></div>
    <label class="mini"><span>${T('bk_closeWho')}</span><input id="clname" maxlength="80"></label><button class="go ghost small" id="clgo">${icon('plus')}${T('bk_closeGo')}</button></section>` : ''
  const sumOk = r.rows.filter((x) => x.status === 'ok' && x.kind === 'room')
  const money = (n) => '฿' + new Intl.NumberFormat(S.lang).format(n)
  const tot = sumOk.reduce((a, x) => a + (Number(x.total) || 0), 0), paidT = sumOk.filter((x) => x.paid).reduce((a, x) => a + (Number(x.total) || 0), 0)
  const head = sumOk.length ? `<div class="tiles"><div class="tile"><b>${sumOk.length}</b><span>${T('bk_ok')}</span></div><div class="tile"><b>${money(tot)}</b><span>${T('bk_total')}</span></div><div class="tile"><b>${money(paidT)}</b><span>${T('bk_paid')}</span></div></div>` : ''
  const cals = (r.reads || []).length ? `<section class="panel"><h3>${T('bk_cal')}</h3><ul class="plain">${r.reads.map((x) => {
    const room = S.d.rooms.find((y) => y.id === x.room)
    let host = x.url; try { host = new URL(x.url).hostname.replace(/^www\./, '') } catch {}
    return `<li>${esc(room ? room.n : x.room)} · ${esc(host)} · ${x.ok ? `${T('bk_read')} ${esc(when(x.at))} · ${x.nights ?? 0}` : `<b style="color:var(--red)">${T('bk_failed')}</b>`}</li>`
  }).join('')}</ul></section>` : ''
  tb.innerHTML = head + (groups.length ? groups.map(([st, l]) => `<h3 class="bkh">${T('bk_' + st)} · ${l.length}</h3><div class="msgs">${l.map(card).join('')}</div>`).join('') : `<div class="empty">${ding('calendar', 'paper')}<p>${T('bk_none')}</p></div>`) + closeBox + cals
  const clgo = $('#clgo')
  if (clgo) clgo.onclick = async () => {
    try { await call('POST', 'bookings', { act: 'close', room: $('#clroom').value, from: $('#clfrom').value, to: $('#clto').value, name: $('#clname').value }); drawBookings() } catch { toast(ui(S.lang, 'e_net')) }
  }
  tb.onclick = async (e) => {
    const b = e.target.closest('[data-bk]'); if (!b) return
    const id = b.closest('[data-id]')?.dataset.id
    b.disabled = true
    try { await call('POST', 'bookings', { id, act: b.dataset.bk }); drawBookings() } catch { b.disabled = false; toast(ui(S.lang, 'e_net')) }
  }
  dingbats(['signals'])
}

const when = (iso) => { try { return new Intl.DateTimeFormat(S.lang, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) } catch { return iso.slice(0, 16).replace('T', ' ') } }

function replyHref(reach) {
  const r = String(reach || '').trim()
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(r)) return { href: 'mailto:' + r, label: ui(S.lang, 'email') }
  const digits = r.replace(/[^\d+]/g, '')
  if (digits.replace('+', '').length >= 8 && /^[\d+\s()-]+$/.test(r)) return { href: 'tel:' + digits, label: ui(S.lang, 'phone') }
  const id = r.replace(/^line\s*(id)?\s*[:：]?\s*/i, '').trim()
  if (/^@?[a-z0-9._-]{3,40}$/i.test(id)) return { href: 'https://line.me/R/ti/p/' + (id.startsWith('@') ? encodeURIComponent(id) : '~' + encodeURIComponent(id)), label: 'LINE' }
  return null
}

// The other tabs each lead with what they are for, and show the page the way a reader meets it.
function miniShell(id) {
  return `<div class="mshell"><div class="url">${icon('globe')}<span>sites.motdang.net/${esc(S.name)}</span></div><iframe id="${id}" title="${T('preview')}" tabindex="-1"></iframe></div>`
}
function fillMini(id, { look, tier, anchor } = {}) {
  const f = $('#' + id)
  if (!f) return
  const t = tier || S.tier
  f.srcdoc = render({ name: S.name, look: look || S.look, lang: S.pageLang, kind: S.kind, d: S.d, views: S.views || 1234, status: 'live', tier: t }, { preview: true, gold: t === 'gold', img: imgUrl, origin: location.origin, hotel: S.hotel })
  f.onload = () => {
    try {
      const doc = f.contentDocument
      doc.addEventListener('click', (e) => { if (e.target.closest('a[href],button,form')) e.preventDefault() }, true)
      const el = anchor && doc.querySelector(anchor)
      if (el) f.contentWindow.scrollTo({ top: el.getBoundingClientRect().top + f.contentWindow.scrollY - 14, behavior: 'instant' })
    } catch {}
  }
}

function copiesBox() {
  const st = S.notifyEmail ? (S.notifyOk ? `<p class="pinstate ok">${icon('check')}${esc(ui(S.lang, 'notifyOk').replace('{e}', S.notifyEmail))}</p>` : `<p class="pinstate">${icon('mail')}${T('notifyWait')} · ${esc(S.notifyEmail)}</p>`) : ''
  return `<div class="copies"><b>${T('m_copies')}</b>${st}${S.notifyEmail ? `<button class="back" id="nmailoff">× ${T('notifyOff')}</button>`
    : `<div class="row"><input id="nmail" type="email" autocomplete="email" placeholder="${T('email')}" aria-label="${T('notifyEmail')}" style="flex:1;min-width:180px"><button class="go ghost" id="nmailgo">${T('notifyGo')}</button></div>`}</div>`
}

async function drawMsgs() {
  const tb = $('#tb')
  let list
  try { list = (await call('GET', 'msgs')).msgs } catch { tb.innerHTML = `<p class="hint">${T('e_net')}</p>`; return }
  S.unread = list.filter((m) => m.status === 'new').length
  const nav = app.querySelector('.tabs'); if (nav) { nav.outerHTML = tabs(); bindTabs() }
  // the messages first when there are any; then where copies go, and the box as a reader meets it
  const head = `<section class="tabhead one"><div><h2 class="th2">${T('s_msg')}</h2><p class="why3">${T('m_why')}</p></div></section>`
  const how = `<section class="tabhead later"><div>${S.d.msg ? copiesBox() : `<div class="copies off"><p>${T('m_off')}</p><button class="go" id="msgon">${T('m_on')}</button></div>`}</div>
    <div class="minip"><p class="lbl">${T('m_pv')}</p>${miniShell('mini')}</div></section>`
  const body = !list.length ? ''
    : `${S.unread ? `<p style="text-align:right"><button class="go ghost small" id="mall">${icon('check')}${T('m_all')}</button></p>` : ''}<div class="msgs">${list.map((m) => {
      const rp = replyHref(m.reach)
      return `<article class="msg ${m.status}" data-id="${esc(m.id)}"><header><b>${esc(m.name || '—')}</b><span>${esc(when(m.at))}</span></header>
        ${m.status === 'held' ? `<p class="heldtag">${T('m_held')}</p>` : ''}<p class="body">${esc(m.body)}</p>${m.reach ? `<p class="reach">${esc(m.reach)}</p>` : ''}
        <footer>${rp ? `<a class="go line small" href="${esc(rp.href)}" target="_blank" rel="noopener">${icon('chat')}${T('m_reply')} · ${esc(rp.label)}</a>` : ''}
        <button class="go ghost small" data-act="${m.status === 'new' || m.status === 'held' ? 'read' : 'unread'}">${T(m.status === 'new' || m.status === 'held' ? 'm_read' : 'm_unread')}</button>
        <button class="go ghost small" data-act="gone">${T('m_del')}</button></footer></article>`
    }).join('')}</div>`
  tb.innerHTML = head + (list.length ? body : `<p class="none2">${ding('mailbox', 'paper')}<span>${T('m_none')}</span></p>`) + how
  fillMini('mini', { anchor: '#message' })
  dingbats(['signals'])
  tb.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return
    if (b.id === 'nmailgo') return notifyOn().then(drawMsgs)
    if (b.id === 'nmailoff') return notifyOff().then(drawMsgs)
    if (b.id === 'msgon') { S.d.msg = true; await save(); return drawMsgs() }
    try {
      if (b.id === 'mall') { await call('POST', 'msgs', { act: 'read', all: true }); return drawMsgs() }
      const id = b.closest('[data-id]')?.dataset.id
      if (b.dataset.act && id) { await call('POST', 'msgs', { act: b.dataset.act, id }); drawMsgs() }
    } catch { toast(ui(S.lang, 'e_net')) }
  }
}

const TAP_WORD = { call: 'call', line: 'line', dir: 'dir', ride: 'ride', food: 'food', lineman: 'lineman', share: 'share', copy: 'copy', map: 'map', far: 'far', vcf: 'saveContact',
  ics: 'addCal', sign: 'sign', order: 'lineOrder', msg: 'msg', link: 'links', photo: 'photos', video: 'video', email: 'email', web: 'web', qr: 'qr', story: 'story' }
const TAP_EXTRA = { shareline: 'LINE', sharefb: 'Facebook', sharex: 'X', sharewa: 'WhatsApp', sharetg: 'Telegram', social: 'Facebook · Instagram · TikTok', whatsapp: 'WhatsApp' }

function shareBox() {
  const url = `${location.origin}/${S.name}`
  if (S.status === 'held') return `<div class="sharebox"><span class="sbd">${ding('hourglass', 'paper')}</span><p>${T('held')}</p></div>`
  if (S.status !== 'live') return `<div class="sharebox"><span class="sbd">${ding('megaphone', 'paper')}</span><p>${T('st_notLive')}</p><button class="go red" id="sbpub">${T('publish')}</button></div>`
  return `<div class="sharebox"><span class="sbd">${ding('megaphone', 'paper')}</span><p>${T('st_first')}</p>
    <div class="sbrow"><a class="go line" href="${esc(lineShare((S.d.name || S.name) + ' ' + url))}" target="_blank" rel="noopener">${icon('chat')}LINE</a>
      <button class="go" id="sbsh">${icon('share')}${T('share')}</button><button class="go ghost" id="sbcp">${T('copy')}</button>
      <a class="go ghost" href="${esc(url)}/sign" target="_blank">${icon('print')}${T('sign')}</a></div>
    <div class="sbqr">${qrSvg(url, { dark: '#000', light: '#fff', label: url })}<a href="${esc(url)}" target="_blank">${esc(url.replace(/^https?:\/\//, ''))}</a></div></div>`
}
function bindShare() {
  const url = `${location.origin}/${S.name}`
  const pub = $('#sbpub'); if (pub) pub.onclick = () => { S.tab = 'edit'; draw(); publish() }
  const sh = $('#sbsh'); if (sh) sh.onclick = () => (navigator.share ? navigator.share({ title: S.d.name, url }).catch(() => {}) : copy(url))
  const cp = $('#sbcp'); if (cp) cp.onclick = () => copy(url)
}

async function drawStats(days) {
  const tb = $('#tb')
  let r
  try { r = await call('GET', 'stats' + (days ? '?days=' + days : '')) } catch { tb.innerHTML = `<p class="hint">${T('e_net')}</p>`; return }
  const { word } = await import('./words.mjs')
  const nf = new Intl.NumberFormat(S.lang)
  const max = Math.max(1, ...r.days.map((d) => d.people))
  const region = (c) => { try { return new Intl.DisplayNames([S.lang], { type: 'region' }).of(c) } catch { return c } }
  const tapName = (k) => TAP_EXTRA[k] || (TAP_WORD[k] ? word(S.lang, TAP_WORD[k]) : k)
  const list = (rows, name) => rows.length ? `<ol class="hbars">${rows.map((x) => `<li><span class="lab">${esc(name(x.k))}</span><span class="bar"><i style="width:${Math.max(3, (x.n / rows[0].n) * 100)}%"></i></span><b>${nf.format(x.n)}</b></li>`).join('')}</ol>` : '<p class="hint">—</p>'
  const tile = (n, label, sub) => `<div class="tile"><b>${nf.format(n)}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</div>`
  const hourMax = Math.max(1, ...r.hour)
  const empty = !r.total.views
  const step = Math.max(1, Math.ceil(r.days.length / 8))
  const head = `<section class="tabhead one"><div><h2 class="th2">${T('t_stats')}</h2><p class="why3">${T('st_why')}</p></div></section>`
  // nobody yet: no wall of zeros, the ways to send the page out instead
  if (empty) { tb.innerHTML = head + shareBox(); bindShare(); dingbats(['signals']); return }
  const span = r.days.length > 31 ? T('st_year') : T('st_month')
  tb.innerHTML = `${head}<p class="headline">${esc(ui(S.lang, 'st_head').replace('{n}', nf.format(r.week.people)))} <span>${esc(ui(S.lang, 'st_headDay').replace('{n}', nf.format(r.today.people)))}</span></p>
    <div class="tiles t3">${tile(r.total.people, T('st_people'), span)}${tile(r.total.views, T('st_views'), span)}${tile(r.total.taps, T('st_taps'), span)}</div>
    <section class="panel"><h3>${T('st_day')}</h3><div class="chart" id="chart" role="img" aria-label="${T('st_day')}">${r.days.map((d) => `<span class="col" data-tip="${esc(d.day)} · ${nf.format(d.people)} ${T('st_people')} · ${nf.format(d.views)} ${T('st_views')}"><i style="height:${(d.people / max) * 100}%"></i></span>`).join('')}</div>
      <div class="axis">${r.days.map((d, i) => `<span>${i % step === 0 ? esc(d.day.slice(5).replace('-', '/')) : ''}</span>`).join('')}</div><div class="tip" id="tip" hidden></div>
      ${isGold() ? `<p class="row" style="margin-top:12px"><button class="go ghost small" data-days="30">${T('st_month')}</button><button class="go ghost small" data-days="365">${T('st_year')}</button><button class="go ghost small" id="csv">${icon('download')}${T('st_csv')}</button></p>` : ''}</section>
    <div class="panels"><section class="panel"><h3>${T('st_from')}</h3>${list(r.ref, (k) => (k === '(direct)' ? ui(S.lang, 'st_direct') : k))}</section>
      <section class="panel"><h3>${T('st_tapsBy')}</h3>${list(r.tap, tapName)}</section>
      <section class="panel"><h3>${T('st_cc')}</h3>${list(r.cc, region)}</section>
      <section class="panel"><h3>${T('st_dev')}</h3>${list(r.dev, (k) => ui(S.lang, 'dev_' + k))}
        <h3 style="margin-top:18px">${T('st_hours')}</h3><div class="hours24">${r.hour.map((n, h) => `<i title="${String(h).padStart(2, '0')}:00 · ${nf.format(n)}" style="opacity:${n ? 0.18 + 0.82 * (n / hourMax) : 0.07}"></i>`).join('')}</div><div class="axis h24"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div></section></div>
    <p class="hint">${icon('gear')} ${nf.format(r.total.machines)} ${T('st_machines')}. ${T('st_machinesNote')}</p>`
  const tip = $('#tip'), chart = $('#chart')
  chart.addEventListener('pointermove', (e) => {
    const c = e.target.closest('.col'); if (!c) { tip.hidden = true; return }
    tip.hidden = false; tip.textContent = c.dataset.tip
    const rc = chart.getBoundingClientRect(), cc = c.getBoundingClientRect()
    tip.style.left = Math.min(rc.width - 10, Math.max(10, cc.left - rc.left + cc.width / 2)) + 'px'
  })
  chart.addEventListener('pointerleave', () => { tip.hidden = true })
  tb.querySelectorAll('[data-days]').forEach((b) => (b.onclick = () => drawStats(+b.dataset.days)))
  const csv = $('#csv')
  if (csv) csv.onclick = async () => {
    const res = await fetch('/api/stats.csv', { headers: { 'x-edit': S.token } })
    if (!res.ok) return toast(ui(S.lang, 'e_net'))
    const a = document.createElement('a'); a.href = URL.createObjectURL(await res.blob()); a.download = S.name + '-traffic.csv'; a.click()
  }
  dingbats(['signals', 'classic'])
}

async function drawGold() {
  const tb = $('#tb')
  let r = null
  const feats = ['g_f7', 'g_f8', 'g_f9', 'g_f1', 'g_f2', 'g_f3', 'g_f4', 'g_f5', 'g_f6']
  const fdings = ['key', 'megaphone', 'chat', 'crown', 'search', 'camera', 'compass', 'calendar', 'star']
  // the maker's own page in Gold leaf first, then the price, then the list
  const tryBtn = isGold() && S.look !== 'gold' ? `<button class="go big" id="trygold">${T('g_try')}</button>` : ''
  const head = `<section class="goldtop"><div class="goldhero">${LOOKS.gold.art}<h2>${T('g_lead')}</h2><p class="gwhy">${T('g_why')}</p>${tryBtn}</div>
    <div class="minip"><p class="lbl">${T('g_see')}</p>${miniShell('gmini')}</div></section>`
  const list = `<section class="gfeats"><h3>${T('g_adds')}</h3><ul>${feats.map((k, i) => `<li>${ding(fdings[i], 'paper')}<span>${T(k)}</span></li>`).join('')}</ul></section>`
  const after = () => {
    fillMini('gmini', { look: 'gold', tier: 'gold' })
    const tg = $('#trygold'); if (tg) tg.onclick = () => { S.look = 'gold'; S.d.accent = ''; changed(); S.tab = 'edit'; draw(); openPart('look') }
  }
  const rooms = S.d.rooms.length > 0
  const want = S.payPlan || (rooms && (S.trial || S.plan === 'hotel') ? 'hotel' : 'gold')
  const needHotel = rooms && S.plan !== 'hotel'
  if (isGold() && !S.trial && !(needHotel && /^hotel/.test(S.payPlan || ''))) {
    tb.innerHTML = head + `<p class="goldon">★ ${esc(ui(S.lang, 'g_on').replace('{d}', S.goldUntil || ''))}</p>` +
      (needHotel ? `<p style="text-align:center"><button class="go" id="tohotel">${esc(ui(S.lang, 'g_hotelGo').replace('{p}', new Intl.NumberFormat(S.lang).format(S.plans?.hotel?.baht || 555)))}</button></p>` : '') + domainBox() + list
    after()
    dingbats(['signals', 'classic', 'curious'])
    bindDomain()
    const th = $('#tohotel'); if (th) th.onclick = () => { S.payPlan = 'hotel'; drawGold() }
    return
  }
  const pick = rooms && S.plans ? `<div class="field" style="text-align:center">${seg('payplan', want, [['gold', esc(ui(S.lang, 'g_planGold').replace('{p}', new Intl.NumberFormat(S.lang).format(S.plans.gold.baht)))], ['hotel', esc(ui(S.lang, 'g_planHotel').replace('{p}', new Intl.NumberFormat(S.lang).format(S.plans.hotel.baht)))], ...(S.plans.hotelyear ? [['hotelyear', esc(ui(S.lang, 'g_planHotelYear').replace('{p}', new Intl.NumberFormat(S.lang).format(S.plans.hotelyear.baht)))]] : [])])}</div>` : ''
  try { r = await call('POST', 'gold', { plan: want }) } catch { tb.innerHTML = head + `<p class="hint">${T('e_net')}</p>` + list; after(); return }
  if (r.tier === 'gold' && !S.trial) { S.tier = 'gold'; S.goldUntil = r.gold_until; return drawGold() }
  const tail = String(r.amount).split('.')[1] || '00'
  const nf = new Intl.NumberFormat(S.lang)
  tb.innerHTML = head + (S.trial ? `<p class="goldon">★ ${esc(ui(S.lang, 'g_trial').replace('{d}', S.goldUntil || ''))}</p>` : '') + pick + `<section class="goldpay"><p class="price">${esc(ui(S.lang, r.months === 1 ? 'g_priceMonth' : 'g_price').replace('{p}', nf.format(r.baht)))}</p>${r.hotel ? `<p class="hint">${T(r.months === 1 ? 'g_hotelWhy' : 'g_hotelYearWhy')}</p>` : ''}
    ${r.payload ? `<div class="ppqr">${qrSvg(r.payload, { dark: '#0e3d78', light: '#ffffff', label: 'PromptPay' })}<b>฿${esc(nf.format(Number(r.amount)))}</b><span>PromptPay</span></div>
      <p class="hint">${esc(ui(S.lang, 'g_scan').replace('{s}', tail))}</p>
      <label class="pick goldslip">${icon('download')}${T('g_slip')}<input type="file" accept="image/*" id="slip"></label><p id="slipstate" class="pinstate"></p>` : `<p class="hint">${T('g_nopp')}</p>`}</section>` + list + (isGold() ? domainBox() : '')
  after()
  dingbats(['signals', 'classic', 'curious'])
  bindDomain()
  tb.querySelectorAll('[data-seg="payplan"]').forEach((b) => (b.onclick = () => { S.payPlan = b.dataset.v; drawGold() }))
  const slip = $('#slip')
  if (slip) slip.onchange = async () => {
    const f = slip.files[0]; if (!f) return
    const st = $('#slipstate'); st.textContent = '…'
    const fd = new FormData(); fd.append('slip', f, 'slip.jpg')
    try {
      const res = await call('POST', 'gold/slip', fd, true)
      if (res.tier === 'gold') { S.tier = 'gold'; S.goldUntil = res.gold_until; S.trial = false; S.plan = want === 'gold' ? 'gold' : 'hotel'; S.hotel = want !== 'gold'; S.payPlan = ''; toast(ui(S.lang, 'g_thanks')); drawGold() }
      else { st.className = 'pinstate ok'; st.innerHTML = `${icon('check')}${T('g_wait')}` }
    } catch { st.textContent = ui(S.lang, 'e_net') }
  }
}

function domainBox() {
  if (!S.domains) return `<section class="panel"><h3>${T('g_domain')}</h3><p class="hint">${T('g_domainOff')}</p></section>`
  return `<section class="panel" id="dombox"><h3>${T('g_domain')}</h3><p class="hint">${T('g_domainHint')}</p>
    ${S.domain ? `<p class="pinstate${S.domainState === 'active' ? ' ok' : ''}">${S.domainState === 'active' ? `${icon('check')}${T('g_domainOn')} <a href="https://${esc(S.domain)}" target="_blank">${esc(S.domain)}</a>` : `${icon('clock')}${T('g_domainWait')} · ${esc(S.domain)}`}</p><div id="domrec"></div>
      <button class="back" id="domx">× ${T('g_domainDrop')}</button>`
    : `<div class="row"><input id="domin" placeholder="yourshop.com" autocapitalize="off" spellcheck="false" style="flex:1;min-width:200px"><button class="go ghost" id="domgo">${T('g_domainGo')}</button></div>`}</section>`
}
function bindDomain() {
  const go = $('#domgo'), x = $('#domx'), rec = $('#domrec')
  const show = (r) => { if (rec && r.records) rec.innerHTML = `<table class="dns">${r.records.map((x) => `<tr><td>${x.type}</td><td>${esc(x.name)}</td><td><code>${esc(x.value)}</code></td></tr>`).join('')}</table>` }
  if (go) go.onclick = async () => {
    try { const r = await call('PUT', 'domain', { domain: $('#domin').value }); S.domain = r.domain; S.domainState = r.state; drawGold() } catch (e) { toast(e.message === 'taken' ? ui(S.lang, 'a_taken') : e.why || ui(S.lang, 'e_net')) }
  }
  if (x) x.onclick = async () => { try { await call('DELETE', 'domain'); S.domain = ''; S.domainState = ''; drawGold() } catch { toast(ui(S.lang, 'e_net')) } }
  if (rec) call('GET', 'domain').then((r) => { S.domainState = r.state || S.domainState; show(r) }).catch(() => {})
}

// ---- putting it online ---------------------------------------------------------------------

/** The page's share card (card.mjs), drawn here and uploaded; the old one is dropped by the server. */
async function makeCard() {
  const load = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src })
  const blobImg = async (id, small) => (S.big.get(id) && !small ? load(URL.createObjectURL(S.big.get(id))) : load(imgUrl(id, small)))
  await dingbats(S.d.dings.map((n) => DINGBATS[n]).filter(Boolean))
  let drawing = null
  if (!S.d.cover && S.d.drawing) {
    try {
      const add = (src) => new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc) })
      drawLoad = drawLoad || add('/front/skyline.js').then(() => add('/front/doodler.js'))
      await drawLoad
      const D = window.MDDOODLER, set = S.d.scene || (SCENES[S.kind] || SCENES.shop)[0][0], p = S.d.place
      drawing = document.createElement('canvas'); drawing.width = 1200; drawing.height = 630
      D.portrait(drawing.getContext('2d'), 1200, 630, 4000, { set, place: { id: S.name, name: S.d.name || S.name, nameTh: S.d.name, nameEn: S.d.name, cat: S.kind, sub: [set], hours: osmHours(S.d.hours) || undefined, lat: p.lat ?? undefined, lng: p.lng ?? undefined } })
    } catch { drawing = null }
  }
  const [cover, avatar] = await Promise.all([S.d.cover ? blobImg(S.d.cover).catch(() => null) : null, S.d.avatar ? blobImg(S.d.avatar, true).catch(() => null) : null])
  await loadFaces()
  const c = document.createElement('canvas')
  c.width = CARD.W; c.height = CARD.H
  drawCard(c.getContext('2d'), { look: S.look, accent: S.d.accent, name: S.d.name || S.name, tagline: S.d.tagline, url: `${location.host}/${S.name}`, gold: isGold(),
    cover, drawing, avatar, round: S.d.avround, dings: S.d.dings, D: window.Dingbats || null })
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.88))
  if (S.cardUrl) URL.revokeObjectURL(S.cardUrl)
  S.cardUrl = URL.createObjectURL(blob)
  const r = await upload(blob, null, 'card')
  S.d.card = r.id
  S.cardKey = cardKey({ look: S.look, name: S.name, kind: S.kind, tier: S.tier }, S.d)
}

async function publish() {
  const pub = $('#pub')
  pub.disabled = true
  try {
    await makeCard().catch(() => {})
    await save({ publish: true })
    done()
  } finally { pub.disabled = false }
}

// "Put it online": the page's card as people will see it in LINE, the ways to send it, and the key
function done() {
  const live = S.status === 'live'
  const url = `${location.origin}/${S.name}`
  const edit = `${location.origin}/make#t=${S.token}`
  const card = S.cardUrl || (S.d.card ? `/img/${S.d.card}.jpg` : '')
  const box = document.createElement('div')
  box.className = 'sheet'
  box.innerHTML = `<div class="box donebox">${live ? `<div class="confetti">${['party', 'sparkle', 'heart', 'star', 'lantern'].map((n) => ding(n, 'riso', 'loop')).join('')}</div>` : ''}
    <h2>${live ? T('live') : S.status === 'held' ? T('held') : T('draft')}</h2>
    ${card ? `<figure class="dcard"><img src="${esc(card)}" alt=""><figcaption>${T('d_card')}</figcaption></figure>` : ''}
    <div class="durl"><a href="${esc(url)}" target="_blank">${esc(url.replace(/^https?:\/\//, ''))}</a><button class="go ghost small" id="cpurl">${T('copy')}</button></div>
    <div class="grid2"><a class="go line" href="${esc(lineShare((S.d.name || S.name) + ' ' + url))}" target="_blank" rel="noopener">${icon('chat')}LINE</a>
      <button class="go" id="sh">${icon('share')}${T('share')}</button>
      <a class="go ink" href="${esc(url)}" target="_blank">${icon('globe')}${T('open')}</a>
      <a class="go ghost" href="${esc(url)}/sign" target="_blank">${icon('print')}${T('sign')}</a></div>
    ${live ? `<details class="dqr"><summary>${T('d_qr')}</summary>${qrSvg(url, { dark: '#000', light: '#fff', label: url })}</details>` : ''}
    <div class="key"><span class="kd">${ding('key', 'paper')}</span><div><b>${T('d_key')}</b><p>${T('d_keyHint')}</p>
      <div class="grid2"><a class="go line" href="${esc(lineShare(edit))}" target="_blank" rel="noopener">${icon('chat')}${T('sendSelf')}</a><button class="go ghost" id="cpedit">${T('copy')}</button></div>
      <details><summary>${T('d_show')}</summary><code>${esc(edit)}</code></details></div></div>
    <p class="dkeep"><button class="go ghost" id="closesheet">${T('d_keep')}</button></p></div>`
  document.body.appendChild(box)
  dingbats(live ? ['faces', 'classic', 'lanna', 'signals', 'curious'] : ['signals', 'curious'])
  const im = box.querySelector('.dcard img'); if (im) im.onerror = () => im.closest('figure').remove()
  box.querySelector('#closesheet').onclick = () => box.remove()
  box.addEventListener('click', (e) => { if (e.target === box) box.remove() })
  box.querySelector('#sh').onclick = () => (navigator.share ? navigator.share({ title: S.d.name, url }).catch(() => {}) : copy(url))
  box.querySelector('#cpurl').onclick = () => copy(url)
  box.querySelector('#cpedit').onclick = () => copy(edit)
}

function copy(t) {
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(ui(S.lang, 'copied')), () => prompt('', t))
}

async function del() {
  if (!confirm(ui(S.lang, 'delAsk'))) return
  try {
    await call('DELETE', 'site')
    store.set('pages', store.get('pages', []).filter((p) => p.token !== S.token))
    location.href = '/make'
  } catch { toast(ui(S.lang, 'e_net')) }
}

let toastTimer = 0
function toast(msg) {
  let t = $('.toast')
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t) }
  t.textContent = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.remove(), 2600)
}

// ---- start -------------------------------------------------------------------------------

async function boot() {
  const h = new URLSearchParams(location.hash.slice(1))
  const t = h.get('t')
  if (t) {
    S.token = t
    try {
      const r = await call('GET', 'site')
      Object.assign(S, { name: r.name, kind: r.kind, look: lookOf(r.look), pageLang: r.lang, status: r.status, views: r.views, d: normalize(r.d), step: 'edit',
        tier: r.tier, goldUntil: r.gold_until || '', notifyEmail: r.notify_email, notifyOk: r.notify_ok, unread: r.unread,
        trial: !!r.trial, asks: r.asks || 0, domain: r.domain || '', domainState: r.domain_state || '', domains: !!r.domains, price: r.price || 3000,
        plan: r.plan || 'gold', hotel: !!r.hotel, plans: r.plans || null, cardUrl: '' })
      S.d.event = S.d.event || undefined
      S.open = new Set(DEFAULT_OPEN[S.kind]); S.part = ''
      if (h.get('tab')) S.tab = h.get('tab')
      remember()
    } catch (e) {
      S.token = ''
      history.replaceState(null, '', '/make')
      if (e.status === 403) store.set('pages', store.get('pages', []).filter((p) => p.token !== t))
      S.step = 'kind'
      draw()
      toast(ui(S.lang, e.status === 403 ? 'e_link' : 'e_net'))
      return
    }
  } else if (h.get('pin') || h.get('tel') || h.get('hrs')) {
    S.pre = prefill(h)
    if (h.get('title')) { S.name = h.get('title').slice(0, 60); S.addr = slugify(S.name, h.get('kind') || 'shop') }
    if (KINDS.includes(h.get('kind'))) { S.kind = h.get('kind'); S.look = LOOK_FOR[S.kind]; S.step = 'name' }
  } else if (h.get('name')) {
    S.addr = h.get('name').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30)
    S.addrTouched = true
    if (h.get('title')) S.name = h.get('title').slice(0, 60)
    if (KINDS.includes(h.get('kind'))) { S.kind = h.get('kind'); S.look = LOOK_FOR[S.kind]; S.step = 'name' }
  } else if (h.get('title') || KINDS.includes(h.get('kind'))) {
    if (h.get('title')) { S.name = h.get('title').slice(0, 60); S.addr = slugify(S.name, h.get('kind') || 'shop') }
    if (KINDS.includes(h.get('kind'))) { S.kind = h.get('kind'); S.look = LOOK_FOR[S.kind]; S.step = 'name' }
    if (LOOK_IDS.includes(h.get('look'))) S.look = h.get('look')
  }
  if (LOOK_IDS.includes(h.get('look'))) S.lookWanted = S.look = h.get('look')
  draw()
  // from the front page's three steps: what for, a name, a look, and "Put it online"
  if (h.get('go') && S.step === 'name' && S.name.trim() && LOOK_IDS.includes(h.get('look'))) {
    history.replaceState(null, '', '/make')
    create(S.look, document.createElement('b')).then(() => { if (S.step === 'edit') publish() })
  }
}
window.addEventListener('hashchange', boot)
window.addEventListener('resize', () => { preview(); document.body.classList.toggle('sheeton', S.tab === 'edit' && !!S.part && narrow()) })
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.tab === 'edit' && S.part && !document.querySelector('.sheet')) closePart() })
boot()
