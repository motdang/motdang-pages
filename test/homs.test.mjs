// /sell → Beer's yes → a sale → the bringer's ฿500 → the 1st: payout, PromptPay QR link, Beer's note.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { credit, monthEnd, freeId, known, BONUS } from '../src/sellers.mjs'
import { beerLink, readBeer, kitLink } from '../src/sell.mjs'
import { sha } from '../src/worker.mjs'

function d1() {
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(new URL('../migrations', import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'))
  const st = (sql, args = []) => ({
    bind: (...a) => st(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } } },
  })
  return { prepare: (sql) => st(sql) }
}

test('a new seller, brought by Hom, sells; Hom gets the bonus once; the 1st pays both', async (t) => {
  const env = { DB: d1(), SESSION_SECRET: 's' }
  const id = await freeId(env, 'Noi Test')
  assert.equal(id, 'noi-test')
  await env.DB.prepare("INSERT INTO seller (id, name, rate, target, created, status, promptpay, via, key) VALUES (?, 'Noi', 20, 30000, '2026-10-16', 'pending', '0812345678', 'hom', 'k1')").bind(id).run()
  assert.equal(await freeId(env, 'Noi Test'), 'noi-test-2')
  assert.equal(await known(env, id), null) // not selling until Beer says yes
  await env.DB.prepare("UPDATE seller SET status = 'ok' WHERE id = ?").bind(id).run()
  assert.equal(await known(env, id), id)
  await env.DB.prepare("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, seller) VALUES ('s1', 'shop', 'x', 'live', 'shop', 'gold', 'th', '{}', '2026-10-16', '2026-10-16', ?)").bind(id).run()
  const a = await credit(env, { siteId: 's1', payId: 'p1', amount: '5550.37' })
  assert.deepEqual(a, { name: 'Noi', rate: 20, cut: 1110, bonus: { name: 'Hom', cut: BONUS, for: 'Noi' } })
  const b = await credit(env, { siteId: 's1', payId: 'p2', amount: '3000.11' })
  assert.equal(b.bonus, null)

  // the 1st of next month, 08:30 Bangkok
  const month = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 7)
  const [y, m] = month.split('-').map(Number)
  t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 1, 30) })
  const posts = [], notes = []
  const n = await monthEnd(env, async (c) => posts.push(c), async (pid) => beerLink(env, sha, 'https://x', 'p', pid), async (c) => notes.push(c))
  assert.equal(n, 2)
  const due = (await env.DB.prepare("SELECT seller, baht, month, status FROM payout ORDER BY seller").all()).results.map((r) => ({ ...r }))
  assert.deepEqual(due, [{ seller: 'hom', baht: 500, month, status: 'due' }, { seller: 'noi-test', baht: 1710, month, status: 'due' }])
  assert.match(posts.find((p) => p.includes('Noi')), /Plans sold: 2 · ฿8,550 of ฿/)
  assert.match(posts.find((p) => p.includes('Hom')), /Plans sold: 0 ·/)
  assert.equal(notes.length, 1)
  assert.match(notes[0], /Noi ฿1,710\nhttps:\/\/x\/p\/po/)
  // run again the same day: nothing twice
  assert.equal(await monthEnd(env, async () => {}, async () => '', async () => {}), 0)
})

test('Beer and kit links open their own seller only', async () => {
  const env = { SESSION_SECRET: 's' }
  const path = new URL(await beerLink(env, sha, 'https://x', 'h', 'noi')).pathname
  assert.deepEqual(await readBeer(env, sha, 'h', path), { id: 'noi' })
  assert.equal(await readBeer(env, sha, 'p', path.replace('/h/', '/p/')), null)
  assert.equal(await readBeer(env, sha, 'h', path.replace('noi', 'hom')), null)
  assert.notEqual(await kitLink(env, sha, 'https://x', { id: 'noi', key: 'a' }), await kitLink(env, sha, 'https://x', { id: 'noi', key: 'b' }))
})
