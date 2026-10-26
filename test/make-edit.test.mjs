import test from 'node:test'
import assert from 'node:assert/strict'
import { X } from '../public/s/make-words-edit.mjs'
import { K } from '../public/s/make-words-card.mjs'
import { SB } from '../public/s/make-words-store.mjs'

const src = (await import('node:fs')).readFileSync(new URL('../public/s/make.js', import.meta.url), 'utf8')
const grab = (from, to) => { const a = src.indexOf(from); return src.slice(a, src.indexOf(to, a)) }

test('the editor words are in all four languages', () => {
  const en = Object.keys(X.en).sort()
  for (const l of ['th', 'my', 'zh']) assert.deepEqual(Object.keys(X[l]).sort(), en, l)
  for (const l of ['en', 'th', 'my', 'zh']) for (const [k, v] of Object.entries(X[l])) assert.ok(v.trim(), `${l}.${k}`)
})

test('every part of the form sits in one of the six cards', () => {
  const sections = [...grab('const SECTIONS = [', '\n]').matchAll(/\['([a-z]+)', '[a-z]+', 's_/g)].map((m) => m[1])
  const groups = grab('const GROUPS = [', '\n]')
  const inCards = [...groups.matchAll(/'([a-z]+)'/g)].map((m) => m[1])
  assert.ok(sections.length > 15)
  for (const id of sections) assert.ok(inCards.includes(id), id)
  for (const g of ['words', 'pics', 'offer', 'reach', 'where', 'look']) {
    assert.ok(X.en['g_' + g] || g === 'offer', g)
    assert.ok(X.en['gw_' + g], 'why ' + g)
  }
  for (const id of sections) if (!['words', 'look'].includes(id)) assert.ok(X.en['a_' + id] || K.en['a_' + id] || SB.en['a_' + id], 'a_' + id)
})
