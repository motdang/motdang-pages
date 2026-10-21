// founding.mjs — founding members (NaN 2026-10-16). "Is there a way for people to dip
// their toes into microinvesting in motdang? … maybe people can't pay that much."
// Her pick: a founding membership, paid back in service.
//
//   /founders      the price, the seats left this month, the form, the wall
//   /fm/<link>     the founder's bill (PromptPay QR, the slip), then their page: number, codes
//   /g/<code>      a Gold code: type a page's address, the page is Gold for a year
//                  (a month, for a code from the week on Mot Dang on LINE; motdang.net me.js)
//
// One payment buys two Gold codes (a Gold year each: one to keep, one to give) and a
// number on the wall. Each month has seats; on the 1st the price steps Shoup's way on
// last month's seats: 80% or more taken, up a rung; under 60%, down a rung.

import { promptPayPayload } from './promptpay.mjs'
import { qrSvg } from '../public/s/render.mjs'
import { tellBeer } from './line.mjs'
import * as gold from './gold.mjs'
import { link, readLink, step } from './deals.mjs'

export const LADDER = [2000, 2500, 3000, 4000, 5000] // baht; the top stays under two Gold years
export const START = 3000
export const SEATS = 30 // a month
export const CODES = 2 // Gold years per founder
const LINK_DAYS = 3650

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const nf = (n) => new Intl.NumberFormat('en').format(n)
const baht = (a) => { const [w, s] = String(a).split('.'); return nf(Number(w)) + (s ? '.' + s : '') }
const bkk = (t = Date.now()) => new Date(t + 7 * 3600e3)
export const bkkMonth = (t = Date.now()) => bkk(t).toISOString().slice(0, 7)
const lineShare = (t) => 'https://line.me/R/share?text=' + encodeURIComponent(t)

/** The month after `m` (YYYY-MM). */
export function nextMonth(m) {
  const [y, mo] = m.split('-').map(Number)
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`
}
/** Seats for the first month, from the day it opens: 30 for a whole month. */
export function openingSeats(t = Date.now()) {
  const d = bkk(t)
  const days = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  return Math.max(1, Math.round((SEATS * (days - d.getUTCDate() + 1)) / days))
}
/** The price after a month that sold `sold` of `seats`. */
export const nextPrice = (price, sold, seats) => step(LADDER, price, seats ? sold / seats : 0)

async function sold(env, month) {
  return (await env.DB.prepare("SELECT COUNT(*) AS n FROM founder WHERE status = 'paid' AND month = ?").bind(month).first()).n
}

/** This month's price and seats; a new month steps the price from the months before it. */
export async function thisMonth(env, t = Date.now(), post) {
  const month = bkkMonth(t)
  const row = await env.DB.prepare('SELECT * FROM founding_month WHERE month = ?').bind(month).first()
  if (row) return { ...row, left: Math.max(0, row.seats - (await sold(env, month))) }
  const last = await env.DB.prepare('SELECT * FROM founding_month WHERE month < ? ORDER BY month DESC LIMIT 1').bind(month).first()
  let price = START, seats = openingSeats(t)
  if (last) {
    seats = SEATS
    price = nextPrice(last.price, await sold(env, last.month), last.seats)
    for (let m = nextMonth(last.month); m < month; m = nextMonth(m)) price = nextPrice(price, 0, SEATS) // months nobody opened the page
  }
  await env.DB.prepare('INSERT OR IGNORE INTO founding_month (month, price, seats) VALUES (?,?,?)').bind(month, price, seats).run()
  if (last && post) {
    const n = await sold(env, last.month)
    await Promise.resolve().then(() => post(`🐜 **Founding members · ${last.month}**\nSeats taken: ${n} of ${last.seats} · ฿${nf(n * last.price)}\nPrice from ${month}: ฿${nf(price)}${price > last.price ? ' ⬆' : price < last.price ? ' ⬇' : ''} (ladder ${LADDER.map(nf).join(' · ')})`)).catch((e) => console.error(e))
  }
  return { month, price, seats, left: seats }
}

/** The wall: paid founders, newest first. */
async function wall(env) {
  return (await env.DB.prepare("SELECT n, name, show FROM founder WHERE status = 'paid' ORDER BY n DESC LIMIT 500").all()).results
}

/** A payment for the month's price with a satang tail no other open payment uses. */
async function openPay(env, baht, rand) {
  const used = new Set((await env.DB.prepare("SELECT amount FROM pay WHERE status IN ('open','slip')").all()).results.map((r) => r.amount))
  let tail = 1 + Math.floor(Math.random() * 99)
  for (let i = 0; i < 99 && used.has(`${baht}.${String(tail).padStart(2, '0')}`); i++) tail = (tail % 99) + 1
  const id = rand(12), now = new Date().toISOString()
  await env.DB.prepare("INSERT INTO pay (id, site_id, amount, status, created, updated, months, plan) VALUES (?,'',?,'open',?,?,0,'founding')")
    .bind(id, `${baht}.${String(tail).padStart(2, '0')}`, now, now).run()
  return id
}

/** The form's ask: a founder row and its bill. Null when the form is short or the seats are gone. */
export async function join(env, f, origin, { sha, rand }) {
  const name = String(f.get('name') || '').replace(/\s+/g, ' ').trim().slice(0, 60)
  if (!name) return null
  const m = await thisMonth(env)
  if (m.left < 1) return { full: true }
  const id = rand(12)
  const payId = await openPay(env, m.price, rand)
  await env.DB.prepare('INSERT INTO founder (id, name, show, contact, pay_id, price, made) VALUES (?,?,?,?,?,?,?)')
    .bind(id, name, f.get('show') ? 1 : 0, String(f.get('contact') || '').trim().slice(0, 80) || null, payId, m.price, new Date().toISOString()).run()
  return { link: await link(env, origin, 'fm', id, sha, LINK_DAYS) }
}

/** A founder's slip was good: their number, their codes, a line in #sales. */
export async function paid(env, payId, origin, how, rand) {
  const f = await env.DB.prepare("SELECT founder.*, pay.amount FROM founder JOIN pay ON pay.id = founder.pay_id WHERE founder.pay_id = ? AND founder.status = 'open'").bind(payId).first()
  if (!f) return null
  const n = ((await env.DB.prepare('SELECT MAX(n) AS n FROM founder').first())?.n || 0) + 1
  const now = new Date().toISOString()
  await env.DB.prepare("UPDATE founder SET status = 'paid', n = ?, month = ?, paid_at = ? WHERE id = ?").bind(n, bkkMonth(), now, f.id).run()
  for (let i = 0; i < CODES; i++) await env.DB.prepare('INSERT INTO gift (code, founder, made) VALUES (?,?,?)').bind(rand(10), f.id, now).run()
  await gold.postSales(env, `🐜 **Founding member #${n}** · ฿${f.amount} · ${f.name}${f.show ? '' : ' (not on the wall)'}\n${origin}/founders · ${how}`).catch((e) => console.error(e))
  return n
}

// ---- pages -------------------------------------------------------------------

function shell(title, body, desc) {
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>${desc ? `<meta name="description" content="${esc(desc)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="https://sites.motdang.net/s/founders-card.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Founding members of motdang"><meta name="twitter:card" content="summary_large_image">` : '<meta name="robots" content="noindex">'}
<style>body{margin:0;font:17px/1.45 system-ui,sans-serif;background:#fff8e7;color:#1c1530}main{max-width:560px;margin:0 auto;padding:18px 16px 48px}
h1{font-size:26px;margin:0 0 6px;line-height:1.2}h2{font-size:19px;margin:26px 0 8px}.amt{font-size:34px;font-weight:800;margin:6px 0}.hint{font-size:15px;color:#4a4458}
.card{background:#fff;border:2px solid #1c1530;border-radius:14px;padding:14px;margin:10px 0}.row{display:flex;gap:10px;flex-wrap:wrap}
label{display:block;font-weight:700;margin:10px 0 4px}input{font:inherit;width:100%;box-sizing:border-box;padding:12px;border:2px solid #1c1530;border-radius:10px;background:#fff}
label.tick{display:flex;gap:10px;align-items:center;font-weight:400}label.tick input{width:auto;transform:scale(1.4)}
button,.btn{display:inline-block;font:inherit;font-weight:800;padding:14px 16px;border-radius:12px;border:2px solid #1c1530;cursor:pointer;background:#f5c518;color:#000;text-decoration:none;text-align:center}
button.wide{width:100%}.ghost{background:#fff;color:#1c1530}.line{background:#06c755;color:#fff;border-color:#06c755}
.ok{color:#0a7a32;font-weight:800}.wait{color:#9a5b00;font-weight:800}ul{padding-left:20px}li{margin:6px 0}svg.qr,.qr svg{width:min(260px,72vw);height:auto;display:block;margin:10px auto}a{color:#1c1530}
.seats{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}.seats i{width:14px;height:14px;border-radius:4px;border:2px solid #1c1530;background:#f5c518}.seats i.t{background:#fff}
.wall{display:flex;flex-wrap:wrap;gap:6px;padding:0;list-style:none}.wall li{margin:0;background:#fff;border:2px solid #1c1530;border-radius:999px;padding:4px 12px;font-size:15px}
.hp{position:absolute;left:-9999px}details{margin-top:28px}summary{font-weight:700;cursor:pointer}.code{font:700 22px ui-monospace,monospace;letter-spacing:2px}</style></head>
<body><main>${body}</main></body></html>`
}
const note = (th, en) => shell(en, `<p style="font-size:19px">${esc(th)}<br>${esc(en)}</p><p><a href="/founders">← /founders</a></p>`)

/** /founders */
export async function foundersPage(env, origin) {
  const m = await thisMonth(env)
  const w = await wall(env)
  const p = nf(m.price)
  const seats = Array.from({ length: m.seats }, (_, i) => `<i${i < m.seats - m.left ? ' class="t"' : ''}></i>`).join('')
  const form = m.left > 0 ? `<form method="post" class="card"><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
<label>ชื่อบนกำแพง · Your name for the wall<input name="name" required maxlength="60" autocomplete="name"></label>
<label class="tick"><input type="checkbox" name="show" value="1" checked> แสดงชื่อบนกำแพง · Show my name</label>
<label>LINE หรือเบอร์โทร (ถ้าต้องดูสลิป) · LINE or phone, in case the slip needs a look<input name="contact" maxlength="80" autocomplete="tel"></label>
<p><button class="wide" type="submit">จ่าย ฿${p} · Pay ฿${p}</button></p></form>`
    : `<p class="card"><b>เต็มแล้วเดือนนี้ · Full this month.</b><br>ที่นั่งใหม่เปิดวันที่ 1 · New seats open on the 1st.</p>`
  const desc = `฿${p}: two Gold years for pages on motdang, one to keep and one to give, and a number on the wall.`
  return shell('Founding members · สมาชิกผู้ก่อตั้ง · motdang', `<h1>สมาชิกผู้ก่อตั้ง<br>Founding member</h1>
<p class="amt">฿${p}</p>
<p>ทอง 2 ปี ใช้เองหนึ่ง ให้ใครอีกหนึ่ง และเลขของคุณบนกำแพง<br>Two Gold years: one for your page, one to give. Your number on the wall.</p>
<div class="seats" aria-label="${m.left} of ${m.seats} seats left">${seats}</div>
<p class="hint">เหลือ ${m.left} จาก ${m.seats} ที่ เดือนนี้ · ${m.left} of ${m.seats} seats left this month</p>
${form}
<h2>กำแพง · The wall</h2>${w.length ? `<ul class="wall">${w.map((f) => `<li>#${f.n} ${f.show ? esc(f.name) : '🐜'}</li>`).join('')}</ul>` : '<p class="hint">ยังว่าง · Empty so far. #1 is open.</p>'}
<details><summary>ทำงานอย่างไร · How it works</summary><ul>
<li>โค้ดทองหนึ่งโค้ดทำให้หน้าหนึ่งบน sites.motdang.net เป็นทอง 1 ปี นับจากวันที่ใช้ ส่งให้ใครก็ได้ทาง LINE<br><span class="hint">A Gold code makes one page on sites.motdang.net Gold for a year from the day it's used. Send it to anyone on LINE.</span></li>
<li>ทองปีละ ฿${nf(Number(env.GOLD_THB) || gold.GOLD_THB)} ตามปกติ<br><span class="hint">Gold is ฿${nf(Number(env.GOLD_THB) || gold.GOLD_THB)} a year on its own.</span></li>
<li>เป็นทองจ่ายล่วงหน้า ไม่ใช่หุ้นของมดแดง ไม่คืนเงิน<br><span class="hint">Prepaid Gold, not a share in motdang. No refunds.</span></li>
<li>จ่ายด้วยพร้อมเพย์ ส่งสลิป เลขและโค้ดมาเมื่อสลิปผ่าน<br><span class="hint">Pay by PromptPay and send the slip; the number and codes come once the slip clears.</span></li>
</ul></details>
<p class="hint"><a href="/support">ช่วยมดแดงแบบอื่น · Other ways to support motdang</a></p>`, desc)
}

/** /fm/<link> — the bill until it's paid, then the founder's page. */
async function memberPage(env, id, origin, self) {
  const f = await env.DB.prepare('SELECT founder.*, pay.amount, pay.status AS pst FROM founder JOIN pay ON pay.id = founder.pay_id WHERE founder.id = ?').bind(id).first()
  if (!f) return null
  const keep = `<p class="hint">เก็บลิงก์นี้ไว้ · Keep this link: it is your page.</p><p><a class="btn line" href="${esc(lineShare('motdang · founding member: ' + self))}">ส่งลิงก์ให้ตัวเองทาง LINE · Send it to yourself on LINE</a></p>`
  if (f.status === 'paid') {
    const codes = (await env.DB.prepare('SELECT g.*, s.name AS page FROM gift g LEFT JOIN site s ON s.id = g.site_id WHERE g.founder = ? ORDER BY g.made, g.code').bind(f.id).all()).results
    return shell(`#${f.n} · motdang`, `<h1>#${f.n} ${esc(f.name)}</h1><p class="ok">✓ สมาชิกผู้ก่อตั้ง · Founding member</p>
<h2>โค้ดทอง · Gold codes</h2>${codes.map((c) => {
      const u = `${origin}/g/${c.code}`
      return `<div class="card"><p class="code">${esc(c.code)}</p>${c.used
        ? `<p class="ok">✓ ใช้แล้ว · Used on <a href="/${esc(c.page || '')}">${esc(c.page || '')}</a> · ${esc(c.used.slice(0, 10))}</p>`
        : `<div class="row"><a class="btn" href="/g/${esc(c.code)}">ใช้กับหน้าของฉัน · Use on my page</a><a class="btn line" href="${esc(lineShare('ทองหนึ่งปีสำหรับหน้าของคุณบน motdang · A Gold year for your page on motdang: ' + u))}">ให้ทาง LINE · Give on LINE</a></div>`}</div>`
    }).join('')}
<p><a href="/founders">กำแพง · The wall</a> · <a href="/make">สร้างหน้า · Make a page</a></p>${keep}`)
  }
  if (f.pst === 'slip') return shell('Slip', `<h1>${esc(f.name)}</h1><p class="amt">฿${baht(f.amount)}</p><p class="wait">ได้สลิปแล้ว รอตรวจ · Slip received, waiting for a check.</p>${keep}`)
  if (f.pst === 'refused') return shell('Not paid', `<h1>${esc(f.name)}</h1><p>สลิปไม่ผ่าน · The slip didn't clear. <a href="/founders">ลองใหม่ · Try again</a></p>`)
  const satang = Math.round(Number(f.amount) * 100)
  const qr = env.PROMPTPAY ? qrSvg(promptPayPayload({ payeeId: env.PROMPTPAY, satang, merchantName: 'Mot Dang', ref: 'FOUNDER' }), { dark: '#1c1530', light: '#ffffff', label: 'PromptPay' }) : ''
  return shell('Founding member · bill', `<h1>${esc(f.name)}</h1><p>สมาชิกผู้ก่อตั้ง · Founding member</p><p class="amt">฿${baht(f.amount)}</p>
<p class="hint">จ่ายตรงยอดนี้ รวมสตางค์ · Pay this exact amount, satang too.</p>
<div class="qr">${qr}</div><p class="hint" style="text-align:center">พร้อมเพย์ · PromptPay · Mot Dang</p>
<form method="post" enctype="multipart/form-data" class="card"><label>สลิป · Slip<input type="file" name="slip" accept="image/*" required></label><p><button class="wide" type="submit">ส่งสลิป · Send the slip</button></p></form>${keep}`)
}

/** A code's length of Gold, said both ways: [title th, title en, for-th, for-en]. */
export function span(months = 12) {
  if (months === 12) return ['ทอง 1 ปี', 'A Gold year', 'ทั้งปี', 'for a year']
  if (months === 1) return ['ทอง 1 เดือน', 'A Gold month', 'หนึ่งเดือน', 'for a month']
  return [`ทอง ${months} เดือน`, `Gold for ${months} months`, `${months} เดือน`, `for ${months} months`]
}

/** /g/<code> */
async function giftPage(env, code, msg) {
  const g = await env.DB.prepare('SELECT g.*, f.n, f.name, f.show, s.name AS page FROM gift g LEFT JOIN founder f ON f.id = g.founder LEFT JOIN site s ON s.id = g.site_id WHERE g.code = ?').bind(code).first()
  if (!g || (!g.n && g.source !== 'line')) return null
  const from = g.source === 'line'
    ? 'จากมดแดงทาง LINE · from Mot Dang on LINE'
    : `จากสมาชิกผู้ก่อตั้ง #${g.n}${g.show ? ' ' + esc(g.name) : ''} · from founding member #${g.n}${g.show ? ' ' + esc(g.name) : ''}`
  const [th, en, thFor, enFor] = span(g.months)
  if (g.used) return shell('Gold code', `<h1>${th} · ${en}</h1><p class="hint">${from}</p><p class="ok">✓ ใช้แล้ว · Used on <a href="/${esc(g.page || '')}">sites.motdang.net/${esc(g.page || '')}</a></p>`)
  return shell('Gold code · motdang', `<h1>${th}<br>${en}</h1><p class="hint">${from}</p>
<p>หน้าที่เป็นทอง: ภาษา ลิงก์ Agoda และ Booking.com ${thFor}<br>A Gold page: its languages, its Agoda and Booking.com links, ${enFor}.</p>
${msg ? `<p class="wait">${msg}</p>` : ''}
<form method="post" class="card"><label>หน้าของคุณ · Your page<input name="page" required maxlength="80" placeholder="sites.motdang.net/yourpage" autocapitalize="off" spellcheck="false"></label>
<p><button class="wide" type="submit">ทำให้เป็นทอง · Make it Gold</button></p></form>
<p class="hint">ยังไม่มีหน้า? <a href="/make">สร้างก่อน</a> แล้วกลับมาที่ลิงก์นี้ · No page yet? <a href="/make">Make one</a>, then come back to this link.</p>`)
}

/** The page name in what someone typed: "sites.motdang.net/noi-som", "/noi-som", "noi-som". */
export function pageName(s) {
  const t = String(s || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[?#].*$/, '').replace(/\/+$/, '')
  const last = t.split('/').pop()
  return /^[a-z0-9-]{3,30}$/.test(last) ? last : ''
}

/** A code used on a page: a Gold year for it. */
async function redeem(env, code, input, origin) {
  const name = pageName(input)
  const s = name && await env.DB.prepare("SELECT * FROM site WHERE name = ? AND status != 'removed'").bind(name).first()
  if (!s) return { msg: 'ไม่พบหน้านี้ · No page by that name.' }
  if (gold.isHotel(s) && s.plan === 'hotel') return { msg: 'หน้านี้มีรับจองห้องพักอยู่แล้ว ใช้โค้ดกับหน้าอื่น · This page has hotel booking; use the code on another page.' }
  const r = await env.DB.prepare('UPDATE gift SET site_id = ?, used = ? WHERE code = ? AND used IS NULL').bind(s.id, new Date().toISOString(), code).run()
  if (!r.meta?.changes) return { msg: 'ใช้ไปแล้ว · Already used.' }
  const months = (await env.DB.prepare('SELECT months FROM gift WHERE code = ?').bind(code).first())?.months || 12
  const until = await gold.grant(env, s.id, months, 'gold')
  await gold.postSales(env, `🐜 Gold code used · ${JSON.parse(s.d || '{}').name || s.name} → Gold to ${until}\n${origin}/${s.name}`).catch((e) => console.error(e))
  return { site: s }
}

// ---- routes --------------------------------------------------------------------

/** Answers /founders, /fm/, /g/; null for anything else. */
export async function route(request, env, path, url, origin, H) {
  const post = request.method === 'POST' && H.sameOrigin(request, url)
  if (path === '/founders' || path === '/founders/') {
    if (!post) return H.html(await foundersPage(env, origin), 200)
    const f = await request.formData()
    if (f.get('website')) return Response.redirect(url.origin + '/founders', 303)
    if (!(await H.take(env, await H.sender(request, env), 'founding'))) return H.html(note('ลองใหม่พรุ่งนี้', 'Please try again tomorrow.'), 429)
    const r = await join(env, f, origin, H)
    if (!r) return H.html(note('ใส่ชื่อ', 'A name, please.'), 400)
    if (r.full) return Response.redirect(url.origin + '/founders', 303)
    return Response.redirect(r.link, 303)
  }
  const g = /^\/g\/([a-z0-9]{10})\/?$/.exec(path)
  if (g) {
    if (post) {
      if (!(await H.take(env, await H.sender(request, env), 'gift'))) return H.html(note('ลองใหม่พรุ่งนี้', 'Please try again tomorrow.'), 429)
      const r = await redeem(env, g[1], (await request.formData()).get('page'), origin)
      if (r.site) {
        await H.log(env, r.site.id, 'gift', g[1])
        return Response.redirect(`${url.origin}/${r.site.name}`, 303)
      }
      const body = await giftPage(env, g[1], r.msg)
      return body ? H.html(body, 400) : H.html(note('ไม่พบ', 'Not found.'), 404)
    }
    const body = await giftPage(env, g[1])
    return body ? H.html(body, 200) : H.html(note('ไม่พบ', 'Not found.'), 404)
  }
  if (!path.startsWith('/fm/')) return null
  const q = await readLink(env, 'fm', path, H.sha)
  if (!q) return H.html(note('ไม่พบ', 'Not found.'), 404)
  if (q.expired) return H.html(note('ลิงก์หมดอายุ', 'This link has expired.'), 410)
  if (post) {
    const fd = await request.formData()
    const f = await env.DB.prepare('SELECT founder.*, pay.status AS pst, pay.amount FROM founder JOIN pay ON pay.id = founder.pay_id WHERE founder.id = ?').bind(q.id).first()
    if (!f) return H.html(note('ไม่พบ', 'Not found.'), 404)
    if (f.pst !== 'open' && f.pst !== 'slip') return Response.redirect(url.origin + path, 303)
    if (!(await H.take(env, await H.sender(request, env), 'slip'))) return H.html(note('ลองใหม่พรุ่งนี้', 'Please try again tomorrow.'), 429)
    const file = fd.get('slip')
    if (!file || typeof file === 'string' || !file.size || file.size > 8_000_000) return H.html(note('ส่งรูปสลิป', 'A photo of the slip, please.'), 400)
    const key = `slip/${f.pay_id}`, now = new Date().toISOString()
    await env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || 'image/jpeg' }, customMetadata: { v: 'slip' } })
    const ck = await gold.checkSlip(env, file, Number(f.amount))
    if (ck.ok) {
      await env.DB.prepare("UPDATE pay SET status='paid', slip=?, note=?, updated=? WHERE id=?").bind(key, 'slipok ' + ck.ref, now, f.pay_id).run()
      await paid(env, f.pay_id, origin, 'SlipOK', H.rand)
    } else {
      await env.DB.prepare("UPDATE pay SET status='slip', slip=?, note=?, updated=? WHERE id=?").bind(key, ck.why, now, f.pay_id).run()
      await tellBeer(env, `สลิปสมาชิกผู้ก่อตั้งรอดู · A founding member's slip waits\n${f.name} · ฿${f.amount}${f.contact ? ' · ' + f.contact : ''}\nกดดูแล้วตอบ · Tap to check and answer:\n${await H.slipLink(f.pay_id)}`)
    }
    await H.log(env, '', 'founding-slip', ck.ok ? 'slipok' : ck.why)
    return Response.redirect(url.origin + path, 303)
  }
  const body = await memberPage(env, q.id, origin, url.origin + path)
  return body ? H.html(body, 200) : H.html(note('ไม่พบ', 'Not found.'), 404)
}
