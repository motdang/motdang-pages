// deals.mjs — listers earn when a listing turns into a deal (NaN 2026-10-16).
// "I want a built-in way for someone like Hom to make money by adding listings to
// home help and real estate on Motdang… Money can transfer when a conversion
// happens, not when listing goes up. Hom's commission could be mid-high, and
// motdang also needs a commission (can be lower)."
//
//   /lister        ask to be a lister (name, phone, LINE, PromptPay); Beer says yes from LINE
//   /me/<token>    the lister's board: pages, taps, terms links, deals, money; record a deal
//   /t/<link>      the owner reads the fee and agrees; the page stays Gold while the terms stand
//   /f/<link>      the owner's bill: the fee worked out, a PromptPay QR, the slip
//   /ya/<link>     Beer: yes to a lister          /yo/<link>  Beer: the lister's share is sent
//
// The owner pays the whole fee to motdang's PromptPay; once the slip is good the
// lister's share goes to Beer on LINE to send that day, and to #sales.
// Real estate fees sit at the Chiang Mai agents' rate. Help fees start at 15%
// (NaN 2026-10-12, "referral 15% of each booking") and step each month, Shoup's way.

import { promptPayPayload } from './promptpay.mjs'
import { qrSvg } from '../public/s/render.mjs'
import { tellBeer } from './line.mjs'
import * as gold from './gold.mjs'
import { kitLink } from './sell.mjs'

export const USES = ['residential', 'commercial', 'industrial']
export const TRADES = ['handyman', 'maid', 'gardener', 'plumber', 'electrician', 'mover']
export const SPLIT_LADDER = [50, 55, 60, 65, 70] // the lister's percent of each fee; starts at 60
export const HELP_LADDER = [5, 10, 15, 20, 25] // percent of a first job; starts at 15
export const HELP_START = 15
const UP = 0.8, DOWN = 0.6
const CONTACT = ['call', 'line', 'msg', 'book', 'whatsapp', 'order', 'email', 'rooms']
const LINK_DAYS = 30

const W = {
  rent: ['เช่า', 'Rent'], buy: ['ซื้อขาย', 'Sale'], help: ['งานบ้าน', 'Home help'],
  residential: ['ที่อยู่อาศัย', 'Residential'], commercial: ['พาณิชย์', 'Commercial'], industrial: ['อุตสาหกรรม', 'Industrial'],
  handyman: ['ช่างซ่อม', 'Handyman'], maid: ['แม่บ้าน', 'Maid'], gardener: ['คนสวน', 'Gardener'],
  plumber: ['ช่างประปา', 'Plumber'], electrician: ['ช่างไฟ', 'Electrician'], mover: ['ขนย้าย', 'Packer · mover'],
}
const two = (k) => (W[k] ? `${W[k][0]} · ${W[k][1]}` : k)

// ---- the money ---------------------------------------------------------------

/** The fee on one deal, whole baht. basis = the month's rent, the price, or the job. */
export function fee({ what, use, basis, months, rate }) {
  const b = Math.round(Number(basis))
  if (!(b > 0)) return 0
  if (what === 'buy') return Math.round(b * 0.03)
  if (what === 'rent') {
    const m = Math.max(1, Math.round(Number(months) || 12))
    if (use === 'commercial' || use === 'industrial') return m >= 12 ? b * Math.min(3, Math.floor(m / 12)) : Math.round(b / 2)
    return m >= 12 ? b : m >= 6 ? Math.round(b / 2) : Math.round(b / 4)
  }
  if (what === 'help') return Math.round((b * (rate || HELP_START)) / 100)
  return 0
}

/** The lister's part and motdang's part of a fee. */
export function split(total, rate) {
  const lister = Math.round((total * rate) / 100)
  return { lister, motdang: total - lister }
}

/** One step on a ladder, Shoup's way: 80% or more up, under 60% down, between stays. */
export function step(ladder, cur, ratio) {
  const i = Math.max(0, ladder.indexOf(cur))
  return ladder[ratio >= UP ? Math.min(i + 1, ladder.length - 1) : ratio < DOWN ? Math.max(i - 1, 0) : i]
}

export async function helpRate(env, trade) {
  return (await env.DB.prepare('SELECT rate FROM fee_rate WHERE trade = ?').bind(trade).first())?.rate || HELP_START
}

/** The fee table an owner agrees to, as lines (Thai · English). */
export function termsLines(what, rate) {
  if (what === 'help') return [
    [`${rate}% ของงานแรกกับลูกค้าใหม่แต่ละคนที่มาจาก motdang`, `${rate}% of the first job with each new customer who came through motdang`],
    ['งานต่อไปกับลูกค้าคนเดิม ไม่มีค่าธรรมเนียม', 'Later jobs with the same customer: no fee'],
    ['คิดเป็นงานหรือเป็นครั้ง ไม่ใช่การจ้างเป็นรายเดือน', 'Per job or per visit; a monthly hire is not a deal here'],
    [`อัตราขยับทุกเดือนตามความต้องการ ${HELP_LADDER[0]}–${HELP_LADDER.at(-1)}% บิลแสดงอัตราของเดือนนั้น`, `The rate moves monthly with demand, ${HELP_LADDER[0]}–${HELP_LADDER.at(-1)}%; the bill shows the month's rate`],
  ]
  return [
    ['เช่า ที่อยู่อาศัย: สัญญา 12 เดือนขึ้นไป ค่าเช่า 1 เดือน · 6–11 เดือน ครึ่งเดือน · ต่ำกว่า 6 เดือน ¼ เดือน', 'Rent, residential: lease of 12 months or more, one month\'s rent · 6–11 months, half · under 6, a quarter'],
    ['เช่า พาณิชย์ · อุตสาหกรรม: ค่าเช่า 1 เดือนต่อปีของสัญญา สูงสุด 3 เดือน · ต่ำกว่า 1 ปี ครึ่งเดือน', 'Rent, commercial · industrial: one month\'s rent per lease year, up to three · under a year, half a month'],
    ['ขาย: 3% ของราคา', 'Sale: 3% of the price'],
    ['จ่ายครั้งเดียว เมื่อเซ็นสัญญาเช่าหรือโอน กับคนที่มาจาก motdang', 'Paid once, when the lease or sale is signed with someone who came through motdang'],
  ]
}

// ---- signed links ------------------------------------------------------------

async function sig(env, k, id, exp, sha) {
  return (await sha(`${env.SESSION_SECRET || 'dev'}|${k}|${id}|${exp}`)).slice(0, 24)
}
export async function link(env, origin, k, id, sha, days = LINK_DAYS) {
  const exp = Math.floor(Date.now() / 1000 + days * 86400).toString(36)
  return `${origin}/${k}/${id}.${exp}.${await sig(env, k, id, exp, sha)}`
}
export async function readLink(env, k, path, sha) {
  const m = new RegExp(`^/${k}/([a-z0-9-]{2,40})\\.([a-z0-9]{1,10})\\.([a-f0-9]{24})$`).exec(path)
  if (!m) return null
  if (parseInt(m[2], 36) * 1000 < Date.now()) return { expired: true }
  if (m[3] !== (await sig(env, k, m[1], m[2], sha))) return null
  return { id: m[1] }
}

// ---- pages -------------------------------------------------------------------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const nf = (n) => new Intl.NumberFormat('en').format(n)
const baht = (a) => { const [w, t] = String(a).split('.'); return nf(Number(w)) + (t ? '.' + t : '') }
const bkkMonth = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 7)
const lineShare = (t) => 'https://line.me/R/share?text=' + encodeURIComponent(t)

function shell(title, body, og = '') {
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)}</title>${og}
<style>body{margin:0;font:17px/1.45 system-ui,sans-serif;background:#fff8e7;color:#1c1530}main{max-width:560px;margin:0 auto;padding:18px 16px 48px}
h1{font-size:24px;margin:0 0 6px}h2{font-size:19px;margin:26px 0 8px}.amt{font-size:34px;font-weight:800;margin:6px 0}.hint{font-size:15px;color:#4a4458}
.card{background:#fff;border:2px solid #1c1530;border-radius:14px;padding:14px;margin:10px 0}.row{display:flex;gap:10px;flex-wrap:wrap}
label{display:block;font-weight:700;margin:10px 0 4px}input,select{font:inherit;width:100%;box-sizing:border-box;padding:12px;border:2px solid #1c1530;border-radius:10px;background:#fff}
button,.btn{display:inline-block;font:inherit;font-weight:800;padding:14px 16px;border-radius:12px;border:2px solid #1c1530;cursor:pointer;background:#f5c518;color:#000;text-decoration:none;text-align:center}
.ghost{background:#fff;color:#1c1530}.line{background:#06c755;color:#fff;border-color:#06c755}table{width:100%;border-collapse:collapse;font-size:15px}td,th{padding:6px 4px;border-bottom:1px solid #d8d0c0;text-align:left;vertical-align:top}
.ok{color:#0a7a32;font-weight:800}.wait{color:#9a5b00;font-weight:800}ul{padding-left:20px}li{margin:6px 0}svg.qr,.qr svg{width:min(260px,72vw);height:auto;display:block;margin:10px auto}a{color:#1c1530}.hp{position:absolute;left:-9999px}</style></head>
<body><main>${body}</main></body></html>`
}
const note = (th, en) => shell(en, `<p style="font-size:19px">${esc(th)}<br>${esc(en)}</p>`)

const LISTER_OG = '<meta property="og:type" content="website"><meta property="og:url" content="https://sites.motdang.net/lister"><meta property="og:title" content="หาเงินจากการลงประกาศ · Earn from listings"><meta property="og:description" content="A share of the fee on every deal you bring."><meta property="og:image" content="https://sites.motdang.net/s/lister-card.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:alt" content="หาเงินจากการลงประกาศ · Earn from listings, on Mot Dang"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://sites.motdang.net/s/lister-card.jpg">'

/** /lister — the ask. */
function applyPage(done) {
  if (done) return shell('Lister', `<h1>ส่งแล้ว · Sent</h1><p>Beer จะตอบทาง LINE หรือโทรศัพท์<br>Beer will answer by LINE or phone.</p>
<div class="card"><p><b>ลิงก์ของคุณ · Your board</b><br><span class="hint">เก็บไว้ ลิงก์นี้คือบัญชีของคุณ · Keep it; this link is your account.</span></p>
<p><a href="${esc(done)}">${esc(done)}</a></p><a class="btn line" href="${esc(lineShare(done))}">ส่งให้ตัวเองทาง LINE · Send to yourself on LINE</a></div>`)
  return shell('Lister', `<h1>หาเงินจากการลงประกาศ · Earn from listings</h1>
<p>ได้ ${SPLIT_LADDER[2]}% ของค่าธรรมเนียมทุกดีลที่ปิดได้<br>Get ${SPLIT_LADDER[2]}% of the fee on every deal you bring.</p>
<form method="post" class="card"><label>ชื่อ · Name<input name="name" required maxlength="60" autocomplete="name"></label>
<label>โทร · Phone<input name="phone" required maxlength="20" inputmode="tel" autocomplete="tel"></label>
<label>พร้อมเพย์ (เบอร์หรือเลขบัตร) · PromptPay (phone or ID number)<input name="promptpay" required maxlength="20" inputmode="numeric"></label>
<details><summary class="hint">เพิ่มเติม (ไม่บังคับ) · More (optional)</summary>
<label>LINE ID<input name="line" maxlength="40"></label>
<label>ย่าน · Area<input name="area" maxlength="60" placeholder="นิมมาน, สันทราย, เชียงราย…"></label></details>
<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
<p><button type="submit">ส่ง · Send</button></p></form>
<details><summary class="hint">ลงอะไรได้บ้าง · What you can list</summary><ul><li>เช่า ขาย ที่อยู่อาศัย พาณิชย์ อุตสาหกรรม · Rent or sale: residential, commercial, industrial</li>
<li>ช่างซ่อม แม่บ้าน คนสวน ช่างประปา ช่างไฟ ขนย้าย · Handyman, maid, gardener, plumber, electrician, packer · mover</li>
<li>ส่วนแบ่งเริ่ม ${SPLIT_LADDER[2]}% ของค่าธรรมเนียม จ่ายวันที่เจ้าของจ่าย · Your share starts at ${SPLIT_LADDER[2]}% of each fee, sent the day the owner pays</li></ul></details>`, LISTER_OG)
}

function slugOf(name) {
  const s = String(name || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20)
  return s.length >= 2 ? s : ''
}

/** A new lister, waiting for Beer. Returns the board link. */
export async function apply(env, f, origin, { sha, rand }) {
  const name = String(f.get('name') || '').trim().slice(0, 60)
  const phone = String(f.get('phone') || '').replace(/[^\d+]/g, '').slice(0, 20)
  const pp = String(f.get('promptpay') || '').replace(/\D/g, '').slice(0, 20)
  if (!name || phone.length < 9 || !(pp.length === 10 || pp.length === 13)) return null
  let id = slugOf(name) || 'l-' + rand(5)
  while (await env.DB.prepare('SELECT 1 FROM seller WHERE id = ?').bind(id).first()) id = (slugOf(name) || 'l').slice(0, 17) + '-' + rand(3)
  const token = rand(24)
  await env.DB.prepare("INSERT INTO seller (id, name, rate, target, created, status, phone, line, promptpay, area, board_hash) VALUES (?,?,?,?,?,'pending',?,?,?,?,?)")
    .bind(id, name, 20, 60000, new Date().toISOString().slice(0, 10), phone, String(f.get('line') || '').slice(0, 40), pp, String(f.get('area') || '').slice(0, 60), await sha(token)).run()
  await tellBeer(env, `คนขอเป็นผู้ลงประกาศ · A new lister asks\n${name} · ${phone}${f.get('line') ? ' · LINE ' + f.get('line') : ''}${f.get('area') ? ' · ' + f.get('area') : ''}\nตกลงไหม · Yes or no:\n${await link(env, origin, 'ya', id, sha, 14)}`)
  return `${origin}/me/${token}`
}

/** The lister a board link opens. */
export async function lister(env, token, sha) {
  if (!/^[a-z0-9]{24}$/.test(token)) return null
  return env.DB.prepare('SELECT * FROM seller WHERE board_hash = ?').bind(await sha(token)).first()
}

async function boardData(env, s) {
  const sites = (await env.DB.prepare("SELECT id, name, kind, d, status FROM site WHERE seller = ? AND status != 'removed' ORDER BY created DESC LIMIT 200").bind(s.id).all()).results
  const ids = sites.map((x) => x.id)
  const from = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10)
  const taps = {}, terms = {}
  if (ids.length) {
    const q = ids.map(() => '?').join(',')
    for (const r of (await env.DB.prepare(`SELECT site_id, SUM(n) AS n FROM hit WHERE m = 'tap' AND k IN (${CONTACT.map(() => '?').join(',')}) AND day >= ? AND site_id IN (${q}) GROUP BY site_id`).bind(...CONTACT, from, ...ids).all()).results) taps[r.site_id] = r.n
    for (const r of (await env.DB.prepare(`SELECT * FROM terms WHERE ended IS NULL AND site_id IN (${q})`).bind(...ids).all()).results) terms[r.site_id] = r
  }
  const deals = (await env.DB.prepare('SELECT deal.*, site.name AS page, earn.cut, earn.paid_out FROM deal JOIN site ON site.id = deal.site_id LEFT JOIN earn ON earn.pay_id = deal.pay_id WHERE deal.seller = ? ORDER BY deal.at DESC LIMIT 100').bind(s.id).all()).results
  return { sites, taps, terms, deals }
}

/** /me/<token> — everything the lister needs on one page. */
async function boardPage(env, s, token, origin, sha, made) {
  const { sites, taps, terms, deals } = await boardData(env, s)
  const month = bkkMonth()
  const mine = deals.filter((d) => d.status === 'paid')
  const earned = mine.filter((d) => d.at.slice(0, 7) === month).reduce((a, d) => a + (d.cut || 0), 0)
  const owed = mine.filter((d) => !d.paid_out).reduce((a, d) => a + (d.cut || 0), 0)
  const out = [`<h1>${esc(s.name)}</h1>`]
  if (s.status !== 'ok') out.push(`<p class="wait">${s.status === 'no' ? 'ไม่ได้รับ · Not taken on' : 'รอ Beer ตอบ · Waiting for Beer'}</p>`)
  out.push(`<p>ส่วนแบ่งของคุณ <b>${s.deal_rate}%</b> ของค่าธรรมเนียม · Your share: <b>${s.deal_rate}%</b> of each fee<br><span class="hint">ขยับทุกเดือน ${SPLIT_LADDER.join(' · ')}% ตามยอดเทียบเป้า ฿${nf(s.deal_target)} · Moves monthly on ${SPLIT_LADDER.join(' · ')}% with fees against a ฿${nf(s.deal_target)} target</span></p>`,
    `<div class="card row"><div style="flex:1"><span class="hint">เดือนนี้ · This month</span><div class="amt">฿${nf(earned)}</div></div><div style="flex:1"><span class="hint">รอโอน · To be sent</span><div class="amt">฿${nf(owed)}</div></div></div>`)
  if (made) out.push(`<div class="card"><p class="ok">บิลพร้อม · Bill ready — ฿${nf(made.fee)}</p><p class="hint">ส่งให้เจ้าของ · Send it to the owner:</p><p><a href="${esc(made.link)}">${esc(made.link)}</a></p><a class="btn line" href="${esc(lineShare('ค่าธรรมเนียม motdang · motdang fee\n' + made.link))}">ส่งทาง LINE · Send on LINE</a></div>`)
  if (s.status === 'ok' && s.key) out.push(`<p><a class="btn" href="${esc(await kitLink(env, sha, origin, s))}">ชุดขาย · Sales kit</a> <span class="hint">QR · คำพูด · ทอง · Gold plans</span></p>`)
  if (s.status === 'ok') out.push(`<h2>ทำหน้าใหม่ · Make a page</h2><p><a class="btn" href="${origin}/make?by=${esc(s.id)}">+ หน้าใหม่ · New page</a></p><p class="hint">หน้าบ้าน ที่ดิน หรือช่าง ทำกับเจ้าของ แล้วส่งเงื่อนไขให้เจ้าของกดตกลง · Make it with the owner, then send them the terms to agree.</p>`)
  out.push('<h2>หน้าของคุณ · Your pages</h2>')
  if (!sites.length) out.push('<p class="hint">ยังไม่มี · None yet.</p>')
  for (const x of sites) {
    const d = JSON.parse(x.d || '{}'), t = terms[x.id]
    const tl = t ? '' : await link(env, origin, 't', x.id, sha)
    out.push(`<div class="card"><b><a href="${origin}/${esc(x.name)}">${esc(d.name || x.name)}</a></b> <span class="hint">· ${esc(x.kind)}${x.status !== 'live' ? ' · ' + esc(x.status) : ''}</span><br>`,
      `<span class="hint">ติดต่อ 30 วัน · Contacts, 30 days:</span> <b>${taps[x.id] || 0}</b><br>`,
      t ? `<span class="ok">✓ ตกลงแล้ว · Terms agreed</span> <span class="hint">${esc(t.name)} · ${t.at.slice(0, 10)} · ${esc(two(t.what === 'help' ? t.trade : 'homes'))}</span>`
        : `<span class="wait">ยังไม่ตกลง · Terms not agreed</span><div class="row" style="margin-top:8px"><a class="btn line" href="${esc(lineShare('เงื่อนไข motdang · motdang terms\n' + tl))}">ส่งเงื่อนไข · Send terms</a></div><p class="hint" style="word-break:break-all">${esc(tl)}</p>`,
      '</div>')
  }
  const agreed = sites.filter((x) => terms[x.id])
  if (agreed.length && s.status === 'ok') {
    const opts = agreed.map((x) => { const d = JSON.parse(x.d || '{}'); return `<option value="${esc(x.id)}">${esc(d.name || x.name)}</option>` + (Array.isArray(d.lists) ? d.lists.map((l) => `<option value="${esc(x.id)}~${esc(l.id)}">↳ ${esc(l.t)}</option>`).join('') : '') }).join('')
    out.push(`<h2>ปิดดีลได้ · A deal closed</h2><form method="post" class="card"><input type="hidden" name="act" value="deal">
<label>หน้า · Page<select name="page" required>${opts}</select></label>
<label>ดีล · Deal<select name="what"><option value="rent">${two('rent')}</option><option value="buy">${two('buy')}</option><option value="help">${two('help')}</option></select></label>
<label>ประเภท (เช่า ขาย) · Use (rent, sale)<select name="use">${USES.map((u) => `<option value="${u}">${two(u)}</option>`).join('')}</select></label>
<label>งาน (งานบ้าน) · Trade (home help)<select name="trade">${TRADES.map((u) => `<option value="${u}">${two(u)}</option>`).join('')}</select></label>
<label>ค่าเช่าต่อเดือน ราคาขาย หรือค่างาน (บาท) · Rent a month, sale price, or the job (baht)<input name="basis" required inputmode="numeric" maxlength="12"></label>
<label>สัญญากี่เดือน (เช่า) · Lease months (rent)<input name="months" inputmode="numeric" maxlength="3" value="12"></label>
<label>ลูกค้า · Customer<input name="who" maxlength="80" placeholder="ชื่อ หรือ LINE · name or LINE"></label>
<p><button type="submit">ทำบิล · Make the bill</button></p></form>`)
  }
  if (deals.length) {
    out.push('<h2>ดีล · Deals</h2><table><tr><th>วันที่ · Date</th><th>หน้า · Page</th><th>ค่าธรรมเนียม · Fee</th><th>ของคุณ · Yours</th></tr>')
    for (const d of deals) {
      const st = d.status === 'paid' ? (d.paid_out ? '<span class="ok">โอนแล้ว · sent</span>' : '<span class="wait">รอโอน · to send</span>') : d.status === 'void' ? 'ยกเลิก · void' : '<span class="hint">รอเจ้าของจ่าย · owner to pay</span>'
      out.push(`<tr><td>${d.at.slice(0, 10)}</td><td>${esc(d.page)}<br><span class="hint">${esc(two(d.what))}${d.use ? ' · ' + esc(two(d.use)) : ''}</span></td><td>฿${nf(d.fee)}</td><td>${d.cut != null ? '฿' + nf(d.cut) : ''}<br>${st}</td></tr>`)
    }
    out.push('</table>')
  }
  return shell(s.name + ' · motdang', out.join(''))
}

/** Record a deal from the board: the fee worked out, a payment opened, the bill link. */
export async function record(env, s, f, origin, { sha, rand }) {
  const [siteId, listing] = String(f.get('page') || '').split('~')
  const site = await env.DB.prepare('SELECT * FROM site WHERE id = ? AND seller = ?').bind(siteId, s.id).first()
  const t = site && await env.DB.prepare('SELECT * FROM terms WHERE site_id = ? AND ended IS NULL').bind(site.id).first()
  if (!t) return null
  const what = t.what === 'help' ? 'help' : ['rent', 'buy'].includes(f.get('what')) ? f.get('what') : 'rent'
  const use = what === 'help' ? null : USES.includes(f.get('use')) ? f.get('use') : 'residential'
  const trade = what === 'help' ? (TRADES.includes(f.get('trade')) ? f.get('trade') : t.trade) : null
  const basis = Math.round(Number(String(f.get('basis') || '').replace(/[^\d.]/g, '')))
  const months = what === 'rent' ? Math.max(1, Math.min(120, Math.round(Number(f.get('months')) || 12))) : null
  const rate = what === 'help' ? await helpRate(env, trade) : null
  const total = fee({ what, use, basis, months, rate })
  if (!(total >= 1) || total > 10_000_000) return null
  const payId = await openPay(env, site.id, total, rand)
  const id = rand(12)
  await env.DB.prepare('INSERT INTO deal (id, site_id, listing, seller, what, use, trade, basis, months, fee, rate, who, pay_id, status, at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, site.id, listing || null, s.id, what, use, trade, basis, months, total, rate, String(f.get('who') || '').slice(0, 80) || null, payId, 'billed', new Date().toISOString()).run()
  return { fee: total, link: await link(env, origin, 'f', payId, sha) }
}

/** A payment for an exact amount with a satang tail no other open payment uses. */
async function openPay(env, siteId, baht, rand) {
  const used = new Set((await env.DB.prepare("SELECT amount FROM pay WHERE status IN ('open','slip')").all()).results.map((r) => r.amount))
  let tail = 1 + Math.floor(Math.random() * 99)
  for (let i = 0; i < 99 && used.has(`${baht}.${String(tail).padStart(2, '0')}`); i++) tail = (tail % 99) + 1
  const id = rand(12), now = new Date().toISOString()
  await env.DB.prepare("INSERT INTO pay (id, site_id, amount, status, created, updated, months, plan) VALUES (?,?,?,'open',?,?,0,'fee')")
    .bind(id, siteId, `${baht}.${String(tail).padStart(2, '0')}`, now, now).run()
  return id
}

/** /t/<link> — the fee, and the owner's yes. */
async function termsPage(env, site, done) {
  const d = JSON.parse(site.d || '{}')
  const help = site.kind === 'service'
  const rates = {}
  if (help) for (const t of TRADES) rates[t] = await helpRate(env, t)
  const all = [...new Set(Object.values(rates))]
  const rate = all.length === 1 ? all[0] : `${Math.min(...all)}–${Math.max(...all)}`
  const seller = site.seller && await env.DB.prepare('SELECT name FROM seller WHERE id = ?').bind(site.seller).first()
  const lines = termsLines(help ? 'help' : 'homes', rate).map(([th, en]) => `<li>${esc(th)}<br><span class="hint">${esc(en)}</span></li>`).join('')
  if (done) return shell('Terms', `<h1>ตกลงแล้ว · Agreed</h1><p>${esc(d.name || site.name)}</p><p>หน้านี้เป็นทอง (ประกาศ จอง ภาษา) ตราบที่เงื่อนไขยังอยู่<br>The page is Gold (listings, bookings, languages) while the terms stand.</p><p><a class="btn" href="/${esc(site.name)}">ดูหน้า · See the page</a></p><ul>${lines}</ul>`)
  return shell('Terms', `<h1>${esc(d.name || site.name)}</h1>
<p>${seller ? `${esc(seller.name)} ลงหน้านี้บน motdang · ${esc(seller.name)} listed this page on motdang.` : ''} ค่าลงประกาศ ไม่มี จ่ายเมื่อปิดดีลได้เท่านั้น<br>Listing costs nothing; the fee is paid only when a deal closes.</p>
<div class="card"><ul>${lines}</ul></div>
<p>หน้านี้เป็นทอง (ประกาศ จอง ภาษา) ตราบที่เงื่อนไขยังอยู่ · The page is Gold (listings, bookings, languages) while the terms stand.</p>
<form method="post" class="card">${help ? `<label>งาน · Trade<select name="trade">${TRADES.map((u) => `<option value="${u}">${two(u)} · ${rates[u]}%</option>`).join('')}</select></label>` : ''}
<label>ชื่อเจ้าของ · Owner's name<input name="name" required maxlength="80" autocomplete="name"></label>
<label>โทร · Phone<input name="phone" required maxlength="20" inputmode="tel" autocomplete="tel"></label>
<p><button type="submit">ตกลง · I agree</button></p></form>`)
}

export async function agree(env, site, f, ipHash) {
  const name = String(f.get('name') || '').trim().slice(0, 80)
  const phone = String(f.get('phone') || '').replace(/[^\d+]/g, '').slice(0, 20)
  if (!name || phone.length < 9) return false
  const help = site.kind === 'service'
  await env.DB.prepare('INSERT INTO terms (site_id, what, trade, seller, name, phone, ip_hash, at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(site_id) DO UPDATE SET what=excluded.what, trade=excluded.trade, name=excluded.name, phone=excluded.phone, ip_hash=excluded.ip_hash, at=excluded.at, ended=NULL')
    .bind(site.id, help ? 'help' : 'homes', help ? (TRADES.includes(f.get('trade')) ? f.get('trade') : 'handyman') : null, site.seller, name, phone, ipHash.slice(0, 16), new Date().toISOString()).run()
  await gold.grant(env, site.id, 12, 'terms')
  return true
}

/** /f/<link> — the owner's bill. */
async function billPage(env, payId) {
  const r = await env.DB.prepare('SELECT deal.*, pay.amount, pay.status AS pst, site.name, site.d FROM deal JOIN pay ON pay.id = deal.pay_id JOIN site ON site.id = deal.site_id WHERE deal.pay_id = ?').bind(payId).first()
  if (!r) return null
  const d = JSON.parse(r.d || '{}')
  const L = r.listing && Array.isArray(d.lists) ? d.lists.find((x) => x.id === r.listing) : null
  const why = r.what === 'help' ? `${r.rate}% × ฿${nf(r.basis)}` : r.what === 'buy' ? `3% × ฿${nf(r.basis)}` : `฿${nf(r.basis)} / เดือน · month · ${r.months} เดือน · months`
  const head = `<h1>${esc(d.name || r.name)}</h1>${L ? `<p>${esc(L.t)}</p>` : ''}<p class="hint">${esc(two(r.what))}${r.use ? ' · ' + esc(two(r.use)) : ''}${r.trade ? ' · ' + esc(two(r.trade)) : ''}${r.who ? ' · ' + esc(r.who) : ''}</p><p class="hint">${why}</p>`
  if (r.status === 'paid' || r.pst === 'paid') return shell('Paid', head + `<p class="amt">฿${baht(r.amount)}</p><p class="ok" style="font-size:22px">✓ จ่ายแล้ว ขอบคุณ · Paid, thank you</p>`)
  if (r.status === 'void') return shell('Void', head + '<p>ยกเลิกแล้ว · This bill was cancelled.</p>')
  if (r.pst === 'slip') return shell('Slip', head + `<p class="amt">฿${baht(r.amount)}</p><p class="wait">ได้สลิปแล้ว รอตรวจ · Slip received, waiting for a check.</p>`)
  const satang = Math.round(Number(r.amount) * 100)
  const qr = env.PROMPTPAY ? qrSvg(promptPayPayload({ payeeId: env.PROMPTPAY, satang, merchantName: 'Mot Dang', ref: 'FEE' }), { dark: '#1c1530', light: '#ffffff', label: 'PromptPay' }) : ''
  return shell('Bill', head + `<p>ค่าธรรมเนียม · Fee</p><p class="amt">฿${baht(r.amount)}</p><p class="hint">จ่ายตรงยอดนี้ รวมสตางค์ · Pay this exact amount, satang too.</p>
<div class="qr">${qr}</div><p class="hint" style="text-align:center">พร้อมเพย์ · PromptPay · Mot Dang</p>
<form method="post" enctype="multipart/form-data" class="card"><input type="hidden" name="act" value="slip"><label>สลิป · Slip<input type="file" name="slip" accept="image/*" required></label><p><button type="submit">ส่งสลิป · Send the slip</button></p></form>
<form method="post"><input type="hidden" name="act" value="wrong"><button class="ghost" type="submit">✕ ไม่ถูกต้อง · This isn't right</button></form>`)
}

/** A fee's slip was good: the deal is paid, the lister's share goes out today. */
export async function paid(env, payId, origin, how, sha) {
  const r = await env.DB.prepare("SELECT deal.*, pay.amount, site.name AS page, site.d FROM deal JOIN pay ON pay.id = deal.pay_id JOIN site ON site.id = deal.site_id WHERE deal.pay_id = ? AND deal.status = 'billed'").bind(payId).first()
  if (!r) return null
  await env.DB.prepare("UPDATE deal SET status = 'paid' WHERE id = ?").bind(r.id).run()
  const s = r.seller && await env.DB.prepare("SELECT * FROM seller WHERE id = ? AND status = 'ok'").bind(r.seller).first()
  const title = JSON.parse(r.d || '{}').name || r.page
  const sp = s ? split(r.fee, s.deal_rate) : { lister: 0, motdang: r.fee }
  if (s) await env.DB.prepare("INSERT OR IGNORE INTO earn (pay_id, seller, site_id, baht, rate, cut, month, at, kind) VALUES (?,?,?,?,?,?,?,?,'fee')")
    .bind(payId, s.id, r.site_id, r.fee, s.deal_rate, sp.lister, bkkMonth(), new Date().toISOString()).run()
  const kind = `${two(r.what)}${r.use ? ' · ' + two(r.use) : ''}${r.trade ? ' · ' + two(r.trade) : ''}`
  await gold.postSales(env, `🏠 **Deal fee** · ฿${r.amount} · ${title} · ${kind}\n${origin}/${r.page} · ${how}` +
    (s ? `\n${s.name} ฿${nf(sp.lister)} (${s.deal_rate}%) · motdang ฿${nf(sp.motdang)}` : '')).catch((e) => console.error(e))
  if (s && sp.lister > 0) await tellBeer(env, `โอนส่วนแบ่ง · Send a lister's share\n${s.name} ฿${nf(sp.lister)} → พร้อมเพย์ PromptPay ${s.promptpay || '(ถาม · ask ' + (s.phone || s.name) + ')'}\n${title} · ค่าธรรมเนียม fee ฿${nf(r.fee)}\nโอนแล้วกด · Tap once sent:\n${await link(env, origin, 'yo', payId, sha, 30)}`)
  return { lister: sp.lister, motdang: sp.motdang }
}

// ---- monthly: the lister's share and each trade's rate, Shoup's way ---------

export async function monthly(env, post) {
  const bkk = new Date(Date.now() + 7 * 3600e3)
  if (bkk.getUTCDate() !== 1 || bkk.getUTCHours() < 8) return 0
  const month = bkk.toISOString().slice(0, 7)
  const prev = bkkMonth(Date.now() - 2 * 864e5)
  let n = 0
  const rows = (await env.DB.prepare("SELECT * FROM seller WHERE status = 'ok' AND (deal_closed IS NULL OR deal_closed < ?)").bind(month).all()).results
  for (const s of rows) {
    await env.DB.prepare('UPDATE seller SET deal_closed = ? WHERE id = ?').bind(month, s.id).run()
    const pages = (await env.DB.prepare('SELECT COUNT(*) AS n FROM terms WHERE seller = ? AND ended IS NULL').bind(s.id).first()).n
    if (!pages) continue
    const t = await env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(baht),0) AS fees, COALESCE(SUM(cut),0) AS cut FROM earn WHERE seller = ? AND month = ? AND kind = 'fee'").bind(s.id, prev).first()
    const rate = step(SPLIT_LADDER, s.deal_rate, s.deal_target ? t.fees / s.deal_target : 0)
    await env.DB.prepare('UPDATE seller SET deal_rate = ? WHERE id = ?').bind(rate, s.id).run()
    await post(`🏠 **${s.name} · deals ${prev}**\nPages with terms: ${pages} · deals paid: ${t.n} · fees ฿${nf(t.fees)} of ฿${nf(s.deal_target)} target\n${s.name}'s share ฿${nf(t.cut)} (sent deal by deal)\nShare from ${month}: ${rate}%${rate > s.deal_rate ? ' ⬆' : rate < s.deal_rate ? ' ⬇' : ''} (ladder ${SPLIT_LADDER.join(' · ')})`)
    n++
  }
  // help: the share of each trade's pages that were contacted at all last month
  const done = await env.DB.prepare('SELECT 1 FROM fee_rate WHERE month = ? LIMIT 1').bind(month).first()
  if (!done) {
    for (const trade of TRADES) {
      const pages = (await env.DB.prepare("SELECT site_id FROM terms WHERE what = 'help' AND trade = ? AND ended IS NULL AND at < ?").bind(trade, prev + '-15').all()).results.map((r) => r.site_id)
      const cur = await helpRate(env, trade)
      let rate = cur
      if (pages.length) {
        const q = pages.map(() => '?').join(',')
        const hit = (await env.DB.prepare(`SELECT COUNT(DISTINCT site_id) AS n FROM hit WHERE m = 'tap' AND k IN (${CONTACT.map(() => '?').join(',')}) AND day >= ? AND day <= ? AND site_id IN (${q})`).bind(...CONTACT, prev + '-01', prev + '-31', ...pages).first()).n
        rate = step(HELP_LADDER, cur, hit / pages.length)
      }
      await env.DB.prepare('INSERT INTO fee_rate (trade, rate, month) VALUES (?,?,?) ON CONFLICT(trade) DO UPDATE SET rate=excluded.rate, month=excluded.month').bind(trade, rate, month).run()
      if (rate !== cur) await post(`🔧 Help fee · ${two(trade)}: ${cur}% → ${rate}% from ${month} (${pages.length} pages)`)
    }
  }
  return n
}

// ---- routes --------------------------------------------------------------------

/** Answers /lister, /me/, /t/, /f/, /ya/, /yo/; null for anything else. */
export async function route(request, env, path, url, origin, H) {
  const m = request.method
  const post = m === 'POST' && H.sameOrigin(request, url)
  if (path === '/lister' || path === '/lister/') {
    if (!post) return H.html(applyPage(), 200)
    const f = await request.formData()
    if (f.get('website')) return H.html(applyPage(origin + '/lister'), 200)
    if (!(await H.take(env, await H.sender(request, env), 'lister'))) return H.html(note('ลองใหม่พรุ่งนี้', 'Please try again tomorrow.'), 429)
    const board = await apply(env, f, origin, H)
    return board ? H.html(applyPage(board), 200) : H.html(note('ใส่ชื่อ โทร และพร้อมเพย์ (10 หรือ 13 หลัก)', 'Name, phone and PromptPay (10 or 13 digits), please.'), 400)
  }
  const me = /^\/me\/([a-z0-9]{24})\/?$/.exec(path)
  if (me) {
    const s = await lister(env, me[1], H.sha)
    if (!s) return H.html(note('ไม่พบ', 'Not found.'), 404)
    let made = null
    if (post) {
      if (s.status !== 'ok' || !(await H.take(env, await H.sender(request, env), 'deal'))) return H.html(note('ยังทำไม่ได้', 'Not now.'), 429)
      made = await record(env, s, await request.formData(), origin, H)
      if (!made) return H.html(note('ตรวจตัวเลขอีกครั้ง', 'Check the numbers and try again.'), 400)
    }
    return H.html(await boardPage(env, s, me[1], origin, H.sha, made), 200)
  }
  const k = /^\/(t|f|ya|yo)\//.exec(path)?.[1]
  if (!k) return null
  const q = await readLink(env, k, path, H.sha)
  if (!q) return H.html(note('ไม่พบ', 'Not found.'), 404)
  if (q.expired) return H.html(note('ลิงก์หมดอายุ ขอลิงก์ใหม่', 'This link has expired; ask for a new one.'), 410)
  if (k === 't') {
    const site = await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(q.id).first()
    if (!site || site.status === 'removed') return H.html(note('ไม่พบ', 'Not found.'), 404)
    if (post) {
      if (!(await H.take(env, await H.sender(request, env), 'terms'))) return H.html(note('ลองใหม่พรุ่งนี้', 'Please try again tomorrow.'), 429)
      if (!(await agree(env, site, await request.formData(), await H.sender(request, env)))) return H.html(note('ใส่ชื่อและเบอร์โทร', 'Name and phone, please.'), 400)
      await H.log(env, site.id, 'terms', site.seller || '')
      return H.html(await termsPage(env, site, true), 200)
    }
    const t = await env.DB.prepare('SELECT 1 FROM terms WHERE site_id = ? AND ended IS NULL').bind(site.id).first()
    return H.html(await termsPage(env, site, !!t), 200)
  }
  if (k === 'f') {
    if (post) {
      const f = await request.formData()
      const pay = await env.DB.prepare("SELECT * FROM pay WHERE id = ? AND plan = 'fee'").bind(q.id).first()
      if (!pay) return H.html(note('ไม่พบ', 'Not found.'), 404)
      if (f.get('act') === 'wrong') {
        const r = await env.DB.prepare('SELECT deal.*, site.d, site.name FROM deal JOIN site ON site.id = deal.site_id WHERE deal.pay_id = ?').bind(pay.id).first()
        await tellBeer(env, `เจ้าของบอกว่าบิลไม่ถูก · An owner says a bill isn't right\n${JSON.parse(r?.d || '{}').name || r?.name} · ฿${pay.amount} · ${r?.seller || ''}\n${origin}/${r?.name || ''}`)
        await H.log(env, pay.site_id, 'fee-wrong', pay.id)
        return H.html(note('ส่งถึง Beer แล้ว จะติดต่อกลับ', 'Sent to Beer, who will be in touch.'), 200)
      }
      if (pay.status !== 'open' && pay.status !== 'slip') return Response.redirect(url.origin + path, 303)
      if (!(await H.take(env, await H.sender(request, env), 'slip'))) return H.html(note('ลองใหม่พรุ่งนี้', 'Please try again tomorrow.'), 429)
      const file = f.get('slip')
      if (!file || typeof file === 'string' || !file.size || file.size > 8_000_000) return H.html(note('ส่งรูปสลิป', 'A photo of the slip, please.'), 400)
      const key = `slip/${pay.id}`, now = new Date().toISOString()
      await env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || 'image/jpeg' }, customMetadata: { v: 'slip' } })
      const ck = await gold.checkSlip(env, file, Number(pay.amount))
      if (ck.ok) {
        await env.DB.prepare("UPDATE pay SET status='paid', slip=?, note=?, updated=? WHERE id=?").bind(key, 'slipok ' + ck.ref, now, pay.id).run()
        await paid(env, pay.id, origin, 'SlipOK', H.sha)
      } else {
        await env.DB.prepare("UPDATE pay SET status='slip', slip=?, note=?, updated=? WHERE id=?").bind(key, ck.why, now, pay.id).run()
        await tellBeer(env, `สลิปค่าธรรมเนียมรอดู · A deal fee slip waits\n฿${pay.amount}\nกดดูแล้วตอบ · Tap to check and answer:\n${await H.slipLink(pay.id)}`)
      }
      await H.log(env, pay.site_id, 'fee-slip', ck.ok ? 'slipok' : ck.why)
      return Response.redirect(url.origin + path, 303)
    }
    const body = await billPage(env, q.id)
    return body ? H.html(body, 200) : H.html(note('ไม่พบ', 'Not found.'), 404)
  }
  if (k === 'ya') {
    const s = await env.DB.prepare('SELECT * FROM seller WHERE id = ?').bind(q.id).first()
    if (!s) return H.html(note('ไม่พบ', 'Not found.'), 404)
    if (post) {
      const act = String((await request.formData()).get('act') || '')
      if (s.status === 'pending' && (act === 'ok' || act === 'no')) await env.DB.prepare('UPDATE seller SET status = ? WHERE id = ?').bind(act, s.id).run()
      return Response.redirect(url.origin + path, 303)
    }
    const body = s.status === 'pending'
      ? `<form method="post" class="row"><button name="act" value="ok">✓ รับ · Yes</button><button class="ghost" name="act" value="no">✕ ไม่รับ · No</button></form>`
      : `<p class="${s.status === 'ok' ? 'ok' : 'wait'}">${s.status === 'ok' ? '✓ รับแล้ว · Taken on' : '✕ ไม่รับ · Not taken on'}</p>`
    return H.html(shell('Lister', `<h1>${esc(s.name)}</h1><p>${esc(s.phone || '')}${s.line ? ' · LINE ' + esc(s.line) : ''}<br>${esc(s.area || '')}<br>พร้อมเพย์ · PromptPay ${esc(s.promptpay || '')}</p>${body}`), 200)
  }
  if (k === 'yo') {
    const e = await env.DB.prepare("SELECT earn.*, seller.name, seller.promptpay FROM earn JOIN seller ON seller.id = earn.seller WHERE earn.pay_id = ? AND earn.kind = 'fee'").bind(q.id).first()
    if (!e) return H.html(note('ไม่พบ', 'Not found.'), 404)
    if (post) {
      await env.DB.prepare('UPDATE earn SET paid_out = COALESCE(paid_out, ?) WHERE pay_id = ?').bind(new Date().toISOString(), q.id).run()
      return Response.redirect(url.origin + path, 303)
    }
    return H.html(shell('Share', `<h1>${esc(e.name)}</h1><p class="amt">฿${nf(e.cut)}</p><p>พร้อมเพย์ · PromptPay ${esc(e.promptpay || '')}</p>` +
      (e.paid_out ? `<p class="ok">✓ โอนแล้ว · Sent ${e.paid_out.slice(0, 10)}</p>` : `<form method="post"><button name="act" value="sent">✓ โอนแล้ว · Sent</button></form>`)), 200)
  }
  return null
}
