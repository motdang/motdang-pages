// The front page: four languages with the same words, and every place home.js writes to is in home.html.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { W } from '../public/s/home-words.mjs'

const at = (f) => readFileSync(new URL('../public/s/' + f, import.meta.url), 'utf8')

test('the front page has the same words in Thai, English, Burmese and Chinese', () => {
  const shape = (v) => (Array.isArray(v) ? v.map(shape) : typeof v)
  for (const l of ['th', 'my', 'zh']) {
    assert.deepEqual(Object.keys(W[l]).sort(), Object.keys(W.en).sort(), l)
    for (const k of Object.keys(W.en)) assert.deepEqual(shape(W[l][k]), shape(W.en[k]), `${l}.${k}`)
  }
})

test('each kind of page has three lines, and at least one of them is free', () => {
  for (const l of Object.keys(W)) for (const g of ['local', 'store', 'online', 'portfolio']) {
    assert.equal(W[l]['l_' + g].length, 3, `${l} ${g}`)
    assert.ok(W[l]['l_' + g].some((t) => !t.startsWith('★ ')), `${l} ${g}`)
    assert.ok(W[l]['k_' + g] && W[l]['h_' + g], `${l} ${g}`)
  }
})

test('there are no looks to pick: no line about styles, looks or a look count', () => {
  const words = JSON.stringify(W.en)
  assert.ok(!/\b(styles?|looks?)\b/i.test(words), words.match(/\b(styles?|looks?)\b/i)?.[0])
  const js = at('home.js'), html = at('home.html')
  assert.ok(!/LOOK_IDS|lookOf|toys\(|lanterns\(/.test(js))
  assert.ok(!/id="(toys|looks|steps|s3|lanterns)"/.test(html))
})

test('home.js writes only to places home.html has', () => {
  const js = at('home.js'), html = at('home.html')
  const ids = new Set([...js.matchAll(/\$\('#([a-zA-Z0-9]+)'\)/g)].map((m) => m[1]))
  assert.ok(ids.size >= 15)
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), id)
  // the words it asks for are in the words
  for (const m of html.matchAll(/data-w="([a-zA-Z0-9_]+)"/g)) assert.ok(m[1] in W.en, m[1])
})

test('the Gold list names what Gold sells, and the reason to buy has a price in it', () => {
  assert.match(W.en.why, /\{y\}/)
  assert.match(W.en.why, /\{m\}/)
  assert.ok(W.en.goldG.length >= 4)
  assert.ok(W.en.goldG.flatMap(([, items]) => items).length >= 15)
})
