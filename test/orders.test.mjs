// The online shop and the downloads (Nan 2026-10-26): products, orders priced from the saved page, the buyer's order page,
// stock, downloads that open after Paid, and Ship with Mot Dang. An in-memory D1 (node:sqlite); Resend, LINE and Discord are stubs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker, { sha } from '../src/worker.mjs'
import { normalize, render } from '../public/s/render.mjs'
import { quote } from '../src/orders.mjs'
import { verifyPayload } from '../src/promptpay.mjs'
import { optsOf, PR_MAX, DL_BYTES } from '../public/s/store.mjs'
import { SW, sw } from '../public/s/words-store.mjs'
import { orderLink } from '../src/osign.mjs'

const MIGRATIONS = readdirSync(new URL('../migrations/', import.meta.url)).sort()
const sqlOf = (f) => readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8')
function wrap(db) {
  const st = (sql, args = []) => {
    const s = db.prepare(sql), a = args.map((x) => (x === undefined ? null : typeof x === 'boolean' ? Number(x) : x))
    return {
      bind: (...b) => st(sql, b),
      first: async (col) => { const r = s.get(...a); return r ? (col ? r[col] : { ...r }) : null },
      all: async () => ({ results: s.all(...a).map((r) => ({ ...r })) }),
      run: async () => ({ meta: { changes: Number(s.run(...a).changes) } }),
    }
  }
  return { prepare: (sql) => st(sql), batch: async (xs) => Promise.all(xs.map((x) => x.run())), raw: db }
}
const d1 = () => { const db = new DatabaseSync(':memory:'); for (const f of MIGRATIONS) db.exec(sqlOf(f)); return wrap(db) }
const files = new Map()
const media = () => ({
  put: async (k, v, o = {}) => { files.set(k, { bytes: new Uint8Array(await new Response(v).arrayBuffer()), ...o }) },
  get: async (k) => { const f = files.get(k); return f ? { body: new Response(f.bytes).body, httpMetadata: f.httpMetadata, customMetadata: f.customMetadata } : null },
  head: async (k) => (files.has(k) ? { key: k } : null),
  delete: async (k) => { for (const x of [].concat(k)) files.delete(x) },
  list: async ({ prefix }) => ({ objects: [...files.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }),
})

const O = 'http://localhost'
const env = { DB: d1(), MEDIA: media(), SESSION_SECRET: 's', RESEND_KEY: 'rk', MAIL_FROM: 'Mot Dang <pages@motdang.net>', PROMPTPAY: '0899999999', LINE_TOKEN: 'lt', TEAM_LINE: 'Troom',
  DISCORD_SALES: 'https://discord.example/hook', ADMIN_KEY: 'adm' }
let pending = []
const ctx = { waitUntil(p) { pending.push(Promise.resolve(p).catch(() => {})) } }
const settle = async () => { while (pending.length) { const p = pending; pending = []; await Promise.all(p) } }
let ip = 0
const go = (path, init = {}) => worker.fetch(new Request(O + path, { redirect: 'manual', ...init, headers: { 'cf-connecting-ip': '10.1.0.' + (++ip), ...(init.headers || {}) } }), env, ctx)
const post = (path, body, headers = {}) => go(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })

const calls = []
const realFetch = globalThis.fetch
globalThis.fetch = async (u, init = {}) => {
  const url = String(u)
  calls.push({ url, init })
  if (url === 'https://api.resend.com/emails') return new Response(JSON.stringify({ id: 'x' }), { status: 200 })
  if (url === 'https://api.line.me/v2/bot/message/push') return new Response('{}', { status: 200 })
  if (url === env.DISCORD_SALES) return new Response(null, { status: 204 })
  return realFetch(u, init)
}
const mails = () => calls.filter((c) => c.url === 'https://api.resend.com/emails').map((c) => JSON.parse(c.init.body))
const team = () => [...calls.filter((c) => c.url === env.DISCORD_SALES).map((c) => JSON.parse(c.init.body).content), ...calls.filter((c) => c.url === 'https://api.line.me/v2/bot/message/push').map((c) => JSON.parse(c.init.body).messages[0].text)]
const teamLinks = () => team().flatMap((t) => t.match(/http:\/\/localhost\/sh\/[a-z0-9.]+/g) || [])

const SCARF = { id: 'scarf1', t: 'Scarf', p: '450', old: '600', opts: 'Size: S, M, L\nColour: red, blue', stock: 5, g: 300 }
const SOAP = { id: 'soap02', t: 'Soap', p: '199', g: 100 }
const D = (extra = {}) => ({ name: 'Shop A&B', msg: true, pay: { pp: '0812345678' }, contact: { phone: '081 234 5678', email: 'owner@example.com' },
  products: [SCARF, SOAP, { id: 'gone03', t: 'Old', p: '10', status: 'sold' }], ship: { th: '60', world: '600', free: '1000', mot: false },
  disc: { code: 'SAVE10', off: 10 }, dls: [{ id: 'guide1', t: 'Guide', p: '200', file: { name: 'guide.pdf', size: 5 } }], ...extra })
let n = 0
async function site(o = {}) {
  n++
  const id = 'o' + n, token = 'tok' + String(n).padStart(2, '0') + 'y'.repeat(30), name = 'shop-' + n
  const now = new Date().toISOString()
  env.DB.raw.exec("DELETE FROM quota WHERE what = 'mail'") // each test starts with the day's mail allowance
  await env.DB.prepare('INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until, trial, plan, notify_email, notify_ok) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, name, await sha(token), 'live', o.kind ?? 'store', 'clean', o.lang ?? 'en', JSON.stringify(normalize(o.d ?? D())), now, now, o.tier ?? 'gold', o.gold ?? null, 0, 'gold', o.mail === false ? null : 'owner@example.com', o.mail === false ? 0 : 1).run()
  return { id, name, token }
}
const api = (s, path, init = {}) => go('/api/' + path, { ...init, headers: { 'x-edit': s.token, origin: O, 'content-type': 'application/json', ...(init.headers || {}) } })
const apiPost = (s, path, body) => api(s, path, { method: 'POST', body: JSON.stringify(body) })
const buyer = { name: 'Somchai', reach: '081-234-5678', email: 'buyer@example.com', addr: '1 Nimman Rd, Chiang Mai', cc: 'TH', ms: 5000 }
const order = (s, lines, extra = {}) => post('/api/order', { n: s.name, lines, ...buyer, ...extra })
const orderRow = (id) => env.DB.raw.prepare('SELECT * FROM orders WHERE id = ?').get(id)

// ---- the page ------------------------------------------------------------------------------------

test('products, options, shipping and downloads are cut to size and typed', () => {
  const x = normalize({ products: [{ t: ' Mug ', p: '฿ 1,200 baht', old: 'x', opts: 'Size: S, M, M, L; Colour: red\nbad line\nThird: a\nFourth: b', stock: '-3', g: '250.4', photos: ['abcdefghijkl', 'no'], status: 'lost' }, { t: '' }],
    ship: { th: '60 baht', world: '', free: '1000', mot: 'yes' }, disc: { code: 'sa ve!10', off: 120 }, dls: [{ t: 'Book', p: '90', file: { name: 'a.exe' } }, { t: 'Guide', file: { name: 'g.PDF', size: 99999999999 } }] })
  assert.equal(x.products.length, 1)
  const p = x.products[0]
  assert.deepEqual([p.t, p.p, p.old, p.stock, p.g, p.status], ['Mug', '1,200', '', null, 250, 'open'])
  assert.equal(p.opts, 'Size: S, M, L\nColour: red') // two groups, no repeated value, lines without a colon gone
  assert.deepEqual(optsOf(p.opts), [{ n: 'Size', v: ['S', 'M', 'L'] }, { n: 'Colour', v: ['red'] }])
  assert.deepEqual(p.photos, ['abcdefghijkl'])
  assert.deepEqual(x.ship, { th: '60', world: '', free: '1000', mot: false }) // mot must be true, not "yes"
  assert.deepEqual(x.disc, { code: 'save10', off: 90 }) // letters, numbers, - and _ only; at most 90%
  assert.equal(x.dls[0].file, null) // an .exe is not sold
  assert.deepEqual(x.dls[1].file, { name: 'g.PDF', ext: 'pdf', size: DL_BYTES })
  assert.equal(normalize({ products: Array.from({ length: 200 }, (_, i) => ({ t: 'P' + i })) }).products.length, PR_MAX.gold)
})

test('a page shows 12 products when free and 120 when Gold, each with its own page', () => {
  const many = { pay: { pp: '0812345678' }, products: Array.from({ length: 150 }, (_, i) => ({ id: 'pr' + String(i).padStart(3, '0'), t: 'Thing ' + i, p: '10' })) }
  const base = { name: 'x1', look: 'clean', lang: 'en', kind: 'store', views: 1, status: 'live' }
  assert.equal((render({ ...base, tier: 'free', d: many }).match(/class="pcard/g) || []).length, 12)
  assert.equal((render({ ...base, tier: 'gold', d: many }).match(/class="pcard/g) || []).length, 120)
  assert.ok(!render({ ...base, tier: 'free', d: many }, { product: 'pr050' }).includes('<title>Thing 50'))
  const html = render({ ...base, tier: 'free', d: many }, { product: 'pr005' })
  assert.match(html, /<title>Thing 5 · x1<\/title>/)
  assert.match(html, /og:image" content="https:\/\/sites.motdang.net\/card\/x1\/p\/pr005\.jpg\?k=[a-z0-9]+"/)
  assert.match(html, /og:url" content="https:\/\/sites.motdang.net\/x1\/p\/pr005"/)
  assert.match(html, /data-buy="p:pr005"/) // a free page: one Buy button
  assert.ok(!/data-cart=/.test(html) && !html.includes('id="cartbar"'))
})

test('a Gold product page offers its options, a quantity, Add to cart and Buy now; the buyer cannot be priced in the browser', () => {
  const base = { name: 'x2', look: 'clean', lang: 'en', kind: 'store', views: 1, status: 'live', tier: 'gold', d: D() }
  const html = render(base, { product: 'scarf1' })
  assert.match(html, /<select data-opt="0">.*<option>S<\/option>.*<option>L<\/option>/)
  assert.match(html, /<select data-opt="1">.*red/)
  assert.match(html, /data-cart="p:scarf1"/)
  assert.match(html, /data-buy="p:scarf1"/)
  assert.match(html, /<s>฿600<\/s>฿450/)
  assert.match(html, /Only 5 left/)
  assert.match(html, /id="cartbar"/)
  assert.match(html, /"@type":"Product".*"price":450,"priceCurrency":"THB"/)
  assert.match(html, /src="\/s\/shop.js" defer/)
  const j = JSON.parse(/<script type="application\/json" id="shopd">(.*?)<\/script>/.exec(html)[1])
  assert.equal(j.items['p:scarf1'].u, 450)
  assert.equal(j.items['d:guide1'].u, 200)
  assert.equal(j.items['p:gone03'].sold, true)
  // a free page: no options, no cart, no downloads
  const free = render({ ...base, tier: 'free' }, { product: 'scarf1' })
  assert.ok(!/data-opt|data-cart|data-qty/.test(free) && !render({ ...base, tier: 'free' }).includes('id="dls"'))
  // a sold product shows no Buy; a page without PromptPay shows prices and no Buy at all
  assert.ok(!/data-buy="p:gone03"/.test(render(base, { product: 'gone03' })))
  assert.ok(!/data-buy=|shopd/.test(render({ ...base, d: D({ pay: {} }) })))
})

test('every word of the shop is in Thai, English, Burmese and Chinese', () => {
  const keys = Object.keys(SW.en)
  for (const l of ['th', 'my', 'zh']) assert.deepEqual(Object.keys(SW[l]).sort(), [...keys].sort(), l)
  for (const l of Object.keys(SW)) for (const k of keys) assert.ok(String(SW[l][k]).trim().length > 1, `${l} ${k}`)
  for (const l of Object.keys(SW)) assert.ok(!/\p{Extended_Pictographic}/u.test(JSON.stringify(SW[l])), 'no emoji ' + l)
  assert.equal(sw('fr', 'buy'), 'Buy') // other page languages read English
  assert.equal(sw('en', 'left', { n: 3 }), 'Only 3 left')
  assert.equal(sw('en', 'call'), 'Call') // a word the page already has
})

// ---- the price ----------------------------------------------------------------------------------

test('the price comes from the saved page, never from the browser', async () => {
  const s = await site()
  const r = await order(s, [{ k: 'p', id: 'soap02', q: 2, u: 1, price: 1, p: '1' }], { total: 1, sub: 1, delivery: 0 })
  const j = await r.json()
  assert.equal(r.status, 200)
  const o = orderRow(j.id)
  assert.equal(o.sub, 39800) // 2 x 199.00
  assert.equal(o.delivery, 6000) // Thailand 60
  assert.equal(o.total, 45800 + o.tail)
  assert.ok(o.tail >= 1 && o.tail <= 99)
  assert.equal(j.total, (o.total / 100).toFixed(2))
  assert.equal(JSON.parse(o.lines)[0].u, 19900)
  // an unknown product, a sold one, and a download on a free page are refused
  assert.equal((await order(s, [{ k: 'p', id: 'nope1' }])).status, 409)
  assert.equal((await order(s, [{ k: 'p', id: 'gone03' }])).status, 409)
  const free = await site({ tier: 'free' })
  const fd = await order(free, [{ k: 'd', id: 'guide1' }])
  assert.equal(fd.status, 402)
})

test('shipping is the Thailand price or the abroad price, and free over the amount the maker sets', async () => {
  const d = normalize(D())
  const q = (lines, extra = {}) => quote(d, true, { lines, cc: 'TH', ...extra })
  assert.equal(q([{ k: 'p', id: 'soap02', q: 1 }]).delivery, 6000)
  assert.equal(q([{ k: 'p', id: 'soap02', q: 1 }], { cc: 'MM' }).delivery, 60000)
  assert.equal(q([{ k: 'p', id: 'soap02', q: 5 }]).sub, 99500)
  assert.equal(q([{ k: 'p', id: 'soap02', q: 5 }]).delivery, 6000) // 995 is not over 1000
  assert.equal(q([{ k: 'p', id: 'soap02', q: 6 }]).delivery, 0) // 1194 is
  assert.equal(q([{ k: 'p', id: 'soap02', q: 6 }], { cc: 'MM' }).delivery, 0) // free over applies abroad too
  // the discount counts before "free over": 1194 less 10% is still over, 1194 less half is not
  assert.equal(q([{ k: 'p', id: 'soap02', q: 6 }], { code: 'save10' }).delivery, 0)
  assert.equal(q([{ k: 'p', id: 'soap02', q: 6 }], { code: 'SAVE10' }).disc, 11940)
  assert.equal(quote(normalize(D({ disc: { code: 'HALF', off: 50 } })), true, { lines: [{ k: 'p', id: 'soap02', q: 6 }], code: 'half', cc: 'TH' }).delivery, 6000)
  assert.equal(quote(normalize(D({ ship: { th: '60', world: '', free: '' } })), true, { lines: [{ k: 'p', id: 'soap02' }], cc: 'MM' }).error, 'abroad')
  assert.equal(quote(d, true, { lines: [{ k: 'p', id: 'soap02' }], cc: 'MM', code: 'WRONG' }).error, 'code')
  assert.equal(quote(d, true, { lines: [{ k: 'p', id: 'soap02' }] }, { strict: true }).error, 'cc') // an order needs a country; a quote assumes Thailand
  // a download alone ships nothing
  const dl = q([{ k: 'd', id: 'guide1' }])
  assert.deepEqual([dl.delivery, dl.goods, dl.cc, dl.sub], [0, false, '', 20000])
  assert.equal(normalize(D({ ship: { th: '', world: '', free: '' } })).ship.th, '')
  assert.equal(quote(normalize(D({ ship: { th: '', world: '', free: '' } })), true, { lines: [{ k: 'p', id: 'soap02' }] }).delivery, 0) // blank Thailand price: free
})

test('options must be chosen from the product, and only a Gold page has them', async () => {
  const d = normalize(D())
  const ok = quote(d, true, { lines: [{ k: 'p', id: 'scarf1', opt: ['M', 'blue'], q: 2 }] })
  assert.deepEqual(ok.lines[0].opt, ['M', 'blue'])
  assert.equal(quote(d, true, { lines: [{ k: 'p', id: 'scarf1', opt: ['XXL', 'blue'] }] }).error, 'opt')
  assert.equal(quote(d, true, { lines: [{ k: 'p', id: 'scarf1', opt: ['M'] }] }).error, 'opt')
  assert.equal(quote(d, true, { lines: [{ k: 'p', id: 'scarf1' }] }).error, 'opt')
  assert.deepEqual(quote(d, false, { lines: [{ k: 'p', id: 'scarf1' }] }).lines[0].opt, []) // free: no options
  // two lines of the same product and options are one line; stock counts across lines
  const two = quote(d, true, { lines: [{ k: 'p', id: 'scarf1', opt: ['M', 'red'], q: 2 }, { k: 'p', id: 'scarf1', opt: ['M', 'red'], q: 1 }] })
  assert.equal(two.lines.length, 1)
  assert.equal(two.lines[0].q, 3)
  assert.equal(quote(d, true, { lines: [{ k: 'p', id: 'scarf1', opt: ['M', 'red'], q: 3 }, { k: 'p', id: 'scarf1', opt: ['S', 'red'], q: 3 }] }).error, 'stock') // 6 of 5
})

test('a free page takes one product at a time and 12 products', async () => {
  const d = normalize(D())
  assert.equal(quote(d, false, { lines: [{ k: 'p', id: 'soap02' }, { k: 'p', id: 'scarf1' }] }).error, 'lines')
  assert.equal(quote(d, false, { lines: [{ k: 'p', id: 'soap02', q: 3 }] }).lines[0].q, 3)
  assert.equal(quote(d, false, { lines: [{ k: 'p', id: 'soap02', q: 50 }] }).lines[0].q, PR_MAX.qtyFree)
  assert.equal(quote(d, false, { lines: [{ k: 'p', id: 'soap02' }], code: 'SAVE10' }).error, 'code') // no discount code on a free page
  assert.equal(quote(d, true, { lines: [{ k: 'p', id: 'soap02' }, { k: 'p', id: 'scarf1', opt: ['S', 'red'] }] }).lines.length, 2)
  const s = await site({ tier: 'free' })
  assert.equal((await order(s, [{ k: 'p', id: 'soap02' }, { k: 'p', id: 'scarf1' }])).status, 400) // two products
  assert.equal((await order(s, [{ k: 'p', id: 'soap02' }])).status, 200)
  // product 13 is not for sale on a free page
  const many = Array.from({ length: 14 }, (_, i) => ({ id: 'pr' + String(i).padStart(3, '0'), t: 'Thing ' + i, p: '10' }))
  const s2 = await site({ tier: 'free', d: D({ products: many }) })
  assert.equal((await order(s2, [{ k: 'p', id: 'pr012' }])).status, 409)
  assert.equal((await order(s2, [{ k: 'p', id: 'pr011' }])).status, 200)
})

test('the buyer is asked for what the order needs, and a quote saves nothing', async () => {
  const s = await site()
  const lines = [{ k: 'p', id: 'soap02' }]
  assert.equal((await order(s, lines, { name: '' })).status, 400)
  assert.equal((await order(s, lines, { reach: '', email: '' })).status, 400)
  assert.equal((await order(s, lines, { email: 'not an email' })).status, 400)
  assert.equal((await (await order(s, lines, { addr: '' })).json()).error, 'addr')
  assert.equal((await (await order(s, lines, { cc: '' })).json()).error, 'cc')
  assert.equal((await (await order(s, [{ k: 'd', id: 'guide1' }], { email: '' })).json()).error, 'email')
  assert.equal((await (await order(s, lines, { ms: 100 })).json()).id, undefined) // a script fills it fast
  assert.equal((await (await order(s, lines, { website: 'x' })).json()).id, undefined)
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM orders WHERE site_id = ?').get(s.id).n, 0)
  const qt = await (await post('/api/order', { n: s.name, lines, quote: true })).json()
  assert.equal(qt.quote.total, 259) // 199 + 60
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM orders WHERE site_id = ?').get(s.id).n, 0)
  const nopay = await site({ d: D({ pay: {} }) })
  assert.equal((await (await order(nopay, lines)).json()).error, 'nopay')
})

test('two waiting orders of a page get different satang tails', async () => {
  const s = await site()
  const tails = new Set()
  for (let i = 0; i < 30; i++) tails.add(orderRow((await (await order(s, [{ k: 'p', id: 'soap02' }], { email: '' })).json()).id).tail)
  assert.equal(tails.size, 30)
})

// ---- the order page ------------------------------------------------------------------------------

test('the order page opens with its signed address only and shows the QR for the exact total', async () => {
  const s = await site()
  const j = await (await order(s, [{ k: 'p', id: 'soap02' }], { lang: 'th' })).json()
  const path = new URL(j.page).pathname
  const r = await go(path)
  assert.equal(r.status, 200)
  const html = await r.text()
  assert.match(html, /lang="th"/)
  assert.match(html, /ออเดอร์ของคุณ|รอคุณชำระเงิน/)
  assert.match(html, new RegExp('฿' + (j.total.replace(/\B(?=(\d{3})+(?!\d))/g, ',')).replace('.', '\\.')))
  assert.match(html, /class="qr"/)
  assert.match(html, /action="\/o\/[a-z0-9]{14}\.[a-f0-9]{24}\/slip"/)
  assert.match(html, /noindex/)
  assert.equal((await go(path.replace(/\.[a-f0-9]{24}$/, '.' + 'a'.repeat(24)))).status, 404) // wrong signature
  assert.equal((await go(path.replace(/^\/o\/[a-z0-9]{14}/, '/o/' + 'a'.repeat(14)))).status, 404) // another order's id with this signature
  assert.equal((await go('/o/' + 'a'.repeat(14) + '.' + 'b'.repeat(24))).status, 404)
  assert.equal(await orderLink(env, O, 'x'.repeat(14), sha) === await orderLink({ ...env, SESSION_SECRET: 'other' }, O, 'x'.repeat(14), sha), false)
})

test('a slip the buyer sends waits for the maker: SlipOK is not proof for a maker\'s own account', async () => {
  const s = await site()
  const j = await (await order(s, [{ k: 'p', id: 'soap02' }])).json()
  const path = new URL(j.page).pathname
  const f = new FormData()
  f.append('slip', new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])], 'slip.png', { type: 'image/png' }))
  const r = await go(path + '/slip', { method: 'POST', body: f })
  assert.equal(r.status, 303)
  const o = orderRow(j.id)
  assert.equal(o.status, 'slip') // not paid
  assert.equal(o.seen, 0)
  assert.ok(files.has('oslip/' + j.id))
  const bad = new FormData(); bad.append('slip', new File(['x'], 'a.txt', { type: 'text/plain' }))
  assert.equal(orderRow(j.id).status, 'slip')
  await go(path + '/slip', { method: 'POST', body: bad })
  assert.equal(orderRow(j.id).slip, 'oslip/' + j.id)
  // the maker looks at it, then says Paid
  const pic = await api(s, 'orders/slip?id=' + j.id)
  assert.equal(pic.status, 200)
  assert.equal(pic.headers.get('content-type'), 'image/png')
  assert.match(pic.headers.get('content-security-policy'), /sandbox/)
  // a file that only says it is a picture is not taken: an SVG can carry script (CodeRabbit on #72)
  const svg = new FormData(); svg.append('slip', new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'], 's.svg', { type: 'image/svg+xml' }))
  await go(path + '/slip', { method: 'POST', body: svg })
  assert.equal((await api(s, 'orders/slip?id=' + j.id)).headers.get('content-type'), 'image/png')
  assert.equal((await api(s, 'orders/slip?id=' + 'z'.repeat(14))).status, 404)
  await settle()
  assert.ok(mails().some((m) => m.to[0] === 'owner@example.com' && /Order slip/.test(m.subject)))
})

// ---- the maker's tab ------------------------------------------------------------------------------

test('Paid takes the goods off the stock counts, and Not paid gives them back', async () => {
  const s = await site()
  const j = await (await order(s, [{ k: 'p', id: 'scarf1', opt: ['M', 'red'], q: 2 }, { k: 'p', id: 'soap02', q: 1 }])).json()
  const stock = () => JSON.parse(env.DB.raw.prepare('SELECT d FROM site WHERE id = ?').get(s.id).d).products.map((x) => x.stock)
  assert.deepEqual(stock(), [5, null, null]) // an order waiting for money holds nothing
  const unread = await (await api(s, 'orders')).json()
  assert.equal(unread.unread, 1)
  assert.equal(unread.rows[0].status, 'new')
  const r = await apiPost(s, 'orders', { act: 'paid', id: j.id })
  assert.equal((await r.json()).stock.scarf1, 3)
  assert.deepEqual(stock(), [3, null, null]) // the soap has no count and stays so
  assert.equal(orderRow(j.id).status, 'paid')
  await apiPost(s, 'orders', { act: 'paid', id: j.id }) // twice is once
  assert.deepEqual(stock(), [3, null, null])
  await apiPost(s, 'orders', { act: 'unpaid', id: j.id })
  assert.deepEqual(stock(), [5, null, null])
  assert.equal(orderRow(j.id).status, 'no')
  await apiPost(s, 'orders', { act: 'paid', id: j.id })
  assert.deepEqual(stock(), [3, null, null])
  // the rest of the stock sells out the product on the page
  const big = await (await order(s, [{ k: 'p', id: 'scarf1', opt: ['S', 'blue'], q: 3 }])).json()
  assert.equal((await order(s, [{ k: 'p', id: 'scarf1', opt: ['S', 'blue'], q: 4 }])).status, 409) // 4 of 3
  await apiPost(s, 'orders', { act: 'paid', id: big.id })
  assert.deepEqual(stock(), [0, null, null])
  const page = await (await go('/' + s.name + '/p/scarf1')).text()
  assert.match(page, /Sold out/)
  assert.ok(!/data-buy="p:scarf1"/.test(page))
  assert.equal((await order(s, [{ k: 'p', id: 'scarf1', opt: ['S', 'blue'] }])).status, 409)
  // a page without Gold keeps no count
  const free = await site({ tier: 'free' })
  const fj = await (await order(free, [{ k: 'p', id: 'scarf1' }])).json()
  await apiPost(free, 'orders', { act: 'paid', id: fj.id })
  assert.equal(JSON.parse(env.DB.raw.prepare('SELECT d FROM site WHERE id = ?').get(free.id).d).products[0].stock, 5)
})

test('the maker sees the orders, marks one shipped with a tracking number, and downloads the list as CSV; the buyer sees the number', async () => {
  const s = await site()
  const j = await (await order(s, [{ k: 'p', id: 'soap02' }], { name: '=cmd|x', note: 'Leave at the door' })).json()
  assert.equal((await (await apiPost(s, 'orders', { act: 'ship', id: j.id, track: 'TH123456' })).json()).error, 'unpaid')
  await apiPost(s, 'orders', { act: 'paid', id: j.id })
  assert.equal((await (await apiPost(s, 'orders', { act: 'ship', id: j.id, track: 'x' })).json()).error, 'track')
  assert.equal((await apiPost(s, 'orders', { act: 'ship', id: j.id, track: 'TH123456' })).status, 200)
  const raw = new Uint8Array(await (await api(s, 'orders.csv')).arrayBuffer())
  assert.deepEqual([...raw.slice(0, 3)], [0xef, 0xbb, 0xbf]) // a byte-order mark, so a spreadsheet reads Thai
  const csv = new TextDecoder().decode(raw)
  assert.ok(csv.startsWith('Order,Date,Status'))
  assert.match(csv, /'=cmd\|x/) // a name that looks like a formula is quoted off
  assert.match(csv, /Soap x1/)
  assert.match(csv, /TH123456/)
  const html = await (await go(new URL(j.page).pathname)).text()
  assert.match(html, /Tracking number: <b>TH123456<\/b>/)
  await settle()
  assert.ok(mails().some((m) => m.to[0] === 'buyer@example.com' && /TH123456/.test(m.subject)))
  const seen = await apiPost(s, 'orders', { act: 'seen' })
  assert.equal(seen.status, 200)
  assert.equal((await (await api(s, 'orders')).json()).unread, 0)
  assert.equal((await api({ ...s, token: 'q'.repeat(40) }, 'orders')).status, 403)
  // another page cannot touch it
  const other = await site()
  assert.equal((await apiPost(other, 'orders', { act: 'gone', id: j.id })).status, 400)
  assert.equal((await site0(other)).orders, 0)
})
const site0 = async (s) => (await (await api(s, 'site')).json())

test('the owner and the buyer are told by email, on a Gold page', async () => {
  const s = await site()
  const before = mails().length
  await order(s, [{ k: 'p', id: 'soap02' }])
  await settle()
  const m = mails().slice(before)
  assert.ok(m.some((x) => x.to[0] === 'owner@example.com' && /New order/.test(x.subject)))
  assert.ok(m.some((x) => x.to[0] === 'buyer@example.com' && /\/o\/[a-z0-9]{14}\.[a-f0-9]{24}/.test(x.text)))
  const free = await site({ tier: 'free' })
  const before2 = mails().length
  await order(free, [{ k: 'p', id: 'soap02' }])
  await settle()
  assert.equal(mails().length, before2) // free pages: the tab and the order page
})

// ---- downloads --------------------------------------------------------------------------------

async function upload(s, id = 'guide1', name = 'guide.pdf', bytes = [37, 80, 68, 70, 45]) {
  return api(s, `dl?id=${id}&name=${encodeURIComponent(name)}`, { method: 'PUT', body: new Uint8Array(bytes), headers: { 'content-length': String(bytes.length), 'content-type': 'application/octet-stream' } })
}

test('a file for a download is private, up to 50 MB, of the types the shop sells, and for Gold', async () => {
  const s = await site()
  const r = await upload(s)
  assert.equal(r.status, 200)
  assert.deepEqual((await r.json()).file, { name: 'guide.pdf', ext: 'pdf', size: 5 })
  assert.ok(files.has(`dl/${s.id}/guide1`))
  assert.equal(files.get(`dl/${s.id}/guide1`).httpMetadata.contentType, 'application/pdf')
  assert.equal((await upload(s, 'guide1', 'run.exe')).status, 400)
  assert.equal((await upload(s, 'bad id', 'a.pdf')).status, 400)
  assert.equal((await api(s, `dl?id=guide1&name=a.pdf`, { method: 'PUT', body: new Uint8Array(3), headers: { 'content-length': String(DL_BYTES + 1) } })).status, 413)
  assert.equal((await api(s, `dl?id=guide1&name=a.pdf`, { method: 'PUT' })).status, 411)
  const free = await site({ tier: 'free' })
  assert.equal((await upload(free)).status, 402)
  // no one reads it at its R2 address through the page
  assert.equal((await go(`/img/guide1.webp`)).status, 404)
  // taking the file away
  assert.equal((await api(s, 'dl?id=guide1', { method: 'DELETE' })).status, 200)
  assert.ok(!files.has(`dl/${s.id}/guide1`))
})

test('a download opens after Paid, for 7 days and 5 times, and a buyer needs an email for it', async () => {
  const s = await site()
  await upload(s)
  const j = await (await order(s, [{ k: 'd', id: 'guide1' }], { addr: '', cc: '' })).json()
  const path = new URL(j.page).pathname
  const dl = path + '/d/guide1'
  assert.equal(orderRow(j.id).delivery, 0)
  assert.equal(orderRow(j.id).total, 20000 + orderRow(j.id).tail)
  assert.equal((await go(dl)).status, 403) // not paid
  assert.ok(!(await (await go(path)).text()).includes(dl)) // no link on the page yet
  await apiPost(s, 'orders', { act: 'paid', id: j.id })
  const page = await (await go(path)).text()
  assert.ok(page.includes(`href="${dl}"`))
  const r = await go(dl)
  assert.equal(r.status, 200)
  assert.equal(r.headers.get('content-type'), 'application/pdf')
  assert.match(r.headers.get('content-disposition'), /^attachment; filename="guide.pdf"/)
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [37, 80, 68, 70, 45])
  for (let i = 0; i < 4; i++) assert.equal((await go(dl)).status, 200)
  assert.equal((await go(dl)).status, 410) // the sixth
  assert.match(await (await go(path)).text(), /This download has ended/)
  // seven days after Paid it ends too, however many times are left
  const j2 = await (await order(s, [{ k: 'd', id: 'guide1' }], { addr: '', cc: '' })).json()
  const p2 = new URL(j2.page).pathname
  await apiPost(s, 'orders', { act: 'paid', id: j2.id })
  assert.equal((await go(p2 + '/d/guide1')).status, 200)
  env.DB.raw.prepare('UPDATE orders SET paid_at = ? WHERE id = ?').run(new Date(Date.now() - 8 * 864e5).toISOString(), j2.id)
  assert.equal((await go(p2 + '/d/guide1')).status, 410)
  env.DB.raw.prepare('UPDATE orders SET paid_at = ? WHERE id = ?').run(new Date(Date.now() - 6 * 864e5).toISOString(), j2.id)
  assert.equal((await go(p2 + '/d/guide1')).status, 200)
  // the link of one order opens nothing of another; a download not in the order is not served
  assert.equal((await go(path + '/d/guide2')).status, 404)
  assert.equal((await go(dl.replace(/\.[a-f0-9]{24}\//, '.' + 'c'.repeat(24) + '/'))).status, 404)
  // Not paid takes the file away again
  await apiPost(s, 'orders', { act: 'unpaid', id: j2.id })
  assert.equal((await go(p2 + '/d/guide1')).status, 403)
  // the buyer got it by email, with the link
  await settle()
  assert.ok(mails().some((m) => m.to[0] === 'buyer@example.com' && m.text.includes(dl)))
  // no file uploaded: it cannot be ordered
  const s3 = await site()
  assert.equal((await (await order(s3, [{ k: 'd', id: 'guide1' }], { addr: '', cc: '' })).json()).error, 'item')
})

// ---- Ship with Mot Dang ------------------------------------------------------------------------------

test('Ship with Mot Dang: Paid opens a parcel job, the team answers from a signed link, Shipped bills the maker', async () => {
  const s = await site({ d: D({ ship: { th: '60', world: '600', free: '1000', mot: true } }) })
  const j = await (await order(s, [{ k: 'p', id: 'soap02', q: 2 }], { cc: 'TH' })).json()
  assert.equal(orderRow(j.id).mot, 1)
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM shipjob').get().n, 0) // nothing until the money is in
  const before = team().length
  await apiPost(s, 'orders', { act: 'paid', id: j.id })
  await settle()
  const job = env.DB.raw.prepare('SELECT * FROM shipjob WHERE order_id = ?').get(j.id)
  assert.equal(job.status, 'wait')
  assert.ok(team().length >= before + 2) // LINE and Discord
  const link = teamLinks().at(-1)
  assert.ok(link)
  await apiPost(s, 'orders', { act: 'paid', id: j.id }) // again: still one job
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM shipjob WHERE order_id = ?').get(j.id).n, 1)
  const owner = await (await api(s, 'orders')).json()
  assert.equal(owner.rows[0].mot, true)
  assert.deepEqual(owner.ship.fees, { th: 100, world: 500 })
  assert.match(owner.ship.drop, /Chiang Rai/)
  // the team's page
  const tp = new URL(link).pathname
  const page = await (await go(tp)).text()
  assert.match(page, /Soap/)
  assert.match(page, /Somchai/)
  assert.match(page, /200 g/)
  assert.equal((await go(tp.replace(/\.[a-f0-9]{24}$/, '.' + 'a'.repeat(24)))).status, 404)
  const form = (o) => { const f = new URLSearchParams(o); return { method: 'POST', body: f, headers: { 'content-type': 'application/x-www-form-urlencoded' } } }
  assert.equal((await go(tp, form({ act: 'got' }))).status, 303)
  assert.equal(env.DB.raw.prepare('SELECT status FROM shipjob WHERE id = ?').get(job.id).status, 'got')
  assert.match(await (await go(tp, form({ act: 'sent', track: '', postage: '45' }))).text(), /Write the tracking number/)
  assert.equal(env.DB.raw.prepare('SELECT status FROM shipjob WHERE id = ?').get(job.id).status, 'got')
  assert.equal((await go(tp, form({ act: 'sent', track: 'EMS0001TH', postage: '45.50' }))).status, 303)
  // the owner's bill: 100 fee + 45.50 postage + a satang tail, payable to Mot Dang, plan "ship"
  const pay = env.DB.raw.prepare("SELECT * FROM pay WHERE plan = 'ship'").get()
  assert.equal(pay.site_id, s.id)
  assert.equal(pay.status, 'open')
  const sat = Math.round(Number(pay.amount) * 100)
  assert.ok(sat > 14550 && sat <= 14550 + 99, pay.amount)
  const done = env.DB.raw.prepare('SELECT * FROM shipjob WHERE id = ?').get(job.id)
  assert.deepEqual([done.status, done.track, done.fee, done.postage, done.pay_id], ['sent', 'EMS0001TH', 10000, 4550, pay.id])
  assert.equal(orderRow(j.id).track, 'EMS0001TH')
  const tab = await (await api(s, 'orders')).json()
  assert.equal(tab.ship.bills.length, 1)
  assert.equal(tab.ship.bills[0].amount, pay.amount)
  assert.ok(verifyPayload(tab.ship.bills[0].payload)) // the QR the maker pays Mot Dang with
  assert.ok(tab.ship.bills[0].payload.includes('0066899999999')) // to env.PROMPTPAY
  assert.equal(tab.rows[0].job.track, 'EMS0001TH')
  // the buyer's page shows the tracking number
  assert.match(await (await go(new URL(j.page).pathname)).text(), /EMS0001TH/)
  // Gold is not touched by a parcel bill
  const gold0 = env.DB.raw.prepare('SELECT gold_until, tier FROM site WHERE id = ?').get(s.id)
  // an abroad parcel costs the abroad fee
  const j2 = await (await order(s, [{ k: 'p', id: 'soap02' }], { cc: 'MM' })).json()
  await apiPost(s, 'orders', { act: 'paid', id: j2.id })
  const job2 = env.DB.raw.prepare('SELECT * FROM shipjob WHERE order_id = ?').get(j2.id)
  const link2 = new URL(await (await import('../src/osign.mjs')).teamLink(env, O, job2.id, sha)).pathname
  await go(link2, form({ act: 'sent', track: 'EMS0002MM', postage: '300' }))
  const pay2 = env.DB.raw.prepare("SELECT * FROM pay WHERE plan = 'ship' AND id != ?").get(pay.id)
  assert.ok(Math.round(Number(pay2.amount) * 100) > 80000 && Math.round(Number(pay2.amount) * 100) <= 80099, pay2.amount) // 500 + 300
  assert.notEqual(pay2.amount, pay.amount)
  // a page that does not ship with Mot Dang opens no job; an owner cannot enter a tracking number on a Mot Dang parcel
  assert.equal((await (await apiPost(s, 'orders', { act: 'ship', id: j.id, track: 'ME123' })).json()).error, 'mot')
  const own = await site()
  const j3 = await (await order(own, [{ k: 'p', id: 'soap02' }])).json()
  await apiPost(own, 'orders', { act: 'paid', id: j3.id })
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM shipjob WHERE site_id = ?').get(own.id).n, 0)
  assert.deepEqual(env.DB.raw.prepare('SELECT gold_until, tier FROM site WHERE id = ?').get(s.id), gold0)
})

test('a parcel bill is paid like Gold but grants nothing: Paid at /admin and a slip from the maker', async () => {
  const s = await site({ gold: '2027-06-30', d: D({ ship: { th: '60', world: '600', free: '', mot: true } }) })
  const j = await (await order(s, [{ k: 'p', id: 'soap02' }])).json()
  await apiPost(s, 'orders', { act: 'paid', id: j.id })
  const job = env.DB.raw.prepare('SELECT * FROM shipjob WHERE order_id = ?').get(j.id)
  const tp = new URL(await (await import('../src/osign.mjs')).teamLink(env, O, job.id, sha)).pathname
  const f = new URLSearchParams({ act: 'sent', track: 'EMS777TH', postage: '40' })
  await go(tp, { method: 'POST', body: f, headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  const pay = env.DB.raw.prepare("SELECT * FROM pay WHERE plan = 'ship' AND site_id = ?").get(s.id)
  const before = env.DB.raw.prepare('SELECT tier, gold_until, plan FROM site WHERE id = ?').get(s.id)
  // a Gold payment of the same page is not mixed up with it
  const g = await (await apiPost(s, 'gold', { plan: 'gold' })).json()
  assert.notEqual(g.amount, pay.amount)
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM pay WHERE site_id = ? AND plan = 'ship'").get(s.id).n, 1)
  // a slip from the maker: SlipOK is off here, so it waits for Beer with a link
  const sf = new FormData(); sf.append('pay', pay.id); sf.append('slip', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16])], 's.jpg', { type: 'image/jpeg' }))
  const r = await go('/api/orders/billslip', { method: 'POST', body: sf, headers: { 'x-edit': s.token, origin: O } })
  assert.equal(r.status, 200)
  assert.equal((await r.json()).waiting, true)
  assert.equal(env.DB.raw.prepare('SELECT status FROM pay WHERE id = ?').get(pay.id).status, 'slip')
  await settle()
  const q = team().join('\n').match(/http:\/\/localhost\/q\/[a-z0-9.]+/g).at(-1)
  assert.ok(q)
  const slipPage = await (await go(new URL(q).pathname)).text()
  assert.match(slipPage, /parcel|พัสดุ|฿/)
  // Beer's tap on "Paid"
  const ok = await go(new URL(q).pathname, { method: 'POST', body: new URLSearchParams({ act: 'ok' }), headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  assert.equal(ok.status, 303)
  assert.equal(env.DB.raw.prepare('SELECT status FROM pay WHERE id = ?').get(pay.id).status, 'paid')
  assert.deepEqual(env.DB.raw.prepare('SELECT tier, gold_until, plan FROM site WHERE id = ?').get(s.id), before) // no Gold, no new plan
  assert.match(await (await go(new URL(q).pathname)).text(), /parcel bill|ค่าส่งพัสดุ/)
  const tab = await (await api(s, 'orders')).json()
  assert.equal(tab.ship.bills[0].status, 'paid')
  assert.equal(tab.ship.bills[0].payload, '') // nothing left to pay
  // the admin button does the same for a bill (payOk)
  const j2 = await (await order(s, [{ k: 'p', id: 'soap02' }])).json()
  await apiPost(s, 'orders', { act: 'paid', id: j2.id })
  const job2 = env.DB.raw.prepare('SELECT * FROM shipjob WHERE order_id = ?').get(j2.id)
  const tp2 = new URL(await (await import('../src/osign.mjs')).teamLink(env, O, job2.id, sha)).pathname
  await go(tp2, { method: 'POST', body: new URLSearchParams({ act: 'sent', track: 'EMS888TH', postage: '0' }), headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  const pay2 = env.DB.raw.prepare("SELECT * FROM pay WHERE plan = 'ship' AND id != ?").get(pay.id)
  const adm = await go('/admin/act', { method: 'POST', body: new URLSearchParams({ id: pay2.id, act: 'pay-ok' }), headers: { authorization: 'Basic ' + btoa('x:adm'), 'content-type': 'application/x-www-form-urlencoded' } })
  assert.equal(adm.status, 303)
  assert.equal(env.DB.raw.prepare('SELECT status FROM pay WHERE id = ?').get(pay2.id).status, 'paid')
  assert.deepEqual(env.DB.raw.prepare('SELECT tier, gold_until, plan FROM site WHERE id = ?').get(s.id), before)
})

test('the product page, its card and the sitemap exist; a page that goes takes its orders and files', async () => {
  const s = await site()
  const r = await go(`/${s.name}/p/soap02`)
  assert.equal(r.status, 200)
  assert.match(await r.text(), /<title>Soap · Shop A&amp;B<\/title>/)
  assert.equal((await go(`/${s.name}/p/nope9`)).status, 404)
  assert.match(await (await go('/sitemap.xml')).text(), new RegExp(`/${s.name}/p/soap02`))
  await upload(s)
  await order(s, [{ k: 'p', id: 'soap02' }])
  assert.equal((await api(s, 'site', { method: 'DELETE' })).status, 200)
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM orders WHERE site_id = ?').get(s.id).n, 0)
  assert.ok(![...files.keys()].some((k) => k.startsWith(`dl/${s.id}/`)))
})

// ---- the rest ------------------------------------------------------------------------------------

test('an order may name its lines without a kind and put the buyer in a buyer object with the plain names', async () => {
  const s = await site()
  await upload(s)
  const r = await post('/api/order', { n: s.name, lines: [{ id: 'soap02', q: 1 }, { id: 'guide1' }], ms: 4000, buyer: { name: 'Mali', phone: '089 111 2222', email: 'mali@example.com', address: '5 Soi 1, Chiang Mai', country: 'th' } })
  const j = await r.json()
  assert.equal(r.status, 200, JSON.stringify(j))
  const o = orderRow(j.id)
  assert.deepEqual(JSON.parse(o.lines).map((l) => [l.k, l.id]), [['p', 'soap02'], ['d', 'guide1']])
  assert.deepEqual([o.name, o.reach, o.addr, o.cc], ['Mali', '089 111 2222', '5 Soi 1, Chiang Mai', 'TH'])
  assert.equal((await post('/api/order', { n: s.name, lines: [{ id: 'nothing' }], ...buyer })).status, 409)
})

test('a price past a million baht is not a price', () => {
  const d = normalize(D({ products: [{ id: 'big01', t: 'Big', p: '99999999999' }, { id: 'ok001', t: 'Ok', p: '10' }], ship: { th: '99999999', world: '', free: '' } }))
  assert.equal(quote(d, true, { lines: [{ id: 'big01' }], cc: 'TH' }).error, 'item')
  assert.equal(quote(d, true, { lines: [{ id: 'ok001' }], cc: 'TH' }).delivery, 100000000)
})

test('a product has its share card, and its words reach the translation and the check', async () => {
  const s = await site()
  const card = await go(`/card/${s.name}/p/soap02.jpg`)
  assert.notEqual(card.status, 404) // no card library here: the page's own card
  assert.equal((await go(`/card/${s.name}/p/nope.jpg`)).status, 404)
  const { texts } = await import('../src/tr.mjs')
  const { textOf } = await import('../src/screen.mjs')
  const d = normalize(D())
  assert.ok(texts(d).some(([p, v]) => p === 'products.1.t' && v === 'Soap'))
  assert.ok(texts(d).some(([p]) => p === 'dls.0.t'))
  assert.ok(textOf(d).includes('Soap') && textOf(d).includes('Guide') && textOf(d).includes('SAVE10')) // the page check reads them
})

test('the maker\'s words for the shop are in every language and nothing earlier shadows them', async () => {
  const { SB } = await import('../public/s/make-words-store.mjs')
  const { ui } = await import('../public/s/make-words.mjs')
  const keys = Object.keys(SB.en)
  for (const l of ['th', 'my', 'zh']) assert.deepEqual(Object.keys(SB[l]).sort(), [...keys].sort(), l)
  for (const l of Object.keys(SB)) for (const k of keys) {
    assert.ok(String(SB[l][k]).trim().length > 0, `${l} ${k}`)
    assert.equal(ui(l, k), SB[l][k], `${l} ${k} is answered by another table`)
  }
  for (const l of Object.keys(SB)) assert.ok(!/\p{Extended_Pictographic}/u.test(JSON.stringify(SB[l])), 'no emoji ' + l)
  for (const l of Object.keys(SB)) for (const k of ['sh_fees']) assert.match(SB[l][k], /\{th\}/)
})

test('the team page takes a form and nothing else, and the maker hears what the parcel costs', async () => {
  const s = await site({ d: D({ ship: { th: '60', world: '600', free: '', mot: true } }) })
  const j = await (await order(s, [{ k: 'p', id: 'soap02' }])).json()
  await apiPost(s, 'orders', { act: 'paid', id: j.id })
  const job = env.DB.raw.prepare('SELECT * FROM shipjob WHERE order_id = ?').get(j.id)
  const tp = new URL(await (await import('../src/osign.mjs')).teamLink(env, O, job.id, sha)).pathname
  const r = await go(tp, { method: 'POST', body: '{"act":"sent"}', headers: { 'content-type': 'application/json' } })
  assert.notEqual(r.status, 500)
  assert.equal(env.DB.raw.prepare('SELECT status FROM shipjob WHERE id = ?').get(job.id).status, 'wait')
  const before = mails().length
  await go(tp, { method: 'POST', body: new URLSearchParams({ act: 'sent', track: 'EMS999TH', postage: '30' }), headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  await settle()
  const m = mails().slice(before)
  assert.ok(m.some((x) => x.to[0] === 'owner@example.com' && /Parcel shipped/.test(x.subject) && /฿13\d\.\d\d/.test(x.text)), JSON.stringify(m.map((x) => x.subject)))
  assert.ok(m.some((x) => x.to[0] === 'buyer@example.com' && /EMS999TH/.test(x.subject)))
  assert.equal((await go(new URL(await (await import('../src/osign.mjs')).teamLink(env, O, 'a'.repeat(12), sha)).pathname)).status, 404) // no such parcel
})

test('a save from a browser that has old stock counts does not undo what Paid took off', async () => {
  const s = await site()
  const first = await (await api(s, 'site')).json()
  const t0 = first.loaded // this browser read the page now, stock 5
  const j = await (await order(s, [{ k: 'p', id: 'scarf1', opt: ['S', 'red'], q: 2 }])).json()
  await new Promise((r) => setTimeout(r, 5))
  const paid = await (await apiPost(s, 'orders', { act: 'paid', id: j.id })).json()
  assert.equal(paid.stock.scarf1, 3)
  const stale = first.d // still says 5
  const put = (d, extra) => api(s, 'site', { method: 'PUT', body: JSON.stringify({ d, loaded: t0, ...extra }) })
  const r1 = await (await put({ ...stale, tagline: 'edited' })).json()
  assert.equal(r1.d.products[0].stock, 3) // the server's count stays
  assert.deepEqual(r1.stock, { scarf1: 3 })
  assert.equal(r1.d.tagline, 'edited')
  // the browser that has the counts (stockAt from Paid) may set its own
  const mine = { ...stale, products: stale.products.map((x) => (x.id === 'scarf1' ? { ...x, stock: 20 } : x)) }
  const r2 = await (await put(mine, { stockAt: paid.at })).json()
  assert.equal(r2.d.products[0].stock, 20)
  assert.equal(JSON.parse(env.DB.raw.prepare('SELECT d FROM site WHERE id = ?').get(s.id).d).products[0].stock, 20)
})

test('the grid card has its own button: Buy on a free page, Add to cart on Gold, a link to the options for a product that has them', () => {
  const base = { name: 'x3', look: 'clean', lang: 'en', kind: 'store', views: 1, status: 'live', d: D() }
  const gold = render({ ...base, tier: 'gold' })
  assert.match(gold, /<button class="btn" data-cart="p:soap02" data-t="buy">.*Add to cart<\/button>/) // no options: into the cart
  assert.match(gold, /<a class="btn ghost" href="\/x3\/p\/scarf1" data-t="product">Buy<\/a>/) // options: choose them on its page
  assert.ok(!/data-cart="p:gone03"|data-buy="p:gone03"/.test(gold)) // sold
  const free = render({ ...base, tier: 'free' })
  assert.match(free, /<button class="btn" data-buy="p:scarf1" data-t="buy">.*Buy<\/button>/) // a free page has no options: Buy
  assert.ok(!/data-cart=/.test(free))
  assert.ok(!/data-buy=|data-cart=/.test(render({ ...base, tier: 'gold', d: D({ pay: {} }) }))) // no PromptPay yet: no buttons
})
