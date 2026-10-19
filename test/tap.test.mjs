import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pick, cleanLink, cleanCard, cleanLine, lineUrl, vcard, cardOf, near, front, arrival, ownerPage } from '../src/tap.mjs'

test('two knocks pair inside the window, nearest in time', () => {
  const me = { id: 'a', t: 10_000, lat: null, lng: null, net: 'x' }
  assert.equal(pick(me, [{ id: 'b', t: 10_500, net: 'x' }])?.id, 'b')
  assert.equal(pick(me, [{ id: 'b', t: 11_000, net: 'x' }]), null) // 1 s apart
  assert.equal(pick(me, [{ id: 'b', t: 10_600, net: 'x' }, { id: 'c', t: 10_100, net: 'x' }])?.id, 'c')
})

test('located knocks far apart never pair; one unlocated stranger pairs only when alone', () => {
  const cm = { lat: 18.7883, lng: 98.9853 }, bkk = { lat: 13.7563, lng: 100.5018 }
  const me = { id: 'a', t: 0, ...cm, net: 'x' }
  assert.equal(pick(me, [{ id: 'b', t: 100, ...bkk, net: 'y' }]), null)
  assert.equal(pick(me, [{ id: 'b', t: 100, lat: 18.7885, lng: 98.9851, net: 'y' }])?.id, 'b')
  assert.equal(pick(me, [{ id: 'b', t: 100, lat: null, lng: null, net: 'y' }])?.id, 'b')
  assert.equal(pick(me, [{ id: 'b', t: 100, lat: null, lng: null, net: 'y' }, { id: 'c', t: 200, lat: null, lng: null, net: 'z' }]), null)
  assert.ok(near(cm, bkk) > 500_000)
})

test('links stay on motdang hosts and LINE', () => {
  assert.equal(cleanLink('https://motdang.net/sites/naga-fireballs'), 'https://motdang.net/sites/naga-fireballs')
  assert.equal(cleanLink('https://sites.motdang.net/hongdam-studio'), 'https://sites.motdang.net/hongdam-studio')
  assert.ok(cleanLink('https://line.me/ti/p/~abc'))
  assert.equal(cleanLink('http://motdang.net/'), null)
  assert.equal(cleanLink('https://motdang.net.evil.com/'), null)
  assert.equal(cleanLink('javascript:alert(1)'), null)
})

test('card fields keep their shape', () => {
  const c = cleanCard({ name: '  NaN  ', phone: '08x', email: 'nan@motdang.net', line: '@nan<b>', site: 'Hongdam-Studio' })
  assert.equal(c.name, 'NaN')
  assert.equal(c.phone, '')
  assert.equal(c.email, 'nan@motdang.net')
  assert.equal(c.line, '@nanb')
  assert.equal(c.site, 'hongdam-studio')
})

test('vcard carries the card', () => {
  const v = vcard(cardOf({ id: 'abcdefgh', name: 'NaN', role: 'motdang.net', email: 'nan@motdang.net', line: 'nan', give: 'card' }), 'https://sites.motdang.net/tap/abcdefgh')
  assert.match(v, /FN:NaN/)
  assert.match(v, /EMAIL:nan@motdang.net/)
  assert.match(v, /URL:https:\/\/sites.motdang.net\/tap\/abcdefgh/)
  assert.match(v, /NOTE:LINE nan/)
})

test('pages render in both languages with the name escaped', () => {
  const c = cardOf({ id: 'abcdefgh', name: '<NaN>', give: 'link', link: 'https://motdang.net/', link_label: 'Mot Dang' })
  const a = arrival(c, 'th', 'n0nce')
  assert.ok(!a.includes('<NaN>'))
  assert.match(a, /Mot Dang/)
  assert.match(a, /บันทึกรายชื่อ/)
  assert.match(front('en', 'n'), /Touch phones/)
  assert.match(ownerPage('en', 'n'), /Bump mode/)
})

test('LINE takes an id or an add-friend link', () => {
  assert.equal(cleanLine('https://line.me/ti/p/UyvWa-rWeT'), 'https://line.me/ti/p/UyvWa-rWeT')
  assert.equal(lineUrl('https://line.me/ti/p/UyvWa-rWeT'), 'https://line.me/ti/p/UyvWa-rWeT')
  assert.equal(lineUrl('defiant.to'), 'https://line.me/ti/p/~defiant.to')
  assert.equal(cleanLine('https://evil.com/x'), '')
  assert.equal(cleanLine('http://line.me/ti/p/x'), '')
  assert.match(arrival(cardOf({ id: 'abcdefgh', name: 'NaN', line: 'https://line.me/ti/p/UyvWa-rWeT', give: 'card' }), 'en', 'n'), /href="https:\/\/line.me\/ti\/p\/UyvWa-rWeT"/)
})
