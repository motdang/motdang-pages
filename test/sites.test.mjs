import test from 'node:test'
import assert from 'node:assert/strict'
import { render, normalize, osmHours, videoUrl, sceneOf, SCENES } from '../public/s/render.mjs'
import { clean, check, copyOf } from '../src/msg.mjs'
import { mapPage } from '../src/mappage.mjs'
import { promptPayPayload, verifyPayload } from '../src/promptpay.mjs'
import { isMachine } from '../src/stats.mjs'

const base = { name: 'khaosoi-mae-sai', look: 'poster', lang: 'th', kind: 'food', views: 7, status: 'live' }
const req = (ua, h = {}) => ({ headers: new Map(Object.entries({ 'user-agent': ua, ...h })) })

test('pages live at sites.motdang.net/name, with its own share card', () => {
  const html = render({ ...base, d: { name: 'ข้าวซอย' } })
  assert.match(html, /<link rel="canonical" href="https:\/\/sites\.motdang\.net\/khaosoi-mae-sai">/)
  assert.match(html, /og:image" content="https:\/\/sites\.motdang\.net\/card\/khaosoi-mae-sai\.jpg\?k=[a-z0-9]+"/)
  assert.match(html, /twitter:card" content="summary_large_image"/)
  assert.ok(!html.includes('/~'))
})

test('the drawing carries the page facts, hours in OpenStreetMap shape', () => {
  const d = { name: 'Café Doi', scene: 'cafe', hours: { on: true, tz: 'Asia/Bangkok', week: [[['08:00', '17:00']], null, null, null, null, null, null] } }
  const html = render({ ...base, d })
  assert.match(html, /data-set="cafe"/)
  assert.equal(osmHours(normalize(d).hours), 'Mo 08:00-17:00; Tu off; We off; Th off; Fr off; Sa off; Su off')
  assert.equal(sceneOf('food', normalize({})), SCENES.food[0][0])
  assert.ok(!render({ ...base, d: { name: 'x', drawing: false } }).includes('id="drawn"'))
})

test('Gold looks, video, places and indexing show only for Gold', () => {
  const d = { name: 'x', video: 'https://youtu.be/dQw4w9WgXcQ', spots: [{ n: 'Wat', lat: 18.79, lng: 98.98 }], place: { lat: 18.79, lng: 98.99, cc: 'TH' } }
  const free = render({ ...base, look: 'gold', d })
  assert.match(free, /data-look="poster"/)
  assert.ok(!free.includes('youtube'))
  assert.match(free, /class="spots"/) // up to 3 places on a free page since 2026-10-14
  assert.equal(render({ ...base, d: { ...d, spots: Array.from({ length: 6 }, (_, i) => ({ n: 'P' + i, lat: 18.7 + i / 100, lng: 98.9 })) } }).match(/data-spot=/g).length, 3)
  // free pages go on Google once a reader can reach the maker: a phone, LINE or a pin, and no reports (Nan 2026-10-26)
  assert.match(free, /name="robots" content="index,follow,notranslate"/)
  assert.match(render({ ...base, d: { name: 'x' } }), /name="robots" content="noindex,notranslate"/)
  assert.match(render({ ...base, d: { name: 'x', contact: { line: '@shop' } } }), /content="index,follow,notranslate"/)
  assert.match(render({ ...base, reports: 1, d }), /name="robots" content="noindex,notranslate"/)
  assert.match(render({ ...base, status: 'held', d }), /name="robots" content="noindex,notranslate"/)
  const gold = render({ ...base, look: 'gold', tier: 'gold', d })
  assert.match(gold, /data-look="gold"/)
  assert.match(gold, /data-kind="youtube" data-id="dQw4w9WgXcQ"/)
  assert.match(gold, /class="spots"/)
  assert.match(gold, /content="index,follow,notranslate"/)
})

test('library pictures carry their credit on the page', () => {
  const credits = { abcdefabcdef12: { title: 'Elephant <b>', by: 'Unknown', src: 'https://clevelandart.org/art/1982.10', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' } }
  const html = render({ ...base, d: { name: 'x', photos: ['abcdefabcdef12', 'abcdefabcdef13'], credits } })
  assert.match(html, /Elephant &lt;b&gt;<\/a> — Unknown · <a href="https:\/\/creativecommons.org\/publicdomain\/zero\/1.0\/"/)
  assert.match(html, /<summary>รูปภาพ \(1\)<\/summary>/)
})

test('video addresses: YouTube and Vimeo only', () => {
  assert.deepEqual(videoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3'), { kind: 'youtube', id: 'dQw4w9WgXcQ' })
  assert.deepEqual(videoUrl('vimeo.com/76979871'), { kind: 'vimeo', id: '76979871' })
  assert.equal(videoUrl('https://evil.example/watch?v=dQw4w9WgXcQ'), null)
})

test('dingbats: known names only, six at most, and the page loads only their families', () => {
  const d = normalize({ dings: ['lantern', 'nope', 'noodles', 'heart', 'star', 'sun', 'moon', 'cat'] })
  assert.deepEqual(d.dings, ['lantern', 'noodles', 'heart', 'star', 'sun', 'moon'])
  const html = render({ ...base, d: { name: 'x', dings: ['lantern'] } })
  const pd = JSON.parse(/id="pd">(.*?)<\/script>/.exec(html)[1])
  assert.ok(pd.fams.includes('lanna'))
})

test('messages: cut to size, spam held, the copy escapes the reader', () => {
  assert.equal(clean({ body: ' ' }), null)
  assert.equal(check(clean({ body: 'สนใจ บาคาร่า เครดิตฟรี' })), 'held:spam')
  assert.equal(check(clean({ body: 'see https://a.co https://b.co https://c.co' })), 'held:links')
  assert.equal(check(clean({ body: 'พรุ่งนี้เปิดกี่โมงคะ' })), 'ok')
  const c = copyOf({ name: '<i>x</i>', reach: 'a@b.co', body: '<script>1</script>' }, 'shop', 'Shop', 'https://sites.motdang.net')
  assert.ok(!c.html.includes('<script>') && !c.html.includes('<i>x'))
  assert.equal(c.replyTo, 'a@b.co')
})

test('the drawn map page centres on the pin and reads from motdang.net', () => {
  const html = mapPage(new URL('https://sites.motdang.net/map?pin=48.8584,2.2945&pn=Tour&embed=1'), 'n0nce', 'en')
  assert.match(html, /<base href="https:\/\/motdang\.net\/">/)
  assert.match(html, /"view":\[48\.8584,2\.2945\]/)
  assert.match(html, /"tiles":"https:\/\/motdang\.net\/tiles\/world\.pmtiles"/)
  assert.equal(mapPage(new URL('https://sites.motdang.net/map?pin=x'), 'n', 'en'), null)
})

test('Gold PromptPay payload passes its own CRC', () => {
  const p = promptPayPayload({ payeeId: '0812345678', satang: 300037, merchantName: 'Mot Dang', ref: 'GOLD' })
  assert.ok(verifyPayload(p))
  assert.match(p, /54073000\.37/)
})

test('people and machines', () => {
  assert.equal(isMachine(req('Mozilla/5.0 (compatible; Googlebot/2.1)')), true)
  assert.equal(isMachine(req('Mozilla/5.0 Chrome/130.0 Safari/537.36')), true)
  assert.equal(isMachine(req('Mozilla/5.0 Chrome/130.0 Safari/537.36', { 'sec-fetch-mode': 'navigate' })), false)
})

test('no browser auto-translation on own pages; the page offers its own languages', () => {
  const html = render({ ...base, d: { name: 'x' } }, { nonce: 'n1' })
  assert.match(html, /<html [^>]*translate="no" class="notranslate"/)
  assert.match(html, /<meta name="google" content="notranslate">/)
  assert.match(html, /<script nonce="n1">if\(\/\[\.\]translate\[\.\]goog\$\//)
})

test('calendar, offers, bookings, rooms and listings: Gold parts only on Gold', () => {
  const d = { name: 'x', cal: [{ id: 'aaaa', t: 'Yoga', start: '2026-10-01T07:00', rep: 'weekly' }], camps: [{ t: 'Sale', start: '2026-10-01T00:00', end: '2027-01-01T00:00', code: 'A1' }],
    svc: [{ n: 'Massage', mins: 60 }], rooms: [{ n: 'Room' }], lists: [{ id: 'list01', t: 'House' }] }
  const now = new Date('2026-10-14T05:00:00Z')
  const free = render({ ...base, d }, { now })
  assert.match(free, /id="cal"/)
  assert.ok(!/class="camp"|id="book"|id="rooms"|id="lists"/.test(free))
  const gold = render({ ...base, tier: 'gold', d }, { now })
  for (const k of ['class="camp"', 'id="book"', 'id="rooms"', 'id="lists"', 'href="/khaosoi-mae-sai/l/list01"']) assert.ok(gold.includes(k), k)
  assert.equal((gold.match(/<li[^>]*><time class="dt"/g) || []).length, 1) // a weekly item shows once
})

test('Gold year: Agoda and Booking.com buttons, rooms without direct booking; hotel month: direct booking', () => {
  const d = { name: 'x', rooms: [{ id: 'room01', n: 'Room', p: '900' }], ota: { agoda: 'https://www.agoda.com/x/hotel/chiang-mai-th.html', booking: 'https://www.booking.com/hotel/th/x.html', evil: 1 } }
  const year = render({ ...base, tier: 'gold', d })
  assert.match(year, /class="btn ota ota-agoda"[^>]*href="https:\/\/www\.agoda\.com\//)
  assert.match(year, /class="btn ota ota-booking"/)
  assert.ok(year.includes('id="rooms"') && !year.includes('data-pick='))
  const hotel = render({ ...base, tier: 'gold', hotel: true, d })
  assert.match(hotel, /data-pick="room01"/)
  assert.ok(!render({ ...base, d }).includes('class="btn ota ota-agoda"')) // free pages: no buttons
  assert.equal(normalize({ ota: { agoda: 'https://evil.example/agoda.com' } }).ota.agoda, '')
})
