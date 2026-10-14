// book.mjs — readers asking a Gold page for a time (a service) or for nights
// (a room). The page's own hours, step and lead time decide the free times
// (extras.mjs slots(), the same arithmetic the page uses); a room's nights
// are free unless a booking or another site's calendar holds them. The maker
// accepts or declines in the builder; with "accept on its own" a free time is
// booked at once. A deposit is the maker's own PromptPay: the money goes from
// the reader's bank to the maker's, and Mot Dang only draws the QR.

import { qrSvg } from '../public/s/render.mjs'
import { slots, utcOf, dayIn, addDays, stayTotal } from '../public/s/extras.mjs'
import { promptPayPayload } from './promptpay.mjs'
import { mail, mayMail } from './msg.mjs'
import { squash } from './screen.mjs'

const DAY = /^\d{4}-\d{2}-\d{2}$/
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n)
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,}$/i
export const MAX_NIGHTS = 60

/** Bookings that hold a service's time around `day`, one entry per person. */
async function heldTimes(env, siteId, item, day, tz) {
  const lo = new Date(utcOf(day + 'T00:00', tz) - 864e5).toISOString()
  const hi = new Date(utcOf(day + 'T00:00', tz) + 2 * 864e5).toISOString()
  const rows = (await env.DB.prepare("SELECT start, end, people FROM booking WHERE site_id = ? AND kind = 'svc' AND item = ? AND status IN ('new','ok') AND start < ? AND end > ?")
    .bind(siteId, item, hi, lo).all()).results
  return rows.flatMap((r) => Array.from({ length: Math.max(1, r.people) }, () => ({ start: Date.parse(r.start), end: Date.parse(r.end) })))
}

/** Free start times for a service on a day: [{ t, left }]. */
export async function freeTimes(env, s, d, item, day, now = Date.now()) {
  const svc = d.svc.find((x) => x.id === item)
  const tz = d.hours.tz
  if (!svc || !DAY.test(day)) return []
  const today = dayIn(tz, now)
  if (day < today || day > addDays(today, d.book.ahead)) return []
  return slots(d, svc, day, await heldTimes(env, s.id, item, day, tz), now).map((x) => ({ t: x.t, left: x.left }))
}

/** Rooms of a type in use each night from today on: bookings asked, accepted or closed by the hotel,
 *  and one room for each other site's calendar that has the night. Map day → count. */
export async function nightCounts(env, s, d, room, now = Date.now()) {
  const today = dayIn(d.hours.tz, now)
  const b = (await env.DB.prepare("SELECT start, end FROM booking WHERE site_id = ? AND kind = 'room' AND item = ? AND status IN ('new','ok','hold') AND end > ?").bind(s.id, room, today).all()).results
  const bl = (await env.DB.prepare('SELECT day FROM blocks WHERE site_id = ? AND room = ? AND day >= ?').bind(s.id, room, today).all()).results
  const n = new Map()
  for (const x of b) for (let day = x.start < today ? today : x.start; day < x.end; day = addDays(day, 1)) n.set(day, (n.get(day) || 0) + 1)
  for (const x of bl) n.set(x.day, (n.get(x.day) || 0) + 1)
  return n
}
/** Nights with no room of the type left. */
export async function takenNights(env, s, d, room, now = Date.now()) {
  const units = d.rooms.find((x) => x.id === room)?.units || 1
  const n = await nightCounts(env, s, d, room, now)
  return new Set([...n].filter(([, c]) => c >= units).map(([day]) => day))
}

/** A reader's ask, checked against what is free now. { ok, id, status, deposit } or { error }. */
export async function ask(env, s, d, b, who, now = Date.now()) {
  const kind = b.kind === 'room' ? 'room' : 'svc'
  const name = str(b.name, 80), reach = str(b.reach, 120), note = str(b.note, 600)
  const email = EMAIL.test(str(b.email, 254)) ? str(b.email, 254) : ''
  if (!name || !reach) return { error: 'empty' }
  const q = squash(`${name} ${reach} ${note}`)
  if (/บาคาร่า|baccarat|สล็อต|casino|ufabet|viagra/.test(q) || (note.match(/https?:\/\//g) || []).length >= 2) return { error: 'held' }
  const tz = d.hours.tz
  let start, end, people = 1, item = str(b.item, 12), total = null, nights = null
  if (kind === 'svc') {
    const svc = d.svc.find((x) => x.id === item)
    if (!svc || !DAY.test(b.day) || !HHMM.test(b.t)) return { error: 'bad' }
    people = Math.min(svc.cap, Math.max(1, Math.round(Number(b.people) || 1)))
    const free = await freeTimes(env, s, d, item, b.day, now)
    const hit = free.find((x) => x.t === b.t)
    if (!hit || hit.left < people) return { error: 'taken' }
    const ms = utcOf(b.day + 'T' + b.t, tz)
    start = new Date(ms).toISOString(); end = new Date(ms + svc.mins * 60e3).toISOString()
  } else {
    const room = d.rooms.find((x) => x.id === item)
    if (!room || !DAY.test(b.day) || !DAY.test(b.out) || b.out <= b.day) return { error: 'bad' }
    const today = dayIn(tz, now)
    const nights = Math.round((Date.parse(b.out) - Date.parse(b.day)) / 864e5)
    if (b.day < today || nights > MAX_NIGHTS || b.day > addDays(today, 540)) return { error: 'bad' }
    if (nights < room.min) return { error: 'min', min: room.min }
    people = Math.min(room.guests, Math.max(1, Math.round(Number(b.people) || 1)))
    const taken = await takenNights(env, s, d, item, now)
    for (let x = b.day; x < b.out; x = addDays(x, 1)) if (taken.has(x)) return { error: 'taken' }
    start = b.day; end = b.out
    const t = stayTotal(room, start, end)
    total = t.total ? String(t.total) : null
  }
  const id = rand(14)
  const ref = 'MD' + id.slice(0, 6).toUpperCase()
  const status = (kind === 'svc' ? d.book.auto : d.stay.instant) ? 'ok' : 'new'
  await env.DB.prepare('INSERT INTO booking (id, site_id, kind, item, start, end, people, name, reach, email, note, status, at, sender, total, nights, ref) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, s.id, kind, item, start, end, people, name, reach, email, note, status, new Date(now).toISOString(), who.slice(0, 16), total, nights, ref).run()
  const bk = { id, kind, item, start, end, total, ref, status }
  return { ok: true, id, ref, status, total: total ? Number(total) : null, ...payFor(d, s, bk) }
}

/** What the guest pays the hotel now, and how: { deposit: { amount, qr } } or { link } or nothing.
 *  The money goes from the guest to the hotel; Mot Dang draws the QR or shows the hotel's own link. */
export function payFor(d, s, bk) {
  if (bk.kind !== 'room') return { deposit: deposit(d, s, bk.id) }
  const st = d.stay, total = Number(bk.total) || 0
  const room = d.rooms.find((x) => x.id === bk.item)
  const due = st.dep === 'full' ? total : st.dep === 'pct30' ? Math.round(total * 0.3) : st.dep === 'night1' && room ? stayTotal(room, bk.start, addDays(bk.start, 1)).total : 0
  if (st.pay === 'link' && st.link) return { link: st.link, due }
  const pp = st.pay === 'pp' ? st.pp || d.book.pp : ''
  if (!pp || !(due > 0)) return { due }
  try {
    const payload = promptPayPayload({ payeeId: pp, satang: Math.round(due * 100), merchantName: (d.name || s.name).replace(/[^\x20-\x7e]/g, '') || 'Mot Dang', ref: bk.ref || 'BK' + bk.id.slice(0, 8).toUpperCase() })
    return { due, deposit: { amount: due, qr: qrSvg(payload, { dark: '#0e1f3d', light: '#ffffff', label: 'PromptPay' }) } }
  } catch { return { due } }
}

/** The deposit QR, when the maker set an amount and a PromptPay number. */
export function deposit(d, s, id) {
  const amt = Number(d.book.deposit)
  if (!d.book.pp || !(amt > 0) || amt > 1e6) return null
  try {
    const payload = promptPayPayload({ payeeId: d.book.pp, satang: Math.round(amt * 100), merchantName: (d.name || s.name).replace(/[^\x20-\x7e]/g, '') || 'Mot Dang', ref: 'BK' + id.slice(0, 8).toUpperCase() })
    return { amount: amt, qr: qrSvg(payload, { dark: '#0e1f3d', light: '#ffffff', label: 'PromptPay' }) }
  } catch { return null }
}

/** One booking as the words the maker and the reader read. */
export function describe(bk, d, lang = 'th') {
  const tz = d.hours.tz
  if (bk.kind === 'room') {
    const room = d.rooms.find((x) => x.id === bk.item)
    const nights = Math.round((Date.parse(bk.end) - Date.parse(bk.start)) / 864e5)
    const f = (x) => { try { return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(x + 'T00:00:00Z')) } catch { return x } }
    const tot = Number(bk.total) ? ` · ฿${new Intl.NumberFormat('en').format(Number(bk.total))}` : ''
    return { what: room ? room.n : bk.item, when: `${f(bk.start)} → ${f(bk.end)} · ${nights} ${nights === 1 ? 'night · คืน' : 'nights · คืน'}${tot}` }
  }
  const svc = d.svc.find((x) => x.id === bk.item)
  let when
  try { when = new Intl.DateTimeFormat(lang, { dateStyle: 'full', timeStyle: 'short', timeZone: tz }).format(new Date(bk.start)) } catch { when = bk.start }
  return { what: svc ? svc.n : bk.item, when }
}

/** Mail to the maker: someone asked (or booked). */
export async function tellMaker(env, s, d, bk, origin) {
  if (!s.notify_ok || !s.notify_email || !(await mayMail(env, s.id))) return false
  const title = d.name || s.name
  const x = describe(bk, d, 'th')
  const head = bk.status === 'ok' ? 'จองแล้ว · Booked' : 'มีคนขอจอง · A booking to answer'
  return mail(env, {
    to: s.notify_email, subject: `${head} — ${x.what} · ${title}`.slice(0, 140), replyTo: EMAIL.test(bk.email || '') ? bk.email : '',
    html: `<div style="font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1530;max-width:560px">
<p style="margin:0 0 4px;color:#5a4f6a">${esc(head)}${bk.ref ? ' · ' + esc(bk.ref) : ''}</p><h2 style="margin:0 0 12px;font-size:22px">${esc(x.what)}</h2>
<p style="margin:0 0 12px;font-size:19px;font-weight:700">${esc(x.when)}</p>
<p style="margin:0"><b>${esc(bk.name)}</b> · ${esc(bk.reach)}${bk.email ? ' · ' + esc(bk.email) : ''}${bk.people > 1 ? ' · ' + bk.people + ' คน · people' : ''}</p>
${bk.note ? `<div style="margin:12px 0 0;padding:12px 14px;border-radius:12px;background:#fff7ec;border:2px solid #efd9bf;white-space:pre-wrap">${esc(bk.note)}</div>` : ''}
<p style="margin:16px 0 0;font-size:14px;color:#5a4f6a">ตอบรับหรือปฏิเสธในแท็บ "การจอง" · Accept or decline in the Bookings tab: <a href="${origin}/make">${origin.replace(/^https:\/\//, '')}/make</a></p></div>`,
    text: `${head}\n${x.what}\n${x.when}\n${bk.name} · ${bk.reach}${bk.email ? ' · ' + bk.email : ''}\n${bk.note || ''}\n\n${origin}/make\n`,
  })
}

/** Mail to the reader, when they left an address: asked, accepted or declined. */
export async function tellReader(env, s, d, bk, origin, lang) {
  if (!EMAIL.test(bk.email || '') || !(await mayMail(env, s.id))) return false
  const title = d.name || s.name
  const x = describe(bk, d, lang)
  const words = {
    new: ['ส่งคำขอจองแล้ว', 'Your booking request is sent', `${title} จะตอบกลับ`, `${title} will answer you.`],
    ok: ['จองแล้ว', 'Booked', 'แล้วพบกัน', 'See you then.'],
    no: ['ไม่สามารถรับจองได้', 'Not available', 'ลองเลือกเวลาอื่นในหน้าเว็บ', 'Pick another time on the page.'],
  }[bk.status] || null
  if (!words) return false
  const page = `${origin}/${s.name}`
  const mine = bk.kind === 'room' ? `<p><a href="${origin}/bk/${bk.id}" style="display:inline-block;padding:12px 20px;border-radius:99px;background:#1c1530;color:#fff;font-weight:800;text-decoration:none">การจองของคุณ · Your booking${bk.ref ? ' ' + esc(bk.ref) : ''}</a></p>` : ''
  const cal = bk.status === 'ok' ? `<p><a href="${origin}/api/bk/${bk.id}.ics" style="display:inline-block;padding:12px 20px;border-radius:99px;background:#ffb000;color:#000;font-weight:800;text-decoration:none">ใส่ปฏิทิน · Add to calendar</a></p>` : ''
  return mail(env, {
    to: bk.email, subject: `${words[0]} · ${words[1]} — ${title}`.slice(0, 140), replyTo: EMAIL.test(d.contact.email || '') ? d.contact.email : '',
    html: `<div style="font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1530;max-width:560px">
<p style="margin:0 0 4px;color:#5a4f6a">${esc(words[0])} · ${esc(words[1])}</p><h2 style="margin:0 0 10px;font-size:22px">${esc(title)}</h2>
<p style="margin:0;font-size:18px"><b>${esc(x.what)}</b><br>${esc(x.when)}</p><p>${esc(words[2])} · ${esc(words[3])}</p>${cal}${mine}
${d.contact.phone ? `<p>☎ ${esc(d.contact.phone)}</p>` : ''}<p style="font-size:14px;color:#5a4f6a"><a href="${page}">${esc(page.replace(/^https:\/\//, ''))}</a></p></div>`,
    text: `${words[0]} · ${words[1]}\n${title}\n${x.what}\n${x.when}\n${words[2]} · ${words[3]}\n${bk.kind === 'room' ? origin + '/bk/' + bk.id + '\n' : ''}${page}\n`,
  })
}

/** A booked time as iCalendar, for the reader's phone. */
export function bookingIcs(bk, d, s) {
  const f = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const t = (x) => String(x).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  const x = describe(bk, d, 'en')
  const allDay = bk.kind === 'room'
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//motdang.net//bookings//EN', 'BEGIN:VEVENT', `UID:${bk.id}@sites.motdang.net`, `DTSTAMP:${f(Date.now())}`,
    allDay ? `DTSTART;VALUE=DATE:${bk.start.replace(/-/g, '')}` : `DTSTART:${f(Date.parse(bk.start))}`,
    allDay ? `DTEND;VALUE=DATE:${bk.end.replace(/-/g, '')}` : `DTEND:${f(Date.parse(bk.end))}`,
    `SUMMARY:${t(`${x.what} · ${d.name || s.name}`)}`, d.place.addr ? `LOCATION:${t(d.place.addr)}` : '', d.place.lat !== null ? `GEO:${d.place.lat};${d.place.lng}` : '',
    `URL:https://sites.motdang.net/${s.name}`, 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n') + '\r\n'
}

function rand(n) {
  const a = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (const x of crypto.getRandomValues(new Uint8Array(n))) s += a[x % 36]
  return s
}
