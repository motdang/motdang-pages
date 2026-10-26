import test from 'node:test'
import assert from 'node:assert/strict'
import { isTech, lumaRow, motdangRow, calLinks, asData } from '../src/events.mjs'

test('tech words', () => {
  assert.ok(isTech('Grok Bot Meetup Chiang Mai'))
  assert.ok(isTech('Build your own AI agent - AWS x SATI'))
  assert.ok(!isTech('Women as Social Change Agents'))
  assert.ok(!isTech('Addiction & recovery support for digital nomads'))
  assert.ok(!isTech('Thai cooking class'))
})

const entry = {
  event: { api_id: 'evt-1', name: 'Grok Bot Meetup Chiang Mai', start_at: '2026-10-31T04:00:00.000Z', end_at: '2026-10-31T10:00:00.000Z', url: 'x77eafle',
    geo_address_info: { mode: 'obfuscated', sublocality: 'Old City', region: 'Chang Wat Chiang Mai' } },
  ticket_info: { is_free: true, require_approval: true, spots_remaining: 39 },
  calendar: { name: "Nomad's Ark", description_short: 'SpaceXAI events in Chiang Mai' },
  hosts: [{ name: 'Tibor Sekelj' }],
}

test('a Luma entry', () => {
  const r = lumaRow(entry, 'luma:cm')
  assert.equal(r.id, 'luma-evt-1')
  assert.equal(r.url, 'https://luma.com/x77eafle')
  assert.equal(r.cost, 'Free')
  assert.equal(r.area, 'Old City')
  assert.equal(r.venue, '')
  assert.equal(r.kinds, 'tech')
  assert.equal(r.approval, 1)
  const paid = lumaRow({ ...entry, ticket_info: { is_free: false, price: { cents: 25000, currency: 'thb' } } }, 'luma:cm')
  assert.equal(paid.cost, '฿250')
  assert.equal(lumaRow({ ...entry, event: { ...entry.event, geo_address_info: { region: 'Bangkok' } } }, 'x'), null)
})

test('a motdang.net row', () => {
  const r = motdangRow({ uid: 'u1', title: 'Python night', start: '2026-11-02 19:00:00', end: '2026-11-02 21:00:00', place: { href: 'cm/p/x.html', name: 'X', lat: 18.8, lng: 98.9 } })
  assert.equal(r.start, '2026-11-02T12:00:00.000Z')
  assert.equal(r.kinds, 'tech')
  assert.equal(r.place_href, 'cm/p/x.html')
})

test('calendar links on a page', () => {
  const l = calLinks({ links: [{ u: 'https://luma.com/nomadsark' }, { u: 'https://www.meetup.com/AI-Chiang-Mai/events/' }, { u: 'https://meetup.com/find/' }, { u: 'https://example.com' }] })
  assert.deepEqual(l, [{ kind: 'luma', key: 'nomadsark' }, { kind: 'meetup', key: 'ai-chiang-mai' }])
})

test('as data, in Bangkok time', () => {
  const x = asData({ ...lumaRow(entry, 'luma:cm'), place_href: null })
  assert.equal(x.when.time, '11:00–17:00')
  assert.match(x.when.en, /31 Oct/)
  assert.equal(x.ics, 'https://motdang.net/tech/e/luma-evt-1.ics')
})

import { safe, weekStart } from '../src/events.mjs'

test('only http(s) links', () => {
  assert.equal(safe('javascript:alert(1)'), null)
  assert.equal(safe('data:text/html,x'), null)
  assert.equal(safe('https://luma.com/x77eafle'), 'https://luma.com/x77eafle')
})

test('weeks run Monday to Sunday in Bangkok', () => {
  const tue = Date.parse('2026-10-20T10:00:00+07:00')
  assert.equal(new Date(weekStart(tue)).toISOString(), '2026-10-18T17:00:00.000Z') // Mon 19 Oct 00:00 ICT
  assert.equal(new Date(weekStart(tue, 1)).toISOString(), '2026-10-25T17:00:00.000Z')
  const sunLate = Date.parse('2026-10-25T23:30:00+07:00')
  assert.equal(weekStart(sunLate), weekStart(tue))
})

// ---- Gold pages in the general events list (2026-10-22) -------------------------------------
import { siteRows, goldPlaces, card as eventCard, rows as evRows } from '../src/events.mjs'
import { upcoming, utcOf } from '../public/s/extras.mjs'

const soon = (days, hhmm = '18:00') => new Date(Date.now() + days * 864e5 + 7 * 3600e3).toISOString().slice(0, 10) + 'T' + hhmm
const pageD = () => ({ name: 'Baan Ton Pho', place: { addr: '12 Soi 3', lat: 18.79, lng: 98.98 }, hours: { tz: 'Asia/Bangkok' },
  event: { start: soon(5), end: '', tz: 'Asia/Bangkok' },
  cal: Array.from({ length: 9 }, (_, i) => ({ id: 'c' + i, t: 'Class ' + i, note: '', start: soon(1 + i), end: '19:00', rep: '', until: '' })) })

test('a Gold page: its event and 9 calendar entries, mark, card and place', () => {
  const s = { id: 's1', name: 'tonpho', look: 'poster', tier: 'gold', gold_until: '2099-01-01' }
  const places = new Map([['https://sites.motdang.net/tonpho', { href: 'cm/p/ton-pho.html', name: 'ต้นโพธิ์' }]])
  const r = siteRows(s, pageD(), upcoming, utcOf, places)
  assert.equal(r.length, 10)
  assert.ok(r.every((x) => x.gold === 1 && /^https:\/\/sites\.motdang\.net\/card\/tonpho\.jpg\?k=[a-z0-9]+$/.test(x.card)))
  assert.ok(r.every((x) => x.place_href === 'cm/p/ton-pho.html' && x.place_name === 'ต้นโพธิ์' && x.host === 'Baan Ton Pho' && x.host_url === 'https://sites.motdang.net/tonpho'))
})

test('a Free page keeps what it had: 6 calendar entries, no mark, no card, no place', () => {
  const s = { id: 's2', name: 'plain', look: 'poster', tier: 'free', gold_until: null }
  const places = new Map([['https://sites.motdang.net/plain', { href: 'cm/p/x.html', name: 'X' }]])
  const r = siteRows(s, pageD(), upcoming, utcOf, places)
  assert.equal(r.length, 7)
  assert.ok(r.every((x) => x.gold === 0 && x.card === null && x.place_href === null))
  const expired = siteRows({ ...s, tier: 'gold', gold_until: '2020-01-01' }, pageD(), upcoming, utcOf, places)
  assert.ok(expired.every((x) => x.gold === 0))
})

test('motdang.net knows which place a Gold page stands on', async () => {
  const env = { SITE: { fetch: async (u) => { assert.equal(u, 'https://motdang.net/ownpages-gold.json'); return new Response(JSON.stringify({ rows: [
    { u: 'cr/p/hongdam-x.html', th: 'หงส์ดำ', en: 'Hongdam', own: 'https://sites.motdang.net/hongdam-studio' },
    { u: '../etc/passwd', th: 'bad', own: 'https://sites.motdang.net/bad' }, { u: 'cm/p/y.html', th: 'Y', own: 'javascript:1' }] })) } } }
  const m = await goldPlaces(env)
  assert.deepEqual([...m.keys()], ['https://sites.motdang.net/hongdam-studio'])
  assert.equal(m.get('https://sites.motdang.net/hongdam-studio').href, 'cr/p/hongdam-x.html')
  assert.equal((await goldPlaces({ SITE: { fetch: async () => new Response('', { status: 404 }) } })).size, 0)
  assert.equal((await goldPlaces({ SITE: { fetch: async () => { throw new Error('x') } } })).size, 0)
})

test('as data and as a card: a Gold row carries star, card, page and place', () => {
  const base = { id: 'site-s1', title: 'Baan Ton Pho', start: '2026-11-02T11:00:00.000Z', end: null, all_day: 0, url: 'https://sites.motdang.net/tonpho', venue: '12 Soi 3', area: '', lat: null, lng: null,
    cost: '', approval: 0, spots: null, kinds: '', host: 'Baan Ton Pho', host_url: 'https://sites.motdang.net/tonpho', site_id: 's1', place_href: 'cm/p/ton-pho.html', place_name: 'ต้นโพธิ์' }
  const g = asData({ ...base, gold: 1, card: 'https://sites.motdang.net/card/tonpho.jpg?k=abc' })
  assert.equal(g.gold, true); assert.equal(g.card, 'https://sites.motdang.net/card/tonpho.jpg?k=abc'); assert.equal(g.place.url, 'https://motdang.net/cm/p/ton-pho.html')
  const f = asData({ ...base, gold: 0, card: 'https://sites.motdang.net/card/tonpho.jpg?k=abc' })
  assert.equal(f.gold, false); assert.equal(f.card, null)
  const html = eventCard({ ...base, gold: 1, card: 'https://sites.motdang.net/card/tonpho.jpg?k=abc' }, 'en')
  assert.match(html, /class="ev gold"/); assert.match(html, /★/); assert.match(html, /<img src="https:\/\/sites\.motdang\.net\/card\/tonpho\.jpg\?k=abc"/)
  assert.match(html, /href="https:\/\/motdang\.net\/cm\/p\/ton-pho\.html"/)
  const plain = eventCard({ ...base, gold: 0, card: null }, 'en')
  assert.doesNotMatch(plain, /★|<img|class="ev gold"/)
})

test('the list puts a Gold page first at the same minute, and ?gold=1 keeps only Gold', async () => {
  const seen = []
  const env = { DB: { prepare: (q) => ({ bind: (...a) => ({ all: async () => { seen.push([q, a]); return { results: [] } } }) }) } }
  await evRows(env, { kind: 'all' })
  assert.match(seen[0][0], /ORDER BY start, gold DESC/)
  assert.doesNotMatch(seen[0][0], /gold = 1/)
  await evRows(env, { kind: 'all', gold: true })
  assert.match(seen[1][0], /gold = 1/)
})

test('rows a read puts in are not swept out by the same read (their stamp is not older than the sweep)', async () => {
  const { refresh } = await import('../src/events.mjs')
  const { normalize } = await import('../public/s/render.mjs')
  const puts = [], sweeps = []
  const D = { prepare: (q) => {
    const o = { args: [], bind: (...a) => { o.args = a; return o }, run: async () => { if (/^DELETE FROM ev WHERE feed/.test(q)) sweeps.push(o.args); return {} }, _put: () => { if (/^INSERT INTO ev /.test(q)) puts.push(o.args) },
      all: async () => ({ results: /FROM site/.test(q) ? Array.from({ length: 40 }, (_, i) => ({ id: 's' + i, name: 'p' + i, look: 'poster', tier: i % 2 ? 'gold' : 'free', gold_until: '2099-01-01',
        d: JSON.stringify({ name: 'P' + i, cal: [{ id: 'aaaa', t: 'Class', start: soon(2), end: '19:00' }] }) })) : [] }), first: async () => null }
    return o
  }, batch: async (l) => l.forEach((o) => o._put()) }
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('{}', { status: 500 })
  try { await refresh({ DB: D }, { normalize, upcoming, utcOf }) } finally { globalThis.fetch = realFetch }
  const sweep = sweeps.find((a) => a[0] === 'sites')
  assert.ok(sweep && puts.length >= 40)
  const SEEN = 21 // the seen column's place among the insert's arguments
  assert.ok(puts.every((a) => a[SEEN] >= sweep[1]), 'a row stamped before the sweep would be deleted by it')
})
