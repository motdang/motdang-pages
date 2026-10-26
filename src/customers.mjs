// customers.mjs — a Gold page's customers and its one email a month (Nan 2026-10-22).
// One row per person, merged from the page's bookings and messages by email, phone or LINE id.
// A tick on "News from <page>, once a month at most" (booking and message forms) is the yes.
// The broadcast goes by email, once a calendar month per page, each email with a one-tap
// unsubscribe link that needs no login. LINE is not used here: the account's 500 free pushes a
// month are shared by everything, so the maker sends the same words from their own LINE with a
// share link.

import { dayIn } from '../public/s/extras.mjs'
import { cw, both } from '../public/s/words-cust.mjs'
import { check, mail } from './msg.mjs'
import { ow, owBoth } from '../public/s/words-online.mjs'
import { rules, aiScreen } from './screen.mjs'

const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,}$/i
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n)

export const NEWS_MAX = 200 // people one broadcast reaches (var NEWS_MAX)
export const NEWS_DAY = 600 // emails of this kind all pages send in a day (var NEWS_DAY)
export const NEWS_TRIES = 12 // tries a person makes in a day at /api/news
export const JOIN_TRIES = 6 // tries one sender makes in a day at /api/join
export const JOIN_DAY = 60 // confirm emails one page sends in a day (var JOIN_DAY)
export const JOIN_ALL = 400 // confirm emails all pages send in a day (var JOIN_ALL)
export const JOIN_GAP = 600e3 // ms between two confirm emails to one address

export const validEmail = (v) => (EMAIL.test(str(v, 254)) ? str(v, 254).toLowerCase() : '')

// ---- the list ---------------------------------------------------------------------------

function normPhone(digits) {
  return digits.startsWith('66') && digits.length >= 11 ? '0' + digits.slice(2) : digits
}
/** ['e'|'p'|'h', value] for one contact line (email, phone, LINE id), or null. */
export function classify(reach) {
  const r = str(reach, 200)
  if (!r) return null
  if (EMAIL.test(r)) return ['e', r.toLowerCase()]
  const digits = r.replace(/\D/g, '')
  if (/^[\d+\s().-]+$/.test(r) && digits.length >= 8 && digits.length <= 15) return ['p', normPhone(digits)]
  const h = r.replace(/^line\s*(id)?\s*[:：]?\s*/i, '').replace(/\s+/g, '').toLowerCase()
  return h ? ['h', h] : null
}

const SOURCES = [['b', 'booking'], ['m', 'message'], ['s', 'signup']]

/** The customers of a page: [{ name, email, phone, line, first, last, bookings, messages, source, news, mail }]. news: yes | no | off. */
export async function list(env, s, d) {
  const tz = d.hours.tz
  const bks = (await env.DB.prepare("SELECT name, reach, email, at, status, news FROM booking WHERE site_id = ? AND status != 'hold' ORDER BY at DESC LIMIT 5000").bind(s.id).all()).results
  const mss = (await env.DB.prepare("SELECT name, reach, email, at, news FROM msg WHERE site_id = ? AND status NOT IN ('gone','held') ORDER BY at DESC LIMIT 5000").bind(s.id).all()).results
  const off = new Set((await env.DB.prepare('SELECT email FROM news_off WHERE site_id = ?').bind(s.id).all()).results.map((r) => r.email))
  // the news sign-up box: an address counts once its confirm button was pressed
  const sus = (await env.DB.prepare('SELECT name, email, ok_at FROM signup WHERE site_id = ? AND ok_at IS NOT NULL ORDER BY ok_at DESC LIMIT 5000').bind(s.id).all()).results
  const recs = [
    ...bks.map((r) => ({ k: 'b', live: r.status === 'new' || r.status === 'ok', name: r.name, at: r.at, news: !!r.news, mail: validEmail(r.email), reach: r.reach })),
    ...mss.map((r) => ({ k: 'm', name: r.name, at: r.at, news: !!r.news, mail: validEmail(r.email) || validEmail(r.reach), reach: r.reach })),
    ...sus.map((r) => ({ k: 's', name: r.name, at: r.ok_at, news: true, mail: validEmail(r.email), reach: r.email })),
  ]
  // union-find over what a record gives: email, phone, LINE id
  const parent = new Map()
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x) } return x }
  const join = (a, b) => { if (!parent.has(a)) parent.set(a, a); if (!parent.has(b)) parent.set(b, b); parent.set(find(a), find(b)) }
  recs.forEach((r, i) => {
    r.id = 'r' + i
    parent.set(r.id, r.id)
    const keys = new Set()
    const c = classify(r.reach)
    if (c) keys.add(c.join(':'))
    if (r.mail) keys.add('e:' + r.mail)
    r.keys = [...keys]
    for (const k of keys) join(r.id, k)
  })
  const groups = new Map()
  for (const r of recs) {
    const g = find(r.id)
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g).push(r)
  }
  const day = (iso) => (iso ? dayIn(tz, Date.parse(iso)) : '')
  const rows = []
  for (const g of groups.values()) { // each group is newest first, as the queries came
    const pick = (f) => { for (const r of g) { const v = f(r); if (v) return v } return '' }
    const emails = [...new Set(g.flatMap((r) => r.keys.filter((k) => k[0] === 'e').map((k) => k.slice(2))))]
    const asked = g.filter((r) => r.news)
    const wanted = [...new Set(asked.map((r) => r.mail).filter(Boolean))]
    const live = wanted.filter((e) => !off.has(e))
    const at = g.map((r) => r.at).sort()
    rows.push({
      name: pick((r) => str(r.name, 80)), email: emails[0] || '',
      phone: pick((r) => { const c = classify(r.reach); return c && c[0] === 'p' ? str(r.reach, 60) : '' }),
      line: pick((r) => { const c = classify(r.reach); return c && c[0] === 'h' ? str(r.reach, 60) : '' }),
      first: day(at[0]), last: day(at[at.length - 1]), lastAt: at[at.length - 1],
      bookings: g.filter((r) => r.k === 'b' && r.live).length, messages: g.filter((r) => r.k === 'm').length,
      source: SOURCES.filter(([k]) => g.some((r) => r.k === k)).map(([, w]) => w), // where the person came from: booking, message, signup
      news: !asked.length ? 'no' : wanted.length && !live.length ? 'off' : 'yes',
      mail: live,
    })
  }
  rows.sort((a, b) => b.lastAt.localeCompare(a.lastAt))
  return rows
}

/** The addresses a broadcast goes to: asked for news, not unsubscribed, one each. */
export const recipients = (rows) => [...new Set(rows.flatMap((r) => r.mail))]

/** The list as CSV, with a byte-order mark so a spreadsheet reads Thai. Cells that start like a formula are quoted off. */
export function csv(rows) {
  const cell = (v) => {
    let t = String(v ?? '')
    if (/^[=@\t\r]|^[+-](?!\d)/.test(t)) t = "'" + t
    return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t
  }
  const head = ['Name', 'Email', 'Phone', 'LINE or other', 'First contact', 'Last contact', 'Bookings', 'Messages', 'News', 'Source']
  const lines = [head, ...rows.map((r) => [r.name, r.email, r.phone, r.line, r.first, r.last, r.bookings, r.messages, r.news === 'yes' ? (r.mail.length ? 'yes' : 'yes, no email') : r.news === 'off' ? 'unsubscribed' : 'no', (r.source || []).join(' + ')])]
  return '﻿' + lines.map((l) => l.map(cell).join(',')).join('\r\n') + '\r\n'
}

// ---- yes and no -------------------------------------------------------------------------

/** A new tick of the news box takes the address off the page's unsubscribed list. */
export async function optIn(env, siteId, email) {
  const e = validEmail(email)
  if (e) await env.DB.prepare('DELETE FROM news_off WHERE site_id = ? AND email = ?').bind(siteId, e).run()
}

// ---- the news sign-up box (Nan 2026-10-26) ---------------------------------------------------
// A visitor types an address in the box on an online business page. A confirm email carries a link; the page
// that link opens asks once more, and the button on it is the yes. Until then the address is not a customer.
// The yes joins the page's list like a ticked box does, with the same stop link on every email.

/** The confirm link's key: page id, address, and a signature that fits no other link. */
export async function joinKey(env, siteId, email) {
  const e = validEmail(email)
  return `${siteId}.${b64(e)}.${await sig(env, 'join|' + siteId + '|' + e)}`
}
/** { siteId, email } for a good confirm key, else null. */
export async function readJoinKey(env, key) {
  const [siteId, e64, sg] = String(key || '').split('.')
  const email = unb64(e64 || '')
  if (!siteId || !email || !validEmail(email) || sg !== (await sig(env, 'join|' + siteId + '|' + email))) return null
  return { siteId, email }
}

const day0 = () => new Date().toISOString().slice(0, 10)
/** One try at the box by this sender today: true while under JOIN_TRIES. */
export async function joinTry(env, who) {
  const r = await env.DB.prepare("INSERT INTO quota (who, day, what, n) VALUES (?,?,'signup',1) ON CONFLICT(who, day, what) DO UPDATE SET n = n + 1 RETURNING n").bind(String(who).slice(0, 16), day0()).first()
  return (r?.n || 1) <= JOIN_TRIES
}
const giveBack = (env, who) => env.DB.prepare("UPDATE quota SET n = n - 1 WHERE who = ? AND day = ? AND what = 'newsmail'").bind(who, day0()).run()
/** Room for one more confirm email today, for this page and for all pages. */
async function mayJoin(env, siteId) {
  const mine = 'join:' + siteId.slice(0, 10)
  if (!(await mayCount(env, mine, num(env.JOIN_DAY, JOIN_DAY), 1))) return false
  if (!(await mayCount(env, 'join:all', num(env.JOIN_ALL, JOIN_ALL), 1))) { await giveBack(env, mine); return false }
  return true
}

/** The confirm email: Thai first, the page's language beside it, one button. */
export function joinMail({ title, link, lang }) {
  const [hi1, hi2] = owBoth(lang, 'jHi', { n: title }), [b1, b2] = owBoth(lang, 'jBtn'), [ig1, ig2] = owBoth(lang, 'jIgnore'), [s1, s2] = owBoth(lang, 'jSubject', { n: title })
  return {
    subject: `${s1} · ${s2}`.slice(0, 120),
    html: `<div style="font:17px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1530;max-width:560px">
<h2 style="margin:0 0 12px;font-size:22px">${esc(title)}</h2>
<p style="margin:0 0 4px">${esc(hi1)}</p><p style="margin:0 0 16px;color:#5a4f6a">${esc(hi2)}</p>
<p style="margin:0 0 18px"><a href="${esc(link)}" style="display:inline-block;padding:14px 24px;border-radius:99px;background:#ffb000;color:#000;font-weight:800;text-decoration:none">${esc(b1)} · ${esc(b2)}</a></p>
<p style="margin:0;font-size:14px;color:#5a4f6a">${esc(ig1)}<br>${esc(ig2)}</p></div>`,
    text: `${title}\n\n${hi1}\n${hi2}\n\n${b1} · ${b2}: ${link}\n\n${ig1}\n${ig2}\n`,
  }
}

/** A visitor typed an address. { ok, sent } or { error }: off · email · quota · mail. The answer is the same
 *  whether the address is new, waiting or already on the list, so the box does not tell who is on it. */
export async function joinAsk(env, s, d, { name, email }, origin, rand) {
  if (!d.signup.on) return { error: 'off' }
  const e = validEmail(email)
  if (!e) return { error: 'email' }
  const nm = str(name, 80)
  if (check({ name: nm, reach: e, body: '' }) !== 'ok') return { ok: true, sent: false } // a name the check holds: nothing goes out
  const row = await env.DB.prepare('SELECT id, ok_at, mailed_at FROM signup WHERE site_id = ? AND email = ?').bind(s.id, e).first()
  const off = await env.DB.prepare('SELECT 1 AS x FROM news_off WHERE site_id = ? AND email = ?').bind(s.id, e).first()
  if (row?.ok_at && !off) return { ok: true, sent: false } // already on the list
  if (row?.mailed_at && Date.now() - Date.parse(row.mailed_at) < JOIN_GAP) return { ok: true, sent: false } // a link went a moment ago
  if (!(await mayJoin(env, s.id))) return { error: 'quota' }
  const now = new Date().toISOString()
  let id = row?.id
  if (!id) {
    id = rand(14)
    await env.DB.prepare('INSERT OR IGNORE INTO signup (id, site_id, email, name, at, sender) VALUES (?,?,?,?,?,?)').bind(id, s.id, e, nm, now, null).run()
  } else if (nm) await env.DB.prepare('UPDATE signup SET name = ? WHERE id = ?').bind(nm, id).run()
  const link = `${origin}/j/${await joinKey(env, s.id, e)}`
  const sent = await mail(env, { to: e, ...joinMail({ title: d.name || s.name, link, lang: s.lang }) })
  if (!sent) { await giveBack(env, 'join:' + s.id.slice(0, 10)); await giveBack(env, 'join:all'); return { error: 'mail' } }
  await env.DB.prepare('UPDATE signup SET mailed_at = ?, mails = mails + 1 WHERE site_id = ? AND email = ?').bind(now, s.id, e).run()
  return { ok: true, sent: true }
}

/** The button on the confirm page was pressed: the address is a customer who said yes. { siteId, email } or null. */
export async function joinConfirm(env, key) {
  const k = await readJoinKey(env, key)
  if (!k) return null
  const row = await env.DB.prepare('SELECT id FROM signup WHERE site_id = ? AND email = ?').bind(k.siteId, k.email).first()
  if (!row) return null
  await env.DB.prepare('UPDATE signup SET ok_at = ? WHERE id = ?').bind(new Date().toISOString(), row.id).run()
  await optIn(env, k.siteId, k.email) // a yes after an unsubscribe takes the address off the unsubscribed list
  return k
}

/** The page behind the confirm link: the question with its button, the result with the way out, or the bad link. */
export function joinPage({ lang, title, ask, done, bad, action, leave }) {
  const line = (k, v) => { const [x, y] = owBoth(lang, k, v); return `<span lang="th">${esc(x)}</span><br><span style="opacity:.75;font-size:.8em">${esc(y)}</span>` }
  const msg = bad ? line('jBad') : done ? line('jDone', { n: title }) : line('jAsk', { n: title })
  const btn = (href, k, bg) => `<a href="${esc(href)}" style="display:inline-block;min-height:56px;padding:12px 26px;border-radius:99px;background:${bg};color:#000;font:800 18px system-ui;text-decoration:none">${esc(owBoth(lang, k)[0])}<br><span style="font-weight:600;font-size:.8em">${esc(owBoth(lang, k)[1])}</span></a>`
  const body = bad ? '' : ask
    ? `<form method="post" action="${esc(action)}"><button type="submit" style="min-height:56px;padding:12px 26px;border:0;border-radius:99px;background:#ffb000;color:#000;font:800 18px system-ui;cursor:pointer">${esc(owBoth(lang, 'jYes')[0])}<br><span style="font-weight:600;font-size:.8em">${esc(owBoth(lang, 'jYes')[1])}</span></button></form>`
    : btn(leave, 'jLeave', '#ece3d6')
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Mot Dang</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fff7ec;color:#1c1530;font:20px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center;padding:20px">
<div style="max-width:440px"><h1 style="font-size:26px;margin:0 0 18px">${msg}</h1>${body}</div></body></html>`
}

const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s) => { try { return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))) } catch { return '' } }
async function sig(env, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode((env.SESSION_SECRET || 'dev') + '|news'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)))
  return [...mac].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('')
}
/** The link's key: page id, address, and a signature only the Worker can make. */
export async function unsubKey(env, siteId, email) {
  const e = validEmail(email)
  return `${siteId}.${b64(e)}.${await sig(env, siteId + '|' + e)}`
}
/** { siteId, email } for a good key, else null. */
export async function readKey(env, key) {
  const [siteId, e64, sg] = String(key || '').split('.')
  const email = unb64(e64 || '')
  if (!siteId || !email || !validEmail(email) || sg !== (await sig(env, siteId + '|' + email))) return null
  return { siteId, email }
}
/** Unsubscribe (or take it back). */
export async function setOff(env, siteId, email, off) {
  if (off) await env.DB.prepare('INSERT OR IGNORE INTO news_off (site_id, email, at) VALUES (?,?,?)').bind(siteId, email, new Date().toISOString()).run()
  else await env.DB.prepare('DELETE FROM news_off WHERE site_id = ? AND email = ?').bind(siteId, email).run()
}

/** The page behind the unsubscribe link: the result, and a button to undo it (or to stop again). */
export function unsubPage({ lang, title, done, bad, action, ask }) {
  const line = (k, v) => { const [x, y] = both(lang, k, v); return `<span lang="th">${esc(x)}</span><br><span style="opacity:.75;font-size:.8em">${esc(y)}</span>` }
  const msg = bad ? line('unsubBad') : ask ? line('unsubAsk', { n: title }) : done ? line('unsubDone', { n: title }) : line('unsubBack', { n: title })
  const btn = done ? 'unsubUndo' : 'newsStop'
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Mot Dang</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fff7ec;color:#1c1530;font:20px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center;padding:20px">
<div style="max-width:440px"><h1 style="font-size:26px;margin:0 0 18px">${msg}</h1>
${bad ? '' : `<form method="post" action="${esc(action)}"><input type="hidden" name="undo" value="${done ? '1' : '0'}"><button type="submit" style="min-height:56px;padding:12px 26px;border:0;border-radius:99px;background:${done ? '#ffb000' : '#ece3d6'};color:#000;font:800 18px system-ui;cursor:pointer">${esc(both(lang, btn)[0])}<br><span style="font-weight:600;font-size:.8em">${esc(both(lang, btn)[1])}</span></button></form>`}
</div></body></html>`
}

// ---- the broadcast ----------------------------------------------------------------------

/** What the maker may link to: the page, its sections, and each listing, work, amulet or offer. { k, label, url } */
export function linkOptions(d, name, origin, kind) {
  const page = `${origin}/${name}`
  const o = [{ k: 'page', w: 'n_l_page', url: page }]
  if (d.items.length) o.push({ k: 'menu', w: 'n_l_menu', url: page + '#menu' })
  if (d.svc.length) o.push({ k: 'book', w: 'n_l_book', url: page + (kind === 'online' ? '#packages' : '#book') })
  if (d.rooms.length) o.push({ k: 'rooms', w: 'n_l_rooms', url: page + '#rooms' })
  for (const x of d.camps.slice(0, 10)) o.push({ k: 'c:' + x.id, w: 'n_l_offer', label: x.t, url: page })
  for (const x of d.lists.slice(0, 60)) o.push({ k: 'l:' + x.id, w: 'n_l_list', label: x.t, url: `${page}/l/${x.id}` })
  for (const x of d.works.slice(0, 60)) o.push({ k: 'w:' + x.id, w: 'n_l_work', label: x.t, url: `${page}/w/${x.id}` })
  for (const x of (d.amulets || []).slice(0, 60)) o.push({ k: 'a:' + x.id, w: 'n_l_amulet', label: x.t, url: `${page}/a/${x.id}` })
  return o
}

const monthOf = (tz, ms = Date.now()) => dayIn(tz, ms).slice(0, 7)
const nextMonth = (m) => { const [y, mo] = m.split('-').map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}` }
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : d }

/** Where the maker stands: who would get it, whether this month's went, what went before. */
export async function state(env, s, d, origin) {
  const rows = await list(env, s, d)
  const month = monthOf(d.hours.tz)
  const sent = (await env.DB.prepare('SELECT * FROM news_sent WHERE site_id = ? ORDER BY at DESC LIMIT 12').bind(s.id).all()).results
  const used = sent.find((x) => x.month === month && x.state !== 'failed') || null
  const waiting = (await env.DB.prepare('SELECT COUNT(*) AS n FROM signup WHERE site_id = ? AND ok_at IS NULL').bind(s.id).first())?.n || 0
  return {
    pending: waiting,
    month, next: nextMonth(month), cap: num(env.NEWS_MAX, NEWS_MAX),
    customers: rows.length, yes: rows.filter((r) => r.news === 'yes').length, mail: recipients(rows).length,
    used: used ? { at: used.at, sent: used.sent, failed: used.failed, body: used.body } : null,
    history: sent.map((x) => ({ month: x.month, at: x.at, sent: x.sent, failed: x.failed, body: x.body })),
    links: linkOptions(d, s.name, origin, s.kind).map((x) => ({ k: x.k, w: x.w, label: x.label || '', url: x.url })),
  }
}

/** The text check a broadcast must pass: the message rules, the page rules, the model. 'ok' | 'held' | 'busy' | 'links'. */
export async function checkText(env, text) {
  if (/https?:|www\.|\b[a-z0-9-]+\.(com|net|org|co|me|io|th|app|link|ly)\b/i.test(text)) return 'links'
  if (check({ name: '', reach: '', body: text }) !== 'ok') return 'held'
  if (rules({ about: text }).decision === 'held') return 'held'
  const g = await aiScreen(env.AI, { about: text })
  if (g.hold) return g.cats.some((c) => String(c).startsWith('guard-')) ? 'busy' : 'held'
  return 'ok'
}

/** A day's count of emails of one kind, added to when there is room. true when `n` more fit. */
async function mayCount(env, who, cap, n) {
  const day = new Date().toISOString().slice(0, 10)
  const r = await env.DB.prepare("INSERT INTO quota (who, day, what, n) VALUES (?,?,'newsmail',?) ON CONFLICT(who, day, what) DO UPDATE SET n = n + ? RETURNING n").bind(who, day, n, n).first()
  if ((r?.n || n) > cap) {
    await env.DB.prepare("UPDATE quota SET n = n - ? WHERE who = ? AND day = ? AND what = 'newsmail'").bind(n, who, day).run()
    return false
  }
  return true
}

/** One batch of emails through Resend (up to 100 a call). Returns how many it took. */
async function mailBatch(env, list) {
  if (!env.RESEND_KEY || !list.length) return 0
  let ok = 0
  for (let i = 0; i < list.length; i += 100) {
    const part = list.slice(i, i + 100)
    try {
      const r = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_KEY, 'content-type': 'application/json' },
        body: JSON.stringify(part.map((m) => ({ from: env.MAIL_FROM || 'Mot Dang <pages@motdang.net>', to: [m.to], subject: m.subject, html: m.html, text: m.text, ...(m.replyTo ? { reply_to: m.replyTo } : {}), headers: m.headers }))),
      })
      if (r.ok) ok += part.length
    } catch {}
  }
  return ok
}

/** The email for one person: the maker's words, the link, the page, and the way out. */
export function newsMail({ title, text, link, page, stop, lang, replyTo }) {
  const [t2, o2] = [cw('th', 'newsOpen'), cw(lang === 'my' || lang === 'zh' ? lang : 'en', 'newsOpen')]
  const why = both(lang, 'newsWhy', { n: title }), off = both(lang, 'newsStop')
  const url = link || page
  return {
    subject: `${title}`.slice(0, 100), replyTo,
    html: `<div style="font:17px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1530;max-width:560px">
<p style="margin:0 0 4px;color:#5a4f6a">${esc(cw('th', 'newsFrom'))} · ${esc(cw(lang === 'my' || lang === 'zh' ? lang : 'en', 'newsFrom'))}</p><h2 style="margin:0 0 14px;font-size:24px">${esc(title)}</h2>
<div style="padding:16px 18px;border-radius:14px;background:#fff7ec;border:2px solid #efd9bf;white-space:pre-wrap;font-size:18px">${esc(text)}</div>
<p style="margin:16px 0"><a href="${esc(url)}" style="display:inline-block;padding:14px 24px;border-radius:99px;background:#ffb000;color:#000;font-weight:800;text-decoration:none">${esc(t2)} · ${esc(o2)}</a></p>
<p style="margin:22px 0 0;font-size:14px;color:#5a4f6a">${esc(why[0])}<br>${esc(why[1])}<br><a href="${esc(stop)}" style="color:#1c1530">${esc(off[0])} · ${esc(off[1])}</a></p></div>`,
    text: `${title}\n\n${text}\n\n${url}\n\n${why[0]}\n${why[1]}\n${off[0]} · ${off[1]}: ${stop}\n`,
    headers: { 'List-Unsubscribe': `<${stop}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  }
}

/** Send this month's news. { ok, asked, sent, failed, share } or { error }: empty · links · held · busy · month · nobody · mail · quota. */
export async function broadcast(env, s, d, { text, link }, origin, rand, log) {
  text = str(text, 600)
  if (text.length < 4) return { error: 'empty' }
  const opts = linkOptions(d, s.name, origin, s.kind)
  const chosen = link ? opts.find((x) => x.k === link) : null
  if (link && !chosen) return { error: 'bad' }
  const month = monthOf(d.hours.tz)
  const done = await env.DB.prepare("SELECT 1 AS x FROM news_sent WHERE site_id = ? AND month = ? AND state != 'failed'").bind(s.id, month).first()
  if (done) return { error: 'month' }
  const ck = await checkText(env, text)
  if (ck !== 'ok') { await log(env, s.id, 'news-held', ck); return { error: ck } }
  const rows = await list(env, s, d)
  const to = recipients(rows).slice(0, num(env.NEWS_MAX, NEWS_MAX))
  if (!to.length) return { error: 'nobody' }
  if (!(await mayCount(env, 'news:all', num(env.NEWS_DAY, NEWS_DAY), to.length))) return { error: 'busy' }
  // the month is taken now, so a second press (or a second tab) finds it used
  const id = rand(14)
  try {
    await env.DB.prepare("DELETE FROM news_sent WHERE site_id = ? AND month = ? AND state = 'failed'").bind(s.id, month).run()
    await env.DB.prepare("INSERT INTO news_sent (id, site_id, month, at, body, link, asked, state) VALUES (?,?,?,?,?,?,?,'sending')").bind(id, s.id, month, new Date().toISOString(), text, chosen ? chosen.k : null, to.length).run()
  } catch {
    // another press or tab took the month first: give its share of the day's mail back
    await env.DB.prepare("UPDATE quota SET n = n - ? WHERE who = ? AND day = ? AND what = 'newsmail'").bind(to.length, 'news:all', new Date().toISOString().slice(0, 10)).run()
    return { error: 'month' }
  }
  const title = d.name || s.name
  const page = `${origin}/${s.name}`
  const mails = []
  for (const e of to) {
    const stop = `${origin}/u/${await unsubKey(env, s.id, e)}`
    mails.push({ to: e, ...newsMail({ title, text, link: chosen ? chosen.url : '', page, stop, lang: s.lang, replyTo: validEmail(d.contact.email) }) })
  }
  const sent = await mailBatch(env, mails)
  const failed = to.length - sent
  await env.DB.prepare('UPDATE news_sent SET sent = ?, failed = ?, state = ? WHERE id = ?').bind(sent, failed, sent ? 'done' : 'failed', id).run()
  await log(env, s.id, 'news', `${month} asked ${to.length} sent ${sent}`)
  if (!sent) { await env.DB.prepare("UPDATE quota SET n = n - ? WHERE who = 'news:all' AND day = ? AND what = 'newsmail'").bind(to.length, new Date().toISOString().slice(0, 10)).run(); return { error: 'mail' } }
  return { ok: true, asked: to.length, sent, failed, share: shareLine(text, chosen ? chosen.url : page) }
}

/** The link that opens LINE with the same words ready to send from the maker's own account. */
export const shareLine = (text, url) => 'https://line.me/R/share?text=' + encodeURIComponent(`${text}\n${url}`)
