// The founder's path through the worker, on an in-memory D1 (node:sqlite).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker, { sha } from '../src/worker.mjs'
import * as slipq from '../src/slipq.mjs'
import * as founding from '../src/founding.mjs'

function d1() {
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(new URL('../migrations/', import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'))
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
const media = () => { const m = new Map(); return { put: async (k, v) => { m.set(k, v) }, get: async (k) => (m.has(k) ? { body: m.get(k), httpMetadata: {} } : null), delete: async () => {} } }

const O = 'http://localhost'
const env = { DB: d1(), MEDIA: media(), SESSION_SECRET: 's', PROMPTPAY: '0812345678', GOLD_THB: '3000' }
const go = (path, init = {}) => worker.fetch(new Request(O + path, { redirect: 'manual', ...init }), env, { waitUntil() {} })
const form = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f }

test('founders: ask, pay, check, codes, a Gold year on a page, the wall', async () => {
  let r = await go('/founders')
  assert.equal(r.status, 200)
  let t = await r.text()
  assert.match(t, /฿3,000/)
  assert.match(t, /The wall/)

  r = await go('/founders', { method: 'POST', body: form({ name: 'Nan', show: '1', contact: 'line nan' }) })
  assert.equal(r.status, 303)
  const bill = new URL(r.headers.get('location')).pathname
  assert.match(bill, /^\/fm\//)
  t = await (await go(bill)).text()
  assert.match(t, /฿3,000\.\d\d/)
  assert.match(t, /<svg/) // the PromptPay QR

  const slip = new File([new Uint8Array([255, 216, 255])], 's.jpg', { type: 'image/jpeg' })
  r = await go(bill, { method: 'POST', body: form({ slip }) })
  assert.equal(r.status, 303)
  const pay = await env.DB.prepare("SELECT * FROM pay WHERE plan = 'founding'").first()
  assert.equal(pay.status, 'slip')
  assert.match(await (await go(bill)).text(), /waiting for a check/)

  // Beer's link from LINE: the slip, then Paid
  const q = new URL(await slipq.link(env, O, pay.id, sha)).pathname
  assert.match(await (await go(q)).text(), /Founding member · Nan/)
  r = await go(q, { method: 'POST', body: form({ act: 'ok' }) })
  assert.equal(r.status, 303)
  const f = await env.DB.prepare('SELECT * FROM founder').first()
  assert.equal(f.status, 'paid')
  assert.equal(f.n, 1)
  const codes = (await env.DB.prepare('SELECT code FROM gift WHERE founder = ?').bind(f.id).all()).results.map((x) => x.code)
  assert.equal(codes.length, 2)
  t = await (await go(bill)).text()
  assert.match(t, /#1 Nan/)
  for (const c of codes) assert.ok(t.includes(c))

  // a code on a page
  const now = new Date().toISOString()
  env.DB.raw.prepare("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, tier, d, created, updated) VALUES ('s1','noi-som','x','live','shop','plain','th','free','{\"name\":\"Noi Som\"}',?,?)").run(now, now)
  assert.match(await (await go('/g/' + codes[0])).text(), /founding member #1 Nan/)
  r = await go('/g/' + codes[0], { method: 'POST', body: form({ page: 'nope-nope' }) })
  assert.equal(r.status, 400)
  r = await go('/g/' + codes[0], { method: 'POST', body: form({ page: 'https://sites.motdang.net/noi-som/' }) })
  assert.equal(r.status, 303)
  assert.equal(new URL(r.headers.get('location')).pathname, '/noi-som')
  const s = await env.DB.prepare("SELECT tier, gold_until, plan FROM site WHERE id = 's1'").first()
  assert.equal(s.tier, 'gold')
  assert.equal(s.plan, 'gold')
  assert.ok(s.gold_until > now.slice(0, 10))
  r = await go('/g/' + codes[0], { method: 'POST', body: form({ page: 'noi-som' }) })
  assert.match(await r.text(), /Used on/)
  assert.match(await (await go(bill)).text(), /Used on/)

  // the wall, and a name kept off it
  await go('/founders', { method: 'POST', body: form({ name: 'Quiet one' }) })
  t = await (await go('/founders')).text()
  assert.match(t, /#1 Nan/)
  assert.ok(!t.includes('Quiet one'))

  // the 1st: one seat of 15 taken, the price steps down a rung and #sales hears of it
  const said = []
  const nov = await founding.thisMonth(env, Date.parse('2026-11-01T09:00:00+07:00'), (c) => said.push(c))
  const oct = await env.DB.prepare('SELECT * FROM founding_month ORDER BY month LIMIT 1').first()
  if (oct.month === '2026-10') {
    assert.equal(nov.price, 2500)
    assert.equal(nov.seats, founding.SEATS)
    assert.match(said[0], /Seats taken: 1 of/)
  }
})

test('a full month takes no more asks', async () => {
  const m = founding.bkkMonth()
  await env.DB.prepare('UPDATE founding_month SET seats = 1 WHERE month = ?').bind(m).run()
  const r = await go('/founders', { method: 'POST', body: form({ name: 'Late' }) })
  assert.equal(r.status, 303)
  assert.equal(new URL(r.headers.get('location')).pathname, '/founders')
  assert.match(await (await go('/founders')).text(), /Full this month/)
})

test('a Gold month code from the week on Mot Dang on LINE (motdang.net me.js): a month, then used', async () => {
  const now = new Date().toISOString()
  env.DB.raw.prepare("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, tier, d, created, updated) VALUES ('s2','baan-x','x2','live','shop','plain','th','free','{\"name\":\"Baan X\"}',?,?)").run(now, now)
  env.DB.raw.prepare("INSERT INTO gift (code, founder, made, months, source) VALUES ('linemonth1', '', ?, 1, 'line')").run(now)
  let t = await (await go('/g/linemonth1')).text()
  assert.match(t, /A Gold month/)
  assert.match(t, /from Mot Dang on LINE/)
  const r = await go('/g/linemonth1', { method: 'POST', body: form({ page: 'baan-x' }) })
  assert.equal(r.status, 303)
  const s = await env.DB.prepare("SELECT tier, gold_until, plan FROM site WHERE id = 's2'").first()
  assert.equal(s.tier, 'gold')
  assert.equal(s.plan, 'gold', 'a month of Gold, not the hotel plan')
  const days = (new Date(s.gold_until) - new Date(now.slice(0, 10))) / 864e5
  assert.ok(days >= 28 && days <= 31, String(days))
  t = await (await go('/g/linemonth1')).text()
  assert.match(t, /Used on/)
  assert.equal((await go('/g/nosuchcode')).status, 404)
})
