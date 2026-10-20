// events.mjs — what is on, tech and AI first, read every 30 minutes (NaN 2026-10-20: "I want the
// actual websites of Motdang and Hongdam to do a better job featuring these events. Should always be
// updating, and reachable easily from related motdang pages (locations, calendar, associations,
// page owners).")
//
//   motdang.net/tech/              the page: tech and AI events in Chiang Mai and Chiang Rai
//   motdang.net/tech/events.json   the rows, for hongdam.net, motdang.net's pages and anyone (CORS)
//                                  ?kind=tech|all  ?site=<page id>  ?place=<cm/p/slug.html>  ?near=lat,lng&km=2  ?n=
//   motdang.net/tech/events.ics    the same as a calendar to follow   /tech/e/<id>.ics  one event
//   motdang.net/tech/w.js          a strip any page can carry: <div data-md-events data-place="…"></div>
//   sites.motdang.net/events       → motdang.net/tech/
//
// Feeds, each read when its turn comes (ev_src remembers when):
//   Luma's discover list near Chiang Mai and Chiang Rai (api.lu.ma, no key) every 2 hours;
//   Luma calendars that host tech events, and the Luma or Meetup links people put on their
//   sites.motdang.net pages, 3 a run, each every 6 hours; motdang.net's own harvest
//   (data/events.json: Meetup, Payap, Steve's newsletter, Chiang Rai), hourly; and the dated
//   events and calendars on live pages, every run.
// A row a feed stops carrying goes once that feed has answered without it; every row goes a day
// after it ends.

const MAIN = 'https://motdang.net'
const HOME = 'https://sites.motdang.net'
const TZ = 'Asia/Bangkok'
const UA = 'motdang.net events reader (+https://motdang.net/tech/)'
const POINTS = [['cm', 18.7883, 98.9853], ['cr', 19.9105, 99.8406]]
const REGIONS = /chiang mai|chiang rai|เชียงใหม่|เชียงราย/i
// Calendars of tech events found 2026-10-20; a page's own Luma link joins these by itself.
const CALS = [['cal-3CDXAg62kxiKJO1', "Nomad's Ark"], ['cal-NngM2CXZNTNVrdD', 'AI events in Thailand']]
const EVERY = { discover: 2 * 3600e3, cal: 6 * 3600e3, motdang: 3600e3 }
const READS = 3 // calendar reads a run; Luma's calendar endpoint answers "rate limit" after a few

// event_nets_layer.py's tech kind, the same words.
const TECH = new RegExp('(?<![\\p{L}\\p{N}])(?:' + ['ai', 'a\\.i\\.', 'artificial intelligence', 'ai agents?', 'agentic', 'llms?', 'gpt', 'chatgpt', 'grok', 'claude',
  'gemini', 'openai', 'machine learning', 'deep learning', 'data science', 'developers?', 'devs', 'coding', 'coders', 'programming',
  'python', 'javascript', 'hackathons?', 'startups?', 'founders?', 'tech', 'technology', 'blockchain', 'crypto', 'web3', 'bitcoin',
  'ethereum', 'seo', 'aeo', 'saas', 'software', 'aws', 'robotics', 'robots?', 'bots?', 'no-code', 'nocode', 'automation',
  'cybersecurity', 'devops', 'vibe coding', 'indie hackers', '3d printing', 'iot', 'publisher meetup',
  'เทคโนโลยี', 'ปัญญาประดิษฐ์', 'สตาร์ทอัพ', 'เขียนโปรแกรม', 'บล็อกเชน'].join('|') + ')(?![\\p{L}\\p{N}])', 'iu')
export const isTech = (...s) => TECH.test(s.filter(Boolean).join(' '))

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const t = (th, en) => `<span class="th">${th}</span><span class="en">${en}</span>`
const cut = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const nowIso = () => new Date().toISOString()
/** An http(s) address, or null: a feed's URL never reaches an href unchecked. */
export const safe = (u) => { try { const x = new URL(String(u || '').trim()); return /^https?:$/.test(x.protocol) && x.href.length <= 2000 ? x.href : null } catch { return null } }
/** Monday 00:00 in Bangkok of the week `n` weeks from the one holding `ms`, as UTC ms. */
export function weekStart(ms, n = 0) {
  const b = new Date(ms + 7 * 3600e3)
  const day = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) - ((b.getUTCDay() + 6) % 7) * 864e5
  return day + n * 7 * 864e5 - 7 * 3600e3
}

// ---- reading ---------------------------------------------------------------------------

async function getJson(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' }, cf: { cacheTtl: 0 } })
  const x = await r.json().catch(() => null)
  if (!r.ok || !x) throw new Error(`${r.status} ${x?.message || ''}`.trim())
  if (x.message && !x.entries && !x.data && !x.events) throw new Error(x.message)
  return x
}

/** A Luma entry as an ev row, or null when it is not in Chiang Mai or Chiang Rai. */
export function lumaRow(entry, feed, extra = {}) {
  const ev = entry?.event || entry || {}
  const g = ev.geo_address_info || {}
  if (!REGIONS.test([g.region, g.region_short, g.city_state, g.city].join(' '))) return null
  if (!ev.name || !ev.start_at || !ev.url) return null
  const tix = entry.ticket_info || {}
  const p = tix.price || {}
  const cost = tix.is_free ? 'Free' : Number.isFinite(p.cents)
    ? ((p.currency || '').toLowerCase() === 'thb' ? `฿${Math.round(p.cents / 100).toLocaleString('en')}` : `${(p.cents / 100).toFixed(2)} ${(p.currency || '').toUpperCase()}`) : ''
  const shown = g.mode === 'shown'
  const pc = shown ? g.place_coordinate : null
  const cal = entry.calendar || {}
  const host = (entry.hosts || []).map((h) => h?.name).filter(Boolean).slice(0, 2).join(', ') || cal.name || ''
  return {
    id: 'luma-' + (ev.api_id || ev.url), src: 'luma', title: cut(ev.name, 160), start: ev.start_at, end: ev.end_at || null, all_day: 0,
    url: 'https://luma.com/' + ev.url, venue: shown ? cut(g.address, 120) : '', area: cut(g.sublocality || g.city, 60),
    lat: pc ? pc.latitude : null, lng: pc ? pc.longitude : null, cost, approval: tix.require_approval ? 1 : 0,
    spots: Number.isFinite(tix.spots_remaining) ? tix.spots_remaining : null,
    kinds: isTech(ev.name, cal.description_short, extra.about) ? 'tech' : '', host: cut(host, 80),
    host_url: cal.slug ? 'https://luma.com/' + cal.slug : (cal.api_id ? `https://luma.com/calendar/${cal.api_id}` : ''),
    site_id: extra.site_id || null, feed, seen: nowIso(),
  }
}

/** "2026-10-31 11:00:00" in Bangkok → UTC ISO. */
function bkk(s) {
  if (!s) return null
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s)
  if (!m) return null
  return new Date(Date.parse(`${m[1]}T${m[2] || '00'}:${m[3] || '00'}:00+07:00`)).toISOString()
}

/** One row of motdang.net/data/events.json. */
export function motdangRow(e) {
  const start = bkk(e.start)
  if (!start || !e.title) return null
  const kinds = new Set(Array.isArray(e.kinds) ? e.kinds : [])
  if (isTech(e.title)) kinds.add('tech')
  const p = e.place && typeof e.place === 'object' ? e.place : null
  return {
    id: String(e.uid || '').slice(0, 120) || 'md-' + start + cut(e.title, 40), src: 'motdang', title: cut(e.title, 160), start,
    end: e.end ? bkk(e.end) : null, all_day: e.all_day ? 1 : 0, url: e.url || null, venue: cut(e.venue_name, 120), area: '',
    lat: p?.lat ?? null, lng: p?.lng ?? null, cost: cut(e.cost, 60), approval: 0, spots: null, kinds: [...kinds].join(' '),
    host: '', host_url: '', site_id: null, place_href: p?.href || null, place_name: p?.name ? cut(p.name, 120) : null,
    feed: 'motdang', seen: nowIso(),
  }
}

/** A page's own dated event and calendar as rows. */
function siteRows(s, d, upcoming, utcOf) {
  const rows = []
  const tz = d.hours?.tz || d.event?.tz || TZ
  const base = {
    src: 'site', url: `${HOME}/${s.name}`, venue: cut(d.place?.addr, 120), area: '', lat: d.place?.lat ?? null, lng: d.place?.lng ?? null,
    approval: 0, spots: null, host: cut(d.name || s.name, 80), host_url: `${HOME}/${s.name}`, site_id: s.id, feed: 'sites', seen: nowIso(),
  }
  const tech = isTech(d.name, d.tagline, d.about) ? 'tech' : ''
  if (d.event?.start) {
    const st = utcOf(d.event.start, d.event.tz || tz), en = d.event.end ? utcOf(d.event.end, d.event.tz || tz) : null
    if ((en || st + 3 * 3600e3) > Date.now()) rows.push({ ...base, id: `site-${s.id}`, title: cut(d.name || s.name, 160), start: new Date(st).toISOString(), end: en ? new Date(en).toISOString() : null, all_day: 0, cost: d.pay?.price ? `฿${d.pay.price}` : '', kinds: tech })
  }
  for (const x of upcoming(d.cal || [], tz, Date.now(), 6, 60)) {
    rows.push({ ...base, id: `site-${s.id}-${x.item.id}-${x.day}`, title: cut(`${x.item.t} · ${d.name || s.name}`, 160), start: new Date(x.start).toISOString(), end: new Date(x.end).toISOString(), all_day: 0, cost: '', kinds: tech || (isTech(x.item.t, x.item.note) ? 'tech' : '') })
  }
  return rows
}

/** The Luma and Meetup links on a page: [{ kind, key, url }]. */
export function calLinks(d) {
  const out = []
  for (const l of d.links || []) {
    let u
    try { u = new URL(l.u) } catch { continue }
    const h = u.hostname.replace(/^www\./, '').toLowerCase()
    const seg = u.pathname.split('/').filter(Boolean)
    if ((h === 'luma.com' || h === 'lu.ma') && seg[0]) out.push({ kind: 'luma', key: seg[0] === 'calendar' && seg[1] ? seg[1] : seg[0] })
    else if (h === 'meetup.com' && seg[0] && !['find', 'topics', 'cities', 'lp'].includes(seg[0])) out.push({ kind: 'meetup', key: seg[0].toLowerCase() })
  }
  return out.slice(0, 3)
}

/** VEVENTs of a Meetup group's iCal feed. */
function icalRows(text, feed, extra) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const rows = []
  let cur = null
  const val = (l) => l.slice(l.indexOf(':') + 1).replace(/\\n/g, ' ').replace(/\\([,;\\])/g, '$1')
  const when = (l) => {
    const v = l.slice(l.indexOf(':') + 1).trim()
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/.exec(v)
    if (!m) return null
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4] || '00'}:${m[5] || '00'}:${m[6] || '00'}`
    return new Date(Date.parse(iso + (m[7] ? 'Z' : /TZID=/.test(l) && !/Bangkok/.test(l) ? 'Z' : '+07:00'))).toISOString()
  }
  for (const l of lines) {
    if (l === 'BEGIN:VEVENT') cur = {}
    else if (l === 'END:VEVENT') { if (cur?.title && cur.start) rows.push(cur); cur = null }
    else if (cur) {
      if (l.startsWith('SUMMARY')) cur.title = cut(val(l), 160)
      else if (l.startsWith('DTSTART')) cur.start = when(l)
      else if (l.startsWith('DTEND')) cur.end = when(l)
      else if (l.startsWith('URL')) cur.url = val(l).trim()
      else if (l.startsWith('LOCATION')) cur.venue = cut(val(l), 120)
      else if (l.startsWith('UID')) cur.uid = val(l).trim()
    }
  }
  return rows.filter((r) => Date.parse(r.end || r.start) > Date.now()).slice(0, 30).map((r) => ({
    id: 'meetup-' + (r.uid || r.start + r.title).slice(0, 100), src: 'meetup', title: r.title, start: r.start, end: r.end || null, all_day: 0,
    url: r.url || null, venue: r.venue || '', area: '', lat: null, lng: null, cost: '', approval: 0, spots: null,
    kinds: isTech(r.title, extra.about) ? 'tech' : '', host: extra.host || '', host_url: extra.host_url || '', site_id: extra.site_id || null, feed, seen: nowIso(),
  }))
}

async function put(env, rows) {
  if (!rows.length) return
  const sql = `INSERT INTO ev (id, src, title, start, end, all_day, url, venue, area, lat, lng, cost, approval, spots, kinds, host, host_url, site_id, place_href, place_name, feed, seen)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET src=excluded.src, title=excluded.title, start=excluded.start, end=excluded.end, all_day=excluded.all_day, url=COALESCE(excluded.url, ev.url),
      venue=CASE WHEN excluded.venue <> '' THEN excluded.venue ELSE ev.venue END, area=excluded.area, lat=COALESCE(excluded.lat, ev.lat), lng=COALESCE(excluded.lng, ev.lng),
      cost=CASE WHEN excluded.cost <> '' THEN excluded.cost ELSE ev.cost END, approval=excluded.approval, spots=excluded.spots,
      kinds=CASE WHEN excluded.kinds <> '' THEN excluded.kinds ELSE ev.kinds END, host=CASE WHEN excluded.host <> '' THEN excluded.host ELSE ev.host END,
      host_url=CASE WHEN excluded.host_url <> '' THEN excluded.host_url ELSE ev.host_url END, site_id=COALESCE(excluded.site_id, ev.site_id),
      place_href=COALESCE(excluded.place_href, ev.place_href), place_name=COALESCE(excluded.place_name, ev.place_name), feed=excluded.feed, seen=excluded.seen`
  for (let i = 0; i < rows.length; i += 40) {
    await env.DB.batch(rows.slice(i, i + 40).map((r) => env.DB.prepare(sql).bind(r.id, r.src, r.title, r.start, r.end ?? null, r.all_day || 0, safe(r.url), r.venue || '', r.area || '',
      r.lat ?? null, r.lng ?? null, r.cost || '', r.approval || 0, r.spots ?? null, r.kinds || '', r.host || '', safe(r.host_url) || '', r.site_id ?? null, r.place_href ?? null, r.place_name ?? null, r.feed, r.seen)))
  }
}

async function mark(env, key, ok, n, note = '') {
  await env.DB.prepare('INSERT INTO ev_src (key, at, ok, n, note) VALUES (?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET at=excluded.at, ok=excluded.ok, n=excluded.n, note=excluded.note')
    .bind(key, nowIso(), ok ? 1 : 0, n, cut(note, 200)).run()
}

/** A feed answered: its rows go in, and its rows it no longer carries go out. */
async function settle(env, key, rows, since) {
  await put(env, rows)
  await env.DB.prepare('DELETE FROM ev WHERE feed = ? AND seen < ?').bind(key, since).run()
  await mark(env, key, true, rows.length)
}

/** The half-hourly read. `deps` carries the page helpers this module does not own. */
export async function refresh(env, { normalize, upcoming, utcOf }) {
  const done = {}
  const last = new Map((await env.DB.prepare('SELECT key, at FROM ev_src').all()).results.map((r) => [r.key, Date.parse(r.at || 0) || 0]))
  const due = (key, every) => Date.now() - (last.get(key) || 0) >= every - 60e3
  const read = async (key, f) => {
    const since = nowIso()
    try { const rows = await f(); await settle(env, key, rows, since); done[key] = rows.length } catch (e) { await mark(env, key, false, 0, String(e?.message || e)); done[key] = 'error: ' + String(e?.message || e).slice(0, 120) }
  }

  for (const [k, lat, lng] of POINTS) {
    if (!due('luma:' + k, EVERY.discover)) continue
    await read('luma:' + k, async () => {
      const x = await getJson(`https://api.lu.ma/discover/get-paginated-events?latitude=${lat}&longitude=${lng}&pagination_limit=100`)
      return (x.entries || []).map((e) => lumaRow(e, 'luma:' + k)).filter(Boolean)
    })
  }

  if (due('motdang', EVERY.motdang)) {
    await read('motdang', async () => {
      const r = env.SITE ? await env.SITE.fetch(`${MAIN}/data/events.json`) : await fetch(`${MAIN}/data/events.json`)
      if (!r.ok) throw new Error('events.json ' + r.status)
      const x = await r.json()
      const horizon = Date.now() + 60 * 864e5
      const got = (x.events || []).map(motdangRow).filter((e) => e && Date.parse(e.end || e.start) > Date.now() - 864e5 && Date.parse(e.start) < horizon)
      // Luma's own read is fresher (spots, approval); motdang.net's copy adds only the place it matched
      const luma = got.filter((e) => e.id.startsWith('luma-') && e.place_href)
      for (let i = 0; i < luma.length; i += 40) await env.DB.batch(luma.slice(i, i + 40).map((e) => env.DB.prepare('UPDATE ev SET place_href = ?, place_name = ? WHERE id = ?').bind(e.place_href, e.place_name, e.id)))
      return got.filter((e) => !e.id.startsWith('luma-'))
    })
  }

  // people's pages: their dated events every run; their Luma and Meetup links in turn
  const sites = (await env.DB.prepare("SELECT id, name, kind, d FROM site WHERE status = 'live' AND (d LIKE '%\"event\":{\"start\"%' OR d LIKE '%\"cal\":[{%' OR d LIKE '%luma.com%' OR d LIKE '%lu.ma%' OR d LIKE '%meetup.com%') LIMIT 400").all()).results
  const own = [], links = []
  for (const s of sites) {
    let d
    try { d = normalize(JSON.parse(s.d)) } catch { continue }
    own.push(...siteRows(s, d, upcoming, utcOf))
    for (const l of calLinks(d)) links.push({ ...l, site_id: s.id, host: d.name || s.name, host_url: `${HOME}/${s.name}`, about: [d.tagline, d.about].join(' ') })
  }
  await read('sites', async () => own)

  const cals = [...CALS.map(([id, name]) => ({ kind: 'luma', key: id, host: name, about: 'tech AI' })), ...links]
  const queue = cals.map((c) => ({ ...c, fk: `${c.kind}:${c.key}` })).filter((c) => due(c.fk, EVERY.cal))
    .sort((a, b) => (last.get(a.fk) || 0) - (last.get(b.fk) || 0)).slice(0, READS)
  for (const c of queue) {
    await read(c.fk, async () => {
      if (c.kind === 'meetup') {
        const r = await fetch(`https://www.meetup.com/${encodeURIComponent(c.key)}/events/ical/`, { headers: { 'user-agent': UA } })
        const text = r.ok ? await r.text() : ''
        if (!text.includes('BEGIN:VCALENDAR')) throw new Error('meetup ' + r.status)
        return icalRows(text, c.fk, c)
      }
      let calId = /^cal-/.test(c.key) ? c.key : null
      if (!calId) {
        const u = await getJson(`https://api.lu.ma/url?url=${encodeURIComponent(c.key)}`)
        if (u.kind === 'event') { const r = lumaRow(u.data, c.fk, c); return r ? [r] : [] }
        calId = u.data?.calendar?.api_id
        if (!calId) throw new Error('not a Luma event or calendar')
      }
      const x = await getJson(`https://api.lu.ma/calendar/get-items?calendar_api_id=${calId}&period=future&pagination_limit=50`)
      return (x.entries || []).map((e) => lumaRow(e, c.fk, c)).filter(Boolean)
    })
  }

  // a row from a page's link keeps the page; a Luma row and motdang's copy of it share an id
  await env.DB.prepare('DELETE FROM ev WHERE COALESCE(end, start) < ?').bind(new Date(Date.now() - 864e5).toISOString()).run()
  return done
}

// ---- asking ----------------------------------------------------------------------------

/** Rows to come, soonest first. q: { kind, site, place, near:[lat,lng], km, n, days } */
export async function rows(env, q = {}) {
  const where = ['COALESCE(end, start) >= ?'], args = [new Date(Date.now() - 2 * 3600e3).toISOString()]
  if (q.days) { where.push('start <= ?'); args.push(new Date(Date.now() + q.days * 864e5).toISOString()) }
  if (q.kind && q.kind !== 'all') { where.push("(' ' || kinds || ' ') LIKE ?"); args.push(`% ${q.kind} %`) }
  if (q.site) { where.push('site_id = ?'); args.push(q.site) }
  if (q.except) { where.push('src <> ?'); args.push(q.except) }
  if (q.place) { where.push('place_href = ?'); args.push(q.place) }
  if (q.near) {
    const [la, ln] = q.near, d = (q.km || 2) / 111
    where.push('lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?'); args.push(la - d, la + d, ln - d / Math.cos(la * Math.PI / 180), ln + d / Math.cos(la * Math.PI / 180))
  }
  const r = (await env.DB.prepare(`SELECT * FROM ev WHERE ${where.join(' AND ')} ORDER BY start LIMIT ?`).bind(...args, Math.min(q.n || 60, 300)).all()).results
  // one listing per title and day: Luma and motdang.net's harvest can both carry it
  const seen = new Set()
  return r.filter((e) => { const k = e.title.toLowerCase().replace(/\W+/g, '') + e.start.slice(0, 10); if (seen.has(k)) return false; seen.add(k); return true })
}

const fmt = (iso, o) => new Intl.DateTimeFormat(o.lang === 'th' ? 'th-TH' : 'en-GB', { timeZone: TZ, ...o.f }).format(new Date(iso))
const dayOf = (iso, lang) => fmt(iso, { lang, f: { weekday: 'short', day: 'numeric', month: 'short' } })
const clock = (iso) => fmt(iso, { lang: 'en', f: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } })
const bkDay = (ms) => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10)

/** One row as data for others. */
export function asData(e) {
  return {
    id: e.id, title: e.title, start: e.start, end: e.end, allDay: !!e.all_day, url: safe(e.url), venue: e.venue, area: e.area, lat: e.lat, lng: e.lng,
    cost: e.cost, approval: !!e.approval, spots: e.spots, kinds: (e.kinds || '').split(' ').filter(Boolean), host: e.host, hostUrl: safe(e.host_url),
    page: e.site_id ? safe(e.host_url) : null, place: e.place_href ? { url: `${MAIN}/${e.place_href}`, name: e.place_name } : null, ics: `${MAIN}/tech/e/${encodeURIComponent(e.id)}.ics`,
    when: { th: dayOf(e.start, 'th'), en: dayOf(e.start, 'en'), time: e.all_day ? '' : clock(e.start) + (e.end && bkDay(Date.parse(e.end)) === bkDay(Date.parse(e.start)) ? '–' + clock(e.end) : '') },
  }
}

function icsOf(list, name) {
  const f = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d+/, '')
  const tx = (x) => String(x || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//motdang.net//tech//EN', `X-WR-CALNAME:${tx(name)}`, 'X-WR-TIMEZONE:Asia/Bangkok', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H']
  for (const e of list) {
    out.push('BEGIN:VEVENT', `UID:${tx(e.id)}@motdang.net`, `DTSTAMP:${f(nowIso())}`, `DTSTART:${f(e.start)}`, `DTEND:${f(e.end || new Date(Date.parse(e.start) + 2 * 3600e3).toISOString())}`,
      `SUMMARY:${tx(e.title)}`, (e.venue || e.place_name || e.area) ? `LOCATION:${tx(e.venue || e.place_name || e.area)}` : '', safe(e.url) ? `URL:${tx(safe(e.url))}` : '',
      `DESCRIPTION:${tx([e.cost, e.host && 'Host: ' + e.host, e.url].filter(Boolean).join(' · '))}`, 'END:VEVENT')
  }
  out.push('END:VCALENDAR')
  return out.filter(Boolean).join('\r\n') + '\r\n'
}

// ---- the page --------------------------------------------------------------------------

const CSS = `:root{--ant:#c8102e;--ink:#1b1b1b;--soft:#5d5d5d;--paper:#fffaf2;--card:#fff;--line:#eadfce;--gold:#b8860b}
@media (prefers-color-scheme:dark){:root{--ink:#f2ede4;--soft:#b9b2a6;--paper:#16130f;--card:#211d18;--line:#3a332a}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Noto Sans Thai",sans-serif}
html[data-l=th] .en,html[data-l=en] .th{display:none}
.wrap{max-width:860px;margin:0 auto;padding:16px}a{color:var(--ant)}
.top{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px}.top a{text-decoration:none;font-weight:700}
h1{font-size:clamp(28px,6vw,44px);line-height:1.1;margin:18px 0 6px}.lede{color:var(--soft);margin:0 0 14px}
.btns{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:999px;border:2px solid var(--ant);text-decoration:none;font-weight:700;font-size:15px}
.btn.on{background:var(--ant);color:#fff}
h2{font-size:20px;margin:26px 0 10px;border-bottom:2px solid var(--line);padding-bottom:4px}
.ev{display:grid;grid-template-columns:64px 1fr;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;margin:0 0 10px}
.date{background:var(--ant);color:#fff;border-radius:10px;text-align:center;padding:6px 2px;font-weight:800;line-height:1.15;align-self:start}.date small{display:block;font-weight:600;font-size:12px}
.ev h3{margin:0 0 2px;font-size:17px;line-height:1.3}.ev h3 a{color:inherit;text-decoration:none}.ev h3 a:hover{text-decoration:underline}
.meta{color:var(--soft);font-size:14px;margin:2px 0}.tags{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0}
.tag{font-size:12px;border:1px solid var(--line);border-radius:999px;padding:1px 8px}.tag.free{border-color:#2e7d32;color:#2e7d32}.tag.paid{border-color:var(--gold);color:var(--gold)}
.acts{display:flex;flex-wrap:wrap;gap:12px;margin:6px 0 0;font-size:14px;font-weight:700}
.none{color:var(--soft)}.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}.cols a{display:block;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px;text-decoration:none;color:inherit}
.cols b{display:block}.cols small{color:var(--soft)}.foot{color:var(--soft);font-size:13px;margin:28px 0 40px}
@media (max-width:420px){.ev{grid-template-columns:52px 1fr;gap:10px}.date{font-size:14px}}`

function card(e, lang) {
  const x = asData(e)
  const where = x.place ? `<a href="${esc(x.place.url)}">${esc(x.place.name)}</a>` : esc(x.venue || x.area || '')
  const map = !x.place && x.lat != null ? ` · <a href="https://www.google.com/maps/search/?api=1&query=${x.lat},${x.lng}" rel="noopener">${t('แผนที่', 'map')}</a>` : ''
  const tags = [
    x.cost ? (/^free$/i.test(x.cost) ? `<span class="tag free">${t('ฟรี', 'Free')}</span>` : `<span class="tag paid">${esc(x.cost)}</span>`) : '',
    x.approval ? `<span class="tag">${t('ผู้จัดอนุมัติก่อน', 'host approves guests')}</span>` : '',
    Number.isFinite(x.spots) && x.spots > 0 && x.spots <= 15 ? `<span class="tag">${t(`เหลือ ${x.spots} ที่`, `${x.spots} spots left`)}</span>` : '',
  ].join('')
  const day = new Date(Date.parse(e.start) + 7 * 3600e3)
  return `<article class="ev" id="${esc(x.id)}"><div class="date">${day.getUTCDate()}<small>${t(dayOf(e.start, 'th').split(' ')[0], dayOf(e.start, 'en').split(' ')[0])}</small></div><div>
<h3>${x.url ? `<a href="${esc(x.url)}" rel="noopener">${esc(x.title)}</a>` : esc(x.title)}</h3>
<p class="meta">${t(x.when.th, x.when.en)}${x.when.time ? ' · ' + x.when.time : ''}${where ? ' · 📍 ' + where : ''}${map}</p>
${x.host ? `<p class="meta">${t('ผู้จัด', 'Host')}: ${x.hostUrl ? `<a href="${esc(x.hostUrl)}" rel="noopener">${esc(x.host)}</a>` : esc(x.host)}</p>` : ''}
${tags ? `<div class="tags">${tags}</div>` : ''}
<p class="acts">${x.url ? `<a href="${esc(x.url)}" rel="noopener">${t('สมัคร / รายละเอียด', 'Register / details')} ↗</a>` : ''}<a href="${esc(x.ics)}">🗓 ${t('ใส่ปฏิทิน', 'Add to calendar')}</a></p></div></article>`
}

function weekBlocks(list, lang) {
  const wk = (n) => weekStart(Date.now(), n)
  const groups = [[t('สัปดาห์นี้', 'This week'), (s) => s < wk(1)], [t('สัปดาห์หน้า', 'Next week'), (s) => s < wk(2)], [t('หลังจากนั้น', 'Later'), () => true]]
  const used = new Set()
  return groups.map(([h, f]) => {
    const mine = list.filter((e) => !used.has(e.id) && f(Date.parse(e.start)))
    mine.forEach((e) => used.add(e.id))
    return mine.length ? `<h2>${h}</h2>${mine.map((e) => card(e, lang)).join('')}` : ''
  }).join('')
}

export async function page(env, { lang, kind }) {
  const tech = kind !== 'all'
  const list = await rows(env, { kind: tech ? 'tech' : 'all', n: 200, days: 90 })
  const src = (await env.DB.prepare('SELECT MAX(at) AS at FROM ev_src WHERE ok = 1').first())?.at
  const hosts = new Map(), venues = new Map()
  for (const e of list) {
    if (e.host && !hosts.has(e.host)) hosts.set(e.host, { url: safe(e.host_url), n: 0, page: !!e.site_id })
    if (e.host) hosts.get(e.host).n++
    if (e.place_href && !venues.has(e.place_href)) venues.set(e.place_href, { name: e.place_name, n: 0 })
    if (e.place_href) venues.get(e.place_href).n++
  }
  const other = lang === 'th' ? 'en' : 'th'
  const title = tech ? 'งานเทคและ AI เชียงใหม่ เชียงราย · Tech & AI events, Chiang Mai and Chiang Rai' : 'งานในเมือง · What is on, Chiang Mai and Chiang Rai'
  const desc = tech ? 'Meetups, talks and workshops on AI, code and startups in Chiang Mai and Chiang Rai, from Luma, Meetup and Mot Dang, read every 30 minutes.' : 'Everything on in Chiang Mai and Chiang Rai, read every 30 minutes.'
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: title, itemListElement: list.slice(0, 60).map((e, i) => ({ '@type': 'ListItem', position: i + 1, item: {
    '@type': 'Event', name: e.title, startDate: e.start, ...(e.end ? { endDate: e.end } : {}), eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: e.place_name || e.venue || e.area || 'Chiang Mai', ...(e.lat != null ? { geo: { '@type': 'GeoCoordinates', latitude: e.lat, longitude: e.lng } } : {}) },
    ...(e.url ? { url: e.url } : {}), ...(e.host ? { organizer: { '@type': 'Organization', name: e.host, ...(e.host_url ? { url: e.host_url } : {}) } } : {}),
    ...(/^free$/i.test(e.cost || '') ? { isAccessibleForFree: true } : {}) } })) }
  const hostList = [...hosts].sort((a, b) => b[1].n - a[1].n).slice(0, 24)
  const venueList = [...venues].sort((a, b) => b[1].n - a[1].n).slice(0, 24)
  const self = tech ? '/tech/' : '/tech/?all=1'
  const body = `<div class="wrap">
<div class="top"><a href="${MAIN}/">🐜 motdang</a><a href="?${tech ? '' : 'all=1&'}l=${other}" hreflang="${other}">${lang === 'th' ? 'EN' : 'ไทย'}</a></div>
<h1>${tech ? t('งานเทคและ AI', 'Tech & AI events') : t('งานในเมือง', 'What is on')}</h1>
<p class="lede">${tech ? t('มีตอัพ ทอล์ก เวิร์กช็อป เรื่อง AI โค้ด สตาร์ทอัพ ในเชียงใหม่และเชียงราย อ่านจาก Luma, Meetup, ปฏิทินของมดแดง และหน้าบน sites.motdang.net ทุก 30 นาที', 'Meetups, talks and workshops on AI, code and startups in Chiang Mai and Chiang Rai, read from Luma, Meetup, Mot Dang\'s calendars and pages on sites.motdang.net every 30 minutes.') : t('ทุกงานในเชียงใหม่และเชียงราย อ่านทุก 30 นาที', 'Everything on in Chiang Mai and Chiang Rai, read every 30 minutes.')}</p>
<nav class="btns"><a class="btn${tech ? ' on' : ''}" href="/tech/">💻 ${t('เทคและ AI', 'Tech & AI')}</a><a class="btn${tech ? '' : ' on'}" href="/tech/?all=1">${t('ทุกงาน', 'Everything')}</a>
<a class="btn" href="webcal://motdang.net/tech/events.ics${tech ? '' : '?kind=all'}">🗓 ${t('ติดตามในปฏิทินมือถือ', 'Follow in your phone calendar')}</a>
<a class="btn" href="${MAIN}/events.html">${t('ปฏิทินมดแดง', 'Mot Dang calendar')}</a>
<a class="btn" href="${HOME}/make">＋ ${t('ลงงานของคุณ', 'List yours')}</a></nav>
${list.length ? weekBlocks(list, lang) : `<p class="none">${t('ยังไม่มีงานในช่วงนี้', 'Nothing listed for now.')}</p>`}
${hostList.length ? `<h2>${t('ผู้จัด', 'Who runs them')}</h2><div class="cols">${hostList.map(([n, h]) => `<a href="${esc(h.url || '#')}" rel="noopener"><b>${esc(n)}</b><small>${t(`${h.n} งาน`, `${h.n} event${h.n > 1 ? 's' : ''}`)}${h.page ? ' · sites.motdang.net' : ''}</small></a>`).join('')}</div>` : ''}
${venueList.length ? `<h2>${t('สถานที่', 'Where')}</h2><div class="cols">${venueList.map(([href, v]) => `<a href="${MAIN}/${esc(href)}"><b>${esc(v.name)}</b><small>${t(`${v.n} งาน`, `${v.n} event${v.n > 1 ? 's' : ''}`)} · motdang.net</small></a>`).join('')}</div>` : ''}
<h2>${t('ลงงานของคุณ', 'List your events')}</h2>
<p>${t('ทำหน้าฟรีบน sites.motdang.net ให้กลุ่ม ชมรม หรืองานของคุณ แล้วใส่ลิงก์ Luma หรือ Meetup ไว้ในลิงก์ งานของคุณจะขึ้นที่นี่ บนหน้าของคุณ และบนหน้าสถานที่ในมดแดง', 'Make a free page on sites.motdang.net for your group, club or event and put your Luma or Meetup link among its links: your events show here, on your page, and on the places they happen on motdang.net.')}
<a href="${HOME}/make">${t('ทำหน้า', 'Make a page')} →</a></p>
<p class="foot">${src ? t(`อ่านล่าสุด ${fmt(src, { lang: 'th', f: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } })}`, `Last read ${fmt(src, { lang: 'en', f: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } })}`) + ' · ' : ''}
<a href="/tech/events.json${tech ? '' : '?kind=all'}">events.json</a> · <a href="/tech/events.ics${tech ? '' : '?kind=all'}">events.ics</a> · ${t('ตรวจกับผู้จัดก่อนไปทุกครั้ง', 'Check with the host before you go.')}</p>
</div>`
  return `<!doctype html><html lang="${lang}" data-l="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><link rel="icon" href="${MAIN}/favicon.ico"><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${MAIN}${self}">
<meta property="og:type" content="website"><meta property="og:url" content="${MAIN}${self}"><meta property="og:title" content="${esc(tech ? 'Tech & AI events · Chiang Mai and Chiang Rai' : 'What is on · Chiang Mai and Chiang Rai')}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${HOME}/s/${tech ? 'tech' : 'whats-on'}-card.jpg"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${tech ? 'Tech and AI events in Chiang Mai and Chiang Rai on motdang' : 'What is on in Chiang Mai and Chiang Rai on motdang'}"><meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="text/calendar" href="${MAIN}/tech/events.ics"><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>${CSS}</style></head><body>${body}</body></html>`
}

// ---- what a page carries ---------------------------------------------------------------

const STRIP_CSS = `.mdev{list-style:none;margin:8px 0 0;padding:0}.mdev li{padding:8px 0;border-top:1px solid rgba(127,127,127,.25)}.mdev li:first-child{border-top:0}
.mdev b{display:block;line-height:1.3}.mdev small{opacity:.75}.mdevmore{display:inline-block;margin-top:8px;font-weight:700}`

/** The section an owner's page carries: what its linked calendars have coming, and the way to tech events. */
export async function siteSection(env, s, kind) {
  // the page shows its own dates already; this is what its linked calendars carry
  const mine = await rows(env, { site: s.id, except: 'site', n: 8, days: 120 })
  const techPage = ['group', 'event', 'work'].includes(kind) || mine.some((e) => / tech /.test(` ${e.kinds} `))
  if (!mine.length && !techPage) return ''
  const li = mine.slice(0, 8).map((e) => {
    const x = asData(e)
    return `<li><b>${x.url ? `<a href="${esc(x.url)}" rel="noopener">${esc(x.title)}</a>` : esc(x.title)}</b><small>${esc(x.when.en)}${x.when.time ? ' · ' + x.when.time : ''}${x.place ? ` · <a href="${esc(x.place.url)}">${esc(x.place.name)}</a>` : x.venue ? ' · ' + esc(x.venue) : ''}${x.cost ? ' · ' + esc(x.cost) : ''}</small></li>`
  }).join('')
  const link = `<a class="mdevmore" href="${MAIN}/tech/">💻 Tech &amp; AI events in Chiang Mai · งานเทคและ AI →</a>`
  // no calendar of its own: the way to the town's events, without an empty heading
  if (!li) return `<style>${STRIP_CSS}</style><section class="card rise" id="whatson" style="padding-top:14px;padding-bottom:14px">${link}</section>`
  return `<style>${STRIP_CSS}</style><section class="card rise" id="whatson"><h2 style="margin:0">🗓 What's on · งานที่จะมา</h2><ul class="mdev">${li}</ul>
${link}</section>`
}

/** /tech/w.js: fills <div data-md-events data-place|data-site|data-near|data-kind|data-n> on any page. */
const WIDGET = `(()=>{const M='${MAIN}';const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const th=/^th/.test(document.documentElement.lang||navigator.language||'');
document.querySelectorAll('[data-md-events]').forEach(async el=>{const d=el.dataset,q=new URLSearchParams();
['kind','site','place','near','km','n','days'].forEach(k=>d[k]&&q.set(k,d[k]));if(!q.has('n'))q.set('n','6');
try{const r=await fetch(M+'/tech/events.json?'+q);const j=await r.json();const L=j.events||[];
if(!L.length){if(!d.replace&&d.empty!=='show')el.hidden=true;return}
if(!document.getElementById('mdevcss')){const s=document.createElement('style');s.id='mdevcss';s.textContent=${JSON.stringify(STRIP_CSS)};document.head.appendChild(s)}
el.innerHTML=(d.title?'<h3 style="margin:0">'+e(d.title)+'</h3>':'')+'<ul class="mdev">'+L.map(x=>'<li><b>'+(x.url?'<a href="'+e(x.url)+'" rel="noopener">'+e(x.title)+'</a>':e(x.title))+'</b><small>'+e(th?x.when.th:x.when.en)+(x.when.time?' · '+x.when.time:'')+(x.place&&!d.place?' · <a href="'+e(x.place.url)+'">'+e(x.place.name)+'</a>':x.venue&&!d.place?' · '+e(x.venue):'')+(x.cost?' · '+e(x.cost):'')+'</small></li>').join('')+'</ul><a class="mdevmore" href="'+M+(d.place?'/events.html':'/tech/'+(d.kind==='all'?'?all=1':''))+'">'+(th?'ดูทั้งหมด':'See all')+' →</a>';el.hidden=false}catch(_){}})})();`

/** Routes under /tech/ (motdang.net) and /events (sites.motdang.net). */
export async function route(request, env, path, url, { langOf }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null
  const H = { 'access-control-allow-origin': '*' }
  if (path === '/events' || path === '/events/') return Response.redirect(`${MAIN}/tech/`, 301)
  if (path === '/tech') return Response.redirect(`${MAIN}/tech/`, 301)
  if (path === '/tech/' || path === '/tech/index.html') {
    const lang = langOf(request, url)
    return new Response(await page(env, { lang, kind: url.searchParams.get('all') ? 'all' : 'tech' }), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' } })
  }
  const q = () => {
    const near = String(url.searchParams.get('near') || '').split(',').map(Number)
    return {
      kind: url.searchParams.get('kind') || 'tech', site: url.searchParams.get('site') || '', place: url.searchParams.get('place') || '',
      near: near.length === 2 && near.every(Number.isFinite) ? near : null, km: Math.min(20, Number(url.searchParams.get('km')) || 2),
      n: Math.min(300, Number(url.searchParams.get('n')) || 100), days: Math.min(365, Number(url.searchParams.get('days')) || 120),
    }
  }
  if (path === '/tech/events.json') {
    const list = await rows(env, q())
    return new Response(JSON.stringify({ generated: nowIso(), page: `${MAIN}/tech/`, count: list.length, events: list.map(asData) }), { headers: { ...H, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' } })
  }
  if (path === '/tech/events.ics') {
    const x = q()
    const list = await rows(env, { ...x, n: 300 })
    return new Response(icsOf(list, x.kind === 'all' ? 'Mot Dang · what is on' : 'Mot Dang · tech & AI events'), { headers: { ...H, 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'public, max-age=1800' } })
  }
  const one = /^\/tech\/e\/(.+)\.ics$/.exec(path)
  if (one) {
    const e = await env.DB.prepare('SELECT * FROM ev WHERE id = ?').bind(one[1]).first()
    if (!e) return new Response('', { status: 404 })
    return new Response(icsOf([e], e.title), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': `attachment; filename="${cut(e.title, 40).replace(/[^\w-]+/g, '-')}.ics"` } })
  }
  if (path === '/tech/w.js') return new Response(WIDGET, { headers: { ...H, 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
  return null
}
