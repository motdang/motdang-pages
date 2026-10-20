// Sala Sian on an in-memory D1 (node:sqlite): seats, the ladder, the page.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import * as sian from '../src/sian.mjs'

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
  return { prepare: (sql) => st(sql), raw: db }
}
let n = 0
const rand = (k) => (Date.now().toString(36) + (n++).toString(36) + 'x'.repeat(k)).slice(0, k)
function sites(env, count) {
  const now = new Date().toISOString()
  return Array.from({ length: count }, (_, i) => {
    const id = 'site' + String(i).padStart(4, '0')
    env.DB.raw.prepare("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated) VALUES (?,?,?,'live','amulet','poster','th','{}',?,?)").run(id, 'shop' + i, 'h' + i, now, now)
    return id
  })
}

test('eleven pages asking for ten seats at once: ten payments, one full', async () => {
  const env = { DB: d1(), PROMPTPAY: '0812345678' }
  const ids = sites(env, 11)
  const out = await Promise.all(ids.map((id) => sian.reserve(env, id, rand)))
  assert.equal(out.filter((r) => r.full).length, 1)
  assert.equal(out.filter((r) => r.amount).length, 10)
  assert.ok(out.filter((r) => r.amount).every((r) => Math.floor(Number(r.amount)) === sian.START))
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM pay WHERE plan = 'sian'").get().n, 10)
  assert.equal((await sian.thisMonth(env)).left, 0)
})

test('a month that filled its seats moves the next one up a rung; an empty one down', async () => {
  const env = { DB: d1() }
  const now = new Date()
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15, 5)).toISOString()
  const lastMonth = last.slice(0, 7)
  env.DB.raw.prepare('INSERT INTO sian_month (month, price, seats) VALUES (?,?,?)').run(lastMonth, sian.START, 10)
  for (const id of sites(env, 9)) env.DB.raw.prepare("INSERT INTO pay (id, site_id, amount, status, created, updated, months, plan) VALUES (?,?,?,'paid',?,?,12,'sian')").run('p' + id, id, '9999.01', last, last)
  assert.equal((await sian.thisMonth(env)).price, 12999)
  const quiet = { DB: d1() }
  quiet.DB.raw.prepare('INSERT INTO sian_month (month, price, seats) VALUES (?,?,?)').run(lastMonth, sian.START, 10)
  assert.equal((await sian.thisMonth(quiet)).price, 7999)
})

test('/sian shows the price, the seats and the ladder', async () => {
  const env = { DB: d1() }
  const r = await sian.route(new Request('http://x/sian?hl=en'), env, '/sian', new URL('http://x/sian?hl=en'), { html: (b) => new Response(b) })
  const t = await r.text()
  assert.match(t, /฿9,999 a year/)
  assert.match(t, /10 of 10 seats left this month/)
  assert.match(t, /<li class="on">฿9,999<\/li>/)
})
