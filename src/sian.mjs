// sian.mjs — ศาลาเซียน · Sala Sian, the amulet sellers' velvet rope (NaN 2026-10-20: "a velvet rope
// space with lots of nice benefits. Shoupify the pricing. This one should be mid-high range for
// Chiang Mai locals."). A Gold year with more for an amulet page: every comparable in the price
// guide, the market card on each amulet, 500 amulets, the Sala Sian mark, a place on the wall.
//
//   /sian    the rope: this month's price and seats, what is inside, the members
//
// Ten seats a month. On the 1st the price steps on last month's seats, Shoup's way: 80% or more
// taken, up a rung; under 60%, down a rung (deals.step).

import { step } from './deals.mjs'
import * as gold from './gold.mjs'
import { GUIDE_CSS } from '../public/s/amprice-ui.mjs'
import { shareLinks } from './amprice.mjs'

export const LADDER = [5999, 7999, 9999, 12999, 15999] // baht a year
export const START = 9999
export const SEATS = 10 // a month

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const nf = (n) => new Intl.NumberFormat('en').format(n)
const bkkMonth = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 7)
const nextMonth = (m) => { const [y, mo] = m.split('-').map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}` }

/** Is this page in Sala Sian today? */
export const isSian = (s) => gold.isGold(s) && s?.plan === 'sian'

// a Bangkok month as UTC bounds, for pay.updated
const bounds = (m) => [new Date(Date.parse(`${m}-01T00:00:00+07:00`)).toISOString(), new Date(Date.parse(`${nextMonth(m)}-01T00:00:00+07:00`)).toISOString()]
// the seats a month counts: paid in it, and its own holds: open from the last two days, a slip sent in the last seven
const HELD = "plan = 'sian' AND ((status = 'paid' AND updated >= ? AND updated < ?) OR (seat_month = ? AND ((status = 'slip' AND updated >= ?) OR (status = 'open' AND created >= ?))))"
const heldArgs = (month, t = Date.now()) => [...bounds(month), month, new Date(t - 7 * 864e5).toISOString(), new Date(t - 2 * 864e5).toISOString()]
async function taken(env, month) {
  return (await env.DB.prepare(`SELECT COUNT(*) AS n FROM pay WHERE ${HELD}`).bind(...heldArgs(month)).first())?.n || 0
}
// what a month sold, for the step: paid only
async function paid(env, month) {
  const [a, b] = bounds(month)
  return (await env.DB.prepare("SELECT COUNT(*) AS n FROM pay WHERE plan = 'sian' AND status = 'paid' AND updated >= ? AND updated < ?").bind(a, b).first())?.n || 0
}

/** This month's price and seats left; a new month steps the price from the one before. */
export async function thisMonth(env, t = Date.now()) {
  const month = bkkMonth(t)
  const row = await env.DB.prepare('SELECT * FROM sian_month WHERE month = ?').bind(month).first()
  if (row) return { ...row, left: Math.max(0, row.seats - (await taken(env, month))) }
  const last = await env.DB.prepare('SELECT * FROM sian_month WHERE month < ? ORDER BY month DESC LIMIT 1').bind(month).first()
  let price = START
  if (last) {
    price = step(LADDER, last.price, (await paid(env, last.month)) / last.seats)
    for (let m = nextMonth(last.month); m < month; m = nextMonth(m)) price = step(LADDER, price, 0) // months nobody opened
  }
  await env.DB.prepare('INSERT OR IGNORE INTO sian_month (month, price, seats) VALUES (?,?,?)').bind(month, price, SEATS).run()
  return { month, price, seats: SEATS, left: SEATS - (await taken(env, month)) }
}

/** The plan gold.start takes: a year at this month's price. */
export async function plan(env) {
  const m = await thisMonth(env)
  return { plan: 'sian', baht: m.price, months: 12, hotel: false, left: m.left }
}

/**
 * A seat and its payment: the payment is made, then the month's held seats are read in the order
 * they were made; one past the seats goes again and the month answers full. Two pages asking for
 * the last seat at once both make a payment; the later one is removed.
 */
export async function reserve(env, siteId, rand) {
  const pl = await plan(env)
  if (pl.left <= 0) return { full: true }
  const month = bkkMonth(), args = heldArgs(month)
  // an open payment of this page's that no longer holds a seat goes first, so gold.start makes one that does
  await env.DB.prepare("DELETE FROM pay WHERE site_id = ? AND plan = 'sian' AND status = 'open' AND (created < ? OR COALESCE(seat_month, '') != ?)").bind(siteId, args[4], month).run()
  const r = await gold.start(env, siteId, rand, pl)
  await env.DB.prepare("UPDATE pay SET seat_month = ? WHERE site_id = ? AND plan = 'sian' AND status = 'open' AND seat_month IS NULL").bind(month, siteId).run()
  // insertion order: what an earlier request read is the start of what a later one reads
  const ids = (await env.DB.prepare(`SELECT id, site_id FROM pay WHERE ${HELD} ORDER BY rowid`).bind(...args).all()).results
  const mine = ids.findIndex((x) => x.site_id === siteId)
  const seats = (await env.DB.prepare('SELECT seats FROM sian_month WHERE month = ?').bind(month).first())?.seats || SEATS
  if (mine < 0 || mine >= seats) {
    await env.DB.prepare("DELETE FROM pay WHERE site_id = ? AND plan = 'sian' AND status = 'open'").bind(siteId).run()
    return { full: true }
  }
  return { ...r, left: Math.max(0, seats - ids.length) }
}

/** Members on the wall: live Sala Sian pages, newest first. */
async function members(env) {
  const today = new Date().toISOString().slice(0, 10)
  const rows = (await env.DB.prepare("SELECT name, d, gold_until FROM site WHERE plan = 'sian' AND tier = 'gold' AND status = 'live' AND (gold_until IS NULL OR gold_until >= ?) ORDER BY updated DESC LIMIT 200").bind(today).all()).results
  return rows.map((r) => {
    let d = {}
    try { d = JSON.parse(r.d) } catch {}
    const ams = Array.isArray(d.amulets) ? d.amulets : []
    return { name: r.name, title: d.name || r.name, cover: d.cover || (ams.find((x) => x.photos?.length)?.photos[0]) || '', open: ams.filter((x) => (x.status || 'open') === 'open').length }
  })
}

const W = {
  th: { title: 'ศาลาเซียน', kick: 'สำหรับร้านพระเครื่องบน Mot Dang', lead: 'ห้องรับรองของคนขายพระ: ราคากลางเต็ม ทุกรายการที่ใกล้เคียง พร้อมลิงก์ ราคาตลาดใต้พระทุกองค์ และที่บนกำแพงเซียน',
    price: '฿{p} ต่อปี', left: 'เหลือ {n} จาก {s} ที่ในเดือนนี้', full: 'เดือนนี้เต็มแล้ว เปิดใหม่วันที่ 1',
    inside: 'ในศาลา', join: 'เข้าศาลา', joinHow: 'เปิดหน้าเว็บพระของคุณ แท็บ "ทอง" แล้วเลือกศาลาเซียน', make: 'ยังไม่มีหน้า? ทำหน้าพระ', wall: 'เซียนในศาลา', open: 'พร้อมเช่า {n} องค์', try: 'ลองราคากลาง',
    b: [['ราคากลางเต็ม', 'ทุกรายการประมูลที่ปิดแล้วและราคาออนไลน์ที่ใกล้เคียง พร้อมลิงก์ไปดูองค์จริง ปุ่ม "ใช้ราคานี้" ในทุกองค์'],
      ['ราคาตลาดใต้พระทุกองค์', 'ลูกค้าเห็นราคาประมูลและราคาออนไลน์ใต้ราคาของคุณ เปิดหรือปิดได้'],
      ['ลงพระได้ 500 องค์', 'หน้าทองลงได้ 120 หน้าฟรี 6'],
      ['ตราศาลาเซียน', 'บนหน้าร้านและหน้าพระทุกองค์'],
      ['ที่บนกำแพง', 'ร้านของคุณอยู่บนหน้านี้ ให้คนหาพระเห็น'],
      ['ทุกอย่างของทอง', 'กล้องพระ ตัดพื้นหลัง ถ่ายหน้า-หลังเป็นองค์เดียว 360 รูป โดเมนของคุณเอง']] },
  en: { title: 'Sala Sian', kick: 'For amulet sellers on Mot Dang', lead: 'The amulet sellers’ room: the full price guide with every close sale linked, market prices under each amulet, and a place on the wall.',
    price: '฿{p} a year', left: '{n} of {s} seats left this month', full: 'Full this month. Seats open on the 1st.',
    inside: 'Inside', join: 'Join', joinHow: 'Open your amulet page’s builder, the Gold tab, and choose Sala Sian.', make: 'No page yet? Make an amulet page', wall: 'In the sala', open: '{n} available', try: 'Try the price guide',
    b: [['The full price guide', 'Every closed auction and online listing close to your amulet, each linked to the piece, and "Use this price" on every amulet.'],
      ['Market prices under each amulet', 'Buyers see auction and online prices under yours. On or off, your call.'],
      ['500 amulets', 'Gold shows 120, Free 6.'],
      ['The Sala Sian mark', 'On your page and on every amulet.'],
      ['A place on the wall', 'Your shop on this page, where people come looking.'],
      ['Everything in Gold', 'The amulet camera with backgrounds cut, front and back as one amulet, 360 photos, your own address.']] },
}

export function page(env, lang, month, list, nonce) {
  const T = W[lang] || W.en
  const card = (m) => `<a class="mem" href="/${esc(m.name)}">${m.cover ? `<img src="/img/${esc(m.cover)}-s.webp" alt="${esc((lang === 'th' ? 'รูปหน้าร้าน ' : 'Cover photo of ') + m.title + (lang === 'th' ? ` ร้านพระในศาลาเซียน มี ${m.open} องค์พร้อมเช่า` : `, an amulet shop in Sala Sian with ${m.open} available`))}" loading="lazy">` : '<span class="noimg" aria-hidden="true">🪷</span>'}<b>${esc(m.title)}</b><small>${esc(T.open.replace('{n}', m.open))}</small></a>`
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(T.title)} · Mot Dang</title><meta name="description" content="${esc(T.lead)}"><meta property="og:title" content="${esc(T.title)}"><meta property="og:description" content="${esc(T.lead)}">
<meta property="og:image" content="https://sites.motdang.net/amulets/card/sian.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(lang === 'th' ? 'การ์ดศาลาเซียน: ชื่อศาลาเซียนตัวทองบนกำมะหยี่สีแดงเข้ม เชือกกำมะหยี่แดงขึงระหว่างเสาทองเหลืองสองต้น ใต้ชื่อเขียนว่า ห้องรับรองของคนขายพระ' : 'Sala Sian card: the name in gold on deep red velvet, a red velvet rope between two brass posts, and the line: the amulet sellers’ room')}">
<meta property="og:type" content="website"><meta property="og:url" content="https://sites.motdang.net/sian"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="https://sites.motdang.net/sian${lang === 'th' ? '' : '?hl=en'}"><link rel="icon" href="/s/ant.svg"><link rel="stylesheet" href="/s/amprice.css"><link rel="stylesheet" href="/s/sian.css"><style>${GUIDE_CSS}</style></head>
<body class="sian"><header class="rope"><p class="kick"><a href="/">sites.motdang.net</a> · <a href="?hl=${lang === 'th' ? 'en' : 'th'}">${lang === 'th' ? 'English' : 'ไทย'}</a></p>
<p class="k2">${esc(T.kick)}</p><h1>${esc(T.title)}</h1><p class="lead">${esc(T.lead)}</p>
<div class="ticket"><p class="pr">${esc(T.price.replace('{p}', nf(month.price)))}</p><p class="seats">${esc(month.left > 0 ? T.left.replace('{n}', month.left).replace('{s}', month.seats) : T.full)}</p>
<p class="how">${esc(T.joinHow)}</p><nav class="cta" style="margin:0 0 10px">${shareLinks(lang === 'th' ? 'ศาลาเซียน ห้องรับรองของคนขายพระบน Mot Dang' : 'Sala Sian, the amulet sellers’ room on Mot Dang', 'https://sites.motdang.net/sian')}</nav><nav class="cta"><a class="btn" href="/make">${esc(T.join)}</a><a class="btn ghost" href="/make#kind=amulet">${esc(T.make)}</a></nav></div></header>
<main><h2>${esc(T.inside)}</h2><ul class="perks">${T.b.map(([h, p]) => `<li><b>${esc(h)}</b><span>${esc(p)}</span></li>`).join('')}</ul>
<p class="cta"><a class="btn" href="/amulets?hl=${lang}">${lang === 'th' ? 'ตลาดพระ' : 'Amulet market'} →</a><a class="btn ghost" href="/amulet-price?hl=${lang}">${esc(T.try)} →</a></p>
${list.length ? `<h2>${esc(T.wall)}</h2><div class="wall">${list.map(card).join('')}</div>` : ''}</main></body></html>`
}

export async function route(request, env, path, url, { html }) {
  if (path !== '/sian' && path !== '/sian/') return null
  const al = (request.headers.get('accept-language') || '').slice(0, 2)
  const lang = ['th', 'en'].includes(url.searchParams.get('hl')) ? url.searchParams.get('hl') : al === 'th' ? 'th' : al ? 'en' : 'th'
  const [month, list] = await Promise.all([thisMonth(env), members(env)])
  return html(page(env, lang, month, list), 200)
}
