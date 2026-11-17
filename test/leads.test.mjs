// The Facebook-group homes on the team's board, and a team seller who takes no share (NaN, 2026-11-17).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { contactOf, take, counts, list, mark, opener } from '../src/leads.mjs'
import { route, paid } from '../src/deals.mjs'
import { sha, rand } from '../src/worker.mjs'

function d1() {
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(new URL('../migrations', import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'))
  const st = (sql, args = []) => ({
    bind: (...a) => st(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } } },
  })
  return { prepare: (sql) => st(sql), raw: db }
}

test('the phone and LINE in a contact line', () => {
  assert.deepEqual(contactOf('K. Miew +66 90 998 0459 · LINE ihomesale'), { tel: '0909980459', line: 'ihomesale' })
  assert.deepEqual(contactOf('Tel 095-452-9977'), { tel: '0954529977', line: null })
  assert.deepEqual(contactOf('099-0199349, LINE snowncy'), { tel: '0990199349', line: 'snowncy' })
  assert.deepEqual(contactOf('Tel/WhatsApp +66 64 998 0333 · LINE 064-9980333'), { tel: '0649980333', line: null })
  assert.deepEqual(contactOf('LINE ID: @homecm'), { tel: null, line: '@homecm' })
  assert.deepEqual(contactOf('ทางโพสต์'), { tel: null, line: null })
  assert.deepEqual(contactOf('35,000 THB/month'), { tel: null, line: null })
})

const HOMES = [
  { posted: '2026-11-15', group: 'CM Rentals', deal: 'rent', type: 'house', where: 'Mae Rim', price: '฿30,000/month', contact: 'Tel 095-452-9977', summary: '3 bed', url: 'https://www.facebook.com/groups/1/posts/2/' },
  { posted: '2026-11-16', group: 'CM Sales', deal: 'sale', type: 'condo', where: 'Nimman', price: '3.2M', contact: 'ทางโพสต์', url: 'https://www.facebook.com/groups/1/posts/3/' },
  { posted: '2026-11-16', deal: 'rent', url: 'https://evil.example/x' },
]

test('a batch comes in once; the board lists, counts and moves them', async () => {
  const env = { DB: d1() }
  assert.equal(await take(env, HOMES, sha), 2)
  assert.equal(await take(env, HOMES, sha), 0)
  assert.deepEqual(await counts(env), { new: 2, called: 0, listed: 0, no: 0 })
  const L = await list(env, 'new')
  assert.equal(L[0].place, 'Nimman') // newest post first
  assert.equal((await list(env, 'new', 'rent')).length, 1)
  assert.ok(await mark(env, L[1].id, 'called', 'beer'))
  assert.equal(await mark(env, L[1].id, 'gone', 'beer'), false)
  assert.equal(await mark(env, 'nope', 'called', 'beer'), false)
  assert.deepEqual(await counts(env), { new: 1, called: 1, listed: 0, no: 0 })
  assert.match(opener(L[1], 'เบียร์'), /^สวัสดีค่ะ เบียร์ จาก motdang\.net ค่ะ เห็นประกาศให้เช่าของคุณในกลุ่มเฟซบุ๊ก \(Mae Rim\)/)
})

const H = { html: (b, st) => new Response(b, { status: st, headers: { 'content-type': 'text/html' } }), sha, rand, sameOrigin: () => true, take: async () => true, sender: async () => 's', log: async () => {}, slipLink: async () => '' }
const req = (path, o = {}) => new Request('https://sites.motdang.net' + path, o)
const go = (env, path, o) => { const r = req(path, o), u = new URL(r.url); return route(r, env, u.pathname, u, 'https://sites.motdang.net', H) }

test('/leads-in takes a batch only with the key', async () => {
  const env = { DB: d1(), LEADS_KEY: 'k'.repeat(32) }
  const body = JSON.stringify({ homes: HOMES })
  assert.equal((await go(env, '/leads-in', { method: 'POST', body })).status, 401)
  assert.equal((await go(env, '/leads-in', { method: 'POST', body, headers: { 'x-key': 'wrong' } })).status, 401)
  const r = await go(env, '/leads-in', { method: 'POST', body, headers: { 'x-key': 'k'.repeat(32) } })
  assert.deepEqual(await r.json(), { ok: true, new: 2 })
})

test("Beer's board: the homes, no share, a tap moves a lead; a lister's board is unchanged", async () => {
  const env = { DB: d1(), LEADS_KEY: 'k' }
  await take(env, HOMES, sha)
  const token = 'b'.repeat(24), htok = 'h'.repeat(24)
  await env.DB.prepare("INSERT INTO seller (id, name, rate, target, created, status, board_hash, deal_rate, deal_target, team) VALUES ('beer','Beer',0,0,'2026-11-17','ok',?,0,0,1)").bind(await sha(token)).run()
  await env.DB.prepare("UPDATE seller SET board_hash = ?, status = 'ok' WHERE id = 'hom'").bind(await sha(htok)).run() // Hom comes with the migrations
  const page = await (await go(env, '/me/' + token)).text()
  assert.match(page, /สวัสดี เบียร์/)
  assert.match(page, /href="tel:0954529977"/)
  assert.match(page, /ติดต่อทางโพสต์/) // the post with no number
  assert.match(page, /href="\/make\?by=beer#kind=homes&amp;title=house%20%C2%B7%20Mae%20Rim&amp;tel=0954529977"/)
  assert.doesNotMatch(page, /ส่วนแบ่ง|Your share|รอโอน/)
  assert.match(page, /src="\/s\/board\.js"/)
  const id = (await list(env, 'new', 'rent'))[0].id
  const r = await go(env, '/me/' + token + '?d=rent', { method: 'POST', body: new URLSearchParams({ act: 'lead', id, state: 'called' }) })
  assert.equal(r.status, 303)
  assert.match(r.headers.get('location'), /\/me\/b{24}\?d=rent#list$/)
  assert.deepEqual(await counts(env), { new: 1, called: 1, listed: 0, no: 0 })
  // Hom cannot move leads, and her board still shows her share
  await go(env, '/me/' + htok, { method: 'POST', body: new URLSearchParams({ act: 'lead', id, state: 'no' }) })
  assert.equal((await counts(env)).no, 0)
  assert.match(await (await go(env, '/me/' + htok)).text(), /Your share/)
})

test('a fee on a team deal is all motdang: no share, no payout to send', async () => {
  const env = { DB: d1() }
  const db = env.DB.raw
  db.exec("INSERT INTO seller (id, name, rate, target, created, status, deal_rate, deal_target, team) VALUES ('beer','Beer',0,0,'2026-11-17','ok',0,0,1)")
  db.exec("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, seller, created, updated) VALUES ('s1','maerim-house','e','live','homes','x','th','{\"name\":\"Mae Rim house\"}','beer','2026-11-17','2026-11-17')")
  db.exec("INSERT INTO pay (id, site_id, plan, amount, status, created, updated) VALUES ('p1','s1','fee','15000.00','paid','2026-11-17','2026-11-17')")
  db.exec("INSERT INTO deal (id, site_id, seller, what, use, basis, months, fee, pay_id, status, at) VALUES ('d1','s1','beer','rent','residential',15000,12,15000,'p1','billed','2026-11-17T10:00:00Z')")
  assert.deepEqual(await paid(env, 'p1', 'https://sites.motdang.net', 'test', sha), { lister: 0, motdang: 15000 })
  const e = db.prepare("SELECT cut FROM earn WHERE pay_id = 'p1'").get()
  assert.equal(e.cut, 0)
})
