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
