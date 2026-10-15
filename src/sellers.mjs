// sellers.mjs — people who sell the plans in person (Hom first, 2026-10-15).
// A page made from a seller's link (/make?by=<id>) carries the seller; each plan
// it pays for earns the seller a share of the price. NaN: "middle high round
// number, fully automated, shoupified if possible." So the share starts at 20%
// and moves once a month, Shoup's way: sales at 80% of the month's target or
// more, up one step; under 60%, down one step; between, no change.

export const LADDER = [10, 15, 20, 25, 30]
const UP = 0.8, DOWN = 0.6

const bkkMonth = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 7)
const nf = (n) => new Intl.NumberFormat('en').format(n)

/** A seller code from a link, if it is one we know. */
export async function known(env, by) {
  const id = String(by || '').toLowerCase()
  if (!/^[a-z0-9-]{2,24}$/.test(id)) return null
  return (await env.DB.prepare('SELECT id FROM seller WHERE id = ?').bind(id).first())?.id || null
}

/** The seller's share of one paid plan, written once per payment. */
export async function credit(env, { siteId, payId, amount }) {
  const s = await env.DB.prepare('SELECT seller.* FROM site JOIN seller ON seller.id = site.seller WHERE site.id = ?').bind(siteId).first()
  if (!s) return null
  const baht = Math.floor(Number(amount))
  const cut = Math.round((baht * s.rate) / 100)
  await env.DB.prepare('INSERT OR IGNORE INTO earn (pay_id, seller, site_id, baht, rate, cut, month, at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(payId, s.id, siteId, baht, s.rate, cut, bkkMonth(), new Date().toISOString()).run()
  return { name: s.name, rate: s.rate, cut }
}

/** The step after a month's sales against its target. */
export function nextRate(rate, sales, target) {
  const i = Math.max(0, LADDER.indexOf(rate))
  const r = target > 0 ? sales / target : 0
  return LADDER[r >= UP ? Math.min(i + 1, LADDER.length - 1) : r < DOWN ? Math.max(i - 1, 0) : i]
}

/** On the 1st (Bangkok, from 08:00): last month's statement per seller, posted to #sales, and the new share. */
export async function monthEnd(env, post) {
  const bkk = new Date(Date.now() + 7 * 3600e3)
  if (bkk.getUTCDate() !== 1 || bkk.getUTCHours() < 8) return 0
  const month = bkk.toISOString().slice(0, 7)
  const prev = bkkMonth(Date.now() - 2 * 864e5)
  const rows = (await env.DB.prepare('SELECT * FROM seller WHERE closed IS NULL OR closed < ?').bind(month).all()).results
  for (const s of rows) {
    await env.DB.prepare('UPDATE seller SET closed = ? WHERE id = ?').bind(month, s.id).run()
    const t = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(baht),0) AS sales, COALESCE(SUM(cut),0) AS owed FROM earn WHERE seller = ? AND month = ?').bind(s.id, prev).first()
    // a seller who started mid-month is held to the part of the month they had
    const days = new Date(Date.UTC(+prev.slice(0, 4), +prev.slice(5, 7), 0)).getUTCDate()
    const had = s.created.slice(0, 7) === prev ? days - Number(s.created.slice(8, 10)) + 1 : days
    const target = Math.round((s.target * Math.max(1, had)) / days)
    const rate = nextRate(s.rate, t.sales, target)
    await env.DB.prepare('UPDATE seller SET rate = ? WHERE id = ?').bind(rate, s.id).run()
    await post(`🧾 **${s.name} · ${prev}**\nPlans sold: ${t.n} · ฿${nf(t.sales)} of ฿${nf(target)} target (${target ? Math.round((t.sales / target) * 100) : 0}%)\n` +
      `Pay ${s.name}: **฿${nf(t.owed)}** (Beer, by PromptPay)\nShare from ${month}: ${rate}%${rate > s.rate ? ' ⬆' : rate < s.rate ? ' ⬇' : ''} (ladder ${LADDER.join(' · ')})`)
  }
  return rows.length
}
