import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextRate, LADDER } from '../src/sellers.mjs'

test('share moves one step on the ladder, Shoup thresholds', () => {
  assert.equal(nextRate(20, 48000, 60000), 25) // 80% → up
  assert.equal(nextRate(20, 47999, 60000), 20) // between → same
  assert.equal(nextRate(20, 35999, 60000), 15) // under 60% → down
  assert.equal(nextRate(30, 90000, 60000), 30) // top holds
  assert.equal(nextRate(10, 0, 60000), 10)     // floor holds
  assert.deepEqual(LADDER, [10, 15, 20, 25, 30])
})
