// logo-ui.mjs — the logo maker's sheet (Nan 2026-10-16). It opens on dozens of designs for the
// maker's own name, no questions. Tap one and edit it: words, icon, letters, colour, layout; see
// it on a LINE profile, a sign, a cup, a bag, a shirt, a card, a tab; download it or use it.
//
//   openLogo({ name, tagline, kind, accent, look, T, need, onUse })
//     T(key) → the builder's words (HTML-safe)      need(families) → loads dingbat families
//     onUse(canvas640, { cover: canvas1600x900, design })  → a Promise; the sheet closes when it settles

import { DINGBATS } from './db/names.mjs'
import { logoDesigns, drawLogo, groundOf, loadFonts, FONT_KEYS, FONTS, PALS, palFromMain, RECIPES, applyRecipe, iconsFor, familiesFor, renderPack, logoCanvas, squareCanvas, coverCanvas, slug } from './logo.mjs'
import { cssFamily, cssWeight } from './logo-fonts.mjs'
import { MOCKS, paintMock } from './logo-mock.mjs'
import { isHex } from './logo-color.mjs'
import { hasThai } from './logo-text.mjs'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const unesc = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
const ding = (n, look = 'ink') => `<i data-dingbat="${n}" data-look="${look}" data-play="hover" aria-hidden="true"></i>`
const clone = (x) => JSON.parse(JSON.stringify(x))
const dpr = () => Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1)
const TABS = ['words', 'icon', 'type', 'colour', 'layout', 'try']
// a name sample that fits a tile: smaller as the name gets longer
const sampleSize = (n) => Math.max(17, Math.min(28, 28 - (String(n).length - 9) * 0.75))

/** Link the sheet's stylesheet once; resolves when it has loaded (or failed, or a moment has passed). */
export function ensureLogoCss() {
  const have = document.getElementById('logo-css')
  if (have) return have.sheet ? Promise.resolve() : new Promise((ok) => { have.addEventListener('load', ok); have.addEventListener('error', ok); setTimeout(ok, 1500) })
  return new Promise((ok) => {
    const l = document.createElement('link')
    l.id = 'logo-css'; l.rel = 'stylesheet'; l.href = new URL('./logo.css', import.meta.url).href
    l.onload = l.onerror = () => ok()
    document.head.appendChild(l)
    setTimeout(ok, 1500)
  })
}

function download(canvas, filename) {
  return new Promise((ok) => canvas.toBlob((b) => {
    if (!b) return ok()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b); a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    ok()
  }, 'image/png'))
}

export function openLogo({ name = '', tagline = '', kind = 'shop', accent = '#d7261e', look = 'poster', small = '', T, need = async () => {}, onUse }) {
  const cssReady = ensureLogoCss()
  const raw = (k) => unesc(T(k))
  const st = { name: String(name || ''), tagline: String(tagline || ''), small: String(small || ''), kind, accent: isHex(accent) ? accent : '#d7261e', look, seed: 0, cur: null, tab: 'words', view: 'gallery', fam: 'suggested', q: '' }
  const box = document.createElement('div')
  box.className = 'sheet logo'
  box.innerHTML = `<div class="box lg" role="dialog" aria-modal="true" aria-label="${T('lg_title')}">
    <div class="lg-top"><div id="lg-th"></div><button class="lg-x" id="lg-x" type="button" aria-label="${T('back')}">×</button></div>
    <div id="lg-view"></div></div>`
  document.body.appendChild(box)
  const $ = (sel) => box.querySelector(sel)
  const $$ = (sel) => [...box.querySelectorAll(sel)]
  const view = $('#lg-view')
  let D = window.Dingbats || null
  let alive = true
  const close = () => { alive = false; document.removeEventListener('keydown', onKey); box.remove() }
  const onKey = (e) => { if (e.key === 'Escape') (st.view === 'edit' ? toGallery() : close()) }
  document.addEventListener('keydown', onKey)
  box.addEventListener('click', (e) => { if (e.target === box && st.view === 'gallery') close() })
  $('#lg-x').onclick = close

  const words = () => ({ name: st.name.trim() || raw('lg_sample'), tagline: st.tagline.trim(), small: st.small.trim(), kind: st.kind, accent: st.accent, look: st.look })
  const needFor = (d) => (d.icon && DINGBATS[d.icon] ? [DINGBATS[d.icon]] : [])
  async function ready(list) {
    const ds = Array.isArray(list) ? list : [list]
    await Promise.all([loadFonts([...new Set(ds.map((d) => d.font))]), need([...new Set(ds.flatMap(needFor))])])
    D = window.Dingbats || null
  }
  function paint(cv, d, o = {}) {
    const r = cv.getBoundingClientRect()
    const k = dpr()
    const w = Math.max(40, Math.round((o.w || r.width || 160) * k)), h = Math.max(40, Math.round((o.h || r.height || 160) * k))
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }
    const c = cv.getContext('2d')
    c.clearRect(0, 0, w, h)
    drawLogo(c, w, h, d, D, { pad: o.pad ?? 0.07 })
  }
  const groundCss = (d) => (d.bg === 'clear' ? '' : `background:${groundOf(d)}`)

  // ---- gallery -----------------------------------------------------------------------------

  let designs = []
  let obs = null
  function toGallery() {
    st.view = 'gallery'
    if (obs) obs.disconnect()
    $('#lg-th').innerHTML = `<h2>${T('lg_title')}</h2>`
    view.innerHTML = `<div class="lg-in">
        <label class="field"><span>${T('lg_name')}</span><input id="lg-n" maxlength="40" value="${esc(st.name)}" autocomplete="off"></label>
        <label class="field"><span>${T('lg_tag')}</span><input id="lg-t" maxlength="60" value="${esc(st.tagline)}" autocomplete="off"></label>
      </div>
      <div class="lbrow lg-sh"><button class="dice" id="lg-shuf" type="button">${ding('sparkle')}${T('lg_shuffle')}</button><p class="hint">${T('lg_hint')}</p></div>
      <div class="lg-gal" id="lg-gal" role="list"></div>`
    need(['classic'])
    $('#lg-n').oninput = (e) => { st.name = e.target.value; soon(rebuild) }
    $('#lg-t').oninput = (e) => { st.tagline = e.target.value; soon(rebuild) }
    $('#lg-shuf').onclick = () => { st.seed++; rebuild(true) }
    box.querySelector('.box').scrollTop = 0
    rebuild()
  }
  let timer = 0
  const soon = (fn, ms = 220) => { clearTimeout(timer); timer = setTimeout(fn, ms) }

  async function rebuild(fresh) {
    if (!alive || st.view !== 'gallery') return
    const wd = words()
    designs = logoDesigns({ ...wd, seed: st.seed })
    const gal = $('#lg-gal')
    if (!gal) return
    let cards = [...gal.querySelectorAll('.lg-card')]
    if (fresh || cards.length !== designs.length) {
      if (fresh) gal.classList.remove('in')
      gal.innerHTML = designs.map((d, i) => `<button class="lg-card" type="button" role="listitem" data-i="${i}" data-id="${d.id}" aria-label="${esc(d.name)} ${i + 1}" style="${groundCss(d)}"><canvas></canvas></button>`).join('')
      requestAnimationFrame(() => gal.classList.add('in'))
      cards = [...gal.querySelectorAll('.lg-card')]
    } else {
      // the same cards, new words: each keeps its picture until the new one is drawn over it
      cards.forEach((c, i) => { c.dataset.id = designs[i].id; c.setAttribute('aria-label', `${designs[i].name} ${i + 1}`); c.style.cssText = groundCss(designs[i]) })
    }
    if (obs) obs.disconnect()
    const my = (rebuild.gen = (rebuild.gen || 0) + 1)
    obs = new IntersectionObserver((es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue
        obs.unobserve(e.target)
        const i = +e.target.dataset.i
        const d = designs[i]
        ready(d).then(() => { if (alive && my === rebuild.gen && st.view === 'gallery' && e.target.isConnected) { paint(e.target.firstChild, d); e.target.classList.add('done') } })
      }
    }, { root: box.querySelector('.box'), rootMargin: '500px 0px' })
    cards.forEach((c) => obs.observe(c))
  }

  // ---- editor ------------------------------------------------------------------------------

  function toEdit(d) {
    st.view = 'edit'
    st.cur = clone(d)
    st.cur.mine = st.cur.mine || {}
    if (obs) obs.disconnect()
    $('#lg-th').innerHTML = `<button class="back lg-all" id="lg-all" type="button">← ${T('lg_back')}</button>`
    view.innerHTML = `<div class="lg-ed">
        <div class="lg-pvw" id="lg-pvw"><canvas id="lg-pv" role="img" aria-label="${esc(d.name)}"></canvas>
          <div class="lg-gs" role="group" aria-label="${T('lg_ground')}">${['auto', 'light', 'dark', 'clear'].map((g) => `<button type="button" data-g="${g}" class="g-${g}${(st.cur.bg || 'auto') === g ? ' on' : ''}" title="${T('lg_g_' + g)}" aria-label="${T('lg_g_' + g)}"></button>`).join('')}</div></div>
        <div class="lg-tabs" role="tablist">${TABS.map((t) => `<button type="button" role="tab" data-tab="${t}" aria-selected="${t === st.tab}"${t === st.tab ? ' class="on"' : ''}>${T('lg_t_' + t)}</button>`).join('')}</div>
        <div class="lg-panel" id="lg-panel"></div>
      </div>
      <div class="lg-bar">
        <div class="lg-dl" id="lg-dl" hidden>
          <button type="button" data-dl="logo">${T('lg_dl_logo')}</button>
          <button type="button" data-dl="sq">${T('lg_dl_sq')}</button>
          <button type="button" data-dl="cover">${T('lg_dl_cover')}</button>
        </div>
        <button class="go ghost" id="lg-down" type="button" aria-expanded="false">${T('lg_download')}</button>
        <button class="go red" id="lg-use" type="button">${T('lg_use')}</button>
      </div>`
    box.querySelector('.box').scrollTop = 0
    $('#lg-all').onclick = () => { st.name = st.cur.name; st.tagline = st.cur.tagline; st.small = st.cur.small || ''; toGallery() }
    tab(st.tab)
    redraw()
  }

  let rgen = 0
  async function redraw(now) {
    if (st.view !== 'edit') return
    const my = ++rgen
    await ready(st.cur)
    if (!alive || my !== rgen || st.view !== 'edit') return
    const cv = $('#lg-pv')
    if (!cv) return
    const wrap = $('#lg-pvw')
    wrap.classList.toggle('clear', st.cur.bg === 'clear')
    wrap.style.background = st.cur.bg === 'clear' ? '' : groundOf(st.cur)
    paint(cv, st.cur, { pad: 0.06 })
    if (st.tab === 'try') soon(paintMocks, 120)
  }
  
  // ---- tabs --------------------------------------------------------------------------------

  function tab(t) {
    st.tab = t
    $$('.lg-tabs button').forEach((b) => { const on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on) })
    const p = $('#lg-panel')
    p.dataset.tab = t
    p.innerHTML = ({ words: panelWords, icon: panelIcon, type: panelType, colour: panelColour, layout: panelLayout, try: panelTry }[t])()
    if (t === 'icon') glyphs()
    if (t === 'type') fontTiles()
    if (t === 'layout') layoutThumbs()
    if (t === 'try') paintMocks()
    box.classList.toggle('lg-try', t === 'try')
  }

  function seg(key, opts, cur) {
    return `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-set="${key}" data-v="${v}"${String(cur) === String(v) ? ' class="on"' : ''}>${l}</button>`).join('')}</div>`
  }

  const panelWords = () => `<label class="field"><span>${T('lg_name')}</span><input id="lg-wn" maxlength="40" value="${esc(st.cur.name)}" autocomplete="off"></label>
    <label class="field"><span>${T('lg_tag')}</span><input id="lg-wt" maxlength="60" value="${esc(st.cur.tagline)}" autocomplete="off"></label>
    <label class="field"><span>${T('lg_small')}</span><input id="lg-ws" maxlength="30" value="${esc(st.cur.small)}" placeholder="${T('lg_small_ph')}" autocomplete="off"></label>
    <div class="field"><span>${T('lg_caps')}</span>${seg('caps', [['auto', T('lg_caps_auto')], ['upper', T('lg_caps_on')], ['none', T('lg_caps_off')]], st.cur.caps)}</div>`

  const panelIcon = () => `<p class="hint">${T('lg_icon_hint')}</p>
    <div class="row"><input id="lg-iq" type="search" placeholder="${T('lg_icon_find')}" value="${esc(st.q)}" style="flex:1;min-width:150px"><button class="back" type="button" data-ic="">× ${T('lg_icon_none')}</button></div>
    <div class="chips" id="lg-fams"><button type="button" data-fam="suggested"${st.fam === 'suggested' ? ' class="on"' : ''}>${T('lg_icon_sug')}</button>${[...new Set(Object.values(DINGBATS))].map((f) => `<button type="button" data-fam="${f}"${st.fam === f ? ' class="on"' : ''}>${esc(f)}</button>`).join('')}</div>
    <div class="dpick lg-dp" id="lg-ig"></div>
    <div class="field"><span>${T('lg_icon_size')}</span><input id="lg-is" type="range" min="0.5" max="1.3" step="0.05" value="${st.cur.is || 1}"></div>
    <div class="field"><span>${T('lg_icon_style')}</span>${seg('iconLook', [['auto', T('lg_is_auto')], ['ink', T('lg_is_colour')], ['mono', T('lg_is_mono')]], st.cur.iconLook === 'ink' || st.cur.iconLook === 'mono' ? st.cur.iconLook : 'auto')}</div>`

  async function glyphs() {
    const grid = $('#lg-ig')
    if (!grid) return
    let names
    if (st.q.trim().length > 0) {
      await need([...new Set(Object.values(DINGBATS))])
      D = window.Dingbats || D
      const q = st.q.trim().toLowerCase()
      names = D && D.names ? D.names(q) : Object.keys(DINGBATS).filter((n) => n.includes(q))
      names = names.filter((n) => DINGBATS[n]).slice(0, 90)
    } else if (st.fam === 'suggested') {
      names = iconsFor(st.kind, st.cur.name, st.cur.tagline).slice(0, 48)
      need(familiesFor(st.kind, st.cur.name, st.cur.tagline))
    } else {
      names = Object.keys(DINGBATS).filter((n) => DINGBATS[n] === st.fam)
      need([st.fam])
    }
    if (!$('#lg-ig')) return
    grid.innerHTML = names.map((n) => `<button type="button" data-ic="${n}" title="${n}" aria-label="${n}"${n === st.cur.icon ? ' class="on"' : ''}>${ding(n)}</button>`).join('')
  }

  const panelType = () => `<p class="hint">${T('lg_type_hint')}</p>
    <div class="lg-fonts" id="lg-fonts">${FONT_KEYS.map((k) => `<button type="button" class="lg-ft${k === st.cur.font ? ' on' : ''}" data-font="${k}"><span class="s" style='font-family:${cssFamily(k)};font-weight:${cssWeight(k)};font-size:${sampleSize(st.cur.name)}px'>${esc(st.cur.name)}</span><small>${esc(FONTS[k].fam)}</small></button>`).join('')}</div>
    ${hasThai(st.cur.name) ? '' : `<div class="field"><span>${T('lg_space')}</span><input id="lg-sp" type="range" min="0" max="0.2" step="0.01" value="${st.cur.track || 0}"></div>`}
    <div class="field"><span>${T('lg_caps')}</span>${seg('caps', [['auto', T('lg_caps_auto')], ['upper', T('lg_caps_on')], ['none', T('lg_caps_off')]], st.cur.caps)}</div>`
  const fontTiles = () => { loadFonts(FONT_KEYS) }

  // the colour sets, the maker's accent and look first
  function palettes() {
    const out = []
    const add = (id, p) => { if (!out.some((x) => x.p.main === p.main && x.p.accent === p.accent)) out.push({ id, p }) }
    add('accent', palFromMain(st.accent))
    const lp = { poster: 'sunset', loom: 'loom', stitch: 'akha', night: 'night', lanna: 'lacquer', clean: 'sky', gold: 'gold' }[st.look]
    if (lp) add(lp, PALS[lp])
    for (const k of Object.keys(PALS)) add(k, PALS[k])
    return out
  }
  const panelColour = () => {
    const p = st.cur.pal
    return `<div class="lg-pals" id="lg-pals">${palettes().map(({ id, p: q }, i) => `<button type="button" class="lg-pal${q.main === p.main && q.accent === p.accent ? ' on' : ''}" data-pi="${i}" aria-label="${esc(id)}"><i style="background:${q.main}"></i><i style="background:${q.accent}"></i><i style="background:${q.deep}"></i><i style="background:${q.light}"></i></button>`).join('')}</div>
      <div class="lg-cc"><label><span>${T('lg_main')}</span><input type="color" id="lg-c1" value="${p.main}"></label><label><span>${T('lg_accent')}</span><input type="color" id="lg-c2" value="${p.accent}"></label></div>
      <div class="field"><span>${T('lg_mode')}</span>${seg('inv', [['0', T('lg_light')], ['1', T('lg_dark')]], st.cur.inv ? '1' : '0')}</div>`
  }

  const panelLayout = () => `<p class="hint">${T('lg_layout_hint')}</p><div class="lg-gal lg-lay in" id="lg-lay">${RECIPES.map((r, i) => `<button class="lg-card${r.id === st.cur.id ? ' cur' : ''}" type="button" data-r="${r.id}" aria-label="${r.id}"><canvas></canvas></button>`).join('')}</div>`
  async function layoutThumbs() {
    const cards = $$('#lg-lay .lg-card')
    await loadFonts(FONT_KEYS)
    for (const card of cards) {
      if (!alive || st.tab !== 'layout') return
      const r = RECIPES.find((x) => x.id === card.dataset.r)
      const d = applyRecipe(st.cur, r, { kind: st.kind, accent: st.accent, look: st.look })
      await need(needFor(d)); D = window.Dingbats || D
      card.style.cssText = groundCss(d)
      paint(card.firstChild, d)
      await new Promise((ok) => setTimeout(ok, 0))
    }
  }

  const panelTry = () => `<p class="hint">${T('lg_try_hint')}</p><div class="lg-mocks" id="lg-mocks">${MOCKS.map((m) => `<figure><canvas data-mock="${m.id}"></canvas><figcaption>${T('lg_m_' + m.id)}</figcaption></figure>`).join('')}</div>`
  let mgen = 0
  async function paintMocks() {
    if (st.tab !== 'try' || st.view !== 'edit') return
    const my = ++mgen
    await ready(st.cur)
    if (my !== mgen) return
    const pack = renderPack(st.cur, D)
    for (const cv of $$('#lg-mocks canvas')) {
      if (my !== mgen || !alive) return
      const m = MOCKS.find((x) => x.id === cv.dataset.mock)
      paintMock(cv, m, pack, cv.getBoundingClientRect().width || 360)
      await new Promise((ok) => setTimeout(ok, 0))
    }
  }

  // ---- one listener for the editor ---------------------------------------------------------

  box.addEventListener('click', async (e) => {
    const b = e.target.closest('button')
    if (!b) return
    if (b.classList.contains('lg-card') && b.dataset.i !== undefined) { toEdit(designs[+b.dataset.i]); return }
    if (st.view !== 'edit') return
    const cur = st.cur
    if (b.dataset.tab) { tab(b.dataset.tab); return }
    if (b.dataset.g) { cur.bg = b.dataset.g === 'auto' ? undefined : b.dataset.g; $$('.lg-gs button').forEach((x) => x.classList.toggle('on', x === b)); redraw(); return }
    if (b.dataset.set) {
      const k = b.dataset.set, v = b.dataset.v
      if (k === 'inv') cur.inv = v === '1'
      else if (k === 'iconLook') { cur.iconLook = v; cur.mine.iconLook = v !== 'auto' }
      else cur[k] = v
      b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b))
      redraw(); return
    }
    if (b.dataset.ic !== undefined) {
      cur.icon = b.dataset.ic
      $$('#lg-ig button').forEach((x) => x.classList.toggle('on', x.dataset.ic === cur.icon))
      redraw(); return
    }
    if (b.dataset.fam) { st.fam = b.dataset.fam; st.q = ''; const q = $('#lg-iq'); if (q) q.value = ''; $$('#lg-fams button').forEach((x) => x.classList.toggle('on', x === b)); glyphs(); return }
    if (b.dataset.font) { cur.font = b.dataset.font; cur.mine.font = true; $$('#lg-fonts .lg-ft').forEach((x) => x.classList.toggle('on', x === b)); redraw(); return }
    if (b.dataset.pi !== undefined) { const { p } = palettes()[+b.dataset.pi]; cur.pal = { ...p }; cur.mine.pal = true; $$('#lg-pals .lg-pal').forEach((x) => x.classList.toggle('on', x === b)); const c1 = $('#lg-c1'), c2 = $('#lg-c2'); if (c1) c1.value = p.main; if (c2) c2.value = p.accent; redraw(); return }
    if (b.dataset.r) {
      const r = RECIPES.find((x) => x.id === b.dataset.r)
      st.cur = Object.assign(applyRecipe(cur, r, { kind: st.kind, accent: st.accent, look: st.look }), { mine: cur.mine, bg: cur.bg })
      $$('#lg-lay .lg-card').forEach((x) => x.classList.toggle('cur', x === b))
      redraw(); return
    }
    if (b.id === 'lg-down') { const m = $('#lg-dl'); m.hidden = !m.hidden; b.setAttribute('aria-expanded', String(!m.hidden)); return }
    if (b.dataset.dl) {
      $('#lg-dl').hidden = true
      await ready(cur)
      const nm = slug(cur.name)
      if (b.dataset.dl === 'logo') await download(logoCanvas(cur, D, 2000, { pad: 0.02 }), `${nm}-logo.png`)
      else if (b.dataset.dl === 'sq') await download(squareCanvas(cur, D, 640), `${nm}-square.png`)
      else await download(coverCanvas(cur, D, 1600, 900), `${nm}-cover.png`)
      return
    }
    if (b.id === 'lg-use') {
      b.disabled = true
      const label = b.textContent
      b.textContent = raw('lg_busy')
      try {
        await ready(cur)
        const sq = squareCanvas(cur, D, 640), cov = coverCanvas(cur, D, 1600, 900)
        await onUse(sq, { cover: cov, design: clone(cur) })
        close()
      } catch { b.disabled = false; b.textContent = label }
    }
  })

  box.addEventListener('input', (e) => {
    const t = e.target
    if (st.view !== 'edit') return
    const cur = st.cur
    if (t.id === 'lg-wn') { cur.name = t.value; redraw() }
    else if (t.id === 'lg-wt') { cur.tagline = t.value; redraw() }
    else if (t.id === 'lg-ws') { cur.small = t.value; redraw() }
    else if (t.id === 'lg-sp') { cur.track = Number(t.value); redraw() }
    else if (t.id === 'lg-is') { cur.is = Number(t.value); redraw() }
    else if (t.id === 'lg-iq') { st.q = t.value; soon(glyphs, 160) }
    else if (t.id === 'lg-c1' || t.id === 'lg-c2') {
      const m = $('#lg-c1').value, a = $('#lg-c2').value
      cur.pal = palFromMain(m, a); cur.mine.pal = true
      $$('#lg-pals .lg-pal').forEach((x) => x.classList.remove('on'))
      redraw()
    }
  })

  box.style.visibility = 'hidden'
  cssReady.then(() => { box.style.visibility = ''; if (alive) toGallery() })
  return box
}
