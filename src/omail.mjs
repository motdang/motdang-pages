// omail.mjs — the emails an order sends (Resend, as msg.mjs): to the maker when an order or a slip comes in (Gold pages),
// to the buyer with their order page, then with their downloads once the maker says Paid, then with the tracking number.
// Each goes through mayMail, so the daily mail limits of msg.mjs hold.

import { mail, mayMail } from './msg.mjs'
import { sw } from '../public/s/words-store.mjs'
import { isGold } from './gold.mjs'
import { normalize } from '../public/s/render.mjs'
import { DL_DAYS, DL_TIMES } from './dls.mjs'

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
const lines = (o) => { try { const l = JSON.parse(o.lines); return Array.isArray(l) ? l : [] } catch { return [] } }
const money = (n) => '฿' + new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n / 100)
const ref = (o) => 'OR' + String(o.id).slice(0, 6).toUpperCase()
const box = (inner) => `<div style="font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1530;max-width:560px">${inner}</div>`
const btn = (href, label) => `<p><a href="${esc(href)}" style="display:inline-block;padding:12px 20px;border-radius:99px;background:#ffb000;color:#000;font-weight:800;text-decoration:none">${esc(label)}</a></p>`
const items = (o) => `<ul style="padding-left:20px">${lines(o).map((l) => `<li>${esc(l.t)}${l.opt?.length ? ' (' + esc(l.opt.join(', ')) + ')' : ''} × ${l.q}</li>`).join('')}</ul>`
const plain = (o) => lines(o).map((l) => `${l.t}${l.opt?.length ? ' (' + l.opt.join(', ') + ')' : ''} x ${l.q}`).join('\n')
const titleOf = (s) => { try { return normalize(JSON.parse(s.d || '{}')).name || s.name } catch { return s.name } }

async function toBuyer(env, s, o, subject, html, text) {
  if (!isGold(s) || !o.email || !(await mayMail(env, s.id))) return false // order emails are for Gold pages
  let reply = ''
  try { reply = normalize(JSON.parse(s.d || '{}')).contact.email } catch {}
  return mail(env, { to: o.email, subject: subject.slice(0, 140), html, text, replyTo: reply })
}

/** A new order: the maker (Gold pages that confirmed an email) and the buyer (who left one) hear of it. */
export async function created(env, s, d, o, link, origin) {
  const title = d.name || s.name, lang = o.lang
  if (isGold(s) && s.notify_ok && s.notify_email && (await mayMail(env, s.id))) {
    await mail(env, { to: s.notify_email, replyTo: o.email || '', subject: `ออเดอร์ใหม่ · New order ${ref(o)} — ${title} · ${money(o.total)}`.slice(0, 140),
      html: box(`<p style="margin:0 0 4px;color:#5a4f6a">ออเดอร์ใหม่ รอเงินเข้า · A new order, waiting for payment · ${esc(ref(o))}</p><h2 style="margin:0 0 10px;font-size:22px">${esc(title)}</h2>${items(o)}` +
        `<p style="font-size:19px"><b>${esc(money(o.total))}</b></p><p><b>${esc(o.name)}</b> · ${esc(o.reach || '')}${o.email ? ' · ' + esc(o.email) : ''}</p>` +
        `<p style="font-size:14px;color:#5a4f6a">ดูเงินเข้าแล้วกด "จ่ายแล้ว" ในแท็บ "ออเดอร์" · When the money is in, press Paid in the Orders tab: <a href="${origin}/make">${origin.replace(/^https:\/\//, '')}/make</a></p>`),
      text: `${ref(o)} ${title}\n${plain(o)}\n${money(o.total)}\n${o.name} ${o.reach || ''} ${o.email || ''}\n${origin}/make\n` })
  }
  await toBuyer(env, s, o, `${sw(lang, 'oTitle')} ${ref(o)} — ${title}`,
    box(`<p style="margin:0 0 4px;color:#5a4f6a">${esc(sw(lang, 'oTitle'))} · ${esc(ref(o))}</p><h2 style="margin:0 0 10px;font-size:22px">${esc(title)}</h2>${items(o)}<p style="font-size:19px"><b>${esc(money(o.total))}</b></p><p>${esc(sw(lang, 'oWait'))}</p>${btn(link, sw(lang, 'oPay'))}`),
    `${sw(lang, 'oTitle')} ${ref(o)}\n${title}\n${plain(o)}\n${money(o.total)}\n${link}\n`)
}

/** A slip came in: the maker looks at it. */
export async function slip(env, s, o, origin) {
  if (!isGold(s) || !s.notify_ok || !s.notify_email || !(await mayMail(env, s.id))) return false
  const title = titleOf(s)
  return mail(env, { to: s.notify_email, subject: `สลิปออเดอร์ · Order slip ${ref(o)} — ${title}`.slice(0, 140),
    html: box(`<p style="margin:0 0 6px"><b>${esc(ref(o))}</b> · ${esc(o.name)} · ${esc(money(o.total))}</p><p>ผู้ซื้อส่งสลิปแล้ว ดูในแท็บ "ออเดอร์" · The buyer sent a slip. Look at it in the Orders tab: <a href="${origin}/make">${origin.replace(/^https:\/\//, '')}/make</a></p>`),
    text: `${ref(o)} ${o.name} ${money(o.total)}\n${origin}/make\n` })
}

/** The maker said Paid: the buyer has it, with their downloads. */
export async function paid(env, s, o, link, origin) {
  const lang = o.lang, title = titleOf(s)
  const dls = lines(o).filter((l) => l.k === 'd')
  const goods = lines(o).some((l) => l.k === 'p')
  const dlHtml = dls.length ? `<p><b>${esc(sw(lang, 'oDl'))}</b></p><ul style="padding-left:20px">${dls.map((l) => `<li><a href="${esc(link)}/d/${esc(l.id)}">${esc(l.t)}</a></li>`).join('')}</ul><p style="font-size:14px;color:#5a4f6a">ลิงก์ใช้ได้ ${DL_DAYS} วัน ดาวน์โหลดได้ ${DL_TIMES} ครั้ง · The links work for ${DL_DAYS} days, ${DL_TIMES} downloads each.</p>` : ''
  return toBuyer(env, s, o, `${sw(lang, 'oPaid')} ${ref(o)} — ${title}`,
    box(`<p style="margin:0 0 4px;color:#5a4f6a">${esc(ref(o))}</p><h2 style="margin:0 0 10px;font-size:22px">${esc(sw(lang, 'oPaid'))}</h2><h3 style="margin:0 0 10px">${esc(title)}</h3>${items(o)}${dlHtml}${goods ? `<p>${esc(sw(lang, 'oSoon'))}</p>` : ''}${btn(link, sw(lang, 'oTitle'))}`),
    `${sw(lang, 'oPaid')} ${ref(o)}\n${title}\n${plain(o)}\n${dls.map((l) => `${l.t}: ${link}/d/${l.id}`).join('\n')}\n${link}\n`)
}

/** Mot Dang shipped a parcel: the maker hears what it costs, with the bill to pay in the Orders tab. */
export async function billed(env, s, o, amount, origin) {
  if (!isGold(s) || !s.notify_ok || !s.notify_email || !(await mayMail(env, s.id))) return false
  const title = titleOf(s)
  return mail(env, { to: s.notify_email, subject: `พัสดุส่งแล้ว · Parcel shipped ${ref(o)} — ${title}`.slice(0, 140),
    html: box(`<p style="margin:0 0 6px"><b>${esc(ref(o))}</b> · ${esc(o.name)} · ${esc(o.track || '')}</p><p>มดแดงส่งพัสดุแล้ว ค่าบริการและค่าไปรษณีย์ ฿${esc(amount)} ดูบิลและคิวอาร์ในแท็บ "ออเดอร์" · Mot Dang shipped the parcel. Its fee and postage are ฿${esc(amount)}: the bill and its QR are in the Orders tab: <a href="${origin}/make">${origin.replace(/^https:\/\//, '')}/make</a></p>`),
    text: `${ref(o)} ${o.name} ${o.track || ''}\n฿${amount}\n${origin}/make\n` })
}

/** The parcel is on its way: the buyer gets the tracking number. */
export async function shipped(env, s, o, link) {
  const lang = o.lang, title = titleOf(s)
  return toBuyer(env, s, o, `${sw(lang, 'oTrack')} ${o.track} — ${title}`,
    box(`<p style="margin:0 0 4px;color:#5a4f6a">${esc(ref(o))}</p><h2 style="margin:0 0 10px;font-size:22px">${esc(title)}</h2><p>${esc(sw(lang, 'oTrack'))}: <b>${esc(o.track)}</b></p>${btn(link, sw(lang, 'oTitle'))}`),
    `${sw(lang, 'oTrack')}: ${o.track}\n${title}\n${link}\n`)
}
