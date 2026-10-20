// prices.mjs — prices that follow demand on people's pages (NaN 2026-10-20, for the Kamthieng
// and Warorot markets). The rules are public/s/shoup.mjs; this file counts what moves them,
// runs the Monday check, and gives the builder its numbers. A piece's own price (what the seller
// typed) is where it opened; the price it sells at now is price_now, put into the page as it is
// served, so a seller's save never undoes a Monday move.

import { dynOf, bahtOf, fmt, soldMove, askMove, step, batchOf, weekOf, nextCheck, outlook, WINDOW } from '../public/s/shoup.mjs'

const DAY = 864e5
const bkkDay = (t) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10)
/** Whole days a piece has been moving, counted from its first Bangkok day. */
export const daysOn = (since, now = Date.now()) => (since ? Math.floor((now - Date.parse(since + 'T00:00:00+07:00')) / DAY) : 0)

const moving = (x) => !!(x && x.dyn && x.dyn.on)
export const hasMoving = (d) => (d.items || []).some(moving) || (d.amulets || []).some(moving)

/** item → the baht it sells at now. */
export async function nowPrices(env, siteId) {
  const r = (await env.DB.prepare('SELECT item, baht FROM price_now WHERE site_id = ?').bind(siteId).all()).results
  return new Map(r.map((x) => [x.item, x.baht]))
}

/** The page's data with each moving piece at its price now. */
export async function live(env, siteId, d) {
  if (!d || !hasMoving(d)) return d
  const now = await nowPrices(env, siteId)
  if (!now.size) return d
  const at = (x) => (moving(x) && now.has(x.id) ? { ...x, p: fmt(now.get(x.id)) } : x)
  return { ...d, items: (d.items || []).map(at), amulets: (d.amulets || []).map(at) }
}

/** Counts for each piece over the last 30 days: sold, sold7, asks7, asks14, page7, mine7. */
export async function counts(env, siteId, now = Date.now()) {
  const from = new Date(now - WINDOW.sold * DAY).toISOString()
  const rows = (await env.DB.prepare('SELECT item, kind, src, qty, at FROM mark WHERE site_id = ? AND at >= ? LIMIT 20000').bind(siteId, from).all()).results
  const t7 = new Date(now - WINDOW.ask * DAY).toISOString(), t14 = new Date(now - WINDOW.quiet * DAY).toISOString()
  const out = new Map()
  for (const r of rows) {
    const c = out.get(r.item) || { sold: 0, sold7: 0, asks7: 0, asks14: 0, page7: 0, mine7: 0 }
    if (r.kind === 'sold') { c.sold += r.qty; if (r.at >= t7) c.sold7 += r.qty }
    if (r.kind === 'ask') {
      if (r.at >= t14) c.asks14 += r.qty
      if (r.at >= t7) { c.asks7 += r.qty; c[r.src === 'page' ? 'page7' : 'mine7'] += r.qty }
    }
    out.set(r.item, c)
  }
  return out
}

/** The asks of each amulet's batch: { asks, quiet, sold } by batch key. */
export function batches(amulets, c) {
  const out = new Map()
  for (const x of amulets) {
    const k = batchOf(x), n = c.get(x.id) || {}
    const b = out.get(k) || { asks: 0, quiet: 0, sold: 0 }
    b.asks += n.asks7 || 0; b.quiet += n.asks14 || 0; b.sold += n.sold7 || 0
    out.set(k, b)
  }
  return out
}

/** What one page's Monday check would do: [{ id, amulet, from, to, move, n }]. */
export function plan(d, c, cur, now = Date.now()) {
  const out = []
  for (const x of d.items || []) {
    const dyn = dynOf(x.dyn), days = daysOn(dyn?.since, now)
    if (!dyn || days < 7) continue
    const from = cur.get(x.id) ?? bahtOf(x.p)
    if (!from) continue
    const k = c.get(x.id) || {}
    const { share, move } = soldMove(k.sold || 0, dyn.per, days)
    out.push({ id: x.id, amulet: false, from, to: step(from, move, dyn), move, n: share === null ? null : Math.round(share * 100) / 100 })
  }
  const bs = batches(d.amulets || [], c)
  for (const x of d.amulets || []) {
    const dyn = dynOf(x.dyn), days = daysOn(dyn?.since, now)
    if (!dyn || days < 7 || x.status !== 'open') continue
    const from = cur.get(x.id) ?? bahtOf(x.p)
    if (!from) continue
    const b = bs.get(batchOf(x))
    const move = askMove({ ...b, fall: dyn.fall })
    out.push({ id: x.id, amulet: true, from, to: step(from, move, dyn), move, n: b.asks + 2 * b.sold })
  }
  return out
}

/** Monday's check for every page with moving prices that has not had this week's. */
export async function weekly(env, normalize, max = 20, now = Date.now()) {
  const week = weekOf(now)
  const rows = (await env.DB.prepare(`SELECT id, d FROM site WHERE status = 'live' AND d LIKE '%"dyn":{"on":true%'
    AND id NOT IN (SELECT site_id FROM price_week WHERE week = ?) LIMIT ?`).bind(week, max).all()).results
  for (const s of rows) await settle(env, s.id, normalize(JSON.parse(s.d)), week, now)
  return rows.length
}

/** One page's check: new prices, the steps, the week marked done. */
export async function settle(env, siteId, d, week, now = Date.now()) {
  const at = new Date(now).toISOString()
  const steps = plan(d, await counts(env, siteId, now), await nowPrices(env, siteId), now)
  const q = steps.flatMap((x) => [
    env.DB.prepare('INSERT INTO price_now (site_id, item, baht, at) VALUES (?,?,?,?) ON CONFLICT(site_id, item) DO UPDATE SET baht = excluded.baht, at = excluded.at').bind(siteId, x.id, x.to, at),
    env.DB.prepare('INSERT OR IGNORE INTO price_step (site_id, item, week, from_baht, to_baht, move, n, at) VALUES (?,?,?,?,?,?,?,?)').bind(siteId, x.id, week, x.from, x.to, x.to - x.from === 0 ? 0 : x.move, x.n, at),
  ])
  q.push(env.DB.prepare('INSERT OR IGNORE INTO price_week (site_id, week, at) VALUES (?,?,?)').bind(siteId, week, at))
  for (let i = 0; i < q.length; i += 90) await env.DB.batch(q.slice(i, i + 90))
  return steps
}

/** Before a save: each moving piece keeps the day it started moving; a new one starts today. */
export function stamp(oldD, newD, now = Date.now()) {
  const was = new Map([...(oldD.items || []), ...(oldD.amulets || [])].filter(moving).map((x) => [x.id, x.dyn.since]))
  for (const x of [...(newD.items || []), ...(newD.amulets || [])]) {
    if (!moving(x)) continue
    x.dyn.since = was.get(x.id) || bkkDay(now)
  }
  return newD
}

/** After a save: a piece whose price the seller changed, or that stopped moving, opens again at
 *  its own price; an amulet the seller marked gone counts as a sale. */
export function afterSave(env, siteId, oldD, newD, now = Date.now()) {
  const at = new Date(now).toISOString()
  const old = new Map([...(oldD.items || []), ...(oldD.amulets || [])].map((x) => [x.id, x]))
  const q = []
  for (const x of [...(newD.items || []), ...(newD.amulets || [])]) {
    const o = old.get(x.id)
    if (!o) continue
    if ((moving(o) && !moving(x)) || (moving(x) && bahtOf(o.p) !== bahtOf(x.p))) q.push(env.DB.prepare('DELETE FROM price_now WHERE site_id = ? AND item = ?').bind(siteId, x.id))
  }
  for (const x of newD.amulets || []) {
    const o = old.get(x.id)
    if (o && o.status !== 'sold' && x.status === 'sold') q.push(env.DB.prepare("INSERT INTO mark (site_id, item, kind, qty, src, at) VALUES (?,?,'sold',1,'seller',?)").bind(siteId, x.id, at))
  }
  return q
}

/** A reader tapped Reserve on an amulet's page: one ask a reader a day. */
export async function pageAsk(env, siteId, item, who) {
  if (!/^[a-z0-9]{4,12}$/.test(item)) return
  await env.DB.prepare("INSERT OR IGNORE INTO mark (site_id, item, kind, qty, src, who, at) VALUES (?,?,'ask',1,'page',?,?)")
    .bind(siteId, item, who, new Date().toISOString()).run()
}

/** The seller marked a sale or an ask (qty 1), or took their last one back (qty -1). */
export async function mark(env, siteId, item, kind, qty) {
  if (qty > 0) {
    await env.DB.prepare("INSERT INTO mark (site_id, item, kind, qty, src, at) VALUES (?,?,?,1,'seller',?)").bind(siteId, item, kind, new Date().toISOString()).run()
    return true
  }
  const last = await env.DB.prepare("SELECT rowid AS r FROM mark WHERE site_id = ? AND item = ? AND kind = ? AND src = 'seller' AND at >= ? ORDER BY at DESC LIMIT 1")
    .bind(siteId, item, kind, new Date(Date.now() - WINDOW.sold * DAY).toISOString()).first()
  if (!last) return false
  await env.DB.prepare('DELETE FROM mark WHERE rowid = ?').bind(last.r).run()
  return true
}

/** What the builder shows: each moving piece's price now, counts, next Monday's move, its last steps. */
export async function view(env, siteId, d, now = Date.now()) {
  const c = await counts(env, siteId, now), cur = await nowPrices(env, siteId)
  const steps = (await env.DB.prepare('SELECT item, week, from_baht, to_baht FROM price_step WHERE site_id = ? ORDER BY week DESC LIMIT 400').bind(siteId).all()).results
  const bs = batches(d.amulets || [], c)
  const zero = { sold: 0, sold7: 0, asks7: 0, asks14: 0, page7: 0, mine7: 0 }
  const one = (x, amulet) => {
    const k = { ...zero, ...(c.get(x.id) || {}) }
    const days = daysOn(x.dyn?.since, now)
    const b = amulet ? bs.get(batchOf(x)) : null
    const nowB = cur.get(x.id) ?? bahtOf(x.p)
    const out = moving(x) ? outlook(x, { ...k, days: x.dyn?.since ? days : 0 }, { amulet, batch: b, now: nowB }) : null
    return { id: x.id, amulet, moving: moving(x), now: nowB, opened: bahtOf(x.p), days, counts: k, batch: b, out,
      steps: steps.filter((s) => s.item === x.id).slice(0, 6).map((s) => ({ week: s.week, from: s.from_baht, to: s.to_baht })) }
  }
  return { next: nextCheck(now).toISOString(), pieces: [...(d.items || []).map((x) => one(x, false)), ...(d.amulets || []).map((x) => one(x, true))] }
}
