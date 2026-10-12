// page.js — what a reader's taps do on a page: share, copy, how far, the
// photo viewer, the map, the drawing's little dance, and Report.
(function () {
  var $ = function (s) { return document.querySelector(s) }
  var pd = {}
  try { pd = JSON.parse($('#pd').textContent) } catch (e) {}
  var lang = pd.lang || 'en', w = pd.w || {}

  // a photo that does not load (still being checked) leaves no broken box
  document.querySelectorAll('main img, .top img').forEach(function (i) {
    var gone = function () { var b = i.closest('.gallery button'); if (b) b.remove(); else i.style.visibility = 'hidden' }
    if (i.complete && !i.naturalWidth) gone(); else i.addEventListener('error', gone)
  })

  document.querySelectorAll('.art').forEach(function (a) {
    a.addEventListener('click', function () {
      a.classList.remove('go'); void a.getBoundingClientRect(); a.classList.add('go')
    })
  })

  var share = $('#share')
  if (share) share.onclick = function () {
    if (navigator.share) navigator.share({ title: document.title, url: pd.url }).catch(function () {})
    else copy()
  }
  var cp = $('#copy')
  function copy() {
    var done = function () { if (!cp) return; var t = cp.lastChild.textContent; cp.lastChild.textContent = w.copied; setTimeout(function () { cp.lastChild.textContent = t }, 1800) }
    if (navigator.clipboard) navigator.clipboard.writeText(pd.url).then(done, function () { prompt('', pd.url) })
    else prompt('', pd.url)
  }
  if (cp) cp.onclick = copy

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

  var mb = $('#openmap')
  if (mb) mb.onclick = function () {
    var lat = +mb.dataset.lat, lng = +mb.dataset.lng
    import('/~/s/map.mjs').then(function (m) { return m.view(lat, lng, +mb.dataset.z, pd.accent) }).then(function (ok) {
      if (!ok) location.href = 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng
    }).catch(function () { location.href = 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng })
  }

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

  document.querySelectorAll('.gallery button').forEach(function (b) {
    b.onclick = function () { dialog('<img src="' + b.dataset.big + '" alt="">') }
  })

  var order = $('#lineorder')
  if (order) {
    var counts = {}
    var paint = function () {
      var lines = [], n = 0
      document.querySelectorAll('.qty').forEach(function (q) {
        var k = +(counts[q.dataset.i] || 0)
        q.querySelector('b').textContent = k
        q.classList.toggle('on', k > 0)
        if (k) { lines.push(q.dataset.n + ' × ' + k); n += k }
      })
      order.hidden = !n
      order.querySelector('span').textContent = n ? '(' + n + ')' : ''
      order.href = 'https://line.me/R/oaMessage/' + encodeURIComponent(order.dataset.oa) + '/?' + encodeURIComponent((w.orderHi || '') + '\n' + lines.join('\n'))
    }
    document.querySelectorAll('.qty').forEach(function (q) {
      var b = q.querySelectorAll('button')
      b[0].onclick = function () { counts[q.dataset.i] = Math.max(0, (counts[q.dataset.i] || 0) - 1); paint() }
      b[1].onclick = function () { counts[q.dataset.i] = Math.min(99, (counts[q.dataset.i] || 0) + 1); paint() }
    })
  }

  var rep = $('#report')
  if (rep) rep.onclick = function (ev) {
    ev.preventDefault()
    var d = dialog('<form method="dialog"><p><b>' + w.reportAsk + '</b></p><textarea maxlength="500" required></textarea><p><button class="btn" type="submit">' + w.send + '</button></p></form>', 'form')
    d.querySelector('form').onsubmit = function (e2) {
      e2.preventDefault()
      fetch('/~/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: pd.name, why: d.querySelector('textarea').value }) })
        .finally(function () { d.querySelector('form').innerHTML = '<p><b>' + w.thanks + '</b></p>'; setTimeout(function () { d.close() }, 1400) })
    }
  }
})()
