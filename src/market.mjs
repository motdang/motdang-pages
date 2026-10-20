// market.mjs — ตลาดพระ · the amulet night market (NaN 2026-10-20: "something fun and social and
// interesting to look at and hang out in. magic, you know?" · "both on one page" · photos "Both, credited").
//
//   /amulets                     Mot Dang sellers' amulets first; the market by kind as stalls; Guess the hammer
//   GET  /api/market/stall?k=    one stall's tray: G-Pra closes and Lazada listings, photos credited
//   GET  /api/market/round       a closed G-Pra auction to guess, without its price
//   POST /api/market/guess       {aid, guess, handle} → the hammer, the crowd's guesses
//   GET  /api/market/board       today's best guessers (Bangkok day, three guesses or more)
//   POST /api/market/here        {id} → how many are at the market now
//   POST /api/market/sadhu       {site, id} → a สาธุ on a seller's amulet
//
// Photos load from their own sites, credited and linked: G-Pra's thumbnailAlias and Lazada's lazcdn.

import { load, guide } from './amprice.mjs'
import { normalize } from '../public/s/render.mjs'
import { amCap, AM_MATERIALS, AM_FORMS, amLabel } from '../public/s/amulet.mjs'
import { isGold } from './gold.mjs'
import { isSian } from './sian.mjs'

export const GPRA_IMG = 'https://www.g-pra.com/thumbnailAlias/'
export const LAZ_IMG = 'https://img.lazcdn.com/g/'

// the stalls, famous makers first, then the charms people buy most: [key, ไทย, English, kind key or concept label]
export const STALLS = [
  ['somdej-wat-rakhang', 'สมเด็จวัดระฆัง', 'Somdej Wat Rakhang', 'k'], ['phra-rod', 'พระรอด', 'Phra Rod', 'k'], ['nang-phaya', 'นางพญา', 'Nang Phaya', 'k'],
  ['phong-suphan', 'ผงสุพรรณ', 'Phong Suphan', 'k'], ['sum-kor', 'ซุ้มกอ', 'Sum Kor', 'k'], ['lp-thuat', 'หลวงปู่ทวด', 'LP Thuat', 'k'],
  ['lp-ngern-bang-khlan', 'หลวงพ่อเงิน บางคลาน', 'LP Ngern', 'k'], ['lp-tim', 'หลวงปู่ทิม', 'LP Tim', 'k'], ['lp-khoon', 'หลวงพ่อคูณ', 'LP Khoon', 'k'],
  ['lp-waen', 'หลวงปู่แหวน', 'LP Waen', 'k'], ['lp-kuay', 'หลวงพ่อกวย', 'LP Kuay', 'k'], ['lp-toh-pradu', 'หลวงปู่โต๊ะ', 'LP Toh', 'k'],
  ['chao-khun-nor', 'เจ้าคุณนร', 'Chao Khun Nor', 'k'], ['lp-parn', 'หลวงพ่อปาน', 'LP Parn', 'k'], ['lp-liu', 'หลวงปู่หลิว', 'LP Liu', 'k'],
  ['lp-doo', 'หลวงปู่ดู่', 'LP Doo', 'k'], ['lp-sodh', 'หลวงพ่อสด', 'LP Sodh', 'k'], ['phra-kring', 'พระกริ่ง', 'Phra Kring', 'k'],
  ['king-rama9', 'ในหลวง', 'The King', 'k'], ['jatukham', 'จตุคาม', 'Jatukham', 'k'],
  ['Nang Kwak', 'นางกวัก', 'Nang Kwak', 'c'], ['Thao Wessuwan', 'ท้าวเวสสุวรรณ', 'Thao Wessuwan', 'c'], ['Kuman Thong', 'กุมารทอง', 'Kuman Thong', 'c'],
  ['Ai Khai', 'ไอ้ไข่', 'Ai Khai', 'c'], ['Rahu', 'ราหู', 'Rahu', 'c'], ['Takrut', 'ตะกรุด', 'Takrut', 'c'], ['Palad Khik', 'ปลัดขิก', 'Palad Khik', 'c'],
  ['Turtle lord', 'พญาเต่าเรือน', 'Turtle lord', 'c'], ['Salika bird', 'สาลิกา', 'Salika bird', 'c'], ['Khun Paen', 'ขุนแผน', 'Khun Paen', 'c'],
  ['One-eye coconut', 'กะลาตาเดียว', 'One-eye coconut', 'c'], ['Hun payon', 'หุ่นพยนต์', 'Hun payon', 'c'], ['Mor knife', 'มีดหมอ', 'Mor knife', 'c'],
  ['Betel relic', 'ชานหมาก', 'Betel relic', 'c'], ['Pidta', 'พระปิดตา', 'Pidta', 'c'], ['Pha yant', 'ผ้ายันต์', 'Pha yant', 'c'], ['Sacred wax', 'สีผึ้ง', 'Sacred wax', 'c'],
]

/** A stall's address: its kind key, or its concept in lower case with hyphens. */
export const slugOf = (key) => key.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const gUrl = (r) => `https://www.g-pra.com/auction/view.php?aid=${r.aid}`
const lUrl = (r) => `https://www.lazada.co.th/products/pdp-i${r.pdp}.html`
const gPic = (r) => (r.day ? `${GPRA_IMG}${r.day}/${r.aid}-org.jpg` : '')
const lPic = (r, size = '') => (r.pic ? LAZ_IMG + r.pic.replace(/_\d+x\d+q\d+\.jpg$/, '') + (size ? `_${size}x${size}q80.jpg` : '') : '')

// stalls and their rows, per data build (per isolate)
let built = null
function index(P) {
  if (built && built.at === P.at) return built
  const conceptIndex = new Map(P.rx.map((x, i) => [x.lab, i]))
  const match = ([key, , , how]) => (how === 'k' ? (r) => r.kind === key : ((i) => (r) => r.c.includes(i))(conceptIndex.get(key)))
  const stalls = []
  for (const s of STALLS) {
    const m = match(s)
    const a = P.gpra.filter(m), l = P.lazada.filter(m)
    if (a.length + l.length < 4) continue
    const best = l.filter((r) => r.pic).sort((x, y) => y.sold - x.sold)[0]
    const topA = a.filter((r) => r.day).sort((x, y) => y.price - x.price)[0]
    const src = best || topA
    const lo = Math.min(...a.map((r) => r.price), ...l.map((r) => r.price)), hi = Math.max(...a.map((r) => r.price), ...l.map((r) => r.price))
    stalls.push({ key: s[0], slug: slugOf(s[0]), th: s[1], en: s[2], a, l, nA: a.length, nL: l.length, midA: median(a.map((r) => r.price)), midL: median(l.map((r) => r.price)),
      lo, hi, topA: topA ? topA.price : 0, sold: l.reduce((t, r) => t + r.sold, 0), pic: best ? lPic(best, 340) : topA ? gPic(topA) : '',
      picFrom: src ? { src: best ? 'l' : 'g', title: src.title, price: src.price } : null })
  }
  const recent = P.gpra.filter((r) => r.closed).sort((x, y) => (y.closed > x.closed ? 1 : y.closed < x.closed ? -1 : y.price - x.price))
  const rung = new Set(recent.slice(0, 24).map((r) => r.aid)) // the bell shows these with their prices: never a random round
  const pool = P.gpra.filter((r) => r.day && r.bids >= 2 && r.price >= 100)
  built = { at: P.at, stalls, recent, pool, games: pool.filter((r) => !rung.has(r.aid)) }
  return built
}

/** The front of the market: stalls (no rows), the bell's last closes. */
export function front(P) {
  const I = index(P)
  return {
    built: P.built,
    stalls: I.stalls.map(({ a, l, ...s }) => s),
    bell: I.recent.slice(0, 24).map((r) => ({ aid: r.aid, price: r.price, bids: r.bids, title: r.title, closed: r.closed, url: gUrl(r), pic: gPic(r) })),
    counts: { auctions: P.gpra.length, listings: P.lazada.length },
  }
}

/** One stall's tray: recent closes and the best-selling listings, and every price for the strip. */
export function stall(P, key) {
  const s = index(P).stalls.find((x) => x.key === key || x.slug === key)
  if (!s) return null
  const A = s.a.slice().sort((x, y) => (y.closed > x.closed ? 1 : -1)).slice(0, 60)
    .map((r) => ({ src: 'g', price: r.price, title: r.title, url: gUrl(r), pic: gPic(r), bids: r.bids, date: r.closed, card: !!r.card }))
  const L = s.l.slice().sort((x, y) => y.sold - x.sold).slice(0, 60)
    .map((r) => ({ src: 'l', price: r.price, title: r.title, url: lUrl(r), pic: lPic(r, 340), sold: r.sold }))
  return { key: s.key, slug: s.slug, th: s.th, en: s.en, nA: s.nA, nL: s.nL, midA: s.midA, midL: s.midL, lo: s.lo, hi: s.hi, items: [...A, ...L],
    strip: { g: s.a.map((r) => r.price).slice(0, 400), l: s.l.map((r) => r.price).slice(0, 400) } }
}

/** A closed auction to guess: its photo, words and bid count, not its price. */
export function round(P, rnd = Math.random, aid = 0) {
  const I = index(P), G = I.games
  const r = (aid && I.pool.find((x) => x.aid === aid)) || (G.length ? G[Math.floor(rnd() * G.length)] : null)
  if (!r) return null
  return { aid: r.aid, title: r.title, pic: gPic(r), closed: r.closed, bidders: r.bidders, card: !!r.card }
}

// a player's name is made from two lists, so no one types one
export const HANDLE_A = [['เสือ', 'Tiger'], ['แมว', 'Cat'], ['ช้าง', 'Elephant'], ['เต่า', 'Turtle'], ['กา', 'Crow'], ['หงส์', 'Swan'], ['นาค', 'Naga'], ['ครุฑ', 'Garuda'], ['มดแดง', 'Red Ant'], ['ลิง', 'Monkey']]
export const HANDLE_B = [['ทอง', 'Gold'], ['เงิน', 'Silver'], ['นาค', 'Copper'], ['ดำ', 'Black'], ['แดง', 'Red'], ['ม่วง', 'Purple'], ['หยก', 'Jade'], ['เมฆ', 'Cloud']]
export const handleOk = (h) => { const m = /^(\d+)\.(\d+)\.(\d{1,3})$/.exec(String(h || '')); return !!m && +m[1] < HANDLE_A.length && +m[2] < HANDLE_B.length }
export const handleName = (h, lang) => { const [a, b, n] = String(h).split('.').map(Number); const i = lang === 'th' ? 0 : 1; return lang === 'th' ? `${HANDLE_A[a][0]}${HANDLE_B[b][0]} ${n}` : `${HANDLE_B[b][1]} ${HANDLE_A[a][1]} ${n}` }

const bkkDay = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10)
const score = (guess, price) => Math.round(100 * Math.exp(-Math.abs(Math.log(guess / price))))

/** Mot Dang sellers' amulets that can be had: Sala Sian pages first, newest pages next. */
export async function shelf(env, P, origin, lang) {
  const rows = (await env.DB.prepare("SELECT name, kind, d, tier, gold_until, plan, updated FROM site WHERE status = 'live' AND (kind = 'amulet' OR d LIKE '%\"amulets\":[{%') ORDER BY updated DESC LIMIT 200").all()).results
  const cand = []
  for (const s of rows) {
    let d
    try { d = normalize(JSON.parse(s.d)) } catch { continue }
    const sian = isSian(s)
    for (const x of d.amulets.slice(0, amCap(isGold(s), sian))) {
      if ((x.status === 'open' || x.status === 'reserved') && x.photos.length) cand.push({ s, d, x, sian })
    }
  }
  const pick = cand.sort((a, b) => b.sian - a.sian).slice(0, 120) // newest pages first within each group, as read
  const taps = new Map()
  for (const name of [...new Set(pick.map((c) => c.s.name))]) {
    for (const r of (await env.DB.prepare('SELECT amulet, n FROM market_sadhu WHERE site = ?').bind(name).all()).results) taps.set(`${name}/${r.amulet}`, r.n)
  }
  return pick.map(({ s, d, x, sian }) => {
    const g = P ? guide(P, { t: x.t, temple: x.temple, maker: x.maker, year: x.year, mould: x.mould, cert: x.cert },
      { labels: { mat: x.mat ? amLabel(AM_MATERIALS, x.mat, 'th') : '', form: x.form ? amLabel(AM_FORMS, x.form, 'th') : '' } }) : null
    const band = g?.auction ? [g.auction.low, g.auction.high, 'g'] : g?.online ? [g.online.low, g.online.high, 'l'] : null
    return { site: s.name, shop: d.name || s.name, id: x.id, t: x.t, p: x.p, status: x.status, pic: `${origin}/img/${x.photos[0]}-s.webp`,
      url: `${origin}/${s.name}/a/${x.id}`, sian, band, sadhu: taps.get(`${s.name}/${x.id}`) || 0, temple: x.temple, maker: x.maker, year: x.year,
      mat: x.mat ? amLabel(AM_MATERIALS, x.mat, lang) : '', form: x.form ? amLabel(AM_FORMS, x.form, lang) : '' }
  })
}

/** The /api/market/… calls. deps: J, take, sender, body. */
export async function api(request, env, p, url, { J, take, sender, body }) {
  const m = request.method
  if (p === 'market/stall' && m === 'GET') {
    const P = await load(env)
    const s = P && stall(P, String(url.searchParams.get('k') || ''))
    return s ? J(s, 200, { 'cache-control': 'public, max-age=900' }) : J({ error: 'stall' }, 404)
  }
  if (p === 'market/round' && m === 'GET') {
    const P = await load(env)
    const r = P && round(P, Math.random, Number(url.searchParams.get('aid')) || 0)
    return r ? J(r) : J({ error: 'nodata' }, 503)
  }
  if (p === 'market/guess' && m === 'POST') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'guess'))) return J({ error: 'quota' }, 429)
    const b = await body(request)
    const P = await load(env)
    const r = P && P.gpra.find((x) => x.aid === Number(b.aid))
    const guess = Math.round(Number(b.guess))
    if (!r || !(guess >= 1 && guess <= 1e8)) return J({ error: 'guess' }, 400)
    const handle = handleOk(b.handle) ? String(b.handle) : ''
    const w = who.slice(0, 16)
    // one guess a player an auction: a second one shows the hammer and keeps the first
    const ins = await env.DB.prepare('INSERT INTO market_guess (aid, guess, price, handle, who, day, at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(aid, who) DO NOTHING')
      .bind(r.aid, guess, r.price, handle, w, bkkDay(), new Date().toISOString()).run()
    const mine = (await env.DB.prepare('SELECT guess FROM market_guess WHERE aid = ? AND who = ?').bind(r.aid, w).first())?.guess ?? guess
    const crowd = (await env.DB.prepare('SELECT guess FROM market_guess WHERE aid = ? AND who != ?').bind(r.aid, w).all()).results.map((x) => x.guess)
    return J({ aid: r.aid, price: r.price, bids: r.bids, bidders: r.bidders, closed: r.closed, card: !!r.card, url: gUrl(r), score: score(mine, r.price), guess: mine, again: !ins.meta.changes,
      crowd: { n: crowd.length, median: median(crowd) } })
  }
  if (p === 'market/board' && m === 'GET') {
    const lang = url.searchParams.get('hl') === 'en' ? 'en' : 'th'
    const rows = (await env.DB.prepare("SELECT handle, guess, price FROM market_guess WHERE day = ? AND handle != ''").bind(bkkDay()).all()).results
    const by = new Map()
    for (const r of rows) { const a = by.get(r.handle) || []; a.push(score(r.guess, r.price)); by.set(r.handle, a) }
    const board = [...by].filter(([, s]) => s.length >= 3).map(([h, s]) => ({ handle: h, name: handleName(h, lang), n: s.length, score: Math.round(s.reduce((a, b) => a + b, 0) / s.length) }))
      .sort((a, b) => b.score - a.score || b.n - a.n).slice(0, 10)
    return J({ day: bkkDay(), board, guesses: rows.length }, 200, { 'cache-control': 'public, max-age=30' })
  }
  if (p === 'market/here' && m === 'POST') {
    if (!(await take(env, await sender(request, env), 'here'))) return J({ error: 'quota' }, 429)
    const b = await body(request)
    const id = /^[a-z0-9]{8,24}$/.test(String(b.id || '')) ? String(b.id) : null
    const now = new Date(), cut = new Date(now - 3 * 60e3).toISOString()
    if (id) await env.DB.prepare('INSERT INTO market_here (id, at) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET at = excluded.at').bind(id, now.toISOString()).run()
    if (Math.random() < 0.05) await env.DB.prepare('DELETE FROM market_here WHERE at < ?').bind(new Date(now - 3600e3).toISOString()).run()
    const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM market_here WHERE at >= ?').bind(cut).first())?.n || 0
    const g = (await env.DB.prepare('SELECT COUNT(*) AS n FROM market_guess WHERE at >= ?').bind(new Date(now - 3600e3).toISOString()).first())?.n || 0
    return J({ here: n, guesses: g })
  }
  if (p === 'market/share' && m === 'POST') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'sadhu'))) return J({ error: 'quota' }, 429)
    const b = await body(request)
    const what = /^(market|stall:[a-z0-9-]{2,40}|g:\d{1,12}|am:[a-z0-9-]{3,40}\/[a-z0-9]{4,12}|guide|sian)$/.test(String(b.what || '')) ? String(b.what) : null
    const ch = ['line', 'facebook', 'x', 'whatsapp', 'messenger', 'copy', 'native'].includes(b.ch) ? b.ch : null
    if (!what || !ch) return J({ error: 'share' }, 400)
    await env.DB.prepare('INSERT INTO market_share (day, what, ch, n) VALUES (?,?,?,1) ON CONFLICT(day, what, ch) DO UPDATE SET n = n + 1').bind(bkkDay(), what, ch).run()
    return J({ ok: true })
  }
  if (p.startsWith('market/card/') && m === 'PUT') { // nightly cards from amulet-estimate/cards.py, behind the admin key
    const auth = request.headers.get('authorization') || ''
    const ok = env.ADMIN_KEY && auth.startsWith('Basic ') && (() => { try { return atob(auth.slice(6)).split(':').slice(1).join(':') === env.ADMIN_KEY } catch { return false } })()
    const name = p.slice('market/card/'.length)
    if (!ok) return J({ error: 'auth' }, 401)
    if (!/^[a-z0-9-]{1,60}\.jpg$/.test(name)) return J({ error: 'name' }, 400)
    const buf = await request.arrayBuffer()
    if (buf.byteLength > 600e3 || new Uint8Array(buf.slice(0, 3)).join() !== '255,216,255') return J({ error: 'jpeg' }, 400)
    await env.MEDIA.put('market/card/' + name, buf, { httpMetadata: { contentType: 'image/jpeg' }, customMetadata: { at: new Date().toISOString(), alt: String(request.headers.get('x-alt') || '').slice(0, 400) } })
    return J({ ok: true, name })
  }
  if (p === 'market/sadhu' && m === 'POST') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'sadhu'))) return J({ error: 'quota' }, 429)
    const b = await body(request)
    const site = String(b.site || ''), id = String(b.id || '')
    if (!/^[a-z0-9-]{3,40}$/.test(site) || !/^[a-z0-9]{4,12}$/.test(id)) return J({ error: 'which' }, 400)
    const s = await env.DB.prepare("SELECT d FROM site WHERE name = ? AND status = 'live'").bind(site).first()
    let real = false
    try { real = !!s && normalize(JSON.parse(s.d)).amulets.some((x) => x.id === id) } catch {}
    if (!real) return J({ error: 'which' }, 404)
    const r = await env.DB.prepare('INSERT INTO market_sadhu (site, amulet, n) VALUES (?,?,1) ON CONFLICT(site, amulet) DO UPDATE SET n = n + 1 RETURNING n').bind(site, id).first()
    return J({ n: r?.n || 1 })
  }
  return null
}

// ---- the page ---------------------------------------------------------------------------------
// Served whole as HTML, so a crawler or an AI bot reads every stall, price and photo without a
// script; /s/market.mjs then opens trays, plays the game and shares.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const nf = (n) => new Intl.NumberFormat('en').format(Math.round(n))
const B = (n) => '฿' + nf(n)

export const MW = {
  th: { title: 'ตลาดพระ', sub: 'ตลาดพระกลางคืน · ส่อง ทาย ชวนกันมา', lead: 'พระจากร้านใน Mot Dang และราคาจริงจากตลาด: ประมูลที่ปิดแล้วและราคาตั้งออนไลน์ ทุกรายการมีลิงก์ไปดูองค์จริง',
    here: 'อยู่ในตลาด {n} คน', guesses: 'ทายไปแล้ว {n} ครั้งในชั่วโมงนี้', bell: 'ระฆังตลาด · ประมูลเพิ่งปิด', shelf: 'พร้อมเช่า · จากร้านใน Mot Dang', shelfNone: 'ร้านแรกในตลาดยังว่าง ลงพระของคุณได้เลย',
    yours: 'ลงพระของคุณที่นี่', stalls: 'แผงตลาด', stallsHint: 'แตะแผงเพื่อเปิดถาด', auction: 'ประมูล', online: 'ออนไลน์', mid: 'กลาง', sold: 'ขาย {n}', bids: 'เคาะ {n}', card: 'มีบัตร',
    all: 'ทั้งหมด', game: 'ทายราคาค้อน', gameHint: 'พระองค์นี้ปิดประมูลที่ G-Pra ไปแล้ว ทายว่าค้อนลงที่เท่าไร', bidders: '{n} คนแย่งกัน', go: 'เคาะ!', next: 'องค์ต่อไป',
    real: 'ค้อนลงที่', you: 'คุณทาย', crowd: 'คนอื่นทาย (กลาง) จาก {n} คน', first: 'คุณเป็นคนแรกที่ทายองค์นี้', score: 'แม่น {s}%', streak: 'ต่อเนื่อง {n}', board: 'เซียนวันนี้', boardNone: 'ยังไม่มีใครทายครบ 3 องค์วันนี้',
    you_are: 'คุณคือ', sadhu: 'สาธุ', credit: 'ภาพ: {s}', open: 'ดูองค์จริง', guide: 'ราคากลาง', sian: 'ศาลาเซียน', close: 'ปิด', loupe: 'แตะรูปเพื่อส่อง', sound: 'เสียงระฆัง',
    note: 'ราคาประมูลคือราคาปิดจริง ราคาออนไลน์คือราคาตั้งขาย ร้านใน Mot Dang บอกรายละเอียดพระของตัวเอง', band: 'ตลาด ฿{a}–{b}', ask: 'สอบถามราคา',
    share: 'แชร์', shareMarket: 'ชวนเพื่อนมาตลาด', shareStall: 'แชร์แผงนี้', challenge: 'ท้าเพื่อนทาย', copy: 'คัดลอกลิงก์', copied: 'คัดลอกแล้ว', more: 'แอปอื่น',
    shareMarketText: 'มาเดินตลาดพระกลางคืนกัน ส่องพระ ดูราคาประมูลจริง แล้วทายราคาค้อน', shareStallText: 'แผง{n}: ประมูลกลาง {a} · ออนไลน์กลาง {b} · {c} รายการ',
    challengeText: 'ฉันทายราคาค้อนพระองค์นี้แม่น {s}% ลองทายดู: {t}', gameShareText: 'ค้อนลงที่เท่าไร? ทายราคาพระองค์นี้: {t}', amShareText: '{t} · {p} · จากร้าน {s}',
    stallTitle: 'แผง{n} · ราคาตลาด', stallDesc: '{n}: ประมูลที่ปิดแล้ว {na} รายการ กลาง {a} · ออนไลน์ {nl} รายการ กลาง {b} · ช่วงราคา {lo}–{hi} ทุกรายการมีรูปและลิงก์',
    gameTitle: 'ทายราคาค้อน: {t}', gameDesc: 'พระองค์นี้ปิดประมูลที่ G-Pra เมื่อ {d} มีผู้แย่ง {n} คน ทายว่าค้อนลงที่เท่าไร แล้วดูว่าคนอื่นทายเท่าไร',
    altG: 'รูปจากผู้ขายบน G-Pra: {t} ประมูลปิด {d} ที่ {p} หลังเคาะ {b} ครั้ง', altGame: 'รูปจากผู้ขายบน G-Pra: {t} ประมูลปิด {d} มีผู้แย่ง {n} คน ราคาค้อนซ่อนไว้ให้ทาย',
    altL: 'รูปจากผู้ขายบน Lazada: {t} ตั้งราคา {p}{s}', altSold: ' ขายแล้ว {n} ชิ้น', altAm: 'ด้านหน้าของ{t}{x} จากร้าน {s} บน Mot Dang', altStall: 'รูปจากแผง{n}: {t} ราคา {p}',
    altCard: 'การ์ดแชร์ตลาดพระ: {t}', backAll: 'ตลาดทั้งหมด', stallItems: 'ในถาด', jsonFeed: 'ข้อมูลตลาด (JSON)' },
  en: { title: 'Amulet Market', sub: 'The night amulet market · look, guess, bring a friend', lead: 'Amulets from Mot Dang shops, and the market’s prices: closed auctions and online asking prices, each linked to the piece.',
    here: '{n} at the market', guesses: '{n} guesses this hour', bell: 'Market bell · auctions just closed', shelf: 'Available · from Mot Dang shops', shelfNone: 'The first shelf is still empty. Put your amulets here.',
    yours: 'Put your amulets here', stalls: 'Stalls', stallsHint: 'Tap a stall to open its tray', auction: 'auction', online: 'online', mid: 'middle', sold: '{n} sold', bids: '{n} bids', card: 'carded',
    all: 'All', game: 'Guess the hammer', gameHint: 'This amulet closed at auction on G-Pra. Guess where the hammer fell.', bidders: '{n} bidders', go: 'Bid!', next: 'Next amulet',
    real: 'Hammer price', you: 'You guessed', crowd: 'Everyone else (middle) of {n}', first: 'You are the first to guess this one', score: '{s}% close', streak: 'streak {n}', board: 'Today’s sians', boardNone: 'No one has guessed three yet today.',
    you_are: 'You are', sadhu: 'Sadhu', credit: 'Photo: {s}', open: 'See the piece', guide: 'Price guide', sian: 'Sala Sian', close: 'Close', loupe: 'Tap a photo to look closer', sound: 'Bell',
    note: 'Auction prices are hammer prices; online prices are asking prices. Mot Dang shops describe their own amulets.', band: 'market ฿{a}–{b}', ask: 'Ask the price',
    share: 'Share', shareMarket: 'Bring a friend', shareStall: 'Share this stall', challenge: 'Challenge a friend', copy: 'Copy link', copied: 'Copied', more: 'Other apps',
    shareMarketText: 'Come walk the night amulet market: look closer, see real hammer prices, guess the hammer.', shareStallText: '{n} stall: auction middle {a} · online middle {b} · {c} pieces',
    challengeText: 'I guessed this amulet’s hammer price {s}% close. Your turn: {t}', gameShareText: 'Where did the hammer fall? Guess this amulet: {t}', amShareText: '{t} · {p} · from {s}',
    stallTitle: '{n} stall · market prices', stallDesc: '{n}: {na} closed auctions, middle {a} · {nl} online listings, middle {b} · prices {lo}–{hi}, each with its photo and link.',
    gameTitle: 'Guess the hammer: {t}', gameDesc: 'This amulet closed at auction on G-Pra on {d} with {n} bidders. Guess where the hammer fell, then see what everyone else guessed.',
    altG: 'Seller’s photo on G-Pra: {t}; the auction closed {d} at {p} after {b} bids', altGame: 'Seller’s photo on G-Pra: {t}; the auction closed {d} with {n} bidders; the hammer price is hidden for the game',
    altL: 'Seller’s photo on Lazada: {t}, listed at {p}{s}', altSold: ', {n} sold', altAm: 'Front of {t}{x}, from {s} on Mot Dang', altStall: 'Photo from the {n} stall: {t}, {p}',
    altCard: 'Amulet market share card: {t}', backAll: 'The whole market', stallItems: 'In the tray', jsonFeed: 'Market data (JSON)' },
}
const fill = (tpl, v) => Object.entries(v).reduce((s, [a, b]) => s.split('{' + a + '}').join(b), tpl)

/** Alt text for a seller amulet: name, then temple, maker, year, material and kind, then the shop. */
export function amAlt(T, x) {
  const bits = [x.temple, x.maker, x.year, x.mat, x.form].filter(Boolean).join(' · ')
  return fill(T.altAm, { t: x.t, x: bits ? ` (${bits})` : '', s: x.shop })
}
export const itemAlt = (T, x) => (x.src === 'g'
  ? fill(T.altG, { t: x.title, d: x.date, p: B(x.price), b: x.bids })
  : fill(T.altL, { t: x.title, p: B(x.price), s: x.sold ? fill(T.altSold, { n: nf(x.sold) }) : '' }))

const name = (s, lang) => (lang === 'th' ? s.th : s.en)

function bellHtml(F, T) {
  const one = (b) => `<a href="${esc(b.url)}" target="_blank" rel="nofollow noopener">${b.pic ? `<img src="${esc(b.pic)}" alt="${esc(fill(T.altG, { t: b.title, d: b.closed, p: B(b.price), b: b.bids }))}" loading="lazy" referrerpolicy="no-referrer" width="28" height="28">` : ''}<b>${B(b.price)}</b><span>${esc(b.title)}</span><em>${esc(fill(T.bids, { n: b.bids }))}</em></a>`
  return F.bell.length ? `<div class="run">${F.bell.map(one).join('')}<span class="dup" aria-hidden="true">${F.bell.map(one).join('')}</span></div>` : ''
}

function shelfHtml(rows, T) {
  if (!rows.length) return `<p class="empty">${esc(T.shelfNone)}</p>`
  return `<div class="grid" id="shelfgrid">${rows.map((x) => `<article class="am${x.sian ? ' sian' : ''}">
  <button class="ph" data-loupe="${esc(x.pic.replace('-s.webp', '.webp'))}" data-who="${esc(x.shop)}" data-href="${esc(x.url)}" data-alt="${esc(amAlt(T, x))}"><img src="${esc(x.pic)}" alt="${esc(amAlt(T, x))}" loading="lazy" width="300" height="300"></button>
  <a class="nm" href="${esc(x.url)}">${esc(x.t)}</a><b class="pr">${x.p ? (/^\d[\d,.]*$/.test(x.p) ? '฿' + esc(x.p) : esc(x.p)) : esc(T.ask)}</b>
  ${x.band ? `<small class="band">${esc(fill(T.band, { a: nf(x.band[0]), b: nf(x.band[1]) }))}</small>` : ''}
  <p class="shop">${x.sian ? '◆ ' : ''}${esc(x.shop)}</p><p class="row"><button class="sadhu" data-site="${esc(x.site)}" data-id="${esc(x.id)}">🙏 <span>${x.sadhu || ''}</span> ${esc(T.sadhu)}</button>
  <button class="sh" data-share="am:${esc(x.site)}/${esc(x.id)}" data-url="${esc(x.url)}" data-text="${esc(fill(T.amShareText, { t: x.t, p: x.p ? '฿' + x.p : T.ask, s: x.shop }))}" aria-label="${esc(T.share)}">📣</button></p></article>`).join('')}</div>`
}

function stallsHtml(F, T, lang) {
  return F.stalls.map((s) => `<a class="stall" href="/amulets/${esc(s.slug)}${lang === 'en' ? '?hl=en' : ''}" data-k="${esc(s.key)}">
  <span class="awning" aria-hidden="true"></span><span class="sp">${s.pic ? `<img src="${esc(s.pic)}" alt="${esc(fill(T.altStall, { n: name(s, lang), t: s.picFrom?.title || '', p: s.picFrom ? B(s.picFrom.price) : '' }))}" loading="lazy" referrerpolicy="no-referrer" width="170" height="170">` : ''}</span>
  <b>${esc(name(s, lang))}</b>${lang === 'th' ? '' : `<small>${esc(s.th)}</small>`}
  <span class="mids">${s.nA ? `<em class="g">🔨 ${B(s.midA)}</em>` : ''}${s.nL ? `<em class="l">🛒 ${B(s.midL)}</em>` : ''}</span>
  <small class="n">${s.nA ? nf(s.nA) + ' ' + esc(T.auction) : ''}${s.nA && s.nL ? ' · ' : ''}${s.nL ? nf(s.nL) + ' ' + esc(T.online) : ''}</small></a>`).join('')
}

/** One stall's tray as its own section: the stall page, read by people and bots alike. */
function traySection(st, T, lang, origin) {
  const share = fill(T.shareStallText, { n: name(st, lang), a: st.nA ? B(st.midA) : '–', b: st.nL ? B(st.midL) : '–', c: nf(st.nA + st.nL) })
  return `<section class="mksec stallpage" id="stall" data-k="${esc(st.key)}"><p class="crumb"><a href="/amulets${lang === 'en' ? '?hl=en' : ''}">← ${esc(T.backAll)}</a></p>
  <h2>${esc(name(st, lang))}${lang === 'th' ? '' : ` <small>${esc(st.th)}</small>`}</h2>
  <p class="trmids">${st.nA ? `<span class="g">🔨 ${esc(T.auction)} ${esc(T.mid)} <b>${B(st.midA)}</b> · ${nf(st.nA)}</span>` : ''}${st.nL ? `<span class="l">🛒 ${esc(T.online)} ${esc(T.mid)} <b>${B(st.midL)}</b> · ${nf(st.nL)}</span>` : ''}</p>
  <p><button class="btn sh" data-share="stall:${esc(st.slug)}" data-url="${esc(origin)}/amulets/${esc(st.slug)}" data-text="${esc(share)}" data-card="${esc(origin)}/amulets/card/stall-${esc(st.slug)}.jpg">📣 ${esc(T.shareStall)}</button></p>
  <p class="hint">${esc(T.loupe)}</p><div class="tgrid">${st.items.map((x) => `<article class="it ${x.src}">
    ${x.pic ? `<button class="ph" data-loupe="${esc(x.pic)}" data-href="${esc(x.url)}" data-who="${x.src === 'g' ? 'G-Pra' : 'Lazada'}" data-alt="${esc(itemAlt(T, x))}"><img src="${esc(x.pic)}" alt="${esc(itemAlt(T, x))}" loading="lazy" referrerpolicy="no-referrer" width="300" height="300"><i class="cr">${x.src === 'g' ? 'G-Pra' : 'Lazada'}</i></button>` : ''}
    <a href="${esc(x.url)}" target="_blank" rel="nofollow noopener"><b>${B(x.price)}</b><em>${x.src === 'g' ? `${esc(fill(T.bids, { n: x.bids }))} · ${esc(x.date)}${x.card ? ' · ◆' : ''}` : x.sold ? esc(fill(T.sold, { n: nf(x.sold) })) : ''}</em><span>${esc(x.title)}</span></a></article>`).join('')}</div></section>`
}

/** schema.org for the page: the market as a collection, its stalls and the sellers' amulets as lists. */
function ld(F, rows, origin, lang, st) {
  const T = MW[lang] || MW.en
  if (st) {
    return { '@context': 'https://schema.org', '@type': 'CollectionPage', name: fill(T.stallTitle, { n: name(st, lang) }), url: `${origin}/amulets/${st.slug}`, inLanguage: lang,
      isPartOf: { '@type': 'WebSite', name: 'Mot Dang', url: origin },
      mainEntity: { '@type': 'ItemList', numberOfItems: st.items.length, itemListElement: st.items.slice(0, 60).map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: x.url, name: x.title, image: x.pic || undefined })) },
      about: { '@type': 'Product', name: name(st, lang), category: 'Thai Buddhist amulet', image: st.items.find((x) => x.pic)?.pic,
        offers: st.nL ? { '@type': 'AggregateOffer', priceCurrency: 'THB', lowPrice: Math.min(...st.items.filter((x) => x.src === 'l').map((x) => x.price)), highPrice: Math.max(...st.items.filter((x) => x.src === 'l').map((x) => x.price)), offerCount: st.nL } : undefined } }
  }
  return { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${T.title} · Mot Dang`, description: T.lead, url: `${origin}/amulets`, inLanguage: lang,
    hasPart: [
      { '@type': 'ItemList', name: T.stalls, itemListElement: F.stalls.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${origin}/amulets/${s.slug}`, name: name(s, lang) })) },
      { '@type': 'ItemList', name: T.shelf, itemListElement: rows.map((x, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Product', name: x.t, url: x.url, image: x.pic.replace('-s.webp', '.webp'),
        offers: /^\d[\d,.]*$/.test(x.p || '') ? { '@type': 'Offer', price: Number(String(x.p).replace(/[^\d.]/g, '')), priceCurrency: 'THB', seller: { '@type': 'Organization', name: x.shop } } : undefined } })) },
    ] }
}

/** The page. ctx: { stall, game } for a stall page or a guess challenge, else the market's front. */
export function page(lang, nonce, F, rows, origin, ctx = {}) {
  const T = MW[lang] || MW.en
  const st = ctx.stall, gm = ctx.game
  if (gm) F = { ...F, bell: F.bell.filter((b) => b.aid !== gm.aid) } // a challenge's own hammer stays hidden
  const url = st ? `${origin}/amulets/${st.slug}` : gm ? `${origin}/amulets?g=${gm.aid}` : `${origin}/amulets`
  const title = st ? fill(T.stallTitle, { n: name(st, lang) }) : gm ? fill(T.gameTitle, { t: gm.title }) : `${T.title} · ${T.sub}`
  const desc = st ? fill(T.stallDesc, { n: name(st, lang), na: nf(st.nA), a: B(st.midA), nl: nf(st.nL), b: B(st.midL), lo: B(st.lo), hi: B(st.hi) })
    : gm ? fill(T.gameDesc, { d: gm.closed, n: gm.bidders }) : T.lead
  const card = st ? `${origin}/amulets/card/stall-${st.slug}.jpg` : gm ? `${origin}/amulets/card/g-${gm.aid}.jpg` : `${origin}/amulets/card/market.jpg`
  const cardAlt = fill(T.altCard, { t: st ? desc : gm ? fill(T.gameDesc, { d: gm.closed, n: gm.bidders }) + ' ' + gm.title : T.lead })
  const data = { lang, origin, F: { stalls: F.stalls.map(({ picFrom, ...s }) => s), counts: F.counts }, T, handles: { a: HANDLE_A, b: HANDLE_B }, game: gm ? gm.aid : 0, stall: st ? st.key : '' }
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  const alt = lang === 'th' ? 'en' : 'th'
  const here = st ? `/amulets/${st.slug}` : '/amulets'
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)} · Mot Dang</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(url)}${lang === 'en' ? (url.includes('?') ? '&' : '?') + 'hl=en' : ''}">
<link rel="alternate" hreflang="th" href="${esc(origin + here)}"><link rel="alternate" hreflang="en" href="${esc(origin + here)}?hl=en"><link rel="alternate" type="application/json" href="${origin}/amulets.json" title="${esc(T.jsonFeed)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Mot Dang"><meta property="og:url" content="${esc(url)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(card)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(cardAlt)}"><meta property="og:locale" content="${lang === 'th' ? 'th_TH' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(card)}"><meta name="twitter:image:alt" content="${esc(cardAlt)}">
<link rel="icon" href="/s/ant.svg"><link rel="stylesheet" href="/s/market.css"><script type="application/ld+json">${JSON.stringify(ld(F, rows, origin, lang, st)).replace(/</g, '\\u003c')}</script></head>
<body class="mk"><div class="sky" aria-hidden="true">${'<i></i>'.repeat(12)}</div>
<header class="mkhead"><ul class="lanterns" aria-hidden="true">${'<li></li>'.repeat(7)}</ul>
<p class="kick"><a href="/">sites.motdang.net</a> · <a href="${here}${alt === 'en' ? '?hl=en' : '?hl=th'}" hreflang="${alt}">${lang === 'th' ? 'English' : 'ไทย'}</a> · <button id="snd" class="snd" aria-pressed="false">🔔 ${esc(T.sound)}</button></p>
<h1>${esc(T.title)}</h1><p class="sub">${esc(T.sub)}</p><p class="live"><span id="here"></span> <span id="hourg"></span></p>
<p><button class="btn sh" data-share="market" data-url="${origin}/amulets" data-text="${esc(T.shareMarketText)}" data-card="${origin}/amulets/card/market.jpg">📣 ${esc(T.shareMarket)}</button></p>
<div class="bell" aria-label="${esc(T.bell)}"><b>🔔 ${esc(T.bell)}</b><div class="tick" id="tick">${bellHtml(F, T)}</div></div></header>
<main>${st ? traySection(st, T, lang, origin) : ''}
<section class="mksec" id="shelf"><h2>${esc(T.shelf)}</h2>${shelfHtml(rows, T)}<p><a class="btn" href="/make#kind=amulet">${esc(T.yours)} →</a></p></section>
<section class="mksec" id="game"><h2>🔨 ${esc(T.game)}</h2><div class="gamecard" id="gamecard"></div><aside class="board" id="board"></aside></section>
<section class="mksec" id="stalls"><h2>${esc(T.stalls)}</h2><p class="hint">${esc(T.stallsHint)}</p><nav class="lane" id="lane" aria-label="${esc(T.stalls)}">${stallsHtml(F, T, lang)}</nav></section>
<p class="note">${esc(T.note)}</p><nav class="cta"><a class="btn ghost" href="/amulet-price?hl=${lang}">${esc(T.guide)}</a><a class="btn ghost" href="/sian?hl=${lang}">◆ ${esc(T.sian)}</a><a class="btn ghost" href="/amulets.json">{ } ${esc(T.jsonFeed)}</a></nav></main>
<dialog id="tray" class="tray"></dialog><dialog id="look" class="look"></dialog><dialog id="share" class="sharebox"></dialog>
<script type="application/json" id="mkdata">${json}</script>
<script type="module" nonce="${nonce}" src="/s/market.mjs"></script></body></html>`
}

/** The market as open data: stalls with their middles, counts and ranges; the build date. */
export function feedJson(P, origin) {
  const F = front(P)
  return { built: P.built, about: 'Mot Dang amulet market: closed G-Pra auctions (hammer prices) and Lazada listings ฿20–7,000 (asking prices), grouped by kind', url: `${origin}/amulets`,
    counts: F.counts, stalls: F.stalls.map((s) => ({ name_th: s.th, name_en: s.en, url: `${origin}/amulets/${s.slug}`, auctions: s.nA, auction_median_thb: s.midA, listings: s.nL, listing_median_thb: s.midL, low_thb: s.lo, high_thb: s.hi, card: `${origin}/amulets/card/stall-${s.slug}.jpg` })) }
}

export async function route(request, env, path, url, origin, { rand }) {
  const m = /^\/amulets(?:\/([a-z0-9-]{2,40}))?\/?$/.exec(path)
  const card = /^\/amulets\/card\/([a-z0-9-]{1,60})\.jpg$/.exec(path)
  if (card) {
    const obj = await env.MEDIA.get('market/card/' + card[1] + '.jpg')
    if (!obj) return Response.redirect(origin + '/s/card.jpg', 302)
    return new Response(obj.body, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400', 'access-control-allow-origin': '*' } })
  }
  if (path === '/amulets.json') {
    const P = await load(env).catch(() => null)
    return new Response(JSON.stringify(P ? feedJson(P, origin) : { stalls: [] }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' } })
  }
  if (!m) return null
  const al = (request.headers.get('accept-language') || '').slice(0, 2)
  const lang = ['th', 'en'].includes(url.searchParams.get('hl')) ? url.searchParams.get('hl') : al && al !== 'th' ? 'en' : 'th'
  const P = await load(env).catch(() => null)
  const F = P ? front(P) : { stalls: [], bell: [], counts: {} }
  const st = m[1] && P ? stall(P, m[1]) : null
  if (m[1] && !st) return null
  const gid = Number(url.searchParams.get('g')) || 0
  const gm = gid && P ? round(P, Math.random, gid) : null
  const rows = await shelf(env, P, origin, lang).catch((e) => { console.error(e); return [] })
  const nonce = rand(16)
  return new Response(page(lang, nonce, F, rows, origin, { stall: st, game: gm && gm.aid === gid ? gm : null }), { headers: {
    'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'content-language': lang,
    'content-security-policy': `default-src 'self'; img-src 'self' data: blob: https://www.g-pra.com https://img.lazcdn.com; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'`,
  } })
}
