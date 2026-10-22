// gbp.mjs — a Gold page kept in step with the owner's Google Business Profile (NaN 2026-10-22).
//
// What goes: the page's hours, description, phone and link (Business Information API v1, PATCH locations/{id}),
// photos (My Business API v4 media) and timed offers as Google posts of type OFFER (v4 localPosts). Read on
// 2026-10-22 from developers.google.com/my-business: v4 localPosts and media are still the only home of posts and
// media (v4.9); the review, Q&A and insights parts of v4 are discontinued and not used here.
//
// Off until the secrets GBP_CLIENT_ID, GBP_CLIENT_SECRET and GBP_KEY exist (on(env)). Google gives a Cloud project
// zero quota until it approves the project for Business Profile API access, so a connection can still end in
// "access" until then; the error is shown in plain words.
//
//   GET    /api/gbp                 status: on, connected, location, last sync, error
//   POST   /api/gbp/connect         the Google sign-in address (OAuth web flow, scope business.manage, offline)
//   GET    /api/gbp/callback        Google returns here (state is signed); stores the sealed refresh token
//   GET    /api/gbp/locations       the locations the owner manages
//   POST   /api/gbp/location        { account, name }: the one this page is kept in step with
//   POST   /api/gbp/sync            send what changed now
//   DELETE /api/gbp                 revoke at Google and forget the token

import { normalize, HOME } from '../public/s/render.mjs'
import { ogOf } from '../public/s/og.mjs'
import { periodsOf, descriptionOf, postOf } from '../public/s/gbp-kit.mjs'
import { isGold } from './gold.mjs'

const SCOPE = 'https://www.googleapis.com/auth/business.manage'
const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN = 'https://oauth2.googleapis.com/token'
const REVOKE = 'https://oauth2.googleapis.com/revoke'
const ACCOUNTS = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts'
const INFO = 'https://mybusinessbusinessinformation.googleapis.com/v1'
const V4 = 'https://mybusiness.googleapis.com/v4'
const DAY = 864e5
const MEDIA_PER_RUN = 4, POSTS_MAX = 5, PHOTOS_MAX = 10

export const on = (env) => !!(env.GBP_CLIENT_ID && env.GBP_CLIENT_SECRET && env.GBP_KEY)

// ---- sealing, signing ---------------------------------------------------------------------

const b64 = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const enc = new TextEncoder()

async function aesKey(env) {
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', enc.encode('gbp-seal|' + env.GBP_KEY)), 'AES-GCM', false, ['encrypt', 'decrypt'])
}
export async function seal(env, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(env), enc.encode(text)))
  return b64(iv) + '.' + b64(ct)
}
export async function unseal(env, blob) {
  const [iv, ct] = String(blob).split('.')
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await aesKey(env), unb64(ct)))
}
async function mac(env, text) {
  const k = await crypto.subtle.importKey('raw', enc.encode('gbp-state|' + env.GBP_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(text))))
}
/** The sign-in's state: the page and an expiry, signed, so the callback needs no cookie. */
export async function stateOf(env, siteId, now = Date.now()) {
  const body = b64(enc.encode(JSON.stringify({ s: siteId, e: now + 15 * 60e3 })))
  return body + '.' + (await mac(env, body))
}
export async function readState(env, state, now = Date.now()) {
  const [body, sig] = String(state || '').split('.')
  if (!body || !sig || (await mac(env, body)) !== sig) return null
  try { const x = JSON.parse(new TextDecoder().decode(unb64(body))); return x.e > now && typeof x.s === 'string' ? x.s : null } catch { return null }
}
const hash = async (x) => b64(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(JSON.stringify(x))))).slice(0, 16)

// ---- Google ---------------------------------------------------------------------------------

/** An error in plain codes the builder has words for: closed · access · apioff · quota · bad · net · other. */
export class GbpError extends Error {
  constructor(code, detail = '') { super(code); this.code = code; this.detail = String(detail || '').slice(0, 200) }
}
function failure(status, j) {
  const e = j && j.error ? j.error : {}
  const words = (typeof e === 'string' ? e : e.message || e.error_description || '') + ' ' + (j?.error_description || '')
  if (status === 401 || /invalid_grant|unauthenticated/i.test(words + (e.status || ''))) return new GbpError('closed', words)
  if (status === 429 || e.status === 'RESOURCE_EXHAUSTED') return new GbpError('quota', words)
  if (status === 403 && /has not been used|is disabled|SERVICE_DISABLED/i.test(words)) return new GbpError('apioff', words)
  if (status === 403 || e.status === 'PERMISSION_DENIED') return new GbpError('access', words)
  if (status === 400 || status === 404 || status === 409) return new GbpError('bad', words)
  return new GbpError('other', `${status} ${words}`)
}
async function gfetch(url, { method = 'GET', token, body } = {}) {
  let r
  try {
    r = await fetch(url, { method, headers: { authorization: 'Bearer ' + token, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  } catch (e) { throw new GbpError('net', e?.message) }
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw failure(r.status, j)
  return j
}
async function tokenCall(env, params) {
  let r
  try { r = await fetch(TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.GBP_CLIENT_ID, client_secret: env.GBP_CLIENT_SECRET, ...params }) }) } catch (e) { throw new GbpError('net', e?.message) }
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw failure(r.status === 400 ? 401 : r.status, j)
  return j
}
export const accessToken = async (env, row) => (await tokenCall(env, { grant_type: 'refresh_token', refresh_token: await unseal(env, row.enc) })).access_token

export function authUrl(env, redirect, state) {
  return AUTH + '?' + new URLSearchParams({ client_id: env.GBP_CLIENT_ID, redirect_uri: redirect, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state })
}

/** The locations the signed-in owner manages: [{ account, name, title, addr }]. */
export async function locations(token) {
  const out = []
  const accts = (await gfetch(ACCOUNTS + '?pageSize=20', { token })).accounts || []
  for (const a of accts.slice(0, 5)) {
    const j = await gfetch(`${INFO}/${a.name}/locations?pageSize=100&readMask=name,title,storefrontAddress`, { token })
    for (const l of j.locations || []) {
      const ad = l.storefrontAddress || {}
      out.push({ account: a.name, name: l.name, title: l.title || '', addr: [...(ad.addressLines || []), ad.locality].filter(Boolean).join(', ') })
    }
  }
  return out.slice(0, 200)
}

// ---- what a page sends ---------------------------------------------------------------------

/** The page's address for Google: its own domain when one is active, else sites.motdang.net/<name>. */
export const siteUrl = (s, origin = HOME) => (s.domain && s.domain_state === 'active' ? `https://${s.domain}` : `${origin}/${s.name}`)

/** Everything one sync would send, from the page row. Pure, so a test can read it. */
export function planOf(s, d, origin = HOME, now = Date.now()) {
  const url = siteUrl(s, origin)
  const card = `${origin}/card/${s.name}.jpg?k=${ogOf({ name: s.name, look: s.look, tier: 'gold' }, d).key}`
  const info = {}
  const hours = periodsOf(d)
  if (hours) info.regularHours = hours
  const desc = descriptionOf(d)
  if (desc) info.profile = { description: desc }
  if (d.contact.phone) info.phoneNumbers = { primaryPhone: d.contact.phone }
  info.websiteUri = url
  const media = []
  const img = (id) => `${origin}/img/${id}.webp`
  if (d.cover) media.push({ id: d.cover, category: 'COVER', url: img(d.cover) })
  if (d.avatar) media.push({ id: d.avatar, category: 'PROFILE', url: img(d.avatar) })
  for (const id of d.photos.filter((x) => x !== d.cover && x !== d.avatar).slice(0, PHOTOS_MAX)) media.push({ id, category: 'ADDITIONAL', url: img(id) })
  const posts = {}
  for (const c of d.camps) {
    if (Object.keys(posts).length >= POSTS_MAX) break
    const end = Date.parse(c.end + ':00+07:00') // wall clock; a day either side does not matter for "still running"
    const start = Date.parse(c.start + ':00+07:00')
    if (!(end > now) || start > now + 30 * DAY) continue
    const body = postOf(c, { url, card, lang: s.lang })
    if (body) posts[c.id] = body
  }
  return { info, media, posts }
}

const PARTS = { regularHours: 'hours', 'profile.description': 'desc', 'phoneNumbers.primaryPhone': 'phone', websiteUri: 'web' }

/** Send what changed since the last sync. Each part stands alone: one Google refuses does not hold the others. */
export async function syncOne(env, row, s, origin = HOME, { touch = false } = {}) {
  const now = new Date().toISOString()
  const sent = (() => { try { return JSON.parse(row.sent || '{}') } catch { return {} } })()
  sent.parts = sent.parts || {}; sent.media = sent.media || {}; sent.posts = sent.posts || {}
  const errs = []
  const note = (code, detail, part) => errs.push([code, `${part ? part + ': ' : ''}${detail || ''}`.trim()])
  try {
    if (!row.location || !row.account) throw new GbpError('nolocation')
    const d = normalize(JSON.parse(s.d))
    if (s.status !== 'live') throw new GbpError('notlive')
    if (!isGold(s)) throw new GbpError('notgold')
    const plan = planOf(s, d, origin)
    // hours, description, phone, link: one PATCH with the fields that changed
    const mask = [], body = {}
    const want = { regularHours: plan.info.regularHours, 'profile.description': plan.info.profile?.description, 'phoneNumbers.primaryPhone': plan.info.phoneNumbers?.primaryPhone, websiteUri: plan.info.websiteUri }
    const hashes = {}, postHashes = {}
    for (const [k, v] of Object.entries(want)) {
      if (v === undefined) continue
      hashes[k] = await hash(v)
      if (sent.parts[PARTS[k]] === hashes[k]) continue
      mask.push(k)
      if (k === 'regularHours') body.regularHours = v
      else if (k === 'profile.description') body.profile = { description: v }
      else if (k === 'phoneNumbers.primaryPhone') body.phoneNumbers = { primaryPhone: v }
      else body.websiteUri = v
    }
    // nothing to send: no call to Google at all (a save that changed other words costs nothing)
    const newMedia = plan.media.filter((m) => !sent.media[`${m.id}:${m.category}`])
    const postWork = []
    for (const [id, post] of Object.entries(plan.posts)) if (sent.posts[id]?.h !== (postHashes[id] = await hash(post))) postWork.push(id)
    const gone = Object.keys(sent.posts).filter((id) => !plan.posts[id])
    if (!mask.length && !newMedia.length && !postWork.length && !gone.length) {
      if (touch) await env.DB.prepare('UPDATE gbp SET last_try = ?, last_ok = ?, err = NULL WHERE site_id = ?').bind(now, now, row.site_id).run()
      return { ok: true, err: '', idle: true }
    }
    const token = await accessToken(env, row)
    if (mask.length) {
      try {
        await gfetch(`${INFO}/${row.location}?updateMask=${encodeURIComponent(mask.join(','))}`, { method: 'PATCH', token, body })
        for (const k of mask) sent.parts[PARTS[k]] = hashes[k]
      } catch (e) {
        if (!(e instanceof GbpError) || e.code !== 'bad') throw e
        note('bad', e.detail, mask.map((k) => PARTS[k]).join('+'))
      }
    }
    // photos, a few a run, each once
    let n = 0
    for (const m of plan.media) {
      const key = `${m.id}:${m.category}`
      if (sent.media[key] || n >= MEDIA_PER_RUN) continue
      try {
        await gfetch(`${V4}/${row.account}/${row.location}/media`, { method: 'POST', token, body: { mediaFormat: 'PHOTO', locationAssociation: { category: m.category }, sourceUrl: m.url } })
        sent.media[key] = 1; n++
      } catch (e) {
        if (!(e instanceof GbpError) || e.code !== 'bad') throw e
        sent.media[key] = 'refused' // Google refused this picture: not asked again until it changes
        note('photo', e.detail, 'photo')
      }
    }
    // offers: a post each; a changed one is replaced, a finished or removed one is deleted
    for (const [id, post] of Object.entries(plan.posts)) {
      const h = postHashes[id]
      const have = sent.posts[id]
      if (have && have.h === h) continue
      try {
        if (have?.name) await gfetch(`${V4}/${have.name}`, { method: 'DELETE', token }).catch((e) => { if (!(e instanceof GbpError) || e.code !== 'bad') throw e })
        const made = await gfetch(`${V4}/${row.account}/${row.location}/localPosts`, { method: 'POST', token, body: post })
        sent.posts[id] = { h, name: made.name || '' }
      } catch (e) {
        if (!(e instanceof GbpError) || e.code !== 'bad') throw e
        note('post', e.detail, 'offer')
      }
    }
    for (const [id, have] of Object.entries(sent.posts)) {
      if (plan.posts[id]) continue
      try { if (have.name) await gfetch(`${V4}/${have.name}`, { method: 'DELETE', token }) } catch (e) { if (!(e instanceof GbpError) || (e.code !== 'bad')) throw e }
      delete sent.posts[id]
    }
  } catch (e) {
    const g = e instanceof GbpError ? e : new GbpError('other', e?.message)
    errs.unshift([g.code, g.detail])
    console.error('gbp', row.site_id, g.code, g.detail)
  }
  const err = errs.length ? errs.map(([c, dt]) => `${c}|${dt}`).join('\n').slice(0, 600) : ''
  await env.DB.prepare('UPDATE gbp SET last_try = ?, last_ok = ?, err = ?, sent = ? WHERE site_id = ?')
    .bind(now, errs.length ? row.last_ok : now, err, JSON.stringify(sent), row.site_id).run()
  return { ok: !errs.length, err }
}

export async function rowOf(env, siteId) {
  return env.DB.prepare('SELECT * FROM gbp WHERE site_id = ?').bind(siteId).first()
}

/** After a save: send what changed, if the page is connected and a location is picked. Never throws. */
export async function afterSave(env, siteId, origin = HOME) {
  try {
    if (!on(env)) return
    const row = await rowOf(env, siteId)
    if (!row || !row.location) return
    if (row.last_try && Date.parse(row.last_try) > Date.now() - 60e3) return // a burst of saves: the half-hourly check sends the rest
    const s = await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(siteId).first()
    if (s) await syncOne(env, row, s, origin)
  } catch (e) { console.error('gbp afterSave', e?.message) }
}

/** The daily check (the half-hourly job runs it): connected pages not sent in 20 hours, and failures an hour after they last tried. */
export async function due(env, origin = HOME, max = 5, now = Date.now()) {
  if (!on(env)) return 0
  const iso = (ms) => new Date(now - ms).toISOString()
  // not sent for 20 hours, or the page changed since the last send; a failed one waits 3 hours, a sign-in Google closed waits for the owner
  const rows = (await env.DB.prepare(`SELECT g.* FROM gbp g JOIN site s ON s.id = g.site_id
    WHERE g.location IS NOT NULL AND COALESCE(g.err, '') NOT LIKE 'closed|%'
      AND (g.last_ok IS NULL OR g.last_ok < ? OR s.updated > g.last_ok)
      AND (g.last_try IS NULL OR g.last_try < CASE WHEN COALESCE(g.err, '') = '' THEN ? ELSE ? END)
    ORDER BY COALESCE(g.last_try, '') LIMIT ?`).bind(iso(20 * 3600e3), iso(25 * 60e3), iso(3 * 3600e3), max).all()).results
  let n = 0
  for (const row of rows) {
    const s = await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(row.site_id).first()
    if (!s || s.status === 'removed') { await drop(env, row.site_id); continue }
    await syncOne(env, row, s, origin, { touch: true }); n++
  }
  return n
}

/** Forget a page's connection; Google is told to revoke the token. */
export async function drop(env, siteId) {
  try {
    const row = await rowOf(env, siteId)
    if (!row) return
    if (on(env)) { try { await fetch(REVOKE, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: await unseal(env, row.enc) }) }) } catch {} }
    await env.DB.prepare('DELETE FROM gbp WHERE site_id = ?').bind(siteId).run()
  } catch (e) { console.error('gbp drop', e?.message) }
}

// ---- routes ---------------------------------------------------------------------------------

const errOf = (e) => { const [code, ...rest] = String(e || '').split('\n')[0].split('|'); return e ? { code, detail: rest.join('|') } : null }
const status = (env, row, s) => ({
  on: on(env), gold: isGold(s), connected: !!row, location: row?.location ? { name: row.location, title: row.loc_title || '' } : null,
  last_ok: row?.last_ok || '', last_try: row?.last_try || '', err: errOf(row?.err),
})

/** The Google sign-in returns here. The page is named by the signed state; the owner's browser then reopens the builder on the Gold tab. */
export async function callback(env, url, origin) {
  const id = on(env) ? await readState(env, url.searchParams.get('state')) : null
  if (!id) return new Response('', { status: 400 })
  const s = await env.DB.prepare('SELECT id, name, tier, gold_until FROM site WHERE id = ?').bind(id).first()
  if (!s) return new Response('', { status: 404 })
  const go = (q) => Response.redirect(`${origin}/make#gbp=${encodeURIComponent(s.name)}&tab=gold${q}`, 302)
  if (url.searchParams.get('error') || !url.searchParams.get('code')) return go('&gbperr=denied')
  if (!isGold(s)) return go('&gbperr=gold')
  try {
    const t = await tokenCall(env, { grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: `${origin}/api/gbp/callback` })
    if (!t.refresh_token) return go('&gbperr=norefresh')
    const sealed = await seal(env, t.refresh_token)
    await env.DB.prepare('INSERT INTO gbp (site_id, enc, connected) VALUES (?,?,?) ON CONFLICT(site_id) DO UPDATE SET enc = excluded.enc, err = NULL, connected = excluded.connected')
      .bind(s.id, sealed, new Date().toISOString()).run()
    return go('&gbp2=ok')
  } catch (e) { return go('&gbperr=' + (e instanceof GbpError ? e.code : 'other')) }
}

/** Owner routes under /api/gbp (the edit link is already checked). h = { J, body, take, sender } */
export async function route(request, env, ctx, p, origin, s, h) {
  const m = request.method
  const row = await rowOf(env, s.id)
  if (p === 'gbp' && m === 'GET') return h.J(status(env, row, s))
  if (!isGold(s)) return h.J({ error: 'gold' }, 402)
  if (!on(env)) return h.J({ error: 'off' }, 503)
  const who = await h.sender(request, env)
  if (!(await h.take(env, who, 'gbp'))) return h.J({ error: 'quota' }, 429)
  if (p === 'gbp/connect' && m === 'POST') {
    return h.J({ url: authUrl(env, `${origin}/api/gbp/callback`, await stateOf(env, s.id)) })
  }
  if (p === 'gbp' && m === 'DELETE') { await drop(env, s.id); return h.J({ ok: true }) }
  if (!row) return h.J({ error: 'not-connected' }, 409)
  if (p === 'gbp/locations' && m === 'GET') {
    try { return h.J({ locations: await locations(await accessToken(env, row)) }) } catch (e) { return h.J({ error: e instanceof GbpError ? e.code : 'other', detail: e.detail || '' }, 502) }
  }
  if (p === 'gbp/location' && m === 'POST') {
    const b = await h.body(request)
    try {
      const found = (await locations(await accessToken(env, row))).find((l) => l.name === b.name && l.account === b.account)
      if (!found) return h.J({ error: 'location' }, 400)
      await env.DB.prepare('UPDATE gbp SET account = ?, location = ?, loc_title = ?, sent = NULL, err = NULL WHERE site_id = ?').bind(found.account, found.name, found.title.slice(0, 120), s.id).run()
    } catch (e) { return h.J({ error: e instanceof GbpError ? e.code : 'other', detail: e.detail || '' }, 502) }
    ctx.waitUntil(afterSave(env, s.id, origin))
    return h.J(status(env, await rowOf(env, s.id), s))
  }
  if (p === 'gbp/sync' && m === 'POST') {
    if (!row.location) return h.J({ error: 'nolocation' }, 409)
    await syncOne(env, row, s, origin)
    return h.J(status(env, await rowOf(env, s.id), s))
  }
  return null
}
