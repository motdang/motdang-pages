// market.mjs (browser) — ตลาดพระ, the night market at /amulets (src/market.mjs serves the data).
// The bell rings each auction that just closed; shelves of Mot Dang sellers' amulets with สาธุ;
// stalls open into trays of real sales and listings; a loupe on every photo; Guess the hammer.

const D = JSON.parse(document.getElementById('mkdata').textContent)
const T = D.T, lang = D.lang
const $ = (s, r = document) => r.querySelector(s)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const nf = (n) => new Intl.NumberFormat('en').format(Math.round(n))
const B = (n) => '฿' + nf(n)
const t = (k, v = {}) => Object.entries(v).reduce((s, [a, b]) => s.replace('{' + a + '}', b), T[k] || k)
const store = { get(k, d) { try { const v = localStorage.getItem('mk:' + k); return v === null ? d : JSON.parse(v) } catch { return d } }, set(k, v) { try { localStorage.setItem('mk:' + k, JSON.stringify(v)) } catch {} } }
const post = (p, o) => fetch('/api/' + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
const credit = (src) => (src === 'l' || /lazcdn/.test(src) ? 'Lazada' : 'G-Pra')
const still = matchMedia('(prefers-reduced-motion: reduce)').matches

// ---- the bell: a struck bowl, two partials, only when the visitor turns it on -----------------
let ac = null
const bellOn = () => store.get('bell', false)
function ring(strength = 1) {
  if (!bellOn()) return
  try {
    ac = ac || new AudioContext()
    const now = ac.currentTime
    for (const [f, g] of [[660, 0.18], [1663, 0.07], [2640, 0.03]]) {
      const o = ac.createOscillator(), v = ac.createGain()
      o.frequency.value = f; o.type = 'sine'
      v.gain.setValueAtTime(g * strength, now); v.gain.exponentialRampToValueAtTime(0.0001, now + 2.6)
      o.connect(v).connect(ac.destination); o.start(now); o.stop(now + 2.7)
    }
  } catch {}
}
const snd = $('#snd')
const drawSnd = () => { snd.setAttribute('aria-pressed', String(bellOn())); snd.classList.toggle('on', bellOn()) }
snd.onclick = () => { store.set('bell', !bellOn()); drawSnd(); ring(0.6) }
drawSnd()

// ---- who is here ---------------------------------------------------------------------------------
const me = store.get('id', '') || (() => { const v = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); store.set('id', v); return v })()
async function here() {
  const r = await post('market/here', { id: me })
  if (!r) return
  $('#here').textContent = '👥 ' + t('here', { n: nf(Math.max(1, r.here)) })
  $('#hourg').textContent = r.guesses ? '· 🔨 ' + t('guesses', { n: nf(r.guesses) }) : ''
}
here(); setInterval(here, 45000)

// ---- the bell ticker -----------------------------------------------------------------------------
const tick = $('#tick')
const bellItem = (b) => `<a href="${esc(b.url)}" target="_blank" rel="nofollow noopener">${b.pic ? `<img src="${esc(b.pic)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<b>${B(b.price)}</b><span>${esc(b.title)}</span><em>${t('bids', { n: b.bids })}</em></a>`
if (D.F.bell.length) {
  tick.innerHTML = `<div class="run">${D.F.bell.map(bellItem).join('')}${D.F.bell.map(bellItem).join('')}</div>`
  let i = 0
  const run = tick.firstChild
  setInterval(() => { const a = run.children[i % D.F.bell.length]; run.querySelectorAll('.lit').forEach((x) => x.classList.remove('lit')); a.classList.add('lit'); i++ }, 4000)
}

// ---- the loupe: a lens that follows a finger over the photo ---------------------------------------
const look = $('#look')
function loupe(src, href, who) {
  look.innerHTML = `<div class="lk"><div class="lkimg" style="background-image:url('${esc(src)}')"><img src="${esc(src)}" alt="" referrerpolicy="no-referrer"><i class="lens"></i></div>
    <p class="lkbar"><span>${esc(t('credit', { s: who }))}</span>${href ? `<a href="${esc(href)}" target="_blank" rel="nofollow noopener">${esc(T.open)} →</a>` : ''}<button class="x">${esc(T.close)}</button></p></div>`
  const box = $('.lkimg', look), lens = $('.lens', look), img = $('img', look)
  const move = (e) => {
    const r = img.getBoundingClientRect(), p = e.touches ? e.touches[0] : e
    const x = p.clientX - r.left, y = p.clientY - r.top
    if (x < 0 || y < 0 || x > r.width || y > r.height) { lens.style.opacity = 0; return }
    const z = 2.6, s = 150
    lens.style.opacity = 1
    lens.style.transform = `translate(${x - s / 2}px, ${y - s / 2}px)`
    lens.style.backgroundImage = `url('${src}')`
    lens.style.backgroundSize = `${r.width * z}px ${r.height * z}px`
    lens.style.backgroundPosition = `${-(x * z - s / 2)}px ${-(y * z - s / 2)}px`
    if (e.cancelable && e.touches) e.preventDefault()
  }
  box.addEventListener('pointermove', move); box.addEventListener('touchmove', move, { passive: false })
  box.addEventListener('pointerleave', () => { lens.style.opacity = 0 })
  $('.x', look).onclick = () => look.close()
  look.onclick = (e) => { if (e.target === look) look.close() }
  look.showModal()
}
document.addEventListener('click', (e) => {
  const p = e.target.closest('[data-loupe]')
  if (!p) return
  e.preventDefault()
  loupe(p.dataset.loupe, p.dataset.href, p.dataset.who)
})

// ---- the shelf: Mot Dang sellers' amulets, สาธุ ------------------------------------------------
const shelf = $('#shelfgrid')
if (!D.shelf.length) shelf.outerHTML = `<p class="empty">${esc(T.shelfNone)}</p>`
else shelf.innerHTML = D.shelf.map((x) => `<article class="am${x.sian ? ' sian' : ''}">
  <button class="ph" data-loupe="${esc(x.pic.replace('-s.webp', '.webp'))}" data-who="${esc(x.shop)}" data-href="${esc(x.url)}"><img src="${esc(x.pic)}" alt="${esc(x.t)}" loading="lazy"></button>
  <a class="nm" href="${esc(x.url)}">${esc(x.t)}</a><b class="pr">${x.p ? (/^\d[\d,.]*$/.test(x.p) ? '฿' + esc(x.p) : esc(x.p)) : esc(T.ask)}</b>
  ${x.band ? `<small class="band">${esc(t('band', { a: nf(x.band[0]), b: nf(x.band[1]) }))}</small>` : ''}
  <p class="shop">${x.sian ? '◆ ' : ''}${esc(x.shop)}</p><button class="sadhu" data-site="${esc(x.site)}" data-id="${esc(x.id)}">🙏 <span>${x.sadhu || ''}</span> ${esc(T.sadhu)}</button></article>`).join('')
shelf?.addEventListener?.('click', async (e) => {
  const b = e.target.closest('.sadhu')
  if (!b) return
  const fly = document.createElement('i'); fly.className = 'fly'; fly.textContent = '🙏'; b.append(fly); setTimeout(() => fly.remove(), 1200)
  const r = await post('market/sadhu', { site: b.dataset.site, id: b.dataset.id })
  if (r) $('span', b).textContent = r.n
})

// ---- stalls and their trays ----------------------------------------------------------------------
const name = (s) => (lang === 'th' ? s.th : s.en)
$('#lane').innerHTML = D.F.stalls.map((s) => `<button class="stall" data-k="${esc(s.key)}">
  <span class="awning" aria-hidden="true"></span><span class="sp">${s.pic ? `<img src="${esc(s.pic)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</span>
  <b>${esc(name(s))}</b>${lang === 'th' ? '' : `<small>${esc(s.th)}</small>`}
  <span class="mids">${s.nA ? `<em class="g">🔨 ${B(s.midA)}</em>` : ''}${s.nL ? `<em class="l">🛒 ${B(s.midL)}</em>` : ''}</span>
  <small class="n">${s.nA ? nf(s.nA) + ' ' + esc(T.auction) : ''}${s.nA && s.nL ? ' · ' : ''}${s.nL ? nf(s.nL) + ' ' + esc(T.online) : ''}</small></button>`).join('')

const tray = $('#tray')
function strip(st) {
  const all = [...st.g, ...st.l]
  if (!all.length) return ''
  const lo = Math.log(Math.max(10, Math.min(...all))), hi = Math.log(Math.max(...all) * 1.05)
  const X = (v) => 8 + ((Math.log(v) - lo) / (hi - lo || 1)) * 584
  const dots = (xs, cls, y) => xs.map((v, i) => `<circle class="${cls}" cx="${X(v).toFixed(1)}" cy="${(y + ((i * 37) % 22) - 11).toFixed(1)}" r="3.2"><title>${B(v)}</title></circle>`).join('')
  const ticks = [10, 100, 1000, 10000, 100000, 1000000].filter((v) => Math.log(v) >= lo && Math.log(v) <= hi)
  return `<svg class="strip" viewBox="0 0 600 96" role="img" aria-label="prices">${ticks.map((v) => `<line x1="${X(v)}" x2="${X(v)}" y1="4" y2="80"/><text x="${X(v)}" y="94">${B(v)}</text>`).join('')}
    ${dots(st.l, 'l', 56)}${dots(st.g, 'g', 26)}</svg>`
}
let cur = null, filt = 'all'
function drawTray() {
  const s = cur
  const items = s.items.filter((x) => filt === 'all' || (filt === 'g' && x.src === 'g') || (filt === 'l' && x.src === 'l') || (filt === 'card' && x.card))
  const chip = (k, label) => `<button data-f="${k}" class="${filt === k ? 'on' : ''}">${esc(label)}</button>`
  tray.innerHTML = `<div class="tr"><header><h3>${esc(name(s))}</h3><button class="x">${esc(T.close)}</button></header>
    <p class="trmids">${s.nA ? `<span class="g">🔨 ${esc(T.auction)} ${esc(T.mid)} <b>${B(s.midA)}</b> · ${nf(s.nA)}</span>` : ''}${s.nL ? `<span class="l">🛒 ${esc(T.online)} ${esc(T.mid)} <b>${B(s.midL)}</b> · ${nf(s.nL)}</span>` : ''}</p>
    ${strip(s.strip)}<div class="chips">${chip('all', T.all)}${s.nA ? chip('g', '🔨 ' + T.auction) : ''}${s.nL ? chip('l', '🛒 ' + T.online) : ''}${s.items.some((x) => x.card) ? chip('card', '◆ ' + T.card) : ''}</div>
    <p class="hint">${esc(T.loupe)}</p><div class="tgrid">${items.map((x) => `<article class="it ${x.src}">
      ${x.pic ? `<button class="ph" data-loupe="${esc(x.pic)}" data-href="${esc(x.url)}" data-who="${credit(x.src)}"><img src="${esc(x.pic)}" alt="" loading="lazy" referrerpolicy="no-referrer"><i class="cr">${credit(x.src)}</i></button>` : ''}
      <a href="${esc(x.url)}" target="_blank" rel="nofollow noopener"><b>${B(x.price)}</b><em>${x.src === 'g' ? `${esc(t('bids', { n: x.bids }))} · ${esc(x.date)}${x.card ? ' · ◆' : ''}` : x.sold ? esc(t('sold', { n: nf(x.sold) })) : ''}</em><span>${esc(x.title)}</span></a></article>`).join('')}</div></div>`
  $('.x', tray).onclick = () => tray.close()
  tray.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { filt = b.dataset.f; drawTray() }))
}
$('#lane').addEventListener('click', async (e) => {
  const b = e.target.closest('.stall')
  if (!b) return
  b.classList.add('open'); setTimeout(() => b.classList.remove('open'), 600)
  const r = await fetch('/api/market/stall?k=' + encodeURIComponent(b.dataset.k)).then((x) => (x.ok ? x.json() : null)).catch(() => null)
  if (!r) return
  cur = { ...r, th: r.th, en: r.en }; filt = 'all'
  drawTray(); tray.showModal(); tray.scrollTop = 0
})
tray.addEventListener('click', (e) => { if (e.target === tray) tray.close() })

// ---- Guess the hammer ----------------------------------------------------------------------------
const H = D.handles
let handle = store.get('handle', '')
if (!/^\d+\.\d+\.\d+$/.test(handle)) { handle = `${Math.floor(Math.random() * H.a.length)}.${Math.floor(Math.random() * H.b.length)}.${10 + Math.floor(Math.random() * 90)}`; store.set('handle', handle) }
const handleName = (h) => { const [a, b, n] = h.split('.').map(Number); return lang === 'th' ? `${H.a[a][0]}${H.b[b][0]} ${n}` : `${H.b[b][1]} ${H.a[a][1]} ${n}` }
const LO = Math.log(50), HI = Math.log(300000)
const fromSlider = (v) => { const x = Math.exp(LO + (v / 1000) * (HI - LO)); const r = x < 1000 ? 10 : x < 10000 ? 50 : x < 100000 ? 500 : 5000; return Math.max(r, Math.round(x / r) * r) }
let R = null
const game = $('#gamecard')
async function newRound() {
  game.innerHTML = '<p class="wait">…</p>'
  R = await fetch('/api/market/round').then((x) => (x.ok ? x.json() : null)).catch(() => null)
  if (!R) { game.innerHTML = ''; return }
  const v0 = 450
  game.innerHTML = `<button class="gph ph" data-loupe="${esc(R.pic)}" data-who="G-Pra"><img src="${esc(R.pic)}" alt="" referrerpolicy="no-referrer"><i class="cr">G-Pra</i></button>
    <div class="gbody"><p class="hint">${esc(T.gameHint)}</p><h3>${esc(R.title)}</h3>
    <p class="meta">${R.closed ? esc(R.closed) + ' · ' : ''}${esc(t('bidders', { n: R.bidders }))}${R.card ? ' · ◆ ' + esc(T.card) : ''}</p>
    <output class="gv" id="gv">${B(fromSlider(v0))}</output><input type="range" id="gs" min="0" max="1000" value="${v0}" aria-label="${esc(T.game)}">
    <p class="who">${esc(T.you_are)} <b>${esc(handleName(handle))}</b> <button class="reroll" aria-label="🎲">🎲</button></p>
    <button class="btn go" id="gg">🔨 ${esc(T.go)}</button></div>`
  const s = $('#gs'), out = $('#gv')
  s.oninput = () => { out.textContent = B(fromSlider(+s.value)) }
  $('.reroll', game).onclick = () => { handle = `${Math.floor(Math.random() * H.a.length)}.${Math.floor(Math.random() * H.b.length)}.${10 + Math.floor(Math.random() * 90)}`; store.set('handle', handle); $('.who b', game).textContent = handleName(handle) }
  $('#gg').onclick = () => guess(fromSlider(+s.value))
}
function petals() {
  if (still) return
  const box = document.createElement('div'); box.className = 'petals'
  box.innerHTML = Array.from({ length: 18 }, (_, i) => `<i style="left:${(i * 53) % 100}%;animation-delay:${(i % 6) * 0.12}s;--r:${(i * 47) % 360}deg"></i>`).join('')
  game.append(box); setTimeout(() => box.remove(), 2600)
}
async function guess(g) {
  $('#gg').disabled = true
  const r = await post('market/guess', { aid: R.aid, guess: g, handle })
  if (!r) { $('#gg').disabled = false; return }
  const streak = r.score >= 70 ? store.get('streak', 0) + 1 : 0
  store.set('streak', streak)
  const body = $('.gbody', game)
  body.innerHTML = `<h3>${esc(R.title)}</h3><p class="real">${esc(T.real)} <b id="hammer">฿0</b></p>
    <p class="you">${esc(T.you)} ${B(g)} · <b class="sc">${esc(t('score', { s: r.score }))}</b>${streak > 1 ? ` · 🔥 ${esc(t('streak', { n: streak }))}` : ''}</p>
    <p class="crowd">${r.crowd.n ? `${esc(t('crowd', { n: nf(r.crowd.n) }))}: <b>${B(r.crowd.median)}</b>` : esc(T.first)}</p>
    <p class="meta">${esc(t('bids', { n: r.bids }))} · ${esc(t('bidders', { n: r.bidders }))} · ${esc(r.closed)} · <a href="${esc(r.url)}" target="_blank" rel="nofollow noopener">${esc(T.open)} →</a></p>
    <button class="btn go" id="gn">${esc(T.next)} →</button>`
  const el = $('#hammer'), t0 = performance.now(), dur = still ? 0 : 1100
  const step = (now) => { const k = dur ? Math.min(1, (now - t0) / dur) : 1; el.textContent = B(r.price * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); else { game.classList.add('rung'); ring(r.score >= 70 ? 1 : 0.5); if (r.score >= 70) petals(); setTimeout(() => game.classList.remove('rung'), 900) } }
  requestAnimationFrame(step)
  $('#gn').onclick = newRound
  board()
}
async function board() {
  const r = await fetch('/api/market/board?hl=' + lang).then((x) => (x.ok ? x.json() : null)).catch(() => null)
  if (!r) return
  $('#board').innerHTML = `<h3>🏆 ${esc(T.board)}</h3>${r.board.length ? `<ol>${r.board.map((x) => `<li class="${x.handle === handle ? 'me' : ''}"><span>${esc(x.name)}</span><b>${x.score}%</b><small>×${x.n}</small></li>`).join('')}</ol>` : `<p class="hint">${esc(T.boardNone)}</p>`}`
}
newRound(); board(); setInterval(board, 60000)
