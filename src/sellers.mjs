// sellers.mjs — people who sell the plans in person (Hom first, 2026-10-15).
// A page made from a seller's link (/make?by=<id>) carries the seller; each plan
// it pays for earns the seller a share of the price. NaN: "middle high round
// number, fully automated, shoupified if possible." So the share starts at 20%
// and moves once a month, Shoup's way: sales at 80% of the month's target or
// more, up one step; under 60%, down one step; between, no change.
//
// 2026-10-16, NaN: "There will always be work for people like Hom … a workflow for
// publishing that work and attracting/recruiting more Homs. They help us get paid, and
// we pay them automagically." So: anyone can sign up at /sell; Beer says yes from a
// link; a new seller starts at 20% with a ฿30,000 month; the seller who brought them
// gets ฿500 when they sell their first plan; on the 1st each seller owed money gets a
// payout with a PromptPay QR to their number, and Beer marks it paid (sell.mjs).

export const LADDER = [10, 15, 20, 25, 30]
const UP = 0.8, DOWN = 0.6
export const START = { rate: 20, target: 30000 }
export const BONUS = 500

const bkkMonth = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 7)
const nf = (n) => new Intl.NumberFormat('en').format(n)

/** A seller code from a link, if it is one we know. */
export async function known(env, by) {
  const id = String(by || '').toLowerCase()
  if (!/^[a-z0-9-]{2,24}$/.test(id)) return null
  return (await env.DB.prepare("SELECT id FROM seller WHERE id = ? AND status = 'ok'").bind(id).first())?.id || null
}

/** A seller's code from their name: hom, noi, noi-2 … */
export async function freeId(env, name) {
  const base = String(name || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'seller'
  const id = base.length < 2 ? 'seller' : base
  for (let n = 1; n < 100; n++) {
    const c = n === 1 ? id : `${id}-${n}`
    if (!(await env.DB.prepare('SELECT 1 FROM seller WHERE id = ?').bind(c).first())) return c
  }
  return `${id}-${Date.now().toString(36)}`
}

/** The seller's share of one paid plan, written once per payment. */
export async function credit(env, { siteId, payId, amount }) {
  const s = await env.DB.prepare('SELECT seller.* FROM site JOIN seller ON seller.id = site.seller WHERE site.id = ?').bind(siteId).first()
  if (!s) return null
  const baht = Math.floor(Number(amount))
  const cut = Math.round((baht * s.rate) / 100)
  const now = new Date().toISOString()
  await env.DB.prepare('INSERT OR IGNORE INTO earn (pay_id, seller, site_id, baht, rate, cut, month, at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(payId, s.id, siteId, baht, s.rate, cut, bkkMonth(), now).run()
  // the seller who brought this one: once, at their first sale
  let bonus = null
  const via = s.via && await env.DB.prepare("SELECT id, name FROM seller WHERE id = ? AND status = 'ok'").bind(s.via).first()
  if (via) {
    const r = await env.DB.prepare('INSERT OR IGNORE INTO earn (pay_id, seller, site_id, baht, rate, cut, month, at) VALUES (?,?,?,0,0,?,?,?)')
      .bind('via:' + s.id, via.id, siteId, BONUS, bkkMonth(), now).run()
    if (r.meta?.changes) bonus = { name: via.name, cut: BONUS, for: s.name }
  }
  return { name: s.name, rate: s.rate, cut, bonus }
}

/** This month so far, and the payouts, for a seller's kit. */
export async function standing(env, s) {
  const month = bkkMonth()
  const t = await env.DB.prepare("SELECT COALESCE(SUM(baht > 0),0) AS n, COALESCE(SUM(baht),0) AS sales, COALESCE(SUM(cut),0) AS owed FROM earn WHERE seller = ? AND month = ? AND kind = 'plan'").bind(s.id, month).first()
  const pays = (await env.DB.prepare('SELECT month, baht, status FROM payout WHERE seller = ? ORDER BY month DESC LIMIT 12').bind(s.id).all()).results
  const brought = (await env.DB.prepare("SELECT name FROM seller WHERE via = ? AND status = 'ok'").bind(s.id).all()).results.map((r) => r.name)
  return { month, n: t?.n || 0, sales: t?.sales || 0, owed: t?.owed || 0, pays, brought }
}

/** The step after a month's sales against its target. */
export function nextRate(rate, sales, target) {
  const i = Math.max(0, LADDER.indexOf(rate))
  const r = target > 0 ? sales / target : 0
  return LADDER[r >= UP ? Math.min(i + 1, LADDER.length - 1) : r < DOWN ? Math.max(i - 1, 0) : i]
}

/** On the 1st (Bangkok, from 08:00): last month's statement per seller, posted to #sales, the new
 *  share, and a payout for each seller owed money; `payLink(id)` is Beer's link to pay it. */
export async function monthEnd(env, post, payLink = async () => '', tell = async () => 'off') {
  const bkk = new Date(Date.now() + 7 * 3600e3)
  if (bkk.getUTCDate() !== 1 || bkk.getUTCHours() < 8) return 0
  const month = bkk.toISOString().slice(0, 7)
  const prev = bkkMonth(Date.now() - 2 * 864e5)
  // a lister who has made no page and sold no plan gets no statement (deals.mjs has its own)
  const rows = (await env.DB.prepare("SELECT * FROM seller WHERE status = 'ok' AND (closed IS NULL OR closed < ?) AND (created <= '2026-10-15' OR id IN (SELECT seller FROM site WHERE seller IS NOT NULL) OR id IN (SELECT seller FROM earn WHERE kind = 'plan'))").bind(month).all()).results
  const toBeer = []
  for (const s of rows) {
    await env.DB.prepare('UPDATE seller SET closed = ? WHERE id = ?').bind(month, s.id).run()
    const t = await env.DB.prepare("SELECT COALESCE(SUM(baht > 0),0) AS n, COALESCE(SUM(baht),0) AS sales, COALESCE(SUM(cut),0) AS owed FROM earn WHERE seller = ? AND month = ? AND kind = 'plan'").bind(s.id, prev).first()
    // a seller who started mid-month is held to the part of the month they had
    const days = new Date(Date.UTC(+prev.slice(0, 4), +prev.slice(5, 7), 0)).getUTCDate()
    const had = s.created.slice(0, 7) === prev ? days - Number(s.created.slice(8, 10)) + 1 : days
    const target = Math.round((s.target * Math.max(1, had)) / days)
    const rate = nextRate(s.rate, t.sales, target)
    await env.DB.prepare('UPDATE seller SET rate = ? WHERE id = ?').bind(rate, s.id).run()
    let link = ''
    if (t.owed > 0) {
      const id = 'po' + crypto.getRandomValues(new Uint32Array(2)).reduce((a, x) => a + x.toString(36), '').slice(0, 10).padEnd(10, '0')
      await env.DB.prepare("INSERT OR IGNORE INTO payout (id, seller, month, baht, status, at) VALUES (?,?,?,?,'due',?)").bind(id, s.id, prev, t.owed, new Date().toISOString()).run()
      const po = await env.DB.prepare('SELECT id FROM payout WHERE seller = ? AND month = ?').bind(s.id, prev).first()
      link = await payLink(po.id)
      toBeer.push(`${s.name} ฿${nf(t.owed)}\n${link}`)
    }
    await post(`🧾 **${s.name} · ${prev}**\nPlans sold: ${t.n} · ฿${nf(t.sales)} of ฿${nf(target)} target (${target ? Math.round((t.sales / target) * 100) : 0}%)\n` +
      `Pay ${s.name}: **฿${nf(t.owed)}**${link ? ` (Beer, by PromptPay: ${link})` : ''}\nShare from ${month}: ${rate}%${rate > s.rate ? ' ⬆' : rate < s.rate ? ' ⬇' : ''} (ladder ${LADDER.join(' · ')})`)
  }
  if (toBeer.length) await tell(`จ่ายคนขาย · Pay the sellers (${prev})\n\n${toBeer.join('\n\n')}`)
  return rows.length
}
