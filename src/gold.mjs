// gold.mjs — Gold, the paid year. The maker scans a PromptPay QR for the
// exact amount (a satang tail tells one payment from another), then sends the
// bank slip. With SlipOK keys set the slip is checked at once and the page
// turns Gold; without them the slip waits at /admin for a person to look.

import { promptPayPayload } from './promptpay.mjs'

export const GOLD_THB = 3000
export const HOTEL_THB = 555 // a month, for a page that takes room bookings (Nan 2026-10-14: "555/month")

/** The two ways to pay: the Gold year (links to Agoda and Booking.com) and the hotel month (direct bookings). */
export const PLANS = (env) => ({
  gold: { plan: 'gold', baht: Number(env.GOLD_THB) || GOLD_THB, months: 12, hotel: false },
  hotel: { plan: 'hotel', baht: Number(env.HOTEL_THB) || HOTEL_THB, months: 1, hotel: true },
})
/** The plan asked for, else the hotel month for a page with rooms and the Gold year for the rest. */
export function planOf(env, d, want) {
  const P = PLANS(env)
  return P[want] || (d && Array.isArray(d.rooms) && d.rooms.length ? P.hotel : P.gold)
}
/** Direct room bookings: the hotel month, or the first 30 Gold days. */
export const isHotel = (s) => isGold(s) && (!!s.trial || s.plan === 'hotel')

export const slipOn = (env) => !!(env.SLIPOK_KEY && env.SLIPOK_BRANCH)

/** A fresh amount for one page: ฿3,000.01 – ฿3,000.99, unused among open payments. */
export async function start(env, siteId, rand, plan = planOf(env, null)) {
  const open = await env.DB.prepare("SELECT id, amount FROM pay WHERE site_id = ? AND status IN ('open','slip') ORDER BY created DESC LIMIT 1").bind(siteId).first()
  const base = plan.baht
  let amount = open?.amount
  if (!amount || Math.floor(Number(amount)) !== base) {
    const used = new Set((await env.DB.prepare("SELECT amount FROM pay WHERE status IN ('open','slip')").all()).results.map((r) => r.amount))
    let tail = 1 + Math.floor(Math.random() * 99)
    for (let i = 0; i < 99 && used.has(`${base}.${String(tail).padStart(2, '0')}`); i++) tail = (tail % 99) + 1
    amount = `${base}.${String(tail).padStart(2, '0')}`
    const now = new Date().toISOString()
    await env.DB.prepare('INSERT INTO pay (id, site_id, amount, status, created, updated, months) VALUES (?,?,?,?,?,?,?)').bind(rand(12), siteId, amount, 'open', now, now, plan.months).run()
  }
  const satang = Math.round(Number(amount) * 100)
  const payload = env.PROMPTPAY ? promptPayPayload({ payeeId: env.PROMPTPAY, satang, merchantName: 'Mot Dang', ref: 'GOLD' }) : ''
  return { amount, baht: base, months: plan.months, hotel: plan.hotel, payload, slipOn: slipOn(env) }
}

/** SlipOK's reading of a slip, when the keys are set. */
export async function checkSlip(env, file, baht) {
  if (!slipOn(env)) return { ok: false, why: 'off' }
  const form = new FormData()
  form.append('files', file, 'slip.jpg')
  form.append('amount', String(baht))
  form.append('log', 'true')
  try {
    const r = await fetch(`https://api.slipok.com/api/line/apikey/${encodeURIComponent(env.SLIPOK_BRANCH)}`, { method: 'POST', headers: { 'x-authorization': env.SLIPOK_KEY }, body: form })
    const j = await r.json()
    const d = j?.data
    if (j?.success && d?.success && d.transRef && Number(d.amount) >= baht) return { ok: true, ref: String(d.transRef) }
    return { ok: false, why: String(j?.code || r.status) }
  } catch { return { ok: false, why: 'service' } }
}

/** Gold for `months` (a year unless said) from today, or past the current end. */
export async function grant(env, siteId, months = 12) {
  const s = await env.DB.prepare('SELECT gold_until FROM site WHERE id = ?').bind(siteId).first()
  const from = s?.gold_until && s.gold_until > new Date().toISOString() ? new Date(s.gold_until) : new Date()
  from.setUTCMonth(from.getUTCMonth() + months)
  const until = from.toISOString().slice(0, 10)
  await env.DB.prepare("UPDATE site SET tier='gold', gold_until=?, trial=0, plan=? WHERE id=?").bind(until, months === 1 ? 'hotel' : 'gold', siteId).run()
  return until
}

/** Is the page Gold today? */
export const isGold = (s) => s?.tier === 'gold' && (!s.gold_until || s.gold_until >= new Date().toISOString().slice(0, 10))
