// amulet.mjs — the amulet seller's page (Nan 2026-10-15: "amulet sellers could actually be a
// big customer. they're not well served by websites."). Each amulet carries its temple, maker,
// year (BE), material, mould, size, condition, certificate and frame, a price or "ask", a status,
// and close-ups front and back; each has its own page at /name/a/<id> with a LINE reserve button.
// Forms and materials follow amulet-essentials (data/vocab, schema/kind.schema.json); conditions
// follow its value_factors.json. render.mjs passes its helpers in, so this file imports none of it.

import { money } from './extras.mjs'

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n)
const ID = /^[a-z0-9]{4,12}$/
const PHOTO_ID = /^[a-z0-9]{12,24}$/

export const AM_MAX = { sian: 500, gold: 120, free: 6, photos: 12 }
/** How many amulets a page shows: Sala Sian 500, Gold 120, Free 6. */
export const amCap = (isGold, isSian) => (isGold ? (isSian ? AM_MAX.sian : AM_MAX.gold) : AM_MAX.free)
export const AM_STATUS = ['open', 'reserved', 'sold', 'show']

// [id, ไทย, English, 中文]
export const AM_FORMS = [
  ['tablet', 'พระพิมพ์', 'Tablet', '佛牌'], ['coin', 'เหรียญ', 'Coin', '铜牌'], ['figure', 'รูปหล่อ', 'Cast figure', '铸像'],
  ['takrut', 'ตะกรุด', 'Takrut', '符管'], ['locket', 'ล็อกเก็ต', 'Locket', '照片牌'], ['cloth', 'ผ้ายันต์', 'Yant cloth', '符布'],
  ['charm', 'เครื่องราง', 'Charm', '法器'], ['altar', 'พระบูชา', 'Altar Buddha', '佛像'], ['other', 'อื่น ๆ', 'Other', '其他'],
]
export const AM_MATERIALS = [
  ['phong', 'เนื้อผง', 'Sacred powder', '粉'], ['din', 'เนื้อดิน', 'Clay', '陶土'], ['wan', 'เนื้อว่าน', 'Herbal paste', '草药'],
  ['chin', 'เนื้อชิน', 'Tin-lead', '锡铅'], ['nawa', 'นวโลหะ', 'Nine metals', '九宝铜'], ['samrit', 'สัมฤทธิ์', 'Bronze', '青铜'],
  ['brass', 'ทองเหลือง', 'Brass', '黄铜'], ['copper', 'ทองแดง', 'Copper', '红铜'], ['alpaca', 'อัลปาก้า', 'Nickel silver', '白铜'],
  ['silver', 'เนื้อเงิน', 'Silver', '银'], ['gold', 'เนื้อทองคำ', 'Gold', '金'], ['nak', 'เนื้อนาค', 'Copper-gold', '纳卡金'],
  ['mekphat', 'เมฆพัด', 'Mekphat alloy', '墨帕'], ['kala', 'กะลา', 'Coconut shell', '椰壳'], ['horn', 'เขาสัตว์', 'Horn', '角'],
]
export const AM_CONDS = [
  ['champ', 'สวยแชมป์', 'Champion grade', '冠军品相'], ['orig', 'เดิม ๆ', 'Untouched', '原品'], ['good', 'สวย', 'Good', '品相好'],
  ['used', 'สภาพใช้', 'Worn', '有使用痕迹'], ['repaired', 'ซ่อม · อุด', 'Repaired', '有修补'], ['broken', 'หัก', 'Broken', '有断裂'],
]
const COL = { th: 1, en: 2, zh: 3 }
/** A list entry's label in `lang` (Thai, English or Chinese; English for the rest). */
export const amLabel = (list, id, lang) => { const r = list.find((x) => x[0] === id); return r ? r[COL[lang] || 2] : id }
/** What the maker typed, as an id when it names a list entry in any language. */
function idFrom(list, v, n) {
  const s = str(v, n)
  const low = s.toLowerCase()
  const r = list.find((x) => x[0] === s || x.slice(1).some((l) => l.toLowerCase() === low))
  return r ? r[0] : s
}

/** The amulets of a page, cleaned: unknown statuses open, photos the page's own, empty rows gone. */
export function normalizeAmulets(d, o) {
  let seen = new Set()
  o.amulets = (Array.isArray(d.amulets) ? d.amulets : []).map((x, i) => {
    let id = ID.test(x?.id || '') ? x.id : 'a' + i.toString(36).padStart(3, '0')
    while (seen.has(id)) id = 'a' + (i + seen.size).toString(36) + 'z'
    seen.add(id)
    return {
      id, t: str(x?.t, 100), temple: str(x?.temple, 80), maker: str(x?.maker, 80), year: str(x?.year, 12),
      form: AM_FORMS.some((f) => f[0] === x?.form) ? x.form : '', mat: idFrom(AM_MATERIALS, x?.mat, 40), mould: str(x?.mould, 60),
      size: str(x?.size, 40), cond: idFrom(AM_CONDS, x?.cond, 40), cert: str(x?.cert, 120), frame: str(x?.frame, 60),
      p: str(x?.p, 24), status: AM_STATUS.includes(x?.status) ? x.status : 'open', note: str(x?.note, 2000),
      photos: (Array.isArray(x?.photos) ? x.photos : []).filter((p) => PHOTO_ID.test(p)).slice(0, AM_MAX.photos),
    }
  }).filter((x) => x.t).slice(0, AM_MAX.sian)
  o.amterms = str(d.amterms, 600)
  o.amkt = d.amkt === true // Sala Sian: the market card under each amulet
  return o
}

/** A year as the reader counts it: Buddhist Era in Thai, both eras elsewhere. Words stay as typed. */
export function amYear(y, lang) {
  const n = Number(y)
  if (!/^\d{4}$/.test(y) || n < 1800) return y
  const be = n >= 2400 ? n : n + 543, ce = be - 543
  if (lang === 'th') return `พ.ศ. ${be}`
  return `${aw(lang, 'be')} ${be} (${ce})`
}

/** Open or reserved: the price shows and the reserve button works. */
const sells = (x) => x.status === 'open' || x.status === 'reserved'

/** The text a LINE message carries to reserve one amulet. */
export const amAsk = (lang, x, url) => `${aw(lang, 'askHi')} ${x.t}\n${url}`

// the words this kind prints; English fills any gap
const AW = {
  en: { amulets: 'Amulets', all: 'All', avail: 'Available', st_open: 'Available', st_reserved: 'Reserved', st_sold: 'Gone', st_show: 'On show', ask: 'Ask the price', price: 'Price',
    temple: 'Temple', maker: 'Maker', year: 'Year', mat: 'Material', mould: 'Mould', size: 'Size', cond: 'Condition', cert: 'Certificate', frame: 'Frame', form: 'Kind',
    front: 'Front', back: 'Back', reserve: 'Reserve on LINE', copied: 'Message copied. Paste it in LINE.', terms: 'Guarantee · delivery', more: 'More amulets',
    allBtn: 'All the amulets', detail: 'Details', askAbout: 'Ask about this amulet', goneAsk: 'Ask for one like it', be: 'BE', askHi: 'I would like to reserve', sian: 'Sala Sian', market: 'Market prices', marketHint: 'Close sales at auction and asking prices online, from the Mot Dang price guide' },
  th: { amulets: 'พระเครื่อง', all: 'ทั้งหมด', avail: 'พร้อมเช่า', st_open: 'พร้อมเช่า', st_reserved: 'จองแล้ว', st_sold: 'เช่าแล้ว', st_show: 'พระโชว์', ask: 'สอบถามราคา', price: 'ราคาเช่า',
    temple: 'วัด', maker: 'เกจิ · ผู้สร้าง', year: 'ปี', mat: 'เนื้อ', mould: 'พิมพ์', size: 'ขนาด', cond: 'สภาพ', cert: 'บัตรรับรอง', frame: 'กรอบ · เลี่ยม', form: 'ประเภท',
    front: 'ด้านหน้า', back: 'ด้านหลัง', reserve: 'จององค์นี้ทางไลน์', copied: 'คัดลอกข้อความแล้ว วางในไลน์ได้เลย', terms: 'การรับประกัน · การจัดส่ง', more: 'พระองค์อื่น',
    allBtn: 'พระทั้งหมด', detail: 'รายละเอียด', askAbout: 'สอบถามองค์นี้', goneAsk: 'ถามหาองค์แบบนี้', be: 'พ.ศ.', askHi: 'สนใจเช่าบูชา', sian: 'ศาลาเซียน', market: 'ราคาตลาด', marketHint: 'ราคาประมูลที่ปิดแล้วและราคาตั้งขายออนไลน์ที่ใกล้เคียง จากราคากลางของ Mot Dang' },
  zh: { amulets: '佛牌', all: '全部', avail: '可请', st_open: '可请', st_reserved: '已预订', st_sold: '已请走', st_show: '仅展示', ask: '询价', price: '请供价',
    temple: '寺庙', maker: '师父 · 制作', year: '年份', mat: '材质', mould: '模版', size: '尺寸', cond: '品相', cert: '鉴定卡', frame: '外壳', form: '类别',
    front: '正面', back: '背面', reserve: '在 LINE 预订', copied: '信息已复制，请粘贴到 LINE。', terms: '保证 · 寄送', more: '更多佛牌',
    allBtn: '全部佛牌', detail: '介绍', askAbout: '询问这尊佛牌', goneAsk: '询问类似的佛牌', be: '佛历', askHi: '我想请这尊', sian: 'Sala Sian', market: '市场价', marketHint: '相近的拍卖成交价和网上标价，来自 Mot Dang 行情' },
}
export const aw = (lang, k) => (AW[lang] && AW[lang][k]) || AW.en[k] || k

export const AM_CSS = `.agrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:12px}
.acard{display:flex;flex-direction:column;gap:2px;color:var(--ink);text-decoration:none}.acard[hidden]{display:none}
.acard figure{position:relative;margin:0 0 6px;aspect-ratio:3/4;border-radius:calc(var(--r) + 2px);overflow:hidden;background:#141210}
.acard img{width:100%;height:100%;object-fit:cover;transition:transform .5s}.acard:hover img{transform:scale(1.05)}
.acard .noimg{display:grid;place-items:center;height:100%;font-size:64px;background:repeating-linear-gradient(45deg,var(--line) 0 12px,var(--bg) 12px 24px)}
.acard .st{position:absolute;left:8px;top:8px;padding:3px 9px;border-radius:99px;font:800 12px/1.4 var(--body);color:#fff;background:#0b8043}
.acard .st-reserved{background:#b45309}.acard .st-sold{background:#111}.acard .st-show{background:#5b4a8a}.acard.gone figure{filter:grayscale(.8)}
.acard b{font:800 17px/1.25 var(--display)}.acard .pr{font:800 17px/1.2 var(--body);color:var(--acc-ink)}.acard small{color:var(--mute);font-size:13px}
.ashots{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ashots figure{margin:0}.ashots button{display:block;width:100%;padding:0;border:0;background:#141210;border-radius:calc(var(--r)/2);overflow:hidden;cursor:zoom-in}
.ashots img{display:block;width:100%;aspect-ratio:3/4;object-fit:contain}.ashots figcaption{margin:4px 0 0;color:var(--mute);font:700 13px var(--body);text-align:center}
.ashots .wide{grid-column:1/-1}.ashots .wide img{aspect-ratio:auto;max-height:80vh}
.ahead{display:flex;gap:8px;margin:0 0 6px}.ahead .st{padding:3px 10px;border-radius:99px;background:#0b8043;color:#fff;font:800 13px/1.4 var(--body)}.ahead .st-reserved{background:#b45309}.ahead .st-sold{background:#111}.ahead .st-show{background:#5b4a8a}
.aprice{margin:6px 0 14px;font:800 clamp(28px,7vw,40px)/1.1 var(--display);color:var(--acc-ink)}.aprice.ask{font-size:24px}
.afacts dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:0 0 14px}.afacts dl div{padding:10px 12px;border-radius:12px;background:var(--soft)}
.sianmark{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;background:#4a0f19;color:#f3d48a;box-shadow:inset 0 0 0 1.5px #b8860b;font:800 12px/1.4 var(--body);text-decoration:none;vertical-align:middle}
.amkt .apg-out{min-height:60px}.amkt .hint{color:var(--mute);font-size:13px;margin:0 0 10px}
.afacts dt{font-size:13px;color:var(--mute)}.afacts dd{margin:0;font-size:18px;font-weight:800;overflow-wrap:anywhere}.afacts .cert{grid-column:1/-1}`

/** One amulet in the grid: front photo, status, price, temple and year. */
export function amuletCard(x, { site, img, lang, sym, esc, ding }) {
  const sub = [x.temple, amYear(x.year, lang)].filter(Boolean).join(' · ')
  return `<a class="acard${x.status !== 'open' ? ' gone' : ''}" href="/${esc(site.name)}/a/${esc(x.id)}" data-form="${esc(x.form)}" data-st="${x.status}" data-t="amulet"><figure>` +
    (x.photos[0] ? `<img src="${esc(img(x.photos[0], true))}" alt="${esc(x.t)}" loading="lazy">` : `<span class="noimg">${ding('lotus', 'paper')}</span>`) +
    `${x.status !== 'open' ? `<span class="st st-${x.status}">${esc(aw(lang, 'st_' + x.status))}</span>` : ''}</figure>` +
    `<b>${esc(x.t)}</b>${sells(x) ? `<span class="pr">${esc(x.p ? money(x.p, sym) : aw(lang, 'ask'))}</span>` : ''}${sub ? `<small>${esc(sub)}</small>` : ''}</a>`
}

/** The grid on the page, with a filter by kind and by what is still available. */
export function amuletSection(list, h) {
  const { lang, esc, H2 } = h
  const forms = AM_FORMS.filter((f) => list.some((x) => x.form === f[0]))
  const out = [`<section class="card rise" id="amulets">${H2('amulets', esc(aw(lang, 'amulets')))}`]
  if (h.sian) out.push(`<p style="margin:-6px 0 12px"><a class="sianmark" href="/sian">◆ ${esc(aw(lang, 'sian'))}</a></p>`)
  const btns = [`<button class="on" data-af="">${esc(aw(lang, 'all'))}</button>`]
  if (list.some((x) => x.status !== 'open') && list.some((x) => x.status === 'open')) btns.push(`<button data-af="st:open">${esc(aw(lang, 'avail'))}</button>`)
  if (forms.length > 1) for (const f of forms) btns.push(`<button data-af="${f[0]}">${esc(amLabel(AM_FORMS, f[0], lang))}</button>`)
  if (btns.length > 1) out.push(`<div class="lfilter afilter" role="group">${btns.join('')}</div>`)
  out.push(`<div class="agrid">${list.map((x) => amuletCard(x, h)).join('')}</div></section>`)
  return out.join('')
}

/** An amulet's own page: front and back, the facts, the price, reserve, the seller's terms, the others. */
export function amuletBody(x, h) {
  const { site, d, lang, esc, H2, img, icon, paras, sym, line, oa, url, list } = h
  const A = (k) => esc(aw(lang, k))
  const out = []
  if (x.photos.length) {
    out.push('<section class="card rise"><div class="ashots">')
    x.photos.forEach((p, i) => {
      const cap = x.photos.length > 1 && i < 2 ? `<figcaption>${A(i ? 'back' : 'front')}</figcaption>` : ''
      out.push(`<figure${x.photos.length === 1 ? ' class="wide"' : ''}><button data-t="photo" data-big="${esc(img(p))}"><img src="${esc(img(p))}" alt="${esc(x.t)}${cap ? ' · ' + A(i ? 'back' : 'front') : ''}" loading="${i < 2 ? 'eager' : 'lazy'}"></button>${cap}</figure>`)
    })
    out.push('</div></section>')
  }
  const facts = [['form', x.form && amLabel(AM_FORMS, x.form, lang)], ['temple', x.temple], ['maker', x.maker], ['year', amYear(x.year, lang)],
    ['mat', x.mat && amLabel(AM_MATERIALS, x.mat, lang)], ['mould', x.mould], ['size', x.size], ['cond', x.cond && amLabel(AM_CONDS, x.cond, lang)], ['frame', x.frame], ['cert', x.cert]].filter(([, v]) => v)
  out.push(`<section class="card afacts rise"><p class="ahead"><span class="st st-${x.status}">${A('st_' + x.status)}</span>${h.sian ? `<a class="sianmark" href="/sian">◆ ${A('sian')}</a>` : ''}</p>`,
    !sells(x) ? '' : x.p ? `<p class="aprice"><small style="display:block;font:700 14px var(--body);color:var(--mute)">${A('price')}</small>${esc(money(x.p, sym))}</p>` : `<p class="aprice ask">${A('ask')}</p>`,
    facts.length ? `<dl>${facts.map(([k, v]) => `<div${k === 'cert' ? ' class="cert"' : ''}><dt>${A(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '')
  if (sells(x) && line) {
    const text = amAsk(lang, x, url)
    const href = oa ? `https://line.me/R/oaMessage/${encodeURIComponent(oa)}/?${encodeURIComponent(text)}` : line
    out.push(`<div class="tools-row"><a class="btn line" id="amreserve" data-t="reserve"${oa ? '' : ` data-copy="${esc(text)}" data-done="${A('copied')}"`} href="${esc(href)}" rel="nofollow noopener">${icon('chat')}${A('reserve')}</a></div>`)
  }
  out.push('</section>')
  if (h.sian && d.amkt) {
    const q = { t: x.t, temple: x.temple, maker: x.maker, year: x.year, mould: x.mould, cert: x.cert, matl: x.mat ? amLabel(AM_MATERIALS, x.mat, 'th') : '', forml: x.form ? amLabel(AM_FORMS, x.form, 'th') : '' }
    out.push(`<section class="card amkt rise" id="amkt" data-q="${esc(new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString())}" data-lang="${esc(lang)}">${H2('amkt', A('market'))}<p class="hint">${A('marketHint')}</p><div class="apg-out"></div></section>`)
  }
  if (x.note) out.push(`<section class="card rise">${H2('about', A('detail'))}${paras(x.note)}</section>`)
  if (d.amterms) out.push(`<section class="card rise">${H2('amterms', A('terms'))}${paras(d.amterms)}</section>`)
  const c = d.contact, reach = []
  if (c.phone) reach.push(`<a class="btn" data-t="call" href="${esc(h.tel(c.phone))}">${icon('phone')}${esc(h.W('call'))}</a>`)
  if (line && !sells(x)) reach.push(`<a class="btn line" data-t="line" href="${esc(line)}" rel="nofollow noopener">${icon('chat')}${esc(h.W('line'))}</a>`)
  if (reach.length || d.msg) {
    const about = sells(x) ? A('askAbout') : A('goneAsk')
    out.push(`<section class="card msgcard rise" id="message">${H2('msg', about)}`, reach.length ? `<nav class="reach" style="margin:0 0 16px">${reach.join('')}</nav>` : '',
      d.msg ? `<form class="msgf" id="msgf" data-about="${esc(x.t)}"><input name="name" maxlength="80" autocomplete="name" placeholder="${esc(h.W('msgName'))}" aria-label="${esc(h.W('msgName'))}">` +
        `<input name="reach" maxlength="120" autocomplete="tel" placeholder="${esc(h.W('msgReach'))}" aria-label="${esc(h.W('msgReach'))}">` +
        `<textarea name="body" maxlength="2000" required aria-label="${esc(h.W('msgBody'))}">${esc(x.t)} — </textarea><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">` +
        `<button class="btn" type="submit">${icon('mail')}${esc(h.W('msgSend'))}</button></form>` : '', '</section>')
  }
  const others = list.filter((y) => y.id !== x.id).sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1)).slice(0, 6)
  if (others.length) out.push(`<section class="card rise">${H2('amulets', A('more'))}<div class="agrid">${others.map((y) => amuletCard(y, h)).join('')}</div>`,
    `<div class="tools-row"><a class="btn ghost" href="/${esc(site.name)}#amulets">${icon('list')}${A('allBtn')}</a></div></section>`)
  return out.join('')
}

/** One amulet as schema.org: a product with an offer when it has a number for a price. */
export function amuletLd(x, url, image, cur) {
  const num = Number(String(x.p).replace(/[^\d.]/g, ''))
  const avail = { open: 'InStock', reserved: 'LimitedAvailability', sold: 'SoldOut' }[x.status]
  return { '@context': 'https://schema.org', '@type': 'Product', name: x.t, url, image, description: x.note.slice(0, 500) || undefined,
    material: x.mat ? amLabel(AM_MATERIALS, x.mat, 'en') : undefined,
    offers: num ? { '@type': 'Offer', price: num, priceCurrency: cur || undefined, availability: 'https://schema.org/' + avail } : undefined }
}

/** The words a page's share card and search result carry for one amulet. */
export function amuletDesc(x, lang) {
  return [x.temple, x.maker, amYear(x.year, lang), x.mat && amLabel(AM_MATERIALS, x.mat, lang), aw(lang, 'st_' + x.status)].filter(Boolean).join(' · ') || x.note.slice(0, 160)
}
