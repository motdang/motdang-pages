// guest.mjs — /bk/<id>: a guest's own booking at a hotel's page. The id is the
// long random key in the guest's email; the page shows the stay, what to pay
// the hotel and how, the way to the door, and a button to cancel.

import { normalize, lineHref, telHref, dirHref, LOOKS, onColor } from '../public/s/render.mjs'
import { payFor, describe } from './book.mjs'

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
const WORDS = {
  status: { new: ['รอโรงแรมตอบ', 'Waiting for the hotel'], ok: ['ยืนยันแล้ว', 'Confirmed'], no: ['โรงแรมรับไม่ได้', 'Not available'], gone: ['ยกเลิกแล้ว', 'Cancelled'] },
}

export function guestPage(bk, s, origin, nonce) {
  const d = normalize(JSON.parse(s.d))
  const look = LOOKS[s.look] || LOOKS.poster
  const accent = d.accent || look.accent
  const x = describe(bk, d, 'en')
  const xt = describe(bk, d, 'th')
  const st = WORDS.status[bk.status] || WORDS.status.new
  const pay = bk.status === 'ok' || bk.status === 'new' ? payFor(d, s, bk) : {}
  const nf = (n) => new Intl.NumberFormat('en').format(n)
  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)
  const canCancel = (bk.status === 'new' || bk.status === 'ok') && bk.start > today
  const line = lineHref(d.contact.line)
  const rows = [
    ['ที่พัก · Stay', `${esc(xt.what)}`],
    ['วันที่ · Dates', `${esc(x.when)}`],
    ['เช็คอิน · Check-in', `${esc(d.stay.in)}`], ['เช็คเอาท์ · Check-out', `${esc(d.stay.out)}`],
    ['ผู้เข้าพัก · Guests', String(bk.people)], ['ชื่อ · Name', esc(bk.name)],
  ]
  return `<!doctype html><html lang="th" translate="no" class="notranslate"><head><meta charset="utf-8"><meta name="google" content="notranslate"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,notranslate"><title>${esc(bk.ref || 'Booking')} · ${esc(d.name || s.name)}</title><link rel="icon" href="/s/ant.svg">
<style>:root{${look.vars};--accent:${accent};--on-accent:${onColor(accent)}}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:400 18px/1.55 var(--body)}
.w{max-width:560px;margin:0 auto;padding:28px 16px 80px}.c{background:var(--card);color:var(--ink);border-radius:calc(var(--r) + 6px);padding:22px;margin:0 0 16px;box-shadow:0 8px 28px rgba(0,0,0,.12)}
h1{margin:0 0 4px;font:var(--h1w) clamp(30px,8vw,44px)/1.05 var(--display);text-transform:var(--case)}.ref{font:800 15px ui-monospace,Menlo,monospace;letter-spacing:.08em;opacity:.8}
.st{display:inline-block;margin:12px 0 0;padding:6px 14px;border-radius:99px;font-weight:800;background:${bk.status === 'ok' ? '#0b8043' : bk.status === 'new' ? '#b45309' : '#555'};color:#fff}
table{width:100%;border-collapse:collapse}td{padding:9px 0;border-bottom:1px dashed var(--line);vertical-align:top}td+td{text-align:right;font-weight:700}
.tot{font:800 28px/1.2 var(--display);color:var(--accent);text-align:right;margin:12px 0 0}.qr{width:min(240px,70vw);height:auto;display:block;margin:10px auto;border-radius:12px}
.b{display:flex;align-items:center;justify-content:center;gap:8px;min-height:54px;margin:10px 0 0;padding:10px 18px;border-radius:99px;border:0;background:var(--accent);color:var(--on-accent);font:800 17px var(--body);text-decoration:none;cursor:pointer;width:100%}
.b.g{background:transparent;color:inherit;box-shadow:inset 0 0 0 2px currentColor}.b.l{background:#06c755;color:#000}.m{color:var(--mute);font-size:15px}</style></head><body><main class="w">
<section class="c"><p class="ref">${esc(bk.ref || '')}</p><h1>${esc(d.name || s.name)}</h1><span class="st">${st[0]} · ${st[1]}</span></section>
<section class="c"><table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>${Number(bk.total) ? `<p class="tot">฿${nf(Number(bk.total))}</p>` : ''}</section>
${pay.deposit ? `<section class="c" style="text-align:center"><b>จ่ายตอนนี้ · Pay now ฿${nf(pay.deposit.amount)}</b>${pay.deposit.qr}<p class="m">พร้อมเพย์ เข้าบัญชีโรงแรม · PromptPay to the hotel</p></section>` : ''}
${pay.link ? `<section class="c"><a class="b" href="${esc(pay.link)}" rel="nofollow noopener">จ่ายกับโรงแรม · Pay the hotel${pay.due ? ' ฿' + nf(pay.due) : ''}</a></section>` : ''}
${!pay.deposit && !pay.link && bk.status !== 'gone' && bk.status !== 'no' ? `<section class="c"><p style="margin:0">จ่ายที่โรงแรม · Pay at the hotel</p></section>` : ''}
<section class="c">${d.contact.phone ? `<a class="b g" href="${esc(telHref(d.contact.phone))}">☎ ${esc(d.contact.phone)}</a>` : ''}${line ? `<a class="b l" href="${esc(line)}" rel="nofollow noopener">LINE</a>` : ''}
${d.place.lat !== null ? `<a class="b g" href="${esc(dirHref(d.place.lat, d.place.lng))}" rel="nofollow noopener">นำทาง · Directions</a>` : ''}<a class="b g" href="${origin}/${esc(s.name)}">${esc(origin.replace(/^https:\/\//, ''))}/${esc(s.name)}</a></section>
${d.stay.policy ? `<section class="c"><p class="m" style="margin:0;white-space:pre-wrap">${esc(d.stay.policy)}</p></section>` : ''}
${canCancel ? `<section class="c"><form method="post" action="/api/bk/${esc(bk.id)}/cancel" id="cx"><button class="b g" type="submit">ยกเลิกการจอง · Cancel this booking</button></form></section>
<script nonce="${nonce}">document.getElementById('cx').onsubmit=function(e){if(!confirm('ยกเลิกการจองนี้? · Cancel this booking?'))e.preventDefault()}</script>` : ''}
</main></body></html>`
}
