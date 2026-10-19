// tap.mjs — /tap, touch phones and your card lands on theirs (NaN 2026-10-19: "an app that
// automagically shares my contact info or a motdang link with anyone who performs a gesture
// or bump with their phone. I want something 100x more mindblowing than qr code.")
//
//   /tap              what it is, and a form that makes one
//   /tap/<id>         what a touch opens: the card drops in, Save contact, LINE, the link; bump back
//   /tap/<id>.vcf     the card as a contact
//   /tap/me           the owner's page (#<id>.<key>): bump mode, what a touch gives, the card, write a sticker
//   /tap/api/…        time · new · own (x-tap: <id>.<key>) · bump · bump/<id>
//
// Two ways phones meet. An NFC sticker on the owner's phone carries /tap/<id>; an iPhone XS or
// newer, or an Android phone with NFC on, opens it by touch with no app. Or both phones hold a
// /tap page open, knock together, and each posts its knock (server clock, place if allowed);
// two knocks inside 0.9 s pair, and each phone gets the other's card.

const MAIN = 'https://motdang.net'
const HOME = 'https://sites.motdang.net'
const WINDOW = 900 // ms between two knocks that pair
const FAR = 400 // m; two located knocks further apart than this do not pair
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|bluesky|mastodon|curl|wget|python|headless|lighthouse/i

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const t = (th, en) => `<span class="th">${th}</span><span class="en">${en}</span>`
const cut = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export function langOf(request, url) {
  const q = url.searchParams.get('l')
  if (q === 'th' || q === 'en') return q
  return /^th\b/i.test(request.headers.get('accept-language') || '') ? 'th' : 'en'
}

// ---- the card ----------------------------------------------------------------------

/** A link a tap may give: motdang's own hosts and LINE. Returns the URL, or null. */
export function cleanLink(u) {
  let x
  try { x = new URL(String(u || '').trim()) } catch { return null }
  if (x.protocol !== 'https:') return null
  const h = x.hostname.toLowerCase()
  const ok = /(^|\.)(motdang\.net|hongdam\.net|wichaa\.net)$/.test(h) || /^(motdang|nanobotco)\.github\.io$/.test(h) || h === 'line.me' || h === 'lin.ee'
  return ok ? x.href.slice(0, 300) : null
}

/** The card's fields, trimmed; a field that does not fit its shape is dropped. */
export function cleanCard(o = {}) {
  const phone = cut(o.phone, 24).replace(/[^\d+ -]/g, '')
  const email = cut(o.email, 120)
  const line = cut(o.line, 40).replace(/[^\w.@-]/g, '')
  const site = cut(o.site, 30).toLowerCase()
  return {
    name: cut(o.name, 60),
    role: cut(o.role, 80),
    phone: /\d{6,}/.test(phone.replace(/\D/g, '')) ? phone : '',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '',
    line,
    site: /^[a-z0-9-]{3,30}$/.test(site) ? site : '',
  }
}

/** A tap row as the card a phone shows. */
export function cardOf(row) {
  const c = { id: row.id, name: row.name, role: row.role || '', phone: row.phone || '', email: row.email || '', line: row.line || '', site: row.site || '' }
  if (row.give === 'link' && row.link) { c.link = row.link; c.label = row.link_label || '' }
  return c
}

export function vcard(c, url) {
  const e = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  const l = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${e(c.name)}`, `N:;${e(c.name)};;;`]
  if (c.role) l.push(`TITLE:${e(c.role)}`)
  if (c.phone) l.push(`TEL;TYPE=CELL:${c.phone.replace(/[^\d+]/g, '')}`)
  if (c.email) l.push(`EMAIL:${e(c.email)}`)
  if (c.site) l.push(`URL:${HOME}/${c.site}`)
  else if (c.link) l.push(`URL:${e(c.link)}`)
  else if (url) l.push(`URL:${url}`)
  if (c.line) l.push(`X-SOCIALPROFILE;TYPE=line:https://line.me/ti/p/~${encodeURIComponent(c.line)}`, `NOTE:LINE ${e(c.line)}`)
  l.push('END:VCARD')
  return l.join('\r\n') + '\r\n'
}

// ---- bumps -------------------------------------------------------------------------

/** Metres between two points. */
export function near(a, b) {
  const R = 6371e3, r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * The knock this one hit, from the waiting knocks inside the window: the same connection first,
 * then the nearest in time among located pairs within FAR, else the only one there is.
 */
export function pick(me, rows) {
  const has = (k) => k.lat != null && k.lng != null
  const ok = rows.filter((r) => r.id !== me.id && Math.abs(r.t - me.t) <= WINDOW && !(has(me) && has(r) && near(me, r) > FAR))
  if (!ok.length) return null
  ok.sort((a, b) => Math.abs(a.t - me.t) - Math.abs(b.t - me.t))
  const same = ok.filter((r) => r.net && r.net === me.net)
  if (same.length) return same[0]
  const placed = ok.filter((r) => has(me) && has(r))
  if (placed.length) return placed[0]
  return ok.length === 1 ? ok[0] : null
}

/** The connection's network (/24 or /48) as a short hash, so two phones on one Wi-Fi match. */
async function netOf(request, sha, secret) {
  const ip = request.headers.get('cf-connecting-ip') || 'local'
  const n = ip.includes(':') ? ip.split(':').slice(0, 3).join(':') : ip.split('.').slice(0, 3).join('.')
  return (await sha((secret || 'dev') + '|net|' + n)).slice(0, 16)
}

async function giveCard(env, give) {
  if (give?.tap) {
    const row = await env.DB.prepare('SELECT * FROM tap WHERE id = ?').bind(String(give.tap)).first()
    return row ? cardOf(row) : null
  }
  if (give?.card) return give.card
  return null
}

async function countBump(env, give) {
  if (!give?.tap) return
  const day = new Date().toISOString().slice(0, 10)
  await env.DB.batch([
    env.DB.prepare('UPDATE tap SET bumps = bumps + 1 WHERE id = ?').bind(give.tap),
    env.DB.prepare('INSERT INTO tap_day (id, day, bumps) VALUES (?,?,1) ON CONFLICT(id, day) DO UPDATE SET bumps = bumps + 1').bind(give.tap, day),
  ])
}

// ---- routes ------------------------------------------------------------------------

export async function route(request, env, path, url, d) {
  const m = request.method
  if (path.startsWith('/tap/api/')) return api(request, env, path.slice(9), url, d)
  const lang = langOf(request, url)
  if ((path === '/tap' || path === '/tap/') && m === 'GET') {
    const nonce = d.rand(16)
    return d.html(front(lang, nonce), 200, { nonce, cache: 'public, max-age=300' })
  }
  if ((path === '/tap/me' || path === '/tap/me/') && m === 'GET') {
    const nonce = d.rand(16)
    return d.html(ownerPage(lang, nonce), 200, { nonce })
  }
  const vm = /^\/tap\/([a-z0-9]{8})\.vcf$/.exec(path)
  if (vm && m === 'GET') {
    const row = await env.DB.prepare('SELECT * FROM tap WHERE id = ?').bind(vm[1]).first()
    if (!row) return new Response('', { status: 404 })
    const file = (row.name.replace(/[^\w฀-๿ -]/g, '').trim() || 'contact').slice(0, 40)
    return new Response(vcard(cardOf(row), `${HOME}/tap/${row.id}`), { headers: { 'content-type': 'text/vcard; charset=utf-8', 'content-disposition': `inline; filename="contact.vcf"; filename*=UTF-8''${encodeURIComponent(file)}.vcf`, 'cache-control': 'no-cache' } })
  }
  const pm = /^\/tap\/([a-z0-9]{8})\/?$/.exec(path)
  if (pm && m === 'GET') {
    const row = await env.DB.prepare('SELECT * FROM tap WHERE id = ?').bind(pm[1]).first()
    if (!row) return null
    const ua = request.headers.get('user-agent') || ''
    if (!BOT.test(ua) && request.headers.get('sec-fetch-mode') !== 'no-cors') {
      const day = new Date().toISOString().slice(0, 10)
      await env.DB.batch([
        env.DB.prepare('UPDATE tap SET taps = taps + 1 WHERE id = ?').bind(row.id),
        env.DB.prepare('INSERT INTO tap_day (id, day, taps) VALUES (?,?,1) ON CONFLICT(id, day) DO UPDATE SET taps = taps + 1').bind(row.id, day),
      ]).catch(() => {})
    }
    const nonce = d.rand(16)
    return d.html(arrival(cardOf(row), lang, nonce), 200, { nonce })
  }
  return null
}

async function owner(request, env, d) {
  const [id, key] = String(request.headers.get('x-tap') || '').split('.')
  if (!/^[a-z0-9]{8}$/.test(id || '') || !key) return null
  const row = await env.DB.prepare('SELECT * FROM tap WHERE id = ?').bind(id).first()
  return row && row.key_sha === await d.sha(key) ? row : null
}

function ownView(row, days) {
  const c = cardOf(row)
  return { ...c, give: row.give, link: row.link || '', label: row.link_label || '', taps: row.taps, bumps: row.bumps, days, url: `${HOME}/tap/${row.id}` }
}

async function api(request, env, p, url, d) {
  const m = request.method
  if (p === 'time') return J({ now: Date.now() })

  if (p === 'new' && m === 'POST') {
    if (!d.sameOrigin(request, url)) return J({ error: 'origin' }, 403)
    if (!await d.take(env, await d.sender(request, env), 'tap')) return J({ error: 'quota' }, 429)
    const b = await request.json().catch(() => ({}))
    const c = cleanCard(b)
    if (!c.name) return J({ error: 'name' }, 400)
    const link = cleanLink(b.link)
    const id = d.rand(8), key = d.rand(24)
    await env.DB.prepare('INSERT INTO tap (id, key_sha, name, role, phone, email, line, site, give, link, link_label, lang, made) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, await d.sha(key), c.name, c.role || null, c.phone || null, c.email || null, c.line || null, c.site || null,
        b.give === 'link' && link ? 'link' : 'card', link, cut(b.label, 60) || null, b.lang === 'th' ? 'th' : 'en', new Date().toISOString()).run()
    return J({ id, key })
  }

  if (p === 'own' && (m === 'GET' || m === 'PUT')) {
    const row = await owner(request, env, d)
    if (!row) return J({ error: 'key' }, 403)
    if (m === 'PUT') {
      if (!d.sameOrigin(request, url)) return J({ error: 'origin' }, 403)
      if (!await d.take(env, await d.sender(request, env), 'tapsave')) return J({ error: 'quota' }, 429)
      const b = await request.json().catch(() => ({}))
      const c = cleanCard(b)
      if (!c.name) return J({ error: 'name' }, 400)
      const link = b.link ? cleanLink(b.link) : null
      if (b.link && !link) return J({ error: 'link' }, 400)
      await env.DB.prepare('UPDATE tap SET name=?, role=?, phone=?, email=?, line=?, site=?, give=?, link=?, link_label=?, changed=? WHERE id=?')
        .bind(c.name, c.role || null, c.phone || null, c.email || null, c.line || null, c.site || null,
          b.give === 'link' && link ? 'link' : 'card', link, cut(b.label, 60) || null, new Date().toISOString(), row.id).run()
      Object.assign(row, { ...c, give: b.give === 'link' && link ? 'link' : 'card', link, link_label: cut(b.label, 60) || null })
    }
    const since = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)
    const days = (await env.DB.prepare('SELECT day, taps, bumps FROM tap_day WHERE id = ? AND day >= ? ORDER BY day').bind(row.id, since).all()).results || []
    return J(ownView(row, days))
  }

  if (p === 'bump' && m === 'POST') {
    if (!d.sameOrigin(request, url)) return J({ error: 'origin' }, 403)
    if (!await d.take(env, await d.sender(request, env), 'bump')) return J({ error: 'quota' }, 429)
    const b = await request.json().catch(() => ({}))
    const now = Date.now()
    let tt = Number(b.t)
    if (!Number.isFinite(tt) || Math.abs(tt - now) > 5000) tt = now - 150 // a phone that could not read the clock: its arrival
    let give = null
    if (b.give?.tap && /^[a-z0-9]{8}$/.test(String(b.give.tap))) give = { tap: String(b.give.tap) }
    else if (b.give?.card) {
      const c = cleanCard(b.give.card)
      if (c.name && (c.phone || c.email || c.line)) give = { card: c }
    }
    if (!give) give = { none: 1 }
    const lat = Number(b.lat), lng = Number(b.lng)
    const me = { id: d.rand(12), t: tt, lat: Number.isFinite(lat) && Math.abs(lat) <= 90 ? lat : null, lng: Number.isFinite(lng) && Math.abs(lng) <= 180 ? lng : null, net: await netOf(request, d.sha, env.SESSION_SECRET) }
    await env.DB.prepare('DELETE FROM bump WHERE made < ?').bind(now - 60000).run()
    await env.DB.prepare('INSERT INTO bump (id, t, lat, lng, net, give, made) VALUES (?,?,?,?,?,?,?)').bind(me.id, me.t, me.lat, me.lng, me.net, JSON.stringify(give), now).run()
    const rows = (await env.DB.prepare('SELECT id, t, lat, lng, net, give FROM bump WHERE t BETWEEN ? AND ? AND id != ? AND peer IS NULL AND made > ?')
      .bind(me.t - WINDOW, me.t + WINDOW, me.id, now - 20000).all()).results || []
    const hit = pick(me, rows)
    if (!hit) return J({ id: me.id })
    const r = await env.DB.prepare('UPDATE bump SET peer = ? WHERE id = ? AND peer IS NULL').bind(me.id, hit.id).run()
    if (!r.meta?.changes) return J({ id: me.id })
    await env.DB.prepare('UPDATE bump SET peer = ? WHERE id = ?').bind(hit.id, me.id).run()
    const theirs = JSON.parse(hit.give)
    await Promise.all([countBump(env, give), countBump(env, theirs)]).catch(() => {})
    return J({ id: me.id, peer: await giveCard(env, theirs) || { none: 1 } })
  }

  const bm = /^bump\/([a-z0-9]{12})$/.exec(p)
  if (bm && m === 'GET') {
    const row = await env.DB.prepare('SELECT peer FROM bump WHERE id = ?').bind(bm[1]).first()
    if (!row?.peer) return J({})
    const peer = await env.DB.prepare('SELECT give FROM bump WHERE id = ?').bind(row.peer).first()
    return J({ peer: peer ? await giveCard(env, JSON.parse(peer.give)) || { none: 1 } : { none: 1 } })
  }
  return J({ error: 'not found' }, 404)
}

// ---- pages -------------------------------------------------------------------------

const CSS = `:root{--night:#0b1630;--night2:#14254a;--gold:#f5c518;--paper:#fff8e7;--ink:#1c1530;--line:#06c755;--soft:#b9c2d8}
*{box-sizing:border-box}html,body{margin:0}[hidden]{display:none!important}
body{font:17px/1.45 system-ui,-apple-system,"Noto Sans Thai",sans-serif;color:#fff;background:var(--night);background:radial-gradient(120% 80% at 50% 0%,#1d3566 0%,var(--night) 60%) fixed;min-height:100vh;min-height:100svh;overflow-x:hidden}
html[data-l=th] .en,html[data-l=en] .th{display:none}
a{color:inherit}
main{position:relative;max-width:520px;margin:0 auto;padding:54px 16px 40px}
.lang{position:absolute;top:12px;right:16px;border:2px solid #fff;border-radius:999px;padding:5px 13px;font-weight:800;text-decoration:none;font-size:15px;z-index:3}
.home{position:absolute;top:14px;left:16px;font-weight:800;text-decoration:none;font-size:15px;opacity:.85;z-index:3}
.stage{position:relative;min-height:330px;display:flex;align-items:center;justify-content:center}
.rings{position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center;overflow:visible}
.rings i{position:absolute;border:2px solid var(--gold);border-radius:50%;width:0;height:0;opacity:0}
.go .rings i{animation:ring 1.7s ease-out both}.go .rings i:nth-child(2){animation-delay:.18s}.go .rings i:nth-child(3){animation-delay:.36s}
@keyframes ring{0%{width:0;height:0;opacity:.95}100%{width:180vmax;height:180vmax;opacity:0}}
.spark{position:absolute;left:50%;top:50%;width:7px;height:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 10px var(--gold);opacity:0;pointer-events:none}
.go .spark{animation:fly .95s cubic-bezier(.1,.7,.3,1) both}
@keyframes fly{0%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) scale(.2);opacity:0}}
.card{position:relative;z-index:2;width:100%;background:linear-gradient(160deg,#fff8e7,#ffe9a8);color:var(--ink);border-radius:22px;padding:22px 20px 18px;box-shadow:0 0 0 2px var(--gold),0 24px 60px rgba(0,0,0,.55),0 0 80px rgba(245,197,24,.35);cursor:pointer;transform-origin:50% 100%}
.go .card{animation:drop .85s cubic-bezier(.2,1.25,.35,1) both}
@keyframes drop{0%{transform:translateY(-115vh) rotate(-9deg)}62%{transform:translateY(0) rotate(1.5deg) scale(1.03,.95)}80%{transform:translateY(-10px) rotate(-.5deg)}100%{transform:none}}
.card .from{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7a6420;margin:0 0 6px}
.card h1{font-size:clamp(32px,10vw,46px);line-height:1.05;margin:0 0 4px;letter-spacing:-.5px;overflow-wrap:anywhere}
.card .role{margin:0 0 14px;font-size:18px;color:#4a4458}
.btn,button{display:block;width:100%;font:inherit;font-weight:800;font-size:19px;padding:15px 16px;border-radius:14px;border:2px solid var(--ink);cursor:pointer;background:var(--gold);color:#000;text-decoration:none;text-align:center;margin:8px 0 0}
.btn:active,button:active{transform:translateY(2px)}
.btn.dark{background:var(--ink);color:#fff;border-color:var(--ink)}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.chips a{flex:1 1 auto;text-align:center;background:#fff;border:2px solid var(--ink);border-radius:999px;padding:10px 14px;font-weight:800;color:var(--ink);text-decoration:none;font-size:16px}
.chips a.ln{background:var(--line);border-color:var(--line);color:#fff}
.panel{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:16px;margin:18px 0 0}
.panel h2{margin:0 0 4px;font-size:22px}.panel p{margin:0 0 10px;color:var(--soft)}
label{display:block;font-weight:700;margin:10px 0 4px;font-size:15px;color:var(--soft)}
input{width:100%;font:inherit;padding:12px;border-radius:12px;border:2px solid rgba(255,255,255,.35);background:rgba(0,0,0,.25);color:#fff}
input:focus{outline:none;border-color:var(--gold)}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.st{min-height:1.5em;margin:10px 0 0;font-weight:800;color:var(--gold);text-align:center}
.st.ok{color:#7dffb0}
.press{background:transparent;color:#fff;border:2px dashed rgba(255,255,255,.5);font-size:16px;padding:12px}
.armed .ready{animation:pulse 1.4s ease-in-out infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(245,197,24,.7)}50%{box-shadow:0 0 0 12px rgba(245,197,24,0)}}
.small{font-size:15px;color:var(--soft)}
.foot{text-align:center;margin:22px 0 0}.foot a{font-weight:800}
.peer{margin:12px 0 0}
.seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.seg button{margin:0;background:transparent;color:#fff;border:2px solid rgba(255,255,255,.4)}
.seg button[aria-pressed=true]{background:var(--gold);color:#000;border-color:var(--gold)}
.nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}
.nums b{display:block;font-size:30px;color:var(--gold)}
.addr{font:15px ui-monospace,monospace;background:rgba(0,0,0,.3);padding:10px;border-radius:10px;word-break:break-all;margin:6px 0}
.steps{display:grid;gap:10px;margin:18px 0 0;padding:0;list-style:none;counter-reset:s}
.steps li{display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.07);border-radius:14px;padding:12px}
.steps li:before{counter-increment:s;content:counter(s);flex:none;width:34px;height:34px;border-radius:50%;background:var(--gold);color:#000;font-weight:900;display:flex;align-items:center;justify-content:center}
.lede{font-size:20px;margin:16px 0 0;text-align:center}
@media (prefers-reduced-motion:reduce){.go .card,.go .rings i,.go .spark{animation:none}}`

const shell = ({ lang, title, desc, body, nonce, index }) => `<!doctype html><html lang="${lang}" data-l="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#0b1630"><link rel="icon" href="/s/ant.svg">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website">
<meta property="og:image" content="${HOME}/s/tap-card.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Two phones touch and a gold card lands on one of them"><meta name="twitter:card" content="summary_large_image">
${index ? `<link rel="canonical" href="${HOME}/tap">` : '<meta name="robots" content="noindex">'}
<style>${CSS}</style></head><body>${body}</body></html>`

const langLink = (lang) => `<a class="lang" href="?l=${lang === 'th' ? 'en' : 'th'}">${lang === 'th' ? 'EN' : 'ไทย'}</a>`

/** The card's face, the same on every page that shows one. */
function face(c, { save } = {}) {
  const chips = []
  if (c.line) chips.push(`<a class="ln" href="https://line.me/ti/p/~${encodeURIComponent(c.line)}">LINE</a>`)
  if (c.phone) chips.push(`<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${t('โทร', 'Call')}</a>`)
  if (c.email) chips.push(`<a href="mailto:${esc(c.email)}">${t('อีเมล', 'Email')}</a>`)
  if (c.site) chips.push(`<a href="${HOME}/${esc(c.site)}">${t('หน้าเว็บ', 'Page')}</a>`)
  return `<p class="from">motdang · ${t('แตะ', 'tap')}</p><h1>${esc(c.name)}</h1>${c.role ? `<p class="role">${esc(c.role)}</p>` : ''}
${c.link ? `<a class="btn dark" href="${esc(c.link)}">${c.label ? esc(c.label) : t('เปิดลิงก์', 'Open the link')} →</a>` : ''}
${save ? `<a class="btn" href="${save}">${t('บันทึกรายชื่อ', 'Save contact')}</a>` : ''}
${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}`
}

const stage = (inner) => `<div class="stage" id="stage"><div class="rings"><i></i><i></i><i></i></div><div class="card" id="card">${inner}</div></div>`

// Shared by the pages: the server clock, the knock, the pairing, and the landing.
const JS_CORE = `const L=document.documentElement.dataset.l;const W=(th,en)=>L==='th'?th:en
function land(){const s=document.getElementById('stage');if(!s)return;s.querySelectorAll('.spark').forEach(e=>e.remove());for(let i=0;i<22;i++){const e=document.createElement('i');e.className='spark';const a=Math.random()*6.283,r=120+Math.random()*220;e.style.setProperty('--x',Math.cos(a)*r+'px');e.style.setProperty('--y',Math.sin(a)*r+'px');e.style.animationDelay=(.5+Math.random()*.2)+'s';s.appendChild(e)}s.classList.remove('go');void s.offsetWidth;s.classList.add('go');setTimeout(()=>navigator.vibrate&&navigator.userActivation&&navigator.userActivation.hasBeenActive&&navigator.vibrate([25,40,90]),520)}
const B=(()=>{let off=0,on=false,last=0,give=null,hit=null,say=null,pos=null,prev=0
const now=()=>Date.now()+off
async function sync(){try{const a=Date.now();const j=await(await fetch('/tap/api/time',{cache:'no-store'})).json();const b=Date.now();off=j.now-(a+b)/2}catch(e){}}
function where(){if(!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(p=>{pos={lat:p.coords.latitude,lng:p.coords.longitude}},()=>{},{maximumAge:60000,timeout:9000})}
function motion(e){let m;const a=e.acceleration;if(a&&a.x!=null)m=Math.hypot(a.x,a.y,a.z);else{const g=e.accelerationIncludingGravity;if(!g||g.x==null)return;m=Math.abs(Math.hypot(g.x,g.y,g.z)-9.81)}const j=Math.abs(m-prev);prev=m;if((m>14||j>18)&&now()-last>2500)knock()}
async function knock(){last=now();const t=last;navigator.vibrate&&navigator.vibrate(35);say&&say('knock');try{const r=await fetch('/tap/api/bump',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({t,lat:pos&&pos.lat,lng:pos&&pos.lng,give})});const j=await r.json();if(j.peer)return got(j.peer);if(!j.id)return say&&say('miss');for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,350));const k=await(await fetch('/tap/api/bump/'+j.id,{cache:'no-store'})).json();if(k.peer)return got(k.peer)}say&&say('miss')}catch(e){say&&say('miss')}}
function got(p){navigator.vibrate&&navigator.vibrate([30,50,120]);hit&&hit(p)}
async function arm(g,h,s){give=g;hit=h;say=s;let ok=true;if(typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function'){try{ok=(await DeviceMotionEvent.requestPermission())!=='denied'}catch(e){ok=!/iP(hone|ad|od)/.test(navigator.userAgent)}}sync();where();if(!on&&ok){addEventListener('devicemotion',motion);on=true}s&&s(ok?'armed':'nomotion')}
function setGive(g){give=g}
return{arm,knock,sync,setGive}})()
function vcf(c){const e=s=>String(s).replace(/([,;\\\\])/g,'\\\\$1');const l=['BEGIN:VCARD','VERSION:3.0','FN:'+e(c.name),'N:;'+e(c.name)+';;;'];if(c.role)l.push('TITLE:'+e(c.role));if(c.phone)l.push('TEL;TYPE=CELL:'+c.phone.replace(/[^\\d+]/g,''));if(c.email)l.push('EMAIL:'+e(c.email));if(c.line)l.push('NOTE:LINE '+e(c.line));l.push('END:VCARD');return URL.createObjectURL(new Blob([l.join('\\r\\n')+'\\r\\n'],{type:'text/vcard'}))}
const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])
function peerCard(p){if(!p||p.none)return '<p class="small">'+W('ชนติดแล้ว อีกเครื่องไม่ได้ใส่นามบัตร','Bumped. The other phone gave no card.')+'</p>';const ch=[];if(p.line)ch.push('<a class="ln" href="https://line.me/ti/p/~'+encodeURIComponent(p.line)+'">LINE</a>');if(p.phone)ch.push('<a href="tel:'+H(p.phone.replace(/[^\\d+]/g,''))+'">'+W('โทร','Call')+'</a>');if(p.email)ch.push('<a href="mailto:'+H(p.email)+'">'+W('อีเมล','Email')+'</a>');const save=p.id?'/tap/'+p.id+'.vcf':vcf(p);return '<div class="card" style="animation:drop .85s cubic-bezier(.2,1.25,.35,1) both"><p class="from">'+W('ได้มาจากการชน','from a bump')+'</p><h1>'+H(p.name)+'</h1>'+(p.role?'<p class="role">'+H(p.role)+'</p>':'')+(p.link?'<a class="btn dark" href="'+H(p.link)+'">'+(p.label?H(p.label):W('เปิดลิงก์','Open the link'))+' →</a>':'')+'<a class="btn" href="'+save+'" download="'+H(p.name)+'.vcf">'+W('บันทึกรายชื่อ','Save contact')+'</a>'+(ch.length?'<div class="chips">'+ch.join('')+'</div>':'')+'</div>'}
function sayer(el,wrap){return s=>{el.className='st';const m={armed:W('เคาะมือถือเข้าหากันเบาๆ ได้เลย','Knock phones together, gently'),nomotion:W('เครื่องนี้ไม่ให้อ่านการเคลื่อนไหว กดปุ่มด้านล่างพร้อมกันแทน','This phone keeps motion closed. Press the button below at the same moment instead.'),knock:W('ชน… กำลังหาอีกเครื่อง','Bump… finding the other phone'),miss:W('ไม่ติด เคาะอีกที พร้อมกันทั้งสองเครื่อง','Missed. Knock again, both at once.')};el.textContent=m[s]||'';if(wrap)wrap.classList.toggle('armed',s!=='miss')}}`

/** /tap/<id>: what a touch opens. */
export function arrival(c, lang, nonce) {
  const body = `<main>${langLink(lang)}<a class="home" href="/tap">motdang</a>
${stage(face(c, { save: `/tap/${c.id}.vcf` }))}
<section class="panel" id="back"><h2>${t('ชนกลับ', 'Bump back')}</h2><p>${t('ใส่ชื่อกับเบอร์หรือไลน์ กด พร้อม แล้วเคาะมือถือเข้าหากันเบาๆ ' + esc(c.name) + ' ได้นามบัตรของคุณทันที', 'Type a name and a phone or LINE, press Ready, then knock phones together gently. ' + esc(c.name) + ' gets your card.')}</p>
<form id="mine"><div class="row2"><div><label for="mn">${t('ชื่อ', 'Name')}</label><input id="mn" autocomplete="name" maxlength="60"></div><div><label for="ml">${t('ไอดีไลน์', 'LINE ID')}</label><input id="ml" maxlength="40" autocapitalize="off"></div></div>
<label for="mp">${t('เบอร์โทร', 'Phone')}</label><input id="mp" type="tel" autocomplete="tel" maxlength="24">
<button class="ready" type="submit">${t('พร้อม', 'Ready')}</button></form>
<button class="press" id="press" type="button" hidden>${t('หรือกดปุ่มนี้พร้อมกันทั้งสองเครื่อง', 'Or press this on both phones at the same moment')}</button>
<p class="st" id="st"></p><div class="peer" id="peer"></div></section>
<p class="foot"><a href="/tap">${t('ทำของคุณเอง ฟรี', 'Make your own, free')}</a></p></main>
<script nonce="${nonce}">${JS_CORE}
const NM=${JSON.stringify(c.name).replace(/</g, '\\u003c')}
land();document.getElementById('card').addEventListener('click',e=>{if(!e.target.closest('a'))land()})
const f=document.getElementById('mine'),st=document.getElementById('st'),back=document.getElementById('back');let saved={};try{saved=JSON.parse(localStorage.getItem('tap-mine')||'{}')}catch(e){}
['mn','ml','mp'].forEach((k,i)=>{const v=[saved.name,saved.line,saved.phone][i];if(v)document.getElementById(k).value=v})
f.addEventListener('submit',async e=>{e.preventDefault();const card={name:mn.value.trim(),line:ml.value.trim(),phone:mp.value.trim()};try{localStorage.setItem('tap-mine',JSON.stringify(card))}catch(e){}
const give=card.name&&(card.line||card.phone)?{card}:null;await B.arm(give,()=>{st.className='st ok';st.textContent=W('ส่งแล้ว ✓ '+NM+' ได้นามบัตรของคุณ','Sent ✓ '+NM+' has your card');back.classList.remove('armed')},sayer(st,back));document.getElementById('press').hidden=false})
document.getElementById('press').addEventListener('click',()=>B.knock())
</script>`
  return shell({ lang, title: `${c.name} · motdang`, desc: lang === 'th' ? 'แตะแล้วได้นามบัตร' : 'A card from a tap', body, nonce })
}

/** /tap: what it is, and the form that makes one. */
export function front(lang, nonce) {
  const demo = { name: lang === 'th' ? 'ชื่อของคุณ' : 'Your name', role: 'motdang.net', line: 'you', phone: '0800000000' }
  const body = `<main>${langLink(lang)}<a class="home" href="${HOME}">motdang</a>
${stage(face(demo, { save: '#make' }))}
<p class="lede"><b>${t('แตะมือถือกัน นามบัตรของคุณไปโผล่บนเครื่องเขา', 'Touch phones. Your card lands on theirs.')}</b></p>
<ol class="steps">
<li>${t('ทำนามบัตรด้านล่าง ชื่อ เบอร์ ไลน์ หรือลิงก์ motdang', 'Make your card below: name, phone, LINE, or a motdang link')}</li>
<li>${t('แปะสติกเกอร์ NFC (NTAG215 จาก Shopee หรือ Lazada) หลังมือถือ แล้วกด เขียนสติกเกอร์ หรือใช้แอป NFC Tools', 'Stick an NFC sticker (NTAG215, from Shopee or Lazada) on the back of your phone and write it from your page, or with the NFC Tools app')}</li>
<li>${t('ใครแตะมือถือกับเครื่องคุณ ไอโฟน XS ขึ้นไป หรือแอนดรอยด์ที่เปิด NFC นามบัตรเด้งขึ้นมาเอง ไม่ต้องลงแอป', 'Anyone who touches their phone to yours, an iPhone XS or newer or an Android with NFC on, gets your card. No app.')}</li>
<li>${t('ไม่มีสติกเกอร์? เปิดหน้านี้ทั้งสองเครื่อง เคาะชนกัน นามบัตรสลับกัน', 'No sticker? Both phones open a tap page and knock together: the cards swap.')}</li>
</ol>
<section class="panel" id="make"><h2>${t('ทำของคุณ', 'Make yours')}</h2><p>${t('ฟรี ไม่ต้องสมัคร ลิงก์หน้าของคุณคือกุญแจ', 'Free, no sign-up. Your page link is the key.')}</p>
<form id="nf"><label for="n">${t('ชื่อ', 'Name')}</label><input id="n" required maxlength="60" autocomplete="name">
<label for="r">${t('บรรทัดใต้ชื่อ', 'Under the name')}</label><input id="r" maxlength="80" placeholder="${lang === 'th' ? 'ร้าน งาน หรือคำสั้นๆ' : 'shop, work, a few words'}">
<div class="row2"><div><label for="p">${t('เบอร์โทร', 'Phone')}</label><input id="p" type="tel" maxlength="24" autocomplete="tel"></div><div><label for="l">${t('ไอดีไลน์', 'LINE ID')}</label><input id="l" maxlength="40" autocapitalize="off"></div></div>
<label for="e">${t('อีเมล', 'Email')}</label><input id="e" type="email" maxlength="120" autocomplete="email">
<label for="k">${t('ลิงก์ motdang (ถ้ามี)', 'A motdang link (if any)')}</label><input id="k" type="url" maxlength="300" placeholder="https://motdang.net/…">
<button type="submit">${t('ทำนามบัตร', 'Make my card')}</button><p class="st" id="st"></p></form></section>
<p class="foot small">${t('มีหน้าเว็บบน motdang แล้ว? ใส่ชื่อหน้าในหน้าของคุณได้', 'Have a page on sites.motdang.net? Add its name on your tap page.')}</p></main>
<script nonce="${nonce}">${JS_CORE}
land();document.getElementById('card').addEventListener('click',e=>{if(!e.target.closest('a'))land();else{e.preventDefault();document.getElementById('make').scrollIntoView({behavior:'smooth'})}})
document.getElementById('nf').addEventListener('submit',async ev=>{ev.preventDefault();const st=document.getElementById('st');const link=k.value.trim();const b={name:n.value,role:r.value,phone:p.value,line:l.value,email:e.value,link,give:link?'link':'card',lang:L};st.textContent='…'
const res=await fetch('/tap/api/new',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});const j=await res.json().catch(()=>({}))
if(j.id){try{localStorage.setItem('tap-own',j.id+'.'+j.key)}catch(e){}location.href='/tap/me#'+j.id+'.'+j.key}else st.textContent=j.error==='quota'?W('วันนี้ทำครบแล้ว พรุ่งนี้ลองใหม่','That is enough for today. Try tomorrow.'):W('ใส่ชื่อก่อน','A name first')})
</script>`
  return shell({ lang, title: 'Tap · motdang', desc: lang === 'th' ? 'แตะมือถือกัน นามบัตรของคุณไปโผล่บนเครื่องเขา' : 'Touch phones. Your card lands on theirs.', body, nonce, index: true })
}

/** /tap/me: the owner's page, read with the key in the address's # part. */
export function ownerPage(lang, nonce) {
  const body = `<main>${langLink(lang)}<a class="home" href="/tap">motdang</a>
<div id="none" hidden class="panel"><h2>${t('ไม่พบกุญแจ', 'No key here')}</h2><p>${t('เปิดลิงก์หน้าของคุณที่ได้ตอนทำนามบัตร', 'Open the page link you got when you made your card.')}</p><a class="btn" href="/tap#make">${t('ทำใหม่', 'Make one')}</a></div>
<div id="own" hidden>
${stage('<div id="face"></div>')}
<section class="panel" id="bumpp"><button class="ready" id="arm" type="button">${t('โหมดชน', 'Bump mode')}</button>
<button class="press" id="press" type="button" hidden>${t('หรือกดปุ่มนี้พร้อมกันทั้งสองเครื่อง', 'Or press this on both phones at the same moment')}</button>
<p class="st" id="st"></p><div id="peer"></div></section>
<section class="panel"><div class="nums"><div><b id="nt">0</b>${t('แตะวันนี้', 'taps today')}</div><div><b id="nw">0</b>${t('แตะ 7 วัน', 'taps, 7 days')}</div><div><b id="nb">0</b>${t('ชนทั้งหมด', 'bumps')}</div></div></section>
<section class="panel"><h2>${t('แตะแล้วได้', 'A touch gives')}</h2>
<div class="seg"><button type="button" data-g="card">${t('นามบัตร', 'My card')}</button><button type="button" data-g="link">${t('ลิงก์', 'A link')}</button></div>
<div id="lk"><label for="k">${t('ลิงก์ motdang', 'motdang link')}</label><input id="k" type="url" maxlength="300" placeholder="https://motdang.net/…"><label for="kl">${t('ชื่อปุ่ม', 'Button words')}</label><input id="kl" maxlength="60"></div>
<label for="n">${t('ชื่อ', 'Name')}</label><input id="n" maxlength="60"><label for="r">${t('บรรทัดใต้ชื่อ', 'Under the name')}</label><input id="r" maxlength="80">
<div class="row2"><div><label for="p">${t('เบอร์โทร', 'Phone')}</label><input id="p" type="tel" maxlength="24"></div><div><label for="l">${t('ไอดีไลน์', 'LINE ID')}</label><input id="l" maxlength="40" autocapitalize="off"></div></div>
<label for="e">${t('อีเมล', 'Email')}</label><input id="e" type="email" maxlength="120"><label for="s">${t('หน้าบน sites.motdang.net', 'Page on sites.motdang.net')}</label><input id="s" maxlength="30" placeholder="name" autocapitalize="off">
<button id="save" type="button">${t('บันทึก', 'Save')}</button><p class="st" id="sst"></p></section>
<section class="panel"><h2>${t('สติกเกอร์', 'Sticker')}</h2><p>${t('สติกเกอร์เก็บที่อยู่นี้', 'The sticker holds this address')}</p><div class="addr" id="addr"></div>
<button id="nfc" type="button" hidden>${t('เขียนสติกเกอร์', 'Write a sticker')}</button><button class="press" id="copy" type="button">${t('คัดลอกที่อยู่', 'Copy the address')}</button>
<p class="small" id="nfch">${t('เครื่องนี้เขียนเองไม่ได้: แอป NFC Tools → Write → Add a record → URL → วางที่อยู่ → Write แล้วแตะสติกเกอร์', 'This phone cannot write it here: NFC Tools app → Write → Add a record → URL → paste the address → Write, then touch the sticker.')}</p><p class="st" id="nst"></p></section>
<section class="panel" id="metp" hidden><h2>${t('คนที่ชนกัน', 'People you bumped')}</h2><div id="met"></div></section>
<p class="foot small">${t('ลิงก์หน้านี้คือกุญแจ เก็บไว้', 'This page’s link is the key. Keep it.')}</p></div></main>
<script nonce="${nonce}">${JS_CORE}
let key=(location.hash||'').slice(1);try{if(key)localStorage.setItem('tap-own',key);else key=localStorage.getItem('tap-own')||''}catch(e){}
const $=id=>document.getElementById(id);let me=null,give='card'
function faceHtml(c){const ch=[];if(c.line)ch.push('<a class="ln" href="https://line.me/ti/p/~'+encodeURIComponent(c.line)+'">LINE</a>');if(c.phone)ch.push('<a href="tel:'+H(c.phone)+'">'+W('โทร','Call')+'</a>');if(c.email)ch.push('<a href="mailto:'+H(c.email)+'">'+W('อีเมล','Email')+'</a>');if(c.site)ch.push('<a href="${HOME}/'+H(c.site)+'">'+W('หน้าเว็บ','Page')+'</a>');return '<p class="from">motdang · '+W('แตะ','tap')+'</p><h1>'+H(c.name)+'</h1>'+(c.role?'<p class="role">'+H(c.role)+'</p>':'')+(c.give==='link'&&c.link?'<a class="btn dark" href="'+H(c.link)+'">'+(c.label?H(c.label):W('เปิดลิงก์','Open the link'))+' →</a>':'')+'<a class="btn" href="/tap/'+c.id+'.vcf">'+W('บันทึกรายชื่อ','Save contact')+'</a>'+(ch.length?'<div class="chips">'+ch.join('')+'</div>':'')}
function show(c){me=c;give=c.give;$('face').innerHTML=faceHtml(c);$('addr').textContent=c.url;$('n').value=c.name;$('r').value=c.role;$('p').value=c.phone;$('l').value=c.line;$('e').value=c.email;$('s').value=c.site;$('k').value=c.link;$('kl').value=c.label;seg();
const today=new Date().toISOString().slice(0,10);let td=0,wk=0;(c.days||[]).forEach(d=>{wk+=d.taps;if(d.day===today)td=d.taps});$('nt').textContent=td;$('nw').textContent=wk;$('nb').textContent=c.bumps}
function seg(){document.querySelectorAll('.seg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.g===give));$('lk').hidden=give!=='link'}
document.querySelectorAll('.seg button').forEach(b=>b.addEventListener('click',()=>{give=b.dataset.g;seg()}))
async function load(){if(!/^[a-z0-9]{8}\\.[a-z0-9]+$/.test(key)){$('none').hidden=false;return}const r=await fetch('/tap/api/own',{headers:{'x-tap':key}});if(!r.ok){$('none').hidden=false;return}$('own').hidden=false;show(await r.json());land();history.replaceState(null,'','/tap/me')}
$('stage').addEventListener('click',e=>{if(!e.target.closest('a'))land()})
$('save').addEventListener('click',async()=>{const b={name:$('n').value,role:$('r').value,phone:$('p').value,line:$('l').value,email:$('e').value,site:$('s').value,give,link:$('k').value.trim(),label:$('kl').value};const r=await fetch('/tap/api/own',{method:'PUT',headers:{'content-type':'application/json','x-tap':key},body:JSON.stringify(b)});const j=await r.json().catch(()=>({}));const s=$('sst');if(r.ok){show(j);land();s.className='st ok';s.textContent=W('บันทึกแล้ว ✓','Saved ✓')}else{s.className='st';s.textContent=j.error==='link'?W('ลิงก์ต้องเป็น motdang.net hongdam.net wichaa.net หรือ LINE','The link must be on motdang.net, hongdam.net, wichaa.net or LINE'):j.error==='name'?W('ใส่ชื่อก่อน','A name first'):W('ยังไม่ผ่าน ลองอีกที','That did not go through. Try again.')}})
let met=[];try{met=JSON.parse(localStorage.getItem('tap-met')||'[]')}catch(e){}
function drawMet(){$('metp').hidden=!met.length;$('met').innerHTML=met.map(peerCard).join('')}drawMet()
$('arm').addEventListener('click',async()=>{await B.arm({tap:me.id},p=>{$('peer').innerHTML=peerCard(p);$('st').className='st ok';$('st').textContent=W('ชนติด ✓ เขาได้นามบัตรของคุณแล้ว','Bumped ✓ They have your card');$('bumpp').classList.remove('armed');if(p&&!p.none){met.unshift(p);met=met.slice(0,30);try{localStorage.setItem('tap-met',JSON.stringify(met))}catch(e){}drawMet()}$('nb').textContent=+$('nb').textContent+1},sayer($('st'),$('bumpp')));$('press').hidden=false})
$('press').addEventListener('click',()=>B.knock())
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(me.url);$('nst').className='st ok';$('nst').textContent=W('คัดลอกแล้ว','Copied')}catch(e){}})
if('NDEFReader' in window){$('nfc').hidden=false;$('nfch').hidden=true;$('nfc').addEventListener('click',async()=>{const s=$('nst');s.className='st';s.textContent=W('แตะสติกเกอร์เปล่าที่หลังมือถือเครื่องนี้','Touch a blank sticker to the back of this phone');try{await new NDEFReader().write({records:[{recordType:'url',data:me.url}]});s.className='st ok';s.textContent=W('เขียนแล้ว ✓ ลองแตะด้วยมือถืออีกเครื่อง','Written ✓ Try it with another phone');navigator.vibrate&&navigator.vibrate([30,50,120])}catch(e){s.textContent=W('เขียนไม่ได้: ','Not written: ')+(e&&e.message||e)}})}
load()
</script>`
  return shell({ lang, title: 'Your tap · motdang', desc: 'Your tap', body, nonce })
}
