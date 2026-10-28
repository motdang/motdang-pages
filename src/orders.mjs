// orders.mjs — orders from a page's shop and downloads (Nan 2026-10-26). The server prices every order from the
// page's saved data; the browser sends only what was picked and who is buying. The money goes from the buyer's bank
// to the maker's PromptPay (d.pay.pp): Mot Dang draws the QR with a satang tail that tells one order from another,
// and the maker says Paid or Not paid. SlipOK reads slips for Mot Dang's own account, so a slip a buyer sends to a
// maker is a picture for the maker to look at, not proof.

import { rasterType } from './slipfile.mjs'
import { amount, campsNow } from '../public/s/extras.mjs'
import { optsOf, prCap, dlForSale, PR_MAX } from '../public/s/store.mjs'
import { PAGE_LANGS } from '../public/s/words.mjs'
import { formatAmount } from './promptpay.mjs'
import { check } from './msg.mjs'
import { validEmail } from './customers.mjs'
import { isGold } from './gold.mjs'
import { dlKey } from './dls.mjs'
import { orderLink } from './osign.mjs'
import * as shipjob from './shipjob.mjs'
import * as omail from './omail.mjs'

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n)
const MAX_SATANG = 100000000 // a price or a shipping fee past 1,000,000 baht is not a price: it is a typo
const sat = (p) => Math.min(MAX_SATANG, Math.round(amount(p) * 100))

/** Satang as the baht a bank shows: 45037 → '450.37'. */
export const baht = (n) => formatAmount(n)
export const refOf = (id) => 'OR' + String(id).slice(0, 6).toUpperCase()
export const linesOf = (o) => { try { const l = JSON.parse(o.lines); return Array.isArray(l) ? l : [] } catch { return [] } }
export const hasGoods = (lines) => lines.some((l) => l.k === 'p')

/** A discount code with a campaign of the same code is good only while that campaign runs. */
function codeLive(d, code, now) {
  const same = d.camps.filter((c) => c.code && c.code.toLowerCase() === code.toLowerCase())
  return !same.length || campsNow(same, d.hours.tz, now).length > 0
}

/**
 * What an order costs, from the saved page `d`. b = { lines: [{ k: 'p' | 'd', id, opt: [], q }], cc, code }.
 * strict: a parcel needs a country (the order itself); otherwise Thailand is assumed (a quote on the way to the form).
 * { lines, sub, disc, delivery, base, grams, goods, cc, mot, code } in satang, or { error }.
 */
export function quote(d, gold, b = {}, { strict = false, now = Date.now() } = {}) {
  if (!d.pay.pp) return { error: 'nopay' }
  const raw = Array.isArray(b.lines) ? b.lines.slice(0, 60) : []
  if (!raw.length) return { error: 'empty' }
  const prods = d.products.slice(0, prCap(gold))
  const lines = [], seen = new Map(), perProduct = new Map()
  for (const r of raw) {
    const id = String(r?.id || r?.dl || '').slice(0, 12)
    // a line says which it is (k: 'p' or 'd'); without, a product's id and then a download's id are looked for
    const k = r?.k === 'p' || r?.k === 'd' ? r.k : d.products.some((y) => y.id === id) ? 'p' : d.dls.some((y) => y.id === id) ? 'd' : ''
    if (!k) return { error: 'item' }
    if (k === 'd') {
      if (!gold) return { error: 'gold' }
      const x = d.dls.find((y) => y.id === id)
      if (!x || !dlForSale(x, gold) || sat(x.p) >= MAX_SATANG) return { error: 'item' }
      if (!seen.has('d:' + id)) { seen.set('d:' + id, true); lines.push({ k, id, t: x.t, opt: [], q: 1, u: sat(x.p), g: 0 }) }
      continue
    }
    const x = prods.find((y) => y.id === id)
    if (!x || x.status !== 'open' || !(amount(x.p) > 0) || sat(x.p) >= MAX_SATANG) return { error: 'item' }
    let opt = []
    const groups = gold ? optsOf(x.opts) : []
    if (groups.length) {
      opt = (Array.isArray(r.opt) ? r.opt : []).map((v) => String(v))
      if (opt.length !== groups.length || !groups.every((g, i) => g.v.includes(opt[i]))) return { error: 'opt' }
    }
    const q = Math.min(gold ? PR_MAX.qty : PR_MAX.qtyFree, Math.max(1, Math.floor(Number(r.q)) || 1))
    const key = 'p:' + id + '|' + opt.join('\u0001')
    const at = seen.get(key)
    if (at !== undefined) lines[at].q = Math.min(gold ? PR_MAX.qty : PR_MAX.qtyFree, lines[at].q + q)
    else { seen.set(key, lines.length); lines.push({ k, id, t: x.t, opt, q, u: sat(x.p), g: x.g }) }
    perProduct.set(id, (perProduct.get(id) || 0) + q)
    if (gold && x.stock !== null && perProduct.get(id) > x.stock) return { error: 'stock' }
  }
  if (lines.length > (gold ? PR_MAX.cart : 1)) return { error: 'lines' }
  const sub = lines.reduce((a, l) => a + l.u * l.q, 0)
  let disc = 0, code = ''
  const given = str(b.code, 24)
  if (given) {
    if (!(gold && d.disc.code && d.disc.off > 0 && given.toLowerCase() === d.disc.code.toLowerCase() && codeLive(d, d.disc.code, now))) return { error: 'code' }
    code = d.disc.code
    disc = Math.floor(sub * d.disc.off / 100)
  }
  const goods = hasGoods(lines)
  let cc = String(b.cc || '').toUpperCase()
  let delivery = 0
  if (goods) {
    if (!/^[A-Z]{2}$/.test(cc)) { if (strict) return { error: 'cc' }; cc = 'TH' }
    if (cc !== 'TH' && !(amount(d.ship.world) > 0)) return { error: 'abroad' }
    delivery = sat(cc === 'TH' ? d.ship.th : d.ship.world)
    if (sat(d.ship.free) > 0 && sub - disc >= sat(d.ship.free)) delivery = 0
  } else cc = ''
  const grams = lines.reduce((a, l) => a + (l.g || 0) * l.q, 0)
  return { lines, sub, disc, delivery, base: sub - disc + delivery, grams, goods, cc, mot: !!(gold && goods && d.ship.mot), code }
}

/** One quote for the cart's total, as the numbers the buyer's screen shows (baht). */
export const shown = (q) => ({ lines: q.lines.map((l) => ({ ...l, u: l.u / 100 })), sub: q.sub / 100, disc: q.disc / 100, delivery: q.delivery / 100, goods: q.goods, mot: q.mot, total: q.base / 100 })

/**
 * The buyer's order, saved. b adds name, reach (phone or LINE), email, addr, cc, note, lang to quote()'s.
 * { ok, id, total, link } or { error }.
 */
export async function create(env, s, d, b, who, origin, deps) {
  const gold = isGold(s)
  const q = quote(d, gold, b, { strict: true })
  if (q.error) return q
  const name = str(b.name, 80), reach = str(b.reach, 120), addr = str(b.addr, 400), note = str(b.note, 400)
  const email = validEmail(b.email)
  const hasDl = q.lines.some((l) => l.k === 'd')
  if (!name) return { error: 'name' }
  if (!reach && !email) return { error: 'reach' }
  if (str(b.email, 254) && !email) return { error: 'email' }
  if (hasDl && !email) return { error: 'email' }
  if (q.goods && !addr) return { error: 'addr' }
  if (check({ name, reach, body: `${addr}\n${note}` }) !== 'ok') return { error: 'held' }
  for (const l of q.lines) if (l.k === 'd' && !(await env.MEDIA.head(dlKey(s.id, l.id)))) return { error: 'item' }
  // a satang tail no other waiting order of this page has, so a payment of this exact amount is this order's
  const used = new Set((await env.DB.prepare("SELECT tail FROM orders WHERE site_id = ? AND status IN ('new','slip','no')").bind(s.id).all()).results.map((r) => r.tail))
  let tail = 1 + Math.floor(Math.random() * 99)
  for (let i = 0; i < 99 && used.has(tail); i++) tail = (tail % 99) + 1
  const id = deps.rand(14)
  const lang = PAGE_LANGS[b.lang] ? b.lang : s.lang
  await env.DB.prepare('INSERT INTO orders (id, site_id, at, status, lang, lines, name, reach, email, addr, cc, note, code, sub, disc, delivery, tail, total, grams, mot, sender) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, s.id, new Date().toISOString(), 'new', lang, JSON.stringify(q.lines), name, reach, email, addr, q.cc, note, q.code, q.sub, q.disc, q.delivery, tail, q.base + tail, q.grams, q.mot ? 1 : 0, String(who).slice(0, 16)).run()
  const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
  const link = await orderLink(env, origin, id, deps.sha)
  deps.later(omail.created(env, s, d, o, link, origin))
  return { ok: true, id, total: baht(o.total), link }
}

/** Post it home (post.mjs): a visitor's home address for work the page finishes after they leave. One line, the page's
 *  own postage for the country; the maker presses Paid when the postage is paid (Mot Dang then opens a parcel job when
 *  the page ships with it), and Shipped with the tracking number. */
export async function postHome(env, s, d, b, who, origin, deps) {
  if (!isGold(s) || !d.post.on) return { error: 'item' }
  const name = str(b.name, 80), reach = str(b.reach, 120), addr = str(b.addr, 400), note = str(b.note, 400)
  const email = validEmail(b.email)
  const cc = String(b.cc || '').toUpperCase()
  if (!name) return { error: 'name' }
  if (!email) return { error: 'email' }
  if (addr.length < 8) return { error: 'addr' }
  if (!/^[A-Z]{2}$/.test(cc)) return { error: 'cc' }
  if (check({ name, reach, body: `${addr}\n${note}` }) !== 'ok') return { error: 'held' }
  const delivery = sat(cc === 'TH' ? d.ship.th : d.ship.world)
  const tail = delivery ? 1 + Math.floor(Math.random() * 99) : 0
  const lines = [{ k: 'p', id: 'post', t: note ? `${POST_LINE}: ${note}` : POST_LINE, opt: [], q: 1, u: 0, g: 0 }]
  const id = deps.rand(14)
  const lang = PAGE_LANGS[b.lang] ? b.lang : s.lang
  await env.DB.prepare('INSERT INTO orders (id, site_id, at, status, lang, lines, name, reach, email, addr, cc, note, code, sub, disc, delivery, tail, total, grams, mot, sender) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, s.id, new Date().toISOString(), 'new', lang, JSON.stringify(lines), name, reach, email, addr, cc, note, '', 0, 0, delivery, tail, delivery + tail, 0, d.ship.mot ? 1 : 0, String(who).slice(0, 16)).run()
  const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
  const link = await orderLink(env, origin, id, deps.sha)
  deps.later(omail.created(env, s, d, o, link, origin))
  return { ok: true, id, total: baht(o.total), link }
}
export const POST_LINE = 'Post it home'

// ---- what the maker sees ------------------------------------------------------------------

/** Orders not opened yet, for the tab's dot. */
export async function unread(env, siteId) {
  return (await env.DB.prepare('SELECT COUNT(*) AS n FROM orders WHERE site_id = ? AND seen = 0').bind(siteId).first())?.n || 0
}

/** The orders, the parcels Mot Dang has and the bills for them. */
export async function list(env, s, origin, deps) {
  const rows = (await env.DB.prepare('SELECT * FROM orders WHERE site_id = ? ORDER BY at DESC LIMIT 300').bind(s.id).all()).results
  const jobs = new Map((await env.DB.prepare('SELECT * FROM shipjob WHERE site_id = ?').bind(s.id).all()).results.map((j) => [j.order_id, j]))
  const out = []
  for (const o of rows) {
    const j = jobs.get(o.id)
    out.push({ id: o.id, ref: refOf(o.id), at: o.at, status: o.status, lang: o.lang, name: o.name, reach: o.reach, email: o.email, addr: o.addr, cc: o.cc, note: o.note, code: o.code,
      lines: linesOf(o).map((l) => ({ ...l, u: l.u / 100 })), sub: o.sub / 100, disc: o.disc / 100, delivery: o.delivery / 100, total: o.total / 100, grams: o.grams, mot: !!o.mot,
      paidAt: o.paid_at, slip: !!o.slip, seen: !!o.seen, track: o.track || '', shippedAt: o.shipped_at, goods: hasGoods(linesOf(o)),
      job: j ? { status: j.status, track: j.track || '' } : null, link: await orderLink(env, origin, o.id, deps.sha) })
  }
  return { rows: out, ship: await shipjob.bills(env, s, origin) }
}

/** The orders as CSV, with a byte-order mark so a spreadsheet reads Thai. */
export function csv(rows) {
  const cell = (v) => {
    let t = String(v ?? '')
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t // a spreadsheet reads any of these as a formula (CodeRabbit on #72)
    return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t
  }
  const head = ['Order', 'Date', 'Status', 'Name', 'Phone or LINE', 'Email', 'Address', 'Country', 'Items', 'Items total', 'Discount', 'Shipping', 'Total', 'Code', 'Paid', 'Tracking', 'Mot Dang ships']
  const items = (r) => r.lines.map((l) => `${l.t}${l.opt.length ? ' (' + l.opt.join(', ') + ')' : ''} x${l.q}`).join('; ')
  const lines = [head, ...rows.map((r) => [r.ref, r.at.slice(0, 16).replace('T', ' '), r.status, r.name, r.reach, r.email, r.addr, r.cc, items(r), r.sub.toFixed(2), r.disc.toFixed(2), r.delivery.toFixed(2), r.total.toFixed(2), r.code, r.paidAt ? r.paidAt.slice(0, 10) : '', r.track, r.mot ? 'yes' : ''])]
  return '﻿' + lines.map((l) => l.map(cell).join(',')).join('\r\n') + '\r\n'
}

// ---- the maker's answers --------------------------------------------------------------------

/** Move the page's stock counts by `dir` times each product's units in `lines` (-1 for a sale, +1 to give them back). Products without a count stay. */
async function moveStock(env, s, lines, dir) {
  const row = await env.DB.prepare('SELECT d FROM site WHERE id = ?').bind(s.id).first()
  let prods = []
  try { prods = JSON.parse(row?.d || '{}').products || [] } catch {}
  const units = new Map()
  for (const l of lines) if (l.k === 'p') units.set(l.id, (units.get(l.id) || 0) + l.q)
  for (const [pid, n] of units) {
    const i = prods.findIndex((x) => x.id === pid)
    if (i < 0 || !Number.isInteger(prods[i].stock)) continue
    const path = `$.products[${i}].stock`
    await env.DB.prepare('UPDATE site SET d = json_set(d, ?, MAX(0, CAST(json_extract(d, ?) AS INTEGER) + ?)) WHERE id = ?').bind(path, path, dir * n, s.id).run()
  }
}
const stockMap = async (env, siteId) => {
  const row = await env.DB.prepare('SELECT d FROM site WHERE id = ?').bind(siteId).first()
  try { return Object.fromEntries((JSON.parse(row?.d || '{}').products || []).map((x) => [x.id, x.stock ?? null])) } catch { return {} }
}

/**
 * The stock counts a maker's browser may not have: of the products in orders whose counts moved since `since` (when that browser
 * last had the server's numbers), what the server holds now. A save from that browser keeps these over its own.
 */
export async function stockSince(env, siteId, since) {
  if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(String(since || ''))) return {}
  const rows = (await env.DB.prepare('SELECT lines FROM orders WHERE site_id = ? AND moved > ?').bind(siteId, since).all()).results
  if (!rows.length) return {}
  const ids = new Set(rows.flatMap((r) => { try { return JSON.parse(r.lines).filter((l) => l.k === 'p').map((l) => l.id) } catch { return [] } }))
  const now = await stockMap(env, siteId)
  return Object.fromEntries([...ids].filter((id) => Number.isInteger(now[id])).map((id) => [id, now[id]]))
}

/**
 * The maker's answer on one order: paid · unpaid · gone · ship (they sent it themselves, with a tracking number) · seen.
 * Paid takes the goods off the stock counts (Gold) and, on a page that ships with Mot Dang, sends the team a parcel job.
 */
export async function act(env, s, b, origin, deps) {
  const now = new Date().toISOString()
  if (b.act === 'seen') { await env.DB.prepare('UPDATE orders SET seen = 1 WHERE site_id = ?').bind(s.id).run(); return { ok: true } }
  const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ? AND site_id = ?').bind(String(b.id || ''), s.id).first()
  if (!o) return { error: 'act' }
  if (b.act === 'paid') {
    if (o.status === 'paid') return { ok: true }
    if (o.status === 'gone') return { error: 'gone' }
    await env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = ?, seen = 1 WHERE id = ?").bind(now, o.id).run()
    // two taps on Paid take the stock once: the first claims the move (CodeRabbit on #72)
    if (!o.stocked && isGold(s)) {
      const claim = await env.DB.prepare('UPDATE orders SET stocked = 1, moved = ? WHERE id = ? AND stocked = 0').bind(now, o.id).run()
      // a move that fails gives the claim back, so the next Paid tries again (CodeRabbit on #73)
      if (claim.meta?.changes) {
        try { await moveStock(env, s, linesOf(o), -1) } catch (e) { await env.DB.prepare('UPDATE orders SET stocked = 0, moved = NULL WHERE id = ?').bind(o.id).run(); throw e }
      }
    }
    const paid = { ...o, status: 'paid', paid_at: now }
    if (o.mot && hasGoods(linesOf(o))) await shipjob.create(env, s, paid, origin, deps)
    deps.later(omail.paid(env, s, paid, await orderLink(env, origin, o.id, deps.sha), origin))
    return { ok: true, stock: await stockMap(env, s.id), at: now }
  }
  if (b.act === 'unpaid' || b.act === 'gone') {
    if (o.stocked) await moveStock(env, s, linesOf(o), +1)
    await env.DB.prepare('UPDATE orders SET status = ?, paid_at = NULL, stocked = 0, seen = 1, moved = CASE WHEN stocked = 1 THEN ? ELSE moved END WHERE id = ?').bind(b.act === 'gone' ? 'gone' : 'no', now, o.id).run()
    await env.DB.prepare("DELETE FROM shipjob WHERE order_id = ? AND status = 'wait'").bind(o.id).run() // a parcel nobody has yet
    return { ok: true, stock: await stockMap(env, s.id), at: now }
  }
  if (b.act === 'ship') {
    const track = str(b.track, 60)
    if (o.status !== 'paid') return { error: 'unpaid' }
    if (o.mot) return { error: 'mot' } // Mot Dang's team gives that one its tracking number
    if (track.length < 3) return { error: 'track' }
    await env.DB.prepare('UPDATE orders SET track = ?, shipped_at = ? WHERE id = ?').bind(track, now, o.id).run()
    deps.later(omail.shipped(env, s, { ...o, track }, await orderLink(env, origin, o.id, deps.sha)))
    return { ok: true }
  }
  return { error: 'act' }
}

/** A slip the buyer sends: kept for the maker to look at. The order waits for the maker's Paid. */
export async function slipIn(env, s, o, request, origin, deps) {
  let file
  try { file = (await request.formData()).get('slip') } catch { return { error: 'slip' } }
  if (!file || typeof file === 'string' || !file.size || file.size > 8_000_000) return { error: 'slip' }
  if (!['new', 'slip', 'no'].includes(o.status)) return { error: 'state' }
  const bytes = await file.arrayBuffer(), type = rasterType(bytes)
  if (!type) return { error: 'slip' } // a photo, by its bytes (slipfile.mjs)
  const key = `oslip/${o.id}`
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type }, customMetadata: { v: 'slip' } })
  await env.DB.prepare("UPDATE orders SET status = 'slip', slip = ?, slip_at = ?, seen = 0 WHERE id = ?").bind(key, new Date().toISOString(), o.id).run()
  deps.later(omail.slip(env, s, o, origin))
  return { ok: true }
}
