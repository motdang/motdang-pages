// online-page.js — the online business page's own script (Nan 2026-10-26): an Ask button carries its
// package's name to the message form, and the news sign-up box posts to /api/join.
(function () {
  var pdEl = document.getElementById('pd')
  if (!pdEl) return
  var pd = {}
  try { pd = JSON.parse(pdEl.textContent) } catch (e) { return }
  var w = pd.w || {}

  var asks = document.querySelectorAll('[data-ask]')
  for (var i = 0; i < asks.length; i++) {
    asks[i].addEventListener('click', function (ev) {
      var ta = document.querySelector('#msgf textarea[name=body]')
      if (ta && !ta.value) ta.value = (w.askPkg || '').replace('{n}', ev.currentTarget.getAttribute('data-ask')) + '\n'
    })
  }

  var jf = document.getElementById('joinf'), born = Date.now()
  if (jf && !pd.preview) jf.onsubmit = function (e) {
    e.preventDefault()
    var btn = jf.querySelector('button[type=submit]'), f = new FormData(jf), label = btn.lastChild
    btn.disabled = true
    fetch('/api/join', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ n: pd.name, name: f.get('name'), email: f.get('email'), website: f.get('website'), ms: Date.now() - born }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j }) })
      .then(function () {
        jf.innerHTML = '<p class="ok"><i data-dingbat="envelope" data-play="once" style="font-size:1.6em"></i>' + (w.joinSent || 'OK') + '</p>'
        if (window.Dingbats && window.Dingbats.burst) { var r = jf.getBoundingClientRect(); try { window.Dingbats.burst(r.left + 40, r.top + 20, { names: ['heart', 'sparkle', 'star'], n: 12 }) } catch (x) {} }
      })
      .catch(function (err) { btn.disabled = false; label.textContent = (err && err.error === 'email' ? w.joinBad : w.joinFail) || 'Try again' })
  }
})()
