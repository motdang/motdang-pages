// make-menu.mjs — "Read a menu photo" in the builder (Gold). The photo is shrunk here, sent to
// /api/menu/read, and comes back as lines the maker ticks and edits before they join the page's
// menu or price list (S.d.items). The photo goes to the model and is not written to storage.

import { esc } from './render.mjs'
import { ui } from './make-words.mjs'

const MAX_ITEMS = 60
let rev = null // { rows: [{ n, p, note, section, on }], sec: false } while the maker is checking lines

const lineKey = (x) => (x.n || '').trim().toLowerCase() + '|' + (x.p || '').trim()

/** A photo as a JPEG under the server's size limit: { blob }. */
export async function shrinkForMenu(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  for (const [max, q] of [[1800, 0.86], [1400, 0.78], [1000, 0.7]]) {
    const r = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r)
    const g = c.getContext('2d')
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
    g.drawImage(bmp, 0, 0, c.width, c.height)
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', q))
    if (blob && blob.size <= 1_500_000) return { blob }
  }
  throw new Error('size')
}

/** The button and the place the lines appear, for the top of the menu / prices section. */
export function menuBox({ S, icon, isGold }) {
  const T = (k) => esc(ui(S.lang, k))
  if (!isGold) return `<p class="glocked">★ ${T('mr_btn')} · ${T('goldLock')}. <button class="linkbtn" data-tab="gold">${T('goldOpen')} →</button></p>`
  return `<div class="menuread"><label class="pick menupick">${icon('camera')}${T('mr_btn')}<input type="file" accept="image/*" id="menufile"></label>
    <p class="hint">${T('mr_why')}</p><div id="menurev">${rev ? reviewHtml(S) : ''}</div></div>`
}

function reviewHtml(S) {
  const T = (k) => esc(ui(S.lang, k))
  if (rev.busy) return `<p class="hint" role="status">${T('mr_reading')}</p>`
  const n = rev.rows.filter((x) => x.on).length
  return `<div class="mrev"><p class="hint" role="status">${esc(ui(S.lang, 'mr_found').replace('{n}', rev.rows.length))}</p>
    ${rev.rows.map((x, i) => `<div class="mrow${x.dup ? ' dup' : ''}"><label class="mck"><input type="checkbox" data-mrck="${i}"${x.on ? ' checked' : ''} aria-label="${T('mr_row')}"></label>
      <input data-mrn="${i}" value="${esc(x.n)}" maxlength="80" aria-label="${T('item')}"><input data-mrp="${i}" value="${esc(x.p)}" maxlength="24" inputmode="decimal" aria-label="${T('price')}">
      <input data-mrt="${i}" value="${esc(x.note)}" maxlength="160" placeholder="${T('details')}" aria-label="${T('details')}">${x.section ? `<small class="msec">${esc(x.section)}</small>` : ''}</div>`).join('')}
    ${rev.rows.some((x) => x.section) ? `<label class="mopt"><input type="checkbox" id="mrsec"${rev.sec ? ' checked' : ''}>${T('mr_sec')}</label>` : ''}
    <div class="row"><button class="go" id="mradd"${n ? '' : ' disabled'}>${esc(ui(S.lang, 'mr_add').replace('{n}', n))}</button>
    <button class="go ghost" id="mrall">${T('mr_all')}</button><button class="go ghost" id="mrno">${T('mr_cancel')}</button></div></div>`
}

/** One set of listeners on the builder; ctx = { app, S, call, icon, toast, redrawSec, changed }. */
export function menuInit(ctx) {
  const { app, S } = ctx
  const draw = () => { const el = app.querySelector('#menurev'); if (el) el.innerHTML = rev ? reviewHtml(S) : '' }
  const T = (k) => ui(S.lang, k)

  app.addEventListener('change', async (e) => {
    const t = e.target
    if (t.id === 'menufile' && t.files[0]) {
      const file = t.files[0]; t.value = ''
      rev = { busy: true, rows: [], sec: false }; draw()
      try {
        const { blob } = await (ctx.shrink || shrinkForMenu)(file)
        const f = new FormData(); f.append('photo', blob, 'menu.jpg')
        const r = await ctx.call('POST', 'menu/read', f, true)
        const have = new Set(S.d.items.map(lineKey))
        const rows = (r.rows || []).map((x) => ({ ...x, dup: have.has(lineKey(x)), on: !have.has(lineKey(x)) }))
        if (!rows.length) { rev = null; draw(); ctx.toast(T('mr_none')); return }
        rev = { rows, sec: false }; draw()
      } catch (err) {
        rev = null; draw()
        ctx.toast(T(err.status === 429 ? 'mr_quota' : err.status === 402 ? 'goldLock' : err.status === 502 || err.status === 400 ? 'mr_fail' : 'e_net'))
      }
      return
    }
    if (!rev || rev.busy) return
    if (t.dataset.mrck !== undefined) { rev.rows[+t.dataset.mrck].on = t.checked; const b = app.querySelector('#mradd'); if (b) { const n = rev.rows.filter((x) => x.on).length; b.disabled = !n; b.textContent = T('mr_add').replace('{n}', n) } }
    if (t.id === 'mrsec') rev.sec = t.checked
  })
  app.addEventListener('input', (e) => {
    const t = e.target
    if (!rev || rev.busy) return
    if (t.dataset.mrn !== undefined) rev.rows[+t.dataset.mrn].n = t.value
    if (t.dataset.mrp !== undefined) rev.rows[+t.dataset.mrp].p = t.value
    if (t.dataset.mrt !== undefined) rev.rows[+t.dataset.mrt].note = t.value
  })
  app.addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b || !rev || rev.busy) return
    if (b.id === 'mrno') { e.preventDefault(); rev = null; draw() }
    if (b.id === 'mrall') { e.preventDefault(); rev.rows.forEach((x) => { x.on = true }); draw() }
    if (b.id === 'mradd') {
      e.preventDefault()
      const have = new Set(S.d.items.map(lineKey))
      // a page that holds only the empty starter line gives it up
      const items = S.d.items.filter((x) => (x.n || '').trim() || (x.p || '').trim() || (x.note || '').trim())
      let added = 0, left = 0
      for (const x of rev.rows) {
        if (!x.on || !(x.n || '').trim()) continue
        const k = lineKey(x)
        if (have.has(k)) continue
        if (items.length >= MAX_ITEMS) { left++; continue }
        const note = [rev.sec ? x.section : '', x.note].map((v) => (v || '').trim()).filter(Boolean).join(' · ').slice(0, 160)
        items.push({ n: x.n.trim().slice(0, 80), p: (x.p || '').trim().slice(0, 24), note })
        have.add(k); added++
      }
      S.d.items = items
      rev = null
      ctx.redrawSec('items'); ctx.changed()
      ctx.toast(left ? T('mr_full').replace('{n}', left) : T('mr_added').replace('{n}', added))
    }
  })
}
