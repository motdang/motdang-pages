// amprice.mjs — the amulet price guide (NaN 2026-10-20: "a zEstimate, but for thai amulets").
// Two sources, built daily by ../amulet-estimate (export_web.py) into R2 data/amulet-prices.json:
//   G-Pra auctions that closed with a winner (G-Pra issues its card above ฿5,000 unless the winner waives it)
//   Lazada listings ฿20–7,000, cleaned (asking prices)
// One vocabulary for both: the file carries its concept and kind patterns; each comparable carries
// the concept ids, kind and year read from its title, so only the query is read here.
//
//   GET /api/amulet-price?t=&temple=&maker=&year=&mat=&mould=&form=&cert=   (x-edit optional: Sala Sian gets every comparable)
//   GET /amulet-price                                                       anyone types a name

import { GUIDE_WORDS, GUIDE_CSS } from '../public/s/amprice-ui.mjs'

const KEY = 'data/amulet-prices.json'
const TTL = 3600e3
let cache = null // { at, data, rx }

/** The data, from R2, compiled once an hour per isolate. */
export async function load(env) {
  if (cache && Date.now() - cache.at < TTL) return cache
  const obj = await env.MEDIA.get(KEY)
  if (!obj) return null
  cache = prepare(await obj.json())
  return cache
}

/** Compile the patterns and turn the row arrays into objects. Exported for tests. */
export function prepare(data) {
  const rx = data.concepts.map(([g, lab, th, en]) => ({ g, lab, th: new RegExp(th), en: new RegExp(en, 'i') }))
  const kinds = data.kinds.map(([k, pats]) => ({ k, pats: pats.map((p) => new RegExp(p, 'i')) }))
  const rows = (src) => src.rows.map((r) => { const o = Object.fromEntries(src.fields.map((f, i) => [f, r[i]])); o.tl = thd(o.title).toLowerCase(); return o })
  return { at: Date.now(), built: data.built, crawled: data.lazada.crawled, rx, kinds, gpra: rows(data.gpra), lazada: rows(data.lazada) }
}

const TH_DIGITS = { '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9' }
const thd = (s) => String(s || '').replace(/[๐-๙]/g, (c) => TH_DIGITS[c])
const MONK = /^(หลวงพ่อ|หลวงปู่|หลวงตา|พ่อท่าน|ครูบา|อาจารย์|เจ้าคุณ|ท่าน|ลพ\.|ลป\.|luang\s*p(h?o|or|u)r?|lp|kruba|ajarn)\s*/i
const core = (s, re) => thd(s).replace(re, '').trim()

function yearBE(s) {
  const t = thd(s)
  const m = /(?:ปี|พ\.?ศ\.?|BE|B\.E\.)\s*(\d{2,4})/i.exec(t) || /\b(2[34]\d\d|25[0-6]\d|19\d\d|20[0-2]\d)\b/.exec(t)
  if (!m) return 0
  let y = Number(m[1])
  if (y < 100) y += y > 69 ? 2400 : 2500
  if (y < 2100) y += 543 // a CE year
  return y >= 2300 && y <= 2575 ? y : 0
}

/** What the Worker reads from an amulet's fields: concept ids, kind, year, and the names to look for in titles. */
export function query(P, q, labels = {}) {
  const text = thd([q.t, q.temple, q.maker, q.mould, labels.mat, labels.form, q.cert].filter(Boolean).join(' '))
  const c = []
  P.rx.forEach((x, i) => { if (x.th.test(text) || x.en.test(text)) c.push(i) })
  const named = thd([q.t, q.temple, q.maker].join(' '))
  const kind = (P.kinds.find((k) => k.pats.some((p) => p.test(named))) || {}).k || ''
  const maker = core(q.maker, MONK), temple = core(q.temple, /^(วัด|ว\.|wat)\s*/i), mould = core(q.mould, /^พิมพ์\s*/)
  return { c, kind, year: yearBE(q.year) || yearBE(q.t), maker: maker.length >= 2 ? maker : '', temple: temple.length >= 2 ? temple : '', mould: mould.length >= 2 ? mould : '', card: !!q.cert }
}

const W = { subject: 3, material: 2, form: 1, function: 0.3, claim: 0 }

/** How close a comparable is to the query; 0 when the kinds differ. */
export function score(P, Q, r) {
  if (Q.kind && Q.kind !== r.kind) return 0
  let s = Q.kind && Q.kind === r.kind ? 4 : 0
  const have = new Set(r.c)
  for (const i of Q.c) if (have.has(i)) s += W[P.rx[i].g] ?? 0
  // a different material or form, both named, is another piece: a coin is not a powder tablet
  for (const [g, pen] of [['material', 2], ['form', 1.5]]) {
    const q = Q.c.filter((i) => P.rx[i].g === g), c = r.c.filter((i) => P.rx[i].g === g)
    if (q.length && c.length && !q.some((i) => have.has(i))) s -= pen
  }
  const title = r.tl ?? thd(r.title).toLowerCase()
  if (Q.maker && title.includes(Q.maker.toLowerCase())) s += 4
  if (Q.temple && title.includes(Q.temple.toLowerCase())) s += 3
  if (Q.mould && title.includes(Q.mould.toLowerCase())) s += 1.5
  if (Q.year && r.year) { const d = Math.abs(Q.year - r.year); s += d <= 2 ? 1.5 : d <= 10 ? 0.5 : d > 30 ? -1 : 0 }
  return s
}

function wq(pairs, q) { // weighted quantile of [value, weight] sorted by value
  const tot = pairs.reduce((a, p) => a + p[1], 0)
  let run = 0
  for (const [v, w] of pairs) { run += w; if (run >= q * tot) return v }
  return pairs[pairs.length - 1][0]
}
const round = (n) => (n >= 1000 ? Math.round(n / 50) * 50 : n >= 100 ? Math.round(n / 10) * 10 : Math.round(n))

function band(comps) {
  const pairs = comps.map(([s, r]) => [Math.log(r.price), s]).sort((a, b) => a[0] - b[0])
  return { low: round(Math.exp(wq(pairs, 0.25))), mid: round(Math.exp(wq(pairs, 0.5))), high: round(Math.exp(wq(pairs, 0.75))) }
}

/** The guide for one amulet. full: every comparable (Sala Sian); otherwise three of each. */
export function guide(P, q, { labels, full = false } = {}) {
  const Q = query(P, q, labels)
  const pick = (rows, min, k) => rows.map((r) => [score(P, Q, r), r]).filter(([s]) => s >= min).sort((a, b) => b[0] - a[0] || b[1].sold - a[1].sold).slice(0, k)
  let gp = pick(P.gpra.filter((r) => r.card), 4, 15)
  let carded = true
  if (gp.length < 3) { gp = pick(P.gpra, 4, 15); carded = false }
  const lz = pick(P.lazada, Q.kind || Q.maker || Q.temple ? 4 : 3, 40)
  const show = full ? 12 : 3
  const out = { q: Q, built: P.built, crawled: P.crawled, full }
  if (gp.length) {
    out.auction = { n: gp.length, carded, ...band(gp),
      comps: gp.slice(0, show).map(([, r]) => ({ price: r.price, bids: r.bids, bidders: r.bidders, closed: r.closed, card: !!r.card, title: r.title, url: `https://www.g-pra.com/auction/view.php?aid=${r.aid}` })) }
  }
  if (lz.length) {
    const b = band(lz)
    const near = (v) => lz.slice().sort((a, c) => Math.abs(Math.log(a[1].price / v)) - Math.abs(Math.log(c[1].price / v)) || c[1].img - a[1].img)[0][1]
    const top = lz.slice().sort((a, c) => c[1].sold - a[1].sold)[0][1]
    const L = (r) => ({ price: r.price, sold: r.sold, title: r.title, url: `https://www.lazada.co.th/products/pdp-i${r.pdp}.html` })
    out.online = { n: lz.length, ...b, median: L(near(b.mid)), best: top.sold ? L(top) : null, comps: full ? lz.slice(0, show).map(([, r]) => L(r)) : [] }
  }
  // a carded piece, or a famous kind, is priced from auctions only: online asking prices are another market
  out.suggest = out.auction && out.auction.n >= 3 ? out.auction.mid : out.online && !Q.card && !Q.kind ? out.online.mid : null
  out.confidence = !out.suggest ? 'none' : out.auction && out.auction.n >= 8 ? 'high' : out.auction && out.auction.n >= 3 ? 'medium' : 'low'
  return out
}

// ---- the public page --------------------------------------------------------------------------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function lookupPage(lang, nonce, built) {
  const T = GUIDE_WORDS[lang] || GUIDE_WORDS.en
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(T.title)} · Mot Dang</title><meta name="description" content="${esc(T.lead)}">
<meta property="og:title" content="${esc(T.title)}"><meta property="og:description" content="${esc(T.lead)}"><meta property="og:image" content="https://sites.motdang.net/s/card.jpg">
<link rel="icon" href="/s/ant.svg"><link rel="stylesheet" href="/s/amprice.css"><style>${GUIDE_CSS}</style></head>
<body class="apg"><main><p class="kick"><a href="/">sites.motdang.net</a> · <a href="?hl=${lang === 'th' ? 'en' : 'th'}">${lang === 'th' ? 'English' : 'ไทย'}</a></p>
<h1>${esc(T.title)}</h1><p class="lead">${esc(T.lead)}</p>
<form id="apf" class="apf"><input id="apq" name="t" maxlength="160" autocomplete="off" placeholder="${esc(T.ph)}" aria-label="${esc(T.title)}"><button>${esc(T.go)}</button></form>
<div class="chips">${['สมเด็จวัดระฆัง', 'หลวงปู่ทวด วัดช้างให้', 'หลวงพ่อคูณ', 'หลวงปู่ทิม', 'นางกวัก', 'ท้าวเวสสุวรรณ', 'พญาเต่าเรือน', 'ตะกรุด'].map((x) => `<button type="button" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>
<div id="apout" class="apout" aria-live="polite"></div>
${built ? `<p class="note">${esc(T.updated.replace('{d}', built.slice(0, 10)))}</p>` : ''}
<nav class="cta"><a class="btn" href="/make#kind=amulet">${esc(T.make)}</a><a class="btn ghost" href="/sian">${esc(T.sian)}</a></nav></main>
<script type="module" nonce="${nonce}">import { drawGuide } from '/s/amprice-ui.mjs'
const out = document.getElementById('apout'), qi = document.getElementById('apq'), lang = ${JSON.stringify(lang)}
async function run(t) { if (!t.trim()) return; out.innerHTML = '<p class="wait">…</p>'; history.replaceState(null, '', '?q=' + encodeURIComponent(t) + '&hl=' + lang)
  const g = await fetch('/api/amulet-price?t=' + encodeURIComponent(t)).then((r) => r.json()).catch(() => null); out.innerHTML = drawGuide(g, lang) }
document.getElementById('apf').onsubmit = (e) => { e.preventDefault(); run(qi.value) }
document.querySelectorAll('.chips button').forEach((b) => b.onclick = () => { qi.value = b.dataset.q; run(b.dataset.q) })
const first = new URLSearchParams(location.search).get('q'); if (first) { qi.value = first; run(first) }</script></body></html>`
}
