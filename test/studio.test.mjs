import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeOver, STYLES, fit } from '../public/s/studio.mjs'
import { Z } from '../public/s/make-words-more.mjs'

/** A made-up photo: sky, a hill, a sun, a doorway; enough for every style to find edges, flats and lights. */
function photo(w, h) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h, sun = Math.hypot(u - 0.7, v - 0.25) < 0.12, hill = v > 0.55 + 0.1 * Math.sin(u * 7), door = u > 0.3 && u < 0.4 && v > 0.6
    const c = sun ? [250, 220, 120] : door ? [60, 40, 30] : hill ? [70 + 60 * u, 130, 70] : [110 + 90 * v, 160 + 60 * v, 220]
    data.set([...c, 255], (y * w + x) * 4)
  }
  return { width: w, height: h, data }
}
const same = (a, b) => a.data.length === b.data.length && a.data.every((v, i) => v === b.data[i])

/** One colour all over: nothing to find an edge or a second colour in. */
const solid = (w, h, c) => { const data = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) data.set([...c, 255], i * 4); return { width: w, height: h, data } }

test('every style, on odd shapes and on one colour, gives an opaque picture the size it was given', () => {
  for (const [w, h, src] of [[1, 1], [3, 2], [7, 40], [40, 7], [64, 48], [101, 77]].map(([w, h]) => [w, h, photo(w, h)]).concat([[48, 36, solid(48, 36, [0, 0, 0])], [48, 36, solid(48, 36, [255, 255, 255])], [48, 36, solid(48, 36, [120, 130, 140])]])) {
    for (const s of STYLES) {
      const out = makeOver(src, s, { accent: '#2563eb' })
      assert.equal(out.width, w, `${s} ${w}×${h}`); assert.equal(out.height, h)
      assert.equal(out.data.length, w * h * 4)
      for (let i = 3; i < out.data.length; i += 4) assert.equal(out.data[i], 255, `${s} ${w}×${h} opaque`)
    }
  }
})

test('the same photo and seed give the same picture; another seed another', () => {
  const src = photo(120, 90)
  for (const s of STYLES) assert.ok(same(makeOver(src, s), makeOver(src, s)), s)
  assert.ok(!same(makeOver(src, 'doodle', { seed: 1 }), makeOver(src, 'doodle', { seed: 2 })))
})

test('a border is drawn by gold, mural, watercolour and the sun print, and by no other; frame: false leaves it off', () => {
  const src = photo(200, 150), framed = new Set(['gold', 'mural', 'wash', 'cyan'])
  for (const s of STYLES) assert.equal(!same(makeOver(src, s), makeOver(src, s, { frame: false })), framed.has(s), s)
})

test('the accent colour takes the riso pink, and a blue one gives way to it', () => {
  const src = photo(160, 120), plain = makeOver(src, 'riso')
  assert.ok(same(plain, makeOver(src, 'riso', { accent: '#2563eb' })))
  assert.ok(!same(plain, makeOver(src, 'riso', { accent: '#e07000' })))
})

test('the fix lifts a dark photo and leaves a bright one about where it is', () => {
  const mean = (p) => { let t = 0; for (let i = 0; i < p.data.length; i += 4) t += p.data[i] + p.data[i + 1] + p.data[i + 2]; return t / (p.width * p.height * 3) }
  const dark = photo(120, 90); for (let i = 0; i < dark.data.length; i += 4) { dark.data[i] *= 0.3; dark.data[i + 1] *= 0.3; dark.data[i + 2] *= 0.3 }
  assert.ok(mean(makeOver(dark, 'fix')) > mean(dark) * 1.5)
  const bright = photo(120, 90)
  assert.ok(Math.abs(mean(makeOver(bright, 'fix')) - mean(bright)) < 40)
})

test('fit keeps the shape', () => {
  assert.deepEqual(fit(4000, 3000, 1600), [1600, 1200])
  assert.deepEqual(fit(300, 200, 1600), [300, 200])
  assert.deepEqual(fit(3, 1000, 100), [1, 100])
})

// the front page no longer shows the picture studio (Nan 2026-10-26: photos as taken); the builder keeps it
test('every style has its name in the builder in all four languages', () => {
  for (const lang of ['th', 'en', 'my', 'zh']) for (const s of STYLES) assert.ok(Z[lang]['st_' + s], `st_${s} in ${lang}`)
})
