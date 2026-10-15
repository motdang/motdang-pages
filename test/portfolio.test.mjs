import test from 'node:test'
import assert from 'node:assert/strict'
import { render, normalize, KINDS } from '../public/s/render.mjs'
import { makeOver, STYLES, fit } from '../public/s/studio.mjs'
import { initials } from '../public/s/mark.mjs'

const P = 'abcdefghijkl0001', Q = 'abcdefghijkl0002'
const base = { name: 'lamyai-studio', look: 'clean', lang: 'en', kind: 'work', views: 1, status: 'live', tier: 'gold' }
const d = {
  name: 'Lamyai Studio', avatar: P, photos: [P, Q],
  works: [{ id: 'w1abc', t: 'Market signs', client: 'Kad Luang', year: '2026', tags: 'Signs, Maps,  signs ', photos: [Q], u: 'https://example.com/x' },
    { t: '' }, { id: 'w2abc', t: 'Coffee labels', tags: 'Packaging' }],
  quotes: [{ q: 'They drew our market.', who: 'Khun Malee' }, { q: '' }],
}

test('a portfolio keeps its work, tags and quotes, and drops empty rows', () => {
  assert.ok(KINDS.includes('work'))
  const n = normalize(d)
  assert.equal(n.works.length, 2)
  assert.equal(n.works[0].tags, 'Signs, Maps')
  assert.equal(n.quotes.length, 1)
  assert.equal(n.avatar, P)
  assert.equal(normalize({ works: [{ t: 'x', u: 'javascript:alert(1)' }] }).works[0].u, '')
})

test('the page shows the avatar, the work grid with its filter, and the quotes', () => {
  const html = render({ ...base, d })
  assert.match(html, /class="av round"/)
  assert.match(html, /id="works"/)
  assert.match(html, /data-tag="Maps"/)
  assert.match(html, /href="\/lamyai-studio\/w\/w1abc"/)
  assert.match(html, /They drew our market\./)
  assert.match(html, new RegExp(`rel="icon" href="/img/${P}-s.webp"`))
})

test('a work has its own page with its facts, link and the other work', () => {
  const html = render({ ...base, d }, { work: 'w1abc' })
  assert.match(html, /<title>Market signs · Lamyai Studio<\/title>/)
  assert.match(html, /Kad Luang/)
  assert.match(html, /href="https:\/\/example.com\/x"/)
  assert.match(html, /Coffee labels/)
  assert.ok(!/class="av /.test(html))
})

test('a free page shows six projects', () => {
  const many = { works: Array.from({ length: 9 }, (_, i) => ({ id: 'w' + i + 'xyz', t: 'Work ' + i })) }
  const html = render({ ...base, tier: 'free', look: 'clean', d: many })
  assert.equal((html.match(/class="wcard"/g) || []).length, 6)
})

test('every studio style returns a picture the size it was given', () => {
  const w = 48, h = 32, data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0; data.set([x * 5, y * 7, ((x + y) * 3) % 255, 255], i * 4) }
  for (const s of STYLES) {
    const out = makeOver({ width: w, height: h, data }, s, { accent: '#2563eb' })
    assert.equal(out.width, w); assert.equal(out.height, h); assert.equal(out.data.length, w * h * 4)
    assert.ok(out.data.some((v, i) => i % 4 !== 3 && v > 0 && v < 255), s)
  }
  assert.deepEqual(fit(4000, 3000, 1600), [1600, 1200])
})

test('initials come from the name', () => {
  assert.equal(initials('Lamyai Design Studio'), 'LD')
  assert.equal(initials('หงส์ดำ'), 'ห')
  assert.equal(initials(''), '')
})
