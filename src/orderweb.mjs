// orderweb.mjs — the pages an order opens without a password: /o/<id>.<sig> (the buyer's order, its slip form and its
// downloads) and /sh/<job>.<exp>.<sig> (the team's parcel). The signatures are osign.mjs's.

import { normalize } from '../public/s/render.mjs'
import { readOrder, readTeam } from './osign.mjs'
import { buyerPage, teamPage } from './orderpage.mjs'
import * as orders from './orders.mjs'
import * as shipjob from './shipjob.mjs'
import * as dls from './dls.mjs'

const GONE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><p style="font:18px system-ui;padding:20px">ลิงก์หมดอายุ · This link has expired.</p>'

/** deps = { html, sha, sameOrigin, take, sender, later, tellBeer, post, rand, payOk }. Null when the path is not an order's. */
export async function route(request, env, path, url, origin, deps) {
  const m = request.method
  if (path.startsWith('/o/')) {
    const k = await readOrder(env, path, deps.sha)
    if (!k) return new Response('', { status: 404 })
    const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(k.id).first()
    const s = o && await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(o.site_id).first()
    if (!o || !s || s.status === 'removed') return new Response('', { status: 404 })
    const link = `${origin}${path.replace(/\/(slip|d\/[a-z0-9]+)$/, '')}`
    if (k.dl) return m === 'GET' ? dls.serve(env, s, o, orders.linesOf(o), k.dl) : new Response('', { status: 405 })
    if (k.slip) {
      if (m !== 'POST' || !deps.sameOrigin(request, url)) return Response.redirect(link, 303)
      if (!(await deps.take(env, await deps.sender(request, env), 'oslip'))) return new Response('Too many tries today', { status: 429 })
      await orders.slipIn(env, s, o, request, origin, deps)
      return Response.redirect(link, 303)
    }
    if (m !== 'GET') return new Response('', { status: 405 })
    const nonce = deps.rand(16)
    return deps.html(buyerPage(o, s, normalize(JSON.parse(s.d || '{}')), { link, origin, counts: await dls.counts(env, o.id), now: Date.now() }), 200, { nonce })
  }
  if (path.startsWith('/sh/')) {
    const k = await readTeam(env, path, deps.sha)
    if (!k) return new Response('', { status: 404 })
    if (k.expired) return deps.html(GONE, 410)
    const job = await env.DB.prepare('SELECT * FROM shipjob WHERE id = ?').bind(k.jobId).first()
    const o = job && await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(job.order_id).first()
    const s = o && await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(job.site_id).first()
    if (!job || !o || !s) return new Response('', { status: 404 })
    const d = normalize(JSON.parse(s.d || '{}'))
    let error = ''
    if (m === 'POST' && deps.sameOrigin(request, url)) {
      let form = new FormData()
      try { form = await request.formData() } catch {}
      const r = await shipjob.act(env, job, o, s, form, origin, deps)
      if (!r.error) return Response.redirect(origin + path, 303)
      error = r.error === 'track' ? 'ใส่เลขพัสดุ · Write the tracking number' : 'ค่าส่งไม่ถูกต้อง · The postage is not right'
    }
    const fresh = await env.DB.prepare('SELECT * FROM shipjob WHERE id = ?').bind(job.id).first()
    return deps.html(teamPage(fresh, o, s, d, { error }), 200)
  }
  return null
}
