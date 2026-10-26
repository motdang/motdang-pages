// One design per kind of site (Nan 2026-10-26): the server stores the design of the page's kind, whatever the browser sends.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker from '../src/worker.mjs'

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

const env = { DB: d1(), MEDIA: media(), SESSION_SECRET: 's', PROMPTPAY: '0812345678', GOLD_THB: '3000' }
let ip = 0 // a new maker for each call, so the daily quota is not the thing under test
const api = (method, path, body, token) => worker.fetch(new Request('http://localhost/api/' + path, {
  method, headers: { 'content-type': 'application/json', 'cf-connecting-ip': '10.0.0.' + ++ip, ...(token ? { 'x-edit': token } : {}) }, body: body ? JSON.stringify(body) : undefined,
}), env, { waitUntil() {} })
const lookOf = (name) => env.DB.raw.prepare('SELECT look FROM site WHERE name = ?').get(name).look

test('a new page and a saved page wear the design of their kind, whatever look the browser sends', async () => {
  for (const [name, kind, design] of [['d-shop', 'food', 'local'], ['d-store', 'store', 'shop'], ['d-biz', 'online', 'biz'], ['d-folio', 'work', 'folio']]) {
    const r = await api('POST', 'sites', { name, kind, look: 'gold', lang: 'en', d: { name } })
    assert.equal(r.status, 200, name)
    const { token } = await r.json()
    assert.equal(lookOf(name), design, name)
    const put = await api('PUT', 'site', { kind, look: 'poster', lang: 'en', d: { name } }, token)
    assert.equal(put.status, 200, name)
    assert.equal(lookOf(name), design, name + ' after a save')
  }
})

test('a page saved with another kind takes that kind\'s design', async () => {
  const { token } = await (await api('POST', 'sites', { name: 'd-move', kind: 'stay', lang: 'en', d: { name: 'x' } })).json()
  assert.equal(lookOf('d-move'), 'local')
  await api('PUT', 'site', { kind: 'store', lang: 'en', d: { name: 'x' } }, token)
  assert.equal(lookOf('d-move'), 'shop')
})
