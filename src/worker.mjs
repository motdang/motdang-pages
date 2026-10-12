// worker.mjs — motdang.net/~ : people's own pages on Mot Dang.
//
//   /~name                the page           /~name/sign   a printable sign
//   /~name/contact.vcf    save contact       /~name/event.ics  calendar entry
//   /~/                   every page         /~/make       the builder
//   /~/random             a page at random   /~/admin      held and reported pages
//   /~/api/…              the builder's calls  /~/img/…    photos   /~/s/…  static files
//
// The edit link is the sign-in: a long random token, stored only as its hash.

import { render, normalize, vcard, ics, sign, KINDS, LOOK_IDS } from '../public/s/render.mjs'
import { PAGE_LANGS } from '../public/s/words.mjs'
import { nameProblem, screen } from './screen.mjs'
import { clean, look, typeOf, MAX_BIG, MAX_SMALL } from './photo.mjs'
import { directory, notFound, adminPage } from './pages.mjs'

const MAX_PHOTOS = 16
const QUOTA = { site: 3, photo: 80, save: 300, report: 20 }

export default {
  async fetch(request, env, ctx) {
    try { return await route(request, env, ctx) } catch (e) {
      console.error(e?.stack || e)
      return new Response('Something went wrong. Please try again.', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } })
    }
  },
  async scheduled(_ev, env, ctx) { ctx.waitUntil(tidy(env)) },
}

async function route(request, env, ctx) {
  const url = new URL(request.url)
  const path = decodeURIComponent(url.pathname)
  const m = request.method

  if (env.DEV_PROXY && /^\/(vendor|fonts|tiles)\//.test(path)) {
    const hh = { 'user-agent': 'Mozilla/5.0' }
    if (request.headers.get('range')) hh.range = request.headers.get('range')
    return fetch(env.DEV_PROXY + path, { method: m, headers: hh })
  }
  if (path === '/~') return Response.redirect(url.origin + '/~/', 301)
  if (path.startsWith('/~/s/')) return asset(request, env, '/s/' + path.slice(5))
  if (path === '/~/make' || path === '/~/make/') return asset(request, env, '/s/make.html', true)
  if (path.startsWith('/~/img/')) return image(env, path.slice(7))
  if (path.startsWith('/~/api/')) return api(request, env, ctx, path.slice(7), url)
  if (path === '/~/' && m === 'GET') return html(await directory(env, url, request), 200, { cache: 'public, max-age=120' })
  if (path === '/~/random') {
    const r = await env.DB.prepare("SELECT name FROM site WHERE status='live' ORDER BY random() LIMIT 1").first()
    return Response.redirect(url.origin + (r ? '/~' + r.name : '/~/'), 302)
  }
  if (path === '/~/admin' || path.startsWith('/~/admin/')) return admin(request, env, path.slice(8), url)

  const pm = /^\/~([a-z0-9-]{3,30})(\/sign|\/contact\.vcf|\/event\.ics)?\/?$/.exec(path)
  if (pm && m === 'GET') return page(request, env, ctx, pm[1], pm[2] || '', url)
  return html(notFound(null, request), 404)
}

// ---- pages ---------------------------------------------------------------------

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|embedly|whatsapp|linkexpand|curl|wget|python|headless/i

async function page(request, env, ctx, name, sub, url) {
  const s = await env.DB.prepare('SELECT * FROM site WHERE name = ?').bind(name).first()
  if (!s || s.status === 'removed' || s.status === 'draft') return html(notFound(s ? null : name, request, s?.status), s?.status === 'removed' ? 410 : 404)
  const site = { ...s, d: JSON.parse(s.d) }
  if (sub === '/contact.vcf') {
    if (s.status !== 'live') return new Response('', { status: 404 })
    return new Response(vcard(site), { headers: { 'content-type': 'text/vcard; charset=utf-8', 'content-disposition': `attachment; filename="${name}.vcf"` } })
  }
  if (sub === '/event.ics') {
    const body = s.status === 'live' && ics(site)
    if (!body) return new Response('', { status: 404 })
    return new Response(body, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': `attachment; filename="${name}.ics"` } })
  }
  const nonce = rand(16)
  if (sub === '/sign') {
    if (s.status !== 'live') return html(notFound(null, request), 404)
    return html(sign(site, { nonce }), 200, { nonce })
  }
  if (s.status === 'live' && !BOT.test(request.headers.get('user-agent') || '')) {
    ctx.waitUntil(env.DB.prepare('UPDATE site SET views = views + 1 WHERE id = ?').bind(s.id).run())
    site.views = s.views + 1
  }
  return html(render(site, { origin: url.origin, nonce }), 200, { nonce })
}

function html(body, status = 200, { nonce, cache } = {}) {
  const h = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': cache || 'no-cache',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'content-security-policy': `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; ` +
      `script-src 'self'${nonce ? ` 'nonce-${nonce}'` : ''}; connect-src 'self'; worker-src 'self' blob:; child-src blob:; ` +
      `frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'`,
  }
  return new Response(body, { status, headers: h })
}

async function asset(request, env, p, isPage) {
  const r = await env.ASSETS.fetch(new Request(new URL(p, request.url), { method: 'GET', headers: request.headers }))
  if (!isPage || !r.ok) return r
  const h = new Headers(r.headers)
  h.set('cache-control', 'no-cache')
  h.set('content-security-policy', "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; " +
    "connect-src 'self'; worker-src 'self' blob:; child-src blob:; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'")
  return new Response(r.body, { status: r.status, headers: h })
}

async function image(env, rest) {
  const id = /^([a-z0-9]{12,24})(-s)?\.(webp|jpg|png)$/.exec(rest)
  if (!id) return new Response('', { status: 404 })
  const obj = (await env.MEDIA.get(`p/${id[1]}${id[2] || ''}`)) || (id[2] ? await env.MEDIA.get(`p/${id[1]}`) : null)
  if (!obj || obj.customMetadata?.v !== 'ok') return new Response('', { status: 404, headers: { 'cache-control': 'no-cache' } })
  return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType || 'image/webp', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } })
}

// ---- api -----------------------------------------------------------------------

const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

async function api(request, env, ctx, p, url) {
  const m = request.method
  if (m !== 'GET' && !sameOrigin(request, url)) return J({ error: 'origin' }, 403)

  if (p === 'name' && m === 'GET') {
    const n = (url.searchParams.get('n') || '').toLowerCase()
    const why = nameProblem(n)
    if (why) return J({ ok: false, why })
    const taken = await env.DB.prepare('SELECT 1 FROM site WHERE name = ?').bind(n).first()
    return J({ ok: !taken, why: taken ? 'taken' : '' })
  }

  if (p === 'resolve' && m === 'GET') return J(await resolveMapLink(url.searchParams.get('u') || ''))

  if (p === 'sites' && m === 'POST') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'site'))) return J({ error: 'quota' }, 429)
    const b = await body(request)
    const name = String(b.name || '').toLowerCase()
    const why = nameProblem(name)
    if (why) return J({ error: 'name', why }, 400)
    const kind = KINDS.includes(b.kind) ? b.kind : 'shop'
    const lookId = LOOK_IDS.includes(b.look) ? b.look : 'poster'
    const lang = PAGE_LANGS[b.lang] ? b.lang : 'th'
    const d = normalize(b.d || {})
    const token = rand(32)
    const id = rand(12)
    const now = new Date().toISOString()
    try {
      await env.DB.prepare('INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, cc, lat, lng, sender, created, updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, name, await sha(token), 'draft', kind, lookId, lang, JSON.stringify(d), d.place.cc || null, d.place.lat, d.place.lng, who.slice(0, 16), now, now).run()
    } catch (e) {
      if (/UNIQUE/i.test(String(e))) return J({ error: 'name', why: 'taken' }, 409)
      throw e
    }
    await log(env, id, 'create', name)
    return J({ id, name, token, status: 'draft' })
  }

  // Everything below needs the edit link.
  const token = request.headers.get('x-edit') || ''
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return api2(request, env, p, url)
  const s = await env.DB.prepare('SELECT * FROM site WHERE edit_hash = ?').bind(await sha(token)).first()
  if (!s || s.status === 'removed') return J({ error: 'edit-link' }, 403)

  if (p === 'site' && m === 'GET') return J({ id: s.id, name: s.name, status: s.status, kind: s.kind, look: s.look, lang: s.lang, d: JSON.parse(s.d), views: s.views })

  if (p === 'site' && m === 'PUT') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'save'))) return J({ error: 'quota' }, 429)
    const b = await body(request)
    const d = normalize(b.d || JSON.parse(s.d))
    const kind = KINDS.includes(b.kind) ? b.kind : s.kind
    const lookId = LOOK_IDS.includes(b.look) ? b.look : s.look
    const lang = PAGE_LANGS[b.lang] ? b.lang : s.lang
    let name = s.name
    if (b.name && b.name !== s.name) {
      name = String(b.name).toLowerCase()
      const why = nameProblem(name)
      if (why) return J({ error: 'name', why }, 400)
    }
    // photos named in the page must be this page's own
    const ids = [...new Set([d.cover, d.card, d.place.snap, ...d.photos].filter(Boolean))]
    if (ids.length) {
      const own = await env.DB.prepare(`SELECT id FROM photo WHERE site_id = ? AND id IN (${ids.map(() => '?').join(',')})`).bind(s.id, ...ids).all()
      const ok = new Set(own.results.map((r) => r.id))
      if (!ok.has(d.cover)) d.cover = ''
      if (!ok.has(d.card)) d.card = ''
      if (!ok.has(d.place.snap)) d.place.snap = ''
      d.photos = d.photos.filter((x) => ok.has(x))
    }
    let status = s.status, held = null
    const publish = b.publish === true || s.status !== 'draft'
    if (publish) {
      const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM site WHERE sender = ? AND status != 'removed' AND id != ?").bind(s.sender, s.id).first()
      const r = await screen(env.AI, d, { sameSender: n?.n || 0 })
      const modelOnly = r.decision === 'held' && r.reasons.every((x) => x.startsWith('guard:guard-'))
      if (s.status === 'held' && s.held_why?.startsWith('admin')) status = 'held'
      else if (modelOnly && s.status === 'live') status = 'live'
      else status = r.decision
      held = r.decision === 'held' ? r.reasons.join(' ') : null
    }
    const now = new Date().toISOString()
    try {
      await env.DB.prepare('UPDATE site SET name=?, kind=?, look=?, lang=?, d=?, cc=?, lat=?, lng=?, status=?, held_why=?, updated=?, published=COALESCE(published, ?) WHERE id=?')
        .bind(name, kind, lookId, lang, JSON.stringify(d), d.place.cc || null, d.place.lat, d.place.lng, status,
          status === 'held' ? (s.held_why?.startsWith('admin') ? s.held_why : held) : null, now, status === 'live' ? now : null, s.id).run()
    } catch (e) {
      if (/UNIQUE/i.test(String(e))) return J({ error: 'name', why: 'taken' }, 409)
      throw e
    }
    if (status !== s.status) await log(env, s.id, status, held || '')
    return J({ status, name, d })
  }

  if (p === 'site' && m === 'DELETE') {
    const ph = await env.DB.prepare('SELECT id FROM photo WHERE site_id = ?').bind(s.id).all()
    for (const r of ph.results) await env.MEDIA.delete([`p/${r.id}`, `p/${r.id}-s`])
    await env.DB.batch([
      env.DB.prepare('DELETE FROM photo WHERE site_id = ?').bind(s.id),
      env.DB.prepare("UPDATE site SET status='removed', name = name || '~' || id, d='{}', updated=? WHERE id = ?").bind(new Date().toISOString(), s.id),
    ])
    await log(env, s.id, 'deleted-by-maker', s.name)
    return J({ ok: true })
  }

  if (p === 'photo' && m === 'POST') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'photo'))) return J({ error: 'quota' }, 429)
    const have = await env.DB.prepare('SELECT COUNT(*) AS n FROM photo WHERE site_id = ?').bind(s.id).first()
    if ((have?.n || 0) >= MAX_PHOTOS + 6) return J({ error: 'too-many' }, 400)
    const form = await request.formData()
    const role = ['photo', 'map', 'card'].includes(form.get('role')) ? form.get('role') : 'photo'
    const big = clean(await form.get('big')?.arrayBuffer?.() ?? new ArrayBuffer(0), MAX_BIG)
    const small = form.get('small') ? clean(await form.get('small').arrayBuffer(), MAX_SMALL) : null
    if (big.error) return J({ error: 'photo-' + big.error }, 400)
    if (small?.error) return J({ error: 'photo-' + small.error }, 400)
    const seen = await look(env.AI, (small || big).bytes, (small || big).kind)
    const id = rand(16)
    await log(env, s.id, 'photo-' + seen.verdict, `${role} ${seen.why} ${seen.what || ''}`.trim())
    if (seen.verdict === 'refuse') return J({ error: 'photo-refused' }, 422)
    const meta = { v: seen.verdict === 'ok' ? 'ok' : 'hold' }
    await env.MEDIA.put(`p/${id}`, big.bytes, { httpMetadata: { contentType: typeOf(big.kind) }, customMetadata: meta })
    if (small) await env.MEDIA.put(`p/${id}-s`, small.bytes, { httpMetadata: { contentType: typeOf(small.kind) }, customMetadata: meta })
    await env.DB.prepare('INSERT INTO photo (id, site_id, ext, bytes, w, h, role, verdict, why, created) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(id, s.id, big.kind, big.bytes.length, Number(form.get('w')) || null, Number(form.get('h')) || null, role, meta.v, seen.why || null, new Date().toISOString()).run()
    return J({ id, held: meta.v !== 'ok' })
  }

  return J({ error: 'not-found' }, 404)
}

/** Calls that need neither a new page nor the edit link. */
async function api2(request, env, p) {
  if (p === 'report' && request.method === 'POST') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'report'))) return J({ ok: true })
    const b = await body(request)
    const s = await env.DB.prepare('SELECT id, status FROM site WHERE name = ?').bind(String(b.name || '')).first()
    if (!s) return J({ ok: true })
    await env.DB.prepare('INSERT OR IGNORE INTO report (site_id, who, why, at) VALUES (?,?,?,?)').bind(s.id, who.slice(0, 16), String(b.why || '').slice(0, 500), new Date().toISOString()).run()
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM report WHERE site_id = ?').bind(s.id).first()
    await log(env, s.id, 'report', String(b.why || '').slice(0, 120))
    if (s.status === 'live' && (n?.n || 0) >= 3)
      await env.DB.prepare("UPDATE site SET status='held', held_why='reports' WHERE id = ?").bind(s.id).run()
    return J({ ok: true })
  }
  return J({ error: 'edit-link' }, 403)
}

// ---- map links -------------------------------------------------------------------

const SHORT = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\//

/** Coordinates out of a pasted maps link or "lat, lng" text: Google (short
 *  links followed), Apple, OSM. { lat, lng } or { error }. */
export async function resolveMapLink(u) {
  u = String(u).trim().slice(0, 600)
  const direct = coordsIn(u)
  if (direct) return direct
  if (u.startsWith('http://')) u = 'https://' + u.slice(7)
  if (!SHORT.test(u)) return { error: 'no-coords' }
  for (let i = 0; i < 5; i++) {
    let r
    try { r = await fetch(u, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (motdang.net link opener)' } }) } catch { return { error: 'fetch' } }
    const to = r.headers.get('location')
    if (!(r.status >= 300 && r.status < 400) || !to) {
      const t = (await r.text()).slice(0, 200000)
      return coordsIn(t) || { error: 'no-coords' }
    }
    u = new URL(to, u).toString()
    const c = coordsIn(u)
    if (c) return c
  }
  return { error: 'no-coords' }
}

export function coordsIn(s) {
  s = decodeURIComponent(String(s).replace(/\+/g, ' '))
  const pats = [
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // Google place pin
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, // Google map centre
    /[?&](?:q|query|ll|daddr|destination|center|sll)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // Google, Apple
    /[?&]mlat=(-?\d{1,2}\.\d+)&mlon=(-?\d{1,3}\.\d+)/, // OSM marker
    /#map=\d+\/(-?\d{1,2}\.\d+)\/(-?\d{1,3}\.\d+)/, // OSM view
    /^\s*(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})\s*$/, // "18.79, 98.98"
  ]
  for (const p of pats) {
    const m = p.exec(s)
    if (m) {
      const lat = +m[1], lng = +m[2]
      if (Math.abs(lat) <= 85 && Math.abs(lng) <= 180) return { lat, lng }
    }
  }
  return null
}

// ---- admin ---------------------------------------------------------------------

async function admin(request, env, rest, url) {
  const auth = request.headers.get('authorization') || ''
  const ok = env.ADMIN_KEY && auth.startsWith('Basic ') && (() => { try { return atob(auth.slice(6)).split(':').slice(1).join(':') === env.ADMIN_KEY } catch { return false } })()
  if (!ok) return new Response('', { status: 401, headers: { 'www-authenticate': 'Basic realm="motdang pages"' } })
  if (request.method === 'POST' && rest === '/act' && sameOrigin(request, url)) {
    const f = await request.formData()
    const id = String(f.get('id') || ''), act = String(f.get('act') || '')
    if (act === 'live') await env.DB.prepare("UPDATE site SET status='live', held_why=NULL, published=COALESCE(published, ?) WHERE id=?").bind(new Date().toISOString(), id).run()
    if (act === 'hold') await env.DB.prepare("UPDATE site SET status='held', held_why='admin' WHERE id=?").bind(id).run()
    if (act === 'remove') await env.DB.prepare("UPDATE site SET status='removed' WHERE id=?").bind(id).run()
    if (act === 'photo-ok') await releasePhoto(env, id)
    await log(env, id, 'admin-' + act, '')
    return Response.redirect(url.origin + '/~/admin', 303)
  }
  return html(await adminPage(env), 200)
}

async function releasePhoto(env, id) {
  for (const k of [`p/${id}`, `p/${id}-s`]) {
    const o = await env.MEDIA.get(k)
    if (o) await env.MEDIA.put(k, await o.arrayBuffer(), { httpMetadata: o.httpMetadata, customMetadata: { v: 'ok' } })
  }
  await env.DB.prepare("UPDATE photo SET verdict='ok' WHERE id=?").bind(id).run()
}

// ---- upkeep ----------------------------------------------------------------------

async function tidy(env) {
  const old = new Date(Date.now() - 30 * 864e5).toISOString()
  const drafts = await env.DB.prepare("SELECT id FROM site WHERE status='draft' AND updated < ? LIMIT 100").bind(old).all()
  for (const r of drafts.results) {
    const ph = await env.DB.prepare('SELECT id FROM photo WHERE site_id = ?').bind(r.id).all()
    for (const p of ph.results) await env.MEDIA.delete([`p/${p.id}`, `p/${p.id}-s`])
    await env.DB.batch([env.DB.prepare('DELETE FROM photo WHERE site_id=?').bind(r.id), env.DB.prepare('DELETE FROM site WHERE id=?').bind(r.id)])
  }
  // pages and photos held only because a model did not answer get another look
  const retry = await env.DB.prepare("SELECT * FROM site WHERE status='held' AND held_why LIKE 'guard:guard-%' LIMIT 20").all()
  for (const s of retry.results) {
    const r = await screen(env.AI, JSON.parse(s.d), {})
    if (r.decision === 'live') { await env.DB.prepare("UPDATE site SET status='live', held_why=NULL, published=COALESCE(published, ?) WHERE id=?").bind(new Date().toISOString(), s.id).run(); await log(env, s.id, 'live', 'retry') }
  }
  const ph = await env.DB.prepare("SELECT id FROM photo WHERE verdict='hold' AND (why LIKE 'model-%' OR why = 'unreadable' OR why = 'no-model') LIMIT 20").all()
  for (const p of ph.results) {
    const o = await env.MEDIA.get(`p/${p.id}-s`) || await env.MEDIA.get(`p/${p.id}`)
    if (!o) continue
    const b = new Uint8Array(await o.arrayBuffer())
    const seen = await look(env.AI, b, (o.httpMetadata?.contentType || '').includes('jpeg') ? 'jpeg' : (o.httpMetadata?.contentType || '').includes('png') ? 'png' : 'webp')
    if (seen.verdict === 'ok') await releasePhoto(env, p.id)
    else if (seen.verdict === 'refuse') { await env.MEDIA.delete([`p/${p.id}`, `p/${p.id}-s`]); await env.DB.prepare("UPDATE photo SET verdict='refused', why=? WHERE id=?").bind(seen.why, p.id).run() }
  }
  await env.DB.prepare('DELETE FROM quota WHERE day < ?').bind(new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10)).run()
}

// ---- small helpers -----------------------------------------------------------------

function sameOrigin(request, url) {
  const o = request.headers.get('origin')
  return !o || o === url.origin
}
async function body(request) {
  try { return await request.json() } catch { return {} }
}
export function rand(n) {
  const a = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const b = crypto.getRandomValues(new Uint8Array(n))
  let s = ''
  for (const x of b) s += a[x % 36]
  return s
}
export async function sha(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('')
}
async function sender(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'local'
  return sha((env.SESSION_SECRET || 'dev') + '|' + ip)
}
async function take(env, who, what) {
  const day = new Date().toISOString().slice(0, 10)
  const r = await env.DB.prepare('INSERT INTO quota (who, day, what, n) VALUES (?,?,?,1) ON CONFLICT(who, day, what) DO UPDATE SET n = n + 1 RETURNING n')
    .bind(who.slice(0, 16), day, what).first()
  return (r?.n || 1) <= QUOTA[what]
}
async function log(env, id, what, note) {
  await env.DB.prepare('INSERT INTO event (at, site_id, what, note) VALUES (?,?,?,?)').bind(new Date().toISOString(), id, what, String(note || '').slice(0, 300)).run()
}
