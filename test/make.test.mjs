import test from 'node:test'
import assert from 'node:assert/strict'

// make.js touches the DOM at import; the address helpers are copied out by text.
const src = (await import('node:fs')).readFileSync(new URL('../public/s/make.js', import.meta.url), 'utf8')
const start = src.indexOf('const TH_INIT'), end = src.indexOf('// ---- server')
const mod = await import('data:text/javascript,' + encodeURIComponent(src.slice(start, end)))

test('Thai names suggest a readable address', () => {
  assert.equal(mod.romanizeThai('ข้าวซอย'), 'khaosoi')
  assert.equal(mod.romanizeThai('แม่สาย'), 'maesai')
  assert.equal(mod.slugify('ข้าวซอยแม่สาย'), 'khaosoimaesai')
  assert.equal(mod.slugify('Café Ñoño 2!'), 'cafe-nono-2')
  assert.match(mod.slugify('中文', 'shop'), /^shop-\d{4}$/)
})
