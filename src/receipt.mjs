// receipt.mjs — /bk/<id>/receipt: a printable receipt for an accepted booking, Thai and English
// side by side. The id is the guest's own key (the same as the guest page); the maker opens it
// from the Bookings tab. It is a receipt (ใบเสร็จรับเงิน), not a tax invoice. Numbers run 1, 2, 3 …
// within the page, set the first time a receipt is opened. A booking's `paid` is 0 (not yet),
// 1 (in full) or 2 (deposit received); what was paid is read from that and the page's own prices.

import { normalize, amountOf, telHref } from '../public/s/render.mjs'
import { stayTotal } from '../public/s/extras.mjs'
import { payFor } from './book.mjs'

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
const nf = (n) => new Intl.NumberFormat('en', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n)

/** The receipt's number and issue time; set on the first call. { no, at } (no is null if the number could not be set). */
export async function issue(env, bk) {
  if (bk.rcpt) return { no: bk.rcpt, at: bk.rcpt_at }
  const at = new Date().toISOString()
  for (let i = 0; i < 5; i++) {
    try {
      await env.DB.prepare('UPDATE booking SET rcpt = (SELECT COALESCE(MAX(rcpt), 0) + 1 FROM booking WHERE site_id = ?), rcpt_at = ? WHERE id = ? AND rcpt IS NULL').bind(bk.site_id, at, bk.id).run()
      break
    } catch { /* another receipt took the number first: ask for the next */ }
  }
  const r = await env.DB.prepare('SELECT rcpt, rcpt_at FROM booking WHERE id = ?').bind(bk.id).first()
  return { no: r?.rcpt || null, at: r?.rcpt_at || at }
}

/** The deposit the page asks for this booking, in baht (0 when none). */
export function depositAsked(bk, s, d) {
  if (bk.kind === 'room') { const r = payFor(d, s, bk); return Number(r.due ?? r.deposit?.amount ?? 0) || 0 }
  return Number(d.book.deposit) || 0
}

/** What was booked, what it costs, what was paid: numbers in baht, null where the page does not say. */
export function amounts(bk, s, d) {
  let total = null, unit = null, qty = 1
  if (bk.kind === 'room') {
    const room = d.rooms.find((x) => x.id === bk.item)
    total = Number(bk.total) || (room ? stayTotal(room, bk.start, bk.end).total : 0) || null
    qty = Math.max(1, Math.round((Date.parse(bk.end) - Date.parse(bk.start)) / 864e5))
  } else {
    const svc = d.svc.find((x) => x.id === bk.item)
    unit = svc ? amountOf(svc.p) : 0
    qty = Math.max(1, bk.people || 1)
    total = unit > 0 ? unit * qty : null
  }
  const asked = depositAsked(bk, s, d)
  const deposit = total && asked > total ? total : asked
  const paid = bk.paid === 1 ? total : bk.paid === 2 ? deposit || 0 : 0
  const balance = total === null ? null : Math.max(0, total - (paid || 0))
  const how = bk.kind === 'room' ? ({ pp: ['พร้อมเพย์', 'PromptPay'], link: ['ลิงก์ชำระเงินของที่พัก', 'Online payment'], hotel: ['ชำระที่ที่พัก', 'At the property'] })[d.stay.pay] : (d.book.pp ? ['พร้อมเพย์', 'PromptPay'] : null)
  return { total, unit, qty, deposit, paid, balance, how: paid ? how || null : null }
}

const L = (th, en) => `<span class="t">${esc(th)}</span> <span class="e">${esc(en)}</span>`

function fmtDay(ymd, lang, tz) {
  try { return new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-GB', { dateStyle: 'long', timeZone: tz }).format(typeof ymd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? new Date(ymd + 'T00:00:00Z') : new Date(ymd)) } catch { return String(ymd).slice(0, 10) }
}
const fmtTime = (iso, tz) => { try { return new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: tz }).format(new Date(iso)) } catch { return '' } }
/** Both languages of a date: "22 ตุลาคม 2569 · 22 October 2026". */
const both = (x, tz) => `${esc(fmtDay(x, 'th', tz))} · ${esc(fmtDay(x, 'en', tz))}`

/** A page that tells the reader there is no receipt (yet). */
export function noReceipt(bk) {
  const why = bk.status === 'ok' ? '' : bk.status === 'gone' ? ['การจองนี้ถูกยกเลิก', 'This booking was cancelled.'] : bk.status === 'no' ? ['โรงแรมหรือร้านรับจองนี้ไม่ได้', 'This booking was not accepted.'] : ['ใบเสร็จออกหลังที่ร้านยืนยันการจอง', 'The receipt comes after the booking is accepted.']
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Receipt</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fff;color:#111;font:18px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center;padding:20px"><div><h1 style="font-size:26px;margin:0 0 8px">ใบเสร็จรับเงิน · Receipt</h1><p style="margin:0">${esc(why[0])}<br>${esc(why[1])}</p></div></body></html>`
}

export function receiptPage(bk, s, d, { no, at, origin, nonce }) {
  const tz = d.hours.tz
  const title = d.name || s.name
  const a = amounts(bk, s, d)
  const room = bk.kind === 'room' ? d.rooms.find((x) => x.id === bk.item) : null
  const svc = bk.kind === 'svc' ? d.svc.find((x) => x.id === bk.item) : null
  const what = (room || svc)?.n || bk.item
  const nights = room ? a.qty : 0
  const money = (n) => '฿' + nf(n)
  const issued = both(at, tz)
  const noText = no ? String(no).padStart(4, '0') : esc(bk.ref || bk.id.slice(0, 8).toUpperCase())
  const seller = [d.place.addr, d.contact.phone].filter(Boolean)
  const detail = room
    ? `<div class="sub">${L('เช็คอิน', 'Check-in')} ${both(bk.start, 'UTC')} · ${esc(d.stay.in)}<br>${L('เช็คเอาท์', 'Check-out')} ${both(bk.end, 'UTC')} · ${esc(d.stay.out)}<br>${L('ผู้เข้าพัก', 'Guests')} ${bk.people}</div>`
    : `<div class="sub">${both(bk.start, tz)} · ${esc(fmtTime(bk.start, tz))}–${esc(fmtTime(bk.end, tz))}${bk.people > 1 ? `<br>${L('จำนวนคน', 'People')} ${bk.people}` : ''}</div>`
  const qtyCell = room ? `${nights} ${L('คืน', nights === 1 ? 'night' : 'nights')}` : `${a.qty}`
  const amountCell = a.total !== null ? money(a.total) : (svc?.p ? esc(svc.p) : '—')
  const unitNote = !room && a.unit && a.qty > 1 ? `<div class="sub">${money(a.unit)} × ${a.qty}</div>` : ''
  const status = bk.paid === 1 ? ['ชำระแล้ว', 'Paid in full'] : bk.paid === 2 ? ['รับมัดจำแล้ว', 'Deposit received'] : ['ยืนยันการจองแล้ว', 'Booking confirmed']
  const rows = [
    a.total !== null ? [['ราคารวม', 'Total'], money(a.total)] : null,
    a.paid || a.total !== null ? [['ชำระแล้ว', 'Paid'], money(a.paid || 0)] : null,
    a.balance !== null ? [['คงเหลือ', 'Balance'], money(a.balance)] : null,
  ].filter(Boolean)
  return `<!doctype html><html lang="th" translate="no" class="notranslate"><head><meta charset="utf-8"><meta name="google" content="notranslate"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,notranslate"><title>${esc('Receipt ' + noText + ' · ' + title)}</title><link rel="icon" href="/s/ant.svg">
<style>*{box-sizing:border-box}body{margin:0;background:#f2f0ea;color:#111;font:400 17px/1.5 system-ui,-apple-system,'Segoe UI',Thonburi,'Noto Sans Thai',sans-serif}
.bar{max-width:794px;margin:0 auto;padding:14px 16px 0;display:flex;gap:10px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;min-height:54px;padding:10px 24px;border-radius:99px;border:0;background:#ffb000;color:#000;font:800 18px system-ui,sans-serif;cursor:pointer;text-decoration:none}
.btn.g{background:#fff;box-shadow:inset 0 0 0 2px #111}
.sheet{max-width:794px;margin:14px auto 40px;background:#fff;padding:36px 40px;box-shadow:0 2px 14px rgba(0,0,0,.12)}
h1{margin:0;font-size:30px;line-height:1.2}.e{color:#555;font-weight:400}h1 .e{display:block;font-size:20px}.t{font-weight:700}
.not{margin:6px 0 0;font-size:14px;color:#555}
.top{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;border-bottom:2px solid #111;padding-bottom:18px;margin-bottom:18px}
.seller b{font-size:21px}.meta{text-align:right}.meta div{margin:0 0 4px}
table{width:100%;border-collapse:collapse;margin:8px 0}th{text-align:left;font-size:14px;border-bottom:2px solid #111;padding:8px 6px}
td{padding:10px 6px;border-bottom:1px solid #ddd;vertical-align:top}.r{text-align:right;white-space:nowrap}
.sub{font-size:15px;color:#444;margin-top:3px}
.tot td{border:0;padding:5px 6px}.tot .big td{font-size:21px;font-weight:800;border-top:2px solid #111;padding-top:10px}
.st{display:inline-block;margin:14px 0 0;padding:6px 16px;border:2px solid #111;border-radius:99px;font-weight:800}
.foot{margin-top:22px;font-size:14px;color:#555}
@page{size:A4;margin:14mm}
@media print{body{background:#fff;font-size:13pt}.bar{display:none}.sheet{margin:0;max-width:none;padding:0;box-shadow:none}}
@media(max-width:560px){.sheet{padding:22px 16px}.meta{text-align:left}}</style></head><body>
<div class="bar"><button class="btn" id="pr" type="button">${L('บันทึกเป็น PDF', 'Save as PDF')}</button><a class="btn g" href="${esc(origin)}/bk/${esc(bk.id)}">${L('การจองของฉัน', 'My booking')}</a></div>
<main class="sheet">
<div class="top"><div class="seller"><b>${esc(title)}</b>${seller.map((x) => `<div>${esc(x)}</div>`).join('')}${d.tax ? `<div>${L('เลขประจำตัวผู้เสียภาษี', 'Tax ID')}: ${esc(d.tax)}</div>` : ''}</div>
<div class="meta"><h1>ใบเสร็จรับเงิน<span class="e">Receipt</span></h1><p class="not">${L('ไม่ใช่ใบกำกับภาษี', 'Not a tax invoice')}</p></div></div>
<table><tr><td style="border:0;padding:2px 6px 2px 0;width:50%"><div class="sub">${L('เลขที่', 'No.')}</div><b>${noText}</b></td><td style="border:0;padding:2px 0 2px 6px"><div class="sub">${L('วันที่ออก', 'Date issued')}</div><b>${issued}</b></td></tr>
<tr><td style="border:0;padding:8px 6px 2px 0"><div class="sub">${L('ผู้จอง', 'Guest')}</div><b>${esc(bk.name)}</b></td><td style="border:0;padding:8px 0 2px 6px"><div class="sub">${L('รหัสการจอง', 'Booking')}</div><b>${esc(bk.ref || bk.id.slice(0, 8).toUpperCase())}</b></td></tr></table>
<table><tr><th>${L('รายการ', 'Item')}</th><th class="r">${L('จำนวน', 'Qty')}</th><th class="r">${L('จำนวนเงิน', 'Amount')}</th></tr>
<tr><td style="border:0;padding-bottom:2px"><b>${esc(what)}</b></td><td class="r" style="border:0;padding-bottom:2px">${qtyCell}</td><td class="r" style="border:0;padding-bottom:2px">${amountCell}${unitNote}</td></tr>
<tr><td colspan="3" style="padding-top:0">${detail}</td></tr></table>
<table class="tot">${rows.map(([k, v], i) => `<tr class="${i === rows.length - 1 ? 'big' : ''}"><td class="r" style="width:70%">${L(k[0], k[1])}</td><td class="r">${v}</td></tr>`).join('')}
${a.how ? `<tr><td class="r">${L('ช่องทางชำระ', 'Payment')}</td><td class="r">${L(a.how[0], a.how[1])}</td></tr>` : ''}</table>
<span class="st">${L(status[0], status[1])}</span>
<p class="foot">${esc(origin.replace(/^https?:\/\//, ''))}/${esc(s.name)}${d.contact.phone ? ` · <a href="${esc(telHref(d.contact.phone))}" style="color:inherit">${esc(d.contact.phone)}</a>` : ''}</p>
</main><script nonce="${nonce}">document.getElementById('pr').onclick=function(){window.print()}</script></body></html>`
}
