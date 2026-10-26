// The customer list, the monthly news, the day-before reminders and "Remind me on LINE" (Nan 2026-10-22).
// An in-memory D1 (node:sqlite); Resend, LINE and the LINE account's Site binding are stubs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker, { sha } from '../src/worker.mjs'
import * as customers from '../src/customers.mjs'
import * as remind from '../src/remind.mjs'
import * as gold from '../src/gold.mjs'
import { normalize, render } from '../public/s/render.mjs'
import { utcOf, dayIn, addDays } from '../public/s/extras.mjs'
import { ui } from '../public/s/make-words.mjs'
import { word } from '../public/s/words.mjs'
import { C } from '../public/s/words-cust.mjs'
import { N } from '../public/s/make-words-cust.mjs'

const MIGRATIONS = readdirSync(new URL('../migrations/', import.meta.url)).sort()
const sqlOf = (f) => readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8')
function wrap(db) {
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
const d1 = () => { const db = new DatabaseSync(':memory:'); for (const f of MIGRATIONS) db.exec(sqlOf(f)); return wrap(db) }
const media = () => ({ put: async () => {}, get: async () => null, delete: async () => {} })

const O = 'http://localhost'
const env = { DB: d1(), MEDIA: media(), SESSION_SECRET: 's', RESEND_KEY: 'rk', MAIL_FROM: 'Mot Dang <pages@motdang.net>' }
let pending = []
const ctx = { waitUntil(p) { pending.push(Promise.resolve(p).catch(() => {})) } }
const settle = async () => { while (pending.length) { const p = pending; pending = []; await Promise.all(p) } }
let ip = 0
const go = (path, init = {}) => worker.fetch(new Request(O + path, { redirect: 'manual', ...init, headers: { 'cf-connecting-ip': '10.0.0.' + (++ip), ...(init.headers || {}) } }), env, ctx)
const post = (path, body, headers = {}) => go(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })

// stubs for fetch: Resend and LINE
const calls = []
const realFetch = globalThis.fetch
globalThis.fetch = async (u, init = {}) => {
  const url = String(u)
  calls.push({ url, init })
  if (url === 'https://api.resend.com/emails/batch') return new Response(JSON.stringify({ data: [] }), { status: 200 })
  if (url === 'https://api.resend.com/emails') return new Response(JSON.stringify({ id: 'x' }), { status: 200 })
  if (url === 'https://api.line.me/oauth2/v2.1/token') return new Response(JSON.stringify({ access_token: 'at' }), { status: 200 })
  if (url === 'https://api.line.me/v2/profile') return new Response(JSON.stringify({ userId: 'U' + 'a'.repeat(32) }), { status: 200 })
  if (url === 'https://api.line.me/friendship/v1/status') return new Response(JSON.stringify({ friendFlag: true }), { status: 200 })
  return realFetch(u, init)
}
const sent = (what) => calls.filter((c) => c.url === what)
const mails = () => [...sent('https://api.resend.com/emails/batch').flatMap((c) => JSON.parse(c.init.body)), ...sent('https://api.resend.com/emails').map((c) => JSON.parse(c.init.body))]

const TZ = 'Asia/Bangkok'
const D = (extra = {}) => JSON.stringify({ name: 'ร้านนวด A&B', msg: true, svc: [{ id: 'svc01', n: 'Massage', mins: 60, p: '500', cap: 3 }], items: [{ n: 'Oil', p: '100' }],
  contact: { phone: '081 234 5678', email: 'owner@example.com' }, place: { addr: '1 Nimman Rd', lat: 18.8, lng: 98.97 }, ...extra })
let n = 0
async function site(o = {}) {
  n++
  const id = 'c' + n, token = 'tok' + String(n).padStart(2, '0') + 'y'.repeat(30), name = 'cust-' + n
  const now = new Date().toISOString()
  await env.DB.prepare('INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until, trial, plan) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, name, await sha(token), 'live', 'service', 'poster', o.lang ?? 'th', o.d ?? D(), now, now, o.tier ?? 'gold', o.gold ?? null, 0, 'gold').run()
  return { id, name, token }
}
const api = (s, path, init = {}) => go('/api/' + path, { ...init, headers: { 'x-edit': s.token, origin: O, 'content-type': 'application/json', ...(init.headers || {}) } })
const day = (k) => dayIn(TZ, Date.now() + k * 864e5)
const book = (s, o = {}) => post('/api/book', { n: s.name, kind: 'svc', item: 'svc01', day: day(2), t: '10:00', name: 'Somchai', reach: '081-234-5678', email: 'a@x.com', ms: 5000, ...o })

test('the tick shows on a Gold page\'s message form and not on a free one', () => {
  const g = render({ name: 'x', look: 'poster', lang: 'th', kind: 'shop', d: { name: 'ร้าน A&B', msg: true }, tier: 'gold', status: 'live' }, {})
  assert.match(g, /<label class="newsopt"><input type="checkbox" name="news" value="1"><span>ข่าวจาก ร้าน A&amp;B เดือนละครั้งไม่เกิน<\/span><\/label>/)
  assert.match(g, /name="newsmail"[^>]* hidden/)
  const f = render({ name: 'x', look: 'poster', lang: 'th', kind: 'shop', d: { name: 'ร้าน', msg: true }, tier: 'free', status: 'live' }, {})
  assert.ok(!f.includes('<label class="newsopt">'))
  assert.match(JSON.parse(/<script type="application\/json" id="pd">(.*?)<\/script>/.exec(g)[1]).w.newsOpt, /\{n\}/)
})

test('words: every new string has Thai, English, Burmese and Chinese', () => {
  for (const [T, name] of [[C, 'reader'], [N, 'builder']]) {
    const th = Object.keys(T.th)
    for (const l of ['en', 'my', 'zh']) assert.deepEqual(Object.keys(T[l]).sort(), th.slice().sort(), `${name} ${l}`)
    for (const l of ['th', 'en', 'my', 'zh']) for (const [k, v] of Object.entries(T[l])) assert.ok(v && !/\b(honest|authentic|simply|seamless|powerful|robust|comprehensive|ensure|leverage)\b/i.test(v), `${l} ${k}`) // stylecheck: allow — the test names the words it keeps out
  }
  assert.equal(word('zh', 'newsOpt', { n: 'X' }), '来自 X 的消息，每月最多一次')
  assert.equal(ui('th', 't_cust'), 'ลูกค้า')
})

test('customers: bookings and messages merge by phone and email; CSV; Gold only', async () => {
  const s = await site()
  assert.equal((await book(s, { news: 1 })).status, 200)
  assert.equal((await post('/api/msg', { n: s.name, name: 'Somchai K', reach: '0812345678', body: 'hello there', ms: 5000 })).status, 200)
  assert.equal((await post('/api/msg', { n: s.name, name: 'Nok', reach: 'nok@x.com', body: 'hi there', news: 1, ms: 5000 })).status, 200)
  assert.equal((await post('/api/msg', { n: s.name, name: 'Ploy', reach: 'ploy_line', body: 'ask', news: 1, email: 'ploy@x.com', ms: 5000 })).status, 200)
  await settle()
  const r = await (await api(s, 'customers')).json()
  assert.equal(r.rows.length, 3)
  const som = r.rows.find((x) => x.email === 'a@x.com')
  assert.equal(som.bookings, 1); assert.equal(som.messages, 1); assert.equal(som.news, 'yes'); assert.equal(som.mail, true)
  assert.equal(som.phone, '081-234-5678')
  assert.equal(r.rows.find((x) => x.name === 'Ploy').line, 'ploy_line')
  assert.equal(r.news.mail, 3)
  const raw = new Uint8Array(await (await api(s, 'customers.csv')).arrayBuffer())
  assert.deepEqual([...raw.slice(0, 3)], [0xef, 0xbb, 0xbf], 'a byte-order mark, so a spreadsheet reads Thai')
  const csv = new TextDecoder().decode(raw)
  assert.ok(csv.startsWith('Name,Email,Phone'))
  assert.equal(csv.trim().split('\r\n').length, 4)
  const free = await site({ tier: 'free' })
  assert.equal((await api(free, 'customers')).status, 402)
  assert.equal((await api(free, 'news', { method: 'POST', body: '{}' })).status, 402)
})

test('csv: a cell that starts like a formula is quoted off', () => {
  const t = customers.csv([{ name: '=HYPERLINK("x")', email: '', phone: '+66812345678', line: '-cmd', first: '', last: '', bookings: 0, messages: 0, news: 'no', mail: [] }])
  assert.match(t, /"'=HYPERLINK\(""x""\)"/)
  assert.match(t, /,\+66812345678,/)
  assert.match(t, /,'-cmd,/)
})

test('news: once a month, checked, with a way out; a no stays a no', async () => {
  const s = await site()
  await book(s, { news: 1 })
  await post('/api/msg', { n: s.name, name: 'Nok', reach: 'nok@x.com', body: 'hi there', news: 1, ms: 5000 })
  await post('/api/msg', { n: s.name, name: 'Pim', reach: 'pim@x.com', body: 'no news please', ms: 5000 })
  await settle()
  calls.length = 0
  const bad = (body) => api(s, 'news', { method: 'POST', body: JSON.stringify(body) })
  assert.equal((await (await bad({ text: 'go to www.example.com now' })).json()).error, 'links')
  assert.equal((await (await bad({ text: 'บาคาร่า วันนี้' })).json()).error, 'held')
  assert.equal((await (await bad({ text: 'hi' })).json()).error, 'empty')
  assert.equal((await (await bad({ text: 'Oil sale this week', link: 'https://evil.example' })).json()).error, 'bad')
  assert.equal(mails().length, 0)
  const ok = await bad({ text: 'Oil 10% off this week', link: 'menu' })
  const j = await ok.json()
  assert.equal(ok.status, 200); assert.equal(j.sent, 2); assert.match(j.share, /^https:\/\/line\.me\/R\/share\?text=/)
  const m = mails()
  assert.deepEqual(m.map((x) => x.to[0]).sort(), ['a@x.com', 'nok@x.com'])
  assert.match(m[0].headers['List-Unsubscribe'], new RegExp(`^<${O}/u/`))
  assert.equal(m[0].headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  assert.ok(m[0].html.includes('#menu') && m[0].html.includes('Oil 10% off'))
  // the same month again
  const again = await bad({ text: 'One more' })
  assert.equal(again.status, 409)
  assert.equal(mails().length, 2)
  // the state says so
  const st = (await (await api(s, 'customers')).json()).news
  assert.equal(st.used.sent, 2)
  // opening the emailed link asks (a mail scanner opens it too); the button on that page stops the news
  const key = /\/u\/([^>]+)>/.exec(m.find((x) => x.to[0] === 'a@x.com').headers['List-Unsubscribe'])[1]
  const u = await go('/u/' + key)
  assert.equal(u.status, 200)
  assert.match(await u.text(), /ไม่รับข่าวจาก ร้านนวด A&amp;B อีก\?/)
  assert.equal((await (await api(s, 'customers')).json()).rows.find((x) => x.email === 'a@x.com').news, 'yes')
  const stop = await go('/u/' + key, { method: 'POST', body: 'undo=0', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  assert.match(await stop.text(), /ไม่รับข่าวจาก ร้านนวด A&amp;B แล้ว/)
  assert.equal((await (await api(s, 'customers')).json()).rows.find((x) => x.email === 'a@x.com').news, 'off')
  assert.equal((await go('/u/' + key.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')))).status, 400)
  // next month: only the one still saying yes
  await env.DB.prepare('UPDATE news_sent SET month = ? WHERE site_id = ?').bind('2020-01', s.id).run()
  calls.length = 0
  const next = await (await bad({ text: 'Next month news' })).json()
  assert.equal(next.sent, 1)
  assert.deepEqual(mails().map((x) => x.to[0]), ['nok@x.com'])
  // the mail app's one-click post
  const one = await go('/u/' + key, { method: 'POST', body: 'List-Unsubscribe=One-Click', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  assert.equal(one.status, 200)
  // the button on the page takes it back; ticking the box on a new booking does the same
  const back = await go('/u/' + key, { method: 'POST', body: 'undo=1', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  assert.match(await back.text(), /ต่อแล้ว/)
  assert.equal((await (await api(s, 'customers')).json()).rows.find((x) => x.email === 'a@x.com').news, 'yes')
})

test('reminders: one email the day before at 18:00, only for accepted bookings, never twice', async () => {
  const s = await site()
  const row = await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(s.id).first()
  const d = normalize(JSON.parse(row.d))
  const start = utcOf(day(1) + 'T10:00', TZ)
  const mk = async (id, o = {}) => {
    await env.DB.prepare("INSERT INTO booking (id, site_id, kind, item, start, end, people, name, reach, email, status, at, ref, ok_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, s.id, 'svc', 'svc01', new Date(o.start ?? start).toISOString(), new Date((o.start ?? start) + 36e5).toISOString(), 1, 'G', '0812345678', o.email ?? 'guest@x.com', o.status ?? 'ok', new Date(Date.now() - 864e5).toISOString(), 'MD' + id.toUpperCase().slice(0, 6), o.ok_at ?? null).run()
    return await env.DB.prepare('SELECT * FROM booking WHERE id = ?').bind(id).first()
  }
  const a = await mk('aaaaaaaaaaaaaa'), b = await mk('bbbbbbbbbbbbbb', { status: 'new' }), c = await mk('cccccccccccccc', { status: 'no' })
  const late = await mk('dddddddddddddd', { ok_at: new Date(utcOf(day(0) + 'T19:00', TZ)).toISOString() })
  const far = await mk('eeeeeeeeeeeeee', { start: utcOf(day(3) + 'T10:00', TZ) })
  const noMail = await mk('ffffffffffffff', { email: '' })
  const due = remind.dueMs(a, d)
  assert.equal(due, utcOf(day(0) + 'T18:00', TZ), '18:00 the day before, in the page time zone')
  const opt = { isGold: gold.isGold, normalize, origin: 'https://sites.motdang.net' }
  calls.length = 0
  assert.equal(await remind.run(env, { ...opt, now: due - 60e3 }), 0, 'not yet')
  assert.equal(await remind.run(env, { ...opt, now: due + 60e3 }), 1)
  const m = mails()
  assert.equal(m.length, 1)
  assert.equal(m[0].to[0], 'guest@x.com')
  assert.ok(m[0].html.includes('https://sites.motdang.net/bk/aaaaaaaaaaaaaa') && m[0].html.includes('google.com/maps/dir') && m[0].html.includes('081 234 5678') && m[0].html.includes('Massage'))
  assert.match(m[0].subject, /^พรุ่งนี้ · Tomorrow/)
  assert.equal(await remind.run(env, { ...opt, now: due + 120e3 }), 0, 'a second run sends nothing')
  // declined after it was accepted: no email on a later run
  const e2 = await mk('gggggggggggggg')
  await env.DB.prepare("UPDATE booking SET status = 'no' WHERE id = ?").bind(e2.id).run()
  assert.equal(await remind.run(env, { ...opt, now: due + 180e3 }), 0)
  // accepted after the reminder time: skipped for good
  assert.equal((await env.DB.prepare('SELECT remind_email FROM booking WHERE id = ?').bind(late.id).first()).remind_email, 'skip')
  assert.equal((await env.DB.prepare('SELECT remind_email FROM booking WHERE id = ?').bind(far.id).first()).remind_email, null)
  assert.equal((await env.DB.prepare('SELECT remind_email FROM booking WHERE id = ?').bind(b.id).first()).remind_email, null)
  // a hotel stay: the day before the first night
  const stay = await mk('hhhhhhhhhhhhhh')
  await env.DB.prepare("UPDATE booking SET kind = 'room', item = 'r1', start = ?, end = ? WHERE id = ?").bind(day(1), day(2), stay.id).run()
  assert.equal(remind.dueMs({ ...stay, kind: 'room', start: day(1) }, d), due)
})

test('LINE: sign in, the reminder goes to the LINE account once, a cancel takes it back', async () => {
  const s = await site()
  const start = utcOf(day(2) + 'T10:00', TZ)
  const id = 'llllllllllllll'
  await env.DB.prepare("INSERT INTO booking (id, site_id, kind, item, start, end, people, name, reach, email, status, at, ref) VALUES (?,?,'svc','svc01',?,?,1,'G','0812345678','',?,?,?)")
    .bind(id, s.id, new Date(start).toISOString(), new Date(start + 36e5).toISOString(), 'ok', new Date().toISOString(), 'MDLLLL').run()
  const bot = { reminded: [], unreminded: [], remind: async (...a) => { bot.reminded.push(a); return { ok: true } }, unremind: async (...a) => { bot.unreminded.push(a); return { ok: true } } }
  // not set up: no button, the start of the flow turns back
  assert.ok(!(await (await go('/bk/' + id)).text()).includes('/line/go'))
  assert.match((await go('/line/go?bk=' + id)).headers.get('location'), /line=off/)
  Object.assign(env, { LINE_LOGIN_ID: '2012126176', LINE_LOGIN_SECRET: 'secret', LINE_BOT: bot })
  try {
    const page = await (await go('/bk/' + id)).text()
    assert.ok(page.includes(`href="/line/go?bk=${id}"`) && page.includes('เตือนฉันทาง LINE'))
    const g = await go('/line/go?bk=' + id)
    assert.equal(g.status, 302)
    const loc = new URL(g.headers.get('location'))
    assert.equal(loc.origin + loc.pathname, 'https://access.line.me/oauth2/v2.1/authorize')
    assert.equal(loc.searchParams.get('client_id'), '2012126176'); assert.equal(loc.searchParams.get('scope'), 'profile openid')
    assert.equal(loc.searchParams.get('redirect_uri'), O + '/line/cb')
    const state = loc.searchParams.get('state'), nonce = /lstate=([a-f0-9]+)/.exec(g.headers.get('set-cookie'))[1]
    assert.equal(state, nonce + '.' + id)
    // LINE brings the guest back with the wrong cookie: nothing happens
    const forged = await go(`/line/cb?code=c&state=${state}`, { headers: { cookie: 'lstate=deadbeef' } })
    assert.match(forged.headers.get('location'), /\/all$/); assert.equal(bot.reminded.length, 0)
    const back = await go(`/line/cb?code=c&state=${state}`, { headers: { cookie: 'lstate=' + nonce } })
    assert.match(back.headers.get('location'), new RegExp(`/bk/${id}\\?line=ok$`))
    assert.equal(bot.reminded.length, 1)
    const [uid, key, at, text] = bot.reminded[0]
    assert.match(uid, /^U[0-9a-f]{32}$/); assert.equal(key, 'bk:' + id)
    assert.equal(at, utcOf(day(1) + 'T18:00', TZ)); assert.ok(text.includes(`/bk/${id}`) && text.includes('Massage'))
    const tok = sent('https://api.line.me/oauth2/v2.1/token').at(-1)
    assert.equal(new URLSearchParams(tok.init.body).get('client_secret'), 'secret')
    // a second tap does not set a second reminder
    assert.match((await go('/line/go?bk=' + id)).headers.get('location'), /line=set/)
    const again = await go(`/line/cb?code=c&state=${state}`, { headers: { cookie: 'lstate=' + nonce } })
    assert.match(again.headers.get('location'), /line=set/); assert.equal(bot.reminded.length, 1)
    assert.ok(!(await (await go('/bk/' + id)).text()).includes('/line/go'), 'the button is gone once it is set')
    // the guest cancels: the LINE reminder is taken back
    await go(`/api/bk/${id}/cancel`, { method: 'POST' }); await settle()
    assert.deepEqual(bot.unreminded[0].slice(1), ['bk:' + id])
    assert.equal((await env.DB.prepare('SELECT remind_line FROM booking WHERE id = ?').bind(id).first()).remind_line, null)
    // a booking not accepted has no button and no sign-in
    assert.match((await go('/line/go?bk=' + id)).headers.get('location'), /line=gone/)
  } finally { delete env.LINE_LOGIN_ID; delete env.LINE_LOGIN_SECRET; delete env.LINE_BOT }
})

test('LINE: the owner declining an accepted booking takes the reminder back', async () => {
  const s = await site()
  const start = utcOf(day(3) + 'T10:00', TZ), id = 'mmmmmmmmmmmmmm'
  await env.DB.prepare("INSERT INTO booking (id, site_id, kind, item, start, end, people, name, reach, email, status, at, ref, line_uid, remind_line) VALUES (?,?,'svc','svc01',?,?,1,'G','0812345678','','ok',?,?,?,?)")
    .bind(id, s.id, new Date(start).toISOString(), new Date(start + 36e5).toISOString(), new Date().toISOString(), 'MDMMMM', 'U' + 'b'.repeat(32), new Date(Date.now() + 864e5).toISOString()).run()
  const bot = { unreminded: [], unremind: async (...a) => { bot.unreminded.push(a) } }
  env.LINE_BOT = bot
  try {
    assert.equal((await (await api(s, 'bookings', { method: 'POST', body: JSON.stringify({ id, act: 'no' }) })).json()).ok, true)
    await settle()
    assert.deepEqual(bot.unreminded, [['U' + 'b'.repeat(32), 'bk:' + id]])
  } finally { delete env.LINE_BOT }
})

test('guest page for a service booking: its own words, a cancel button, a way back', async () => {
  const s = await site()
  const r = await (await book(s)).json()
  assert.ok(r.page && r.page.includes('/bk/'), 'the answer carries the guest page for a service too')
  const html = await (await go(r.page.replace(O, ''))).text()
  assert.ok(html.includes('บริการ · Service') && html.includes('Massage') && html.includes('/api/bk/') && !html.includes('เช็คอิน'))
})
