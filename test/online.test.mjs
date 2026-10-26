// An online business page (Nan 2026-10-26): packages as a price table, questions and answers with FAQPage data,
// the news sign-up box with a confirm email first, and the two buttons at the top.
// An in-memory D1 (node:sqlite); Resend is a stub.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker, { sha } from '../src/worker.mjs'
import * as customers from '../src/customers.mjs'
import { render, normalize } from '../public/s/render.mjs'
import { faqCap, faqShown, pointsOf, ON_MAX } from '../public/s/online.mjs'
import { O, ow, owBoth } from '../public/s/words-online.mjs'
import { OB } from '../public/s/make-words-online.mjs'
import { onlineExamples } from '../public/s/make-online.mjs'
import { ui } from '../public/s/make-words.mjs'

// ---- the page --------------------------------------------------------------------------------

const base = { name: 'nan-english', look: 'clean', lang: 'en', kind: 'online', views: 1, status: 'live' }
const svc3 = [
  { id: 'p1aaa', n: 'Trial lesson', p: '300', mins: 30, note: 'A 30-minute call\nWe find your level' },
  { id: 'p2aaa', n: 'Monthly package', p: '3200', mins: 60, note: 'Four lessons; Homework; Questions on LINE' },
  { id: 'p3aaa', n: 'Work course', p: '9600', mins: 90, note: 'Twelve lessons' },
]
const D = (extra = {}) => ({ name: 'Nan English', tagline: 'English on video', contact: { line: '@nanenglish' }, currency: 'THB', svc: svc3, ...extra })
const tag = (html, re) => (html.match(re) || [''])[0]

test('questions: cut to size, an empty question dropped, 40 kept, 12 shown on a free page and 40 on Gold', () => {
  const long = 'q'.repeat(300), ans = 'a'.repeat(2000)
  const n = normalize({ faq: [{ q: '  How long?  ', a: ' One hour. ' }, { q: '', a: 'no question' }, { q: long, a: ans }, { q: 'Open?' }, 'junk', null] })
  assert.deepEqual(n.faq[0], { q: 'How long?', a: 'One hour.' })
  assert.equal(n.faq.length, 3, 'the row with no question is gone; a question with no answer waits')
  assert.equal(n.faq[1].q.length, 200); assert.equal(n.faq[1].a.length, 1500)
  assert.equal(faqShown(n, true).length, 2, 'only a question with its answer shows')
  const many = normalize({ faq: Array.from({ length: 60 }, (_, i) => ({ q: 'Q' + i, a: 'A' + i })) })
  assert.equal(many.faq.length, ON_MAX.faq); assert.equal(faqCap(false), 12); assert.equal(faqCap(true), 40)
  const count = (tier) => (render({ ...base, tier, d: D({ faq: many.faq }) }).match(/<details class="qa">/g) || []).length
  assert.equal(count('free'), 12); assert.equal(count('gold'), 40)
  assert.equal(normalize({}).faq.length, 0)
})

test('questions: a fold each, escaped; FAQPage data for the ones that show', () => {
  const faq = [{ q: 'Is it <b>safe</b>?', a: 'Yes.\nVery <script>x</script>' }, { q: 'Where?', a: 'On video.' }]
  const html = render({ ...base, tier: 'free', d: D({ faq }) })
  assert.match(html, /<section class="card rise faq" id="faq">/)
  assert.match(html, /<summary>Is it &lt;b&gt;safe&lt;\/b&gt;\?<\/summary>/)
  assert.ok(!html.includes('<script>x'))
  const ld = JSON.parse(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"FAQPage".*?\})<\/script>/.exec(html)[1])
  assert.equal(ld.mainEntity.length, 2)
  assert.deepEqual(ld.mainEntity[1], { '@type': 'Question', name: 'Where?', acceptedAnswer: { '@type': 'Answer', text: 'On video.' } })
  assert.ok(ld.mainEntity[0].name.includes('<b>'), 'plain text in the data')
  assert.ok(!/<script type="application\/ld\+json">[^<]*<b>/.test(html), 'a < in the data is escaped')
  // twelve on a free page: the data lists what shows
  const many = Array.from({ length: 20 }, (_, i) => ({ q: 'Q' + i, a: 'A' + i }))
  assert.equal(JSON.parse(/"@type":"FAQPage".*?<\/script>/.exec(render({ ...base, tier: 'free', d: D({ faq: many }) }))[0].replace(/<\/script>$/, '').replace(/^/, '{"@context":"https://schema.org",')).mainEntity.length, 12)
  // none in a preview, none on a page search engines are told to skip
  assert.ok(!render({ ...base, tier: 'free', d: D({ faq }) }, { preview: true }).includes('FAQPage'))
  assert.ok(!render({ ...base, tier: 'free', d: { ...D({ faq }), contact: {} } }).includes('FAQPage'))
  assert.ok(!render({ ...base, tier: 'free', status: 'held', d: D({ faq }) }).includes('FAQPage'))
  // any kind may use it
  assert.match(render({ ...base, kind: 'shop', tier: 'free', d: D({ faq }) }), /id="faq"/)
})

test('packages: a price table of up to three cards, the rest as rows; points from the note', () => {
  assert.deepEqual(pointsOf('A 30-minute call\n- We find your level\n• A plan'), ['A 30-minute call', 'We find your level', 'A plan'])
  assert.deepEqual(pointsOf('Four lessons; Homework · Help on LINE'), ['Four lessons', 'Homework', 'Help on LINE'])
  assert.deepEqual(pointsOf('Just a sentence, with a comma.'), ['Just a sentence, with a comma.'])
  assert.equal(pointsOf(Array.from({ length: 20 }, (_, i) => 'p' + i).join('\n')).length, ON_MAX.points)
  const html = render({ ...base, tier: 'free', d: D() })
  const sec = tag(html, /<section class="card rise pkgsec" id="packages">[\s\S]*?<\/section>/)
  assert.equal((sec.match(/<li class="pkg">/g) || []).length, 3)
  assert.match(sec, /<ul class="pkgs n3">/)
  assert.match(sec, /<h3>Monthly package<\/h3><p class="pkp">฿3,200<\/p><p class="pkm">[\s\S]*?60 min<\/p><ul class="pki"><li>Four lessons<\/li><li>Homework<\/li><li>Questions on LINE<\/li><\/ul>/)
  assert.match(sec, /<h3>Work course<\/h3>[\s\S]*?<p class="pkn">Twelve lessons<\/p>/)
  const five = render({ ...base, tier: 'free', d: D({ svc: [...svc3, { id: 'p4aaa', n: 'Extra one', p: '50', mins: 20 }, { id: 'p5aaa', n: 'Extra two', p: '60', mins: 20 }] }) })
  const sec5 = tag(five, /<section class="card rise pkgsec"[\s\S]*?<\/section>/)
  assert.equal((sec5.match(/<li class="pkg">/g) || []).length, 3)
  assert.match(sec5, /<h3 class="pkmore">More packages<\/h3><ul class="pkrows"><li><span class="n">Extra one/)
  assert.equal(normalize({ svc: [{ n: 'x', note: 'n'.repeat(500) }] }).svc[0].note.length, 400)
})

test('packages: a free page says Ask, a Gold page says Book a call and opens the booking times', () => {
  const free = render({ ...base, tier: 'free', d: D() })
  const fs = tag(free, /<section class="card rise pkgsec"[\s\S]*?<\/section>/)
  assert.equal((fs.match(/data-t="ask" data-ask="[^"]+" href="#message"/g) || []).length, 3, 'Ask goes to the message form')
  assert.ok(!fs.includes('svcb') && !fs.includes('bookui'))
  assert.ok(!free.includes('id="book"'))
  const gold = render({ ...base, tier: 'gold', d: D() })
  const gs = tag(gold, /<section class="card rise pkgsec"[\s\S]*?<\/section>/)
  assert.equal((gs.match(/<button type="button" class="btn svcb pkgb" data-t="book" data-svc="p[123]aaa">/g) || []).length, 3)
  assert.match(gs, /Book a call/); assert.match(gs, /<div class="bookui" id="bookui" hidden><\/div>/)
  assert.ok(!gold.includes('id="book"'), 'one booking section, not two')
  assert.match(gold, /"svc":\{"p1aaa":\{"cap":1,"mins":30,"p":"300"\}/, 'the page script gets the times')
  // no message form: Ask goes to LINE with the package named; no LINE either: the phone
  const oa = render({ ...base, tier: 'free', d: D({ msg: false }) })
  assert.match(oa, /data-ask="Trial lesson" href="https:\/\/line\.me\/R\/oaMessage\/%40nanenglish\/\?I%20would%20like%20to%20ask%20about%3A%20Trial%20lesson"/)
  assert.match(render({ ...base, tier: 'free', d: D({ msg: false, contact: { phone: '081 234 5678' } }) }), /data-ask="Trial lesson" href="tel:0812345678"/)
  // the other kinds keep their booking section
  assert.match(render({ ...base, kind: 'service', tier: 'gold', d: D() }), /id="book"/)
  assert.ok(!render({ ...base, kind: 'service', tier: 'gold', d: D() }).includes('id="packages"'))
  assert.ok(!render({ ...base, kind: 'service', tier: 'free', d: D() }).includes('id="book"'))
  // the packages come before the questions and the quotes
  const page = render({ ...base, tier: 'gold', d: D({ faq: [{ q: 'Q', a: 'A' }], quotes: [{ q: 'Good', who: 'Ploy' }], about: 'About me' }) })
  const at = (re) => page.search(re)
  assert.ok(at(/id="packages"/) > at(/<h2>[^<]*<\/i>About/) && at(/id="packages"/) < at(/class="card rise quotes"/) && at(/class="card rise quotes"/) < at(/id="faq"/))
})

test('the top: Book a call or Ask to the packages, then the message form or LINE', () => {
  const top = (extra, tier = 'gold') => (tag(render({ ...base, tier, d: D(extra) }), /<header class="top[\s\S]*?<\/header>/).match(/<a class="btn cta[^>]*>[\s\S]*?<\/a>/g) || [])
  const g = top({})
  assert.equal(g.length, 2)
  assert.match(g[0], /href="#packages"[^>]*>[\s\S]*Book a call/); assert.ok(!g[0].includes('ghost'))
  assert.match(g[1], /cta2 ghost[^>]*href="#message"[^>]*>[\s\S]*Send a message/)
  const f = top({}, 'free')
  assert.match(f[0], /href="#packages"[^>]*>[\s\S]*Ask<\/a>/); assert.ok(!f[0].includes('Book a call'))
  // no message form: the second is LINE; no LINE either: the phone
  assert.match(top({ msg: false })[1], /cta2 ghost[^>]*href="https:\/\/line\.me\/R\/ti\/p\/%40nanenglish"/)
  assert.match(top({ msg: false, contact: { phone: '0812345678' } })[1], /href="tel:0812345678"[^>]*>[\s\S]*Call/)
  assert.equal(top({ msg: false, contact: {} }).length, 1)
  // no packages: one button that talks
  const n = top({ svc: [] })
  assert.equal(n.length, 1); assert.match(n[0], /href="#message"/)
  assert.match(top({ svc: [], msg: false })[0], /href="https:\/\/line\.me/)
  // Thai
  assert.match(tag(render({ ...base, lang: 'th', tier: 'gold', d: D() }), /<header class="top[\s\S]*?<\/header>/), /จองคิวคุย/)
  assert.match(tag(render({ ...base, lang: 'th', tier: 'free', d: D() }), /<header class="top[\s\S]*?<\/header>/), /สอบถาม/)
  // the other kinds keep their one button
  assert.equal((tag(render({ ...base, kind: 'service', tier: 'gold', d: D() }), /<header class="top[\s\S]*?<\/header>/).match(/<a class="btn cta[^>]*>/g) || []).length, 1)
})

test('the sign-up box shows on a Gold page that turned it on', () => {
  const on = render({ ...base, tier: 'gold', d: D({ signup: { on: true } }) })
  assert.match(on, /<section class="card rise signup" id="join"><h2>[\s\S]*?Get our news<\/h2><p>One email a month at most\./)
  assert.match(on, /<form class="msgf joinf" id="joinf">[\s\S]*?name="email" type="email"[^>]*required/)
  assert.match(on, /src="\/s\/online-page\.js"/)
  assert.ok(!render({ ...base, tier: 'free', d: D({ signup: { on: true } }) }).includes('id="join"'), 'Gold')
  assert.ok(!render({ ...base, tier: 'gold', d: D() }).includes('id="join"'), 'off until the maker turns it on')
  assert.match(render({ ...base, tier: 'gold', d: D({ signup: { on: true, t: 'Join <the> list', note: 'Tips on Fridays' } }) }), /Join &lt;the&gt; list<\/h2><p>Tips on Fridays<\/p>/)
  assert.match(render({ ...base, tier: 'gold', d: D({ signup: { on: true } }) }, { preview: true }), /Visitors join your list here\.[\s\S]*?type="submit" data-t="join" disabled/)
  const pd = JSON.parse(/<script type="application\/json" id="pd">(.*?)<\/script>/.exec(on)[1])
  assert.equal(pd.w.joinSent, 'Check your email. Press the link to confirm.'); assert.match(pd.w.askPkg, /\{n\}/)
  assert.ok(!render({ ...base, kind: 'shop', tier: 'gold', d: { name: 'x' } }).includes('online-page.js'), 'other pages do not load it')
})

test('the page data names the packages as offers', () => {
  const html = render({ ...base, tier: 'gold', d: D() })
  const ld = JSON.parse(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"Organization".*?\})<\/script>/.exec(html)[1])
  assert.equal(ld.hasOfferCatalog.itemListElement.length, 3)
  assert.deepEqual(ld.hasOfferCatalog.itemListElement[0].itemOffered, { '@type': 'Service', name: 'Trial lesson', description: 'A 30-minute call\nWe find your level' })
  assert.equal(ld.hasOfferCatalog.itemListElement[1].price, 3200)
})

// ---- words -------------------------------------------------------------------------------------

test('words: every string is in Thai, English, Burmese and Chinese', () => {
  for (const [T, name] of [[O, 'page'], [OB, 'builder']]) {
    const en = Object.keys(T.en)
    for (const l of ['th', 'my', 'zh']) assert.deepEqual(Object.keys(T[l]).sort(), en.slice().sort(), `${name} ${l}`)
    for (const l of ['en', 'th', 'my', 'zh']) for (const [k, v] of Object.entries(T[l])) {
      assert.ok(v && v.trim(), `${name} ${l} ${k}`)
      assert.ok(!/\b(honest|authentic|simply|seamless|powerful|robust|comprehensive|ensure|leverage)\b/i.test(v), `${name} ${l} ${k}`) // stylecheck: allow — the test names the words it keeps out
    }
  }
  for (const k of Object.keys(O.en)) {
    const vars = (s) => (s.match(/\{[a-z]+\}/g) || []).sort().join()
    for (const l of ['th', 'my', 'zh']) assert.equal(vars(O[l][k]), vars(O.en[k]), `{vars} in ${l} ${k}`)
  }
  assert.equal(ow('zh', 'pkgBook'), '预约通话'); assert.equal(ow('fr', 'packages'), 'Packages', 'a language without words reads English')
  assert.equal(ow('en', 'askPkg', { n: 'X' }), 'I would like to ask about: X')
  assert.deepEqual(owBoth('my', 'packages'), ['แพ็กเกจ', 'ပက်ကေ့ချ်များ']); assert.deepEqual(owBoth('ja', 'packages'), ['แพ็กเกจ', 'Packages'])
  for (const l of ['th', 'en', 'my', 'zh']) { assert.ok(ui(l, 's_pkg') && ui(l, 's_pkg') !== 's_pkg', l); assert.ok(ui(l, 'a_faq') !== 'a_faq' && ui(l, 'su_on') !== 'su_on', l) }
  assert.equal(ui('th', 's_faq'), 'คำถามและคำตอบ')
})

test('the builder: the online kind opens words, face, packages, questions, quotes, sign-up, links, contact; the first screen shows a filled example', () => {
  const src = readFileSync(new URL('../public/s/make.js', import.meta.url), 'utf8')
  const open = /\n  online: \[([^\]]*)\],\n\}/.exec(src)[1].match(/'([a-z]+)'/g).map((x) => x.slice(1, -1))
  assert.deepEqual(open, ['words', 'face', 'svc', 'faq', 'quotes', 'signup', 'links', 'contact'])
  const sections = [...src.slice(src.indexOf('const SECTIONS = ['), src.indexOf('\n]', src.indexOf('const SECTIONS = [')))].join('')
  for (const id of ['faq', 'signup']) assert.match(sections, new RegExp(`\\['${id}', '[a-z]+', 's_${id}'`))
  assert.match(src, /faq: \(\) => newFaq\(\)/); assert.match(src, /signup\(\) \{ return signupSec\(/); assert.match(src, /faq\(\) \{ return faqSec\(/)
  assert.match(src, /if \(kind === 'online'\) Object\.assign\(x, onlineExamples\(th\)/)
  for (const th of [true, false]) {
    const x = onlineExamples(th)
    assert.equal(x.svc.length, 3); assert.equal(x.faq.length, 3); assert.equal(x.quotes.length, 2)
    const d = normalize({ name: 'x', ...x, signup: { on: true } })
    assert.equal(d.svc.length, 3); assert.equal(d.faq.length, 3); assert.equal(d.quotes.length, 2)
    const html = render({ ...base, lang: th ? 'th' : 'en', tier: 'gold', d })
    assert.equal((html.match(/<li class="pkg">/g) || []).length, 3); assert.equal((html.match(/<details class="qa">/g) || []).length, 3)
    assert.equal((html.match(/<figure><blockquote>/g) || []).length, 2); assert.match(html, /id="join"/)
    assert.match(html, /฿300/, 'the example is priced in baht')
  }
})

// ---- the sign-up box, with the Worker and a database -----------------------------------------

const MIGRATIONS = readdirSync(new URL('../migrations/', import.meta.url)).sort()
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
const d1 = () => { const db = new DatabaseSync(':memory:'); for (const f of MIGRATIONS) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8')); return wrap(db) }

const O_ = 'http://localhost'
const env = { DB: d1(), MEDIA: { put: async () => {}, get: async () => null, delete: async () => {} }, SESSION_SECRET: 's', RESEND_KEY: 'rk', MAIL_FROM: 'Mot Dang <pages@motdang.net>' }
let pending = []
const ctx = { waitUntil(p) { pending.push(Promise.resolve(p).catch(() => {})) } }
const settle = async () => { while (pending.length) { const p = pending; pending = []; await Promise.all(p) } }
let ip = 0
const go = (path, init = {}) => worker.fetch(new Request(O_ + path, { redirect: 'manual', ...init, headers: { 'cf-connecting-ip': '10.1.0.' + (++ip), ...(init.headers || {}) } }), env, ctx)
const post = (path, body, headers = {}) => go(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
const form = (path, body) => go(path, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } })

const calls = []
const realFetch = globalThis.fetch
let resendDown = false
globalThis.fetch = async (u, init = {}) => {
  const url = String(u)
  if (url === 'https://api.resend.com/emails' || url === 'https://api.resend.com/emails/batch') {
    calls.push({ url, init })
    return resendDown ? new Response('{}', { status: 500 }) : new Response(JSON.stringify({ id: 'x' }), { status: 200 })
  }
  return realFetch(u, init)
}
const mails = () => calls.flatMap((c) => { const b = JSON.parse(c.init.body); return Array.isArray(b) ? b : [b] })
const mailsTo = (e) => mails().filter((m) => m.to[0] === e)
const linkIn = (m, re) => new RegExp(`href="${re}"`).exec(m.html)[0].slice(6, -1).replace(O_, '')

let n = 0
async function site(o = {}) {
  n++
  const id = 'o' + n, token = 'tok' + String(n).padStart(2, '0') + 'y'.repeat(30), name = 'online-' + n
  const now = new Date().toISOString()
  const d = JSON.stringify({ name: 'Nan English & Co', msg: true, svc: svc3, signup: { on: o.signup ?? true }, contact: { email: 'owner@example.com' }, ...(o.d || {}) })
  await env.DB.prepare('INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until, trial, plan) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, name, await sha(token), 'live', 'online', 'clean', o.lang ?? 'en', d, now, now, o.tier ?? 'gold', null, 0, 'gold').run()
  return { id, name, token }
}
const api = (s, path, init = {}) => go('/api/' + path, { ...init, headers: { 'x-edit': s.token, origin: O_, 'content-type': 'application/json', ...(init.headers || {}) } })
const join = (s, body = {}, headers = {}) => post('/api/join', { n: s.name, email: 'ann@x.com', name: 'Ann', ms: 5000, ...body }, headers)
const rows = async (s) => (await (await api(s, 'customers')).json())

test('sign-up: the address is not a customer until the button on the confirm page is pressed', async () => {
  const s = await site()
  calls.length = 0
  const r = await join(s)
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true, sent: true })
  // one email: Thai first, English beside it, a link that carries the page and the address
  const m = mailsTo('ann@x.com')
  assert.equal(m.length, 1)
  assert.match(m[0].subject, /^ยืนยัน: ข่าวจาก Nan English & Co · Confirm: news from Nan English & Co$/)
  assert.ok(m[0].html.includes('Nan English &amp; Co') && m[0].html.includes('ใช่ ส่งข่าวมาให้ฉัน · Yes, send me the news'))
  const link = linkIn(m[0], 'http://localhost/j/[^"]+')
  assert.match(link, /^\/j\/o\d+\.[A-Za-z0-9_-]+\.[0-9a-f]{24}$/)
  // before: nobody on the list, one waiting
  let l = await rows(s)
  assert.equal(l.rows.length, 0); assert.equal(l.news.pending, 1); assert.equal(l.news.mail, 0)
  // opening the link only asks: a mail scanner opens it too
  const ask = await go(link)
  assert.equal(ask.status, 200)
  assert.match(await ask.text(), /รับข่าวจาก Nan English &amp; Co ไหม[\s\S]*Get news from Nan English &amp; Co\?[\s\S]*<form method="post"/)
  assert.equal((await rows(s)).rows.length, 0, 'a GET does not join')
  // the button joins
  const yes = await go(link, { method: 'POST' })
  assert.equal(yes.status, 200)
  const page = await yes.text()
  assert.match(page, /คุณอยู่ในรายชื่อของ Nan English &amp; Co แล้ว/); assert.match(page, /href="\/u\/o\d+\.[A-Za-z0-9_-]+\.[0-9a-f]{24}"[^>]*>เลิกรับข่าว/)
  l = await rows(s)
  assert.equal(l.rows.length, 1); assert.equal(l.news.pending, 0); assert.equal(l.news.mail, 1)
  assert.deepEqual({ name: l.rows[0].name, email: l.rows[0].email, news: l.rows[0].news, mail: l.rows[0].mail, source: l.rows[0].source, bookings: l.rows[0].bookings }, { name: 'Ann', email: 'ann@x.com', news: 'yes', mail: true, source: ['signup'], bookings: 0 })
  const csv = await (await api(s, 'customers.csv')).text()
  assert.match(csv, /,News,Source\r\n/); assert.match(csv, /Ann,ann@x\.com,,,[^,]*,[^,]*,0,0,yes,signup\r\n/)
})

test('sign-up: the monthly news reaches a confirmed address with the stop link, and the stop link works', async () => {
  const s = await site()
  await join(s, { email: 'bea@x.com', name: 'Bea' }); await join(s, { email: 'cy@x.com', name: 'Cy' })
  const keyOf = (e) => /\/j\/([^"]+)/.exec(mailsTo(e).at(-1).html)[1]
  await go('/j/' + keyOf('bea@x.com'), { method: 'POST' }) // Cy never presses it
  calls.length = 0
  const sent = await api(s, 'news', { method: 'POST', body: JSON.stringify({ text: 'Tips for May: three phrases for meetings', link: 'book' }) })
  const j = await sent.json()
  assert.equal(sent.status, 200); assert.equal(j.sent, 1)
  const m = mails()
  assert.deepEqual(m.map((x) => x.to[0]), ['bea@x.com'])
  assert.ok(m[0].html.includes('#packages'), 'the Book link of an online page goes to its packages')
  const stop = /\/u\/([^>]+)>/.exec(m[0].headers['List-Unsubscribe'])[1]
  assert.equal(m[0].headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  // the stop link asks, then stops
  assert.match(await (await go('/u/' + stop)).text(), /ไม่รับข่าวจาก Nan English &amp; Co อีก\?/)
  assert.equal((await rows(s)).rows.find((x) => x.email === 'bea@x.com').news, 'yes')
  assert.match(await (await form('/u/' + stop, 'undo=0')).text(), /ไม่รับข่าวจาก Nan English &amp; Co แล้ว/)
  assert.equal((await rows(s)).rows.find((x) => x.email === 'bea@x.com').news, 'off')
  assert.equal((await rows(s)).news.mail, 0)
  // a mail asked for the same address after a stop waits for a new confirm, and the confirm puts the news back
  calls.length = 0
  await env.DB.prepare("UPDATE signup SET mailed_at = '2020-01-01T00:00:00Z' WHERE site_id = ?").bind(s.id).run()
  assert.deepEqual(await (await join(s, { email: 'bea@x.com' })).json(), { ok: true, sent: true })
  assert.equal((await rows(s)).rows.find((x) => x.email === 'bea@x.com').news, 'off', 'asking is not yes')
  await go('/j/' + keyOf('bea@x.com'), { method: 'POST' })
  assert.equal((await rows(s)).rows.find((x) => x.email === 'bea@x.com').news, 'yes')
})

test('sign-up: a booking and a sign-up by one address are one customer with both sources', async () => {
  const s = await site()
  await env.DB.prepare("INSERT INTO booking (id, site_id, kind, item, start, end, people, name, reach, email, status, at, ref, news) VALUES ('bbbbbbbbbbbbbb',?,'svc','p1aaa',?,?,1,'Dee','0812345678','dee@x.com','ok',?,'MDDEE1',0)")
    .bind(s.id, new Date(Date.now() + 864e5).toISOString(), new Date(Date.now() + 864e5 + 36e5).toISOString(), new Date().toISOString()).run()
  await join(s, { email: 'dee@x.com', name: 'Dee' })
  await go('/j/' + /\/j\/([^"]+)/.exec(mailsTo('dee@x.com').at(-1).html)[1], { method: 'POST' })
  const l = await rows(s)
  assert.equal(l.rows.length, 1)
  assert.deepEqual([l.rows[0].source, l.rows[0].bookings, l.rows[0].news, l.rows[0].phone], [['booking', 'signup'], 1, 'yes', '0812345678'])
})

test('sign-up: asking twice, or when already on the list, sends nothing more and says the same', async () => {
  const s = await site()
  calls.length = 0
  assert.deepEqual(await (await join(s, { email: 'eve@x.com' })).json(), { ok: true, sent: true })
  assert.deepEqual(await (await join(s, { email: 'eve@x.com' })).json(), { ok: true, sent: false }, 'a link went a moment ago')
  assert.equal(mailsTo('eve@x.com').length, 1)
  await go('/j/' + /\/j\/([^"]+)/.exec(mailsTo('eve@x.com')[0].html)[1], { method: 'POST' })
  assert.deepEqual(await (await join(s, { email: 'eve@x.com' })).json(), { ok: true, sent: false }, 'already on the list')
  assert.equal(mailsTo('eve@x.com').length, 1)
  assert.equal((await rows(s)).rows.length, 1)
})

test('sign-up: Gold only, on only when the maker turned it on, an address that parses, a script gets nothing', async () => {
  const free = await site({ tier: 'free' }), off = await site({ signup: false }), s = await site()
  calls.length = 0
  assert.equal((await join(free)).status, 404)
  assert.equal((await join(off)).status, 404)
  assert.equal((await join({ name: 'no-such-page' })).status, 404)
  const bad = await join(s, { email: 'not an address' })
  assert.equal(bad.status, 400); assert.equal((await bad.json()).error, 'email')
  assert.equal((await join(s, { email: '' })).status, 400)
  // the hidden field or a form sent too fast: ok, nothing happens
  assert.deepEqual(await (await join(s, { website: 'http://spam.example' })).json(), { ok: true })
  assert.deepEqual(await (await join(s, { ms: 300 })).json(), { ok: true })
  // a name the message check holds: the same answer, no email
  assert.deepEqual(await (await join(s, { email: 'fay@x.com', name: 'baccarat <script>' })).json(), { ok: true, sent: false })
  assert.equal(mails().length, 0)
  assert.equal(Number((await env.DB.prepare('SELECT COUNT(*) AS n FROM signup WHERE site_id = ?').bind(s.id).first()).n), 0, 'nothing kept for the held ones')
})

test('sign-up: a forged or crossed link joins nobody; another page\'s stop link is not a confirm', async () => {
  const s = await site(), t = await site()
  await join(s, { email: 'gus@x.com' })
  const key = /\/j\/([^"]+)/.exec(mailsTo('gus@x.com').at(-1).html)[1]
  const flip = key.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))
  assert.equal((await go('/j/' + flip)).status, 400)
  assert.equal((await go('/j/' + flip, { method: 'POST' })).status, 400)
  assert.equal((await go('/j/short')).status, 404)
  assert.equal((await rows(s)).rows.length, 0)
  // the stop link of the same address is signed for a different job
  const stopKey = await customers.unsubKey(env, s.id, 'gus@x.com')
  assert.equal((await go('/j/' + stopKey, { method: 'POST' })).status, 400)
  assert.equal((await rows(s)).rows.length, 0)
  // a key for page s does not put the address on page t
  assert.equal((await rows(t)).rows.length, 0)
  await go('/j/' + key, { method: 'POST' })
  assert.equal((await rows(t)).rows.length, 0); assert.equal((await rows(s)).rows.length, 1)
})

test('sign-up: a sender gets six tries a day; a page and the service have a daily number of confirm emails; a failed send is told and given back', async () => {
  const s = await site()
  const same = { 'cf-connecting-ip': '9.9.9.9' }
  for (let i = 0; i < 6; i++) assert.equal((await join(s, { email: `try${i}@x.com` }, same)).status, 200)
  const over = await join(s, { email: 'try7@x.com' }, same)
  assert.equal(over.status, 429); assert.equal((await over.json()).error, 'quota')
  env.JOIN_DAY = '2'
  try {
    const t = await site()
    assert.equal((await join(t, { email: 'q1@x.com' })).status, 200); assert.equal((await join(t, { email: 'q2@x.com' })).status, 200)
    assert.equal((await join(t, { email: 'q3@x.com' })).status, 429, 'the page\'s day is used')
  } finally { delete env.JOIN_DAY }
  const u = await site()
  resendDown = true
  try {
    const bad = await join(u, { email: 'down@x.com' })
    assert.equal(bad.status, 502); assert.equal((await bad.json()).error, 'mail')
  } finally { resendDown = false }
  assert.equal((await join(u, { email: 'down@x.com' })).status, 200, 'the try is given back: no wait for a mail that never went')
})

test('sign-up: the confirm email and page speak the page language beside Thai', async () => {
  const s = await site({ lang: 'zh' })
  calls.length = 0
  await join(s, { email: 'hui@x.com' })
  const m = mailsTo('hui@x.com')[0]
  assert.match(m.subject, /^ยืนยัน: ข่าวจาก Nan English & Co · 请确认：来自 Nan English & Co 的消息$/)
  assert.ok(m.html.includes('好，给我发消息') && m.text.includes('好，给我发消息'))
  const link = linkIn(m, 'http://localhost/j/[^"]+')
  assert.match(await (await go(link)).text(), /接收来自 Nan English &amp; Co 的消息吗？/)
})

test('deleting a page deletes its sign-ups', async () => {
  const s = await site()
  await join(s, { email: 'ida@x.com' })
  assert.equal(Number((await env.DB.prepare('SELECT COUNT(*) AS n FROM signup WHERE site_id = ?').bind(s.id).first()).n), 1)
  assert.equal((await api(s, 'site', { method: 'DELETE' })).status, 200)
  assert.equal(Number((await env.DB.prepare('SELECT COUNT(*) AS n FROM signup WHERE site_id = ?').bind(s.id).first()).n), 0)
})
