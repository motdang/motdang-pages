// home.js — sites.motdang.net/ (Nan 2026-10-26: "Too much repetition." "Styles should be FUNCTIONAL, design should have
// PURPOSE, one style per kind." "decorations should DO THINGS."). Four parts, one job each:
//   1. choose a kind and type a name: the phone shows the real page, in that kind's own design, with the name in it
//   2. the four kinds, one example page each
//   3. Free or Gold: the lists, the chart, the hotel sum
//   4. go
// The pages are drawn by the real page renderer. Thai, English, Burmese and Chinese; the words are in home-words.mjs.

import { render, LOOKS, designOf, longestWord } from './render.mjs'
import { W, CMP_SRC } from './home-words.mjs'

const $ = (s, el = document) => el.querySelector(s)
const store = { get(k, d) { try { const v = localStorage.getItem('mdh:' + k); return v === null ? d : v } catch { return d } }, set(k, v) { try { localStorage.setItem('mdh:' + k, v) } catch {} } }
const LANGS = { th: 'ไทย', en: 'EN', my: 'မြန်မာ', zh: '中文' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

let L = store.get('lang', (navigator.language || 'th').slice(0, 2))
if (!W[L]) L = 'th'
const w = (k) => (W[L] && W[L][k]) ?? W.en[k] ?? ''
const num = (n) => new Intl.NumberFormat(L === 'my' ? 'en' : L).format(n)

// the drawn icons beside the kinds (the dingbat library, packs for the four icons used here)
function load(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s) }) }
load('/s/db/core.js').then(() => Promise.all(['signals', 'classic', 'kitchen', 'curious'].map((f) => load('/s/db/' + f + '.js')))).catch(() => {})

// ---- the four kinds ------------------------------------------------------------------------
// [word, the page maker's kind, icon]. A kind's colour is its design's colour (looks.mjs), so the colour on this page
// is the colour of the page you get.
const KINDS = [['local', 'stay', 'noodles'], ['store', 'store', 'gift'], ['online', 'online', 'rocket'], ['portfolio', 'work', 'nib']]
const accent = (i) => LOOKS[designOf(KINDS[i][1])].accent
let kind = 0, typed = ''

const slug = (n) => n.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)
const shownSlug = () => { const s = slug(typed); return s.length >= 3 ? s : w('yourAddr') }

// where "Make it" goes. The page maker takes the kind, the name and the design; with all three it makes the page
// at once. "Sell something local" is eight kinds of page (a room, a meal, a massage…), so it opens on the name
// step, where the maker asks which.
function makeHref(i) {
  const mk = KINDS[i][1], q = new URLSearchParams({ kind: mk })
  if (typed) q.set('title', typed)
  if (typed && i > 0) { q.set('look', designOf(mk)); q.set('go', '1') }
  return '/make#' + q
}

// ---- example pages, drawn by the real renderer ---------------------------------------------
// photos as taken (tools/photos.py), each with its credit in /s/home/photos.json
const EXP = { exroom1000000: 'ex-room1', exroom2000000: 'ex-room2', exroom3000000: 'ex-room3', exhouse0000000: 'ex-house',
  extextile0000: 'ex-textile', exumbrella000: 'ex-umbrella', excarve000000: 'ex-carve', exweaver00000: 'ex-weaver', exumbrella200: 'ex-umbrella2', exlatte000000: 'ex-latte' }
let EXCR = {}
const exImg = (id, small) => (EXP[id] ? `/s/home/${EXP[id]}${small ? '-s' : ''}.webp` : '')
const exCredits = (ids) => Object.fromEntries(ids.filter((id) => EXCR[EXP[id]]).map((id) => [id, EXCR[EXP[id]]]))
const has = (id) => !!EXCR[EXP[id]]
const pics = (...ids) => ids.filter(has)
const th = () => L === 'th'
let EX = null
const examples = () => (EX ||= EXAMPLES())
const EXAMPLES = () => [
  { name: 'example-guesthouse', lang: L, kind: 'stay', tier: 'gold', d: {
    name: th() ? 'บ้านมด เกสต์เฮาส์' : 'Ant House Guesthouse', tagline: th() ? 'ห้องพักเงียบ ในเมืองเก่าเชียงใหม่ เดิน 5 นาทีถึงประตูท่าแพ' : 'Quiet rooms in Chiang Mai old city. 5 minutes on foot to Tha Phae Gate.',
    cover: 'exroom1000000', photos: pics('exroom1000000', 'exroom2000000', 'exroom3000000', 'exhouse0000000'), drawing: false,
    rooms: [
      { id: 'r1double', n: th() ? 'ห้องดับเบิล' : 'Double room', guests: 2, beds: th() ? 'เตียงคู่' : 'Double bed', p: '900', photos: pics('exroom1000000') },
      { id: 'r2thai', n: th() ? 'ห้องไทย' : 'Thai room', guests: 2, beds: th() ? 'เตียงคิงไซซ์' : 'King bed', p: '1200', photos: pics('exroom2000000') },
      { id: 'r3view', n: th() ? 'ห้องวิวเมือง' : 'City view room', guests: 3, beds: th() ? '2 เตียง' : '2 beds', p: '1500', photos: pics('exroom3000000') },
    ],
    ota: { agoda: 'https://www.agoda.com/', booking: 'https://www.booking.com/' }, contact: { line: '@example', phone: '053 000 000' }, place: { lat: 18.7877, lng: 98.9931, cc: 'TH', zoom: 16 }, msg: true } },
  { name: 'example-shop', lang: L, kind: 'store', tier: 'gold', d: {
    name: th() ? 'บ้านมด ของทำมือ' : 'Ant House Handmade', tagline: th() ? 'ผ้าทอ ร่ม และงานไม้จากเชียงใหม่ ส่งทั่วโลกโดยมดแดง' : 'Weaving, umbrellas and wood from Chiang Mai, shipped anywhere by Mot Dang',
    cover: 'extextile0000', photos: pics('extextile0000', 'exumbrella000', 'excarve000000'), drawing: false,
    products: [
      { id: 'p1cloth', t: th() ? 'ผ้าทอไทลื้อ' : 'Tai Lue woven cloth', p: '1200', old: '1500', opts: th() ? 'สี: แดง, น้ำเงิน' : 'Colour: red, blue', stock: 6, g: 300, photos: pics('extextile0000') },
      { id: 'p2umb', t: th() ? 'ร่มกระดาษสา' : 'Paper umbrella', p: '650', g: 700, photos: pics('exumbrella000') },
      { id: 'p3wood', t: th() ? 'ช้างไม้แกะสลัก' : 'Carved wooden elephant', p: '890', stock: 3, g: 900, photos: pics('excarve000000') },
    ],
    ship: { th: '60', world: '600', free: '2000', mot: true }, pay: { pp: '0812345678' },
    contact: { line: '@example' }, msg: true } },
  { name: 'example-online', lang: L, kind: 'online', tier: 'gold', d: {
    name: th() ? 'เรียนอังกฤษกับครูมด' : 'English with Teacher Mot', tagline: th() ? 'เรียนออนไลน์ตัวต่อตัว สำหรับงานและการเดินทาง' : 'One-to-one English lessons online, for work and travel',
    cover: 'exlatte000000', photos: pics('exlatte000000'), drawing: false,
    svc: [
      { id: 'p1trial', n: th() ? 'ลองเรียน 30 นาที' : 'Trial lesson, 30 minutes', mins: 30, p: '300', note: th() ? 'วัดระดับ\nแผนการเรียน' : 'Find your level\nA plan for you' },
      { id: 'p2ten', n: th() ? '10 ครั้ง' : '10 lessons', mins: 60, p: '4500', note: th() ? 'ครั้งละ 1 ชั่วโมง\nแบบฝึกหัดทุกครั้ง' : 'One hour each\nHomework every time' },
      { id: 'p3work', n: th() ? 'อังกฤษเพื่อการทำงาน' : 'English for work', mins: 60, p: '6000', note: th() ? 'อีเมล ประชุม สัมภาษณ์งาน' : 'Email, meetings, job interviews' },
    ],
    faq: [
      { q: th() ? 'เรียนผ่านอะไร' : 'How do we meet?', a: th() ? 'Zoom หรือ LINE วิดีโอคอล' : 'Zoom or a LINE video call.' },
      { q: th() ? 'ยกเลิกได้ไหม' : 'Can I cancel?', a: th() ? 'ได้ บอกล่วงหน้า 24 ชั่วโมง' : 'Yes, with 24 hours notice.' },
    ],
    quotes: [{ q: th() ? 'กล้าพูดมากขึ้นในที่ประชุม' : 'I speak up in meetings now.', who: 'Nok' }],
    signup: { on: true }, contact: { line: '@example', email: 'hello@example.com' }, msg: true } },
  { name: 'example-crafts', lang: L, kind: 'work', tier: 'free', d: {
    name: th() ? 'บ้านมด งานฝีมือ' : 'Ant House Crafts', tagline: th() ? 'ร่มบ่อสร้าง งานไม้ และผ้าทอ ทำมือที่เชียงใหม่' : 'Bo Sang umbrellas, wood and weaving, made by hand in Chiang Mai',
    cover: 'exumbrella000', photos: pics('exumbrella000', 'exumbrella200', 'excarve000000', 'exweaver00000'), drawing: false,
    works: [
      { id: 'w1umb', t: th() ? 'ร่มกระดาษสา' : 'Paper umbrellas', year: '2026', tags: th() ? 'ร่ม' : 'Umbrellas', photos: pics('exumbrella000', 'exumbrella200') },
      { id: 'w2carve', t: th() ? 'บานประตูแกะสลัก' : 'A carved door', year: '2025', tags: th() ? 'ไม้' : 'Wood', photos: pics('excarve000000') },
      { id: 'w3weave', t: th() ? 'ผ้าไหมทอมือ' : 'Handwoven silk', year: '2025', tags: th() ? 'ผ้า' : 'Cloth', photos: pics('exweaver00000') },
    ],
    quotes: [{ q: th() ? 'ร่มสวยมาก ส่งถึงเร็ว' : 'Beautiful umbrellas, and they came fast.', who: 'Ploy' }],
    contact: { line: '@example', email: 'hello@example.com' }, msg: true } },
]

/** The example page for a kind, with the visitor's name in it. */
function pageHtml(i) {
  const x = examples()[i]
  const d = { ...x.d, name: typed || x.d.name, credits: exCredits([...new Set([x.d.cover, ...(x.d.photos || [])].filter(Boolean))]) }
  const s = slug(typed)
  return render({ ...x, name: s.length >= 3 ? s : x.name, d, status: 'live', views: 1200 + 37 * i }, { preview: true, gold: x.tier === 'gold', hotel: x.kind === 'stay', origin: location.origin, img: exImg })
}

// a page shown here is a picture of it: its buttons call, chat and open nothing
function lock(f) {
  try {
    const doc = f.contentDocument
    doc.addEventListener('click', (ev) => { const a = ev.target.closest('a[href]'); if (a && !a.getAttribute('href').startsWith('#')) ev.preventDefault() }, true)
    doc.addEventListener('submit', (ev) => ev.preventDefault(), true)
  } catch {}
}

// a page is drawn 390 wide, as on a customer's phone, and scaled to its frame (home.css .screen)
const fit = () => document.querySelectorAll('.screen').forEach((el) => el.style.setProperty('--s', (el.clientWidth / 390).toFixed(4)))
addEventListener('resize', fit)

// a kind's card opens its page where that kind's design shows: the rooms, the shelf, the packages, the work
const KEY = ['rooms', 'shop', 'packages', 'works']
function toKey(f) {
  try {
    const e = f.contentDocument.getElementById(KEY[+f.dataset.i]), win = f.contentWindow
    if (e) win.scrollTo({ top: e.getBoundingClientRect().top + win.scrollY - 24, behavior: 'instant' })
  } catch {}
}

// the name in a page already drawn: typing changes its title at once, without drawing the page again
function setName(f) {
  try {
    const h1 = f.contentDocument.querySelector('header.top h1')
    if (!h1) return
    const t = typed || examples()[+f.dataset.i].d.name
    h1.style.setProperty('--lw', longestWord(t))
    h1.classList.toggle('th', /[฀-๿]/.test(t))
    h1.textContent = t
  } catch {}
}

// the photos' credits come first, so a page is drawn once, with them
const credited = fetch('/s/home/photos.json').then((r) => r.json()).then((j) => { EXCR = j; EX = null }).catch(() => {})

// ---- 1. choose a kind, type a name: the phone ----------------------------------------------
const pf = [$('#pf0'), $('#pf1')]
let front = 1, seq = 0
function phone() {
  const n = ++seq, back = pf[1 - front]
  credited.then(() => {
    if (n !== seq) return
    back.dataset.i = kind
    back.onload = () => {
      if (n !== seq) return
      lock(back); setName(back)
      back.classList.add('on'); pf[front].classList.remove('on')
      front = 1 - front
    }
    back.srcdoc = pageHtml(kind)
  })
}

function kinds() {
  $('#kinds4').innerHTML = KINDS.map(([id, , d], i) => `<button type="button" role="radio" aria-checked="${i === kind}" tabindex="${i === kind ? 0 : -1}" data-k="${i}" style="--k:${accent(i)}"><i data-dingbat="${d}" data-look="ink" data-play="hover"></i><span><b>${esc(w('k_' + id))}</b><small>${esc(w('h_' + id))}</small></span></button>`).join('')
  const bs = [...$('#kinds4').querySelectorAll('button')]
  bs.forEach((b, i) => {
    b.onclick = () => pick(i)
    b.onkeydown = (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
      if (step) { e.preventDefault(); pick((i + step + bs.length) % bs.length); $('#kinds4').querySelector('[aria-checked=true]').focus() }
    }
  })
}
function pick(i) {
  if (i === kind) return
  kind = i
  $('#kinds4').querySelectorAll('button').forEach((b, j) => { b.setAttribute('aria-checked', j === i); b.tabIndex = j === i ? 0 : -1 })
  $('#top').style.setProperty('--k', accent(i))
  phone()
}
function named() {
  $('#hslug').textContent = shownSlug()
  pf.forEach((f) => { if (f.srcdoc) setName(f) })
  document.querySelectorAll('#krail .cta').forEach((a) => (a.href = makeHref(+a.dataset.k)))
}
$('#tn').addEventListener('input', (e) => { typed = e.target.value.trim(); named() })
$('#try').onsubmit = (e) => { e.preventDefault(); location.href = makeHref(kind) }

// ---- 2. the four kinds, one example page each -----------------------------------------------
function cards() {
  $('#krail').innerHTML = KINDS.map(([id, , d], i) => `<article class="kb" style="--k:${accent(i)}">
    <h3><i data-dingbat="${d}" data-look="ink" data-play="hover"></i>${esc(w('k_' + id))}</h3>
    <div class="phone"><div class="shell"><div class="screen"><iframe class="on" title="${esc(w('ex'))}" data-i="${i}" tabindex="-1"></iframe></div></div></div>
    <ul>${w('l_' + id).map((t) => (t.startsWith('★ ') ? `<li class="g"><span>${esc(t.slice(2))} <em>${esc(w('gold'))}</em></span></li>` : `<li><span>${esc(t)}</span></li>`)).join('')}</ul>
    <a class="cta go" data-k="${i}" href="${esc(makeHref(i))}">${esc(w('likeThis'))}</a></article>`).join('')
  fit()
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return
    io.unobserve(e.target)
    credited.then(() => { e.target.onload = () => { lock(e.target); toKey(e.target) }; e.target.srcdoc = pageHtml(+e.target.dataset.i) })
  }), { rootMargin: '300px' })
  $('#krail').querySelectorAll('iframe').forEach((f) => io.observe(f))
}

// ---- 3. Free or Gold ------------------------------------------------------------------------
// hotels: the commission a direct booking does not pay, against the room-booking year
function calc(price, month) {
  const N = $('#cN'), M = $('#cM')
  const draw = () => {
    const n = +N.value, m = +M.value, ota = Math.round(n * m * 12 * 0.15), keep = Math.max(0, ota - price)
    $('#cvN').textContent = '฿' + num(n); $('#cvM').textContent = num(m)
    $('#vOta').textContent = '฿' + num(ota) + ' ' + w('yr'); $('#vFlat').textContent = '฿' + num(price) + ' ' + w('yr') + ' (' + w('free2') + ') · ' + w('or') + ' ฿' + num(month) + ' ' + w('mo')
    const top = Math.max(ota, price)
    $('#bOta').style.width = (ota / top) * 100 + '%'; $('#bFlat').style.width = Math.max(1.5, (price / top) * 100) + '%'
    $('#vKeep').textContent = '฿' + num(keep)
  }
  N.oninput = M.oninput = draw
  draw()
}

function plans(price, hotel, hotelYear) {
  hotel = hotel || 555; hotelYear = hotelYear || hotel * 10
  calc(hotelYear, hotel)
  const fill = (t) => t.replace('{p}', num(hotel)).replace('{y}', num(hotelYear))
  $('#why').textContent = w('why').replace('{y}', num(price)).replace('{m}', num(Math.round(price / 12)))
  $('#freeList').innerHTML = w('free9').map((t) => `<li><span>${esc(t)}</span></li>`).join('')
  $('#goldList').innerHTML = w('goldG').map(([h, items]) => `<li class="gh"><b>${esc(h)}</b></li>` + items.map((t) => `<li><span>${esc(fill(t))}</span></li>`).join('')).join('') +
    `<li class="gh"><b>${esc(w('everything'))}</b></li>`
  $('#goldPrice').innerHTML = `฿${num(price)} <small>${w('perYear')}</small><span class="hotelp">${esc(fill(w('hotelPrice')))}</span>`
  const cols = w('cmpCols')
  $('#cmp').innerHTML = `<thead><tr><th></th>${cols.map((c, i) => `<th class="c${i}">${esc(c)}</th>`).join('')}</tr></thead><tbody>` +
    w('cmp').map(([row, ...cells]) => `<tr><th scope="row">${esc(row)}</th>${cells.map((c, i) => `<td class="c${i}">${esc(fill(c))}</td>`).join('')}</tr>`).join('') + '</tbody>'
  $('#cmpSrc').innerHTML = esc(w('cmpSrc')) + ' ' + CMP_SRC.map(([t, u]) => `<a href="${esc(u)}" rel="noopener">${esc(t)}</a>`).join(' · ')
}

// the photos this page shows, each credited as its licence asks
function credits() {
  const shown = new Set(examples().flatMap((x) => [x.d.cover, ...(x.d.photos || [])]).map((id) => EXP[id]).filter(Boolean))
  $('#credits').innerHTML = w('pics') + ': ' + Object.entries(EXCR).filter(([k]) => shown.has(k)).map(([, c]) => `<a href="${esc(c.src)}" rel="noopener">${esc(c.title)}</a> — ${esc(c.by)} (${c.licenseUrl ? `<a href="${esc(c.licenseUrl)}" rel="noopener">${esc(c.license)}</a>` : esc(c.license)})`).join(' · ')
}

// ---- the words, the language switch, the docked button ---------------------------------------
function words() {
  document.documentElement.lang = L
  document.querySelectorAll('[data-w]').forEach((el) => { const k = el.dataset.w; if (k === 'h1') el.innerHTML = w(k); else el.textContent = w(k) })
  $('#tn').placeholder = w('tryPh')
  $('#pf0').title = $('#pf1').title = w('ex')
  $('#langs').innerHTML = Object.entries(LANGS).map(([k, v]) => `<button data-l="${k}"${k === L ? ' class="on"' : ''}>${v}</button>`).join('')
  $('#langs').querySelectorAll('button').forEach((b) => (b.onclick = () => { L = b.dataset.l; store.set('lang', L); EX = null; all() }))
}

let COUNT = null
function all() {
  fit(); words(); kinds(); cards(); plans(COUNT?.price || 3000, COUNT?.hotel || 555, COUNT?.hotelYear || 5550); credits(); named(); phone()
  $('#top').style.setProperty('--k', accent(kind))
  watchDock()
}

// the docked button shows once the hero is gone, and steps aside while another "make" button is on screen,
// so it never sits on top of a heading or a card's own button (2026-10-16). all() redraws those buttons on a
// language switch, so it watches them afresh each time.
let dockIO = null
const dockSeen = new Set()
function watchDock() {
  dockIO?.disconnect(); dockSeen.clear()
  dockIO = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? dockSeen.add(e.target) : dockSeen.delete(e.target))); $('#dock').classList.toggle('on', !dockSeen.size) }, { rootMargin: '0px 0px -40px 0px' })
  dockIO.observe($('.hero'))
  document.querySelectorAll('main a[href^="/make"], main .go').forEach((el) => dockIO.observe(el))
}

all()
credited.then(() => { credits(); cards() })
fetch('/api/count').then((r) => r.json()).then((j) => { COUNT = j; plans(j.price, j.hotel, j.hotelYear) }).catch(() => {})
