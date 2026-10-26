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

test('a Drive video plays on the page and on a project page; a project card is its share picture', () => {
  const drive = 'https://drive.google.com/file/d/1hsinVGuEZQDoQ3_IE1OJLBpmBZ0vuKGP/view?pli=1'
  const n = normalize({ video: drive, works: [{ id: 'lice', t: 'Lice', video: drive, card: Q, photos: [P] }] })
  assert.deepEqual(n.video, { kind: 'drive', id: '1hsinVGuEZQDoQ3_IE1OJLBpmBZ0vuKGP' })
  assert.equal(n.works[0].card, Q)
  const html = render({ ...base, d: { ...d, video: drive, vposter: P, works: n.works } }, { work: 'lice' })
  assert.match(html, /data-kind="drive" data-id="1hsinVGuEZQDoQ3_IE1OJLBpmBZ0vuKGP"/)
  assert.match(html, new RegExp(`og:image" content="[^"]*/img/${Q}\\.jpg"`))
  const free = render({ ...base, tier: 'free', d: { ...d, works: n.works } }, { work: 'lice' })
  assert.ok(!/class="video"/.test(free))
})

test('a Gold page with somewhere to give shows the give button first; a free page does not', () => {
  const html = render({ ...base, d: { ...d, give: 'https://www.cmirotary.org/donate', contact: { phone: '0812345678' } } })
  // the row of buttons under the name went (2026-10-26); giving sits in the dock beside the main button
  assert.match(html, /<nav class="dock"[^>]*>.*?data-t="give" href="https:\/\/www.cmirotary.org\/donate"/)
  const group = render({ ...base, kind: 'group', d: { ...d, give: 'https://www.cmirotary.org/donate' } })
  assert.match(group, /<a class="btn cta give" data-t="give" href="https:\/\/www.cmirotary.org\/donate"/)
  assert.equal((group.match(/btn[^"]* give"/g) || []).length, 1)
  assert.ok(!/btn give/.test(render({ ...base, tier: 'free', d: { ...d, give: 'https://www.cmirotary.org/donate' } })))
  assert.equal(normalize({ give: 'javascript:alert(1)' }).give, '')
})

test('a group page names its projects, quotes and places as a group, and its list as ways to give', () => {
  const html = render({ ...base, kind: 'group', d: { ...d, give: 'https://www.cmirotary.org/donate', items: [{ n: 'One medal', p: '30' }], spots: [{ n: 'A school', lat: 18.79, lng: 98.97 }] } })
  assert.match(html, />Projects</)
  assert.match(html, />In their words</)
  assert.match(html, />Ways to give</)
  assert.match(html, />Places</)
  assert.ok(!/What clients say/.test(html))
  assert.match(render({ ...base, d }), />What clients say</)
})
