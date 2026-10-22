// make-gbp.mjs — the Gold tab's Google card (NaN 2026-10-22): the page kept in step with Google Business Profile,
// and, with or without that connection, a kit of the page's fields in the order Google's own form asks for them,
// each with a copy button. The connection part reads GET /api/gbp; the kit is drawn from the page being edited.

import { kitOf, GBP_URL } from './gbp-kit.mjs'

export const GBP_CSS = `.gbp .kit{margin:14px 0 0;padding:0;list-style:none;display:grid;gap:8px}.gbp .kit li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;padding:10px 12px;border-radius:12px;background:var(--cream,#faf5ea)}
.gbp .kit .k{grid-column:1/-1;font-weight:800;font-size:14px;color:var(--mute,#6b6358)}.gbp .kit .v{white-space:pre-wrap;overflow-wrap:anywhere;font-size:16px}.gbp .kit .v.none{color:var(--mute,#6b6358)}
.gbp .cp2{min-height:38px;padding:6px 14px;border:0;border-radius:99px;background:var(--gold,#f5c518);color:#000;font-weight:800;font-size:15px;cursor:pointer}.gbp .cp2.done{background:#fff;box-shadow:inset 0 0 0 2px #0b8043;color:#0b8043}
.gbp .kit.days li{grid-template-columns:5.5em minmax(0,1fr) auto}.gbp .kit.days .k{grid-column:auto}
.gbp h4{margin:18px 0 4px;font-size:15px}.gbp .sub{font-weight:700;margin:12px 0 2px}.gbp .locs{display:grid;gap:8px;margin:10px 0}.gbp .locs button{text-align:left;min-height:48px;padding:10px 14px;border-radius:12px;border:0;background:#fff;box-shadow:inset 0 0 0 2px var(--line,#e6dcc8);font:inherit;cursor:pointer}
.gbp .locs small{display:block;color:var(--mute,#6b6358)}.gbp .pics{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}.gbp .pics img{width:72px;height:72px;object-fit:cover;border-radius:10px;display:block}
.gbp .err{color:#b3261e;font-weight:700;margin:8px 0}.gbp .row2{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0}`

/** The card. h = { T, esc, icon, imgUrl, url, lang } ; S = the builder's state. Draws at once; bindGbp fills the connection part. */
export function gbpBox(S, h) {
  const { T, esc } = h
  const k = kitOf(S.d, { url: h.url, lang: S.lang })
  const row = (label, value, empty) => `<li><span class="k">${label}</span>${value ? `<span class="v">${esc(value)}</span><button type="button" class="cp2" data-gbpcopy="${esc(value)}">${T('gb_copy')}</button>` : `<span class="v none">${empty}</span>`}</li>`
  const hours = k.hours
    ? k.hours.map((r) => row(esc(r.day), r.kind === 'closed' ? '' : r.kind === 'open24' ? T('gb_open24') : r.value, T('gb_closed'))).join('')
    : `<li><span class="k">${T('gb_hours')}</span><span class="v none">${T('gb_noHours')}</span></li>`
  const offers = k.offers.map((o) => `<h4>${T('gb_offers')} · ${esc(o.title)}</h4><ul class="kit">${[
    row(T('gb_offerTitle'), o.title, ''), row(T('gb_offerText'), o.summary, ''), row(T('gb_startDate'), o.startDate, ''), row(T('gb_startTime'), o.startTime, ''),
    row(T('gb_endDate'), o.endDate, ''), row(T('gb_endTime'), o.endTime, ''), o.code ? row(T('gb_code'), o.code, '') : '', row(T('gb_link'), o.link, '')].join('')}</ul>`).join('')
  const pics = [...new Set([S.d.cover, ...S.d.photos].filter(Boolean))].slice(0, 6)
  const desc = k.desc ? `<span class="v">${esc(k.desc)}</span><button type="button" class="cp2" data-gbpcopy="${esc(k.desc)}">${T('gb_copy')}</button><span class="k" style="font-weight:600">${T('gb_descLen').replace('{n}', k.desc.length)}</span>` : `<span class="v none">${T('gb_noDesc')}</span>`
  return `<section class="panel gbp" id="gbpbox"><h3>${T('gb_h')}</h3><p class="hint">${T('gb_why')}</p>
    <div id="gbpconn"></div>
    <h4>${T('gb_kit')}</h4><p class="hint">${T('gb_kitHint')}</p>
    <p><a class="go ghost small" href="${GBP_URL}" target="_blank" rel="noopener">${T('gb_open')} ↗</a></p>
    <ul class="kit"><li><span class="k">${T('gb_desc')}</span>${desc}</li>
      ${row(T('gb_phone'), k.phone, T('gb_noPhone'))}${row(T('gb_web'), k.web, '')}</ul>
    <h4>${T('gb_hours')}</h4>${k.hours ? `<ul class="kit">${row(T('gb_hours'), k.hoursAll, '').replace(T('gb_copy') + '</button>', T('gb_copyAll') + '</button>')}</ul>` : ''}<ul class="kit days">${hours}</ul>
    ${pics.length ? `<h4>${T('gb_photos')}</h4><p class="hint">${T('gb_photoHint')}</p><div class="pics">${pics.map((id) => `<a href="${esc(h.imgUrl(id))}" target="_blank" rel="noopener"><img src="${esc(h.imgUrl(id, true))}" alt=""></a>`).join('')}<a href="/card/${esc(S.name)}.jpg" target="_blank" rel="noopener" class="go ghost small">${T('gb_card')}</a></div>` : ''}
    ${offers}</section>`
}

const dateOf = (iso, lang) => { try { return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) } catch { return iso } }

/** Wire the card: copy buttons now, the connection part when GET /api/gbp answers. h = { call, T, esc, toast, redraw } */
export function bindGbp(root, S, h) {
  const { T, esc } = h
  root.querySelectorAll('[data-gbpcopy]').forEach((b) => (b.onclick = async () => {
    const v = b.dataset.gbpcopy
    try { await navigator.clipboard.writeText(v) } catch {
      const ta = document.createElement('textarea'); ta.value = v; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch {} ta.remove()
    }
    const was = b.textContent; b.textContent = T('gb_copied'); b.classList.add('done')
    setTimeout(() => { b.textContent = was; b.classList.remove('done') }, 1500)
  }))
  const box = root.querySelector('#gbpconn')
  if (!box) return
  const words = (e) => {
    if (!e) return ''
    const w = ({ closed: 'gb_e_closed', access: 'gb_e_access', apioff: 'gb_e_apioff', quota: 'gb_e_quota', bad: 'gb_e_bad', photo: 'gb_e_photo', post: 'gb_e_post', net: 'gb_e_net',
      denied: 'gb_e_denied', gold: 'gb_e_gold', norefresh: 'gb_e_norefresh', nolocation: 'gb_e_nolocation', notlive: 'gb_e_notlive', notgold: 'gb_e_notgold', off: 'gb_e_off', location: 'gb_e_location' })[e.code] || 'gb_e_other'
    return `<p class="err">${T(w)}${e.detail && ['bad', 'photo', 'post', 'other'].includes(e.code) ? ` <small>${esc(e.detail)}</small>` : ''}</p>`
  }
  const draw = (st, extra = '') => {
    if (!st.on) { box.innerHTML = `<p class="pinstate">${h.icon('clock')}${T('gb_soon')}</p>`; return }
    if (!st.connected) { box.innerHTML = `${extra}<p><button type="button" class="go" id="gbpgo">${T('gb_connect')}</button></p>`; return }
    if (!st.location) { pick(extra); return }
    box.innerHTML = `${extra}<p class="pinstate ok">${h.icon('check')}${T('gb_linked')} <b>${esc(st.location.title || st.location.name)}</b></p>
      <p class="hint">${T('gb_last')}: ${st.last_ok ? esc(dateOf(st.last_ok, S.lang)) : T('gb_never')}</p>${words(st.err)}<p class="hint">${T('gb_sends')}</p>
      <div class="row2"><button type="button" class="go small" id="gbpnow">${T('gb_now')}</button><button type="button" class="back" id="gbpx">× ${T('gb_drop')}</button></div>`
  }
  async function pick(extra = '') {
    box.innerHTML = `${extra}<p class="hint">${T('gb_load')}</p>`
    try {
      const r = await h.call('GET', 'gbp/locations')
      box.innerHTML = `${extra}<p class="sub">${T('gb_pick')}</p><p class="hint">${T('gb_pickHint')}</p>` + (r.locations.length
        ? `<div class="locs">${r.locations.map((l, i) => `<button type="button" data-gbploc="${i}"><b>${esc(l.title)}</b><small>${esc(l.addr)}</small></button>`).join('')}</div>` : `<p class="hint">${T('gb_none')}</p>`) +
        `<p><button type="button" class="back" id="gbpx">× ${T('gb_drop')}</button></p>`
      box.querySelectorAll('[data-gbploc]').forEach((b) => (b.onclick = async () => {
        const l = r.locations[+b.dataset.gbploc]; b.disabled = true
        try { draw(await h.call('POST', 'gbp/location', { account: l.account, name: l.name })); bind() } catch (e) { h.toast(T('gb_e_' + (e.message === 'closed' ? 'closed' : 'other'))); b.disabled = false }
      }))
    } catch (e) { box.innerHTML = `${extra}${words({ code: e.message, detail: e.why })}<p><button type="button" class="go" id="gbpgo">${T('gb_connect')}</button> <button type="button" class="back" id="gbpx">× ${T('gb_drop')}</button></p>` }
    bind()
  }
  function bind() {
    const go = box.querySelector('#gbpgo'), now = box.querySelector('#gbpnow'), x = box.querySelector('#gbpx')
    if (go) go.onclick = async () => { go.disabled = true; try { location.href = (await h.call('POST', 'gbp/connect')).url } catch { go.disabled = false; h.toast(T('gb_e_other')) } }
    if (now) now.onclick = async () => { now.disabled = true; now.textContent = T('gb_busy'); try { draw(await h.call('POST', 'gbp/sync')); bind() } catch { now.disabled = false; now.textContent = T('gb_now'); h.toast(T('gb_e_net')) } }
    if (x) x.onclick = async () => { try { await h.call('DELETE', 'gbp'); draw({ ...(await h.call('GET', 'gbp')) }); bind() } catch { h.toast(T('gb_e_other')) } }
  }
  h.call('GET', 'gbp').then((st) => {
    const back = S.gbpBack
    S.gbpBack = ''
    draw(st, back ? (back.startsWith('err:') ? words({ code: back.slice(4) }) : `<p class="pinstate ok">${h.icon('check')}${T('gb_connected')}</p>`) : '')
    bind()
  }).catch(() => { box.innerHTML = '' })
}
