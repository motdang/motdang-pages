// The four kinds of site (Nan 2026-10-26): every page kind belongs to one, and each kind has one design ("one style per kind").
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GROUPS, GROUP_OF, GROUP_KINDS, DESIGN_OF, designOf, lookOk, lookFor } from '../public/s/kinds.mjs'
import { KINDS, LOOK_IDS, render } from '../public/s/render.mjs'
import { ui } from '../public/s/make-words.mjs'

test('every page kind sits in one of the four kinds of site', () => {
  for (const k of KINDS) assert.ok(GROUPS.includes(GROUP_OF[k]), k)
  assert.deepEqual([...Object.values(GROUP_KINDS).flat()].sort(), [...KINDS].sort())
  for (const g of GROUPS) assert.ok(LOOK_IDS.includes(DESIGN_OF[g]), g)
})

test('a page wears the design of its kind, whatever look it was saved with', () => {
  assert.deepEqual(LOOK_IDS.slice().sort(), Object.values(DESIGN_OF).sort())
  for (const k of KINDS) { assert.equal(lookOk(k, designOf(k)), true, k); assert.equal(lookFor(k), designOf(k), k) }
  assert.equal(lookOk('store', 'local'), false)
  assert.equal(designOf('store'), 'shop')
  assert.equal(designOf('online'), 'biz')
  assert.equal(designOf('work'), 'folio')
  assert.equal(designOf('stay'), 'local')
  for (const tier of ['gold', undefined]) {
    assert.match(render({ name: 'x', kind: 'store', look: 'lanna', lang: 'en', status: 'live', tier, d: { name: 'Shop' } }), /data-look="shop"/)
    assert.match(render({ name: 'x', kind: 'me', look: 'gold', lang: 'en', status: 'live', tier, d: { name: 'Me' } }), /data-look="folio"/)
  }
})

test('the four kinds have their words in four languages', () => {
  for (const lang of ['th', 'en', 'my', 'zh']) for (const g of GROUPS) {
    assert.notEqual(ui(lang, 'g_' + g), 'g_' + g, `g_${g} ${lang}`)
    assert.notEqual(ui(lang, 'hg_' + g), 'hg_' + g, `hg_${g} ${lang}`)
  }
  for (const lang of ['th', 'en', 'my', 'zh']) for (const k of ['store', 'online']) assert.ok(ui(lang, 'k_' + k) && ui(lang, 'k_' + k) !== 'k_' + k)
})
