// make-customers.mjs — the Customers tab of the maker (Nan 2026-10-22): the people who booked or wrote,
// the CSV, and the month's news (email to those who said yes; a share link to send the same words on LINE).

import { lineShare } from './render.mjs'

/** Draw the tab into `tb`. h = { S, call, ui, esc, toast, icon, goldLocked, tabsRefresh }. */
export async function drawCustomers(tb, h) {
  const { S, call, ui, esc, toast, icon, goldLocked } = h
  const T = (k, v) => { let s = ui(S.lang, k); if (v) for (const [a, b] of Object.entries(v)) s = s.split('{' + a + '}').join(b); return esc(s) }
  const head = `<section class="tabhead one"><div><h2 class="th2">${T('t_cust')}</h2><p class="why3">${T('c_why')}</p></div></section>`
  if (S.tier !== 'gold') { tb.innerHTML = head + goldLocked(); return }
  let r
  try { r = await call('GET', 'customers') } catch { tb.innerHTML = head + `<p class="hint">${T('e_net')}</p>`; return }
  const nf = new Intl.NumberFormat(S.lang)
  const day = (iso) => { try { return iso ? new Intl.DateTimeFormat(S.lang, { dateStyle: 'medium' }).format(new Date(iso + 'T00:00:00Z')) : '' } catch { return iso } }
  const newsLabel = (c) => (c.news === 'yes' ? (c.mail ? T('c_yes') : T('c_noMail')) : c.news === 'off' ? T('c_off') : T('c_no'))
  const card = (c) => `<article class="msg cust ${c.news}"><header><b>${esc(c.name || c.email || c.phone || c.line || '—')}</b><span>${esc(day(c.last))}</span></header>
    <p class="reach">${[c.email, c.phone, c.line].filter(Boolean).map(esc).join(' · ') || '—'}</p>
    <p class="cmeta"><span>${T('c_first')} ${esc(day(c.first))}</span><span>${T('c_bk')} ${nf.format(c.bookings)}</span><span>${T('c_msgs')} ${nf.format(c.messages)}</span><span class="cnews ${c.news}">${T('c_news')}: ${newsLabel(c)}</span>${(c.source || []).includes('signup') ? `<span>${T('c_signup')}</span>` : ''}</p></article>`
  const n = r.news
  const nextWhen = (() => { try { return new Intl.DateTimeFormat(S.lang, { month: 'long', year: 'numeric' }).format(new Date(n.next + '-01T00:00:00Z')) } catch { return n.next } })()
  const used = n.used
  const tiles = `<div class="tiles"><div class="tile"><b>${nf.format(n.customers)}</b><span>${T('t_cust')}</span></div><div class="tile"><b>${nf.format(n.yes)}</b><span>${T('c_news')}: ${T('c_yes')}</span></div><div class="tile"><b>${nf.format(n.mail)}</b><span>${T('email')}</span></div></div>`
  const linkOpts = [`<option value="">${T('n_linkNone')}</option>`, ...n.links.map((x) => `<option value="${esc(x.k)}">${esc(ui(S.lang, x.w))}${x.label ? ' · ' + esc(x.label) : ''}</option>`)].join('')
  const compose = `<section class="panel" id="news"><h3>${T('n_head')}</h3><p class="why3">${T('n_why')}</p>
    ${used ? `<p class="pinstate ok">${icon('check')}${T('n_used', { n: nf.format(used.sent) })}${used.failed ? ' · ' + T('n_failed', { n: nf.format(used.failed) }) : ''} · ${T('n_next', { m: esc(nextWhen) })}</p>` : n.mail ? `<p class="pinstate">${icon('mail')}${T('n_reach', { n: nf.format(n.mail) })}</p>` : `<p class="pinstate">${T('n_nobody')}</p>`}
    <label class="mini"><span>${T('n_text')}</span><textarea id="ntext" maxlength="600" rows="4">${used ? esc(used.body) : ''}</textarea></label>
    <label class="mini"><span>${T('n_link')}</span><select id="nlink">${linkOpts}</select></label>
    <p class="nmsg" id="nmsg" aria-live="polite"></p>
    <div class="row"><button class="go" id="nsend"${used || !n.mail ? ' disabled' : ''}>${icon('mail')}${T('n_send')}</button><a class="go line" id="nline" href="#" target="_blank" rel="noopener">${icon('chat')}${T('n_line')}</a></div></section>`
  const hist = n.history.length ? `<section class="panel"><h3>${T('n_hist')}</h3><ul class="plain">${n.history.map((x) => `<li><b>${esc(x.month)}</b> · ${nf.format(x.sent)}${x.failed ? ` (${T('n_failed', { n: nf.format(x.failed) })})` : ''}<br><span class="m">${esc(x.body.slice(0, 120))}</span></li>`).join('')}</ul></section>` : ''
  tb.innerHTML = head + tiles + (n.pending ? `<p class="hint">${T('c_pending', { n: nf.format(n.pending) })}</p>` : '') + `<p style="text-align:right"><button class="go ghost small" id="ccsv">${icon('download')}${T('c_csv')}</button></p>` +
    (r.rows.length ? `<div class="msgs">${r.rows.map(card).join('')}</div>` : `<p class="none2"><span>${T('c_none')}</span></p>`) + compose + hist
  // the LINE link follows the words and the chosen link
  const text = tb.querySelector('#ntext'), sel = tb.querySelector('#nlink'), ln = tb.querySelector('#nline'), msg = tb.querySelector('#nmsg')
  const urlOf = () => { const x = n.links.find((y) => y.k === sel.value) || n.links[0]; return x ? x.url : `${location.origin}/${S.name}` }
  const share = () => { ln.href = lineShare(`${text.value.trim()}\n${urlOf()}`) }
  text.oninput = share; sel.onchange = share; share()
  tb.querySelector('#ccsv').onclick = async () => {
    const res = await fetch('/api/customers.csv', { headers: { 'x-edit': S.token } })
    if (!res.ok) return toast(ui(S.lang, 'e_net'))
    const a = document.createElement('a'); a.href = URL.createObjectURL(await res.blob()); a.download = S.name + '-customers.csv'; a.click()
  }
  const send = tb.querySelector('#nsend')
  send.onclick = async () => {
    if (text.value.trim().length < 4) { msg.textContent = ui(S.lang, 'n_empty'); return }
    if (!confirm(ui(S.lang, 'n_ask').replace('{n}', nf.format(n.mail)))) return
    send.disabled = true; msg.textContent = '…'
    try {
      const j = await call('POST', 'news', { text: text.value, link: sel.value })
      toast(ui(S.lang, 'n_sent').replace('{n}', nf.format(j.sent)))
      return drawCustomers(tb, h)
    } catch (e) {
      const k = { empty: 'n_empty', links: 'n_links', held: 'n_held', busy: 'n_busy', nobody: 'n_nobody', mail: 'n_mailFail', quota: 'n_quota', month: 'n_month' }[e.message] || 'e_net'
      msg.textContent = ui(S.lang, k).replace('{n}', '')
      send.disabled = e.message === 'month'
    }
  }
}
