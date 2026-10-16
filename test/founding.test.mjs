import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LADDER, START, SEATS, CODES, nextPrice, openingSeats, nextMonth, pageName } from '../src/founding.mjs'
import { GOLD_THB } from '../src/gold.mjs'

test('the ladder starts at ฿3,000 and its top stays under the Gold years it buys', () => {
  assert.ok(LADDER.includes(START))
  assert.ok(LADDER.at(-1) < CODES * GOLD_THB)
  assert.deepEqual([...LADDER].sort((a, b) => a - b), LADDER)
})

test('Shoup steps on seats taken: 80% up, under 60% down, ends hold', () => {
  assert.equal(nextPrice(3000, 24, 30), 4000)
  assert.equal(nextPrice(3000, 23, 30), 3000)
  assert.equal(nextPrice(3000, 18, 30), 3000)
  assert.equal(nextPrice(3000, 17, 30), 2500)
  assert.equal(nextPrice(2000, 0, 30), 2000)
  assert.equal(nextPrice(5000, 30, 30), 5000)
})

test('the opening month has seats for the days left', () => {
  assert.equal(openingSeats(Date.parse('2026-10-01T00:00:00+07:00')), SEATS)
  assert.equal(openingSeats(Date.parse('2026-10-16T12:00:00+07:00')), 15)
  assert.equal(openingSeats(Date.parse('2026-10-31T23:00:00+07:00')), 1)
})

test('months roll over the year', () => {
  assert.equal(nextMonth('2026-10'), '2026-11')
  assert.equal(nextMonth('2026-12'), '2027-01')
})

test('a page name from what people type', () => {
  assert.equal(pageName('https://sites.motdang.net/noi-som/'), 'noi-som')
  assert.equal(pageName('sites.motdang.net/noi-som?hl=en'), 'noi-som')
  assert.equal(pageName('  Noi-Som '), 'noi-som')
  assert.equal(pageName('/x'), '')
  assert.equal(pageName(''), '')
})
