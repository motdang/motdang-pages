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
  // The first time it comes into view a pen scribbles it in (2026-10-14, "the page draws itself").
  var PEN = '<svg class="pen" viewBox="0 0 36 36" aria-hidden="true"><path d="M6 30l3-9L26 4l6 6-17 17z" fill="#ffd400" stroke="#1c1530" stroke-width="2" stroke-linejoin="round"/><path d="M6 30l3-9 6 6z" fill="#f6d3a8" stroke="#1c1530" stroke-width="2" stroke-linejoin="round"/><path d="M6 30l1.6-4.6 3 3z" fill="#1c1530"/><path d="M23 7l6 6" stroke="#ff5a7a" stroke-width="4"/></svg>'
  var drawn = $('#drawn')
  if (drawn) (function () {
    var cv = drawn.querySelector('canvas'), c = cv.getContext('2d'), set = cv.getAttribute('data-set'), place = {}
    try { place = JSON.parse(cv.getAttribute('data-p')) } catch (e) {}
    var W = 0, H = 0, dpr = 1, on = false, last = 0, ridge = null, started = false
    var ALTS = [null, 38, 2, -6, -22], ai = 0
    var off = document.createElement('canvas'), oc = off.getContext('2d'), mask = document.createElement('canvas'), mc = mask.getContext('2d')
    var revealAt = null, revealed = REDUCED, pen = null, ROWS = 6, DUR = 1900
    function size() { dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = off.width = mask.width = Math.round(W * dpr); cv.height = off.height = mask.height = Math.round(H * dpr); c.setTransform(dpr, 0, 0, dpr, 0, 0) }
    // the scribble: rows back and forth with a wobble, as a hand fills a shape in
    function scribble(p) {
      var pts = [], n = ROWS * 14
      for (var i = 0; i <= n; i++) {
        var r = Math.floor(i / 14), k = (i % 14) / 13, x = r % 2 ? 1 - k : k
        pts.push([(-0.06 + x * 1.12) * W, ((r + 0.5) / ROWS + Math.sin(i * 1.7) * 0.035) * H])
      }
      var upto = Math.max(1, Math.floor(p * n))
      mc.setTransform(dpr, 0, 0, dpr, 0, 0); mc.clearRect(0, 0, W, H)
      mc.lineCap = mc.lineJoin = 'round'; mc.lineWidth = H / ROWS * 1.55; mc.strokeStyle = '#000'
      mc.beginPath(); mc.moveTo(pts[0][0], pts[0][1]); for (var j = 1; j <= upto; j++) mc.lineTo(pts[j][0], pts[j][1]); mc.stroke()
      return pts[upto]
    }
    function paint(t) {
      var D = window.MDDOODLER; if (!D || !W) return
      if (revealed) {
        c.clearRect(0, 0, W, H)
        try { D.portrait(c, W, H, t, { set: set, place: place, ridge: ridge, alt: ALTS[ai] }) } catch (e) {}
        return
      }
      c.clearRect(0, 0, W, H)
      if (revealAt === null) return
      var p = Math.min(1, (performance.now() - revealAt) / DUR)
      oc.setTransform(dpr, 0, 0, dpr, 0, 0); oc.clearRect(0, 0, W, H)
      try { D.portrait(oc, W, H, t, { set: set, place: place, ridge: ridge, alt: ALTS[ai] }) } catch (e) {}
      var at = scribble(1 - Math.pow(1 - p, 1.6))
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(off, 0, 0); c.globalCompositeOperation = 'destination-in'; c.drawImage(mask, 0, 0); c.restore()
      if (pen) pen.style.transform = 'translate(' + (Math.max(0, Math.min(W - 10, at[0])) - 4) + 'px,' + (at[1] - 32) + 'px)'
      if (p >= 1) {
        revealed = true
        if (pen) { pen.style.opacity = '0'; setTimeout(function () { pen && pen.remove(); pen = null }, 600) }
        if (window.Dingbats && window.Dingbats.burst) { var r = drawn.getBoundingClientRect(); try { window.Dingbats.burst(r.left + r.width / 2, r.top + r.height / 2, { names: pd.gold ? ['sparkle', 'star', 'crown'] : ['sparkle', 'star', 'heart'], n: pd.gold ? 14 : 8 }) } catch (e) {} }
      }
    }
    function f(t) { if (!on && revealed) return; if (t - last > 32) { last = t; paint(t) } requestAnimationFrame(f) }
    function begin() {
      if (revealed || revealAt !== null) return
      revealAt = performance.now()
      drawn.insertAdjacentHTML('beforeend', PEN); pen = drawn.querySelector('.pen')
      requestAnimationFrame(f)
    }
    function start() {
      if (started) return; started = true
      var ready = load(MAIN + '/front/skyline.js').then(function () { return load(MAIN + '/front/doodler.js') })
      if (pd.north) fetch(MAIN + '/front/ridge.json').then(function (r) { return r.json() }).then(function (j) { ridge = j; paint(4000) }, function () {})
      ready.then(function () {
        size(); paint(4000)
        addEventListener('resize', function () { size(); paint(4000) })
        addEventListener('mddoodler', function () { paint(REDUCED ? 4000 : performance.now()) })
        if (REDUCED) return
        new IntersectionObserver(function (es) {
          var was = on; on = es[0].isIntersecting && es[0].intersectionRatio > 0.35
          if (on && !revealed) begin()
          if (on && !was) requestAnimationFrame(f)
        }, { threshold: [0, 0.35, 0.6] }).observe(cv)
      }, function () { drawn.remove() })
    }
    drawn.addEventListener('click', function () {
      if (!revealed) return
      ai = (ai + 1) % ALTS.length; paint(REDUCED ? 4000 : performance.now())
      if (window.Dingbats && window.Dingbats.burst) { var r = drawn.getBoundingClientRect(); try { window.Dingbats.burst(r.left + r.width / 2, r.top + r.height / 2, { names: ['sparkle', 'star', 'lantern'], n: 9 }) } catch (e) {} }
    })
    if ('IntersectionObserver' in window) { var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); start() } }, { rootMargin: '400px' }); o.observe(drawn) } else { revealed = true; start() }
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
  $$('button[data-big]').forEach(function (b) {
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

  // ---- timed campaigns: the time left, ticking; the code copies on a tap ----
  var lefts = $$('[data-left]')
  if (lefts.length) {
    var unit = function (n, u) { try { return new Intl.NumberFormat(lang, { style: 'unit', unit: u, unitDisplay: 'narrow' }).format(n) } catch (e) { return n + u[0] } }
    var two = function (n) { return (n < 10 ? '0' : '') + n }
    var tickC = function () {
      lefts.forEach(function (el) {
        var ms = +el.getAttribute('data-left') - Date.now(), box = el.closest('.camp')
        if (ms <= 0) { if (box) box.remove(); return }
        var s = Math.floor(ms / 1000), dd = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60
        el.textContent = (dd ? unit(dd, 'day') + ' ' : '') + two(hh) + ':' + two(mm) + ':' + two(ss)
      })
    }
    tickC(); setInterval(tickC, 1000)
  }
  $$('.code').forEach(function (b) {
    b.onclick = function () {
      var code = b.getAttribute('data-code'), done = function () { var sm = b.querySelector('small'), t = sm.textContent; sm.textContent = w.copied || '✓'; setTimeout(function () { sm.textContent = t }, 1600) }
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, function () { prompt('', code) }); else prompt('', code)
      if (window.Dingbats && window.Dingbats.burst) { var r = b.getBoundingClientRect(); try { window.Dingbats.burst(r.left + r.width / 2, r.top, { names: ['gift', 'sparkle', 'star'], n: 10 }) } catch (e) {} }
    }
  })

  // ---- bookings: a service, a day, a free time, a name ----
  var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] }) }
  var todayIn = function () { try { return new Intl.DateTimeFormat('en-CA', { timeZone: pd.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) } catch (e) { return new Date().toISOString().slice(0, 10) } }
  var addD = function (day, n) { var t = new Date(day + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10) }
  var fmtDay = function (day, o) { try { return new Intl.DateTimeFormat(lang, Object.assign({ timeZone: 'UTC' }, o)).format(new Date(day + 'T00:00:00Z')) } catch (e) { return day } }
  var moneyOf = function (n) { return (pd.sym || '') + new Intl.NumberFormat(lang).format(n) }
  function askForm(extra, people, label) {
    return '<form class="msgf bookf" data-born="' + Date.now() + '">' + extra +
      '<input name="name" maxlength="80" autocomplete="name" required placeholder="' + esc(w.bookName) + '" aria-label="' + esc(w.bookName) + '">' +
      '<input name="reach" maxlength="120" autocomplete="tel" required placeholder="' + esc(w.bookReach) + '" aria-label="' + esc(w.bookReach) + '">' +
      '<input name="email" type="email" maxlength="254" autocomplete="email" placeholder="' + esc(w.bookEmail) + '" aria-label="' + esc(w.bookEmail) + '">' +
      (people > 1 ? '<label style="display:flex;gap:10px;align-items:center;font-weight:700">' + esc(w.bookPeople) + '<input name="people" type="number" min="1" max="' + people + '" value="1" style="width:90px"></label>' : '') +
      '<textarea name="note" maxlength="600" placeholder="' + esc(w.bookNote) + '" aria-label="' + esc(w.bookNote) + '" style="min-height:70px"></textarea>' +
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn" type="submit">' + esc(label || w.bookSend) + '</button></form>'
  }
  function sendAsk(form, body, box) {
    var f = new FormData(form), btn = form.querySelector('button[type=submit]')
    btn.disabled = true
    ;['name', 'reach', 'email', 'people', 'note', 'website'].forEach(function (k) { if (f.get(k) != null) body[k] = f.get(k) })
    body.n = pd.name; body.ms = Date.now() - (+form.getAttribute('data-born') || 0)
    fetch('/api/book', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j }) })
      .then(function (j) {
        box.innerHTML = '<p class="ok" style="display:flex;gap:10px;align-items:center;font-weight:800;font-size:20px;color:var(--acc-ink)"><i data-dingbat="calendar" data-play="once" style="font-size:1.6em"></i>' + esc(j.status === 'ok' ? w.bookDone : w.bookAsked) + '</p>' +
          (j.ref ? '<p style="font:800 18px ui-monospace,Menlo,monospace;letter-spacing:.06em">' + esc(w.bookRef) + ' ' + esc(j.ref) + (j.total ? ' · ' + moneyOf(j.total) : '') + '</p>' : '') +
          (j.deposit ? '<div class="pp"><b>' + esc(((body.kind === 'room' ? w.payNow : w.bookDeposit) || '').replace('{p}', moneyOf(j.deposit.amount))) + '</b>' + j.deposit.qr + '<p>' + esc(w.bookScan) + '</p></div>' : '') +
          (j.link ? '<a class="btn" href="' + esc(j.link) + '" rel="nofollow noopener">' + esc(w.payLink) + (j.due ? ' ' + moneyOf(j.due) : '') + '</a>' : '') +
          (body.kind === 'room' && !j.deposit && !j.link ? '<p>' + esc(w.payHotel) + '</p>' : '') +
          (j.page ? '<a class="btn ghost" style="margin-top:10px" href="' + esc(j.page) + '">' + esc(w.yourBooking) + '</a>' : '')
        if (window.Dingbats && window.Dingbats.burst) { var r = box.getBoundingClientRect(); try { window.Dingbats.burst(r.left + 40, r.top + 20, { names: ['calendar', 'sparkle', 'heart'], n: 12 }) } catch (e) {} }
      })
      .catch(function (e) { btn.disabled = false; if (e && e.error === 'taken') { btn.textContent = w.bookFail } else btn.textContent = w.msgFail || 'Try again' })
  }
  var bookui = $('#bookui')
  $$('.svcb').forEach(function (b) {
    b.onclick = function () {
      if (!pd.book || !bookui) return
      $$('.svcb').forEach(function (x) { x.classList.toggle('on', x === b) })
      var id = b.getAttribute('data-svc'), sv = pd.book.svc[id] || { cap: 1 }, t0 = todayIn(), n = Math.min(pd.book.ahead || 30, 60), days = ''
      for (var i = 0; i < n; i++) { var dd = addD(t0, i); days += '<button data-day="' + dd + '"' + (i ? '' : ' class="on"') + '>' + esc(fmtDay(dd, { weekday: 'short' })) + '<b>' + esc(fmtDay(dd, { day: 'numeric' })) + '</b>' + esc(fmtDay(dd, { month: 'short' })) + '</button>' }
      bookui.hidden = false
      bookui.innerHTML = '<p style="font-weight:800;margin:0 0 6px">' + esc(w.bookPick) + '</p><div class="days">' + days + '</div><div class="times" aria-live="polite"></div><div class="ask"></div>'
      var times = bookui.querySelector('.times'), ask = bookui.querySelector('.ask')
      function load(day) {
        times.innerHTML = '<p>…</p>'; ask.innerHTML = ''
        fetch('/api/slots?n=' + encodeURIComponent(pd.name) + '&svc=' + encodeURIComponent(id) + '&day=' + day).then(function (r) { return r.json() }).then(function (j) {
          if (!j.times || !j.times.length) { times.innerHTML = '<p>' + esc(w.bookNone) + '</p>'; return }
          times.innerHTML = j.times.map(function (x) { return '<button data-t="' + x.t + '">' + x.t + (sv.cap > 1 ? '<small>' + esc((w.bookLeft || '').replace('{n}', x.left)) + '</small>' : '') + '</button>' }).join('')
          $$('button', times).forEach(function (tb) {
            tb.onclick = function () {
              $$('button', times).forEach(function (x) { x.classList.toggle('on', x === tb) })
              ask.innerHTML = askForm('', sv.cap)
              var form = ask.querySelector('form')
              form.onsubmit = function (e) { e.preventDefault(); sendAsk(form, { kind: 'svc', item: id, day: day, t: tb.getAttribute('data-t') }, ask) }
              form.querySelector('input[name=name]').focus({ preventScroll: true })
              ask.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest' })
            }
          })
        }, function () { times.innerHTML = '<p>' + esc(w.msgFail) + '</p>' })
      }
      $$('.days button', bookui).forEach(function (db) { db.onclick = function () { $$('.days button', bookui).forEach(function (x) { x.classList.toggle('on', x === db) }); load(db.getAttribute('data-day')) } })
      load(t0)
      bookui.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest' })
    }
  })

  // ---- rooms: a month of nights, taken ones struck through; first night, then the morning out ----
  $$('[data-pick]').forEach(function (b) {
    b.onclick = function () {
      if (!pd.book) return
      var room = b.getAttribute('data-pick'), info = pd.book.rooms[room] || { g: 2, p: '' }, ui = b.parentNode.querySelector('.roomui')
      var num = function (p) { var n = Number(String(p || '').replace(/[,\s]/g, '')); return n > 0 ? n : 0 }
      var priceOf = function (day) {
        var r = (info.rates || []).filter(function (x) { return x.from <= day && day <= x.to })[0]
        if (r) return num(r.p)
        var wd = new Date(day + 'T00:00:00Z').getUTCDay()
        return (wd === 5 || wd === 6) && num(info.p2) ? num(info.p2) : num(info.p)
      }
      var short = function (n) { return n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (Math.round(n / 100) / 10) + 'k' : String(n) }
      var left = {}
      b.hidden = true; ui.hidden = false; ui.innerHTML = '<p>…</p>'
      fetch('/api/nights?n=' + encodeURIComponent(pd.name) + '&room=' + encodeURIComponent(room)).then(function (r) { return r.json() }).then(function (j) {
        var taken = {}; (j.taken || []).forEach(function (d) { taken[d] = 1 }); left = j.left || {}
        var t0 = todayIn(), m = t0.slice(0, 7), sIn = '', sOut = ''
        var heads = []; for (var i = 0; i < 7; i++) heads.push('<span>' + esc(fmtDay(addD('2024-01-01', i), { weekday: 'narrow' })) + '</span>')
        function freeRun(a, b) { for (var d = a; d < b; d = addD(d, 1)) if (taken[d]) return false; return true }
        function draw() {
          var first = m + '-01', wd = (new Date(first + 'T00:00:00Z').getUTCDay() + 6) % 7, g = heads.join('')
          for (var i = 0; i < wd; i++) g += '<span></span>'
          for (var d = first; d.slice(0, 7) === m; d = addD(d, 1)) {
            var past = d < t0, dis = past || (!sIn || sOut ? taken[d] : (d <= sIn || !freeRun(sIn, d)))
            var cls = (d === sIn || d === sOut ? 'end' : sIn && sOut && d > sIn && d < sOut ? 'in' : '') + (taken[d] && !past ? ' tk' : '')
            var few = !past && !taken[d] && (info.units || 1) > 1 && left[d] && left[d] <= 2
            if (few) cls += ' few'
            var pr = !past && !taken[d] && priceOf(d)
            g += '<button data-d="' + d + '"' + (dis ? ' disabled' : '') + (cls ? ' class="' + cls + '"' : '') + ' title="' + esc(taken[d] ? w.roomTaken : few ? (w.roomLeft || '').replace('{n}', left[d]) : '') + '">' + Number(d.slice(8)) + (pr ? '<small>' + (few ? esc((w.roomLeft || '').replace('{n}', left[d])) : short(pr)) + '</small>' : '') + '</button>'
          }
          var nights = sIn && sOut ? Math.round((Date.parse(sOut) - Date.parse(sIn)) / 864e5) : 0, total = 0
          for (var q = sIn; nights && q < sOut; q = addD(q, 1)) total += priceOf(q)
          var short2 = nights && nights < (info.min || 1)
          var sum = !sIn ? w.roomPickIn : !sOut ? w.roomPickOut : (nights === 1 ? w.roomNight1 : (w.roomNights || '').replace('{n}', nights)) + (total ? ' · ' + (w.roomTotal || '').replace('{p}', moneyOf(total)) : '') + (short2 ? ' · ' + (w.roomMin || '').replace('{n}', info.min) : '')
          if (short2) nights = 0
          ui.innerHTML = '<div class="mcal"><div class="mh"><button data-m="-1" aria-label="‹">‹</button><span>' + esc(fmtDay(first, { month: 'long', year: 'numeric' })) + '</span><button data-m="1" aria-label="›">›</button></div><div class="g">' + g + '</div></div><p class="rsum">' + esc(sum) + '</p>' + (nights ? askForm('', info.g, w.roomSend) : '')
          $$('.mh button', ui).forEach(function (mb) { mb.onclick = function () { var t = new Date(m + '-01T00:00:00Z'); t.setUTCMonth(t.getUTCMonth() + +mb.getAttribute('data-m')); var nm = t.toISOString().slice(0, 7); if (nm >= t0.slice(0, 7)) { m = nm; draw() } } })
          $$('.g button', ui).forEach(function (db) {
            db.onclick = function () {
              var d = db.getAttribute('data-d')
              if (!sIn || sOut || d <= sIn) { sIn = d; sOut = '' } else sOut = d
              draw()
            }
          })
          var form = ui.querySelector('form')
          if (form) form.onsubmit = function (e) { e.preventDefault(); sendAsk(form, { kind: 'room', item: room, day: sIn, out: sOut }, ui) }
        }
        draw()
      }, function () { ui.innerHTML = '<p>' + esc(w.msgFail) + '</p>' })
    }
  })

  // ---- listings: sale, rent, all ----
  $$('.lfilter button').forEach(function (b) {
    b.onclick = function () {
      var k = b.getAttribute('data-deal')
      $$('.lfilter button').forEach(function (x) { x.classList.toggle('on', x === b) })
      $$('.lgrid .lcard').forEach(function (c) { c.hidden = !!k && c.getAttribute('data-deal') !== k })
    }
  })

  // ---- read in your own language, when the page has it ----
  if (pd.langs && pd.langs.length > 1 && !pd.hl && !pd.preview) {
    var want = (navigator.languages || [navigator.language || '']).map(function (x) { return String(x).slice(0, 2).toLowerCase() }).filter(function (x) { return pd.langs.indexOf(x) >= 0 })[0]
    var shut = false; try { shut = sessionStorage.getItem('mdp-readin') === '1' } catch (e) {}
    if (want && want !== pd.home && !shut) {
      var a = document.createElement('a'); a.className = 'readin'; a.href = '?hl=' + want
      a.innerHTML = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="/s/icons.svg#i-globe"/></svg>' + esc(pd.lnames[want] || want) + '<button aria-label="' + esc(w.close || 'Close') + '">×</button>'
      a.querySelector('button').onclick = function (e) { e.preventDefault(); a.remove(); try { sessionStorage.setItem('mdp-readin', '1') } catch (x) {} }
      setTimeout(function () { document.body.appendChild(a) }, 1800)
    }
  }
})()
