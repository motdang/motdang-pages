// guestline.mjs — "Remind me on LINE" on the guest page /bk/<id> (Nan 2026-10-22).
// The guest signs in with LINE Login (channel 2012126176, scope profile openid; secrets LINE_LOGIN_ID and
// LINE_LOGIN_SECRET). The sign-in gives the guest's LINE user ID. The Worker keeps it with the booking and
// hands the reminder to the Mot Dang LINE account through the service binding LINE_BOT (its Site.remind in
// motdang-line), so the push counts against that account's monthly cap like every other push there.
//   GET /line/go?bk=<id>   starts the sign-in
//   GET /line/cb           LINE sends the guest back here (register https://sites.motdang.net/line/cb)

import { normalize } from '../public/s/render.mjs'
import { reminderLine, dueMs, startMs } from './remind.mjs'
import * as gold from './gold.mjs'

const AUTH = 'https://access.line.me/oauth2/v2.1/authorize'
const TOKEN = 'https://api.line.me/oauth2/v2.1/token'
const OA = '@964yxgnk' // the Mot Dang LINE Official Account
export const callbackOf = (origin) => `${origin}/line/cb`
export const on = (env) => !!(env.LINE_LOGIN_ID && env.LINE_LOGIN_SECRET && env.LINE_BOT)

const rand = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('')
const back = (origin, id, how) => new Response(null, { status: 303, headers: { location: `${origin}/bk/${encodeURIComponent(id)}?line=${how}`, 'set-cookie': 'lstate=; Max-Age=0; Path=/line; HttpOnly; SameSite=Lax' } })

/** The booking a guest may set a LINE reminder for: accepted, not started, its page live and Gold, none set yet. */
async function open(env, id, now = Date.now()) {
  const bk = await env.DB.prepare('SELECT * FROM booking WHERE id = ?').bind(String(id || '')).first()
  const s = bk && await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(bk.site_id).first()
  if (!bk || !s || s.status !== 'live' || !gold.isGold(s)) return null
  const d = normalize(JSON.parse(s.d))
  if (bk.status !== 'ok' || startMs(bk, d) <= now) return null
  return { bk, s, d }
}

export async function go(env, url, origin) {
  const id = url.searchParams.get('bk') || ''
  if (!on(env)) return back(origin, id, 'off')
  const b = await open(env, id)
  if (!b) return back(origin, id, 'gone')
  if (b.bk.remind_line) return back(origin, id, 'set')
  const nonce = rand(16)
  const q = new URLSearchParams({ response_type: 'code', client_id: env.LINE_LOGIN_ID, redirect_uri: callbackOf(origin), state: `${nonce}.${id}`, scope: 'profile openid', bot_prompt: 'aggressive' })
  return new Response(null, { status: 302, headers: { location: `${AUTH}?${q}`, 'set-cookie': `lstate=${nonce}; Max-Age=900; Path=/line; HttpOnly; SameSite=Lax${origin.startsWith('https') ? '; Secure' : ''}`, 'cache-control': 'no-store' } })
}

/** LINE's answer: swap the code for the guest's ID, set the reminder, send the guest back to the booking. */
export async function cb(request, env, url, origin, now = Date.now()) {
  const [nonce, id] = String(url.searchParams.get('state') || '').split('.')
  const cookie = /(?:^|;\s*)lstate=([a-f0-9]+)/.exec(request.headers.get('cookie') || '')?.[1]
  if (!nonce || !id || nonce !== cookie) return new Response('', { status: 303, headers: { location: `${origin}/all` } })
  if (!on(env)) return back(origin, id, 'off')
  const code = url.searchParams.get('code')
  if (!code || url.searchParams.get('error')) return back(origin, id, 'cancel')
  const b = await open(env, id, now)
  if (!b) return back(origin, id, 'gone')
  if (b.bk.remind_line) return back(origin, id, 'set')
  let uid = '', friend = true
  try {
    const t = await fetch(TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackOf(origin), client_id: env.LINE_LOGIN_ID, client_secret: env.LINE_LOGIN_SECRET }) })
    const tj = await t.json()
    if (!t.ok || !tj.access_token) return back(origin, id, 'fail')
    const auth = { authorization: 'Bearer ' + tj.access_token }
    const p = await fetch('https://api.line.me/v2/profile', { headers: auth })
    uid = (await p.json())?.userId || ''
    try { const f = await fetch('https://api.line.me/friendship/v1/status', { headers: auth }); if (f.ok) friend = !!(await f.json()).friendFlag } catch {}
  } catch { return back(origin, id, 'fail') }
  if (!/^U[0-9a-f]{32}$/.test(uid)) return back(origin, id, 'fail')
  // at the reminder time, or in a minute when that has passed already
  const at = Math.max(dueMs(b.bk, b.d), now + 60e3)
  if (at >= startMs(b.bk, b.d)) return back(origin, id, 'soon')
  let r
  try { r = await env.LINE_BOT.remind(uid, 'bk:' + b.bk.id, at, reminderLine(b.s, b.d, b.bk, origin)) } catch (e) { console.error('line remind', e); r = { error: 'binding' } }
  if (!r?.ok) return back(origin, id, 'fail')
  await env.DB.prepare('UPDATE booking SET line_uid = ?, remind_line = ? WHERE id = ? AND remind_line IS NULL').bind(uid, new Date(at).toISOString(), b.bk.id).run()
  return back(origin, id, friend ? 'ok' : 'add')
}

/** A booking that is cancelled or declined before its reminder time: the LINE reminder is taken back. */
export async function cancel(env, bk, now = Date.now()) {
  if (!bk?.line_uid || !bk.remind_line || bk.remind_line <= new Date(now).toISOString() || !env.LINE_BOT) return false
  try {
    await env.LINE_BOT.unremind(bk.line_uid, 'bk:' + bk.id)
    await env.DB.prepare('UPDATE booking SET remind_line = NULL WHERE id = ?').bind(bk.id).run()
    return true
  } catch (e) { console.error('line unremind', e); return false }
}

export { OA }
