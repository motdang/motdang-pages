// amprice-ui.mjs — draws the amulet price guide (src/amprice.mjs answers /api/amulet-price).
// One drawing for the lookup page (/amulet-price), the builder's guide on each amulet, and the
// market card a Sala Sian page can show under an amulet.

export const GUIDE_WORDS = {
  th: { title: 'ราคากลางพระเครื่อง', lead: 'พิมพ์ชื่อพระ วัด เกจิ ปี เนื้อ ได้ราคาจากการประมูลที่ปิดแล้วและราคาขายออนไลน์ พร้อมลิงก์ให้ดูของจริง', ph: 'เช่น สมเด็จวัดระฆัง พิมพ์ใหญ่ ปี 2515',
    go: 'ดูราคา', auction: 'ประมูลปิดแล้ว · G-Pra', carded: 'มีบัตรรับประกัน', uncarded: 'รวมที่ไม่มีบัตร', online: 'ขายออนไลน์ · Lazada · ราคาตั้ง', mid: 'ราคากลาง', range: 'ช่วงกลาง',
    n: '{n} รายการใกล้เคียง', median: 'องค์ราคากลาง', best: 'ขายดีที่สุด', sold: 'ขายแล้ว {n}', bids: 'เคาะ {n} ครั้ง', none: 'ยังไม่พบรายการที่ใกล้พอ ลองใส่ชื่อวัดหรือเกจิ',
    conf_high: 'ข้อมูลมาก', conf_medium: 'ข้อมูลพอใช้', conf_low: 'ข้อมูลน้อย', use: 'ใช้ราคา ฿{p}', suggest: 'ราคาแนะนำ', make: 'ลงพระของคุณบนหน้าเว็บ', sian: 'ศาลาเซียน',
    more: 'ศาลาเซียนเห็นทุกรายการ', note: 'ราคาประมูลคือราคาปิดจริง ราคาออนไลน์คือราคาตั้งขาย อัปเดตทุกวัน', updated: 'อัปเดต {d}', market: 'ราคาตลาด', guide: 'ราคากลาง', fail: 'ดูราคาไม่ได้ตอนนี้ ลองใหม่อีกครั้ง' },
  en: { title: 'Amulet price guide', lead: 'Type the amulet, temple, monk, year or material. Prices from closed auctions and from listings online, each with a link to the piece.', ph: 'e.g. Somdej Wat Rakhang, large mould, 2515',
    go: 'Price it', auction: 'Closed auctions · G-Pra', carded: 'with a guarantee card', uncarded: 'cards and none', online: 'Online · Lazada · asking', mid: 'Middle price', range: 'middle half',
    n: '{n} close matches', median: 'At the middle price', best: 'Best seller', sold: '{n} sold', bids: '{n} bids', none: 'Nothing close enough yet. Add the temple or the monk.',
    conf_high: 'many sales', conf_medium: 'some sales', conf_low: 'few sales', use: 'Use ฿{p}', suggest: 'Suggested price', make: 'Put your amulets on a page', sian: 'Sala Sian',
    more: 'Sala Sian sees every comparable', note: 'Auction prices are hammer prices; online prices are asking prices. Updated daily.', updated: 'Updated {d}', market: 'Market prices', guide: 'Price guide', fail: 'The guide did not answer. Try again.' },
  zh: { title: '泰国佛牌行情', lead: '输入佛牌、寺庙、师父、年份或材质，查看已成交拍卖和网上标价，每条都有链接。', ph: '例：崇迪佛 大模 2515',
    go: '查价', auction: '已成交拍卖 · G-Pra', carded: '附保证卡', uncarded: '含无卡', online: '网上标价 · Lazada', mid: '中间价', range: '中间一半',
    n: '{n} 条相近', median: '中间价那一条', best: '卖得最多', sold: '已售 {n}', bids: '{n} 次出价', none: '还没有足够相近的。加上寺庙或师父。',
    conf_high: '数据多', conf_medium: '数据一般', conf_low: '数据少', use: '用 ฿{p}', suggest: '建议价', make: '把你的佛牌放上网页', sian: 'Sala Sian',
    more: 'Sala Sian 可看全部', note: '拍卖价为成交价；网上为标价。每日更新。', updated: '更新 {d}', market: '市场价', guide: '行情', fail: '暂时查不到，请再试。' },
}
const gw = (lang, k) => (GUIDE_WORDS[lang] || GUIDE_WORDS.en)[k] || GUIDE_WORDS.en[k]
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const nf = (n) => new Intl.NumberFormat('en').format(n)
const B = (n) => '฿' + nf(n)

export const GUIDE_CSS = `.apg-g{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}.apg-g>*{min-width:0}.apg-s{padding:14px 16px;border-radius:16px;background:var(--soft,#f6f1e7)}
.apg-s h4{margin:0 0 2px;font:800 14px/1.3 var(--body,system-ui);color:var(--mute,#6b6257)}
.apg-mid{font:800 30px/1.1 var(--display,system-ui);margin:4px 0 2px}.apg-mid small{font:700 14px var(--body,system-ui);color:var(--mute,#6b6257);margin-left:6px}
.apg-band{display:flex;align-items:center;gap:8px;margin:8px 0 4px;font:700 13px var(--body,system-ui);color:var(--mute,#6b6257)}
.apg-band i{flex:1;min-width:20px;height:8px;border-radius:99px;background:linear-gradient(90deg,#e8dcc4,#b8860b,#e8dcc4)}
.apg-c{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}.apg-c li{min-width:0}.apg-c a{min-width:0;display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:baseline;color:inherit;text-decoration:none;padding:8px 10px;border-radius:10px;background:var(--bg,#fff)}
.apg-c a:hover{outline:2px solid var(--line,#e5dccb)}.apg-c b{font:800 16px var(--body,system-ui)}.apg-c em{justify-self:end;text-align:right;font-style:normal;color:var(--mute,#6b6257);font-size:12px}
.apg-c span{grid-column:1/-1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:14px;line-height:1.4}.apg-tag{display:inline-block;padding:1px 8px;border-radius:99px;background:#b8860b;color:#fff;font:800 11px/1.6 var(--body,system-ui);margin-left:6px}
.apg-sug{display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between}.apg-use{min-height:44px;padding:0 16px;border:0;border-radius:12px;background:var(--ink,#1c1712);color:#fff;font:800 15px var(--body,system-ui);cursor:pointer}
.apg-more{margin:4px 0 0;font:700 13px var(--body,system-ui)}.apg-more a{color:inherit;text-decoration-color:#b8860b;text-decoration-thickness:2px}.apg-none{color:var(--mute,#6b6257)}`

const comp = (c, lang, tag) => `<li><a href="${esc(c.url)}" target="_blank" rel="nofollow noopener"><b>${B(c.price)}</b><em>${tag}</em><span>${esc(c.title)}</span></a></li>`

/**
 * The guide as HTML. opts.use: show a "Use ฿X" button (data-apuse); opts.compact: the market card on a page.
 */
export function drawGuide(g, lang, opts = {}) {
  const T = (k, v = {}) => esc(Object.entries(v).reduce((s, [a, b]) => s.replace('{' + a + '}', b), gw(lang, k)))
  if (!g) return `<p class="apg-none">${T('fail')}</p>`
  if (!g.auction && !g.online) return `<p class="apg-none">${T('none')}</p>`
  const out = ['<div class="apg-g">']
  if (g.suggest && !opts.compact) {
    out.push(`<div class="apg-s apg-sug"><div><h4>${T('suggest')} · ${T('conf_' + g.confidence)}</h4><div class="apg-mid">${B(g.suggest)}</div></div>` +
      (opts.use ? `<button type="button" class="apg-use" data-apuse="${g.suggest}">${T('use', { p: nf(g.suggest) })}</button>` : '') + '</div>')
  }
  if (g.auction) {
    const a = g.auction
    out.push(`<div class="apg-s"><h4>${T('auction')}<span class="apg-tag">${T(a.carded ? 'carded' : 'uncarded')}</span></h4>` +
      `<div class="apg-mid">${B(a.mid)}<small>${T('mid')}</small></div><div class="apg-band">${B(a.low)}<i></i>${B(a.high)}</div>` +
      `<small>${T('n', { n: a.n })} · ${T('range')}</small><ul class="apg-c">${a.comps.map((c) => comp(c, lang, `${esc(c.closed)} · ${T('bids', { n: c.bids })}`)).join('')}</ul></div>`)
  }
  if (g.online) {
    const o = g.online
    const list = [[o.median, T('median')], ...(o.best ? [[o.best, T('best') + ' · ' + T('sold', { n: nf(o.best.sold) })]] : [])]
    out.push(`<div class="apg-s"><h4>${T('online')}</h4><div class="apg-mid">${B(o.mid)}<small>${T('mid')}</small></div><div class="apg-band">${B(o.low)}<i></i>${B(o.high)}</div>` +
      `<small>${T('n', { n: o.n })} · ${T('range')}</small><ul class="apg-c">${list.map(([c, tag]) => comp(c, lang, tag)).join('')}` +
      `${(o.comps || []).filter((c) => c.url !== o.median.url && c.url !== o.best?.url).map((c) => comp(c, lang, c.sold ? T('sold', { n: nf(c.sold) }) : '')).join('')}</ul></div>`)
  }
  if (!g.full && !opts.compact) out.push(`<p class="apg-more"><a href="/sian">${T('more')} →</a></p>`)
  out.push(`<small class="apg-none">${T('note')}</small></div>`)
  return out.join('')
}
