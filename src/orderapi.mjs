// orderapi.mjs — /api/order (a buyer's order, or its quote) and the maker's calls: /api/orders (the tab, the answers,
// the CSV, a slip), /api/dl (the file of a download). The Worker (worker.mjs) hands over its helpers in `deps`.

import { slipHeaders } from './slipfile.mjs'
import { normalize } from '../public/s/render.mjs'
import { isGold } from './gold.mjs'
import * as orders from './orders.mjs'
import * as shipjob from './shipjob.mjs'
import * as dls from './dls.mjs'

const STATUS = { item: 409, stock: 409, gold: 402 }

/** The buyer's fields at the top, whether they came there or inside `buyer`, with the plain names for them: phone or line for reach, address, country. */
function flat(b) {
  const x = { ...(b && typeof b.buyer === 'object' && b.buyer ? b.buyer : {}), ...b }
  x.reach = x.reach || x.phone || x.line || ''
  x.addr = x.addr || x.address || ''
  x.cc = x.cc || x.country || ''
  return x
}

/** POST /api/order: { n (the page's name), lines, name, reach, email, addr, cc, code, note, lang, ms }. quote: true answers the total and saves nothing. */
export async function make(request, env, ctx, origin, deps) {
  const { J, body, take, sender } = deps
  const b = flat(await body(request))
  if (b.website) return J({ ok: true }) // a form filled by a script
  const who = await sender(request, env)
  const s = await env.DB.prepare("SELECT * FROM site WHERE name = ? AND status = 'live'").bind(String(b.n || b.page || '')).first()
  if (!s) return J({ error: 'not-found' }, 404)
  const d = normalize(JSON.parse(s.d || '{}'))
  if (b.quote) {
    if (!(await take(env, who, 'quote'))) return J({ error: 'quota' }, 429)
    const q = orders.quote(d, isGold(s), b)
    return q.error ? J({ error: q.error }, STATUS[q.error] || 400) : J({ ok: true, quote: orders.shown(q) })
  }
  if (Number(b.ms) < 2000) return J({ ok: true })
  if (!(await take(env, who, 'order'))) return J({ error: 'quota' }, 429)
  const r = b.post ? await orders.postHome(env, s, d, b, who, origin, deps) : await orders.create(env, s, d, b, who, origin, deps)
  return r.error ? J({ error: r.error }, STATUS[r.error] || 400) : J({ ok: true, id: r.id, total: r.total, page: r.link })
}

/** The maker's calls, for the page the edit link opens. Null when the path is not one of these. */
export async function owner(request, env, p, url, origin, s, deps) {
  const { J, body, take, sender } = deps
  const m = request.method
  if (p === 'orders' && m === 'GET') {
    const r = await orders.list(env, s, origin, deps)
    return J({ ...r, unread: r.rows.filter((x) => !x.seen).length })
  }
  if (p === 'orders' && m === 'POST') {
    const r = await orders.act(env, s, await body(request), origin, deps)
    return J(r, r.error ? 400 : 200)
  }
  if (p === 'orders.csv' && m === 'GET') {
    const r = await orders.list(env, s, origin, deps)
    return new Response(orders.csv(r.rows), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${s.name}-orders.csv"`, 'cache-control': 'no-store' } })
  }
  if (p === 'orders/slip' && m === 'GET') {
    const o = await env.DB.prepare('SELECT slip FROM orders WHERE id = ? AND site_id = ?').bind(url.searchParams.get('id') || '', s.id).first()
    const f = o?.slip && await env.MEDIA.get(o.slip)
    return f ? new Response(f.body, { headers: slipHeaders(f.httpMetadata?.contentType) }) : new Response('', { status: 404 })
  }
  if (p === 'orders/billslip' && m === 'POST') {
    if (!(await take(env, await sender(request, env), 'slip'))) return J({ error: 'quota' }, 429)
    const r = await shipjob.billSlip(env, s, request, origin, deps)
    return J(r, r.error ? 400 : 200)
  }
  if (p === 'dl' && (m === 'PUT' || m === 'DELETE')) {
    if (!isGold(s)) return J({ error: 'gold' }, 402)
    if (m === 'DELETE') { await dls.drop(env, s, url.searchParams.get('id') || ''); return J({ ok: true }) }
    if (!(await take(env, await sender(request, env), 'dlput'))) return J({ error: 'quota' }, 429)
    const r = await dls.put(env, s, request, url)
    return J(r.error ? { error: r.error } : r, r.status || 200)
  }
  return null
}
