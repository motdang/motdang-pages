// Hotel booking counts its own months (Nan 2026-10-21: "charge hotel booking by the month"). On an in-memory D1 (node:sqlite).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker, { sha } from '../src/worker.mjs'
import * as gold from '../src/gold.mjs'
import * as slipq from '../src/slipq.mjs'
import { trialNotes } from '../src/cron.mjs'
import { ui, UI_LANGS } from '../public/s/make-words.mjs'

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
function d1(upTo) {
  const db = new DatabaseSync(':memory:')
  for (const f of MIGRATIONS) if (!upTo || f <= upTo) db.exec(sqlOf(f))
  return wrap(db)
}
const media = () => { const m = new Map(); return { put: async (k, v) => { m.set(k, v) }, get: async (k) => (m.has(k) ? { body: m.get(k), httpMetadata: {} } : null), delete: async () => {} } }

const DAY = 864e5
const day = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10)
/** n months from a YYYY-MM-DD (or today), as the code adds them */
const plus = (from, n) => { const d = new Date(from || Date.now()); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10) }

const O = 'http://localhost'
const env = { DB: d1(), MEDIA: media(), SESSION_SECRET: 's', PROMPTPAY: '0812345678', GOLD_THB: '3000', HOTEL_THB: '555', HOTEL_YEAR_THB: '5550' }
const go = (path, init = {}) => worker.fetch(new Request(O + path, { redirect: 'manual', ...init }), env, { waitUntil() {} })
const D = JSON.stringify({ name: 'Hotel', rooms: [{ id: 'room01', n: 'Room', p: '900', guests: 2, units: 1 }], ota: { agoda: 'https://www.agoda.com/x/hotel/chiang-mai-th.html' } })
let n = 0
async function site(o = {}, db = env.DB) {
  n++
  const id = 's' + n, token = 'tok' + String(n).padStart(2, '0') + 'x'.repeat(30)
  const now = new Date().toISOString()
  await db.prepare('INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until, hotel_until, trial, plan) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, 'hotel-' + n, await sha(token), 'live', 'stay', 'poster', 'th', D, now, now, o.tier ?? 'gold', o.gold ?? null, o.hotel ?? null, o.trial ? 1 : 0, o.plan ?? 'gold').run()
  return { id, name: 'hotel-' + n, token }
}
const row = (id, db = env.DB) => db.prepare('SELECT * FROM site WHERE id = ?').bind(id).first()
const api = async (s, path, init = {}) => (await go('/api/' + path, { ...init, headers: { 'x-edit': s.token, origin: O, 'content-type': 'application/json', ...(init.headers || {}) } })).json()

test('a Gold year adds hotel booking by the month: the Gold year stays, each month starts where the last ends', async () => {
  const s = await site({ gold: day(200) })
  assert.ok(!gold.isHotel(await row(s.id)))
  await gold.grant(env, s.id, 1, 'hotel')
  let r = await row(s.id)
  assert.equal(r.gold_until, day(200), 'the Gold year is unchanged')
  assert.equal(r.hotel_until, plus(null, 1))
  assert.ok(gold.isHotel(r))
  await gold.grant(env, s.id, 1, 'hotel')
  r = await row(s.id)
  assert.equal(r.hotel_until, plus(plus(null, 1), 1), 'a second month comes after the first')
  assert.equal(r.gold_until, day(200))
  assert.equal(r.plan, 'gold', 'hotel booking leaves the plan alone')
})

test('booking follows the hotel months: on while they last, off after, the page stays Gold', async () => {
  const s = await site({ gold: day(200), hotel: day(3) })
  assert.ok(gold.isGold(await row(s.id)) && gold.isHotel(await row(s.id)))
  // the page and the room calendar, while the hotel months last
  assert.match(await (await go('/' + s.name)).text(), /data-pick="room01"/)
  assert.equal((await go(`/api/nights?n=${s.name}&room=room01`)).status, 200)
  // after the last hotel day
  await env.DB.prepare('UPDATE site SET hotel_until = ? WHERE id = ?').bind(day(-1), s.id).run()
  const r = await row(s.id)
  assert.ok(gold.isGold(r) && !gold.isHotel(r), 'Gold stays, hotel booking is off')
  const html = await (await go('/' + s.name)).text()
  assert.ok(!html.includes('data-pick=') && html.includes('ota-agoda'), 'the Agoda button shows, direct booking does not')
  assert.equal((await go(`/api/nights?n=${s.name}&room=room01`)).status, 404)
  // today is the last day: still on
  await env.DB.prepare('UPDATE site SET hotel_until = ? WHERE id = ?').bind(day(0), s.id).run()
  assert.ok(gold.isHotel(await row(s.id)))
})

test('the free 30 days carry hotel booking; Gold alone does not', async () => {
  assert.ok(gold.isHotel(await row((await site({ trial: true, gold: day(20) })).id)))
  assert.ok(!gold.isHotel(await row((await site({ gold: day(200), plan: 'hotel' })).id)), 'the old plan flag no longer turns it on')
  assert.ok(!gold.isHotel(await row((await site({ tier: 'free', hotel: day(5) })).id)), 'no Gold, no booking')
})

test('the hotel year is 12 months of Gold and 12 of hotel booking', async () => {
  const s = await site({ tier: 'free' })
  await gold.grant(env, s.id, 12, 'hotel')
  const r = await row(s.id)
  assert.equal(r.gold_until, plus(null, 12))
  assert.equal(r.hotel_until, plus(null, 12))
  assert.equal(r.tier, 'gold')
  // on a Gold year already: 12 more of each, each from its own end
  const g = await site({ gold: day(100), hotel: day(10) })
  await gold.grant(env, g.id, 12, 'hotel')
  const q = await row(g.id)
  assert.equal(q.gold_until, plus(day(100), 12))
  assert.equal(q.hotel_until, plus(day(10), 12))
})

test('the hotel month on a page with no Gold is a month of each', async () => {
  const s = await site({ tier: 'free' })
  await gold.grant(env, s.id, 1, 'hotel')
  const r = await row(s.id)
  assert.equal(r.tier, 'gold')
  assert.equal(r.gold_until, plus(null, 1))
  assert.equal(r.hotel_until, plus(null, 1))
  // a page whose Gold ran out
  const old = await site({ gold: day(-40), hotel: day(-40) })
  await gold.grant(env, old.id, 1, 'hotel')
  assert.equal((await row(old.id)).gold_until, plus(null, 1))
})

test('a page in its free days starts its first paid hotel month after them', async () => {
  const s = await site({ trial: true, gold: day(12) })
  await gold.grant(env, s.id, 1, 'hotel')
  const r = await row(s.id)
  assert.equal(r.trial, 0)
  assert.equal(r.hotel_until, plus(day(12), 1))
  assert.equal(r.gold_until, plus(day(12), 1))
  assert.ok(gold.isHotel(r))
})

test('Gold that would end before the hotel months is carried to their last day', async () => {
  const s = await site({ gold: day(10) })
  await gold.grant(env, s.id, 1, 'hotel')
  const r = await row(s.id)
  assert.equal(r.hotel_until, plus(null, 1))
  assert.equal(r.gold_until, r.hotel_until, 'Gold covers every hotel day')
})

test('Gold on its own leaves the hotel months as they are; a code is Gold only', async () => {
  const s = await site({ gold: day(100), hotel: day(30) })
  await gold.grant(env, s.id, 12, 'gold')
  let r = await row(s.id)
  assert.equal(r.gold_until, plus(day(100), 12))
  assert.equal(r.hotel_until, day(30))
  assert.ok(gold.isHotel(r))
  await gold.grant(env, s.id, 1, 'gold') // a Gold month from a code
  r = await row(s.id)
  assert.equal(r.hotel_until, day(30))
})

test('hotel booking leaves Sala Sian membership alone', async () => {
  const s = await site({ gold: day(100), plan: 'sian' })
  await gold.grant(env, s.id, 1, 'hotel')
  assert.equal((await row(s.id)).plan, 'sian')
})

test('a Gold code on a page with hotel months is taken, and the hotel months stay', async () => {
  const s = await site({ gold: day(60), hotel: day(20) })
  const now = new Date().toISOString()
  env.DB.raw.prepare("INSERT INTO gift (code, founder, made, months, source) VALUES ('hotelcode1', '', ?, 1, 'line')").run(now)
  const r = await go('/g/hotelcode1', { method: 'POST', body: (() => { const f = new FormData(); f.append('page', s.name); return f })() })
  assert.equal(r.status, 303)
  const q = await row(s.id)
  assert.equal(q.gold_until, plus(day(60), 1))
  assert.equal(q.hotel_until, day(20))
})

test('through the worker: the builder reads the dates; a payment approved on LINE adds the month', async () => {
  const s = await site({ gold: day(300) })
  let j = await api(s, 'site')
  assert.equal(j.hotel, false)
  assert.equal(j.hotel_until, '')
  assert.deepEqual([j.plans.gold.baht, j.plans.hotel.baht, j.plans.hotelyear.baht], [3000, 555, 5550])
  const start = await api(s, 'gold', { method: 'POST', body: JSON.stringify({ plan: 'hotel' }) })
  assert.equal(Math.floor(Number(start.amount)), 555)
  assert.equal(start.months, 1)
  assert.equal(start.hotel, true, 'the plan asked for is a hotel plan')
  assert.equal(start.hotel_now, false, 'the page has no hotel months yet')
  const pay = await env.DB.prepare("SELECT * FROM pay WHERE site_id = ? AND status = 'open'").bind(s.id).first()
  assert.equal(pay.plan, 'hotel')
  const q = new URL(await slipq.link(env, O, pay.id, sha)).pathname
  const f = new FormData(); f.append('act', 'ok')
  assert.equal((await go(q, { method: 'POST', body: f })).status, 303)
  j = await api(s, 'site')
  assert.equal(j.hotel, true)
  assert.equal(j.hotel_until, plus(null, 1))
  assert.equal(j.gold_until, day(300))
  // the maker pays again: the next month comes after this one
  const again = await api(s, 'gold', { method: 'POST', body: JSON.stringify({ plan: 'hotel' }) })
  assert.equal(again.hotel_until, plus(null, 1))
  assert.equal(again.hotel_now, true)
  const p2 = await env.DB.prepare("SELECT * FROM pay WHERE site_id = ? AND status = 'open'").bind(s.id).first()
  const f2 = new FormData(); f2.append('act', 'ok')
  await go(new URL(await slipq.link(env, O, p2.id, sha)).pathname, { method: 'POST', body: f2 })
  j = await api(s, 'site')
  assert.equal(j.hotel_until, plus(plus(null, 1), 1))
  assert.equal(j.gold_until, day(300))
})

test('migration 0025: a page that has hotel booking today keeps it to the end of its period', async () => {
  const db = d1('0023_gift_months.sql') // the database as it is in production today
  const now = new Date().toISOString()
  const add = (id, o) => db.raw.prepare("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until, plan, trial) VALUES (?,?,?,'live','stay','poster','th','{}',?,?,?,?,?,?)").run(id, id, 'h' + id, now, now, o.tier, o.gold, o.plan, o.trial || 0)
  add('hot', { tier: 'gold', gold: '2026-11-21', plan: 'hotel' })
  add('yr', { tier: 'gold', gold: '2027-10-01', plan: 'gold' })
  add('tri', { tier: 'gold', gold: '2026-11-10', plan: 'gold', trial: 1 })
  add('old', { tier: 'free', gold: '2026-09-01', plan: 'hotel' })
  add('none', { tier: 'free', gold: null, plan: 'gold' })
  db.raw.exec(sqlOf('0025_hotel_months.sql'))
  const got = Object.fromEntries(db.raw.prepare('SELECT id, hotel_until FROM site').all().map((r) => [r.id, r.hotel_until]))
  assert.deepEqual(got, { hot: '2026-11-21', yr: null, tri: null, old: '2026-09-01', none: null })
  // and the page reads as before: on to the end of the period, nothing before it began
  const hot = await db.prepare("SELECT * FROM site WHERE id = 'hot'").first()
  assert.equal(hot.hotel_until, hot.gold_until)
})

test('the builder has its words for hotel months in each language that has the hotel words', () => {
  for (const l of Object.keys(UI_LANGS)) {
    if (l === 'my') continue // Burmese shows the English for these lines, as for the other hotel words
    for (const k of ['g_hotelOn', 'g_hotelMore', 'g_hotelAddWhy']) assert.notEqual(ui(l, k), k, `${l} ${k}`)
    assert.ok(ui(l, 'g_hotelOn').includes('{d}') && ui(l, 'g_hotelMore').includes('{p}'), l)
  }
  assert.equal(ui('en', 'g_hotelOn'), 'Hotel booking until {d}')
  assert.equal(ui('en', 'g_hotelMore'), 'Add a month of hotel booking: ฿{p}')
  const src = readFileSync(new URL('../public/s/make.js', import.meta.url), 'utf8')
  assert.ok(!/S\.plan\b/.test(src), 'the builder does not read the old plan flag')
  assert.match(src, /hotelOn \? 'g_hotelMore' : 'g_hotelGo'/)
})

test('the trial note says Gold and hotel booking for a page with rooms, and only Gold for the rest', async () => {
  const sent = []
  const real = globalThis.fetch
  globalThis.fetch = async (u, init) => { sent.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }) }
  const e = { DB: d1(), RESEND_KEY: 'k' }
  const soon = new Date(Date.now() + 2 * DAY).toISOString().slice(0, 10), now = new Date().toISOString()
  const add = (id, d) => e.DB.raw.prepare("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until, trial, notify_email, notify_ok) VALUES (?,?,?,'live','shop','poster','th',?,?,?,'gold',?,1,'a@b.co',1)").run(id, id, 'h' + id, JSON.stringify(d), now, now, soon)
  add('shop1', { name: 'Shop' })
  add('hotel1', { name: 'Hotel', rooms: [{ n: 'Room', p: '900' }] })
  try { await trialNotes(e, 'https://sites.motdang.net', gold.PLANS({})) } finally { globalThis.fetch = real }
  const by = (t) => sent.find((m) => m.subject.startsWith(t))
  assert.match(by('Shop').html, /Gold on this page runs to/)
  assert.match(by('Hotel').html, /Gold and hotel booking on this page run to/)
  assert.match(by('Hotel').text, /Gold and hotel booking until /)
})
