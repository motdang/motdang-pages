// The four kinds of site (Nan 2026-10-26): every page kind belongs to one; a free page wears its kind's looks, Gold any.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GROUPS, GROUP_OF, GROUP_KINDS, FREE_LOOKS, lookOk, lookFor } from '../public/s/kinds.mjs'
import { KINDS, LOOK_IDS, render } from '../public/s/render.mjs'
import { ui } from '../public/s/make-words.mjs'

test('every page kind sits in one of the four kinds of site', () => {
  for (const k of KINDS) assert.ok(GROUPS.includes(GROUP_OF[k]), k)
  assert.deepEqual([...Object.values(GROUP_KINDS).flat()].sort(), [...KINDS].sort())
  for (const looks of Object.values(FREE_LOOKS)) for (const l of looks) assert.ok(LOOK_IDS.includes(l), l)
})

test('a free page wears its own kind\'s looks; Gold wears any', () => {
  for (const k of KINDS) for (const l of LOOK_IDS) assert.equal(lookOk(k, l, true), true)
  assert.equal(lookOk('store', 'lanna', false), false)
  assert.equal(lookOk('stay', 'lanna', false), true)
  assert.equal(lookOk('work', 'gold', false), false)
  assert.equal(lookFor('store', 'lanna', false), 'clean')
  const free = render({ name: 'x', kind: 'store', look: 'lanna', lang: 'en', status: 'live', d: { name: 'Shop' } })
  assert.match(free, /data-look="clean"/)
  const gold = render({ name: 'x', kind: 'store', look: 'lanna', lang: 'en', status: 'live', tier: 'gold', d: { name: 'Shop' } })
  assert.match(gold, /data-look="lanna"/)
})

test('the four kinds have their words in four languages', () => {
  for (const lang of ['th', 'en', 'my', 'zh']) for (const g of GROUPS) {
    assert.notEqual(ui(lang, 'g_' + g), 'g_' + g, `g_${g} ${lang}`)
    assert.notEqual(ui(lang, 'hg_' + g), 'hg_' + g, `hg_${g} ${lang}`)
  }
  for (const lang of ['th', 'en', 'my', 'zh']) for (const k of ['store', 'online']) assert.ok(ui(lang, 'k_' + k) && ui(lang, 'k_' + k) !== 'k_' + k)
})
