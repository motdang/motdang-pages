import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prepare, guide, query, score } from '../src/amprice.mjs'
import { step } from '../src/deals.mjs'
import { LADDER, START } from '../src/sian.mjs'
import { drawGuide } from '../public/s/amprice-ui.mjs'

// a small file in the shape export_web.py writes
const DATA = {
  v: 1, built: '2026-10-20T18:00',
  concepts: [['subject', 'Somdej', 'สมเด็จ', 'somdej'], ['subject', 'Nang Kwak', 'นางกวัก', 'kwak'], ['material', 'Powder', 'เนื้อผง', 'powder'], ['form', 'Coin', 'เหรียญ', 'coin'], ['form', 'Tablet', 'พระพิมพ์', 'tablet']],
  kinds: [['somdej-wat-rakhang', ['สมเด็จ.*(วัดระฆัง|ระฆัง)', 's[ao]?m(dej|det).*(rakhang|rakang)']], ['lp-khoon', ['(หลวงพ่อ|ลพ\\.?\\s*)คูณ']]],
  gpra: { fields: ['aid', 'title', 'price', 'bids', 'bidders', 'closed', 'card', 'kind', 'year', 'c', 'cid'], rows: [
    [1, 'สมเด็จวัดระฆัง พิมพ์ใหญ่ เนื้อผง ปี 2515', 9000, 30, 8, '2026-10-01', 1, 'somdej-wat-rakhang', 2515, [0, 2], 10],
    [2, 'สมเด็จวัดระฆัง พิมพ์ใหญ่ ปี 2517', 12000, 22, 6, '2026-10-02', 1, 'somdej-wat-rakhang', 2517, [0], 10],
    [3, 'สมเด็จวัดระฆัง 100 ปี เนื้อผง', 7000, 15, 5, '2026-10-03', 1, 'somdej-wat-rakhang', 2515, [0, 2], 10],
    [4, 'เหรียญหลวงพ่อคูณ ปี 2536', 800, 9, 4, '2026-10-04', 0, 'lp-khoon', 2536, [3], 24],
  ] },
  lazada: { fields: ['pdp', 'title', 'price', 'sold', 'kind', 'year', 'c', 'img'], crawled: ['2026-07-10', '2026-10-11'], rows: [
    [11, 'พระสมเด็จวัดระฆัง เนื้อผง', 99, 300, 'somdej-wat-rakhang', 0, [0, 2], 1],
    [12, 'สมเด็จวัดระฆัง พิมพ์ใหญ่', 150, 20, 'somdej-wat-rakhang', 0, [0], 1],
    [13, 'นางกวัก กวักเงินทอง', 259, 594, '', 0, [1], 1],
  ] },
}
const P = prepare(DATA)

test('a query reads kind, year, concepts and names from the amulet fields', () => {
  const Q = query(P, { t: 'พระสมเด็จ วัดระฆัง พิมพ์ใหญ่', year: '๒๕๑๕', maker: 'หลวงพ่อโต', temple: 'วัดระฆัง', cert: 'บัตร G-Pra' }, { mat: 'เนื้อผง' })
  assert.equal(Q.kind, 'somdej-wat-rakhang')
  assert.equal(Q.year, 2515)
  assert.deepEqual(Q.c, [0, 2])
  assert.equal(Q.temple, 'ระฆัง')
  assert.equal(Q.maker, 'โต')
  assert.equal(Q.card, true)
  assert.equal(query(P, { t: 'Phra Somdej Wat Rakhang' }).kind, 'somdej-wat-rakhang') // English names too
  assert.equal(query(P, { t: 'x', year: '1972' }).year, 2515) // a CE year
})

test('carded auction sales set the middle price; online is asking, linked', () => {
  const g = guide(P, { t: 'สมเด็จวัดระฆัง พิมพ์ใหญ่', year: '2515' })
  assert.equal(g.auction.n, 3)
  assert.equal(g.auction.carded, true)
  assert.ok(g.auction.low <= g.auction.mid && g.auction.mid <= g.auction.high)
  assert.equal(g.suggest, g.auction.mid)
  assert.equal(g.auction.comps.length, 3)
  assert.match(g.auction.comps[0].url, /^https:\/\/www\.g-pra\.com\/auction\/view\.php\?aid=\d+$/)
  assert.match(g.online.median.url, /^https:\/\/www\.lazada\.co\.th\/products\/pdp-i1[12]\.html$/)
  assert.ok(!g.auction.comps.some((c) => /คูณ/.test(c.title))) // another kind never counts
})

test('a carded piece with no auction sales gets no suggestion from asking prices', () => {
  const g = guide(P, { t: 'นางกวัก', cert: 'บัตรสมาคม' })
  assert.equal(g.auction, undefined)
  assert.equal(g.online.n, 1)
  assert.equal(g.suggest, null)
  assert.equal(guide(P, { t: 'นางกวัก' }).suggest, 260) // rounded to ฿10
})

test('a famous kind is priced from auctions only; a coin is not a powder tablet', () => {
  assert.equal(guide(P, { t: 'สมเด็จวัดระฆัง ปี 2400' }, {}).suggest, guide(P, { t: 'สมเด็จวัดระฆัง ปี 2400' }).auction.mid)
  const few = prepare({ ...DATA, gpra: { ...DATA.gpra, rows: DATA.gpra.rows.slice(0, 1) } })
  assert.equal(guide(few, { t: 'สมเด็จวัดระฆัง' }).suggest, null)
  const Q = query(P, { t: 'สมเด็จวัดระฆัง' }, { form: 'พระพิมพ์' })
  const coin = { kind: 'somdej-wat-rakhang', c: [0, 3], title: 'เหรียญสมเด็จวัดระฆัง', year: 0 }, tablet = { ...coin, c: [0, 4], title: 'พระพิมพ์สมเด็จวัดระฆัง' }
  assert.equal(score(P, Q, tablet) - score(P, Q, coin), 1 + 1.5) // the form counts for the tablet and against the coin
})

test('Sala Sian sees every comparable; others three', () => {
  assert.equal(guide(P, { t: 'สมเด็จวัดระฆัง' }, { full: true }).online.comps.length, 2)
  assert.equal(guide(P, { t: 'สมเด็จวัดระฆัง' }).online.comps.length, 0)
})

test('the guide draws, links open in a new tab, and Use carries the price', () => {
  const h = drawGuide(guide(P, { t: 'สมเด็จวัดระฆัง' }), 'th', { use: true })
  assert.match(h, /data-apuse="\d+"/)
  assert.match(h, /target="_blank" rel="nofollow noopener"/)
  assert.match(drawGuide(guide(P, { t: 'zzz' }), 'en'), /Nothing close enough yet/)
  assert.match(drawGuide(null, 'en'), /did not answer/)
})

test('Sala Sian steps on its ladder the Shoup way', () => {
  assert.ok(LADDER.includes(START))
  assert.equal(step(LADDER, START, 0.9), 12999)
  assert.equal(step(LADDER, START, 0.7), START)
  assert.equal(step(LADDER, START, 0.3), 7999)
  assert.equal(step(LADDER, LADDER.at(-1), 1), LADDER.at(-1))
  assert.equal(step(LADDER, LADDER[0], 0), LADDER[0])
})
