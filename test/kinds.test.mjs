// The four kinds of site (Nan 2026-10-26): every page kind belongs to one, and each kind of site has one design.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GROUPS, GROUP_OF, GROUP_KINDS, DESIGN_OF, designOf, lookOk } from '../public/s/kinds.mjs'
import { KINDS, LOOK_IDS, render } from '../public/s/render.mjs'
import { ui } from '../public/s/make-words.mjs'

test('every page kind sits in one of the four kinds of site, and each kind of site has its own design', () => {
  for (const k of KINDS) assert.ok(GROUPS.includes(GROUP_OF[k]), k)
  assert.deepEqual([...Object.values(GROUP_KINDS).flat()].sort(), [...KINDS].sort())
  assert.deepEqual(Object.values(DESIGN_OF).sort(), [...LOOK_IDS].sort())
})

test('a page wears its kind of site\'s design, whatever look it once picked', () => {
  for (const k of KINDS) {
    assert.equal(lookOk(k, designOf(k)), true)
    for (const tier of ['free', 'gold']) assert.match(render({ name: 'x', kind: k, look: 'lanna', lang: 'en', status: 'live', tier, d: { name: 'X' } }), new RegExp(`data-look="${designOf(k)}"`))
  }
})

test('the four kinds have their words in four languages', () => {
  for (const lang of ['th', 'en', 'my', 'zh']) for (const g of GROUPS) {
    assert.notEqual(ui(lang, 'g_' + g), 'g_' + g, `g_${g} ${lang}`)
    assert.notEqual(ui(lang, 'hg_' + g), 'hg_' + g, `hg_${g} ${lang}`)
  }
})
