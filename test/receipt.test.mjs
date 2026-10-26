// Receipts per booking: /bk/<id>/receipt, the number, the amounts, the owner's paid marks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker, { sha } from '../src/worker.mjs'
import { normalize } from '../public/s/render.mjs'
import { amounts } from '../src/receipt.mjs'
import { tellReader } from '../src/book.mjs'

function d1() {
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(new URL('../migrations/', import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'))
  const st = (sql, args = []) => {
    const s = db.prepare(sql), a = args.map((x) => (x === undefined ? null : typeof x === 'boolean' ? Number(x) : x))
    return { bind: (...b) => st(sql, b), first: async (col) => { const r = s.get(...a); return r ? (col ? r[col] : { ...r }) : null }, all: async () => ({ results: s.all(...a).map((r) => ({ ...r })) }), run: async () => ({ meta: { changes: Number(s.run(...a).changes) } }) }
  }
  return { prepare: (sql) => st(sql), batch: async (xs) => Promise.all(xs.map((x) => x.run())), raw: db }
}
const env = { DB: d1(), SESSION_SECRET: 's' }
const O = 'http://localhost'
const go = (path, init = {}) => worker.fetch(new Request(O + path, { redirect: 'manual', ...init }), env, { waitUntil() {} })
const D = { name: 'Baan <Suan> Spa', place: { addr: '12 Nimman Rd, Chiang Mai', cc: 'TH' }, contact: { phone: '053 123 456' }, tax: '0105536000123',
  svc: [{ id: 'svc01', n: 'Thai massage', p: '400', mins: 60, cap: 4 }, { id: 'svc02', n: 'Tea', p: 'ask us', mins: 30, cap: 1 }],
  rooms: [{ id: 'room01', n: 'Garden room', p: '900', guests: 2, units: 1 }], book: { deposit: '100', pp: '0812345678' }, stay: { pay: 'pp', pp: '0812345678', dep: 'night1', in: '14:00', out: '12:00' } }
const token = 'rcpt' + 'x'.repeat(30)
const now = new Date().toISOString()
await env.DB.prepare('INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
  .bind('rs1', 'spa-1', await sha(token), 'live', 'service', 'poster', 'th', JSON.stringify(D), now, now, 'gold', new Date(Date.now() + 864e5 * 90).toISOString().slice(0, 10)).run()
let n = 0
async function booking(o) {
  const id = String(++n).padStart(14, 'b')
  const r = { kind: 'svc', item: 'svc01', start: '2026-11-03T03:00:00.000Z', end: '2026-11-03T04:00:00.000Z', people: 1, name: 'Ann <b>', status: 'ok', paid: 0, total: null, ...o }
  await env.DB.prepare('INSERT INTO booking (id, site_id, kind, item, start, end, people, name, reach, email, note, status, at, sender, total, ref, paid) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, 'rs1', r.kind, r.item, r.start, r.end, r.people, r.name, '0899999999', '', '', r.status, now, 'x', r.total, 'MD' + id.slice(0, 5).toUpperCase(), r.paid).run()
  return id
}
const open = (id) => go(`/bk/${id}/receipt`)
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

test('only an accepted booking has a receipt', async () => {
  for (const st of ['new', 'no', 'gone', 'hold']) {
    const r = await open(await booking({ status: st }))
    assert.equal(r.status, 404, st)
    assert.match(await r.text(), /ใบเสร็จรับเงิน · Receipt/)
  }
  assert.equal((await open('zzzzzzzzzzzzzz')).status, 404)
  assert.equal((await go('/bk/short/receipt')).status, 404)
})

test('a service receipt: Thai and English side by side, page details, tax ID, escaped, not a tax invoice, print button', async () => {
  const id = await booking({ people: 2, paid: 1 })
  const r = await open(id)
  assert.equal(r.status, 200)
  const h = await r.text()
  const t = plain(h)
  assert.match(t, /ใบเสร็จรับเงิน\s+Receipt/)
  assert.match(t, /ไม่ใช่ใบกำกับภาษี Not a tax invoice/)
  assert.match(t, /Baan &lt;Suan&gt; Spa|Baan <Suan> Spa/)
  assert.ok(!h.includes('Baan <Suan>'), 'the page name is escaped')
  assert.ok(!h.includes('Ann <b>'), 'the guest name is escaped')
  assert.match(t, /12 Nimman Rd, Chiang Mai/); assert.match(t, /053 123 456/)
  assert.match(t, /เลขประจำตัวผู้เสียภาษี Tax ID\s*: 0105536000123/)
  assert.match(t, /Thai massage/); assert.match(t, /฿400 × 2/)
  assert.match(t, /ราคารวม Total ฿800/); assert.match(t, /ชำระแล้ว Paid ฿800/); assert.match(t, /คงเหลือ Balance ฿0/)
  assert.match(t, /3 พฤศจิกายน 2569/); assert.match(t, /3 November 2026/)
  assert.match(t, /10:00–11:00/) // Bangkok time
  assert.match(t, /ชำระแล้ว Paid in full/)
  assert.match(h, /window\.print\(\)/); assert.match(h, /บันทึกเป็น PDF/); assert.match(h, /@media print/); assert.match(h, /@page\{size:A4/)
  assert.match(r.headers.get('content-security-policy'), /nonce-/)
  const nonce = /<script nonce="([^"]+)"/.exec(h)[1]
  assert.ok(r.headers.get('content-security-policy').includes(nonce))
})

test('no tax ID on the page, no tax ID line', async () => {
  const id = await booking({})
  await env.DB.prepare("UPDATE site SET d = ? WHERE id = 'rs1'").bind(JSON.stringify({ ...D, tax: '' })).run()
  const t = plain(await (await open(id)).text())
  await env.DB.prepare("UPDATE site SET d = ? WHERE id = 'rs1'").bind(JSON.stringify(D)).run()
  assert.ok(!/Tax ID\s*:/.test(t))
})

test('numbers run 1, 2, 3 within the page and stay the same on a second look', async () => {
  const a = await booking({}), b = await booking({}), c = await booking({})
  const first = async (id) => /เลขที่ No\. (\d{4})/.exec(plain(await (await open(id)).text()))[1]
  const na = Number(await first(a)), nb = Number(await first(b)), nc = Number(await first(c))
  assert.equal(nb, na + 1); assert.equal(nc, nb + 1)
  assert.equal(Number(await first(a)), na)
  const row = await env.DB.prepare('SELECT rcpt, rcpt_at FROM booking WHERE id = ?').bind(b).first()
  assert.equal(row.rcpt, nb); assert.ok(row.rcpt_at)
  // another page counts from 1
  await env.DB.prepare('INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind('rs2', 'spa-2', 'h2', 'live', 'service', 'poster', 'th', JSON.stringify(D), now, now, 'gold').run()
  await env.DB.prepare("INSERT INTO booking (id, site_id, kind, item, start, end, people, name, status, at) VALUES ('other0000000id', 'rs2', 'svc', 'svc01', '2026-11-03T03:00:00.000Z', '2026-11-03T04:00:00.000Z', 1, 'Bo', 'ok', ?)").bind(now).run()
  assert.equal(await first('other0000000id'), '0001')
})

test('amounts: a service by head, a price that is words, a room by night, deposit received', async () => {
  const d = normalize(D), s = { id: 'rs1', name: 'spa-1' }
  const row = (o) => ({ id: 'a'.repeat(14), kind: 'svc', item: 'svc01', people: 1, paid: 0, start: '2026-11-03T03:00:00.000Z', end: '2026-11-03T04:00:00.000Z', total: null, ...o })
  let a = amounts(row({ people: 3, paid: 2 }), s, d)
  assert.deepEqual([a.total, a.deposit, a.paid, a.balance, a.how?.[1]], [1200, 100, 100, 1100, 'PromptPay'])
  a = amounts(row({ item: 'svc02' }), s, d)
  assert.deepEqual([a.total, a.paid, a.balance, a.how], [null, 0, null, null])
  a = amounts(row({ kind: 'room', item: 'room01', start: '2026-12-01', end: '2026-12-04', total: '2700', paid: 2 }), s, d)
  assert.deepEqual([a.total, a.qty, a.deposit, a.paid, a.balance], [2700, 3, 900, 900, 1800]) // night1 deposit
  a = amounts(row({ kind: 'room', item: 'room01', start: '2026-12-01', end: '2026-12-04', total: '2700', paid: 1 }), s, d)
  assert.deepEqual([a.paid, a.balance], [2700, 0])
})

test('a room receipt shows nights, check-in and check-out', async () => {
  const id = await booking({ kind: 'room', item: 'room01', start: '2026-12-01', end: '2026-12-04', total: '2700', paid: 2, people: 2 })
  const t = plain(await (await open(id)).text())
  assert.match(t, /Garden room/); assert.match(t, /3 คืน nights/)
  assert.match(t, /เช็คอิน Check-in 1 ธันวาคม 2569 · 1 December 2026 · 14:00/)
  assert.match(t, /เช็คเอาท์ Check-out 4 ธันวาคม 2569 · 4 December 2026 · 12:00/)
  assert.match(t, /ราคารวม Total ฿2,700/); assert.match(t, /ชำระแล้ว Paid ฿900/); assert.match(t, /คงเหลือ Balance ฿1,800/)
  assert.match(t, /รับมัดจำแล้ว Deposit received/)
})

test('the owner marks paid, deposit received, not paid; the list says which; the receipt follows', async () => {
  const id = await booking({})
  const api = async (path, init) => (await go('/api/' + path, { ...init, headers: { 'x-edit': token, origin: O, 'content-type': 'application/json' } })).json()
  const list = async () => (await api('bookings')).rows.find((x) => x.id === id)
  assert.deepEqual([(await list()).paid, (await list()).dep, (await list()).depAsked], [false, false, 100])
  await api('bookings', { method: 'POST', body: JSON.stringify({ id, act: 'deposit' }) })
  assert.deepEqual([(await list()).paid, (await list()).dep], [false, true])
  assert.match(plain(await (await open(id)).text()), /ชำระแล้ว Paid ฿100/)
  await api('bookings', { method: 'POST', body: JSON.stringify({ id, act: 'paid' }) })
  assert.deepEqual([(await list()).paid, (await list()).dep], [true, false])
  await api('bookings', { method: 'POST', body: JSON.stringify({ id, act: 'unpaid' }) })
  assert.deepEqual([(await list()).paid, (await list()).dep], [false, false])
})

test('the tax ID is a field of the page, letters and digits only', () => {
  assert.equal(normalize({ tax: ' 0105-536 000123<script> ' }).tax, '0105-536 000123script')
  assert.equal(normalize({}).tax, '')
})

test('the guest page and the accept email link to the receipt', async () => {
  const id = await booking({ kind: 'room', item: 'room01', start: '2026-12-01', end: '2026-12-04', total: '2700', status: 'ok' })
  assert.match(await (await go('/bk/' + id)).text(), new RegExp(`href="/bk/${id}/receipt"`))
  const sent = []
  const m = { DB: env.DB, RESEND_KEY: 'k', MAIL_FROM: 'a <a@b.co>' }
  const real = globalThis.fetch
  globalThis.fetch = async (u, init) => { sent.push(JSON.parse(init.body)); return new Response('{"id":"1"}', { status: 200 }) }
  try {
    const bk = await env.DB.prepare('SELECT * FROM booking WHERE id = ?').bind(id).first()
    const s = await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind('rs1').first()
    await tellReader(m, s, normalize(D), { ...bk, email: 'guest@example.com', status: 'ok' }, 'https://sites.motdang.net', 'th')
    await tellReader(m, s, normalize(D), { ...bk, email: 'guest@example.com', status: 'no' }, 'https://sites.motdang.net', 'th')
  } finally { globalThis.fetch = real }
  if (sent.length) {
    assert.match(sent[0].html, new RegExp(`/bk/${id}/receipt`)); assert.match(sent[0].text, /receipt/)
    assert.ok(!/receipt/.test(sent[1]?.html || ''), 'a declined booking has no receipt link')
  }
})
