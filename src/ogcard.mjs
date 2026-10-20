// ogcard.mjs — /card/<name>.jpg and /card/<name>/<a|w|l>/<id>.jpg: each page's and each item page's
// own 1200×630 share card (NaN 2026-10-20: "All sites made by me and all 'gold' level sites should
// include unique share cards"). The drawn card when tools/og-cards.mjs has made one for the current
// key (public/s/og.mjs), else the item's own photo fitted to the card through the Images binding:
// a wide photo fills it, a tall one (an amulet) sits whole on a blurred copy of itself.

import { normalize } from '../public/s/render.mjs'
import { amCap } from '../public/s/amulet.mjs'
import { ogOf } from '../public/s/og.mjs'
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
  // no photo of its own: the page's drawn card until tools/og-cards.mjs draws this one
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

/** For tools/og-cards.mjs (admin): live pages and item pages whose drawn card is missing, `max` at a time. */
export async function todo(env, max = 25) {
  const rows = (await env.DB.prepare("SELECT * FROM site WHERE status = 'live'").all()).results
  const out = []
  let looked = 0
  for (const s of rows) {
    const site = siteOf(s), d = normalize(JSON.parse(s.d || '{}'))
    const cards = d.card ? [] : [card(site, d, '', null)]
    for (const t of ['l', 'w', 'a']) for (const x of itemsOf(site, d, t)) if (!(t === 'w' && x.card)) cards.push(card(site, d, t, x))
    for (const c of cards) {
      if (out.length >= max || looked >= 400) return out // the rest on the next call, inside the subrequest limit
      looked++
      if (!(await env.MEDIA.head(c.base + '.jpg'))) out.push({ ...c.o, path: c.o.path + '.jpg', base: c.base, name: s.name, kind: s.kind })
    }
  }
  return out
}

/** A drawn card, kept under its key; the photo fitted for the same key goes. */
export async function keep(env, base, bytes) {
  if (!/^og\/[a-z0-9]+\/[alwp](-[a-z0-9-]+)?-[a-z0-9]+$/.test(base)) return false
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8)) return false
  await env.MEDIA.put(base + '.jpg', bytes, { httpMetadata: { contentType: 'image/jpeg' } })
  await env.MEDIA.delete(base + '-c.jpg')
  return true
}
