// extras.mjs — the parts of a page added 2026-10-14 (Nan: "allow users to browse
// dingbats, customize maps, run calendars and timed campaigns … special
// functionality for real estate listings, hotels, businesses that run heavy
// bookings"): the map's look, a calendar, timed campaigns, bookings, rooms and
// listings. render.mjs calls these; the Worker uses the same time and slot
// arithmetic, so the page and the server agree on what a free time is.

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n)
const ID = /^[a-z0-9]{4,12}$/
const PHOTO_ID = /^[a-z0-9]{12,24}$/
const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
const DAY = /^\d{4}-\d{2}-\d{2}$/
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const num = (v, lo, hi, dflt) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : dflt }
const idOf = (v, i) => (ID.test(v || '') ? v : 'x' + i.toString(36).padStart(3, '0'))
const uniqIds = (arr) => { const seen = new Set(); return arr.map((x, i) => { let id = x.id; while (seen.has(id)) id = 'x' + (i + seen.size).toString(36) + 'z'; seen.add(id); return { ...x, id } }) }

export const MAP_STYLES = ['doodle', 'terrain', 'streets']
export const MAP_NEAR = { near: 60000, mid: 34000, far: 14000 }
export const MAX = { cal: 40, camps: 10, svc: 30, rooms: 20, lists: 60, spotsFree: 3, spotsGold: 20, itemPhotos: 10 }
export const DEALS = ['sale', 'rent']
export const STATUSES = ['open', 'reserved', 'sold', 'rented']
export const UNITS = ['m2', 'rai', 'sqw']

/** The new parts of `d`, cut to size and typed. Called from normalize(). */
export function normalizeExtras(d, o) {
  const m = d.map || {}
  o.map = { style: MAP_STYLES.includes(m.style) ? m.style : 'doodle', near: MAP_NEAR[m.near] ? m.near : 'mid' }

  o.cal = uniqIds((Array.isArray(d.cal) ? d.cal : []).map((x, i) => ({
    id: idOf(x?.id, i), t: str(x?.t, 80), note: str(x?.note, 240),
    start: LOCAL_DT.test(x?.start || '') ? x.start : '', end: HHMM.test(x?.end || '') ? x.end : '',
    rep: ['weekly', 'monthly'].includes(x?.rep) ? x.rep : '', until: DAY.test(x?.until || '') ? x.until : '',
  })).filter((x) => x.t && x.start).slice(0, MAX.cal))

  o.camps = uniqIds((Array.isArray(d.camps) ? d.camps : []).map((x, i) => ({
    id: idOf(x?.id, i), t: str(x?.t, 90), note: str(x?.note, 240), code: str(x?.code, 24).replace(/[^\p{L}\p{N}_-]/gu, ''),
    start: LOCAL_DT.test(x?.start || '') ? x.start : '', end: LOCAL_DT.test(x?.end || '') ? x.end : '',
  })).filter((x) => x.t && x.start && x.end && x.end > x.start).slice(0, MAX.camps))

  o.svc = uniqIds((Array.isArray(d.svc) ? d.svc : []).map((x, i) => ({
    id: idOf(x?.id, i), n: str(x?.n, 80), p: str(x?.p, 24), note: str(x?.note, 200),
    mins: num(x?.mins, 10, 720, 60), cap: num(x?.cap, 1, 50, 1),
  })).filter((x) => x.n).slice(0, MAX.svc))
  const b = d.book || {}
  o.book = {
    step: [15, 30, 60, 120].includes(Number(b.step)) ? Number(b.step) : 30,
    lead: num(b.lead, 0, 168, 2), ahead: num(b.ahead, 1, 180, 30),
    auto: !!b.auto, deposit: str(b.deposit, 12).replace(/[^\d.]/g, ''),
    pp: str(b.pp, 20).replace(/[^\d]/g, ''),
  }

  o.rooms = uniqIds((Array.isArray(d.rooms) ? d.rooms : []).map((x, i) => ({
    id: idOf(x?.id, i), n: str(x?.n, 80), p: str(x?.p, 24), note: str(x?.note, 400),
    guests: num(x?.guests, 1, 40, 2), beds: str(x?.beds, 60),
    units: num(x?.units, 1, 200, 1), p2: str(x?.p2, 24), min: num(x?.min, 1, 30, 1),
    rates: (Array.isArray(x?.rates) ? x.rates : []).map((r) => ({ from: DAY.test(r?.from || '') ? r.from : '', to: DAY.test(r?.to || '') ? r.to : '', p: str(r?.p, 24) }))
      .filter((r) => r.from && r.to && r.to >= r.from && amount(r.p) > 0).slice(0, 8),
    photos: (Array.isArray(x?.photos) ? x.photos : []).filter((p) => PHOTO_ID.test(p)).slice(0, MAX.itemPhotos),
    ical: (Array.isArray(x?.ical) ? x.ical : []).map((u) => icalUrl(u)).filter(Boolean).slice(0, 4),
  })).filter((x) => x.n).slice(0, MAX.rooms))

  const st = d.stay || {}
  o.stay = {
    in: HHMM.test(st.in || '') ? st.in : '14:00', out: HHMM.test(st.out || '') ? st.out : '12:00',
    instant: st.instant !== false, pay: ['hotel', 'pp', 'link'].includes(st.pay) ? st.pay : 'hotel',
    dep: ['none', 'night1', 'pct30', 'full'].includes(st.dep) ? st.dep : 'none',
    pp: str(st.pp, 20).replace(/[^\d]/g, ''), link: payLink(st.link), policy: str(st.policy, 600),
  }

  o.lists = uniqIds((Array.isArray(d.lists) ? d.lists : []).map((x, i) => {
    const lat = Number(x?.lat), lng = Number(x?.lng)
    const pin = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 85 && Math.abs(lng) <= 180 && x?.lat !== '' && x?.lat != null
    return {
      id: idOf(x?.id, i), t: str(x?.t, 100), note: str(x?.note, 2000), p: str(x?.p, 24),
      deal: DEALS.includes(x?.deal) ? x.deal : 'sale', status: STATUSES.includes(x?.status) ? x.status : 'open',
      area: str(x?.area, 16).replace(/[^\d.,]/g, ''), unit: UNITS.includes(x?.unit) ? x.unit : 'm2',
      beds: num(x?.beds, 0, 50, 0), baths: num(x?.baths, 0, 50, 0), kind: str(x?.kind, 40),
      photos: (Array.isArray(x?.photos) ? x.photos : []).filter((p) => PHOTO_ID.test(p)).slice(0, MAX.itemPhotos),
      lat: pin ? Math.round(lat * 1e6) / 1e6 : null, lng: pin ? Math.round(lng * 1e6) / 1e6 : null,
    }
  }).filter((x) => x.t).slice(0, MAX.lists))
  return o
}

/** A hotel's own payment page (Stripe, PayPal, Omise, a bank's link): any https address, else ''. */
function payLink(u) {
  let s2 = str(u, 400)
  if (!s2) return ''
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s2)) s2 = 'https://' + s2
  try { const x = new URL(s2); return x.protocol === 'https:' && x.hostname.includes('.') && !x.username && !x.password ? x.toString() : '' } catch { return '' }
}

/** A price as a number: '1,200' → 1200, words → 0. */
export function amount(p) { const n = Number(String(p || '').replace(/[,\s]/g, '')); return Number.isFinite(n) && n > 0 ? n : 0 }

/** One night's price for a room: a season's price, else the weekend price on Friday and Saturday nights, else the price. */
export function nightPrice(room, day) {
  const r = room.rates.find((x) => x.from <= day && day <= x.to)
  if (r) return amount(r.p)
  const w = new Date(day + 'T00:00:00Z').getUTCDay()
  if ((w === 5 || w === 6) && amount(room.p2)) return amount(room.p2)
  return amount(room.p)
}
/** The nights from `a` to the morning `b`, and their sum. */
export function stayTotal(room, a, b) {
  let total = 0, nights = 0
  for (let x = a; x < b && nights < 400; x = addDays(x, 1)) { total += nightPrice(room, x); nights++ }
  return { total, nights }
}

/** An Airbnb / Booking.com / Agoda / VRBO / Google calendar address, else ''. */
export function icalUrl(u) {
  let s = str(u, 600)
  if (!s) return ''
  if (/^webcal:\/\//i.test(s)) s = 'https://' + s.slice(9)
  try {
    const x = new URL(s)
    if (x.protocol !== 'https:' || x.username || x.password) return ''
    if (!/\.(airbnb\.[a-z.]+|booking\.com|agoda\.com|vrbo\.com|expedia\.com|google\.com|tripadvisor\.com|hostaway\.com|lodgify\.com|beds24\.com|icloud\.com|outlook\.com|office365\.com)$/i.test('.' + x.hostname)) return ''
    return x.toString()
  } catch { return '' }
}

// ---- time ---------------------------------------------------------------------------

/** UTC ms for a wall-clock 'YYYY-MM-DDTHH:MM' in `tz` (same method as render.mjs). */
export function utcOf(local, tz) {
  const [d, t] = local.split('T')
  const [Y, M, D] = d.split('-').map(Number)
  const [h, m] = t.split(':').map(Number)
  const guess = Date.UTC(Y, M - 1, D, h, m)
  const off = (ms) => {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - ms
  }
  let u = guess - off(guess)
  u = guess - off(u)
  return u
}
/** 'YYYY-MM-DD' of `ms` in `tz`. */
export function dayIn(tz, ms) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
  return f.format(new Date(ms))
}
const addDays = (day, n) => { const t = new Date(day + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10) }
const wd = (day) => (new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7 // Mon = 0
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export { addDays }

/** The next `n` dates of a calendar, soonest first: { item, start, end, day } in UTC ms. */
export function upcoming(cal, tz, now = Date.now(), n = 8, horizon = 400) {
  const out = []
  const today = dayIn(tz, now)
  const last0 = addDays(today, horizon)
  for (const it of cal) {
    const [day0, t0] = it.start.split('T')
    const dur = it.end ? ((toMin(it.end) - toMin(t0) + 1440) % 1440 || 1440) * 60e3 : 2 * 3600e3
    const mine = []
    const push = (day) => { const s = utcOf(day + 'T' + t0, tz); if (s + dur > now) mine.push({ item: it, start: s, end: s + dur, day }) }
    const last = it.until && it.until < last0 ? it.until : last0
    if (!it.rep) push(day0)
    else if (it.rep === 'weekly') {
      let d = day0
      if (d < today) d = addDays(day0, Math.floor((Date.parse(today) - Date.parse(day0)) / 864e5 / 7) * 7)
      for (let k = 0; k < 70 && d <= last && mine.length < n; k++, d = addDays(d, 7)) push(d)
    } else {
      const [Y, M, D] = day0.split('-').map(Number)
      for (let k = 0; k < 400 && mine.length < n; k++) {
        const t = new Date(Date.UTC(Y, M - 1 + k, 1))
        const dim = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate()
        const d = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(D, dim)).padStart(2, '0')}`
        if (d > last) break
        if (d >= addDays(today, -1)) push(d)
      }
    }
    out.push(...mine)
  }
  return out.sort((a, b) => a.start - b.start).slice(0, n)
}

/** Campaigns showing at `now`, and the next to start. */
export function campsNow(camps, tz, now = Date.now()) {
  return camps.map((c) => ({ c, s: utcOf(c.start, tz), e: utcOf(c.end, tz) })).filter((x) => x.s <= now && now < x.e)
}

/** Free start times for service `svc` on `day` ('YYYY-MM-DD' in the page's tz):
 *  inside the hours, `book.step` apart, `book.lead` hours from now, fewer than
 *  `svc.cap` bookings overlapping. taken = [{ start, end }] in UTC ms. */
export function slots(d, svc, day, taken, now = Date.now()) {
  const tz = d.hours.tz
  const h = d.hours
  const ranges = h.on && !h.always ? (h.week[wd(day)] || []) : [['00:00', '24:00']]
  const out = []
  const earliest = now + d.book.lead * 3600e3
  for (const [a, b] of ranges) {
    const s0 = toMin(a), e0 = b === '24:00' ? 1440 : toMin(b) <= s0 ? toMin(b) + 1440 : toMin(b)
    for (let m = s0; m + svc.mins <= e0; m += d.book.step) {
      const start = utcOf(day + 'T' + hhmm(m), tz) + (m >= 1440 ? 864e5 : 0)
      const end = start + svc.mins * 60e3
      if (start < earliest) continue
      const n = taken.filter((t) => t.start < end && start < t.end).length
      if (n < svc.cap) out.push({ t: hhmm(m), start, left: svc.cap - n })
    }
  }
  return out
}

/** Nights a room is taken, as 'YYYY-MM-DD' (the night of that date). */
export function nightsOf(bookings, blocks) {
  const s = new Set(blocks)
  for (const b of bookings) for (let d = b.start; d < b.end; d = addDays(d, 1)) s.add(d)
  return s
}

/** Dates in an iCalendar file as nights taken: each VEVENT's DTSTART..DTEND (exclusive). */
export function icalNights(text, horizonDays = 400, today = new Date().toISOString().slice(0, 10)) {
  const out = new Set()
  const last = addDays(today, horizonDays)
  const unfold = String(text).replace(/\r?\n[ \t]/g, '')
  for (const ev of unfold.split('BEGIN:VEVENT').slice(1)) {
    const body = ev.split('END:VEVENT')[0]
    const g = (k) => { const m = new RegExp('^' + k + '(?:;[^:\\n]*)?:(\\d{8})', 'm').exec(body); return m ? `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}` : '' }
    const s = g('DTSTART')
    if (!s) continue
    const e = g('DTEND') || addDays(s, 1)
    for (let d = s < today ? today : s, k = 0; d < e && d <= last && k < 400; d = addDays(d, 1), k++) out.add(d)
  }
  return [...out].sort()
}

/** A room's taken nights as iCalendar, for Airbnb, Booking.com and Agoda to read. */
export function roomIcs(siteName, room, nights) {
  const days = [...nights].sort()
  const runs = []
  for (const d of days) { const r = runs.at(-1); if (r && addDays(r[1], 0) === d) r[1] = addDays(d, 1); else runs.push([d, addDays(d, 1)]) }
  const f = (d) => d.replace(/-/g, '')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//motdang.net//rooms//EN', 'CALSCALE:GREGORIAN',
    ...runs.flatMap(([a, b]) => ['BEGIN:VEVENT', `UID:${siteName}-${room.id}-${f(a)}@sites.motdang.net`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${f(a)}`, `DTEND;VALUE=DATE:${f(b)}`, 'SUMMARY:Not available', 'END:VEVENT']),
    'END:VCALENDAR'].join('\r\n') + '\r\n'
}

/** The calendar as iCalendar a phone can follow (weekly and monthly as RRULE). */
export function calIcs(siteName, title, cal, tz, addr) {
  const t = (x) => String(x).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  const f = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const stamp = f(Date.now())
  const ev = cal.flatMap((it) => {
    const s = utcOf(it.start, tz)
    const t0 = it.start.slice(11)
    const dur = it.end ? ((toMin(it.end) - toMin(t0) + 1440) % 1440 || 1440) * 60e3 : 2 * 3600e3
    const rr = it.rep ? `RRULE:FREQ=${it.rep === 'weekly' ? 'WEEKLY' : 'MONTHLY'}${it.until ? ';UNTIL=' + it.until.replace(/-/g, '') + 'T235959Z' : ''}` : ''
    return ['BEGIN:VEVENT', `UID:${siteName}-${it.id}@sites.motdang.net`, `DTSTAMP:${stamp}`, `DTSTART:${f(s)}`, `DTEND:${f(s + dur)}`, rr,
      `SUMMARY:${t(it.t)}`, it.note ? `DESCRIPTION:${t(it.note)}` : '', addr ? `LOCATION:${t(addr)}` : '', `URL:https://sites.motdang.net/${siteName}`, 'END:VEVENT'].filter(Boolean)
  })
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//motdang.net//pages//EN', `X-WR-CALNAME:${t(title)}`, `X-WR-TIMEZONE:${tz}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n'
}

/** A number as money in the page's currency, or the maker's own words. */
export function money(p, sym) {
  if (!p) return ''
  return /^[\d.,\s–-]+$/.test(p) ? (sym || '') + p : p
}

export const UNIT_LABEL = { m2: 'm²', rai: 'rai', sqw: 'ตร.ว.' }
