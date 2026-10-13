// page.js — what a reader's taps do on a page: the drawing and its hours of
// light, the drawn map, the dingbats, sharing (QR, a picture for a story),
// messages to the maker, the photo viewer, the video, how far, ordering on
// LINE, and Report. Each button a reader presses is counted for the maker.
(function () {
  var $ = function (s, el) { return (el || document).querySelector(s) }
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)) }
  var pd = {}
  try { pd = JSON.parse($('#pd').textContent) } catch (e) {}
  var lang = pd.lang || 'en', w = pd.w || {}, MAIN = pd.main || ''
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches

  function load(src) {
    return new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = no
      document.head.appendChild(s)
    })
  }

  // ---- counting taps for the maker ----
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-t]')
    if (!a || pd.preview) return
    var body = JSON.stringify({ n: pd.name, k: a.getAttribute('data-t') })
    try { if (!(navigator.sendBeacon && navigator.sendBeacon('/api/hit', new Blob([body], { type: 'application/json' })))) fetch('/api/hit', { method: 'POST', body: body, keepalive: true, headers: { 'content-type': 'application/json' } }) } catch (x) {}
  }, true)

  // a photo that does not load (still being checked) leaves no broken box
  $$('main img, .top img').forEach(function (i) {
    var gone = function () { var b = i.closest('.gallery figure'); if (b) b.remove(); else i.style.visibility = 'hidden' }
    if (i.complete && !i.naturalWidth) gone(); else i.addEventListener('error', gone)
  })

  $$('.art').forEach(function (a) {
    a.addEventListener('click', function () { a.classList.remove('go'); void a.getBoundingClientRect(); a.classList.add('go') })
  })

  // sections rise into place as they scroll in
  if ('IntersectionObserver' in window && !REDUCED) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }) }, { rootMargin: '0px 0px -8% 0px' })
    $$('.rise').forEach(function (el) { io.observe(el) })
  } else $$('.rise').forEach(function (el) { el.classList.add('in') })

  // ---- dingbats: the core, then only the families this page uses ----
  if (pd.fams && pd.fams.length && $('[data-dingbat]')) {
    load('/s/db/core.js').then(function () { return Promise.all(pd.fams.map(function (f) { return load('/s/db/' + f + '.js') })) }).catch(function () {})
  }

  // ---- the drawing: Mot Dang's auto-doodler draws the place, lit by the sun where it stands ----
  var drawn = $('#drawn')
  if (drawn) (function () {
    var cv = drawn.querySelector('canvas'), c = cv.getContext('2d'), set = cv.getAttribute('data-set'), place = {}
    try { place = JSON.parse(cv.getAttribute('data-p')) } catch (e) {}
    var W = 0, H = 0, on = false, last = 0, ridge = null, started = false
    var ALTS = [null, 38, 2, -6, -22], ai = 0
    function size() { var dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); c.setTransform(dpr, 0, 0, dpr, 0, 0) }
    function paint(t) {
      var D = window.MDDOODLER; if (!D || !W) return
      c.clearRect(0, 0, W, H)
      try { D.portrait(c, W, H, t, { set: set, place: place, ridge: ridge, alt: ALTS[ai] }) } catch (e) {}
    }
    function f(t) { if (!on) return; if (t - last > 32) { last = t; paint(t) } requestAnimationFrame(f) }
    function start() {
      if (started) return; started = true
      var ready = load(MAIN + '/front/skyline.js').then(function () { return load(MAIN + '/front/doodler.js') })
      if (pd.north) fetch(MAIN + '/front/ridge.json').then(function (r) { return r.json() }).then(function (j) { ridge = j; paint(4000) }, function () {})
      ready.then(function () {
        size(); paint(4000)
        addEventListener('resize', function () { size(); paint(4000) })
        addEventListener('mddoodler', function () { paint(REDUCED ? 4000 : performance.now()) })
        if (!REDUCED) new IntersectionObserver(function (es) { var was = on; on = es[0].isIntersecting; if (on && !was) requestAnimationFrame(f) }).observe(cv)
      }, function () { drawn.remove() })
    }
    drawn.addEventListener('click', function () {
      ai = (ai + 1) % ALTS.length; paint(REDUCED ? 4000 : performance.now())
      if (window.Dingbats && window.Dingbats.burst) { var r = drawn.getBoundingClientRect(); try { window.Dingbats.burst(r.left + r.width / 2, r.top + r.height / 2, { names: ['sparkle', 'star', 'lantern'], n: 9 }) } catch (e) {} }
    })
    if ('IntersectionObserver' in window) { var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); start() } }, { rootMargin: '400px' }); o.observe(drawn) } else start()
  })()

  // ---- the drawn map (motdang.net's doodle-map engine, any country) ----
  var dmap = $('#dmap')
  if (dmap) {
    var fr = dmap.querySelector('iframe'), marks = []
    try { marks = JSON.parse(dmap.getAttribute('data-marks') || '[]') } catch (e) {}
    var post = function (m) { try { fr.contentWindow.postMessage(m, location.origin) } catch (e) {} }
    fr.addEventListener('load', function () {
      if (marks.length) post({ type: 'md-doodle-near', marks: marks.map(function (x) { return { lat: x.lat, lng: x.lng, n: x.n, u: '' } }) })
    })
    addEventListener('message', function (e) {
      if (e.origin !== location.origin || e.source !== fr.contentWindow || !e.data) return
      if (e.data.type === 'md-map') { dmap.classList.toggle('full', !!e.data.tool); document.body.style.overflow = e.data.tool ? 'hidden' : '' }
    })
    $$('[data-spot]').forEach(function (b) {
      b.onclick = function () {
        dmap.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' })
        post({ type: 'md-fly', lat: +b.getAttribute('data-lat'), lng: +b.getAttribute('data-lng'), z: 'street', label: { th: b.closest('li').querySelector('b').textContent } })
      }
    })
  }

  // ---- sharing ----
  var share = $('#share')
  if (share) share.onclick = function () {
    if (navigator.share) navigator.share({ title: pd.title, text: pd.tagline || pd.title, url: pd.url }).catch(function () {})
    else copy()
  }
  var cp = $('#copy')
  function copy() {
    var done = function () { if (!cp) return; var sp = cp.querySelector('span'), t = sp.textContent; sp.textContent = w.copied; setTimeout(function () { sp.textContent = t }, 1800) }
    if (navigator.clipboard) navigator.clipboard.writeText(pd.url).then(done, function () { prompt('', pd.url) })
    else prompt('', pd.url)
  }
  if (cp) cp.onclick = copy

  function dialog(inner, cls) {
    var d = document.createElement('dialog')
    if (cls) d.className = cls
    d.innerHTML = inner + '<button class="x" aria-label="' + (w.close || 'Close') + '">×</button>'
    document.body.appendChild(d)
    d.querySelector('.x').onclick = function () { d.close() }
    d.addEventListener('close', function () { d.remove() })
    d.addEventListener('click', function (ev) { if (ev.target === d) d.close() })
    d.showModal()
    return d
  }

  function qrImage(px) {
    var svg = $('#qrsvg').innerHTML
    return new Promise(function (ok) {
      var im = new Image()
      im.onload = function () { ok(im) }; im.onerror = function () { ok(null) }
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" '))
    })
  }
  function saveBlob(blob, file) {
    var f = typeof File === 'function' ? new File([blob], file, { type: blob.type }) : null
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: pd.title, url: pd.url }).catch(function () {})
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove() }, 4000)
  }

  var qrb = $('#qrbtn')
  if (qrb) qrb.onclick = function () {
    var d = dialog($('#qrsvg').innerHTML + '<p>' + pd.url.replace(/^https:\/\//, '') + '</p><button class="btn" id="qrsave" style="width:100%">' + (w.saveQr || 'Save') + '</button>', 'qrd')
    d.querySelector('#qrsave').onclick = function () {
      qrImage(900).then(function (im) {
        if (!im) return
        var cv = document.createElement('canvas'); cv.width = 1000; cv.height = 1100
        var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1000, 1100); g.drawImage(im, 50, 30, 900, 900)
        g.fillStyle = '#000'; g.font = '700 44px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillText(pd.url.replace(/^https:\/\//, ''), 500, 1010, 940)
        cv.toBlob(function (b) { saveBlob(b, pd.name + '-qr.png') }, 'image/png')
      })
    }
  }

  // a 1080×1920 picture for a LINE, Facebook or Instagram story: the cover or the drawing, the name, the QR
  var sb = $('#storybtn')
  if (sb) sb.onclick = function () {
    var cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920
    var g = cv.getContext('2d'), bg = pd.bg || '#fff7ec', ink = pd.ink || '#1c1530'
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920)
    var top = new Promise(function (ok) {
      var src = $('#drawn canvas')
      if (pd.cover) {
        var im = new Image(); im.onload = function () { var r = Math.max(1080 / im.width, 1180 / im.height); g.drawImage(im, (1080 - im.width * r) / 2, (1180 - im.height * r) / 2, im.width * r, im.height * r); ok(true) }; im.onerror = function () { ok(false) }; im.src = pd.cover
      } else if (src && src.width) {
        try { var r = Math.max(1080 / src.width, 1180 / src.height); g.drawImage(src, (1080 - src.width * r) / 2, (1180 - src.height * r) / 2, src.width * r, src.height * r); ok(true) } catch (e) { ok(false) }
      } else ok(false)
    })
    top.then(function (pic) {
      if (pic) { var gr = g.createLinearGradient(0, 760, 0, 1180); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, bg); g.fillStyle = gr; g.fillRect(0, 760, 1080, 420) }
      if (pic && pd.cover && pd.coverCredit) { g.fillStyle = ink; g.globalAlpha = 0.75; g.font = '400 24px system-ui,sans-serif'; g.textAlign = 'right'; g.fillText(String(pd.coverCredit).slice(0, 90), 1050, 1160, 980); g.globalAlpha = 1; g.textAlign = 'left' }
      g.fillStyle = pd.accent || '#d7261e'; g.fillRect(80, 1200, 160, 16)
      g.fillStyle = ink; g.textAlign = 'left'
      g.font = '800 104px "Avenir Next Condensed","Arial Narrow",Impact,"Prompt","Noto Sans Thai",system-ui,sans-serif'
      var words = String(pd.title).split(' '), lines = [], cur = ''
      words.forEach(function (x) { var t = cur ? cur + ' ' + x : x; if (g.measureText(t).width > 920 && cur) { lines.push(cur); cur = x } else cur = t }); lines.push(cur)
      var y = 1330; lines.slice(0, 3).forEach(function (l) { g.fillText(l, 80, y, 920); y += 108 })
      if (pd.tagline) { g.font = '500 44px system-ui,"Prompt","Noto Sans Thai",sans-serif'; g.fillText(String(pd.tagline).slice(0, 60), 80, y + 4, 920) }
      return qrImage(300)
    }).then(function (im) {
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect ? g.roundRect(700, 1560, 300, 300, 24) : g.rect(700, 1560, 300, 300); g.fill()
      if (im) g.drawImage(im, 712, 1572, 276, 276)
      g.fillStyle = ink; g.font = '700 38px ui-monospace,Menlo,monospace'; g.fillText('sites.motdang.net/', 80, 1760, 600); g.fillText(pd.name, 80, 1812, 600)
      cv.toBlob(function (b) { saveBlob(b, pd.name + '-story.jpg') }, 'image/jpeg', 0.9)
    })
  }

  // ---- event countdown ----
  var cnt = $('#count')
  if (cnt) {
    var s = +cnt.dataset.s, e = +cnt.dataset.e
    var tick = function () {
      var n = Date.now(), t
      if (n < s) {
        var rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }), m = (s - n) / 60000
        t = m < 60 ? rtf.format(Math.max(1, Math.round(m)), 'minute') : m < 2880 ? rtf.format(Math.round(m / 60), 'hour') : rtf.format(Math.round(m / 1440), 'day')
      } else t = n < e ? w.happening : w.ended
      cnt.textContent = t
    }
    tick(); setInterval(tick, 30000)
  }

  // ---- how far ----
  var far = $('#far')
  if (far) far.onclick = function () {
    var out = $('#farout')
    if (!navigator.geolocation) return
    out.textContent = '…'
    navigator.geolocation.getCurrentPosition(function (p) {
      var R = 6371, toR = Math.PI / 180
      var a = +far.dataset.lat * toR, b = p.coords.latitude * toR
      var dl = (p.coords.longitude - +far.dataset.lng) * toR
      var km = R * Math.acos(Math.min(1, Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(dl)))
      var f = km < 1
        ? new Intl.NumberFormat(lang, { style: 'unit', unit: 'meter', maximumFractionDigits: 0 }).format(Math.round(km * 100) * 10)
        : new Intl.NumberFormat(lang, { style: 'unit', unit: 'kilometer', maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)
      out.textContent = (w.farFrom || '{d}').replace('{d}', f)
    }, function () { out.textContent = '' }, { enableHighAccuracy: true, timeout: 15000 })
  }

  // ---- photos, video ----
  $$('.gallery button').forEach(function (b) {
    b.onclick = function () { dialog('<img src="' + b.dataset.big + '" alt="">' + (b.dataset.cap ? '<div class="cap">' + b.dataset.cap + '</div>' : '')) }
  })
  $$('button.video').forEach(function (b) {
    b.onclick = function () {
      var id = b.getAttribute('data-id'), k = b.getAttribute('data-kind')
      var src = k === 'youtube' ? 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0' : 'https://player.vimeo.com/video/' + id + '?autoplay=1'
      b.innerHTML = '<iframe src="' + src + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="video"></iframe>'
      b.onclick = null
    }
  })

  // ---- ordering on LINE ----
  var order = $('#lineorder')
  if (order) {
    var counts = {}
    var paint = function () {
      var lines = [], n = 0
      $$('.qty').forEach(function (q) {
        var k = +(counts[q.dataset.i] || 0)
        q.querySelector('b').textContent = k
        q.classList.toggle('on', k > 0)
        if (k) { lines.push(q.dataset.n + ' × ' + k); n += k }
      })
      order.hidden = !n
      order.querySelector('span').textContent = n ? '(' + n + ')' : ''
      order.href = 'https://line.me/R/oaMessage/' + encodeURIComponent(order.dataset.oa) + '/?' + encodeURIComponent((w.orderHi || '') + '\n' + lines.join('\n'))
    }
    $$('.qty').forEach(function (q) {
      var b = q.querySelectorAll('button')
      b[0].onclick = function () { counts[q.dataset.i] = Math.max(0, (counts[q.dataset.i] || 0) - 1); paint() }
      b[1].onclick = function () { counts[q.dataset.i] = Math.min(99, (counts[q.dataset.i] || 0) + 1); paint() }
    })
  }

  // ---- a message to the maker ----
  var mf = $('#msgf'), born = Date.now()
  if (mf && !pd.preview) mf.onsubmit = function (e) {
    e.preventDefault()
    var btn = mf.querySelector('button'), f = new FormData(mf)
    btn.disabled = true
    fetch('/api/msg', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ n: pd.name, name: f.get('name'), reach: f.get('reach'), body: f.get('body'), website: f.get('website'), ms: Date.now() - born }) })
      .then(function (r) { if (!r.ok) throw r; return r.json() })
      .then(function () {
        mf.innerHTML = '<p class="ok"><i data-dingbat="envelope" data-play="once" style="font-size:1.6em"></i>' + (w.msgSent || 'Sent') + '</p>'
        if (window.Dingbats && window.Dingbats.burst) { var r = mf.getBoundingClientRect(); try { window.Dingbats.burst(r.left + 40, r.top + 20, { names: ['heart', 'sparkle', 'star'], n: 12 }) } catch (x) {} }
      })
      .catch(function () { btn.disabled = false; btn.lastChild.textContent = w.msgFail || 'Try again' })
  }

  // ---- report ----
  var rep = $('#report')
  if (rep) rep.onclick = function (ev) {
    ev.preventDefault()
    var d = dialog('<form method="dialog"><p><b>' + w.reportAsk + '</b></p><textarea maxlength="500" required></textarea><p><button class="btn" type="submit">' + w.send + '</button></p></form>', 'form')
    d.querySelector('form').onsubmit = function (e2) {
      e2.preventDefault()
      fetch('/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: pd.name, why: d.querySelector('textarea').value }) })
        .finally(function () { d.querySelector('form').innerHTML = '<p><b>' + w.thanks + '</b></p>'; setTimeout(function () { d.close() }, 1400) })
    }
  }
})()
