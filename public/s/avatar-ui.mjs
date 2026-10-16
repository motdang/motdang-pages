// avatar-ui.mjs — the avatar sheet (Nan 2026-10-16: "the avatar builder should be much more developed").
// A character drawn from parts, for a maker with no picture. Built like openMark in studio-ui.mjs: a sheet
// on the page, and onUse(canvas, options) takes the 640 × 640 picture the way it takes a photo.
// The drawing itself is avatar.mjs; the sheet's words are make-words-avatar.mjs; its styles avatar.css.

import { AV_PARTS, AV_TABS, AV_PRESETS, avatarSvg, avatarTile, randomAvatar, normalizeAvatar, partShown, softColour } from './avatar.mjs'
import { A } from './make-words-avatar.mjs'

const LANGS = ['th', 'en', 'my', 'zh']
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const hashText = (s) => { let h = 0; for (const ch of String(s)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0; return h }
const svgIcon = (inner) => `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`

const TAB_ICON = {
  face: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10.4" r="1.4" fill="currentColor"/><circle cx="15" cy="10.4" r="1.4" fill="currentColor"/><path d="M8.2 14.4c1.6 2 5.9 2 7.6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  hair: '<path d="M4.6 15C4.6 8 8 4.6 12 4.6S19.4 8 19.4 15c-2.4-3.2-4.6-4.6-7.4-4.6S7 11.8 4.6 15z" fill="currentColor"/><path d="M7 19.4c.8-1.8 2.4-3 5-3s4.2 1.2 5 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  clothes: '<path d="M8.5 4L3 6.6 5 11l3-1.2V20h8V9.8l3 1.2 2-4.4L15.5 4c-.8 1.8-2 2.8-3.5 2.8S9.3 5.8 8.5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  extras: '<path d="M12 3l2.3 6.1L21 12l-6.7 2.9L12 21l-2.3-6.1L3 12l6.7-2.9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  back: '<rect x="3.5" y="5" width="17" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="1.8" fill="currentColor"/><path d="M4 17l5-4 3 2.4 3-3.4 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
}
const ICON_SHUFFLE = '<path d="M3 7h3.5c3 0 4 2 5.5 5s2.5 5 5.5 5H21M3 17h3.5c1.4 0 2.4-.5 3.3-1.5M14.2 8.3c.9-.8 1.9-1.3 3.3-1.3H21M18 4l3 3-3 3M18 14l3 3-3 3"/>'
const ICON_UNDO = '<path d="M9 6L4.5 10.5 9 15M4.5 10.5H14a5.5 5.5 0 0 1 0 11h-3"/>'

let webp
const canWebp = () => (webp ??= (() => { try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp') } catch { return false } })())

/** The avatar drawn to a square canvas. Where the browser cannot write WebP (it will fall back to JPEG, which has no
 * clear corners) the corners are filled with the background first. */
async function toCanvas(o, size) {
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSvg(o, size))
  await img.decode()
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  if (!canWebp()) { ctx.fillStyle = AV_PARTS.bgc.options.find((x) => x.id === o.bgc)?.c || (/^#[0-9a-f]{6}$/i.test(o.bgc) ? o.bgc : '#ffffff'); ctx.fillRect(0, 0, size, size) }
  ctx.drawImage(img, 0, 0, size, size)
  return c
}

/** The sheet. T(key) → words (the builder's T); kind: the page's kind; accent: the page's colour; start: options to edit.
 * onUse(canvas, options) → Promise; the sheet closes when it resolves. */
export function openAvatar({ name = '', accent = '', kind = 'me', T, onUse, lang, start }) {
  const tr = (k) => { const v = typeof T === 'function' ? T(k) : k; return v && v !== k ? v : esc(A.en[k] ?? k) }
  const L = LANGS.includes(lang) ? lang : LANGS.includes(String(T?.('av_lang'))) ? String(T('av_lang')) : 'en'
  if (!document.querySelector('link[href*="avatar.css"]')) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'; link.href = new URL('./avatar.css', import.meta.url).href
    document.head.appendChild(link)
  }

  const page = softColour(accent)
  const home = AV_PRESETS[kind] || AV_PRESETS.me
  let o = normalizeAvatar(start || { ...home[hashText(name) % home.length].o, bg: 'glow', bgc: page || 'sun', frame: 'circle' })
  const hist = []
  let tab = 'face', seed = Date.now()

  const label = (x) => (x.own ? tr('av_pagecolour') : esc(x.label[L] || x.label.en))
  const optsOf = (pid) => (pid === 'bgc' && page ? [{ id: page, c: page, own: true }, ...AV_PARTS.bgc.options] : AV_PARTS[pid].options)

  const tabsHtml = AV_TABS.map((t) => `<button type="button" class="avtab" role="tab" id="avtab-${t.id}" data-tab="${t.id}" aria-controls="avpanel" aria-selected="${t.id === tab}">${svgIcon(TAB_ICON[t.id])}<span>${esc(t.label[L] || t.label.en)}</span></button>`).join('')
  const presetsHtml = home.map((p) => `<button type="button" class="avp" data-preset="${p.id}" aria-label="${esc(p.label[L] || p.label.en)}"><span></span><b>${esc(p.label[L] || p.label.en)}</b></button>`).join('')

  const box = document.createElement('div')
  box.className = 'sheet avmk'
  box.setAttribute('role', 'dialog')
  box.setAttribute('aria-modal', 'true')
  box.setAttribute('aria-label', String(T?.('av_title') || A.en.av_title).replace(/&[a-z#0-9]+;/gi, ''))
  box.innerHTML = `<div class="box" tabindex="-1">
    <div class="avhead"><h2>${tr('av_title')}</h2><p class="hint">${tr('av_hint')}</p></div>
    <div class="avprev"><div class="avstage" id="avstage" role="img" aria-label="${esc(name)}"></div>
      <div class="avq"><button type="button" id="avshuf">${svgIcon(ICON_SHUFFLE)}<span>${tr('av_shuffle')}</span></button><button type="button" class="light" id="avundo" disabled>${svgIcon(ICON_UNDO)}<span>${tr('av_undo')}</span></button></div></div>
    <div class="avbody" id="avbody">
      <p class="avlab">${tr('av_start')}</p><div class="avpre" id="avpre">${presetsHtml}</div>
      <div class="avtabs" role="tablist">${tabsHtml}</div>
      <div id="avpanel" role="tabpanel"></div>
    </div>
    <div class="avfoot"><button class="back" type="button" id="avno">${tr('back')}</button><button class="go red" type="button" id="avuse">${tr('av_use')}</button></div></div>`
  document.body.appendChild(box)
  box.addEventListener('click', (e) => { if (e.target === box) box.remove() })

  const stage = box.querySelector('#avstage'), panel = box.querySelector('#avpanel'), body = box.querySelector('#avbody')
  const undoBtn = box.querySelector('#avundo')

  function panelHtml() {
    return AV_TABS.find((t) => t.id === tab).parts.map((pid) => {
      const part = AV_PARTS[pid]
      const cells = optsOf(pid).map((x) => (part.type === 'swatch'
        ? `<button type="button" class="avsw" data-part="${pid}" data-v="${esc(x.id)}" style="--c:${x.c}" aria-pressed="false" aria-label="${label(x)}" title="${label(x)}"></button>`
        : `<button type="button" class="avt" data-part="${pid}" data-v="${esc(x.id)}" aria-pressed="false" aria-label="${label(x)}" title="${label(x)}"><span class="avpic"></span></button>`)).join('')
      return `<section class="avsec" data-sec="${pid}"><h3 class="avh">${esc(part.label[L] || part.label.en)}<b></b></h3><div class="avgrid ${part.type}" role="group" aria-label="${esc(part.label[L] || part.label.en)}">${cells}</div></section>`
    }).join('')
  }

  /** Everything that shows the avatar, again: the big one, the presets, and this tab's tiles. */
  function refresh() {
    stage.innerHTML = avatarSvg(o, 260)
    for (const b of box.querySelectorAll('.avp')) b.firstChild.innerHTML = avatarSvg({ ...home.find((p) => p.id === b.dataset.preset).o, bg: o.bg, bgc: o.bgc, frame: o.frame }, 76)
    for (const sec of panel.querySelectorAll('.avsec')) {
      const pid = sec.dataset.sec, part = AV_PARTS[pid]
      sec.hidden = !partShown(pid, o)
      if (sec.hidden) continue
      let now = ''
      for (const b of sec.querySelectorAll('.avt, .avsw')) {
        if (b.classList.contains('avt')) b.firstChild.innerHTML = avatarTile(o, pid, b.dataset.v, 88)
        const on = o[part.key] === b.dataset.v
        b.classList.toggle('on', on)
        b.setAttribute('aria-pressed', String(on))
        if (on) now = b.getAttribute('aria-label')
      }
      sec.querySelector('.avh b').textContent = now && !part.quiet ? ' · ' + now.replace(/&amp;/g, '&') : ''
    }
    undoBtn.disabled = !hist.length
  }

  function change(patch, keepHist = true) {
    if (keepHist) { hist.push(o); if (hist.length > 80) hist.shift() }
    o = normalizeAvatar({ ...o, ...patch })
    refresh()
  }

  function showTab(id) {
    tab = id
    for (const b of box.querySelectorAll('.avtab')) b.setAttribute('aria-selected', String(b.dataset.tab === id))
    panel.setAttribute('aria-labelledby', 'avtab-' + id)
    panel.innerHTML = panelHtml()
    refresh()
    const bar = box.querySelector('.avtabs')
    if (body.scrollTop > bar.offsetTop) body.scrollTop = bar.offsetTop
  }

  box.addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b) return
    if (b.dataset.tab) showTab(b.dataset.tab)
    else if (b.dataset.preset) { const p = home.find((x) => x.id === b.dataset.preset); change({ ...p.o, bg: o.bg, bgc: o.bgc, frame: o.frame }) }
    else if (b.dataset.part) { const p = AV_PARTS[b.dataset.part]; change({ [p.key]: b.dataset.v }) }
  })
  box.querySelector('#avshuf').onclick = () => { seed += 1; const r = randomAvatar(seed, kind); change({ ...r, bg: o.bg, bgc: o.bgc, frame: o.frame }) }
  undoBtn.onclick = () => { if (hist.length) { o = hist.pop(); refresh() } }
  box.querySelector('#avno').onclick = () => box.remove()
  box.querySelector('#avuse').onclick = async (e) => {
    const b = e.currentTarget
    b.disabled = true
    try {
      const out = await toCanvas(o, 640)
      await onUse(out, { ...o })
      box.remove()
    } catch { b.disabled = false }
  }
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') box.remove()
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoBtn.click() }
    else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.closest?.('.avtabs')) {
      const ids = AV_TABS.map((t) => t.id), i = ids.indexOf(tab), n = ids[(i + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length]
      showTab(n)
      box.querySelector(`#avtab-${n}`).focus()
    }
  })

  showTab('face')
  box.querySelector('.box').focus({ preventScroll: true })
  return box
}
