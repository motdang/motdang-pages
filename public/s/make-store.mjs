// make-store.mjs — the builder's parts for the online shop and the online business (Nan 2026-10-26): products, shipping
// and a discount code, downloads, and the Orders tab. make.js calls these with its own helpers (h).

import { PR_MAX, prCap, DL_MAX, DL_BYTES, DL_TYPES } from './store.mjs'
import { qrSvg } from './render.mjs'

export const newProduct = (rid) => ({ id: rid(), t: '', p: '', old: '', note: '', photos: [], opts: '', stock: null, g: 0, status: 'open' })
export const newDl = (rid) => ({ id: rid(), t: '', p: '', note: '', file: null })

// folds the maker opened, kept across redraws; a new row starts open
const opened = new Set()
const sending = new Set()
export function storeToggle(e) {
  const f = e.target
  if (f.matches && f.matches('details.srow')) f.open ? opened.add(f.dataset.sr) : opened.delete(f.dataset.sr)
}

const CSS = `<style>.srow{min-width:0}.srow>summary{display:flex;align-items:center;gap:10px;list-style:none;cursor:pointer;padding:0 40px 10px 0;min-height:56px}.srow>summary::-webkit-details-marker{display:none}
.srow .th{flex:none;width:56px;height:56px;border-radius:8px;overflow:hidden;background:var(--soft,#eee);display:grid;place-items:center}.srow .th img{width:100%;height:100%;object-fit:cover}
.srow .sm{display:flex;flex-direction:column;min-width:0;flex:1}.srow .sm b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.srow .sm small{color:var(--mute)}
.srow .chosen{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;margin:0 0 8px}.srow .chosen figure{position:relative;margin:0}.srow .chosen img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px}
.srow .chosen button{position:absolute;right:4px;top:4px;width:30px;height:30px;border:0;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;font:700 16px/1 system-ui;cursor:pointer}
.srow .shoot{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:52px;border-radius:14px;background:var(--ink);color:#fff;font-weight:800;cursor:pointer}.srow .shoot input{display:none}
.srow details.more>summary{cursor:pointer;font-weight:700;margin:8px 0}.srow .over{opacity:.5}.srow textarea{min-height:64px}
.dlfile{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px}.dlfile b{overflow-wrap:anywhere}.dlfile .pick input{display:none}
.motbox{margin:12px 0 0;padding:12px 14px;border-radius:14px;background:var(--soft,#f4efe6)}.motbox p{margin:6px 0 0}
.ord{display:flex;flex-direction:column;gap:6px}.ord .lines{margin:0;padding-left:18px}.ord .tot{font-weight:800;font-size:18px}.ord .chip{display:inline-block;padding:2px 10px;border-radius:99px;color:#fff;font:700 13px/1.6 system-ui;background:#b45309}
.ord.paid .chip{background:#0b8043}.ord.gone .chip{background:#555}.ord.no .chip{background:#b3261e}.ord .trk{display:flex;gap:8px}.ord .trk input{flex:1;min-width:0}
.bill .qr{width:180px;height:180px;display:block;margin:8px 0}.bill form{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}</style>`

const money = (n, lang) => '฿' + new Intl.NumberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

/** The Products section. h = make.js's helpers: S, T, val, esc, icon, imgUrl, photoPick, rowX, seg, isGold. */
export function productsSec(h) {
  const { S, T, val, esc, icon, imgUrl, photoPick, rowX, seg, isGold } = h
  const gold = isGold()
  const cap = prCap(gold)
  const note = S.d.pay.pp ? '' : `<p class="glocked">${T('pr_nopay')} <button class="linkbtn" data-add="pay">${T('pr_payBtn')} →</button></p>`
  const rows = S.d.products.map((x, i) => {
    const isOpen = !x.t || opened.has(x.id)
    const sub = [T(x.status === 'sold' ? 'pr_sold' : 'pr_open'), x.p && '฿' + x.p, gold && x.stock !== null && x.stock !== '' && x.stock !== undefined ? T('pr_left').replace('{n}', x.stock) : ''].filter(Boolean).join(' · ')
    const chosen = x.photos.map((id, k) => `<figure><img src="${esc(imgUrl(id, true))}" alt=""><button type="button" data-prrm="${i}.${k}" aria-label="×">×</button></figure>`).join('')
    return `<details class="rowc srow${i >= cap ? ' over' : ''}" data-sr="${esc(x.id)}"${isOpen ? ' open' : ''}>${rowX('products', i)}
      <summary><span class="th">${x.photos[0] ? `<img src="${esc(imgUrl(x.photos[0], true))}" alt="">` : icon('basket')}</span><span class="sm"><b>${esc(x.t) || T('pr_t')}</b><small>${esc(sub)}</small></span></summary>
      <label class="field"><span>${T('pr_t')}</span><input data-k="products.${i}.t" value="${val(x.t)}" maxlength="100" placeholder="${T('pr_tEx')}"></label>
      <div class="grid2f"><label class="mini"><span>${T('pr_p')}</span><input data-k="products.${i}.p" value="${val(x.p)}" maxlength="14" inputmode="decimal"></label>
      <label class="mini"><span>${T('pr_old')}</span><input data-k="products.${i}.old" value="${val(x.old)}" maxlength="14" inputmode="decimal"></label></div>
      <div class="field"><span>${T('pr_status')}</span>${seg(`products.${i}.status`, x.status, [['open', T('pr_open')], ['sold', T('pr_sold')]])}</div>
      ${x.photos.length ? `<div class="chosen">${chosen}</div>` : ''}
      ${x.photos.length < PR_MAX.photos ? `<label class="shoot">${icon('camera')}${T('pr_shoot')}<input type="file" accept="image/*" multiple data-prfile="${i}"></label>` : ''}
      ${S.d.photos.length ? `<details class="more"><summary>${T('pr_pick')}</summary>${photoPick(`products.${i}.photos`, x.photos)}</details>` : ''}
      <div class="grid2f"><label class="mini"><span>${T('pr_g')}</span><input data-k="products.${i}.g" value="${val(x.g || '')}" maxlength="6" inputmode="numeric"></label>
      ${gold ? `<label class="mini"><span>${T('pr_stock')}</span><input data-k="products.${i}.stock" value="${val(x.stock)}" maxlength="5" inputmode="numeric" placeholder="${T('pr_stockHint')}"></label>` : ''}</div>
      ${gold ? `<label class="field"><span>${T('pr_opts')}</span><textarea data-k="products.${i}.opts" maxlength="300" placeholder="${esc(T('pr_optsEx'))}">${val(x.opts)}</textarea><small>${T('pr_optsHint')}</small></label>` : `<p class="hint">${T('pr_goldOnly')}</p>`}
      <label class="field"><span>${T('pr_note')}</span><textarea data-k="products.${i}.note" maxlength="2000">${val(x.note)}</textarea></label>
      ${S.status === 'live' && x.t ? `<a class="linkbtn" href="/${esc(S.name)}/p/${esc(x.id)}" target="_blank">${icon('globe')}${T('pr_page')}</a>` : ''}</details>`
  })
  return `${CSS}${note}<p class="hint">${T('pr_hint')}${gold ? '' : ' ' + T('pr_free')}</p><div class="rows">${rows.join('')}</div>
    ${S.d.products.length < PR_MAX.gold ? `<button class="go ghost" data-addrow="products">${icon('plus')}${T('pr_add')}</button>` : ''}`
}

/** The Shipping and discount section: prices, free over, a code, and Ship with Mot Dang (Gold). */
export function shipSec(h) {
  const { S, T, val, esc, isGold } = h
  const sh = S.d.ship, dc = S.d.disc, gold = isGold()
  const info = S.shipinfo || { fees: { th: 100, world: 500 }, drop: '48–49 Thai Wiwat Alley, Wiang, Mueang Chiang Rai 57000' }
  const fill = (k, v) => Object.entries(v).reduce((t, [a, b]) => t.split('{' + a + '}').join(b), h.ui(S.lang, k))
  const mot = gold
    ? `<label class="check"><input type="checkbox" class="sw" data-k="ship.mot" ${sh.mot ? 'checked' : ''}>${T('sh_mot')}</label>` + (sh.mot ? `<div class="motbox"><p>${T('sh_motWhy')}</p><p>${esc(fill('sh_fees', { th: info.fees.th, world: info.fees.world }))}</p><p><b>${esc(info.drop ? fill('sh_drop', { a: info.drop }) : h.ui(S.lang, 'sh_pickup'))}</b></p></div>` : '')
    : `<label class="check"><input type="checkbox" class="sw" disabled>${T('sh_mot')}</label><p class="hint">${T('goldLock')}. <button class="linkbtn" data-tab="gold">${T('goldOpen')} →</button></p>`
  return `${CSS}<p class="hint">${T('sh_why')}</p>
    <div class="grid3f"><label class="mini"><span>${T('sh_th')}</span><input data-k="ship.th" value="${val(sh.th)}" maxlength="14" inputmode="decimal"></label>
    <label class="mini"><span>${T('sh_world')}</span><input data-k="ship.world" value="${val(sh.world)}" maxlength="14" inputmode="decimal"></label>
    <label class="mini"><span>${T('sh_free')}</span><input data-k="ship.free" value="${val(sh.free)}" maxlength="14" inputmode="decimal"></label></div>
    <p class="hint">${T('sh_thHint')} · ${T('sh_worldHint')} · ${T('sh_freeHint')}</p>${mot}
    <b style="display:block;margin:16px 0 4px">${T('sh_disc')}</b>${gold ? `<div class="grid2f"><label class="mini"><span>${T('sh_code')}</span><input data-k="disc.code" value="${val(dc.code)}" maxlength="24" autocapitalize="characters"></label>
    <label class="mini"><span>${T('sh_off')}</span><input type="number" data-k="disc.off" value="${val(dc.off || '')}" min="0" max="90" inputmode="numeric"></label></div><p class="hint">${T('sh_codeHint')}</p>`
    : `<p class="hint">${T('goldLock')}. <button class="linkbtn" data-tab="gold">${T('goldOpen')} →</button></p>`}`
}

/** The Downloads section (Gold): a name, a price, and the file. */
export function dlsSec(h) {
  const { S, T, val, esc, icon, rowX } = h
  const note = S.d.pay.pp ? '' : `<p class="glocked">${T('dl_nopay')} <button class="linkbtn" data-add="pay">${T('pr_payBtn')} →</button></p>`
  const rows = S.d.dls.map((x, i) => {
    const isOpen = !x.t || opened.has(x.id)
    const size = x.file && x.file.size ? (x.file.size >= 1048576 ? (x.file.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(x.file.size / 1024)) + ' KB') : ''
    const file = sending.has(x.id) ? `<p class="hint">${T('dl_up')}</p>` : `<div class="dlfile">${x.file ? `<b>${esc(x.file.name)}${size ? ' · ' + size : ''}</b>` : `<span class="hint">${T('dl_none')}</span>`}
      <label class="go ghost small pick">${icon('download')}${T(x.file ? 'dl_swap' : 'dl_pick')}<input type="file" accept=".pdf,.zip,.epub,.mp3,.mp4" data-dlfile="${i}"></label></div><p class="hint">${T('dl_types')}</p>`
    return `<details class="rowc srow" data-sr="${esc(x.id)}"${isOpen ? ' open' : ''}>${rowX('dls', i)}
      <summary><span class="th">${icon('download')}</span><span class="sm"><b>${esc(x.t) || T('dl_t')}</b><small>${esc([x.p && '฿' + x.p, x.file ? x.file.name : T('dl_none')].filter(Boolean).join(' · '))}</small></span></summary>
      <label class="field"><span>${T('dl_t')}</span><input data-k="dls.${i}.t" value="${val(x.t)}" maxlength="100" placeholder="${T('dl_tEx')}"></label>
      <label class="mini"><span>${T('dl_p')}</span><input data-k="dls.${i}.p" value="${val(x.p)}" maxlength="14" inputmode="decimal"></label>
      <label class="field"><span>${T('dl_note')}</span><input data-k="dls.${i}.note" value="${val(x.note)}" maxlength="400"></label>${file}</details>`
  })
  return `${CSS}${note}<p class="hint">${T('dl_why')}</p><div class="rows">${rows.join('')}</div>
    ${S.d.dls.length < DL_MAX ? `<button class="go ghost" data-addrow="dls">${icon('plus')}${T('dl_add')}</button>` : ''}`
}

/** A file picked for download `i`: sent to /api/dl, kept private; the row then names it. h = { S, T, toast, redrawSec, changed }. */
export async function dlSend(h, i, file) {
  const { S, T, toast, redrawSec, changed } = h
  const x = S.d.dls[i]
  if (!x || !file) return
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(file.name)?.[1] || '').toLowerCase()
  if (!DL_TYPES[ext]) return toast(T('dl_type'))
  if (file.size > DL_BYTES) return toast(T('dl_big'))
  sending.add(x.id); redrawSec('dls')
  try {
    const r = await fetch(`/api/dl?id=${encodeURIComponent(x.id)}&name=${encodeURIComponent(file.name)}`, { method: 'PUT', headers: { 'x-edit': S.token }, body: file })
    if (!r.ok) throw new Error(String(r.status))
    x.file = (await r.json()).file
    changed()
  } catch (e) { toast(T(String(e.message) === '413' ? 'dl_big' : 'dl_fail')) }
  sending.delete(x.id); redrawSec('dls')
}

// ---- the Orders tab ------------------------------------------------------------------------------

/** Draw the tab into `tb`. h = { S, call, ui, esc, toast, icon, tabsRefresh }. */
export async function drawOrders(tb, h) {
  const { S, call, ui, esc, toast, icon } = h
  const T = (k, v) => { let s = ui(S.lang, k); if (v) for (const [a, b] of Object.entries(v)) s = s.split('{' + a + '}').join(b); return esc(s) }
  const head = `<section class="tabhead one"><div><h2 class="th2">${T('t_orders')}</h2><p class="why3">${T('od_why')}</p></div></section>`
  let r
  try { r = await call('GET', 'orders') } catch { tb.innerHTML = head + `<p class="hint">${T('e_net')}</p>`; return }
  const day = (iso) => { try { return new Intl.DateTimeFormat(S.lang, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) } catch { return iso.slice(0, 16) } }
  const m = (n) => esc(money(n, S.lang))
  const card = (o) => {
    const goods = o.goods
    const lines = o.lines.map((l) => `<li>${esc(l.t)}${l.opt && l.opt.length ? ` (${esc(l.opt.join(', '))})` : ''} × ${l.q} · ${m(l.u * l.q)}</li>`).join('')
    const motLine = o.mot ? `<p class="hint">${T('od_mot')}${o.job ? ' · ' + T('od_job_' + o.job.status) + (o.job.track ? ' · ' + esc(o.job.track) : '') : ''}</p>` : ''
    const track = goods && o.status === 'paid' && !o.mot ? (o.track ? `<p class="hint">${T('od_track')}: <b>${esc(o.track)}</b></p>` : `<div class="trk"><input data-trk placeholder="${T('od_track')}" maxlength="60" autocomplete="off"><button class="go small" data-ord="ship">${T('od_shipped')}</button></div>`) : ''
    return `<article class="msg ord ${o.status}" data-id="${esc(o.id)}"><header><b>${esc(o.ref)} · ${esc(o.name)}</b><span>${esc(day(o.at))}</span></header>
      <ul class="lines">${lines}</ul>
      <p class="tot">${m(o.total)} <span class="chip">${T('od_' + o.status)}</span></p>
      ${o.disc ? `<p class="hint">${T('od_code')}: ${esc(o.code)} −${m(o.disc)}</p>` : ''}
      <p class="reach">${[o.reach, o.email].filter(Boolean).map(esc).join(' · ')}</p>
      ${goods ? `<p class="reach">${T('od_sendTo')}: ${esc(o.addr)} · ${esc(o.cc)} · ${o.grams} ${T('od_grams')}</p>` : ''}${o.note ? `<p class="reach">${esc(o.note)}</p>` : ''}${motLine}${track}
      <footer>${o.status !== 'paid' && o.status !== 'gone' ? `<button class="go small" data-ord="paid">${icon('check')}${T('od_markPaid')}</button>` : ''}
        ${o.status === 'slip' || o.status === 'new' ? `<button class="go ghost small" data-ord="unpaid">${T('od_markNo')}</button>` : ''}${o.status === 'paid' ? `<button class="go ghost small" data-ord="unpaid">${T('od_markNo')}</button>` : ''}
        ${o.slip ? `<button class="go ghost small" data-slip="${esc(o.id)}">${T('od_slipSee')}</button>` : ''}<button class="go ghost small" data-copy="${esc(o.link)}">${T('od_page')}</button>
        ${o.status !== 'gone' && o.status !== 'paid' ? `<button class="go ghost small" data-ord="gone">${T('od_cancel')}</button>` : ''}</footer></article>`
  }
  const groups = [['new', 'slip', 'no'], ['paid'], ['gone']].map((sts) => r.rows.filter((o) => sts.includes(o.status))).filter((l) => l.length)
  const bills = r.ship.bills.length ? `<section class="panel"><h3>${T('od_bills')}</h3><p class="why3">${T('od_billsWhy')}</p>${r.ship.bills.map((b) => `<div class="bill"><p><b>${esc(b.order)}</b> · ${T('od_billAmt', { f: new Intl.NumberFormat(S.lang).format(b.fee), p: new Intl.NumberFormat(S.lang).format(b.postage) })} · ${esc(b.track || '')}</p>
    <p class="tot">฿${esc(b.amount)} <span class="chip">${T('od_bill' + ({ paid: 'Paid', slip: 'Wait' }[b.status] || 'Open'))}</span></p>
    ${b.payload ? `${qrSvg(b.payload, { dark: '#0e1f3d', light: '#ffffff', label: 'PromptPay' })}<p class="hint">${T('od_billExact')}</p>
    <form data-bill="${esc(b.pay)}"><input type="file" name="slip" accept="image/*" required><button class="go small" type="submit">${T('od_billSlip')}</button></form>` : ''}</div>`).join('')}</section>` : ''
  tb.innerHTML = head + (r.rows.length ? `<p style="text-align:right"><button class="go ghost small" id="ocsv">${icon('download')}${T('od_csv')}</button></p>` : '') +
    (r.rows.length ? groups.map((l) => `<div class="msgs">${l.map(card).join('')}</div>`).join('') : `<p class="none2"><span>${T('od_none')}</span></p>`) + bills +
    `<p class="hint">${T('od_stockNote')} ${T('od_free')}</p>${CSS}`
  // everything on the screen is now seen
  if (r.unread) { call('POST', 'orders', { act: 'seen' }).catch(() => {}); S.orders = 0; h.tabsRefresh() }
  tb.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return
    if (b.id === 'ocsv') {
      const res = await fetch('/api/orders.csv', { headers: { 'x-edit': S.token } })
      if (!res.ok) return toast(ui(S.lang, 'od_err'))
      const a = document.createElement('a'); a.href = URL.createObjectURL(await res.blob()); a.download = S.name + '-orders.csv'; a.click()
      return
    }
    if (b.dataset.copy) { try { await navigator.clipboard.writeText(b.dataset.copy); toast(ui(S.lang, 'od_copied')) } catch { window.prompt('', b.dataset.copy) } return }
    if (b.dataset.slip) {
      const res = await fetch('/api/orders/slip?id=' + encodeURIComponent(b.dataset.slip), { headers: { 'x-edit': S.token } })
      if (res.ok) { const v = document.createElement('div'); v.className = 'slipview'; v.innerHTML = `<img alt="" src="${URL.createObjectURL(await res.blob())}">`; v.tabIndex = 0; v.setAttribute('role', 'dialog'); v.onclick = () => v.remove(); v.onkeydown = (e) => { if (e.key === 'Escape') v.remove() }; document.body.appendChild(v); v.focus() }
      return
    }
    if (!b.dataset.ord) return
    const art = b.closest('[data-id]'), id = art?.dataset.id
    const body = { act: b.dataset.ord, id }
    if (b.dataset.ord === 'ship') body.track = art.querySelector('[data-trk]').value
    if (b.dataset.ord === 'gone' && !confirm(ui(S.lang, 'od_cancel') + '?')) return
    b.disabled = true
    try {
      const j = await call('POST', 'orders', body)
      if (j.stock) { for (const p of S.d.products) if (p.id in j.stock) p.stock = j.stock[p.id] } // the counts the server kept
      if (j.at) S.stockAt = j.at // this browser has them now
      drawOrders(tb, h)
    } catch { b.disabled = false; toast(ui(S.lang, 'od_err')) }
  }
  tb.onsubmit = async (e) => {
    const f = e.target.closest('form[data-bill]'); if (!f) return
    e.preventDefault()
    const fd = new FormData(f); fd.append('pay', f.dataset.bill)
    try { await call('POST', 'orders/billslip', fd, true); drawOrders(tb, h) } catch { toast(ui(S.lang, 'od_err')) }
  }
}
