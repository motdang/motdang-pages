// busy.mjs — a Gold page's bookings and the maker's own calendar, both ways (Nan 2026-10-29, for Fashion King:
// "does booking integrate with his calendar?" … "Yes, both ways").
//   Out: /<name>/bookings.ics?k=<key> — the page's bookings as a calendar the maker adds to Google, Apple or Outlook once.
//        The key is signed with SESSION_SECRET, so only the maker's editor shows it; it carries customers' names.
//   In:  d.book.ical — the maker's own calendar's private address(es). cron.mjs reads them every 30 minutes; the busy
//        times (repeats, moved and cancelled dates, time zones, read by ical.js) are kept in R2 under busy/<site id>/,
//        and freeTimes (book.mjs) closes a service's times that overlap them.
import ICAL from 'ical.js'
import { utcOf, addDays } from '../public/s/extras.mjs'

const MAX_SPANS = 3000
const MAX_STEPS = 5000 // occurrences walked per repeating event

/** The private key in a page's bookings calendar address. */
export async function feedKey(env, siteId, sha) {
  return (await sha([env.SESSION_SECRET || 'dev', 'bookings-ics', siteId].join('|'))).slice(0, 24)
}
export async function feedUrl(env, origin, s, sha) {
  return `${origin}/${s.name}/bookings.ics?k=${await feedKey(env, s.id, sha)}`
}

/** The page's bookings as iCalendar: services at their times, rooms as whole days. Asked-but-not-answered ones
 *  are marked tentative; declined and deleted ones are left out, so a phone that reads the feed again drops them. */
export function bookingsIcs(rows, d, s, origin, describe) {
  const f = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const t = (x) => String(x ?? '').replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n')
  const title = d.name || s.name, stamp = f(Date.now())
  const ev = rows.flatMap((bk) => {
    const x = describe(bk, d, 'en'), room = bk.kind === 'room', asked = bk.status === 'new'
    const what = `${asked ? '? ' : ''}${x.what} · ${bk.name || '—'}${bk.people > 1 ? ' (' + bk.people + ')' : ''}`
    const desc = [asked ? 'Asked, not yet accepted: accept or decline in the Bookings tab.' : 'Booked.', bk.ref ? 'Ref ' + bk.ref : '',
      [bk.reach, bk.email].filter(Boolean).join(' · '), bk.note || '', `${origin}/make`].filter(Boolean).join('\n')
    return ['BEGIN:VEVENT', `UID:${bk.id}@sites.motdang.net`, `DTSTAMP:${stamp}`,
      room ? `DTSTART;VALUE=DATE:${bk.start.replace(/-/g, '')}` : `DTSTART:${f(Date.parse(bk.start))}`,
      room ? `DTEND;VALUE=DATE:${bk.end.replace(/-/g, '')}` : `DTEND:${f(Date.parse(bk.end))}`,
      `SUMMARY:${t(what)}`, `DESCRIPTION:${t(desc)}`, `STATUS:${asked ? 'TENTATIVE' : 'CONFIRMED'}`,
      d.place.addr ? `LOCATION:${t(d.place.addr)}` : '', 'END:VEVENT'].filter(Boolean)
  })
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//motdang.net//bookings//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${t(title + ' · bookings')}`, `X-WR-TIMEZONE:${d.hours.tz}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT30M', 'X-PUBLISHED-TTL:PT30M',
    ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n'
}

/** Busy times in an iCalendar file between `from` and `to` (ms), as merged [start, end] ms pairs.
 *  Free ("show as available") and cancelled events do not count; all-day events take the day in `tz`. */
export function busySpans(text, from, to, tz) {
  const root = new ICAL.Component(ICAL.parse(String(text)))
  for (const z of root.getAllSubcomponents('vtimezone')) { try { ICAL.TimezoneService.register(new ICAL.Timezone(z)) } catch {} }
  const known = (id) => { try { new Intl.DateTimeFormat('en', { timeZone: id }); return true } catch { return false } }
  const p2 = (n) => String(n).padStart(2, '0')
  const day = (t) => `${t.year}-${p2(t.month)}-${p2(t.day)}`
  // an ICAL.Time as ms: UTC, a zone the file describes, an IANA zone, else the page's own zone
  const ms = (t) => {
    if (t.isDate) return utcOf(day(t) + 'T00:00', tz)
    const id = t.timezone || t.zone?.tzid || ''
    if (id === 'UTC' || id === 'Z' || t.zone === ICAL.Timezone.utcTimezone) return t.toUnixTime() * 1000
    if (id && id !== 'floating' && ICAL.TimezoneService.has(id)) return t.toUnixTime() * 1000
    const local = `${day(t)}T${p2(t.hour)}:${p2(t.minute)}`
    return utcOf(local, id && id !== 'floating' && known(id) ? id : tz) + t.second * 1000
  }
  const free = (c) => String(c.getFirstPropertyValue('transp') || '').toUpperCase() === 'TRANSPARENT' || String(c.getFirstPropertyValue('status') || '').toUpperCase() === 'CANCELLED'
  const span = (s, e, allDay) => { const a = ms(s), b = e ? ms(e) : allDay ? utcOf(addDays(day(s), 1) + 'T00:00', tz) : a; return b > from && a < to && b > a ? [a, b] : null }
  const all = root.getAllSubcomponents('vevent')
  const moved = new Map() // UID -> the dates of a repeating event moved or changed on their own
  for (const c of all) if (c.hasProperty('recurrence-id')) { const u = c.getFirstPropertyValue('uid'); if (!moved.has(u)) moved.set(u, []); moved.get(u).push(c) }
  const masters = new Set(all.filter((c) => !c.hasProperty('recurrence-id')).map((c) => c.getFirstPropertyValue('uid')))
  const out = []
  for (const c of all) {
    if (out.length >= MAX_SPANS) break
    let ev
    try { ev = new ICAL.Event(c) } catch { continue }
    // a changed date is walked with its repeating event; one whose event is not in the file stands alone
    if (c.hasProperty('recurrence-id')) { if (!masters.has(ev.uid) && !free(c)) { const x = span(ev.startDate, ev.endDate, ev.startDate.isDate); if (x) out.push(x) } continue }
    if (!ev.startDate) continue
    if (!ev.isRecurring()) { if (!free(c)) { const x = span(ev.startDate, ev.endDate, ev.startDate.isDate); if (x) out.push(x) } continue }
    for (const m of moved.get(ev.uid) || []) { try { ev.relateException(m) } catch {} }
    const it = ev.iterator()
    for (let n = 0, next; n < MAX_STEPS && (next = it.next()); n++) {
      const o = ev.getOccurrenceDetails(next)
      if (ms(o.startDate) >= to) break
      if (free(o.item.component)) continue
      const x = span(o.startDate, o.endDate, o.startDate.isDate)
      if (x) out.push(x)
      if (out.length >= MAX_SPANS) break
    }
  }
  out.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const x of out) { const l = merged.at(-1); if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else merged.push([...x]) }
  return merged
}

export const busyKey = (siteId, h) => `busy/${siteId}/${h}.json`
export async function sha12(t) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))
  return [...new Uint8Array(h)].slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** The maker's busy times now held for a page, from the calendars it lists today: [{ start, end }]. */
export async function busyTimes(env, siteId, d) {
  const urls = d.book?.ical || []
  if (!urls.length || !env.MEDIA) return []
  const got = await Promise.all(urls.map(async (u) => {
    try { const o = await env.MEDIA.get(busyKey(siteId, await sha12(u))); return o ? JSON.parse(await o.text()).spans || [] : [] } catch { return [] }
  }))
  return got.flat().map(([start, end]) => ({ start, end }))
}
