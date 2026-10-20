// ogcard.mjs — /card/<name>.jpg and /card/<name>/<a|w|l>/<id>.jpg: each page's and each item page's
// own 1200×630 share card (NaN 2026-10-20: "All sites made by me and all 'gold' level sites should
// include unique share cards"), drawn by the card library (the cards Worker, binding CARDS) from the
// page's data and the maker's choices (public/s/og.mjs), and kept in R2 under the card's key. Without
// the library, the item's own photo fitted to the card through the Images binding: a wide photo fills
// it, a tall one (an amulet) sits whole on a blurred copy of itself.

import { normalize } from '../public/s/render.mjs'
import { amCap } from '../public/s/amulet.mjs'
import { ogOf, specOf } from '../public/s/og.mjs'
import { LOOK_IDS } from '../public/s/looks.mjs'
import { isGold } from './gold.mjs'
import { isSian } from './sian.mjs'

const W = 1200, H = 630
const RX = /^([a-z0-9-]{2,40})(?:\/([alw])\/([a-z0-9-]{1,32}))?\.jpg$/

const jpg = (body, age) => new Response(body, { headers: { 'content-type': 'image/jpeg', 'cache-control': `public, max-age=${age}`, 'access-control-allow-origin': '*', 'x-content-type-options': 'nosniff' } })
const none = () => new Response('', { status: 404, headers: { 'cache-control': 'no-cache' } })

/** A page row as the worker reads it for rendering (worker.mjs page()): Gold and Sian as of today. */
const siteOf = (s) => ({ ...s, tier: isGold(s) ? 'gold' : 'free', sian: isSian(s) })

/** The items a page shows, by kind: listings are Gold only, amulets up to the page's cap. */
function itemsOf(site, d, t) {
  const gold = site.tier === 'gold'
  return t === 'l' ? (gold ? d.lists : []) : t === 'w' ? d.works : t === 'a' ? d.amulets.slice(0, amCap(gold, site.sian)) : []
}

/** One card: what it shows and where it is kept. */
function card(site, d, t, x) {
  const o = ogOf(site, d, t, x)
  return { site, d, x, o, base: `og/${site.id}/${t || 'p'}${x ? '-' + x.id : ''}-${o.key}` }
}

/** The page and item a card path names. */
export async function cardOf(env, rest) {
  const m = RX.exec(rest)
  if (!m) return null
  const s = await env.DB.prepare('SELECT * FROM site WHERE name = ?').bind(m[1]).first()
  if (!s || s.status !== 'live') return null
  const site = siteOf(s), d = normalize(JSON.parse(s.d || '{}'))
  if (!m[2]) return card(site, d, '', null)
  const x = itemsOf(site, d, m[2]).find((y) => y.id === m[3])
  return x ? card(site, d, m[2], x) : null
}

export async function serveCard(env, rest, origin) {
  const c = await cardOf(env, rest)
  if (!c) return none()
  const drawn = await env.MEDIA.get(c.base + '.jpg')
  if (drawn) return jpg(drawn.body, 86400)
  if (env.CARDS) {
    try {
      const bytes = await draw(env, specOf(c.o, { img: (id) => `${origin}/img/${id}.webp`, host: new URL(origin).host, lang: c.site.lang }))
      await env.MEDIA.put(c.base + '.jpg', bytes, { httpMetadata: { contentType: 'image/jpeg' } })
      return jpg(bytes, 86400)
    } catch (e) { console.error('card draw', String(e?.message || e)) }
  }
  const cut = await env.MEDIA.get(c.base + '-c.jpg')
  if (cut) return jpg(cut.body, 3600)
  const src = c.o.photo && env.IMAGES?.input ? await env.MEDIA.get(`p/${c.o.photo}`) : null
  if (src && src.customMetadata?.v === 'ok') {
    try {
      const bytes = new Uint8Array(await src.arrayBuffer())
      const out = await fitted(env, bytes)
      await env.MEDIA.put(c.base + '-c.jpg', out, { httpMetadata: { contentType: 'image/jpeg' } })
      return jpg(out, 3600)
    } catch (e) { console.error('card fit', String(e?.message || e)) }
  }
  // no photo of its own: the page's drawn card
  return Response.redirect(c.d.card ? `${origin}/img/${c.d.card}.jpg` : `${origin}/s/card.jpg`, 302)
}

async function fitted(env, bytes) {
  const info = await env.IMAGES.info(new Response(bytes).body)
  const wide = info.width / info.height >= 1.3
  const pic = env.IMAGES.input(new Response(bytes).body)
  let r
  if (wide) r = await pic.transform({ width: W, height: H, fit: 'cover', gravity: 'auto' }).output({ format: 'image/jpeg', quality: 85 })
  else {
    const w = Math.round(info.width * H / info.height)
    const front = env.IMAGES.input(new Response(bytes).body).transform({ height: H, fit: 'scale-down' })
    r = await pic.transform({ width: W, height: H, fit: 'cover', blur: 60, brightness: 0.55 })
      .draw(front, { top: 0, left: Math.max(0, Math.round((W - Math.min(w, W)) / 2)) })
      .output({ format: 'image/jpeg', quality: 85 })
  }
  return new Uint8Array(await r.response().arrayBuffer())
}

/** The card library's drawing of a spec, as JPEG bytes. */
async function draw(env, spec) {
  const r = await env.CARDS.fetch('https://cards/draw', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(spec) })
  if (!r.ok) throw new Error('cards ' + r.status)
  return new Uint8Array(await r.arrayBuffer())
}

/**
 * The builder's preview (POST /api/card): the card as the maker's unsaved page and choices would draw it.
 * b = { d, look, t, id }. Pictures that are not this page's own are left out.
 */
export async function preview(env, s, b, origin) {
  if (!env.CARDS) return new Response('', { status: 503 })
  const d = normalize(b && b.d && typeof b.d === 'object' ? b.d : JSON.parse(s.d || '{}'))
  const site = siteOf({ ...s, look: LOOK_IDS.includes(b?.look) ? b.look : s.look })
  const t = ['a', 'w', 'l'].includes(b?.t) ? b.t : ''
  const x = t ? itemsOf(site, d, t).find((y) => y.id === b.id) || null : null
  if (t && !x) return new Response('', { status: 404 })
  const o = ogOf(site, d, t, x)
  const ids = [o.photo, o.avatar].filter(Boolean)
  const own = ids.length ? new Set((await env.DB.prepare(`SELECT id FROM photo WHERE site_id = ? AND id IN (${ids.map(() => '?').join(',')})`).bind(s.id, ...ids).all()).results.map((r) => r.id)) : new Set()
  if (!own.has(o.photo)) o.photo = ''
  if (!own.has(o.avatar)) o.avatar = ''
  try {
    const bytes = await draw(env, specOf(o, { img: (id) => `${origin}/img/${id}.webp`, host: new URL(origin).host, lang: s.lang }))
    return new Response(bytes, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'no-store' } })
  } catch (e) {
    console.error('card preview', String(e?.message || e))
    return new Response('', { status: 502 })
  }
}
