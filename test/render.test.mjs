import test from 'node:test'
import assert from 'node:assert/strict'
import { render, normalize, openState, zonedToUtc, lineHref, safeUrl, onColor, vcard, ics, sign, LOOK_IDS, grabRide } from '../public/s/render.mjs'

const base = { name: 'khaosoi-mae-sai', look: 'local', lang: 'th', kind: 'food', views: 7, status: 'live' }

test('maker text is escaped everywhere it lands', () => {
  const evil = '<script>alert(1)</script>"><img src=x onerror=alert(2)>'
  const html = render({ ...base, d: { name: evil, tagline: evil, about: evil, items: [{ n: evil, p: evil }], links: [{ t: evil, u: 'https://x.com/"><script>' }],
    contact: { phone: evil, line: evil, email: 'a@b.co', web: 'javascript:alert(1)' }, place: { lat: 18.79, lng: 98.98, addr: evil, cc: 'TH' } } })
  assert.ok(!html.includes('<script>alert'))
  assert.ok(!/<img src=x/.test(html))
  assert.ok(!html.includes('javascript:'))
})

test('every design renders a whole page', () => {
  const KIND_OF = { local: 'food', shop: 'store', biz: 'online', folio: 'work' }
  for (const look of LOOK_IDS) {
    const html = render({ ...base, look, kind: KIND_OF[look], d: { name: 'ข้าวซอย', tagline: 'อร่อย', hours: { on: true, week: Array(7).fill([['09:00', '18:00']]) } } })
    assert.match(html, /^<!doctype html>/)
    assert.match(html, new RegExp(`data-look="${look}"`), look)
    assert.match(html, /<\/html>$/)
  }
})

test('a page saved with a look that was taken out wears its kind\'s design', () => {
  assert.match(render({ ...base, look: 'y1997', d: { name: 'x' } }), /data-look="local"/)
  assert.match(render({ ...base, look: 'riso', kind: 'store', tier: 'gold', d: { name: 'x' } }), /data-look="shop"/)
})

test('normalize drops unknown keys, bad photo ids, bad urls', () => {
  const d = normalize({ evil: 1, photos: ['../x', 'abcdefabcdef12'], links: [{ t: 'a', u: 'ftp://x' }, { t: 'b', u: 'example.com' }], place: { lat: '999', lng: 5 } })
  assert.equal(d.evil, undefined)
  assert.deepEqual(d.photos, ['abcdefabcdef12'])
  assert.deepEqual(d.links.map((l) => l.u), ['https://example.com/'])
  assert.equal(d.place.lat, null)
  assert.equal(safeUrl('http://a.b/c'), 'https://a.b/c')
  assert.equal(safeUrl('https://user:pw@a.b/'), '')
})

test('LINE ids become add-friend links', () => {
  assert.equal(lineHref('@myshop'), 'https://line.me/R/ti/p/%40myshop')
  assert.equal(lineHref('somchai99'), 'https://line.me/R/ti/p/~somchai99')
  assert.equal(lineHref('LINE ID: somchai99'), 'https://line.me/R/ti/p/~somchai99')
  assert.equal(lineHref('https://lin.ee/abc'), 'https://lin.ee/abc')
  assert.equal(lineHref('<x>'), '')
})

test('open now, closed, overnight, in the place own time zone', () => {
  const h = { on: true, always: false, tz: 'Asia/Bangkok', week: [[['09:00', '18:00']], null, null, null, null, [['18:00', '02:00']], null] }
  // Monday 2026-10-12 10:00 Bangkok = 03:00Z
  assert.deepEqual(openState(h, new Date('2026-10-12T03:00:00Z')), { open: true, at: '18:00' })
  // Monday 19:00 Bangkok: shut, opens Saturday 18:00
  const s = openState(h, new Date('2026-10-12T12:00:00Z'))
  assert.equal(s.open, false); assert.equal(s.at, '18:00'); assert.equal(s.dayIx, 5)
  // Sunday 01:00 Bangkok (Saturday night's range runs past midnight)
  assert.deepEqual(openState(h, new Date('2026-10-17T18:00:00Z')), { open: true, at: '02:00' })
  assert.equal(openState({ on: false }), null)
})

test('event wall clock to UTC', () => {
  assert.equal(new Date(zonedToUtc('2026-11-05T19:00', 'Asia/Bangkok')).toISOString(), '2026-11-05T12:00:00.000Z')
  assert.equal(new Date(zonedToUtc('2026-07-04T12:00', 'America/New_York')).toISOString(), '2026-07-04T16:00:00.000Z')
})

test('buttons on coloured fills keep their contrast', () => {
  assert.equal(onColor('#ffb000'), '#000000')
  assert.equal(onColor('#1c1530'), '#ffffff')
  assert.equal(onColor('#ffff00'), '#000000')
})

test('grab shows only where Grab runs; ride link carries the drop-off', () => {
  const th = render({ ...base, d: { name: 'x', place: { lat: 18.79, lng: 98.98, cc: 'TH' } } })
  const fr = render({ ...base, d: { name: 'x', place: { lat: 48.85, lng: 2.35, cc: 'FR' } } })
  assert.match(th, /grab\.onelink\.me/)
  assert.doesNotMatch(fr, /grab\.onelink\.me/)
  assert.match(decodeURIComponent(grabRide(18.79, 98.98, 'ร้าน', 'TH')), /dropOffLatitude=18\.790000/)
})

test('vcard, ics, sign', () => {
  const site = { ...base, d: { name: 'Shop; One', contact: { phone: '081 234 5678' }, event: { start: '2026-11-05T19:00', tz: 'Asia/Bangkok' }, place: { lat: 1, lng: 2, addr: 'a,b' } } }
  assert.ok(vcard(site).includes('FN:Shop\\; One'))
  assert.match(vcard(site), /TEL;TYPE=CELL:0812345678/)
  assert.match(ics(site), /DTSTART:20261105T120000Z/)
  assert.match(sign(site), /class="qr"/)
})

test('accent text keeps 4.5:1 on its card in every look and swatch', async () => {
  const { LOOKS, ACCENTS, contrast } = await import('../public/s/render.mjs')
  for (const [id, L] of Object.entries(LOOKS)) for (const a of [L.accent, ...ACCENTS]) {
    const html = render({ ...base, look: id, d: { name: 'x', accent: a } }, { gold: true })
    const ink = /--acc-ink:(#[0-9a-f]{6})/.exec(html)[1]
    const card = /--card:(#[0-9a-f]{6})/i.exec(L.vars)[1]
    assert.ok(contrast(ink, card) >= 4.5, `${id} ${a}`)
  }
})
