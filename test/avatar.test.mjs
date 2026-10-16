import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { AV_PARTS, AV_TABS, AV_PRESETS, AV_DEFAULT, avatarSvg, avatarTile, randomAvatar, normalizeAvatar, partShown, mix, sym, mirror } from '../public/s/avatar.mjs'
import { A } from '../public/s/make-words-avatar.mjs'
import { ui } from '../public/s/make-words.mjs'

const LANGS = ['th', 'en', 'my', 'zh']
const KINDS = ['shop', 'food', 'service', 'work', 'stay', 'homes', 'me', 'event', 'group']
const file = (n) => readFileSync(new URL('../public/s/' + n, import.meta.url), 'utf8')

/** An SVG string that a browser will draw: nothing undefined, every id once, every reference found. */
function sound(svg, what) {
  assert.match(svg, /^<svg [^>]*viewBox="[\d. -]+"/, what)
  assert.ok(!/undefined|NaN|\[object/.test(svg), what + ' has undefined or NaN')
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
  assert.equal(new Set(ids).size, ids.length, what + ' repeats an id')
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(m[1]), `${what} points at ${m[1]}`)
  assert.equal((svg.match(/<g[ >]/g) || []).length, (svg.match(/<\/g>/g) || []).length, what + ' has unbalanced groups')
}

test('every part, option and tab has its words in four languages', () => {
  const inTabs = AV_TABS.flatMap((t) => t.parts)
  assert.deepEqual([...inTabs].sort(), Object.keys(AV_PARTS).sort(), 'each part sits in exactly one tab')
  for (const t of AV_TABS) for (const l of LANGS) assert.ok(t.label[l]?.trim(), `tab ${t.id} ${l}`)
  for (const [id, p] of Object.entries(AV_PARTS)) {
    for (const l of LANGS) assert.ok(p.label[l]?.trim(), `part ${id} ${l}`)
    assert.equal(new Set(p.options.map((x) => x.id)).size, p.options.length, `${id} repeats an option`)
    for (const x of p.options) for (const l of LANGS) assert.ok(x.label[l]?.trim(), `${id}.${x.id} ${l}`)
    if (p.type === 'swatch') for (const x of p.options) assert.match(x.c, /^#[0-9a-f]{6}$/i, `${id}.${x.id} colour`)
  }
})

test('the parts the brief asks for are all there, with the counts it asks for', () => {
  const n = (k) => AV_PARTS[k].options.length
  assert.ok(n('skin') >= 8 && n('face') === 3 && n('hair') >= 16 && n('hairc') >= 8 && n('brows') >= 4 && n('eyes') >= 6 && n('mouth') >= 6)
  assert.deepEqual(AV_PARTS.cheeks.options.map((x) => x.id).sort(), ['off', 'on'])
  for (const g of ['none', 'round', 'square', 'sun']) assert.ok(AV_PARTS.glasses.options.some((x) => x.id === g), 'glasses ' + g)
  for (const b of ['none', 'moustache', 'beard', 'stubble']) assert.ok(AV_PARTS.beard.options.some((x) => x.id === b), 'beard ' + b)
  for (const h of ['none', 'cap', 'bucket', 'chef', 'ngob', 'beanie', 'headphones']) assert.ok(AV_PARTS.hat.options.some((x) => x.id === h), 'hat ' + h)
  for (const h of ['short', 'sidepart', 'buzz', 'bald', 'bob', 'long', 'wavy', 'ponytail', 'bun', 'lowbun', 'braid', 'curly', 'afro', 'undercut', 'hijab']) assert.ok(AV_PARTS.hair.options.some((x) => x.id === h), 'hair ' + h)
  for (const o of ['tee', 'collar', 'chef', 'apron', 'hoodie', 'blouse', 'akha', 'morhom', 'suit', 'sports']) assert.ok(AV_PARTS.outfit.options.some((x) => x.id === o), 'outfit ' + o)
  assert.ok(n('outfit') >= 10 && n('bg') >= 5 && AV_PARTS.frame.options.length >= 2)
  assert.ok(AV_PARTS.flower.options.length > 1 && AV_PARTS.ears.options.length > 1)
})

test('the sheet’s words are in four languages and ui() finds them', () => {
  const en = Object.keys(A.en).sort()
  for (const l of ['th', 'my', 'zh']) assert.deepEqual(Object.keys(A[l]).sort(), en, l)
  for (const l of LANGS) for (const [k, v] of Object.entries(A[l])) assert.ok(v.trim(), `${l}.${k}`)
  for (const l of LANGS) { assert.equal(ui(l, 'av_lang'), l); assert.equal(ui(l, 'av_title'), A[l].av_title); assert.notEqual(ui(l, 'av_use'), 'av_use') }
  assert.notEqual(A.th.av_use, A.en.av_use)
})

test('every option of every part draws, on three different characters', () => {
  const bases = [AV_DEFAULT, { ...AV_DEFAULT, skin: 's9', face: 'square', hair: 'long', hairc: 'white', outfit: 'akha', hat: 'ngob' }, { ...AV_DEFAULT, skin: 's1', face: 'round', hair: 'hijab', glasses: 'cat', beard: 'beard' }]
  for (const [id, p] of Object.entries(AV_PARTS)) for (const x of p.options) for (const b of bases) {
    sound(avatarSvg({ ...b, [p.key]: x.id }, 64), `${id}.${x.id}`)
    if (p.type === 'tile') sound(avatarTile(b, id, x.id, 64), `tile ${id}.${x.id}`)
  }
})

test('two avatars on one page never share an id, so inline drawings do not borrow each other’s clips', () => {
  const a = avatarSvg({ ...AV_DEFAULT, hair: 'curly', hat: 'cap' }, 80), b = avatarSvg({ ...AV_DEFAULT, hair: 'afro', hat: 'bucket' }, 80)
  const ids = (s) => [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
  assert.ok(ids(a).every((i) => !ids(b).includes(i)))
  assert.equal(avatarSvg(AV_DEFAULT, 80), avatarSvg({ ...AV_DEFAULT }, 80), 'the same options draw the same text')
})

test('presets: four to six characters for each of the nine kinds, each a whole valid avatar', () => {
  assert.deepEqual(Object.keys(AV_PRESETS).sort(), [...KINDS].sort())
  for (const k of KINDS) {
    const list = AV_PRESETS[k]
    assert.ok(list.length >= 4 && list.length <= 6, k)
    assert.equal(new Set(list.map((p) => p.id)).size, list.length, k + ' repeats an id')
    for (const p of list) {
      for (const l of LANGS) assert.ok(p.label[l]?.trim(), `${k}.${p.id} ${l}`)
      assert.deepEqual(p.o, normalizeAvatar(p.o), `${k}.${p.id} is whole`)
      sound(avatarSvg(p.o, 64), `${k}.${p.id}`)
    }
  }
})

test('random: the same seed gives the same person; a hijab keeps to hats that sit over it; no clashes', () => {
  assert.deepEqual(randomAvatar('abc', 'food'), randomAvatar('abc', 'food'))
  assert.notDeepEqual(randomAvatar('abc', 'food'), randomAvatar('abd', 'food'))
  const seen = new Set()
  for (let i = 0; i < 400; i++) {
    const o = randomAvatar('t' + i, KINDS[i % 9])
    assert.deepEqual(o, normalizeAvatar(o))
    sound(avatarSvg(o, 48), 'random ' + i)
    seen.add(o.hair)
    if (o.hair === 'hijab') assert.ok(['none', 'chef', 'ngob'].includes(o.hat), 'hijab with ' + o.hat)
    if (o.hair === 'scarf') assert.equal(o.hat, 'none')
    if (o.beard !== 'none') assert.ok(['buzz', 'short', 'sidepart', 'quiff', 'balding', 'undercut', 'topknot', 'curly', 'afro', 'bald'].includes(o.hair), `beard with ${o.hair}`)
    if (o.hat !== 'none' && o.hat !== 'headphones') assert.equal(o.flower, 'none')
  }
  assert.ok(seen.size > 14, 'random reaches most hair styles')
})

test('normalizeAvatar: unknown choices become the default, colours may be #rrggbb', () => {
  const o = normalizeAvatar({ skin: 'nope', hair: 'bob', bgc: '#12ab9c', hatc: '#zzzzzz', outfit: 7 })
  assert.equal(o.skin, AV_DEFAULT.skin)
  assert.equal(o.hair, 'bob')
  assert.equal(o.bgc, '#12ab9c')
  assert.equal(o.hatc, AV_DEFAULT.hatc)
  assert.equal(o.outfit, AV_DEFAULT.outfit)
  assert.deepEqual(Object.keys(normalizeAvatar()).sort(), Object.keys(AV_DEFAULT).sort())
  sound(avatarSvg({ bgc: '#12ab9c' }, 50), 'hex background')
  assert.equal(partShown('scarfc', { hair: 'hijab' }), true)
  assert.equal(partShown('scarfc', { hair: 'bob' }), false)
  assert.equal(partShown('hatc', { hat: 'none' }), false)
})

test('path tools: a half becomes a whole, mirror flips about the centre line', () => {
  assert.equal(mirror('M10 20L30 40'), 'M190 20L170 40')
  assert.equal(sym('M100 10L120 50L100 90'), 'M100 10L120 50L100 90L80 50L100 10Z')
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080')
})

test('the avatar files carry no emoji and no stray markers', () => {
  for (const n of ['avatar.mjs', 'avatar-ui.mjs', 'avatar.css', 'make-words-avatar.mjs']) {
    const t = file(n)
    assert.ok(!/\p{Extended_Pictographic}/u.test(t), n + ' has an emoji')
    assert.ok(!/@@[A-Z]+/.test(t), n + ' has a build marker left')
  }
})
