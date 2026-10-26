// Photos as taken (Nan 2026-10-26): every picture the front page and the builder show is a file here, with a credit.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { lookup } from '../src/pd.mjs'
import { HOUSE } from '../public/s/kinds/house.mjs'

const at = (p) => new URL('../public/s/' + p, import.meta.url)
const credited = (c) => c && c.title && c.by && c.src && c.license

test('each kind has its picture, small and large, and a credit the page maker can use', async () => {
  const kinds = JSON.parse(readFileSync(at('kinds/kinds.json'), 'utf8'))
  for (const [k, v] of Object.entries(kinds)) {
    assert.ok(existsSync(at(`kinds/${k}.webp`)) && existsSync(at(`kinds/${k}-s.webp`)), k)
    if (!/^k:/.test(v.pd)) continue
    assert.ok(credited(HOUSE[v.pd.slice(2)]), k)
    const c = await lookup(v.pd)
    assert.equal(c.from, 'house')
    assert.equal(c.license, HOUSE[v.pd.slice(2)].license)
  }
  assert.equal(await lookup('k:nothing'), null)
})

test('every example photo on the front page is a file with a credit', () => {
  const js = readFileSync(at('home.js'), 'utf8'), cr = JSON.parse(readFileSync(at('home/photos.json'), 'utf8'))
  const names = [...js.matchAll(/: '(ex-[a-z0-9]+)'/g)].map((m) => m[1])
  assert.ok(names.length >= 10)
  for (const n of [...names, 'hero']) {
    assert.ok(existsSync(at(`home/${n}.webp`)) && existsSync(at(`home/${n}-s.webp`)), n)
    assert.ok(credited(cr[n]), n)
  }
})
