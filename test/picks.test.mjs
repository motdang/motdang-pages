import test from 'node:test'
import assert from 'node:assert/strict'
import { render, normalize } from '../public/s/render.mjs'
import { pickPhotos, pickName, PK_MAX } from '../public/s/picks.mjs'
import { texts } from '../src/tr.mjs'

const PH = (n) => 'sw' + String(n).padStart(14, '0')
const book = {
  t: 'Fabrics',
  groups: [
    { id: 'wool', t: 'Wool suiting', p: '6500', note: 'Suits and trousers', items: [{ c: 'SQ-001', ph: PH(1) }, { c: 'SQ-002', ph: PH(2) }, { c: '', ph: PH(3) }, { c: 'bad', ph: 'nope' }] },
    { t: 'Cotton shirting', items: [{ c: 'CC-001', ph: PH(4), n: 'Lilac check' }] },
    { t: '', items: [] },
  ],
}
const site = (tier, d = {}) => ({ name: 'fk', kind: 'service', lang: 'en', status: 'live', tier, d: { name: 'Fashion King', picks: book, svc: [{ id: 'fit1', n: 'Fitting', mins: 45 }], contact: { line: '@fashionking' }, place: { cc: 'TH' }, ...d } })

test('the swatch book keeps groups with photos, drops photos that are not ids', () => {
  const pk = normalize({ picks: book }).picks
  assert.equal(pk.t, 'Fabrics')
  assert.equal(pk.groups.length, 2)
  assert.deepEqual(pk.groups[0].items.map((x) => x.c), ['SQ-001', 'SQ-002', ''])
  assert.equal(pk.groups[1].id.length >= 4, true)
  assert.deepEqual(pickPhotos(pk), [PH(1), PH(2), PH(3), PH(4)])
  assert.equal(pickName(pk.groups[0], pk.groups[0].items[2], 2), 'Wool suiting 3')
})

test('the swatch book has a ceiling', () => {
  const many = { groups: Array.from({ length: 20 }, (_, g) => ({ t: 'G' + g, items: Array.from({ length: 100 }, (_, i) => ({ c: `${g}-${i}`, ph: PH(g * 100 + i) })) })) }
  const pk = normalize({ picks: many }).picks
  assert.equal(pk.groups.length, PK_MAX.groups)
  assert.ok(pk.groups.every((g) => g.items.length <= PK_MAX.items))
  assert.equal(pickPhotos(pk).length, PK_MAX.total)
})

test('a Gold page shows the swatch book with its tray; a free page does not', () => {
  const h = render(site('gold'))
  assert.match(h, /id="picks"[^>]*data-title="Fabrics"/)
  assert.match(h, /data-sw="SQ-001"/)
  assert.match(h, /data-sw="Wool suiting 3"/)
  assert.match(h, /from ฿6500/)
  assert.match(h, /id="pk-tray" hidden/)
  assert.match(h, /data-t="pkbook" href="#book"/)
  assert.match(h, /data-t="pkline"[^>]*data-oa="@fashionking"/)
  assert.match(h, /data-t="pkask" href="#message"/)
  assert.match(h, /<a href="#pick-wool"/)
  assert.ok(h.indexOf('id="picks"') < h.indexOf('id="book"'), 'the swatches come before the booking')
  const f = render(site('free'))
  assert.doesNotMatch(f, /id="picks"/)
  assert.doesNotMatch(f, /\.pk-grid\{/)
})

test('without a form or LINE the tray offers only what the page has', () => {
  const h = render(site('gold', { msg: false, contact: {}, svc: [] }))
  assert.match(h, /id="picks"/)
  assert.doesNotMatch(h, /data-t="pkbook"/)
  assert.doesNotMatch(h, /data-t="pkline"/)
  assert.doesNotMatch(h, /data-t="pkask"/)
})

test('the swatch book words go to the translator; codes stay', () => {
  const t = Object.fromEntries(texts(normalize({ picks: book })))
  assert.equal(t['picks.t'], 'Fabrics')
  assert.equal(t['picks.groups.0.t'], 'Wool suiting')
  assert.equal(t['picks.groups.0.note'], 'Suits and trousers')
  assert.equal(t['picks.groups.1.items.0.n'], 'Lilac check')
  assert.ok(!Object.values(t).includes('SQ-001'))
})
