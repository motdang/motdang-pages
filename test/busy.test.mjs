// Bookings and the maker's own calendar, both ways (Nan 2026-10-29, for Fashion King): busy times read from a calendar
// file the way Google and Outlook write them, a fitting refused at a busy time, and the private bookings calendar.
// An in-memory D1 (node:sqlite); the maker's calendar address answers from a stub.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker, { sha } from '../src/worker.mjs'
import { normalize } from '../public/s/render.mjs'
import { busySpans } from '../src/busy.mjs'
import { readCalendars } from '../src/cron.mjs'
import * as gold from '../src/gold.mjs'
import { utcOf, dayIn, addDays } from '../public/s/extras.mjs'

const MIGRATIONS = readdirSync(new URL('../migrations/', import.meta.url)).sort()
const sqlOf = (f) => readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8')
function wrap(db) {
  const st = (sql, args = []) => {
    const s = db.prepare(sql), a = args.map((x) => (x === undefined ? null : typeof x === 'boolean' ? Number(x) : x))
    return {
      bind: (...b) => st(sql, b),
      first: async (col) => { const r = s.get(...a); return r ? (col ? r[col] : { ...r }) : null },
      all: async () => ({ results: s.all(...a).map((r) => ({ ...r })) }),
      run: async () => ({ meta: { changes: Number(s.run(...a).changes) } }),
    }
  }
  return { prepare: (sql) => st(sql), batch: async (xs) => Promise.all(xs.map((x) => x.run())), raw: db }
}
const d1 = () => { const db = new DatabaseSync(':memory:'); for (const f of MIGRATIONS) db.exec(sqlOf(f)); return wrap(db) }
const files = new Map()
const media = () => ({
  put: async (k, v, o = {}) => { files.set(k, { bytes: new Uint8Array(await new Response(v).arrayBuffer()), ...o }) },
  get: async (k) => { const f = files.get(k); return f ? { body: new Response(f.bytes).body, text: async () => new TextDecoder().decode(f.bytes), httpMetadata: f.httpMetadata } : null },
  head: async (k) => (files.has(k) ? { key: k } : null),
  delete: async (k) => { for (const x of [].concat(k)) files.delete(x) },
  list: async ({ prefix }) => ({ objects: [...files.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }),
})
const O = 'http://localhost'
const env = { DB: d1(), MEDIA: media(), SESSION_SECRET: 's', RESEND_KEY: 'rk', MAIL_FROM: 'Mot Dang <pages@motdang.net>' }
const ctx = { waitUntil() {} }
let ip = 0
const go = (path, init = {}) => worker.fetch(new Request(O + path, { redirect: 'manual', ...init, headers: { 'cf-connecting-ip': '10.2.0.' + (++ip), ...(init.headers || {}) } }), env, ctx)
const post = (path, body) => go(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

const TZ = `BEGIN:VTIMEZONE\r\nTZID:Asia/Bangkok\r\nX-LIC-LOCATION:Asia/Bangkok\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:+0700\r\nTZOFFSETTO:+0700\r\nTZNAME:+07\r\nDTSTART:19700101T000000\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\n` +
  `BEGIN:VTIMEZONE\r\nTZID:SE Asia Standard Time\r\nBEGIN:STANDARD\r\nDTSTART:16010101T000000\r\nTZOFFSETFROM:+0700\r\nTZOFFSETTO:+0700\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\n`
const ev = (lines) => 'BEGIN:VEVENT\r\n' + lines.join('\r\n') + '\r\nEND:VEVENT\r\n'
const cal = (events) => 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Google Inc//Google Calendar 70.9054//EN\r\n' + TZ + events.join('') + 'END:VCALENDAR\r\n'
const bkk = (local) => utcOf(local, 'Asia/Bangkok')

test('busy times: repeats, a moved date, a skipped date, free and cancelled events, zones', () => {
  const text = cal([
    ev(['DTSTART;TZID=Asia/Bangkok:20261005T140000', 'DTEND;TZID=Asia/Bangkok:20261005T153000', 'RRULE:FREQ=WEEKLY;BYDAY=MO', 'EXDATE;TZID=Asia/Bangkok:20261109T140000', 'UID:lions@google.com', 'SUMMARY:Lions']),
    ev(['DTSTART;TZID=Asia/Bangkok:20261102T170000', 'DTEND;TZID=Asia/Bangkok:20261102T180000', 'RECURRENCE-ID;TZID=Asia/Bangkok:20261102T140000', 'UID:lions@google.com', 'SUMMARY:Lions, later']),
    ev(['DTSTART;VALUE=DATE:20261104', 'DTEND;VALUE=DATE:20261105', 'TRANSP:TRANSPARENT', 'UID:bday@google.com', 'SUMMARY:A birthday']),
    ev(['DTSTART;VALUE=DATE:20261106', 'DTEND;VALUE=DATE:20261107', 'UID:trip@google.com', 'SUMMARY:Bangkok']),
    ev(['DTSTART:20261103T050000Z', 'DTEND:20261103T060000Z', 'UID:dentist@google.com']),
    ev(['DTSTART:20261110T050000Z', 'DTEND:20261110T060000Z', 'STATUS:CANCELLED', 'UID:gone@google.com']),
    ev(['DTSTART;TZID=SE Asia Standard Time:20261105T090000', 'DTEND;TZID=SE Asia Standard Time:20261105T100000', 'UID:outlook@example.com']),
    ev(['DTSTART:20261108T100000', 'DTEND:20261108T110000', 'UID:floating@example.com']),
  ])
  const got = busySpans(text, bkk('2026-11-02T00:00'), bkk('2026-11-16T00:00'), 'Asia/Bangkok')
  const want = [['2026-11-02T17:00', '2026-11-02T18:00'], ['2026-11-03T12:00', '2026-11-03T13:00'], ['2026-11-05T09:00', '2026-11-05T10:00'],
    ['2026-11-06T00:00', '2026-11-07T00:00'], ['2026-11-08T10:00', '2026-11-08T11:00']].map(([a, b]) => [bkk(a), bkk(b)])
  assert.deepEqual(got, want)
  // the weekly event goes on after the window opens: the next Monday after the skipped one is busy
  assert.ok(busySpans(text, bkk('2026-11-16T00:00'), bkk('2026-11-17T00:00'), 'Asia/Bangkok').some(([a]) => a === bkk('2026-11-16T14:00')))
})

test('the booking settings keep up to three calendar addresses, https and known hosts only', () => {
  const d = normalize({ name: 'x', book: { ical: ['webcal://p12-caldav.icloud.com/published/2/abc', 'http://calendar.google.com/x.ics', 'https://evil.example/x.ics',
    'https://calendar.google.com/calendar/ical/a%40gmail.com/private-1/basic.ics', 'https://outlook.office365.com/owa/calendar/1/2/calendar.ics', 'https://calendar.google.com/4.ics'] } })
  assert.deepEqual(d.book.ical, ['https://p12-caldav.icloud.com/published/2/abc', 'https://calendar.google.com/calendar/ical/a%40gmail.com/private-1/basic.ics', 'https://outlook.office365.com/owa/calendar/1/2/calendar.ics'])
})

const GCAL = 'https://calendar.google.com/calendar/ical/frank%40example.com/private-abc/basic.ics'
async function tailor(o = {}) {
  const token = 'tok' + (o.id ?? 'fk1') + 'z'.repeat(33), now = new Date().toISOString()
  const d = normalize({ name: 'Fashion King', place: { addr: '99/5-6 Sridonchai Road' }, svc: [{ id: 'fit1', n: 'First fitting', mins: 45, cap: 1 }],
    hours: { on: true, tz: 'Asia/Bangkok', week: Array.from({ length: 7 }, () => [['11:00', '23:00']]) }, book: { step: 30, lead: 0, ahead: 30, ical: o.ical ?? [GCAL] } })
  await env.DB.prepare('INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until, trial, plan) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(o.id ?? 'fk1', o.name ?? 'fashion-king', await sha(token), 'live', 'local', 'clean', 'en', JSON.stringify(d), now, now, o.tier ?? 'gold', null, 0, 'gold').run()
  return { name: o.name ?? 'fashion-king', token }
}
const owner = (s, path) => go('/api/' + path, { headers: { 'x-edit': s.token, origin: O } })

test('his own calendar closes those times; the bookings come back as his private calendar', async () => {
  const s = await tailor()
  const day = addDays(dayIn('Asia/Bangkok', Date.now()), 2)
  const stamp = (local) => new Date(bkk(local)).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const realFetch = globalThis.fetch
  globalThis.fetch = async (u, init) => String(u) === GCAL
    ? new Response(cal([ev([`DTSTART:${stamp(day + 'T14:00')}`, `DTEND:${stamp(day + 'T15:30')}`, 'UID:lions@google.com', 'SUMMARY:Lions'])]), { headers: { 'content-type': 'text/calendar' } })
    : realFetch(u, init)
  try { assert.equal(await readCalendars(env, gold.isGold, normalize), 1) } finally { globalThis.fetch = realFetch }

  const times = (await (await go(`/api/slots?n=${s.name}&svc=fit1&day=${day}`)).json()).times.map((x) => x.t)
  assert.ok(times.includes('13:00') && times.includes('15:30'), 'free on either side')
  for (const t of ['13:30', '14:00', '14:30', '15:00']) assert.ok(!times.includes(t), t + ' overlaps the busy time')
  const taken = await post('/api/book', { n: s.name, kind: 'svc', item: 'fit1', day, t: '14:00', name: 'Somchai', reach: '081', ms: 5000 })
  assert.equal(taken.status, 409)
  const ok = await post('/api/book', { n: s.name, kind: 'svc', item: 'fit1', day, t: '16:00', name: 'Somchai', reach: '081-234-5678', note: 'Navy wool, two-piece', ms: 5000 })
  assert.equal(ok.status, 200)

  // the address only the editor shows
  const site = await (await owner(s, 'site')).json()
  assert.match(site.calfeed, /^http:\/\/localhost\/fashion-king\/bookings\.ics\?k=[a-f0-9]{24}$/)
  const r = await go(site.calfeed.slice(O.length))
  assert.equal(r.status, 200)
  assert.match(r.headers.get('content-type'), /text\/calendar/)
  const ics = await r.text()
  assert.match(ics, /SUMMARY:\? First fitting · Somchai/)
  assert.match(ics, /STATUS:TENTATIVE/)
  assert.match(ics, new RegExp('DTSTART:' + stamp(day + 'T16:00')))
  assert.match(ics, /Navy wool\\, two-piece/)
  assert.match(ics, /LOCATION:99\/5-6 Sridonchai Road/)
  assert.equal((await go('/fashion-king/bookings.ics?k=' + '0'.repeat(24))).status, 404)
  assert.equal((await go('/fashion-king/bookings.ics')).status, 404)

  // a page with no calendar listed: nothing closed, nothing read
  const other = await tailor({ id: 'fk2', name: 'other-tailor', ical: [] })
  const all = (await (await go(`/api/slots?n=${other.name}&svc=fit1&day=${day}`)).json()).times.map((x) => x.t)
  assert.ok(all.includes('14:00'))
})

test('a free page has no bookings calendar', async () => {
  const s = await tailor({ id: 'fk3', name: 'free-tailor', tier: 'free' })
  const site = await (await owner(s, 'site')).json()
  assert.equal(site.calfeed, '')
})
