// shipjob.mjs — Ship with Mot Dang (Nan 2026-10-26: the import-export licence is the company's, so an online shop's orders
// ship through it). The maker switches it on in the shop's shipping settings (Gold). When such an order is marked Paid,
// a parcel job opens: the team gets a LINE note and a post in #minisites with a signed link (osign.mjs) where they mark
// the parcel Received from the maker, then Shipped with a tracking number and the postage paid. Shipped bills the maker:
// Mot Dang's fee for a parcel (SHIP_FEE_TH within Thailand, SHIP_FEE_WORLD abroad, export papers) plus the postage at cost,
// as a pay row of plan 'ship' the maker settles by PromptPay to Mot Dang, with a satang tail like the Gold payments.

import { promptPayPayload, formatAmount } from './promptpay.mjs'
import { teamLink, orderLink } from './osign.mjs'
import * as slipq from './slipq.mjs'
import { checkSlip } from './gold.mjs'
import * as omail from './omail.mjs'
import { normalize } from '../public/s/render.mjs'

export const DEFAULT_DROP = '48–49 Thai Wiwat Alley, Wiang, Mueang Chiang Rai 57000'
/** Mot Dang's fee for a parcel, in baht: within Thailand, abroad. */
export const fees = (env) => ({ th: Number(env.SHIP_FEE_TH) || 100, world: Number(env.SHIP_FEE_WORLD) || 500 })
/** Where a maker brings parcels (var SHIP_DROP; empty: Mot Dang arranges a pickup on LINE). */
export const dropOf = (env) => (env.SHIP_DROP === undefined ? DEFAULT_DROP : String(env.SHIP_DROP).trim())

const lines = (o) => { try { const l = JSON.parse(o.lines); return Array.isArray(l) ? l : [] } catch { return [] } }
const titleOf = (s) => { try { return normalize(JSON.parse(s.d || '{}')).name || s.name } catch { return s.name } }
const ref = (id) => 'OR' + String(id).slice(0, 6).toUpperCase()

/** The parcel job for an order (one each), and a note to the team when it opens. */
export async function create(env, s, o, origin, deps) {
  const have = await env.DB.prepare('SELECT id FROM shipjob WHERE order_id = ?').bind(o.id).first()
  if (have) return have.id
  const id = deps.rand(12)
  await env.DB.prepare("INSERT INTO shipjob (id, order_id, site_id, at, status) VALUES (?,?,?,?,'wait')").bind(id, o.id, s.id, new Date().toISOString()).run()
  const n = lines(o).filter((l) => l.k === 'p').reduce((a, l) => a + l.q, 0)
  const text = `📦 พัสดุมดแดงต้องส่ง · A parcel to ship\n${titleOf(s)} · ${ref(o.id)} · ${n} · ${o.grams} g · ${o.cc}\nลิงก์ทีม · Team link: ${await teamLink(env, origin, id, deps.sha)}`
  deps.later(Promise.all([deps.tellBeer(text), deps.post(text)]))
  return id
}

/** The team's two answers. got: the maker's parcel is here. sent: it left, with a tracking number and the postage paid (baht). */
export async function act(env, job, o, s, form, origin, deps) {
  const now = new Date().toISOString()
  const what = String(form.get('act') || '')
  if (what === 'got' && job.status === 'wait') {
    await env.DB.prepare("UPDATE shipjob SET status = 'got', got_at = ? WHERE id = ?").bind(now, job.id).run()
    return { ok: true }
  }
  if (what === 'sent' && job.status !== 'sent') {
    const track = String(form.get('track') || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 60)
    const post = Number(String(form.get('postage') || '0').replace(/,/g, ''))
    if (track.length < 3) return { error: 'track' }
    if (!(post >= 0 && post <= 50000)) return { error: 'postage' }
    const f = fees(env), fee = Math.round((o.cc === 'TH' ? f.th : f.world) * 100), postage = Math.round(post * 100)
    // the bill: a satang tail no waiting payment has, so a payment of this exact amount is this parcel's
    const used = new Set((await env.DB.prepare("SELECT amount FROM pay WHERE status IN ('open','slip')").all()).results.map((r) => r.amount))
    let tail = 1 + Math.floor(Math.random() * 99)
    for (let i = 0; i < 99 && used.has(formatAmount(fee + postage + tail)); i++) tail = (tail % 99) + 1
    const payId = deps.rand(12)
    await env.DB.prepare("INSERT INTO pay (id, site_id, amount, status, created, updated, months, plan, note) VALUES (?,?,?,'open',?,?,0,'ship',?)")
      .bind(payId, s.id, formatAmount(fee + postage + tail), now, now, ref(o.id)).run()
    await env.DB.prepare("UPDATE shipjob SET status = 'sent', got_at = COALESCE(got_at, ?), sent_at = ?, track = ?, fee = ?, postage = ?, pay_id = ? WHERE id = ?").bind(now, now, track, fee, postage, payId, job.id).run()
    await env.DB.prepare('UPDATE orders SET track = ?, shipped_at = ? WHERE id = ?').bind(track, now, o.id).run()
    deps.later(Promise.all([omail.shipped(env, s, { ...o, track }, await orderLink(env, origin, o.id, deps.sha)), omail.billed(env, s, { ...o, track }, formatAmount(fee + postage + tail), origin)]))
    return { ok: true }
  }
  return { ok: true }
}

/** What the maker's Orders tab shows about Mot Dang's shipping: the fees, where to bring parcels, and the bills with their QR. */
export async function bills(env, s) {
  const rows = (await env.DB.prepare("SELECT shipjob.*, pay.amount, pay.status AS pstatus FROM shipjob JOIN pay ON pay.id = shipjob.pay_id WHERE shipjob.site_id = ? AND pay.plan = 'ship' ORDER BY shipjob.sent_at DESC LIMIT 100").bind(s.id).all()).results
  return { fees: fees(env), drop: dropOf(env), bills: rows.map((r) => {
    let payload = ''
    try { if (env.PROMPTPAY && r.pstatus !== 'paid') payload = promptPayPayload({ payeeId: env.PROMPTPAY, satang: Math.round(Number(r.amount) * 100), merchantName: 'Mot Dang', ref: 'SHIP' + ref(r.order_id).slice(2) }) } catch {}
    return { pay: r.pay_id, order: ref(r.order_id), amount: r.amount, status: r.pstatus, fee: r.fee / 100, postage: r.postage / 100, track: r.track, payload }
  }) }
}

/** The maker's slip for a bill. SlipOK reads it for Mot Dang's own account, so it can settle the bill; else Beer looks. */
export async function billSlip(env, s, request, origin, deps) {
  let form
  try { form = await request.formData() } catch { return { error: 'slip' } }
  const file = form.get('slip')
  if (!file || typeof file === 'string' || !file.size || file.size > 8_000_000) return { error: 'slip' }
  const pay = await env.DB.prepare("SELECT * FROM pay WHERE id = ? AND site_id = ? AND plan = 'ship' AND status IN ('open','slip')").bind(String(form.get('pay') || ''), s.id).first()
  if (!pay) return { error: 'no-payment' }
  const key = `slip/${pay.id}`
  await env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || 'image/jpeg' }, customMetadata: { v: 'slip' } })
  const r = await checkSlip(env, file, Number(pay.amount))
  if (r.ok) {
    await env.DB.prepare('UPDATE pay SET slip = ?, updated = ? WHERE id = ?').bind(key, new Date().toISOString(), pay.id).run()
    await deps.payOk(env, pay.id, origin, 'slipok ' + r.ref)
    return { ok: true, paid: true }
  }
  await env.DB.prepare("UPDATE pay SET status = 'slip', slip = ?, note = ?, updated = ? WHERE id = ?").bind(key, r.why, new Date().toISOString(), pay.id).run()
  deps.later((async () => deps.tellBeer(`สลิปค่าส่งรอดู · A shipping slip waits\n${titleOf(s)} · ฿${pay.amount}\nกดดูแล้วตอบ · Tap to check and answer:\n${await slipq.link(env, origin, pay.id, deps.sha)}`))())
  return { ok: true, waiting: true }
}
