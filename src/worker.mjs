// worker.mjs — sites.motdang.net: people's own pages on Mot Dang.
//
//   /                     why make one, with live examples      /make     the builder
//   /all                  every page                            /random   a page at random
//   /name                 the page    /name/sign  a printable sign    /name/contact.vcf    /name/event.ics
//   /map                  a page's drawn map (motdang.net's doodle-map engine)
//   /feed.json            every live page as data, for motdang.net (search, place pages, maps)
//   /api/…                the builder's and the pages' calls    /img/…  photos    /s/…  static files
//   /admin                held and reported pages, Gold slips
//   /name/calendar.ics    the page's calendar to follow    /name/l/<id>  a listing    /name/room/<id>.ics  a room's taken nights
//   yourshop.com/         a Gold page at its own address (Cloudflare for SaaS, domain.mjs)
//   /vendor/ /fonts/ /tiles/ /data/ /front/ /sites/doodle-map/   read from motdang.net, so a page asks one host
//
// motdang.net/~… (the first address, 2026-10-12) answers with a redirect here.
// The edit link is the sign-in: a long random token, stored only as its hash.

import { render, normalize, vcard, ics, sign, KINDS, LOOK_IDS, GOLD_LOOKS, MAX_PHOTOS, sceneOf, HOME } from '../public/s/render.mjs'
import { PAGE_LANGS } from '../public/s/words.mjs'
import { nameProblem, screen } from './screen.mjs'
import { clean, look, typeOf, MAX_BIG, MAX_SMALL } from './photo.mjs'
import { directory, notFound, adminPage } from './pages.mjs'
import * as stats from './stats.mjs'
import * as msg from './msg.mjs'
import * as pd from './pd.mjs'
import * as gold from './gold.mjs'
import { mapPage } from './mappage.mjs'
import * as book from './book.mjs'
import * as tr from './tr.mjs'
import * as dom from './domain.mjs'
import { tellBeer } from './line.mjs'
import { readCalendars, monthly, trialNotes } from './cron.mjs'
import { calIcs, roomIcs, addDays } from '../public/s/extras.mjs'
import { guestPage } from './guest.mjs'

const QUOTA = { site: 3, photo: 200, save: 400, report: 20, msg: 12, pd: 200, notify: 3, slip: 10, book: 10, domain: 6 }
const TRIAL_DAYS = 30 // Nan 2026-10-14: a new page is Gold for its first 30 days
const MAIN = 'https://motdang.net'
const PASS = /^\/(vendor|fonts|tiles|data|front)\/|^\/sites\/doodle-map\//

export default {
  async fetch(request, env, ctx) {
    try { return await route(request, env, ctx) } catch (e) {
      console.error(e?.stack || e)
      return new Response('Something went wrong. Please try again.', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } })
    }
  },
  async scheduled(_ev, env, ctx) { ctx.waitUntil(tidy(env)) },
}

/** The address pages live under: sites.motdang.net, or the local dev server. */
const homeOf = (url, env) => env.DEV_ORIGIN || (/^(localhost|127\.0\.0\.1)$/.test(url.hostname) ? url.origin : HOME)

async function route(request, env, ctx) {
  const url = new URL(request.url)
  const path = decodeURIComponent(url.pathname)
  const m = request.method
  const origin = homeOf(url, env)

  // a Gold page at its own address: the page's paths without its name
  const host = url.hostname.toLowerCase()
  if (!env.DEV_ORIGIN && !/(^|\.)motdang\.net$|^(localhost|127\.0\.0\.1)$|\.workers\.dev$/.test(host)) {
    const sub = /^\/(sign|contact\.vcf|event\.ics|calendar\.ics|l\/[a-z0-9]{4,12}|room\/[a-z0-9]{4,12}\.ics)?\/?$/.exec(path)
    if (sub && m === 'GET') {
      const own = await env.DB.prepare('SELECT name, tier, gold_until FROM site WHERE domain = ? OR domain = ?').bind(host, host.replace(/^www\./, '')).first()
      if (!own || !gold.isGold(own)) return html(notFound(null, request), 404)
      return page(request, env, ctx, own.name, sub[1] ? '/' + sub[1] : '', url, origin, `https://${host}`)
    }
  }

  // the first address: motdang.net/~name, /~/make, /~/ …
  if (path === '/~' || path.startsWith('/~')) {
    const rest = path === '/~' || path === '/~/' ? '/all' : path.startsWith('/~/') ? '/' + path.slice(3) : '/' + path.slice(2)
    return new Response(null, { status: 301, headers: { location: origin + rest.replace(/^\/make\/$/, '/make') + url.search, 'cache-control': 'public, max-age=86400' } })
  }
  if (!env.DEV_ORIGIN && (url.hostname === 'motdang.net' || url.hostname === 'www.motdang.net')) return new Response('', { status: 404 })

  if (PASS.test(path) && (m === 'GET' || m === 'HEAD')) return passThrough(request, env, url)
  if (path === '/' || path === '/index.html') return asset(request, env, '/s/home.html', 'home')
  if (path === '/make' || path === '/make/') return asset(request, env, '/s/make.html', 'make')
  if (path.startsWith('/s/')) return asset(request, env, path)
  if (path.startsWith('/img/')) return image(env, path.slice(5))
  if (path.startsWith('/api/')) return api(request, env, ctx, path.slice(5), url, origin)
  if (path === '/all' || path === '/all/') return html(await directory(env, url, request, origin), 200, { cache: 'public, max-age=120' })
  if (path === '/random') {
    const r = await env.DB.prepare("SELECT name FROM site WHERE status='live' ORDER BY random() LIMIT 1").first()
    return Response.redirect(origin + (r ? '/' + r.name : '/all'), 302)
  }
  if (path === '/map') {
    const nonce = rand(16)
    const body = mapPage(url, nonce, (request.headers.get('accept-language') || '').slice(0, 2))
    return body ? html(body, 200, { nonce, map: true, cache: 'public, max-age=3600' }) : new Response('', { status: 400 })
  }
  if (path === '/feed.json') return feed(env, origin)
  const gb = /^\/bk\/([a-z0-9]{14})$/.exec(path)
  if (gb && m === 'GET') {
    const bk = await env.DB.prepare('SELECT * FROM booking WHERE id = ?').bind(gb[1]).first()
    const s = bk && await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(bk.site_id).first()
    if (!bk || !s) return html(notFound(null, request), 404)
    const nonce = rand(16)
    return html(guestPage(bk, s, origin, nonce), 200, { nonce })
  }
  if (path === '/robots.txt') return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /make\nDisallow: /admin\nSitemap: ${origin}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain' } })
  if (path === '/sitemap.xml') return sitemap(env, origin)
  if (path === '/favicon.ico') return asset(request, env, '/s/ant.svg')
  if (path === '/admin' || path.startsWith('/admin/')) return admin(request, env, path.slice(6), url)

  const pm = /^\/([a-z0-9-]{3,30})(\/sign|\/contact\.vcf|\/event\.ics|\/calendar\.ics|\/l\/[a-z0-9]{4,12}|\/room\/[a-z0-9]{4,12}\.ics)?\/?$/.exec(path)
  if (pm && m === 'GET') return page(request, env, ctx, pm[1], pm[2] || '', url, origin)
  return html(notFound(null, request), 404)
}

async function passThrough(request, env, url) {
  const h = new Headers()
  for (const k of ['user-agent', 'accept', 'accept-language', 'accept-encoding', 'range', 'if-none-match', 'if-modified-since', 'sec-fetch-mode', 'sec-fetch-dest', 'sec-fetch-site'])
    if (request.headers.get(k)) h.set(k, request.headers.get(k))
  const to = new Request((env.DEV_PROXY || MAIN) + url.pathname + url.search, { method: request.method, headers: h })
  const r = env.SITE && !env.DEV_PROXY ? await env.SITE.fetch(to) : await fetch(to, { cf: { cacheEverything: true, cacheTtl: 3600 } })
  const out = new Headers(r.headers)
  out.delete('set-cookie')
  out.set('access-control-allow-origin', '*')
  return new Response(r.body, { status: r.status, headers: out })
}

// ---- pages ---------------------------------------------------------------------

async function page(request, env, ctx, name, sub, url, origin, base) {
  const s = await env.DB.prepare('SELECT * FROM site WHERE name = ?').bind(name).first()
  if (!s || s.status === 'removed' || s.status === 'draft') return html(notFound(s ? null : name, request, s?.status), s?.status === 'removed' ? 410 : 404)
  const site = { ...s, d: JSON.parse(s.d), tier: gold.isGold(s) ? 'gold' : 'free' }
  if (sub === '/contact.vcf') {
    if (s.status !== 'live') return new Response('', { status: 404 })
    return new Response(vcard(site), { headers: { 'content-type': 'text/vcard; charset=utf-8', 'content-disposition': `attachment; filename="${name}.vcf"` } })
  }
  if (sub === '/event.ics') {
    const body = s.status === 'live' && ics(site)
    if (!body) return new Response('', { status: 404 })
    return new Response(body, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': `attachment; filename="${name}.ics"` } })
  }
  if (sub === '/calendar.ics') {
    const d = normalize(site.d)
    const only = url.searchParams.get('only')
    const cal = only ? d.cal.filter((x) => x.id === only) : d.cal
    if (s.status !== 'live' || !cal.length) return new Response('', { status: 404 })
    return new Response(calIcs(name, d.name || name, cal, d.hours.tz, d.place.addr), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'public, max-age=600', ...(only ? { 'content-disposition': `attachment; filename="${name}-${only}.ics"` } : {}) } })
  }
  if (sub.startsWith('/room/')) {
    const d = normalize(site.d)
    const room = d.rooms.find((x) => x.id === sub.slice(6, -4))
    if (s.status !== 'live' || site.tier !== 'gold' || !room) return new Response('', { status: 404 })
    const b = (await env.DB.prepare("SELECT start, end FROM booking WHERE site_id = ? AND kind = 'room' AND item = ? AND status IN ('new','ok','hold') AND end >= ?").bind(s.id, room.id, new Date(Date.now() - 864e5).toISOString().slice(0, 10)).all()).results
    const nights = new Set()
    for (const x of b) for (let dd = x.start; dd < x.end; dd = new Date(Date.parse(dd) + 864e5).toISOString().slice(0, 10)) nights.add(dd)
    return new Response(roomIcs(name, room, nights), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'no-cache' } })
  }
  const nonce = rand(16)
  if (sub === '/sign') {
    if (s.status !== 'live') return html(notFound(null, request), 404)
    return html(sign(site, { nonce }), 200, { nonce })
  }
  if (s.status === 'live') {
    ctx.waitUntil((async () => {
      const person = await stats.view(env, request, s, origin, env.SESSION_SECRET || 'dev')
      if (person) await env.DB.prepare('UPDATE site SET views = views + 1 WHERE id = ?').bind(s.id).run()
    })().catch((e) => console.error(e)))
    site.views = s.views + 1
  }
  const opt = { origin, nonce, ...(base ? { base } : {}) }
  if (sub.startsWith('/l/')) {
    const id = sub.slice(3)
    if (site.tier !== 'gold' || !normalize(site.d).lists.some((x) => x.id === id)) return html(notFound(null, request), 404)
    opt.listing = id
  }
  if (site.tier === 'gold' && s.status === 'live') {
    const d = normalize(site.d)
    opt.langs = await tr.langsOf(env, s, d)
    const hl = url.searchParams.get('hl') || ''
    if (hl && hl !== s.lang && opt.langs.includes(hl)) {
      const td = await tr.read(env, s, d, hl)
      if (td) return html(render({ ...site, lang: hl, d: td }, { ...opt, hl, home: s.lang }), 200, { nonce })
    }
  }
  return html(render(site, opt), 200, { nonce })
}

const CSP_PAGE = (nonce) => `default-src 'self'; img-src 'self' data: blob: https://i.ytimg.com; style-src 'self' 'unsafe-inline'; font-src 'self'; ` +
  `script-src 'self'${nonce ? ` 'nonce-${nonce}'` : ''} https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; worker-src 'self' blob:; child-src 'self' blob:; ` +
  `frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com; frame-ancestors 'self'; base-uri 'none'; form-action 'self'`
const CSP_MAP = (nonce) => `default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://motdang.net; font-src 'self' https://fonts.gstatic.com https://motdang.net; ` +
  `script-src 'self' 'nonce-${nonce}' https://motdang.net; connect-src 'self' https://motdang.net https://mot-dang-claims.nanobotco.workers.dev; worker-src 'self' blob:; frame-ancestors 'self'; base-uri https://motdang.net`
const CSP_TOOL = `default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://motdang.net; font-src 'self'; script-src 'self' https://motdang.net https://static.cloudflareinsights.com; ` +
  `connect-src 'self' https://motdang.net https://cloudflareinsights.com; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com; frame-ancestors 'self'; base-uri 'none'; form-action 'self'`

function html(body, status = 200, { nonce, cache, map } = {}) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': cache || 'no-cache',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'content-security-policy': map ? CSP_MAP(nonce) : CSP_PAGE(nonce),
      'x-robots-tag': 'notranslate',
    },
  })
}

async function asset(request, env, p, kind) {
  const r = await env.ASSETS.fetch(new Request(new URL(p, request.url), { method: 'GET', headers: request.headers }))
  if (!kind || !r.ok) return r
  const h = new Headers(r.headers)
  h.set('cache-control', 'no-cache')
  h.set('content-security-policy', CSP_TOOL)
  h.append('x-robots-tag', 'notranslate')
  return new Response(r.body, { status: r.status, headers: h })
}

async function image(env, rest) {
  const id = /^([a-z0-9]{12,24})(-s)?\.(webp|jpg|png)$/.exec(rest)
  if (!id) return new Response('', { status: 404 })
  const obj = (await env.MEDIA.get(`p/${id[1]}${id[2] || ''}`)) || (id[2] ? await env.MEDIA.get(`p/${id[1]}`) : null)
  if (!obj || obj.customMetadata?.v !== 'ok') return new Response('', { status: 404, headers: { 'cache-control': 'no-cache' } })
  return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType || 'image/webp', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff', 'access-control-allow-origin': '*' } })
}

// ---- the feed and the search motdang.net reads ---------------------------------------

/** A live page as data, for motdang.net. */
function asData(r, origin) {
  const d = normalize(JSON.parse(r.d))
  const im = (id, small) => `${origin}/img/${id}${small ? '-s' : ''}.webp`
  const g = gold.isGold(r)
  return {
    name: r.name, url: `${origin}/${r.name}`, kind: r.kind, tier: g ? 'gold' : 'free', title: d.name || r.name, tagline: d.tagline, about: d.about, lang: r.lang,
    cc: d.place.cc || null, lat: d.place.lat, lng: d.place.lng, addr: d.place.addr, hours: d.hours.on ? { on: true, always: d.hours.always, tz: d.hours.tz, week: d.hours.week } : null,
    phone: d.contact.phone, line: d.contact.line, web: d.contact.web, facebook: d.contact.facebook, instagram: d.contact.instagram,
    items: d.items, currency: d.currency, cover: d.cover ? im(d.cover) : '',
    photos: d.photos.slice(0, g ? MAX_PHOTOS.gold : MAX_PHOTOS.free).map((id) => ({ url: im(id), small: im(id, true), credit: d.credits[id] || null })),
    event: d.event, scene: d.drawing ? sceneOf(r.kind, d) : '', published: r.published, updated: r.updated,
    rooms: g ? d.rooms.map((x) => ({ n: x.n, p: x.p, guests: x.guests, units: x.units })) : [], book: g && d.rooms.length ? `${origin}/${r.name}#rooms` : '',
  }
}

async function feed(env, origin) {
  // reports: how many readers have reported the page. Mot Dang admits a pin with no record only at 0 (importers/own_pages.py).
  const rows = (await env.DB.prepare("SELECT *, (SELECT COUNT(*) FROM report WHERE report.site_id = site.id) AS reports FROM site WHERE status='live' ORDER BY published DESC LIMIT 5000").all()).results
  return new Response(JSON.stringify({ generated: new Date().toISOString(), pages: rows.map((r) => ({ ...asData(r, origin), reports: Number(r.reports) || 0 })) }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*' },
  })
}

/** Search over live pages: every word must appear; Gold first, then the nearest. */
async function find(env, url, origin) {
  const q = String(url.searchParams.get('q') || '').toLowerCase().trim().slice(0, 80)
  const words = q.split(/\s+/).filter((w) => w.length >= 2).slice(0, 6)
  if (!words.length) return []
  const where = words.map(() => "(lower(d) LIKE ? OR name LIKE ?)").join(' AND ')
  const args = words.flatMap((w) => ['%' + w.replace(/[%_]/g, '') + '%', '%' + w.replace(/[%_]/g, '') + '%'])
  const rows = (await env.DB.prepare(`SELECT * FROM site WHERE status='live' AND ${where} LIMIT 60`).bind(...args).all()).results
  const lat = Number(url.searchParams.get('lat')), lng = Number(url.searchParams.get('lng'))
  const near = Number.isFinite(lat) && Number.isFinite(lng) && url.searchParams.get('lat')
  return rows.map((r) => {
    const x = asData(r, origin)
    let score = (x.tier === 'gold' ? 50 : 0) + (x.title.toLowerCase().includes(q) ? 30 : 0)
    if (near && x.lat !== null) score += Math.max(0, 20 - Math.hypot(x.lat - lat, x.lng - lng) * 100)
    return { ...x, score: Math.round(score) }
  }).sort((a, b) => b.score - a.score).slice(0, 10)
}

async function sitemap(env, origin) {
  const rows = (await env.DB.prepare("SELECT name, updated, tier, gold_until FROM site WHERE status='live'").all()).results.filter((r) => gold.isGold(r))
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url>` +
    rows.map((r) => `<url><loc>${origin}/${r.name}</loc><lastmod>${r.updated.slice(0, 10)}</lastmod></url>`).join('') + '</urlset>'
  return new Response(body, { headers: { 'content-type': 'application/xml', 'cache-control': 'public, max-age=3600' } })
}

// ---- api -----------------------------------------------------------------------

const J = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } })

async function api(request, env, ctx, p, url, origin) {
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

  if (p === 'count' && m === 'GET') {
    const r = await env.DB.prepare("SELECT COUNT(*) AS n, COUNT(DISTINCT cc) AS cc FROM site WHERE status='live'").first()
    const g = await env.DB.prepare("SELECT COUNT(*) AS n FROM site WHERE status='live' AND tier='gold'").first()
    const latest = (await env.DB.prepare("SELECT name, kind, look, d, tier, gold_until FROM site WHERE status='live' ORDER BY published DESC LIMIT 12").all()).results
      .map((r) => { const d = JSON.parse(r.d); return { name: r.name, kind: r.kind, look: r.look, title: d.name || r.name, tagline: d.tagline || '', cover: d.cover ? `/img/${d.cover}-s.webp` : '', gold: gold.isGold(r) } })
    return J({ live: r?.n || 0, countries: r?.cc || 0, gold: g?.n || 0, latest, price: Number(env.GOLD_THB) || gold.GOLD_THB }, 200, { 'cache-control': 'public, max-age=120' })
  }

  if (p === 'find' && m === 'GET') return J({ results: await find(env, url, origin) }, 200, { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=60' })

  if (p === 'hit' && m === 'POST') {
    const b = await body(request)
    const s = await env.DB.prepare("SELECT id FROM site WHERE name = ? AND status = 'live'").bind(String(b.n || '')).first()
    if (s) ctx.waitUntil(stats.tap(env, request, s.id, String(b.k || '')))
    return new Response(null, { status: 204 })
  }

  // bookings: free times, taken nights, an ask, a booked time's calendar file
  if ((p === 'slots' || p === 'nights') && m === 'GET') {
    const s = await env.DB.prepare("SELECT * FROM site WHERE name = ? AND status = 'live'").bind(String(url.searchParams.get('n') || '')).first()
    if (!s || !gold.isGold(s)) return J({ error: 'not-found' }, 404)
    const d = normalize(JSON.parse(s.d))
    if (p === 'slots') return J({ times: await book.freeTimes(env, s, d, String(url.searchParams.get('svc') || ''), String(url.searchParams.get('day') || '')) })
    const room = String(url.searchParams.get('room') || '')
    if (!d.rooms.some((x) => x.id === room)) return J({ error: 'not-found' }, 404)
    const units = d.rooms.find((x) => x.id === room).units
    const counts = await book.nightCounts(env, s, d, room)
    return J({ taken: [...counts].filter(([, c]) => c >= units).map(([k]) => k).sort(), left: Object.fromEntries([...counts].filter(([, c]) => c < units).map(([k, c]) => [k, units - c])), units })
  }
  if (p === 'book' && m === 'POST') {
    const b = await body(request)
    if (b.website || Number(b.ms) < 2500) return J({ ok: true, status: 'new' })
    const who = await sender(request, env)
    if (!(await take(env, who, 'book'))) return J({ error: 'quota' }, 429)
    const s = await env.DB.prepare("SELECT * FROM site WHERE name = ? AND status = 'live'").bind(String(b.n || '')).first()
    if (!s || !gold.isGold(s)) return J({ error: 'not-found' }, 404)
    const d = normalize(JSON.parse(s.d))
    const r = await book.ask(env, s, d, b, who)
    if (r.error) return J(r, r.error === 'taken' ? 409 : 400)
    ctx.waitUntil(stats.tap(env, request, s.id, b.kind === 'room' ? 'rooms' : 'book'))
    ctx.waitUntil((async () => {
      const bk = await env.DB.prepare('SELECT * FROM booking WHERE id = ?').bind(r.id).first()
      await book.tellMaker(env, s, d, bk, origin)
      await book.tellReader(env, s, d, bk, origin, s.lang)
      await log(env, s.id, 'booking', `${bk.kind} ${bk.item} ${bk.start}`)
    })().catch((e) => console.error(e)))
    return J({ ok: true, status: r.status, deposit: r.deposit, ref: r.ref, total: r.total, link: r.link || '', due: r.due || 0, page: r.ref && b.kind === 'room' ? `${origin}/bk/${r.id}` : '' })
  }
  const bkCx = /^bk\/([a-z0-9]{14})\/cancel$/.exec(p)
  if (bkCx && m === 'POST') {
    const bk = await env.DB.prepare("SELECT * FROM booking WHERE id = ? AND status IN ('new','ok')").bind(bkCx[1]).first()
    if (bk) {
      await env.DB.prepare("UPDATE booking SET status = 'gone' WHERE id = ?").bind(bk.id).run()
      const s = await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(bk.site_id).first()
      if (s) {
        await log(env, s.id, 'booking-cancel', bk.ref || bk.id)
        ctx.waitUntil(book.tellMaker(env, s, normalize(JSON.parse(s.d)), { ...bk, status: 'gone' }, origin).catch((e) => console.error(e)))
      }
    }
    return Response.redirect(origin + '/bk/' + bkCx[1], 303)
  }
  const bkIcs = /^bk\/([a-z0-9]{14})\.ics$/.exec(p)
  if (bkIcs && m === 'GET') {
    const bk = await env.DB.prepare("SELECT * FROM booking WHERE id = ? AND status = 'ok'").bind(bkIcs[1]).first()
    const s = bk && await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(bk.site_id).first()
    if (!bk || !s) return new Response('', { status: 404 })
    return new Response(book.bookingIcs(bk, normalize(JSON.parse(s.d)), s), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': `attachment; filename="${s.name}.ics"` } })
  }

  if (p === 'msg' && m === 'POST') {
    const b = await body(request)
    if (b.website || Number(b.ms) < 2500) return J({ ok: true }) // a form filled by a script
    const who = await sender(request, env)
    if (!(await take(env, who, 'msg'))) return J({ error: 'quota' }, 429)
    const s = await env.DB.prepare("SELECT id, name, d, notify_email, notify_ok FROM site WHERE name = ? AND status = 'live'").bind(String(b.n || '')).first()
    const mm = msg.clean(b)
    if (!s || !mm) return J({ error: 'empty' }, 400)
    if (JSON.parse(s.d).msg === false) return J({ error: 'off' }, 400)
    const verdict = msg.check(mm)
    const id = rand(14)
    await env.DB.prepare('INSERT INTO msg (id, site_id, at, name, reach, body, status, why, sender) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(id, s.id, new Date().toISOString(), mm.name, mm.reach, mm.body, verdict === 'ok' ? 'new' : 'held', verdict === 'ok' ? null : verdict.slice(5), who.slice(0, 16)).run()
    ctx.waitUntil(stats.tap(env, request, s.id, 'msg'))
    if (verdict === 'ok' && s.notify_ok && s.notify_email) {
      ctx.waitUntil((async () => {
        if (!(await msg.mayMail(env, s.id))) return
        const title = JSON.parse(s.d).name || s.name
        await msg.mail(env, { to: s.notify_email, ...msg.copyOf(mm, s.name, title, origin) })
      })().catch((e) => console.error(e)))
    }
    return J({ ok: true })
  }

  if (p === 'notify/ok' && m === 'GET') {
    const k = url.searchParams.get('k') || ''
    const s = /^[a-z0-9]{24,40}$/.test(k) && await env.DB.prepare('SELECT id, name, d FROM site WHERE notify_key = ?').bind(k).first()
    if (s) await env.DB.prepare('UPDATE site SET notify_ok = 1 WHERE id = ?').bind(s.id).run()
    const title = s ? (JSON.parse(s.d).name || s.name) : ''
    return html(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mot Dang</title>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fff7ec;color:#1c1530;font:18px/1.5 system-ui,sans-serif;text-align:center;padding:20px">
<div><svg viewBox="0 0 24 24" width="80" height="80" style="color:#d7261e"><use href="/s/icons.svg#i-ant-solid"/></svg><h1 style="font-size:28px;margin:10px 0">${s ? 'ยืนยันแล้ว · Confirmed' : 'ลิงก์นี้ใช้ไม่ได้ · This link does not work'}</h1>
${s ? `<p>ข้อความถึง ${escHtml(title)} จะส่งสำเนาไปที่อีเมลนี้<br>A copy of each message to ${escHtml(title)} comes to this email.</p>` : ''}<p><a href="/make" style="color:#1c1530;font-weight:700">sites.motdang.net/make</a></p></div>`)
  }

  if (p === 'sites' && m === 'POST') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'site'))) return J({ error: 'quota' }, 429)
    const b = await body(request)
    const name = String(b.name || '').toLowerCase()
    const why = nameProblem(name)
    if (why) return J({ error: 'name', why }, 400)
    const kind = KINDS.includes(b.kind) ? b.kind : 'shop'
    const lookId = LOOK_IDS.includes(b.look) ? b.look : 'poster' // every new page starts in its Gold days
    const lang = PAGE_LANGS[b.lang] ? b.lang : 'th'
    const d = normalize(b.d || {})
    const token = rand(32)
    const id = rand(12)
    const now = new Date().toISOString()
    try {
      const until = new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString().slice(0, 10)
      await env.DB.prepare("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, cc, lat, lng, sender, created, updated, tier, gold_until, trial) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'gold',?,1)")
        .bind(id, name, await sha(token), 'draft', kind, lookId, lang, JSON.stringify(d), d.place.cc || null, d.place.lat, d.place.lng, who.slice(0, 16), now, now, until).run()
    } catch (e) {
      if (/UNIQUE/i.test(String(e))) return J({ error: 'name', why: 'taken' }, 409)
      throw e
    }
    await log(env, id, 'create', name)
    return J({ id, name, token, status: 'draft', tier: 'gold', gold_until: new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString().slice(0, 10), trial: true })
  }

  // Everything below needs the edit link.
  const token = request.headers.get('x-edit') || ''
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return api2(request, env, p, url)
  const s = await env.DB.prepare('SELECT * FROM site WHERE edit_hash = ?').bind(await sha(token)).first()
  if (!s || s.status === 'removed') return J({ error: 'edit-link' }, 403)
  const isGold = gold.isGold(s)

  if (p === 'site' && m === 'GET') {
    const un = await env.DB.prepare("SELECT COUNT(*) AS n FROM msg WHERE site_id = ? AND status = 'new'").bind(s.id).first()
    return J({ id: s.id, name: s.name, status: s.status, kind: s.kind, look: s.look, lang: s.lang, d: JSON.parse(s.d), views: s.views,
      tier: isGold ? 'gold' : 'free', gold_until: s.gold_until, trial: !!s.trial, notify_email: s.notify_email || '', notify_ok: !!s.notify_ok, unread: un?.n || 0,
      asks: (await env.DB.prepare("SELECT COUNT(*) AS n FROM booking WHERE site_id = ? AND status = 'new'").bind(s.id).first())?.n || 0,
      domain: s.domain || '', domain_state: s.domain_state || '', domains: dom.on(env), price: Number(env.GOLD_THB) || gold.GOLD_THB })
  }

  if (p === 'site' && m === 'PUT') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'save'))) return J({ error: 'quota' }, 429)
    const b = await body(request)
    const d = normalize(b.d || JSON.parse(s.d))
    const kind = KINDS.includes(b.kind) ? b.kind : s.kind
    const lookId = LOOK_IDS.includes(b.look) && (isGold || !GOLD_LOOKS.includes(b.look)) ? b.look : (LOOK_IDS.includes(b.look) ? s.look : s.look)
    const lang = PAGE_LANGS[b.lang] ? b.lang : s.lang
    let name = s.name
    if (b.name && b.name !== s.name) {
      name = String(b.name).toLowerCase()
      const why = nameProblem(name)
      if (why) return J({ error: 'name', why }, 400)
    }
    if (!isGold) d.photos = d.photos.slice(0, MAX_PHOTOS.free)
    // photos named in the page must be this page's own; credits come from the library, not the browser
    const ids = [...new Set([d.cover, d.card, d.place.snap, ...d.photos].filter(Boolean))]
    d.credits = {}
    if (ids.length) {
      const own = await env.DB.prepare(`SELECT id, credit FROM photo WHERE site_id = ? AND id IN (${ids.map(() => '?').join(',')})`).bind(s.id, ...ids).all()
      const ok = new Map(own.results.map((r) => [r.id, r.credit]))
      if (!ok.has(d.cover)) d.cover = ''
      if (!ok.has(d.card)) d.card = ''
      if (!ok.has(d.place.snap)) d.place.snap = ''
      d.photos = d.photos.filter((x) => ok.has(x))
      for (const [id, c] of ok) if (c) { try { d.credits[id] = JSON.parse(c) } catch {} }
    }
    const pool = new Set(d.photos)
    for (const x of [...(d.rooms || []), ...(d.lists || [])]) if (Array.isArray(x.photos)) x.photos = x.photos.filter((id) => pool.has(id))
    const nd = normalize(d)
    let status = s.status, held = null
    const publish = b.publish === true || s.status !== 'draft'
    if (publish) {
      const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM site WHERE sender = ? AND status != 'removed' AND id != ?").bind(s.sender, s.id).first()
      const r = await screen(env.AI, nd, { sameSender: n?.n || 0 })
      const modelOnly = r.decision === 'held' && r.reasons.every((x) => x.startsWith('guard:guard-'))
      if (s.status === 'held' && s.held_why?.startsWith('admin')) status = 'held'
      else if (modelOnly && s.status === 'live') status = 'live'
      else status = r.decision
      held = r.decision === 'held' ? r.reasons.join(' ') : null
    }
    const now = new Date().toISOString()
    try {
      await env.DB.prepare('UPDATE site SET name=?, kind=?, look=?, lang=?, d=?, cc=?, lat=?, lng=?, status=?, held_why=?, updated=?, published=COALESCE(published, ?) WHERE id=?')
        .bind(name, kind, lookId, lang, JSON.stringify(nd), nd.place.cc || null, nd.place.lat, nd.place.lng, status,
          status === 'held' ? (s.held_why?.startsWith('admin') ? s.held_why : held) : null, now, status === 'live' ? now : null, s.id).run()
    } catch (e) {
      if (/UNIQUE/i.test(String(e))) return J({ error: 'name', why: 'taken' }, 409)
      throw e
    }
    if (status !== s.status) await log(env, s.id, status, held || '')
    return J({ status, name, d: nd, look: lookId })
  }

  if (p === 'site' && m === 'DELETE') {
    const ph = await env.DB.prepare('SELECT id FROM photo WHERE site_id = ?').bind(s.id).all()
    for (const r of ph.results) await env.MEDIA.delete([`p/${r.id}`, `p/${r.id}-s`])
    await env.DB.batch([
      env.DB.prepare('DELETE FROM photo WHERE site_id = ?').bind(s.id),
      env.DB.prepare('DELETE FROM msg WHERE site_id = ?').bind(s.id),
      env.DB.prepare("UPDATE site SET status='removed', name = name || '~' || id, d='{}', notify_email=NULL, notify_ok=0, updated=? WHERE id = ?").bind(new Date().toISOString(), s.id),
    ])
    await log(env, s.id, 'deleted-by-maker', s.name)
    return J({ ok: true })
  }

  if (p === 'photo' && m === 'POST') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'photo'))) return J({ error: 'quota' }, 429)
    const have = await env.DB.prepare('SELECT COUNT(*) AS n FROM photo WHERE site_id = ?').bind(s.id).first()
    if ((have?.n || 0) >= (isGold ? MAX_PHOTOS.gold : MAX_PHOTOS.free) * 2 + 10) return J({ error: 'too-many' }, 400)
    const form = await request.formData()
    const role = ['photo', 'map', 'card'].includes(form.get('role')) ? form.get('role') : 'photo'
    const big = clean(await form.get('big')?.arrayBuffer?.() ?? new ArrayBuffer(0), MAX_BIG)
    const small = form.get('small') ? clean(await form.get('small').arrayBuffer(), MAX_SMALL) : null
    if (big.error) return J({ error: 'photo-' + big.error }, 400)
    if (small?.error) return J({ error: 'photo-' + small.error }, 400)
    let credit = null
    if (form.get('pd')) {
      const pick = await pd.lookup(String(form.get('pd')))
      if (!pick) return J({ error: 'photo-not-free' }, 400)
      delete pick.big
      credit = JSON.stringify(pick)
    }
    const seen = await look(env.AI, (small || big).bytes, (small || big).kind)
    const id = rand(16)
    await log(env, s.id, 'photo-' + seen.verdict, `${role}${credit ? ' pd' : ''} ${seen.why} ${seen.what || ''}`.trim())
    if (seen.verdict === 'refuse') return J({ error: 'photo-refused' }, 422)
    const meta = { v: seen.verdict === 'ok' ? 'ok' : 'hold' }
    await env.MEDIA.put(`p/${id}`, big.bytes, { httpMetadata: { contentType: typeOf(big.kind) }, customMetadata: meta })
    if (small) await env.MEDIA.put(`p/${id}-s`, small.bytes, { httpMetadata: { contentType: typeOf(small.kind) }, customMetadata: meta })
    await env.DB.prepare('INSERT INTO photo (id, site_id, ext, bytes, w, h, role, verdict, why, created, credit) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, s.id, big.kind, big.bytes.length, Number(form.get('w')) || null, Number(form.get('h')) || null, role, meta.v, seen.why || null, new Date().toISOString(), credit).run()
    return J({ id, held: meta.v !== 'ok', credit: credit ? JSON.parse(credit) : null })
  }

  if (p === 'pd' && m === 'GET') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'pd'))) return J({ error: 'quota' }, 429)
    return J({ results: await pd.search(url.searchParams.get('q')) })
  }

  if (p === 'pd/raw' && m === 'GET') {
    const r = await pd.take(url.searchParams.get('id'))
    if (r.error) return J({ error: r.error }, 400)
    return new Response(r.bytes, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' } })
  }

  if (p === 'stats' && m === 'GET') {
    const days = isGold ? Math.min(365, Math.max(7, Number(url.searchParams.get('days')) || 30)) : 30
    return J({ ...(await stats.report(env, s.id, days)), gold: isGold, views: s.views })
  }
  if (p === 'stats.csv' && m === 'GET') {
    if (!isGold) return J({ error: 'gold' }, 402)
    return new Response(await stats.csv(env, s.id, 365), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${s.name}-traffic.csv"` } })
  }

  if (p === 'msgs' && m === 'GET') {
    const rows = (await env.DB.prepare("SELECT id, at, name, reach, body, status FROM msg WHERE site_id = ? AND status != 'gone' ORDER BY at DESC LIMIT 300").bind(s.id).all()).results
    return J({ msgs: rows })
  }
  if (p === 'msgs' && m === 'POST') {
    const b = await body(request)
    const st = { read: 'read', gone: 'gone', unread: 'new', ok: 'read' }[b.act]
    if (!st) return J({ error: 'act' }, 400)
    if (b.all) await env.DB.prepare("UPDATE msg SET status = ? WHERE site_id = ? AND status = 'new'").bind(st, s.id).run()
    else await env.DB.prepare('UPDATE msg SET status = ? WHERE site_id = ? AND id = ?').bind(st, s.id, String(b.id || '')).run()
    return J({ ok: true })
  }

  if (p === 'notify' && m === 'PUT') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'notify'))) return J({ error: 'quota' }, 429)
    const b = await body(request)
    const email = String(b.email || '').trim().toLowerCase().slice(0, 254)
    if (!/^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,}$/i.test(email)) return J({ error: 'email' }, 400)
    const k = rand(32)
    await env.DB.prepare('UPDATE site SET notify_email = ?, notify_ok = 0, notify_key = ? WHERE id = ?').bind(email, k, s.id).run()
    const title = JSON.parse(s.d).name || s.name
    const sent = await msg.mail(env, { to: email, ...msg.confirmOf(`${origin}/api/notify/ok?k=${k}`, title, origin) })
    return J({ ok: true, sent })
  }
  if (p === 'notify' && m === 'DELETE') {
    await env.DB.prepare('UPDATE site SET notify_email = NULL, notify_ok = 0, notify_key = NULL WHERE id = ?').bind(s.id).run()
    return J({ ok: true })
  }

  if (p === 'bookings' && m === 'GET') {
    const d = normalize(JSON.parse(s.d))
    const rows = (await env.DB.prepare("SELECT * FROM booking WHERE site_id = ? AND (status NOT IN ('gone') OR at >= ?) AND (status = 'new' OR end >= ?) ORDER BY start LIMIT 300").bind(s.id, new Date(Date.now() - 3 * 864e5).toISOString(), new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10)).all()).results
    const blocks = (await env.DB.prepare('SELECT room, COUNT(*) AS n FROM blocks WHERE site_id = ? GROUP BY room').bind(s.id).all()).results
    const reads = (await env.DB.prepare('SELECT room, url, at, ok, nights FROM ical_read WHERE site_id = ?').bind(s.id).all()).results
    return J({ rows: rows.map((r) => ({ ...book.describe(r, d, s.lang), id: r.id, kind: r.kind, item: r.item, start: r.start, end: r.end, people: r.people, name: r.name, reach: r.reach, email: r.email, note: r.note, status: r.status, at: r.at, total: r.total, paid: !!r.paid, ref: r.ref })), blocks, reads })
  }
  if (p === 'bookings' && m === 'POST') {
    const b = await body(request)
    if (b.act === 'paid' || b.act === 'unpaid') {
      await env.DB.prepare('UPDATE booking SET paid = ? WHERE id = ? AND site_id = ?').bind(b.act === 'paid' ? 1 : 0, String(b.id || ''), s.id).run()
      return J({ ok: true })
    }
    if (b.act === 'close') {
      const d = normalize(JSON.parse(s.d))
      const room = d.rooms.find((x) => x.id === b.room)
      const from = String(b.from || ''), to = String(b.to || '')
      if (!room || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to <= from || to > addDays(from, 366)) return J({ error: 'bad' }, 400)
      const id = rand(14)
      await env.DB.prepare("INSERT INTO booking (id, site_id, kind, item, start, end, people, name, note, status, at, ref) VALUES (?,?,'room',?,?,?,1,?,?,'hold',?,?)")
        .bind(id, s.id, room.id, from, to, String(b.name || '').slice(0, 80) || 'Closed', String(b.note || '').slice(0, 300), new Date().toISOString(), 'MD' + id.slice(0, 6).toUpperCase()).run()
      return J({ ok: true, id })
    }
    const st = { ok: 'ok', no: 'no', gone: 'gone', new: 'new', hold: 'hold' }[b.act]
    const bk = st && await env.DB.prepare('SELECT * FROM booking WHERE id = ? AND site_id = ?').bind(String(b.id || ''), s.id).first()
    if (!bk) return J({ error: 'act' }, 400)
    await env.DB.prepare('UPDATE booking SET status = ? WHERE id = ?').bind(st, bk.id).run()
    if ((st === 'ok' || st === 'no') && bk.status !== st) ctx.waitUntil(book.tellReader(env, s, normalize(JSON.parse(s.d)), { ...bk, status: st }, origin, s.lang).catch((e) => console.error(e)))
    return J({ ok: true })
  }

  if (p === 'domain' && (m === 'PUT' || m === 'GET' || m === 'DELETE')) {
    if (!isGold) return J({ error: 'gold' }, 402)
    if (!dom.on(env)) return J({ error: 'off' }, 503)
    if (m === 'GET') {
      if (!s.domain_id) return J({ domain: '' })
      let state = s.domain_state
      try { state = await dom.look(env, s.domain_id) } catch {}
      if (state !== s.domain_state) await env.DB.prepare('UPDATE site SET domain_state = ? WHERE id = ?').bind(state, s.id).run()
      return J({ domain: s.domain, state, records: dom.records(s.domain) })
    }
    if (s.domain_id) await dom.drop(env, s.domain_id)
    if (m === 'DELETE') { await env.DB.prepare('UPDATE site SET domain = NULL, domain_id = NULL, domain_state = NULL WHERE id = ?').bind(s.id).run(); return J({ ok: true }) }
    const who = await sender(request, env)
    if (!(await take(env, who, 'domain'))) return J({ error: 'quota' }, 429)
    const host = dom.clean((await body(request)).domain)
    if (!host) return J({ error: 'domain' }, 400)
    if (await env.DB.prepare('SELECT 1 FROM site WHERE domain = ? AND id != ?').bind(host, s.id).first()) return J({ error: 'taken' }, 409)
    let h
    try { h = await dom.add(env, host) } catch (e) { return J({ error: 'cloudflare', why: String(e.message || e).slice(0, 200) }, 400) }
    await env.DB.prepare('UPDATE site SET domain = ?, domain_id = ?, domain_state = ? WHERE id = ?').bind(host, h.id, h.state, s.id).run()
    await log(env, s.id, 'domain', host)
    return J({ domain: host, state: h.state, records: dom.records(host) })
  }

  if (p === 'gold' && m === 'POST') return J({ ...(await gold.start(env, s.id, rand)), tier: isGold ? 'gold' : 'free', gold_until: s.gold_until })
  if (p === 'gold/slip' && m === 'POST') {
    const who = await sender(request, env)
    if (!(await take(env, who, 'slip'))) return J({ error: 'quota' }, 429)
    const pay = await env.DB.prepare("SELECT * FROM pay WHERE site_id = ? AND status IN ('open','slip') ORDER BY created DESC LIMIT 1").bind(s.id).first()
    if (!pay) return J({ error: 'no-payment' }, 400)
    const form = await request.formData()
    const file = form.get('slip')
    if (!file || typeof file === 'string' || !file.size || file.size > 8_000_000) return J({ error: 'slip' }, 400)
    const now = new Date().toISOString()
    const key = `slip/${pay.id}`
    await env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || 'image/jpeg' }, customMetadata: { v: 'slip' } })
    const r = await gold.checkSlip(env, file, Number(pay.amount))
    if (r.ok) {
      const until = await gold.grant(env, s.id)
      await env.DB.prepare("UPDATE pay SET status='paid', slip=?, note=?, updated=? WHERE id=?").bind(key, 'slipok ' + r.ref, now, pay.id).run()
      await log(env, s.id, 'gold', 'slipok ' + r.ref)
      return J({ ok: true, tier: 'gold', gold_until: until })
    }
    await env.DB.prepare("UPDATE pay SET status='slip', slip=?, note=?, updated=? WHERE id=?").bind(key, r.why, now, pay.id).run()
    await log(env, s.id, 'gold-slip', r.why)
    ctx.waitUntil((async () => {
      const title = JSON.parse(s.d).name || s.name
      const how = await tellBeer(env, `สลิปทองรอดู · A Gold slip waits\n${title} · ฿${pay.amount}\n${origin}/${s.name}\n${origin}/admin`)
      await log(env, s.id, 'slip-told', how)
    })().catch((e) => console.error(e)))
    return J({ ok: true, waiting: true })
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
  const slip = /^\/slip\/([a-z0-9]{12})$/.exec(rest)
  if (slip) {
    const o = await env.MEDIA.get(`slip/${slip[1]}`)
    return o ? new Response(o.body, { headers: { 'content-type': o.httpMetadata?.contentType || 'image/jpeg', 'cache-control': 'no-store' } }) : new Response('', { status: 404 })
  }
  if (request.method === 'POST' && rest === '/run' && sameOrigin(request, url)) return J(await tidy(env))
  if (request.method === 'POST' && rest === '/act' && sameOrigin(request, url)) {
    const f = await request.formData()
    const id = String(f.get('id') || ''), act = String(f.get('act') || '')
    if (act === 'live') await env.DB.prepare("UPDATE site SET status='live', held_why=NULL, published=COALESCE(published, ?) WHERE id=?").bind(new Date().toISOString(), id).run()
    if (act === 'hold') await env.DB.prepare("UPDATE site SET status='held', held_why='admin' WHERE id=?").bind(id).run()
    if (act === 'remove') await env.DB.prepare("UPDATE site SET status='removed' WHERE id=?").bind(id).run()
    if (act === 'photo-ok') await releasePhoto(env, id)
    if (act === 'gold') await gold.grant(env, id)
    if (act === 'pay-ok') {
      const p = await env.DB.prepare('SELECT site_id FROM pay WHERE id = ?').bind(id).first()
      if (p) { await gold.grant(env, p.site_id); await env.DB.prepare("UPDATE pay SET status='paid', note=COALESCE(note,'') || ' · by hand', updated=? WHERE id=?").bind(new Date().toISOString(), id).run() }
    }
    if (act === 'pay-no') await env.DB.prepare("UPDATE pay SET status='refused', updated=? WHERE id=?").bind(new Date().toISOString(), id).run()
    await log(env, id, 'admin-' + act, '')
    return Response.redirect(url.origin + '/admin', 303)
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
  const done = {}
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
  const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)
  await env.DB.prepare('DELETE FROM quota WHERE day < ?').bind(day(3)).run()
  await env.DB.prepare('DELETE FROM seen WHERE day < ?').bind(day(2)).run()
  await env.DB.prepare("DELETE FROM pay WHERE status = 'open' AND created < ?").bind(new Date(Date.now() - 14 * 864e5).toISOString()).run()
  // 2026-10-14: room calendars, translations, the monthly note, the trial's end note
  const job = async (name, f) => { try { done[name] = await f() } catch (e) { done[name] = 'error: ' + String(e?.message || e).slice(0, 300); console.error(name, e?.stack || e) } }
  await job('calendars', () => readCalendars(env, gold.isGold, normalize))
  await job('translate', () => tr.catchUp(env, gold.isGold, normalize))
  await job('monthly', () => monthly(env, gold.isGold, HOME))
  await job('trial', () => trialNotes(env, HOME, Number(env.GOLD_THB) || gold.GOLD_THB))
  await env.DB.prepare("UPDATE site SET trial = 0 WHERE trial = 1 AND gold_until < ?").bind(new Date().toISOString().slice(0, 10)).run()
  return done
}

// ---- small helpers -----------------------------------------------------------------

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])

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
