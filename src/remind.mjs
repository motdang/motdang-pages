// remind.mjs — the day-before reminder to a guest (Nan 2026-10-22). For each booking the maker
// accepted (or the page accepted on its own), one email at 18:00 the day before in the page's time
// zone, with the time, the place, a map link, the page's phone and LINE, and the guest page where
// the guest can cancel. The 30-minute cron sends the due ones; remind_email in D1 marks each as
// sent, so no booking gets two. A booking cancelled or declined before then has no reminder.
// The LINE reminder is set from the guest page (guestline.mjs) and goes out through the LINE
// account's own metered door.

import { utcOf, dayIn, addDays } from '../public/s/extras.mjs'
import { lineHref, telHref, dirHref } from '../public/s/render.mjs'
import { both, beside } from '../public/s/words-cust.mjs'
import { describe } from './book.mjs'
import { mail } from './msg.mjs'

export const REMIND_HOUR = '18:00' // the day before, in the page's time zone
export const REMIND_SITE_DAY = 60 // reminders one page sends in a day
export const REMIND_DAY = 400 // reminders all pages send in a day (var REMIND_DAY)

const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,}$/i
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])

/** When the booking starts, in UTC ms. A room's start is a date: the end of that day. */
export function startMs(bk, d) {
  return bk.kind === 'room' ? utcOf(bk.start + 'T23:59', d.hours.tz) : Date.parse(bk.start)
}
/** 18:00 the day before the start day, in the page's time zone, in UTC ms. */
export function dueMs(bk, d) {
  const tz = d.hours.tz
  const startDay = bk.kind === 'room' ? bk.start : dayIn(tz, Date.parse(bk.start))
  return utcOf(addDays(startDay, -1) + 'T' + REMIND_HOUR, tz)
}

/** A link to the place: the pin when the page has one, else a search for the address. */
export function placeLink(d) {
  if (d.place.lat !== null) return dirHref(d.place.lat, d.place.lng)
  return d.place.addr ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(d.place.addr) : ''
}

/** The reminder as email: { subject, html, text }. */
export function reminderMail(s, d, bk, origin) {
  const lang = s.lang
  const title = d.name || s.name
  const x = describe(bk, d, 'th'), y = describe(bk, d, beside(lang))
  const w = (k) => both(lang, k)
  const map = placeLink(d)
  const line = lineHref(d.contact.line)
  const guest = `${origin}/bk/${bk.id}`
  const btn = (href, label, bg = '#ffb000') => `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;border-radius:99px;background:${bg};color:#000;font-weight:800;text-decoration:none">${esc(label)}</a>`
  const row = (k, v) => `<tr><td style="padding:6px 12px 6px 0;color:#5a4f6a;vertical-align:top">${esc(w(k)[0])} · ${esc(w(k)[1])}</td><td style="padding:6px 0;font-weight:700">${v}</td></tr>`
  const tomorrow = both(lang, 'remTomorrow')
  return {
    subject: `${tomorrow[0]} · ${tomorrow[1]} — ${x.what} · ${title}`.slice(0, 140),
    html: `<div style="font:17px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1530;max-width:560px">
<p style="margin:0 0 4px;color:#5a4f6a">${esc(both(lang, 'remSubject')[0])} · ${esc(both(lang, 'remSubject')[1])}${bk.ref ? ' · ' + esc(bk.ref) : ''}</p><h2 style="margin:0 0 12px;font-size:24px">${esc(title)}</h2>
<table style="border-collapse:collapse;font-size:17px">${row('remWhen', `${esc(x.what)}<br>${esc(x.when)}${y.when !== x.when ? `<br><span style="font-weight:400">${esc(y.when)}</span>` : ''}`)}
${d.place.addr ? row('remWhere', esc(d.place.addr)) : ''}${d.contact.phone ? row('remCall', `<a href="${esc(telHref(d.contact.phone))}" style="color:#1c1530">${esc(d.contact.phone)}</a>`) : ''}</table>
<p style="margin:16px 0 4px">${map ? btn(map, `${w('remMap')[0]} · ${w('remMap')[1]}`) : ''}${line ? btn(line, 'LINE', '#06c755') : ''}</p>
<p style="margin:8px 0 0"><a href="${esc(guest)}" style="color:#1c1530;font-weight:700">${esc(w('remManage')[0])} · ${esc(w('remManage')[1])}</a></p></div>`,
    text: `${tomorrow[0]} · ${tomorrow[1]}\n${title}\n${x.what}\n${x.when}\n${d.place.addr ? d.place.addr + '\n' : ''}${map ? map + '\n' : ''}${d.contact.phone ? d.contact.phone + '\n' : ''}${line ? line + '\n' : ''}\n${w('remManage')[0]} · ${w('remManage')[1]}: ${guest}\n`,
  }
}

/** The same reminder as one LINE message. */
export function reminderLine(s, d, bk, origin) {
  const lang = s.lang
  const title = d.name || s.name
  const x = describe(bk, d, 'th'), y = describe(bk, d, beside(lang))
  const tomorrow = both(lang, 'remTomorrow')
  const map = placeLink(d)
  return [`${tomorrow[0]} · ${tomorrow[1]} — ${title}`, `${x.what}`, `${x.when}`, y.when !== x.when ? y.when : '', d.place.addr || '', map, d.contact.phone ? '☎ ' + d.contact.phone : '', `${origin}/bk/${bk.id}`].filter(Boolean).join('\n')
}

async function mayRemind(env, siteId, all) {
  const day = new Date().toISOString().slice(0, 10)
  const up = (who) => env.DB.prepare("INSERT INTO quota (who, day, what, n) VALUES (?,?,'remind',1) ON CONFLICT(who, day, what) DO UPDATE SET n = n + 1 RETURNING n").bind(who, day).first()
  if (((await up('remind:' + siteId.slice(0, 10)))?.n || 1) > REMIND_SITE_DAY) return false
  return ((await up('remind:all'))?.n || 1) <= all
}

/** The half-hourly job: send the reminders that are due. Returns how many went. */
export async function run(env, { isGold, normalize, origin, now = Date.now(), max = 40 }) {
  if (!env.RESEND_KEY) return 0
  const lo = new Date(now - 864e5).toISOString().slice(0, 10)
  const hi = new Date(now + 3 * 864e5).toISOString()
  const rows = (await env.DB.prepare("SELECT * FROM booking WHERE status = 'ok' AND remind_email IS NULL AND email IS NOT NULL AND email != '' AND start >= ? AND start <= ? ORDER BY start LIMIT 300").bind(lo, hi).all()).results
  const sites = new Map()
  let sent = 0
  for (const bk of rows) {
    if (sent >= max) break
    if (!EMAIL.test(bk.email)) { await env.DB.prepare("UPDATE booking SET remind_email = 'skip' WHERE id = ?").bind(bk.id).run(); continue }
    if (!sites.has(bk.site_id)) sites.set(bk.site_id, await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(bk.site_id).first())
    const s = sites.get(bk.site_id)
    if (!s || s.status !== 'live' || !isGold(s)) continue
    const d = normalize(JSON.parse(s.d))
    const due = dueMs(bk, d)
    if (now < due) continue
    // started already, or accepted after the reminder time: the acceptance email said it
    if (now >= startMs(bk, d) || (bk.ok_at && bk.ok_at >= new Date(due).toISOString())) { await env.DB.prepare("UPDATE booking SET remind_email = 'skip' WHERE id = ? AND remind_email IS NULL").bind(bk.id).run(); continue }
    if (!(await mayRemind(env, s.id, Number(env.REMIND_DAY) > 0 ? Number(env.REMIND_DAY) : REMIND_DAY))) continue
    // claim the booking first, so a second run cannot send it again
    const claim = await env.DB.prepare('UPDATE booking SET remind_email = ? WHERE id = ? AND remind_email IS NULL').bind(new Date(now).toISOString(), bk.id).run()
    if (!claim.meta?.changes) continue
    const m = reminderMail(s, d, bk, origin)
    const ok = await mail(env, { to: bk.email, ...m, replyTo: EMAIL.test(d.contact.email || '') ? d.contact.email : '' })
    if (ok) sent++
    else await env.DB.prepare('UPDATE booking SET remind_email = NULL WHERE id = ?').bind(bk.id).run() // tries again at the next run
  }
  return sent
}
