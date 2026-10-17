// support.js — /support: the drawing that stays behind the page (motdang.net's auto-doodler,
// the shop at 48–49 Thai Wiwat Alley, Chiang Rai, lit by the sun there), the language
// switch, Send, and the dingbats. Taps on the drawing step through the day.
(function () {
  var $ = function (s) { return document.querySelector(s) }
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches
  var root = document.documentElement
  function load(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = no; document.head.appendChild(s) }) }

  // ---- language: the reader's choice, remembered ----
  var L = root.getAttribute('data-l')
  try { var saved = localStorage.getItem('lang'); if (!/[?&]l=/.test(location.search) && (saved === 'th' || saved === 'en') && saved !== L) set(saved) } catch (e) {}
  function set(l) {
    L = l; root.setAttribute('data-l', l); root.lang = l
    var a = $('#lang'); if (a) { a.textContent = l === 'th' ? 'EN' : 'ไทย'; a.href = '?l=' + (l === 'th' ? 'en' : 'th') }
    document.querySelectorAll('input[name=lang]').forEach(function (i) { i.value = l })
    try { localStorage.setItem('lang', l) } catch (e) {}
  }
  var la = $('#lang')
  if (la) la.addEventListener('click', function (e) { e.preventDefault(); set(L === 'th' ? 'en' : 'th') })

  // ---- Send: the phone's share sheet, else LINE ----
  var send = $('#send')
  if (send) send.addEventListener('click', function () {
    var u = 'https://motdang.net/', text = L === 'th' ? 'มดแดง: ค้นหาเชียงใหม่ เชียงราย' : 'motdang: search Chiang Mai and Chiang Rai'
    if (navigator.share) navigator.share({ title: 'motdang', text: text, url: u }).catch(function () {})
    else location.href = 'https://line.me/R/share?text=' + encodeURIComponent(text + ' ' + u)
  })

  // ---- dingbats on the four buttons and the headings ----
  load('/s/db/core.js').then(function () { return Promise.all(['curious', 'faces', 'classic'].map(function (f) { return load('/s/db/' + f + '.js') })) }).catch(function () {})

  // ---- the drawing ----
  var cv = $('#sky'); if (!cv) return
  var c = cv.getContext('2d'), W = 0, H = 0, dpr = 1, last = 0, live = true
  var ALTS = [null, 38, 2, -6, -22], ai = 0
  if (location.hash === '#card') { root.classList.add('cardmode'); ai = 1 } // the share card, in daylight
  var place = { id: 'motdang-48-49', name: 'มดแดง · motdang', nameTh: 'มดแดง', nameEn: 'motdang', cat: 'shop', sub: ['market'], hours: 'Mo-Su 09:00-18:00', lat: 19.9093, lng: 99.8308 }
  function size() { dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); c.setTransform(dpr, 0, 0, dpr, 0, 0) }
  function paint(t) {
    var D = window.MDDOODLER; if (!D || !W) return
    c.clearRect(0, 0, W, H)
    try { D.portrait(c, W, H, t, { set: 'market', place: place, alt: ALTS[ai] }) } catch (e) {}
  }
  function loop(t) { if (live && t - last > 40) { last = t; paint(t) } requestAnimationFrame(loop) }
  load('/front/skyline.js').then(function () { return load('/front/doodler.js') }).then(function () {
    size(); paint(4000)
    addEventListener('resize', function () { size(); paint(4000) })
    addEventListener('mddoodler', function () { paint(REDUCED ? 4000 : performance.now()) })
    // it moves while the top of the page or a window onto it is in view
    if ('IntersectionObserver' in window) {
      var seen = new Set()
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target) }); live = seen.size > 0 })
      document.querySelectorAll('.hero, .window').forEach(function (el) { io.observe(el) })
    }
    if (!REDUCED) requestAnimationFrame(loop)
  }, function () {})
  document.querySelectorAll('.hero, .window').forEach(function (el) { el.addEventListener('click', function (e) {
    if (e.target.closest('.plate, .lang')) return
    e.preventDefault()
    ai = (ai + 1) % ALTS.length; paint(REDUCED ? 4000 : performance.now())
    if (window.Dingbats && window.Dingbats.burst) try { window.Dingbats.burst(e.clientX, e.clientY, { names: ['sparkle', 'star', 'heart'], n: 10 }) } catch (x) {}
  }) })
})()
