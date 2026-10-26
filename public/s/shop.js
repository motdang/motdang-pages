// shop.js — what a buyer's taps do on a page with a shop: Buy opens the check-out sheet for that one product or download;
// on a Gold page Add to cart keeps lines in this phone (localStorage) and a bar at the foot of the shop opens the sheet with
// all of them. The sheet asks for the buyer's name, a way to reach them, an email for downloads and an address for parcels,
// shows the total the server works out (POST /api/order with quote: true) and sends the order to /api/order. The server
// prices everything again from the page's saved data; the prices here are for showing.
(function () {
  const $ = (s, el) => (el || document).querySelector(s)
  const $$ = (s, el) => Array.prototype.slice.call((el || document).querySelectorAll(s))
  let data = {}, pd = {}
  try { data = JSON.parse($('#shopd').textContent) } catch (e) { return }
  try { pd = JSON.parse($('#pd').textContent) } catch (e) {}
  if (pd.preview) return // the builder's preview shows the shop; it does not sell
  const w = data.w || {}, items = data.items || {}, KEY = 'mdcart:' + data.name
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const nf = (() => { try { return new Intl.NumberFormat(data.lang || 'en', { maximumFractionDigits: 2 }) } catch (e) { return new Intl.NumberFormat('en', { maximumFractionDigits: 2 }) } })()
  const money = (n) => (data.sym || '฿') + nf.format(n)
  const key = (l) => l.k + ':' + l.id
  const maxQ = (l) => { const it = items[key(l)]; return (it && it.max) || (data.gold ? 99 : 9) }

  // ---- the cart (Gold) -------------------------------------------------------------------------
  let cart = []
  try { cart = JSON.parse(localStorage.getItem(KEY) || '[]').filter((l) => items[key(l)] && !items[key(l)].sold) } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)) } catch (e) {} }
  const same = (a, b) => key(a) === key(b) && (a.opt || []).join('\u0001') === (b.opt || []).join('\u0001')
  function put(list, l) {
    const at = list.find((x) => same(x, l))
    if (at) at.q = Math.min(maxQ(l), at.q + l.q)
    else list.push(l)
  }
  const total = (list) => list.reduce((a, l) => a + (items[key(l)] ? items[key(l)].u * l.q : 0), 0)

  function bar() {
    const el = $('#cartbar')
    if (!el) return
    const n = cart.reduce((a, l) => a + l.q, 0)
    el.hidden = !n
    var sum = total(cart), need = data.free > 0 && cart.some(function (l) { return l.k === 'p' }) ? data.free - sum : 0
    if (n) el.innerHTML = '<b>' + esc(w.cartN.replace('{n}', n)) + ' · ' + esc(money(sum)) + (need > 0 ? '<small>' + esc(w.toFree.replace('{p}', money(need))) + '</small>' : '') + '</b><button class="btn" data-checkout>' + esc(w.checkout) + '</button>'
  }

  // what a Buy or Add to cart button means: the product or download it names, with the options and amount beside it
  function lineOf(btn) {
    const ref = btn.getAttribute('data-cart') || btn.getAttribute('data-buy'), at = ref.indexOf(':')
    const l = { k: ref.slice(0, at), id: ref.slice(at + 1), opt: [], q: 1 }
    const box = btn.closest('#pbuy')
    if (box) {
      l.opt = $$('select[data-opt]', box).map((s) => s.value)
      const q = $('[data-qty]', box)
      if (q) l.q = Math.max(1, Math.min(maxQ(l), Math.floor(Number(q.value)) || 1))
    }
    return items[key(l)] && !items[key(l)].sold ? l : null
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-cart],[data-buy],[data-checkout]')
    if (!b) return
    e.preventDefault()
    if (b.hasAttribute('data-checkout')) return sheet(cart.map((l) => Object.assign({}, l)), true)
    const l = lineOf(b)
    if (!l) return
    if (b.hasAttribute('data-cart')) { put(cart, l); keep(); bar(); toast(w.added); return }
    sheet([l], false)
  })

  function toast(t) {
    const el = document.createElement('div')
    el.textContent = t
    el.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:80;padding:10px 18px;border-radius:99px;background:#111;color:#fff;font:700 16px system-ui'
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1800)
  }

  // ---- the check-out sheet ----------------------------------------------------------------------
  const CC = 'TH MM LA KH VN MY SG ID PH CN JP KR TW HK IN BD NP LK US CA MX GB IE FR DE ES PT IT NL BE CH AT SE NO DK FI PL CZ GR TR IL AE SA EG ZA NG KE AU NZ BR AR CL CO PE'.split(' ')
  function countries() {
    let dn = null
    try { dn = new Intl.DisplayNames([data.lang || 'en'], { type: 'region' }) } catch (e) {}
    const list = CC.slice(1).map((c) => [c, dn ? dn.of(c) : c]).sort((a, b) => a[1].localeCompare(b[1], data.lang || 'en'))
    return [[CC[0], dn ? dn.of('TH') : 'Thailand']].concat(list).map((r) => '<option value="' + r[0] + '">' + esc(r[1]) + '</option>').join('')
  }
  const errText = (code) => w['e' + code.charAt(0).toUpperCase() + code.slice(1)] || w.eNet

  function sheet(lines, fromCart) {
    if (!lines.length) return
    let quoteT = 0, seq = 0, busy = false
    const wrap = document.createElement('div')
    wrap.className = 'shopsheet'
    wrap.setAttribute('role', 'dialog')
    wrap.setAttribute('aria-modal', 'true')
    document.body.appendChild(wrap)
    const goods = () => lines.some((l) => l.k === 'p'), dl = () => lines.some((l) => l.k === 'd')

    function draw() {
      const prev = {}
      $$('input,textarea,select', wrap).forEach((f) => { if (f.name) prev[f.name] = f.value })
      wrap.innerHTML = '<div class="in"><button class="x" type="button" data-x aria-label="' + esc(w.close) + '">×</button><h3>' + esc(w.checkout) + '</h3>' +
        lines.map((l, i) => { const it = items[key(l)] || {}; return '<div class="ln">' + (it.img ? '<img src="' + esc(it.img) + '" alt="">' : '') +
          '<div class="t">' + esc(it.t) + ((l.opt || []).length ? '<small>' + esc(l.opt.join(' · ')) + '</small>' : '') + '<small>' + esc(money(it.u || 0)) + '</small></div>' +
          (l.k === 'p' ? '<span class="q"><button type="button" data-q="' + i + '" data-d="-1" aria-label="−">−</button><b>' + l.q + '</b><button type="button" data-q="' + i + '" data-d="1" aria-label="+">+</button></span>' : '') +
          (fromCart ? '<button type="button" class="x" style="width:36px;height:36px;font-size:18px" data-rm="' + i + '" aria-label="' + esc(w.rm) + '">×</button>' : '') + '</div>' }).join('') +
        '<form novalidate>' +
        '<label><span>' + esc(w.fName) + '</span><input name="name" maxlength="80" autocomplete="name" required></label>' +
        '<label><span>' + esc(w.fReach) + '</span><input name="reach" maxlength="120" autocomplete="tel"></label>' +
        '<label><span>' + esc(dl() ? w.fEmailDl : w.fEmail) + '</span><input name="email" type="email" maxlength="254" autocomplete="email"></label>' +
        (goods() ? '<label><span>' + esc(w.fAddr) + '</span><textarea name="addr" maxlength="400" rows="3" autocomplete="street-address"></textarea></label>' +
          '<label><span>' + esc(w.fCc) + '</span><select name="cc">' + countries() + '</select></label>' : '') +
        '<label><span>' + esc(w.fNote) + '</span><input name="note" maxlength="400"></label>' +
        (data.code ? '<div class="row"><label><span>' + esc(w.fCode) + '</span><input name="code" maxlength="24" autocapitalize="characters" autocomplete="off"></label><button class="btn ghost" type="button" data-apply style="width:auto;margin:0">' + esc(w.fApply) + '</button></div>' : '') +
        '<div class="sum" aria-live="polite"></div><p class="err" role="alert"></p><p class="hint">' + esc(w.payNext) + '</p>' +
        '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
        '<button class="btn" type="submit">' + esc(w.go) + '</button></form></div>'
      $$('input,textarea,select', wrap).forEach((f) => { if (f.name && prev[f.name] != null) f.value = prev[f.name] })
      sum()
      ask()
    }

    function sum(q) {
      const el = $('.sum', wrap)
      if (!el) return
      const sub = q ? q.sub : total(lines)
      let h = '<div><span>' + esc(w.tSub) + '</span><span>' + esc(money(sub)) + '</span></div>'
      if (q && q.disc) h += '<div><span>' + esc(w.tDisc) + '</span><span>−' + esc(money(q.disc)) + '</span></div>'
      if (q && q.goods) h += '<div><span>' + esc(w.tShip) + '</span><span>' + (q.delivery ? esc(money(q.delivery)) : esc(w.shThFree)) + '</span></div>'
      h += '<div class="tot"><span>' + esc(w.tTotal) + '</span><span>' + esc(money(q ? q.total : sub)) + '</span></div>'
      el.innerHTML = h
    }

    function body() {
      const f = $('form', wrap), v = (n) => (f && f.elements[n] ? f.elements[n].value : '')
      return { n: data.name, lines: lines.map((l) => ({ k: l.k, id: l.id, opt: l.opt || [], q: l.q })), cc: v('cc'), code: v('code'), name: v('name'), reach: v('reach'), email: v('email'), addr: v('addr'), note: v('note'), website: v('website'), lang: data.lang }
    }

    function ask() {
      clearTimeout(quoteT)
      quoteT = setTimeout(() => {
        const n = ++seq, b = body()
        b.quote = true
        fetch('/api/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json()).then((j) => {
          if (n !== seq || !wrap.isConnected) return
          const err = $('.err', wrap)
          if (j.ok) { sum(j.quote); if (err && !busy) err.textContent = '' } else if (err) err.textContent = errText(j.error || 'net')
        }).catch(() => {})
      }, 250)
    }

    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('button')
      if (e.target === wrap || (b && b.hasAttribute('data-x'))) { wrap.remove(); return }
      if (!b) return
      if (b.hasAttribute('data-q')) {
        const l = lines[+b.getAttribute('data-q')]
        l.q = Math.max(1, Math.min(maxQ(l), l.q + Number(b.getAttribute('data-d'))))
        if (fromCart) { cart = lines.map((x) => Object.assign({}, x)); keep(); bar() }
        draw()
      }
      if (b.hasAttribute('data-rm')) {
        lines.splice(+b.getAttribute('data-rm'), 1)
        cart = lines.map((x) => Object.assign({}, x)); keep(); bar()
        if (!lines.length) { wrap.remove(); return }
        draw()
      }
      if (b.hasAttribute('data-apply')) ask()
    })
    wrap.addEventListener('change', (e) => { if (e.target.name === 'cc' || e.target.name === 'code') ask() })
    wrap.addEventListener('submit', (e) => {
      e.preventDefault()
      if (busy) return
      const f = $('form', wrap), btn = $('button[type=submit]', wrap), err = $('.err', wrap)
      busy = true; btn.disabled = true; btn.textContent = w.goWait; err.textContent = ''
      const b = body()
      b.ms = Math.round(performance.now())
      fetch('/api/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json().then((j) => [r.ok, j])).then(([ok, j]) => {
        if (ok && j.page) {
          if (fromCart) { cart = []; keep() }
          location.href = j.page
          return
        }
        busy = false; btn.disabled = false; btn.textContent = w.go
        err.textContent = errText(j.error || 'net')
        const bad = { name: 'name', reach: 'reach', email: 'email', addr: 'addr', cc: 'cc', code: 'code' }[j.error]
        if (bad && f.elements[bad]) f.elements[bad].focus()
      }).catch(() => { busy = false; btn.disabled = false; btn.textContent = w.go; err.textContent = w.eNet })
    })
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') wrap.remove() })
    draw()
    const first = $('input[name=name]', wrap)
    if (first) first.focus()
  }

  bar()
})()
