// studio-ui.mjs — the builder's two picture sheets (Nan 2026-10-15). The studio takes a
// photo, however bad, and shows it fixed and drawn in each of the styles; the maker taps one. The mark
// maker builds an avatar or a cover from parts for a maker with no picture at all.
// Each sheet hands its finished canvas to onUse, which uploads it like any photo.

import { makeOver, SHOWN as STYLES, fit } from './studio.mjs'
import { drawMark, drawCover, markDefaults, loadFaces, SHAPES, PATTERNS, MARK_COLOURS, FACES, inkOn } from './mark.mjs'
import { DINGBATS } from './db/names.mjs'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const tick = () => new Promise((ok) => setTimeout(ok, 0))
const ding = (n) => `<i data-dingbat="${n}" data-look="ink" data-play="hover" aria-hidden="true"></i>`

function sheet(cls, html) {
  const box = document.createElement('div')
  box.className = 'sheet ' + cls
  box.innerHTML = `<div class="box">${html}</div>`
  document.body.appendChild(box)
  box.addEventListener('click', (e) => { if (e.target === box) box.remove() })
  return box
}
const imageData = (c) => c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height)
function paint(cv, img) { cv.width = img.width; cv.height = img.height; cv.getContext('2d').putImageData(new ImageData(img.data, img.width, img.height), 0, 0) }

/** The studio. bitmap: an ImageBitmap; mode 'photo' or 'avatar'; T(key) → words; onUse(canvas) → Promise. */
export function openStudio({ bitmap, mode = 'photo', accent = '', round = true, T, onUse }) {
  const av = mode === 'avatar'
  const box = sheet('studio' + (av ? ' av' : ''), `<h2>${T('st_title')}</h2><p class="hint">${T(av ? 'st_hintAv' : 'st_hint')}</p>
    <div class="stage${av && round ? ' round' : ''}"><canvas id="stc"></canvas><span class="wait" hidden>…</span></div>
    ${av ? `<label class="zoom"><span>${T('st_drag')}</span><input type="range" id="stz" min="1" max="3" step="0.01" value="1"></label>` : ''}
    <div class="styles">${STYLES.map((s) => `<button data-st="${s}"${s === 'fix' ? ' class="on"' : ''}><canvas></canvas><span>${T('st_' + s)}</span></button>`).join('')}</div>
    <div class="row end"><button class="back" id="stno">${T('back')}</button><button class="go red" id="stuse">${T('st_use')}</button></div>`)
  const stage = box.querySelector('#stc'), wait = box.querySelector('.wait')
  const crop = { z: 1, cx: 0.5, cy: 0.5 }
  let style = 'fix', gen = 0

  /** The photo as pixels: whole, or the avatar's square, at size px. */
  function source(size) {
    const c = document.createElement('canvas')
    if (av) {
      const side = Math.min(bitmap.width, bitmap.height) / crop.z
      const x = Math.min(bitmap.width - side, Math.max(0, crop.cx * bitmap.width - side / 2)), y = Math.min(bitmap.height - side, Math.max(0, crop.cy * bitmap.height - side / 2))
      c.width = c.height = size
      c.getContext('2d').drawImage(bitmap, x, y, side, side, 0, 0, size, size)
    } else {
      const [w, h] = fit(bitmap.width, bitmap.height, size)
      c.width = w; c.height = h
      c.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    }
    return imageData(c)
  }

  async function thumbs() {
    const my = ++gen, small = source(200)
    for (const b of box.querySelectorAll('[data-st]')) {
      if (my !== gen) return
      await tick()
      paint(b.querySelector('canvas'), makeOver(small, b.dataset.st, { accent, frame: !av }))
    }
  }
  async function big(size = av ? 420 : 900) {
    const my = gen
    wait.hidden = false
    await tick()
    if (my !== gen) return
    paint(stage, makeOver(source(size), style, { accent, frame: !av }))
    wait.hidden = true
  }
  let soon = 0
  const again = () => { clearTimeout(soon); soon = setTimeout(() => { thumbs().then(() => big()) }, 140) }

  box.querySelector('.styles').onclick = (e) => {
    const b = e.target.closest('[data-st]')
    if (!b) return
    style = b.dataset.st
    box.querySelectorAll('[data-st]').forEach((x) => x.classList.toggle('on', x === b))
    big()
  }
  if (av) {
    box.querySelector('#stz').oninput = (e) => { crop.z = Number(e.target.value); again() }
    let drag = null
    stage.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: crop.cx, cy: crop.cy }; stage.setPointerCapture(e.pointerId) })
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return
      const r = stage.getBoundingClientRect(), side = Math.min(bitmap.width, bitmap.height) / crop.z
      crop.cx = Math.min(1, Math.max(0, drag.cx - ((e.clientX - drag.x) / r.width) * (side / bitmap.width)))
      crop.cy = Math.min(1, Math.max(0, drag.cy - ((e.clientY - drag.y) / r.height) * (side / bitmap.height)))
      again()
    })
    stage.addEventListener('pointerup', () => { drag = null })
  }
  box.querySelector('#stno').onclick = () => box.remove()
  box.querySelector('#stuse').onclick = async (e) => {
    const b = e.currentTarget
    b.disabled = true; wait.hidden = false
    await tick()
    try {
      const out = document.createElement('canvas')
      paint(out, makeOver(source(av ? 640 : 1600), style, { accent, frame: !av }))
      await onUse(out, style)
      box.remove()
    } catch { b.disabled = false; wait.hidden = true }
  }
  thumbs().then(() => big())
  return box
}

/** The mark maker. mode 'avatar' (a square mark) or 'cover' (1600×900). need(fams) loads dingbat families. */
export function openMark({ mode = 'avatar', name = '', tagline = '', accent = '#f04a00', T, need, onUse }) {
  const cover = mode === 'cover'
  const o = { ...markDefaults(name, accent), pat: cover ? 'tiles' : 'rays', glyph: cover ? 'sparkle' : '' }
  const fams = [...new Set(Object.values(DINGBATS))]
  let fam = 'faces', q = ''
  const seg = (k, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-mk="${k}" data-v="${v}"${o[k] === v ? ' class="on"' : ''}>${l}</button>`).join('')}</div>`
  const box = sheet('marker' + (cover ? ' cover' : ''), `<h2>${T(cover ? 'mk_titleCover' : 'mk_title')}</h2><p class="hint">${T('mk_hint')}</p>
    <div class="mkpv"><canvas id="mkc"></canvas></div>
    ${cover ? '' : `<div class="field"><span>${T('mk_shape')}</span>${seg('shape', SHAPES.map((s) => [s, T('mk_' + s)]))}</div>`}
    <div class="field"><span>${T('mk_bg')}</span><div class="swatches">${MARK_COLOURS.map((c) => `<button data-mkbg="${c}" style="background:${c}"${c === o.bg ? ' class="on"' : ''} aria-label="${c}"></button>`).join('')}</div></div>
    <div class="field"><span>${T('mk_pat')}</span>${seg('pat', PATTERNS.map((p) => [p, T('mk_' + p)]))}</div>
    <label class="field"><span>${T(cover ? 'mk_words' : 'mk_letters')}</span><input id="mkl" value="${esc(cover ? name : o.letters)}" maxlength="${cover ? 60 : 3}"></label>
    <div class="field"><span>${T('mk_font')}</span>${seg('font', Object.keys(FACES).map((f) => [f, `<span style="font-family:'${f}'">Aa ก</span>`]))}</div>
    <div class="field"><span>${T('mk_glyph')}</span><div class="row"><input id="mkq" type="search" placeholder="${T('db_find')}" style="flex:1;min-width:150px"><button class="back" data-glyph="">× ${T('mk_none')}</button></div>
      <div class="chips">${fams.map((f) => `<button type="button" data-mkfam="${f}"${f === fam ? ' class="on"' : ''}>${esc(f)}</button>`).join('')}</div>
      <div class="dpick mkpick" id="mkg"></div></div>
    <div class="row end"><button class="back" id="mkno">${T('back')}</button><button class="go red" id="mkuse">${T(cover ? 'mk_useCover' : 'mk_useAvatar')}</button></div>`)
  const cv = box.querySelector('#mkc'), grid = box.querySelector('#mkg')
  let D = null
  async function draw() {
    await loadFaces()
    await need(o.glyph ? [DINGBATS[o.glyph]] : [])
    D = window.Dingbats || null
    const w = cover ? 800 : 400, h = cover ? 450 : 400
    cv.width = w; cv.height = h
    const ctx = cv.getContext('2d')
    if (cover) drawCover(ctx, w, h, { ...o, letters: '' }, D, box.querySelector('#mkl').value, tagline)
    else drawMark(ctx, w, o, D)
  }
  function glyphs() {
    const names = Object.keys(DINGBATS).filter((n) => (q ? n.includes(q) : DINGBATS[n] === fam)).slice(0, 80)
    need(q ? [...new Set(names.map((n) => DINGBATS[n]))] : [fam])
    grid.innerHTML = names.map((n) => `<button data-glyph="${n}"${n === o.glyph ? ' class="on"' : ''} title="${n}" aria-label="${n}">${ding(n)}</button>`).join('')
  }
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b) return
    if (b.dataset.mk) { o[b.dataset.mk] = b.dataset.v; b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); draw() }
    if (b.dataset.mkbg) { o.bg = b.dataset.mkbg; o.ink = inkOn(o.bg); box.querySelectorAll('[data-mkbg]').forEach((x) => x.classList.toggle('on', x === b)); draw() }
    if (b.dataset.mkfam) { fam = b.dataset.mkfam; q = ''; box.querySelector('#mkq').value = ''; box.querySelectorAll('[data-mkfam]').forEach((x) => x.classList.toggle('on', x === b)); glyphs() }
    if (b.dataset.glyph !== undefined) { o.glyph = b.dataset.glyph; grid.querySelectorAll('[data-glyph]').forEach((x) => x.classList.toggle('on', x.dataset.glyph === o.glyph)); draw() }
  })
  box.querySelector('#mkq').oninput = (e) => { q = e.target.value.trim().toLowerCase(); glyphs() }
  box.querySelector('#mkl').oninput = (e) => { if (!cover) o.letters = e.target.value; draw() }
  box.querySelector('#mkno').onclick = () => box.remove()
  box.querySelector('#mkuse').onclick = async (e) => {
    const b = e.currentTarget
    b.disabled = true
    try {
      await draw()
      const out = document.createElement('canvas')
      if (cover) { out.width = 1600; out.height = 900; drawCover(out.getContext('2d'), 1600, 900, { ...o, letters: '' }, D, box.querySelector('#mkl').value, tagline) }
      else { out.width = out.height = 640; drawMark(out.getContext('2d'), 640, o, D) }
      await onUse(out, o)
      box.remove()
    } catch { b.disabled = false }
  }
  glyphs()
  draw()
  return box
}
