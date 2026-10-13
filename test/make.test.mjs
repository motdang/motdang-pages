import test from 'node:test'
import assert from 'node:assert/strict'

// make.js touches the DOM at import; the address helpers are copied out by text.
const src = (await import('node:fs')).readFileSync(new URL('../public/s/make.js', import.meta.url), 'utf8')
const start = src.indexOf('const TH_INIT'), end = src.indexOf('// ---- server')
const mod = await import('data:text/javascript,' + encodeURIComponent(src.slice(start, end)))

test('Thai names suggest a readable address', () => {
  assert.equal(mod.romanizeThai('ข้าวซอย'), 'khaosoi')
  assert.equal(mod.romanizeThai('แม่สาย'), 'maesai')
  assert.equal(mod.slugify('ข้าวซอยแม่สาย'), 'khaosoimaesai')
  assert.equal(mod.slugify('Café Ñoño 2!'), 'cafe-nono-2')
  assert.match(mod.slugify('中文', 'shop'), /^shop-\d{4}$/)
})

test('a place page fills the builder: pin, phone, hours', async () => {
  const a = src.indexOf('function prefill'), b = src.indexOf('async function create')
  const m = await import('data:text/javascript,' + encodeURIComponent(
    'export const S = {}\n' + src.slice(a, b) + '\nexport { prefill, applyPrefill }'))
  const h = new URLSearchParams('pin=18.7883,98.9853&tel=053%20123%20456&cc=TH&hrs=x.0900-1800.0900-1200,1300-1800.0900-1800.0900-1800.0900-1800.x')
  m.S.pre = m.prefill(h)
  assert.deepEqual(m.S.pre.pin, [18.7883, 98.9853])
  const d = m.applyPrefill({ place: { lat: null, lng: null, addr: '', cc: '' }, contact: {}, hours: { on: false, always: false, tz: 'Asia/Bangkok', week: [] } })
  assert.equal(d.contact.phone, '053 123 456')
  assert.equal(d.place.lat, 18.7883)
  assert.equal(d.hours.week[0], null)
  assert.deepEqual(d.hours.week[2], [['09:00', '12:00'], ['13:00', '18:00']])
  assert.equal(m.prefill(new URLSearchParams('pin=999,1')), null)
})
