// home.js — sites.motdang.net/: why make a page, shown rather than told (Nan 2026-10-26: plain words for readers
// of a second language, photos as taken, the kinds likely to pay first, Free and Gold beside WordPress.com and Wix).
// The hero draws the visitor's own shop as they type its name; the phones run the real page renderer on example
// pages. Thai, English, Burmese and Chinese; the words are in home-words.mjs.

import { render, LOOKS, LOOK_IDS, lookOf, qrSvg } from './render.mjs'
import { W, CMP_SRC } from './home-words.mjs'

const $ = (s, el = document) => el.querySelector(s)
const store = { get(k, d) { try { const v = localStorage.getItem('mdh:' + k); return v === null ? d : v } catch { return d } }, set(k, v) { try { localStorage.setItem('mdh:' + k, v) } catch {} } }
const LANGS = { th: 'ไทย', en: 'EN', my: 'မြန်မာ', zh: '中文' }
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

let L = store.get('lang', (navigator.language || 'th').slice(0, 2))
if (!W[L]) L = 'th'
const w = (k) => (W[L] && W[L][k]) ?? W.en[k] ?? ''
const num = (n) => new Intl.NumberFormat(L === 'my' ? 'en' : L).format(n)

// ---- the hero: the visitor's shop, drawn as they type ----------------------------------------
// [word, the doodler's scene, dingbat, the page maker's kind, its look]
const KINDS = [['guest', 'guesthouse', 'key', 'stay', 'loom'], ['food', 'restaurant', 'noodles', 'food', 'lanna'], ['massage', 'massage', 'lotus', 'service', 'clean'],
  ['cook', 'cooking', 'noodles', 'service', 'clean'], ['tour', 'tuktuk', 'compass', 'service', 'night'], ['store', 'handicraft', 'gift', 'store', 'clean'],
  ['online', 'cafe', 'rocket', 'online', 'clean'], ['portfolio', 'handicraft', 'nib', 'work', 'clean']]
let kind = 0, typed = ''
const ALTS = [null, 38, 2, -6, -22]
let ai = 0

function load(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s) }) }
const ready = load('/front/skyline.js').then(() => load('/front/doodler.js'))
const dbs = load('/s/db/core.js').then(() => Promise.all(['signals', 'classic', 'kitchen', 'faces', 'lanna', 'curious'].map((f) => load('/s/db/' + f + '.js'))))

const cv = $('#drawn'), cx = cv.getContext('2d')
let CW = 0, CH = 0, last = 0, visible = true
function size() { const dpr = Math.min(2, devicePixelRatio || 1); CW = cv.clientWidth; CH = cv.clientHeight; cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0) }
function paint(t) {
  const D = window.MDDOODLER
  if (!D || !CW) return
  const nm = typed || w('tryPh'), [, set, , mk] = KINDS[kind]
  cx.clearRect(0, 0, CW, CH)
  try { D.portrait(cx, CW, CH, t, { set, alt: ALTS[ai], place: { id: 'home-' + nm, name: nm, nameTh: nm, nameEn: nm, cat: mk === 'stay' ? 'hotel' : mk, sub: [set], hours: 'Mo-Su 08:00-21:00', lat: 18.7883, lng: 98.9853 } }) } catch {}
}
function loop(t) { if (visible && t - last > 33) { last = t; paint(t) } requestAnimationFrame(loop) }
ready.then(() => { size(); paint(4000); addEventListener('mddoodler', () => paint(performance.now())); if (!REDUCED) requestAnimationFrame(loop) }).catch(() => { $('#stage').hidden = true })
addEventListener('resize', () => { size(); paint(4000) })
new IntersectionObserver((es) => { visible = es[0].isIntersecting }).observe(cv)
$('#stage').onclick = () => { ai = (ai + 1) % ALTS.length; paint(performance.now()); if (window.Dingbats?.burst) { const r = cv.getBoundingClientRect(); try { window.Dingbats.burst(r.left + r.width / 2, r.top + r.height / 2, { names: ['sparkle', 'star', 'lantern'], n: 10 }) } catch {} } }
$('#tn').addEventListener('input', (e) => { typed = e.target.value.trim(); paint(performance.now()) })
$('#try').onsubmit = (e) => {
  e.preventDefault()
  const [, , , mk, look] = KINDS[kind]
  const q = new URLSearchParams({ kind: mk })
  if (typed) { q.set('title', typed); q.set('look', look); q.set('go', '1') }
  location.href = '/make#' + q
}
function chips() {
  $('#chips').innerHTML = KINDS.map(([k, , d], i) => `<button type="button" data-k="${i}"${i === kind ? ' class="on"' : ''}><i data-dingbat="${d}" data-look="ink" data-play="hover"></i>${w('k_' + k)}</button>`).join('')
  $('#chips').querySelectorAll('button').forEach((b) => (b.onclick = () => { kind = +b.dataset.k; chips(); paint(performance.now()) }))
}

// ---- example pages, drawn by the real renderer --------------------------------------------
// photos as taken (tools/photos.py), each with its credit in /s/home/photos.json
const EXP = { exroom1000000: 'ex-room1', exroom2000000: 'ex-room2', exroom3000000: 'ex-room3', exsomtam00000: 'ex-somtam', exkhaosoi0000: 'ex-khaosoi',
  exnoodles0000: 'ex-noodles', exkrapow00000: 'ex-krapow', exshop0000000: 'ex-shop', extomyum00000: 'ex-tomyum', exwhite000000: 'ex-white',
  exstreet00000: 'ex-street', excook0000000: 'ex-cook', exmassage0000: 'ex-massage', exmassage2000: 'ex-massage2', extrek0000000: 'ex-trek',
  exraft0000000: 'ex-raft', exhouse0000000: 'ex-house', extextile0000: 'ex-textile', exumbrella000: 'ex-umbrella', excarve000000: 'ex-carve',
  exweaver00000: 'ex-weaver', exumbrella200: 'ex-umbrella2', exlatte000000: 'ex-latte' }
let EXCR = {}
const exImg = (id, small) => (EXP[id] ? `/s/home/${EXP[id]}${small ? '-s' : ''}.webp` : '')
const exCredits = (ids) => Object.fromEntries(ids.filter((id) => EXCR[EXP[id]]).map((id) => [id, EXCR[EXP[id]]]))
const has = (id) => !!EXCR[EXP[id]]
const pics = (...ids) => ids.filter(has)
const th = () => L === 'th'
const all7 = (a, b) => Array.from({ length: 7 }, () => [[a, b]])
const EXAMPLES = () => [
  { name: 'example-guesthouse', look: 'loom', lang: L, kind: 'stay', tier: 'gold', label: 'k_guest', d: {
    name: th() ? 'บ้านมด เกสต์เฮาส์' : 'Ant House Guesthouse', tagline: th() ? 'ห้องพักเงียบ ในเมืองเก่าเชียงใหม่ เดิน 5 นาทีถึงประตูท่าแพ' : 'Quiet rooms in Chiang Mai old city. 5 minutes on foot to Tha Phae Gate.',
    cover: 'exroom1000000', photos: pics('exroom1000000', 'exroom2000000', 'exroom3000000', 'exhouse0000000'), drawing: false,
    rooms: [
      { id: 'r1double', n: th() ? 'ห้องดับเบิล' : 'Double room', guests: 2, beds: th() ? 'เตียงคู่' : 'Double bed', p: '900', photos: pics('exroom1000000') },
      { id: 'r2thai', n: th() ? 'ห้องไทย' : 'Thai room', guests: 2, beds: th() ? 'เตียงคิงไซซ์' : 'King bed', p: '1200', photos: pics('exroom2000000') },
      { id: 'r3view', n: th() ? 'ห้องวิวเมือง' : 'City view room', guests: 3, beds: th() ? '2 เตียง' : '2 beds', p: '1500', photos: pics('exroom3000000') },
    ],
    ota: { agoda: 'https://www.agoda.com/', booking: 'https://www.booking.com/' }, contact: { line: '@example', phone: '053 000 000' }, place: { lat: 18.7877, lng: 98.9931, cc: 'TH', zoom: 16 }, msg: true } },
  { name: 'example-cooking', look: 'clean', lang: L, kind: 'service', tier: 'gold', label: 'k_cook', d: {
    name: th() ? 'บ้านมด สอนทำอาหาร' : 'Ant House Cooking School', tagline: th() ? 'ทำอาหารไทย 4 อย่าง เดินตลาดตอนเช้า กลุ่มเล็ก' : 'Cook 4 Thai dishes. Market walk in the morning. Small groups.',
    cover: 'excook0000000', photos: pics('excook0000000', 'exsomtam00000', 'extomyum00000', 'exkrapow00000'), drawing: false,
    svc: [
      { id: 'c1morning', n: th() ? 'คลาสเช้า + เดินตลาด' : 'Morning class + market', mins: 300, p: '1200', note: '09:00', cap: 10 },
      { id: 'c2evening', n: th() ? 'คลาสเย็น' : 'Evening class', mins: 180, p: '1000', note: '17:00', cap: 10 },
    ],
    hours: { on: true, tz: 'Asia/Bangkok', week: all7('09:00', '20:00') }, contact: { line: '@example' }, place: { lat: 18.7905, lng: 98.9868, cc: 'TH', zoom: 16 }, msg: true } },
  { name: 'example-massage', look: 'stitch', lang: L, kind: 'service', tier: 'gold', label: 'k_massage', d: {
    name: th() ? 'บ้านมด นวดไทย' : 'Ant House Massage', tagline: th() ? 'นวดไทย นวดเท้า นวดน้ำมัน เดินเข้ามาหรือจองก่อน' : 'Thai, foot and oil massage. Walk in, or book.',
    cover: 'exmassage0000', photos: pics('exmassage0000', 'exmassage2000'), drawing: false,
    svc: [
      { id: 'm1thai', n: th() ? 'นวดไทย' : 'Thai massage', mins: 60, p: '300' },
      { id: 'm2foot', n: th() ? 'นวดเท้า' : 'Foot massage', mins: 60, p: '300' },
      { id: 'm3oil', n: th() ? 'นวดน้ำมัน' : 'Oil massage', mins: 90, p: '600' },
    ],
    hours: { on: true, tz: 'Asia/Bangkok', week: all7('10:00', '22:00') }, contact: { line: '@example', phone: '053 000 000' }, place: { lat: 18.7861, lng: 98.9888, cc: 'TH', zoom: 16 }, msg: true } },
  { name: 'example-kitchen', look: 'lanna', lang: L, kind: 'food', tier: 'free', label: 'k_food', d: {
    name: th() ? 'ครัวบ้านมด' : 'Ant House Kitchen', tagline: th() ? 'ข้าวซอย ส้มตำ ก๋วยเตี๋ยว' : 'Khao soi, som tam and noodle soup',
    cover: 'exkhaosoi0000', photos: pics('exkhaosoi0000', 'exnoodles0000', 'exkrapow00000', 'exsomtam00000', 'exshop0000000'),
    items: [{ n: th() ? 'ข้าวซอยไก่' : 'Khao soi, chicken', p: '60' }, { n: th() ? 'ก๋วยเตี๋ยวเรือ' : 'Boat noodles', p: '50' }, { n: th() ? 'ผัดกะเพรา' : 'Pad krapow', p: '60' }, { n: th() ? 'ส้มตำ' : 'Som tam', p: '50' }],
    hours: { on: true, tz: 'Asia/Bangkok', week: all7('09:00', '16:00') }, contact: { line: '@example', phone: '053 000 000' }, place: { lat: 18.7953, lng: 98.9937, cc: 'TH', zoom: 17 }, msg: true } },
  { name: 'example-shop', look: 'clean', lang: L, kind: 'store', tier: 'gold', label: 'k_store', d: {
    name: th() ? 'บ้านมด ของทำมือ' : 'Ant House Handmade', tagline: th() ? 'ผ้าทอ ร่ม และงานไม้จากเชียงใหม่ ส่งทั่วโลกโดยมดแดง' : 'Weaving, umbrellas and wood from Chiang Mai, shipped anywhere by Mot Dang',
    cover: 'extextile0000', photos: pics('extextile0000', 'exumbrella000', 'excarve000000'), drawing: false,
    products: [
      { id: 'p1cloth', t: th() ? 'ผ้าทอไทลื้อ' : 'Tai Lue woven cloth', p: '1200', old: '1500', opts: th() ? 'สี: แดง, น้ำเงิน' : 'Colour: red, blue', stock: 6, g: 300, photos: pics('extextile0000') },
      { id: 'p2umb', t: th() ? 'ร่มกระดาษสา' : 'Paper umbrella', p: '650', g: 700, photos: pics('exumbrella000') },
      { id: 'p3wood', t: th() ? 'ช้างไม้แกะสลัก' : 'Carved wooden elephant', p: '890', stock: 3, g: 900, photos: pics('excarve000000') },
    ],
    ship: { th: '60', world: '600', free: '2000', mot: true }, pay: { pp: '0812345678' },
    contact: { line: '@example' }, msg: true } },
  { name: 'example-online', look: 'clean', lang: L, kind: 'online', tier: 'gold', label: 'k_online', d: {
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
  { name: 'example-crafts', look: 'clean', lang: L, kind: 'work', tier: 'free', label: 'k_portfolio', d: {
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
function phones() {
  const list = EXAMPLES()
  $('#rail').innerHTML = list.map((x, i) => `<div class="phone"><div class="shell"><iframe title="${w('ex')}" loading="lazy" data-i="${i}"></iframe></div><p>${w(x.label)}<small>${x.tier === 'gold' ? '★ ' + w('gold') : w('free')}</small></p><a class="cta like" href="/make#${new URLSearchParams({ kind: x.kind, look: x.look })}">${w('likeThis')}</a></div>`).join('')
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return
    io.unobserve(e.target)
    const x = list[+e.target.dataset.i]
    const d = { ...x.d, credits: exCredits([...new Set([x.d.cover, ...(x.d.photos || [])].filter(Boolean))]) }
    e.target.srcdoc = render({ ...x, d, status: 'live', views: 1200 + 37 * +e.target.dataset.i }, { preview: true, gold: x.tier === 'gold', hotel: x.kind === 'stay', origin: location.origin, img: exImg })
    // an example's buttons stay inside it: no call, chat or map leaves the page
    e.target.onload = () => { try { e.target.contentDocument.addEventListener('click', (ev) => { const a = ev.target.closest('a[href]'); if (a && !a.getAttribute('href').startsWith('#')) ev.preventDefault() }, true) } catch {} }
  }), { rootMargin: '300px' })
  $('#rail').querySelectorAll('iframe').forEach((f) => io.observe(f))
}

// ---- the toys ------------------------------------------------------------------------------
const HELLO = ['เปิดอยู่', 'Open now', 'ယခုဖွင့်ထားသည်', '营业中', '営業中', '영업 중', 'Đang mở cửa', 'កំពុងបើក', 'ເປີດຢູ່', 'Buka sekarang', 'Abierto', 'Ouvert']
function toys() {
  const days = [3, 5, 4, 8, 12, 9, 14, 11, 18, 16, 22, 19, 27, 24]
  $('#toys').innerHTML = [
    `<div class="toy rise" data-go="draw"><div class="art"><i data-dingbat="pencil" data-look="riso"></i></div><h3>${w('t_draw')}</h3></div>`,
    `<div class="toy line rise"><div class="art">${qrSvg('https://sites.motdang.net/make', { dark: '#06c755', light: '#0e1f3d', label: 'LINE' })}</div><h3>${w('t_line')}</h3></div>`,
    `<div class="toy grab rise"><div class="art"><i data-dingbat="scooter" data-look="ink"></i></div><h3>${w('t_grab')}</h3></div>`,
    `<a class="toy rise" href="#gold" style="text-decoration:none"><div class="art"><i data-dingbat="calendar" data-look="riso"></i></div><h3>${w('t_book')} ★</h3></a>`,
    `<div class="toy rise"><div class="art"><span class="badge"><i></i>${w('t_openB')}</span></div><h3>${w('t_open')}</h3></div>`,
    `<div class="toy map rise"><iframe loading="lazy" title="${w('t_map')}" data-src="/map?pin=18.7883,98.9853&amp;pn=${encodeURIComponent(w('tryPh'))}&amp;embed=1&amp;look=doodle"></iframe><div class="tx"><h3>${w('t_map')}</h3></div></div>`,
    `<div class="toy rise"><div class="art" style="display:flex;flex-direction:column;gap:8px;place-items:stretch"><span class="bubble">${w('t_msg1')}</span><span class="bubble b2">${w('t_msg2')}</span></div><h3>${w('t_msg')}</h3></div>`,
    `<div class="toy rise"><div class="art"><div class="minibars" style="width:100%">${days.map((n, i) => `<i style="height:${(n / 27) * 100}%;animation-delay:${i * 50}ms"></i>`).join('')}</div></div><h3>${w('t_stats')}</h3></div>`,
    `<div class="toy rise"><div class="art"><i data-dingbat="share" data-look="riso"></i></div><h3>${w('t_share')}</h3></div>`,
    `<div class="toy rise"><div class="art"><span class="words12" id="w12">${HELLO[0]}</span></div><h3>${w('t_lang')} ★</h3></div>`,
    `<div class="toy rise"><div class="art"><span class="a4"><b>${esc(typed || w('tryPh'))}</b>${qrSvg('https://sites.motdang.net/', { dark: '#000', light: '#fff', label: 'QR' })}</span></div><h3>${w('t_sign')}</h3></div>`,
    `<a class="toy gold rise" href="#gold"><div class="art"><i data-dingbat="crown" data-look="paper"></i></div><h3>${w('t_gold')}</h3></a>`,
  ].join('')
  $('#toys').querySelector('[data-go=draw]').onclick = () => $('#stage').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' })
  const mio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { mio.disconnect(); e.target.src = e.target.dataset.src } }), { rootMargin: '200px' })
  $('#toys').querySelectorAll('iframe[data-src]').forEach((f) => mio.observe(f))
  let n = 0
  clearInterval(toys.t)
  toys.t = setInterval(() => { const el = $('#w12'); if (el) el.textContent = HELLO[++n % HELLO.length] }, 1300)
  rise()
}

function looks() {
  $('#looks').innerHTML = LOOK_IDS.map((id) => {
    const Lk = LOOKS[id]
    return `<button class="lk" data-look="${id}" style="${(Lk.vars.replace(/\s+/g, ' ') + ';--accent:' + Lk.accent).replace(/"/g, '&quot;')}">${Lk.art}${Lk.gold ? '<span class="gl">★ Gold</span>' : ''}<b>${esc(typed || w('tryPh'))}</b><small>${Lk.label}</small><span class="acc"></span><a class="use" href="/make#look=${id}">${w('useLook')} →</a></button>`
  }).join('')
  $('#looks').querySelectorAll('.lk').forEach((b) => (b.onclick = () => { const a = b.querySelector('.art'); a.classList.remove('go'); void a.getBoundingClientRect(); a.classList.add('go') }))
}

// hotels: the commission a direct booking does not pay, against the room-booking year
function calc(price, month) {
  const N = $('#cN'), M = $('#cM')
  if (!N) return
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

const FREE_DING = ['star', 'link', 'search', 'telephone', 'pencil', 'calendar', 'envelope', 'coin', 'camera', 'share']
const GROUP_DING = ['gift', 'calendar', 'heart', 'chat', 'star']
function tiers(price, hotel, hotelYear) {
  hotel = hotel || 555; hotelYear = hotelYear || hotel * 10
  calc(hotelYear, hotel)
  const fill = (t) => t.replace('{p}', num(hotel)).replace('{y}', num(hotelYear))
  $('#why').textContent = w('why').replace('{y}', num(price)).replace('{m}', num(Math.round(price / 12)))
  $('#freeList').innerHTML = w('free9').map((t, i) => `<li><i data-dingbat="${FREE_DING[i] || 'check'}" data-look="ink"></i><span>${esc(t)}</span></li>`).join('')
  $('#goldList').innerHTML = w('goldG').map(([h, items], g) => `<li class="gh"><i data-dingbat="${GROUP_DING[g]}" data-look="paper"></i><b>${esc(h)}</b></li>` + items.map((t) => `<li class="gi"><span>${esc(fill(t))}</span></li>`).join('')).join('') +
    `<li class="gh"><i data-dingbat="check" data-look="paper"></i><b>${esc(w('everything'))}</b></li>`
  $('#goldPrice').innerHTML = `฿${num(price)} <small>${w('perYear')}</small><span class="hotelp">${esc(fill(w('hotelPrice')))}</span>`
  const cols = w('cmpCols')
  $('#cmp').innerHTML = `<thead><tr><th></th>${cols.map((c, i) => `<th class="c${i}">${esc(c)}</th>`).join('')}</tr></thead><tbody>` +
    w('cmp').map(([row, ...cells]) => `<tr><th scope="row">${esc(row)}</th>${cells.map((c, i) => `<td class="c${i}">${esc(fill(c))}</td>`).join('')}</tr>`).join('') + '</tbody>'
  $('#cmpSrc').innerHTML = esc(w('cmpSrc')) + ' ' + CMP_SRC.map(([t, u]) => `<a href="${esc(u)}" rel="noopener">${esc(t)}</a>`).join(' · ')
}

// ---- the lantern night: lanterns rising over the photo (2026-10-15) --------------------------
function lanterns() {
  const c = $('#lanterns')
  if (!c || REDUCED) return
  const x = c.getContext('2d'), R = (() => { let a = 1015; return () => ((a = (a * 16807) % 2147483647) / 2147483647) })()
  let W = 0, H = 0, on = true
  const L = Array.from({ length: 26 }, () => ({ x: R(), y: R(), z: 0.35 + R() * 0.9, s: R() * 6.28, v: 0.25 + R() * 0.5 }))
  const fit = () => { const d = Math.min(2, devicePixelRatio || 1); W = c.clientWidth; H = c.clientHeight; c.width = W * d; c.height = H * d; x.setTransform(d, 0, 0, d, 0, 0) }
  fit(); addEventListener('resize', fit)
  new IntersectionObserver((es) => { on = es[0].isIntersecting }).observe($('.hero'))
  let last = 0
  const draw = (t) => {
    requestAnimationFrame(draw)
    if (!on || t - last < 33) return
    const dt = Math.min(60, t - last); last = t
    x.clearRect(0, 0, W, H)
    for (const l of L) {
      l.y -= (l.v * l.z * dt) / 60000; if (l.y < -0.08) { l.y = 1.08; l.x = R() }
      const px = (l.x + Math.sin(t / 3200 + l.s) * 0.012) * W, py = l.y * H, r = 9 * l.z
      const flick = 0.82 + Math.sin(t / 180 + l.s * 7) * 0.08
      const g = x.createRadialGradient(px, py, 0, px, py, r * 4)
      g.addColorStop(0, `rgba(255,190,90,${0.42 * flick * l.z})`); g.addColorStop(1, 'rgba(255,140,40,0)')
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r * 4, 0, 6.29); x.fill()
      x.fillStyle = `rgba(255,${200 + 30 * flick},${120 + 40 * flick},${0.9 * l.z})`
      x.beginPath(); x.moveTo(px - r * 0.62, py - r); x.lineTo(px + r * 0.62, py - r); x.lineTo(px + r * 0.48, py + r * 0.7); x.lineTo(px - r * 0.48, py + r * 0.7); x.closePath(); x.fill()
      x.fillStyle = `rgba(255,250,220,${0.85 * flick})`; x.beginPath(); x.arc(px, py + r * 0.45, r * 0.22, 0, 6.29); x.fill()
    }
  }
  requestAnimationFrame(draw)
}


function credits() {
  // the photos this page shows, each credited as its licence asks
  const shown = new Set(['hero', ...EXAMPLES().flatMap((x) => [x.d.cover, ...(x.d.photos || [])]).map((id) => EXP[id]).filter(Boolean)])
  $('#credits').innerHTML = w('pics') + ': ' + Object.entries(EXCR).filter(([k]) => shown.has(k)).map(([, c]) => `<a href="${esc(c.src)}" rel="noopener">${esc(c.title)}</a> — ${esc(c.by)} (${c.licenseUrl ? `<a href="${esc(c.licenseUrl)}" rel="noopener">${esc(c.license)}</a>` : esc(c.license)})`).join(' · ')
}

// ---- the three steps, done here: what for, the name and its address, the look → the page ------
const STEP_KINDS = [['stay', 'key'], ['service', 'gear'], ['food', 'noodles'], ['shop', 'cart'], ['event', 'party'], ['work', 'nib'], ['me', 'wave']]
const inkFor = (Lk) => { const bg = /--bg:#([0-9a-f]{6})/i.exec(Lk.vars)?.[1] || 'ffffff', v = parseInt(bg, 16); return (0.2126 * (v >> 16) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255 < 0.45 ? '#fff8ec' : /--ink:(#[0-9a-f]{6})/i.exec(Lk.vars)?.[1] || '#111' }
let sKind = 'stay', sLook = 'loom', sName = ''
const slug = (n) => n.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)
function steps() {
  $('#s1').innerHTML = STEP_KINDS.map(([k, d]) => `<button type="button" data-k="${k}"${k === sKind ? ' class="on"' : ''}><i data-dingbat="${d}" data-look="ink" data-play="hover"></i>${w(k === 'work' ? 't_work' : 'k_' + k)}</button>`).join('')
  $('#s1').querySelectorAll('button').forEach((b) => (b.onclick = () => { sKind = b.dataset.k; steps() }))
  $('#s3').innerHTML = LOOK_IDS.map((id) => { const Lk = LOOKS[id]; return `<button type="button" data-l="${id}" title="${Lk.label}" aria-label="${Lk.label}" style="${(Lk.vars.replace(/\s+/g, ' ') + ';--accent:' + Lk.accent + ';color:' + inkFor(Lk)).replace(/"/g, '&quot;')}"${id === sLook ? ' class="on"' : ''}>Aa${Lk.gold ? '<i class="g">★</i>' : ''}</button>` }).join('')
  $('#s3').querySelectorAll('button').forEach((b) => (b.onclick = () => { sLook = b.dataset.l; steps() }))
  $('#s2').placeholder = w('s2ph')
  const sl = slug(sName)
  $('#s2a').textContent = 'sites.motdang.net/' + (sl.length >= 3 ? sl : sName ? '…' : slug(w('s2ph')))
  const q = new URLSearchParams({ kind: sKind, look: sLook, go: '1' })
  if (sName) q.set('title', sName)
  $('#s3go').href = '/make#' + q
}
$('#s2').addEventListener('input', (e) => { sName = e.target.value.trim(); steps() })

let COUNT = null
function live() {
  // a short list reads as "nobody uses this": the section shows from 12 pages up (2026-10-26)
  if (!COUNT || COUNT.live < 12) { $('#live').hidden = true; return }
  $('#live').hidden = false
  $('#liveH').textContent = COUNT.live < 20 ? w('liveFew') : w(COUNT.countries > 1 ? 'liveH' : 'liveH1').replace('{n}', num(COUNT.live)).replace('{c}', num(COUNT.countries))
  $('#latest').innerHTML = COUNT.latest.map((p) => {
    const Lk = LOOKS[lookOf(p.look)]
    const pic = p.card || p.cover ? `<img src="${p.card || p.cover}" alt="" loading="lazy">` : esc(p.title)
    return `<a href="/${esc(p.name)}"><span class="pic" style="${(Lk.vars.replace(/\s+/g, ' ')).replace(/"/g, '&quot;')}">${pic}</span><span class="t">${p.gold ? '★ ' : ''}${esc(p.title)}</span></a>`
  }).join('')
}

function rise() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -6% 0px' })
  document.querySelectorAll('.rise:not(.in)').forEach((el) => (REDUCED ? el.classList.add('in') : io.observe(el)))
}

function words() {
  document.documentElement.lang = L
  document.querySelectorAll('[data-w]').forEach((el) => { const k = el.dataset.w; if (k === 'h1') el.innerHTML = w(k); else el.textContent = w(k) })
  $('#tn').placeholder = w('tryPh')
  $('#langs').innerHTML = Object.entries(LANGS).map(([k, v]) => `<button data-l="${k}"${k === L ? ' class="on"' : ''}>${v}</button>`).join('')
  $('#langs').querySelectorAll('button').forEach((b) => (b.onclick = () => { L = b.dataset.l; store.set('lang', L); all() }))
  document.querySelectorAll('.foot [data-w]').forEach((el) => (el.textContent = w(el.dataset.w)))
}

function all() {
  words(); chips(); phones(); toys(); looks(); tiers(COUNT?.price || 3000, COUNT?.hotel || 555, COUNT?.hotelYear || 5550); live(); credits(); steps()
  paint(performance.now())
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
  document.querySelectorAll('main a[href^="/make"], main .go, main button.go').forEach((el) => dockIO.observe(el))
}
all()
lanterns()
fetch('/s/home/photos.json').then((r) => r.json()).then((j) => { EXCR = j }).catch(() => {}).then(() => { phones(); credits(); watchDock() })
fetch('/api/count').then((r) => r.json()).then((j) => { COUNT = j; tiers(j.price, j.hotel, j.hotelYear); live() }).catch(() => {})
dbs.catch(() => {})
