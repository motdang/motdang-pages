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
  assert.match(html, /og:image" content="https:\/\/sites\.motdang\.net\/s\/card\.jpg"/)
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
  assert.ok(!free.includes('youtube') && !free.includes('class="spots"'))
  assert.match(free, /name="robots" content="noindex"/)
  const gold = render({ ...base, look: 'gold', tier: 'gold', d })
  assert.match(gold, /data-look="gold"/)
  assert.match(gold, /data-kind="youtube" data-id="dQw4w9WgXcQ"/)
  assert.match(gold, /class="spots"/)
  assert.match(gold, /content="index,follow"/)
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
