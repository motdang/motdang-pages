// gold.mjs — Gold, the paid year. The maker scans a PromptPay QR for the
// exact amount (a satang tail tells one payment from another), then sends the
// bank slip. With SlipOK keys set the slip is checked at once and the page
// turns Gold; without them the slip waits at /admin for a person to look.

import { promptPayPayload } from './promptpay.mjs'

export const GOLD_THB = 3000

export const slipOn = (env) => !!(env.SLIPOK_KEY && env.SLIPOK_BRANCH)

/** A fresh amount for one page: ฿3,000.01 – ฿3,000.99, unused among open payments. */
export async function start(env, siteId, rand) {
  const open = await env.DB.prepare("SELECT id, amount FROM pay WHERE site_id = ? AND status IN ('open','slip') ORDER BY created DESC LIMIT 1").bind(siteId).first()
  const base = Number(env.GOLD_THB) || GOLD_THB
  let amount = open?.amount
  if (!amount || Math.floor(Number(amount)) !== base) {
    const used = new Set((await env.DB.prepare("SELECT amount FROM pay WHERE status IN ('open','slip')").all()).results.map((r) => r.amount))
    let tail = 1 + Math.floor(Math.random() * 99)
    for (let i = 0; i < 99 && used.has(`${base}.${String(tail).padStart(2, '0')}`); i++) tail = (tail % 99) + 1
    amount = `${base}.${String(tail).padStart(2, '0')}`
    const now = new Date().toISOString()
    await env.DB.prepare('INSERT INTO pay (id, site_id, amount, status, created, updated) VALUES (?,?,?,?,?,?)').bind(rand(12), siteId, amount, 'open', now, now).run()
  }
  const satang = Math.round(Number(amount) * 100)
  const payload = env.PROMPTPAY ? promptPayPayload({ payeeId: env.PROMPTPAY, satang, merchantName: 'Mot Dang', ref: 'GOLD' }) : ''
  return { amount, baht: base, payload, slipOn: slipOn(env) }
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

/** Gold for a year from today, or a year past the current end. */
export async function grant(env, siteId, note) {
  const s = await env.DB.prepare('SELECT gold_until FROM site WHERE id = ?').bind(siteId).first()
  const from = s?.gold_until && s.gold_until > new Date().toISOString() ? new Date(s.gold_until) : new Date()
  from.setUTCFullYear(from.getUTCFullYear() + 1)
  const until = from.toISOString().slice(0, 10)
  await env.DB.prepare("UPDATE site SET tier='gold', gold_until=? WHERE id=?").bind(until, siteId).run()
  return until
}

/** Is the page Gold today? */
export const isGold = (s) => s?.tier === 'gold' && (!s.gold_until || s.gold_until >= new Date().toISOString().slice(0, 10))
