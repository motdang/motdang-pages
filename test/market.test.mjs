// ตลาดพระ: stalls, the round hides its price, guesses and the crowd, the board, สาธุ, the page.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { prepare } from '../src/amprice.mjs'
import * as market from '../src/market.mjs'

function d1() {
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(new URL('../migrations/', import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'))
  const st = (sql, args = []) => {
    const s = db.prepare(sql), a = args.map((x) => (x === undefined ? null : typeof x === 'boolean' ? Number(x) : x))
    return { bind: (...b) => st(sql, b), first: async () => { const r = s.get(...a); return r ? { ...r } : null },
      all: async () => ({ results: s.all(...a).map((r) => ({ ...r })) }), run: async () => ({ meta: { changes: Number(s.run(...a).changes) } }) }
  }
  return { prepare: (sql) => st(sql), raw: db }
}
const DATA = {
  v: 1, built: '2026-10-20T20:00',
  concepts: [['subject', 'Nang Kwak', 'นางกวัก', 'kwak'], ['form', 'Coin', 'เหรียญ', 'coin']],
  kinds: [['lp-liu', ['(หลวงปู่|ลป\\.?\\s*)หลิว']]],
  gpra: { fields: ['aid', 'title', 'price', 'bids', 'bidders', 'closed', 'card', 'kind', 'year', 'c', 'cid', 'day'], rows: [
    [11, 'เหรียญหลวงปู่หลิว ปี 36', 900, 7, 3, '2026-10-03', 0, 'lp-liu', 2536, [1], 0, '2026-09/30'],
    [12, 'เหรียญพญาเต่าเรือนหลวงปู่หลิว', 13050, 1, 1, '2026-09-30', 1, 'lp-liu', 0, [1], 0, '2026-09/25'],
    [13, 'หลวงปู่หลิว วัดไร่แตงทอง', 1050, 11, 4, '2026-09-19', 0, 'lp-liu', 0, [], 0, '2026-09/15'],
  ] },
  lazada: { fields: ['pdp', 'title', 'price', 'sold', 'kind', 'year', 'c', 'img', 'pic'], crawled: ['2026-07-10', '2026-10-11'], rows: [
    [21, 'จี้ หลวงปู่หลิว ปลดหนี้', 89, 10, 'lp-liu', 0, [], 1, 'p/abc.jpg_200x200q80.jpg'],
    [22, 'นางกวัก กวักเงินทอง', 259, 594, '', 0, [0], 1, 'p/def.jpg_200x200q80.jpg'],
    [23, 'นางกวัก ตั้งบูชา', 199, 20, '', 0, [0], 1, ''],
    [24, 'นางกวัก ไม้', 99, 5, '', 0, [0], 0, ''],
    [25, 'นางกวัก เหรียญ', 59, 1, '', 0, [0, 1], 0, ''],
  ] },
}
const P = prepare(DATA)
const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } })
const deps = { J, take: async () => true, sender: async () => 'tester-1234567890', body: async (r) => r.json() }
const call = (env, p, init) => market.api(new Request('http://x/api/' + p, init), env, p, new URL('http://x/api/' + p))

test('stalls gather a kind or a concept, with middles and a photo credited to its site', () => {
  const F = market.front(P)
  const liu = F.stalls.find((s) => s.key === 'lp-liu'), kwak = F.stalls.find((s) => s.key === 'Nang Kwak')
  assert.equal(liu.nA, 3); assert.equal(liu.midA, 1050); assert.equal(liu.nL, 1)
  assert.equal(kwak.nL, 4); assert.equal(kwak.nA, 0)
  assert.equal(kwak.pic, 'https://img.lazcdn.com/g/p/def.jpg_340x340q80.jpg') // the best seller's photo
  assert.equal(F.bell[0].pic, 'https://www.g-pra.com/thumbnailAlias/2026-09/30/11-org.jpg')
  assert.ok(!F.stalls.some((s) => s.a || s.l)) // no rows in the front
  const tray = market.stall(P, 'lp-liu')
  assert.equal(tray.items.filter((x) => x.src === 'g').length, 3)
  assert.match(tray.items.find((x) => x.src === 'l').url, /^https:\/\/www\.lazada\.co\.th\/products\/pdp-i21\.html$/)
  assert.equal(market.stall(P, 'nope'), null)
})

test('a round carries no price', () => {
  const r = market.round(P, () => 0)
  assert.equal(r.aid, 11)
  assert.equal(r.price, undefined)
  assert.ok(!JSON.stringify(r).includes('900'))
})

test('a guess returns the hammer and the crowd before it; the board needs three', async () => {
  const env = { DB: d1() }
  const g = (aid, guess, handle) => market.api(new Request('http://x/api/market/guess', { method: 'POST', body: JSON.stringify({ aid, guess, handle }) }), { ...env, MEDIA: media() }, 'market/guess', new URL('http://x/api/market/guess'), deps)
  const media = () => ({ get: async () => ({ json: async () => DATA }) })
  let r = await (await g(11, 1000, '0.0.42')).json()
  assert.equal(r.price, 900); assert.equal(r.crowd.n, 0); assert.equal(r.score, 90)
  r = await (await g(11, 500, '1.1.7')).json()
  assert.deepEqual(r.crowd, { n: 1, median: 1000 })
  await g(12, 13000, '0.0.42'); await g(13, 1000, '0.0.42')
  assert.equal((await g(99, 10, '')).status, 400)
  const b = await (await market.api(new Request('http://x/api/market/board?hl=th'), env, 'market/board', new URL('http://x/api/market/board?hl=th'), deps)).json()
  assert.equal(b.board.length, 1)
  assert.equal(b.board[0].name, 'เสือทอง 42')
  assert.ok(b.board[0].score >= 90)
})

test('a made-up name only: two lists and a number', () => {
  assert.ok(market.handleOk('3.2.55'))
  assert.ok(!market.handleOk('99.0.1')); assert.ok(!market.handleOk('<b>me</b>')); assert.ok(!market.handleOk('1.1.1000'))
  assert.equal(market.handleName('8.0.12', 'en'), 'Gold Red Ant 12')
})

test('สาธุ counts on a seller amulet; who is here counts the last three minutes', async () => {
  const env = { DB: d1() }
  const s = (site, id) => market.api(new Request('http://x', { method: 'POST', body: JSON.stringify({ site, id }) }), env, 'market/sadhu', new URL('http://x'), deps)
  assert.equal((await (await s('amulet-demo', 'a000')).json()).n, 1)
  assert.equal((await (await s('amulet-demo', 'a000')).json()).n, 2)
  assert.equal((await s('../x', 'a000')).status, 400)
  const h = (id) => market.api(new Request('http://x', { method: 'POST', body: JSON.stringify({ id }) }), env, 'market/here', new URL('http://x'), deps)
  await h('visitorone1'); const r = await (await h('visitortwo2')).json()
  assert.equal(r.here, 2)
})

test('the shelf shows sellers\' available amulets with a photo, Sala Sian first', async () => {
  const env = { DB: d1() }
  const now = new Date().toISOString()
  const add = (name, plan, amulets) => env.DB.raw.prepare("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until, plan) VALUES (?,?,?,'live','amulet','poster','th',?,?,?, 'gold', '2099-01-01', ?)")
    .run('id' + name, name, 'h' + name, JSON.stringify({ name: 'ร้าน ' + name, amulets }), now, now, plan)
  add('plain', 'gold', [{ id: 'a001', t: 'หลวงปู่หลิว', photos: ['abcdefghijkl'], status: 'open' }, { id: 'a002', t: 'no photo', photos: [], status: 'open' }, { id: 'a003', t: 'gone', photos: ['abcdefghijkm'], status: 'sold' }])
  add('velvet', 'sian', [{ id: 'a001', t: 'นางกวัก', photos: ['abcdefghijkn'], status: 'reserved', p: '500' }])
  const rows = await market.shelf(env, P, 'https://sites.motdang.net', 'th')
  assert.deepEqual(rows.map((r) => `${r.site}/${r.id}`), ['velvet/a001', 'plain/a001'])
  assert.equal(rows[0].sian, true)
  assert.ok(rows[1].band) // the market's band for that amulet
  const html = market.page('th', 'n0nce', market.front(P), rows, 'https://sites.motdang.net')
  assert.match(html, /<script type="application\/json" id="mkdata">/)
  assert.ok(!/<\/script><script>/.test(html.split('mkdata')[1].split('</script>')[0])) // the data cannot close its script
})
