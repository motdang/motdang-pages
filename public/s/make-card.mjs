// make-card.mjs — the builder's share card part: the card as it will draw, and what the maker can choose
// (NaN 2026-10-20: "add a card-drawing library and some kind of user input interface on card design").
// The preview is the card library's own drawing (POST /api/card), so what the maker sees is the card.
// The choices live in d.og (og.mjs); item pages take the style with their own photo and name.

import { OG_LAYOUTS, OG_FONTS, fontOfLook } from './og.mjs'

const SW = ['#d7261e', '#f5c518', '#0b8043', '#1f6feb', '#7c3aed', '#111111', '#c8901f', '#e8559a']
// a small drawing of each layout: the picture grey, the words white
const LAY = {
  photo: '<rect width="60" height="32" rx="3" fill="#8a8a8a"/><rect x="5" y="16" width="26" height="5" fill="#fff"/><rect x="5" y="23" width="18" height="3" fill="#fff"/>',
  band: '<rect width="60" height="32" rx="3" fill="#8a8a8a"/><rect y="18" width="60" height="14" fill="var(--acc,#d7261e)"/><rect x="5" y="21" width="30" height="4" fill="#fff"/><rect x="5" y="27" width="18" height="2" fill="#fff"/>',
  split: '<rect width="60" height="32" rx="3" fill="var(--acc,#d7261e)"/><rect x="32" width="28" height="32" fill="#8a8a8a"/><rect x="4" y="12" width="22" height="5" fill="#fff"/><rect x="4" y="20" width="16" height="3" fill="#fff"/>',
  plain: '<rect width="60" height="32" rx="3" fill="#222"/><circle cx="48" cy="9" r="12" fill="var(--acc,#d7261e)" opacity=".5"/><rect x="5" y="14" width="30" height="6" fill="#fff"/><rect x="5" y="23" width="20" height="3" fill="#fff"/>',
}

const og = (S) => (S.d.og = S.d.og && typeof S.d.og === 'object' ? S.d.og : {})

/** The part's body. h = { T, esc, imgUrl, isGold, accent } */
export function cardHtml(S, h) {
  const { T, esc } = h
  const g = og(S), d = S.d
  const layout = g.layout || 'photo', font = g.font || fontOfLook(S.look), photo = g.photo || d.cover || d.photos[0] || ''
  const acc = g.accent || h.accent
  const items = [...d.works.map((x) => ['w', x]), ...d.amulets.map((x) => ['a', x]), ...(d.products || []).map((x) => ['p', x]), ...(h.isGold ? d.lists.map((x) => ['l', x]) : [])].filter(([, x]) => x.t).slice(0, 60)
  const pics = [...new Set([d.cover, ...d.photos].filter(Boolean))]
  return `<p class="hint">${T('og_why')}</p>
    <figure class="ogpv" id="ogpv" style="--acc:${esc(acc)}"><img id="ogimg" alt="" width="1200" height="630"><span class="ogbusy" hidden></span></figure>
    <p class="hint ogfocus"${layout === 'plain' || !photo ? ' hidden' : ''}>${T('og_focus')}</p>
    ${items.length ? `<label class="field"><span>${T('og_seeItem')}</span><select id="ogitem"><option value="">${T('og_page')}</option>${items.map(([t, x]) => `<option value="${t}:${esc(x.id)}">${esc(x.t)}</option>`).join('')}</select></label>` : ''}
    <p class="lbl2">${T('og_layout')}</p>
    <div class="oglay" role="group">${OG_LAYOUTS.map((l) => `<button type="button" data-oglayout="${l}"${l === layout ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"'} style="--acc:${esc(acc)}"><svg viewBox="0 0 60 32" aria-hidden="true">${LAY[l]}</svg><span>${T('og_l_' + l)}</span></button>`).join('')}</div>
    ${pics.length ? `<p class="lbl2">${T('og_pic')}</p>` : ''}
    <div class="ogpics">${pics.map((id) => `<button type="button" data-ogphoto="${esc(id)}"${id === photo ? ' class="on"' : ''}><img src="${esc(h.imgUrl(id, true))}" alt=""></button>`).join('')}</div>
    <label class="field"><span>${T('og_title')}</span><input type="text" data-k="og.title" maxlength="80" value="${esc(g.title || '')}" placeholder="${esc(d.name || S.name)}"></label>
    <label class="field"><span>${T('og_line')}</span><input type="text" data-k="og.line" maxlength="120" value="${esc(g.line || '')}" placeholder="${esc(d.tagline || '')}"></label>
    <p class="lbl2">${T('og_font')}</p>
    <div class="ogfont seg" role="group">${OG_FONTS.map((f) => `<button type="button" data-ogfont="${f}"${f === font ? ' class="on"' : ''}>${T('og_f_' + f)}</button>`).join('')}</div>
    <p class="lbl2">${T('colour')}</p>
    <div class="ogsw">${[...new Set([h.accent, ...SW])].map((c) => `<button type="button" data-ogaccent="${c}" style="background:${c}"${c === acc ? ' class="on"' : ''} aria-label="${c}"></button>`).join('')}</div>
    ${items.length ? `<p class="hint">${T('og_items')}</p>` : ''}
    <p class="hint">${T('og_draft')}</p>`
}

/** Wire the part. h = { changed, token: () => S.token, toast, T } */
export function cardBind(form, S, h) {
  let timer = 0, seq = 0, url = '', item = ''
  const draw = () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      const img = form.querySelector('#ogimg')
      if (!img) return
      const busy = form.querySelector('.ogbusy'), n = ++seq
      if (busy) busy.hidden = false
      const [t, id] = item ? item.split(':') : ['', '']
      try {
        const r = await fetch('/api/card', { method: 'POST', headers: { 'content-type': 'application/json', 'x-edit': h.token() }, body: JSON.stringify({ d: S.d, look: S.look, t, id }) })
        if (!r.ok) throw new Error('http-' + r.status)
        const b = await r.blob()
        if (n !== seq) return
        if (url) URL.revokeObjectURL(url)
        url = URL.createObjectURL(b)
        img.src = url
      } catch { if (n === seq) h.toast(h.T('og_err')) }
      if (busy && n === seq) busy.hidden = true
    }, 450)
  }
  const set = (k, v) => { og(S)[k] = v; h.changed(); draw() }
  const mark = (sel, b) => { form.querySelectorAll(sel).forEach((x) => { x.classList.toggle('on', x === b); if (x.hasAttribute('aria-pressed')) x.setAttribute('aria-pressed', String(x === b)) }) }
  form.addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (b?.dataset.oglayout !== undefined) { mark('[data-oglayout]', b); set('layout', b.dataset.oglayout); focusHint() }
    else if (b?.dataset.ogfont !== undefined) { mark('[data-ogfont]', b); set('font', b.dataset.ogfont) }
    else if (b?.dataset.ogphoto !== undefined) { mark('[data-ogphoto]', b); set('photo', b.dataset.ogphoto); focusHint() }
    else if (b?.dataset.ogaccent !== undefined) { mark('[data-ogaccent]', b); set('accent', b.dataset.ogaccent); form.querySelectorAll('.oglay button,#ogpv').forEach((x) => x.style.setProperty('--acc', b.dataset.ogaccent)) }
    else if (e.target.closest('#ogpv') && !item) {
      // the part of the picture to keep: where the tap lands inside the picture's own area
      const r = e.target.closest('#ogpv').getBoundingClientRect(), L = og(S).layout || 'photo'
      let fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height
      if (L === 'band') fy = Math.min(1, fy / (352 / 630))
      if (L === 'split') fx = Math.max(0, (fx - 640 / 1200) / (560 / 1200))
      og(S).fy = Math.round(Math.min(1, Math.max(0, fy)) * 100) / 100
      set('fx', Math.round(Math.min(1, Math.max(0, fx)) * 100) / 100)
    }
  })
  const focusHint = () => { const p = form.querySelector('.ogfocus'); if (p) p.hidden = (og(S).layout || 'photo') === 'plain' || !(og(S).photo || S.d.cover || S.d.photos[0]) }
  form.addEventListener('input', (e) => { if (/^og\./.test(e.target.dataset.k || '')) draw() })
  form.addEventListener('change', (e) => { if (e.target.id === 'ogitem') { item = e.target.value; draw() } })
  // the part opens: draw the card once its picture is in the page
  new MutationObserver(() => { const img = form.querySelector('#ogimg'); if (img && !img.dataset.seen) { img.dataset.seen = '1'; item = ''; draw() } }).observe(form, { childList: true, subtree: true })
}
