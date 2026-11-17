// leads.mjs — homes from the Facebook groups, on the team's board (NaN 2026-11-17: "Move homes to Beer";
// "set it up and make it fly as hell for beer"). fb-groups/fbgroups.py reads the Chiang Mai and Chiang Rai
// groups Mon/Wed/Fri and posts each batch to /leads-in with LEADS_KEY. A team seller's board (/me/<token>,
// seller.team = 1) lists them newest first: call, LINE, the post, a Thai opener to send, a page made from the
// lead, and one tap for called, listed or skip.

export const STATES = ['new', 'called', 'listed', 'no']
const cut = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

/** The phone number and LINE id in a post's contact line, if it prints them. */
export function contactOf(text) {
  const t = String(text || '')
  const m = t.match(/(?:\+66[\s-]?|\b0)\d(?:[\s-]?\d){7,8}\b/)
  let tel = null
  if (m) {
    const d = m[0].replace(/\D/g, '')
    tel = d.startsWith('66') ? '0' + d.slice(2) : d
    if (!/^0\d{8,9}$/.test(tel)) tel = null
  }
  const l = t.match(/LINE\s*(?:ID)?\s*[:：]?\s*(@?[A-Za-z][\w.-]{2,29})/i)
  return { tel, line: l ? l[1] : null }
}

/** POST /leads-in: one batch. Returns how many were new. */
export async function take(env, homes, sha) {
  let n = 0
  const now = new Date().toISOString()
  for (const h of (Array.isArray(homes) ? homes : []).slice(0, 400)) {
    const url = cut(h.url, 500)
    if (!/^https:\/\/(www\.|m\.)?facebook\.com\//.test(url)) continue
    const r = await env.DB.prepare('INSERT OR IGNORE INTO lead (id, url, posted, grp, deal, type, place, price, contact, summary, at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind((await sha(url)).slice(0, 20), url, /^\d{4}-\d\d-\d\d$/.test(h.posted || '') ? h.posted : null, cut(h.group, 120) || null,
        ['rent', 'sale'].includes(h.deal) ? h.deal : null, cut(h.type, 80) || null, cut(h.where, 160) || null, cut(h.price, 120) || null,
        cut(h.contact, 160) || null, cut(h.summary, 300) || null, now).run()
    n += r.meta?.changes || 0
  }
  return n
}

/** How many leads in each state. */
export async function counts(env) {
  const out = Object.fromEntries(STATES.map((s) => [s, 0]))
  for (const r of (await env.DB.prepare('SELECT state, COUNT(*) AS n FROM lead GROUP BY state').all()).results) out[r.state] = r.n
  return out
}

/** Leads in one state, newest post first; deal 'rent' or 'sale' narrows it. */
export async function list(env, state = 'new', deal = '', limit = 40) {
  const st = STATES.includes(state) ? state : 'new'
  const d = ['rent', 'sale'].includes(deal) ? deal : ''
  return (await env.DB.prepare(`SELECT * FROM lead WHERE state = ?${d ? ' AND deal = ?' : ''} ORDER BY COALESCE(posted, substr(at,1,10)) DESC, at DESC LIMIT ?`)
    .bind(...[st, ...(d ? [d] : []), Math.max(1, Math.min(400, Number(limit) || 40))]).all()).results
}

/** One lead to a new state, by a team seller. */
export async function mark(env, id, state, by) {
  if (!STATES.includes(state) || !/^[0-9a-f]{20}$/.test(String(id || ''))) return false
  const r = await env.DB.prepare('UPDATE lead SET state = ?, state_at = ?, state_by = ? WHERE id = ?').bind(state, new Date().toISOString(), by, id).run()
  return !!r.meta?.changes
}

/** The Thai opener to send the owner: who we are, the free listing, the fee only on a deal. */
export function opener(lead, name) {
  const what = lead.deal === 'sale' ? 'ขาย' : 'ให้เช่า'
  const where = lead.place ? ` (${lead.place})` : ''
  return `สวัสดีค่ะ ${name} จาก motdang.net ค่ะ เห็นประกาศ${what}ของคุณในกลุ่มเฟซบุ๊ก${where} ยังว่างอยู่ไหมคะ\n` +
    'ลงประกาศบน motdang.net ได้ฟรีค่ะ จ่ายค่าธรรมเนียมเฉพาะเมื่อปล่อยเช่าหรือขายได้ (เช่าสัญญาหนึ่งปี: ค่าเช่าหนึ่งเดือน · ขาย: 3%)'
}
