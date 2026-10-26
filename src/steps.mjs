// steps.mjs — people at each step from the front page to a paid Gold year (Nan 2026-10-26: "count each step
// to paid"). Counts sit in the traffic tables under made-up page ids: hit rows for site '~steps' (m = the step,
// k = where the person came from), and seen rows for '~steps:<step>' so a person counts once a day per step.
// A request from a machine does not count.

import { isMachine } from './stats.mjs'

export const STEPS = ['home', 'make', 'made', 'online', 'gold', 'slip', 'paid']
export const LABEL = { home: 'Front page', make: 'Page maker', made: 'Page made', online: 'Page online', gold: 'Gold tab', slip: 'Slip sent', paid: 'Paid' }
const ID = '~steps'

/** Where a visitor came from, in one word: ?from=, else the referring site. */
export function sourceOf(request, url) {
  const f = (url.searchParams.get('from') || '').toLowerCase()
  if (/^[a-z0-9-]{2,20}$/.test(f)) return f
  const r = request.headers.get('referer') || ''
  if (!r) return 'direct'
  try {
    const u = new URL(r)
    const h = u.hostname.replace(/^www\.|^m\.|^l\.|^lm\./, '')
    if (h === url.hostname) return u.pathname === '/' ? 'home' : 'pages'
    if (h === 'motdang.net') return 'motdang'
    if (/(^|\.)(facebook\.com|fb\.com|messenger\.com)$/.test(h)) return 'facebook'
    if (/(^|\.)(line\.me|lin\.ee)$|line-apps/.test(h)) return 'line'
    if (/(^|\.)google\./.test(h)) return 'google'
    return 'other'
  } catch { return 'other' }
}

async function hash(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 20)
}

/**
 * One person (or one page, or one payment) reached a step. `who` tells them apart: a page id, a payment id;
 * left out, the visitor's address and browser. `request` may be null for a step a person did not make here
 * (a payment marked paid).
 */
export async function count(env, request, step, { src = '', who = '' } = {}) {
  if (!STEPS.includes(step)) return false
  if (request && isMachine(request)) return false
  const day = new Date().toISOString().slice(0, 10)
  if (!who) who = `${request?.headers.get('cf-connecting-ip') || 'local'}|${request?.headers.get('user-agent') || ''}`
  const key = await hash(`${env.SESSION_SECRET || 'dev'}|${step}|${day}|${who}`)
  const fresh = await env.DB.prepare('INSERT OR IGNORE INTO seen (site_id, day, who) VALUES (?,?,?)').bind(`${ID}:${step}`, day, key).run()
  if (!fresh.meta?.changes) return false
  await env.DB.prepare('INSERT INTO hit (site_id, day, m, k, n) VALUES (?,?,?,?,1) ON CONFLICT(site_id, day, m, k) DO UPDATE SET n = n + 1')
    .bind(ID, day, step, String(src || '').slice(0, 20)).run()
  return true
}

/** Counting never stands in a person's way: an error is logged and the request goes on. */
export function later(ctx, p) {
  const q = Promise.resolve(p).catch((e) => console.error('steps', e?.stack || e))
  if (ctx?.waitUntil) ctx.waitUntil(q)
  return q
}

/** The last `days` days: one row a day with each step's count, and each step's sources over the whole span. */
export async function report(env, days = 14) {
  const from = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10)
  const rows = (await env.DB.prepare('SELECT day, m, k, n FROM hit WHERE site_id = ? AND day >= ? ORDER BY day DESC').bind(ID, from).all()).results
  const byDay = new Map(), src = Object.fromEntries(STEPS.map((s) => [s, {}])), total = Object.fromEntries(STEPS.map((s) => [s, 0]))
  for (const r of rows) {
    if (!STEPS.includes(r.m)) continue
    const d = byDay.get(r.day) || Object.fromEntries([['day', r.day], ...STEPS.map((s) => [s, 0])])
    d[r.m] += r.n
    byDay.set(r.day, d)
    total[r.m] += r.n
    const k = r.k || '—'
    src[r.m][k] = (src[r.m][k] || 0) + r.n
  }
  return { from, days: [...byDay.values()], total, src }
}

/** The admin table. */
export function table(rep, esc) {
  const head = `<tr><th>Day</th>${STEPS.map((s) => `<th>${LABEL[s]}</th>`).join('')}</tr>`
  const line = (d) => `<tr><td>${esc(d.day)}</td>${STEPS.map((s) => `<td>${d[s] || ''}</td>`).join('')}</tr>`
  const tot = `<tr><td><b>${rep.days.length ? 'Since ' + esc(rep.from) : 'Nothing yet'}</b></td>${STEPS.map((s) => `<td><b>${rep.total[s] || ''}</b></td>`).join('')}</tr>`
  const where = STEPS.filter((s) => Object.keys(rep.src[s]).length).map((s) => `${LABEL[s]}: ${Object.entries(rep.src[s]).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${esc(k)} ${n}`).join(', ')}`).join('<br>')
  return `<table>${head}${tot}${rep.days.map(line).join('')}</table><p><small>People a day at each step; a person counts once a day per step, a page once when it first goes online, a payment once. Machines do not count.</small></p>${where ? `<p><small>${where}</small></p>` : ''}`
}
