import test from 'node:test'
import assert from 'node:assert/strict'
import { serveCard, cardOf } from '../src/ogcard.mjs'
import { render } from '../public/s/render.mjs'

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])
const site = (over = {}) => ({ id: 'site1', name: 'tonpho', kind: 'amulet', look: 'lanna', lang: 'th', tier: 'gold', gold_until: '2099-01-01', status: 'live', sian: 0,
  d: JSON.stringify({ name: 'ต้นโพธิ์', photos: ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb'], card: 'cccccccccccccccc',
    amulets: [{ id: 'som1', t: 'พระสมเด็จ', photos: ['aaaaaaaaaaaaaaaa'] }, { id: 'nopic', t: 'พระรอด', photos: [] }],
    works: [{ id: 'w1', t: 'Mural', photos: ['bbbbbbbbbbbbbbbb'] }] }), ...over })

function env(rows) {
  const r2 = new Map([['p/aaaaaaaaaaaaaaaa', { bytes: JPG, meta: { v: 'ok' } }], ['p/bbbbbbbbbbbbbbbb', { bytes: JPG, meta: { v: 'ok' } }]])
  const obj = (k) => r2.has(k) ? { body: r2.get(k).bytes, customMetadata: r2.get(k).meta, arrayBuffer: async () => r2.get(k).bytes.buffer } : null
  const chain = (w, h) => {
    const c = { transform: () => c, draw: () => c, output: async () => ({ response: () => new Response(JPG) }) }
    return c
  }
  return {
    r2,
    DB: { prepare: (q) => ({ bind: (...a) => ({ first: async () => rows.find((r) => r.name === a[0]) || null }), all: async () => ({ results: rows }) }) },
    MEDIA: { get: async (k) => obj(k), head: async (k) => (r2.has(k) ? {} : null), put: async (k, b) => { r2.set(k, { bytes: b, meta: {} }) }, delete: async (k) => { r2.delete(k) } },
    IMAGES: { info: async () => ({ width: 900, height: 1600 }), input: () => chain() },
  }
}

test('an amulet page has a card of its own, made from its photo, and kept', async () => {
  const e = env([site()])
  const r = await serveCard(e, 'tonpho/a/som1.jpg', 'https://sites.motdang.net')
  assert.equal(r.status, 200)
  assert.equal(r.headers.get('content-type'), 'image/jpeg')
  assert.ok([...e.r2.keys()].some((k) => /^og\/site1\/a-som1-[a-z0-9]+-c\.jpg$/.test(k)))
})

test('a drawn card kept under the current key wins over the fitted photo', async () => {
  const e = env([site()])
  const c = await cardOf(e, 'tonpho/a/som1.jpg')
  e.r2.set(c.base + '.jpg', { bytes: new Uint8Array([0xff, 0xd8, 9]), meta: {} })
  const r = await serveCard(e, 'tonpho/a/som1.jpg', 'https://sites.motdang.net')
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [0xff, 0xd8, 9])
})

test('an item without a photo shows the page card until one is drawn; unknown items and other files are refused', async () => {
  const e = env([site()])
  const r = await serveCard(e, 'tonpho/a/nopic.jpg', 'https://sites.motdang.net')
  assert.equal(r.status, 302)
  assert.match(r.headers.get('location'), /\/img\/cccccccccccccccc\.jpg$/)
  assert.equal((await serveCard(e, 'tonpho/a/nope.jpg', 'https://sites.motdang.net')).status, 404)
  assert.equal((await serveCard(e, 'tonpho/x/som1.jpg', 'https://sites.motdang.net')).status, 404)
  assert.equal((await serveCard(env([site({ status: 'held' })]), 'tonpho.jpg', 'https://sites.motdang.net')).status, 404)
})

test('listings are Gold only', async () => {
  const d = JSON.parse(site().d); d.lists = [{ id: 'condo1', t: 'Condo', photos: ['aaaaaaaaaaaaaaaa'] }]
  const homes = (o) => site({ kind: 'homes', d: JSON.stringify(d), ...o })
  assert.equal((await serveCard(env([homes({ tier: 'free' })]), 'tonpho/l/condo1.jpg', 'https://sites.motdang.net')).status, 404)
  assert.equal((await serveCard(env([homes()]), 'tonpho/l/condo1.jpg', 'https://sites.motdang.net')).status, 200)
})

test('the page names the same card the route serves', async () => {
  const s = site()
  const html = render({ ...s, d: JSON.parse(s.d) }, { amulet: 'som1' })
  const k = /card\/tonpho\/a\/som1\.jpg\?k=([a-z0-9]+)/.exec(html)[1]
  assert.equal((await cardOf(env([s]), 'tonpho/a/som1.jpg')).o.key, k)
})

test('with the card library bound, the card is drawn from the page and the maker\'s choices, and kept', async () => {
  const e = env([site()])
  let spec = null
  e.CARDS = { fetch: async (u, init) => { spec = JSON.parse(init.body); return new Response(new Uint8Array([0xff, 0xd8, 7])) } }
  const d = JSON.parse(site().d); d.og = { layout: 'band', font: 'serif', title: 'Big words', accent: '#123456' }
  e.DB = env([site({ d: JSON.stringify(d) })]).DB
  const r = await serveCard(e, 'tonpho.jpg', 'https://sites.motdang.net')
  assert.equal(r.status, 200)
  assert.equal(spec.layout, 'band'); assert.equal(spec.font, 'serif'); assert.equal(spec.title, 'Big words'); assert.equal(spec.accent, '#123456')
  assert.equal(spec.url, 'sites.motdang.net/tonpho')
  assert.ok([...e.r2.keys()].some((k) => /^og\/site1\/p-[a-z0-9]+\.jpg$/.test(k)))
  const item = await serveCard(e, 'tonpho/a/som1.jpg', 'https://sites.motdang.net')
  assert.equal(item.status, 200)
  assert.equal(spec.title, 'พระสมเด็จ'); assert.equal(spec.sub, 'ต้นโพธิ์'); assert.equal(spec.layout, 'band')
  assert.match(spec.image.url, /\/img\/aaaaaaaaaaaaaaaa\.webp$/)
})

test('the builder\'s preview leaves out a picture that is not the page\'s own', async () => {
  const { preview } = await import('../src/ogcard.mjs')
  const e = env([site()])
  let spec = null
  e.CARDS = { fetch: async (u, init) => { spec = JSON.parse(init.body); return new Response(new Uint8Array([0xff, 0xd8])) } }
  e.DB = { prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }) }) }) }
  const d = JSON.parse(site().d); d.og = { photo: 'zzzzzzzzzzzzzzzz', layout: 'photo' }
  const r = await preview(e, site(), { d }, 'https://sites.motdang.net')
  assert.equal(r.status, 200)
  assert.equal(spec.image, null)
  assert.equal(spec.layout, 'plain')
})
