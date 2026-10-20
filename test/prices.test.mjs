// Prices that follow demand (NaN 2026-10-20): the rules, then a maker's and an amulet seller's
// weeks through the worker on an in-memory D1 (node:sqlite).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker, { sha } from '../src/worker.mjs'
import * as prices from '../src/prices.mjs'
import { normalize, render } from '../public/s/render.mjs'
import { ladder, step, soldMove, askMove, batchOf, nextCheck, weekOf, dynOf, bahtOf } from '../public/s/shoup.mjs'

test('the ladder: round steps, lucky nines, no step over 25%', () => {
  const L = ladder('round')
  assert.deepEqual(L.slice(L.indexOf(100), L.indexOf(100) + 7), [100, 120, 150, 180, 200, 250, 300])
  for (let i = 1; i < L.length; i++) assert.ok(L[i] / L[i - 1] <= 1.25 + 1e-9, `${L[i - 1]} → ${L[i]}`)
  assert.deepEqual(ladder('nine').slice(ladder('nine').indexOf(99), ladder('nine').indexOf(99) + 4), [99, 119, 149, 179])
  assert.equal(bahtOf('฿1,500 บาท'), 1500)
})

test('made things: 80% of the month sold goes up, under 60% down, never under the lowest', () => {
  assert.equal(soldMove(9, 10).move, 1)
  assert.equal(soldMove(7, 10).move, 0)
  assert.equal(soldMove(5, 10).move, -1)
  assert.equal(soldMove(2, 10, 10).move, 0) // ten days in, 2 of a 10-a-month pace holds
  assert.equal(step(300, 1), 350)
  assert.equal(step(300, -1), 250)
  assert.equal(step(300, -1, { low: 280 }), 300) // the rung under 300 is 250, under her 280
  assert.equal(step(250, 1, { open: 100 }), 300)
  assert.equal(step(300, 1, { open: 100 }), 300) // at the top
  let p = 100
  for (let i = 0; i < 20; i++) p = step(p, 1, { open: 100 })
  assert.equal(p, 300) // six rungs over where it opened, at most
})

test('amulets: a batch shares its asks; no ask holds unless the seller lets it fall', () => {
  assert.equal(askMove({ asks: 2 }), 1)
  assert.equal(askMove({ asks: 0, sold: 1 }), 1) // a sale counts two
  assert.equal(askMove({ asks: 1, quiet: 1 }), 0)
  assert.equal(askMove({ asks: 0, quiet: 0 }), 0)
  assert.equal(askMove({ asks: 0, quiet: 0, fall: true }), -1)
  const a = { id: 'a1', temple: 'วัดสวนดอก', maker: 'ครูบาศรีวิชัย', year: '2482', mould: '' }
  assert.equal(batchOf(a), batchOf({ ...a, id: 'a2', temple: ' วัดสวนดอก ' }))
  assert.equal(batchOf({ id: 'a3', temple: 'วัดสวนดอก' }), 'a:a3') // one fact is not a batch
})

test('the check runs Monday 06:00 Bangkok; the week is that Monday', () => {
  const tue = Date.parse('2026-10-20T10:00:00+07:00')
  assert.equal(nextCheck(tue).toISOString(), '2026-10-25T23:00:00.000Z') // Mon 26 Oct 06:00 ICT
  assert.equal(weekOf(tue), '2026-10-19')
  assert.equal(weekOf(Date.parse('2026-10-26T05:59:00+07:00')), '2026-10-19')
  assert.equal(weekOf(Date.parse('2026-10-26T06:00:00+07:00')), '2026-10-26')
  assert.equal(dynOf({ on: false }), null)
  assert.deepEqual(dynOf({ on: 1, per: '10', low: '250', kind: 'x', junk: 1 }), { on: true, per: 10, low: 250, open: 0, fall: false, kind: 'round' })
})

// ---- through the worker ----------------------------------------------------------------

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
  return { prepare: (sql) => st(sql), batch: async (xs) => { for (const x of xs) await x.run() }, raw: db }
}
const O = 'http://localhost'
const env = { DB: d1(), MEDIA: { get: async () => null, put: async () => {}, delete: async () => {} }, SESSION_SECRET: 's', AI: { run: async () => ({ response: 'safe' }) } }
const wait = []
const go = (path, init = {}) => worker.fetch(new Request(O + path, { redirect: 'manual', ...init, headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 14) Mobile', 'sec-fetch-mode': 'navigate', ...(init.headers || {}) } }), env, { waitUntil(p) { wait.push(p) } })
const api = (path, method, token, b) => go('/api/' + path, { method, headers: { 'x-edit': token, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json())

async function page(name, kind, d, token, since) {
  const nd = normalize(d)
  for (const x of [...nd.items, ...nd.amulets]) if (x.dyn) x.dyn.since = since
  await env.DB.prepare("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier) VALUES (?,?,?,'live',?,'poster','th',?,?,?,'free')")
    .bind(name + 'id', name, await sha(token), kind, JSON.stringify(nd), '2026-10-01', '2026-10-01').run()
  return name + 'id'
}

test('a weaver at Warorot: sales she marks move the price on Monday; her own change opens it again', async () => {
  const token = 'w'.repeat(40)
  const id = await page('pha-thor', 'shop', { name: 'ผ้าทอ', items: [
    { id: 'scarf', n: 'ผ้าพันคอ', p: '300', dyn: { on: true, per: 10, low: 250 } },
    { id: 'bags', n: 'ย่าม', p: '450', dyn: { on: true, per: 10, low: 400 } },
    { id: 'mats', n: 'เสื่อ', p: '900' },
  ] }, token, '2026-10-01')
  for (let i = 0; i < 9; i++) await api('mark', 'POST', token, { item: 'scarf', kind: 'sold', qty: 1 })
  await api('mark', 'POST', token, { item: 'scarf', kind: 'sold', qty: 1 })
  let v = await api('mark', 'POST', token, { item: 'scarf', kind: 'sold', qty: -1 }) // a tap taken back
  const scarf = v.pieces.find((x) => x.id === 'scarf')
  assert.equal(scarf.counts.sold, 9)
  assert.deepEqual(scarf.out, { move: 1, to: 350 })
  assert.equal(v.pieces.find((x) => x.id === 'bags').out.to, 400) // nothing sold: one down, to her lowest
  assert.equal(v.pieces.find((x) => x.id === 'mats').moving, false)
  assert.equal((await api('mark', 'POST', token, { item: 'nope', kind: 'sold', qty: 1 })).error, 'not-found')

  const s = await env.DB.prepare('SELECT d FROM site WHERE id = ?').bind(id).first()
  const steps = await prices.settle(env, id, normalize(JSON.parse(s.d)), '2026-10-26', Date.now())
  assert.deepEqual(steps.map((x) => [x.id, x.from, x.to]), [['scarf', 300, 350], ['bags', 450, 400]])
  let html = await (await go('/pha-thor')).text()
  assert.match(html, /ผ้าพันคอ.*?350/s)
  assert.match(html, /ย่าม.*?400/s)
  assert.match(html, /เสื่อ.*?900/s)
  assert.equal(await prices.weekly(env, normalize, 20, Date.parse('2026-10-27T10:00:00+07:00')), 0) // this week's check already ran

  // she types a new price: it opens there; the Monday move is not undone by an ordinary save
  const d = normalize(JSON.parse(s.d))
  d.items[1].p = '500'
  await api('site', 'PUT', token, { d })
  html = await (await go('/pha-thor')).text()
  assert.match(html, /ผ้าพันคอ.*?350/s)
  assert.match(html, /ย่าม.*?500/s)
  const saved = JSON.parse((await env.DB.prepare('SELECT d FROM site WHERE id = ?').bind(id).first()).d)
  assert.equal(saved.items[0].dyn.since, '2026-10-01') // the day it started moving stays
})

test('an amulet seller at Kamthieng: Reserve taps and her own asks lift the batch; one reader counts once a day', async () => {
  const token = 'k'.repeat(40)
  const am = (id, p, x = {}) => ({ id, t: 'เหรียญครูบา ' + id, temple: 'วัดบ้านปาง', maker: 'ครูบาศรีวิชัย', year: '2482', p, status: 'open', dyn: { on: true }, ...x })
  const id = await page('kamthieng-pra', 'amulet', { name: 'พระกำแพง', contact: { line: '@kp' }, amulets: [am('kp01', '3000'), am('kp02', '5000'), am('kp03', '1500', { temple: 'วัดอื่น' }), am('kp04', '2000', { status: 'reserved' })] }, token, '2026-10-01')
  await go('/api/hit', { method: 'POST', body: JSON.stringify({ n: 'kamthieng-pra', k: 'reserve', i: 'kp01' }) })
  await go('/api/hit', { method: 'POST', body: JSON.stringify({ n: 'kamthieng-pra', k: 'reserve', i: 'kp01' }) }) // the same reader again
  await Promise.all(wait)
  let v = await api('prices', 'GET', token)
  assert.equal(v.pieces.find((x) => x.id === 'kp01').counts.page7, 1)
  assert.equal(v.pieces.find((x) => x.id === 'kp01').out.move, 0)
  v = await api('mark', 'POST', token, { item: 'kp02', kind: 'ask', qty: 1 }) // asked at the stall about the other one of the batch
  assert.deepEqual(v.pieces.find((x) => x.id === 'kp01').out, { move: 1, to: 3500 })
  assert.deepEqual(v.pieces.find((x) => x.id === 'kp02').out, { move: 1, to: 6000 })
  assert.deepEqual(v.pieces.find((x) => x.id === 'kp03').out, { move: 0, to: 1500 }) // another batch: holds
  const s = await env.DB.prepare('SELECT d FROM site WHERE id = ?').bind(id).first()
  const steps = await prices.settle(env, id, normalize(JSON.parse(s.d)), '2026-10-26')
  assert.deepEqual(steps.map((x) => [x.id, x.to]), [['kp01', 3500], ['kp02', 6000], ['kp03', 1500]]) // reserved k4 waits
  const html = await (await go('/kamthieng-pra/a/kp01')).text()
  assert.match(html, /3,500/)
  assert.match(html, /data-item="kp01"/)
})

test('a piece that just started moving waits a full week', async () => {
  const d = normalize({ items: [{ id: 'new1', n: 'x', p: '100', dyn: { on: true, per: 5 } }] })
  prices.stamp(normalize({}), d, Date.parse('2026-10-20T10:00:00+07:00'))
  assert.equal(d.items[0].dyn.since, '2026-10-20')
  assert.deepEqual(prices.plan(d, new Map(), new Map(), Date.parse('2026-10-26T06:00:00+07:00')), [])
  assert.equal(prices.plan(d, new Map(), new Map(), Date.parse('2026-10-27T06:00:00+07:00')).length, 1)
})

test('a page shows a thing\'s photo beside its price', () => {
  const html = render({ name: 'x', look: 'poster', lang: 'th', kind: 'shop', status: 'live', d: { items: [{ id: 'i1', n: 'ผ้า', p: '300', photos: ['abcdefghijkl0001'] }] } })
  assert.match(html, /<li class="ph"><button class="ith" data-t="photo" data-big="\/img\/abcdefghijkl0001\.webp"><img src="\/img\/abcdefghijkl0001-s\.webp"/)
})
