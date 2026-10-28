// A Gold page with its own design (own.mjs, Nan 2026-10-28): its index.html and files from R2 under own/<site id>/,
// served at /<name>/ with this response's nonce on its scripts; HTML files and odd paths are not served as files;
// without the files, or once Gold lapses, the page draws as every page does.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker from '../src/worker.mjs'
import { normalize } from '../public/s/render.mjs'
import { FILE, ownOn } from '../src/own.mjs'

const M = readdirSync(new URL('../migrations/', import.meta.url)).sort()
const db = new DatabaseSync(':memory:'); for (const f of M) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'))
const st = (sql, a = []) => { const s = db.prepare(sql), v = a.map((x) => (x === undefined ? null : typeof x === 'boolean' ? Number(x) : x)); return { bind: (...b) => st(sql, b), first: async (c) => { const r = s.get(...v); return r ? (c ? r[c] : { ...r }) : null }, all: async () => ({ results: s.all(...v).map((r) => ({ ...r })) }), run: async () => ({ meta: { changes: Number(s.run(...v).changes) } }) } }
const files = new Map()
const obj = (b) => ({ body: new Response(b).body, text: async () => new TextDecoder().decode(b), httpMetadata: {}, customMetadata: { v: 'ok' } })
const env = { DB: { prepare: (q) => st(q), batch: async (xs) => Promise.all(xs.map((x) => x.run())) }, MEDIA: { get: async (k) => (files.has(k) ? obj(files.get(k)) : null), put: async (k, v) => files.set(k, new Uint8Array(await new Response(v).arrayBuffer())), head: async (k) => (files.has(k) ? {} : null), delete: async () => {} }, SESSION_SECRET: 's' }
const ctx = { waitUntil() {} }
const go = (path) => worker.fetch(new Request('http://localhost' + path, { redirect: 'manual', headers: { 'cf-connecting-ip': '10.9.0.1' } }), env, ctx)
const now = new Date().toISOString(), year = new Date(Date.now() + 300 * 864e5).toISOString().slice(0, 10), past = '2020-01-01'
const site = (id, name, d, until = year) => db.prepare("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until, trial, plan) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id, name, 'h' + id, 'live', 'service', 'local', 'en', JSON.stringify(normalize(d)), now, now, 'gold', until, 0, 'gold')
const put = (k, s) => files.set(k, new TextEncoder().encode(s))

site('own00001', 'own-shop', { name: 'Own Shop', own: { v: 'r0001' }, contact: { phone: '081 234 5678' } })
put('own/own00001/index.html', '<!doctype html><html><head><title>Own</title></head><body><h1>Made for us</h1><script>window.x=1</script><script type="module" src="a.mjs"></script></body></html>')
put('own/own00001/a.mjs', 'export const a = 1')
put('own/own00001/img/fb/one.jpg', '\xff\xd8\xff')
put('own/own00001/other.html', '<p>no</p>')
site('own00002', 'own-bare', { name: 'Own Bare', own: { v: 'r0001' }, contact: { phone: '081 234 5678' } })
site('own00003', 'own-lapsed', { name: 'Own Lapsed', own: { v: 'r0001' }, contact: { phone: '081 234 5678' } }, past)
put('own/own00003/index.html', '<p>Made for us</p>')

test('the switch and the file names', () => {
  assert.equal(ownOn(normalize({ own: { v: 'r0001' } })), true)
  assert.equal(ownOn(normalize({ own: { v: '../x' } })), false)
  assert.equal(normalize({ own: 'yes' }).own, null)
  for (const ok of ['a.mjs', 'img/fb/01-measuring.jpg', 'data.json']) assert.ok(FILE.test(ok), ok)
  for (const no of ['../x.jpg', 'img/../x.jpg', '.env.json', 'img//a.jpg', 'noext']) assert.ok(!FILE.test(no) || no.includes('..'), no)
})

test('a page with its own design: at /<name>/, its scripts carrying the nonce, its files beside it', async () => {
  const r0 = await go('/own-shop?x=1')
  assert.equal(r0.status, 301)
  assert.equal(r0.headers.get('location'), 'http://localhost/own-shop/?x=1')
  const r = await go('/own-shop/')
  assert.equal(r.status, 200)
  const h = await r.text(), csp = r.headers.get('content-security-policy'), nonce = /'nonce-([^']+)'/.exec(csp)[1]
  assert.match(h, /Made for us/)
  assert.equal(h.match(new RegExp(`<script nonce="${nonce}"`, 'g')).length, 2)
  assert.match(csp, /frame-src 'self' https:\/\/www.openstreetmap.org/)
  const f = await go('/own-shop/a.mjs'); assert.equal(f.status, 200); assert.match(f.headers.get('content-type'), /javascript/)
  const i = await go('/own-shop/img/fb/one.jpg'); assert.equal(i.status, 200); assert.equal(i.headers.get('content-type'), 'image/jpeg')
  assert.equal((await go('/own-shop/other.html')).status, 404)
  assert.equal((await go('/own-shop/index.html')).status, 404)
  assert.equal((await go('/own-shop/missing.jpg')).status, 404)
})

test('without its files, or once Gold has lapsed, the page draws as every page does', async () => {
  const b = await go('/own-bare/'); assert.equal(b.status, 200); assert.match(await b.text(), /data-look="local"/)
  const l = await go('/own-lapsed'); assert.equal(l.status, 200); const t = await l.text(); assert.doesNotMatch(t, /Made for us/); assert.match(t, /data-look="local"/)
  assert.equal((await go('/own-lapsed/img/fb/one.jpg')).status, 404)
})
