// dls.mjs — the files an online business sells (Nan 2026-10-26): PDF, zip, epub, mp3 or mp4 up to 50 MB, kept private in R2
// under dl/<site id>/<download id>. A buyer's order page offers a file once the maker marked the order Paid: for 7 days
// from then, 5 times. The link is the order's own signed address plus the file (osign.mjs), so it opens nothing else.

import { DL_TYPES, DL_BYTES } from '../public/s/store.mjs'

export const DL_DAYS = 7
export const DL_TIMES = 5
export const dlKey = (siteId, id) => `dl/${siteId}/${id}`

/** The file a maker sends for one download: PUT /api/dl?id=…&name=… with the file as the body. { ok, file } or { error, status }. */
export async function put(env, s, request, url) {
  const id = url.searchParams.get('id') || ''
  const name = String(url.searchParams.get('name') || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120)
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(name)?.[1] || '').toLowerCase()
  if (!/^[a-z0-9]{4,12}$/.test(id) || !name || !DL_TYPES[ext]) return { error: 'type', status: 400 }
  const size = Number(request.headers.get('content-length'))
  if (!(size > 0)) return { error: 'empty', status: 411 }
  if (size > DL_BYTES) return { error: 'big', status: 413 }
  if (!request.body) return { error: 'empty', status: 400 }
  await env.MEDIA.put(dlKey(s.id, id), request.body, { httpMetadata: { contentType: DL_TYPES[ext] }, customMetadata: { v: 'dl', name } })
  return { ok: true, file: { name, ext, size } }
}

/** A download's file taken away (the maker removed it). */
export async function drop(env, s, id) {
  if (/^[a-z0-9]{4,12}$/.test(id)) await env.MEDIA.delete(dlKey(s.id, id))
}

/** Every file of a page, when the page goes. */
export async function dropAll(env, siteId) {
  try {
    const l = await env.MEDIA.list({ prefix: `dl/${siteId}/` })
    if (l.objects?.length) await env.MEDIA.delete(l.objects.map((x) => x.key))
  } catch (e) { console.error('dl drop', e) }
}

/** When the links of a paid order stop, as a time. */
export const endOf = (o) => (o.paid_at ? Date.parse(o.paid_at) + DL_DAYS * 864e5 : 0)

/** How many times each download of an order was fetched: { dlId: n }. */
export async function counts(env, orderId) {
  return Object.fromEntries((await env.DB.prepare('SELECT dl, n FROM order_dl WHERE order_id = ?').bind(orderId).all()).results.map((r) => [r.dl, r.n]))
}

/** The state of one download on an order: ok, wait (not paid yet), ended (7 days gone), used (5 times). */
export function state(o, n, now = Date.now()) {
  if (o.status !== 'paid') return 'wait'
  if (now > endOf(o)) return 'ended'
  return n >= DL_TIMES ? 'used' : 'ok'
}

const text = (body, status) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })

/** The file itself, as a download, and the count up by one. */
export async function serve(env, s, o, lines, dlId, now = Date.now()) {
  if (!lines.some((l) => l.k === 'd' && l.id === dlId)) return new Response('', { status: 404 })
  const n = (await counts(env, o.id))[dlId] || 0
  const st = state(o, n, now)
  if (st !== 'ok') return text(st === 'wait' ? 'Not paid yet' : 'This download has ended', st === 'wait' ? 403 : 410)
  const obj = await env.MEDIA.get(dlKey(s.id, dlId))
  if (!obj) return new Response('', { status: 404 })
  await env.DB.prepare('INSERT OR IGNORE INTO order_dl (order_id, dl, n) VALUES (?,?,0)').bind(o.id, dlId).run()
  const up = await env.DB.prepare('UPDATE order_dl SET n = n + 1 WHERE order_id = ? AND dl = ? AND n < ?').bind(o.id, dlId, DL_TIMES).run()
  if (!up.meta?.changes) return text('This download has ended', 410)
  const name = String(obj.customMetadata?.name || dlId)
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(name)?.[1] || '').toLowerCase()
  const plain = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return new Response(obj.body, { headers: {
    'content-type': DL_TYPES[ext] || 'application/octet-stream', 'content-disposition': `attachment; filename="${plain}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } })
}
