// gbp-kit.mjs — a page's hours, description, phone, link and timed offers, laid out the way Google Business Profile
// asks for them (NaN 2026-10-22: Gold feature 12). The builder shows them as a kit with a copy button on each field;
// src/gbp.mjs sends the same values through Google's API once the connection is on.

export const GBP_URL = 'https://business.google.com/'
export const DESC_MAX = 750 // Google's limit for a profile description
export const POST_MAX = 1500 // and for the words of a post
export const TITLE_MAX = 58 // and for an offer's title

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

export function dayLabel(lang, i) {
  try { return new Intl.DateTimeFormat(lang, { weekday: 'long', timeZone: 'UTC' }).format(Date.UTC(2024, 0, 1 + i)) } catch { return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] }
}

/** The words of a profile description: the line under the name, then About, cut at a sentence or a word inside Google's limit. */
export function descriptionOf(d) {
  const text = [d.tagline, d.about].map((x) => String(x || '').replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n\n')
  if (text.length <= DESC_MAX) return text
  const cut = text.slice(0, DESC_MAX)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('。'), cut.lastIndexOf('\n'))
  if (stop > DESC_MAX * 0.6) return cut.slice(0, stop + 1).trim()
  const sp = cut.lastIndexOf(' ')
  return (sp > DESC_MAX * 0.6 ? cut.slice(0, sp) : cut).trim()
}

/** Each day as the form asks: closed, open 24 hours, or up to two ranges. Null when the page keeps no hours. */
export function hoursRows(d, lang = 'en') {
  const h = d.hours
  if (!h || !h.on) return null
  return Array.from({ length: 7 }, (_, i) => {
    const day = dayLabel(lang, i)
    if (h.always) return { i, day, kind: 'open24', ranges: [], value: '00:00 – 24:00' }
    const r = h.week[i]
    if (!r || !r.length) return { i, day, kind: 'closed', ranges: [], value: '' }
    return { i, day, kind: 'open', ranges: r, value: r.map(([a, b]) => `${a} – ${b}`).join(', ') }
  })
}

/** Google's regularHours (Business Information API v1): one period per range; a range that ends at or before it opens ends the next day. */
export function periodsOf(d) {
  const rows = hoursRows(d)
  if (!rows) return null
  const periods = []
  const t = (s) => ({ hours: +s.slice(0, 2), minutes: +s.slice(3) })
  for (const r of rows) {
    if (r.kind === 'open24') periods.push({ openDay: DAYS[r.i], openTime: { hours: 0, minutes: 0 }, closeDay: DAYS[r.i], closeTime: { hours: 24, minutes: 0 } })
    for (const [a, b] of r.ranges) {
      if (!HHMM.test(a) || !HHMM.test(b)) continue
      const over = b <= a
      periods.push({ openDay: DAYS[r.i], openTime: t(a), closeDay: DAYS[over ? (r.i + 1) % 7 : r.i], closeTime: t(b) })
    }
  }
  return periods.length ? { periods } : null
}

const ymd = (local) => { const m = LOCAL.exec(local); return m ? { year: +m[1], month: +m[2], day: +m[3] } : null }
const hm = (local) => { const m = LOCAL.exec(local); return m ? { hours: +m[4], minutes: +m[5], seconds: 0, nanos: 0 } : null }
const showDate = (local) => { const m = LOCAL.exec(local); return m ? `${+m[3]} ${MON[+m[2] - 1]} ${m[1]}` : '' }
const showTime = (local) => { const m = LOCAL.exec(local); return m ? `${m[4]}:${m[5]}` : '' }

/** A timed offer (a page's campaign) as the fields Google's "Add offer" form asks for. */
export function offerFields(c, url) {
  return {
    id: c.id, title: String(c.t || '').slice(0, TITLE_MAX), summary: String(c.note || c.t || '').slice(0, POST_MAX), code: c.code || '', link: url,
    startDate: showDate(c.start), startTime: showTime(c.start), endDate: showDate(c.end), endTime: showTime(c.end),
  }
}

/** A campaign as a Google local post (My Business API v4 localPosts, topicType OFFER). `card` is the page's share card (a JPEG address). */
export function postOf(c, { url, card, lang }) {
  const s = ymd(c.start), e = ymd(c.end), st = hm(c.start), et = hm(c.end)
  if (!s || !e) return null
  return {
    languageCode: lang || 'en', topicType: 'OFFER', summary: String(c.note || c.t || '').slice(0, POST_MAX),
    event: { title: String(c.t || '').slice(0, TITLE_MAX), schedule: { startDate: s, startTime: st, endDate: e, endTime: et } },
    offer: { ...(c.code ? { couponCode: String(c.code).slice(0, 58) } : {}), redeemOnlineUrl: url },
    ...(card ? { media: [{ mediaFormat: 'PHOTO', sourceUrl: card }] } : {}),
  }
}

/** Everything the kit lists, in the order Google's form asks. `url` is the page's address. */
export function kitOf(d, { url, lang = 'en', now = Date.now() } = {}) {
  const hours = hoursRows(d, lang)
  const offers = (d.camps || []).filter((c) => c.t && c.start && c.end && Date.parse(c.end + ':00+07:00') > now - 864e5).slice(0, 10).map((c) => offerFields(c, url))
  return {
    hours, hoursAll: hours ? hours.map((r) => `${r.day}: ${r.kind === 'closed' ? '—' : r.value}`).join('\n') : '',
    desc: descriptionOf(d), phone: (d.contact && d.contact.phone) || '', web: url, offers,
  }
}
