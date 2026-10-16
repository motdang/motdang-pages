import test from 'node:test'
import assert from 'node:assert/strict'
import { render, normalize, KINDS, SCENES } from '../public/s/render.mjs'
import { amYear, amLabel, AM_MATERIALS, AM_MAX } from '../public/s/amulet.mjs'
import { textOf } from '../src/screen.mjs'
import { texts } from '../src/tr.mjs'

const F = 'abcdefghijkl0001', B = 'abcdefghijkl0002', Z = 'abcdefghijkl0003'
const base = { name: 'tonpho-amulets', look: 'lanna', lang: 'th', kind: 'amulet', views: 1, status: 'live', tier: 'gold' }
const d = {
  name: 'ต้นโพธิ์ พระเครื่อง', contact: { line: '@tonpho', phone: '081 234 5678' }, msg: true, photos: [F, B, Z],
  amterms: 'ส่ง EMS ทั่วประเทศ',
  amulets: [
    { id: 'som1', t: 'พระสมเด็จวัดระฆัง พิมพ์ใหญ่', temple: 'วัดระฆัง', maker: 'สมเด็จพระพุฒาจารย์ (โต)', year: '2411', form: 'tablet', mat: 'เนื้อผง', cond: 'Untouched',
      p: '35,000', cert: 'บัตรสมาคมฯ 12345', size: '2.4 × 3.6 ซม.', photos: [F, B, 'not a photo'], note: 'พระสวยเดิม' },
    { id: 'rian2', t: 'เหรียญหลวงพ่อคูณ รุ่นแรก', form: 'coin', mat: 'Copper', year: '1972', status: 'sold', p: '9,000', photos: [Z] },
    { id: 'tak3', t: 'ตะกรุด', form: 'takrut', status: 'reserved' },
    { t: '' }, { id: 'show4', t: 'พระโชว์', status: 'show', p: '1,000,000' }, { id: 'odd5', t: 'odd', status: 'lost', form: 'spaceship' },
  ],
}

test('an amulet page kind, with the facts sellers list and empty rows dropped', () => {
  assert.ok(KINDS.includes('amulet'))
  assert.ok(SCENES.amulet.length)
  const n = normalize(d)
  assert.equal(n.amulets.length, 5)
  const [a, r] = n.amulets
  assert.equal(a.mat, 'phong') // a material typed in any language becomes its id
  assert.equal(a.cond, 'orig')
  assert.equal(r.mat, 'copper')
  assert.deepEqual(a.photos, [F, B])
  assert.equal(n.amulets[4].status, 'open')
  assert.equal(n.amulets[4].form, '')
  assert.equal(normalize({ amulets: [{ t: 'x', mat: 'เนื้อกระเบื้อง' }] }).amulets[0].mat, 'เนื้อกระเบื้อง') // other words stay as typed
  assert.equal(amLabel(AM_MATERIALS, 'nawa', 'zh'), '九宝铜')
  assert.equal(normalize({ amulets: Array.from({ length: 200 }, (_, i) => ({ t: 'a' + i })) }).amulets.length, AM_MAX.gold)
})

test('years read as the reader counts them', () => {
  assert.equal(amYear('2517', 'th'), 'พ.ศ. 2517')
  assert.equal(amYear('1974', 'th'), 'พ.ศ. 2517')
  assert.equal(amYear('2517', 'en'), 'BE 2517 (1974)')
  assert.equal(amYear('2517', 'zh'), '佛历 2517 (1974)')
  assert.equal(amYear('ปลาย ร.5', 'en'), 'ปลาย ร.5')
})

test('the page shows the amulets in a grid, filtered by kind and by what is available', () => {
  const html = render({ ...base, d })
  assert.match(html, /id="amulets"/)
  assert.match(html, /href="\/tonpho-amulets\/a\/som1"/)
  assert.match(html, /data-af="st:open"/)
  assert.match(html, /data-af="coin">เหรียญ</)
  assert.match(html, /<span class="st st-sold">เช่าแล้ว<\/span>/)
  assert.match(html, /<span class="pr">35,000<\/span>|<span class="pr">฿35,000<\/span>/)
  assert.ok(!html.includes('9,000'), 'a gone amulet hides its price')
  assert.ok(!html.includes('1,000,000'), 'an amulet on show hides its price')
  assert.match(html, />สอบถามราคา</) // no price: ask
})

test('a free page shows six amulets, and the seventh has no page', () => {
  const many = { amulets: Array.from({ length: 9 }, (_, i) => ({ id: 'am' + i + 'xx', t: 'Amulet ' + i })) }
  const html = render({ ...base, tier: 'free', d: many })
  assert.equal((html.match(/class="acard/g) || []).length, 6)
  assert.ok(!render({ ...base, tier: 'free', d: many }, { amulet: 'am7xx' }).includes('<title>Amulet 7'))
})

test('each amulet has its own page: front and back, facts, price, a LINE reserve with the message written', () => {
  const html = render({ ...base, d }, { amulet: 'som1' })
  assert.match(html, /<title>พระสมเด็จวัดระฆัง พิมพ์ใหญ่ · ต้นโพธิ์ พระเครื่อง<\/title>/)
  assert.match(html, new RegExp(`og:image" content="https://sites.motdang.net/img/${F}.webp"`))
  assert.match(html, /og:url" content="https:\/\/sites.motdang.net\/tonpho-amulets\/a\/som1"/)
  assert.match(html, /<figcaption>ด้านหน้า<\/figcaption>/)
  assert.match(html, /<figcaption>ด้านหลัง<\/figcaption>/)
  assert.match(html, /<dt>เนื้อ<\/dt><dd>เนื้อผง<\/dd>/)
  assert.match(html, /<dt>ปี<\/dt><dd>พ.ศ. 2411<\/dd>/)
  assert.match(html, /<dt>บัตรรับรอง<\/dt><dd>บัตรสมาคมฯ 12345<\/dd>/)
  const m = /id="amreserve"[^>]*href="([^"]+)"/.exec(html)
  assert.ok(m, 'reserve button')
  assert.ok(m[1].startsWith('https://line.me/R/oaMessage/%40tonpho/?'))
  assert.match(decodeURIComponent(m[1].split('?')[1]), /^สนใจเช่าบูชา พระสมเด็จวัดระฆัง พิมพ์ใหญ่\nhttps:\/\/sites.motdang.net\/tonpho-amulets\/a\/som1$/)
  assert.match(html, /ส่ง EMS ทั่วประเทศ/)
  assert.match(html, /"@type":"Product"/)
  assert.match(html, /"availability":"https:\/\/schema.org\/InStock"/)
  assert.match(html, /เหรียญหลวงพ่อคูณ/) // the other amulets
  assert.ok(!/class="av /.test(html))
})

test('a personal LINE id copies the message; a gone amulet has no reserve button', () => {
  const personal = { ...d, contact: { line: 'tonpho99' } }
  const html = render({ ...base, d: personal }, { amulet: 'som1' })
  assert.match(html, /id="amreserve"[^>]*data-copy="สนใจเช่าบูชา/)
  assert.match(html, /href="https:\/\/line.me\/R\/ti\/p\/~tonpho99"/)
  const sold = render({ ...base, lang: 'en', d }, { amulet: 'rian2' })
  assert.ok(!sold.includes('id="amreserve"'))
  assert.match(sold, /Ask for one like it/)
  assert.match(sold, /BE 2515 \(1972\)/)
  assert.match(sold, /<dd>Copper<\/dd>/)
})

test('amulet words are screened, and the notes are translated on Gold', () => {
  const t = textOf(normalize(d))
  assert.match(t, /บัตรสมาคมฯ 12345/)
  assert.match(t, /ส่ง EMS/)
  const paths = texts(normalize(d)).map(([p]) => p)
  assert.ok(paths.includes('amulets.0.note'))
  assert.ok(paths.includes('amterms'))
})
