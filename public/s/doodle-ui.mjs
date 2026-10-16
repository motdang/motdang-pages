// doodle-ui.mjs — the doodle sheet (Nan 2026-10-16: "People should be able to easily doodle whatever they can imagine
// (within guardrails) and use it to self-promote on their site ... Doodle from photo"). A box for the words, a few
// examples for the kind of page, six styles, and one of the page's photos to redraw. Two doodles come back; the maker
// picks one for the cover or for the photos. The server (src/doodle.mjs) keeps the one chosen as a photo of the page
// and onUse(photoId, { as }) puts it on the page. T(key) gives the words, call(method, path, body) the server.

import { esc } from './render.mjs'

export const STYLES = ['pen', 'crayon', 'wash', 'lanna', 'sticker', 'neon']
const WHYS = ['royal', 'sacred', 'minor', 'sexual', 'violence', 'hate', 'drugs', 'brand', 'political', 'person', 'other', 'picture']
const STEPS_AT = [0, 2500, 7000, 13000, 20000] // when the five lines of the loading list light up
const store = {
  get(k) { try { return localStorage.getItem('mdp:' + k) } catch { return null } },
  set(k, v) { try { localStorage.setItem('mdp:' + k, v) } catch {} },
}
const icon = (id) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="/s/icons.svg#i-${id}"/></svg>`

// a lantern that draws itself while the doodles are made
const LANTERN = `<svg class="ddlantern" viewBox="0 0 120 120" aria-hidden="true">
  <path class="fill" d="M60 30C34 32 26 58 30 76c4 18 56 18 60 0 4-18-4-44-30-46z"/>
  <g pathLength="1"><path pathLength="1" d="M60 10v14"/><path pathLength="1" d="M48 30h24l-4-8H52z"/><path pathLength="1" d="M60 30C34 32 26 58 30 76c4 18 56 18 60 0 4-18-4-44-30-46z"/>
  <path pathLength="1" d="M60 30C48 50 48 74 60 92"/><path pathLength="1" d="M60 30c12 20 12 44 0 62"/><path pathLength="1" d="M48 90h24l-4 8H52z"/><path pathLength="1" d="M60 98v10M54 108h12"/></g></svg>`

/**
 * The doodle sheet. name: the page's name; kind: its kind (the examples follow it); photos: ids of the page's own
 * photos, the ones that can be redrawn; imgUrl(id, small) → url of one of them; from: a photo to start with;
 * onUse(photoId, { as: 'cover' | 'photo', credit }) → Promise, throws when the page cannot take the picture.
 */
export function openDoodle({ name, kind = 'shop', T, call, onUse, photos = [], imgUrl, from = '' }) {
  const url = imgUrl || ((id, small) => `/img/${id}${small ? '-s' : ''}.webp`)
  const st = { style: STYLES.includes(store.get('doodle-style')) ? store.get('doodle-style') : 'pen', from: photos.includes(from) ? from : '', text: '', left: null, max: null, gold: false, gen: 0, opts: [], used: {}, busy: false }
  const ex = (() => {
    const of = (k) => [1, 2, 3].map((i) => T(`dd_ex_${k}_${i}`)).filter((s) => !s.startsWith('dd_ex_'))
    return of(kind).length ? of(kind) : of('shop')
  })()
  const plain = (html) => { const t = document.createElement('textarea'); t.innerHTML = html; return t.value }
  const exPlain = ex.map(plain)

  const box = document.createElement('div')
  box.className = 'sheet dd'
  box.setAttribute('role', 'dialog')
  box.setAttribute('aria-modal', 'true')
  box.innerHTML = '<div class="box"></div>'
  const inner = box.firstChild
  const link = ensureCss()
  if (link) box.style.visibility = 'hidden'
  document.body.appendChild(box)
  if (link) { const show = () => { box.style.visibility = '' }; link.addEventListener('load', show); link.addEventListener('error', show); setTimeout(show, 1500) }

  let timers = []
  const stopTimers = () => { timers.forEach(clearTimeout); timers = [] }
  const onKey = (e) => { if (e.key === 'Escape' && !st.busy) close() }
  document.addEventListener('keydown', onKey)
  function close() { stopTimers(); st.gen++; document.removeEventListener('keydown', onKey); box.remove() }
  box.addEventListener('click', (e) => { if (e.target === box && !st.busy && !st.opts.length) close() })

  const leftText = () => (st.left === null ? '' : st.left > 0 ? T('dd_left').replace('{n}', st.left) : T(st.gold ? 'dd_e_quotaGold' : 'dd_leftNone'))

  // ---- the words and the choices -------------------------------------------------------------------------

  function compose() {
    inner.innerHTML = `<h2 id="ddt">${T('dd_title')}</h2><p class="hint">${T('dd_hint')}</p>
      <label class="field"><span id="ddlab">${T(st.from ? 'dd_askPhoto' : 'dd_ask')}</span>
        <textarea id="ddp" maxlength="300" rows="3" placeholder="${T('dd_ph')}" aria-describedby="ddn">${esc(st.text)}</textarea><small id="ddn" class="ddcount"></small></label>
      <div class="ddex" id="ddex"${st.from ? ' hidden' : ''}><span>${T('dd_try')}</span>${ex.map((s) => `<button type="button" class="ddx" data-ex="${s}">${s}</button>`).join('')}</div>
      <div class="field"><span>${T('dd_style')}</span><div class="ddstyles" role="radiogroup" aria-label="${T('dd_style')}">${STYLES.map((s) =>
        `<button type="button" role="radio" aria-checked="${s === st.style}" data-style="${s}"><img src="${new URL('./doodle/' + s + '.webp', import.meta.url).pathname}" alt="" width="160" height="160"><span>${T('dd_s_' + s)}</span></button>`).join('')}</div></div>
      ${photos.length ? `<div class="field"><span>${T('dd_photo')}</span><p class="hint">${T('dd_photoHint')}</p><div class="ddphotos">${photos.slice(0, 40).map((id) =>
        `<button type="button" data-from="${esc(id)}" aria-pressed="${id === st.from}"><img src="${esc(url(id, true))}" alt="" loading="lazy"></button>`).join('')}</div></div>` : ''}
      <p class="ddmsg" id="ddmsg" role="alert" hidden></p>
      <div class="row end"><button class="back" id="ddno">${T('back')}</button><button class="go red big" id="ddgo">${icon('sparkle')}${T('dd_go')}</button></div>
      <p class="ddleft" id="ddleft">${leftText()}</p>`
    const ta = inner.querySelector('#ddp')
    const count = () => { inner.querySelector('#ddn').textContent = `${ta.value.length}/300` }
    ta.addEventListener('input', () => { st.text = ta.value; count() })
    count()
    if (window.matchMedia?.('(pointer:fine)').matches) ta.focus()
  }

  const say = (e) => {
    const k = e?.message, w = e?.why
    if (k === 'refused') return T('dd_no_' + (WHYS.includes(w) ? w : 'other'))
    if (k === 'quota') return T(w === 'words' ? 'dd_e_words' : w === 'gold' ? 'dd_e_quotaGold' : 'dd_e_quotaFree')
    if (k === 'busy') return T({ text: 'dd_e_text', day: 'dd_e_day', check: 'dd_e_check' }[w] || 'dd_e_busy')
    if (k === 'empty' || k === 'long' || k === 'photo') return T('dd_e_' + k)
    return T('dd_e_net')
  }
  const msg = (html) => { const m = inner.querySelector('#ddmsg'); if (m) { m.innerHTML = html; m.hidden = !html } }

  // ---- while it draws ------------------------------------------------------------------------------------

  function wait() {
    st.busy = true
    inner.innerHTML = `<div class="ddwait" aria-live="polite">${LANTERN}<h2>${T('dd_drawing')}</h2>
      ${st.text ? `<p class="ddsay">${esc(st.text)}</p>` : ''}
      <ol class="ddsteps">${[1, 2, 3, 4, 5].map((n) => `<li data-n="${n}">${T('dd_st' + n)}</li>`).join('')}</ol>
      <p class="hint">${T('dd_wait')}</p><button class="back" id="ddstop">${T('dd_cancel')}</button></div>`
    const lis = [...inner.querySelectorAll('.ddsteps li')]
    STEPS_AT.forEach((ms, i) => timers.push(setTimeout(() => lis.forEach((li, j) => { li.className = j < i ? 'done' : j === i ? 'on' : '' }), ms)))
  }

  // ---- the two to choose from ----------------------------------------------------------------------------

  function results() {
    st.busy = false
    inner.innerHTML = `<h2>${T('dd_pick')}</h2><p class="hint">${T('dd_pickHint')}</p>
      <div class="ddopts">${st.opts.map((o, i) => `<figure class="ddopt" data-i="${i}"><img src="${esc(o.url)}" alt="${st.text ? esc(st.text) : T('dd_photo')}" width="${o.w || 1024}" height="${o.h || 1024}">
        <figcaption>${optBar(o)}</figcaption></figure>`).join('')}</div>
      <p class="ddmsg" id="ddmsg" role="alert" hidden></p>
      <div class="row end"><button class="back" id="ddagain">${T('dd_again')}</button><button class="go ink" id="dddone">${T('dd_done')}</button></div>
      <p class="ddleft">${leftText()}</p>`
  }
  const optBar = (o) => (st.used[o.id]
    ? `<p class="ddok">${icon('check')}${T(st.used[o.id] === 'cover' ? 'dd_usedCover' : 'dd_usedAdd')}</p>`
    : `<button class="go red" data-as="cover">${T('dd_cover')}</button><button class="go ghost" data-as="photo">${T('dd_add')}</button>`)

  async function draw() {
    const text = st.text.trim()
    if (!st.from && text.length < 2) return msg(T('dd_e_empty'))
    st.text = text
    store.set('doodle-style', st.style)
    const my = ++st.gen
    wait()
    try {
      const r = await call('POST', 'doodle', { n: name, prompt: text, style: st.style, ...(st.from ? { from: st.from } : {}) })
      if (my !== st.gen) return
      stopTimers()
      st.left = r.left; st.max = r.max; st.gold = !!r.gold
      st.opts = r.options || []; st.used = {}
      results()
    } catch (e) {
      if (my !== st.gen) return
      stopTimers()
      st.busy = false
      if (e?.message === 'quota') st.left = 0
      compose()
      msg(say(e))
    }
  }

  async function use(i, as, btn) {
    const o = st.opts[i]
    if (!o || st.used[o.id]) return
    const bar = btn.closest('figcaption')
    bar.querySelectorAll('button').forEach((b) => { b.disabled = true })
    try {
      const r = await call('POST', 'doodle', { n: name, use: o.id })
      await onUse(r.id, { as, credit: r.credit })
      st.used[o.id] = as
      bar.innerHTML = optBar(o)
      msg('')
    } catch (e) {
      bar.querySelectorAll('button').forEach((b) => { b.disabled = false })
      msg(e?.message === 'full' ? T('e_full') : say(e))
    }
  }

  // ---- taps ----------------------------------------------------------------------------------------------

  box.addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b || !inner.contains(b)) return
    if (b.dataset.ex !== undefined) { st.text = b.dataset.ex; const ta = inner.querySelector('#ddp'); ta.value = st.text; ta.dispatchEvent(new Event('input')); msg(''); return }
    if (b.dataset.style) {
      st.style = b.dataset.style
      inner.querySelectorAll('[data-style]').forEach((x) => x.setAttribute('aria-checked', String(x === b)))
      return
    }
    if (b.dataset.from !== undefined) {
      st.from = st.from === b.dataset.from ? '' : b.dataset.from
      if (st.from && exPlain.includes(st.text)) { st.text = ''; const ta = inner.querySelector('#ddp'); ta.value = ''; ta.dispatchEvent(new Event('input')) } // an example is not a change to a photo
      inner.querySelectorAll('[data-from]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.from === st.from)))
      inner.querySelector('#ddlab').innerHTML = T(st.from ? 'dd_askPhoto' : 'dd_ask')
      inner.querySelector('#ddex').hidden = !!st.from
      return
    }
    if (b.dataset.as) { use(+b.closest('.ddopt').dataset.i, b.dataset.as, b); return }
    if (b.id === 'ddgo') draw()
    if (b.id === 'ddno' || b.id === 'dddone') close()
    if (b.id === 'ddstop') { st.gen++; stopTimers(); st.busy = false; compose() }
    if (b.id === 'ddagain') { st.opts = []; compose() }
  })

  compose()
  // how many doodles are left today
  call('GET', 'doodle').then((r) => { st.left = r.left; st.max = r.max; st.gold = !!r.gold; const l = inner.querySelector('#ddleft'); if (l) l.innerHTML = leftText() }).catch(() => {})
  return box
}

/** Loads doodle.css once. Returns its <link> while it is still loading, else null. */
function ensureCss() {
  const have = document.querySelector('link[href$="/doodle.css"], link[data-dd]')
  if (have) return have.sheet ? null : have
  const l = document.createElement('link')
  l.rel = 'stylesheet'
  l.href = new URL('./doodle.css', import.meta.url).href
  l.dataset.dd = '1'
  document.head.appendChild(l)
  return l
}
