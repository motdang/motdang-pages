// orderpage.mjs — two pages without a password: /o/<id>.<sig>, a buyer's own order (what they ordered, how to pay and the
// QR, a slip to send, then downloads and the tracking number), and /sh/<job>.<exp>.<sig>, the team's page for a parcel
// Mot Dang ships (osign.mjs). The buyer's page wears the shop's look and speaks the language the buyer ordered in.

import { LOOKS, lookOf, designOf, onColor, qrSvg } from '../public/s/render.mjs'
import { sw } from '../public/s/words-store.mjs'
import { promptPayPayload } from './promptpay.mjs'
import { state as dlState, DL_TIMES } from './dls.mjs'

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
const nf = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money = (satang) => (satang < 0 ? '−' : '') + '฿' + nf.format(Math.abs(satang) / 100)
const refOf = (id) => 'OR' + String(id).slice(0, 6).toUpperCase()
const linesOf = (o) => { try { const l = JSON.parse(o.lines); return Array.isArray(l) ? l : [] } catch { return [] } }

/** The PromptPay payload for an order's exact total, or ''. */
export function payloadFor(d, s, o) {
  if (!d.pay.pp) return ''
  try { return promptPayPayload({ payeeId: d.pay.pp, satang: o.total, merchantName: (d.name || s.name).replace(/[^\x20-\x7e]/g, '').slice(0, 25) || 'Mot Dang', ref: refOf(o.id) }) } catch { return '' }
}

/** A buyer's order page. h = { link (the signed address), origin, counts ({ dl: n }), now }. */
export function buyerPage(o, s, d, h) {
  const lang = o.lang, S = (k, v) => esc(sw(lang, k, v))
  const look = LOOKS[s.kind ? designOf(s.kind) : lookOf(s.look)], accent = d.accent || look.accent
  const lines = linesOf(o), goods = lines.some((l) => l.k === 'p')
  const open = ['new', 'slip', 'no'].includes(o.status)
  const stat = { new: ['oWait', '#b45309'], slip: ['oSlipIn', '#b45309'], paid: ['oPaid', '#0b8043'], no: ['oNo', '#b3261e'], gone: ['oGone', '#555'] }[o.status] || ['oWait', '#b45309']
  const payload = open ? payloadFor(d, s, o) : ''
  const path = new URL(h.link).pathname
  const row = (l) => `<tr><td>${esc(l.t)}${l.opt?.length ? `<br><small>${esc(l.opt.join(' · '))}</small>` : ''}</td><td>× ${l.q}</td><td>${esc(money(l.u * l.q))}</td></tr>`
  const sum = [[S('tSub'), o.sub], ...(o.disc ? [[S('tDisc') + (o.code ? ' ' + esc(o.code) : ''), -o.disc]] : []), ...(goods ? [[S('tShip'), o.delivery]] : [])]
  const dls = lines.filter((l) => l.k === 'd')
  const dlRows = dls.map((l) => {
    const st = dlState(o, h.counts[l.id] || 0, h.now)
    const left = Math.max(0, DL_TIMES - (h.counts[l.id] || 0))
    return `<li><span>${esc(l.t)}</span>` + (st === 'ok' ? `<a class="b" href="${esc(path)}/d/${esc(l.id)}">${S('dl1')}<small>${S('oDlLeft', { n: left })}</small></a>` : `<em>${S(st === 'wait' ? 'oDlWait' : 'oDlEnd')}</em>`) + '</li>'
  })
  return `<!doctype html><html lang="${esc(lang)}" translate="no" class="notranslate"><head><meta charset="utf-8"><meta name="google" content="notranslate"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,notranslate"><title>${esc(refOf(o.id))} · ${esc(d.name || s.name)}</title><link rel="icon" href="/s/ant.svg">
<style>:root{${look.vars};--accent:${accent};--on-accent:${onColor(accent)}}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:400 18px/1.55 var(--body)}
.w{max-width:560px;margin:0 auto;padding:28px 16px 80px}.c{background:var(--card);color:var(--ink);border-radius:calc(var(--r) + 6px);padding:22px;margin:0 0 16px;box-shadow:0 8px 28px rgba(0,0,0,.12)}
h1{margin:0 0 4px;font:var(--h1w) clamp(28px,8vw,40px)/1.05 var(--display);text-transform:var(--case)}h1 a{color:inherit;text-decoration:none}.ref{font:800 15px ui-monospace,Menlo,monospace;letter-spacing:.08em;opacity:.8}
.st{display:inline-block;margin:12px 0 0;padding:6px 14px;border-radius:99px;font-weight:800;color:#fff;background:${stat[1]}}
table{width:100%;border-collapse:collapse}td{padding:9px 0;border-bottom:1px dashed var(--line);vertical-align:top}td+td{text-align:right;white-space:nowrap;padding-left:10px}small{color:var(--mute);font-weight:400}
.sum div{display:flex;justify-content:space-between;padding:3px 0}.tot{font:800 28px/1.2 var(--display);color:var(--accent);display:flex;justify-content:space-between;margin-top:8px}
.qr{width:min(260px,72vw);height:auto;display:block;margin:10px auto;border-radius:12px}.amt{font:800 30px/1.2 var(--display);text-align:center}.m{color:var(--mute);font-size:15px}
.b{display:flex;align-items:center;justify-content:center;gap:8px;min-height:54px;margin:10px 0 0;padding:10px 18px;border-radius:99px;border:0;background:var(--accent);color:var(--on-accent);font:800 17px var(--body);text-decoration:none;cursor:pointer;width:100%}
.b small{color:inherit;opacity:.8}.b.g{background:transparent;color:inherit;box-shadow:inset 0 0 0 2px currentColor}input[type=file]{width:100%;margin:10px 0 0;font:600 16px var(--body)}
ul.dl{list-style:none;margin:0;padding:0}ul.dl li{padding:8px 0;border-bottom:1px dashed var(--line)}ul.dl li span{display:block;font-weight:700}ul.dl em{color:var(--mute)}</style></head><body><main class="w">
<section class="c"><p class="ref">${esc(refOf(o.id))}</p><h1><a href="${esc(h.origin)}/${esc(s.name)}">${esc(d.name || s.name)}</a></h1><span class="st">${S(stat[0])}</span></section>
<section class="c"><b>${S('oItems')}</b><table>${lines.map(row).join('')}</table><div class="sum">${sum.map(([k, v]) => `<div><span>${k}</span><span>${esc(money(v))}</span></div>`).join('')}</div><div class="tot"><span>${S('tTotal')}</span><span>${esc(money(o.total))}</span></div></section>
${payload ? `<section class="c" style="text-align:center"><b>${S('oPay')}</b>${qrSvg(payload, { dark: '#0e1f3d', light: '#ffffff', label: 'PromptPay' })}<p class="amt">${esc(money(o.total))}</p><p class="m">${S('oScan', { a: esc(money(o.total)) })}</p></section>` : ''}
${open ? `<section class="c"><b>${S('oSlip')}</b><p class="m">${S('oSlipHint')}</p><form method="post" action="${esc(path)}/slip" enctype="multipart/form-data"><input type="file" name="slip" accept="image/*" required><button class="b" type="submit">${S('oSend')}</button></form></section>` : ''}
${dlRows.length ? `<section class="c"><b>${S('oDl')}</b><ul class="dl">${dlRows.join('')}</ul></section>` : ''}
${goods ? `<section class="c"><b>${S('oShipTo')}</b><p style="white-space:pre-wrap;margin:6px 0 0">${esc(o.name)}\n${esc(o.addr)}${o.cc ? '\n' + esc(o.cc) : ''}</p>` +
    (o.track ? `<p style="margin:12px 0 0">${S('oTrack')}: <b>${esc(o.track)}</b></p>` : o.status === 'paid' ? `<p class="m" style="margin:12px 0 0">${S(o.mot ? 'oMot' : 'oSoon')}</p>` : '') + '</section>' : ''}
<section class="c"><a class="b g" href="${esc(h.origin)}/${esc(s.name)}">${S('oShop')}</a><p class="m" style="margin:12px 0 0">${S('oKeep')}</p></section>
</main></body></html>`
}

/** The team's page for a parcel: what is in it, where it goes, and the two buttons. h = { link, error }. */
export function teamPage(job, o, s, d, h) {
  const lines = linesOf(o).filter((l) => l.k === 'p')
  const c = d.contact
  const done = job.status === 'sent'
  const stat = { wait: ['รอรับพัสดุจากร้าน', 'Waiting for the shop to bring it'], got: ['รับพัสดุแล้ว รอส่ง', 'Received, to ship'], sent: ['ส่งแล้ว', 'Shipped'] }[job.status]
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>พัสดุ · Parcel · ${esc(d.name || s.name)}</title>
<style>body{margin:0;font:17px/1.45 system-ui,sans-serif;background:#fff8e7;color:#1c1530}main{max-width:480px;margin:0 auto;padding:18px 16px 40px}
h1{font-size:22px;margin:0 0 4px}.hint{font-size:15px;color:#4a4458}.card{background:#fff;border:2px solid #1c1530;border-radius:12px;padding:12px 14px;margin:12px 0}
ul{margin:6px 0 0;padding-left:20px}label{display:block;margin:10px 0 0;font-weight:700}input{width:100%;font:inherit;padding:12px;border-radius:10px;border:2px solid #1c1530}
button{width:100%;margin-top:10px;font:inherit;font-weight:800;padding:16px;border-radius:12px;border:2px solid #1c1530;background:#f5c518;cursor:pointer}.err{color:#b3261e;font-weight:700}.ok{font-size:22px;font-weight:800}</style></head>
<body><main><h1>${esc(d.name || s.name)}</h1><p class="hint">${esc(refOf(o.id))} · ${esc(stat[0])} · ${esc(stat[1])}</p>
<div class="card"><b>ของในพัสดุ · In the parcel</b><ul>${lines.map((l) => `<li>${esc(l.t)}${l.opt?.length ? ' (' + esc(l.opt.join(', ')) + ')' : ''} × ${l.q}</li>`).join('')}</ul><p class="hint">${o.grams} g</p></div>
<div class="card"><b>ส่งไปที่ · Send to</b><p style="white-space:pre-wrap;margin:6px 0 0">${esc(o.name)}\n${esc(o.addr)}\n${esc(o.cc)}\n${esc(o.reach || '')} ${esc(o.email || '')}</p></div>
<div class="card"><b>ร้าน · The shop</b><p style="margin:6px 0 0">${esc(c.phone || '')} ${esc(c.line || '')} ${esc(c.email || '')}</p></div>
${h.error ? `<p class="err">${esc(h.error)}</p>` : ''}
${done ? `<p class="ok">✓ ส่งแล้ว · Shipped</p><p>${esc(job.track)} · ฿${nf.format(job.postage / 100)} + ฿${nf.format(job.fee / 100)}</p>` : `${job.status === 'wait' ? `<form method="post"><input type="hidden" name="act" value="got"><button>📥 รับพัสดุจากร้านแล้ว<br>Received from the shop</button></form>` : ''}
<form method="post"><input type="hidden" name="act" value="sent"><label>เลขพัสดุ · Tracking number<input name="track" required minlength="3" maxlength="60" autocomplete="off"></label>
<label>ค่าส่งที่จ่ายไป (บาท) · Postage paid (baht)<input name="postage" type="number" inputmode="decimal" min="0" step="any" value="0"></label><button>📦 ส่งแล้ว<br>Shipped</button></form>`}
</main></body></html>`
}
