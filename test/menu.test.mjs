// Menu from a photo: the parser for what a vision model answers, the Gold-only route with a fake model.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker, { sha } from '../src/worker.mjs'
import { parseMenu, cleanPrice, extractJson, readMenu, PROMPT, MODELS } from '../src/menu.mjs'
import { ui, UI_LANGS } from '../public/s/make-words.mjs'

test('prices lose ฿, บาท, ".-" and Thai numerals become digits', () => {
  assert.equal(cleanPrice('฿60'), '60')
  assert.equal(cleanPrice('60 บาท'), '60')
  assert.equal(cleanPrice('50.-'), '50')
  assert.equal(cleanPrice('๕๐'), '50')
  assert.equal(cleanPrice('฿1,200'), '1,200')
  assert.equal(cleanPrice('60-80'), '60-80')
  assert.equal(cleanPrice('60/80'), '60 / 80')
  assert.equal(cleanPrice('THB 45'), '45')
  assert.equal(cleanPrice('ฟรี'), '')
  assert.equal(cleanPrice(''), '')
  assert.equal(cleanPrice(null), '')
  assert.equal(cleanPrice(0), '')
  assert.equal(cleanPrice(120), '120')
})

test('the parser takes fenced JSON, JSON inside words, a bare array and a cut-off answer', () => {
  const rows = [{ name: 'ก๋วยเตี๋ยวหมู (พิเศษ)', price: '60', section: 'ก๋วยเตี๋ยว', note: '' }, { name: 'ข้าวมันไก่', price: '๕๐' }]
  const body = JSON.stringify({ items: rows })
  for (const text of ['```json\n' + body + '\n```', 'Here is the menu:\n' + body + '\nDone.', body, JSON.stringify(rows), { items: rows }]) {
    const r = parseMenu(text)
    assert.equal(r.length, 2, String(text).slice(0, 30))
    assert.deepEqual(r[0], { n: 'ก๋วยเตี๋ยวหมู (พิเศษ)', p: '60', note: '', section: 'ก๋วยเตี๋ยว' })
    assert.equal(r[1].p, '50')
  }
  const cut = '{"items":[{"name":"A","price":"10"},{"name":"B","price":"20"},{"name":"C","pri'
  assert.deepEqual(parseMenu(cut).map((x) => x.n), ['A', 'B'])
})

test('rows without a name or a price drop, duplicates drop, long names are cut, nothing in = empty', () => {
  const r = parseMenu({ items: [{ name: '', price: '10' }, { name: 'ชา', price: '' }, { name: 'ชา', price: '20' }, { name: 'ชา', price: '20' }, { name: 'x'.repeat(200), price: '5' }, null, 'text'] })
  assert.equal(r.length, 2)
  assert.equal(r[1].n.length, 80)
  assert.deepEqual(parseMenu(''), [])
  assert.deepEqual(parseMenu('I cannot read this'), [])
  assert.deepEqual(parseMenu('{"items": []}'), [])
  assert.equal(parseMenu({ items: Array.from({ length: 90 }, (_, i) => ({ name: 'n' + i, price: '1' })) }).length, 60)
  assert.equal(extractJson('no json here'), null)
})

test('the read tries the next model when the first fails, and sends the picture once as a data URL', async () => {
  const calls = []
  const ai = { run: async (id, args) => { calls.push([id, args]); if (id === MODELS[0].id) throw new Error('down'); return { response: '{"items":[{"name":"ชา","price":"20"}]}' } } }
  const r = await readMenu(ai, new Uint8Array([1, 2, 3]), 'image/jpeg')
  assert.deepEqual(r.rows, [{ n: 'ชา', p: '20', note: '', section: '' }])
  assert.equal(r.model, MODELS[1].id)
  assert.equal(calls.length, 2)
  const c = calls[0][1].messages[0].content
  assert.equal(c[0].text, PROMPT)
  assert.match(c[1].image_url.url, /^data:image\/jpeg;base64,/)
  assert.deepEqual((await readMenu({ run: async () => { throw new Error('x') } }, new Uint8Array([1]), 'image/jpeg')), { error: 'busy' })
  assert.deepEqual(await readMenu(null, new Uint8Array([1]), 'image/jpeg'), { error: 'busy' })
  // the OpenAI-shaped answer some models give
  const r2 = await readMenu({ run: async () => ({ choices: [{ message: { content: '```json\n{"items":[{"name":"A","price":"1"}]}\n```' } }] }) }, new Uint8Array([1]), 'image/jpeg')
  assert.equal(r2.rows.length, 1)
})

// ---- the route ----
const MIGRATIONS = readdirSync(new URL('../migrations/', import.meta.url)).sort()
function d1() {
  const db = new DatabaseSync(':memory:')
  for (const f of MIGRATIONS) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'))
  const st = (sql, args = []) => {
    const s = db.prepare(sql), a = args.map((x) => (x === undefined ? null : typeof x === 'boolean' ? Number(x) : x))
    return { bind: (...b) => st(sql, b), first: async (col) => { const r = s.get(...a); return r ? (col ? r[col] : { ...r }) : null }, all: async () => ({ results: s.all(...a).map((r) => ({ ...r })) }), run: async () => ({ meta: { changes: Number(s.run(...a).changes) } }) }
  }
  return { prepare: (sql) => st(sql), batch: async (xs) => Promise.all(xs.map((x) => x.run())), raw: db }
}
let asked = 0
const AI = { run: async () => { asked++; return { response: '```json\n{"items":[{"name":"ก๋วยเตี๋ยวหมู","price":"฿50","section":"","note":""}]}\n```' } } }
const env = { DB: d1(), SESSION_SECRET: 's', AI, MEDIA: { put: async () => { throw new Error('the menu photo must not be stored') }, get: async () => null, delete: async () => {} } }
const O = 'http://localhost'
async function site(tier, n) {
  const token = 'menu' + n + 'x'.repeat(30), id = 'ms' + n, now = new Date().toISOString()
  await env.DB.prepare('INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, 'menu-' + n, await sha(token), 'live', 'food', 'poster', 'th', '{}', now, now, tier, tier === 'gold' ? new Date(Date.now() + 864e5 * 90).toISOString().slice(0, 10) : null).run()
  return { id, token }
}
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xd9])
const read = (s, bytes = JPEG) => { const f = new FormData(); f.append('photo', new Blob([bytes], { type: 'image/jpeg' }), 'menu.jpg'); return worker.fetch(new Request(O + '/api/menu/read', { method: 'POST', body: f, headers: { 'x-edit': s.token, origin: O } }), env, { waitUntil() {} }) }

test('Free gets 402 gold and no model call; Gold gets rows; the photo is not stored', async () => {
  const free = await site('free', 1)
  const r = await read(free)
  assert.equal(r.status, 402); assert.deepEqual(await r.json(), { error: 'gold' }); assert.equal(asked, 0)
  const g = await site('gold', 2)
  const ok = await read(g)
  assert.equal(ok.status, 200)
  assert.deepEqual(await ok.json(), { rows: [{ n: 'ก๋วยเตี๋ยวหมู', p: '50', note: '', section: '' }] })
  assert.equal(asked, 1)
  assert.equal((await read(g, new Uint8Array([1, 2, 3, 4]))).status, 400) // not a picture
  assert.equal((await read(g, new Uint8Array(0))).status, 400)
})

test('20 reads a day for a page, then 429', async () => {
  const g = await site('gold', 3)
  for (let i = 0; i < 20; i++) assert.equal((await read(g)).status, 200)
  assert.equal((await read(g)).status, 429)
  const other = await site('gold', 4)
  assert.equal((await read(other)).status, 200)
})

test('a model failure is a 502 the builder can show', async () => {
  const g = await site('gold', 5)
  const was = env.AI.run
  env.AI.run = async () => { throw new Error('down') }
  const r = await read(g)
  env.AI.run = was
  assert.equal(r.status, 502); assert.deepEqual(await r.json(), { error: 'busy' })
})

test('every builder word for the menu read comes in all four languages', () => {
  for (const k of ['mr_btn', 'mr_why', 'mr_reading', 'mr_found', 'mr_none', 'mr_fail', 'mr_quota', 'mr_add', 'mr_sec', 'mr_cancel', 'mr_added', 'mr_full', 'mr_all', 'mr_row', 'rc_head', 'rc_tax', 'rc_taxHint', 'rc_open', 'bk_depIn']) {
    const en = ui('en', k)
    assert.notEqual(en, k, k)
    for (const l of Object.keys(UI_LANGS)) { const v = ui(l, k); assert.notEqual(v, k, l + ' ' + k); if (l !== 'en') assert.notEqual(v, en, l + ' ' + k) }
    assert.deepEqual((en.match(/\{n\}/g) || []).length, (ui('th', k).match(/\{n\}/g) || []).length, k)
  }
  for (const k of ['bk_markPaid', 'bk_markUnpaid', 'bk_paid', 'bk_unpaid']) for (const l of Object.keys(UI_LANGS)) assert.notEqual(ui(l, k), k, l + ' ' + k)
})

// ---- the builder side, on a stand-in page ----
import { menuBox, menuInit } from '../public/s/make-menu.mjs'
test('the builder: Free sees the lock, Gold the button; ticked lines join the price list, duplicates and the cap hold', async () => {
  const icon = () => ''
  const S = { lang: 'th', d: { items: [{ n: '', p: '', note: '' }] } }
  assert.match(menuBox({ S, icon, isGold: false }), /data-tab="gold"/)
  assert.ok(!/menufile/.test(menuBox({ S, icon, isGold: false })))
  const box = menuBox({ S, icon, isGold: true })
  assert.match(box, /id="menufile"/); assert.match(box, /อ่านเมนูจากรูป/); assert.match(box, /accept="image\/\*"/)
  // a stand-in builder
  const on = {}, el = { innerHTML: '' }
  const toasts = []; let redrawn = 0, changed = 0
  const app = { addEventListener: (t, f) => { on[t] = f }, querySelector: () => el }
  const rows = [{ n: 'ก๋วยเตี๋ยวหมู', p: '50', note: '', section: 'ก๋วยเตี๋ยว' }, { n: 'ก๋วยเตี๋ยวหมู (พิเศษ)', p: '60', note: 'ไข่', section: 'ก๋วยเตี๋ยว' }, { n: 'ชา', p: '20', note: '', section: '' }]
  menuInit({ app, S, call: async () => ({ rows }), toast: (m) => toasts.push(m), redrawSec: () => { redrawn++ }, changed: () => { changed++ }, shrink: async () => ({ blob: new Blob([1]) }) })
  global.FormData = global.FormData || FormData
  await on.change({ target: { id: 'menufile', files: [{}], value: 'x' } })
  assert.match(el.innerHTML, /data-mrck="2"/); assert.match(el.innerHTML, /mrsec/); assert.match(el.innerHTML, /เพิ่ม 3/)
  // untick the last, edit the second's price, ask for the sections in details
  await on.change({ target: { dataset: { mrck: '2' }, checked: false } })
  on.input({ target: { dataset: { mrp: '1' }, value: '65' } })
  await on.change({ target: { id: 'mrsec', dataset: {}, checked: true } })
  on.click({ target: { closest: () => ({ id: 'mradd' }) }, preventDefault() {} })
  assert.deepEqual(S.d.items, [{ n: 'ก๋วยเตี๋ยวหมู', p: '50', note: 'ก๋วยเตี๋ยว' }, { n: 'ก๋วยเตี๋ยวหมู (พิเศษ)', p: '65', note: 'ก๋วยเตี๋ยว · ไข่' }])
  assert.deepEqual([redrawn, changed], [1, 1]); assert.match(toasts.at(-1), /เพิ่มแล้ว 2/)
  // reading the same lines again: the one already on the list (same name and price) comes unticked
  await on.change({ target: { id: 'menufile', files: [{}], value: 'x' } })
  assert.match(el.innerHTML, /mrow dup/); assert.match(el.innerHTML, /เพิ่ม 2/)
  // the cap of 60
  S.d.items = Array.from({ length: 59 }, (_, i) => ({ n: 'a' + i, p: '1', note: '' }))
  await on.change({ target: { id: 'menufile', files: [{}], value: 'x' } })
  await on.change({ target: { dataset: { mrck: '0' }, checked: true } })
  on.click({ target: { closest: () => ({ id: 'mrall' }) }, preventDefault() {} })
  on.click({ target: { closest: () => ({ id: 'mradd' }) }, preventDefault() {} })
  assert.equal(S.d.items.length, 60); assert.match(toasts.at(-1), /เต็มแล้ว/)
  // errors
  for (const [status, want] of [[429, /วันนี้อ่านครบแล้ว/], [502, /อ่านไม่ได้/], [undefined, /ไม่มีสัญญาณ|เชื่อมต่อ/]]) {
    const on2 = {}; const t2 = []
    menuInit({ app: { addEventListener: (t, f) => { on2[t] = f }, querySelector: () => el }, S, call: async () => { throw Object.assign(new Error('x'), { status }) }, toast: (m) => t2.push(m), redrawSec() {}, changed() {}, shrink: async () => ({ blob: new Blob([1]) }) })
    await on2.change({ target: { id: 'menufile', files: [{}], value: 'x' } })
    assert.match(t2[0], want, String(status))
  }
})
