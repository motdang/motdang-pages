// gold.mjs — Gold, the paid year. The maker scans a PromptPay QR for the
// exact amount (a satang tail tells one payment from another), then sends the
// bank slip. With SlipOK keys set the slip is checked at once and the page
// turns Gold; without them the slip waits at /admin for a person to look.

import { promptPayPayload } from './promptpay.mjs'

export const GOLD_THB = 3000
export const HOTEL_THB = 555 // a month, for a page that takes room bookings (Nan 2026-10-14: "555/month")
export const HOTEL_YEAR_THB = 5550 // the hotel year paid up front: twelve months for the price of ten (2026-10-15)

/** The ways to pay: the Gold year (links to Agoda and Booking.com), the hotel month and the hotel year (direct bookings). */
export const PLANS = (env) => ({
  gold: { plan: 'gold', baht: Number(env.GOLD_THB) || GOLD_THB, months: 12, hotel: false },
  hotel: { plan: 'hotel', baht: Number(env.HOTEL_THB) || HOTEL_THB, months: 1, hotel: true },
  hotelyear: { plan: 'hotel', baht: Number(env.HOTEL_YEAR_THB) || HOTEL_YEAR_THB, months: 12, hotel: true },
})
/** The plan asked for, else the hotel month for a page with rooms and the Gold year for the rest. */
export function planOf(env, d, want) {
  const P = PLANS(env)
  return P[want] || (d && Array.isArray(d.rooms) && d.rooms.length ? P.hotel : P.gold)
}
/** Direct room bookings: while the page's hotel months last (hotel_until), or in its first 30 Gold days. Gold alone has none. */
export const isHotel = (s) => isGold(s) && (!!s.trial || (!!s.hotel_until && s.hotel_until >= new Date().toISOString().slice(0, 10)))

export const slipOn = (env) => !!(env.SLIPOK_KEY && env.SLIPOK_BRANCH)

/** A fresh amount for one page: ฿3,000.01 – ฿3,000.99, unused among open payments. */
export async function start(env, siteId, rand, plan = planOf(env, null)) {
  const open = await env.DB.prepare("SELECT id, amount FROM pay WHERE site_id = ? AND status IN ('open','slip') AND COALESCE(plan, '') != 'fee' ORDER BY created DESC LIMIT 1").bind(siteId).first()
  const base = plan.baht
  let amount = open?.amount
  if (!amount || Math.floor(Number(amount)) !== base) {
    const used = new Set((await env.DB.prepare("SELECT amount FROM pay WHERE status IN ('open','slip')").all()).results.map((r) => r.amount))
    let tail = 1 + Math.floor(Math.random() * 99)
    for (let i = 0; i < 99 && used.has(`${base}.${String(tail).padStart(2, '0')}`); i++) tail = (tail % 99) + 1
    amount = `${base}.${String(tail).padStart(2, '0')}`
    const now = new Date().toISOString()
    await env.DB.prepare('INSERT INTO pay (id, site_id, amount, status, created, updated, months, plan) VALUES (?,?,?,?,?,?,?,?)').bind(rand(12), siteId, amount, 'open', now, now, plan.months, plan.plan).run()
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

const iso = (d) => d.toISOString().slice(0, 10)
const plusMonths = (from, n) => { const d = new Date(from); d.setUTCMonth(d.getUTCMonth() + n); return d }

/**
 * What a payment adds, from where the last one ends (or from today).
 * gold, sian, terms: `months` of Gold.
 * hotel (Nan 2026-10-21, "charge hotel booking by the month"): `months` of hotel booking, counted apart from the Gold period.
 * The hotel year is also 12 months of Gold. A hotel month adds Gold only where the Gold period would end before the hotel months
 * do (a page with no Gold gets a month of each), so a Gold year stays as it is. A page in its 30 free days starts after them.
 * A hotel payment leaves `plan` alone. Returns the end of the Gold period.
 */
export async function grant(env, siteId, months = 12, plan = months === 1 ? 'hotel' : 'gold') {
  const s = await env.DB.prepare('SELECT gold_until, hotel_until, trial FROM site WHERE id = ?').bind(siteId).first()
  const now = new Date().toISOString()
  const live = (d) => (d && d > now ? d : null) // an end that has not passed (a date counts as passed on its own day, as it always has)
  const goldFrom = new Date(live(s?.gold_until) || now)
  if (plan !== 'hotel') {
    const until = iso(plusMonths(goldFrom, months))
    await env.DB.prepare("UPDATE site SET tier='gold', gold_until=?, trial=0, plan=? WHERE id=?").bind(until, plan, siteId).run()
    return until
  }
  const hotelFrom = new Date([now, live(s?.hotel_until), s?.trial ? live(s?.gold_until) : null].filter(Boolean).sort().at(-1))
  const hotelUntil = iso(plusMonths(hotelFrom, months))
  let goldUntil = months >= 12 ? iso(plusMonths(goldFrom, months)) : live(s?.gold_until)
  if (!goldUntil || goldUntil < hotelUntil) goldUntil = hotelUntil
  await env.DB.prepare("UPDATE site SET tier='gold', gold_until=?, hotel_until=?, trial=0 WHERE id=?").bind(goldUntil, hotelUntil, siteId).run()
  return goldUntil
}

/** Is the page Gold today? */
export const isGold = (s) => s?.tier === 'gold' && (!s.gold_until || s.gold_until >= new Date().toISOString().slice(0, 10))

/** A paid plan, posted to the team's sales channel when DISCORD_SALES is set. */
export async function tellSales(env, { title, url, amount, months, plan, how, cut }) {
  const what = plan === 'sian' ? 'Sala Sian year' : plan === 'hotel' ? (months === 1 ? 'Hotel booking, a month' : 'Gold + hotel booking, a year') : 'Gold year'
  const by = (cut ? `\n${cut.name} +฿${cut.cut} (${cut.rate}%)` : '') + (cut?.bonus ? `\n${cut.bonus.name} +฿${cut.bonus.cut} (brought ${cut.bonus.for}, first sale)` : '')
  return postSales(env, `💰 **${what}** · ฿${amount} · ${title}\n${url} · ${how}${by}`)
}
/** One message to the team's sales channel. */
export async function postSales(env, content) {
  if (!env.DISCORD_SALES) return 'off'
  const r = await fetch(env.DISCORD_SALES, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'motdang sales', content, allowed_mentions: { parse: [] } }) })
  return r.ok ? 'sent' : 'discord ' + r.status
}
