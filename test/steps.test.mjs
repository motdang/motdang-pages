// Steps to paid (Nan 2026-10-26: "count each step to paid"): people once a day per step, machines not at all,
// where they came from, and the admin table. An in-memory D1 (node:sqlite).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker from '../src/worker.mjs'
import * as steps from '../src/steps.mjs'

const MIGRATIONS = readdirSync(new URL('../migrations/', import.meta.url)).sort()
function wrap(db) {
  const st = (sql, args = []) => {
    const s = db.prepare(sql), a = args.map((x) => (x === undefined ? null : x))
    return {
      bind: (...b) => st(sql, b),
      first: async (col) => { const r = s.get(...a); return r ? (col ? r[col] : { ...r }) : null },
      all: async () => ({ results: s.all(...a).map((r) => ({ ...r })) }),
      run: async () => ({ meta: { changes: Number(s.run(...a).changes) } }),
    }
  }
  return { prepare: (sql) => st(sql), batch: async (xs) => Promise.all(xs.map((x) => x.run())) }
}
const d1 = () => { const db = new DatabaseSync(':memory:'); for (const f of MIGRATIONS) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8')); return wrap(db) }
const PHONE = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36'
const browser = (url, h = {}) => new Request(url, { headers: { 'user-agent': PHONE, 'sec-fetch-mode': 'navigate', 'cf-connecting-ip': '1.2.3.4', ...h } })
const env = () => ({ DB: d1(), SESSION_SECRET: 's', ASSETS: { fetch: async () => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }) } })
const run = async (e, req) => { const w = []; const r = await worker.fetch(req, e, { waitUntil: (p) => w.push(p) }); await Promise.all(w); return r }

test('the front page and the page maker count a person once a day, with where they came from', async () => {
  const e = env()
  assert.equal((await run(e, browser('http://localhost/'))).status, 200)
  await run(e, browser('http://localhost/'))
  await run(e, browser('http://localhost/', { 'cf-connecting-ip': '5.6.7.8' }))
  await run(e, browser('http://localhost/make?from=place'))
  await run(e, browser('http://localhost/make', { 'cf-connecting-ip': '5.6.7.8', referer: 'http://localhost/' }))
  await run(e, new Request('http://localhost/', { headers: { 'user-agent': 'Googlebot/2.1' } }))
  const r = await steps.report(e.DB ? e : e, 14)
  assert.equal(r.total.home, 2)
  assert.equal(r.total.make, 2)
  assert.deepEqual(r.src.make, { place: 1, home: 1 })
  assert.deepEqual(r.src.home, { direct: 2 })
})

test('a page counts once when made, once online; a payment once', async () => {
  const e = env()
  for (let i = 0; i < 2; i++) {
    await steps.count(e, null, 'made', { who: 'page1' })
    await steps.count(e, null, 'online', { who: 'page1' })
    await steps.count(e, null, 'paid', { who: 'pay1', src: 'gold' })
  }
  await steps.count(e, null, 'gold', { who: 'page1', src: 'draft' })
  assert.equal(await steps.count(e, null, 'nonsense', { who: 'x' }), false)
  const r = await steps.report(e, 14)
  assert.deepEqual([r.total.made, r.total.online, r.total.gold, r.total.paid, r.total.slip], [1, 1, 1, 1, 0])
  const html = steps.table(r, (s) => String(s))
  assert.match(html, /Front page.*Page maker.*Page made.*Page online.*Gold tab.*Slip sent.*Paid/)
  assert.match(html, /Paid: gold 1/)
})

test('sources in one word', () => {
  const u = new URL('https://sites.motdang.net/make')
  const r = (ref) => new Request(u, { headers: ref ? { referer: ref } : {} })
  assert.equal(steps.sourceOf(r(''), u), 'direct')
  assert.equal(steps.sourceOf(r('https://motdang.net/cm/p/x.html'), u), 'motdang')
  assert.equal(steps.sourceOf(r('https://m.facebook.com/'), u), 'facebook')
  assert.equal(steps.sourceOf(r('https://sites.motdang.net/'), u), 'home')
  assert.equal(steps.sourceOf(r(''), new URL('https://sites.motdang.net/make?from=place')), 'place')
})
