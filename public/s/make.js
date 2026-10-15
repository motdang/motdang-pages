// make.js — the builder. Three questions (what for, what name, which look),
// then one form with the page itself beside it. Every change saves on its
// own; "Put it online" is the only button that matters. Beside the page:
// its messages, its traffic, and Gold.

import { render, normalize, LOOKS, LOOK_IDS, GOLD_LOOKS, KINDS, ACCENTS, CURRENCY, SCENES, MAX_PHOTOS, osmHours, currencyFor, qrSvg, lineShare, esc } from './render.mjs'
import { MAX, UNIT_LABEL } from './extras.mjs'
import { DINGBATS } from './db/names.mjs'
import { PAGE_LANGS } from './words.mjs'
import { ui, UI_LANGS } from './make-words.mjs'
import { exifBlock, readExif } from './exif.mjs'
import { openStudio, openMark } from './studio-ui.mjs'
import { amuletsSec, amToggle, amUi, newAmulet } from './make-amulet.mjs'
import { AM_MAX } from './amulet.mjs'
import { drawCard, cardKey, CARD } from './card.mjs'
import { loadFaces } from './mark.mjs'

const $ = (s, el = document) => el.querySelector(s)
const app = $('#app')
const store = {
  get(k, d) { try { const v = localStorage.getItem('mdp:' + k); return v === null ? d : JSON.parse(v) } catch { return d } },
  set(k, v) { try { localStorage.setItem('mdp:' + k, JSON.stringify(v)) } catch {} },
}
const icon = (id) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="/s/icons.svg#i-${id}"/></svg>`
const KIND_ICON = { shop: 'shop', food: 'food', service: 'gear', work: 'star', amulet: 'flower', stay: 'moon', homes: 'tag', me: 'me', event: 'party', group: 'people' }
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'Asia/Bangkok' } })()

const S = {
  lang: store.get('lang', (() => { const l = (navigator.language || 'th').slice(0, 2); return UI_LANGS[l] ? l : 'th' })()),
  step: 'kind', kind: 'shop', name: '', addr: '', addrTouched: false, look: 'poster', token: '', status: 'draft', views: 0,
  pageLang: '', d: null, open: new Set(), local: new Map(), big: new Map(), photoGps: null, picker: null, busy: 0,
  tab: 'edit', tier: 'gold', goldUntil: '', notifyEmail: '', notifyOk: false, unread: 0, // a page starts with 30 days of Gold
  trial: false, asks: 0, domain: '', domainState: '', domains: false, price: 3000, dbFam: '', dbQ: '',
  plan: 'gold', hotel: true, plans: null, payPlan: '',
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
const KIND_DING = { shop: 'cart', food: 'noodles', service: 'gear', work: 'nib', amulet: 'lotus', stay: 'key', homes: 'home', me: 'wave', event: 'party', group: 'crown' }
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
  amulet: ['words', 'face', 'amulets', 'contact', 'photos', 'map', 'hours'],
  me: ['words', 'face', 'photos', 'links', 'contact'],
  stay: ['words', 'photos', 'rooms', 'ota', 'map', 'contact'],
  homes: ['words', 'lists', 'photos', 'contact', 'map'],
  event: ['event', 'words', 'cal', 'photos', 'map', 'contact'],
  group: ['words', 'cal', 'photos', 'links', 'contact'],
}
const LOOK_FOR = { shop: 'poster', food: 'night', service: 'clean', work: 'clean', amulet: 'lanna', stay: 'loom', homes: 'clean', me: 'y1997', event: 'stitch', group: 'loom' }

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
  if (S.step === 'kind') return drawKind()
  if (S.step === 'name') return drawName()
  if (S.step === 'look') return drawLook()
  return drawEdit()
}

function drawKind() {
  const mine = store.get('pages', [])
  app.innerHTML = `<section class="hero"><h1 class="q">${T('q1')}</h1><p class="sub">${T('heroMake')}</p></section>` +
    `<div class="kinds">${KINDS.map((k) => `<button class="kind" data-kind="${k}"><span class="kd">${ding(KIND_DING[k], 'paper', 'hover')}</span><b>${T('k_' + k)}</b><small>${T('h_' + k)}</small></button>`).join('')}</div>` +
    (mine.length ? `<section class="mine"><h2>${T('mine')}</h2>${mine.map((p) => `<a href="/make#t=${esc(p.token)}">${esc(p.title)}<span>sites.motdang.net/${esc(p.name)}</span></a>`).join('')}</section>` : '')
  app.querySelectorAll('.kind').forEach((b) => (b.onclick = () => { S.kind = b.dataset.kind; S.look = S.lookWanted || LOOK_FOR[S.kind]; S.step = 'name'; draw() }))
  app.querySelectorAll('.mine a').forEach((a) => (a.onclick = (e) => { e.preventDefault(); history.replaceState(null, '', a.getAttribute('href')); boot() }))
}

let availTimer = 0, availOk = false
function drawName() {
  app.innerHTML = `<button class="back" id="back">← ${T('back')}</button><h1 class="q">${T('q2')}</h1>
  <label class="field big"><span>${T('name')}</span><input id="nm" maxlength="60" autocomplete="off" value="${esc(S.name)}"></label>
  <label class="field"><span>${T('addr')}</span><div class="addr"><span>sites.motdang.net/</span><input id="ad" maxlength="30" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="url" value="${esc(S.addr)}"></div>
  <small>${T('addrHint')}</small><span class="avail" id="av"></span></label>
  <div class="row"><button class="go" id="next" disabled>${T('next')} →</button></div>`
  const nm = $('#nm'), ad = $('#ad')
  nm.focus()
  nm.oninput = () => { S.name = nm.value; if (!S.addrTouched) { ad.value = S.addr = slugify(nm.value, S.kind) }; check() }
  ad.oninput = () => { S.addrTouched = true; ad.value = ad.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); S.addr = ad.value; check() }
  $('#back').onclick = () => { S.step = 'kind'; draw() }
  $('#next').onclick = () => { if (availOk && S.name.trim()) { S.step = 'look'; draw() } }
  nm.onkeydown = ad.onkeydown = (e) => { if (e.key === 'Enter') $('#next').click() }
  if (S.addr) check()
}
function check() {
  const av = $('#av'), next = $('#next')
  availOk = false
  next.disabled = true
  clearTimeout(availTimer)
  if (!S.addr) { av.textContent = ''; return }
  av.className = 'avail'; av.textContent = ui(S.lang, 'a_wait')
  availTimer = setTimeout(async () => {
    try {
      const r = await call('GET', 'name?n=' + encodeURIComponent(S.addr))
      availOk = r.ok
      av.className = 'avail ' + (r.ok ? 'ok' : 'no')
      av.innerHTML = r.ok ? `${icon('check')}${T('a_ok')}` : esc(ui(S.lang, 'a_' + (r.why || 'taken')))
      next.disabled = !(r.ok && S.name.trim())
    } catch { av.textContent = ui(S.lang, 'e_net') }
  }, 350)
}

function lookCard(id, on) {
  const L = LOOKS[id]
  const vars = L.vars.replace(/\s+/g, ' ') + `;--accent:${L.accent}`
  const locked = L.gold && !isGold()
  return `<button class="look${on ? ' on' : ''}${L.gold ? ' goldlook' : ''}" data-look="${id}" style="${esc(vars)}">${L.art}<b>${esc(S.d?.name || S.name || L.label)}</b><small>${esc(L.label)}</small><span class="acc"></span>${L.gold ? `<span class="glock">${locked ? T('goldLock') : '★'}</span>` : ''}</button>`
}

function drawLook() {
  app.innerHTML = `<button class="back" id="back">← ${T('back')}</button><h1 class="q">${T('q3')}</h1>
  <div class="looks">${LOOK_IDS.map((id) => lookCard(id, id === S.look)).join('')}</div>`
  $('#back').onclick = () => { S.step = 'name'; draw() }
  app.querySelectorAll('.look').forEach((b) => (b.onclick = () => create(b.dataset.look, b)))
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

async function create(look, btn) {
  S.look = look
  btn.classList.add('on')
  S.d = normalize(applyPrefill({ ...starter(S.kind), name: S.name.trim() }))
  if (S.kind === 'event') S.d.event = starter('event').event
  if (S.kind === 'stay') S.d.rooms = [NEW_ROW.rooms()]
  if (S.kind === 'homes') S.d.lists = [NEW_ROW.lists()]
  if (S.kind === 'work') S.d.works = [NEW_ROW.works()]
  if (S.kind === 'amulet') S.d.amulets = [NEW_ROW.amulets()]
  S.pageLang = PAGE_LANGS[S.lang] ? S.lang : 'en'
  try {
    const r = await call('POST', 'sites', { name: S.addr, kind: S.kind, look, lang: S.pageLang, d: S.d, by: new URLSearchParams(location.search).get('by') || '' })
    S.token = r.token; S.name = r.name; S.status = r.status; S.tier = r.tier || 'gold'; S.goldUntil = r.gold_until || ''; S.trial = !!r.trial; S.hotel = !!r.trial
    history.replaceState(null, '', '/make#t=' + S.token)
    remember()
    S.open = new Set(DEFAULT_OPEN[S.kind])
    S.step = 'edit'
    draw()
  } catch (e) {
    toast(ui(S.lang, e.message === 'quota' ? 'e_quota' : e.message === 'name' ? 'e_name' : 'e_net'))
    if (e.message === 'name') { S.step = 'name'; draw() }
  }
}

// ---- the editor ------------------------------------------------------------------------

const SECTIONS = [
  ['event', 'cal', 's_event'], ['words', 'note', 's_words'], ['face', 'me', 's_face'], ['works', 'star', 's_works'], ['amulets', 'flower', 's_amulets'], ['drawing', 'sparkle', 's_drawing'], ['photos', 'camera', 's_photos'], ['quotes', 'chat', 's_quotes'],
  ['rooms', 'moon', 's_rooms', 'gold'], ['ota', 'globe', 's_ota', 'gold'], ['lists', 'tag', 's_lists', 'gold'], ['svc', 'clock', 's_svc', 'gold'], ['items', 'tag', 's_items'],
  ['cal', 'cal', 's_cal'], ['camps', 'party', 's_camps', 'gold'],
  ['order', 'basket', 's_order'], ['contact', 'phone', 's_contact'], ['map', 'pin', 's_map'], ['spots', 'compass', 's_spots'], ['hours', 'clock', 's_hours'],
  ['links', 'link', 's_links'], ['msg', 'mail', 's_msg'], ['look', 'star', 's_look'], ['video', 'camera', 's_video', 'gold'],
]

function hasData(id) {
  const d = S.d
  return { event: !!d.event, words: true, drawing: true, photos: d.photos.length > 0, items: d.items.length > 0, order: !!(d.order.grabfood || d.order.lineman),
    contact: Object.values(d.contact).some(Boolean), map: d.place.lat !== null || !!d.place.addr, hours: d.hours.on, links: d.links.length > 0, msg: true, look: true,
    video: !!d.video, spots: d.spots.length > 0, cal: d.cal.length > 0, ota: !!(d.ota.agoda || d.ota.booking), camps: d.camps.length > 0, svc: d.svc.length > 0, rooms: d.rooms.length > 0, lists: d.lists.length > 0, face: !!d.avatar, works: d.works.length > 0, amulets: d.amulets.length > 0, quotes: d.quotes.length > 0 }[id]
}

function tabs() {
  const t = (id, label, extra = '') => `<button data-tab="${id}"${S.tab === id ? ' class="on"' : ''}>${label}${extra}</button>`
  const bk = S.d && (S.d.svc.length || S.d.rooms.length) ? t('book', T('t_book'), S.asks ? `<span class="dot">${S.asks}</span>` : '') : ''
  return `<nav class="tabs">${t('edit', T('t_edit'))}${t('msgs', T('t_msgs'), S.unread ? `<span class="dot">${S.unread}</span>` : '')}${bk}${t('stats', T('t_stats'))}${t('gold', (isGold() ? '★ ' : '') + T('t_gold'))}</nav>`
}

function drawEdit() {
  if (S.tab !== 'edit') return drawTab()
  for (const [id] of SECTIONS) if (hasData(id)) S.open.add(id)
  S.open.add('look'); S.open.add('drawing'); S.open.add('msg')
  const shown = SECTIONS.filter(([id]) => S.open.has(id))
  const more = SECTIONS.filter(([id]) => !S.open.has(id))
  app.innerHTML = tabs() + `<div class="ed"><div class="form" id="form">
    ${shown.map(([id, ic, t, g], n) => `<details class="sec${g ? ' gsec' : ''}" data-sec="${id}"${n < 3 || id === 'map' ? ' open' : ''}><summary>${icon(ic)}${T(t)}${g ? `<span class="gpill">★ ${T('t_gold')}</span>` : ''}</summary><div class="in">${g && !isGold() ? goldLocked() : SEC[id]()}</div></details>`).join('')}
    ${more.length ? `<div class="adds">${more.map(([id, ic, t, g]) => `<button data-add="${id}"${g ? ' class="g"' : ''}>${icon('plus')}${T(t)}${g ? ' ★' : ''}</button>`).join('')}</div>` : ''}
    <div class="danger"><button id="del">${T('del')}</button></div></div>
    <div class="pv" id="pv"><div class="url">${icon('globe')}sites.motdang.net/${esc(S.name)}</div><iframe id="frame" title="${T('preview')}"></iframe></div></div>
    <div class="dock"><span class="state" id="state">${stateText()}</span>
      <button class="go ghost pvbtn" id="pvbtn">${icon('globe')}${T('preview')}</button>
      <button class="go red" id="pub">${S.status === 'live' ? T('share') : T('publish')}</button></div>`
  bindTabs()
  bindEdit()
  preview()
  if (S.open.has('map') && $('[data-sec=map]')?.open) mountMap()
  if ($('[data-sec=drawing]')?.open) mountDrawing()
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
    return `<div class="lookrow">${LOOK_IDS.map((id) => lookCard(id, id === S.look)).join('')}</div>
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
  amulets: () => newAmulet(rid),
}

// ---- the parts added 2026-10-15: an avatar, a portfolio, the picture studio ---------------

Object.assign(SEC, {
  amulets() { return amuletsSec({ S, val, esc, icon, imgUrl, photoPick, rowX, seg, isGold, lang: S.lang }) },
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
    for (const k of ['rooms', 'lists', 'works', 'amulets']) for (const x of S.d[k] || []) x.photos = x.photos.map(swap)
    redrawSec('photos'); if (S.open.has('works')) redrawSec('works'); if (S.open.has('amulets')) redrawSec('amulets')
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
  form.addEventListener('toggle', amToggle, true)
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
    if (t.dataset.amfile !== undefined) amFiles(+t.dataset.amfile, [...t.files])
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
    if (b.dataset.add) {
      e.preventDefault(); S.open.add(b.dataset.add)
      if (b.dataset.add === 'event' && !S.d.event) S.d.event = starter('event').event
      if (b.dataset.add === 'hours') S.d.hours.on = true
      drawEdit(); const sec = $(`[data-sec="${b.dataset.add}"]`); sec.open = true; sec.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (b.dataset.add === 'map') mountMap()
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
    if (b.dataset.seg?.startsWith('amulets.')) redrawSec('amulets')
    if (b.dataset.amrm) { const [i, k] = b.dataset.amrm.split('.').map(Number); S.d.amulets[i]?.photos.splice(k, 1); redrawSec('amulets'); changed() }
    if (b.dataset.pp) {
      const path = b.closest('.pickph').dataset.path, [k, i] = path.split('.'), item = S.d[k][+i]
      if (item) { item.photos = item.photos.includes(b.dataset.pp) ? item.photos.filter((x) => x !== b.dataset.pp) : [...item.photos, b.dataset.pp].slice(0, k === 'works' ? 24 : k === 'amulets' ? AM_MAX.photos : MAX.itemPhotos); b.classList.toggle('on', item.photos.includes(b.dataset.pp)); changed() }
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
  $('#del').onclick = del
  $('#pub').onclick = publish
  $('#pvbtn').onclick = () => { $('#pv').classList.add('show'); document.body.classList.add('pvopen'); preview(true) }
  $('#pv').addEventListener('click', (e) => { if (e.target.id === 'pv' || e.target.closest('.url')) { $('#pv').classList.remove('show'); document.body.classList.remove('pvopen') } })
}

function redrawSec(id) {
  const sec = $(`[data-sec="${id}"] .in`)
  if (!sec) return
  const g = SECTIONS.find((x) => x[0] === id)?.[3]
  sec.innerHTML = g && !isGold() ? goldLocked() : SEC[id]()
  if (id === 'map') { S.picker = null; mountMap() }
  if (id === 'drawing') { drawCv = null; mountDrawing() }
  // the amulets pick from the page's photos: show new ones there too, unless the maker is typing in it
  if (id === 'photos' && S.d.amulets?.length && !$('[data-sec="amulets"]')?.contains(document.activeElement)) redrawSec('amulets')
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

// ---- preview + saving ----------------------------------------------------------------------

function imgUrl(id, small) { return S.local.get(id) || `/img/${id}${small ? '-s' : ''}.webp` }

let pvTimer = 0
function preview(now) {
  clearTimeout(pvTimer)
  pvTimer = setTimeout(() => {
    const f = $('#frame')
    if (!f) return
    if (window.innerWidth < 980 && !$('#pv').classList.contains('show') && !now) return
    const html = render({ name: S.name, look: S.look, lang: S.pageLang, kind: S.kind, d: S.d, views: S.views || 1234, status: 'live', tier: S.tier }, { preview: true, img: imgUrl, origin: location.origin, hotel: S.hotel })
    const y = f.contentWindow?.scrollY || 0
    f.srcdoc = html
    f.onload = () => { try { f.contentWindow.scrollTo(0, y) } catch {} ; f.contentDocument?.querySelectorAll('a[href]').forEach((a) => a.setAttribute('target', '_blank')) }
  }, now ? 0 : 260)
}

let saveTimer = 0
function changed() {
  preview()
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
    const r = await call('PUT', 'site', { d: S.d, look: S.look, lang: S.pageLang, kind: S.kind, ...extra })
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
  if (S.photoGps && S.d.place.lat === null) { S.open.add('map'); drawEdit() }
  changed()
}

/** Photos taken for one amulet: they join the page's photos and that amulet's, in the order taken. */
async function amFiles(i, files) {
  const before = new Set(S.d.photos)
  await addFiles(files)
  const x = S.d.amulets[i]
  if (!x) return
  x.photos = [...x.photos, ...S.d.photos.filter((id) => !before.has(id))].slice(0, AM_MAX.photos)
  redrawSec('amulets'); changed()
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
  amulet: ['Buddha', 'lotus', 'temple', 'gold leaf', 'Thai manuscript', 'woodblock print'],
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

async function drawMsgs() {
  const tb = $('#tb')
  try {
    const r = await call('GET', 'msgs')
    const list = r.msgs
    S.unread = list.filter((m) => m.status === 'new').length
    const nav = app.querySelector('.tabs'); if (nav) { nav.outerHTML = tabs(); bindTabs() }
    if (!list.length) { tb.innerHTML = `<div class="empty">${ding('mailbox', 'paper')}<p>${T('m_none')}</p></div>`; return }
    tb.innerHTML = `${S.unread ? `<p style="text-align:right"><button class="go ghost" id="mall">${icon('check')}${T('m_all')}</button></p>` : ''}<div class="msgs">${list.map((m) => {
      const rp = replyHref(m.reach)
      return `<article class="msg ${m.status}" data-id="${esc(m.id)}"><header><b>${esc(m.name || '—')}</b><span>${esc(when(m.at))}</span></header>
        ${m.status === 'held' ? `<p class="heldtag">${T('m_held')}</p>` : ''}<p class="body">${esc(m.body)}</p>${m.reach ? `<p class="reach">${esc(m.reach)}</p>` : ''}
        <footer>${rp ? `<a class="go line small" href="${esc(rp.href)}" target="_blank" rel="noopener">${icon('chat')}${T('m_reply')} · ${esc(rp.label)}</a>` : ''}
        <button class="go ghost small" data-act="${m.status === 'new' || m.status === 'held' ? 'read' : 'unread'}">${T(m.status === 'new' || m.status === 'held' ? 'm_read' : 'm_unread')}</button>
        <button class="go ghost small" data-act="gone">${T('m_del')}</button></footer></article>`
    }).join('')}</div>`
    tb.onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return
      if (b.id === 'mall') { await call('POST', 'msgs', { act: 'read', all: true }); return drawMsgs() }
      const id = b.closest('[data-id]')?.dataset.id
      if (b.dataset.act && id) { await call('POST', 'msgs', { act: b.dataset.act, id }); drawMsgs() }
    }
  } catch { tb.innerHTML = `<p class="hint">${T('e_net')}</p>` }
}

const TAP_WORD = { call: 'call', line: 'line', dir: 'dir', ride: 'ride', food: 'food', lineman: 'lineman', share: 'share', copy: 'copy', map: 'map', far: 'far', vcf: 'saveContact',
  ics: 'addCal', sign: 'sign', order: 'lineOrder', msg: 'msg', link: 'links', photo: 'photos', video: 'video', email: 'email', web: 'web', qr: 'qr', story: 'story' }
const TAP_EXTRA = { get amulet() { return amUi(S.lang, 'tap_amulet') }, get reserve() { return amUi(S.lang, 'tap_reserve') }, shareline: 'LINE', sharefb: 'Facebook', sharex: 'X', sharewa: 'WhatsApp', sharetg: 'Telegram', social: 'Facebook · Instagram · TikTok', whatsapp: 'WhatsApp' }

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
  const empty = !r.total.views && !r.total.machines
  const step = Math.max(1, Math.ceil(r.days.length / 8))
  tb.innerHTML = `${empty ? `<div class="empty">${ding('megaphone', 'paper')}<p>${T('st_empty')}</p></div>` : ''}
    <div class="tiles">${tile(r.today.people, T('st_people'), T('st_today'))}${tile(r.week.people, T('st_people'), T('st_week'))}${tile(r.total.people, T('st_people'), r.days.length > 31 ? T('st_year') : T('st_month'))}
      ${tile(r.total.views, T('st_views'), r.days.length > 31 ? T('st_year') : T('st_month'))}${tile(r.total.taps, T('st_taps'), r.days.length > 31 ? T('st_year') : T('st_month'))}</div>
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
  const head = `<section class="goldhero">${LOOKS.gold.art}<h2>${T('g_lead')}</h2><ul>${feats.map((k, i) => `<li>${ding(fdings[i], 'paper')}<span>${T(k)}</span></li>`).join('')}</ul></section>`
  const rooms = S.d.rooms.length > 0
  const want = S.payPlan || (rooms && (S.trial || S.plan === 'hotel') ? 'hotel' : 'gold')
  const needHotel = rooms && S.plan !== 'hotel'
  if (isGold() && !S.trial && !(needHotel && /^hotel/.test(S.payPlan || ''))) {
    tb.innerHTML = head + `<p class="goldon">★ ${esc(ui(S.lang, 'g_on').replace('{d}', S.goldUntil || ''))}</p>` +
      (needHotel ? `<p style="text-align:center"><button class="go" id="tohotel">${esc(ui(S.lang, 'g_hotelGo').replace('{p}', new Intl.NumberFormat(S.lang).format(S.plans?.hotel?.baht || 555)))}</button></p>` : '') + domainBox()
    dingbats(['signals', 'classic', 'curious'])
    bindDomain()
    const th = $('#tohotel'); if (th) th.onclick = () => { S.payPlan = 'hotel'; drawGold() }
    return
  }
  const pick = rooms && S.plans ? `<div class="field" style="text-align:center">${seg('payplan', want, [['gold', esc(ui(S.lang, 'g_planGold').replace('{p}', new Intl.NumberFormat(S.lang).format(S.plans.gold.baht)))], ['hotel', esc(ui(S.lang, 'g_planHotel').replace('{p}', new Intl.NumberFormat(S.lang).format(S.plans.hotel.baht)))], ...(S.plans.hotelyear ? [['hotelyear', esc(ui(S.lang, 'g_planHotelYear').replace('{p}', new Intl.NumberFormat(S.lang).format(S.plans.hotelyear.baht)))]] : [])])}</div>` : ''
  try { r = await call('POST', 'gold', { plan: want }) } catch { tb.innerHTML = head + `<p class="hint">${T('e_net')}</p>`; return }
  if (r.tier === 'gold' && !S.trial) { S.tier = 'gold'; S.goldUntil = r.gold_until; return drawGold() }
  const tail = String(r.amount).split('.')[1] || '00'
  const nf = new Intl.NumberFormat(S.lang)
  tb.innerHTML = head + (S.trial ? `<p class="goldon">★ ${esc(ui(S.lang, 'g_trial').replace('{d}', S.goldUntil || ''))}</p>` : '') + pick + `<section class="goldpay"><p class="price">${esc(ui(S.lang, r.months === 1 ? 'g_priceMonth' : 'g_price').replace('{p}', nf.format(r.baht)))}</p>${r.hotel ? `<p class="hint">${T(r.months === 1 ? 'g_hotelWhy' : 'g_hotelYearWhy')}</p>` : ''}
    ${r.payload ? `<div class="ppqr">${qrSvg(r.payload, { dark: '#0e3d78', light: '#ffffff', label: 'PromptPay' })}<b>฿${esc(nf.format(Number(r.amount)))}</b><span>PromptPay</span></div>
      <p class="hint">${esc(ui(S.lang, 'g_scan').replace('{s}', tail))}</p>
      <label class="pick goldslip">${icon('download')}${T('g_slip')}<input type="file" accept="image/*" id="slip"></label><p id="slipstate" class="pinstate"></p>` : `<p class="hint">${T('g_nopp')}</p>`}</section>` + (isGold() ? domainBox() : '')
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

function done() {
  const url = `${location.origin}/${S.name}`
  const edit = `${location.origin}/make#t=${S.token}`
  const box = document.createElement('div')
  box.className = 'sheet'
  box.innerHTML = `<div class="box">${S.status === 'live' ? `<div class="confetti">${['party', 'sparkle', 'heart', 'star', 'lantern'].map((n) => ding(n, 'riso', 'loop')).join('')}</div>` : ''}<h2>${S.status === 'live' ? T('live') : S.status === 'held' ? T('held') : T('draft')}</h2>
    <a class="link" href="${esc(url)}" target="_blank">${esc(url.replace(/^https?:\/\//, ''))}</a>
    ${S.status === 'live' ? qrSvg(url, { dark: '#000', light: '#fff', label: url }) : ''}
    <div class="grid2"><a class="go ink" href="${esc(url)}" target="_blank">${icon('globe')}${T('open')}</a>
      <button class="go" id="sh">${icon('share')}${T('share')}</button>
      <a class="go line" href="${esc(lineShare((S.d.name || S.name) + ' ' + url))}" target="_blank">${icon('chat')}LINE</a>
      <a class="go ghost" href="${esc(url)}/sign" target="_blank">${icon('print')}${T('sign')}</a></div>
    <div class="key"><b>${T('editLink')}</b><br>${T('editHint')}<code>${esc(edit)}</code>
      <div class="grid2"><a class="go line" href="${esc(lineShare(edit))}" target="_blank">${icon('chat')}${T('sendSelf')}</a><button class="go ghost" id="cpedit">${T('copy')}</button></div></div>
    <p style="text-align:center"><button class="back" id="closesheet">${T('edit')}</button></p></div>`
  document.body.appendChild(box)
  if (S.status === 'live') dingbats(['faces', 'classic', 'lanna'])
  box.querySelector('#closesheet').onclick = () => box.remove()
  box.addEventListener('click', (e) => { if (e.target === box) box.remove() })
  box.querySelector('#sh').onclick = () => (navigator.share ? navigator.share({ title: S.d.name, url }).catch(() => {}) : copy(url))
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
      Object.assign(S, { name: r.name, kind: r.kind, look: r.look, pageLang: r.lang, status: r.status, views: r.views, d: normalize(r.d), step: 'edit',
        tier: r.tier, goldUntil: r.gold_until || '', notifyEmail: r.notify_email, notifyOk: r.notify_ok, unread: r.unread,
        trial: !!r.trial, asks: r.asks || 0, domain: r.domain || '', domainState: r.domain_state || '', domains: !!r.domains, price: r.price || 3000,
        plan: r.plan || 'gold', hotel: !!r.hotel, plans: r.plans || null })
      S.d.event = S.d.event || undefined
      S.open = new Set(DEFAULT_OPEN[S.kind])
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
window.addEventListener('resize', () => preview())
boot()
