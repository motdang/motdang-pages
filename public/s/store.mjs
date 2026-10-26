// store.mjs — the online shop and the downloads of an online business (Nan 2026-10-26: "dropshipping site, run an
// online business site"). A page keeps products (d.products), shipping and a discount code (d.ship, d.disc) and
// downloads (d.dls). Each product has its own page at /name/p/<id>. The server prices every order from this saved
// data (src/orders.mjs); the browser only shows prices. render.mjs passes its helpers in, so this file imports none of it.

import { amount, money } from './extras.mjs'
import { sw } from './words-store.mjs'

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n)
const ID = /^[a-z0-9]{4,12}$/
const PHOTO_ID = /^[a-z0-9]{12,24}$/

export const PR_MAX = { free: 12, gold: 120, photos: 10, cart: 20, qty: 99, qtyFree: 9 }
/** How many products a page lists: Gold 120, free 12. */
export const prCap = (gold) => (gold ? PR_MAX.gold : PR_MAX.free)
export const PR_STATUS = ['open', 'sold']
export const DL_MAX = 30
export const DL_BYTES = 50 * 1024 * 1024
export const DL_TYPES = { pdf: 'application/pdf', zip: 'application/zip', epub: 'application/epub+zip', mp3: 'audio/mpeg', mp4: 'video/mp4' }

const idOf = (v, i, p) => (ID.test(v || '') ? v : p + i.toString(36).padStart(3, '0'))
function uniq(rows) {
  const seen = new Set()
  return rows.map((x, i) => { let id = x.id; while (seen.has(id)) id = id.slice(0, 6) + (i + seen.size).toString(36) + 'z'; seen.add(id); return { ...x, id } })
}
const price = (v) => str(v, 14).replace(/[^\d.,]/g, '')
const stockOf = (v) => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.min(99999, Math.floor(n)) : null }
const gramsOf = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(50000, Math.round(n)) : 0 }

/** 'Size: S, M, L' on a line each (or split by ;) as [{ n, v: [] }]: two groups at most, twelve values each. */
export function optsOf(s) {
  const out = []
  for (const line of String(s || '').split(/[\n;]+/)) {
    const m = /^([^:：]{1,20})[:：](.*)$/.exec(line.trim())
    if (!m) continue
    const seen = new Set(), v = []
    for (const x of m[2].split(/[,،、，]+/)) {
      const t = x.trim().slice(0, 24)
      if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); v.push(t) }
    }
    const n = m[1].trim()
    if (n && v.length) out.push({ n, v: v.slice(0, 12) })
    if (out.length === 2) break
  }
  return out
}
const optsClean = (s) => optsOf(str(s, 300)).map((o) => `${o.n}: ${o.v.join(', ')}`).join('\n')

/** A download's file as { name, ext, size } when it is a type the shop sells, else null. */
function fileOf(f) {
  if (!f || typeof f !== 'object') return null
  const name = str(f.name, 120)
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(name)?.[1] || str(f.ext, 5)).toLowerCase()
  const size = Number(f.size)
  return name && DL_TYPES[ext] ? { name, ext, size: Number.isFinite(size) && size >= 0 ? Math.min(DL_BYTES, Math.round(size)) : 0 } : null
}

/** The shop's parts of `d`, cut to size and typed. Called from normalize(). */
export function normalizeStore(d, o) {
  o.products = uniq((Array.isArray(d.products) ? d.products : []).map((x, i) => ({
    id: idOf(x?.id, i, 'p'), t: str(x?.t, 100), p: price(x?.p), old: price(x?.old), note: str(x?.note, 2000),
    photos: (Array.isArray(x?.photos) ? x.photos : []).filter((p) => PHOTO_ID.test(p)).slice(0, PR_MAX.photos),
    opts: optsClean(x?.opts), stock: stockOf(x?.stock), g: gramsOf(x?.g), status: PR_STATUS.includes(x?.status) ? x.status : 'open',
  })).filter((x) => x.t).slice(0, PR_MAX.gold))
  const s = d.ship || {}
  o.ship = { th: price(s.th), world: price(s.world), free: price(s.free), mot: s.mot === true }
  const c = d.disc || {}
  const off = Math.round(Number(c.off))
  o.disc = { code: str(c.code, 24).replace(/[^\p{L}\p{N}_-]/gu, ''), off: Number.isFinite(off) ? Math.min(90, Math.max(0, off)) : 0 }
  o.dls = uniq((Array.isArray(d.dls) ? d.dls : []).map((x, i) => ({
    id: idOf(x?.id, i, 'd'), t: str(x?.t, 100), p: price(x?.p), note: str(x?.note, 400), file: fileOf(x?.file),
  })).filter((x) => x.t).slice(0, DL_MAX))
  return o
}

/** Units a product can sell now: none when sold; Gold pages count their stock; Infinity without a count. */
export const unitsLeft = (x, gold) => (x.status !== 'open' ? 0 : gold && x.stock !== null ? x.stock : Infinity)
/** A product a buyer can order: units left and a price. */
export const forSale = (x, gold) => unitsLeft(x, gold) > 0 && amount(x.p) > 0
/** A download a buyer can order: a file and a price. Gold pages only. */
export const dlForSale = (x, gold) => !!gold && !!x.file && amount(x.p) > 0

const fmtSize = (n) => (n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB')

export const SHOP_CSS = `.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
.pcard,.pcard>a{display:flex;flex-direction:column;gap:2px;color:var(--ink);text-decoration:none}.pcard .btn{min-height:44px;margin-top:8px}
.pcard figure{position:relative;margin:0 0 6px;aspect-ratio:1;border-radius:calc(var(--r) + 2px);overflow:hidden;background:var(--soft)}
.pcard img{width:100%;height:100%;object-fit:cover;transition:transform .5s}.pcard:hover img{transform:scale(1.05)}
.pcard .noimg{display:grid;place-items:center;height:100%;font-size:56px}.pcard.gone figure{filter:grayscale(.8)}
.pcard .st,.pbuy .st{padding:3px 10px;border-radius:99px;background:#111;color:#fff;font:800 12px/1.4 var(--body)}.pcard .st{position:absolute;left:8px;top:8px}.pcard .st.few{background:#b45309}.pcard .off{position:absolute;right:8px;top:8px;padding:3px 9px;border-radius:99px;background:var(--accent);color:var(--on-accent);font:800 12px/1.4 var(--body)}
.pcard b{font:800 16px/1.25 var(--display)}.pcard .pr{font:800 16px/1.2 var(--body);color:var(--acc-ink)}.pcard .pr s,.pbuy .aprice s{color:var(--mute);font-weight:400;margin-right:.3em}
.shipnote{margin:14px 0 0;color:var(--mute);font-size:15px}.shipnote span+span::before{content:" · "}
.cartbar{position:sticky;bottom:12px;z-index:5;display:flex;align-items:center;gap:12px;margin-top:16px;padding:10px 12px 10px 18px;border-radius:99px;background:var(--ink);color:var(--card);box-shadow:0 6px 20px rgba(0,0,0,.25)}
.cartbar[hidden]{display:none}.cartbar b{flex:1}.cartbar b small{display:block;font:500 12.5px/1.3 var(--body);opacity:.85}.cartbar .btn{min-height:44px;padding:6px 18px}
.pshots{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.pshots figure{margin:0}.pshots figure:first-child{grid-column:1/-1}
.pshots button{display:block;width:100%;padding:0;border:0;background:var(--soft);border-radius:calc(var(--r)/2);overflow:hidden;cursor:zoom-in}
.pshots img{display:block;width:100%;aspect-ratio:1;object-fit:cover}.pshots figure:first-child img{aspect-ratio:4/3}
.pbuy .aprice{margin:6px 0 10px;font:800 clamp(28px,7vw,40px)/1.1 var(--display);color:var(--acc-ink)}.pbuy .aprice s{font-size:.55em}
.pbuy .field{display:block;margin:0 0 10px}.pbuy .field span{display:block;font-size:14px;color:var(--mute)}
.pbuy select,.pbuy input{width:100%;min-height:48px;padding:8px 12px;border-radius:12px;border:2px solid var(--line);background:var(--soft);color:var(--ink);font:600 17px var(--body)}
.dlist{list-style:none;margin:0;padding:0}.dlist li{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px dashed var(--line)}
.dlist li:last-child{border:0}.dlist .n{flex:1;font-weight:600}.dlist .n small{display:block;font-weight:400;color:var(--mute);font-size:15px}.dlist .p{font-weight:700;white-space:nowrap}
.dlist .btn{min-height:44px;padding:6px 16px}
.shopsheet{position:fixed;inset:0;z-index:70;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55)}
.shopsheet .in{width:min(560px,100%);max-height:92vh;overflow:auto;padding:20px 18px 28px;border-radius:20px 20px 0 0;background:var(--card);color:var(--ink)}
.shopsheet h3{margin:0 0 12px;font:800 22px/1.2 var(--display)}.shopsheet .x{float:right;width:44px;height:44px;border:0;border-radius:50%;background:var(--soft);color:var(--ink);font:700 22px/1 system-ui;cursor:pointer}
.shopsheet .ln{display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px dashed var(--line)}.shopsheet .ln img{width:48px;height:48px;border-radius:8px;object-fit:cover;background:var(--soft)}
.shopsheet .ln .t{flex:1;font-weight:600;min-width:0}.shopsheet .ln .t small{display:block;color:var(--mute);font-weight:400}
.shopsheet .ln .q{display:inline-flex;align-items:center;gap:4px}.shopsheet .ln .q button{width:36px;height:36px;border-radius:50%;border:2px solid currentColor;background:transparent;color:inherit;font:700 18px/1 system-ui;cursor:pointer}
.shopsheet label{display:block;margin:10px 0 0}.shopsheet label span{display:block;font-size:14px;color:var(--mute)}
.shopsheet input,.shopsheet select,.shopsheet textarea{width:100%;min-height:48px;padding:8px 12px;border-radius:12px;border:2px solid var(--line);background:var(--soft);color:var(--ink);font:600 17px var(--body)}
.shopsheet .row{display:flex;gap:8px;align-items:flex-end}.shopsheet .row label{flex:1}.shopsheet .sum{margin:14px 0 0}.shopsheet .sum div{display:flex;justify-content:space-between;padding:3px 0}
.shopsheet .sum .tot{font:800 22px var(--display);border-top:2px solid var(--line);margin-top:6px;padding-top:8px}.shopsheet .err{color:#b3261e;font-weight:700;min-height:1.4em;margin:8px 0 0}
.shopsheet .hint{color:var(--mute);font-size:15px}.shopsheet .btn{width:100%;margin-top:12px}`

/** A product photo's alt text: its name and the shop's. */
export const prAlt = (x, shop) => [x.t, shop].filter(Boolean).join(' — ')

/** The shipping a shop offers, in a line: Thailand, abroad, free over, Mot Dang. */
export function shipNote(d, h) {
  const { lang, esc, sym, gold } = h
  const S = (k, v) => esc(sw(lang, k, v))
  const m = (p) => esc(money(p, sym))
  const parts = [amount(d.ship.th) > 0 ? S('shTh', { p: m(d.ship.th) }) : S('shThFree')]
  if (amount(d.ship.world) > 0) parts.push(S('shWorld', { p: m(d.ship.world) }))
  if (amount(d.ship.free) > 0) parts.push(S('shFree', { p: m(d.ship.free) }))
  if (gold && d.ship.mot) parts.push(S('shMot'))
  return `<p class="shipnote"><b>${S('shipH')}:</b> ${parts.map((p) => `<span>${p}</span>`).join('')}</p>`
}

/** One product in the grid: photo, status, price, and a button: Buy (free), Add to cart (Gold), or Buy to its page for a product with options. */
// the shelf says what a buyer weighs: a few left (Gold counts stock), and how much is off the old price (Nan 2026-10-26: decorations do things)
const few = (x, gold) => { const n = unitsLeft(x, gold); return n > 0 && n <= 5 ? n : 0 }
const off = (x) => (amount(x.old) > amount(x.p) && amount(x.p) > 0 ? Math.round((1 - amount(x.p) / amount(x.old)) * 100) : 0)

export function productCard(x, h) {
  const { site, lang, esc, img, sym, ding, gold, icon } = h
  const gone = unitsLeft(x, gold) === 0
  const old = amount(x.old) > amount(x.p) ? `<s>${esc(money(x.old, sym))}</s>` : ''
  const href = `/${esc(site.name)}/p/${esc(x.id)}`
  const S = (k) => esc(sw(lang, k))
  const own = gold && optsOf(x.opts).length > 0 // options are chosen on the product's page
  const btn = !h.pp || !forSale(x, gold) ? '' : own ? `<a class="btn ghost" href="${href}" data-t="product">${S('buy')}</a>`
    : gold ? `<button class="btn" data-cart="p:${esc(x.id)}" data-t="buy">${icon('basket')}${S('addCart')}</button>` : `<button class="btn" data-buy="p:${esc(x.id)}" data-t="buy">${icon('basket')}${S('buy')}</button>`
  return `<div class="pcard${gone ? ' gone' : ''}"><a href="${href}" data-t="product"><figure>` +
    (x.photos[0] ? `<img src="${esc(img(x.photos[0], true))}" alt="${esc(prAlt(x, h.title || site.name))}" loading="lazy">` : `<span class="noimg">${ding('gift', 'paper')}</span>`) +
    `${gone ? `<span class="st">${S('sold')}</span>` : few(x, gold) ? `<span class="st few">${esc(sw(lang, 'left', { n: few(x, gold) }))}</span>` : ''}${off(x) ? `<span class="off">−${off(x)}%</span>` : ''}</figure><b>${esc(x.t)}</b>` +
    `<span class="pr">${amount(x.p) ? old + esc(money(x.p, sym)) : S('noPrice')}</span></a>${btn}</div>`
}

/** The shop on the page: the grid, how it ships, the cart bar (Gold) the script fills. */
export function shopSection(list, h) {
  const { d, lang, esc, H2 } = h
  return `<section class="card rise" id="shop">${H2('shop', esc(sw(lang, 'shop')))}<div class="pgrid">${list.map((x) => productCard(x, h)).join('')}</div>` +
    (h.pp && list.some((x) => forSale(x, h.gold)) ? shipNote(d, h) : '') + (h.gold && h.pp ? '<div class="cartbar" id="cartbar" hidden></div>' : '') + '</section>'
}

/** The downloads on a Gold page: a title, a file type and size, a price and a Buy button. */
export function dlSection(list, h) {
  const { lang, esc, H2, sym, pp, icon } = h
  const S = (k, v) => esc(sw(lang, k, v))
  return `<section class="card rise" id="dls">${H2('dls', S('dls'))}<ul class="dlist">` +
    list.map((x) => `<li><span class="n">${esc(x.t)}<small>${esc([x.note, x.file ? x.file.ext.toUpperCase() + (x.file.size ? ' · ' + fmtSize(x.file.size) : '') : ''].filter(Boolean).join(' · '))}</small></span>` +
      `<span class="p">${esc(money(x.p, sym))}</span>${pp && dlForSale(x, true) ? `<button class="btn" data-buy="d:${esc(x.id)}" data-t="buy">${icon('basket')}${S('buy')}</button>` : ''}</li>`).join('') +
    `</ul><p class="shipnote">${S('dlGet')}</p></section>`
}

/** A product's own page: photos, price, options, Buy (and Add to cart on Gold), how it ships, the others. */
export function productBody(x, h) {
  const { site, d, lang, esc, H2, img, icon, paras, sym, gold, pp, line, oa, url, list } = h
  const S = (k, v) => esc(sw(lang, k, v))
  const out = []
  if (x.photos.length) {
    out.push('<section class="card rise"><div class="pshots">')
    x.photos.forEach((p, i) => out.push(`<figure><button data-t="photo" data-big="${esc(img(p))}"><img src="${esc(img(p, i > 0))}" alt="${esc(prAlt(x, h.title || site.name))}${i ? ` (${i + 1}/${x.photos.length})` : ''}" loading="${i < 1 ? 'eager' : 'lazy'}"></button></figure>`))
    out.push('</div></section>')
  }
  const gone = unitsLeft(x, gold) === 0
  const left = gold && x.stock !== null && x.stock > 0 && x.stock <= 5 ? x.stock : 0
  const old = amount(x.old) > amount(x.p) ? `<s>${esc(money(x.old, sym))}</s>` : ''
  out.push(`<section class="card pbuy rise" id="pbuy" data-id="${esc(x.id)}">`,
    gone ? `<p><span class="st">${S('sold')}</span></p>` : '',
    amount(x.p) ? `<p class="aprice">${old}${esc(money(x.p, sym))}</p>` : `<p class="aprice" style="font-size:24px">${S('noPrice')}</p>`,
    left ? `<p class="hint">${S('left', { n: left })}</p>` : '')
  if (pp && forSale(x, gold)) {
    if (gold) for (const [i, o] of optsOf(x.opts).entries()) out.push(`<label class="field"><span>${esc(o.n)}</span><select data-opt="${i}">${o.v.map((v) => `<option>${esc(v)}</option>`).join('')}</select></label>`)
    if (gold) out.push(`<label class="field"><span>${S('qty')}</span><input type="number" data-qty min="1" max="${x.stock !== null ? Math.max(1, Math.min(PR_MAX.qty, x.stock)) : PR_MAX.qty}" value="1" inputmode="numeric"></label>`)
    out.push('<div class="tools-row">',
      gold ? `<button class="btn" data-cart="p:${esc(x.id)}" data-t="buy">${icon('basket')}${S('addCart')}</button><button class="btn ghost" data-buy="p:${esc(x.id)}" data-t="buy">${S('buyNow')}</button>`
        : `<button class="btn" data-buy="p:${esc(x.id)}" data-t="buy">${icon('basket')}${S('buy')}</button>`, '</div>', shipNote(d, h), gold ? '<div class="cartbar" id="cartbar" hidden></div>' : '')
  }
  out.push('</section>')
  if (x.note) out.push(`<section class="card rise">${paras(x.note)}</section>`)
  const c = d.contact, reach = []
  if (c.phone) reach.push(`<a class="btn" data-t="call" href="${esc(h.tel(c.phone))}">${icon('phone')}${esc(h.W('call'))}</a>`)
  if (line && !(pp && forSale(x, gold))) reach.push(`<a class="btn line" data-t="line" href="${esc(line)}" rel="nofollow noopener">${icon('chat')}${esc(h.W('line'))}</a>`)
  if (reach.length || d.msg) {
    out.push(`<section class="card msgcard rise" id="message">${H2('msg', S('askAbout'))}`, reach.length ? `<nav class="reach" style="margin:0 0 16px">${reach.join('')}</nav>` : '',
      d.msg ? `<form class="msgf" id="msgf" data-about="${esc(x.t)}"><input name="name" maxlength="80" autocomplete="name" placeholder="${esc(h.W('msgName'))}" aria-label="${esc(h.W('msgName'))}">` +
        `<input name="reach" maxlength="120" autocomplete="tel" placeholder="${esc(h.W('msgReach'))}" aria-label="${esc(h.W('msgReach'))}">` +
        `<textarea name="body" maxlength="2000" required aria-label="${esc(h.W('msgBody'))}">${esc(x.t)} — </textarea><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">` +
        `<button class="btn" type="submit">${icon('mail')}${esc(h.W('msgSend'))}</button></form>` : '', '</section>')
  }
  const others = list.filter((y) => y.id !== x.id).sort((a, b) => (unitsLeft(a, gold) ? 0 : 1) - (unitsLeft(b, gold) ? 0 : 1)).slice(0, 6)
  if (others.length) out.push(`<section class="card rise">${H2('shop', S('more'))}<div class="pgrid">${others.map((y) => productCard(y, h)).join('')}</div>`,
    `<div class="tools-row"><a class="btn ghost" href="/${esc(site.name)}#shop">${icon('list')}${S('allShop')}</a></div></section>`)
  return out.join('')
}

/** One product as schema.org: a product with an offer when it has a number for a price. */
export function productLd(x, url, image, cur, gold) {
  const num = amount(x.p)
  const avail = unitsLeft(x, gold) === 0 ? 'SoldOut' : 'InStock'
  return { '@context': 'https://schema.org', '@type': 'Product', name: x.t, url, image, description: x.note.slice(0, 500) || undefined,
    offers: num ? { '@type': 'Offer', price: num, priceCurrency: cur || undefined, availability: 'https://schema.org/' + avail } : undefined }
}

/** The words a product's share card and search result carry. */
export function productDesc(x, lang, sym) {
  return [amount(x.p) ? money(x.p, sym) : '', unitsLeft(x, true) === 0 ? sw(lang, 'sold') : '', x.note.slice(0, 120)].filter(Boolean).join(' · ')
}

/** The words shop.js needs, and the keys it asks for. */
export const SHOP_WORDS = ['toFree', 'buy', 'addCart', 'buyNow', 'sold', 'qty', 'cart', 'cartN', 'checkout', 'cartEmpty', 'rm', 'added', 'fName', 'fReach', 'fEmail', 'fEmailDl', 'fAddr', 'fCc',
  'fNote', 'fCode', 'fApply', 'tSub', 'tDisc', 'tShip', 'tTotal', 'go', 'goWait', 'payNext', 'eEmpty', 'eLines', 'eItem', 'eStock', 'eOpt', 'eName', 'eReach', 'eEmail', 'eAddr', 'eCc',
  'eAbroad', 'eCode', 'eNopay', 'eGold', 'eQuota', 'eHeld', 'eNet', 'close', 'shThFree']

/** What shop.js reads from the page: prices to show, the options, the words. The server prices the order again. */
export function shopData(d, h) {
  const { site, lang, gold, sym, img, list, dls } = h
  const items = {}
  for (const x of list) {
    items['p:' + x.id] = { t: x.t, u: amount(x.p), img: x.photos[0] ? img(x.photos[0], true) : '', o: gold ? optsOf(x.opts) : [], max: gold && x.stock !== null ? x.stock : 0, sold: !forSale(x, gold) }
  }
  for (const x of dls) if (dlForSale(x, gold)) items['d:' + x.id] = { t: x.t, u: amount(x.p), img: '', o: [], max: 1, sold: false }
  return { name: site.name, lang, sym, gold, th: amount(d.ship.th), world: amount(d.ship.world), free: amount(d.ship.free),
    code: !!(gold && d.disc.code && d.disc.off > 0), items, w: Object.fromEntries(SHOP_WORDS.map((k) => [k, sw(lang, k)])) }
}
