import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fee, split, step, link, readLink, SPLIT_LADDER, HELP_LADDER, HELP_START, termsLines } from '../src/deals.mjs'
import { sha } from '../src/worker.mjs'

test('rent: a month for a year, half for 6–11, a quarter under 6', () => {
  assert.equal(fee({ what: 'rent', use: 'residential', basis: 15000, months: 12 }), 15000)
  assert.equal(fee({ what: 'rent', use: 'residential', basis: 15000, months: 24 }), 15000)
  assert.equal(fee({ what: 'rent', use: 'residential', basis: 15000, months: 6 }), 7500)
  assert.equal(fee({ what: 'rent', use: 'residential', basis: 15000, months: 3 }), 3750)
})

test('commercial and industrial rent: a month per lease year, three at most', () => {
  assert.equal(fee({ what: 'rent', use: 'commercial', basis: 40000, months: 36 }), 120000)
  assert.equal(fee({ what: 'rent', use: 'industrial', basis: 40000, months: 60 }), 120000)
  assert.equal(fee({ what: 'rent', use: 'commercial', basis: 40000, months: 18 }), 40000)
  assert.equal(fee({ what: 'rent', use: 'commercial', basis: 40000, months: 6 }), 20000)
})

test('sale 3%, help at its rate, nothing for nothing', () => {
  assert.equal(fee({ what: 'buy', use: 'residential', basis: 3_500_000 }), 105000)
  assert.equal(fee({ what: 'help', basis: 1200 }), 1200 * HELP_START / 100)
  assert.equal(fee({ what: 'help', basis: 1200, rate: 10 }), 120)
  assert.equal(fee({ what: 'rent', basis: 0 }), 0)
  assert.equal(fee({ what: 'other', basis: 1000 }), 0)
})

test('the lister gets the larger part; the parts add up', () => {
  assert.deepEqual(split(15000, 60), { lister: 9000, motdang: 6000 })
  const s = split(3751, 55)
  assert.equal(s.lister + s.motdang, 3751)
  assert.equal(SPLIT_LADDER[2], 60)
  assert.equal(HELP_LADDER[2], HELP_START)
})

test('Shoup steps: 80% up, under 60% down, ends hold', () => {
  assert.equal(step(SPLIT_LADDER, 60, 0.8), 65)
  assert.equal(step(SPLIT_LADDER, 60, 0.79), 60)
  assert.equal(step(SPLIT_LADDER, 60, 0.59), 55)
  assert.equal(step(SPLIT_LADDER, 70, 2), 70)
  assert.equal(step(HELP_LADDER, 5, 0), 5)
})

test('signed links open their own kind and id only', async () => {
  const env = { SESSION_SECRET: 's' }
  const p = new URL(await link(env, 'https://sites.motdang.net', 'f', 'abcdefghij12', sha)).pathname
  assert.deepEqual(await readLink(env, 'f', p, sha), { id: 'abcdefghij12' })
  assert.equal(await readLink(env, 't', p.replace('/f/', '/t/'), sha), null)
  assert.equal(await readLink({ SESSION_SECRET: 'x' }, 'f', p, sha), null)
})

test('terms name the fee in Thai and English', () => {
  for (const what of ['homes', 'help']) for (const [th, en] of termsLines(what, 15)) { assert.ok(th && en) }
  assert.match(termsLines('help', 15)[0][1], /15%/)
})
