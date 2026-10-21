// Two plans, Free and Gold. Hotel booking is one line under Gold. A Shoup number shows as today's number
// on a page; the ladder stays in the code (Nan 2026-10-21). Run on an in-memory D1 (node:sqlite).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker, { sha } from '../src/worker.mjs'
import { kitLink } from '../src/sell.mjs'
import { LADDER, START, nextRate } from '../src/sellers.mjs'
import { termsLines, SPLIT_LADDER, HELP_LADDER, step } from '../src/deals.mjs'
import { LADDER as FOUND_LADDER, nextPrice } from '../src/founding.mjs'
import { LADDER as SIAN_LADDER } from '../src/sian.mjs'
import { RUNGS } from '../src/support.mjs'
import { trialNotes } from '../src/cron.mjs'
import * as gold from '../src/gold.mjs'
import { ui, UI_LANGS } from '../public/s/make-words.mjs'

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
const O = 'http://localhost'
const env = { DB: d1(), SESSION_SECRET: 's', PROMPTPAY: '0812345678', GOLD_THB: '3000', HOTEL_THB: '555', HOTEL_YEAR_THB: '5550' }
const go = (path, init = {}) => worker.fetch(new Request(O + path, { redirect: 'manual', ...init }), env, { waitUntil() {} })
const text = async (path, init) => (await go(path, init)).text()

test('/sell: Gold with the hotel line under it, listings under their own heading, today\'s share and no ladder', async () => {
  for (const l of ['en', 'th', 'my']) {
    const t = await text(`/sell?l=${l}`)
    // amounts as the code computes them: 20% of ฿3,000 and of ฿5,550
    assert.match(t, /฿3,000<\/s>[^<]*<strong>฿600<\/strong>/, l)
    assert.match(t, /฿5,550<\/s>[^<]*<strong>฿1,110<\/strong>/, l)
    // the hotel line sits inside the Gold card, after Gold's own amounts
    assert.equal(t.split('class="sub"').length, 2, l)
    assert.ok(t.indexOf('฿600') < t.indexOf('class="sub"') && t.indexOf('class="sub"') < t.indexOf('฿1,110'), l)
    // no third plan, no ladder
    assert.ok(!/Hotel year|โรงแรมรายปี|ဟိုတယ် တစ်နှစ်/.test(t), l)
    assert.ok(!/class="ladder"|one step|หนึ่งขั้น|တစ်ဆင့်/.test(t), l)
    assert.ok(!/>(10|15|25|30)%</.test(t), l)
    // listings: their own heading, their own pay line; the 500 baht line stays
    assert.equal(t.split('<h2').length - 1, 6, l) // sign up · the work · listings · pay · you need · steps
    assert.match(t, /฿500/, l)
    assert.ok(t.indexOf('class="sub"') < t.indexOf('60%'), l)
  }
  const en = await text('/sell?l=en')
  assert.match(en, new RegExp(`You get ${START.rate}% this month, paid on the 1st to your PromptPay\\.`))
  assert.match(en, /Listings: your share of each fee is sent the day the owner pays\./)
  assert.match(en, /<h2>Listings<\/h2>/)
  assert.match(en, /Bring a seller: ฿500 when they sell their first plan\./)
  assert.match(await text('/sell?l=th'), new RegExp(`เดือนนี้คุณได้ ${START.rate}%`))
  assert.match(await text('/sell?l=my'), new RegExp(`ဤလတွင် သင် ${START.rate}% ရမည်`))
})

test('the ladder stays in the code and a seller\'s own kit explains it', async () => {
  assert.deepEqual(LADDER, [10, 15, 20, 25, 30])
  assert.equal(nextRate(20, 24000, 30000), 25)
  assert.equal(nextRate(20, 17000, 30000), 15)
  const now = new Date().toISOString()
  await env.DB.prepare("INSERT INTO seller (id, name, rate, target, created, status, promptpay, key, lang) VALUES ('noi', 'Noi', 25, 30000, ?, 'ok', '0812345678', 'k1', 'en')").bind(now.slice(0, 10)).run()
  const link = new URL(await kitLink(env, sha, O, { id: 'noi', key: 'k1' }))
  for (const [l, rule] of [['en', /Each month your share moves one step on 10 · 15 · 20 · 25 · 30: sell 80% of ฿30,000 or more, one step up; under 60%, one step down\./], ['th', /ทุกเดือนส่วนแบ่งของคุณขยับหนึ่งขั้นบน 10 · 15 · 20 · 25 · 30/], ['my', /လစဉ် သင့်ဝေစုသည် 10 · 15 · 20 · 25 · 30 ပေါ်တွင်/]]) {
    const t = await text(link.pathname + '?l=' + l)
    assert.match(t, rule, l)
    assert.match(t, /<span class="on">25%<\/span>/, l) // where this seller stands today
    assert.ok(!/Hotel year|โรงแรมรายปี/.test(t), l)
  }
  // what Hom says to a hotel: Gold with room booking, at the year's price
  assert.match(await text(link.pathname + '?l=th'), /ทองพร้อมรับจองห้องพัก 5,550 บาทต่อปี/)
})

test('a page that shows a ladder shows today\'s number instead', async () => {
  // /founders: this month's price, no steps
  const f = await text('/founders')
  assert.match(f, /฿3,000/)
  assert.ok(!/ขยับ|moves on the 1st|up a step|down a step/.test(f))
  assert.ok(!FOUND_LADDER.filter((x) => x !== 3000).some((x) => f.includes('฿' + new Intl.NumberFormat('en').format(x))))
  // /sian: this month's price and seats, no steps
  const s = await text('/sian?hl=en')
  assert.match(s, /฿9,999 a year/)
  assert.match(s, /10 of 10 seats left this month/)
  assert.ok(!/class="ladder"|follows demand|a step/.test(s))
  assert.ok(!SIAN_LADDER.filter((x) => x !== 9999).some((x) => s.includes('฿' + new Intl.NumberFormat('en').format(x))))
  const sth = await text('/sian?hl=th')
  assert.ok(!/class="ladder"|ตามความต้องการ|หนึ่งขั้น/.test(sth))
  // /support: the investor minimum, no steps
  for (const l of ['en', 'th']) {
    const t = await text('/support?l=' + l)
    assert.match(t, new RegExp(`฿${new Intl.NumberFormat('en').format(RUNGS[0])}`))
    assert.ok(!/Steps:|<span class="th">ขั้น<\/span>/.test(t), l)
  }
  // /lister: its share today, not where it starts
  const li = await text('/lister')
  assert.match(li, new RegExp(`Your share is ${SPLIT_LADDER[2]}% of each fee`))
  assert.ok(!/starts at|ส่วนแบ่งเริ่ม/.test(li))
  // the owner's terms for home help: today's rate up front; the terms they agree to keep the ladder's range
  const lines = termsLines('help', 15).flat().join('\n')
  assert.match(lines, /15%/)
  assert.ok(lines.includes(`${HELP_LADDER[0]}–${HELP_LADDER.at(-1)}%`))
  assert.match(lines, /rate of the month it is made/)
})

test('the ladders still step', () => {
  assert.equal(step(SPLIT_LADDER, 60, 0.8), 65)
  assert.equal(nextPrice(3000, 24, 30), 4000)
  assert.equal(nextPrice(3000, 10, 30), 2500)
})

test('two plans: Free and Gold; the hotel pays are one payment of Gold with hotel booking', () => {
  const P = gold.PLANS(env)
  assert.deepEqual([P.gold.baht, P.hotel.baht, P.hotelyear.baht], [3000, 555, 5550])
  assert.ok(P.hotel.hotel && P.hotelyear.hotel && !P.gold.hotel)
  // the team's sales note names no third plan
  const said = []
  const real = globalThis.fetch
  globalThis.fetch = async (u, init) => { said.push(init.body); return new Response('{}') }
  return Promise.all([
    gold.tellSales({ DISCORD_SALES: 'https://x/y' }, { title: 'A', url: 'u', amount: '5550.01', months: 12, plan: 'hotel', how: 'SlipOK' }),
    gold.tellSales({ DISCORD_SALES: 'https://x/y' }, { title: 'B', url: 'u', amount: '555.01', months: 1, plan: 'hotel', how: 'SlipOK' }),
  ]).finally(() => { globalThis.fetch = real }).then(() => {
    assert.match(said[0], /Gold \+ hotel booking, a year/)
    assert.match(said[1], /Hotel booking, a month/)
    assert.ok(!said.join('').includes('Hotel year'))
  })
})

test('the builder: Gold, and one line under it for hotel booking, in the languages that have it', () => {
  for (const l of Object.keys(UI_LANGS)) {
    if (l === 'my') continue // Burmese has none of the hotel words yet; the English shows
    for (const k of ['g_hotelLine', 'g_planHotel', 'g_planHotelYear', 'g_hotelGo', 'g_hotelWhy', 'g_hotelYearWhy', 'h_needHotel', 'g_f7']) assert.notEqual(ui(l, k), k, `${l} ${k}`)
    assert.ok(ui(l, 'h_needHotel').includes('{p}') && ui(l, 'h_needHotel').includes('{y}'), l)
    assert.ok(ui(l, 'g_planHotel').includes('{p}') && ui(l, 'g_planHotelYear').includes('{p}'), l)
    // a line under Gold, not a plan of its own: neither label calls itself Hotel
    assert.ok(!/^(Hotel|โรงแรม|酒店)/.test(ui(l, 'g_planHotel')) && !/^(Hotel|โรงแรม|酒店)/.test(ui(l, 'g_planHotelYear')), l)
  }
  assert.equal(ui('en', 'g_hotelLine'), 'With hotel booking')
  assert.match(ui('en', 'g_f7'), /฿555 a month or ฿5,550 a year/)
})

test('the front page: the Gold card carries one hotel line, a month or a year, in four languages', () => {
  const src = readFileSync(new URL('../public/s/home.js', import.meta.url), 'utf8')
  const lines = [...src.matchAll(/hotelPrice: '([^']*)'/g)].map((m) => m[1])
  assert.equal(lines.length, 4)
  for (const x of lines) assert.ok(x.includes('{p}') && x.includes('{y}'), x)
  assert.ok(!/calcFlat: '(Gold for hotels|ทองสำหรับโรงแรม|酒店金卡|ဟိုတယ်အတွက် ရွှေ)'/.test(src))
  assert.match(src, /hotelPrice: 'With hotel booking: ฿\{p\} a month or ฿\{y\} a year'/)
})

test('the trial note names Gold, and for a page with rooms the hotel booking line', async () => {
  const sent = []
  const real = globalThis.fetch
  globalThis.fetch = async (u, init) => { sent.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }) }
  const e = { DB: d1(), RESEND_KEY: 'k' }
  const day = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), now = new Date().toISOString()
  const add = (id, d) => e.DB.raw.prepare("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until, trial, notify_email, notify_ok) VALUES (?,?,?,'live','shop','poster','th',?,?,?,'gold',?,1,'a@b.co',1)").run(id, id, 'h' + id, JSON.stringify(d), now, now, day)
  add('shop1', { name: 'Shop' })
  add('hotel1', { name: 'Hotel', rooms: [{ n: 'Room', p: '900' }] })
  try { assert.equal(await trialNotes(e, 'https://sites.motdang.net', gold.PLANS({})), 2) } finally { globalThis.fetch = real }
  const by = (n) => sent.find((m) => m.subject.startsWith(n))
  assert.match(by('Shop').text, /Gold is ฿3,000 a year — /)
  assert.ok(!/hotel/i.test(by('Shop').text))
  assert.match(by('Hotel').text, /Gold is ฿3,000 a year; with hotel booking ฿555 a month or ฿5,550 a year/)
  assert.match(by('Hotel').html, /พร้อมรับจองห้องพัก เดือนละ ฿555 หรือปีละ ฿5,550/)
})
